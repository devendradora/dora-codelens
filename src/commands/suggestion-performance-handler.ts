import * as vscode from 'vscode';
import { ErrorHandler } from '../core/error-handler';
import { SuggestionPerformanceOptimizer } from '../services/suggestion-performance-optimizer';

/**
 * Suggestion Performance Handler
 * Handles commands related to suggestion performance and optimization
 */
export class SuggestionPerformanceHandler {
    private errorHandler: ErrorHandler;
    private performanceOptimizer: SuggestionPerformanceOptimizer;

    constructor(errorHandler: ErrorHandler) {
        this.errorHandler = errorHandler;
        this.performanceOptimizer = SuggestionPerformanceOptimizer.getInstance(errorHandler);
    }

    /**
     * Register performance-related commands
     */
    public registerCommands(context: vscode.ExtensionContext): void {
        // Command to show performance information
        const showPerformanceInfoCommand = vscode.commands.registerCommand(
            'doracodelens.showPerformanceInfo',
            () => this.showPerformanceInfo()
        );

        // Command to show performance metrics
        const showPerformanceMetricsCommand = vscode.commands.registerCommand(
            'doracodelens.showPerformanceMetrics',
            () => this.showPerformanceMetrics()
        );

        // Command to clear performance cache
        const clearPerformanceCacheCommand = vscode.commands.registerCommand(
            'doracodelens.clearPerformanceCache',
            () => this.clearPerformanceCache()
        );

        // Command to configure performance settings
        const configurePerformanceCommand = vscode.commands.registerCommand(
            'doracodelens.configurePerformance',
            () => this.configurePerformance()
        );

        context.subscriptions.push(
            showPerformanceInfoCommand,
            showPerformanceMetricsCommand,
            clearPerformanceCacheCommand,
            configurePerformanceCommand
        );

        this.errorHandler.logError(
            'Suggestion performance commands registered',
            null,
            'SuggestionPerformanceHandler'
        );
    }

    /**
     * Show performance information dialog
     */
    private async showPerformanceInfo(): Promise<void> {
        const config = this.performanceOptimizer.getConfig();
        const metrics = this.performanceOptimizer.getMetrics();

        const message = `
**DoraCodeLens Performance Information**

**Current Limits:**
- Max file size: ${config.maxFileSizeKB}KB
- Max functions per file: ${config.maxFunctionsPerFile}
- Cache enabled: ${config.enableCaching ? 'Yes' : 'No'}
- Throttling enabled: ${config.enableThrottling ? 'Yes' : 'No'}

**Performance Metrics:**
- Cache hits: ${metrics.cacheHits}
- Cache misses: ${metrics.cacheMisses}
- Large files skipped: ${metrics.largeFileSkips}
- Average processing time: ${metrics.averageProcessingTime.toFixed(2)}ms

Files that exceed these limits will show reduced functionality to maintain editor performance.
        `.trim();

        const action = await vscode.window.showInformationMessage(
            'Performance limits help maintain editor responsiveness',
            { modal: true, detail: message },
            'Configure Settings',
            'View Metrics',
            'Clear Cache'
        );

        switch (action) {
            case 'Configure Settings':
                await this.configurePerformance();
                break;
            case 'View Metrics':
                await this.showPerformanceMetrics();
                break;
            case 'Clear Cache':
                await this.clearPerformanceCache();
                break;
        }
    }

