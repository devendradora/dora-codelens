import * as vscode from 'vscode';
import { ErrorHandler } from './error-handler';
import { DuplicateCallGuard } from './duplicate-call-guard';
import { AnalysisStateManager } from './analysis-state-manager';
import { FullCodeAnalysisHandler } from '../commands/full-code-analysis-handler';
import { CurrentFileAnalysisHandler } from '../commands/current-file-analysis-handler';
import { GitAnalyticsHandler } from '../commands/git-analytics-handler';
import { DatabaseSchemaHandler } from '../commands/database-schema-handler';
import { JsonUtilitiesHandler } from '../commands/json-utilities-handler';
import { CodeLensHandler } from '../commands/code-lens-handler';
import { WebviewManager } from '../webviews/webview-manager';
import { PythonService } from '../services/python-service';
import { HTMLViewService } from '../services/html-view-service';

/**
 * Consolidated command manager with dedicated handlers and Python integration
 */
export class CommandManager {
  private static instance: CommandManager;
  private context: vscode.ExtensionContext;
  private errorHandler: ErrorHandler;
  private duplicateCallGuard: DuplicateCallGuard;
  private stateManager: AnalysisStateManager;
  private webviewManager: WebviewManager;
  private disposables: vscode.Disposable[] = [];

  // Command handlers
  private fullCodeAnalysisHandler: FullCodeAnalysisHandler;
  private currentFileAnalysisHandler: CurrentFileAnalysisHandler;
  private gitAnalyticsHandler: GitAnalyticsHandler;
  private databaseSchemaHandler: DatabaseSchemaHandler;
  private jsonUtilitiesHandler: JsonUtilitiesHandler;
  private codeLensHandler: CodeLensHandler;

  // Services
  private pythonService: PythonService;
  private htmlViewService: HTMLViewService;

  private constructor(
    context: vscode.ExtensionContext,
    errorHandler: ErrorHandler,
    duplicateCallGuard: DuplicateCallGuard,
    stateManager: AnalysisStateManager,
    webviewManager: WebviewManager
  ) {
    this.context = context;
    this.errorHandler = errorHandler;
    this.duplicateCallGuard = duplicateCallGuard;
    this.stateManager = stateManager;
    this.webviewManager = webviewManager;

    // Initialize services
    this.pythonService = PythonService.getInstance(errorHandler);
    this.htmlViewService = HTMLViewService.getInstance(errorHandler);

    // Initialize command handlers with WebviewManager
    this.fullCodeAnalysisHandler = new FullCodeAnalysisHandler(
      errorHandler,
      duplicateCallGuard,
      stateManager,
      webviewManager
    );
    this.currentFileAnalysisHandler = new CurrentFileAnalysisHandler(
      errorHandler,
      duplicateCallGuard,
      stateManager,
      webviewManager
    );
    this.gitAnalyticsHandler = new GitAnalyticsHandler(
      errorHandler,
      duplicateCallGuard,
      stateManager,
      webviewManager
    );
    this.databaseSchemaHandler = new DatabaseSchemaHandler(
      errorHandler,
      duplicateCallGuard,
      stateManager,
      webviewManager
    );
    this.jsonUtilitiesHandler = new JsonUtilitiesHandler(errorHandler);
    this.codeLensHandler = new CodeLensHandler(errorHandler, context);
  }

  public static getInstance(
    context?: vscode.ExtensionContext,
    errorHandler?: ErrorHandler,
    duplicateCallGuard?: DuplicateCallGuard,
    stateManager?: AnalysisStateManager,
    webviewManager?: WebviewManager
  ): CommandManager {
    if (!CommandManager.instance) {
      if (!context || !errorHandler || !duplicateCallGuard || !stateManager || !webviewManager) {
        throw new Error('All parameters required for first initialization');
      }
      CommandManager.instance = new CommandManager(context, errorHandler, duplicateCallGuard, stateManager, webviewManager);
    }
    return CommandManager.instance;
  }

