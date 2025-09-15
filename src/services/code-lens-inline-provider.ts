import * as vscode from "vscode";
import { ErrorHandler } from "../core/error-handler";

/**
 * Interface for the current file analysis JSON structure
 */
interface CurrentFileAnalysis {
  timestamp: string;
  filePath: string;
  analysis: {
    file_path: string;
    file_name: string;
    complexity_metrics: {
      overall_complexity: {
        cyclomatic: number;
        cognitive: number;
        level: "low" | "medium" | "high";
      };
      function_complexities: Array<{
        name: string;
        line_number: number;
        complexity: {
          cyclomatic: number;
          cognitive: number;
          level: "low" | "medium" | "high";
        };
        parameters: Array<{
          name: string;
          type_hint: string | null;
          default_value: string | null;
          is_vararg: boolean;
          is_kwarg: boolean;
        }>;
        return_type: string | null;
        docstring: string | null;
        is_method: boolean;
        is_async: boolean;
      }>;
      class_complexities: Array<{
        name: string;
        line_number: number;
        base_classes: string[];
        docstring: string | null;
        methods: Array<{
          name: string;
          complexity: {
            cyclomatic: number;
            cognitive: number;
            level: "low" | "medium" | "high";
          };
        }>;
      }>;
      total_lines: number;
      code_lines: number;
      comment_lines: number;
      blank_lines: number;
      maintainability_index: number;
    };
  };
}

/**
 * Simple inline code lens provider for complexity indicators
 * Shows colored circles with complexity scores above functions and classes
 */
export class CodeLensInlineProvider implements vscode.CodeLensProvider {
  private static instance: CodeLensInlineProvider;
  private errorHandler: ErrorHandler;
  private isEnabled: boolean = false;
  private analysisData: CurrentFileAnalysis | null = null;

  private onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses =
    this.onDidChangeCodeLensesEmitter.event;

  private constructor(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;
  }

  public static getInstance(
    errorHandler?: ErrorHandler
  ): CodeLensInlineProvider {
    if (!CodeLensInlineProvider.instance) {
      if (!errorHandler) {
        throw new Error("ErrorHandler required for first initialization");
      }
      CodeLensInlineProvider.instance = new CodeLensInlineProvider(
        errorHandler
      );
    }
    return CodeLensInlineProvider.instance;
  }

  /**
   * Provide code lenses for complexity indicators
   */
  public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    this.errorHandler.logError(
      "provideCodeLenses called",
      {
        isEnabled: this.isEnabled,
        hasAnalysisData: !!this.analysisData,
        documentPath: document.uri.fsPath,
        analysisFilePath: this.analysisData?.analysis?.file_path,
      },
      "CodeLensInlineProvider"
    );

    if (!this.isEnabled || !this.analysisData) {
      return [];
    }

    const codeLenses: vscode.CodeLens[] = [];
    const analysis = this.analysisData.analysis;

    // Check if this document matches the analyzed file
    if (document.uri.fsPath !== analysis.file_path) {
      return [];
    }

