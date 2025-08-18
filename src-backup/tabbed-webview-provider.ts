import * as vscode from "vscode";
import {
  WebviewAnalysisData,
  convertAnalysisDataForWebview,
  convertCurrentFileAnalysisData,
  convertGitAnalyticsData,
  generateNonce,
  getResourceUris,
} from "./core/webview-utils";
import { DedicatedAnalysisViewManager } from "./core/dedicated-analysis-view-manager";
import {
  DedicatedAnalysisView,
  AnalysisViewState,
  EnhancedGraphData,
} from "./types/dedicated-analysis-types";

export class TabbedWebviewProvider {
  private panel?: vscode.WebviewPanel;
  private context: vscode.ExtensionContext;
  private outputChannel: vscode.OutputChannel;
  private analysisData: any = null;
  private currentTab = "techstack";
  private webviewReady = false;
  private messageQueue: any[] = [];
  private dedicatedViewManager: DedicatedAnalysisViewManager;

  constructor(
    context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
  ) {
    this.context = context;
    this.outputChannel = outputChannel;
    this.dedicatedViewManager = new DedicatedAnalysisViewManager(
      context,
      outputChannel
    );

    this.log("TabbedWebviewProvider constructed");
  }

  public showFullAnalysis(analysisData: any) {
    this.log("Starting full analysis view");

    try {
      // Create safe data structure immediately
      this.analysisData = this.createSafeDataStructure(analysisData);
      this.log("Created safe analysis data structure");
    } catch (error) {
      this.logError("Failed to create safe analysis data", error);
      this.analysisData = {
        isEmpty: true,
        error: "Failed to process analysis data",
        message: "Analysis data could not be processed"
      };
    }

    this.currentTab = "techstack";
    
    // Ensure webview is ready before posting data
    this.createOrShowWebview();
    
    // Add a small delay to ensure webview is fully initialized
    setTimeout(() => {
      this.postUpdateData();
    }, 100);
  }

  public showTab(tabId: string, analysisData?: any) {
    if (analysisData) {
      this.analysisData = this.createSafeDataStructure(analysisData);
    }
    this.currentTab = tabId;
    this.log(`Switching to tab: ${tabId}${analysisData ? " with new data" : ""}`);
    this.createOrShowWebview();
    this.postUpdateData();
  }

  public showCurrentFileAnalysis(analysisData: any, view: "graph" | "json" = "graph") {
    this.analysisData = this.createSafeDataStructure(convertCurrentFileAnalysisData(analysisData));
    this.currentTab = view === "json" ? "codegraphjson" : "codegraph";
    this.log(`Showing current file analysis in ${this.currentTab} view`);
    this.createOrShowWebview();
    this.postUpdateData();
  }

  public showTechStackGraph(analysisData: any): void {
    this.log("Showing tech stack graph in tabbed view");
    this.analysisData = this.createSafeDataStructure(convertAnalysisDataForWebview(analysisData));
    this.currentTab = "techstack";
    this.createOrShowWebview();
    this.postUpdateData();
  }

  public showModuleGraph(analysisData: WebviewAnalysisData): void {
    this.log("Showing module graph in tabbed view");
    this.analysisData = this.createSafeDataStructure(analysisData);
    this.currentTab = "codegraph";
    this.createOrShowWebview();
    this.postUpdateData();
  }

  public showGitAnalytics(analysisData: any, analysisType: string): void {
    this.log(`Showing Git analytics for ${analysisType}`);
    const webviewData = convertGitAnalyticsData(analysisData, analysisType);
    this.analysisData = this.createSafeDataStructure(webviewData);

    switch (analysisType) {
      case "contributors":
      case "author_statistics":
        this.currentTab = "gitcontributors";
        break;
      case "commits":
      case "commit_timeline":
        this.currentTab = "gitcommits";
        break;
      case "hotspots":
      case "file_changes":
        this.currentTab = "githotspots";
        break;
      default:
        this.currentTab = "gitanalytics";
    }

    this.createOrShowWebview();
    this.postUpdateData();
  }

  // Additional methods expected by other parts of the codebase
  public switchToTab(tabId: string, view?: string): void {
    const newTab = view ? (view === "json" ? `${tabId}json` : tabId) : tabId;
    if (this.currentTab !== newTab) {
      this.log(`Switching view from ${this.currentTab} to: ${newTab}`);
      this.currentTab = newTab;
      if (this.panel) {
        this.postUpdateData();
      }
    }
  }