  /**
   * Registers all extension commands
   */
  public registerAllCommands(): void {
    try {
      this.errorHandler.logError('Registering all commands', null, 'registerAllCommands');

      // Register full code analysis command
      const fullCodeAnalysisCommand = vscode.commands.registerCommand(
        'doracodebirdview.analyzeFullCode',
        () => this.handleFullCodeAnalysis()
      );

      // Register current file analysis command
      const currentFileAnalysisCommand = vscode.commands.registerCommand(
        'doracodebirdview.analyzeCurrentFile',
        () => this.handleCurrentFileAnalysis()
      );

      // Register git analytics command
      const gitAnalyticsCommand = vscode.commands.registerCommand(
        'doracodebirdview.analyzeGitAnalytics',
        () => this.handleGitAnalytics()
      );

      // Register database schema analysis command
      const databaseSchemaCommand = vscode.commands.registerCommand(
        'doracodebirdview.analyzeDatabaseSchema',
        () => this.handleDatabaseSchemaAnalysis()
      );

      // Register HTML view command
      const renderHTMLCommand = vscode.commands.registerCommand(
        'doracodebirdview.renderHTMLFile',
        (uri?: vscode.Uri) => this.handleRenderHTMLFile(uri)
      );

      // Register settings command
      const openSettingsCommand = vscode.commands.registerCommand(
        'doracodebirdview.openSettings',
        () => this.handleOpenSettings()
      );

      // Register debug commands
      const debugStateCommand = vscode.commands.registerCommand(
        'doracodebirdview.debugState',
        () => this.handleDebugState()
      );

      const resetStateCommand = vscode.commands.registerCommand(
        'doracodebirdview.resetState',
        () => this.handleResetState()
      );

      // Register JSON utilities commands
      const jsonFormatCommand = vscode.commands.registerCommand(
        'doracodebird.jsonFormat',
        () => this.handleJsonFormat()
      );

      const jsonTreeViewCommand = vscode.commands.registerCommand(
        'doracodebird.jsonTreeView',
        () => this.handleJsonTreeView()
      );

      const jsonFixCommand = vscode.commands.registerCommand(
        'doracodebird.jsonFix',
        () => this.handleJsonFix()
      );

      const jsonMinifyCommand = vscode.commands.registerCommand(
        'doracodebird.jsonMinify',
        () => this.handleJsonMinify()
      );

      // Register code lens commands
      const toggleCodeLensCommand = vscode.commands.registerCommand(
        'doracodebird.toggleCodeLens',
        () => this.handleToggleCodeLens()
      );

      const enableCodeLensCommand = vscode.commands.registerCommand(
        'doracodebird.enableCodeLens',
        () => this.handleEnableCodeLens()
      );

      const disableCodeLensCommand = vscode.commands.registerCommand(
        'doracodebird.disableCodeLens',
        () => this.handleDisableCodeLens()
      );

      // Register code lens detail commands
      const showFunctionDetailsCommand = vscode.commands.registerCommand(
        'doracodebird.showFunctionDetails',
        (func: any, uri: vscode.Uri) => this.handleShowFunctionDetails(func, uri)
      );

      const showClassDetailsCommand = vscode.commands.registerCommand(
        'doracodebird.showClassDetails',
        (cls: any, uri: vscode.Uri) => this.handleShowClassDetails(cls, uri)
      );

      const showMethodDetailsCommand = vscode.commands.registerCommand(
        'doracodebird.showMethodDetails',
        (method: any, cls: any, uri: vscode.Uri) => this.handleShowMethodDetails(method, cls, uri)
      );

      // Register code lens data update command (internal)
      const updateCodeLensDataCommand = vscode.commands.registerCommand(
        'doracodebird.updateCodeLensData',
        (analysisData: any) => this.handleUpdateCodeLensData(analysisData)
      );

      // Register show message command (for testing)
      const showMessageCommand = vscode.commands.registerCommand(
        'doracodebird.showMessage',
        (message: string) => this.handleShowMessage(message)
      );

      // Store disposables
      this.disposables.push(
        fullCodeAnalysisCommand,
        currentFileAnalysisCommand,
        gitAnalyticsCommand,
        databaseSchemaCommand,
        renderHTMLCommand,
        openSettingsCommand,
        debugStateCommand,
        resetStateCommand,
        jsonFormatCommand,
        jsonTreeViewCommand,
        jsonFixCommand,
        jsonMinifyCommand,
        toggleCodeLensCommand,
        enableCodeLensCommand,
        disableCodeLensCommand,
        showFunctionDetailsCommand,
        showClassDetailsCommand,
        showMethodDetailsCommand,
        updateCodeLensDataCommand,
        showMessageCommand
      );

      // Add to context subscriptions
      this.context.subscriptions.push(...this.disposables);

      this.errorHandler.logError('All commands registered successfully', null, 'registerAllCommands');

    } catch (error) {
      this.errorHandler.logError('Failed to register commands', error, 'registerAllCommands');
      this.errorHandler.showUserError('Failed to register extension commands. Please reload the window.');
    }
  }

