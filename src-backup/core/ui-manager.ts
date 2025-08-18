import * as vscode from 'vscode';
import * as path from 'path';
import { WebviewAnalysisData } from '../core/webview-utils';
import { SidebarProvider, DoraCodeBirdTreeItem, AnalysisData } from '../sidebar-provider';
import { ComplexityCodeLensProvider, FunctionComplexityData } from '../codelens-provider';
import { JsonUtilities } from '../json-utilities';
import { AnalysisResult } from '../analyzer-runner';

/**
 * Webview configuration interface
 */
export interface WebviewConfig {
    viewType: string;
    title: string;
    showOptions: vscode.ViewColumn;
    options: vscode.WebviewPanelOptions & vscode.WebviewOptions;
}

/**
 * UI state interface
 */
export interface UIState {
    activeWebviews: string[];
    statusBarVisible: boolean;
    lastViewType: string | null;
}

/**
 * UI Manager class responsible for managing all UI components including webviews, modals, and status bar
 */
export class UIManager {
    private activeWebviews: Map<string, vscode.WebviewPanel> = new Map();
    private statusBarItem!: vscode.StatusBarItem;
    private tabbedWebviewProvider: any; // TabbedWebviewProvider
    private sidebarProvider: SidebarProvider;
    private codeLensProvider: ComplexityCodeLensProvider;
    private jsonUtilities: JsonUtilities;
    private outputChannel: vscode.OutputChannel;

    constructor(
        private context: vscode.ExtensionContext,
        outputChannel: vscode.OutputChannel,
        sidebarProvider: SidebarProvider,
        codeLensProvider: ComplexityCodeLensProvider,
        tabbedWebviewProvider: any, // TabbedWebviewProvider
        jsonUtilities: JsonUtilities
    ) {
        this.outputChannel = outputChannel;
        this.sidebarProvider = sidebarProvider;
        this.codeLensProvider = codeLensProvider;
        this.tabbedWebviewProvider = tabbedWebviewProvider;
        this.jsonUtilities = jsonUtilities;
        this.initializeStatusBar();
    }

    /**
     * Initialize the status bar item
     */
    private initializeStatusBar(): void {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'doracodebird.analyzeProject';
        this.statusBarItem.text = '$(graph) DoraCodeBirdView';
        this.statusBarItem.tooltip = 'Click to analyze Python project';
        this.statusBarItem.show();
        
        // Add to context subscriptions for cleanup
        this.context.subscriptions.push(this.statusBarItem);
    }

    /**
     * Update status bar text and tooltip
     */
    public updateStatusBar(text: string, tooltip?: string): void {
        this.statusBarItem.text = text;
        if (tooltip) {
            this.statusBarItem.tooltip = tooltip;
        }
    }

    /**
     * Get the status bar item for other managers
     */
    public getStatusBarItem(): vscode.StatusBarItem {
        return this.statusBarItem;
    }

    /**
     * Show full code analysis using dedicated view system
     */
    public async showFullCodeAnalysis(result?: AnalysisResult): Promise<void> {
        this.log('Showing full code analysis...');

        try {
            await this.tabbedWebviewProvider.showDedicatedAnalysisView('fullCode', result);
            this.updateStatusBar('$(graph) Full Code Analysis', 'Full code analysis view active');
        } catch (error) {
            this.logError('Failed to show full code analysis', error);
            vscode.window.showErrorMessage('Failed to display full code analysis. Please try again.');
        }
    }

    /**
     * Show current file analysis using dedicated view system
     */
    public async showCurrentFileAnalysis(analysisData: any): Promise<void> {
        this.log('Showing current file analysis...');

        try {
            await this.tabbedWebviewProvider.showDedicatedAnalysisView('currentFile', analysisData);
            this.updateStatusBar('$(file-code) Current File Analysis', 'Current file analysis view active');
        } catch (error) {
            this.logError('Failed to show current file analysis', error);
            vscode.window.showErrorMessage('Failed to display current file analysis. Please try again.');
        }
    }

    /**
     * Show git analytics using dedicated view system
     */
    public async showGitAnalytics(analysisData: any): Promise<void> {
        this.log('Showing git analytics...');

        try {
            await this.tabbedWebviewProvider.showDedicatedAnalysisView('gitAnalytics', analysisData);
            this.updateStatusBar('$(git-branch) Git Analytics', 'Git analytics view active');
        } catch (error) {
            this.logError('Failed to show git analytics', error);
            vscode.window.showErrorMessage('Failed to display git analytics. Please try again.');
        }
    }

