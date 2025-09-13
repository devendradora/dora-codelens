"""
Edge case tests for framework classifier to ensure robust classification.
"""

from framework_classifier import FrameworkClassifier, classify_technology_type
from tech_stack_types import SubcategoryType


def test_case_insensitive_classification():
    """Test that classification works regardless of case"""
    classifier = FrameworkClassifier()
    
    test_cases = [
        ('DJANGO', 'django'),
        ('React', 'react'),
        ('FLASK', 'flask'),
        ('VUE', 'vue'),
        ('GUNICORN', 'gunicorn'),
        ('WEBPACK', 'webpack')
    ]
    
    for upper_case, lower_case in test_cases:
        upper_result = classifier.classify_framework_or_library(upper_case, 'backend' if 'django' in lower_case or 'flask' in lower_case or 'gunicorn' in lower_case else 'frontend')
        lower_result = classifier.classify_framework_or_library(lower_case, 'backend' if 'django' in lower_case or 'flask' in lower_case or 'gunicorn' in lower_case else 'frontend')
        
        assert upper_result == lower_result, f"Case sensitivity issue: {upper_case} vs {lower_case}"
    
    print("✓ Case insensitive classification test passed")


def test_name_variations_and_aliases():
    """Test handling of common name variations and aliases"""
    classifier = FrameworkClassifier()
    
    # Test Next.js variations
    nextjs_variations = ['next.js', 'nextjs', 'next']
    for variation in nextjs_variations:
        result = classifier.classify_framework_or_library(variation, 'frontend')
        assert result == SubcategoryType.FRAMEWORKS, f"{variation} should be classified as framework"
    
    # Test Nuxt variations
    nuxt_variations = ['nuxt', 'nuxtjs', 'nuxt.js']
    for variation in nuxt_variations:
        result = classifier.classify_framework_or_library(variation, 'frontend')
        assert result == SubcategoryType.FRAMEWORKS, f"{variation} should be classified as framework"
    
    # Test DRF variations
    drf_variations = ['django-rest-framework', 'drf']
    for variation in drf_variations:
        result = classifier.classify_framework_or_library(variation, 'backend')
        assert result == SubcategoryType.LIBRARIES, f"{variation} should be classified as library"
    
    print("✓ Name variations and aliases test passed")


def test_prefix_suffix_handling():
    """Test handling of common prefixes and suffixes"""
    classifier = FrameworkClassifier()
    
    test_cases = [
        ('python-django', 'backend', SubcategoryType.FRAMEWORKS),
        ('js-react', 'frontend', SubcategoryType.FRAMEWORKS),
        ('react.js', 'frontend', SubcategoryType.FRAMEWORKS),
        ('vue-js', 'frontend', SubcategoryType.FRAMEWORKS),
        ('@angular/core', 'frontend', SubcategoryType.FRAMEWORKS),
        ('node-express', 'backend', SubcategoryType.FRAMEWORKS)
    ]
    
    for tech_name, category, expected in test_cases:
        result = classifier.classify_framework_or_library(tech_name, category)
        assert result == expected, f"{tech_name} classification failed"
    
    print("✓ Prefix/suffix handling test passed")


def test_pattern_based_classification():
    """Test pattern-based classification for unknown technologies"""
    classifier = FrameworkClassifier()
    
    # Technologies that should be classified as libraries based on patterns
    library_patterns = [
        ('my-test-framework', 'backend'),  # Contains 'test'
        ('custom-build-tool', 'frontend'),  # Contains 'build' and 'tool'
        ('lint-checker-pro', 'frontend'),   # Contains 'lint'
        ('server-manager', 'backend'),      # Contains 'server'
        ('mock-helper', 'backend'),         # Contains 'mock'
        ('format-utility', 'frontend')      # Contains 'format'
    ]
    
    for tech_name, category in library_patterns:
        result = classifier.classify_framework_or_library(tech_name, category)
        assert result == SubcategoryType.LIBRARIES, f"{tech_name} should be classified as library based on patterns"
    
    print("✓ Pattern-based classification test passed")


def test_ambiguous_cases():
    """Test handling of ambiguous or edge cases"""
    classifier = FrameworkClassifier()
    
    # Very short names - should default to libraries
    short_names = ['js', 'py', 'ui', 'db']
    for name in short_names:
        result = classifier.classify_framework_or_library(name, 'frontend')
        assert result == SubcategoryType.LIBRARIES, f"Short name '{name}' should default to libraries"
    
    # Empty or whitespace
    edge_cases = ['', '   ', '\t', '\n']
    for case in edge_cases:
        result = classifier.classify_framework_or_library(case, 'backend')
        assert result == SubcategoryType.LIBRARIES, f"Edge case '{repr(case)}' should default to libraries"
    
    # Numbers and special characters
    special_cases = ['123', 'tech-v2.0', 'framework@latest', 'lib_new']
    for case in special_cases:
        result = classifier.classify_framework_or_library(case, 'frontend')
        # Should not crash and should return a valid result
        assert result in [SubcategoryType.FRAMEWORKS, SubcategoryType.LIBRARIES], f"Special case '{case}' should return valid result"
    
    print("✓ Ambiguous cases test passed")


