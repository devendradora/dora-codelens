#!/usr/bin/env python3
"""
Current File Analyzer for DoraCodeLens

This module provides analysis capabilities for individual Python files,
including complexity metrics, dependency analysis, and framework pattern detection.
"""

import ast
import json
import logging
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Optional, Set, Any
from enum import Enum

from analyzer import ComplexityScore, ComplexityLevel, FunctionInfo, ClassInfo, ImportInfo, Parameter
from complexity_analyzer import ComplexityAnalyzer
from framework_detector import FrameworkDetector
from dependency_parser import Library, TechStack

# Configure logging
logger = logging.getLogger(__name__)


@dataclass
class FileComplexityMetrics:
    """Represents complexity metrics for a single file."""
    overall_complexity: ComplexityScore
    function_complexities: List[FunctionInfo]
    class_complexities: List[ClassInfo]
    total_lines: int
    code_lines: int
    comment_lines: int
    blank_lines: int
    maintainability_index: float


@dataclass
class FileDependencyInfo:
    """Represents dependency information for a single file."""
    imports: List[ImportInfo]
    external_dependencies: List[str]
    internal_dependencies: List[str]
    framework_imports: List[str]
    standard_library_imports: List[str]


@dataclass
class FileFrameworkPatterns:
    """Represents framework patterns detected in a single file."""
    django_patterns: List[Dict[str, Any]]
    flask_patterns: List[Dict[str, Any]]
    fastapi_patterns: List[Dict[str, Any]]
    detected_frameworks: List[str]


@dataclass
class FileAnalysisResult:
    """Complete analysis result for a single Python file."""
    file_path: str
    file_name: str
    complexity_metrics: FileComplexityMetrics
    dependency_info: FileDependencyInfo
    framework_patterns: FileFrameworkPatterns
    tech_stack: TechStack
    analysis_timestamp: str
    success: bool = True
    errors: List[Dict[str, Any]] = None
    warnings: List[Dict[str, Any]] = None
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []
        if self.warnings is None:
            self.warnings = []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "file_path": self.file_path,
            "file_name": self.file_name,
            "complexity_metrics": {
                "overall_complexity": {
                    "cyclomatic": self.complexity_metrics.overall_complexity.cyclomatic,
                    "cognitive": self.complexity_metrics.overall_complexity.cognitive,
                    "level": self.complexity_metrics.overall_complexity.level.value
                },
                "function_complexities": [
                    {
                        "name": func.name,
                        "line_number": func.line_number,
                        "complexity": {
                            "cyclomatic": func.complexity.cyclomatic,
                            "cognitive": func.complexity.cognitive,
                            "level": func.complexity.level.value
                        },
                        "parameters": [
                            {
                                "name": param.name,
                                "type_hint": param.type_hint,
                                "default_value": param.default_value,
                                "is_vararg": param.is_vararg,
                                "is_kwarg": param.is_kwarg
                            } for param in func.parameters
                        ],
                        "return_type": func.return_type,
                        "docstring": func.docstring,
                        "is_method": func.is_method,
                        "is_async": func.is_async
                    } for func in self.complexity_metrics.function_complexities
                ],
                "class_complexities": [
                    {
                        "name": cls.name,
                        "line_number": cls.line_number,
                        "base_classes": cls.base_classes,
                        "docstring": cls.docstring,
                        "methods": [
                            {
                                "name": method.name,
                                "complexity": {
                                    "cyclomatic": method.complexity.cyclomatic,
                                    "cognitive": method.complexity.cognitive,
                                    "level": method.complexity.level.value
                                }
                            } for method in cls.methods
                        ]
                    } for cls in self.complexity_metrics.class_complexities
                ],
                "total_lines": self.complexity_metrics.total_lines,
                "code_lines": self.complexity_metrics.code_lines,
                "comment_lines": self.complexity_metrics.comment_lines,
                "blank_lines": self.complexity_metrics.blank_lines,
                "maintainability_index": self.complexity_metrics.maintainability_index
            },
            "dependency_info": {
                "imports": [
                    {
                        "module": imp.module,
                        "names": imp.names,
                        "alias": imp.alias,
                        "is_from_import": imp.is_from_import,
                        "line_number": imp.line_number
                    } for imp in self.dependency_info.imports
                ],
                "external_dependencies": self.dependency_info.external_dependencies,
                "internal_dependencies": self.dependency_info.internal_dependencies,
                "framework_imports": self.dependency_info.framework_imports,
                "standard_library_imports": self.dependency_info.standard_library_imports
            },
            "framework_patterns": {
                "django_patterns": self.framework_patterns.django_patterns,
                "flask_patterns": self.framework_patterns.flask_patterns,
                "fastapi_patterns": self.framework_patterns.fastapi_patterns,
                "detected_frameworks": self.framework_patterns.detected_frameworks
            },
            "tech_stack": {
                "libraries": [
                    {
                        "name": lib.name,
                        "version": lib.version,
                        "source": lib.source,
                        "extras": lib.extras or []
                    } for lib in self.tech_stack.libraries
                ],
                "frameworks": self.tech_stack.frameworks,
                "python_version": self.tech_stack.python_version,
                "package_manager": self.tech_stack.package_manager
            },
            "analysis_timestamp": self.analysis_timestamp,
            "success": self.success,
            "errors": self.errors,
            "warnings": self.warnings
        }
    
    def to_json(self) -> str:
        """Convert to JSON string."""
        return json.dumps(self.to_dict(), indent=2)


