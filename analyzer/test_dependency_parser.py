#!/usr/bin/env python3
"""
Unit tests for dependency parser module.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from dependency_parser import DependencyParser, Library, TechStack


class TestDependencyParser:
    """Test cases for DependencyParser class."""
    
    def setup_method(self):
        """Set up test environment."""
        self.temp_dir = Path(tempfile.mkdtemp())
        self.parser = DependencyParser(self.temp_dir)
    
    def teardown_method(self):
        """Clean up test environment."""
        shutil.rmtree(self.temp_dir)
    
    def test_parse_requirements_txt_basic(self):
        """Test basic requirements.txt parsing."""
        requirements_content = """
# This is a comment
requests==2.28.1
flask>=2.0.0
django~=4.1.0
numpy
pytest-cov[toml]
"""
        
        req_file = self.temp_dir / "requirements.txt"
        req_file.write_text(requirements_content)
        
        self.parser._parse_requirements_txt()
        
        assert len(self.parser.libraries) == 5
        assert self.parser.package_manager == "pip"
        
        # Check specific libraries
        lib_names = {lib.name for lib in self.parser.libraries}
        assert "requests" in lib_names
        assert "flask" in lib_names
        assert "django" in lib_names
        assert "numpy" in lib_names
        assert "pytest-cov" in lib_names
        
        # Check versions
        requests_lib = next(lib for lib in self.parser.libraries if lib.name == "requests")
        assert requests_lib.version == "==2.28.1"
        
        flask_lib = next(lib for lib in self.parser.libraries if lib.name == "flask")
        assert flask_lib.version == ">=2.0.0"
        
        # Check extras
        pytest_cov_lib = next(lib for lib in self.parser.libraries if lib.name == "pytest-cov")
        assert "toml" in pytest_cov_lib.extras
    
    def test_parse_requirements_txt_with_options(self):
        """Test requirements.txt parsing with pip options."""
        requirements_content = """
-r base.txt
-e git+https://github.com/user/repo.git#egg=package
requests==2.28.1
# Another comment
flask
"""
        
        req_file = self.temp_dir / "requirements.txt"
        req_file.write_text(requirements_content)
        
        self.parser._parse_requirements_txt()
        
        # Should only parse actual package requirements, not pip options
        assert len(self.parser.libraries) == 2
        lib_names = {lib.name for lib in self.parser.libraries}
        assert "requests" in lib_names
        assert "flask" in lib_names
    
    def test_parse_requirement_line_variations(self):
        """Test parsing various requirement line formats."""
        test_cases = [
            ("requests==2.28.1", "requests", "==2.28.1", []),
            ("flask>=2.0.0", "flask", ">=2.0.0", []),
            ("django~=4.1.0", "django", "~=4.1.0", []),
            ("numpy", "numpy", None, []),
            ("pytest-cov[toml]", "pytest-cov", None, ["toml"]),
            ("requests[security,socks]>=2.25.0", "requests", ">=2.25.0", ["security", "socks"]),
        ]
        
        for line, expected_name, expected_version, expected_extras in test_cases:
            library = self.parser._parse_requirement_line(line, "test")
            assert library is not None
            assert library.name == expected_name
            assert library.version == expected_version
            assert library.extras == expected_extras
            assert library.source == "test"  
  
    def test_parse_pyproject_toml_poetry(self):
        """Test pyproject.toml parsing with Poetry format."""
        pyproject_content = """
[tool.poetry]
name = "test-project"
version = "0.1.0"

[tool.poetry.dependencies]
python = "^3.8"
requests = "^2.28.0"
flask = {version = "^2.0.0", extras = ["async"]}
django = "*"

[tool.poetry.group.dev.dependencies]
pytest = "^7.0.0"
black = "^22.0.0"
"""
        
        pyproject_file = self.temp_dir / "pyproject.toml"
        pyproject_file.write_text(pyproject_content)
        
        self.parser._parse_pyproject_toml()
        
        assert self.parser.package_manager == "poetry"
        assert self.parser.python_version == "^3.8"
        
        # Should have 5 libraries (excluding python)
        assert len(self.parser.libraries) >= 4
        
        lib_names = {lib.name for lib in self.parser.libraries}
        assert "requests" in lib_names
        assert "flask" in lib_names
        assert "django" in lib_names
        assert "pytest" in lib_names
    
    def test_parse_pyproject_toml_pep621(self):
        """Test pyproject.toml parsing with PEP 621 format."""
        pyproject_content = """
