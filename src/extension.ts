import * as vscode from 'vscode';
import * as path from 'path';
import { AnalyzerRunner, AnalysisResult, AnalyzerOptions } from './analyzer-runner';
import { SidebarProvider, CodeMindMapTreeItem, TreeItemType, AnalysisData } from './sidebar-provider';
import { ComplexityCodeLensProvider, FunctionComplexityData } from './codelens-provider';

/**
 * Main CodeMindMap extension class that manages the extension lifecycle
 */
export class CodeMindMapExtension {
    private context: vscode.ExtensionContext;
    private outputChannel: vscode.OutputChannel;
    private statusBarItem: vscode.StatusBarItem;
    private analyzerRunner: AnalyzerRunner;
    private sidebarProvider: SidebarProvider;
    private codeLensProvider: ComplexityCodeLensProvider;
    private isAnalyzing: boolean = false;
    private lastAnalysisResult: AnalysisResult | null = null;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('CodeMindMap');
        this.analyzerRunner = new AnalyzerRunner(this.outputChannel, context.extensionPath);
        this.sidebarProvider = new SidebarProvider(context);
        this.codeLensProvider = new ComplexityCodeLensProvider(this.outputChannel);
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'codemindmap.analyzeProject';
        this.statusBarItem.text = '$(graph) CodeMindMap';
        this.statusBarItem.tooltip = 'Click to analyze Python project';
        this.statusBarItem.show();
    }

    /**
     * Initialize the extension and register all commands
     */
    public initialize(): void {
        this.log('CodeMindMap extension is initializing...');
        
        // Check if we're in a Python project
        this.checkPythonProject();
        
        // Register tree data provider
        this.registerTreeDataProvider();
        
        // Register CodeLens provider
        this.registerCodeLensProvider();
        
        // Register all commands
        this.registerCommands();
        
        // Set up workspace listeners
        this.setupWorkspaceListeners();
        
        this.log('CodeMindMap extension initialized successfully');
    }

    /**
     * Register the tree data provider for the sidebar
     */
    private registerTreeDataProvider(): void {
        const treeView = vscode.window.createTreeView('codemindmapSidebar', {
            treeDataProvider: this.sidebarProvider,
            showCollapseAll: true
        });

        // Add tree view to subscriptions for cleanup
        this.context.subscriptions.push(treeView);
        
        this.log('Sidebar tree data provider registered');
    }

    /**
     * Register the CodeLens provider for complexity annotations
     */
    private registerCodeLensProvider(): void {
        const codeLensProvider = vscode.languages.registerCodeLensProvider(
            { language: 'python' },
            this.codeLensProvider
        );

        // Add to subscriptions for cleanup
        this.context.subscriptions.push(codeLensProvider);
        
        this.log('CodeLens provider registered for Python files');
    }

    /**
     * Register all extension commands
     */
    private registerCommands(): void {
        const commands = [
            // Main analysis command
            vscode.commands.registerCommand('codemindmap.analyzeProject', () => {
                this.analyzeProject();
            }),

            // Module graph visualization
            vscode.commands.registerCommand('codemindmap.showModuleGraph', () => {
                this.showModuleGraph();
            }),

            // Call hierarchy visualization
            vscode.commands.registerCommand('codemindmap.showCallHierarchy', (uri?: vscode.Uri, position?: vscode.Position) => {
                this.showCallHierarchy(uri, position);
            }),

            // Sidebar refresh
            vscode.commands.registerCommand('codemindmap.refreshSidebar', () => {
                this.refreshSidebar();
            }),

            // Open settings
            vscode.commands.registerCommand('codemindmap.openSettings', () => {
                this.openSettings();
            }),

            // Clear cache
            vscode.commands.registerCommand('codemindmap.clearCache', () => {
                this.clearCache();
            }),

            // Show output channel
            vscode.commands.registerCommand('codemindmap.showOutput', () => {
                this.outputChannel.show();
            }),

            // Cancel analysis
            vscode.commands.registerCommand('codemindmap.cancelAnalysis', () => {
                this.cancelAnalysis();
            }),

            // Navigate to item from sidebar
            vscode.commands.registerCommand('codemindmap.navigateToItem', (item: CodeMindMapTreeItem) => {
                this.navigateToItem(item);
            }),

            // Filter sidebar
            vscode.commands.registerCommand('codemindmap.filterSidebar', () => {
                this.filterSidebar();
            }),

            // Select module in sidebar
            vscode.commands.registerCommand('codemindmap.selectModule', (item: CodeMindMapTreeItem) => {
                this.selectModule(item);
            }),

            // Clear module selection
            vscode.commands.registerCommand('codemindmap.clearSelection', () => {
                this.clearModuleSelection();
            }),

            // Show module dependencies
            vscode.commands.registerCommand('codemindmap.showDependencies', (item: CodeMindMapTreeItem) => {
                this.showModuleDependencies(item);
            }),

            // Show function complexity details
            vscode.commands.registerCommand('codemindmap.showFunctionComplexityDetails', (func: FunctionComplexityData, uri: vscode.Uri, position: vscode.Position) => {
                this.showFunctionComplexityDetails(func, uri, position);
            })
        ];

        // Add all commands to context subscriptions for proper cleanup
        commands.forEach(command => {
            this.context.subscriptions.push(command);
        });

        this.log('All commands registered successfully');
    }

    /**
     * Set up workspace event listeners
     */
    private setupWorkspaceListeners(): void {
        // Listen for file changes in Python files
        const pythonFileWatcher = vscode.workspace.createFileSystemWatcher('**/*.py');
        
        pythonFileWatcher.onDidChange(() => {
            this.onPythonFileChanged();
        });

        pythonFileWatcher.onDidCreate(() => {
            this.onPythonFileChanged();
        });

        pythonFileWatcher.onDidDelete(() => {
            this.onPythonFileChanged();
        });

        // Listen for dependency file changes
        const dependencyFileWatcher = vscode.workspace.createFileSystemWatcher(
            '{**/requirements.txt,**/pyproject.toml,**/Pipfile}'
        );

        dependencyFileWatcher.onDidChange(() => {
            this.onDependencyFileChanged();
        });

        // Listen for workspace folder changes
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            this.checkPythonProject();
        });

        // Add watchers to subscriptions for cleanup
        this.context.subscriptions.push(pythonFileWatcher, dependencyFileWatcher);
    }

    /**
     * Check if current workspace contains Python files
     */
    private async checkPythonProject(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            this.statusBarItem.hide();
            return;
        }

        try {
            const pythonFiles = await vscode.workspace.findFiles('**/*.py', '**/node_modules/**', 1);
            if (pythonFiles.length > 0) {
                this.statusBarItem.show();
                this.log('Python project detected');
            } else {
                this.statusBarItem.hide();
                this.log('No Python files found in workspace');
            }
        } catch (error) {
            this.logError('Error checking for Python files', error);
        }
    }

    /**
     * Handle Python file changes
     */
    private onPythonFileChanged(): void {
        if (this.getConfiguration().get<boolean>('enableCaching', true)) {
            this.log('Python file changed - cache will be invalidated on next analysis');
        }
    }

    /**
     * Handle dependency file changes
     */
    private onDependencyFileChanged(): void {
        this.log('Dependency file changed - analysis may need to be refreshed');
        vscode.window.showInformationMessage(
            'Python dependencies changed. Consider re-analyzing the project.',
            'Analyze Now'
        ).then(selection => {
            if (selection === 'Analyze Now') {
                this.analyzeProject();
            }
        });
    }

    /**
     * Main project analysis command
     */
    private async analyzeProject(): Promise<void> {
        if (this.isAnalyzing) {
            vscode.window.showWarningMessage('Analysis is already in progress');
            return;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        this.isAnalyzing = true;
        this.statusBarItem.text = '$(sync~spin) Analyzing...';
        this.log('Starting project analysis...');

        try {
            // Show progress dialog
            const result = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Analyzing Python Project',
                cancellable: true
            }, async (progress, token) => {
                // Prepare analyzer options
                const config = this.getConfiguration();
                const options: AnalyzerOptions = {
                    projectPath: workspaceFolders[0].uri.fsPath,
                    pythonPath: config.get<string>('pythonPath'),
                    timeout: 300000, // 5 minutes
                    enableCaching: config.get<boolean>('enableCaching', true)
                };

                // Run the analysis
                return await this.analyzerRunner.runAnalysis(options, progress, token);
            });

            // Store the result
            this.lastAnalysisResult = result;

            if (result.success) {
                this.log(`Analysis completed successfully in ${result.executionTime}ms`);
                
                // Update sidebar with analysis data
                this.updateSidebar(result);
                
                // Show success message with options
                const action = await vscode.window.showInformationMessage(
                    'Project analysis completed successfully!',
                    'Show Module Graph',
                    'View Output'
                );

                if (action === 'Show Module Graph') {
                    this.showModuleGraph();
                } else if (action === 'View Output') {
                    this.outputChannel.show();
                }
            } else {
                // Handle analysis errors
                this.handleAnalysisErrors(result);
                
                // Clear sidebar and CodeLens on error
                this.sidebarProvider.updateAnalysisData(null);
                this.codeLensProvider.updateAnalysisData(null);
            }

        } catch (error) {
            this.logError('Analysis failed', error);
            
            if (error instanceof Error && error.message.includes('cancelled')) {
                vscode.window.showInformationMessage('Analysis was cancelled');
            } else {
                vscode.window.showErrorMessage('Project analysis failed. Check output for details.');
            }
        } finally {
            this.isAnalyzing = false;
            this.statusBarItem.text = '$(graph) CodeMindMap';
        }
    }

    /**
     * Handle analysis errors and warnings
     */
    private handleAnalysisErrors(result: AnalysisResult): void {
        const errors = result.errors || [];
        const warnings = result.warnings || [];

        // Log all errors and warnings
        errors.forEach(error => {
            this.logError(`Analysis error (${error.type})`, new Error(error.message));
        });

        warnings.forEach(warning => {
            this.log(`Analysis warning (${warning.type}): ${warning.message}`);
        });

        // Show appropriate user message
        if (errors.length > 0) {
            const errorMessage = `Analysis completed with ${errors.length} error(s)`;
            vscode.window.showErrorMessage(errorMessage, 'View Output').then(action => {
                if (action === 'View Output') {
                    this.outputChannel.show();
                }
            });
        } else if (warnings.length > 0) {
            const warningMessage = `Analysis completed with ${warnings.length} warning(s)`;
            vscode.window.showWarningMessage(warningMessage, 'View Output').then(action => {
                if (action === 'View Output') {
                    this.outputChannel.show();
                }
            });
        }
    }

    /**
     * Show module graph visualization
     */
    private showModuleGraph(): void {
        if (!this.lastAnalysisResult || !this.lastAnalysisResult.success) {
            vscode.window.showWarningMessage('No analysis data available. Please run analysis first.');
            return;
        }

        this.log('Showing module graph...');
        // TODO: This will be implemented in task 9
        vscode.window.showInformationMessage('Module graph visualization (implementation pending)');
    }

    /**
     * Show call hierarchy for function at cursor or selection
     */
    private showCallHierarchy(uri?: vscode.Uri, position?: vscode.Position): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        if (editor.document.languageId !== 'python') {
            vscode.window.showErrorMessage('Call hierarchy is only available for Python files');
            return;
        }

        const currentPosition = position || editor.selection.active;
        const wordRange = editor.document.getWordRangeAtPosition(currentPosition);
        
        if (!wordRange) {
            vscode.window.showErrorMessage('No function selected');
            return;
        }

        const functionName = editor.document.getText(wordRange);
        this.log(`Showing call hierarchy for function: ${functionName}`);
        
        // TODO: This will be implemented in task 9
        vscode.window.showInformationMessage(`Call hierarchy for '${functionName}' (implementation pending)`);
    }

    /**
     * Refresh sidebar data
     */
    private refreshSidebar(): void {
        this.log('Refreshing sidebar...');
        this.sidebarProvider.refresh();
        
        // If we have previous analysis results, re-run analysis
        if (this.lastAnalysisResult) {
            this.analyzeProject();
        } else {
            vscode.window.showInformationMessage('No analysis data to refresh. Please run analysis first.');
        }
    }

    /**
     * Open extension settings
     */
    private openSettings(): void {
        vscode.commands.executeCommand('workbench.action.openSettings', 'codemindmap');
    }

    /**
     * Cancel the currently running analysis
     */
    private cancelAnalysis(): void {
        if (this.isAnalyzing) {
            this.analyzerRunner.cancelAnalysis();
            this.log('Analysis cancellation requested');
            vscode.window.showInformationMessage('Analysis cancelled');
        } else {
            vscode.window.showInformationMessage('No analysis is currently running');
        }
    }

    /**
     * Clear analysis cache
     */
    private async clearCache(): Promise<void> {
        try {
            // Clear the last analysis result
            this.lastAnalysisResult = null;
            
            // Clear sidebar and CodeLens data
            this.sidebarProvider.updateAnalysisData(null);
            this.codeLensProvider.updateAnalysisData(null);
            
            // TODO: Implement file-based cache clearing logic when caching is implemented
            this.log('Analysis cache cleared');
            vscode.window.showInformationMessage('Analysis cache cleared');
        } catch (error) {
            this.logError('Failed to clear cache', error);
            vscode.window.showErrorMessage('Failed to clear cache');
        }
    }

    /**
     * Update sidebar with analysis data
     */
    private updateSidebar(result: AnalysisResult): void {
        if (result.success && result.data) {
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
            
            this.log('Sidebar and CodeLens updated with analysis data');
        }
    }

    /**
     * Navigate to a code item from the sidebar
     */
    private async navigateToItem(item: CodeMindMapTreeItem): Promise<void> {
        try {
            let filePath: string | undefined;
            let lineNumber: number | undefined;

            switch (item.itemType) {
                case TreeItemType.MODULE:
                    const module = item.data;
                    filePath = module.path;
                    break;

                case TreeItemType.FUNCTION:
                case TreeItemType.METHOD:
                    const func = item.data;
                    // Find the module that contains this function
                    const containingModule = this.findModuleByName(func.module);
                    if (containingModule) {
                        filePath = containingModule.path;
                        lineNumber = func.line_number;
                    }
                    break;

                case TreeItemType.CLASS:
                    const cls = item.data;
                    // Find the module that contains this class
                    const classModule = this.findModuleByName(cls.module);
                    if (classModule) {
                        filePath = classModule.path;
                        lineNumber = cls.line_number;
                    }
                    break;
            }

            if (filePath) {
                // Convert to VS Code URI
                const uri = vscode.Uri.file(filePath);
                
                // Open the document
                const document = await vscode.workspace.openTextDocument(uri);
                const editor = await vscode.window.showTextDocument(document);

                // Navigate to specific line if provided
                if (lineNumber !== undefined && lineNumber > 0) {
                    const position = new vscode.Position(lineNumber - 1, 0); // VS Code uses 0-based line numbers
                    const range = new vscode.Range(position, position);
                    
                    editor.selection = new vscode.Selection(position, position);
                    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                }

                this.log(`Navigated to ${item.itemType}: ${item.label} in ${filePath}${lineNumber ? ` at line ${lineNumber}` : ''}`);
            } else {
                vscode.window.showWarningMessage(`Could not find file for ${item.label}`);
            }
        } catch (error) {
            this.logError(`Failed to navigate to ${item.label}`, error);
            vscode.window.showErrorMessage(`Failed to navigate to ${item.label}`);
        }
    }

    /**
     * Show filter input for sidebar
     */
    private async filterSidebar(): Promise<void> {
        const filterText = await vscode.window.showInputBox({
            prompt: 'Enter filter text for modules and functions',
            placeHolder: 'e.g., "test", "utils", "main"',
            value: ''
        });

        if (filterText !== undefined) {
            if (filterText.trim() === '') {
                this.sidebarProvider.clearFilter();
                this.log('Sidebar filter cleared');
            } else {
                this.sidebarProvider.setFilter(filterText.trim());
                this.log(`Sidebar filtered by: ${filterText.trim()}`);
            }
        }
    }

    /**
     * Select a module and highlight its dependencies
     */
    private selectModule(item: CodeMindMapTreeItem): void {
        if (item.itemType === TreeItemType.MODULE) {
            const module = item.data;
            this.sidebarProvider.selectModule(module.name);
            this.log(`Selected module: ${module.name}`);
            
            vscode.window.showInformationMessage(
                `Selected module: ${path.basename(module.name)}. Dependencies and dependents are now highlighted.`,
                'Clear Selection'
            ).then(action => {
                if (action === 'Clear Selection') {
                    this.clearModuleSelection();
                }
            });
        }
    }

    /**
     * Clear module selection
     */
    private clearModuleSelection(): void {
        this.sidebarProvider.clearSelection();
        this.log('Cleared module selection');
        vscode.window.showInformationMessage('Module selection cleared');
    }

    /**
     * Show module dependencies in a quick pick
     */
    private async showModuleDependencies(item: CodeMindMapTreeItem): Promise<void> {
        if (item.itemType !== TreeItemType.MODULE) {
            return;
        }

        const module = item.data;
        const dependencies = this.sidebarProvider.getModuleDependencies(module.name);
        const dependents = this.sidebarProvider.getModuleDependents(module.name);

        const items: vscode.QuickPickItem[] = [];

        if (dependencies.length > 0) {
            items.push({ label: '--- Dependencies ---', kind: vscode.QuickPickItemKind.Separator });
            dependencies.forEach(dep => {
                items.push({
                    label: `$(arrow-right) ${path.basename(dep)}`,
                    description: dep,
                    detail: 'This module depends on'
                });
            });
        }

        if (dependents.length > 0) {
            items.push({ label: '--- Dependents ---', kind: vscode.QuickPickItemKind.Separator });
            dependents.forEach(dep => {
                items.push({
                    label: `$(arrow-left) ${path.basename(dep)}`,
                    description: dep,
                    detail: 'This module is used by'
                });
            });
        }

        if (items.length === 0) {
            vscode.window.showInformationMessage(`Module ${path.basename(module.name)} has no dependencies or dependents in this project.`);
            return;
        }

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: `Dependencies and dependents for ${path.basename(module.name)}`,
            matchOnDescription: true
        });

        if (selected && selected.description) {
            // Navigate to the selected dependency/dependent
            const targetModule = this.findModuleByName(selected.description);
            if (targetModule) {
                const uri = vscode.Uri.file(targetModule.path);
                const document = await vscode.workspace.openTextDocument(uri);
                await vscode.window.showTextDocument(document);
            }
        }
    }

    /**
     * Show detailed complexity information for a function
     */
    private async showFunctionComplexityDetails(
        func: FunctionComplexityData, 
        uri: vscode.Uri, 
        position: vscode.Position
    ): Promise<void> {
        try {
            // Get complexity thresholds from configuration
            const config = this.getConfiguration();
            const thresholds = config.get<{low: number, medium: number, high: number}>('complexityThresholds', {
                low: 5,
                medium: 10,
                high: 20
            });

            // Determine complexity level
            let level: string;
            let recommendation: string;
            if (func.complexity <= thresholds.low) {
                level = 'Low';
                recommendation = 'This function has low complexity and is easy to understand and maintain.';
            } else if (func.complexity <= thresholds.medium) {
                level = 'Medium';
                recommendation = 'This function has moderate complexity. Consider breaking it down if it grows further.';
            } else {
                level = 'High';
                recommendation = 'This function has high complexity. Consider refactoring it into smaller functions.';
            }

            // Format parameters
            const parameterList = func.parameters.map(param => {
                let paramStr = param.name;
                if (param.type_hint) {
                    paramStr += `: ${param.type_hint}`;
                }
                if (param.default_value) {
                    paramStr += ` = ${param.default_value}`;
                }
                if (param.is_vararg) {
                    paramStr = `*${paramStr}`;
                } else if (param.is_kwarg) {
                    paramStr = `**${paramStr}`;
                }
                return paramStr;
            }).join(', ');

            // Create detailed message
            const message = `**Function Complexity Details**

**Function:** \`${func.name}(${parameterList})\`
**Module:** \`${func.module}\`
**Line:** ${func.line_number}
**Complexity Score:** ${func.complexity}
**Complexity Level:** ${level}

**Thresholds:**
- Low: ≤ ${thresholds.low}
- Medium: ≤ ${thresholds.medium}  
- High: > ${thresholds.medium}

**Recommendation:** ${recommendation}

**About Complexity:**
Cyclomatic complexity measures the number of linearly independent paths through a program's source code. Higher complexity indicates more decision points (if/else, loops, etc.) which can make code harder to understand, test, and maintain.`;

            // Show the details in a webview or information message
            const action = await vscode.window.showInformationMessage(
                `Function "${func.name}" has ${level.toLowerCase()} complexity (${func.complexity})`,
                'Show Details',
                'Go to Function',
                'Show Call Hierarchy'
            );

            if (action === 'Show Details') {
                // Create a webview to show detailed information
                const panel = vscode.window.createWebviewPanel(
                    'functionComplexity',
                    `Complexity: ${func.name}`,
                    vscode.ViewColumn.Beside,
                    {
                        enableScripts: false,
                        retainContextWhenHidden: true
                    }
                );

                panel.webview.html = this.getComplexityDetailsHtml(func, level, thresholds, recommendation);
                
            } else if (action === 'Go to Function') {
                // Navigate to the function
                const document = await vscode.workspace.openTextDocument(uri);
                const editor = await vscode.window.showTextDocument(document);
                
                const range = new vscode.Range(position, position);
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                
            } else if (action === 'Show Call Hierarchy') {
                // Show call hierarchy for this function
                this.showCallHierarchy(uri, position);
            }

            this.log(`Showed complexity details for function: ${func.name} (complexity: ${func.complexity})`);
            
        } catch (error) {
            this.logError(`Failed to show complexity details for function ${func.name}`, error);
            vscode.window.showErrorMessage(`Failed to show complexity details: ${error}`);
        }
    }

    /**
     * Generate HTML content for complexity details webview
     */
    private getComplexityDetailsHtml(
        func: FunctionComplexityData, 
        level: string, 
        thresholds: {low: number, medium: number, high: number},
        recommendation: string
    ): string {
        const levelColor = level === 'Low' ? '#28a745' : level === 'Medium' ? '#ffc107' : '#dc3545';
        const parameterList = func.parameters.map(param => {
            let paramStr = param.name;
            if (param.type_hint) {
                paramStr += `: ${param.type_hint}`;
            }
            if (param.default_value) {
                paramStr += ` = ${param.default_value}`;
            }
            if (param.is_vararg) {
                paramStr = `*${paramStr}`;
            } else if (param.is_kwarg) {
                paramStr = `**${paramStr}`;
            }
            return paramStr;
        }).join(', ');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Function Complexity Details</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .header {
            border-bottom: 2px solid var(--vscode-panel-border);
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .function-name {
            font-size: 1.5em;
            font-weight: bold;
            font-family: 'Courier New', monospace;
            color: var(--vscode-symbolIcon-functionForeground);
        }
        .complexity-score {
            font-size: 2em;
            font-weight: bold;
            color: ${levelColor};
            margin: 10px 0;
        }
        .complexity-level {
            background-color: ${levelColor};
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            font-weight: bold;
            display: inline-block;
        }
        .info-grid {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 10px 20px;
            margin: 20px 0;
        }
        .info-label {
            font-weight: bold;
            color: var(--vscode-descriptionForeground);
        }
        .info-value {
            font-family: 'Courier New', monospace;
            color: var(--vscode-editor-foreground);
        }
        .thresholds {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .threshold-item {
            margin: 5px 0;
        }
        .recommendation {
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 5px 5px 0;
        }
        .about {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid var(--vscode-panel-border);
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="function-name">${func.name}(${parameterList})</div>
        <div class="complexity-score">${func.complexity}</div>
        <div class="complexity-level">${level} Complexity</div>
    </div>

    <div class="info-grid">
        <div class="info-label">Module:</div>
        <div class="info-value">${func.module}</div>
        
        <div class="info-label">Line Number:</div>
        <div class="info-value">${func.line_number}</div>
        
        <div class="info-label">Parameters:</div>
        <div class="info-value">${func.parameters.length}</div>
    </div>

    <div class="thresholds">
        <h3>Complexity Thresholds</h3>
        <div class="threshold-item">🟢 <strong>Low:</strong> ≤ ${thresholds.low}</div>
        <div class="threshold-item">🟡 <strong>Medium:</strong> ≤ ${thresholds.medium}</div>
        <div class="threshold-item">🔴 <strong>High:</strong> > ${thresholds.medium}</div>
    </div>

    <div class="recommendation">
        <h3>Recommendation</h3>
        <p>${recommendation}</p>
    </div>

    <div class="about">
        <h3>About Cyclomatic Complexity</h3>
        <p>
            Cyclomatic complexity is a software metric that measures the number of linearly independent paths 
            through a program's source code. It was developed by Thomas J. McCabe in 1976.
        </p>
        <p>
            Higher complexity indicates more decision points (if/else statements, loops, switch cases, etc.) 
            which can make code harder to understand, test, and maintain. Functions with high complexity 
            are good candidates for refactoring.
        </p>
    </div>
</body>
</html>`;
    }

    /**
     * Find module by name in the last analysis result
     */
    private findModuleByName(moduleName: string): any {
        if (!this.lastAnalysisResult || !this.lastAnalysisResult.data) {
            return null;
        }

        return this.lastAnalysisResult.data.modules.find((module: any) => 
            module.name === moduleName || module.name.endsWith(moduleName)
        );
    }

    /**
     * Get extension configuration
     */
    private getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration('codemindmap');
    }

    /**
     * Log message to output channel
     */
    private log(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }

    /**
     * Log error message to output channel
     */
    private logError(message: string, error: any): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ERROR: ${message}`);
        if (error) {
            this.outputChannel.appendLine(`[${timestamp}] ${error.toString()}`);
            if (error.stack) {
                this.outputChannel.appendLine(`[${timestamp}] ${error.stack}`);
            }
        }
    }

    /**
     * Clean up resources when extension is deactivated
     */
    public dispose(): void {
        this.log('CodeMindMap extension is being deactivated');
        this.outputChannel.dispose();
        this.statusBarItem.dispose();
    }
}

// Global extension instance
let extensionInstance: CodeMindMapExtension | undefined;

/**
 * Main extension activation function
 * Called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext) {
    try {
        extensionInstance = new CodeMindMapExtension(context);
        extensionInstance.initialize();
        
        // Add extension instance to subscriptions for proper cleanup
        context.subscriptions.push({
            dispose: () => {
                if (extensionInstance) {
                    extensionInstance.dispose();
                }
            }
        });
        
    } catch (error) {
        console.error('Failed to activate CodeMindMap extension:', error);
        vscode.window.showErrorMessage('Failed to activate CodeMindMap extension');
    }
}

/**
 * Extension deactivation function
 * Called when the extension is deactivated
 */
export function deactivate() {
    if (extensionInstance) {
        extensionInstance.dispose();
        extensionInstance = undefined;
    }
}