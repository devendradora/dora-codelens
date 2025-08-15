#!/usr/bin/env python3
"""
Call Graph Analysis module for CodeMindMap analyzer.

This module provides call graph analysis capabilities to extract function calls
and build call hierarchies from Python source files.
"""

import ast
import logging
from pathlib import Path
from typing import List, Dict, Set, Optional, Tuple, Any
from collections import defaultdict

from analyzer import (
    FunctionNode, CallEdge, CallGraph, ModuleInfo, FunctionInfo, Parameter
)

logger = logging.getLogger(__name__)


class CallGraphBuilder:
    """Builder for function call graphs from AST analysis."""
    
    def __init__(self):
        """Initialize the call graph builder."""
        self.function_registry: Dict[str, FunctionInfo] = {}
        self.call_relationships: List[Tuple[str, str, int]] = []  # (caller, callee, line_number)
        self.current_module = ""
        self.current_function = ""
    
    def build_call_graph(self, modules: List[ModuleInfo]) -> CallGraph:
        """Build a complete call graph from analyzed modules.
        
        Args:
            modules: List of analyzed modules
            
        Returns:
            CallGraph object containing nodes and edges
        """
        logger.info("Building call graph...")
        
        # Reset state
        self.function_registry.clear()
        self.call_relationships.clear()
        
        # First pass: Register all functions
        self._register_functions(modules)
        
        # Second pass: Extract function calls
        self._extract_function_calls(modules)
        
        # Build graph structure
        nodes = self._build_function_nodes()
        edges = self._build_call_edges()
        
        call_graph = CallGraph(nodes=nodes, edges=edges)
        
        logger.info(f"Built call graph with {len(nodes)} functions and {len(edges)} call relationships")
        return call_graph
    
    def _register_functions(self, modules: List[ModuleInfo]) -> None:
        """Register all functions from modules for reference lookup.
        
        Args:
            modules: List of analyzed modules
        """
        for module in modules:
            # Register module-level functions
            for func in module.functions:
                func_id = f"{module.name}.{func.name}"
                self.function_registry[func_id] = func
            
            # Register class methods
            for class_info in module.classes:
                for method in class_info.methods:
                    method_id = f"{module.name}.{class_info.name}.{method.name}"
                    self.function_registry[method_id] = method
    
    def _extract_function_calls(self, modules: List[ModuleInfo]) -> None:
        """Extract function calls from all modules.
        
        Args:
            modules: List of analyzed modules
        """
        for module in modules:
            self.current_module = module.name
            
            # Parse the module file to extract calls
            try:
                module_path = Path(module.path)
                if module_path.exists():
                    with open(module_path, 'r', encoding='utf-8') as f:
                        source_code = f.read()
                    
                    tree = ast.parse(source_code, filename=str(module_path))
                    self._analyze_calls_in_tree(tree)
                    
            except Exception as e:
                logger.error(f"Failed to extract calls from {module.path}: {e}")
    
    def _analyze_calls_in_tree(self, tree: ast.AST) -> None:
        """Analyze function calls within an AST tree.
        
        Args:
            tree: AST tree to analyze
        """
        # Use a visitor pattern to traverse the AST
        visitor = CallExtractorVisitor(self.current_module, self.function_registry)
        visitor.visit(tree)
        
        # Collect the call relationships
        self.call_relationships.extend(visitor.call_relationships)
    
    def _build_function_nodes(self) -> List[FunctionNode]:
        """Build function nodes from registered functions.
        
        Returns:
            List of FunctionNode objects
        """
        nodes = []
        
        for func_id, func_info in self.function_registry.items():
            node = FunctionNode(
                id=func_id,
                name=func_info.name,
                module=func_info.module,
                complexity=func_info.complexity.cyclomatic,
                line_number=func_info.line_number,
                parameters=func_info.parameters
            )
            nodes.append(node)
        
        return nodes
    
    def _build_call_edges(self) -> List[CallEdge]:
        """Build call edges from extracted call relationships.
        
        Returns:
            List of CallEdge objects
        """
        # Group calls by caller-callee pairs to count occurrences
        call_counts: Dict[Tuple[str, str], List[int]] = defaultdict(list)
        
        for caller, callee, line_number in self.call_relationships:
            call_counts[(caller, callee)].append(line_number)
        
        edges = []
        for (caller, callee), line_numbers in call_counts.items():
            edge = CallEdge(
                caller=caller,
                callee=callee,
                call_count=len(line_numbers),
                line_numbers=line_numbers
            )
            edges.append(edge)
        
        return edges


