"""
Main TechStackCategorizer class for Python-driven technology categorization.
Handles complete technology classification and JSON output generation.
"""

import time
import logging
from typing import Dict, List, Any, Optional, Set
from collections import defaultdict

from tech_stack_types import (
    TechnologyEntry, CategoryData, SubcategoryData, CategorizedTechStack,
    CategoryMetadata, MainCategory, SubcategoryType, ClassificationRule
)
from category_rules_engine import CategoryRulesEngine
from framework_classifier import FrameworkClassifier

logger = logging.getLogger(__name__)


class SubcategoryOrganizer:
    """Organizes technologies into subcategories with layout hints"""
    
    def organize_by_type(self, technologies: List[TechnologyEntry], 
                        main_category: MainCategory) -> Dict[str, List[TechnologyEntry]]:
        """Organize technologies by subcategory type"""
        organized = defaultdict(list)
        
        for tech in technologies:
            # Get subcategory from technology metadata or classify
            subcategory = tech.metadata.get("subcategory", "miscellaneous")
            organized[subcategory].append(tech)
        
        return dict(organized)
    
    def apply_subcategory_rules(self, technologies: List[TechnologyEntry], 
                              category: MainCategory) -> Dict[str, List[TechnologyEntry]]:
        """Apply subcategory organization rules"""
        return self.organize_by_type(technologies, category)
    
    def generate_layout_hints(self, category: MainCategory, 
                            subcategory_count: int, tech_count: int) -> Dict[str, Any]:
        """Generate layout hints for the category"""
        return {
            "full_width": True,
            "subcategory_layout": "grid" if tech_count > 10 else "list",
            "responsive_breakpoints": {
                "mobile": 1,
                "tablet": 2 if tech_count > 5 else 1,
                "desktop": 3 if tech_count > 10 else 2
            },
            "show_confidence": tech_count > 5,
            "compact_mode": tech_count > 20
        }


