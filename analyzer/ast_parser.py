
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
        """Calculate complexity score for a function including cognitive complexity.
        
        Args:
            node: AST function definition node
            
        Returns:
            ComplexityScore object
        """
        # Count control flow statements for cyclomatic complexity
        cyclomatic = 1  # Base complexity
        cognitive = 0  # Cognitive complexity starts at 0
        nesting_level = 0
        
        def calculate_complexity_recursive(node_list, current_nesting=0):
            nonlocal cyclomatic, cognitive
            
            for child in node_list:
                # Skip nested functions to avoid double counting
                if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)) and child != node:
                    continue
                
                # Cyclomatic complexity increments
                if isinstance(child, (ast.If, ast.While, ast.For, ast.AsyncFor)):
                    cyclomatic += 1
                    cognitive += 1 + current_nesting  # Cognitive complexity increases with nesting
                    
                    # Recursively process nested statements with increased nesting
                    if hasattr(child, 'body'):
                        calculate_complexity_recursive(child.body, current_nesting + 1)
                    if hasattr(child, 'orelse') and child.orelse:
                        calculate_complexity_recursive(child.orelse, current_nesting + 1)
                        
                elif isinstance(child, ast.Try):
                    cyclomatic += 1
                    cognitive += 1 + current_nesting
                    
                    # Process try body
                    if hasattr(child, 'body'):
                        calculate_complexity_recursive(child.body, current_nesting + 1)
                    
                    # Add complexity for except handlers
                    if hasattr(child, 'handlers'):
                        cyclomatic += len(child.handlers)
                        for handler in child.handlers:
                            cognitive += 1 + current_nesting
                            if hasattr(handler, 'body'):
                                calculate_complexity_recursive(handler.body, current_nesting + 1)
                    
                    # Process finally block
                    if hasattr(child, 'finalbody') and child.finalbody:
                        calculate_complexity_recursive(child.finalbody, current_nesting + 1)
                        
                elif isinstance(child, (ast.And, ast.Or)):
                    cyclomatic += 1
                    cognitive += 1
                    
                elif isinstance(child, ast.comprehension):
                    cyclomatic += 1
                    cognitive += 1 + current_nesting
                    
                elif isinstance(child, ast.BoolOp):
                    # Count boolean operations (and/or)
                    additional_complexity = len(child.values) - 1
                    cyclomatic += additional_complexity
                    cognitive += additional_complexity
                
                # Continue processing child nodes
                elif hasattr(child, 'body') and isinstance(child.body, list):
                    calculate_complexity_recursive(child.body, current_nesting)
                elif hasattr(child, '__dict__'):
                    # Process other child nodes
                    for attr_name, attr_value in child.__dict__.items():
                        if isinstance(attr_value, list):
                            for item in attr_value:
                                if isinstance(item, ast.AST):
                                    calculate_complexity_recursive([item], current_nesting)
        
        # Start recursive calculation
        calculate_complexity_recursive(node.body, 0)
        
        return ComplexityScore(cyclomatic=cyclomatic, cognitive=cognitive)
    
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


