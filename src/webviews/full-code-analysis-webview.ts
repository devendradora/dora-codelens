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
    if (!this.panel) {
      return;
    }

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
      analysisData,
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
          ${this.generateHyperlinkTabStyles()}
        </style>
      </head>
      <body>
        <div class="analysis-container">
          <!-- Navigation Links -->
          <div class="navigation-bar">
            <div class="nav-links">
              <a href="#tech-stack-section" class="nav-link">
                <span class="nav-icon">🛠️</span>
                <span class="nav-label">Tech Stack</span>
                ${
                  tabContents.techStack.available
                    ? '<span class="nav-badge">' +
                      tabContents.techStack.count +
                      "</span>"
                    : ""
                }
              </a>
              <a href="#code-graph-section" class="nav-link">
                <span class="nav-icon">🕸️</span>
                <span class="nav-label">Code Graph</span>
                ${
                  tabContents.codeGraph.available
                    ? '<span class="nav-badge">' +
                      tabContents.codeGraph.count +
                      "</span>"
                    : ""
                }
              </a>
              <a href="#code-graph-json-section" class="nav-link">
                <span class="nav-icon">📄</span>
                <span class="nav-label">Code Graph JSON</span>
              </a>
            </div>
          </div>

          <!-- Scrollable Content -->
          <div class="scrollable-content">
            <!-- Tech Stack Section -->
            <section id="tech-stack-section" class="content-section">
              <div class="section-header">
                <h2>🛠️ Tech Stack Analysis</h2>
                <div class="debug-panel">
                  <strong>DEBUG: Tech Stack Section</strong><br>
                  Available: ${tabContents.techStack.available}<br>
                  Count: ${tabContents.techStack.count}<br>
                  Content Length: ${tabContents.techStack.content.length}<br>
                  Last Updated: ${new Date().toLocaleTimeString()}<br>
                  Content Preview: ${tabContents.techStack.content
                    .substring(0, 100)
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")}...
                </div>
              </div>
              <div class="section-content">
                ${tabContents.techStack.content}
              </div>
            </section>

            <!-- Code Graph Section -->
            <section id="code-graph-section" class="content-section">
              <div class="section-header">
                <h2>🕸️ Code Graph Visualization</h2>
                <div class="debug-panel">
                  <strong>DEBUG: Code Graph Section</strong><br>
                  Available: ${tabContents.codeGraph.available}<br>
                  Count: ${tabContents.codeGraph.count}<br>
                  Content Length: ${tabContents.codeGraph.content.length}<br>
                  Graph Elements: ${
                    graphData.elements ? graphData.elements.length : "undefined"
                  }<br>
                  Last Updated: ${new Date().toLocaleTimeString()}<br>
                  Content Preview: ${tabContents.codeGraph.content
                    .substring(0, 100)
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")}...
                </div>
              </div>
              <div class="section-content">
                ${tabContents.codeGraph.content}
              </div>
            </section>

            <!-- Code Graph JSON Section -->
            <section id="code-graph-json-section" class="content-section">
              <div class="section-header">
                <h2>📄 Code Graph JSON Data</h2>
                <div class="debug-panel">
                  <strong>DEBUG: Code Graph JSON Section</strong><br>
                  Available: ${tabContents.codeGraphJson.available}<br>
                  Count: ${tabContents.codeGraphJson.count || 0}<br>
                  Content Length: ${
                    tabContents.codeGraphJson.content.length
                  }<br>
                  JSON Data Length: ${
                    analysisData?.code_graph_json?.length || "undefined"
                  }<br>
                  Last Updated: ${new Date().toLocaleTimeString()}<br>
                  Content Preview: ${tabContents.codeGraphJson.content
                    .substring(0, 100)
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")}...
                </div>
              </div>
              <div class="section-content">
                ${tabContents.codeGraphJson.content}
              </div>
            </section>
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
          
          // Analysis data
          const analysisData = ${JSON.stringify(analysisData)};
          const graphData = ${JSON.stringify(graphData)};
          
          // Simple hyperlink-based navigation - no complex state management needed

          // Initialize when DOM is ready
          document.addEventListener('DOMContentLoaded', function() {
            console.log('=== INITIALIZING HYPERLINKED VIEW ===');
            console.log('Analysis data available:', !!analysisData);
            console.log('Graph data available:', !!graphData);
            console.log('Graph elements:', graphData.elements ? graphData.elements.length : 0);
            
            // Initialize code graph if available
            initializeCodeGraph();
            
            console.log('=== HYPERLINKED VIEW INITIALIZED ===');
          });
          

          
          function initializeCodeGraph() {
            try {
              if (graphData.elements && graphData.elements.length > 0) {
                const graphContainer = document.getElementById('enhanced-graph');
                
                if (graphContainer && typeof EnhancedGraphControls !== 'undefined') {
                  enhancedGraphControls = new EnhancedGraphControls();
                  enhancedGraphControls.initializeEnhancedGraph(
                    graphData.elements,
                    graphData.style,
                    graphData.layout,
                    graphData.state
                  );
                  
                  // Hide loading indicator
                  const loadingElement = document.getElementById('graph-loading');
                  if (loadingElement) {
                    loadingElement.style.display = 'none';
                  }
                  
                  console.log('✓ Code graph initialized successfully');
                } else {
                  console.log('Graph container or EnhancedGraphControls not available');
                  showGraphEmptyState();
                }
              } else {
                console.log('No graph elements available');
                showGraphEmptyState();
              }
            } catch (error) {
              console.error('Failed to initialize code graph:', error);
              showGraphEmptyState();
            }
          }
          
          function showGraphEmptyState() {
            const graphContainer = document.getElementById('enhanced-graph');
            if (graphContainer) {
              graphContainer.innerHTML = \`
                <div class="empty-state" style="height: 100%; display: flex; align-items: center; justify-content: center;">
                  <div style="text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🕸️</div>
                    <h3>Code Graph</h3>
                    <p>Graph visualization will appear here when available.</p>
                    <p style="font-size: 12px; color: var(--vscode-descriptionForeground);">
                      Elements: \${graphData.elements ? graphData.elements.length : 0}
                    </p>
                  </div>
                </div>
              \`;
            }
            
            // Hide loading indicator
            const loadingElement = document.getElementById('graph-loading');
            if (loadingElement) {
              loadingElement.style.display = 'none';
            }
          }
          
          // Handle messages from extension
          window.addEventListener('message', function(event) {
            const message = event.data;
            switch (message.command) {
              case 'updateGraph':
                if (enhancedGraphControls) {
                  enhancedGraphControls.updateGraph(message.elements, message.style, message.layout);
                }
                break;
              case 'retryAnalysis':
                vscode.postMessage({ command: 'retryAnalysis' });
                break;
              default:
                console.log('Unknown message:', message);
            }
          });

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
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
        background: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
        line-height: 1.6;
      }

      .navigation-bar {
        border-bottom: 1px solid var(--vscode-panel-border);
        background: var(--vscode-tab-activeBackground);
        padding: 0;
        flex-shrink: 0;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        position: sticky;
        top: 0;
        z-index: 100;
      }

      .nav-links {
        display: flex;
        overflow-x: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
        min-height: 48px;
      }

      .nav-links::-webkit-scrollbar {
        display: none;
      }

      .tab-button {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        border: none;
        background: transparent;
        color: var(--vscode-tab-inactiveForeground);
        cursor: pointer;
        border-bottom: 3px solid transparent;
        transition: all 0.3s ease;
        white-space: nowrap;
        position: relative;
        font-size: 13px;
        font-weight: 500;
        min-width: 120px;
        justify-content: center;
      }

      .tab-button:hover {
        background: var(--vscode-tab-hoverBackground);
        color: var(--vscode-tab-activeForeground);
        transform: translateY(-1px);
      }

      .tab-button.active {
        background: var(--vscode-tab-activeBackground);
        color: var(--vscode-tab-activeForeground);
        border-bottom-color: var(--vscode-focusBorder, #007acc);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      @media (max-width: 768px) {
        .nav-link {
          min-width: 100px;
          padding: 10px 16px;
          font-size: 12px;
        }
        
        .nav-label {
          display: none;
        }
        
        .nav-icon {
          font-size: 18px;
        }
      }

      .nav-icon {
        font-size: 16px;
      }

      .nav-label {
        font-weight: 500;
      }

      .nav-badge {
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
        padding: 24px;
        animation: fadeIn 0.3s ease-in-out;
      }

      .tab-content.active {
        display: block;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
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

      .section-description {
        font-size: 14px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 16px;
        line-height: 1.5;
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
        border-radius: 8px;
        padding: 20px;
        font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Source Code Pro', monospace;
        font-size: 13px;
        line-height: 1.5;
        overflow: auto;
        max-height: 70vh;
        white-space: pre-wrap;
        word-wrap: break-word;
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .json-viewer pre {
        margin: 0;
        padding: 0;
      }

      .json-viewer code {
        font-family: inherit;
        font-size: inherit;
        background: transparent;
        padding: 0;
      }

      /* Graph specific styles for code graph tab */
      .graph-container {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .graph-header {
        padding: 16px 24px;
        background: var(--vscode-tab-activeBackground);
        border-bottom: 1px solid var(--vscode-panel-border);
      }

      .graph-header .section-title {
        margin: 0 0 8px 0;
        font-size: 20px;
        font-weight: 600;
      }

      .graph-header .section-description {
        margin: 0;
        font-size: 14px;
        color: var(--vscode-descriptionForeground);
        line-height: 1.4;
      }

      .graph-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: var(--vscode-input-background);
        border-bottom: 1px solid var(--vscode-input-border);
        gap: 12px;
        flex-wrap: wrap;
        min-height: 48px;
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
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s ease;
        font-weight: 500;
      }

      .toolbar-btn:hover {
        background: var(--vscode-button-secondaryHoverBackground);
        transform: translateY(-1px);
      }

      .toolbar-btn .icon {
        font-size: 14px;
      }

      .search-input, .layout-select, .filter-select {
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border);
        border-radius: 4px;
        padding: 8px 12px;
        font-size: 12px;
        min-width: 120px;
        transition: border-color 0.2s ease;
      }

      .search-input:focus, .layout-select:focus, .filter-select:focus {
        outline: none;
        border-color: var(--vscode-focusBorder);
      }

      .search-input {
        min-width: 200px;
      }

      .graph-viewport {
        flex: 1;
        position: relative;
        overflow: hidden;
        background: var(--vscode-editor-background);
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
        z-index: 10;
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

      .graph-info {
        position: absolute;
        top: 16px;
        right: 16px;
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border);
        border-radius: 8px;
        padding: 12px;
        max-width: 200px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        z-index: 5;
      }

      .info-panel h4 {
        margin: 0 0 8px 0;
        font-size: 12px;
        font-weight: 600;
        color: var(--vscode-editor-foreground);
      }

      .legend-items {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
      }

      .legend-color {
        width: 12px;
        height: 12px;
        border-radius: 2px;
        border: 1px solid var(--vscode-input-border);
      }

      .legend-color.module-color {
        background-color: #3498db;
      }

      .legend-color.file-color {
        background-color: #95a5a6;
      }

      .legend-color.low-complexity {
        background-color: #27ae60;
      }

      .legend-color.medium-complexity {
        background-color: #f39c12;
      }

      .legend-color.high-complexity {
        background-color: #e74c3c;
      }

      .legend-color.folder-color {
        background-color: #f39c12;
      }

      .legend-color.class-color {
        background-color: #e67e22;
      }

      .legend-color.function-color {
        background-color: #27ae60;
      }

      .legend-line {
        width: 20px;
        height: 2px;
        border-radius: 1px;
      }

      .legend-line.call-line {
        background-color: #e74c3c;
      }

      .legend-line.contains-line {
        background-color: #95a5a6;
      }

      /* Mobile responsiveness for graph toolbar */
      @media (max-width: 768px) {
        .graph-toolbar {
          flex-direction: column;
          align-items: stretch;
          gap: 8px;
        }

        .toolbar-section {
          justify-content: center;
          flex-wrap: wrap;
        }

        .search-input {
          min-width: 150px;
        }

        .graph-info {
          position: relative;
          top: auto;
          right: auto;
          margin: 16px;
          max-width: none;
        }
      }

      /* Enhanced Tech Stack Styles */
      .section-subtitle {
        font-size: 16px;
        font-weight: 600;
        margin: 24px 0 16px 0;
        color: var(--vscode-editor-foreground);
        border-bottom: 1px solid var(--vscode-panel-border);
        padding-bottom: 8px;
      }

      .project-stats-section {
        margin-bottom: 32px;
      }

      .project-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-top: 16px;
      }

      .stat-card {
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border);
        border-radius: 8px;
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .stat-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .stat-icon {
        font-size: 32px;
        opacity: 0.8;
      }

      .stat-content {
        flex: 1;
      }

      .stat-label {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        text-transform: uppercase;
        letter-spacing: 0.8px;
        margin-bottom: 4px;
        font-weight: 600;
      }

      .stat-value {
        font-size: 28px;
        font-weight: 700;
        color: var(--vscode-editor-foreground);
        margin-bottom: 4px;
      }

      .stat-description {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        opacity: 0.8;
      }

      .primary-framework-section {
        margin-bottom: 32px;
      }

      .primary-framework-card {
        background: linear-gradient(135deg, var(--vscode-input-background) 0%, var(--vscode-tab-activeBackground) 100%);
        border: 2px solid var(--vscode-focusBorder, #007acc);
        border-radius: 12px;
        padding: 24px;
        display: flex;
        align-items: center;
        gap: 20px;
        margin-top: 16px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      }

      .primary-framework-card.empty {
        border-color: var(--vscode-input-border);
        background: var(--vscode-input-background);
        opacity: 0.7;
      }

      .framework-icon {
        font-size: 48px;
        opacity: 0.9;
      }

      .framework-content {
        flex: 1;
      }

      .framework-name {
        font-size: 24px;
        font-weight: 700;
        color: var(--vscode-editor-foreground);
        margin-bottom: 8px;
      }

      .framework-version {
        font-size: 14px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 4px;
      }

      .framework-confidence {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        opacity: 0.8;
      }

      .tech-stack-details {
        margin-bottom: 32px;
      }

      .tech-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid var(--vscode-panel-border);
        gap: 12px;
      }

      .tech-item:last-child {
        border-bottom: none;
      }

      .tech-name {
        font-weight: 500;
        flex: 1;
      }

      .tech-version {
        font-size: 12px;
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        padding: 2px 8px;
        border-radius: 12px;
        font-weight: 500;
      }

      .tech-type {
        font-size: 10px;
        color: var(--vscode-descriptionForeground);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        opacity: 0.7;
      }

      .tech-confidence {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        background: var(--vscode-input-background);
        padding: 2px 6px;
        border-radius: 8px;
        border: 1px solid var(--vscode-input-border);
      }

      .language-breakdown-section {
        margin-bottom: 32px;
      }

      .language-stats {
        margin-top: 16px;
      }

      .language-item {
        margin-bottom: 16px;
      }

      .language-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .language-name {
        font-weight: 600;
        font-size: 14px;
      }

      .language-stats-text {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }

      .language-progress {
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border);
        border-radius: 8px;
        height: 8px;
        overflow: hidden;
      }

      .language-progress-bar {
        height: 100%;
        transition: width 0.3s ease;
        border-radius: 7px;
      }

      .empty-state-small {
        text-align: center;
        padding: 20px;
        color: var(--vscode-descriptionForeground);
        font-style: italic;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
  }

  /**
   * Generate hyperlink-based tab styles for simple navigation
   */
  private generateHyperlinkTabStyles(): string {
    return `
      /* Navigation Link Styles */
      .nav-link {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        text-decoration: none;
        color: var(--vscode-tab-inactiveForeground);
        border-bottom: 3px solid transparent;
        transition: all 0.3s ease;
        white-space: nowrap;
        position: relative;
        font-size: 13px;
        font-weight: 500;
        min-width: 120px;
        justify-content: center;
        background: transparent;
      }

      .nav-link:hover {
        background: var(--vscode-tab-hoverBackground);
        color: var(--vscode-tab-activeForeground);
        transform: translateY(-1px);
        text-decoration: none;
        border-bottom-color: var(--vscode-focusBorder, #007acc);
      }

      .nav-link:focus {
        outline: 2px solid var(--vscode-focusBorder);
        outline-offset: -2px;
      }

      /* Scrollable content container */
      .scrollable-content {
        flex: 1;
        overflow: auto;
        padding: 0;
      }

      .content-section {
        padding: 24px;
        border-bottom: 2px solid var(--vscode-panel-border);
        scroll-margin-top: 60px; /* Account for sticky navigation */
      }

      .content-section:last-child {
        border-bottom: none;
      }

      .section-header {
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 2px solid var(--vscode-panel-border);
      }

      .section-header h2 {
        margin: 0 0 12px 0;
        font-size: 24px;
        font-weight: 700;
        color: var(--vscode-editor-foreground);
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .section-content {
        animation: fadeIn 0.3s ease-in-out;
      }

      .debug-panel {
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border);
        border-radius: 6px;
        padding: 12px;
        margin: 16px 0;
        font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
        font-size: 11px;
        line-height: 1.4;
        color: var(--vscode-descriptionForeground);
        border-left: 4px solid var(--vscode-focusBorder);
      }

      .debug-panel strong {
        color: var(--vscode-editor-foreground);
        font-weight: 600;
      }

      /* Smooth scrolling for anchor navigation */
      html {
        scroll-behavior: smooth;
      }

      /* Section highlighting when navigated to */
      .content-section:target {
        background: var(--vscode-list-hoverBackground);
        border-radius: 8px;
        margin: 8px;
        padding: 32px;
        animation: highlightSection 2s ease-out;
      }

      @keyframes highlightSection {
        0% {
          background: var(--vscode-list-activeSelectionBackground);
          transform: scale(1.01);
        }
        100% {
          background: var(--vscode-list-hoverBackground);
          transform: scale(1);
        }
      }

      /* Smooth transitions for content switching */
      .content-section {
        transition: opacity 0.3s ease-in-out;
      }

      /* Mobile responsiveness for hyperlink tabs */
      @media (max-width: 768px) {
        .tab-link {
          min-width: 100px;
          padding: 10px 16px;
          font-size: 12px;
        }
        
        .tab-label {
          display: none;
        }
        
        .tab-icon {
          font-size: 18px;
        }

        .content-section {
          padding: 16px;
        }

        .section-header h2 {
          font-size: 20px;
        }
      }

      /* Enhanced visual feedback for active sections */
      .content-section.active[data-tab-type="tech-stack"] .section-header {
        border-bottom-color: #28a745;
      }

      .content-section.active[data-tab-type="code-graph"] .section-header {
        border-bottom-color: #007acc;
      }

      .content-section.active[data-tab-type="code-graph-json"] .section-header {
        border-bottom-color: #6f42c1;
      }
    `;
  }

  /**
   * Generate all tab contents with proper isolation
   */
  private generateTabContents(analysisData: any): any {
    // Debug logging for tab content generation
    this.errorHandler.logError(
      "Generating tab contents",
      {
        hasAnalysisData: !!analysisData,
        hasTechStack: !!analysisData?.tech_stack,
        hasCodeGraphJson: !!(
          analysisData?.code_graph_json &&
          Array.isArray(analysisData.code_graph_json)
        ),
        codeGraphJsonLength: analysisData?.code_graph_json?.length || 0,
        analysisDataKeys: analysisData ? Object.keys(analysisData) : null,
      },
      "FullCodeAnalysisWebview"
    );

    // Check for code graph data
    const hasCodeGraph = !!(
      analysisData?.code_graph_json &&
      Array.isArray(analysisData.code_graph_json) &&
      analysisData.code_graph_json.length > 0
    );

    // Check for tech stack data
    const hasTechStack = !!(
      analysisData?.tech_stack &&
      (analysisData.tech_stack.languages ||
        analysisData.tech_stack.frameworks ||
        analysisData.tech_stack.libraries)
    );

    // Check for code graph JSON data
    const hasCodeGraphJson = !!(analysisData?.code_graph_json !== undefined);

    // Generate individual tab contents with proper isolation
    this.errorHandler.logError(
      "Starting individual tab content generation",
      { timestamp: Date.now() },
      "FullCodeAnalysisWebview"
    );

    const techStackContent = this.generateTechStackTab(analysisData);
    this.errorHandler.logError(
      "Tech Stack content generated",
      {
        length: techStackContent.length,
        preview: techStackContent.substring(0, 150).replace(/\s+/g, " "),
        containsWrapper: techStackContent.includes("tab-content-wrapper"),
        containsTechStack: techStackContent.includes("Technology Stack"),
      },
      "FullCodeAnalysisWebview"
    );

    const codeGraphContent = this.generateCodeGraphTab(analysisData);
    this.errorHandler.logError(
      "Code Graph content generated",
      {
        length: codeGraphContent.length,
        preview: codeGraphContent.substring(0, 150).replace(/\s+/g, " "),
        containsWrapper: codeGraphContent.includes("tab-content-wrapper"),
        containsGraph:
          codeGraphContent.includes("graph-container") ||
          codeGraphContent.includes("Code Graph"),
      },
      "FullCodeAnalysisWebview"
    );

    const codeGraphJsonContent = this.generateCodeGraphJsonTab(analysisData);
    this.errorHandler.logError(
      "Code Graph JSON content generated",
      {
        length: codeGraphJsonContent.length,
        preview: codeGraphJsonContent.substring(0, 150).replace(/\s+/g, " "),
        containsWrapper: codeGraphJsonContent.includes("tab-content-wrapper"),
        containsJson:
          codeGraphJsonContent.includes("json-viewer") ||
          codeGraphJsonContent.includes("JSON Data"),
      },
      "FullCodeAnalysisWebview"
    );

    // Check for content duplication
    const isTechStackSameAsCodeGraph = techStackContent === codeGraphContent;
    const isTechStackSameAsCodeGraphJson =
      techStackContent === codeGraphJsonContent;
    const isCodeGraphSameAsCodeGraphJson =
      codeGraphContent === codeGraphJsonContent;

    // CRITICAL DEBUG: Check if content contains unique markers
    const techStackHasUniqueMarker = techStackContent.includes(
      "UNIQUE MARKER: TECH STACK TAB CONTENT"
    );
    const codeGraphHasUniqueMarker =
      codeGraphContent.includes("UNIQUE MARKER: CODE GRAPH") ||
      codeGraphContent.includes("CODE GRAPH EMPTY STATE");
    const codeGraphJsonHasUniqueMarker = codeGraphJsonContent.includes(
      "UNIQUE MARKER: CODE GRAPH JSON"
    );

    this.errorHandler.logError(
      "CRITICAL DEBUG: Content Unique Markers Check",
      {
        techStackHasUniqueMarker,
        codeGraphHasUniqueMarker,
        codeGraphJsonHasUniqueMarker,
        techStackContentPreview: techStackContent.substring(0, 200),
        codeGraphContentPreview: codeGraphContent.substring(0, 200),
        codeGraphJsonContentPreview: codeGraphJsonContent.substring(0, 200),
      },
      "FullCodeAnalysisWebview"
    );

    // Debug logging for generated content and duplication check
    this.errorHandler.logError(
      "Tab content generation results and duplication check",
      {
        techStackContentLength: techStackContent.length,
        codeGraphContentLength: codeGraphContent.length,
        codeGraphJsonContentLength: codeGraphJsonContent.length,
        contentDuplication: {
          techStackSameAsCodeGraph: isTechStackSameAsCodeGraph,
          techStackSameAsCodeGraphJson: isTechStackSameAsCodeGraphJson,
          codeGraphSameAsCodeGraphJson: isCodeGraphSameAsCodeGraphJson,
        },
        allContentUnique:
          !isTechStackSameAsCodeGraph &&
          !isTechStackSameAsCodeGraphJson &&
          !isCodeGraphSameAsCodeGraphJson,
      },
      "FullCodeAnalysisWebview"
    );

    const tabContentsResult = {
      techStack: {
        content: techStackContent,
        available: hasTechStack,
        count: this.getTechStackCount(analysisData),
      },
      codeGraph: {
        content: codeGraphContent,
        available: hasCodeGraph,
        count: hasCodeGraph ? this.getEnhancedNodeCount(analysisData) : 0,
      },
      codeGraphJson: {
        content: codeGraphJsonContent,
        available: hasCodeGraphJson,
        count: hasCodeGraphJson ? analysisData.code_graph_json?.length || 0 : 0,
      },
    };

    // Final verification of tab contents structure
    this.errorHandler.logError(
      "Final tab contents structure verification",
      {
        techStackHasContent: !!tabContentsResult.techStack.content,
        codeGraphHasContent: !!tabContentsResult.codeGraph.content,
        codeGraphJsonHasContent: !!tabContentsResult.codeGraphJson.content,
        techStackAvailable: tabContentsResult.techStack.available,
        codeGraphAvailable: tabContentsResult.codeGraph.available,
        codeGraphJsonAvailable: tabContentsResult.codeGraphJson.available,
        allTabsHaveUniqueContent:
          tabContentsResult.techStack.content !==
            tabContentsResult.codeGraph.content &&
          tabContentsResult.techStack.content !==
            tabContentsResult.codeGraphJson.content &&
          tabContentsResult.codeGraph.content !==
            tabContentsResult.codeGraphJson.content,
      },
      "FullCodeAnalysisWebview"
    );

    return tabContentsResult;
  }

  /**
   * Generate overview tab content
   */
  private generateOverviewTab(analysisData: any): string {
    const moduleCount = this.getEnhancedNodeCount(analysisData);
    const techStackCount = this.getTechStackCount(analysisData);
    const totalFiles = this.getTotalFileCount(analysisData);
    const hasErrors = !!(
      analysisData?.errors && analysisData.errors.length > 0
    );
    const hasWarnings = !!(
      analysisData?.warnings && analysisData.warnings.length > 0
    );

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
            <div class="metric-value" style="color: ${
              hasErrors
                ? "var(--vscode-errorForeground)"
                : hasWarnings
                ? "var(--vscode-warningForeground)"
                : "#28a745"
            }">
              ${hasErrors ? "Errors" : hasWarnings ? "Warnings" : "Success"}
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
    // Add unique identifier for debugging
    const uniqueId = `tech-stack-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    if (!analysisData?.tech_stack) {
      return `
        <div class="tab-content-wrapper" data-tab-id="${uniqueId}" data-content-type="tech-stack-empty">
          <div class="empty-state">
            <div class="empty-icon">🛠️</div>
            <h3 class="empty-title">No Technology Stack Data</h3>
            <p class="empty-description">Technology stack information is not available for this analysis.</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="tab-content-wrapper" data-tab-id="${uniqueId}" data-content-type="tech-stack-full">
        <!-- UNIQUE MARKER: TECH STACK TAB CONTENT -->
        <div class="section">
          <h2 class="section-title">Technology Stack Analysis</h2>
          
          <!-- Project Statistics Section -->
          <div class="project-stats-section">
            <h3 class="section-subtitle">Project Statistics</h3>
            ${this.generateProjectStatistics(analysisData)}
          </div>

          <!-- Primary Framework Section -->
          ${this.generatePrimaryFrameworkSection(analysisData)}

          <!-- Tech Stack Details -->
          <div class="tech-stack-details">
            <h3 class="section-subtitle">Technology Details</h3>
            <div class="tech-grid">
              ${this.generateEnhancedTechStackSummary(analysisData)}
            </div>
          </div>

          <!-- Language Breakdown Section -->
          ${this.generateLanguageBreakdownSection(analysisData)}
        </div>
      </div>
    `;
  }

  /**
   * Generate code graph tab content
   */
  private generateCodeGraphTab(analysisData: any): string {
    // Add unique identifier for debugging
    const uniqueId = `code-graph-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Check for code graph data
    const hasCodeGraph = !!(
      analysisData?.code_graph_json &&
      Array.isArray(analysisData.code_graph_json) &&
      analysisData.code_graph_json.length > 0
    );

    // Debug logging
    this.errorHandler.logError(
      "Code Graph Tab Generation - DETAILED DEBUG",
      {
        uniqueId,
        hasAnalysisData: !!analysisData,
        hasCodeGraphJson: !!analysisData?.code_graph_json,
        isCodeGraphJsonArray: Array.isArray(analysisData?.code_graph_json),
        codeGraphJsonLength: analysisData?.code_graph_json?.length || 0,
        hasCodeGraph,
        nodeCount: hasCodeGraph ? this.getEnhancedNodeCount(analysisData) : 0,
        analysisDataKeys: analysisData ? Object.keys(analysisData) : null,
        codeGraphJsonPreview: analysisData?.code_graph_json
          ? JSON.stringify(analysisData.code_graph_json.slice(0, 2))
          : "null",
      },
      "FullCodeAnalysisWebview"
    );

    if (!hasCodeGraph) {
      return `
        <div class="tab-content-wrapper" data-tab-id="${uniqueId}" data-content-type="code-graph-empty">
          <!-- UNIQUE MARKER: CODE GRAPH EMPTY STATE -->
          <div class="empty-state">
            <div class="empty-icon">🕸️</div>
            <h3 class="empty-title">No Code Graph Data</h3>
            <p class="empty-description">Enhanced code graph data is not available for visualization.</p>
            <div style="margin-top: 16px; font-size: 12px; color: var(--vscode-descriptionForeground);">
              Debug: analysisData=${!!analysisData}, code_graph_json=${hasCodeGraph}
            </div>
          </div>
        </div>
      `;
    }

    // Check if array is empty
    if (analysisData.code_graph_json.length === 0) {
      return `
        <div class="tab-content-wrapper" data-tab-id="${uniqueId}" data-content-type="code-graph-empty-array">
          <div class="empty-state">
            <div class="empty-icon">🕸️</div>
            <h3 class="empty-title">Empty Code Graph Data</h3>
            <p class="empty-description">The code_graph_json array is empty. The enhanced analyzer may not have processed the code structure yet.</p>
            <div style="margin-top: 16px;">
              <p style="font-size: 12px; color: var(--vscode-descriptionForeground);">
                Expected structure: Array of hierarchical code elements with folders, files, classes, and functions.
              </p>
            </div>
          </div>
        </div>
      `;
    }

    // Get node count and description
    const nodeCount = this.getEnhancedNodeCount(analysisData);
    const graphType = "Enhanced Code Graph";
    const hasConnections = this.hasCallRelationships(
      analysisData.code_graph_json
    );

    return `
      <div class="tab-content-wrapper" data-tab-id="${uniqueId}" data-content-type="code-graph-full">
        <!-- UNIQUE MARKER: CODE GRAPH TAB CONTENT -->
        <div class="graph-container">
        <div class="graph-header">
          <h2 class="section-title">Interactive ${graphType}</h2>
          <p class="section-description">
            Visualizing ${nodeCount} code elements and their relationships. 
            ${
              hasConnections
                ? "Call relationships and hierarchical structure included."
                : "Hierarchical structure only."
            }
            <strong>Enhanced format with complexity metrics and expandable folders.</strong>
          </p>
        </div>

        <div class="graph-toolbar">
          <div class="toolbar-section">
            <button class="toolbar-btn" onclick="fitGraph()" title="Fit graph to view">
              <span class="icon">🔍</span> Fit
            </button>
            <button class="toolbar-btn" onclick="resetGraph()" title="Reset graph layout">
              <span class="icon">🔄</span> Reset
            </button>
            <button class="toolbar-btn" onclick="centerGraph()" title="Center graph">
              <span class="icon">🎯</span> Center
            </button>
          </div>
          
          <div class="toolbar-section">
            <input type="text" id="graph-search" class="search-input" placeholder="Search modules..." />
            <button class="toolbar-btn" onclick="clearSearch()" title="Clear search">
              <span class="icon">✖</span>
            </button>
          </div>
          
          <div class="toolbar-section">
            <select id="layout-algorithm" class="layout-select" title="Change layout algorithm">
              <option value="dagre">Hierarchical</option>
              <option value="cose">Force-directed</option>
              <option value="circle">Circle</option>
              <option value="grid">Grid</option>
              <option value="breadthfirst">Breadth-first</option>
            </select>
            
            <select id="complexity-filter" class="filter-select" title="Filter by complexity">
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
            <p>Loading module graph...</p>
          </div>
          
          <div id="graph-info" class="graph-info">
            <div class="info-panel">
              <h4>Graph Legend</h4>
              <div class="legend-items">
                <div class="legend-item">
                  <div class="legend-color folder-color"></div>
                  <span>Folders</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color file-color"></div>
                  <span>Files</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color class-color"></div>
                  <span>Classes</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color function-color"></div>
                  <span>Functions</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color low-complexity"></div>
                  <span>Low Complexity</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color medium-complexity"></div>
                  <span>Medium Complexity</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color high-complexity"></div>
                  <span>High Complexity</span>
                </div>
                <div class="legend-item">
                  <div class="legend-line call-line"></div>
                  <span>Function Calls</span>
                </div>
                <div class="legend-item">
                  <div class="legend-line contains-line"></div>
                  <span>Contains</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    `;
  }

  /**
   * Safely stringify JSON with error handling
   */
  private safeJsonStringify(data: any): string {
    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return `Error serializing data: ${
        error instanceof Error ? error.message : "Unknown error"
      }\n\nData type: ${typeof data}\nData: ${String(data)}`;
    }
  }

  /**
   * Generate code graph JSON tab content
   */
  private generateCodeGraphJsonTab(analysisData: any): string {
    // Add unique identifier for debugging
    const uniqueId = `code-graph-json-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    try {
      // Debug logging
      this.errorHandler.logError(
        "Code Graph JSON tab data - DETAILED DEBUG",
        {
          uniqueId,
          hasCodeGraphJson: !!analysisData?.code_graph_json,
          isCodeGraphJsonArray: Array.isArray(analysisData?.code_graph_json),
          codeGraphJsonLength: analysisData?.code_graph_json?.length || 0,
          analysisDataKeys: analysisData ? Object.keys(analysisData) : null,
          codeGraphJsonType: typeof analysisData?.code_graph_json,
          codeGraphJsonPreview: analysisData?.code_graph_json
            ? JSON.stringify(analysisData.code_graph_json.slice(0, 2))
            : "null",
        },
        "FullCodeAnalysisWebview"
      );

      if (
        !analysisData?.code_graph_json ||
        !Array.isArray(analysisData.code_graph_json)
      ) {
        return `
          <div class="tab-content-wrapper" data-tab-id="${uniqueId}" data-content-type="code-graph-json-empty">
            <!-- UNIQUE MARKER: CODE GRAPH JSON EMPTY STATE -->
            <div class="section">
              <h2 class="section-title">Code Graph JSON Data</h2>
              <div class="empty-state">
                <div class="empty-icon">📄</div>
                <h3 class="empty-title">No Code Graph JSON Data</h3>
                <p class="empty-description">The code_graph_json field is not available in the analysis data.</p>
              </div>
            </div>
          </div>
        `;
      }

      if (analysisData.code_graph_json.length === 0) {
        return `
          <div class="tab-content-wrapper" data-tab-id="${uniqueId}" data-content-type="code-graph-json-empty-array">
            <div class="section">
              <h2 class="section-title">Code Graph JSON Data</h2>
              <div class="empty-state">
                <div class="empty-icon">📄</div>
                <h3 class="empty-title">Empty Code Graph JSON Data</h3>
                <p class="empty-description">The code_graph_json array is empty. The enhanced analyzer may not have processed the code yet.</p>
                <div class="json-viewer">
                  <pre><code>${this.safeJsonStringify(
                    analysisData.code_graph_json
                  )}</code></pre>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      return `
        <div class="tab-content-wrapper" data-tab-id="${uniqueId}" data-content-type="code-graph-json-full">
          <!-- UNIQUE MARKER: CODE GRAPH JSON TAB CONTENT -->
          <div class="section">
            <h2 class="section-title">Code Graph JSON Data</h2>
            <p class="section-description">Raw hierarchical code structure from the enhanced analyzer (${
              analysisData.code_graph_json.length
            } items)</p>
            
            <div class="json-viewer">
              <pre><code>${this.safeJsonStringify(
                analysisData.code_graph_json
              )}</code></pre>
            </div>
            
            <div class="section" style="margin-top: 24px;">
              <h3 class="section-subtitle">Complete Analysis Data</h3>
              <p class="section-description">Full analysis result including tech stack and other metadata</p>
              
              <div class="json-viewer">
                <pre><code>${this.safeJsonStringify(analysisData)}</code></pre>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      this.errorHandler.logError(
        "Error generating Code Graph JSON tab",
        error,
        "FullCodeAnalysisWebview"
      );

      return `
        <div class="tab-content-wrapper" data-tab-id="${uniqueId}" data-content-type="code-graph-json-error">
          <div class="section">
            <h2 class="section-title">Code Graph JSON Data</h2>
            <div class="error-view">
              <div class="error-icon">⚠️</div>
              <h3>Error Loading JSON Data</h3>
              <p>Failed to generate graph data: ${
                error instanceof Error ? error.message : "Unknown error"
              }</p>
              <div class="json-viewer">
                <pre><code>${this.safeJsonStringify(analysisData)}</code></pre>
              </div>
            </div>
          </div>
        </div>
      `;
    }
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
          <span class="tech-version">${languages.slice(0, 3).join(", ")}</span>
        </div>
      `;
    }

    if (analysisData?.code_graph_json) {
      const moduleCount = this.getEnhancedNodeCount(analysisData);
      summary += `
        <div class="tech-item">
          <span class="tech-name">Code Organization</span>
          <span class="tech-version">${moduleCount} modules analyzed</span>
        </div>
      `;
    }

    if (
      analysisData?.tech_stack?.frameworks &&
      analysisData.tech_stack.frameworks.length > 0
    ) {
      const framework = analysisData.tech_stack.frameworks[0];
      summary += `
        <div class="tech-item">
          <span class="tech-name">Primary Framework</span>
          <span class="tech-version">${framework?.name || "Unknown"}</span>
        </div>
      `;
    }

    summary += "</div>";
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
   * Get enhanced node count from code_graph_json
   */
  private getEnhancedNodeCount(analysisData: any): number {
    if (
      !analysisData?.code_graph_json ||
      !Array.isArray(analysisData.code_graph_json)
    ) {
      return 0;
    }

    return this.countHierarchicalNodes(analysisData.code_graph_json);
  }

  /**
   * Recursively count nodes in hierarchical structure
   */
  private countHierarchicalNodes(nodes: any[]): number {
    let count = 0;

    nodes.forEach((node) => {
      count++; // Count current node

      if (node.children && Array.isArray(node.children)) {
        count += this.countHierarchicalNodes(node.children);
      }
    });

    return count;
  }

  /**
   * Check if code graph has call relationships
   */
  private hasCallRelationships(nodes: any[]): boolean {
    for (const node of nodes) {
      if (node.calls && Array.isArray(node.calls) && node.calls.length > 0) {
        return true;
      }

      if (node.children && Array.isArray(node.children)) {
        if (this.hasCallRelationships(node.children)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get total file count
   */
  private getTotalFileCount(analysisData: any): number {
    if (analysisData?.metadata?.total_files) {
      return analysisData.metadata.total_files;
    }

    // Fallback calculation from code_graph_json
    let totalFiles = 0;
    if (
      analysisData?.code_graph_json &&
      Array.isArray(analysisData.code_graph_json)
    ) {
      // Count file nodes in the hierarchical structure
      const countFiles = (nodes: any[]): number => {
        let count = 0;
        for (const node of nodes) {
          if (node.type === "file") {
            count++;
          }
          if (node.children && Array.isArray(node.children)) {
            count += countFiles(node.children);
          }
        }
        return count;
      };
      totalFiles = countFiles(analysisData.code_graph_json);
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
   * Generate project statistics section
   */
  private generateProjectStatistics(analysisData: any): string {
    const moduleCount = this.getEnhancedNodeCount(analysisData);
    const totalFiles = this.getTotalFileCount(analysisData);
    const analysisStatus = this.getAnalysisStatus(analysisData);

    return `
      <div class="project-stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📁</div>
          <div class="stat-content">
            <div class="stat-label">TOTAL MODULES</div>
            <div class="stat-value">${moduleCount}</div>
            <div class="stat-description">Number of folders</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">📄</div>
          <div class="stat-content">
            <div class="stat-label">TOTAL FILES</div>
            <div class="stat-value">${totalFiles}</div>
            <div class="stat-description">All analyzed files</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">${analysisStatus.icon}</div>
          <div class="stat-content">
            <div class="stat-label">ANALYSIS STATUS</div>
            <div class="stat-value" style="color: ${analysisStatus.color}">${analysisStatus.text}</div>
            <div class="stat-description">${analysisStatus.description}</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate primary framework section
   */
  private generatePrimaryFrameworkSection(analysisData: any): string {
    const primaryFramework = this.getPrimaryFramework(analysisData);

    if (!primaryFramework) {
      return `
        <div class="primary-framework-section">
          <h3 class="section-subtitle">Primary Framework</h3>
          <div class="primary-framework-card empty">
            <div class="framework-icon">🔧</div>
            <div class="framework-content">
              <div class="framework-name">No Primary Framework Detected</div>
              <div class="framework-description">Multiple frameworks or no clear primary framework found</div>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="primary-framework-section">
        <h3 class="section-subtitle">Primary Framework</h3>
        <div class="primary-framework-card">
          <div class="framework-icon">${this.getFrameworkIcon(
            primaryFramework.name
          )}</div>
          <div class="framework-content">
            <div class="framework-name">${primaryFramework.name}</div>
            <div class="framework-version">Version: ${
              primaryFramework.version || "Unknown"
            }</div>
            <div class="framework-confidence">Confidence: ${Math.round(
              (primaryFramework.confidence || 0) * 100
            )}%</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate enhanced tech stack summary
   */
  private generateEnhancedTechStackSummary(analysisData: any): string {
    if (!analysisData?.tech_stack) {
      return "<p>No technology stack information available.</p>";
    }

    const techStack = analysisData.tech_stack;
    let html = "";

    // Libraries and Dependencies Section
    if (techStack?.libraries || techStack?.dependencies) {
      html += '<div class="tech-section">';
      html += "<h4>Libraries & Dependencies</h4>";
      html += '<div class="tech-items">';

      // Process libraries first
      if (techStack?.libraries && Array.isArray(techStack.libraries)) {
        techStack.libraries.forEach((lib: any) => {
          html += `<div class="tech-item">
            <span class="tech-name">${lib?.name || "Unknown Library"}</span>
            <span class="tech-version">${lib?.version || "Unknown"}</span>
            <span class="tech-type">${lib?.type || "library"}</span>
          </div>`;
        });
      }

      // Process dependencies
      if (
        techStack?.dependencies &&
        typeof techStack.dependencies === "object"
      ) {
        Object.entries(techStack.dependencies)
          .slice(0, 15) // Show more dependencies
          .forEach(([dep, version]: [string, any]) => {
            html += `<div class="tech-item">
              <span class="tech-name">${dep || "Unknown Dependency"}</span>
              <span class="tech-version">${version || "Unknown"}</span>
              <span class="tech-type">dependency</span>
            </div>`;
          });
      }

      html += "</div></div>";
    }

    // Frameworks Section (excluding primary)
    if (
      techStack?.frameworks &&
      Array.isArray(techStack.frameworks) &&
      techStack.frameworks.length > 1
    ) {
      html += '<div class="tech-section">';
      html += "<h4>Additional Frameworks</h4>";
      html += '<div class="tech-items">';

      const primaryFramework = this.getPrimaryFramework(analysisData);
      const otherFrameworks = techStack.frameworks.filter(
        (fw: any) => !primaryFramework || fw.name !== primaryFramework.name
      );

      otherFrameworks.forEach((framework: any) => {
        html += `<div class="tech-item">
          <span class="tech-name">${
            framework?.name || "Unknown Framework"
          }</span>
          <span class="tech-version">${framework?.version || "Unknown"}</span>
          <span class="tech-confidence">${Math.round(
            (framework?.confidence || 0) * 100
          )}%</span>
        </div>`;
      });

      html += "</div></div>";
    }

    // Package Managers Section
    if (
      techStack?.package_managers &&
      Array.isArray(techStack.package_managers)
    ) {
      html += '<div class="tech-section">';
      html += "<h4>Package Managers</h4>";
      html += '<div class="tech-items">';

      techStack.package_managers.forEach((pm: string) => {
        html += `<div class="tech-item">
          <span class="tech-name">${pm}</span>
          <span class="tech-type">package manager</span>
        </div>`;
      });

      html += "</div></div>";
    }

    return html || "<p>No additional technology stack data available.</p>";
  }

  /**
   * Generate language breakdown section with visual charts
   */
  private generateLanguageBreakdownSection(analysisData: any): string {
    if (!analysisData?.tech_stack?.languages) {
      return `
        <div class="language-breakdown-section">
          <h3 class="section-subtitle">Language Breakdown</h3>
          <div class="empty-state-small">
            <p>No language data available</p>
          </div>
        </div>
      `;
    }

    const languages = analysisData.tech_stack.languages;
    const totalFiles = Object.values(languages).reduce(
      (sum: number, count: any) => sum + (count || 0),
      0
    );

    if (totalFiles === 0) {
      return `
        <div class="language-breakdown-section">
          <h3 class="section-subtitle">Language Breakdown</h3>
          <div class="empty-state-small">
            <p>No language files found</p>
          </div>
        </div>
      `;
    }

    let html = `
      <div class="language-breakdown-section">
        <h3 class="section-subtitle">Language Breakdown</h3>
        <div class="language-stats">
    `;

    // Generate language items with progress bars
    Object.entries(languages)
      .sort(([, a], [, b]) => (b as number) - (a as number)) // Sort by file count descending
      .forEach(([lang, count]: [string, any]) => {
        const percentage = Math.round((count / totalFiles) * 100);
        const color = this.getLanguageColor(lang);

        html += `
          <div class="language-item">
            <div class="language-header">
              <span class="language-name">${lang}</span>
              <span class="language-stats-text">${count} files (${percentage}%)</span>
            </div>
            <div class="language-progress">
              <div class="language-progress-bar" style="width: ${percentage}%; background-color: ${color}"></div>
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
   * Get analysis status with icon and color
   */
  private getAnalysisStatus(analysisData: any): {
    text: string;
    icon: string;
    color: string;
    description: string;
  } {
    const hasErrors = !!(
      analysisData?.errors && analysisData.errors.length > 0
    );
    const hasWarnings = !!(
      analysisData?.warnings && analysisData.warnings.length > 0
    );

    if (hasErrors) {
      return {
        text: "Errors",
        icon: "❌",
        color: "var(--vscode-errorForeground)",
        description: `${analysisData.errors.length} error(s) found`,
      };
    }

    if (hasWarnings) {
      return {
        text: "Warnings",
        icon: "⚠️",
        color: "var(--vscode-warningForeground)",
        description: `${analysisData.warnings.length} warning(s) found`,
      };
    }

    return {
      text: "Success",
      icon: "✅",
      color: "#28a745",
      description: "Analysis completed successfully",
    };
  }

  /**
   * Get primary framework from tech stack
   */
  private getPrimaryFramework(analysisData: any): any {
    if (analysisData?.tech_stack?.primary_framework) {
      return analysisData.tech_stack.primary_framework;
    }

    // Fallback: find framework with highest confidence
    if (
      analysisData?.tech_stack?.frameworks &&
      Array.isArray(analysisData.tech_stack.frameworks)
    ) {
      return analysisData.tech_stack.frameworks.sort(
        (a: any, b: any) => (b.confidence || 0) - (a.confidence || 0)
      )[0];
    }

    return null;
  }

  /**
   * Get framework icon based on name
   */
  private getFrameworkIcon(frameworkName: string): string {
    const name = frameworkName?.toLowerCase() || "";

    if (name.includes("django")) {
      return "🐍";
    }
    if (name.includes("flask")) {
      return "🌶️";
    }
    if (name.includes("fastapi")) {
      return "⚡";
    }
    if (name.includes("react")) {
      return "⚛️";
    }
    if (name.includes("vue")) {
      return "💚";
    }
    if (name.includes("angular")) {
      return "🅰️";
    }
    if (name.includes("express")) {
      return "🚂";
    }
    if (name.includes("spring")) {
      return "🍃";
    }
    if (name.includes("laravel")) {
      return "🎭";
    }
    if (name.includes("rails")) {
      return "💎";
    }

    return "🔧";
  }

  /**
   * Get language color for progress bars
   */
  private getLanguageColor(language: string): string {
    const lang = language?.toLowerCase() || "";

    if (lang.includes("python")) {
      return "#3776ab";
    }
    if (lang.includes("javascript")) {
      return "#f7df1e";
    }
    if (lang.includes("typescript")) {
      return "#3178c6";
    }
    if (lang.includes("java")) {
      return "#ed8b00";
    }
    if (lang.includes("html")) {
      return "#e34f26";
    }
    if (lang.includes("css")) {
      return "#1572b6";
    }
    if (lang.includes("php")) {
      return "#777bb4";
    }
    if (lang.includes("ruby")) {
      return "#cc342d";
    }
    if (lang.includes("go")) {
      return "#00add8";
    }
    if (lang.includes("rust")) {
      return "#dea584";
    }
    if (lang.includes("c++") || lang.includes("cpp")) {
      return "#00599c";
    }
    if (lang.includes("c#") || lang.includes("csharp")) {
      return "#239120";
    }

    return "var(--vscode-progressBar-background)";
  }

  /**
   * Prepare graph data for visualization using code_graph_json format
   */
  private prepareGraphData(analysisData: any): any {
    // Validate analysis data exists
    if (!analysisData) {
      this.errorHandler.logError(
        "No analysis data provided to prepareGraphData",
        null,
        "FullCodeAnalysisWebview"
      );
      return { elements: [], style: [], layout: { name: "dagre" }, state: {} };
    }

    // Only use code_graph_json format
    if (
      analysisData.code_graph_json &&
      Array.isArray(analysisData.code_graph_json)
    ) {
      this.errorHandler.logError(
        "Using code_graph_json format",
        {
          nodeCount: analysisData.code_graph_json.length,
        },
        "FullCodeAnalysisWebview"
      );
      const graphData = this.prepareEnhancedGraphData(
        analysisData.code_graph_json
      );
      this.errorHandler.logError(
        "Prepared graph data",
        {
          elementsCount: graphData.elements.length,
          hasElements: graphData.elements.length > 0,
          firstElement: graphData.elements[0] || null,
        },
        "FullCodeAnalysisWebview"
      );
      return graphData;
    }

    // No code_graph_json data available
    this.errorHandler.logError(
      "No code_graph_json data found in analysis result",
      null,
      "FullCodeAnalysisWebview"
    );
    return { elements: [], style: [], layout: { name: "dagre" }, state: {} };
  }

  /**
   * Prepare enhanced graph data from the new code_graph_json format
   */
  private prepareEnhancedGraphData(codeGraphJson: any[]): any {
    const elements: any[] = [];
    const nodeIds = new Set<string>();
    const expandedFolders = new Set<string>();

    // Process hierarchical data structure
    this.processHierarchicalNodes(
      codeGraphJson,
      elements,
      nodeIds,
      expandedFolders,
      []
    );

    return {
      elements,
      style: this.getEnhancedCodeGraphStyle(),
      layout: {
        name: "dagre",
        rankDir: "TB",
        nodeSep: 100,
        rankSep: 120,
        spacingFactor: 1.2,
        animate: true,
        animationDuration: 500,
        fit: true,
        padding: 30,
      },
      state: {
        nodeCount: elements.filter((el) => el.data.id && !el.data.source)
          .length,
        hasComplexity: elements.some((el) => el.data.complexity),
        expandedFolders: Array.from(expandedFolders),
      },
    };
  }

  /**
   * Process hierarchical nodes from code_graph_json format
   */
  private processHierarchicalNodes(
    nodes: any[],
    elements: any[],
    nodeIds: Set<string>,
    expandedFolders: Set<string>,
    parentPath: string[] = []
  ): void {
    this.errorHandler.logError(
      "Processing hierarchical nodes",
      {
        nodeCount: nodes.length,
        parentPath: parentPath.join("/"),
        currentElementsCount: elements.length,
      },
      "FullCodeAnalysisWebview"
    );

    nodes.forEach((node, index) => {
      try {
        const currentPath = [...parentPath, node.name];
        const nodeId = this.generateNodeId(currentPath);
        const parentId =
          parentPath.length > 0 ? this.generateNodeId(parentPath) : null;

        if (!nodeIds.has(nodeId)) {
          nodeIds.add(nodeId);

          // Create node element
          const nodeElement = {
            data: {
              id: nodeId,
              name: node.name,
              label: node.name,
              type: node.type,
              path: currentPath.join("/"),
              parentPath: parentPath.join("/"),
              complexity: node.complexity,
              calls: node.calls || [],
              hasChildren: node.children && node.children.length > 0,
              isExpanded:
                node.type === "folder" ? expandedFolders.has(nodeId) : false,
              tooltip: this.generateEnhancedTooltip(node, currentPath),
            },
            classes: this.generateNodeClasses(node),
            position: this.calculateNodePosition(currentPath, index),
          };

          elements.push(nodeElement);

          // Add containment edge if has parent
          if (parentId && nodeIds.has(parentId)) {
            elements.push({
              data: {
                id: `contains_${parentId}_${nodeId}`,
                source: parentId,
                target: nodeId,
                type: "contains",
              },
              classes: "contains-edge",
            });
          }

          // Process children - show all top-level nodes, expand folders on demand
          if (node.children && node.children.length > 0) {
            // For top-level nodes (parentPath is empty), always show children
            // For nested folders, only show if expanded
            const isTopLevel = parentPath.length === 0;
            const shouldShowChildren =
              isTopLevel ||
              node.type !== "folder" ||
              node.isExpanded ||
              expandedFolders.has(nodeId);

            if (shouldShowChildren) {
              if (node.type === "folder") {
                expandedFolders.add(nodeId);
              }
              this.processHierarchicalNodes(
                node.children,
                elements,
                nodeIds,
                expandedFolders,
                currentPath
              );
            }
          }

          // Process call relationships
          if (node.calls && node.calls.length > 0) {
            this.processCallRelationships(node, nodeId, elements, nodeIds);
          }
        }
      } catch (error) {
        this.errorHandler.logError(
          `Error processing hierarchical node at index ${index}`,
          error,
          "FullCodeAnalysisWebview"
        );
      }
    });

    this.errorHandler.logError(
      "Finished processing hierarchical nodes",
      {
        finalElementsCount: elements.length,
        parentPath: parentPath.join("/"),
      },
      "FullCodeAnalysisWebview"
    );
  }

  /**
   * Process call relationships from the enhanced format
   */
  private processCallRelationships(
    node: any,
    sourceId: string,
    elements: any[],
    nodeIds: Set<string>
  ): void {
    node.calls.forEach((call: any, callIndex: number) => {
      try {
        if (
          call.target &&
          Array.isArray(call.target) &&
          call.target.length >= 2
        ) {
          const targetId = this.generateNodeId(call.target);

          // Only add edge if target node exists
          if (nodeIds.has(targetId)) {
            elements.push({
              data: {
                id: `call_${sourceId}_${targetId}_${callIndex}`,
                source: sourceId,
                target: targetId,
                type: "calls",
                label: call.label || "calls",
                callType: call.label,
              },
              classes: `call-edge call-${call.label || "default"}`,
            });
          }
        }
      } catch (error) {
        this.errorHandler.logError(
          `Error processing call relationship at index ${callIndex} for node ${sourceId}`,
          error,
          "FullCodeAnalysisWebview"
        );
      }
    });
  }

  /**
   * Generate unique node ID from path array
   */
  private generateNodeId(path: string[]): string {
    return path.join("_").replace(/[^a-zA-Z0-9_]/g, "_");
  }

  /**
   * Generate node classes based on type and complexity
   */
  private generateNodeClasses(node: any): string {
    const classes = [`${node.type}-node`];

    if (node.complexity && node.complexity.level) {
      classes.push(`complexity-${node.complexity.level}`);
    }

    if (node.type === "folder") {
      classes.push("expandable");
    }

    return classes.join(" ");
  }

  /**
   * Calculate node position for layout
   */
  private calculateNodePosition(
    path: string[],
    index: number
  ): { x: number; y: number } {
    const level = path.length;
    const x = level * 150 + (index % 3) * 50;
    const y = index * 80 + level * 20;
    return { x, y };
  }

  /**
   * Generate enhanced tooltip content
   */
  private generateEnhancedTooltip(node: any, path: string[]): string {
    let tooltip = `${node.type}: ${node.name}\nPath: ${path.join("/")}`;

    if (node.complexity) {
      tooltip += `\nComplexity: ${node.complexity.level} (Cyclomatic: ${node.complexity.cyclomatic}, Cognitive: ${node.complexity.cognitive})`;
    }

    if (node.calls && node.calls.length > 0) {
      tooltip += `\nCalls: ${node.calls.length} functions`;
    }

    return tooltip;
  }

  /**
   * Get enhanced Cytoscape style configuration for the new code graph format
   */
  private getEnhancedCodeGraphStyle(): any[] {
    return [
      // Folder nodes
      {
        selector: ".folder-node",
        style: {
          "background-color": "#f39c12",
          "border-color": "#e67e22",
          "border-width": 2,
          label: "data(label)",
          "text-valign": "center",
          "text-halign": "center",
          color: "#ffffff",
          "font-size": "12px",
          "font-weight": "bold",
          width: 100,
          height: 60,
          shape: "round-rectangle",
          "text-wrap": "wrap",
          "text-max-width": "90px",
        },
      },

      // File nodes
      {
        selector: ".file-node",
        style: {
          "background-color": "#3498db",
          "border-color": "#2980b9",
          "border-width": 2,
          label: "data(label)",
          "text-valign": "center",
          "text-halign": "center",
          color: "#ffffff",
          "font-size": "10px",
          "font-weight": "bold",
          width: 80,
          height: 40,
          shape: "rectangle",
          "text-wrap": "wrap",
          "text-max-width": "70px",
        },
      },

      // Class nodes
      {
        selector: ".class-node",
        style: {
          "background-color": "#e67e22",
          "border-color": "#d35400",
          "border-width": 2,
          label: "data(label)",
          "text-valign": "center",
          "text-halign": "center",
          color: "#ffffff",
          "font-size": "10px",
          "font-weight": "bold",
          width: 70,
          height: 50,
          shape: "hexagon",
          "text-wrap": "wrap",
          "text-max-width": "60px",
        },
      },

      // Function nodes
      {
        selector: ".function-node",
        style: {
          "background-color": "#27ae60",
          "border-color": "#229954",
          "border-width": 1,
          label: "data(label)",
          "text-valign": "center",
          "text-halign": "center",
          color: "#ffffff",
          "font-size": "9px",
          width: 50,
          height: 30,
          shape: "ellipse",
          "text-wrap": "wrap",
          "text-max-width": "45px",
        },
      },

      // Complexity-based colors for low complexity
      {
        selector: ".complexity-low",
        style: {
          "background-color": "#27ae60",
          "border-color": "#229954",
        },
      },

      // Complexity-based colors for medium complexity
      {
        selector: ".complexity-medium",
        style: {
          "background-color": "#f39c12",
          "border-color": "#e67e22",
        },
      },

      // Complexity-based colors for high complexity
      {
        selector: ".complexity-high",
        style: {
          "background-color": "#e74c3c",
          "border-color": "#c0392b",
        },
      },

      // Expandable folder indicators
      {
        selector: ".expandable",
        style: {
          "border-style": "dashed",
        },
      },

      // Contains edges (hierarchical structure)
      {
        selector: ".contains-edge",
        style: {
          width: 2,
          "line-color": "#95a5a6",
          "target-arrow-color": "#95a5a6",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          opacity: 0.7,
        },
      },

      // Call edges (function relationships)
      {
        selector: ".call-edge",
        style: {
          width: 2,
          "line-color": "#e74c3c",
          "target-arrow-color": "#e74c3c",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          "line-style": "solid",
          opacity: 0.8,
          label: "data(label)",
          "text-rotation": "autorotate",
          "text-margin-y": -10,
          "font-size": "8px",
          color: "#e74c3c",
        },
      },

      // Different call types
      {
        selector: ".call-uses",
        style: {
          "line-color": "#9b59b6",
          "target-arrow-color": "#9b59b6",
          color: "#9b59b6",
        },
      },

      {
        selector: ".call-fetches",
        style: {
          "line-color": "#3498db",
          "target-arrow-color": "#3498db",
          color: "#3498db",
        },
      },

      // Selected nodes
      {
        selector: "node:selected",
        style: {
          "border-width": 4,
          "border-color": "#f1c40f",
          "overlay-color": "#f1c40f",
          "overlay-opacity": 0.3,
        },
      },

      // Highlighted nodes
      {
        selector: ".highlighted",
        style: {
          "border-width": 3,
          "border-color": "#e74c3c",
          "overlay-color": "#e74c3c",
          "overlay-opacity": 0.2,
        },
      },

      // Search result highlighting
      {
        selector: ".search-result",
        style: {
          "border-width": 3,
          "border-color": "#f39c12",
          "overlay-color": "#f39c12",
          "overlay-opacity": 0.3,
        },
      },
    ];
  }

  /**
   * Add inferred hierarchy edges based on module paths
   */
  private addInferredHierarchyEdges(
    modulesArray: any[],
    elements: any[],
    nodeIds: Set<string>
  ): void {
    // Create a map of paths to module IDs
    const pathToId = new Map<string, string>();

    modulesArray.forEach((module: any) => {
      const moduleName = module?.name || "";
      const modulePath = module?.path || "";
      const moduleId = `module_${moduleName.replace(/[^a-zA-Z0-9]/g, "_")}`;

      if (modulePath) {
        pathToId.set(modulePath, moduleId);
      }
    });

    // Infer parent-child relationships from paths
    modulesArray.forEach((module: any) => {
      const modulePath = module?.path || "";
      const moduleName = module?.name || "";
      const moduleId = `module_${moduleName.replace(/[^a-zA-Z0-9]/g, "_")}`;

      if (modulePath && modulePath !== "." && modulePath !== "") {
        const pathParts = modulePath.split("/");

        // Try to find parent path
        for (let i = pathParts.length - 1; i > 0; i--) {
          const parentPath = pathParts.slice(0, i).join("/");
          const parentId = pathToId.get(parentPath);

          if (parentId && parentId !== moduleId && nodeIds.has(parentId)) {
            // Add hierarchy edge
            elements.push({
              data: {
                id: `hierarchy_${parentId}_${moduleId}`,
                source: parentId,
                target: moduleId,
                type: "contains",
                label: "contains",
              },
              classes: "hierarchy-edge contains",
            });
            break; // Only connect to immediate parent
          }
        }
      }
    });
  }

  /**
   * Get enhanced Cytoscape style configuration for module-focused visualization
   */
  private getEnhancedGraphStyle(): any[] {
    return [
      // Root module nodes (larger, more prominent)
      {
        selector: ".root-module",
        style: {
          "background-color": "#2c3e50",
          "border-color": "#34495e",
          "border-width": 3,
          label: "data(label)",
          "text-valign": "center",
          "text-halign": "center",
          color: "#ffffff",
          "font-size": "14px",
          "font-weight": "bold",
          width: 120,
          height: 60,
          shape: "round-rectangle",
          "text-wrap": "wrap",
          "text-max-width": "100px",
        },
      },

      // Sub-module nodes
      {
        selector: ".sub-module",
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
          width: 100,
          height: 50,
          shape: "round-rectangle",
          "text-wrap": "wrap",
          "text-max-width": "80px",
        },
      },

      // General module nodes (fallback)
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
          width: 100,
          height: 50,
          shape: "round-rectangle",
          "text-wrap": "wrap",
          "text-max-width": "80px",
        },
      },

      // File nodes (smaller, less prominent)
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
          "font-size": "9px",
          width: 50,
          height: 25,
          shape: "ellipse",
          "text-wrap": "wrap",
          "text-max-width": "40px",
        },
      },

      // Complexity colors for modules
      {
        selector: ".module-node.complexity-low",
        style: {
          "background-color": "#27ae60",
          "border-color": "#229954",
        },
      },
      {
        selector: ".module-node.complexity-medium",
        style: {
          "background-color": "#f39c12",
          "border-color": "#e67e22",
        },
      },
      {
        selector: ".module-node.complexity-high",
        style: {
          "background-color": "#e74c3c",
          "border-color": "#c0392b",
        },
      },

      // Complexity colors for files
      {
        selector: ".file-node.complexity-low",
        style: {
          "background-color": "#2ecc71",
          "border-color": "#27ae60",
        },
      },
      {
        selector: ".file-node.complexity-medium",
        style: {
          "background-color": "#f1c40f",
          "border-color": "#f39c12",
        },
      },
      {
        selector: ".file-node.complexity-high",
        style: {
          "background-color": "#e67e22",
          "border-color": "#d35400",
        },
      },

      // Hierarchy edges (module to module)
      {
        selector: ".hierarchy-edge",
        style: {
          width: 3,
          "line-color": "#34495e",
          "target-arrow-color": "#34495e",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          "source-arrow-shape": "none",
          opacity: 0.8,
        },
      },

      // Contains edges (module to file)
      {
        selector: ".contains-edge",
        style: {
          width: 1,
          "line-color": "#bdc3c7",
          "target-arrow-color": "#bdc3c7",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          opacity: 0.6,
        },
      },

      // Dependency edges
      {
        selector: ".dependency-edge",
        style: {
          width: 1,
          "line-color": "#9b59b6",
          "target-arrow-color": "#9b59b6",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          "line-style": "dashed",
          opacity: 0.7,
        },
      },

      // Hover effects
      {
        selector: "node:selected",
        style: {
          "border-width": 4,
          "border-color": "#e74c3c",
          "overlay-color": "#e74c3c",
          "overlay-opacity": 0.2,
        },
      },

      // Active/highlighted nodes
      {
        selector: ".highlighted",
        style: {
          "border-width": 4,
          "border-color": "#f39c12",
          "overlay-color": "#f39c12",
          "overlay-opacity": 0.3,
        },
      },

      // Hidden nodes (for filtering)
      {
        selector: ".filtered-out",
        style: {
          opacity: 0.2,
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
      case "toggleFolderExpansion":
        this.handleFolderExpansion(message.folderId, message.isExpanded);
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
   * Handle folder expansion/collapse
   */
  private handleFolderExpansion(folderId: string, isExpanded: boolean): void {
    try {
      if (!this.currentData?.code_graph_json) {
        this.errorHandler.logError(
          "No code graph data available for folder expansion",
          null,
          "FullCodeAnalysisWebview"
        );
        return;
      }

      // Update the expansion state in the data
      this.updateFolderExpansionState(
        this.currentData.code_graph_json,
        folderId,
        isExpanded
      );

      // Regenerate and update the graph
      const updatedGraphData = this.prepareGraphData(this.currentData);

      // Send updated graph data to webview
      if (this.panel) {
        this.panel.webview.postMessage({
          command: "updateGraph",
          elements: updatedGraphData.elements,
          style: updatedGraphData.style,
          layout: updatedGraphData.layout,
          state: updatedGraphData.state,
        });
      }

      this.errorHandler.logError(
        "Folder expansion handled",
        { folderId, isExpanded },
        "FullCodeAnalysisWebview"
      );
    } catch (error) {
      this.errorHandler.logError(
        "Failed to handle folder expansion",
        error,
        "FullCodeAnalysisWebview"
      );
    }
  }

  /**
   * Update folder expansion state in the hierarchical data
   */
  private updateFolderExpansionState(
    nodes: any[],
    folderId: string,
    isExpanded: boolean
  ): boolean {
    for (const node of nodes) {
      const nodeId = this.generateNodeId([node.name]);

      if (nodeId === folderId && node.type === "folder") {
        node.isExpanded = isExpanded;
        return true;
      }

      if (node.children && Array.isArray(node.children)) {
        if (
          this.updateFolderExpansionState(node.children, folderId, isExpanded)
        ) {
          return true;
        }
      }
    }

    return false;
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
    if (!this.panel) {
      return;
    }

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
