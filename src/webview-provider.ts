import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Interface for analysis data that will be displayed in the webview
 */
export interface WebviewAnalysisData {
    modules?: ModuleGraphData;
    functions?: CallGraphData;
    techStack?: TechStackData;
    frameworkPatterns?: FrameworkPatternsData;
    gitAnalytics?: GitAnalyticsData;
}

/**
 * Git analytics data structure
 */
export interface GitAnalyticsData {
    repositoryInfo: any;
    authorContributions: any[];
    moduleStatistics: any;
    commitTimeline: any;
    contributionGraphs: any[];
    analysisType: string;
}

/**
 * Module graph data structure
 */
export interface ModuleGraphData {
    nodes: ModuleNode[];
    edges: ModuleEdge[];
}

export interface ModuleNode {
    id: string;
    name: string;
    path: string;
    complexity: number;
    size: number;
    functions: string[];
}

export interface ModuleEdge {
    source: string;
    target: string;
    type: 'import' | 'dependency';
    weight: number;
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
 * Tech stack data structure
 */
export interface TechStackData {
    libraries: Library[];
    pythonVersion: string;
    frameworks: string[];
    packageManager: 'pip' | 'poetry' | 'pipenv';
}

export interface Library {
    name: string;
    version?: string;
    category?: string;
}

/**
 * Framework patterns data structure
 */
export interface FrameworkPatternsData {
    django?: DjangoPatterns;
    flask?: FlaskPatterns;
    fastapi?: FastAPIPatterns;
}

export interface DjangoPatterns {
    urlPatterns: URLPattern[];
    views: ViewMapping[];
    models: ModelMapping[];
    serializers: SerializerMapping[];
}

export interface URLPattern {
    pattern: string;
    viewName: string;
    viewFunction: string;
    namespace?: string;
}

export interface ViewMapping {
    name: string;
    file: string;
    lineNumber: number;
}

export interface ModelMapping {
    name: string;
    file: string;
    lineNumber: number;
}

export interface SerializerMapping {
    name: string;
    file: string;
    lineNumber: number;
}

export interface FlaskPatterns {
    routes: FlaskRoute[];
    blueprints: Blueprint[];
}

export interface FlaskRoute {
    pattern: string;
    methods: string[];
    function: string;
    file: string;
    lineNumber: number;
}

export interface Blueprint {
    name: string;
    file: string;
    routes: FlaskRoute[];
}

export interface FastAPIPatterns {
    routes: FastAPIRoute[];
    dependencies: DependencyMapping[];
}

export interface FastAPIRoute {
    pattern: string;
    method: string;
    function: string;
    file: string;
    lineNumber: number;
}

export interface DependencyMapping {
    name: string;
    file: string;
    lineNumber: number;
}

/**
 * Webview message types for communication between extension and webview
 */
export interface WebviewMessage {
    command: string;
    data?: any;
}

/**
 * WebviewProvider manages the graph visualization webview panel
 */
export class WebviewProvider {
    private panel: vscode.WebviewPanel | undefined;
    private context: vscode.ExtensionContext;
    private outputChannel: vscode.OutputChannel;
    private analysisData: WebviewAnalysisData | null = null;
    private currentView: 'module-graph' | 'call-hierarchy' | 'current-file' | 'json-view' | 'git-analytics' = 'module-graph';
    private selectedFunction: string | null = null;
    private debugMode: boolean = false;

    constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
        this.context = context;
        this.outputChannel = outputChannel;
        
        // Enable debug mode based on configuration or development environment
        const config = vscode.workspace.getConfiguration('doracodebird');
        this.debugMode = config.get('enableDebugMode', false) || 
                        context.extensionMode === vscode.ExtensionMode.Development;
        
        if (this.debugMode) {
            this.log('Debug mode enabled for WebviewProvider');
        }
    }

    /**
     * Show the module graph visualization
     */
    public showModuleGraph(analysisData: WebviewAnalysisData): void {
        this.analysisData = analysisData;
        this.currentView = 'module-graph';
        this.selectedFunction = null;
        
        this.createOrShowWebview();
        this.updateWebviewContent();
        
        this.log('Module graph webview displayed');
    }

    /**
     * Show the call hierarchy visualization for a specific function
     */
    public showCallHierarchy(analysisData: WebviewAnalysisData, functionName: string): void {
        this.analysisData = analysisData;
        this.currentView = 'call-hierarchy';
        this.selectedFunction = functionName;
        
        this.createOrShowWebview();
        this.updateWebviewContent();
        
        this.log(`Call hierarchy webview displayed for function: ${functionName}`);
    }

    /**
     * Show the tech stack visualization
     */
    public showTechStack(analysisData: WebviewAnalysisData): void {
        this.analysisData = analysisData;
        this.currentView = 'module-graph'; // For now, use module-graph view
        this.selectedFunction = null;
        
        this.createOrShowWebview();
        this.updateWebviewContent();
        
        this.log('Tech stack webview displayed');
    }