    try {
      // Add function complexity indicators
      if (analysis.complexity_metrics.function_complexities) {
        for (const func of analysis.complexity_metrics.function_complexities) {
          const line = func.line_number - 1; // Convert to 0-based indexing
          const range = new vscode.Range(line, 0, line, 0);

          const complexityIcon = this.getComplexityIcon(func.complexity.level);
          const complexity = func.complexity.cyclomatic;
          const paramCount = func.parameters.length;

          // Create simple complexity indicator
          const title = `${complexityIcon} ${complexity} complexity • ${paramCount} params`;

          const codeLens = new vscode.CodeLens(range, {
            title,
            command: "doracodelens.showFunctionDetails",
            arguments: [func, document.uri],
            tooltip: `Function: ${
              func.name
            }\nCyclomatic complexity: ${complexity} (${
              func.complexity.level
            })\nParameters: ${paramCount}\nAsync: ${
              func.is_async ? "Yes" : "No"
            }`,
          });

          codeLenses.push(codeLens);
        }
      }

      // Add class complexity indicators
      if (analysis.complexity_metrics.class_complexities) {
        for (const cls of analysis.complexity_metrics.class_complexities) {
          const line = cls.line_number - 1; // Convert to 0-based indexing
          const range = new vscode.Range(line, 0, line, 0);

          const methodCount = cls.methods.length;
          const avgComplexity =
            cls.methods.length > 0
              ? Math.round(
                  cls.methods.reduce(
                    (sum, m) => sum + m.complexity.cyclomatic,
                    0
                  ) / cls.methods.length
                )
              : 0;
          const complexityLevel = this.getComplexityLevel(avgComplexity);
          const complexityIcon = this.getComplexityIcon(complexityLevel);

          // Create class complexity indicator
          const title = `📦 ${methodCount} methods • ${complexityIcon} ${avgComplexity} avg complexity`;

          const codeLens = new vscode.CodeLens(range, {
            title,
            command: "doracodelens.showClassDetails",
            arguments: [cls, document.uri],
            tooltip: `Class: ${
              cls.name
            }\nMethods: ${methodCount}\nAverage complexity: ${avgComplexity} (${complexityLevel})\nBase classes: ${
              cls.base_classes.join(", ") || "None"
            }`,
          });

          codeLenses.push(codeLens);

          // Add method complexity indicators
          for (const method of cls.methods) {
            const methodLine = this.findMethodLine(
              method.name,
              cls.name,
              document
            );
            if (methodLine !== -1) {
              const methodRange = new vscode.Range(
                methodLine,
                0,
                methodLine,
                0
              );
              const methodComplexityIcon = this.getComplexityIcon(
                method.complexity.level
              );
              const methodComplexity = method.complexity.cyclomatic;

              const methodTitle = `⚙️ ${methodComplexityIcon} ${methodComplexity} complexity`;

              const methodCodeLens = new vscode.CodeLens(methodRange, {
                title: methodTitle,
                command: "doracodelens.showMethodDetails",
                arguments: [method, cls, document.uri],
                tooltip: `Method: ${cls.name}.${method.name}\nComplexity: ${methodComplexity} (${method.complexity.level})`,
              });

              codeLenses.push(methodCodeLens);
            }
          }
        }
      }

      this.errorHandler.logError(
        `Generated ${codeLenses.length} inline complexity indicators`,
        {
          functions:
            analysis.complexity_metrics.function_complexities?.length || 0,
          classes: analysis.complexity_metrics.class_complexities?.length || 0,
          filePath: analysis.file_path,
        },
        "CodeLensInlineProvider"
      );
    } catch (error) {
      this.errorHandler.logError(
        "Error generating inline complexity indicators",
        error,
        "CodeLensInlineProvider"
      );
    }

    this.errorHandler.logError(
      "provideCodeLenses completed",
      {
        codeLensCount: codeLenses.length,
        functionCount:
          analysis.complexity_metrics.function_complexities?.length || 0,
        classCount: analysis.complexity_metrics.class_complexities?.length || 0,
      },
      "CodeLensInlineProvider"
    );

