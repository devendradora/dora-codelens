#!/usr/bin/env python3
"""
Tests for Git Analytics Visualizer

This module contains unit tests for the GitAnalyticsVisualizer class and related functionality.
"""

import unittest
import tempfile
import json
from pathlib import Path
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from git_analyzer import (
    GitAnalyzer, GitAnalysisResult, RepositoryInfo, DateRange,
    AuthorContribution, CommitTimelineEntry, CommitInfo
)
from module_commit_analyzer import ModuleCommitAnalyzer, ModuleGitStats
from git_analytics_visualizer import (
    GitAnalyticsVisualizer, ContributionGraphData, ChartDataset,
    TimelineVisualizationData, FilterOptions, GitAnalyticsExport
)


class TestGitAnalyticsVisualizer(unittest.TestCase):
    """Test cases for GitAnalyticsVisualizer class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.repo_path = Path(self.temp_dir)
        
        # Create mock GitAnalyzer
        self.mock_git_analyzer = MagicMock(spec=GitAnalyzer)
        self.mock_git_analyzer.repo_path = self.repo_path
        
        # Create sample data
        self.sample_authors = [
            AuthorContribution(
                author_name="John Doe",
                author_email="john@example.com",
                total_commits=10,
                lines_added=500,
                lines_removed=50,
                modules_touched=["module1", "module2"],
                first_commit=datetime(2023, 1, 1),
                last_commit=datetime(2023, 1, 15),
                contribution_percentage=60.0
            ),
            AuthorContribution(
                author_name="Jane Smith",
                author_email="jane@example.com",
                total_commits=7,
                lines_added=300,
                lines_removed=30,
                modules_touched=["module2", "module3"],
                first_commit=datetime(2023, 1, 5),
                last_commit=datetime(2023, 1, 20),
                contribution_percentage=40.0
            )
        ]
        
        self.sample_timeline = [
            CommitTimelineEntry(
                date=datetime(2023, 1, 15),
                commit_count=3,
                lines_added=100,
                lines_removed=10,
                authors={"John Doe", "Jane Smith"}
            ),
            CommitTimelineEntry(
                date=datetime(2023, 1, 16),
                commit_count=2,
                lines_added=50,
                lines_removed=5,
                authors={"John Doe"}
            )
        ]
        
        self.sample_git_result = GitAnalysisResult(
            repository_info=RepositoryInfo(
                name="test-repo",
                branch="main",
                total_commits=17,
                date_range=DateRange(datetime(2023, 1, 1), datetime(2023, 1, 20)),
                contributors=2
            ),
            author_contributions=self.sample_authors,
            commit_timeline=self.sample_timeline,
            commits=[],
            success=True,
            errors=[]
        )
        
        self.visualizer = GitAnalyticsVisualizer(self.mock_git_analyzer)
    
    def tearDown(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_init(self):
        """Test GitAnalyticsVisualizer initialization."""
        self.assertEqual(self.visualizer.git_analyzer, self.mock_git_analyzer)
        self.assertEqual(self.visualizer.repo_path, self.repo_path)
        self.assertEqual(self.visualizer.errors, [])
        self.assertIsInstance(self.visualizer.module_analyzer, ModuleCommitAnalyzer)
        self.assertEqual(len(self.visualizer.color_palette), 10)
    
    def test_chart_dataset_serialization(self):
        """Test ChartDataset serialization."""
        dataset = ChartDataset(
            label="Test Dataset",
            data=[1, 2, 3, 4, 5],
            background_color="#FF6384",
            border_color="#FF6384",
            border_width=2,
            fill=True
        )
        
        dataset_dict = dataset.to_dict()
        
        self.assertEqual(dataset_dict["label"], "Test Dataset")
        self.assertEqual(dataset_dict["data"], [1, 2, 3, 4, 5])
        self.assertEqual(dataset_dict["backgroundColor"], "#FF6384")
        self.assertEqual(dataset_dict["borderColor"], "#FF6384")
        self.assertEqual(dataset_dict["borderWidth"], 2)
        self.assertTrue(dataset_dict["fill"])
    
    def test_contribution_graph_data_serialization(self):
        """Test ContributionGraphData serialization."""
        dataset = ChartDataset(
            label="Commits",
            data=[10, 7],
            background_color="#FF6384",
            border_color="#FF6384"
        )
        
        graph_data = ContributionGraphData(
            type="author_comparison",
            labels=["John Doe", "Jane Smith"],
            datasets=[dataset],
            title="Author Comparison",
            x_axis_label="Authors",
            y_axis_label="Commits"
        )
        
        graph_dict = graph_data.to_dict()
        
        self.assertEqual(graph_dict["type"], "author_comparison")
        self.assertEqual(graph_dict["title"], "Author Comparison")
        self.assertEqual(graph_dict["data"]["labels"], ["John Doe", "Jane Smith"])
        self.assertEqual(len(graph_dict["data"]["datasets"]), 1)
        self.assertIn("options", graph_dict)
        self.assertIn("scales", graph_dict["options"])
    
    def test_generate_author_comparison_graph(self):
        """Test author comparison graph generation."""
        graph = self.visualizer._generate_author_comparison_graph(self.sample_authors, None)
        
        self.assertEqual(graph.type, "author_comparison")
        self.assertEqual(graph.title, "Author Contribution Comparison")
        self.assertEqual(graph.labels, ["John Doe", "Jane Smith"])
        self.assertEqual(len(graph.datasets), 1)
        self.assertEqual(graph.datasets[0].data, [10, 7])  # Commit counts
    
    def test_generate_commit_timeline_graph(self):
        """Test commit timeline graph generation."""
        graph = self.visualizer._generate_commit_timeline_graph(self.sample_timeline, None)
        
        self.assertEqual(graph.type, "commit_timeline")
        self.assertEqual(graph.title, "Commit Activity Timeline")
        self.assertEqual(len(graph.labels), 2)
        self.assertEqual(len(graph.datasets), 3)  # Commits, lines added, lines removed
        
        # Check dataset labels
        dataset_labels = [ds.label for ds in graph.datasets]
        self.assertIn("Commits", dataset_labels)
        self.assertIn("Lines Added", dataset_labels)
        self.assertIn("Lines Removed", dataset_labels)
    
    def test_generate_lines_of_code_graph(self):
        """Test lines of code graph generation."""
        graph = self.visualizer._generate_lines_of_code_graph(self.sample_authors, None)
        
        self.assertEqual(graph.type, "lines_comparison")
        self.assertEqual(graph.title, "Lines of Code by Author")
        self.assertEqual(graph.labels, ["John Doe", "Jane Smith"])
        self.assertEqual(len(graph.datasets), 2)  # Lines added and removed
        
        # Check data values
        lines_added_dataset = next(ds for ds in graph.datasets if ds.label == "Lines Added")
        lines_removed_dataset = next(ds for ds in graph.datasets if ds.label == "Lines Removed")
        
        self.assertEqual(lines_added_dataset.data, [500, 300])
        self.assertEqual(lines_removed_dataset.data, [50, 30])
    
    def test_aggregate_timeline_by_week(self):
        """Test timeline aggregation by week."""
        # Create timeline with multiple days in the same week
        timeline = [
            CommitTimelineEntry(
                date=datetime(2023, 1, 16),  # Monday
                commit_count=2,
                lines_added=50,
                lines_removed=5,
                authors={"John Doe"}
            ),
            CommitTimelineEntry(
                date=datetime(2023, 1, 17),  # Tuesday
                commit_count=3,
                lines_added=75,
                lines_removed=10,
                authors={"Jane Smith"}
            ),
            CommitTimelineEntry(
                date=datetime(2023, 1, 18),  # Wednesday
                commit_count=1,
                lines_added=25,
                lines_removed=2,
                authors={"John Doe"}
            )
        ]
        
        weekly_timeline = self.visualizer._aggregate_timeline_by_week(timeline)
        
        # Should aggregate into one week
        self.assertEqual(len(weekly_timeline), 1)
        
        week_entry = weekly_timeline[0]
        self.assertEqual(week_entry.commit_count, 6)  # 2 + 3 + 1
        self.assertEqual(week_entry.lines_added, 150)  # 50 + 75 + 25
        self.assertEqual(week_entry.lines_removed, 17)  # 5 + 10 + 2
        self.assertEqual(len(week_entry.authors), 2)  # John Doe and Jane Smith
    
    def test_aggregate_timeline_by_month(self):
        """Test timeline aggregation by month."""
        # Create timeline with multiple days in the same month
        timeline = [
            CommitTimelineEntry(
                date=datetime(2023, 1, 15),
                commit_count=3,
                lines_added=100,
                lines_removed=10,
                authors={"John Doe"}
            ),
            CommitTimelineEntry(
                date=datetime(2023, 1, 20),
                commit_count=2,
                lines_added=50,
                lines_removed=5,
                authors={"Jane Smith"}
            ),
            CommitTimelineEntry(
                date=datetime(2023, 2, 5),
                commit_count=1,
                lines_added=25,
                lines_removed=2,
                authors={"John Doe"}
            )
        ]
        
        monthly_timeline = self.visualizer._aggregate_timeline_by_month(timeline)
        
        # Should aggregate into two months
        self.assertEqual(len(monthly_timeline), 2)
        
        # Check January aggregation
        jan_entry = monthly_timeline[0]
        self.assertEqual(jan_entry.date.month, 1)
        self.assertEqual(jan_entry.commit_count, 5)  # 3 + 2
        self.assertEqual(jan_entry.lines_added, 150)  # 100 + 50
        
        # Check February entry
        feb_entry = monthly_timeline[1]
        self.assertEqual(feb_entry.date.month, 2)
        self.assertEqual(feb_entry.commit_count, 1)
    
    def test_find_most_active_period(self):
        """Test finding the most active period."""
        most_active = self.visualizer._find_most_active_period(self.sample_timeline)
        
        # Should return the date with the highest commit count
        self.assertEqual(most_active, "2023-01-15")  # 3 commits vs 2 commits
    
    def test_find_most_active_period_empty(self):
        """Test finding most active period with empty timeline."""
        most_active = self.visualizer._find_most_active_period([])
        self.assertEqual(most_active, "N/A")
    
    def test_create_timeline_visualization_data(self):
        """Test timeline visualization data creation."""
        self.mock_git_analyzer.analyze_repository.return_value = self.sample_git_result
        
        timeline_data = self.visualizer.create_timeline_visualization_data("daily")
        
        self.assertEqual(timeline_data.granularity, "daily")
        self.assertEqual(len(timeline_data.timeline_entries), 2)
        
        # Check summary stats
        self.assertEqual(timeline_data.summary_stats["total_commits"], 5)  # 3 + 2
        self.assertEqual(timeline_data.summary_stats["total_lines_added"], 150)  # 100 + 50
        self.assertEqual(timeline_data.summary_stats["total_authors"], 2)
        self.assertEqual(timeline_data.summary_stats["most_active_period"], "2023-01-15")
    
    def test_filter_options_serialization(self):
        """Test FilterOptions serialization."""
        date_range = DateRange(datetime(2023, 1, 1), datetime(2023, 1, 31))
        filter_options = FilterOptions(
            date_range=date_range,
            authors=["John Doe", "Jane Smith"],
            modules=["module1", "module2"],
            file_extensions=[".py", ".js"]
        )
        
        filter_dict = filter_options.to_dict()
        
        self.assertIn("2023-01-01", filter_dict["date_range"]["start"])
        self.assertIn("2023-01-31", filter_dict["date_range"]["end"])
        self.assertEqual(filter_dict["authors"], ["John Doe", "Jane Smith"])
        self.assertEqual(filter_dict["modules"], ["module1", "module2"])
        self.assertEqual(filter_dict["file_extensions"], [".py", ".js"])
    
    def test_generate_contribution_graph_data(self):
        """Test contribution graph data generation."""
        self.mock_git_analyzer.analyze_repository.return_value = self.sample_git_result
        
        # Mock module analyzer
        with patch.object(self.visualizer.module_analyzer, 'analyze_module_commits') as mock_module_analysis:
            mock_module_analysis.return_value = {
                "module1": ModuleGitStats(
                    module_path="module1",
                    total_commits=5,
                    unique_authors=2,
                    lines_added=200,
                    lines_removed=20,
                    author_breakdown=[],
                    commit_frequency={"2023-01": 5}
                )
            }
            
            graphs = self.visualizer.generate_contribution_graph_data()
            
            # Should generate multiple graphs
            self.assertGreater(len(graphs), 0)
            
            # Check that we have different types of graphs
            graph_types = [graph.type for graph in graphs]
            self.assertIn("author_comparison", graph_types)
            self.assertIn("commit_timeline", graph_types)
            self.assertIn("lines_comparison", graph_types)
    
    def test_export_git_analytics(self):
        """Test Git analytics export."""
        self.mock_git_analyzer.analyze_repository.return_value = self.sample_git_result
        
        # Mock module analyzer
        with patch.object(self.visualizer.module_analyzer, 'analyze_module_commits') as mock_module_analysis:
            mock_module_analysis.return_value = {}
            
            export_data = self.visualizer.export_git_analytics("json")
            
            # Check export structure
            self.assertIsInstance(export_data, GitAnalyticsExport)
            self.assertIn("name", export_data.repository_info)
            self.assertIsInstance(export_data.contribution_graphs, list)
            self.assertIsInstance(export_data.timeline_data, TimelineVisualizationData)
            self.assertIsInstance(export_data.module_statistics, dict)
            self.assertIsInstance(export_data.author_statistics, list)
            self.assertIn("export_timestamp", export_data.export_metadata)
    
    def test_save_export_to_file_json(self):
        """Test saving export data to JSON file."""
        # Create sample export data
        export_data = GitAnalyticsExport(
            repository_info={"name": "test-repo"},
            contribution_graphs=[],
            timeline_data=TimelineVisualizationData(
                timeline_entries=[],
                summary_stats={},
                date_range=DateRange(datetime.now(), datetime.now()),
                granularity="daily"
            ),
            module_statistics={},
            author_statistics=[{"author_name": "John Doe", "total_commits": 10, "lines_added": 100, "lines_removed": 10}],
            export_metadata={"export_timestamp": datetime.now().isoformat()}
        )
        
        output_path = Path(self.temp_dir) / "export.json"
        success = self.visualizer.save_export_to_file(export_data, output_path, "json")
        
        self.assertTrue(success)
        self.assertTrue(output_path.exists())
        
        # Verify JSON content
        with open(output_path, 'r') as f:
            data = json.load(f)
            self.assertEqual(data["repository_info"]["name"], "test-repo")
            self.assertEqual(len(data["author_statistics"]), 1)
    
    def test_save_export_to_file_csv(self):
        """Test saving export data to CSV file."""
        export_data = GitAnalyticsExport(
            repository_info={"name": "test-repo"},
            contribution_graphs=[],
            timeline_data=TimelineVisualizationData(
                timeline_entries=[],
                summary_stats={},
                date_range=DateRange(datetime.now(), datetime.now()),
                granularity="daily"
            ),
            module_statistics={},
            author_statistics=[
                {"author_name": "John Doe", "total_commits": 10, "lines_added": 100, "lines_removed": 10},
                {"author_name": "Jane Smith", "total_commits": 7, "lines_added": 70, "lines_removed": 7}
            ],
            export_metadata={"export_timestamp": datetime.now().isoformat()}
        )
        
        output_path = Path(self.temp_dir) / "export.csv"
        success = self.visualizer.save_export_to_file(export_data, output_path, "csv")
        
        self.assertTrue(success)
        self.assertTrue(output_path.exists())
        
        # Verify CSV content
        with open(output_path, 'r') as f:
            content = f.read()
            self.assertIn("Author,Commits,Lines Added,Lines Removed", content)
            self.assertIn("John Doe,10,100,10", content)
            self.assertIn("Jane Smith,7,70,7", content)
    
    def test_save_export_to_file_html(self):
        """Test saving export data to HTML file."""
        export_data = GitAnalyticsExport(
            repository_info={"name": "test-repo"},
            contribution_graphs=[],
            timeline_data=TimelineVisualizationData(
                timeline_entries=[],
                summary_stats={},
                date_range=DateRange(datetime.now(), datetime.now()),
                granularity="daily"
            ),
            module_statistics={"module1": {}},
            author_statistics=[{"author_name": "John Doe", "total_commits": 10, "lines_added": 100, "lines_removed": 10}],
            export_metadata={"export_timestamp": datetime.now().isoformat()}
        )
        
        output_path = Path(self.temp_dir) / "export.html"
        success = self.visualizer.save_export_to_file(export_data, output_path, "html")
        
        self.assertTrue(success)
        self.assertTrue(output_path.exists())
        
        # Verify HTML content
        with open(output_path, 'r') as f:
            content = f.read()
            self.assertIn("<title>Git Analytics Report</title>", content)
            self.assertIn("test-repo", content)
            self.assertIn("John Doe", content)
            self.assertIn("Total modules analyzed: 1", content)


if __name__ == '__main__':
    unittest.main()