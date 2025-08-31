import * as vscode from 'vscode';
import { ErrorHandler } from './error-handler';
import { GuidancePrompt } from './code-lens-guidance-manager';

/**
 * Interface for analysis context during errors
 */
export interface AnalysisContext {
    operation: string;
    filePath?: string;
    timestamp: number;
    analysisType?: 'current-file' | 'full-project';
}

/**
 * Guidance Error Handler
 * Provides user-friendly error messages and recovery options for guidance system
 */
export class GuidanceErrorHandler {
    private static instance: GuidanceErrorHandler;
    private errorHandler: ErrorHandler;

    private constructor(errorHandler: ErrorHandler) {
        this.errorHandler = errorHandler;
    }

    public static getInstance(errorHandler?: ErrorHandler): GuidanceErrorHandler {
        if (!GuidanceErrorHandler.instance) {
            if (!errorHandler) {
                throw new Error('ErrorHandler required for first initialization');
            }
            GuidanceErrorHandler.instance = new GuidanceErrorHandler(errorHandler);
        }
        return GuidanceErrorHandler.instance;
    }

    /**
     * Handle analysis command failures with user-friendly messages
     */
    public handleAnalysisError(error: Error, context: AnalysisContext): GuidancePrompt {
        this.errorHandler.logError(
            'Handling analysis error in guidance system',
            { error: error.message, context },
            'GuidanceErrorHandler'
        );

        const errorType = this.categorizeError(error);
        const troubleshootingSteps = this.getTroubleshootingSteps(errorType);

        return {
            id: 'analysis-error',
            type: 'error',
            title: '$(error) Analysis Failed',
            description: this.getErrorDescription(errorType),
            icon: '$(error)',
            command: 'doracodelens.guidance.showErrorDetails',
            arguments: [error.message, troubleshootingSteps, context],
            tooltip: `Analysis failed: ${error.message}. Click for troubleshooting help.`,
            priority: 1
        };
    }

    /**
     * Provide troubleshooting steps for common issues
     */
    public getTroubleshootingSteps(errorType: string): string[] {
        const commonSteps = [
            'Check that Python 3 is installed and accessible',
            'Ensure the file is a valid Python file (.py extension)',
            'Verify the file contains valid Python syntax',
            'Check the Output panel for detailed error information'
        ];

        switch (errorType) {
            case 'python-not-found':
                return [
                    'Use "Setup Python Path" from the right-click menu to auto-detect Python',
                    'Install Python 3 from python.org if not already installed',
                    'Ensure Python is added to your system PATH',
                    'Try running "python3 --version" or "python --version" in your terminal',
                    'Use the "Auto-Detect Python Path" command to find existing installations',
                    ...commonSteps.slice(1)
                ];

            case 'permission-denied':
                return [
                    'Check file permissions and ensure the file is not read-only',
                    'Try running VS Code as administrator (Windows) or with sudo (Linux/Mac)',
                    'Ensure you have write access to the workspace folder',
                    ...commonSteps
                ];

            case 'timeout':
                return [
                    'The file might be too large for analysis',
                    'Try analyzing a smaller file first',
                    'Increase the analysis timeout in settings',
                    'Close other resource-intensive applications',
                    ...commonSteps
                ];

            case 'syntax-error':
                return [
                    'Fix Python syntax errors in the file',
                    'Check for missing colons, parentheses, or indentation issues',
                    'Use a Python linter to identify syntax problems',
                    ...commonSteps
                ];

            case 'dependency-missing':
                return [
                    'Install required Python packages (radon, ast)',
                    'Try reinstalling the DoraCodeLens extension',
                    'Check if your Python environment has the necessary modules',
                    ...commonSteps
                ];

            case 'workspace-error':
                return [
                    'Ensure you have an open workspace or folder',
                    'Try opening the file in a workspace',
                    'Check workspace permissions',
                    ...commonSteps
                ];

            default:
                return [
                    'Try restarting VS Code',
                    'Reload the window (Ctrl+Shift+P > "Developer: Reload Window")',
                    ...commonSteps,
                    'Report the issue if the problem persists'
                ];
        }
    }

