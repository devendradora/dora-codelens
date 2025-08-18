import * as vscode from "vscode";
import * as path from "path";
import { ErrorHandler } from "../core/error-handler";

/**
 * Full Code Analysis Webview Provider
 * Provides dedicated webview for displaying full codebase analysis results
 */
export class FullCodeAnalysisWebview {
  private static readonly VIEW_TYPE = "doracodebirdview.fullCodeAnalysis";
  private panel: vscode.WebviewPanel | null = null;
  private errorHandler: ErrorHandler;
  private extensionPath: string;
  private currentData: any = null;

  constructor(errorHandler: ErrorHandler, extensionPath: string) {
    this.errorHandler = errorHandler;
    this.extensionPath = extensionPath;
  }

  /**
   * Show the full code analysis webview
   */
  public show(analysisData: any): void {
    try {
      this.currentData = analysisData;

      if (this.panel) {
        // If panel exists, update it and bring to front
        this.updateContent(analysisData);
        this.panel.reveal(vscode.ViewColumn.One);
      } else {
        // Create new panel
        this.createPanel();
        this.updateContent(analysisData);
      }

      this.errorHandler.logError(
        "Full code analysis webview shown",
        null,
        "FullCodeAnalysisWebview"
      );
    } catch (error) {
      this.errorHandler.logError(
        "Failed to show full code analysis webview",
        error,
        "FullCodeAnalysisWebview"
      );
      throw error;
    }
  }

