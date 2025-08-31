import * as vscode from 'vscode';
import * as path from 'path';
import { ErrorHandler } from '../core/error-handler';

/**
 * Database Schema Webview Provider
 * Provides dedicated webview for displaying database schema visualization
 */
export class DatabaseSchemaWebview {
  private static readonly VIEW_TYPE = 'doracodebirdview.databaseSchema';
  private panel: vscode.WebviewPanel | null = null;
  private errorHandler: ErrorHandler;
  private extensionPath: string;
  private currentData: any = null;

  constructor(errorHandler: ErrorHandler, extensionPath: string) {
    this.errorHandler = errorHandler;
    this.extensionPath = extensionPath;
  }

  /**
   * Show the database schema webview
   */
  public show(schemaData: any): void {
    try {
      this.currentData = schemaData;

      if (this.panel) {
        // If panel exists, update it and bring to front
        this.updateContent(schemaData);
        this.panel.reveal(vscode.ViewColumn.One);
      } else {
        // Create new panel
        this.createPanel();
        this.updateContent(schemaData);
      }

      this.errorHandler.logError('Database schema webview shown', null, 'DatabaseSchemaWebview');
    } catch (error) {
      this.errorHandler.logError('Failed to show database schema webview', error, 'DatabaseSchemaWebview');
      throw error;
    }
  }

