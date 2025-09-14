import * as vscode from 'vscode';
import { ErrorHandler } from './error-handler';

/**
 * Interface for dynamic command configuration
 */
export interface DynamicCommand {
    id: string;
    enabledTitle: string;
    disabledTitle: string;
    enabledTooltip: string;
    disabledTooltip: string;
    icon?: string;
}

/**
 * Interface for command state
 */
export interface CommandState {
    codeLensEnabled: boolean;
    lastUpdate: number;
    activeDocument?: string;
}

/**
 * Dynamic Command Manager for Code Lens
 * Manages context-aware command registration and state-dependent labeling
 */
export class CodeLensCommandManager {
    private static instance: CodeLensCommandManager;
    private errorHandler: ErrorHandler;
    private context: vscode.ExtensionContext;
    private commandState: CommandState;
    private dynamicCommands: Map<string, DynamicCommand> = new Map();
    private registeredCommands: Map<string, vscode.Disposable> = new Map();

    private constructor(errorHandler: ErrorHandler, context: vscode.ExtensionContext) {
        this.errorHandler = errorHandler;
        this.context = context;
        this.commandState = {
            codeLensEnabled: false,
            lastUpdate: Date.now(),
            activeDocument: undefined
        };
        
        this.initializeDynamicCommands();
    }

    public static getInstance(errorHandler?: ErrorHandler, context?: vscode.ExtensionContext): CodeLensCommandManager {
        if (!CodeLensCommandManager.instance) {
            if (!errorHandler || !context) {
                throw new Error('ErrorHandler and ExtensionContext required for first initialization');
            }
            CodeLensCommandManager.instance = new CodeLensCommandManager(errorHandler, context);
        }
        return CodeLensCommandManager.instance;
    }

    /**
     * Initialize dynamic command definitions
     */
    private initializeDynamicCommands(): void {
        // Note: All code lens commands are registered in main command manager to avoid conflicts
        // This manager only handles state management and title updates
    }

    /**
     * Register dynamic commands with state-aware titles
     */
    public registerDynamicCommands(): void {
        try {
            this.dynamicCommands.forEach((commandConfig, commandId) => {
                // Unregister existing command if it exists
                if (this.registeredCommands.has(commandId)) {
                    this.registeredCommands.get(commandId)?.dispose();
                }

                // Register command with current state-aware title
                const disposable = vscode.commands.registerCommand(commandId, () => {
                    this.handleDynamicCommand(commandId);
                });

                this.registeredCommands.set(commandId, disposable);
                this.context.subscriptions.push(disposable);
            });

            // Update command titles based on current state
            this.updateCommandTitles();

            this.errorHandler.logError(
                'Dynamic commands registered successfully',
                { commandCount: this.dynamicCommands.size },
                'CodeLensCommandManager'
            );

        } catch (error) {
            this.errorHandler.logError(
                'Failed to register dynamic commands',
                error,
                'CodeLensCommandManager'
            );
        }
    }

    /**
     * Handle dynamic command execution
     */
    private handleDynamicCommand(commandId: string): void {
        try {
            // Note: Command execution is handled by main command manager
            // This manager only handles state updates
            switch (commandId) {
                default:
                    this.errorHandler.logError(
                        `Unknown dynamic command: ${commandId}`,
                        null,
                        'CodeLensCommandManager'
                    );
            }
        } catch (error) {
            this.errorHandler.logError(
                `Error handling dynamic command: ${commandId}`,
                error,
                'CodeLensCommandManager'
            );
        }
    }



    /**
     * Enable code lens
     */
    public enableCodeLens(): void {
        this.commandState.codeLensEnabled = true;
        this.commandState.lastUpdate = Date.now();
        this.updateCommandTitles();
        this.persistState();
        
        // Emit event for other components
        vscode.commands.executeCommand('doracodelens.codeLensStateChanged', true);
        
        vscode.window.showInformationMessage('Code Lens -> On');
        
        this.errorHandler.logError(
            'Code lens enabled via command manager',
            null,
            'CodeLensCommandManager'
        );
    }

