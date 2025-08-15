#!/usr/bin/env python3
"""
Unit tests for cache manager functionality.
"""

import json
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

from cache_manager import CacheManager, CacheEntry, IncrementalAnalyzer


class TestCacheEntry(unittest.TestCase):
    """Test CacheEntry class."""
    
    def test_cache_entry_creation(self):
        """Test cache entry creation and serialization."""
        data = {"test": "data"}
        file_hashes = {"file1.py": "hash1", "file2.py": "hash2"}
        timestamp = time.time()
        
        entry = CacheEntry(data, file_hashes, timestamp)
        
        self.assertEqual(entry.data, data)
        self.assertEqual(entry.file_hashes, file_hashes)
        self.assertEqual(entry.timestamp, timestamp)
        self.assertEqual(entry.access_count, 0)
    
    def test_cache_entry_serialization(self):
        """Test cache entry to_dict and from_dict methods."""
        data = {"test": "data", "nested": {"key": "value"}}
        file_hashes = {"file1.py": "hash1"}
        timestamp = time.time()
        
        entry = CacheEntry(data, file_hashes, timestamp)
        entry.access_count = 5
        entry.last_accessed = timestamp + 100
        
        # Test serialization
        entry_dict = entry.to_dict()
        self.assertEqual(entry_dict["data"], data)
        self.assertEqual(entry_dict["file_hashes"], file_hashes)
        self.assertEqual(entry_dict["timestamp"], timestamp)
        self.assertEqual(entry_dict["access_count"], 5)
        self.assertEqual(entry_dict["last_accessed"], timestamp + 100)
        
        # Test deserialization
        restored_entry = CacheEntry.from_dict(entry_dict)
        self.assertEqual(restored_entry.data, data)
        self.assertEqual(restored_entry.file_hashes, file_hashes)
        self.assertEqual(restored_entry.timestamp, timestamp)
        self.assertEqual(restored_entry.access_count, 5)
        self.assertEqual(restored_entry.last_accessed, timestamp + 100)