    /**
     * Show call hierarchy analysis
     */
    public async showCallHierarchy(analysisData: any): Promise<void> {
        this.log('Showing call hierarchy...');

        try {
            // Show call hierarchy using the current file analysis view
            await this.tabbedWebviewProvider.showDedicatedAnalysisView('currentFile', analysisData);
            this.updateStatusBar('$(call-hierarchy) Call Hierarchy', 'Call hierarchy view active');
        } catch (error) {
            this.logError('Failed to show call hierarchy', error);
            vscode.window.showErrorMessage('Failed to display call hierarchy. Please try again.');
        }
    }

    /**
     * Show module graph visualization (legacy support)
     */
    public async showModuleGraph(result?: AnalysisResult): Promise<void> {
        this.log('Showing module graph...');

        try {
            // Convert analysis result to webview format
            const webviewData = this.convertAnalysisDataForWebview(result);

            // Validate webview data
            if (!webviewData.modules || !webviewData.modules.nodes || webviewData.modules.nodes.length === 0) {
                vscode.window.showWarningMessage(
                    'No module data available for visualization. The analysis may not have found any modules.',
                    'Re-run Analysis',
                    'Check Output'
                ).then(action => {
                    if (action === 'Check Output') {
                        this.outputChannel.show();
                    }
                });
                return;
            }

            // Show the module graph in tabbed view
            this.tabbedWebviewProvider.showModuleGraph(webviewData);

            this.log('Module graph webview displayed successfully');
        } catch (error) {
            this.logError('Failed to show module graph', error);
            vscode.window.showErrorMessage(
                'Failed to show module graph. This might be due to data format issues or webview problems.',
                'Check Output'
            ).then(action => {
                if (action === 'Check Output') {
                    this.outputChannel.show();
                }
            });
        }
    }

    /**
     * Show JSON view of analysis data
     */
    public async showJsonView(result: AnalysisResult): Promise<void> {
        if (!result || !result.data) {
            return;
        }

        try {
            this.log('Showing JSON view of analysis data');

            // Create a new untitled document with JSON content
            const jsonContent = JSON.stringify(result.data, null, 2);
            const document = await vscode.workspace.openTextDocument({
                content: jsonContent,
                language: 'json'
            });

            // Show the document in a new editor
            await vscode.window.showTextDocument(document, {
                preview: false,
                viewColumn: vscode.ViewColumn.Beside
            });

            this.log('JSON view displayed successfully');
        } catch (error) {
            this.logError('Failed to show JSON view', error);
            vscode.window.showErrorMessage(
                'Failed to show JSON view. This might be due to data serialization issues.',
                'Check Output'
            ).then(action => {
                if (action === 'Check Output') {
                    this.outputChannel.show();
                }
            });
        }
    }



    /**
     * Show Git author statistics
     */
    public async showGitAuthorStatistics(analysisData: any): Promise<void> {
        this.log('Showing Git author statistics');

        try {
            // Show results in tabbed webview using TabbedWebviewProvider
            const tabbedWebviewProvider = (await import('../tabbed-webview-provider')).TabbedWebviewProvider;
            const tabbedProvider = new tabbedWebviewProvider(this.context, this.outputChannel);
            
            // Convert data to tabbed format
            const tabbedData = this.convertGitAnalyticsForTabbedView(analysisData, 'author_statistics');
            
            // Show Git Analytics tab
            tabbedProvider.showTab('git', tabbedData);
            
            this.log('Git author statistics displayed in tabbed interface');
        } catch (tabbedError) {
            this.logError('Failed to show tabbed Git analytics, using fallback', tabbedError);
            // Fallback to basic display
            this.displayGitAuthorStatistics(analysisData);
        }
    }

    /**
     * Show Git module contributions
     */
    public async showGitModuleContributions(analysisData: any): Promise<void> {
        this.log('Showing Git module contributions');

        try {
            // Show results in tabbed webview using TabbedWebviewProvider
            const tabbedWebviewProvider = (await import('../tabbed-webview-provider')).TabbedWebviewProvider;
            const tabbedProvider = new tabbedWebviewProvider(this.context, this.outputChannel);
            
            // Convert data to tabbed format
            const tabbedData = this.convertGitAnalyticsForTabbedView(analysisData, 'module_contributions');
            
            // Show Git Analytics tab
            tabbedProvider.showTab('git', tabbedData);
            
            this.log('Git module contributions displayed in tabbed interface');
        } catch (tabbedError) {
            this.logError('Failed to show tabbed Git analytics, using fallback', tabbedError);
            // Fallback to basic display
            this.displayGitModuleContributions(analysisData);
        }
    }

