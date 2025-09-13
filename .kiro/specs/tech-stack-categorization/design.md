# Design Document

## Overview

The Tech Stack Categorization feature will enhance the existing full code analysis webview by organizing technologies into four distinct categories: Backend, Frontend, DevOps, and Others. This design builds upon the existing tech stack analysis improvements and adds intelligent categorization logic with responsive visual organization.

## Architecture

### Component Structure

```
FullCodeAnalysisWebview
├── generateTechStackAnalysisHtml()
│   ├── categorizeTechnologies()
│   ├── generateCategorizedSections()
│   │   ├── generateBackendSection()
│   │   ├── generateFrontendSection()
│   │   ├── generateDatabasesSection()
│   │   ├── generateDevOpsSection()
│   │   └── generateOthersSection()
│   └── generateCategoryGrid()
├── TechnologyCategorizer
│   ├── classifyTechnology()
│   ├── getCategoryMappings()
│   ├── performKeywordClassification()
│   └── resolveCategoryConflicts()
└── CategoryRenderer
    ├── renderCategorySection()
    ├── renderCategoryHeader()
    └── renderTechnologyGrid()
```

### Data Flow

1. **Input:** Tech stack data from analysis results
2. **Classification:** Categorize each technology using mapping and keyword logic
3. **Grouping:** Organize technologies into category collections
4. **Rendering:** Generate HTML for each category with responsive styling
5. **Output:** Categorized tech stack sections with visual organization

## Components and Interfaces

### Technology Categorizer

```typescript
interface TechnologyCategory {
  name: string;
  icon: string;
  technologies: ProcessedTechnology[];
  count: number;
}

interface ProcessedTechnology {
  name: string;
  version?: string;
  category: 'backend' | 'frontend' | 'database' | 'devops' | 'others';
  confidence: number;
}

class TechnologyCategorizer {
  private categoryMappings: Map<string, string>;
  private keywordMappings: Map<string, string[]>;
  
  categorizeTechnologies(technologies: any[]): Map<string, TechnologyCategory>
  classifyTechnology(techName: string): string
  getCategoryMappings(): Map<string, string>
  performKeywordClassification(techName: string): string
  resolveCategoryConflicts(techName: string, categories: string[]): string
}
```

### Category Mappings

```typescript
const TECHNOLOGY_CATEGORIES = {
  backend: {
    exact: [
      'django', 'flask', 'fastapi', 'tornado', 'pyramid', 'bottle',
      'cherrypy', 'web2py', 'falcon', 'sanic', 'quart', 'starlette',
      'sqlalchemy', 'django-orm', 'peewee', 'tortoise-orm',
      'celery', 'rq', 'dramatiq', 'huey',
      'redis', 'pymongo', 'psycopg2', 'mysql-connector-python',
      'pyjwt', 'passlib', 'bcrypt', 'cryptography',
      'gunicorn', 'uwsgi', 'waitress', 'hypercorn'
    ],
    keywords: [
      'api', 'server', 'database', 'orm', 'auth', 'jwt', 'crypto',
      'queue', 'cache', 'wsgi', 'asgi', 'middleware'
    ]
  },
  frontend: {
    exact: [
      'react', 'vue', 'angular', 'svelte', 'jquery', 'backbone',
      'bootstrap', 'tailwindcss', 'bulma', 'foundation',
      'webpack', 'vite', 'rollup', 'parcel', 'esbuild',
      'sass', 'less', 'stylus', 'postcss',
      'typescript', 'babel', 'eslint', 'prettier'
    ],
    keywords: [
      'ui', 'component', 'css', 'style', 'theme', 'design',
      'build', 'bundle', 'compile', 'transpile', 'lint'
    ]
  },
  devops: {
    exact: [
      'docker', 'kubernetes', 'helm', 'terraform', 'ansible',
      'jenkins', 'github-actions', 'gitlab-ci', 'circleci',
      'aws', 'azure', 'gcp', 'boto3', 'azure-sdk',
      'prometheus', 'grafana', 'elk', 'datadog', 'newrelic',
      'nginx', 'apache', 'traefik', 'consul', 'vault'
    ],
    keywords: [
      'deploy', 'container', 'orchestration', 'cloud', 'infra',
      'monitor', 'log', 'metric', 'alert', 'ci', 'cd',
      'proxy', 'load-balancer', 'service-mesh'
    ]
  },
  others: {
    exact: [
      'pytest', 'unittest', 'nose', 'tox', 'coverage',
      'requests', 'httpx', 'aiohttp', 'urllib3',
      'numpy', 'pandas', 'matplotlib', 'seaborn', 'plotly',
      'pillow', 'opencv', 'scikit-learn', 'tensorflow', 'pytorch',
      'black', 'flake8', 'mypy', 'isort', 'bandit'
    ],
    keywords: [
      'test', 'mock', 'fixture', 'http', 'client',
      'data', 'analysis', 'plot', 'chart', 'graph',
      'image', 'vision', 'ml', 'ai', 'model',
      'format', 'lint', 'type', 'security', 'util'
    ]
  }
};
```