    /**
     * Create fallback guidance when guidance system encounters issues
     */
    public createFallbackGuidance(document: vscode.TextDocument): vscode.CodeLens[] {
        try {
            const fallbackLenses: vscode.CodeLens[] = [];

            // Basic analysis prompt
            const analyzeCodeLens = new vscode.CodeLens(
                new vscode.Range(0, 0, 0, 0),
                {
                    title: '$(file-code) Run Analysis',
                    command: 'doracodelens.analyzeCurrentFile',
                    tooltip: 'Run code analysis to see complexity metrics'
                }
            );
            fallbackLenses.push(analyzeCodeLens);

            // Settings prompt
            const settingsCodeLens = new vscode.CodeLens(
                new vscode.Range(1, 0, 1, 0),
                {
                    title: '$(gear) Open Settings',
                    command: 'doracodelens.openSettings',
                    tooltip: 'Configure DoraCodeLens settings'
                }
            );
            fallbackLenses.push(settingsCodeLens);

            this.errorHandler.logError(
                'Created fallback guidance code lenses',
                { lensCount: fallbackLenses.length },
                'GuidanceErrorHandler'
            );

            return fallbackLenses;

        } catch (error) {
            this.errorHandler.logError(
                'Error creating fallback guidance',
                error,
                'GuidanceErrorHandler'
            );
            return [];
        }
    }

    /**
     * Categorize error types for better handling
     */
    private categorizeError(error: Error): string {
        const message = error.message.toLowerCase();

        if (message.includes('python') && (message.includes('not found') || message.includes('command not found'))) {
            return 'python-not-found';
        }

        if (message.includes('permission') || message.includes('access denied')) {
            return 'permission-denied';
        }

        if (message.includes('timeout') || message.includes('timed out')) {
            return 'timeout';
        }

        if (message.includes('syntax') || message.includes('invalid syntax')) {
            return 'syntax-error';
        }

        if (message.includes('module') || message.includes('import') || message.includes('dependency')) {
            return 'dependency-missing';
        }

        if (message.includes('workspace') || message.includes('folder')) {
            return 'workspace-error';
        }

        return 'unknown';
    }

    /**
     * Get user-friendly error description
     */
    private getErrorDescription(errorType: string): string {
        switch (errorType) {
            case 'python-not-found':
                return 'Python not found - Click for setup help';
            case 'permission-denied':
                return 'Permission denied - Click for solutions';
            case 'timeout':
                return 'Analysis timed out - Click for help';
            case 'syntax-error':
                return 'Syntax error in file - Click for help';
            case 'dependency-missing':
                return 'Missing dependencies - Click to fix';
            case 'workspace-error':
                return 'Workspace issue - Click for help';
            default:
                return 'Analysis error - Click for troubleshooting';
        }
    }

