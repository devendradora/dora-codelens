/**
 * Enhanced graph data models for dedicated analysis views
 */

export interface DedicatedAnalysisView {
    viewType: 'fullCode' | 'currentFile' | 'gitAnalytics';
    title: string;
    icon: string;
    renderer: AnalysisRenderer;
    controller: AnalysisController;
    state: AnalysisViewState;
}

export interface AnalysisViewState {
    isActive: boolean;
    zoomLevel: number;
    searchQuery: string;
    filterSettings: FilterSettings;
    layoutSettings: LayoutSettings;
    selectedNodes: string[];
}

export interface FilterSettings {
    showModules: boolean;
    showFiles: boolean;
    complexityFilter: 'all' | 'low' | 'medium' | 'high';
    dependencyFilter: 'all' | 'imports' | 'calls';
}

export interface LayoutSettings {
    algorithm: 'dagre' | 'cose' | 'grid' | 'circle';
    spacing: number;
    direction: 'TB' | 'BT' | 'LR' | 'RL';
    grouping: 'module' | 'complexity' | 'none';
}

export interface AnalysisRenderer {
    renderGraph(data: EnhancedGraphData, state: AnalysisViewState): Promise<string>;
    dispose(): void;
}

export interface AnalysisController {
    transformData(data: any): Promise<EnhancedGraphData>;
    handleInteraction(interaction: any, state: AnalysisViewState): Promise<void>;
    dispose?(): void;
}

// Enhanced Graph Data Models

export interface EnhancedGraphData {
    modules: ModuleHierarchy;
    files: FileCollection;
    dependencies: DependencyNetwork;
    metadata: GraphMetadata;
}

export interface ModuleHierarchy {
    root: ModuleNode;
    flatList: ModuleNode[];
    hierarchy: ModuleTree;
    statistics: ModuleStatistics;
}

export interface ModuleNode {
    id: string;
    name: string;
    path: string;
    files: FileNode[];
    subModules: ModuleNode[];
    position: { x: number; y: number };
    size: { width: number; height: number };
    complexity: ModuleComplexity;
    isExpanded: boolean;
    level: number;
}

export interface ModuleComplexity {
    totalFiles: number;
    averageComplexity: number;
    maxComplexity: number;
    totalLinesOfCode: number;
    level: 'low' | 'medium' | 'high';
}

export interface ModuleTree {
    [key: string]: ModuleNode | ModuleTree;
}

export interface ModuleStatistics {
    totalModules: number;
    maxDepth: number;
    averageFilesPerModule: number;
    complexityDistribution: ComplexityDistribution;
}

export interface FileCollection {
    files: Map<string, FileNode>;
    byModule: Map<string, FileNode[]>;
    byComplexity: Map<string, FileNode[]>;
    statistics: FileStatistics;
}

export interface FileNode {
    id: string;
    name: string;
    path: string;
    module: string;
    complexity: FileComplexity;
    position: { x: number; y: number };
    size: number;
    language: string;
    isHighlighted: boolean;
    metadata: FileMetadata;
}

export interface FileComplexity {
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    linesOfCode: number;
    maintainabilityIndex: number;
    level: 'low' | 'medium' | 'high';
    color: string;
    score: number;
}

export interface FileMetadata {
    lastModified: Date;
    author: string;
    functions: number;
    classes: number;
    imports: number;
}

export interface FileStatistics {
    totalFiles: number;
    averageComplexity: number;
    languageDistribution: { [language: string]: number };
    complexityDistribution: ComplexityDistribution;
}

export interface DependencyNetwork {
    edges: DependencyEdge[];
    adjacencyList: Map<string, string[]>;
    reverseAdjacencyList: Map<string, string[]>;
    statistics: DependencyStatistics;
}

export interface DependencyEdge {
    id: string;
    source: string;
    target: string;
    type: 'import' | 'call' | 'inheritance' | 'composition';
    weight: number;
    style: EdgeStyle;
    metadata: DependencyMetadata;
}

export interface EdgeStyle {
    color: string;
    width: number;
    style: 'solid' | 'dashed' | 'dotted';
    arrow: 'triangle' | 'diamond' | 'circle';
    opacity: number;
}

export interface DependencyMetadata {
    strength: number;
    frequency: number;
    isCircular: boolean;
    path: string[];
}

export interface DependencyStatistics {
    totalDependencies: number;
    circularDependencies: number;
    averageDependenciesPerFile: number;
    maxDependencyDepth: number;
}

export interface GraphMetadata {
    analysisType: 'fullCode' | 'currentFile' | 'gitAnalytics';
    timestamp: Date;
    projectPath: string;
    totalNodes: number;
    totalEdges: number;
    complexityDistribution: ComplexityDistribution;
    performanceMetrics: PerformanceMetrics;
}

export interface ComplexityDistribution {
    low: number;
    medium: number;
    high: number;
}

export interface PerformanceMetrics {
    analysisTime: number;
    renderTime: number;
    memoryUsage: number;
    nodeCount: number;
    edgeCount: number;
}

// Complexity Color Mapping

export interface ComplexityColorScheme {
    low: ComplexityColorConfig;
    medium: ComplexityColorConfig;
    high: ComplexityColorConfig;
    unknown: ComplexityColorConfig;
}

