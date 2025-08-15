#!/usr/bin/env python3
"""
Unit tests for performance optimizer functionality.
"""

import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

from performance_optimizer import (
    PerformanceConfig, MemoryMonitor, ProgressReporter, 
    ProjectSizeAnalyzer, ParallelProcessor, PerformanceOptimizer
)


class TestPerformanceConfig(unittest.TestCase):
    """Test PerformanceConfig class."""
    
    def test_default_config(self):
        """Test default configuration values."""
        config = PerformanceConfig()
        
        self.assertIsNone(config.max_workers)
        self.assertEqual(config.max_memory_mb, 1024)
        self.assertEqual(config.max_file_size_mb, 10)
        self.assertEqual(config.max_project_files, 10000)
        self.assertEqual(config.chunk_size, 50)
        self.assertTrue(config.enable_parallel)
        self.assertTrue(config.enable_memory_monitoring)
        self.assertIsNone(config.progress_callback)
    
    def test_custom_config(self):
        """Test custom configuration values."""
        callback = lambda msg, progress: None
        
        config = PerformanceConfig(
            max_workers=4,
            max_memory_mb=512,
            max_file_size_mb=5,
            max_project_files=5000,
            chunk_size=25,
            enable_parallel=False,
            enable_memory_monitoring=False,
            progress_callback=callback
        )
        
        self.assertEqual(config.max_workers, 4)
        self.assertEqual(config.max_memory_mb, 512)
        self.assertEqual(config.max_file_size_mb, 5)
        self.assertEqual(config.max_project_files, 5000)
        self.assertEqual(config.chunk_size, 25)
        self.assertFalse(config.enable_parallel)
        self.assertFalse(config.enable_memory_monitoring)
        self.assertEqual(config.progress_callback, callback)


class TestMemoryMonitor(unittest.TestCase):
    """Test MemoryMonitor class."""
    
    def test_memory_monitor_initialization(self):
        """Test memory monitor initialization."""
        monitor = MemoryMonitor(max_memory_mb=512)
        
        self.assertEqual(monitor.max_memory_bytes, 512 * 1024 * 1024)
        self.assertFalse(monitor.monitoring)
        self.assertEqual(monitor.peak_memory, 0)
        self.assertEqual(monitor.warnings_issued, 0)
    
    def test_get_memory_stats(self):
        """Test getting memory statistics."""
        monitor = MemoryMonitor()
        stats = monitor.get_memory_stats()
        
        self.assertIn("current_mb", stats)
        self.assertIn("peak_mb", stats)
        self.assertIn("limit_mb", stats)
        self.assertGreaterEqual(stats["current_mb"], 0)
        self.assertGreaterEqual(stats["peak_mb"], 0)
        self.assertEqual(stats["limit_mb"], 1024)


class TestProgressReporter(unittest.TestCase):
    """Test ProgressReporter class."""
    
    def test_progress_reporter_initialization(self):
        """Test progress reporter initialization."""
        reporter = ProgressReporter()
        
        self.assertIsNone(reporter.callback)
        self.assertEqual(reporter.total_steps, 0)
        self.assertEqual(reporter.completed_steps, 0)
    
    def test_progress_reporter_with_callback(self):
        """Test progress reporter with callback."""
        callback_calls = []
        
        def callback(step_name, progress):
            callback_calls.append((step_name, progress))
        
        reporter = ProgressReporter(callback)
        reporter.set_total_steps(10)
        reporter.update_progress("Step 1", 2)
        reporter.update_progress("Step 2", 3)
        reporter.finish()
        
        self.assertGreaterEqual(len(callback_calls), 1)  # Should have called callback at least once
        self.assertEqual(callback_calls[-1][0], "Complete")
        self.assertEqual(callback_calls[-1][1], 1.0)
    
    def test_progress_calculation(self):
        """Test progress calculation."""
        reporter = ProgressReporter()
        reporter.set_total_steps(100)
        
        reporter.update_progress("Step 1", 25)
        self.assertEqual(reporter.completed_steps, 25)
        
        reporter.update_progress("Step 2", 25)
        self.assertEqual(reporter.completed_steps, 50)


class TestProjectSizeAnalyzer(unittest.TestCase):
    """Test ProjectSizeAnalyzer class."""
    
    def setUp(self):
        """Set up test environment."""
        self.temp_dir = tempfile.mkdtemp()
        self.project_dir = Path(self.temp_dir) / "test_project"
        self.project_dir.mkdir()
        
        # Create test files
        (self.project_dir / "small.py").write_text("print('hello')\n" * 10)
        (self.project_dir / "medium.py").write_text("def function():\n    pass\n" * 50)
        (self.project_dir / "large.py").write_text("# Large file\n" * 1000)
        
        # Create subdirectory
        subdir = self.project_dir / "subdir"
        subdir.mkdir()
        (subdir / "nested.py").write_text("class MyClass:\n    pass\n" * 25)
    
    def tearDown(self):
        """Clean up test environment."""
        import shutil
        shutil.rmtree(self.temp_dir)
    
    def test_analyze_project_size(self):
        """Test project size analysis."""
        analyzer = ProjectSizeAnalyzer(self.project_dir)
        size_info = analyzer.analyze_project_size()
        
        self.assertEqual(size_info.total_files, 4)
        self.assertGreater(size_info.total_lines, 0)
        self.assertGreater(size_info.total_size_bytes, 0)
        self.assertEqual(size_info.largest_file_lines, 1000)
        self.assertEqual(size_info.largest_file_path, "large.py")
        self.assertGreater(size_info.estimated_analysis_time, 0)
    
    def test_get_size_recommendations(self):
        """Test size-based recommendations."""
        analyzer = ProjectSizeAnalyzer(self.project_dir)
        size_info = analyzer.analyze_project_size()
        config = PerformanceConfig(max_project_files=2)  # Low limit for testing
        
        recommendations = analyzer.get_size_recommendations(size_info, config)
        
        # Should recommend something due to low file limit
        self.assertGreater(len(recommendations), 0)
        self.assertTrue(any("Large project detected" in rec for rec in recommendations))


