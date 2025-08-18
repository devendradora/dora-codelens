import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Language detection utilities for DoraCodeBirdView extension
 */
export class LanguageDetection {
    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
    }

    /**
     * Check if the current file is a Python file
     */
    public isCurrentFilePython(): boolean {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return false;
        }

        const languageId = editor.document.languageId;
        const fileExtension = path.extname(editor.document.fileName).toLowerCase();
        
        return languageId === 'python' || fileExtension === '.py';
    }

    /**
     * Check if the current workspace contains Python files
     */
    public async hasWorkspacePythonFiles(): Promise<boolean> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return false;
        }

        try {
            // Check for Python files
            const pythonFiles = await vscode.workspace.findFiles('**/*.py', '**/node_modules/**', 1);
            return pythonFiles.length > 0;
        } catch (error) {
            this.outputChannel.appendLine(`Error checking for Python files: ${error}`);
            return false;
        }
    }

    /**
     * Check if the current workspace is a Python project
     * (has Python files or Python dependency files)
     */
    public async isPythonProject(): Promise<boolean> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return false;
        }

        try {
            // Check for Python files
            const pythonFiles = await vscode.workspace.findFiles('**/*.py', '**/node_modules/**', 1);
            if (pythonFiles.length > 0) {
                return true;
            }

            // Check for Python dependency files
            const dependencyFiles = await vscode.workspace.findFiles(
                '{**/requirements.txt,**/pyproject.toml,**/Pipfile,**/setup.py,**/setup.cfg}',
                '**/node_modules/**',
                1
            );
            return dependencyFiles.length > 0;
        } catch (error) {
            this.outputChannel.appendLine(`Error checking for Python project: ${error}`);
            return false;
        }
    }

    /**
     * Check if the workspace has database models (Django/SQLAlchemy)
     */
    public async hasDatabaseModels(): Promise<boolean> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return false;
        }

        try {
            // Check for Django models
            const djangoModels = await vscode.workspace.findFiles('**/models.py', '**/node_modules/**', 1);
            if (djangoModels.length > 0) {
                return true;
            }

            // Check for SQLAlchemy patterns in Python files
            const pythonFiles = await vscode.workspace.findFiles('**/*.py', '**/node_modules/**', 10);
            for (const file of pythonFiles) {
                try {
                    const document = await vscode.workspace.openTextDocument(file);
                    const content = document.getText();
                    
                    // Look for SQLAlchemy imports or Django model patterns
                    if (content.includes('from sqlalchemy') || 
                        content.includes('import sqlalchemy') ||
                        content.includes('from django.db import models') ||
                        content.includes('models.Model')) {
                        return true;
                    }
                } catch (error) {
                    // Skip files that can't be read
                    continue;
                }
            }

            return false;
        } catch (error) {
            this.outputChannel.appendLine(`Error checking for database models: ${error}`);
            return false;
        }
    }

    /**
     * Get the current file type for display purposes
     */
    public getCurrentFileType(): string {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return 'unknown';
        }

        return editor.document.languageId;
    }

    /**
     * Get a user-friendly message for Python-specific features
     */
    public getPythonRequiredMessage(featureName: string): string {
        const currentFileType = this.getCurrentFileType();
        
        switch (featureName.toLowerCase()) {
            case 'full code analysis':
                return 'Currently supports only Python projects. Please open a workspace with Python files to use this feature.';
            case 'current file analysis':
                return `Currently supports only Python files. Current file type: ${currentFileType}. Please open a Python (.py) file to use this feature.`;
            case 'call hierarchy':
                return `Call hierarchy is only available for Python files. Current file type: ${currentFileType}. Please open a Python (.py) file and place cursor on a function.`;
            case 'database schema':
                return 'Database schema analysis requires Python models (Django/SQLAlchemy). Please ensure your project contains Django models.py files or SQLAlchemy model definitions.';
            default:
                return `This feature currently supports only Python. Current context: ${currentFileType}.`;
        }
    }

    /**
     * Check if a feature should be available based on current context
     */
    public async isFeatureAvailable(featureName: string): Promise<{
        available: boolean;
        reason?: string;
    }> {
        switch (featureName.toLowerCase()) {
            case 'full code analysis':
                const isPythonProject = await this.isPythonProject();
                return {
                    available: isPythonProject,
                    reason: isPythonProject ? undefined : this.getPythonRequiredMessage('full code analysis')
                };

            case 'current file analysis':
                const isCurrentPython = this.isCurrentFilePython();
                return {
                    available: isCurrentPython,
                    reason: isCurrentPython ? undefined : this.getPythonRequiredMessage('current file analysis')
                };

            case 'call hierarchy':
                const isCurrentPythonForCall = this.isCurrentFilePython();
                return {
                    available: isCurrentPythonForCall,
                    reason: isCurrentPythonForCall ? undefined : this.getPythonRequiredMessage('call hierarchy')
                };

            case 'database schema':
                const hasModels = await this.hasDatabaseModels();
                return {
                    available: hasModels,
                    reason: hasModels ? undefined : this.getPythonRequiredMessage('database schema')
                };

            case 'git analytics':
            case 'json format':
            case 'json tree view':
                // These features work universally
                return { available: true };

            default:
                return { available: false, reason: 'Unknown feature' };
        }
    }

    /**
     * Log language detection information for debugging
     */
    public logCurrentContext(): void {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            this.outputChannel.appendLine(`Current file: ${editor.document.fileName}`);
            this.outputChannel.appendLine(`Language ID: ${editor.document.languageId}`);
            this.outputChannel.appendLine(`File extension: ${path.extname(editor.document.fileName)}`);
            this.outputChannel.appendLine(`Is Python file: ${this.isCurrentFilePython()}`);
        } else {
            this.outputChannel.appendLine('No active editor');
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            this.outputChannel.appendLine(`Workspace folders: ${workspaceFolders.length}`);
            workspaceFolders.forEach((folder, index) => {
                this.outputChannel.appendLine(`  Folder ${index + 1}: ${folder.uri.fsPath}`);
            });
        } else {
            this.outputChannel.appendLine('No workspace folders');
        }
    }
}