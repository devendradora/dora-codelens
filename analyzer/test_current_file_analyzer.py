#!/usr/bin/env python3
"""
Tests for CurrentFileAnalyzer

This module contains unit tests for the current file analysis functionality.
"""

import unittest
import tempfile
import json
from pathlib import Path
from unittest.mock import patch, MagicMock

from current_file_analyzer import (
    CurrentFileAnalyzer, 
    FileAnalysisResult, 
    FileComplexityMetrics,
    FileDependencyInfo,
    FileFrameworkPatterns
)
from analyzer import ComplexityScore, ComplexityLevel


class TestCurrentFileAnalyzer(unittest.TestCase):
    """Test cases for CurrentFileAnalyzer."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.analyzer = CurrentFileAnalyzer()
        self.temp_dir = Path(tempfile.mkdtemp())
    
    def tearDown(self):
        """Clean up test fixtures."""
        # Clean up temporary files
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def create_test_file(self, content: str, filename: str = "test.py") -> Path:
        """Create a temporary test file with given content."""
        file_path = self.temp_dir / filename
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return file_path
    
    def test_analyze_simple_function(self):
        """Test analysis of a simple function."""
        content = '''
def simple_function(x, y):
    """A simple function."""
    return x + y
'''
        file_path = self.create_test_file(content)
        result = self.analyzer.analyze_file(file_path)
        
        self.assertTrue(result.success)
        self.assertEqual(len(result.complexity_metrics.function_complexities), 1)
        
        func = result.complexity_metrics.function_complexities[0]
        self.assertEqual(func.name, "simple_function")
        self.assertEqual(len(func.parameters), 2)
        self.assertEqual(func.parameters[0].name, "x")
        self.assertEqual(func.parameters[1].name, "y")
        self.assertEqual(func.docstring, "A simple function.")
        self.assertFalse(func.is_async)
        self.assertFalse(func.is_method)
    
    def test_analyze_complex_function(self):
        """Test analysis of a function with higher complexity."""
        content = '''
def complex_function(x, y, z=None):
    """A more complex function."""
    if x > 0:
        if y > 0:
            for i in range(x):
                if i % 2 == 0:
                    yield i
        else:
            while y < 0:
                y += 1
    elif z is not None:
        try:
            return z / x
        except ZeroDivisionError:
            return 0
    else:
        return None
'''
        file_path = self.create_test_file(content)
        result = self.analyzer.analyze_file(file_path)
        
        self.assertTrue(result.success)
        self.assertEqual(len(result.complexity_metrics.function_complexities), 1)
        
        func = result.complexity_metrics.function_complexities[0]
        self.assertEqual(func.name, "complex_function")
        self.assertGreater(func.complexity.cyclomatic, 5)  # Should have high complexity
        self.assertEqual(func.complexity.level, ComplexityLevel.HIGH)
    
    def test_analyze_class_with_methods(self):
        """Test analysis of a class with methods."""
        content = '''
class TestClass:
    """A test class."""
    
    def __init__(self, value):
        self.value = value
    
    def get_value(self):
        """Get the value."""
        return self.value
    
    def set_value(self, new_value):
        """Set the value."""
        if new_value > 0:
            self.value = new_value
        else:
            raise ValueError("Value must be positive")
    
    async def async_method(self):
        """An async method."""
        return await some_async_operation()
'''
        file_path = self.create_test_file(content)
        result = self.analyzer.analyze_file(file_path)
        
        self.assertTrue(result.success)
        self.assertEqual(len(result.complexity_metrics.class_complexities), 1)
        
        cls = result.complexity_metrics.class_complexities[0]
        self.assertEqual(cls.name, "TestClass")
        self.assertEqual(len(cls.methods), 4)  # __init__, get_value, set_value, async_method
        
        # Check method properties
        method_names = [method.name for method in cls.methods]
        self.assertIn("__init__", method_names)
        self.assertIn("get_value", method_names)
        self.assertIn("set_value", method_names)
        self.assertIn("async_method", method_names)
        
        # Check async method
        async_method = next(method for method in cls.methods if method.name == "async_method")
        self.assertTrue(async_method.is_async)
        self.assertTrue(async_method.is_method)
    
    def test_analyze_imports(self):
        """Test analysis of import statements."""
        content = '''
import os
import sys
from pathlib import Path
from typing import List, Dict, Optional
import requests
import django
from flask import Flask, request
from mymodule import myfunction
'''
        file_path = self.create_test_file(content)
        result = self.analyzer.analyze_file(file_path)
        
        self.assertTrue(result.success)
        
        # Check imports
        imports = result.dependency_info.imports
        self.assertGreater(len(imports), 0)
        
        # Check categorization
        self.assertIn("os", result.dependency_info.standard_library_imports)
        self.assertIn("sys", result.dependency_info.standard_library_imports)
        self.assertIn("pathlib", result.dependency_info.standard_library_imports)
        self.assertIn("typing", result.dependency_info.standard_library_imports)
        
        self.assertIn("requests", result.dependency_info.external_dependencies)
        
        self.assertIn("django", result.dependency_info.framework_imports)
        self.assertIn("flask", result.dependency_info.framework_imports)
    
    def test_analyze_django_patterns(self):
        """Test detection of Django patterns."""
        content = '''
from django.db import models
from django.http import HttpResponse

class User(models.Model):
    """User model."""
    name = models.CharField(max_length=100)
    email = models.EmailField()

def user_view(request):
    """A Django view."""
    users = User.objects.all()
    return HttpResponse("Users")
'''
        file_path = self.create_test_file(content)
        result = self.analyzer.analyze_file(file_path)
        
        self.assertTrue(result.success)
        self.assertIn("django", result.framework_patterns.detected_frameworks)
        self.assertGreater(len(result.framework_patterns.django_patterns), 0)
        
        # Check for model pattern
        model_patterns = [p for p in result.framework_patterns.django_patterns if p.get('type') == 'model']
        self.assertGreater(len(model_patterns), 0)
        self.assertEqual(model_patterns[0]['name'], 'User')
    
    def test_analyze_flask_patterns(self):
        """Test detection of Flask patterns."""
        content = '''
from flask import Flask, request

app = Flask(__name__)

@app.route('/')
def index():
    """Index route."""
    return "Hello World"

@app.route('/users/<int:user_id>')
def get_user(user_id):
    """Get user route."""
    return f"User {user_id}"
'''
        file_path = self.create_test_file(content)
        result = self.analyzer.analyze_file(file_path)
        
        self.assertTrue(result.success)
        self.assertIn("flask", result.framework_patterns.detected_frameworks)
        self.assertGreater(len(result.framework_patterns.flask_patterns), 0)
        
        # Check for route patterns
        route_patterns = [p for p in result.framework_patterns.flask_patterns if p.get('type') == 'route']
        self.assertGreater(len(route_patterns), 0)
    
    def test_analyze_fastapi_patterns(self):
        """Test detection of FastAPI patterns."""
        content = '''
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    """Root endpoint."""
    return {"Hello": "World"}

@app.post("/items/")
def create_item(item: dict):
    """Create item endpoint."""
    return item
'''
        file_path = self.create_test_file(content)
        result = self.analyzer.analyze_file(file_path)
        
        self.assertTrue(result.success)
        self.assertIn("fastapi", result.framework_patterns.detected_frameworks)
        self.assertGreater(len(result.framework_patterns.fastapi_patterns), 0)
        
        # Check for endpoint patterns
        endpoint_patterns = [p for p in result.framework_patterns.fastapi_patterns if p.get('type') == 'endpoint']
        self.assertGreater(len(endpoint_patterns), 0)
    
    def test_analyze_syntax_error(self):
        """Test handling of syntax errors."""
        content = '''
def broken_function(
    # Missing closing parenthesis and colon
    return "This will cause a syntax error"
'''
        file_path = self.create_test_file(content)
        result = self.analyzer.analyze_file(file_path)
        
        self.assertFalse(result.success)
        self.assertGreater(len(result.errors), 0)
        
        # Check error type
        syntax_errors = [e for e in result.errors if e['type'] == 'syntax_error']
        self.assertGreater(len(syntax_errors), 0)
    
    def test_analyze_nonexistent_file(self):
        """Test handling of nonexistent files."""
        nonexistent_path = self.temp_dir / "nonexistent.py"
        result = self.analyzer.analyze_file(nonexistent_path)
        
        self.assertFalse(result.success)
        self.assertGreater(len(result.errors), 0)
        
        # Check error type
        file_errors = [e for e in result.errors if e['type'] == 'file_not_found']
        self.assertGreater(len(file_errors), 0)
    
    def test_analyze_non_python_file(self):
        """Test handling of non-Python files."""
        content = "This is not a Python file"
        file_path = self.temp_dir / "test.txt"
        with open(file_path, 'w') as f:
            f.write(content)
        
        result = self.analyzer.analyze_file(file_path)
        
        self.assertFalse(result.success)
        self.assertGreater(len(result.errors), 0)
        
        # Check error type
        type_errors = [e for e in result.errors if e['type'] == 'invalid_file_type']
        self.assertGreater(len(type_errors), 0)
    
    def test_line_counting(self):
        """Test line counting functionality."""
        content = '''# This is a comment
import os

def test_function():
    """Docstring."""
    # Another comment
    x = 1
    
    return x

# Final comment
'''
        file_path = self.create_test_file(content)
        result = self.analyzer.analyze_file(file_path)
        
        self.assertTrue(result.success)
        
        metrics = result.complexity_metrics
        self.assertGreater(metrics.total_lines, 0)
        self.assertGreater(metrics.code_lines, 0)
        self.assertGreater(metrics.comment_lines, 0)
        self.assertGreater(metrics.blank_lines, 0)
        
        # Total should equal sum of parts
        self.assertEqual(
            metrics.total_lines,
            metrics.code_lines + metrics.comment_lines + metrics.blank_lines
        )
    
    def test_maintainability_index(self):
        """Test maintainability index calculation."""
        # Simple function should have high maintainability
        simple_content = '''
def simple():
    return 1
'''
        simple_file = self.create_test_file(simple_content, "simple.py")
        simple_result = self.analyzer.analyze_file(simple_file)
        
        # Complex function should have lower maintainability
        complex_content = '''
def complex_function(a, b, c, d, e):
    if a > 0:
        if b > 0:
            if c > 0:
                if d > 0:
                    if e > 0:
                        for i in range(100):
                            for j in range(100):
                                if i % 2 == 0:
                                    if j % 2 == 0:
                                        print(i, j)
                                    else:
                                        print(j, i)
                                else:
                                    if j % 3 == 0:
                                        print("fizz")
                                    else:
                                        print("buzz")
    return "done"
'''
        complex_file = self.create_test_file(complex_content, "complex.py")
        complex_result = self.analyzer.analyze_file(complex_file)
        
        self.assertTrue(simple_result.success)
        self.assertTrue(complex_result.success)
        
        # Simple should have higher maintainability than complex
        self.assertGreater(
            simple_result.complexity_metrics.maintainability_index,
            complex_result.complexity_metrics.maintainability_index
        )
    
    def test_to_dict_serialization(self):
        """Test serialization to dictionary."""
        content = '''
import os
from typing import List

def test_function(x: int, y: str = "default") -> List[str]:
    """Test function."""
    return [str(x), y]
'''
        file_path = self.create_test_file(content)
        result = self.analyzer.analyze_file(file_path)
        
        self.assertTrue(result.success)
        
        # Test dictionary conversion
        result_dict = result.to_dict()
        self.assertIsInstance(result_dict, dict)
        
        # Check required keys
        required_keys = [
            'file_path', 'file_name', 'complexity_metrics', 
            'dependency_info', 'framework_patterns', 'tech_stack',
            'analysis_timestamp', 'success', 'errors', 'warnings'
        ]
        for key in required_keys:
            self.assertIn(key, result_dict)
        
        # Test JSON serialization
        json_str = result.to_json()
        self.assertIsInstance(json_str, str)
        
        # Should be valid JSON
        parsed = json.loads(json_str)
        self.assertIsInstance(parsed, dict)
    
    def test_with_project_context(self):
        """Test analyzer with project context for internal module detection."""
        # Create a project structure
        project_dir = self.temp_dir / "project"
        project_dir.mkdir()
        
        # Create internal module
        internal_module = project_dir / "internal_module.py"
        with open(internal_module, 'w') as f:
            f.write("def internal_function(): pass")
        
        # Create main file that imports internal module
        main_content = '''
import os
from internal_module import internal_function
import requests

def main():
    internal_function()
'''
        main_file = project_dir / "main.py"
        with open(main_file, 'w') as f:
            f.write(main_content)
        
        # Analyze with project context
        analyzer = CurrentFileAnalyzer(project_path=project_dir)
        result = analyzer.analyze_file(main_file)
        
        self.assertTrue(result.success)
        
        # Should detect internal dependency
        self.assertIn("internal_module", result.dependency_info.internal_dependencies)
        self.assertIn("requests", result.dependency_info.external_dependencies)
        self.assertIn("os", result.dependency_info.standard_library_imports)


class TestFileAnalysisResultSerialization(unittest.TestCase):
    """Test serialization of FileAnalysisResult."""
    
    def test_empty_result_serialization(self):
        """Test serialization of empty result."""
        from datetime import datetime
        from current_file_analyzer import FileComplexityMetrics, FileDependencyInfo, FileFrameworkPatterns
        from dependency_parser import TechStack
        from analyzer import ComplexityScore
        
        result = FileAnalysisResult(
            file_path="/test/path.py",
            file_name="path.py",
            complexity_metrics=FileComplexityMetrics(
                overall_complexity=ComplexityScore(cyclomatic=0),
                function_complexities=[],
                class_complexities=[],
                total_lines=0,
                code_lines=0,
                comment_lines=0,
                blank_lines=0,
                maintainability_index=100.0
            ),
            dependency_info=FileDependencyInfo(
                imports=[],
                external_dependencies=[],
                internal_dependencies=[],
                framework_imports=[],
                standard_library_imports=[]
            ),
            framework_patterns=FileFrameworkPatterns(
                django_patterns=[],
                flask_patterns=[],
                fastapi_patterns=[],
                detected_frameworks=[]
            ),
            tech_stack=TechStack(libraries=[], frameworks=[], python_version="3.8", package_manager="pip"),
            analysis_timestamp=datetime.now().isoformat(),
            success=True
        )
        
        # Should serialize without errors
        result_dict = result.to_dict()
        self.assertIsInstance(result_dict, dict)
        
        json_str = result.to_json()
        self.assertIsInstance(json_str, str)
        
        # Should be valid JSON
        parsed = json.loads(json_str)
        self.assertEqual(parsed['file_name'], 'path.py')
        self.assertTrue(parsed['success'])


if __name__ == '__main__':
    unittest.main()