### Category Renderer

```typescript
interface CategoryRenderOptions {
  showEmptyCategories: boolean;
  gridColumns: number;
  responsive: boolean;
}

class CategoryRenderer {
  renderCategorizedTechStack(categories: Map<string, TechnologyCategory>): string
  renderCategorySection(category: TechnologyCategory): string
  renderCategoryHeader(category: TechnologyCategory): string
  renderTechnologyGrid(technologies: ProcessedTechnology[]): string
  generateCategoryStyles(): string
}
```

## Data Models

### Category Structure

```typescript
interface CategoryData {
  backend: TechnologyCategory;
  frontend: TechnologyCategory;
  devops: TechnologyCategory;
  others: TechnologyCategory;
}

interface TechnologyCategory {
  name: string;
  displayName: string;
  icon: string;
  description: string;
  technologies: ProcessedTechnology[];
  count: number;
  visible: boolean;
}
```

### Classification Algorithm

```typescript
class ClassificationEngine {
  classifyTechnology(techName: string): ClassificationResult {
    // 1. Exact match lookup
    const exactMatch = this.findExactMatch(techName);
    if (exactMatch) {
      return { category: exactMatch, confidence: 1.0, method: 'exact' };
    }
    
    // 2. Keyword-based classification
    const keywordMatch = this.performKeywordAnalysis(techName);
    if (keywordMatch.confidence > 0.7) {
      return keywordMatch;
    }
    
    // 3. Default to others
    return { category: 'others', confidence: 0.5, method: 'default' };
  }
  
  private performKeywordAnalysis(techName: string): ClassificationResult {
    const scores = new Map<string, number>();
    
    for (const [category, keywords] of this.keywordMappings) {
      let score = 0;
      for (const keyword of keywords) {
        if (techName.toLowerCase().includes(keyword)) {
          score += 1;
        }
      }
      scores.set(category, score / keywords.length);
    }
    
    const bestMatch = Array.from(scores.entries())
      .sort(([,a], [,b]) => b - a)[0];
    
    return {
      category: bestMatch[0],
      confidence: bestMatch[1],
      method: 'keyword'
    };
  }
}
```

## Error Handling

### Classification Fallbacks

1. **Unknown Technologies:** Default to "Others" category
2. **Ambiguous Classifications:** Use confidence scoring to resolve
3. **Missing Data:** Handle gracefully with empty category sections
4. **Invalid Input:** Sanitize and normalize technology names

### Error Recovery Strategies

```typescript
// Safe technology classification with fallbacks
private safeClassifyTechnology(techName: string): string {
  try {
    if (!techName || typeof techName !== 'string') {
      return 'others';
    }
    
    const normalized = techName.toLowerCase().trim();
    if (normalized.length === 0) {
      return 'others';
    }
    
    return this.classifyTechnology(normalized);
  } catch (error) {
    this.errorHandler.logError('Technology classification failed', error);
    return 'others';
  }
}
```

## Testing Strategy

### Unit Tests

1. **Classification Logic Tests**
   - Test exact match classification
   - Test keyword-based classification
   - Test conflict resolution
   - Test edge cases (empty strings, special characters)

