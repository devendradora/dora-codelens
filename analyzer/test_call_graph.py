#!/usr/bin/env python3
"""
Unit tests for call graph analysis functionality.
"""

import ast
import pytest
from pathlib import Path
from unittest.mock import Mock, patch
from typing import List

from call_graph import CallGraphBuilder, CallExtractorVisitor, CallHierarchyAnalyzer
from analyzer import (
    ModuleInfo, FunctionInfo, ClassInfo, Parameter, ComplexityScore,
    FunctionNode, CallEdge, CallGraph
)


class TestCallGraphBuilder:
    """Test cases for CallGraphBuilder."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.builder = CallGraphBuilder()
    
    def create_sample_function(self, name: str, module: str, line_number: int = 1) -> FunctionInfo:
        """Create a sample function for testing."""
        return FunctionInfo(
            name=name,
            module=module,
            line_number=line_number,
            complexity=ComplexityScore(cyclomatic=1),
            parameters=[],
            is_method=False,
            is_async=False
        )
    
    def create_sample_module(self, name: str, functions: List[FunctionInfo], classes: List[ClassInfo] = None) -> ModuleInfo:
        """Create a sample module for testing."""
        if classes is None:
            classes = []
        
        return ModuleInfo(
            name=name,
            path=f"/fake/path/{name}.py",
            functions=functions,
            classes=classes,
            imports=[],
            complexity=ComplexityScore(cyclomatic=1),
            size_lines=100
        )
    
    def test_register_functions(self):
        """Test function registration from modules."""
        func1 = self.create_sample_function("func1", "module1")
        func2 = self.create_sample_function("func2", "module1")
        module = self.create_sample_module("module1", [func1, func2])
        
        self.builder._register_functions([module])
        
        assert "module1.func1" in self.builder.function_registry
        assert "module1.func2" in self.builder.function_registry
        assert len(self.builder.function_registry) == 2
    
    def test_register_class_methods(self):
        """Test registration of class methods."""
        method1 = self.create_sample_function("method1", "module1")
        method1.is_method = True
        method2 = self.create_sample_function("method2", "module1")
        method2.is_method = True
        
        class_info = ClassInfo(
            name="TestClass",
            module="module1",
            line_number=1,
            methods=[method1, method2],
            base_classes=[]
        )
        
        module = self.create_sample_module("module1", [], [class_info])
        
        self.builder._register_functions([module])
        
        assert "module1.TestClass.method1" in self.builder.function_registry
        assert "module1.TestClass.method2" in self.builder.function_registry
        assert len(self.builder.function_registry) == 2
    
    def test_build_function_nodes(self):
        """Test building function nodes from registry."""
        func1 = self.create_sample_function("func1", "module1", 10)
        func1.parameters = [Parameter(name="arg1", type_hint="str")]
        
        self.builder.function_registry["module1.func1"] = func1
        
        nodes = self.builder._build_function_nodes()
        
        assert len(nodes) == 1
        node = nodes[0]
        assert node.id == "module1.func1"
        assert node.name == "func1"
        assert node.module == "module1"
        assert node.line_number == 10
        assert len(node.parameters) == 1
        assert node.parameters[0].name == "arg1"
    
    def test_build_call_edges(self):
        """Test building call edges from relationships."""
        # Add some call relationships
        self.builder.call_relationships = [
            ("module1.func1", "module1.func2", 5),
            ("module1.func1", "module1.func2", 10),  # Duplicate call
            ("module1.func2", "module1.func3", 15)
        ]
        
        edges = self.builder._build_call_edges()
        
        assert len(edges) == 2
        
        # Find the edge with multiple calls
        edge1 = next(e for e in edges if e.caller == "module1.func1")
        assert edge1.callee == "module1.func2"
        assert edge1.call_count == 2
        assert edge1.line_numbers == [5, 10]
        
        # Find the single call edge
        edge2 = next(e for e in edges if e.caller == "module1.func2")
        assert edge2.callee == "module1.func3"
        assert edge2.call_count == 1
        assert edge2.line_numbers == [15]
    
    @patch('builtins.open')
    @patch('pathlib.Path.exists')
    def test_extract_function_calls_integration(self, mock_exists, mock_open):
        """Test integration of call extraction with file parsing."""
        # Mock file system
        mock_exists.return_value = True
        mock_open.return_value.__enter__.return_value.read.return_value = """
