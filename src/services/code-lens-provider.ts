import * as vscode from "vscode";
import { ErrorHandler } from "../core/error-handler";
import {
  CodeLensSuggestionEngine,
  CodeLensSuggestion,
} from "./code-lens-suggestion-engine";
import { CodePatternAnalyzer } from "./code-pattern-analyzer";
import { SuggestionDisplayManager } from "./suggestion-display-manager";

/**
 * Interface for enhanced code lens data
 */
export interface EnhancedCodeLensData {
  range: vscode.Range;
  functionName: string;
  complexity: {
    cyclomatic: number;
    level: "low" | "medium" | "high";
    color: "green" | "yellow" | "red";
  };
  suggestions: CodeLensSuggestion[];
  metadata: {
    lineCount: number;
    parameterCount: number;
    hasDocstring: boolean;
    references: number;
  };
}

/**
 * Interface for code lens configuration
 */
export interface CodeLensConfig {
  enabled: boolean;
  showComplexity: boolean;
  showSuggestions: boolean;
  maxSuggestionsPerFunction: number;
  complexityThresholds: {
    low: number; // 1-5
    medium: number; // 6-10
    high: number; // 11+
  };
  suggestionTypes: {
    complexity: boolean;
    documentation: boolean;
    parameters: boolean;
    length: boolean;
    performance: boolean;
  };
}

/**
 * Legacy interface for backward compatibility
 */
export interface CodeLensData {
  range: vscode.Range;
  command: vscode.Command;
  type: "complexity" | "references" | "navigation";
  metadata: {
    functionName: string;
    complexity?: number;
    referenceCount?: number;
    filePath?: string;
  };
}

/**
 * Enhanced Code Lens Provider for DoraCodeLens
 * Provides professional inline code metrics, complexity analysis, and actionable suggestions
 */
export class DoraCodeLensProvider implements vscode.CodeLensProvider {
  private static instance: DoraCodeLensProvider;
  private errorHandler: ErrorHandler;
  public analysisData: any = null;
  private isEnabled: boolean = false;
  private config: CodeLensConfig;
  private onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses =
    this.onDidChangeCodeLensesEmitter.event;

  private suggestionEngine: CodeLensSuggestionEngine;
  private patternAnalyzer: CodePatternAnalyzer;
  private displayManager: SuggestionDisplayManager | null = null;
  private guidanceManager: any = null; // Will be set by the guidance system

  private constructor(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;
    this.config = this.getDefaultConfig();
    this.suggestionEngine = CodeLensSuggestionEngine.getInstance(errorHandler);
    this.patternAnalyzer = CodePatternAnalyzer.getInstance(errorHandler);
  }

  public static getInstance(errorHandler?: ErrorHandler): DoraCodeLensProvider {
    if (!DoraCodeLensProvider.instance) {
      if (!errorHandler) {
        throw new Error("ErrorHandler required for first initialization");
      }
      DoraCodeLensProvider.instance = new DoraCodeLensProvider(errorHandler);
    }
    return DoraCodeLensProvider.instance;
  }

  /**
   * Get configuration from VS Code settings with defaults
   */
  private getDefaultConfig(): CodeLensConfig {
    const config = vscode.workspace.getConfiguration("doracodelens.codeLens");

    return {
      enabled: false,
      showComplexity: config.get("showComplexity", true),
      showSuggestions: config.get("showSuggestions", true),
      maxSuggestionsPerFunction: config.get("maxSuggestionsPerFunction", 3),
      complexityThresholds: {
        low: config.get("complexityThresholds.low", 5),
        medium: config.get("complexityThresholds.medium", 10),
        high: config.get("complexityThresholds.high", 11),
      },
      suggestionTypes: {
        complexity: true,
        documentation: true,
        parameters: true,
        length: true,
        performance: true,
      },
    };
  }

  /**
   * Refresh configuration from VS Code settings
   */
  public refreshConfig(): void {
    this.config = this.getDefaultConfig();
    this.config.enabled = this.isEnabled;
    this.onDidChangeCodeLensesEmitter.fire();

    this.errorHandler.logError(
      "Code lens configuration refreshed",
      this.config,
      "DoraCodeLensProvider"
    );
  }

  /**
   * Provide enhanced code lenses for a document
   */
  public provideCodeLenses(
    document: vscode.TextDocument
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    this.errorHandler.logError(
      `Enhanced code lens requested for ${document.uri.fsPath}`,
      { enabled: this.isEnabled, hasData: !!this.analysisData },
      "DoraCodeLensProvider"
    );

    if (!this.isEnabled) {
      return [];
    }

    return this.generateCodeLensesAsync(document);
  }

