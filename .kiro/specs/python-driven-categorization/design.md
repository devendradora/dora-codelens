# Design Document

## Overview

The Python-driven categorization system will completely restructure how DoraCodeLens handles tech stack categorization. Instead of having categorization logic split between Python analysis and TypeScript rendering, all categorization logic, rules, and category definitions will be centralized in the Python analyzer. The Python code will output complete JSON structures containing fully categorized technologies with metadata, which the TypeScript code will simply render without any categorization logic.

This design eliminates the current duplication of categorization rules, provides a single source of truth for technology classification, and makes the system more maintainable and extensible.

## Architecture

### Current Architecture Issues
```
Current Flow:
Python Analyzer → Basic Tech Data → TypeScript Categorizer → Rendered Categories
                                   ↑
                              Hardcoded Rules
```

### New Architecture
```
New Flow:
Python Analyzer → Complete Categorized JSON → TypeScript Renderer → Displayed Categories
        ↑
   All Rules & Logic
```

### Component Structure

```
Python-Driven Categorization System
├── Python Analyzer (analyzer/)
│   ├── TechStackCategorizer
│   │   ├── classify_technology()
│   │   ├── generate_category_structure()
│   │   └── output_categorized_json()
│   ├── CategoryRulesEngine
│   │   ├── load_classification_rules()
│   │   ├── match_technology()
│   │   └── get_category_metadata()
│   └── SubcategoryOrganizer
│       ├── organize_by_type()
│       ├── apply_subcategory_rules()
│       └── generate_layout_hints()
└── TypeScript Renderer (src/)
    ├── CategoryDisplayManager
    │   ├── renderCategorizedData()
    │   ├── applyFullWidthLayout()
    │   └── handleEmptyStates()
    └── JSONDataProcessor
        ├── validateCategoryData()
        ├── processLayoutHints()
        └── handleRenderingErrors()
```

## Data Flow

### 1. Python Analysis Phase
1. **Technology Detection**: Scan project files, dependencies, and code patterns
2. **Classification**: Apply comprehensive rules to classify each technology
3. **Categorization**: Organize technologies into main categories and subcategories
4. **Metadata Generation**: Add icons, descriptions, confidence scores, and layout hints
5. **JSON Output**: Generate complete categorized structure

### 2. TypeScript Rendering Phase
1. **Data Reception**: Receive complete categorized JSON from Python
2. **Validation**: Validate JSON structure and handle errors gracefully
3. **Layout Application**: Apply full-width layout using Python-provided hints
4. **Rendering**: Display categories without any categorization logic

## Framework vs Library Classification

### Primary Framework Detection

The system will distinguish between primary architectural frameworks and supporting libraries/tools:

#### Backend Primary Frameworks
- **Django**: Full-featured web framework
- **Flask**: Lightweight web framework  
- **FastAPI**: Modern async web framework
- **Express**: Node.js web framework
- **Spring**: Java enterprise framework
- **Laravel**: PHP web framework
- **Rails**: Ruby web framework

#### Frontend Primary Frameworks
- **React**: UI library/framework
- **Vue**: Progressive framework
- **Angular**: Full-featured framework
- **Next.js**: React meta-framework
- **Nuxt**: Vue meta-framework
- **Svelte**: Compile-time framework
- **Ember**: Opinionated framework

#### Supporting Libraries (moved from frameworks)
- **Backend**: Celery, Gunicorn, uWSGI, Redis, Nginx
- **Frontend**: Webpack, Babel, ESLint, Prettier, Vite
- **Testing**: Jest, Pytest, Mocha, Cypress
- **Build Tools**: Gulp, Grunt, Rollup, Parcel

### Classification Algorithm

