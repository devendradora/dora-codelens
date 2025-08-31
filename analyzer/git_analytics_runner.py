#!/usr/bin/env python3
"""
Git Analytics Runner for DoraCodeLens

This script runs git analytics and outputs JSON results.
"""

import sys
import json
import argparse
from pathlib import Path
from git_analyzer import GitAnalyzer, DateRange
from datetime import datetime


def main():
    parser = argparse.ArgumentParser(description='Run Git Analytics')
    parser.add_argument('repo_path', help='Path to the Git repository')
    parser.add_argument('--start-date', help='Start date for analysis (YYYY-MM-DD)')
    parser.add_argument('--end-date', help='End date for analysis (YYYY-MM-DD)')
    parser.add_argument('--no-author-stats', action='store_true', help='Skip author statistics')
    parser.add_argument('--no-timeline', action='store_true', help='Skip commit timeline')
    parser.add_argument('--max-commits', type=int, help='Maximum number of commits to analyze')
    
    args = parser.parse_args()
    
    try:
        # Initialize Git analyzer
        analyzer = GitAnalyzer(Path(args.repo_path))
        
        # Set up date range if provided
        date_range = None
        if args.start_date and args.end_date:
            start_date = datetime.fromisoformat(args.start_date)
            end_date = datetime.fromisoformat(args.end_date)
            date_range = DateRange(start_date, end_date)
        
        print("Starting git analysis...", file=sys.stderr)
        
        # Run analysis
        result = analyzer.analyze_repository(date_range)
        
        print("Git analysis completed", file=sys.stderr)
        
        # Output JSON result
        result_dict = result.to_dict()
        print(json.dumps(result_dict, indent=2))
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "repository_info": {
                "name": "unknown",
                "branch": "unknown",
                "total_commits": 0,
                "date_range": {
                    "start": datetime.now().isoformat(),
                    "end": datetime.now().isoformat()
                },
                "contributors": 0
            },
            "author_contributions": [],
            "commit_timeline": [],
            "total_commits": 0,
            "errors": [str(e)]
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


if __name__ == '__main__':
    main()