    return codeLenses;
  }

  /**
   * Get complexity icon based on level
   */
  private getComplexityIcon(level: "low" | "medium" | "high"): string {
    switch (level) {
      case "low":
        return "🟢"; // Green circle
      case "medium":
        return "🟡"; // Yellow circle
      case "high":
        return "🔴"; // Red circle
      default:
        return "🔵"; // Blue circle for unknown
    }
  }

  /**
   * Find method line in document
   */
  private findMethodLine(
    methodName: string,
    className: string,
    document: vscode.TextDocument
  ): number {
    const text = document.getText();
    const lines = text.split("\n");

    let inClass = false;
    let classIndent = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Check if we're entering the target class
      if (trimmedLine.startsWith(`class ${className}`)) {
        inClass = true;
        classIndent = line.length - line.trimStart().length;
        continue;
      }

      // If we're in the class, look for the method
      if (inClass) {
        const currentIndent = line.length - line.trimStart().length;

        // If we hit another class or function at the same level, we've left our class
        if (
          currentIndent <= classIndent &&
          trimmedLine &&
          !trimmedLine.startsWith("#")
        ) {
          if (
            trimmedLine.startsWith("class ") ||
            trimmedLine.startsWith("def ")
          ) {
            break;
          }
        }

        // Look for method definition
        if (trimmedLine.startsWith(`def ${methodName}(`)) {
          return i;
        }
      }
    }

    return -1;
  }

  /**
   * Update analysis data - accepts both CurrentFileAnalysis and legacy formats
   */
  public updateAnalysisData(analysisData: CurrentFileAnalysis | any): void {
    // Handle different data formats for compatibility
    if (
      analysisData &&
      analysisData.analysis &&
      analysisData.analysis.complexity_metrics
    ) {
      // Current file analysis format
      this.analysisData = analysisData as CurrentFileAnalysis;
    } else if (
      analysisData &&
      (analysisData.files || analysisData.functions || analysisData.classes)
    ) {
      // Legacy format - convert to CurrentFileAnalysis format
      const filePath = analysisData.file_path || analysisData.path || "unknown";
      this.analysisData = {
        timestamp: new Date().toISOString(),
        filePath: filePath,
        analysis: {
          file_path: filePath,
          file_name: filePath.split("/").pop() || "unknown",
          complexity_metrics: {
            overall_complexity: {
              cyclomatic: 1,
              cognitive: 1,
              level: "low" as const,
            },
            function_complexities: analysisData.functions || [],
            class_complexities: analysisData.classes || [],
            total_lines: 0,
            code_lines: 0,
            comment_lines: 0,
            blank_lines: 0,
            maintainability_index: 100,
          },
        },
      };
    } else {
      // Invalid or null data
      this.analysisData = null;
    }

    this.onDidChangeCodeLensesEmitter.fire();

    this.errorHandler.logError(
      "Inline complexity analysis data updated",
      {
        filePath: this.analysisData?.analysis?.file_path || "unknown",
        rawDataStructure: analysisData ? Object.keys(analysisData) : [],
        hasAnalysis: !!analysisData?.analysis,
        hasComplexityMetrics: !!analysisData?.analysis?.complexity_metrics,
        functions:
          this.analysisData?.analysis?.complexity_metrics?.function_complexities
            ?.length || 0,
        classes:
          this.analysisData?.analysis?.complexity_metrics?.class_complexities
            ?.length || 0,
        isEnabled: this.isEnabled,
      },
      "CodeLensInlineProvider"
    );
  }

  /**
   * Enable inline complexity indicators
   */
  public enable(): void {
    this.isEnabled = true;
    this.onDidChangeCodeLensesEmitter.fire();

    this.errorHandler.logError(
      "Inline complexity indicators enabled",
      null,
      "CodeLensInlineProvider"
    );
  }

  /**
   * Disable inline complexity indicators
   */
  public disable(): void {
    this.isEnabled = false;
    this.onDidChangeCodeLensesEmitter.fire();

    this.errorHandler.logError(
      "Inline complexity indicators disabled",
      null,
      "CodeLensInlineProvider"
    );
  }

  /**
   * Check if enabled
   */
  public isCodeLensEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Clear analysis data
   */
  public clearAnalysisData(): void {
    this.analysisData = null;
    this.onDidChangeCodeLensesEmitter.fire();
  }

  /**
   * Get complexity level from numeric value
   */
  public getComplexityLevel(complexity: number): "low" | "medium" | "high" {
    if (complexity <= 5) {
      return "low";
    } else if (complexity <= 10) {
      return "medium";
    } else {
      return "high";
    }
  }

  /**
   * Set guidance manager (for compatibility with analysis manager)
   */
  public setGuidanceManager(_guidanceManager: any): void {
    // Store guidance manager reference for future use
    this.errorHandler.logError(
      "Guidance manager set for inline code lens provider",
      null,
      "CodeLensInlineProvider"
    );
  }

  /**
   * Update configuration (for compatibility)
   */
  public updateConfig(_config: any): void {
    // No configuration to update for the simplified inline provider
    this.errorHandler.logError(
      "Inline code lens config update (no-op)",
      null,
      "CodeLensInlineProvider"
    );
  }

  /**
   * Dispose resources (for compatibility)
   */
  public dispose(): void {
    // No resources to dispose for the simplified inline provider
    this.errorHandler.logError(
      "Inline code lens provider disposed",
      null,
      "CodeLensInlineProvider"
    );
  }
}

/**
 * Code Lens Manager for the inline provider
 * Simplified manager that wraps the inline provider
 */
export class CodeLensManager {
  private static instance: CodeLensManager;
  private errorHandler: ErrorHandler;
  private context: vscode.ExtensionContext;
  private codeLensProvider: CodeLensInlineProvider;
  private disposable: vscode.Disposable | null = null;

