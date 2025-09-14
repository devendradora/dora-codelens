/**
 * Git Analytics Charts for DoraCodeLens
 * 
 * This module provides Chart.js-based visualizations for Git analytics data
 * including author contributions, commit timelines, and module activity charts.
 */

class GitAnalyticsCharts {
    constructor() {
        this.charts = new Map();
        this.colorPalette = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
        ];
    }

    /**
     * Destroy all charts to prevent memory leaks
     */
    destroyAllCharts() {
        this.charts.forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts.clear();
    }

    /**
     * Create author contributions chart
     */
    createAuthorContributionsChart(canvasId, gitData) {
        try {
            const canvas = document.getElementById(canvasId);
            if (!canvas) {
                console.warn(`Canvas element ${canvasId} not found`);
                return null;
            }

            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart if it exists
            if (this.charts.has(canvasId)) {
                this.charts.get(canvasId).destroy();
            }

            const authors = gitData.authorContributions || [];
            const labels = authors.map(author => author.authorName);
            const commitData = authors.map(author => author.totalCommits);

            const chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Total Commits',
                        data: commitData,
                        backgroundColor: this.colorPalette[0],
                        borderColor: this.colorPalette[0],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Author Contributions'
                        },
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Commits'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Authors'
                            }
                        }
                    }
                }
            });

            this.charts.set(canvasId, chart);
            return chart;
        } catch (error) {
            console.error('Error creating author contributions chart:', error);
            return null;
        }
    }

    /**
     * Create commit timeline chart
     */
    createCommitTimelineChart(canvasId, gitData) {
        try {
            const canvas = document.getElementById(canvasId);
            if (!canvas) {
                console.warn(`Canvas element ${canvasId} not found`);
                return null;
            }

            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart if it exists
            if (this.charts.has(canvasId)) {
                this.charts.get(canvasId).destroy();
            }

            // Support both new and legacy field names
            const timeline = gitData.commit_timeline || gitData.commitTimeline || [];
            
            if (timeline.length === 0) {
                console.warn('No timeline data available for chart');
                return null;
            }
            
            const labels = timeline.map(entry => {
                const date = new Date(entry.date);
                return date.toLocaleDateString();
            });
            
            // Support both field name variations
            const commitData = timeline.map(entry => entry.commit_count || entry.commits || 0);

            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Commits per Day',
                        data: commitData,
                        backgroundColor: this.colorPalette[1],
                        borderColor: this.colorPalette[1],
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Commit Timeline'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Commits'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        }
                    }
                }
            });

            this.charts.set(canvasId, chart);
            return chart;
        } catch (error) {
            console.error('Error creating commit timeline chart:', error);
            return null;
        }
    }

    /**
     * Create lines of code chart
     */
    createLinesOfCodeChart(canvasId, gitData) {
        try {
            const canvas = document.getElementById(canvasId);
            if (!canvas) {
                console.warn(`Canvas element ${canvasId} not found`);
                return null;
            }

            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart if it exists
            if (this.charts.has(canvasId)) {
                this.charts.get(canvasId).destroy();
            }

            const authors = gitData.authorContributions || [];
            const labels = authors.map(author => author.authorName);
            const linesAddedData = authors.map(author => author.linesAdded);
            const linesRemovedData = authors.map(author => author.linesRemoved);

            const chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Lines Added',
                            data: linesAddedData,
                            backgroundColor: this.colorPalette[2],
                            borderColor: this.colorPalette[2],
                            borderWidth: 1
                        },
                        {
                            label: 'Lines Removed',
                            data: linesRemovedData,
                            backgroundColor: this.colorPalette[3],
                            borderColor: this.colorPalette[3],
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Lines of Code by Author'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Lines of Code'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Authors'
                            }
                        }
                    }
                }
            });

            this.charts.set(canvasId, chart);
            return chart;
        } catch (error) {
            console.error('Error creating lines of code chart:', error);
            return null;
        }
    }

    /**
     * Create module activity chart
     */
    createModuleActivityChart(canvasId, gitData) {
        try {
            const canvas = document.getElementById(canvasId);
            if (!canvas) {
                console.warn(`Canvas element ${canvasId} not found`);
                return null;
            }

            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart if it exists
            if (this.charts.has(canvasId)) {
                this.charts.get(canvasId).destroy();
            }

            const moduleStats = gitData.moduleStatistics || [];
            
            // Sort by total commits and take top 10
            const sortedModules = moduleStats
                .sort((a, b) => b.totalCommits - a.totalCommits)
                .slice(0, 10);

            const labels = sortedModules.map(module => {
                // Shorten long module paths for better display
                const path = module.modulePath;
                return path.length > 20 ? '...' + path.slice(-17) : path;
            });
            const commitData = sortedModules.map(module => module.totalCommits);
            const authorData = sortedModules.map(module => module.uniqueAuthors);

            const chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Total Commits',
                            data: commitData,
                            backgroundColor: this.colorPalette[4],
                            borderColor: this.colorPalette[4],
                            borderWidth: 1,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Unique Authors',
                            data: authorData,
                            backgroundColor: this.colorPalette[5],
                            borderColor: this.colorPalette[5],
                            borderWidth: 1,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Module Activity (Top 10)'
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Commits'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Authors'
                            },
                            grid: {
                                drawOnChartArea: false,
                            },
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Modules'
                            }
                        }
                    }
                }
            });

            this.charts.set(canvasId, chart);
            return chart;
        } catch (error) {
            console.error('Error creating module activity chart:', error);
            return null;
        }
    }

    /**
     * Create contribution graphs from the Git analytics data
     */
    createContributionGraphs(gitData) {
        const graphs = [];

        // Create author contributions chart
        const authorChart = this.createAuthorContributionsChart('authorContributionsChart', gitData);
        if (authorChart) {
            graphs.push({ id: 'authorContributionsChart', chart: authorChart });
        }

        // Create commit timeline chart
        const timelineChart = this.createCommitTimelineChart('commitTimelineChart', gitData);
        if (timelineChart) {
            graphs.push({ id: 'commitTimelineChart', chart: timelineChart });
        }

        // Create lines of code chart
        const linesChart = this.createLinesOfCodeChart('linesOfCodeChart', gitData);
        if (linesChart) {
            graphs.push({ id: 'linesOfCodeChart', chart: linesChart });
        }

        // Create module activity chart
        const moduleChart = this.createModuleActivityChart('moduleActivityChart', gitData);
        if (moduleChart) {
            graphs.push({ id: 'moduleActivityChart', chart: moduleChart });
        }

        return graphs;
    }

    /**
     * Export chart as image
     */
    exportChart(chartId, filename) {
        try {
            const chart = this.charts.get(chartId);
            if (!chart) {
                console.warn(`Chart ${chartId} not found for export`);
                return null;
            }

            const canvas = chart.canvas;
            const url = canvas.toDataURL('image/png');
            
            // Create download link
            const link = document.createElement('a');
            link.download = filename || `${chartId}.png`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            return url;
        } catch (error) {
            console.error('Error exporting chart:', error);
            return null;
        }
    }

    /**
     * Update chart data
     */
    updateChart(chartId, newData) {
        try {
            const chart = this.charts.get(chartId);
            if (!chart) {
                console.warn(`Chart ${chartId} not found for update`);
                return false;
            }

            chart.data = newData;
            chart.update();
            return true;
        } catch (error) {
            console.error('Error updating chart:', error);
            return false;
        }
    }

    /**
     * Get chart instance
     */
    getChart(chartId) {
        return this.charts.get(chartId);
    }

    /**
     * Check if Chart.js is available
     */
    static isAvailable() {
        return typeof Chart !== 'undefined';
    }
}

// Make GitAnalyticsCharts available globally
window.GitAnalyticsCharts = GitAnalyticsCharts;