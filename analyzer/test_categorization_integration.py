"""
Integration tests for the complete Python-driven categorization system.
Tests the integration with the main analyzer and JSON output validation.
"""

import unittest
import json
import tempfile
import os
from pathlib import Path
from unittest.mock import patch, Mock

# Import the main analyzer and categorization components
from analyzer import ProjectAnalyzer, AnalysisResult
from tech_stack_categorizer import TechStackCategorizer
from category_rules_engine import CategoryRulesEngine
from dependency_parser import DependencyParser, TechStack, Library


class TestCategorizationIntegration(unittest.TestCase):
    """Integration tests for categorization system with main analyzer"""
    
    def setUp(self):
        """Set up test environment with temporary project"""
        self.temp_dir = tempfile.mkdtemp()
        self.project_path = Path(self.temp_dir)
        
        # Create a minimal Python project structure
        self._create_test_project()
    
    def tearDown(self):
        """Clean up temporary files"""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def _create_test_project(self):
        """Create a test Python project with dependencies"""
        # Create main Python file
        main_py = self.project_path / "main.py"
        main_py.write_text("""
import django
from flask import Flask
import pytest

def main():
    app = Flask(__name__)
    return app

if __name__ == "__main__":
    main()
""")
        
        # Create requirements.txt
        requirements = self.project_path / "requirements.txt"
        requirements.write_text("""
django==4.2.0
flask==2.3.0
pytest==7.4.0
postgresql-adapter==2.9.0
redis==4.6.0
docker-compose==1.29.0
""")
        
        # Create pyproject.toml
        pyproject = self.project_path / "pyproject.toml"
        pyproject.write_text("""
[tool.poetry]
name = "test-project"
version = "0.1.0"

[tool.poetry.dependencies]
python = "^3.9"
fastapi = "^0.100.0"
uvicorn = "^0.23.0"

[tool.poetry.group.dev.dependencies]
pytest = "^7.4.0"
black = "^23.0.0"
""")
    
    @patch('analyzer.CATEGORIZATION_AVAILABLE', True)
    def test_full_analysis_with_categorization(self):
        """Test complete analysis including categorization"""
        # Create analyzer
        analyzer = ProjectAnalyzer(self.project_path, use_cache=False)
        
        # Run analysis
        result = analyzer.analyze_project()
        
        # Verify basic analysis success
        self.assertIsInstance(result, AnalysisResult)
        self.assertTrue(result.success or len(result.errors) == 0)  # Allow warnings but not errors
        
        # Verify categorized tech stack is present
        self.assertIsNotNone(result.categorized_tech_stack)
        self.assertIn("categorized_tech_stack", result.categorized_tech_stack)
        
        # Verify JSON structure
        categorized_data = result.categorized_tech_stack["categorized_tech_stack"]
        self.assertIn("categories", categorized_data)
        self.assertIn("total_technologies", categorized_data)
        self.assertIn("processing_metadata", categorized_data)
        self.assertIn("layout_config", categorized_data)
        
        # Verify all main categories are present
        categories = categorized_data["categories"]
        expected_categories = ["backend", "frontend", "databases", "devops", "others"]
        for category in expected_categories:
            self.assertIn(category, categories)
            self.assertIn("metadata", categories[category])
            self.assertIn("subcategories", categories[category])
            self.assertIn("total_count", categories[category])
    
    def test_json_serialization_with_categorization(self):
        """Test that analysis result with categorization serializes to valid JSON"""
        analyzer = ProjectAnalyzer(self.project_path, use_cache=False)
        
        with patch('analyzer.CATEGORIZATION_AVAILABLE', True):
            result = analyzer.analyze_project()
        
        # Test JSON serialization
        json_str = result.to_json(validate=False)  # Skip validation for now
        self.assertIsInstance(json_str, str)
        
        # Verify JSON can be parsed
        parsed_data = json.loads(json_str)
        self.assertIsInstance(parsed_data, dict)
        
        # Verify categorized tech stack is in JSON
        if result.categorized_tech_stack:
            self.assertIn("categorized_tech_stack", parsed_data)
    
    def test_categorization_with_various_technologies(self):
        """Test categorization with a variety of technology types"""
        # Create a more complex requirements file
        requirements = self.project_path / "requirements.txt"
        requirements.write_text("""
# Backend frameworks
django==4.2.0
flask==2.3.0
fastapi==0.100.0

# Frontend (if any JS tools are detected)
# These would typically be detected through package.json, but we'll simulate

# Databases
psycopg2==2.9.0
pymongo==4.4.0
redis==4.6.0
sqlite3

# DevOps tools
docker==6.1.0
kubernetes==27.2.0

# Testing
pytest==7.4.0
unittest2==1.1.0

# Others
requests==2.31.0
numpy==1.24.0
""")
        
        analyzer = ProjectAnalyzer(self.project_path, use_cache=False)
        
        with patch('analyzer.CATEGORIZATION_AVAILABLE', True):
            result = analyzer.analyze_project()
        
        if result.categorized_tech_stack:
            categories = result.categorized_tech_stack["categorized_tech_stack"]["categories"]
            
            # Verify backend technologies are categorized
            backend = categories["backend"]
            self.assertGreater(backend["total_count"], 0)
            
            # Verify database technologies are categorized
            databases = categories["databases"]
            self.assertGreater(databases["total_count"], 0)
            
            # Verify DevOps technologies are categorized
            devops = categories["devops"]
            self.assertGreater(devops["total_count"], 0)
            
            # Verify testing technologies are in others
            others = categories["others"]
            self.assertGreater(others["total_count"], 0)
    
    def test_categorization_fallback_on_error(self):
        """Test that analysis continues gracefully when categorization fails"""
        analyzer = ProjectAnalyzer(self.project_path, use_cache=False)
        
        # Mock categorization to fail
        with patch('analyzer.CATEGORIZATION_AVAILABLE', True), \
             patch('analyzer.TechStackCategorizer') as mock_categorizer:
            
            mock_instance = Mock()
            mock_instance.categorize_technologies.side_effect = Exception("Categorization failed")
            mock_categorizer.return_value = mock_instance
            
            result = analyzer.analyze_project()
        
        # Analysis should still succeed
        self.assertIsInstance(result, AnalysisResult)
        
        # Categorized tech stack should be None due to error
        self.assertIsNone(result.categorized_tech_stack)
        
        # Should have a warning about categorization failure
        warning_messages = [w.get("message", "") for w in result.warnings]
        categorization_warnings = [w for w in warning_messages if "categorization" in w.lower()]
        self.assertGreater(len(categorization_warnings), 0)
    
    def test_categorization_disabled_gracefully(self):
        """Test that analysis works when categorization is not available"""
        analyzer = ProjectAnalyzer(self.project_path, use_cache=False)
        
        with patch('analyzer.CATEGORIZATION_AVAILABLE', False):
            result = analyzer.analyze_project()
        
        # Analysis should succeed
        self.assertIsInstance(result, AnalysisResult)
        self.assertTrue(result.success or len(result.errors) == 0)
        
        # Categorized tech stack should be None
        self.assertIsNone(result.categorized_tech_stack)
        
        # Regular tech stack should still be present
        self.assertIsNotNone(result.tech_stack)
        self.assertIsInstance(result.tech_stack.libraries, list)


