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
 * Diagnostics information for debugging webview issues
 */
export interface WebviewDiagnostics {
    initializationTime: number;
    libraryLoadTime: number;
    renderTime: number;
    errors: DiagnosticError[];
    warnings: DiagnosticWarning[];
    performance: { [key: string]: number };
}

export interface DiagnosticError {
    timestamp: number;
    type: string;
    message: string;
    stack?: string;
    context?: any;
}

export interface DiagnosticWarning {
    timestamp: number;
    type: string;
    message: string;
    context?: any;
}

/**
 * WebviewProvider manages the graph visualization webview panel
 */
export class WebviewProvider {
    private panel: vscode.WebviewPanel | undefined;
    private context: vscode.ExtensionContext;
    private outputChannel: vscode.OutputChannel;
    private analysisData: WebviewAnalysisData | null = null;
    private currentView: 'module-graph' | 'call-hierarchy' = 'module-graph';
    private selectedFunction: string | null = null;
    private debugMode: boolean = false;
    private diagnostics: WebviewDiagnostics = {
        initializationTime: 0,
        libraryLoadTime: 0,
        renderTime: 0,
        errors: [],
        warnings: [],
        performance: {}
    };

    constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
        this.context = context;
        this.outputChannel = outputChannel;
        
        // Enable debug mode based on configuration or development environment
        const config = vscode.workspace.getConfiguration('codemindmap');
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
        // Validate that the function exists in the analysis data
        if (!this.validateFunctionInAnalysisData(analysisData, functionName)) {
            this.log(`Function '${functionName}' not found in analysis data`);
            
            // Still show the webview but with an error message
            this.analysisData = analysisData;
            this.currentView = 'call-hierarchy';
            this.selectedFunction = functionName;
            
            this.createOrShowWebview();
            
            // Send error message to webview
            setTimeout(() => {
                this.sendMessageToWebview({
                    command: 'error',
                    data: { 
                        message: `Function '${functionName}' not found in analysis data. The function may not be analyzed yet or may be from an external module.` 
                    }
                });
            }, 100);
            
            return;
        }

        this.analysisData = analysisData;
        this.currentView = 'call-hierarchy';
        this.selectedFunction = functionName;
        
        this.createOrShowWebview();
        this.updateWebviewContent();
        
