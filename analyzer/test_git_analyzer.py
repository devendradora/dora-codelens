#!/usr/bin/env python3
"""
Tests for Git Analytics Engine

This module contains unit tests for the GitAnalyzer class and related functionality.
"""

import unittest
import tempfile
import subprocess
from pathlib import Path
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from git_analyzer import (
    GitAnalyzer, GitAnalysisError, DateRange, AuthorContribution,
    CommitInfo, CommitTimelineEntry, RepositoryInfo, GitAnalysisResult
)


class TestGitAnalyzer(unittest.TestCase):
    """Test cases for GitAnalyzer class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.repo_path = Path(self.temp_dir)
        
        # Create a mock Git repository structure
        self.repo_path.mkdir(exist_ok=True)
        (self.repo_path / ".git").mkdir(exist_ok=True)
    
    def tearDown(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_init_valid_repository(self):
        """Test GitAnalyzer initialization with valid repository."""
        with patch.object(GitAnalyzer, '_is_git_repository', return_value=True):
            analyzer = GitAnalyzer(self.repo_path)
            self.assertEqual(analyzer.repo_path, self.repo_path)
            self.assertEqual(analyzer.errors, [])
    
    def test_init_invalid_repository(self):
        """Test GitAnalyzer initialization with invalid repository."""
        with patch.object(GitAnalyzer, '_is_git_repository', return_value=False):
            with self.assertRaises(GitAnalysisError):
                GitAnalyzer(self.repo_path)
    
    def test_is_git_repository_valid(self):
        """Test _is_git_repository with valid repository."""
        analyzer = GitAnalyzer.__new__(GitAnalyzer)
        analyzer.repo_path = self.repo_path
        
        with patch('subprocess.run') as mock_run:
            mock_run.return_value.returncode = 0
            result = analyzer._is_git_repository()
            self.assertTrue(result)
    
    def test_is_git_repository_invalid(self):
        """Test _is_git_repository with invalid repository."""
        analyzer = GitAnalyzer.__new__(GitAnalyzer)
        analyzer.repo_path = self.repo_path
        
        with patch('subprocess.run') as mock_run:
            mock_run.return_value.returncode = 1
            result = analyzer._is_git_repository()
            self.assertFalse(result)
    
    def test_parse_git_date(self):
        """Test Git date parsing."""
        analyzer = GitAnalyzer.__new__(GitAnalyzer)
        
        # Test standard Git date format
        date_str = "2023-01-15 14:30:00 +0000"
        result = analyzer._parse_git_date(date_str)
        expected = datetime(2023, 1, 15, 14, 30, 0)
        self.assertEqual(result, expected)
        
        # Test alternative format
        date_str = "Sun Jan 15 14:30:00 2023"
        result = analyzer._parse_git_date(date_str)
        expected = datetime(2023, 1, 15, 14, 30, 0)
        self.assertEqual(result, expected)
    
    def test_parse_git_log_output(self):
        """Test parsing of Git log output."""
        analyzer = GitAnalyzer.__new__(GitAnalyzer)
        
        # Mock Git log output
        git_output = """abc123|John Doe|john@example.com|2023-01-15 14:30:00 +0000|Initial commit
10	0	file1.py
5	2	file2.py