  /**
   * Generate code lenses asynchronously to handle suggestion engine
   */
  private async generateCodeLensesAsync(
    document: vscode.TextDocument
  ): Promise<vscode.CodeLens[]> {
    try {
      const codeLenses: vscode.CodeLens[] = [];
      const documentPath = document.uri.fsPath;

      // Check if guidance is needed (keeping guidance system but removing specific analysis commands)
      const guidanceManager = this.getGuidanceManager();
      if (guidanceManager) {
        try {
          if (guidanceManager.needsGuidance(document)) {
            const guidancePrompts = guidanceManager.getGuidancePrompts(document);

            // Filter out inline analysis commands (analyse file, analyse project, configure project)
            const filteredPrompts = guidancePrompts.filter((prompt: any) => {
              const title = prompt.title?.toLowerCase() || '';
              return !title.includes('analyse file') && 
                     !title.includes('analyse project') && 
                     !title.includes('configure project');
            });

            // Convert filtered guidance prompts to code lenses
            filteredPrompts.forEach((prompt: any, index: number) => {
              const guidanceCodeLens = new vscode.CodeLens(
                new vscode.Range(index, 0, index, 0),
                {
                  title: prompt.title,
                  command: prompt.command,
                  arguments: prompt.arguments || [],
                  tooltip: prompt.tooltip,
                }
              );
              codeLenses.push(guidanceCodeLens);
            });

            // If we have filtered guidance prompts, return them instead of analysis data
            if (filteredPrompts.length > 0) {
              this.errorHandler.logError(
                `Showing ${filteredPrompts.length} filtered guidance prompts for ${documentPath}`,
                null,
                "DoraCodeLensProvider"
              );
              return codeLenses;
            }
          }
        } catch (guidanceError) {
          this.errorHandler.logError(
            "Guidance system error, falling back to basic prompts",
            guidanceError,
            "DoraCodeLensProvider"
          );

          // Create fallback guidance using error handler (without analysis commands)
          try {
            const { GuidanceErrorHandler } = await import(
              "../core/guidance-error-handler"
            );
            const errorHandler = GuidanceErrorHandler.getInstance(
              this.errorHandler
            );
            const fallbackLenses = errorHandler.createFallbackGuidance(document);
            
            // Filter out analysis commands from fallback guidance too
            const filteredFallbackLenses = fallbackLenses.filter((lens: vscode.CodeLens) => {
              const title = lens.command?.title?.toLowerCase() || '';
              return !title.includes('analyse file') && 
                     !title.includes('analyse project') && 
                     !title.includes('configure project');
            });
            
            if (filteredFallbackLenses.length > 0) {
              this.errorHandler.logError(
                `Created ${filteredFallbackLenses.length} filtered fallback guidance lenses`,
                null,
                "DoraCodeLensProvider"
              );
              return filteredFallbackLenses;
            }
          } catch (fallbackError) {
            this.errorHandler.logError(
              "Fallback guidance creation failed",
              fallbackError,
              "DoraCodeLensProvider"
            );
          }
        }
      }

      // Find analysis data for this document
      const fileAnalysis = this.findFileAnalysis(documentPath);
      if (!fileAnalysis) {
        // When no analysis data is available, show placeholder complexity indicators
        // This provides a GitLens-like experience where code lens is always visible
        const placeholderCodeLenses = this.createPlaceholderComplexityIndicators(document);
        codeLenses.push(...placeholderCodeLenses);

        this.errorHandler.logError(
          `No analysis data found, showing ${placeholderCodeLenses.length} placeholder complexity indicators`,
          null,
          "DoraCodeLensProvider"
        );
        return codeLenses;
      }

      // Get performance optimizer
      const performanceOptimizer =
        this.suggestionEngine.getPerformanceOptimizer();

      // Calculate total function count for performance check
      const totalFunctions =
        (fileAnalysis.functions?.length || 0) +
        (fileAnalysis.classes?.reduce(
          (sum: number, cls: any) => sum + (cls.methods?.length || 0),
          0
        ) || 0);

      // Check if file should be processed based on performance constraints
      if (!performanceOptimizer.shouldProcessFile(document, totalFunctions)) {
        // Show a performance warning code lens
        const performanceWarningCodeLens = new vscode.CodeLens(
          new vscode.Range(0, 0, 0, 0),
          {
            title: "$(warning) File too large for detailed analysis",
            command: "doracodelens.showPerformanceInfo",
            tooltip:
              "This file exceeds size limits for detailed code lens analysis",
          }
        );
        codeLenses.push(performanceWarningCodeLens);
        return codeLenses;
      }

      // Generate enhanced code lenses for functions with batching
      if (fileAnalysis.functions) {
        const functionCodeLenses =
          await performanceOptimizer.processFunctionsInBatches(
            fileAnalysis.functions,
            async (func: any) => {
              return this.createEnhancedFunctionCodeLenses(func, document);
            }
          );

        functionCodeLenses.forEach((lenses) => codeLenses.push(...lenses));
      }

      // Generate enhanced code lenses for classes and their methods with batching
      if (fileAnalysis.classes) {
        const classCodeLenses =
          await performanceOptimizer.processFunctionsInBatches(
            fileAnalysis.classes,
            async (cls: any) => {
              const classLenses = await this.createEnhancedClassCodeLenses(
                cls,
                document
              );
              const methodLenses: vscode.CodeLens[] = [];

              // Add code lenses for class methods
              if (cls.methods) {
                const methodCodeLenses =
                  await performanceOptimizer.processFunctionsInBatches(
                    cls.methods,
                    async (method: any) => {
                      return this.createEnhancedMethodCodeLenses(
                        method,
                        cls,
                        document
                      );
                    }
                  );
                methodCodeLenses.forEach((lenses) =>
                  methodLenses.push(...lenses)
                );
              }

              return [...classLenses, ...methodLenses];
            }
          );

        classCodeLenses.forEach((lenses) => codeLenses.push(...lenses));
      }

      this.errorHandler.logError(
        `Generated ${codeLenses.length} enhanced code lenses for ${documentPath}`,
        {
          totalFunctions,
          performanceMetrics: performanceOptimizer.getMetrics(),
        },
        "DoraCodeLensProvider"
      );

      return codeLenses;
    } catch (error) {
      this.errorHandler.logError(
        "Error providing enhanced code lenses",
        error,
        "DoraCodeLensProvider"
      );
      return [];
    }
  }

  /**
   * Resolve a code lens (optional implementation)
   */
  public resolveCodeLens(
    codeLens: vscode.CodeLens
  ): vscode.CodeLens | Thenable<vscode.CodeLens> {
    return codeLens;
  }

  /**
   * Update analysis data and refresh code lenses
   */
  public updateAnalysisData(analysisData: any): void {
    this.analysisData = analysisData;
    this.onDidChangeCodeLensesEmitter.fire();

    this.errorHandler.logError(
      "Analysis data updated for code lens provider",
      null,
      "DoraCodeLensProvider"
    );
  }

  /**
   * Analyze complexity and determine level and color
   */
  private analyzeComplexity(complexity: number): {
    level: "low" | "medium" | "high";
    color: "green" | "yellow" | "red";
  } {
    if (complexity <= this.config.complexityThresholds.low) {
      return { level: "low", color: "green" };
    } else if (complexity <= this.config.complexityThresholds.medium) {
      return { level: "medium", color: "yellow" };
    } else {
      return { level: "high", color: "red" };
    }
  }