```python
class FrameworkClassifier:
    PRIMARY_FRAMEWORKS = {
        'backend': ['django', 'flask', 'fastapi', 'express', 'spring', 'laravel', 'rails'],
        'frontend': ['react', 'vue', 'angular', 'nextjs', 'nuxt', 'svelte', 'ember']
    }
    
    SUPPORTING_TOOLS = {
        'servers': ['gunicorn', 'uwsgi', 'nginx', 'apache'],
        'task_queues': ['celery', 'rq', 'dramatiq'],
        'build_tools': ['webpack', 'babel', 'vite', 'rollup'],
        'testing': ['pytest', 'jest', 'mocha', 'cypress'],
        'linting': ['eslint', 'flake8', 'pylint', 'prettier']
    }
    
    def classify_framework_or_library(self, tech_name: str, category: str) -> str:
        """Determine if technology should be in frameworks or libraries subcategory"""
        tech_lower = tech_name.lower()
        
        # Check if it's a primary framework
        if category in self.PRIMARY_FRAMEWORKS:
            for framework in self.PRIMARY_FRAMEWORKS[category]:
                if framework in tech_lower or tech_lower in framework:
                    return 'frameworks'
        
        # Check if it's a supporting tool
        for tool_type, tools in self.SUPPORTING_TOOLS.items():
            for tool in tools:
                if tool in tech_lower or tech_lower in tool:
                    return 'libraries'
        
        # Default classification based on common patterns
        if any(pattern in tech_lower for pattern in ['server', 'wsgi', 'asgi']):
            return 'libraries'
        if any(pattern in tech_lower for pattern in ['build', 'bundle', 'compile']):
            return 'libraries'
        if any(pattern in tech_lower for pattern in ['test', 'mock', 'spec']):
            return 'libraries'
        if any(pattern in tech_lower for pattern in ['lint', 'format', 'style']):
            return 'libraries'
            
        # If uncertain, default to libraries for safety
        return 'libraries'
```

## Components and Interfaces

### Python Components

#### TechStackCategorizer Class

```python
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum

class MainCategory(Enum):
    BACKEND = "backend"
    FRONTEND = "frontend"
    DATABASES = "databases"
    DEVOPS = "devops"
    OTHERS = "others"

class SubcategoryType(Enum):
    LANGUAGES = "languages"
    PACKAGE_MANAGERS = "package-managers"
    FRAMEWORKS = "frameworks"
    LIBRARIES = "libraries"
    TOOLS = "tools"
    SQL_DATABASES = "sql-databases"
    NOSQL_DATABASES = "nosql-databases"
    IN_MEMORY = "in-memory"
    CONTAINERIZATION = "containerization"
    ORCHESTRATION = "orchestration"
    CI_CD = "ci-cd"
    MONITORING = "monitoring"
    TESTING = "testing"
    DOCUMENTATION = "documentation"
    MISCELLANEOUS = "miscellaneous"

@dataclass
class TechnologyEntry:
    name: str
    version: Optional[str] = None
    source: str = "detected"
    confidence: float = 1.0
    metadata: Dict[str, Any] = None

@dataclass
class CategoryMetadata:
    name: str
    display_name: str
    icon: str
    description: str
    color: str

@dataclass
class SubcategoryData:
    name: str
    display_name: str
    icon: str
    technologies: List[TechnologyEntry]
    visible: bool = True

@dataclass
class CategoryData:
    metadata: CategoryMetadata
    subcategories: Dict[str, SubcategoryData]
    total_count: int
    visible: bool = True
    layout_hints: Dict[str, Any] = None

@dataclass
class CategorizedTechStack:
    categories: Dict[str, CategoryData]
    total_technologies: int
    processing_metadata: Dict[str, Any]
    layout_config: Dict[str, Any]

class TechStackCategorizer:
    def __init__(self, rules_engine: 'CategoryRulesEngine'):
        self.rules_engine = rules_engine
        self.subcategory_organizer = SubcategoryOrganizer()
    
    def categorize_technologies(self, technologies: List[Any], 
                              analysis_data: Dict[str, Any]) -> CategorizedTechStack:
        """Main categorization method that processes all technologies"""
        pass
    
    def classify_single_technology(self, tech_name: str) -> Dict[str, Any]:
        """Classify a single technology and return full metadata"""
        pass
    
    def generate_output_json(self, categorized_data: CategorizedTechStack) -> Dict[str, Any]:
        """Generate final JSON output for TypeScript consumption"""
        pass
```

