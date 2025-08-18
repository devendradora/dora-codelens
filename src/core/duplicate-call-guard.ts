import * as vscode from 'vscode';
import { ErrorHandler } from './error-handler';

/**
 * Command execution context for tracking active commands
 */
export interface CommandExecutionContext {
  commandId: string;
  startTime: number;
  parameters: any[];
  retryCount: number;
  maxRetries: number;
}

/**
 * Duplicate call guard to prevent simultaneous analysis operations
 */
export class DuplicateCallGuard {
  private static instance: DuplicateCallGuard;
  private activeCommands: Map<string, CommandExecutionContext> = new Map();
  private isAnalyzing: boolean = false;
  private errorHandler: ErrorHandler;
  private readonly COMMAND_TIMEOUT = 30000; // 30 seconds

  private constructor(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;
  }

  public static getInstance(errorHandler?: ErrorHandler): DuplicateCallGuard {
    if (!DuplicateCallGuard.instance) {
      if (!errorHandler) {
        throw new Error('ErrorHandler required for first initialization');
      }
      DuplicateCallGuard.instance = new DuplicateCallGuard(errorHandler);
    }
    return DuplicateCallGuard.instance;
  }

  /**
   * Checks if a command can be executed (not already running)
   */
  public canExecuteCommand(commandId: string): boolean {
    const isActive = this.activeCommands.has(commandId);
    
    if (isActive) {
      const context = this.activeCommands.get(commandId)!;
      const elapsed = Date.now() - context.startTime;
      
      // Check for timeout
      if (elapsed > this.COMMAND_TIMEOUT) {
        this.errorHandler.logError(
          `Command ${commandId} timed out after ${elapsed}ms, allowing new execution`,
          null,
          'canExecuteCommand'
        );
        this.unregisterCommandExecution(commandId);
        return true;
      }
      
      this.errorHandler.logError(
        `Duplicate command execution prevented for ${commandId}`,
        { elapsed, context },
        'canExecuteCommand'
      );
      
      vscode.window.showWarningMessage(
        `Analysis is already running. Please wait for it to complete.`
      );
      
      return false;
    }
    
    return true;
  }

  /**
   * Checks if analysis can start (no other analysis running)
   */
  public canStartAnalysis(): boolean {
    if (this.isAnalyzing) {
      this.errorHandler.logError(
        'Analysis already in progress, preventing duplicate',
        null,
        'canStartAnalysis'
      );
      
      vscode.window.showWarningMessage(
        'Analysis is already in progress. Please wait for it to complete.'
      );
      
      return false;
    }
    
    return true;
  }

  /**
   * Registers a command execution
   */
  public registerCommandExecution(commandId: string, parameters: any[] = []): void {
    const context: CommandExecutionContext = {
      commandId,
      startTime: Date.now(),
      parameters,
      retryCount: 0,
      maxRetries: 3
    };
    
    this.activeCommands.set(commandId, context);
    this.errorHandler.logError(
      `Registered command execution: ${commandId}`,
      { context },
      'registerCommandExecution'
    );
  }

  /**
   * Unregisters a command execution
   */
  public unregisterCommandExecution(commandId: string): void {
    const context = this.activeCommands.get(commandId);
    if (context) {
      const elapsed = Date.now() - context.startTime;
      this.errorHandler.logError(
        `Unregistered command execution: ${commandId} (took ${elapsed}ms)`,
        { context },
        'unregisterCommandExecution'
      );
    }
    
    this.activeCommands.delete(commandId);
  }

  /**
   * Sets analysis state
   */
  public setAnalyzing(analyzing: boolean): void {
    this.isAnalyzing = analyzing;
    this.errorHandler.logError(
      `Analysis state changed to: ${analyzing}`,
      null,
      'setAnalyzing'
    );
  }

  /**
   * Gets current analysis state
   */
  public isCurrentlyAnalyzing(): boolean {
    return this.isAnalyzing;
  }

  /**
   * Gets active command count
   */
  public getActiveCommandCount(): number {
    return this.activeCommands.size;
  }

  /**
   * Gets active commands for debugging
   */
  public getActiveCommands(): string[] {
    return Array.from(this.activeCommands.keys());
  }

  /**
   * Clears all active commands (for error recovery)
   */
  public clearAllActiveCommands(): void {
    this.errorHandler.logError(
      `Clearing all active commands (${this.activeCommands.size} commands)`,
      { activeCommands: Array.from(this.activeCommands.keys()) },
      'clearAllActiveCommands'
    );
    
    this.activeCommands.clear();
    this.isAnalyzing = false;
  }

  /**
   * Executes a command with duplicate protection
   */
  public async executeWithProtection<T>(
    commandId: string,
    executionFn: () => Promise<T>,
    parameters: any[] = []
  ): Promise<T | null> {
    if (!this.canExecuteCommand(commandId)) {
      return null;
    }

    this.registerCommandExecution(commandId, parameters);
    
    try {
      const result = await executionFn();
      return result;
    } catch (error) {
      this.errorHandler.logError(
        `Command execution failed: ${commandId}`,
        error,
        'executeWithProtection'
      );
      throw error;
    } finally {
      this.unregisterCommandExecution(commandId);
    }
  }
}