import * as vscode from 'vscode';
import { ErrorHandler } from '../core/error-handler';
import { CodeLensSuggestion } from './code-lens-suggestion-engine';

/**
 * Interface for suggestion display configuration
 */
export interface SuggestionDisplayConfig {
    maxSuggestionsVisible: number;
    showIcons: boolean;
    showSeverityColors: boolean;
    enableClickableActions: boolean;
    multiLineDisplay: boolean;
    compactMode: boolean;
}

/**
 * Interface for suggestion interaction result
 */
export interface SuggestionInteractionResult {
    success: boolean;
    action: 'applied' | 'viewed' | 'dismissed' | 'error';
    message?: string;
    error?: string;
}

/**
 * Suggestion Display Manager
 * Handles professional display of suggestions with clickable interactions
 */
export class SuggestionDisplayManager {
    private static instance: SuggestionDisplayManager;
    private errorHandler: ErrorHandler;
    private config: SuggestionDisplayConfig;
    private context: vscode.ExtensionContext;

    private constructor(errorHandler: ErrorHandler, context: vscode.ExtensionContext) {
        this.errorHandler = errorHandler;
        this.context = context;
        this.config = this.getDefaultConfig();
        this.registerCommands();
    }

    public static getInstance(errorHandler?: ErrorHandler, context?: vscode.ExtensionContext): SuggestionDisplayManager {
        if (!SuggestionDisplayManager.instance) {
            if (!errorHandler || !context) {
                throw new Error('ErrorHandler and ExtensionContext required for first initialization');
            }
            SuggestionDisplayManager.instance = new SuggestionDisplayManager(errorHandler, context);
        }
        return SuggestionDisplayManager.instance;
    }

    /**
     * Get default display configuration
     */
    private getDefaultConfig(): SuggestionDisplayConfig {
        const config = vscode.workspace.getConfiguration('doracodelens.suggestionDisplay');
        
        return {
            maxSuggestionsVisible: config.get('maxSuggestionsVisible', 3),
            showIcons: config.get('showIcons', true),
            showSeverityColors: config.get('showSeverityColors', true),
            enableClickableActions: config.get('enableClickableActions', true),
            multiLineDisplay: config.get('multiLineDisplay', true),
            compactMode: config.get('compactMode', false)
        };
    }

    /**
     * Register suggestion-related commands
     */
    private registerCommands(): void {
        // Command to apply a suggestion
        const applySuggestionCommand = vscode.commands.registerCommand(
            'doracodelens.applySuggestion',
            (suggestion: CodeLensSuggestion, functionData: any, documentUri: vscode.Uri) => {
                this.applySuggestion(suggestion, functionData, documentUri);
            }
        );

        // Command to show suggestion details
        const showSuggestionDetailsCommand = vscode.commands.registerCommand(
            'doracodelens.showSuggestionDetails',
            (suggestion: CodeLensSuggestion, functionData: any, documentUri: vscode.Uri) => {
                this.showSuggestionDetails(suggestion, functionData, documentUri);
            }
        );

        // Command to dismiss a suggestion
        const dismissSuggestionCommand = vscode.commands.registerCommand(
            'doracodelens.dismissSuggestion',
            (suggestion: CodeLensSuggestion) => {
                this.dismissSuggestion(suggestion);
            }
        );

        // Command to show all suggestions for a function
        const showAllSuggestionsCommand = vscode.commands.registerCommand(
            'doracodelens.showAllSuggestions',
            (suggestions: CodeLensSuggestion[], functionData: any, documentUri: vscode.Uri) => {
                this.showAllSuggestions(suggestions, functionData, documentUri);
            }
        );

        this.context.subscriptions.push(
            applySuggestionCommand,
            showSuggestionDetailsCommand,
            dismissSuggestionCommand,
            showAllSuggestionsCommand
        );
    }

