#!/usr/bin/env python3
"""
Integration tests for JSON output system.

This module tests the JSON serialization, validation, and output format
for the CodeMindMap analyzer.
"""

import json
import pytest
import tempfile
import shutil
from pathlib import Path
from typing import Dict, Any

from analyzer import ProjectAnalyzer, AnalysisResult
from json_schema import JSONSchemaValidator, ValidationError, validate_analysis_json


class TestJSONOutput:
    """Test cases for JSON output system."""
    
    def setup_method(self):
        """Set up test environment."""
        self.temp_dir = Path(tempfile.mkdtemp())
        self.validator = JSONSchemaValidator()
    
    def teardown_method(self):
        """Clean up test environment."""
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir)
    
    def create_sample_python_project(self, project_type: str = "basic") -> Path:
        """Create a sample Python project for testing.
        
        Args:
            project_type: Type of project to create (basic, django, flask, fastapi)
            
        Returns:
            Path to the created project
        """
        project_path = self.temp_dir / f"sample_{project_type}_project"
        project_path.mkdir(parents=True)
        
        if project_type == "basic":
            self._create_basic_project(project_path)
        elif project_type == "django":
            self._create_django_project(project_path)
        elif project_type == "flask":
            self._create_flask_project(project_path)
        elif project_type == "fastapi":
            self._create_fastapi_project(project_path)
        
        return project_path
    
    def _create_basic_project(self, project_path: Path):
        """Create a basic Python project."""
        # Create requirements.txt
        (project_path / "requirements.txt").write_text("""
requests==2.28.1
numpy>=1.21.0
pandas[excel]==1.5.0
""".strip())
        
        # Create main module
        (project_path / "main.py").write_text("""
import requests
import numpy as np
from utils import helper_function

def main():
    \"\"\"Main function.\"\"\"
    data = helper_function()
    result = process_data(data)
    return result

def process_data(data):
    \"\"\"Process data with some complexity.\"\"\"
    if not data:
        return None
    
    processed = []
    for item in data:
        if item > 0:
            processed.append(item * 2)
        elif item < 0:
            processed.append(abs(item))
        else:
            processed.append(1)
    
    return processed

class DataProcessor:
    \"\"\"Data processing class.\"\"\"
    
    def __init__(self, config=None):
        self.config = config or {}
    
    def process(self, data):
        \"\"\"Process data.\"\"\"
        return [x * 2 for x in data]
    
    def validate(self, data):
        \"\"\"Validate data.\"\"\"
        return all(isinstance(x, (int, float)) for x in data)
""")
        
        # Create utils module
        (project_path / "utils.py").write_text("""
import numpy as np

def helper_function():
    \"\"\"Helper function.\"\"\"
    return [1, 2, 3, 4, 5]

def complex_calculation(x, y, z=None):
    \"\"\"Complex calculation with multiple branches.\"\"\"
    if z is None:
        z = 0
    
    result = 0
    if x > 0:
        if y > 0:
            result = x * y + z
        else:
            result = x - y + z
    else:
        if y > 0:
            result = y - x + z
        else:
            result = -(x + y) + z
    
    # Additional complexity
    for i in range(10):
        if i % 2 == 0:
            result += i
        else:
            result -= i
    
    return result

def simple_function():
    \"\"\"Simple function.\"\"\"
    return "Hello, World!"
""")
    
    def _create_django_project(self, project_path: Path):
        """Create a Django project."""
        # Create requirements.txt
        (project_path / "requirements.txt").write_text("""
Django==4.2.0
djangorestframework==3.14.0
""".strip())
        
        # Create Django app structure
        app_dir = project_path / "myapp"
        app_dir.mkdir()
        
        # Create models.py
        (app_dir / "models.py").write_text("""
from django.db import models

class User(models.Model):
    username = models.CharField(max_length=100)
    email = models.EmailField()
    created_at = models.DateTimeField(auto_now_add=True)

class Post(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
""")
        
        # Create views.py
        (app_dir / "views.py").write_text("""
from django.shortcuts import render
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import User, Post

def user_list(request):
    \"\"\"List all users.\"\"\"
    users = User.objects.all()
    return render(request, 'users.html', {'users': users})

def user_detail(request, user_id):
    \"\"\"Show user details.\"\"\"
    user = User.objects.get(id=user_id)
    return render(request, 'user_detail.html', {'user': user})

class PostListView(APIView):
    \"\"\"API view for posts.\"\"\"
    
    def get(self, request):
        posts = Post.objects.all()
        return Response({'posts': [p.title for p in posts]})
    
    def post(self, request):
        # Create new post
        return Response({'status': 'created'})
""")
        
        # Create urls.py
        (app_dir / "urls.py").write_text("""
from django.urls import path
from . import views

urlpatterns = [
    path('users/', views.user_list, name='user_list'),
    path('users/<int:user_id>/', views.user_detail, name='user_detail'),
    path('api/posts/', views.PostListView.as_view(), name='post_list'),
]
""")
        
        # Create serializers.py
        (app_dir / "serializers.py").write_text("""
from rest_framework import serializers
from .models import User, Post

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class PostSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ['id', 'title', 'content', 'author']
""")
    
    def _create_flask_project(self, project_path: Path):
        """Create a Flask project."""
        # Create requirements.txt
        (project_path / "requirements.txt").write_text("""
Flask==2.3.0
Flask-SQLAlchemy==3.0.0
""".strip())
        
        # Create main Flask app
        (project_path / "app.py").write_text("""
from flask import Flask, render_template, jsonify, request
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)

@app.route('/')
def index():
    \"\"\"Home page.\"\"\"
    return render_template('index.html')

@app.route('/users')
def users():
    \"\"\"List users.\"\"\"
    users = User.query.all()
    return render_template('users.html', users=users)

@app.route('/api/users', methods=['GET', 'POST'])
def api_users():
    \"\"\"API endpoint for users.\"\"\"
    if request.method == 'GET':
        users = User.query.all()
        return jsonify([{'id': u.id, 'username': u.username} for u in users])
    elif request.method == 'POST':
        # Create user
        return jsonify({'status': 'created'})

@app.route('/api/users/<int:user_id>')
def api_user_detail(user_id):
    \"\"\"API endpoint for user details.\"\"\"
    user = User.query.get_or_404(user_id)
    return jsonify({'id': user.id, 'username': user.username})

if __name__ == '__main__':
    app.run(debug=True)
""")
        
        # Create blueprint
        (project_path / "auth.py").write_text("""
from flask import Blueprint, request, jsonify

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    \"\"\"User login.\"\"\"
    return jsonify({'token': 'fake-token'})

@auth_bp.route('/logout', methods=['POST'])
def logout():
    \"\"\"User logout.\"\"\"
    return jsonify({'status': 'logged out'})
""")
    
    def _create_fastapi_project(self, project_path: Path):
        """Create a FastAPI project."""
        # Create requirements.txt
        (project_path / "requirements.txt").write_text("""
fastapi==0.100.0
uvicorn==0.22.0
pydantic==2.0.0
""".strip())
        
        # Create main FastAPI app
        (project_path / "main.py").write_text("""
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()

class User(BaseModel):
    id: int
    username: str
    email: str

class UserCreate(BaseModel):
    username: str
    email: str

# Fake database
fake_users_db = [
    User(id=1, username="john", email="john@example.com"),
    User(id=2, username="jane", email="jane@example.com"),
]

def get_db():
    \"\"\"Dependency to get database connection.\"\"\"
    return fake_users_db

def get_current_user(token: str = Depends(get_token)):
    \"\"\"Get current authenticated user.\"\"\"
    if token != "valid-token":
        raise HTTPException(status_code=401, detail="Invalid token")
    return User(id=1, username="current", email="current@example.com")

def get_token():
    \"\"\"Get authentication token.\"\"\"
    return "valid-token"

@app.get("/")
def read_root():
    \"\"\"Root endpoint.\"\"\"
    return {"message": "Hello World"}

@app.get("/users", response_model=List[User])
def read_users(db: List[User] = Depends(get_db)):
    \"\"\"Get all users.\"\"\"
    return db

@app.get("/users/{user_id}", response_model=User)
def read_user(user_id: int, db: List[User] = Depends(get_db)):
    \"\"\"Get user by ID.\"\"\"
    for user in db:
        if user.id == user_id:
            return user
    raise HTTPException(status_code=404, detail="User not found")

@app.post("/users", response_model=User)
def create_user(
    user: UserCreate, 
    db: List[User] = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    \"\"\"Create a new user.\"\"\"
    new_user = User(id=len(db) + 1, **user.dict())
    db.append(new_user)
    return new_user

@app.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: List[User] = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    \"\"\"Delete a user.\"\"\"
    for i, user in enumerate(db):
        if user.id == user_id:
            del db[i]
            return {"message": "User deleted"}
    raise HTTPException(status_code=404, detail="User not found")
""")
    
    def test_basic_json_serialization(self):
        """Test basic JSON serialization."""
        project_path = self.create_sample_python_project("basic")
        analyzer = ProjectAnalyzer(project_path)
        result = analyzer.analyze_project()
        
        # Test JSON serialization
        json_str = result.to_json(validate=False)
        assert isinstance(json_str, str)
        
        # Test JSON parsing
        parsed = json.loads(json_str)
        assert isinstance(parsed, dict)
        assert "success" in parsed
        assert "metadata" in parsed
        assert "tech_stack" in parsed
        assert "modules" in parsed
        assert "functions" in parsed
        assert "framework_patterns" in parsed
    
    def test_json_schema_validation(self):
        """Test JSON schema validation."""
        project_path = self.create_sample_python_project("basic")
        analyzer = ProjectAnalyzer(project_path)
        result = analyzer.analyze_project()
        
        # Test validation with valid JSON
        json_str = result.to_json(validate=True)
        assert isinstance(json_str, str)
        
        # Test direct validation
        parsed = json.loads(json_str)
        assert validate_analysis_json(parsed) is True
    
    def test_json_structure_completeness(self):
        """Test that JSON contains all required fields."""
        project_path = self.create_sample_python_project("basic")
        analyzer = ProjectAnalyzer(project_path)
        result = analyzer.analyze_project()
        
        json_str = result.to_json()
        parsed = json.loads(json_str)
        
        # Check top-level structure
        required_fields = [
            "success", "metadata", "errors", "warnings", 
            "tech_stack", "modules", "functions", "framework_patterns", "schema_version"
        ]
        for field in required_fields:
            assert field in parsed, f"Missing required field: {field}"
        
        # Check metadata structure
        metadata_fields = ["project_path", "analysis_time", "total_files", "analyzed_files", "timestamp"]
        for field in metadata_fields:
            assert field in parsed["metadata"], f"Missing metadata field: {field}"
        
        # Check tech_stack structure
        tech_stack_fields = ["libraries", "frameworks", "package_manager"]
        for field in tech_stack_fields:
            assert field in parsed["tech_stack"], f"Missing tech_stack field: {field}"
        
        # Check modules structure
        modules_fields = ["nodes", "edges", "total_modules", "complexity_summary"]
        for field in modules_fields:
            assert field in parsed["modules"], f"Missing modules field: {field}"
        
        # Check functions structure
        functions_fields = ["nodes", "edges", "total_functions"]
        for field in functions_fields:
            assert field in parsed["functions"], f"Missing functions field: {field}"
    
    def test_django_project_json_output(self):
        """Test JSON output for Django project."""
        project_path = self.create_sample_python_project("django")
        analyzer = ProjectAnalyzer(project_path)
        result = analyzer.analyze_project()
        
        json_str = result.to_json()
        parsed = json.loads(json_str)
        
        # Check Django framework detection
        assert "django" in parsed["tech_stack"]["frameworks"]
        
        # Check Django patterns
        if "django" in parsed["framework_patterns"]:
            django_patterns = parsed["framework_patterns"]["django"]
            assert "url_patterns" in django_patterns
            assert "views" in django_patterns
            assert "models" in django_patterns
            assert "serializers" in django_patterns
    
    def test_flask_project_json_output(self):
        """Test JSON output for Flask project."""
        project_path = self.create_sample_python_project("flask")
        analyzer = ProjectAnalyzer(project_path)
        result = analyzer.analyze_project()
        
        json_str = result.to_json()
        parsed = json.loads(json_str)
        
        # Check Flask framework detection
        assert "flask" in parsed["tech_stack"]["frameworks"]
        
        # Check Flask patterns
        if "flask" in parsed["framework_patterns"]:
            flask_patterns = parsed["framework_patterns"]["flask"]
            assert "routes" in flask_patterns
            assert "blueprints" in flask_patterns
    
    def test_fastapi_project_json_output(self):
        """Test JSON output for FastAPI project."""
        project_path = self.create_sample_python_project("fastapi")
        analyzer = ProjectAnalyzer(project_path)
        result = analyzer.analyze_project()
        
        json_str = result.to_json()
        parsed = json.loads(json_str)
        
        # Check FastAPI framework detection
        assert "fastapi" in parsed["tech_stack"]["frameworks"]
        
        # Check FastAPI patterns
        if "fastapi" in parsed["framework_patterns"]:
            fastapi_patterns = parsed["framework_patterns"]["fastapi"]
            assert "routes" in fastapi_patterns
            assert "dependencies" in fastapi_patterns
    
    def test_error_handling_in_json(self):
        """Test error handling and reporting in JSON output."""
        # Create project with syntax error
        project_path = self.temp_dir / "error_project"
        project_path.mkdir()
        
        # Create file with syntax error
        (project_path / "broken.py").write_text("""
def broken_function(
    # Missing closing parenthesis and colon
    return "This will cause a syntax error"
""")
        
        analyzer = ProjectAnalyzer(project_path)
        result = analyzer.analyze_project()
        
        json_str = result.to_json()
        parsed = json.loads(json_str)
        
        # Check that errors are reported
        assert "errors" in parsed
        assert isinstance(parsed["errors"], list)
        
        # Check success flag
        assert parsed["success"] is False or len(parsed["errors"]) > 0
    
    def test_complexity_metrics_in_json(self):
        """Test complexity metrics in JSON output."""
        project_path = self.create_sample_python_project("basic")
        analyzer = ProjectAnalyzer(project_path)
        result = analyzer.analyze_project()
        
        json_str = result.to_json()
        parsed = json.loads(json_str)
        
        # Check complexity summary
        complexity_summary = parsed["modules"]["complexity_summary"]
        assert "low" in complexity_summary
        assert "medium" in complexity_summary
        assert "high" in complexity_summary
        assert "average" in complexity_summary
        
        # Check module complexity
        if parsed["modules"]["nodes"]:
            node = parsed["modules"]["nodes"][0]
            assert "complexity" in node
            complexity = node["complexity"]
            assert "cyclomatic" in complexity
            assert "cognitive" in complexity
            assert "level" in complexity
            assert complexity["level"] in ["low", "medium", "high"]
    
    def test_invalid_json_validation(self):
        """Test validation with invalid JSON structure."""
        invalid_json = {
            "success": True,
            # Missing required fields
        }
        
        with pytest.raises(ValidationError):
            validate_analysis_json(invalid_json)
    
    def test_json_serialization_with_none_values(self):
        """Test JSON serialization handles None values correctly."""
        project_path = self.create_sample_python_project("basic")
        analyzer = ProjectAnalyzer(project_path)
        result = analyzer.analyze_project()
        
        # Modify result to include None values
        if result.tech_stack.libraries:
            result.tech_stack.libraries[0].version = None
        
        json_str = result.to_json()
        parsed = json.loads(json_str)
        
        # Check that None values are properly serialized
        if parsed["tech_stack"]["libraries"]:
            lib = parsed["tech_stack"]["libraries"][0]
            assert lib["version"] is None
    
    def test_large_project_json_performance(self):
        """Test JSON serialization performance with larger project."""
        project_path = self.create_sample_python_project("basic")
        
        # Create additional modules to simulate larger project
        for i in range(10):
            module_content = f"""
def function_{i}_1():
    return {i}

def function_{i}_2(x, y=None):
    if x > 0:
        return x * {i}
    else:
        return {i}

class Class_{i}:
    def method_1(self):
        return {i}
    
    def method_2(self, data):
        result = []
        for item in data:
            if item % 2 == 0:
                result.append(item * {i})
        return result
"""
            (project_path / f"module_{i}.py").write_text(module_content)
        
        analyzer = ProjectAnalyzer(project_path)
        result = analyzer.analyze_project()
        
        # Test that JSON serialization completes without errors
        json_str = result.to_json()
        assert isinstance(json_str, str)
        assert len(json_str) > 1000  # Should be substantial JSON
        
        # Test parsing
        parsed = json.loads(json_str)
        assert parsed["modules"]["total_modules"] >= 10


if __name__ == "__main__":
    # Run tests
    test_instance = TestJSONOutput()
    
    # Run individual tests
    test_methods = [
        "test_basic_json_serialization",
        "test_json_schema_validation", 
        "test_json_structure_completeness",
        "test_django_project_json_output",
        "test_flask_project_json_output",
        "test_fastapi_project_json_output",
        "test_error_handling_in_json",
        "test_complexity_metrics_in_json",
        "test_json_serialization_with_none_values",
        "test_large_project_json_performance"
    ]
    
    for method_name in test_methods:
        print(f"Running {method_name}...")
        test_instance.setup_method()
        try:
            method = getattr(test_instance, method_name)
            method()
            print(f"✓ {method_name} passed")
        except Exception as e:
            print(f"✗ {method_name} failed: {e}")
        finally:
            test_instance.teardown_method()
    
    print("All tests completed!")