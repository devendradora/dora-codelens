#!/usr/bin/env python3
"""
Unit tests for the CodeMindMap analyzer core functionality.
"""

import json
import tempfile
import unittest
from pathlib import Path
from analyzer import (
    ProjectAnalyzer, AnalysisResult, ComplexityScore, ComplexityLevel,
    FunctionInfo, ModuleInfo, Parameter, AnalysisError
)


class TestAnalyzerCore(unittest.TestCase):
    """Test cases for core analyzer functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.project_path = Path(self.temp_dir)
        
        # Create a simple Python file for testing
        test_file = self.project_path / "test_module.py"
        test_file.write_text('''
def simple_function():
    """A simple function."""
    return "hello"

def complex_function(a, b, c=None):
    """A more complex function."""
    if a > 0:
        if b > 0:
            if c is not None:
                return a + b + c
            else:
                return a + b
        else:
            return a
    else:
        return 0

class TestClass:
    """A test class."""
    
    def method(self):
        return "method"
''')
    
    def tearDown(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir)
    
    def test_analyzer_initialization(self):
        """Test analyzer initialization."""
        analyzer = ProjectAnalyzer(self.project_path)
        self.assertEqual(analyzer.project_path.resolve(), self.project_path.resolve())
        self.assertEqual(len(analyzer.errors), 0)
        self.assertEqual(len(analyzer.warnings), 0)
    
    def test_analyzer_initialization_invalid_path(self):
        """Test analyzer initialization with invalid path."""
        with self.assertRaises(AnalysisError):
            ProjectAnalyzer("/nonexistent/path")
    
    def test_discover_python_files(self):
        """Test Python file discovery."""
        analyzer = ProjectAnalyzer(self.project_path)
        files = analyzer._discover_python_files()
        
        self.assertEqual(len(files), 1)
        self.assertTrue(files[0].name == "test_module.py")
    
    def test_basic_analysis(self):
        """Test basic project analysis."""
        analyzer = ProjectAnalyzer(self.project_path)
        result = analyzer.analyze_project()
        
        self.assertIsInstance(result, AnalysisResult)
        self.assertTrue(result.success)
        self.assertIsNotNone(result.tech_stack)
        self.assertIsNotNone(result.modules)
        self.assertIsNotNone(result.module_graph)
        self.assertIsNotNone(result.call_graph)
        self.assertIsNotNone(result.metadata)
    
    def test_analysis_result_json_serialization(self):
        """Test JSON serialization of analysis results."""
        analyzer = ProjectAnalyzer(self.project_path)
        result = analyzer.analyze_project()
        
        json_str = result.to_json()
        self.assertIsInstance(json_str, str)
        
        # Verify it's valid JSON
        parsed = json.loads(json_str)
        self.assertIn("success", parsed)
        self.assertIn("tech_stack", parsed)
        self.assertIn("modules", parsed)
        self.assertIn("metadata", parsed)
    
    def test_complexity_score(self):
        """Test complexity score calculation."""
        # Test low complexity
        low_complexity = ComplexityScore(cyclomatic=3)
        self.assertEqual(low_complexity.level, ComplexityLevel.LOW)
        
        # Test medium complexity
        medium_complexity = ComplexityScore(cyclomatic=8)
        self.assertEqual(medium_complexity.level, ComplexityLevel.MEDIUM)
        
        # Test high complexity
        high_complexity = ComplexityScore(cyclomatic=15)
        self.assertEqual(high_complexity.level, ComplexityLevel.HIGH)
    
    def test_error_handling(self):
        """Test error handling functionality."""
        analyzer = ProjectAnalyzer(self.project_path)
        
        # Add test error
        analyzer._add_error("test_error", "Test error message", "test.py", 42)
        
        self.assertEqual(len(analyzer.errors), 1)
        error = analyzer.errors[0]
        self.assertEqual(error["type"], "test_error")
        self.assertEqual(error["message"], "Test error message")
        self.assertEqual(error["file"], "test.py")
        self.assertEqual(error["line"], 42)
    
    def test_warning_handling(self):
        """Test warning handling functionality."""
        analyzer = ProjectAnalyzer(self.project_path)
        
        # Add test warning
        analyzer._add_warning("test_warning", "Test warning message", "test.py")
        
        self.assertEqual(len(analyzer.warnings), 1)
        warning = analyzer.warnings[0]
        self.assertEqual(warning["type"], "test_warning")
        self.assertEqual(warning["message"], "Test warning message")
        self.assertEqual(warning["file"], "test.py")


class TestDataModels(unittest.TestCase):
    """Test cases for data model classes."""
    
    def test_parameter_creation(self):
        """Test Parameter dataclass creation."""
        param = Parameter(name="test", type_hint="str", default_value="default")
        self.assertEqual(param.name, "test")
        self.assertEqual(param.type_hint, "str")
        self.assertEqual(param.default_value, "default")
        self.assertFalse(param.is_vararg)
        self.assertFalse(param.is_kwarg)
    
    def test_function_info_creation(self):
        """Test FunctionInfo dataclass creation."""
        complexity = ComplexityScore(cyclomatic=5)
        params = [Parameter(name="arg1"), Parameter(name="arg2")]
        
        func_info = FunctionInfo(
            name="test_func",
            module="test_module",
            line_number=10,
            complexity=complexity,
            parameters=params
        )
        
        self.assertEqual(func_info.name, "test_func")
        self.assertEqual(func_info.module, "test_module")
        self.assertEqual(func_info.line_number, 10)
        self.assertEqual(func_info.complexity, complexity)
        self.assertEqual(len(func_info.parameters), 2)
        self.assertFalse(func_info.is_method)
        self.assertFalse(func_info.is_async)


if __name__ == "__main__":
    unittest.main()