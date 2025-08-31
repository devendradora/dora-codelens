import * as vscode from 'vscode';
import { ErrorHandler } from './core/error-handler';
import { DuplicateCallGuard } from './core/duplicate-call-guard';
import { AnalysisStateManager } from './core/analysis-state-manager';
import { AnalysisManager } from './core/analysis-manager';
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
  let analysisManager: AnalysisManager | undefined;
  let webviewManager: WebviewManager | undefined;
  let commandManager: CommandManager | undefined;
  let jsonContextManager: JsonContextManager | undefined;

  try {
    // Create output channel first
    outputChannel = vscode.window.createOutputChannel('DoraCodeLens');
    outputChannel.appendLine('='.repeat(50));
    outputChannel.appendLine('DoraCodeLens Extension Starting...');
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

    // Initialize analysis manager
    analysisManager = AnalysisManager.getInstance(errorHandler);
    errorHandler.logError('Analysis manager initialized', null, 'activate');

    // Initialize preference storage service
    const { PreferenceStorageService } = await import('./services/preference-storage-service');
    const preferenceService = PreferenceStorageService.getInstance(errorHandler, context);
    errorHandler.logError('Preference storage service initialized', null, 'activate');

    // Initialize guidance manager
    const { CodeLensGuidanceManager } = await import('./core/code-lens-guidance-manager');
    const guidanceManager = CodeLensGuidanceManager.getInstance(errorHandler, context, preferenceService, analysisManager);
    errorHandler.logError('Code lens guidance manager initialized', null, 'activate');

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

    // Register analysis manager with command manager
    const codeLensHandler = commandManager.getHandlers().codeLens;
    if (codeLensHandler) {
      const codeLensProvider = codeLensHandler.getManager().getProvider();
      if (codeLensProvider) {
        analysisManager.registerCodeLensProvider(codeLensProvider);
        
        // Integrate guidance manager with code lens provider and analysis manager
        codeLensProvider.setGuidanceManager(guidanceManager);
        analysisManager.registerGuidanceManager(guidanceManager);
        
        errorHandler.logError('Analysis manager and guidance system integrated with code lens provider', null, 'activate');
      }
    }

    // Initialize guidance command handler
    const { GuidanceCommandHandler } = await import('./commands/guidance-command-handler');
    const guidanceCommandHandler = new GuidanceCommandHandler(
      errorHandler, 
      context, 
      guidanceManager, 
      analysisManager, 
      preferenceService
    );
    
    // Store guidance command handler reference for code lens integration
    if (codeLensHandler) {
      codeLensHandler.setGuidanceCommandHandler(guidanceCommandHandler);
    }
    
    errorHandler.logError('Guidance command handler initialized', null, 'activate');

    // Auto-detect and set Python path if not configured BEFORE dependency validation
    try {
      await guidanceManager.suggestOptimalPreferences();
      
      // Ensure Python path is properly configured
      const config = vscode.workspace.getConfiguration('doracodelens');
      let currentPythonPath = config.get<string>('pythonPath', 'python3');
      
      errorHandler.logError('Current Python path configuration', { currentPythonPath }, 'activate');
      
      // Force set the Python path to the known working path
      if (currentPythonPath === 'python3' || currentPythonPath === 'python') {
        await config.update('pythonPath', '/opt/homebrew/bin/python3', vscode.ConfigurationTarget.Workspace);
        currentPythonPath = '/opt/homebrew/bin/python3';
        errorHandler.logError('Force-set Python path to known working path', { currentPythonPath }, 'activate');
      }
      
      // If still using default paths, try to auto-detect
      if (currentPythonPath === 'python3' || currentPythonPath === 'python') {
        const { PythonSetupService } = await import('./services/python-setup-service');
        const pythonSetupService = PythonSetupService.getInstance(errorHandler);
        
        errorHandler.logError('Auto-detecting Python path on startup', null, 'activate');
        
        const installations = await pythonSetupService.detectPythonInstallations();
        const validInstallations = installations.filter(i => i.isValid);
        
        if (validInstallations.length > 0) {
          const bestInstallation = validInstallations[0]; // Use the first valid one
          const success = await pythonSetupService.setPythonPath(bestInstallation.path, vscode.ConfigurationTarget.Workspace, false); // Silent auto-detection
          
          if (success) {
            // Reload configuration after setting
            const updatedConfig = vscode.workspace.getConfiguration('doracodelens');
            const updatedPythonPath = updatedConfig.get<string>('pythonPath', 'python3');
            
            errorHandler.logError(
              'Auto-configured Python path successfully', 
              { 
                originalPath: currentPythonPath,
                newPath: bestInstallation.path, 
                configuredPath: updatedPythonPath,
                version: bestInstallation.version 
              }, 
              'activate'
            );
          } else {
            errorHandler.logError('Failed to set Python path during auto-detection', null, 'activate');
          }
        } else {
          errorHandler.logError('No valid Python installations found during auto-detection', null, 'activate');
        }
      } else {
        errorHandler.logError('Python path already configured, skipping auto-detection', { currentPythonPath }, 'activate');
      }
    } catch (error) {
      errorHandler.logError('Error in startup configuration', error, 'activate');
    }

    // Validate dependencies with current configuration
    const finalConfig = vscode.workspace.getConfiguration('doracodelens');
    const finalPythonPath = finalConfig.get<string>('pythonPath', 'python3');
    errorHandler.logError('Final Python path before validation', { finalPythonPath }, 'activate');
    
    const dependenciesValid = await commandManager.validateDependencies();
    if (!dependenciesValid) {
      errorHandler.logError('Dependency validation failed, but continuing with limited functionality', null, 'activate');
    } else {
      errorHandler.logError('All dependencies validated successfully', null, 'activate');
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
    outputChannel.appendLine('DoraCodeLens Extension Activated Successfully');
    outputChannel.appendLine(`State: ${stateManager.getStateSummary()}`);
    outputChannel.appendLine('='.repeat(50));

    // Show success message to user
    vscode.window.showInformationMessage(
      'DoraCodeLens extension activated successfully!'
    );

  } catch (error) {
    const errorMessage = `Failed to activate DoraCodeLens extension: ${error}`;
    
    if (errorHandler) {
      errorHandler.logError('Extension activation failed', error, 'activate');
      errorHandler.showUserError(
        'Failed to activate DoraCodeLens extension. Check the output for details.',
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
      'DoraCodeLens extension failed to activate. Check the output for details.',
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
      if (analysisManager) {
        analysisManager.dispose();
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
    errorHandler.logError('DoraCodeLens extension deactivating...', null, 'deactivate');

    // Get instances for cleanup
    const commandManager = CommandManager.getInstance();
    const analysisManager = AnalysisManager.getInstance();
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

    // Clean up analysis manager
    if (analysisManager) {
      analysisManager.dispose();
      errorHandler.logError('Analysis manager disposed', null, 'deactivate');
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

    errorHandler.logError('DoraCodeLens extension deactivated successfully', null, 'deactivate');

  } catch (error) {
    console.error('Error during DoraCodeLens extension deactivation:', error);
    
    // Try to get error handler for logging
    try {
      const errorHandler = ErrorHandler.getInstance();
      errorHandler.logError('Error during deactivation', error, 'deactivate');
    } catch (handlerError) {
      console.error('Could not access error handler during deactivation:', handlerError);
    }
  }
}