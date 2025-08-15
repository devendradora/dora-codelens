#!/usr/bin/env python3
"""
Unit tests for framework detector module.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from framework_detector import (
    FrameworkDetector, FrameworkPatterns, DjangoPatterns, FlaskPatterns, FastAPIPatterns,
    URLPattern, ViewMapping, ModelMapping, SerializerMapping,
    FlaskRoute, Blueprint, FastAPIRoute, DependencyMapping
)


class TestFrameworkDetector:
    """Test cases for FrameworkDetector class."""
    
    def setup_method(self):
        """Set up test environment."""
        self.temp_dir = Path(tempfile.mkdtemp())
        self.detector = FrameworkDetector(self.temp_dir, ['django', 'flask', 'fastapi'])
    
    def teardown_method(self):
        """Clean up test environment."""
        shutil.rmtree(self.temp_dir)
    
    def test_detect_patterns_empty_project(self):
        """Test pattern detection on empty project."""
        patterns = self.detector.detect_patterns()
        
        assert isinstance(patterns, FrameworkPatterns)
        assert patterns.django is not None
        assert patterns.flask is not None
        assert patterns.fastapi is not None
        
        # Should be empty since no files exist
        assert len(patterns.django.url_patterns) == 0
        assert len(patterns.flask.routes) == 0
        assert len(patterns.fastapi.routes) == 0
    
    def test_django_url_pattern_detection(self):
        """Test Django URL pattern detection."""
        urls_content = '''
from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('users/<int:user_id>/', views.user_detail, name='user_detail'),
    path('api/posts/', views.PostListView.as_view(), name='post_list'),
]
'''
        
        urls_file = self.temp_dir / "urls.py"
        urls_file.write_text(urls_content)
        
        patterns = self.detector._detect_django_patterns()
        
        assert len(patterns.url_patterns) == 3
        
        # Check first pattern
        pattern1 = patterns.url_patterns[0]
        assert pattern1.pattern == ''
        assert pattern1.view_function == 'views.index'
        assert pattern1.view_name == 'index'
        
        # Check second pattern
        pattern2 = patterns.url_patterns[1]
        assert pattern2.pattern == 'users/<int:user_id>/'
        assert pattern2.view_function == 'views.user_detail'
        assert pattern2.view_name == 'user_detail'
        
        # Check third pattern
        pattern3 = patterns.url_patterns[2]
        assert pattern3.pattern == 'api/posts/'
        assert 'PostListView' in pattern3.view_function
        assert pattern3.view_name == 'post_list'
    
    def test_django_view_detection(self):
        """Test Django view detection."""
        views_content = '''
from django.shortcuts import render
from django.views.generic import ListView
from django.http import HttpResponse

def index(request):
    return render(request, 'index.html')

def user_detail(request, user_id):
    return HttpResponse(f"User {user_id}")

class PostListView(ListView):
    model = Post
    template_name = 'posts/list.html'

class UserCreateView(CreateView):
    model = User
    fields = ['name', 'email']
'''
        
        views_file = self.temp_dir / "views.py"
        views_file.write_text(views_content)
        
        patterns = self.detector._detect_django_patterns()
        
        assert len(patterns.views) == 4
        
        # Check function-based views
        view_names = [v.name for v in patterns.views]
        assert 'index' in view_names
        assert 'user_detail' in view_names
        
        # Check class-based views
        assert 'PostListView' in view_names
        assert 'UserCreateView' in view_names
        
        # Check view types
        index_view = next(v for v in patterns.views if v.name == 'index')
        assert not index_view.is_class_based
        
        post_list_view = next(v for v in patterns.views if v.name == 'PostListView')
        assert post_list_view.is_class_based 
   
    def test_django_model_detection(self):
        """Test Django model detection."""
        models_content = '''
from django.db import models

class User(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    created_at = models.DateTimeField(auto_now_add=True)

class Post(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    published = models.BooleanField(default=False)

class Profile(models.AbstractModel):
    bio = models.TextField()
'''
        
        models_file = self.temp_dir / "models.py"
        models_file.write_text(models_content)
        
        patterns = self.detector._detect_django_patterns()
        
        assert len(patterns.models) == 3
        
        model_names = [m.name for m in patterns.models]
        assert 'User' in model_names
        assert 'Post' in model_names
        assert 'Profile' in model_names
        
        # Check fields
        user_model = next(m for m in patterns.models if m.name == 'User')
        assert 'name' in user_model.fields
        assert 'email' in user_model.fields
        assert 'created_at' in user_model.fields
    
    def test_django_serializer_detection(self):
        """Test Django serializer detection."""
        serializers_content = '''
from rest_framework import serializers
from .models import User, Post

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'name', 'email']

class PostSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    
    class Meta:
        model = Post
        fields = '__all__'

class CustomSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
'''
        
        serializers_file = self.temp_dir / "serializers.py"
        serializers_file.write_text(serializers_content)
        
        patterns = self.detector._detect_django_patterns()
        
        assert len(patterns.serializers) == 3
        
        serializer_names = [s.name for s in patterns.serializers]
        assert 'UserSerializer' in serializer_names
        assert 'PostSerializer' in serializer_names
        assert 'CustomSerializer' in serializer_names
        
        # Check model associations
        user_serializer = next(s for s in patterns.serializers if s.name == 'UserSerializer')
        assert user_serializer.model == 'User'
        
        post_serializer = next(s for s in patterns.serializers if s.name == 'PostSerializer')
        assert post_serializer.model == 'Post'
        
        custom_serializer = next(s for s in patterns.serializers if s.name == 'CustomSerializer')
        assert custom_serializer.model is None
    
    def test_flask_route_detection(self):
        """Test Flask route detection."""
        flask_content = '''
from flask import Flask, Blueprint

app = Flask(__name__)
api_bp = Blueprint('api', __name__, url_prefix='/api')

@app.route('/')
def index():
    return 'Hello World'

@app.route('/users/<int:user_id>', methods=['GET', 'POST'])
def user_detail(user_id):
    return f'User {user_id}'

@api_bp.route('/posts')
def list_posts():
    return 'Posts'

@api_bp.route('/posts/<int:post_id>', methods=['GET', 'PUT', 'DELETE'])
def post_detail(post_id):
    return f'Post {post_id}'
'''
        
        flask_file = self.temp_dir / "app.py"
        flask_file.write_text(flask_content)
        
        patterns = self.detector._detect_flask_patterns()
        
        assert len(patterns.routes) == 4
        
        # Check app routes
        app_routes = [r for r in patterns.routes if r.blueprint is None]
        assert len(app_routes) == 2
        
        index_route = next(r for r in app_routes if r.function == 'index')
        assert index_route.pattern == '/'
        assert index_route.methods == ['GET']
        
        user_route = next(r for r in app_routes if r.function == 'user_detail')
        assert user_route.pattern == '/users/<int:user_id>'
        assert 'GET' in user_route.methods
        assert 'POST' in user_route.methods
        
        # Check blueprint routes
        bp_routes = [r for r in patterns.routes if r.blueprint == 'api_bp']
        assert len(bp_routes) == 2
        
        posts_route = next(r for r in bp_routes if r.function == 'list_posts')
        assert posts_route.pattern == '/posts'
        assert posts_route.blueprint == 'api_bp'
    
    def test_flask_blueprint_detection(self):
        """Test Flask blueprint detection."""
        flask_content = '''
from flask import Blueprint

api_bp = Blueprint('api', __name__, url_prefix='/api')
admin_bp = Blueprint('admin', __name__, url_prefix='/admin')
simple_bp = Blueprint('simple', __name__)
'''
        
        flask_file = self.temp_dir / "blueprints.py"
        flask_file.write_text(flask_content)
        
        patterns = self.detector._detect_flask_patterns()
        
        assert len(patterns.blueprints) == 3
        
        blueprint_names = [b.name for b in patterns.blueprints]
        assert 'api_bp' in blueprint_names
        assert 'admin_bp' in blueprint_names
        assert 'simple_bp' in blueprint_names
        
        # Check URL prefixes
        api_bp = next(b for b in patterns.blueprints if b.name == 'api_bp')
        assert api_bp.url_prefix == '/api'
        
        admin_bp = next(b for b in patterns.blueprints if b.name == 'admin_bp')
        assert admin_bp.url_prefix == '/admin'
        
        simple_bp = next(b for b in patterns.blueprints if b.name == 'simple_bp')
        assert simple_bp.url_prefix is None   
 
    def test_fastapi_route_detection(self):
        """Test FastAPI route detection."""
        fastapi_content = '''
from fastapi import FastAPI, Depends
from typing import Optional

app = FastAPI()

def get_db():
    return "database"

def get_current_user():
    return "user"

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/items/{item_id}")
def read_item(item_id: int, q: Optional[str] = None):
    return {"item_id": item_id, "q": q}

@app.post("/users/")
def create_user(user_data: dict, db = Depends(get_db)):
    return {"user": user_data}

@app.put("/users/{user_id}")
def update_user(
    user_id: int, 
    user_data: dict, 
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    return {"user_id": user_id}
'''
        
        fastapi_file = self.temp_dir / "main.py"
        fastapi_file.write_text(fastapi_content)
        
        patterns = self.detector._detect_fastapi_patterns()
        
        assert len(patterns.routes) == 4
        
        # Check route methods and patterns
        route_info = [(r.method, r.pattern, r.function) for r in patterns.routes]
        
        assert ('GET', '/', 'read_root') in route_info
        assert ('GET', '/items/{item_id}', 'read_item') in route_info
        assert ('POST', '/users/', 'create_user') in route_info
        assert ('PUT', '/users/{user_id}', 'update_user') in route_info
        
        # Check dependencies
        create_user_route = next(r for r in patterns.routes if r.function == 'create_user')
        assert 'get_db' in create_user_route.dependencies
        
        update_user_route = next(r for r in patterns.routes if r.function == 'update_user')
        assert 'get_current_user' in update_user_route.dependencies
        assert 'get_db' in update_user_route.dependencies
    
    def test_fastapi_dependency_detection(self):
        """Test FastAPI dependency detection."""
        fastapi_content = '''
from fastapi import Depends
from sqlalchemy.orm import Session

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user():
    return {"user": "current"}

def authenticate_user(token: str):
    return {"authenticated": True}

def get_settings():
    return Settings()

def regular_function():
    return "not a dependency"
'''
        
        fastapi_file = self.temp_dir / "dependencies.py"
        fastapi_file.write_text(fastapi_content)
        
        patterns = self.detector._detect_fastapi_patterns()
        
        # Should detect dependency-like functions
        dep_names = [d.name for d in patterns.dependencies]
        
        assert 'get_db' in dep_names  # Has yield
        assert 'get_current_user' in dep_names  # Starts with get_
        assert 'authenticate_user' in dep_names  # Contains 'auth'
        assert 'get_settings' in dep_names  # Starts with get_
        
        # Should not detect regular functions
        assert 'regular_function' not in dep_names
    
    def test_framework_detection_with_specific_frameworks(self):
        """Test detection when only specific frameworks are enabled."""
        # Test with only Django
        django_detector = FrameworkDetector(self.temp_dir, ['django'])
        patterns = django_detector.detect_patterns()
        
        assert patterns.django is not None
        assert patterns.flask is None
        assert patterns.fastapi is None
        
        # Test with only Flask
        flask_detector = FrameworkDetector(self.temp_dir, ['flask'])
        patterns = flask_detector.detect_patterns()
        
        assert patterns.django is None
        assert patterns.flask is not None
        assert patterns.fastapi is None
        
        # Test with no frameworks
        no_framework_detector = FrameworkDetector(self.temp_dir, [])
        patterns = no_framework_detector.detect_patterns()
        
        assert patterns.django is None
        assert patterns.flask is None
        assert patterns.fastapi is None


class TestDataClasses:
    """Test cases for framework pattern data classes."""
    
    def test_url_pattern_creation(self):
        """Test URLPattern data class."""
        pattern = URLPattern(
            pattern='users/<int:id>/',
            view_name='user_detail',
            view_function='views.user_detail',
            namespace='api',
            line_number=10
        )
        
        assert pattern.pattern == 'users/<int:id>/'
        assert pattern.view_name == 'user_detail'
        assert pattern.view_function == 'views.user_detail'
        assert pattern.namespace == 'api'
        assert pattern.line_number == 10
    
    def test_flask_route_creation(self):
        """Test FlaskRoute data class."""
        route = FlaskRoute(
            pattern='/api/users',
            methods=['GET', 'POST'],
            function='list_users',
            file_path='/app/views.py',
            line_number=15,
            blueprint='api_bp'
        )
        
        assert route.pattern == '/api/users'
        assert route.methods == ['GET', 'POST']
        assert route.function == 'list_users'
        assert route.blueprint == 'api_bp'
    
    def test_fastapi_route_creation(self):
        """Test FastAPIRoute data class."""
        route = FastAPIRoute(
            pattern='/users/{user_id}',
            method='GET',
            function='get_user',
            file_path='/app/main.py',
            line_number=20,
            dependencies=['get_db', 'get_current_user']
        )
        
        assert route.pattern == '/users/{user_id}'
        assert route.method == 'GET'
        assert route.function == 'get_user'
        assert 'get_db' in route.dependencies
        assert 'get_current_user' in route.dependencies
    
    def test_framework_patterns_creation(self):
        """Test FrameworkPatterns container."""
        django_patterns = DjangoPatterns([], [], [], [])
        flask_patterns = FlaskPatterns([], [])
        fastapi_patterns = FastAPIPatterns([], [])
        
        patterns = FrameworkPatterns(
            django=django_patterns,
            flask=flask_patterns,
            fastapi=fastapi_patterns
        )
        
        assert patterns.django is not None
        assert patterns.flask is not None
        assert patterns.fastapi is not None


if __name__ == "__main__":
    pytest.main([__file__])