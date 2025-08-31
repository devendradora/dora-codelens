# Design Document

## Overview

The Tech Stack Analysis improvements will enhance the existing webview component in the DoraCodeLens extension by implementing accurate statistics calculation, improved framework filtering, and a responsive grid layout for libraries. The design focuses on data processing robustness, visual hierarchy, and user experience optimization.

## Architecture

### Component Structure

```
FullCodeAnalysisWebview
├── generateTechStackAnalysisHtml()
│   ├── calculateTechStackStats()
│   ├── generateStatisticsSection()
│   ├── generateFrameworksSection()
│   └── generateLibrariesSection()
├── Helper Methods
│   ├── countNodesRecursively()
│   ├── detectPackageManager()
│   ├── findFileInProject()
│   ├── filterMajorFrameworks()
│   └── processAndSortLibraries()
└── CSS Styles
    ├── .tech-stats (statistics grid)
    ├── .tech-libraries-grid (responsive grid)
    └── .tech-library-item (individual items)
```

### Data Flow

1. **Input:** `analysisData` containing `code_graph_json`, `tech_stack`, and `stats`
2. **Processing:** Extract and calculate statistics from nested data structures
3. **Filtering:** Apply framework filtering and library sorting
4. **Rendering:** Generate HTML with responsive CSS classes
5. **Output:** Enhanced tech stack analysis section

## Components and Interfaces

### Statistics Calculator

```typescript
interface TechStackStats {
  totalFiles: number;
  totalFolders: number;
  totalClasses: number;
  totalFunctions: number;
  totalLanguages: number;
  packageManager: string;
}

class StatisticsCalculator {
  calculateTechStackStats(analysisData: any): TechStackStats
  countNodesRecursively(nodes: any[], stats: TechStackStats): void
  detectPackageManager(analysisData: any): string
  findFileInProject(nodes: any[], fileName: string): boolean
}
```

### Framework Filter

```typescript
interface FrameworkFilter {
  majorPythonFrameworks: string[];
  filterMajorFrameworks(frameworks: any[]): any[];
}

const MAJOR_PYTHON_FRAMEWORKS = [
  'django', 'flask', 'fastapi', 'tornado', 'pyramid', 'bottle',
  'cherrypy', 'web2py', 'falcon', 'sanic', 'quart', 'starlette'
];
```

### Library Processor

```typescript
interface ProcessedLibrary {
  name: string;
  version: string;
}

class LibraryProcessor {
  processAndSortLibraries(libraries: any): ProcessedLibrary[]
  handleObjectFormat(libraries: object): ProcessedLibrary[]
  handleArrayFormat(libraries: any[]): ProcessedLibrary[]
  sortAlphabetically(libraries: ProcessedLibrary[]): ProcessedLibrary[]
}
```

## Data Models

### Input Data Structure

```typescript
interface AnalysisData {
  code_graph_json: GraphNode[];
  tech_stack: {
    languages: Language[];
    frameworks: string[];
    libraries: any; // Multiple formats supported
  };
  stats?: {
    total_files?: number;
    total_lines?: number;
  };
}

interface GraphNode {
  name: string;
  type: 'file' | 'folder' | 'class' | 'function';
  children: GraphNode[];
}
```

### Package Manager Detection Logic

```typescript
const PACKAGE_MANAGER_PRIORITY = [
  { file: 'poetry.lock', manager: 'Poetry' },
  { file: 'Pipfile', manager: 'Pipenv' },
  { file: 'requirements.txt', manager: 'pip' },
  { file: 'yarn.lock', manager: 'Yarn' },
  { file: 'package.json', manager: 'npm' }
];
```

## Error Handling

### Data Validation

1. **Null/Undefined Checks:** Validate all input data before processing
2. **Type Guards:** Ensure data types match expected formats
3. **Fallback Values:** Provide default values for missing data
4. **Error Boundaries:** Graceful degradation when sections fail

### Error Recovery Strategies

