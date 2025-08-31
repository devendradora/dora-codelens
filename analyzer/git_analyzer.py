#!/usr/bin/env python3
"""
Git Analytics Engine for DoraCodeLens

This module provides comprehensive Git repository analysis capabilities,
including author contribution tracking, commit statistics, and module-wise analytics.
"""

import logging
import subprocess
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, Any
from dataclasses import dataclass, asdict
from collections import defaultdict
import re

# Configure logging
logger = logging.getLogger(__name__)


class GitAnalysisError(Exception):
    """Exception raised for Git analysis errors."""
    pass


@dataclass
class DateRange:
    """Represents a date range for filtering."""
    start: datetime
    end: datetime
    
    def contains(self, date: datetime) -> bool:
        """Check if a date falls within this range."""
        return self.start <= date <= self.end


@dataclass
class AuthorContribution:
    """Represents author contribution statistics."""
    author_name: str
    author_email: str
    total_commits: int
    lines_added: int
    lines_removed: int
    modules_touched: List[str]
    first_commit: datetime
    last_commit: datetime
    contribution_percentage: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "author_name": self.author_name,
            "author_email": self.author_email,
            "total_commits": self.total_commits,
            "lines_added": self.lines_added,
            "lines_removed": self.lines_removed,
            "modules_touched": self.modules_touched,
            "first_commit": self.first_commit.isoformat(),
            "last_commit": self.last_commit.isoformat(),
            "contribution_percentage": self.contribution_percentage
        }


@dataclass
class CommitInfo:
    """Represents information about a single commit."""
    hash: str
    author_name: str
    author_email: str
    date: datetime
    message: str
    files_changed: List[str]
    lines_added: int
    lines_removed: int
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "hash": self.hash,
            "author_name": self.author_name,
            "author_email": self.author_email,
            "date": self.date.isoformat(),
            "message": self.message,
            "files_changed": self.files_changed,
            "lines_added": self.lines_added,
            "lines_removed": self.lines_removed
        }


@dataclass
class CommitTimelineEntry:
    """Represents a commit timeline entry for visualization."""
    date: datetime
    commit_count: int
    lines_added: int
    lines_removed: int
    authors: Set[str]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "date": self.date.isoformat(),
            "commit_count": self.commit_count,
            "lines_added": self.lines_added,
            "lines_removed": self.lines_removed,
            "authors": list(self.authors)
        }


@dataclass
class RepositoryInfo:
    """Represents basic repository information."""
    name: str
    branch: str
    total_commits: int
    date_range: DateRange
    contributors: int
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "name": self.name,
            "branch": self.branch,
            "total_commits": self.total_commits,
            "date_range": {
                "start": self.date_range.start.isoformat(),
                "end": self.date_range.end.isoformat()
            },
            "contributors": self.contributors
        }


@dataclass
class GitAnalysisResult:
    """Complete Git analysis result."""
    repository_info: RepositoryInfo
    author_contributions: List[AuthorContribution]
    commit_timeline: List[CommitTimelineEntry]
    commits: List[CommitInfo]
    success: bool = True
    errors: List[str] = None
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "success": self.success,
            "repository_info": self.repository_info.to_dict(),
            "author_contributions": [contrib.to_dict() for contrib in self.author_contributions],
            "commit_timeline": [entry.to_dict() for entry in self.commit_timeline],
            "total_commits": len(self.commits),
            "errors": self.errors
        }


