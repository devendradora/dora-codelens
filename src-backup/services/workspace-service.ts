import * as vscode from 'vscode';
import { ConfigurationManager } from '../core/configuration-manager';

/**
 * Workspace state interface
 */
export interface WorkspaceState {
    hasPythonFiles: boolean;
    workspaceFolders: string[];
    lastAnalysisTime: number | null;
}

/**
 * Workspace Service handles workspace management, file watching, and workspace events
 */
export class WorkspaceService {
    private fileWatchers: vscode.FileSystemWatcher[] = [];
    private state: WorkspaceState = {
        hasPythonFiles: false,
        workspaceFolders: [],
        lastAnalysisTime: null
    };

    constructor(
        private configurationManager: ConfigurationManager,
        private outputChannel: vscode.OutputChannel,
        private statusBarItem: vscode.StatusBarItem,
        private context: vscode.ExtensionContext
    ) {}

    /**
     * Initialize workspace service
     */
    public async initialize(): Promise<void> {
        await this.checkPythonProject();
        this.setupFileWatchers();
        this.setupWorkspaceListeners();
        this.log('Workspace service initialized');
    }

    /**
     * Get current workspace state
     */
    public getState(): WorkspaceState {
        return { ...this.state };
    }

    /**
     * Check if current workspace contains Python files
     */
    public async checkPythonProject(): Promise<boolean> {
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
            } else {
                this.statusBarItem.hide();
                this.log('No Python files found in workspace');
            }

            return hasPythonFiles;
        } catch (error) {
            this.logError('Error checking for Python files', error);
            this.state.hasPythonFiles = false;
            return false;
        }
    }

    /**
     * Set up file system watchers for Python and dependency files
     */
    public setupFileWatchers(): void {
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
        const dependencyFileWatcher = vscode.workspace.createFileSystemWatcher(
            '{**/requirements.txt,**/pyproject.toml,**/Pipfile}'
        );

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
    private setupWorkspaceListeners(): void {
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
    private onPythonFileChanged(): void {
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
    private onDependencyFileChanged(): void {
        this.log('Dependency file changed - analysis may need to be refreshed');
        
        // Update last analysis time to indicate data may be stale
        this.state.lastAnalysisTime = null;

        vscode.window.showInformationMessage(
            'Python dependencies changed. Consider re-analyzing the project.',
            'Analyze Now'
        ).then(selection => {
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
    private async onWorkspaceFoldersChanged(): Promise<void> {
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
    private onConfigurationChanged(): void {
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
    public getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] | undefined {
        return vscode.workspace.workspaceFolders;
    }

    /**
     * Get primary workspace folder
     */
    public getPrimaryWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
        const folders = this.getWorkspaceFolders();
        return folders && folders.length > 0 ? folders[0] : undefined;
    }

    /**
     * Check if workspace has Python files
     */
    public hasPythonFiles(): boolean {
        return this.state.hasPythonFiles;
    }

    /**
     * Find Python files in workspace
     */
    public async findPythonFiles(maxResults: number = 100): Promise<vscode.Uri[]> {
        try {
            return await vscode.workspace.findFiles('**/*.py', '**/node_modules/**', maxResults);
        } catch (error) {
            this.logError('Error finding Python files', error);
            return [];
        }
    }

    /**
     * Find dependency files in workspace
     */
    public async findDependencyFiles(): Promise<vscode.Uri[]> {
        try {
            return await vscode.workspace.findFiles(
                '{**/requirements.txt,**/pyproject.toml,**/Pipfile,**/setup.py,**/setup.cfg}',
                '**/node_modules/**'
            );
        } catch (error) {
            this.logError('Error finding dependency files', error);
            return [];
        }
    }

    /**
     * Get relative path for a URI
     */
    public getRelativePath(uri: vscode.Uri): string {
        return vscode.workspace.asRelativePath(uri);
    }

    /**
     * Check if a file is in the workspace
     */
    public isFileInWorkspace(uri: vscode.Uri): boolean {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        return workspaceFolder !== undefined;
    }

    /**
     * Update analysis timestamp
     */
    public updateAnalysisTime(): void {
        this.state.lastAnalysisTime = Date.now();
    }

    /**
     * Get time since last analysis
     */
    public getTimeSinceLastAnalysis(): number | null {
        if (!this.state.lastAnalysisTime) {
            return null;
        }
        return Date.now() - this.state.lastAnalysisTime;
    }

    /**
     * Dispose of file watchers
     */
    private disposeFileWatchers(): void {
        this.fileWatchers.forEach(watcher => {
            try {
                watcher.dispose();
            } catch (error) {
                this.logError('Error disposing file watcher', error);
            }
        });
        this.fileWatchers = [];
    }

    /**
     * Dispose of all resources
     */
    public dispose(): void {
        this.disposeFileWatchers();
        this.log('Workspace service disposed');
    }

    /**
     * Log message to output channel
     */
    private log(message: string): void {
        this.outputChannel.appendLine(`[WorkspaceService] ${message}`);
    }

    /**
     * Log error to output channel
     */
    private logError(message: string, error: any): void {
        this.outputChannel.appendLine(`[WorkspaceService] ERROR: ${message}`);
        if (error instanceof Error) {
            this.outputChannel.appendLine(`[WorkspaceService] ${error.message}`);
            if (error.stack) {
                this.outputChannel.appendLine(`[WorkspaceService] ${error.stack}`);
            }
        } else {
            this.outputChannel.appendLine(`[WorkspaceService] ${String(error)}`);
        }
    }
}