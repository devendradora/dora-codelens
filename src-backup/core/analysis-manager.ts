import * as vscode from "vscode";
import * as path from "path";
import {
  AnalyzerRunner,
  AnalysisResult,
  AnalyzerOptions,
} from "../analyzer-runner";
import { ConfigurationManager } from "./configuration-manager";

/**
 * Analysis state interface
 */
export interface AnalysisState {
  isAnalyzing: boolean;
  lastResult: AnalysisResult | null;
  currentOptions: AnalyzerOptions | null;
}

/**
 * Function information interface for call hierarchy
 */
export interface FunctionInfo {
  name: string;
  module: string;
  fullName: string;
}

/**
 * Analysis Manager handles all analysis orchestration and state management
 */
export class AnalysisManager {
  private state: AnalysisState = {
    isAnalyzing: false,
    lastResult: null,
    currentOptions: null,
  };

  constructor(
    private analyzerRunner: AnalyzerRunner,
    private configurationManager: ConfigurationManager,
    private outputChannel: vscode.OutputChannel,
    private statusBarItem: vscode.StatusBarItem
  ) {}

  /**
   * Get current analysis state
   */
  public getState(): AnalysisState {
    return { ...this.state };
  }

  /**
   * Get last analysis result
   */
  public getLastResult(): AnalysisResult | null {
    return this.state.lastResult;
  }

  /**
   * Check if analysis is currently running
   */
  public isAnalyzing(): boolean {
    return this.state.isAnalyzing;
  }

  /**
   * Main project analysis orchestration
   */
  public async analyzeProject(): Promise<AnalysisResult | null> {
    if (this.state.isAnalyzing) {
      vscode.window.showWarningMessage("Analysis is already in progress");
      return null;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage("No workspace folder open");
      return null;
    }

    // Validate configuration before starting
    const configValidation = this.configurationManager.validateConfiguration();
    if (!configValidation.isValid) {
      const issues = configValidation.issues.join("\n");
      vscode.window
        .showWarningMessage(
          "Configuration issues detected:",
          { modal: true, detail: issues },
          "Fix Settings"
        )
        .then((action) => {
          if (action === "Fix Settings") {
            this.configurationManager.openSettings();
          }
        });
      return null;
    }

    this.state.isAnalyzing = true;
    this.statusBarItem.text = "$(sync~spin) Analyzing...";
    this.log("Starting project analysis...");

    try {
      // First analyze tech stack
      this.log("Starting tech stack analysis...");
      const techStackResult = await this.analyzerRunner.analyzeTechStack({
        projectPath: workspaceFolders[0].uri.fsPath,
        enableCaching:
          this.configurationManager.getConfiguration().enableCaching,
      });

      if (!techStackResult.success) {
        this.logError(
          "Tech stack analysis failed",
          new Error(
            techStackResult.errors?.[0]?.message || "Unknown tech stack error"
          )
        );
        // Don't return null here - continue with main analysis even if tech stack fails
        this.log("Continuing with main analysis despite tech stack failure");
      } else {
        this.log("Tech stack analysis completed successfully");
      }

      // Show progress dialog for remaining analysis
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Analyzing Python Project",
          cancellable: true,
        },
        async (progress, token) => {
          // Prepare analyzer options
          const options: AnalyzerOptions =
            this.configurationManager.getAnalyzerOptions(
              workspaceFolders[0].uri.fsPath
            );
          this.state.currentOptions = options;

          // Run the analysis
          return await this.analyzerRunner.runAnalysis(
            options,
            progress,
            token
          );
        }
      );

      // Combine tech stack with main analysis result
      const combinedResult = {
        ...result,
        data: {
          ...result.data,
          techStack: techStackResult.success ? techStackResult.data : null,
        },
      };

      this.state.lastResult = combinedResult;
      this.log(
        `Combined result created - success: ${
          combinedResult.success
        }, hasData: ${!!combinedResult.data}`
      );

      // Log analysis result details
      this.log(
        `Analysis result received - success: ${
          result.success
        }, hasData: ${!!result.data}`
      );

