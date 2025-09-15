import * as vscode from "vscode";
import { ErrorHandler } from "./error-handler";
import {
  AnalysisErrorHandler,
  AnalysisErrorContext,
} from "./analysis-error-handler";
import { AnalysisLogger } from "./analysis-logger";
import { PythonService } from "../services/python-service";
import { CodeLensInlineProvider } from "../services/code-lens-inline-provider";

/**
 * Interface for analysis pipeline configuration
 */
export interface AnalysisPipelineConfig {
  enableCodeLens: boolean;
  enableComplexityAnalysis: boolean;
  enableSuggestionEngine: boolean;
  autoUpdateOnSave: boolean;
  throttleMs: number;
}

/**
 * Interface for analysis results
 */
export interface AnalysisResults {
  timestamp: number;
  filePath: string;
  functions: any[];
  classes: any[];
  complexity: any;
  suggestions: any[];
  errors: string[];
}

/**
 * Analysis Manager
 * Coordinates analysis pipeline and integrates with code lens provider
 */
export class AnalysisManager {
  private static instance: AnalysisManager;
  private errorHandler: ErrorHandler;
  private analysisErrorHandler: AnalysisErrorHandler;
  private logger: AnalysisLogger;
  private pythonService: PythonService;
  private codeLensProvider: CodeLensInlineProvider | null = null;
  private config: AnalysisPipelineConfig;
  private analysisCache: Map<string, AnalysisResults> = new Map();
  private throttleTimers: Map<string, NodeJS.Timeout> = new Map();
  private disposables: vscode.Disposable[] = [];
  private guidanceManager: any = null; // Will be set by guidance system

  private constructor(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;
    this.analysisErrorHandler = AnalysisErrorHandler.getInstance(errorHandler);
    this.logger = AnalysisLogger.getInstance(errorHandler);
    this.pythonService = PythonService.getInstance(errorHandler);
    this.config = this.getDefaultConfig();
    this.setupEventListeners();
  }

  public static getInstance(errorHandler?: ErrorHandler): AnalysisManager {
    if (!AnalysisManager.instance) {
      if (!errorHandler) {
        throw new Error("ErrorHandler required for first initialization");
      }
      AnalysisManager.instance = new AnalysisManager(errorHandler);
    }
    return AnalysisManager.instance;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): AnalysisPipelineConfig {
    const config = vscode.workspace.getConfiguration("doracodelens.analysis");

    return {
      enableCodeLens: config.get("enableCodeLens", true),
      enableComplexityAnalysis: config.get("enableComplexityAnalysis", true),
      enableSuggestionEngine: config.get("enableSuggestionEngine", true),
      autoUpdateOnSave: config.get("autoUpdateOnSave", true),
      throttleMs: config.get("throttleMs", 1000),
    };
  }

  /**
   * Setup event listeners for automatic analysis
   */
  private setupEventListeners(): void {
    // Listen for document saves
    if (this.config.autoUpdateOnSave) {
      const saveListener = vscode.workspace.onDidSaveTextDocument((document) =>
        this.handleDocumentSave(document)
      );
      this.disposables.push(saveListener);
    }

    // Listen for active editor changes
    const editorChangeListener = vscode.window.onDidChangeActiveTextEditor(
      (editor) => this.handleActiveEditorChange(editor)
    );
    this.disposables.push(editorChangeListener);

    // Listen for configuration changes
    const configChangeListener = vscode.workspace.onDidChangeConfiguration(
      (event) => this.handleConfigurationChange(event)
    );
    this.disposables.push(configChangeListener);
  }

  /**
   * Register code lens provider
   */
  public registerCodeLensProvider(provider: CodeLensInlineProvider): void {
    this.codeLensProvider = provider;
    this.errorHandler.logError(
      "Code lens provider registered with analysis manager",
      null,
      "AnalysisManager"
    );
  }

  /**
   * Register guidance manager for progress tracking
   */
  public registerGuidanceManager(guidanceManager: any): void {
    this.guidanceManager = guidanceManager;
    this.errorHandler.logError(
      "Guidance manager registered with analysis manager",
      null,
      "AnalysisManager"
    );
  }