  public showTabLoadingState(tabId: string, message?: string): void {
    this.currentTab = tabId;
    const loadingMessage = message || "Loading...";
    this.log(`Setting loading state for tab ${tabId}: ${loadingMessage}`);
    this.enqueueMessage({
      command: "updateLoading",
      tabId,
      message: loadingMessage,
    });
  }

  public showTabErrorState(tabId: string, error: string, showRetry = false): void {
    this.currentTab = tabId;
    this.enqueueMessage({
      command: "updateError",
      tabId,
      error,
      showRetry,
    });
  }

  public showCallHierarchy(analysisData: WebviewAnalysisData, functionName: string): void {
    this.log(`Showing call hierarchy for function: ${functionName}`);
    this.analysisData = this.createSafeDataStructure({ ...analysisData, selectedFunction: functionName });
    this.currentTab = "codegraph";
    this.createOrShowWebview();
    this.postUpdateData();
  }

  public updateAnalysisData(analysisData: WebviewAnalysisData | null): void {
    this.analysisData = analysisData ? this.createSafeDataStructure(analysisData) : null;
    if (this.panel && this.panel.visible) {
      this.postUpdateData();
    }
  }

  public showDBSchema(data: any): void {
    this.log("Showing DB Schema view");
    this.analysisData = this.createSafeDataStructure(data);
    this.currentTab = "dbschema";
    this.createOrShowWebview();
    this.postUpdateData();
  }

  public showDatabaseSchemaGraph(data: any): void {
    this.log("Showing Database Schema ER Diagram");
    this.analysisData = this.createSafeDataStructure(data);
    this.currentTab = "dbschema";
    this.createOrShowWebview();
    this.postUpdateData();
  }

  public showDatabaseSchemaSQL(data: any): void {
    this.log("Showing Database Schema Raw SQL");
    this.analysisData = this.createSafeDataStructure(data);
    this.currentTab = "dbschemasql";
    this.createOrShowWebview();
    this.postUpdateData();
  }

  /**
   * Show dedicated analysis view
   */
  public async showDedicatedAnalysisView(
    viewType: "fullCode" | "currentFile" | "gitAnalytics",
    analysisData?: any
  ): Promise<void> {
    this.log(`Showing dedicated analysis view: ${viewType}`);

    try {
      // Update view data if provided
      if (analysisData) {
        await this.dedicatedViewManager.updateViewData(viewType, analysisData);
        this.analysisData = this.createSafeDataStructure(analysisData);
      }

      // Set active view
      this.dedicatedViewManager.setActiveView(viewType);

      // Set appropriate initial tab based on view type
      switch (viewType) {
        case "fullCode":
        case "currentFile":
          this.currentTab = "techstack"; // Code analysis starts with Tech Stack
          break;
        case "gitAnalytics":
          this.currentTab = "gitanalytics"; // Git analytics starts with Overview
          break;
        default:
          this.currentTab = viewType;
      }

      // Create or show webview with proper initialization
      this.createOrShowWebview();
      
      // Ensure webview is ready before sending data
      if (this.webviewReady) {
        this.postUpdateData();
      } else {
        // Data will be sent when webview becomes ready
        this.log("Webview not ready, data will be sent when ready");
      }

      this.log(`Dedicated analysis view ${viewType} displayed successfully`);
    } catch (error) {
      this.logError(
        `Failed to show dedicated analysis view ${viewType}`,
        error
      );
      // Fallback to regular analysis view
      this.showFullAnalysis(analysisData);
    }
  }

  private createOrShowWebview() {
    const column = vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;
    
    if (this.panel) {
      try {
        this.panel.reveal(column, false);
        this.log(`Revealing existing webview panel`);
      } catch (e) {
        this.logError("Failed to reveal panel", e as Error);
      }
      return;
    }

    this.log("Creating new webview panel");
    this.panel = vscode.window.createWebviewPanel(
      "doracodebirdTabbedView",
      "DoraCodeBirdView",
      column,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
        this.webviewReady = false;
        this.log("Panel disposed");
      },
      null,
      this.context.subscriptions
    );

    this.panel.onDidChangeViewState(
      (e) => {
        if (e.webviewPanel.visible) {
          this.log(`Panel became visible, current tab: ${this.currentTab}`);
          this.flushMessageQueue();
        }
      },
      null,
      this.context.subscriptions
    );

    this.panel.webview.onDidReceiveMessage(
      (msg) => this.handleMessage(msg),
      null,
      this.context.subscriptions
    );
    
    this.panel.webview.html = this.getHtml();