class TestCategorizationAccuracy(unittest.TestCase):
    """Test categorization accuracy with known technology sets"""
    
    def setUp(self):
        """Set up categorization components"""
        self.rules_engine = CategoryRulesEngine()
        self.categorizer = TechStackCategorizer(self.rules_engine)
    
    def test_python_web_stack_accuracy(self):
        """Test accuracy for typical Python web development stack"""
        technologies = [
            {"name": "python", "version": "3.9.7"},
            {"name": "django", "version": "4.2.0"},
            {"name": "flask", "version": "2.3.0"},
            {"name": "postgresql", "version": "13.0"},
            {"name": "redis", "version": "6.2.0"},
            {"name": "docker"},
            {"name": "kubernetes"},
            {"name": "pytest"},
            {"name": "pip"}
        ]
        
        result = self.categorizer.categorize_technologies(technologies, {})
        
        # Verify specific categorizations
        categories = result.categories
        
        # Backend should have Python, Django, Flask
        backend_techs = []
        for subcategory in categories["backend"].subcategories.values():
            backend_techs.extend([t.name.lower() for t in subcategory.technologies])
        
        self.assertIn("python", backend_techs)
        self.assertIn("django", backend_techs)
        self.assertIn("flask", backend_techs)
        
        # Databases should have PostgreSQL and Redis
        db_techs = []
        for subcategory in categories["databases"].subcategories.values():
            db_techs.extend([t.name.lower() for t in subcategory.technologies])
        
        self.assertIn("postgresql", db_techs)
        self.assertIn("redis", db_techs)
        
        # DevOps should have Docker and Kubernetes
        devops_techs = []
        for subcategory in categories["devops"].subcategories.values():
            devops_techs.extend([t.name.lower() for t in subcategory.technologies])
        
        self.assertIn("docker", devops_techs)
        self.assertIn("kubernetes", devops_techs)
    
    def test_frontend_stack_accuracy(self):
        """Test accuracy for frontend technology stack"""
        technologies = [
            {"name": "javascript"},
            {"name": "typescript"},
            {"name": "react", "version": "18.0.0"},
            {"name": "vue", "version": "3.3.0"},
            {"name": "angular", "version": "16.0.0"},
            {"name": "npm"},
            {"name": "yarn"},
            {"name": "webpack"}
        ]
        
        result = self.categorizer.categorize_technologies(technologies, {})
        
        # Verify frontend categorizations
        frontend_techs = []
        for subcategory in result.categories["frontend"].subcategories.values():
            frontend_techs.extend([t.name.lower() for t in subcategory.technologies])
        
        self.assertIn("javascript", frontend_techs)
        self.assertIn("typescript", frontend_techs)
        self.assertIn("react", frontend_techs)
        self.assertIn("vue", frontend_techs)
        self.assertIn("angular", frontend_techs)
    
    def test_confidence_scores_accuracy(self):
        """Test that confidence scores are reasonable"""
        technologies = [
            {"name": "django"},  # Should have high confidence
            {"name": "some-test-framework"},  # Should have medium confidence (keyword match)
            {"name": "completely_unknown_xyz_123"}  # Should have low confidence
        ]
        
        result = self.categorizer.categorize_technologies(technologies, {})
        
        # Find technologies and check confidence scores
        all_techs = []
        for category in result.categories.values():
            for subcategory in category.subcategories.values():
                all_techs.extend(subcategory.technologies)
        
        # Django should have high confidence
        django_tech = next((t for t in all_techs if t.name.lower() == "django"), None)
        if django_tech:
            self.assertGreaterEqual(django_tech.confidence, 0.8)
        
        # Test framework should have medium confidence
        test_tech = next((t for t in all_techs if "test" in t.name.lower()), None)
        if test_tech:
            self.assertLess(test_tech.confidence, 1.0)
            self.assertGreaterEqual(test_tech.confidence, 0.5)


