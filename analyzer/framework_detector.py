#!/usr/bin/env python3
"""
Framework Detector Module

This module provides detection capabilities for various Python web frameworks
including Django, Flask, and FastAPI patterns.
"""

import ast
import re
import logging
from pathlib import Path
from typing import Dict, List, Optional, Union, Any, Set
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class URLPattern:
    """Represents a URL pattern in Django."""
    pattern: str
    view_name: str
    view_function: str
    namespace: Optional[str] = None
    line_number: int = 0


@dataclass
class ViewMapping:
    """Represents a Django view mapping."""
    name: str
    function: str
    file_path: str
    line_number: int
    is_class_based: bool = False


@dataclass
class ModelMapping:
    """Represents a Django model mapping."""
    name: str
    file_path: str
    line_number: int
    fields: List[str] = None
    
    def __post_init__(self):
        if self.fields is None:
            self.fields = []


@dataclass
class SerializerMapping:
    """Represents a Django serializer mapping."""
    name: str
    file_path: str
    line_number: int
    model: Optional[str] = None


@dataclass
class DjangoPatterns:
    """Represents Django-specific patterns."""
    url_patterns: List[URLPattern]
    views: List[ViewMapping]
    models: List[ModelMapping]
    serializers: List[SerializerMapping]


@dataclass
class FlaskRoute:
    """Represents a Flask route."""
    pattern: str
    methods: List[str]
    function: str
    file_path: str
    line_number: int
    blueprint: Optional[str] = None


@dataclass
class Blueprint:
    """Represents a Flask blueprint."""
    name: str
    file_path: str
    line_number: int
    url_prefix: Optional[str] = None


@dataclass
class FlaskPatterns:
    """Represents Flask-specific patterns."""
    routes: List[FlaskRoute]
    blueprints: List[Blueprint]


@dataclass
class FastAPIRoute:
    """Represents a FastAPI route."""
    pattern: str
    method: str
    function: str
    file_path: str
    line_number: int
    dependencies: List[str] = None
    
    def __post_init__(self):
        if self.dependencies is None:
            self.dependencies = []


@dataclass
class DependencyMapping:
    """Represents a FastAPI dependency mapping."""
    name: str
    function: str
    file_path: str
    line_number: int


@dataclass
class FastAPIPatterns:
    """Represents FastAPI-specific patterns."""
    routes: List[FastAPIRoute]
    dependencies: List[DependencyMapping]


@dataclass
class FrameworkPatterns:
    """Container for all framework patterns."""
    django: Optional[DjangoPatterns] = None
    flask: Optional[FlaskPatterns] = None
    fastapi: Optional[FastAPIPatterns] = None