    /**
     * Show Git commit timeline
     */
    public async showGitCommitTimeline(analysisData: any): Promise<void> {
        this.log('Showing Git commit timeline');

        try {
            // Show results in tabbed webview using TabbedWebviewProvider
            const tabbedWebviewProvider = (await import('../tabbed-webview-provider')).TabbedWebviewProvider;
            const tabbedProvider = new tabbedWebviewProvider(this.context, this.outputChannel);
            
            // Convert data to tabbed format
            const tabbedData = this.convertGitAnalyticsForTabbedView(analysisData, 'commit_timeline');
            
            // Show Git Analytics tab
            tabbedProvider.showTab('git', tabbedData);
            
            this.log('Git commit timeline displayed in tabbed interface');
        } catch (tabbedError) {
            this.logError('Failed to show tabbed Git analytics, using fallback', tabbedError);
            // Fallback to basic display
            this.displayGitCommitTimeline(analysisData);
        }
    }

    /**
     * Show database schema graph view
     */
    public async showDatabaseSchemaGraphView(analysisData: any): Promise<void> {
        this.log('Showing database schema graph view');

        try {
            // Show database schema in tabbed webview with graph view active
            const tabbedData = this.convertDatabaseSchemaForTabbedView(analysisData);
            
            // Import TabbedWebviewProvider if not already available
            const tabbedWebviewProvider = (await import('../tabbed-webview-provider')).TabbedWebviewProvider;
            const tabbedProvider = new tabbedWebviewProvider(this.context, this.outputChannel);
            
            tabbedProvider.showTab('dbschema', tabbedData);
            tabbedProvider.switchToTab('dbschema', 'graph');

            this.log('Database schema graph displayed successfully');
        } catch (error) {
            this.logError('Failed to show database schema graph', error);
            vscode.window.showErrorMessage('Failed to show database schema graph. Check output for details.');
        }
    }

    /**
     * Show database schema raw SQL
     */
    public async showDatabaseSchemaRawSQL(analysisData: any): Promise<void> {
        this.log('Showing database schema raw SQL');

        try {
            // Show database schema in tabbed webview with SQL view active
            const tabbedData = this.convertDatabaseSchemaForTabbedView(analysisData);
            
            const tabbedWebviewProvider = (await import('../tabbed-webview-provider')).TabbedWebviewProvider;
            const tabbedProvider = new tabbedWebviewProvider(this.context, this.outputChannel);
            
            tabbedProvider.showTab('dbschema', tabbedData);
            tabbedProvider.switchToTab('dbschema', 'sql');

            this.log('Database schema raw SQL displayed successfully');
        } catch (error) {
            this.logError('Failed to show database schema raw SQL', error);
            vscode.window.showErrorMessage('Failed to show database schema raw SQL. Check output for details.');
        }
    }

    /**
     * Show tech stack graph visualization
     */
    public async showTechStackGraph(analysisData: any): Promise<void> {
        this.log('Showing tech stack graph in tabbed view');

        try {
            // Show tech stack visualization in tabbed webview provider
            const tabbedWebviewProvider = (await import('../tabbed-webview-provider')).TabbedWebviewProvider;
            const tabbedProvider = new tabbedWebviewProvider(this.context, this.outputChannel);
            
            tabbedProvider.showTechStackGraph(analysisData);

            this.log('Tech stack graph displayed successfully in tabbed view');
        } catch (error) {
            this.logError('Failed to show tech stack graph', error);
            vscode.window.showErrorMessage('Failed to show tech stack graph. Check output for details.');
        }
    }

    /**
     * Format JSON in the current editor
     */
    public async formatJsonInEditor(): Promise<void> {
        this.log('JSON Format requested');
        await this.jsonUtilities.formatJsonInEditor();
    }

    /**
     * Show JSON tree view
     */
    public async showJsonTreeView(): Promise<void> {
        this.log('JSON Tree View requested');
        await this.jsonUtilities.showJsonTreeView();
    }

