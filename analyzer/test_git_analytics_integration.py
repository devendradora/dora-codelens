#!/usr/bin/env python3
"""
Integration test for the complete Git Analytics Engine

This demonstrates the full workflow of the Git analytics system.
"""

import unittest
import tempfile
import json
from pathlib import Path
from datetime import datetime
from unittest.mock import patch, MagicMock

from git_analyzer import GitAnalyzer, GitAnalysisResult, RepositoryInfo, DateRange, AuthorContribution, CommitInfo
from module_commit_analyzer import ModuleCommitAnalyzer
from git_analytics_visualizer import GitAnalyticsVisualizer, FilterOptions


class TestGitAnalyticsIntegration(unittest.TestCase):
    """Integration tests for the complete Git analytics system."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.repo_path = Path(self.temp_dir)
        
        # Create sample commits that represent a realistic project
        self.sample_commits = [
            CommitInfo(
                hash="abc123",
                author_name="John Doe",
                author_email="john@example.com",
                date=datetime(2023, 1, 15),
                message="Initial project setup",
                files_changed=["src/main.py", "src/utils.py", "requirements.txt"],
                lines_added=150,
                lines_removed=0
            ),
            CommitInfo(
                hash="def456",
                author_name="Jane Smith",
                author_email="jane@example.com",
                date=datetime(2023, 1, 16),
                message="Add authentication module",
                files_changed=["src/auth/models.py", "src/auth/views.py", "src/auth/__init__.py"],
                lines_added=200,
                lines_removed=5
            ),
            CommitInfo(
                hash="ghi789",
                author_name="John Doe",
                author_email="john@example.com",
                date=datetime(2023, 1, 17),
                message="Refactor main module",
                files_changed=["src/main.py", "src/utils.py"],
                lines_added=50,
                lines_removed=30
            ),
            CommitInfo(
                hash="jkl012",
                author_name="Alice Johnson",
                author_email="alice@example.com",
                date=datetime(2023, 1, 18),
                message="Add API endpoints",
                files_changed=["src/api/endpoints.py", "src/api/serializers.py"],
                lines_added=180,
                lines_removed=10
            ),
            CommitInfo(
                hash="mno345",
                author_name="Jane Smith",
                author_email="jane@example.com",
                date=datetime(2023, 1, 19),
                message="Improve authentication security",
                files_changed=["src/auth/models.py", "src/auth/utils.py"],
                lines_added=75,
                lines_removed=25
            )
        ]
        
        # Create corresponding author contributions
        self.sample_authors = [
            AuthorContribution(
                author_name="John Doe",
                author_email="john@example.com",
                total_commits=2,
                lines_added=200,
                lines_removed=30,
                modules_touched=["src", "src/auth"],
                first_commit=datetime(2023, 1, 15),
                last_commit=datetime(2023, 1, 17),
                contribution_percentage=40.0
            ),
            AuthorContribution(
                author_name="Jane Smith",
                author_email="jane@example.com",
                total_commits=2,
                lines_added=275,
                lines_removed=30,
                modules_touched=["src/auth"],
                first_commit=datetime(2023, 1, 16),
                last_commit=datetime(2023, 1, 19),
                contribution_percentage=40.0
            ),
            AuthorContribution(
                author_name="Alice Johnson",
                author_email="alice@example.com",
                total_commits=1,
                lines_added=180,
                lines_removed=10,
                modules_touched=["src/api"],
                first_commit=datetime(2023, 1, 18),
                last_commit=datetime(2023, 1, 18),
                contribution_percentage=20.0
            )
        ]
    
    def tearDown(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    @patch('subprocess.run')
    def test_complete_git_analytics_workflow(self, mock_run):
        """Test the complete Git analytics workflow from analysis to visualization."""
        # Mock all subprocess calls for Git operations
        mock_responses = [
            MagicMock(returncode=0),  # _is_git_repository
            MagicMock(returncode=0, stdout="/path/to/test-project\n"),  # repo name
            MagicMock(returncode=0, stdout="main\n"),  # branch
            MagicMock(returncode=0, stdout="5\n"),  # commit count
            MagicMock(returncode=0, stdout="2023-01-15 10:00:00 +0000\n"),  # first commit
            MagicMock(returncode=0, stdout="2023-01-19 15:30:00 +0000\n"),  # last commit
            MagicMock(returncode=0, stdout="     3\tJohn Doe\n     2\tJane Smith\n     1\tAlice Johnson\n"),  # contributors
            MagicMock(returncode=0, stdout=self._create_mock_git_log_output())  # git log output
        ]
        
        mock_run.side_effect = mock_responses
        
        # Step 1: Initialize Git analyzer
        git_analyzer = GitAnalyzer(self.repo_path)
        
        # Step 2: Perform Git analysis
        git_result = git_analyzer.analyze_repository()
        
        # Verify Git analysis results
        self.assertTrue(git_result.success)
        self.assertEqual(git_result.repository_info.name, "test-project")
        self.assertEqual(git_result.repository_info.total_commits, 5)
        self.assertEqual(len(git_result.author_contributions), 3)
        self.assertEqual(len(git_result.commits), 5)
        
        # Step 3: Initialize module commit analyzer
        module_analyzer = ModuleCommitAnalyzer(git_analyzer)
        
        # Step 4: Analyze module-wise statistics
        module_stats = module_analyzer.analyze_module_commits()
        
        # Verify module statistics
        self.assertIn("src", module_stats)
        self.assertIn("src/auth", module_stats)
        self.assertIn("src/api", module_stats)
        
        # Check src module stats
        src_stats = module_stats["src"]
        self.assertEqual(src_stats.total_commits, 2)  # John's commits
        self.assertEqual(src_stats.unique_authors, 1)
        
        # Check auth module stats
        auth_stats = module_stats["src/auth"]
        self.assertEqual(auth_stats.total_commits, 2)  # Jane's commits
        self.assertEqual(auth_stats.unique_authors, 1)
        
        # Step 5: Calculate proportional contributions
        proportional_contribs = module_analyzer.calculate_proportional_contributions()
        
        # Verify proportional contributions
        self.assertGreater(len(proportional_contribs), 0)
        
        # Find John's contribution to src module
        john_src_contrib = next(
            (c for c in proportional_contribs 
             if c.author_name == "John Doe" and c.module_path == "src"),
            None
        )
        self.assertIsNotNone(john_src_contrib)
        self.assertGreater(john_src_contrib.module_contribution_percentage, 0)
        
        # Step 6: Initialize analytics visualizer
        visualizer = GitAnalyticsVisualizer(git_analyzer)
        
        # Step 7: Generate contribution graphs
        contribution_graphs = visualizer.generate_contribution_graph_data()
        
        # Verify contribution graphs
        self.assertGreater(len(contribution_graphs), 0)
        
        graph_types = [graph.type for graph in contribution_graphs]
        self.assertIn("author_comparison", graph_types)
        self.assertIn("commit_timeline", graph_types)
        self.assertIn("lines_comparison", graph_types)
        
        # Step 8: Create timeline visualization
        timeline_data = visualizer.create_timeline_visualization_data("daily")
        
        # Verify timeline data
        self.assertEqual(timeline_data.granularity, "daily")
        self.assertGreater(len(timeline_data.timeline_entries), 0)
        self.assertIn("total_commits", timeline_data.summary_stats)
        self.assertIn("total_authors", timeline_data.summary_stats)
        
        # Step 9: Export analytics data
        export_data = visualizer.export_git_analytics("json")
        
        # Verify export data
        self.assertIsNotNone(export_data)
        self.assertIn("name", export_data.repository_info)
        self.assertGreater(len(export_data.contribution_graphs), 0)
        self.assertGreater(len(export_data.author_statistics), 0)
        
        # Step 10: Save export to file
        output_path = Path(self.temp_dir) / "analytics_export.json"
        success = visualizer.save_export_to_file(export_data, output_path, "json")
        
        # Verify file export
        self.assertTrue(success)
        self.assertTrue(output_path.exists())
        
        # Verify exported JSON content
        with open(output_path, 'r') as f:
            exported_data = json.load(f)
            self.assertEqual(exported_data["repository_info"]["name"], "test-project")
            self.assertGreater(len(exported_data["author_statistics"]), 0)
            self.assertGreater(len(exported_data["contribution_graphs"]), 0)
    
    def test_filtered_analytics_workflow(self):
        """Test analytics workflow with filtering options."""
        # Create mock Git analyzer
        mock_git_analyzer = MagicMock(spec=GitAnalyzer)
        mock_git_analyzer.repo_path = self.repo_path
        
        # Mock analysis result
        mock_result = GitAnalysisResult(
            repository_info=RepositoryInfo(
                name="test-project",
                branch="main",
                total_commits=5,
                date_range=DateRange(datetime(2023, 1, 15), datetime(2023, 1, 19)),
                contributors=3
            ),
            author_contributions=self.sample_authors,
            commit_timeline=[],
            commits=self.sample_commits,
            success=True,
            errors=[]
        )
        
        mock_git_analyzer.analyze_repository.return_value = mock_result
        
        # Initialize visualizer
        visualizer = GitAnalyticsVisualizer(mock_git_analyzer)
        
        # Create filter options
        filter_options = FilterOptions(
            date_range=DateRange(datetime(2023, 1, 16), datetime(2023, 1, 18)),
            authors=["Jane Smith", "Alice Johnson"],
            modules=["src/auth", "src/api"]
        )
        
        # Generate filtered contribution graphs
        filtered_graphs = visualizer.generate_contribution_graph_data(filter_options)
        
        # Verify filtered results
        self.assertGreater(len(filtered_graphs), 0)
        
        # Check that author comparison graph respects author filter
        author_graph = next(
            (g for g in filtered_graphs if g.type == "author_comparison"),
            None
        )
        
        if author_graph:
            # Should only include filtered authors
            self.assertIn("Jane Smith", author_graph.labels)
            self.assertIn("Alice Johnson", author_graph.labels)
            self.assertNotIn("John Doe", author_graph.labels)
    
    def test_export_formats(self):
        """Test different export formats."""
        # Create mock Git analyzer
        mock_git_analyzer = MagicMock(spec=GitAnalyzer)
        mock_git_analyzer.repo_path = self.repo_path
        
        # Mock analysis result
        mock_result = GitAnalysisResult(
            repository_info=RepositoryInfo(
                name="test-project",
                branch="main",
                total_commits=5,
                date_range=DateRange(datetime(2023, 1, 15), datetime(2023, 1, 19)),
                contributors=3
            ),
            author_contributions=self.sample_authors,
            commit_timeline=[],
            commits=self.sample_commits,
            success=True,
            errors=[]
        )
        
        mock_git_analyzer.analyze_repository.return_value = mock_result
        
        # Initialize visualizer
        visualizer = GitAnalyticsVisualizer(mock_git_analyzer)
        
        # Mock module analyzer
        with patch.object(visualizer.module_analyzer, 'analyze_module_commits') as mock_module_analysis:
            mock_module_analysis.return_value = {}
            
            # Test JSON export
            json_export = visualizer.export_git_analytics("json")
            json_path = Path(self.temp_dir) / "export.json"
            json_success = visualizer.save_export_to_file(json_export, json_path, "json")
            
            self.assertTrue(json_success)
            self.assertTrue(json_path.exists())
            
            # Test CSV export
            csv_path = Path(self.temp_dir) / "export.csv"
            csv_success = visualizer.save_export_to_file(json_export, csv_path, "csv")
            
            self.assertTrue(csv_success)
            self.assertTrue(csv_path.exists())
            
            # Test HTML export
            html_path = Path(self.temp_dir) / "export.html"
            html_success = visualizer.save_export_to_file(json_export, html_path, "html")
            
            self.assertTrue(html_success)
            self.assertTrue(html_path.exists())
    
    def _create_mock_git_log_output(self) -> str:
        """Create mock Git log output for testing."""
        return """abc123|John Doe|john@example.com|2023-01-15 10:00:00 +0000|Initial project setup
150	0	src/main.py
50	0	src/utils.py
10	0	requirements.txt

def456|Jane Smith|jane@example.com|2023-01-16 14:30:00 +0000|Add authentication module
100	0	src/auth/models.py
80	5	src/auth/views.py
20	0	src/auth/__init__.py

ghi789|John Doe|john@example.com|2023-01-17 09:15:00 +0000|Refactor main module
30	20	src/main.py
20	10	src/utils.py

jkl012|Alice Johnson|alice@example.com|2023-01-18 16:45:00 +0000|Add API endpoints
120	5	src/api/endpoints.py
60	5	src/api/serializers.py

mno345|Jane Smith|jane@example.com|2023-01-19 11:20:00 +0000|Improve authentication security
50	15	src/auth/models.py
25	10	src/auth/utils.py
"""


if __name__ == '__main__':
    unittest.main()