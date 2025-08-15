#!/usr/bin/env python3
"""
AST Parser module for CodeMindMap analyzer.

This module provides AST parsing capabilities to extract functions, classes,
and import information from Python source files.
"""

import ast
import logging
from pathlib import Path
from typing import List, Optional, Set, Dict, Any

from analyzer import (
    FunctionInfo, ClassInfo, ImportInfo, ModuleInfo, Parameter,
    ComplexityScore, ComplexityLevel
)

logger = logging.getLogger(__name__)


class ASTParser:
    """Parser for Python AST to extract code structure information."""
    
    def __init__(self):
        """Initialize the AST parser."""
        self.current_module = ""
        self.current_file_path = ""
    
    def parse_file(self, file_path: Path) -> Optional[ModuleInfo]:
        """Parse a Python file and extract module information.
        
        Args:
            file_path: Path to the Python file to parse
            
        Returns:
            ModuleInfo object or None if parsing fails
        """
        try:
            self.current_file_path = str(file_path)
            self.current_module = self._path_to_module_name(file_path)
            
            # Read and parse the file
            with open(file_path, 'r', encoding='utf-8') as f:
                source_code = f.read()
            
            # Count lines
            line_count = len(source_code.splitlines())
            
            # Parse AST
            tree = ast.parse(source_code, filename=str(file_path))
            
            # Extract information
            functions = self._extract_functions(tree)
            classes = self._extract_classes(tree)
            imports = self._extract_imports(tree)
            docstring = self._extract_module_docstring(tree)
            
            # Calculate module complexity (sum of function complexities)
            total_complexity = sum(func.complexity.cyclomatic for func in functions)
            module_complexity = ComplexityScore(cyclomatic=total_complexity)
            
            return ModuleInfo(
                name=self.current_module,
                path=str(file_path),
                functions=functions,
                classes=classes,
                imports=imports,
                complexity=module_complexity,
                size_lines=line_count,
                docstring=docstring
            )
            
        except SyntaxError as e:
            logger.error(f"Syntax error in {file_path}: {e}")
            return None
        except Exception as e:
            logger.error(f"Failed to parse {file_path}: {e}")
            return None
    
    def _path_to_module_name(self, file_path: Path) -> str:
        """Convert file path to Python module name.
        
        Args:
            file_path: Path to the Python file
            
        Returns:
            Module name string
        """
        # For simplicity, just use the file stem as module name
        return file_path.stem
    
    def _extract_module_docstring(self, tree: ast.AST) -> Optional[str]:
        """Extract module-level docstring.
        
        Args:
            tree: AST tree
            
        Returns:
            Docstring or None
        """
        if (isinstance(tree, ast.Module) and 
            tree.body and 
            isinstance(tree.body[0], ast.Expr) and 
            isinstance(tree.body[0].value, ast.Constant) and 
            isinstance(tree.body[0].value.value, str)):
            return tree.body[0].value.value
        return None
    
    def _extract_functions(self, tree: ast.AST) -> List[FunctionInfo]:
        """Extract function information from AST.
        
        Args:
            tree: AST tree
            
        Returns:
            List of FunctionInfo objects
        """
        functions = []
        
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                func_info = self._parse_function(node)
                if func_info:
                    functions.append(func_info)
        
        return functions
    
    def _extract_classes(self, tree: ast.AST) -> List[ClassInfo]:
        """Extract class information from AST.
        
        Args:
            tree: AST tree
            
        Returns:
            List of ClassInfo objects
        """
        classes = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                class_info = self._parse_class(node)
                if class_info:
                    classes.append(class_info)
        
        return classes
    
    def _extract_imports(self, tree: ast.AST) -> List[ImportInfo]:
        """Extract import information from AST.
        
        Args:
            tree: AST tree
            
        Returns:
            List of ImportInfo objects
        """
        imports = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    import_info = ImportInfo(
                        module=alias.name,
                        names=[alias.name],
                        alias=alias.asname,
                        is_from_import=False,
                        line_number=node.lineno
                    )
                    imports.append(import_info)
            
            elif isinstance(node, ast.ImportFrom):
                if node.module:  # Skip relative imports without module
                    names = [alias.name for alias in node.names]
                    import_info = ImportInfo(
                        module=node.module,
                        names=names,
                        alias=None,
                        is_from_import=True,
                        line_number=node.lineno
                    )
                    imports.append(import_info)
        
        return imports
    
    def _parse_function(self, node: ast.FunctionDef) -> Optional[FunctionInfo]:
        """Parse a function definition node.
        
        Args:
            node: AST function definition node
            
        Returns:
            FunctionInfo object or None
        """
        try:
            # Extract parameters
            parameters = self._extract_parameters(node.args)
            
            # Calculate basic complexity (count control flow statements)
            complexity = self._calculate_function_complexity(node)
            
            # Extract docstring
            docstring = self._extract_function_docstring(node)
            
            # Extract return type annotation
            return_type = None
            if node.returns:
                return_type = ast.unparse(node.returns) if hasattr(ast, 'unparse') else str(node.returns)
            
            # Determine if it's a method (inside a class)
            is_method = self._is_method(node)
            
            return FunctionInfo(
                name=node.name,
                module=self.current_module,
                line_number=node.lineno,
                complexity=complexity,
                parameters=parameters,
                return_type=return_type,
                docstring=docstring,
                is_method=is_method,
                is_async=isinstance(node, ast.AsyncFunctionDef)
            )
            
        except Exception as e:
            logger.error(f"Failed to parse function {node.name}: {e}")
            return None
    
    def _parse_class(self, node: ast.ClassDef) -> Optional[ClassInfo]:
        """Parse a class definition node.
        
        Args:
            node: AST class definition node
            
        Returns:
            ClassInfo object or None
        """
        try:
            # Extract methods
            methods = []
            for item in node.body:
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    method_info = self._parse_function(item)
                    if method_info:
                        method_info.is_method = True
                        methods.append(method_info)
            
            # Extract base classes
            base_classes = []
            for base in node.bases:
                if isinstance(base, ast.Name):
                    base_classes.append(base.id)
                elif isinstance(base, ast.Attribute):
                    base_classes.append(ast.unparse(base) if hasattr(ast, 'unparse') else str(base))
            
            # Extract docstring
            docstring = self._extract_class_docstring(node)
            
            return ClassInfo(
                name=node.name,
                module=self.current_module,
                line_number=node.lineno,
                methods=methods,
                base_classes=base_classes,
                docstring=docstring
            )
            
        except Exception as e:
            logger.error(f"Failed to parse class {node.name}: {e}")
            return None
    
    def _extract_parameters(self, args: ast.arguments) -> List[Parameter]:
        """Extract function parameters from arguments node.
        
        Args:
            args: AST arguments node
            
        Returns:
            List of Parameter objects
        """
        parameters = []
        
        # Regular arguments
        for i, arg in enumerate(args.args):
            # Get default value if available
            default_value = None
            defaults_offset = len(args.args) - len(args.defaults)
            if i >= defaults_offset:
                default_idx = i - defaults_offset
                default_node = args.defaults[default_idx]
                if hasattr(ast, 'unparse'):
                    default_value = ast.unparse(default_node)
                elif isinstance(default_node, ast.Constant):
                    default_value = repr(default_node.value)
                else:
                    default_value = str(default_node)
            
            # Get type annotation
            type_hint = None
            if arg.annotation:
                type_hint = ast.unparse(arg.annotation) if hasattr(ast, 'unparse') else str(arg.annotation)
            
            parameters.append(Parameter(
                name=arg.arg,
                type_hint=type_hint,
                default_value=default_value,
                is_vararg=False,
                is_kwarg=False
            ))
        
        # *args parameter
        if args.vararg:
            type_hint = None
            if args.vararg.annotation:
                type_hint = ast.unparse(args.vararg.annotation) if hasattr(ast, 'unparse') else str(args.vararg.annotation)
            
            parameters.append(Parameter(
                name=args.vararg.arg,
                type_hint=type_hint,
                is_vararg=True,
                is_kwarg=False
            ))
        
        # Keyword-only arguments
        for i, arg in enumerate(args.kwonlyargs):
            # Get default value if available
            default_value = None
            if i < len(args.kw_defaults) and args.kw_defaults[i] is not None:
                default_node = args.kw_defaults[i]
                if hasattr(ast, 'unparse'):
                    default_value = ast.unparse(default_node)
                elif isinstance(default_node, ast.Constant):
                    default_value = repr(default_node.value)
                else:
                    default_value = str(default_node)
            
            # Get type annotation
            type_hint = None
            if arg.annotation:
                type_hint = ast.unparse(arg.annotation) if hasattr(ast, 'unparse') else str(arg.annotation)
            
            parameters.append(Parameter(
                name=arg.arg,
                type_hint=type_hint,
                default_value=default_value,
                is_vararg=False,
                is_kwarg=False
            ))
        
        # **kwargs parameter
        if args.kwarg:
            type_hint = None
            if args.kwarg.annotation:
                type_hint = ast.unparse(args.kwarg.annotation) if hasattr(ast, 'unparse') else str(args.kwarg.annotation)
            
            parameters.append(Parameter(
                name=args.kwarg.arg,
                type_hint=type_hint,
                is_vararg=False,
                is_kwarg=True
            ))
        
        return parameters
    
    def _calculate_function_complexity(self, node: ast.FunctionDef) -> ComplexityScore:
        """Calculate basic complexity score for a function.
        
        Args:
            node: AST function definition node
            
        Returns:
            ComplexityScore object
        """
        # Count control flow statements for basic cyclomatic complexity
        complexity = 1  # Base complexity
        
        for child in ast.walk(node):
            # Skip nested functions to avoid double counting
            if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)) and child != node:
                continue
                
            if isinstance(child, (ast.If, ast.While, ast.For, ast.AsyncFor)):
                complexity += 1
            elif isinstance(child, ast.Try):
                complexity += 1
                # Add complexity for except handlers
                if hasattr(child, 'handlers'):
                    complexity += len(child.handlers)
            elif isinstance(child, (ast.And, ast.Or)):
                complexity += 1
            elif isinstance(child, ast.comprehension):
                complexity += 1
            elif isinstance(child, ast.BoolOp):
                # Count boolean operations (and/or)
                complexity += len(child.values) - 1
        
        return ComplexityScore(cyclomatic=complexity)
    
    def _extract_function_docstring(self, node: ast.FunctionDef) -> Optional[str]:
        """Extract function docstring.
        
        Args:
            node: AST function definition node
            
        Returns:
            Docstring or None
        """
        if (node.body and 
            isinstance(node.body[0], ast.Expr) and 
            isinstance(node.body[0].value, ast.Constant) and 
            isinstance(node.body[0].value.value, str)):
            return node.body[0].value.value
        return None
    
    def _extract_class_docstring(self, node: ast.ClassDef) -> Optional[str]:
        """Extract class docstring.
        
        Args:
            node: AST class definition node
            
        Returns:
            Docstring or None
        """
        if (node.body and 
            isinstance(node.body[0], ast.Expr) and 
            isinstance(node.body[0].value, ast.Constant) and 
            isinstance(node.body[0].value.value, str)):
            return node.body[0].value.value
        return None
    
    def _is_method(self, node: ast.FunctionDef) -> bool:
        """Determine if a function is a method (inside a class).
        
        Args:
            node: AST function definition node
            
        Returns:
            True if the function is a method
        """
        # Walk up the AST to see if we're inside a class
        # This is a simplified check - in practice, we'd need to track context
        return len(node.args.args) > 0 and node.args.args[0].arg in ['self', 'cls']