    /**
     * Show detailed performance metrics
     */
    private async showPerformanceMetrics(): Promise<void> {
        const metrics = this.performanceOptimizer.getMetrics();
        const config = this.performanceOptimizer.getConfig();

        const panel = vscode.window.createWebviewPanel(
            'performanceMetrics',
            'DoraCodeLens Performance Metrics',
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        panel.webview.html = this.getPerformanceMetricsHtml(metrics, config);
    }

    /**
     * Generate performance metrics HTML
     */
    private getPerformanceMetricsHtml(metrics: any, config: any): string {
        const cacheHitRate = metrics.totalRequests > 0 
            ? ((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100).toFixed(1)
            : '0';

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Performance Metrics</title>
            <style>
                body { 
                    font-family: var(--vscode-font-family); 
                    padding: 20px; 
                    color: var(--vscode-foreground);
                }
                .metric-card {
                    background: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 8px;
                    padding: 16px;
                    margin: 16px 0;
                }
                .metric-title {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 12px;
                    color: var(--vscode-textLink-foreground);
                }
                .metric-value {
                    font-size: 24px;
                    font-weight: bold;
                    color: var(--vscode-textPreformat-foreground);
                }
                .metric-description {
                    font-size: 14px;
                    color: var(--vscode-descriptionForeground);
                    margin-top: 4px;
                }
                .config-section {
                    background: var(--vscode-textBlockQuote-background);
                    border-left: 4px solid var(--vscode-textLink-foreground);
                    padding: 16px;
                    margin: 20px 0;
                }
                .grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 16px;
                }
            </style>
        </head>
        <body>
            <h1>DoraCodeLens Performance Metrics</h1>
            
            <div class="grid">
                <div class="metric-card">
                    <div class="metric-title">Cache Hit Rate</div>
                    <div class="metric-value">${cacheHitRate}%</div>
                    <div class="metric-description">
                        ${metrics.cacheHits} hits / ${metrics.cacheHits + metrics.cacheMisses} total requests
                    </div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-title">Average Processing Time</div>
                    <div class="metric-value">${metrics.averageProcessingTime.toFixed(2)}ms</div>
                    <div class="metric-description">
                        Based on ${metrics.totalRequests} processed requests
                    </div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-title">Throttled Requests</div>
                    <div class="metric-value">${metrics.throttledRequests}</div>
                    <div class="metric-description">
                        Requests delayed to prevent system overload
                    </div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-title">Large Files Skipped</div>
                    <div class="metric-value">${metrics.largeFileSkips}</div>
                    <div class="metric-description">
                        Files exceeding size or complexity limits
                    </div>
                </div>
            </div>
            
            <div class="config-section">
                <h2>Current Configuration</h2>
                <ul>
                    <li><strong>Caching:</strong> ${config.enableCaching ? 'Enabled' : 'Disabled'}</li>
                    <li><strong>Cache TTL:</strong> ${config.cacheTTLMs / 1000}s</li>
                    <li><strong>Throttling:</strong> ${config.enableThrottling ? 'Enabled' : 'Disabled'}</li>
                    <li><strong>Throttle Delay:</strong> ${config.throttleDelayMs}ms</li>
                    <li><strong>Max File Size:</strong> ${config.maxFileSizeKB}KB</li>
                    <li><strong>Max Functions:</strong> ${config.maxFunctionsPerFile}</li>
                    <li><strong>Batch Size:</strong> ${config.batchSize}</li>
                </ul>
            </div>
            
            <div class="config-section">
                <h2>Performance Tips</h2>
                <ul>
                    <li>Enable caching to improve response times for frequently accessed files</li>
                    <li>Increase throttle delay if experiencing performance issues</li>
                    <li>Reduce max file size limits for very large codebases</li>
                    <li>Use batch processing for files with many functions</li>
                </ul>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Clear performance cache
     */
    private async clearPerformanceCache(): Promise<void> {
        this.performanceOptimizer.clearCache();
        this.performanceOptimizer.resetMetrics();
        
        vscode.window.showInformationMessage(
            'Performance cache cleared and metrics reset'
        );

        this.errorHandler.logError(
            'Performance cache cleared via command',
            null,
            'SuggestionPerformanceHandler'
        );
    }

    /**
     * Configure performance settings
     */
    private async configurePerformance(): Promise<void> {
        const config = this.performanceOptimizer.getConfig();

        const options = [
            {
                label: 'Enable/Disable Caching',
                description: `Currently: ${config.enableCaching ? 'Enabled' : 'Disabled'}`,
                action: 'toggleCaching'
            },
            {
                label: 'Enable/Disable Throttling',
                description: `Currently: ${config.enableThrottling ? 'Enabled' : 'Disabled'}`,
                action: 'toggleThrottling'
            },
            {
                label: 'Adjust File Size Limit',
                description: `Currently: ${config.maxFileSizeKB}KB`,
                action: 'adjustFileSize'
            },
            {
                label: 'Adjust Function Limit',
                description: `Currently: ${config.maxFunctionsPerFile} functions`,
                action: 'adjustFunctionLimit'
            },
            {
                label: 'Open Settings',
                description: 'Open VS Code settings for detailed configuration',
                action: 'openSettings'
            }
        ];

        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: 'Select performance setting to configure'
        });

        if (!selected) return;

        switch (selected.action) {
            case 'toggleCaching':
                await this.toggleCaching();
                break;
            case 'toggleThrottling':
                await this.toggleThrottling();
                break;
            case 'adjustFileSize':
                await this.adjustFileSize();
                break;
            case 'adjustFunctionLimit':
                await this.adjustFunctionLimit();
                break;
            case 'openSettings':
                await vscode.commands.executeCommand('workbench.action.openSettings', 'doracodelens.performance');
                break;
        }
    }

