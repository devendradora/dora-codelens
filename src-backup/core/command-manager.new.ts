import * as vscode from 'vscode';
import { DoraCodeBirdTreeItem } from '../sidebar-provider';
import { FunctionComplexityData } from '../codelens-provider';
import { CommandContext, CommandResult } from '../types/extension-types';
import { GitService, GitAnalysisResult } from '../services/git-service';

/**
 * Command definition interface
 */
export interface CommandDefinition {
    name: string;
    handler: (...args: any[]) => any;
    description: string;
    category: CommandCategory;
}

/**
 * Command categories for organization
 */
export enum CommandCategory {
    Analysis = 'analysis',
    UI = 'ui',
    Git = 'git',
    JSON = 'json',
    Configuration = 'configuration',
    Sidebar = 'sidebar',
    Context = 'context'
}

/**
 * Command Manager class responsible for registering and handling all extension commands
 */
export class CommandManager {
    private commands: Map<string, CommandDefinition> = new Map();
    private registeredCommands: vscode.Disposable[] = [];
    private activeCommands: Set<string> = new Set();

    constructor(
        private context: vscode.ExtensionContext,
        private analysisManager: any, // IAnalysisManager
        private uiManager: any, // UIManager
        private configurationManager: any, // IConfigurationManager
        private outputChannel: vscode.OutputChannel,
        private gitService: GitService
    ) {}

    /**
     * Register all extension commands
     */
    public registerAllCommands(): void {
        this.defineCommands();
        this.registerCommands();
        this.log('All commands registered successfully');
    }

    /**
     * Define all command handlers organized by category
     */
    private defineCommands(): void {
        // Full code analysis command
        this.addCommand({
            name: 'doracodebird.fullCodeAnalysis',
            handler: () => this.handleFullCodeAnalysis(),
            description: 'Full Code Analysis (Tech Stack, Code Graph, Code JSON)',
            category: CommandCategory.Analysis
        });

        // Current file analysis command
        this.addCommand({
            name: 'doracodebird.currentFileAnalysis',
            handler: () => this.handleCurrentFileAnalysis(),
            description: 'Current File Analysis (Code Graph, Code JSON)',
            category: CommandCategory.Analysis
        });

        // Call hierarchy command
        this.addCommand({
            name: 'doracodebird.callHierarchy',
            handler: () => this.handleCallHierarchy(),
            description: 'Call Hierarchy Analysis (Code Graph, Code JSON)',
            category: CommandCategory.Analysis
        });

        // Database Schema command
        this.addCommand({
            name: 'doracodebird.dbSchema',
            handler: () => this.handleShowDBSchema(),
            description: 'Database Schema (ER Diagram, Raw SQL)',
            category: CommandCategory.Analysis
        });

        // Git Analytics command
        this.addCommand({
            name: 'doracodebird.gitAnalytics',
            handler: () => this.handleGitAnalytics(),
            description: 'Git Analytics (Author Stats, Module Contributions, Timeline)',
            category: CommandCategory.Git
        });

        // JSON Utilities commands
        this.addCommand({
            name: 'doracodebird.jsonFormat',
            handler: () => this.handleJsonFormat(),
            description: 'Format JSON in current editor',
            category: CommandCategory.JSON
        });

        this.addCommand({
            name: 'doracodebird.jsonTreeView',
            handler: () => this.handleJsonTreeView(),
            description: 'Show JSON Tree View',
            category: CommandCategory.JSON
        });

        // Support commands
        this.addCommand({
            name: 'doracodebird.clearCache',
            handler: () => this.handleClearCache(),
            description: 'Clear analysis cache',
            category: CommandCategory.Configuration
        });
    }

    private addCommand(command: CommandDefinition): void {
        this.commands.set(command.name, command);
    }

    private registerCommands(): void {
        this.commands.forEach((command, id) => {
            const disposable = vscode.commands.registerCommand(id, command.handler);
            this.registeredCommands.push(disposable);
            this.context.subscriptions.push(disposable);
        });
    }

    // Command Handlers

