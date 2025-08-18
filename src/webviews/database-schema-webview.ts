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
    const dagreUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.extensionPath, 'node_modules', 'dagre', 'dist', 'dagre.min.js')));
    const cytoscapeDagreUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.extensionPath, 'node_modules', 'cytoscape-dagre', 'cytoscape-dagre.js')));
    const schemaGraphUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.extensionPath, 'resources', 'database-schema-graph.js')));

    // Generate content sections
    const schemaOverviewHtml = this.generateSchemaOverview(schemaData);
    const tableListHtml = this.generateTableList(schemaData);

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
          .schema-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
          }
          
          .schema-header {
            padding: 16px;
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-bottom: 1px solid var(--vscode-widget-border);
            flex-shrink: 0;
          }
          
          .schema-title {
            font-size: 24px;
            font-weight: 600;
            margin: 0 0 8px 0;
            color: var(--vscode-foreground);
          }
          
          .schema-stats {
            display: flex;
            gap: 24px;
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
          }
          
          .schema-main {
            display: flex;
            flex: 1;
            overflow: hidden;
          }
          
          .schema-graph-container {
            flex: 1;
            position: relative;
            background: var(--vscode-editor-background);
          }
          
          .schema-toolbar {
            position: absolute;
            top: 16px;
            left: 16px;
            z-index: 10;
            display: flex;
            gap: 8px;
            background: var(--vscode-editor-inactiveSelectionBackground);
            padding: 8px;
            border-radius: 6px;
            border: 1px solid var(--vscode-widget-border);
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
          
          #schema-graph {
            width: 100%;
            height: 100%;
          }
          
          .schema-sidebar {
            width: 350px;
            background: var(--vscode-sideBar-background);
            border-left: 1px solid var(--vscode-widget-border);
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          
          .sidebar-header {
            padding: 16px;
            background: var(--vscode-sideBarSectionHeader-background);
            border-bottom: 1px solid var(--vscode-widget-border);
            font-weight: 600;
            font-size: 14px;
          }
          
          .sidebar-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
          }
          
          .table-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          
          .table-item {
            padding: 12px;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 6px;
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
          
          .table-name {
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 4px;
            color: var(--vscode-foreground);
          }
          
          .table-info {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            display: flex;
            gap: 12px;
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
          
          .relationships-section {
            margin-bottom: 16px;
          }
          
          .relationships-section h4 {
            margin: 0 0 8px 0;
            font-size: 14px;
            color: var(--vscode-foreground);
          }
          
          .relationship-item {
            padding: 8px;
            background: var(--vscode-editor-background);
            border-radius: 4px;
            margin-bottom: 8px;
            font-size: 12px;
          }
          
          .relationship-type {
            font-weight: 600;
            color: var(--vscode-charts-blue);
            margin-bottom: 4px;
          }
          
          .relationship-details {
            color: var(--vscode-descriptionForeground);
            font-family: monospace;
          }
          
          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            text-align: center;
            color: var(--vscode-descriptionForeground);
          }
          
          .empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
          }
          
          .refresh-btn {
            padding: 8px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            margin-top: 16px;
          }
          
          .refresh-btn:hover {
            background: var(--vscode-button-hoverBackground);
          }
        </style>
      </head>
      <body>
        <div class="schema-container">
          <!-- Header -->
          <div class="schema-header">
            <h1 class="schema-title">🗄️ Database Schema</h1>
            ${schemaOverviewHtml}
          </div>

          <!-- Main Content -->
          <div class="schema-main">
            <!-- Graph Container -->
            <div class="schema-graph-container">
              <!-- Toolbar -->
              <div class="schema-toolbar">
                <button class="toolbar-btn" onclick="fitSchema()">🔍 Fit</button>
                <button class="toolbar-btn" onclick="resetSchema()">🔄 Reset</button>
                <input type="text" id="table-search" class="search-input" placeholder="Search tables..." />
                <select id="layout-select" class="layout-select">
                  <option value="dagre">Hierarchical</option>
                  <option value="circle">Circle</option>
                  <option value="grid">Grid</option>
                  <option value="breadthfirst">Tree</option>
                  <option value="cose">Force-directed</option>
                </select>
                <button class="toolbar-btn" onclick="exportSchema()">💾 Export</button>
              </div>

              <!-- Graph -->
              <div id="schema-graph"></div>
              
              <!-- Empty State -->
              <div id="schema-empty" class="empty-state" style="display: none;">
                <div class="empty-icon">🗄️</div>
                <h3>No Schema Data</h3>
                <p>Run a database schema analysis to see the visualization.</p>
                <button onclick="requestSchemaAnalysis()" class="refresh-btn">Analyze Schema</button>
              </div>
            </div>

            <!-- Sidebar -->
            <div class="schema-sidebar">
              <div class="sidebar-header">Tables</div>
              <div class="sidebar-content">
                ${tableListHtml}
              </div>
            </div>
          </div>

          <!-- Table Info Panel -->
          <div id="table-info-panel" class="table-info-panel">
            <div class="info-panel-header">
              <h3 id="table-info-title" class="info-panel-title">Table Details</h3>
              <button class="close-btn" onclick="hideTableInfo()">×</button>
            </div>
            <div id="table-info-content" class="info-panel-content">
              <!-- Content will be populated by JavaScript -->
            </div>
          </div>
        </div>

        <!-- Scripts -->
        <script src="${cytoscapeUri}"></script>
        <script src="${dagreUri}"></script>
        <script src="${cytoscapeDagreUri}"></script>
        <script src="${schemaGraphUri}"></script>
        
        <script>
          const vscode = acquireVsCodeApi();
          const schemaData = ${JSON.stringify(schemaData)};
          let schemaGraph = null;
          
          // Initialize when DOM is ready
          document.addEventListener('DOMContentLoaded', function() {
            initializeDatabaseSchema();
          });
          
          function initializeDatabaseSchema() {
            try {
              if (!schemaData || !schemaData.tables || schemaData.tables.length === 0) {
                document.getElementById('schema-empty').style.display = 'flex';
                return;
              }
              
              // Initialize database schema graph
              schemaGraph = new DatabaseSchemaGraph();
              schemaGraph.initializeGraph('schema-graph', schemaData);
              
              // Setup search functionality
              setupSearch();
              
              // Setup layout change handler
              document.getElementById('layout-select').addEventListener('change', function(e) {
                if (schemaGraph) {
                  schemaGraph.changeLayout(e.target.value);
                }
              });
              
              console.log('Database schema initialized successfully');
            } catch (error) {
              console.error('Failed to initialize database schema:', error);
              showError('Failed to initialize schema visualization');
            }
          }
          
          function setupSearch() {
            const searchInput = document.getElementById('table-search');
            if (searchInput && schemaGraph) {
              searchInput.addEventListener('input', function(e) {
                const query = e.target.value;
                if (query) {
                  const matchCount = schemaGraph.searchTables(query);
                  console.log(\`Found \${matchCount} matching tables\`);
                } else {
                  schemaGraph.clearHighlights();
                }
              });
            }
          }
          
          function fitSchema() {
            if (schemaGraph) {
              schemaGraph.fitToContainer();
            }
          }
          
          function resetSchema() {
            if (schemaGraph) {
              schemaGraph.resetView();
            }
            
            // Clear search
            const searchInput = document.getElementById('table-search');
            if (searchInput) {
              searchInput.value = '';
            }
          }
          
          function exportSchema() {
            if (schemaGraph) {
              schemaGraph.exportAsImage('database_schema.png');
            }
          }
          
          function selectTable(tableName) {
            if (schemaGraph) {
              const table = schemaData.tables.find(t => t.name === tableName);
              if (table) {
                schemaGraph.selectTable(table);
              }
            }
            
            // Update sidebar selection
            document.querySelectorAll('.table-item').forEach(item => {
              item.classList.remove('selected');
            });
            
            const selectedItem = document.querySelector(\`[data-table="\${tableName}"]\`);
            if (selectedItem) {
              selectedItem.classList.add('selected');
            }
          }
          
          function hideTableInfo() {
            document.getElementById('table-info-panel').style.display = 'none';
          }
          
          function requestSchemaAnalysis() {
            vscode.postMessage({
              command: 'requestAnalysis',
              type: 'databaseSchema'
            });
          }
          
          function showError(message) {
            console.error(message);
            // Could show error in UI
          }
          
          // Handle table clicks from sidebar
          document.addEventListener('click', function(e) {
            if (e.target.closest('.table-item')) {
              const tableName = e.target.closest('.table-item').dataset.table;
              if (tableName) {
                selectTable(tableName);
              }
            }
          });
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Generate schema overview HTML
   */
  private generateSchemaOverview(schemaData: any): string {
    if (!schemaData || !schemaData.metadata) {
      return '<div class="schema-stats"><span>No schema information available</span></div>';
    }

    const metadata = schemaData.metadata;
    
    return `
      <div class="schema-stats">
        <span><strong>Tables:</strong> ${metadata.total_tables || 0}</span>
        <span><strong>Relationships:</strong> ${metadata.total_relationships || 0}</span>
        <span><strong>Columns:</strong> ${metadata.total_columns || 0}</span>
        <span><strong>Indexes:</strong> ${metadata.total_indexes || 0}</span>
      </div>
    `;
  }

  /**
   * Generate table list HTML for sidebar
   */
  private generateTableList(schemaData: any): string {
    if (!schemaData || !schemaData.tables || schemaData.tables.length === 0) {
      return '<div class="empty-state"><p>No tables found</p></div>';
    }

    let html = '<div class="table-list">';
    
    schemaData.tables.forEach((table: any) => {
      const columnCount = table.columns ? table.columns.length : 0;
      const pkCount = table.primaryKeys ? table.primaryKeys.length : 0;
      const fkCount = table.foreignKeys ? table.foreignKeys.length : 0;
      
      html += `
        <div class="table-item" data-table="${table.name}" onclick="selectTable('${table.name}')">
          <div class="table-name">${table.name}</div>
          <div class="table-info">
            <span>${columnCount} cols</span>
            <span>${pkCount} PK</span>
            <span>${fkCount} FK</span>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    return html;
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