  /**
   * Generate suggestions for a function using the intelligent suggestion engine
   */
  private async generateSuggestions(
    func: any,
    document: vscode.TextDocument,
    startLine: number,
    endLine: number
  ): Promise<CodeLensSuggestion[]> {
    try {
      const complexity = func.complexity || func.cyclomatic_complexity || 0;

      // Create function analysis data using pattern analyzer
      const functionAnalysisData =
        this.patternAnalyzer.createFunctionAnalysisData(
          func.name,
          document,
          startLine,
          endLine,
          complexity,
          func.isMethod || false,
          func.className
        );

      // Generate suggestions using the intelligent engine with performance optimization
      const suggestions = await this.suggestionEngine.generateSuggestions(
        functionAnalysisData,
        document
      );

      this.errorHandler.logError(
        `Generated ${suggestions.length} intelligent suggestions for ${func.name}`,
        { suggestions: suggestions.map((s) => s.message) },
        "DoraCodeLensProvider"
      );

      return suggestions;
    } catch (error) {
      this.errorHandler.logError(
        "Error generating intelligent suggestions, falling back to basic suggestions",
        error,
        "DoraCodeLensProvider"
      );

      // Fallback to basic suggestions
      return this.generateBasicSuggestions(func);
    }
  }

  /**
   * Generate basic suggestions as fallback
   */
  private generateBasicSuggestions(func: any): CodeLensSuggestion[] {
    const suggestions: CodeLensSuggestion[] = [];
    const complexity = func.complexity || func.cyclomatic_complexity || 0;
    const lineCount = func.line_count || func.lines || 0;
    const parameterCount = func.parameters ? func.parameters.length : 0;
    const hasDocstring = func.has_docstring || false;

    // Basic complexity suggestion
    if (complexity > this.config.complexityThresholds.medium) {
      suggestions.push({
        id: "basic-complexity",
        type: "complexity",
        message: "Consider breaking this function into smaller parts",
        severity: complexity > 15 ? "error" : "warning",
        priority: 1,
        actionable: true,
        quickFix: "Extract method",
      });
    }

    // Basic documentation suggestion
    if (!hasDocstring) {
      suggestions.push({
        id: "basic-documentation",
        type: "documentation",
        message: "Add documentation for better maintainability",
        severity: "info",
        priority: 3,
        actionable: true,
        quickFix: "Add docstring",
      });
    }

    return suggestions.slice(0, this.config.maxSuggestionsPerFunction);
  }

