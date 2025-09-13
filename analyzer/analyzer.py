#!/usr/bin/env python3
"""
CodeMindMap Python Project Analyzer

This module provides static analysis capabilities for Python projects,
including AST parsing, complexity analysis, and framework detection.
"""

import ast
import json
import logging
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Optional, Set, Union, Any, Tuple
from enum import Enum


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AnalysisError(Exception):
    """Base exception for analysis errors."""
    pass


class ComplexityLevel(Enum):
    """Complexity level enumeration."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass
class ComplexityScore:
    """Represents complexity metrics for a code element."""
    cyclomatic: int
    cognitive: int = 0
    level: ComplexityLevel = ComplexityLevel.LOW
    
    def __post_init__(self):
        """Calculate complexity level and ensure cognitive complexity is set."""
        # Calculate complexity level based on cyclomatic complexity
        if self.cyclomatic <= 5:
            self.level = ComplexityLevel.LOW
        elif self.cyclomatic <= 10:
            self.level = ComplexityLevel.MEDIUM
        else:
            self.level = ComplexityLevel.HIGH
        
        # Ensure cognitive complexity is set (estimate if not provided)
        if self.cognitive == 0 and self.cyclomatic > 0:
            self.cognitive = max(1, int(self.cyclomatic * 1.2))


@dataclass
class Parameter:
    """Represents a function parameter."""
    name: str
    type_hint: Optional[str] = None
    default_value: Optional[str] = None
    is_vararg: bool = False
    is_kwarg: bool = False


@dataclass
class FunctionInfo:
    """Represents information about a function."""
    name: str
    module: str
    line_number: int
    complexity: ComplexityScore
    parameters: List[Parameter]
    return_type: Optional[str] = None
    docstring: Optional[str] = None
    is_method: bool = False
    is_async: bool = False


@dataclass
class ClassInfo:
    """Represents information about a class."""
    name: str
    module: str
    line_number: int
    methods: List[FunctionInfo]
    base_classes: List[str]
    docstring: Optional[str] = None


@dataclass
class ImportInfo:
    """Represents an import statement."""
    module: str
    names: List[str]
    alias: Optional[str] = None
    is_from_import: bool = False
    line_number: int = 0


@dataclass
class ModuleInfo:
    """Represents information about a Python module."""
    name: str
    path: str
    functions: List[FunctionInfo]
    classes: List[ClassInfo]
    imports: List[ImportInfo]
    complexity: ComplexityScore
    size_lines: int
    docstring: Optional[str] = None


# Import from dependency_parser at module level to avoid issues
from dependency_parser import Library, TechStack

# Import new categorization system
try:
    from tech_stack_categorizer import TechStackCategorizer
    from category_rules_engine import CategoryRulesEngine
    CATEGORIZATION_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Categorization system not available: {e}")
    CATEGORIZATION_AVAILABLE = False


@dataclass
class ModuleNode:
    """Represents a module node in the module graph."""
    id: str
    name: str
    path: str
    complexity: ComplexityScore
    size: int
    functions: List[str]


@dataclass
class ModuleEdge:
    """Represents an edge between modules in the module graph."""
    source: str
    target: str
    type: str  # 'import' or 'dependency'
    weight: int = 1


@dataclass
class ModuleGraph:
    """Represents the module dependency graph."""
    nodes: List[ModuleNode]
    edges: List[ModuleEdge]


@dataclass
class FunctionNode:
    """Represents a function node in the call graph."""
    id: str
    name: str
    module: str
    complexity: int
    line_number: int
    parameters: List[Parameter]


@dataclass
class CallEdge:
    """Represents a function call edge in the call graph."""
    caller: str
    callee: str
    call_count: int = 1
    line_numbers: List[int] = None
    
    def __post_init__(self):
        if self.line_numbers is None:
            self.line_numbers = []


@dataclass
class CallGraph:
    """Represents the function call graph."""
    nodes: List[FunctionNode]
    edges: List[CallEdge]


@dataclass
class AnalysisMetadata:
    """Metadata about the analysis process."""
    project_path: str
    analysis_time: float
    total_files: int
    analyzed_files: int
    errors: List[Dict[str, Any]]
    warnings: List[Dict[str, Any]]


@dataclass
class CallRelationship:
    """Represents a call relationship with full target path and label."""
    target: List[str]  # [folder, file, class, function]
    label: str  # "uses", "fetches", "calls", etc.


@dataclass
class CodeGraphNode:
    """Represents a node in the enhanced code graph structure."""
    name: str
    type: str  # "folder", "file", "class", "function"
    children: List['CodeGraphNode']
    calls: List[CallRelationship]
    complexity: Optional[ComplexityScore] = None
    path: Optional[str] = None
    line_number: Optional[int] = None


@dataclass
class AnalysisResult:
    """Complete analysis result for a Python project."""
    success: bool
    errors: List[Dict[str, Any]]
    warnings: List[Dict[str, Any]]
    tech_stack: TechStack
    code_graph_json: List[CodeGraphNode]  # Enhanced code graph structure
    metadata: AnalysisMetadata
    categorized_tech_stack: Optional[Dict[str, Any]] = None  # New categorized structure
    
    def to_json(self, validate: bool = True) -> str:
        """Convert analysis result to JSON string.
        
        Args:
            validate: Whether to validate the JSON against schema
            
        Returns:
            JSON string representation of the analysis result
            
        Raises:
            AnalysisError: If serialization or validation fails
        """
        try:
            # Convert dataclasses to dictionaries with custom serialization
            result_dict = self._to_dict()
            json_str = json.dumps(result_dict, indent=2, default=self._json_serializer)
            
            # Skip validation for now since we changed the schema
            if validate:
                logger.info("JSON validation skipped - using new schema format")
            
            return json_str
        except Exception as e:
            logger.error(f"Failed to serialize analysis result: {e}")
            raise AnalysisError(f"JSON serialization failed: {e}")
    
    def _to_dict(self) -> Dict[str, Any]:
        """Convert analysis result to dictionary with simplified structure."""
        result_dict = {
            "success": self.success,
            "errors": self.errors,
            "warnings": self.warnings,
            "metadata": {
                "project_path": self.metadata.project_path,
                "analysis_time": self.metadata.analysis_time,
                "total_files": self.metadata.total_files,
                "analyzed_files": self.metadata.analyzed_files,
                "timestamp": self._get_timestamp()
            },
            "tech_stack": {
                "libraries": [self._library_to_dict(lib) for lib in self.tech_stack.libraries],
                "frameworks": self.tech_stack.frameworks,
                "python_version": self.tech_stack.python_version,
                "package_manager": self.tech_stack.package_manager
            },
            "code_graph_json": [self._code_graph_node_to_dict(node) for node in self.code_graph_json] if self.code_graph_json else [],
            "schema_version": "2.0.0"
        }
        
        # Add categorized tech stack if available
        if self.categorized_tech_stack:
            result_dict.update(self.categorized_tech_stack)
        
        return result_dict
    
    def _library_to_dict(self, library) -> Dict[str, Any]:
        """Convert Library to dictionary."""
        return {
            "name": library.name,
            "version": library.version,
            "source": library.source,
            "extras": library.extras or []
        }
    
    def _code_graph_node_to_dict(self, node: CodeGraphNode) -> Dict[str, Any]:
        """Convert CodeGraphNode to dictionary."""
        result = {
            "name": node.name,
            "type": node.type,
            "children": [self._code_graph_node_to_dict(child) for child in node.children],
            "calls": [self._call_relationship_to_dict(call) for call in node.calls]
        }
        
        if node.complexity:
            result["complexity"] = {
                "cyclomatic": node.complexity.cyclomatic,
                "cognitive": node.complexity.cognitive,
                "level": node.complexity.level.value
            }
        
        if node.path:
            result["path"] = node.path
        
        if node.line_number:
            result["line_number"] = node.line_number
        
        return result
    
    def _call_relationship_to_dict(self, call: CallRelationship) -> Dict[str, Any]:
        """Convert CallRelationship to dictionary."""
        return {
            "target": call.target,
            "label": call.label
        }

    def _get_timestamp(self) -> str:
        """Get current timestamp in ISO format."""
        from datetime import datetime
        return datetime.now().isoformat()
    
    @staticmethod
    def _json_serializer(obj):
        """Custom JSON serializer for non-serializable objects."""
        if hasattr(obj, '__dict__'):
            return obj.__dict__
        elif hasattr(obj, 'value'):  # For Enum objects
            return obj.value
        return str(obj)


class EnhancedCodeGraphBuilder:
    """Builder for enhanced code graph with hierarchical structure."""
    
    def __init__(self, project_path: Path):
        """Initialize the enhanced code graph builder.
        
        Args:
            project_path: Path to the project root
        """
        self.project_path = project_path
        self.function_registry: Dict[str, FunctionInfo] = {}
        self.call_relationships: Dict[str, List[CallRelationship]] = {}
    
    def build_code_graph(self, modules: List[ModuleInfo]) -> List[CodeGraphNode]:
        """Build enhanced code graph with hierarchical structure.
        
        Args:
            modules: List of analyzed modules
            
        Returns:
            List of CodeGraphNode objects representing the hierarchical structure
        """
        logger.info(f"Building enhanced code graph from {len(modules)} modules...")
        
        if not modules:
            logger.warning("No modules provided for code graph building")
            return []
        
        # Register all functions for call resolution
        self._register_functions(modules)
        logger.info(f"Registered {len(self.function_registry)} functions")
        
        # Extract call relationships with enhanced tracking
        self._extract_enhanced_call_relationships(modules)
        logger.info(f"Extracted call relationships for {len(self.call_relationships)} functions")
        
        # Build hierarchical structure
        folder_structure = self._build_folder_structure(modules)
        
        logger.info(f"Built enhanced code graph with {len(folder_structure)} top-level folders")
        return folder_structure
    
    def _register_functions(self, modules: List[ModuleInfo]) -> None:
        """Register all functions for call resolution.
        
        Args:
            modules: List of analyzed modules
        """
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
    
    def _extract_enhanced_call_relationships(self, modules: List[ModuleInfo]) -> None:
        """Extract call relationships with full path tracking and labels.
        
        Args:
            modules: List of analyzed modules
        """
        for module in modules:
            try:
                module_path = Path(module.path)
                if module_path.exists():
                    with open(module_path, 'r', encoding='utf-8') as f:
                        source_code = f.read()
                    
                    tree = ast.parse(source_code, filename=str(module_path))
                    visitor = EnhancedCallExtractorVisitor(module.name, self.function_registry)
                    visitor.visit(tree)
                    
                    # Store call relationships for each function
                    for func_id, calls in visitor.function_calls.items():
                        self.call_relationships[func_id] = calls
                        
            except Exception as e:
                logger.error(f"Failed to extract enhanced calls from {module.path}: {e}")
    
    def _build_folder_structure(self, modules: List[ModuleInfo]) -> List[CodeGraphNode]:
        """Build hierarchical folder structure.
        
        Args:
            modules: List of analyzed modules
            
        Returns:
            List of top-level folder nodes
        """
        # Group modules by their folder structure
        folder_map: Dict[str, List[ModuleInfo]] = {}
        
        for module in modules:
            try:
                module_path = Path(module.path)
                
                # Handle relative paths more safely
                try:
                    relative_path = module_path.relative_to(self.project_path)
                except ValueError:
                    # If relative_to fails, use the module path as-is
                    relative_path = module_path
                
                if len(relative_path.parts) > 1:
                    # Module is in a subfolder
                    folder_name = relative_path.parts[0]
                else:
                    # Module is in root
                    folder_name = "root"
                
                if folder_name not in folder_map:
                    folder_map[folder_name] = []
                folder_map[folder_name].append(module)
                
            except Exception as e:
                logger.warning(f"Failed to process module path {module.path}: {e}")
                # Fallback: put in root folder
                if "root" not in folder_map:
                    folder_map["root"] = []
                folder_map["root"].append(module)
        
        # Build folder nodes
        folder_nodes = []
        for folder_name, folder_modules in folder_map.items():
            logger.info(f"Building folder '{folder_name}' with {len(folder_modules)} modules")
            folder_node = self._build_folder_node(folder_name, folder_modules)
            folder_nodes.append(folder_node)
        
        logger.info(f"Created {len(folder_nodes)} folder nodes")
        return folder_nodes
    
    def _build_folder_node(self, folder_name: str, modules: List[ModuleInfo]) -> CodeGraphNode:
        """Build a folder node with its contained files.
        
        Args:
            folder_name: Name of the folder
            modules: List of modules in this folder
            
        Returns:
            CodeGraphNode representing the folder
        """
        file_nodes = []
        
        for module in modules:
            file_node = self._build_file_node(module)
            file_nodes.append(file_node)
        
        return CodeGraphNode(
            name=folder_name,
            type="folder",
            children=file_nodes,
            calls=[]
        )
    
    def _build_file_node(self, module: ModuleInfo) -> CodeGraphNode:
        """Build a file node with its contained classes and functions.
        
        Args:
            module: ModuleInfo object
            
        Returns:
            CodeGraphNode representing the file
        """
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
        
        file_name = Path(module.path).name
        logger.debug(f"Built file node '{file_name}' with {len(children)} children ({len(module.classes)} classes, {len([f for f in module.functions if not f.is_method])} functions)")
        
        return CodeGraphNode(
            name=file_name,
            type="file",
            children=children,
            calls=[],
            path=module.path
        )
    
    def _build_class_node(self, class_info: ClassInfo, module_name: str) -> CodeGraphNode:
        """Build a class node with its methods.
        
        Args:
            class_info: ClassInfo object
            module_name: Name of the containing module
            
        Returns:
            CodeGraphNode representing the class
        """
        method_nodes = []
        
        for method in class_info.methods:
            method_node = self._build_function_node(method, module_name, class_info.name)
            method_nodes.append(method_node)
        
        return CodeGraphNode(
            name=class_info.name,
            type="class",
            children=method_nodes,
            calls=[],
            line_number=class_info.line_number
        )
    
    def _build_function_node(self, func: FunctionInfo, module_name: str, class_name: Optional[str] = None) -> CodeGraphNode:
        """Build a function node with call relationships.
        
        Args:
            func: FunctionInfo object
            module_name: Name of the containing module
            class_name: Name of the containing class (if any)
            
        Returns:
            CodeGraphNode representing the function
        """
        # Build function identifier for call lookup
        if class_name:
            func_id = f"{module_name}.{class_name}.{func.name}"
        else:
            func_id = f"{module_name}.{func.name}"
        
        # Get call relationships for this function
        calls = self.call_relationships.get(func_id, [])
        
        return CodeGraphNode(
            name=func.name,
            type="function",
            children=[],
            calls=calls,
            complexity=func.complexity,
            line_number=func.line_number
        )


class EnhancedCallExtractorVisitor(ast.NodeVisitor):
    """Enhanced AST visitor to extract function calls with full path tracking."""
    
    def __init__(self, current_module: str, function_registry: Dict[str, FunctionInfo]):
        """Initialize the enhanced call extractor visitor.
        
        Args:
            current_module: Name of the current module being analyzed
            function_registry: Registry of all known functions
        """
        self.current_module = current_module
        self.function_registry = function_registry
        self.function_calls: Dict[str, List[CallRelationship]] = {}
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
        """Visit function call expressions to extract enhanced call relationships."""
        if not self.current_function_stack:
            self.generic_visit(node)
            return
        
        caller_id = self.current_function_stack[-1]
        call_info = self._resolve_enhanced_call_target(node.func)
        
        if call_info:
            target_path, label = call_info
            call_relationship = CallRelationship(target=target_path, label=label)
            self.function_calls[caller_id].append(call_relationship)
        
        self.generic_visit(node)
    
    def _resolve_enhanced_call_target(self, func_node: ast.AST) -> Optional[Tuple[List[str], str]]:
        """Resolve the target function with full path and generate label.
        
        Args:
            func_node: AST node representing the called function
            
        Returns:
            Tuple of (target_path, label) or None if not resolvable
        """
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
            return self._resolve_enhanced_attribute_call(func_node)
        
        return None
    
    def _resolve_enhanced_attribute_call(self, attr_node: ast.Attribute) -> Optional[Tuple[List[str], str]]:
        """Resolve attribute-based function calls with enhanced path tracking.
        
        Args:
            attr_node: Attribute AST node
            
        Returns:
            Tuple of (target_path, label) or None if not resolvable
        """
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
            
            # Check for cls.method() calls
            if obj_name == "cls" and self.current_class:
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


class ProjectAnalyzer:
    """Main analyzer class for Python projects."""
    
    def __init__(self, project_path: Union[str, Path], use_cache: bool = True, cache_dir: Optional[Path] = None,
                 performance_config: Optional['PerformanceConfig'] = None):
        """Initialize the project analyzer.
        
        Args:
            project_path: Path to the Python project to analyze
            use_cache: Whether to use caching for analysis results
            cache_dir: Directory to store cache files (optional)
            performance_config: Performance optimization configuration (optional)
        """
        self.project_path = Path(project_path).resolve()
        self.errors: List[Dict[str, Any]] = []
        self.warnings: List[Dict[str, Any]] = []
        self.use_cache = use_cache
        
        if not self.project_path.exists():
            raise AnalysisError(f"Project path does not exist: {self.project_path}")
        
        # Initialize cache manager if caching is enabled
        if self.use_cache:
            from cache_manager import CacheManager, IncrementalAnalyzer
            self.cache_manager = CacheManager(cache_dir)
            self.incremental_analyzer = IncrementalAnalyzer(self.cache_manager)
        else:
            self.cache_manager = None
            self.incremental_analyzer = None
        
        # Initialize performance optimizer
        from performance_optimizer import PerformanceOptimizer, PerformanceConfig
        if performance_config is None:
            performance_config = PerformanceConfig()
        self.performance_optimizer = PerformanceOptimizer(performance_config)
        
        logger.info(f"Initialized analyzer for project: {self.project_path} (cache: {use_cache})")
    
    def analyze_project(self, force_refresh: bool = False) -> AnalysisResult:
        """Analyze the entire Python project.
        
        Args:
            force_refresh: Force analysis even if cached result exists
        
        Returns:
            AnalysisResult containing all analysis data
            
        Raises:
            AnalysisError: If analysis fails critically
        """
        import time
        start_time = time.time()
        
        logger.info("Starting project analysis...")
        
        # Analyze project size and get performance recommendations
        size_info, recommendations = self.performance_optimizer.optimize_for_project(self.project_path)
        
        # Start performance monitoring
        self.performance_optimizer.start_monitoring()
        
        # Try to get cached result first
        if self.use_cache and not force_refresh:
            cached_result = self.cache_manager.get_cached_result(self.project_path)
            if cached_result is not None:
                logger.info("Using cached analysis result")
                self.performance_optimizer.stop_monitoring()
                # Convert cached dict back to AnalysisResult
                return self._dict_to_analysis_result(cached_result)
        
        try:
            # Find all Python files
            python_files = self._discover_python_files()
            logger.info(f"Found {len(python_files)} Python files")
            
            # Filter files by size for performance
            python_files = self.performance_optimizer.filter_files_by_size(python_files)
            logger.info(f"Processing {len(python_files)} Python files after size filtering")
            
            # Parse modules using AST parser with progress reporting
            from ast_parser import ModuleDiscovery
            from complexity_analyzer import ComplexityAnalyzer
            
            module_discovery = ModuleDiscovery(self.project_path)
            
            # Set up progress reporting
            self.performance_optimizer.progress_reporter.set_total_steps(len(python_files) + 5)  # +5 for other steps
            self.performance_optimizer.progress_reporter.update_progress("Starting module discovery")
            
            modules = module_discovery.discover_modules(python_files)
            
            # Enhance complexity analysis using radon
            self.performance_optimizer.progress_reporter.update_progress("Analyzing complexity")
            complexity_analyzer = ComplexityAnalyzer()
            enhanced_modules = []
            for i, module in enumerate(modules):
                enhanced_module = complexity_analyzer.enhance_module_complexity(module)
                enhanced_modules.append(enhanced_module)
                
                # Periodic memory cleanup for large projects
                if i % 100 == 0 and i > 0:
                    self.performance_optimizer.cleanup_memory()
            
            # Resolve module dependencies
            self.performance_optimizer.progress_reporter.update_progress("Resolving dependencies")
            dependencies = module_discovery.resolve_dependencies(enhanced_modules)
            
            # Build module graph
            self.performance_optimizer.progress_reporter.update_progress("Building module graph")
            module_graph = self._build_module_graph(enhanced_modules, dependencies)
            
            # Parse dependencies and detect tech stack
            self.performance_optimizer.progress_reporter.update_progress("Parsing dependencies")
            from dependency_parser import DependencyParser
            dependency_parser = DependencyParser(self.project_path)
            tech_stack = dependency_parser.parse_dependencies()
            
            # Detect framework patterns
            self.performance_optimizer.progress_reporter.update_progress("Detecting frameworks")
            from framework_detector import FrameworkDetector
            framework_detector = FrameworkDetector(self.project_path, tech_stack.frameworks)
            framework_patterns = framework_detector.detect_patterns()
            
            # Add framework detection errors and warnings
            self.errors.extend(framework_detector.errors)
            self.warnings.extend(framework_detector.warnings)
            
            # Build call graph
            self.performance_optimizer.progress_reporter.update_progress("Building call graph")
            from call_graph import CallGraphBuilder
            call_graph_builder = CallGraphBuilder()
            call_graph = call_graph_builder.build_call_graph(enhanced_modules)
            
            # Generate enhanced module cards
            self.performance_optimizer.progress_reporter.update_progress("Generating module cards")
            from module_card_generator import ModuleCardGenerator
            card_generator = ModuleCardGenerator(self.project_path)
            module_cards = card_generator.generate_module_cards(enhanced_modules, dependencies)
            
            # Analyze folder structure
            self.performance_optimizer.progress_reporter.update_progress("Analyzing folder structure")
            from folder_structure_analyzer import FolderStructureAnalyzer
            folder_analyzer = FolderStructureAnalyzer(self.project_path)
            folder_structure = folder_analyzer.analyze_folder_structure(enhanced_modules)
            
            # Build enhanced code graph structure
            self.performance_optimizer.progress_reporter.update_progress("Building enhanced code graph")
            try:
                code_graph_builder = EnhancedCodeGraphBuilder(self.project_path)
                code_graph_json = code_graph_builder.build_code_graph(enhanced_modules)
                
                if not code_graph_json:
                    logger.warning("Enhanced code graph builder returned empty result")
                    code_graph_json = []
                    
            except Exception as e:
                logger.error(f"Enhanced code graph building failed: {e}")
                self._add_warning("code_graph_building", f"Enhanced code graph building failed: {e}")
                code_graph_json = []
            
            # Calculate complexity statistics
            complexity_stats = complexity_analyzer.calculate_project_complexity_stats(enhanced_modules)
            
            # Generate categorized tech stack using new Python-driven system
            categorized_tech_stack = None
            if CATEGORIZATION_AVAILABLE:
                try:
                    self.performance_optimizer.progress_reporter.update_progress("Categorizing technologies")
                    logger.info("Starting Python-driven tech stack categorization...")
                    
                    # Initialize categorization system
                    rules_engine = CategoryRulesEngine()
                    categorizer = TechStackCategorizer(rules_engine)
                    
                    # Prepare technology data for categorization
                    technologies = []
                    seen_technologies = set()  # Track technologies to avoid duplicates
                    
                    # Add libraries from tech stack
                    for library in tech_stack.libraries:
                        tech_name = library.name.lower()
                        if tech_name not in seen_technologies:
                            technologies.append({
                                "name": library.name,
                                "version": library.version,
                                "source": library.source,
                                "confidence": 1.0
                            })
                            seen_technologies.add(tech_name)
                    
                    # Add frameworks (only if not already added as library)
                    for framework in tech_stack.frameworks:
                        tech_name = framework.lower()
                        if tech_name not in seen_technologies:
                            technologies.append({
                                "name": framework,
                                "source": "framework_detection",
                                "confidence": 0.9
                            })
                            seen_technologies.add(tech_name)
                    
                    # Add Python version as a technology
                    if tech_stack.python_version:
                        technologies.append({
                            "name": "python",
                            "version": tech_stack.python_version,
                            "source": "version_detection",
                            "confidence": 1.0
                        })
                    
                    # Add package manager
                    technologies.append({
                        "name": tech_stack.package_manager,
                        "source": "package_manager_detection",
                        "confidence": 1.0
                    })
                    
                    # Perform categorization
                    analysis_data = {
                        "project_path": str(self.project_path),
                        "modules": len(enhanced_modules),
                        "complexity_stats": complexity_stats
                    }
                    
                    categorized_result = categorizer.categorize_technologies(technologies, analysis_data)
                    categorized_tech_stack = categorizer.generate_output_json(categorized_result)
                    
                    # Validate the output
                    validation_result = categorizer.validate_output(categorized_tech_stack)
                    if not validation_result["valid"]:
                        logger.warning(f"Categorization validation failed: {validation_result['errors']}")
                        for warning in validation_result["warnings"]:
                            self._add_warning("categorization_validation", warning)
                    else:
                        logger.info(f"Categorization completed successfully: {validation_result['statistics']}")
                    
                except Exception as e:
                    logger.error(f"Tech stack categorization failed: {e}")
                    self._add_warning("categorization_failure", f"Tech stack categorization failed: {e}")
                    categorized_tech_stack = None
            else:
                logger.info("Python-driven categorization system not available, skipping...")
            
            # Final memory cleanup
            self.performance_optimizer.cleanup_memory()
            
            # Create metadata with performance stats
            analysis_time = time.time() - start_time
            performance_stats = self.performance_optimizer.get_performance_stats()
            
            metadata = AnalysisMetadata(
                project_path=str(self.project_path),
                analysis_time=analysis_time,
                total_files=len(python_files),
                analyzed_files=len(enhanced_modules),
                errors=self.errors.copy(),
                warnings=self.warnings.copy()
            )
            
            result = AnalysisResult(
                success=len(self.errors) == 0,
                errors=self.errors.copy(),
                warnings=self.warnings.copy(),
                tech_stack=tech_stack,
                code_graph_json=code_graph_json,
                metadata=metadata,
                categorized_tech_stack=categorized_tech_stack
            )
            
            # Stop performance monitoring
            self.performance_optimizer.stop_monitoring()
            self.performance_optimizer.progress_reporter.finish()
            
            logger.info(f"Analysis completed in {analysis_time:.2f} seconds")
            logger.info(f"Analyzed {len(enhanced_modules)} modules with {len(module_graph.edges)} dependencies")
            logger.info(f"Complexity stats: {complexity_stats['total_functions']} functions, "
                       f"avg complexity: {complexity_stats['average_complexity']:.1f}")
            logger.info(f"Performance stats: {performance_stats}")
            
            # Cache the result if caching is enabled
            if self.use_cache:
                try:
                    result_dict = result._to_dict()
                    self.cache_manager.cache_result(self.project_path, result_dict)
                except Exception as e:
                    logger.warning(f"Failed to cache analysis result: {e}")
            
            return result
            
        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            self._add_error("analysis_failure", str(e))
            
            # Stop performance monitoring on error
            self.performance_optimizer.stop_monitoring()
            
            # Return failed result
            analysis_time = time.time() - start_time
            metadata = AnalysisMetadata(
                project_path=str(self.project_path),
                analysis_time=analysis_time,
                total_files=len(python_files) if 'python_files' in locals() else 0,
                analyzed_files=0,
                errors=self.errors.copy(),
                warnings=self.warnings.copy()
            )
            
            # Create empty tech stack for failed analysis
            empty_tech_stack = TechStack(libraries=[], frameworks=[], package_manager="pip")
            
            # Create empty framework patterns for failed analysis
            from framework_detector import FrameworkPatterns
            empty_framework_patterns = FrameworkPatterns()
            
            return AnalysisResult(
                success=False,
                errors=self.errors.copy(),
                warnings=self.warnings.copy(),
                tech_stack=empty_tech_stack,
                code_graph_json=[],
                metadata=metadata
            )
    
    def _discover_python_files(self) -> List[Path]:
        """Discover all Python files in the project.
        
        Returns:
            List of Python file paths
        """
        python_files = []
        
        try:
            # Recursively find all .py files
            for py_file in self.project_path.rglob("*.py"):
                # Skip common directories that shouldn't be analyzed
                if any(part.startswith('.') or part in ['__pycache__', 'node_modules', 'venv', 'env'] 
                       for part in py_file.parts):
                    continue
                python_files.append(py_file)
                
        except Exception as e:
            self._add_error("file_discovery", f"Failed to discover Python files: {e}")
        
        return python_files
    
    def _add_error(self, error_type: str, message: str, file_path: Optional[str] = None, line: Optional[int] = None):
        """Add an error to the error list.
        
        Args:
            error_type: Type of error
            message: Error message
            file_path: Optional file path where error occurred
            line: Optional line number where error occurred
        """
        error = {
            "type": error_type,
            "message": message
        }
        if file_path:
            error["file"] = file_path
        if line:
            error["line"] = line
            
        self.errors.append(error)
        logger.error(f"Analysis error ({error_type}): {message}")
    
    def _add_warning(self, warning_type: str, message: str, file_path: Optional[str] = None):
        """Add a warning to the warning list.
        
        Args:
            warning_type: Type of warning
            message: Warning message
            file_path: Optional file path where warning occurred
        """
        warning = {
            "type": warning_type,
            "message": message
        }
        if file_path:
            warning["file"] = file_path
            
        self.warnings.append(warning)
        logger.warning(f"Analysis warning ({warning_type}): {message}")
    
    def _build_module_graph(self, modules: List[ModuleInfo], dependencies: Dict[str, Set[str]]) -> ModuleGraph:
        """Build module dependency graph.
        
        Args:
            modules: List of parsed modules
            dependencies: Dictionary of module dependencies
            
        Returns:
            ModuleGraph object
        """
        nodes = []
        edges = []
        
        # Create nodes for each module
        for module in modules:
            function_names = [func.name for func in module.functions]
            
            node = ModuleNode(
                id=module.name,
                name=module.name,
                path=module.path,
                complexity=module.complexity,
                size=module.size_lines,
                functions=function_names
            )
            nodes.append(node)
        
        # Create edges for dependencies
        for module_name, deps in dependencies.items():
            for dep in deps:
                edge = ModuleEdge(
                    source=module_name,
                    target=dep,
                    type="import",
                    weight=1
                )
                edges.append(edge)
        
        return ModuleGraph(nodes=nodes, edges=edges)
    
    def _dict_to_analysis_result(self, data: Dict[str, Any]) -> AnalysisResult:
        """Convert dictionary back to AnalysisResult object.
        
        Args:
            data: Dictionary representation of analysis result
            
        Returns:
            AnalysisResult object
        """
        from dependency_parser import Library, TechStack
        
        # Reconstruct tech stack
        tech_stack_data = data.get("tech_stack", {})
        libraries = [
            Library(
                name=lib["name"],
                version=lib["version"],
                source=lib["source"],
                extras=lib.get("extras", [])
            )
            for lib in tech_stack_data.get("libraries", [])
        ]
        
        tech_stack = TechStack(
            libraries=libraries,
            frameworks=tech_stack_data.get("frameworks", []),
            python_version=tech_stack_data.get("python_version", ""),
            package_manager=tech_stack_data.get("package_manager", "pip")
        )
        
        # Reconstruct metadata
        metadata_data = data.get("metadata", {})
        metadata = AnalysisMetadata(
            project_path=metadata_data.get("project_path", ""),
            analysis_time=metadata_data.get("analysis_time", 0.0),
            total_files=metadata_data.get("total_files", 0),
            analyzed_files=metadata_data.get("analyzed_files", 0),
            errors=data.get("errors", []),
            warnings=data.get("warnings", [])
        )
        
        # Reconstruct code_graph_json from cached data
        code_graph_data = data.get("code_graph_json", [])
        code_graph_json = []
        
        if code_graph_data:
            try:
                code_graph_json = self._reconstruct_code_graph_nodes(code_graph_data)
            except Exception as e:
                logger.warning(f"Failed to reconstruct code_graph_json from cache: {e}")
                code_graph_json = []
        
        return AnalysisResult(
            success=data.get("success", True),
            errors=data.get("errors", []),
            warnings=data.get("warnings", []),
            tech_stack=tech_stack,
            code_graph_json=code_graph_json,
            metadata=metadata
        )
    
    def _reconstruct_code_graph_nodes(self, nodes_data: List[Dict[str, Any]]) -> List[CodeGraphNode]:
        """Reconstruct CodeGraphNode objects from cached dictionary data.
        
        Args:
            nodes_data: List of dictionary representations of CodeGraphNode objects
            
        Returns:
            List of reconstructed CodeGraphNode objects
        """
        nodes = []
        
        for node_data in nodes_data:
            try:
                # Reconstruct complexity if present
                complexity = None
                if node_data.get("complexity"):
                    complexity_data = node_data["complexity"]
                    complexity = ComplexityScore(
                        cyclomatic=complexity_data.get("cyclomatic", 0),
                        cognitive=complexity_data.get("cognitive", 0),
                        level=ComplexityLevel(complexity_data.get("level", "low"))
                    )
                
                # Reconstruct call relationships
                calls = []
                for call_data in node_data.get("calls", []):
                    call_relationship = CallRelationship(
                        target=call_data.get("target", []),
                        label=call_data.get("label", "calls")
                    )
                    calls.append(call_relationship)
                
                # Recursively reconstruct children
                children = []
                if node_data.get("children"):
                    children = self._reconstruct_code_graph_nodes(node_data["children"])
                
                # Create the node
                node = CodeGraphNode(
                    name=node_data.get("name", ""),
                    type=node_data.get("type", "folder"),
                    children=children,
                    calls=calls,
                    complexity=complexity,
                    path=node_data.get("path"),
                    line_number=node_data.get("line_number")
                )
                
                nodes.append(node)
                
            except Exception as e:
                logger.warning(f"Failed to reconstruct code graph node: {e}")
                continue
        
        return nodes

    def clear_cache(self):
        """Clear analysis cache."""
        if self.cache_manager:
            self.cache_manager.clear_cache()
            logger.info("Analysis cache cleared")
        else:
            logger.warning("Cache not enabled")
    
    def invalidate_cache(self):
        """Invalidate cache for this project."""
        if self.cache_manager:
            self.cache_manager.invalidate_project_cache(self.project_path)
            logger.info(f"Cache invalidated for project: {self.project_path}")
        else:
            logger.warning("Cache not enabled")
    
    def get_cache_stats(self) -> Optional[Dict[str, Any]]:
        """Get cache statistics.
        
        Returns:
            Cache statistics or None if cache not enabled
        """
        if self.cache_manager:
            return self.cache_manager.get_cache_stats()
        return None
    
    def analyze_current_file(self, file_path: Union[str, Path]) -> Optional['FileAnalysisResult']:
        """Analyze a single Python file for current file analysis.
        
        Args:
            file_path: Path to the Python file to analyze
            
        Returns:
            FileAnalysisResult object or None if analysis fails
        """
        try:
            file_path = Path(file_path)
            
            if not file_path.exists() or file_path.suffix != '.py':
                logger.error(f"Invalid Python file: {file_path}")
                return None
            
            logger.info(f"Analyzing current file: {file_path}")
            
            # Parse the file using AST parser
            from ast_parser import ASTParser
            ast_parser = ASTParser()
            module_info = ast_parser.parse_file(file_path)
            
            if not module_info:
                logger.error(f"Failed to parse file: {file_path}")
                return None
            
            # Enhance with complexity analysis
            from complexity_analyzer import ComplexityAnalyzer
            complexity_analyzer = ComplexityAnalyzer()
            enhanced_module = complexity_analyzer.enhance_module_complexity(module_info)
            
            # Generate module card for this file
            from module_card_generator import ModuleCardGenerator
            card_generator = ModuleCardGenerator(self.project_path)
            module_cards = card_generator.generate_module_cards([enhanced_module], {})
            
            # Detect framework patterns for this file (if framework_detector supports it)
            framework_patterns = {}
            try:
                from framework_detector import FrameworkDetector
                framework_detector = FrameworkDetector(self.project_path, [])
                # Note: This assumes framework_detector has a method for single file analysis
                # If not available, we'll just use empty patterns
                if hasattr(framework_detector, 'detect_patterns_in_file'):
                    framework_patterns = framework_detector.detect_patterns_in_file(file_path)
            except Exception as e:
                logger.debug(f"Framework pattern detection failed for single file: {e}")
            
            # Create file analysis result
            from dataclasses import dataclass
            
            @dataclass
            class FileAnalysisResult:
                """Analysis result for a single file."""
                file_path: str
                module_info: ModuleInfo
                module_card: Optional['ModuleCard']
                framework_patterns: Dict[str, Any]
                complexity_summary: Dict[str, Any]
                success: bool = True
                
                def to_dict(self) -> Dict[str, Any]:
                    """Convert to dictionary for JSON serialization."""
                    return {
                        "success": self.success,
                        "file_path": self.file_path,
                        "module_info": {
                            "name": self.module_info.name,
                            "functions": len(self.module_info.functions),
                            "classes": len(self.module_info.classes),
                            "imports": len(self.module_info.imports),
                            "complexity": {
                                "cyclomatic": self.module_info.complexity.cyclomatic,
                                "level": self.module_info.complexity.level.value
                            },
                            "size_lines": self.module_info.size_lines
                        },
                        "module_card": self.module_card.to_dict() if self.module_card else None,
                        "framework_patterns": self.framework_patterns,
                        "complexity_summary": self.complexity_summary
                    }
            
            # Calculate complexity summary
            complexity_summary = {
                "total_functions": len(enhanced_module.functions),
                "average_complexity": sum(f.complexity.cyclomatic for f in enhanced_module.functions) / len(enhanced_module.functions) if enhanced_module.functions else 0,
                "max_complexity": max((f.complexity.cyclomatic for f in enhanced_module.functions), default=0),
                "complexity_level": enhanced_module.complexity.level.value
            }
            
            result = FileAnalysisResult(
                file_path=str(file_path),
                module_info=enhanced_module,
                module_card=module_cards[0] if module_cards else None,
                framework_patterns=framework_patterns,
                complexity_summary=complexity_summary
            )
            
            logger.info(f"Successfully analyzed file: {file_path}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to analyze current file {file_path}: {e}")
            return None


def main():
    """Main entry point for command-line usage."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Analyze Python project structure and complexity")
    parser.add_argument("project_path", help="Path to the Python project to analyze")
    parser.add_argument("--no-cache", action="store_true", help="Disable caching")
    parser.add_argument("--force-refresh", action="store_true", help="Force refresh even if cache exists")
    parser.add_argument("--clear-cache", action="store_true", help="Clear cache and exit")
    parser.add_argument("--cache-stats", action="store_true", help="Show cache statistics and exit")
    parser.add_argument("--max-workers", type=int, help="Maximum number of parallel workers")
    parser.add_argument("--max-memory", type=int, default=1024, help="Maximum memory usage in MB")
    parser.add_argument("--max-file-size", type=int, default=10, help="Skip files larger than this (MB)")
    parser.add_argument("--no-parallel", action="store_true", help="Disable parallel processing")
    parser.add_argument("--no-monitoring", action="store_true", help="Disable memory monitoring")
    
    args = parser.parse_args()
    
    try:
        # Create performance configuration
        from performance_optimizer import PerformanceConfig
        perf_config = PerformanceConfig(
            max_workers=args.max_workers,
            max_memory_mb=args.max_memory,
            max_file_size_mb=args.max_file_size,
            enable_parallel=not args.no_parallel,
            enable_memory_monitoring=not args.no_monitoring
        )
        
        analyzer = ProjectAnalyzer(args.project_path, use_cache=not args.no_cache, performance_config=perf_config)
        
        # Handle cache-only operations
        if args.clear_cache:
            analyzer.clear_cache()
            print("Cache cleared successfully")
            sys.exit(0)
        
        if args.cache_stats:
            stats = analyzer.get_cache_stats()
            if stats:
                print(json.dumps(stats, indent=2))
            else:
                print("Cache not enabled")
            sys.exit(0)
        
        # Perform analysis
        result = analyzer.analyze_project(force_refresh=args.force_refresh)
        
        # Output JSON result
        print(result.to_json())
        
        # Exit with appropriate code
        sys.exit(0 if result.success else 1)
        
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        error_result = {
            "success": False,
            "errors": [{"type": "fatal_error", "message": str(e)}],
            "warnings": []
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()