  private constructor(
    errorHandler: ErrorHandler,
    context: vscode.ExtensionContext
  ) {
    this.errorHandler = errorHandler;
    this.context = context;
    this.codeLensProvider = CodeLensInlineProvider.getInstance(errorHandler);
  }

  public static getInstance(
    errorHandler?: ErrorHandler,
    context?: vscode.ExtensionContext
  ): CodeLensManager {
    if (!CodeLensManager.instance) {
      if (!errorHandler || !context) {
        throw new Error(
          "ErrorHandler and context required for first initialization"
        );
      }
      CodeLensManager.instance = new CodeLensManager(errorHandler, context);
    }
    return CodeLensManager.instance;
  }

  /**
   * Enable code lens functionality
   */
  public enableCodeLens(): void {
    try {
      if (!this.disposable) {
        // Register the code lens provider
        this.disposable = vscode.languages.registerCodeLensProvider(
          { language: "python" },
          this.codeLensProvider
        );

        // Store in context subscriptions
        this.context.subscriptions.push(this.disposable);
      }

      // Enable the provider
      this.codeLensProvider.enable();

      this.errorHandler.logError(
        "Inline code lens enabled successfully",
        null,
        "CodeLensManager"
      );
    } catch (error) {
      this.errorHandler.logError(
        "Failed to enable inline code lens",
        error,
        "CodeLensManager"
      );
      throw error;
    }
  }

  /**
   * Disable code lens functionality
   */
  public disableCodeLens(): void {
    try {
      // Disable the provider
      this.codeLensProvider.disable();

      this.errorHandler.logError(
        "Inline code lens disabled successfully",
        null,
        "CodeLensManager"
      );
    } catch (error) {
      this.errorHandler.logError(
        "Failed to disable inline code lens",
        error,
        "CodeLensManager"
      );
      throw error;
    }
  }

  /**
   * Check if code lens is enabled
   */
  public isEnabled(): boolean {
    return this.codeLensProvider.isCodeLensEnabled();
  }

  /**
   * Get the code lens provider instance
   */
  public getProvider(): CodeLensInlineProvider {
    return this.codeLensProvider;
  }

  /**
   * Update analysis data
   */
  public updateFromAnalysisData(analysisData: any): void {
    this.codeLensProvider.updateAnalysisData(analysisData);
  }

  /**
   * Restore state (simplified - no state to restore for inline provider)
   */
  public restoreState(): void {
    // No state to restore for the simplified inline provider
    this.errorHandler.logError(
      "Inline code lens state restored (no-op)",
      null,
      "CodeLensManager"
    );
  }

  /**
   * Apply suggestion (simplified - just show message)
   */
  public async applySuggestion(
    suggestion: any,
    _func: any,
    _uri: vscode.Uri
  ): Promise<void> {
    vscode.window.showInformationMessage(
      `Suggestion: ${suggestion.message || "Apply suggestion"}`
    );
  }

  /**
   * Show suggestion details (simplified - just show message)
   */
  public async showSuggestionDetails(
    suggestion: any,
    _func: any,
    _uri: vscode.Uri
  ): Promise<void> {
    vscode.window.showInformationMessage(
      `Suggestion Details: ${suggestion.message || "No details available"}`
    );
  }

  /**
   * Update config (simplified - no config for inline provider)
   */
  public updateConfig(config: any): void {
    // No config to update for the simplified inline provider
    this.errorHandler.logError(
      "Inline code lens config update (no-op)",
      config,
      "CodeLensManager"
    );
  }

  /**
   * Get config (simplified - return empty config)
   */
  public getConfig(): any {
    return {
      enabled: this.codeLensProvider.isCodeLensEnabled(),
      showComplexity: true,
      showSuggestions: false,
    };
  }

  /**
   * Set guidance manager (simplified - no guidance for inline provider)
   */
  public setGuidanceManager(_guidanceManager: any): void {
    // No guidance manager for the simplified inline provider
    this.errorHandler.logError(
      "Inline code lens guidance manager set (no-op)",
      null,
      "CodeLensManager"
    );
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    if (this.disposable) {
      this.disposable.dispose();
      this.disposable = null;
    }
  }
}
