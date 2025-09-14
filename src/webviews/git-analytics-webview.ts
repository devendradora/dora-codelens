import * as vscode from "vscode";
import * as path from "path";
import { ErrorHandler } from "../core/error-handler";

/**
 * Git Analytics Webview Provider
 * Provides dedicated webview for displaying Git analytics and repository insights
 */
export class GitAnalyticsWebview {
  private static readonly VIEW_TYPE = "doracodelens.gitAnalytics";
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

      this.errorHandler.logError(
        "Git analytics webview shown",
        null,
        "GitAnalyticsWebview"
      );
    } catch (error) {
      this.errorHandler.logError(
        "Failed to show Git analytics webview",
        error,
        "GitAnalyticsWebview"
      );
      throw error;
    }
  }

  /**
   * Create the webview panel
   */
  private createPanel(): void {
    this.panel = vscode.window.createWebviewPanel(
      GitAnalyticsWebview.VIEW_TYPE,
      "Git Analytics",
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
        "Git analytics webview disposed",
        null,
        "GitAnalyticsWebview"
      );
    });

    // Handle panel becoming visible
    this.panel.onDidChangeViewState(() => {
      if (this.panel && this.panel.visible) {
        this.errorHandler.logError(
          "Git analytics webview became visible",
          null,
          "GitAnalyticsWebview"
        );
        // Trigger chart initialization when panel becomes visible
        this.panel.webview.postMessage({ command: "panelVisible" });
      }
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
    if (!this.panel) {
      return;
    }

    try {
      const html = this.generateHTML(analyticsData);
      this.panel.webview.html = html;
    } catch (error) {
      this.errorHandler.logError(
        "Failed to update Git analytics content",
        error,
        "GitAnalyticsWebview"
      );
      this.showError("Failed to display analytics results");
    }
  }

  /**
   * Generate HTML content for the webview
   */
  private generateHTML(analyticsData: any): string {
    const webview = this.panel!.webview;

    // Get resource URIs
    const cssUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.extensionPath, "resources", "webview.css"))
    );
    const chartJsUri = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(
          this.extensionPath,
          "node_modules",
          "chart.js",
          "dist",
          "chart.umd.min.js"
        )
      )
    );
    const gitChartsUri = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.extensionPath, "resources", "git-analytics-charts.js")
      )
    );

    // Generate tab contents
    const tabContents = this.generateTabContents(analyticsData);

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
          script-src ${
            webview.cspSource
          } https://cdn.jsdelivr.net 'unsafe-inline' 'unsafe-eval';
          style-src ${webview.cspSource} 'unsafe-inline';
          font-src ${webview.cspSource} https:;
          connect-src https://cdn.jsdelivr.net;
        ">
      </head>
      <body>
        <div class="analysis-container">
          <!-- Navigation Links -->
          <div class="navigation-bar">
            <div class="nav-links">
              <button class="nav-link active" data-tab="repository-overview-section">
                <span class="nav-icon">📊</span>
                <span class="nav-label">Repository Overview</span>
              </button>
              <button class="nav-link" data-tab="timeline-charts-section">
                <span class="nav-icon">📈</span>
                <span class="nav-label">Timeline Charts</span>
              </button>
            </div>
          </div>

          <!-- Scrollable Content -->
          <div class="scrollable-content">
            <!-- Repository Overview Section -->
            <section id="repository-overview-section" class="content-section active">
              <div class="section-content">
                ${tabContents.repositoryOverview}
              </div>
            </section>

            <!-- Timeline Charts Section -->
            <section id="timeline-charts-section" class="content-section">
              <div class="section-content">
                ${tabContents.timelineCharts}
              </div>
            </section>
          </div>
        </div>

        <!-- Scripts -->
        <script src="${chartJsUri}" onerror="loadChartJsFallback()"></script>
        <script src="${gitChartsUri}"></script>
        
        <script>
          // Fallback Chart.js loading
          function loadChartJsFallback() {
            console.log('Local Chart.js failed to load, trying CDN fallback...');
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
            script.onload = function() {
              console.log('Chart.js loaded from CDN');
              // Trigger initialization after CDN load
              if (typeof initializeGitAnalytics === 'function') {
                setTimeout(initializeGitAnalytics, 100);
              }
            };
            script.onerror = function() {
              console.error('Failed to load Chart.js from CDN as well');
            };
            document.head.appendChild(script);
          }
        </script>
        
        <script>
          const vscode = acquireVsCodeApi();
          const analyticsData = ${JSON.stringify(analyticsData)};
          let gitChartsInstance = null;
          
          // Validate analytics data
          console.log('Analytics data received:', analyticsData);
          console.log('Author contributions:', analyticsData.author_contributions || analyticsData.authorContributions);
          
          // Debug function for manual testing
          window.debugGitAnalytics = function() {
            console.log('=== Git Analytics Debug Info ===');
            console.log('Chart.js available:', typeof Chart !== 'undefined');
            console.log('Chart constructor:', typeof Chart === 'function');
            console.log('Canvas element:', document.getElementById('authorContributionsOverviewChart'));
            console.log('Repository section active:', document.getElementById('repository-overview-section')?.classList.contains('active'));
            console.log('Analytics data:', analyticsData);
            console.log('Current chart instance:', authorOverviewChart);
            console.log('================================');
            
            // Try to force chart creation
            if (typeof Chart !== 'undefined') {
              console.log('Attempting to force chart creation...');
              initializeAuthorContributionsOverviewChart();
            } else {
              console.log('Chart.js not available, creating fallback...');
              createFallbackChart();
            }
          };
          
          // Initialize when DOM is ready
          document.addEventListener('DOMContentLoaded', function() {
            initializeTabs();
            
            // Try to initialize immediately if Chart.js is available
            if (typeof Chart !== 'undefined') {
              console.log('Chart.js available immediately, initializing...');
              initializeGitAnalytics();
            } else {
              console.log('Chart.js not available immediately, waiting...');
              // Wait for Chart.js to load with multiple attempts
              let attempts = 0;
              const maxAttempts = 10;
              const checkInterval = 200;
              
              const checkChartJs = () => {
                attempts++;
                console.log(\`Checking for Chart.js, attempt \${attempts}/\${maxAttempts}\`);
                
                if (typeof Chart !== 'undefined') {
                  console.log('Chart.js found, initializing...');
                  initializeGitAnalytics();
                } else if (attempts < maxAttempts) {
                  setTimeout(checkChartJs, checkInterval);
                } else {
                  console.error('Chart.js failed to load after multiple attempts');
                  createFallbackChart();
                }
              };
              
              setTimeout(checkChartJs, checkInterval);
            }
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
                  
                  // If switching to repository overview tab, ensure author chart is rendered
                  if (targetTab === 'repository-overview-section') {
                    setTimeout(() => {
                      if (typeof Chart !== 'undefined') {
                        initializeAuthorContributionsOverviewChart();
                      } else {
                        createFallbackChart();
                      }
                    }, 100);
                  }
                  
                  // If switching to timeline charts tab, ensure charts are rendered properly
                  if (targetTab === 'timeline-charts-section' && gitChartsInstance) {
                    setTimeout(() => {
                      gitChartsInstance.createContributionGraphs(analyticsData);
                      // Also reinitialize the timeline chart in the Commit Timeline section
                      const timelineCanvas = document.getElementById('timelineChart');
                      if (timelineCanvas) {
                        gitChartsInstance.createCommitTimelineChart('timelineChart', analyticsData);
                      }
                    }, 100);
                  }
                }
              });
            });
          }
          
          function initializeGitAnalytics() {
            try {
              console.log('Initializing Git analytics...');
              console.log('Chart available:', typeof Chart !== 'undefined');
              console.log('Chart constructor:', typeof Chart === 'function');
              
              // Check if Chart.js is available and functional
              if (typeof Chart === 'undefined') {
                console.error('Chart.js not available');
                createFallbackChart();
                return;
              }
              
              // Test Chart.js functionality
              try {
                // Try to create a minimal chart to test if Chart.js is working
                const testCanvas = document.createElement('canvas');
                const testCtx = testCanvas.getContext('2d');
                if (testCtx) {
                  const testChart = new Chart(testCtx, {
                    type: 'bar',
                    data: { labels: ['test'], datasets: [{ data: [1] }] },
                    options: { responsive: false, animation: false }
                  });
                  testChart.destroy();
                  console.log('Chart.js functionality test passed');
                }
              } catch (testError) {
                console.error('Chart.js functionality test failed:', testError);
                createFallbackChart();
                return;
              }
              
              // Initialize GitAnalyticsCharts if available
              if (typeof GitAnalyticsCharts !== 'undefined' && GitAnalyticsCharts.isAvailable()) {
                gitChartsInstance = new GitAnalyticsCharts();
                gitChartsInstance.createContributionGraphs(analyticsData);
                
                // Initialize the timeline chart in the Commit Timeline section
                setTimeout(() => {
                  const timelineCanvas = document.getElementById('timelineChart');
                  if (timelineCanvas) {
                    gitChartsInstance.createCommitTimelineChart('timelineChart', analyticsData);
                  }
                }, 500);
              }
              
              // Initialize author contributions overview chart with a delay to ensure DOM is ready
              setTimeout(() => {
                // Check if repository overview section is active (default)
                const repoSection = document.getElementById('repository-overview-section');
                if (repoSection && repoSection.classList.contains('active')) {
                  initializeAuthorContributionsOverviewChart();
                } else {
                  console.log('Repository overview section not active, skipping chart initialization');
                }
              }, 300);
              
              console.log('Git analytics initialized successfully');
            } catch (error) {
              console.error('Failed to initialize Git analytics:', error);
              createFallbackChart();
            }
          }
          
          let currentTimePeriod = 'all';
          let currentMetric = 'commits';
          let authorOverviewChart = null;
          
          function initializeAuthorContributionsOverviewChart() {
            console.log('Initializing author contributions overview chart...');
            
            const canvas = document.getElementById('authorContributionsOverviewChart');
            if (!canvas) {
              console.error('Canvas element not found: authorContributionsOverviewChart');
              return;
            }
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              console.error('Could not get 2D context from canvas');
              return;
            }
            
            // Check if Chart.js is available
            if (typeof Chart === 'undefined') {
              console.error('Chart.js is not available');
              return;
            }
            
            console.log('Canvas and Chart.js available, creating initial chart...');
            
            // Create initial chart with commits data
            updateAuthorChart('commits');
          }
          
          function filterAuthorContributions(period) {
            currentTimePeriod = period;
            
            // Update active button
            document.querySelectorAll('.time-filter-btn').forEach(btn => {
              btn.classList.remove('active');
            });
            event.target.classList.add('active');
            
            // Update chart with current metric and new time period
            updateAuthorChart(currentMetric);
          }
          
          function updateAuthorChart(metric) {
            currentMetric = metric;
            
            console.log('Updating author chart with metric:', metric);
            
            // Update active metric button
            document.querySelectorAll('.metric-btn').forEach(btn => {
              btn.classList.remove('active');
            });
            const targetBtn = document.querySelector(\`[data-metric="\${metric}"]\`);
            if (targetBtn) {
              targetBtn.classList.add('active');
            } else {
              console.warn('Metric button not found for:', metric);
            }
            
            // Get filtered data based on time period
            const filteredData = getFilteredAuthorData(currentTimePeriod);
            console.log('Filtered data for chart:', filteredData);
            
            // Validate data before creating chart
            if (!filteredData || filteredData.length === 0) {
              console.warn('No data available for chart');
              createFallbackChart();
              return;
            }
            
            // Create or update chart
            createAuthorContributionsChart(filteredData, metric);
          }
          
          function getFilteredAuthorData(period) {
            const authorContributions = analyticsData.author_contributions || analyticsData.authorContributions || [];
            const commitTimeline = analyticsData.commit_timeline || analyticsData.commitTimeline || [];
            
            if (period === 'all') {
              return authorContributions;
            }
            
            // Calculate date range based on period
            const now = new Date();
            let startDate;
            
            switch (period) {
              case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
              case 'month':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
              case 'year':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
              default:
                return authorContributions;
            }
            
            // Filter timeline data for the period
            const filteredTimeline = commitTimeline.filter(entry => {
              const entryDate = new Date(entry.date);
              return entryDate >= startDate;
            });
            
            // Aggregate author contributions for the filtered period
            const authorStats = {};
            
            filteredTimeline.forEach(entry => {
              const authors = entry.authors || [];
              const commitsPerAuthor = Math.floor((entry.commit_count || entry.commits || 0) / Math.max(authors.length, 1));
              const linesAddedPerAuthor = Math.floor((entry.lines_added || 0) / Math.max(authors.length, 1));
              const linesRemovedPerAuthor = Math.floor((entry.lines_removed || 0) / Math.max(authors.length, 1));
              
              authors.forEach(authorName => {
                if (!authorStats[authorName]) {
                  authorStats[authorName] = {
                    author_name: authorName,
                    total_commits: 0,
                    lines_added: 0,
                    lines_removed: 0
                  };
                }
                
                authorStats[authorName].total_commits += commitsPerAuthor;
                authorStats[authorName].lines_added += linesAddedPerAuthor;
                authorStats[authorName].lines_removed += linesRemovedPerAuthor;
              });
            });
            
            // Convert to array and sort by commits
            const filteredAuthors = Object.values(authorStats).sort((a, b) => b.total_commits - a.total_commits);
            
            return filteredAuthors.length > 0 ? filteredAuthors : authorContributions;
          }
          
          function createAuthorContributionsChart(authorData, metric) {
            console.log('Creating author contributions chart with metric:', metric);
            console.log('Author data:', authorData);
            
            const canvas = document.getElementById('authorContributionsOverviewChart');
            if (!canvas) {
              console.error('Canvas element not found');
              return;
            }
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              console.error('Could not get 2D context');
              return;
            }
            
            // Ensure canvas has proper dimensions
            const container = canvas.parentElement;
            if (container) {
              const containerRect = container.getBoundingClientRect();
              console.log('Container dimensions:', containerRect.width, 'x', containerRect.height);
              
              // Set canvas size if it's too small
              if (containerRect.width > 0 && containerRect.height > 0) {
                canvas.style.width = '100%';
                canvas.style.height = '100%';
              }
            }
            
            // Check if Chart.js is available
            if (typeof Chart === 'undefined') {
              console.error('Chart.js is not available');
              createFallbackChart();
              return;
            }
            
            // Destroy existing chart
            if (authorOverviewChart) {
              authorOverviewChart.destroy();
              authorOverviewChart = null;
            }
            
            // Prepare data
            const topAuthors = authorData.slice(0, 8); // Show top 8 authors
            console.log('Top authors for chart:', topAuthors);
            
            const labels = topAuthors.map(author => author.author_name || author.authorName || 'Unknown');
            console.log('Chart labels:', labels);
            
            let data, label, backgroundColor, borderColor;
            
            switch (metric) {
              case 'commits':
                data = topAuthors.map(author => author.total_commits || author.totalCommits || 0);
                label = 'Commits';
                backgroundColor = 'rgba(54, 162, 235, 0.6)';
                borderColor = 'rgba(54, 162, 235, 1)';
                break;
              case 'lines_added':
                data = topAuthors.map(author => author.lines_added || author.linesAdded || 0);
                label = 'Lines Added';
                backgroundColor = 'rgba(75, 192, 192, 0.6)';
                borderColor = 'rgba(75, 192, 192, 1)';
                break;
              case 'lines_removed':
                data = topAuthors.map(author => author.lines_removed || author.linesRemoved || 0);
                label = 'Lines Removed';
                backgroundColor = 'rgba(255, 99, 132, 0.6)';
                borderColor = 'rgba(255, 99, 132, 1)';
                break;
              default:
                data = topAuthors.map(author => author.total_commits || author.totalCommits || 0);
                label = 'Commits';
                backgroundColor = 'rgba(54, 162, 235, 0.6)';
                borderColor = 'rgba(54, 162, 235, 1)';
            }
            
            console.log('Chart data prepared:', { labels, data, label });
            
            // Validate Chart.js one more time before creating
            if (typeof Chart === 'undefined') {
              console.error('Chart.js not available at creation time');
              createFallbackChart();
              return;
            }
            
            // Create new chart
            try {
              console.log('Creating Chart.js instance...');
              console.log('Chart constructor type:', typeof Chart);
              console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
              
              authorOverviewChart = new Chart(ctx, {
                type: 'bar',
                data: {
                  labels: labels,
                  datasets: [{
                    label: label,
                    data: data,
                    backgroundColor: backgroundColor,
                    borderColor: borderColor,
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false
                  }]
                },
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const value = context.parsed.y;
                          return \`\${label}: \${value.toLocaleString()}\`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function(value) {
                          return value.toLocaleString();
                        }
                      },
                      grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                      }
                    },
                    x: {
                      ticks: {
                        maxRotation: 45,
                        minRotation: 0
                      },
                      grid: {
                        display: false
                      }
                    }
                  },
                  animation: {
                    duration: 750,
                    easing: 'easeInOutQuart'
                  }
                }
              });
              console.log('Chart created successfully:', authorOverviewChart);
            } catch (error) {
              console.error('Error creating chart:', error);
              createFallbackChart();
            }
          }
          
          function createFallbackChart() {
            console.log('Creating fallback chart...');
            const canvas = document.getElementById('authorContributionsOverviewChart');
            if (!canvas) return;
            
            const parent = canvas.parentElement;
            if (!parent) return;
            
            // Get author data
            const authorContributions = analyticsData.author_contributions || analyticsData.authorContributions || [];
            const topAuthors = authorContributions.slice(0, 5);
            
            if (topAuthors.length === 0) {
              parent.innerHTML = '<div class="chart-empty"><h4>No Data Available</h4><p>No author contribution data found.</p></div>';
              return;
            }
            
            // Create simple HTML bar chart
            let fallbackHTML = '<div class="fallback-chart">';
            fallbackHTML += '<h4>Author Contributions (Commits)</h4>';
            
            const maxCommits = Math.max(...topAuthors.map(author => author.total_commits || author.totalCommits || 0));
            
            topAuthors.forEach(author => {
              const commits = author.total_commits || author.totalCommits || 0;
              const percentage = maxCommits > 0 ? (commits / maxCommits) * 100 : 0;
              const authorName = author.author_name || author.authorName || 'Unknown';
              
              fallbackHTML += \`
                <div class="fallback-bar-container">
                  <div class="fallback-bar-label">\${authorName}</div>
                  <div class="fallback-bar-wrapper">
                    <div class="fallback-bar" style="width: \${percentage}%"></div>
                    <div class="fallback-bar-value">\${commits}</div>
                  </div>
                </div>
              \`;
            });
            
            fallbackHTML += '</div>';
            parent.innerHTML = fallbackHTML;
            
            // Show retry button
            const retryButton = document.getElementById('chartRetryButton');
            if (retryButton) {
              retryButton.style.display = 'block';
            }
          }
          
          function retryChartCreation() {
            console.log('Retrying chart creation...');
            
            // Hide retry button
            const retryButton = document.getElementById('chartRetryButton');
            if (retryButton) {
              retryButton.style.display = 'none';
            }
            
            // Reset canvas
            const canvas = document.getElementById('authorContributionsOverviewChart');
            if (canvas) {
              const parent = canvas.parentElement;
              if (parent) {
                parent.innerHTML = '<canvas id="authorContributionsOverviewChart" class="chart-canvas"></canvas><div id="chartRetryButton" class="chart-retry-button" style="display: none;"><button onclick="retryChartCreation()">🔄 Retry Chart</button></div>';
              }
            }
            
            // Try to initialize chart again
            setTimeout(() => {
              if (typeof Chart !== 'undefined') {
                initializeAuthorContributionsOverviewChart();
              } else {
                createFallbackChart();
              }
            }, 100);
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
          
          function filterTimeline(period) {
            // Update active filter button
            document.querySelectorAll('.timeline-filter').forEach(btn => {
              btn.classList.remove('active');
            });
            event.target.classList.add('active');
            
            // Filter timeline data based on period
            let filteredData = analyticsData;
            const now = new Date();
            
            if (period !== 'all') {
              const timeline = analyticsData.commit_timeline || analyticsData.commitTimeline || [];
              let startDate;
              
              switch (period) {
                case 'week':
                  startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                  break;
                case 'month':
                  startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                  break;
                case 'quarter':
                  startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                  break;
                default:
                  startDate = null;
              }
              
              if (startDate) {
                const filteredTimeline = timeline.filter(entry => {
                  const entryDate = new Date(entry.date);
                  return entryDate >= startDate;
                });
                
                filteredData = {
                  ...analyticsData,
                  commit_timeline: filteredTimeline,
                  commitTimeline: filteredTimeline
                };
              }
            }
            
            // Update the timeline chart with filtered data
            if (gitChartsInstance) {
              const timelineCanvas = document.getElementById('timelineChart');
              if (timelineCanvas) {
                gitChartsInstance.createCommitTimelineChart('timelineChart', filteredData);
              }
            }
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
          
          // Handle messages from extension
          window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
              case 'panelVisible':
                console.log('Panel became visible, checking chart status...');
                // Check if chart needs to be initialized
                const canvas = document.getElementById('authorContributionsOverviewChart');
                if (canvas && !authorOverviewChart) {
                  console.log('Chart not initialized, attempting initialization...');
                  setTimeout(() => {
                    if (typeof Chart !== 'undefined') {
                      initializeAuthorContributionsOverviewChart();
                    } else {
                      createFallbackChart();
                    }
                  }, 100);
                }
                break;
            }
          });
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Generate tab contents for the webview
   */
  private generateTabContents(analyticsData: any): any {
    return {
      repositoryOverview: this.generateRepositoryOverview(analyticsData),
      timelineCharts: this.generateTimelineChartsContent(analyticsData),
    };
  }

  /**
   * Generate repository overview content
   */
  private generateRepositoryOverview(analyticsData: any): string {
    const repositoryInfoHtml = this.generateRepositoryInfo(analyticsData);
    const moduleAuthorsHtml = this.generateModuleWiseAuthors(analyticsData);

    return `
      <div class="repository-overview-content">
        ${repositoryInfoHtml}
        ${moduleAuthorsHtml}
        
        <!-- Export Section -->
        <div class="export-section">
          <div class="export-header">
            <h3 class="export-title">Export Analytics</h3>
            <div class="export-buttons">
              <button class="export-btn" onclick="exportCharts()">📊 Export Charts</button>
              <button class="export-btn" onclick="exportData()">� Expxort Data</button>
              <button class="export-btn" onclick="generateReport()">📄 Generate Report</button>
            </div>
          </div>
          <p class="export-description">
            Export your Git analytics data as charts, raw data, or a comprehensive report.
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Generate contributors content
   */
  private generateContributorsContent(analyticsData: any): string {
    const authorContributionsHtml =
      this.generateAuthorContributions(analyticsData);

    return `
      <div class="contributors-content">
        <div class="analytics-section">
          ${authorContributionsHtml}
        </div>
      </div>
    `;
  }

  /**
   * Generate timeline charts content
   */
  private generateTimelineChartsContent(analyticsData: any): string {
    const timelineHtml = this.generateCommitTimeline(analyticsData);

    return `
      <div class="timeline-charts-content">
        <!-- Charts Section -->
        <div class="analytics-section">
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
      </div>
    `;
  }

  /**
   * Generate repository information HTML
   */
  private generateRepositoryInfo(analyticsData: any): string {
    if (!analyticsData.repository_info) {
      return `
        <div class="empty-state">
          <h3>⚠️ Repository Information Unavailable</h3>
          <p>No repository information could be retrieved. This might indicate:</p>
          <ul>
            <li>The directory is not a Git repository</li>
            <li>Git is not installed or accessible</li>
            <li>Permission issues accessing the repository</li>
          </ul>
          <button onclick="refreshAnalytics()" class="retry-btn">🔄 Retry Analysis</button>
        </div>
      `;
    }

    const repoInfo = analyticsData.repository_info;
    const authorContributions =
      analyticsData.author_contributions ||
      analyticsData.authorContributions ||
      [];

    // Get current git user information
    const currentUserName = analyticsData.current_user_name;
    const currentUserEmail = analyticsData.current_user_email;

    // Find system author by matching current git user name or email
    let systemAuthor = null;
    if (currentUserName || currentUserEmail) {
      systemAuthor = authorContributions.find((author: any) => {
        const authorName = author.author_name || author.authorName || "";
        const authorEmail = author.author_email || author.authorEmail || "";

        // Match by name or email (case insensitive)
        const nameMatch =
          currentUserName &&
          authorName.toLowerCase() === currentUserName.toLowerCase();
        const emailMatch =
          currentUserEmail &&
          authorEmail.toLowerCase() === currentUserEmail.toLowerCase();

        return nameMatch || emailMatch;
      });
    }

    // Fallback to first author if no match found
    if (!systemAuthor && authorContributions.length > 0) {
      systemAuthor = authorContributions[0];
    }

    const systemAuthorCommits = systemAuthor
      ? systemAuthor.total_commits || systemAuthor.totalCommits || 0
      : 0;
    const systemAuthorLinesAdded = systemAuthor
      ? systemAuthor.lines_added || systemAuthor.linesAdded || 0
      : 0;
    const systemAuthorLinesRemoved = systemAuthor
      ? systemAuthor.lines_removed || systemAuthor.linesRemoved || 0
      : 0;

    return `
      <div class="repository-summary">
        <div class="repo-info">
          <h3>📁 ${
            repoInfo.name || repoInfo.repository_name || "Repository"
          }</h3>
          
          <!-- First row with two divs -->
          <div class="repo-overview-row">
            <!-- First div: Repository stats -->
            <div class="repo-stats-section">
              <div class="repo-stat">
                <div class="stat-icon">👥</div>
                <div class="stat-content">
                  <div class="stat-label">Total Contributors</div>
                  <div class="stat-value">${repoInfo.contributors || 0}</div>
                </div>
              </div>
              <div class="repo-stat">
                <div class="stat-icon">📊</div>
                <div class="stat-content">
                  <div class="stat-label">Total Commits</div>
                  <div class="stat-value">${repoInfo.total_commits || 0}</div>
                </div>
              </div>
              <div class="repo-stat">
                <div class="stat-icon">🌿</div>
                <div class="stat-content">
                  <div class="stat-label">Current Branch</div>
                  <div class="stat-value">${repoInfo.branch || "main"}</div>
                </div>
              </div>
            </div>
            
            <!-- Second div: System author stats -->
            <div class="system-author-section">
              <div class="system-author-header">
                <div class="stat-icon">👤</div>
                <div class="system-author-title">Your Contributions</div>
              </div>
              
              <!-- Author Identity -->
              <div class="system-author-identity">
                <div class="author-name">${
                  systemAuthor
                    ? systemAuthor.author_name ||
                      systemAuthor.authorName ||
                      "Unknown"
                    : "No data"
                }</div>
                <div class="author-email">${
                  systemAuthor
                    ? systemAuthor.author_email ||
                      systemAuthor.authorEmail ||
                      ""
                    : ""
                }</div>
              </div>
              
              <!-- Author Stats -->
              <div class="system-author-stats">
                <div class="system-stat">
                  <div class="stat-label">Commits</div>
                  <div class="stat-value">${systemAuthorCommits.toLocaleString()}</div>
                </div>
                <div class="system-stat">
                  <div class="stat-label">Lines Added</div>
                  <div class="stat-value positive">+${systemAuthorLinesAdded.toLocaleString()}</div>
                </div>
                <div class="system-stat">
                  <div class="stat-label">Lines Removed</div>
                  <div class="stat-value negative">-${systemAuthorLinesRemoved.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Author Contributions Bar Chart -->
        <div class="author-contributions-chart-section">
          <div class="chart-header">
            <h4>📊 Author Contributions</h4>
            <div class="time-period-filters">
              <button class="time-filter-btn active" onclick="filterAuthorContributions('all')">All Time</button>
              <button class="time-filter-btn" onclick="filterAuthorContributions('week')">Week</button>
              <button class="time-filter-btn" onclick="filterAuthorContributions('month')">Month</button>
              <button class="time-filter-btn" onclick="filterAuthorContributions('year')">Year</button>
            </div>
          </div>
          
          <div class="chart-metrics-selector">
            <div class="metric-buttons">
              <button class="metric-btn active" data-metric="commits" onclick="updateAuthorChart('commits')">
                <span class="metric-icon">�</span>
                <span class="metric-label">Commits</span>
              </button>
              <button class="metric-btn" data-metric="lines_added" onclick="updateAuthorChart('lines_added')">
                <span class="metric-icon">➕</span>
                <span class="metric-label">Lines Added</span>
              </button>
              <button class="metric-btn" data-metric="lines_removed" onclick="updateAuthorChart('lines_removed')">
                <span class="metric-icon">➖</span>
                <span class="metric-label">Lines Removed</span>
              </button>
            </div>
          </div>
          
          <div class="chart-container">
            <canvas id="authorContributionsOverviewChart" class="chart-canvas"></canvas>
            <div id="chartRetryButton" class="chart-retry-button" style="display: none;">
              <button onclick="retryChartCreation()">🔄 Retry Chart</button>
            </div>
          </div>
          
          ${
            authorContributions.length > 0
              ? this.generateAuthorContributionsTable(authorContributions)
              : ""
          }
        </div>
      </div>
    `;
  }

  /**
   * Generate author contributions table for repository overview
   */
  private generateAuthorContributionsTable(authorContributions: any[]): string {
    const topAuthors = authorContributions.slice(0, 5); // Show top 5 authors

    return `
      <div class="author-contributions-table">
        <h5>Top Contributors</h5>
        <div class="contributions-table">
          <div class="table-header">
            <div class="col-author">Author</div>
            <div class="col-commits">Commits</div>
            <div class="col-added">Added</div>
            <div class="col-removed">Removed</div>
            <div class="col-percentage">%</div>
          </div>
          ${topAuthors
            .map((author: any) => {
              const authorName =
                author.author_name || author.authorName || "Unknown";
              const commits = author.total_commits || author.totalCommits || 0;
              const linesAdded = author.lines_added || author.linesAdded || 0;
              const linesRemoved =
                author.lines_removed || author.linesRemoved || 0;
              const percentage = author.contribution_percentage || 0;

              return `
              <div class="table-row">
                <div class="col-author">
                  <div class="author-info">
                    <div class="author-name">${authorName}</div>
                    <div class="author-email">${
                      author.author_email || author.authorEmail || ""
                    }</div>
                  </div>
                </div>
                <div class="col-commits">${commits.toLocaleString()}</div>
                <div class="col-added positive">+${linesAdded.toLocaleString()}</div>
                <div class="col-removed negative">-${linesRemoved.toLocaleString()}</div>
                <div class="col-percentage">${percentage.toFixed(1)}%</div>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  /**
   * Generate author contributions HTML
   */
  private generateAuthorContributions(analyticsData: any): string {
    // Try both new and legacy field names
    const authorContributions =
      analyticsData.author_contributions ||
      analyticsData.authorContributions ||
      [];

    if (authorContributions.length === 0) {
      return `
        <div class="empty-state">
          <h3>👥 No Author Contributions Found</h3>
          <p>No author contribution data could be retrieved. This might indicate:</p>
          <ul>
            <li>The repository has no commits</li>
            <li>Git log parsing failed</li>
            <li>Permission issues accessing commit history</li>
          </ul>
          <button onclick="refreshAnalytics()" class="retry-btn">🔄 Retry Analysis</button>
        </div>
      `;
    }

    const authors = authorContributions.slice(0, 10); // Top 10 contributors
    const totalCommits =
      analyticsData.repository_info?.total_commits ||
      analyticsData.total_commits ||
      authors.reduce(
        (sum: number, author: any) =>
          sum + (author.total_commits || author.totalCommits || 0),
        0
      );

    let html = '<div class="authors-grid">';

    authors.forEach((author: any, index: number) => {
      // Support both new and legacy field names
      const authorName =
        author.author_name || author.authorName || `Author ${index + 1}`;
      const authorEmail = author.author_email || author.authorEmail || "";
      const commits = author.total_commits || author.totalCommits || 0;
      const linesAdded = author.lines_added || author.linesAdded || 0;
      const linesRemoved = author.lines_removed || author.linesRemoved || 0;
      const filesChanged = author.files_changed || author.filesChanged || 0;
      const firstCommit = author.first_commit || author.firstCommitDate || "";
      const lastCommit = author.last_commit || author.lastCommitDate || "";

      const contributionPercentage =
        totalCommits > 0 ? ((commits / totalCommits) * 100).toFixed(1) : "0.0";

      // Format dates
      const formatDate = (dateStr: string) => {
        if (!dateStr) {
          return "Unknown";
        }
        try {
          return new Date(dateStr).toLocaleDateString();
        } catch {
          return dateStr;
        }
      };

      // Calculate net changes
      const netChanges = linesAdded - linesRemoved;
      const netChangeClass = netChanges >= 0 ? "positive" : "negative";
      const netChangeSign = netChanges >= 0 ? "+" : "";

      html += `
        <div class="author-card">
          <div class="author-header">
            <div class="author-info">
              <div class="author-name" title="${authorEmail}">${authorName}</div>
              <div class="author-email">${authorEmail}</div>
            </div>
            <div class="contribution-percentage">${contributionPercentage}%</div>
          </div>
          
          <div class="author-metrics">
            <div class="metric">
              <span class="metric-icon">📊</span>
              <span class="metric-label">Commits</span>
              <span class="metric-value">${commits.toLocaleString()}</span>
            </div>
            <div class="metric">
              <span class="metric-icon">➕</span>
              <span class="metric-label">Lines Added</span>
              <span class="metric-value positive">+${linesAdded.toLocaleString()}</span>
            </div>
            <div class="metric">
              <span class="metric-icon">➖</span>
              <span class="metric-label">Lines Removed</span>
              <span class="metric-value negative">-${linesRemoved.toLocaleString()}</span>
            </div>
            <div class="metric">
              <span class="metric-icon">📁</span>
              <span class="metric-label">Files Changed</span>
              <span class="metric-value">${filesChanged.toLocaleString()}</span>
            </div>
            <div class="metric">
              <span class="metric-icon">📈</span>
              <span class="metric-label">Net Changes</span>
              <span class="metric-value ${netChangeClass}">${netChangeSign}${netChanges.toLocaleString()}</span>
            </div>
          </div>
          
          <div class="author-timeline">
            <div class="timeline-item">
              <span class="timeline-label">First Commit:</span>
              <span class="timeline-date">${formatDate(firstCommit)}</span>
            </div>
            <div class="timeline-item">
              <span class="timeline-label">Latest Commit:</span>
              <span class="timeline-date">${formatDate(lastCommit)}</span>
            </div>
          </div>
          
          ${
            author.modules_touched && author.modules_touched.length > 0
              ? `
            <div class="author-modules">
              <span class="modules-label">Modules Touched:</span>
              <div class="modules-list">
                ${author.modules_touched
                  .slice(0, 3)
                  .map(
                    (module: string) =>
                      `<span class="module-tag">${module}</span>`
                  )
                  .join("")}
                ${
                  author.modules_touched.length > 3
                    ? `<span class="module-tag more">+${
                        author.modules_touched.length - 3
                      } more</span>`
                    : ""
                }
              </div>
            </div>
          `
              : ""
          }
        </div>
      `;
    });

    html += "</div>";

    // Add summary statistics
    html += `
      <div class="contributors-summary">
        <h4>📊 Contribution Summary</h4>
        <div class="summary-stats">
          <div class="summary-stat">
            <span class="summary-label">Total Contributors:</span>
            <span class="summary-value">${authorContributions.length}</span>
          </div>
          <div class="summary-stat">
            <span class="summary-label">Showing Top:</span>
            <span class="summary-value">${Math.min(
              10,
              authorContributions.length
            )}</span>
          </div>
          <div class="summary-stat">
            <span class="summary-label">Total Commits:</span>
            <span class="summary-value">${totalCommits.toLocaleString()}</span>
          </div>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Generate module-wise top 5 authors section
   */
  private generateModuleWiseAuthors(analyticsData: any): string {
    const authorContributions =
      analyticsData.author_contributions ||
      analyticsData.authorContributions ||
      [];

    if (!authorContributions || authorContributions.length === 0) {
      return `
        <div class="module-authors-section">
          <h3>📁 Module-wise Top Authors</h3>
          <div class="empty-state">
            <p>No module data available</p>
          </div>
        </div>
      `;
    }

    // Build module-to-authors mapping
    const moduleAuthors: {
      [module: string]: Array<{ name: string; email: string; commits: number }>;
    } = {};

    authorContributions.forEach((author: any) => {
      const authorName = author.author_name || author.authorName || "Unknown";
      const authorEmail = author.author_email || author.authorEmail || "";
      const authorCommits = author.total_commits || author.totalCommits || 0;
      const modules = author.modules_touched || [];

      modules.forEach((module: string) => {
        if (!moduleAuthors[module]) {
          moduleAuthors[module] = [];
        }

        moduleAuthors[module].push({
          name: authorName,
          email: authorEmail,
          commits: authorCommits,
        });
      });
    });

    // Sort modules by total activity and get top modules
    const sortedModules = Object.keys(moduleAuthors)
      .map((module) => ({
        name: module,
        authors: moduleAuthors[module]
          .sort((a, b) => b.commits - a.commits)
          .slice(0, 5), // Top 5 authors per module
        totalCommits: moduleAuthors[module].reduce(
          (sum, author) => sum + author.commits,
          0
        ),
      }))
      .sort((a, b) => b.totalCommits - a.totalCommits)
      .slice(0, 10); // Show top 10 most active modules

    if (sortedModules.length === 0) {
      return `
        <div class="module-authors-section">
          <h3>📁 Module-wise Top Authors</h3>
          <div class="empty-state">
            <p>No module activity found</p>
          </div>
        </div>
      `;
    }

    const moduleCardsHtml = sortedModules
      .map((module) => {
        // Extract just the module name from the path
        const moduleName = module.name.split("/").pop() || module.name;
        return `
      <div class="module-card">
        <div class="module-header">
          <h4 class="module-name" title="${module.name}">📂 ${moduleName}</h4>
          <span class="module-commits">${module.totalCommits.toLocaleString()} commits</span>
        </div>
        <div class="module-authors">
          ${module.authors
            .map(
              (author, index) => `
            <div class="module-author">
              <div class="author-rank">#${index + 1}</div>
              <div class="author-info">
                <div class="author-name">${author.name}</div>
                <div class="author-email">${author.email}</div>
              </div>
              <div class="author-commits">${author.commits.toLocaleString()}</div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
      })
      .join("");

    return `
      <div class="module-authors-section">
        <h3>📁 Module-wise Top Authors</h3>
        <div class="module-authors-grid">
          ${moduleCardsHtml}
        </div>
      </div>
    `;
  }

  /**
   * Generate commit timeline HTML
   */
  private generateCommitTimeline(analyticsData: any): string {
    // Try both new and legacy field names
    const commitTimeline =
      analyticsData.commit_timeline || analyticsData.commitTimeline || [];

    if (commitTimeline.length === 0) {
      return `
        <div class="empty-state">
          <h3>📈 No Timeline Data Available</h3>
          <p>No commit timeline data could be retrieved. This might indicate:</p>
          <ul>
            <li>The repository has no commits</li>
            <li>Date parsing failed during analysis</li>
            <li>Timeline aggregation encountered errors</li>
          </ul>
          <button onclick="refreshAnalytics()" class="retry-btn">🔄 Retry Analysis</button>
        </div>
      `;
    }

    // Generate timeline summary
    const totalDays = commitTimeline.length;
    const totalCommits = commitTimeline.reduce(
      (sum: number, entry: any) =>
        sum + (entry.commit_count || entry.commits || 0),
      0
    );
    const totalLinesAdded = commitTimeline.reduce(
      (sum: number, entry: any) => sum + (entry.lines_added || 0),
      0
    );
    const totalLinesRemoved = commitTimeline.reduce(
      (sum: number, entry: any) => sum + (entry.lines_removed || 0),
      0
    );

    const avgCommitsPerDay =
      totalDays > 0 ? (totalCommits / totalDays).toFixed(1) : "0";

    // Find most active day
    const mostActiveDay = commitTimeline.reduce((max: any, entry: any) => {
      const commits = entry.commit_count || entry.commits || 0;
      const maxCommits = max.commit_count || max.commits || 0;
      return commits > maxCommits ? entry : max;
    }, commitTimeline[0] || {});

    return `
      <div class="timeline-container">
        <div class="timeline-header">
          <h4>📈 Commit Activity Timeline</h4>
          <div class="timeline-filters">
            <button class="timeline-filter active" onclick="filterTimeline('all')">All Time</button>
            <button class="timeline-filter" onclick="filterTimeline('week')">Last Week</button>
            <button class="timeline-filter" onclick="filterTimeline('month')">Last Month</button>
            <button class="timeline-filter" onclick="filterTimeline('quarter')">Last Quarter</button>
          </div>
        </div>
        
        <div class="timeline-summary">
          <div class="timeline-stats">
            <div class="timeline-stat">
              <span class="stat-icon">📅</span>
              <span class="stat-label">Active Days</span>
              <span class="stat-value">${totalDays}</span>
            </div>
            <div class="timeline-stat">
              <span class="stat-icon">📊</span>
              <span class="stat-label">Avg Commits/Day</span>
              <span class="stat-value">${avgCommitsPerDay}</span>
            </div>
            <div class="timeline-stat">
              <span class="stat-icon">🔥</span>
              <span class="stat-label">Most Active Day</span>
              <span class="stat-value">${
                mostActiveDay.commit_count || mostActiveDay.commits || 0
              } commits</span>
            </div>
            <div class="timeline-stat">
              <span class="stat-icon">📈</span>
              <span class="stat-label">Total Changes</span>
              <span class="stat-value">+${totalLinesAdded.toLocaleString()}/-${totalLinesRemoved.toLocaleString()}</span>
            </div>
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
    // Try both new and legacy field names
    const moduleStatistics =
      analyticsData.module_statistics || analyticsData.moduleStatistics || [];

    if (moduleStatistics.length === 0) {
      return `
        <div class="empty-state">
          <h3>📁 No Module Statistics Available</h3>
          <p>Module statistics are not available for this repository. This feature shows:</p>
          <ul>
            <li>Most active code modules/directories</li>
            <li>Contributor activity per module</li>
            <li>Change frequency by module</li>
          </ul>
          <p><em>Note: Module statistics require additional analysis and may not be available for all repositories.</em></p>
        </div>
      `;
    }

    const modules = moduleStatistics.slice(0, 12); // Top 12 modules
    let html = '<div class="module-stats-grid">';

    modules.forEach((module: any, index: number) => {
      // Support both new and legacy field names
      const modulePath =
        module.module_path || module.modulePath || `Module ${index + 1}`;
      const totalCommits = module.total_commits || module.totalCommits || 0;
      const uniqueAuthors = module.unique_authors || module.uniqueAuthors || 0;
      const totalChanges = module.total_changes || module.totalChanges || 0;
      const lastModified = module.last_modified || module.lastModified || "";

      // Format last modified date
      const formatDate = (dateStr: string) => {
        if (!dateStr) {
          return "Unknown";
        }
        try {
          return new Date(dateStr).toLocaleDateString();
        } catch {
          return dateStr;
        }
      };

      // Calculate activity level
      const getActivityLevel = (commits: number) => {
        if (commits >= 50) {
          return { level: "high", icon: "🔥", color: "#ff4444" };
        }
        if (commits >= 20) {
          return { level: "medium", icon: "📈", color: "#ffaa00" };
        }
        if (commits >= 5) {
          return { level: "low", icon: "📊", color: "#44aa44" };
        }
        return { level: "minimal", icon: "📉", color: "#888888" };
      };

      const activity = getActivityLevel(totalCommits);

      html += `
        <div class="module-stats-card">
          <div class="module-stats-header">
            <div class="module-path" title="${modulePath}">
              <span class="module-icon">📁</span>
              <span class="module-name">${modulePath}</span>
            </div>
            <div class="module-activity">
              <span class="activity-icon" style="color: ${activity.color}">${
        activity.icon
      }</span>
              <span class="activity-level">${activity.level}</span>
            </div>
          </div>
          
          <div class="module-stats-metrics">
            <div class="module-metric">
              <span class="metric-icon">📊</span>
              <div class="metric-content">
                <div class="module-metric-label">Commits</div>
                <div class="module-metric-value">${totalCommits.toLocaleString()}</div>
              </div>
            </div>
            <div class="module-metric">
              <span class="metric-icon">👥</span>
              <div class="metric-content">
                <div class="module-metric-label">Authors</div>
                <div class="module-metric-value">${uniqueAuthors}</div>
              </div>
            </div>
            <div class="module-metric">
              <span class="metric-icon">🔄</span>
              <div class="metric-content">
                <div class="module-metric-label">Changes</div>
                <div class="module-metric-value">${
                  totalChanges > 0 ? totalChanges.toLocaleString() : "N/A"
                }</div>
              </div>
            </div>
            <div class="module-metric">
              <span class="metric-icon">📅</span>
              <div class="metric-content">
                <div class="module-metric-label">Last Modified</div>
                <div class="module-metric-value">${formatDate(
                  lastModified
                )}</div>
              </div>
            </div>
          </div>
          
          <div class="module-stats-footer">
            <div class="commit-frequency">
              ${
                totalCommits > 0 && uniqueAuthors > 0
                  ? `<span class="frequency-label">Avg commits per author:</span>
                 <span class="frequency-value">${(
                   totalCommits / uniqueAuthors
                 ).toFixed(1)}</span>`
                  : '<span class="frequency-label">No activity data</span>'
              }
            </div>
          </div>
        </div>
      `;
    });

    html += "</div>";

    // Add module statistics summary
    const totalModules = moduleStatistics.length;
    const totalModuleCommits = moduleStatistics.reduce(
      (sum: number, module: any) =>
        sum + (module.total_commits || module.totalCommits || 0),
      0
    );
    const avgCommitsPerModule =
      totalModules > 0 ? (totalModuleCommits / totalModules).toFixed(1) : "0";

    html += `
      <div class="module-summary">
        <h4>📊 Module Activity Summary</h4>
        <div class="summary-stats">
          <div class="summary-stat">
            <span class="summary-label">Total Modules:</span>
            <span class="summary-value">${totalModules}</span>
          </div>
          <div class="summary-stat">
            <span class="summary-label">Showing Top:</span>
            <span class="summary-value">${Math.min(12, totalModules)}</span>
          </div>
          <div class="summary-stat">
            <span class="summary-label">Avg Commits/Module:</span>
            <span class="summary-value">${avgCommitsPerModule}</span>
          </div>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Handle messages from webview
   */
  private handleWebviewMessage(message: any): void {
    switch (message.command) {
      case "exportCharts":
        this.exportCharts(message.data);
        break;
      case "exportData":
        this.exportData(message.data);
        break;
      case "generateReport":
        this.generateReport(message.data);
        break;
      case "refreshAnalytics":
        vscode.commands.executeCommand("doracodelens.analyzeGitAnalytics");
        break;
      default:
        this.errorHandler.logError(
          "Unknown webview message",
          message,
          "GitAnalyticsWebview"
        );
    }
  }

  /**
   * Export charts as images
   */
  private async exportCharts(data: any): Promise<void> {
    try {
      // This would typically involve capturing the canvas elements
      // For now, we'll show a message that the feature is available
      vscode.window.showInformationMessage(
        "Chart export functionality will be implemented in the webview JavaScript."
      );
    } catch (error) {
      this.errorHandler.logError(
        "Failed to export charts",
        error,
        "GitAnalyticsWebview"
      );
      vscode.window.showErrorMessage("Failed to export charts");
    }
  }

  /**
   * Export analytics data
   */
  private async exportData(data: any): Promise<void> {
    try {
      const dataContent = JSON.stringify(data, null, 2);

      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file("git_analytics_data.json"),
        filters: {
          "JSON Files": ["json"],
          "All Files": ["*"],
        },
      });

      if (uri) {
        await vscode.workspace.fs.writeFile(
          uri,
          Buffer.from(dataContent, "utf8")
        );
        vscode.window.showInformationMessage(
          `Analytics data exported to ${uri.fsPath}`
        );
      }
    } catch (error) {
      this.errorHandler.logError(
        "Failed to export analytics data",
        error,
        "GitAnalyticsWebview"
      );
      vscode.window.showErrorMessage("Failed to export analytics data");
    }
  }

  /**
   * Generate comprehensive report
   */
  private async generateReport(data: any): Promise<void> {
    try {
      const report = this.generateMarkdownReport(data);

      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file("git_analytics_report.md"),
        filters: {
          "Markdown Files": ["md"],
          "All Files": ["*"],
        },
      });

      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(report, "utf8"));
        vscode.window.showInformationMessage(
          `Analytics report generated at ${uri.fsPath}`
        );
      }
    } catch (error) {
      this.errorHandler.logError(
        "Failed to generate report",
        error,
        "GitAnalyticsWebview"
      );
      vscode.window.showErrorMessage("Failed to generate report");
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
    report += `- **Repository:** ${repoInfo.repository_name || "Unknown"}\n`;
    report += `- **Total Commits:** ${repoInfo.total_commits || 0}\n`;
    report += `- **Contributors:** ${repoInfo.contributors || 0}\n`;
    report += `- **Active Period:** ${
      repoInfo.first_commit_date || "Unknown"
    } - ${repoInfo.last_commit_date || "Unknown"}\n`;
    report += `- **Total Files:** ${repoInfo.total_files || 0}\n\n`;

    // Top Contributors
    if (authors.length > 0) {
      report += `## Top Contributors\n\n`;
      authors.slice(0, 10).forEach((author: any, index: number) => {
        const percentage = (
          (author.totalCommits / repoInfo.total_commits) *
          100
        ).toFixed(1);
        report += `${index + 1}. **${author.authorName}** (${
          author.authorEmail
        })\n`;
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
        report += `   - Last Modified: ${module.lastModified || "Unknown"}\n\n`;
      });
    }

    return report;
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