    /**
     * Create code lens items for suggestions with proper formatting
     */
    public createSuggestionCodeLenses(
        suggestions: CodeLensSuggestion[],
        range: vscode.Range,
        functionData: any,
        documentUri: vscode.Uri
    ): vscode.CodeLens[] {
        const codeLenses: vscode.CodeLens[] = [];

        if (!suggestions.length) {
            return codeLenses;
        }

        try {
            // Limit visible suggestions based on configuration
            const visibleSuggestions = suggestions.slice(0, this.config.maxSuggestionsVisible);
            const hasMoreSuggestions = suggestions.length > this.config.maxSuggestionsVisible;

            // Create code lens for each visible suggestion
            visibleSuggestions.forEach((suggestion, index) => {
                const codeLens = this.createSuggestionCodeLens(
                    suggestion,
                    range,
                    functionData,
                    documentUri,
                    index
                );
                if (codeLens) {
                    codeLenses.push(codeLens);
                }
            });

            // Add "show more" code lens if there are additional suggestions
            if (hasMoreSuggestions) {
                const showMoreCodeLens = this.createShowMoreCodeLens(
                    suggestions,
                    range,
                    functionData,
                    documentUri
                );
                if (showMoreCodeLens) {
                    codeLenses.push(showMoreCodeLens);
                }
            }

            this.errorHandler.logError(
                `Created ${codeLenses.length} suggestion code lenses`,
                { totalSuggestions: suggestions.length, visible: visibleSuggestions.length },
                'SuggestionDisplayManager'
            );

        } catch (error) {
            this.errorHandler.logError(
                'Error creating suggestion code lenses',
                error,
                'SuggestionDisplayManager'
            );
        }

        return codeLenses;
    }

    /**
     * Create a single suggestion code lens
     */
    private createSuggestionCodeLens(
        suggestion: CodeLensSuggestion,
        range: vscode.Range,
        functionData: any,
        documentUri: vscode.Uri,
        index: number
    ): vscode.CodeLens | null {
        try {
            const icon = this.getSuggestionIcon(suggestion);
            const title = this.formatSuggestionTitle(suggestion, icon);
            const tooltip = this.createSuggestionTooltip(suggestion);
            
            const command: vscode.Command = {
                title,
                command: suggestion.actionable ? 'doracodelens.applySuggestion' : 'doracodelens.showSuggestionDetails',
                arguments: [suggestion, functionData, documentUri],
                tooltip
            };

            // Adjust range for multi-line display
            const adjustedRange = this.config.multiLineDisplay 
                ? new vscode.Range(range.start.line + index + 1, 0, range.start.line + index + 1, 0)
                : range;

            return new vscode.CodeLens(adjustedRange, command);

        } catch (error) {
            this.errorHandler.logError(
                'Error creating suggestion code lens',
                error,
                'SuggestionDisplayManager'
            );
            return null;
        }
    }

    /**
     * Create "show more" code lens for additional suggestions
     */
    private createShowMoreCodeLens(
        allSuggestions: CodeLensSuggestion[],
        range: vscode.Range,
        functionData: any,
        documentUri: vscode.Uri
    ): vscode.CodeLens | null {
        try {
            const hiddenCount = allSuggestions.length - this.config.maxSuggestionsVisible;
            const title = `$(chevron-down) ${hiddenCount} more suggestion${hiddenCount > 1 ? 's' : ''}...`;
            
            const command: vscode.Command = {
                title,
                command: 'doracodelens.showAllSuggestions',
                arguments: [allSuggestions, functionData, documentUri],
                tooltip: `Show all ${allSuggestions.length} suggestions for this function`
            };

            const adjustedRange = this.config.multiLineDisplay 
                ? new vscode.Range(range.start.line + this.config.maxSuggestionsVisible + 1, 0, range.start.line + this.config.maxSuggestionsVisible + 1, 0)
                : range;

            return new vscode.CodeLens(adjustedRange, command);

        } catch (error) {
            this.errorHandler.logError(
                'Error creating show more code lens',
                error,
                'SuggestionDisplayManager'
            );
            return null;
        }
    }

    /**
     * Get appropriate icon for suggestion
     */
    private getSuggestionIcon(suggestion: CodeLensSuggestion): string {
        if (!this.config.showIcons) {
            return '';
        }

        const iconMap: { [key: string]: string } = {
            'complexity': '$(warning)',
            'documentation': '$(book)',
            'parameters': '$(symbol-parameter)',
            'length': '$(fold)',
            'performance': '$(dashboard)',
            'patterns': '$(search)'
        };

        const severityIconMap: { [key: string]: string } = {
            'error': '$(error)',
            'warning': '$(warning)',
            'info': '$(info)'
        };

        // Use severity icon if configured, otherwise use type icon
        if (this.config.showSeverityColors) {
            return severityIconMap[suggestion.severity] || iconMap[suggestion.type] || '$(lightbulb)';
        }

        return iconMap[suggestion.type] || '$(lightbulb)';
    }

