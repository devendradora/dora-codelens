import * as vscode from "vscode";
import * as path from "path";
import { ErrorHandler } from "../core/error-handler";

/**
 * Current File Analysis Webview Provider
 * Provides dedicated webview for displaying current file analysis results
 */
export class CurrentFileAnalysisWebview {
  private static readonly VIEW_TYPE = "doracodelens.currentFileAnalysis";
  private panel: vscode.WebviewPanel | null = null;
  private errorHandler: ErrorHandler;
  private extensionPath: string;
  private currentData: any = null;
  private currentFilePath: string | null = null;

  constructor(errorHandler: ErrorHandler, extensionPath: string) {
    this.errorHandler = errorHandler;
    this.extensionPath = extensionPath;
  }

  /**
   * Show the current file analysis webview
   */
  public show(analysisData: any, filePath?: string): void {
    try {
      this.currentData = analysisData;
      this.currentFilePath = filePath || null;

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
        "Current file analysis webview shown",
        { filePath },
        "CurrentFileAnalysisWebview"
      );
    } catch (error) {
      this.errorHandler.logError(
        "Failed to show current file analysis webview",
        error,
        "CurrentFileAnalysisWebview"
      );
      throw error;
    }
  }

  /**
   * Create the webview panel
   */
  private createPanel(): void {
    this.panel = vscode.window.createWebviewPanel(
      CurrentFileAnalysisWebview.VIEW_TYPE,
      "Current File Analysis",
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
        "Current file analysis webview disposed",
        null,
        "CurrentFileAnalysisWebview"
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
        "Failed to update current file analysis content",
        error,
        "CurrentFileAnalysisWebview"
      );
      this.showError("Failed to display analysis results");
    }
  }

  /**
   * Generate HTML content for the webview
   */
  private generateHTML(analysisData: any): string {
    const webview = this.panel!.webview;

    // Get resource URIs
    const cssUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.extensionPath, "resources", "webview.css"))
    );
    // Try multiple possible paths for Chart.js in production vs development
    let chartJsUri;
    const possibleChartJsPaths = [
      path.join(
        this.extensionPath,
        "node_modules",
        "chart.js",
        "dist",
        "chart.umd.min.js"
      ),
      path.join(
        this.extensionPath,
        "node_modules",
        "chart.js",
        "dist",
        "chart.min.js"
      ),
      path.join(this.extensionPath, "resources", "chart.min.js"), // fallback location
    ];

    // Use the first path that exists, or default to the first one
    chartJsUri = webview.asWebviewUri(vscode.Uri.file(possibleChartJsPaths[0]));
    // Try multiple possible paths for Cytoscape in production vs development
    let cytoscapeUri;
    const possibleCytoscapePaths = [
      path.join(
        this.extensionPath,
        "node_modules",
        "cytoscape",
        "dist",
        "cytoscape.min.js"
      ),
      path.join(
        this.extensionPath,
        "node_modules",
        "cytoscape",
        "dist",
        "cytoscape.js"
      ),
      path.join(this.extensionPath, "resources", "cytoscape.min.js"), // fallback location
    ];

    // Use the first path that exists, or default to the first one
    cytoscapeUri = webview.asWebviewUri(
      vscode.Uri.file(possibleCytoscapePaths[0])
    );

    // Debug logging for resource URIs
    this.errorHandler.logError(
      "Webview resource URIs generated",
      {
        cssUri: cssUri.toString(),
        chartJsUri: chartJsUri.toString(),
        cytoscapeUri: cytoscapeUri.toString(),
        extensionPath: this.extensionPath,
      },
      "CurrentFileAnalysisWebview"
    );

    // Generate tab contents
    const tabContents = this.generateTabContents(analysisData);

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Current File Analysis</title>
        <link rel="stylesheet" href="${cssUri}">
        <meta http-equiv="Content-Security-Policy" content="
          default-src 'none';
          img-src ${webview.cspSource} https: data: blob:;
          script-src ${
            webview.cspSource
          } 'unsafe-inline' 'unsafe-eval' blob: data:;
          style-src ${webview.cspSource} 'unsafe-inline' blob: data:;
          font-src ${webview.cspSource} https: data:;
          connect-src ${webview.cspSource} https: data: blob:;
          worker-src ${webview.cspSource} blob: data:;
        ">
        <style>
          ${this.generateStyles()}
        </style>
      </head>
      <body>
        <div class="analysis-container">
          <!-- Navigation Links -->
          <div class="navigation-bar">
            <div class="nav-links">
              <button class="nav-link active" data-tab="file-overview-section">
                <span class="nav-icon">📄</span>
                <span class="nav-label">File Overview</span>
              </button>
              <button class="nav-link" data-tab="mind-map-section">
                <span class="nav-icon">�️</sapan>
                <span class="nav-label">Mind Map</span>
              </button>
              <button class="nav-link" data-tab="dependencies-section">
                <span class="nav-icon">�<//span>
                <span class="nav-label">Dependencies</span>
              </button>
            </div>
          </div>

          <!-- Scrollable Content -->
          <div class="scrollable-content">
            <!-- File Overview Section -->
            <section id="file-overview-section" class="content-section active">
              <div class="section-header">
                 <div class="file-actions">
                  <button class="action-btn refresh-btn" onclick="refreshAnalysis()">
                    🔄 Refresh
                  </button>
                  <button class="action-btn export-btn" onclick="exportReport()">
                    💾 Export Report
                  </button>
                </div>
              </div>
              <div class="section-content">
                ${tabContents.fileOverview}
              </div>
            </section>

            <!-- Mind Map Section -->
            <section id="mind-map-section" class="content-section">
              <div class="section-header" style="margin-bottom: 16px;">
                <h2 style="margin: 0 0 16px 0;">🕸️ Mind Map Visualization</h2>
                <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                  <!-- Quick Controls -->
                  <div style="display: flex; gap: 8px; flex-wrap: wrap; padding: 8px; background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 5px;">
                    <button id="zoom-in-btn" style="padding: 6px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer; font-size: 14px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;" title="Zoom In">🔍+</button>
                    <button id="zoom-out-btn" style="padding: 6px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer; font-size: 14px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;" title="Zoom Out">🔍-</button>
                    <button id="reset-view-btn" style="padding: 6px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer; font-size: 14px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;" title="Reset View">🎯</button>
                    <button id="fit-view-btn" style="padding: 6px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer; font-size: 14px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;" title="Fit to Screen">📐</button>
                    <button id="export-png-btn" style="padding: 6px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer; font-size: 14px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;" title="Export PNG">💾</button>
                  </div>
                  <!-- Layout Selector -->
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="font-size: 12px; color: var(--vscode-foreground); font-weight: 600;">Layout:</label>
                    <select id="layout-select" style="padding: 4px 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 3px; font-size: 12px; min-width: 120px;">
                      <option value="preset">Manual</option>
                      <option value="grid">Grid</option>
                      <option value="circle">Circle</option>
                      <option value="concentric" selected>Concentric</option>
                      <option value="breadthfirst">Breadth First</option>
                      <option value="cose">Force-directed</option>
                      <option value="dagre">Hierarchical</option>
                      <option value="random">Random</option>
                    </select>
                  </div>
                  <!-- Search -->
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <input type="text" id="search-input" placeholder="Search elements..." 
                           style="padding: 6px 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 3px; font-size: 12px; width: 200px;">
                    <div id="search-results" style="font-size: 11px; color: var(--vscode-descriptionForeground); min-width: 100px;"></div>
                  </div>
                </div>
              </div>
              <div class="section-content" style="position: relative; padding: 0;">
                ${tabContents.mindMap}
              </div>
            </section>

            <!-- Dependencies Section -->
            <section id="dependencies-section" class="content-section">
              <div class="section-content">
                ${tabContents.dependencies}
              </div>
            </section>
          </div>
        </div>

        <!-- Scripts -->
        <script src="${chartJsUri}" onerror="console.error('Failed to load Chart.js')"></script>
        <script src="${cytoscapeUri}" onerror="console.error('Failed to load Cytoscape.js'); window.cytoscapeLoadFailed = true;"></script>
        <script>
          // Fallback Cytoscape loading
          window.cytoscapeLoadAttempts = 0;
          window.cytoscapeLoadFailed = false;
          
          // Enhanced debugging for production issues
          console.log('[Debug] Script loading started');
          console.log('[Debug] User agent:', navigator.userAgent);
          console.log('[Debug] VS Code webview context:', typeof acquireVsCodeApi !== 'undefined');
          
          // Check script loading status
          function checkScriptLoading() {
            console.log('[Debug] Script loading status:', {
              chartJs: typeof Chart !== 'undefined',
              cytoscape: typeof cytoscape !== 'undefined',
              cytoscapeLoadFailed: window.cytoscapeLoadFailed
            });
          }
          
          // Check immediately and after delays
          checkScriptLoading();
          setTimeout(checkScriptLoading, 1000);
          setTimeout(checkScriptLoading, 3000);
          
          // Check if Cytoscape loaded after a delay
          setTimeout(() => {
            if (typeof cytoscape === 'undefined' && !window.cytoscapeLoadFailed) {
              console.warn('[Fallback] Cytoscape not detected after 2s, marking as failed');
              window.cytoscapeLoadFailed = true;
            }
          }, 2000);
          
          // Additional fallback check
          setTimeout(() => {
            if (typeof cytoscape === 'undefined') {
              console.error('[Fallback] Cytoscape definitely failed to load after 5s');
              window.cytoscapeLoadFailed = true;
            }
          }, 5000);
        </script>
        <script>
          const vscode = acquireVsCodeApi();
          const analysisData = ${JSON.stringify(analysisData)};
          const filePath = ${JSON.stringify(this.currentFilePath)};
          
          // Initialize when DOM is ready
          document.addEventListener('DOMContentLoaded', function() {
            console.log('[DOM] DOM content loaded, initializing...');
            console.log('[DOM] Analysis data available:', {
              hasAnalysisData: !!analysisData,
              analysisDataKeys: analysisData ? Object.keys(analysisData) : null,
              filePath: filePath
            });
            initializeTabs();
            
            // Initialize charts immediately since they're now in the file overview tab
            console.log('[DOM] Initializing charts immediately');
            initializeCharts();
            
            // Set up a watchdog timer to detect stuck mind map initialization
            setTimeout(() => {
              const loadingElement = document.getElementById('graph-loading');
              const container = document.getElementById('enhanced-graph');
              
              if (loadingElement && loadingElement.style.display !== 'none' && 
                  container && container.style.display !== 'block' && 
                  !window.mindMapInitialized) {
                console.warn('[Watchdog] Mind map appears to be stuck, adding retry button');
                
                // Add a retry button to the loading state
                const retryButton = document.createElement('button');
                retryButton.textContent = '🔄 Retry Mind Map';
                retryButton.style.cssText = 'margin-top: 16px; padding: 8px 16px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer;';
                retryButton.onclick = () => {
                  console.log('[Watchdog] Manual retry triggered');
                  window.cytoscapeLoadAttempts = 0;
                  window.mindMapInitialized = false;
                  window.cytoscapeLoadFailed = false;
                  
                  // Reset loading state
                  const loadingElement = document.getElementById('graph-loading');
                  const container = document.getElementById('enhanced-graph');
                  if (loadingElement) loadingElement.style.display = 'block';
                  if (container) {
                    container.style.display = 'none';
                    container.innerHTML = '';
                  }
                  
                  // Remove retry button
                  const existingRetryBtn = document.getElementById('retry-button');
                  if (existingRetryBtn) existingRetryBtn.remove();
                  
                  initializeMindMap();
                };
                
                const loadingMessage = document.getElementById('loading-message');
                if (loadingMessage && !document.getElementById('retry-button')) {
                  retryButton.id = 'retry-button';
                  loadingMessage.parentNode.appendChild(retryButton);
                }
              }
            }, 10000); // Check after 10 seconds
          });
          
          function initializeTabs() {
            const navLinks = document.querySelectorAll('.nav-link');
            const contentSections = document.querySelectorAll('.content-section');

            navLinks.forEach(link => {
              link.addEventListener('click', function() {
                const targetTab = this.getAttribute('data-tab');
                
                // Remove active class from all nav links and content sections
                navLinks.forEach(nav => nav.classList.remove('active'));
                contentSections.forEach(section => section.classList.remove('active'));
                
                // Add active class to clicked nav link and corresponding content section
                this.classList.add('active');
                const targetSection = document.getElementById(targetTab);
                if (targetSection) {
                  targetSection.classList.add('active');
                  
                  // If switching to mind map tab, initialize graph if not already done
                  if (targetTab === 'mind-map-section' && !window.mindMapInitialized) {
                    setTimeout(() => {
                      initializeMindMap();
                    }, 100);
                  }
                }
              });
            });
          }
          
          function initializeCharts() {
            try {
              console.log('[Charts] Initializing charts...', {
                hasComplexityMetrics: !!analysisData.complexity_metrics,
                hasFunctionComplexities: !!(analysisData.complexity_metrics && analysisData.complexity_metrics.function_complexities),
                functionCount: analysisData.complexity_metrics?.function_complexities?.length || 0
              });
              
              // Initialize complexity chart
              if (analysisData.complexity_metrics && analysisData.complexity_metrics.function_complexities) {
                console.log('[Charts] Creating complexity chart...');
                createComplexityChart();
              } else {
                console.log('[Charts] Skipping complexity chart - no function complexities data');
              }
              
              // Initialize metrics chart
              if (analysisData.complexity_metrics) {
                console.log('[Charts] Creating metrics chart...');
                createMetricsChart();
              } else {
                console.log('[Charts] Skipping metrics chart - no complexity metrics data');
              }
              
              window.chartsInitialized = true;
              console.log('[Charts] Charts initialization completed');
            } catch (error) {
              console.error('Failed to initialize charts:', error);
            }
          }
          
          function createComplexityChart() {
            console.log('[ComplexityChart] Starting chart creation...');
            
            // Check if Chart.js is loaded
            if (typeof Chart === 'undefined') {
              console.error('[ComplexityChart] Chart.js is not loaded!');
              return;
            }
            
            const canvas = document.getElementById('complexityChart');
            if (!canvas) {
              console.error('[ComplexityChart] Canvas element not found!');
              return;
            }
            
            const ctx = canvas.getContext('2d');
            const functions = analysisData.complexity_metrics.function_complexities;
            
            // Validate that functions is an array
            if (!Array.isArray(functions)) {
              console.error('[ComplexityChart] Function complexities is not an array:', functions);
              return;
            }
            
            if (functions.length === 0) {
              console.warn('[ComplexityChart] No functions to display');
              return;
            }
            
            // Debug logging for data structure validation
            console.log('[ComplexityChart] Processing function complexities:', {
              count: functions.length,
              firstFunction: functions[0],
              functionKeys: functions[0] ? Object.keys(functions[0]) : null
            });
            
            const labels = functions.map(f => f.name || 'Unknown Function');
            
            const data = functions.map(f => {
              const complexityObj = f.complexity || {};
              return complexityObj.cyclomatic || complexityObj.complexity || 0;
            });
            
            const colors = functions.map(f => {
              const complexityObj = f.complexity || {};
              const complexity = complexityObj.cyclomatic || complexityObj.complexity || 0;
              if (complexity <= 5) return '#27ae60';
              if (complexity <= 10) return '#f39c12';
              return '#e74c3c';
            });
            
            console.log('[ComplexityChart] Chart data prepared:', {
              labels: labels,
              data: data,
              colors: colors
            });
            
            new Chart(ctx, {
              type: 'bar',
              data: {
                labels: labels,
                datasets: [{
                  label: 'Cyclomatic Complexity',
                  data: data,
                  backgroundColor: colors,
                  borderColor: colors,
                  borderWidth: 1
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Complexity Score'
                    }
                  },
                  x: {
                    title: {
                      display: true,
                      text: 'Functions'
                    }
                  }
                }
              }
            });
            
            console.log('[ComplexityChart] Chart created successfully');
          }
          
          function createMetricsChart() {
            console.log('[MetricsChart] Starting chart creation...');
            
            // Check if Chart.js is loaded
            if (typeof Chart === 'undefined') {
              console.error('[MetricsChart] Chart.js is not loaded!');
              return;
            }
            
            const canvas = document.getElementById('metricsChart');
            if (!canvas) {
              console.error('[MetricsChart] Canvas element not found!');
              return;
            }
            
            const ctx = canvas.getContext('2d');
            const metrics = analysisData.complexity_metrics;
            const overallComplexity = metrics.overall_complexity || {};
            
            console.log('[MetricsChart] Metrics data:', {
              codeLines: metrics.code_lines,
              overallComplexity: overallComplexity,
              maintainabilityIndex: metrics.maintainability_index,
              functionCount: metrics.function_complexities?.length
            });
            
            new Chart(ctx, {
              type: 'radar',
              data: {
                labels: ['Lines of Code', 'Cyclomatic Complexity', 'Maintainability', 'Cognitive Complexity', 'Function Count'],
                datasets: [{
                  label: 'File Metrics',
                  data: [
                    Math.min((metrics.code_lines || 0) / 10, 100),
                    Math.min((overallComplexity.cyclomatic || 0) * 10, 100),
                    metrics.maintainability_index || 50,
                    Math.min((overallComplexity.cognitive || 0) * 10, 100),
                    Math.min((metrics.function_complexities?.length || 0) * 5, 100)
                  ],
                  backgroundColor: 'rgba(52, 152, 219, 0.2)',
                  borderColor: 'rgba(52, 152, 219, 1)',
                  borderWidth: 2
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  r: {
                    beginAtZero: true,
                    max: 100
                  }
                }
              }
            });
            
            console.log('[MetricsChart] Chart created successfully');
          }
          
          function refreshAnalysis() {
            vscode.postMessage({
              command: 'refreshAnalysis',
              filePath: filePath
            });
          }
          
          function exportReport() {
            console.log('[Export] Exporting report...', { filePath: filePath, hasData: !!analysisData });
            vscode.postMessage({
              command: 'exportReport',
              data: analysisData,
              filePath: filePath || 'unknown_file'
            });
          }
          
          function showMindMapFallback() {
            console.log('[MindMap] Showing fallback text-based view');
            
            const container = document.getElementById('enhanced-graph');
            const loadingElement = document.getElementById('graph-loading');
            
            if (!container || !loadingElement) {
              console.error('[MindMap] Container elements not found for fallback');
              return;
            }
            
            // Hide loading
            loadingElement.style.display = 'none';
            
            // Generate fallback content
            const fallbackContent = generateFallbackMindMap(analysisData);
            
            container.innerHTML = fallbackContent;
            container.style.display = 'block';
            container.style.padding = '20px';
            container.style.background = 'var(--vscode-editor-background)';
            container.style.border = '1px solid var(--vscode-panel-border)';
            container.style.borderRadius = '8px';
            container.style.maxHeight = '600px';
            container.style.overflowY = 'auto';
            
            console.log('[MindMap] Fallback view displayed');
          }
          
          function generateFallbackMindMap(data) {
            let html = '<div style="font-family: var(--vscode-font-family); color: var(--vscode-foreground);">';
            html += '<div style="background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); padding: 8px 12px; border-radius: 4px; margin-bottom: 16px; font-size: 12px;">⚠️ Interactive graph unavailable - showing text-based structure</div>';
            
            const fileName = filePath ? filePath.split('/').pop() : 'Current File';
            html += '<div style="margin-bottom: 20px;">';
            html += '<div style="font-size: 18px; font-weight: bold; color: var(--vscode-textLink-foreground); margin-bottom: 8px;">📄 ' + fileName + '</div>';
            
            // Add classes and methods
            if (data.complexity_metrics && data.complexity_metrics.class_complexities) {
              data.complexity_metrics.class_complexities.forEach(cls => {
                const methods = cls.methods || [];
                let avgComplexity = 0;
                if (methods.length > 0) {
                  const totalComplexity = methods.reduce((sum, method) => {
                    return sum + (method.complexity?.cyclomatic || 0);
                  }, 0);
                  avgComplexity = totalComplexity / methods.length;
                }
                
                html += '<div style="margin-left: 20px; margin-bottom: 12px;">';
                html += '<div style="font-size: 16px; font-weight: 600; color: var(--vscode-symbolIcon-classForeground); margin-bottom: 4px;">🏛️ ' + (cls.name || 'Unknown Class') + ' <span style="font-size: 12px; color: var(--vscode-descriptionForeground);">(avg complexity: ' + avgComplexity.toFixed(1) + ')</span></div>';
                
                methods.forEach(method => {
                  const complexity = method.complexity?.cyclomatic || 0;
                  const complexityColor = complexity <= 5 ? 'var(--vscode-testing-iconPassed)' : 
                                        complexity <= 10 ? 'var(--vscode-testing-iconQueued)' : 'var(--vscode-testing-iconFailed)';
                  
                  html += '<div style="margin-left: 40px; margin-bottom: 2px; font-size: 14px;">';
                  html += '<span style="color: var(--vscode-symbolIcon-methodForeground);">🔧</span> ';
                  html += '<span style="color: var(--vscode-foreground);">' + (method.name || 'Unknown Method') + '</span>';
                  html += '<span style="margin-left: 8px; font-size: 11px; color: ' + complexityColor + ';">complexity: ' + complexity + '</span>';
                  html += '</div>';
                });
                
                html += '</div>';
              });
            }
            
            // Add standalone functions
            if (data.complexity_metrics && data.complexity_metrics.function_complexities) {
              const methodNames = new Set();
              if (data.complexity_metrics.class_complexities) {
                data.complexity_metrics.class_complexities.forEach(cls => {
                  if (cls.methods) {
                    cls.methods.forEach(method => {
                      methodNames.add(method.name);
                    });
                  }
                });
              }
              
              const standaloneFunctions = data.complexity_metrics.function_complexities.filter(func => 
                !methodNames.has(func.name)
              );
              
              if (standaloneFunctions.length > 0) {
                html += '<div style="margin-left: 20px; margin-bottom: 12px;">';
                html += '<div style="font-size: 16px; font-weight: 600; color: var(--vscode-symbolIcon-functionForeground); margin-bottom: 4px;">⚙️ Standalone Functions</div>';
                
                standaloneFunctions.forEach(func => {
                  const complexity = func.complexity?.cyclomatic || func.complexity?.complexity || 0;
                  const complexityColor = complexity <= 5 ? 'var(--vscode-testing-iconPassed)' : 
                                        complexity <= 10 ? 'var(--vscode-testing-iconQueued)' : 'var(--vscode-testing-iconFailed)';
                  
                  html += '<div style="margin-left: 40px; margin-bottom: 2px; font-size: 14px;">';
                  html += '<span style="color: var(--vscode-symbolIcon-functionForeground);">🔧</span> ';
                  html += '<span style="color: var(--vscode-foreground);">' + (func.name || 'Unknown Function') + '</span>';
                  html += '<span style="margin-left: 8px; font-size: 11px; color: ' + complexityColor + ';">complexity: ' + complexity + '</span>';
                  html += '</div>';
                });
                
                html += '</div>';
              }
            }
            
            html += '</div>';
            html += '</div>';
            
            return html;
          }
          
          function initializeMindMap() {
            console.log('[MindMap] Initializing mind map...');
            
            // Initialize retry counter if not exists
            if (!window.cytoscapeLoadAttempts) {
              window.cytoscapeLoadAttempts = 0;
            }
            
            window.cytoscapeLoadAttempts++;
            console.log('[MindMap] Attempt #' + window.cytoscapeLoadAttempts);
            
            // Check if Cytoscape is available
            if (typeof cytoscape === 'undefined' || window.cytoscapeLoadFailed) {
              console.log('[MindMap] Cytoscape not available...');
              
              if (window.cytoscapeLoadAttempts > 25 || window.cytoscapeLoadFailed) {
                console.error('[MindMap] Cytoscape failed to load, showing fallback');
                showMindMapFallback();
                return;
              }
              
              console.log('[MindMap] Retrying in 200ms...');
              setTimeout(initializeMindMap, 200);
              return;
            }
            
            console.log('[MindMap] Cytoscape loaded successfully!');
            
            const container = document.getElementById('enhanced-graph');
            const loadingElement = document.getElementById('graph-loading');
            const legendElement = document.querySelector('.legend');
            
            if (!container || !loadingElement) {
              console.error('[MindMap] Required elements not found');
              return;
            }
            
            // Show progress
            const progressContainer = document.getElementById('progress-container');
            const progressBar = document.getElementById('progress-bar');
            const progressText = document.getElementById('progress-text');
            const performanceInfo = document.getElementById('performance-info');
            const cancelContainer = document.getElementById('cancel-container');
            
            if (progressContainer) progressContainer.style.display = 'block';
            if (performanceInfo) performanceInfo.style.display = 'block';
            if (cancelContainer) cancelContainer.style.display = 'block';
            
            let loadingCancelled = false;
            const loadingStartTime = Date.now();
            
            // Cancel button functionality
            const cancelBtn = document.getElementById('cancel-btn');
            if (cancelBtn) {
              cancelBtn.onclick = function() {
                loadingCancelled = true;
                showMindMapEmptyState();
              };
            }
            
            // Simulate progress
            let progress = 0;
            const progressInterval = setInterval(() => {
              if (loadingCancelled) {
                clearInterval(progressInterval);
                return;
              }
              progress += Math.random() * 15;
              if (progress > 90) progress = 90;
              if (progressBar) progressBar.style.width = progress + '%';
              if (progressText) progressText.textContent = Math.round(progress) + '%';
            }, 100);
            
            try {
              console.log('[MindMap] Generating graph data...');
              const graphData = generateMindMapData(analysisData);
              
              if (loadingCancelled) return;
              
              if (!graphData.nodes.length) {
                console.log('[MindMap] No graph data available');
                clearInterval(progressInterval);
                showMindMapEmptyState();
                return;
              }
              
              console.log('[MindMap] Graph data generated:', {
                nodes: graphData.nodes.length,
                edges: graphData.edges.length
              });
              
              // Update performance info
              const dataSize = (graphData.nodes.length + graphData.edges.length);
              if (document.getElementById('data-size')) {
                document.getElementById('data-size').textContent = dataSize + ' elements';
              }
              if (document.getElementById('optimization-mode')) {
                document.getElementById('optimization-mode').textContent = dataSize > 100 ? 'Performance' : 'Standard';
              }
              
              console.log('[MindMap] Creating Cytoscape instance...');
              
              // Create Cytoscape instance with error handling
              const cy = cytoscape({
                container: container,
                elements: graphData,
                style: [
                  {
                    selector: 'node',
                    style: {
                      'background-color': 'data(color)',
                      'label': 'data(label)',
                      'text-valign': 'center',
                      'text-halign': 'center',
                      'font-size': '12px',
                      'font-weight': '600',
                      'border-width': 2,
                      'border-color': '#fff',
                      'text-wrap': 'wrap',
                      'color': '#fff',
                      'text-outline-width': 1,
                      'text-outline-color': '#000'
                    }
                  },
                  {
                    selector: '.file',
                    style: {
                      'shape': 'rectangle',
                      'background-color': '#9b59b6',
                      'width': 180,
                      'height': 70,
                      'text-max-width': '160px'
                    }
                  },
                  {
                    selector: '.class',
                    style: {
                      'shape': 'hexagon',
                      'background-color': '#00bcd4',
                      'width': 200,
                      'height': 80,
                      'text-max-width': '180px'
                    }
                  },
                  {
                    selector: '.function',
                    style: {
                      'shape': 'ellipse',
                      'width': 140,
                      'height': 60,
                      'text-max-width': '120px'
                    }
                  },
                  {
                    selector: '.method',
                    style: {
                      'shape': 'ellipse',
                      'width': 140,
                      'height': 60,
                      'text-max-width': '120px'
                    }
                  },
                  {
                    selector: 'edge',
                    style: {
                      'width': 2,
                      'line-color': '#888',
                      'target-arrow-color': '#888',
                      'target-arrow-shape': 'triangle',
                      'curve-style': 'bezier'
                    }
                  },

                  {
                    selector: ':selected',
                    style: {
                      'border-width': 4,
                      'border-color': '#FFD700'
                    }
                  }
                ],
                layout: {
                  name: 'concentric',
                  fit: true,
                  padding: 30,
                  startAngle: 3.14159 / 4,
                  sweep: undefined,
                  clockwise: true,
                  equidistant: false,
                  minNodeSpacing: 10,
                  boundingBox: undefined,
                  avoidOverlap: true,
                  nodeDimensionsIncludeLabels: false,
                  height: undefined,
                  width: undefined,
                  spacingFactor: undefined,
                  concentric: function(node) {
                    if (node.hasClass('file')) return 10;
                    if (node.hasClass('class')) return 5;
                    if (node.hasClass('function')) return 3;
                    return 1;
                  },
                  levelWidth: function(nodes) {
                    return 2;
                  }
                }
              });
              
              if (loadingCancelled) return;
              
              // Complete progress
              clearInterval(progressInterval);
              if (progressBar) progressBar.style.width = '100%';
              if (progressText) progressText.textContent = '100%';
              
              // Update processing time
              const processingTime = ((Date.now() - loadingStartTime) / 1000).toFixed(1);
              if (document.getElementById('processing-time')) {
                document.getElementById('processing-time').textContent = processingTime + 's';
              }
              
              // Store globally for controls
              window.mindMapCy = cy;
              window.mindMapInitialized = true;
              
              // Show the graph and hide loading
              container.style.display = 'block';
              loadingElement.style.display = 'none';
              if (legendElement) legendElement.style.display = 'block';
              
              // Setup event handlers
              setupMindMapEventHandlers(cy);
              
              console.log('[MindMap] Mind map initialized successfully');
              
            } catch (error) {
              clearInterval(progressInterval);
              console.error('[MindMap] Error initializing mind map:', error);
              
              // If Cytoscape fails, show fallback
              if (error.message && (error.message.includes('cytoscape') || error.message.includes('Cytoscape'))) {
                console.log('[MindMap] Cytoscape error detected, showing fallback');
                showMindMapFallback();
              } else {
                showMindMapErrorState('Failed to initialize mind map: ' + error.message);
              }
            }
          }
          
          function generateMindMapData(data) {
            const nodes = [];
            const edges = [];
            let nodeId = 0;
            
            // Add file node as root
            const fileName = filePath ? filePath.split('/').pop() : 'Current File';
            nodes.push({
              data: {
                id: 'file_' + nodeId++,
                label: fileName,
                color: '#9b59b6',
                size: 120,
                type: 'file'
              },
              classes: 'file'
            });
            const fileNodeId = 'file_' + (nodeId - 1);
            
            // Add classes and their methods
            if (data.complexity_metrics && data.complexity_metrics.class_complexities) {
              data.complexity_metrics.class_complexities.forEach(cls => {
                const classNodeId = 'class_' + nodeId++;
                const methods = cls.methods || [];
                
                // Calculate average complexity for color
                let avgComplexity = 0;
                if (methods.length > 0) {
                  const totalComplexity = methods.reduce((sum, method) => {
                    return sum + (method.complexity?.cyclomatic || 0);
                  }, 0);
                  avgComplexity = totalComplexity / methods.length;
                }
                
                const complexityColor = avgComplexity <= 5 ? '#27ae60' : 
                                      avgComplexity <= 10 ? '#f39c12' : '#e74c3c';
                
                nodes.push({
                  data: {
                    id: classNodeId,
                    label: cls.name || 'Unknown Class',
                    color: '#00bcd4',
                    size: 130,
                    type: 'class',
                    complexity: avgComplexity.toFixed(1)
                  },
                  classes: 'class'
                });
                
                // Connect class to file
                edges.push({
                  data: {
                    id: 'edge_' + nodeId++,
                    source: fileNodeId,
                    target: classNodeId
                  }
                });
                
                // Add methods
                methods.forEach(method => {
                  const methodNodeId = 'method_' + nodeId++;
                  const methodComplexity = method.complexity?.cyclomatic || 0;
                  const methodColor = methodComplexity <= 5 ? '#27ae60' : 
                                    methodComplexity <= 10 ? '#f39c12' : '#e74c3c';
                  
                  nodes.push({
                    data: {
                      id: methodNodeId,
                      label: method.name || 'Unknown Method',
                      color: methodColor,
                      size: 90,
                      type: 'method',
                      complexity: methodComplexity
                    },
                    classes: 'method'
                  });
                  
                  // Connect method to class
                  edges.push({
                    data: {
                      id: 'edge_' + nodeId++,
                      source: classNodeId,
                      target: methodNodeId
                    }
                  });
                });
              });
            }
            
            // Add standalone functions
            if (data.complexity_metrics && data.complexity_metrics.function_complexities) {
              // Filter out methods that are already in classes
              const methodNames = new Set();
              if (data.complexity_metrics.class_complexities) {
                data.complexity_metrics.class_complexities.forEach(cls => {
                  if (cls.methods) {
                    cls.methods.forEach(method => {
                      methodNames.add(method.name);
                    });
                  }
                });
              }
              
              const standaloneFunctions = data.complexity_metrics.function_complexities.filter(
                func => !methodNames.has(func.name)
              );
              
              standaloneFunctions.forEach(func => {
                const funcNodeId = 'function_' + nodeId++;
                const funcComplexity = func.complexity?.cyclomatic || func.complexity?.complexity || 0;
                const funcColor = funcComplexity <= 5 ? '#27ae60' : 
                                funcComplexity <= 10 ? '#f39c12' : '#e74c3c';
                
                nodes.push({
                  data: {
                    id: funcNodeId,
                    label: func.name || 'Unknown Function',
                    color: funcColor,
                    size: 90,
                    type: 'function',
                    complexity: funcComplexity
                  },
                  classes: 'function'
                });
                
                // Connect function to file
                edges.push({
                  data: {
                    id: 'edge_' + nodeId++,
                    source: fileNodeId,
                    target: funcNodeId
                  }
                });
              });
            }
            
            return { nodes, edges };
          }
          
          function setupMindMapEventHandlers(cy) {
            // Helper function to safely add event listeners
            function safeAddEventListener(elementId, event, handler) {
              const element = document.getElementById(elementId);
              if (element) {
                element.addEventListener(event, handler);
              }
            }
            
            // Zoom In
            safeAddEventListener('zoom-in-btn', 'click', function() {
              cy.zoom(cy.zoom() * 1.25);
              cy.center();
            });
            
            // Zoom Out
            safeAddEventListener('zoom-out-btn', 'click', function() {
              cy.zoom(cy.zoom() * 0.8);
              cy.center();
            });
            
            // Reset View
            safeAddEventListener('reset-view-btn', 'click', function() {
              cy.zoom(1);
              cy.center();
            });
            
            // Fit View
            safeAddEventListener('fit-view-btn', 'click', function() {
              cy.fit();
            });
            
            // Export PNG
            safeAddEventListener('export-png-btn', 'click', function() {
              const png64 = cy.png({ scale: 2, full: true });
              const link = document.createElement('a');
              link.download = 'current-file-mind-map.png';
              link.href = png64;
              link.click();
            });
            
            // Layout Selector
            const layoutSelect = document.getElementById('layout-select');
            if (layoutSelect) {
              layoutSelect.addEventListener('change', function() {
                const selectedLayout = this.value;
                let layoutOptions = { name: selectedLayout, fit: true, padding: 30 };
                
                // Customize layout options based on selection
                switch (selectedLayout) {
                  case 'concentric':
                    layoutOptions.concentric = function(node) {
                      if (node.hasClass('file')) return 10;
                      if (node.hasClass('class')) return 5;
                      if (node.hasClass('function')) return 3;
                      return 1;
                    };
                    break;
                  case 'cose':
                    layoutOptions.idealEdgeLength = 100;
                    layoutOptions.nodeOverlap = 20;
                    layoutOptions.refresh = 20;
                    layoutOptions.randomize = false;
                    break;
                  case 'dagre':
                    layoutOptions.rankDir = 'TB';
                    layoutOptions.align = 'UL';
                    layoutOptions.ranker = 'longest-path';
                    break;
                  case 'breadthfirst':
                    layoutOptions.directed = true;
                    layoutOptions.roots = cy.nodes('.file');
                    break;
                }
                
                cy.layout(layoutOptions).run();
              });
            }
            
            // Search functionality
            const searchInput = document.getElementById('search-input');
            const searchResults = document.getElementById('search-results');
            if (searchInput && searchResults) {
              searchInput.addEventListener('input', function() {
                const query = this.value.toLowerCase().trim();
                
                if (query === '') {
                  // Reset all nodes
                  cy.nodes().style('opacity', 1);
                  cy.edges().style('opacity', 1);
                  searchResults.textContent = '';
                  return;
                }
                
                // Find matching nodes
                const matchingNodes = cy.nodes().filter(function(node) {
                  const label = node.data('label').toLowerCase();
                  return label.includes(query);
                });
                
                if (matchingNodes.length > 0) {
                  // Highlight matching nodes
                  cy.nodes().style('opacity', 0.3);
                  cy.edges().style('opacity', 0.3);
                  matchingNodes.style('opacity', 1);
                  
                  // Highlight connected edges
                  matchingNodes.connectedEdges().style('opacity', 1);
                  
                  searchResults.textContent = matchingNodes.length + ' match' + (matchingNodes.length !== 1 ? 'es' : '');
                  
                  // Focus on first match
                  if (matchingNodes.length === 1) {
                    cy.center(matchingNodes[0]);
                  }
                } else {
                  cy.nodes().style('opacity', 0.3);
                  cy.edges().style('opacity', 0.3);
                  searchResults.textContent = 'No matches';
                }
              });
            }
            
            // Node click handler for details
            cy.on('tap', 'node', function(evt) {
              const node = evt.target;
              const data = node.data();
              
              console.log('Node clicked:', data);
              
              // You could show a tooltip or details panel here
              // For now, just log the information
              if (data.complexity !== undefined) {
                console.log('Complexity:', data.complexity);
              }
            });
          }
          
          function showMindMapEmptyState() {
            const container = document.getElementById('enhanced-graph');
            const loadingElement = document.getElementById('graph-loading');
            const legendElement = document.querySelector('.legend');
            
            container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; text-align: center;"><div><div style="font-size: 48px; margin-bottom: 16px;">🕸️</div><h3>No Mind Map Data</h3><p>No structural data available to visualize.</p></div></div>';
            container.style.display = 'block';
            loadingElement.style.display = 'none';
            if (legendElement) legendElement.style.display = 'none';
          }
          
          function showMindMapErrorState(message) {
            const container = document.getElementById('enhanced-graph');
            const loadingElement = document.getElementById('graph-loading');
            const legendElement = document.querySelector('.legend');
            
            container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; text-align: center;"><div><div style="font-size: 48px; margin-bottom: 16px;">⚠️</div><h3>Mind Map Error</h3><p>' + message + '</p></div></div>';
            container.style.display = 'block';
            loadingElement.style.display = 'none';
            if (legendElement) legendElement.style.display = 'none';
          }
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Generate tab contents for the webview
   */
  private generateTabContents(analysisData: any): any {
    return {
      fileOverview: this.generateFileOverview(analysisData),
      dependencies: this.generateDependenciesTab(analysisData),
      mindMap: this.generateMindMapTab(analysisData),
    };
  }

  /**
   * Generate dependencies tab content with improved layout
   */
  private generateDependenciesTab(analysisData: any): string {
    const dependencyInfo = analysisData.dependency_info || {};
    const externalDeps = dependencyInfo.external_dependencies || [];
    const internalDeps = dependencyInfo.internal_dependencies || [];
    const imports = dependencyInfo.imports || [];

    let html = `
        <div class="dependencies-section">
          <div class="dependencies-grid">
            <!-- Internal Dependencies (Left) -->
            <div class="dependency-column">
              <h4 class="column-title">🏠 Internal Dependencies</h4>
              <div class="dependency-list">
    `;

    if (internalDeps.length > 0) {
      internalDeps.forEach((dep: string) => {
        html += `
          <div class="dependency-item">
            <span class="dependency-name">${dep}</span>
            <span class="dependency-type internal">Internal</span>
          </div>
        `;
      });
    } else {
      html += `<div class="no-data">No internal dependencies found</div>`;
    }

    html += `
              </div>
            </div>
            
            <!-- External Dependencies (Right) -->
            <div class="dependency-column">
              <h4 class="column-title">🌐 External Dependencies</h4>
              <div class="dependency-list">
    `;

    if (externalDeps.length > 0) {
      externalDeps.forEach((dep: string) => {
        html += `
          <div class="dependency-item">
            <span class="dependency-name">${dep}</span>
            <span class="dependency-type external">External</span>
          </div>
        `;
      });
    } else {
      html += `<div class="no-data">No external dependencies found</div>`;
    }

    html += `
              </div>
            </div>
          </div>
        </div>

        <!-- Imports Section -->
        <div class="imports-section">
          <h3 class="section-title">📥 Detailed Imports</h3>
          <div class="imports-grid">
    `;

    if (imports.length > 0) {
      imports.forEach((imp: any) => {
        const importType = imp.is_from_import ? "from-import" : "direct-import";
        const importTypeLabel = imp.is_from_import ? "FROM" : "DIRECT";

        html += `
          <div class="import-item">
            <div class="import-header">
              <span class="import-module">${imp.module}</span>
              <div class="import-meta">
                <span class="import-type ${importType}">${importTypeLabel}</span>
                <span class="import-line">Line ${imp.line_number}</span>
              </div>
            </div>
        `;

        if (imp.names && imp.names.length > 0) {
          html += `
            <div class="import-details">
              <span class="import-label">Imports:</span>
              <div class="import-names">
          `;

          imp.names.forEach((name: string) => {
            html += `<span class="import-name">${name}</span>`;
          });

          html += `</div>`;

          if (imp.alias) {
            html += `<span class="import-alias">as ${imp.alias}</span>`;
          }

          html += `</div>`;
        }

        html += `</div>`;
      });
    } else {
      html += `<div class="no-data">No imports found</div>`;
    }

    html += `
          </div>
        </div>
    `;

    return html;
  }

  /**
   * Generate mind map tab content
   */
  private generateMindMapTab(analysisData: any): string {
    let html = `
      <!-- Enhanced Loading with Progress -->
      <div id="graph-loading" style="text-align: center; padding: 40px; font-size: 16px;">
        <div style="margin-bottom: 24px;">
          <div id="loading-icon" style="font-size: 32px; margin-bottom: 16px;">🔄</div>
          <div id="loading-message" style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Initializing interactive mind map...</div>
          <div id="loading-details" style="font-size: 14px; color: var(--vscode-descriptionForeground); margin-bottom: 16px;">Analyzing file structure...</div>
        </div>
        
        <!-- Progress Bar -->
        <div id="progress-container" style="width: 300px; margin: 0 auto 16px; display: none;">
          <div style="background: var(--vscode-progressBar-background); height: 8px; border-radius: 4px; overflow: hidden;">
            <div id="progress-bar" style="background: var(--vscode-progressBar-foreground); height: 100%; width: 0%; transition: width 0.3s ease;"></div>
          </div>
          <div id="progress-text" style="font-size: 12px; margin-top: 4px; color: var(--vscode-descriptionForeground);">0%</div>
        </div>
        
        <!-- Performance Info -->
        <div id="performance-info" style="font-size: 12px; color: var(--vscode-descriptionForeground); margin-top: 16px; display: none;">
          <div>Data size: <span id="data-size">Calculating...</span></div>
          <div>Optimization mode: <span id="optimization-mode">Standard</span></div>
          <div>Processing time: <span id="processing-time">0s</span></div>
        </div>
        
        <!-- Cancel Button -->
        <div id="cancel-container" style="margin-top: 20px; display: none;">
          <button id="cancel-btn" style="padding: 8px 16px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; border-radius: 3px; cursor: pointer; font-size: 14px;">Cancel Loading</button>
        </div>
      </div>
      
      <div id="enhanced-graph" style="width: 100%; height: 600px; border: 1px solid var(--vscode-panel-border); display: none;"></div>
      
      <!-- Legend Panel (Bottom Right) -->
      <div class="legend" style="position: fixed; bottom: 16px; right: 16px; background: var(--vscode-editor-background); padding: 12px; border: 1px solid var(--vscode-panel-border); border-radius: 5px; font-size: 12px; display: none; z-index: 1000; min-width: 180px; max-height: 80vh; overflow-y: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="font-weight: bold; margin-bottom: 12px; font-size: 13px;">📊 Legend</div>
        
        <!-- Legend -->
        <div>
          <div style="margin-bottom: 6px;"><span style="display: inline-block; width: 20px; height: 12px; margin-right: 8px; vertical-align: middle; background: #9b59b6; border:1px solid #000; border-radius: 0px;"></span> File</div>
          <div style="margin-bottom: 6px;"><span style="display: inline-block; width: 20px; height: 12px; margin-right: 8px; vertical-align: middle; background: #00bcd4; clip-path: polygon(15% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%, 0% 50%);"></span> Class</div>
          <div style="margin-bottom: 6px;"><span style="display: inline-block; width: 16px; height: 16px; margin-right: 8px; vertical-align: middle; background: #2ecc71; border-radius: 50%;"></span> Function</div>
          <div style="margin-bottom: 6px;"><span style="display: inline-block; width: 16px; height: 16px; margin-right: 8px; vertical-align: middle; background: #f39c12; border-radius: 50%;"></span> Method</div>
          <div style="margin-bottom: 12px;"><span style="display: inline-block; width: 24px; height: 2px; margin-right: 8px; vertical-align: middle; background: #888;"></span> Contains</div>
          
          <!-- Complexity Legend -->
          <div style="font-weight: bold; margin-bottom: 8px; font-size: 12px;">Complexity:</div>
          <div style="margin-bottom: 4px;"><span style="display: inline-block; width: 16px; height: 16px; margin-right: 8px; vertical-align: middle; background: #27ae60; border-radius: 50%;"></span> Low (≤5)</div>
          <div style="margin-bottom: 4px;"><span style="display: inline-block; width: 16px; height: 16px; margin-right: 8px; vertical-align: middle; background: #f39c12; border-radius: 50%;"></span> Medium (6-10)</div>
          <div><span style="display: inline-block; width: 16px; height: 16px; margin-right: 8px; vertical-align: middle; background: #e74c3c; border-radius: 50%;"></span> High (>10)</div>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Generate styles for the webview
   */
  private generateStyles(): string {
    return `
      .analysis-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        font-family: var(--vscode-font-family);
        color: var(--vscode-foreground);
        background: var(--vscode-editor-background);
      }

      .navigation-bar {
        border-bottom: 1px solid var(--vscode-panel-border);
        background: var(--vscode-tab-activeBackground);
        padding: 0;
        flex-shrink: 0;
      }

      .nav-links {
        display: flex;
        overflow-x: auto;
      }

      .nav-link {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        background: none;
        border: none;
        color: var(--vscode-tab-inactiveForeground);
        border-bottom: 3px solid transparent;
        transition: all 0.3s ease;
        cursor: pointer;
        font-size: 14px;
        font-family: inherit;
      }

      .nav-link:hover {
        background: var(--vscode-tab-hoverBackground);
        color: var(--vscode-tab-activeForeground);
      }

      .nav-link.active {
        color: var(--vscode-tab-activeForeground);
        border-bottom-color: var(--vscode-focusBorder);
        background: var(--vscode-tab-activeBackground);
      }

      .scrollable-content {
        flex: 1;
        overflow: auto;
        padding: 24px;
      }

      .content-section {
        margin-bottom: 32px;
        display: none;
        position: relative;
        z-index: 1;
      }

      .content-section.active {
        display: block;
        position: relative;
        z-index: 1;
      }

      .section-header {
        margin-bottom: 16px;
      }

      .section-header h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
      }

      .section-content {
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border);
        border-radius: 6px;
        padding: 16px;
        position: relative;
        z-index: 2;
      }

      .file-info-header {
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--vscode-widget-border);
      }
      
      .file-header-content {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
      }
      
      .file-info {
        flex: 1;
      }
      
      .file-actions {
        flex-shrink: 0;
      }
      
      .refresh-btn {
        padding: 8px 12px;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        transition: background-color 0.2s ease;
      }
      
      .refresh-btn:hover {
        background: var(--vscode-button-hoverBackground);
      }
      
      .export-btn {
        padding: 8px 12px;
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        border: 1px solid var(--vscode-button-border);
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        transition: background-color 0.2s ease;
        margin-left: 8px;
      }
      
      .export-btn:hover {
        background: var(--vscode-button-secondaryHoverBackground);
      }
      
      .file-title {
        font-size: 24px;
        font-weight: 600;
        margin: 0 0 8px 0;
        color: var(--vscode-foreground);
      }
      
      .file-path {
        font-size: 14px;
        color: var(--vscode-descriptionForeground);
        font-family: monospace;
      }
      
      .file-timestamp {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        margin-top: 4px;
        opacity: 0.8;
      }
      
      .class-group {
        margin-bottom: 24px;
      }
      
      .class-group .class-name {
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 12px 0;
        color: var(--vscode-foreground);
        padding: 8px 12px;
        background: var(--vscode-editor-background);
        border-left: 4px solid var(--vscode-focusBorder);
        border-radius: 4px;
      }
      
      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 16px;
      }
      
      .info-item {
        background: var(--vscode-editor-background);
        padding: 12px;
        border-radius: 6px;
        border: 1px solid var(--vscode-widget-border);
      }
      
      .info-label {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 4px;
        font-weight: 500;
      }
      
      .info-value {
        font-size: 16px;
        font-weight: 600;
        color: var(--vscode-foreground);
      }
      
      .complexity-indicator {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .complexity-low {
        width: 60px;
        background: #27ae60;
        color: white;
      }
      
      .complexity-medium {
        background: #f39c12;
        color: white;
      }
      
      .complexity-high {
        background: #e74c3c;
        color: white;
      }
      
      .function-list {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      
      @media (max-width: 768px) {
        .function-list {
          grid-template-columns: 1fr;
        }
      }
      
      .function-item {
        background: var(--vscode-editor-background);
        padding: 12px;
        border-radius: 6px;
        border: 1px solid var(--vscode-widget-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .function-name {
        font-family: monospace;
        font-weight: 600;
        color: var(--vscode-foreground);
      }
      
      .function-complexity {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .class-complexities-section {
        margin-bottom: 32px;
        position: relative;
        z-index: 10;
        clear: both;
        width: 100%;
      }
      
      .class-complexities-list {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 24px;
        position: relative;
        z-index: 11;
        width: 100%;
      }
      
      @media (max-width: 768px) {
        .class-complexities-list {
          grid-template-columns: 1fr;
        }
      }
      
      .class-item {
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-widget-border);
        border-radius: 8px;
        overflow: hidden;
        position: relative;
        z-index: 11;
        min-width: 0;
        width: 100%;
      }
      
      .class-item.complexity-low {
        border-left: 4px solid #27ae60;
      }
      
      .class-item.complexity-medium {
        border-left: 4px solid #f39c12;
      }
      
      .class-item.complexity-high {
        border-left: 4px solid #e74c3c;
      }
      
      .class-header {
        padding: 16px;
        background: var(--vscode-editorGroupHeader-tabsBackground);
        border-bottom: 1px solid var(--vscode-widget-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: relative;
        z-index: 12;
      }
      
      .class-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .class-header .class-name {
        font-size: 16px;
        font-weight: 600;
        color: var(--vscode-foreground);
        margin: 0;
        padding: 0;
        background: none;
        border: none;
        border-radius: 0;
      }
      
      .base-classes {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        font-style: italic;
      }
      
      .class-complexity {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .complexity-value {
        font-weight: 600;
        font-size: 16px;
      }
      
      .class-methods {
        padding: 16px;
        position: relative;
        z-index: 12;
      }
      
      .methods-count {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 12px;
      }
      
      .methods-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      
      @media (max-width: 768px) {
        .methods-grid {
          grid-template-columns: 1fr;
        }
      }
      
      .method-item {
        background: var(--vscode-input-background);
        padding: 8px 12px;
        border-radius: 4px;
        border: 1px solid var(--vscode-input-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .method-name {
        font-family: monospace;
        font-size: 13px;
        color: var(--vscode-foreground);
      }
      
      .method-complexity {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
      }
      
      .dependency-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .dependencies-container {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      
      .dependencies-section {
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-widget-border);
        border-radius: 8px;
        padding: 16px;
      }
      
      .imports-section {
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-widget-border);
        border-radius: 8px;
        padding: 16px;
      }
      
      .section-title {
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 16px 0;
        color: var(--vscode-foreground);
        padding-bottom: 8px;
        border-bottom: 1px solid var(--vscode-widget-border);
      }
      
      .dependencies-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      
      .dependency-column {
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border);
        border-radius: 6px;
        padding: 12px;
      }
      
      .column-title {
        font-size: 14px;
        font-weight: 600;
        margin: 0 0 12px 0;
        color: var(--vscode-foreground);
      }
      
      .imports-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      
      @media (max-width: 768px) {
        .dependencies-grid,
        .imports-grid {
          grid-template-columns: 1fr;
        }
      }
      
      .charts-section {
        margin-top: 32px;
        position: relative;
        z-index: 1;
        clear: both;
      }
      
      .chart-container {
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-widget-border);
        border-radius: 8px;
        padding: 16px;
        margin: 24px 0;
        position: relative;
        z-index: 2;
        clear: both;
        display: block;
      }
      
      .chart-title {
        font-size: 14px;
        font-weight: 600;
        margin: 0 0 12px 0;
        color: var(--vscode-foreground);
      }
      
      .chart-canvas {
        width: 100% !important;
        height: 300px !important;
        position: relative;
        z-index: 2;
      }
      
      /* Ensure no floating elements overlay the content */
      .complexity-legend,
      .info-panel,
      .debug-panel,
      .debug-toggle {
        z-index: 1000 !important;
      }
      
      /* Ensure main content stays below floating elements but above background */
      .file-info-header,
      .info-grid,
      .function-list,
      .class-complexities-section,
      .class-complexities-list,
      .charts-section {
        position: relative;
        z-index: 10;
      }
      
      /* Prevent any floating or positioning issues */
      .section-content > * {
        position: relative;
        z-index: inherit;
      }
      
      .dependency-item {
        background: var(--vscode-editor-background);
        padding: 12px;
        border-radius: 6px;
        border: 1px solid var(--vscode-widget-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .dependency-name {
        font-family: monospace;
        color: var(--vscode-foreground);
      }
      
      .dependency-type {
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .dependency-type.external {
        background: var(--vscode-charts-orange);
        color: white;
      }
      
      .dependency-type.internal {
        background: var(--vscode-charts-blue);
        color: white;
      }
      
      .dependency-type.stdlib {
        background: var(--vscode-charts-green);
        color: white;
      }
      
      .dependency-type.framework {
        background: var(--vscode-charts-purple);
        color: white;
      }
      
      .imports-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .import-item {
        background: var(--vscode-input-background);
        padding: 12px;
        border-radius: 6px;
        border: 1px solid var(--vscode-input-border);
      }
      
      .import-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      
      .import-module {
        font-family: monospace;
        font-weight: 600;
        color: var(--vscode-foreground);
        font-size: 13px;
      }
      
      .import-meta {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .import-line {
        font-size: 10px;
        color: var(--vscode-descriptionForeground);
        background: var(--vscode-badge-background);
        padding: 2px 6px;
        border-radius: 3px;
      }
      
      .import-details {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      
      .import-label {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        font-weight: 500;
      }
      
      .import-type {
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .import-type.from-import {
        background: var(--vscode-charts-blue);
        color: white;
      }
      
      .import-type.direct-import {
        background: var(--vscode-charts-green);
        color: white;
      }
      
      .import-names {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }
      
      .import-name {
        font-family: monospace;
        font-size: 11px;
        background: var(--vscode-input-background);
        padding: 2px 4px;
        border-radius: 2px;
        border: 1px solid var(--vscode-input-border);
      }
      
      .import-alias {
        font-family: monospace;
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        font-style: italic;
      }
      
      .no-data {
        text-align: center;
        color: var(--vscode-descriptionForeground);
        padding: 20px;
        font-style: italic;
      }
      
      .info-note {
        background: var(--vscode-editorInfo-background);
        border: 1px solid var(--vscode-editorInfo-border);
        border-radius: 6px;
        padding: 12px;
        margin: 16px 0;
      }
      
      .info-note p {
        margin: 0;
        color: var(--vscode-editorInfo-foreground);
        font-size: 14px;
      }
      
      .chart-container {
        background: var(--vscode-editor-background);
        border-radius: 6px;
        padding: 16px;
        border: 1px solid var(--vscode-widget-border);
        margin-bottom: 16px;
      }
      
      .chart-title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 12px;
        color: var(--vscode-foreground);
      }
      
      .chart-canvas {
        max-height: 300px;
      }
      
      .empty-state {
        text-align: center;
        padding: 40px;
        color: var(--vscode-descriptionForeground);
      }
      
      .empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }
      
      .action-buttons {
        display: flex;
        gap: 8px;
        margin-top: 16px;
      }
      
      .action-btn {
        padding: 8px 16px;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        transition: background-color 0.2s ease;
      }
      
      .action-btn:hover {
        background: var(--vscode-button-hoverBackground);
      }
      
      .secondary-btn {
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        border: 1px solid var(--vscode-button-border);
      }
      
      .secondary-btn:hover {
        background: var(--vscode-button-secondaryHoverBackground);
      }
      
      /* Mind Map Styles */
      #loading-icon {
        animation: spin 2s linear infinite;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      /* Legend positioning fix for current file analysis */
      .legend {
        position: fixed !important;
        bottom: 16px !important;
        right: 16px !important;
        z-index: 1000 !important;
      }
    `;
  }

  /**
   * Generate file overview content
   */
  private generateFileOverview(analysisData: any): string {
    const fileName = this.currentFilePath
      ? path.basename(this.currentFilePath)
      : "Unknown File";
    const filePath = this.currentFilePath || "Unknown Path";

    // Format timestamp
    const timestamp =
      analysisData.analysis_timestamp ||
      analysisData.timestamp ||
      new Date().toISOString();
    const formattedTimestamp = new Date(timestamp).toLocaleString();

    let html = `
      <div class="file-info-header">
        <div class="file-header-content">
          <div class="file-info">
            <h1 class="file-title">${fileName}</h1>
            <div class="file-path">${filePath}</div>
            <div class="file-timestamp">📅 Analyzed: ${formattedTimestamp}</div>
          </div>
         
        </div>
      </div>
    `;

    // Basic file metrics
    if (analysisData.complexity_metrics) {
      const metrics = analysisData.complexity_metrics;
      const overallComplexity = metrics.overall_complexity || {
        level: "unknown",
        score: 0,
      };

      html += '<div class="info-grid">';

      html += `<div class="info-item">
        <div class="info-label">Lines of Code</div>
        <div class="info-value">${
          metrics.code_lines || metrics.lines_of_code || 0
        }</div>
      </div>`;

      html += `<div class="info-item">
        <div class="info-label">Functions</div>
        <div class="info-value">${
          metrics.function_complexities?.length || 0
        }</div>
      </div>`;

      html += `<div class="info-item">
        <div class="info-label">Classes</div>
        <div class="info-value">${metrics.class_complexities?.length || 0}</div>
      </div>`;

      html += `<div class="info-item">
        <div class="info-label">Maintainability Index</div>
        <div class="info-value">${
          metrics.maintainability_index?.toFixed(1) || "N/A"
        }</div>
      </div>`;

      html += `<div class="info-item">
        <div class="info-label">Overall Complexity</div>
        <div class="info-value">
          <span class="complexity-indicator complexity-${overallComplexity.level}">
            ${overallComplexity.level}
          </span>
        </div>
      </div>`;

      html += `<div class="info-item">
        <div class="info-label">Cyclomatic Complexity</div>
        <div class="info-value">${overallComplexity.cyclomatic || 0}</div>
      </div>`;

      html += `<div class="info-item">
        <div class="info-label">Cognitive Complexity</div>
        <div class="info-value">${overallComplexity.cognitive || 0}</div>
      </div>`;

      html += `<div class="info-item">
        <div class="info-label">Halstead Volume</div>
        <div class="info-value">${
          metrics.halstead_metrics?.volume?.toFixed(1) || "N/A"
        }</div>
      </div>`;

      html += "</div>";

      // Function complexities section - filter out methods that are in classes
      // TODO: Backend should return empty function_complexities for class-based code
      const hasClasses =
        metrics.class_complexities && metrics.class_complexities.length > 0;
      let functionsToShow = metrics.function_complexities || [];

      if (hasClasses) {
        // Get all method names from classes
        const methodNames = new Set();
        metrics.class_complexities.forEach((cls: any) => {
          if (cls.methods) {
            cls.methods.forEach((method: any) => {
              methodNames.add(method.name);
            });
          }
        });

        // Filter out functions that are actually methods in classes
        functionsToShow = functionsToShow.filter(
          (func: any) => !methodNames.has(func.name)
        );
      }

      if (functionsToShow.length > 0) {
        html +=
          '<h3 style="margin: 24px 0 16px 0; font-size: 18px; font-weight: 600;">Function Complexities</h3>';
        html += '<div class="function-list">';

        functionsToShow.forEach((func: any) => {
          const funcName = func.name || "Unknown Function";
          const complexityObj = func.complexity || {};
          const complexity =
            complexityObj.cyclomatic || complexityObj.complexity || 0;
          const complexityLevel =
            complexityObj.level ||
            (complexity <= 5 ? "low" : complexity <= 10 ? "medium" : "high");

          html += `<div class="function-item">
            <span class="function-name">${funcName}</span>
            <div class="function-complexity">
              <span>${complexity}</span>
              <span class="complexity-indicator complexity-${complexityLevel}">
                ${complexityLevel}
              </span>
            </div>
          </div>`;
        });

        html += "</div>";
      }

      // Class complexities section
      if (metrics.class_complexities && metrics.class_complexities.length > 0) {
        html += '<div class="class-complexities-section">';
        html +=
          '<h3 style="margin: 24px 0 16px 0; font-size: 18px; font-weight: 600;">Class Complexities</h3>';

        html += '<div class="class-complexities-list">';

        metrics.class_complexities.forEach((cls: any) => {
          const className = cls.name || "Unknown Class";
          const baseClasses = cls.base_classes || [];
          const methods = cls.methods || [];

          // Calculate average complexity for the class
          let totalComplexity = 0;
          let complexityCount = 0;
          methods.forEach((method: any) => {
            if (method.complexity && method.complexity.cyclomatic) {
              totalComplexity += method.complexity.cyclomatic;
              complexityCount++;
            }
          });
          const avgComplexity =
            complexityCount > 0 ? totalComplexity / complexityCount : 0;
          const complexityLevel =
            avgComplexity <= 5
              ? "low"
              : avgComplexity <= 10
              ? "medium"
              : "high";

          html += `<div class="class-item complexity-${complexityLevel}">
            <div class="class-header">
              <div class="class-info">
                <span class="class-name">${className}</span>
                ${
                  baseClasses.length > 0
                    ? `<span class="base-classes">(${baseClasses.join(
                        ", "
                      )})</span>`
                    : ""
                }
              </div>
              <div class="class-complexity">
                <span class="complexity-value">${avgComplexity.toFixed(
                  1
                )}</span>
                <span class="complexity-indicator complexity-${complexityLevel}">
                  ${complexityLevel}
                </span>
              </div>
            </div>
            <div class="class-methods">
              <div class="methods-count">${methods.length} method${
            methods.length !== 1 ? "s" : ""
          }</div>
              <div class="methods-grid">`;

          methods.forEach((method: any) => {
            const methodName = method.name || "Unknown Method";
            const methodComplexity = method.complexity?.cyclomatic || 0;
            const methodLevel =
              method.complexity?.level ||
              (methodComplexity <= 5
                ? "low"
                : methodComplexity <= 10
                ? "medium"
                : "high");

            html += `<div class="method-item">
              <span class="method-name">${methodName}</span>
              <div class="method-complexity">
                <span>${methodComplexity}</span>
                <span class="complexity-indicator complexity-${methodLevel}">
                  ${methodLevel}
                </span>
              </div>
            </div>`;
          });

          html += `</div>
            </div>
          </div>`;
        });

        html += "</div>"; // Close class-complexities-list
        html += "</div>"; // Close class-complexities-section
      }

      // Charts section
      html += '<div class="charts-section">';
      html +=
        '<h3 style="margin: 24px 0 16px 0; font-size: 18px; font-weight: 600;">Metrics Visualization</h3>';

      // Function complexity chart
      if (
        metrics.function_complexities &&
        metrics.function_complexities.length > 0
      ) {
        html += `<div class="chart-container">
          <div class="chart-title">Function Complexity Distribution</div>
          <canvas id="complexityChart" class="chart-canvas"></canvas>
        </div>`;
      }

      // Overall metrics radar chart
      html += `<div class="chart-container">
        <div class="chart-title">File Metrics Overview</div>
        <canvas id="metricsChart" class="chart-canvas"></canvas>
      </div>`;
      html += "</div>"; // Close charts-section
    }

    return html;
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

  /**
   * Handle messages from webview
   */
  private handleWebviewMessage(message: any): void {
    switch (message.command) {
      case "refreshAnalysis":
        if (message.filePath) {
          // For refresh, we need to trigger a new analysis on the specific file
          // First open the file, then trigger analysis
          vscode.workspace
            .openTextDocument(vscode.Uri.file(message.filePath))
            .then((doc) => {
              vscode.window
                .showTextDocument(doc, { preview: false, preserveFocus: true })
                .then(() => {
                  vscode.commands.executeCommand(
                    "doracodelens.analyzeCurrentFile"
                  );
                });
            });
        }
        break;
      case "exportReport":
        this.exportAnalysisReport(message.data, message.filePath);
        break;
      default:
        console.warn(
          "[CurrentFileAnalysisWebview] Unknown command:",
          message.command
        );
    }
  }

  /**
   * Export analysis report to file
   */
  private async exportAnalysisReport(
    data: any,
    filePath: string
  ): Promise<void> {
    try {
      const fileName = filePath
        ? filePath
            .split("/")
            .pop()
            ?.replace(/\.[^/.]+$/, "") || "analysis"
        : "analysis";
      const reportData = {
        timestamp: new Date().toISOString(),
        filePath: filePath,
        analysis: data,
      };

      const reportContent = JSON.stringify(reportData, null, 2);

      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`${fileName}_analysis_report.json`),
        filters: {
          "JSON Files": ["json"],
          "All Files": ["*"],
        },
      });

      if (uri) {
        await vscode.workspace.fs.writeFile(
          uri,
          Buffer.from(reportContent, "utf8")
        );
        vscode.window.showInformationMessage(
          `Analysis report exported to ${uri.fsPath}`
        );
        this.errorHandler.logError(
          "Export completed successfully",
          null,
          "CurrentFileAnalysisWebview"
        );
      } else {
        this.errorHandler.logError(
          "Export cancelled by user",
          null,
          "CurrentFileAnalysisWebview"
        );
      }
    } catch (error) {
      this.errorHandler.logError(
        "Failed to export analysis report",
        error,
        "CurrentFileAnalysisWebview"
      );
      vscode.window.showErrorMessage(
        `Failed to export analysis report: ${error}`
      );
    }
  }
}
