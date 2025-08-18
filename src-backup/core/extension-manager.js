"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionManager = void 0;
const vscode = __importStar(require("vscode"));
const analyzer_runner_1 = require("../analyzer-runner");
const sidebar_provider_1 = require("../sidebar-provider");
const codelens_provider_1 = require("../codelens-provider");
// WebviewProvider removed - using TabbedWebviewProvider instead
const json_utilities_1 = require("../json-utilities");
const configuration_manager_1 = require("./configuration-manager");
const analysis_manager_1 = require("./analysis-manager");
const workspace_service_1 = require("../services/workspace-service");
const ui_manager_1 = require("./ui-manager");
const command_manager_1 = require("./command-manager");
const git_service_1 = require("../services/git-service");
/**
 * Extension Manager serves as the main orchestrator for the DoraCodeBirdView extension
 * It initializes and manages all core services and managers
 */
class ExtensionManager {
    constructor(context, outputChannel, tabbedWebviewProvider // TabbedWebviewProvider
    ) {
        this.context = context;
        this.outputChannel = outputChannel;
        this.tabbedWebviewProvider = tabbedWebviewProvider;
        // State
        this.isInitialized = false;
        ExtensionManager.instance = this;
        this.initializeServices();
    }
    /**
     * Get the singleton instance of ExtensionManager
     */
    static getInstance() {
        return ExtensionManager.instance;
    }
    /**
     * Initialize all services and providers
     */
    /**
     * Analyze the database schema of the current project
     */
    async analyzeDBSchema() {
        return await this.analysisManager.analyzeDatabaseSchema();
    }
    initializeServices() {
        this.log("Initializing extension services...");
        // Initialize core services (output channel already initialized in constructor)
        this.analyzerRunner = new analyzer_runner_1.AnalyzerRunner(this.outputChannel, this.context.extensionPath);
        this.sidebarProvider = new sidebar_provider_1.SidebarProvider(this.context);
        this.codeLensProvider = new codelens_provider_1.ComplexityCodeLensProvider(this.outputChannel);
        // webviewProvider removed - using tabbedWebviewProvider passed in constructor
        this.jsonUtilities = new json_utilities_1.JsonUtilities(this.outputChannel);
        // Initialize configuration manager first
        this.configurationManager = new configuration_manager_1.ConfigurationManager();
        // Initialize UI manager
        this.uiManager = new ui_manager_1.UIManager(this.context, this.outputChannel, this.sidebarProvider, this.codeLensProvider, this.tabbedWebviewProvider, this.jsonUtilities);
        // Initialize analysis manager
        this.analysisManager = new analysis_manager_1.AnalysisManager(this.analyzerRunner, this.configurationManager, this.outputChannel, this.uiManager.getStatusBarItem());
        // Initialize workspace service
        this.workspaceService = new workspace_service_1.WorkspaceService(this.configurationManager, this.outputChannel, this.uiManager.getStatusBarItem(), this.context);
        // Initialize git service
        this.gitService = new git_service_1.GitService(this.outputChannel, this.configurationManager, this.context);
        // Initialize command manager (depends on other managers)
        this.commandManager = new command_manager_1.CommandManager(this.context, this.analysisManager, this.uiManager, this.configurationManager, this.outputChannel, this.gitService);
        this.log("All services initialized successfully");
    }
    /**
     * Initialize the extension and register all components
     */
    async initialize() {
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
        }
        catch (error) {
            this.logError("Failed to initialize extension", error);
            throw error;
        }
    }
    /**
     * Register the tree data provider for the sidebar
     */
    registerTreeDataProvider() {
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
    registerCodeLensProvider() {
        const codeLensProvider = vscode.languages.registerCodeLensProvider({ language: "python" }, this.codeLensProvider);
        // Add to subscriptions for cleanup
        this.context.subscriptions.push(codeLensProvider);
        this.log("CodeLens provider registered for Python files");
    }
    /**
     * Check git availability for git analytics features
     */
    async checkGitAvailability() {
        try {
            const isGitAvailable = await this.gitService.checkGitInstallation();
            if (isGitAvailable) {
                this.log("Git is available - Git analytics features enabled");
            }
            else {
                this.log("Git is not available - Git analytics features will show installation prompts");
            }
        }
        catch (error) {
            this.log("Git availability check failed - Git analytics features may not work properly");
        }
    }
    /**
     * Get the configuration manager instance
     */
    getConfigurationManager() {
        return this.configurationManager;
    }
    /**
     * Get the analysis manager instance
     */
    getAnalysisManager() {
        return this.analysisManager;
    }
    /**
     * Get the UI manager instance
     */
    getUIManager() {
        return this.uiManager;
    }
    /**
     * Get the workspace service instance
     */
    getWorkspaceService() {
        return this.workspaceService;
    }
    /**
     * Get the git service instance
     */
    getGitService() {
        return this.gitService;
    }
    /**
     * Get the command manager instance
     */
    getCommandManager() {
        return this.commandManager;
    }
    /**
     * Get the output channel instance
     */
    getOutputChannel() {
        return this.outputChannel;
    }
    /**
     * Check if extension is initialized
     */
    isExtensionInitialized() {
        return this.isInitialized;
    }
    /**
     * Update UI components with analysis data
     */
    updateUIComponents(result) {
        // Delegate to UI Manager
        this.uiManager.updateUIComponents(result);
        // Update workspace service analysis time
        this.workspaceService.updateAnalysisTime();
    }
    /**
     * Handle extension errors
     */
    handleExtensionError(error, context) {
        this.logError(`Extension error in ${context}`, error);
        // Show user-friendly error message
        vscode.window
            .showErrorMessage(`DoraCodeBirdView: ${context} failed. Check output for details.`, "View Output", "Report Issue")
            .then((action) => {
            if (action === "View Output") {
                this.outputChannel.show();
            }
            else if (action === "Report Issue") {
                vscode.env.openExternal(vscode.Uri.parse("https://github.com/your-repo/issues"));
            }
        });
    }
    /**
     * Dispose of all extension resources
     */
    dispose() {
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
        }
        catch (error) {
            console.error("Error disposing DoraCodeBirdView extension:", error);
        }
    }
    /**
     * Log a message to the output channel
     */
    log(message) {
        this.outputChannel.appendLine(`[ExtensionManager] ${message}`);
    }
    /**
     * Log an error to the output channel
     */
    logError(message, error) {
        this.outputChannel.appendLine(`[ExtensionManager] ERROR: ${message}`);
        if (error instanceof Error) {
            this.outputChannel.appendLine(`[ExtensionManager] ${error.message}`);
            if (error.stack) {
                this.outputChannel.appendLine(`[ExtensionManager] ${error.stack}`);
            }
        }
        else {
            this.outputChannel.appendLine(`[ExtensionManager] ${String(error)}`);
        }
    }
}
exports.ExtensionManager = ExtensionManager;
//# sourceMappingURL=extension-manager.js.map