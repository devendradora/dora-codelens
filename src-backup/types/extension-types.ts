import * as vscode from 'vscode';

/**
 * Configuration validation result
 */
export interface ConfigurationValidation {
    isValid: boolean;
    issues: string[];
    warnings: string[];
}

/**
 * Extension configuration interface
 */
export interface ExtensionConfiguration {
    pythonPath?: string;
    enableCaching: boolean;
    showComplexityCodeLens: boolean;
    timeout: number;
}

/**
 * Analyzer options interface
 */
export interface AnalyzerOptions {
    projectPath: string;
    pythonPath?: string;
    timeout: number;
    enableCaching: boolean;
}

/**
 * Analysis state interface
 */
export interface AnalysisState {
    isAnalyzing: boolean;
    lastResult: any | null;
    currentOptions: AnalyzerOptions | null;
}

/**
 * Workspace state interface
 */
export interface WorkspaceState {
    hasPythonFiles: boolean;
    workspaceFolders: string[];
    lastAnalysisTime: number | null;
}

/**
 * Extension state interface
 */
export interface ExtensionState {
    isInitialized: boolean;
    analysisState: AnalysisState;
    workspaceState: WorkspaceState;
}

/**
 * Command context interface
 */
export interface CommandContext {
    uri?: vscode.Uri;
    position?: vscode.Position;
    analysisData?: any;
    workspaceFolder?: vscode.WorkspaceFolder;
}

/**
 * Command result interface
 */
export interface CommandResult {
    success: boolean;
    message?: string;
    data?: any;
    error?: Error;
}

/**
 * Function information interface for call hierarchy
 */
export interface FunctionInfo {
    name: string;
    module: string;
    fullName: string;
    startLine?: number;
    endLine?: number;
    parameters?: ParameterInfo[];
    returnType?: string;
    complexity?: number;
    docstring?: string;
}

/**
 * Parameter information interface
 */
export interface ParameterInfo {
    name: string;
    type_hint?: string;
    default_value?: string;
    is_vararg?: boolean;
    is_kwarg?: boolean;
}

/**
 * Class information interface
 */
export interface ClassInfo {
    name: string;
    startLine: number;
    endLine: number;
    methods: FunctionInfo[];
    properties: PropertyInfo[];
    inheritance: string[];
    docstring?: string;
}

/**
 * Property information interface
 */
export interface PropertyInfo {
    name: string;
    type?: string;
    line: number;
}

/**
 * Import information interface
 */
export interface ImportInfo {
    module: string;
    alias?: string;
    items: string[];
    isRelative: boolean;
    line: number;
}

/**
 * Complexity metrics interface
 */
export interface ComplexityMetrics {
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    linesOfCode: number;
    maintainabilityIndex: number;
}

/**
 * Repository information interface
 */
export interface RepositoryInfo {
    name: string;
    path: string;
    branch: string;
    remoteUrl?: string;
    lastCommit: CommitInfo;
    totalCommits: number;
}

/**
 * Commit information interface
 */
export interface CommitInfo {
    hash: string;
    author: string;
    date: Date;
    message: string;
    filesChanged: number;
    insertions: number;
    deletions: number;
}

/**
 * Contributor information interface
 */
export interface ContributorInfo {
    name: string;
    email: string;
    commits: number;
    linesAdded: number;
    linesRemoved: number;
    firstCommit: Date;
    lastCommit: Date;
}

/**
 * File change information interface
 */
export interface FileChangeInfo {
    path: string;
    changes: number;
    additions: number;
    deletions: number;
}

/**
 * Git analytics interface
 */
export interface GitAnalytics {
    commitFrequency: CommitFrequencyData[];
    fileHotspots: FileHotspot[];
    authorActivity: AuthorActivity[];
    codeChurn: CodeChurnData[];
}

/**
 * Commit frequency data interface
 */
export interface CommitFrequencyData {
    date: string;
    count: number;
}

/**
 * File hotspot interface
 */
export interface FileHotspot {
    path: string;
    changes: number;
    score: number;
}

/**
 * Author activity interface
 */
export interface AuthorActivity {
    author: string;
    commits: number;
    linesAdded: number;
    linesRemoved: number;
}

