#!/usr/bin/env python3
"""
Module Commit Analyzer for DoraCodeBirdView

This module provides module-wise Git statistics analysis, tracking commits
per module/folder and author contribution breakdown per module.
"""

import logging
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, Any
from dataclasses import dataclass
from collections import defaultdict
from datetime import datetime

from git_analyzer import GitAnalyzer, CommitInfo, AuthorContribution, DateRange

# Configure logging
logger = logging.getLogger(__name__)


@dataclass
class ModuleGitStats:
    """Represents Git statistics for a specific module/folder."""
    module_path: str
    total_commits: int
    unique_authors: int
    lines_added: int
    lines_removed: int
    author_breakdown: List[AuthorContribution]
    commit_frequency: Dict[str, int]  # month -> commit_count
    first_commit: Optional[datetime] = None
    last_commit: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "module_path": self.module_path,
            "total_commits": self.total_commits,
            "unique_authors": self.unique_authors,
            "lines_added": self.lines_added,
            "lines_removed": self.lines_removed,
            "net_lines": self.lines_added - self.lines_removed,
            "author_breakdown": [author.to_dict() for author in self.author_breakdown],
            "commit_frequency": self.commit_frequency,
            "first_commit": self.first_commit.isoformat() if self.first_commit else None,
            "last_commit": self.last_commit.isoformat() if self.last_commit else None,
            "activity_span_days": self._calculate_activity_span()
        }
    
    def _calculate_activity_span(self) -> Optional[int]:
        """Calculate the span of activity in days."""
        if self.first_commit and self.last_commit:
            return (self.last_commit - self.first_commit).days
        return None


@dataclass
class ModuleCommitFrequency:
    """Represents commit frequency analysis for a module."""
    module_path: str
    daily_commits: Dict[str, int]  # date -> commit_count
    weekly_commits: Dict[str, int]  # week -> commit_count
    monthly_commits: Dict[str, int]  # month -> commit_count
    peak_activity_period: str
    average_commits_per_week: float
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "module_path": self.module_path,
            "daily_commits": self.daily_commits,
            "weekly_commits": self.weekly_commits,
            "monthly_commits": self.monthly_commits,
            "peak_activity_period": self.peak_activity_period,
            "average_commits_per_week": self.average_commits_per_week
        }


@dataclass
class ProportionalContribution:
    """Represents proportional contribution calculations."""
    author_name: str
    author_email: str
    module_path: str
    commits_in_module: int
    total_commits_by_author: int
    lines_added_in_module: int
    lines_removed_in_module: int
    total_lines_by_author: int
    module_contribution_percentage: float  # % of author's work in this module
    author_dominance_percentage: float  # % of module's work by this author
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "author_name": self.author_name,
            "author_email": self.author_email,
            "module_path": self.module_path,
            "commits_in_module": self.commits_in_module,
            "total_commits_by_author": self.total_commits_by_author,
            "lines_added_in_module": self.lines_added_in_module,
            "lines_removed_in_module": self.lines_removed_in_module,
            "total_lines_by_author": self.total_lines_by_author,
            "module_contribution_percentage": self.module_contribution_percentage,
            "author_dominance_percentage": self.author_dominance_percentage
        }


