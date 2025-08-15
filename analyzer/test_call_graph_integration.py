#!/usr/bin/env python3
"""
Integration tests for call graph functionality with the main analyzer.
"""

import pytest
import tempfile
import shutil
from pathlib import Path

from analyzer import ProjectAnalyzer


class TestCallGraphIntegration:
    """Integration tests for call graph analysis."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # Create a temporary directory for test projects
        self.temp_dir = Path(tempfile.mkdtemp())
    
    def teardown_method(self):
        """Clean up test fixtures."""
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir)
    
    def create_test_project(self, files: dict) -> Path:
        """Create a test project with given files.
        
        Args:
            files: Dictionary mapping file paths to content
            
        Returns:
            Path to the created project directory
        """
        project_dir = self.temp_dir / "test_project"
        project_dir.mkdir(parents=True, exist_ok=True)
        
        for file_path, content in files.items():
            full_path = project_dir / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(content)
        
        return project_dir
    
    def test_simple_call_graph_analysis(self):
        """Test call graph analysis with a simple project."""
        files = {
            "main.py": """
def main():
    helper()
    return True

def helper():
    utility()

def utility():
    pass
""",
            "module2.py": """
from main import helper

def process():
    helper()
    return "done"
"""
        }
        
        project_path = self.create_test_project(files)
        analyzer = ProjectAnalyzer(project_path)
        result = analyzer.analyze_project()
        
        # Verify analysis succeeded
        assert result.success
        
        # Verify call graph was built
        call_graph = result.call_graph
        assert len(call_graph.nodes) > 0
        assert len(call_graph.edges) > 0
        
        # Find specific functions
        function_names = {node.name for node in call_graph.nodes}
        assert "main" in function_names
        assert "helper" in function_names
        assert "utility" in function_names
        assert "process" in function_names
        
        # Verify call relationships exist
        call_pairs = {(edge.caller, edge.callee) for edge in call_graph.edges}
        
        # Should have main -> helper call
        main_to_helper = any(
            "main" in caller and "helper" in callee 
            for caller, callee in call_pairs
        )
        assert main_to_helper
        
        # Should have helper -> utility call
        helper_to_utility = any(
            "helper" in caller and "utility" in callee 
            for caller, callee in call_pairs
        )
        assert helper_to_utility
    
    def test_class_method_call_graph(self):
        """Test call graph analysis with class methods."""
        files = {
            "classes.py": """
class Calculator:
    def add(self, a, b):
        return self._validate(a) + self._validate(b)
    
    def _validate(self, value):
        if not isinstance(value, (int, float)):
            raise ValueError("Invalid type")
        return value
    
    def multiply(self, a, b):
        # Uses add method internally
        result = 0
        for _ in range(int(b)):
            result = self.add(result, a)
        return result

def use_calculator():
    calc = Calculator()
    return calc.add(1, 2)
"""
        }
        
        project_path = self.create_test_project(files)
        analyzer = ProjectAnalyzer(project_path)
        result = analyzer.analyze_project()
        
        # Verify analysis succeeded
        assert result.success
        
        # Verify call graph includes class methods
        call_graph = result.call_graph
        function_ids = {node.id for node in call_graph.nodes}
        
        # Should include class methods
        assert any("Calculator.add" in func_id for func_id in function_ids)
        assert any("Calculator._validate" in func_id for func_id in function_ids)
        assert any("Calculator.multiply" in func_id for func_id in function_ids)
        assert any("use_calculator" in func_id for func_id in function_ids)
        
        # Verify method calls
        call_pairs = {(edge.caller, edge.callee) for edge in call_graph.edges}
        
        # Should have add -> _validate calls
        add_to_validate = any(
            "add" in caller and "_validate" in callee 
            for caller, callee in call_pairs
        )
        assert add_to_validate
    
    def test_import_based_calls(self):
        """Test call graph analysis with imported function calls."""
        files = {
            "utils.py": """
def log_message(message):
    print(f"LOG: {message}")

def format_data(data):
    return str(data).upper()
""",
            "processor.py": """
from utils import log_message, format_data

def process_item(item):
    log_message(f"Processing {item}")
    formatted = format_data(item)
    log_message(f"Result: {formatted}")
    return formatted
""",
            "main.py": """
from processor import process_item

def main():
    items = ["hello", "world"]
    results = []
    for item in items:
        result = process_item(item)
        results.append(result)
    return results
"""
        }
        
        project_path = self.create_test_project(files)
        analyzer = ProjectAnalyzer(project_path)
        result = analyzer.analyze_project()
        
        # Verify analysis succeeded
        assert result.success
        
        # Verify call graph includes all functions
        call_graph = result.call_graph
        function_names = {node.name for node in call_graph.nodes}
        
        expected_functions = {"log_message", "format_data", "process_item", "main"}
        assert expected_functions.issubset(function_names)
        
        # Verify cross-module calls are detected
        call_pairs = {(edge.caller, edge.callee) for edge in call_graph.edges}
        
        # Should have main -> process_item call
        main_to_process = any(
            "main" in caller and "process_item" in callee 
            for caller, callee in call_pairs
        )
        assert main_to_process
        
        # Should have process_item -> log_message calls
        process_to_log = any(
            "process_item" in caller and "log_message" in callee 
            for caller, callee in call_pairs
        )
        assert process_to_log
    
    def test_call_graph_with_complexity(self):
        """Test that call graph includes complexity information."""
        files = {
            "complex.py": """
def simple_function():
    return True

def complex_function(x):
    if x > 0:
        if x > 10:
            for i in range(x):
                if i % 2 == 0:
                    simple_function()
                else:
                    pass
        else:
            simple_function()
    else:
        return False
    return True
"""
        }
        
        project_path = self.create_test_project(files)
        analyzer = ProjectAnalyzer(project_path)
        result = analyzer.analyze_project()
        
        # Verify analysis succeeded
        assert result.success
        
        # Verify call graph includes complexity scores
        call_graph = result.call_graph
        
        # Find the complex function
        complex_node = None
        simple_node = None
        
        for node in call_graph.nodes:
            if node.name == "complex_function":
                complex_node = node
            elif node.name == "simple_function":
                simple_node = node
        
        assert complex_node is not None
        assert simple_node is not None
        
        # Complex function should have higher complexity
        assert complex_node.complexity > simple_node.complexity
        assert simple_node.complexity >= 1  # Base complexity
        assert complex_node.complexity >= 5  # Should be high due to nested conditions


if __name__ == "__main__":
    pytest.main([__file__])