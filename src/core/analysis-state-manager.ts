import { ErrorHandler } from './error-handler';

/**
 * Cached analysis result with metadata
 */
export interface CachedAnalysisResult {
  data: any;
  timestamp: number;
  workspacePath: string;
  options: any;
  isValid: boolean;
}

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
  cachedResult: CachedAnalysisResult | null;
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
      errorCount: 0,
      cachedResult: null
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
   * Sets cached analysis result with metadata
   */
  public setCachedResult(result: any, workspacePath: string, options: any = {}): void {
    const validatedResult = this.errorHandler.validateAnalysisResult(result);
    
    if (validatedResult) {
      this.state.cachedResult = {
        data: validatedResult,
        timestamp: Date.now(),
        workspacePath,
        options,
        isValid: true
      };
      
      // Also update lastResult for backward compatibility
      this.state.lastResult = validatedResult;
      
      this.errorHandler.logError(
        'Cached analysis result updated',
        { workspacePath, timestamp: this.state.cachedResult.timestamp },
        'setCachedResult'
      );
    } else {
      this.state.cachedResult = null;
      this.errorHandler.logError(
        'Failed to cache invalid analysis result',
        null,
        'setCachedResult'
      );
    }

    this.notifyListeners();
  }

  /**
   * Gets cached analysis result if valid
   */
  public getCachedResult(workspacePath: string, maxAgeMs: number = 300000): CachedAnalysisResult | null {
    if (!this.state.cachedResult) {
      return null;
    }

    // Check if cache is for the same workspace
    if (this.state.cachedResult.workspacePath !== workspacePath) {
      this.errorHandler.logError(
        'Cached result is for different workspace',
        { 
          cached: this.state.cachedResult.workspacePath, 
          requested: workspacePath 
        },
        'getCachedResult'
      );
      return null;
    }

    // Check if cache is still valid (default 5 minutes)
    const age = Date.now() - this.state.cachedResult.timestamp;
    if (age > maxAgeMs) {
      this.errorHandler.logError(
        'Cached result is too old',
        { age, maxAge: maxAgeMs },
        'getCachedResult'
      );
      return null;
    }

    // Check if cache is marked as valid
    if (!this.state.cachedResult.isValid) {
      this.errorHandler.logError(
        'Cached result is marked as invalid',
        null,
        'getCachedResult'
      );
      return null;
    }

    return this.state.cachedResult;
  }

  /**
   * Invalidates cached result
   */
  public invalidateCache(): void {
    if (this.state.cachedResult) {
      this.state.cachedResult.isValid = false;
      this.errorHandler.logError(
        'Cache invalidated',
        { timestamp: this.state.cachedResult.timestamp },
        'invalidateCache'
      );
      this.notifyListeners();
    }
  }

  /**
   * Clears cached result completely
   */
  public clearCache(): void {
    if (this.state.cachedResult) {
      this.errorHandler.logError(
        'Cache cleared',
        { timestamp: this.state.cachedResult.timestamp },
        'clearCache'
      );
      this.state.cachedResult = null;
      this.notifyListeners();
    }
  }

  /**
   * Gets cache info for display
   */
  public getCacheInfo(): { hasCache: boolean; timestamp: number | null; age: number | null; workspacePath: string | null } {
    if (!this.state.cachedResult) {
      return { hasCache: false, timestamp: null, age: null, workspacePath: null };
    }

    return {
      hasCache: true,
      timestamp: this.state.cachedResult.timestamp,
      age: Date.now() - this.state.cachedResult.timestamp,
      workspacePath: this.state.cachedResult.workspacePath
    };
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
      errorCount: 0,
      cachedResult: null
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