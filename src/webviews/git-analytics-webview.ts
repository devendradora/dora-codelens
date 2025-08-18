import * as vscode from 'vscode';
import * as path from 'path';
import { ErrorHandler } from '../core/error-handler';

/**
 * Git Analytics Webview Provider
 * Provides dedicated webview for displaying Git analytics and repository insights
 */
export class GitAnalyticsWebview {
  private static readonly VIEW_TYPE = 'doracodebirdview.gitAnalytics';
  private panel: vscode.WebviewPanel | null = null;
  private errorHandler: ErrorHandler;
  private extensionPath: string;
  private currentData: any = null;

  constructor(errorHandler: ErrorHandler, extensionPath: string) {
    this.errorHandler = errorHandler;
    this.extensionPath = extensionPath;
  }

  /**
   * Show the Git analytics webview
   */
  public show(analyticsData: any): void {
    try {
      this.currentData = analyticsData;

      if (this.panel) {
        // If panel exists, update it and bring to front
        this.updateContent(analyticsData);
        this.panel.reveal(vscode.ViewColumn.One);
      } else {
        // Create new panel
        this.createPanel();
        this.updateContent(analyticsData);
      }

      this.errorHandler.logError('Git analytics webview shown', null, 'GitAnalyticsWebview');
    } catch (error) {
      this.errorHandler.logError('Failed to show Git analytics webview', error, 'GitAnalyticsWebview');
      throw error;
    }
  }