  /**
   * Create enhanced code lenses for a function
   */
  private async createEnhancedFunctionCodeLenses(
    func: any,
    document: vscode.TextDocument
  ): Promise<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];

    try {
      const line = this.findFunctionLine(func.name, document);
      if (line === -1) {
        return codeLenses;
      }

      const range = new vscode.Range(line, 0, line, 0);
      const complexity = func.complexity || func.cyclomatic_complexity || 0;
      const complexityAnalysis = this.analyzeComplexity(complexity);

      // Find function end line for pattern analysis
      const endLine = this.findFunctionEndLine(func.name, document, line);
      const suggestions = await this.generateSuggestions(
        func,
        document,
        line,
        endLine
      );

      // Create complexity code lens with GitLens-like styling
      if (this.config.showComplexity) {
        const complexityIcon = this.getComplexityIcon(complexityAnalysis.level);
        const references = func.references || func.call_count || 0;
        const lineCount = func.line_count || func.lines || 0;
        
        // GitLens-style compact display
        const complexityTitle = `${complexityIcon} ${complexity} complexity • ${references} references • ${lineCount} lines`;

        const complexityCodeLens = new vscode.CodeLens(range, {
          title: complexityTitle,
          command: "doracodelens.showFunctionDetails",
          arguments: [func, document.uri],
          tooltip: `Function: ${func.name}\nCyclomatic complexity: ${complexity} (${complexityAnalysis.level})\nReferences: ${references}\nLines: ${lineCount}\nClick for details`,
        });
        codeLenses.push(complexityCodeLens);
      }

      // Create suggestion code lenses using display manager
      if (this.config.showSuggestions && suggestions.length > 0) {
        if (!this.displayManager) {
          // Display manager will be initialized when extension context is available
          // For now, create basic suggestion code lenses
          suggestions.forEach((suggestion, index) => {
            const suggestionIcon = this.getSuggestionIcon(suggestion.severity);
            const suggestionTitle = `${suggestionIcon} ${suggestion.message}`;

            const suggestionCodeLens = new vscode.CodeLens(
              new vscode.Range(line, 0, line, 0),
              {
                title: suggestionTitle,
                command: suggestion.actionable
                  ? "doracodelens.applySuggestion"
                  : "doracodelens.showSuggestionDetails",
                arguments: [suggestion, func, document.uri],
                tooltip: suggestion.actionable
                  ? `${suggestion.message}\nClick to apply: ${suggestion.quickFix}`
                  : suggestion.message,
              }
            );
            codeLenses.push(suggestionCodeLens);
          });
        } else {
          // Use display manager for professional suggestion display
          const suggestionCodeLenses =
            this.displayManager.createSuggestionCodeLenses(
              suggestions,
              range,
              func,
              document.uri
            );
          codeLenses.push(...suggestionCodeLenses);
        }
      }

      return codeLenses;
    } catch (error) {
      this.errorHandler.logError(
        "Error creating enhanced function code lens",
        error,
        "DoraCodeLensProvider"
      );
      return codeLenses;
    }
  }

  /**
   * Find the end line of a function
   */
  private findFunctionEndLine(
    functionName: string,
    document: vscode.TextDocument,
    startLine: number
  ): number {
    const text = document.getText();
    const lines = text.split("\n");

    // Find the indentation level of the function
    const functionLine = lines[startLine];
    const functionIndent =
      functionLine.length - functionLine.trimStart().length;

    // Look for the next line with same or less indentation (or end of file)
    for (let i = startLine + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === "") {
        continue;
      } // Skip empty lines

      const lineIndent = line.length - line.trimStart().length;
      if (lineIndent <= functionIndent && !line.trimStart().startsWith("#")) {
        return i - 1;
      }
    }

    return lines.length - 1;
  }

  /**
   * Create enhanced code lenses for a class
   */
  private async createEnhancedClassCodeLenses(
    cls: any,
    document: vscode.TextDocument
  ): Promise<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];

    try {
      const line = this.findClassLine(cls.name, document);
      if (line === -1) {
        return codeLenses;
      }

      const range = new vscode.Range(line, 0, line, 0);
      const methodCount = cls.methods ? cls.methods.length : 0;
      const totalComplexity = cls.complexity || cls.total_complexity || 0;
      const complexityAnalysis = this.analyzeComplexity(totalComplexity);

      // Create class overview code lens with GitLens-like styling
      const classIcon = "$(symbol-class)";
      const complexityIcon = this.getComplexityIcon(complexityAnalysis.level);
      const lineCount = cls.line_count || cls.lines || 0;
      
      // GitLens-style compact display for classes
      const classTitle = `${classIcon} ${methodCount} methods • ${complexityIcon} ${totalComplexity} complexity • ${lineCount} lines`;

      const classCodeLens = new vscode.CodeLens(range, {
        title: classTitle,
        command: "doracodelens.showClassDetails",
        arguments: [cls, document.uri],
        tooltip: `Class: ${cls.name}\nMethods: ${methodCount}\nTotal complexity: ${totalComplexity} (${complexityAnalysis.level})\nLines: ${lineCount}\nClick for details`,
      });
      codeLenses.push(classCodeLens);

      return codeLenses;
    } catch (error) {
      this.errorHandler.logError(
        "Error creating enhanced class code lens",
        error,
        "DoraCodeLensProvider"
      );
      return codeLenses;
    }
  }

  /**
   * Create enhanced code lenses for a method
   */
  private async createEnhancedMethodCodeLenses(
    method: any,
    cls: any,
    document: vscode.TextDocument
  ): Promise<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];

    try {
      const line = this.findMethodLine(method.name, cls.name, document);
      if (line === -1) {
        return codeLenses;
      }

      const range = new vscode.Range(line, 0, line, 0);
      const complexity = method.complexity || method.cyclomatic_complexity || 0;
      const complexityAnalysis = this.analyzeComplexity(complexity);

      // Find method end line for pattern analysis
      const endLine = this.findFunctionEndLine(method.name, document, line);

      // Mark method as part of a class for analysis
      method.isMethod = true;
      method.className = cls.name;

      const suggestions = await this.generateSuggestions(
        method,
        document,
        line,
        endLine
      );

      // Create method complexity code lens with GitLens-like styling
      if (this.config.showComplexity) {
        const complexityIcon = this.getComplexityIcon(complexityAnalysis.level);
        const references = method.references || method.call_count || 0;
        const lineCount = method.line_count || method.lines || 0;
        
        // GitLens-style compact display for methods
        const methodTitle = `${complexityIcon} ${complexity} complexity • ${references} references • ${lineCount} lines`;

        const methodCodeLens = new vscode.CodeLens(range, {
          title: methodTitle,
          command: "doracodelens.showMethodDetails",
          arguments: [method, cls, document.uri],
          tooltip: `Method: ${cls.name}.${method.name}\nComplexity: ${complexity} (${complexityAnalysis.level})\nReferences: ${references}\nLines: ${lineCount}\nClick for details`,
        });
        codeLenses.push(methodCodeLens);
      }

      // Create method suggestion code lenses
      if (this.config.showSuggestions && suggestions.length > 0) {
        if (!this.displayManager) {
          // Fallback to basic display
          suggestions.forEach((suggestion) => {
            const suggestionIcon = this.getSuggestionIcon(suggestion.severity);
            const suggestionTitle = `${suggestionIcon} ${suggestion.message}`;

            const suggestionCodeLens = new vscode.CodeLens(
              new vscode.Range(line, 0, line, 0),
              {
                title: suggestionTitle,
                command: suggestion.actionable
                  ? "doracodelens.applySuggestion"
                  : "doracodelens.showSuggestionDetails",
                arguments: [suggestion, method, document.uri],
                tooltip: suggestion.actionable
                  ? `${suggestion.message}\nClick to apply: ${suggestion.quickFix}`
                  : suggestion.message,
              }
            );
            codeLenses.push(suggestionCodeLens);
          });
        } else {
          // Use display manager for professional suggestion display
          const suggestionCodeLenses =
            this.displayManager.createSuggestionCodeLenses(
              suggestions,
              range,
              method,
              document.uri
            );
          codeLenses.push(...suggestionCodeLenses);
        }
      }

      return codeLenses;
    } catch (error) {
      this.errorHandler.logError(
        "Error creating enhanced method code lens",
        error,
        "DoraCodeLensProvider"
      );
      return codeLenses;
    }
  }

  /**
   * Get icon for complexity level
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
   * Get icon for suggestion severity
   */
  private getSuggestionIcon(severity: "info" | "warning" | "error"): string {
    switch (severity) {
      case "info":
        return "$(lightbulb)"; // Light bulb for suggestions
      case "warning":
        return "$(warning)"; // Warning triangle
      case "error":
        return "$(error)"; // Error circle
      default:
        return "$(info)";
    }
  }

  /**
   * Enable code lens provider
   */
  public enable(): void {
    this.isEnabled = true;
    this.config.enabled = true;
    this.onDidChangeCodeLensesEmitter.fire();

    this.errorHandler.logError(
      "Enhanced code lens provider enabled",
      null,
      "DoraCodeLensProvider"
    );
  }

  /**
   * Disable code lens provider
   */
  public disable(): void {
    this.isEnabled = false;
    this.config.enabled = false;
    this.onDidChangeCodeLensesEmitter.fire();

    this.errorHandler.logError(
      "Enhanced code lens provider disabled",
      null,
      "DoraCodeLensProvider"
    );
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<CodeLensConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.onDidChangeCodeLensesEmitter.fire();

    this.errorHandler.logError(
      "Code lens configuration updated",
      newConfig,
      "DoraCodeLensProvider"
    );
  }

  /**
   * Get current configuration
   */
  public getConfig(): CodeLensConfig {
    return { ...this.config };
  }

  /**
   * Check if code lens is enabled
   */
  public isCodeLensEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Find analysis data for a specific file
   */
  private findFileAnalysis(filePath: string): any {
    if (!this.analysisData) {
      return null;
    }

    // Try to find file analysis in different possible structures
    if (this.analysisData.files) {
      // Direct files array
      return this.analysisData.files.find(
        (file: any) => file.path === filePath || file.file_path === filePath
      );
    }

    if (this.analysisData.analysis_results) {
      // Nested in analysis_results
      return this.analysisData.analysis_results.find(
        (file: any) => file.path === filePath || file.file_path === filePath
      );
    }

    // Try to find in project structure
    if (this.analysisData.project_structure) {
      return this.findInProjectStructure(
        this.analysisData.project_structure,
        filePath
      );
    }

    return null;
  }

  /**
   * Recursively find file analysis in project structure
   */
  private findInProjectStructure(structure: any, filePath: string): any {
    if (Array.isArray(structure)) {
      for (const item of structure) {
        const result = this.findInProjectStructure(item, filePath);
        if (result) {
          return result;
        }
      }
    } else if (structure && typeof structure === "object") {
      if (structure.path === filePath || structure.file_path === filePath) {
        return structure;
      }

      if (structure.children) {
        return this.findInProjectStructure(structure.children, filePath);
      }

      if (structure.files) {
        return this.findInProjectStructure(structure.files, filePath);
      }
    }

    return null;
  }

  /**
   * Create code lens for a function
   */
  private createFunctionCodeLens(
    func: any,
    document: vscode.TextDocument
  ): vscode.CodeLens | null {
    try {
      const line = this.findFunctionLine(func.name, document);
      if (line === -1) {
        return null;
      }

      const range = new vscode.Range(line, 0, line, 0);
      const complexity = func.complexity || func.cyclomatic_complexity || 0;
      const references = func.references || func.call_count || 0;

      const title = `Complexity: ${complexity} | References: ${references}`;

      const command: vscode.Command = {
        title,
        command: "doracodelens.showFunctionDetails",
        arguments: [func, document.uri],
      };

      return new vscode.CodeLens(range, command);
    } catch (error) {
      this.errorHandler.logError(
        "Error creating function code lens",
        error,
        "DoraCodeLensProvider"
      );
      return null;
    }
  }

  /**
   * Create code lens for a class
   */
  private createClassCodeLens(
    cls: any,
    document: vscode.TextDocument
  ): vscode.CodeLens | null {
    try {
      const line = this.findClassLine(cls.name, document);
      if (line === -1) {
        return null;
      }

      const range = new vscode.Range(line, 0, line, 0);
      const methodCount = cls.methods ? cls.methods.length : 0;
      const complexity = cls.complexity || cls.total_complexity || 0;

      const title = `Methods: ${methodCount} | Complexity: ${complexity}`;

      const command: vscode.Command = {
        title,
        command: "doracodelens.showClassDetails",
        arguments: [cls, document.uri],
      };

      return new vscode.CodeLens(range, command);
    } catch (error) {
      this.errorHandler.logError(
        "Error creating class code lens",
        error,
        "DoraCodeLensProvider"
      );
      return null;
    }
  }

  /**
   * Create code lens for a class method
   */
  private createMethodCodeLens(
    method: any,
    cls: any,
    document: vscode.TextDocument
  ): vscode.CodeLens | null {
    try {
      const line = this.findMethodLine(method.name, cls.name, document);
      if (line === -1) {
        return null;
      }

      const range = new vscode.Range(line, 0, line, 0);
      const complexity = method.complexity || method.cyclomatic_complexity || 0;
      const references = method.references || method.call_count || 0;

      const title = `Complexity: ${complexity} | References: ${references}`;

      const command: vscode.Command = {
        title,
        command: "doracodelens.showMethodDetails",
        arguments: [method, cls, document.uri],
      };

      return new vscode.CodeLens(range, command);
    } catch (error) {
      this.errorHandler.logError(
        "Error creating method code lens",
        error,
        "DoraCodeLensProvider"
      );
      return null;
    }
  }

  /**
   * Find the line number of a function definition
   */
  private findFunctionLine(
    functionName: string,
    document: vscode.TextDocument
  ): number {
    const text = document.getText();
    const lines = text.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for function definition patterns
      if (
        line.includes(`def ${functionName}(`) ||
        line.includes(`async def ${functionName}(`)
      ) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Find the line number of a class definition
   */
  private findClassLine(
    className: string,
    document: vscode.TextDocument
  ): number {
    const text = document.getText();
    const lines = text.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for class definition pattern
      if (line.includes(`class ${className}`) && line.includes(":")) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Find the line number of a method definition within a class
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

      // Check if we're entering the target class
      if (line.includes(`class ${className}`) && line.includes(":")) {
        inClass = true;
        classIndent = line.length - line.trimStart().length;
        continue;
      }

      // Check if we've left the class
      if (
        inClass &&
        line.trim() &&
        line.length - line.trimStart().length <= classIndent &&
        !line.trimStart().startsWith("#")
      ) {
        inClass = false;
      }

      // Look for method definition within the class
      if (
        inClass &&
        (line.includes(`def ${methodName}(`) ||
          line.includes(`async def ${methodName}(`))
      ) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Initialize display manager with extension context
   */
  public initializeDisplayManager(context: vscode.ExtensionContext): void {
    if (!this.displayManager) {
      this.displayManager = SuggestionDisplayManager.getInstance(
        this.errorHandler,
        context
      );
      this.errorHandler.logError(
        "Suggestion display manager initialized",
        null,
        "DoraCodeLensProvider"
      );
    }
  }

  /**
   * Get suggestion engine instance
   */
  public getSuggestionEngine(): CodeLensSuggestionEngine {
    return this.suggestionEngine;
  }

  /**
   * Get pattern analyzer instance
   */
  public getPatternAnalyzer(): CodePatternAnalyzer {
    return this.patternAnalyzer;
  }

  /**
   * Get display manager instance
   */
  public getDisplayManager(): SuggestionDisplayManager | null {
    return this.displayManager;
  }

  /**
   * Set guidance manager for integration
   */
  public setGuidanceManager(guidanceManager: any): void {
    this.guidanceManager = guidanceManager;
    this.errorHandler.logError(
      "Guidance manager set for code lens provider",
      null,
      "DoraCodeLensProvider"
    );
  }

  /**
   * Get guidance manager
   */
  public getGuidanceManager(): any {
    return this.guidanceManager;
  }

  /**
   * Create basic guidance prompts when guidance manager is not available
   */
  private createBasicGuidancePrompts(
    document: vscode.TextDocument
  ): vscode.CodeLens[] {
    const prompts: vscode.CodeLens[] = [];

    // Basic analysis prompt
    const analyzeCurrentFilePrompt = new vscode.CodeLens(
      new vscode.Range(0, 0, 0, 0),
      {
        title: "$(file-code) Analyze Current File",
        command: "doracodelens.analyzeCurrentFile",
        tooltip:
          "Run analysis for this file to see complexity metrics and suggestions",
      }
    );
    prompts.push(analyzeCurrentFilePrompt);

    // Full project analysis prompt
    const analyzeFullProjectPrompt = new vscode.CodeLens(
      new vscode.Range(1, 0, 1, 0),
      {
        title: "$(project) Analyze Full Project",
        command: "doracodelens.analyzeFullCode",
        tooltip: "Run comprehensive analysis for the entire project",
      }
    );
    prompts.push(analyzeFullProjectPrompt);

    // Python setup prompt
    const pythonSetupPrompt = new vscode.CodeLens(
      new vscode.Range(2, 0, 2, 0),
      {
        title: "$(tools) Setup Python Path",
        command: "doracodelens.setupPythonPath",
        tooltip: "Auto-detect and configure Python path for analysis",
      }
    );
    prompts.push(pythonSetupPrompt);

    // Settings prompt
    const settingsPrompt = new vscode.CodeLens(new vscode.Range(3, 0, 3, 0), {
      title: "$(gear) Configure Settings",
      command: "doracodelens.openSettings",
      tooltip: "Configure DoraCodeLens analysis and code lens settings",
    });
    prompts.push(settingsPrompt);

    return prompts;
  }

  /**
   * Create placeholder complexity indicators for functions/classes when no analysis data is available
   * This provides a GitLens-like experience where code lens is always visible
   * Analysis is triggered automatically by the AnalysisManager when files are opened
   */
  private createPlaceholderComplexityIndicators(document: vscode.TextDocument): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    // Find all function and class definitions
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Check for function definitions
      if (trimmedLine.startsWith('def ') && trimmedLine.includes('(')) {
        const functionMatch = trimmedLine.match(/def\s+(\w+)\s*\(/);
        if (functionMatch) {
          const functionName = functionMatch[1];
          const range = new vscode.Range(i, 0, i, 0);
          
          const placeholderCodeLens = new vscode.CodeLens(range, {
            title: "$(loading~spin) Analyzing complexity...",
            command: "doracodelens.showFunctionDetails",
            arguments: [{ name: functionName, complexity: 0 }, document.uri],
            tooltip: `Function: ${functionName}\nAnalysis in progress...`
          });
          codeLenses.push(placeholderCodeLens);
        }
      }

      // Check for class definitions
      if (trimmedLine.startsWith('class ') && trimmedLine.includes(':')) {
        const classMatch = trimmedLine.match(/class\s+(\w+)/);
        if (classMatch) {
          const className = classMatch[1];
          const range = new vscode.Range(i, 0, i, 0);
          
          const placeholderCodeLens = new vscode.CodeLens(range, {
            title: "$(loading~spin) Analyzing class...",
            command: "doracodelens.showClassDetails",
            arguments: [{ name: className, complexity: 0 }, document.uri],
            tooltip: `Class: ${className}\nAnalysis in progress...`
          });
          codeLenses.push(placeholderCodeLens);
        }
      }
    }

    return codeLenses;
  }

  private analysisRunningFiles: Set<string> = new Set();

  /**
   * Trigger background analysis if cache is not present
   */
  private triggerBackgroundAnalysisIfNeeded(document: vscode.TextDocument): void {
    const filePath = document.uri.fsPath;
    
    // Check if we already have cached analysis data
    const fileAnalysis = this.findFileAnalysis(filePath);
    if (fileAnalysis) {
      return; // Already have data, no need to analyze
    }

    // Check if analysis is already running to avoid duplicate calls
    if (this.isAnalysisRunning(filePath)) {
      return;
    }

    // Trigger background analysis
    this.runBackgroundAnalysis(document);
  }

  /**
   * Check if analysis is currently running for a file
   */
  private isAnalysisRunning(filePath: string): boolean {
    return this.analysisRunningFiles.has(filePath);
  }

  /**
   * Run background analysis for the document
   */
  private async runBackgroundAnalysis(document: vscode.TextDocument): Promise<void> {
    const filePath = document.uri.fsPath;
    
    try {
      this.analysisRunningFiles.add(filePath);
      
      this.errorHandler.logError(
        `Starting background analysis for ${filePath}`,
        null,
        "DoraCodeLensProvider"
      );

      // Import analysis manager dynamically to avoid circular dependencies
      const { AnalysisManager } = await import('../core/analysis-manager');
      const analysisManager = AnalysisManager.getInstance(this.errorHandler);
      
      // Run analysis in background
      const results = await analysisManager.analyzeCurrentFileInBackground(document);
      
      if (results) {
        // Update our analysis data
        this.updateAnalysisData(results);
        
        // Refresh code lenses to show actual complexity data
        this.onDidChangeCodeLensesEmitter.fire();
        
        this.errorHandler.logError(
          `Background analysis completed for ${filePath}`,
          null,
          "DoraCodeLensProvider"
        );
      }
      
    } catch (error) {
      this.errorHandler.logError(
        `Background analysis failed for ${filePath}`,
        error,
        "DoraCodeLensProvider"
      );
    } finally {
      this.analysisRunningFiles.delete(filePath);
    }
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.onDidChangeCodeLensesEmitter.dispose();
    this.suggestionEngine.dispose();
  }
}

