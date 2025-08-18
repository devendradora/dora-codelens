import * as vscode from "vscode";
import { AnalyzerRunner } from "../analyzer-runner";
import { SidebarProvider } from "../sidebar-provider";
import { ComplexityCodeLensProvider } from "../codelens-provider";
// WebviewProvider removed - using TabbedWebviewProvider instead
import { JsonUtilities } from "../json-utilities";
import { ConfigurationManager } from "./configuration-manager";
import { AnalysisManager } from "./analysis-manager";
import { WorkspaceService } from "../services/workspace-service";
import { UIManager } from "./ui-manager";
import { CommandManager } from "./command-manager";
import { GitService } from "../services/git-service";

/**
 * Extension Manager serves as the main orchestrator for the DoraCodeBirdView extension
 * It initializes and manages all core services and managers
 */
export class ExtensionManager {
  private static instance: ExtensionManager | undefined;

  // Core services
  private analyzerRunner!: AnalyzerRunner;
  private sidebarProvider!: SidebarProvider;
  private codeLensProvider!: ComplexityCodeLensProvider;
  // webviewProvider removed - using tabbedWebviewProvider instead
  private jsonUtilities!: JsonUtilities;

  // Managers and services
  private configurationManager!: ConfigurationManager;
  private analysisManager!: AnalysisManager;
  private workspaceService!: WorkspaceService;
  private uiManager!: UIManager;
  private commandManager!: CommandManager;
  private gitService!: GitService;

  // State
  private isInitialized: boolean = false;

  constructor(
    private context: vscode.ExtensionContext,
    private outputChannel: vscode.OutputChannel,
    private tabbedWebviewProvider?: any // TabbedWebviewProvider
  ) {
    ExtensionManager.instance = this;
    this.initializeServices();
  }

  /**
   * Get the singleton instance of ExtensionManager
   */
  public static getInstance(): ExtensionManager | undefined {
    return ExtensionManager.instance;
  }

  /**
   * Initialize all services and providers
   */
  /**
   * Analyze the database schema of the current project
   */
  public async analyzeDBSchema() {
    return await this.analysisManager.analyzeDatabaseSchema();
  }

  private initializeServices() {
    this.log("Initializing extension services...");

    // Initialize core services (output channel already initialized in constructor)
    this.analyzerRunner = new AnalyzerRunner(
      this.outputChannel,
      this.context.extensionPath
    );
    this.sidebarProvider = new SidebarProvider(this.context);
    this.codeLensProvider = new ComplexityCodeLensProvider(this.outputChannel);
    // webviewProvider removed - using tabbedWebviewProvider passed in constructor
    this.jsonUtilities = new JsonUtilities(this.outputChannel);

    // Initialize configuration manager first
    this.configurationManager = new ConfigurationManager();

    // Initialize UI manager
    this.uiManager = new UIManager(
      this.context,
      this.outputChannel,
      this.sidebarProvider,
      this.codeLensProvider,
      this.tabbedWebviewProvider,
      this.jsonUtilities
    );

    // Initialize analysis manager
    this.analysisManager = new AnalysisManager(
      this.analyzerRunner,
      this.configurationManager,
      this.outputChannel,
      this.uiManager.getStatusBarItem()
    );

    // Initialize workspace service
    this.workspaceService = new WorkspaceService(
      this.configurationManager,
      this.outputChannel,
      this.uiManager.getStatusBarItem(),
      this.context
    );

    // Initialize git service
    this.gitService = new GitService(
      this.outputChannel,
      this.configurationManager,
      this.context
    );

    // Initialize command manager (depends on other managers)
    this.commandManager = new CommandManager(
      this.context,
      this.analysisManager,
      this.uiManager,
      this.configurationManager,
      this.outputChannel,
      this.gitService
    );

    this.log("All services initialized successfully");
  }

  /**
   * Initialize the extension and register all components
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.log("Extension already initialized");
      return;
    }

    try {
      this.log("DoraCodeBirdView extension is initializing...");

      // Initialize workspace service first
      await this.workspaceService.initialize();

      // Register tree data provider
      this.registerTreeDataProvider();

      // Register CodeLens provider
      this.registerCodeLensProvider();

      // Register all commands
      this.commandManager.registerAllCommands();

      // Check git installation for git analytics features
      await this.checkGitAvailability();

      this.isInitialized = true;
      this.log("DoraCodeBirdView extension initialized successfully");
    } catch (error) {
      this.logError("Failed to initialize extension", error);
      throw error;
    }
  }

  /**
   * Register the tree data provider for the sidebar
   */
  private registerTreeDataProvider(): void {
    const treeView = vscode.window.createTreeView("doracodebirdSidebar", {
      treeDataProvider: this.sidebarProvider,
      showCollapseAll: true,
    });

    // Add tree view to subscriptions for cleanup
    this.context.subscriptions.push(treeView);

    this.log("Sidebar tree data provider registered");
  }

