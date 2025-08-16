import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Interface for tabbed analysis data that will be displayed in the webview
 */
export interface TabbedAnalysisData {
    techStack?: TechStackData;
    modules?: ModuleGraphData;
    functions?: CallGraphData;
    gitAnalytics?: GitAnalyticsData;
    dbSchema?: DatabaseSchemaData;
    currentFile?: CurrentFileData;
    exportMetadata?: ExportMetadata;
}

/**
 * Tech stack data structure
 */
export interface TechStackData {
    libraries: Library[];
    frameworks: Framework[];
    pythonVersion: string;
    packageManager: 'pip' | 'poetry' | 'pipenv';
    dependencies: Dependency[];
}

export interface Library {
    name: string;
    version?: string;
    category?: string;
    description?: string;
}

export interface Framework {
    name: string;
    version?: string;
    patterns?: any;
    confidence: number;
}

export interface Dependency {
    name: string;
    version?: string;
    type: 'direct' | 'transitive';
    source: string;
}

/**
 * Module graph data structure with enhanced styling
 */
export interface ModuleGraphData {
    nodes: ModuleCardNode[];
    edges: ModuleEdge[];
    folderStructure: FolderStructure;
}

export interface ModuleCardNode {
    id: string;
    name: string;
    displayName: string;
    path: string;
    folderPath: string;
    complexity: ComplexityMetrics;
    fileCount: number;
    dependencies: string[];
    styling: CardStyling;
    position?: Position;
    metadata: ModuleMetadata;
}

export interface ComplexityMetrics {
    overall: number;
    cyclomatic: number;
    maintainability: number;
    colorCode: 'green' | 'orange' | 'red';
    trend?: 'improving' | 'stable' | 'degrading';
}

export interface CardStyling {
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    borderRadius: number;
    shadowStyle: string;
    textColor: string;
    fontSize: string;
    padding: string;
    minWidth: number;
    minHeight: number;
}

export interface Position {
    x: number;
    y: number;
}

export interface ModuleMetadata {
    lastModified: string;
    size: number;
    functions: string[];
    classes: string[];
}

export interface ModuleEdge {
    source: string;
    target: string;
    type: 'import' | 'dependency';
    weight: number;
}

export interface FolderStructure {
    rootPath: string;
    folders: FolderNode[];
    moduleGroupings: ModuleGrouping[];
}

export interface FolderNode {
    path: string;
    name: string;
    type: 'app' | 'module' | 'package' | 'utility';
    children: FolderNode[];
    moduleCount: number;
    complexity: number;
}

export interface ModuleGrouping {
    folderPath: string;
    modules: string[];
    groupType: string;
}

/**
 * Call graph data structure
 */
export interface CallGraphData {
    nodes: FunctionNode[];
    edges: CallEdge[];
}

export interface FunctionNode {
    id: string;
    name: string;
    module: string;
    complexity: number;
    lineNumber: number;
    parameters: Parameter[];
}

export interface Parameter {
    name: string;
    type_hint?: string;
    default_value?: string;
    is_vararg?: boolean;
    is_kwarg?: boolean;
}

export interface CallEdge {
    caller: string;
    callee: string;
    callCount: number;
    lineNumbers: number[];
}

/**
 * Git analytics data structure
 */
export interface GitAnalyticsData {
    repositoryInfo: RepositoryInfo;
    authorContributions: AuthorContribution[];
    moduleStatistics: ModuleGitStats[];
    commitTimeline: CommitTimelineEntry[];
    contributionGraphs: ContributionGraphData[];
}

export interface RepositoryInfo {
    name: string;
    branch: string;
    totalCommits: number;
    dateRange: DateRange;
    contributors: number;
}

export interface DateRange {
    start: string;
    end: string;
}

export interface AuthorContribution {
    authorName: string;
    authorEmail: string;
    totalCommits: number;
    linesAdded: number;
    linesRemoved: number;
    modulesTouched: string[];
    firstCommit: string;
    lastCommit: string;
    contributionPercentage: number;
}

export interface ModuleGitStats {
    modulePath: string;
    totalCommits: number;
    uniqueAuthors: number;
    linesAdded: number;
    linesRemoved: number;
    authorBreakdown: AuthorContribution[];
    commitFrequency: { [month: string]: number };
}

export interface CommitTimelineEntry {
    date: string;
    commits: number;
    authors: string[];
    modules: string[];
}

export interface ContributionGraphData {
    type: 'commits' | 'lines_added' | 'lines_removed';
    data: {
        labels: string[];
        datasets: {
            label: string;
            data: number[];
            backgroundColor: string;
            borderColor: string;
        }[];
    };
}

/**
 * Database schema data structure
 */
export interface DatabaseSchemaData {
    tables: SQLTable[];
    relationships: TableRelationship[];
    indexes: DatabaseIndex[];
    constraints: DatabaseConstraint[];
    rawSQL: SQLStatement[];
    graphData: SchemaGraphData;
    metadata: SchemaMetadata;
}

export interface SQLTable {
    name: string;
    schema: string;
    columns: TableColumn[];
    primaryKeys: string[];
    foreignKeys: ForeignKey[];
    indexes: string[];
    constraints: string[];
    estimatedRows?: number;
}

export interface TableColumn {
    name: string;
    dataType: string;
    nullable: boolean;
    defaultValue?: string;
    maxLength?: number;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
}

export interface ForeignKey {
    columnName: string;
    referencedTable: string;
    referencedColumn: string;
}

export interface TableRelationship {
    fromTable: string;
    toTable: string;
    relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-many';
    foreignKeyColumn: string;
    referencedColumn: string;
}

export interface DatabaseIndex {
    name: string;
    table: string;
    columns: string[];
    isUnique: boolean;
}

export interface DatabaseConstraint {
    name: string;
    table: string;
    type: string;
    definition: string;
}

export interface SQLStatement {
    statementType: string;
    content: string;
    filePath: string;
    lineNumber: number;
    tableReferences: string[];
}

export interface SchemaGraphData {
    nodes: SchemaNode[];
    edges: SchemaEdge[];
}

export interface SchemaNode {
    id: string;
    label: string;
    table: SQLTable;
    position?: Position;
}

export interface SchemaEdge {
    source: string;
    target: string;
    relationship: TableRelationship;
}

export interface SchemaMetadata {
    analysisDate: string;
    totalTables: number;
    totalRelationships: number;
    databaseType?: string;
}

/**
 * Current file analysis data structure
 */
export interface CurrentFileData {
    filePath: string;
    fileName: string;
    complexity: ComplexityMetrics;
    dependencies: string[];
    functions: FunctionNode[];
    classes: ClassNode[];
    imports: ImportStatement[];
    frameworkPatterns: any;
}

export interface ClassNode {
    name: string;
    lineNumber: number;
    methods: string[];
    complexity: number;
}

export interface ImportStatement {
    module: string;
    items: string[];
    isFromImport: boolean;
    lineNumber: number;
}

/**
 * Export metadata structure
 */
export interface ExportMetadata {
    analysisTimestamp: string;
    doraCodeBirdVersion: string;
    projectPath: string;
    totalFiles: number;
    totalLines: number;
}

/**
 * Tab configuration interface
 */
export interface TabConfig {
    id: string;
    title: string;
    icon: string;
    enabled: boolean;
    hasSubTabs?: boolean;
    subTabs?: SubTabConfig[];
}

export interface SubTabConfig {
    id: string;
    title: string;
    parentTab: string;
}

/**
 * Webview message types for tabbed interface communication
 */
export interface TabbedWebviewMessage {
    command: string;
    data?: any;
    tabId?: string;
    subTabId?: string;
}

/**
 * TabbedWebviewProvider manages the multi-tab analysis interface
 */
export class TabbedWebviewProvider {
    private panel: vscode.WebviewPanel | undefined;
    private context: vscode.ExtensionContext;
    private outputChannel: vscode.OutputChannel;
    private analysisData: TabbedAnalysisData | null = null;
    private currentTab: string = 'techstack';
    private currentSubTab: string | null = null;
    private debugMode: boolean = false;
    private tabConfigs: TabConfig[] = [];

    constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
        this.context = context;
        this.outputChannel = outputChannel;
        
        // Enable debug mode based on configuration or development environment
        const config = vscode.workspace.getConfiguration('doracodebird');
        this.debugMode = config.get('enableDebugMode', false) || 
                        context.extensionMode === vscode.ExtensionMode.Development;
        
        // Initialize tab configurations
        this.initializeTabConfigs();
        
