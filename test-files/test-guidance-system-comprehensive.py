#!/usr/bin/env python3
"""
Comprehensive test file for the DoraCodeLens guidance system.
This file is designed to test various scenarios:
1. First-time user experience
2. Code lens activation guidance
3. Analysis progress tracking
4. Error handling and recovery
5. Preference management
"""

import os
import sys
from typing import List, Dict, Optional

def simple_function() -> str:
    """A simple function to test basic code lens functionality."""
    return "Hello from DoraCodeLens!"

def moderately_complex_function(data: List[Dict], threshold: int = 10) -> Optional[Dict]:
    """
    A moderately complex function to test complexity analysis.
    
    Args:
        data: List of dictionaries to process
        threshold: Minimum threshold for processing
        
    Returns:
        Processed dictionary or None
    """
    if not data:
        return None
    
    result = {}
    for item in data:
        if isinstance(item, dict):
            for key, value in item.items():
                if isinstance(value, (int, float)) and value > threshold:
                    if key in result:
                        result[key] += value
                    else:
                        result[key] = value
                elif isinstance(value, str) and len(value) > threshold:
                    result[f"{key}_length"] = len(value)
    
    return result if result else None

def highly_complex_function(x: int, y: int, z: int, mode: str = "default") -> int:
    """
    A highly complex function to test high complexity warnings.
    This function intentionally has high cyclomatic complexity.
    """
    result = 0
    
    if mode == "add":
        if x > 0:
            if y > 0:
                if z > 0:
                    result = x + y + z
                else:
                    if x > y:
                        result = x + y
                    else:
                        result = y - x
            else:
                if z > 0:
                    result = x + z
                else:
                    result = x
        else:
            if y > 0:
                if z > 0:
                    result = y + z
                else:
                    result = y
            else:
                result = 0
    elif mode == "multiply":
        if x != 0:
            if y != 0:
                if z != 0:
                    result = x * y * z
                else:
                    result = x * y
            else:
                result = x
        else:
            result = 0
    elif mode == "complex":
        for i in range(x):
            if i % 2 == 0:
                if y > i:
                    if z > y:
                        result += i * y * z
                    else:
                        result += i * y
                else:
                    result += i
            else:
                if y < i:
                    result -= i
                else:
                    result += i // 2
    else:
        result = x + y + z
    
    return result

class TestAnalysisClass:
    """
    A test class to verify class-level analysis and method complexity detection.
    """
    
    def __init__(self, name: str, config: Dict = None):
        """Initialize the test class."""
        self.name = name
        self.config = config or {}
        self.data = []
        self.processed = False
    
    def simple_method(self) -> str:
        """A simple method for testing."""
        return f"Test class: {self.name}"
    
    def complex_method(self, items: List, process_mode: str = "standard") -> Dict:
        """
        A complex method to test method-level complexity analysis.
        """
        results = {"processed": 0, "errors": 0, "skipped": 0}
        
        if not items:
            return results
        
        for item in items:
            try:
                if process_mode == "standard":
                    if isinstance(item, dict):
                        if "id" in item and "value" in item:
                            if item["value"] > 0:
                                self.data.append(item)
                                results["processed"] += 1
                            else:
                                results["skipped"] += 1
                        else:
                            results["errors"] += 1
                    else:
                        results["errors"] += 1
                elif process_mode == "advanced":
                    if isinstance(item, dict):
                        processed_item = {}
                        for key, value in item.items():
                            if isinstance(value, str):
                                processed_item[key] = value.upper()
                            elif isinstance(value, (int, float)):
                                if value > 0:
                                    processed_item[key] = value * 2
                                else:
                                    processed_item[key] = 0
                            else:
                                processed_item[key] = str(value)
                        self.data.append(processed_item)
                        results["processed"] += 1
                    else:
                        results["errors"] += 1
                else:
                    results["skipped"] += 1
            except Exception as e:
                results["errors"] += 1
        
        self.processed = True
        return results
    
    def get_statistics(self) -> Dict:
        """Get processing statistics."""
        return {
            "name": self.name,
            "total_items": len(self.data),
            "processed": self.processed,
            "config_keys": list(self.config.keys())
        }

class DataProcessor:
    """
    Another test class for comprehensive analysis testing.
    """
    
    def __init__(self):
        self.processors = {}
        self.results = []
    
    def register_processor(self, name: str, func):
        """Register a data processor function."""
        self.processors[name] = func
    
    def process_data(self, data: List, processor_name: str = "default") -> bool:
        """
        Process data using the specified processor.
        This method has moderate complexity.
        """
        if processor_name not in self.processors:
            return False
        
        processor = self.processors[processor_name]
        
        try:
            for item in data:
                if isinstance(item, dict):
                    result = processor(item)
                    if result:
                        self.results.append(result)
                elif isinstance(item, (list, tuple)):
                    for sub_item in item:
                        result = processor(sub_item)
                        if result:
                            self.results.append(result)
                else:
                    result = processor({"value": item})
                    if result:
                        self.results.append(result)
            return True
        except Exception:
            return False

# Test functions for different scenarios
def test_guidance_scenarios():
    """
    Test function to verify guidance system scenarios:
    1. No analysis data available (should show guidance prompts)
    2. Analysis in progress (should show progress indicators)
    3. Analysis complete (should show complexity metrics)
    4. Analysis error (should show error guidance)
    """
    
    # Create test instances
    test_class = TestAnalysisClass("GuidanceTest")
    processor = DataProcessor()
    
    # Test data
    test_data = [
        {"id": 1, "value": 10, "name": "test1"},
        {"id": 2, "value": 20, "name": "test2"},
        {"id": 3, "value": -5, "name": "test3"}
    ]
    
    # Process with different modes
    results_standard = test_class.complex_method(test_data, "standard")
    results_advanced = test_class.complex_method(test_data, "advanced")
    
    # Test simple functions
    simple_result = simple_function()
    moderate_result = moderately_complex_function(test_data, 5)
    complex_result = highly_complex_function(10, 20, 30, "complex")
    
    return {
        "simple": simple_result,
        "moderate": moderate_result,
        "complex": complex_result,
        "class_stats": test_class.get_statistics(),
        "processing_results": {
            "standard": results_standard,
            "advanced": results_advanced
        }
    }

if __name__ == "__main__":
    """
    Main execution block for testing.
    When this file is opened in VS Code with DoraCodeLens enabled,
    it should trigger the guidance system if no analysis has been run.
    """
    print("DoraCodeLens Guidance System Test")
    print("=" * 40)
    
    # Run test scenarios
    results = test_guidance_scenarios()
    
    print("Test completed successfully!")
    print(f"Results: {results}")