2. **Category Rendering Tests**
   - Test HTML generation for each category
   - Test responsive grid layout
   - Test empty category handling

3. **Integration Tests**
   - Test complete categorization pipeline
   - Test with real project data
   - Test performance with large technology lists

### Visual Tests

1. **Layout Verification**
   - Test 2x2 grid layout on desktop
   - Test single column layout on mobile
   - Test category section spacing and alignment

2. **Responsive Behavior**
   - Test breakpoint transitions
   - Test grid responsiveness within categories
   - Test icon and text scaling

## UI/UX Design

### Visual Hierarchy

```css
.tech-categories-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-top: 24px;
}

.tech-category-section {
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 8px;
  padding: 20px;
  transition: box-shadow 0.2s ease;
}

.tech-category-section:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.tech-category-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.tech-category-icon {
  font-size: 24px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tech-category-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--vscode-foreground);
  margin: 0;
}

.tech-category-count {
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  margin-left: auto;
}
```

### Responsive Design

```css
/* Desktop: 2x2 grid */
@media (min-width: 1024px) {
  .tech-categories-container {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Tablet: Single column */
@media (max-width: 1023px) {
  .tech-categories-container {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

/* Mobile: Optimized spacing */
@media (max-width: 600px) {
  .tech-categories-container {
    gap: 16px;
  }
  
  .tech-category-section {
    padding: 16px;
  }
  
  .tech-category-header {
    gap: 8px;
    margin-bottom: 12px;
  }
}
```

### Category Icons and Colors

```typescript
const CATEGORY_STYLING = {
  backend: {
    icon: '🔧',
    color: '#4CAF50',
    description: 'Server-side frameworks and databases'
  },
  frontend: {
    icon: '🎨',
    color: '#2196F3',
    description: 'Client-side frameworks and UI tools'
  },
  devops: {
    icon: '⚙️',
    color: '#FF9800',
    description: 'Deployment and infrastructure tools'
  },
  others: {
    icon: '📦',
    color: '#9C27B0',
    description: 'Development utilities and libraries'
  }
};
```

## Performance Considerations

### Optimization Strategies

1. **Lazy Classification:** Only classify technologies when section is visible
2. **Memoization:** Cache classification results for repeated technologies
3. **Efficient Rendering:** Use document fragments for DOM manipulation
4. **CSS Optimization:** Use CSS Grid for efficient layout rendering

### Memory Management

```typescript
// Efficient categorization with minimal memory overhead
private categorizeTechnologiesEfficiently(technologies: any[]): Map<string, TechnologyCategory> {
  const categories = new Map<string, TechnologyCategory>();
  
  // Initialize categories
  for (const categoryName of ['backend', 'frontend', 'devops', 'others']) {
    categories.set(categoryName, {
      name: categoryName,
      displayName: this.getCategoryDisplayName(categoryName),
      icon: this.getCategoryIcon(categoryName),
      technologies: [],
      count: 0,
      visible: false
    });
  }
  
  // Process technologies in batches to avoid memory spikes
  const batchSize = 50;
  for (let i = 0; i < technologies.length; i += batchSize) {
    const batch = technologies.slice(i, i + batchSize);
    this.processTechnologyBatch(batch, categories);
  }
  
  // Remove empty categories
  for (const [key, category] of categories) {
    if (category.count === 0) {
      categories.delete(key);
    } else {
      category.visible = true;
    }
  }
  
  return categories;
}
```

## Implementation Phases

### Phase 1: Classification Engine
- Implement technology categorization logic
- Create category mappings and keyword analysis
- Add conflict resolution algorithms

### Phase 2: Category Rendering
- Implement categorized HTML generation
- Add responsive CSS grid layouts
- Create category headers with icons and counts

### Phase 3: Integration
- Integrate with existing tech stack analysis
- Update webview generation pipeline
- Add error handling and fallbacks

### Phase 4: Polish and Testing
- Add comprehensive test coverage
- Optimize performance for large datasets
- Add accessibility features
- Conduct visual testing across devices