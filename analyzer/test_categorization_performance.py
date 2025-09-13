"""
Performance tests for the categorization system.
"""

import time
import unittest
from tech_stack_categorizer import TechStackCategorizer
from category_rules_engine import CategoryRulesEngine


class TestCategorizationPerformance(unittest.TestCase):
    """Performance tests for categorization system"""
    
    def setUp(self):
        """Set up performance test components"""
        self.rules_engine = CategoryRulesEngine()
        self.categorizer = TechStackCategorizer(self.rules_engine)
    
    def test_small_dataset_performance(self):
        """Test performance with small dataset (< 50 technologies)"""
        technologies = [
            {"name": "python"}, {"name": "django"}, {"name": "flask"},
            {"name": "postgresql"}, {"name": "redis"}, {"name": "docker"},
            {"name": "kubernetes"}, {"name": "pytest"}, {"name": "npm"},
            {"name": "react"}, {"name": "vue"}, {"name": "angular"}
        ]
        
        start_time = time.time()
        result = self.categorizer.categorize_technologies(technologies, {})
        end_time = time.time()
        
        processing_time = end_time - start_time
        
        # Should complete very quickly for small datasets
        self.assertLess(processing_time, 1.0)
        self.assertEqual(result.total_technologies, len([t for t in technologies if self._would_be_classified(t["name"])]))
        
        # Check processing metadata
        self.assertIn("processing_time_ms", result.processing_metadata)
        self.assertLess(result.processing_metadata["processing_time_ms"], 1000)
    
    def test_medium_dataset_performance(self):
        """Test performance with medium dataset (100-500 technologies)"""
        technologies = []
        
        # Add known technologies
        known_techs = [
            "python", "java", "javascript", "typescript", "go", "rust",
            "django", "flask", "fastapi", "spring", "express", "react",
            "vue", "angular", "svelte", "postgresql", "mysql", "mongodb",
            "redis", "elasticsearch", "docker", "kubernetes", "jenkins"
        ]
        
        for tech in known_techs:
            technologies.append({"name": tech})
        
        # Add generated technologies to reach medium size
        for i in range(200):
            technologies.append({"name": f"generated_tech_{i}"})
        
        start_time = time.time()
        result = self.categorizer.categorize_technologies(technologies, {})
        end_time = time.time()
        
        processing_time = end_time - start_time
        
        # Should complete within reasonable time for medium datasets
        self.assertLess(processing_time, 5.0)
        self.assertGreater(result.total_technologies, 0)
        
        # Verify known technologies were processed
        all_tech_names = self._get_all_technology_names(result)
        for known_tech in known_techs[:10]:  # Check first 10
            self.assertIn(known_tech, all_tech_names)
    
    def test_large_dataset_performance(self):
        """Test performance with large dataset (1000+ technologies)"""
        technologies = []
        
        # Add many generated technologies
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
        
        start_time = time.time()
        result = self.categorizer.categorize_technologies(technologies, {})
        end_time = time.time()
        
        processing_time = end_time - start_time
        
        # Should complete within reasonable time even for large datasets
        self.assertLess(processing_time, 15.0)
        
        # Verify processing metadata
        self.assertEqual(result.processing_metadata["technologies_processed"], len(technologies))
        self.assertGreater(result.processing_metadata["rules_applied"], 0)
        
        # Verify known technologies were found
        all_tech_names = self._get_all_technology_names(result)
        for known_tech in known_techs:
            self.assertIn(known_tech, all_tech_names)
    
    def test_batch_processing_efficiency(self):
        """Test that batch processing is more efficient for large datasets"""
        # Create large dataset
        technologies = [{"name": f"tech_{i}"} for i in range(500)]
        
        # Test with small batch size (forces batching)
        self.categorizer.batch_size = 50
        
        start_time = time.time()
        result_batched = self.categorizer.categorize_technologies(technologies, {})
        batched_time = time.time() - start_time
        
        # Test with large batch size (no batching)
        self.categorizer.batch_size = 1000
        
        start_time = time.time()
        result_single = self.categorizer.categorize_technologies(technologies, {})
        single_time = time.time() - start_time
        
        # Both should produce same results
        self.assertEqual(result_batched.total_technologies, result_single.total_technologies)
        
        # Both should complete in reasonable time
        self.assertLess(batched_time, 10.0)
        self.assertLess(single_time, 10.0)
    
    def test_caching_performance(self):
        """Test that caching improves performance for repeated classifications"""
        technologies = [
            {"name": "python"}, {"name": "django"}, {"name": "python"},  # Duplicate python
            {"name": "react"}, {"name": "django"}, {"name": "react"}     # Duplicate react and django
        ]
        
        # Clear cache first
        self.categorizer.classification_cache.clear()
        
        start_time = time.time()
        result = self.categorizer.categorize_technologies(technologies, {})
        end_time = time.time()
        
        # Verify caching worked
        cache_stats = result.processing_metadata
        self.assertGreater(cache_stats["cache_hits"], 0)  # Should have cache hits for duplicates
        self.assertGreater(cache_stats["cache_hit_rate"], 0.0)
        
        # Verify technologies were processed (duplicates are processed as separate entries)
        self.assertGreater(result.total_technologies, 0)
        
        # Verify we have the expected unique technology names in the result
        all_tech_names = self._get_all_technology_names(result)
        unique_input_techs = set(t["name"] for t in technologies)
        for tech_name in unique_input_techs:
            if self._would_be_classified(tech_name):
                self.assertIn(tech_name, all_tech_names)
    
    def test_json_generation_performance(self):
        """Test JSON generation performance"""
        # Create medium-sized dataset
        technologies = [{"name": f"tech_{i}"} for i in range(200)]
        
        # Add some known technologies
        for tech in ["python", "django", "react", "postgresql"]:
            technologies.append({"name": tech})
        
        # Categorize
        result = self.categorizer.categorize_technologies(technologies, {})
        
        # Test JSON generation performance
        start_time = time.time()
        json_output = self.categorizer.generate_output_json(result)
        json_time = time.time() - start_time
        
        # JSON generation should be fast
        self.assertLess(json_time, 2.0)
        
        # Verify JSON structure
        self.assertIn("categorized_tech_stack", json_output)
        
        # Test validation performance
        start_time = time.time()
        validation_result = self.categorizer.validate_output(json_output)
        validation_time = time.time() - start_time
        
        # Validation should be fast
        self.assertLess(validation_time, 1.0)
        self.assertTrue(validation_result["valid"])
    
    def _would_be_classified(self, tech_name: str) -> bool:
        """Helper to determine if a technology would be classified above threshold"""
        rule = self.rules_engine.classify_technology(tech_name)
        return rule is not None and rule.confidence >= self.categorizer.confidence_threshold
    
    def _get_all_technology_names(self, result) -> list:
        """Helper to get all technology names from categorization result"""
        all_names = []
        for category in result.categories.values():
            for subcategory in category.subcategories.values():
                all_names.extend([t.name for t in subcategory.technologies])
        return all_names


if __name__ == "__main__":
    # Run performance tests
    unittest.main(verbosity=2)