class TestParallelProcessor(unittest.TestCase):
    """Test ParallelProcessor class."""
    
    def setUp(self):
        """Set up test environment."""
        self.config = PerformanceConfig(max_workers=2, chunk_size=2)
        self.processor = ParallelProcessor(self.config)
        
        self.temp_dir = tempfile.mkdtemp()
        self.test_files = []
        
        # Create test files
        for i in range(5):
            file_path = Path(self.temp_dir) / f"test_{i}.py"
            file_path.write_text(f"# Test file {i}\nprint({i})")
            self.test_files.append(file_path)
    
    def tearDown(self):
        """Clean up test environment."""
        import shutil
        shutil.rmtree(self.temp_dir)
    
    def test_chunk_files(self):
        """Test file chunking."""
        chunks = self.processor._chunk_files(self.test_files, 2)
        
        self.assertEqual(len(chunks), 3)  # 5 files, chunk size 2 = 3 chunks
        self.assertEqual(len(chunks[0]), 2)
        self.assertEqual(len(chunks[1]), 2)
        self.assertEqual(len(chunks[2]), 1)
    
    def test_process_files_sequential(self):
        """Test sequential file processing."""
        def mock_process_func(file_path):
            return f"processed_{file_path.name}"
        
        results = self.processor._process_files_sequential(self.test_files, mock_process_func)
        
        self.assertEqual(len(results), 5)
        self.assertTrue(all("processed_test_" in result for result in results))
    
    def test_process_chunk(self):
        """Test chunk processing."""
        def mock_process_func(file_path):
            return f"processed_{file_path.name}"
        
        chunk = self.test_files[:2]
        results = ParallelProcessor._process_chunk(chunk, mock_process_func)
        
        self.assertEqual(len(results), 2)
        self.assertTrue(all("processed_test_" in result for result in results))


class TestPerformanceOptimizer(unittest.TestCase):
    """Test PerformanceOptimizer class."""
    
    def setUp(self):
        """Set up test environment."""
        self.temp_dir = tempfile.mkdtemp()
        self.project_dir = Path(self.temp_dir) / "test_project"
        self.project_dir.mkdir()
        
        # Create test files of different sizes
        (self.project_dir / "small.py").write_text("print('hello')")
        (self.project_dir / "normal.py").write_text("def function():\n    pass\n" * 100)
        
        # Create a large file (simulate by setting small limit)
        large_content = "# Large file\n" * 1000
        (self.project_dir / "large.py").write_text(large_content)
        
        self.config = PerformanceConfig(
            max_file_size_mb=0.001,  # Very small limit for testing
            enable_memory_monitoring=False  # Disable for testing
        )
        self.optimizer = PerformanceOptimizer(self.config)
    
    def tearDown(self):
        """Clean up test environment."""
        import shutil
        shutil.rmtree(self.temp_dir)
    
    def test_optimize_for_project(self):
        """Test project optimization analysis."""
        size_info, recommendations = self.optimizer.optimize_for_project(self.project_dir)
        
        self.assertGreater(size_info.total_files, 0)
        self.assertGreater(size_info.total_lines, 0)
        self.assertIsInstance(recommendations, list)
    
    def test_should_skip_file(self):
        """Test file skipping logic."""
        small_file = self.project_dir / "small.py"
        large_file = self.project_dir / "large.py"
        
        # Small file should not be skipped
        self.assertFalse(self.optimizer.should_skip_file(small_file))
        
        # Large file should be skipped due to small limit
        self.assertTrue(self.optimizer.should_skip_file(large_file))
    
    def test_filter_files_by_size(self):
        """Test file filtering by size."""
        all_files = list(self.project_dir.glob("*.py"))
        filtered_files = self.optimizer.filter_files_by_size(all_files)
        
        # Should filter out the large file
        self.assertLess(len(filtered_files), len(all_files))
        
        # Check that large.py is not in filtered files
        filtered_names = [f.name for f in filtered_files]
        self.assertNotIn("large.py", filtered_names)
    
    def test_get_performance_stats(self):
        """Test getting performance statistics."""
        stats = self.optimizer.get_performance_stats()
        
        self.assertIn("config", stats)
        self.assertIn("max_workers", stats["config"])
        self.assertIn("max_memory_mb", stats["config"])
        self.assertIn("parallel_enabled", stats["config"])


if __name__ == "__main__":
    unittest.main()