import * as vscode from "vscode";
import * as crypto from "crypto";
import { ErrorHandler } from "../core/error-handler";
import { CurrentFileAnalysisHandler } from "../commands/current-file-analysis-handler";

/**
 * Interface for analysis result
 */
export interface AnalysisResult {
  filePath: string;
  timestamp: number;
  functions: FunctionAnalysis[];
  classes: ClassAnalysis[];
  complexity: ComplexityMetrics;
  status: "success" | "error" | "pending";
  error?: string;
}

/**
 * Interface for function analysis
 */
export interface FunctionAnalysis {
  name: string;
  line: number;
  complexity: number;
  cyclomatic_complexity: number;
  references: number;
  call_count: number;
  line_count: number;
  lines: number;
  parameters: any[];
  has_docstring: boolean;
}

/**
 * Interface for class analysis
 */
export interface ClassAnalysis {
  name: string;
  line: number;
  complexity: number;
  total_complexity: number;
  line_count: number;
  lines: number;
  methods: FunctionAnalysis[];
}

/**
 * Interface for complexity metrics
 */
export interface ComplexityMetrics {
  average: number;
  total: number;
  max: number;
  min: number;
}

/**
 * Interface for analysis cache entry
 */
interface AnalysisCacheEntry {
  result: AnalysisResult;
  contentHash: string;
  timestamp: number;
  expiresAt: number;
}

/**
 * Background Analysis Manager for automatic file analysis with caching
 */
export class BackgroundAnalysisManager {
  private static instance: BackgroundAnalysisManager;
  private errorHandler: ErrorHandler;
  private currentFileAnalysisHandler: CurrentFileAnalysisHandler | null = null;
  private analysisCache: Map<string, AnalysisCacheEntry> = new Map();
  private activeAnalyses: Map<string, Promise<AnalysisResult>> = new Map();
  private readonly CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;
  private disposables: vscode.Disposable[] = [];

  private constructor(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;

    // Register document change listeners for cache invalidation
    this.registerDocumentListeners();

    // Clean up expired cache entries periodically
    this.startCacheCleanup();
  }

  public static getInstance(
    errorHandler?: ErrorHandler
  ): BackgroundAnalysisManager {
    if (!BackgroundAnalysisManager.instance) {
      if (!errorHandler) {
        throw new Error("ErrorHandler required for first initialization");
      }
      BackgroundAnalysisManager.instance = new BackgroundAnalysisManager(
        errorHandler
      );
    }
    return BackgroundAnalysisManager.instance;
  }

