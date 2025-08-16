/**
 * Git Analytics Chart.js Integration
 * Provides interactive charts for Git analytics visualization
 */

class GitAnalyticsCharts {
    constructor() {
        this.charts = new Map();
        this.chartColors = {
            primary: '#007ACC',
            secondary: '#1E1E1E',
            success: '#28A745',
            warning: '#FFC107',
            danger: '#DC3545',
            info: '#17A2B8',
            light: '#F8F9FA',
            dark: '#343A40'
        };
        
        // VS Code theme colors (will be updated dynamically)
        this.themeColors = {
            foreground: '#CCCCCC',
            background: '#1E1E1E',
            border: '#3C3C3C',
            accent: '#007ACC'
        };
        
        this.updateThemeColors();
    }
    
    /**
     * Update theme colors based on VS Code theme
     */
    updateThemeColors() {
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);
        
        this.themeColors = {
            foreground: computedStyle.getPropertyValue('--vscode-foreground') || '#CCCCCC',
            background: computedStyle.getPropertyValue('--vscode-editor-background') || '#1E1E1E',
            border: computedStyle.getPropertyValue('--vscode-widget-border') || '#3C3C3C',
            accent: computedStyle.getPropertyValue('--vscode-focusBorder') || '#007ACC',
            blue: computedStyle.getPropertyValue('--vscode-charts-blue') || '#007ACC',
            green: computedStyle.getPropertyValue('--vscode-charts-green') || '#28A745',
            orange: computedStyle.getPropertyValue('--vscode-charts-orange') || '#FFC107',
            red: computedStyle.getPropertyValue('--vscode-charts-red') || '#DC3545',
            purple: computedStyle.getPropertyValue('--vscode-charts-purple') || '#6F42C1'
        };
    }
    
    /**
     * Create author contribution pie chart
     */
    createAuthorContributionChart(canvasId, gitData) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !gitData.authorContributions) return null;
        
        const ctx = canvas.getContext('2d');
        
        // Prepare data
        const authors = gitData.authorContributions.slice(0, 10); // Top 10 contributors
        const labels = authors.map(author => author.authorName);
        const data = authors.map(author => author.contributionPercentage);
        const colors = this.generateColors(authors.length);
        
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: this.themeColors.border,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Author Contributions (%)',
                        color: this.themeColors.foreground,
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: this.themeColors.foreground,
                            font: {
                                size: 11
                            },
                            padding: 10,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: this.themeColors.background,
                        titleColor: this.themeColors.foreground,
                        bodyColor: this.themeColors.foreground,
                        borderColor: this.themeColors.border,
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const author = authors[context.dataIndex];
                                return [
                                    `${context.label}: ${context.parsed.toFixed(1)}%`,
                                    `Commits: ${author.totalCommits}`,
                                    `Lines: +${author.linesAdded}/-${author.linesRemoved}`
                                ];
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false
                }
            }
        });
        
        this.charts.set(canvasId, chart);
        return chart;
    }
    
    /**
     * Create commit timeline chart
     */
    createCommitTimelineChart(canvasId, gitData) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !gitData.commitTimeline) return null;
        
        const ctx = canvas.getContext('2d');
        
        // Prepare timeline data
        const timelineData = gitData.commitTimeline.slice(-30); // Last 30 entries
        const labels = timelineData.map(entry => new Date(entry.date).toLocaleDateString());
        const commits = timelineData.map(entry => entry.commits);
        const authors = timelineData.map(entry => entry.authors.length);
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Commits',
                        data: commits,
                        borderColor: this.themeColors.blue,
                        backgroundColor: this.themeColors.blue + '20',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    },
                    {
                        label: 'Active Authors',
                        data: authors,
                        borderColor: this.themeColors.green,
                        backgroundColor: this.themeColors.green + '20',
                        fill: false,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 5,
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
                        text: 'Commit Activity Timeline',
                        color: this.themeColors.foreground,
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        labels: {
                            color: this.themeColors.foreground,
                            font: {
                                size: 11
                            },
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: this.themeColors.background,
                        titleColor: this.themeColors.foreground,
                        bodyColor: this.themeColors.foreground,
                        borderColor: this.themeColors.border,
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: this.themeColors.foreground,
                            maxTicksLimit: 10
                        },
                        grid: {
                            color: this.themeColors.border + '40'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        ticks: {
                            color: this.themeColors.foreground
                        },
                        grid: {
                            color: this.themeColors.border + '40'
                        },
                        title: {
                            display: true,
                            text: 'Commits',
                            color: this.themeColors.foreground
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        ticks: {
                            color: this.themeColors.foreground
                        },
                        grid: {
                            drawOnChartArea: false
                        },
                        title: {
                            display: true,
                            text: 'Authors',
                            color: this.themeColors.foreground
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
        
        this.charts.set(canvasId, chart);
        return chart;
    }
    
    /**
     * Create module activity heatmap
     */
    createModuleActivityChart(canvasId, gitData) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !gitData.moduleStatistics) return null;
        
        const ctx = canvas.getContext('2d');
        
        // Prepare module data
        const modules = gitData.moduleStatistics.slice(0, 15); // Top 15 modules
        const labels = modules.map(module => {
            const parts = module.modulePath.split('/');
            return parts[parts.length - 1] || module.modulePath;
        });
        const commits = modules.map(module => module.totalCommits);
        const authors = modules.map(module => module.uniqueAuthors);
        
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Commits',
                        data: commits,
                        backgroundColor: this.themeColors.blue + '80',
                        borderColor: this.themeColors.blue,
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Contributors',
                        data: authors,
                        backgroundColor: this.themeColors.orange + '80',
                        borderColor: this.themeColors.orange,
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
                        text: 'Module Activity',
                        color: this.themeColors.foreground,
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        labels: {
                            color: this.themeColors.foreground,
                            font: {
                                size: 11
                            },
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: this.themeColors.background,
                        titleColor: this.themeColors.foreground,
                        bodyColor: this.themeColors.foreground,
                        borderColor: this.themeColors.border,
                        borderWidth: 1,
                        callbacks: {
                            afterLabel: function(context) {
                                const module = modules[context.dataIndex];
                                return [
                                    `Path: ${module.modulePath}`,
                                    `Lines: +${module.linesAdded}/-${module.linesRemoved}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: this.themeColors.foreground,
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            color: this.themeColors.border + '40'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        ticks: {
                            color: this.themeColors.foreground
                        },
                        grid: {
                            color: this.themeColors.border + '40'
                        },
                        title: {
                            display: true,
                            text: 'Commits',
                            color: this.themeColors.foreground
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        ticks: {
                            color: this.themeColors.foreground
                        },
                        grid: {
                            drawOnChartArea: false
                        },
                        title: {
                            display: true,
                            text: 'Contributors',
                            color: this.themeColors.foreground
                        }
                    }
                }
            }
        });
        
        this.charts.set(canvasId, chart);
        return chart;
    }
    
    /**
     * Create lines of code trend chart
     */
    createLinesOfCodeChart(canvasId, gitData) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !gitData.authorContributions) return null;
        
        const ctx = canvas.getContext('2d');
        
        // Prepare data for top contributors
        const authors = gitData.authorContributions.slice(0, 8);
        const labels = authors.map(author => author.authorName);
        const linesAdded = authors.map(author => author.linesAdded);
        const linesRemoved = authors.map(author => author.linesRemoved);
        
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Lines Added',
                        data: linesAdded,
                        backgroundColor: this.themeColors.green + '80',
                        borderColor: this.themeColors.green,
                        borderWidth: 1
                    },
                    {
                        label: 'Lines Removed',
                        data: linesRemoved.map(val => -val), // Negative for visual effect
                        backgroundColor: this.themeColors.red + '80',
                        borderColor: this.themeColors.red,
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
                        text: 'Lines of Code by Author',
                        color: this.themeColors.foreground,
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        labels: {
                            color: this.themeColors.foreground,
                            font: {
                                size: 11
                            },
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: this.themeColors.background,
                        titleColor: this.themeColors.foreground,
                        bodyColor: this.themeColors.foreground,
                        borderColor: this.themeColors.border,
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const value = Math.abs(context.parsed.y);
                                return `${context.dataset.label}: ${value.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: this.themeColors.foreground,
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            color: this.themeColors.border + '40'
                        }
                    },
                    y: {
                        ticks: {
                            color: this.themeColors.foreground,
                            callback: function(value) {
                                return Math.abs(value).toLocaleString();
                            }
                        },
                        grid: {
                            color: this.themeColors.border + '40'
                        },
                        title: {
                            display: true,
                            text: 'Lines of Code',
                            color: this.themeColors.foreground
                        }
                    }
                }
            }
        });
        
        this.charts.set(canvasId, chart);
        return chart;
    }
    
    /**
     * Generate colors for charts
     */
    generateColors(count) {
        const baseColors = [
            this.themeColors.blue,
            this.themeColors.green,
            this.themeColors.orange,
            this.themeColors.red,
            this.themeColors.purple,
            '#17A2B8',
            '#6C757D',
            '#E83E8C',
            '#20C997',
            '#FD7E14'
        ];
        
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(baseColors[i % baseColors.length]);
        }
        
        return colors;
    }
    
    /**
     * Export chart as image
     */
    exportChart(chartId, filename = 'chart.png') {
        const chart = this.charts.get(chartId);
        if (!chart) return;
        
        const url = chart.toBase64Image();
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
    }
    
    /**
     * Update all charts when theme changes
     */
    updateChartsTheme() {
        this.updateThemeColors();
        
        this.charts.forEach((chart, id) => {
            // Update chart colors
            chart.options.plugins.title.color = this.themeColors.foreground;
            chart.options.plugins.legend.labels.color = this.themeColors.foreground;
            chart.options.plugins.tooltip.backgroundColor = this.themeColors.background;
            chart.options.plugins.tooltip.titleColor = this.themeColors.foreground;
            chart.options.plugins.tooltip.bodyColor = this.themeColors.foreground;
            chart.options.plugins.tooltip.borderColor = this.themeColors.border;
            
            // Update scales colors
            if (chart.options.scales) {
                Object.keys(chart.options.scales).forEach(scaleKey => {
                    const scale = chart.options.scales[scaleKey];
                    if (scale.ticks) scale.ticks.color = this.themeColors.foreground;
                    if (scale.grid) scale.grid.color = this.themeColors.border + '40';
                    if (scale.title) scale.title.color = this.themeColors.foreground;
                });
            }
            
            chart.update();
        });
    }
    
    /**
     * Destroy all charts
     */
    destroyAllCharts() {
        this.charts.forEach(chart => {
            chart.destroy();
        });
        this.charts.clear();
    }
    
    /**
     * Destroy specific chart
     */
    destroyChart(chartId) {
        const chart = this.charts.get(chartId);
        if (chart) {
            chart.destroy();
            this.charts.delete(chartId);
        }
    }
    
    /**
     * Filter chart data based on date range
     */
    filterChartByDateRange(chartId, startDate, endDate) {
        const chart = this.charts.get(chartId);
        if (!chart) return;
        
        // Implementation would depend on the specific chart type and data structure
        // This is a placeholder for the filtering functionality
        console.log(`Filtering chart ${chartId} from ${startDate} to ${endDate}`);
    }
    
    /**
     * Toggle chart dataset visibility
     */
    toggleDataset(chartId, datasetIndex) {
        const chart = this.charts.get(chartId);
        if (!chart) return;
        
        const meta = chart.getDatasetMeta(datasetIndex);
        meta.hidden = !meta.hidden;
        chart.update();
    }
}

// Export for use in webview
if (typeof window !== 'undefined') {
    window.GitAnalyticsCharts = GitAnalyticsCharts;
}