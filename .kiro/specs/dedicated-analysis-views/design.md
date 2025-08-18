# Design Document

## Overview

This design creates dedicated tab views for different analysis types with enhanced graph visualization. The solution separates Full Code Analysis, Current File Analysis, and Git Analytics into distinct tabs, each with their own specialized interface and controls. The code graph visualization is enhanced to show modules as rectangles, files as complexity-colored circles, and dependency relationships through arrows.

## Architecture

### Current State Analysis

The extension currently uses:
- `TabbedWebviewProvider` with mixed content tabs (Tech Stack, Code Graph, Git Analytics)
- Single graph visualization approach for all analysis types
- Basic Cytoscape.js rendering with limited visual distinction between modules and files
- Shared controls and state across different analysis types

### Proposed Architecture Changes

1. **Dedicated Tab System**: Replace mixed-content tabs with analysis-type-specific tabs
2. **Enhanced Graph Renderer**: Implement module-as-rectangle and file-as-circle visualization
3. **Specialized Controllers**: Create dedicated controllers for each analysis type
4. **Independent State Management**: Separate state management for each analysis view

## Components and Interfaces

### 1. Dedicated Analysis View System

```typescript
interface DedicatedAnalysisView {
    viewType: 'fullCode' | 'currentFile' | 'gitAnalytics';
    title: string;
    icon: string;
    renderer: AnalysisRenderer;
    controller: AnalysisController;
    state: AnalysisViewState;
}

interface AnalysisViewState {
    isActive: boolean;
    zoomLevel: number;
    searchQuery: string;
    filterSettings: FilterSettings;
    layoutSettings: LayoutSettings;
    selectedNodes: string[];
}

interface FilterSettings {
    showModules: boolean;
    showFiles: boolean;
    complexityFilter: 'all' | 'low' | 'medium' | 'high';
    dependencyFilter: 'all' | 'imports' | 'calls';
}

interface LayoutSettings {
    algorithm: 'dagre' | 'cose' | 'grid' | 'circle';
    spacing: number;
    direction: 'TB' | 'BT' | 'LR' | 'RL';
    grouping: 'module' | 'complexity' | 'none';
}
```

### 2. Enhanced Graph Visualization System

```typescript
interface EnhancedGraphRenderer {
    renderModuleAsRectangle(module: ModuleNode): CytoscapeNode;
    renderFileAsCircle(file: FileNode): CytoscapeNode;
    renderDependencyArrow(dependency: DependencyEdge): CytoscapeEdge;
    applyComplexityColoring(node: FileNode): string;
    createInteractiveControls(): GraphControls;
}

interface ModuleNode {
    id: string;
    name: string;
    path: string;
    files: FileNode[];
    subModules: ModuleNode[];
    position: { x: number; y: number };
    size: { width: number; height: number };
    complexity: ModuleComplexity;
}

interface FileNode {
    id: string;
    name: string;
    path: string;
    module: string;
    complexity: FileComplexity;
    position: { x: number; y: number };
    size: number;
    language: string;
}

interface FileComplexity {
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    linesOfCode: number;
    maintainabilityIndex: number;
    level: 'low' | 'medium' | 'high';
    color: string;
}

interface DependencyEdge {
    id: string;
    source: string;
    target: string;
    type: 'import' | 'call' | 'inheritance' | 'composition';
    weight: number;
    style: EdgeStyle;
}

interface EdgeStyle {
    color: string;
    width: number;
    style: 'solid' | 'dashed' | 'dotted';
    arrow: 'triangle' | 'diamond' | 'circle';
}
```

### 3. Analysis-Specific Controllers

```typescript
interface FullCodeAnalysisController extends AnalysisController {
    loadFullCodebaseData(): Promise<FullCodeAnalysisData>;
    filterByComplexity(level: 'low' | 'medium' | 'high'): void;
    groupByModule(): void;
    showModuleDependencies(): void;
    expandModule(moduleId: string): void;
    collapseModule(moduleId: string): void;
}

interface CurrentFileAnalysisController extends AnalysisController {
    loadCurrentFileData(filePath: string): Promise<CurrentFileAnalysisData>;
    highlightCurrentFile(): void;
    showDirectDependencies(): void;
    showReverseDependencies(): void;
    focusOnFile(fileId: string): void;
    updateOnFileChange(newFilePath: string): void;
}

interface GitAnalyticsController extends AnalysisController {
    loadGitAnalyticsData(): Promise<GitAnalyticsData>;
    showCommitHistory(): void;
    showContributorStats(): void;
    showFileHotspots(): void;
    filterByDateRange(start: Date, end: Date): void;
    filterByAuthor(authorId: string): void;
}
```

## Data Models

### 1. Enhanced Graph Data Structure