      if (result.data) {
        this.log(
          `Analysis result data structure: ${JSON.stringify({
            hasData: !!result.data,
            hasModules: !!(result.data && result.data.modules),
            moduleNodes:
              result.data && result.data.modules
                ? result.data.modules.nodes?.length || 0
                : 0,
            hasFunctions: !!(result.data && result.data.functions),
            functionNodes:
              result.data && result.data.functions
                ? result.data.functions.nodes?.length || 0
                : 0,
          })}`
        );
      } else {
        this.log("No data in analysis result");
      }

      const hasValidData = this.hasValidAnalysisData(result);
      this.log(`hasValidData: ${hasValidData}`);

      if (result.success) {
        this.log(
          `Analysis completed successfully in ${result.executionTime}ms`
        );

        // Only show success notification if we don't have valid data to display
        // This prevents duplicate notifications when the UI manager also shows success
        if (!this.hasValidAnalysisData(result)) {
          const action = await vscode.window.showInformationMessage(
            "Project analysis completed successfully!",
            "Show Code Graph",
            "View Output"
          );

          if (action === "Show Code Graph") {
            // Don't call the command again - just let the UI manager handle showing the results
            this.log(
              "User requested to show code graph - results will be displayed by UI manager"
            );
          } else if (action === "View Output") {
            this.outputChannel.show();
          }
        }
      } else {
        // Handle analysis errors but still show graph if we have data
        this.handleAnalysisErrors(result);

        if (hasValidData) {
          this.log(
            `Analysis completed with errors but produced valid data in ${result.executionTime}ms`
          );

          // Show warning message with options to view results
          const action = await vscode.window.showWarningMessage(
            "Project analysis completed with errors, but data is available.",
            "Show Code Graph",
            "View Output",
            "View Errors"
          );

          if (action === "Show Code Graph") {
            // Don't call the command again - just let the UI manager handle showing the results
            this.log(
              "User requested to show code graph - results will be displayed by UI manager"
            );
          } else if (action === "View Output") {
            this.outputChannel.show();
          } else if (action === "View Errors") {
            this.outputChannel.show();
          }
        } else {
          this.log(
            `Analysis failed - no valid data produced in ${result.executionTime}ms`
          );
        }
      }