  /**
   * Analyze file in background with cache-first approach
   */
  public async analyzeFileInBackground(
    document: vscode.TextDocument
  ): Promise<AnalysisResult> {
    const filePath = document.uri.fsPath;

    try {
      // Check if analysis is already in progress
      const activeAnalysis = this.activeAnalyses.get(filePath);
      if (activeAnalysis) {
        this.errorHandler.logError(
          `Analysis already in progress for ${filePath}`,
          null,
          "BackgroundAnalysisManager"
        );
        return await activeAnalysis;
      }

      // Check cache first
      const cachedResult = this.getCachedAnalysis(filePath, document.getText());
      if (cachedResult) {
        this.errorHandler.logError(
          `Using cached analysis for ${filePath}`,
          { timestamp: cachedResult.timestamp },
          "BackgroundAnalysisManager"
        );
        return cachedResult;
      }

      // Start new analysis
      const analysisPromise = this.performAnalysis(document);
      this.activeAnalyses.set(filePath, analysisPromise);

      try {
        const result = await analysisPromise;

        // Cache the result
        this.setCachedAnalysis(filePath, document.getText(), result);

        this.errorHandler.logError(
          `Background analysis completed for ${filePath}`,
          {
            status: result.status,
            functionCount: result.functions.length,
            classCount: result.classes.length,
          },
          "BackgroundAnalysisManager"
        );

        // Notify command manager to update sidebar with background analysis
        try {
          const { CommandManager } = await import("../core/command-manager");
          const commandManager = CommandManager.getInstance();
          const duration = Date.now() - result.timestamp;
          const status =
            result.status === "pending" ? "success" : result.status;
          commandManager.notifyAnalysisCompleted(
            "current-file",
            status,
            duration,
            filePath,
            result
          );
        } catch (notificationError) {
          this.errorHandler.logError(
            "Failed to notify sidebar of background analysis completion",
            notificationError,
            "BackgroundAnalysisManager"
          );
        }

        return result;
      } finally {
        this.activeAnalyses.delete(filePath);
      }
    } catch (error) {
      this.activeAnalyses.delete(filePath);

      const errorResult: AnalysisResult = {
        filePath,
        timestamp: Date.now(),
        functions: [],
        classes: [],
        complexity: { average: 0, total: 0, max: 0, min: 0 },
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      };

      this.errorHandler.logError(
        `Background analysis failed for ${filePath}`,
        error,
        "BackgroundAnalysisManager"
      );

      // Notify command manager to update sidebar with failed background analysis
      try {
        const { CommandManager } = await import("../core/command-manager");
        const commandManager = CommandManager.getInstance();
        const duration = Date.now() - errorResult.timestamp;
        commandManager.notifyAnalysisCompleted(
          "current-file",
          "error",
          duration,
          filePath
        );
      } catch (notificationError) {
        this.errorHandler.logError(
          "Failed to notify sidebar of background analysis failure",
          notificationError,
          "BackgroundAnalysisManager"
        );
      }

      return errorResult;
    }
  }

  /**
   * Get cached analysis if available and valid
   */
  public getCachedAnalysis(
    filePath: string,
    content?: string
  ): AnalysisResult | null {
    const cacheEntry = this.analysisCache.get(filePath);

    if (!cacheEntry) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() > cacheEntry.expiresAt) {
      this.analysisCache.delete(filePath);
      return null;
    }

    // Check if content has changed (if content provided)
    if (content) {
      const currentHash = this.generateContentHash(content);
      if (currentHash !== cacheEntry.contentHash) {
        this.analysisCache.delete(filePath);
        return null;
      }
    }

