"""
Category Rules Engine for technology classification.
Handles exact matches, keyword patterns, and regex patterns.
"""

import re
import logging
from typing import Dict, List, Optional, Any
from tech_stack_types import (
    ClassificationRule, MainCategory, SubcategoryType, 
    CategoryMetadata, TechnologyEntry
)
from classification_rules import CLASSIFICATION_RULES

logger = logging.getLogger(__name__)


class CategoryRulesEngine:
    """Engine for applying classification rules to technologies"""
    
    def __init__(self, rules_file: Optional[str] = None):
        self.exact_matches: Dict[str, ClassificationRule] = {}
        self.keyword_patterns: List[Dict[str, Any]] = []
        self.regex_patterns: List[Dict[str, Any]] = []
        self.category_metadata: Dict[MainCategory, Dict[str, Any]] = {}
        self.subcategory_metadata: Dict[SubcategoryType, Dict[str, Any]] = {}
        
        self.load_rules(rules_file)
    
    def load_rules(self, rules_file: Optional[str] = None) -> None:
        """Load classification rules from configuration"""
        try:
            rules_data = CLASSIFICATION_RULES
            
            # Load exact matches
            for tech_name, rule_data in rules_data.get("exact_matches", {}).items():
                self.exact_matches[tech_name.lower()] = ClassificationRule(
                    pattern=tech_name,
                    main_category=rule_data["main_category"],
                    subcategory=rule_data["subcategory"],
                    confidence=rule_data["confidence"],
                    metadata=rule_data.get("metadata", {})
                )
            
            # Load keyword patterns
            self.keyword_patterns = rules_data.get("keyword_patterns", [])
            
            # Load regex patterns (if any)
            self.regex_patterns = rules_data.get("regex_patterns", [])
            
            # Load category metadata
            self.category_metadata = rules_data.get("category_metadata", {})
            
            # Load subcategory metadata
            self.subcategory_metadata = rules_data.get("subcategory_metadata", {})
            
            logger.info(f"Loaded {len(self.exact_matches)} exact matches, "
                       f"{len(self.keyword_patterns)} keyword patterns, "
                       f"{len(self.regex_patterns)} regex patterns")
                       
        except Exception as e:
            logger.error(f"Failed to load classification rules: {e}")
            self._load_fallback_rules()
    
    def _load_fallback_rules(self) -> None:
        """Load minimal fallback rules if main rules fail to load"""
        logger.warning("Loading fallback classification rules")
        
        # Basic fallback rules
        basic_rules = {
            "python": (MainCategory.BACKEND, SubcategoryType.LANGUAGES, 1.0),
            "javascript": (MainCategory.FRONTEND, SubcategoryType.LANGUAGES, 1.0),
            "django": (MainCategory.BACKEND, SubcategoryType.FRAMEWORKS, 1.0),
            "react": (MainCategory.FRONTEND, SubcategoryType.FRAMEWORKS, 1.0),
            "postgresql": (MainCategory.DATABASES, SubcategoryType.SQL_DATABASES, 1.0),
            "docker": (MainCategory.DEVOPS, SubcategoryType.CONTAINERIZATION, 1.0)
        }
        
        for tech_name, (main_cat, sub_cat, confidence) in basic_rules.items():
            self.exact_matches[tech_name] = ClassificationRule(
                pattern=tech_name,
                main_category=main_cat,
                subcategory=sub_cat,
                confidence=confidence,
                metadata={"icon": "📦", "description": f"{tech_name} technology"}
            )
    
    def classify_technology(self, tech_name: str) -> Optional[ClassificationRule]:
        """Apply rules to classify a technology"""
        if not tech_name:
            return None
            
        tech_name_lower = tech_name.lower().strip()
        
        # Try exact match first
        exact_rule = self._try_exact_match(tech_name_lower)
        if exact_rule:
            return exact_rule
        
        # Try keyword patterns
        keyword_rule = self._try_keyword_patterns(tech_name_lower)
        if keyword_rule:
            return keyword_rule
        
        # Try regex patterns
        regex_rule = self._try_regex_patterns(tech_name_lower)
        if regex_rule:
            return regex_rule
        
        # Return fallback classification
        return self._get_fallback_classification(tech_name)
    
    def _try_exact_match(self, tech_name: str) -> Optional[ClassificationRule]:
        """Try to find exact match for technology name"""
        # Direct match
        if tech_name in self.exact_matches:
            return self.exact_matches[tech_name]
        
        # Try variations (remove common suffixes/prefixes)
        variations = [
            tech_name.replace(".js", ""),
            tech_name.replace("-js", ""),
            tech_name.replace("js-", ""),
            tech_name.replace(".py", ""),
            tech_name.replace("python-", ""),
            tech_name.replace("-python", ""),
            tech_name.replace("node-", ""),
            tech_name.replace("-node", "")
        ]
        
        for variation in variations:
            if variation in self.exact_matches:
                rule = self.exact_matches[variation]
                # Reduce confidence slightly for variations
                return ClassificationRule(
                    pattern=rule.pattern,
                    main_category=rule.main_category,
                    subcategory=rule.subcategory,
                    confidence=max(0.8, rule.confidence - 0.1),
                    metadata=rule.metadata
                )
        
        return None
    
    def _try_keyword_patterns(self, tech_name: str) -> Optional[ClassificationRule]:
        """Try to match using keyword patterns"""
        for pattern in self.keyword_patterns:
            keywords = pattern.get("keywords", [])
            
            # Check if any keyword matches
            for keyword in keywords:
                if keyword.lower() in tech_name:
                    return ClassificationRule(
                        pattern=f"keyword:{keyword}",
                        main_category=pattern["main_category"],
                        subcategory=pattern["subcategory"],
                        confidence=pattern.get("confidence", 0.5),
                        metadata={"icon": "🔍", "description": f"Classified by keyword: {keyword}"}
                    )
        
        return None
    
    def _try_regex_patterns(self, tech_name: str) -> Optional[ClassificationRule]:
        """Try to match using regex patterns"""
        for pattern in self.regex_patterns:
            try:
                regex = pattern.get("regex", "")
                if re.search(regex, tech_name, re.IGNORECASE):
                    return ClassificationRule(
                        pattern=f"regex:{regex}",
                        main_category=pattern["main_category"],
                        subcategory=pattern["subcategory"],
                        confidence=pattern.get("confidence", 0.4),
                        metadata={"icon": "🔍", "description": f"Classified by pattern: {regex}"}
                    )
            except re.error as e:
                logger.warning(f"Invalid regex pattern '{regex}': {e}")
                continue
        
        return None
    
    def _get_fallback_classification(self, tech_name: str) -> ClassificationRule:
        """Get fallback classification for unknown technologies"""
        # Simple heuristics for fallback classification
        tech_lower = tech_name.lower()
        
        # Database-related keywords
        if any(keyword in tech_lower for keyword in ["db", "database", "sql", "mongo", "redis"]):
            return ClassificationRule(
                pattern="fallback:database",
                main_category=MainCategory.DATABASES,
                subcategory=SubcategoryType.NOSQL_DATABASES,
                confidence=0.3,
                metadata={"icon": "🗄️", "description": "Database technology (auto-detected)"}
            )
        
        # Frontend-related keywords
        if any(keyword in tech_lower for keyword in ["ui", "css", "html", "frontend", "client"]):
            return ClassificationRule(
                pattern="fallback:frontend",
                main_category=MainCategory.FRONTEND,
                subcategory=SubcategoryType.LIBRARIES,
                confidence=0.3,
                metadata={"icon": "🎨", "description": "Frontend technology (auto-detected)"}
            )
        
        # DevOps-related keywords
        if any(keyword in tech_lower for keyword in ["deploy", "ci", "cd", "docker", "k8s", "ops"]):
            return ClassificationRule(
                pattern="fallback:devops",
                main_category=MainCategory.DEVOPS,
                subcategory=SubcategoryType.TOOLS,
                confidence=0.3,
                metadata={"icon": "⚙️", "description": "DevOps technology (auto-detected)"}
            )
        
        # Default to Others/Miscellaneous
        return ClassificationRule(
            pattern="fallback:unknown",
            main_category=MainCategory.OTHERS,
            subcategory=SubcategoryType.MISCELLANEOUS,
            confidence=0.2,
            metadata={"icon": "❓", "description": "Unknown technology"}
        )
    
    def get_category_metadata(self, category: MainCategory) -> CategoryMetadata:
        """Get metadata for a main category"""
        metadata = self.category_metadata.get(category, {})
        
        return CategoryMetadata(
            name=category.value,
            display_name=metadata.get("display_name", category.value.title()),
            icon=metadata.get("icon", "📦"),
            description=metadata.get("description", f"{category.value} technologies"),
            color=metadata.get("color", "#666666")
        )
    
    def get_subcategory_metadata(self, subcategory: SubcategoryType) -> Dict[str, Any]:
        """Get metadata for a subcategory"""
        metadata = self.subcategory_metadata.get(subcategory, {})
        
        return {
            "name": subcategory.value,
            "display_name": metadata.get("display_name", subcategory.value.replace("-", " ").title()),
            "icon": metadata.get("icon", "🔧"),
            "order": metadata.get("order", 999)
        }
    
    def get_all_categories(self) -> List[MainCategory]:
        """Get all available main categories"""
        return list(MainCategory)
    
    def get_subcategories_for_category(self, category: MainCategory) -> List[SubcategoryType]:
        """Get relevant subcategories for a main category"""
        category_subcategories = {
            MainCategory.BACKEND: [
                SubcategoryType.LANGUAGES,
                SubcategoryType.FRAMEWORKS,
                SubcategoryType.LIBRARIES,
                SubcategoryType.PACKAGE_MANAGERS,
                SubcategoryType.TOOLS
            ],
            MainCategory.FRONTEND: [
                SubcategoryType.LANGUAGES,
                SubcategoryType.FRAMEWORKS,
                SubcategoryType.LIBRARIES,
                SubcategoryType.PACKAGE_MANAGERS,
                SubcategoryType.TOOLS
            ],
            MainCategory.DATABASES: [
                SubcategoryType.SQL_DATABASES,
                SubcategoryType.NOSQL_DATABASES,
                SubcategoryType.IN_MEMORY,
                SubcategoryType.TOOLS
            ],
            MainCategory.DEVOPS: [
                SubcategoryType.CONTAINERIZATION,
                SubcategoryType.ORCHESTRATION,
                SubcategoryType.CI_CD,
                SubcategoryType.MONITORING,
                SubcategoryType.TOOLS
            ],
            MainCategory.OTHERS: [
                SubcategoryType.TESTING,
                SubcategoryType.DOCUMENTATION,
                SubcategoryType.MISCELLANEOUS,
                SubcategoryType.TOOLS
            ]
        }
        
        return category_subcategories.get(category, [SubcategoryType.MISCELLANEOUS])
    
    def validate_rules(self) -> Dict[str, Any]:
        """Validate loaded rules and return statistics"""
        stats = {
            "exact_matches": len(self.exact_matches),
            "keyword_patterns": len(self.keyword_patterns),
            "regex_patterns": len(self.regex_patterns),
            "categories": len(self.category_metadata),
            "subcategories": len(self.subcategory_metadata),
            "validation_errors": []
        }
        
        # Validate exact matches
        for tech_name, rule in self.exact_matches.items():
            if not isinstance(rule.main_category, MainCategory):
                stats["validation_errors"].append(f"Invalid main category for {tech_name}")
            if not isinstance(rule.subcategory, SubcategoryType):
                stats["validation_errors"].append(f"Invalid subcategory for {tech_name}")
            if not 0 <= rule.confidence <= 1:
                stats["validation_errors"].append(f"Invalid confidence for {tech_name}")
        
        return stats