class CallExtractorVisitor(ast.NodeVisitor):
    """AST visitor to extract function calls."""
    
    def __init__(self, current_module: str, function_registry: Dict[str, FunctionInfo]):
        """Initialize the call extractor visitor.
        
        Args:
            current_module: Name of the current module being analyzed
            function_registry: Registry of all known functions
        """
        self.current_module = current_module
        self.function_registry = function_registry
        self.call_relationships: List[Tuple[str, str, int]] = []
        self.current_function_stack: List[str] = []
        self.current_class = ""
        self.imports: Dict[str, str] = {}  # alias -> module mapping
    
    def visit_Import(self, node: ast.Import) -> None:
        """Visit import statements to track module aliases.
        
        Args:
            node: Import AST node
        """
        for alias in node.names:
            if alias.asname:
                self.imports[alias.asname] = alias.name
            else:
                self.imports[alias.name] = alias.name
        self.generic_visit(node)
    
    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        """Visit from-import statements to track imported names.
        
        Args:
            node: ImportFrom AST node
        """
        if node.module:
            for alias in node.names:
                imported_name = alias.asname if alias.asname else alias.name
                self.imports[imported_name] = f"{node.module}.{alias.name}"
        self.generic_visit(node)
    
    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        """Visit class definitions to track current class context.
        
        Args:
            node: ClassDef AST node
        """
        old_class = self.current_class
        self.current_class = node.name
        self.generic_visit(node)
        self.current_class = old_class
    
    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        """Visit function definitions to track current function context.
        
        Args:
            node: FunctionDef AST node
        """
        # Determine the full function identifier
        if self.current_class:
            func_id = f"{self.current_module}.{self.current_class}.{node.name}"
        else:
            func_id = f"{self.current_module}.{node.name}"
        
        self.current_function_stack.append(func_id)
        self.generic_visit(node)
        self.current_function_stack.pop()
    
    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        """Visit async function definitions to track current function context.
        
        Args:
            node: AsyncFunctionDef AST node
        """
        # Same logic as regular function definitions
        if self.current_class:
            func_id = f"{self.current_module}.{self.current_class}.{node.name}"
        else:
            func_id = f"{self.current_module}.{node.name}"
        
        self.current_function_stack.append(func_id)
        self.generic_visit(node)
        self.current_function_stack.pop()
    
    def visit_Call(self, node: ast.Call) -> None:
        """Visit function call expressions to extract call relationships.
        
        Args:
            node: Call AST node
        """
        if not self.current_function_stack:
            # Skip calls outside of functions
            self.generic_visit(node)
            return
        
        caller = self.current_function_stack[-1]
        callee = self._resolve_call_target(node.func)
        
        if callee and callee in self.function_registry:
            self.call_relationships.append((caller, callee, node.lineno))
        
        self.generic_visit(node)
    
    def _resolve_call_target(self, func_node: ast.AST) -> Optional[str]:
        """Resolve the target function of a call expression.
        
        Args:
            func_node: AST node representing the called function
            
        Returns:
            Function identifier string or None if not resolvable
        """
        if isinstance(func_node, ast.Name):
            # Simple function call: func()
            func_name = func_node.id
            
            # Check if it's an imported function
            if func_name in self.imports:
                return self.imports[func_name]
            
            # Check if it's a function in the current module
            local_func_id = f"{self.current_module}.{func_name}"
            if local_func_id in self.function_registry:
                return local_func_id
            
            # Check if it's a method in the current class
            if self.current_class:
                method_id = f"{self.current_module}.{self.current_class}.{func_name}"
                if method_id in self.function_registry:
                    return method_id
        
        elif isinstance(func_node, ast.Attribute):
            # Method call: obj.method() or module.func()
            return self._resolve_attribute_call(func_node)
        
        return None
    
    def _resolve_attribute_call(self, attr_node: ast.Attribute) -> Optional[str]:
        """Resolve attribute-based function calls.
        
        Args:
            attr_node: Attribute AST node
            
        Returns:
            Function identifier string or None if not resolvable
        """
        method_name = attr_node.attr
        
        if isinstance(attr_node.value, ast.Name):
            obj_name = attr_node.value.id
            
            # Check if it's a module.function call
            if obj_name in self.imports:
                module_name = self.imports[obj_name]
                potential_func_id = f"{module_name}.{method_name}"
                if potential_func_id in self.function_registry:
                    return potential_func_id
            
            # Check for self.method() calls
            if obj_name == "self" and self.current_class:
                method_id = f"{self.current_module}.{self.current_class}.{method_name}"
                if method_id in self.function_registry:
                    return method_id
            
            # Check for cls.method() calls
            if obj_name == "cls" and self.current_class:
                method_id = f"{self.current_module}.{self.current_class}.{method_name}"
                if method_id in self.function_registry:
                    return method_id
        
        elif isinstance(attr_node.value, ast.Attribute):
            # Nested attribute access: module.submodule.func()
            # This is more complex and would require deeper analysis
            pass
        
        return None