    return cacheEntry.result;
  }

  /**
   * Set cached analysis
   */
  public setCachedAnalysis(
    filePath: string,
    content: string,
    result: AnalysisResult
  ): void {
    // Ensure cache doesn't grow too large
    if (this.analysisCache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldestCacheEntry();
    }

    const contentHash = this.generateContentHash(content);
    const cacheEntry: AnalysisCacheEntry = {
      result,
      contentHash,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.CACHE_EXPIRY_MS,
    };

    this.analysisCache.set(filePath, cacheEntry);

    this.errorHandler.logError(
      `Analysis cached for ${filePath}`,
      { cacheSize: this.analysisCache.size },
      "BackgroundAnalysisManager"
    );
  }

  /**
   * Invalidate cache for a specific file
   */
  public invalidateCache(filePath: string): void {
    this.analysisCache.delete(filePath);
    this.errorHandler.logError(
      `Cache invalidated for ${filePath}`,
      null,
      "BackgroundAnalysisManager"
    );
  }

  /**
   * Clear all cache
   */
  public clearCache(): void {
    this.analysisCache.clear();
    this.errorHandler.logError(
      "All analysis cache cleared",
      null,
      "BackgroundAnalysisManager"
    );
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.analysisCache.size,
      maxSize: this.MAX_CACHE_SIZE,
    };
  }

  /**
   * Perform actual analysis using Python service
   */
  private async performAnalysis(
    document: vscode.TextDocument
  ): Promise<AnalysisResult> {
    const filePath = document.uri.fsPath;

    // Show progress indicator
    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: `Analyzing ${require("path").basename(filePath)}...`,
        cancellable: false,
      },
      async (progress) => {
        progress.report({ message: "Starting analysis..." });

        try {
          // Get or create current file analysis handler
          if (!this.currentFileAnalysisHandler) {
            // We'll need to get this from the command manager or create it
            // For now, let's use a simpler approach with direct Python execution
            const analysisData = await this.executeDirectPythonAnalysis(
              filePath
            );

            progress.report({ message: "Processing results..." });

            // Transform the analysis data to our format
            const result: AnalysisResult = {
              filePath,
              timestamp: Date.now(),
              functions: this.extractFunctions(analysisData),
              classes: this.extractClasses(analysisData),
              complexity: this.calculateComplexityMetrics(analysisData),
              status: "success",
            };

            return result;
          } else {
            // Use the current file analysis handler
            const analysisData =
              await this.currentFileAnalysisHandler.executeInBackground(
                filePath
              );

            progress.report({ message: "Processing results..." });

            // Transform the analysis data to our format
            const result: AnalysisResult = {
              filePath,
              timestamp: Date.now(),
              functions: this.extractFunctions(analysisData),
              classes: this.extractClasses(analysisData),
              complexity: this.calculateComplexityMetrics(analysisData),
              status: "success",
            };

            return result;
          }
        } catch (error) {
          throw new Error(
            `Analysis failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    );
  }

  /**
   * Extract functions from analysis data
   */
  private extractFunctions(analysisData: any): FunctionAnalysis[] {
    const functions: FunctionAnalysis[] = [];

    if (analysisData.functions && Array.isArray(analysisData.functions)) {
      for (const func of analysisData.functions) {
        functions.push({
          name: func.name || "unknown",
          line: func.line || func.line_number || 0,
          complexity: func.complexity || func.cyclomatic_complexity || 0,
          cyclomatic_complexity:
            func.cyclomatic_complexity || func.complexity || 0,
          references: func.references || func.call_count || 0,
          call_count: func.call_count || func.references || 0,
          line_count: func.line_count || func.lines || 0,
          lines: func.lines || func.line_count || 0,
          parameters: func.parameters || [],
          has_docstring: func.has_docstring || false,
        });
      }
    }

    return functions;
  }

  /**
   * Extract classes from analysis data
   */
  private extractClasses(analysisData: any): ClassAnalysis[] {
    const classes: ClassAnalysis[] = [];

    if (analysisData.classes && Array.isArray(analysisData.classes)) {
      for (const cls of analysisData.classes) {
        const methods: FunctionAnalysis[] = [];

        if (cls.methods && Array.isArray(cls.methods)) {
          for (const method of cls.methods) {
            methods.push({
              name: method.name || "unknown",
              line: method.line || method.line_number || 0,
              complexity:
                method.complexity || method.cyclomatic_complexity || 0,
              cyclomatic_complexity:
                method.cyclomatic_complexity || method.complexity || 0,
              references: method.references || method.call_count || 0,
              call_count: method.call_count || method.references || 0,
              line_count: method.line_count || method.lines || 0,
              lines: method.lines || method.line_count || 0,
              parameters: method.parameters || [],
              has_docstring: method.has_docstring || false,
            });
          }
        }

        classes.push({
          name: cls.name || "unknown",
          line: cls.line || cls.line_number || 0,
          complexity: cls.complexity || cls.total_complexity || 0,
          total_complexity: cls.total_complexity || cls.complexity || 0,
          line_count: cls.line_count || cls.lines || 0,
          lines: cls.lines || cls.line_count || 0,
          methods,
        });
      }
    }

    return classes;
  }

  /**
   * Calculate complexity metrics
   */
  private calculateComplexityMetrics(analysisData: any): ComplexityMetrics {
    const complexities: number[] = [];

    // Collect function complexities
    if (analysisData.functions && Array.isArray(analysisData.functions)) {
      for (const func of analysisData.functions) {
        const complexity = func.complexity || func.cyclomatic_complexity || 0;
        complexities.push(complexity);
      }
    }

    // Collect method complexities from classes
    if (analysisData.classes && Array.isArray(analysisData.classes)) {
      for (const cls of analysisData.classes) {
        if (cls.methods && Array.isArray(cls.methods)) {
          for (const method of cls.methods) {
            const complexity =
              method.complexity || method.cyclomatic_complexity || 0;
            complexities.push(complexity);
          }
        }
      }
    }

    if (complexities.length === 0) {
      return { average: 0, total: 0, max: 0, min: 0 };
    }

    const total = complexities.reduce((sum, c) => sum + c, 0);
    const average = total / complexities.length;
    const max = Math.max(...complexities);
    const min = Math.min(...complexities);

    return { average, total, max, min };
  }

  /**
   * Generate content hash for cache validation
   */
  private generateContentHash(content: string): string {
    return crypto.createHash("md5").update(content).digest("hex");
  }

  /**
   * Evict oldest cache entry when cache is full
   */
  private evictOldestCacheEntry(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.analysisCache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.analysisCache.delete(oldestKey);
      this.errorHandler.logError(
        `Evicted oldest cache entry: ${oldestKey}`,
        null,
        "BackgroundAnalysisManager"
      );
    }
  }

  /**
   * Register document change listeners for cache invalidation
   */
  private registerDocumentListeners(): void {
    // Invalidate cache when document is saved
    const onDidSaveDocument = vscode.workspace.onDidSaveTextDocument(
      (document) => {
        if (document.languageId === "python") {
          this.invalidateCache(document.uri.fsPath);
        }
      }
    );

    // Invalidate cache when document content changes significantly
    const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(
      (event) => {
        if (
          event.document.languageId === "python" &&
          event.contentChanges.length > 0
        ) {
          // Only invalidate for significant changes (more than just whitespace)
          const hasSignificantChanges = event.contentChanges.some(
            (change) => change.text.trim().length > 0 || change.rangeLength > 10
          );

          if (hasSignificantChanges) {
            this.invalidateCache(event.document.uri.fsPath);
          }
        }
      }
    );

    this.disposables.push(onDidSaveDocument, onDidChangeTextDocument);
  }

  /**
   * Start periodic cache cleanup
   */
  private startCacheCleanup(): void {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const expiredKeys: string[] = [];

      for (const [key, entry] of this.analysisCache.entries()) {
        if (now > entry.expiresAt) {
          expiredKeys.push(key);
        }
      }

      for (const key of expiredKeys) {
        this.analysisCache.delete(key);
      }

      if (expiredKeys.length > 0) {
        this.errorHandler.logError(
          `Cleaned up ${expiredKeys.length} expired cache entries`,
          null,
          "BackgroundAnalysisManager"
        );
      }
    }, 60000); // Run every minute

    // Store cleanup interval for disposal
    this.disposables.push({
      dispose: () => clearInterval(cleanupInterval),
    });
  }

  /**
   * Set the current file analysis handler
   */
  public setCurrentFileAnalysisHandler(
    handler: CurrentFileAnalysisHandler
  ): void {
    this.currentFileAnalysisHandler = handler;
  }

  /**
   * Execute direct Python analysis as fallback
   */
  private async executeDirectPythonAnalysis(filePath: string): Promise<any> {
    // Import PythonService for direct execution
    const { PythonService } = await import("./python-service");
    const pythonService = PythonService.getInstance(this.errorHandler);

    // Get analyzer script path
    const analyzerPath = pythonService.getAnalyzerScriptPath(
      "current_file_analyzer.py"
    );

    // Execute Python script
    const result = await pythonService.executePythonScriptForJSON(
      analyzerPath,
      {
        args: [filePath],
        timeout: 30000,
      }
    );

    if (!result) {
      throw new Error("Failed to get analysis result from Python script");
    }

    return result;
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.disposables.forEach((disposable) => disposable.dispose());
    this.disposables = [];
    this.analysisCache.clear();
    this.activeAnalyses.clear();

    this.errorHandler.logError(
      "BackgroundAnalysisManager disposed",
      null,
      "BackgroundAnalysisManager"
    );
  }
}
