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
exports.WorkspaceService = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Workspace Service handles workspace management, file watching, and workspace events
 */
class WorkspaceService {
    constructor(configurationManager, outputChannel, statusBarItem, context) {
        this.configurationManager = configurationManager;
        this.outputChannel = outputChannel;
        this.statusBarItem = statusBarItem;
        this.context = context;
        this.fileWatchers = [];
        this.state = {
            hasPythonFiles: false,
            workspaceFolders: [],
            lastAnalysisTime: null
        };
    }
    /**
     * Initialize workspace service
     */
    async initialize() {
        await this.checkPythonProject();
        this.setupFileWatchers();
        this.setupWorkspaceListeners();
        this.log('Workspace service initialized');
    }
    /**
     * Get current workspace state
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Check if current workspace contains Python files
     */
    async checkPythonProject() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            this.statusBarItem.hide();
            this.state.hasPythonFiles = false;
            this.state.workspaceFolders = [];
            return false;
        }
        // Update workspace folders in state
        this.state.workspaceFolders = workspaceFolders.map(folder => folder.uri.fsPath);
        try {
            const pythonFiles = await vscode.workspace.findFiles('**/*.py', '**/node_modules/**', 1);
            const hasPythonFiles = pythonFiles.length > 0;
            this.state.hasPythonFiles = hasPythonFiles;
            if (hasPythonFiles) {
                this.statusBarItem.show();
                this.log('Python project detected');
            }
            else {
                this.statusBarItem.hide();
                this.log('No Python files found in workspace');
            }
            return hasPythonFiles;
        }
        catch (error) {
            this.logError('Error checking for Python files', error);
            this.state.hasPythonFiles = false;
            return false;
        }
    }
    /**
     * Set up file system watchers for Python and dependency files
     */
    setupFileWatchers() {
        // Clear existing watchers
        this.disposeFileWatchers();
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
        const dependencyFileWatcher = vscode.workspace.createFileSystemWatcher('{**/requirements.txt,**/pyproject.toml,**/Pipfile}');
        dependencyFileWatcher.onDidChange(() => {
            this.onDependencyFileChanged();
        });
        // Store watchers for cleanup
        this.fileWatchers = [pythonFileWatcher, dependencyFileWatcher];
        // Add watchers to subscriptions for cleanup
        this.context.subscriptions.push(...this.fileWatchers);
        this.log('File watchers set up for Python and dependency files');
    }
    /**
     * Set up workspace event listeners
     */
    setupWorkspaceListeners() {
        // Listen for workspace folder changes
        const workspaceFoldersListener = vscode.workspace.onDidChangeWorkspaceFolders(() => {
            this.onWorkspaceFoldersChanged();
        });
        // Listen for configuration changes
        const configurationListener = vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('doracodebird')) {
                this.onConfigurationChanged();
            }
        });
        // Add listeners to subscriptions for cleanup
        this.context.subscriptions.push(workspaceFoldersListener, configurationListener);
        this.log('Workspace event listeners set up');
    }
    /**
     * Handle Python file changes
     */
    onPythonFileChanged() {
        if (this.configurationManager.isCachingEnabled()) {
            this.log('Python file changed - cache will be invalidated on next analysis');
        }
        // Update last analysis time to indicate data may be stale
        this.state.lastAnalysisTime = null;
        // Emit event for other components to react
        vscode.commands.executeCommand('doracodebird.onPythonFileChanged');
    }
    /**
     * Handle dependency file changes
     */
    onDependencyFileChanged() {
        this.log('Dependency file changed - analysis may need to be refreshed');
        // Update last analysis time to indicate data may be stale
        this.state.lastAnalysisTime = null;
        vscode.window.showInformationMessage('Python dependencies changed. Consider re-analyzing the project.', 'Analyze Now').then(selection => {
            if (selection === 'Analyze Now') {
                vscode.commands.executeCommand('doracodebird.analyzeProject');
            }
        });
        // Emit event for other components to react
        vscode.commands.executeCommand('doracodebird.onDependencyFileChanged');
    }
    /**
     * Handle workspace folder changes
     */
    async onWorkspaceFoldersChanged() {
        this.log('Workspace folders changed - checking for Python project');
        await this.checkPythonProject();
        // Re-setup file watchers for new workspace structure
        this.setupFileWatchers();
        // Emit event for other components to react
        vscode.commands.executeCommand('doracodebird.onWorkspaceFoldersChanged');
    }
    /**
     * Handle configuration changes
     */
    onConfigurationChanged() {
        this.log('Configuration changed - workspace service may need to update');
        // Re-validate configuration
        const validation = this.configurationManager.validateConfiguration();
        if (!validation.isValid) {
            this.log(`Configuration validation failed: ${validation.issues.join(', ')}`);
        }
        // Emit event for other components to react
        vscode.commands.executeCommand('doracodebird.onConfigurationChanged');
    }
    /**
     * Get workspace folders
     */
    getWorkspaceFolders() {
        return vscode.workspace.workspaceFolders;
    }
    /**
     * Get primary workspace folder
     */
    getPrimaryWorkspaceFolder() {
        const folders = this.getWorkspaceFolders();
        return folders && folders.length > 0 ? folders[0] : undefined;
    }
    /**
     * Check if workspace has Python files
     */
    hasPythonFiles() {
        return this.state.hasPythonFiles;
    }
    /**
     * Find Python files in workspace
     */
    async findPythonFiles(maxResults = 100) {
        try {
            return await vscode.workspace.findFiles('**/*.py', '**/node_modules/**', maxResults);
        }
        catch (error) {
            this.logError('Error finding Python files', error);
            return [];
        }
    }
    /**
     * Find dependency files in workspace
     */
    async findDependencyFiles() {
        try {
            return await vscode.workspace.findFiles('{**/requirements.txt,**/pyproject.toml,**/Pipfile,**/setup.py,**/setup.cfg}', '**/node_modules/**');
        }
        catch (error) {
            this.logError('Error finding dependency files', error);
            return [];
        }
    }
    /**
     * Get relative path for a URI
     */
    getRelativePath(uri) {
        return vscode.workspace.asRelativePath(uri);
    }
    /**
     * Check if a file is in the workspace
     */
    isFileInWorkspace(uri) {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        return workspaceFolder !== undefined;
    }
    /**
     * Update analysis timestamp
     */
    updateAnalysisTime() {
        this.state.lastAnalysisTime = Date.now();
    }
    /**
     * Get time since last analysis
     */
    getTimeSinceLastAnalysis() {
        if (!this.state.lastAnalysisTime) {
            return null;
        }
        return Date.now() - this.state.lastAnalysisTime;
    }
    /**
     * Dispose of file watchers
     */
    disposeFileWatchers() {
        this.fileWatchers.forEach(watcher => {
            try {
                watcher.dispose();
            }
            catch (error) {
                this.logError('Error disposing file watcher', error);
            }
        });
        this.fileWatchers = [];
    }
    /**
     * Dispose of all resources
     */
    dispose() {
        this.disposeFileWatchers();
        this.log('Workspace service disposed');
    }
    /**
     * Log message to output channel
     */
    log(message) {
        this.outputChannel.appendLine(`[WorkspaceService] ${message}`);
    }
    /**
     * Log error to output channel
     */
    logError(message, error) {
        this.outputChannel.appendLine(`[WorkspaceService] ERROR: ${message}`);
        if (error instanceof Error) {
            this.outputChannel.appendLine(`[WorkspaceService] ${error.message}`);
            if (error.stack) {
                this.outputChannel.appendLine(`[WorkspaceService] ${error.stack}`);
            }
        }
        else {
            this.outputChannel.appendLine(`[WorkspaceService] ${String(error)}`);
        }
    }
}
exports.WorkspaceService = WorkspaceService;
//# sourceMappingURL=workspace-service.js.map