import * as vscode from "vscode";
import { ErrorHandler } from "../core/error-handler";
import { CodeLensGuidanceManager } from "../core/code-lens-guidance-manager";
import { AnalysisManager } from "../core/analysis-manager";
import { PreferenceStorageService } from "../services/preference-storage-service";

/**
 * Guidance Command Handler
 * Processes user selections and triggers appropriate analysis commands
 */
export class GuidanceCommandHandler {
  private errorHandler: ErrorHandler;
  private guidanceManager: CodeLensGuidanceManager;
  private analysisManager: AnalysisManager;
  private preferenceService: PreferenceStorageService;
  private context: vscode.ExtensionContext;
  private disposables: vscode.Disposable[] = [];

  constructor(
    errorHandler: ErrorHandler,
    context: vscode.ExtensionContext,
    guidanceManager: CodeLensGuidanceManager,
    analysisManager: AnalysisManager,
    preferenceService: PreferenceStorageService
  ) {
    this.errorHandler = errorHandler;
    this.context = context;
    this.guidanceManager = guidanceManager;
    this.analysisManager = analysisManager;
    this.preferenceService = preferenceService;

    this.registerCommands();
  }

  /**
   * Register guidance-related commands
   */
  private registerCommands(): void {
    try {
      // Welcome command
      const showWelcomeCommand = vscode.commands.registerCommand(
        "doracodelens.guidance.showWelcome",
        () => this.handleShowWelcome()
      );

      // Analysis commands
      const analyzeCurrentFileCommand = vscode.commands.registerCommand(
        "doracodelens.guidance.analyzeCurrentFile",
        () => this.handleAnalyzeCurrentFile()
      );

      const analyzeFullProjectCommand = vscode.commands.registerCommand(
        "doracodelens.guidance.analyzeFullProject",
        () => this.handleAnalyzeFullProject()
      );

      const refreshAnalysisCommand = vscode.commands.registerCommand(
        "doracodelens.guidance.refreshAnalysis",
        () => this.handleRefreshAnalysis()
      );

      // Error handling commands
      const retryAnalysisCommand = vscode.commands.registerCommand(
        "doracodelens.guidance.retryAnalysis",
        (error: string) => this.handleRetryAnalysis(error)
      );

      // Progress command
      const showProgressCommand = vscode.commands.registerCommand(
        "doracodelens.guidance.showProgress",
        () => this.handleShowProgress()
      );

      // Preference commands
      const changePreferencesCommand = vscode.commands.registerCommand(
        "doracodelens.guidance.changePreferences",
        () => this.handleChangePreferences()
      );

      const setPreferredAnalysisCommand = vscode.commands.registerCommand(
        "doracodelens.guidance.setPreferredAnalysis",
        (type: "current-file" | "full-project") =>
          this.handleSetPreferredAnalysis(type)
      );

      // Error handling command
      const showErrorDetailsCommand = vscode.commands.registerCommand(
        "doracodelens.guidance.showErrorDetails",
        (errorMessage: string, troubleshootingSteps: string[], context: any) =>
          this.handleShowErrorDetails(
            errorMessage,
            troubleshootingSteps,
            context
          )
      );

      // Store disposables
      this.disposables.push(
        showWelcomeCommand,
        analyzeCurrentFileCommand,
        analyzeFullProjectCommand,
        refreshAnalysisCommand,
        retryAnalysisCommand,
        showProgressCommand,
        changePreferencesCommand,
        setPreferredAnalysisCommand,
        showErrorDetailsCommand
      );

      // Add to context subscriptions
      this.context.subscriptions.push(...this.disposables);

      this.errorHandler.logError(
        "Guidance commands registered successfully",
        null,
        "GuidanceCommandHandler"
      );
    } catch (error) {
      this.errorHandler.logError(
        "Failed to register guidance commands",
        error,
        "GuidanceCommandHandler"
      );
    }
  }

