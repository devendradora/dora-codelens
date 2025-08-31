import * as vscode from 'vscode';
import { JsonContextDetector } from '../utils/json-context-detector';
import { ErrorHandler } from './error-handler';

/**
 * Manages JSON context detection and VS Code context keys
 */
export class JsonContextManager {
    private static instance: JsonContextManager;
    private errorHandler: ErrorHandler;
    private disposables: vscode.Disposable[] = [];
    private contextKeys = {
        jsonContext: 'doracodebird.jsonContext',
        jsonFile: 'doracodebird.jsonFile',
        jsonAtCursor: 'doracodebird.jsonAtCursor'
    };

    private constructor(errorHandler: ErrorHandler) {
        this.errorHandler = errorHandler;
        this.setupEventListeners();
        this.updateContext(); // Initial context update
    }

    public static getInstance(errorHandler?: ErrorHandler): JsonContextManager {
        if (!JsonContextManager.instance) {
            if (!errorHandler) {
                throw new Error('ErrorHandler required for first initialization');
            }
            JsonContextManager.instance = new JsonContextManager(errorHandler);
        }
        return JsonContextManager.instance;
    }

    /**
     * Set up event listeners for cursor movement and file changes
     */
    private setupEventListeners(): void {
        try {
            // Listen for active editor changes
            const onDidChangeActiveEditor = vscode.window.onDidChangeActiveTextEditor(() => {
                this.updateContext();
            });

            // Listen for cursor position changes
            const onDidChangeTextEditorSelection = vscode.window.onDidChangeTextEditorSelection(() => {
                this.updateContext();
            });

            // Listen for document changes (in case JSON content changes)
            const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(() => {
                // Debounce this to avoid too frequent updates
                this.debounceUpdateContext();
            });

            this.disposables.push(
                onDidChangeActiveEditor,
                onDidChangeTextEditorSelection,
                onDidChangeTextDocument
            );

            this.errorHandler.logError('JSON context event listeners set up successfully', null, 'JsonContextManager');
        } catch (error) {
            this.errorHandler.logError('Failed to set up JSON context event listeners', error, 'JsonContextManager');
        }
    }

    private updateContextTimeout: NodeJS.Timeout | undefined;

    /**
     * Debounced context update to avoid too frequent calls
     */
    private debounceUpdateContext(): void {
        if (this.updateContextTimeout) {
            clearTimeout(this.updateContextTimeout);
        }
        this.updateContextTimeout = setTimeout(() => {
            this.updateContext();
        }, 100); // 100ms debounce
    }

    /**
     * Update VS Code context keys based on current editor state
     */
    private updateContext(): void {
        try {
            const editor = vscode.window.activeTextEditor;
            
            if (!editor) {
                // No active editor - disable all JSON contexts
                this.setContextKeys(false, false, false);
                return;
            }

            const document = editor.document;
            const position = editor.selection.active;

            // Check if it's a JSON file
            const isJsonFile = JsonContextDetector.isJsonFile(document);
            
            // Check if there's JSON at cursor position
            const hasJsonAtCursor = JsonContextDetector.hasJsonAtCursor(document, position);
            
            // Overall JSON context (either JSON file or JSON at cursor)
            const isJsonContext = isJsonFile || hasJsonAtCursor;

            this.setContextKeys(isJsonContext, isJsonFile, hasJsonAtCursor);

        } catch (error) {
            this.errorHandler.logError('Failed to update JSON context', error, 'JsonContextManager');
            // On error, disable all contexts to be safe
            this.setContextKeys(false, false, false);
        }
    }

    /**
     * Set VS Code context keys
     */
    private setContextKeys(jsonContext: boolean, jsonFile: boolean, jsonAtCursor: boolean): void {
        try {
            vscode.commands.executeCommand('setContext', this.contextKeys.jsonContext, jsonContext);
            vscode.commands.executeCommand('setContext', this.contextKeys.jsonFile, jsonFile);
            vscode.commands.executeCommand('setContext', this.contextKeys.jsonAtCursor, jsonAtCursor);
        } catch (error) {
            this.errorHandler.logError('Failed to set JSON context keys', error, 'JsonContextManager');
        }
    }

    /**
     * Get current context state (for debugging)
     */
    public async getContextState(): Promise<{
        jsonContext: boolean;
        jsonFile: boolean;
        jsonAtCursor: boolean;
    }> {
        try {
            const editor = vscode.window.activeTextEditor;
            
            if (!editor) {
                return { jsonContext: false, jsonFile: false, jsonAtCursor: false };
            }

            const document = editor.document;
            const position = editor.selection.active;

            const isJsonFile = JsonContextDetector.isJsonFile(document);
            const hasJsonAtCursor = JsonContextDetector.hasJsonAtCursor(document, position);
            const isJsonContext = isJsonFile || hasJsonAtCursor;

            return {
                jsonContext: isJsonContext,
                jsonFile: isJsonFile,
                jsonAtCursor: hasJsonAtCursor
            };
        } catch (error) {
            this.errorHandler.logError('Failed to get JSON context state', error, 'JsonContextManager');
            return { jsonContext: false, jsonFile: false, jsonAtCursor: false };
        }
    }

    /**
     * Force context update (useful for testing or manual refresh)
     */
    public forceUpdateContext(): void {
        this.updateContext();
    }

    /**
     * Dispose of all resources
     */
    public dispose(): void {
        try {
            if (this.updateContextTimeout) {
                clearTimeout(this.updateContextTimeout);
            }

            this.disposables.forEach(disposable => {
                try {
                    disposable.dispose();
                } catch (error) {
                    this.errorHandler.logError('Error disposing JSON context listener', error, 'JsonContextManager');
                }
            });
            
            this.disposables = [];

            // Clear context keys
            this.setContextKeys(false, false, false);

            this.errorHandler.logError('JSON context manager disposed successfully', null, 'JsonContextManager');
        } catch (error) {
            this.errorHandler.logError('Error during JSON context manager disposal', error, 'JsonContextManager');
        }
    }
}