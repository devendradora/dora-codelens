import * as vscode from 'vscode';
import { ExtensionManager } from './core/extension-manager';
import { TabbedWebviewProvider } from './tabbed-webview-provider';
import { OutputChannel } from 'vscode';

/**
 * Extension activation function
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  let outputChannel: OutputChannel | undefined;
  let webviewProvider: TabbedWebviewProvider | undefined;
  let extensionManager: ExtensionManager | undefined;

  try {
    // Create output channel
    outputChannel = vscode.window.createOutputChannel('DoraCodeBirdView');
    outputChannel.appendLine('Initializing DoraCodeBirdView extension...');
    
    // Create webview provider
    webviewProvider = new TabbedWebviewProvider(context, outputChannel);
    
    // Create extension manager and initialize
    extensionManager = new ExtensionManager(context, outputChannel, webviewProvider);
    await extensionManager.initialize();

    // Store instances for deactivation (avoid circular references)
    // Don't store complex objects in globalState as they can cause circular reference issues

    outputChannel.appendLine('DoraCodeBirdView extension activated successfully');
  } catch (error) {
    if (outputChannel) {
      outputChannel.appendLine(`Failed to activate DoraCodeBirdView extension: ${error}`);
    } else {
      console.error('Failed to activate DoraCodeBirdView extension:', error);
    }

    vscode.window.showErrorMessage(
      'Failed to activate DoraCodeBirdView extension. Check the output for details.'
    );

    // Clean up on failure
    if (extensionManager) {
      extensionManager.dispose();
    }
    // The webview provider will be disposed automatically with the extension context
  }
}

/**
 * Extension deactivation function
 */
export async function deactivate(): Promise<void> {
  try {
    console.log('DoraCodeBirdView extension is being deactivated');

    // Get and dispose the extension manager
    const extensionManager = ExtensionManager.getInstance();
    if (extensionManager) {
      await extensionManager.dispose();
    }
  } catch (error) {
    console.error('Error during DoraCodeBirdView extension deactivation:', error);
  }
}