```typescript
interface EnhancedGraphData {
    modules: ModuleHierarchy;
    files: FileCollection;
    dependencies: DependencyNetwork;
    metadata: GraphMetadata;
}

interface ModuleHierarchy {
    root: ModuleNode;
    flatList: ModuleNode[];
    hierarchy: ModuleTree;
    statistics: ModuleStatistics;
}

interface FileCollection {
    files: Map<string, FileNode>;
    byModule: Map<string, FileNode[]>;
    byComplexity: Map<string, FileNode[]>;
    statistics: FileStatistics;
}

interface DependencyNetwork {
    edges: DependencyEdge[];
    adjacencyList: Map<string, string[]>;
    reverseAdjacencyList: Map<string, string[]>;
    statistics: DependencyStatistics;
}

interface GraphMetadata {
    analysisType: 'fullCode' | 'currentFile' | 'gitAnalytics';
    timestamp: Date;
    projectPath: string;
    totalNodes: number;
    totalEdges: number;
    complexityDistribution: ComplexityDistribution;
}
```

### 2. Complexity Color Mapping

```typescript
interface ComplexityColorScheme {
    low: {
        range: [number, number];
        color: string;
        description: string;
    };
    medium: {
        range: [number, number];
        color: string;
        description: string;
    };
    high: {
        range: [number, number];
        color: string;
        description: string;
    };
}

const DEFAULT_COMPLEXITY_COLORS: ComplexityColorScheme = {
    low: {
        range: [0, 5],
        color: '#4CAF50', // Green
        description: 'Low complexity - easy to maintain'
    },
    medium: {
        range: [6, 10],
        color: '#FF9800', // Orange
        description: 'Medium complexity - consider refactoring'
    },
    high: {
        range: [11, Infinity],
        color: '#F44336', // Red
        description: 'High complexity - needs refactoring'
    }
};
```

### 3. View-Specific Data Models

```typescript
interface FullCodeAnalysisData extends EnhancedGraphData {
    projectStructure: ProjectStructure;
    frameworkPatterns: FrameworkPattern[];
    architecturalMetrics: ArchitecturalMetrics;
}

interface CurrentFileAnalysisData extends EnhancedGraphData {
    currentFile: FileNode;
    directDependencies: FileNode[];
    reverseDependencies: FileNode[];
    relatedFiles: FileNode[];
    contextualMetrics: ContextualMetrics;
}

interface GitAnalyticsData {
    repository: RepositoryInfo;
    commits: CommitData[];
    contributors: ContributorData[];
    fileHistory: FileHistoryData[];
    hotspots: FileHotspot[];
    trends: AnalyticsTrend[];
}
```

## Error Handling

### 1. Graph Rendering Error Recovery

```typescript
interface GraphErrorHandler {
    handleRenderingFailure(error: RenderingError): void;
    fallbackToSimpleView(): void;
    retryWithReducedComplexity(): void;
    showErrorMessage(message: string): void;
}

interface RenderingError {
    type: 'memory' | 'performance' | 'data' | 'cytoscape';
    message: string;
    nodeCount: number;
    edgeCount: number;
    suggestedAction: string;
}
```

### 2. Data Loading Error Handling

```typescript
interface DataLoadingErrorHandler {
    handleAnalysisFailure(analysisType: string, error: AnalysisError): void;
    showLoadingState(message: string): void;
    showErrorState(error: string, retryAction?: () => void): void;
    handlePartialData(data: Partial<EnhancedGraphData>): void;
}
```

### 3. Performance Optimization

```typescript
interface PerformanceOptimizer {
    shouldUseVirtualization(nodeCount: number): boolean;
    reduceGraphComplexity(data: EnhancedGraphData): EnhancedGraphData;
    implementLazyLoading(modules: ModuleNode[]): Promise<ModuleNode[]>;
    optimizeForLargeGraphs(data: EnhancedGraphData): EnhancedGraphData;
}
```

## Testing Strategy

### 1. Unit Tests

```typescript
describe('DedicatedAnalysisViews', () => {
    describe('FullCodeAnalysisController', () => {
        test('should load full codebase data correctly', () => {});
        test('should filter by complexity levels', () => {});
        test('should expand and collapse modules', () => {});
    });

    describe('EnhancedGraphRenderer', () => {
        test('should render modules as rectangles', () => {});
        test('should render files as complexity-colored circles', () => {});
        test('should create dependency arrows', () => {});
    });

    describe('CurrentFileAnalysisController', () => {
        test('should highlight current file', () => {});
        test('should show direct dependencies', () => {});
        test('should update on file change', () => {});
    });
});
```

### 2. Integration Tests

```typescript
describe('DedicatedAnalysisViews Integration', () => {
    test('should switch between analysis views without data loss', () => {});
    test('should maintain independent state for each view', () => {});
    test('should handle large codebases efficiently', () => {});
    test('should render complex dependency networks', () => {});
});
```

