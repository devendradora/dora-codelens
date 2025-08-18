import * as vscode from "vscode";
import { DoraCodeBirdTreeItem } from "../sidebar-provider";
import { FunctionComplexityData } from "../codelens-provider";
import { CommandContext, CommandResult } from "../types/extension-types";
import { GitService, GitAnalysisResult } from "../services/git-service";

/**
 * Command definition interface
 */
export interface CommandDefinition {
  name: string;
  handler: (...args: any[]) => any;
  description: string;
  category: CommandCategory;
}

/**
 * Command categories for organization
 */
export enum CommandCategory {
  Analysis = "analysis",
  UI = "ui",
  Git = "git",
  JSON = "json",
  Configuration = "configuration",
  Sidebar = "sidebar",
  Context = "context",
}

/**
 * Command Manager class responsible for registering and handling all extension commands
 */
export class CommandManager {
  private commands: Map<string, CommandDefinition> = new Map();
  private registeredCommands: vscode.Disposable[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    private analysisManager: any, // IAnalysisManager
    private uiManager: any, // UIManager
    private configurationManager: any, // IConfigurationManager
    private outputChannel: vscode.OutputChannel,
    private gitService: GitService
  ) {}

  /**
   * Register all extension commands
   */
  public registerAllCommands(): void {
    this.defineCommands();
    this.registerCommands();
    this.log("All commands registered successfully");
  }

  /**
   * Define all command handlers organized by category
   */
  private defineCommands(): void {
    // Full code analysis command
    this.addCommand({
      name: "doracodebird.fullCodeAnalysis",
      handler: () => this.handleFullCodeAnalysis(),
      description: "Full Code Analysis (Tech Stack, Code Graph, Code JSON)",
      category: CommandCategory.Analysis,
    });

    // Current file analysis command
    this.addCommand({
      name: "doracodebird.currentFileAnalysis",
      handler: () => this.handleCurrentFileAnalysis(),
      description: "Current File Analysis (Code Graph, Code JSON)",
      category: CommandCategory.Analysis,
    });

    // Call hierarchy command
    this.addCommand({
      name: "doracodebird.callHierarchy",
      handler: () => this.handleCallHierarchy(),
      description: "Call Hierarchy Analysis (Code Graph, Code JSON)",
      category: CommandCategory.Analysis,
    });

    // Database Schema command
    this.addCommand({
      name: "doracodebird.dbSchema",
      handler: () => this.handleShowDBSchema(),
      description: "Database Schema (ER Diagram, Raw SQL)",
      category: CommandCategory.Analysis,
    });

    // Git Analytics command
    this.addCommand({
      name: "doracodebird.gitAnalytics",
      handler: () => this.handleGitAnalytics(),
      description:
        "Git Analytics (Author Stats, Module Contributions, Timeline)",
      category: CommandCategory.Git,
    });

    // JSON Utilities commands
    this.addCommand({
      name: "doracodebird.jsonFormat",
      handler: () => this.handleJsonFormat(),
      description: "Format JSON in current editor",
      category: CommandCategory.JSON,
    });

    this.addCommand({
      name: "doracodebird.jsonTreeView",
      handler: () => this.handleJsonTreeView(),
      description: "Show JSON Tree View",
      category: CommandCategory.JSON,
    });

    // Tech Stack command
    this.addCommand({
      name: "doracodebird.techStackGraph",
      handler: () => this.handleTechStackGraph(),
      description: "Show Tech Stack Graph",
      category: CommandCategory.Analysis,
    });

    // Support commands
    this.addCommand({
      name: "doracodebird.clearCache",
      handler: () => this.handleClearCache(),
      description: "Clear analysis cache",
      category: CommandCategory.Configuration,
    });

    this.addCommand({
      name: "doracodebird.refreshSidebar",
      handler: () => this.handleRefreshSidebar(),
      description: "Refresh sidebar view",
      category: CommandCategory.Configuration,
    });
  }

  private addCommand(command: CommandDefinition): void {
    this.commands.set(command.name, command);
  }

  private registerCommands(): void {
    this.commands.forEach((command, id) => {
      const disposable = vscode.commands.registerCommand(id, command.handler);
      this.registeredCommands.push(disposable);
      this.context.subscriptions.push(disposable);
    });
  }

  // Command Handlers

  private async handleFullCodeAnalysis(): Promise<void> {
    try {
      this.log("Starting full code analysis...");
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Analyzing project...",
          cancellable: true,
        },
        async () => {
          return await this.analysisManager.analyzeProject();
        }
      );