#### CategoryRulesEngine Class

```python
@dataclass
class ClassificationRule:
    pattern: str
    main_category: MainCategory
    subcategory: SubcategoryType
    confidence: float
    metadata: Dict[str, Any]

class CategoryRulesEngine:
    def __init__(self, rules_file: Optional[str] = None):
        self.exact_matches: Dict[str, ClassificationRule] = {}
        self.keyword_patterns: List[ClassificationRule] = []
        self.regex_patterns: List[ClassificationRule] = []
        self.load_rules(rules_file)
    
    def load_rules(self, rules_file: Optional[str] = None):
        """Load classification rules from configuration"""
        pass
    
    def classify_technology(self, tech_name: str) -> ClassificationRule:
        """Apply rules to classify a technology"""
        pass
    
    def get_category_metadata(self, category: MainCategory) -> CategoryMetadata:
        """Get metadata for a main category"""
        pass
    
    def get_subcategory_metadata(self, subcategory: SubcategoryType) -> Dict[str, Any]:
        """Get metadata for a subcategory"""
        pass
```

#### Classification Rules Configuration

```python
# classification_rules.py
CLASSIFICATION_RULES = {
    "exact_matches": {
        "python": {
            "main_category": "backend",
            "subcategory": "languages",
            "confidence": 1.0,
            "metadata": {
                "icon": "🐍",
                "description": "Python programming language",
                "official_site": "https://python.org"
            }
        },
        "django": {
            "main_category": "backend",
            "subcategory": "frameworks",
            "confidence": 1.0,
            "metadata": {
                "icon": "🎸",
                "description": "High-level Python web framework",
                "official_site": "https://djangoproject.com",
                "framework_type": "primary"
            }
        },
        "flask": {
            "main_category": "backend",
            "subcategory": "frameworks",
            "confidence": 1.0,
            "metadata": {
                "icon": "🌶️",
                "description": "Lightweight Python web framework",
                "official_site": "https://flask.palletsprojects.com",
                "framework_type": "primary"
            }
        },
        "fastapi": {
            "main_category": "backend",
            "subcategory": "frameworks",
            "confidence": 1.0,
            "metadata": {
                "icon": "⚡",
                "description": "Modern, fast Python web framework",
                "official_site": "https://fastapi.tiangolo.com",
                "framework_type": "primary"
            }
        },
        "celery": {
            "main_category": "backend",
            "subcategory": "libraries",
            "confidence": 0.9,
            "metadata": {
                "icon": "🌿",
                "description": "Distributed task queue",
                "official_site": "https://celeryproject.org",
                "framework_type": "supporting"
            }
        },
        "gunicorn": {
            "main_category": "backend",
            "subcategory": "libraries",
            "confidence": 0.9,
            "metadata": {
                "icon": "🦄",
                "description": "Python WSGI HTTP Server",
                "official_site": "https://gunicorn.org",
                "framework_type": "server"
            }
        },
        "react": {
            "main_category": "frontend",
            "subcategory": "frameworks",
            "confidence": 1.0,
            "metadata": {
                "icon": "⚛️",
                "description": "JavaScript library for building user interfaces",
                "official_site": "https://reactjs.org"
            }
        },
        "docker": {
            "main_category": "devops",
            "subcategory": "containerization",
            "confidence": 1.0,
            "metadata": {
                "icon": "🐳",
                "description": "Platform for developing, shipping, and running applications",
                "official_site": "https://docker.com"
            }
        },
        "postgresql": {
            "main_category": "databases",
            "subcategory": "sql-databases",
            "confidence": 1.0,
            "metadata": {
                "icon": "🐘",
                "description": "Advanced open source relational database",
                "official_site": "https://postgresql.org"
            }
        }
    },
    "keyword_patterns": [
        {
            "keywords": ["test", "testing", "spec", "mock"],
            "main_category": "others",
            "subcategory": "testing",
            "confidence": 0.8
        },
        {
            "keywords": ["api", "rest", "graphql", "server"],
            "main_category": "backend",
            "subcategory": "frameworks",
            "confidence": 0.7
        }
    ],
    "category_metadata": {
        "backend": {
            "display_name": "Backend",
            "icon": "🔧",
            "description": "Server-side frameworks, languages, and APIs",
            "color": "#4CAF50"
        },
        "frontend": {
            "display_name": "Frontend",
            "icon": "🎨",
            "description": "Client-side frameworks, libraries, and UI tools",
            "color": "#2196F3"
        },
        "databases": {
            "display_name": "Databases",
            "icon": "🗄️",
            "description": "Database systems and storage solutions",
            "color": "#607D8B"
        },
        "devops": {
            "display_name": "DevOps",
            "icon": "⚙️",
            "description": "Deployment, infrastructure, and operational tools",
            "color": "#FF9800"
        },
        "others": {
            "display_name": "Others",
            "icon": "📦",
            "description": "Development utilities, testing tools, and libraries",
            "color": "#9C27B0"
        }
    },
    "subcategory_metadata": {
        "languages": {
            "display_name": "Programming Languages",
            "icon": "💻",
            "order": 1
        },
        "package-managers": {
            "display_name": "Package Managers",
            "icon": "📦",
            "order": 2
        },
        "frameworks": {
            "display_name": "Frameworks",
            "icon": "🏗️",
            "order": 3
        },
        "libraries": {
            "display_name": "Libraries & Tools",
            "icon": "🔧",
            "order": 4
        }
    }
}
```