    /**
     * Show detailed error information with recovery options
     */
    public async showErrorDetails(errorMessage: string, troubleshootingSteps: string[], context: AnalysisContext): Promise<void> {
        try {
            const message = `Analysis Error Details:\n\n${errorMessage}\n\nTroubleshooting Steps:\n${troubleshootingSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}`;

            // Check if this is a Python-related error
            const isPythonError = errorMessage.toLowerCase().includes('python') || 
                                errorMessage.toLowerCase().includes('not found') ||
                                errorMessage.toLowerCase().includes('command not found');

            const actions = isPythonError ? 
                ['Setup Python', 'Retry Analysis', 'Open Settings', 'Report Issue', 'Copy Error Details'] :
                ['Retry Analysis', 'Open Settings', 'Report Issue', 'Copy Error Details'];

            const action = await vscode.window.showErrorMessage(
                message,
                { modal: true },
                ...actions
            );

            switch (action) {
                case 'Setup Python':
                    await vscode.commands.executeCommand('doracodelens.setupPythonPath');
                    break;
                case 'Retry Analysis':
                    await this.retryAnalysis(context);
                    break;
                case 'Open Settings':
                    await vscode.commands.executeCommand('workbench.action.openSettings', 'doracodelens');
                    break;
                case 'Report Issue':
                    await this.reportIssue(errorMessage, context);
                    break;
                case 'Copy Error Details':
                    await vscode.env.clipboard.writeText(`DoraCodeLens Error:\n${errorMessage}\n\nContext: ${JSON.stringify(context, null, 2)}`);
                    vscode.window.showInformationMessage('Error details copied to clipboard');
                    break;
            }

        } catch (error) {
            this.errorHandler.logError(
                'Error showing error details',
                error,
                'GuidanceErrorHandler'
            );
        }
    }

    /**
     * Retry analysis based on context
     */
    private async retryAnalysis(context: AnalysisContext): Promise<void> {
        try {
            if (context.analysisType === 'full-project') {
                await vscode.commands.executeCommand('doracodelens.analyzeFullCode');
            } else {
                await vscode.commands.executeCommand('doracodelens.analyzeCurrentFile');
            }
        } catch (error) {
            this.errorHandler.logError(
                'Error retrying analysis',
                error,
                'GuidanceErrorHandler'
            );
            vscode.window.showErrorMessage('Retry failed. Please check the troubleshooting steps.');
        }
    }

    /**
     * Report issue to GitHub
     */
    private async reportIssue(errorMessage: string, context: AnalysisContext): Promise<void> {
        try {
            const issueTitle = encodeURIComponent(`Analysis Error: ${errorMessage.substring(0, 50)}...`);
            const issueBody = encodeURIComponent(`**Error Message:**\n${errorMessage}\n\n**Context:**\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n\n**Environment:**\n- VS Code Version: ${vscode.version}\n- Extension Version: [Please fill]\n- Operating System: [Please fill]\n- Python Version: [Please fill]\n\n**Steps to Reproduce:**\n1. [Please describe the steps that led to this error]\n\n**Expected Behavior:**\n[Please describe what you expected to happen]\n\n**Additional Context:**\n[Please add any other context about the problem here]`);
            
            const issueUrl = `https://github.com/your-repo/doracodelens/issues/new?title=${issueTitle}&body=${issueBody}`;
            await vscode.env.openExternal(vscode.Uri.parse(issueUrl));
        } catch (error) {
            this.errorHandler.logError(
                'Error opening issue report',
                error,
                'GuidanceErrorHandler'
            );
            vscode.window.showErrorMessage('Failed to open issue report. Please report manually.');
        }
    }

    /**
     * Check if error is recoverable
     */
    public isRecoverableError(error: Error): boolean {
        const recoverableTypes = ['timeout', 'permission-denied', 'syntax-error'];
        const errorType = this.categorizeError(error);
        return recoverableTypes.includes(errorType);
    }

    /**
     * Get recovery suggestion for error
     */
    public getRecoverySuggestion(error: Error): string {
        const errorType = this.categorizeError(error);
        
        switch (errorType) {
            case 'timeout':
                return 'Try analyzing a smaller file or increase the timeout in settings';
            case 'permission-denied':
                return 'Check file permissions or try running VS Code as administrator';
            case 'syntax-error':
                return 'Fix the Python syntax errors in your file';
            case 'python-not-found':
                return 'Install Python 3 and ensure it\'s in your PATH';
            case 'dependency-missing':
                return 'Reinstall the extension or check Python dependencies';
            default:
                return 'Try restarting VS Code or check the troubleshooting guide';
        }
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        this.errorHandler.logError(
            'GuidanceErrorHandler disposed',
            null,
            'GuidanceErrorHandler'
        );
    }
}