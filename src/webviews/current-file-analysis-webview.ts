import * as vscode from 'vscode';
import * as path from 'path';
import { ErrorHandler } from '../core/error-handler';

/**
 * Current File Analysis Webview Provider
 * Provides dedicated webview for displaying current file analysis results
 */
export class CurrentFileAnalysisWebview {
  private static readonly VIEW_TYPE = 'doracodebirdview.currentFileAnalysis';
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
        this.panel.reveal(vscode.ViewColumn.Two);
      } else {
        // Create new panel
        this.createPanel();
        this.updateContent(analysisData);
      }

      this.errorHandler.logError('Current file analysis webview shown', { filePath }, 'CurrentFileAnalysisWebview');
    } catch (error) {
      this.errorHandler.logError('Failed to show current file analysis webview', error, 'CurrentFileAnalysisWebview');
      throw error;
    }
  }

  /**
   * Create the webview panel
   */
  private createPanel(): void {
    this.panel = vscode.window.createWebviewPanel(
      CurrentFileAnalysisWebview.VIEW_TYPE,
      'Current File Analysis',
      vscode.ViewColumn.Two,
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
      this.errorHandler.logError('Current file analysis webview disposed', null, 'CurrentFileAnalysisWebview');
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
    if (!this.panel) return;

    try {
      const html = this.generateHTML(analysisData);
      this.panel.webview.html = html;
    } catch (error) {
      this.errorHandler.logError('Failed to update current file analysis content', error, 'CurrentFileAnalysisWebview');
      this.showError('Failed to display analysis results');
    }
  }

  /**
   * Generate HTML content for the webview
   */
  private generateHTML(analysisData: any): string {
    const webview = this.panel!.webview;
    
    // Get resource URIs
    const cssUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.extensionPath, 'resources', 'webview.css')));
    const chartJsUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.extensionPath, 'node_modules', 'chart.js', 'dist', 'chart.min.js')));

    // Generate analysis sections
    const fileInfoHtml = this.generateFileInfo(analysisData);
    const complexityHtml = this.generateComplexityAnalysis(analysisData);
    const dependenciesHtml = this.generateDependencyAnalysis(analysisData);
    const frameworksHtml = this.generateFrameworkAnalysis(analysisData);
    const metricsHtml = this.generateMetricsCharts(analysisData);

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
          img-src ${webview.cspSource} https: data:;
          script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval';
          style-src ${webview.cspSource} 'unsafe-inline';
          font-src ${webview.cspSource} https:;
        ">
        <style>
          .file-analysis-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
          }
          
          .analysis-header {
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--vscode-widget-border);
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
          
          .analysis-section {
            margin-bottom: 32px;
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 8px;
            padding: 20px;
            border: 1px solid var(--vscode-widget-border);
          }
          
          .section-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 16px 0;
            color: var(--vscode-foreground);
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .section-icon {
            font-size: 20px;
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
            display: flex;
            flex-direction: column;
            gap: 8px;
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
          
          .dependency-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
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
          
          .import-type {
            background: var(--vscode-charts-blue);
            color: white;
          }
          
          .framework-type {
            background: var(--vscode-charts-green);
            color: white;
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
        </style>
      </head>
      <body>
        <div class="file-analysis-container">
          <!-- Header -->
          <div class="analysis-header">
            ${fileInfoHtml}
          </div>

          <!-- Complexity Analysis -->
          <div class="analysis-section">
            <h2 class="section-title">
              <span class="section-icon">🔍</span>
              Complexity Analysis
            </h2>
            ${complexityHtml}
          </div>

          <!-- Dependencies -->
          <div class="analysis-section">
            <h2 class="section-title">
              <span class="section-icon">📦</span>
              Dependencies
            </h2>
            ${dependenciesHtml}
          </div>

          <!-- Framework Patterns -->
          <div class="analysis-section">
            <h2 class="section-title">
              <span class="section-icon">🏗️</span>
              Framework Patterns
            </h2>
            ${frameworksHtml}
          </div>

          <!-- Metrics Charts -->
          <div class="analysis-section">
            <h2 class="section-title">
              <span class="section-icon">📊</span>
              Metrics Visualization
            </h2>
            ${metricsHtml}
          </div>

          <!-- Actions -->
          <div class="action-buttons">
            <button class="action-btn" onclick="refreshAnalysis()">
              🔄 Refresh Analysis
            </button>
            <button class="action-btn secondary-btn" onclick="openFile()">
              📝 Open in Editor
            </button>
            <button class="action-btn secondary-btn" onclick="exportReport()">
              💾 Export Report
            </button>
          </div>
        </div>

        <!-- Scripts -->
        <script src="${chartJsUri}"></script>
        <script>
          const vscode = acquireVsCodeApi();
          const analysisData = ${JSON.stringify(analysisData)};
          const filePath = ${JSON.stringify(this.currentFilePath)};
          
          // Initialize charts when DOM is ready
          document.addEventListener('DOMContentLoaded', function() {
            initializeCharts();
          });
          
          function initializeCharts() {
            try {
              // Initialize complexity chart
              if (analysisData.complexity_metrics && analysisData.complexity_metrics.function_complexities) {
                createComplexityChart();
              }
              
              // Initialize metrics chart
              if (analysisData.complexity_metrics) {
                createMetricsChart();
              }
            } catch (error) {
              console.error('Failed to initialize charts:', error);
            }
          }
          
          function createComplexityChart() {
            const canvas = document.getElementById('complexityChart');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            const functions = analysisData.complexity_metrics.function_complexities;
            
            // Validate that functions is an array
            if (!Array.isArray(functions)) {
              console.error('Function complexities is not an array:', functions);
              return;
            }
            
            const labels = functions.map(f => f.name);
            const data = functions.map(f => f.complexity);
            const colors = functions.map(f => {
              if (f.complexity <= 5) return '#27ae60';
              if (f.complexity <= 10) return '#f39c12';
              return '#e74c3c';
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
          }
          
          function createMetricsChart() {
            const canvas = document.getElementById('metricsChart');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            const metrics = analysisData.complexity_metrics;
            
            new Chart(ctx, {
              type: 'radar',
              data: {
                labels: ['Lines of Code', 'Cyclomatic Complexity', 'Maintainability', 'Halstead Volume', 'Cognitive Complexity'],
                datasets: [{
                  label: 'File Metrics',
                  data: [
                    Math.min(metrics.lines_of_code / 10, 100),
                    Math.min(metrics.cyclomatic_complexity * 10, 100),
                    metrics.maintainability_index || 50,
                    Math.min((metrics.halstead_metrics?.volume || 0) / 10, 100),
                    Math.min((metrics.cognitive_complexity || 0) * 10, 100)
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
          }
          
          function refreshAnalysis() {
            vscode.postMessage({
              command: 'refreshAnalysis',
              filePath: filePath
            });
          }
          
          function openFile() {
            if (filePath) {
              vscode.postMessage({
                command: 'openFile',
                filePath: filePath
              });
            }
          }
          
          function exportReport() {
            vscode.postMessage({
              command: 'exportReport',
              data: analysisData,
              filePath: filePath
            });
          }
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Generate file information HTML
   */
  private generateFileInfo(analysisData: any): string {
    const fileName = this.currentFilePath ? path.basename(this.currentFilePath) : 'Unknown File';
    const filePath = this.currentFilePath || 'Unknown Path';
    
    return `
      <h1 class="file-title">${fileName}</h1>
      <div class="file-path">${filePath}</div>
    `;
  }

  /**
   * Generate complexity analysis HTML
   */
  private generateComplexityAnalysis(analysisData: any): string {
    if (!analysisData.complexity_metrics) {
      return '<div class="empty-state"><div class="empty-icon">📊</div><p>No complexity metrics available.</p></div>';
    }

    const metrics = analysisData.complexity_metrics;
    const overallComplexity = metrics.overall_complexity || { level: 'unknown', score: 0 };
    
    let html = '';
    
    // Overall metrics
    html += '<div class="info-grid">';
    html += `<div class="info-item">
      <div class="info-label">Overall Complexity</div>
      <div class="info-value">
        <span class="complexity-indicator complexity-${overallComplexity.level}">
          ${overallComplexity.level}
        </span>
      </div>
    </div>`;
    
    html += `<div class="info-item">
      <div class="info-label">Lines of Code</div>
      <div class="info-value">${metrics.lines_of_code || 0}</div>
    </div>`;
    
    html += `<div class="info-item">
      <div class="info-label">Cyclomatic Complexity</div>
      <div class="info-value">${metrics.cyclomatic_complexity || 0}</div>
    </div>`;
    
    html += `<div class="info-item">
      <div class="info-label">Maintainability Index</div>
      <div class="info-value">${metrics.maintainability_index?.toFixed(1) || 'N/A'}</div>
    </div>`;
    
    html += '</div>';
    
    // Function complexities
    if (metrics.function_complexities && metrics.function_complexities.length > 0) {
      html += '<h3>Function Complexities</h3>';
      html += '<div class="function-list">';
      
      metrics.function_complexities.forEach((func: any) => {
        const complexityLevel = func.complexity <= 5 ? 'low' : func.complexity <= 10 ? 'medium' : 'high';
        html += `<div class="function-item">
          <span class="function-name">${func.name}</span>
          <div class="function-complexity">
            <span>${func.complexity}</span>
            <span class="complexity-indicator complexity-${complexityLevel}">
              ${complexityLevel}
            </span>
          </div>
        </div>`;
      });
      
      html += '</div>';
    }
    
    return html;
  }

  /**
   * Generate dependency analysis HTML
   */
  private generateDependencyAnalysis(analysisData: any): string {
    if (!analysisData.dependencies || analysisData.dependencies.length === 0) {
      return '<div class="empty-state"><div class="empty-icon">📦</div><p>No dependencies found.</p></div>';
    }

    let html = '';
    html += '<div class="dependency-list">';
    
    analysisData.dependencies.forEach((dep: any) => {
      const depType = dep.type || 'import';
      html += `<div class="dependency-item">
        <span class="dependency-name">${dep.name || dep.module}</span>
        <span class="dependency-type ${depType}-type">${depType}</span>
      </div>`;
    });
    
    html += '</div>';
    
    return html;
  }

  /**
   * Generate framework analysis HTML
   */
  private generateFrameworkAnalysis(analysisData: any): string {
    if (!analysisData.framework_patterns || analysisData.framework_patterns.length === 0) {
      return '<div class="empty-state"><div class="empty-icon">🏗️</div><p>No framework patterns detected.</p></div>';
    }

    let html = '';
    html += '<div class="dependency-list">';
    
    analysisData.framework_patterns.forEach((pattern: any) => {
      html += `<div class="dependency-item">
        <span class="dependency-name">${pattern.framework}</span>
        <span class="dependency-type framework-type">${pattern.pattern_type}</span>
      </div>`;
    });
    
    html += '</div>';
    
    return html;
  }

  /**
   * Generate metrics charts HTML
   */
  private generateMetricsCharts(analysisData: any): string {
    if (!analysisData.complexity_metrics) {
      return '<div class="empty-state"><div class="empty-icon">📊</div><p>No metrics available for visualization.</p></div>';
    }

    let html = '';
    
    // Function complexity chart
    if (analysisData.complexity_metrics.function_complexities && analysisData.complexity_metrics.function_complexities.length > 0) {
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
    
    return html;
  }

  /**
   * Handle messages from webview
   */
  private handleWebviewMessage(message: any): void {
    switch (message.command) {
      case 'refreshAnalysis':
        if (message.filePath) {
          vscode.commands.executeCommand('doracodebirdview.analyzeCurrentFile');
        }
        break;
      case 'openFile':
        if (message.filePath) {
          vscode.workspace.openTextDocument(message.filePath).then(doc => {
            vscode.window.showTextDocument(doc);
          });
        }
        break;
      case 'exportReport':
        this.exportAnalysisReport(message.data, message.filePath);
        break;
      default:
        this.errorHandler.logError('Unknown webview message', message, 'CurrentFileAnalysisWebview');
    }
  }

  /**
   * Export analysis report
   */
  private async exportAnalysisReport(data: any, filePath: string): Promise<void> {
    try {
      const fileName = path.basename(filePath, path.extname(filePath));
      const reportContent = JSON.stringify(data, null, 2);
      
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`${fileName}_analysis_report.json`),
        filters: {
          'JSON Files': ['json'],
          'All Files': ['*']
        }
      });
      
      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(reportContent, 'utf8'));
        vscode.window.showInformationMessage(`Analysis report exported to ${uri.fsPath}`);
      }
    } catch (error) {
      this.errorHandler.logError('Failed to export analysis report', error, 'CurrentFileAnalysisWebview');
      vscode.window.showErrorMessage('Failed to export analysis report');
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