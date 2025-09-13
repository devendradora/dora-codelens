"""
Integration tests for framework classifier with the main categorization system.
Tests end-to-end framework vs library classification in real scenarios.
"""

from tech_stack_categorizer import TechStackCategorizer
from tech_stack_types import TechnologyEntry, SubcategoryType
from framework_classifier import FrameworkClassifier


def test_django_project_integration():
    """Test framework classification in a typical Django project"""
    categorizer = TechStackCategorizer()
    
    # Typical Django project technologies
    technologies = [
        TechnologyEntry(name='django', version='4.2.0', source='requirements.txt'),
        TechnologyEntry(name='django-rest-framework', version='3.14.0', source='requirements.txt'),
        TechnologyEntry(name='celery', version='5.2.0', source='requirements.txt'),
        TechnologyEntry(name='gunicorn', version='20.1.0', source='requirements.txt'),
        TechnologyEntry(name='pytest', version='7.0.0', source='requirements.txt'),
        TechnologyEntry(name='black', version='22.0.0', source='requirements.txt'),
        TechnologyEntry(name='postgresql', version='14.0', source='detected'),
    ]
    
    result = categorizer.categorize_technologies(technologies, {})
    
    # Check backend category structure
    backend = result.categories['backend']
    
    # Verify frameworks subcategory
    frameworks = backend.subcategories['frameworks']
    framework_names = [t.name for t in frameworks.technologies]
    assert 'django' in framework_names, "Django should be in frameworks"
    
    # Verify libraries subcategory
    libraries = backend.subcategories['libraries']
    library_names = [t.name for t in libraries.technologies]
    expected_libraries = ['django-rest-framework', 'celery', 'gunicorn', 'pytest', 'black']
    
    for lib in expected_libraries:
        assert lib in library_names, f"{lib} should be in libraries"
    
    # Check framework_type metadata
    django_tech = next(t for t in frameworks.technologies if t.name == 'django')
    assert django_tech.metadata.get('framework_type') == 'primary', "Django should have 'primary' framework_type"
    
    gunicorn_tech = next(t for t in libraries.technologies if t.name == 'gunicorn')
    assert gunicorn_tech.metadata.get('framework_type') == 'servers', "Gunicorn should have 'servers' framework_type"
    
    print("✓ Django project integration test passed")


def test_react_project_integration():
    """Test framework classification in a typical React project"""
    categorizer = TechStackCategorizer()
    
    # Typical React project technologies
    technologies = [
        TechnologyEntry(name='react', version='18.2.0', source='package.json'),
        TechnologyEntry(name='next.js', version='13.0.0', source='package.json'),
        TechnologyEntry(name='webpack', version='5.0.0', source='package.json'),
        TechnologyEntry(name='babel', version='7.0.0', source='package.json'),
        TechnologyEntry(name='eslint', version='8.0.0', source='package.json'),
        TechnologyEntry(name='jest', version='29.0.0', source='package.json'),
        TechnologyEntry(name='cypress', version='12.0.0', source='package.json'),
    ]
    
    result = categorizer.categorize_technologies(technologies, {})
    
    # Check frontend category structure
    frontend = result.categories['frontend']
    
    # Verify frameworks subcategory
    frameworks = frontend.subcategories['frameworks']
    framework_names = [t.name for t in frameworks.technologies]
    expected_frameworks = ['react', 'next.js']
    
    for framework in expected_frameworks:
        assert framework in framework_names, f"{framework} should be in frameworks"
    
    # Verify libraries subcategory
    libraries = frontend.subcategories['libraries']
    library_names = [t.name for t in libraries.technologies]
    expected_libraries = ['webpack', 'babel', 'eslint', 'jest', 'cypress']
    
    for lib in expected_libraries:
        assert lib in library_names, f"{lib} should be in libraries"
    
    # Check framework_type metadata
    react_tech = next(t for t in frameworks.technologies if t.name == 'react')
    assert react_tech.metadata.get('framework_type') == 'primary', "React should have 'primary' framework_type"
    
    webpack_tech = next(t for t in libraries.technologies if t.name == 'webpack')
    assert webpack_tech.metadata.get('framework_type') == 'build-tools', "Webpack should have 'build-tools' framework_type"
    
    print("✓ React project integration test passed")


