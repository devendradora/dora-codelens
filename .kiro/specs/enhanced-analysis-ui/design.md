# Design Document

## Overview

This design creates a streamlined, two-tab interface for the full code analysis webview focusing on the most essential analysis information. The interface will feature a clean tab navigation system with only Tech Stack and Code Graph tabs. The Tech Stack tab will consolidate project statistics (total modules, files, analysis status) with comprehensive technology information, while the Code Graph tab will provide an enhanced visualization of the module (folder) structure.

## Architecture

### Tab-Based Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Tab Navigation Bar                        │
├─────────────────────────────────────────────────────────────┤
│              Tech Stack    |    Code Graph                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    Active Tab Content                       │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

```
Backend Response
       │
       ▼
┌─────────────────┐
│ Data Processor  │ ──► Validates and structures data
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ Tab Controller  │ ──► Routes data to appropriate tabs
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ Tab Renderers   │ ──► Renders specific tab content
└─────────────────┘
```

## Components and Interfaces

### 1. Tab Navigation Component

**Purpose**: Provides the main navigation interface between different analysis views

**Key Features**:
- Horizontal tab bar with icons and labels
- Active tab highlighting
- Badge indicators for data availability
- Responsive design for different screen sizes

**Interface**:
```typescript
interface TabConfig {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
  badgeCount?: number;
}
```

### 2. Tech Stack Tab Component

**Purpose**: Displays comprehensive technology stack information and project statistics

**Key Features**:
- Project statistics section showing TOTAL MODULES (folders), TOTAL FILES, and ANALYSIS STATUS
- Primary Framework detection and prominent display (Django, Flask, etc.)
- Complete libraries and dependencies list with versions
- Language breakdown with percentages and file counts
- Visual charts and progress bars for language distribution

**Data Structure Expected**:
```typescript
interface TechStackData {
  total_modules: number;
  total_files: number;
  analysis_status: string;
  primary_framework: { name: string; version: string; confidence: number };
  languages: { [key: string]: number };
  frameworks: Array<{ name: string; version: string; confidence: number }>;
  dependencies: { [key: string]: string };
  libraries: Array<{ name: string; version: string; type: string }>;
  package_managers: string[];
}
```

### 3. Code Graph Tab Component

**Purpose**: Interactive visualization of module (folder) structure and relationships

**Key Features**:
- Cytoscape.js integration for graph rendering focused on modules (folders)
- Module nodes representing all folders in the codebase
- Hierarchical layout showing folder structure relationships
- Visual styling similar to the provided reference image
- Tooltip details showing file counts and module information
- Zoom, pan, and selection interactions

**Data Structure Expected**:
```typescript
interface GraphData {
  nodes: Array<{
    id: string;
    name: string;
    type: 'module';
    path: string;
    file_count: number;
    complexity: { level: string; score: number };
    is_root: boolean;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: 'contains';
  }>;
}
```



## Data Models

### Main Analysis Data Interface

```typescript
interface AnalysisData {
  success: boolean;
  metadata: {
    analysis_time: number;
    total_files: number;
    total_modules: number;
    analysis_status: string;
    schema_version: string;
  };
  tech_stack: TechStackData;
  modules: {
    nodes: ModuleNode[];
    edges: ModuleEdge[];
    total_modules: number;
  };
  errors: string[];
  warnings: string[];
}
```

### Tab State Management

```typescript
interface TabState {
  activeTab: 'tech-stack' | 'code-graph';
  techStackData: TechStackData | null;
  graphData: GraphData | null;
  loading: { techStack: boolean; codeGraph: boolean };
  errors: { techStack: string[]; codeGraph: string[] };
}
```

## Error Handling

### Data Validation Strategy

1. **Schema Validation**: Validate backend response against expected structure
2. **Graceful Degradation**: Show available data even if some sections are missing
3. **Error Boundaries**: Isolate tab failures to prevent full UI crashes
4. **User Feedback**: Clear error messages and recovery suggestions

### Missing Data Handling

- **Empty States**: Custom empty state components for each tab type
- **Partial Data**: Show available information with indicators for missing data
- **Loading States**: Progressive loading with skeleton screens
- **Retry Mechanisms**: Allow users to retry failed data loads

## Testing Strategy

### Component Testing

1. **Tab Navigation**: Test tab switching, state persistence, and routing
2. **Data Processing**: Validate data transformation and error handling
3. **Visualization**: Test graph rendering, interactions, and performance
4. **Responsive Design**: Ensure proper display across different screen sizes

### Integration Testing

1. **Backend Integration**: Test with various backend response formats
2. **State Management**: Verify tab state persistence and updates
3. **Error Scenarios**: Test behavior with malformed or missing data
4. **Performance**: Measure rendering performance with large datasets

## Implementation Approach

### Phase 1: Core Tab Infrastructure
- Implement simplified two-tab navigation system (Tech Stack and Code Graph)
- Create base tab component structure
- Set up data routing and state management

### Phase 2: Tech Stack Tab Implementation
- Implement project statistics section (total modules, files, analysis status)
- Add primary framework detection and display
- Create comprehensive libraries and dependencies listing
- Add language breakdown with visual charts

### Phase 3: Code Graph Tab Implementation
- Implement module-focused graph visualization
- Create hierarchical layout for folder structure
- Add interactive features and tooltips
- Style graph similar to reference image

### Phase 4: Polish and Optimization
- Performance optimizations for graph rendering
- Responsive design improvements
- Accessibility enhancements
- Error handling and empty states

## Technical Considerations

### Performance Optimization

- **Lazy Loading**: Load tab content only when accessed
- **Virtual Scrolling**: Handle large lists efficiently
- **Memoization**: Cache expensive computations
- **Debounced Updates**: Optimize real-time filtering and search

### Accessibility

- **Keyboard Navigation**: Full keyboard support for tab navigation
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **High Contrast**: Support for high contrast themes
- **Focus Management**: Logical focus flow between components

### Browser Compatibility

- **Modern Standards**: Use ES6+ features with appropriate polyfills
- **CSS Grid/Flexbox**: Modern layout techniques
- **WebView Constraints**: Work within VS Code webview limitations
- **Resource Management**: Efficient memory and CPU usage