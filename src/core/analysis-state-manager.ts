import { ErrorHandler } from './error-handler';

/**
 * Analysis state model for centralized state management
 */
export interface AnalysisState {
  isAnalyzing: boolean;
  lastResult: any | null;
  currentOptions: any | null;
  activeCommands: Set<string>;
  lastAnalysisTime: number;
  errorCount: number;
}

/**
 * Event listener for state changes
 */
export type StateChangeListener = (state: AnalysisState) => void;

/**
 * Centralized analysis state manager
 */
export class AnalysisStateManager {
  private static instance: AnalysisStateManager;
  private state: AnalysisState;
  private listeners: StateChangeListener[] = [];
  private errorHandler: ErrorHandler;

  private constructor(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;
    this.state = {
      isAnalyzing: false,
      lastResult: null,
      currentOptions: null,
      activeCommands: new Set<string>(),
      lastAnalysisTime: 0,
      errorCount: 0
    };
  }

  public static getInstance(errorHandler?: ErrorHandler): AnalysisStateManager {
    if (!AnalysisStateManager.instance) {
      if (!errorHandler) {
        throw new Error('ErrorHandler required for first initialization');
      }
      AnalysisStateManager.instance = new AnalysisStateManager(errorHandler);
    }
    return AnalysisStateManager.instance;
  }

  /**
   * Gets current analysis state
   */
  public isAnalyzing(): boolean {
    return this.state.isAnalyzing;
  }

  /**
   * Gets last analysis result
   */
  public getLastResult(): any | null {
    return this.state.lastResult;
  }

  /**
   * Gets current analysis options
   */
  public getCurrentOptions(): any | null {
    return this.state.currentOptions;
  }

  /**
   * Gets complete state (read-only copy)
   */
  public getState(): Readonly<AnalysisState> {
    return {
      ...this.state,
      activeCommands: new Set(this.state.activeCommands)
    };
  }

  /**
   * Sets analysis state
   */
  public setAnalyzing(analyzing: boolean, options?: any): void {
    const wasAnalyzing = this.state.isAnalyzing;
    
    this.state.isAnalyzing = analyzing;
    this.state.currentOptions = analyzing ? options || null : null;
    
    if (analyzing && !wasAnalyzing) {
      this.state.lastAnalysisTime = Date.now();
    }

    this.errorHandler.logError(
      `Analysis state changed: ${wasAnalyzing} -> ${analyzing}`,
      { options },
      'setAnalyzing'
    );

    this.notifyListeners();
  }

  /**
   * Sets last analysis result
   */
  public setLastResult(result: any | null): void {
    const validatedResult = this.errorHandler.validateAnalysisResult(result);
    
    this.state.lastResult = validatedResult;
    
    if (validatedResult === null && result !== null) {
      this.state.errorCount++;
      this.errorHandler.handleNullResult('setLastResult');
    }

    this.errorHandler.logError(
      `Last result updated: ${validatedResult ? 'valid' : 'null'}`,
      null,
      'setLastResult'
    );

    this.notifyListeners();
  }

  /**
   * Adds active command
   */
  public addActiveCommand(commandId: string): void {
    this.state.activeCommands.add(commandId);
    
    this.errorHandler.logError(
      `Added active command: ${commandId} (total: ${this.state.activeCommands.size})`,
      null,
      'addActiveCommand'
    );

    this.notifyListeners();
  }

  /**
   * Removes active command
   */
  public removeActiveCommand(commandId: string): void {
    const removed = this.state.activeCommands.delete(commandId);
    
    if (removed) {
      this.errorHandler.logError(
        `Removed active command: ${commandId} (remaining: ${this.state.activeCommands.size})`,
        null,
        'removeActiveCommand'
      );
    }

    this.notifyListeners();
  }

  /**
   * Validates current state consistency
   */
  public validateState(): boolean {
    const issues: string[] = [];

    // Check if analyzing state matches active commands
    if (this.state.isAnalyzing && this.state.activeCommands.size === 0) {
      issues.push('Analyzing is true but no active commands');
    }

    // Check for stale analysis state
    if (this.state.isAnalyzing && this.state.lastAnalysisTime > 0) {
      const elapsed = Date.now() - this.state.lastAnalysisTime;
      if (elapsed > 60000) { // 1 minute
        issues.push(`Analysis has been running for ${elapsed}ms`);
      }
    }

    // Check error count
    if (this.state.errorCount > 10) {
      issues.push(`High error count: ${this.state.errorCount}`);
    }

    if (issues.length > 0) {
      this.errorHandler.logError(
        'State validation issues found',
        { issues, state: this.state },
        'validateState'
      );
      return false;
    }

    return true;
  }

  /**
   * Resets state to initial values
   */
  public resetState(): void {
    this.errorHandler.logError(
      'Resetting analysis state',
      { previousState: this.state },
      'resetState'
    );

    this.state = {
      isAnalyzing: false,
      lastResult: null,
      currentOptions: null,
      activeCommands: new Set<string>(),
      lastAnalysisTime: 0,
      errorCount: 0
    };

    this.notifyListeners();
  }

  /**
   * Increments error count
   */
  public incrementErrorCount(): void {
    this.state.errorCount++;
    this.notifyListeners();
  }

  /**
   * Adds state change listener
   */
  public addStateChangeListener(listener: StateChangeListener): void {
    this.listeners.push(listener);
  }

  /**
   * Removes state change listener
   */
  public removeStateChangeListener(listener: StateChangeListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notifies all listeners of state changes
   */
  private notifyListeners(): void {
    const currentState = this.getState();
    
    this.listeners.forEach(listener => {
      try {
        listener(currentState);
      } catch (error) {
        this.errorHandler.logError(
          'Error in state change listener',
          error,
          'notifyListeners'
        );
      }
    });
  }

  /**
   * Gets state summary for debugging
   */
  public getStateSummary(): string {
    return `Analysis: ${this.state.isAnalyzing}, Commands: ${this.state.activeCommands.size}, Errors: ${this.state.errorCount}, Last: ${this.state.lastAnalysisTime}`;
  }
}