    /**
     * Show current file analysis visualization
     */
    public showCurrentFileAnalysis(analysisData: any, view: 'graph' | 'json' = 'graph'): void {
        // Convert current file analysis data to webview format
        const webviewData = this.convertCurrentFileAnalysisData(analysisData);
        
        this.analysisData = webviewData;
        this.currentView = view === 'json' ? 'json-view' : 'current-file';
        this.selectedFunction = null;
        
        this.createOrShowWebview();
        this.updateWebviewContent();
        
        this.log(`Current file analysis webview displayed in ${view} view`);
    }

    /**
     * Show Git analytics visualization
     */
    public showGitAnalytics(analysisData: any, analysisType: string): void {
        // Convert Git analytics data to webview format
        const webviewData = this.convertGitAnalyticsData(analysisData, analysisType);
        
        this.analysisData = webviewData;
        this.currentView = 'git-analytics';
        this.selectedFunction = null;
        
        this.createOrShowWebview();
        this.updateWebviewContent();
        
        this.log(`Git analytics webview displayed for ${analysisType}`);
    }

    /**
     * Update the webview with new analysis data
     */
    public updateAnalysisData(analysisData: WebviewAnalysisData | null): void {
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
                'doracodebirdGraph',
                'DoraCodeBirdView - Graph Visualization',
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
                this.log('Webview panel disposed');
            }, null, this.context.subscriptions);

            // Handle webview state changes
            this.panel.onDidChangeViewState(e => {
                if (e.webviewPanel.visible) {
                    this.log('Webview became visible, updating content');
                    this.updateWebviewContent();
                } else {
                    this.log('Webview became hidden');
                }
            }, null, this.context.subscriptions);

            // Handle messages from webview with error handling
            this.panel.webview.onDidReceiveMessage(
                (message: WebviewMessage) => {
                    try {
                        this.handleWebviewMessage(message);
                    } catch (error) {
                        this.logError('Error handling webview message', error);
                    }
                },
                undefined,
                this.context.subscriptions
            );

            this.log('Webview panel created successfully');
            
        } catch (error) {
            this.logError('Failed to create webview panel', error);
            throw error;
        }
    }

    /**
     * Update the webview content based on current view and data
     */
    private updateWebviewContent(): void {
        if (!this.panel) {
            return;
        }

        try {
            this.log(`Updating webview content for ${this.currentView}`);
            
            const html = this.getWebviewHtml();
            this.panel.webview.html = html;

            // Send analysis data to webview after a short delay to ensure DOM is ready
            setTimeout(() => {
                try {
                    this.sendMessageToWebview({
                        command: 'updateData',
                        data: {
                            analysisData: this.analysisData,
                            currentView: this.currentView,
                            selectedFunction: this.selectedFunction,
                            debugMode: this.debugMode
                        }
                    });
                    
                    this.log(`Webview content updated for ${this.currentView}`);
                    
                } catch (error) {
                    this.logError('Failed to send data to webview', error);
                }
            }, 100);

        } catch (error) {
            this.logError('Failed to update webview content', error);
        }
    }

    /**
     * Generate HTML content for the webview
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
    <title>DoraCodeBirdView - Graph Visualization</title>
</head>
<body>
    <div id="toolbar">
        <div class="toolbar-group">
            <button id="moduleGraphBtn" class="toolbar-btn active" title="Show Module Graph">
                <span class="icon">📊</span>
                Module Graph
            </button>
            <button id="callHierarchyBtn" class="toolbar-btn" title="Show Call Hierarchy">
                <span class="icon">🌳</span>
                Call Hierarchy
            </button>
        </div>
        
        <div class="toolbar-group">
            <input type="text" id="searchInput" placeholder="Search nodes..." class="search-input">
            <button id="fitBtn" class="toolbar-btn" title="Fit to View">
                <span class="icon">🔍</span>
                Fit
            </button>
            <button id="resetBtn" class="toolbar-btn" title="Reset View">
                <span class="icon">🔄</span>
                Reset
            </button>
        </div>
        
        <div class="toolbar-group">
            <div class="complexity-legend">
                <span class="legend-item">
                    <span class="legend-color low"></span>
                    Low
                </span>
                <span class="legend-item">
                    <span class="legend-color medium"></span>
                    Medium
                </span>
                <span class="legend-item">
                    <span class="legend-color high"></span>
                    High
                </span>
            </div>
        </div>
    </div>

    <div id="main-content">
        <div id="graph-container">
            <div id="cy"></div>
        </div>
        
        <div id="info-panel" class="info-panel">
            <div class="info-header">
                <h3 id="info-title">Node Information</h3>
                <button id="closeInfoBtn" class="close-btn">&times;</button>
            </div>
            <div id="info-content" class="info-content">
                <p>Select a node to view details</p>
            </div>
        </div>
    </div>

    <div id="loading" class="loading">
        <div class="spinner"></div>
        <p id="loading-message">Loading graph data...</p>
    </div>

    <div id="error" class="error hidden">
        <div class="error-content">
            <h3>Error Loading Graph</h3>
            <p id="error-message"></p>
            <div class="error-details">
                <details>
                    <summary>Technical Details</summary>
                    <pre id="error-stack"></pre>
                </details>
            </div>
            <div class="error-actions">
                <button id="retryBtn" class="retry-btn">Retry</button>
                <button id="fallbackBtn" class="fallback-btn">Use Fallback View</button>
            </div>
        </div>
    </div>

    <div id="fallback-view" class="fallback-view hidden">
        <div class="fallback-content">
            <h3>Graph Visualization Unavailable</h3>
            <p>The interactive graph could not be loaded. Here's a text-based view of your data:</p>
            <div id="fallback-data"></div>
        </div>
    </div>

    <!-- Load libraries with proper error handling -->
    <script nonce="${nonce}">
        // Global variables
        let cy = null;
        let analysisData = null;
        let currentView = 'module-graph';
        let selectedFunction = null;
        let debugMode = false;
        
        // VS Code API
        const vscode = acquireVsCodeApi();
        
        // Library loading status
        window.libraryStatus = {
            dagre: false,
            cytoscape: false,
            cytoscapeDagre: false
        };

        // Check if libraries are loaded properly
        function checkLibraryLoading() {
            const loadingMessage = document.getElementById('loading-message');
            
            console.log('Checking library loading status...');
            console.log('dagre available:', typeof dagre !== 'undefined');
            console.log('cytoscape available:', typeof cytoscape !== 'undefined');
            console.log('cytoscapeDagre available:', typeof cytoscapeDagre !== 'undefined');
            
            if (typeof dagre !== 'undefined') {
                window.libraryStatus.dagre = true;
                loadingMessage.textContent = 'Dagre loaded, loading Cytoscape.js...';
            }
            
            if (typeof cytoscape !== 'undefined') {
                window.libraryStatus.cytoscape = true;
                loadingMessage.textContent = 'Cytoscape loaded, loading extensions...';
            }
            
            if (typeof cytoscapeDagre !== 'undefined') {
                window.libraryStatus.cytoscapeDagre = true;
                loadingMessage.textContent = 'All libraries loaded, initializing graph...';
            }
        }

        // Initialize the webview
        function initialize() {
            try {
                console.log('Starting webview initialization');
                
                // Check if required libraries are available
                if (typeof cytoscape === 'undefined') {
                    throw new Error('Cytoscape.js library is not available');
                }
                
                if (typeof dagre === 'undefined') {
                    throw new Error('Dagre library is not available');
                }
                
                // Register Cytoscape extensions
                if (typeof cytoscapeDagre !== 'undefined') {
                    cytoscape.use(cytoscapeDagre);
                    console.log('Cytoscape Dagre extension registered');
                } else {
                    console.warn('Cytoscape Dagre extension not available, using default layout');
                }
                
                setupEventListeners();
                showLoading();
                
                console.log('DoraCodeBirdView webview initialized successfully');
                
                // Request initial data
                vscode.postMessage({ command: 'ready' });
                
            } catch (error) {
                console.error('Error initializing webview:', error);
                showLibraryError('Failed to initialize graph library: ' + error.message);
            }
        }

        // Set up event listeners
        function setupEventListeners() {
            // Toolbar buttons
            document.getElementById('moduleGraphBtn').addEventListener('click', () => {
                switchView('module-graph');
            });
            
            document.getElementById('callHierarchyBtn').addEventListener('click', () => {
                switchView('call-hierarchy');
            });
            
            document.getElementById('fitBtn').addEventListener('click', fitToView);
            document.getElementById('resetBtn').addEventListener('click', resetView);
            document.getElementById('closeInfoBtn').addEventListener('click', closeInfoPanel);
            document.getElementById('retryBtn').addEventListener('click', retryLoad);
            document.getElementById('fallbackBtn').addEventListener('click', showFallbackView);
            
            // Search input
            document.getElementById('searchInput').addEventListener('input', handleSearch);
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'updateData':
                    handleDataUpdate(message.data);
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
                console.log('Handling data update', data);
                
                analysisData = data.analysisData;
                currentView = data.currentView;
                selectedFunction = data.selectedFunction;
                debugMode = data.debugMode || false;
                
                if (!analysisData) {
                    showError('Analysis data is being loaded...');
                    return;
                }
                
                updateToolbar();
                renderGraph();
                
            } catch (error) {
                console.error('Failed to handle data update:', error);
                showError('Failed to process analysis data: ' + error.message);
            }
        }
        
        // Switch between different views
        function switchView(view, functionName = null) {
            currentView = view;
            selectedFunction = functionName;
            
            updateToolbar();
            
            if (analysisData) {
                renderGraph();
            }
            
            // Notify extension about view change
            vscode.postMessage({
                command: 'viewChanged',
                data: { view, selectedFunction }
            });
        }
        
        // Update toolbar state
        function updateToolbar() {
            const moduleBtn = document.getElementById('moduleGraphBtn');
            const callBtn = document.getElementById('callHierarchyBtn');
            const searchInput = document.getElementById('searchInput');
            
            moduleBtn.classList.toggle('active', currentView === 'module-graph');
            callBtn.classList.toggle('active', currentView === 'call-hierarchy');
            
            searchInput.placeholder = currentView === 'module-graph' 
                ? 'Search modules...' 
                : 'Search functions...';
        }
        
        // Render the graph based on current view
        function renderGraph() {
            try {
                hideError();
                showLoading();
                
                console.log('Rendering graph for view:', currentView);
                
                if (currentView === 'module-graph') {
                    renderModuleGraph();
                } else if (currentView === 'call-hierarchy') {
                    renderCallHierarchy();
                } else if (currentView === 'git-analytics') {
                    renderGitAnalytics();
                } else if (currentView === 'current-file') {
                    renderCurrentFileAnalysis();
                } else if (currentView === 'json-view') {
                    renderJsonView();
                } else {
                    throw new Error('Unknown view type: ' + currentView);
                }
                
                hideLoading();
                console.log('Graph rendered successfully');
                
            } catch (error) {
                console.error('Error rendering graph:', error);
                hideLoading();
                showError('Failed to render graph: ' + error.message);
            }
        }
        
        // Render module graph
        function renderModuleGraph() {
            if (!analysisData.modules) {
                showError('No module data available');
                return;
            }
            
            const elements = createModuleGraphElements();
            initializeCytoscape(elements, getModuleGraphStyle(), getModuleGraphLayout());
        }
        
        // Render call hierarchy
        function renderCallHierarchy() {
            if (!analysisData.functions) {
                showError('No function data available');
                return;
            }
            
            const elements = createCallHierarchyElements();
            initializeCytoscape(elements, getCallHierarchyStyle(), getCallHierarchyLayout());
        }
        
        // Create elements for module graph
        function createModuleGraphElements() {
            const elements = [];
            const modules = analysisData.modules;
            
            // Add module nodes
            modules.nodes.forEach(module => {
                elements.push({
                    data: {
                        id: module.id,
                        label: module.name,
                        complexity: module.complexity,
                        size: module.size,
                        path: module.path,
                        functions: module.functions,
                        type: 'module'
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
        
        // Create elements for call hierarchy
        function createCallHierarchyElements() {
            const elements = [];
            const functions = analysisData.functions;
            
            // Filter functions if a specific function is selected
            let nodesToShow = functions.nodes;
            let edgesToShow = functions.edges;
            
            if (selectedFunction) {
                // Find connected functions (callers and callees)
                const connectedFunctions = new Set([selectedFunction]);
                
                functions.edges.forEach(edge => {
                    if (edge.caller === selectedFunction) {
                        connectedFunctions.add(edge.callee);
                    }
                    if (edge.callee === selectedFunction) {
                        connectedFunctions.add(edge.caller);
                    }
                });
                
                nodesToShow = functions.nodes.filter(node => connectedFunctions.has(node.id));
                edgesToShow = functions.edges.filter(edge => 
                    connectedFunctions.has(edge.caller) && connectedFunctions.has(edge.callee)
                );
            }
            
            // Add function nodes
            nodesToShow.forEach(func => {
                elements.push({
                    data: {
                        id: func.id,
                        label: func.name,
                        module: func.module,
                        complexity: func.complexity,
                        lineNumber: func.lineNumber,
                        parameters: func.parameters,
                        type: 'function',
                        isSelected: func.id === selectedFunction
                    }
                });
            });
            
            // Add call edges
            edgesToShow.forEach(edge => {
                elements.push({
                    data: {
                        id: edge.caller + '-' + edge.callee,
                        source: edge.caller,
                        target: edge.callee,
                        callCount: edge.callCount,
                        lineNumbers: edge.lineNumbers,
                        type: 'call'
                    }
                });
            });
            
            return elements;
        }
        
        // Initialize Cytoscape instance
        function initializeCytoscape(elements, style, layout) {
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
                
                console.log('Initializing Cytoscape with', elements.length, 'elements');
                
                // Create new instance
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
                setupCytoscapeEvents();
                
                console.log('Cytoscape initialized successfully');
                
            } catch (error) {
                console.error('Error initializing Cytoscape:', error);
                throw new Error('Failed to initialize graph visualization: ' + error.message);
            }
        }
        
        // Set up Cytoscape event handlers
        function setupCytoscapeEvents() {
            // Node click handler
            cy.on('tap', 'node', function(evt) {
                const node = evt.target;
                showNodeInfo(node);
            });
            
            // Background click handler
            cy.on('tap', function(evt) {
                if (evt.target === cy) {
                    closeInfoPanel();
                }
            });
        }
        
        // Show node information in info panel
        function showNodeInfo(node) {
            const data = node.data();
            const infoPanel = document.getElementById('info-panel');
            const infoTitle = document.getElementById('info-title');
            const infoContent = document.getElementById('info-content');
            
            infoPanel.classList.add('visible');
            
            if (data.type === 'module') {
                infoTitle.textContent = 'Module: ' + data.label;
                infoContent.innerHTML = \`
                    <div class="info-item">
                        <strong>Path:</strong> \${data.path}
                    </div>
                    <div class="info-item">
                        <strong>Complexity:</strong> \${data.complexity}
                    </div>
                    <div class="info-item">
                        <strong>Size:</strong> \${data.size} lines
                    </div>
                    <div class="info-item">
                        <strong>Functions:</strong> \${data.functions.length}
                    </div>
                \`;
            } else if (data.type === 'function') {
                const params = data.parameters.map(p => p.name).join(', ');
                infoTitle.textContent = 'Function: ' + data.label;
                infoContent.innerHTML = \`
                    <div class="info-item">
                        <strong>Module:</strong> \${data.module}
                    </div>
                    <div class="info-item">
                        <strong>Line:</strong> \${data.lineNumber}
                    </div>
                    <div class="info-item">
                        <strong>Complexity:</strong> \${data.complexity}
                    </div>
                    <div class="info-item">
                        <strong>Parameters:</strong> (\${params})
                    </div>
                \`;
            }
        }
        
        // Get complexity color based on score
        function getComplexityColor(complexity) {
            if (complexity <= 5) return '#28a745'; // Green
            if (complexity <= 10) return '#ffc107'; // Orange
            return '#dc3545'; // Red
        }
        
        // Get module graph style
        function getModuleGraphStyle() {
            return [
                {
                    selector: 'node[type="module"]',
                    style: {
                        'background-color': function(ele) {
                            return getComplexityColor(ele.data('complexity'));
                        },
                        'label': 'data(label)',
                        'width': function(ele) {
                            return Math.max(30, Math.min(100, ele.data('size') / 10));
                        },
                        'height': function(ele) {
                            return Math.max(30, Math.min(100, ele.data('size') / 10));
                        },
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'font-size': '12px',
                        'color': '#fff',
                        'text-outline-width': 2,
                        'text-outline-color': '#000',
                        'shape': 'rectangle'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': function(ele) {
                            return Math.max(1, ele.data('weight') || 1);
                        },
                        'line-color': '#666',
                        'target-arrow-color': '#666',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier'
                    }
                },
                {
                    selector: ':selected',
                    style: {
                        'border-width': 3,
                        'border-color': '#007acc'
                    }
                }
            ];
        }
        
        // Get call hierarchy style
        function getCallHierarchyStyle() {
            return [
                {
                    selector: 'node[type="function"]',
                    style: {
                        'background-color': function(ele) {
                            return ele.data('isSelected') ? '#007acc' : getComplexityColor(ele.data('complexity'));
                        },
                        'label': 'data(label)',
                        'width': 60,
                        'height': 30,
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'font-size': '10px',
                        'color': '#fff',
                        'text-outline-width': 1,
                        'text-outline-color': '#000',
                        'shape': 'ellipse'
                    }
                },
                {
                    selector: 'edge[type="call"]',
                    style: {
                        'width': function(ele) {
                            return Math.max(1, Math.log(ele.data('callCount') + 1));
                        },
                        'line-color': '#666',
                        'target-arrow-color': '#666',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier'
                    }
                },
                {
                    selector: ':selected',
                    style: {
                        'border-width': 2,
                        'border-color': '#007acc'
                    }
                }
            ];
        }
        
        // Get module graph layout
        function getModuleGraphLayout() {
            return {
                name: 'cose',
                idealEdgeLength: 100,
                nodeOverlap: 20,
                refresh: 20,
                fit: true,
                padding: 30,
                randomize: false,
                componentSpacing: 100,
                nodeRepulsion: 400000,
                edgeElasticity: 100,
                nestingFactor: 5,
                gravity: 80,
                numIter: 1000,
                initialTemp: 200,
                coolingFactor: 0.95,
                minTemp: 1.0
            };
        }
        
        // Get call hierarchy layout
        function getCallHierarchyLayout() {
            return {
                name: 'dagre',
                directed: true,
                padding: 10,
                spacingFactor: 1.25,
                rankDir: 'TB',
                ranker: 'tight-tree',
                fit: true
            };
        }
        
        // Handle search functionality
        function handleSearch() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            
            if (!cy || !searchTerm) {
                // Reset all nodes if search is empty
                if (cy) {
                    cy.nodes().removeClass('highlighted dimmed');
                }
                return;
            }
            
            // Find matching nodes
            const matchingNodes = cy.nodes().filter(function(node) {
                const label = node.data('label').toLowerCase();
                const module = node.data('module') ? node.data('module').toLowerCase() : '';
                return label.includes(searchTerm) || module.includes(searchTerm);
            });
            
            // Highlight matching nodes and dim others
            cy.nodes().addClass('dimmed').removeClass('highlighted');
            matchingNodes.addClass('highlighted').removeClass('dimmed');
            
            // Focus on first match if any
            if (matchingNodes.length > 0) {
                cy.fit(matchingNodes, 50);
            }
        }
        
        // Fit graph to view
        function fitToView() {
            if (cy) {
                cy.fit(null, 50);
            }
        }
        
        // Reset view
        function resetView() {
            if (cy) {
                cy.zoom(1);
                cy.center();
                cy.nodes().removeClass('highlighted dimmed');
                document.getElementById('searchInput').value = '';
            }
        }
        
        // Close info panel
        function closeInfoPanel() {
            document.getElementById('info-panel').classList.remove('visible');
        }
        
        // Show loading state
        function showLoading() {
            document.getElementById('loading').classList.remove('hidden');
            document.getElementById('graph-container').style.display = 'none';
        }
        
        // Hide loading state
        function hideLoading() {
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('graph-container').style.display = 'block';
        }
        
        // Show error state
        function showError(message) {
            hideLoading();
            document.getElementById('error').classList.remove('hidden');
            document.getElementById('error-message').textContent = message;
            document.getElementById('graph-container').style.display = 'none';
        }
        
        // Hide error state
        function hideError() {
            document.getElementById('error').classList.add('hidden');
        }
        
        // Show library error
        function showLibraryError(message) {
            console.error('Library loading error:', message);
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('error-message').textContent = message;
            document.getElementById('error').classList.remove('hidden');
            
            // Show fallback button
            document.getElementById('fallbackBtn').style.display = 'inline-block';
        }
        
        // Retry loading
        function retryLoad() {
            hideError();
            hideFallbackView();
            showLoading();
            
            vscode.postMessage({
                command: 'retry'
            });
        }
        
        // Show fallback view when graph visualization fails
        function showFallbackView() {
            hideError();
            hideLoading();
            document.getElementById('graph-container').style.display = 'none';
            document.getElementById('fallback-view').classList.remove('hidden');
            
            // Generate fallback content
            generateFallbackContent();
        }
        
        // Hide fallback view
        function hideFallbackView() {
            document.getElementById('fallback-view').classList.add('hidden');
            document.getElementById('graph-container').style.display = 'block';
        }
        
        // Generate fallback content based on analysis data
        function generateFallbackContent() {
            const fallbackData = document.getElementById('fallback-data');
            if (!fallbackData || !analysisData) {
                return;
            }
            
            let content = '';
            
            if (currentView === 'module-graph' && analysisData.modules) {
                content = '<h4>Modules:</h4><ul>';
                analysisData.modules.nodes.forEach(module => {
                    const complexityColor = getComplexityColor(module.complexity);
                    content += \`<li style="border-left: 4px solid \${complexityColor}; padding-left: 8px; margin: 4px 0;">
                        <strong>\${module.name}</strong><br>
                        <small>Path: \${module.path}</small><br>
                        <small>Complexity: \${module.complexity}, Size: \${module.size} lines</small>
                    </li>\`;
                });
                content += '</ul>';
            } else if (currentView === 'call-hierarchy' && analysisData.functions) {
                content = '<h4>Functions:</h4><ul>';
                analysisData.functions.nodes.forEach(func => {
                    const complexityColor = getComplexityColor(func.complexity);
                    content += \`<li style="border-left: 4px solid \${complexityColor}; padding-left: 8px; margin: 4px 0;">
                        <strong>\${func.name}</strong><br>
                        <small>Module: \${func.module}, Line: \${func.lineNumber}</small><br>
                        <small>Complexity: \${func.complexity}</small>
                    </li>\`;
                });
                content += '</ul>';
            }
            
            fallbackData.innerHTML = content;
        }

        // Wait for all libraries to load before initializing
        let initializationAttempts = 0;
        const maxAttempts = 50; // 5 seconds with 100ms intervals
        
        function waitForLibraries() {
            initializationAttempts++;
            
            if (typeof dagre !== 'undefined' && typeof cytoscape !== 'undefined') {
                // Libraries loaded successfully
                try {
                    if (typeof cytoscapeDagre !== 'undefined') {
                        cytoscape.use(cytoscapeDagre);
                    }
                    initialize();
                } catch (error) {
                    console.error('Error initializing Cytoscape:', error);
                    showLibraryError('Failed to initialize graph library: ' + error.message);
                }
            } else if (initializationAttempts >= maxAttempts) {
                // Timeout - libraries didn't load
                const missingLibs = [];
                if (typeof dagre === 'undefined') missingLibs.push('Dagre');
                if (typeof cytoscape === 'undefined') missingLibs.push('Cytoscape.js');
                
                showLibraryError('Required libraries failed to load: ' + missingLibs.join(', '));
            } else {
                // Keep waiting
                setTimeout(waitForLibraries, 100);
            }
        }
    </script>
    
    <script nonce="${nonce}" src="${dagreUri}" onload="console.log('Dagre loaded successfully'); checkLibraryLoading()" onerror="console.error('Failed to load Dagre library from: ${dagreUri}')"></script>
    <script nonce="${nonce}" src="${cytoscapeUri}" onload="console.log('Cytoscape loaded successfully'); checkLibraryLoading()" onerror="console.error('Failed to load Cytoscape.js library from: ${cytoscapeUri}')"></script>
    <script nonce="${nonce}" src="${cytoscapeDagreUri}" onload="console.log('Cytoscape Dagre loaded successfully'); checkLibraryLoading()" onerror="console.error('Failed to load Cytoscape Dagre extension from: ${cytoscapeDagreUri}')"></script>
    
    <script nonce="${nonce}">
        // Start waiting for libraries
        setTimeout(waitForLibraries, 100);
    </script>
</body>
</html>`;
    }

    /**
     * Generate a nonce for Content Security Policy
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
     * Send a message to the webview
     */
    private sendMessageToWebview(message: WebviewMessage): void {
        if (this.panel && this.panel.webview) {
            try {
                this.panel.webview.postMessage(message);
                this.log(`Message sent to webview: ${message.command}`);
            } catch (error) {
                this.logError('Failed to send message to webview', error);
            }
        }
    }

    /**
     * Handle messages received from the webview
     */
    private handleWebviewMessage(message: WebviewMessage): void {
        this.log(`Received message from webview: ${message.command}`);

        switch (message.command) {
            case 'ready':
                this.log('Webview is ready');
                // Send initial data if available
                if (this.analysisData) {
                    this.sendMessageToWebview({
                        command: 'updateData',
                        data: {
                            analysisData: this.analysisData,
                            currentView: this.currentView,
                            selectedFunction: this.selectedFunction,
                            debugMode: this.debugMode
                        }
                    });
                }
                break;

            case 'error':
                this.logError('Webview error', message.data);
                break;

            case 'viewChanged':
                this.currentView = message.data?.view || this.currentView;
                this.selectedFunction = message.data?.selectedFunction || null;
                this.log(`View changed to: ${this.currentView}`);
                break;

            case 'retry':
                this.log('Webview requested retry');
                this.updateWebviewContent();
                break;

            default:
                this.log(`Unknown message command: ${message.command}`);
        }
    }

    /**
     * Convert current file analysis data to webview format
     */
    private convertCurrentFileAnalysisData(analysisData: any): WebviewAnalysisData {
        // Create a simplified webview data structure for current file analysis
        const nodes: any[] = [];
        const edges: any[] = [];
        
        // Add file as a node
        if (analysisData.file_name) {
            nodes.push({
                id: analysisData.file_name,
                name: analysisData.file_name,
                path: analysisData.file_path,
                complexity: analysisData.complexity_metrics?.overall_complexity?.cyclomatic || 0,
                size: analysisData.complexity_metrics?.total_lines || 0,
                functions: analysisData.complexity_metrics?.function_complexities?.map((f: any) => f.name) || []
            });
        }
        
        // Add functions as nodes
        if (analysisData.complexity_metrics?.function_complexities) {
            analysisData.complexity_metrics.function_complexities.forEach((func: any) => {
                nodes.push({
                    id: `${analysisData.file_name}::${func.name}`,
                    name: func.name,
                    module: analysisData.file_name,
                    complexity: func.complexity?.cyclomatic || 0,
                    line_number: func.line_number,
                    parameters: func.parameters || []
                });
                
                // Add edge from file to function
                edges.push({
                    source: analysisData.file_name,
                    target: `${analysisData.file_name}::${func.name}`,
                    type: 'contains'
                });
            });
        }
        
        // Add classes as nodes
        if (analysisData.complexity_metrics?.class_complexities) {
            analysisData.complexity_metrics.class_complexities.forEach((cls: any) => {
                nodes.push({
                    id: `${analysisData.file_name}::${cls.name}`,
                    name: cls.name,
                    module: analysisData.file_name,
                    complexity: 0, // Classes don't have direct complexity
                    line_number: cls.line_number,
                    type: 'class'
                });
                
                // Add edge from file to class
                edges.push({
                    source: analysisData.file_name,
                    target: `${analysisData.file_name}::${cls.name}`,
                    type: 'contains'
                });
                
                // Add methods as nodes
                if (cls.methods) {
                    cls.methods.forEach((method: any) => {
                        const methodId = `${analysisData.file_name}::${cls.name}::${method.name}`;
                        nodes.push({
                            id: methodId,
                            name: method.name,
                            module: analysisData.file_name,
                            complexity: method.complexity?.cyclomatic || 0,
                            line_number: method.line_number || 0,
                            parameters: method.parameters || [],
                            is_method: true
                        });
                        
                        // Add edge from class to method
                        edges.push({
                            source: `${analysisData.file_name}::${cls.name}`,
                            target: methodId,
                            type: 'contains'
                        });
                    });
                }
            });
        }
        
        return {
            modules: {
                nodes: nodes,
                edges: edges
            },
            functions: {
                nodes: nodes.filter(n => n.name !== analysisData.file_name),
                edges: edges
            },
            techStack: {
                libraries: analysisData.tech_stack?.libraries || [],
                frameworks: analysisData.tech_stack?.frameworks || [],
                pythonVersion: analysisData.tech_stack?.python_version || 'unknown',
                packageManager: analysisData.tech_stack?.package_manager || 'pip'
            },
            frameworkPatterns: analysisData.framework_patterns || {}
        };
    }

    /**
     * Convert Git analytics data to webview format
     */
    private convertGitAnalyticsData(analysisData: any, analysisType: string): WebviewAnalysisData {
        // Create nodes and edges for Git analytics visualization
        const nodes: any[] = [];
        const edges: any[] = [];
        
        // For Git analytics, we'll create a different visualization structure
        // This could show authors as nodes, modules as nodes, etc.
        
        if (analysisData.author_contributions) {
            analysisData.author_contributions.forEach((author: any, index: number) => {
                nodes.push({
                    id: `author_${index}`,
                    name: author.author_name,
                    email: author.author_email,
                    commits: author.total_commits,
                    linesAdded: author.lines_added,
                    linesRemoved: author.lines_removed,
                    contributionPercentage: author.contribution_percentage,
                    type: 'author'
                });
            });
        }
        
        if (analysisData.module_statistics) {
            Object.entries(analysisData.module_statistics).forEach(([modulePath, stats]: [string, any], index: number) => {
                nodes.push({
                    id: `module_${index}`,
                    name: modulePath,
                    path: modulePath,
                    commits: stats.total_commits,
                    authors: stats.unique_authors,
                    linesAdded: stats.lines_added,
                    linesRemoved: stats.lines_removed,
                    type: 'module'
                });
                
                // Create edges between authors and modules they contributed to
                if (stats.author_breakdown) {
                    stats.author_breakdown.forEach((authorContrib: any) => {
                        const authorIndex = analysisData.author_contributions?.findIndex(
                            (a: any) => a.author_name === authorContrib.author_name
                        );
                        if (authorIndex >= 0) {
                            edges.push({
                                source: `author_${authorIndex}`,
                                target: `module_${index}`,
                                commits: authorContrib.total_commits,
                                type: 'contribution'
                            });
                        }
                    });
                }
            });
        }
        
        return {
            modules: {
                nodes: nodes,
                edges: edges
            },
            functions: {
                nodes: [],
                edges: []
            },
            techStack: {
                libraries: [],
                frameworks: [],
                pythonVersion: 'unknown',
                packageManager: 'pip'
            },
            gitAnalytics: {
                repositoryInfo: analysisData.repository_info || {},
                authorContributions: analysisData.author_contributions || [],
                moduleStatistics: analysisData.module_statistics || {},
                commitTimeline: analysisData.commit_timeline || {},
                contributionGraphs: analysisData.contribution_graphs || [],
                analysisType: analysisType
            },
            frameworkPatterns: {}
        };
    }

    /**
     * Log message to output channel
     */
    private log(message: string): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        
        this.outputChannel.appendLine(logMessage);
        
        if (this.debugMode) {
            console.log(`[DoraCodeBirdView] ${logMessage}`);
        }
    }

    /**
     * Log error message to output channel
     */
    private logError(message: string, error: any): void {
        const timestamp = new Date().toISOString();
        const errorMessage = error instanceof Error 
            ? `${error.message}\n${error.stack}`
            : JSON.stringify(error);
        
        const logMessage = `[${timestamp}] ERROR: ${message}\n${errorMessage}`;
        this.outputChannel.appendLine(logMessage);
        
        console.error(`[DoraCodeBirdView] ${message}`, error);
    }

    /**
     * Dispose of the webview provider
     */
    public dispose(): void {
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
        
        this.log('WebviewProvider disposed');
    }
}