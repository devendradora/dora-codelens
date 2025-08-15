#!/usr/bin/env python3
"""
Cache Manager for CodeMindMap Analyzer

This module provides file-based caching for analysis results with
cache invalidation based on file modification times.
"""

import json
import hashlib
import logging
import os
import time
from dataclasses import asdict
from pathlib import Path
from typing import Dict, List, Optional, Set, Any, Union
from datetime import datetime

logger = logging.getLogger(__name__)


class CacheEntry:
    """Represents a cache entry with metadata."""
    
    def __init__(self, data: Any, file_hashes: Dict[str, str], timestamp: float):
        self.data = data
        self.file_hashes = file_hashes  # file_path -> hash
        self.timestamp = timestamp
        self.access_count = 0
        self.last_accessed = timestamp
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert cache entry to dictionary for serialization."""
        return {
            "data": self.data,
            "file_hashes": self.file_hashes,
            "timestamp": self.timestamp,
            "access_count": self.access_count,
            "last_accessed": self.last_accessed
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CacheEntry':
        """Create cache entry from dictionary."""
        entry = cls(
            data=data["data"],
            file_hashes=data["file_hashes"],
            timestamp=data["timestamp"]
        )
        entry.access_count = data.get("access_count", 0)
        entry.last_accessed = data.get("last_accessed", entry.timestamp)
        return entry


class CacheManager:
    """Manages file-based caching for analysis results."""
    
    def __init__(self, cache_dir: Optional[Path] = None, max_cache_size_mb: int = 100):
        """Initialize cache manager.
        
        Args:
            cache_dir: Directory to store cache files (default: ~/.codemindmap_cache)
            max_cache_size_mb: Maximum cache size in MB
        """
        if cache_dir is None:
            cache_dir = Path.home() / ".codemindmap_cache"
        
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.max_cache_size_bytes = max_cache_size_mb * 1024 * 1024
        
        # Cache metadata file
        self.metadata_file = self.cache_dir / "cache_metadata.json"
        self.metadata = self._load_metadata()
        
        logger.info(f"Cache manager initialized with directory: {self.cache_dir}")
    
    def _load_metadata(self) -> Dict[str, Any]:
        """Load cache metadata from file."""
        if not self.metadata_file.exists():
            return {"entries": {}, "total_size": 0, "last_cleanup": time.time()}
        
        try:
            with open(self.metadata_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load cache metadata: {e}")
            return {"entries": {}, "total_size": 0, "last_cleanup": time.time()}
    
    def _save_metadata(self):
        """Save cache metadata to file."""
        try:
            with open(self.metadata_file, 'w') as f:
                json.dump(self.metadata, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save cache metadata: {e}")
    
    def _get_cache_key(self, project_path: Path) -> str:
        """Generate cache key for a project.
        
        Args:
            project_path: Path to the project
            
        Returns:
            Cache key string
        """
        # Use project path and its modification time for cache key
        path_str = str(project_path.resolve())
        return hashlib.md5(path_str.encode()).hexdigest()
    
    def _get_file_hash(self, file_path: Path) -> str:
        """Get hash of file content and modification time.
        
        Args:
            file_path: Path to the file
            
        Returns:
            Hash string combining content and mtime
        """
        try:
            stat = file_path.stat()
            # Combine file size and modification time for quick hash
            content = f"{stat.st_size}:{stat.st_mtime}"
            return hashlib.md5(content.encode()).hexdigest()
        except Exception as e:
            logger.warning(f"Failed to hash file {file_path}: {e}")
            return ""
    
    def _get_project_file_hashes(self, project_path: Path) -> Dict[str, str]:
        """Get hashes for all relevant files in the project.
        
        Args:
            project_path: Path to the project
            
        Returns:
            Dictionary mapping file paths to hashes
        """
        file_hashes = {}
        
        try:
            # Hash Python files
            for py_file in project_path.rglob("*.py"):
                if any(part.startswith('.') or part in ['__pycache__', 'node_modules', 'venv', 'env'] 
                       for part in py_file.parts):
                    continue
                
                rel_path = str(py_file.relative_to(project_path))
                file_hashes[rel_path] = self._get_file_hash(py_file)
            
            # Hash dependency files
            dep_files = [
                "requirements.txt", "pyproject.toml", "Pipfile", "setup.py",
                "setup.cfg", "poetry.lock", "Pipfile.lock"
            ]
            
            for dep_file in dep_files:
                dep_path = project_path / dep_file
                if dep_path.exists():
                    file_hashes[dep_file] = self._get_file_hash(dep_path)
                    
        except Exception as e:
            logger.error(f"Failed to generate file hashes: {e}")
        
        return file_hashes
    
    def _is_cache_valid(self, cache_entry: CacheEntry, current_hashes: Dict[str, str]) -> bool:
        """Check if cache entry is still valid.
        
        Args:
            cache_entry: Cached entry to validate
            current_hashes: Current file hashes
            
        Returns:
            True if cache is valid, False otherwise
        """
        # Check if any files have changed
        for file_path, current_hash in current_hashes.items():
            cached_hash = cache_entry.file_hashes.get(file_path)
            if cached_hash != current_hash:
                logger.debug(f"Cache invalid: file {file_path} changed")
                return False
        
        # Check if any cached files were deleted
        for file_path in cache_entry.file_hashes:
            if file_path not in current_hashes:
                logger.debug(f"Cache invalid: file {file_path} deleted")
                return False
        
        return True
    
    def get_cached_result(self, project_path: Path) -> Optional[Any]:
        """Get cached analysis result for a project.
        
        Args:
            project_path: Path to the project
            
        Returns:
            Cached analysis result or None if not found/invalid
        """
        cache_key = self._get_cache_key(project_path)
        cache_file = self.cache_dir / f"{cache_key}.json"
        
        if not cache_file.exists():
            logger.debug(f"No cache file found for project: {project_path}")
            return None
        
        try:
            # Load cache entry
            with open(cache_file, 'r') as f:
                cache_data = json.load(f)
            
            cache_entry = CacheEntry.from_dict(cache_data)
            
            # Get current file hashes
            current_hashes = self._get_project_file_hashes(project_path)
            
            # Validate cache
            if not self._is_cache_valid(cache_entry, current_hashes):
                logger.info(f"Cache invalid for project: {project_path}")
                self._remove_cache_entry(cache_key)
                return None
            
            # Update access statistics
            cache_entry.access_count += 1
            cache_entry.last_accessed = time.time()
            
            # Save updated metadata
            self.metadata["entries"][cache_key] = {
                "access_count": cache_entry.access_count,
                "last_accessed": cache_entry.last_accessed,
                "size": cache_file.stat().st_size
            }
            self._save_metadata()
            
            logger.info(f"Cache hit for project: {project_path}")
            return cache_entry.data
            
        except Exception as e:
            logger.error(f"Failed to load cache entry: {e}")
            self._remove_cache_entry(cache_key)
            return None
    
    def cache_result(self, project_path: Path, result: Any) -> bool:
        """Cache analysis result for a project.
        
        Args:
            project_path: Path to the project
            result: Analysis result to cache
            
        Returns:
            True if caching succeeded, False otherwise
        """
        try:
            cache_key = self._get_cache_key(project_path)
            cache_file = self.cache_dir / f"{cache_key}.json"
            
            # Get current file hashes
            file_hashes = self._get_project_file_hashes(project_path)
            
            # Create cache entry
            cache_entry = CacheEntry(
                data=result,
                file_hashes=file_hashes,
                timestamp=time.time()
            )
            
            # Save cache entry
            with open(cache_file, 'w') as f:
                json.dump(cache_entry.to_dict(), f, indent=2, default=self._json_serializer)
            
            # Update metadata
            file_size = cache_file.stat().st_size
            self.metadata["entries"][cache_key] = {
                "project_path": str(project_path),
                "access_count": 0,
                "last_accessed": cache_entry.timestamp,
                "size": file_size
            }
            self.metadata["total_size"] = self.metadata.get("total_size", 0) + file_size
            self._save_metadata()
            
            # Cleanup if cache is too large
            self._cleanup_if_needed()
            
            logger.info(f"Cached result for project: {project_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cache result: {e}")
            return False
    
    def _remove_cache_entry(self, cache_key: str):
        """Remove a cache entry.
        
        Args:
            cache_key: Cache key to remove
        """
        try:
            cache_file = self.cache_dir / f"{cache_key}.json"
            if cache_file.exists():
                file_size = cache_file.stat().st_size
                cache_file.unlink()
                
                # Update metadata
                if cache_key in self.metadata["entries"]:
                    del self.metadata["entries"][cache_key]
                    self.metadata["total_size"] = max(0, self.metadata.get("total_size", 0) - file_size)
                    self._save_metadata()
                    
        except Exception as e:
            logger.error(f"Failed to remove cache entry {cache_key}: {e}")
    
    def _cleanup_if_needed(self):
        """Cleanup cache if it exceeds size limit."""
        if self.metadata.get("total_size", 0) <= self.max_cache_size_bytes:
            return
        
        logger.info("Cache size limit exceeded, performing cleanup...")
        
        # Sort entries by last accessed time (oldest first)
        entries = list(self.metadata["entries"].items())
        entries.sort(key=lambda x: x[1].get("last_accessed", 0))
        
        # Remove oldest entries until under limit
        current_size = self.metadata.get("total_size", 0)
        for cache_key, entry_meta in entries:
            if current_size <= self.max_cache_size_bytes * 0.8:  # Leave some headroom
                break
            
            self._remove_cache_entry(cache_key)
            current_size -= entry_meta.get("size", 0)
        
        logger.info(f"Cache cleanup completed, new size: {current_size} bytes")
    
    def clear_cache(self):
        """Clear all cache entries."""
        try:
            for cache_file in self.cache_dir.glob("*.json"):
                if cache_file.name != "cache_metadata.json":
                    cache_file.unlink()
            
            self.metadata = {"entries": {}, "total_size": 0, "last_cleanup": time.time()}
            self._save_metadata()
            
            logger.info("Cache cleared successfully")
            
        except Exception as e:
            logger.error(f"Failed to clear cache: {e}")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics.
        
        Returns:
            Dictionary with cache statistics
        """
        entries = self.metadata.get("entries", {})
        total_size = self.metadata.get("total_size", 0)
        
        return {
            "total_entries": len(entries),
            "total_size_bytes": total_size,
            "total_size_mb": total_size / (1024 * 1024),
            "max_size_mb": self.max_cache_size_bytes / (1024 * 1024),
            "cache_dir": str(self.cache_dir),
            "last_cleanup": self.metadata.get("last_cleanup", 0)
        }
    
    def invalidate_project_cache(self, project_path: Path):
        """Invalidate cache for a specific project.
        
        Args:
            project_path: Path to the project
        """
        cache_key = self._get_cache_key(project_path)
        self._remove_cache_entry(cache_key)
        logger.info(f"Invalidated cache for project: {project_path}")
    
    @staticmethod
    def _json_serializer(obj):
        """Custom JSON serializer for non-serializable objects."""
        if hasattr(obj, '__dict__'):
            return obj.__dict__
        elif hasattr(obj, 'value'):  # For Enum objects
            return obj.value
        elif hasattr(obj, 'to_dict'):  # For objects with to_dict method
            return obj.to_dict()
        return str(obj)


