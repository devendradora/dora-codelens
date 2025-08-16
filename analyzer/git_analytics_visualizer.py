#!/usr/bin/env python3
"""
Git Analytics Data Visualization for DoraCodeBirdView

This module provides data visualization capabilities for Git analytics,
including contribution graph data generation, timeline structures, and export functionality.
"""

import logging
import json
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, Any, Union
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from collections import defaultdict

from git_analyzer import GitAnalyzer, GitAnalysisResult, DateRange, AuthorContribution, CommitTimelineEntry
from module_commit_analyzer import ModuleCommitAnalyzer, ModuleGitStats, ProportionalContribution

# Configure logging
logger = logging.getLogger(__name__)


@dataclass
class ChartDataset:
    """Represents a dataset for chart visualization."""
    label: str
    data: List[Union[int, float]]
    background_color: str
    border_color: str
    border_width: int = 2
    fill: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "label": self.label,
            "data": self.data,
            "backgroundColor": self.background_color,
            "borderColor": self.border_color,
            "borderWidth": self.border_width,
            "fill": self.fill
        }


@dataclass
class ContributionGraphData:
    """Represents contribution graph data for charts."""
    type: str  # 'commits', 'lines_added', 'lines_removed', 'author_comparison'
    labels: List[str]
    datasets: List[ChartDataset]
    title: str
    x_axis_label: str
    y_axis_label: str
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "type": self.type,
            "title": self.title,
            "data": {
                "labels": self.labels,
                "datasets": [dataset.to_dict() for dataset in self.datasets]
            },
            "options": {
                "responsive": True,
                "plugins": {
                    "title": {
                        "display": True,
                        "text": self.title
                    },
                    "legend": {
                        "display": True,
                        "position": "top"
                    }
                },
                "scales": {
                    "x": {
                        "display": True,
                        "title": {
                            "display": True,
                            "text": self.x_axis_label
                        }
                    },
                    "y": {
                        "display": True,
                        "title": {
                            "display": True,
                            "text": self.y_axis_label
                        }
                    }
                }
            }
        }


@dataclass
class TimelineVisualizationData:
    """Represents timeline visualization data."""
    timeline_entries: List[Dict[str, Any]]
    summary_stats: Dict[str, Any]
    date_range: DateRange
    granularity: str  # 'daily', 'weekly', 'monthly'
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "timeline_entries": self.timeline_entries,
            "summary_stats": self.summary_stats,
            "date_range": {
                "start": self.date_range.start.isoformat(),
                "end": self.date_range.end.isoformat()
            },
            "granularity": self.granularity
        }


@dataclass
class FilterOptions:
    """Represents filtering options for Git analytics."""
    date_range: Optional[DateRange] = None
    authors: Optional[List[str]] = None
    modules: Optional[List[str]] = None
    file_extensions: Optional[List[str]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "date_range": {
                "start": self.date_range.start.isoformat(),
                "end": self.date_range.end.isoformat()
            } if self.date_range else None,
            "authors": self.authors,
            "modules": self.modules,
            "file_extensions": self.file_extensions
        }


@dataclass
class GitAnalyticsExport:
    """Represents exportable Git analytics data."""
    repository_info: Dict[str, Any]
    contribution_graphs: List[ContributionGraphData]
    timeline_data: TimelineVisualizationData
    module_statistics: Dict[str, Any]
    author_statistics: List[Dict[str, Any]]
    export_metadata: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "repository_info": self.repository_info,
            "contribution_graphs": [graph.to_dict() for graph in self.contribution_graphs],
            "timeline_data": self.timeline_data.to_dict(),
            "module_statistics": self.module_statistics,
            "author_statistics": self.author_statistics,
            "export_metadata": self.export_metadata
        }


