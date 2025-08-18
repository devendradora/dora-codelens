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
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const extension_manager_1 = require("./core/extension-manager");
const tabbed_webview_provider_1 = require("./tabbed-webview-provider");
/**
 * Extension activation function
 */
async function activate(context) {
    let outputChannel;
    let webviewProvider;
    let extensionManager;
    try {
        // Create output channel
        outputChannel = vscode.window.createOutputChannel('DoraCodeBirdView');
        outputChannel.appendLine('Initializing DoraCodeBirdView extension...');
        // Create webview provider
        webviewProvider = new tabbed_webview_provider_1.TabbedWebviewProvider(context, outputChannel);
        // Create extension manager and initialize
        extensionManager = new extension_manager_1.ExtensionManager(context, outputChannel, webviewProvider);
        await extensionManager.initialize();
        // Store instances for deactivation (avoid circular references)
        // Don't store complex objects in globalState as they can cause circular reference issues
        outputChannel.appendLine('DoraCodeBirdView extension activated successfully');
    }
    catch (error) {
        if (outputChannel) {
            outputChannel.appendLine(`Failed to activate DoraCodeBirdView extension: ${error}`);
        }
        else {
            console.error('Failed to activate DoraCodeBirdView extension:', error);
        }
        vscode.window.showErrorMessage('Failed to activate DoraCodeBirdView extension. Check the output for details.');
        // Clean up on failure
        if (extensionManager) {
            extensionManager.dispose();
        }
        // The webview provider will be disposed automatically with the extension context
    }
}
exports.activate = activate;
/**
 * Extension deactivation function
 */
async function deactivate() {
    try {
        console.log('DoraCodeBirdView extension is being deactivated');
        // Get and dispose the extension manager
        const extensionManager = extension_manager_1.ExtensionManager.getInstance();
        if (extensionManager) {
            await extensionManager.dispose();
        }
    }
    catch (error) {
        console.error('Error during DoraCodeBirdView extension deactivation:', error);
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map