      if (result.success && result.data) {
        await this.uiManager.showFullCodeAnalysis(result);
      } else {
        vscode.window.showWarningMessage("No analysis results available");
      }
    } catch (error) {
      this.logError("Full code analysis failed", error);
      vscode.window.showErrorMessage(
        "Failed to analyze project. Check output for details."
      );
    }
  }

  private async handleCurrentFileAnalysis(): Promise<void> {
    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No active file to analyze");
        return;
      }

      this.log("Starting current file analysis...");
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Analyzing current file...",
          cancellable: true,
        },
        async () => {
          return await this.analysisManager.runCurrentFileAnalysis(
            editor.document.uri.fsPath
          );
        }
      );

      if (result.success && result.data) {
        await this.uiManager.showCurrentFileAnalysis(result.data);
      } else {
        vscode.window.showWarningMessage(
          "No analysis results available for current file"
        );
      }
    } catch (error) {
      this.logError("Current file analysis failed", error);
      vscode.window.showErrorMessage(
        "Failed to analyze current file. Check output for details."
      );
    }
  }

  private async handleCallHierarchy(): Promise<void> {
    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No active file for call hierarchy");
        return;
      }

      this.log("Analyzing call hierarchy...");
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Generating call hierarchy...",
          cancellable: true,
        },
        async () => {
          return await this.analysisManager.analyzeCallHierarchy(
            editor.document.uri
          );
        }
      );

      if (result.success && result.data) {
        this.uiManager.showCallHierarchy(result.data);
      } else {
        vscode.window.showWarningMessage(
          "No call hierarchy available for current file"
        );
      }
    } catch (error) {
      this.logError("Call hierarchy analysis failed", error);
      vscode.window.showErrorMessage(
        "Failed to generate call hierarchy. Check output for details."
      );
    }
  }

  private async handleShowDBSchema(): Promise<void> {
    try {
      this.log("Showing database schema visualization...");
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Analyzing database schema...",
          cancellable: true,
        },
        async () => {
          return await this.analysisManager.analyzeDatabaseSchema();
        }
      );

      if (result.success && result.data) {
        const viewOptions = ["ER Diagram", "Raw SQL"];
        const choice = await vscode.window.showQuickPick(viewOptions, {
          placeHolder: "Select schema view",
        });

        if (choice) {
          if (choice === "ER Diagram") {
            this.uiManager.showDatabaseSchemaGraphView(result.data);
          } else {
            this.uiManager.showDatabaseSchemaRawSQL(result.data);
          }
        }
      } else {
        vscode.window.showWarningMessage(
          "No database schema found in the current project"
        );
      }
    } catch (error) {
      this.logError("Database schema analysis failed", error);
      vscode.window.showErrorMessage(
        "Failed to analyze database schema. Check output for details."
      );
    }
  }

  private async handleGitAnalytics(): Promise<void> {
    try {
      const options = [
        "Author Statistics",
        "Module Contributions",
        "Commit Timeline",
      ];
      const choice = await vscode.window.showQuickPick(options, {
        placeHolder: "Select Git analytics view",
      });

      if (!choice) {return;}

      let result;
      switch (choice) {
        case "Author Statistics":
          result = await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: "Analyzing Git author statistics...",
              cancellable: true,
            },
            () => this.gitService.runGitAuthorStatistics()
          );

          if (
            result &&
            (result as GitAnalysisResult).success &&
            ((result as any).data || (result as any).contributors)
          ) {
            await this.uiManager.showGitAnalytics({
              data: (result as any).data,
              contributors: (result as any).contributors,
            });
          }
          break;

        case "Module Contributions":
          result = await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: "Analyzing Git module contributions...",
              cancellable: true,
            },
            () => this.gitService.runGitModuleContributions()
          );

          if (
            result &&
            (result as any).success &&
            ((result as any).data || (result as any).fileChanges)
          ) {
            this.uiManager.showGitModuleContributions({
              data: (result as any).data,
              fileChanges: (result as any).fileChanges,
            });
          }
          break;

        case "Commit Timeline":
          result = await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: "Analyzing Git commit timeline...",
              cancellable: true,
            },
            () => this.gitService.runGitCommitTimeline()
          );

          if (
            result &&
            (result as any).success &&
            ((result as any).data || (result as any).commits)
          ) {
            this.uiManager.showGitCommitTimeline({
              data: (result as any).data,
              commits: (result as any).commits,
            });
          }
          break;
      }

      if (
        !result ||
        (!(result as GitAnalysisResult).success &&
          !(result as GitAnalysisResult).data)
      ) {
        vscode.window.showWarningMessage(
          "No Git data available for the selected view"
        );
      }
    } catch (error) {
      this.logError("Git analytics failed", error);
      vscode.window.showErrorMessage(
        "Failed to analyze Git data. Check output for details."
      );
    }
  }

  private async handleJsonFormat(): Promise<void> {
    await this.uiManager.formatJsonInEditor();
  }

  private async handleJsonTreeView(): Promise<void> {
    await this.uiManager.showJsonTreeView();
  }

  private async handleClearCache(): Promise<void> {
    await this.uiManager.clearCache();
  }

  private handleRefreshSidebar(): void {
    this.uiManager.refreshSidebar();
  }

  private async handleTechStackGraph(): Promise<void> {
    try {
      this.log("Showing tech stack graph...");

      // Run analysis to get tech stack data
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Analyzing tech stack...",
          cancellable: true,
        },
        async () => {
          return await this.analysisManager.analyzeProject();
        }
      );

      if (
        result &&
        result.success &&
        result.data &&
        result.data.tech_stack
      ) {
        this.uiManager.showTechStackGraph(result.data);
      } else {
        vscode.window.showWarningMessage(
          "No tech stack data available. Please run a full analysis first."
        );
      }
    } catch (error) {
      this.logError("Tech stack graph failed", error);
      vscode.window.showErrorMessage(
        "Failed to show tech stack graph. Check output for details."
      );
    }
  }

  // Utility methods

  private log(message: string): void {
    this.outputChannel.appendLine(`[CommandManager] ${message}`);
  }

  private logError(message: string, error: any): void {
    this.outputChannel.appendLine(
      `[CommandManager ERROR] ${message}: ${error?.message || error}`
    );
    if (error?.stack) {
      this.outputChannel.appendLine(error.stack);
    }
  }

  /**
   * Dispose of all registered commands
   */
  public dispose(): void {
    this.registeredCommands.forEach((disposable) => {
      disposable.dispose();
    });
    this.registeredCommands = [];
    this.commands.clear();
  }
}
