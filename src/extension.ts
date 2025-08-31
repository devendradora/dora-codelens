import * as vscode from 'vscode';
import { ErrorHandler } from './core/error-handler';
import { DuplicateCallGuard } from './core/duplicate-call-guard';
import { AnalysisStateManager } from './core/analysis-state-manager';
import { CommandManager } from './core/command-manager';
import { WebviewManager } from './webviews/webview-manager';
import { JsonContextManager } from './core/json-context-manager';

/**
 * Extension activation function with centralized error handling and duplicate call prevention
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  let outputChannel: vscode.OutputChannel | undefined;
  let errorHandler: ErrorHandler | undefined;
  let duplicateCallGuard: DuplicateCallGuard | undefined;
  let stateManager: AnalysisStateManager | undefined;
  let webviewManager: WebviewManager | undefined;
  let commandManager: CommandManager | undefined;
  let jsonContextManager: JsonContextManager | undefined;

  try {
    // Create output channel first
    outputChannel = vscode.window.createOutputChannel('DoraCodeBirdView');
    outputChannel.appendLine('='.repeat(50));
    outputChannel.appendLine('DoraCodeBirdView Extension Starting...');
    outputChannel.appendLine(`Timestamp: ${new Date().toISOString()}`);
    outputChannel.appendLine('='.repeat(50));

    // Initialize core infrastructure
    errorHandler = ErrorHandler.getInstance(outputChannel);
    errorHandler.logError('Initializing extension infrastructure', null, 'activate');

    // Initialize duplicate call guard
    duplicateCallGuard = DuplicateCallGuard.getInstance(errorHandler);
    errorHandler.logError('Duplicate call guard initialized', null, 'activate');

    // Initialize state manager
    stateManager = AnalysisStateManager.getInstance(errorHandler);
    errorHandler.logError('Analysis state manager initialized', null, 'activate');

    // Initialize webview manager
    const extensionPath = context.extensionPath;
    webviewManager = new WebviewManager(errorHandler, extensionPath);
    errorHandler.logError('Webview manager initialized', null, 'activate');

    // Register webview commands
    webviewManager.registerCommands(context);
    errorHandler.logError('Webview commands registered', null, 'activate');

    // Initialize command manager
    commandManager = CommandManager.getInstance(context, errorHandler, duplicateCallGuard, stateManager, webviewManager);
    errorHandler.logError('Command manager initialized', null, 'activate');

    // Validate dependencies
    const dependenciesValid = await commandManager.validateDependencies();
    if (!dependenciesValid) {
      errorHandler.logError('Dependency validation failed, but continuing with limited functionality', null, 'activate');
    }

    // Register all commands
    commandManager.registerAllCommands();
    errorHandler.logError('All commands registered', null, 'activate');

    // Initialize code lens state
    commandManager.initializeCodeLens();
    errorHandler.logError('Code lens initialized', null, 'activate');

    // Initialize JSON context manager
    jsonContextManager = JsonContextManager.getInstance(errorHandler);
    errorHandler.logError('JSON context manager initialized', null, 'activate');

    // Add state change listener for debugging
    stateManager.addStateChangeListener((state) => {
      errorHandler!.logError(
        'State changed',
        { 
          isAnalyzing: state.isAnalyzing, 
          activeCommands: state.activeCommands.size,
          errorCount: state.errorCount 
        },
        'stateChangeListener'
      );
    });

    // Validate initial state
    const isStateValid = stateManager.validateState();
    if (!isStateValid) {
      errorHandler.logError('Initial state validation failed', null, 'activate');
    }

    // Store instances in context for cleanup
    context.globalState.update('extensionInitialized', true);

    outputChannel.appendLine('='.repeat(50));
    outputChannel.appendLine('DoraCodeBirdView Extension Activated Successfully');
    outputChannel.appendLine(`State: ${stateManager.getStateSummary()}`);
    outputChannel.appendLine('='.repeat(50));

    // Show success message to user
    vscode.window.showInformationMessage(
      'DoraCodeBirdView extension activated successfully!'
    );

  } catch (error) {
    const errorMessage = `Failed to activate DoraCodeBirdView extension: ${error}`;
    
    if (errorHandler) {
      errorHandler.logError('Extension activation failed', error, 'activate');
      errorHandler.showUserError(
        'Failed to activate DoraCodeBirdView extension. Check the output for details.',
        ['Open Output', 'Reload Window']
      );
    } else if (outputChannel) {
      outputChannel.appendLine(`[CRITICAL ERROR] ${errorMessage}`);
      outputChannel.appendLine(`Stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
      outputChannel.show();
    } else {
      console.error(errorMessage, error);
    }

    // Show error to user
    vscode.window.showErrorMessage(
      'DoraCodeBirdView extension failed to activate. Check the output for details.',
      'Open Output',
      'Reload Window'
    ).then(selection => {
      if (selection === 'Open Output' && outputChannel) {
        outputChannel.show();
      } else if (selection === 'Reload Window') {
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      }
    });

    // Clean up on failure
    try {
      if (jsonContextManager) {
        jsonContextManager.dispose();
      }
      if (commandManager) {
        commandManager.dispose();
      }
      if (webviewManager) {
        webviewManager.dispose();
      }
      if (stateManager) {
        stateManager.resetState();
      }
      if (duplicateCallGuard) {
        duplicateCallGuard.clearAllActiveCommands();
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }

    // Re-throw to indicate activation failure
    throw error;
  }
}

/**
 * Extension deactivation function with proper cleanup
 */
export async function deactivate(): Promise<void> {
  try {
    const errorHandler = ErrorHandler.getInstance();
    errorHandler.logError('DoraCodeBirdView extension deactivating...', null, 'deactivate');

    // Get instances for cleanup
    const commandManager = CommandManager.getInstance();
    const stateManager = AnalysisStateManager.getInstance();
    const duplicateCallGuard = DuplicateCallGuard.getInstance();
    const jsonContextManager = JsonContextManager.getInstance();

    // Clean up JSON context manager
    if (jsonContextManager) {
      jsonContextManager.dispose();
      errorHandler.logError('JSON context manager disposed', null, 'deactivate');
    }

    // Clean up command manager
    if (commandManager) {
      commandManager.dispose();
      errorHandler.logError('Command manager disposed', null, 'deactivate');
    }

    // Clean up webview manager (note: we can't get instance easily, but disposal is handled in command manager)
    errorHandler.logError('Webview manager disposed via command manager', null, 'deactivate');

    // Reset state
    if (stateManager) {
      stateManager.resetState();
      errorHandler.logError('State manager reset', null, 'deactivate');
    }

    // Clear active commands
    if (duplicateCallGuard) {
      duplicateCallGuard.clearAllActiveCommands();
      errorHandler.logError('Duplicate call guard cleared', null, 'deactivate');
    }

    errorHandler.logError('DoraCodeBirdView extension deactivated successfully', null, 'deactivate');

  } catch (error) {
    console.error('Error during DoraCodeBirdView extension deactivation:', error);
    
    // Try to get error handler for logging
    try {
      const errorHandler = ErrorHandler.getInstance();
      errorHandler.logError('Error during deactivation', error, 'deactivate');
    } catch (handlerError) {
      console.error('Could not access error handler during deactivation:', handlerError);
    }
  }
}