    /**
     * Show function complexity details
     */
    public showFunctionComplexityDetails(func: FunctionComplexityData, uri: vscode.Uri, position: vscode.Position): void {
        const complexityLevel = func.complexity <= 5 ? 'low' : func.complexity <= 10 ? 'medium' : 'high';
        const complexityColor = complexityLevel === 'low' ? '🟢' : complexityLevel === 'medium' ? '🟡' : '🔴';

        const parameters = func.parameters.map(p => {
            let paramStr = p.name;
            if (p.type_hint) {
                paramStr += `: ${p.type_hint}`;
            }
            if (p.default_value) {
                paramStr += ` = ${p.default_value}`;
            }
            if (p.is_vararg) {
                paramStr = `*${paramStr}`;
            }
            if (p.is_kwarg) {
                paramStr = `**${paramStr}`;
            }
            return paramStr;
        }).join(', ');

        const message = `Function: ${func.name}
Module: ${func.module}
Line: ${func.line_number}
Complexity: ${complexityColor} ${func.complexity} (${complexityLevel})
Parameters: (${parameters})

Complexity Guidelines:
🟢 Low (1-5): Simple function, easy to understand
🟡 Medium (6-10): Moderate complexity, consider refactoring
🔴 High (11+): Complex function, should be refactored`;

        vscode.window.showInformationMessage(
            'Function Complexity Details',
            { modal: true, detail: message },
            'Go to Function',
            'Show Call Hierarchy'
        ).then(action => {
            if (action === 'Go to Function') {
                vscode.window.showTextDocument(uri).then(editor => {
                    editor.selection = new vscode.Selection(position, position);
                    editor.revealRange(new vscode.Range(position, position));
                });
            } else if (action === 'Show Call Hierarchy') {
                // This will be handled by the command manager calling the analysis manager
                vscode.commands.executeCommand('doracodebird.showCallHierarchy', uri, position);
            }
        });
    }

    /**
     * Update UI components with analysis data
     */
    public updateUIComponents(result: AnalysisResult): void {
        if (result.data) {
            const analysisData: AnalysisData = {
                tech_stack: result.data.tech_stack,
                modules: result.data.modules,
                framework_patterns: result.data.framework_patterns || {}
            };

            this.sidebarProvider.updateAnalysisData(analysisData);

            // Also update CodeLens provider with function data
            const codeLensData = {
                functions: result.data.functions
            };
            this.codeLensProvider.updateAnalysisData(codeLensData);

            // Update webview provider with analysis data
            const webviewData = this.convertAnalysisDataForWebview(result);
            this.tabbedWebviewProvider.updateAnalysisData(webviewData);

            this.log('UI components updated with analysis data');
        } else {
            // Clear UI components if no valid data
            this.sidebarProvider.updateAnalysisData(null);
            this.codeLensProvider.updateAnalysisData(null);
            this.tabbedWebviewProvider.updateAnalysisData(null);
            this.log('UI components cleared due to no valid analysis data');
        }
    }

    /**
     * Clear analysis cache and UI components
     */
    public async clearCache(): Promise<void> {
        try {
            // Clear sidebar, CodeLens, and webview data
            this.sidebarProvider.updateAnalysisData(null);
            this.codeLensProvider.updateAnalysisData(null);
            this.tabbedWebviewProvider.updateAnalysisData(null);

            this.log('Analysis cache cleared');
            vscode.window.showInformationMessage('Analysis cache cleared');
        } catch (error) {
            this.logError('Failed to clear cache', error);
            vscode.window.showErrorMessage('Failed to clear cache');
        }
    }

    /**
     * Refresh sidebar data
     */
    public refreshSidebar(): void {
        this.log('Refreshing sidebar...');
        this.sidebarProvider.refresh();
    }

    /**
     * Navigate to item from sidebar
     */
    public navigateToItem(item: DoraCodeBirdTreeItem): void {
        // Implementation for navigating to sidebar items
        // This would typically open the file and navigate to the specific location
        if (item.resourceUri) {
            vscode.window.showTextDocument(item.resourceUri);
        }
    }

    /**
     * Filter sidebar
     */
    public filterSidebar(): void {
        // Implementation for filtering sidebar items
        vscode.window.showInputBox({
            prompt: 'Enter filter text for sidebar items',
            placeHolder: 'Filter by module name, function name, etc.'
        }).then(filterText => {
            if (filterText) {
                // Apply filter to sidebar provider
                // This would need to be implemented in the sidebar provider
                this.log(`Filtering sidebar with: ${filterText}`);
            }
        });
    }