class FrameworkDetector:
    """Main class for detecting framework-specific patterns."""
    
    def __init__(self, project_path: Union[str, Path], detected_frameworks: List[str]):
        """Initialize the framework detector.
        
        Args:
            project_path: Path to the Python project
            detected_frameworks: List of frameworks detected from dependencies
        """
        self.project_path = Path(project_path).resolve()
        self.detected_frameworks = detected_frameworks
        self.errors: List[Dict[str, Any]] = []
        self.warnings: List[Dict[str, Any]] = []
    
    def detect_patterns(self) -> FrameworkPatterns:
        """Detect all framework patterns.
        
        Returns:
            FrameworkPatterns object containing detected patterns
        """
        logger.info("Starting framework pattern detection...")
        
        patterns = FrameworkPatterns()
        
        if 'django' in self.detected_frameworks:
            patterns.django = self._detect_django_patterns()
        
        if 'flask' in self.detected_frameworks:
            patterns.flask = self._detect_flask_patterns()
        
        if 'fastapi' in self.detected_frameworks:
            patterns.fastapi = self._detect_fastapi_patterns()
        
        logger.info(f"Framework pattern detection completed")
        return patterns
    
    def _detect_django_patterns(self) -> DjangoPatterns:
        """Detect Django-specific patterns."""
        logger.info("Detecting Django patterns...")
        
        url_patterns = []
        views = []
        models = []
        serializers = []
        
        # Find Django files
        django_files = self._find_django_files()
        
        for file_path in django_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                tree = ast.parse(content)
                
                # Detect URL patterns
                if file_path.name == 'urls.py':
                    url_patterns.extend(self._extract_django_urls(tree, file_path))
                
                # Detect views
                if 'views' in file_path.name or file_path.parent.name == 'views':
                    views.extend(self._extract_django_views(tree, file_path))
                
                # Detect models
                if 'models' in file_path.name or file_path.parent.name == 'models':
                    models.extend(self._extract_django_models(tree, file_path))
                
                # Detect serializers
                if 'serializers' in file_path.name or file_path.parent.name == 'serializers':
                    serializers.extend(self._extract_django_serializers(tree, file_path))
                    
            except Exception as e:
                self._add_error("django_parsing", f"Failed to parse {file_path}: {e}", str(file_path))
        
        return DjangoPatterns(
            url_patterns=url_patterns,
            views=views,
            models=models,
            serializers=serializers
        )
    
    def _find_django_files(self) -> List[Path]:
        """Find Django-related files."""
        django_files = []
        
        # Look for common Django file patterns
        patterns = [
            '**/urls.py',
            '**/views.py',
            '**/models.py',
            '**/serializers.py',
            '**/views/*.py',
            '**/models/*.py',
            '**/serializers/*.py'
        ]
        
        for pattern in patterns:
            django_files.extend(self.project_path.glob(pattern))
        
        # Filter out __pycache__ and other unwanted directories
        django_files = [f for f in django_files if '__pycache__' not in str(f)]
        
        return django_files
    
    def _extract_django_urls(self, tree: ast.AST, file_path: Path) -> List[URLPattern]:
        """Extract URL patterns from Django urls.py files."""
        url_patterns = []
        
        class URLPatternVisitor(ast.NodeVisitor):
            def visit_Call(self, node):
                # Look for path() and url() calls
                if isinstance(node.func, ast.Name) and node.func.id in ['path', 'url', 're_path']:
                    if len(node.args) >= 2:
                        # Extract pattern
                        pattern = self._extract_string_value(node.args[0])
                        
                        # Extract view
                        view_arg = node.args[1]
                        view_name = self._extract_view_name(view_arg)
                        view_function = self._extract_view_function(view_arg)
                        
                        # Extract name from kwargs
                        name = None
                        for keyword in node.keywords:
                            if keyword.arg == 'name':
                                name = self._extract_string_value(keyword.value)
                        
                        if pattern is not None and view_function:
                            url_patterns.append(URLPattern(
                                pattern=pattern,
                                view_name=name or view_function,
                                view_function=view_function,
                                line_number=node.lineno
                            ))
                
                self.generic_visit(node)
            
            def _extract_string_value(self, node):
                """Extract string value from AST node."""
                if isinstance(node, ast.Constant) and isinstance(node.value, str):
                    return node.value
                elif isinstance(node, ast.Str):  # Python < 3.8 compatibility
                    return node.s
                return None
            
            def _extract_view_name(self, node):
                """Extract view name from AST node."""
                if isinstance(node, ast.Name):
                    return node.id
                elif isinstance(node, ast.Attribute):
                    return f"{self._extract_view_name(node.value)}.{node.attr}"
                return None
            
            def _extract_view_function(self, node):
                """Extract view function name from AST node."""
                if isinstance(node, ast.Name):
                    return node.id
                elif isinstance(node, ast.Attribute):
                    parts = []
                    current = node
                    while isinstance(current, ast.Attribute):
                        parts.append(current.attr)
                        current = current.value
                    if isinstance(current, ast.Name):
                        parts.append(current.id)
                    return '.'.join(reversed(parts))
                elif isinstance(node, ast.Call):
                    # Handle method calls like views.PostListView.as_view()
                    if isinstance(node.func, ast.Attribute):
                        return self._extract_view_function(node.func)
                return None
        
        visitor = URLPatternVisitor()
        visitor.visit(tree)
        
        return url_patterns    

    def _extract_django_views(self, tree: ast.AST, file_path: Path) -> List[ViewMapping]:
        """Extract Django views from Python files."""
        views = []
        
        class ViewVisitor(ast.NodeVisitor):
            def visit_FunctionDef(self, node):
                # Check if function looks like a Django view
                if self._is_django_view_function(node):
                    views.append(ViewMapping(
                        name=node.name,
                        function=node.name,
                        file_path=str(file_path),
                        line_number=node.lineno,
                        is_class_based=False
                    ))
                self.generic_visit(node)
            
            def visit_ClassDef(self, node):
                # Check if class looks like a Django class-based view
                if self._is_django_view_class(node):
                    views.append(ViewMapping(
                        name=node.name,
                        function=node.name,
                        file_path=str(file_path),
                        line_number=node.lineno,
                        is_class_based=True
                    ))
                self.generic_visit(node)
            
            def _is_django_view_function(self, node):
                """Check if function is likely a Django view."""
                # Check for common Django view patterns
                if len(node.args.args) >= 1:
                    first_arg = node.args.args[0].arg
                    return first_arg == 'request'
                return False
            
            def _is_django_view_class(self, node):
                """Check if class is likely a Django class-based view."""
                # Check for inheritance from Django view classes
                django_view_bases = [
                    'View', 'TemplateView', 'ListView', 'DetailView',
                    'CreateView', 'UpdateView', 'DeleteView', 'FormView',
                    'APIView', 'ViewSet', 'ModelViewSet'
                ]
                
                for base in node.bases:
                    if isinstance(base, ast.Name) and base.id in django_view_bases:
                        return True
                    elif isinstance(base, ast.Attribute):
                        if base.attr in django_view_bases:
                            return True
                return False
        
        visitor = ViewVisitor()
        visitor.visit(tree)
        
        return views
    
    def _extract_django_models(self, tree: ast.AST, file_path: Path) -> List[ModelMapping]:
        """Extract Django models from Python files."""
        models = []
        
        class ModelVisitor(ast.NodeVisitor):
            def visit_ClassDef(self, node):
                # Check if class inherits from Django Model
                if self._is_django_model(node):
                    fields = self._extract_model_fields(node)
                    models.append(ModelMapping(
                        name=node.name,
                        file_path=str(file_path),
                        line_number=node.lineno,
                        fields=fields
                    ))
                self.generic_visit(node)
            
            def _is_django_model(self, node):
                """Check if class is a Django model."""
                django_model_bases = ['Model', 'AbstractModel', 'AbstractBaseUser']
                
                for base in node.bases:
                    if isinstance(base, ast.Name) and base.id in django_model_bases:
                        return True
                    elif isinstance(base, ast.Attribute):
                        if base.attr in django_model_bases:
                            return True
                return False
            
            def _extract_model_fields(self, node):
                """Extract field names from Django model."""
                fields = []
                for item in node.body:
                    if isinstance(item, ast.Assign):
                        for target in item.targets:
                            if isinstance(target, ast.Name):
                                # Check if it's a field assignment
                                if isinstance(item.value, ast.Call):
                                    fields.append(target.id)
                return fields
        
        visitor = ModelVisitor()
        visitor.visit(tree)
        
        return models
    
    def _extract_django_serializers(self, tree: ast.AST, file_path: Path) -> List[SerializerMapping]:
        """Extract Django REST framework serializers."""
        serializers = []
        
        class SerializerVisitor(ast.NodeVisitor):
            def visit_ClassDef(self, node):
                if self._is_django_serializer(node):
                    model = self._extract_serializer_model(node)
                    serializers.append(SerializerMapping(
                        name=node.name,
                        file_path=str(file_path),
                        line_number=node.lineno,
                        model=model
                    ))
                self.generic_visit(node)
            
            def _is_django_serializer(self, node):
                """Check if class is a Django serializer."""
                serializer_bases = ['Serializer', 'ModelSerializer', 'HyperlinkedModelSerializer']
                
                for base in node.bases:
                    if isinstance(base, ast.Name) and base.id in serializer_bases:
                        return True
                    elif isinstance(base, ast.Attribute):
                        if base.attr in serializer_bases:
                            return True
                return False
            
            def _extract_serializer_model(self, node):
                """Extract model from serializer Meta class."""
                for item in node.body:
                    if isinstance(item, ast.ClassDef) and item.name == 'Meta':
                        for meta_item in item.body:
                            if isinstance(meta_item, ast.Assign):
                                for target in meta_item.targets:
                                    if isinstance(target, ast.Name) and target.id == 'model':
                                        if isinstance(meta_item.value, ast.Name):
                                            return meta_item.value.id
                return None
        
        visitor = SerializerVisitor()
        visitor.visit(tree)
        
        return serializers
    
    def _detect_flask_patterns(self) -> FlaskPatterns:
        """Detect Flask-specific patterns."""
        logger.info("Detecting Flask patterns...")
        
        routes = []
        blueprints = []
        
        # Find Python files that might contain Flask code
        python_files = list(self.project_path.rglob("*.py"))
        python_files = [f for f in python_files if '__pycache__' not in str(f)]
        
        for file_path in python_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                tree = ast.parse(content)
                
                # Extract Flask routes and blueprints
                routes.extend(self._extract_flask_routes(tree, file_path))
                blueprints.extend(self._extract_flask_blueprints(tree, file_path))
                
            except Exception as e:
                self._add_error("flask_parsing", f"Failed to parse {file_path}: {e}", str(file_path))
        
        return FlaskPatterns(routes=routes, blueprints=blueprints)
    
    def _extract_flask_routes(self, tree: ast.AST, file_path: Path) -> List[FlaskRoute]:
        """Extract Flask routes from Python files."""
        routes = []
        
        class FlaskRouteVisitor(ast.NodeVisitor):
            def visit_FunctionDef(self, node):
                # Look for @app.route or @blueprint.route decorators
                for decorator in node.decorator_list:
                    route_info = self._extract_route_decorator(decorator)
                    if route_info:
                        pattern, methods, blueprint = route_info
                        routes.append(FlaskRoute(
                            pattern=pattern,
                            methods=methods,
                            function=node.name,
                            file_path=str(file_path),
                            line_number=node.lineno,
                            blueprint=blueprint
                        ))
                self.generic_visit(node)
            
            def _extract_route_decorator(self, decorator):
                """Extract route information from decorator."""
                # Handle @app.route() or @blueprint.route()
                if isinstance(decorator, ast.Call):
                    if isinstance(decorator.func, ast.Attribute):
                        if decorator.func.attr == 'route':
                            # Extract pattern
                            pattern = None
                            if decorator.args:
                                if isinstance(decorator.args[0], ast.Constant):
                                    pattern = decorator.args[0].value
                                elif isinstance(decorator.args[0], ast.Str):
                                    pattern = decorator.args[0].s
                            
                            # Extract methods
                            methods = ['GET']  # Default
                            for keyword in decorator.keywords:
                                if keyword.arg == 'methods':
                                    methods = self._extract_methods(keyword.value)
                            
                            # Extract blueprint name
                            blueprint = None
                            if isinstance(decorator.func.value, ast.Name):
                                if decorator.func.value.id != 'app':
                                    blueprint = decorator.func.value.id
                            
                            if pattern:
                                return pattern, methods, blueprint
                
                return None
            
            def _extract_methods(self, node):
                """Extract HTTP methods from decorator."""
                methods = []
                if isinstance(node, ast.List):
                    for elt in node.elts:
                        if isinstance(elt, ast.Constant) and isinstance(elt.value, str):
                            methods.append(elt.value)
                        elif isinstance(elt, ast.Str):
                            methods.append(elt.s)
                return methods or ['GET']
        
        visitor = FlaskRouteVisitor()
        visitor.visit(tree)
        
        return routes
    
    def _extract_flask_blueprints(self, tree: ast.AST, file_path: Path) -> List[Blueprint]:
        """Extract Flask blueprints from Python files."""
        blueprints = []
        
        class BlueprintVisitor(ast.NodeVisitor):
            def visit_Assign(self, node):
                # Look for Blueprint() assignments
                if isinstance(node.value, ast.Call):
                    if isinstance(node.value.func, ast.Name) and node.value.func.id == 'Blueprint':
                        # Extract blueprint name
                        name = None
                        for target in node.targets:
                            if isinstance(target, ast.Name):
                                name = target.id
                                break
                        
                        # Extract url_prefix
                        url_prefix = None
                        for keyword in node.value.keywords:
                            if keyword.arg == 'url_prefix':
                                if isinstance(keyword.value, ast.Constant):
                                    url_prefix = keyword.value.value
                                elif isinstance(keyword.value, ast.Str):
                                    url_prefix = keyword.value.s
                        
                        if name:
                            blueprints.append(Blueprint(
                                name=name,
                                file_path=str(file_path),
                                line_number=node.lineno,
                                url_prefix=url_prefix
                            ))
                
                self.generic_visit(node)
        
        visitor = BlueprintVisitor()
        visitor.visit(tree)
        
        return blueprints    

    def _detect_fastapi_patterns(self) -> FastAPIPatterns:
        """Detect FastAPI-specific patterns."""
        logger.info("Detecting FastAPI patterns...")
        
        routes = []
        dependencies = []
        
        # Find Python files that might contain FastAPI code
        python_files = list(self.project_path.rglob("*.py"))
        python_files = [f for f in python_files if '__pycache__' not in str(f)]
        
        for file_path in python_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                tree = ast.parse(content)
                
                # Extract FastAPI routes and dependencies
                routes.extend(self._extract_fastapi_routes(tree, file_path))
                dependencies.extend(self._extract_fastapi_dependencies(tree, file_path))
                
            except Exception as e:
                self._add_error("fastapi_parsing", f"Failed to parse {file_path}: {e}", str(file_path))
        
        return FastAPIPatterns(routes=routes, dependencies=dependencies)
    
    def _extract_fastapi_routes(self, tree: ast.AST, file_path: Path) -> List[FastAPIRoute]:
        """Extract FastAPI routes from Python files."""
        routes = []
        
        class FastAPIRouteVisitor(ast.NodeVisitor):
            def visit_FunctionDef(self, node):
                # Look for @app.get, @app.post, etc. decorators
                for decorator in node.decorator_list:
                    route_info = self._extract_fastapi_decorator(decorator)
                    if route_info:
                        pattern, method = route_info
                        
                        # Extract dependencies from function parameters
                        deps = self._extract_function_dependencies(node)
                        
                        routes.append(FastAPIRoute(
                            pattern=pattern,
                            method=method.upper(),
                            function=node.name,
                            file_path=str(file_path),
                            line_number=node.lineno,
                            dependencies=deps
                        ))
                self.generic_visit(node)
            
            def _extract_fastapi_decorator(self, decorator):
                """Extract route information from FastAPI decorator."""
                if isinstance(decorator, ast.Call):
                    if isinstance(decorator.func, ast.Attribute):
                        # Check for HTTP method decorators
                        http_methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head']
                        if decorator.func.attr in http_methods:
                            # Extract pattern
                            pattern = "/"  # Default
                            if decorator.args:
                                if isinstance(decorator.args[0], ast.Constant):
                                    pattern = decorator.args[0].value
                                elif isinstance(decorator.args[0], ast.Str):
                                    pattern = decorator.args[0].s
                            
                            return pattern, decorator.func.attr
                
                return None
            
            def _extract_function_dependencies(self, node):
                """Extract Depends() calls from function parameters."""
                deps = []
                
                # Check regular arguments for Depends() in annotations
                for arg in node.args.args:
                    if arg.annotation:
                        # Look for Depends() in type annotations
                        if isinstance(arg.annotation, ast.Call):
                            if isinstance(arg.annotation.func, ast.Name):
                                if arg.annotation.func.id == 'Depends':
                                    if arg.annotation.args:
                                        dep_arg = arg.annotation.args[0]
                                        if isinstance(dep_arg, ast.Name):
                                            deps.append(dep_arg.id)
                
                # Check default values for Depends() calls
                for default in node.args.defaults:
                    if isinstance(default, ast.Call):
                        if isinstance(default.func, ast.Name) and default.func.id == 'Depends':
                            if default.args:
                                dep_arg = default.args[0]
                                if isinstance(dep_arg, ast.Name):
                                    deps.append(dep_arg.id)
                
                return deps
        
        visitor = FastAPIRouteVisitor()
        visitor.visit(tree)
        
        return routes
    
    def _extract_fastapi_dependencies(self, tree: ast.AST, file_path: Path) -> List[DependencyMapping]:
        """Extract FastAPI dependency functions."""
        dependencies = []
        
        class DependencyVisitor(ast.NodeVisitor):
            def visit_FunctionDef(self, node):
                # Look for functions that might be used as dependencies
                # This is a heuristic - functions that return something and might be used with Depends()
                if self._looks_like_dependency_function(node):
                    dependencies.append(DependencyMapping(
                        name=node.name,
                        function=node.name,
                        file_path=str(file_path),
                        line_number=node.lineno
                    ))
                self.generic_visit(node)
            
            def _looks_like_dependency_function(self, node):
                """Heuristic to identify potential dependency functions."""
                # Look for common dependency patterns
                common_dep_names = [
                    'get_db', 'get_current_user', 'get_session', 'authenticate',
                    'get_settings', 'get_cache', 'get_logger'
                ]
                
                # Check if function name suggests it's a dependency
                if any(pattern in node.name.lower() for pattern in ['get_', 'auth', 'dep']):
                    return True
                
                if node.name in common_dep_names:
                    return True
                
                # Check if function has yield (generator-based dependency)
                for item in ast.walk(node):
                    if isinstance(item, ast.Yield) or isinstance(item, ast.YieldFrom):
                        return True
                
                return False
        
        visitor = DependencyVisitor()
        visitor.visit(tree)
        
        return dependencies
    
    def _add_error(self, error_type: str, message: str, file_path: Optional[str] = None):
        """Add an error to the error list."""
        error = {
            "type": error_type,
            "message": message
        }
        if file_path:
            error["file"] = file_path
        
        self.errors.append(error)
        logger.error(f"Framework detection error ({error_type}): {message}")
    
    def _add_warning(self, warning_type: str, message: str, file_path: Optional[str] = None):
        """Add a warning to the warning list."""
        warning = {
            "type": warning_type,
            "message": message
        }
        if file_path:
            warning["file"] = file_path
        
        self.warnings.append(warning)
        logger.warning(f"Framework detection warning ({warning_type}): {message}")