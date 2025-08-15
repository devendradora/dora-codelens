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
from typing import Dict, List, Optional, Set, Union, Any
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
        """Calculate complexity level based on cyclomatic complexity."""
        if self.cyclomatic <= 5:
            self.level = ComplexityLevel.LOW
        elif self.cyclomatic <= 10:
            self.level = ComplexityLevel.MEDIUM
        else:
            self.level = ComplexityLevel.HIGH


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
class AnalysisResult:
    """Complete analysis result for a Python project."""
    tech_stack: TechStack
    modules: List[ModuleInfo]
    module_graph: ModuleGraph
    call_graph: CallGraph
    framework_patterns: 'FrameworkPatterns'  # Forward reference to avoid circular import
    metadata: AnalysisMetadata
    success: bool = True
    
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
            
            # Validate JSON if requested
            if validate:
                try:
                    from json_schema import validate_analysis_json
                    validate_analysis_json(result_dict)
                    logger.info("JSON validation successful")
                except ImportError:
                    logger.warning("JSON schema validation not available - skipping validation")
                except Exception as e:
                    logger.error(f"JSON validation failed: {e}")
                    raise AnalysisError(f"JSON validation failed: {e}")
            
            return json_str
        except Exception as e:
            logger.error(f"Failed to serialize analysis result: {e}")
            raise AnalysisError(f"JSON serialization failed: {e}")
    
    def _to_dict(self) -> Dict[str, Any]:
        """Convert analysis result to dictionary with proper structure."""
        return {
            "success": self.success,
            "metadata": {
                "project_path": self.metadata.project_path,
                "analysis_time": self.metadata.analysis_time,
                "total_files": self.metadata.total_files,
                "analyzed_files": self.metadata.analyzed_files,
                "timestamp": self._get_timestamp()
            },
            "errors": self.metadata.errors,
            "warnings": self.metadata.warnings,
            "tech_stack": {
                "libraries": [self._library_to_dict(lib) for lib in self.tech_stack.libraries],
                "frameworks": self.tech_stack.frameworks,
                "python_version": self.tech_stack.python_version,
                "package_manager": self.tech_stack.package_manager
            },
            "modules": {
                "nodes": [self._module_node_to_dict(node) for node in self.module_graph.nodes],
                "edges": [self._module_edge_to_dict(edge) for edge in self.module_graph.edges],
                "total_modules": len(self.modules),
                "complexity_summary": self._get_complexity_summary()
            },
            "functions": {
                "nodes": [self._function_node_to_dict(node) for node in self.call_graph.nodes],
                "edges": [self._call_edge_to_dict(edge) for edge in self.call_graph.edges],
                "total_functions": len(self.call_graph.nodes)
            },
            "framework_patterns": self._framework_patterns_to_dict(),
            "schema_version": "1.0.0"
        }
    
    def _library_to_dict(self, library) -> Dict[str, Any]:
        """Convert Library to dictionary."""
        return {
            "name": library.name,
            "version": library.version,
            "source": library.source,
            "extras": library.extras or []
        }
    
    def _module_node_to_dict(self, node: ModuleNode) -> Dict[str, Any]:
        """Convert ModuleNode to dictionary."""
        return {
            "id": node.id,
            "name": node.name,
            "path": node.path,
            "complexity": {
                "cyclomatic": node.complexity.cyclomatic,
                "cognitive": node.complexity.cognitive,
                "level": node.complexity.level.value
            },
            "size": node.size,
            "functions": node.functions
        }
    
    def _module_edge_to_dict(self, edge: ModuleEdge) -> Dict[str, Any]:
        """Convert ModuleEdge to dictionary."""
        return {
            "source": edge.source,
            "target": edge.target,
            "type": edge.type,
            "weight": edge.weight
        }
    
    def _function_node_to_dict(self, node: FunctionNode) -> Dict[str, Any]:
        """Convert FunctionNode to dictionary."""
        return {
            "id": node.id,
            "name": node.name,
            "module": node.module,
            "complexity": node.complexity,
            "line_number": node.line_number,
            "parameters": [self._parameter_to_dict(param) for param in node.parameters]
        }
    
    def _parameter_to_dict(self, param: Parameter) -> Dict[str, Any]:
        """Convert Parameter to dictionary."""
        return {
            "name": param.name,
            "type_hint": param.type_hint,
            "default_value": param.default_value,
            "is_vararg": param.is_vararg,
            "is_kwarg": param.is_kwarg
        }
    
    def _call_edge_to_dict(self, edge: CallEdge) -> Dict[str, Any]:
        """Convert CallEdge to dictionary."""
        return {
            "caller": edge.caller,
            "callee": edge.callee,
            "call_count": edge.call_count,
            "line_numbers": edge.line_numbers or []
        }
    
    def _framework_patterns_to_dict(self) -> Dict[str, Any]:
        """Convert framework patterns to dictionary."""
        result = {}
        
        if self.framework_patterns.django:
            result["django"] = {
                "url_patterns": [self._url_pattern_to_dict(pattern) for pattern in self.framework_patterns.django.url_patterns],
                "views": [self._view_mapping_to_dict(view) for view in self.framework_patterns.django.views],
                "models": [self._model_mapping_to_dict(model) for model in self.framework_patterns.django.models],
                "serializers": [self._serializer_mapping_to_dict(ser) for ser in self.framework_patterns.django.serializers]
            }
        
        if self.framework_patterns.flask:
            result["flask"] = {
                "routes": [self._flask_route_to_dict(route) for route in self.framework_patterns.flask.routes],
                "blueprints": [self._blueprint_to_dict(bp) for bp in self.framework_patterns.flask.blueprints]
            }
        
        if self.framework_patterns.fastapi:
            result["fastapi"] = {
                "routes": [self._fastapi_route_to_dict(route) for route in self.framework_patterns.fastapi.routes],
                "dependencies": [self._dependency_mapping_to_dict(dep) for dep in self.framework_patterns.fastapi.dependencies]
            }
        
        return result
    
    def _url_pattern_to_dict(self, pattern) -> Dict[str, Any]:
        """Convert URLPattern to dictionary."""
        return {
            "pattern": pattern.pattern,
            "view_name": pattern.view_name,
            "view_function": pattern.view_function,
            "namespace": pattern.namespace,
            "line_number": pattern.line_number
        }
    
    def _view_mapping_to_dict(self, view) -> Dict[str, Any]:
        """Convert ViewMapping to dictionary."""
        return {
            "name": view.name,
            "function": view.function,
            "file_path": view.file_path,
            "line_number": view.line_number,
            "is_class_based": view.is_class_based
        }
    
    def _model_mapping_to_dict(self, model) -> Dict[str, Any]:
        """Convert ModelMapping to dictionary."""
        return {
            "name": model.name,
            "file_path": model.file_path,
            "line_number": model.line_number,
            "fields": model.fields or []
        }
    
    def _serializer_mapping_to_dict(self, serializer) -> Dict[str, Any]:
        """Convert SerializerMapping to dictionary."""
        return {
            "name": serializer.name,
            "file_path": serializer.file_path,
            "line_number": serializer.line_number,
            "model": serializer.model
        }
    
    def _flask_route_to_dict(self, route) -> Dict[str, Any]:
        """Convert FlaskRoute to dictionary."""
        return {
            "pattern": route.pattern,
            "methods": route.methods,
            "function": route.function,
            "file_path": route.file_path,
            "line_number": route.line_number,
            "blueprint": route.blueprint
        }
    
    def _blueprint_to_dict(self, blueprint) -> Dict[str, Any]:
        """Convert Blueprint to dictionary."""
        return {
            "name": blueprint.name,
            "file_path": blueprint.file_path,
            "line_number": blueprint.line_number,
            "url_prefix": blueprint.url_prefix
        }
    
    def _fastapi_route_to_dict(self, route) -> Dict[str, Any]:
        """Convert FastAPIRoute to dictionary."""
        return {
            "pattern": route.pattern,
            "method": route.method,
            "function": route.function,
            "file_path": route.file_path,
            "line_number": route.line_number,
            "dependencies": route.dependencies or []
        }
    
    def _dependency_mapping_to_dict(self, dependency) -> Dict[str, Any]:
        """Convert DependencyMapping to dictionary."""
        return {
            "name": dependency.name,
            "function": dependency.function,
            "file_path": dependency.file_path,
            "line_number": dependency.line_number
        }
    
    def _get_complexity_summary(self) -> Dict[str, Any]:
        """Get complexity summary statistics."""
        if not self.modules:
            return {"low": 0, "medium": 0, "high": 0, "average": 0.0}
        
        complexity_counts = {"low": 0, "medium": 0, "high": 0}
        total_complexity = 0
        
        for module in self.modules:
            complexity_counts[module.complexity.level.value] += 1
            total_complexity += module.complexity.cyclomatic
        
        return {
            **complexity_counts,
            "average": total_complexity / len(self.modules) if self.modules else 0.0
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


class ProjectAnalyzer:
    """Main analyzer class for Python projects."""
    
    def __init__(self, project_path: Union[str, Path]):
        """Initialize the project analyzer.
        
        Args:
            project_path: Path to the Python project to analyze
        """
        self.project_path = Path(project_path).resolve()
        self.errors: List[Dict[str, Any]] = []
        self.warnings: List[Dict[str, Any]] = []
        
        if not self.project_path.exists():
            raise AnalysisError(f"Project path does not exist: {self.project_path}")
        
        logger.info(f"Initialized analyzer for project: {self.project_path}")
    
    def analyze_project(self) -> AnalysisResult:
        """Analyze the entire Python project.
        
        Returns:
            AnalysisResult containing all analysis data
            
        Raises:
            AnalysisError: If analysis fails critically
        """
        import time
        start_time = time.time()
        
        logger.info("Starting project analysis...")
        
        try:
            # Find all Python files
            python_files = self._discover_python_files()
            logger.info(f"Found {len(python_files)} Python files")
            
            # Parse modules using AST parser
            from ast_parser import ModuleDiscovery
            from complexity_analyzer import ComplexityAnalyzer
            
            module_discovery = ModuleDiscovery(self.project_path)
            modules = module_discovery.discover_modules(python_files)
            
            # Enhance complexity analysis using radon
            complexity_analyzer = ComplexityAnalyzer()
            enhanced_modules = []
            for module in modules:
                enhanced_module = complexity_analyzer.enhance_module_complexity(module)
                enhanced_modules.append(enhanced_module)
            
            # Resolve module dependencies
            dependencies = module_discovery.resolve_dependencies(enhanced_modules)
            
            # Build module graph
            module_graph = self._build_module_graph(enhanced_modules, dependencies)
            
            # Parse dependencies and detect tech stack
            from dependency_parser import DependencyParser
            dependency_parser = DependencyParser(self.project_path)
            tech_stack = dependency_parser.parse_dependencies()
            
            # Detect framework patterns
            from framework_detector import FrameworkDetector
            framework_detector = FrameworkDetector(self.project_path, tech_stack.frameworks)
            framework_patterns = framework_detector.detect_patterns()
            
            # Add framework detection errors and warnings
            self.errors.extend(framework_detector.errors)
            self.warnings.extend(framework_detector.warnings)
            
            # Build call graph
            from call_graph import CallGraphBuilder
            call_graph_builder = CallGraphBuilder()
            call_graph = call_graph_builder.build_call_graph(enhanced_modules)
            
            # Calculate complexity statistics
            complexity_stats = complexity_analyzer.calculate_project_complexity_stats(enhanced_modules)
            
            # Create metadata
            analysis_time = time.time() - start_time
            metadata = AnalysisMetadata(
                project_path=str(self.project_path),
                analysis_time=analysis_time,
                total_files=len(python_files),
                analyzed_files=len(enhanced_modules),
                errors=self.errors.copy(),
                warnings=self.warnings.copy()
            )
            
            result = AnalysisResult(
                tech_stack=tech_stack,
                modules=enhanced_modules,
                module_graph=module_graph,
                call_graph=call_graph,
                framework_patterns=framework_patterns,
                metadata=metadata,
                success=len(self.errors) == 0
            )
            
            logger.info(f"Analysis completed in {analysis_time:.2f} seconds")
            logger.info(f"Analyzed {len(enhanced_modules)} modules with {len(module_graph.edges)} dependencies")
            logger.info(f"Complexity stats: {complexity_stats['total_functions']} functions, "
                       f"avg complexity: {complexity_stats['average_complexity']:.1f}")
            return result
            
        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            self._add_error("analysis_failure", str(e))
            
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
                tech_stack=empty_tech_stack,
                modules=[],
                module_graph=ModuleGraph(nodes=[], edges=[]),
                call_graph=CallGraph(nodes=[], edges=[]),
                framework_patterns=empty_framework_patterns,
                metadata=metadata,
                success=False
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


def main():
    """Main entry point for command-line usage."""
    if len(sys.argv) != 2:
        print("Usage: python analyzer.py <project_path>", file=sys.stderr)
        sys.exit(1)
    
    project_path = sys.argv[1]
    
    try:
        analyzer = ProjectAnalyzer(project_path)
        result = analyzer.analyze_project()
        
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