  /**
   * Handles full code analysis command
   */
  public async handleFullCodeAnalysis(): Promise<void> {
    try {
      // Execute analysis - the handler will display results via WebviewManager
      await this.fullCodeAnalysisHandler.execute();
    } catch (error) {
      this.errorHandler.logError('Full code analysis command failed', error, 'handleFullCodeAnalysis');
      // Error handling is done in the handler
    }
  }

  /**
   * Handles current file analysis command
   */
  public async handleCurrentFileAnalysis(): Promise<void> {
    try {
      // Check if current file is Python
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showWarningMessage('No active file found.');
        return;
      }

      if (activeEditor.document.languageId !== 'python') {
        vscode.window.showWarningMessage('Current file analysis is only available for Python files.');
        return;
      }

      // Execute analysis - the handler will display results via WebviewManager
      await this.currentFileAnalysisHandler.execute();
    } catch (error) {
      this.errorHandler.logError('Current file analysis command failed', error, 'handleCurrentFileAnalysis');
      // Error handling is done in the handler
    }
  }

  /**
   * Handles git analytics command
   */
  public async handleGitAnalytics(): Promise<void> {
    try {
      // Execute analysis - the handler will display results via WebviewManager
      await this.gitAnalyticsHandler.execute();
    } catch (error) {
      this.errorHandler.logError('Git analytics command failed', error, 'handleGitAnalytics');
      // Error handling is done in the handler
    }
  }

  /**
   * Handles database schema analysis command
   */
  public async handleDatabaseSchemaAnalysis(): Promise<void> {
    try {
      // Check if we're in a Python project context
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showWarningMessage('Database schema analysis requires an open workspace.');
        return;
      }

      // Execute analysis - the handler will display results via WebviewManager
      await this.databaseSchemaHandler.execute();
    } catch (error) {
      this.errorHandler.logError('Database schema analysis command failed', error, 'handleDatabaseSchemaAnalysis');
      // Error handling is done in the handler
    }
  }

  /**
   * Handles JSON format command
   */
  public async handleJsonFormat(): Promise<void> {
    try {
      await this.jsonUtilitiesHandler.handleFormatJson();
    } catch (error) {
      this.errorHandler.logError('JSON format command failed', error, 'handleJsonFormat');
      // Error handling is done in the handler
    }
  }

  /**
   * Handles JSON tree view command
   */
  public async handleJsonTreeView(): Promise<void> {
    try {
      await this.jsonUtilitiesHandler.handleJsonTreeView();
    } catch (error) {
      this.errorHandler.logError('JSON tree view command failed', error, 'handleJsonTreeView');
      // Error handling is done in the handler
    }
  }

  /**
   * Handles JSON fix command
   */
  public async handleJsonFix(): Promise<void> {
    try {
      await this.jsonUtilitiesHandler.handleFixJson();
    } catch (error) {
      this.errorHandler.logError('JSON fix command failed', error, 'handleJsonFix');
      // Error handling is done in the handler
    }
  }

  /**
   * Handles JSON minify command
   */
  public async handleJsonMinify(): Promise<void> {
    try {
      await this.jsonUtilitiesHandler.handleMinifyJson();
    } catch (error) {
      this.errorHandler.logError('JSON minify command failed', error, 'handleJsonMinify');
      // Error handling is done in the handler
    }
  }

  /**
   * Handles toggle code lens command
   */
  public async handleToggleCodeLens(): Promise<void> {
    try {
      // Check if current file is Python
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showWarningMessage('No active file found.');
        return;
      }

      if (activeEditor.document.languageId !== 'python') {
        vscode.window.showWarningMessage('Code lens is only available for Python files.');
        return;
      }

      await this.codeLensHandler.handleToggleCodeLens();
    } catch (error) {
      this.errorHandler.logError('Toggle code lens command failed', error, 'handleToggleCodeLens');
      // Error handling is done in the handler
    }
  }

  /**
   * Handles enable code lens command
   */
  public async handleEnableCodeLens(): Promise<void> {
    try {
      // Check if current file is Python
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showWarningMessage('No active file found.');
        return;
      }

      if (activeEditor.document.languageId !== 'python') {
        vscode.window.showWarningMessage('Code lens is only available for Python files.');
        return;
      }

      await this.codeLensHandler.handleEnableCodeLens();
    } catch (error) {
      this.errorHandler.logError('Enable code lens command failed', error, 'handleEnableCodeLens');
      // Error handling is done in the handler
    }
  }

  /**
   * Handles disable code lens command
   */
  public async handleDisableCodeLens(): Promise<void> {
    try {
      // Check if current file is Python
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showWarningMessage('No active file found.');
        return;
      }

      if (activeEditor.document.languageId !== 'python') {
        vscode.window.showWarningMessage('Code lens is only available for Python files.');
        return;
      }

      await this.codeLensHandler.handleDisableCodeLens();
    } catch (error) {
      this.errorHandler.logError('Disable code lens command failed', error, 'handleDisableCodeLens');
      // Error handling is done in the handler
    }
  }

  /**
   * Handles show function details command
   */
  public async handleShowFunctionDetails(func: any, uri: vscode.Uri): Promise<void> {
    try {
      await this.codeLensHandler.handleShowFunctionDetails(func, uri);
    } catch (error) {
      this.errorHandler.logError('Show function details command failed', error, 'handleShowFunctionDetails');
      // Error handling is done in the handler
    }
  }

  /**
   * Handles show class details command
   */
  public async handleShowClassDetails(cls: any, uri: vscode.Uri): Promise<void> {
    try {
      await this.codeLensHandler.handleShowClassDetails(cls, uri);
    } catch (error) {
      this.errorHandler.logError('Show class details command failed', error, 'handleShowClassDetails');
      // Error handling is done in the handler
    }
  }

  /**
   * Handles show method details command
   */
  public async handleShowMethodDetails(method: any, cls: any, uri: vscode.Uri): Promise<void> {
    try {
      await this.codeLensHandler.handleShowMethodDetails(method, cls, uri);
    } catch (error) {
      this.errorHandler.logError('Show method details command failed', error, 'handleShowMethodDetails');
      // Error handling is done in the handler
    }
  }

  /**
   * Handles update code lens data command (internal)
   */
  public async handleUpdateCodeLensData(analysisData: any): Promise<void> {
    try {
      this.codeLensHandler.updateFromAnalysisData(analysisData);
      this.errorHandler.logError('Code lens data updated successfully', null, 'handleUpdateCodeLensData');
    } catch (error) {
      this.errorHandler.logError('Update code lens data command failed', error, 'handleUpdateCodeLensData');
    }
  }

  /**
   * Handles show message command (for testing)
   */
  public async handleShowMessage(message: string): Promise<void> {
    vscode.window.showInformationMessage(message);
  }

  /**
   * Handles rendering HTML file command
   */
  public async handleRenderHTMLFile(uri?: vscode.Uri): Promise<void> {
    try {
      let htmlFilePath: string;

      if (uri) {
        htmlFilePath = uri.fsPath;
      } else {
        // Get current active file
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
          vscode.window.showErrorMessage('No active file found.');
          return;
        }
        htmlFilePath = activeEditor.document.uri.fsPath;
      }

      // Check if it's an HTML file
      if (!htmlFilePath.toLowerCase().endsWith('.html') && !htmlFilePath.toLowerCase().endsWith('.htm')) {
        vscode.window.showErrorMessage('Selected file is not an HTML file.');
        return;
      }

      // Render HTML file
      await this.htmlViewService.renderHTMLFile(htmlFilePath, {
        title: `HTML View - ${require('path').basename(htmlFilePath)}`,
        enableScripts: true,
        retainContextWhenHidden: true
      });

    } catch (error) {
      this.errorHandler.logError('Failed to render HTML file', error, 'handleRenderHTMLFile');
      this.errorHandler.showUserError('Failed to render HTML file. Check the output for details.');
    }
  }

  /**
   * Handles open settings command
   */
  public async handleOpenSettings(): Promise<void> {
    try {
      // Open VS Code settings focused on DoraCodeBirdView settings
      await vscode.commands.executeCommand('workbench.action.openSettings', 'doracodebirdview');
      
      this.errorHandler.logError('Settings opened successfully', null, 'handleOpenSettings');
    } catch (error) {
      this.errorHandler.logError('Failed to open settings', error, 'handleOpenSettings');
      this.errorHandler.showUserError('Failed to open settings. Please try opening VS Code settings manually.');
    }
  }

  /**
   * Handles debug state command
   */
  public async handleDebugState(): Promise<void> {
    try {
      const state = this.stateManager.getState();
      const summary = this.stateManager.getStateSummary();
      const activeCommands = this.duplicateCallGuard.getActiveCommands();
      
      const debugInfo = {
        summary,
        state,
        activeCommands,
        isValid: this.stateManager.validateState()
      };
      
      this.errorHandler.logError('Debug state requested', debugInfo, 'handleDebugState');
      
      vscode.window.showInformationMessage(
        `State: ${summary}. Check output for details.`
      );
      
    } catch (error) {
      this.errorHandler.logError('Error getting debug state', error, 'handleDebugState');
    }
  }

  /**
   * Handles reset state command
   */
  public async handleResetState(): Promise<void> {
    try {
      this.errorHandler.logError('Resetting extension state', null, 'handleResetState');
      
      this.duplicateCallGuard.clearAllActiveCommands();
      this.stateManager.resetState();
      
      vscode.window.showInformationMessage('Extension state has been reset.');
      
    } catch (error) {
      this.errorHandler.logError('Error resetting state', error, 'handleResetState');
      this.errorHandler.showUserError('Failed to reset state. Check the output for details.');
    }
  }

  /**
   * Initialize code lens state on startup
   */
  public initializeCodeLens(): void {
    try {
      this.codeLensHandler.restoreState();
      this.errorHandler.logError('Code lens state initialized', null, 'initializeCodeLens');
    } catch (error) {
      this.errorHandler.logError('Failed to initialize code lens state', error, 'initializeCodeLens');
    }
  }

  /**
   * Update analysis data for code lens
   */
  public updateCodeLensAnalysisData(analysisData: any): void {
    try {
      this.codeLensHandler.updateFromAnalysisData(analysisData);
      this.errorHandler.logError('Code lens analysis data updated', null, 'updateCodeLensAnalysisData');
    } catch (error) {
      this.errorHandler.logError('Failed to update code lens analysis data', error, 'updateCodeLensAnalysisData');
    }
  }

  /**
   * Validate Python dependencies on startup
   */
  public async validateDependencies(): Promise<boolean> {
    try {
      // Check Python availability
      const pythonAvailable = await this.pythonService.checkPythonAvailability();
      if (!pythonAvailable) {
        this.errorHandler.showUserError(
          'Python 3 is required but not found. Please install Python 3 and ensure it\'s in your PATH.',
          ['Install Python', 'Ignore']
        );
        return false;
      }

      // Validate analyzer dependencies
      const { valid, missing } = await this.pythonService.validateAnalyzerDependencies();
      if (!valid) {
        this.errorHandler.showUserError(
          `Missing analyzer dependencies: ${missing.join(', ')}. Please reinstall the extension.`,
          ['Reinstall Extension', 'Ignore']
        );
        return false;
      }

      this.errorHandler.logError('All dependencies validated successfully', null, 'validateDependencies');
      return true;
    } catch (error) {
      this.errorHandler.logError('Dependency validation failed', error, 'validateDependencies');
      return false;
    }
  }

  /**
   * Get command handler instances for external access
   */
  public getHandlers() {
    return {
      fullCodeAnalysis: this.fullCodeAnalysisHandler,
      currentFileAnalysis: this.currentFileAnalysisHandler,
      gitAnalytics: this.gitAnalyticsHandler,
      databaseSchema: this.databaseSchemaHandler,
      jsonUtilities: this.jsonUtilitiesHandler,
      codeLens: this.codeLensHandler
    };
  }

  /**
   * Get service instances for external access
   */
  public getServices() {
    return {
      python: this.pythonService,
      htmlView: this.htmlViewService
    };
  }

  /**
   * Checks if a command is currently active
   */
  public isCommandActive(commandId: string): boolean {
    return this.duplicateCallGuard.getActiveCommands().includes(commandId);
  }

  /**
   * Gets current state summary
   */
  public getStateSummary(): string {
    return this.stateManager.getStateSummary();
  }

  /**
   * Disposes of all resources
   */
  public dispose(): void {
    try {
      this.errorHandler.logError('Disposing command manager', null, 'dispose');
      
      // Dispose command disposables
      this.disposables.forEach(disposable => {
        try {
          disposable.dispose();
        } catch (error) {
          this.errorHandler.logError('Error disposing command', error, 'dispose');
        }
      });
      
      this.disposables = [];

      // Dispose services and handlers
      try {
        this.pythonService.dispose();
        this.htmlViewService.dispose();
        this.webviewManager.dispose();
        this.jsonUtilitiesHandler.dispose();
        this.codeLensHandler.dispose();
      } catch (error) {
        this.errorHandler.logError('Error disposing services', error, 'dispose');
      }
      
    } catch (error) {
      this.errorHandler.logError('Error during command manager disposal', error, 'dispose');
    }
  }
}