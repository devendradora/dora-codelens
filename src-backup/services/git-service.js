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
exports.GitService = void 0;
const vscode = __importStar(require("vscode"));
const analyzer_runner_1 = require("../analyzer-runner");
/**
 * Git Service handles all git analytics functionality
 */
class GitService {
    constructor(outputChannel, configurationManager, context) {
        this.outputChannel = outputChannel;
        this.configurationManager = configurationManager;
        this.context = context;
        this.analyzerRunner = new analyzer_runner_1.AnalyzerRunner(this.outputChannel, this.context.extensionPath);
    }
    /**
     * Run git author statistics analysis
     */
    async runGitAuthorStatistics() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('No workspace folder open');
        }
        this.log('Git Author Statistics requested');
        // Show progress dialog
        const result = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing Git Author Statistics',
            cancellable: true
        }, async (progress, token) => {
            progress.report({ increment: 0, message: 'Initializing Git analysis...' });
            const options = {
                projectPath: workspaceFolders[0].uri.fsPath,
                analysisType: 'git_author_statistics',
                timeout: 120000 // 2 minutes
            };
            progress.report({ increment: 50, message: 'Analyzing Git repository...' });
            return await this.runGitAnalysis(options, progress, token);
        });
        if (result.success && result.data) {
            this.log('Git author statistics analysis completed successfully');
        }
        else {
            this.handleGitAnalysisError(result, 'Git Author Statistics');
        }
        return result;
    }
    /**
     * Run git module contributions analysis
     */
    async runGitModuleContributions() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('No workspace folder open');
        }
        this.log('Git Module Contributions requested');
        // Show progress dialog
        const result = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing Git Module Contributions',
            cancellable: true
        }, async (progress, token) => {
            progress.report({ increment: 0, message: 'Initializing module analysis...' });
            const options = {
                projectPath: workspaceFolders[0].uri.fsPath,
                analysisType: 'git_module_contributions',
                timeout: 180000 // 3 minutes
            };
            progress.report({ increment: 50, message: 'Analyzing module contributions...' });
            return await this.runGitAnalysis(options, progress, token);
        });
        if (result.success && result.data) {
            this.log('Git module contributions analysis completed successfully');
        }
        else {
            this.handleGitAnalysisError(result, 'Git Module Contributions');
        }
        return result;
    }
    /**
     * Run git commit timeline analysis
     */
    async runGitCommitTimeline() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('No workspace folder open');
        }
        this.log('Git Commit Timeline requested');
        // Show progress dialog
        const result = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing Git Commit Timeline',
            cancellable: true
        }, async (progress, token) => {
            progress.report({ increment: 0, message: 'Initializing timeline analysis...' });
            const options = {
                projectPath: workspaceFolders[0].uri.fsPath,
                analysisType: 'git_commit_timeline',
                timeout: 120000 // 2 minutes
            };
            progress.report({ increment: 50, message: 'Analyzing commit timeline...' });
            return await this.runGitAnalysis(options, progress, token);
        });
        if (result.success && result.data) {
            this.log('Git commit timeline analysis completed successfully');
        }
        else {
            this.handleGitAnalysisError(result, 'Git Commit Timeline');
        }
        return result;
    }
    /**
     * Check if git is installed and repository exists
     */
    async checkGitInstallation() {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                return false;
            }
            // Check if git is available
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            await execAsync('git --version');
            // Check if current workspace is a git repository
            await execAsync('git rev-parse --git-dir', { cwd: workspaceFolders[0].uri.fsPath });
            return true;
        }
        catch (error) {
            this.log(`Git installation check failed: ${error}`);
            return false;
        }
    }
    /**
     * Initialize git repository if needed
     */
    async initializeGitRepository() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('No workspace folder open');
        }
        try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            await execAsync('git init', { cwd: workspaceFolders[0].uri.fsPath });
            this.log('Git repository initialized successfully');
        }
        catch (error) {
            this.logError('Failed to initialize git repository', error);
            throw error;
        }
    }
    /**
     * Run git analysis with the analyzer runner
     */
    async runGitAnalysis(options, progress, token) {
        try {
            // Convert git options to analyzer options
            const analyzerOptions = {
                projectPath: options.projectPath,
                pythonPath: this.configurationManager.getPythonPath(),
                timeout: options.timeout,
                enableCaching: this.configurationManager.isCachingEnabled(),
                analysisType: options.analysisType
            };
            // Run the analysis using the analyzer runner
            const result = await this.analyzerRunner.runAnalysis(analyzerOptions, progress, token);
            return {
                success: result.success,
                data: result.data,
                errors: result.errors,
                warnings: result.warnings,
                executionTime: result.executionTime
            };
        }
        catch (error) {
            this.logError('Git analysis failed', error);
            return {
                success: false,
                errors: [{ type: 'execution_error', message: error instanceof Error ? error.message : String(error) }]
            };
        }
    }
    /**
     * Handle git analysis errors
     */
    handleGitAnalysisError(result, analysisType) {
        const errors = result.errors || [];
        if (errors.length === 0) {
            vscode.window.showErrorMessage(`${analysisType} analysis failed with unknown error`);
            return;
        }
        // Check for specific error types
        const hasGitError = errors.some(error => error.message.toLowerCase().includes('not a git repository') ||
            error.message.toLowerCase().includes('git not found'));
        const hasPythonError = errors.some(error => error.message.toLowerCase().includes('python not found') ||
            error.message.toLowerCase().includes('command not found'));
        const hasDependencyError = errors.some(error => error.type === 'dependency_error' ||
            error.message.toLowerCase().includes('module not found'));
        if (hasGitError) {
            vscode.window.showErrorMessage('This workspace is not a Git repository or Git is not installed.', 'Install Git', 'Initialize Repository', 'View Output').then(action => {
                if (action === 'Install Git') {
                    vscode.env.openExternal(vscode.Uri.parse('https://git-scm.com/downloads'));
                }
                else if (action === 'Initialize Repository') {
                    this.initializeGitRepository().catch(error => {
                        vscode.window.showErrorMessage('Failed to initialize Git repository');
                    });
                }
                else if (action === 'View Output') {
                    this.outputChannel.show();
                }
            });
        }
        else if (hasPythonError) {
            vscode.window.showErrorMessage('Python not found. Git analytics require Python to be installed.', 'Open Settings', 'Install Python', 'View Output').then(action => {
                if (action === 'Open Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'doracodebird.pythonPath');
                }
                else if (action === 'Install Python') {
                    vscode.env.openExternal(vscode.Uri.parse('https://www.python.org/downloads/'));
                }
                else if (action === 'View Output') {
                    this.outputChannel.show();
                }
            });
        }
        else if (hasDependencyError) {
            vscode.window.showErrorMessage('Required Python dependencies are missing for Git analytics.', 'Install Dependencies', 'View Output').then(action => {
                if (action === 'Install Dependencies') {
                    this.showGitDependencyInstallationGuide();
                }
                else if (action === 'View Output') {
                    this.outputChannel.show();
                }
            });
        }
        else {
            // Generic error handling
            const errorMessage = errors[0].message || 'Unknown error occurred';
            vscode.window.showErrorMessage(`${analysisType} analysis failed: ${errorMessage}`, 'View Output', 'Retry').then(action => {
                if (action === 'View Output') {
                    this.outputChannel.show();
                }
                else if (action === 'Retry') {
                    // Retry based on analysis type
                    if (analysisType === 'Git Author Statistics') {
                        this.runGitAuthorStatistics();
                    }
                    else if (analysisType === 'Git Module Contributions') {
                        this.runGitModuleContributions();
                    }
                    else if (analysisType === 'Git Commit Timeline') {
                        this.runGitCommitTimeline();
                    }
                }
            });
        }
    }
    /**
     * Show git dependency installation guide
     */
    showGitDependencyInstallationGuide() {
        const message = `To install Git analytics dependencies, run the following commands:

1. Navigate to the analyzer directory:
   cd ${this.context.extensionPath}/analyzer

2. Install Git analytics dependencies:
   pip install gitpython matplotlib seaborn pandas

3. Re-run the Git analysis

Note: Git analytics require additional Python packages for repository analysis and visualization.`;
        vscode.window.showInformationMessage('Git Analytics Dependencies', { modal: true, detail: message }, 'Copy Commands').then(action => {
            if (action === 'Copy Commands') {
                vscode.env.clipboard.writeText('pip install gitpython matplotlib seaborn pandas');
            }
        });
    }
    /**
     * Log message to output channel
     */
    log(message) {
        this.outputChannel.appendLine(`[GitService] ${message}`);
    }
    /**
     * Log error to output channel
     */
    logError(message, error) {
        this.outputChannel.appendLine(`[GitService] ERROR: ${message}`);
        if (error instanceof Error) {
            this.outputChannel.appendLine(`[GitService] ${error.message}`);
            if (error.stack) {
                this.outputChannel.appendLine(`[GitService] ${error.stack}`);
            }
        }
        else {
            this.outputChannel.appendLine(`[GitService] ${String(error)}`);
        }
    }
    /**
     * Dispose of resources
     */
    dispose() {
        // Clean up any resources if needed
        this.log('GitService disposed');
    }
}
exports.GitService = GitService;
//# sourceMappingURL=git-service.js.map