class EnhancedCodeGraphBuilder:
    """Builder for enhanced hierarchical code graph structure."""
    
    def __init__(self, project_path: Path):
        """Initialize the enhanced code graph builder.
        
        Args:
            project_path: Path to the project root
        """
        self.project_path = project_path
        self.function_registry: Dict[str, FunctionInfo] = {}
        self.call_relationships: Dict[str, List[Dict[str, Any]]] = {}
    
    def build_code_graph(self, modules: List[ModuleInfo]) -> List[Dict[str, Any]]:
        """Build enhanced code graph with hierarchical structure.
        
        Args:
            modules: List of analyzed modules
            
        Returns:
            List of dictionaries representing the hierarchical code structure
        """
        logger.info("Building enhanced code graph...")
        
        # Register all functions for call resolution
        self._register_functions(modules)
        
        # Extract call relationships
        self._extract_call_relationships(modules)
        
        # Build hierarchical structure
        folder_structure = self._build_folder_structure(modules)
        
        logger.info(f"Built enhanced code graph with {len(folder_structure)} top-level folders")
        return folder_structure
    
    def _register_functions(self, modules: List[ModuleInfo]) -> None:
        """Register all functions for call resolution."""
        for module in modules:
            # Register module-level functions
            for func in module.functions:
                func_key = f"{module.name}.{func.name}"
                self.function_registry[func_key] = func
            
            # Register class methods
            for class_info in module.classes:
                for method in class_info.methods:
                    method_key = f"{module.name}.{class_info.name}.{method.name}"
                    self.function_registry[method_key] = method
    
    def _extract_call_relationships(self, modules: List[ModuleInfo]) -> None:
        """Extract call relationships with full path tracking."""
        for module in modules:
            try:
                module_path = Path(module.path)
                if module_path.exists():
                    with open(module_path, 'r', encoding='utf-8') as f:
                        source_code = f.read()
                    
                    tree = ast.parse(source_code, filename=str(module_path))
                    visitor = CallExtractorVisitor(module.name, self.function_registry)
                    visitor.visit(tree)
                    
                    # Store call relationships for each function
                    for func_id, calls in visitor.function_calls.items():
                        self.call_relationships[func_id] = calls
                        
            except Exception as e:
                logger.error(f"Failed to extract calls from {module.path}: {e}")
    
    def _build_folder_structure(self, modules: List[ModuleInfo]) -> List[Dict[str, Any]]:
        """Build hierarchical folder structure."""
        # Group modules by their folder structure
        folder_map: Dict[str, List[ModuleInfo]] = {}
        
        for module in modules:
            module_path = Path(module.path)
            try:
                relative_path = module_path.relative_to(self.project_path)
            except ValueError:
                # If path is not relative to project, use the parent directory
                relative_path = module_path.parent / module_path.name
            
            if len(relative_path.parts) > 1:
                # Module is in a subfolder
                folder_name = relative_path.parts[0]
            else:
                # Module is in root
                folder_name = "root"
            
            if folder_name not in folder_map:
                folder_map[folder_name] = []
            folder_map[folder_name].append(module)
        
        # Build folder nodes
        folder_nodes = []
        for folder_name, folder_modules in folder_map.items():
            folder_node = self._build_folder_node(folder_name, folder_modules)
            folder_nodes.append(folder_node)
        
        return folder_nodes
    
    def _build_folder_node(self, folder_name: str, modules: List[ModuleInfo]) -> Dict[str, Any]:
        """Build a folder node with its contained files."""
        file_nodes = []
        
        for module in modules:
            file_node = self._build_file_node(module)
            file_nodes.append(file_node)
        
        return {
            "name": folder_name,
            "type": "folder",
            "children": file_nodes,
            "calls": []
        }
    
    def _build_file_node(self, module: ModuleInfo) -> Dict[str, Any]:
        """Build a file node with its contained classes and functions."""
        children = []
        
        # Add classes
        for class_info in module.classes:
            class_node = self._build_class_node(class_info, module.name)
            children.append(class_node)
        
        # Add module-level functions
        for func in module.functions:
            if not func.is_method:  # Skip methods (they're in classes)
                func_node = self._build_function_node(func, module.name)
                children.append(func_node)
        
        return {
            "name": Path(module.path).name,
            "type": "file",
            "children": children,
            "calls": [],
            "path": module.path
        }
    
    def _build_class_node(self, class_info: ClassInfo, module_name: str) -> Dict[str, Any]:
        """Build a class node with its methods."""
        method_nodes = []
        
        for method in class_info.methods:
            method_node = self._build_function_node(method, module_name, class_info.name)
            method_nodes.append(method_node)
        
        return {
            "name": class_info.name,
            "type": "class",
            "children": method_nodes,
            "calls": [],
            "line_number": class_info.line_number
        }
    
    def _build_function_node(self, func: FunctionInfo, module_name: str, class_name: Optional[str] = None) -> Dict[str, Any]:
        """Build a function node with call relationships."""
        # Build function identifier for call lookup
        if class_name:
            func_id = f"{module_name}.{class_name}.{func.name}"
        else:
            func_id = f"{module_name}.{func.name}"
        
        # Get call relationships for this function
        calls = self.call_relationships.get(func_id, [])
        
        return {
            "name": func.name,
            "type": "function",
            "children": [],
            "calls": calls,
            "complexity": {
                "cyclomatic": func.complexity.cyclomatic,
                "cognitive": func.complexity.cognitive,
                "level": func.complexity.level.value
            },
            "line_number": func.line_number
        }