class ModuleDiscovery:
    """Module discovery and dependency resolution."""
    
    def __init__(self, project_path: Path):
        """Initialize module discovery.
        
        Args:
            project_path: Path to the project root
        """
        self.project_path = project_path
        self.ast_parser = ASTParser()
    
    def discover_modules(self, python_files: List[Path]) -> List[ModuleInfo]:
        """Discover and parse all modules in the project.
        
        Args:
            python_files: List of Python file paths
            
        Returns:
            List of ModuleInfo objects
        """
        modules = []
        
        for file_path in python_files:
            try:
                module_info = self.ast_parser.parse_file(file_path)
                if module_info:
                    modules.append(module_info)
                    logger.debug(f"Parsed module: {module_info.name}")
                else:
                    logger.warning(f"Failed to parse module: {file_path}")
            except Exception as e:
                logger.error(f"Error parsing {file_path}: {e}")
        
        logger.info(f"Discovered {len(modules)} modules")
        return modules
    
    def resolve_dependencies(self, modules: List[ModuleInfo]) -> Dict[str, Set[str]]:
        """Resolve module dependencies based on import statements.
        
        Args:
            modules: List of parsed modules
            
        Returns:
            Dictionary mapping module names to their dependencies
        """
        dependencies = {}
        module_names = {module.name for module in modules}
        
        for module in modules:
            deps = set()
            
            for import_info in module.imports:
                # Check if the imported module is part of our project
                if import_info.module in module_names:
                    deps.add(import_info.module)
                elif import_info.is_from_import:
                    # Check for relative imports within the project
                    for name in import_info.names:
                        full_name = f"{import_info.module}.{name}"
                        if full_name in module_names:
                            deps.add(full_name)
            
            dependencies[module.name] = deps
        
        return dependencies