### 3. Visual Regression Tests

- Module rectangle rendering consistency
- File circle complexity coloring accuracy
- Dependency arrow positioning and styling
- Tab switching animations and state preservation
- Graph interaction responsiveness

## Implementation Approach

### Phase 1: Core Architecture Refactoring
1. Create `DedicatedAnalysisViewManager` class
2. Implement analysis-specific controllers
3. Refactor `TabbedWebviewProvider` to support dedicated views
4. Create enhanced graph data models

### Phase 2: Enhanced Graph Visualization
1. Implement `EnhancedGraphRenderer` class
2. Create module-as-rectangle rendering logic
3. Implement file-as-circle with complexity coloring
4. Add dependency arrow rendering with different styles

### Phase 3: View-Specific Features
1. Implement Full Code Analysis dedicated features
2. Create Current File Analysis focused view
3. Separate Git Analytics into its own view
4. Add view-specific controls and filters

### Phase 4: Performance and Polish
1. Implement performance optimizations for large graphs
2. Add lazy loading and virtualization
3. Create smooth transitions between views
4. Add accessibility features and keyboard navigation

## Technical Considerations

### 1. Graph Rendering Performance

```typescript
interface GraphPerformanceConfig {
    maxNodesBeforeVirtualization: number;
    maxEdgesBeforeSimplification: number;
    renderingTimeout: number;
    memoryThreshold: number;
}

const PERFORMANCE_THRESHOLDS: GraphPerformanceConfig = {
    maxNodesBeforeVirtualization: 1000,
    maxEdgesBeforeSimplification: 2000,
    renderingTimeout: 30000,
    memoryThreshold: 100 * 1024 * 1024 // 100MB
};
```

### 2. Cytoscape.js Configuration

```typescript
interface CytoscapeConfig {
    layout: {
        name: string;
        options: any;
    };
    style: CytoscapeStylesheet[];
    interaction: {
        zoomingEnabled: boolean;
        panningEnabled: boolean;
        selectionType: string;
    };
    performance: {
        hideEdgesOnViewport: boolean;
        textureOnViewport: boolean;
        motionBlur: boolean;
    };
}
```

### 3. Memory Management

```typescript
interface MemoryManager {
    trackGraphMemoryUsage(): number;
    cleanupUnusedNodes(): void;
    optimizeForMemoryConstraints(): void;
    implementNodePooling(): void;
}
```

### 4. State Persistence

```typescript
interface ViewStatePersistence {
    saveViewState(viewType: string, state: AnalysisViewState): void;
    loadViewState(viewType: string): AnalysisViewState | null;
    clearViewState(viewType: string): void;
    migrateStateFormat(oldState: any): AnalysisViewState;
}
```

## CSS Architecture

### 1. Dedicated View Styling

```css
.dedicated-analysis-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
}

.analysis-tabs {
    display: flex;
    border-bottom: 2px solid var(--vscode-panel-border);
    background: var(--vscode-tab-inactiveBackground);
}

.analysis-tab {
    padding: 12px 20px;
    cursor: pointer;
    border: none;
    background: transparent;
    color: var(--vscode-tab-inactiveForeground);
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
    position: relative;
}

.analysis-tab.active {
    color: var(--vscode-tab-activeForeground);
    background: var(--vscode-tab-activeBackground);
}

.analysis-tab.active::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--vscode-focusBorder);
}
```

### 2. Enhanced Graph Styling

```css
.module-rectangle {
    background: var(--vscode-editor-inactiveSelectionBackground);
    border: 2px solid var(--vscode-panel-border);
    border-radius: 8px;
    opacity: 0.9;
}

.module-rectangle.expanded {
    border-color: var(--vscode-focusBorder);
    box-shadow: 0 0 10px rgba(0, 122, 255, 0.3);
}

.file-circle {
    border: 2px solid rgba(255, 255, 255, 0.2);
    transition: all 0.2s ease;
}

.file-circle:hover {
    transform: scale(1.1);
    border-color: var(--vscode-focusBorder);
}

.dependency-arrow {
    opacity: 0.7;
    transition: opacity 0.2s ease;
}

.dependency-arrow:hover {
    opacity: 1;
    stroke-width: 3px;
}
```

### 3. Complexity Color Variables

```css
:root {
    --complexity-low: #4CAF50;
    --complexity-medium: #FF9800;
    --complexity-high: #F44336;
    --complexity-unknown: #9E9E9E;
}

.complexity-low { background-color: var(--complexity-low); }
.complexity-medium { background-color: var(--complexity-medium); }
.complexity-high { background-color: var(--complexity-high); }
.complexity-unknown { background-color: var(--complexity-unknown); }
```