        this.log(`Call hierarchy webview displayed for function: ${functionName}`);
    }

    /**
     * Validate that a function exists in the analysis data
     */
    private validateFunctionInAnalysisData(analysisData: WebviewAnalysisData, functionName: string): boolean {
        if (!analysisData.functions) {
            return false;
        }

        // Check if the function exists in the analysis data
        const functionExists = analysisData.functions.nodes.some(func => 
            func.id === functionName || 
            func.name === functionName ||
            func.id.endsWith('.' + functionName)
        );

        return functionExists;
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
        const startTime = Date.now();
        
        try {
            const columnToShowIn = vscode.window.activeTextEditor
                ? vscode.window.activeTextEditor.viewColumn
                : undefined;

            if (this.panel) {
                // If panel exists, just reveal it
                this.panel.reveal(columnToShowIn);
                this.recordPerformance('webview_reveal', Date.now() - startTime);
                return;
            }

            // Validate extension resources exist
            const resourcesPath = vscode.Uri.joinPath(this.context.extensionUri, 'resources');
            
            // Create new webview panel
            this.panel = vscode.window.createWebviewPanel(
                'codemindmapGraph',
                'CodeMindMap - Graph Visualization',
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
                this.addDiagnosticWarning('icon_load', 'Failed to set webview icon', { error: iconError });
            }

            // Handle webview disposal
            this.panel.onDidDispose(() => {
                this.panel = undefined;
                this.log('Webview panel disposed');
                this.addDiagnosticWarning('webview_lifecycle', 'Webview panel disposed');
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
                        this.addDiagnosticError('message_handling', 'Error handling webview message', 
                            error instanceof Error ? error.stack : undefined, 
                            { command: message.command, hasData: !!message.data });
                        this.logError('Error handling webview message', error);
                    }
                },
                undefined,
                this.context.subscriptions
            );

            const creationTime = Date.now() - startTime;
            this.recordPerformance('webview_creation', creationTime);
            this.log(`Webview panel created in ${creationTime}ms`);
            
        } catch (error) {
            this.addDiagnosticError('webview_creation', 'Failed to create webview panel', 
                error instanceof Error ? error.stack : undefined);
            this.logError('Failed to create webview panel', error);
            throw error;
        }
    }

    /**
     * Update the webview content based on current view and data
     */
    private updateWebviewContent(): void {
        if (!this.panel) {
            this.addDiagnosticWarning('content_update', 'Attempted to update content but panel is undefined');
            return;
        }

        const startTime = Date.now();

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
                            debugMode: this.debugMode,
                            diagnostics: this.debugMode ? this.diagnostics : undefined
                        }
                    });
                    
                    const updateTime = Date.now() - startTime;
                    this.recordPerformance('content_update', updateTime);
                    this.log(`Webview content updated for ${this.currentView} in ${updateTime}ms`);
                    
                } catch (error) {
                    this.addDiagnosticError('data_send', 'Failed to send data to webview', 
                        error instanceof Error ? error.stack : undefined);
                    this.logError('Failed to send data to webview', error);
                }
            }, 100);

        } catch (error) {
            this.addDiagnosticError('content_update', 'Failed to update webview content', 
                error instanceof Error ? error.stack : undefined);
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
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource}; img-src ${webview.cspSource} data:;">
    <link href="${styleUri}" rel="stylesheet">
    <title>CodeMindMap - Graph Visualization</title>
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

    <div id="debug-panel" class="debug-panel hidden">
        <div class="debug-header">
            <h3>Debug Information</h3>
            <button id="closeDebugBtn" class="close-btn">&times;</button>
        </div>
        <div class="debug-content">
            <div class="debug-section">
                <h4>Library Status</h4>
                <div id="debug-libraries"></div>
            </div>
            <div class="debug-section">
                <h4>Performance Metrics</h4>
                <div id="debug-performance"></div>
            </div>
            <div class="debug-section">
                <h4>Errors</h4>
                <div id="debug-errors"></div>
            </div>
            <div class="debug-section">
                <h4>Warnings</h4>
                <div id="debug-warnings"></div>
            </div>
            <div class="debug-actions">
                <button id="exportDebugBtn" class="debug-btn">Export Debug Data</button>
                <button id="clearDebugBtn" class="debug-btn">Clear Debug Data</button>
            </div>
        </div>
    </div>

    <div id="debug-toggle" class="debug-toggle hidden" title="Show Debug Panel">
        🐛
    </div>

    <!-- Load libraries with proper error handling and fallbacks -->
    <script nonce="${nonce}">
        // Global error handler for script loading
        window.scriptLoadErrors = [];
        window.addEventListener('error', function(e) {
            if (e.filename && (e.filename.includes('cytoscape') || e.filename.includes('dagre'))) {
                window.scriptLoadErrors.push({
                    filename: e.filename,
                    message: e.message,
                    lineno: e.lineno,
                    colno: e.colno
                });
            }
        });

        // Library loading status
        window.libraryStatus = {
            dagre: false,
            cytoscape: false,
            cytoscapeDagre: false
        };

        // Check if libraries are loaded properly
        function checkLibraryLoading() {
            const loadingMessage = document.getElementById('loading-message');
            
            if (typeof dagre !== 'undefined') {
                window.libraryStatus.dagre = true;
                loadingMessage.textContent = 'Loading Cytoscape.js...';
            }
            
            if (typeof cytoscape !== 'undefined') {
                window.libraryStatus.cytoscape = true;
                loadingMessage.textContent = 'Loading Cytoscape extensions...';
            }
            
            if (typeof cytoscapeDagre !== 'undefined') {
                window.libraryStatus.cytoscapeDagre = true;
                loadingMessage.textContent = 'Initializing graph...';
            }
        }

        // Fallback function if libraries fail to load
        function initializeFallback() {
            console.warn('Cytoscape.js libraries failed to load, using fallback view');
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('error').classList.add('hidden');
            document.getElementById('graph-container').style.display = 'none';
            document.getElementById('fallback-view').classList.remove('hidden');
            
            // Notify extension about fallback mode
            if (typeof vscode !== 'undefined') {
                vscode.postMessage({
                    command: 'fallbackMode',
                    data: { errors: window.scriptLoadErrors }
                });
            }
        }
    </script>
    
    <script nonce="${nonce}" src="${dagreUri}" onload="checkLibraryLoading()" onerror="console.error('Failed to load Dagre library')"></script>
    <script nonce="${nonce}" src="${cytoscapeUri}" onload="checkLibraryLoading()" onerror="console.error('Failed to load Cytoscape.js library')"></script>
    <script nonce="${nonce}" src="${cytoscapeDagreUri}" onload="checkLibraryLoading()" onerror="console.error('Failed to load Cytoscape Dagre extension')"></script>
    
    <script nonce="${nonce}">
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
                    ${this.getWebviewScript()}
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
        
        function showLibraryError(message) {
            console.error('Library loading error:', message);
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('error-message').textContent = message;
            document.getElementById('error-stack').textContent = window.scriptLoadErrors.map(e => 
                e.filename + ':' + e.lineno + ':' + e.colno + ' - ' + e.message
            ).join('\\n');
            document.getElementById('error').classList.remove('hidden');
            
            // Show fallback button
            document.getElementById('fallbackBtn').style.display = 'inline-block';
        }
        
        // Start waiting for libraries
        setTimeout(waitForLibraries, 100);
    </script>