def func1():
    func2()
    return True

def func2():
    func3()

def func3():
    pass
"""
        
        # Create test modules
        func1 = self.create_sample_function("func1", "test_module")
        func2 = self.create_sample_function("func2", "test_module")
        func3 = self.create_sample_function("func3", "test_module")
        module = self.create_sample_module("test_module", [func1, func2, func3])
        
        # Build call graph
        call_graph = self.builder.build_call_graph([module])
        
        # Verify nodes
        assert len(call_graph.nodes) == 3
        node_names = {node.name for node in call_graph.nodes}
        assert node_names == {"func1", "func2", "func3"}
        
        # Verify edges (calls)
        assert len(call_graph.edges) >= 2  # At least func1->func2 and func2->func3


class TestCallExtractorVisitor:
    """Test cases for CallExtractorVisitor."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.function_registry = {
            "test_module.func1": Mock(),
            "test_module.func2": Mock(),
            "test_module.TestClass.method1": Mock()
        }
        self.visitor = CallExtractorVisitor("test_module", self.function_registry)
    
    def test_visit_import(self):
        """Test import statement handling."""
        code = "import os as operating_system"
        tree = ast.parse(code)
        self.visitor.visit(tree)
        
        assert "operating_system" in self.visitor.imports
        assert self.visitor.imports["operating_system"] == "os"
    
    def test_visit_import_from(self):
        """Test from-import statement handling."""
        code = "from pathlib import Path as P"
        tree = ast.parse(code)
        self.visitor.visit(tree)
        
        assert "P" in self.visitor.imports
        assert self.visitor.imports["P"] == "pathlib.Path"
    
    def test_function_context_tracking(self):
        """Test function context tracking during traversal."""
        code = """
def outer_func():
    def inner_func():
        pass
    inner_func()
"""
        tree = ast.parse(code)
        
        # Mock the function registry to include our functions
        self.visitor.function_registry["test_module.outer_func"] = Mock()
        self.visitor.function_registry["test_module.inner_func"] = Mock()
        
        self.visitor.visit(tree)
        
        # Should track function context properly
        assert len(self.visitor.current_function_stack) == 0  # Should be empty after traversal
    
    def test_resolve_simple_function_call(self):
        """Test resolving simple function calls."""
        # Test local function call
        func_node = ast.Name(id="func1", ctx=ast.Load())
        result = self.visitor._resolve_call_target(func_node)
        assert result == "test_module.func1"
        
        # Test unknown function
        func_node = ast.Name(id="unknown_func", ctx=ast.Load())
        result = self.visitor._resolve_call_target(func_node)
        assert result is None
    
    def test_resolve_method_call(self):
        """Test resolving method calls."""
        # Test self.method() call
        self.visitor.current_class = "TestClass"
        attr_node = ast.Attribute(
            value=ast.Name(id="self", ctx=ast.Load()),
            attr="method1",
            ctx=ast.Load()
        )
        result = self.visitor._resolve_attribute_call(attr_node)
        assert result == "test_module.TestClass.method1"
    
    def test_call_extraction_integration(self):
        """Test complete call extraction from code."""
        code = """
def func1():
    func2()
    return True

def func2():
    pass
"""
        tree = ast.parse(code)
        
        # Set up function registry
        self.visitor.function_registry = {
            "test_module.func1": Mock(),
            "test_module.func2": Mock()
        }
        
        self.visitor.visit(tree)
        
        # Should have extracted the func1 -> func2 call
        assert len(self.visitor.call_relationships) >= 1
        caller, callee, line_num = self.visitor.call_relationships[0]
        assert caller == "test_module.func1"
        assert callee == "test_module.func2"
        assert isinstance(line_num, int)


