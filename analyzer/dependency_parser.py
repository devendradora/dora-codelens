#!/usr/bin/env python3
"""
Dependency Parser Module

This module provides parsers for various Python dependency files including
requirements.txt, pyproject.toml, and Pipfile.
"""

import re
import logging
from pathlib import Path
from typing import List, Dict, Optional, Union, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class Library:
    """Represents an external library dependency."""
    name: str
    version: Optional[str] = None
    source: str = "unknown"  # requirements.txt, pyproject.toml, etc.
    extras: List[str] = None
    
    def __post_init__(self):
        if self.extras is None:
            self.extras = []


@dataclass
class TechStack:
    """Represents the technology stack of a project."""
    libraries: List[Library]
    frameworks: List[str]
    python_version: Optional[str] = None
    package_manager: str = "pip"


class DependencyParser:
    """Main class for parsing various dependency file formats."""
    
    def __init__(self, project_path: Union[str, Path]):
        """Initialize the dependency parser.
        
        Args:
            project_path: Path to the Python project
        """
        self.project_path = Path(project_path).resolve()
        self.libraries: List[Library] = []
        self.python_version: Optional[str] = None
        self.package_manager: str = "pip"
    
    def parse_dependencies(self) -> TechStack:
        """Parse all dependency files and return TechStack.
        
        Returns:
            TechStack object with detected libraries and metadata
        """
        logger.info("Starting dependency parsing...")
        
        # Try parsing different dependency file formats
        self._parse_requirements_txt()
        self._parse_pyproject_toml()
        self._parse_pipfile()
        
        # Detect frameworks from libraries
        frameworks = self._detect_frameworks()
        
        tech_stack = TechStack(
            libraries=self.libraries,
            frameworks=frameworks,
            python_version=self.python_version,
            package_manager=self.package_manager
        )
        
        logger.info(f"Found {len(self.libraries)} dependencies and {len(frameworks)} frameworks")
        return tech_stack 
   
    def _parse_requirements_txt(self):
        """Parse requirements.txt file."""
        req_file = self.project_path / "requirements.txt"
        if not req_file.exists():
            return
        
        logger.info("Parsing requirements.txt")
        self.package_manager = "pip"
        
        try:
            with open(req_file, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    
                    # Skip empty lines and comments
                    if not line or line.startswith('#'):
                        continue
                    
                    # Skip -r, -e, and other pip options
                    if line.startswith('-'):
                        continue
                    
                    library = self._parse_requirement_line(line, "requirements.txt")
                    if library:
                        self.libraries.append(library)
                        
        except Exception as e:
            logger.error(f"Failed to parse requirements.txt: {e}")
    
    def _parse_requirement_line(self, line: str, source: str) -> Optional[Library]:
        """Parse a single requirement line.
        
        Args:
            line: Requirement line to parse
            source: Source file name
            
        Returns:
            Library object or None if parsing fails
        """
        # Handle extras like requests[security]
        extras_match = re.match(r'^([a-zA-Z0-9_-]+)\[([^\]]+)\](.*)$', line)
        if extras_match:
            name = extras_match.group(1)
            extras = [e.strip() for e in extras_match.group(2).split(',')]
            version_part = extras_match.group(3)
        else:
            # Regular package name
            name_match = re.match(r'^([a-zA-Z0-9_-]+)(.*)$', line)
            if not name_match:
                return None
            name = name_match.group(1)
            extras = []
            version_part = name_match.group(2)
        
        # Extract version specifier
        version = None
        if version_part:
            # Handle various version specifiers: ==, >=, >, <, <=, !=, ~=
            version_match = re.search(r'([><=!~]+)([0-9][0-9a-zA-Z\.\-]*)', version_part)
            if version_match:
                version = version_match.group(0)
        
        return Library(
            name=name.lower(),
            version=version,
            source=source,
            extras=extras
        )
    
    def _parse_pyproject_toml(self):
        """Parse pyproject.toml file."""
        toml_file = self.project_path / "pyproject.toml"
        if not toml_file.exists():
            return
        
        logger.info("Parsing pyproject.toml")
        
        try:
            # Try to import tomllib (Python 3.11+) or tomli
            try:
                import tomllib
                with open(toml_file, 'rb') as f:
                    data = tomllib.load(f)
            except ImportError:
                try:
                    import tomli
                    with open(toml_file, 'rb') as f:
                        data = tomli.load(f)
                except ImportError:
                    # Fallback to basic parsing
                    logger.warning("TOML library not available, using basic parsing")
                    self._parse_pyproject_basic(toml_file)
                    return
            
            # Detect package manager
            if 'tool' in data and 'poetry' in data['tool']:
                self.package_manager = "poetry"
                self._parse_poetry_dependencies(data)
            elif 'project' in data:
                self.package_manager = "pip"
                self._parse_pep621_dependencies(data)
                
        except Exception as e:
            logger.error(f"Failed to parse pyproject.toml: {e}")
    
    def _parse_poetry_dependencies(self, data: Dict[str, Any]):
        """Parse Poetry dependencies from pyproject.toml."""
        poetry_data = data.get('tool', {}).get('poetry', {})
        
        # Get Python version requirement
        dependencies = poetry_data.get('dependencies', {})
        if 'python' in dependencies:
            self.python_version = str(dependencies['python'])
        
        # Parse regular dependencies
        for name, spec in dependencies.items():
            if name == 'python':
                continue
            
            library = self._parse_poetry_dependency(name, spec, "pyproject.toml")
            if library:
                self.libraries.append(library)
        
        # Parse dev dependencies
        dev_deps = poetry_data.get('group', {}).get('dev', {}).get('dependencies', {})
        for name, spec in dev_deps.items():
            library = self._parse_poetry_dependency(name, spec, "pyproject.toml")
            if library:
                self.libraries.append(library)
    
    def _parse_poetry_dependency(self, name: str, spec: Union[str, Dict], source: str) -> Optional[Library]:
        """Parse a single Poetry dependency specification."""
        if isinstance(spec, str):
            # Simple version string
            return Library(
                name=name.lower(),
                version=spec if spec != "*" else None,
                source=source
            )
        elif isinstance(spec, dict):
            # Complex dependency specification
            version = spec.get('version')
            extras = spec.get('extras', [])
            
            return Library(
                name=name.lower(),
                version=version if version != "*" else None,
                source=source,
                extras=extras
            )
        
        return None 
   
    def _parse_pep621_dependencies(self, data: Dict[str, Any]):
        """Parse PEP 621 dependencies from pyproject.toml."""
        project_data = data.get('project', {})
        
        # Get Python version requirement
        if 'requires-python' in project_data:
            self.python_version = project_data['requires-python']
        
        # Parse dependencies
        dependencies = project_data.get('dependencies', [])
        for dep in dependencies:
            library = self._parse_requirement_line(dep, "pyproject.toml")
            if library:
                self.libraries.append(library)
        
        # Parse optional dependencies
        optional_deps = project_data.get('optional-dependencies', {})
        for group_name, deps in optional_deps.items():
            for dep in deps:
                library = self._parse_requirement_line(dep, "pyproject.toml")
                if library:
                    self.libraries.append(library)
    
    def _parse_pyproject_basic(self, toml_file: Path):
        """Basic pyproject.toml parsing without TOML library."""
        try:
            with open(toml_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Look for Poetry dependencies section
            if '[tool.poetry.dependencies]' in content:
                self.package_manager = "poetry"
                self._parse_basic_toml_section(content, '[tool.poetry.dependencies]')
            
            # Look for PEP 621 dependencies
            if 'dependencies = [' in content:
                self.package_manager = "pip"
                self._parse_basic_dependencies_array(content)
                
        except Exception as e:
            logger.error(f"Failed basic pyproject.toml parsing: {e}")
    
    def _parse_basic_toml_section(self, content: str, section: str):
        """Basic parsing of TOML section."""
        lines = content.split('\n')
        in_section = False
        
        for line in lines:
            line = line.strip()
            
            if line == section:
                in_section = True
                continue
            
            if in_section:
                if line.startswith('[') and line != section:
                    break
                
                if '=' in line and not line.startswith('#'):
                    parts = line.split('=', 1)
                    if len(parts) == 2:
                        name = parts[0].strip().strip('"\'')
                        version = parts[1].strip().strip('"\'')
                        
                        if name != 'python':
                            library = Library(
                                name=name.lower(),
                                version=version if version != "*" else None,
                                source="pyproject.toml"
                            )
                            self.libraries.append(library)
    
    def _parse_basic_dependencies_array(self, content: str):
        """Basic parsing of dependencies array."""
        # Find dependencies array
        start_idx = content.find('dependencies = [')
        if start_idx == -1:
            return
        
        # Find the closing bracket
        bracket_count = 0
        in_array = False
        current_dep = ""
        
        for i, char in enumerate(content[start_idx:], start_idx):
            if char == '[':
                bracket_count += 1
                in_array = True
            elif char == ']':
                bracket_count -= 1
                if bracket_count == 0:
                    break
            elif in_array and bracket_count > 0:
                if char == '"' or char == "'":
                    # Handle quoted strings
                    quote_char = char
                    dep_start = i + 1
                    dep_end = content.find(quote_char, dep_start)
                    if dep_end != -1:
                        dep = content[dep_start:dep_end]
                        library = self._parse_requirement_line(dep, "pyproject.toml")
                        if library:
                            self.libraries.append(library)
    
    def _parse_pipfile(self):
        """Parse Pipfile."""
        pipfile = self.project_path / "Pipfile"
        if not pipfile.exists():
            return
        
        logger.info("Parsing Pipfile")
        self.package_manager = "pipenv"
        
        try:
            # Try to import toml library for Pipfile parsing
            try:
                import tomllib
                with open(pipfile, 'rb') as f:
                    data = tomllib.load(f)
            except ImportError:
                try:
                    import tomli
                    with open(pipfile, 'rb') as f:
                        data = tomli.load(f)
                except ImportError:
                    logger.warning("TOML library not available for Pipfile parsing")
                    return
            
            # Get Python version
            if 'requires' in data and 'python_version' in data['requires']:
                self.python_version = data['requires']['python_version']
            
            # Parse packages
            packages = data.get('packages', {})
            for name, spec in packages.items():
                library = self._parse_pipfile_dependency(name, spec, "Pipfile")
                if library:
                    self.libraries.append(library)
            
            # Parse dev packages
            dev_packages = data.get('dev-packages', {})
            for name, spec in dev_packages.items():
                library = self._parse_pipfile_dependency(name, spec, "Pipfile")
                if library:
                    self.libraries.append(library)
                    
        except Exception as e:
            logger.error(f"Failed to parse Pipfile: {e}")
    
    def _parse_pipfile_dependency(self, name: str, spec: Union[str, Dict], source: str) -> Optional[Library]:
        """Parse a single Pipfile dependency specification."""
        if isinstance(spec, str):
            return Library(
                name=name.lower(),
                version=spec if spec != "*" else None,
                source=source
            )
        elif isinstance(spec, dict):
            version = spec.get('version')
            extras = spec.get('extras', [])
            
            return Library(
                name=name.lower(),
                version=version if version != "*" else None,
                source=source,
                extras=extras
            )
        
        return None
    
    def _detect_frameworks(self) -> List[str]:
        """Detect frameworks from the list of libraries.
        
        Returns:
            List of detected framework names
        """
        frameworks = []
        framework_indicators = {
            'django': ['django'],
            'flask': ['flask'],
            'fastapi': ['fastapi'],
            'tornado': ['tornado'],
            'pyramid': ['pyramid'],
            'bottle': ['bottle'],
            'cherrypy': ['cherrypy'],
            'falcon': ['falcon'],
            'sanic': ['sanic'],
            'quart': ['quart'],
            'starlette': ['starlette'],
            'aiohttp': ['aiohttp']
        }
        
        library_names = {lib.name.lower() for lib in self.libraries}
        
        for framework, indicators in framework_indicators.items():
            if any(indicator in library_names for indicator in indicators):
                frameworks.append(framework)
        
        return frameworks