    try {
      this.panel.reveal(column, false);
    } catch (e) {
      this.logError("Failed to reveal new panel", e as Error);
    }
  }

  private handleMessage(msg: any) {
    if (!msg || !msg.command) {
      this.log("Received invalid message");
      return;
    }

    try {
      switch (msg.command) {
        case "ready":
          this.webviewReady = true;
          this.log("Webview initialized and ready");
          this.flushMessageQueue();
          // Always send data when webview becomes ready
          this.postUpdateData();
          break;

        case "requestData":
          if (msg.tabId) {
            this.currentTab = msg.tabId;
          }
          this.log("Data request received");
          this.postUpdateData();
          break;

        case "log":
          this.log(`Webview: ${msg.text || ""}`);
          break;

        case "error":
          this.logError("Webview error", new Error(msg.message || "Unknown webview error"));
          break;

        default:
          this.log(`Unknown command: ${msg.command}`);
      }
    } catch (error) {
      this.logError("Message handling failed", error as Error);
    }
  }

  private enqueueMessage(message: any) {
    this.messageQueue.push(message);
    this.log(`Message queued: ${message.command}`);
    this.flushMessageQueue();
  }

  private flushMessageQueue() {
    if (!this.panel || !this.webviewReady) {
      this.log(`Cannot flush message queue - panel: ${!!this.panel}, ready: ${this.webviewReady}`);
      return;
    }

    this.log(`Flushing ${this.messageQueue.length} queued messages`);
    
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      try {
        const safeMessage = this.createSafeDataStructure(message);
        this.panel.webview.postMessage(safeMessage);
        this.log(`Message sent: ${message.command}`);
      } catch (error) {
        this.logError("Failed to send message", error as Error);
        // Don't break on individual message failures, continue with remaining messages
        continue;
      }
    }
  }

  private async postUpdateData() {
    this.log(`Preparing data update for tab: ${this.currentTab}`);

    try {
      let dataToSend = this.analysisData;

      if (!dataToSend) {
        dataToSend = {
          isEmpty: true,
          message: "No analysis data available",
        };
        this.log("No analysis data available, sending empty state");
      } else {
        this.log(`Sending analysis data with keys: ${Object.keys(dataToSend).join(', ')}`);
      }

      const messageData = {
        command: "updateData",
        data: {
          analysisData: dataToSend,
          currentTab: this.currentTab,
          timestamp: Date.now() // Add timestamp to help with debugging
        },
      };

      this.log(`Enqueueing data update message for tab: ${this.currentTab}`);
      this.enqueueMessage(messageData);
    } catch (error) {
      this.logError("Failed to prepare data update", error as Error);
      
      this.enqueueMessage({
        command: "updateData",
        data: {
          analysisData: {
            isEmpty: true,
            error: "Failed to load analysis data",
            message: error instanceof Error ? error.message : "Unknown error"
          },
          currentTab: this.currentTab,
          timestamp: Date.now()
        },
      });
    }
  }

  /**
   * Create a safe data structure with only essential analysis data
   */
  private createSafeDataStructure(data: any): any {
    if (!data || typeof data !== "object") {
      return data;
    }

    const safeData: any = {};

    // Extract only essential analysis data properties
    const essentialKeys = [
      "tech_stack",
      "techStack",
      "modules",
      "functions",
      "dependencies",
      "contributors",
      "commits",
      "fileChanges",
      "hotspots",
      "tables",
      "sql",
      "rawSQL",
      "gitAnalytics",
      "totalCommits",
      "totalContributors",
      "totalFiles",
      "frameworkPatterns",
      "framework_patterns",
      "isEmpty",
      "message",
      "error"
    ];

    for (const key of essentialKeys) {
      if (data[key] !== undefined) {
        try {
          safeData[key] = JSON.parse(JSON.stringify(data[key]));
        } catch (error) {
          // If serialization fails, create a minimal representation
          if (typeof data[key] === "object" && data[key] !== null) {
            safeData[key] = { _error: "Could not serialize this data" };
          } else {
            safeData[key] = data[key];
          }
        }
      }
    }

    return safeData;
  }

  private getHtml(): string {
    const nonce = generateNonce();
    const webview = this.panel?.webview;

    if (!webview) {
      return this.generateFallbackHtml("Webview not available");
    }

    try {
      const resourceUris = getResourceUris(this.context, webview);
      const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource} 'unsafe-eval'; img-src ${webview.cspSource} data:`;

      return this.generateSimpleHtml(nonce, csp, resourceUris);
    } catch (error) {
      this.logError("Failed to generate HTML", error as Error);
      return this.generateFallbackHtml("Failed to load analysis view");
    }
  }

  /**
   * Generate simple working HTML
   */
  private generateSimpleHtml(nonce: string, csp: string, resourceUris: any): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <meta http-equiv="Content-Security-Policy" content="${csp}"/>
    <title>DoraCodeBirdView Analysis</title>
    <style>
        body { 
            font-family: var(--vscode-font-family);
            margin: 0;
            padding: 20px;
            color: var(--vscode-editor-foreground);
            background: var(--vscode-editor-background);
        }
        .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 50vh;
            font-size: 16px;
            color: var(--vscode-descriptionForeground);
        }
        .content {
            padding: 20px;
        }
        .error {
            color: var(--vscode-errorForeground);
            padding: 20px;
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 6px;
        }
        .tech-section {
            margin-bottom: 20px;
            padding: 15px;
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 6px;
            border-left: 4px solid var(--vscode-focusBorder);
        }
        .tech-section h3 {
            margin: 0 0 10px 0;
            color: var(--vscode-foreground);
        }
        .tech-item {
            padding: 5px 10px;
            margin: 3px 0;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            font-family: monospace;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div id="loading" class="loading">
        Initializing analysis view...
    </div>
    <div id="content" class="content" style="display: none;">
        <h2>Analysis Results</h2>
        <div id="analysisContent"></div>
    </div>
    
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        let currentData = null;
        let initializationTimeout = null;
        
        function initialize() {
            console.log('Webview initializing...');
            
            // Set a timeout to detect if initialization is stuck
            initializationTimeout = setTimeout(() => {
                console.error('Webview initialization timeout - no data received');
                showInitializationError();
            }, 10000); // 10 second timeout
            
            vscode.postMessage({ command: 'ready' });
        }
        
        function showInitializationError() {
            const loading = document.getElementById('loading');
            if (loading) {
                loading.innerHTML = \`
                    <div class="error">
                        <h3>⚠️ Initialization Timeout</h3>
                        <p>The analysis view failed to initialize properly.</p>
                        <button onclick="retry()" style="margin: 10px; padding: 8px 16px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer;">Retry</button>
                        <button onclick="requestData()" style="margin: 10px; padding: 8px 16px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; border-radius: 4px; cursor: pointer;">Request Data</button>
                    </div>
                \`;
            }
        }
        
        window.addEventListener('message', event => {
            const message = event.data;
            console.log('Received message:', message.command, message.data?.timestamp);
            
            // Clear initialization timeout when we receive any message
            if (initializationTimeout) {
                clearTimeout(initializationTimeout);
                initializationTimeout = null;
            }
            
            switch (message.command) {
                case 'updateData':
                    handleDataUpdate(message.data);
                    break;
                case 'showError':
                    showError(message.error);
                    break;
                case 'updateLoading':
                    updateLoadingMessage(message.message);
                    break;
                default:
                    console.log('Unknown message command:', message.command);
            }
        });
        
        function handleDataUpdate(data) {
            console.log('Handling data update for tab:', data.currentTab);
            currentData = data.analysisData;
            
            hideLoading();
            renderContent();
        }
        
        function updateLoadingMessage(message) {
            const loading = document.getElementById('loading');
            if (loading) {
                loading.textContent = message || 'Loading...';
            }
        }
        
        function hideLoading() {
            const loading = document.getElementById('loading');
            const content = document.getElementById('content');
            if (loading) loading.style.display = 'none';
            if (content) content.style.display = 'block';
        }
        
        function showError(error) {
            const content = document.getElementById('analysisContent');
            if (content) {
                content.innerHTML = \`
                    <div class="error">
                        <h3>Error</h3>
                        <p>\${error.message || 'An error occurred'}</p>
                        <button onclick="retry()">Retry</button>
                    </div>
                \`;
            }
            hideLoading();
        }
        
        function renderContent() {
            const content = document.getElementById('analysisContent');
            if (!content) {
                console.error('Analysis content container not found');
                return;
            }
            
            if (!currentData || currentData.isEmpty) {
                content.innerHTML = \`
                    <div class="error">
                        <h3>No Data Available</h3>
                        <p>\${currentData?.message || currentData?.error || 'No analysis data available'}</p>
                        <button onclick="retry()">Retry</button>
                    </div>
                \`;
                return;
            }

            // Render tech stack if available
            const techStack = currentData.techStack || currentData.tech_stack;
            if (techStack) {
                renderTechStack(techStack, content);
            } else {
                content.innerHTML = \`
                    <div>
                        <h3>Analysis Data Loaded</h3>
                        <p>Available data: \${Object.keys(currentData).join(', ')}</p>
                        <details>
                            <summary>Raw Data</summary>
                            <pre style="max-height: 300px; overflow-y: auto; background: var(--vscode-textCodeBlock-background); padding: 10px; border-radius: 4px;">\${JSON.stringify(currentData, null, 2)}</pre>
                        </details>
                    </div>
                \`;
            }
        }
        
        function renderTechStack(techStack, container) {
            let html = '<h3>🔧 Technology Stack</h3>';

            if (techStack.pythonVersion || techStack.python_version) {
                const version = techStack.pythonVersion || techStack.python_version;
                html += \`<div class="tech-section">
                    <h3>🐍 Python Runtime</h3>
                    <div class="tech-item">Python \${version}</div>
                </div>\`;
            }

            if (techStack.frameworks && techStack.frameworks.length > 0) {
                html += '<div class="tech-section"><h3>🏗️ Frameworks</h3>';
                techStack.frameworks.forEach(fw => {
                    const name = fw.name || fw;
                    const version = fw.version ? \` v\${fw.version}\` : '';
                    html += \`<div class="tech-item">\${name}\${version}</div>\`;
                });
                html += '</div>';
            }

            if (techStack.libraries && techStack.libraries.length > 0) {
                html += '<div class="tech-section"><h3>📚 Libraries</h3>';
                techStack.libraries.slice(0, 10).forEach(lib => {
                    const name = lib.name || lib;
                    const version = lib.version ? \` v\${lib.version}\` : '';
                    html += \`<div class="tech-item">\${name}\${version}</div>\`;
                });
                if (techStack.libraries.length > 10) {
                    html += \`<div class="tech-item">... and \${techStack.libraries.length - 10} more</div>\`;
                }
                html += '</div>';
            }

            container.innerHTML = html;
        }
        
        function retry() {
            console.log('Retrying analysis...');
            const loading = document.getElementById('loading');
            const content = document.getElementById('content');
            if (loading) {
                loading.style.display = 'flex';
                loading.textContent = 'Retrying...';
            }
            if (content) content.style.display = 'none';
            
            vscode.postMessage({ command: 'requestData' });
        }
        
        function requestData() {
            console.log('Requesting data...');
            vscode.postMessage({ command: 'requestData' });
        }
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initialize);
        } else {
            initialize();
        }
        
        // Log any JavaScript errors to help with debugging
        window.addEventListener('error', (event) => {
            console.error('JavaScript error:', event.error);
            vscode.postMessage({ 
                command: 'error', 
                message: event.error?.message || 'Unknown JavaScript error' 
            });
        });
    </script>
</body>
</html>`;
  }

  /**
   * Generate fallback HTML for error cases
   */
  private generateFallbackHtml(errorMessage: string): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <style>
        body { 
            font-family: var(--vscode-font-family);
            margin: 0;
            padding: 20px;
            color: var(--vscode-editor-foreground);
            background: var(--vscode-editor-background);
        }
        .error {
            color: var(--vscode-errorForeground);
            padding: 20px;
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 6px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="error">
        <h3>Analysis View Error</h3>
        <p>${errorMessage}</p>
        <p>Please try refreshing the view or contact support if the issue persists.</p>
    </div>
</body>
</html>`;
  }

  /**
   * Get webview state for debugging
   */
  public getWebviewState(): any {
    return {
      hasPanel: !!this.panel,
      webviewReady: this.webviewReady,
      currentTab: this.currentTab,
      hasAnalysisData: !!this.analysisData,
      messageQueueLength: this.messageQueue.length,
      panelVisible: this.panel?.visible || false
    };
  }

  /**
   * Force webview refresh
   */
  public refreshWebview(): void {
    this.log("Forcing webview refresh");
    this.webviewReady = false;
    this.messageQueue = [];
    
    if (this.panel) {
      this.panel.dispose();
      this.panel = undefined;
    }
    
    this.createOrShowWebview();
  }

  private log(message: string): void {
    this.outputChannel.appendLine(`[TabbedWebviewProvider] ${message}`);
  }

  private logError(message: string, error: any): void {
    this.outputChannel.appendLine(`[TabbedWebviewProvider ERROR] ${message}: ${error?.message || error}`);
    if (error?.stack) {
      this.outputChannel.appendLine(error.stack);
    }
  }
}