    /**
     * Select module in sidebar
     */
    public selectModule(item: DoraCodeBirdTreeItem): void {
        // Implementation for selecting a module in the sidebar
        this.log(`Module selected: ${item.label}`);
        // This could highlight the module or show additional details
    }

    /**
     * Clear module selection
     */
    public clearModuleSelection(): void {
        // Implementation for clearing module selection
        this.log('Module selection cleared');
        // This would clear any highlighting or selection state
    }

    /**
     * Show module dependencies
     */
    public showModuleDependencies(item: DoraCodeBirdTreeItem): void {
        // Implementation for showing module dependencies
        this.log(`Showing dependencies for: ${item.label}`);
        // This could show a dependency graph or list
    }

    /**
     * Create a webview with the given configuration
     */
    private createWebview(config: WebviewConfig): vscode.WebviewPanel {
        const panel = vscode.window.createWebviewPanel(
            config.viewType,
            config.title,
            config.showOptions,
            config.options
        );

        // Store the webview for management
        this.activeWebviews.set(config.viewType, panel);

        // Clean up when the webview is disposed
        panel.onDidDispose(() => {
            this.activeWebviews.delete(config.viewType);
        });

        return panel;
    }

    /**
     * Convert analysis result to webview data format
     */
    private convertAnalysisDataForWebview(result?: AnalysisResult): WebviewAnalysisData {
        const webviewData: WebviewAnalysisData = {};

        if (!result?.data) {
            return webviewData;
        }

        try {
            // Convert modules data - handle the new nested structure
            if (result.data.modules) {
                const modulesData = result.data.modules;

                webviewData.modules = {
                    nodes: (modulesData.nodes || []).map((module: any) => {
                        if (!module) {
                            return {
                                id: 'unknown',
                                name: 'unknown',
                                path: '',
                                complexity: 0,
                                size: 0,
                                functions: []
                            };
                        }
                        return {
                            id: module.id || module.name || 'unknown',
                            name: path.basename(module.name || module.id || 'unknown'),
                            path: this.convertToRelativePath(module.path || ''),
                            complexity: this.extractComplexityValue(module.complexity),
                            size: module.size || 0,
                            functions: module.functions || []
                        };
                    }),
                    edges: (modulesData.edges || []).map((edge: any) => ({
                        source: edge?.source || 'unknown',
                        target: edge?.target || 'unknown',
                        type: (edge?.type as 'import' | 'dependency') || 'import',
                        weight: edge?.weight || 1
                    }))
                };
            }

            // Convert functions data
            if (result.data.functions) {
                webviewData.functions = {
                    nodes: (result.data.functions.nodes || result.data.functions || []).map((func: any) => ({
                        id: func.id || `${func.module}.${func.name}`,
                        name: func.name || 'unknown',
                        module: func.module || 'unknown',
                        complexity: func.complexity || 0,
                        lineNumber: func.line_number || func.lineNumber || 0,
                        parameters: func.parameters || []
                    })),
                    edges: (result.data.functions.edges || []).map((edge: any) => ({
                        source: edge.source || 'unknown',
                        target: edge.target || 'unknown',
                        type: edge.type || 'calls'
                    }))
                };
            }
        } catch (error) {
            this.logError('Error converting analysis data for webview', error);
        }

        return webviewData;
    }

    /**
     * Convert to relative path
     */
    private convertToRelativePath(filePath: string): string {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || !filePath) {
            return filePath;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        return path.relative(workspaceRoot, filePath);
    }

    /**
     * Extract complexity value from various formats
     */
    private extractComplexityValue(complexity: any): number {
        if (typeof complexity === 'number') {
            return complexity;
        }
        if (typeof complexity === 'object' && complexity !== null) {
            return complexity.cyclomatic || complexity.value || 0;
        }
        return 0;
    }

    // Placeholder methods for data conversion - these would need to be implemented based on actual data structures
    private convertAnalysisDataForTabbedView(result: AnalysisResult): any {
        // This would convert the analysis result to the format expected by TabbedWebviewProvider
        return result.data;
    }

    private convertGitAnalyticsForTabbedView(data: any, analysisType: string): any {
        // This would convert git analytics data to the format expected by TabbedWebviewProvider
        return { type: analysisType, data };
    }

