#!/usr/bin/env python3
"""
Git Analytics Runner for DoraCodeBirdView

This script provides a command-line interface for running Git analytics
and returning results in JSON format for the VS Code extension.
"""

import sys
import json
import argparse
import logging
from pathlib import Path
from typing import Dict, Any, Optional

# Import our Git analytics modules
from git_analyzer import GitAnalyzer, GitAnalysisError
from git_analytics_visualizer import GitAnalyticsVisualizer
from module_commit_analyzer import ModuleCommitAnalyzer

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def run_git_author_statistics(project_path: Path) -> Dict[str, Any]:
    """Run Git author statistics analysis."""
    try:
        logger.info("Starting Git author statistics analysis...")
        
        git_analyzer = GitAnalyzer(project_path)
        result = git_analyzer.analyze_repository()
        
        if not result.success:
            return {
                "success": False,
                "errors": result.errors,
                "data": None
            }
        
        # Format the data for the extension
        data = {
            "repository_info": result.repository_info.to_dict(),
            "author_contributions": [author.to_dict() for author in result.author_contributions],
            "total_authors": len(result.author_contributions),
            "analysis_type": "author_statistics"
        }
        
        logger.info(f"Author statistics analysis completed - found {len(result.author_contributions)} authors")
        
        return {
            "success": True,
            "data": data,
            "errors": result.errors
        }
        
    except GitAnalysisError as e:
        logger.error(f"Git analysis error: {e}")
        return {
            "success": False,
            "errors": [{"type": "git_error", "message": str(e)}],
            "data": None
        }
    except Exception as e:
        logger.error(f"Unexpected error in author statistics: {e}")
        return {
            "success": False,
            "errors": [{"type": "execution_error", "message": str(e)}],
            "data": None
        }


def run_git_module_contributions(project_path: Path) -> Dict[str, Any]:
    """Run Git module contributions analysis."""
    try:
        logger.info("Starting Git module contributions analysis...")
        
        git_analyzer = GitAnalyzer(project_path)
        module_analyzer = ModuleCommitAnalyzer(git_analyzer)
        
        # Get overall Git analysis
        git_result = git_analyzer.analyze_repository()
        if not git_result.success:
            return {
                "success": False,
                "errors": git_result.errors,
                "data": None
            }
        
        # Get module statistics
        module_stats = module_analyzer.analyze_module_commits()
        
        # Get proportional contributions
        proportional_contributions = module_analyzer.calculate_proportional_contributions()
        
        # Format the data for the extension
        data = {
            "repository_info": git_result.repository_info.to_dict(),
            "module_statistics": {path: stats.to_dict() for path, stats in module_stats.items()},
            "proportional_contributions": [contrib.to_dict() for contrib in proportional_contributions],
            "total_modules": len(module_stats),
            "analysis_type": "module_contributions"
        }
        
        logger.info(f"Module contributions analysis completed - found {len(module_stats)} modules")
        
        return {
            "success": True,
            "data": data,
            "errors": git_result.errors + module_analyzer.errors
        }
        
    except GitAnalysisError as e:
        logger.error(f"Git analysis error: {e}")
        return {
            "success": False,
            "errors": [{"type": "git_error", "message": str(e)}],
            "data": None
        }
    except Exception as e:
        logger.error(f"Unexpected error in module contributions: {e}")
        return {
            "success": False,
            "errors": [{"type": "execution_error", "message": str(e)}],
            "data": None
        }


def run_git_commit_timeline(project_path: Path) -> Dict[str, Any]:
    """Run Git commit timeline analysis."""
    try:
        logger.info("Starting Git commit timeline analysis...")
        
        git_analyzer = GitAnalyzer(project_path)
        visualizer = GitAnalyticsVisualizer(git_analyzer)
        
        # Get Git analysis result
        git_result = git_analyzer.analyze_repository()
        if not git_result.success:
            return {
                "success": False,
                "errors": git_result.errors,
                "data": None
            }
        
        # Generate timeline visualization data
        timeline_data = visualizer.create_timeline_visualization_data("daily")
        
        # Generate contribution graphs
        contribution_graphs = visualizer.generate_contribution_graph_data()
        
        # Format the data for the extension
        data = {
            "repository_info": git_result.repository_info.to_dict(),
            "commit_timeline": timeline_data.to_dict(),
            "contribution_graphs": [graph.to_dict() for graph in contribution_graphs],
            "timeline_entries": len(timeline_data.timeline_entries),
            "analysis_type": "commit_timeline"
        }
        
        logger.info(f"Commit timeline analysis completed - found {len(timeline_data.timeline_entries)} timeline entries")
        
        return {
            "success": True,
            "data": data,
            "errors": git_result.errors + visualizer.errors
        }
        
    except GitAnalysisError as e:
        logger.error(f"Git analysis error: {e}")
        return {
            "success": False,
            "errors": [{"type": "git_error", "message": str(e)}],
            "data": None
        }
    except Exception as e:
        logger.error(f"Unexpected error in commit timeline: {e}")
        return {
            "success": False,
            "errors": [{"type": "execution_error", "message": str(e)}],
            "data": None
        }


