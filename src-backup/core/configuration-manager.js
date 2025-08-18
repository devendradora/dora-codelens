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
exports.ConfigurationManager = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
/**
 * Configuration Manager handles all extension configuration and validation
 */
class ConfigurationManager {
    constructor() { }
    /**
     * Get extension configuration
     */
    getConfiguration() {
        return vscode.workspace.getConfiguration(ConfigurationManager.EXTENSION_ID);
    }
    /**
     * Get Python path from configuration
     */
    getPythonPath() {
        return this.getConfiguration().get('pythonPath');
    }
    /**
     * Check if caching is enabled
     */
    isCachingEnabled() {
        return this.getConfiguration().get('enableCaching', true);
    }
    /**
     * Check if complexity CodeLens is enabled
     */
    isComplexityCodeLensEnabled() {
        return this.getConfiguration().get('showComplexityCodeLens', true);
    }
    /**
     * Get timeout value from configuration
     */
    getTimeout() {
        return this.getConfiguration().get('timeout', 300000); // 5 minutes default
    }
    /**
     * Get analyzer options from configuration
     */
    getAnalyzerOptions(projectPath) {
        return {
            projectPath,
            pythonPath: this.getPythonPath(),
            timeout: this.getTimeout(),
            enableCaching: this.isCachingEnabled()
        };
    }
    /**
     * Get extension configuration as typed object
     */
    getExtensionConfiguration() {
        const config = this.getConfiguration();
        return {
            pythonPath: config.get('pythonPath'),
            enableCaching: config.get('enableCaching', true),
            showComplexityCodeLens: config.get('showComplexityCodeLens', true),
            timeout: config.get('timeout', 300000)
        };
    }
    /**
     * Validate extension configuration
     */
    validateConfiguration() {
        const config = this.getConfiguration();
        const issues = [];
        const warnings = [];
        // Check Python path if configured
        const pythonPath = config.get('pythonPath');
        if (pythonPath && !this.isValidPath(pythonPath)) {
            issues.push(`Configured Python path does not exist: ${pythonPath}`);
        }
        // Check timeout value
        const timeout = config.get('timeout', 300000);
        if (timeout < 30000) {
            warnings.push('Timeout value is very low (< 30 seconds). Analysis may fail for large projects.');
        }
        else if (timeout > 600000) {
            warnings.push('Timeout value is very high (> 10 minutes). Consider reducing it for better responsiveness.');
        }
        // Validate boolean settings
        const enableCaching = config.get('enableCaching');
        if (enableCaching !== undefined && typeof enableCaching !== 'boolean') {
            issues.push('enableCaching must be a boolean value');
        }
        const showComplexityCodeLens = config.get('showComplexityCodeLens');
        if (showComplexityCodeLens !== undefined && typeof showComplexityCodeLens !== 'boolean') {
            issues.push('showComplexityCodeLens must be a boolean value');
        }
        return {
            isValid: issues.length === 0,
            issues,
            warnings
        };
    }
    /**
     * Validate configuration and show results to user
     */
    validateAndShowConfiguration() {
        const validation = this.validateConfiguration();
        if (validation.isValid) {
            const config = this.getExtensionConfiguration();
            const message = `Configuration is valid:
• Python path: ${config.pythonPath || 'default'}
• Caching enabled: ${config.enableCaching}
• Show complexity CodeLens: ${config.showComplexityCodeLens}
• Timeout: ${config.timeout / 1000}s`;
            vscode.window.showInformationMessage('Configuration Valid', { modal: true, detail: message }, 'OK');
        }
        else {
            const issues = validation.issues.join('\n');
            const warnings = validation.warnings.length > 0 ?
                '\n\nWarnings:\n' + validation.warnings.join('\n') : '';
            vscode.window.showErrorMessage('Configuration Issues Found', { modal: true, detail: issues + warnings }, 'Open Settings').then(action => {
                if (action === 'Open Settings') {
                    this.openSettings();
                }
            });
        }
    }
    /**
     * Open extension settings
     */
    openSettings() {
        vscode.commands.executeCommand('workbench.action.openSettings', ConfigurationManager.EXTENSION_ID);
    }
    /**
     * Check if a path exists and is accessible
     */
    isValidPath(filePath) {
        try {
            return fs.existsSync(filePath);
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get configuration diagnostics for troubleshooting
     */
    getConfigurationDiagnostics() {
        const config = this.getConfiguration();
        const diagnostics = [];
        diagnostics.push('--- Configuration ---');
        diagnostics.push(`Python path: ${config.get('pythonPath', 'default')}`);
        diagnostics.push(`Show complexity CodeLens: ${config.get('showComplexityCodeLens', true)}`);
        diagnostics.push(`Enable caching: ${config.get('enableCaching', true)}`);
        diagnostics.push(`Timeout: ${config.get('timeout', 300000)}ms`);
        const validation = this.validateConfiguration();
        if (!validation.isValid) {
            diagnostics.push('');
            diagnostics.push('--- Configuration Issues ---');
            validation.issues.forEach(issue => diagnostics.push(`ERROR: ${issue}`));
        }
        if (validation.warnings.length > 0) {
            diagnostics.push('');
            diagnostics.push('--- Configuration Warnings ---');
            validation.warnings.forEach(warning => diagnostics.push(`WARNING: ${warning}`));
        }
        return diagnostics;
    }
}
exports.ConfigurationManager = ConfigurationManager;
ConfigurationManager.EXTENSION_ID = 'doracodebird';
//# sourceMappingURL=configuration-manager.js.map