/**
 * Code churn data interface
 */
export interface CodeChurnData {
    date: string;
    additions: number;
    deletions: number;
}

/**
 * Schema information interface
 */
export interface SchemaInfo {
    name: string;
    tables: string[];
    views: string[];
    procedures: string[];
    functions: string[];
}

/**
 * Table information interface
 */
export interface TableInfo {
    name: string;
    schema: string;
    columns: ColumnInfo[];
    primaryKey: string[];
    foreignKeys: ForeignKeyInfo[];
    indexes: IndexInfo[];
}

/**
 * Column information interface
 */
export interface ColumnInfo {
    name: string;
    dataType: string;
    nullable: boolean;
    defaultValue?: string;
    maxLength?: number;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
}

/**
 * Foreign key information interface
 */
export interface ForeignKeyInfo {
    columnName: string;
    referencedTable: string;
    referencedColumn: string;
}

/**
 * Index information interface
 */
export interface IndexInfo {
    name: string;
    columns: string[];
    isUnique: boolean;
}

/**
 * Relationship information interface
 */
export interface RelationshipInfo {
    fromTable: string;
    toTable: string;
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
    foreignKey: string;
    referencedKey: string;
}

/**
 * Schema diagram interface
 */
export interface SchemaDiagram {
    nodes: SchemaNode[];
    edges: SchemaEdge[];
    layout: DiagramLayout;
}

/**
 * Schema node interface
 */
export interface SchemaNode {
    id: string;
    label: string;
    table: TableInfo;
    position?: Position;
}

/**
 * Schema edge interface
 */
export interface SchemaEdge {
    source: string;
    target: string;
    relationship: RelationshipInfo;
}

/**
 * Diagram layout interface
 */
export interface DiagramLayout {
    algorithm: string;
    options: any;
}

/**
 * Position interface
 */
export interface Position {
    x: number;
    y: number;
}

/**
 * Configuration manager interface
 */
export interface IConfigurationManager {
    validateConfiguration(): ConfigurationValidation;
    getConfiguration(): vscode.WorkspaceConfiguration;
    getPythonPath(): string | undefined;
    isCachingEnabled(): boolean;
    isComplexityCodeLensEnabled(): boolean;
    getTimeout(): number;
    openSettings(): void;
    isValidPath(filePath: string): boolean;
    getAnalyzerOptions(projectPath: string): AnalyzerOptions;
}

/**
 * Current file analysis result interface
 */
export interface CurrentFileAnalysisResult {
    success: boolean;
    filePath: string;
    language: string;
    functions: FunctionInfo[];
    classes: ClassInfo[];
    imports: ImportInfo[];
    complexity: ComplexityMetrics;
    errors?: Array<{ type: string; message: string }>;
}

/**
 * Git analysis result interface
 */
export interface GitAnalysisResult {
    success: boolean;
    repository: RepositoryInfo;
    commits: CommitInfo[];
    contributors: ContributorInfo[];
    fileChanges: FileChangeInfo[];
    analytics: GitAnalytics;
    errors?: Array<{ type: string; message: string }>;
}

/**
 * Database schema result interface
 */
export interface DatabaseSchemaResult {
    success: boolean;
    schemas: SchemaInfo[];
    tables: TableInfo[];
    relationships: RelationshipInfo[];
    diagram: SchemaDiagram;
    errors?: Array<{ type: string; message: string }>;
}

/**
 * Analysis manager interface
 */
export interface IAnalysisManager {
    getState(): AnalysisState;
    getLastResult(): any | null;
    isAnalyzing(): boolean;
    analyzeProject(): Promise<any | null>;
    runCurrentFileAnalysis(filePath: string, progress?: vscode.Progress<{ message?: string; increment?: number }>, token?: vscode.CancellationToken): Promise<CurrentFileAnalysisResult>;
    runGitAnalysis(options?: any, progress?: vscode.Progress<{ message?: string; increment?: number }>, token?: vscode.CancellationToken): Promise<GitAnalysisResult>;
    runDatabaseSchemaAnalysis(options?: any, progress?: vscode.Progress<{ message?: string; increment?: number }>, token?: vscode.CancellationToken): Promise<DatabaseSchemaResult>;
    showCallHierarchy(uri?: vscode.Uri, position?: vscode.Position): Promise<void>;
    cancelAnalysis(): void;
    hasValidAnalysisData(result: any): boolean;
    hasValidFunctionData(result: any): boolean;
    isServiceAvailable(serviceName: string): boolean;
}