class IncrementalAnalyzer:
    """Handles incremental analysis for changed files only."""
    
    def __init__(self, cache_manager: CacheManager):
        self.cache_manager = cache_manager
    
    def get_changed_files(self, project_path: Path, cached_hashes: Dict[str, str]) -> Set[str]:
        """Get list of files that have changed since last analysis.
        
        Args:
            project_path: Path to the project
            cached_hashes: Previously cached file hashes
            
        Returns:
            Set of changed file paths (relative to project)
        """
        current_hashes = self.cache_manager._get_project_file_hashes(project_path)
        changed_files = set()
        
        # Check for modified files
        for file_path, current_hash in current_hashes.items():
            cached_hash = cached_hashes.get(file_path)
            if cached_hash != current_hash:
                changed_files.add(file_path)
        
        # Check for deleted files
        for file_path in cached_hashes:
            if file_path not in current_hashes:
                changed_files.add(file_path)
        
        # Check for new files
        for file_path in current_hashes:
            if file_path not in cached_hashes:
                changed_files.add(file_path)
        
        return changed_files
    
    def should_use_incremental_analysis(self, changed_files: Set[str], total_files: int) -> bool:
        """Determine if incremental analysis should be used.
        
        Args:
            changed_files: Set of changed files
            total_files: Total number of files in project
            
        Returns:
            True if incremental analysis should be used
        """
        if not changed_files:
            return False
        
        # Use incremental analysis if less than 20% of files changed
        change_ratio = len(changed_files) / max(total_files, 1)
        return change_ratio < 0.2