class GitAnalyzer:
    """Main Git analysis class with repository analysis capabilities."""
    
    def __init__(self, repo_path: Path):
        """Initialize Git analyzer.
        
        Args:
            repo_path: Path to the Git repository
            
        Raises:
            GitAnalysisError: If the path is not a valid Git repository
        """
        self.repo_path = Path(repo_path).resolve()
        self.errors: List[str] = []
        
        if not self._is_git_repository():
            raise GitAnalysisError(f"Path is not a Git repository: {self.repo_path}")
        
        logger.info(f"Initialized Git analyzer for repository: {self.repo_path}")
    
    def _is_git_repository(self) -> bool:
        """Check if the path is a valid Git repository."""
        try:
            result = subprocess.run(
                ["git", "rev-parse", "--git-dir"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            return result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False
    
    def analyze_repository(self, date_range: Optional[DateRange] = None) -> GitAnalysisResult:
        """Analyze the Git repository comprehensively.
        
        Args:
            date_range: Optional date range to filter commits
            
        Returns:
            GitAnalysisResult containing all analysis data
        """
        logger.info("Starting Git repository analysis...")
        
        try:
            # Get repository information
            repo_info = self._get_repository_info()
            
            # Parse Git log to extract commit information
            commits = self._parse_git_log(date_range)
            
            # Calculate author contributions
            author_contributions = self._calculate_author_contributions(commits)
            
            # Generate commit timeline
            commit_timeline = self._generate_commit_timeline(commits)
            
            # Update contribution percentages
            self._update_contribution_percentages(author_contributions)
            
            result = GitAnalysisResult(
                repository_info=repo_info,
                author_contributions=author_contributions,
                commit_timeline=commit_timeline,
                commits=commits,
                success=len(self.errors) == 0,
                errors=self.errors.copy()
            )
            
            logger.info(f"Git analysis completed. Found {len(commits)} commits from {len(author_contributions)} authors")
            return result
            
        except Exception as e:
            logger.error(f"Git analysis failed: {e}")
            self.errors.append(f"Analysis failed: {str(e)}")
            
            # Return failed result with empty data
            empty_repo_info = RepositoryInfo(
                name="unknown",
                branch="unknown",
                total_commits=0,
                date_range=DateRange(datetime.now(), datetime.now()),
                contributors=0
            )
            
            return GitAnalysisResult(
                repository_info=empty_repo_info,
                author_contributions=[],
                commit_timeline=[],
                commits=[],
                success=False,
                errors=self.errors.copy()
            )
    
    def _get_repository_info(self) -> RepositoryInfo:
        """Get basic repository information."""
        try:
            # Get repository name
            name_result = subprocess.run(
                ["git", "rev-parse", "--show-toplevel"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            repo_name = Path(name_result.stdout.strip()).name if name_result.returncode == 0 else "unknown"
            
            # Get current branch
            branch_result = subprocess.run(
                ["git", "rev-parse", "--abbrev-ref", "HEAD"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            branch = branch_result.stdout.strip() if branch_result.returncode == 0 else "unknown"
            
            # Get total commit count
            count_result = subprocess.run(
                ["git", "rev-list", "--count", "HEAD"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=30
            )
            total_commits = int(count_result.stdout.strip()) if count_result.returncode == 0 else 0
            
            # Get date range of commits
            first_commit_result = subprocess.run(
                ["git", "log", "--reverse", "--format=%ci", "-1"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            last_commit_result = subprocess.run(
                ["git", "log", "--format=%ci", "-1"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if first_commit_result.returncode == 0 and last_commit_result.returncode == 0:
                first_date = self._parse_git_date(first_commit_result.stdout.strip())
                last_date = self._parse_git_date(last_commit_result.stdout.strip())
                date_range = DateRange(first_date, last_date)
            else:
                date_range = DateRange(datetime.now(), datetime.now())
            
            # Get contributor count
            contributors_result = subprocess.run(
                ["git", "shortlog", "-sn", "--all"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=30
            )
            contributors = len(contributors_result.stdout.strip().split('\n')) if contributors_result.returncode == 0 else 0
            
            return RepositoryInfo(
                name=repo_name,
                branch=branch,
                total_commits=total_commits,
                date_range=date_range,
                contributors=contributors
            )
            
        except Exception as e:
            logger.error(f"Failed to get repository info: {e}")
            self.errors.append(f"Failed to get repository info: {str(e)}")
            return RepositoryInfo(
                name="unknown",
                branch="unknown",
                total_commits=0,
                date_range=DateRange(datetime.now(), datetime.now()),
                contributors=0
            )
    
    def _parse_git_log(self, date_range: Optional[DateRange] = None) -> List[CommitInfo]:
        """Parse Git log to extract commit information.
        
        Args:
            date_range: Optional date range to filter commits
            
        Returns:
            List of CommitInfo objects
        """
        commits = []
        
        try:
            # Build git log command
            cmd = [
                "git", "log",
                "--pretty=format:%H|%an|%ae|%ci|%s",
                "--numstat"
            ]
            
            # Add date range filter if specified
            if date_range:
                cmd.extend([
                    f"--since={date_range.start.isoformat()}",
                    f"--until={date_range.end.isoformat()}"
                ])
            
            # Execute git log command
            result = subprocess.run(
                cmd,
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=120  # Longer timeout for large repositories
            )
            
            if result.returncode != 0:
                raise GitAnalysisError(f"Git log command failed: {result.stderr}")
            
            # Parse the output
            commits = self._parse_git_log_output(result.stdout)
            
            logger.info(f"Parsed {len(commits)} commits from Git log")
            return commits
            
        except subprocess.TimeoutExpired:
            logger.error("Git log command timed out")
            self.errors.append("Git log command timed out")
            return []
        except Exception as e:
            logger.error(f"Failed to parse Git log: {e}")
            self.errors.append(f"Failed to parse Git log: {str(e)}")
            return []
    
    def _parse_git_log_output(self, output: str) -> List[CommitInfo]:
        """Parse the output of git log command.
        
        Args:
            output: Raw output from git log command
            
        Returns:
            List of CommitInfo objects
        """
        commits = []
        lines = output.strip().split('\n')
        i = 0
        
        while i < len(lines):
            line = lines[i].strip()
            
            # Skip empty lines
            if not line:
                i += 1
                continue
            
            # Parse commit header line
            if '|' in line:
                parts = line.split('|', 4)
                if len(parts) >= 5:
                    commit_hash = parts[0]
                    author_name = parts[1]
                    author_email = parts[2]
                    date_str = parts[3]
                    message = parts[4]
                    
                    try:
                        commit_date = self._parse_git_date(date_str)
                    except ValueError:
                        logger.warning(f"Failed to parse date: {date_str}")
                        commit_date = datetime.now()
                    
                    # Parse file changes (numstat output)
                    i += 1
                    files_changed = []
                    lines_added = 0
                    lines_removed = 0
                    
                    while i < len(lines) and lines[i].strip() and '|' not in lines[i]:
                        stat_line = lines[i].strip()
                        parts = stat_line.split('\t')
                        
                        if len(parts) >= 3:
                            added_str = parts[0]
                            removed_str = parts[1]
                            filename = parts[2]
                            
                            # Handle binary files (marked with '-')
                            if added_str != '-' and added_str.isdigit():
                                lines_added += int(added_str)
                            if removed_str != '-' and removed_str.isdigit():
                                lines_removed += int(removed_str)
                            
                            files_changed.append(filename)
                        
                        i += 1
                    
                    commit = CommitInfo(
                        hash=commit_hash,
                        author_name=author_name,
                        author_email=author_email,
                        date=commit_date,
                        message=message,
                        files_changed=files_changed,
                        lines_added=lines_added,
                        lines_removed=lines_removed
                    )
                    commits.append(commit)
                    continue
            
            i += 1
        
        return commits
    
    def _parse_git_date(self, date_str: str) -> datetime:
        """Parse Git date string to datetime object.
        
        Args:
            date_str: Git date string (e.g., "2023-01-01 12:00:00 +0000")
            
        Returns:
            datetime object
        """
        # Remove timezone info for simplicity
        date_str = re.sub(r'\s+[+-]\d{4}$', '', date_str.strip())
        
        # Try different date formats
        formats = [
            "%Y-%m-%d %H:%M:%S",
            "%a %b %d %H:%M:%S %Y",
            "%Y-%m-%d"
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        
        # If all formats fail, return current time
        logger.warning(f"Could not parse date: {date_str}")
        return datetime.now()
    
    def _calculate_author_contributions(self, commits: List[CommitInfo]) -> List[AuthorContribution]:
        """Calculate author contribution statistics.
        
        Args:
            commits: List of commit information
            
        Returns:
            List of AuthorContribution objects
        """
        author_stats = defaultdict(lambda: {
            'commits': 0,
            'lines_added': 0,
            'lines_removed': 0,
            'modules_touched': set(),
            'first_commit': None,
            'last_commit': None
        })
        
        # Aggregate statistics by author
        for commit in commits:
            author_key = (commit.author_name, commit.author_email)
            stats = author_stats[author_key]
            
            stats['commits'] += 1
            stats['lines_added'] += commit.lines_added
            stats['lines_removed'] += commit.lines_removed
            
            # Track modules touched (Python files)
            for file_path in commit.files_changed:
                if file_path.endswith('.py'):
                    # Extract module path (directory structure)
                    module_path = str(Path(file_path).parent)
                    if module_path != '.':
                        stats['modules_touched'].add(module_path)
            
            # Track first and last commit dates
            if stats['first_commit'] is None or commit.date < stats['first_commit']:
                stats['first_commit'] = commit.date
            if stats['last_commit'] is None or commit.date > stats['last_commit']:
                stats['last_commit'] = commit.date
        
        # Convert to AuthorContribution objects
        contributions = []
        for (author_name, author_email), stats in author_stats.items():
            contribution = AuthorContribution(
                author_name=author_name,
                author_email=author_email,
                total_commits=stats['commits'],
                lines_added=stats['lines_added'],
                lines_removed=stats['lines_removed'],
                modules_touched=list(stats['modules_touched']),
                first_commit=stats['first_commit'] or datetime.now(),
                last_commit=stats['last_commit'] or datetime.now()
            )
            contributions.append(contribution)
        
        # Sort by total commits (descending)
        contributions.sort(key=lambda x: x.total_commits, reverse=True)
        
        return contributions
    
    def _generate_commit_timeline(self, commits: List[CommitInfo]) -> List[CommitTimelineEntry]:
        """Generate commit timeline for visualization.
        
        Args:
            commits: List of commit information
            
        Returns:
            List of CommitTimelineEntry objects
        """
        # Group commits by date (day)
        daily_stats = defaultdict(lambda: {
            'commit_count': 0,
            'lines_added': 0,
            'lines_removed': 0,
            'authors': set()
        })
        
        for commit in commits:
            date_key = commit.date.date()
            stats = daily_stats[date_key]
            
            stats['commit_count'] += 1
            stats['lines_added'] += commit.lines_added
            stats['lines_removed'] += commit.lines_removed
            stats['authors'].add(commit.author_name)
        
        # Convert to timeline entries
        timeline = []
        for date, stats in daily_stats.items():
            entry = CommitTimelineEntry(
                date=datetime.combine(date, datetime.min.time()),
                commit_count=stats['commit_count'],
                lines_added=stats['lines_added'],
                lines_removed=stats['lines_removed'],
                authors=stats['authors']
            )
            timeline.append(entry)
        
        # Sort by date
        timeline.sort(key=lambda x: x.date)
        
        return timeline
    
    def _update_contribution_percentages(self, contributions: List[AuthorContribution]) -> None:
        """Update contribution percentages based on total commits.
        
        Args:
            contributions: List of AuthorContribution objects to update
        """
        total_commits = sum(contrib.total_commits for contrib in contributions)
        
        if total_commits > 0:
            for contrib in contributions:
                contrib.contribution_percentage = (contrib.total_commits / total_commits) * 100
    
    def get_author_contributions(self, module_path: Optional[str] = None) -> List[AuthorContribution]:
        """Get author contributions, optionally filtered by module path.
        
        Args:
            module_path: Optional module path to filter by
            
        Returns:
            List of AuthorContribution objects
        """
        # This is a simplified version - full implementation would be in ModuleCommitAnalyzer
        result = self.analyze_repository()
        
        if module_path:
            # Filter contributions by module path
            filtered_contributions = []
            for contrib in result.author_contributions:
                if module_path in contrib.modules_touched:
                    filtered_contributions.append(contrib)
            return filtered_contributions
        
        return result.author_contributions
    
    def get_commit_statistics(self, date_range: Optional[DateRange] = None) -> Dict[str, Any]:
        """Get commit statistics for the repository.
        
        Args:
            date_range: Optional date range to filter commits
            
        Returns:
            Dictionary containing commit statistics
        """
        result = self.analyze_repository(date_range)
        
        if not result.success:
            return {"error": "Failed to analyze repository", "errors": result.errors}
        
        total_commits = len(result.commits)
        total_authors = len(result.author_contributions)
        total_lines_added = sum(commit.lines_added for commit in result.commits)
        total_lines_removed = sum(commit.lines_removed for commit in result.commits)
        
        # Calculate average commits per day
        if result.commit_timeline:
            days_with_commits = len(result.commit_timeline)
            avg_commits_per_day = total_commits / days_with_commits if days_with_commits > 0 else 0
        else:
            avg_commits_per_day = 0
        
        return {
            "total_commits": total_commits,
            "total_authors": total_authors,
            "total_lines_added": total_lines_added,
            "total_lines_removed": total_lines_removed,
            "net_lines": total_lines_added - total_lines_removed,
            "average_commits_per_day": round(avg_commits_per_day, 2),
            "date_range": {
                "start": result.repository_info.date_range.start.isoformat(),
                "end": result.repository_info.date_range.end.isoformat()
            }
        }