### JSON Output Structure

```json
{
  "categorized_tech_stack": {
    "categories": {
      "backend": {
        "metadata": {
          "name": "backend",
          "display_name": "Backend",
          "icon": "🔧",
          "description": "Server-side frameworks, languages, and APIs",
          "color": "#4CAF50"
        },
        "subcategories": {
          "languages": {
            "name": "languages",
            "display_name": "Programming Languages",
            "icon": "💻",
            "technologies": [
              {
                "name": "Python",
                "version": "3.9.7",
                "source": "detected",
                "confidence": 1.0,
                "metadata": {
                  "icon": "🐍",
                  "description": "Python programming language",
                  "official_site": "https://python.org"
                }
              }
            ],
            "visible": true
          },
          "frameworks": {
            "name": "frameworks",
            "display_name": "Web Frameworks",
            "icon": "🏗️",
            "technologies": [
              {
                "name": "Django",
                "version": "4.2.0",
                "source": "requirements.txt",
                "confidence": 1.0,
                "metadata": {
                  "icon": "🎸",
                  "description": "High-level Python web framework"
                }
              }
            ],
            "visible": true
          }
        },
        "total_count": 2,
        "visible": true,
        "layout_hints": {
          "full_width": true,
          "subcategory_layout": "grid",
          "responsive_breakpoints": {
            "mobile": 1,
            "tablet": 2,
            "desktop": 3
          }
        }
      },
      "frontend": {
        "metadata": {
          "name": "frontend",
          "display_name": "Frontend",
          "icon": "🎨",
          "description": "Client-side frameworks, libraries, and UI tools",
          "color": "#2196F3"
        },
        "subcategories": {},
        "total_count": 0,
        "visible": true,
        "layout_hints": {
          "full_width": true,
          "empty_state_message": "No frontend technologies detected in this project"
        }
      }
    },
    "total_technologies": 2,
    "processing_metadata": {
      "processing_time_ms": 150,
      "rules_applied": 45,
      "confidence_threshold": 0.5,
      "detection_methods": ["file_analysis", "dependency_parsing", "code_patterns"]
    },
    "layout_config": {
      "full_width_categories": true,
      "show_empty_categories": true,
      "responsive_design": true,
      "category_order": ["backend", "frontend", "databases", "devops", "others"]
    }
  }
}
```