def run_full_git_analysis(project_path: Path) -> Dict[str, Any]:
    """Run full Git analytics analysis."""
    try:
        logger.info("Starting full Git analytics analysis...")
        
        git_analyzer = GitAnalyzer(project_path)
        module_analyzer = ModuleCommitAnalyzer(git_analyzer)
        visualizer = GitAnalyticsVisualizer(git_analyzer)
        
        # Get overall Git analysis
        git_result = git_analyzer.analyze_repository()
        if not git_result.success:
            return {
                "success": False,
                "errors": git_result.errors,
                "data": None
            }
        
        # Get module statistics
        module_stats = module_analyzer.analyze_module_commits()
        
        # Generate timeline visualization data
        timeline_data = visualizer.create_timeline_visualization_data("daily")
        
        # Generate contribution graphs
        contribution_graphs = visualizer.generate_contribution_graph_data()
        
        # Format the data for the extension
        data = {
            "repository_info": git_result.repository_info.to_dict(),
            "author_contributions": [author.to_dict() for author in git_result.author_contributions],
            "module_statistics": {path: stats.to_dict() for path, stats in module_stats.items()},
            "commit_timeline": timeline_data.to_dict(),
            "contribution_graphs": [graph.to_dict() for graph in contribution_graphs],
            "analysis_type": "full_analysis"
        }
        
        logger.info("Full Git analytics analysis completed successfully")
        
        return {
            "success": True,
            "data": data,
            "errors": git_result.errors + module_analyzer.errors + visualizer.errors
        }
        
    except GitAnalysisError as e:
        logger.error(f"Git analysis error: {e}")
        return {
            "success": False,
            "errors": [{"type": "git_error", "message": str(e)}],
            "data": None
        }
    except Exception as e:
        logger.error(f"Unexpected error in full analysis: {e}")
        return {
            "success": False,
            "errors": [{"type": "execution_error", "message": str(e)}],
            "data": None
        }


def main():
    """Main entry point for the Git analytics runner."""
    parser = argparse.ArgumentParser(description='DoraCodeBirdView Git Analytics Runner')
    parser.add_argument('project_path', help='Path to the project directory')
    parser.add_argument('--author-stats', action='store_true', help='Run author statistics analysis')
    parser.add_argument('--module-contributions', action='store_true', help='Run module contributions analysis')
    parser.add_argument('--commit-timeline', action='store_true', help='Run commit timeline analysis')
    parser.add_argument('--full-analysis', action='store_true', help='Run full Git analytics analysis')
    parser.add_argument('--json', action='store_true', help='Output results in JSON format')
    
    args = parser.parse_args()
    
    # Validate project path
    project_path = Path(args.project_path).resolve()
    if not project_path.exists():
        result = {
            "success": False,
            "errors": [{"type": "path_error", "message": f"Project path does not exist: {project_path}"}],
            "data": None
        }
        print(json.dumps(result, indent=2))
        sys.exit(1)
    
    if not project_path.is_dir():
        result = {
            "success": False,
            "errors": [{"type": "path_error", "message": f"Project path is not a directory: {project_path}"}],
            "data": None
        }
        print(json.dumps(result, indent=2))
        sys.exit(1)
    
    # Check if it's a Git repository
    git_dir = project_path / '.git'
    if not git_dir.exists():
        result = {
            "success": False,
            "errors": [{"type": "git_error", "message": "This directory is not a Git repository"}],
            "data": None
        }
        print(json.dumps(result, indent=2))
        sys.exit(1)
    
    # Determine which analysis to run
    try:
        if args.author_stats:
            result = run_git_author_statistics(project_path)
        elif args.module_contributions:
            result = run_git_module_contributions(project_path)
        elif args.commit_timeline:
            result = run_git_commit_timeline(project_path)
        elif args.full_analysis:
            result = run_full_git_analysis(project_path)
        else:
            # Default to full analysis
            result = run_full_git_analysis(project_path)
        
        # Output results
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            # Simple text output for debugging
            if result["success"]:
                print(f"Git analysis completed successfully")
                if result["data"]:
                    data = result["data"]
                    print(f"Analysis type: {data.get('analysis_type', 'unknown')}")
                    if 'repository_info' in data:
                        repo_info = data['repository_info']
                        print(f"Repository: {repo_info.get('name', 'unknown')}")
                        print(f"Total commits: {repo_info.get('total_commits', 0)}")
                        print(f"Contributors: {repo_info.get('contributors', 0)}")
            else:
                print("Git analysis failed:")
                for error in result.get("errors", []):
                    print(f"  - {error.get('type', 'unknown')}: {error.get('message', 'unknown error')}")
        
        # Exit with appropriate code
        sys.exit(0 if result["success"] else 1)
        
    except KeyboardInterrupt:
        result = {
            "success": False,
            "errors": [{"type": "cancelled", "message": "Analysis was cancelled by user"}],
            "data": None
        }
        print(json.dumps(result, indent=2))
        sys.exit(1)
    except Exception as e:
        result = {
            "success": False,
            "errors": [{"type": "execution_error", "message": f"Unexpected error: {str(e)}"}],
            "data": None
        }
        print(json.dumps(result, indent=2))
        sys.exit(1)


if __name__ == '__main__':
    main()