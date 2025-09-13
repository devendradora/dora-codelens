"""
Data classes and type definitions for the Python-driven tech stack categorization system.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from enum import Enum


class MainCategory(Enum):
    """Main technology categories"""
    BACKEND = "backend"
    FRONTEND = "frontend"
    DATABASES = "databases"
    DEVOPS = "devops"
    OTHERS = "others"


class SubcategoryType(Enum):
    """Subcategory types for organizing technologies"""
    # General subcategories
    LANGUAGES = "languages"
    PACKAGE_MANAGERS = "package-managers"
    FRAMEWORKS = "frameworks"
    LIBRARIES = "libraries"
    TOOLS = "tools"
    
    # Database subcategories
    SQL_DATABASES = "sql-databases"
    NOSQL_DATABASES = "nosql-databases"
    IN_MEMORY = "in-memory"
    
    # DevOps subcategories
    CONTAINERIZATION = "containerization"
    ORCHESTRATION = "orchestration"
    CI_CD = "ci-cd"
    MONITORING = "monitoring"
    
    # Others subcategories
    TESTING = "testing"
    DOCUMENTATION = "documentation"
    MISCELLANEOUS = "miscellaneous"


@dataclass
class TechnologyEntry:
    """Represents a single technology with metadata"""
    name: str
    version: Optional[str] = None
    source: str = "detected"
    confidence: float = 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


@dataclass
class CategoryMetadata:
    """Metadata for a main category"""
    name: str
    display_name: str
    icon: str
    description: str
    color: str


@dataclass
class SubcategoryData:
    """Data for a subcategory including technologies"""
    name: str
    display_name: str
    icon: str
    technologies: List[TechnologyEntry] = field(default_factory=list)
    visible: bool = True
    order: int = 999
    
    def __post_init__(self):
        if self.technologies is None:
            self.technologies = []


@dataclass
class CategoryData:
    """Complete data for a main category"""
    metadata: CategoryMetadata
    subcategories: Dict[str, SubcategoryData] = field(default_factory=dict)
    total_count: int = 0
    visible: bool = True
    layout_hints: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        if self.subcategories is None:
            self.subcategories = {}
        if self.layout_hints is None:
            self.layout_hints = {}


@dataclass
class CategorizedTechStack:
    """Complete categorized tech stack structure"""
    categories: Dict[str, CategoryData] = field(default_factory=dict)
    total_technologies: int = 0
    processing_metadata: Dict[str, Any] = field(default_factory=dict)
    layout_config: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        if self.categories is None:
            self.categories = {}
        if self.processing_metadata is None:
            self.processing_metadata = {}
        if self.layout_config is None:
            self.layout_config = {}


@dataclass
class ClassificationRule:
    """Rule for classifying technologies"""
    pattern: str
    main_category: MainCategory
    subcategory: SubcategoryType
    confidence: float
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}