    /**
     * Format suggestion title with appropriate styling
     */
    private formatSuggestionTitle(suggestion: CodeLensSuggestion, icon: string): string {
        const prefix = icon ? `${icon} ` : '';
        
        if (this.config.compactMode) {
            // Truncate long messages in compact mode
            const maxLength = 50;
            const message = suggestion.message.length > maxLength 
                ? `${suggestion.message.substring(0, maxLength)}...`
                : suggestion.message;
            return `${prefix}${message}`;
        }

        return `${prefix}${suggestion.message}`;
    }

    /**
     * Create detailed tooltip for suggestion
     */
    private createSuggestionTooltip(suggestion: CodeLensSuggestion): string {
        const parts: string[] = [];
        
        parts.push(`**${suggestion.message}**`);
        parts.push(`Type: ${suggestion.type}`);
        parts.push(`Severity: ${suggestion.severity}`);
        
        if (suggestion.actionable && suggestion.quickFix) {
            parts.push(`Quick Fix: ${suggestion.quickFix}`);
        }
        
        if (suggestion.detailedGuidance) {
            parts.push(`\n**Guidance:**\n${suggestion.detailedGuidance}`);
        }
        
        if (suggestion.modernAlternative) {
            parts.push(`\n**Modern Alternative:**\n${suggestion.modernAlternative}`);
        }

        if (suggestion.actionable) {
            parts.push('\n*Click to apply suggestion*');
        } else {
            parts.push('\n*Click for more details*');
        }

        return parts.join('\n');
    }