class GitAnalyticsVisualizer:
    """Main class for Git analytics data visualization and export."""
    
    def __init__(self, git_analyzer: GitAnalyzer):
        """Initialize Git analytics visualizer.
        
        Args:
            git_analyzer: GitAnalyzer instance for the repository
        """
        self.git_analyzer = git_analyzer
        self.module_analyzer = ModuleCommitAnalyzer(git_analyzer)
        self.repo_path = git_analyzer.repo_path
        self.errors: List[str] = []
        
        # Color palettes for visualizations
        self.color_palette = [
            "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF",
            "#FF9F40", "#FF6384", "#C9CBCF", "#4BC0C0", "#FF6384"
        ]
        
        logger.info(f"Initialized GitAnalyticsVisualizer for repository: {self.repo_path}")
    
    def generate_contribution_graph_data(self, filter_options: Optional[FilterOptions] = None) -> List[ContributionGraphData]:
        """Generate contribution graph data for charts.
        
        Args:
            filter_options: Optional filtering options
            
        Returns:
            List of ContributionGraphData objects
        """
        logger.info("Generating contribution graph data...")
        
        try:
            # Get Git analysis result
            date_range = filter_options.date_range if filter_options else None
            git_result = self.git_analyzer.analyze_repository(date_range)
            
            if not git_result.success:
                self.errors.extend(git_result.errors)
                return []
            
            graphs = []
            
            # Generate author contribution comparison chart
            author_comparison_graph = self._generate_author_comparison_graph(git_result.author_contributions, filter_options)
            graphs.append(author_comparison_graph)
            
            # Generate commit timeline chart
            timeline_graph = self._generate_commit_timeline_graph(git_result.commit_timeline, filter_options)
            graphs.append(timeline_graph)
            
            # Generate lines of code chart
            lines_graph = self._generate_lines_of_code_graph(git_result.author_contributions, filter_options)
            graphs.append(lines_graph)
            
            # Generate module activity chart
            module_graph = self._generate_module_activity_graph(filter_options)
            if module_graph:
                graphs.append(module_graph)
            
            logger.info(f"Generated {len(graphs)} contribution graphs")
            return graphs
            
        except Exception as e:
            logger.error(f"Failed to generate contribution graph data: {e}")
            self.errors.append(f"Graph generation failed: {str(e)}")
            return []
    
    def _generate_author_comparison_graph(self, authors: List[AuthorContribution], filter_options: Optional[FilterOptions]) -> ContributionGraphData:
        """Generate author comparison graph data."""
        # Filter authors if specified
        if filter_options and filter_options.authors:
            authors = [a for a in authors if a.author_name in filter_options.authors]
        
        # Limit to top 10 authors for readability
        authors = authors[:10]
        
        labels = [author.author_name for author in authors]
        commit_data = [author.total_commits for author in authors]
        
        dataset = ChartDataset(
            label="Total Commits",
            data=commit_data,
            background_color=self.color_palette[0],
            border_color=self.color_palette[0],
            fill=True
        )
        
        return ContributionGraphData(
            type="author_comparison",
            labels=labels,
            datasets=[dataset],
            title="Author Contribution Comparison",
            x_axis_label="Authors",
            y_axis_label="Number of Commits"
        )
    
    def _generate_commit_timeline_graph(self, timeline: List[CommitTimelineEntry], filter_options: Optional[FilterOptions]) -> ContributionGraphData:
        """Generate commit timeline graph data."""
        if not timeline:
            return ContributionGraphData(
                type="commit_timeline",
                labels=[],
                datasets=[],
                title="Commit Timeline",
                x_axis_label="Date",
                y_axis_label="Commits"
            )
        
        # Sort timeline by date
        timeline.sort(key=lambda x: x.date)
        
        # Group by week for better visualization if we have many data points
        if len(timeline) > 50:
            timeline = self._aggregate_timeline_by_week(timeline)
        
        labels = [entry.date.strftime("%Y-%m-%d") for entry in timeline]
        commit_data = [entry.commit_count for entry in timeline]
        lines_added_data = [entry.lines_added for entry in timeline]
        lines_removed_data = [entry.lines_removed for entry in timeline]
        
        datasets = [
            ChartDataset(
                label="Commits",
                data=commit_data,
                background_color=self.color_palette[1],
                border_color=self.color_palette[1]
            ),
            ChartDataset(
                label="Lines Added",
                data=lines_added_data,
                background_color=self.color_palette[2],
                border_color=self.color_palette[2]
            ),
            ChartDataset(
                label="Lines Removed",
                data=lines_removed_data,
                background_color=self.color_palette[3],
                border_color=self.color_palette[3]
            )
        ]
        
        return ContributionGraphData(
            type="commit_timeline",
            labels=labels,
            datasets=datasets,
            title="Commit Activity Timeline",
            x_axis_label="Date",
            y_axis_label="Activity"
        )
    
    def _generate_lines_of_code_graph(self, authors: List[AuthorContribution], filter_options: Optional[FilterOptions]) -> ContributionGraphData:
        """Generate lines of code comparison graph."""
        # Filter authors if specified
        if filter_options and filter_options.authors:
            authors = [a for a in authors if a.author_name in filter_options.authors]
        
        # Limit to top 10 authors
        authors = authors[:10]
        
        labels = [author.author_name for author in authors]
        lines_added_data = [author.lines_added for author in authors]
        lines_removed_data = [author.lines_removed for author in authors]
        
        datasets = [
            ChartDataset(
                label="Lines Added",
                data=lines_added_data,
                background_color=self.color_palette[4],
                border_color=self.color_palette[4]
            ),
            ChartDataset(
                label="Lines Removed",
                data=lines_removed_data,
                background_color=self.color_palette[5],
                border_color=self.color_palette[5]
            )
        ]
        
        return ContributionGraphData(
            type="lines_comparison",
            labels=labels,
            datasets=datasets,
            title="Lines of Code by Author",
            x_axis_label="Authors",
            y_axis_label="Lines of Code"
        )
    
    def _generate_module_activity_graph(self, filter_options: Optional[FilterOptions]) -> Optional[ContributionGraphData]:
        """Generate module activity graph data."""
        try:
            date_range = filter_options.date_range if filter_options else None
            module_stats = self.module_analyzer.analyze_module_commits(date_range)
            
            if not module_stats:
                return None
            
            # Filter modules if specified
            if filter_options and filter_options.modules:
                module_stats = {k: v for k, v in module_stats.items() if k in filter_options.modules}
            
            # Sort by total commits and limit to top 15 modules
            sorted_modules = sorted(module_stats.items(), key=lambda x: x[1].total_commits, reverse=True)[:15]
            
            labels = [module_path for module_path, _ in sorted_modules]
            commit_data = [stats.total_commits for _, stats in sorted_modules]
            author_data = [stats.unique_authors for _, stats in sorted_modules]
            
            datasets = [
                ChartDataset(
                    label="Total Commits",
                    data=commit_data,
                    background_color=self.color_palette[6],
                    border_color=self.color_palette[6]
                ),
                ChartDataset(
                    label="Unique Authors",
                    data=author_data,
                    background_color=self.color_palette[7],
                    border_color=self.color_palette[7]
                )
            ]
            
            return ContributionGraphData(
                type="module_activity",
                labels=labels,
                datasets=datasets,
                title="Module Activity Overview",
                x_axis_label="Modules",
                y_axis_label="Activity"
            )
            
        except Exception as e:
            logger.error(f"Failed to generate module activity graph: {e}")
            return None
    
    def _aggregate_timeline_by_week(self, timeline: List[CommitTimelineEntry]) -> List[CommitTimelineEntry]:
        """Aggregate timeline entries by week for better visualization."""
        weekly_data = defaultdict(lambda: {
            'commit_count': 0,
            'lines_added': 0,
            'lines_removed': 0,
            'authors': set(),
            'week_start': None
        })
        
        for entry in timeline:
            # Get the start of the week (Monday)
            week_start = entry.date - timedelta(days=entry.date.weekday())
            week_key = week_start.strftime("%Y-W%U")
            
            week_data = weekly_data[week_key]
            week_data['commit_count'] += entry.commit_count
            week_data['lines_added'] += entry.lines_added
            week_data['lines_removed'] += entry.lines_removed
            week_data['authors'].update(entry.authors)
            week_data['week_start'] = week_start
        
        # Convert back to CommitTimelineEntry objects
        aggregated_timeline = []
        for week_key, data in weekly_data.items():
            entry = CommitTimelineEntry(
                date=data['week_start'],
                commit_count=data['commit_count'],
                lines_added=data['lines_added'],
                lines_removed=data['lines_removed'],
                authors=data['authors']
            )
            aggregated_timeline.append(entry)
        
        return sorted(aggregated_timeline, key=lambda x: x.date)
    
    def create_timeline_visualization_data(self, granularity: str = "daily", filter_options: Optional[FilterOptions] = None) -> TimelineVisualizationData:
        """Create timeline visualization data structures.
        
        Args:
            granularity: Timeline granularity ('daily', 'weekly', 'monthly')
            filter_options: Optional filtering options
            
        Returns:
            TimelineVisualizationData object
        """
        logger.info(f"Creating timeline visualization data with {granularity} granularity...")
        
        try:
            date_range = filter_options.date_range if filter_options else None
            git_result = self.git_analyzer.analyze_repository(date_range)
            
            if not git_result.success:
                self.errors.extend(git_result.errors)
                return TimelineVisualizationData(
                    timeline_entries=[],
                    summary_stats={},
                    date_range=DateRange(datetime.now(), datetime.now()),
                    granularity=granularity
                )
            
            # Process timeline based on granularity
            timeline = git_result.commit_timeline
            if granularity == "weekly":
                timeline = self._aggregate_timeline_by_week(timeline)
            elif granularity == "monthly":
                timeline = self._aggregate_timeline_by_month(timeline)
            
            # Convert to visualization format
            timeline_entries = []
            for entry in timeline:
                timeline_entries.append({
                    "date": entry.date.isoformat(),
                    "commit_count": entry.commit_count,
                    "lines_added": entry.lines_added,
                    "lines_removed": entry.lines_removed,
                    "net_lines": entry.lines_added - entry.lines_removed,
                    "authors": list(entry.authors),
                    "author_count": len(entry.authors)
                })
            
            # Calculate summary statistics
            total_commits = sum(entry.commit_count for entry in timeline)
            total_lines_added = sum(entry.lines_added for entry in timeline)
            total_lines_removed = sum(entry.lines_removed for entry in timeline)
            all_authors = set()
            for entry in timeline:
                all_authors.update(entry.authors)
            
            summary_stats = {
                "total_commits": total_commits,
                "total_lines_added": total_lines_added,
                "total_lines_removed": total_lines_removed,
                "net_lines": total_lines_added - total_lines_removed,
                "total_authors": len(all_authors),
                "average_commits_per_period": total_commits / len(timeline) if timeline else 0,
                "most_active_period": self._find_most_active_period(timeline),
                "activity_span": len(timeline)
            }
            
            return TimelineVisualizationData(
                timeline_entries=timeline_entries,
                summary_stats=summary_stats,
                date_range=git_result.repository_info.date_range,
                granularity=granularity
            )
            
        except Exception as e:
            logger.error(f"Failed to create timeline visualization data: {e}")
            self.errors.append(f"Timeline visualization failed: {str(e)}")
            return TimelineVisualizationData(
                timeline_entries=[],
                summary_stats={},
                date_range=DateRange(datetime.now(), datetime.now()),
                granularity=granularity
            )
    
    def _aggregate_timeline_by_month(self, timeline: List[CommitTimelineEntry]) -> List[CommitTimelineEntry]:
        """Aggregate timeline entries by month."""
        monthly_data = defaultdict(lambda: {
            'commit_count': 0,
            'lines_added': 0,
            'lines_removed': 0,
            'authors': set(),
            'month_start': None
        })
        
        for entry in timeline:
            # Get the start of the month
            month_start = entry.date.replace(day=1)
            month_key = month_start.strftime("%Y-%m")
            
            month_data = monthly_data[month_key]
            month_data['commit_count'] += entry.commit_count
            month_data['lines_added'] += entry.lines_added
            month_data['lines_removed'] += entry.lines_removed
            month_data['authors'].update(entry.authors)
            month_data['month_start'] = month_start
        
        # Convert back to CommitTimelineEntry objects
        aggregated_timeline = []
        for month_key, data in monthly_data.items():
            entry = CommitTimelineEntry(
                date=data['month_start'],
                commit_count=data['commit_count'],
                lines_added=data['lines_added'],
                lines_removed=data['lines_removed'],
                authors=data['authors']
            )
            aggregated_timeline.append(entry)
        
        return sorted(aggregated_timeline, key=lambda x: x.date)
    
    def _find_most_active_period(self, timeline: List[CommitTimelineEntry]) -> str:
        """Find the most active period in the timeline."""
        if not timeline:
            return "N/A"
        
        most_active = max(timeline, key=lambda x: x.commit_count)
        return most_active.date.strftime("%Y-%m-%d")
    
    def add_filtering_capabilities(self, base_data: Any, filter_options: FilterOptions) -> Any:
        """Add filtering capabilities to analysis data.
        
        Args:
            base_data: Base analysis data to filter
            filter_options: Filtering options to apply
            
        Returns:
            Filtered data
        """
        # This is a placeholder for filtering logic
        # In a real implementation, this would apply various filters
        # to the data based on the filter options
        
        logger.info(f"Applying filters: {filter_options.to_dict()}")
        
        # For now, return the base data unchanged
        # Real implementation would filter based on:
        # - Date range
        # - Authors
        # - Modules
        # - File extensions
        
        return base_data
    
    def export_git_analytics(self, format: str = "json", filter_options: Optional[FilterOptions] = None) -> GitAnalyticsExport:
        """Export Git analytics data in specified format.
        
        Args:
            format: Export format ('json', 'csv', 'html')
            filter_options: Optional filtering options
            
        Returns:
            GitAnalyticsExport object containing all export data
        """
        logger.info(f"Exporting Git analytics in {format} format...")
        
        try:
            # Generate all visualization data
            contribution_graphs = self.generate_contribution_graph_data(filter_options)
            timeline_data = self.create_timeline_visualization_data("daily", filter_options)
            
            # Get repository information
            date_range = filter_options.date_range if filter_options else None
            git_result = self.git_analyzer.analyze_repository(date_range)
            
            if not git_result.success:
                self.errors.extend(git_result.errors)
            
            # Get module statistics
            module_stats = self.module_analyzer.analyze_module_commits(date_range)
            module_statistics = {
                module_path: stats.to_dict() 
                for module_path, stats in module_stats.items()
            }
            
            # Prepare author statistics
            author_statistics = [author.to_dict() for author in git_result.author_contributions]
            
            # Create export metadata
            export_metadata = {
                "export_timestamp": datetime.now().isoformat(),
                "export_format": format,
                "repository_path": str(self.repo_path),
                "filter_options": filter_options.to_dict() if filter_options else None,
                "total_graphs": len(contribution_graphs),
                "total_modules": len(module_statistics),
                "total_authors": len(author_statistics),
                "errors": self.errors.copy()
            }
            
            export_data = GitAnalyticsExport(
                repository_info=git_result.repository_info.to_dict(),
                contribution_graphs=contribution_graphs,
                timeline_data=timeline_data,
                module_statistics=module_statistics,
                author_statistics=author_statistics,
                export_metadata=export_metadata
            )
            
            logger.info(f"Git analytics export completed successfully")
            return export_data
            
        except Exception as e:
            logger.error(f"Git analytics export failed: {e}")
            self.errors.append(f"Export failed: {str(e)}")
            
            # Return empty export data on failure
            return GitAnalyticsExport(
                repository_info={},
                contribution_graphs=[],
                timeline_data=TimelineVisualizationData(
                    timeline_entries=[],
                    summary_stats={},
                    date_range=DateRange(datetime.now(), datetime.now()),
                    granularity="daily"
                ),
                module_statistics={},
                author_statistics=[],
                export_metadata={
                    "export_timestamp": datetime.now().isoformat(),
                    "export_format": format,
                    "errors": self.errors.copy(),
                    "success": False
                }
            )
    
    def save_export_to_file(self, export_data: GitAnalyticsExport, output_path: Path, format: str = "json") -> bool:
        """Save export data to file.
        
        Args:
            export_data: GitAnalyticsExport data to save
            output_path: Path to save the file
            format: Export format ('json', 'csv', 'html')
            
        Returns:
            True if successful, False otherwise
        """
        try:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            if format.lower() == "json":
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(export_data.to_dict(), f, indent=2, ensure_ascii=False)
            
            elif format.lower() == "csv":
                # For CSV, we'd export specific data tables
                # This is a simplified implementation
                import csv
                with open(output_path, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.writer(f)
                    writer.writerow(["Author", "Commits", "Lines Added", "Lines Removed"])
                    for author in export_data.author_statistics:
                        writer.writerow([
                            author["author_name"],
                            author["total_commits"],
                            author["lines_added"],
                            author["lines_removed"]
                        ])
            
            elif format.lower() == "html":
                # For HTML, we'd create a formatted report
                # This is a simplified implementation
                html_content = self._generate_html_report(export_data)
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(html_content)
            
            logger.info(f"Export saved to {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save export to file: {e}")
            self.errors.append(f"File save failed: {str(e)}")
            return False
    
    def _generate_html_report(self, export_data: GitAnalyticsExport) -> str:
        """Generate HTML report from export data."""
        html_template = """<!DOCTYPE html>
<html>
<head>
    <title>Git Analytics Report</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .header {{ background-color: #f0f0f0; padding: 20px; border-radius: 5px; }}
        .section {{ margin: 20px 0; }}
        table {{ border-collapse: collapse; width: 100%; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #f2f2f2; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Git Analytics Report</h1>
        <p>Repository: {repo_name}</p>
        <p>Generated: {timestamp}</p>
    </div>
    
    <div class="section">
        <h2>Author Statistics</h2>
        <table>
            <tr><th>Author</th><th>Commits</th><th>Lines Added</th><th>Lines Removed</th></tr>
            {author_rows}
        </table>
    </div>
    
    <div class="section">
        <h2>Module Statistics</h2>
        <p>Total modules analyzed: {module_count}</p>
    </div>
</body>
</html>"""
        
        # Generate author rows
        author_rows = ""
        for author in export_data.author_statistics[:10]:  # Top 10 authors
            author_rows += f"""<tr>
                <td>{author['author_name']}</td>
                <td>{author['total_commits']}</td>
                <td>{author['lines_added']}</td>
                <td>{author['lines_removed']}</td>
            </tr>"""
        
        return html_template.format(
            repo_name=export_data.repository_info.get('name', 'Unknown'),
            timestamp=export_data.export_metadata['export_timestamp'],
            author_rows=author_rows,
            module_count=len(export_data.module_statistics)
        )