class TestCacheManager(unittest.TestCase):
    """Test CacheManager class."""
    
    def setUp(self):
        """Set up test environment."""
        self.temp_dir = tempfile.mkdtemp()
        self.cache_dir = Path(self.temp_dir) / "cache"
        self.cache_manager = CacheManager(self.cache_dir, max_cache_size_mb=1)
        
        # Create a temporary project directory
        self.project_dir = Path(self.temp_dir) / "test_project"
        self.project_dir.mkdir()
        
        # Create some test files
        (self.project_dir / "main.py").write_text("print('hello')")
        (self.project_dir / "utils.py").write_text("def helper(): pass")
        (self.project_dir / "requirements.txt").write_text("requests==2.25.1")
    
    def tearDown(self):
        """Clean up test environment."""
        import shutil
        shutil.rmtree(self.temp_dir)
    
    def test_cache_manager_initialization(self):
        """Test cache manager initialization."""
        self.assertTrue(self.cache_dir.exists())
        self.assertEqual(self.cache_manager.max_cache_size_bytes, 1024 * 1024)
        self.assertIsInstance(self.cache_manager.metadata, dict)
    
    def test_get_cache_key(self):
        """Test cache key generation."""
        key1 = self.cache_manager._get_cache_key(self.project_dir)
        key2 = self.cache_manager._get_cache_key(self.project_dir)
        
        # Same project should generate same key
        self.assertEqual(key1, key2)
        self.assertEqual(len(key1), 32)  # MD5 hash length
    
    def test_get_file_hash(self):
        """Test file hash generation."""
        test_file = self.project_dir / "main.py"
        hash1 = self.cache_manager._get_file_hash(test_file)
        hash2 = self.cache_manager._get_file_hash(test_file)
        
        # Same file should generate same hash
        self.assertEqual(hash1, hash2)
        self.assertEqual(len(hash1), 32)  # MD5 hash length
        
        # Modify file and check hash changes
        test_file.write_text("print('modified')")
        hash3 = self.cache_manager._get_file_hash(test_file)
        self.assertNotEqual(hash1, hash3)
    
    def test_get_project_file_hashes(self):
        """Test project file hash generation."""
        hashes = self.cache_manager._get_project_file_hashes(self.project_dir)
        
        # Should include Python files and dependency files
        self.assertIn("main.py", hashes)
        self.assertIn("utils.py", hashes)
        self.assertIn("requirements.txt", hashes)
        
        # All hashes should be non-empty
        for file_path, file_hash in hashes.items():
            self.assertTrue(file_hash)
            self.assertEqual(len(file_hash), 32)
    
    def test_cache_and_retrieve_result(self):
        """Test caching and retrieving analysis results."""
        test_data = {
            "success": True,
            "modules": {"nodes": [], "edges": []},
            "functions": {"nodes": [], "edges": []}
        }
        
        # Cache the result
        success = self.cache_manager.cache_result(self.project_dir, test_data)
        self.assertTrue(success)
        
        # Retrieve the result
        cached_result = self.cache_manager.get_cached_result(self.project_dir)
        self.assertIsNotNone(cached_result)
        self.assertEqual(cached_result["success"], True)
        self.assertEqual(cached_result["modules"], {"nodes": [], "edges": []})
    
    def test_cache_invalidation_on_file_change(self):
        """Test cache invalidation when files change."""
        test_data = {"test": "data"}
        
        # Cache the result
        self.cache_manager.cache_result(self.project_dir, test_data)
        
        # Verify cache hit
        cached_result = self.cache_manager.get_cached_result(self.project_dir)
        self.assertIsNotNone(cached_result)
        
        # Modify a file
        (self.project_dir / "main.py").write_text("print('modified')")
        
        # Cache should be invalidated
        cached_result = self.cache_manager.get_cached_result(self.project_dir)
        self.assertIsNone(cached_result)
    
    def test_cache_invalidation_on_file_deletion(self):
        """Test cache invalidation when files are deleted."""
        test_data = {"test": "data"}
        
        # Cache the result
        self.cache_manager.cache_result(self.project_dir, test_data)
        
        # Verify cache hit
        cached_result = self.cache_manager.get_cached_result(self.project_dir)
        self.assertIsNotNone(cached_result)
        
        # Delete a file
        (self.project_dir / "utils.py").unlink()
        
        # Cache should be invalidated
        cached_result = self.cache_manager.get_cached_result(self.project_dir)
        self.assertIsNone(cached_result)
    
    def test_cache_invalidation_on_new_file(self):
        """Test cache invalidation when new files are added."""
        test_data = {"test": "data"}
        
        # Cache the result
        self.cache_manager.cache_result(self.project_dir, test_data)
        
        # Verify cache hit
        cached_result = self.cache_manager.get_cached_result(self.project_dir)
        self.assertIsNotNone(cached_result)
        
        # Add a new file
        (self.project_dir / "new_file.py").write_text("def new_function(): pass")
        
        # Cache should be invalidated
        cached_result = self.cache_manager.get_cached_result(self.project_dir)
        self.assertIsNone(cached_result)
    
    def test_cache_stats(self):
        """Test cache statistics."""
        # Initially empty
        stats = self.cache_manager.get_cache_stats()
        self.assertEqual(stats["total_entries"], 0)
        self.assertEqual(stats["total_size_bytes"], 0)
        
        # Cache some data
        test_data = {"test": "data"}
        self.cache_manager.cache_result(self.project_dir, test_data)
        
        # Check updated stats
        stats = self.cache_manager.get_cache_stats()
        self.assertEqual(stats["total_entries"], 1)
        self.assertGreater(stats["total_size_bytes"], 0)
        self.assertEqual(stats["max_size_mb"], 1)
    
    def test_clear_cache(self):
        """Test cache clearing."""
        # Cache some data
        test_data = {"test": "data"}
        self.cache_manager.cache_result(self.project_dir, test_data)
        
        # Verify cache exists
        cached_result = self.cache_manager.get_cached_result(self.project_dir)
        self.assertIsNotNone(cached_result)
        
        # Clear cache
        self.cache_manager.clear_cache()
        
        # Verify cache is empty
        cached_result = self.cache_manager.get_cached_result(self.project_dir)
        self.assertIsNone(cached_result)
        
        stats = self.cache_manager.get_cache_stats()
        self.assertEqual(stats["total_entries"], 0)
    
    def test_invalidate_project_cache(self):
        """Test invalidating cache for specific project."""
        # Cache some data
        test_data = {"test": "data"}
        self.cache_manager.cache_result(self.project_dir, test_data)
        
        # Verify cache exists
        cached_result = self.cache_manager.get_cached_result(self.project_dir)
        self.assertIsNotNone(cached_result)
        
        # Invalidate project cache
        self.cache_manager.invalidate_project_cache(self.project_dir)
        
        # Verify cache is invalidated
        cached_result = self.cache_manager.get_cached_result(self.project_dir)
        self.assertIsNone(cached_result)


