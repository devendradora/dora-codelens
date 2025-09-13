"""
Unit tests for the TechStackCategorizer system.
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
import json
from tech_stack_categorizer import TechStackCategorizer, SubcategoryOrganizer
from category_rules_engine import CategoryRulesEngine
from tech_stack_types import (
    TechnologyEntry, CategoryData, SubcategoryData, CategorizedTechStack,
    MainCategory, SubcategoryType, ClassificationRule
)


class TestTechStackCategorizer(unittest.TestCase):
    """Test cases for TechStackCategorizer"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.rules_engine = Mock(spec=CategoryRulesEngine)
        self.categorizer = TechStackCategorizer(self.rules_engine)
        
        # Mock rules engine methods
        self.rules_engine.get_all_categories.return_value = list(MainCategory)
        self.rules_engine.get_subcategories_for_category.return_value = [
            SubcategoryType.LANGUAGES, SubcategoryType.FRAMEWORKS
        ]
        self.rules_engine.get_category_metadata.return_value = Mock(
            name="backend", display_name="Backend", icon="🔧", 
            description="Backend technologies", color="#4CAF50"
        )
        self.rules_engine.get_subcategory_metadata.return_value = {
            "name": "languages", "display_name": "Programming Languages", 
            "icon": "💻", "order": 1
        }
    
    def test_categorize_python_technology(self):
        """Test Python technology classification"""
        # Setup
        technologies = [{"name": "django", "version": "4.2.0"}]
        
        # Mock classification rule
        django_rule = ClassificationRule(
            pattern="django",
            main_category=MainCategory.BACKEND,
            subcategory=SubcategoryType.FRAMEWORKS,
            confidence=1.0,
            metadata={"icon": "🎸", "description": "Django web framework"}
        )
        self.rules_engine.classify_technology.return_value = django_rule
        
        # Execute
        result = self.categorizer.categorize_technologies(technologies, {})
        
        # Verify
        self.assertIsInstance(result, CategorizedTechStack)
        self.assertIn("backend", result.categories)
        backend_category = result.categories["backend"]
        self.assertIn("frameworks", backend_category.subcategories)
        
        frameworks_subcategory = backend_category.subcategories["frameworks"]
        self.assertEqual(len(frameworks_subcategory.technologies), 1)
        self.assertEqual(frameworks_subcategory.technologies[0].name, "django")
    
    def test_empty_categories_always_visible(self):
        """Test that empty categories are always included"""
        # Setup - no technologies
        technologies = []
        
        # Execute
        result = self.categorizer.categorize_technologies(technologies, {})
        
        # Verify all main categories are present
        expected_categories = ["backend", "frontend", "databases", "devops", "others"]
        for category_name in expected_categories:
            self.assertIn(category_name, result.categories)
            self.assertTrue(result.categories[category_name].visible)
            self.assertEqual(result.categories[category_name].total_count, 0)
    
    def test_json_output_structure(self):
        """Test JSON output has correct structure"""
        # Setup
        technologies = [{"name": "python"}]
        
        python_rule = ClassificationRule(
            pattern="python",
            main_category=MainCategory.BACKEND,
            subcategory=SubcategoryType.LANGUAGES,
            confidence=1.0,
            metadata={"icon": "🐍", "description": "Python language"}
        )
        self.rules_engine.classify_technology.return_value = python_rule
        
        # Execute
        result = self.categorizer.categorize_technologies(technologies, {})
        json_output = self.categorizer.generate_output_json(result)
        
        # Verify structure
        self.assertIn("categorized_tech_stack", json_output)
        tech_stack = json_output["categorized_tech_stack"]
        self.assertIn("categories", tech_stack)
        self.assertIn("total_technologies", tech_stack)
        self.assertIn("processing_metadata", tech_stack)
        self.assertIn("layout_config", tech_stack)
    
    def test_confidence_threshold_filtering(self):
        """Test that technologies below confidence threshold are filtered"""
        # Setup
        technologies = [{"name": "unknown_tech"}]
        
        # Mock low confidence rule
        low_confidence_rule = ClassificationRule(
            pattern="unknown_tech",
            main_category=MainCategory.OTHERS,
            subcategory=SubcategoryType.MISCELLANEOUS,
            confidence=0.05,  # Below default threshold of 0.1
            metadata={"icon": "❓", "description": "Unknown technology"}
        )
        self.rules_engine.classify_technology.return_value = low_confidence_rule
        
        # Execute
        result = self.categorizer.categorize_technologies(technologies, {})
        
        # Verify technology was filtered out
        self.assertEqual(result.total_technologies, 0)
        others_category = result.categories["others"]
        self.assertEqual(others_category.total_count, 0)
    
    def test_batch_processing_large_datasets(self):
        """Test batch processing for large technology lists"""
        # Setup - create large technology list
        technologies = [{"name": f"tech_{i}"} for i in range(100)]
        
        # Mock classification for all technologies
        mock_rule = ClassificationRule(
            pattern="tech_*",
            main_category=MainCategory.OTHERS,
            subcategory=SubcategoryType.MISCELLANEOUS,
            confidence=0.8,
            metadata={"icon": "📦", "description": "Test technology"}
        )
        self.rules_engine.classify_technology.return_value = mock_rule
        
        # Set small batch size for testing
        self.categorizer.batch_size = 10
        
        # Execute
        result = self.categorizer.categorize_technologies(technologies, {})
        
        # Verify all technologies were processed
        self.assertEqual(result.total_technologies, 100)
        others_category = result.categories["others"]
        self.assertEqual(others_category.total_count, 100)
    
    def test_fallback_structure_on_error(self):
        """Test fallback structure generation when categorization fails"""
        # Setup - mock rules engine to raise exception
        self.rules_engine.classify_technology.side_effect = Exception("Classification failed")
        
        technologies = [{"name": "test_tech"}]
        
        # Execute
        result = self.categorizer.categorize_technologies(technologies, {})
        
        # Verify fallback structure
        self.assertIsInstance(result, CategorizedTechStack)
        self.assertEqual(result.total_technologies, 0)
        self.assertIn("error", result.processing_metadata)
        self.assertTrue(result.processing_metadata["fallback_mode"])
    
    def test_performance_metadata_generation(self):
        """Test that performance metadata is correctly generated"""
        # Setup
        technologies = [{"name": "python"}]
        
        python_rule = ClassificationRule(
            pattern="python",
            main_category=MainCategory.BACKEND,
            subcategory=SubcategoryType.LANGUAGES,
            confidence=1.0,
            metadata={"icon": "🐍"}
        )
        self.rules_engine.classify_technology.return_value = python_rule
        
        # Execute
        result = self.categorizer.categorize_technologies(technologies, {})
        
        # Verify performance metadata
        self.assertIn("processing_time_ms", result.processing_metadata)
        self.assertIn("technologies_processed", result.processing_metadata)
        self.assertIn("rules_applied", result.processing_metadata)
        self.assertIn("cache_hit_rate", result.processing_metadata)
        self.assertEqual(result.processing_metadata["technologies_processed"], 1)
    
    def test_layout_hints_generation(self):
        """Test that layout hints are correctly generated"""
        # Setup
        technologies = [{"name": f"tech_{i}"} for i in range(15)]  # More than 10 for grid layout
        
        mock_rule = ClassificationRule(
            pattern="tech_*",
            main_category=MainCategory.FRONTEND,
            subcategory=SubcategoryType.LIBRARIES,
            confidence=0.9,
            metadata={"icon": "📦"}
        )
        self.rules_engine.classify_technology.return_value = mock_rule
        
        # Execute
        result = self.categorizer.categorize_technologies(technologies, {})
        
        # Verify layout hints
        frontend_category = result.categories["frontend"]
        layout_hints = frontend_category.layout_hints
        
        self.assertTrue(layout_hints["full_width"])
        self.assertEqual(layout_hints["subcategory_layout"], "grid")  # Should be grid for >10 items
        self.assertIn("responsive_breakpoints", layout_hints)
        self.assertTrue(layout_hints["show_confidence"])