class CallExtractorVisitor(ast.NodeVisitor):
    """AST visitor to extract function calls with full path tracking."""
    
    def __init__(self, current_module: str, function_registry: Dict[str, FunctionInfo]):
        """Initialize the call extractor visitor."""
        self.current_module = current_module
        self.function_registry = function_registry
        self.function_calls: Dict[str, List[Dict[str, Any]]] = {}
        self.current_function_stack: List[str] = []
        self.current_class = ""
        self.imports: Dict[str, str] = {}  # alias -> module mapping
    
    def visit_Import(self, node: ast.Import) -> None:
        """Visit import statements to track module aliases."""
        for alias in node.names:
            if alias.asname:
                self.imports[alias.asname] = alias.name
            else:
                self.imports[alias.name] = alias.name
        self.generic_visit(node)
    
    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        """Visit from-import statements to track imported names."""
        if node.module:
            for alias in node.names:
                imported_name = alias.asname if alias.asname else alias.name
                self.imports[imported_name] = f"{node.module}.{alias.name}"
        self.generic_visit(node)
    
    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        """Visit class definitions to track current class context."""
        old_class = self.current_class
        self.current_class = node.name
        self.generic_visit(node)
        self.current_class = old_class
    
    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        """Visit function definitions to track current function context."""
        if self.current_class:
            func_id = f"{self.current_module}.{self.current_class}.{node.name}"
        else:
            func_id = f"{self.current_module}.{node.name}"
        
        self.current_function_stack.append(func_id)
        self.function_calls[func_id] = []
        self.generic_visit(node)
        self.current_function_stack.pop()
    
    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        """Visit async function definitions to track current function context."""
        if self.current_class:
            func_id = f"{self.current_module}.{self.current_class}.{node.name}"
        else:
            func_id = f"{self.current_module}.{node.name}"
        
        self.current_function_stack.append(func_id)
        self.function_calls[func_id] = []
        self.generic_visit(node)
        self.current_function_stack.pop()
    
    def visit_Call(self, node: ast.Call) -> None:
        """Visit function call expressions to extract call relationships."""
        if not self.current_function_stack:
            self.generic_visit(node)
            return
        
        caller_id = self.current_function_stack[-1]
        call_info = self._resolve_call_target(node.func)
        
        if call_info:
            target_path, label = call_info
            call_relationship = {
                "target": target_path,
                "label": label
            }
            self.function_calls[caller_id].append(call_relationship)
        
        self.generic_visit(node)
    
    def _resolve_call_target(self, func_node: ast.AST) -> Optional[tuple]:
        """Resolve the target function with full path and generate label."""
        if isinstance(func_node, ast.Name):
            func_name = func_node.id
            
            # Check if it's an imported function
            if func_name in self.imports:
                imported_path = self.imports[func_name]
                parts = imported_path.split('.')
                if len(parts) >= 2:
                    return (["", parts[0], "", parts[1]], "calls")
            
            # Check if it's a function in the current module
            local_func_id = f"{self.current_module}.{func_name}"
            if local_func_id in self.function_registry:
                return (["", self.current_module, "", func_name], "calls")
            
            # Check if it's a method in the current class
            if self.current_class:
                method_id = f"{self.current_module}.{self.current_class}.{func_name}"
                if method_id in self.function_registry:
                    return (["", self.current_module, self.current_class, func_name], "calls")
        
        elif isinstance(func_node, ast.Attribute):
            return self._resolve_attribute_call(func_node)
        
        return None
    
    def _resolve_attribute_call(self, attr_node: ast.Attribute) -> Optional[tuple]:
        """Resolve attribute-based function calls with enhanced path tracking."""
        method_name = attr_node.attr
        
        if isinstance(attr_node.value, ast.Name):
            obj_name = attr_node.value.id
            
            # Check if it's a module.function call
            if obj_name in self.imports:
                module_name = self.imports[obj_name]
                potential_func_id = f"{module_name}.{method_name}"
                if potential_func_id in self.function_registry:
                    return (["", module_name, "", method_name], "uses")
            
            # Check for self.method() calls
            if obj_name == "self" and self.current_class:
                method_id = f"{self.current_module}.{self.current_class}.{method_name}"
                if method_id in self.function_registry:
                    return (["", self.current_module, self.current_class, method_name], "calls")
            
            # Generate descriptive labels based on common patterns
            if method_name.startswith("get_"):
                return (["", "external", "", method_name], "fetches")
            elif method_name.startswith("set_") or method_name.startswith("update_"):
                return (["", "external", "", method_name], "updates")
            elif method_name.startswith("create_") or method_name.startswith("make_"):
                return (["", "external", "", method_name], "creates")
            else:
                return (["", "external", "", method_name], "uses")
        
        return None


class ModuleDiscovery:
    """Module discovery and dependency resolution."""
    
    def __init__(self, project_path: Path):
        """Initialize module discovery.
        
        Args:
            project_path: Path to the project root
        """
        self.project_path = project_path
        self.ast_parser = ASTParser()
        self.code_graph_builder = EnhancedCodeGraphBuilder(project_path)
    
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
    
    def build_enhanced_code_graph(self, modules: List[ModuleInfo]) -> List[Dict[str, Any]]:
        """Build enhanced hierarchical code graph structure.
        
        Args:
            modules: List of parsed modules
            
        Returns:
            List of dictionaries representing the hierarchical code structure
        """
        return self.code_graph_builder.build_code_graph(modules)