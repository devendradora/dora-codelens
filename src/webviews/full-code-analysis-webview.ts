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

    const webview = this.panel!.webview;

    // Get resource URIs
    const cssUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.extensionPath, "resources", "webview.css"))
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
                <span class="nav-label">Code Graph</span>
              </button>
              <button class="nav-link" data-tab="code-graph-json-section">
                <span class="nav-icon">📄</span>
                <span class="nav-label">Code Graph JSON</span>
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

            <!-- Code Graph Section -->
            <section id="code-graph-section" class="content-section">
              <div class="section-header" style="margin-bottom: 16px;">
                <h2 style="margin: 0 0 16px 0;">🕸️ Code Graph Visualization</h2>
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
                  <!-- Code Lens Toggle -->
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <button id="toggle-code-lens-btn" style="padding: 8px 12px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer; font-size: 12px; font-weight: 600;" title="Toggle Code Lens">
                      📊 Toggle Code Lens
                    </button>
                  </div>
                </div>
              </div>
              <div class="section-content" style="position: relative; padding: 0;">
                <div id="graph-loading" style="text-align: center; padding: 40px; font-size: 16px;">
                  <div style="margin-bottom: 16px;">🔄</div>
                  <div>Initializing interactive code graph...</div>
                </div>
                <div id="enhanced-graph" style="width: 100%; height: 600px; border: 1px solid var(--vscode-panel-border); display: none;"></div>
                


                <!-- Legend Panel (Bottom Right) -->
                <div class="legend" style="position: fixed; bottom: 16px; right: 16px; background: var(--vscode-editor-background); padding: 12px; border: 1px solid var(--vscode-panel-border); border-radius: 5px; font-size: 12px; display: none; z-index: 1000; min-width: 180px; max-height: 80vh; overflow-y: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <div style="font-weight: bold; margin-bottom: 12px; font-size: 13px;">📊 Legend</div>
                  
                  <!-- Legend -->
                  <div>
                    <div style="margin-bottom: 6px;"><span style="display: inline-block; width: 16px; height: 16px; margin-right: 8px; vertical-align: middle; background: yellow; border:1px solid #000; border-radius: 2px;"></span> 📁 Folder</div>
                    <div style="margin-bottom: 6px;"><span style="display: inline-block; width: 16px; height: 16px; margin-right: 8px; vertical-align: middle; background: skyblue; border:1px solid #000; border-radius: 2px;"></span> 📄 File</div>
                    <div style="margin-bottom: 6px;"><span style="display: inline-block; width: 16px; height: 16px; margin-right: 8px; vertical-align: middle; background: orange; clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);"></span> 🏛️ Class</div>
                    <div style="margin-bottom: 6px;"><span style="display: inline-block; width: 16px; height: 16px; margin-right: 8px; vertical-align: middle; background: green; border-radius: 50%;"></span> ⚙️ Function</div>
                    <div style="margin-bottom: 6px;"><span style="display: inline-block; width: 24px; height: 2px; margin-right: 8px; vertical-align: middle; background: #888;"></span> Contains</div>
                    <div><span style="display: inline-block; width: 24px; height: 2px; margin-right: 8px; vertical-align: middle; background: red;"></span> Calls</div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Code Graph JSON Section -->
            <section id="code-graph-json-section" class="content-section">
              <div class="section-header">
                <h2>📄 Code Graph JSON Data</h2>
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
                  
                  // If switching to code graph tab, initialize graph if not already done
                  if (targetTab === 'code-graph-section' && !window.graphInitialized) {
                    setTimeout(() => {
                      initializeGraph();
                    }, 100);
                  }
                }
              });
            });
          }

          function initializeGraph() {
            // Check if Cytoscape is available
            if (typeof cytoscape === 'undefined') {
              console.log('Cytoscape not loaded yet, retrying...');
              setTimeout(initializeGraph, 100);
              return;
            }

            console.log('Cytoscape loaded, initializing graph...');
            console.log('DOM elements check:');
            console.log('- layout-select:', !!document.getElementById('layout-select'));
            console.log('- zoom-in-btn:', !!document.getElementById('zoom-in-btn'));
            console.log('- zoom-out-btn:', !!document.getElementById('zoom-out-btn'));
            console.log('- expand-all-btn:', !!document.getElementById('expand-all-btn'));
            console.log('- collapse-all-btn:', !!document.getElementById('collapse-all-btn'));
            
            const container = document.getElementById('enhanced-graph');
            const loadingElement = document.getElementById('graph-loading');
            
            if (!container) {
              console.error('Graph container not found');
              return;
            }

            // Get project data
            const projectData = graphData?.state?.projectData || [];
            console.log('Project data:', projectData.length, 'folders');

            if (projectData.length === 0) {
              showEmptyState();
              return;
            }

            try {
              // Create Cytoscape instance with exact dora.html configuration
              const cy = cytoscape({
                container: container,
                style: [
                  { selector: 'node[type="folder"]', style: { shape:'rectangle','background-color':'yellow', label:'data(name)','text-valign':'center','text-halign':'center','font-weight':'bold','border-width':2,'border-color':'#000','width':150,'height':80 } },
                  { selector: 'node[type="file"]', style: { shape:'rectangle','background-color':'skyblue', label:'data(name)','text-valign':'center','text-halign':'center','border-width':1,'border-color':'#000','width':120,'height':60 } },
                  { selector: 'node[type="class"]', style: { shape:'hexagon','background-color':'orange', label:'data(name)','text-valign':'center','text-halign':'center','width':100,'height':60 } },
                  { selector: 'node[type="function"]', style: { shape:'ellipse', 'color':'#fff', label:'data(name)','text-valign':'center','text-halign':'center','width':60,'height':40,'font-size':10 } },
                  { selector: 'node[complexity="low"]', style: { 'background-color':'green' } },
                  { selector: 'node[complexity="medium"]', style: { 'background-color':'orange' } },
                  { selector: 'node[complexity="high"]', style: { 'background-color':'red' } },
                  { selector: 'edge[type="contains"]', style: { width:2, 'line-color':'#888','curve-style':'bezier' } },
                  { selector: 'edge[type="calls"]', style: { width:2,'line-color':'red','target-arrow-shape':'triangle','target-arrow-color':'red','curve-style':'bezier' } },
                  { selector: 'edge[label]', style: { label:'data(label)','text-rotation':'autorotate','text-margin-y':-10,'font-size':10 } }
                ],
                layout: { name:'preset' }
              });

              const expanded = {};
              const width = container.offsetWidth || 800;
              const height = container.offsetHeight || 600;
              
              // Store cytoscape instance and data globally for controls
              window.cy = cy;
              window.expanded = expanded;
              window.projectData = projectData;

              // Position folders in corners and edges for better distribution
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

              // Add top-level folder nodes positioned in corners/edges
              projectData.forEach((folder, i) => {
                const position = positions[i % positions.length];
                // If more folders than positions, create a spiral pattern
                if (i >= positions.length) {
                  const angle = (i - positions.length) * 0.5;
                  const radius = 200 + (Math.floor((i - positions.length) / 8) * 100);
                  position.x = width / 2 + Math.cos(angle) * radius;
                  position.y = height / 2 + Math.sin(angle) * radius;
                }
                cy.add({ 
                  data: { id: folder.name, name: folder.name, type: 'folder' }, 
                  position: position 
                });
              });

              // Folder expansion logic
              cy.on('tap', 'node[type="folder"]', function(evt) {
                const folderId = evt.target.id();
                console.log('Folder clicked:', folderId);
                toggleFolder(cy, folderId, expanded, projectData);
              });

              // Setup zoom and pan controls
              setupGraphControls(cy);
              
              // Test basic functionality
              console.log('🧪 Testing basic functionality...');
              setTimeout(() => {
                console.log('Current graph state:');
                console.log('- Total nodes:', cy.nodes().length);
                console.log('- Total edges:', cy.edges().length);
                console.log('- Folder nodes:', cy.nodes('[type="folder"]').length);
                console.log('- Expanded folders:', Object.keys(window.expanded).filter(id => window.expanded[id]));
              }, 1000);

              // Show graph and legend, hide loading
              container.style.display = 'block';
              loadingElement.style.display = 'none';
              
              const legendElement = document.querySelector('.legend');
              if (legendElement) {
                legendElement.style.display = 'block';
              }
              
              console.log('✅ Graph initialized successfully');
              window.graphInitialized = true;

            } catch (error) {
              console.error('Error initializing graph:', error);
              showErrorState(error.message);
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

            // Code Lens Toggle
            safeAddEventListener('toggle-code-lens-btn', 'click', function() {
              console.log('Code lens toggle clicked');
              vscode.postMessage({
                command: 'toggleCodeLens'
              });
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
            if (expanded[folderId]) {
              // Collapse
              collapseFolder(cy, folderId, expanded);
            } else {
              // Expand
              expandFolder(cy, folderId, expanded, projectData);
            }
          }

          function expandFolder(cy, folderId, expanded, projectData) {
            console.log('Expanding folder:', folderId);
            
            const folderData = projectData.find(f => f.name === folderId);
            if (!folderData) {
              console.warn('Folder data not found for:', folderId);
              return;
            }
            
            if (!folderData.children || folderData.children.length === 0) {
              console.log('No children found for folder:', folderId);
              return;
            }
            
            console.log('Adding', folderData.children.length, 'children to folder:', folderId);
            folderData.children.forEach((child, i) => {
              addNode(cy, folderId, child, folderId, 1, i);
            });
            
            expanded[folderId] = true;
            console.log('Folder expanded successfully:', folderId);
            
            // Use a gentler layout that doesn't move everything
            cy.layout({ name:'cose', fit:false, animate:true, randomize:false }).run();
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
            
            container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; text-align: center;"><div><div style="font-size: 48px; margin-bottom: 16px;">🕸️</div><h3>No Graph Data</h3><p>No code graph data available to display.</p></div></div>';
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
            
            container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; text-align: center;"><div><div style="font-size: 48px; margin-bottom: 16px;">⚠️</div><h3>Graph Error</h3><p>' + message + '</p><button onclick="location.reload()" style="margin-top: 16px; padding: 8px 16px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer;">Retry</button></div></div>';
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
   * Generate tech stack content
   */
  private generateTechStackContent(analysisData: any): string {
    if (!analysisData?.tech_stack) {
      return '<div class="empty-state"><div class="empty-icon">🛠️</div><h3>No Tech Stack Data</h3><p>No technology stack information available.</p></div>';
    }

    let html = '<div class="tech-overview">';

    // Project Summary
    html += '<div class="tech-summary">';
    html += "<h3>📊 Project Overview</h3>";
    html += '<div class="summary-grid">';

    // Calculate totals
    const totalFiles = analysisData.tech_stack.languages
      ? Object.values(analysisData.tech_stack.languages).reduce(
          (sum: number, count: any) =>
            sum + (typeof count === "number" ? count : 0),
          0
        )
      : 0;
    const totalLanguages = analysisData.tech_stack.languages
      ? Object.keys(analysisData.tech_stack.languages).length
      : 0;
    const totalFrameworks = analysisData.tech_stack.frameworks
      ? Object.keys(analysisData.tech_stack.frameworks).length
      : 0;
    const totalLibraries = analysisData.tech_stack.libraries
      ? Object.keys(analysisData.tech_stack.libraries).length
      : 0;

    html += `<div class="summary-item"><div class="summary-value">${totalFiles}</div><div class="summary-label">Total Files</div></div>`;
    html += `<div class="summary-item"><div class="summary-value">${totalLanguages}</div><div class="summary-label">Languages</div></div>`;
    html += `<div class="summary-item"><div class="summary-value">${totalFrameworks}</div><div class="summary-label">Frameworks</div></div>`;
    html += `<div class="summary-item"><div class="summary-value">${totalLibraries}</div><div class="summary-label">Libraries</div></div>`;
    html += "</div></div>";

    html += '<div class="tech-grid">';

    // Languages with detailed breakdown
    if (analysisData.tech_stack.languages) {
      html +=
        '<div class="tech-section"><h4>🔤 Programming Languages</h4><div class="tech-items">';
      const sortedLanguages = Object.entries(
        analysisData.tech_stack.languages
      ).sort(([, a], [, b]) => (b as number) - (a as number));

      sortedLanguages.forEach(([lang, count]) => {
        const percentage =
          totalFiles > 0
            ? (((count as number) / totalFiles) * 100).toFixed(1)
            : "0";
        html += `<div class="tech-item">
          <div class="tech-info">
            <span class="tech-name">${lang}</span>
            <div class="tech-details">
              <span class="tech-count">${count} files</span>
              <span class="tech-percentage">${percentage}%</span>
            </div>
          </div>
          <div class="tech-bar">
            <div class="tech-bar-fill" style="width: ${percentage}%"></div>
          </div>
        </div>`;
      });
      html += "</div></div>";
    }

    // Frameworks with versions
    if (analysisData.tech_stack.frameworks) {
      html +=
        '<div class="tech-section"><h4>🚀 Frameworks & Platforms</h4><div class="tech-items">';
      Object.entries(analysisData.tech_stack.frameworks).forEach(
        ([framework, version]) => {
          html += `<div class="tech-item">
          <div class="tech-info">
            <span class="tech-name">${framework}</span>
            <span class="tech-version">v${version}</span>
          </div>
        </div>`;
        }
      );
      html += "</div></div>";
    }

    // Libraries and Dependencies
    if (analysisData.tech_stack.libraries) {
      html +=
        '<div class="tech-section"><h4>📚 Libraries & Dependencies</h4><div class="tech-items">';
      Object.entries(analysisData.tech_stack.libraries).forEach(
        ([library, version]) => {
          html += `<div class="tech-item">
          <div class="tech-info">
            <span class="tech-name">${library}</span>
            <span class="tech-version">${version}</span>
          </div>
        </div>`;
        }
      );
      html += "</div></div>";
    }

    // Package Managers
    if (analysisData.tech_stack.package_managers) {
      html +=
        '<div class="tech-section"><h4>📦 Package Managers</h4><div class="tech-items">';
      analysisData.tech_stack.package_managers.forEach((pm: string) => {
        html += `<div class="tech-item">
          <span class="tech-name">${pm}</span>
        </div>`;
      });
      html += "</div></div>";
    }

    // Build Tools
    if (analysisData.tech_stack.build_tools) {
      html +=
        '<div class="tech-section"><h4>🔧 Build Tools</h4><div class="tech-items">';
      analysisData.tech_stack.build_tools.forEach((tool: string) => {
        html += `<div class="tech-item">
          <span class="tech-name">${tool}</span>
        </div>`;
      });
      html += "</div></div>";
    }

    // Configuration Files
    if (analysisData.tech_stack.config_files) {
      html +=
        '<div class="tech-section"><h4>⚙️ Configuration Files</h4><div class="tech-items">';
      analysisData.tech_stack.config_files.forEach((config: string) => {
        html += `<div class="tech-item">
          <span class="tech-name">${config}</span>
        </div>`;
      });
      html += "</div></div>";
    }

    // Database Technologies
    if (analysisData.tech_stack.databases) {
      html +=
        '<div class="tech-section"><h4>🗄️ Databases</h4><div class="tech-items">';
      analysisData.tech_stack.databases.forEach((db: string) => {
        html += `<div class="tech-item">
          <span class="tech-name">${db}</span>
        </div>`;
      });
      html += "</div></div>";
    }

    // Testing Frameworks
    if (analysisData.tech_stack.testing_frameworks) {
      html +=
        '<div class="tech-section"><h4>🧪 Testing Frameworks</h4><div class="tech-items">';
      analysisData.tech_stack.testing_frameworks.forEach((test: string) => {
        html += `<div class="tech-item">
          <span class="tech-name">${test}</span>
        </div>`;
      });
      html += "</div></div>";
    }

    // Development Tools
    if (analysisData.tech_stack.dev_tools) {
      html +=
        '<div class="tech-section"><h4>🛠️ Development Tools</h4><div class="tech-items">';
      analysisData.tech_stack.dev_tools.forEach((tool: string) => {
        html += `<div class="tech-item">
          <span class="tech-name">${tool}</span>
        </div>`;
      });
      html += "</div></div>";
    }

    html += "</div></div>";
    return html;
  }

  /**
   * Generate code graph JSON content
   */
  private generateCodeGraphJsonContent(analysisData: any): string {
    if (!analysisData?.code_graph_json) {
      return '<div class="empty-state"><div class="empty-icon">📄</div><h3>No JSON Data</h3><p>No code graph JSON data available.</p></div>';
    }

    return `<pre style="background: var(--vscode-textCodeBlock-background); padding: 16px; border-radius: 4px; overflow: auto; max-height: 400px; font-size: 12px;">${JSON.stringify(
      analysisData.code_graph_json,
      null,
      2
    )}</pre>`;
  }

  /**
   * Prepare graph data from analysis data
   */
  private prepareGraphData(analysisData: any): any {
    // Use code_graph_json directly as projectData (no transformation needed)
    const projectData = analysisData?.code_graph_json || [];

    return {
      elements: [],
      style: [],
      layout: { name: "preset" },
      state: {
        projectData: projectData,
        expanded: {},
      },
    };
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
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 16px;
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
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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
        vscode.commands.executeCommand('doracodebird.toggleCodeLens');
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
