#!/usr/bin/env python3
"""
JSON Output Demo

This script demonstrates the JSON output capabilities of the CodeMindMap analyzer.
"""

import sys
import json
import argparse
from pathlib import Path
from analyzer import ProjectAnalyzer
from json_schema import validate_analysis_json, ValidationError


def main():
    """Main entry point for the demo."""
    parser = argparse.ArgumentParser(description="Demonstrate JSON output from CodeMindMap analyzer")
    parser.add_argument("project_path", help="Path to Python project to analyze")
    parser.add_argument("--output", "-o", help="Output file path (default: stdout)")
    parser.add_argument("--validate", "-v", action="store_true", help="Validate JSON schema")
    parser.add_argument("--pretty", "-p", action="store_true", help="Pretty print JSON")
    parser.add_argument("--summary", "-s", action="store_true", help="Show analysis summary")
    
    args = parser.parse_args()
    
    project_path = Path(args.project_path)
    if not project_path.exists():
        print(f"Error: Project path does not exist: {project_path}", file=sys.stderr)
        sys.exit(1)
    
    try:
        # Analyze project
        print(f"Analyzing project: {project_path}", file=sys.stderr)
        analyzer = ProjectAnalyzer(project_path)
        result = analyzer.analyze_project()
        
        # Generate JSON
        json_str = result.to_json(validate=args.validate)
        
        if args.validate:
            print("✓ JSON validation successful", file=sys.stderr)
        
        # Parse JSON for summary
        parsed = json.loads(json_str)
        
        if args.summary:
            print_summary(parsed)
        
        # Output JSON
        if args.output:
            with open(args.output, 'w') as f:
                if args.pretty:
                    json.dump(parsed, f, indent=2)
                else:
                    f.write(json_str)
            print(f"JSON output written to: {args.output}", file=sys.stderr)
        else:
            if args.pretty:
                print(json.dumps(parsed, indent=2))
            else:
                print(json_str)
        
        sys.exit(0 if result.success else 1)
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def print_summary(data: dict):
    """Print analysis summary."""
    print("\n=== Analysis Summary ===", file=sys.stderr)
    print(f"Success: {data['success']}", file=sys.stderr)
    print(f"Project: {data['metadata']['project_path']}", file=sys.stderr)
    print(f"Analysis time: {data['metadata']['analysis_time']:.2f}s", file=sys.stderr)
    print(f"Files analyzed: {data['metadata']['analyzed_files']}/{data['metadata']['total_files']}", file=sys.stderr)
    
    # Tech stack
    tech_stack = data['tech_stack']
    print(f"\nTech Stack:", file=sys.stderr)
    print(f"  Package manager: {tech_stack['package_manager']}", file=sys.stderr)
    print(f"  Python version: {tech_stack.get('python_version', 'Unknown')}", file=sys.stderr)
    print(f"  Libraries: {len(tech_stack['libraries'])}", file=sys.stderr)
    print(f"  Frameworks: {', '.join(tech_stack['frameworks']) if tech_stack['frameworks'] else 'None'}", file=sys.stderr)
    
    # Modules
    modules = data['modules']
    print(f"\nModules:", file=sys.stderr)
    print(f"  Total modules: {modules['total_modules']}", file=sys.stderr)
    print(f"  Dependencies: {len(modules['edges'])}", file=sys.stderr)
    
    complexity = modules['complexity_summary']
    print(f"  Complexity: {complexity['low']} low, {complexity['medium']} medium, {complexity['high']} high", file=sys.stderr)
    print(f"  Average complexity: {complexity['average']:.1f}", file=sys.stderr)
    
    # Functions
    functions = data['functions']
    print(f"\nFunctions:", file=sys.stderr)
    print(f"  Total functions: {functions['total_functions']}", file=sys.stderr)
    print(f"  Call relationships: {len(functions['edges'])}", file=sys.stderr)
    
    # Framework patterns
    patterns = data['framework_patterns']
    if patterns:
        print(f"\nFramework Patterns:", file=sys.stderr)
        for framework, pattern_data in patterns.items():
            if framework == 'django' and pattern_data:
                print(f"  Django: {len(pattern_data['url_patterns'])} URLs, {len(pattern_data['views'])} views, {len(pattern_data['models'])} models", file=sys.stderr)
            elif framework == 'flask' and pattern_data:
                print(f"  Flask: {len(pattern_data['routes'])} routes, {len(pattern_data['blueprints'])} blueprints", file=sys.stderr)
            elif framework == 'fastapi' and pattern_data:
                print(f"  FastAPI: {len(pattern_data['routes'])} routes, {len(pattern_data['dependencies'])} dependencies", file=sys.stderr)
    
    # Errors and warnings
    if data['errors']:
        print(f"\nErrors: {len(data['errors'])}", file=sys.stderr)
        for error in data['errors'][:3]:  # Show first 3 errors
            print(f"  - {error['type']}: {error['message']}", file=sys.stderr)
        if len(data['errors']) > 3:
            print(f"  ... and {len(data['errors']) - 3} more", file=sys.stderr)
    
    if data['warnings']:
        print(f"\nWarnings: {len(data['warnings'])}", file=sys.stderr)
        for warning in data['warnings'][:3]:  # Show first 3 warnings
            print(f"  - {warning['type']}: {warning['message']}", file=sys.stderr)
        if len(data['warnings']) > 3:
            print(f"  ... and {len(data['warnings']) - 3} more", file=sys.stderr)
    
    print("========================\n", file=sys.stderr)


if __name__ == "__main__":
    main()