def456|Jane Smith|jane@example.com|2023-01-16 10:15:00 +0000|Add new feature
3	1	file3.py
"""
        
        commits = analyzer._parse_git_log_output(git_output)
        
        self.assertEqual(len(commits), 2)
        
        # Check first commit
        commit1 = commits[0]
        self.assertEqual(commit1.hash, "abc123")
        self.assertEqual(commit1.author_name, "John Doe")
        self.assertEqual(commit1.author_email, "john@example.com")
        self.assertEqual(commit1.message, "Initial commit")
        self.assertEqual(commit1.lines_added, 15)
        self.assertEqual(commit1.lines_removed, 2)
        self.assertEqual(len(commit1.files_changed), 2)
        
        # Check second commit
        commit2 = commits[1]
        self.assertEqual(commit2.hash, "def456")
        self.assertEqual(commit2.author_name, "Jane Smith")
        self.assertEqual(commit2.lines_added, 3)
        self.assertEqual(commit2.lines_removed, 1)
    
    def test_calculate_author_contributions(self):
        """Test author contribution calculation."""
        analyzer = GitAnalyzer.__new__(GitAnalyzer)
        
        # Create mock commits
        commits = [
            CommitInfo(
                hash="abc123",
                author_name="John Doe",
                author_email="john@example.com",
                date=datetime(2023, 1, 15),
                message="Commit 1",
                files_changed=["module1/file1.py", "module2/file2.py"],
                lines_added=10,
                lines_removed=2
            ),
            CommitInfo(
                hash="def456",
                author_name="John Doe",
                author_email="john@example.com",
                date=datetime(2023, 1, 16),
                message="Commit 2",
                files_changed=["module1/file3.py"],
                lines_added=5,
                lines_removed=1
            ),
            CommitInfo(
                hash="ghi789",
                author_name="Jane Smith",
                author_email="jane@example.com",
                date=datetime(2023, 1, 17),
                message="Commit 3",
                files_changed=["module3/file4.py"],
                lines_added=8,
                lines_removed=0
            )
        ]
        
        contributions = analyzer._calculate_author_contributions(commits)
        
        self.assertEqual(len(contributions), 2)
        
        # Check John Doe's contribution (should be first due to more commits)
        john_contrib = contributions[0]
        self.assertEqual(john_contrib.author_name, "John Doe")
        self.assertEqual(john_contrib.total_commits, 2)
        self.assertEqual(john_contrib.lines_added, 15)
        self.assertEqual(john_contrib.lines_removed, 3)
        self.assertIn("module1", john_contrib.modules_touched)
        self.assertIn("module2", john_contrib.modules_touched)
        
        # Check Jane Smith's contribution
        jane_contrib = contributions[1]
        self.assertEqual(jane_contrib.author_name, "Jane Smith")
        self.assertEqual(jane_contrib.total_commits, 1)
        self.assertEqual(jane_contrib.lines_added, 8)
        self.assertEqual(jane_contrib.lines_removed, 0)
        self.assertIn("module3", jane_contrib.modules_touched)
    
    def test_generate_commit_timeline(self):
        """Test commit timeline generation."""
        analyzer = GitAnalyzer.__new__(GitAnalyzer)
        
        # Create mock commits on different days
        commits = [
            CommitInfo(
                hash="abc123",
                author_name="John Doe",
                author_email="john@example.com",
                date=datetime(2023, 1, 15, 10, 0),
                message="Commit 1",
                files_changed=["file1.py"],
                lines_added=10,
                lines_removed=2
            ),
            CommitInfo(
                hash="def456",
                author_name="Jane Smith",
                author_email="jane@example.com",
                date=datetime(2023, 1, 15, 14, 0),
                message="Commit 2",
                files_changed=["file2.py"],
                lines_added=5,
                lines_removed=1
            ),
            CommitInfo(
                hash="ghi789",
                author_name="John Doe",
                author_email="john@example.com",
                date=datetime(2023, 1, 16, 9, 0),
                message="Commit 3",
                files_changed=["file3.py"],
                lines_added=8,
                lines_removed=0
            )
        ]
        
        timeline = analyzer._generate_commit_timeline(commits)
        
        self.assertEqual(len(timeline), 2)  # Two different days
        
        # Check first day (2023-01-15)
        day1 = timeline[0]
        self.assertEqual(day1.date.date(), datetime(2023, 1, 15).date())
        self.assertEqual(day1.commit_count, 2)
        self.assertEqual(day1.lines_added, 15)
        self.assertEqual(day1.lines_removed, 3)
        self.assertEqual(len(day1.authors), 2)
        
        # Check second day (2023-01-16)
        day2 = timeline[1]
        self.assertEqual(day2.date.date(), datetime(2023, 1, 16).date())
        self.assertEqual(day2.commit_count, 1)
        self.assertEqual(day2.lines_added, 8)
        self.assertEqual(day2.lines_removed, 0)
        self.assertEqual(len(day2.authors), 1)
    
    def test_update_contribution_percentages(self):
        """Test contribution percentage calculation."""
        analyzer = GitAnalyzer.__new__(GitAnalyzer)
        
        contributions = [
            AuthorContribution(
                author_name="John Doe",
                author_email="john@example.com",
                total_commits=6,
                lines_added=100,
                lines_removed=10,
                modules_touched=["module1"],
                first_commit=datetime.now(),
                last_commit=datetime.now()
            ),
            AuthorContribution(
                author_name="Jane Smith",
                author_email="jane@example.com",
                total_commits=4,
                lines_added=50,
                lines_removed=5,
                modules_touched=["module2"],
                first_commit=datetime.now(),
                last_commit=datetime.now()
            )
        ]
        
        analyzer._update_contribution_percentages(contributions)
        
        self.assertEqual(contributions[0].contribution_percentage, 60.0)  # 6/10 * 100
        self.assertEqual(contributions[1].contribution_percentage, 40.0)  # 4/10 * 100
    
    @patch('subprocess.run')
    def test_get_repository_info(self, mock_run):
        """Test repository information extraction."""
        analyzer = GitAnalyzer.__new__(GitAnalyzer)
        analyzer.repo_path = self.repo_path
        analyzer.errors = []
        
        # Mock subprocess calls
        mock_responses = [
            MagicMock(returncode=0, stdout="/path/to/test-repo\n"),  # repo name
            MagicMock(returncode=0, stdout="main\n"),  # branch
            MagicMock(returncode=0, stdout="42\n"),  # commit count
            MagicMock(returncode=0, stdout="2023-01-01 10:00:00 +0000\n"),  # first commit
            MagicMock(returncode=0, stdout="2023-01-15 15:30:00 +0000\n"),  # last commit
            MagicMock(returncode=0, stdout="     5\tJohn Doe\n     3\tJane Smith\n")  # contributors
        ]
        
        mock_run.side_effect = mock_responses
        
        repo_info = analyzer._get_repository_info()
        
        self.assertEqual(repo_info.name, "test-repo")
        self.assertEqual(repo_info.branch, "main")
        self.assertEqual(repo_info.total_commits, 42)
        self.assertEqual(repo_info.contributors, 2)
        self.assertEqual(repo_info.date_range.start.year, 2023)
        self.assertEqual(repo_info.date_range.end.year, 2023)
    
    def test_date_range_contains(self):
        """Test DateRange contains method."""
        start_date = datetime(2023, 1, 1)
        end_date = datetime(2023, 1, 31)
        date_range = DateRange(start_date, end_date)
        
        # Test date within range
        test_date = datetime(2023, 1, 15)
        self.assertTrue(date_range.contains(test_date))
        
        # Test date before range
        test_date = datetime(2022, 12, 31)
        self.assertFalse(date_range.contains(test_date))
        
        # Test date after range
        test_date = datetime(2023, 2, 1)
        self.assertFalse(date_range.contains(test_date))
        
        # Test boundary dates
        self.assertTrue(date_range.contains(start_date))
        self.assertTrue(date_range.contains(end_date))
    
    def test_data_serialization(self):
        """Test data structure serialization to dictionaries."""
        # Test AuthorContribution serialization
        contrib = AuthorContribution(
            author_name="John Doe",
            author_email="john@example.com",
            total_commits=5,
            lines_added=100,
            lines_removed=10,
            modules_touched=["module1", "module2"],
            first_commit=datetime(2023, 1, 1),
            last_commit=datetime(2023, 1, 15),
            contribution_percentage=50.0
        )
        
        contrib_dict = contrib.to_dict()
        self.assertEqual(contrib_dict["author_name"], "John Doe")
        self.assertEqual(contrib_dict["total_commits"], 5)
        self.assertEqual(contrib_dict["contribution_percentage"], 50.0)
        self.assertIn("2023-01-01", contrib_dict["first_commit"])
        
        # Test CommitInfo serialization
        commit = CommitInfo(
            hash="abc123",
            author_name="John Doe",
            author_email="john@example.com",
            date=datetime(2023, 1, 15),
            message="Test commit",
            files_changed=["file1.py"],
            lines_added=10,
            lines_removed=2
        )
        
        commit_dict = commit.to_dict()
        self.assertEqual(commit_dict["hash"], "abc123")
        self.assertEqual(commit_dict["lines_added"], 10)
        self.assertIn("2023-01-15", commit_dict["date"])


class TestGitAnalysisIntegration(unittest.TestCase):
    """Integration tests for Git analysis functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.repo_path = Path(self.temp_dir)
    
    def tearDown(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    @patch('subprocess.run')
    def test_full_analysis_workflow(self, mock_run):
        """Test complete Git analysis workflow."""
        # Mock all subprocess calls for a complete analysis
        mock_responses = [
            MagicMock(returncode=0),  # _is_git_repository
            MagicMock(returncode=0, stdout="/path/to/test-repo\n"),  # repo name
            MagicMock(returncode=0, stdout="main\n"),  # branch
            MagicMock(returncode=0, stdout="2\n"),  # commit count
            MagicMock(returncode=0, stdout="2023-01-01 10:00:00 +0000\n"),  # first commit
            MagicMock(returncode=0, stdout="2023-01-15 15:30:00 +0000\n"),  # last commit
            MagicMock(returncode=0, stdout="     2\tJohn Doe\n"),  # contributors
            MagicMock(returncode=0, stdout="""abc123|John Doe|john@example.com|2023-01-15 14:30:00 +0000|Initial commit
10	2	module1/file1.py
5	0	module2/file2.py

def456|Jane Smith|jane@example.com|2023-01-16 10:15:00 +0000|Add feature
3	1	module1/file3.py
""")  # git log output
        ]
        
        mock_run.side_effect = mock_responses
        
        analyzer = GitAnalyzer(self.repo_path)
        result = analyzer.analyze_repository()
        
        # Verify analysis result
        self.assertTrue(result.success)
        self.assertEqual(result.repository_info.name, "test-repo")
        self.assertEqual(result.repository_info.branch, "main")
        self.assertEqual(len(result.author_contributions), 2)
        self.assertEqual(len(result.commits), 2)
        
        # Verify author contributions
        john_contrib = next(c for c in result.author_contributions if c.author_name == "John Doe")
        self.assertEqual(john_contrib.total_commits, 1)
        self.assertEqual(john_contrib.lines_added, 15)
        self.assertEqual(john_contrib.lines_removed, 2)
        
        jane_contrib = next(c for c in result.author_contributions if c.author_name == "Jane Smith")
        self.assertEqual(jane_contrib.total_commits, 1)
        self.assertEqual(jane_contrib.lines_added, 3)
        self.assertEqual(jane_contrib.lines_removed, 1)


if __name__ == '__main__':
    unittest.main()