/**
 * Enhanced Code Lens Manager for handling professional code lens functionality
 */
export class CodeLensManager {
  private static instance: CodeLensManager;
  private errorHandler: ErrorHandler;
  private context: vscode.ExtensionContext;
  private codeLensProvider: DoraCodeLensProvider;
  private disposable: vscode.Disposable | null = null;
  private guidanceManager: any = null;

  private constructor(
    errorHandler: ErrorHandler,
    context: vscode.ExtensionContext
  ) {
    this.errorHandler = errorHandler;
    this.context = context;
    this.codeLensProvider = DoraCodeLensProvider.getInstance(errorHandler);

    // Listen for configuration changes
    this.setupConfigurationListener();
  }

  /**
   * Setup configuration change listener
   */
  private setupConfigurationListener(): void {
    const configListener = vscode.workspace.onDidChangeConfiguration(
      (event) => {
        if (event.affectsConfiguration("doracodelens.codeLens")) {
          this.codeLensProvider.refreshConfig();
          this.errorHandler.logError(
            "Code lens configuration changed, refreshing provider",
            null,
            "CodeLensManager"
          );
        }
      }
    );

    this.context.subscriptions.push(configListener);
  }

  public static getInstance(
    errorHandler?: ErrorHandler,
    context?: vscode.ExtensionContext
  ): CodeLensManager {
    if (!CodeLensManager.instance) {
      if (!errorHandler || !context) {
        throw new Error(
          "ErrorHandler and ExtensionContext required for first initialization"
        );
      }
      CodeLensManager.instance = new CodeLensManager(errorHandler, context);
    }
    return CodeLensManager.instance;
  }