  /**
   * Register the CodeLens provider for complexity annotations
   */
  private registerCodeLensProvider(): void {
    const codeLensProvider = vscode.languages.registerCodeLensProvider(
      { language: "python" },
      this.codeLensProvider
    );

    // Add to subscriptions for cleanup
    this.context.subscriptions.push(codeLensProvider);

    this.log("CodeLens provider registered for Python files");
  }

  /**
   * Check git availability for git analytics features
   */
  private async checkGitAvailability(): Promise<void> {
    try {
      const isGitAvailable = await this.gitService.checkGitInstallation();
      if (isGitAvailable) {
        this.log("Git is available - Git analytics features enabled");
      } else {
        this.log(
          "Git is not available - Git analytics features will show installation prompts"
        );
      }
    } catch (error) {
      this.log(
        "Git availability check failed - Git analytics features may not work properly"
      );
    }
  }

  /**
   * Get the configuration manager instance
   */
  public getConfigurationManager(): ConfigurationManager {
    return this.configurationManager;
  }

  /**
   * Get the analysis manager instance
   */
  public getAnalysisManager(): AnalysisManager {
    return this.analysisManager;
  }

  /**
   * Get the UI manager instance
   */
  public getUIManager(): UIManager {
    return this.uiManager;
  }

  /**
   * Get the workspace service instance
   */
  public getWorkspaceService(): WorkspaceService {
    return this.workspaceService;
  }

  /**
   * Get the git service instance
   */
  public getGitService(): GitService {
    return this.gitService;
  }

  /**
   * Get the command manager instance
   */
  public getCommandManager(): CommandManager {
    return this.commandManager;
  }

  /**
   * Get the output channel instance
   */
  public getOutputChannel(): vscode.OutputChannel {
    return this.outputChannel;
  }

  /**
   * Check if extension is initialized
   */
  public isExtensionInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Update UI components with analysis data
   */
  public updateUIComponents(result: any): void {
    // Delegate to UI Manager
    this.uiManager.updateUIComponents(result);

    // Update workspace service analysis time
    this.workspaceService.updateAnalysisTime();
  }

  /**
   * Handle extension errors
   */
  public handleExtensionError(error: Error, context: string): void {
    this.logError(`Extension error in ${context}`, error);

    // Show user-friendly error message
    vscode.window
      .showErrorMessage(
        `DoraCodeBirdView: ${context} failed. Check output for details.`,
        "View Output",
        "Report Issue"
      )
      .then((action) => {
        if (action === "View Output") {
          this.outputChannel.show();
        } else if (action === "Report Issue") {
          vscode.env.openExternal(
            vscode.Uri.parse("https://github.com/your-repo/issues")
          );
        }
      });
  }

  /**
   * Dispose of all extension resources
   */
  public dispose(): void {
    try {
      this.log("Disposing DoraCodeBirdView extension...");

      // Dispose managers and services in reverse order of initialization
      if (this.commandManager) {
        this.commandManager.dispose();
      }

      if (this.gitService) {
        this.gitService.dispose();
      }

      if (this.workspaceService) {
        this.workspaceService.dispose();
      }

      if (this.uiManager) {
        this.uiManager.dispose();
      }

      // Dispose output channel last
      if (this.outputChannel) {
        this.outputChannel.dispose();
      }

      // Clear singleton instance
      ExtensionManager.instance = undefined;
      this.isInitialized = false;

      this.log("DoraCodeBirdView extension disposed successfully");
    } catch (error) {
      console.error("Error disposing DoraCodeBirdView extension:", error);
    }
  }

  /**
   * Log a message to the output channel
   */
  private log(message: string): void {
    this.outputChannel.appendLine(`[ExtensionManager] ${message}`);
  }

  /**
   * Log an error to the output channel
   */
  private logError(message: string, error: any): void {
    this.outputChannel.appendLine(`[ExtensionManager] ERROR: ${message}`);
    if (error instanceof Error) {
      this.outputChannel.appendLine(`[ExtensionManager] ${error.message}`);
      if (error.stack) {
        this.outputChannel.appendLine(`[ExtensionManager] ${error.stack}`);
      }
    } else {
      this.outputChannel.appendLine(`[ExtensionManager] ${String(error)}`);
    }
  }
}