    private async handleFullCodeAnalysis(): Promise<void> {
        const commandId = 'doracodebird.fullCodeAnalysis';
        
        try {
            this.log('Starting full code analysis...');
            this.log(`Call stack: ${new Error().stack?.split('\n').slice(1, 4).join(' -> ') || 'unknown'}`);
            
            // Check if this command is already running
            if (this.activeCommands.has(commandId)) {
                this.log('Full code analysis command is already running - aborting');
                vscode.window.showWarningMessage('Analysis command is already running');
                return;
            }
            
            // Check if analysis is already running
            if (this.analysisManager.isAnalyzing()) {
                this.log('Analysis is already in progress - aborting');
                vscode.window.showWarningMessage('Analysis is already in progress');
                return;
            }
            
            // Check if we already have recent valid results
            const lastResult = this.analysisManager.getLastResult();
            if (lastResult && lastResult.success && lastResult.data) {
                this.log('Using existing analysis results instead of re-running');
                this.uiManager.showFullAnalysis(lastResult.data);
                return;
            }
            
            // Mark command as active
            this.activeCommands.add(commandId);
            
            const result = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Analyzing project...',
                cancellable: true
            }, async () => {
                return await this.analysisManager.analyzeProject();
            });

            this.log(`Analysis result: ${result ? 'received' : 'null'}, success: ${result?.success}, hasData: ${!!result?.data}`);
            
            if (result === null) {
                this.log('Analysis returned null - checking analysis manager state');
                this.log(`Analysis manager isAnalyzing: ${this.analysisManager.isAnalyzing()}`);
                const lastResult = this.analysisManager.getLastResult();
                this.log(`Last result available: ${!!lastResult}, success: ${lastResult?.success}`);
            }