class TestCategoryRulesEngine(unittest.TestCase):
    """Test cases for CategoryRulesEngine"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.rules_engine = CategoryRulesEngine()
    
    def test_exact_match_classification(self):
        """Test exact match technology classification"""
        # Test known technology
        rule = self.rules_engine.classify_technology("django")
        
        self.assertIsNotNone(rule)
        self.assertEqual(rule.main_category, MainCategory.BACKEND)
        self.assertEqual(rule.subcategory, SubcategoryType.FRAMEWORKS)
        self.assertEqual(rule.confidence, 1.0)
    
    def test_case_insensitive_matching(self):
        """Test case insensitive technology matching"""
        # Test uppercase
        rule_upper = self.rules_engine.classify_technology("DJANGO")
        rule_lower = self.rules_engine.classify_technology("django")
        
        self.assertIsNotNone(rule_upper)
        self.assertIsNotNone(rule_lower)
        self.assertEqual(rule_upper.main_category, rule_lower.main_category)
        self.assertEqual(rule_upper.subcategory, rule_lower.subcategory)
    
    def test_keyword_pattern_matching(self):
        """Test keyword pattern matching"""
        # Test technology with testing keyword
        rule = self.rules_engine.classify_technology("my-test-framework")
        
        self.assertIsNotNone(rule)
        self.assertEqual(rule.main_category, MainCategory.OTHERS)
        self.assertEqual(rule.subcategory, SubcategoryType.TESTING)
        self.assertLess(rule.confidence, 1.0)  # Should be less confident than exact match
    
    def test_fallback_classification(self):
        """Test fallback classification for unknown technologies"""
        # Test completely unknown technology
        rule = self.rules_engine.classify_technology("completely_unknown_tech_12345")
        
        self.assertIsNotNone(rule)
        self.assertEqual(rule.main_category, MainCategory.OTHERS)
        self.assertEqual(rule.subcategory, SubcategoryType.MISCELLANEOUS)
        self.assertLess(rule.confidence, 0.5)  # Should have low confidence
    
    def test_technology_variations(self):
        """Test handling of technology name variations"""
        # Test with .js suffix
        rule = self.rules_engine.classify_technology("react.js")
        
        self.assertIsNotNone(rule)
        # Should still classify as React even with .js suffix
        self.assertEqual(rule.main_category, MainCategory.FRONTEND)
    
    def test_category_metadata_retrieval(self):
        """Test category metadata retrieval"""
        metadata = self.rules_engine.get_category_metadata(MainCategory.BACKEND)
        
        self.assertEqual(metadata.name, "backend")
        self.assertEqual(metadata.display_name, "Backend")
        self.assertIsNotNone(metadata.icon)
        self.assertIsNotNone(metadata.description)
        self.assertIsNotNone(metadata.color)
    
    def test_subcategory_metadata_retrieval(self):
        """Test subcategory metadata retrieval"""
        metadata = self.rules_engine.get_subcategory_metadata(SubcategoryType.LANGUAGES)
        
        self.assertEqual(metadata["name"], "languages")
        self.assertEqual(metadata["display_name"], "Programming Languages")
        self.assertIsNotNone(metadata["icon"])
        self.assertIsInstance(metadata["order"], int)
    
    def test_rules_validation(self):
        """Test rules validation functionality"""
        stats = self.rules_engine.validate_rules()
        
        self.assertIn("exact_matches", stats)
        self.assertIn("keyword_patterns", stats)
        self.assertIn("validation_errors", stats)
        self.assertGreater(stats["exact_matches"], 0)
        self.assertIsInstance(stats["validation_errors"], list)


class TestSubcategoryOrganizer(unittest.TestCase):
    """Test cases for SubcategoryOrganizer"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.organizer = SubcategoryOrganizer()
    
    def test_layout_hints_for_small_category(self):
        """Test layout hints generation for small categories"""
        hints = self.organizer.generate_layout_hints(MainCategory.BACKEND, 2, 3)
        
        self.assertTrue(hints["full_width"])
        self.assertEqual(hints["subcategory_layout"], "list")  # Should be list for <=10 items
        self.assertIn("responsive_breakpoints", hints)
    
    def test_layout_hints_for_large_category(self):
        """Test layout hints generation for large categories"""
        hints = self.organizer.generate_layout_hints(MainCategory.FRONTEND, 5, 25)
        
        self.assertTrue(hints["full_width"])
        self.assertEqual(hints["subcategory_layout"], "grid")  # Should be grid for >10 items
        self.assertTrue(hints["show_confidence"])
        self.assertTrue(hints["compact_mode"])


