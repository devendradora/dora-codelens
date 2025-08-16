#!/usr/bin/env python3
"""
Test script for enhanced analyzer with module cards and folder structure.
"""

import sys
import json
from pathlib import Path

# Add the analyzer directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from analyzer import ProjectAnalyzer


def test_enhanced_analyzer():
    """Test the enhanced analyzer functionality."""
    print("Testing enhanced analyzer with module cards and folder structure...")
    
    # Use the current analyzer directory as test project
    test_project_path = Path(__file__).parent
    
    try:
        # Initialize analyzer
        analyzer = ProjectAnalyzer(test_project_path, use_cache=False)
        
        # Run analysis
        print(f"Analyzing project: {test_project_path}")
        result = analyzer.analyze_project()
        
        if result.success:
            print("✓ Analysis completed successfully")
            
            # Check module cards
            if result.module_cards:
                print(f"✓ Generated {len(result.module_cards)} module cards")
                
                # Show first module card as example
                if result.module_cards:
                    first_card = result.module_cards[0]
                    print(f"  Example card: {first_card.display_name}")
                    print(f"  Complexity: {first_card.complexity['level']} ({first_card.complexity['colorCode']})")
                    print(f"  Folder: {first_card.folder_path}")
            else:
                print("⚠ No module cards generated")
            
            # Check folder structure
            if result.folder_structure:
                print(f"✓ Analyzed folder structure with {result.folder_structure.total_folders} folders")
                print(f"  Total Python files: {result.folder_structure.total_python_files}")
                print(f"  Folder types: {result.folder_structure.folder_type_distribution}")
                
                # Show module groupings
                if result.folder_structure.module_groupings:
                    print(f"  Module groupings: {len(result.folder_structure.module_groupings)}")
                    for grouping in result.folder_structure.module_groupings[:3]:  # Show first 3
                        print(f"    - {grouping.display_name}: {len(grouping.modules)} modules")
            else:
                print("⚠ No folder structure analysis")
            
            # Test JSON serialization
            json_output = result.to_json(validate=False)
            print("✓ JSON serialization successful")
            
            # Check if enhanced fields are in JSON
            json_data = json.loads(json_output)
            if "module_cards" in json_data:
                print("✓ Module cards included in JSON output")
            if "folder_structure" in json_data:
                print("✓ Folder structure included in JSON output")
            
        else:
            print("✗ Analysis failed")
            for error in result.metadata.errors:
                print(f"  Error: {error}")
        
        return result.success
        
    except Exception as e:
        print(f"✗ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_current_file_analysis():
    """Test current file analysis functionality."""
    print("\nTesting current file analysis...")
    
    test_project_path = Path(__file__).parent
    test_file = Path(__file__)  # Use this test file
    
    try:
        analyzer = ProjectAnalyzer(test_project_path, use_cache=False)
        
        # Analyze current file
        result = analyzer.analyze_current_file(test_file)
        
        if result and result.success:
            print("✓ Current file analysis completed successfully")
            print(f"  File: {result.file_path}")
            print(f"  Functions: {result.module_info.functions}")
            print(f"  Classes: {result.module_info.classes}")
            print(f"  Complexity: {result.complexity_summary['complexity_level']}")
            
            if result.module_card:
                print(f"  Module card: {result.module_card.display_name}")
            
            # Test JSON serialization
            json_output = json.dumps(result.to_dict(), indent=2)
            print("✓ Current file JSON serialization successful")
            
            return True
        else:
            print("✗ Current file analysis failed")
            return False
            
    except Exception as e:
        print(f"✗ Current file analysis test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("Enhanced Analyzer Test Suite")
    print("=" * 40)
    
    # Run tests
    test1_passed = test_enhanced_analyzer()
    test2_passed = test_current_file_analysis()
    
    print("\n" + "=" * 40)
    if test1_passed and test2_passed:
        print("✓ All tests passed!")
        sys.exit(0)
    else:
        print("✗ Some tests failed!")
        sys.exit(1)