  /**
   * Handle show welcome command
   */
  private async handleShowWelcome(): Promise<void> {
    try {
      this.errorHandler.logError(
        "Showing welcome guidance",
        null,
        "GuidanceCommandHandler"
      );

      const message =
        "Welcome to DoraCodeLens! This extension provides code complexity analysis and suggestions for Python projects.\n\n" +
        "To get started, you need to run an analysis on your code. You can choose to:\n" +
        "• Analyze Current File - Quick analysis for the file you're working on\n" +
        "• Analyze Full Project - Comprehensive analysis for your entire project\n\n" +
        "After analysis, you'll see complexity metrics and helpful suggestions directly in your code.";

      const smartSuggestion =
        await this.guidanceManager.getSmartPreferenceSuggestion();
      const suggestedAction =
        smartSuggestion === "full-project"
          ? "Analyze Full Project"
          : "Analyze Current File";
      const alternativeAction =
        smartSuggestion === "full-project"
          ? "Analyze Current File"
          : "Analyze Full Project";

      const action = await vscode.window.showInformationMessage(
        message,
        { modal: true },
        suggestedAction,
        alternativeAction,
        "Setup Python",
        "Settings",
        "Don't Show Again"
      );

      if (action === suggestedAction) {
        if (smartSuggestion === "full-project") {
          await this.handleAnalyzeFullProject();
        } else {
          await this.handleAnalyzeCurrentFile();
        }
      } else if (action === alternativeAction) {
        if (smartSuggestion === "full-project") {
          await this.handleAnalyzeCurrentFile();
        } else {
          await this.handleAnalyzeFullProject();
        }
      } else if (action === "Setup Python") {
        await vscode.commands.executeCommand("doracodelens.setupPythonPath");
      } else if (action === "Settings") {
        await this.handleChangePreferences();
      } else if (action === "Don't Show Again") {
        await this.guidanceManager.updatePreferences({
          showWelcomeMessage: false,
        });
        vscode.window.showInformationMessage(
          "Welcome message disabled. You can re-enable it in settings."
        );
      }
    } catch (error) {
      this.errorHandler.logError(
        "Error showing welcome guidance",
        error,
        "GuidanceCommandHandler"
      );
      vscode.window.showErrorMessage("Failed to show welcome guidance.");
    }
  }