    /**
     * Disable code lens
     */
    public disableCodeLens(): void {
        this.commandState.codeLensEnabled = false;
        this.commandState.lastUpdate = Date.now();
        this.updateCommandTitles();
        this.persistState();
        
        // Emit event for other components
        vscode.commands.executeCommand('doracodelens.codeLensStateChanged', false);
        
        vscode.window.showInformationMessage('Code Lens -> Off');
        
        this.errorHandler.logError(
            'Code lens disabled via command manager',
            null,
            'CodeLensCommandManager'
        );
    }

    /**
     * Update command titles based on current state
     */
    private updateCommandTitles(): void {
        try {
            this.dynamicCommands.forEach((commandConfig, commandId) => {
                const currentTitle = this.commandState.codeLensEnabled 
                    ? commandConfig.enabledTitle 
                    : commandConfig.disabledTitle;
                
                const currentTooltip = this.commandState.codeLensEnabled 
                    ? commandConfig.enabledTooltip 
                    : commandConfig.disabledTooltip;

                // Update command in package.json contributions (this is for display purposes)
                // The actual command execution is handled by the registered handlers
                this.errorHandler.logError(
                    `Command title updated: ${commandId} -> ${currentTitle}`,
                    { tooltip: currentTooltip },
                    'CodeLensCommandManager'
                );
            });

            // Update context for when clauses
            vscode.commands.executeCommand('setContext', 'doracodelens.codeLensEnabled', this.commandState.codeLensEnabled);

        } catch (error) {
            this.errorHandler.logError(
                'Error updating command titles',
                error,
                'CodeLensCommandManager'
            );
        }
    }

    /**
     * Get current command state
     */
    public getCommandState(): CommandState {
        return { ...this.commandState };
    }

    /**
     * Update command state
     */
    public updateCommandState(enabled: boolean): void {
        const previousState = this.commandState.codeLensEnabled;
        this.commandState.codeLensEnabled = enabled;
        this.commandState.lastUpdate = Date.now();
        
        if (previousState !== enabled) {
            this.updateCommandTitles();
            this.persistState();
        }
    }

    /**
     * Persist state to extension context
     */
    private persistState(): void {
        try {
            this.context.globalState.update('doracodelens.commandState', this.commandState);
            this.errorHandler.logError(
                'Command state persisted',
                this.commandState,
                'CodeLensCommandManager'
            );
        } catch (error) {
            this.errorHandler.logError(
                'Failed to persist command state',
                error,
                'CodeLensCommandManager'
            );
        }
    }

    /**
     * Restore state from extension context
     */
    public restoreState(): void {
        try {
            const savedState = this.context.globalState.get<CommandState>('doracodelens.commandState');
            if (savedState) {
                this.commandState = { ...this.commandState, ...savedState };
                this.updateCommandTitles();
                
                this.errorHandler.logError(
                    'Command state restored',
                    this.commandState,
                    'CodeLensCommandManager'
                );
            }
        } catch (error) {
            this.errorHandler.logError(
                'Failed to restore command state',
                error,
                'CodeLensCommandManager'
            );
        }
    }

    /**
     * Get dynamic command title for current state
     */
    public getDynamicCommandTitle(commandId: string): string {
        const commandConfig = this.dynamicCommands.get(commandId);
        if (!commandConfig) {
            return commandId;
        }

        return this.commandState.codeLensEnabled 
            ? commandConfig.enabledTitle 
            : commandConfig.disabledTitle;
    }

    /**
     * Get dynamic command tooltip for current state
     */
    public getDynamicCommandTooltip(commandId: string): string {
        const commandConfig = this.dynamicCommands.get(commandId);
        if (!commandConfig) {
            return '';
        }

        return this.commandState.codeLensEnabled 
            ? commandConfig.enabledTooltip 
            : commandConfig.disabledTooltip;
    }

    /**
     * Check if code lens is enabled
     */
    public isCodeLensEnabled(): boolean {
        return this.commandState.codeLensEnabled;
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        try {
            this.registeredCommands.forEach((disposable) => {
                disposable.dispose();
            });
            this.registeredCommands.clear();
            
            this.errorHandler.logError(
                'Code lens command manager disposed',
                null,
                'CodeLensCommandManager'
            );
        } catch (error) {
            this.errorHandler.logError(
                'Error disposing code lens command manager',
                error,
                'CodeLensCommandManager'
            );
        }
    }
}