class CurrentFileAnalyzer:
    """Analyzer for individual Python files."""
    
    def __init__(self, project_path: Optional[Path] = None):
        """Initialize the current file analyzer.
        
        Args:
            project_path: Optional project path for context (used for dependency resolution)
        """
        self.project_path = project_path
        self.errors: List[Dict[str, Any]] = []
        self.warnings: List[Dict[str, Any]] = []
        
        # Initialize sub-analyzers
        self.complexity_analyzer = ComplexityAnalyzer()
        
        logger.info(f"Initialized CurrentFileAnalyzer with project path: {project_path}")
    
    def analyze_file(self, file_path: Path) -> FileAnalysisResult:
        """Analyze a single Python file.
        
        Args:
            file_path: Path to the Python file to analyze
            
        Returns:
            FileAnalysisResult containing all analysis data
        """
        from datetime import datetime
        
        logger.info(f"Starting analysis of file: {file_path}")
        
        # Clear previous errors and warnings
        self.errors.clear()
        self.warnings.clear()
        
        file_path = Path(file_path).resolve()
        
        if not file_path.exists():
            self._add_error("file_not_found", f"File does not exist: {file_path}")
            return self._create_failed_result(str(file_path))
        
        if not file_path.suffix == '.py':
            self._add_error("invalid_file_type", f"File is not a Python file: {file_path}")
            return self._create_failed_result(str(file_path))
        
        try:
            # Read file content
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Parse AST
            try:
                tree = ast.parse(content, filename=str(file_path))
            except SyntaxError as e:
                self._add_error("syntax_error", f"Syntax error in file: {e}", str(file_path), e.lineno)
                return self._create_failed_result(str(file_path))
            
            # Analyze complexity metrics
            complexity_metrics = self._analyze_complexity(tree, content, file_path)
            
            # Analyze dependencies
            dependency_info = self._analyze_dependencies(tree, file_path)
            
            # Detect framework patterns
            framework_patterns = self._detect_framework_patterns(tree, content, file_path)
            
            # Create tech stack from dependencies
            tech_stack = self._create_tech_stack(dependency_info)
            
            # Create result
            result = FileAnalysisResult(
                file_path=str(file_path),
                file_name=file_path.name,
                complexity_metrics=complexity_metrics,
                dependency_info=dependency_info,
                framework_patterns=framework_patterns,
                tech_stack=tech_stack,
                analysis_timestamp=datetime.now().isoformat(),
                success=len(self.errors) == 0,
                errors=self.errors.copy(),
                warnings=self.warnings.copy()
            )
            
            logger.info(f"File analysis completed successfully: {file_path}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to analyze file {file_path}: {e}")
            self._add_error("analysis_failure", f"Failed to analyze file: {e}", str(file_path))
            return self._create_failed_result(str(file_path))
    
    def _analyze_complexity(self, tree: ast.AST, content: str, file_path: Path) -> FileComplexityMetrics:
        """Analyze complexity metrics for the file."""
        logger.debug(f"Analyzing complexity for: {file_path}")
        
        # Count lines
        lines = content.split('\n')
        total_lines = len(lines)
        code_lines = 0
        comment_lines = 0
        blank_lines = 0
        
        for line in lines:
            stripped = line.strip()
            if not stripped:
                blank_lines += 1
            elif stripped.startswith('#'):
                comment_lines += 1
            else:
                code_lines += 1
        
        # Extract functions and classes
        functions = []
        classes = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                func_info = self._extract_function_info(node, str(file_path))
                functions.append(func_info)
            elif hasattr(ast, 'AsyncFunctionDef') and isinstance(node, ast.AsyncFunctionDef):
                func_info = self._extract_function_info(node, str(file_path))
                functions.append(func_info)
            elif isinstance(node, ast.ClassDef):
                class_info = self._extract_class_info(node, str(file_path))
                classes.append(class_info)
        
        # Calculate overall complexity
        total_complexity = sum(func.complexity.cyclomatic for func in functions)
        if functions:
            avg_complexity = total_complexity / len(functions)
        else:
            avg_complexity = 0
        
        overall_complexity = ComplexityScore(
            cyclomatic=int(avg_complexity),
            cognitive=int(avg_complexity * 1.2)  # Rough estimate
        )
        
        # Calculate maintainability index (simplified version)
        # MI = 171 - 5.2 * ln(Halstead Volume) - 0.23 * (Cyclomatic Complexity) - 16.2 * ln(Lines of Code)
        # Simplified version without Halstead metrics
        if code_lines > 0:
            maintainability_index = max(0, 100 - (avg_complexity * 2) - (code_lines / 10))
        else:
            maintainability_index = 100
        
        return FileComplexityMetrics(
            overall_complexity=overall_complexity,
            function_complexities=functions,
            class_complexities=classes,
            total_lines=total_lines,
            code_lines=code_lines,
            comment_lines=comment_lines,
            blank_lines=blank_lines,
            maintainability_index=maintainability_index
        )
    
    def _extract_function_info(self, node: ast.FunctionDef, module_path: str) -> FunctionInfo:
        """Extract function information from AST node."""
        # Calculate complexity
        complexity = self._calculate_function_complexity(node)
        
        # Extract parameters
        parameters = []
        for arg in node.args.args:
            type_hint = None
            if hasattr(arg, 'annotation') and arg.annotation:
                try:
                    if hasattr(ast, 'unparse'):
                        type_hint = ast.unparse(arg.annotation)
                    else:
                        type_hint = "annotation"
                except:
                    type_hint = "annotation"
            
            param = Parameter(
                name=arg.arg,
                type_hint=type_hint
            )
            parameters.append(param)
        
        # Handle varargs and kwargs
        if node.args.vararg:
            parameters.append(Parameter(
                name=node.args.vararg.arg,
                is_vararg=True
            ))
        
        if node.args.kwarg:
            parameters.append(Parameter(
                name=node.args.kwarg.arg,
                is_kwarg=True
            ))
        
        # Extract docstring
        docstring = None
        if (node.body and isinstance(node.body[0], ast.Expr) and 
            isinstance(node.body[0].value, ast.Constant) and 
            isinstance(node.body[0].value.value, str)):
            docstring = node.body[0].value.value
        
        # Extract return type
        return_type = None
        if hasattr(node, 'returns') and node.returns:
            try:
                if hasattr(ast, 'unparse'):
                    return_type = ast.unparse(node.returns)
                else:
                    # Fallback for older Python versions
                    return_type = "annotation"
            except:
                return_type = "annotation"
        
        is_async = False
        if hasattr(ast, 'AsyncFunctionDef'):
            is_async = isinstance(node, ast.AsyncFunctionDef)
        
        return FunctionInfo(
            name=node.name,
            module=module_path,
            line_number=node.lineno,
            complexity=complexity,
            parameters=parameters,
            return_type=return_type,
            docstring=docstring,
            is_method=False,  # Will be updated if inside a class
            is_async=is_async
        )
    
    def _extract_class_info(self, node: ast.ClassDef, module_path: str) -> ClassInfo:
        """Extract class information from AST node."""
        # Extract base classes
        base_classes = []
        for base in node.bases:
            if isinstance(base, ast.Name):
                base_classes.append(base.id)
            elif isinstance(base, ast.Attribute):
                try:
                    if hasattr(ast, 'unparse'):
                        base_classes.append(ast.unparse(base))
                    else:
                        base_classes.append(f"{base.value.id}.{base.attr}" if hasattr(base.value, 'id') else base.attr)
                except:
                    base_classes.append("unknown")
        
        # Extract methods
        methods = []
        for item in node.body:
            if isinstance(item, ast.FunctionDef):
                method_info = self._extract_function_info(item, module_path)
                method_info.is_method = True
                methods.append(method_info)
            elif hasattr(ast, 'AsyncFunctionDef') and isinstance(item, ast.AsyncFunctionDef):
                method_info = self._extract_function_info(item, module_path)
                method_info.is_method = True
                methods.append(method_info)
        
        # Extract docstring
        docstring = None
        if (node.body and isinstance(node.body[0], ast.Expr) and 
            isinstance(node.body[0].value, ast.Constant) and 
            isinstance(node.body[0].value.value, str)):
            docstring = node.body[0].value.value
        
        return ClassInfo(
            name=node.name,
            module=module_path,
            line_number=node.lineno,
            methods=methods,
            base_classes=base_classes,
            docstring=docstring
        )
    
    def _calculate_function_complexity(self, node: ast.FunctionDef) -> ComplexityScore:
        """Calculate cyclomatic complexity for a function."""
        complexity = 1  # Base complexity
        
        for child in ast.walk(node):
            # Decision points that increase complexity
            if isinstance(child, (ast.If, ast.While, ast.For)):
                complexity += 1
            elif hasattr(ast, 'AsyncFor') and isinstance(child, ast.AsyncFor):
                complexity += 1
            elif isinstance(child, ast.ExceptHandler):
                complexity += 1
            elif isinstance(child, ast.With):
                complexity += 1
            elif hasattr(ast, 'AsyncWith') and isinstance(child, ast.AsyncWith):
                complexity += 1
            elif isinstance(child, ast.BoolOp):
                # And/Or operations
                complexity += len(child.values) - 1
            elif isinstance(child, (ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)):
                complexity += 1
        
        return ComplexityScore(cyclomatic=complexity)
    
    def _analyze_dependencies(self, tree: ast.AST, file_path: Path) -> FileDependencyInfo:
        """Analyze dependencies and imports in the file."""
        logger.debug(f"Analyzing dependencies for: {file_path}")
        
        imports = []
        external_deps = set()
        internal_deps = set()
        framework_imports = set()
        stdlib_imports = set()
        
        # Standard library modules (partial list)
        stdlib_modules = {
            'os', 'sys', 'json', 'datetime', 'pathlib', 'typing', 'collections',
            'itertools', 'functools', 're', 'math', 'random', 'urllib', 'http',
            'logging', 'unittest', 'sqlite3', 'csv', 'xml', 'html', 'email',
            'threading', 'multiprocessing', 'subprocess', 'socket', 'ssl'
        }
        
        # Framework modules
        framework_modules = {
            'django': ['django'],
            'flask': ['flask'],
            'fastapi': ['fastapi'],
            'sqlalchemy': ['sqlalchemy'],
            'pandas': ['pandas'],
            'numpy': ['numpy'],
            'requests': ['requests']
        }
        
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
                    
                    # Categorize import
                    module_name = alias.name.split('.')[0]
                    if module_name in stdlib_modules:
                        stdlib_imports.add(module_name)
                    elif any(module_name in fw_modules for fw_modules in framework_modules.values()):
                        framework_imports.add(module_name)
                        for fw, modules in framework_modules.items():
                            if module_name in modules:
                                framework_imports.add(fw)
                    elif self._is_internal_module(module_name, file_path):
                        internal_deps.add(module_name)
                    else:
                        external_deps.add(module_name)
            
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    import_info = ImportInfo(
                        module=node.module,
                        names=[alias.name for alias in node.names],
                        is_from_import=True,
                        line_number=node.lineno
                    )
                    imports.append(import_info)
                    
                    # Categorize import
                    module_name = node.module.split('.')[0]
                    if module_name in stdlib_modules:
                        stdlib_imports.add(module_name)
                    elif any(module_name in fw_modules for fw_modules in framework_modules.values()):
                        framework_imports.add(module_name)
                        for fw, modules in framework_modules.items():
                            if module_name in modules:
                                framework_imports.add(fw)
                    elif self._is_internal_module(module_name, file_path):
                        internal_deps.add(module_name)
                    else:
                        external_deps.add(module_name)
        
        return FileDependencyInfo(
            imports=imports,
            external_dependencies=list(external_deps),
            internal_dependencies=list(internal_deps),
            framework_imports=list(framework_imports),
            standard_library_imports=list(stdlib_imports)
        )
    
    def _is_internal_module(self, module_name: str, file_path: Path) -> bool:
        """Check if a module is internal to the project."""
        if not self.project_path:
            return False
        
        # Check if module exists as a file or directory in the project
        potential_paths = [
            self.project_path / f"{module_name}.py",
            self.project_path / module_name / "__init__.py"
        ]
        
        return any(path.exists() for path in potential_paths)
    
    def _detect_framework_patterns(self, tree: ast.AST, content: str, file_path: Path) -> FileFrameworkPatterns:
        """Detect framework patterns in the file."""
        logger.debug(f"Detecting framework patterns for: {file_path}")
        
        django_patterns = []
        flask_patterns = []
        fastapi_patterns = []
        detected_frameworks = []
        
        # Simple pattern detection based on imports and common patterns
        if 'django' in content.lower():
            detected_frameworks.append('django')
            django_patterns = self._detect_django_patterns(tree, content)
        
        if 'flask' in content.lower():
            detected_frameworks.append('flask')
            flask_patterns = self._detect_flask_patterns(tree, content)
        
        if 'fastapi' in content.lower():
            detected_frameworks.append('fastapi')
            fastapi_patterns = self._detect_fastapi_patterns(tree, content)
        
        return FileFrameworkPatterns(
            django_patterns=django_patterns,
            flask_patterns=flask_patterns,
            fastapi_patterns=fastapi_patterns,
            detected_frameworks=detected_frameworks
        )
    
    def _detect_django_patterns(self, tree: ast.AST, content: str) -> List[Dict[str, Any]]:
        """Detect Django-specific patterns."""
        patterns = []
        
        # Look for Django model classes
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                for base in node.bases:
                    if isinstance(base, ast.Attribute) and base.attr == 'Model':
                        patterns.append({
                            'type': 'model',
                            'name': node.name,
                            'line_number': node.lineno
                        })
                    elif isinstance(base, ast.Name) and base.id in ['Model', 'AbstractModel']:
                        patterns.append({
                            'type': 'model',
                            'name': node.name,
                            'line_number': node.lineno
                        })
        
        # Look for Django view functions/classes
        if 'def ' in content and any(keyword in content for keyword in ['request', 'HttpResponse', 'render']):
            patterns.append({
                'type': 'view_patterns',
                'description': 'Django view patterns detected'
            })
        
        return patterns
    
    def _detect_flask_patterns(self, tree: ast.AST, content: str) -> List[Dict[str, Any]]:
        """Detect Flask-specific patterns."""
        patterns = []
        
        # Look for Flask route decorators
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                for decorator in node.decorator_list:
                    if isinstance(decorator, ast.Attribute) and decorator.attr == 'route':
                        patterns.append({
                            'type': 'route',
                            'function': node.name,
                            'line_number': node.lineno
                        })
                    elif isinstance(decorator, ast.Call) and isinstance(decorator.func, ast.Attribute) and decorator.func.attr == 'route':
                        patterns.append({
                            'type': 'route',
                            'function': node.name,
                            'line_number': node.lineno
                        })
        
        return patterns
    
    def _detect_fastapi_patterns(self, tree: ast.AST, content: str) -> List[Dict[str, Any]]:
        """Detect FastAPI-specific patterns."""
        patterns = []
        
        # Look for FastAPI decorators
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                for decorator in node.decorator_list:
                    if isinstance(decorator, ast.Attribute) and decorator.attr in ['get', 'post', 'put', 'delete']:
                        patterns.append({
                            'type': 'endpoint',
                            'method': decorator.attr,
                            'function': node.name,
                            'line_number': node.lineno
                        })
        
        return patterns
    
    def _create_tech_stack(self, dependency_info: FileDependencyInfo) -> TechStack:
        """Create tech stack from dependency information."""
        libraries = []
        
        # Create Library objects from external dependencies
        for dep in dependency_info.external_dependencies:
            library = Library(name=dep, version="unknown", source="import")
            libraries.append(library)
        
        return TechStack(
            libraries=libraries,
            frameworks=dependency_info.framework_imports,
            python_version="unknown",
            package_manager="pip"
        )
    
    def _add_error(self, error_type: str, message: str, file_path: Optional[str] = None, line: Optional[int] = None):
        """Add an error to the error list."""
        error = {
            "type": error_type,
            "message": message
        }
        if file_path:
            error["file"] = file_path
        if line:
            error["line"] = line
        
        self.errors.append(error)
        logger.error(f"Current file analysis error ({error_type}): {message}")
    
    def _add_warning(self, warning_type: str, message: str, file_path: Optional[str] = None):
        """Add a warning to the warning list."""
        warning = {
            "type": warning_type,
            "message": message
        }
        if file_path:
            warning["file"] = file_path
        
        self.warnings.append(warning)
        logger.warning(f"Current file analysis warning ({warning_type}): {message}")
    
    def _create_failed_result(self, file_path: str) -> FileAnalysisResult:
        """Create a failed analysis result."""
        from datetime import datetime
        
        # Create empty structures
        empty_complexity = FileComplexityMetrics(
            overall_complexity=ComplexityScore(cyclomatic=0),
            function_complexities=[],
            class_complexities=[],
            total_lines=0,
            code_lines=0,
            comment_lines=0,
            blank_lines=0,
            maintainability_index=0.0
        )
        
        empty_dependencies = FileDependencyInfo(
            imports=[],
            external_dependencies=[],
            internal_dependencies=[],
            framework_imports=[],
            standard_library_imports=[]
        )
        
        empty_frameworks = FileFrameworkPatterns(
            django_patterns=[],
            flask_patterns=[],
            fastapi_patterns=[],
            detected_frameworks=[]
        )
        
        empty_tech_stack = TechStack(
            libraries=[],
            frameworks=[],
            python_version="unknown",
            package_manager="pip"
        )
        
        return FileAnalysisResult(
            file_path=file_path,
            file_name=Path(file_path).name,
            complexity_metrics=empty_complexity,
            dependency_info=empty_dependencies,
            framework_patterns=empty_frameworks,
            tech_stack=empty_tech_stack,
            analysis_timestamp=datetime.now().isoformat(),
            success=False,
            errors=self.errors.copy(),
            warnings=self.warnings.copy()
        )


def main():
    """Main function for the current file analyzer."""
    import sys
    import argparse
    
    parser = argparse.ArgumentParser(description='Analyze a Python file for complexity and dependencies')
    parser.add_argument('file_path', help='Path to the Python file to analyze')
    parser.add_argument('--project-path', help='Project root path for context')
    parser.add_argument('--no-complexity', action='store_true', help='Skip complexity analysis')
    parser.add_argument('--no-dependencies', action='store_true', help='Skip dependency analysis')
    parser.add_argument('--no-frameworks', action='store_true', help='Skip framework pattern detection')
    
    try:
        args = parser.parse_args()
    except SystemExit as e:
        # Handle argument parsing errors gracefully
        if e.code != 0:
            print(f"Error: Invalid arguments. Usage: python current_file_analyzer.py <file_path>", file=sys.stderr)
        sys.exit(e.code)
    
    file_path = Path(args.file_path)
    project_path = Path(args.project_path) if args.project_path else None
    
    analyzer = CurrentFileAnalyzer(project_path)
    result = analyzer.analyze_file(file_path)
    
    print(result.to_json())


if __name__ == "__main__":
    main()