</body>
</html>`;
    }

    /**
     * Generate JavaScript code for the webview
     */
    private getWebviewScript(): string {
        return `
        // Global variables
        let cy = null;
        let analysisData = null;
        let currentView = 'module-graph';
        let selectedFunction = null;
        let debugMode = false;
        let diagnostics = {
            initTime: 0,
            renderTimes: [],
            errors: [],
            warnings: [],
            libraryVersions: {}
        };
        
        // VS Code API
        const vscode = acquireVsCodeApi();
        
        // Debug logging function
        function debugLog(message, data) {
            if (debugMode) {
                console.log('[CodeMindMap Debug]', message, data || '');
                
                // Send debug info to extension
                vscode.postMessage({
                    command: 'debugLog',
                    data: { message, data, timestamp: Date.now() }
                });
            }
        }
        
        // Error tracking function
        function trackError(type, message, error) {
            const errorInfo = {
                type,
                message,
                timestamp: Date.now(),
                stack: error?.stack,
                userAgent: navigator.userAgent,
                url: window.location.href
            };
            
            diagnostics.errors.push(errorInfo);
            debugLog('Error tracked:', errorInfo);
            
            // Send error to extension
            vscode.postMessage({
                command: 'webviewError',
                data: errorInfo
            });
        }
        
        // Warning tracking function
        function trackWarning(type, message, context) {
            const warningInfo = {
                type,
                message,
                timestamp: Date.now(),
                context
            };
            
            diagnostics.warnings.push(warningInfo);
            debugLog('Warning tracked:', warningInfo);
        }
        
        // Performance tracking function
        function trackPerformance(metric, startTime) {
            const duration = Date.now() - startTime;
            debugLog(\`Performance [\${metric}]:\`, \`\${duration}ms\`);
            
            if (metric === 'render') {
                diagnostics.renderTimes.push(duration);
            }
            
            return duration;
        }
        
        // DOM elements
        const elements = {
            loading: document.getElementById('loading'),
            error: document.getElementById('error'),
            errorMessage: document.getElementById('error-message'),
            graphContainer: document.getElementById('graph-container'),
            infoPanel: document.getElementById('info-panel'),
            infoTitle: document.getElementById('info-title'),
            infoContent: document.getElementById('info-content'),
            moduleGraphBtn: document.getElementById('moduleGraphBtn'),
            callHierarchyBtn: document.getElementById('callHierarchyBtn'),
            searchInput: document.getElementById('searchInput'),
            fitBtn: document.getElementById('fitBtn'),
            resetBtn: document.getElementById('resetBtn'),
            closeInfoBtn: document.getElementById('closeInfoBtn'),
            retryBtn: document.getElementById('retryBtn')
        };
        
        // Initialize the webview
        function initialize() {
            const initStartTime = Date.now();
            
            try {
                debugLog('Starting webview initialization');
                
                // Collect library version information
                diagnostics.libraryVersions = {
                    cytoscape: typeof cytoscape !== 'undefined' ? (cytoscape.version || 'unknown') : 'not loaded',
                    dagre: typeof dagre !== 'undefined' ? (dagre.version || 'unknown') : 'not loaded',
                    cytoscapeDagre: typeof cytoscapeDagre !== 'undefined' ? 'loaded' : 'not loaded'
                };
                
                debugLog('Library versions:', diagnostics.libraryVersions);
                
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
                    debugLog('Cytoscape Dagre extension registered');
                } else {
                    trackWarning('extension_missing', 'Cytoscape Dagre extension not available, using default layout');
                }
                
                setupEventListeners();
                showLoading();
                
                diagnostics.initTime = trackPerformance('initialization', initStartTime);
                
                // Log successful initialization
                debugLog('CodeMindMap webview initialized successfully', {
                    initTime: diagnostics.initTime,
                    libraryVersions: diagnostics.libraryVersions
                });
                
                // Request initial data
                if (typeof vscode !== 'undefined') {
                    vscode.postMessage({
                        command: 'ready'
                    });
                } else {
                    const error = new Error('VS Code API not available');
                    trackError('vscode_api', 'VS Code API not available', error);
                    showError('VS Code API not available. Please reload the webview.');
                }
                
            } catch (error) {
                trackError('initialization', 'Failed to initialize webview', error);
                showError('Failed to initialize graph visualization: ' + error.message);
                
                // Notify extension about initialization failure
                if (typeof vscode !== 'undefined') {
                    vscode.postMessage({
                        command: 'initializationError',
                        data: { 
                            message: error.message,
                            stack: error.stack,
                            libraryStatus: window.libraryStatus,
                            diagnostics: diagnostics
                        }
                    });
                }
            }
        }
        
        // Set up event listeners
        function setupEventListeners() {
            try {
                elements.moduleGraphBtn.addEventListener('click', () => switchView('module-graph'));
                elements.callHierarchyBtn.addEventListener('click', () => switchView('call-hierarchy'));
                elements.searchInput.addEventListener('input', handleSearch);
                elements.fitBtn.addEventListener('click', fitToView);
                elements.resetBtn.addEventListener('click', resetView);
                elements.closeInfoBtn.addEventListener('click', closeInfoPanel);
                elements.retryBtn.addEventListener('click', retryLoad);
                
                // Add fallback button listener
                const fallbackBtn = document.getElementById('fallbackBtn');
                if (fallbackBtn) {
                    fallbackBtn.addEventListener('click', showFallbackView);
                }
                
                // Add debug panel listeners
                const debugToggle = document.getElementById('debug-toggle');
                const debugPanel = document.getElementById('debug-panel');
                const closeDebugBtn = document.getElementById('closeDebugBtn');
                const exportDebugBtn = document.getElementById('exportDebugBtn');
                const clearDebugBtn = document.getElementById('clearDebugBtn');
                
                if (debugToggle) {
                    debugToggle.addEventListener('click', toggleDebugPanel);
                }
                if (closeDebugBtn) {
                    closeDebugBtn.addEventListener('click', hideDebugPanel);
                }
                if (exportDebugBtn) {
                    exportDebugBtn.addEventListener('click', exportDebugData);
                }
                if (clearDebugBtn) {
                    clearDebugBtn.addEventListener('click', clearDebugData);
                }
                
                // Handle window resize with error handling
                window.addEventListener('resize', () => {
                    try {
                        if (cy && typeof cy.resize === 'function') {
                            cy.resize();
                        }
                    } catch (error) {
                        console.warn('Error during window resize:', error);
                    }
                });
                
                // Add global error handler for unhandled errors
                window.addEventListener('error', (event) => {
                    console.error('Global error:', event.error);
                    if (typeof vscode !== 'undefined') {
                        vscode.postMessage({
                            command: 'globalError',
                            data: {
                                message: event.error?.message || 'Unknown error',
                                filename: event.filename,
                                lineno: event.lineno,
                                colno: event.colno,
                                stack: event.error?.stack
                            }
                        });
                    }
                });
                
                console.log('Event listeners set up successfully');
                
            } catch (error) {
                console.error('Error setting up event listeners:', error);
                throw error;
            }
        }
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'updateData':
                    handleDataUpdate(message.data);
                    break;
                case 'switchView':
                    switchView(message.data.view, message.data.selectedFunction);
                    break;
                case 'error':
                    showError(message.data.message);
                    break;
            }
        });
        
        // Handle data update from extension
        function handleDataUpdate(data) {
            const updateStartTime = Date.now();
            
            try {
                debugLog('Handling data update', {
                    hasAnalysisData: !!data.analysisData,
                    currentView: data.currentView,
                    selectedFunction: data.selectedFunction,
                    debugMode: data.debugMode
                });
                
                analysisData = data.analysisData;
                currentView = data.currentView;
                selectedFunction = data.selectedFunction;
                debugMode = data.debugMode || false;
                
                // Merge diagnostics if provided
                if (data.diagnostics && debugMode) {
                    Object.assign(diagnostics, data.diagnostics);
                }
                
                if (!analysisData) {
                    trackWarning('data_missing', 'No analysis data available');
                    showError('No analysis data available');
                    return;
                }
                
                // Validate analysis data structure
                const dataValidation = validateAnalysisData(analysisData);
                if (!dataValidation.valid) {
                    trackWarning('data_invalid', 'Analysis data validation failed', dataValidation.issues);
                    debugLog('Data validation issues:', dataValidation.issues);
                }
                
                updateToolbar();
                renderGraph();
                
                trackPerformance('data_update', updateStartTime);
                
            } catch (error) {
                trackError('data_update', 'Failed to handle data update', error);
                showError('Failed to process analysis data: ' + error.message);
            }
        }
        
        // Validate analysis data structure
        function validateAnalysisData(data) {
            const issues = [];
            let valid = true;
            
            if (!data) {
                issues.push('Data is null or undefined');
                valid = false;
            } else {
                if (data.modules) {
                    if (!Array.isArray(data.modules.nodes)) {
                        issues.push('modules.nodes is not an array');
                        valid = false;
                    }
                    if (!Array.isArray(data.modules.edges)) {
                        issues.push('modules.edges is not an array');
                        valid = false;
                    }
                }
                
                if (data.functions) {
                    if (!Array.isArray(data.functions.nodes)) {
                        issues.push('functions.nodes is not an array');
                        valid = false;
                    }
                    if (!Array.isArray(data.functions.edges)) {
                        issues.push('functions.edges is not an array');
                        valid = false;
                    }
                }
            }
            
            return { valid, issues };
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
            // Update button states
            elements.moduleGraphBtn.classList.toggle('active', currentView === 'module-graph');
            elements.callHierarchyBtn.classList.toggle('active', currentView === 'call-hierarchy');
            
            // Update search placeholder
            elements.searchInput.placeholder = currentView === 'module-graph' 
                ? 'Search modules...' 
                : 'Search functions...';
        }
        
        // Render the graph based on current view
        function renderGraph() {
            try {
                hideError();
                showLoading();
                
                // Validate that required libraries are still available
                if (typeof cytoscape === 'undefined') {
                    throw new Error('Cytoscape.js library is not available');
                }
                
                // Log rendering attempt
                console.log('Rendering graph for view:', currentView);
                
                if (currentView === 'module-graph') {
                    renderModuleGraph();
                } else if (currentView === 'call-hierarchy') {
                    renderCallHierarchy();
                } else {
                    throw new Error('Unknown view type: ' + currentView);
                }
                
                hideLoading();
                console.log('Graph rendered successfully');
                
            } catch (error) {
                console.error('Error rendering graph:', error);
                hideLoading();
                showError('Failed to render graph: ' + error.message);
                
                // Notify extension about rendering error
                if (typeof vscode !== 'undefined') {
                    vscode.postMessage({
                        command: 'renderError',
                        data: { 
                            message: error.message,
                            stack: error.stack,
                            view: currentView,
                            hasData: !!analysisData
                        }
                    });
                }
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
                // Validate inputs
                if (!elements || !Array.isArray(elements)) {
                    throw new Error('Invalid elements data provided to Cytoscape');
                }
                
                if (!style || !Array.isArray(style)) {
                    throw new Error('Invalid style data provided to Cytoscape');
                }
                
                if (!layout || typeof layout !== 'object') {
                    throw new Error('Invalid layout data provided to Cytoscape');
                }
                
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
                
                // Create new instance with error handling
                cy = cytoscape({
                    container: container,
                    elements: elements,
                    style: style,
                    layout: layout,
                    wheelSensitivity: 0.2,
                    minZoom: 0.1,
                    maxZoom: 3,
                    // Add error handling for layout
                    ready: function() {
                        console.log('Cytoscape instance ready');
                    }
                });
                
                // Validate that the instance was created successfully
                if (!cy || typeof cy.nodes !== 'function') {
                    throw new Error('Failed to create Cytoscape instance');
                }
                
                // Set up event handlers
                setupCytoscapeEvents();
                
                console.log('Cytoscape initialized successfully with', cy.nodes().length, 'nodes and', cy.edges().length, 'edges');
                
            } catch (error) {
                console.error('Error initializing Cytoscape:', error);
                
                // Clean up on error
                if (cy) {
                    try {
                        cy.destroy();
                    } catch (cleanupError) {
                        console.warn('Error during cleanup:', cleanupError);
                    }
                    cy = null;
                }
                
                throw new Error('Failed to initialize graph visualization: ' + error.message);
            }
        }
        
        // Set up Cytoscape event handlers
        function setupCytoscapeEvents() {
            // Node click handler
            cy.on('tap', 'node', function(evt) {
                const node = evt.target;
                showNodeInfo(node);
                
                // Notify extension about node selection
                vscode.postMessage({
                    command: 'nodeSelected',
                    data: {
                        nodeId: node.id(),
                        nodeData: node.data(),
                        view: currentView
                    }
                });
            });
            
            // Edge click handler
            cy.on('tap', 'edge', function(evt) {
                const edge = evt.target;
                showEdgeInfo(edge);
            });
            
            // Background click handler
            cy.on('tap', function(evt) {
                if (evt.target === cy) {
                    closeInfoPanel();
                }
            });
            
            // Double-click to navigate
            cy.on('dblclick', 'node', function(evt) {
                const node = evt.target;
                const nodeData = node.data();
                
                // Notify extension to navigate to the item
                vscode.postMessage({
                    command: 'navigateToItem',
                    data: {
                        type: nodeData.type,
                        path: nodeData.path,
                        lineNumber: nodeData.lineNumber,
                        module: nodeData.module,
                        name: nodeData.label
                    }
                });
            });
        }
        
        // Show node information in info panel
        function showNodeInfo(node) {
            const data = node.data();
            elements.infoPanel.classList.add('visible');
            
            if (data.type === 'module') {
                elements.infoTitle.textContent = 'Module: ' + data.label;
                elements.infoContent.innerHTML = \`
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
                    <div class="info-actions">
                        <button onclick="navigateToModule('\${data.path}')">Open File</button>
                    </div>
                \`;
            } else if (data.type === 'function') {
                const params = data.parameters.map(p => p.name).join(', ');
                elements.infoTitle.textContent = 'Function: ' + data.label;
                elements.infoContent.innerHTML = \`
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
                    <div class="info-actions">
                        <button onclick="navigateToFunction('\${data.module}', \${data.lineNumber})">Go to Function</button>
                        <button onclick="showCallHierarchy('\${data.id}')">Show Hierarchy</button>
                    </div>
                \`;
            }
        }
        
        // Show edge information in info panel
        function showEdgeInfo(edge) {
            const data = edge.data();
            elements.infoPanel.classList.add('visible');
            
            if (data.type === 'call') {
                elements.infoTitle.textContent = 'Function Call';
                elements.infoContent.innerHTML = \`
                    <div class="info-item">
                        <strong>From:</strong> \${data.source}
                    </div>
                    <div class="info-item">
                        <strong>To:</strong> \${data.target}
                    </div>
                    <div class="info-item">
                        <strong>Call Count:</strong> \${data.callCount}
                    </div>
                    <div class="info-item">
                        <strong>Lines:</strong> \${data.lineNumbers.join(', ')}
                    </div>
                \`;
            } else {
                elements.infoTitle.textContent = 'Dependency';
                elements.infoContent.innerHTML = \`
                    <div class="info-item">
                        <strong>From:</strong> \${data.source}
                    </div>
                    <div class="info-item">
                        <strong>To:</strong> \${data.target}
                    </div>
                    <div class="info-item">
                        <strong>Type:</strong> \${data.type}
                    </div>
                    <div class="info-item">
                        <strong>Weight:</strong> \${data.weight}
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
            const searchTerm = elements.searchInput.value.toLowerCase();
            
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
                elements.searchInput.value = '';
            }
        }
        
        // Close info panel
        function closeInfoPanel() {
            elements.infoPanel.classList.remove('visible');
        }
        
        // Show loading state
        function showLoading() {
            elements.loading.classList.remove('hidden');
            elements.graphContainer.style.display = 'none';
        }
        
        // Hide loading state
        function hideLoading() {
            elements.loading.classList.add('hidden');
            elements.graphContainer.style.display = 'block';
        }
        
        // Show error state
        function showError(message) {
            hideLoading();
            elements.error.classList.remove('hidden');
            elements.errorMessage.textContent = message;
            elements.graphContainer.style.display = 'none';
        }
        
        // Hide error state
        function hideError() {
            elements.error.classList.add('hidden');
        }
        
        // Retry loading
        function retryLoad() {
            hideError();
            hideFallbackView();
            showLoading();
            
            if (typeof vscode !== 'undefined') {
                vscode.postMessage({
                    command: 'retry'
                });
            } else {
                showError('VS Code API not available for retry');
            }
        }
        
        // Show fallback view when graph visualization fails
        function showFallbackView() {
            hideError();
            hideLoading();
            document.getElementById('graph-container').style.display = 'none';
            document.getElementById('fallback-view').classList.remove('hidden');
            
            // Generate fallback content
            generateFallbackContent();
            
            if (typeof vscode !== 'undefined') {
                vscode.postMessage({
                    command: 'fallbackViewShown',
                    data: { view: currentView }
                });
            }
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
                
                if (analysisData.modules.edges.length > 0) {
                    content += '<h4>Dependencies:</h4><ul>';
                    analysisData.modules.edges.forEach(edge => {
                        content += \`<li>\${edge.source} → \${edge.target} (\${edge.type})</li>\`;
                    });
                    content += '</ul>';
                }
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
                
                if (analysisData.functions.edges.length > 0) {
                    content += '<h4>Function Calls:</h4><ul>';
                    analysisData.functions.edges.forEach(edge => {
                        content += \`<li>\${edge.caller} → \${edge.callee} (calls: \${edge.callCount})</li>\`;
                    });
                    content += '</ul>';
                }
            } else {
                content = '<p>No data available for fallback view.</p>';
            }
            
            fallbackData.innerHTML = content;
        }
        
        // Navigation functions (called from info panel buttons)
        function navigateToModule(path) {
            vscode.postMessage({
                command: 'navigateToItem',
                data: {
                    type: 'module',
                    path: path
                }
            });
        }
        
        function navigateToFunction(module, lineNumber) {
            vscode.postMessage({
                command: 'navigateToItem',
                data: {
                    type: 'function',
                    module: module,
                    lineNumber: lineNumber
                }
            });
        }
        
        function showCallHierarchy(functionId) {
            vscode.postMessage({
                command: 'showCallHierarchy',
                data: {
                    functionId: functionId
                }
            });
        }
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initialize);
        } else {
            initialize();
        }
        `;
    }

    /**
     * Handle messages received from the webview
     */
    private handleWebviewMessage(message: WebviewMessage): void {
        try {
            switch (message.command) {
                case 'ready':
                    // Webview is ready, send initial data
                    this.updateWebviewContent();
                    break;

                case 'nodeSelected':
                    this.handleNodeSelection(message.data);
                    break;

                case 'navigateToItem':
                    this.handleNavigation(message.data);
                    break;

                case 'showCallHierarchy':
                    this.handleCallHierarchyRequest(message.data);
                    break;

                case 'viewChanged':
                    this.handleViewChange(message.data);
                    break;

                case 'retry':
                    this.updateWebviewContent();
                    break;

                case 'initializationError':
                    this.handleInitializationError(message.data);
                    break;

                case 'renderError':
                    this.handleRenderError(message.data);
                    break;

                case 'globalError':
                    this.handleGlobalError(message.data);
                    break;

                case 'fallbackMode':
                    this.handleFallbackMode(message.data);
                    break;

                case 'fallbackViewShown':
                    this.handleFallbackViewShown(message.data);
                    break;

                default:
                    this.log(`Unknown webview message command: ${message.command}`);
            }
        } catch (error) {
            this.logError('Error handling webview message', error);
        }
    }

    /**
     * Handle node selection in the graph
     */
    private handleNodeSelection(data: any): void {
        this.log(`Node selected: ${data.nodeId} (${data.view})`);
        
        // Could emit events here for other components to listen to
        // For now, just log the selection
    }

    /**
     * Handle navigation requests from the webview
     */
    private handleNavigation(data: any): void {
        try {
            if (data.type === 'module' && data.path) {
                // Navigate to module file
                const uri = vscode.Uri.file(data.path);
                vscode.workspace.openTextDocument(uri).then(document => {
                    vscode.window.showTextDocument(document);
                });
                
            } else if (data.type === 'function' && data.module && data.lineNumber) {
                // Navigate to function in module
                // This would need to be implemented with proper module path resolution
                this.log(`Navigate to function ${data.name} in ${data.module} at line ${data.lineNumber}`);
                
                // For now, just show a message
                vscode.window.showInformationMessage(
                    `Navigate to function: ${data.name} (line ${data.lineNumber})`
                );
            }
        } catch (error) {
            this.logError('Error handling navigation', error);
            vscode.window.showErrorMessage('Failed to navigate to item');
        }
    }

    /**
     * Handle call hierarchy requests from the webview
     */
    private handleCallHierarchyRequest(data: any): void {
        if (!data.functionId) {
            this.sendMessageToWebview({
                command: 'error',
                data: { message: 'No function ID provided for call hierarchy request' }
            });
            return;
        }

        if (!this.analysisData) {
            this.sendMessageToWebview({
                command: 'error',
                data: { message: 'No analysis data available for call hierarchy' }
            });
            return;
        }

        try {
            this.showCallHierarchy(this.analysisData, data.functionId);
        } catch (error) {
            this.logError('Failed to show call hierarchy from webview request', error);
            this.sendMessageToWebview({
                command: 'error',
                data: { message: 'Failed to display call hierarchy. Please try again.' }
            });
        }
    }

    /**
     * Handle view change notifications from the webview
     */
    private handleViewChange(data: any): void {
        this.currentView = data.view;
        this.selectedFunction = data.selectedFunction;
        
        this.log(`View changed to: ${this.currentView}${this.selectedFunction ? ` (function: ${this.selectedFunction})` : ''}`);
    }

    /**
     * Handle webview initialization errors
     */
    private handleInitializationError(data: any): void {
        this.logError('Webview initialization failed', data);
        
        // Show user-friendly error message
        vscode.window.showErrorMessage(
            'CodeMindMap: Failed to initialize graph visualization. Please check the output panel for details.',
            'Show Output',
            'Retry'
        ).then(selection => {
            if (selection === 'Show Output') {
                this.outputChannel.show();
            } else if (selection === 'Retry') {
                this.updateWebviewContent();
            }
        });
    }

    /**
     * Handle graph rendering errors
     */
    private handleRenderError(data: any): void {
        this.logError('Graph rendering failed', data);
        
        // Log detailed error information
        this.outputChannel.appendLine(`[WebviewProvider] Render Error Details:`);
        this.outputChannel.appendLine(`  View: ${data.view}`);
        this.outputChannel.appendLine(`  Has Data: ${data.hasData}`);
        this.outputChannel.appendLine(`  Message: ${data.message}`);
        if (data.stack) {
            this.outputChannel.appendLine(`  Stack: ${data.stack}`);
        }
    }

    /**
     * Handle global errors from the webview
     */
    private handleGlobalError(data: any): void {
        this.logError('Global webview error', data);
        
        // Log detailed error information
        this.outputChannel.appendLine(`[WebviewProvider] Global Error:`);
        this.outputChannel.appendLine(`  File: ${data.filename || 'unknown'}`);
        this.outputChannel.appendLine(`  Line: ${data.lineno || 'unknown'}`);
        this.outputChannel.appendLine(`  Column: ${data.colno || 'unknown'}`);
        this.outputChannel.appendLine(`  Message: ${data.message}`);
        if (data.stack) {
            this.outputChannel.appendLine(`  Stack: ${data.stack}`);
        }
    }

    /**
     * Handle fallback mode activation
     */
    private handleFallbackMode(data: any): void {
        this.log('Webview entered fallback mode due to library loading issues');
        
        if (data.errors && data.errors.length > 0) {
            this.outputChannel.appendLine(`[WebviewProvider] Script loading errors:`);
            data.errors.forEach((error: any, index: number) => {
                this.outputChannel.appendLine(`  ${index + 1}. ${error.filename}: ${error.message} (${error.lineno}:${error.colno})`);
            });
        }
        
        // Show informational message to user
        vscode.window.showWarningMessage(
            'CodeMindMap: Graph visualization libraries failed to load. Using fallback text view.',
            'Show Output'
        ).then(selection => {
            if (selection === 'Show Output') {
                this.outputChannel.show();
            }
        });
    }

    /**
     * Handle fallback view being shown
     */
    private handleFallbackViewShown(data: any): void {
        this.log(`Fallback view shown for: ${data.view}`);
    }

    /**
     * Add diagnostic error
     */
    private addDiagnosticError(type: string, message: string, stack?: string, context?: any): void {
        const error: DiagnosticError = {
            timestamp: Date.now(),
            type,
            message,
            stack,
            context
        };
        
        this.diagnostics.errors.push(error);
        
        if (this.debugMode) {
            this.outputChannel.appendLine(`[WebviewProvider] DIAGNOSTIC ERROR [${type}]: ${message}`);
            if (stack) {
                this.outputChannel.appendLine(`[WebviewProvider] Stack: ${stack}`);
            }
            if (context) {
                this.outputChannel.appendLine(`[WebviewProvider] Context: ${JSON.stringify(context, null, 2)}`);
            }
        }
    }

    /**
     * Add diagnostic warning
     */
    private addDiagnosticWarning(type: string, message: string, context?: any): void {
        const warning: DiagnosticWarning = {
            timestamp: Date.now(),
            type,
            message,
            context
        };
        
        this.diagnostics.warnings.push(warning);
        
        if (this.debugMode) {
            this.outputChannel.appendLine(`[WebviewProvider] DIAGNOSTIC WARNING [${type}]: ${message}`);
            if (context) {
                this.outputChannel.appendLine(`[WebviewProvider] Context: ${JSON.stringify(context, null, 2)}`);
            }
        }
    }

    /**
     * Record performance metric
     */
    private recordPerformance(metric: string, value: number): void {
        this.diagnostics.performance[metric] = value;
        
        if (this.debugMode) {
            this.outputChannel.appendLine(`[WebviewProvider] PERFORMANCE [${metric}]: ${value}ms`);
        }
    }

    /**
     * Get diagnostic report
     */
    public getDiagnostics(): WebviewDiagnostics {
        return { ...this.diagnostics };
    }

    /**
     * Clear diagnostics
     */
    public clearDiagnostics(): void {
        this.diagnostics = {
            initializationTime: 0,
            libraryLoadTime: 0,
            renderTime: 0,
            errors: [],
            warnings: [],
            performance: {}
        };
        
        if (this.debugMode) {
            this.log('Diagnostics cleared');
        }
    }

    /**
     * Export diagnostics to file for debugging
     */
    public async exportDiagnostics(): Promise<void> {
        try {
            const diagnosticsData = {
                timestamp: new Date().toISOString(),
                vscodeVersion: vscode.version,
                extensionVersion: this.context.extension.packageJSON.version,
                debugMode: this.debugMode,
                currentView: this.currentView,
                selectedFunction: this.selectedFunction,
                hasAnalysisData: !!this.analysisData,
                analysisDataSummary: this.analysisData ? {
                    hasModules: !!this.analysisData.modules,
                    moduleCount: this.analysisData.modules?.nodes?.length || 0,
                    hasFunctions: !!this.analysisData.functions,
                    functionCount: this.analysisData.functions?.nodes?.length || 0,
                    hasTechStack: !!this.analysisData.techStack,
                    hasFrameworkPatterns: !!this.analysisData.frameworkPatterns
                } : null,
                diagnostics: this.diagnostics
            };

            const diagnosticsJson = JSON.stringify(diagnosticsData, null, 2);
            
            // Show save dialog
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(`codemindmap-diagnostics-${Date.now()}.json`),
                filters: {
                    'JSON Files': ['json'],
                    'All Files': ['*']
                }
            });

            if (uri) {
                await vscode.workspace.fs.writeFile(uri, Buffer.from(diagnosticsJson, 'utf8'));
                vscode.window.showInformationMessage(`Diagnostics exported to: ${uri.fsPath}`);
            }
        } catch (error) {
            this.logError('Failed to export diagnostics', error);
            vscode.window.showErrorMessage('Failed to export diagnostics');
        }
    }

    /**
     * Send a message to the webview
     */
    private sendMessageToWebview(message: WebviewMessage): void {
        if (this.panel) {
            this.panel.webview.postMessage(message);
        }
    }

    /**
     * Generate a random nonce for CSP
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
     * Dispose of the webview provider
     */
    public dispose(): void {
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
    }

    /**
     * Log a message to the output channel
     */
    private log(message: string): void {
        this.outputChannel.appendLine(`[WebviewProvider] ${message}`);
    }

    /**
     * Log an error to the output channel
     */
    private logError(message: string, error: any): void {
        this.outputChannel.appendLine(`[WebviewProvider] ERROR: ${message}`);
        if (error instanceof Error) {
            this.outputChannel.appendLine(`[WebviewProvider] ${error.message}`);
            if (error.stack) {
                this.outputChannel.appendLine(`[WebviewProvider] ${error.stack}`);
            }
        } else {
            this.outputChannel.appendLine(`[WebviewProvider] ${String(error)}`);
        }
    }
}