class TechStackCategorizer:
    """Main categorizer for technology stack analysis"""
    
    def __init__(self, rules_engine: Optional[CategoryRulesEngine] = None):
        self.rules_engine = rules_engine or CategoryRulesEngine()
        self.framework_classifier = FrameworkClassifier()
        self.subcategory_organizer = SubcategoryOrganizer()
        self.classification_cache: Dict[str, ClassificationRule] = {}
        self.batch_size = 50
        self.confidence_threshold = 0.1
        
        # Performance tracking
        self.processing_stats = {
            "start_time": 0,
            "end_time": 0,
            "technologies_processed": 0,
            "rules_applied": 0,
            "cache_hits": 0,
            "cache_misses": 0
        }
    
    def categorize_technologies(self, technologies: List[Any], 
                              analysis_data: Dict[str, Any]) -> CategorizedTechStack:
        """Main categorization method that processes all technologies"""
        self.processing_stats["start_time"] = time.time()
        
        try:
            # Convert input technologies to TechnologyEntry objects
            tech_entries = self._convert_to_tech_entries(technologies, analysis_data)
            
            # Process technologies (in batches if needed)
            if len(tech_entries) > self.batch_size:
                categorized_data = self._process_in_batches(tech_entries, analysis_data)
            else:
                categorized_data = self._process_all_at_once(tech_entries, analysis_data)
            
            # Finalize processing stats
            self.processing_stats["end_time"] = time.time()
            self.processing_stats["technologies_processed"] = len(tech_entries)
            
            # Add processing metadata
            categorized_data.processing_metadata = self._generate_processing_metadata()
            categorized_data.layout_config = self._generate_layout_config()
            
            return categorized_data
            
        except Exception as e:
            logger.error(f"Categorization failed: {e}")
            return self._generate_fallback_structure(technologies)
    
    def _convert_to_tech_entries(self, technologies: List[Any], 
                               analysis_data: Dict[str, Any]) -> List[TechnologyEntry]:
        """Convert various input formats to TechnologyEntry objects"""
        tech_entries = []
        
        for tech in technologies:
            if isinstance(tech, TechnologyEntry):
                tech_entries.append(tech)
            elif isinstance(tech, dict):
                tech_entries.append(TechnologyEntry(
                    name=tech.get("name", "unknown"),
                    version=tech.get("version"),
                    source=tech.get("source", "detected"),
                    confidence=tech.get("confidence", 1.0),
                    metadata=tech.get("metadata", {})
                ))
            elif isinstance(tech, str):
                tech_entries.append(TechnologyEntry(
                    name=tech,
                    source="detected",
                    confidence=1.0
                ))
            else:
                logger.warning(f"Unknown technology format: {type(tech)}")
                tech_entries.append(TechnologyEntry(
                    name=str(tech),
                    source="converted",
                    confidence=0.5
                ))
        
        return tech_entries
    
    def _process_all_at_once(self, technologies: List[TechnologyEntry], 
                           analysis_data: Dict[str, Any]) -> CategorizedTechStack:
        """Process all technologies at once"""
        # Initialize category structure
        categorized_data = self._initialize_empty_structure()
        
        # Classify and organize technologies
        for tech in technologies:
            classified_tech = self._classify_single_technology(tech)
            if classified_tech:
                self._add_technology_to_structure(categorized_data, classified_tech)
        
        # Update counts and finalize structure
        self._update_category_counts(categorized_data)
        
        return categorized_data
    
    def _process_in_batches(self, technologies: List[TechnologyEntry], 
                          analysis_data: Dict[str, Any]) -> CategorizedTechStack:
        """Process large technology lists in batches for better performance"""
        categorized_data = self._initialize_empty_structure()
        
        for i in range(0, len(technologies), self.batch_size):
            batch = technologies[i:i + self.batch_size]
            logger.info(f"Processing batch {i//self.batch_size + 1} "
                       f"({len(batch)} technologies)")
            
            for tech in batch:
                classified_tech = self._classify_single_technology(tech)
                if classified_tech:
                    self._add_technology_to_structure(categorized_data, classified_tech)
        
        self._update_category_counts(categorized_data)
        return categorized_data
    
    def _classify_single_technology(self, tech: TechnologyEntry) -> Optional[TechnologyEntry]:
        """Classify a single technology and return enhanced metadata"""
        # Check cache first
        cache_key = tech.name.lower()
        if cache_key in self.classification_cache:
            rule = self.classification_cache[cache_key]
            self.processing_stats["cache_hits"] += 1
        else:
            rule = self.rules_engine.classify_technology(tech.name)
            if rule:
                self.classification_cache[cache_key] = rule
                self.processing_stats["cache_misses"] += 1
                self.processing_stats["rules_applied"] += 1
        
        if not rule or rule.confidence < self.confidence_threshold:
            return None
        
        # Apply framework vs library classification if needed
        final_subcategory = rule.subcategory
        framework_type = rule.metadata.get("framework_type", "library")
        
        # Use framework classifier for backend/frontend technologies
        # Only reclassify if the original rule doesn't have explicit framework_type
        # AND the subcategory is ambiguous (libraries or frameworks)
        if (rule.main_category in [MainCategory.BACKEND, MainCategory.FRONTEND] and 
            "framework_type" not in rule.metadata and
            rule.subcategory in [SubcategoryType.LIBRARIES, SubcategoryType.FRAMEWORKS]):
            
            classified_subcategory = self.framework_classifier.classify_framework_or_library(
                tech.name, rule.main_category.value
            )
            
            # Get framework type and confidence from classifier
            framework_type = self.framework_classifier.get_framework_type_metadata(
                tech.name, classified_subcategory
            )
            classification_confidence = self.framework_classifier.get_classification_confidence(
                tech.name, rule.main_category.value, classified_subcategory
            )
            
            # Update subcategory if classifier suggests different classification
            if classified_subcategory != rule.subcategory:
                final_subcategory = classified_subcategory
                # Adjust confidence based on classifier confidence
                rule.confidence = min(rule.confidence, classification_confidence)
        
        # Enhance technology with classification metadata
        enhanced_tech = TechnologyEntry(
            name=tech.name,
            version=tech.version,
            source=tech.source,
            confidence=min(tech.confidence, rule.confidence),
            metadata={
                **tech.metadata,
                **rule.metadata,
                "main_category": rule.main_category.value,
                "subcategory": final_subcategory.value,
                "classification_pattern": rule.pattern,
                "framework_type": framework_type
            }
        )
        
        return enhanced_tech
    
    def _initialize_empty_structure(self) -> CategorizedTechStack:
        """Initialize empty categorized structure with all categories"""
        categories = {}
        
        for main_category in self.rules_engine.get_all_categories():
            category_metadata = self.rules_engine.get_category_metadata(main_category)
            subcategories = {}
            
            # Initialize subcategories for this main category
            for subcategory_type in self.rules_engine.get_subcategories_for_category(main_category):
                subcategory_metadata = self.rules_engine.get_subcategory_metadata(subcategory_type)
                subcategories[subcategory_type.value] = SubcategoryData(
                    name=subcategory_type.value,
                    display_name=subcategory_metadata["display_name"],
                    icon=subcategory_metadata["icon"],
                    technologies=[],
                    visible=True,
                    order=subcategory_metadata["order"]
                )
            
            categories[main_category.value] = CategoryData(
                metadata=category_metadata,
                subcategories=subcategories,
                total_count=0,
                visible=True,
                layout_hints=self.subcategory_organizer.generate_layout_hints(
                    main_category, len(subcategories), 0
                )
            )
        
        return CategorizedTechStack(
            categories=categories,
            total_technologies=0,
            processing_metadata={},
            layout_config={}
        )
    
    def _add_technology_to_structure(self, categorized_data: CategorizedTechStack, 
                                   tech: TechnologyEntry) -> None:
        """Add a classified technology to the categorized structure"""
        main_category = tech.metadata.get("main_category")
        subcategory = tech.metadata.get("subcategory")
        
        if not main_category or not subcategory:
            logger.warning(f"Technology {tech.name} missing category information")
            return
        
        # Add to appropriate category and subcategory
        if main_category in categorized_data.categories:
            category_data = categorized_data.categories[main_category]
            
            if subcategory in category_data.subcategories:
                category_data.subcategories[subcategory].technologies.append(tech)
            else:
                # Create subcategory if it doesn't exist
                logger.info(f"Creating new subcategory: {subcategory} in {main_category}")
                subcategory_metadata = self.rules_engine.get_subcategory_metadata(
                    SubcategoryType(subcategory)
                )
                category_data.subcategories[subcategory] = SubcategoryData(
                    name=subcategory,
                    display_name=subcategory_metadata["display_name"],
                    icon=subcategory_metadata["icon"],
                    technologies=[tech],
                    visible=True,
                    order=subcategory_metadata["order"]
                )
    
    def _update_category_counts(self, categorized_data: CategorizedTechStack) -> None:
        """Update technology counts for all categories"""
        total_count = 0
        
        for category_name, category_data in categorized_data.categories.items():
            category_count = 0
            
            for subcategory_data in category_data.subcategories.values():
                category_count += len(subcategory_data.technologies)
                # Sort technologies by name
                subcategory_data.technologies.sort(key=lambda t: t.name.lower())
            
            category_data.total_count = category_count
            total_count += category_count
            
            # Update layout hints based on actual counts
            category_data.layout_hints = self.subcategory_organizer.generate_layout_hints(
                MainCategory(category_name), 
                len(category_data.subcategories), 
                category_count
            )
            
            # Add empty state message if no technologies
            if category_count == 0:
                category_data.layout_hints["empty_state_message"] = (
                    f"No {category_data.metadata.display_name.lower()} technologies detected in this project"
                )
        
        categorized_data.total_technologies = total_count
    
    def _generate_processing_metadata(self) -> Dict[str, Any]:
        """Generate processing metadata for debugging and optimization"""
        processing_time = self.processing_stats["end_time"] - self.processing_stats["start_time"]
        
        return {
            "processing_time_ms": round(processing_time * 1000, 2),
            "technologies_processed": self.processing_stats["technologies_processed"],
            "rules_applied": self.processing_stats["rules_applied"],
            "cache_hits": self.processing_stats["cache_hits"],
            "cache_misses": self.processing_stats["cache_misses"],
            "cache_hit_rate": (
                self.processing_stats["cache_hits"] / 
                max(1, self.processing_stats["cache_hits"] + self.processing_stats["cache_misses"])
            ),
            "confidence_threshold": self.confidence_threshold,
            "detection_methods": ["file_analysis", "dependency_parsing", "code_patterns"],
            "categorizer_version": "1.0.0"
        }
    
    def _generate_layout_config(self) -> Dict[str, Any]:
        """Generate layout configuration for the frontend"""
        return {
            "full_width_categories": True,
            "show_empty_categories": True,
            "responsive_design": True,
            "category_order": ["backend", "frontend", "databases", "devops", "others"],
            "default_subcategory_layout": "grid",
            "show_confidence_indicators": True,
            "enable_category_filtering": True,
            "enable_search": True
        }
    
    def _generate_fallback_structure(self, technologies: List[Any]) -> CategorizedTechStack:
        """Generate minimal structure when categorization fails"""
        logger.warning("Generating fallback categorization structure")
        
        fallback_categories = {}
        
        for category in MainCategory:
            category_metadata = CategoryMetadata(
                name=category.value,
                display_name=category.value.title(),
                icon="📦",
                description=f"{category.value} technologies",
                color="#666666"
            )
            
            fallback_categories[category.value] = CategoryData(
                metadata=category_metadata,
                subcategories={},
                total_count=0,
                visible=True,
                layout_hints={
                    "full_width": True,
                    "empty_state_message": "Categorization unavailable - please check logs"
                }
            )
        
        return CategorizedTechStack(
            categories=fallback_categories,
            total_technologies=0,
            processing_metadata={
                "error": "Categorization failed",
                "fallback_mode": True,
                "processing_time_ms": 0
            },
            layout_config={
                "full_width_categories": True,
                "show_empty_categories": True,
                "error_mode": True
            }
        )
    
    def generate_output_json(self, categorized_data: CategorizedTechStack) -> Dict[str, Any]:
        """Generate final JSON output for TypeScript consumption"""
        def convert_to_dict(obj):
            """Convert dataclass objects to dictionaries"""
            if hasattr(obj, '__dict__'):
                result = {}
                for key, value in obj.__dict__.items():
                    if isinstance(value, dict):
                        result[key] = {k: convert_to_dict(v) for k, v in value.items()}
                    elif isinstance(value, list):
                        result[key] = [convert_to_dict(item) for item in value]
                    elif hasattr(value, '__dict__'):
                        result[key] = convert_to_dict(value)
                    else:
                        result[key] = value
                return result
            else:
                return obj
        
        return {
            "categorized_tech_stack": convert_to_dict(categorized_data)
        }
    
    def validate_output(self, json_output: Dict[str, Any]) -> Dict[str, Any]:
        """Validate the generated JSON output"""
        validation_results = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "statistics": {}
        }
        
        try:
            tech_stack = json_output.get("categorized_tech_stack", {})
            categories = tech_stack.get("categories", {})
            
            # Validate structure
            if not categories:
                validation_results["errors"].append("No categories found in output")
                validation_results["valid"] = False
            
            # Validate each category
            total_technologies = 0
            for category_name, category_data in categories.items():
                if not isinstance(category_data, dict):
                    validation_results["errors"].append(f"Invalid category data for {category_name}")
                    continue
                
                # Check required fields
                required_fields = ["metadata", "subcategories", "total_count", "visible"]
                for field in required_fields:
                    if field not in category_data:
                        validation_results["errors"].append(
                            f"Missing required field '{field}' in category {category_name}"
                        )
                
                # Count technologies
                subcategories = category_data.get("subcategories", {})
                category_tech_count = 0
                for subcategory_data in subcategories.values():
                    if isinstance(subcategory_data, dict):
                        technologies = subcategory_data.get("technologies", [])
                        category_tech_count += len(technologies)
                
                total_technologies += category_tech_count
                
                # Validate count consistency
                reported_count = category_data.get("total_count", 0)
                if reported_count != category_tech_count:
                    validation_results["warnings"].append(
                        f"Count mismatch in {category_name}: reported {reported_count}, "
                        f"actual {category_tech_count}"
                    )
            
            # Update statistics
            validation_results["statistics"] = {
                "total_categories": len(categories),
                "total_technologies": total_technologies,
                "categories_with_technologies": sum(
                    1 for cat in categories.values() 
                    if cat.get("total_count", 0) > 0
                )
            }
            
        except Exception as e:
            validation_results["valid"] = False
            validation_results["errors"].append(f"Validation failed: {str(e)}")
        
        return validation_results