class TestCallHierarchyAnalyzer:
    """Test cases for CallHierarchyAnalyzer."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # Create a sample call graph
        nodes = [
            FunctionNode("mod.func1", "func1", "mod", 1, 1, []),
            FunctionNode("mod.func2", "func2", "mod", 1, 5, []),
            FunctionNode("mod.func3", "func3", "mod", 1, 10, []),
            FunctionNode("mod.func4", "func4", "mod", 1, 15, [])
        ]
        
        edges = [
            CallEdge("mod.func1", "mod.func2", 1, [5]),
            CallEdge("mod.func2", "mod.func3", 1, [8]),
            CallEdge("mod.func1", "mod.func3", 1, [7]),  # Direct call
            CallEdge("mod.func4", "mod.func1", 1, [3])   # func4 calls func1
        ]
        
        self.call_graph = CallGraph(nodes=nodes, edges=edges)
        self.analyzer = CallHierarchyAnalyzer(self.call_graph)
    
    def test_build_lookup_maps(self):
        """Test building of lookup maps."""
        # Check callers map
        assert "mod.func2" in self.analyzer.callers_map["mod.func3"]
        assert "mod.func1" in self.analyzer.callers_map["mod.func3"]
        assert "mod.func4" in self.analyzer.callers_map["mod.func1"]
        
        # Check callees map
        assert "mod.func2" in self.analyzer.callees_map["mod.func1"]
        assert "mod.func3" in self.analyzer.callees_map["mod.func1"]
        assert "mod.func3" in self.analyzer.callees_map["mod.func2"]
    
    def test_get_callers(self):
        """Test getting callers of a function."""
        callers = self.analyzer.get_callers("mod.func3")
        
        # func3 is called by func1 and func2
        assert "mod.func1" in callers
        assert "mod.func2" in callers
        
        # func4 should also be included as it calls func1 which calls func3
        assert "mod.func4" in callers
        
        # Check depth levels
        assert callers["mod.func1"] == 1  # Direct caller
        assert callers["mod.func2"] == 1  # Direct caller
        assert callers["mod.func4"] == 2  # Indirect caller (through func1)
    
    def test_get_callees(self):
        """Test getting callees of a function."""
        callees = self.analyzer.get_callees("mod.func1")
        
        # func1 calls func2 and func3
        assert "mod.func2" in callees
        assert "mod.func3" in callees
        
        # Check depth levels
        assert callees["mod.func2"] == 1  # Direct callee
        assert callees["mod.func3"] == 1  # Direct callee (also indirect through func2)
    
    def test_get_call_hierarchy(self):
        """Test getting complete call hierarchy."""
        hierarchy = self.analyzer.get_call_hierarchy("mod.func1")
        
        assert hierarchy["function"].id == "mod.func1"
        assert hierarchy["total_callers"] == 1  # func4
        assert hierarchy["total_callees"] == 2  # func2, func3
        
        assert "mod.func4" in hierarchy["callers"]
        assert "mod.func2" in hierarchy["callees"]
        assert "mod.func3" in hierarchy["callees"]
    
    def test_filter_by_module(self):
        """Test filtering call graph by module."""
        # Add a function from different module
        other_node = FunctionNode("other.func5", "func5", "other", 1, 20, [])
        self.call_graph.nodes.append(other_node)
        
        filtered_graph = self.analyzer.filter_by_module("mod")
        
        # Should only include functions from 'mod' module
        assert len(filtered_graph.nodes) == 4
        for node in filtered_graph.nodes:
            assert node.module == "mod"
        
        # Edges should also be filtered
        for edge in filtered_graph.edges:
            assert edge.caller.startswith("mod.")
            assert edge.callee.startswith("mod.")
    
    def test_search_functions(self):
        """Test function search functionality."""
        # Search by function name
        results = self.analyzer.search_functions("func1")
        assert len(results) == 1
        assert results[0].name == "func1"
        
        # Search by module name
        results = self.analyzer.search_functions("mod")
        assert len(results) == 4  # All functions are in 'mod' module
        
        # Search with no matches
        results = self.analyzer.search_functions("nonexistent")
        assert len(results) == 0


if __name__ == "__main__":
    pytest.main([__file__])