    private convertDatabaseSchemaForTabbedView(data: any): any {
        // This would convert database schema data to the format expected by TabbedWebviewProvider
        return data;
    }

    // Fallback display methods for Git analytics
    private displayGitAuthorStatistics(data: any): void {
        const authors = data.author_contributions || [];
        
        if (authors.length === 0) {
            vscode.window.showInformationMessage('No Git author statistics found in this repository.');
            return;
        }

        const topAuthors = authors.slice(0, 10);
        const summary = topAuthors.map((author: any, index: number) => 
            `${index + 1}. ${author.author_name} - ${author.total_commits} commits (${author.contribution_percentage?.toFixed(1) || 0}%)`
        ).join('\n');

        const message = `Git Author Statistics:\n\n${summary}\n\nTotal Authors: ${authors.length}`;
        
        vscode.window.showInformationMessage(
            'Git Author Statistics Analysis Complete',
            { modal: true, detail: message },
            'View Full Analysis'
        ).then(action => {
            if (action === 'View Full Analysis') {
                this.outputChannel.appendLine('\n=== Git Author Statistics ===');
                this.outputChannel.appendLine(JSON.stringify(data, null, 2));
                this.outputChannel.show();
            }
        });
    }

    private displayGitModuleContributions(data: any): void {
        const moduleStats = data.module_statistics || {};
        const modules = Object.keys(moduleStats);
        
        if (modules.length === 0) {
            vscode.window.showInformationMessage('No Git module contributions found in this repository.');
            return;
        }

        const topModules = modules.slice(0, 10);
        const summary = topModules.map((modulePath: string) => {
            const stats = moduleStats[modulePath];
            return `${modulePath}: ${stats.total_commits} commits, ${stats.unique_authors} authors`;
        }).join('\n');

        const message = `Git Module Contributions:\n\n${summary}\n\nTotal Modules: ${modules.length}`;
        
        vscode.window.showInformationMessage(
            'Git Module Contributions Analysis Complete',
            { modal: true, detail: message },
            'View Full Analysis'
        ).then(action => {
            if (action === 'View Full Analysis') {
                this.outputChannel.appendLine('\n=== Git Module Contributions ===');
                this.outputChannel.appendLine(JSON.stringify(data, null, 2));
                this.outputChannel.show();
            }
        });
    }

    private displayGitCommitTimeline(data: any): void {
        const timeline = data.commit_timeline || [];
        const repoInfo = data.repository_info || {};
        
        if (timeline.length === 0) {
            vscode.window.showInformationMessage('No Git commit timeline found in this repository.');
            return;
        }

        const totalCommits = repoInfo.total_commits || 0;
        const contributors = repoInfo.contributors || 0;
        const dateRange = repoInfo.date_range || {};
        
        const message = `Git Commit Timeline:\n\nRepository: ${repoInfo.name || 'Unknown'}\nBranch: ${repoInfo.branch || 'Unknown'}\nTotal Commits: ${totalCommits}\nContributors: ${contributors}\nDate Range: ${dateRange.start || 'Unknown'} to ${dateRange.end || 'Unknown'}\nTimeline Entries: ${timeline.length}`;
        
        vscode.window.showInformationMessage(
            'Git Commit Timeline Analysis Complete',
            { modal: true, detail: message },
            'View Full Analysis'
        ).then(action => {
            if (action === 'View Full Analysis') {
                this.outputChannel.appendLine('\n=== Git Commit Timeline ===');
                this.outputChannel.appendLine(JSON.stringify(data, null, 2));
                this.outputChannel.show();
            }
        });
    }

    /**
     * Log a message to the output channel
     */
    private log(message: string): void {
        this.outputChannel.appendLine(`[UIManager] ${message}`);
    }

    /**
     * Log an error to the output channel
     */
    private logError(message: string, error: any): void {
        this.outputChannel.appendLine(`[UIManager ERROR] ${message}: ${error?.message || error}`);
        if (error?.stack) {
            this.outputChannel.appendLine(error.stack);
        }
    }

    /**
     * Dispose of all UI resources
     */
    public dispose(): void {
        // Dispose of all active webviews
        this.activeWebviews.forEach(webview => {
            webview.dispose();
        });
        this.activeWebviews.clear();

        // Status bar item is disposed automatically via context subscriptions
    }
}