  /**
   * Create the webview panel
   */
  private createPanel(): void {
    this.panel = vscode.window.createWebviewPanel(
      FullCodeAnalysisWebview.VIEW_TYPE,
      "Full Code Analysis",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.extensionPath, "resources")),
          vscode.Uri.file(path.join(this.extensionPath, "node_modules")),
        ],
      }
    );

    // Handle panel disposal
    this.panel.onDidDispose(() => {
      this.panel = null;
      this.errorHandler.logError(
        "Full code analysis webview disposed",
        null,
        "FullCodeAnalysisWebview"
      );
    });

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      (message) => this.handleWebviewMessage(message),
      undefined
    );
  }

  /**
   * Update webview content
   */
  private updateContent(analysisData: any): void {
    if (!this.panel) {return;}

    try {
      const html = this.generateHTML(analysisData);
      this.panel.webview.html = html;
    } catch (error) {
      this.errorHandler.logError(
        "Failed to update full code analysis content",
        error,
        "FullCodeAnalysisWebview"
      );
      this.showError("Failed to display analysis results");
    }
  }

  /**
   * Generate HTML content for the webview
   */
  private generateHTML(analysisData: any): string {
    // Validate analysis data
    if (!analysisData) {
      this.errorHandler.logError(
        "No analysis data provided to generateHTML",
        null,
        "FullCodeAnalysisWebview"
      );
      return this.generateErrorHTML("No analysis data provided");
    }

    // Log the complete backend response structure for debugging
    this.errorHandler.logError(
      "COMPLETE BACKEND RESPONSE STRUCTURE",
      {
        fullResponse: JSON.stringify(analysisData, null, 2),
        topLevelKeys: Object.keys(analysisData),
        hasModules: "modules" in analysisData,
        hasTechStack: "tech_stack" in analysisData,
        hasDependencies: "dependencies" in analysisData,
        modulesStructure: analysisData.modules ? {
          type: typeof analysisData.modules,
          isArray: Array.isArray(analysisData.modules),
          keys: typeof analysisData.modules === 'object' ? Object.keys(analysisData.modules) : null,
          sampleContent: JSON.stringify(analysisData.modules).substring(0, 500) + "..."
        } : null,
        techStackStructure: analysisData.tech_stack ? {
          type: typeof analysisData.tech_stack,
          keys: typeof analysisData.tech_stack === 'object' ? Object.keys(analysisData.tech_stack) : null
        } : null
      },
      "FullCodeAnalysisWebview"
    );

    const webview = this.panel!.webview;

    // Get resource URIs
    const cssUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.extensionPath, "resources", "webview.css"))
    );
    const graphStylesUri = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.extensionPath, "resources", "enhanced-graph-styles.css")
      )
    );
    const graphControlsUri = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.extensionPath, "resources", "enhanced-graph-controls.js")
      )
    );
    const cytoscapeUri = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(
          this.extensionPath,
          "node_modules",
          "cytoscape",
          "dist",
          "cytoscape.min.js"
        )
      )
    );
    const dagreUri = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(
          this.extensionPath,
          "node_modules",
          "dagre",
          "dist",
          "dagre.min.js"
        )
      )
    );
    const cytoscapeDagreUri = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(
          this.extensionPath,
          "node_modules",
          "cytoscape-dagre",
          "cytoscape-dagre.js"
        )
      )
    );

    // Generate tab content with error handling
    const tabContents = this.generateTabContents(analysisData);

    // Generate graph data with error handling
    let graphData: any;
    try {
      graphData = this.prepareGraphData(analysisData);
    } catch (error) {
      this.errorHandler.logError(
        "Error preparing graph data",
        error,
        "FullCodeAnalysisWebview"
      );
      graphData = {
        elements: [],
        style: [],
        layout: { name: "dagre" },
        state: {},
      };
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Full Code Analysis</title>
        <link rel="stylesheet" href="${cssUri}">
        <link rel="stylesheet" href="${graphStylesUri}">
        <meta http-equiv="Content-Security-Policy" content="
          default-src 'none';
          img-src ${webview.cspSource} https: data:;
          script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval';
          style-src ${webview.cspSource} 'unsafe-inline';
          font-src ${webview.cspSource} https:;
        ">
        <style>
          ${this.generateTabStyles()}
        </style>
      </head>
      <body>
        <div class="analysis-container">
          <!-- Tab Navigation -->
          <div class="tab-navigation">
            <div class="tab-list" role="tablist">
              <button class="tab-button active" data-tab="overview" role="tab" aria-selected="true">
                <span class="tab-icon">📊</span>
                <span class="tab-label">Overview</span>
              </button>
              <button class="tab-button" data-tab="tech-stack" role="tab" aria-selected="false">
                <span class="tab-icon">🛠️</span>
                <span class="tab-label">Tech Stack</span>
                ${tabContents.techStack.available ? '<span class="tab-badge">' + tabContents.techStack.count + '</span>' : ''}
              </button>
              <button class="tab-button" data-tab="code-graph" role="tab" aria-selected="false">
                <span class="tab-icon">🕸️</span>
                <span class="tab-label">Code Graph</span>
                ${tabContents.codeGraph.available ? '<span class="tab-badge">' + tabContents.codeGraph.count + '</span>' : ''}
              </button>
              <button class="tab-button" data-tab="modules" role="tab" aria-selected="false">
                <span class="tab-icon">📁</span>
                <span class="tab-label">Modules</span>
                ${tabContents.modules.available ? '<span class="tab-badge">' + tabContents.modules.count + '</span>' : ''}
              </button>
              ${tabContents.functions.available ? `
              <button class="tab-button" data-tab="functions" role="tab" aria-selected="false">
                <span class="tab-icon">⚡</span>
                <span class="tab-label">Functions</span>
                <span class="tab-badge">${tabContents.functions.count}</span>
              </button>
              ` : ''}
              ${tabContents.frameworkPatterns.available ? `
              <button class="tab-button" data-tab="framework-patterns" role="tab" aria-selected="false">
                <span class="tab-icon">🏗️</span>
                <span class="tab-label">Patterns</span>
                <span class="tab-badge">${tabContents.frameworkPatterns.count}</span>
              </button>
              ` : ''}
              <button class="tab-button" data-tab="metadata" role="tab" aria-selected="false">
                <span class="tab-icon">🔍</span>
                <span class="tab-label">Metadata</span>
                ${tabContents.metadata.hasErrors || tabContents.metadata.hasWarnings ? '<span class="tab-badge error">!</span>' : ''}
              </button>
            </div>
          </div>

          <!-- Tab Content -->
          <div class="tab-content-container">
            <!-- Overview Tab -->
            <div class="tab-content active" id="overview-tab" role="tabpanel">
              ${tabContents.overview.content}
            </div>

            <!-- Tech Stack Tab -->
            <div class="tab-content" id="tech-stack-tab" role="tabpanel">
              ${tabContents.techStack.content}
            </div>

            <!-- Code Graph Tab -->
            <div class="tab-content" id="code-graph-tab" role="tabpanel">
              ${tabContents.codeGraph.content}
            </div>

            <!-- Modules Tab -->
            <div class="tab-content" id="modules-tab" role="tabpanel">
              ${tabContents.modules.content}
            </div>

            <!-- Functions Tab -->
            ${tabContents.functions.available ? `
            <div class="tab-content" id="functions-tab" role="tabpanel">
              ${tabContents.functions.content}
            </div>
            ` : ''}

            <!-- Framework Patterns Tab -->
            ${tabContents.frameworkPatterns.available ? `
            <div class="tab-content" id="framework-patterns-tab" role="tabpanel">
              ${tabContents.frameworkPatterns.content}
            </div>
            ` : ''}

            <!-- Metadata Tab -->
            <div class="tab-content" id="metadata-tab" role="tabpanel">
              ${tabContents.metadata.content}
            </div>
          </div>
        </div>

        <!-- Scripts -->
        <script src="${cytoscapeUri}"></script>
        <script src="${dagreUri}"></script>
        <script src="${cytoscapeDagreUri}"></script>
        <script src="${graphControlsUri}"></script>
        
        <script>
          const vscode = acquireVsCodeApi();
          let enhancedGraphControls = null;
          let currentTab = 'overview';
          
          // Analysis data
          const analysisData = ${JSON.stringify(analysisData)};
          const graphData = ${JSON.stringify(graphData)};
          
          // Tab state management
          const tabState = {
            activeTab: 'overview',
            tabData: {},
            loading: {},
            errors: {}
          };

          // Initialize when DOM is ready
          document.addEventListener('DOMContentLoaded', function() {
            initializeTabbedInterface();
          });
          
          function initializeTabbedInterface() {
            try {
              // Initialize tab navigation
              initializeTabNavigation();
              
              // Load initial tab content
              loadTabContent('overview');
              
              // Initialize graph for code graph tab
              if (graphData.elements && graphData.elements.length > 0) {
                tabState.tabData['code-graph'] = graphData;
              }
              
            } catch (error) {
              console.error('Failed to initialize tabbed interface:', error);
              showTabError('overview', 'Failed to initialize interface');
            }
          }
          
          function initializeTabNavigation() {
            const tabButtons = document.querySelectorAll('.tab-button');
            tabButtons.forEach(button => {
              button.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                switchTab(tabId);
              });
            });
          }
          
          function switchTab(tabId) {
            // Update tab state
            tabState.activeTab = tabId;
            currentTab = tabId;
            
            // Update tab buttons
            document.querySelectorAll('.tab-button').forEach(btn => {
              btn.classList.remove('active');
              btn.setAttribute('aria-selected', 'false');
            });
            
            const activeButton = document.querySelector(\`[data-tab="\${tabId}"]\`);
            if (activeButton) {
              activeButton.classList.add('active');
              activeButton.setAttribute('aria-selected', 'true');
            }
            
            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => {
              content.classList.remove('active');
            });
            
            const activeContent = document.getElementById(\`\${tabId}-tab\`);
            if (activeContent) {
              activeContent.classList.add('active');
            }
            
            // Load tab-specific content
            loadTabContent(tabId);
          }
          
          function loadTabContent(tabId) {
            try {
              switch (tabId) {
                case 'code-graph':
                  loadCodeGraphTab();
                  break;
                case 'tech-stack':
                  // Tech stack content is already rendered
                  break;
                case 'modules':
                  // Modules content is already rendered
                  break;
                case 'functions':
                  // Functions content is already rendered
                  break;
                case 'framework-patterns':
                  // Framework patterns content is already rendered
                  break;
                case 'metadata':
                  // Metadata content is already rendered
                  break;
                default:
                  // Overview and other tabs are already rendered
                  break;
              }
            } catch (error) {
              console.error(\`Failed to load content for tab \${tabId}:\`, error);
              showTabError(tabId, \`Failed to load \${tabId} content\`);
            }
          }
          
          function loadCodeGraphTab() {
            if (tabState.tabData['code-graph'] && !enhancedGraphControls) {
              try {
                const graphContainer = document.getElementById('enhanced-graph');
                if (graphContainer && graphData.elements && graphData.elements.length > 0) {
                  enhancedGraphControls = new EnhancedGraphControls();
                  enhancedGraphControls.initializeEnhancedGraph(
                    graphData.elements,
                    graphData.style,
                    graphData.layout,
                    graphData.state
                  );
                }
              } catch (error) {
                console.error('Failed to initialize graph:', error);
                showTabError('code-graph', 'Failed to load graph visualization');
              }
            }
          }
          
          function showTabError(tabId, message) {
            const tabContent = document.getElementById(\`\${tabId}-tab\`);
            if (tabContent) {
              tabContent.innerHTML = \`
                <div class="tab-error">
                  <div class="error-icon">⚠️</div>
                  <div class="error-message">\${message}</div>
                  <button onclick="retryTabLoad('\${tabId}')" class="retry-btn">Retry</button>
                </div>
              \`;
            }
          }
          
          function retryTabLoad(tabId) {
            loadTabContent(tabId);
          }
          
          // Graph control functions for code graph tab
          function fitGraph() {
            if (enhancedGraphControls && currentTab === 'code-graph') {
              enhancedGraphControls.fit();
            }
          }
          
          function resetGraph() {
            if (enhancedGraphControls && currentTab === 'code-graph') {
              enhancedGraphControls.reset();
            }
          }
          
          function clearSearch() {
            if (enhancedGraphControls && currentTab === 'code-graph') {
              enhancedGraphControls.clearSearch();
            }
          }
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Generate tab styles
   */
  private generateTabStyles(): string {
    return `
      .analysis-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
      }

      .tab-navigation {
        border-bottom: 1px solid var(--vscode-panel-border);
        background: var(--vscode-tab-activeBackground);
        padding: 0;
        flex-shrink: 0;
      }

      .tab-list {
        display: flex;
        overflow-x: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      .tab-list::-webkit-scrollbar {
        display: none;
      }

      .tab-button {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        border: none;
        background: transparent;
        color: var(--vscode-tab-inactiveForeground);
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 0.2s ease;
        white-space: nowrap;
        position: relative;
        font-size: 13px;
      }

      .tab-button:hover {
        background: var(--vscode-tab-hoverBackground);
        color: var(--vscode-tab-activeForeground);
      }

      .tab-button.active {
        background: var(--vscode-tab-activeBackground);
        color: var(--vscode-tab-activeForeground);
        border-bottom-color: var(--vscode-tab-activeBorder);
      }

      .tab-icon {
        font-size: 16px;
      }

      .tab-label {
        font-weight: 500;
      }

      .tab-badge {
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        border-radius: 10px;
        padding: 2px 6px;
        font-size: 11px;
        font-weight: 600;
        min-width: 16px;
        text-align: center;
      }

      .tab-badge.error {
        background: var(--vscode-errorForeground);
        color: white;
      }

      .tab-content-container {
        flex: 1;
        overflow: hidden;
        position: relative;
      }

      .tab-content {
        display: none;
        height: 100%;
        overflow: auto;
        padding: 20px;
      }

      .tab-content.active {
        display: block;
      }

      .tab-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;
        gap: 16px;
      }

      .error-icon {
        font-size: 48px;
        opacity: 0.6;
      }

      .error-message {
        font-size: 16px;
        color: var(--vscode-errorForeground);
      }

      .retry-btn {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
      }

      .retry-btn:hover {
        background: var(--vscode-button-hoverBackground);
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;
        gap: 16px;
        opacity: 0.7;
      }

      .empty-icon {
        font-size: 64px;
        opacity: 0.5;
      }

      .empty-title {
        font-size: 18px;
        font-weight: 600;
        margin: 0;
      }

      .empty-description {
        font-size: 14px;
        color: var(--vscode-descriptionForeground);
        margin: 0;
      }

      .section {
        margin-bottom: 24px;
      }

      .section-title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 12px;
        color: var(--vscode-editor-foreground);
      }

      .metric-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 20px;
      }

      .metric-card {
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border);
        border-radius: 6px;
        padding: 16px;
      }

      .metric-label {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }

      .metric-value {
        font-size: 24px;
        font-weight: 700;
        color: var(--vscode-editor-foreground);
      }

      .tech-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
      }

      .tech-section {
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border);
        border-radius: 6px;
        padding: 16px;
      }

      .tech-section h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--vscode-editor-foreground);
      }

      .tech-items {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .tech-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid var(--vscode-panel-border);
      }

      .tech-item:last-child {
        border-bottom: none;
      }

      .tech-name {
        font-weight: 500;
      }

      .tech-count, .tech-version {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }

      .module-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .module-item {
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border);
        border-radius: 6px;
        padding: 16px;
        border-left: 4px solid var(--vscode-input-border);
      }

      .module-item.complexity-low {
        border-left-color: #28a745;
      }

      .module-item.complexity-medium {
        border-left-color: #ffc107;
      }

      .module-item.complexity-high {
        border-left-color: #dc3545;
      }

      .module-name {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 4px;
      }

      .module-path {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 8px;
      }

      .module-complexity {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .complexity-label {
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 3px;
        text-transform: uppercase;
        font-weight: 600;
      }

      .complexity-label {
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
      }

      .complexity-score {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }

      .function-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .function-item {
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border);
        border-radius: 4px;
        padding: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .function-info {
        flex: 1;
      }

      .function-name {
        font-weight: 500;
        font-size: 13px;
      }

      .function-location {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        margin-top: 2px;
      }

      .function-metrics {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .metadata-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
      }

      .metadata-section {
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border);
        border-radius: 6px;
        padding: 16px;
      }

      .metadata-section h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: 600;
      }

      .metadata-item {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        border-bottom: 1px solid var(--vscode-panel-border);
      }

      .metadata-item:last-child {
        border-bottom: none;
      }

      .metadata-label {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }

      .metadata-value {
        font-size: 12px;
        font-weight: 500;
      }

      .error-list, .warning-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .error-item, .warning-item {
        padding: 12px;
        border-radius: 4px;
        font-size: 13px;
      }

      .error-item {
        background: rgba(244, 67, 54, 0.1);
        border-left: 4px solid #f44336;
        color: var(--vscode-errorForeground);
      }

      .warning-item {
        background: rgba(255, 193, 7, 0.1);
        border-left: 4px solid #ffc107;
        color: var(--vscode-warningForeground);
      }

      .json-viewer {
        background: var(--vscode-textCodeBlock-background);
        border: 1px solid var(--vscode-input-border);
        border-radius: 4px;
        padding: 16px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 12px;
        overflow: auto;
        max-height: 600px;
        white-space: pre-wrap;
        word-wrap: break-word;
      }

      /* Graph specific styles for code graph tab */
      .graph-container {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .graph-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: var(--vscode-input-background);
        border-bottom: 1px solid var(--vscode-input-border);
        gap: 12px;
        flex-wrap: wrap;
      }

      .toolbar-section {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .toolbar-btn {
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .toolbar-btn:hover {
        background: var(--vscode-button-secondaryHoverBackground);
      }

      .search-input, .layout-select, .filter-select {
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border);
        border-radius: 4px;
        padding: 6px 8px;
        font-size: 12px;
      }

      .graph-viewport {
        flex: 1;
        position: relative;
        overflow: hidden;
      }

      #enhanced-graph {
        width: 100%;
        height: 100%;
      }

      .graph-loading {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
      }

      .spinner {
        width: 32px;
        height: 32px;
        border: 3px solid var(--vscode-input-border);
        border-top: 3px solid var(--vscode-progressBar-background);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 12px;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
  }

  /**
   * Generate all tab contents
   */
  private generateTabContents(analysisData: any): any {
    return {
      overview: {
        content: this.generateOverviewTab(analysisData),
        available: true
      },
      techStack: {
        content: this.generateTechStackTab(analysisData),
        available: !!(analysisData?.tech_stack),
        count: this.getTechStackCount(analysisData)
      },
      codeGraph: {
        content: this.generateCodeGraphTab(analysisData),
        available: !!(analysisData?.modules),
        count: this.getModuleCount(analysisData)
      },
      modules: {
        content: this.generateModulesTab(analysisData),
        available: !!(analysisData?.modules),
        count: this.getModuleCount(analysisData)
      },
      functions: {
        content: this.generateFunctionsTab(analysisData),
        available: !!(analysisData?.functions && Array.isArray(analysisData.functions) && analysisData.functions.length > 0),
        count: analysisData?.functions ? analysisData.functions.length : 0
      },
      frameworkPatterns: {
        content: this.generateFrameworkPatternsTab(analysisData),
        available: !!(analysisData?.framework_patterns && Array.isArray(analysisData.framework_patterns) && analysisData.framework_patterns.length > 0),
        count: analysisData?.framework_patterns ? analysisData.framework_patterns.length : 0
      },
      metadata: {
        content: this.generateMetadataTab(analysisData),
        available: true,
        hasErrors: !!(analysisData?.errors && analysisData.errors.length > 0),
        hasWarnings: !!(analysisData?.warnings && analysisData.warnings.length > 0)
      }
    };
  }

  /**
   * Generate overview tab content
   */
  private generateOverviewTab(analysisData: any): string {
    const moduleCount = this.getModuleCount(analysisData);
    const techStackCount = this.getTechStackCount(analysisData);
    const totalFiles = this.getTotalFileCount(analysisData);
    const hasErrors = !!(analysisData?.errors && analysisData.errors.length > 0);
    const hasWarnings = !!(analysisData?.warnings && analysisData.warnings.length > 0);

    return `
      <div class="section">
        <h2 class="section-title">Code Analysis Overview</h2>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-label">Total Modules</div>
            <div class="metric-value">${moduleCount}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Total Files</div>
            <div class="metric-value">${totalFiles}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Technologies</div>
            <div class="metric-value">${techStackCount}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Analysis Status</div>
            <div class="metric-value" style="color: ${hasErrors ? 'var(--vscode-errorForeground)' : hasWarnings ? 'var(--vscode-warningForeground)' : '#28a745'}">
              ${hasErrors ? 'Errors' : hasWarnings ? 'Warnings' : 'Success'}
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <h3 class="section-title">Quick Summary</h3>
        <div class="tech-section">
          ${this.generateQuickSummary(analysisData)}
        </div>
      </div>
    `;
  }

  /**
   * Generate tech stack tab content
   */
  private generateTechStackTab(analysisData: any): string {
    if (!analysisData?.tech_stack) {
      return `
        <div class="empty-state">
          <div class="empty-icon">🛠️</div>
          <h3 class="empty-title">No Technology Stack Data</h3>
          <p class="empty-description">Technology stack information is not available for this analysis.</p>
        </div>
      `;
    }

    return `
      <div class="section">
        <h2 class="section-title">Technology Stack Analysis</h2>
        <div class="tech-grid">
          ${this.generateTechStackSummary(analysisData)}
        </div>
      </div>
    `;
  }

  /**
   * Generate code graph tab content
   */
  private generateCodeGraphTab(analysisData: any): string {
    if (!analysisData?.modules) {
      return `
        <div class="empty-state">
          <div class="empty-icon">🕸️</div>
          <h3 class="empty-title">No Graph Data</h3>
          <p class="empty-description">Module relationship data is not available for visualization.</p>
        </div>
      `;
    }

    return `
      <div class="graph-container">
        <div class="graph-toolbar">
          <div class="toolbar-section">
            <button class="toolbar-btn" onclick="fitGraph()">
              <span class="icon">🔍</span> Fit
            </button>
            <button class="toolbar-btn" onclick="resetGraph()">
              <span class="icon">🔄</span> Reset
            </button>
          </div>
          
          <div class="toolbar-section">
            <input type="text" id="graph-search" class="search-input" placeholder="Search modules, files..." />
            <button class="toolbar-btn" onclick="clearSearch()">
              <span class="icon">✖</span>
            </button>
          </div>
          
          <div class="toolbar-section">
            <select id="layout-algorithm" class="layout-select">
              <option value="dagre">Hierarchical</option>
              <option value="cose">Force-directed</option>
              <option value="circle">Circle</option>
              <option value="grid">Grid</option>
            </select>
            
            <select id="complexity-filter" class="filter-select">
              <option value="all">All Complexity</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div class="graph-viewport">
          <div id="enhanced-graph"></div>
          
          <div id="graph-loading" class="graph-loading">
            <div class="spinner"></div>
            <p>Loading code graph...</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate modules tab content
   */
  private generateModulesTab(analysisData: any): string {
    if (!analysisData?.modules) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📁</div>
          <h3 class="empty-title">No Module Data</h3>
          <p class="empty-description">Module information is not available for this analysis.</p>
        </div>
      `;
    }

    return `
      <div class="section">
        <h2 class="section-title">Module Analysis</h2>
        ${this.generateModuleOverview(analysisData)}
      </div>
    `;
  }

  /**
   * Generate functions tab content
   */
  private generateFunctionsTab(analysisData: any): string {
    if (!analysisData?.functions || !Array.isArray(analysisData.functions) || analysisData.functions.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">⚡</div>
          <h3 class="empty-title">No Function Data</h3>
          <p class="empty-description">Function-level analysis data is not available.</p>
        </div>
      `;
    }

    let html = `
      <div class="section">
        <h2 class="section-title">Function Analysis</h2>
        <div class="function-list">
    `;

    analysisData.functions.forEach((func: any) => {
      const complexity = func?.complexity || { level: 'unknown', score: 0 };
      html += `
        <div class="function-item">
          <div class="function-info">
            <div class="function-name">${func?.name || 'Unknown Function'}</div>
            <div class="function-location">${func?.file || 'Unknown File'}:${func?.line || '?'}</div>
          </div>
          <div class="function-metrics">
            <span class="complexity-label">${complexity.level}</span>
            <span class="complexity-score">${complexity.score?.toFixed(1) || 'N/A'}</span>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Generate framework patterns tab content
   */
  private generateFrameworkPatternsTab(analysisData: any): string {
    if (!analysisData?.framework_patterns || !Array.isArray(analysisData.framework_patterns) || analysisData.framework_patterns.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">🏗️</div>
          <h3 class="empty-title">No Framework Patterns</h3>
          <p class="empty-description">No framework patterns were detected in this codebase.</p>
        </div>
      `;
    }

    let html = `
      <div class="section">
        <h2 class="section-title">Framework Patterns</h2>
        <div class="tech-grid">
    `;

    analysisData.framework_patterns.forEach((pattern: any) => {
      html += `
        <div class="tech-section">
          <h4>${pattern?.name || 'Unknown Pattern'}</h4>
          <div class="tech-items">
            <div class="tech-item">
              <span class="tech-name">Confidence</span>
              <span class="tech-version">${pattern?.confidence || 'Unknown'}%</span>
            </div>
            ${pattern?.description ? `
            <div class="tech-item">
              <span class="tech-name">Description</span>
              <span class="tech-version">${pattern.description}</span>
            </div>
            ` : ''}
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Generate metadata tab content
   */
  private generateMetadataTab(analysisData: any): string {
    const metadata = analysisData?.metadata || {};
    const errors = analysisData?.errors || [];
    const warnings = analysisData?.warnings || [];

    let html = `
      <div class="section">
        <h2 class="section-title">Analysis Metadata</h2>
        <div class="metadata-grid">
          <div class="metadata-section">
            <h4>Analysis Statistics</h4>
            <div class="metadata-item">
              <span class="metadata-label">Analysis Time</span>
              <span class="metadata-value">${metadata?.analysis_time || 'Unknown'}s</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Total Files</span>
              <span class="metadata-value">${metadata?.total_files || 'Unknown'}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Total Lines</span>
              <span class="metadata-value">${metadata?.total_lines || 'Unknown'}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Schema Version</span>
              <span class="metadata-value">${metadata?.schema_version || 'Unknown'}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    if (errors.length > 0) {
      html += `
        <div class="section">
          <h3 class="section-title">Errors (${errors.length})</h3>
          <div class="error-list">
      `;
      errors.forEach((error: string) => {
        html += `<div class="error-item">${error}</div>`;
      });
      html += `
          </div>
        </div>
      `;
    }

    if (warnings.length > 0) {
      html += `
        <div class="section">
          <h3 class="section-title">Warnings (${warnings.length})</h3>
          <div class="warning-list">
      `;
      warnings.forEach((warning: string) => {
        html += `<div class="warning-item">${warning}</div>`;
      });
      html += `
          </div>
        </div>
      `;
    }

    html += `
      <div class="section">
        <h3 class="section-title">Raw Response Data</h3>
        <div class="json-viewer">${JSON.stringify(analysisData, null, 2)}</div>
      </div>
    `;

    return html;
  }

  /**
   * Generate quick summary for overview tab
   */
  private generateQuickSummary(analysisData: any): string {
    let summary = '<div class="tech-items">';
    
    if (analysisData?.tech_stack?.languages) {
      const languages = Object.keys(analysisData.tech_stack.languages);
      summary += `
        <div class="tech-item">
          <span class="tech-name">Primary Languages</span>
          <span class="tech-version">${languages.slice(0, 3).join(', ')}</span>
        </div>
      `;
    }

    if (analysisData?.modules) {
      const moduleCount = this.getModuleCount(analysisData);
      summary += `
        <div class="tech-item">
          <span class="tech-name">Code Organization</span>
          <span class="tech-version">${moduleCount} modules analyzed</span>
        </div>
      `;
    }

    if (analysisData?.tech_stack?.frameworks && analysisData.tech_stack.frameworks.length > 0) {
      const framework = analysisData.tech_stack.frameworks[0];
      summary += `
        <div class="tech-item">
          <span class="tech-name">Primary Framework</span>
          <span class="tech-version">${framework?.name || 'Unknown'}</span>
        </div>
      `;
    }

    summary += '</div>';
    return summary;
  }

  /**
   * Get tech stack count
   */
  private getTechStackCount(analysisData: any): number {
    let count = 0;
    if (analysisData?.tech_stack?.languages) {
      count += Object.keys(analysisData.tech_stack.languages).length;
    }
    if (analysisData?.tech_stack?.frameworks) {
      count += analysisData.tech_stack.frameworks.length;
    }
    return count;
  }

  /**
   * Get module count
   */
  private getModuleCount(analysisData: any): number {
    if (!analysisData?.modules) {return 0;}
    
    if (Array.isArray(analysisData.modules)) {
      return analysisData.modules.length;
    }
    
    if (analysisData.modules.nodes && Array.isArray(analysisData.modules.nodes)) {
      return analysisData.modules.nodes.length;
    }
    
    if (typeof analysisData.modules === 'object') {
      return Object.keys(analysisData.modules).length;
    }
    
    return 0;
  }

  /**
   * Get total file count
   */
  private getTotalFileCount(analysisData: any): number {
    if (analysisData?.metadata?.total_files) {
      return analysisData.metadata.total_files;
    }
    
    // Fallback calculation
    let totalFiles = 0;
    if (analysisData?.modules) {
      if (Array.isArray(analysisData.modules)) {
        totalFiles = analysisData.modules.reduce((sum: number, mod: any) => {
          return sum + (Array.isArray(mod?.files) ? mod.files.length : 0);
        }, 0);
      } else if (analysisData.modules.nodes && Array.isArray(analysisData.modules.nodes)) {
        totalFiles = analysisData.modules.nodes.reduce((sum: number, mod: any) => {
          return sum + (Array.isArray(mod?.files) ? mod.files.length : 0);
        }, 0);
      }
    }
    
    return totalFiles;
  }

  /**
   * Generate tech stack summary HTML
   */
  private generateTechStackSummary(analysisData: any): string {
    if (!analysisData?.tech_stack) {
      return "<p>No technology stack information available.</p>";
    }

    const techStack = analysisData.tech_stack;
    let html = "";

    // Languages with safe navigation
    if (
      techStack?.languages &&
      typeof techStack.languages === "object" &&
      Object.keys(techStack.languages).length > 0
    ) {
      html += '<div class="tech-section">';
      html += "<h4>Languages</h4>";
      html += '<div class="tech-items">';

      try {
        Object.entries(techStack.languages).forEach(
          ([lang, count]: [string, any]) => {
            html += `<div class="tech-item">
            <span class="tech-name">${lang || "Unknown"}</span>
            <span class="tech-count">${count || 0} files</span>
          </div>`;
          }
        );
      } catch (error) {
        this.errorHandler.logError(
          "Error processing languages in tech stack",
          error,
          "FullCodeAnalysisWebview"
        );
        html += "<p>Error processing language data.</p>";
      }

      html += "</div></div>";
    }

    // Frameworks with safe navigation
    if (
      techStack?.frameworks &&
      Array.isArray(techStack.frameworks) &&
      techStack.frameworks.length > 0
    ) {
      html += '<div class="tech-section">';
      html += "<h4>Frameworks</h4>";
      html += '<div class="tech-items">';

      try {
        techStack.frameworks.forEach((framework: any) => {
          html += `<div class="tech-item">
            <span class="tech-name">${
              framework?.name || "Unknown Framework"
            }</span>
            <span class="tech-version">${framework?.version || "Unknown"}</span>
          </div>`;
        });
      } catch (error) {
        this.errorHandler.logError(
          "Error processing frameworks in tech stack",
          error,
          "FullCodeAnalysisWebview"
        );
        html += "<p>Error processing framework data.</p>";
      }

      html += "</div></div>";
    }

    // Dependencies with safe navigation
    if (
      techStack?.dependencies &&
      typeof techStack.dependencies === "object" &&
      Object.keys(techStack.dependencies).length > 0
    ) {
      html += '<div class="tech-section">';
      html += "<h4>Key Dependencies</h4>";
      html += '<div class="tech-items">';

      try {
        Object.entries(techStack.dependencies)
          .slice(0, 10)
          .forEach(([dep, version]: [string, any]) => {
            html += `<div class="tech-item">
            <span class="tech-name">${dep || "Unknown Dependency"}</span>
            <span class="tech-version">${version || "Unknown"}</span>
          </div>`;
          });
      } catch (error) {
        this.errorHandler.logError(
          "Error processing dependencies in tech stack",
          error,
          "FullCodeAnalysisWebview"
        );
        html += "<p>Error processing dependency data.</p>";
      }

      html += "</div></div>";
    }

    return html || "<p>No technology stack data could be processed.</p>";
  }

  /**
   * Generate module overview HTML
   */
  private generateModuleOverview(analysisData: any): string {
    if (!analysisData || !analysisData.modules) {
      return "<p>No module information available.</p>";
    }

    // Convert modules to array format for consistent processing
    let modulesArray: any[] = [];

    if (Array.isArray(analysisData.modules)) {
      modulesArray = analysisData.modules;
    } else if (
      typeof analysisData.modules === "object" &&
      analysisData.modules !== null
    ) {
      // Check if this is the new structure with nodes/edges
      if (analysisData.modules.nodes && Array.isArray(analysisData.modules.nodes)) {
        // Use the nodes array from the new structure
        modulesArray = analysisData.modules.nodes;
      } else {
        // Fallback: convert object to array of values
        try {
          modulesArray = Object.values(analysisData.modules);
        } catch (error) {
          this.errorHandler.logError(
            "Failed to convert modules object to array in generateModuleOverview",
            error,
            "FullCodeAnalysisWebview"
          );
          return "<p>Error processing module data.</p>";
        }
      }
    } else {
      return "<p>Invalid module data format.</p>";
    }

    if (modulesArray.length === 0) {
      return "<p>No modules found.</p>";
    }

    let html = "";

    html += '<div class="module-stats">';
    html += `<div class="stat-item">
      <span class="stat-label">Total Modules:</span>
      <span class="stat-value">${modulesArray.length}</span>
    </div>`;

    // Safe calculation of total files
    const totalFiles = modulesArray.reduce((sum: number, mod: any) => {
      const fileCount = Array.isArray(mod?.files) ? mod.files.length : 0;
      return sum + fileCount;
    }, 0);

    html += `<div class="stat-item">
      <span class="stat-label">Total Files:</span>
      <span class="stat-value">${totalFiles}</span>
    </div>`;

    html += "</div>";

    // Top modules by complexity with safe navigation
    const sortedModules = modulesArray
      .filter((mod: any) => mod?.complexity_metrics?.overall_complexity)
      .sort((a: any, b: any) => {
        const scoreA = a?.complexity_metrics?.overall_complexity?.score || 0;
        const scoreB = b?.complexity_metrics?.overall_complexity?.score || 0;
        return scoreB - scoreA;
      })
      .slice(0, 10);

    if (sortedModules.length > 0) {
      html += '<div class="module-list">';
      html += "<h4>Top Modules by Complexity</h4>";

      sortedModules.forEach((module: any) => {
        const complexity = module?.complexity_metrics?.overall_complexity || {
          level: "unknown",
          score: 0,
        };
        const moduleName = module?.name || "Unknown Module";
        const modulePath = module?.path || "";

        html += `<div class="module-item complexity-${
          complexity.level || "unknown"
        }">
          <div class="module-name">${moduleName}</div>
          <div class="module-path">${modulePath}</div>
          <div class="module-complexity">
            <span class="complexity-label">${
              complexity.level || "unknown"
            }</span>
            <span class="complexity-score">${
              complexity.score?.toFixed(1) || "N/A"
            }</span>
          </div>
        </div>`;
      });

      html += "</div>";
    }

    return html;
  }

  /**
   * Prepare graph data for visualization
   */
  private prepareGraphData(analysisData: any): any {
    const elements: any[] = [];
    const nodeIds = new Set<string>();

    // Validate analysis data exists
    if (!analysisData) {
      this.errorHandler.logError(
        "No analysis data provided to prepareGraphData",
        null,
        "FullCodeAnalysisWebview"
      );
      return { elements: [], style: [], layout: { name: "dagre" }, state: {} };
    }

    // Log actual data structure for debugging
    this.errorHandler.logError(
      "Analysis data structure received",
      {
        hasModules: "modules" in analysisData,
        modulesType: typeof analysisData.modules,
        modulesIsArray: Array.isArray(analysisData.modules),
        modulesKeys: analysisData.modules
          ? Object.keys(analysisData.modules)
          : null,
        sampleData: analysisData.modules
          ? JSON.stringify(analysisData.modules).substring(0, 200) + "..."
          : null,
      },
      "FullCodeAnalysisWebview"
    );

    // Handle missing or invalid modules data
    if (!analysisData.modules) {
      this.errorHandler.logError(
        "No modules data found in analysis result",
        null,
        "FullCodeAnalysisWebview"
      );
      return { elements: [], style: [], layout: { name: "dagre" }, state: {} };
    }

    // Handle the new backend response structure where modules contains nodes and edges
    let modulesArray: any[] = [];

    if (Array.isArray(analysisData.modules)) {
      // Already an array, use as-is
      modulesArray = analysisData.modules;
    } else if (
      typeof analysisData.modules === "object" &&
      analysisData.modules !== null
    ) {
      // Check if this is the new structure with nodes/edges
      if (analysisData.modules.nodes && Array.isArray(analysisData.modules.nodes)) {
        // Use the nodes array from the new structure
        modulesArray = analysisData.modules.nodes;
        this.errorHandler.logError(
          "Using nodes array from new modules structure",
          {
            nodesLength: analysisData.modules.nodes.length,
            hasEdges: "edges" in analysisData.modules,
            edgesLength: analysisData.modules.edges ? analysisData.modules.edges.length : 0,
          },
          "FullCodeAnalysisWebview"
        );
      } else {
        // Fallback: convert object to array of values
        try {
          modulesArray = Object.values(analysisData.modules);
          this.errorHandler.logError(
            "Converted modules object to array",
            {
              originalType: "object",
              convertedLength: modulesArray.length,
            },
            "FullCodeAnalysisWebview"
          );
        } catch (error) {
          this.errorHandler.logError(
            "Failed to convert modules object to array",
            error,
            "FullCodeAnalysisWebview"
          );
          return {
            elements: [],
            style: [],
            layout: { name: "dagre" },
            state: {},
          };
        }
      }
    } else {
      // Invalid modules data type
      this.errorHandler.logError(
        "Invalid modules data type",
        {
          type: typeof analysisData.modules,
          value: analysisData.modules,
        },
        "FullCodeAnalysisWebview"
      );
      return { elements: [], style: [], layout: { name: "dagre" }, state: {} };
    }

    // Validate we have modules to process
    if (modulesArray.length === 0) {
      this.errorHandler.logError(
        "No modules found after conversion",
        null,
        "FullCodeAnalysisWebview"
      );
      return { elements: [], style: [], layout: { name: "dagre" }, state: {} };
    }

    // Add module nodes
    modulesArray.forEach((module: any, index: number) => {
      try {
        // Safe navigation for module properties
        const moduleName = module?.name || `module_${index}`;
        const moduleId = `module_${moduleName}`;

        if (!nodeIds.has(moduleId)) {
          nodeIds.add(moduleId);

          // Safe access to complexity metrics
          const complexity = module?.complexity_metrics?.overall_complexity || {
            level: "unknown",
            score: 0,
          };

          elements.push({
            data: {
              id: moduleId,
              label: moduleName,
              type: "module",
              path: module?.path || "",
              complexity: complexity,
              fileCount: Array.isArray(module?.files) ? module.files.length : 0,
            },
            classes: `module-node complexity-${complexity.level || "unknown"}`,
          });
        }

        // Add file nodes with safe navigation
        if (module?.files && Array.isArray(module.files)) {
          module.files.forEach((file: any, fileIndex: number) => {
            try {
              // Safe navigation for file properties
              const filePath = file?.path || `unknown_file_${fileIndex}`;
              const fileId = `file_${filePath}`;

              if (!nodeIds.has(fileId)) {
                nodeIds.add(fileId);

                const fileComplexity = file?.complexity_metrics || {
                  level: "unknown",
                  score: 0,
                };

                elements.push({
                  data: {
                    id: fileId,
                    label: filePath
                      ? path.basename(filePath)
                      : `file_${fileIndex}`,
                    type: "file",
                    path: filePath,
                    module: moduleName,
                    language: file?.language || "unknown",
                    complexity: fileComplexity,
                  },
                  classes: `file-node complexity-${
                    fileComplexity.level || "unknown"
                  }`,
                });

                // Add edge from module to file
                elements.push({
                  data: {
                    id: `${moduleId}_${fileId}`,
                    source: moduleId,
                    target: fileId,
                    type: "contains",
                  },
                  classes: "contains-edge",
                });
              }
            } catch (fileError) {
              this.errorHandler.logError(
                `Error processing file at index ${fileIndex} in module ${moduleName}`,
                fileError,
                "FullCodeAnalysisWebview"
              );
            }
          });
        } else if (module?.files && !Array.isArray(module.files)) {
          // Handle case where files might be an object instead of array
          this.errorHandler.logError(
            "Module files is not an array",
            {
              moduleName,
              filesType: typeof module.files,
              filesValue: module.files,
            },
            "FullCodeAnalysisWebview"
          );
        }
      } catch (moduleError) {
        this.errorHandler.logError(
          `Error processing module at index ${index}`,
          moduleError,
          "FullCodeAnalysisWebview"
        );
      }
    });

    // Add dependency edges with safe navigation
    // First check for edges in the new modules structure
    let edgesArray: any[] = [];
    
    if (
      analysisData?.modules?.edges &&
      Array.isArray(analysisData.modules.edges)
    ) {
      edgesArray = analysisData.modules.edges;
      this.errorHandler.logError(
        "Using edges from new modules structure",
        {
          edgesLength: edgesArray.length,
        },
        "FullCodeAnalysisWebview"
      );
    } else if (
      analysisData?.dependencies &&
      Array.isArray(analysisData.dependencies)
    ) {
      edgesArray = analysisData.dependencies;
    }

    if (edgesArray.length > 0) {
      edgesArray.forEach((dep: any, index: number) => {
        try {
          // Safe navigation for dependency properties
          const sourceId = `file_${dep?.from || dep?.source || ""}`;
          const targetId = `file_${dep?.to || dep?.target || ""}`;

          if (
            (dep?.from || dep?.source) &&
            (dep?.to || dep?.target) &&
            nodeIds.has(sourceId) &&
            nodeIds.has(targetId)
          ) {
            elements.push({
              data: {
                id: `dep_${index}`,
                source: sourceId,
                target: targetId,
                type: "dependency",
                dependencyType: dep?.type || "import",
              },
              classes: `dependency-edge ${dep?.type || "import"}`,
            });
          }
        } catch (depError) {
          this.errorHandler.logError(
            `Error processing dependency at index ${index}`,
            depError,
            "FullCodeAnalysisWebview"
          );
        }
      });
    } else if (
      analysisData?.dependencies &&
      !Array.isArray(analysisData.dependencies)
    ) {
      // Handle case where dependencies might be an object instead of array
      this.errorHandler.logError(
        "Dependencies is not an array",
        {
          dependenciesType: typeof analysisData.dependencies,
          dependenciesValue: analysisData.dependencies,
        },
        "FullCodeAnalysisWebview"
      );
    }

    return {
      elements,
      style: this.getGraphStyle(),
      layout: { name: "dagre", rankDir: "TB", nodeSep: 50, rankSep: 75 },
      state: {},
    };
  }

  /**
   * Get Cytoscape style configuration
   */
  private getGraphStyle(): any[] {
    return [
      // Module nodes
      {
        selector: ".module-node",
        style: {
          "background-color": "#3498db",
          "border-color": "#2980b9",
          "border-width": 2,
          label: "data(label)",
          "text-valign": "center",
          "text-halign": "center",
          color: "#ffffff",
          "font-size": "12px",
          "font-weight": "bold",
          width: 80,
          height: 40,
          shape: "round-rectangle",
        },
      },

      // File nodes
      {
        selector: ".file-node",
        style: {
          "background-color": "#95a5a6",
          "border-color": "#7f8c8d",
          "border-width": 1,
          label: "data(label)",
          "text-valign": "center",
          "text-halign": "center",
          color: "#ffffff",
          "font-size": "10px",
          width: 60,
          height: 30,
          shape: "ellipse",
        },
      },

      // Complexity colors
      {
        selector: ".complexity-low",
        style: {
          "background-color": "#27ae60",
          "border-color": "#229954",
        },
      },
      {
        selector: ".complexity-medium",
        style: {
          "background-color": "#f39c12",
          "border-color": "#e67e22",
        },
      },
      {
        selector: ".complexity-high",
        style: {
          "background-color": "#e74c3c",
          "border-color": "#c0392b",
        },
      },

      // Edges
      {
        selector: ".contains-edge",
        style: {
          width: 2,
          "line-color": "#bdc3c7",
          "target-arrow-color": "#bdc3c7",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
        },
      },
      {
        selector: ".dependency-edge",
        style: {
          width: 1,
          "line-color": "#9b59b6",
          "target-arrow-color": "#9b59b6",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          "line-style": "dashed",
        },
      },
    ];
  }

  /**
   * Handle messages from webview
   */
  private handleWebviewMessage(message: any): void {
    switch (message.command) {
      case "requestAnalysis":
        vscode.commands.executeCommand("doracodebirdview.analyzeFullCode");
        break;
      case "retryAnalysis":
        if (this.currentData) {
          this.updateContent(this.currentData);
        } else {
          vscode.commands.executeCommand("doracodebirdview.analyzeFullCode");
        }
        break;
      case "graphInteraction":
        this.handleGraphInteraction(message.interaction);
        break;
      default:
        this.errorHandler.logError(
          "Unknown webview message",
          message,
          "FullCodeAnalysisWebview"
        );
    }
  }

  /**
   * Handle graph interaction events
   */
  private handleGraphInteraction(interaction: any): void {
    switch (interaction.type) {
      case "node-click":
        if (interaction.data?.type === "file") {
          // Open file in editor
          const filePath = interaction.data.path;
          if (filePath) {
            vscode.workspace.openTextDocument(filePath).then((doc) => {
              vscode.window.showTextDocument(doc);
            });
          }
        }
        break;
      default:
        // Log other interactions for debugging
        this.errorHandler.logError(
          "Graph interaction",
          interaction,
          "FullCodeAnalysisWebview"
        );
    }
  }

  /**
   * Generate error HTML content
   */
  private generateErrorHTML(message: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Full Code Analysis - Error</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
          .error-container {
            text-align: center;
            padding: 40px;
            border: 1px solid var(--vscode-errorForeground);
            border-radius: 8px;
            background-color: var(--vscode-inputValidation-errorBackground);
          }
          .error-icon {
            font-size: 48px;
            color: var(--vscode-errorForeground);
            margin-bottom: 20px;
          }
          .error-message {
            font-size: 16px;
            margin-bottom: 20px;
          }
          .retry-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
          }
          .retry-button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <div class="error-icon">⚠️</div>
          <div class="error-message">${message}</div>
          <button class="retry-button" onclick="retryAnalysis()">Retry Analysis</button>
        </div>
        <script>
          const vscode = acquireVsCodeApi();
          function retryAnalysis() {
            vscode.postMessage({ command: 'retryAnalysis' });
          }
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Show error in webview
   */
  private showError(message: string): void {
    if (!this.panel) {return;}

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Error</title>
        <style>
          body { 
            font-family: var(--vscode-font-family); 
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .error { text-align: center; }
          .error h3 { color: var(--vscode-errorForeground); }
        </style>
      </head>
      <body>
        <div class="error">
          <h3>Error</h3>
          <p>${message}</p>
          <button onclick="location.reload()">Retry</button>
        </div>
      </body>
      </html>
    `;

    this.panel.webview.html = html;
  }

  /**
   * Dispose of the webview
   */
  public dispose(): void {
    if (this.panel) {
      this.panel.dispose();
      this.panel = null;
    }
  }

  /**
   * Check if webview is visible
   */
  public isVisible(): boolean {
    return this.panel !== null && this.panel.visible;
  }
}