```typescript
// Statistics calculation with fallbacks
const stats = {
  totalFiles: this.safeCount(analysisData.code_graph_json, 'file') || 0,
  totalFolders: this.safeCount(analysisData.code_graph_json, 'folder') || 0,
  totalClasses: this.safeCount(analysisData.code_graph_json, 'class') || 0,
  totalFunctions: this.safeCount(analysisData.code_graph_json, 'function') || 0,
  totalLanguages: analysisData.tech_stack?.languages?.length || 0,
  packageManager: this.detectPackageManager(analysisData) || 'Unknown'
};
```

## Testing Strategy

### Unit Tests

1. **Statistics Calculation Tests**
   - Test recursive node counting with various graph structures
   - Verify package manager detection with different file combinations
   - Validate edge cases (empty graphs, missing data)

2. **Framework Filtering Tests**
   - Test major framework identification
   - Verify exclusion of non-framework libraries
   - Test case-insensitive matching

3. **Library Processing Tests**
   - Test multiple input formats (object, array, mixed)
   - Verify alphabetical sorting
   - Test version extraction and display

### Integration Tests

1. **Webview Rendering Tests**
   - Test complete HTML generation
   - Verify CSS class application
   - Test responsive behavior

2. **Data Processing Pipeline Tests**
   - Test end-to-end data flow
   - Verify error handling in production scenarios
   - Test performance with large datasets

### Visual Tests

1. **Layout Verification**
   - Test grid responsiveness at different breakpoints
   - Verify hover effects and animations
   - Test VSCode theme integration

2. **Accessibility Tests**
   - Verify keyboard navigation
   - Test screen reader compatibility
   - Validate color contrast ratios

## Performance Considerations

### Optimization Strategies

1. **Lazy Calculation:** Calculate statistics only when section is visible
2. **Memoization:** Cache processed library data to avoid re-sorting
3. **Efficient Traversal:** Use iterative approaches for large graph structures
4. **CSS Optimization:** Use CSS Grid for efficient layout rendering

### Memory Management

```typescript
// Efficient node counting without deep recursion
private countNodesIteratively(nodes: any[]): TechStackStats {
  const stack = [...nodes];
  const stats = { /* initial stats */ };
  
  while (stack.length > 0) {
    const node = stack.pop();
    this.updateStatsForNode(node, stats);
    if (node.children) {
      stack.push(...node.children);
    }
  }
  
  return stats;
}
```

## UI/UX Design

### Visual Hierarchy

1. **Statistics Panel:** Prominent 6-column grid with key metrics
2. **Frameworks Section:** Clean list with framework badges
3. **Libraries Grid:** 4-column responsive grid with hover effects

### Responsive Design Breakpoints

```css
/* Desktop: 4 columns */
.tech-libraries-grid {
  grid-template-columns: repeat(4, 1fr);
}

/* Tablet: 3 columns */
@media (max-width: 800px) {
  .tech-libraries-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Mobile: 2 columns */
@media (max-width: 600px) {
  .tech-libraries-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Small Mobile: 1 column */
@media (max-width: 400px) {
  .tech-libraries-grid {
    grid-template-columns: 1fr;
  }
}
```

### Interaction Design

1. **Hover Effects:** Subtle transform and shadow on library items
2. **Loading States:** Skeleton screens during calculation
3. **Empty States:** Informative messages when no data available
4. **Error States:** Clear error messages with retry options

## Implementation Phases

### Phase 1: Statistics Enhancement
- Implement recursive node counting
- Add package manager detection
- Fix existing statistics display issues

### Phase 2: Framework Filtering
- Implement major framework filter
- Update section title and layout
- Add framework categorization logic

### Phase 3: Library Grid Layout
- Implement responsive CSS Grid
- Add alphabetical sorting
- Create hover effects and animations

### Phase 4: Polish and Testing
- Add comprehensive error handling
- Implement performance optimizations
- Add accessibility features
- Conduct thorough testing