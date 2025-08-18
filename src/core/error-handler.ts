import * as vscode from 'vscode';

/**
 * Error context for detailed error tracking
 */
export interface ErrorContext {
  commandId?: string;
  analysisType?: string;
  timestamp: number;
  stackTrace?: string;
  userAction?: string;
}

/**
 * Enhanced error handler with comprehensive error handling and recovery mechanisms
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private outputChannel: vscode.OutputChannel;

  private constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  public static getInstance(outputChannel?: vscode.OutputChannel): ErrorHandler {
    if (!ErrorHandler.instance) {
      if (!outputChannel) {
        throw new Error('OutputChannel required for first initialization');
      }
      ErrorHandler.instance = new ErrorHandler(outputChannel);
    }
    return ErrorHandler.instance;
  }

  /**
   * Validates analysis result and returns null if invalid
   */
  public validateAnalysisResult(result: any): any | null {
    if (result === null || result === undefined) {
      this.logError('Analysis result is null or undefined', null, 'validateAnalysisResult');
      return null;
    }

    if (typeof result !== 'object') {
      this.logError('Analysis result is not an object', { result }, 'validateAnalysisResult');
      return null;
    }

    return result;
  }

  /**
   * Handles null result scenarios gracefully
   */
  public handleNullResult(context: string): void {
    const message = `Null result encountered in ${context}`;
    this.logError(message, null, context);
    
    // Don't show error to user for null results, just log it
    this.outputChannel.appendLine(`[WARNING] ${message}`);
  }

  /**
   * Logs detailed error information
   */
  public logError(message: string, error: any, context?: string): void {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${context}]` : '';
    
    let errorDetails = '';
    if (error) {
      if (error instanceof Error) {
        errorDetails = `\nError: ${error.message}\nStack: ${error.stack}`;
      } else {
        errorDetails = `\nError Details: ${JSON.stringify(error, null, 2)}`;
      }
    }

    const fullMessage = `[${timestamp}]${contextStr} ${message}${errorDetails}`;
    
    this.outputChannel.appendLine(fullMessage);
    console.error(fullMessage);
  }

  /**
   * Shows user-friendly error message with optional actions
   */
  public showUserError(message: string, actions?: string[]): void {
    this.outputChannel.appendLine(`[USER ERROR] ${message}`);
    
    if (actions && actions.length > 0) {
      vscode.window.showErrorMessage(message, ...actions).then(selection => {
        if (selection) {
          this.outputChannel.appendLine(`User selected action: ${selection}`);
        }
      });
    } else {
      vscode.window.showErrorMessage(message);
    }
  }

  /**
   * Creates error context for tracking
   */
  public createErrorContext(commandId?: string, analysisType?: string, userAction?: string): ErrorContext {
    return {
      commandId,
      analysisType,
      timestamp: Date.now(),
      userAction
    };
  }

  /**
   * Handles errors with automatic recovery attempts
   */
  public handleErrorWithRecovery(error: any, context: ErrorContext, recoveryFn?: () => Promise<void>): void {
    this.logError('Error occurred with recovery context', error, context.commandId);
    
    if (recoveryFn) {
      recoveryFn().catch(recoveryError => {
        this.logError('Recovery function failed', recoveryError, context.commandId);
      });
    }
  }
}