export interface ComplexityColorConfig {
    range: [number, number];
    color: string;
    description: string;
    textColor: string;
}

export const defaultComplexityColors: ComplexityColorScheme = {
    low: {
        range: [0, 5],
        color: '#4CAF50',
        description: 'Low complexity - easy to maintain',
        textColor: '#FFFFFF'
    },
    medium: {
        range: [6, 10],
        color: '#FF9800',
        description: 'Medium complexity - consider refactoring',
        textColor: '#FFFFFF'
    },
    high: {
        range: [11, Infinity],
        color: '#F44336',
        description: 'High complexity - needs refactoring',
        textColor: '#FFFFFF'
    },
    unknown: {
        range: [-1, -1],
        color: '#9E9E9E',
        description: 'Unknown complexity',
        textColor: '#FFFFFF'
    }
};

// Graph Interaction Types

export interface GraphInteraction {
    type: 'node-click' | 'node-hover' | 'edge-click' | 'edge-hover' | 'background-click' | 'zoom' | 'pan';
    target?: string;
    data?: any;
    position?: { x: number; y: number };
}

export interface GraphControls {
    zoom: ZoomControls;
    search: SearchControls;
    filter: FilterControls;
    layout: LayoutControls;
}

export interface ZoomControls {
    zoomIn(): void;
    zoomOut(): void;
    fit(): void;
    reset(): void;
    setZoom(level: number): void;
}

export interface SearchControls {
    search(query: string): void;
    clearSearch(): void;
    highlightResults(results: string[]): void;
}

export interface FilterControls {
    filterByComplexity(level: 'all' | 'low' | 'medium' | 'high'): void;
    filterByType(type: 'all' | 'modules' | 'files'): void;
    filterByDependency(type: 'all' | 'imports' | 'calls'): void;
}

export interface LayoutControls {
    setLayout(algorithm: string): void;
    setDirection(direction: string): void;
    setSpacing(spacing: number): void;
    setGrouping(grouping: string): void;
}

// View-Specific Data Types

export interface FullCodeAnalysisData extends EnhancedGraphData {
    projectStructure: ProjectStructure;
    frameworkPatterns: FrameworkPattern[];
    architecturalMetrics: ArchitecturalMetrics;
}

export interface ProjectStructure {
    rootPath: string;
    directories: DirectoryInfo[];
    totalFiles: number;
    languages: string[];
}

export interface DirectoryInfo {
    path: string;
    fileCount: number;
    subdirectories: string[];
    purpose: string;
}

export interface FrameworkPattern {
    name: string;
    confidence: number;
    files: string[];
    patterns: string[];
}

export interface ArchitecturalMetrics {
    layering: LayeringMetrics;
    coupling: CouplingMetrics;
    cohesion: CohesionMetrics;
}

export interface LayeringMetrics {
    layers: string[];
    violations: LayerViolation[];
    score: number;
}

export interface LayerViolation {
    from: string;
    to: string;
    type: string;
    severity: 'low' | 'medium' | 'high';
}

export interface CouplingMetrics {
    afferentCoupling: number;
    efferentCoupling: number;
    instability: number;
    abstractness: number;
}

export interface CohesionMetrics {
    lackOfCohesion: number;
    cohesionScore: number;
    relatedMethods: number;
}

export interface CurrentFileAnalysisData extends EnhancedGraphData {
    currentFile: FileNode;
    directDependencies: FileNode[];
    reverseDependencies: FileNode[];
    relatedFiles: FileNode[];
    contextualMetrics: ContextualMetrics;
}

export interface ContextualMetrics {
    impactRadius: number;
    changeRisk: number;
    testCoverage: number;
    documentationScore: number;
}

export interface GitAnalyticsData {
    repository: RepositoryInfo;
    commits: CommitData[];
    contributors: ContributorData[];
    fileHistory: FileHistoryData[];
    hotspots: FileHotspot[];
    trends: AnalyticsTrend[];
}

export interface RepositoryInfo {
    name: string;
    path: string;
    branch: string;
    remoteUrl?: string;
    lastCommit: CommitData;
    totalCommits: number;
    contributors: number;
}

export interface CommitData {
    hash: string;
    author: string;
    date: Date;
    message: string;
    filesChanged: number;
    insertions: number;
    deletions: number;
    impact: number;
}

export interface ContributorData {
    name: string;
    email: string;
    commits: number;
    linesAdded: number;
    linesRemoved: number;
    firstCommit: Date;
    lastCommit: Date;
    activity: ActivityData[];
}

export interface ActivityData {
    date: Date;
    commits: number;
    linesChanged: number;
}

export interface FileHistoryData {
    path: string;
    commits: number;
    authors: string[];
    firstCommit: Date;
    lastCommit: Date;
    churnRate: number;
}

export interface FileHotspot {
    path: string;
    changes: number;
    score: number;
    risk: 'low' | 'medium' | 'high';
    contributors: string[];
}

export interface AnalyticsTrend {
    metric: string;
    data: TrendDataPoint[];
    trend: 'increasing' | 'decreasing' | 'stable';
}

export interface TrendDataPoint {
    date: Date;
    value: number;
}