        if (this.debugMode) {
            this.log('Debug mode enabled for TabbedWebviewProvider');
        }
    }

    /**
     * Initialize tab configurations
     */
    private initializeTabConfigs(): void {
        this.tabConfigs = [
            {
                id: 'techstack',
                title: 'Tech Stack',
                icon: '📚',
                enabled: true
            },
            {
                id: 'codegraph',
                title: 'Code Graph',
                icon: '🔗',
                enabled: true
            },
            {
                id: 'codegraphjson',
                title: 'Code Graph JSON',
                icon: '📄',
                enabled: true
            }
        ];
    }

    /**
     * Show the full analysis in tabbed interface
     */
    public showFullAnalysis(analysisData: TabbedAnalysisData): void {
        this.analysisData = analysisData;
        this.currentTab = 'techstack';
        this.currentSubTab = null;
        
        this.createOrShowWebview();
        this.updateWebviewContent();
        
        this.log('Full analysis tabbed webview displayed');
    }

    /**
     * Show specific tab
     */
    public showTab(tabId: string, analysisData?: TabbedAnalysisData): void {
        if (analysisData) {
            this.analysisData = analysisData;
        }
        
        this.currentTab = tabId;
        this.currentSubTab = null;
        
        this.createOrShowWebview();
        this.updateWebviewContent();
        
        this.log(`Tabbed webview displayed with ${tabId} tab active`);
    }

    /**
     * Show current file analysis in tabbed interface
     */
    public showCurrentFileAnalysis(analysisData: any, view: 'graph' | 'json' = 'graph'): void {
        // Convert current file analysis data to tabbed format
        const tabbedData = this.convertCurrentFileAnalysisToTabbedData(analysisData);
        
        this.analysisData = tabbedData;
        this.currentTab = view === 'json' ? 'codegraphjson' : 'codegraph';
        this.currentSubTab = null;
        
        // Set tab configs for current file analysis (exclude tech stack)
        this.tabConfigs = [
            {
                id: 'codegraph',
                title: 'Code Graph',
                icon: '🔗',
                enabled: true
            },
            {
                id: 'codegraphjson',
                title: 'Code Graph JSON',
                icon: '📄',
                enabled: true
            }
        ];
        
        this.createOrShowWebview();
        this.updateWebviewContent();
        
        this.log(`Current file analysis tabbed webview displayed in ${view} view`);
    }

    /**
     * Switch to a specific tab
     */
    public switchToTab(tabId: string, subTabId?: string): void {
        this.currentTab = tabId;
        this.currentSubTab = subTabId || null;
        
        if (this.panel && this.panel.visible) {
            this.sendMessageToWebview({
                command: 'switchTab',
                tabId: tabId,
                subTabId: subTabId
            });
        }
        
        this.log(`Switched to tab: ${tabId}${subTabId ? ` (${subTabId})` : ''}`);
    }

    /**
     * Update tab content
     */
    public updateTabContent(tabId: string, content: any): void {
        if (this.panel && this.panel.visible) {
            this.sendMessageToWebview({
                command: 'updateTabContent',
                tabId: tabId,
                data: content
            });
        }
        
        this.log(`Updated content for tab: ${tabId}`);
    }

    /**
     * Update the webview with new analysis data
     */
    public updateAnalysisData(analysisData: TabbedAnalysisData | null): void {
        this.analysisData = analysisData;
        
        if (this.panel && this.panel.visible) {
            this.updateWebviewContent();
        }
    }

    /**
     * Create or show the webview panel
     */
    private createOrShowWebview(): void {
        try {
            const columnToShowIn = vscode.window.activeTextEditor
                ? vscode.window.activeTextEditor.viewColumn
                : undefined;

            if (this.panel) {
                // If panel exists, just reveal it
                this.panel.reveal(columnToShowIn);
                return;
            }

            // Validate extension resources exist
            const resourcesPath = vscode.Uri.joinPath(this.context.extensionUri, 'resources');
            
            // Create new webview panel
            this.panel = vscode.window.createWebviewPanel(
                'doracodebirdTabbedView',
                'DoraCodeBirdView - Analysis Dashboard',
                columnToShowIn || vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        resourcesPath,
                        vscode.Uri.joinPath(this.context.extensionUri, 'node_modules')
                    ]
                }
            );

            // Set up webview icon with error handling
            try {
                this.panel.iconPath = {
                    light: vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'light', 'graph.svg'),
                    dark: vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'dark', 'graph.svg')
                };
            } catch (iconError) {
                this.log('Failed to set webview icon');
            }

            // Handle webview disposal
            this.panel.onDidDispose(() => {
                this.panel = undefined;
                this.log('Tabbed webview panel disposed');
            }, null, this.context.subscriptions);

            // Handle webview state changes
            this.panel.onDidChangeViewState(e => {
                if (e.webviewPanel.visible) {
                    this.log('Tabbed webview became visible, updating content');
                    this.updateWebviewContent();
                } else {
                    this.log('Tabbed webview became hidden');
                }
            }, null, this.context.subscriptions);

            // Handle messages from webview with error handling
            this.panel.webview.onDidReceiveMessage(
                (message: TabbedWebviewMessage) => {
                    try {
                        this.handleWebviewMessage(message);
                    } catch (error) {
                        this.logError('Error handling tabbed webview message', error instanceof Error ? error : new Error(String(error)));
                    }
                },
                undefined,
                this.context.subscriptions
            );

            this.log('Tabbed webview panel created successfully');
            
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error));
            this.logError('Failed to create tabbed webview panel', errorObj);
            throw errorObj;
        }
    }

    /**
     * Update the webview content based on current tab and data
     */
    private updateWebviewContent(): void {
        if (!this.panel) {
            return;
        }

        try {
            this.log(`Updating tabbed webview content for ${this.currentTab} tab`);
            
            const html = this.getWebviewHtml();
            this.panel.webview.html = html;

            // Send analysis data to webview after a short delay to ensure DOM is ready
            setTimeout(() => {
                try {
                    this.sendMessageToWebview({
                        command: 'updateData',
                        data: {
                            analysisData: this.analysisData,
                            currentTab: this.currentTab,
                            currentSubTab: this.currentSubTab,
                            tabConfigs: this.tabConfigs,
                            debugMode: this.debugMode
                        }
                    });
                    
                    this.log(`Tabbed webview content updated for ${this.currentTab} tab`);
                    
                } catch (error) {
                    this.logError('Failed to send data to tabbed webview', error instanceof Error ? error : new Error(String(error)));
                }
            }, 100);

        } catch (error) {
            this.logError('Failed to update tabbed webview content', error instanceof Error ? error : new Error(String(error)));
        }
    }

    /**
     * Generate HTML content for the tabbed webview
     */
    private getWebviewHtml(): string {
        const webview = this.panel!.webview;
        
        // Get URIs for resources
        const cytoscapeUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'cytoscape', 'dist', 'cytoscape.min.js')
        );
        
        const cytoscapeDagreUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'cytoscape-dagre', 'cytoscape-dagre.js')
        );
        
        const dagreUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'dagre', 'dist', 'dagre.min.js')
        );
        
        const chartJsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'chart.js', 'dist', 'chart.min.js')
        );
        
        const gitAnalyticsChartsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'git-analytics-charts.js')
        );
        
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'webview.css')
        );

        // Generate nonce for security
        const nonce = this.getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource} 'unsafe-eval'; img-src ${webview.cspSource} data:;">
    <link href="${styleUri}" rel="stylesheet">
    <title>DoraCodeBirdView - Analysis Dashboard</title>
    <style nonce="${nonce}">
        /* Tabbed interface styles */
        .tab-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }

        .tab-header {
            display: flex;
            background-color: var(--vscode-tab-inactiveBackground);
            border-bottom: 1px solid var(--vscode-tab-border);
            overflow-x: auto;
            flex-shrink: 0;
        }

        .tab-button {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            background: none;
            border: none;
            color: var(--vscode-tab-inactiveForeground);
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s ease;
            border-bottom: 2px solid transparent;
            font-size: 13px;
            font-family: var(--vscode-font-family);
        }

        .tab-button:hover {
            background-color: var(--vscode-tab-hoverBackground);
            color: var(--vscode-tab-activeForeground);
        }

        .tab-button.active {
            background-color: var(--vscode-tab-activeBackground);
            color: var(--vscode-tab-activeForeground);
            border-bottom-color: var(--vscode-tab-activeBorder);
        }

        .tab-icon {
            margin-right: 6px;
            font-size: 14px;
        }

        .tab-content {
            flex: 1;
            overflow: hidden;
            position: relative;
        }

        .tab-panel {
            display: none;
            height: 100%;
            overflow: auto;
            padding: 16px;
        }

        .tab-panel.active {
            display: block;
        }

        /* Sub-tab styles */
        .sub-tab-header {
            display: flex;
            background-color: var(--vscode-editor-background);
            border-bottom: 1px solid var(--vscode-widget-border);
            margin: -16px -16px 16px -16px;
            padding: 0 16px;
        }

        .sub-tab-button {
            padding: 8px 12px;
            background: none;
            border: none;
            color: var(--vscode-foreground);
            cursor: pointer;
            font-size: 12px;
            opacity: 0.7;
            transition: opacity 0.2s ease;
        }

        .sub-tab-button:hover {
            opacity: 1;
        }

        .sub-tab-button.active {
            opacity: 1;
            border-bottom: 2px solid var(--vscode-focusBorder);
        }

        .sub-tab-content {
            display: none;
        }

        .sub-tab-content.active {
            display: block;
        }

        /* Loading and error states */
        .loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 200px;
            color: var(--vscode-descriptionForeground);
        }

        .spinner {
            width: 24px;
            height: 24px;
            border: 2px solid var(--vscode-progressBar-background);
            border-top: 2px solid var(--vscode-progressBar-foreground);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 12px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .error {
            padding: 16px;
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 4px;
            color: var(--vscode-inputValidation-errorForeground);
            margin: 16px 0;
        }

        .hidden {
            display: none !important;
        }

        /* Module info panel styles - Updated to be footer modal */
        .module-info-panel {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
            max-height: 40vh;
            background-color: var(--vscode-editor-background);
            border-top: 1px solid var(--vscode-widget-border);
            box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            overflow-y: auto;
            display: none;
            transform: translateY(100%);
            transition: transform 0.3s ease-in-out;
        }

        .module-info-panel.show {
            transform: translateY(0);
            display: block;
        }

        .module-info-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-bottom: 1px solid var(--vscode-widget-border);
        }

        .module-info-header h3 {
            margin: 0;
            color: var(--vscode-foreground);
        }

        .module-info-content {
            padding: 16px;
        }

        .info-section {
            margin-bottom: 12px;
            font-size: 13px;
            color: var(--vscode-foreground);
        }

        .complexity-badge {
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 600;
            font-size: 11px;
        }

        .complexity-badge.green {
            background-color: #27ae60;
            color: white;
        }

        .complexity-badge.orange {
            background-color: #f39c12;
            color: white;
        }

        .complexity-badge.red {
            background-color: #e74c3c;
            color: white;
        }

        /* Cytoscape highlighting styles */
        .dimmed {
            opacity: 0.3 !important;
        }

        .highlighted {
            opacity: 1 !important;
        }

        /* Table info panel styles */
        .table-info-panel {
            position: absolute;
            top: 20px;
            right: 20px;
            width: 400px;
            max-height: 80%;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            overflow-y: auto;
            display: none;
        }

        .table-info-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-bottom: 1px solid var(--vscode-widget-border);
        }

        .table-info-header h3 {
            margin: 0;
            color: var(--vscode-foreground);
        }

        .close-btn {
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            color: var(--vscode-foreground);
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .table-info-content {
            padding: 16px;
        }

        .table-summary {
            margin-bottom: 16px;
        }

        .summary-item {
            margin-bottom: 8px;
            font-size: 13px;
        }

        .columns-table h4 {
            margin: 0 0 8px 0;
            color: var(--vscode-foreground);
        }

        .columns-table table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }

        .columns-table th,
        .columns-table td {
            padding: 6px 8px;
            text-align: left;
            border-bottom: 1px solid var(--vscode-widget-border);
        }

        .columns-table th {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .column-name.primary-key {
            font-weight: 600;
            color: var(--vscode-charts-blue);
        }

        .column-name.foreign-key {
            font-weight: 600;
            color: var(--vscode-charts-orange);
        }

        .column-type {
            color: var(--vscode-descriptionForeground);
        }

        /* Raw SQL styles */
        .raw-sql-container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .raw-sql-header {
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--vscode-widget-border);
        }

        .sql-summary {
            display: flex;
            gap: 24px;
            margin-top: 16px;
        }

        .summary-stat {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 12px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 6px;
            min-width: 80px;
        }

        .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: var(--vscode-charts-blue);
        }

        .stat-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            text-align: center;
        }

        .sql-section {
            margin-bottom: 32px;
        }

        .sql-type-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 16px;
            color: var(--vscode-foreground);
            font-size: 18px;
        }

        .sql-type-icon {
            font-size: 20px;
        }

        .sql-statements {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .sql-statement {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 8px;
            overflow: hidden;
        }

        .sql-statement-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-bottom: 1px solid var(--vscode-widget-border);
        }

        .sql-file-path {
            font-size: 13px;
            color: var(--vscode-foreground);
            font-weight: 500;
        }

        .sql-line-number {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }

        .sql-content {
            margin: 0;
            padding: 16px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-editor-font-family);
            font-size: 13px;
            line-height: 1.4;
            overflow-x: auto;
            white-space: pre-wrap;
        }

        .sql-references {
            padding: 8px 12px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-top: 1px solid var(--vscode-widget-border);
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }

        /* Content area styles */
        .content-area {
            height: 100%;
            overflow: auto;
        }

        /* Module cards container */
        .module-cards-container {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            padding: 20px;
            justify-content: flex-start;
            align-items: flex-start;
        }

        .module-cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 16px;
            padding: 20px;
        }

        /* Graph view container */
        .graph-view-container {
            position: relative;
            height: 100%;
            width: 100%;
        }

        .graph-controls {
            position: absolute;
            top: 16px;
            left: 16px;
            z-index: 100;
            display: flex;
            gap: 8px;
            background-color: var(--vscode-editor-background);
            padding: 8px;
            border-radius: 6px;
            border: 1px solid var(--vscode-widget-border);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .graph-control-btn {
            padding: 6px 12px;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s ease;
        }

        .graph-control-btn:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .graph-control-btn.active {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .view-toggle {
            display: flex;
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            overflow: hidden;
        }

        .view-toggle button {
            padding: 6px 12px;
            background: none;
            border: none;
            color: var(--vscode-input-foreground);
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.2s ease;
        }

        .view-toggle button.active {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .view-toggle button:hover:not(.active) {
            background-color: var(--vscode-list-hoverBackground);
        }

        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 200px;
            color: var(--vscode-descriptionForeground);
            text-align: center;
        }

        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.5;
        }

        .empty-state-message {
            font-size: 16px;
            margin-bottom: 8px;
        }

        .empty-state-description {
            font-size: 14px;
            opacity: 0.7;
        }
    </style>
</head>
<body>
    <div class="tab-container">
        <div class="tab-header" id="tabHeader">
            <!-- Tabs will be dynamically generated -->
        </div>
        
        <div class="tab-content" id="tabContent">
            <!-- Tech Stack Tab -->
            <div class="tab-panel" id="techstack-panel">
                <div class="content-area" id="techstack-content">
                    <div class="loading">
                        <div class="spinner"></div>
                        <p>Loading tech stack data...</p>
                    </div>
                </div>
            </div>

            <!-- Code Graph Tab -->
            <div class="tab-panel" id="codegraph-panel">
                <div class="content-area" id="codegraph-content">
                    <!-- Graph Controls Toolbar -->
                    <div class="graph-toolbar" style="display: flex; align-items: center; padding: 8px 16px; background-color: var(--vscode-editor-inactiveSelectionBackground); border-bottom: 1px solid var(--vscode-widget-border); gap: 12px;">
                        <input type="text" id="searchInput" placeholder="Search nodes..." style="padding: 6px 12px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); border-radius: 4px; min-width: 200px;">
                        <button onclick="fitToView()" style="padding: 6px 12px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer;" title="Fit to View">🔍 Fit</button>
                        <button onclick="zoomIn()" style="padding: 6px 12px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer;" title="Zoom In">🔍+ Zoom In</button>
                        <button onclick="zoomOut()" style="padding: 6px 12px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer;" title="Zoom Out">🔍- Zoom Out</button>
                        <button onclick="resetView()" style="padding: 6px 12px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer;" title="Reset View">🔄 Reset</button>
                        <div style="margin-left: auto; display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 12px; color: var(--vscode-descriptionForeground);">Complexity:</span>
                            <span style="display: inline-block; width: 12px; height: 12px; background: #28a745; border-radius: 2px;" title="Low (≤5)"></span>
                            <span style="font-size: 11px; color: var(--vscode-descriptionForeground);">Low</span>
                            <span style="display: inline-block; width: 12px; height: 12px; background: #ffc107; border-radius: 2px;" title="Medium (6-10)"></span>
                            <span style="font-size: 11px; color: var(--vscode-descriptionForeground);">Medium</span>
                            <span style="display: inline-block; width: 12px; height: 12px; background: #dc3545; border-radius: 2px;" title="High (>10)"></span>
                            <span style="font-size: 11px; color: var(--vscode-descriptionForeground);">High</span>
                        </div>
                    </div>
                    <div id="cy" style="width: 100%; height: calc(100% - 60px);"></div>
                    <!-- Module info panel for showing dependency details -->
                    <div class="module-info-panel" id="moduleInfoPanel">
                        <div class="module-info-header">
                            <h3 id="moduleInfoTitle">Module Details</h3>
                            <button class="close-btn" onclick="closeModuleInfo()">×</button>
                        </div>
                        <div class="module-info-content" id="moduleInfoContent">
                            <!-- Module details will be populated here -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Code Graph JSON Tab -->
            <div class="tab-panel" id="codegraphjson-panel">
                <div class="content-area" id="codegraphjson-content">
                    <div class="json-controls" style="margin-bottom: 16px;">
                        <button onclick="exportCodeGraphJson()" style="padding: 8px 16px; margin-right: 8px;">Export JSON</button>
                        <button onclick="copyCodeGraphJson()" style="padding: 8px 16px;">Copy to Clipboard</button>
                    </div>
                    <pre id="codegraph-json-display" style="white-space: pre-wrap; font-family: var(--vscode-editor-font-family); background: var(--vscode-editor-background); padding: 16px; border-radius: 4px; overflow: auto; max-height: 80vh;"></pre>
                </div>
            </div>
        </div>
    </div>

    <!-- Load libraries with proper error handling -->
    <script src="${dagreUri}" nonce="${nonce}"></script>
    <script src="${cytoscapeUri}" nonce="${nonce}"></script>
    <script src="${cytoscapeDagreUri}" nonce="${nonce}"></script>
    <script src="${chartJsUri}" nonce="${nonce}"></script>
    <script src="${webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'git-analytics-charts.js'))}" nonce="${nonce}"></script>
    <script src="${webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'database-schema-graph.js'))}" nonce="${nonce}"></script>
    
    <script nonce="${nonce}">
        // Global variables
        let cy = null;
        let schemaCy = null;
        let analysisData = null;
        let currentTab = 'techstack';
        let currentSubTab = null;
        let tabConfigs = [];
        let debugMode = false;
        
        // VS Code API
        const vscode = acquireVsCodeApi();
        
        // Initialize the tabbed webview
        function initialize() {
            try {
                console.log('Starting tabbed webview initialization');
                
                setupEventListeners();
                
                console.log('DoraCodeBirdView tabbed webview initialized successfully');
                
                // Request initial data
                vscode.postMessage({ command: 'ready' });
                
            } catch (error) {
                console.error('Error initializing tabbed webview:', error);
                showError('Failed to initialize tabbed interface: ' + error.message);
            }
        }

        // Set up event listeners
        function setupEventListeners() {
            // Tab switching
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('tab-button')) {
                    const tabId = e.target.dataset.tab;
                    switchTab(tabId);
                } else if (e.target.classList.contains('sub-tab-button')) {
                    const subTabId = e.target.dataset.subtab;
                    switchSubTab(subTabId);
                }
            });
            
            // Setup search functionality
            setupSearch();
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'updateData':
                    handleDataUpdate(message.data);
                    break;
                case 'switchTab':
                    switchTab(message.tabId, message.subTabId);
                    break;
                case 'updateTabContent':
                    updateTabContent(message.tabId, message.data);
                    break;
                case 'error':
                    showError(message.data.message);
                    break;
                default:
                    console.log('Unknown message:', message.command);
            }
        });
        
        // Handle data update from extension
        function handleDataUpdate(data) {
            try {
                console.log('Handling tabbed data update', data);
                
                analysisData = data.analysisData;
                currentTab = data.currentTab || 'techstack';
                currentSubTab = data.currentSubTab;
                tabConfigs = data.tabConfigs || [];
                debugMode = data.debugMode || false;
                
                renderTabs();
                switchTab(currentTab, currentSubTab);
                
                if (analysisData) {
                    renderCurrentTabContent();
                }
                
            } catch (error) {
                console.error('Failed to handle tabbed data update:', error);
                showError('Failed to process analysis data: ' + error.message);
            }
        }
        
        // Render tab headers
        function renderTabs() {
            const tabHeader = document.getElementById('tabHeader');
            tabHeader.innerHTML = '';
            
            tabConfigs.forEach(config => {
                if (config.enabled) {
                    const button = document.createElement('button');
                    button.className = 'tab-button';
                    button.dataset.tab = config.id;
                    button.innerHTML = \`<span class="tab-icon">\${config.icon}</span>\${config.title}\`;
                    
                    if (config.id === currentTab) {
                        button.classList.add('active');
                    }
                    
                    tabHeader.appendChild(button);
                }
            });
        }
        
        // Switch to a specific tab
        function switchTab(tabId, subTabId = null) {
            currentTab = tabId;
            currentSubTab = subTabId;
            
            // Update tab button states
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tabId);
            });
            
            // Update tab panel visibility
            document.querySelectorAll('.tab-panel').forEach(panel => {
                panel.classList.toggle('active', panel.id === tabId + '-panel');
            });
            
            // Handle sub-tabs if applicable
            if (subTabId) {
                switchSubTab(subTabId);
            }
            
            // Render content for the active tab
            renderCurrentTabContent();
            
            // Notify extension about tab change
            vscode.postMessage({
                command: 'tabChanged',
                tabId: tabId,
                subTabId: subTabId
            });
        }
        
        // Switch to a specific sub-tab
        function switchSubTab(subTabId) {
            currentSubTab = subTabId;
            
            // Update sub-tab button states
            document.querySelectorAll('.sub-tab-button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.subtab === subTabId);
            });
            
            // Update sub-tab content visibility
            document.querySelectorAll('.sub-tab-content').forEach(content => {
                const isActive = content.id.includes(subTabId);
                content.classList.toggle('active', isActive);
            });
            
            // Render sub-tab content
            renderCurrentTabContent();
        }
        
        // Render content for the current tab
        function renderCurrentTabContent() {
            if (!analysisData) {
                showEmptyState(currentTab);
                return;
            }
            
            try {
                switch (currentTab) {
                    case 'techstack':
                        renderTechStackTab();
                        break;
                    case 'codegraph':
                        renderCodeGraphTab();
                        break;
                    case 'codegraphjson':
                        renderCodeGraphJsonTab();
                        break;
                    default:
                        showEmptyState(currentTab);
                }
            } catch (error) {
                console.error(\`Error rendering \${currentTab} tab:\`, error);
                showError(\`Failed to render \${currentTab} content: \${error.message}\`);
            }
        }
        
        // Render tech stack tab
        function renderTechStackTab() {
            const content = document.getElementById('techstack-content');
            
            if (!analysisData.techStack) {
                content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📚</div><div class="empty-state-message">No tech stack data available</div></div>';
                return;
            }
            
            const techStack = analysisData.techStack;
            
            // Create detailed tech stack visualization
            const librariesHtml = (techStack.libraries || []).map(lib => \`
                <div class="library-item">
                    <div class="library-header">
                        <span class="library-name">\${lib.name}</span>
                        \${lib.version ? \`<span class="library-version">\${lib.version}</span>\` : ''}
                        \${lib.category ? \`<span class="library-category">\${lib.category}</span>\` : ''}
                    </div>
                    \${lib.description ? \`<div class="library-description">\${lib.description}</div>\` : ''}
                </div>
            \`).join('');
            
            const frameworksHtml = (techStack.frameworks || []).map(fw => \`
                <div class="framework-item">
                    <div class="framework-header">
                        <span class="framework-name">\${fw.name}</span>
                        \${fw.version ? \`<span class="framework-version">\${fw.version}</span>\` : ''}
                        <span class="framework-confidence confidence-\${fw.confidence >= 80 ? 'high' : fw.confidence >= 50 ? 'medium' : 'low'}">\${fw.confidence}%</span>
                    </div>
                </div>
            \`).join('');
            
            const dependenciesHtml = (techStack.dependencies || []).map(dep => \`
                <div class="dependency-item \${dep.type}">
                    <span class="dependency-name">\${dep.name}</span>
                    \${dep.version ? \`<span class="dependency-version">\${dep.version}</span>\` : ''}
                    <span class="dependency-type">\${dep.type}</span>
                    <span class="dependency-source">\${dep.source}</span>
                </div>
            \`).join('');
            
            content.innerHTML = \`
                <div class="tech-stack-container">
                    <div class="tech-stack-header">
                        <h2>Technology Stack Analysis</h2>
                        <div class="tech-stack-summary">
                            <div class="summary-item">
                                <span class="summary-label">Python Version:</span>
                                <span class="summary-value">\${techStack.pythonVersion || 'Unknown'}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Package Manager:</span>
                                <span class="summary-value">\${techStack.packageManager || 'Unknown'}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Libraries:</span>
                                <span class="summary-value">\${techStack.libraries?.length || 0}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Frameworks:</span>
                                <span class="summary-value">\${techStack.frameworks?.length || 0}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="tech-stack-sections">
                        <div class="tech-section">
                            <h3>🔧 Frameworks (\${techStack.frameworks?.length || 0})</h3>
                            <div class="frameworks-grid">
                                \${frameworksHtml || '<div class="empty-section">No frameworks detected</div>'}
                            </div>
                        </div>
                        
                        <div class="tech-section">
                            <h3>📚 Libraries (\${techStack.libraries?.length || 0})</h3>
                            <div class="libraries-grid">
                                \${librariesHtml || '<div class="empty-section">No libraries detected</div>'}
                            </div>
                        </div>
                        
                        <div class="tech-section">
                            <h3>📦 Dependencies (\${techStack.dependencies?.length || 0})</h3>
                            <div class="dependencies-list">
                                \${dependenciesHtml || '<div class="empty-section">No dependencies detected</div>'}
                            </div>
                        </div>
                    </div>
                </div>
                
                <style>
                    .tech-stack-container {
                        max-width: 1200px;
                        margin: 0 auto;
                    }
                    
                    .tech-stack-header {
                        margin-bottom: 24px;
                        padding-bottom: 16px;
                        border-bottom: 1px solid var(--vscode-widget-border);
                    }
                    
                    .tech-stack-summary {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 16px;
                        margin-top: 16px;
                    }
                    
                    .summary-item {
                        display: flex;
                        justify-content: space-between;
                        padding: 8px 12px;
                        background-color: var(--vscode-editor-inactiveSelectionBackground);
                        border-radius: 4px;
                    }
                    
                    .summary-label {
                        font-weight: 500;
                        color: var(--vscode-descriptionForeground);
                    }
                    
                    .summary-value {
                        font-weight: 600;
                        color: var(--vscode-foreground);
                    }
                    
                    .tech-section {
                        margin-bottom: 32px;
                    }
                    
                    .tech-section h3 {
                        margin-bottom: 16px;
                        color: var(--vscode-foreground);
                        font-size: 18px;
                    }
                    
                    .frameworks-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                        gap: 12px;
                    }
                    
                    .libraries-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 12px;
                    }
                    
                    @media (max-width: 1200px) {
                        .libraries-grid {
                            grid-template-columns: repeat(2, 1fr);
                        }
                    }
                    
                    @media (max-width: 768px) {
                        .libraries-grid {
                            grid-template-columns: 1fr;
                        }
                    }
                    
                    .framework-item, .library-item {
                        padding: 12px;
                        background-color: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 6px;
                        transition: border-color 0.2s ease;
                    }
                    
                    .framework-item:hover, .library-item:hover {
                        border-color: var(--vscode-focusBorder);
                    }
                    
                    .framework-header, .library-header {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        margin-bottom: 4px;
                    }
                    
                    .framework-name, .library-name {
                        font-weight: 600;
                        color: var(--vscode-foreground);
                    }
                    
                    .framework-version, .library-version {
                        font-size: 12px;
                        padding: 2px 6px;
                        background-color: var(--vscode-badge-background);
                        color: var(--vscode-badge-foreground);
                        border-radius: 3px;
                    }
                    
                    .library-category {
                        font-size: 11px;
                        padding: 2px 6px;
                        background-color: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                        border-radius: 3px;
                        text-transform: uppercase;
                    }
                    
                    .framework-confidence {
                        font-size: 12px;
                        padding: 2px 6px;
                        border-radius: 3px;
                        font-weight: 500;
                    }
                    
                    .confidence-high {
                        background-color: #28a745;
                        color: white;
                    }
                    
                    .confidence-medium {
                        background-color: #ffc107;
                        color: #212529;
                    }
                    
                    .confidence-low {
                        background-color: #dc3545;
                        color: white;
                    }
                    
                    .library-description {
                        font-size: 13px;
                        color: var(--vscode-descriptionForeground);
                        margin-top: 4px;
                    }
                    
                    .dependencies-list {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }
                    
                    .dependency-item {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 8px 12px;
                        background-color: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 4px;
                    }
                    
                    .dependency-item.direct {
                        border-left: 3px solid var(--vscode-charts-blue);
                    }
                    
                    .dependency-item.transitive {
                        border-left: 3px solid var(--vscode-charts-gray);
                    }
                    
                    .dependency-name {
                        font-weight: 500;
                        flex: 1;
                    }
                    
                    .dependency-version {
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                    }
                    
                    .dependency-type {
                        font-size: 11px;
                        padding: 2px 6px;
                        background-color: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                        border-radius: 3px;
                        text-transform: uppercase;
                    }
                    
                    .dependency-source {
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                    }
                    
                    .empty-section {
                        text-align: center;
                        padding: 24px;
                        color: var(--vscode-descriptionForeground);
                        font-style: italic;
                    }
                </style>
            \`;
        }
        
        // Render code graph tab with enhanced module visualization
        function renderCodeGraphTab() {
            if (!analysisData.modules) {
                showEmptyState('codegraph');
                return;
            }
            
            // Initialize enhanced Cytoscape for code graph with folder rectangles and file circles
            initializeCodeGraphCytoscape();
        }
        
        // Render code graph JSON tab
        function renderCodeGraphJsonTab() {
            const jsonDisplay = document.getElementById('codegraph-json-display');
            
            if (!analysisData || !analysisData.modules) {
                jsonDisplay.textContent = 'No code graph data available';
                return;
            }
            
            try {
                // Create module-wise structured data
                const moduleWiseData = {};
                
                if (analysisData.modules && analysisData.modules.nodes) {
                    analysisData.modules.nodes.forEach(module => {
                        const moduleName = module.folderPath || module.name;
                        if (!moduleWiseData[moduleName]) {
                            moduleWiseData[moduleName] = {
                                path: module.path,
                                folderPath: module.folderPath,
                                complexity: module.complexity,
                                fileCount: module.fileCount,
                                dependencies: module.dependencies,
                                metadata: module.metadata,
                                files: []
                            };
                        }
                        moduleWiseData[moduleName].files.push({
                            id: module.id,
                            name: module.name,
                            displayName: module.displayName,
                            path: module.path,
                            complexity: module.complexity,
                            dependencies: module.dependencies,
                            metadata: module.metadata
                        });
                    });
                }
                
                // Create a focused JSON structure for code graph
                const codeGraphData = {
                    moduleWiseStructure: moduleWiseData,
                    modules: analysisData.modules,
                    functions: analysisData.functions,
                    metadata: {
                        totalModules: analysisData.modules.nodes ? analysisData.modules.nodes.length : 0,
                        totalFunctions: analysisData.functions && analysisData.functions.nodes ? analysisData.functions.nodes.length : 0,
                        analysisTimestamp: new Date().toISOString(),
                        structureFormat: 'module-wise-organized'
                    }
                };
                
                const jsonString = JSON.stringify(codeGraphData, null, 2);
                jsonDisplay.textContent = jsonString;
            } catch (error) {
                jsonDisplay.textContent = \`Error displaying code graph JSON: \${error.message}\`;
            }
        }
        
        // Git Analytics Charts instance
        let gitChartsInstance = null;
        
        // Render Git analytics tab
        function renderGitTab() {
            const content = document.getElementById('git-content');
            
            if (!analysisData.gitAnalytics) {
                content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📈</div><div class="empty-state-message">No Git analytics data available</div></div>';
                return;
            }
            
            const gitData = analysisData.gitAnalytics;
            
            // Initialize Git analytics charts
            if (gitChartsInstance) {
                gitChartsInstance.destroyAllCharts();
            }
            gitChartsInstance = new GitAnalyticsCharts();
            
            // Create comprehensive Git analytics visualization
            const authorContributionsHtml = gitData.authorContributions.map(author => \`
                <div class="author-card">
                    <div class="author-header">
                        <div class="author-info">
                            <span class="author-name">\${author.authorName}</span>
                            <span class="author-email">\${author.authorEmail}</span>
                        </div>
                        <div class="author-stats">
                            <span class="contribution-percentage">\${author.contributionPercentage.toFixed(1)}%</span>
                        </div>
                    </div>
                    <div class="author-metrics">
                        <div class="metric">
                            <span class="metric-label">Commits</span>
                            <span class="metric-value">\${author.totalCommits}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Lines Added</span>
                            <span class="metric-value positive">+\${author.linesAdded}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Lines Removed</span>
                            <span class="metric-value negative">-\${author.linesRemoved}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Modules</span>
                            <span class="metric-value">\${author.modulesTouched.length}</span>
                        </div>
                    </div>
                    <div class="author-timeline">
                        <span class="timeline-label">Active:</span>
                        <span class="timeline-range">\${new Date(author.firstCommit).toLocaleDateString()} - \${new Date(author.lastCommit).toLocaleDateString()}</span>
                    </div>
                </div>
            \`).join('');
            
            const moduleStatsHtml = gitData.moduleStatistics.map(module => \`
                <div class="module-stats-card">
                    <div class="module-stats-header">
                        <span class="module-path">\${module.modulePath}</span>
                        <span class="module-commits">\${module.totalCommits} commits</span>
                    </div>
                    <div class="module-stats-metrics">
                        <div class="module-metric">
                            <span class="module-metric-label">Authors</span>
                            <span class="module-metric-value">\${module.uniqueAuthors}</span>
                        </div>
                        <div class="module-metric">
                            <span class="module-metric-label">Lines +/-</span>
                            <span class="module-metric-value">+\${module.linesAdded}/-\${module.linesRemoved}</span>
                        </div>
                    </div>
                </div>
            \`).join('');
            
            content.innerHTML = \`
                <div class="git-analytics-container">
                    <div class="git-analytics-header">
                        <h2>Git Analytics Dashboard</h2>
                        <div class="repository-summary">
                            <div class="repo-info">
                                <h3>\${gitData.repositoryInfo.name}</h3>
                                <div class="repo-stats">
                                    <span class="repo-stat">
                                        <strong>\${gitData.repositoryInfo.totalCommits}</strong> commits
                                    </span>
                                    <span class="repo-stat">
                                        <strong>\${gitData.repositoryInfo.contributors}</strong> contributors
                                    </span>
                                    <span class="repo-stat">
                                        Branch: <strong>\${gitData.repositoryInfo.branch}</strong>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="git-analytics-sections">
                        <div class="analytics-section">
                            <h3>👥 Author Contributions</h3>
                            <div class="authors-grid">
                                \${authorContributionsHtml}
                            </div>
                        </div>
                        
                        <div class="analytics-section">
                            <h3>📊 Interactive Charts</h3>
                            <div class="charts-container">
                                <div class="chart-container">
                                    <div class="chart-header">
                                        <h4 class="chart-title">Author Contributions</h4>
                                        <div class="chart-controls">
                                            <button class="chart-control-btn" onclick="exportGitChart('contributionChart', 'author-contributions.png')">Export</button>
                                        </div>
                                    </div>
                                    <div class="chart-canvas-container">
                                        <canvas id="contributionChart" class="chart-canvas"></canvas>
                                    </div>
                                </div>
                                
                                <div class="chart-container">
                                    <div class="chart-header">
                                        <h4 class="chart-title">Commit Timeline</h4>
                                        <div class="chart-controls">
                                            <button class="chart-control-btn" onclick="exportGitChart('timelineChart', 'commit-timeline.png')">Export</button>
                                        </div>
                                    </div>
                                    <div class="chart-canvas-container">
                                        <canvas id="timelineChart" class="chart-canvas"></canvas>
                                    </div>
                                </div>
                                
                                <div class="chart-container">
                                    <div class="chart-header">
                                        <h4 class="chart-title">Module Activity</h4>
                                        <div class="chart-controls">
                                            <button class="chart-control-btn" onclick="exportGitChart('moduleActivityChart', 'module-activity.png')">Export</button>
                                        </div>
                                    </div>
                                    <div class="chart-canvas-container">
                                        <canvas id="moduleActivityChart" class="chart-canvas"></canvas>
                                    </div>
                                </div>
                                
                                <div class="chart-container">
                                    <div class="chart-header">
                                        <h4 class="chart-title">Lines of Code</h4>
                                        <div class="chart-controls">
                                            <button class="chart-control-btn" onclick="exportGitChart('linesOfCodeChart', 'lines-of-code.png')">Export</button>
                                        </div>
                                    </div>
                                    <div class="chart-canvas-container">
                                        <canvas id="linesOfCodeChart" class="chart-canvas"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="analytics-section">
                            <h3>📁 Module Statistics</h3>
                            <div class="module-stats-grid">
                                \${moduleStatsHtml}
                            </div>
                        </div>
                        
                        <div class="analytics-section">
                            <h3>📤 Export Analytics</h3>
                            <div class="export-section">
                                <div class="export-header">
                                    <h4 class="export-title">Export Git Analytics Data</h4>
                                    <div class="export-buttons">
                                        <button class="export-btn" onclick="exportGitAnalyticsData('json')">Export JSON</button>
                                        <button class="export-btn" onclick="exportGitAnalyticsData('csv')">Export CSV</button>
                                        <button class="export-btn" onclick="exportGitAnalyticsData('html')">Export HTML Report</button>
                                    </div>
                                </div>
                                <p class="export-description">
                                    Export comprehensive Git analytics data including author contributions, commit statistics, and module activity in various formats.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <style>
                    .git-analytics-container {
                        max-width: 1200px;
                        margin: 0 auto;
                    }
                    
                    .git-analytics-header {
                        margin-bottom: 24px;
                        padding-bottom: 16px;
                        border-bottom: 1px solid var(--vscode-widget-border);
                    }
                    
                    .repository-summary {
                        margin-top: 16px;
                    }
                    
                    .repo-info h3 {
                        margin: 0 0 8px 0;
                        color: var(--vscode-foreground);
                    }
                    
                    .repo-stats {
                        display: flex;
                        gap: 24px;
                        flex-wrap: wrap;
                    }
                    
                    .repo-stat {
                        color: var(--vscode-descriptionForeground);
                    }
                    
                    .analytics-section {
                        margin-bottom: 32px;
                    }
                    
                    .analytics-section h3 {
                        margin-bottom: 16px;
                        color: var(--vscode-foreground);
                        font-size: 18px;
                    }
                    
                    .authors-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                        gap: 16px;
                    }
                    
                    .author-card {
                        padding: 16px;
                        background-color: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 8px;
                        transition: border-color 0.2s ease;
                    }
                    
                    .author-card:hover {
                        border-color: var(--vscode-focusBorder);
                    }
                    
                    .author-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 12px;
                    }
                    
                    .author-info {
                        display: flex;
                        flex-direction: column;
                    }
                    
                    .author-name {
                        font-weight: 600;
                        color: var(--vscode-foreground);
                        font-size: 14px;
                    }
                    
                    .author-email {
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                        margin-top: 2px;
                    }
                    
                    .contribution-percentage {
                        font-size: 18px;
                        font-weight: 700;
                        color: var(--vscode-charts-blue);
                    }
                    
                    .author-metrics {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 8px;
                        margin-bottom: 12px;
                    }
                    
                    .metric {
                        display: flex;
                        justify-content: space-between;
                        padding: 4px 0;
                    }
                    
                    .metric-label {
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                    }
                    
                    .metric-value {
                        font-size: 12px;
                        font-weight: 500;
                    }
                    
                    .metric-value.positive {
                        color: var(--vscode-charts-green);
                    }
                    
                    .metric-value.negative {
                        color: var(--vscode-charts-red);
                    }
                    
                    .author-timeline {
                        padding-top: 8px;
                        border-top: 1px solid var(--vscode-widget-border);
                        font-size: 11px;
                        color: var(--vscode-descriptionForeground);
                    }
                    
                    .timeline-label {
                        font-weight: 500;
                    }
                    
                    .charts-container {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                        gap: 24px;
                    }
                    
                    .chart-placeholder {
                        padding: 20px;
                        background-color: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 8px;
                        text-align: center;
                    }
                    
                    .module-stats-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                        gap: 12px;
                    }
                    
                    .module-stats-card {
                        padding: 12px;
                        background-color: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 6px;
                    }
                    
                    .module-stats-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 8px;
                    }
                    
                    .module-path {
                        font-weight: 500;
                        color: var(--vscode-foreground);
                        font-size: 13px;
                    }
                    
                    .module-commits {
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                    }
                    
                    .module-stats-metrics {
                        display: flex;
                        gap: 16px;
                    }
                    
                    .module-metric {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                    
                    .module-metric-label {
                        font-size: 11px;
                        color: var(--vscode-descriptionForeground);
                        margin-bottom: 2px;
                    }
                    
                    .module-metric-value {
                        font-size: 12px;
                        font-weight: 500;
                        color: var(--vscode-foreground);
                    }
                    
                    .timeline-container {
                        background-color: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 8px;
                        padding: 20px;
                    }
                    
                    .timeline-placeholder {
                        text-align: center;
                        color: var(--vscode-descriptionForeground);
                        font-style: italic;
                        padding: 40px;
                    }
                </style>
            \`;
            
            // Initialize charts if Chart.js is available
            setTimeout(() => {
                if (typeof Chart !== 'undefined' && typeof GitAnalyticsCharts !== 'undefined') {
                    initializeGitCharts(gitData);
                } else {
                    console.warn('Chart.js or GitAnalyticsCharts not available');
                }
            }, 100);
        }
        
        // Initialize Git analytics charts
        function initializeGitCharts(gitData) {
            try {
                // Create author contribution chart
                gitChartsInstance.createAuthorContributionChart('contributionChart', gitData);
                
                // Create commit timeline chart
                gitChartsInstance.createCommitTimelineChart('timelineChart', gitData);
                
                // Create module activity chart
                gitChartsInstance.createModuleActivityChart('moduleActivityChart', gitData);
                
                // Create lines of code chart
                gitChartsInstance.createLinesOfCodeChart('linesOfCodeChart', gitData);
                
                console.log('Git analytics charts initialized successfully');
            } catch (error) {
                console.error('Error initializing Git analytics charts:', error);
                
                // Show error message in chart containers
                const chartContainers = ['contributionChart', 'timelineChart', 'moduleActivityChart', 'linesOfCodeChart'];
                chartContainers.forEach(chartId => {
                    const canvas = document.getElementById(chartId);
                    if (canvas) {
                        const container = canvas.parentElement;
                        if (container) {
                            container.innerHTML = '<div class="chart-error">Failed to load chart: ' + error.message + '</div>';
                        }
                    }
                });
            }
        }
        
        // Export Git analytics chart
        function exportGitChart(chartId, filename) {
            try {
                if (gitChartsInstance) {
                    gitChartsInstance.exportChart(chartId, filename);
                } else {
                    console.warn('Git charts instance not available for export');
                }
            } catch (error) {
                console.error('Error exporting chart:', error);
            }
        }
        
        // Export Git analytics data
        function exportGitAnalyticsData(format) {
            try {
                if (!analysisData.gitAnalytics) {
                    console.warn('No Git analytics data available for export');
                    return;
                }
                
                const gitData = analysisData.gitAnalytics;
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                
                switch (format) {
                    case 'json':
                        exportAsJson(gitData, \`git-analytics-\${timestamp}.json\`);
                        break;
                    case 'csv':
                        exportAsCsv(gitData, \`git-analytics-\${timestamp}.csv\`);
                        break;
                    case 'html':
                        exportAsHtml(gitData, \`git-analytics-report-\${timestamp}.html\`);
                        break;
                    default:
                        console.warn('Unknown export format:', format);
                }
            } catch (error) {
                console.error('Error exporting Git analytics data:', error);
            }
        }
        
        // Export as JSON
        function exportAsJson(data, filename) {
            const jsonString = JSON.stringify(data, null, 2);
            downloadFile(jsonString, filename, 'application/json');
        }
        
        // Export as CSV
        function exportAsCsv(data, filename) {
            let csvContent = 'Author,Email,Commits,Lines Added,Lines Removed,Contribution %,First Commit,Last Commit,Modules Touched\\n';
            
            data.authorContributions.forEach(author => {
                csvContent += \`"\${author.authorName}","\${author.authorEmail}",\${author.totalCommits},\${author.linesAdded},\${author.linesRemoved},\${author.contributionPercentage.toFixed(2)},"\${author.firstCommit}","\${author.lastCommit}",\${author.modulesTouched.length}\\n\`;
            });
            
            csvContent += '\\n\\nModule Statistics\\n';
            csvContent += 'Module Path,Total Commits,Unique Authors,Lines Added,Lines Removed\\n';
            
            data.moduleStatistics.forEach(module => {
                csvContent += \`"\${module.modulePath}",\${module.totalCommits},\${module.uniqueAuthors},\${module.linesAdded},\${module.linesRemoved}\\n\`;
            });
            
            downloadFile(csvContent, filename, 'text/csv');
        }
        
        // Export as HTML report
        function exportAsHtml(data, filename) {
            const htmlContent = \`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Git Analytics Report - \${data.repositoryInfo.name}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #007ACC; padding-bottom: 20px; margin-bottom: 30px; }
        .repo-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .section { margin-bottom: 40px; }
        .section h2 { color: #007ACC; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: 600; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; padding: 10px 15px; background: #e9ecef; border-radius: 5px; }
        .positive { color: #28a745; }
        .negative { color: #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Git Analytics Report</h1>
        <p>Generated on \${new Date().toLocaleString()}</p>
    </div>
    
    <div class="repo-info">
        <h2>Repository Information</h2>
        <div class="metric"><strong>Repository:</strong> \${data.repositoryInfo.name}</div>
        <div class="metric"><strong>Branch:</strong> \${data.repositoryInfo.branch}</div>
        <div class="metric"><strong>Total Commits:</strong> \${data.repositoryInfo.totalCommits}</div>
        <div class="metric"><strong>Contributors:</strong> \${data.repositoryInfo.contributors}</div>
    </div>
    
    <div class="section">
        <h2>Author Contributions</h2>
        <table>
            <thead>
                <tr>
                    <th>Author</th>
                    <th>Email</th>
                    <th>Commits</th>
                    <th>Lines Added</th>
                    <th>Lines Removed</th>
                    <th>Contribution %</th>
                    <th>Modules</th>
                </tr>
            </thead>
            <tbody>
                \${data.authorContributions.map(author => \`
                    <tr>
                        <td>\${author.authorName}</td>
                        <td>\${author.authorEmail}</td>
                        <td>\${author.totalCommits}</td>
                        <td class="positive">+\${author.linesAdded}</td>
                        <td class="negative">-\${author.linesRemoved}</td>
                        <td>\${author.contributionPercentage.toFixed(1)}%</td>
                        <td>\${author.modulesTouched.length}</td>
                    </tr>
                \`).join('')}
            </tbody>
        </table>
    </div>
    
    <div class="section">
        <h2>Module Statistics</h2>
        <table>
            <thead>
                <tr>
                    <th>Module Path</th>
                    <th>Total Commits</th>
                    <th>Unique Authors</th>
                    <th>Lines Added</th>
                    <th>Lines Removed</th>
                </tr>
            </thead>
            <tbody>
                \${data.moduleStatistics.map(module => \`
                    <tr>
                        <td>\${module.modulePath}</td>
                        <td>\${module.totalCommits}</td>
                        <td>\${module.uniqueAuthors}</td>
                        <td class="positive">+\${module.linesAdded}</td>
                        <td class="negative">-\${module.linesRemoved}</td>
                    </tr>
                \`).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>\`;
            
            downloadFile(htmlContent, filename, 'text/html');
        }
        
        // Download file helper
        function downloadFile(content, filename, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
        
        // Render DB schema tab
        function renderDbSchemaTab() {
            if (!analysisData.dbSchema) {
                const content = document.querySelector('#dbschema-panel .content-area');
                content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🗄️</div><div class="empty-state-message">No database schema data available</div></div>';
                return;
            }
            
            if (currentSubTab === 'rawsql' || !currentSubTab) {
                renderRawSqlContent();
            } else {
                renderSchemaGraphContent();
            }
        }
        
        // Initialize code graph with folders as rectangles and files as circles
        function initializeCodeGraphCytoscape() {
            try {
                const container = document.getElementById('cy');
                if (!container) {
                    throw new Error('Graph container element not found');
                }
                
                // Destroy existing instance
                if (cy) {
                    try {
                        cy.destroy();
                    } catch (destroyError) {
                        console.warn('Error destroying previous Cytoscape instance:', destroyError);
                    }
                    cy = null;
                }
                
                const elements = createCodeGraphElements();
                const style = getCodeGraphStyle();
                const layout = getCodeGraphLayout();
                
                console.log('Initializing code graph with', elements.length, 'elements');
                
                // Create new instance with code graph styling
                cy = cytoscape({
                    container: container,
                    elements: elements,
                    style: style,
                    layout: layout,
                    wheelSensitivity: 0.2,
                    minZoom: 0.1,
                    maxZoom: 3
                });
                
                // Set up event handlers for code graph
                setupCodeGraphEvents();
                
                console.log('Code graph initialized successfully');
                
            } catch (error) {
                console.error('Error initializing code graph:', error);
                const container = document.getElementById('cy');
                if (container) {
                    container.innerHTML = \`<div class="error">Failed to initialize code graph: \${error.message}</div>\`;
                }
            }
        }

        // Initialize module graph with enhanced styling
        function initializeModuleGraph() {
            try {
                const container = document.getElementById('cy');
                if (!container) {
                    throw new Error('Graph container element not found');
                }
                
                // Destroy existing instance
                if (cy) {
                    try {
                        cy.destroy();
                    } catch (destroyError) {
                        console.warn('Error destroying previous Cytoscape instance:', destroyError);
                    }
                    cy = null;
                }
                
                const elements = createModuleCardElements();
                const style = getModuleCardStyle();
                const layout = getModuleCardLayout();
                
                console.log('Initializing module graph with', elements.length, 'elements');
                
                // Create new instance with module card styling
                cy = cytoscape({
                    container: container,
                    elements: elements,
                    style: style,
                    layout: layout,
                    wheelSensitivity: 0.2,
                    minZoom: 0.1,
                    maxZoom: 3
                });
                
                // Set up event handlers
                setupModuleGraphEvents();
                
                console.log('Module graph initialized successfully');
                
            } catch (error) {
                console.error('Error initializing module graph:', error);
                const container = document.getElementById('cy');
                if (container) {
                    container.innerHTML = \`<div class="error">Failed to initialize module graph: \${error.message}</div>\`;
                }
            }
        }
        
        // Create elements for code graph (folders as rectangles, files as circles)
        function createCodeGraphElements() {
            const elements = [];
            const modules = analysisData.modules;
            
            // Group modules by folder structure
            const folderGroups = {};
            const fileNodes = [];
            
            modules.nodes.forEach(module => {
                const folderPath = module.folderPath || '.';
                
                if (!folderGroups[folderPath]) {
                    folderGroups[folderPath] = {
                        id: 'folder_' + folderPath.replace(/[^a-zA-Z0-9]/g, '_'),
                        name: folderPath === '.' ? 'Root' : folderPath.split('/').pop(),
                        path: folderPath,
                        modules: [],
                        complexity: 0,
                        fileCount: 0
                    };
                }
                
                folderGroups[folderPath].modules.push(module);
                folderGroups[folderPath].complexity += module.complexity.overall;
                folderGroups[folderPath].fileCount += module.fileCount;
                
                // Add individual file nodes (circles)
                fileNodes.push({
                    data: {
                        id: module.id,
                        label: module.name,
                        name: module.name,
                        path: module.path,
                        parent: folderGroups[folderPath].id,
                        complexity: module.complexity.overall,
                        colorCode: module.complexity.colorCode,
                        dependencies: module.dependencies,
                        metadata: module.metadata,
                        type: 'file'
                    }
                });
            });
            
            // Add folder nodes (rectangles with curved corners)
            Object.values(folderGroups).forEach(folder => {
                folder.complexity = folder.complexity / folder.modules.length; // Average complexity
                
                elements.push({
                    data: {
                        id: folder.id,
                        label: folder.name,
                        name: folder.name,
                        path: folder.path,
                        complexity: folder.complexity,
                        fileCount: folder.fileCount,
                        moduleCount: folder.modules.length,
                        colorCode: folder.complexity > 15 ? 'red' : folder.complexity > 8 ? 'orange' : 'green',
                        type: 'folder'
                    }
                });
            });
            
            // Add file nodes
            elements.push(...fileNodes);
            
            // Add dependency edges between files
            modules.edges.forEach(edge => {
                elements.push({
                    data: {
                        id: edge.source + '-' + edge.target,
                        source: edge.source,
                        target: edge.target,
                        type: edge.type,
                        weight: edge.weight
                    }
                });
            });
            
            return elements;
        }
        
        // Get styling for code graph
        function getCodeGraphStyle() {
            return [
                // Folder styling (rectangles with curved corners)
                {
                    selector: 'node[type="folder"]',
                    style: {
                        'shape': 'round-rectangle',
                        'width': 'mapData(moduleCount, 1, 20, 120, 300)',
                        'height': 'mapData(fileCount, 1, 50, 80, 150)',
                        'background-color': 'data(colorCode)',
                        'background-opacity': 0.8,
                        'border-width': 2,
                        'border-color': '#666',
                        'border-opacity': 0.8,
                        'label': 'data(label)',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'font-size': '14px',
                        'font-weight': 'bold',
                        'color': '#fff',
                        'text-outline-width': 2,
                        'text-outline-color': '#000',
                        'text-outline-opacity': 0.7,
                        'corner-radius': '10px'
                    }
                },
                // File styling (circles)
                {
                    selector: 'node[type="file"]',
                    style: {
                        'shape': 'ellipse',
                        'width': 'mapData(complexity, 1, 30, 30, 80)',
                        'height': 'mapData(complexity, 1, 30, 30, 80)',
                        'background-color': 'data(colorCode)',
                        'background-opacity': 0.9,
                        'border-width': 2,
                        'border-color': '#333',
                        'label': 'data(label)',
                        'text-valign': 'bottom',
                        'text-halign': 'center',
                        'font-size': '10px',
                        'color': '#333',
                        'text-margin-y': 5
                    }
                },
                // Edge styling
                {
                    selector: 'edge',
                    style: {
                        'width': 'mapData(weight, 1, 10, 1, 5)',
                        'line-color': '#999',
                        'target-arrow-color': '#999',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'opacity': 0.6
                    }
                },
                // Color mappings
                {
                    selector: 'node[colorCode="green"]',
                    style: {
                        'background-color': '#27ae60'
                    }
                },
                {
                    selector: 'node[colorCode="orange"]',
                    style: {
                        'background-color': '#f39c12'
                    }
                },
                {
                    selector: 'node[colorCode="red"]',
                    style: {
                        'background-color': '#e74c3c'
                    }
                }
            ];
        }
        
        // Get layout for code graph
        function getCodeGraphLayout() {
            return {
                name: 'grid',
                animate: true,
                animationDuration: 1000,
                fit: true,
                padding: 50,
                avoidOverlap: true,
                avoidOverlapPadding: 10,
                nodeDimensionsIncludeLabels: true,
                spacingFactor: 1.5,
                condense: false,
                rows: undefined,
                cols: undefined,
                position: function(node) {
                    // Custom positioning logic for better arrangement
                    return {};
                }
            };
        }
        
        // Set up event handlers for code graph
        function setupCodeGraphEvents() {
            if (!cy) return;
            
            // Handle folder clicks to show dependency modal
            cy.on('tap', 'node[type="folder"]', function(evt) {
                const node = evt.target;
                const folderData = node.data();
                showFolderDependencies(folderData);
            });
            
            // Handle file clicks to show file details
            cy.on('tap', 'node[type="file"]', function(evt) {
                const node = evt.target;
                const fileData = node.data();
                showFileDetails(fileData);
            });
            
            // Handle hover effects
            cy.on('mouseover', 'node', function(evt) {
                const node = evt.target;
                node.style('border-width', '4px');
                
                // Highlight connected edges
                const connectedEdges = node.connectedEdges();
                connectedEdges.style('line-color', '#007acc');
                connectedEdges.style('target-arrow-color', '#007acc');
                connectedEdges.style('opacity', '1');
            });
            
            cy.on('mouseout', 'node', function(evt) {
                const node = evt.target;
                node.style('border-width', '2px');
                
                // Reset connected edges
                const connectedEdges = node.connectedEdges();
                connectedEdges.style('line-color', '#999');
                connectedEdges.style('target-arrow-color', '#999');
                connectedEdges.style('opacity', '0.6');
            });
        }
        
        // Show folder dependencies in modal
        function showFolderDependencies(folderData) {
            const modal = document.getElementById('moduleInfoPanel');
            const title = document.getElementById('moduleInfoTitle');
            const content = document.getElementById('moduleInfoContent');
            
            title.textContent = \`Folder: \${folderData.name}\`;
            
            // Get all files in this folder
            const folderFiles = cy.nodes(\`[parent="\${folderData.id}"]\`);
            const dependencies = new Set();
            
            folderFiles.forEach(fileNode => {
                const fileDeps = fileNode.data('dependencies') || [];
                fileDeps.forEach(dep => dependencies.add(dep));
            });
            
            content.innerHTML = \`
                <div class="info-section">
                    <strong>Path:</strong> \${folderData.path}
                </div>
                <div class="info-section">
                    <strong>Files:</strong> \${folderData.moduleCount}
                </div>
                <div class="info-section">
                    <strong>Average Complexity:</strong> 
                    <span class="complexity-badge \${folderData.colorCode}">\${folderData.complexity.toFixed(1)}</span>
                </div>
                <div class="info-section">
                    <strong>Dependencies:</strong>
                    <ul style="margin: 8px 0; padding-left: 20px;">
                        \${Array.from(dependencies).map(dep => \`<li>\${dep}</li>\`).join('')}
                    </ul>
                </div>
                <div class="info-section">
                    <strong>Files in Folder:</strong>
                    <ul style="margin: 8px 0; padding-left: 20px;">
                        \${folderFiles.map(node => \`<li>\${node.data('name')} (complexity: \${node.data('complexity')})</li>\`).join('')}
                    </ul>
                </div>
            \`;
            
            modal.classList.add('show');
        }
        
        // Show file details
        function showFileDetails(fileData) {
            const modal = document.getElementById('moduleInfoPanel');
            const title = document.getElementById('moduleInfoTitle');
            const content = document.getElementById('moduleInfoContent');
            
            title.textContent = \`File: \${fileData.name}\`;
            
            content.innerHTML = \`
                <div class="info-section">
                    <strong>Path:</strong> \${fileData.path}
                </div>
                <div class="info-section">
                    <strong>Complexity:</strong> 
                    <span class="complexity-badge \${fileData.colorCode}">\${fileData.complexity}</span>
                </div>
                <div class="info-section">
                    <strong>Dependencies:</strong>
                    <ul style="margin: 8px 0; padding-left: 20px;">
                        \${(fileData.dependencies || []).map(dep => \`<li>\${dep}</li>\`).join('')}
                    </ul>
                </div>
                \${fileData.metadata ? \`
                <div class="info-section">
                    <strong>Functions:</strong> \${fileData.metadata.functions ? fileData.metadata.functions.length : 0}
                </div>
                <div class="info-section">
                    <strong>Classes:</strong> \${fileData.metadata.classes ? fileData.metadata.classes.length : 0}
                </div>
                \` : ''}
            \`;
            
            modal.classList.add('show');
        }
        
        // Close module info modal
        function closeModuleInfo() {
            const modal = document.getElementById('moduleInfoPanel');
            modal.classList.remove('show');
        }
        
        // Graph control functions
        function fitToView() {
            if (cy) {
                cy.fit();
            }
        }
        
        function zoomIn() {
            if (cy) {
                cy.zoom(cy.zoom() * 1.2);
                cy.center();
            }
        }
        
        function zoomOut() {
            if (cy) {
                cy.zoom(cy.zoom() * 0.8);
                cy.center();
            }
        }
        
        function resetView() {
            if (cy) {
                cy.reset();
            }
        }
        
        // Search functionality
        function setupSearch() {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.addEventListener('input', function(e) {
                    const searchTerm = e.target.value.toLowerCase();
                    
                    if (!cy || !searchTerm) {
                        // Reset highlighting
                        if (cy) {
                            cy.elements().removeClass('dimmed highlighted');
                        }
                        return;
                    }
                    
                    // Find matching nodes
                    const matchingNodes = cy.nodes().filter(node => {
                        const label = node.data('label') || node.data('name') || '';
                        return label.toLowerCase().includes(searchTerm);
                    });
                    
                    if (matchingNodes.length > 0) {
                        // Dim all elements
                        cy.elements().addClass('dimmed');
                        
                        // Highlight matching nodes and their neighbors
                        matchingNodes.removeClass('dimmed').addClass('highlighted');
                        matchingNodes.neighborhood().removeClass('dimmed').addClass('highlighted');
                    } else {
                        // No matches, reset
                        cy.elements().removeClass('dimmed highlighted');
                    }
                });
            }
        }
        
        // Export code graph JSON
        function exportCodeGraphJson() {
            try {
                if (!analysisData || !analysisData.modules) {
                    vscode.postMessage({
                        command: 'showError',
                        message: 'No code graph data available to export'
                    });
                    return;
                }
                
                // Create module-wise structured data
                const moduleWiseData = {};
                
                if (analysisData.modules && analysisData.modules.nodes) {
                    analysisData.modules.nodes.forEach(module => {
                        const moduleName = module.folderPath || module.name;
                        if (!moduleWiseData[moduleName]) {
                            moduleWiseData[moduleName] = {
                                path: module.path,
                                folderPath: module.folderPath,
                                complexity: module.complexity,
                                fileCount: module.fileCount,
                                dependencies: module.dependencies,
                                metadata: module.metadata,
                                files: []
                            };
                        }
                        moduleWiseData[moduleName].files.push({
                            id: module.id,
                            name: module.name,
                            displayName: module.displayName,
                            path: module.path,
                            complexity: module.complexity,
                            dependencies: module.dependencies,
                            metadata: module.metadata
                        });
                    });
                }
                
                const codeGraphData = {
                    moduleWiseStructure: moduleWiseData,
                    modules: analysisData.modules,
                    functions: analysisData.functions,
                    metadata: {
                        totalModules: analysisData.modules.nodes ? analysisData.modules.nodes.length : 0,
                        totalFunctions: analysisData.functions && analysisData.functions.nodes ? analysisData.functions.nodes.length : 0,
                        exportTimestamp: new Date().toISOString(),
                        exportFormat: 'module-wise-json'
                    }
                };
                
                const jsonString = JSON.stringify(codeGraphData, null, 2);
                
                // Use VS Code API to save file
                vscode.postMessage({
                    command: 'saveFile',
                    data: {
                        content: jsonString,
                        filename: 'code-graph-data.json',
                        type: 'application/json'
                    }
                });
                
            } catch (error) {
                console.error('Error exporting code graph JSON:', error);
                vscode.postMessage({
                    command: 'showError',
                    message: 'Failed to export JSON: ' + error.message
                });
            }
        }
        
        // Copy code graph JSON to clipboard
        function copyCodeGraphJson() {
            try {
                const jsonDisplay = document.getElementById('codegraph-json-display');
                if (!jsonDisplay || !jsonDisplay.textContent) {
                    vscode.postMessage({
                        command: 'showError',
                        message: 'No JSON data available to copy'
                    });
                    return;
                }
                
                // Use VS Code API to copy to clipboard
                vscode.postMessage({
                    command: 'copyToClipboard',
                    data: jsonDisplay.textContent
                });
                
                // Show temporary success message
                const originalText = jsonDisplay.textContent;
                jsonDisplay.textContent = 'JSON copied to clipboard!';
                jsonDisplay.style.color = 'var(--vscode-charts-green)';
                
                setTimeout(() => {
                    jsonDisplay.textContent = originalText;
                    jsonDisplay.style.color = 'var(--vscode-editor-foreground)';
                }, 2000);
                
            } catch (error) {
                console.error('Failed to copy JSON:', error);
                vscode.postMessage({
                    command: 'showError',
                    message: 'Failed to copy JSON to clipboard: ' + error.message
                });
            }
        }

        // Create elements for module cards
        function createModuleCardElements() {
            const elements = [];
            const modules = analysisData.modules;
            
            // Add module card nodes
            modules.nodes.forEach(module => {
                elements.push({
                    data: {
                        id: module.id,
                        label: module.displayName || module.name,
                        name: module.name,
                        path: module.path,
                        folderPath: module.folderPath,
                        complexity: module.complexity.overall,
                        colorCode: module.complexity.colorCode,
                        fileCount: module.fileCount,
                        dependencies: module.dependencies,
                        styling: module.styling,
                        metadata: module.metadata,
                        type: 'module-card'
                    }
                });
            });
            
            // Add dependency edges
            modules.edges.forEach(edge => {
                elements.push({
                    data: {
                        id: edge.source + '-' + edge.target,
                        source: edge.source,
                        target: edge.target,
                        type: edge.type,
                        weight: edge.weight
                    }
                });
            });
            
            return elements;
        }
        
        // Get module card styling
        function getModuleCardStyle() {
            return [
                {
                    selector: 'node[type="module-card"]',
                    style: {
                        'shape': 'round-rectangle',
                        'width': 'mapData(fileCount, 1, 20, 120, 200)',
                        'height': 'mapData(complexity, 1, 100, 80, 140)',
                        'background-color': 'data(colorCode)',
                        'background-gradient-direction': 'to-bottom-right',
                        'background-gradient-stop-colors': function(ele) {
                            const colorCode = ele.data('colorCode');
                            switch(colorCode) {
                                case 'green':
                                    return '#a8edea #fed6e3';
                                case 'orange':
                                    return '#ffecd2 #fcb69f';
                                case 'red':
                                    return '#ffeaa7 #fab1a0';
                                default:
                                    return '#f5f7fa #c3cfe2';
                            }
                        },
                        'border-width': 2,
                        'border-color': function(ele) {
                            const colorCode = ele.data('colorCode');
                            switch(colorCode) {
                                case 'green': return '#27ae60';
                                case 'orange': return '#f39c12';
                                case 'red': return '#e74c3c';
                                default: return '#e1e8ed';
                            }
                        },
                        'border-style': 'solid',
                        'label': 'data(label)',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'text-wrap': 'wrap',
                        'text-max-width': '180px',
                        'font-size': '12px',
                        'font-weight': '600',
                        'color': '#2c3e50',
                        'text-outline-width': 1,
                        'text-outline-color': '#ffffff',
                        'shadow-blur': 6,
                        'shadow-color': 'rgba(0, 0, 0, 0.3)',
                        'shadow-offset-x': 2,
                        'shadow-offset-y': 2,
                        'transition-property': 'border-color, shadow-blur',
                        'transition-duration': '0.3s'
                    }
                },
                {
                    selector: 'node[type="module-card"]:hover',
                    style: {
                        'border-width': 3,
                        'shadow-blur': 12,
                        'shadow-color': 'rgba(0, 0, 0, 0.5)',
                        'z-index': 10
                    }
                },
                {
                    selector: 'node[type="module-card"]:selected',
                    style: {
                        'border-width': 4,
                        'border-color': '#3498db',
                        'shadow-blur': 15,
                        'shadow-color': 'rgba(52, 152, 219, 0.6)',
                        'z-index': 15
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 'mapData(weight, 1, 10, 2, 6)',
                        'line-color': '#95a5a6',
                        'target-arrow-color': '#95a5a6',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'arrow-scale': 1.2,
                        'opacity': 0.7,
                        'transition-property': 'line-color, target-arrow-color, opacity',
                        'transition-duration': '0.3s'
                    }
                },
                {
                    selector: 'edge:hover',
                    style: {
                        'line-color': '#3498db',
                        'target-arrow-color': '#3498db',
                        'opacity': 1,
                        'width': 'mapData(weight, 1, 10, 3, 8)'
                    }
                },
                {
                    selector: 'edge[type="import"]',
                    style: {
                        'line-style': 'solid',
                        'line-color': '#2ecc71',
                        'target-arrow-color': '#2ecc71'
                    }
                },
                {
                    selector: 'edge[type="dependency"]',
                    style: {
                        'line-style': 'dashed',
                        'line-color': '#e67e22',
                        'target-arrow-color': '#e67e22'
                    }
                }
            ];
        }
        
        // Get module card layout
        function getModuleCardLayout() {
            return {
                name: 'dagre',
                directed: true,
                padding: 20,
                spacingFactor: 1.5,
                nodeDimensionsIncludeLabels: true,
                rankDir: 'TB',
                ranker: 'longest-path',
                minLen: function(edge) {
                    return 2;
                },
                edgeWeight: function(edge) {
                    return edge.data('weight') || 1;
                }
            };
        }
        
        // Set up module graph event handlers
        function setupModuleGraphEvents() {
            // Node click handler
            cy.on('tap', 'node', function(evt) {
                const node = evt.target;
                showModuleCardInfo(node);
            });
            
            // Background click handler
            cy.on('tap', function(evt) {
                if (evt.target === cy) {
                    hideModuleCardInfo();
                }
            });
            
            // Node hover handlers
            cy.on('mouseover', 'node', function(evt) {
                const node = evt.target;
                highlightConnectedElements(node);
            });
            
            cy.on('mouseout', 'node', function(evt) {
                clearHighlights();
            });
        }
        
        // Show module card information
        function showModuleCardInfo(node) {
            const data = node.data();
            
            // Create info panel if it doesn't exist
            let infoPanel = document.getElementById('module-info-panel');
            if (!infoPanel) {
                infoPanel = document.createElement('div');
                infoPanel.id = 'module-info-panel';
                infoPanel.className = 'module-info-panel';
                document.getElementById('graph-content').appendChild(infoPanel);
            }
            
            infoPanel.innerHTML = \`
                <div class="module-info-header">
                    <h3>\${data.label}</h3>
                    <button class="close-btn" onclick="hideModuleCardInfo()">&times;</button>
                </div>
                <div class="module-info-content">
                    <div class="info-section">
                        <strong>Path:</strong> \${data.path}
                    </div>
                    <div class="info-section">
                        <strong>Folder:</strong> \${data.folderPath}
                    </div>
                    <div class="info-section">
                        <strong>Complexity:</strong> 
                        <span class="complexity-badge \${data.colorCode}">\${data.complexity.toFixed(2)}</span>
                    </div>
                    <div class="info-section">
                        <strong>Files:</strong> \${data.fileCount}
                    </div>
                    <div class="info-section">
                        <strong>Dependencies:</strong> \${data.dependencies.length}
                    </div>
                    \${data.metadata && data.metadata.functions ? \`
                        <div class="info-section">
                            <strong>Functions:</strong> \${data.metadata.functions.length}
                        </div>
                    \` : ''}
                    \${data.metadata && data.metadata.classes ? \`
                        <div class="info-section">
                            <strong>Classes:</strong> \${data.metadata.classes.length}
                        </div>
                    \` : ''}
                </div>
            \`;
            
            infoPanel.style.display = 'block';
        }
        
        // Hide module card information
        function hideModuleCardInfo() {
            const infoPanel = document.getElementById('module-info-panel');
            if (infoPanel) {
                infoPanel.style.display = 'none';
            }
        }
        
        // Highlight connected elements
        function highlightConnectedElements(node) {
            const connectedEdges = node.connectedEdges();
            const connectedNodes = connectedEdges.connectedNodes();
            
            // Dim all elements
            cy.elements().addClass('dimmed');
            
            // Highlight selected node and connected elements
            node.removeClass('dimmed').addClass('highlighted');
            connectedEdges.removeClass('dimmed').addClass('highlighted');
            connectedNodes.removeClass('dimmed').addClass('highlighted');
        }
        
        // Clear all highlights
        function clearHighlights() {
            cy.elements().removeClass('dimmed highlighted');
        }
        
        // Render raw SQL content
        function renderRawSqlContent() {
            const content = document.getElementById('dbschema-rawsql-content');
            const dbSchema = analysisData.dbSchema;
            
            if (!dbSchema.rawSQL || dbSchema.rawSQL.length === 0) {
                content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📄</div><div class="empty-state-message">No SQL statements found</div></div>';
                return;
            }
            
            // Group SQL statements by type
            const sqlByType = {};
            dbSchema.rawSQL.forEach(stmt => {
                if (!sqlByType[stmt.statementType]) {
                    sqlByType[stmt.statementType] = [];
                }
                sqlByType[stmt.statementType].push(stmt);
            });
            
            const sqlSectionsHtml = Object.entries(sqlByType).map(([type, statements]) => \`
                <div class="sql-section">
                    <h3 class="sql-type-header">
                        <span class="sql-type-icon">\${getSqlTypeIcon(type)}</span>
                        \${type} Statements (\${statements.length})
                    </h3>
                    <div class="sql-statements">
                        \${statements.map(stmt => \`
                            <div class="sql-statement">
                                <div class="sql-statement-header">
                                    <span class="sql-file-path">\${stmt.filePath}</span>
                                    <span class="sql-line-number">Line \${stmt.lineNumber}</span>
                                </div>
                                <pre class="sql-content"><code>\${escapeHtml(stmt.content)}</code></pre>
                                \${stmt.tableReferences.length > 0 ? \`
                                    <div class="sql-references">
                                        <strong>Tables:</strong> \${stmt.tableReferences.join(', ')}
                                    </div>
                                \` : ''}
                            </div>
                        \`).join('')}
                    </div>
                </div>
            \`).join('');
            
            content.innerHTML = \`
                <div class="raw-sql-container">
                    <div class="raw-sql-header">
                        <h2>Database SQL Statements</h2>
                        <div class="sql-summary">
                            <div class="summary-stat">
                                <span class="stat-value">\${dbSchema.rawSQL.length}</span>
                                <span class="stat-label">Total Statements</span>
                            </div>
                            <div class="summary-stat">
                                <span class="stat-value">\${Object.keys(sqlByType).length}</span>
                                <span class="stat-label">Statement Types</span>
                            </div>
                            <div class="summary-stat">
                                <span class="stat-value">\${dbSchema.tables.length}</span>
                                <span class="stat-label">Tables</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="sql-sections">
                        \${sqlSectionsHtml}
                    </div>
                </div>
            \`;
        }
        
        // Database schema graph instance
        let schemaGraphInstance = null;
        
        // Render schema graph content
        function renderSchemaGraphContent() {
            const content = document.getElementById('dbschema-graph-content');
            const dbSchema = analysisData.dbSchema;
            
            if (!dbSchema || !dbSchema.tables || dbSchema.tables.length === 0) {
                content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🗄️</div><div class="empty-state-message">No database tables found</div></div>';
                return;
            }
            
            // Create schema graph container with controls
            content.innerHTML = \`
                <div class="schema-graph-container">
                    <div class="schema-graph-controls">
                        <button class="schema-control-btn active" onclick="changeSchemaLayout('dagre')">Hierarchical</button>
                        <button class="schema-control-btn" onclick="changeSchemaLayout('circle')">Circle</button>
                        <button class="schema-control-btn" onclick="changeSchemaLayout('grid')">Grid</button>
                        <button class="schema-control-btn" onclick="changeSchemaLayout('cose')">Force</button>
                        <button class="schema-control-btn" onclick="resetSchemaView()">Reset</button>
                        <button class="schema-control-btn" onclick="fitSchemaToContainer()">Fit</button>
                        <button class="schema-control-btn" onclick="exportSchemaGraph()">Export</button>
                    </div>
                    
                    <div class="schema-legend">
                        <div class="schema-legend-title">Legend</div>
                        <div class="schema-legend-item">
                            <div class="schema-legend-color table"></div>
                            <span>Table</span>
                        </div>
                        <div class="schema-legend-item">
                            <div class="schema-legend-color primary-key"></div>
                            <span>Primary Key</span>
                        </div>
                        <div class="schema-legend-item">
                            <div class="schema-legend-color foreign-key"></div>
                            <span>Foreign Key</span>
                        </div>
                        <div class="schema-legend-item">
                            <div class="schema-legend-color relationship"></div>
                            <span>Relationship</span>
                        </div>
                    </div>
                    
                    <div id="schema-cy" class="schema-cytoscape"></div>
                </div>
                
                <!-- Table info panel -->
                <div class="table-info-panel" id="table-info-panel">
                    <div class="table-info-header">
                        <h3 id="table-info-title">Table Details</h3>
                        <button class="close-btn" onclick="hideSchemaTableInfo()">×</button>
                    </div>
                    <div class="table-info-content" id="table-info-content"></div>
                </div>
            \`;
            
            // Initialize enhanced schema graph
            setTimeout(() => {
                initializeEnhancedSchemaGraph(dbSchema);
            }, 100);
        }
        
        // Update specific tab content
        function updateTabContent(tabId, data) {
            // Implementation for updating specific tab content
            console.log(\`Updating content for tab: \${tabId}\`, data);
        }
        
        // Show empty state for a tab
        function showEmptyState(tabId) {
            const panel = document.getElementById(tabId + '-panel');
            if (panel) {
                const content = panel.querySelector('.content-area');
                if (content) {
                    content.innerHTML = \`
                        <div class="empty-state">
                            <div class="empty-state-icon">📊</div>
                            <div class="empty-state-message">No data available for \${tabId}</div>
                            <div class="empty-state-description">Run analysis to populate this tab</div>
                        </div>
                    \`;
                }
            }
        }
        
        // Show error message
        function showError(message) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.textContent = message;
            
            const activePanel = document.querySelector('.tab-panel.active .content-area');
            if (activePanel) {
                activePanel.innerHTML = '';
                activePanel.appendChild(errorDiv);
            }
        }
        
        // Generate nonce for security
        function getNonce() {
            let text = '';
            const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            for (let i = 0; i < 32; i++) {
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            }
            return text;
        }
        
        // Initialize enhanced database schema graph
        function initializeEnhancedSchemaGraph(dbSchema) {
            try {
                if (typeof DatabaseSchemaGraph === 'undefined') {
                    throw new Error('DatabaseSchemaGraph class not available');
                }
                
                // Destroy existing instance
                if (schemaGraphInstance) {
                    schemaGraphInstance.destroy();
                }
                
                // Create new instance
                schemaGraphInstance = new DatabaseSchemaGraph();
                schemaGraphInstance.initializeGraph('schema-cy', dbSchema);
                
                console.log('Enhanced schema graph initialized successfully');
                
            } catch (error) {
                console.error('Error initializing enhanced schema graph:', error);
                const container = document.getElementById('schema-cy');
                if (container) {
                    container.innerHTML = \`<div class="chart-error">Failed to initialize schema graph: \${error.message}</div>\`;
                }
            }
        }
        
        // Schema graph control functions
        function changeSchemaLayout(layoutName) {
            try {
                if (schemaGraphInstance) {
                    schemaGraphInstance.changeLayout(layoutName);
                    
                    // Update active button
                    document.querySelectorAll('.schema-control-btn').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    event.target.classList.add('active');
                }
            } catch (error) {
                console.error('Error changing schema layout:', error);
            }
        }
        
        function resetSchemaView() {
            try {
                if (schemaGraphInstance) {
                    schemaGraphInstance.resetView();
                }
            } catch (error) {
                console.error('Error resetting schema view:', error);
            }
        }
        
        function fitSchemaToContainer() {
            try {
                if (schemaGraphInstance) {
                    schemaGraphInstance.fitToContainer();
                }
            } catch (error) {
                console.error('Error fitting schema to container:', error);
            }
        }
        
        function exportSchemaGraph() {
            try {
                if (schemaGraphInstance) {
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    schemaGraphInstance.exportAsImage(\`database-schema-\${timestamp}.png\`);
                }
            } catch (error) {
                console.error('Error exporting schema graph:', error);
            }
        }
        
        function hideSchemaTableInfo() {
            try {
                if (schemaGraphInstance) {
                    schemaGraphInstance.hideTableInfo();
                }
            } catch (error) {
                console.error('Error hiding table info:', error);
            }
        }
        
        // Old schema graph functions removed - now using DatabaseSchemaGraph class
        
        // Old schema graph functions removed - functionality moved to DatabaseSchemaGraph class
        
        // Get SQL type icon
        function getSqlTypeIcon(type) {
            const icons = {
                'CREATE': '🏗️',
                'ALTER': '🔧',
                'DROP': '🗑️',
                'INSERT': '➕',
                'UPDATE': '✏️',
                'DELETE': '❌',
                'SELECT': '🔍',
                'INDEX': '📇',
                'CONSTRAINT': '🔒'
            };
            return icons[type.toUpperCase()] || '📄';
        }
        
        // Escape HTML for safe display
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initialize);
        } else {
            initialize();
        }
    </script>
</body>
</html>`;
    }

    /**
     * Handle messages from the webview
     */
    private handleWebviewMessage(message: TabbedWebviewMessage): void {
        switch (message.command) {
            case 'ready':
                this.log('Tabbed webview is ready');
                break;
                
            case 'tabChanged':
                this.currentTab = message.tabId || this.currentTab;
                this.currentSubTab = message.subTabId || null;
                this.log(`Tab changed to: ${this.currentTab}${this.currentSubTab ? ` (${this.currentSubTab})` : ''}`);
                break;
                
            case 'error':
                this.logError('Tabbed webview error', new Error(message.data?.message || 'Unknown error'));
                break;
                
            case 'saveFile':
                this.handleSaveFile(message.data);
                break;
                
            case 'copyToClipboard':
                this.handleCopyToClipboard(message.data);
                break;
                
            case 'showError':
                vscode.window.showErrorMessage(message.data?.message || 'An error occurred');
                break;
                
            default:
                this.log(`Unknown tabbed webview message: ${message.command}`);
        }
    }

    /**
     * Send message to webview
     */
    private sendMessageToWebview(message: TabbedWebviewMessage): void {
        if (this.panel) {
            this.panel.webview.postMessage(message);
        }
    }

    /**
     * Convert current file analysis data to tabbed format
     */
    private convertCurrentFileAnalysisToTabbedData(analysisData: any): TabbedAnalysisData {
        // Create nodes and edges for current file visualization
        const nodes: any[] = [];
        const edges: any[] = [];
        
        // Add file as a node
        if (analysisData.file_name) {
            nodes.push({
                id: analysisData.file_name,
                name: analysisData.file_name,
                displayName: analysisData.file_name,
                path: analysisData.file_path,
                folderPath: '',
                complexity: {
                    overall: analysisData.complexity_metrics?.overall_complexity?.cyclomatic || 0,
                    cyclomatic: analysisData.complexity_metrics?.overall_complexity?.cyclomatic || 0,
                    maintainability: analysisData.complexity_metrics?.maintainability_index || 0,
                    colorCode: this.getComplexityColorCode(analysisData.complexity_metrics?.overall_complexity?.cyclomatic || 0)
                },
                fileCount: 1,
                dependencies: analysisData.dependency_info?.external_dependencies || [],
                styling: {
                    backgroundColor: '#007acc',
                    borderColor: '#005a9e',
                    borderWidth: 2,
                    borderRadius: 8,
                    shadowStyle: '0 2px 4px rgba(0,0,0,0.1)',
                    textColor: '#ffffff',
                    fontSize: '12px',
                    padding: '8px',
                    minWidth: 120,
                    minHeight: 60
                },
                metadata: {
                    lastModified: analysisData.analysis_timestamp || new Date().toISOString(),
                    size: analysisData.complexity_metrics?.total_lines || 0,
                    functions: analysisData.complexity_metrics?.function_complexities?.map((f: any) => f.name) || [],
                    classes: analysisData.complexity_metrics?.class_complexities?.map((c: any) => c.name) || []
                }
            });
        }
        
        // Add functions as nodes
        if (analysisData.complexity_metrics?.function_complexities) {
            analysisData.complexity_metrics.function_complexities.forEach((func: any) => {
                const nodeId = `${analysisData.file_name}::${func.name}`;
                nodes.push({
                    id: nodeId,
                    name: func.name,
                    displayName: func.name,
                    path: analysisData.file_path,
                    folderPath: '',
                    complexity: {
                        overall: func.complexity?.cyclomatic || 0,
                        cyclomatic: func.complexity?.cyclomatic || 0,
                        maintainability: 100 - (func.complexity?.cyclomatic || 0) * 5,
                        colorCode: this.getComplexityColorCode(func.complexity?.cyclomatic || 0)
                    },
                    fileCount: 0,
                    dependencies: [],
                    styling: {
                        backgroundColor: this.getComplexityColor(func.complexity?.cyclomatic || 0),
                        borderColor: this.getComplexityBorderColor(func.complexity?.cyclomatic || 0),
                        borderWidth: 1,
                        borderRadius: 20,
                        shadowStyle: '0 1px 2px rgba(0,0,0,0.1)',
                        textColor: '#ffffff',
                        fontSize: '10px',
                        padding: '6px',
                        minWidth: 80,
                        minHeight: 40
                    },
                    metadata: {
                        lastModified: analysisData.analysis_timestamp || new Date().toISOString(),
                        size: 0,
                        functions: [],
                        classes: []
                    }
                });
                
                // Add edge from file to function
                edges.push({
                    source: analysisData.file_name,
                    target: nodeId,
                    type: 'contains',
                    weight: 1
                });
            });
        }
        
        // Add classes as nodes
        if (analysisData.complexity_metrics?.class_complexities) {
            analysisData.complexity_metrics.class_complexities.forEach((cls: any) => {
                const classId = `${analysisData.file_name}::${cls.name}`;
                nodes.push({
                    id: classId,
                    name: cls.name,
                    displayName: cls.name,
                    path: analysisData.file_path,
                    folderPath: '',
                    complexity: {
                        overall: 0,
                        cyclomatic: 0,
                        maintainability: 100,
                        colorCode: 'green' as const
                    },
                    fileCount: 0,
                    dependencies: [],
                    styling: {
                        backgroundColor: '#6f42c1',
                        borderColor: '#5a2d91',
                        borderWidth: 1,
                        borderRadius: 6,
                        shadowStyle: '0 1px 2px rgba(0,0,0,0.1)',
                        textColor: '#ffffff',
                        fontSize: '11px',
                        padding: '8px',
                        minWidth: 100,
                        minHeight: 50
                    },
                    metadata: {
                        lastModified: analysisData.analysis_timestamp || new Date().toISOString(),
                        size: 0,
                        functions: cls.methods?.map((m: any) => m.name) || [],
                        classes: []
                    }
                });
                
                // Add edge from file to class
                edges.push({
                    source: analysisData.file_name,
                    target: classId,
                    type: 'contains',
                    weight: 1
                });
                
                // Add methods as nodes
                if (cls.methods) {
                    cls.methods.forEach((method: any) => {
                        const methodId = `${analysisData.file_name}::${cls.name}::${method.name}`;
                        nodes.push({
                            id: methodId,
                            name: method.name,
                            displayName: method.name,
                            path: analysisData.file_path,
                            folderPath: '',
                            complexity: {
                                overall: method.complexity?.cyclomatic || 0,
                                cyclomatic: method.complexity?.cyclomatic || 0,
                                maintainability: 100 - (method.complexity?.cyclomatic || 0) * 5,
                                colorCode: this.getComplexityColorCode(method.complexity?.cyclomatic || 0)
                            },
                            fileCount: 0,
                            dependencies: [],
                            styling: {
                                backgroundColor: this.getComplexityColor(method.complexity?.cyclomatic || 0),
                                borderColor: this.getComplexityBorderColor(method.complexity?.cyclomatic || 0),
                                borderWidth: 1,
                                borderRadius: 15,
                                shadowStyle: '0 1px 2px rgba(0,0,0,0.1)',
                                textColor: '#ffffff',
                                fontSize: '9px',
                                padding: '4px',
                                minWidth: 70,
                                minHeight: 30
                            },
                            metadata: {
                                lastModified: analysisData.analysis_timestamp || new Date().toISOString(),
                                size: 0,
                                functions: [],
                                classes: []
                            }
                        });
                        
                        // Add edge from class to method
                        edges.push({
                            source: classId,
                            target: methodId,
                            type: 'contains',
                            weight: 1
                        });
                    });
                }
            });
        }
        
        return {
            modules: {
                nodes: nodes,
                edges: edges,
                folderStructure: {
                    rootPath: analysisData.file_path || '',
                    folders: [],
                    moduleGroupings: []
                }
            },
            functions: {
                nodes: nodes.filter(n => n.name !== analysisData.file_name),
                edges: edges
            },
            currentFile: {
                filePath: analysisData.file_path || '',
                fileName: analysisData.file_name || '',
                complexity: {
                    overall: analysisData.complexity_metrics?.overall_complexity?.cyclomatic || 0,
                    cyclomatic: analysisData.complexity_metrics?.overall_complexity?.cyclomatic || 0,
                    maintainability: analysisData.complexity_metrics?.maintainability_index || 0,
                    colorCode: this.getComplexityColorCode(analysisData.complexity_metrics?.overall_complexity?.cyclomatic || 0)
                },
                dependencies: analysisData.dependency_info?.external_dependencies || [],
                functions: nodes.filter(n => n.name !== analysisData.file_name && !n.name.includes('::')),
                classes: analysisData.complexity_metrics?.class_complexities?.map((cls: any) => ({
                    name: cls.name,
                    lineNumber: cls.line_number,
                    methods: cls.methods?.map((m: any) => m.name) || [],
                    complexity: 0
                })) || [],
                imports: analysisData.dependency_info?.imports?.map((imp: any) => ({
                    module: imp.module,
                    items: imp.names || [],
                    isFromImport: imp.is_from_import,
                    lineNumber: imp.line_number
                })) || [],
                frameworkPatterns: analysisData.framework_patterns || {}
            },
            exportMetadata: {
                analysisTimestamp: analysisData.analysis_timestamp || new Date().toISOString(),
                doraCodeBirdVersion: '0.1.0',
                projectPath: analysisData.file_path || '',
                totalFiles: 1,
                totalLines: analysisData.complexity_metrics?.total_lines || 0
            }
        };
    }

    /**
     * Get complexity color based on score
     */
    private getComplexityColor(complexity: number): string {
        if (complexity <= 5) return '#28a745'; // Green
        if (complexity <= 10) return '#ffc107'; // Orange
        return '#dc3545'; // Red
    }

    /**
     * Get complexity border color based on score
     */
    private getComplexityBorderColor(complexity: number): string {
        if (complexity <= 5) return '#1e7e34'; // Dark green
        if (complexity <= 10) return '#e0a800'; // Dark orange
        return '#c82333'; // Dark red
    }

    /**
     * Get complexity color code based on score
     */
    private getComplexityColorCode(complexity: number): 'green' | 'orange' | 'red' {
        if (complexity <= 5) return 'green';
        if (complexity <= 10) return 'orange';
        return 'red';
    }

    /**
     * Generate a random nonce for security
     */
    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    /**
     * Handle save file request from webview
     */
    private async handleSaveFile(data: any): Promise<void> {
        try {
            const { content, filename, type } = data;
            
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(filename),
                filters: {
                    'JSON Files': ['json'],
                    'All Files': ['*']
                }
            });
            
            if (saveUri) {
                await vscode.workspace.fs.writeFile(saveUri, Buffer.from(content, 'utf8'));
                vscode.window.showInformationMessage(`File saved: ${saveUri.fsPath}`);
            }
        } catch (error) {
            this.logError('Failed to save file', error instanceof Error ? error : new Error(String(error)));
            vscode.window.showErrorMessage('Failed to save file');
        }
    }

    /**
     * Handle copy to clipboard request from webview
     */
    private async handleCopyToClipboard(data: string): Promise<void> {
        try {
            await vscode.env.clipboard.writeText(data);
            vscode.window.showInformationMessage('Copied to clipboard');
        } catch (error) {
            this.logError('Failed to copy to clipboard', error instanceof Error ? error : new Error(String(error)));
            vscode.window.showErrorMessage('Failed to copy to clipboard');
        }
    }

    /**
     * Log message to output channel
     */
    private log(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] TabbedWebviewProvider: ${message}`);
        
        if (this.debugMode) {
            console.log(`TabbedWebviewProvider: ${message}`);
        }
    }

    /**
     * Log error to output channel
     */
    private logError(message: string, error: Error): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] TabbedWebviewProvider ERROR: ${message}`);
        this.outputChannel.appendLine(`[${timestamp}] Error details: ${error.message}`);
        
        if (error.stack) {
            this.outputChannel.appendLine(`[${timestamp}] Stack trace: ${error.stack}`);
        }
        
        if (this.debugMode) {
            console.error(`TabbedWebviewProvider: ${message}`, error);
        }
    }
}