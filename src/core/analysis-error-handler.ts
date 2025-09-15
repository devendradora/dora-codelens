import * as vscode from 'vscode';
import { ErrorHandler } from './error-handler';

/**
 * Interface for analysis error context
 */
export interface AnalysisErrorContext {
    operation: string;
    filePath?: string;
    functionName?: string;
    className?: string;
    timestamp: number;
    retryCount?: number;
}

/**
 * Interface for recovery strategy
 */
export interface RecoveryStrategy {
    id: string;
    name: string;
    description: string;
    canRecover: (error: Error, context: AnalysisErrorContext) => boolean;
    recover: (error: Error, context: AnalysisErrorContext) => Promise<boolean>;
    priority: number;
}

/**
 * Enhanced error handler for analysis pipeline with recovery mechanisms
 */
export class AnalysisErrorHandler {
    private static instance: AnalysisErrorHandler;
    private errorHandler: ErrorHandler;
    private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();
    private errorHistory: Map<string, AnalysisErrorContext[]> = new Map();
    private maxRetries = 3;
    private maxHistorySize = 100;

    private constructor(errorHandler: ErrorHandler) {
        this.errorHandler = errorHandler;
        this.initializeRecoveryStrategies();
    }

    public static getInstance(errorHandler?: ErrorHandler): AnalysisErrorHandler {
        if (!AnalysisErrorHandler.instance) {
            if (!errorHandler) {
                throw new Error('ErrorHandler required for first initialization');
            }
            AnalysisErrorHandler.instance = new AnalysisErrorHandler(errorHandler);
        }
        return AnalysisErrorHandler.instance;
    }

    /**
     * Initialize built-in recovery strategies
     */
    private initializeRecoveryStrategies(): void {
        // Python service recovery
        this.addRecoveryStrategy({
            id: 'python-service-restart',
            name: 'Python Service Restart',
            description: 'Restart Python service when it becomes unresponsive',
            priority: 1,
            canRecover: (error, context) => {
                return context.operation.includes('python') && 
                       (error.message.includes('timeout') || 
                        error.message.includes('connection') ||
                        error.message.includes('spawn'));
            },
            recover: async (error, context) => {
                try {
                    this.errorHandler.logError(
                        'Attempting Python service recovery',
                        { error: error.message, context },
                        'AnalysisErrorHandler'
                    );

                    // Import PythonService dynamically to avoid circular dependency
                    const { PythonService } = await import('../services/python-service');
                    const pythonService = PythonService.getInstance(this.errorHandler);
                    
                    // Kill active processes and clear cache
                    pythonService.killAllActiveProcesses();
                    await pythonService.clearAnalyzerCache();
                    
                    this.errorHandler.logError(
                        'Python service recovery successful',
                        null,
                        'AnalysisErrorHandler'
                    );
                    
                    return true;
                } catch (recoveryError) {
                    this.errorHandler.logError(
                        'Python service recovery failed',
                        recoveryError,
                        'AnalysisErrorHandler'
                    );
                    return false;
                }
            }
        });

        // File access recovery
        this.addRecoveryStrategy({
            id: 'file-access-retry',
            name: 'File Access Retry',
            description: 'Retry file operations with exponential backoff',
            priority: 2,
            canRecover: (error, context) => {
                return error.message.includes('ENOENT') || 
                       error.message.includes('EACCES') ||
                       error.message.includes('file not found');
            },
            recover: async (error, context) => {
                try {
                    if (!context.filePath) {
                        return false;
                    }

                    // Wait with exponential backoff
                    const retryCount = context.retryCount || 0;
                    const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                    
                    // Check if file exists now
                    const fs = await import('fs');
                    const exists = fs.existsSync(context.filePath);
                    
                    this.errorHandler.logError(
                        'File access recovery attempt',
                        { filePath: context.filePath, exists, retryCount },
                        'AnalysisErrorHandler'
                    );
                    
                    return exists;
                } catch (recoveryError) {
                    return false;
                }
            }
        });

        // Memory recovery
        this.addRecoveryStrategy({
            id: 'memory-cleanup',
            name: 'Memory Cleanup',
            description: 'Clear caches and force garbage collection',
            priority: 3,
            canRecover: (error, context) => {
                return error.message.includes('out of memory') ||
                       error.message.includes('heap') ||
                       error.message.includes('allocation');
            },
            recover: async (error, context) => {
                try {
                    this.errorHandler.logError(
                        'Attempting memory cleanup recovery',
                        { error: error.message },
                        'AnalysisErrorHandler'
                    );

                    // Clear analysis caches
                    const { AnalysisManager } = await import('./analysis-manager');
                    const analysisManager = AnalysisManager.getInstance();
                    analysisManager.clearCache();

                    // Clear code lens caches
                    const { CodeLensSuggestionEngine } = await import('../services/code-lens-suggestion-engine');
                    const suggestionEngine = CodeLensSuggestionEngine.getInstance();
                    suggestionEngine.clearCache();

                    // Force garbage collection if available
                    if (global.gc) {
                        global.gc();
                    }

                    this.errorHandler.logError(
                        'Memory cleanup recovery completed',
                        null,
                        'AnalysisErrorHandler'
                    );

                    return true;
                } catch (recoveryError) {
                    this.errorHandler.logError(
                        'Memory cleanup recovery failed',
                        recoveryError,
                        'AnalysisErrorHandler'
                    );
                    return false;
                }
            }
        });

        // Configuration recovery
        this.addRecoveryStrategy({
            id: 'config-reset',
            name: 'Configuration Reset',
            description: 'Reset configuration to defaults when corrupted',
            priority: 4,
            canRecover: (error, context) => {
                return error.message.includes('configuration') ||
                       error.message.includes('settings') ||
                       error.message.includes('invalid config');
            },
            recover: async (error, context) => {
                try {
                    this.errorHandler.logError(
                        'Attempting configuration recovery',
                        { error: error.message },
                        'AnalysisErrorHandler'
                    );

                    // Reset workspace configuration
                    const config = vscode.workspace.getConfiguration('doracodelens');
                    await config.update('analysis', undefined, vscode.ConfigurationTarget.Workspace);
                    await config.update('codeLens', undefined, vscode.ConfigurationTarget.Workspace);
                    await config.update('suggestions', undefined, vscode.ConfigurationTarget.Workspace);

                    this.errorHandler.logError(
                        'Configuration recovery completed',
                        null,
                        'AnalysisErrorHandler'
                    );

                    return true;
                } catch (recoveryError) {
                    this.errorHandler.logError(
                        'Configuration recovery failed',
                        recoveryError,
                        'AnalysisErrorHandler'
                    );
                    return false;
                }
            }
        });
    }

