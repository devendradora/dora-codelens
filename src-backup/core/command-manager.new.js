"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandManager = exports.CommandCategory = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Command categories for organization
 */
var CommandCategory;
(function (CommandCategory) {
    CommandCategory["Analysis"] = "analysis";
    CommandCategory["UI"] = "ui";
    CommandCategory["Git"] = "git";
    CommandCategory["JSON"] = "json";
    CommandCategory["Configuration"] = "configuration";
    CommandCategory["Sidebar"] = "sidebar";
    CommandCategory["Context"] = "context";
})(CommandCategory = exports.CommandCategory || (exports.CommandCategory = {}));
/**
 * Command Manager class responsible for registering and handling all extension commands
 */
class CommandManager {
    constructor(context, analysisManager, // IAnalysisManager
    uiManager, // UIManager
    configurationManager, // IConfigurationManager
    outputChannel, gitService) {
        this.context = context;
        this.analysisManager = analysisManager;
        this.uiManager = uiManager;
        this.configurationManager = configurationManager;
        this.outputChannel = outputChannel;
        this.gitService = gitService;
        this.commands = new Map();
        this.registeredCommands = [];
        this.activeCommands = new Set();
    }
    /**
     * Register all extension commands
     */
    registerAllCommands() {
        this.defineCommands();
        this.registerCommands();
        this.log('All commands registered successfully');
    }
    /**
     * Define all command handlers organized by category
     */
    defineCommands() {
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
    addCommand(command) {
        this.commands.set(command.name, command);
    }
    registerCommands() {
        this.commands.forEach((command, id) => {
            const disposable = vscode.commands.registerCommand(id, command.handler);
            this.registeredCommands.push(disposable);
            this.context.subscriptions.push(disposable);
        });
    }
    // Command Handlers
    async handleFullCodeAnalysis() {
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
            }
            else if (result && !result.success) {
                this.log('Analysis completed with errors');
                vscode.window.showWarningMessage('Analysis completed with errors. Check output for details.');
            }
            else if (result === null) {
                this.log('Analysis was cancelled or failed to start');
                vscode.window.showWarningMessage('Analysis was cancelled or failed to start. Check output for details.');
            }
            else {
                this.log('No analysis results available');
                vscode.window.showWarningMessage('No analysis results available');
            }
        }
        catch (error) {
            this.logError('Full code analysis failed', error);
            vscode.window.showErrorMessage('Failed to analyze project. Check output for details.');
        }
        finally {
            // Always remove command from active set
            this.activeCommands.delete(commandId);
        }
    }
    async handleCurrentFileAnalysis() {
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
            }
            else if (result === null) {
                vscode.window.showWarningMessage('Current file analysis was cancelled or failed to start');
            }
            else {
                vscode.window.showWarningMessage('No analysis results available for current file');
            }
        }
        catch (error) {
            this.logError('Current file analysis failed', error);
            vscode.window.showErrorMessage('Failed to analyze current file. Check output for details.');
        }
    }
    async handleCallHierarchy() {
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
            }
            else if (result === null) {
                vscode.window.showWarningMessage('Call hierarchy analysis was cancelled or failed to start');
            }
            else {
                vscode.window.showWarningMessage('No call hierarchy available for current file');
            }
        }
        catch (error) {
            this.logError('Call hierarchy analysis failed', error);
            vscode.window.showErrorMessage('Failed to generate call hierarchy. Check output for details.');
        }
    }
    async handleShowDBSchema() {
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
                    }
                    else {
                        this.uiManager.showDBSchemaSQL(result.data);
                    }
                }
            }
            else if (result === null) {
                vscode.window.showWarningMessage('Database schema analysis was cancelled or failed to start');
            }
            else {
                vscode.window.showWarningMessage('No database schema found in the current project');
            }
        }
        catch (error) {
            this.logError('Database schema analysis failed', error);
            vscode.window.showErrorMessage('Failed to analyze database schema. Check output for details.');
        }
    }
    async handleGitAnalytics() {
        try {
            const options = ['Author Statistics', 'Module Contributions', 'Commit Timeline'];
            const choice = await vscode.window.showQuickPick(options, {
                placeHolder: 'Select Git analytics view'
            });
            if (!choice) {
                return;
            }
            let result;
            switch (choice) {
                case 'Author Statistics':
                    result = await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: 'Analyzing Git author statistics...',
                        cancellable: true
                    }, () => this.gitService.runGitAuthorStatistics());
                    if (result && result.success && (result.data || result.contributors)) {
                        this.uiManager.showGitAnalytics({
                            data: result.data,
                            contributors: result.contributors
                        });
                    }
                    break;
                case 'Module Contributions':
                    result = await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: 'Analyzing Git module contributions...',
                        cancellable: true
                    }, () => this.gitService.runGitModuleContributions());
                    if (result && result.success && (result.data || result.fileChanges)) {
                        this.uiManager.showGitModuleContributions({
                            data: result.data,
                            fileChanges: result.fileChanges
                        });
                    }
                    break;
                case 'Commit Timeline':
                    result = await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: 'Analyzing Git commit timeline...',
                        cancellable: true
                    }, () => this.gitService.runGitCommitTimeline());
                    if (result && result.success && (result.data || result.commits)) {
                        this.uiManager.showGitCommitTimeline({
                            data: result.data,
                            commits: result.commits
                        });
                    }
                    break;
            }
            if (!result || (!result.success && !result.data)) {
                vscode.window.showWarningMessage('No Git data available for the selected view');
            }
        }
        catch (error) {
            this.logError('Git analytics failed', error);
            vscode.window.showErrorMessage('Failed to analyze Git data. Check output for details.');
        }
    }
    async handleJsonFormat() {
        await this.uiManager.formatJsonInEditor();
    }
    async handleJsonTreeView() {
        await this.uiManager.showJsonTreeView();
    }
    async handleClearCache() {
        await this.uiManager.clearCache();
    }
    // Utility methods
    log(message) {
        this.outputChannel.appendLine(`[CommandManager] ${message}`);
    }
    logError(message, error) {
        this.outputChannel.appendLine(`[CommandManager ERROR] ${message}: ${error?.message || error}`);
        if (error?.stack) {
            this.outputChannel.appendLine(error.stack);
        }
    }
    /**
     * Dispose of all registered commands
     */
    dispose() {
        this.registeredCommands.forEach(disposable => {
            disposable.dispose();
        });
        this.registeredCommands = [];
        this.commands.clear();
    }
}
exports.CommandManager = CommandManager;
//# sourceMappingURL=command-manager.new.js.map