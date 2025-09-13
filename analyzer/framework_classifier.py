"""
Framework vs Library Classification System

This module provides intelligent classification of technologies into frameworks vs libraries
based on their role in the technology stack. Primary frameworks are architectural choices
that define the structure of an application, while supporting tools and libraries provide
additional functionality.
"""

from typing import Dict, List, Set, Optional
import re
from tech_stack_types import SubcategoryType


class FrameworkClassifier:
    """
    Classifies technologies as frameworks or libraries based on their role and patterns.
    
    Primary frameworks are core architectural choices that define application structure.
    Supporting tools and libraries provide additional functionality but are not the main framework.
    """
    
    # Primary frameworks that define application architecture
    PRIMARY_FRAMEWORKS = {
        'backend': {
            # Python web frameworks
            'django', 'flask', 'fastapi', 'tornado', 'pyramid', 'bottle', 'sanic',
            'starlette', 'quart', 'falcon', 'hug', 'cherrypy',
            
            # Node.js frameworks
            'express', 'koa', 'hapi', 'nestjs', 'meteor',
            
            # Other backend frameworks
            'spring', 'spring-boot',  # Java
            'laravel', 'symfony', 'codeigniter',  # PHP
            'rails', 'sinatra',  # Ruby
            'gin', 'echo', 'fiber',  # Go
            'actix-web', 'rocket', 'warp',  # Rust
        },
        'frontend': {
            # JavaScript/TypeScript frameworks
            'react', 'vue', 'angular', 'svelte', 'ember', 'backbone',
            'knockout', 'mithril', 'preact', 'lit', 'solid',
            
            # Meta-frameworks
            'next.js', 'nextjs', 'nuxt', 'nuxtjs', 'gatsby', 'gridsome',
            'sveltekit', 'remix', 'astro', 'qwik',
            
            # Mobile frameworks
            'react-native', 'ionic', 'cordova', 'phonegap',
            
            # Desktop frameworks
            'electron', 'tauri', 'nwjs',
        }
    }
    
    # Supporting tools that enhance or work with frameworks
    SUPPORTING_TOOLS = {
        'servers': {
            # Python servers
            'gunicorn', 'uwsgi', 'waitress', 'hypercorn', 'uvicorn', 'daphne',
            'mod_wsgi', 'gevent', 'eventlet',
            
            # Web servers
            'nginx', 'apache', 'apache2', 'httpd', 'lighttpd', 'caddy',
            
            # Node.js servers
            'pm2', 'forever', 'nodemon',
        },
        'task_queues': {
            'celery', 'rq', 'dramatiq', 'huey', 'arq', 'taskiq',
            'bull', 'bee-queue', 'agenda',  # Node.js
        },
        'build_tools': {
            # Frontend build tools
            'webpack', 'rollup', 'parcel', 'vite', 'esbuild', 'snowpack',
            'gulp', 'grunt', 'brunch', 'browserify', 'turbopack',
            
            # Transpilers and compilers
            'babel', 'typescript', 'tsc', 'swc', 'sucrase',
            
            # CSS processors
            'sass', 'scss', 'less', 'stylus', 'postcss',
        },
        'testing': {
            # Python testing
            'pytest', 'unittest', 'nose', 'nose2', 'testify', 'hypothesis',
            'mock', 'factory-boy', 'faker',
            
            # JavaScript testing
            'jest', 'mocha', 'jasmine', 'karma', 'ava', 'tape', 'qunit',
            'cypress', 'playwright', 'puppeteer', 'selenium', 'webdriver',
            'enzyme', 'testing-library', 'sinon',
        },
        'linting': {
            # Python linting
            'flake8', 'pylint', 'pycodestyle', 'pep8', 'autopep8', 'yapf',
            'black', 'isort', 'mypy', 'bandit', 'prospector',
            
            # JavaScript linting
            'eslint', 'jshint', 'jslint', 'tslint', 'prettier', 'standard',
            'xo', 'semistandard',
        },
        'orm_database': {
            # Python ORMs and database tools
            'sqlalchemy', 'django-orm', 'peewee', 'tortoise-orm', 'databases',
            'alembic', 'migrate', 'south',
            
            # JavaScript ORMs
            'sequelize', 'typeorm', 'prisma', 'mongoose', 'bookshelf',
            'objection', 'knex',
        },
        'api_tools': {
            # API development tools
            'django-rest-framework', 'drf', 'flask-restful', 'flask-api',
            'marshmallow', 'pydantic', 'cerberus', 'voluptuous',
            'graphene', 'strawberry', 'ariadne',  # GraphQL
            
            # Documentation
            'swagger', 'openapi', 'redoc', 'sphinx', 'mkdocs',
        },
        'authentication': {
            'django-allauth', 'flask-login', 'flask-security', 'authlib',
            'passport', 'auth0', 'firebase-auth', 'okta',
        },
        'caching': {
            'redis-py', 'memcached', 'django-cache', 'flask-caching',
            'node-cache', 'memory-cache',
        }
    }
    
    # Patterns that indicate supporting tools
    SUPPORTING_PATTERNS = {
        'server_patterns': [
            r'.*server.*', r'.*wsgi.*', r'.*asgi.*', r'.*gateway.*',
            r'.*proxy.*', r'.*load.*balancer.*'
        ],
        'build_patterns': [
            r'.*build.*', r'.*bundle.*', r'.*compile.*', r'.*transpile.*',
            r'.*minif.*', r'.*uglif.*', r'.*optimize.*'
        ],
        'test_patterns': [
            r'.*test.*', r'.*spec.*', r'.*mock.*', r'.*stub.*',
            r'.*fixture.*', r'.*coverage.*'
        ],
        'lint_patterns': [
            r'.*lint.*', r'.*format.*', r'.*style.*', r'.*check.*',
            r'.*pretty.*', r'.*beautif.*'
        ],
        'plugin_patterns': [
            r'.*plugin.*', r'.*extension.*', r'.*addon.*', r'.*middleware.*',
            r'.*helper.*', r'.*util.*', r'.*tool.*'
        ]
    }
    
    def __init__(self):
        """Initialize the framework classifier with compiled regex patterns."""
        self._compiled_patterns = {}
        for category, patterns in self.SUPPORTING_PATTERNS.items():
            self._compiled_patterns[category] = [
                re.compile(pattern, re.IGNORECASE) for pattern in patterns
            ]
    
    def classify_framework_or_library(self, tech_name: str, main_category: str) -> SubcategoryType:
        """
        Determine if a technology should be classified as a framework or library.
        
        Args:
            tech_name: Name of the technology to classify
            main_category: Main category (backend, frontend, etc.)
            
        Returns:
            SubcategoryType.FRAMEWORKS or SubcategoryType.LIBRARIES
        """
        tech_lower = tech_name.lower().strip()
        
        # Remove common prefixes/suffixes for better matching
        normalized_name = self._normalize_tech_name(tech_lower)
        
        # Check if it's a primary framework
        if self._is_primary_framework(normalized_name, main_category):
            return SubcategoryType.FRAMEWORKS
        
        # Check if it's a known supporting tool
        if self._is_supporting_tool(normalized_name):
            return SubcategoryType.LIBRARIES
        
        # Check patterns that indicate supporting tools
        if self._matches_supporting_patterns(tech_lower):
            return SubcategoryType.LIBRARIES
        
        # Check if it's obviously a tool (overrides heuristics)
        if self._is_obviously_tool(tech_lower):
            return SubcategoryType.LIBRARIES
        
        # Special cases based on main category
        if main_category in ['backend', 'frontend']:
            # For backend/frontend, be more conservative - default to libraries
            # unless we're confident it's a primary framework
            return self._classify_by_category_heuristics(tech_lower, main_category)
        
        # For other categories, default to libraries
        return SubcategoryType.LIBRARIES
    
    def _normalize_tech_name(self, tech_name: str) -> str:
        """
        Normalize technology name for better matching.
        
        Removes common prefixes, suffixes, and variations.
        """
        # Remove common prefixes
        prefixes_to_remove = ['python-', 'py-', 'js-', 'node-', 'npm-', '@']
        for prefix in prefixes_to_remove:
            if tech_name.startswith(prefix):
                tech_name = tech_name[len(prefix):]
        
        # Remove common suffixes
        suffixes_to_remove = ['.js', '.py', '-js', '-python', '-py']
        for suffix in suffixes_to_remove:
            if tech_name.endswith(suffix):
                tech_name = tech_name[:-len(suffix)]
        
        # Handle special cases
        replacements = {
            'nextjs': 'next.js',
            'nuxtjs': 'nuxt',
            'django-rest-framework': 'drf',
            'react-native': 'react-native',  # Keep as-is
        }
        
        return replacements.get(tech_name, tech_name)
    
    def _is_primary_framework(self, tech_name: str, main_category: str) -> bool:
        """Check if technology is a primary framework for the given category."""
        if main_category not in self.PRIMARY_FRAMEWORKS:
            return False
        
        frameworks = self.PRIMARY_FRAMEWORKS[main_category]
        
        # Direct match only - no partial matches to avoid false positives
        if tech_name in frameworks:
            return True
        
        # Special handling for known variations
        framework_variations = {
            'nextjs': 'next.js',
            'nuxtjs': 'nuxt',
            'react-native': 'react-native'
        }
        
        if tech_name in framework_variations:
            return framework_variations[tech_name] in frameworks
        
        return False
    
    def _is_supporting_tool(self, tech_name: str) -> bool:
        """Check if technology is a known supporting tool."""
        for tool_category in self.SUPPORTING_TOOLS.values():
            # Direct match
            if tech_name in tool_category:
                return True
        
        # Check for specific Django/Flask extensions
        django_extensions = [
            'django-rest-framework', 'django-allauth', 'django-cors-headers',
            'django-extensions', 'django-debug-toolbar', 'django-crispy-forms',
            'django-filter', 'django-storages', 'django-environ', 'django-redis',
            'django-celery-beat', 'django-celery-results', 'django-channels',
            'djangorestframework', 'djangorestframework-gis', 'djangorestframework-simplejwt'
        ]
        
        flask_extensions = [
            'flask-restful', 'flask-sqlalchemy', 'flask-login', 'flask-wtf',
            'flask-migrate', 'flask-mail', 'flask-cors', 'flask-jwt-extended',
            'flask-admin', 'flask-security', 'flask-caching'
        ]
        
        # Check if it's a Django or Flask extension
        if any(ext in tech_name.lower() for ext in django_extensions + flask_extensions):
            return True
        
        return False
    
    def _matches_supporting_patterns(self, tech_name: str) -> bool:
        """Check if technology name matches patterns indicating supporting tools."""
        for category, patterns in self._compiled_patterns.items():
            for pattern in patterns:
                if pattern.search(tech_name):
                    return True
        return False
    
    def _classify_by_category_heuristics(self, tech_name: str, main_category: str) -> SubcategoryType:
        """
        Apply category-specific heuristics for classification.
        
        This is used when we can't definitively classify based on known lists.
        """
        # Don't apply heuristics to very short names (likely abbreviations)
        if len(tech_name) <= 2:
            return SubcategoryType.LIBRARIES
        
        if main_category == 'backend':
            # Backend heuristics - need multiple indicators or specific patterns
            backend_framework_indicators = [
                'framework', 'web', 'api', 'server', 'app', 'micro'
            ]
            
            # Require either 'framework' in name or multiple indicators
            has_framework = 'framework' in tech_name
            indicator_count = sum(1 for indicator in backend_framework_indicators if indicator in tech_name)
            
            if (has_framework or indicator_count >= 2) and not self._is_obviously_tool(tech_name):
                return SubcategoryType.FRAMEWORKS
        
        elif main_category == 'frontend':
            # Frontend heuristics - be more restrictive
            frontend_framework_indicators = [
                'ui', 'component', 'view', 'render', 'dom', 'spa'
            ]
            
            # Require 'framework' in name or multiple indicators for frontend
            has_framework = 'framework' in tech_name
            indicator_count = sum(1 for indicator in frontend_framework_indicators if indicator in tech_name)
            
            if (has_framework or indicator_count >= 2) and not self._is_obviously_tool(tech_name):
                return SubcategoryType.FRAMEWORKS
        
        # Default to libraries for safety
        return SubcategoryType.LIBRARIES
    
    def _is_obviously_tool(self, tech_name: str) -> bool:
        """Check if technology name obviously indicates a tool rather than framework."""
        tool_indicators = [
            'tool', 'util', 'helper', 'plugin', 'extension', 'addon',
            'cli', 'command', 'script', 'generator', 'builder',
            'compiler', 'transpiler', 'bundler', 'minifier',
            'linter', 'formatter', 'checker', 'validator',
            'test', 'mock', 'stub', 'coverage', 'benchmark'
        ]
        
        return any(indicator in tech_name for indicator in tool_indicators)
    
    def get_framework_type_metadata(self, tech_name: str, classification: SubcategoryType) -> str:
        """
        Get framework_type metadata for a technology.
        
        Returns:
            'primary', 'supporting', 'server', 'library', etc.
        """
        tech_lower = tech_name.lower().strip()
        normalized_name = self._normalize_tech_name(tech_lower)
        
        if classification == SubcategoryType.FRAMEWORKS:
            return 'primary'
        
        # Determine specific type of supporting tool
        for tool_type, tools in self.SUPPORTING_TOOLS.items():
            if normalized_name in tools or any(tool in tech_lower for tool in tools):
                return tool_type.replace('_', '-')  # Convert to kebab-case
        
        # Check patterns
        if any(pattern.search(tech_lower) for pattern in self._compiled_patterns.get('server_patterns', [])):
            return 'server'
        elif any(pattern.search(tech_lower) for pattern in self._compiled_patterns.get('build_patterns', [])):
            return 'build-tool'
        elif any(pattern.search(tech_lower) for pattern in self._compiled_patterns.get('test_patterns', [])):
            return 'testing'
        elif any(pattern.search(tech_lower) for pattern in self._compiled_patterns.get('lint_patterns', [])):
            return 'linting'
        
        return 'library'
    
    def get_classification_confidence(self, tech_name: str, main_category: str, 
                                   classification: SubcategoryType) -> float:
        """
        Get confidence score for the classification.
        
        Returns:
            Float between 0.0 and 1.0 indicating classification confidence
        """
        tech_lower = tech_name.lower().strip()
        normalized_name = self._normalize_tech_name(tech_lower)
        
        # High confidence for exact matches
        if classification == SubcategoryType.FRAMEWORKS:
            if main_category in self.PRIMARY_FRAMEWORKS:
                if normalized_name in self.PRIMARY_FRAMEWORKS[main_category]:
                    return 1.0
        
        if classification == SubcategoryType.LIBRARIES:
            for tools in self.SUPPORTING_TOOLS.values():
                if normalized_name in tools:
                    return 0.95
        
        # Medium confidence for pattern matches
        if self._matches_supporting_patterns(tech_lower):
            return 0.8
        
        # Lower confidence for heuristic-based classification
        return 0.6


# Convenience function for external use
def classify_technology_type(tech_name: str, main_category: str) -> tuple[SubcategoryType, str, float]:
    """
    Classify a technology as framework or library with metadata.
    
    Args:
        tech_name: Name of the technology
        main_category: Main category (backend, frontend, etc.)
        
    Returns:
        Tuple of (classification, framework_type, confidence)
    """
    classifier = FrameworkClassifier()
    classification = classifier.classify_framework_or_library(tech_name, main_category)
    framework_type = classifier.get_framework_type_metadata(tech_name, classification)
    confidence = classifier.get_classification_confidence(tech_name, main_category, classification)
    
    return classification, framework_type, confidence