class TestIncrementalAnalyzer(unittest.TestCase):
    """Test IncrementalAnalyzer class."""
    
    def setUp(self):
        """Set up test environment."""
        self.temp_dir = tempfile.mkdtemp()
        self.cache_dir = Path(self.temp_dir) / "cache"
        self.cache_manager = CacheManager(self.cache_dir)
        self.incremental_analyzer = IncrementalAnalyzer(self.cache_manager)
        
        # Create a temporary project directory
        self.project_dir = Path(self.temp_dir) / "test_project"
        self.project_dir.mkdir()
        
        # Create some test files
        (self.project_dir / "main.py").write_text("print('hello')")
        (self.project_dir / "utils.py").write_text("def helper(): pass")
    
    def tearDown(self):
        """Clean up test environment."""
        import shutil
        shutil.rmtree(self.temp_dir)
    
    def test_get_changed_files_no_changes(self):
        """Test detecting no changes."""
        current_hashes = self.cache_manager._get_project_file_hashes(self.project_dir)
        changed_files = self.incremental_analyzer.get_changed_files(self.project_dir, current_hashes)
        
        self.assertEqual(len(changed_files), 0)
    
    def test_get_changed_files_modified(self):
        """Test detecting modified files."""
        # Get initial hashes
        initial_hashes = self.cache_manager._get_project_file_hashes(self.project_dir)
        
        # Modify a file
        time.sleep(0.1)  # Ensure different timestamp
        (self.project_dir / "main.py").write_text("print('modified')")
        
        # Check for changes
        changed_files = self.incremental_analyzer.get_changed_files(self.project_dir, initial_hashes)
        
        self.assertEqual(len(changed_files), 1)
        self.assertIn("main.py", changed_files)
    
    def test_get_changed_files_new_file(self):
        """Test detecting new files."""
        # Get initial hashes
        initial_hashes = self.cache_manager._get_project_file_hashes(self.project_dir)
        
        # Add a new file
        (self.project_dir / "new_file.py").write_text("def new_function(): pass")
        
        # Check for changes
        changed_files = self.incremental_analyzer.get_changed_files(self.project_dir, initial_hashes)
        
        self.assertEqual(len(changed_files), 1)
        self.assertIn("new_file.py", changed_files)
    
    def test_get_changed_files_deleted_file(self):
        """Test detecting deleted files."""
        # Get initial hashes
        initial_hashes = self.cache_manager._get_project_file_hashes(self.project_dir)
        
        # Delete a file
        (self.project_dir / "utils.py").unlink()
        
        # Check for changes
        changed_files = self.incremental_analyzer.get_changed_files(self.project_dir, initial_hashes)
        
        self.assertEqual(len(changed_files), 1)
        self.assertIn("utils.py", changed_files)
    
    def test_should_use_incremental_analysis(self):
        """Test incremental analysis decision logic."""
        # Small number of changes should use incremental
        changed_files = {"file1.py", "file2.py"}
        total_files = 20
        
        should_use = self.incremental_analyzer.should_use_incremental_analysis(changed_files, total_files)
        self.assertTrue(should_use)
        
        # Large number of changes should not use incremental
        changed_files = {"file1.py", "file2.py", "file3.py", "file4.py", "file5.py"}
        total_files = 20
        
        should_use = self.incremental_analyzer.should_use_incremental_analysis(changed_files, total_files)
        self.assertFalse(should_use)
        
        # No changes should not use incremental
        changed_files = set()
        total_files = 20
        
        should_use = self.incremental_analyzer.should_use_incremental_analysis(changed_files, total_files)
        self.assertFalse(should_use)


if __name__ == "__main__":
    unittest.main()