### TypeScript Components

#### CategoryDisplayManager Class

```typescript
interface CategorizedTechStackData {
  categorized_tech_stack: {
    categories: Record<string, CategoryData>;
    total_technologies: number;
    processing_metadata: ProcessingMetadata;
    layout_config: LayoutConfig;
  };
}

interface CategoryData {
  metadata: CategoryMetadata;
  subcategories: Record<string, SubcategoryData>;
  total_count: number;
  visible: boolean;
  layout_hints: LayoutHints;
}

interface LayoutHints {
  full_width: boolean;
  subcategory_layout: 'grid' | 'list' | 'cards';
  responsive_breakpoints: Record<string, number>;
  empty_state_message?: string;
}

class CategoryDisplayManager {
  constructor(private errorHandler: ErrorHandler) {}

  public renderCategorizedData(data: CategorizedTechStackData): string {
    try {
      this.validateData(data);
      return this.generateCategoryHTML(data);
    } catch (error) {
      this.errorHandler.logError('Failed to render categorized data', error, 'CategoryDisplayManager');
      return this.generateErrorHTML('Failed to display tech stack categories');
    }
  }

  private generateCategoryHTML(data: CategorizedTechStackData): string {
    const { categories, layout_config } = data.categorized_tech_stack;
    const categoryOrder = layout_config.category_order || Object.keys(categories);
    
    let html = '<div class="tech-stack-categories">';
    
    for (const categoryName of categoryOrder) {
      const category = categories[categoryName];
      if (!category || (!category.visible && !layout_config.show_empty_categories)) {
        continue;
      }
      
      html += this.renderSingleCategory(categoryName, category);
    }
    
    html += '</div>';
    return html;
  }

  private renderSingleCategory(categoryName: string, category: CategoryData): string {
    const { metadata, subcategories, total_count, layout_hints } = category;
    
    let html = `
      <div class="tech-category-section" data-category="${categoryName}">
        <div class="tech-category-header">
          <span class="tech-category-icon">${metadata.icon}</span>
          <h3 class="tech-category-title">${metadata.display_name}</h3>
          <span class="tech-category-count">${total_count}</span>
        </div>
        <div class="tech-category-content">
    `;
    
    if (total_count === 0) {
      const emptyMessage = layout_hints.empty_state_message || 
                          `No ${metadata.display_name.toLowerCase()} technologies detected`;
      html += `<div class="tech-empty-state">${emptyMessage}</div>`;
    } else {
      html += this.renderSubcategories(subcategories, layout_hints);
    }
    
    html += '</div></div>';
    return html;
  }

  private renderSubcategories(subcategories: Record<string, SubcategoryData>, 
                             layoutHints: LayoutHints): string {
    let html = '';
    
    // Sort subcategories by order if available
    const sortedSubcategories = Object.entries(subcategories)
      .sort(([,a], [,b]) => (a.order || 999) - (b.order || 999));
    
    for (const [subcategoryName, subcategory] of sortedSubcategories) {
      if (!subcategory.visible || subcategory.technologies.length === 0) {
        continue;
      }
      
      html += `
        <div class="tech-subcategory" data-subcategory="${subcategoryName}">
          <div class="tech-subcategory-header">
            <span class="tech-subcategory-icon">${subcategory.icon}</span>
            <span class="tech-subcategory-title">${subcategory.display_name}</span>
          </div>
          <div class="tech-list ${layoutHints.subcategory_layout || 'grid'}">
            ${this.renderTechnologies(subcategory.technologies)}
          </div>
        </div>
      `;
    }
    
    return html;
  }

  private renderTechnologies(technologies: TechnologyEntry[]): string {
    return technologies.map(tech => `
      <div class="tech-item" data-confidence="${tech.confidence}">
        <span class="tech-icon">${tech.metadata?.icon || '📦'}</span>
        <div class="tech-info">
          <span class="tech-name">${tech.name}</span>
          ${tech.version ? `<span class="tech-version">${tech.version}</span>` : ''}
        </div>
        <div class="tech-confidence" title="Confidence: ${(tech.confidence * 100).toFixed(0)}%">
          ${this.getConfidenceIndicator(tech.confidence)}
        </div>
      </div>
    `).join('');
  }

  private getConfidenceIndicator(confidence: number): string {
    if (confidence >= 0.9) return '🟢';
    if (confidence >= 0.7) return '🟡';
    return '🔴';
  }
}
```