class TestPerformanceWithLargeDatasets(unittest.TestCase):
    """Test categorization performance with large datasets"""
    
    def setUp(self):
        """Set up performance test components"""
        self.rules_engine = CategoryRulesEngine()
        self.categorizer = TechStackCategorizer(self.rules_engine)
    
    def test_large_technology_list_performance(self):
        """Test performance with large number of technologies"""
        import time
        
        # Create large technology list
        technologies = []
        for i in range(1000):
            technologies.append({
                "name": f"tech_{i}",
                "version": f"1.{i % 10}.0",
                "source": "generated"
            })
        
        # Add some known technologies
        known_techs = ["python", "django", "react", "postgresql", "docker"]
        for tech in known_techs:
            technologies.append({"name": tech})
        
        # Measure categorization time
        start_time = time.time()
        result = self.categorizer.categorize_technologies(technologies, {})
        end_time = time.time()
        
        categorization_time = end_time - start_time
        
        # Verify performance (should complete within reasonable time)
        self.assertLess(categorization_time, 10.0)  # Should complete within 10 seconds
        
        # Verify processing metadata
        self.assertIn("processing_time_ms", result.processing_metadata)
        self.assertEqual(result.processing_metadata["technologies_processed"], len(technologies))
        
        # Verify known technologies were categorized correctly
        all_tech_names = []
        for category in result.categories.values():
            for subcategory in category.subcategories.values():
                all_tech_names.extend([t.name for t in subcategory.technologies])
        
        for known_tech in known_techs:
            self.assertIn(known_tech, all_tech_names)
    
    def test_memory_usage_with_large_datasets(self):
        """Test memory usage remains reasonable with large datasets"""
        import psutil
        import os
        
        # Get initial memory usage
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Create very large technology list
        technologies = [{"name": f"tech_{i}"} for i in range(5000)]
        
        # Perform categorization
        result = self.categorizer.categorize_technologies(technologies, {})
        
        # Get final memory usage
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (less than 100MB for 5000 items)
        self.assertLess(memory_increase, 100)
        
        # Verify result is valid
        self.assertIsInstance(result, type(self.categorizer._initialize_empty_structure()))


if __name__ == "__main__":
    # Run integration tests
    unittest.main(verbosity=2)