class CallHierarchyAnalyzer:
    """Analyzer for call hierarchy exploration and filtering."""
    
    def __init__(self, call_graph: CallGraph):
        """Initialize the call hierarchy analyzer.
        
        Args:
            call_graph: CallGraph to analyze
        """
        self.call_graph = call_graph
        self.callers_map: Dict[str, Set[str]] = defaultdict(set)
        self.callees_map: Dict[str, Set[str]] = defaultdict(set)
        self._build_lookup_maps()
    
    def _build_lookup_maps(self) -> None:
        """Build lookup maps for efficient hierarchy traversal."""
        for edge in self.call_graph.edges:
            self.callers_map[edge.callee].add(edge.caller)
            self.callees_map[edge.caller].add(edge.callee)
    
    def get_callers(self, function_id: str, max_depth: int = 10) -> Dict[str, int]:
        """Get all functions that call the specified function.
        
        Args:
            function_id: ID of the function to find callers for
            max_depth: Maximum depth to traverse (prevents infinite recursion)
            
        Returns:
            Dictionary mapping caller function IDs to their depth level
        """
        callers = {}
        visited = set()
        
        def _traverse_callers(func_id: str, depth: int) -> None:
            if depth > max_depth or func_id in visited:
                return
            
            visited.add(func_id)
            
            for caller in self.callers_map.get(func_id, set()):
                caller_depth = depth + 1
                if caller not in callers or callers[caller] > caller_depth:
                    callers[caller] = caller_depth
                _traverse_callers(caller, caller_depth)
        
        _traverse_callers(function_id, 0)
        return callers
    
    def get_callees(self, function_id: str, max_depth: int = 10) -> Dict[str, int]:
        """Get all functions called by the specified function.
        
        Args:
            function_id: ID of the function to find callees for
            max_depth: Maximum depth to traverse (prevents infinite recursion)
            
        Returns:
            Dictionary mapping callee function IDs to their depth level
        """
        callees = {}
        visited = set()
        
        def _traverse_callees(func_id: str, depth: int) -> None:
            if depth > max_depth or func_id in visited:
                return
            
            visited.add(func_id)
            
            for callee in self.callees_map.get(func_id, set()):
                callee_depth = depth + 1
                if callee not in callees or callees[callee] > callee_depth:
                    callees[callee] = callee_depth
                _traverse_callees(callee, callee_depth)
        
        _traverse_callees(function_id, 0)
        return callees
    
    def get_call_hierarchy(self, function_id: str, max_depth: int = 5) -> Dict[str, Any]:
        """Get complete call hierarchy for a function (both callers and callees).
        
        Args:
            function_id: ID of the function to analyze
            max_depth: Maximum depth to traverse
            
        Returns:
            Dictionary containing hierarchy information
        """
        callers = self.get_callers(function_id, max_depth)
        callees = self.get_callees(function_id, max_depth)
        
        # Find the function node
        function_node = None
        for node in self.call_graph.nodes:
            if node.id == function_id:
                function_node = node
                break
        
        return {
            "function": function_node,
            "callers": callers,
            "callees": callees,
            "total_callers": len(callers),
            "total_callees": len(callees)
        }
    
    def filter_by_module(self, module_name: str) -> CallGraph:
        """Filter call graph to only include functions from a specific module.
        
        Args:
            module_name: Name of the module to filter by
            
        Returns:
            Filtered CallGraph
        """
        # Filter nodes
        filtered_nodes = [
            node for node in self.call_graph.nodes
            if node.module == module_name
        ]
        
        # Get node IDs for filtering edges
        node_ids = {node.id for node in filtered_nodes}
        
        # Filter edges to only include calls within the module
        filtered_edges = [
            edge for edge in self.call_graph.edges
            if edge.caller in node_ids and edge.callee in node_ids
        ]
        
        return CallGraph(nodes=filtered_nodes, edges=filtered_edges)
    
    def search_functions(self, query: str) -> List[FunctionNode]:
        """Search for functions by name pattern.
        
        Args:
            query: Search query (substring match)
            
        Returns:
            List of matching FunctionNode objects
        """
        query_lower = query.lower()
        matches = []
        
        for node in self.call_graph.nodes:
            if (query_lower in node.name.lower() or 
                query_lower in node.module.lower() or
                query_lower in node.id.lower()):
                matches.append(node)
        
        return matches