/**
 * Workspace service interface
 */
export interface IWorkspaceService {
    initialize(): Promise<void>;
    getState(): WorkspaceState;
    checkPythonProject(): Promise<boolean>;
    setupFileWatchers(): void;
    getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] | undefined;
    getPrimaryWorkspaceFolder(): vscode.WorkspaceFolder | undefined;
    hasPythonFiles(): boolean;
    findPythonFiles(maxResults?: number): Promise<vscode.Uri[]>;
    findDependencyFiles(): Promise<vscode.Uri[]>;
    getRelativePath(uri: vscode.Uri): string;
    isFileInWorkspace(uri: vscode.Uri): boolean;
    updateAnalysisTime(): void;
    getTimeSinceLastAnalysis(): number | null;
    dispose(): void;
}

/**
 * UI state interface
 */
export interface UIState {
    activeWebviews: string[];
    statusBarVisible: boolean;
    lastViewType: string | null;
}

/**
 * UI Manager interface
 */
export interface IUIManager {
    updateStatusBar(text: string, tooltip?: string): void;
    showModuleGraph(result?: any): Promise<void>;
    showJsonView(result: any): Promise<void>;
    showFullCodeAnalysis(result: any): Promise<void>;
    showCurrentFileAnalysis(analysisData: any): Promise<void>;
    showGitAuthorStatistics(analysisData: any): Promise<void>;
    showGitModuleContributions(analysisData: any): Promise<void>;
    showGitCommitTimeline(analysisData: any): Promise<void>;
    showDatabaseSchemaGraphView(analysisData: any): Promise<void>;
    showDatabaseSchemaRawSQL(analysisData: any): Promise<void>;
    formatJsonInEditor(): Promise<void>;
    showJsonTreeView(): Promise<void>;
    showFunctionComplexityDetails(func: any, uri: vscode.Uri, position: vscode.Position): void;
    updateUIComponents(result: any): void;
    clearCache(): Promise<void>;
    refreshSidebar(): void;
    navigateToItem(item: any): void;
    filterSidebar(): void;
    selectModule(item: any): void;
    clearModuleSelection(): void;
    showModuleDependencies(item: any): void;
    dispose(): void;
}

/**
 * Command Manager interface
 */
export interface ICommandManager {
    registerAllCommands(): void;
    getCommands(): Map<string, any>;
    getCommandsByCategory(category: any): any[];
    dispose(): void;
}

/**
 * Git analysis options interface
 */
export interface GitAnalysisOptions {
    projectPath: string;
    analysisType: 'git_author_statistics' | 'git_module_contributions' | 'git_commit_timeline';
    timeout: number;
}

/**
 * Git analysis result interface
 */
export interface GitAnalysisResult {
    success: boolean;
    data?: any;
    errors?: Array<{ type: string; message: string }>;
    warnings?: Array<{ type: string; message: string }>;
    executionTime?: number;
}

/**
 * Git Service interface
 */
export interface IGitService {
    runGitAuthorStatistics(): Promise<GitAnalysisResult>;
    runGitModuleContributions(): Promise<GitAnalysisResult>;
    runGitCommitTimeline(): Promise<GitAnalysisResult>;
    checkGitInstallation(): Promise<boolean>;
    initializeGitRepository(): Promise<void>;
    dispose(): void;
}

/**
 * Extension Manager interface
 */
export interface IExtensionManager {
    initialize(): Promise<void>;
    getConfigurationManager(): any;
    getAnalysisManager(): any;
    getUIManager(): any;
    getWorkspaceService(): any;
    getGitService(): IGitService;
    getCommandManager(): any;
    getOutputChannel(): vscode.OutputChannel;
    isExtensionInitialized(): boolean;
    updateUIComponents(result: any): void;
    handleExtensionError(error: Error, context: string): void;
    dispose(): void;
}