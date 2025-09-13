import * as vscode from "vscode";
import * as path from "path";
import { ErrorHandler } from "../core/error-handler";
import { CategoryDisplayManager } from "../services/category-display-manager";

/**
 * Full Code Analysis Webview Provider
 * Provides dedicated webview for displaying full codebase analysis results
 */
export class FullCodeAnalysisWebview {
  private static readonly VIEW_TYPE = "doracodelens.fullCodeAnalysis";
  private panel: vscode.WebviewPanel | null = null;
  private errorHandler: ErrorHandler;
  private extensionPath: string;
  private currentData: any = null;
  private categoryDisplayManager: CategoryDisplayManager;

  constructor(errorHandler: ErrorHandler, extensionPath: string) {
    this.errorHandler = errorHandler;
    this.extensionPath = extensionPath;
    this.categoryDisplayManager = new CategoryDisplayManager(errorHandler);
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

    const webview = this.panel!.webview;

    // Get resource URIs
    const cssUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.extensionPath, "resources", "webview.css"))
    );
    const techStackCssUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.extensionPath, "resources", "tech-stack-categories.css"))
    );
    const modernDashboardCssUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.extensionPath, "resources", "modern-tech-stack-dashboard.css"))
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
        state: { projectData: [] },
      };
    }

    // Generate tab contents
    const tabContents = this.generateTabContents(analysisData);

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Full Code Analysis</title>
        <link rel="stylesheet" href="${cssUri}">
        <link rel="stylesheet" href="${techStackCssUri}">
        <link rel="stylesheet" href="${modernDashboardCssUri}">
        <meta http-equiv="Content-Security-Policy" content="
          default-src 'none';
          img-src ${webview.cspSource} https: data:;
          script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval';
          style-src ${webview.cspSource} 'unsafe-inline';
          font-src ${webview.cspSource} https:;
          connect-src ${webview.cspSource};
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
              <button class="nav-link active" data-tab="tech-stack-section">
                <span class="nav-icon">🛠️</span>
                <span class="nav-label">Tech Stack</span>
              </button>
              <button class="nav-link" data-tab="code-graph-section">
                <span class="nav-icon">🕸️</span>
                <span class="nav-label">Mind Map</span>
              </button>
              <button class="nav-link" data-tab="code-graph-json-section">
                <span class="nav-icon">📄</span>
                <span class="nav-label">Mind Map JSON</span>
              </button>
            </div>
          </div>

          <!-- Scrollable Content -->
          <div class="scrollable-content">
            <!-- Tech Stack Section -->
            <section id="tech-stack-section" class="content-section active">
              <div class="section-header">
                <h2>🛠️ Tech Stack Analysis</h2>
              </div>
              <div class="section-content">
                ${tabContents.techStack}
              </div>
            </section>

            <!-- Mind Map Section -->
            <section id="code-graph-section" class="content-section">
              <div class="section-header" style="margin-bottom: 16px;">
                <h2 style="margin: 0 0 16px 0;">🕸️ Mind Map Visualization</h2>
                <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                  <!-- Quick Controls -->
                  <div style="display: flex; gap: 8px; flex-wrap: wrap; padding: 8px; background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 5px;">
                    <button id="zoom-in-btn" style="padding: 6px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer; font-size: 14px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;" title="Zoom In">🔍+</button>
                    <button id="zoom-out-btn" style="padding: 6px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer; font-size: 14px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;" title="Zoom Out">🔍-</button>
                    <button id="reset-view-btn" style="padding: 6px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer; font-size: 14px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;" title="Reset View">🎯</button>
                    <button id="fit-view-btn" style="padding: 6px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer; font-size: 14px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;" title="Fit to Screen">�</button>
                    <button id="expand-all-btn" style="padding: 6px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer; font-size: 14px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;" title="Expand All Folders">📂+</button>
                    <button id="collapse-all-btn" style="padding: 6px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer; font-size: 14px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;" title="Collapse All Folders">📁-</button>
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
                    <input type="text" id="search-input" placeholder="Search folders and files..." 
                           style="padding: 6px 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 3px; font-size: 12px; width: 200px;">
                    <div id="search-results" style="font-size: 11px; color: var(--vscode-descriptionForeground); min-width: 100px;"></div>
                  </div>
                </div>
              </div>
              <div class="section-content" style="position: relative; padding: 0;">


                <!-- Enhanced Loading with Progress -->
                <div id="graph-loading" style="text-align: center; padding: 40px; font-size: 16px;">
                  <div style="margin-bottom: 24px;">
                    <div id="loading-icon" style="font-size: 32px; margin-bottom: 16px;">🔄</div>
                    <div id="loading-message" style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Initializing interactive mind map...</div>
                    <div id="loading-details" style="font-size: 14px; color: var(--vscode-descriptionForeground); margin-bottom: 16px;">Analyzing data structure...</div>
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
                    <div style="margin-bottom: 6px;"><span style="display: inline-block; width: 16px; height: 16px; margin-right: 8px; vertical-align: middle; background: yellow; border:1px solid #000; border-radius: 2px;"></span> Folder</div>
                    <div style="margin-bottom: 6px;"><span style="display: inline-block; width: 16px; height: 16px; margin-right: 8px; vertical-align: middle; background: skyblue; border:1px solid #000; border-radius: 2px;"></span> File</div>
                    <div style="margin-bottom: 6px;"><span style="display: inline-block; width: 16px; height: 16px; margin-right: 8px; vertical-align: middle; background: orange; clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);"></span> Class</div>
                    <div style="margin-bottom: 6px;"><span style="display: inline-block; width: 16px; height: 16px; margin-right: 8px; vertical-align: middle; background: green; border-radius: 50%;"></span> Function</div>
                    <div style="margin-bottom: 6px;"><span style="display: inline-block; width: 24px; height: 2px; margin-right: 8px; vertical-align: middle; background: #888;"></span> Contains</div>
                    <div><span style="display: inline-block; width: 24px; height: 2px; margin-right: 8px; vertical-align: middle; background: red;"></span> Calls</div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Mind Map JSON Section -->
            <section id="code-graph-json-section" class="content-section">
              <div class="section-header">
                <h2>📄 Mind Map JSON Data</h2>
              </div>
              <div class="section-content">
                ${tabContents.codeGraphJson}
              </div>
            </section>
          </div>
        </div>

        <!-- Scripts -->
        <script src="${cytoscapeUri}" onload="console.log('Cytoscape loaded successfully')" onerror="console.error('Failed to load Cytoscape')"></script>
        
        <script>
          const vscode = acquireVsCodeApi();
          const analysisData = ${JSON.stringify(analysisData)};
          const graphData = ${JSON.stringify(graphData)};

          console.log('=== WEBVIEW INITIALIZED ===');
          console.log('Analysis data available:', !!analysisData);
          console.log('Graph data available:', !!graphData);
          console.log('Using code_graph_json directly as projectData');
          console.log('Project data:', graphData?.state?.projectData?.length || 0, 'folders');
          console.log('Project data details:', graphData?.state?.projectData);

          // Initialize when DOM is ready
          document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM ready, starting initialization...');
            initializeTabs();
            initializeGraph();
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
                  if (targetTab === 'code-graph-section' && !window.graphInitialized) {
                    setTimeout(() => {
                      initializeGraph();
                    }, 100);
                  }
                }
              });
            });
          }

          // Global variables for performance optimization
          let loadingCancelled = false;
          let loadingStartTime = Date.now();
          let processingTimeout = null;

          function initializeGraph() {
            // Check if Cytoscape is available
            if (typeof cytoscape === 'undefined') {
              console.log('Cytoscape not loaded yet, retrying...');
              setTimeout(initializeGraph, 100);
              return;
            }

            console.log('Cytoscape loaded, initializing graph...');
            loadingStartTime = Date.now();
            loadingCancelled = false;
            
            const container = document.getElementById('enhanced-graph');
            const loadingElement = document.getElementById('graph-loading');
            
            if (!container) {
              console.error('Graph container not found');
              return;
            }

            // Get project data and optimization info
            const projectData = graphData?.state?.projectData || [];
            const isLargeDataset = graphData?.state?.isLargeDataset || false;
            const originalDataSize = graphData?.state?.originalDataSize || 0;
            
            console.log('Project data:', projectData.length, 'folders');
            console.log('Large dataset:', isLargeDataset);
            console.log('Original data size:', (originalDataSize / 1024 / 1024).toFixed(2), 'MB');

            // Update performance info
            updatePerformanceInfo(originalDataSize, isLargeDataset);
            


            if (projectData.length === 0) {
              showEmptyState();
              return;
            }

            // Set up timeout protection for large datasets
            if (isLargeDataset) {
              setupTimeoutProtection();
            }

            // Start progressive loading
            initializeGraphProgressively(container, loadingElement, projectData, isLargeDataset);
          }

          function updatePerformanceInfo(dataSize, isLargeDataset) {
            const dataSizeElement = document.getElementById('data-size');
            const optimizationModeElement = document.getElementById('optimization-mode');
            const performanceInfoElement = document.getElementById('performance-info');
            
            if (dataSizeElement) {
              dataSizeElement.textContent = (dataSize / 1024 / 1024).toFixed(2) + ' MB';
            }
            if (optimizationModeElement) {
              optimizationModeElement.textContent = isLargeDataset ? 'Large Dataset Optimization' : 'Standard';
            }
            if (performanceInfoElement) {
              performanceInfoElement.style.display = 'block';
            }
          }

          function setupTimeoutProtection() {
            const cancelContainer = document.getElementById('cancel-container');
            const cancelBtn = document.getElementById('cancel-btn');
            
            if (cancelContainer) {
              cancelContainer.style.display = 'block';
            }
            
            if (cancelBtn) {
              cancelBtn.addEventListener('click', function() {
                loadingCancelled = true;
                if (processingTimeout) {
                  clearTimeout(processingTimeout);
                }
                showCancelledState();
              });
            }
            
            // Set timeout for very long operations (30 seconds)
            processingTimeout = setTimeout(() => {
              if (!window.graphInitialized) {
                console.warn('Graph initialization timed out');
                showTimeoutState();
              }
            }, 30000);
          }

          async function initializeGraphProgressively(container, loadingElement, projectData, isLargeDataset) {
            try {
              // Update loading message
              updateLoadingMessage('Creating graph instance...', 10);
              
              if (loadingCancelled) return;

              // Create Cytoscape instance with optimized settings
              const cy = cytoscape({
                container: container,
                style: [
                  { selector: 'node[type="folder"]', style: { shape:'rectangle','background-color':'yellow', label:'data(name)','text-valign':'center','text-halign':'center','font-weight':'bold','border-width':2,'border-color':'#000','width':180,'height':100 } },
                  { selector: 'node[type="file"]', style: { shape:'rectangle','background-color':'skyblue', label:'data(name)','text-valign':'center','text-halign':'center','border-width':1,'border-color':'#000','width':150,'height':80 } },
                  { selector: 'node[type="class"]', style: { shape:'hexagon','background-color':'orange', label:'data(name)','text-valign':'center','text-halign':'center','width':140,'height':80 } },
                  { selector: 'node[type="function"]', style: { shape:'ellipse', 'color':'#fff', label:'data(name)','text-valign':'center','text-halign':'center','width':100,'height':60,'font-size':12 } },
                  { selector: 'node[type="summary"]', style: { shape:'round-rectangle','background-color':'lightgray', label:'data(name)','text-valign':'center','text-halign':'center','border-width':1,'border-color':'#666','width':250,'height':50,'font-size':14 } },
                  { selector: 'node[complexity="low"]', style: { 'background-color':'green' } },
                  { selector: 'node[complexity="medium"]', style: { 'background-color':'orange' } },
                  { selector: 'node[complexity="high"]', style: { 'background-color':'red' } },
                  { selector: 'edge[type="contains"]', style: { width:2, 'line-color':'#888','curve-style':'bezier' } },
                  { selector: 'edge[type="calls"]', style: { width:2,'line-color':'red','target-arrow-shape':'triangle','target-arrow-color':'red','curve-style':'bezier' } },
                  { selector: 'edge[label]', style: { label:'data(label)','text-rotation':'autorotate','text-margin-y':-10,'font-size':10 } }
                ],
                layout: { name:'preset' },
                // Performance optimizations for large datasets
                renderer: {
                  showFps: false,
                  motionBlur: !isLargeDataset,
                  textureOnViewport: isLargeDataset,
                  wheelSensitivity: isLargeDataset ? 0.5 : 1
                }
              });

              updateLoadingMessage('Calculating positions...', 30);
              
              if (loadingCancelled) return;

              const expanded = {};
              const width = container.offsetWidth || 800;
              const height = container.offsetHeight || 600;
              
              // Store cytoscape instance and data globally for controls
              window.cy = cy;
              window.expanded = expanded;
              window.projectData = projectData;

              // Add nodes in chunks for better performance
              await addNodesInChunks(cy, projectData, width, height, isLargeDataset);
              
              if (loadingCancelled) return;

              updateLoadingMessage('Setting up interactions...', 80);

              // Folder expansion logic - shows files only
              cy.on('tap', 'node[type="folder"]', function(evt) {
                const folderId = evt.target.id();
                console.log('Folder clicked:', folderId);
                
                // Prevent event bubbling
                evt.stopPropagation();
                
                // Clear any search highlighting
                cy.nodes().removeClass('highlighted');
                
                // Toggle folder to show/hide files
                toggleFolder(cy, folderId, expanded, projectData);
              });

              // File expansion logic - shows classes and functions
              cy.on('tap', 'node[type="file"]', function(evt) {
                const fileId = evt.target.id();
                console.log('File clicked:', fileId);
                
                // Prevent event bubbling
                evt.stopPropagation();
                
                // Clear any search highlighting
                cy.nodes().removeClass('highlighted');
                
                // Toggle file to show/hide classes and functions
                toggleFile(cy, fileId, expanded, projectData);
              });

              // Setup zoom and pan controls
              setupGraphControls(cy);
              
              // Setup search functionality
              setupSearchFunctionality(cy, projectData);
              
              updateLoadingMessage('Finalizing...', 95);
              
              // Final setup
              setTimeout(() => {
                if (loadingCancelled) return;
                
                // Show graph and legend, hide loading
                container.style.display = 'block';
                loadingElement.style.display = 'none';
                
                const legendElement = document.querySelector('.legend');
                if (legendElement) {
                  legendElement.style.display = 'block';
                }
                
                // Update processing time
                const processingTime = (Date.now() - loadingStartTime) / 1000;
                const processingTimeElement = document.getElementById('processing-time');
                if (processingTimeElement) {
                  processingTimeElement.textContent = processingTime.toFixed(1) + 's';
                }
                
                console.log('✅ Graph initialized successfully in', processingTime.toFixed(1), 'seconds');
                window.graphInitialized = true;
                
                if (processingTimeout) {
                  clearTimeout(processingTimeout);
                }
              }, 100);

            } catch (error) {
              console.error('Error initializing graph:', error);
              showErrorState(error.message);
            }
          }

          async function addNodesInChunks(cy, projectData, width, height, isLargeDataset) {
            const chunkSize = isLargeDataset ? 20 : 50; // Reasonable chunks for large datasets
            const totalNodes = projectData.length;
            
            console.log(\`Adding \${totalNodes} root folders to graph...\`);
            
            // Position folders in a more distributed pattern
            const positions = [
              { x: 150, y: 150 },           // Top-left
              { x: width - 150, y: 150 },   // Top-right
              { x: 150, y: height - 150 },  // Bottom-left
              { x: width - 150, y: height - 150 }, // Bottom-right
              { x: width / 2, y: 150 },     // Top-center
              { x: width / 2, y: height - 150 }, // Bottom-center
              { x: 150, y: height / 2 },    // Left-center
              { x: width - 150, y: height / 2 }, // Right-center
            ];

            for (let i = 0; i < totalNodes; i += chunkSize) {
              if (loadingCancelled) return;
              
              const chunk = projectData.slice(i, i + chunkSize);
              const progress = 30 + ((i / totalNodes) * 40); // 30-70% for node addition
              
              updateLoadingMessage(\`Adding folders (\${i + 1}-\${Math.min(i + chunkSize, totalNodes)} of \${totalNodes})...\`, progress);
              
              // Add chunk of nodes
              chunk.forEach((folder, chunkIndex) => {
                const globalIndex = i + chunkIndex;
                let position = positions[globalIndex % positions.length];
                
                // If more folders than positions, create a spiral pattern
                if (globalIndex >= positions.length) {
                  const angle = (globalIndex - positions.length) * 0.8;
                  const radius = 200 + (Math.floor((globalIndex - positions.length) / 8) * 80);
                  position = {
                    x: width / 2 + Math.cos(angle) * radius,
                    y: height / 2 + Math.sin(angle) * radius
                  };
                }
                
                // Ensure position is within bounds
                position.x = Math.max(100, Math.min(width - 100, position.x));
                position.y = Math.max(100, Math.min(height - 100, position.y));
                
                const nodeData = { 
                  id: folder.name, 
                  name: folder.name, 
                  type: folder.type || 'folder',
                  _simplified: folder._simplified || false,
                  _originalChildCount: folder._originalChildCount || 0,
                  _hasChildren: folder.children && folder.children.length > 0
                };
                
                console.log(\`Adding folder: \${folder.name} (type: \${nodeData.type}, children: \${folder.children?.length || 0})\`);
                
                cy.add({ 
                  data: nodeData, 
                  position: position 
                });
              });
              
              // Allow UI to update between chunks
              await new Promise(resolve => setTimeout(resolve, isLargeDataset ? 30 : 10));
            }
            
            console.log(\`Successfully added \${cy.nodes().length} nodes to graph\`);
          }

          function updateLoadingMessage(message, progress) {
            const loadingMessageElement = document.getElementById('loading-message');
            const loadingDetailsElement = document.getElementById('loading-details');
            const progressContainer = document.getElementById('progress-container');
            const progressBar = document.getElementById('progress-bar');
            const progressText = document.getElementById('progress-text');
            
            if (loadingDetailsElement) {
              loadingDetailsElement.textContent = message;
            }
            
            if (progress !== undefined) {
              if (progressContainer) {
                progressContainer.style.display = 'block';
              }
              if (progressBar) {
                progressBar.style.width = progress + '%';
              }
              if (progressText) {
                progressText.textContent = Math.round(progress) + '%';
              }
            }
          }

          function setupSearchFunctionality(cy, projectData) {
            const searchInput = document.getElementById('search-input');
            const searchResults = document.getElementById('search-results');
            
            if (!searchInput || !searchResults) {
              console.warn('Search elements not found');
              return;
            }
            
            let searchIndex = [];
            
            // Build search index for folders and files only
            function buildSearchIndex() {
              searchIndex = [];
              
              function indexNode(node, path = [], parentFolder = null) {
                const currentPath = [...path, node.name];
                
                // Only index folders and files (not functions or classes)
                if (node.type === 'folder' || node.type === 'file') {
                  searchIndex.push({
                    name: node.name,
                    type: node.type,
                    path: currentPath.join(' > '),
                    parentFolder: parentFolder,
                    node: node
                  });
                }
                
                if (node.children && !node._truncated) {
                  node.children.forEach(child => {
                    const folder = node.type === 'folder' ? node.name : parentFolder;
                    indexNode(child, currentPath, folder);
                  });
                }
              }
              
              projectData.forEach(folder => indexNode(folder));
              console.log('Search index built with', searchIndex.length, 'folders and files');
            }
            
            buildSearchIndex();
            
            function performSearch(query) {
              if (!query.trim()) {
                searchResults.textContent = '';
                cy.nodes().removeClass('highlighted');
                return;
              }
              
              const queryLower = query.toLowerCase();
              const results = searchIndex.filter(item => 
                item.name.toLowerCase().includes(queryLower)
              );
              
              const folders = results.filter(r => r.type === 'folder');
              const files = results.filter(r => r.type === 'file');
              
              if (results.length === 0) {
                searchResults.textContent = 'No results';
                cy.nodes().removeClass('highlighted');
                return;
              }
              
              searchResults.textContent = \`\${folders.length} folders, \${files.length} files\`;
              
              // Highlight matching nodes in graph
              cy.nodes().removeClass('highlighted');
              
              // Find folders that contain matching results or are matches themselves
              const foldersToHighlight = new Set();
              results.forEach(result => {
                if (result.type === 'folder') {
                  foldersToHighlight.add(result.name);
                } else if (result.parentFolder) {
                  foldersToHighlight.add(result.parentFolder);
                }
              });
              
              // Highlight visible folder nodes
              foldersToHighlight.forEach(folderName => {
                const node = cy.getElementById(folderName);
                if (node.length > 0) {
                  node.addClass('highlighted');
                }
              });
              
              // Fit to highlighted nodes if any
              const highlightedNodes = cy.nodes('.highlighted');
              if (highlightedNodes.length > 0) {
                cy.fit(highlightedNodes, 50);
              }
            }
            
            // Real-time search as user types (debounced)
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
              clearTimeout(searchTimeout);
              searchTimeout = setTimeout(() => {
                performSearch(e.target.value);
              }, 300);
            });
            
            searchInput.addEventListener('keypress', (e) => {
              if (e.key === 'Enter') {
                performSearch(searchInput.value);
              }
            });
            
            // Add highlighted style
            cy.style().selector('.highlighted').style({
              'border-width': 4,
              'border-color': '#ff6b6b',
              'background-color': '#ffe066',
              'z-index': 999
            }).update();
            
            // Add debug functionality
            const debugBtn = document.getElementById('debug-btn');
            const debugInfo = document.getElementById('debug-info');
            
            if (debugBtn && debugInfo) {
              debugBtn.addEventListener('click', () => {
                if (debugInfo.style.display === 'none') {
                  // Show debug info
                  const totalNodes = cy.nodes().length;
                  const totalEdges = cy.edges().length;
                  const folderNodes = cy.nodes('[type="folder"]').length;
                  const fileNodes = cy.nodes('[type="file"]').length;
                  const functionNodes = cy.nodes('[type="function"]').length;
                  const classNodes = cy.nodes('[type="class"]').length;
                  
                  let debugText = \`Graph Debug Info:\\n\`;
                  debugText += \`• Total nodes in graph: \${totalNodes}\\n\`;
                  debugText += \`• Total edges in graph: \${totalEdges}\\n\`;
                  debugText += \`• Folder nodes: \${folderNodes}\\n\`;
                  debugText += \`• File nodes: \${fileNodes}\\n\`;
                  debugText += \`• Function nodes: \${functionNodes}\\n\`;
                  debugText += \`• Class nodes: \${classNodes}\\n\`;
                  debugText += \`• Search index size: \${searchIndex.length}\\n\`;
                  debugText += \`• Project data folders: \${projectData.length}\\n\`;
                  debugText += \`• Expanded folders: \${Object.keys(window.expanded || {}).filter(k => window.expanded[k]).length}\\n\`;
                  
                  // Show first few folder names
                  const folderNames = cy.nodes('[type="folder"]').map(n => n.data('name')).slice(0, 10);
                  debugText += \`• First 10 folders: \${folderNames.join(', ')}\\n\`;
                  
                  // Show project data structure
                  debugText += \`• Project data sample: \${projectData.slice(0, 3).map(f => f.name).join(', ')}\\n\`;
                  
                  debugInfo.textContent = debugText;
                  debugInfo.style.display = 'block';
                  debugBtn.textContent = '🐛 Hide Debug';
                } else {
                  // Hide debug info
                  debugInfo.style.display = 'none';
                  debugBtn.textContent = '🐛 Debug';
                }
              });
            }
          }

          function showCancelledState() {
            const loadingElement = document.getElementById('graph-loading');
            if (loadingElement) {
              loadingElement.innerHTML = \`
                <div style="text-align: center; padding: 40px;">
                  <div style="font-size: 32px; margin-bottom: 16px;">⏹️</div>
                  <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Loading Cancelled</div>
                  <div style="font-size: 14px; color: var(--vscode-descriptionForeground);">Graph initialization was cancelled by user</div>
                  <button onclick="location.reload()" style="margin-top: 16px; padding: 8px 16px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer;">Retry</button>
                </div>
              \`;
            }
          }

          function showTimeoutState() {
            const loadingElement = document.getElementById('graph-loading');
            if (loadingElement) {
              loadingElement.innerHTML = \`
                <div style="text-align: center; padding: 40px;">
                  <div style="font-size: 32px; margin-bottom: 16px;">⏰</div>
                  <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Loading Timeout</div>
                  <div style="font-size: 14px; color: var(--vscode-descriptionForeground); margin-bottom: 16px;">
                    The dataset is too large to process in a reasonable time.<br>
                    Try using a smaller dataset or contact support.
                  </div>
                  <button onclick="location.reload()" style="margin-top: 16px; padding: 8px 16px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer;">Retry</button>
                </div>
              \`;
            }
          }

          function setupGraphControls(cy) {
            // Helper function to safely add event listeners
            function safeAddEventListener(elementId, event, handler) {
              const element = document.getElementById(elementId);
              if (element) {
                element.addEventListener(event, handler);
              } else {
                console.warn('Element not found:', elementId);
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

            // Fit to Screen
            safeAddEventListener('fit-view-btn', 'click', function() {
              cy.fit();
            });

            // Expand All Folders
            safeAddEventListener('expand-all-btn', 'click', function() {
              expandAllFolders(cy, window.expanded, window.projectData);
            });

            // Collapse All Folders
            safeAddEventListener('collapse-all-btn', 'click', function() {
              collapseAllFolders(cy, window.expanded);
            });



            // Layout Selection (if exists)
            safeAddEventListener('layout-select', 'change', function() {
              const layoutName = this.value;
              console.log('Changing layout to:', layoutName);
              
              let layoutOptions = { name: layoutName };
              
              // Add specific options for different layouts
              switch(layoutName) {
                case 'cose':
                  layoutOptions = { name: 'cose', animate: true, fit: true };
                  break;
                case 'dagre':
                  layoutOptions = { name: 'dagre', animate: true, fit: true };
                  break;
                case 'breadthfirst':
                  layoutOptions = { name: 'breadthfirst', animate: true, fit: true, directed: true };
                  break;
                case 'circle':
                  layoutOptions = { name: 'circle', animate: true, fit: true };
                  break;
                case 'concentric':
                  layoutOptions = { name: 'concentric', animate: true, fit: true };
                  break;
                case 'grid':
                  layoutOptions = { name: 'grid', animate: true, fit: true };
                  break;
                case 'klay':
                  layoutOptions = { name: 'klay', animate: true, fit: true };
                  break;
                case 'random':
                  layoutOptions = { name: 'random', animate: true, fit: true };
                  break;
              }
              
              cy.layout(layoutOptions).run();
            });

            // Panel Toggle (if exists)
            safeAddEventListener('toggle-panel-btn', 'click', function() {
              const panel = document.getElementById('properties-panel');
              const showBtn = document.getElementById('show-panel-btn');
              if (panel) panel.style.display = 'none';
              if (showBtn) showBtn.style.display = 'block';
            });

            safeAddEventListener('show-panel-btn', 'click', function() {
              const panel = document.getElementById('properties-panel');
              const showBtn = document.getElementById('show-panel-btn');
              if (panel) panel.style.display = 'flex';
              if (showBtn) showBtn.style.display = 'none';
            });

            // Enable mouse wheel zoom
            cy.on('wheel', function(e) {
              e.preventDefault();
              const zoom = cy.zoom();
              const factor = e.originalEvent.deltaY > 0 ? 0.9 : 1.1;
              cy.zoom(zoom * factor);
            });

            // Update stats initially and on changes
            updateGraphStats(cy);
            cy.on('add remove', function() {
              updateGraphStats(cy);
            });
          }

          function updateGraphStats(cy) {
            // Just log stats for debugging, no UI updates needed
            const nodeCount = cy.nodes().length;
            const edgeCount = cy.edges().length;
            const folderCount = cy.nodes('[type="folder"]').length;
            
            console.log('Graph stats:', { nodes: nodeCount, edges: edgeCount, folders: folderCount });
          }

          function toggleFolder(cy, folderId, expanded, projectData) {
            console.log('Toggle folder called:', folderId, 'currently expanded:', !!expanded[folderId]);
            
            // Ensure we have the required parameters
            if (!cy || !folderId || !projectData) {
              console.error('Missing required parameters for toggleFolder');
              return;
            }
            
            if (expanded[folderId]) {
              // Collapse
              console.log('Collapsing folder:', folderId);
              collapseFolder(cy, folderId, expanded);
            } else {
              // Expand
              console.log('Expanding folder:', folderId);
              expandFolder(cy, folderId, expanded, projectData);
            }
          }

          function expandFolder(cy, folderId, expanded, projectData) {
            console.log('Expanding folder:', folderId);
            
            const folderData = findNodeInProjectData(projectData, folderId);
            if (!folderData) {
              console.warn('Folder data not found for:', folderId);
              return;
            }
            
            if (!folderData.children || folderData.children.length === 0) {
              console.log('No children found for folder:', folderId);
              return;
            }
            
            // Only add files and folders (not functions or classes)
            const filesToAdd = folderData.children.filter(child => 
              child.type === 'file' || child.type === 'folder'
            );
            
            console.log('Adding', filesToAdd.length, 'files/folders to folder:', folderId);
            
            let addedNodes = 0;
            filesToAdd.forEach((child, i) => {
              try {
                addNode(cy, folderId, child, folderId, 1, i);
                addedNodes++;
              } catch (error) {
                console.warn('Failed to add child node:', child.name, error);
              }
            });
            
            expanded[folderId] = true;
            console.log('Folder expanded successfully:', folderId, 'added', addedNodes, 'files/folders');
            
            // Use a gentler layout
            setTimeout(() => {
              cy.layout({ name:'cose', fit:false, animate:true, randomize:false, nodeRepulsion: 4000 }).run();
            }, 100);
          }

          function toggleFile(cy, fileId, expanded, projectData) {
            console.log('Toggle file called:', fileId, 'currently expanded:', !!expanded[fileId]);
            
            if (expanded[fileId]) {
              // Collapse
              console.log('Collapsing file:', fileId);
              collapseFile(cy, fileId, expanded);
            } else {
              // Expand
              console.log('Expanding file:', fileId);
              expandFile(cy, fileId, expanded, projectData);
            }
          }

          function expandFile(cy, fileId, expanded, projectData) {
            console.log('Expanding file:', fileId);
            
            const fileData = findNodeInProjectData(projectData, fileId);
            if (!fileData) {
              console.warn('File data not found for:', fileId);
              return;
            }
            
            if (!fileData.children || fileData.children.length === 0) {
              console.log('No children found for file:', fileId);
              return;
            }
            
            // Only add classes and functions (not files or folders)
            const codeElementsToAdd = fileData.children.filter(child => 
              child.type === 'class' || child.type === 'function'
            );
            
            console.log('Adding', codeElementsToAdd.length, 'classes/functions to file:', fileId);
            
            let addedNodes = 0;
            codeElementsToAdd.forEach((child, i) => {
              try {
                addNode(cy, fileId, child, fileId, 1, i);
                addedNodes++;
              } catch (error) {
                console.warn('Failed to add child node:', child.name, error);
              }
            });
            
            expanded[fileId] = true;
            console.log('File expanded successfully:', fileId, 'added', addedNodes, 'classes/functions');
            
            // Use a gentler layout
            setTimeout(() => {
              cy.layout({ name:'cose', fit:false, animate:true, randomize:false, nodeRepulsion: 4000 }).run();
            }, 100);
          }

          function collapseFile(cy, fileId, expanded) {
            console.log('Collapsing file:', fileId);
            
            // Remove all child nodes and edges for this file
            const nodesToRemove = cy.nodes().filter(n => n.data('folder') === fileId);
            const edgesToRemove = cy.edges().filter(e => e.data('folder') === fileId);
            
            console.log('Removing', nodesToRemove.length, 'nodes and', edgesToRemove.length, 'edges');
            
            cy.remove(nodesToRemove);
            cy.remove(edgesToRemove);
            
            expanded[fileId] = false;
            console.log('File collapsed successfully:', fileId);
          }

          // Helper function to find node data recursively
          function findNodeInProjectData(projectData, nodeId) {
            for (const folder of projectData) {
              if (folder.name === nodeId) {
                return folder;
              }
              
              // Search recursively in children
              const found = findNodeRecursively(folder.children || [], nodeId);
              if (found) {
                return found;
              }
            }
            return null;
          }

          function findNodeRecursively(children, nodeId) {
            for (const child of children) {
              if (child.name === nodeId) {
                return child;
              }
              
              if (child.children) {
                const found = findNodeRecursively(child.children, nodeId);
                if (found) {
                  return found;
                }
              }
            }
            return null;
          }

          function collapseFolder(cy, folderId, expanded) {
            console.log('Collapsing folder:', folderId);
            
            // Count nodes before removal
            const nodesToRemove = cy.nodes().filter(n => n.data('folder') === folderId);
            const edgesToRemove = cy.edges().filter(e => e.data('folder') === folderId);
            
            console.log('Removing', nodesToRemove.length, 'nodes and', edgesToRemove.length, 'edges');
            
            // Remove all child nodes and edges for this folder
            cy.remove(nodesToRemove);
            cy.remove(edgesToRemove);
            
            expanded[folderId] = false;
            console.log('Folder collapsed successfully:', folderId);
            
            // Update search results with success message
            const searchResults = document.getElementById('search-results');
            if (searchResults) {
              searchResults.innerHTML = \`<span style="color: var(--vscode-descriptionForeground);">
                🔄 Collapsed folder "\${folderId}" - removed \${nodesToRemove.length} items.
                <br>Total nodes in graph: \${cy.nodes().length}
              </span>\`;
            }
            
            // Update debug info if visible
            const debugInfo = document.getElementById('debug-info');
            if (debugInfo && debugInfo.style.display !== 'none') {
              // Trigger debug update
              const debugBtn = document.getElementById('debug-btn');
              if (debugBtn) {
                debugBtn.click();
                setTimeout(() => debugBtn.click(), 100); // Refresh debug info
              }
            }
          }

          function expandAllFolders(cy, expanded, projectData) {
            console.log('🔄 Expanding all folders...');
            console.log('Project data:', projectData);
            console.log('Current expanded state:', expanded);
            
            if (!projectData || projectData.length === 0) {
              console.warn('No project data available for expansion');
              return;
            }
            
            // Get all top-level folder nodes that are not expanded
            const folderNodes = cy.nodes('[type="folder"]');
            console.log('Found folder nodes:', folderNodes.length);
            
            let expandedCount = 0;
            folderNodes.forEach(function(node) {
              const folderId = node.id();
              console.log('Checking folder:', folderId, 'expanded:', !!expanded[folderId]);
              
              if (!expanded[folderId]) {
                const folderData = projectData.find(f => f.name === folderId);
                if (folderData && folderData.children) {
                  console.log('Expanding folder:', folderId, 'with', folderData.children.length, 'children');
                  expandFolder(cy, folderId, expanded, projectData);
                  expandedCount++;
                }
              }
            });
            
            console.log('✅ Expanded', expandedCount, 'folders');
            
            // Update stats
            updateGraphStats(cy);
          }

          function collapseAllFolders(cy, expanded) {
            console.log('🔄 Collapsing all folders...');
            console.log('Current expanded state:', expanded);
            
            // Get all expanded folders
            const expandedFolders = Object.keys(expanded).filter(id => expanded[id]);
            console.log('Found expanded folders:', expandedFolders);
            
            if (expandedFolders.length === 0) {
              console.log('No folders to collapse');
              return;
            }
            
            // Collapse all expanded folders
            let collapsedCount = 0;
            expandedFolders.forEach(folderId => {
              console.log('Collapsing folder:', folderId);
              collapseFolder(cy, folderId, expanded);
              collapsedCount++;
            });
            
            console.log('✅ Collapsed', collapsedCount, 'folders');
            
            // Update stats
            updateGraphStats(cy);
            
            // Re-run layout to clean up positioning
            cy.layout({ name:'preset' }).run();
          }

          function addNode(cy, parentId, nodeData, folderId, level = 0, index = 0) {
            const id = parentId ? parentId + '_' + nodeData.name : nodeData.name;
            
            // Get parent position for relative positioning
            const parentNode = cy.getElementById(parentId);
            const parentPos = parentNode.length > 0 ? parentNode.position() : { x: 400, y: 300 };
            
            // Create a radial layout around the parent
            const angle = (index * 2 * Math.PI) / Math.max(1, nodeData.siblings || 1);
            const radius = 120 + (level * 80);
            const posX = parentPos.x + Math.cos(angle) * radius;
            const posY = parentPos.y + Math.sin(angle) * radius;

            const dataObj = { id: id, name: nodeData.name, type: nodeData.type, folder: folderId };
            if (nodeData.type === 'function' && nodeData.complexity) {
              dataObj.complexity = nodeData.complexity.level;
            }

            cy.add({ data: dataObj, position: { x: posX, y: posY } });

            if (parentId) {
              cy.add({ data: { id: 'contains_' + id, source: parentId, target: id, type: 'contains', folder: folderId } });
            }

            if (nodeData.children) {
              // Add sibling count for better positioning
              nodeData.children.forEach((child, i) => {
                child.siblings = nodeData.children.length;
                addNode(cy, id, child, folderId, level + 1, i);
              });
            }

            if (nodeData.calls) {
              nodeData.calls.forEach(call => {
                let targetId = call.target.join('_');
                if (cy.getElementById(targetId).empty()) {
                  targetId = call.target[0];
                }
                cy.add({ data: { id: 'calls_' + id + '_' + targetId, source: id, target: targetId, type: 'calls', folder: folderId } });
              });
            }
          }

          function showEmptyState() {
            const container = document.getElementById('enhanced-graph');
            const loadingElement = document.getElementById('graph-loading');
            const legendElement = document.querySelector('.legend');
            const graphControlsElement = document.querySelector('.graph-controls');
            
            container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; text-align: center;"><div><div style="font-size: 48px; margin-bottom: 16px;">🕸️</div><h3>No Mind Map Data</h3><p>No mind map data available to display.</p></div></div>';
            container.style.display = 'block';
            loadingElement.style.display = 'none';
            if (legendElement) legendElement.style.display = 'none';
            if (graphControlsElement) graphControlsElement.style.display = 'none';
          }

          function showErrorState(message) {
            const container = document.getElementById('enhanced-graph');
            const loadingElement = document.getElementById('graph-loading');
            const legendElement = document.querySelector('.legend');
            const graphControlsElement = document.querySelector('.graph-controls');
            
            container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; text-align: center;"><div><div style="font-size: 48px; margin-bottom: 16px;">⚠️</div><h3>Mind Map Error</h3><p>' + message + '</p><button onclick="location.reload()" style="margin-top: 16px; padding: 8px 16px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer;">Retry</button></div></div>';
            container.style.display = 'block';
            loadingElement.style.display = 'none';
            if (legendElement) legendElement.style.display = 'none';
            if (graphControlsElement) graphControlsElement.style.display = 'none';
          }
        </script>
      </body>
      </html>
    `;
  } /**

   * Generate tab contents
   */
  private generateTabContents(analysisData: any): any {
    return {
      techStack: this.generateTechStackContent(analysisData),
      codeGraphJson: this.generateCodeGraphJsonContent(analysisData),
    };
  }

  /**
   * Calculate comprehensive tech stack statistics from code_graph_json
   */
  private calculateTechStackStats(analysisData: any): {
    totalFiles: number;
    totalFolders: number;
    totalClasses: number;
    totalFunctions: number;
    totalLanguages: number;
    packageManager: string;
  } {
    const stats = {
      totalFiles: 0,
      totalFolders: 0,
      totalClasses: 0,
      totalFunctions: 0,
      totalLanguages: 0,
      packageManager: 'Unknown'
    };

    try {
      // Count nodes from code_graph_json if available
      if (analysisData.code_graph_json && Array.isArray(analysisData.code_graph_json)) {
        this.countNodesRecursively(analysisData.code_graph_json, stats);
      }

      // Fallback to tech_stack data if code_graph_json doesn't provide counts
      if (stats.totalFiles === 0 && analysisData.tech_stack?.languages) {
        stats.totalFiles = Object.values(analysisData.tech_stack.languages).reduce(
          (sum: number, count: any) => sum + (typeof count === "number" ? count : 0), 0
        );
      }

      // Calculate total languages from file extensions in code_graph_json
      const languageExtensions = new Set<string>();
      if (analysisData.code_graph_json && Array.isArray(analysisData.code_graph_json)) {
        this.extractLanguagesFromCodeGraph(analysisData.code_graph_json, languageExtensions);
      }
      stats.totalLanguages = languageExtensions.size;

    } catch (error) {
      this.errorHandler.logError(
        "Error calculating tech stack statistics",
        error,
        "FullCodeAnalysisWebview"
      );
    }

    return stats;
  }

  /**
   * Calculate language statistics from code graph
   */
  private calculateLanguageStats(analysisData: any): { [key: string]: number } {
    const languageCounts: { [key: string]: number } = {};
    
    if (analysisData.code_graph_json && Array.isArray(analysisData.code_graph_json)) {
      this.countLanguagesFromCodeGraph(analysisData.code_graph_json, languageCounts);
    }
    
    return languageCounts;
  }

  /**
   * Count languages from code graph by analyzing file extensions
   */
  private countLanguagesFromCodeGraph(nodes: any[], languageCounts: { [key: string]: number }): void {
    if (!Array.isArray(nodes)) {
      return;
    }

    try {
      nodes.forEach((node: any) => {
        if (!node || typeof node !== 'object') {
          return;
        }

        // If it's a file, extract language from extension
        if (node.type === 'file' && node.name) {
          const extension = node.name.split('.').pop()?.toLowerCase();
          if (extension) {
            // Map extensions to language names
            const languageMap: { [key: string]: string } = {
              'py': 'Python',
              'js': 'JavaScript',
              'ts': 'TypeScript',
              'java': 'Java',
              'cpp': 'C++',
              'c': 'C',
              'cs': 'C#',
              'php': 'PHP',
              'rb': 'Ruby',
              'go': 'Go',
              'rs': 'Rust',
              'swift': 'Swift',
              'kt': 'Kotlin',
              'scala': 'Scala',
              'html': 'HTML',
              'css': 'CSS',
              'scss': 'SCSS',
              'sass': 'Sass',
              'less': 'Less',
              'json': 'JSON',
              'xml': 'XML',
              'yaml': 'YAML',
              'yml': 'YAML',
              'md': 'Markdown',
              'sql': 'SQL',
              'sh': 'Shell',
              'bash': 'Bash',
              'zsh': 'Zsh',
              'ps1': 'PowerShell',
              'r': 'R',
              'matlab': 'MATLAB',
              'm': 'MATLAB'
            };
            
            const language = languageMap[extension] || extension.toUpperCase();
            languageCounts[language] = (languageCounts[language] || 0) + 1;
          }
        }

        // Recursively process children
        if (node.children && Array.isArray(node.children)) {
          this.countLanguagesFromCodeGraph(node.children, languageCounts);
        }
      });
    } catch (error) {
      this.errorHandler.logError(
        "Error counting languages from code graph",
        error,
        "FullCodeAnalysisWebview"
      );
    }
  }

  /**
   * Extract languages from code graph by analyzing file extensions
   */
  private extractLanguagesFromCodeGraph(nodes: any[], languageExtensions: Set<string>): void {
    if (!Array.isArray(nodes)) {
      return;
    }

    try {
      nodes.forEach((node: any) => {
        if (!node || typeof node !== 'object') {
          return;
        }

        // If it's a file, extract language from extension
        if (node.type === 'file' && node.name) {
          const extension = node.name.split('.').pop()?.toLowerCase();
          if (extension) {
            // Map extensions to language names
            const languageMap: { [key: string]: string } = {
              'py': 'Python',
              'js': 'JavaScript',
              'ts': 'TypeScript',
              'java': 'Java',
              'cpp': 'C++',
              'c': 'C',
              'cs': 'C#',
              'php': 'PHP',
              'rb': 'Ruby',
              'go': 'Go',
              'rs': 'Rust',
              'swift': 'Swift',
              'kt': 'Kotlin',
              'scala': 'Scala',
              'html': 'HTML',
              'css': 'CSS',
              'scss': 'SCSS',
              'sass': 'Sass',
              'less': 'Less',
              'json': 'JSON',
              'xml': 'XML',
              'yaml': 'YAML',
              'yml': 'YAML',
              'md': 'Markdown',
              'sql': 'SQL',
              'sh': 'Shell',
              'bash': 'Bash',
              'zsh': 'Zsh',
              'ps1': 'PowerShell',
              'r': 'R',
              'matlab': 'MATLAB',
              'm': 'MATLAB'
            };
            
            const language = languageMap[extension] || extension.toUpperCase();
            languageExtensions.add(language);
          }
        }

        // Recursively process children
        if (node.children && Array.isArray(node.children)) {
          this.extractLanguagesFromCodeGraph(node.children, languageExtensions);
        }
      });
    } catch (error) {
      this.errorHandler.logError(
        "Error extracting languages from code graph",
        error,
        "FullCodeAnalysisWebview"
      );
    }
  }

  /**
   * Recursively count nodes in the code graph structure
   */
  private countNodesRecursively(nodes: any[], stats: {
    totalFiles: number;
    totalFolders: number;
    totalClasses: number;
    totalFunctions: number;
    totalLanguages: number;
    packageManager: string;
  }): void {
    if (!Array.isArray(nodes)) {
      return;
    }

    try {
      nodes.forEach((node: any) => {
        if (!node || typeof node !== 'object') {
          return;
        }

        // Count based on node type
        switch (node.type) {
          case 'file':
            stats.totalFiles++;
            break;
          case 'folder':
            stats.totalFolders++;
            break;
          case 'class':
            stats.totalClasses++;
            break;
          case 'function':
            stats.totalFunctions++;
            break;
        }

        // Recursively process children
        if (node.children && Array.isArray(node.children)) {
          this.countNodesRecursively(node.children, stats);
        }
      });
    } catch (error) {
      this.errorHandler.logError(
        "Error in recursive node counting",
        error,
        "FullCodeAnalysisWebview"
      );
    }
  }

  /**
   * Detect package manager with priority-based detection
   */
  private detectPackageManager(analysisData: any): string {
    const packageManagerPriority = [
      { file: 'poetry.lock', manager: 'Poetry' },
      { file: 'Pipfile', manager: 'Pipenv' },
      { file: 'requirements.txt', manager: 'pip' },
      { file: 'yarn.lock', manager: 'Yarn' },
      { file: 'package.json', manager: 'npm' }
    ];

    try {
      // Check if package manager is already detected in tech_stack
      if (analysisData.tech_stack?.package_manager && typeof analysisData.tech_stack.package_manager === 'string') {
        return analysisData.tech_stack.package_manager;
      }
      
      // Also check for package_managers array (legacy format)
      if (analysisData.tech_stack?.package_managers && Array.isArray(analysisData.tech_stack.package_managers)) {
        if (analysisData.tech_stack.package_managers.length > 0) {
          return analysisData.tech_stack.package_managers[0];
        }
      }

      // Search for package manager files in project structure
      if (analysisData.code_graph_json) {
        for (const pm of packageManagerPriority) {
          if (this.findFileInProject(analysisData.code_graph_json, pm.file)) {
            return pm.manager;
          }
        }
      }

      return 'Unknown';
    } catch (error) {
      this.errorHandler.logError(
        "Error detecting package manager",
        error,
        "FullCodeAnalysisWebview"
      );
      return 'Unknown';
    }
  }

  /**
   * Search for a specific file in the project structure
   */
  private findFileInProject(nodes: any[], fileName: string): boolean {
    if (!Array.isArray(nodes)) {
      return false;
    }

    try {
      for (const node of nodes) {
        if (!node || typeof node !== 'object') {
          continue;
        }

        // Check if current node matches the file name
        if (node.type === 'file' && node.name === fileName) {
          return true;
        }

        // Recursively search in children
        if (node.children && Array.isArray(node.children)) {
          if (this.findFileInProject(node.children, fileName)) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      this.errorHandler.logError(
        "Error searching for file in project",
        error,
        "FullCodeAnalysisWebview"
      );
      return false;
    }
  }

  /**
   * Filter frameworks to show only major Python frameworks
   */
  private filterMajorFrameworks(frameworks: any): [string, any][] {
    const majorPythonFrameworks = [
      'django', 'flask', 'fastapi', 'tornado', 'pyramid', 'bottle',
      'cherrypy', 'web2py', 'falcon', 'sanic', 'quart', 'starlette'
    ];

    try {
      if (!frameworks) {
        return [];
      }

      const filteredFrameworks: [string, any][] = [];
      
      // Handle array format
      if (Array.isArray(frameworks)) {
        frameworks.forEach((framework) => {
          if (typeof framework === 'string') {
            if (majorPythonFrameworks.includes(framework.toLowerCase())) {
              filteredFrameworks.push([framework, 'detected']);
            }
          } else if (typeof framework === 'object' && framework.name) {
            if (majorPythonFrameworks.includes(framework.name.toLowerCase())) {
              filteredFrameworks.push([framework.name, framework.version || 'detected']);
            }
          }
        });
      }
      // Handle object format
      else if (typeof frameworks === 'object') {
        Object.entries(frameworks).forEach(([name, version]) => {
          if (majorPythonFrameworks.includes(name.toLowerCase())) {
            filteredFrameworks.push([name, version]);
          }
        });
      }

      return filteredFrameworks;
    } catch (error) {
      this.errorHandler.logError(
        "Error filtering major frameworks",
        error,
        "FullCodeAnalysisWebview"
      );
      return [];
    }
  }

  /**
   * Detect DevOps tools in the project
   */
  private detectDevOpsTools(analysisData: any): {
    docker: boolean;
    kubernetes: boolean;
    other: string[];
  } {
    const devOpsTools = {
      docker: false,
      kubernetes: false,
      other: [] as string[]
    };

    try {
      // Check for Docker files
      if (analysisData.code_graph_json) {
        devOpsTools.docker = this.findFileInProject(analysisData.code_graph_json, 'Dockerfile') ||
                            this.findFileInProject(analysisData.code_graph_json, 'docker-compose.yml') ||
                            this.findFileInProject(analysisData.code_graph_json, 'docker-compose.yaml');

        // Check for Kubernetes files
        devOpsTools.kubernetes = this.findFileInProject(analysisData.code_graph_json, 'deployment.yaml') ||
                                 this.findFileInProject(analysisData.code_graph_json, 'deployment.yml') ||
                                 this.findFileInProject(analysisData.code_graph_json, 'k8s.yaml') ||
                                 this.findFileInProject(analysisData.code_graph_json, 'k8s.yml');
      }

      // Check for other DevOps tools in tech_stack
      const devOpsCategories = ['build_tools', 'dev_tools', 'config_files'];
      const devOpsKeywords = ['jenkins', 'gitlab-ci', 'github-actions', 'circleci', 'travis', 'ansible', 'terraform', 'vagrant', 'helm'];

      devOpsCategories.forEach(category => {
        if (analysisData.tech_stack?.[category] && Array.isArray(analysisData.tech_stack[category])) {
          analysisData.tech_stack[category].forEach((tool: string) => {
            const toolLower = tool.toLowerCase();
            if (devOpsKeywords.some(keyword => toolLower.includes(keyword))) {
              if (!devOpsTools.other.includes(tool)) {
                devOpsTools.other.push(tool);
              }
            }
          });
        }
      });

    } catch (error) {
      this.errorHandler.logError(
        "Error detecting DevOps tools",
        error,
        "FullCodeAnalysisWebview"
      );
    }

    return devOpsTools;
  }

  /**
   * Process and sort libraries handling multiple data formats
   */
  private processAndSortLibraries(libraries: any): { name: string; version: string }[] {
    try {
      if (!libraries) {
        return [];
      }

      let libraryList: { name: string; version: string }[] = [];

      // Handle different data formats
      if (Array.isArray(libraries)) {
        libraries.forEach((lib: any) => {
          if (typeof lib === 'string') {
            libraryList.push({ name: lib, version: '' });
          } else if (typeof lib === 'object' && lib !== null) {
            const libName = lib.name || lib.library || lib.package || 'Unknown';
            const libVersion = lib.version || '';
            libraryList.push({ name: libName, version: libVersion });
          }
        });
      } else if (typeof libraries === 'object') {
        Object.entries(libraries).forEach(([library, version]) => {
          libraryList.push({ 
            name: library, 
            version: typeof version === 'string' ? version : String(version || '') 
          });
        });
      }

      // Sort alphabetically by name
      libraryList.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

      return libraryList;
    } catch (error) {
      this.errorHandler.logError(
        "Error processing and sorting libraries",
        error,
        "FullCodeAnalysisWebview"
      );
      return [];
    }
  }

  /**
   * Generate tech stack content
   */
  private generateTechStackContent(analysisData: any): string {
    try {
      if (!analysisData?.tech_stack) {
        return '<div class="empty-state"><div class="empty-icon">🛠️</div><h3>No Tech Stack Data</h3><p>No technology stack information available.</p></div>';
      }

      let html = '<div class="tech-overview">';

      // Calculate comprehensive statistics using new helper methods
      const stats = this.calculateTechStackStats(analysisData);
      const packageManager = this.detectPackageManager(analysisData);

      // Add package manager to stats
      stats.packageManager = packageManager;

      // Debug logging for data flow analysis
      this.errorHandler.logError(
        `Tech Stack Analysis - Languages calculated: ${stats.totalLanguages}, Files: ${stats.totalFiles}, Frameworks detected: ${this.filterMajorFrameworks(analysisData.tech_stack?.frameworks || []).length}`,
        null,
        "FullCodeAnalysisWebview"
      );
      


    // Project Summary with enhanced statistics
    html += "<h3>📊 Project Overview</h3>";
    html += '<div class="summary-grid">';
    html += `<div class="summary-item"><div class="summary-value">${stats.totalFiles}</div><div class="summary-label">Files</div></div>`;
    html += `<div class="summary-item"><div class="summary-value">${stats.totalClasses}</div><div class="summary-label">Classes</div></div>`;
    html += `<div class="summary-item"><div class="summary-value">${stats.totalFunctions}</div><div class="summary-label">Functions</div></div>`;
    html += "</div>";

    // Categorized Technology Stack - replaces individual sections
    html += this.generateCategorizedTechStack(analysisData);

    return html;

    } catch (error) {
      this.errorHandler.logError(
        "Error generating tech stack content",
        error,
        "FullCodeAnalysisWebview"
      );
      return '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Error Loading Tech Stack</h3><p>An error occurred while processing the tech stack data.</p></div>';
    }
  }

  /**
   * Generate categorized tech stack using Python-provided data only
   */
  private generateCategorizedTechStack(analysisData: any): string {
    try {
      // Check if we have Python-categorized data
      if (analysisData?.categorized_tech_stack) {
        this.errorHandler.logError(
          'Using Python-provided categorized tech stack data with modern dashboard',
          null,
          'FullCodeAnalysisWebview'
        );
        
        // Use modern dashboard for tech stack display
        return this.categoryDisplayManager.generateModernDashboardHTML(analysisData);
      } else {
        this.errorHandler.logError(
          'No Python categorization available - waiting for Python categorization system',
          null,
          'FullCodeAnalysisWebview'
        );
        
        // No fallback - show message that Python categorization is not available
        return `
          <div class="tech-categorization-pending">
            <div class="pending-icon">⏳</div>
            <h3>Python Categorization System Not Available</h3>
            <p>The enhanced tech stack categorization system is not yet implemented.</p>
            <p>This will display categorized technologies once the Python categorization system is complete.</p>
          </div>
        `;
      }
    } catch (error) {
      this.errorHandler.logError(
        'Error generating categorized tech stack',
        error,
        'FullCodeAnalysisWebview'
      );
      
      // Error state
      return `
        <div class="tech-categorization-error">
          <div class="error-icon">⚠️</div>
          <h3>Error Loading Categorized Tech Stack</h3>
          <p>An error occurred while processing the categorized tech stack data.</p>
        </div>
      `;
    }
  }

  /**
   * Generate code graph JSON content
   */
  private generateCodeGraphJsonContent(analysisData: any): string {
    if (!analysisData?.code_graph_json) {
      return '<div class="empty-state"><div class="empty-icon">📄</div><h3>No JSON Data</h3><p>No mind map JSON data available.</p></div>';
    }

    return `<pre style="background: var(--vscode-textCodeBlock-background); padding: 16px; border-radius: 4px; overflow: auto; max-height: 400px; font-size: 12px;">${JSON.stringify(
      analysisData.code_graph_json,
      null,
      2
    )}</pre>`;
  }

  /**
   * Prepare graph data from analysis data with performance optimization
   */
  private prepareGraphData(analysisData: any): any {
    // Use code_graph_json directly as projectData (no transformation needed)
    const projectData = analysisData?.code_graph_json || [];
    
    // Calculate data size for optimization decisions
    const dataSize = this.calculateDataSize(analysisData);
    const isLargeDataset = dataSize > 1024 * 1024; // 1MB threshold
    
    console.log(`Data size: ${(dataSize / 1024 / 1024).toFixed(2)}MB, Large dataset: ${isLargeDataset}`);
    
    // Apply optimizations for large datasets
    let optimizedProjectData = projectData;
    if (isLargeDataset) {
      optimizedProjectData = this.optimizeForLargeDataset(projectData, dataSize);
    }

    return {
      elements: [],
      style: [],
      layout: { name: "preset" },
      state: {
        projectData: optimizedProjectData,
        expanded: {},
        isLargeDataset: isLargeDataset,
        originalDataSize: dataSize,
        optimizationApplied: isLargeDataset,
      },
    };
  }

  /**
   * Calculate the size of the analysis data in bytes
   */
  private calculateDataSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch (error) {
      console.warn('Failed to calculate data size:', error);
      return 0;
    }
  }

  /**
   * Optimize project data for large datasets
   */
  private optimizeForLargeDataset(projectData: any[], dataSize: number): any[] {
    console.log('Applying large dataset optimizations...');
    
    // For extremely large datasets (>50MB), show only top-level folders initially
    if (dataSize > 50 * 1024 * 1024) {
      console.log('Extremely large dataset detected, showing simplified structure');
      return this.createSimplifiedStructure(projectData);
    }
    
    // For very large datasets (>20MB), be more aggressive with limiting
    if (dataSize > 20 * 1024 * 1024) {
      console.log('Very large dataset detected, applying aggressive limits');
      return this.limitDatasetComplexity(projectData);
    }
    
    // For moderately large datasets (1-20MB), apply gentle optimizations
    console.log('Moderately large dataset detected, applying gentle optimizations');
    return this.applyGentleOptimizations(projectData);
  }

  /**
   * Apply gentle optimizations for moderately large datasets
   */
  private applyGentleOptimizations(projectData: any[]): any[] {
    // For datasets like our 6MB test file, we want to show most content but optimize performance
    // Only limit extremely deep nesting (>8 levels) and huge child counts (>200)
    const maxDepth = 8;
    const maxChildrenPerNode = 200;
    
    const optimizeNode = (node: any, currentDepth: number): any => {
      if (currentDepth >= maxDepth) {
        const childCount = node.children ? this.countTotalNodes(node.children) : 0;
        if (childCount > 10) { // Only truncate if there are many children
          return {
            ...node,
            children: [{
              name: `... ${childCount} more items (deep nesting)`,
              type: 'summary',
              _truncated: true,
              _reason: 'deep'
            }]
          };
        }
      }
      
      if (node.children && node.children.length > maxChildrenPerNode) {
        const visibleChildren = node.children.slice(0, maxChildrenPerNode);
        const hiddenCount = node.children.length - maxChildrenPerNode;
        
        return {
          ...node,
          children: [
            ...visibleChildren.map((child: any) => optimizeNode(child, currentDepth + 1)),
            {
              name: `... ${hiddenCount} more items`,
              type: 'summary',
              _truncated: true,
              _hiddenCount: hiddenCount
            }
          ]
        };
      }
      
      return {
        ...node,
        children: node.children ? node.children.map((child: any) => optimizeNode(child, currentDepth + 1)) : []
      };
    };
    
    return projectData.map(folder => optimizeNode(folder, 0));
  }

  /**
   * Create a simplified structure for very large datasets
   */
  private createSimplifiedStructure(projectData: any[]): any[] {
    return projectData.map(folder => ({
      name: folder.name,
      type: folder.type,
      children: folder.children ? this.summarizeChildren(folder.children) : [],
      _originalChildCount: folder.children ? this.countTotalNodes(folder.children) : 0,
      _simplified: true
    }));
  }

  /**
   * Summarize children for simplified view
   */
  private summarizeChildren(children: any[]): any[] {
    const summary = {
      files: 0,
      folders: 0,
      functions: 0,
      classes: 0
    };
    
    const countNodes = (nodes: any[]) => {
      nodes.forEach(node => {
        switch (node.type) {
          case 'file': summary.files++; break;
          case 'folder': summary.folders++; break;
          case 'function': summary.functions++; break;
          case 'class': summary.classes++; break;
        }
        if (node.children) {
          countNodes(node.children);
        }
      });
    };
    
    countNodes(children);
    
    // Return summary nodes
    const summaryNodes = [];
    if (summary.folders > 0) {
      summaryNodes.push({
        name: `📁 ${summary.folders} folders`,
        type: 'summary',
        _count: summary.folders,
        _type: 'folders'
      });
    }
    if (summary.files > 0) {
      summaryNodes.push({
        name: `📄 ${summary.files} files`,
        type: 'summary',
        _count: summary.files,
        _type: 'files'
      });
    }
    if (summary.functions > 0) {
      summaryNodes.push({
        name: `⚙️ ${summary.functions} functions`,
        type: 'summary',
        _count: summary.functions,
        _type: 'functions'
      });
    }
    if (summary.classes > 0) {
      summaryNodes.push({
        name: `🏛️ ${summary.classes} classes`,
        type: 'summary',
        _count: summary.classes,
        _type: 'classes'
      });
    }
    
    return summaryNodes;
  }

  /**
   * Limit dataset complexity for moderately large datasets
   */
  private limitDatasetComplexity(projectData: any[]): any[] {
    // For large datasets, we'll be less aggressive - only limit very deep nesting and huge child counts
    const maxDepth = 5; // Increased from 3 to show more structure
    const maxChildrenPerNode = 100; // Increased from 50 to show more items
    
    const limitNode = (node: any, currentDepth: number): any => {
      // Only truncate at very deep levels
      if (currentDepth >= maxDepth) {
        const childCount = node.children ? this.countTotalNodes(node.children) : 0;
        if (childCount > 0) {
          return {
            ...node,
            children: [{
              name: `... ${childCount} more items (depth limit reached)`,
              type: 'summary',
              _truncated: true,
              _reason: 'depth'
            }]
          };
        }
      }
      
      // Only truncate if there are way too many children
      if (node.children && node.children.length > maxChildrenPerNode) {
        const visibleChildren = node.children.slice(0, maxChildrenPerNode);
        const hiddenCount = node.children.length - maxChildrenPerNode;
        
        return {
          ...node,
          children: [
            ...visibleChildren.map((child: any) => limitNode(child, currentDepth + 1)),
            {
              name: `... ${hiddenCount} more items (showing first ${maxChildrenPerNode})`,
              type: 'summary',
              _truncated: true,
              _hiddenCount: hiddenCount,
              _reason: 'count'
            }
          ]
        };
      }
      
      return {
        ...node,
        children: node.children ? node.children.map((child: any) => limitNode(child, currentDepth + 1)) : []
      };
    };
    
    return projectData.map(folder => limitNode(folder, 0));
  }

  /**
   * Count total nodes in a tree structure
   */
  private countTotalNodes(nodes: any[]): number {
    let count = 0;
    const countRecursive = (nodeList: any[]) => {
      nodeList.forEach(node => {
        count++;
        if (node.children) {
          countRecursive(node.children);
        }
      });
    };
    countRecursive(nodes);
    return count;
  }

  /**
   * Generate CSS styles
   */
  private generateStyles(): string {
    return `
      .analysis-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
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
        background: var(--vscode-tab-activeBackground);
        color: var(--vscode-tab-activeForeground);
        border-bottom-color: var(--vscode-tab-activeBorder);
      }

      /* Search container styles */
      #search-container {
        background: var(--vscode-editor-background);
        border-bottom: 1px solid var(--vscode-panel-border);
      }

      #search-input {
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border);
      }

      #search-input:focus {
        outline: none;
        border-color: var(--vscode-focusBorder);
      }

      /* Progress bar styles */
      #progress-container {
        background: var(--vscode-editor-background);
      }

      #progress-bar {
        background: var(--vscode-progressBar-foreground);
        transition: width 0.3s ease;
      }

      /* Performance info styles */
      #performance-info {
        background: var(--vscode-editor-background);
        padding: 12px;
        border-radius: 4px;
        border: 1px solid var(--vscode-panel-border);
      }

      /* Loading animation */
      #loading-icon {
        animation: spin 2s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* Highlighted search results */
      .highlighted {
        border-width: 4px !important;
        border-color: #ff6b6b !important;
        background-color: #ffe066 !important;
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
      }

      .content-section.active {
        display: block;
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
      }

      .tech-overview {
        padding: 0;
      }

      .tech-summary {
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border);
        border-radius: 6px;
        padding: 20px;
        margin-bottom: 24px;
      }

      .tech-summary h3 {
        margin: 0 0 16px 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--vscode-editor-foreground);
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 12px;
        max-width: 100%;
        margin-bottom: 20px;
      }

      @media (max-width: 1200px) {
        .summary-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      @media (max-width: 800px) {
        .summary-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media (max-width: 600px) {
        .summary-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media (max-width: 400px) {
        .summary-grid {
          grid-template-columns: 1fr;
        }
      }

      .summary-item {
        text-align: center;
        padding: 12px;
        background: var(--vscode-editor-background);
        border-radius: 4px;
        border: 1px solid var(--vscode-panel-border);
      }

      .summary-value {
        font-size: 24px;
        font-weight: 700;
        color: var(--vscode-editor-foreground);
        margin-bottom: 4px;
      }

      .summary-label {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .tech-grid {
        display: grid;
        grid-template-columns: 1;
        gap: 20px;
      }

      .tech-section {
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border);
        border-radius: 6px;
        padding: 16px;
      }

      .tech-section h4 {
        margin: 0 0 16px 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--vscode-editor-foreground);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .tech-items {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .tech-item {
        padding: 12px;
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-panel-border);
        border-color: orange;
        border-radius: 4px;
        transition: all 0.2s ease;
      }

      .tech-item:hover {
        background: var(--vscode-list-hoverBackground);
        border-color: var(--vscode-focusBorder);
      }

      .tech-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .tech-name {
        font-weight: 600;
        font-size: 14px;
        color: var(--vscode-editor-foreground);
      }

      .tech-details {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .tech-count, .tech-version {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        padding: 2px 6px;
        border-radius: 3px;
        font-weight: 500;
      }

      .tech-percentage {
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        font-weight: 600;
      }

      .tech-bar {
        width: 100%;
        height: 4px;
        background: var(--vscode-panel-border);
        border-radius: 2px;
        overflow: hidden;
      }

      .tech-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--vscode-progressBar-background), var(--vscode-focusBorder));
        border-radius: 2px;
        transition: width 0.3s ease;
      }

      /* Enhanced responsive libraries grid layout */
      .tech-libraries-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        max-width: 100%;
      }

      /* Tablet: 3 columns */
      @media (max-width: 800px) {
        .tech-libraries-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      /* Mobile: 2 columns */
      @media (max-width: 600px) {
        .tech-libraries-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      /* Small Mobile: 1 column */
      @media (max-width: 400px) {
        .tech-libraries-grid {
          grid-template-columns: 1fr;
        }
      }

      .tech-library-item {
        padding: 10px 14px;
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 6px;
        transition: all 0.3s ease;
        min-height: 50px;
        display: flex;
        align-items: center;
        cursor: pointer;
        position: relative;
        overflow: hidden;
      }

      .tech-library-item:hover {
        background: var(--vscode-list-hoverBackground);
        border-color: var(--vscode-focusBorder);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .tech-library-item:active {
        transform: translateY(0);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      }

      .tech-library-item .tech-info {
        margin-bottom: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
      }

      .tech-library-item .tech-name {
        font-size: 13px;
        font-weight: 600;
        display: block;
        color: var(--vscode-editor-foreground);
        line-height: 1.3;
      }

      .tech-library-item .tech-version {
        font-size: 11px;
        display: block;
        color: var(--vscode-badge-foreground);
        background: var(--vscode-badge-background);
        padding: 2px 6px;
        border-radius: 3px;
        font-weight: 500;
        align-self: center;
        text-align: center;
        margin-top: 4px;
        width: fit-content;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 200px;
        text-align: center;
        gap: 16px;
        opacity: 0.7;
      }

      .empty-icon {
        font-size: 48px;
        opacity: 0.5;
      }

      .empty-state h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }

      .empty-state p {
        margin: 0;
        font-size: 14px;
        color: var(--vscode-descriptionForeground);
      }
    `;
  }

  /**
   * Generate error HTML
   */
  private generateErrorHTML(message: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Error</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .error-container {
            text-align: center;
            max-width: 400px;
          }
          .error-icon {
            font-size: 64px;
            margin-bottom: 16px;
          }
          .error-message {
            font-size: 16px;
            color: var(--vscode-errorForeground);
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <div class="error-icon">⚠️</div>
          <div class="error-message">${message}</div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    if (this.panel) {
      this.panel.webview.html = this.generateErrorHTML(message);
    }
  }

  /**
   * Handle messages from webview
   */
  private handleWebviewMessage(message: any): void {
    switch (message.command) {
      case "retryAnalysis":
        // Handle retry logic if needed
        this.errorHandler.logError(
          "Retry analysis requested from webview",
          null,
          "FullCodeAnalysisWebview"
        );
        break;
      case "toggleCodeLens":
        // Handle code lens toggle
        this.errorHandler.logError(
          "Code lens toggle requested from webview",
          null,
          "FullCodeAnalysisWebview"
        );
        vscode.commands.executeCommand('doracodelens.toggleCodeLens');
        break;
      default:
        this.errorHandler.logError(
          "Unknown message from webview",
          message,
          "FullCodeAnalysisWebview"
        );
    }
  }

  /**
   * Check if webview is visible
   */
  public isVisible(): boolean {
    return this.panel !== null && this.panel.visible;
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
}