class TestTechnologyEntry(unittest.TestCase):
    """Test cases for TechnologyEntry data class"""
    
    def test_technology_entry_creation(self):
        """Test TechnologyEntry creation with various parameters"""
        # Test minimal creation
        tech = TechnologyEntry(name="python")
        self.assertEqual(tech.name, "python")
        self.assertIsNone(tech.version)
        self.assertEqual(tech.source, "detected")
        self.assertEqual(tech.confidence, 1.0)
        self.assertEqual(tech.metadata, {})
        
        # Test full creation
        tech_full = TechnologyEntry(
            name="django",
            version="4.2.0",
            source="requirements.txt",
            confidence=0.9,
            metadata={"icon": "🎸", "description": "Web framework"}
        )
        self.assertEqual(tech_full.name, "django")
        self.assertEqual(tech_full.version, "4.2.0")
        self.assertEqual(tech_full.source, "requirements.txt")
        self.assertEqual(tech_full.confidence, 0.9)
        self.assertIn("icon", tech_full.metadata)


class TestIntegrationScenarios(unittest.TestCase):
    """Integration test scenarios for the complete categorization system"""
    
    def setUp(self):
        """Set up integration test fixtures"""
        self.rules_engine = CategoryRulesEngine()
        self.categorizer = TechStackCategorizer(self.rules_engine)
    
    def test_typical_python_web_project(self):
        """Test categorization of a typical Python web project"""
        technologies = [
            {"name": "python", "version": "3.9.7"},
            {"name": "django", "version": "4.2.0"},
            {"name": "postgresql", "version": "13.0"},
            {"name": "redis", "version": "6.2.0"},
            {"name": "docker"},
            {"name": "pytest"},
            {"name": "pip"}
        ]
        
        result = self.categorizer.categorize_technologies(technologies, {})
        
        # Verify categorization
        self.assertGreater(result.total_technologies, 0)
        
        # Check backend category
        backend = result.categories["backend"]
        self.assertGreater(backend.total_count, 0)
        
        # Check databases category
        databases = result.categories["databases"]
        self.assertGreater(databases.total_count, 0)
        
        # Check DevOps category
        devops = result.categories["devops"]
        self.assertGreater(devops.total_count, 0)
        
        # Check Others category (for testing)
        others = result.categories["others"]
        self.assertGreater(others.total_count, 0)
    
    def test_frontend_heavy_project(self):
        """Test categorization of a frontend-heavy project"""
        technologies = [
            {"name": "javascript"},
            {"name": "typescript"},
            {"name": "react", "version": "18.0.0"},
            {"name": "next.js", "version": "13.0.0"},
            {"name": "npm"},
            {"name": "jest"}
        ]
        
        result = self.categorizer.categorize_technologies(technologies, {})
        
        # Verify frontend category has most technologies
        frontend = result.categories["frontend"]
        self.assertGreater(frontend.total_count, 0)
        
        # Verify subcategories
        self.assertIn("languages", frontend.subcategories)
        self.assertIn("frameworks", frontend.subcategories)
        self.assertIn("package-managers", frontend.subcategories)
    
    def test_json_output_validation(self):
        """Test complete JSON output validation"""
        technologies = [
            {"name": "python"},
            {"name": "flask"},
            {"name": "sqlite"}
        ]
        
        result = self.categorizer.categorize_technologies(technologies, {})
        json_output = self.categorizer.generate_output_json(result)
        
        # Validate JSON structure
        validation_result = self.categorizer.validate_output(json_output)
        
        self.assertTrue(validation_result["valid"])
        self.assertEqual(len(validation_result["errors"]), 0)
        self.assertIn("statistics", validation_result)
        
        # Verify JSON is serializable
        json_str = json.dumps(json_output)
        self.assertIsInstance(json_str, str)
        
        # Verify JSON can be parsed back
        parsed_json = json.loads(json_str)
        self.assertEqual(parsed_json, json_output)


if __name__ == "__main__":
    # Run all tests
    unittest.main(verbosity=2)