## Enhanced CSS Layout System

### Full-Width Category Layout

```css
/* Main container for all tech stack categories */
.tech-stack-categories {
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0;
}

/* Individual category section - full width */
.tech-category-section {
  width: 100%;
  margin-bottom: 2rem;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--vscode-editor-background);
}

/* Category header - full width with flex layout */
.tech-category-header {
  width: 100%;
  padding: 1rem 1.5rem;
  background: var(--vscode-editor-background);
  border-bottom: 1px solid var(--vscode-panel-border);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-sizing: border-box;
}

.tech-category-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.tech-category-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--vscode-foreground);
  margin: 0;
  flex-grow: 1;
}

.tech-category-count {
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  flex-shrink: 0;
}

/* Category content area */
.tech-category-content {
  width: 100%;
  padding: 1.5rem;
  box-sizing: border-box;
}

/* Subcategory sections */
.tech-subcategory {
  margin-bottom: 1.5rem;
}

.tech-subcategory:last-child {
  margin-bottom: 0;
}

.tech-subcategory-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  color: var(--vscode-foreground);
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--vscode-panel-border);
}

/* Technology lists with responsive grid */
.tech-list.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
}

.tech-list.list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tech-list.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

/* Individual technology items */
.tech-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: 6px;
  transition: all 0.2s ease;
  position: relative;
}

.tech-item:hover {
  background: var(--vscode-list-hoverBackground);
  border-color: var(--vscode-focusBorder);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.tech-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.tech-info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tech-name {
  font-weight: 500;
  color: var(--vscode-foreground);
}

.tech-version {
  font-size: 0.875rem;
  color: var(--vscode-descriptionForeground);
}

.tech-confidence {
  flex-shrink: 0;
  font-size: 0.875rem;
}

/* Empty state styling */
.tech-empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--vscode-descriptionForeground);
  font-style: italic;
  background: var(--vscode-input-background);
  border: 1px dashed var(--vscode-input-border);
  border-radius: 6px;
}

/* Responsive design */
@media (max-width: 768px) {
  .tech-list.grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
  
  .tech-category-content {
    padding: 1rem;
  }
  
  .tech-category-header {
    padding: 0.75rem 1rem;
  }
}

@media (max-width: 480px) {
  .tech-list.grid,
  .tech-list.cards {
    grid-template-columns: 1fr;
  }
  
  .tech-category-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .tech-category-title {
    font-size: 1.125rem;
  }
}
```

## Error Handling and Fallbacks

### Python Error Handling

```python
class TechStackCategorizationError(Exception):
    """Custom exception for categorization errors"""
    pass

class TechStackCategorizer:
    def categorize_technologies(self, technologies: List[Any], 
                              analysis_data: Dict[str, Any]) -> CategorizedTechStack:
        try:
            return self._perform_categorization(technologies, analysis_data)
        except Exception as e:
            logger.error(f"Categorization failed: {e}")
            return self._generate_fallback_structure(technologies)
    
    def _generate_fallback_structure(self, technologies: List[Any]) -> CategorizedTechStack:
        """Generate minimal structure when categorization fails"""
        fallback_categories = {}
        
        for category_name in ["backend", "frontend", "databases", "devops", "others"]:
            fallback_categories[category_name] = CategoryData(
                metadata=self._get_default_category_metadata(category_name),
                subcategories={},
                total_count=0,
                visible=True,
                layout_hints={"full_width": True, "empty_state_message": "Categorization unavailable"}
            )
        
        return CategorizedTechStack(
            categories=fallback_categories,
            total_technologies=0,
            processing_metadata={"error": "Categorization failed", "fallback_mode": True},
            layout_config={"full_width_categories": True, "show_empty_categories": True}
        )
```