  /**
   * Create the webview panel
   */
  private createPanel(): void {
    this.panel = vscode.window.createWebviewPanel(
      GitAnalyticsWebview.VIEW_TYPE,
      'Git Analytics',
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
      this.errorHandler.logError('Git analytics webview disposed', null, 'GitAnalyticsWebview');
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
  private updateContent(analyticsData: any): void {
    if (!this.panel) return;

    try {
      const html = this.generateHTML(analyticsData);
      this.panel.webview.html = html;
    } catch (error) {
      this.errorHandler.logError('Failed to update Git analytics content', error, 'GitAnalyticsWebview');
      this.showError('Failed to display analytics results');
    }
  }

  /**
   * Generate HTML content for the webview
   */
  private generateHTML(analyticsData: any): string {
    const webview = this.panel!.webview;
    
    // Get resource URIs
    const cssUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.extensionPath, 'resources', 'webview.css')));
    const chartJsUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.extensionPath, 'node_modules', 'chart.js', 'dist', 'chart.min.js')));
    const gitChartsUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.extensionPath, 'resources', 'git-analytics-charts.js')));

    // Generate content sections
    const repositoryInfoHtml = this.generateRepositoryInfo(analyticsData);
    const authorContributionsHtml = this.generateAuthorContributions(analyticsData);
    const timelineHtml = this.generateCommitTimeline(analyticsData);
    const moduleStatsHtml = this.generateModuleStatistics(analyticsData);

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Git Analytics</title>
        <link rel="stylesheet" href="${cssUri}">
        <meta http-equiv="Content-Security-Policy" content="
          default-src 'none';
          img-src ${webview.cspSource} https: data:;
          script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval';
          style-src ${webview.cspSource} 'unsafe-inline';
          font-src ${webview.cspSource} https:;
        ">
      </head>
      <body>
        <div class="git-analytics-container">
          <!-- Header -->
          <div class="git-analytics-header">
            <h1>📊 Git Repository Analytics</h1>
            ${repositoryInfoHtml}
          </div>

          <!-- Author Contributions -->
          <div class="analytics-section">
            <h3>👥 Author Contributions</h3>
            ${authorContributionsHtml}
          </div>

          <!-- Charts Section -->
          <div class="analytics-section">
            <h3>📈 Contribution Charts</h3>
            <div class="charts-container">
              <div class="chart-container">
                <div class="chart-header">
                  <h4 class="chart-title">Commits by Author</h4>
                  <div class="chart-controls">
                    <button class="chart-control-btn active" onclick="showCommitsChart()">Commits</button>
                    <button class="chart-control-btn" onclick="showLinesChart()">Lines</button>
                  </div>
                </div>
                <div class="chart-canvas-container">
                  <canvas id="authorContributionsChart" class="chart-canvas"></canvas>
                </div>
              </div>

              <div class="chart-container">
                <div class="chart-header">
                  <h4 class="chart-title">Commit Timeline</h4>
                  <div class="chart-controls">
                    <button class="chart-control-btn active" onclick="showDailyTimeline()">Daily</button>
                    <button class="chart-control-btn" onclick="showWeeklyTimeline()">Weekly</button>
                  </div>
                </div>
                <div class="chart-canvas-container">
                  <canvas id="commitTimelineChart" class="chart-canvas"></canvas>
                </div>
              </div>
            </div>

            <div class="charts-container">
              <div class="chart-container">
                <div class="chart-header">
                  <h4 class="chart-title">Lines of Code Changes</h4>
                </div>
                <div class="chart-canvas-container">
                  <canvas id="linesOfCodeChart" class="chart-canvas"></canvas>
                </div>
              </div>

              <div class="chart-container">
                <div class="chart-header">
                  <h4 class="chart-title">Module Activity</h4>
                </div>
                <div class="chart-canvas-container">
                  <canvas id="moduleActivityChart" class="chart-canvas"></canvas>
                </div>
              </div>
            </div>
          </div>

          <!-- Commit Timeline -->
          <div class="analytics-section">
            <h3>⏰ Commit Timeline</h3>
            ${timelineHtml}
          </div>

          <!-- Module Statistics -->
          <div class="analytics-section">
            <h3>📁 Module Statistics</h3>
            ${moduleStatsHtml}
          </div>

          <!-- Export Section -->
          <div class="export-section">
            <div class="export-header">
              <h3 class="export-title">Export Analytics</h3>
              <div class="export-buttons">
                <button class="export-btn" onclick="exportCharts()">📊 Export Charts</button>
                <button class="export-btn" onclick="exportData()">💾 Export Data</button>
                <button class="export-btn" onclick="generateReport()">📄 Generate Report</button>
              </div>
            </div>
            <p class="export-description">
              Export your Git analytics data as charts, raw data, or a comprehensive report.
            </p>
          </div>
        </div>

        <!-- Scripts -->
        <script src="${chartJsUri}"></script>
        <script src="${gitChartsUri}"></script>
        
        <script>
          const vscode = acquireVsCodeApi();
          const analyticsData = ${JSON.stringify(analyticsData)};
          let gitChartsInstance = null;
          
          // Initialize when DOM is ready
          document.addEventListener('DOMContentLoaded', function() {
            initializeGitAnalytics();
          });
          
          function initializeGitAnalytics() {
            try {
              if (!GitAnalyticsCharts.isAvailable()) {
                console.error('Chart.js not available');
                return;
              }
              
              gitChartsInstance = new GitAnalyticsCharts();
              
              // Create all charts
              gitChartsInstance.createContributionGraphs(analyticsData);
              
              console.log('Git analytics initialized successfully');
            } catch (error) {
              console.error('Failed to initialize Git analytics:', error);
            }
          }
          
          function showCommitsChart() {
            if (gitChartsInstance) {
              gitChartsInstance.createAuthorContributionsChart('authorContributionsChart', analyticsData);
            }
            updateChartControls('commits');
          }
          
          function showLinesChart() {
            if (gitChartsInstance) {
              gitChartsInstance.createLinesOfCodeChart('authorContributionsChart', analyticsData);
            }
            updateChartControls('lines');
          }
          
          function showDailyTimeline() {
            if (gitChartsInstance) {
              gitChartsInstance.createCommitTimelineChart('commitTimelineChart', analyticsData);
            }
            updateTimelineControls('daily');
          }
          
          function showWeeklyTimeline() {
            // Aggregate data by week and create chart
            const weeklyData = aggregateWeeklyData(analyticsData);
            if (gitChartsInstance) {
              gitChartsInstance.createCommitTimelineChart('commitTimelineChart', weeklyData);
            }
            updateTimelineControls('weekly');
          }
          
          function updateChartControls(activeType) {
            const buttons = document.querySelectorAll('.chart-controls .chart-control-btn');
            buttons.forEach(btn => {
              btn.classList.remove('active');
              if ((activeType === 'commits' && btn.textContent === 'Commits') ||
                  (activeType === 'lines' && btn.textContent === 'Lines')) {
                btn.classList.add('active');
              }
            });
          }
          
          function updateTimelineControls(activeType) {
            const buttons = document.querySelectorAll('.chart-controls .chart-control-btn');
            buttons.forEach(btn => {
              btn.classList.remove('active');
              if ((activeType === 'daily' && btn.textContent === 'Daily') ||
                  (activeType === 'weekly' && btn.textContent === 'Weekly')) {
                btn.classList.add('active');
              }
            });
          }
          
          function aggregateWeeklyData(data) {
            // Simple weekly aggregation - in a real implementation, this would be more sophisticated
            const timeline = data.commitTimeline || [];
            const weeklyMap = new Map();
            
            timeline.forEach(entry => {
              const date = new Date(entry.date);
              const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
              const weekKey = weekStart.toISOString().split('T')[0];
              
              if (!weeklyMap.has(weekKey)) {
                weeklyMap.set(weekKey, { date: weekKey, commits: 0 });
              }
              weeklyMap.get(weekKey).commits += entry.commits;
            });
            
            return {
              ...data,
              commitTimeline: Array.from(weeklyMap.values()).sort((a, b) => a.date.localeCompare(b.date))
            };
          }
          
          function exportCharts() {
            vscode.postMessage({
              command: 'exportCharts',
              data: analyticsData
            });
          }
          
          function exportData() {
            vscode.postMessage({
              command: 'exportData',
              data: analyticsData
            });
          }
          
          function generateReport() {
            vscode.postMessage({
              command: 'generateReport',
              data: analyticsData
            });
          }
          
          function refreshAnalytics() {
            vscode.postMessage({
              command: 'refreshAnalytics'
            });
          }
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Generate repository information HTML
   */
  private generateRepositoryInfo(analyticsData: any): string {
    if (!analyticsData.repository_info) {
      return '<p>No repository information available.</p>';
    }

    const repoInfo = analyticsData.repository_info;
    
    return `
      <div class="repository-summary">
        <div class="repo-info">
          <h3>${repoInfo.repository_name || 'Repository'}</h3>
          <div class="repo-stats">
            <div class="repo-stat">
              <strong>Total Commits:</strong> ${repoInfo.total_commits || 0}
            </div>
            <div class="repo-stat">
              <strong>Contributors:</strong> ${repoInfo.contributors || 0}
            </div>
            <div class="repo-stat">
              <strong>Active Period:</strong> ${repoInfo.first_commit_date || 'Unknown'} - ${repoInfo.last_commit_date || 'Unknown'}
            </div>
            <div class="repo-stat">
              <strong>Total Files:</strong> ${repoInfo.total_files || 0}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate author contributions HTML
   */
  private generateAuthorContributions(analyticsData: any): string {
    if (!analyticsData.authorContributions || analyticsData.authorContributions.length === 0) {
      return '<div class="empty-state"><p>No author contribution data available.</p></div>';
    }

    const authors = analyticsData.authorContributions.slice(0, 10); // Top 10 contributors
    let html = '<div class="authors-grid">';

    authors.forEach((author: any) => {
      const contributionPercentage = ((author.totalCommits / analyticsData.repository_info.total_commits) * 100).toFixed(1);
      
      html += `
        <div class="author-card">
          <div class="author-header">
            <div class="author-info">
              <div class="author-name">${author.authorName}</div>
              <div class="author-email">${author.authorEmail}</div>
            </div>
            <div class="contribution-percentage">${contributionPercentage}%</div>
          </div>
          
          <div class="author-metrics">
            <div class="metric">
              <span class="metric-label">Commits</span>
              <span class="metric-value">${author.totalCommits}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Lines Added</span>
              <span class="metric-value positive">+${author.linesAdded}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Lines Removed</span>
              <span class="metric-value negative">-${author.linesRemoved}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Files Changed</span>
              <span class="metric-value">${author.filesChanged || 0}</span>
            </div>
          </div>
          
          <div class="author-timeline">
            <span class="timeline-label">Active:</span>
            <span class="timeline-range">${author.firstCommitDate} - ${author.lastCommitDate}</span>
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  /**
   * Generate commit timeline HTML
   */
  private generateCommitTimeline(analyticsData: any): string {
    if (!analyticsData.commitTimeline || analyticsData.commitTimeline.length === 0) {
      return '<div class="empty-state"><p>No commit timeline data available.</p></div>';
    }

    return `
      <div class="timeline-container">
        <div class="timeline-header">
          <h4>Recent Activity</h4>
          <div class="timeline-filters">
            <button class="timeline-filter active" onclick="filterTimeline('all')">All</button>
            <button class="timeline-filter" onclick="filterTimeline('week')">Last Week</button>
            <button class="timeline-filter" onclick="filterTimeline('month')">Last Month</button>
          </div>
        </div>
        <div class="timeline-chart-container">
          <canvas id="timelineChart" class="chart-canvas"></canvas>
        </div>
      </div>
    `;
  }

  /**
   * Generate module statistics HTML
   */
  private generateModuleStatistics(analyticsData: any): string {
    if (!analyticsData.moduleStatistics || analyticsData.moduleStatistics.length === 0) {
      return '<div class="empty-state"><p>No module statistics available.</p></div>';
    }

    const modules = analyticsData.moduleStatistics.slice(0, 12); // Top 12 modules
    let html = '<div class="module-stats-grid">';

    modules.forEach((module: any) => {
      html += `
        <div class="module-stats-card">
          <div class="module-stats-header">
            <div class="module-path">${module.modulePath}</div>
            <div class="module-commits">${module.totalCommits}</div>
          </div>
          <div class="module-stats-metrics">
            <div class="module-metric">
              <div class="module-metric-label">Authors</div>
              <div class="module-metric-value">${module.uniqueAuthors}</div>
            </div>
            <div class="module-metric">
              <div class="module-metric-label">Changes</div>
              <div class="module-metric-value">${module.totalChanges || 0}</div>
            </div>
            <div class="module-metric">
              <div class="module-metric-label">Last Modified</div>
              <div class="module-metric-value">${module.lastModified || 'Unknown'}</div>
            </div>
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
      case 'exportCharts':
        this.exportCharts(message.data);
        break;
      case 'exportData':
        this.exportData(message.data);
        break;
      case 'generateReport':
        this.generateReport(message.data);
        break;
      case 'refreshAnalytics':
        vscode.commands.executeCommand('doracodebirdview.analyzeGitAnalytics');
        break;
      default:
        this.errorHandler.logError('Unknown webview message', message, 'GitAnalyticsWebview');
    }
  }

  /**
   * Export charts as images
   */
  private async exportCharts(data: any): Promise<void> {
    try {
      // This would typically involve capturing the canvas elements
      // For now, we'll show a message that the feature is available
      vscode.window.showInformationMessage('Chart export functionality will be implemented in the webview JavaScript.');
    } catch (error) {
      this.errorHandler.logError('Failed to export charts', error, 'GitAnalyticsWebview');
      vscode.window.showErrorMessage('Failed to export charts');
    }
  }

  /**
   * Export analytics data
   */
  private async exportData(data: any): Promise<void> {
    try {
      const dataContent = JSON.stringify(data, null, 2);
      
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file('git_analytics_data.json'),
        filters: {
          'JSON Files': ['json'],
          'All Files': ['*']
        }
      });
      
      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(dataContent, 'utf8'));
        vscode.window.showInformationMessage(`Analytics data exported to ${uri.fsPath}`);
      }
    } catch (error) {
      this.errorHandler.logError('Failed to export analytics data', error, 'GitAnalyticsWebview');
      vscode.window.showErrorMessage('Failed to export analytics data');
    }
  }

  /**
   * Generate comprehensive report
   */
  private async generateReport(data: any): Promise<void> {
    try {
      const report = this.generateMarkdownReport(data);
      
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file('git_analytics_report.md'),
        filters: {
          'Markdown Files': ['md'],
          'All Files': ['*']
        }
      });
      
      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(report, 'utf8'));
        vscode.window.showInformationMessage(`Analytics report generated at ${uri.fsPath}`);
      }
    } catch (error) {
      this.errorHandler.logError('Failed to generate report', error, 'GitAnalyticsWebview');
      vscode.window.showErrorMessage('Failed to generate report');
    }
  }

  /**
   * Generate markdown report
   */
  private generateMarkdownReport(data: any): string {
    const repoInfo = data.repository_info || {};
    const authors = data.authorContributions || [];
    const modules = data.moduleStatistics || [];
    
    let report = `# Git Analytics Report\n\n`;
    report += `Generated on: ${new Date().toLocaleString()}\n\n`;
    
    // Repository Overview
    report += `## Repository Overview\n\n`;
    report += `- **Repository:** ${repoInfo.repository_name || 'Unknown'}\n`;
    report += `- **Total Commits:** ${repoInfo.total_commits || 0}\n`;
    report += `- **Contributors:** ${repoInfo.contributors || 0}\n`;
    report += `- **Active Period:** ${repoInfo.first_commit_date || 'Unknown'} - ${repoInfo.last_commit_date || 'Unknown'}\n`;
    report += `- **Total Files:** ${repoInfo.total_files || 0}\n\n`;
    
    // Top Contributors
    if (authors.length > 0) {
      report += `## Top Contributors\n\n`;
      authors.slice(0, 10).forEach((author: any, index: number) => {
        const percentage = ((author.totalCommits / repoInfo.total_commits) * 100).toFixed(1);
        report += `${index + 1}. **${author.authorName}** (${author.authorEmail})\n`;
        report += `   - Commits: ${author.totalCommits} (${percentage}%)\n`;
        report += `   - Lines Added: +${author.linesAdded}\n`;
        report += `   - Lines Removed: -${author.linesRemoved}\n`;
        report += `   - Active: ${author.firstCommitDate} - ${author.lastCommitDate}\n\n`;
      });
    }
    
    // Module Activity
    if (modules.length > 0) {
      report += `## Most Active Modules\n\n`;
      modules.slice(0, 10).forEach((module: any, index: number) => {
        report += `${index + 1}. **${module.modulePath}**\n`;
        report += `   - Commits: ${module.totalCommits}\n`;
        report += `   - Contributors: ${module.uniqueAuthors}\n`;
        report += `   - Last Modified: ${module.lastModified || 'Unknown'}\n\n`;
      });
    }
    
    return report;
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