      this.log(
        `Returning analysis result - success: ${combinedResult.success}`
      );
      return combinedResult;
    } catch (error) {
      this.logError("Analysis failed", error);

      if (error instanceof Error && error.message.includes("cancelled")) {
        vscode.window.showInformationMessage("Analysis was cancelled");
      } else {
        vscode.window.showErrorMessage(
          "Project analysis failed. Check output for details."
        );
      }
      return null;
    } finally {
      this.performAnalysisCleanup();
    }
  }

  /**
   * Show call hierarchy for function at cursor or selection
   */
  /**
   * Analyze the database schema in the project
   */
  public async analyzeDatabaseSchema() {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        throw new Error("No workspace folder open");
      }

      // Show progress dialog
      return await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Analyzing Database Schema",
          cancellable: true,
        },
        async (progress, token) => {
          progress.report({ message: "Starting schema analysis..." });

          const options = {
            projectPath: workspaceFolders[0].uri.fsPath,
            enableCaching: true,
          };

          const result = await this.analyzerRunner.analyzeDatabaseSchema(
            options,
            progress,
            token
          );
          if (result.success) {
            return { success: true, data: result.data || result };
          } else {
            throw new Error(
              result.errors?.[0]?.message || "Failed to analyze database schema"
            );
          }
        }
      );
    } catch (error) {
      this.logError("Database schema analysis failed", error);
      throw error;
    }
  }

  public async showCallHierarchy(
    uri?: vscode.Uri,
    position?: vscode.Position
  ): Promise<void> {
    // Run analysis if not available
    if (!this.state.lastResult || !this.state.lastResult.data) {
      await this.analyzeProject();
      if (!this.state.lastResult || !this.state.lastResult.data) {
        return;
      }
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage(
        "No active editor. Please open a Python file and place cursor on a function."
      );
      return;
    }

    if (editor.document.languageId !== "python") {
      vscode.window.showErrorMessage(
        "Call hierarchy is only available for Python files. Current file type: " +
          editor.document.languageId
      );
      return;
    }

    try {
      const functionInfo = this.detectFunctionAtPosition(editor, position);

      if (!functionInfo) {
        vscode.window
          .showInformationMessage(
            "No function found at cursor position. Please place cursor on a function name or definition.",
            "Help"
          )
          .then((action) => {
            if (action === "Help") {
              vscode.window.showInformationMessage(
                'To show call hierarchy:\n1. Place cursor on a function name\n2. Right-click and select "Show Call Hierarchy"\n3. Or use the command palette: "DoraCodeBirdView: Show Call Hierarchy"'
              );
            }
          });
        return;
      }

      this.log(
        `Showing call hierarchy for function: ${functionInfo.name} in module: ${functionInfo.module}`
      );

      // Validate that we have function data
      if (!this.hasValidFunctionData(this.state.lastResult)) {
        vscode.window
          .showWarningMessage(
            "No function data available for call hierarchy. The analysis may not have found any function calls.",
            "Re-run Analysis",
            "Check Output"
          )
          .then((action) => {
            if (action === "Re-run Analysis") {
              // Don't call analyzeProject directly - let the command manager handle it
              vscode.commands.executeCommand("doracodebird.fullCodeAnalysis");
            } else if (action === "Check Output") {
              this.outputChannel.show();
            }
          });
        return;
      }

      // Don't call another command - just log that call hierarchy was requested
      this.log("Call hierarchy requested - should be handled by UI manager");

      this.log(
        `Call hierarchy request processed for function: ${functionInfo.fullName}`
      );
    } catch (error) {
      this.logError("Failed to show call hierarchy", error);
      vscode.window
        .showErrorMessage(
          "Failed to show call hierarchy. Check output for details.",
          "Check Output",
          "Try Again"
        )
        .then((action) => {
          if (action === "Check Output") {
            this.outputChannel.show();
          } else if (action === "Try Again") {
            // Try again with a slight delay
            setTimeout(() => this.showCallHierarchy(uri, position), 1000);
          }
        });
    }
  }

  /**
   * Cancel current analysis
   */
  public cancelAnalysis(): void {
    if (this.state.isAnalyzing) {
      this.analyzerRunner.cancelAnalysis();
      this.performAnalysisCleanup();
      vscode.window.showInformationMessage("Analysis cancelled");
    }
  }

  /**
   * Check if analysis result has valid data for visualization
   */
  public hasValidAnalysisData(result: AnalysisResult): boolean {
    return (
      result.data &&
      ((result.data.modules &&
        result.data.modules.nodes &&
        result.data.modules.nodes.length > 0) ||
        (result.data.functions &&
          result.data.functions.nodes &&
          result.data.functions.nodes.length > 0))
    );
  }

  /**
   * Check if analysis result has valid function data
   */
  public hasValidFunctionData(result: AnalysisResult): boolean {
    return (
      result.data &&
      result.data.functions &&
      result.data.functions.nodes &&
      result.data.functions.nodes.length > 0
    );
  }

  /**
   * Run current file analysis
   */
  public async runCurrentFileAnalysis(
    filePath: string,
    progress?: vscode.Progress<{ message?: string; increment?: number }>,
    token?: vscode.CancellationToken
  ): Promise<any> {
    if (this.state.isAnalyzing) {
      vscode.window.showWarningMessage("Analysis is already in progress");
      return {
        success: false,
        errors: [{ type: "busy", message: "Analysis already in progress" }],
      };
    }

    if (!filePath) {
      const error = "No file path provided for current file analysis";
      this.logError(error, new Error(error));
      return {
        success: false,
        errors: [{ type: "invalid_input", message: error }],
      };
    }

    this.state.isAnalyzing = true;
    this.statusBarItem.text = "$(sync~spin) Analyzing current file...";
    this.log(`Starting current file analysis for: ${filePath}`);

    try {
      // Check if service is available
      if (!this.isServiceAvailable("currentFile")) {
        const error = "Current file analysis service not available";
        this.log(error);
        return {
          success: false,
          errors: [{ type: "service_unavailable", message: error }],
          filePath: filePath,
        };
      }

      // Run the current file analysis
      const result = await this.analyzerRunner.runCurrentFileAnalysis(
        filePath,
        progress,
        token
      );

      if (result.success && result.data) {
        this.log(
          `Current file analysis completed successfully for: ${filePath}`
        );

        // Transform the result to match expected interface
        return {
          success: true,
          filePath: filePath,
          language: "python",
          functions: result.data.functions || [],
          classes: result.data.classes || [],
          imports: result.data.imports || [],
          complexity: result.data.complexity || {
            cyclomaticComplexity: 0,
            cognitiveComplexity: 0,
            linesOfCode: 0,
            maintainabilityIndex: 0,
          },
          data: result.data,
          errors: result.errors || [],
        };
      } else {
        this.log(`Current file analysis failed for: ${filePath}`);
        return {
          success: false,
          filePath: filePath,
          errors: result.errors || [
            {
              type: "analysis_failed",
              message: "Current file analysis failed",
            },
          ],
        };
      }
    } catch (error) {
      this.logError("Current file analysis failed", error);
      return {
        success: false,
        filePath: filePath,
        errors: [
          {
            type: "execution_error",
            message:
              error instanceof Error ? error.message : "Unknown error occurred",
          },
        ],
      };
    } finally {
      this.performAnalysisCleanup();
    }
  }

  /**
   * Run Git analysis
   */
  public async runGitAnalysis(
    options?: any,
    progress?: vscode.Progress<{ message?: string; increment?: number }>,
    token?: vscode.CancellationToken
  ): Promise<any> {
    if (this.state.isAnalyzing) {
      vscode.window.showWarningMessage("Analysis is already in progress");
      return {
        success: false,
        errors: [{ type: "busy", message: "Analysis already in progress" }],
      };
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      const error = "No workspace folder open for Git analysis";
      this.logError(error, new Error(error));
      return {
        success: false,
        errors: [{ type: "no_workspace", message: error }],
      };
    }

    this.state.isAnalyzing = true;
    this.statusBarItem.text = "$(sync~spin) Analyzing Git data...";
    this.log("Starting Git analysis...");

    try {
      // Check if service is available
      if (!this.isServiceAvailable("git")) {
        const error = "Git analysis service not available";
        this.log(error);
        return {
          success: false,
          errors: [{ type: "service_unavailable", message: error }],
        };
      }

      const gitOptions = {
        projectPath: workspaceFolders[0].uri.fsPath,
        analysisType: options?.analysisType || "git_author_statistics",
        timeout: options?.timeout || 120000,
      };

      // Run the Git analysis
      const result = await this.analyzerRunner.runGitAnalysis(
        gitOptions,
        progress,
        token
      );

      if (result.success && result.data) {
        this.log("Git analysis completed successfully");

        // Transform the result to match expected interface
        return {
          success: true,
          repository: result.data.repository || {
            name: "Unknown",
            path: gitOptions.projectPath,
            branch: "main",
            totalCommits: 0,
          },
          commits: result.data.commits || [],
          contributors: result.data.contributors || [],
          fileChanges: result.data.fileChanges || [],
          analytics: result.data.analytics || {
            commitFrequency: [],
            fileHotspots: [],
            authorActivity: [],
            codeChurn: [],
          },
          data: result.data,
          errors: result.errors || [],
        };
      } else {
        this.log("Git analysis failed or returned no data");
        return {
          success: false,
          errors: result.errors || [
            { type: "analysis_failed", message: "Git analysis failed" },
          ],
        };
      }
    } catch (error) {
      this.logError("Git analysis failed", error);

      // Provide specific error messages for common Git issues
      let errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      let errorType = "execution_error";

      if (errorMessage.includes("not a git repository")) {
        errorType = "not_git_repo";
        errorMessage =
          "This workspace is not a Git repository. Git analytics require a Git repository.";
      } else if (errorMessage.includes("git not found")) {
        errorType = "git_not_found";
        errorMessage =
          "Git is not installed or not found in PATH. Please install Git to use Git analytics.";
      }

      return {
        success: false,
        errors: [{ type: errorType, message: errorMessage }],
      };
    } finally {
      this.performAnalysisCleanup();
    }
  }

  /**
   * Run database schema analysis
   */
  public async runDatabaseSchemaAnalysis(
    options?: any,
    progress?: vscode.Progress<{ message?: string; increment?: number }>,
    token?: vscode.CancellationToken
  ): Promise<any> {
    if (this.state.isAnalyzing) {
      vscode.window.showWarningMessage("Analysis is already in progress");
      return {
        success: false,
        errors: [{ type: "busy", message: "Analysis already in progress" }],
      };
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      const error = "No workspace folder open for database schema analysis";
      this.logError(error, new Error(error));
      return {
        success: false,
        errors: [{ type: "no_workspace", message: error }],
      };
    }

    this.state.isAnalyzing = true;
    this.statusBarItem.text = "$(sync~spin) Analyzing database schema...";
    this.log("Starting database schema analysis...");

    try {
      // Check if service is available
      if (!this.isServiceAvailable("database")) {
        const error = "Database schema analysis service not available";
        this.log(error);
        return {
          success: false,
          errors: [{ type: "service_unavailable", message: error }],
        };
      }

      const dbOptions = {
        projectPath: workspaceFolders[0].uri.fsPath,
        pythonPath: this.configurationManager.getPythonPath(),
        timeout: options?.timeout || 120000,
        enableCaching:
          options?.enableCaching ||
          this.configurationManager.isCachingEnabled(),
      };

      // For now, simulate database schema analysis since the actual implementation
      // would require a database schema analyzer script
      progress?.report({
        message: "Scanning for database models...",
        increment: 30,
      });

      // Simulate some processing time
      await new Promise((resolve) => setTimeout(resolve, 1000));

      progress?.report({
        message: "Analyzing schema relationships...",
        increment: 60,
      });

      // Simulate more processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      progress?.report({
        message: "Generating schema diagram...",
        increment: 90,
      });

      // Return a mock result for now - this would be replaced with actual database analysis
      const mockResult = {
        success: true,
        schemas: [],
        tables: [],
        relationships: [],
        diagram: {
          nodes: [],
          edges: [],
          layout: { algorithm: "dagre", options: {} },
        },
        data: {
          message: "Database schema analysis is not yet fully implemented",
          schemas: [],
          tables: [],
          relationships: [],
        },
        errors: [],
      };

      this.log("Database schema analysis completed (mock implementation)");
      progress?.report({ message: "Analysis complete", increment: 100 });

      return mockResult;
    } catch (error) {
      this.logError("Database schema analysis failed", error);
      return {
        success: false,
        errors: [
          {
            type: "execution_error",
            message:
              error instanceof Error ? error.message : "Unknown error occurred",
          },
        ],
      };
    } finally {
      this.performAnalysisCleanup();
    }
  }

  /**
   * Check if a service is available
   */
  public isServiceAvailable(serviceName: string): boolean {
    const fs = require("fs");

    switch (serviceName) {
      case "currentFile":
        // Check if current file analyzer script exists
        try {
          // Try to get extension path from various sources
          let extensionPath = "";

          // Try to get from vscode context
          const extensions = require("vscode").extensions;
          const extension = extensions.getExtension(
            "doracodebird.doracodebird-view"
          );
          if (extension) {
            extensionPath = extension.extensionPath;
          } else {
            // Fallback: assume we're in the extension directory
            extensionPath = path.join(__dirname, "..", "..");
          }

          const analyzerPath = path.join(
            extensionPath,
            "analyzer",
            "current_file_analyzer.py"
          );
          return fs.existsSync(analyzerPath);
        } catch {
          return false;
        }

      case "git":
        // Check if git analyzer script exists
        try {
          let extensionPath = "";

          const extensions = require("vscode").extensions;
          const extension = extensions.getExtension(
            "doracodebird.doracodebird-view"
          );
          if (extension) {
            extensionPath = extension.extensionPath;
          } else {
            extensionPath = path.join(__dirname, "..", "..");
          }

          const analyzerPath = path.join(
            extensionPath,
            "analyzer",
            "git_analytics_runner.py"
          );
          return fs.existsSync(analyzerPath);
        } catch {
          return false;
        }

      case "database":
        // Check if database schema analyzer script exists
        try {
          let extensionPath = "";

          const extensions = require("vscode").extensions;
          const extension = extensions.getExtension(
            "doracodebird.doracodebird-view"
          );
          if (extension) {
            extensionPath = extension.extensionPath;
          } else {
            extensionPath = path.join(__dirname, "..", "..");
          }

          const analyzerPath = path.join(
            extensionPath,
            "analyzer",
            "database_schema_analyzer.py"
          );
          return fs.existsSync(analyzerPath);
        } catch {
          return false;
        }

      default:
        return false;
    }
  }

  /**
   * Handle analysis errors and warnings
   */
  private handleAnalysisErrors(result: AnalysisResult): void {
    const errors = result.errors || [];
    const warnings = result.warnings || [];

    // Log all errors and warnings
    errors.forEach((error) => {
      this.logError(`Analysis error (${error.type})`, new Error(error.message));
    });

    warnings.forEach((warning) => {
      this.log(`Analysis warning (${warning.type}): ${warning.message}`);
    });

    // Provide specific guidance for common errors
    const commonErrors = this.categorizeErrors(errors);

    if (commonErrors.pythonNotFound) {
      vscode.window
        .showErrorMessage(
          "Python not found. Please install Python or configure the Python path in settings.",
          "Open Settings",
          "Install Python Guide"
        )
        .then((action) => {
          if (action === "Open Settings") {
            vscode.commands.executeCommand(
              "workbench.action.openSettings",
              "doracodebird.pythonPath"
            );
          } else if (action === "Install Python Guide") {
            vscode.env.openExternal(
              vscode.Uri.parse("https://www.python.org/downloads/")
            );
          }
        });
    } else if (commonErrors.dependencyMissing) {
      vscode.window
        .showErrorMessage(
          "Required Python dependencies are missing. Please install them.",
          "View Requirements",
          "Install Dependencies"
        )
        .then((action) => {
          if (action === "View Requirements") {
            this.outputChannel.show();
          } else if (action === "Install Dependencies") {
            this.showDependencyInstallationGuide();
          }
        });
    } else if (commonErrors.parsingErrors) {
      vscode.window
        .showWarningMessage(
          `Analysis completed with ${commonErrors.parsingErrors} parsing error(s). Some files may have syntax issues.`,
          "View Details"
        )
        .then((action) => {
          if (action === "View Details") {
            this.outputChannel.show();
          }
        });
    } else if (errors.length > 0) {
      const errorMessage = `Analysis completed with ${errors.length} error(s)`;
      vscode.window
        .showErrorMessage(errorMessage, "View Output", "Troubleshoot")
        .then((action) => {
          if (action === "View Output") {
            this.outputChannel.show();
          } else if (action === "Troubleshoot") {
            this.showTroubleshootingGuide();
          }
        });
    } else if (warnings.length > 0) {
      const warningMessage = `Analysis completed with ${warnings.length} warning(s)`;
      vscode.window
        .showWarningMessage(warningMessage, "View Output")
        .then((action) => {
          if (action === "View Output") {
            this.outputChannel.show();
          }
        });
    }
  }

  /**
   * Categorize errors to provide specific guidance
   */
  private categorizeErrors(errors: any[]): {
    pythonNotFound: boolean;
    dependencyMissing: boolean;
    parsingErrors: number;
    other: number;
  } {
    let pythonNotFound = false;
    let dependencyMissing = false;
    let parsingErrors = 0;
    let other = 0;

    errors.forEach((error) => {
      const message = error.message?.toLowerCase() || "";
      const type = error.type?.toLowerCase() || "";

      if (
        message.includes("python") &&
        (message.includes("not found") || message.includes("command not found"))
      ) {
        pythonNotFound = true;
      } else if (
        type === "dependency_error" ||
        message.includes("module not found") ||
        message.includes("import error")
      ) {
        dependencyMissing = true;
      } else if (type === "parsing_error" || type === "syntax_error") {
        parsingErrors++;
      } else {
        other++;
      }
    });

    return { pythonNotFound, dependencyMissing, parsingErrors, other };
  }

  /**
   * Detect function at cursor position
   */
  private detectFunctionAtPosition(
    editor: vscode.TextEditor,
    position?: vscode.Position
  ): FunctionInfo | null {
    const currentPosition = position || editor.selection.active;
    const document = editor.document;
    const line = document.lineAt(currentPosition.line);
    const lineText = line.text;

    // Try to detect function definition or call
    const functionDefMatch = lineText.match(/def\s+(\w+)\s*\(/);
    const functionCallMatch = lineText.match(/(\w+)\s*\(/);

    let functionName: string | null = null;

    if (functionDefMatch) {
      functionName = functionDefMatch[1];
    } else if (functionCallMatch) {
      functionName = functionCallMatch[1];
    } else {
      // Try to get word at cursor position
      const wordRange = document.getWordRangeAtPosition(currentPosition);
      if (wordRange) {
        const word = document.getText(wordRange);
        if (word && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(word)) {
          functionName = word;
        }
      }
    }

    if (!functionName) {
      return null;
    }

    // Get module name from file path
    const relativePath = vscode.workspace.asRelativePath(document.uri);
    const moduleName = relativePath.replace(/\.py$/, "").replace(/\//g, ".");

    return {
      name: functionName,
      module: moduleName,
      fullName: `${moduleName}.${functionName}`,
    };
  }

  /**
   * Show dependency installation guide
   */
  private showDependencyInstallationGuide(): void {
    const message = `To install required dependencies, run the following commands in your terminal:

1. Navigate to the analyzer directory:
   cd ${
     vscode.extensions.getExtension("your-extension-id")?.extensionPath
   }/analyzer

2. Install dependencies:
   pip install -r requirements.txt
   
   OR if using poetry:
   poetry install

3. Re-run the analysis`;

    vscode.window
      .showInformationMessage(
        "Dependency Installation Guide",
        { modal: true, detail: message },
        "Copy Commands"
      )
      .then((action) => {
        if (action === "Copy Commands") {
          vscode.env.clipboard.writeText("pip install radon pathlib typing");
        }
      });
  }

  /**
   * Show troubleshooting guide
   */
  private showTroubleshootingGuide(): void {
    const message = `Common troubleshooting steps:

1. Ensure Python 3.7+ is installed and accessible
2. Check that required dependencies are installed (radon, pathlib, typing)
3. Verify the project contains Python files
4. Check file permissions and accessibility
5. Try running analysis on a smaller subset of files

For more help, check the extension documentation or report an issue.`;

    vscode.window
      .showInformationMessage(
        "Troubleshooting Guide",
        { modal: true, detail: message },
        "Open Documentation",
        "Report Issue"
      )
      .then((action) => {
        if (action === "Open Documentation") {
          // Open documentation URL when available
          vscode.window.showInformationMessage(
            "Documentation will be available soon."
          );
        } else if (action === "Report Issue") {
          vscode.env.openExternal(
            vscode.Uri.parse("https://github.com/your-repo/issues")
          );
        }
      });
  }

  /**
   * Perform cleanup after analysis completion
   */
  private performAnalysisCleanup(): void {
    this.log("Performing analysis cleanup...");
    this.state.isAnalyzing = false;
    this.statusBarItem.text = "$(graph) DoraCodeBirdView";
    this.log("Analysis cleanup completed");
  }

  /**
   * Log message to output channel
   */
  private log(message: string): void {
    this.outputChannel.appendLine(`[AnalysisManager] ${message}`);
  }

  /**
   * Log error to output channel
   */
  private logError(message: string, error: any): void {
    this.outputChannel.appendLine(`[AnalysisManager] ERROR: ${message}`);
    if (error instanceof Error) {
      this.outputChannel.appendLine(`[AnalysisManager] ${error.message}`);
      if (error.stack) {
        this.outputChannel.appendLine(`[AnalysisManager] ${error.stack}`);
      }
    } else {
      this.outputChannel.appendLine(`[AnalysisManager] ${String(error)}`);
    }
  }
}