    /**
     * Toggle caching setting
     */
    private async toggleCaching(): Promise<void> {
        const config = vscode.workspace.getConfiguration('doracodelens.performance');
        const currentValue = config.get('enableCaching', true);
        
        await config.update('enableCaching', !currentValue, vscode.ConfigurationTarget.Global);
        
        vscode.window.showInformationMessage(
            `Caching ${!currentValue ? 'enabled' : 'disabled'}`
        );
    }

    /**
     * Toggle throttling setting
     */
    private async toggleThrottling(): Promise<void> {
        const config = vscode.workspace.getConfiguration('doracodelens.performance');
        const currentValue = config.get('enableThrottling', true);
        
        await config.update('enableThrottling', !currentValue, vscode.ConfigurationTarget.Global);
        
        vscode.window.showInformationMessage(
            `Throttling ${!currentValue ? 'enabled' : 'disabled'}`
        );
    }

    /**
     * Adjust file size limit
     */
    private async adjustFileSize(): Promise<void> {
        const config = vscode.workspace.getConfiguration('doracodelens.performance');
        const currentValue = config.get('maxFileSizeKB', 500);
        
        const input = await vscode.window.showInputBox({
            prompt: 'Enter maximum file size in KB',
            value: currentValue.toString(),
            validateInput: (value) => {
                const num = parseInt(value);
                if (isNaN(num) || num < 1) {
                    return 'Please enter a valid number greater than 0';
                }
                return null;
            }
        });

        if (input) {
            const newValue = parseInt(input);
            await config.update('maxFileSizeKB', newValue, vscode.ConfigurationTarget.Global);
            
            vscode.window.showInformationMessage(
                `File size limit set to ${newValue}KB`
            );
        }
    }

    /**
     * Adjust function limit
     */
    private async adjustFunctionLimit(): Promise<void> {
        const config = vscode.workspace.getConfiguration('doracodelens.performance');
        const currentValue = config.get('maxFunctionsPerFile', 100);
        
        const input = await vscode.window.showInputBox({
            prompt: 'Enter maximum functions per file',
            value: currentValue.toString(),
            validateInput: (value) => {
                const num = parseInt(value);
                if (isNaN(num) || num < 1) {
                    return 'Please enter a valid number greater than 0';
                }
                return null;
            }
        });

        if (input) {
            const newValue = parseInt(input);
            await config.update('maxFunctionsPerFile', newValue, vscode.ConfigurationTarget.Global);
            
            vscode.window.showInformationMessage(
                `Function limit set to ${newValue} functions per file`
            );
        }
    }
}