  /**
   * Analyze current file and update code lens
   */
  public async analyzeCurrentFile(): Promise<AnalysisResults | null> {
    return await this.logger.measureAsync("analyzeCurrentFile", async () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        this.logger.debug(
          "AnalysisManager",
          "analyzeCurrentFile",
          "No active editor found"
        );
        return null;
      }

      const document = activeEditor.document;
      if (document.languageId !== "python") {
        this.logger.debug(
          "AnalysisManager",
          "analyzeCurrentFile",
          "Document is not Python",
          {
            languageId: document.languageId,
          }
        );
        return null;
      }

      const filePath = document.uri.fsPath;

      // Check cache first
      const cached = this.analysisCache.get(filePath);
      if (cached && Date.now() - cached.timestamp < 30000) {
        // 30 second cache
        this.logger.debug(
          "AnalysisManager",
          "analyzeCurrentFile",
          "Using cached results",
          {
            filePath,
            cacheAge: Date.now() - cached.timestamp,
          }
        );
        return cached;
      }

      this.logger.info(
        "AnalysisManager",
        "analyzeCurrentFile",
        "Starting current file analysis",
        null,
        { filePath }
      );

      // Notify guidance manager of analysis start
      if (this.guidanceManager) {
        this.guidanceManager.setAnalysisProgress(filePath, 0);
      }

      try {
        // Check if we can get existing analysis data first
        const stateManager = (
          await import("./analysis-state-manager")
        ).AnalysisStateManager.getInstance();
        let analysisData = stateManager.getLastResult();

        // If no existing data or it's stale, run new analysis
        if (!analysisData || this.isAnalysisDataStale(analysisData, filePath)) {
          this.logger.debug(
            "AnalysisManager",
            "analyzeCurrentFile",
            "Running new analysis",
            null,
            { filePath }
          );

          // Update progress
          if (this.guidanceManager) {
            this.guidanceManager.setAnalysisProgress(filePath, 25);
          }

          // Run Python analyzer through command (this will update the state manager)
          await vscode.commands.executeCommand(
            "doracodelens.analyzeCurrentFile"
          );

          // Update progress
          if (this.guidanceManager) {
            this.guidanceManager.setAnalysisProgress(filePath, 75);
          }

          // Get the updated result from state manager
          analysisData = stateManager.getLastResult();
        }

        if (!analysisData) {
          throw new Error("No analysis data returned from analysis command");
        }

        // Process analysis results
        const results = this.processAnalysisResults(filePath, analysisData);

        // Cache results
        this.analysisCache.set(filePath, results);

        // Update code lens provider if available
        if (this.codeLensProvider && this.config.enableCodeLens) {
          // Pass raw analysis data directly to code lens provider
          const rawDataWithPath = {
            timestamp: new Date().toISOString(),
            filePath: filePath,
            analysis: analysisData,
          };
          this.codeLensProvider.updateAnalysisData(rawDataWithPath);
        }

        // Notify guidance manager of completion
        if (this.guidanceManager) {
          this.guidanceManager.markAnalysisCompleted(filePath);
          this.guidanceManager.setAnalysisProgress(filePath, 100);
        }

        this.logger.info(
          "AnalysisManager",
          "analyzeCurrentFile",
          "Current file analysis completed",
          {
            functionCount: results.functions.length,
            classCount: results.classes.length,
            suggestionCount: results.suggestions.length,
          },
          { filePath }
        );

        return results;
      } catch (error) {
        const errorContext: AnalysisErrorContext = {
          operation: "analyzeCurrentFile",
          filePath,
          timestamp: Date.now(),
        };

        this.logger.error(
          "AnalysisManager",
          "analyzeCurrentFile",
          "Analysis failed",
          { error: error instanceof Error ? error.message : String(error) },
          { filePath }
        );

        // Notify guidance manager of error
        if (this.guidanceManager) {
          this.guidanceManager.setAnalysisError(
            filePath,
            error instanceof Error ? error.message : String(error)
          );
        }

        const recovered = await this.analysisErrorHandler.handleAnalysisError(
          error as Error,
          errorContext
        );

        if (recovered) {
          this.logger.info(
            "AnalysisManager",
            "analyzeCurrentFile",
            "Retrying after recovery",
            null,
            { filePath }
          );

          // Retry the analysis after recovery
          try {
            const stateManager = (
              await import("./analysis-state-manager")
            ).AnalysisStateManager.getInstance();

            // Run analysis command
            await vscode.commands.executeCommand(
              "doracodelens.analyzeCurrentFile"
            );

            // Get the result from state manager
            const retryData = stateManager.getLastResult();
            if (retryData) {
              const results = this.processAnalysisResults(filePath, retryData);
              this.analysisCache.set(filePath, results);

              if (this.codeLensProvider && this.config.enableCodeLens) {
                const rawRetryDataWithPath = {
                  timestamp: new Date().toISOString(),
                  filePath: filePath,
                  analysis: retryData,
                };
                this.codeLensProvider.updateAnalysisData(rawRetryDataWithPath);
              }

              this.logger.info(
                "AnalysisManager",
                "analyzeCurrentFile",
                "Retry successful",
                null,
                { filePath }
              );
              return results;
            }
          } catch (retryError) {
            this.logger.error(
              "AnalysisManager",
              "analyzeCurrentFile",
              "Retry failed",
              {
                error:
                  retryError instanceof Error
                    ? retryError.message
                    : String(retryError),
              },
              { filePath }
            );
          }
        }

        throw error;
      }
    });
  }

  /**
   * Analyze current file in background without showing progress UI
   */
  public async analyzeCurrentFileInBackground(
    document: vscode.TextDocument
  ): Promise<any> {
    return await this.logger.measureAsync(
      "analyzeCurrentFileInBackground",
      async () => {
        const filePath = document.uri.fsPath;

        // Check cache first
        const cached = this.analysisCache.get(filePath);
        if (cached && Date.now() - cached.timestamp < 30000) {
          // 30 second cache
          this.logger.debug(
            "AnalysisManager",
            "analyzeCurrentFileInBackground",
            "Using cached results",
            {
              filePath,
              cacheAge: Date.now() - cached.timestamp,
            }
          );

          // Return raw cached data for code lens
          return {
            timestamp: new Date().toISOString(),
            filePath: filePath,
            analysis: cached,
          };
        }

        this.logger.info(
          "AnalysisManager",
          "analyzeCurrentFileInBackground",
          "Starting background analysis",
          null,
          { filePath }
        );

        try {
          // Check if we can get existing analysis data first
          const stateManager = (
            await import("./analysis-state-manager")
          ).AnalysisStateManager.getInstance();
          let analysisData = stateManager.getLastResult();

          // If no existing data or it's stale, run new analysis
          if (
            !analysisData ||
            this.isAnalysisDataStale(analysisData, filePath)
          ) {
            this.logger.debug(
              "AnalysisManager",
              "analyzeCurrentFileInBackground",
              "Running new background analysis",
              null,
              { filePath }
            );

            // Run Python analyzer in background without showing webview
            const { CurrentFileAnalysisHandler } = await import(
              "../commands/current-file-analysis-handler"
            );
            const { DuplicateCallGuard } = await import(
              "./duplicate-call-guard"
            );
            const { AnalysisStateManager } = await import(
              "./analysis-state-manager"
            );
            const { WebviewManager } = await import(
              "../webviews/webview-manager"
            );

            const duplicateCallGuard = DuplicateCallGuard.getInstance();
            const webviewManager = new WebviewManager(this.errorHandler, ""); // Empty extension path for background
            const handler = new CurrentFileAnalysisHandler(
              this.errorHandler,
              duplicateCallGuard,
              stateManager,
              webviewManager
            );

            // Run background analysis
            analysisData = await handler.executeInBackground(filePath);
          }

          if (!analysisData) {
            this.logger.debug(
              "AnalysisManager",
              "analyzeCurrentFileInBackground",
              "No analysis data returned",
              null,
              { filePath }
            );
            return null;
          }

          // Process analysis results
          const results = this.processAnalysisResults(filePath, analysisData);

          // Cache results
          this.analysisCache.set(filePath, results);

          // Prepare raw data for code lens provider
          const rawDataWithPath = {
            timestamp: new Date().toISOString(),
            filePath: filePath,
            analysis: analysisData,
          };

          // Update code lens provider if available
          if (this.codeLensProvider && this.config.enableCodeLens) {
            this.codeLensProvider.updateAnalysisData(rawDataWithPath);
          }

          this.logger.info(
            "AnalysisManager",
            "analyzeCurrentFileInBackground",
            "Background analysis completed",
            {
              functionCount:
                analysisData.complexity_metrics?.function_complexities
                  ?.length || 0,
              classCount:
                analysisData.complexity_metrics?.class_complexities?.length ||
                0,
            },
            { filePath }
          );

          return rawDataWithPath;
        } catch (error) {
          this.logger.error(
            "AnalysisManager",
            "analyzeCurrentFileInBackground",
            "Background analysis failed",
            { error: error instanceof Error ? error.message : String(error) },
            { filePath }
          );
          throw error;
        }
      }
    );
  }

  /**
   * Analyze full project and update code lens for all files
   */
  public async analyzeFullProject(): Promise<Map<string, AnalysisResults>> {
    try {
      this.errorHandler.logError(
        "Starting full project analysis",
        null,
        "AnalysisManager"
      );

      // Run Python analyzer for full project
      const analysisData = (await vscode.commands.executeCommand(
        "doracodelens.analyzeFullCode"
      )) as any;

      if (!analysisData) {
        throw new Error("No analysis data returned from Python service");
      }

      const results = new Map<string, AnalysisResults>();

      // Process results for each file
      if (analysisData && analysisData.files) {
        for (const fileData of analysisData.files) {
          const filePath = fileData.path || fileData.file_path;
          if (filePath) {
            const fileResults = this.processAnalysisResults(filePath, fileData);
            results.set(filePath, fileResults);

            // Cache individual file results
            this.analysisCache.set(filePath, fileResults);
          }
        }
      }

      // Update code lens provider with full analysis data
      if (this.codeLensProvider && this.config.enableCodeLens) {
        this.codeLensProvider.updateAnalysisData(analysisData);
      }

      this.errorHandler.logError(
        "Full project analysis completed",
        { fileCount: results.size },
        "AnalysisManager"
      );

      return results;
    } catch (error) {
      const errorContext: AnalysisErrorContext = {
        operation: "analyzeFullProject",
        timestamp: Date.now(),
      };

      const recovered = await this.analysisErrorHandler.handleAnalysisError(
        error as Error,
        errorContext
      );

      if (recovered) {
        // Retry the analysis after recovery
        try {
          const retryData = (await vscode.commands.executeCommand(
            "doracodelens.analyzeFullCode"
          )) as any;
          if (retryData) {
            const results = new Map<string, AnalysisResults>();

            if (retryData && retryData.files) {
              for (const fileData of retryData.files) {
                const filePath = fileData.path || fileData.file_path;
                if (filePath) {
                  const fileResults = this.processAnalysisResults(
                    filePath,
                    fileData
                  );
                  results.set(filePath, fileResults);
                  this.analysisCache.set(filePath, fileResults);
                }
              }
            }

            if (this.codeLensProvider && this.config.enableCodeLens) {
              this.codeLensProvider.updateAnalysisData(retryData);
            }

            return results;
          }
        } catch (retryError) {
          this.errorHandler.logError(
            "Full project analysis retry failed",
            retryError,
            "AnalysisManager"
          );
        }
      }

      this.errorHandler.logError(
        "Full project analysis failed",
        error,
        "AnalysisManager"
      );
      return new Map();
    }
  }

  /**
   * Check if analysis data is stale for the given file
   */
  private isAnalysisDataStale(analysisData: any, filePath: string): boolean {
    if (!analysisData || !analysisData.timestamp) {
      return true;
    }

    // Check if the analysis is for the current file
    if (
      analysisData.file_path !== filePath &&
      analysisData.filePath !== filePath
    ) {
      return true;
    }

    // Check if analysis is older than 30 seconds
    const age = Date.now() - analysisData.timestamp;
    return age > 30000;
  }

  /**
   * Process raw analysis results into structured format
   */
  private processAnalysisResults(
    filePath: string,
    analysisData: any
  ): AnalysisResults {
    // Process raw analysis data directly
    const functions =
      analysisData.complexity_metrics?.function_complexities || [];
    const classes = analysisData.complexity_metrics?.class_complexities || [];
    const complexity =
      analysisData.complexity_metrics?.overall_complexity || {};

    // Extract suggestions from functions and classes
    const suggestions: any[] = [];

    // Process function suggestions
    functions.forEach((func: any) => {
      if (func.suggestions) {
        suggestions.push(
          ...func.suggestions.map((s: any) => ({
            ...s,
            functionName: func.name,
            type: "function",
          }))
        );
      }
    });

    // Process class method suggestions
    classes.forEach((cls: any) => {
      if (cls.methods) {
        cls.methods.forEach((method: any) => {
          if (method.suggestions) {
            suggestions.push(
              ...method.suggestions.map((s: any) => ({
                ...s,
                functionName: method.name,
                className: cls.name,
                type: "method",
              }))
            );
          }
        });
      }
    });

    return {
      timestamp: Date.now(),
      filePath,
      functions,
      classes,
      complexity,
      suggestions,
      errors: analysisData.errors || [],
    };
  }

  /**
   * Handle document save event
   */
  private async handleDocumentSave(
    document: vscode.TextDocument
  ): Promise<void> {
    if (document.languageId !== "python") {
      return;
    }

    const filePath = document.uri.fsPath;

    // Throttle analysis to prevent excessive calls
    const existingTimer = this.throttleTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      try {
        await this.analyzeCurrentFile();
        this.throttleTimers.delete(filePath);
      } catch (error) {
        this.errorHandler.logError(
          "Auto-analysis on save failed",
          error,
          "AnalysisManager"
        );
      }
    }, this.config.throttleMs);

    this.throttleTimers.set(filePath, timer);
  }

  /**
   * Handle active editor change event
   */
  private async handleActiveEditorChange(
    editor: vscode.TextEditor | undefined
  ): Promise<void> {
    if (!editor || editor.document.languageId !== "python") {
      return;
    }

    // Check if we have cached analysis for this file
    const filePath = editor.document.uri.fsPath;
    const cached = this.analysisCache.get(filePath);

    if (cached && this.codeLensProvider) {
      // Update code lens with cached data
      this.codeLensProvider.updateAnalysisData({
        files: [cached],
      });
    } else if (this.config.enableCodeLens && this.codeLensProvider) {
      // No cached data and code lens is enabled - trigger automatic analysis with throttling
      this.logger.info(
        "AnalysisManager",
        "handleActiveEditorChange",
        "Triggering automatic analysis for opened Python file",
        null,
        { filePath }
      );

      // Throttle automatic analysis to prevent excessive calls
      const existingTimer = this.throttleTimers.get(filePath);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(async () => {
        try {
          // Run analysis in background without showing progress UI
          await this.analyzeCurrentFileInBackground(editor.document);
          this.throttleTimers.delete(filePath);
        } catch (error) {
          this.logger.error(
            "AnalysisManager",
            "handleActiveEditorChange",
            "Automatic analysis failed",
            { error: error instanceof Error ? error.message : String(error) },
            { filePath }
          );
          this.throttleTimers.delete(filePath);
        }
      }, Math.min(this.config.throttleMs, 500)); // Use shorter delay for file opening (max 500ms)

      this.throttleTimers.set(filePath, timer);
    }
  }

  /**
   * Handle configuration change event
   */
  private handleConfigurationChange(
    event: vscode.ConfigurationChangeEvent
  ): void {
    if (event.affectsConfiguration("doracodelens.analysis")) {
      this.config = this.getDefaultConfig();

      // Clear cache if configuration changed
      this.analysisCache.clear();

      this.errorHandler.logError(
        "Analysis configuration updated",
        this.config,
        "AnalysisManager"
      );
    }
  }

  /**
   * Get cached analysis results for a file
   */
  public getCachedResults(filePath: string): AnalysisResults | null {
    return this.analysisCache.get(filePath) || null;
  }

  /**
   * Clear analysis cache
   */
  public clearCache(): void {
    this.analysisCache.clear();
    this.errorHandler.logError(
      "Analysis cache cleared",
      null,
      "AnalysisManager"
    );
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<AnalysisPipelineConfig>): void {
    this.config = { ...this.config, ...newConfig };

    this.errorHandler.logError(
      "Analysis manager configuration updated",
      newConfig,
      "AnalysisManager"
    );
  }

  /**
   * Get current configuration
   */
  public getConfig(): AnalysisPipelineConfig {
    return { ...this.config };
  }

  /**
   * Check if analysis is enabled for code lens
   */
  public isCodeLensAnalysisEnabled(): boolean {
    return this.config.enableCodeLens && this.config.enableComplexityAnalysis;
  }

  /**
   * Force refresh analysis for current file
   */
  public async forceRefreshCurrentFile(): Promise<AnalysisResults | null> {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return null;
    }

    const filePath = activeEditor.document.uri.fsPath;

    // Remove from cache to force fresh analysis
    this.analysisCache.delete(filePath);

    return await this.analyzeCurrentFile();
  }

  /**
   * Get analysis statistics
   */
  public getStatistics(): {
    cachedFiles: number;
    activeTimers: number;
    lastAnalysisTime: number | null;
  } {
    const cachedFiles = this.analysisCache.size;
    const activeTimers = this.throttleTimers.size;

    let lastAnalysisTime: number | null = null;
    for (const results of this.analysisCache.values()) {
      if (!lastAnalysisTime || results.timestamp > lastAnalysisTime) {
        lastAnalysisTime = results.timestamp;
      }
    }

    return {
      cachedFiles,
      activeTimers,
      lastAnalysisTime,
    };
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    // Clear all timers
    this.throttleTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.throttleTimers.clear();

    // Dispose event listeners
    this.disposables.forEach((disposable) => {
      disposable.dispose();
    });
    this.disposables = [];

    // Clear cache
    this.analysisCache.clear();

    this.errorHandler.logError(
      "Analysis manager disposed",
      null,
      "AnalysisManager"
    );
  }
}