  /**
   * Enable enhanced code lens functionality
   */
  public enableCodeLens(): void {
    try {
      if (!this.disposable) {
        // Register the enhanced code lens provider
        this.disposable = vscode.languages.registerCodeLensProvider(
          { language: "python" },
          this.codeLensProvider
        );

        this.context.subscriptions.push(this.disposable);
      }

      this.codeLensProvider.enable();

      // Save state
      this.context.globalState.update("doracodelens.codeLensEnabled", true);

      // Update configuration context
      vscode.commands.executeCommand(
        "setContext",
        "doracodelens.codeLensEnabled",
        true
      );

      this.errorHandler.logError(
        "Enhanced code lens enabled successfully",
        null,
        "CodeLensManager"
      );
    } catch (error) {
      this.errorHandler.logError(
        "Failed to enable enhanced code lens",
        error,
        "CodeLensManager"
      );
      vscode.window.showErrorMessage("Failed to enable Enhanced Code Lens");
    }
  }

  /**
   * Disable enhanced code lens functionality
   */
  public disableCodeLens(): void {
    try {
      this.codeLensProvider.disable();

      if (this.disposable) {
        this.disposable.dispose();
        this.disposable = null;
      }

      // Save state
      this.context.globalState.update("doracodelens.codeLensEnabled", false);

      // Update configuration context
      vscode.commands.executeCommand(
        "setContext",
        "doracodelens.codeLensEnabled",
        false
      );

      vscode.window.showInformationMessage("Enhanced Code Lens disabled");

      this.errorHandler.logError(
        "Enhanced code lens disabled successfully",
        null,
        "CodeLensManager"
      );
    } catch (error) {
      this.errorHandler.logError(
        "Failed to disable enhanced code lens",
        error,
        "CodeLensManager"
      );
      vscode.window.showErrorMessage("Failed to disable Enhanced Code Lens");
    }
  }