def test_confidence_score_ranges():
    """Test that confidence scores are within expected ranges"""
    classifier = FrameworkClassifier()
    
    test_cases = [
        # (tech_name, category, classification, min_confidence, max_confidence)
        ('django', 'backend', SubcategoryType.FRAMEWORKS, 1.0, 1.0),  # Exact match
        ('gunicorn', 'backend', SubcategoryType.LIBRARIES, 0.95, 0.95),  # Known supporting tool
        ('my-test-tool', 'backend', SubcategoryType.LIBRARIES, 0.7, 0.9),  # Pattern match
        ('unknown-thing', 'backend', SubcategoryType.LIBRARIES, 0.5, 0.7),  # Heuristic
    ]
    
    for tech_name, category, classification, min_conf, max_conf in test_cases:
        confidence = classifier.get_classification_confidence(tech_name, category, classification)
        assert min_conf <= confidence <= max_conf, f"{tech_name} confidence {confidence} not in range [{min_conf}, {max_conf}]"
        assert 0.0 <= confidence <= 1.0, f"{tech_name} confidence {confidence} not in valid range [0.0, 1.0]"
    
    print("✓ Confidence score ranges test passed")


def test_framework_type_metadata_values():
    """Test that framework_type metadata values are consistent and valid"""
    classifier = FrameworkClassifier()
    
    # Valid framework types
    valid_types = {
        'primary', 'servers', 'task-queues', 'build-tools', 'testing', 
        'linting', 'orm-database', 'api-tools', 'authentication', 
        'caching', 'library'
    }
    
    test_technologies = [
        'django', 'flask', 'react', 'vue',  # Primary frameworks
        'gunicorn', 'uwsgi', 'nginx',       # Servers
        'celery', 'rq',                     # Task queues
        'webpack', 'babel', 'vite',         # Build tools
        'pytest', 'jest', 'cypress',        # Testing
        'eslint', 'black', 'prettier',      # Linting
        'sqlalchemy', 'mongoose',           # ORM/Database
        'unknown-tech'                      # Unknown
    ]
    
    for tech in test_technologies:
        category = 'backend' if tech in ['django', 'flask', 'gunicorn', 'uwsgi', 'celery', 'rq', 'pytest', 'black', 'sqlalchemy'] else 'frontend'
        classification = classifier.classify_framework_or_library(tech, category)
        framework_type = classifier.get_framework_type_metadata(tech, classification)
        
        assert framework_type in valid_types, f"{tech} has invalid framework_type: {framework_type}"
    
    print("✓ Framework type metadata values test passed")


def test_category_specific_behavior():
    """Test that classification behaves correctly for different main categories"""
    classifier = FrameworkClassifier()
    
    # Test that non-backend/frontend categories default to libraries
    other_categories = ['databases', 'devops', 'others']
    
    for category in other_categories:
        result = classifier.classify_framework_or_library('some-tool', category)
        assert result == SubcategoryType.LIBRARIES, f"Category '{category}' should default to libraries"
        
        result = classifier.classify_framework_or_library('framework-like-tool', category)
        assert result == SubcategoryType.LIBRARIES, f"Category '{category}' should default to libraries even for framework-like names"
    
    # Test backend/frontend specific behavior
    backend_result = classifier.classify_framework_or_library('web-framework', 'backend')
    frontend_result = classifier.classify_framework_or_library('ui-framework', 'frontend')
    
    # Both should potentially be classified as frameworks due to heuristics
    assert backend_result == SubcategoryType.FRAMEWORKS, "Backend web-framework should be classified as framework"
    assert frontend_result == SubcategoryType.FRAMEWORKS, "Frontend ui-framework should be classified as framework"
    
    print("✓ Category specific behavior test passed")


def test_performance_with_large_inputs():
    """Test that classifier performs well with large inputs"""
    import time
    
    classifier = FrameworkClassifier()
    
    # Generate a large list of technology names
    technologies = []
    for i in range(1000):
        technologies.extend([
            f'framework-{i}', f'library-{i}', f'tool-{i}', 
            f'test-{i}', f'build-{i}', f'server-{i}'
        ])
    
    start_time = time.time()
    
    for tech in technologies:
        classifier.classify_framework_or_library(tech, 'backend')
    
    end_time = time.time()
    processing_time = end_time - start_time
    
    # Should process 6000 technologies in reasonable time (< 5 seconds)
    assert processing_time < 5.0, f"Performance test failed: took {processing_time:.2f} seconds for 6000 technologies"
    
    print(f"✓ Performance test passed: processed 6000 technologies in {processing_time:.2f} seconds")


if __name__ == '__main__':
    """Run all edge case tests"""
    print("Running framework classifier edge case tests...")
    
    test_case_insensitive_classification()
    test_name_variations_and_aliases()
    test_prefix_suffix_handling()
    test_pattern_based_classification()
    test_ambiguous_cases()
    test_confidence_score_ranges()
    test_framework_type_metadata_values()
    test_category_specific_behavior()
    test_performance_with_large_inputs()
    
    print("\n🎉 All edge case tests passed!")
    print("Framework classifier handles edge cases robustly.")