  /**
   * Create the webview panel
   */
  private createPanel(): void {
    this.panel = vscode.window.createWebviewPanel(
      DatabaseSchemaWebview.VIEW_TYPE,
      'Database Schema',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.extensionPath, 'resources')),
          vscode.Uri.file(path.join(this.extensionPath, 'node_modules'))
        ]
      }
    );

    // Handle panel disposal
    this.panel.onDidDispose(() => {
      this.panel = null;
      this.errorHandler.logError('Database schema webview disposed', null, 'DatabaseSchemaWebview');
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
  private updateContent(schemaData: any): void {
    if (!this.panel) return;

    try {
      const html = this.generateHTML(schemaData);
      this.panel.webview.html = html;
    } catch (error) {
      this.errorHandler.logError('Failed to update database schema content', error, 'DatabaseSchemaWebview');
      this.showError('Failed to display schema visualization');
    }
  }

  /**
   * Generate HTML content for the webview
   */
  private generateHTML(schemaData: any): string {
    const webview = this.panel!.webview;
    
    // Get resource URIs
    const cssUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.extensionPath, 'resources', 'webview.css')));
    const cytoscapeUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.extensionPath, 'node_modules', 'cytoscape', 'dist', 'cytoscape.min.js')));
    const enhancedGraphControlsUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.extensionPath, 'resources', 'enhanced-graph-controls.js')));

    // Generate tab contents
    const tabContents = this.generateTabContents(schemaData);
    
    // Prepare graph data using the same approach as full code analysis
    const graphData = this.prepareGraphData(schemaData);

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Database Schema</title>
        <link rel="stylesheet" href="${cssUri}">
        <meta http-equiv="Content-Security-Policy" content="
          default-src 'none';
          img-src ${webview.cspSource} https: data:;
          script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval';
          style-src ${webview.cspSource} 'unsafe-inline';
          font-src ${webview.cspSource} https:;
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
              <button class="nav-link active" data-tab="schema-overview-section">
                <span class="nav-icon">📊</span>
                <span class="nav-label">Schema Overview</span>
              </button>
              <button class="nav-link" data-tab="schema-graph-section">
                <span class="nav-icon">🕸️</span>
                <span class="nav-label">Schema Graph</span>
              </button>
              <button class="nav-link" data-tab="table-details-section">
                <span class="nav-icon">📋</span>
                <span class="nav-label">Table Details</span>
              </button>
            </div>
          </div>

          <!-- Scrollable Content -->
          <div class="scrollable-content">
            <!-- Schema Overview Section -->
            <section id="schema-overview-section" class="content-section active">
              <div class="section-header">
                <h2>📊 Schema Overview</h2>
              </div>
              <div class="section-content">
                ${tabContents.schemaOverview}
              </div>
            </section>

            <!-- Schema Graph Section -->
            <section id="schema-graph-section" class="content-section">
              <div class="section-header">
                <h2>🕸️ Schema Graph</h2>
              </div>
              <div class="section-content">
                ${tabContents.schemaGraph}
              </div>
            </section>

            <!-- Table Details Section -->
            <section id="table-details-section" class="content-section">
              <div class="section-header">
                <h2>📋 Table Details</h2>
              </div>
              <div class="section-content">
                ${tabContents.tableDetails}
              </div>
            </section>
          </div>
        </div>

        <!-- Scripts -->
        <script src="${cytoscapeUri}" onload="console.log('Cytoscape loaded successfully')" onerror="console.error('Failed to load Cytoscape')"></script>
        <script src="${enhancedGraphControlsUri}" onload="console.log('Enhanced graph controls loaded successfully')" onerror="console.error('Failed to load enhanced graph controls')"></script>
        
        <script>
          const vscode = acquireVsCodeApi();
          const schemaData = ${JSON.stringify(schemaData)};
          const graphData = ${JSON.stringify(graphData)};
          let cy = null;

          console.log('=== DATABASE SCHEMA WEBVIEW INITIALIZED ===');
          console.log('Schema data available:', !!schemaData);
          console.log('Graph data available:', !!graphData);
          console.log('Tables count:', graphData?.state?.tables?.length || 0);

          // Initialize when DOM is ready
          document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM ready, starting initialization...');
            initializeTabs();
            initializeDatabaseSchema();
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
                  
                  // If switching to schema graph tab, initialize graph if not already done
                  if (targetTab === 'schema-graph-section' && !window.schemaGraphInitialized) {
                    setTimeout(() => {
                      initializeSchemaGraph();
                    }, 100);
                  }
                }
              });
            });
          }
          
          function initializeDatabaseSchema() {
            try {
              // Handle both direct data and wrapped data structures
              const data = schemaData?.data || schemaData;
              const tables = data?.tables;
              
              if (!data || !tables || tables.length === 0) {
                const emptyElement = document.getElementById('schema-empty');
                if (emptyElement) {
                  emptyElement.style.display = 'flex';
                }
                return;
              }
              
              console.log('Database schema data loaded successfully', { tableCount: tables.length });
            } catch (error) {
              console.error('Failed to initialize database schema:', error);
              showError('Failed to initialize schema visualization');
            }
          }
          
          function initializeSchemaGraph() {
            // Check if Cytoscape is available
            if (typeof cytoscape === 'undefined') {
              console.log('Cytoscape not loaded yet, retrying...');
              setTimeout(initializeSchemaGraph, 100);
              return;
            }

            console.log('Cytoscape loaded, initializing schema graph...');
            
            const container = document.getElementById('enhanced-graph');
            const loadingElement = document.getElementById('graph-loading');
            
            if (!container) {
              console.error('Graph container not found');
              return;
            }

            // Get schema data
            const elements = graphData?.elements || [];
            const style = graphData?.style || [];
            const layout = graphData?.layout || { name: 'dagre' };
            
            console.log('Graph elements:', elements.length);
            console.log('Graph style rules:', style.length);

            if (elements.length === 0) {
              showEmptyState();
              return;
            }

            try {
              // Create Cytoscape instance
              cy = cytoscape({
                container: container,
                elements: elements,
                style: style,
                layout: layout,
                
                // Interaction settings
                zoomingEnabled: true,
                panningEnabled: true,
                selectionType: 'single',
                
                // Performance settings
                hideEdgesOnViewport: elements.length > 100,
                textureOnViewport: elements.length > 200,
                motionBlur: true,
                
                // Viewport settings
                minZoom: 0.1,
                maxZoom: 5.0,
                wheelSensitivity: 0.2
              });

              // Store cytoscape instance globally for controls
              window.cy = cy;
              window.schemaData = graphData?.state?.schemaData;

              // Setup event handlers
              setupSchemaGraphEventHandlers(cy);
              
              // Setup controls
              setupSchemaGraphControls(cy);
              
              // Initial fit
              cy.fit();

              // Show graph and legend, hide loading
              container.style.display = 'block';
              loadingElement.style.display = 'none';
              
              const legendElement = document.querySelector('.legend');
              if (legendElement) {
                legendElement.style.display = 'block';
              }
              
              console.log('✅ Schema graph initialized successfully');
              window.schemaGraphInitialized = true;

            } catch (error) {
              console.error('Error initializing schema graph:', error);
              showErrorState(error.message);
            }
          }

          function setupSchemaGraphEventHandlers(cy) {
            // Table node click
            cy.on('tap', 'node[type="table"]', function(event) {
              const table = event.target.data('table');
              const tableName = event.target.data('name');
              console.log('Table clicked:', tableName);
              
              // Clear previous selections
              cy.elements().removeClass('highlighted');
              
              // Select the table
              event.target.addClass('highlighted');
              
              // Highlight related edges
              const connectedEdges = event.target.connectedEdges();
              connectedEdges.addClass('highlighted');
              
              // Highlight connected tables
              connectedEdges.connectedNodes().addClass('highlighted');
              
              // Show table info
              showTableInfo(tableName);
            });

            // Background click
            cy.on('tap', function(event) {
              if (event.target === cy) {
                cy.elements().removeClass('highlighted');
                hideTableInfo();
              }
            });

            // Edge click
            cy.on('tap', 'edge[type="relationship"]', function(event) {
              const relationship = event.target.data('relationship');
              console.log('Relationship clicked:', relationship);
              
              // Highlight the relationship
              cy.elements().removeClass('highlighted');
              event.target.addClass('highlighted');
              event.target.connectedNodes().addClass('highlighted');
            });
          }

          function setupSchemaGraphControls(cy) {
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
              cy.elements().removeClass('highlighted');
              hideTableInfo();
              
              // Clear search
              const searchInput = document.getElementById('table-search');
              if (searchInput) {
                searchInput.value = '';
              }
            });

            // Fit to Screen
            safeAddEventListener('fit-view-btn', 'click', function() {
              cy.fit();
            });

            // Layout Selection
            safeAddEventListener('layout-select', 'change', function() {
              const layoutName = this.value;
              console.log('Changing layout to:', layoutName);
              
              let layoutOptions = { name: layoutName, animate: true, fit: true };
              
              // Add specific options for different layouts
              switch(layoutName) {
                case 'cose':
                  layoutOptions = { name: 'cose', animate: true, fit: true, nodeRepulsion: 400000, idealEdgeLength: 100 };
                  break;
                case 'breadthfirst':
                  layoutOptions = { name: 'breadthfirst', animate: true, fit: true, directed: true, spacingFactor: 1.5 };
                  break;
                case 'circle':
                  layoutOptions = { name: 'circle', animate: true, fit: true, radius: 200 };
                  break;
                case 'grid':
                  layoutOptions = { name: 'grid', animate: true, fit: true, spacing: 100 };
                  break;
                case 'concentric':
                  layoutOptions = { name: 'concentric', animate: true, fit: true, spacingFactor: 1.5 };
                  break;
                case 'random':
                  layoutOptions = { name: 'random', animate: true, fit: true };
                  break;
              }
              
              cy.layout(layoutOptions).run();
            });

            // Search functionality
            safeAddEventListener('table-search', 'input', function() {
              const query = this.value.toLowerCase();
              
              if (!query) {
                cy.elements().removeClass('highlighted search-result');
                return;
              }
              
              // Clear previous highlights
              cy.elements().removeClass('highlighted search-result');
              
              // Find matching tables
              const matchingTables = cy.nodes('[type="table"]').filter(function(node) {
                const tableName = node.data('name').toLowerCase();
                return tableName.includes(query);
              });
              
              if (matchingTables.length > 0) {
                matchingTables.addClass('search-result highlighted');
                
                // Focus on first match if only one
                if (matchingTables.length === 1) {
                  cy.center(matchingTables[0]);
                  cy.zoom({
                    level: 1.5,
                    renderedPosition: matchingTables[0].renderedPosition()
                  });
                }
              }
            });

            // Export functionality
            safeAddEventListener('export-btn', 'click', function() {
              try {
                const png64 = cy.png({
                  output: 'base64uri',
                  bg: 'var(--vscode-editor-background)',
                  full: true,
                  scale: 2
                });
                
                const link = document.createElement('a');
                link.download = 'database-schema.png';
                link.href = png64;
                link.click();
              } catch (error) {
                console.error('Error exporting schema graph:', error);
              }
            });
          }

          function showEmptyState() {
            const container = document.getElementById('enhanced-graph');
            const loadingElement = document.getElementById('graph-loading');
            const emptyElement = document.getElementById('schema-empty');
            const legendElement = document.querySelector('.legend');
            
            if (container) container.style.display = 'none';
            if (loadingElement) loadingElement.style.display = 'none';
            if (emptyElement) emptyElement.style.display = 'block';
            if (legendElement) legendElement.style.display = 'none';
          }

          function showErrorState(message) {
            const container = document.getElementById('enhanced-graph');
            const loadingElement = document.getElementById('graph-loading');
            const legendElement = document.querySelector('.legend');
            
            if (container) {
              container.innerHTML = \`
                <div style="text-align: center; padding: 40px; font-size: 16px;">
                  <div style="margin-bottom: 16px; font-size: 48px;">⚠️</div>
                  <div style="margin-bottom: 16px;">Error: \${message}</div>
                  <button onclick="location.reload()" style="padding: 8px 16px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer;">Retry</button>
                </div>
              \`;
              container.style.display = 'block';
            }
            if (loadingElement) loadingElement.style.display = 'none';
            if (legendElement) legendElement.style.display = 'none';
          }
          
          function hideTableInfo() {
            const infoPanel = document.getElementById('table-info-panel');
            if (infoPanel) {
              infoPanel.style.display = 'none';
            }
          }
          
          function showTableInfo(tableName) {
            // Handle both direct data and wrapped data structures
            const data = schemaData?.data || schemaData;
            const tables = data?.tables || graphData?.state?.tables;
            
            if (!tables) return;
            
            const table = tables.find(t => t.name === tableName);
            if (!table) return;
            
            const infoPanel = document.getElementById('table-info-panel');
            const infoTitle = document.getElementById('table-info-title');
            const infoContent = document.getElementById('table-info-content');
            
            if (infoPanel && infoTitle && infoContent) {
              infoTitle.textContent = table.name;
              infoContent.innerHTML = generateTableInfoContent(table);
              infoPanel.style.display = 'block';
            }
          }
          
          function generateTableInfoContent(table) {
            const columnCount = table.columns ? table.columns.length : 0;
            const pkCount = table.primary_keys ? table.primary_keys.length : 0;
            const fkCount = table.foreign_keys ? table.foreign_keys.length : 0;
            
            let html = \`
              <div class="table-summary" style="margin-bottom: 16px;">
                <div class="summary-item" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span class="summary-label">Columns:</span>
                  <span class="summary-value">\${columnCount}</span>
                </div>
                <div class="summary-item" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span class="summary-label">Primary Keys:</span>
                  <span class="summary-value">\${pkCount}</span>
                </div>
                <div class="summary-item" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span class="summary-label">Foreign Keys:</span>
                  <span class="summary-value">\${fkCount}</span>
                </div>
              </div>
            \`;
            
            if (table.columns && table.columns.length > 0) {
              html += \`
                <div class="columns-section">
                  <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold;">Columns</h4>
                  <table class="columns-table" style="width: 100%; border-collapse: collapse; font-size: 11px;">
                    <thead>
                      <tr style="background: var(--vscode-sideBar-background);">
                        <th style="padding: 4px; text-align: left; border: 1px solid var(--vscode-widget-border);">Name</th>
                        <th style="padding: 4px; text-align: left; border: 1px solid var(--vscode-widget-border);">Type</th>
                        <th style="padding: 4px; text-align: left; border: 1px solid var(--vscode-widget-border);">Null</th>
                      </tr>
                    </thead>
                    <tbody>
              \`;
              
              table.columns.forEach(column => {
                const isPK = column.is_primary_key;
                const isFK = column.is_foreign_key;
                const nameStyle = isPK ? 'color: #e74c3c; font-weight: bold;' : (isFK ? 'color: #f39c12; font-weight: bold;' : '');
                const nullableText = column.nullable ? 'Yes' : 'No';
                
                html += \`
                  <tr>
                    <td style="padding: 4px; border: 1px solid var(--vscode-widget-border); \${nameStyle}">\${column.name}</td>
                    <td style="padding: 4px; border: 1px solid var(--vscode-widget-border);">\${column.data_type || column.type || 'Unknown'}</td>
                    <td style="padding: 4px; border: 1px solid var(--vscode-widget-border);">\${nullableText}</td>
                  </tr>
                \`;
              });
              
              html += \`
                    </tbody>
                  </table>
                </div>
              \`;
            }
            
            return html;
          }
          
          function requestSchemaAnalysis() {
            vscode.postMessage({
              command: 'requestAnalysis',
              type: 'databaseSchema'
            });
          }
          
          function showError(message) {
            console.error(message);
            showErrorState(message);
          }
          
          // Handle table clicks from table list
          document.addEventListener('click', function(e) {
            if (e.target.closest('.table-item')) {
              const tableName = e.target.closest('.table-item').dataset.table;
              if (tableName) {
                // Find and select the table in the graph
                if (cy) {
                  const tableNode = cy.getElementById(tableName);
                  if (tableNode.length > 0) {
                    cy.elements().removeClass('highlighted');
                    tableNode.addClass('highlighted');
                    
                    // Highlight connected elements
                    const connectedEdges = tableNode.connectedEdges();
                    connectedEdges.addClass('highlighted');
                    connectedEdges.connectedNodes().addClass('highlighted');
                    
                    // Center on the table
                    cy.center(tableNode);
                  }
                }
                
                showTableInfo(tableName);
              }
            }
          });
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Prepare graph data from schema data (similar to full code analysis approach)
   */
  private prepareGraphData(schemaData: any): any {
    // Handle both direct data and wrapped data structures
    const data = schemaData?.data || schemaData;
    const tables = data?.tables || [];
    
    // Transform database schema data into graph format
    const elements: any[] = [];
    
    // Add table nodes
    tables.forEach((table: any) => {
      elements.push({
        data: {
          id: table.name,
          name: table.name,
          label: table.name,
          type: 'table',
          table: table,
          columnCount: table.columns ? table.columns.length : 0,
          primaryKeys: table.primary_keys || table.primaryKeys || [],
          foreignKeys: table.foreign_keys || table.foreignKeys || []
        }
      });
    });
    
    // Add relationship edges
    if (data?.relationships) {
      data.relationships.forEach((relationship: any, index: number) => {
        elements.push({
          data: {
            id: `rel_${index}`,
            source: relationship.fromTable || relationship.from_table,
            target: relationship.toTable || relationship.to_table,
            type: 'relationship',
            relationship: relationship,
            label: relationship.relationshipType || relationship.relationship_type || 'foreign_key'
          }
        });
      });
    }
    
    // Define Cytoscape style for database schema
    const style = [
      // Table nodes
      {
        selector: 'node[type="table"]',
        style: {
          'shape': 'round-rectangle',
          'background-color': '#3498db',
          'border-color': '#2980b9',
          'border-width': 2,
          'label': 'data(name)',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': '#ffffff',
          'font-size': '12px',
          'font-weight': 'bold',
          'width': 120,
          'height': 80,
          'text-wrap': 'wrap',
          'text-max-width': '100px'
        }
      },
      // Selected table
      {
        selector: 'node[type="table"]:selected',
        style: {
          'background-color': '#9b59b6',
          'border-color': '#8e44ad',
          'border-width': 3
        }
      },
      // Highlighted table
      {
        selector: 'node[type="table"].highlighted',
        style: {
          'background-color': '#1abc9c',
          'border-color': '#16a085',
          'border-width': 3
        }
      },
      // Relationship edges
      {
        selector: 'edge[type="relationship"]',
        style: {
          'width': 2,
          'line-color': '#2ecc71',
          'target-arrow-color': '#2ecc71',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'label': 'data(label)',
          'font-size': '10px',
          'text-rotation': 'autorotate'
        }
      },
      // Highlighted edges
      {
        selector: 'edge[type="relationship"].highlighted',
        style: {
          'width': 4,
          'line-color': '#1abc9c',
          'target-arrow-color': '#1abc9c'
        }
      }
    ];
    
    return {
      elements: elements,
      style: style,
      layout: { name: 'cose', animate: true, fit: true },
      state: {
        schemaData: data,
        tables: tables
      }
    };
  }

  /**
   * Generate tab contents for the webview
   */
  private generateTabContents(schemaData: any): any {
    return {
      schemaOverview: this.generateSchemaOverviewContent(schemaData),
      schemaGraph: this.generateSchemaGraphContent(schemaData),
      tableDetails: this.generateTableDetailsContent(schemaData)
    };
  }

  /**
   * Generate schema overview content
   */
  private generateSchemaOverviewContent(schemaData: any): string {
    // Handle both direct data and wrapped data structures
    const data = schemaData?.data || schemaData;
    const metadata = data?.metadata;
    
    if (!data || !metadata) {
      return `
        <div class="empty-state">
          <div class="empty-icon">🗄️</div>
          <h3>No Schema Data</h3>
          <p>Run a database schema analysis to see the overview.</p>
          <button onclick="requestSchemaAnalysis()" class="refresh-btn">Analyze Schema</button>
        </div>
      `;
    }
    
    return `
      <div class="overview-stats">
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-value">${metadata.total_tables || 0}</div>
            <div class="stat-label">Tables</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🔗</div>
          <div class="stat-content">
            <div class="stat-value">${metadata.total_relationships || 0}</div>
            <div class="stat-label">Relationships</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📋</div>
          <div class="stat-content">
            <div class="stat-value">${data.tables ? data.tables.reduce((sum: number, table: any) => sum + (table.columns ? table.columns.length : 0), 0) : 0}</div>
            <div class="stat-label">Columns</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🔍</div>
          <div class="stat-content">
            <div class="stat-value">${data.indexes ? data.indexes.length : 0}</div>
            <div class="stat-label">Indexes</div>
          </div>
        </div>
      </div>
      
      <div class="overview-details">
        <div class="detail-section">
          <h3>Database Information</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Project Path:</span>
              <span class="detail-value">${metadata.project_path || 'Unknown'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Frameworks:</span>
              <span class="detail-value">${metadata.frameworks_detected ? metadata.frameworks_detected.join(', ') : 'None detected'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Analysis Date:</span>
              <span class="detail-value">${metadata.analysis_timestamp ? new Date(metadata.analysis_timestamp).toLocaleString() : 'Unknown'}</span>
            </div>
          </div>
        </div>
        
        ${data.tables && data.tables.length > 0 ? `
        <div class="detail-section">
          <h3>Table Summary</h3>
          <div class="table-summary-grid">
            ${data.tables.slice(0, 5).map((table: any) => `
              <div class="summary-table-item">
                <div class="summary-table-name">${table.name}</div>
                <div class="summary-table-info">
                  ${table.columns ? table.columns.length : 0} columns
                </div>
              </div>
            `).join('')}
            ${data.tables.length > 5 ? `
              <div class="summary-table-item more">
                <div class="summary-table-name">+${data.tables.length - 5} more tables</div>
                <div class="summary-table-info">Click Table Details tab to see all</div>
              </div>
            ` : ''}
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Generate schema graph content
   */
  private generateSchemaGraphContent(schemaData: any): string {
    return `
      <div class="graph-container">
        <!-- Toolbar -->
        <div class="schema-toolbar" style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding: 8px; background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 5px; margin-bottom: 16px;">
          <button id="zoom-in-btn" class="toolbar-btn" style="padding: 6px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer; font-size: 14px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;" title="Zoom In">🔍+</button>
          <button id="zoom-out-btn" class="toolbar-btn" style="padding: 6px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer; font-size: 14px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;" title="Zoom Out">🔍-</button>
          <button id="reset-view-btn" class="toolbar-btn" style="padding: 6px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer; font-size: 14px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;" title="Reset View">🎯</button>
          <button id="fit-view-btn" class="toolbar-btn" style="padding: 6px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer; font-size: 14px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;" title="Fit to Screen">📐</button>
          <input type="text" id="table-search" class="search-input" placeholder="Search tables..." style="padding: 4px 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 3px; font-size: 12px; min-width: 150px;" />
          <select id="layout-select" class="layout-select" style="padding: 4px 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 3px; font-size: 12px; min-width: 120px;">
            <option value="cose" selected>Force-directed</option>
            <option value="circle">Circle</option>
            <option value="grid">Grid</option>
            <option value="breadthfirst">Tree</option>
            <option value="concentric">Concentric</option>
            <option value="random">Random</option>
          </select>
          <button id="export-btn" class="toolbar-btn" style="padding: 6px 12px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">💾 Export</button>
        </div>

        <!-- Graph Loading -->
        <div id="graph-loading" style="text-align: center; padding: 40px; font-size: 16px;">
          <div style="margin-bottom: 16px;">🔄</div>
          <div>Initializing database schema graph...</div>
        </div>

        <!-- Graph -->
        <div id="enhanced-graph" class="graph-display" style="width: 100%; height: 600px; border: 1px solid var(--vscode-panel-border); display: none;"></div>
        
        <!-- Empty State -->
        <div id="schema-empty" class="empty-state" style="display: none; text-align: center; padding: 40px;">
          <div class="empty-icon" style="font-size: 48px; margin-bottom: 16px;">🗄️</div>
          <h3>No Schema Data</h3>
          <p>Run a database schema analysis to see the visualization.</p>
          <button onclick="requestSchemaAnalysis()" class="refresh-btn" style="padding: 8px 16px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 3px; cursor: pointer;">Analyze Schema</button>
        </div>

        <!-- Table Info Panel -->
        <div id="table-info-panel" class="table-info-panel" style="position: fixed; top: 50%; right: 16px; transform: translateY(-50%); background: var(--vscode-editor-background); padding: 16px; border: 1px solid var(--vscode-panel-border); border-radius: 5px; font-size: 12px; display: none; z-index: 1000; min-width: 250px; max-width: 400px; max-height: 80vh; overflow-y: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div class="info-panel-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 id="table-info-title" class="info-panel-title" style="margin: 0; font-size: 14px; font-weight: bold;">Table Details</h3>
            <button class="close-btn" onclick="hideTableInfo()" style="background: none; border: none; color: var(--vscode-foreground); cursor: pointer; font-size: 16px;">×</button>
          </div>
          <div id="table-info-content" class="info-panel-content">
            <!-- Content will be populated by JavaScript -->
          </div>
        </div>

        <!-- Legend Panel -->
        <div class="legend" style="position: fixed; bottom: 16px; right: 16px; background: var(--vscode-editor-background); padding: 12px; border: 1px solid var(--vscode-panel-border); border-radius: 5px; font-size: 12px; display: none; z-index: 1000; min-width: 180px; max-height: 80vh; overflow-y: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="font-weight: bold; margin-bottom: 12px; font-size: 13px;">📊 Legend</div>
          <div>
            <div style="margin-bottom: 6px;"><span style="display: inline-block; width: 16px; height: 16px; margin-right: 8px; vertical-align: middle; background: #3498db; border: 1px solid #2980b9; border-radius: 2px;"></span> 🗄️ Table</div>
            <div style="margin-bottom: 6px;"><span style="display: inline-block; width: 24px; height: 2px; margin-right: 8px; vertical-align: middle; background: #2ecc71;"></span> Relationship</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate table details content
   */
  private generateTableDetailsContent(schemaData: any): string {
    // Handle both direct data and wrapped data structures
    const data = schemaData?.data || schemaData;
    const tables = data?.tables;
    
    if (!data || !tables || tables.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>No Tables Found</h3>
          <p>Run a database schema analysis to see table details.</p>
          <button onclick="requestSchemaAnalysis()" class="refresh-btn">Analyze Schema</button>
        </div>
      `;
    }

    return `
      <div class="table-details-container">
        <div class="table-list">
          ${tables.map((table: any) => {
            const columnCount = table.columns ? table.columns.length : 0;
            const pkCount = table.primary_keys ? table.primary_keys.length : 0;
            const fkCount = table.foreign_keys ? table.foreign_keys.length : 0;
            
            return `
              <div class="table-item" data-table="${table.name}" onclick="selectTable('${table.name}')">
                <div class="table-header">
                  <div class="table-name">${table.name}</div>
                  <div class="table-stats">
                    <span class="stat-badge">${columnCount} cols</span>
                    <span class="stat-badge primary">${pkCount} PK</span>
                    <span class="stat-badge foreign">${fkCount} FK</span>
                  </div>
                </div>
                
                ${table.columns && table.columns.length > 0 ? `
                <div class="table-columns">
                  <div class="columns-header">Columns:</div>
                  <div class="columns-list">
                    ${table.columns.slice(0, 5).map((column: any) => {
                      const isPK = column.is_primary_key;
                      const isFK = column.is_foreign_key;
                      const badge = isPK ? ' <span class="column-badge pk">PK</span>' : (isFK ? ' <span class="column-badge fk">FK</span>' : '');
                      
                      return `
                        <div class="column-item">
                          <span class="column-name">${column.name}</span>
                          <span class="column-type">${column.data_type || column.type || 'Unknown'}</span>
                          ${badge}
                        </div>
                      `;
                    }).join('')}
                    ${table.columns.length > 5 ? `
                      <div class="column-item more">
                        <span class="column-name">+${table.columns.length - 5} more columns</span>
                      </div>
                    ` : ''}
                  </div>
                </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Generate CSS styles for the webview
   */
  private generateStyles(): string {
    return `
      body {
        margin: 0;
        padding: 0;
        font-family: var(--vscode-font-family);
        color: var(--vscode-foreground);
        background: var(--vscode-editor-background);
      }

      .analysis-container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        overflow: hidden;
      }

      .navigation-bar {
        flex-shrink: 0;
        border-bottom: 1px solid var(--vscode-panel-border);
        background: var(--vscode-tab-activeBackground);
        padding: 0;
        margin: 0;
      }

      .nav-links {
        padding: 0;
        display: flex;
        overflow-x: auto;
      }

      .nav-link {
        padding: 12px 20px;
        display: flex;
        align-items: center;
        gap: 8px;
        background: none;
        border: none;
        color: var(--vscode-tab-inactiveForeground);
        cursor: pointer;
        border-bottom: 3px solid transparent;
        white-space: nowrap;
        font-size: 14px;
        transition: all 0.2s ease;
      }

      .nav-link:hover {
        background: var(--vscode-tab-hoverBackground);
        color: var(--vscode-tab-activeForeground);
      }

      .nav-link.active {
        background: var(--vscode-tab-activeBackground);
        color: var(--vscode-tab-activeForeground);
        border-bottom-color: var(--vscode-focusBorder);
        font-weight: 600;
      }

      .nav-icon {
        font-size: 16px;
      }

      .nav-label {
        font-size: 14px;
      }

      .scrollable-content {
        flex: 1;
        overflow: auto;
        padding: 0;
      }

      .content-section {
        padding: 24px;
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
        color: var(--vscode-foreground);
      }

      .section-content {
        background: var(--vscode-editor-background);
      }

      /* Schema Overview Styles */
      .overview-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 32px;
      }

      .stat-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
        background: var(--vscode-sideBar-background);
        border: 1px solid var(--vscode-widget-border);
        border-radius: 8px;
      }

      .stat-icon {
        font-size: 32px;
        opacity: 0.8;
      }

      .stat-content {
        flex: 1;
      }

      .stat-value {
        font-size: 24px;
        font-weight: 700;
        color: var(--vscode-foreground);
        margin-bottom: 4px;
      }

      .stat-label {
        font-size: 14px;
        color: var(--vscode-descriptionForeground);
        font-weight: 500;
      }

      .overview-details {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .detail-section {
        background: var(--vscode-sideBar-background);
        border: 1px solid var(--vscode-widget-border);
        border-radius: 8px;
        padding: 20px;
      }

      .detail-section h3 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--vscode-foreground);
      }

      .detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 12px;
      }

      .detail-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid var(--vscode-widget-border);
      }

      .detail-item:last-child {
        border-bottom: none;
      }

      .detail-label {
        font-weight: 600;
        color: var(--vscode-foreground);
      }

      .detail-value {
        color: var(--vscode-descriptionForeground);
        font-family: var(--vscode-editor-font-family);
      }

      .table-summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
      }

      .summary-table-item {
        padding: 12px;
        background: var(--vscode-sideBar-background);
        border: 1px solid var(--vscode-widget-border);
        border-radius: 4px;
      }

      .summary-table-name {
        font-weight: 600;
        margin-bottom: 4px;
      }

      .summary-table-info {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }

      .summary-table-item.more {
        opacity: 0.7;
        font-style: italic;
      }

      /* Graph specific styles */
      .graph-container {
        position: relative;
        height: 100%;
      }

      .graph-display {
        background: var(--vscode-editor-background);
        border-radius: 4px;
      }

      .toolbar-btn:hover {
        background: var(--vscode-button-hoverBackground) !important;
      }

      .search-input:focus,
      .layout-select:focus {
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: -1px;
      }

      /* Table list styles */
      .table-details-container {
        padding: 0;
      }

      .table-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .table-item {
        background: var(--vscode-sideBar-background);
        border: 1px solid var(--vscode-widget-border);
        border-radius: 8px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .table-item:hover {
        background: var(--vscode-list-hoverBackground);
        border-color: var(--vscode-focusBorder);
      }

      .table-item.selected {
        background: var(--vscode-list-activeSelectionBackground);
        border-color: var(--vscode-focusBorder);
        color: var(--vscode-list-activeSelectionForeground);
      }

      .table-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .table-name {
        font-size: 16px;
        font-weight: 600;
        color: var(--vscode-foreground);
      }

      .table-stats {
        display: flex;
        gap: 8px;
      }

      .stat-badge {
        padding: 2px 6px;
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        border-radius: 3px;
        font-size: 11px;
        font-weight: 500;
      }

      .stat-badge.primary {
        background: #e74c3c;
        color: white;
      }

      .stat-badge.foreign {
        background: #f39c12;
        color: white;
      }

      .table-columns {
        margin-top: 8px;
      }

      .columns-header {
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 8px;
        color: var(--vscode-foreground);
      }

      .columns-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .column-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 8px;
        background: var(--vscode-editor-background);
        border-radius: 3px;
        font-size: 11px;
      }

      .column-item.more {
        opacity: 0.7;
        font-style: italic;
      }

      .column-name {
        font-weight: 500;
      }

      .column-type {
        color: var(--vscode-descriptionForeground);
        font-family: var(--vscode-editor-font-family);
      }

      .column-badge {
        padding: 1px 4px;
        border-radius: 2px;
        font-size: 9px;
        font-weight: bold;
      }

      .column-badge.pk {
        background: #e74c3c;
        color: white;
      }

      .column-badge.fk {
        background: #f39c12;
        color: white;
      }

      /* Empty state styles */
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 400px;
        text-align: center;
        color: var(--vscode-descriptionForeground);
      }

      .empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
      }

      .empty-state h3 {
        margin: 0 0 8px 0;
        color: var(--vscode-foreground);
      }

      .empty-state p {
        margin: 0 0 16px 0;
        max-width: 300px;
      }

      .refresh-btn {
        padding: 8px 16px;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s ease;
      }

      .refresh-btn:hover {
        background: var(--vscode-button-hoverBackground);
      }-items: center;
        padding: 8px 0;
        border-bottom: 1px solid var(--vscode-widget-border);
      }

      .detail-item:last-child {
        border-bottom: none;
      }

      .detail-label {
        font-weight: 500;
        color: var(--vscode-descriptionForeground);
      }

      .detail-value {
        font-weight: 600;
        color: var(--vscode-foreground);
      }

      .table-summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
      }

      .summary-table-item {
        padding: 12px;
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-widget-border);
        border-radius: 6px;
      }

      .summary-table-item.more {
        opacity: 0.7;
        font-style: italic;
      }

      .summary-table-name {
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--vscode-foreground);
      }

      .summary-table-info {
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
      }

      /* Schema Graph Styles */
      .graph-container {
        position: relative;
        height: 600px;
        background: var(--vscode-editor-background);
        border: 1px solid var(--vscode-widget-border);
        border-radius: 8px;
        overflow: hidden;
      }

      .schema-toolbar {
        position: absolute;
        top: 16px;
        left: 16px;
        z-index: 10;
        display: flex;
        gap: 8px;
        background: var(--vscode-sideBar-background);
        padding: 8px;
        border-radius: 6px;
        border: 1px solid var(--vscode-widget-border);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .toolbar-btn {
        padding: 6px 12px;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: background-color 0.2s ease;
      }

      .toolbar-btn:hover {
        background: var(--vscode-button-hoverBackground);
      }

      .search-input {
        padding: 6px 8px;
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border);
        border-radius: 4px;
        font-size: 12px;
        width: 200px;
      }

      .search-input:focus {
        outline: none;
        border-color: var(--vscode-focusBorder);
      }

      .layout-select {
        padding: 6px 8px;
        background: var(--vscode-dropdown-background);
        color: var(--vscode-dropdown-foreground);
        border: 1px solid var(--vscode-dropdown-border);
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
      }

      .graph-display {
        width: 100%;
        height: 100%;
      }

      .table-info-panel {
        position: absolute;
        top: 80px;
        right: 16px;
        width: 400px;
        max-height: calc(100% - 100px);
        background: var(--vscode-sideBar-background);
        border: 1px solid var(--vscode-widget-border);
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 20;
        overflow: hidden;
        display: none;
      }

      .info-panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: var(--vscode-titleBar-activeBackground);
        border-bottom: 1px solid var(--vscode-widget-border);
      }

      .info-panel-title {
        font-weight: 600;
        font-size: 14px;
        margin: 0;
      }

      .close-btn {
        background: none;
        border: none;
        color: var(--vscode-foreground);
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      }

      .close-btn:hover {
        background: var(--vscode-toolbar-hoverBackground);
      }

      .info-panel-content {
        padding: 16px;
        max-height: 400px;
        overflow-y: auto;
      }

      .table-summary {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 16px;
      }

      .summary-item {
        display: flex;
        justify-content: space-between;
        padding: 8px;
        background: var(--vscode-editor-background);
        border-radius: 4px;
        font-size: 12px;
      }

      .summary-label {
        color: var(--vscode-descriptionForeground);
      }

      .summary-value {
        font-weight: 600;
        color: var(--vscode-foreground);
      }

      .columns-section {
        margin-bottom: 16px;
      }

      .columns-section h4 {
        margin: 0 0 8px 0;
        font-size: 14px;
        color: var(--vscode-foreground);
      }

      .columns-table {
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
        background: var(--vscode-editor-inactiveSelectionBackground);
        font-weight: 600;
        color: var(--vscode-foreground);
      }

      .column-name.primary-key {
        color: var(--vscode-charts-red);
        font-weight: 600;
      }

      .column-name.foreign-key {
        color: var(--vscode-charts-orange);
        font-weight: 600;
      }

      .column-nullable.yes {
        color: var(--vscode-charts-green);
      }

      .column-nullable.no {
        color: var(--vscode-charts-red);
      }

      /* Table Details Styles */
      .table-details-container {
        background: var(--vscode-editor-background);
      }

      .table-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .table-item {
        background: var(--vscode-sideBar-background);
        border: 1px solid var(--vscode-widget-border);
        border-radius: 8px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .table-item:hover {
        border-color: var(--vscode-focusBorder);
        background: var(--vscode-list-hoverBackground);
      }

      .table-item.selected {
        border-color: var(--vscode-focusBorder);
        background: var(--vscode-list-activeSelectionBackground);
      }

      .table-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .table-name {
        font-weight: 600;
        font-size: 16px;
        color: var(--vscode-foreground);
      }

      .table-stats {
        display: flex;
        gap: 8px;
      }

      .stat-badge {
        padding: 4px 8px;
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
      }

      .stat-badge.primary {
        background: var(--vscode-charts-red);
        color: white;
      }

      .stat-badge.foreign {
        background: var(--vscode-charts-orange);
        color: white;
      }

      .table-columns {
        border-top: 1px solid var(--vscode-widget-border);
        padding-top: 12px;
      }

      .columns-header {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 8px;
        color: var(--vscode-foreground);
      }

      .columns-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .column-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 6px 0;
        font-size: 13px;
      }

      .column-item.more {
        font-style: italic;
        opacity: 0.7;
      }

      .column-name {
        font-weight: 500;
        color: var(--vscode-foreground);
        min-width: 120px;
      }

      .column-type {
        color: var(--vscode-descriptionForeground);
        font-family: monospace;
        font-size: 12px;
        min-width: 80px;
      }

      .column-badge {
        padding: 2px 6px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 600;
      }

      .column-badge.pk {
        background: var(--vscode-charts-red);
        color: white;
      }

      .column-badge.fk {
        background: var(--vscode-charts-orange);
        color: white;
      }

      /* Empty State */
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 300px;
        text-align: center;
        color: var(--vscode-descriptionForeground);
      }

      .empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.6;
      }

      .empty-state h3 {
        margin: 0 0 8px 0;
        color: var(--vscode-foreground);
      }

      .empty-state p {
        margin: 0 0 16px 0;
        opacity: 0.8;
      }

      .refresh-btn {
        padding: 8px 16px;
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
    `;
  }

  /**
   * Handle messages from webview
   */
  private handleWebviewMessage(message: any): void {
    switch (message.command) {
      case 'requestAnalysis':
        if (message.type === 'databaseSchema') {
          vscode.commands.executeCommand('doracodebirdview.analyzeDatabaseSchema');
        }
        break;
      case 'exportSchema':
        this.exportSchema(message.data);
        break;
      case 'tableSelected':
        this.handleTableSelection(message.tableName);
        break;
      default:
        this.errorHandler.logError('Unknown webview message', message, 'DatabaseSchemaWebview');
    }
  }

  /**
   * Handle table selection
   */
  private handleTableSelection(tableName: string): void {
    // Could implement additional logic for table selection
    this.errorHandler.logError('Table selected', { tableName }, 'DatabaseSchemaWebview');
  }

  /**
   * Export schema visualization
   */
  private async exportSchema(data: any): Promise<void> {
    try {
      // This would typically be handled by the webview JavaScript
      vscode.window.showInformationMessage('Schema export functionality is available in the webview.');
    } catch (error) {
      this.errorHandler.logError('Failed to export schema', error, 'DatabaseSchemaWebview');
      vscode.window.showErrorMessage('Failed to export schema');
    }
  }

  /**
   * Show error in webview
   */
  private showError(message: string): void {
    if (!this.panel) return;

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