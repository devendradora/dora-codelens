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
exports.LanguageDetection = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
/**
 * Language detection utilities for DoraCodeBirdView extension
 */
class LanguageDetection {
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
    }
    /**
     * Check if the current file is a Python file
     */
    isCurrentFilePython() {
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
    async hasWorkspacePythonFiles() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return false;
        }
        try {
            // Check for Python files
            const pythonFiles = await vscode.workspace.findFiles('**/*.py', '**/node_modules/**', 1);
            return pythonFiles.length > 0;
        }
        catch (error) {
            this.outputChannel.appendLine(`Error checking for Python files: ${error}`);
            return false;
        }
    }
    /**
     * Check if the current workspace is a Python project
     * (has Python files or Python dependency files)
     */
    async isPythonProject() {
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
            const dependencyFiles = await vscode.workspace.findFiles('{**/requirements.txt,**/pyproject.toml,**/Pipfile,**/setup.py,**/setup.cfg}', '**/node_modules/**', 1);
            return dependencyFiles.length > 0;
        }
        catch (error) {
            this.outputChannel.appendLine(`Error checking for Python project: ${error}`);
            return false;
        }
    }
    /**
     * Check if the workspace has database models (Django/SQLAlchemy)
     */
    async hasDatabaseModels() {
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
                }
                catch (error) {
                    // Skip files that can't be read
                    continue;
                }
            }
            return false;
        }
        catch (error) {
            this.outputChannel.appendLine(`Error checking for database models: ${error}`);
            return false;
        }
    }
    /**
     * Get the current file type for display purposes
     */
    getCurrentFileType() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return 'unknown';
        }
        return editor.document.languageId;
    }
    /**
     * Get a user-friendly message for Python-specific features
     */
    getPythonRequiredMessage(featureName) {
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
    async isFeatureAvailable(featureName) {
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
    logCurrentContext() {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            this.outputChannel.appendLine(`Current file: ${editor.document.fileName}`);
            this.outputChannel.appendLine(`Language ID: ${editor.document.languageId}`);
            this.outputChannel.appendLine(`File extension: ${path.extname(editor.document.fileName)}`);
            this.outputChannel.appendLine(`Is Python file: ${this.isCurrentFilePython()}`);
        }
        else {
            this.outputChannel.appendLine('No active editor');
        }
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            this.outputChannel.appendLine(`Workspace folders: ${workspaceFolders.length}`);
            workspaceFolders.forEach((folder, index) => {
                this.outputChannel.appendLine(`  Folder ${index + 1}: ${folder.uri.fsPath}`);
            });
        }
        else {
            this.outputChannel.appendLine('No workspace folders');
        }
    }
}
exports.LanguageDetection = LanguageDetection;
//# sourceMappingURL=language-detection.js.map