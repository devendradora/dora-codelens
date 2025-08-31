import * as vscode from 'vscode';
import { ErrorHandler } from '../core/error-handler';
import { CodeLensManager } from '../services/code-lens-provider';
import { CodeLensSuggestion } from '../services/code-lens-suggestion-engine';
import { CodeLensCommandManager } from '../core/code-lens-command-manager';

/**
 * Enhanced Code Lens Command Handler
 * Handles professional code lens commands with dynamic titles and suggestions
 */
export class CodeLensHandler {
    private errorHandler: ErrorHandler;
    private codeLensManager: CodeLensManager;
    private commandManager: CodeLensCommandManager;
    private guidanceCommandHandler: any = null;

    constructor(errorHandler: ErrorHandler, context: vscode.ExtensionContext) {
        this.errorHandler = errorHandler;
        this.codeLensManager = CodeLensManager.getInstance(errorHandler, context);
        this.commandManager = CodeLensCommandManager.getInstance(errorHandler, context);
        
        // Initialize dynamic commands
        this.commandManager.registerDynamicCommands();
    }

    /**
     * Handle toggle code lens command
     */
    public async handleToggleCodeLens(): Promise<void> {
        try {
            this.errorHandler.logError(
                'Toggle code lens command initiated',
                null,
                'CodeLensHandler'
            );

            this.codeLensManager.toggleCodeLens();

        } catch (error) {
            this.errorHandler.logError(
                'Toggle code lens command failed',
                error,
                'CodeLensHandler'
            );
            vscode.window.showErrorMessage('Failed to toggle Code Lens. Check the output for details.');
        }
    }

    /**
     * Handle enable code lens command
     */
    public async handleEnableCodeLens(): Promise<void> {
        try {
            this.errorHandler.logError(
                'Enable code lens command initiated',
                null,
                'CodeLensHandler'
            );

            this.codeLensManager.enableCodeLens();

        } catch (error) {
            this.errorHandler.logError(
                'Enable code lens command failed',
                error,
                'CodeLensHandler'
            );
            vscode.window.showErrorMessage('Failed to enable Code Lens. Check the output for details.');
        }
    }

    /**
     * Handle disable code lens command
     */
    public async handleDisableCodeLens(): Promise<void> {
        try {
            this.errorHandler.logError(
                'Disable code lens command initiated',
                null,
                'CodeLensHandler'
            );

            this.codeLensManager.disableCodeLens();

        } catch (error) {
            this.errorHandler.logError(
                'Disable code lens command failed',
                error,
                'CodeLensHandler'
            );
            vscode.window.showErrorMessage('Failed to disable Code Lens. Check the output for details.');
        }
    }