  /**
   * Check if code lens is enabled
   */
  public isEnabled(): boolean {
    return this.codeLensProvider.isCodeLensEnabled();
  }

  /**
   * Update analysis data for code lens
   */
  public updateFromAnalysisData(analysisData: any): void {
    this.codeLensProvider.updateAnalysisData(analysisData);
  }

  /**
   * Restore code lens state from saved preferences
   */
  public restoreState(): void {
    const enabled = this.context.globalState.get(
      "doracodelens.codeLensEnabled",
      false
    );
    if (enabled) {
      this.enableCodeLens();
    }
  }

  /**
   * Get the code lens provider instance
   */
  public getProvider(): DoraCodeLensProvider {
    return this.codeLensProvider;
  }

  /**
   * Update code lens configuration
   */
  public updateConfig(config: Partial<CodeLensConfig>): void {
    this.codeLensProvider.updateConfig(config);
  }

  /**
   * Get current code lens configuration
   */
  public getConfig(): CodeLensConfig {
    return this.codeLensProvider.getConfig();
  }

  /**
   * Handle suggestion application
   */
  public async applySuggestion(
    suggestion: CodeLensSuggestion,
    func: any,
    uri: vscode.Uri
  ): Promise<void> {
    try {
      this.errorHandler.logError(
        "Applying code lens suggestion",
        { type: suggestion.type, message: suggestion.message },
        "CodeLensManager"
      );

      switch (suggestion.type) {
        case "documentation":
          await this.addDocstring(func, uri);
          break;
        case "complexity":
          await this.showComplexityRefactoringOptions(func, uri);
          break;
        case "parameters":
          await this.showParameterRefactoringOptions(func, uri);
          break;
        case "length":
          await this.showFunctionSplittingOptions(func, uri);
          break;
        default:
          vscode.window.showInformationMessage(
            `Suggestion: ${suggestion.message}`
          );
      }
    } catch (error) {
      this.errorHandler.logError(
        "Failed to apply suggestion",
        error,
        "CodeLensManager"
      );
      vscode.window.showErrorMessage("Failed to apply suggestion");
    }
  }

  /**
   * Show suggestion details
   */
  public async showSuggestionDetails(
    suggestion: CodeLensSuggestion,
    func: any,
    uri: vscode.Uri
  ): Promise<void> {
    try {
      const message = `Suggestion: ${suggestion.message}\n\nType: ${suggestion.type}\nSeverity: ${suggestion.severity}`;

      const action = await vscode.window.showInformationMessage(
        message,
        "Learn More",
        "Dismiss"
      );

      if (action === "Learn More") {
        // Open documentation or help for this suggestion type
        await this.showSuggestionHelp(suggestion.type);
      }
    } catch (error) {
      this.errorHandler.logError(
        "Failed to show suggestion details",
        error,
        "CodeLensManager"
      );
    }
  }