    /**
     * Handle analysis error with recovery attempts
     */
    public async handleAnalysisError(
        error: Error,
        context: AnalysisErrorContext
    ): Promise<boolean> {
        try {
            // Log the error
            this.errorHandler.logError(
                'Analysis error occurred',
                { error: error.message, context },
                'AnalysisErrorHandler'
            );

            // Add to error history
            this.addToErrorHistory(context);

            // Check if we should attempt recovery
            const retryCount = context.retryCount || 0;
            if (retryCount >= this.maxRetries) {
                this.errorHandler.logError(
                    'Max retries exceeded, giving up',
                    { retryCount, maxRetries: this.maxRetries },
                    'AnalysisErrorHandler'
                );
                return false;
            }

            // Find applicable recovery strategies
            const strategies = this.findRecoveryStrategies(error, context);
            
            if (strategies.length === 0) {
                this.errorHandler.logError(
                    'No recovery strategies available',
                    { error: error.message },
                    'AnalysisErrorHandler'
                );
                return false;
            }

            // Attempt recovery with each strategy
            for (const strategy of strategies) {
                this.errorHandler.logError(
                    `Attempting recovery with strategy: ${strategy.name}`,
                    { strategyId: strategy.id },
                    'AnalysisErrorHandler'
                );

                const recovered = await strategy.recover(error, {
                    ...context,
                    retryCount: retryCount + 1
                });

                if (recovered) {
                    this.errorHandler.logError(
                        `Recovery successful with strategy: ${strategy.name}`,
                        { strategyId: strategy.id },
                        'AnalysisErrorHandler'
                    );
                    return true;
                }
            }

            this.errorHandler.logError(
                'All recovery strategies failed',
                { attemptedStrategies: strategies.map(s => s.id) },
                'AnalysisErrorHandler'
            );

            return false;

        } catch (handlerError) {
            this.errorHandler.logError(
                'Error in analysis error handler',
                handlerError,
                'AnalysisErrorHandler'
            );
            return false;
        }
    }

    /**
     * Find applicable recovery strategies for an error
     */
    private findRecoveryStrategies(error: Error, context: AnalysisErrorContext): RecoveryStrategy[] {
        const strategies: RecoveryStrategy[] = [];

        for (const strategy of this.recoveryStrategies.values()) {
            if (strategy.canRecover(error, context)) {
                strategies.push(strategy);
            }
        }

        // Sort by priority (lower number = higher priority)
        return strategies.sort((a, b) => a.priority - b.priority);
    }

