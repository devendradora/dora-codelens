#!/usr/bin/env python3
"""
Performance Optimizer for CodeMindMap Analyzer

This module provides performance optimizations for handling large Python projects,
including parallel processing, memory management, and progress reporting.
"""

import gc
import logging
import multiprocessing
import os
import threading
import time

# Optional dependency
try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    psutil = None
    HAS_PSUTIL = False
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Set, Callable, Any, Tuple
from queue import Queue

logger = logging.getLogger(__name__)


@dataclass
class ProjectSizeInfo:
    """Information about project size and complexity."""
    total_files: int
    total_lines: int
    total_size_bytes: int
    largest_file_lines: int
    largest_file_path: str
    estimated_analysis_time: float


@dataclass
class PerformanceConfig:
    """Configuration for performance optimization."""
    max_workers: int = None  # None = auto-detect
    max_memory_mb: int = 1024  # Maximum memory usage in MB
    max_file_size_mb: int = 10  # Skip files larger than this
    max_project_files: int = 10000  # Warn for projects with more files
    chunk_size: int = 50  # Files per processing chunk
    enable_parallel: bool = True
    enable_memory_monitoring: bool = True
    progress_callback: Optional[Callable[[str, float], None]] = None


class MemoryMonitor:
    """Monitors memory usage during analysis."""
    
    def __init__(self, max_memory_mb: int = 1024):
        self.max_memory_bytes = max_memory_mb * 1024 * 1024
        self.process = psutil.Process() if HAS_PSUTIL else None
        self.monitoring = False
        self.peak_memory = 0
        self.warnings_issued = 0
    
    def start_monitoring(self):
        """Start memory monitoring in background thread."""
        if not HAS_PSUTIL:
            logger.warning("psutil not available, memory monitoring disabled")
            return
            
        self.monitoring = True
        self.peak_memory = 0
        self.warnings_issued = 0
        
        def monitor():
            while self.monitoring:
                try:
                    memory_info = self.process.memory_info()
                    current_memory = memory_info.rss
                    
                    if current_memory > self.peak_memory:
                        self.peak_memory = current_memory
                    
                    if current_memory > self.max_memory_bytes:
                        if self.warnings_issued < 3:  # Limit warnings
                            logger.warning(f"Memory usage high: {current_memory / 1024 / 1024:.1f} MB")
                            self.warnings_issued += 1
                        
                        # Force garbage collection
                        gc.collect()
                    
                    time.sleep(1)  # Check every second
                    
                except Exception as e:
                    logger.error(f"Memory monitoring error: {e}")
                    break
        
        thread = threading.Thread(target=monitor, daemon=True)
        thread.start()
        logger.info(f"Memory monitoring started (limit: {self.max_memory_bytes / 1024 / 1024:.1f} MB)")
    
    def stop_monitoring(self):
        """Stop memory monitoring."""
        self.monitoring = False
        logger.info(f"Memory monitoring stopped (peak: {self.peak_memory / 1024 / 1024:.1f} MB)")
    
    def get_memory_stats(self) -> Dict[str, float]:
        """Get current memory statistics."""
        if not HAS_PSUTIL or not self.process:
            return {
                "current_mb": 0,
                "peak_mb": self.peak_memory / 1024 / 1024,
                "limit_mb": self.max_memory_bytes / 1024 / 1024
            }
            
        try:
            memory_info = self.process.memory_info()
            return {
                "current_mb": memory_info.rss / 1024 / 1024,
                "peak_mb": self.peak_memory / 1024 / 1024,
                "limit_mb": self.max_memory_bytes / 1024 / 1024
            }
        except Exception as e:
            logger.error(f"Failed to get memory stats: {e}")
            return {"current_mb": 0, "peak_mb": 0, "limit_mb": 0}


