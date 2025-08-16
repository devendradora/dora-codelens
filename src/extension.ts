import * as vscode from 'vscode';
import * as path from 'path';
import { AnalyzerRunner, AnalysisResult, AnalyzerOptions } from './analyzer-runner';
import { SidebarProvider, DoraCodeBirdTreeItem, TreeItemType, AnalysisData } from './sidebar-provider';
import { ComplexityCodeLensProvider, FunctionComplexityData } from './codelens-provider';
import { WebviewProvider, WebviewAnalysisData } from './webview-provider';
import { JsonUtilities } from './json-utilities';

/**
 * Main DoraCodeBirdView extension class that manages the extension lifecycle
 */
export class DoraCodeBirdExtension {
    private context: vscode.ExtensionContext;
    private outputChannel: vscode.OutputChannel;
    private statusBarItem: vscode.StatusBarItem;
    private analyzerRunner: AnalyzerRunner;
    private sidebarProvider: SidebarProvider;
    private codeLensProvider: ComplexityCodeLensProvider;
    private webviewProvider: WebviewProvider;
    private jsonUtilities: JsonUtilities;
    private isAnalyzing: boolean = false;
    private lastAnalysisResult: AnalysisResult | null = null;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('DoraCodeBirdView');
        this.analyzerRunner = new AnalyzerRunner(this.outputChannel, context.extensionPath);
        this.sidebarProvider = new SidebarProvider(context);
        this.codeLensProvider = new ComplexityCodeLensProvider(this.outputChannel);
        this.webviewProvider = new WebviewProvider(context, this.outputChannel);
        this.jsonUtilities = new JsonUtilities(this.outputChannel);
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'doracodebird.analyzeProject';
        this.statusBarItem.text = '$(graph) DoraCodeBirdView';
        this.statusBarItem.tooltip = 'Click to analyze Python project';
        this.statusBarItem.show();
    }

    /**
     * Initialize the extension and register all commands
     */
    public initialize(): void {
        this.log('DoraCodeBirdView extension is initializing...');

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

        this.log('DoraCodeBirdView extension initialized successfully');
    }

    /**
     * Register the tree data provider for the sidebar
     */
    private registerTreeDataProvider(): void {
        const treeView = vscode.window.createTreeView('doracodebirdSidebar', {
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
            vscode.commands.registerCommand('doracodebird.analyzeProject', () => {
                this.analyzeProject();
            }),

            // Module graph visualization
            vscode.commands.registerCommand('doracodebird.showModuleGraph', () => {
                this.showModuleGraph();
            }),

            // Call hierarchy visualization
            vscode.commands.registerCommand('doracodebird.showCallHierarchy', (uri?: vscode.Uri, position?: vscode.Position) => {
                this.showCallHierarchy(uri, position);
            }),

            // Sidebar refresh
            vscode.commands.registerCommand('doracodebird.refreshSidebar', () => {
                this.refreshSidebar();
            }),

            // Open settings
            vscode.commands.registerCommand('doracodebird.openSettings', () => {
                this.openSettings();
            }),

            // Clear cache
            vscode.commands.registerCommand('doracodebird.clearCache', () => {
                this.clearCache();
            }),

            // Show output channel
            vscode.commands.registerCommand('doracodebird.showOutput', () => {
                this.outputChannel.show();
            }),

            // Cancel analysis
            vscode.commands.registerCommand('doracodebird.cancelAnalysis', () => {
                this.cancelAnalysis();
            }),

            // Navigate to item from sidebar
            vscode.commands.registerCommand('doracodebird.navigateToItem', (item: DoraCodeBirdTreeItem) => {
                this.navigateToItem(item);
            }),

            // Filter sidebar
            vscode.commands.registerCommand('doracodebird.filterSidebar', () => {
                this.filterSidebar();
            }),

            // Select module in sidebar
            vscode.commands.registerCommand('doracodebird.selectModule', (item: DoraCodeBirdTreeItem) => {
                this.selectModule(item);
            }),

            // Clear module selection
            vscode.commands.registerCommand('doracodebird.clearSelection', () => {
                this.clearModuleSelection();
            }),

            // Show module dependencies
            vscode.commands.registerCommand('doracodebird.showDependencies', (item: DoraCodeBirdTreeItem) => {
                this.showModuleDependencies(item);
            }),

            // Show function complexity details
            vscode.commands.registerCommand('doracodebird.showFunctionComplexityDetails', (func: FunctionComplexityData, uri: vscode.Uri, position: vscode.Position) => {
                this.showFunctionComplexityDetails(func, uri, position);
            }),

            // Validate configuration
            vscode.commands.registerCommand('doracodebird.validateConfiguration', () => {
                this.validateAndShowConfiguration();
            }),

            // Graph View command (context menu)
            vscode.commands.registerCommand('doracodebird.showGraphView', (uri?: vscode.Uri, position?: vscode.Position) => {
                this.showGraphViewFromContext(uri, position);
            }),

            // JSON View command (context menu)
            vscode.commands.registerCommand('doracodebird.showJsonView', (uri?: vscode.Uri, position?: vscode.Position) => {
                this.showJsonViewFromContext(uri, position);
            }),

            // Full Code Analysis command
            vscode.commands.registerCommand('doracodebird.fullCodeAnalysis', () => {
                this.showFullCodeAnalysis();
            }),

            // Current File Analysis command
            vscode.commands.registerCommand('doracodebird.currentFileAnalysis', () => {
                this.showCurrentFileAnalysis();
            }),

            // Git Commits submenu commands
            vscode.commands.registerCommand('doracodebird.gitAuthorStatistics', () => {
                this.showGitAuthorStatistics();
            }),

            vscode.commands.registerCommand('doracodebird.gitModuleContributions', () => {
                this.showGitModuleContributions();
            }),

            vscode.commands.registerCommand('doracodebird.gitCommitTimeline', () => {
                this.showGitCommitTimeline();
            }),

            // JSON Utils submenu commands
            vscode.commands.registerCommand('doracodebird.jsonFormat', () => {
                this.formatJsonInEditor();
            }),

            vscode.commands.registerCommand('doracodebird.jsonTreeView', () => {
                this.showJsonTreeView();
            }),

            // DB Schema submenu commands
            vscode.commands.registerCommand('doracodebird.dbSchemaGraphView', () => {
                this.showDatabaseSchemaGraphView();
            }),

            vscode.commands.registerCommand('doracodebird.dbSchemaRawSQL', () => {
                this.showDatabaseSchemaRawSQL();
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

        // Validate configuration before starting
        const configValidation = this.validateConfiguration();
        if (!configValidation.isValid) {
            const issues = configValidation.issues.join('\n');
            vscode.window.showWarningMessage(
                'Configuration issues detected:',
                { modal: true, detail: issues },
                'Fix Settings'
            ).then(action => {
                if (action === 'Fix Settings') {
                    this.openSettings();
                }
            });
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

            // Always update UI components if we have valid data, regardless of success flag
            this.log(`Analysis result received - success: ${result.success}, hasData: ${!!result.data}`);

            if (result.data) {
                this.log(`Analysis result data structure: ${JSON.stringify({
                    hasData: !!result.data,
                    hasModules: !!(result.data && result.data.modules),
                    moduleNodes: result.data && result.data.modules ? result.data.modules.nodes?.length || 0 : 0,
                    hasFunctions: !!(result.data && result.data.functions),
                    functionNodes: result.data && result.data.functions ? result.data.functions.nodes?.length || 0 : 0
                })}`);
            } else {
                this.log('No data in analysis result');
            }

            const hasValidData = result.data && (
                (result.data.modules && result.data.modules.nodes && result.data.modules.nodes.length > 0) ||
                (result.data.functions && result.data.functions.nodes && result.data.functions.nodes.length > 0)
            );

            this.log(`hasValidData: ${hasValidData}`);

            if (hasValidData) {
                // Update sidebar with analysis data
                this.updateSidebar(result);
            } else {
                // Clear sidebar, CodeLens, and webview if no valid data
                this.sidebarProvider.updateAnalysisData(null);
                this.codeLensProvider.updateAnalysisData(null);
                this.webviewProvider.updateAnalysisData(null);
            }

            if (result.success) {
                this.log(`Analysis completed successfully in ${result.executionTime}ms`);

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
                // Handle analysis errors but still show graph if we have data
                this.handleAnalysisErrors(result);

                if (hasValidData) {
                    this.log(`Analysis completed with errors but produced valid data in ${result.executionTime}ms`);

                    // Show warning message with options to view results
                    const action = await vscode.window.showWarningMessage(
                        'Project analysis completed with errors, but data is available.',
                        'Show Module Graph',
                        'View Output',
                        'View Errors'
                    );

                    if (action === 'Show Module Graph') {
                        this.showModuleGraph();
                    } else if (action === 'View Output') {
                        this.outputChannel.show();
                    } else if (action === 'View Errors') {
                        this.outputChannel.show();
                    }
                } else {
                    this.log(`Analysis failed - no valid data produced in ${result.executionTime}ms`);
                }
            }

        } catch (error) {
            this.logError('Analysis failed', error);

            if (error instanceof Error && error.message.includes('cancelled')) {
                vscode.window.showInformationMessage('Analysis was cancelled');
            } else {
                vscode.window.showErrorMessage('Project analysis failed. Check output for details.');
            }
        } finally {
            this.performAnalysisCleanup();
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

        // Provide specific guidance for common errors
        const commonErrors = this.categorizeErrors(errors);

        if (commonErrors.pythonNotFound) {
            vscode.window.showErrorMessage(
                'Python not found. Please install Python or configure the Python path in settings.',
                'Open Settings',
                'Install Python Guide'
            ).then(action => {
                if (action === 'Open Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'doracodebird.pythonPath');
                } else if (action === 'Install Python Guide') {
                    vscode.env.openExternal(vscode.Uri.parse('https://www.python.org/downloads/'));
                }
            });
        } else if (commonErrors.dependencyMissing) {
            vscode.window.showErrorMessage(
                'Required Python dependencies are missing. Please install them.',
                'View Requirements',
                'Install Dependencies'
            ).then(action => {
                if (action === 'View Requirements') {
                    this.outputChannel.show();
                } else if (action === 'Install Dependencies') {
                    this.showDependencyInstallationGuide();
                }
            });
        } else if (commonErrors.parsingErrors) {
            vscode.window.showWarningMessage(
                `Analysis completed with ${commonErrors.parsingErrors} parsing error(s). Some files may have syntax issues.`,
                'View Details'
            ).then(action => {
                if (action === 'View Details') {
                    this.outputChannel.show();
                }
            });
        } else if (errors.length > 0) {
            const errorMessage = `Analysis completed with ${errors.length} error(s)`;
            vscode.window.showErrorMessage(errorMessage, 'View Output', 'Troubleshoot').then(action => {
                if (action === 'View Output') {
                    this.outputChannel.show();
                } else if (action === 'Troubleshoot') {
                    this.showTroubleshootingGuide();
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
     * Categorize errors to provide specific guidance
     */
    private categorizeErrors(errors: any[]): {
        pythonNotFound: boolean;
        dependencyMissing: boolean;
        parsingErrors: number;
        other: number;
    } {
        let pythonNotFound = false;
        let dependencyMissing = false;
        let parsingErrors = 0;
        let other = 0;

        errors.forEach(error => {
            const message = error.message?.toLowerCase() || '';
            const type = error.type?.toLowerCase() || '';

            if (message.includes('python') && (message.includes('not found') || message.includes('command not found'))) {
                pythonNotFound = true;
            } else if (type === 'dependency_error' || message.includes('module not found') || message.includes('import error')) {
                dependencyMissing = true;
            } else if (type === 'parsing_error' || type === 'syntax_error') {
                parsingErrors++;
            } else {
                other++;
            }
        });

        return { pythonNotFound, dependencyMissing, parsingErrors, other };
    }

    /**
     * Show dependency installation guide
     */
    private showDependencyInstallationGuide(): void {
        const message = `To install required dependencies, run the following commands in your terminal:

1. Navigate to the analyzer directory:
   cd ${path.join(this.context.extensionPath, 'analyzer')}

2. Install dependencies:
   pip install -r requirements.txt
   
   OR if using poetry:
   poetry install

3. Re-run the analysis`;

        vscode.window.showInformationMessage(
            'Dependency Installation Guide',
            { modal: true, detail: message },
            'Copy Commands'
        ).then(action => {
            if (action === 'Copy Commands') {
                vscode.env.clipboard.writeText('pip install radon pathlib typing');
            }
        });
    }

    /**
     * Show troubleshooting guide
     */
    private showTroubleshootingGuide(): void {
        const message = `Common troubleshooting steps:

1. Ensure Python 3.7+ is installed and accessible
2. Check that required dependencies are installed (radon, pathlib, typing)
3. Verify the project contains Python files
4. Check file permissions and accessibility
5. Try running analysis on a smaller subset of files

For more help, check the extension documentation or report an issue.`;

        vscode.window.showInformationMessage(
            'Troubleshooting Guide',
            { modal: true, detail: message },
            'Open Documentation',
            'Report Issue'
        ).then(action => {
            if (action === 'Open Documentation') {
                // Open documentation URL when available
                vscode.window.showInformationMessage('Documentation will be available soon.');
            } else if (action === 'Report Issue') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/your-repo/issues'));
            }
        });
    }

    /**
     * Show module graph visualization
     */
    private async showModuleGraph(): Promise<void> {
        // Run analysis if not available
        if (!this.lastAnalysisResult || !this.lastAnalysisResult.data) {
            await this.analyzeProject();
            if (!this.lastAnalysisResult || !this.lastAnalysisResult.data) {
                return;
            }
        }

        // Check if we have valid data for visualization
        const hasValidData = this.lastAnalysisResult.data && (
            (this.lastAnalysisResult.data.modules && this.lastAnalysisResult.data.modules.nodes && this.lastAnalysisResult.data.modules.nodes.length > 0) ||
            (this.lastAnalysisResult.data.functions && this.lastAnalysisResult.data.functions.nodes && this.lastAnalysisResult.data.functions.nodes.length > 0)
        );

        if (!hasValidData) {
            vscode.window.showWarningMessage(
                'No valid data available for visualization. The analysis may have failed or found no modules/functions.',
                'Run Analysis Again'
            ).then(action => {
                if (action === 'Run Analysis Again') {
                    this.analyzeProject();
                }
            });
            return;
        }

        this.log('Showing module graph...');

        try {
            // Convert analysis result to webview format
            const webviewData = this.convertAnalysisDataForWebview(this.lastAnalysisResult);

            // Validate webview data
            if (!webviewData.modules || !webviewData.modules.nodes || webviewData.modules.nodes.length === 0) {
                vscode.window.showWarningMessage(
                    'No module data available for visualization. The analysis may not have found any modules.',
                    'Re-run Analysis',
                    'Check Output'
                ).then(action => {
                    if (action === 'Re-run Analysis') {
                        this.analyzeProject();
                    } else if (action === 'Check Output') {
                        this.outputChannel.show();
                    }
                });
                return;
            }

            // Show the module graph
            this.webviewProvider.showModuleGraph(webviewData);

            this.log('Module graph webview displayed successfully');
        } catch (error) {
            this.logError('Failed to show module graph', error);
            vscode.window.showErrorMessage(
                'Failed to show module graph. This might be due to data format issues or webview problems.',
                'Check Output',
                'Re-run Analysis'
            ).then(action => {
                if (action === 'Check Output') {
                    this.outputChannel.show();
                } else if (action === 'Re-run Analysis') {
                    this.analyzeProject();
                }
            });
        }
    }

    /**
     * Show call hierarchy for function at cursor or selection
     */
    private async showCallHierarchy(uri?: vscode.Uri, position?: vscode.Position): Promise<void> {
        // Run analysis if not available
        if (!this.lastAnalysisResult || !this.lastAnalysisResult.data) {
            await this.analyzeProject();
            if (!this.lastAnalysisResult || !this.lastAnalysisResult.data) {
                return;
            }
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor. Please open a Python file and place cursor on a function.');
            return;
        }

        if (editor.document.languageId !== 'python') {
            vscode.window.showErrorMessage(
                'Call hierarchy is only available for Python files. Current file type: ' + editor.document.languageId
            );
            return;
        }

        try {
            const functionInfo = this.detectFunctionAtPosition(editor, position);

            if (!functionInfo) {
                vscode.window.showInformationMessage(
                    'No function found at cursor position. Please place cursor on a function name or definition.',
                    'Help'
                ).then(action => {
                    if (action === 'Help') {
                        vscode.window.showInformationMessage(
                            'To show call hierarchy:\n1. Place cursor on a function name\n2. Right-click and select "Show Call Hierarchy"\n3. Or use the command palette: "DoraCodeBirdView: Show Call Hierarchy"'
                        );
                    }
                });
                return;
            }

            this.log(`Showing call hierarchy for function: ${functionInfo.name} in module: ${functionInfo.module}`);

            // Convert analysis result to webview format
            const webviewData = this.convertAnalysisDataForWebview(this.lastAnalysisResult);

            // Validate webview data
            if (!webviewData.functions || !webviewData.functions.nodes || webviewData.functions.nodes.length === 0) {
                vscode.window.showWarningMessage(
                    'No function data available for call hierarchy. The analysis may not have found any function calls.',
                    'Re-run Analysis',
                    'Check Output'
                ).then(action => {
                    if (action === 'Re-run Analysis') {
                        this.analyzeProject();
                    } else if (action === 'Check Output') {
                        this.outputChannel.show();
                    }
                });
                return;
            }

            // Validate that the function exists in analysis data
            if (!this.validateFunctionExists(webviewData, functionInfo)) {
                vscode.window.showWarningMessage(
                    `Function '${functionInfo.name}' not found in analysis data. This could happen if:\n• The function is from an external module\n• The analysis didn't process this file\n• The function name detection failed`,
                    'Re-analyze Project',
                    'Show All Functions'
                ).then(action => {
                    if (action === 'Re-analyze Project') {
                        this.analyzeProject();
                    } else if (action === 'Show All Functions') {
                        this.showAvailableFunctions(webviewData);
                    }
                });
                return;
            }

            // Show the call hierarchy
            this.webviewProvider.showCallHierarchy(webviewData, functionInfo.fullName);

            this.log(`Call hierarchy webview displayed successfully for function: ${functionInfo.fullName}`);
        } catch (error) {
            this.logError('Failed to show call hierarchy', error);
            vscode.window.showErrorMessage(
                'Failed to show call hierarchy. This might be due to function detection issues or data format problems.',
                'Check Output',
                'Try Again'
            ).then(action => {
                if (action === 'Check Output') {
                    this.outputChannel.show();
                } else if (action === 'Try Again') {
                    // Try again with a slight delay
                    setTimeout(() => this.showCallHierarchy(uri, position), 1000);
                }
            });
        }
    }

    /**
     * Show available functions for debugging
     */
    private showAvailableFunctions(webviewData: WebviewAnalysisData): void {
        if (!webviewData.functions || !webviewData.functions.nodes) {
            vscode.window.showInformationMessage('No functions found in analysis data.');
            return;
        }

        const functions = webviewData.functions.nodes.slice(0, 20); // Show first 20 functions
        const functionList = functions.map(f => `${f.module}.${f.name} (line ${f.lineNumber})`).join('\n');

        vscode.window.showInformationMessage(
            `Available Functions (showing first 20 of ${webviewData.functions.nodes.length}):`,
            { modal: true, detail: functionList }
        );
    }

    /**
     * Detect function at the given position in the editor
     */
    private detectFunctionAtPosition(editor: vscode.TextEditor, position?: vscode.Position): { name: string; module: string; fullName: string; line: number } | null {
        const currentPosition = position || editor.selection.active;
        const document = editor.document;

        // Get word at cursor position
        const wordRange = document.getWordRangeAtPosition(currentPosition);
        if (!wordRange) {
            return null;
        }

        const functionName = document.getText(wordRange);

        // Basic validation - function names should be valid Python identifiers
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(functionName)) {
            return null;
        }

        // Get the current line to check context
        const line = document.lineAt(currentPosition.line);
        const lineText = line.text.trim();

        // Check if we're on a function definition line
        const defMatch = lineText.match(/^\s*def\s+(\w+)\s*\(/);
        if (defMatch && defMatch[1] === functionName) {
            // We're on a function definition
            const module = this.getModuleNameFromPath(document.uri.fsPath);
            return {
                name: functionName,
                module: module,
                fullName: `${module}.${functionName}`,
                line: currentPosition.line + 1
            };
        }

        // Check if we're on a method definition line
        const methodMatch = lineText.match(/^\s*def\s+(\w+)\s*\(/);
        if (methodMatch && methodMatch[1] === functionName) {
            // Find the containing class
            const className = this.findContainingClass(document, currentPosition.line);
            const module = this.getModuleNameFromPath(document.uri.fsPath);
            const fullName = className ? `${module}.${className}.${functionName}` : `${module}.${functionName}`;

            return {
                name: functionName,
                module: module,
                fullName: fullName,
                line: currentPosition.line + 1
            };
        }

        // Check if we're on a function call
        if (lineText.includes(functionName + '(')) {
            // This might be a function call - try to resolve it
            const module = this.getModuleNameFromPath(document.uri.fsPath);

            // For function calls, we'll use a simple heuristic
            // In a real implementation, we'd need more sophisticated analysis
            return {
                name: functionName,
                module: module,
                fullName: `${module}.${functionName}`,
                line: currentPosition.line + 1
            };
        }

        return null;
    }

    /**
     * Get module name from file path
     */
    private getModuleNameFromPath(filePath: string): string {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return path.basename(filePath, '.py');
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const relativePath = path.relative(workspaceRoot, filePath);

        // Convert file path to module name
        return relativePath
            .replace(/\.py$/, '')
            .replace(/\//g, '.')
            .replace(/\\/g, '.')
            .replace(/\.__init__$/, '');
    }

    /**
     * Find the containing class for a method
     */
    private findContainingClass(document: vscode.TextDocument, lineNumber: number): string | null {
        // Look backwards from the current line to find a class definition
        for (let i = lineNumber - 1; i >= 0; i--) {
            const line = document.lineAt(i);
            const classMatch = line.text.match(/^\s*class\s+(\w+)/);
            if (classMatch) {
                return classMatch[1];
            }

            // If we hit another function definition at the same or lower indentation level, stop
            const funcMatch = line.text.match(/^\s*def\s+/);
            if (funcMatch) {
                const currentIndent = line.text.search(/\S/);
                const targetIndent = document.lineAt(lineNumber).text.search(/\S/);
                if (currentIndent <= targetIndent) {
                    break;
                }
            }
        }

        return null;
    }

    /**
     * Validate that the function exists in the analysis data
     */
    private validateFunctionExists(webviewData: WebviewAnalysisData, functionInfo: { name: string; module: string; fullName: string }): boolean {
        if (!webviewData.functions) {
            return false;
        }

        // Check if the function exists in the analysis data
        const functionExists = webviewData.functions.nodes.some(func =>
            func.id === functionInfo.fullName ||
            func.name === functionInfo.name ||
            (func.module === functionInfo.module && func.name === functionInfo.name)
        );

        return functionExists;
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
        vscode.commands.executeCommand('workbench.action.openSettings', 'doracodebird');
    }

    /**
     * Validate extension configuration
     */
    private validateConfiguration(): { isValid: boolean; issues: string[] } {
        const config = this.getConfiguration();
        const issues: string[] = [];

        // Check Python path if configured
        const pythonPath = config.get<string>('pythonPath');
        if (pythonPath && !this.isValidPath(pythonPath)) {
            issues.push(`Configured Python path does not exist: ${pythonPath}`);
        }

        // Check complexity thresholds
        const thresholds = config.get<any>('complexityThresholds');
        if (thresholds) {
            if (thresholds.low >= thresholds.medium || thresholds.medium >= thresholds.high) {
                issues.push('Complexity thresholds must be in ascending order (low < medium < high)');
            }
        }

        // Check timeout value
        const timeout = config.get<number>('analysisTimeout');
        if (timeout && (timeout < 10000 || timeout > 600000)) {
            issues.push('Analysis timeout should be between 10 seconds and 10 minutes');
        }

        return {
            isValid: issues.length === 0,
            issues
        };
    }

    /**
     * Check if a path exists and is accessible
     */
    private isValidPath(filePath: string): boolean {
        try {
            const fs = require('fs');
            return fs.existsSync(filePath);
        } catch {
            return false;
        }
    }

    /**
     * Show function complexity details
     */
    private showFunctionComplexityDetails(func: FunctionComplexityData, uri: vscode.Uri, position: vscode.Position): void {
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
                this.showCallHierarchy(uri, position);
            }
        });
    }

    /**
     * Validate and show configuration status
     */
    private validateAndShowConfiguration(): void {
        const validation = this.validateConfiguration();

        if (validation.isValid) {
            vscode.window.showInformationMessage('✅ Configuration is valid and ready to use.');
        } else {
            const issues = validation.issues.join('\n• ');
            vscode.window.showWarningMessage(
                'Configuration Issues Detected',
                { modal: true, detail: `The following issues were found:\n\n• ${issues}\n\nPlease fix these issues for optimal performance.` },
                'Open Settings'
            ).then(action => {
                if (action === 'Open Settings') {
                    this.openSettings();
                }
            });
        }
    }

    /**
     * Show Graph View from context menu
     */
    private async showGraphViewFromContext(uri?: vscode.Uri, position?: vscode.Position): Promise<void> {
        this.log('Graph View requested from context menu');

        // Run analysis if not available
        if (!this.lastAnalysisResult || !this.lastAnalysisResult.data) {
            await this.analyzeProject();
            if (!this.lastAnalysisResult || !this.lastAnalysisResult.data) {
                return;
            }
        }

        // Show the module graph
        this.showModuleGraph();
    }

    /**
     * Show JSON View from context menu
     */
    private async showJsonViewFromContext(uri?: vscode.Uri, position?: vscode.Position): Promise<void> {
        this.log('JSON View requested from context menu');

        // Run analysis if not available
        if (!this.lastAnalysisResult || !this.lastAnalysisResult.data) {
            await this.analyzeProject();
            if (!this.lastAnalysisResult || !this.lastAnalysisResult.data) {
                return;
            }
        }

        // Show the JSON view
        this.showJsonView();
    }

    /**
     * Show raw analysis data in JSON format
     */
    private async showJsonView(): Promise<void> {
        // This method should only be called when analysis data is available
        if (!this.lastAnalysisResult || !this.lastAnalysisResult.data) {
            return;
        }

        try {
            this.log('Showing JSON view of analysis data');

            // Create a new untitled document with JSON content
            const jsonContent = JSON.stringify(this.lastAnalysisResult.data, null, 2);
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
     * Cancel the currently running analysis
     */
    private cancelAnalysis(): void {
        if (this.isAnalyzing) {
            this.analyzerRunner.cancelAnalysis();
            this.performAnalysisCleanup();
            this.log('Analysis cancellation requested');
            vscode.window.showInformationMessage('Analysis cancelled');
        } else {
            vscode.window.showInformationMessage('No analysis is currently running');
        }
    }

    /**
     * Perform cleanup after analysis completion or cancellation
     */
    private performAnalysisCleanup(): void {
        this.isAnalyzing = false;
        this.statusBarItem.text = '$(graph) DoraCodeBirdView';

        // Reset progress indicators
        // Note: VS Code progress dialogs are automatically cleaned up when the promise resolves/rejects
    }

    /**
     * Handle Git analysis errors
     */
    private handleGitAnalysisError(result: any, analysisType: string): void {
        const errors = result.errors || [];
        
        // Log all errors
        errors.forEach((error: any) => {
            this.logError(`${analysisType} error (${error.type || 'unknown'})`, new Error(error.message || 'Unknown error'));
        });

        // Check for specific error types
        const hasGitError = errors.some((e: any) => 
            e.message?.toLowerCase().includes('not a git repository') ||
            e.message?.toLowerCase().includes('git') ||
            e.type === 'git_error'
        );

        const hasPythonError = errors.some((e: any) => 
            e.message?.toLowerCase().includes('python') ||
            e.type === 'python_error'
        );

        if (hasGitError) {
            vscode.window.showErrorMessage(
                `${analysisType} failed: This workspace is not a Git repository or Git is not accessible.`,
                'Check Git Installation',
                'View Output'
            ).then(action => {
                if (action === 'Check Git Installation') {
                    vscode.env.openExternal(vscode.Uri.parse('https://git-scm.com/downloads'));
                } else if (action === 'View Output') {
                    this.outputChannel.show();
                }
            });
        } else if (hasPythonError) {
            vscode.window.showErrorMessage(
                `${analysisType} failed: Python or required dependencies are not available.`,
                'Check Python Installation',
                'View Output'
            ).then(action => {
                if (action === 'Check Python Installation') {
                    this.openSettings();
                } else if (action === 'View Output') {
                    this.outputChannel.show();
                }
            });
        } else {
            vscode.window.showErrorMessage(
                `${analysisType} failed. Check output for details.`,
                'View Output',
                'Retry'
            ).then(action => {
                if (action === 'View Output') {
                    this.outputChannel.show();
                } else if (action === 'Retry') {
                    // Retry based on analysis type
                    if (analysisType === 'Git Author Statistics') {
                        this.showGitAuthorStatistics();
                    } else if (analysisType === 'Git Module Contributions') {
                        this.showGitModuleContributions();
                    } else if (analysisType === 'Git Commit Timeline') {
                        this.showGitCommitTimeline();
                    }
                }
            });
        }
    }

    /**
     * Initialize Git repository helper
     */
    private async initializeGitRepository(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const choice = await vscode.window.showInformationMessage(
            'Would you like to initialize a Git repository in this workspace?',
            'Yes, Initialize',
            'Cancel'
        );

        if (choice === 'Yes, Initialize') {
            const terminal = vscode.window.createTerminal('Git Init');
            terminal.sendText(`cd "${workspaceFolders[0].uri.fsPath}" && git init`);
            terminal.show();
            
            vscode.window.showInformationMessage(
                'Git repository initialization started. After initialization, you can use Git analytics.',
                'Learn More'
            ).then(action => {
                if (action === 'Learn More') {
                    vscode.env.openExternal(vscode.Uri.parse('https://git-scm.com/book/en/v2/Git-Basics-Getting-a-Git-Repository'));
                }
            });
        }
    }

    /**
     * Check Git installation helper
     */
    private async checkGitInstallation(): Promise<void> {
        const terminal = vscode.window.createTerminal('Git Check');
        terminal.sendText('git --version');
        terminal.show();
        
        vscode.window.showInformationMessage(
            'Check the terminal output to see if Git is installed. If not, please install Git.',
            'Install Git'
        ).then(action => {
            if (action === 'Install Git') {
                vscode.env.openExternal(vscode.Uri.parse('https://git-scm.com/downloads'));
            }
        });
    }

    /**
     * Show first commit help
     */
    private async showFirstCommitHelp(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return;
        }

        const choice = await vscode.window.showInformationMessage(
            'To use Git analytics, you need to make at least one commit. Would you like help with making your first commit?',
            'Open Terminal',
            'Learn More'
        );

        if (choice === 'Open Terminal') {
            const terminal = vscode.window.createTerminal('First Commit');
            terminal.sendText(`cd "${workspaceFolders[0].uri.fsPath}"`);
            terminal.sendText('# Add all files to staging area');
            terminal.sendText('git add .');
            terminal.sendText('# Make your first commit');
            terminal.sendText('git commit -m "Initial commit"');
            terminal.show();
        } else if (choice === 'Learn More') {
            vscode.env.openExternal(vscode.Uri.parse('https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository'));
        }
    }

    /**
     * Show permission help
     */
    private async showPermissionHelp(): Promise<void> {
        const message = `Git permission issues can occur due to:

1. File/directory permissions
2. Git repository ownership
3. SSH key issues (for remote repositories)

Try these solutions:
- Check file permissions: ls -la .git
- Fix ownership: sudo chown -R $USER:$USER .git
- For SSH issues, check your SSH keys

Would you like to open a terminal to check permissions?`;

        const choice = await vscode.window.showInformationMessage(
            'Git Permission Issues',
            { modal: true, detail: message },
            'Open Terminal',
            'Learn More'
        );

        if (choice === 'Open Terminal') {
            const terminal = vscode.window.createTerminal('Git Permissions');
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders) {
                terminal.sendText(`cd "${workspaceFolders[0].uri.fsPath}"`);
                terminal.sendText('ls -la .git');
            }
            terminal.show();
        } else if (choice === 'Learn More') {
            vscode.env.openExternal(vscode.Uri.parse('https://git-scm.com/book/en/v2/Git-on-the-Server-Setting-Up-the-Server'));
        }
    }

    /**
     * Display Git Author Statistics (fallback method)
     */
    private displayGitAuthorStatistics(data: any): void {
        const authors = data.author_contributions || [];
        
        if (authors.length === 0) {
            vscode.window.showInformationMessage('No Git author statistics found in this repository.');
            return;
        }

        // Create a simple text summary
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
                // Try to show in webview or output
                this.outputChannel.appendLine('\n=== Git Author Statistics ===');
                this.outputChannel.appendLine(JSON.stringify(data, null, 2));
                this.outputChannel.show();
            }
        });
    }

    /**
     * Display Git Module Contributions (fallback method)
     */
    private displayGitModuleContributions(data: any): void {
        const moduleStats = data.module_statistics || {};
        const modules = Object.keys(moduleStats);
        
        if (modules.length === 0) {
            vscode.window.showInformationMessage('No Git module contributions found in this repository.');
            return;
        }

        // Create a simple text summary
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
                // Try to show in webview or output
                this.outputChannel.appendLine('\n=== Git Module Contributions ===');
                this.outputChannel.appendLine(JSON.stringify(data, null, 2));
                this.outputChannel.show();
            }
        });
    }

    /**
     * Display Git Commit Timeline (fallback method)
     */
    private displayGitCommitTimeline(data: any): void {
        const timeline = data.commit_timeline || [];
        const repoInfo = data.repository_info || {};
        
        if (timeline.length === 0) {
            vscode.window.showInformationMessage('No Git commit timeline found in this repository.');
            return;
        }

        // Create a simple text summary
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
                // Try to show in webview or output
                this.outputChannel.appendLine('\n=== Git Commit Timeline ===');
                this.outputChannel.appendLine(JSON.stringify(data, null, 2));
                this.outputChannel.show();
            }
        });
    }

    /**
     * Clear analysis cache
     */
    private async clearCache(): Promise<void> {
        try {
            // Clear the last analysis result
            this.lastAnalysisResult = null;

            // Clear sidebar, CodeLens, and webview data
            this.sidebarProvider.updateAnalysisData(null);
            this.codeLensProvider.updateAnalysisData(null);
            this.webviewProvider.updateAnalysisData(null);

            // TODO: Implement file-based cache clearing logic when caching is implemented
            this.log('Analysis cache cleared');
            vscode.window.showInformationMessage('Analysis cache cleared');
        } catch (error) {
            this.logError('Failed to clear cache', error);
            vscode.window.showErrorMessage('Failed to clear cache');
        }
    }

    /**
     * Convert analysis result to webview data format
     */
    private convertAnalysisDataForWebview(result: AnalysisResult): WebviewAnalysisData {
        const webviewData: WebviewAnalysisData = {};

        try {
            if (result?.data) {
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
            }
        } catch (error) {
            this.logError('Error converting modules data for webview', error);
            webviewData.modules = { nodes: [], edges: [] };
        }

        try {
            // Convert functions data - handle the new nested structure
            if (result.data.functions) {
                const functionsData = result.data.functions;

                webviewData.functions = {
                    nodes: (functionsData.nodes || []).map((func: any) => {
                        if (!func) {
                            return {
                                id: 'unknown',
                                name: 'unknown',
                                module: 'unknown',
                                complexity: 0,
                                lineNumber: 0,
                                parameters: []
                            };
                        }
                        return {
                            id: func.id || `${func.module || 'unknown'}.${func.name || 'unknown'}`,
                            name: func.name || 'unknown',
                            module: func.module || 'unknown',
                            complexity: func.complexity || 0,
                            lineNumber: func.line_number || 0,
                            parameters: func.parameters || []
                        };
                    }),
                    edges: (functionsData.edges || []).map((edge: any) => ({
                        caller: edge?.caller || 'unknown',
                        callee: edge?.callee || 'unknown',
                        callCount: edge?.call_count || 1,
                        lineNumbers: edge?.line_numbers || []
                    }))
                };
            }
        } catch (error) {
            this.logError('Error converting functions data for webview', error);
            webviewData.functions = { nodes: [], edges: [] };
        }

        try {
            // Convert tech stack data
            if (result.data.tech_stack) {
                webviewData.techStack = {
                    libraries: (result.data.tech_stack.libraries || []).map((lib: any) => ({
                        name: lib?.name || 'unknown',
                        version: lib?.version,
                        category: lib?.type || lib?.source
                    })),
                    pythonVersion: result.data.tech_stack.python_version || 'Unknown',
                    frameworks: result.data.tech_stack.frameworks || [],
                    packageManager: result.data.tech_stack.package_manager || 'pip'
                };
            }
        } catch (error) {
            this.logError('Error converting tech stack data for webview', error);
            webviewData.techStack = {
                libraries: [],
                pythonVersion: 'Unknown',
                frameworks: [],
                packageManager: 'pip'
            };
        }

        try {
            // Convert framework patterns data
            if (result.data.framework_patterns) {
                webviewData.frameworkPatterns = this.convertFrameworkPatterns(result.data.framework_patterns);
            }
        } catch (error) {
            this.logError('Error converting framework patterns for webview', error);
            webviewData.frameworkPatterns = {};
        }

        return webviewData;
    }

    /**
     * Convert analysis result to tabbed webview data format
     */
    private convertAnalysisDataForTabbedView(result: AnalysisResult): any {
        const tabbedData: any = {};

        try {
            if (result?.data) {
                // Convert tech stack data
                if (result.data.tech_stack) {
                    const techStack = result.data.tech_stack;
                    tabbedData.techStack = {
                        libraries: techStack.libraries || [],
                        frameworks: techStack.frameworks || [],
                        pythonVersion: techStack.python_version || 'Unknown',
                        packageManager: techStack.package_manager || 'pip',
                        dependencies: techStack.dependencies || []
                    };
                }

                // Convert modules data for code graph
                if (result.data.modules) {
                    const modulesData = result.data.modules;
                    tabbedData.modules = {
                        nodes: (modulesData.nodes || []).map((module: any) => ({
                            id: module.id || module.name || 'unknown',
                            name: path.basename(module.name || module.id || 'unknown'),
                            displayName: module.display_name || module.name || 'unknown',
                            path: this.convertToRelativePath(module.path || ''),
                            folderPath: path.dirname(module.path || '.'),
                            complexity: {
                                overall: this.extractComplexityValue(module.complexity),
                                cyclomatic: module.cyclomatic_complexity || 0,
                                maintainability: module.maintainability_index || 0,
                                colorCode: this.getComplexityColorCode(this.extractComplexityValue(module.complexity))
                            },
                            fileCount: module.file_count || 1,
                            dependencies: module.dependencies || [],
                            styling: this.getModuleStyling(module),
                            metadata: {
                                lastModified: new Date().toISOString(),
                                size: module.size || 0,
                                functions: module.functions || [],
                                classes: module.classes || []
                            }
                        })),
                        edges: (modulesData.edges || []).map((edge: any) => ({
                            source: edge?.source || 'unknown',
                            target: edge?.target || 'unknown',
                            type: (edge?.type as 'import' | 'dependency') || 'import',
                            weight: edge?.weight || 1
                        })),
                        folderStructure: {
                            rootPath: '.',
                            folders: [],
                            moduleGroupings: []
                        }
                    };
                }

                // Convert functions data
                if (result.data.functions) {
                    const functionsData = result.data.functions;
                    tabbedData.functions = {
                        nodes: (functionsData.nodes || []).map((func: any) => ({
                            id: func.id || func.name || 'unknown',
                            name: func.name || 'unknown',
                            module: func.module || 'unknown',
                            complexity: this.extractComplexityValue(func.complexity),
                            lineNumber: func.line_number || 0,
                            parameters: func.parameters || []
                        })),
                        edges: (functionsData.edges || []).map((edge: any) => ({
                            caller: edge?.caller || 'unknown',
                            callee: edge?.callee || 'unknown',
                            callCount: edge?.call_count || 1,
                            lineNumbers: edge?.line_numbers || []
                        }))
                    };
                }
            }
        } catch (error) {
            this.logError('Error converting analysis data for tabbed view', error);
        }

        return tabbedData;
    }

    /**
     * Get complexity color code
     */
    private getComplexityColorCode(complexity: number): 'green' | 'orange' | 'red' {
        if (complexity <= 5) return 'green';
        if (complexity <= 10) return 'orange';
        return 'red';
    }

    /**
     * Get module styling
     */
    private getModuleStyling(module: any): any {
        const complexity = this.extractComplexityValue(module.complexity);
        const colorCode = this.getComplexityColorCode(complexity);
        
        const colors = {
            green: { bg: '#27ae60', border: '#229954' },
            orange: { bg: '#f39c12', border: '#e67e22' },
            red: { bg: '#e74c3c', border: '#c0392b' }
        };

        return {
            backgroundColor: colors[colorCode].bg,
            borderColor: colors[colorCode].border,
            borderWidth: 2,
            borderRadius: 8,
            shadowStyle: '0 2px 4px rgba(0,0,0,0.1)',
            textColor: '#ffffff',
            fontSize: '12px',
            padding: '8px',
            minWidth: 120,
            minHeight: 80
        };
    }

    /**
     * Convert database schema analysis result to tabbed webview data format
     */
    private convertDatabaseSchemaForTabbedView(schemaData: any): any {
        try {
            const tabbedData: any = {
                dbSchema: {
                    tables: [],
                    relationships: [],
                    indexes: [],
                    constraints: [],
                    rawSQL: [],
                    graphData: { nodes: [], edges: [] },
                    metadata: {
                        analysisDate: new Date().toISOString(),
                        totalTables: 0,
                        totalRelationships: 0
                    }
                }
            };

            if (schemaData) {
                // Convert tables
                if (schemaData.tables) {
                    tabbedData.dbSchema.tables = schemaData.tables.map((table: any) => ({
                        name: table.name || 'unknown',
                        schema: table.schema || 'public',
                        columns: (table.columns || []).map((col: any) => ({
                            name: col.name || 'unknown',
                            dataType: col.data_type || 'VARCHAR',
                            nullable: col.nullable !== false,
                            defaultValue: col.default_value,
                            maxLength: col.max_length,
                            isPrimaryKey: col.is_primary_key || false,
                            isForeignKey: col.is_foreign_key || false
                        })),
                        primaryKeys: table.primary_keys || [],
                        foreignKeys: (table.foreign_keys || []).map((fk: any) => ({
                            columnName: fk.column || fk.column_name,
                            referencedTable: fk.referenced_table,
                            referencedColumn: fk.referenced_column || 'id'
                        })),
                        indexes: table.indexes || [],
                        constraints: table.constraints || [],
                        estimatedRows: table.estimated_rows
                    }));
                }

                // Convert relationships
                if (schemaData.relationships) {
                    tabbedData.dbSchema.relationships = schemaData.relationships.map((rel: any) => ({
                        fromTable: rel.from_table,
                        toTable: rel.to_table,
                        relationshipType: rel.relationship_type || 'one-to-many',
                        foreignKeyColumn: rel.foreign_key_column,
                        referencedColumn: rel.referenced_column || 'id'
                    }));
                }

                // Convert raw SQL statements
                if (schemaData.raw_sql) {
                    tabbedData.dbSchema.rawSQL = schemaData.raw_sql.map((stmt: any) => ({
                        statementType: stmt.statement_type || 'UNKNOWN',
                        content: stmt.content || '',
                        filePath: stmt.file_path || '',
                        lineNumber: stmt.line_number || 0,
                        tableReferences: stmt.table_references || []
                    }));
                }

                // Convert graph data
                if (schemaData.graph_data) {
                    tabbedData.dbSchema.graphData = {
                        nodes: (schemaData.graph_data.nodes || []).map((node: any) => ({
                            id: node.id,
                            label: node.label || node.table_name,
                            table: tabbedData.dbSchema.tables.find((t: any) => t.name === node.table_name) || {
                                name: node.table_name,
                                columns: []
                            },
                            position: node.position
                        })),
                        edges: (schemaData.graph_data.edges || []).map((edge: any) => ({
                            source: edge.source,
                            target: edge.target,
                            relationship: tabbedData.dbSchema.relationships.find((r: any) => 
                                r.fromTable === edge.source && r.toTable === edge.target
                            ) || {
                                relationshipType: 'unknown',
                                foreignKeyColumn: 'unknown',
                                referencedColumn: 'id'
                            }
                        }))
                    };
                }

                // Update metadata
                tabbedData.dbSchema.metadata = {
                    analysisDate: schemaData.metadata?.analysis_timestamp || new Date().toISOString(),
                    totalTables: tabbedData.dbSchema.tables.length,
                    totalRelationships: tabbedData.dbSchema.relationships.length,
                    databaseType: schemaData.metadata?.frameworks_detected?.join(', ') || 'Unknown'
                };
            }

            this.log(`Converted database schema data: ${tabbedData.dbSchema.tables.length} tables, ${tabbedData.dbSchema.relationships.length} relationships, ${tabbedData.dbSchema.rawSQL.length} SQL statements`);
            
            return tabbedData;

        } catch (error) {
            this.logError('Error converting database schema data for tabbed view', error);
            return {
                dbSchema: {
                    tables: [],
                    relationships: [],
                    indexes: [],
                    constraints: [],
                    rawSQL: [],
                    graphData: { nodes: [], edges: [] },
                    metadata: {
                        analysisDate: new Date().toISOString(),
                        totalTables: 0,
                        totalRelationships: 0
                    }
                }
            };
        }
    }

    /**
     * Convert Git analytics result to tabbed webview data format
     */
    private convertGitAnalyticsForTabbedView(gitData: any, analysisType: string): any {
        try {
            const tabbedData: any = {
                gitAnalytics: {
                    repositoryInfo: {
                        name: 'unknown',
                        branch: 'unknown',
                        totalCommits: 0,
                        dateRange: {
                            start: new Date().toISOString(),
                            end: new Date().toISOString()
                        },
                        contributors: 0
                    },
                    authorContributions: [],
                    moduleStatistics: [],
                    commitTimeline: [],
                    contributionGraphs: [],
                    analysisType: analysisType
                }
            };

            if (gitData) {
                // Convert repository info
                if (gitData.repository_info) {
                    const repoInfo = gitData.repository_info;
                    tabbedData.gitAnalytics.repositoryInfo = {
                        name: repoInfo.name || 'unknown',
                        branch: repoInfo.branch || 'unknown',
                        totalCommits: repoInfo.total_commits || 0,
                        dateRange: {
                            start: repoInfo.date_range?.start || new Date().toISOString(),
                            end: repoInfo.date_range?.end || new Date().toISOString()
                        },
                        contributors: repoInfo.contributors || 0
                    };
                }

                // Convert author contributions
                if (gitData.author_contributions) {
                    tabbedData.gitAnalytics.authorContributions = gitData.author_contributions.map((author: any) => ({
                        authorName: author.author_name || 'Unknown',
                        authorEmail: author.author_email || '',
                        totalCommits: author.total_commits || 0,
                        linesAdded: author.lines_added || 0,
                        linesRemoved: author.lines_removed || 0,
                        modulesTouched: author.modules_touched || [],
                        firstCommit: author.first_commit || new Date().toISOString(),
                        lastCommit: author.last_commit || new Date().toISOString(),
                        contributionPercentage: author.contribution_percentage || 0
                    }));
                }

                // Convert module statistics
                if (gitData.module_statistics) {
                    const moduleStats = gitData.module_statistics;
                    tabbedData.gitAnalytics.moduleStatistics = Object.keys(moduleStats).map(modulePath => {
                        const stats = moduleStats[modulePath];
                        return {
                            modulePath: modulePath,
                            totalCommits: stats.total_commits || 0,
                            uniqueAuthors: stats.unique_authors || 0,
                            linesAdded: stats.lines_added || 0,
                            linesRemoved: stats.lines_removed || 0,
                            authorBreakdown: (stats.author_breakdown || []).map((author: any) => ({
                                authorName: author.author_name || 'Unknown',
                                authorEmail: author.author_email || '',
                                totalCommits: author.total_commits || 0,
                                linesAdded: author.lines_added || 0,
                                linesRemoved: author.lines_removed || 0,
                                contributionPercentage: author.contribution_percentage || 0
                            })),
                            commitFrequency: stats.commit_frequency || {}
                        };
                    });
                }

                // Convert commit timeline
                if (gitData.commit_timeline) {
                    if (gitData.commit_timeline.timeline_entries) {
                        // Handle timeline visualization data format
                        tabbedData.gitAnalytics.commitTimeline = gitData.commit_timeline.timeline_entries.map((entry: any) => ({
                            date: entry.date || new Date().toISOString(),
                            commits: entry.commit_count || 0,
                            authors: entry.authors || [],
                            modules: entry.modules || []
                        }));
                    } else if (Array.isArray(gitData.commit_timeline)) {
                        // Handle direct timeline array format
                        tabbedData.gitAnalytics.commitTimeline = gitData.commit_timeline.map((entry: any) => ({
                            date: entry.date || new Date().toISOString(),
                            commits: entry.commit_count || 0,
                            authors: Array.from(entry.authors || []),
                            modules: entry.modules || []
                        }));
                    }
                }

                // Convert contribution graphs
                if (gitData.contribution_graphs) {
                    tabbedData.gitAnalytics.contributionGraphs = gitData.contribution_graphs.map((graph: any) => ({
                        type: graph.type || 'commits',
                        data: {
                            labels: graph.data?.labels || [],
                            datasets: (graph.data?.datasets || []).map((dataset: any) => ({
                                label: dataset.label || '',
                                data: dataset.data || [],
                                backgroundColor: dataset.backgroundColor || dataset.background_color || '#36A2EB',
                                borderColor: dataset.borderColor || dataset.border_color || '#36A2EB'
                            }))
                        }
                    }));
                }
            }

            this.log(`Converted Git analytics data for ${analysisType}: ${tabbedData.gitAnalytics.authorContributions.length} authors, ${tabbedData.gitAnalytics.moduleStatistics.length} modules, ${tabbedData.gitAnalytics.commitTimeline.length} timeline entries`);
            
            return tabbedData;

        } catch (error) {
            this.logError('Error converting Git analytics data for tabbed view', error);
            return {
                gitAnalytics: {
                    repositoryInfo: {
                        name: 'unknown',
                        branch: 'unknown',
                        totalCommits: 0,
                        dateRange: {
                            start: new Date().toISOString(),
                            end: new Date().toISOString()
                        },
                        contributors: 0
                    },
                    authorContributions: [],
                    moduleStatistics: [],
                    commitTimeline: [],
                    contributionGraphs: [],
                    analysisType: analysisType
                }
            };
        }
    }

    /**
     * Convert absolute path to relative path from workspace root
     */
    private convertToRelativePath(absolutePath: string): string {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || !absolutePath) {
            return absolutePath || '';
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        try {
            const relativePath = path.relative(workspaceRoot, absolutePath);
            return relativePath.startsWith('..') ? absolutePath : relativePath;
        } catch (error) {
            this.logError('Failed to convert path to relative', error);
            return absolutePath;
        }
    }

    /**
     * Extract complexity value from complexity object or number
     */
    private extractComplexityValue(complexity: any): number {
        if (typeof complexity === 'number') {
            return complexity;
        }
        if (complexity && typeof complexity === 'object') {
            return complexity.cyclomatic || complexity.value || 0;
        }
        return 0;
    }

    /**
     * Convert framework patterns to webview format
     */
    private convertFrameworkPatterns(patterns: any): any {
        const converted: any = {};

        try {
            if (patterns?.django) {
                converted.django = {
                    urlPatterns: (patterns.django.url_patterns || []).map((pattern: any) => ({
                        pattern: pattern?.pattern || '',
                        viewName: pattern?.view_name || '',
                        viewFunction: pattern?.view_function || '',
                        namespace: pattern?.namespace
                    })),
                    views: (patterns.django.views || []).map((view: any) => ({
                        name: view?.name || 'unknown',
                        file: this.convertToRelativePath(view?.file_path || ''),
                        lineNumber: view?.line_number || 0
                    })),
                    models: (patterns.django.models || []).map((model: any) => ({
                        name: model?.name || 'unknown',
                        file: this.convertToRelativePath(model?.file_path || ''),
                        lineNumber: model?.line_number || 0
                    })),
                    serializers: (patterns.django.serializers || []).map((serializer: any) => ({
                        name: serializer?.name || 'unknown',
                        file: this.convertToRelativePath(serializer?.file_path || ''),
                        lineNumber: serializer?.line_number || 0
                    }))
                };
            }
        } catch (error) {
            this.logError('Error converting Django patterns', error);
        }

        try {
            if (patterns?.flask) {
                converted.flask = {
                    routes: (patterns.flask.routes || []).map((route: any) => ({
                        pattern: route?.pattern || '',
                        methods: route?.methods || [],
                        function: route?.function || '',
                        file: this.convertToRelativePath(route?.file_path || ''),
                        lineNumber: route?.line_number || 0
                    })),
                    blueprints: (patterns.flask.blueprints || []).map((blueprint: any) => ({
                        name: blueprint?.name || 'unknown',
                        file: this.convertToRelativePath(blueprint?.file_path || ''),
                        routes: [] // Routes are handled separately
                    }))
                };
            }
        } catch (error) {
            this.logError('Error converting Flask patterns', error);
        }

        try {
            if (patterns?.fastapi) {
                converted.fastapi = {
                    routes: (patterns.fastapi.routes || []).map((route: any) => ({
                        pattern: route?.pattern || '',
                        method: route?.method || '',
                        function: route?.function || '',
                        file: this.convertToRelativePath(route?.file_path || ''),
                        lineNumber: route?.line_number || 0
                    })),
                    dependencies: (patterns.fastapi.dependencies || []).map((dep: any) => ({
                        name: dep?.name || 'unknown',
                        file: this.convertToRelativePath(dep?.file_path || ''),
                        lineNumber: dep?.line_number || 0
                    }))
                };
            }
        } catch (error) {
            this.logError('Error converting FastAPI patterns', error);
        }

        return converted;
    }

    /**
     * Update sidebar with analysis data
     */
    private updateSidebar(result: AnalysisResult): void {
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
            this.webviewProvider.updateAnalysisData(webviewData);

            this.log('Sidebar, CodeLens, and Webview updated with analysis data');
        }
    }

    /**
     * Navigate to a code item from the sidebar
     */
    private async navigateToItem(item: DoraCodeBirdTreeItem): Promise<void> {
        try {
            let filePath: string | undefined;
            let lineNumber: number | undefined;

            switch (item.itemType) {
                case TreeItemType.MODULE:
                    const module = item.data;
                    filePath = module?.path;
                    break;

                case TreeItemType.FUNCTION:
                case TreeItemType.METHOD:
                    const func = item.data;
                    // Find the module that contains this function
                    const containingModule = this.findModuleByName(func?.module);
                    if (containingModule?.path) {
                        filePath = containingModule.path;
                        lineNumber = func.line_number;
                    }
                    break;

                case TreeItemType.CLASS:
                    const cls = item.data;
                    // Find the module that contains this class
                    const classModule = this.findModuleByName(cls?.module);
                    if (classModule?.path) {
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
    private selectModule(item: DoraCodeBirdTreeItem): void {
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
    private async showModuleDependencies(item: DoraCodeBirdTreeItem): Promise<void> {
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
     * Find module by name in the last analysis result
     */
    private findModuleByName(moduleName: string): any {
        if (!this.lastAnalysisResult || !this.lastAnalysisResult.data || !moduleName) {
            return null;
        }

        // Handle both old format (array) and new format (object with nodes)
        let modules: any[] = [];
        if (Array.isArray(this.lastAnalysisResult.data.modules)) {
            modules = this.lastAnalysisResult.data.modules;
        } else if (this.lastAnalysisResult.data.modules?.nodes && Array.isArray(this.lastAnalysisResult.data.modules.nodes)) {
            modules = this.lastAnalysisResult.data.modules.nodes;
        }

        return modules.find((module: any) =>
            module?.name === moduleName || module?.name?.endsWith(moduleName)
        );
    }

    /**
     * Show Full Analysis Tech Stack
     */
    private async showFullAnalysisTechStack(): Promise<void> {
        this.log('Full Analysis Tech Stack requested');
        
        // Run analysis if not available
        if (!this.lastAnalysisResult || !this.lastAnalysisResult.data) {
            await this.analyzeProject();
            if (!this.lastAnalysisResult || !this.lastAnalysisResult.data) {
                return;
            }
        }

        // Convert analysis result to webview format and show tech stack
        const webviewData = this.convertAnalysisDataForWebview(this.lastAnalysisResult);
        this.webviewProvider.showTechStack(webviewData);
    }

    /**
     * Show Full Analysis Graph View
     */
    private async showFullAnalysisGraphView(): Promise<void> {
        this.log('Full Analysis Graph View requested');
        
        // Run analysis if not available
        if (!this.lastAnalysisResult || !this.lastAnalysisResult.data) {
            await this.analyzeProject();
            if (!this.lastAnalysisResult || !this.lastAnalysisResult.data) {
                return;
            }
        }

        this.showModuleGraph();
    }

    /**
     * Show Full Analysis JSON View
     */
    private async showFullAnalysisJsonView(): Promise<void> {
        this.log('Full Analysis JSON View requested');
        
        // Run analysis if not available
        if (!this.lastAnalysisResult || !this.lastAnalysisResult.data) {
            await this.analyzeProject();
            if (!this.lastAnalysisResult || !this.lastAnalysisResult.data) {
                return;
            }
        }

        this.showJsonView();
    }

    /**
     * Show Current File Analysis
     */
    private async showCurrentFileAnalysis(): Promise<void> {
        this.log('Current File Analysis requested');
        
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor. Please open a Python file.');
            return;
        }

        if (editor.document.languageId !== 'python') {
            vscode.window.showErrorMessage('Current file analysis is only available for Python files.');
            return;
        }

        const filePath = editor.document.uri.fsPath;
        this.log(`Analyzing current file: ${filePath}`);

        try {
            // Show progress dialog
            const result = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Analyzing Current File',
                cancellable: true
            }, async (progress, token) => {
                progress.report({ message: 'Starting file analysis...' });

                // Run current file analysis
                return await this.analyzerRunner.runCurrentFileAnalysis(filePath, progress, token);
            });

            if (result.success && result.data) {
                this.log('Current file analysis completed successfully');
                
                // Show results in tabbed webview using TabbedWebviewProvider
                try {
                    const { TabbedWebviewProvider } = await import('./tabbed-webview-provider');
                    const tabbedProvider = new TabbedWebviewProvider(this.context, this.outputChannel);
                    
                    // Show with Code Graph tab active by default
                    await tabbedProvider.showCurrentFileAnalysis(result.data, 'graph');
                    
                    this.log('Current file analysis displayed in tabbed interface');
                } catch (error) {
                    this.logError('Failed to show current file analysis in tabbed view', error);
                    // Fallback to regular webview
                    await this.webviewProvider.showCurrentFileAnalysis(result.data);
                }

                // Show success message with options
                const action = await vscode.window.showInformationMessage(
                    'Current file analysis completed successfully!',
                    'Show Code Graph',
                    'Show Code Graph JSON',
                    'View Output'
                );

                if (action === 'Show Code Graph') {
                    try {
                        const { TabbedWebviewProvider } = await import('./tabbed-webview-provider');
                        const tabbedProvider = new TabbedWebviewProvider(this.context, this.outputChannel);
                        await tabbedProvider.showCurrentFileAnalysis(result.data, 'graph');
                    } catch (error) {
                        await this.webviewProvider.showCurrentFileAnalysis(result.data, 'graph');
                    }
                } else if (action === 'Show Code Graph JSON') {
                    try {
                        const { TabbedWebviewProvider } = await import('./tabbed-webview-provider');
                        const tabbedProvider = new TabbedWebviewProvider(this.context, this.outputChannel);
                        await tabbedProvider.showCurrentFileAnalysis(result.data, 'json');
                    } catch (error) {
                        await this.webviewProvider.showCurrentFileAnalysis(result.data, 'json');
                    }
                } else if (action === 'View Output') {
                    this.outputChannel.show();
                }
            } else {
                this.log('Current file analysis failed or returned no data');
                
                // Show error message with details
                const errors = result.errors || [];
                const errorMessage = errors.length > 0 
                    ? `Analysis failed: ${errors[0].message}`
                    : 'Analysis failed with unknown error';
                
                vscode.window.showErrorMessage(errorMessage, 'View Output').then(action => {
                    if (action === 'View Output') {
                        this.outputChannel.show();
                    }
                });
            }

        } catch (error) {
            this.logError('Current file analysis failed', error);

            if (error instanceof Error && error.message.includes('cancelled')) {
                vscode.window.showInformationMessage('Current file analysis was cancelled');
            } else {
                vscode.window.showErrorMessage('Current file analysis failed. Check output for details.');
            }
        }
    }

    /**
     * Show Full Code Analysis with tabbed interface
     */
    private async showFullCodeAnalysis(): Promise<void> {
        this.log('Full Code Analysis requested');
        
        // Run analysis if not available
        if (!this.lastAnalysisResult || !this.lastAnalysisResult.data) {
            await this.analyzeProject();
            if (!this.lastAnalysisResult || !this.lastAnalysisResult.data) {
                return;
            }
        }

        // Check if we have valid data for visualization
        const hasValidData = this.lastAnalysisResult.data && (
            (this.lastAnalysisResult.data.modules && this.lastAnalysisResult.data.modules.nodes && this.lastAnalysisResult.data.modules.nodes.length > 0) ||
            (this.lastAnalysisResult.data.functions && this.lastAnalysisResult.data.functions.nodes && this.lastAnalysisResult.data.functions.nodes.length > 0) ||
            (this.lastAnalysisResult.data.tech_stack)
        );

        if (!hasValidData) {
            vscode.window.showWarningMessage(
                'No valid data available for full analysis. The analysis may have failed or found no data.',
                'Run Analysis Again'
            ).then(action => {
                if (action === 'Run Analysis Again') {
                    this.analyzeProject();
                }
            });
            return;
        }

        try {
            // Import TabbedWebviewProvider dynamically
            const { TabbedWebviewProvider } = await import('./tabbed-webview-provider');
            const tabbedProvider = new TabbedWebviewProvider(this.context, this.outputChannel);
            
            // Convert analysis result to tabbed format
            const tabbedData = this.convertAnalysisDataForTabbedView(this.lastAnalysisResult);
            
            // Show the full analysis with tabbed interface
            tabbedProvider.showFullAnalysis(tabbedData);
            
            this.log('Full Code Analysis displayed in tabbed interface');
        } catch (error) {
            this.logError('Failed to show Full Code Analysis', error);
            vscode.window.showErrorMessage('Failed to show Full Code Analysis. Check output for details.');
        }
    }

    /**
     * Show Git Author Statistics
     */
    private async showGitAuthorStatistics(): Promise<void> {
        this.log('Git Author Statistics requested');
        
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        try {
            // Show progress dialog
            const result = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Analyzing Git Author Statistics',
                cancellable: true
            }, async (progress, token) => {
                progress.report({ increment: 0, message: 'Initializing Git analysis...' });
                
                // Run Git analytics
                const options = {
                    projectPath: workspaceFolders[0].uri.fsPath,
                    analysisType: 'git_author_statistics',
                    timeout: 120000 // 2 minutes
                };

                progress.report({ increment: 50, message: 'Analyzing Git repository...' });
                
                return await this.analyzerRunner.runGitAnalysis(options, progress, token);
            });

            if (result.success && result.data) {
                this.log('Git author statistics analysis completed successfully');
                
                // Show results in tabbed webview using TabbedWebviewProvider
                try {
                    const { TabbedWebviewProvider } = await import('./tabbed-webview-provider');
                    const tabbedProvider = new TabbedWebviewProvider(this.context, this.outputChannel);
                    
                    // Convert data to tabbed format
                    const tabbedData = this.convertGitAnalyticsForTabbedView(result.data, 'author_statistics');
                    
                    // Show Git Analytics tab
                    tabbedProvider.showTab('git', tabbedData);
                    
                    this.log('Git author statistics displayed in tabbed interface');
                } catch (tabbedError) {
                    this.logError('Failed to show tabbed Git analytics, using fallback', tabbedError);
                    // Fallback to basic display
                    this.displayGitAuthorStatistics(result.data);
                }
            } else {
                this.handleGitAnalysisError(result, 'Git Author Statistics');
            }

        } catch (error) {
            this.logError('Git Author Statistics analysis failed', error);
            
            if (error instanceof Error && error.message.includes('cancelled')) {
                vscode.window.showInformationMessage('Git Author Statistics analysis was cancelled');
            } else if (error instanceof Error && error.message.includes('not a git repository')) {
                vscode.window.showErrorMessage('This workspace is not a Git repository. Git analytics require a Git repository.');
            } else {
                vscode.window.showErrorMessage('Git Author Statistics analysis failed. Check output for details.');
            }
        }
    }

    /**
     * Show Git Module Contributions
     */
    private async showGitModuleContributions(): Promise<void> {
        this.log('Git Module Contributions requested');
        
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        try {
            // Show progress dialog
            const result = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Analyzing Git Module Contributions',
                cancellable: true
            }, async (progress, token) => {
                progress.report({ increment: 0, message: 'Initializing module analysis...' });
                
                // Run Git module analytics
                const options = {
                    projectPath: workspaceFolders[0].uri.fsPath,
                    analysisType: 'git_module_contributions',
                    timeout: 180000 // 3 minutes
                };

                progress.report({ increment: 50, message: 'Analyzing module contributions...' });
                
                return await this.analyzerRunner.runGitAnalysis(options, progress, token);
            });

            if (result.success && result.data) {
                this.log('Git module contributions analysis completed successfully');
                
                // Show results in tabbed webview using TabbedWebviewProvider
                try {
                    const { TabbedWebviewProvider } = await import('./tabbed-webview-provider');
                    const tabbedProvider = new TabbedWebviewProvider(this.context, this.outputChannel);
                    
                    // Convert data to tabbed format
                    const tabbedData = this.convertGitAnalyticsForTabbedView(result.data, 'module_contributions');
                    
                    // Show Git Analytics tab
                    tabbedProvider.showTab('git', tabbedData);
                    
                    this.log('Git module contributions displayed in tabbed interface');
                } catch (tabbedError) {
                    this.logError('Failed to show tabbed Git analytics, using fallback', tabbedError);
                    // Fallback to basic display
                    this.displayGitModuleContributions(result.data);
                }
            } else {
                this.handleGitAnalysisError(result, 'Git Module Contributions');
            }

        } catch (error) {
            this.logError('Git Module Contributions analysis failed', error);
            
            if (error instanceof Error && error.message.includes('cancelled')) {
                vscode.window.showInformationMessage('Git Module Contributions analysis was cancelled');
            } else if (error instanceof Error && error.message.includes('not a git repository')) {
                vscode.window.showErrorMessage('This workspace is not a Git repository. Git analytics require a Git repository.');
            } else {
                vscode.window.showErrorMessage('Git Module Contributions analysis failed. Check output for details.');
            }
        }
    }

    /**
     * Show Git Commit Timeline
     */
    private async showGitCommitTimeline(): Promise<void> {
        this.log('Git Commit Timeline requested');
        
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        try {
            // Show progress dialog
            const result = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Analyzing Git Commit Timeline',
                cancellable: true
            }, async (progress, token) => {
                progress.report({ increment: 0, message: 'Initializing timeline analysis...' });
                
                // Run Git timeline analytics
                const options = {
                    projectPath: workspaceFolders[0].uri.fsPath,
                    analysisType: 'git_commit_timeline',
                    timeout: 120000 // 2 minutes
                };

                progress.report({ increment: 50, message: 'Analyzing commit timeline...' });
                
                return await this.analyzerRunner.runGitAnalysis(options, progress, token);
            });

            if (result.success && result.data) {
                this.log('Git commit timeline analysis completed successfully');
                
                // Show results in tabbed webview using TabbedWebviewProvider
                try {
                    const { TabbedWebviewProvider } = await import('./tabbed-webview-provider');
                    const tabbedProvider = new TabbedWebviewProvider(this.context, this.outputChannel);
                    
                    // Convert data to tabbed format
                    const tabbedData = this.convertGitAnalyticsForTabbedView(result.data, 'commit_timeline');
                    
                    // Show Git Analytics tab
                    tabbedProvider.showTab('git', tabbedData);
                    
                    this.log('Git commit timeline displayed in tabbed interface');
                } catch (tabbedError) {
                    this.logError('Failed to show tabbed Git analytics, using fallback', tabbedError);
                    // Fallback to basic display
                    this.displayGitCommitTimeline(result.data);
                }
            } else {
                this.handleGitAnalysisError(result, 'Git Commit Timeline');
            }

        } catch (error) {
            this.logError('Git Commit Timeline analysis failed', error);
            
            if (error instanceof Error && error.message.includes('cancelled')) {
                vscode.window.showInformationMessage('Git Commit Timeline analysis was cancelled');
            } else if (error instanceof Error && error.message.includes('not a git repository')) {
                vscode.window.showErrorMessage('This workspace is not a Git repository. Git analytics require a Git repository.');
            } else {
                vscode.window.showErrorMessage('Git Commit Timeline analysis failed. Check output for details.');
            }
        }
    }

    /**
     * Format JSON in the current editor
     */
    private async formatJsonInEditor(): Promise<void> {
        this.log('JSON Format requested');
        await this.jsonUtilities.formatJsonInEditor();
    }

    /**
     * Show JSON Tree View
     */
    private async showJsonTreeView(): Promise<void> {
        this.log('JSON Tree View requested');
        await this.jsonUtilities.showJsonTreeView();
    }

    /**
     * Show Database Schema Graph View
     */
    private async showDatabaseSchemaGraphView(): Promise<void> {
        this.log('Database Schema Graph View requested');
        
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        try {
            // Show progress dialog
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Analyzing Database Schema',
                cancellable: true
            }, async (progress, token) => {
                progress.report({ increment: 0, message: 'Scanning for database models and SQL files...' });

                // Run database schema analysis
                const options = {
                    projectPath: workspaceFolders[0].uri.fsPath,
                    pythonPath: this.getConfiguration().get<string>('pythonPath'),
                    timeout: 120000, // 2 minutes
                    enableCaching: this.getConfiguration().get<boolean>('enableCaching', true)
                };

                progress.report({ increment: 30, message: 'Analyzing database models...' });

                const result = await this.analyzerRunner.runDatabaseSchemaAnalysis(options, progress, token);

                progress.report({ increment: 80, message: 'Generating schema graph...' });

                if (result.success && result.data) {
                    // Show database schema in tabbed webview with graph view active
                    const tabbedData = this.convertDatabaseSchemaForTabbedView(result.data);
                    
                    // Import TabbedWebviewProvider if not already available
                    const { TabbedWebviewProvider } = await import('./tabbed-webview-provider');
                    const tabbedProvider = new TabbedWebviewProvider(this.context, this.outputChannel);
                    
                    tabbedProvider.showTab('dbschema', tabbedData);
                    tabbedProvider.switchToTab('dbschema', 'graph');

                    progress.report({ increment: 100, message: 'Database schema graph ready!' });
                } else {
                    const errorMessage = result.errors && result.errors.length > 0 
                        ? result.errors[0].message 
                        : 'Database schema analysis failed';
                    throw new Error(errorMessage);
                }
            });

        } catch (error) {
            this.logError('Database schema graph view failed', error);
            
            if (error instanceof Error && error.message.includes('cancelled')) {
                vscode.window.showInformationMessage('Database schema analysis was cancelled');
            } else {
                vscode.window.showErrorMessage(
                    'Failed to analyze database schema. This could be due to:\n• No database models found (Django/SQLAlchemy)\n• No SQL files in the project\n• Python analysis dependencies missing',
                    'Check Output',
                    'View Requirements'
                ).then(action => {
                    if (action === 'Check Output') {
                        this.outputChannel.show();
                    } else if (action === 'View Requirements') {
                        vscode.window.showInformationMessage(
                            'Database schema analysis requires:\n• Django or SQLAlchemy models in your project\n• OR SQL files (.sql, migrations)\n• Python analyzer dependencies installed'
                        );
                    }
                });
            }
        }
    }

    /**
     * Show Database Schema Raw SQL View
     */
    private async showDatabaseSchemaRawSQL(): Promise<void> {
        this.log('Database Schema Raw SQL View requested');
        
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        try {
            // Show progress dialog
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Extracting SQL Statements',
                cancellable: true
            }, async (progress, token) => {
                progress.report({ increment: 0, message: 'Scanning for SQL files and statements...' });

                // Run database schema analysis
                const options = {
                    projectPath: workspaceFolders[0].uri.fsPath,
                    pythonPath: this.getConfiguration().get<string>('pythonPath'),
                    timeout: 120000, // 2 minutes
                    enableCaching: this.getConfiguration().get<boolean>('enableCaching', true)
                };

                progress.report({ increment: 30, message: 'Parsing SQL files and migrations...' });

                const result = await this.analyzerRunner.runDatabaseSchemaAnalysis(options, progress, token);

                progress.report({ increment: 80, message: 'Organizing SQL statements...' });

                if (result.success && result.data) {
                    // Show database schema in tabbed webview with raw SQL view active
                    const tabbedData = this.convertDatabaseSchemaForTabbedView(result.data);
                    
                    // Import TabbedWebviewProvider if not already available
                    const { TabbedWebviewProvider } = await import('./tabbed-webview-provider');
                    const tabbedProvider = new TabbedWebviewProvider(this.context, this.outputChannel);
                    
                    tabbedProvider.showTab('dbschema', tabbedData);
                    tabbedProvider.switchToTab('dbschema', 'rawsql');

                    progress.report({ increment: 100, message: 'Raw SQL view ready!' });
                } else {
                    const errorMessage = result.errors && result.errors.length > 0 
                        ? result.errors[0].message 
                        : 'Database schema analysis failed';
                    throw new Error(errorMessage);
                }
            });

        } catch (error) {
            this.logError('Database schema raw SQL view failed', error);
            
            if (error instanceof Error && error.message.includes('cancelled')) {
                vscode.window.showInformationMessage('SQL extraction was cancelled');
            } else {
                vscode.window.showErrorMessage(
                    'Failed to extract SQL statements. This could be due to:\n• No SQL files found in the project\n• No database migrations or schema files\n• Python analysis dependencies missing',
                    'Check Output',
                    'View Help'
                ).then(action => {
                    if (action === 'Check Output') {
                        this.outputChannel.show();
                    } else if (action === 'View Help') {
                        vscode.window.showInformationMessage(
                            'Raw SQL extraction looks for:\n• .sql files in your project\n• Django migration files\n• SQLAlchemy schema definitions\n• Raw SQL statements in Python files'
                        );
                    }
                });
            }
        }
    }

    /**
     * Get extension configuration
     */
    private getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration('doracodebird');
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
        try {
            this.log('DoraCodeBirdView extension is being deactivated');

            // Dispose of webview provider
            if (this.webviewProvider) {
                this.webviewProvider.dispose();
            }

            // Cancel any running analysis
            if (this.isAnalyzing && this.analyzerRunner) {
                this.analyzerRunner.cancelAnalysis();
            }

            // Clear analysis data
            this.lastAnalysisResult = null;
            if (this.sidebarProvider) {
                this.sidebarProvider.updateAnalysisData(null);
            }
            if (this.codeLensProvider) {
                this.codeLensProvider.updateAnalysisData(null);
            }
            if (this.webviewProvider) {
                this.webviewProvider.updateAnalysisData(null);
            }

            if (this.outputChannel) {
                this.outputChannel.dispose();
            }
            if (this.statusBarItem) {
                this.statusBarItem.dispose();
            }
        } catch (error) {
            console.error('Error during extension disposal:', error);
        }
    }
}

// Global extension instance
let extensionInstance: DoraCodeBirdExtension | undefined;

/**
 * Main extension activation function
 * Called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext) {
    try {
        extensionInstance = new DoraCodeBirdExtension(context);
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
        console.error('Failed to activate DoraCodeBirdView extension:', error);
        vscode.window.showErrorMessage('Failed to activate DoraCodeBirdView extension');
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