    /**
     * Add recovery strategy
     */
    public addRecoveryStrategy(strategy: RecoveryStrategy): void {
        this.recoveryStrategies.set(strategy.id, strategy);
        this.errorHandler.logError(
            `Recovery strategy added: ${strategy.name}`,
            { strategyId: strategy.id },
            'AnalysisErrorHandler'
        );
    }

    /**
     * Remove recovery strategy
     */
    public removeRecoveryStrategy(strategyId: string): void {
        this.recoveryStrategies.delete(strategyId);
        this.errorHandler.logError(
            `Recovery strategy removed: ${strategyId}`,
            null,
            'AnalysisErrorHandler'
        );
    }

    /**
     * Add error to history
     */
    private addToErrorHistory(context: AnalysisErrorContext): void {
        const key = `${context.operation}_${context.filePath || 'global'}`;
        
        if (!this.errorHistory.has(key)) {
            this.errorHistory.set(key, []);
        }

        const history = this.errorHistory.get(key)!;
        history.push(context);

        // Limit history size
        if (history.length > this.maxHistorySize) {
            history.splice(0, history.length - this.maxHistorySize);
        }
    }

    /**
     * Get error history for analysis
     */
    public getErrorHistory(operation?: string, filePath?: string): AnalysisErrorContext[] {
        if (operation || filePath) {
            const key = `${operation || ''}_${filePath || 'global'}`;
            return this.errorHistory.get(key) || [];
        }

        // Return all errors
        const allErrors: AnalysisErrorContext[] = [];
        for (const errors of this.errorHistory.values()) {
            allErrors.push(...errors);
        }

        return allErrors.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Clear error history
     */
    public clearErrorHistory(): void {
        this.errorHistory.clear();
        this.errorHandler.logError(
            'Error history cleared',
            null,
            'AnalysisErrorHandler'
        );
    }

    /**
     * Get recovery statistics
     */
    public getRecoveryStatistics(): {
        totalErrors: number;
        recentErrors: number;
        availableStrategies: number;
        errorsByOperation: { [operation: string]: number };
    } {
        const allErrors = this.getErrorHistory();
        const recentErrors = allErrors.filter(
            error => Date.now() - error.timestamp < 3600000 // Last hour
        );

        const errorsByOperation: { [operation: string]: number } = {};
        for (const error of allErrors) {
            errorsByOperation[error.operation] = (errorsByOperation[error.operation] || 0) + 1;
        }

        return {
            totalErrors: allErrors.length,
            recentErrors: recentErrors.length,
            availableStrategies: this.recoveryStrategies.size,
            errorsByOperation
        };
    }

    /**
     * Show user-friendly error message with recovery options
     */
    public async showUserError(
        error: Error,
        context: AnalysisErrorContext,
        recoveryAttempted: boolean = false
    ): Promise<void> {
        let message = `Analysis failed: ${error.message}`;
        
        if (recoveryAttempted) {
            message += '\n\nAutomatic recovery was attempted but failed.';
        }

        const actions: string[] = ['View Details', 'Retry'];
        
        if (!recoveryAttempted) {
            actions.push('Attempt Recovery');
        }

        const selection = await vscode.window.showErrorMessage(message, ...actions);

        switch (selection) {
            case 'View Details':
                this.showErrorDetails(error, context);
                break;
            case 'Retry':
                // Emit retry event or return retry signal
                vscode.commands.executeCommand('doracodelens.retryAnalysis', context);
                break;
            case 'Attempt Recovery':
                await this.handleAnalysisError(error, context);
                break;
        }
    }

    /**
     * Show detailed error information
     */
    private showErrorDetails(error: Error, context: AnalysisErrorContext): void {
        const details = `
Details:
- Operation: ${context.operation}
- File: ${context.filePath || 'N/A'}
- Function: ${context.functionName || 'N/A'}
- Class: ${context.className || 'N/A'}
- Time: ${new Date(context.timestamp).toLocaleString()}
- Message: ${error.message}
- Stack: ${error.stack || 'N/A'}

Recovery Strategies Available:
${Array.from(this.recoveryStrategies.values())
    .filter(s => s.canRecover(error, context))
    .map(s => `- ${s.name}: ${s.description}`)
    .join('\n')}
        `.trim();

        vscode.window.showInformationMessage(
            'Error details copied to clipboard',
            'OK'
        );

        vscode.env.clipboard.writeText(details);
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        this.recoveryStrategies.clear();
        this.errorHistory.clear();
        
        this.errorHandler.logError(
            'Analysis error handler disposed',
            null,
            'AnalysisErrorHandler'
        );
    }
}