[project]
name = "test-project"
version = "0.1.0"
requires-python = ">=3.8"
dependencies = [
    "requests>=2.28.0",
    "flask[async]>=2.0.0",
    "django~=4.1.0"
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "black>=22.0.0"
]
"""
        
        pyproject_file = self.temp_dir / "pyproject.toml"
        pyproject_file.write_text(pyproject_content)
        
        self.parser._parse_pyproject_toml()
        
        assert self.parser.package_manager == "pip"
        assert self.parser.python_version == ">=3.8"
        
        lib_names = {lib.name for lib in self.parser.libraries}
        assert "requests" in lib_names
        assert "flask" in lib_names
        assert "django" in lib_names
        assert "pytest" in lib_names
        assert "black" in lib_names
    
    def test_parse_pipfile(self):
        """Test Pipfile parsing."""
        pipfile_content = """
[requires]
python_version = "3.9"

[packages]
requests = "*"
flask = {version = ">=2.0.0", extras = ["async"]}
django = "~=4.1.0"

[dev-packages]
pytest = "*"
black = ">=22.0.0"
"""
        
        pipfile = self.temp_dir / "Pipfile"
        pipfile.write_text(pipfile_content)
        
        self.parser._parse_pipfile()
        
        assert self.parser.package_manager == "pipenv"
        assert self.parser.python_version == "3.9"
        
        lib_names = {lib.name for lib in self.parser.libraries}
        assert "requests" in lib_names
        assert "flask" in lib_names
        assert "django" in lib_names
        assert "pytest" in lib_names
        assert "black" in lib_names
    
    def test_detect_frameworks(self):
        """Test framework detection from libraries."""
        # Add some libraries that should trigger framework detection
        self.parser.libraries = [
            Library("django", "4.1.0", "test"),
            Library("flask", "2.0.0", "test"),
            Library("requests", "2.28.0", "test"),
            Library("fastapi", "0.85.0", "test"),
            Library("numpy", "1.23.0", "test"),
        ]
        
        frameworks = self.parser._detect_frameworks()
        
        assert "django" in frameworks
        assert "flask" in frameworks
        assert "fastapi" in frameworks
        assert len(frameworks) == 3  # Should not detect numpy as framework
    
    def test_parse_dependencies_integration(self):
        """Test complete dependency parsing integration."""
        # Create multiple dependency files
        requirements_content = "requests==2.28.1\nflask>=2.0.0"
        req_file = self.temp_dir / "requirements.txt"
        req_file.write_text(requirements_content)
        
        pyproject_content = """
[tool.poetry]
name = "test-project"

[tool.poetry.dependencies]
python = "^3.8"
django = "^4.1.0"
"""
        pyproject_file = self.temp_dir / "pyproject.toml"
        pyproject_file.write_text(pyproject_content)
        
        tech_stack = self.parser.parse_dependencies()
        
        assert isinstance(tech_stack, TechStack)
        assert len(tech_stack.libraries) >= 3  # requests, flask, django
        assert "django" in tech_stack.frameworks
        assert "flask" in tech_stack.frameworks
        assert tech_stack.python_version == "^3.8"
        assert tech_stack.package_manager == "poetry"  # Poetry takes precedence
    
    def test_empty_project(self):
        """Test parsing project with no dependency files."""
        tech_stack = self.parser.parse_dependencies()
        
        assert isinstance(tech_stack, TechStack)
        assert len(tech_stack.libraries) == 0
        assert len(tech_stack.frameworks) == 0
        assert tech_stack.package_manager == "pip"  # Default
        assert tech_stack.python_version is None


class TestLibraryDataClass:
    """Test cases for Library data class."""
    
    def test_library_creation(self):
        """Test Library object creation."""
        lib = Library("requests", "2.28.1", "requirements.txt")
        
        assert lib.name == "requests"
        assert lib.version == "2.28.1"
        assert lib.source == "requirements.txt"
        assert lib.extras == []
    
    def test_library_with_extras(self):
        """Test Library object with extras."""
        lib = Library("requests", "2.28.1", "requirements.txt", ["security", "socks"])
        
        assert lib.name == "requests"
        assert lib.extras == ["security", "socks"]


class TestTechStackDataClass:
    """Test cases for TechStack data class."""
    
    def test_techstack_creation(self):
        """Test TechStack object creation."""
        libraries = [
            Library("django", "4.1.0", "requirements.txt"),
            Library("requests", "2.28.1", "requirements.txt")
        ]
        
        tech_stack = TechStack(
            libraries=libraries,
            frameworks=["django"],
            python_version="3.9",
            package_manager="pip"
        )
        
        assert len(tech_stack.libraries) == 2
        assert tech_stack.frameworks == ["django"]
        assert tech_stack.python_version == "3.9"
        assert tech_stack.package_manager == "pip"


if __name__ == "__main__":
    pytest.main([__file__])