class ProgressReporter:
    """Reports progress during long-running analysis."""
    
    def __init__(self, callback: Optional[Callable[[str, float], None]] = None):
        self.callback = callback
        self.start_time = time.time()
        self.last_report_time = self.start_time
        self.total_steps = 0
        self.completed_steps = 0
    
    def set_total_steps(self, total: int):
        """Set total number of steps for progress calculation."""
        self.total_steps = total
        self.completed_steps = 0
        self.start_time = time.time()
        self.last_report_time = self.start_time
        logger.info(f"Progress tracking started: {total} total steps")
    
    def update_progress(self, step_name: str, increment: int = 1):
        """Update progress with step completion."""
        self.completed_steps += increment
        progress = self.completed_steps / max(self.total_steps, 1)
        
        current_time = time.time()
        elapsed = current_time - self.start_time
        
        # Report every 2 seconds or on significant progress
        if (current_time - self.last_report_time > 2.0 or 
            progress >= 1.0 or 
            self.completed_steps % max(self.total_steps // 20, 1) == 0):
            
            eta = (elapsed / max(progress, 0.01)) - elapsed if progress > 0 else 0
            
            logger.info(f"Progress: {step_name} ({self.completed_steps}/{self.total_steps}, "
                       f"{progress * 100:.1f}%, ETA: {eta:.1f}s)")
            
            if self.callback:
                self.callback(step_name, progress)
            
            self.last_report_time = current_time
    
    def finish(self):
        """Mark progress as complete."""
        elapsed = time.time() - self.start_time
        logger.info(f"Progress completed in {elapsed:.2f} seconds")
        
        if self.callback:
            self.callback("Complete", 1.0)


class ProjectSizeAnalyzer:
    """Analyzes project size and provides recommendations."""
    
    def __init__(self, project_path: Path):
        self.project_path = project_path
    
    def analyze_project_size(self) -> ProjectSizeInfo:
        """Analyze project size and complexity."""
        total_files = 0
        total_lines = 0
        total_size_bytes = 0
        largest_file_lines = 0
        largest_file_path = ""
        
        try:
            for py_file in self.project_path.rglob("*.py"):
                # Skip common directories
                if any(part.startswith('.') or part in ['__pycache__', 'node_modules', 'venv', 'env'] 
                       for part in py_file.parts):
                    continue
                
                try:
                    file_size = py_file.stat().st_size
                    total_size_bytes += file_size
                    total_files += 1
                    
                    # Count lines
                    with open(py_file, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = sum(1 for _ in f)
                        total_lines += lines
                        
                        if lines > largest_file_lines:
                            largest_file_lines = lines
                            largest_file_path = str(py_file.relative_to(self.project_path))
                
                except Exception as e:
                    logger.warning(f"Failed to analyze file {py_file}: {e}")
        
        except Exception as e:
            logger.error(f"Failed to analyze project size: {e}")
        
        # Estimate analysis time (rough heuristic)
        estimated_time = (total_files * 0.1) + (total_lines * 0.0001)
        
        return ProjectSizeInfo(
            total_files=total_files,
            total_lines=total_lines,
            total_size_bytes=total_size_bytes,
            largest_file_lines=largest_file_lines,
            largest_file_path=largest_file_path,
            estimated_analysis_time=estimated_time
        )
    
    def get_size_recommendations(self, size_info: ProjectSizeInfo, config: PerformanceConfig) -> List[str]:
        """Get recommendations based on project size."""
        recommendations = []
        
        if size_info.total_files > config.max_project_files:
            recommendations.append(
                f"Large project detected ({size_info.total_files} files). "
                f"Consider analyzing specific directories or using --max-files option."
            )
        
        if size_info.total_size_bytes > 100 * 1024 * 1024:  # 100MB
            recommendations.append(
                f"Large codebase detected ({size_info.total_size_bytes / 1024 / 1024:.1f} MB). "
                f"Analysis may take longer than usual."
            )
        
        if size_info.largest_file_lines > 5000:
            recommendations.append(
                f"Very large file detected: {size_info.largest_file_path} ({size_info.largest_file_lines} lines). "
                f"Consider refactoring large files for better analysis performance."
            )
        
        if size_info.estimated_analysis_time > 60:
            recommendations.append(
                f"Estimated analysis time: {size_info.estimated_analysis_time:.1f} seconds. "
                f"Consider using caching or parallel processing options."
            )
        
        return recommendations


class ParallelProcessor:
    """Handles parallel processing of analysis tasks."""
    
    def __init__(self, config: PerformanceConfig):
        self.config = config
        self.max_workers = config.max_workers or min(multiprocessing.cpu_count(), 8)
        logger.info(f"Parallel processor initialized with {self.max_workers} workers")
    
    def process_files_parallel(self, files: List[Path], process_func: Callable, 
                             progress_reporter: Optional[ProgressReporter] = None) -> List[Any]:
        """Process files in parallel using multiprocessing.
        
        Args:
            files: List of files to process
            process_func: Function to process each file
            progress_reporter: Optional progress reporter
            
        Returns:
            List of processing results
        """
        if not self.config.enable_parallel or len(files) < 10:
            # Use sequential processing for small numbers of files
            return self._process_files_sequential(files, process_func, progress_reporter)
        
        results = []
        chunks = self._chunk_files(files, self.config.chunk_size)
        
        if progress_reporter:
            progress_reporter.set_total_steps(len(chunks))
        
        try:
            with ProcessPoolExecutor(max_workers=self.max_workers) as executor:
                # Submit all chunks
                future_to_chunk = {
                    executor.submit(self._process_chunk, chunk, process_func): chunk 
                    for chunk in chunks
                }
                
                # Collect results as they complete
                for future in as_completed(future_to_chunk):
                    chunk = future_to_chunk[future]
                    try:
                        chunk_results = future.result()
                        results.extend(chunk_results)
                        
                        if progress_reporter:
                            progress_reporter.update_progress(f"Processed {len(chunk)} files")
                        
                    except Exception as e:
                        logger.error(f"Failed to process chunk: {e}")
                        # Continue with other chunks
        
        except Exception as e:
            logger.error(f"Parallel processing failed: {e}")
            # Fall back to sequential processing
            return self._process_files_sequential(files, process_func, progress_reporter)
        
        return results
    
    def _process_files_sequential(self, files: List[Path], process_func: Callable,
                                progress_reporter: Optional[ProgressReporter] = None) -> List[Any]:
        """Process files sequentially."""
        results = []
        
        if progress_reporter:
            progress_reporter.set_total_steps(len(files))
        
        for i, file_path in enumerate(files):
            try:
                result = process_func(file_path)
                if result is not None:
                    results.append(result)
                
                if progress_reporter:
                    progress_reporter.update_progress(f"Processed {file_path.name}")
                
            except Exception as e:
                logger.error(f"Failed to process file {file_path}: {e}")
        
        return results
    
    def _chunk_files(self, files: List[Path], chunk_size: int) -> List[List[Path]]:
        """Split files into chunks for parallel processing."""
        chunks = []
        for i in range(0, len(files), chunk_size):
            chunks.append(files[i:i + chunk_size])
        return chunks
    
    @staticmethod
    def _process_chunk(chunk: List[Path], process_func: Callable) -> List[Any]:
        """Process a chunk of files."""
        results = []
        for file_path in chunk:
            try:
                result = process_func(file_path)
                if result is not None:
                    results.append(result)
            except Exception as e:
                logger.error(f"Failed to process file {file_path}: {e}")
        return results


class PerformanceOptimizer:
    """Main performance optimizer class."""
    
    def __init__(self, config: PerformanceConfig = None):
        self.config = config or PerformanceConfig()
        self.memory_monitor = MemoryMonitor(self.config.max_memory_mb) if self.config.enable_memory_monitoring else None
        self.progress_reporter = ProgressReporter(self.config.progress_callback)
        self.parallel_processor = ParallelProcessor(self.config)
        self.size_analyzer = None
    
    def optimize_for_project(self, project_path: Path) -> Tuple[ProjectSizeInfo, List[str]]:
        """Analyze project and provide optimization recommendations.
        
        Args:
            project_path: Path to the project
            
        Returns:
            Tuple of (size_info, recommendations)
        """
        self.size_analyzer = ProjectSizeAnalyzer(project_path)
        size_info = self.size_analyzer.analyze_project_size()
        recommendations = self.size_analyzer.get_size_recommendations(size_info, self.config)
        
        # Log project size information
        logger.info(f"Project analysis: {size_info.total_files} files, "
                   f"{size_info.total_lines} lines, "
                   f"{size_info.total_size_bytes / 1024 / 1024:.1f} MB")
        
        if recommendations:
            logger.info("Performance recommendations:")
            for rec in recommendations:
                logger.info(f"  - {rec}")
        
        return size_info, recommendations
    
    def start_monitoring(self):
        """Start performance monitoring."""
        if self.memory_monitor:
            self.memory_monitor.start_monitoring()
    
    def stop_monitoring(self):
        """Stop performance monitoring."""
        if self.memory_monitor:
            self.memory_monitor.stop_monitoring()
    
    def should_skip_file(self, file_path: Path) -> bool:
        """Determine if a file should be skipped due to size."""
        try:
            file_size_mb = file_path.stat().st_size / 1024 / 1024
            if file_size_mb > self.config.max_file_size_mb:
                logger.warning(f"Skipping large file: {file_path} ({file_size_mb:.1f} MB)")
                return True
        except Exception as e:
            logger.warning(f"Failed to check file size {file_path}: {e}")
            return True
        
        return False
    
    def filter_files_by_size(self, files: List[Path]) -> List[Path]:
        """Filter out files that are too large to process efficiently."""
        filtered_files = []
        skipped_count = 0
        
        for file_path in files:
            if not self.should_skip_file(file_path):
                filtered_files.append(file_path)
            else:
                skipped_count += 1
        
        if skipped_count > 0:
            logger.info(f"Skipped {skipped_count} large files for performance")
        
        return filtered_files
    
    def cleanup_memory(self):
        """Force memory cleanup."""
        gc.collect()
        if self.memory_monitor:
            stats = self.memory_monitor.get_memory_stats()
            logger.info(f"Memory cleanup: {stats['current_mb']:.1f} MB current")
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics."""
        stats = {
            "config": {
                "max_workers": self.config.max_workers,
                "max_memory_mb": self.config.max_memory_mb,
                "max_file_size_mb": self.config.max_file_size_mb,
                "parallel_enabled": self.config.enable_parallel
            }
        }
        
        if self.memory_monitor:
            stats["memory"] = self.memory_monitor.get_memory_stats()
        
        return stats