### TypeScript Error Handling

```typescript
class CategoryDisplayManager {
  private validateData(data: CategorizedTechStackData): void {
    if (!data?.categorized_tech_stack) {
      throw new Error('Invalid categorized tech stack data structure');
    }
    
    if (!data.categorized_tech_stack.categories) {
      throw new Error('Missing categories in tech stack data');
    }
  }

  private generateErrorHTML(message: string): string {
    return `
      <div class="tech-stack-error">
        <div class="error-icon">⚠️</div>
        <div class="error-message">${message}</div>
        <div class="error-details">Please check the console for more information.</div>
      </div>
    `;
  }
}
```

## Performance Optimization

### Python Performance

```python
class TechStackCategorizer:
    def __init__(self, rules_engine: 'CategoryRulesEngine'):
        self.rules_engine = rules_engine
        self.classification_cache: Dict[str, ClassificationRule] = {}
        self.batch_size = 50
    
    def categorize_technologies(self, technologies: List[Any], 
                              analysis_data: Dict[str, Any]) -> CategorizedTechStack:
        # Process in batches for better memory management
        total_technologies = len(technologies) if technologies else 0
        
        if total_technologies > self.batch_size:
            return self._process_in_batches(technologies, analysis_data)
        else:
            return self._process_all_at_once(technologies, analysis_data)
    
    def _process_in_batches(self, technologies: List[Any], 
                           analysis_data: Dict[str, Any]) -> CategorizedTechStack:
        """Process large technology lists in batches"""
        categorized_data = self._initialize_empty_structure()
        
        for i in range(0, len(technologies), self.batch_size):
            batch = technologies[i:i + self.batch_size]
            batch_result = self._process_batch(batch, analysis_data)
            self._merge_batch_results(categorized_data, batch_result)
        
        return categorized_data
```

### TypeScript Performance

```typescript
class CategoryDisplayManager {
  private renderLargeCategoryList(technologies: TechnologyEntry[]): string {
    // Use document fragments for better performance with large lists
    const batchSize = 20;
    let html = '';
    
    for (let i = 0; i < technologies.length; i += batchSize) {
      const batch = technologies.slice(i, i + batchSize);
      html += this.renderTechnologyBatch(batch);
    }
    
    return html;
  }
  
  private renderTechnologyBatch(technologies: TechnologyEntry[]): string {
    return technologies.map(tech => this.renderSingleTechnology(tech)).join('');
  }
}
```

## Testing Strategy

### Python Unit Tests

```python
import unittest
from unittest.mock import Mock, patch
from tech_stack_categorizer import TechStackCategorizer, CategoryRulesEngine

class TestTechStackCategorizer(unittest.TestCase):
    def setUp(self):
        self.rules_engine = Mock(spec=CategoryRulesEngine)
        self.categorizer = TechStackCategorizer(self.rules_engine)
    
    def test_categorize_python_technology(self):
        """Test Python technology classification"""
        technologies = [{"name": "django", "version": "4.2.0"}]
        result = self.categorizer.categorize_technologies(technologies, {})
        
        self.assertIn("backend", result.categories)
        backend_category = result.categories["backend"]
        self.assertIn("frameworks", backend_category.subcategories)
        
    def test_empty_categories_always_visible(self):
        """Test that empty categories are always included"""
        result = self.categorizer.categorize_technologies([], {})
        
        expected_categories = ["backend", "frontend", "databases", "devops", "others"]
        for category_name in expected_categories:
            self.assertIn(category_name, result.categories)
            self.assertTrue(result.categories[category_name].visible)
    
    def test_json_output_structure(self):
        """Test JSON output has correct structure"""
        technologies = [{"name": "python"}]
        result = self.categorizer.categorize_technologies(technologies, {})
        json_output = self.categorizer.generate_output_json(result)
        
        self.assertIn("categorized_tech_stack", json_output)
        self.assertIn("categories", json_output["categorized_tech_stack"])
        self.assertIn("layout_config", json_output["categorized_tech_stack"])
```