    /**
     * Handle show function details command (triggered by code lens)
     */
    public async handleShowFunctionDetails(func: any, uri: vscode.Uri): Promise<void> {
        try {
            this.errorHandler.logError(
                'Show function details command initiated',
                { functionName: func.name },
                'CodeLensHandler'
            );

            const complexity = func.complexity || func.cyclomatic_complexity || 0;
            const references = func.references || func.call_count || 0;
            const lineCount = func.line_count || func.lines || 0;

            const message = `Function: ${func.name}\n` +
                          `Complexity: ${complexity}\n` +
                          `References: ${references}\n` +
                          `Lines: ${lineCount}`;

            const action = await vscode.window.showInformationMessage(
                message,
                'Go to Definition',
                'Show in Explorer'
            );

            if (action === 'Go to Definition') {
                // Try to navigate to the function
                const document = await vscode.workspace.openTextDocument(uri);
                const editor = await vscode.window.showTextDocument(document);
                
                // Find the function line and navigate to it
                const text = document.getText();
                const lines = text.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes(`def ${func.name}(`)) {
                        const position = new vscode.Position(i, 0);
                        editor.selection = new vscode.Selection(position, position);
                        editor.revealRange(new vscode.Range(position, position));
                        break;
                    }
                }
            } else if (action === 'Show in Explorer') {
                vscode.commands.executeCommand('revealInExplorer', uri);
            }

        } catch (error) {
            this.errorHandler.logError(
                'Show function details command failed',
                error,
                'CodeLensHandler'
            );
            vscode.window.showErrorMessage('Failed to show function details.');
        }
    }

    /**
     * Handle show class details command (triggered by code lens)
     */
    public async handleShowClassDetails(cls: any, uri: vscode.Uri): Promise<void> {
        try {
            this.errorHandler.logError(
                'Show class details command initiated',
                { className: cls.name },
                'CodeLensHandler'
            );

            const methodCount = cls.methods ? cls.methods.length : 0;
            const complexity = cls.complexity || cls.total_complexity || 0;
            const lineCount = cls.line_count || cls.lines || 0;

            const message = `Class: ${cls.name}\n` +
                          `Methods: ${methodCount}\n` +
                          `Complexity: ${complexity}\n` +
                          `Lines: ${lineCount}`;

            const action = await vscode.window.showInformationMessage(
                message,
                'Go to Definition',
                'Show Methods',
                'Show in Explorer'
            );

            if (action === 'Go to Definition') {
                // Try to navigate to the class
                const document = await vscode.workspace.openTextDocument(uri);
                const editor = await vscode.window.showTextDocument(document);
                
                // Find the class line and navigate to it
                const text = document.getText();
                const lines = text.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes(`class ${cls.name}`) && lines[i].includes(':')) {
                        const position = new vscode.Position(i, 0);
                        editor.selection = new vscode.Selection(position, position);
                        editor.revealRange(new vscode.Range(position, position));
                        break;
                    }
                }
            } else if (action === 'Show Methods') {
                // Show a quick pick with all methods
                if (cls.methods && cls.methods.length > 0) {
                    const methodItems = cls.methods.map((method: any) => ({
                        label: method.name,
                        description: `Complexity: ${method.complexity || 0}`,
                        detail: `References: ${method.references || 0}`,
                        method: method
                    }));

                    const selected = await vscode.window.showQuickPick(methodItems, {
                        placeHolder: 'Select a method to navigate to'
                    });

                    if (selected && (selected as any).method) {
                        await this.handleShowMethodDetails((selected as any).method, cls, uri);
                    }
                }
            } else if (action === 'Show in Explorer') {
                vscode.commands.executeCommand('revealInExplorer', uri);
            }

        } catch (error) {
            this.errorHandler.logError(
                'Show class details command failed',
                error,
                'CodeLensHandler'
            );
            vscode.window.showErrorMessage('Failed to show class details.');
        }
    }

    /**
     * Handle show method details command (triggered by code lens)
     */
    public async handleShowMethodDetails(method: any, cls: any, uri: vscode.Uri): Promise<void> {
        try {
            this.errorHandler.logError(
                'Show method details command initiated',
                { methodName: method.name, className: cls.name },
                'CodeLensHandler'
            );

            const complexity = method.complexity || method.cyclomatic_complexity || 0;
            const references = method.references || method.call_count || 0;
            const lineCount = method.line_count || method.lines || 0;

            const message = `Method: ${cls.name}.${method.name}\n` +
                          `Complexity: ${complexity}\n` +
                          `References: ${references}\n` +
                          `Lines: ${lineCount}`;

            const action = await vscode.window.showInformationMessage(
                message,
                'Go to Definition',
                'Show in Explorer'
            );

            if (action === 'Go to Definition') {
                // Try to navigate to the method
                const document = await vscode.workspace.openTextDocument(uri);
                const editor = await vscode.window.showTextDocument(document);
                
                // Find the method line and navigate to it
                const text = document.getText();
                const lines = text.split('\n');
                let inClass = false;
                let classIndent = -1;
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    
                    // Check if we're entering the target class
                    if (line.includes(`class ${cls.name}`) && line.includes(':')) {
                        inClass = true;
                        classIndent = line.length - line.trimStart().length;
                        continue;
                    }
                    
                    // Check if we've left the class
                    if (inClass && line.trim() && 
                        (line.length - line.trimStart().length) <= classIndent && 
                        !line.trimStart().startsWith('#')) {
                        inClass = false;
                    }
                    
                    // Look for method definition within the class
                    if (inClass && line.includes(`def ${method.name}(`)) {
                        const position = new vscode.Position(i, 0);
                        editor.selection = new vscode.Selection(position, position);
                        editor.revealRange(new vscode.Range(position, position));
                        break;
                    }
                }
            } else if (action === 'Show in Explorer') {
                vscode.commands.executeCommand('revealInExplorer', uri);
            }

        } catch (error) {
            this.errorHandler.logError(
                'Show method details command failed',
                error,
                'CodeLensHandler'
            );
            vscode.window.showErrorMessage('Failed to show method details.');
        }
    }

    /**
     * Update analysis data for code lens
     */
    public updateFromAnalysisData(analysisData: any): void {
        this.codeLensManager.updateFromAnalysisData(analysisData);
    }

    /**
     * Restore code lens state
     */
    public restoreState(): void {
        this.codeLensManager.restoreState();
    }

    /**
     * Check if code lens is enabled
     */
    public isEnabled(): boolean {
        return this.codeLensManager.isEnabled();
    }

    /**
     * Get the code lens manager instance
     */
    public getManager(): CodeLensManager {
        return this.codeLensManager;
    }

    /**
     * Handle apply suggestion command
     */
    public async handleApplySuggestion(suggestion: CodeLensSuggestion, func: any, uri: vscode.Uri): Promise<void> {
        try {
            this.errorHandler.logError(
                'Apply suggestion command initiated',
                { type: suggestion.type, message: suggestion.message },
                'CodeLensHandler'
            );

            await this.codeLensManager.applySuggestion(suggestion, func, uri);

        } catch (error) {
            this.errorHandler.logError(
                'Apply suggestion command failed',
                error,
                'CodeLensHandler'
            );
            vscode.window.showErrorMessage('Failed to apply suggestion. Check the output for details.');
        }
    }

    /**
     * Handle show suggestion details command
     */
    public async handleShowSuggestionDetails(suggestion: CodeLensSuggestion, func: any, uri: vscode.Uri): Promise<void> {
        try {
            this.errorHandler.logError(
                'Show suggestion details command initiated',
                { type: suggestion.type, message: suggestion.message },
                'CodeLensHandler'
            );

            await this.codeLensManager.showSuggestionDetails(suggestion, func, uri);

        } catch (error) {
            this.errorHandler.logError(
                'Show suggestion details command failed',
                error,
                'CodeLensHandler'
            );
            vscode.window.showErrorMessage('Failed to show suggestion details.');
        }
    }

    /**
     * Handle code lens state changed event
     */
    public handleCodeLensStateChanged(enabled: boolean): void {
        try {
            this.commandManager.updateCommandState(enabled);
            
            this.errorHandler.logError(
                'Code lens state changed',
                { enabled },
                'CodeLensHandler'
            );

        } catch (error) {
            this.errorHandler.logError(
                'Failed to handle code lens state change',
                error,
                'CodeLensHandler'
            );
        }
    }

    /**
     * Get dynamic command manager
     */
    public getCommandManager(): CodeLensCommandManager {
        return this.commandManager;
    }

    /**
     * Update code lens configuration
     */
    public updateConfig(config: any): void {
        this.codeLensManager.updateConfig(config);
    }

    /**
     * Get current configuration
     */
    public getConfig(): any {
        return this.codeLensManager.getConfig();
    }



    /**
     * Handle code lens enablement with auto-run support
     */
    public async handleEnableCodeLensWithAutoRun(): Promise<void> {
        try {
            // Enable code lens first
            await this.handleEnableCodeLens();
            
            // Then check if auto-run is enabled
            if (this.guidanceCommandHandler) {
                await this.guidanceCommandHandler.handleAutoRunAnalysis();
            }
        } catch (error) {
            this.errorHandler.logError(
                'Error enabling code lens with auto-run',
                error,
                'CodeLensHandler'
            );
        }
    }

    /**
     * Set guidance command handler for integration
     */
    public setGuidanceCommandHandler(guidanceCommandHandler: any): void {
        this.guidanceCommandHandler = guidanceCommandHandler;
        this.errorHandler.logError(
            'Guidance command handler set for code lens handler',
            null,
            'CodeLensHandler'
        );
    }

    /**
     * Get guidance command handler
     */
    public getGuidanceCommandHandler(): any {
        return this.guidanceCommandHandler;
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        this.commandManager.dispose();
        this.codeLensManager.dispose();
    }
}