    /**
     * Apply a suggestion (placeholder for actual implementation)
     */
    private async applySuggestion(
        suggestion: CodeLensSuggestion,
        functionData: any,
        documentUri: vscode.Uri
    ): Promise<SuggestionInteractionResult> {
        try {
            this.errorHandler.logError(
                `Applying suggestion: ${suggestion.id}`,
                { type: suggestion.type, message: suggestion.message },
                'SuggestionDisplayManager'
            );

            // Show quick fix options or apply automatic fixes
            const result = await this.handleSuggestionApplication(suggestion, functionData, documentUri);
            
            if (result.success) {
                vscode.window.showInformationMessage(
                    `Applied suggestion: ${suggestion.quickFix || suggestion.message}`
                );
            } else {
                vscode.window.showWarningMessage(
                    `Could not apply suggestion: ${result.error || 'Unknown error'}`
                );
            }

            return result;

        } catch (error) {
            this.errorHandler.logError(
                'Error applying suggestion',
                error,
                'SuggestionDisplayManager'
            );

            return {
                success: false,
                action: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Handle the actual application of a suggestion
     */
    private async handleSuggestionApplication(
        suggestion: CodeLensSuggestion,
        functionData: any,
        documentUri: vscode.Uri
    ): Promise<SuggestionInteractionResult> {
        switch (suggestion.type) {
            case 'documentation':
                return this.applyDocumentationSuggestion(suggestion, functionData, documentUri);
            
            case 'complexity':
                return this.applyComplexitySuggestion(suggestion, functionData, documentUri);
            
            case 'parameters':
                return this.applyParameterSuggestion(suggestion, functionData, documentUri);
            
            case 'length':
                return this.applyLengthSuggestion(suggestion, functionData, documentUri);
            
            case 'performance':
                return this.applyPerformanceSuggestion(suggestion, functionData, documentUri);
            
            case 'patterns':
                return this.applyPatternSuggestion(suggestion, functionData, documentUri);
            
            default:
                return {
                    success: false,
                    action: 'error',
                    error: `Unknown suggestion type: ${suggestion.type}`
                };
        }
    }

    /**
     * Apply documentation suggestion
     */
    private async applyDocumentationSuggestion(
        suggestion: CodeLensSuggestion,
        functionData: any,
        documentUri: vscode.Uri
    ): Promise<SuggestionInteractionResult> {
        // Show docstring template or open documentation guide
        const action = await vscode.window.showQuickPick([
            { label: 'Generate docstring template', value: 'template' },
            { label: 'Show documentation guide', value: 'guide' },
            { label: 'Cancel', value: 'cancel' }
        ], {
            placeHolder: 'Choose documentation action'
        });

        if (!action || action.value === 'cancel') {
            return { success: false, action: 'dismissed' };
        }

        if (action.value === 'template') {
            // Generate and insert docstring template
            return this.insertDocstringTemplate(functionData, documentUri);
        } else {
            // Show documentation guide
            return this.showDocumentationGuide(suggestion);
        }
    }

    /**
     * Insert docstring template
     */
    private async insertDocstringTemplate(
        functionData: any,
        documentUri: vscode.Uri
    ): Promise<SuggestionInteractionResult> {
        try {
            const document = await vscode.workspace.openTextDocument(documentUri);
            const editor = await vscode.window.showTextDocument(document);
            
            // Find function line and insert docstring
            const functionLine = this.findFunctionLine(functionData.name, document);
            if (functionLine === -1) {
                return { success: false, action: 'error', error: 'Function not found' };
            }

            const docstring = this.generateDocstringTemplate(functionData);
            const insertPosition = new vscode.Position(functionLine + 1, 0);
            
            await editor.edit(editBuilder => {
                editBuilder.insert(insertPosition, docstring);
            });

            return { success: true, action: 'applied', message: 'Docstring template inserted' };

        } catch (error) {
            return {
                success: false,
                action: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Generate docstring template
     */
    private generateDocstringTemplate(functionData: any): string {
        const indent = '    ';
        const lines: string[] = [];
        
        lines.push(`${indent}"""`);
        lines.push(`${indent}Brief description of ${functionData.name}.`);
        lines.push(`${indent}`);
        
        if (functionData.parameters && functionData.parameters.length > 0) {
            lines.push(`${indent}Args:`);
            functionData.parameters.forEach((param: any) => {
                lines.push(`${indent}    ${param.name}: Description of ${param.name}`);
            });
            lines.push(`${indent}`);
        }
        
        lines.push(`${indent}Returns:`);
        lines.push(`${indent}    Description of return value`);
        lines.push(`${indent}"""`);
        lines.push('');
        
        return lines.join('\n');
    }

    /**
     * Show documentation guide
     */
    private async showDocumentationGuide(suggestion: CodeLensSuggestion): Promise<SuggestionInteractionResult> {
        const panel = vscode.window.createWebviewPanel(
            'documentationGuide',
            'Documentation Guide',
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        panel.webview.html = this.getDocumentationGuideHtml(suggestion);
        
        return { success: true, action: 'viewed', message: 'Documentation guide opened' };
    }

    /**
     * Get documentation guide HTML
     */
    private getDocumentationGuideHtml(suggestion: CodeLensSuggestion): string {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Documentation Guide</title>
            <style>
                body { font-family: var(--vscode-font-family); padding: 20px; }
                h1, h2 { color: var(--vscode-foreground); }
                pre { background: var(--vscode-textBlockQuote-background); padding: 10px; border-radius: 4px; }
                .example { margin: 10px 0; }
            </style>
        </head>
        <body>
            <h1>Python Documentation Guide</h1>
            <h2>Why Document Your Code?</h2>
            <p>${suggestion.detailedGuidance || 'Good documentation makes your code more maintainable and easier to understand.'}</p>
            
            <h2>Docstring Format</h2>
            <div class="example">
                <pre><code>${suggestion.codeExample || 'def example_function(param1, param2):\n    """\n    Brief description.\n    \n    Args:\n        param1: Description\n        param2: Description\n    \n    Returns:\n        Description of return value\n    """'}</code></pre>
            </div>
            
            <h2>Best Practices</h2>
            <ul>
                <li>Keep descriptions concise but informative</li>
                <li>Document all parameters and return values</li>
                <li>Include examples for complex functions</li>
                <li>Use consistent formatting</li>
            </ul>
        </body>
        </html>
        `;
    }

    /**
     * Apply other suggestion types (placeholder implementations)
     */
    private async applyComplexitySuggestion(suggestion: CodeLensSuggestion, functionData: any, documentUri: vscode.Uri): Promise<SuggestionInteractionResult> {
        return this.showSuggestionDetails(suggestion, functionData, documentUri);
    }

    private async applyParameterSuggestion(suggestion: CodeLensSuggestion, functionData: any, documentUri: vscode.Uri): Promise<SuggestionInteractionResult> {
        return this.showSuggestionDetails(suggestion, functionData, documentUri);
    }

    private async applyLengthSuggestion(suggestion: CodeLensSuggestion, functionData: any, documentUri: vscode.Uri): Promise<SuggestionInteractionResult> {
        return this.showSuggestionDetails(suggestion, functionData, documentUri);
    }

    private async applyPerformanceSuggestion(suggestion: CodeLensSuggestion, functionData: any, documentUri: vscode.Uri): Promise<SuggestionInteractionResult> {
        return this.showSuggestionDetails(suggestion, functionData, documentUri);
    }

    private async applyPatternSuggestion(suggestion: CodeLensSuggestion, functionData: any, documentUri: vscode.Uri): Promise<SuggestionInteractionResult> {
        return this.showSuggestionDetails(suggestion, functionData, documentUri);
    }

    /**
     * Show detailed suggestion information
     */
    private async showSuggestionDetails(
        suggestion: CodeLensSuggestion,
        functionData: any,
        documentUri: vscode.Uri
    ): Promise<SuggestionInteractionResult> {
        const panel = vscode.window.createWebviewPanel(
            'suggestionDetails',
            `Suggestion: ${suggestion.type}`,
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        panel.webview.html = this.getSuggestionDetailsHtml(suggestion, functionData);
        
        return { success: true, action: 'viewed', message: 'Suggestion details opened' };
    }

    /**
     * Get suggestion details HTML
     */
    private getSuggestionDetailsHtml(suggestion: CodeLensSuggestion, functionData: any): string {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Suggestion Details</title>
            <style>
                body { font-family: var(--vscode-font-family); padding: 20px; }
                h1, h2 { color: var(--vscode-foreground); }
                .severity-${suggestion.severity} { 
                    border-left: 4px solid ${suggestion.severity === 'error' ? '#f14c4c' : suggestion.severity === 'warning' ? '#ffcc02' : '#0e639c'};
                    padding-left: 10px;
                }
                pre { background: var(--vscode-textBlockQuote-background); padding: 10px; border-radius: 4px; }
                .section { margin: 20px 0; }
            </style>
        </head>
        <body>
            <h1>Code Suggestion</h1>
            <div class="severity-${suggestion.severity}">
                <h2>${suggestion.message}</h2>
                <p><strong>Type:</strong> ${suggestion.type}</p>
                <p><strong>Severity:</strong> ${suggestion.severity}</p>
                <p><strong>Function:</strong> ${functionData.name}</p>
            </div>
            
            ${suggestion.detailedGuidance ? `
            <div class="section">
                <h2>Detailed Guidance</h2>
                <p>${suggestion.detailedGuidance}</p>
            </div>
            ` : ''}
            
            ${suggestion.modernAlternative ? `
            <div class="section">
                <h2>Modern Alternative</h2>
                <p>${suggestion.modernAlternative}</p>
            </div>
            ` : ''}
            
            ${suggestion.codeExample ? `
            <div class="section">
                <h2>Code Example</h2>
                <pre><code>${suggestion.codeExample}</code></pre>
            </div>
            ` : ''}
        </body>
        </html>
        `;
    }

    /**
     * Dismiss a suggestion
     */
    private async dismissSuggestion(suggestion: CodeLensSuggestion): Promise<SuggestionInteractionResult> {
        // Store dismissed suggestions to avoid showing them again
        const dismissedSuggestions = this.context.globalState.get<string[]>('dismissedSuggestions', []);
        dismissedSuggestions.push(suggestion.id);
        await this.context.globalState.update('dismissedSuggestions', dismissedSuggestions);
        
        return { success: true, action: 'dismissed', message: 'Suggestion dismissed' };
    }

    /**
     * Show all suggestions in a quick pick
     */
    private async showAllSuggestions(
        suggestions: CodeLensSuggestion[],
        functionData: any,
        documentUri: vscode.Uri
    ): Promise<void> {
        const items = suggestions.map(suggestion => ({
            label: `${this.getSuggestionIcon(suggestion)} ${suggestion.message}`,
            description: suggestion.type,
            detail: suggestion.detailedGuidance || suggestion.quickFix,
            suggestion
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: `Select a suggestion for ${functionData.name}`,
            matchOnDescription: true,
            matchOnDetail: true
        });

        if (selected) {
            if (selected.suggestion.actionable) {
                await this.applySuggestion(selected.suggestion, functionData, documentUri);
            } else {
                await this.showSuggestionDetails(selected.suggestion, functionData, documentUri);
            }
        }
    }

    /**
     * Find function line in document
     */
    private findFunctionLine(functionName: string, document: vscode.TextDocument): number {
        const text = document.getText();
        const lines = text.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes(`def ${functionName}(`) || line.includes(`async def ${functionName}(`)) {
                return i;
            }
        }
        
        return -1;
    }

    /**
     * Update configuration
     */
    public updateConfig(newConfig: Partial<SuggestionDisplayConfig>): void {
        this.config = { ...this.config, ...newConfig };
        
        this.errorHandler.logError(
            'Suggestion display configuration updated',
            newConfig,
            'SuggestionDisplayManager'
        );
    }

    /**
     * Get current configuration
     */
    public getConfig(): SuggestionDisplayConfig {
        return { ...this.config };
    }
}