def test_mixed_stack_integration():
    """Test framework classification in a mixed full-stack project"""
    categorizer = TechStackCategorizer()
    
    # Mixed stack technologies
    technologies = [
        # Backend
        TechnologyEntry(name='fastapi', version='0.95.0', source='requirements.txt'),
        TechnologyEntry(name='uvicorn', version='0.20.0', source='requirements.txt'),
        TechnologyEntry(name='sqlalchemy', version='2.0.0', source='requirements.txt'),
        TechnologyEntry(name='pydantic', version='1.10.0', source='requirements.txt'),
        
        # Frontend
        TechnologyEntry(name='vue', version='3.2.0', source='package.json'),
        TechnologyEntry(name='nuxt', version='3.0.0', source='package.json'),
        TechnologyEntry(name='vite', version='4.0.0', source='package.json'),
        
        # Databases
        TechnologyEntry(name='postgresql', version='14.0', source='detected'),
        TechnologyEntry(name='redis', version='7.0', source='detected'),
        
        # DevOps
        TechnologyEntry(name='docker', version='20.0', source='detected'),
    ]
    
    result = categorizer.categorize_technologies(technologies, {})
    
    # Verify backend classification
    backend = result.categories['backend']
    backend_frameworks = [t.name for t in backend.subcategories['frameworks'].technologies]
    backend_libraries = [t.name for t in backend.subcategories['libraries'].technologies]
    
    assert 'fastapi' in backend_frameworks, "FastAPI should be in backend frameworks"
    assert 'uvicorn' in backend_libraries, "Uvicorn should be in backend libraries"
    assert 'sqlalchemy' in backend_libraries, "SQLAlchemy should be in backend libraries"
    
    # Verify frontend classification
    frontend = result.categories['frontend']
    frontend_frameworks = [t.name for t in frontend.subcategories['frameworks'].technologies]
    frontend_libraries = [t.name for t in frontend.subcategories['libraries'].technologies]
    
    assert 'vue' in frontend_frameworks, "Vue should be in frontend frameworks"
    assert 'nuxt' in frontend_frameworks, "Nuxt should be in frontend frameworks"
    assert 'vite' in frontend_libraries, "Vite should be in frontend libraries"
    
    # Verify other categories are not affected
    databases = result.categories['databases']
    assert len(databases.subcategories['sql-databases'].technologies) > 0, "Should have SQL databases"
    assert len(databases.subcategories['in-memory'].technologies) > 0, "Should have in-memory stores"
    
    devops = result.categories['devops']
    assert len(devops.subcategories['containerization'].technologies) > 0, "Should have containerization tools"
    
    print("✓ Mixed stack integration test passed")


def test_framework_type_metadata_consistency():
    """Test that framework_type metadata is consistently applied"""
    categorizer = TechStackCategorizer()
    
    technologies = [
        TechnologyEntry(name='django', source='requirements.txt'),
        TechnologyEntry(name='flask', source='requirements.txt'),
        TechnologyEntry(name='react', source='package.json'),
        TechnologyEntry(name='angular', source='package.json'),
        TechnologyEntry(name='gunicorn', source='requirements.txt'),
        TechnologyEntry(name='webpack', source='package.json'),
        TechnologyEntry(name='pytest', source='requirements.txt'),
        TechnologyEntry(name='jest', source='package.json'),
    ]
    
    result = categorizer.categorize_technologies(technologies, {})
    
    # Check that all technologies have framework_type metadata
    all_technologies = []
    for category_data in result.categories.values():
        for subcategory_data in category_data.subcategories.values():
            all_technologies.extend(subcategory_data.technologies)
    
    for tech in all_technologies:
        assert 'framework_type' in tech.metadata, f"{tech.name} should have framework_type metadata"
        
        # Verify framework_type values are valid
        framework_type = tech.metadata['framework_type']
        valid_types = [
            'primary', 'servers', 'task-queues', 'build-tools', 'testing', 
            'linting', 'orm-database', 'api-tools', 'authentication', 
            'caching', 'library'
        ]
        assert framework_type in valid_types, f"{tech.name} has invalid framework_type: {framework_type}"
    
    print("✓ Framework type metadata consistency test passed")


def test_confidence_scores_integration():
    """Test that confidence scores are properly calculated and applied"""
    categorizer = TechStackCategorizer()
    
    technologies = [
        TechnologyEntry(name='django', confidence=1.0),  # Known framework
        TechnologyEntry(name='unknown-framework-xyz', confidence=1.0),  # Unknown
        TechnologyEntry(name='my-test-tool', confidence=1.0),  # Pattern match
    ]
    
    result = categorizer.categorize_technologies(technologies, {})
    
    # Find Django technology
    django_tech = None
    for category_data in result.categories.values():
        for subcategory_data in category_data.subcategories.values():
            for tech in subcategory_data.technologies:
                if tech.name == 'django':
                    django_tech = tech
                    break
    
    assert django_tech is not None, "Django should be found in results"
    assert django_tech.confidence == 1.0, "Django should maintain high confidence"
    
    print("✓ Confidence scores integration test passed")


if __name__ == '__main__':
    """Run all integration tests"""
    print("Running framework classifier integration tests...")
    
    test_django_project_integration()
    test_react_project_integration()
    test_mixed_stack_integration()
    test_framework_type_metadata_consistency()
    test_confidence_scores_integration()
    
    print("\n🎉 All integration tests passed!")
    print("Framework classifier is properly integrated with the categorization system.")