            if (result && result.success && result.data) {
                this.log('Analysis completed successfully, showing results');
                this.uiManager.showFullAnalysis(result.data);
            } else if (result && !result.success) {
                this.log('Analysis completed with errors');
                vscode.window.showWarningMessage('Analysis completed with errors. Check output for details.');
            } else if (result === null) {
                this.log('Analysis was cancelled or failed to start');
                vscode.window.showWarningMessage('Analysis was cancelled or failed to start. Check output for details.');
            } else {
                this.log('No analysis results available');
                vscode.window.showWarningMessage('No analysis results available');
            }
        } catch (error) {
            this.logError('Full code analysis failed', error);
            vscode.window.showErrorMessage('Failed to analyze project. Check output for details.');
        } finally {
            // Always remove command from active set
            this.activeCommands.delete(commandId);
        }
    }

    private async handleCurrentFileAnalysis(): Promise<void> {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active file to analyze');
                return;
            }

            this.log('Starting current file analysis...');
            const result = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Analyzing current file...',
                cancellable: true
            }, async () => {
                return await this.analysisManager.analyzeCurrentFile(editor.document.uri);
            });

            if (result && result.success && result.data) {
                this.uiManager.showFileAnalysis(result.data);
            } else if (result === null) {
                vscode.window.showWarningMessage('Current file analysis was cancelled or failed to start');
            } else {
                vscode.window.showWarningMessage('No analysis results available for current file');
            }
        } catch (error) {
            this.logError('Current file analysis failed', error);
            vscode.window.showErrorMessage('Failed to analyze current file. Check output for details.');
        }
    }

    private async handleCallHierarchy(): Promise<void> {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active file for call hierarchy');
                return;
            }

            this.log('Analyzing call hierarchy...');
            const result = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Generating call hierarchy...',
                cancellable: true
            }, async () => {
                return await this.analysisManager.analyzeCallHierarchy(editor.document.uri);
            });

            if (result && result.success && result.data) {
                this.uiManager.showCallHierarchy(result.data);
            } else if (result === null) {
                vscode.window.showWarningMessage('Call hierarchy analysis was cancelled or failed to start');
            } else {
                vscode.window.showWarningMessage('No call hierarchy available for current file');
            }
        } catch (error) {
            this.logError('Call hierarchy analysis failed', error);
            vscode.window.showErrorMessage('Failed to generate call hierarchy. Check output for details.');
        }
    }

    private async handleShowDBSchema(): Promise<void> {
        try {
            this.log('Showing database schema visualization...');
            const result = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Analyzing database schema...',
                cancellable: true
            }, async () => {
                return await this.analysisManager.analyzeDatabaseSchema();
            });

            if (result && result.success && result.data) {
                const viewOptions = ['ER Diagram', 'Raw SQL'];
                const choice = await vscode.window.showQuickPick(viewOptions, {
                    placeHolder: 'Select schema view'
                });

                if (choice) {
                    if (choice === 'ER Diagram') {
                        this.uiManager.showDBSchemaGraph(result.data);
                    } else {
                        this.uiManager.showDBSchemaSQL(result.data);
                    }
                }
            } else if (result === null) {
                vscode.window.showWarningMessage('Database schema analysis was cancelled or failed to start');
            } else {
                vscode.window.showWarningMessage('No database schema found in the current project');
            }
        } catch (error) {
            this.logError('Database schema analysis failed', error);
            vscode.window.showErrorMessage('Failed to analyze database schema. Check output for details.');
        }
    }

    private async handleGitAnalytics(): Promise<void> {
        try {
            const options = ['Author Statistics', 'Module Contributions', 'Commit Timeline'];
            const choice = await vscode.window.showQuickPick(options, {
                placeHolder: 'Select Git analytics view'
            });

            if (!choice) {return;}

            let result;
            switch (choice) {
                case 'Author Statistics':
                    result = await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: 'Analyzing Git author statistics...',
                        cancellable: true
                    }, () => this.gitService.runGitAuthorStatistics());
                    
                    if (result && (result as GitAnalysisResult).success && ((result as any).data || (result as any).contributors)) {
                        this.uiManager.showGitAnalytics({
                            data: (result as any).data,
                            contributors: (result as any).contributors
                        });
                    }
                    break;

                case 'Module Contributions':
                    result = await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: 'Analyzing Git module contributions...',
                        cancellable: true
                    }, () => this.gitService.runGitModuleContributions());
                    
                    if (result && (result as any).success && ((result as any).data || (result as any).fileChanges)) {
                        this.uiManager.showGitModuleContributions({
                            data: (result as any).data,
                            fileChanges: (result as any).fileChanges
                        });
                    }
                    break;

                case 'Commit Timeline':
                    result = await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: 'Analyzing Git commit timeline...',
                        cancellable: true
                    }, () => this.gitService.runGitCommitTimeline());
                    
                    if (result && (result as any).success && ((result as any).data || (result as any).commits)) {
                        this.uiManager.showGitCommitTimeline({
                            data: (result as any).data,
                            commits: (result as any).commits
                        });
                    }
                    break;
            }

            if (!result || (!(result as GitAnalysisResult).success && !(result as GitAnalysisResult).data)) {
                vscode.window.showWarningMessage('No Git data available for the selected view');
            }
        } catch (error) {
            this.logError('Git analytics failed', error);
            vscode.window.showErrorMessage('Failed to analyze Git data. Check output for details.');
        }
    }

    private async handleJsonFormat(): Promise<void> {
        await this.uiManager.formatJsonInEditor();
    }

    private async handleJsonTreeView(): Promise<void> {
        await this.uiManager.showJsonTreeView();
    }

    private async handleClearCache(): Promise<void> {
        await this.uiManager.clearCache();
    }

    // Utility methods

    private log(message: string): void {
        this.outputChannel.appendLine(`[CommandManager] ${message}`);
    }

    private logError(message: string, error: any): void {
        this.outputChannel.appendLine(`[CommandManager ERROR] ${message}: ${error?.message || error}`);
        if (error?.stack) {
            this.outputChannel.appendLine(error.stack);
        }
    }

    /**
     * Dispose of all registered commands
     */
    public dispose(): void {
        this.registeredCommands.forEach(disposable => {
            disposable.dispose();
        });
        this.registeredCommands = [];
        this.commands.clear();
    }
}