### TypeScript Unit Tests

```typescript
import { CategoryDisplayManager } from '../services/category-display-manager';
import { ErrorHandler } from '../core/error-handler';

describe('CategoryDisplayManager', () => {
  let categoryDisplayManager: CategoryDisplayManager;
  let mockErrorHandler: jest.Mocked<ErrorHandler>;

  beforeEach(() => {
    mockErrorHandler = {
      logError: jest.fn()
    } as any;
    categoryDisplayManager = new CategoryDisplayManager(mockErrorHandler);
  });

  test('should render categorized data correctly', () => {
    const mockData = {
      categorized_tech_stack: {
        categories: {
          backend: {
            metadata: {
              name: 'backend',
              display_name: 'Backend',
              icon: '🔧',
              description: 'Backend technologies',
              color: '#4CAF50'
            },
            subcategories: {
              languages: {
                name: 'languages',
                display_name: 'Programming Languages',
                icon: '💻',
                technologies: [
                  {
                    name: 'Python',
                    version: '3.9.7',
                    confidence: 1.0,
                    metadata: { icon: '🐍' }
                  }
                ],
                visible: true
              }
            },
            total_count: 1,
            visible: true,
            layout_hints: { full_width: true }
          }
        },
        total_technologies: 1,
        processing_metadata: {},
        layout_config: { full_width_categories: true }
      }
    };

    const html = categoryDisplayManager.renderCategorizedData(mockData);
    
    expect(html).toContain('tech-category-section');
    expect(html).toContain('Backend');
    expect(html).toContain('Python');
    expect(html).toContain('🐍');
  });

  test('should handle empty categories correctly', () => {
    const mockData = {
      categorized_tech_stack: {
        categories: {
          frontend: {
            metadata: {
              name: 'frontend',
              display_name: 'Frontend',
              icon: '🎨',
              description: 'Frontend technologies',
              color: '#2196F3'
            },
            subcategories: {},
            total_count: 0,
            visible: true,
            layout_hints: {
              full_width: true,
              empty_state_message: 'No frontend technologies detected'
            }
          }
        },
        total_technologies: 0,
        processing_metadata: {},
        layout_config: { show_empty_categories: true }
      }
    };

    const html = categoryDisplayManager.renderCategorizedData(mockData);
    
    expect(html).toContain('tech-empty-state');
    expect(html).toContain('No frontend technologies detected');
  });
});
```

## Implementation Phases

### Phase 1: Python Categorization Engine (Week 1-2)
- Implement `TechStackCategorizer` class
- Create `CategoryRulesEngine` with comprehensive rules
- Add `SubcategoryOrganizer` for proper organization
- Implement JSON output generation
- Add comprehensive error handling and fallbacks

### Phase 2: TypeScript Renderer Refactoring (Week 2-3)
- Create `CategoryDisplayManager` for pure rendering
- Remove all categorization logic from TypeScript
- Implement JSON data validation and error handling
- Add full-width layout CSS system
- Update webview integration

### Phase 3: Integration and Testing (Week 3-4)
- Integrate Python categorizer with existing analyzer
- Update webview to use new JSON structure
- Implement comprehensive test suites
- Add performance optimizations
- Conduct end-to-end testing

### Phase 4: Polish and Documentation (Week 4)
- Add configuration options for rules
- Implement extensibility features
- Create comprehensive documentation
- Optimize performance for large datasets
- Final testing and bug fixes