  /**
   * Add docstring to function
   */
  private async addDocstring(func: any, uri: vscode.Uri): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);

      // Find function line
      const text = document.getText();
      const lines = text.split("\n");
      let functionLine = -1;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(`def ${func.name}(`)) {
          functionLine = i;
          break;
        }
      }

      if (functionLine !== -1) {
        // Generate basic docstring template
        const indent = lines[functionLine].match(/^\s*/)?.[0] || "";
        const docstring = `${indent}    """\n${indent}    ${func.name} function.\n${indent}    \n${indent}    Returns:\n${indent}        Description of return value.\n${indent}    """\n`;

        const insertPosition = new vscode.Position(functionLine + 1, 0);
        await editor.edit((editBuilder) => {
          editBuilder.insert(insertPosition, docstring);
        });

        vscode.window.showInformationMessage("Docstring template added");
      }
    } catch (error) {
      this.errorHandler.logError(
        "Failed to add docstring",
        error,
        "CodeLensManager"
      );
      vscode.window.showErrorMessage("Failed to add docstring");
    }
  }

  /**
   * Show complexity refactoring options
   */
  private async showComplexityRefactoringOptions(
    func: any,
    uri: vscode.Uri
  ): Promise<void> {
    const options = [
      "Extract Method",
      "Simplify Conditions",
      "Reduce Nesting",
      "Learn About Complexity",
    ];

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: "Choose a refactoring approach",
    });

    if (selected === "Learn About Complexity") {
      vscode.env.openExternal(
        vscode.Uri.parse("https://en.wikipedia.org/wiki/Cyclomatic_complexity")
      );
    } else if (selected) {
      vscode.window.showInformationMessage(
        `Refactoring guidance: ${selected} - Consider breaking down complex logic into smaller, focused functions.`
      );
    }
  }

  /**
   * Show parameter refactoring options
   */
  private async showParameterRefactoringOptions(
    func: any,
    uri: vscode.Uri
  ): Promise<void> {
    const options = [
      "Use Configuration Object",
      "Use Dataclass",
      "Group Related Parameters",
      "Learn About Parameter Objects",
    ];

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: "Choose a parameter refactoring approach",
    });

    if (selected === "Learn About Parameter Objects") {
      vscode.env.openExternal(
        vscode.Uri.parse("https://refactoring.guru/introduce-parameter-object")
      );
    } else if (selected) {
      vscode.window.showInformationMessage(
        `Parameter refactoring: ${selected} - Consider grouping related parameters into objects or dataclasses.`
      );
    }
  }

  /**
   * Show function splitting options
   */
  private async showFunctionSplittingOptions(
    func: any,
    uri: vscode.Uri
  ): Promise<void> {
    const options = [
      "Extract Method",
      "Split by Responsibility",
      "Create Helper Functions",
      "Learn About Function Length",
    ];

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: "Choose a function splitting approach",
    });

    if (selected === "Learn About Function Length") {
      vscode.env.openExternal(
        vscode.Uri.parse("https://refactoring.guru/extract-method")
      );
    } else if (selected) {
      vscode.window.showInformationMessage(
        `Function splitting: ${selected} - Consider breaking long functions into smaller, focused methods.`
      );
    }
  }

  /**
   * Show help for suggestion type
   */
  private async showSuggestionHelp(suggestionType: string): Promise<void> {
    const helpUrls: { [key: string]: string } = {
      complexity: "https://en.wikipedia.org/wiki/Cyclomatic_complexity",
      documentation: "https://peps.python.org/pep-0257/",
      parameters: "https://refactoring.guru/introduce-parameter-object",
      length: "https://refactoring.guru/extract-method",
      performance: "https://docs.python.org/3/library/profile.html",
    };

    const url = helpUrls[suggestionType];
    if (url) {
      vscode.env.openExternal(vscode.Uri.parse(url));
    } else {
      vscode.window.showInformationMessage(
        `No help available for suggestion type: ${suggestionType}`
      );
    }
  }

  /**
   * Set guidance manager for integration
   */
  public setGuidanceManager(guidanceManager: any): void {
    this.guidanceManager = guidanceManager;
    this.errorHandler.logError(
      "Guidance manager set for code lens provider",
      null,
      "DoraCodeLensProvider"
    );
  }



  /**
   * Get guidance manager
   */
  public getGuidanceManager(): any {
    return this.guidanceManager;
  }

  /**
   * Check if we have cached analysis results for a file
   */
  public hasCachedResults(filePath: string): boolean {
    try {
      // Check if we have analysis data and if it contains results for this file
      if (!this.codeLensProvider.analysisData) {
        return false;
      }

      const fileAnalysis = this.findFileAnalysisInData(this.codeLensProvider.analysisData, filePath);
      return fileAnalysis !== null;
    } catch (error) {
      this.errorHandler.logError(
        'Error checking cached results',
        error,
        'CodeLensManager'
      );
      return false;
    }
  }

  /**
   * Find file analysis in analysis data
   */
  private findFileAnalysisInData(analysisData: any, filePath: string): any {
    if (!analysisData) {
      return null;
    }

    // Try to find file analysis in different possible structures
    if (analysisData.files) {
      return analysisData.files.find(
        (file: any) => file.path === filePath || file.file_path === filePath
      );
    }

    if (analysisData.analysis_results) {
      return analysisData.analysis_results.find(
        (file: any) => file.path === filePath || file.file_path === filePath
      );
    }

    // Try to find in project structure
    if (analysisData.project_structure) {
      return this.findInProjectStructure(analysisData.project_structure, filePath);
    }

    return null;
  }

  /**
   * Recursively find file analysis in project structure
   */
  private findInProjectStructure(structure: any, filePath: string): any {
    if (Array.isArray(structure)) {
      for (const item of structure) {
        const result = this.findInProjectStructure(item, filePath);
        if (result) {
          return result;
        }
      }
    } else if (structure && typeof structure === 'object') {
      if (structure.path === filePath || structure.file_path === filePath) {
        return structure;
      }

      if (structure.children) {
        return this.findInProjectStructure(structure.children, filePath);
      }

      if (structure.files) {
        return this.findInProjectStructure(structure.files, filePath);
      }
    }

    return null;
  }

  /**
   * Create basic guidance prompts (excluding analysis commands)
   */
  private createBasicGuidancePrompts(document: vscode.TextDocument): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];
    
    // Only show helpful guidance, not analysis commands
    const helpfulGuidance = new vscode.CodeLens(
      new vscode.Range(0, 0, 0, 0),
      {
        title: "$(info) Code Lens enabled - complexity indicators will appear above functions when analysis data is available",
        command: "doracodelens.openSettings",
        tooltip: "Click to configure Code Lens settings"
      }
    );
    
    codeLenses.push(helpfulGuidance);
    return codeLenses;
  }



  /**
   * Dispose of resources
   */
  public dispose(): void {
    if (this.disposable) {
      this.disposable.dispose();
      this.disposable = null;
    }
    this.codeLensProvider.dispose();
  }
}
