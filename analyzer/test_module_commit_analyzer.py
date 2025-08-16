#!/usr/bin/env python3
"""
Tests for Module Commit Analyzer

This module contains unit tests for the ModuleCommitAnalyzer class and related functionality.
"""

import unittest
import tempfile
from pathlib import Path
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from git_analyzer import GitAnalyzer, CommitInfo, AuthorContribution, GitAnalysisResult, RepositoryInfo, DateRange
from module_commit_analyzer import (
    ModuleCommitAnalyzer, ModuleGitStats, ModuleCommitFrequency,
    ProportionalContribution
)


class TestModuleCommitAnalyzer(unittest.TestCase):
    """Test cases for ModuleCommitAnalyzer class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.repo_path = Path(self.temp_dir)
        
        # Create mock GitAnalyzer
        self.mock_git_analyzer = MagicMock(spec=GitAnalyzer)
        self.mock_git_analyzer.repo_path = self.repo_path
        
        self.analyzer = ModuleCommitAnalyzer(self.mock_git_analyzer)
    
    def tearDown(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_init(self):
        """Test ModuleCommitAnalyzer initialization."""
        self.assertEqual(self.analyzer.git_analyzer, self.mock_git_analyzer)
        self.assertEqual(self.analyzer.repo_path, self.repo_path)
        self.assertEqual(self.analyzer.errors, [])
    
    def test_group_commits_by_module(self):
        """Test grouping commits by module."""
        # Create mock commits
        commits = [
            CommitInfo(
                hash="abc123",
                author_name="John Doe",
                author_email="john@example.com",
                date=datetime(2023, 1, 15),
                message="Commit 1",
                files_changed=["module1/file1.py", "module1/file2.py"],
                lines_added=10,
                lines_removed=2
            ),
            CommitInfo(
                hash="def456",
                author_name="Jane Smith",
                author_email="jane@example.com",
                date=datetime(2023, 1, 16),
                message="Commit 2",
                files_changed=["module2/file3.py", "module1/file4.py"],
                lines_added=5,
                lines_removed=1
            ),
            CommitInfo(
                hash="ghi789",
                author_name="John Doe",
                author_email="john@example.com",
                date=datetime(2023, 1, 17),
                message="Commit 3",
                files_changed=["root_file.py"],
                lines_added=8,
                lines_removed=0
            )
        ]
        
        module_commits = self.analyzer._group_commits_by_module(commits)
        
        # Check that commits are grouped correctly
        self.assertIn("module1", module_commits)
        self.assertIn("module2", module_commits)
        self.assertIn(".", module_commits)  # Root directory
        
        # Check module1 has 2 commits
        self.assertEqual(len(module_commits["module1"]), 2)
        
        # Check module2 has 1 commit
        self.assertEqual(len(module_commits["module2"]), 1)
        
        # Check root has 1 commit
        self.assertEqual(len(module_commits["."]), 1)
    
    def test_file_belongs_to_module(self):
        """Test file module membership check."""
        # Test root module
        self.assertTrue(self.analyzer._file_belongs_to_module("root_file.py", "."))
        self.assertFalse(self.analyzer._file_belongs_to_module("module1/file.py", "."))
        
        # Test specific module
        self.assertTrue(self.analyzer._file_belongs_to_module("module1/file.py", "module1"))
        self.assertTrue(self.analyzer._file_belongs_to_module("module1/subdir/file.py", "module1"))
        self.assertFalse(self.analyzer._file_belongs_to_module("module2/file.py", "module1"))
        self.assertFalse(self.analyzer._file_belongs_to_module("root_file.py", "module1"))
    
    def test_calculate_commit_frequency(self):
        """Test commit frequency calculation."""
        commits = [
            CommitInfo(
                hash="abc123",
                author_name="John Doe",
                author_email="john@example.com",
                date=datetime(2023, 1, 15),
                message="Commit 1",
                files_changed=["file1.py"],
                lines_added=10,
                lines_removed=2
            ),
            CommitInfo(
                hash="def456",
                author_name="Jane Smith",
                author_email="jane@example.com",
                date=datetime(2023, 1, 20),
                message="Commit 2",
                files_changed=["file2.py"],
                lines_added=5,
                lines_removed=1
            ),
            CommitInfo(
                hash="ghi789",
                author_name="John Doe",
                author_email="john@example.com",
                date=datetime(2023, 2, 5),
                message="Commit 3",
                files_changed=["file3.py"],
                lines_added=8,
                lines_removed=0
            )
        ]
        
        frequency = self.analyzer._calculate_commit_frequency(commits)
        
        self.assertEqual(frequency["2023-01"], 2)
        self.assertEqual(frequency["2023-02"], 1)
    
    def test_calculate_module_stats(self):
        """Test module statistics calculation."""
        commits = [
            CommitInfo(
                hash="abc123",
                author_name="John Doe",
                author_email="john@example.com",
                date=datetime(2023, 1, 15),
                message="Commit 1",
                files_changed=["module1/file1.py"],
                lines_added=10,
                lines_removed=2
            ),
            CommitInfo(
                hash="def456",
                author_name="Jane Smith",
                author_email="jane@example.com",
                date=datetime(2023, 1, 16),
                message="Commit 2",
                files_changed=["module1/file2.py"],
                lines_added=5,
                lines_removed=1
            ),
            CommitInfo(
                hash="ghi789",
                author_name="John Doe",
                author_email="john@example.com",
                date=datetime(2023, 1, 17),
                message="Commit 3",
                files_changed=["module1/file3.py"],
                lines_added=8,
                lines_removed=0
            )
        ]
        
        stats = self.analyzer._calculate_module_stats("module1", commits)
        
        self.assertEqual(stats.module_path, "module1")
        self.assertEqual(stats.total_commits, 3)
        self.assertEqual(stats.unique_authors, 2)
        self.assertEqual(len(stats.author_breakdown), 2)
        
        # Check that John Doe is first (more commits)
        top_author = stats.author_breakdown[0]
        self.assertEqual(top_author.author_name, "John Doe")
        self.assertEqual(top_author.total_commits, 2)
        
        # Check commit frequency
        self.assertIn("2023-01", stats.commit_frequency)
        self.assertEqual(stats.commit_frequency["2023-01"], 3)
    
    def test_calculate_module_stats_empty(self):
        """Test module statistics calculation with empty commits."""
        stats = self.analyzer._calculate_module_stats("empty_module", [])
        
        self.assertEqual(stats.module_path, "empty_module")
        self.assertEqual(stats.total_commits, 0)
        self.assertEqual(stats.unique_authors, 0)
        self.assertEqual(stats.lines_added, 0)
        self.assertEqual(stats.lines_removed, 0)
        self.assertEqual(len(stats.author_breakdown), 0)
        self.assertEqual(len(stats.commit_frequency), 0)
    
    def test_analyze_module_frequency_pattern(self):
        """Test module frequency pattern analysis."""
        commits = [
            CommitInfo(
                hash="abc123",
                author_name="John Doe",
                author_email="john@example.com",
                date=datetime(2023, 1, 15),
                message="Commit 1",
                files_changed=["file1.py"],
                lines_added=10,
                lines_removed=2
            ),
            CommitInfo(
                hash="def456",
                author_name="Jane Smith",
                author_email="jane@example.com",
                date=datetime(2023, 1, 15),
                message="Commit 2",
                files_changed=["file2.py"],
                lines_added=5,
                lines_removed=1
            ),
            CommitInfo(
                hash="ghi789",
                author_name="John Doe",
                author_email="john@example.com",
                date=datetime(2023, 1, 20),
                message="Commit 3",
                files_changed=["file3.py"],
                lines_added=8,
                lines_removed=0
            )
        ]
        
        frequency = self.analyzer._analyze_module_frequency_pattern("test_module", commits)
        
        self.assertEqual(frequency.module_path, "test_module")
        self.assertEqual(frequency.daily_commits["2023-01-15"], 2)
        self.assertEqual(frequency.daily_commits["2023-01-20"], 1)
        self.assertEqual(frequency.monthly_commits["2023-01"], 3)
        self.assertEqual(frequency.peak_activity_period, "2023-01")
        self.assertGreater(frequency.average_commits_per_week, 0)
    
    def test_module_git_stats_serialization(self):
        """Test ModuleGitStats serialization."""
        author_contrib = AuthorContribution(
            author_name="John Doe",
            author_email="john@example.com",
            total_commits=5,
            lines_added=100,
            lines_removed=10,
            modules_touched=["module1"],
            first_commit=datetime(2023, 1, 1),
            last_commit=datetime(2023, 1, 15),
            contribution_percentage=50.0
        )
        
        stats = ModuleGitStats(
            module_path="module1",
            total_commits=10,
            unique_authors=2,
            lines_added=200,
            lines_removed=20,
            author_breakdown=[author_contrib],
            commit_frequency={"2023-01": 10},
            first_commit=datetime(2023, 1, 1),
            last_commit=datetime(2023, 1, 15)
        )
        
        stats_dict = stats.to_dict()
        
        self.assertEqual(stats_dict["module_path"], "module1")
        self.assertEqual(stats_dict["total_commits"], 10)
        self.assertEqual(stats_dict["unique_authors"], 2)
        self.assertEqual(stats_dict["net_lines"], 180)  # 200 - 20
        self.assertEqual(len(stats_dict["author_breakdown"]), 1)
        self.assertEqual(stats_dict["commit_frequency"]["2023-01"], 10)
        self.assertIn("2023-01-01", stats_dict["first_commit"])
        self.assertEqual(stats_dict["activity_span_days"], 14)  # 15 - 1
    
    def test_proportional_contribution_serialization(self):
        """Test ProportionalContribution serialization."""
        contrib = ProportionalContribution(
            author_name="John Doe",
            author_email="john@example.com",
            module_path="module1",
            commits_in_module=5,
            total_commits_by_author=10,
            lines_added_in_module=50,
            lines_removed_in_module=5,
            total_lines_by_author=100,
            module_contribution_percentage=50.0,
            author_dominance_percentage=25.0
        )
        
        contrib_dict = contrib.to_dict()
        
        self.assertEqual(contrib_dict["author_name"], "John Doe")
        self.assertEqual(contrib_dict["module_path"], "module1")
        self.assertEqual(contrib_dict["commits_in_module"], 5)
        self.assertEqual(contrib_dict["total_commits_by_author"], 10)
        self.assertEqual(contrib_dict["module_contribution_percentage"], 50.0)
        self.assertEqual(contrib_dict["author_dominance_percentage"], 25.0)
    
    def test_module_commit_frequency_serialization(self):
        """Test ModuleCommitFrequency serialization."""
        frequency = ModuleCommitFrequency(
            module_path="module1",
            daily_commits={"2023-01-15": 2, "2023-01-16": 1},
            weekly_commits={"2023-W02": 3},
            monthly_commits={"2023-01": 3},
            peak_activity_period="2023-01",
            average_commits_per_week=1.5
        )
        
        freq_dict = frequency.to_dict()
        
        self.assertEqual(freq_dict["module_path"], "module1")
        self.assertEqual(freq_dict["daily_commits"]["2023-01-15"], 2)
        self.assertEqual(freq_dict["weekly_commits"]["2023-W02"], 3)
        self.assertEqual(freq_dict["monthly_commits"]["2023-01"], 3)
        self.assertEqual(freq_dict["peak_activity_period"], "2023-01")
        self.assertEqual(freq_dict["average_commits_per_week"], 1.5)


class TestModuleCommitAnalyzerIntegration(unittest.TestCase):
    """Integration tests for ModuleCommitAnalyzer."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.repo_path = Path(self.temp_dir)
        
        # Create mock GitAnalyzer with realistic data
        self.mock_git_analyzer = MagicMock(spec=GitAnalyzer)
        self.mock_git_analyzer.repo_path = self.repo_path
        
        # Create sample commits
        self.sample_commits = [
            CommitInfo(
                hash="abc123",
                author_name="John Doe",
                author_email="john@example.com",
                date=datetime(2023, 1, 15),
                message="Initial module1 implementation",
                files_changed=["module1/models.py", "module1/views.py"],
                lines_added=100,
                lines_removed=0
            ),
            CommitInfo(
                hash="def456",
                author_name="Jane Smith",
                author_email="jane@example.com",
                date=datetime(2023, 1, 16),
                message="Add module2 functionality",
                files_changed=["module2/handlers.py", "module2/utils.py"],
                lines_added=80,
                lines_removed=5
            ),
            CommitInfo(
                hash="ghi789",
                author_name="John Doe",
                author_email="john@example.com",
                date=datetime(2023, 1, 17),
                message="Update module1 models",
                files_changed=["module1/models.py"],
                lines_added=20,
                lines_removed=10
            ),
            CommitInfo(
                hash="jkl012",
                author_name="Jane Smith",
                author_email="jane@example.com",
                date=datetime(2023, 1, 18),
                message="Fix module1 bug",
                files_changed=["module1/views.py"],
                lines_added=5,
                lines_removed=15
            )
        ]
        
        # Create sample author contributions
        self.sample_authors = [
            AuthorContribution(
                author_name="John Doe",
                author_email="john@example.com",
                total_commits=2,
                lines_added=120,
                lines_removed=10,
                modules_touched=["module1"],
                first_commit=datetime(2023, 1, 15),
                last_commit=datetime(2023, 1, 17),
                contribution_percentage=50.0
            ),
            AuthorContribution(
                author_name="Jane Smith",
                author_email="jane@example.com",
                total_commits=2,
                lines_added=85,
                lines_removed=20,
                modules_touched=["module1", "module2"],
                first_commit=datetime(2023, 1, 16),
                last_commit=datetime(2023, 1, 18),
                contribution_percentage=50.0
            )
        ]
        
        self.analyzer = ModuleCommitAnalyzer(self.mock_git_analyzer)
    
    def tearDown(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_analyze_module_commits_integration(self):
        """Test complete module commit analysis workflow."""
        # Mock GitAnalyzer.analyze_repository
        mock_result = GitAnalysisResult(
            repository_info=RepositoryInfo(
                name="test-repo",
                branch="main",
                total_commits=4,
                date_range=DateRange(datetime(2023, 1, 15), datetime(2023, 1, 18)),
                contributors=2
            ),
            author_contributions=self.sample_authors,
            commit_timeline=[],
            commits=self.sample_commits,
            success=True,
            errors=[]
        )
        
        self.mock_git_analyzer.analyze_repository.return_value = mock_result
        
        # Run analysis
        module_stats = self.analyzer.analyze_module_commits()
        
        # Verify results
        self.assertIn("module1", module_stats)
        self.assertIn("module2", module_stats)
        
        # Check module1 stats
        module1_stats = module_stats["module1"]
        self.assertEqual(module1_stats.total_commits, 3)  # 3 commits touched module1
        self.assertEqual(module1_stats.unique_authors, 2)  # Both authors contributed
        
        # Check module2 stats
        module2_stats = module_stats["module2"]
        self.assertEqual(module2_stats.total_commits, 1)  # 1 commit touched module2
        self.assertEqual(module2_stats.unique_authors, 1)  # Only Jane contributed
    
    def test_calculate_proportional_contributions_integration(self):
        """Test proportional contribution calculation workflow."""
        # Mock GitAnalyzer.analyze_repository
        mock_result = GitAnalysisResult(
            repository_info=RepositoryInfo(
                name="test-repo",
                branch="main",
                total_commits=4,
                date_range=DateRange(datetime(2023, 1, 15), datetime(2023, 1, 18)),
                contributors=2
            ),
            author_contributions=self.sample_authors,
            commit_timeline=[],
            commits=self.sample_commits,
            success=True,
            errors=[]
        )
        
        self.mock_git_analyzer.analyze_repository.return_value = mock_result
        
        # Run proportional analysis
        proportional_contribs = self.analyzer.calculate_proportional_contributions()
        
        # Verify results
        self.assertGreater(len(proportional_contribs), 0)
        
        # Find John's contribution to module1
        john_module1 = next(
            (c for c in proportional_contribs 
             if c.author_name == "John Doe" and c.module_path == "module1"),
            None
        )
        
        self.assertIsNotNone(john_module1)
        self.assertGreater(john_module1.module_contribution_percentage, 0)
        self.assertGreater(john_module1.author_dominance_percentage, 0)
    
    def test_get_top_contributors_by_module(self):
        """Test getting top contributors by module."""
        # Mock GitAnalyzer.analyze_repository
        mock_result = GitAnalysisResult(
            repository_info=RepositoryInfo(
                name="test-repo",
                branch="main",
                total_commits=4,
                date_range=DateRange(datetime(2023, 1, 15), datetime(2023, 1, 18)),
                contributors=2
            ),
            author_contributions=self.sample_authors,
            commit_timeline=[],
            commits=self.sample_commits,
            success=True,
            errors=[]
        )
        
        self.mock_git_analyzer.analyze_repository.return_value = mock_result
        
        # Get top contributors
        top_contributors = self.analyzer.get_top_contributors_by_module(limit=3)
        
        # Verify results
        self.assertIn("module1", top_contributors)
        self.assertIn("module2", top_contributors)
        
        # Check that we get contributors for each module
        module1_contributors = top_contributors["module1"]
        self.assertGreater(len(module1_contributors), 0)
        self.assertLessEqual(len(module1_contributors), 3)  # Respects limit
        
        module2_contributors = top_contributors["module2"]
        self.assertGreater(len(module2_contributors), 0)
        self.assertLessEqual(len(module2_contributors), 3)  # Respects limit


if __name__ == '__main__':
    unittest.main()