class ModuleCommitAnalyzer:
    """Analyzer for module-wise Git statistics and author contributions."""
    
    def __init__(self, git_analyzer: GitAnalyzer):
        """Initialize module commit analyzer.
        
        Args:
            git_analyzer: GitAnalyzer instance for the repository
        """
        self.git_analyzer = git_analyzer
        self.repo_path = git_analyzer.repo_path
        self.errors: List[str] = []
        
        logger.info(f"Initialized ModuleCommitAnalyzer for repository: {self.repo_path}")
    
    def analyze_module_commits(self, date_range: Optional[DateRange] = None) -> Dict[str, ModuleGitStats]:
        """Analyze commits per module/folder.
        
        Args:
            date_range: Optional date range to filter commits
            
        Returns:
            Dictionary mapping module paths to ModuleGitStats
        """
        logger.info("Starting module-wise commit analysis...")
        
        try:
            # Get all commits from the Git analyzer
            git_result = self.git_analyzer.analyze_repository(date_range)
            
            if not git_result.success:
                self.errors.extend(git_result.errors)
                return {}
            
            commits = git_result.commits
            
            # Group commits by module
            module_commits = self._group_commits_by_module(commits)
            
            # Calculate statistics for each module
            module_stats = {}
            for module_path, module_commit_list in module_commits.items():
                stats = self._calculate_module_stats(module_path, module_commit_list)
                module_stats[module_path] = stats
            
            logger.info(f"Analyzed {len(module_stats)} modules with commit data")
            return module_stats
            
        except Exception as e:
            logger.error(f"Module commit analysis failed: {e}")
            self.errors.append(f"Module analysis failed: {str(e)}")
            return {}
    
    def _group_commits_by_module(self, commits: List[CommitInfo]) -> Dict[str, List[CommitInfo]]:
        """Group commits by module/folder based on file changes.
        
        Args:
            commits: List of commit information
            
        Returns:
            Dictionary mapping module paths to lists of commits
        """
        module_commits = defaultdict(list)
        
        for commit in commits:
            # Track which modules this commit touched
            modules_touched = set()
            
            for file_path in commit.files_changed:
                if file_path.endswith('.py'):
                    # Extract module path (directory structure)
                    path_obj = Path(file_path)
                    
                    # Get the directory path
                    if path_obj.parent != Path('.'):
                        module_path = str(path_obj.parent)
                        modules_touched.add(module_path)
                    else:
                        # File in root directory
                        modules_touched.add('.')
            
            # Add commit to all modules it touched
            for module_path in modules_touched:
                module_commits[module_path].append(commit)
        
        return dict(module_commits)
    
    def _calculate_module_stats(self, module_path: str, commits: List[CommitInfo]) -> ModuleGitStats:
        """Calculate statistics for a specific module.
        
        Args:
            module_path: Path to the module
            commits: List of commits that touched this module
            
        Returns:
            ModuleGitStats object
        """
        if not commits:
            return ModuleGitStats(
                module_path=module_path,
                total_commits=0,
                unique_authors=0,
                lines_added=0,
                lines_removed=0,
                author_breakdown=[],
                commit_frequency={}
            )
        
        # Calculate basic statistics
        total_commits = len(commits)
        
        # Track author contributions within this module
        author_stats = defaultdict(lambda: {
            'commits': 0,
            'lines_added': 0,
            'lines_removed': 0,
            'first_commit': None,
            'last_commit': None,
            'modules_touched': set()
        })
        
        total_lines_added = 0
        total_lines_removed = 0
        first_commit = None
        last_commit = None
        
        # Process each commit
        for commit in commits:
            # Calculate lines changed in this module only
            module_lines_added = 0
            module_lines_removed = 0
            
            for file_path in commit.files_changed:
                if file_path.endswith('.py') and self._file_belongs_to_module(file_path, module_path):
                    # For simplicity, distribute lines proportionally
                    # In a real implementation, we'd parse the diff for each file
                    module_files = [f for f in commit.files_changed if f.endswith('.py') and self._file_belongs_to_module(f, module_path)]
                    if module_files:
                        proportion = len(module_files) / len([f for f in commit.files_changed if f.endswith('.py')])
                        module_lines_added += int(commit.lines_added * proportion)
                        module_lines_removed += int(commit.lines_removed * proportion)
            
            total_lines_added += module_lines_added
            total_lines_removed += module_lines_removed
            
            # Track author statistics
            author_key = (commit.author_name, commit.author_email)
            author_data = author_stats[author_key]
            author_data['commits'] += 1
            author_data['lines_added'] += module_lines_added
            author_data['lines_removed'] += module_lines_removed
            author_data['modules_touched'].add(module_path)
            
            # Update first/last commit dates
            if author_data['first_commit'] is None or commit.date < author_data['first_commit']:
                author_data['first_commit'] = commit.date
            if author_data['last_commit'] is None or commit.date > author_data['last_commit']:
                author_data['last_commit'] = commit.date
            
            # Update module first/last commit dates
            if first_commit is None or commit.date < first_commit:
                first_commit = commit.date
            if last_commit is None or commit.date > last_commit:
                last_commit = commit.date
        
        # Create author breakdown
        author_breakdown = []
        for (author_name, author_email), stats in author_stats.items():
            contribution = AuthorContribution(
                author_name=author_name,
                author_email=author_email,
                total_commits=stats['commits'],
                lines_added=stats['lines_added'],
                lines_removed=stats['lines_removed'],
                modules_touched=list(stats['modules_touched']),
                first_commit=stats['first_commit'] or datetime.now(),
                last_commit=stats['last_commit'] or datetime.now(),
                contribution_percentage=(stats['commits'] / total_commits) * 100 if total_commits > 0 else 0
            )
            author_breakdown.append(contribution)
        
        # Sort by commit count
        author_breakdown.sort(key=lambda x: x.total_commits, reverse=True)
        
        # Calculate commit frequency by month
        commit_frequency = self._calculate_commit_frequency(commits)
        
        return ModuleGitStats(
            module_path=module_path,
            total_commits=total_commits,
            unique_authors=len(author_stats),
            lines_added=total_lines_added,
            lines_removed=total_lines_removed,
            author_breakdown=author_breakdown,
            commit_frequency=commit_frequency,
            first_commit=first_commit,
            last_commit=last_commit
        )
    
    def _file_belongs_to_module(self, file_path: str, module_path: str) -> bool:
        """Check if a file belongs to a specific module.
        
        Args:
            file_path: Path to the file
            module_path: Path to the module
            
        Returns:
            True if the file belongs to the module
        """
        if module_path == '.':
            # Root module - check if file is in root directory
            return '/' not in file_path or file_path.count('/') == 0
        
        # Check if file path starts with module path
        return file_path.startswith(module_path + '/')
    
    def _calculate_commit_frequency(self, commits: List[CommitInfo]) -> Dict[str, int]:
        """Calculate commit frequency by month.
        
        Args:
            commits: List of commits
            
        Returns:
            Dictionary mapping month strings to commit counts
        """
        frequency = defaultdict(int)
        
        for commit in commits:
            month_key = commit.date.strftime("%Y-%m")
            frequency[month_key] += 1
        
        return dict(frequency)
    
    def calculate_proportional_contributions(self, date_range: Optional[DateRange] = None) -> List[ProportionalContribution]:
        """Calculate proportional contribution statistics.
        
        Args:
            date_range: Optional date range to filter commits
            
        Returns:
            List of ProportionalContribution objects
        """
        logger.info("Calculating proportional contributions...")
        
        try:
            # Get module statistics
            module_stats = self.analyze_module_commits(date_range)
            
            # Get overall author contributions
            git_result = self.git_analyzer.analyze_repository(date_range)
            if not git_result.success:
                return []
            
            overall_authors = {(a.author_name, a.author_email): a for a in git_result.author_contributions}
            
            proportional_contributions = []
            
            # Calculate proportional contributions for each module and author
            for module_path, module_stat in module_stats.items():
                module_total_commits = module_stat.total_commits
                
                for author_contrib in module_stat.author_breakdown:
                    author_key = (author_contrib.author_name, author_contrib.author_email)
                    overall_author = overall_authors.get(author_key)
                    
                    if overall_author:
                        # Calculate proportions
                        module_contribution_percentage = (
                            (author_contrib.total_commits / overall_author.total_commits) * 100
                            if overall_author.total_commits > 0 else 0
                        )
                        
                        author_dominance_percentage = (
                            (author_contrib.total_commits / module_total_commits) * 100
                            if module_total_commits > 0 else 0
                        )
                        
                        proportional_contrib = ProportionalContribution(
                            author_name=author_contrib.author_name,
                            author_email=author_contrib.author_email,
                            module_path=module_path,
                            commits_in_module=author_contrib.total_commits,
                            total_commits_by_author=overall_author.total_commits,
                            lines_added_in_module=author_contrib.lines_added,
                            lines_removed_in_module=author_contrib.lines_removed,
                            total_lines_by_author=overall_author.lines_added + overall_author.lines_removed,
                            module_contribution_percentage=module_contribution_percentage,
                            author_dominance_percentage=author_dominance_percentage
                        )
                        
                        proportional_contributions.append(proportional_contrib)
            
            logger.info(f"Calculated {len(proportional_contributions)} proportional contributions")
            return proportional_contributions
            
        except Exception as e:
            logger.error(f"Proportional contribution calculation failed: {e}")
            self.errors.append(f"Proportional calculation failed: {str(e)}")
            return []
    
    def analyze_commit_frequency_patterns(self, date_range: Optional[DateRange] = None) -> Dict[str, ModuleCommitFrequency]:
        """Analyze commit frequency patterns for modules.
        
        Args:
            date_range: Optional date range to filter commits
            
        Returns:
            Dictionary mapping module paths to ModuleCommitFrequency objects
        """
        logger.info("Analyzing commit frequency patterns...")
        
        try:
            # Get module commits
            git_result = self.git_analyzer.analyze_repository(date_range)
            if not git_result.success:
                return {}
            
            commits = git_result.commits
            module_commits = self._group_commits_by_module(commits)
            
            frequency_patterns = {}
            
            for module_path, module_commit_list in module_commits.items():
                frequency = self._analyze_module_frequency_pattern(module_path, module_commit_list)
                frequency_patterns[module_path] = frequency
            
            logger.info(f"Analyzed frequency patterns for {len(frequency_patterns)} modules")
            return frequency_patterns
            
        except Exception as e:
            logger.error(f"Frequency pattern analysis failed: {e}")
            self.errors.append(f"Frequency analysis failed: {str(e)}")
            return {}
    
    def _analyze_module_frequency_pattern(self, module_path: str, commits: List[CommitInfo]) -> ModuleCommitFrequency:
        """Analyze frequency pattern for a specific module.
        
        Args:
            module_path: Path to the module
            commits: List of commits for the module
            
        Returns:
            ModuleCommitFrequency object
        """
        daily_commits = defaultdict(int)
        weekly_commits = defaultdict(int)
        monthly_commits = defaultdict(int)
        
        for commit in commits:
            # Daily frequency
            day_key = commit.date.strftime("%Y-%m-%d")
            daily_commits[day_key] += 1
            
            # Weekly frequency (ISO week)
            week_key = commit.date.strftime("%Y-W%U")
            weekly_commits[week_key] += 1
            
            # Monthly frequency
            month_key = commit.date.strftime("%Y-%m")
            monthly_commits[month_key] += 1
        
        # Find peak activity period
        peak_period = "N/A"
        if monthly_commits:
            peak_month = max(monthly_commits.items(), key=lambda x: x[1])
            peak_period = peak_month[0]
        
        # Calculate average commits per week
        total_weeks = len(weekly_commits)
        total_commits = len(commits)
        avg_commits_per_week = total_commits / total_weeks if total_weeks > 0 else 0
        
        return ModuleCommitFrequency(
            module_path=module_path,
            daily_commits=dict(daily_commits),
            weekly_commits=dict(weekly_commits),
            monthly_commits=dict(monthly_commits),
            peak_activity_period=peak_period,
            average_commits_per_week=avg_commits_per_week
        )
    
    def get_module_author_breakdown(self, module_path: str, date_range: Optional[DateRange] = None) -> List[AuthorContribution]:
        """Get author contribution breakdown for a specific module.
        
        Args:
            module_path: Path to the module
            date_range: Optional date range to filter commits
            
        Returns:
            List of AuthorContribution objects for the module
        """
        module_stats = self.analyze_module_commits(date_range)
        
        if module_path in module_stats:
            return module_stats[module_path].author_breakdown
        
        return []
    
    def get_top_contributors_by_module(self, limit: int = 5, date_range: Optional[DateRange] = None) -> Dict[str, List[AuthorContribution]]:
        """Get top contributors for each module.
        
        Args:
            limit: Maximum number of contributors per module
            date_range: Optional date range to filter commits
            
        Returns:
            Dictionary mapping module paths to lists of top contributors
        """
        module_stats = self.analyze_module_commits(date_range)
        
        top_contributors = {}
        for module_path, stats in module_stats.items():
            # Get top contributors (already sorted by commit count)
            top_contributors[module_path] = stats.author_breakdown[:limit]
        
        return top_contributors