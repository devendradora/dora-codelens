"""
Unit tests for the FrameworkClassifier class.
Tests framework vs library classification accuracy with edge cases.
"""

import pytest
from framework_classifier import FrameworkClassifier, classify_technology_type
from tech_stack_types import SubcategoryType


class TestFrameworkClassifier:
    """Test suite for FrameworkClassifier"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.classifier = FrameworkClassifier()
    
    def test_primary_backend_frameworks(self):
        """Test classification of primary backend frameworks"""
        backend_frameworks = [
            'django', 'flask', 'fastapi', 'tornado', 'pyramid',
            'express', 'spring', 'laravel', 'rails'
        ]
        
        for framework in backend_frameworks:
            result = self.classifier.classify_framework_or_library(framework, 'backend')
            assert result == SubcategoryType.FRAMEWORKS, f"{framework} should be classified as framework"
            
            # Test framework type metadata
            framework_type = self.classifier.get_framework_type_metadata(framework, result)
            assert framework_type == 'primary', f"{framework} should have 'primary' framework type"
    
    def test_primary_frontend_frameworks(self):
        """Test classification of primary frontend frameworks"""
        frontend_frameworks = [
            'react', 'vue', 'angular', 'svelte', 'ember',
            'next.js', 'nextjs', 'nuxt', 'gatsby'
        ]
        
        for framework in frontend_frameworks:
            result = self.classifier.classify_framework_or_library(framework, 'frontend')
            assert result == SubcategoryType.FRAMEWORKS, f"{framework} should be classified as framework"
            
            framework_type = self.classifier.get_framework_type_metadata(framework, result)
            assert framework_type == 'primary', f"{framework} should have 'primary' framework type"
    
    def test_backend_supporting_tools(self):
        """Test classification of backend supporting tools"""
        supporting_tools = {
            'gunicorn': 'servers',
            'uwsgi': 'servers',
            'celery': 'task-queues',
            'pytest': 'testing',
            'black': 'linting',
            'sqlalchemy': 'orm-database',
            'django-rest-framework': 'api-tools'
        }
        
        for tool, expected_type in supporting_tools.items():
            result = self.classifier.classify_framework_or_library(tool, 'backend')
            assert result == SubcategoryType.LIBRARIES, f"{tool} should be classified as library"
            
            framework_type = self.classifier.get_framework_type_metadata(tool, result)
            assert framework_type == expected_type, f"{tool} should have '{expected_type}' framework type"
    
    def test_frontend_supporting_tools(self):
        """Test classification of frontend supporting tools"""
        supporting_tools = {
            'webpack': 'build-tools',
            'babel': 'build-tools',
            'eslint': 'linting',
            'prettier': 'linting',
            'jest': 'testing',
            'cypress': 'testing'
        }
        
        for tool, expected_type in supporting_tools.items():
            result = self.classifier.classify_framework_or_library(tool, 'frontend')
            assert result == SubcategoryType.LIBRARIES, f"{tool} should be classified as library"
            
            framework_type = self.classifier.get_framework_type_metadata(tool, result)
            assert framework_type == expected_type, f"{tool} should have '{expected_type}' framework type"
    
    def test_name_normalization(self):
        """Test technology name normalization"""
        test_cases = [
            ('python-django', 'django'),
            ('js-react', 'react'),
            ('nextjs', 'next.js'),
            ('nuxtjs', 'nuxt'),
            ('django-rest-framework', 'drf'),
            ('@angular/core', 'angular/core'),
            ('react.js', 'react'),
            ('vue-js', 'vue')
        ]
        
        for input_name, expected_normalized in test_cases:
            normalized = self.classifier._normalize_tech_name(input_name)
            assert normalized == expected_normalized, f"'{input_name}' should normalize to '{expected_normalized}'"
    
    def test_pattern_matching(self):
        """Test pattern-based classification"""
        test_cases = [
            ('my-custom-server', True),  # server pattern
            ('build-tool-custom', True),  # build pattern
            ('test-helper', True),       # test pattern
            ('lint-checker', True),      # lint pattern
            ('my-framework', False),     # should not match supporting patterns
            ('custom-ui-lib', False)     # should not match supporting patterns
        ]
        
        for tech_name, should_match_patterns in test_cases:
            matches = self.classifier._matches_supporting_patterns(tech_name)
            assert matches == should_match_patterns, f"'{tech_name}' pattern matching failed"
    
    def test_edge_cases(self):
        """Test edge cases and boundary conditions"""
        # Very short names
        result = self.classifier.classify_framework_or_library('js', 'frontend')
        assert result == SubcategoryType.LIBRARIES  # Default to libraries for ambiguous cases
        
        # Empty string
        result = self.classifier.classify_framework_or_library('', 'backend')
        assert result == SubcategoryType.LIBRARIES
        
        # Unknown technology
        result = self.classifier.classify_framework_or_library('unknown-tech-xyz', 'backend')
        assert result == SubcategoryType.LIBRARIES
        
        # Case insensitive matching
        result = self.classifier.classify_framework_or_library('DJANGO', 'backend')
        assert result == SubcategoryType.FRAMEWORKS
        
        result = self.classifier.classify_framework_or_library('React', 'frontend')
        assert result == SubcategoryType.FRAMEWORKS
    
    def test_category_specific_heuristics(self):
        """Test category-specific classification heuristics"""
        # Backend heuristics
        backend_cases = [
            ('my-web-framework', SubcategoryType.FRAMEWORKS),  # Contains 'framework' and 'web'
            ('api-server-tool', SubcategoryType.LIBRARIES),    # Contains 'tool'
            ('micro-service', SubcategoryType.FRAMEWORKS),     # Contains 'micro'
            ('helper-utility', SubcategoryType.LIBRARIES)      # Contains 'helper'
        ]
        
        for tech_name, expected in backend_cases:
            result = self.classifier.classify_framework_or_library(tech_name, 'backend')
            assert result == expected, f"Backend heuristic failed for '{tech_name}'"
        
        # Frontend heuristics
        frontend_cases = [
            ('ui-component-lib', SubcategoryType.FRAMEWORKS),  # Contains 'ui' and 'component'
            ('build-tool', SubcategoryType.LIBRARIES),         # Contains 'tool'
            ('render-engine', SubcategoryType.FRAMEWORKS),     # Contains 'render'
            ('cli-generator', SubcategoryType.LIBRARIES)       # Contains 'cli'
        ]
        
        for tech_name, expected in frontend_cases:
            result = self.classifier.classify_framework_or_library(tech_name, 'frontend')
            assert result == expected, f"Frontend heuristic failed for '{tech_name}'"
    
    def test_confidence_scores(self):
        """Test confidence score calculation"""
        # High confidence for exact matches
        confidence = self.classifier.get_classification_confidence(
            'django', 'backend', SubcategoryType.FRAMEWORKS
        )
        assert confidence == 1.0, "Exact framework match should have confidence 1.0"
        
        confidence = self.classifier.get_classification_confidence(
            'gunicorn', 'backend', SubcategoryType.LIBRARIES
        )
        assert confidence == 0.95, "Exact supporting tool match should have confidence 0.95"
        
        # Medium confidence for pattern matches
        confidence = self.classifier.get_classification_confidence(
            'my-test-tool', 'backend', SubcategoryType.LIBRARIES
        )
        assert confidence == 0.8, "Pattern match should have confidence 0.8"
        
        # Lower confidence for heuristic matches
        confidence = self.classifier.get_classification_confidence(
            'unknown-framework', 'backend', SubcategoryType.FRAMEWORKS
        )
        assert confidence == 0.6, "Heuristic match should have confidence 0.6"
    
    def test_framework_variations(self):
        """Test handling of framework name variations"""
        variations = [
            ('next.js', 'nextjs', 'next'),
            ('nuxt.js', 'nuxtjs', 'nuxt'),
            ('django-rest-framework', 'drf'),
            ('react-native', 'reactnative')
        ]
        
        for variation_group in variations:
            results = []
            for variation in variation_group:
                if 'react' in variation:
                    category = 'frontend'
                else:
                    category = 'backend' if any(x in variation for x in ['django', 'drf']) else 'frontend'
                
                result = self.classifier.classify_framework_or_library(variation, category)
                results.append(result)
            
            # All variations should have the same classification
            assert len(set(results)) == 1, f"Variations {variation_group} should have same classification"
    
    def test_non_backend_frontend_categories(self):
        """Test classification for non-backend/frontend categories"""
        # For databases, devops, others - should default to libraries
        categories = ['databases', 'devops', 'others']
        
        for category in categories:
            result = self.classifier.classify_framework_or_library('some-tool', category)
            assert result == SubcategoryType.LIBRARIES, f"Non-backend/frontend should default to libraries"
    
    def test_convenience_function(self):
        """Test the convenience function classify_technology_type"""
        classification, framework_type, confidence = classify_technology_type('django', 'backend')
        
        assert classification == SubcategoryType.FRAMEWORKS
        assert framework_type == 'primary'
        assert confidence == 1.0
        
        classification, framework_type, confidence = classify_technology_type('pytest', 'backend')
        
        assert classification == SubcategoryType.LIBRARIES
        assert framework_type == 'testing'
        assert confidence == 0.95


class TestFrameworkClassifierIntegration:
    """Integration tests for framework classifier with real-world scenarios"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.classifier = FrameworkClassifier()
    
    def test_django_project_stack(self):
        """Test classification of typical Django project technologies"""
        django_stack = [
            ('django', 'backend', SubcategoryType.FRAMEWORKS, 'primary'),
            ('django-rest-framework', 'backend', SubcategoryType.LIBRARIES, 'api-tools'),
            ('celery', 'backend', SubcategoryType.LIBRARIES, 'task-queues'),
            ('gunicorn', 'backend', SubcategoryType.LIBRARIES, 'servers'),
            ('pytest', 'backend', SubcategoryType.LIBRARIES, 'testing'),
            ('black', 'backend', SubcategoryType.LIBRARIES, 'linting')
        ]
        
        for tech_name, category, expected_subcategory, expected_framework_type in django_stack:
            subcategory = self.classifier.classify_framework_or_library(tech_name, category)
            framework_type = self.classifier.get_framework_type_metadata(tech_name, subcategory)
            
            assert subcategory == expected_subcategory, f"{tech_name} subcategory mismatch"
            assert framework_type == expected_framework_type, f"{tech_name} framework_type mismatch"
    
    def test_react_project_stack(self):
        """Test classification of typical React project technologies"""
        react_stack = [
            ('react', 'frontend', SubcategoryType.FRAMEWORKS, 'primary'),
            ('next.js', 'frontend', SubcategoryType.FRAMEWORKS, 'primary'),
            ('webpack', 'frontend', SubcategoryType.LIBRARIES, 'build-tools'),
            ('babel', 'frontend', SubcategoryType.LIBRARIES, 'build-tools'),
            ('eslint', 'frontend', SubcategoryType.LIBRARIES, 'linting'),
            ('jest', 'frontend', SubcategoryType.LIBRARIES, 'testing'),
            ('cypress', 'frontend', SubcategoryType.LIBRARIES, 'testing')
        ]
        
        for tech_name, category, expected_subcategory, expected_framework_type in react_stack:
            subcategory = self.classifier.classify_framework_or_library(tech_name, category)
            framework_type = self.classifier.get_framework_type_metadata(tech_name, subcategory)
            
            assert subcategory == expected_subcategory, f"{tech_name} subcategory mismatch"
            assert framework_type == expected_framework_type, f"{tech_name} framework_type mismatch"
    
    def test_mixed_stack_classification(self):
        """Test classification of mixed technology stack"""
        mixed_stack = [
            # Backend
            ('fastapi', 'backend', SubcategoryType.FRAMEWORKS),
            ('uvicorn', 'backend', SubcategoryType.LIBRARIES),
            ('sqlalchemy', 'backend', SubcategoryType.LIBRARIES),
            
            # Frontend
            ('vue', 'frontend', SubcategoryType.FRAMEWORKS),
            ('nuxt', 'frontend', SubcategoryType.FRAMEWORKS),
            ('vite', 'frontend', SubcategoryType.LIBRARIES),
            
            # Testing tools
            ('pytest', 'backend', SubcategoryType.LIBRARIES),
            ('playwright', 'frontend', SubcategoryType.LIBRARIES)
        ]
        
        for tech_name, category, expected_subcategory in mixed_stack:
            result = self.classifier.classify_framework_or_library(tech_name, category)
            assert result == expected_subcategory, f"{tech_name} classification failed"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])