  /**
   * Handle analyze current file command
   */
  private async handleAnalyzeCurrentFile(): Promise<void> {
    try {
      this.errorHandler.logError(
        "Analyzing current file from guidance",
        null,
        "GuidanceCommandHandler"
      );

      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showWarningMessage("No active file found.");
        return;
      }

      if (activeEditor.document.languageId !== "python") {
        vscode.window.showWarningMessage(
          "Code analysis is only available for Python files."
        );
        return;
      }

      // Update progress
      const documentPath = activeEditor.document.uri.fsPath;
      this.guidanceManager.setAnalysisProgress(documentPath, 0);

      // Show progress notification
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Analyzing current file...",
          cancellable: false,
        },
        async (progress) => {
          try {
            progress.report({ increment: 0, message: "Starting analysis..." });
            this.guidanceManager.setAnalysisProgress(documentPath, 25);

            progress.report({
              increment: 25,
              message: "Running complexity analysis...",
            });
            const results = await this.analysisManager.analyzeCurrentFile();
            this.guidanceManager.setAnalysisProgress(documentPath, 75);

            progress.report({
              increment: 50,
              message: "Processing results...",
            });

            if (results) {
              this.guidanceManager.markAnalysisCompleted(documentPath);
              this.guidanceManager.setAnalysisProgress(documentPath, 100);

              progress.report({ increment: 25, message: "Analysis complete!" });

              // Update last choice preference
              await this.guidanceManager.updatePreferences({
                lastAnalysisChoice: "current-file",
              });

              vscode.window.showInformationMessage(
                `Analysis complete! Found ${results.functions.length} functions and ${results.classes.length} classes.`
              );
            } else {
              throw new Error("No analysis results returned");
            }
          } catch (error) {
            this.guidanceManager.setAnalysisError(
              documentPath,
              error instanceof Error ? error.message : String(error)
            );
            throw error;
          }
        }
      );
    } catch (error) {
      this.errorHandler.logError(
        "Error analyzing current file from guidance",
        error,
        "GuidanceCommandHandler"
      );

      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        this.guidanceManager.setAnalysisError(
          activeEditor.document.uri.fsPath,
          error instanceof Error ? error.message : String(error)
        );
      }

      // Show error with recovery options
      const action = await vscode.window.showErrorMessage(
        "Failed to analyze current file. Would you like to try troubleshooting?",
        "Troubleshoot",
        "Open Output",
        "Try Again"
      );

      if (action === "Troubleshoot") {
        await this.showTroubleshootingHelp(
          error instanceof Error ? error.message : String(error)
        );
      } else if (action === "Open Output") {
        vscode.commands.executeCommand("workbench.action.output.toggleOutput");
      } else if (action === "Try Again") {
        // Clear the error and retry
        if (activeEditor) {
          this.guidanceManager.clearAnalysisError(
            activeEditor.document.uri.fsPath
          );
        }
        await this.handleAnalyzeCurrentFile();
      }
    }
  }

  /**
   * Handle analyze full project command
   */
  private async handleAnalyzeFullProject(): Promise<void> {
    try {
      this.errorHandler.logError(
        "Analyzing full project from guidance",
        null,
        "GuidanceCommandHandler"
      );

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showWarningMessage(
          "Full project analysis requires an open workspace."
        );
        return;
      }

      // Show progress notification
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Analyzing full project...",
          cancellable: false,
        },
        async (progress) => {
          try {
            progress.report({
              increment: 0,
              message: "Starting project analysis...",
            });

            progress.report({
              increment: 25,
              message: "Scanning project files...",
            });
            const results = await this.analysisManager.analyzeFullProject();

            progress.report({
              increment: 50,
              message: "Processing analysis results...",
            });

            if (results && results.size > 0) {
              // Mark all analyzed files as completed
              for (const [filePath] of results) {
                this.guidanceManager.markAnalysisCompleted(filePath);
              }

              progress.report({ increment: 25, message: "Analysis complete!" });

              // Update last choice preference
              await this.guidanceManager.updatePreferences({
                lastAnalysisChoice: "full-project",
              });

              const totalFunctions = Array.from(results.values()).reduce(
                (sum, result) => sum + result.functions.length,
                0
              );
              const totalClasses = Array.from(results.values()).reduce(
                (sum, result) => sum + result.classes.length,
                0
              );

              vscode.window.showInformationMessage(
                `Project analysis complete! Analyzed ${results.size} files with ${totalFunctions} functions and ${totalClasses} classes.`
              );
            } else {
              throw new Error("No analysis results returned");
            }
          } catch (error) {
            throw error;
          }
        }
      );
    } catch (error) {
      this.errorHandler.logError(
        "Error analyzing full project from guidance",
        error,
        "GuidanceCommandHandler"
      );

      // Show error with recovery options
      const action = await vscode.window.showErrorMessage(
        "Failed to analyze full project. Would you like to try troubleshooting?",
        "Troubleshoot",
        "Open Output",
        "Try Current File Instead"
      );

      if (action === "Troubleshoot") {
        await this.showTroubleshootingHelp(
          error instanceof Error ? error.message : String(error)
        );
      } else if (action === "Open Output") {
        vscode.commands.executeCommand("workbench.action.output.toggleOutput");
      } else if (action === "Try Current File Instead") {
        await this.handleAnalyzeCurrentFile();
      }
    }
  }

  /**
   * Handle refresh analysis command
   */
  private async handleRefreshAnalysis(): Promise<void> {
    try {
      this.errorHandler.logError(
        "Refreshing analysis from guidance",
        null,
        "GuidanceCommandHandler"
      );

      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showWarningMessage("No active file found.");
        return;
      }

      // Clear cache and re-analyze
      const documentPath = activeEditor.document.uri.fsPath;
      this.guidanceManager.clearCacheForDocument(documentPath);
      this.analysisManager.clearCache();

      // Determine which type of analysis to run based on preferences
      const preferences = this.guidanceManager.getPreferences();
      if (preferences.lastAnalysisChoice === "full-project") {
        await this.handleAnalyzeFullProject();
      } else {
        await this.handleAnalyzeCurrentFile();
      }
    } catch (error) {
      this.errorHandler.logError(
        "Error refreshing analysis from guidance",
        error,
        "GuidanceCommandHandler"
      );
      vscode.window.showErrorMessage(
        "Failed to refresh analysis. Check the output for details."
      );
    }
  }

  /**
   * Handle retry analysis command
   */
  private async handleRetryAnalysis(error: string): Promise<void> {
    try {
      this.errorHandler.logError(
        "Retrying analysis from guidance",
        { previousError: error },
        "GuidanceCommandHandler"
      );

      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showWarningMessage("No active file found.");
        return;
      }

      // Clear the error first
      const documentPath = activeEditor.document.uri.fsPath;
      this.guidanceManager.clearAnalysisError(documentPath);

      // Show troubleshooting options
      const action = await vscode.window.showErrorMessage(
        `Previous analysis failed: ${error}\n\nWould you like to retry or get troubleshooting help?`,
        "Retry Analysis",
        "Troubleshooting",
        "Cancel"
      );

      if (action === "Retry Analysis") {
        // Retry with the last successful analysis type
        const preferences = this.guidanceManager.getPreferences();
        if (preferences.lastAnalysisChoice === "full-project") {
          await this.handleAnalyzeFullProject();
        } else {
          await this.handleAnalyzeCurrentFile();
        }
      } else if (action === "Troubleshooting") {
        await this.showTroubleshootingHelp(error);
      }
    } catch (retryError) {
      this.errorHandler.logError(
        "Error retrying analysis from guidance",
        retryError,
        "GuidanceCommandHandler"
      );
      vscode.window.showErrorMessage(
        "Failed to retry analysis. Check the output for details."
      );
    }
  }

  /**
   * Handle show progress command
   */
  private async handleShowProgress(): Promise<void> {
    try {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        return;
      }

      vscode.window.showInformationMessage(
        "Analysis is currently running. Please wait for it to complete.",
        "OK"
      );
    } catch (error) {
      this.errorHandler.logError(
        "Error showing progress from guidance",
        error,
        "GuidanceCommandHandler"
      );
    }
  }

  /**
   * Handle change preferences command
   */
  private async handleChangePreferences(): Promise<void> {
    try {
      this.errorHandler.logError(
        "Changing preferences from guidance",
        null,
        "GuidanceCommandHandler"
      );

      const currentPreferences = this.guidanceManager.getPreferences();

      const options = [
        {
          label: "Preferred Analysis Type",
          description: `Current: ${currentPreferences.preferredAnalysisType}`,
          action: "analysisType",
        },
        {
          label: "Auto-run Analysis on Enable",
          description: `Current: ${
            currentPreferences.autoRunAnalysisOnEnable ? "Enabled" : "Disabled"
          }`,
          action: "autoRun",
        },
        {
          label: "Show Welcome Message",
          description: `Current: ${
            currentPreferences.showWelcomeMessage ? "Enabled" : "Disabled"
          }`,
          action: "welcome",
        },
        {
          label: "Open VS Code Settings",
          description: "Configure all DoraCodeLens settings",
          action: "settings",
        },
      ];

      const selected = await vscode.window.showQuickPick(options, {
        placeHolder: "Select a preference to change",
      });

      if (selected) {
        await this.handlePreferenceChange(selected.action, currentPreferences);
      }
    } catch (error) {
      this.errorHandler.logError(
        "Error changing preferences from guidance",
        error,
        "GuidanceCommandHandler"
      );
      vscode.window.showErrorMessage("Failed to change preferences.");
    }
  }

  /**
   * Handle specific preference changes
   */
  private async handlePreferenceChange(
    action: string,
    currentPreferences: any
  ): Promise<void> {
    switch (action) {
      case "analysisType":
        const analysisOptions = [
          { label: "Ask Each Time", value: "ask-each-time" },
          { label: "Current File Only", value: "current-file" },
          { label: "Full Project", value: "full-project" },
        ];

        const selectedAnalysis = await vscode.window.showQuickPick(
          analysisOptions,
          {
            placeHolder: "Select preferred analysis type",
          }
        );

        if (selectedAnalysis) {
          await this.guidanceManager.updatePreferences({
            preferredAnalysisType: selectedAnalysis.value as any,
          });
          vscode.window.showInformationMessage(
            `Preferred analysis type set to: ${selectedAnalysis.label}`
          );
        }
        break;

      case "autoRun":
        const autoRunChoice = await vscode.window.showQuickPick(
          [
            { label: "Enable", value: true },
            { label: "Disable", value: false },
          ],
          {
            placeHolder: "Auto-run analysis when code lens is enabled?",
          }
        );

        if (autoRunChoice !== undefined) {
          await this.guidanceManager.updatePreferences({
            autoRunAnalysisOnEnable: autoRunChoice.value,
          });
          vscode.window.showInformationMessage(
            `Auto-run analysis ${autoRunChoice.value ? "enabled" : "disabled"}`
          );
        }
        break;

      case "welcome":
        const welcomeChoice = await vscode.window.showQuickPick(
          [
            { label: "Show Welcome Message", value: true },
            { label: "Hide Welcome Message", value: false },
          ],
          {
            placeHolder: "Show welcome message for new workspaces?",
          }
        );

        if (welcomeChoice !== undefined) {
          await this.guidanceManager.updatePreferences({
            showWelcomeMessage: welcomeChoice.value,
          });
          vscode.window.showInformationMessage(
            `Welcome message ${welcomeChoice.value ? "enabled" : "disabled"}`
          );
        }
        break;

      case "settings":
        await vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "doracodelens.guidance"
        );
        break;
    }
  }

  /**
   * Handle set preferred analysis command
   */
  private async handleSetPreferredAnalysis(
    type: "current-file" | "full-project"
  ): Promise<void> {
    try {
      await this.guidanceManager.updatePreferences({
        preferredAnalysisType: type,
      });

      const typeName =
        type === "current-file" ? "Current File" : "Full Project";
      vscode.window.showInformationMessage(
        `Preferred analysis type set to: ${typeName}`
      );

      this.errorHandler.logError(
        "Preferred analysis type updated",
        { type },
        "GuidanceCommandHandler"
      );
    } catch (error) {
      this.errorHandler.logError(
        "Error setting preferred analysis type",
        error,
        "GuidanceCommandHandler"
      );
      vscode.window.showErrorMessage(
        "Failed to update preferred analysis type."
      );
    }
  }

  /**
   * Show troubleshooting help
   */
  private async showTroubleshootingHelp(error: string): Promise<void> {
    const troubleshootingSteps = this.getTroubleshootingSteps(error);

    const message = `Troubleshooting Analysis Error:\n\n${troubleshootingSteps.join(
      "\n\n"
    )}`;

    const action = await vscode.window.showInformationMessage(
      message,
      { modal: true },
      "Try Again",
      "Open Output",
      "Report Issue"
    );

    if (action === "Try Again") {
      await this.handleRefreshAnalysis();
    } else if (action === "Open Output") {
      vscode.commands.executeCommand("workbench.action.output.toggleOutput");
    } else if (action === "Report Issue") {
      const issueUrl = "https://github.com/your-repo/doracodelens/issues/new";
      vscode.env.openExternal(vscode.Uri.parse(issueUrl));
    }
  }

  /**
   * Get troubleshooting steps for common errors
   */
  private getTroubleshootingSteps(error: string): string[] {
    const steps = [
      "1. Check that Python 3 is installed and accessible from your PATH",
      "2. Ensure the current file is a valid Python file (.py extension)",
      "3. Verify that the file contains valid Python syntax",
    ];

    if (error.toLowerCase().includes("python")) {
      steps.push(
        '4. Try running "python --version" in your terminal to verify Python installation'
      );
    }

    if (error.toLowerCase().includes("permission")) {
      steps.push(
        "4. Check file permissions and ensure the file is not read-only"
      );
    }

    if (error.toLowerCase().includes("timeout")) {
      steps.push(
        "4. The file might be too large. Try analyzing a smaller file first"
      );
    }

    steps.push(
      "5. Check the Output panel (View > Output > DoraCodeLens) for detailed error information"
    );

    return steps;
  }

  /**
   * Handle show error details command
   */
  private async handleShowErrorDetails(
    errorMessage: string,
    troubleshootingSteps: string[],
    context: any
  ): Promise<void> {
    try {
      const { GuidanceErrorHandler } = await import(
        "../core/guidance-error-handler"
      );
      const errorHandler = GuidanceErrorHandler.getInstance(this.errorHandler);
      await errorHandler.showErrorDetails(
        errorMessage,
        troubleshootingSteps,
        context
      );
    } catch (error) {
      this.errorHandler.logError(
        "Error showing error details",
        error,
        "GuidanceCommandHandler"
      );
      vscode.window.showErrorMessage("Failed to show error details.");
    }
  }

  /**
   * Handle auto-run analysis when code lens is enabled
   */
  public async handleAutoRunAnalysis(): Promise<void> {
    try {
      const preferences = this.guidanceManager.getPreferences();

      if (!preferences.autoRunAnalysisOnEnable) {
        return;
      }

      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor || activeEditor.document.languageId !== "python") {
        return;
      }

      this.errorHandler.logError(
        "Auto-running analysis based on user preferences",
        { preferredType: preferences.preferredAnalysisType },
        "GuidanceCommandHandler"
      );

      // Run analysis based on preferred type
      if (preferences.preferredAnalysisType === "full-project") {
        await this.handleAnalyzeFullProject();
      } else if (preferences.preferredAnalysisType === "current-file") {
        await this.handleAnalyzeCurrentFile();
      } else {
        // For 'ask-each-time', show a quick pick
        const choice = await vscode.window.showQuickPick(
          [
            { label: "Analyze Current File", value: "current-file" },
            { label: "Analyze Full Project", value: "full-project" },
          ],
          {
            placeHolder: "Choose analysis type to run automatically",
          }
        );

        if (choice) {
          if (choice.value === "current-file") {
            await this.handleAnalyzeCurrentFile();
          } else {
            await this.handleAnalyzeFullProject();
          }
        }
      }
    } catch (error) {
      this.errorHandler.logError(
        "Error in auto-run analysis",
        error,
        "GuidanceCommandHandler"
      );
      // Don't show error to user for auto-run failures
    }
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.disposables.forEach((disposable) => disposable.dispose());
    this.disposables = [];

    this.errorHandler.logError(
      "GuidanceCommandHandler disposed",
      null,
      "GuidanceCommandHandler"
    );
  }
}
