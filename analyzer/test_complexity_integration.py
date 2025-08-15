#!/usr/bin/env python3
"""
Integration tests for complexity analysis with radon.
"""

import unittest
import tempfile
import os
from pathlib import Path

from complexity_analyzer import ComplexityAnalyzer, ComplexityThresholds, RADON_AVAILABLE
from ast_parser import ASTParser
from analyzer import ComplexityLevel


class TestComplexityIntegration(unittest.TestCase):
    """Integration tests for complexity analysis."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.analyzer = ComplexityAnalyzer()
        self.ast_parser = ASTParser()
        self.temp_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir)
    
    def test_complexity_thresholds(self):
        """Test complexity threshold calculations."""
        # Test low complexity
        self.assertEqual(ComplexityThresholds.get_complexity_level(1), ComplexityLevel.LOW)
        self.assertEqual(ComplexityThresholds.get_complexity_level(5), ComplexityLevel.LOW)
        
        # Test medium complexity
        self.assertEqual(ComplexityThresholds.get_complexity_level(6), ComplexityLevel.MEDIUM)
        self.assertEqual(ComplexityThresholds.get_complexity_level(10), ComplexityLevel.MEDIUM)
        
        # Test high complexity
        self.assertEqual(ComplexityThresholds.get_complexity_level(11), ComplexityLevel.HIGH)
        self.assertEqual(ComplexityThresholds.get_complexity_level(20), ComplexityLevel.HIGH)
        
        # Test color codes
        self.assertEqual(ComplexityThresholds.get_color_code(ComplexityLevel.LOW), "green")
        self.assertEqual(ComplexityThresholds.get_color_code(ComplexityLevel.MEDIUM), "orange")
        self.assertEqual(ComplexityThresholds.get_color_code(ComplexityLevel.HIGH), "red")
    
    def test_file_complexity_analysis(self):
        """Test complexity analysis on actual Python files."""
        # Create a test file with varying complexity
        test_content = '''
def simple_function():
    """Simple function with low complexity."""
    return 42

def medium_function(x):
    """Function with medium complexity."""
    if x > 0:
        if x > 10:
            return x * 2
        else:
            return x + 1
    else:
        return 0

def complex_function(data):
    """Function with high complexity."""
    result = []
    for item in data:
        if isinstance(item, dict):
            if 'value' in item:
                if item['value'] > 100:
                    result.append(item['value'] * 2)
                elif item['value'] > 50:
                    result.append(item['value'] * 1.5)
                elif item['value'] > 0:
                    result.append(item['value'])
                else:
                    result.append(0)
            else:
                result.append(None)
        elif isinstance(item, (int, float)):
            if item > 0:
                result.append(item)
            else:
                result.append(0)
        else:
            result.append(str(item))
    return result
'''
        
        # Write test file
        test_file = Path(self.temp_dir) / "test_complexity.py"
        with open(test_file, 'w') as f:
            f.write(test_content)
        
        # Parse the file
        module_info = self.ast_parser.parse_file(test_file)
        self.assertIsNotNone(module_info)
        self.assertEqual(len(module_info.functions), 3)
        
        # Enhance with complexity analysis
        enhanced_module = self.analyzer.enhance_module_complexity(module_info)
        
        # Verify complexity levels are assigned
        function_complexities = {func.name: func.complexity for func in enhanced_module.functions}
        
        # Simple function should be low complexity
        self.assertEqual(function_complexities['simple_function'].level, ComplexityLevel.LOW)
        
        # Medium function should be medium or low complexity
        self.assertIn(function_complexities['medium_function'].level, 
                     [ComplexityLevel.LOW, ComplexityLevel.MEDIUM])
        
        # Complex function should be medium or high complexity (depends on exact radon calculation)
        self.assertIn(function_complexities['complex_function'].level, 
                     [ComplexityLevel.MEDIUM, ComplexityLevel.HIGH])
        
        # Verify cyclomatic complexity values are reasonable
        self.assertGreaterEqual(function_complexities['simple_function'].cyclomatic, 1)
        self.assertGreaterEqual(function_complexities['medium_function'].cyclomatic, 3)
        self.assertGreaterEqual(function_complexities['complex_function'].cyclomatic, 6)
    
    def test_module_enhancement(self):
        """Test module-level complexity enhancement."""
        # Create a simple test file
        test_content = '''
def func1():
    return 1

def func2(x):
    if x > 0:
        return x
    return 0
'''
        
        test_file = Path(self.temp_dir) / "simple_module.py"
        with open(test_file, 'w') as f:
            f.write(test_content)
        
        # Parse and enhance
        module_info = self.ast_parser.parse_file(test_file)
        enhanced_module = self.analyzer.enhance_module_complexity(module_info)
        
        # Verify module complexity is calculated
        self.assertIsNotNone(enhanced_module.complexity)
        self.assertGreaterEqual(enhanced_module.complexity.cyclomatic, 2)  # Sum of function complexities
        self.assertIn(enhanced_module.complexity.level, 
                     [ComplexityLevel.LOW, ComplexityLevel.MEDIUM, ComplexityLevel.HIGH])
    
    def test_project_statistics(self):
        """Test project-wide complexity statistics."""
        # Create multiple test modules
        modules = []
        
        for i, content in enumerate([
            'def low_func(): return 1',
            'def med_func(x):\n    if x > 0:\n        return x\n    return 0',
            'def high_func(x):\n    for i in range(x):\n        if i > 5:\n            if i > 10:\n                return i\n    return 0'
        ]):
            test_file = Path(self.temp_dir) / f"module_{i}.py"
            with open(test_file, 'w') as f:
                f.write(content)
            
            module_info = self.ast_parser.parse_file(test_file)
            enhanced_module = self.analyzer.enhance_module_complexity(module_info)
            modules.append(enhanced_module)
        
        # Calculate project statistics
        stats = self.analyzer.calculate_project_complexity_stats(modules)
        
        # Verify statistics structure
        self.assertEqual(stats['total_modules'], 3)
        self.assertEqual(stats['total_functions'], 3)
        self.assertGreater(stats['average_complexity'], 0)
        self.assertGreater(stats['max_complexity'], 0)
        
        # Verify distribution
        distribution = stats['complexity_distribution']
        self.assertIn('low', distribution)
        self.assertIn('medium', distribution)
        self.assertIn('high', distribution)
        
        # Verify most complex functions list
        self.assertIsInstance(stats['most_complex_functions'], list)
        self.assertLessEqual(len(stats['most_complex_functions']), 5)
    
    def test_color_mapping(self):
        """Test complexity color mapping."""
        # Create a simple module
        test_content = '''
def simple(): return 1
def complex(x):
    if x > 0:
        if x > 10:
            if x > 20:
                return x * 3
            return x * 2
        return x + 1
    return 0
'''
        
        test_file = Path(self.temp_dir) / "color_test.py"
        with open(test_file, 'w') as f:
            f.write(test_content)
        
        module_info = self.ast_parser.parse_file(test_file)
        enhanced_module = self.analyzer.enhance_module_complexity(module_info)
        
        # Get color mapping
        color_map = self.analyzer.get_complexity_color_map([enhanced_module])
        
        # Verify color mapping structure
        module_key = f"module:{enhanced_module.name}"
        self.assertIn(module_key, color_map)
        self.assertIn(color_map[module_key], ["green", "orange", "red"])
        
        # Verify function color mappings
        for func in enhanced_module.functions:
            func_key = f"function:{enhanced_module.name}.{func.name}"
            self.assertIn(func_key, color_map)
            self.assertIn(color_map[func_key], ["green", "orange", "red"])
    
    def test_cognitive_complexity_estimation(self):
        """Test cognitive complexity estimation."""
        # Test various cyclomatic complexity values
        test_cases = [
            (1, 1),    # 1 * 1.2 = 1.2 -> 1
            (5, 6),    # 5 * 1.2 = 6
            (10, 12),  # 10 * 1.2 = 12
            (0, 0),    # Edge case: 0
        ]
        
        for cyclomatic, expected_cognitive in test_cases:
            cognitive = self.analyzer._estimate_cognitive_complexity(cyclomatic)
            self.assertEqual(cognitive, expected_cognitive)


if __name__ == '__main__':
    unittest.main()