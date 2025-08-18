import * as vscode from 'vscode';
import * as fs from 'fs';
import { 
    ConfigurationValidation, 
    ExtensionConfiguration, 
    AnalyzerOptions,
    IConfigurationManager 
} from '../types/extension-types';

/**
 * Configuration Manager handles all extension configuration and validation
 */
export class ConfigurationManager implements IConfigurationManager {
    private static readonly EXTENSION_ID = 'doracodebird';
    
    constructor() {}

    /**
     * Get extension configuration
     */
    public getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration(ConfigurationManager.EXTENSION_ID);
    }

    /**
     * Get Python path from configuration
     */
    public getPythonPath(): string | undefined {
        return this.getConfiguration().get<string>('pythonPath');
    }

    /**
     * Check if caching is enabled
     */
    public isCachingEnabled(): boolean {
        return this.getConfiguration().get<boolean>('enableCaching', true);
    }

    /**
     * Check if complexity CodeLens is enabled
     */
    public isComplexityCodeLensEnabled(): boolean {
        return this.getConfiguration().get<boolean>('showComplexityCodeLens', true);
    }

    /**
     * Get timeout value from configuration
     */
    public getTimeout(): number {
        return this.getConfiguration().get<number>('timeout', 300000); // 5 minutes default
    }

    /**
     * Get analyzer options from configuration
     */
    public getAnalyzerOptions(projectPath: string): AnalyzerOptions {
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
    public getExtensionConfiguration(): ExtensionConfiguration {
        const config = this.getConfiguration();
        return {
            pythonPath: config.get<string>('pythonPath'),
            enableCaching: config.get<boolean>('enableCaching', true),
            showComplexityCodeLens: config.get<boolean>('showComplexityCodeLens', true),
            timeout: config.get<number>('timeout', 300000)
        };
    }

    /**
     * Validate extension configuration
     */
    public validateConfiguration(): ConfigurationValidation {
        const config = this.getConfiguration();
        const issues: string[] = [];
        const warnings: string[] = [];

        // Check Python path if configured
        const pythonPath = config.get<string>('pythonPath');
        if (pythonPath && !this.isValidPath(pythonPath)) {
            issues.push(`Configured Python path does not exist: ${pythonPath}`);
        }

        // Check timeout value
        const timeout = config.get<number>('timeout', 300000);
        if (timeout < 30000) {
            warnings.push('Timeout value is very low (< 30 seconds). Analysis may fail for large projects.');
        } else if (timeout > 600000) {
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
    public validateAndShowConfiguration(): void {
        const validation = this.validateConfiguration();

        if (validation.isValid) {
            const config = this.getExtensionConfiguration();
            const message = `Configuration is valid:
• Python path: ${config.pythonPath || 'default'}
• Caching enabled: ${config.enableCaching}
• Show complexity CodeLens: ${config.showComplexityCodeLens}
• Timeout: ${config.timeout / 1000}s`;

            vscode.window.showInformationMessage(
                'Configuration Valid',
                { modal: true, detail: message },
                'OK'
            );
        } else {
            const issues = validation.issues.join('\n');
            const warnings = validation.warnings.length > 0 ? 
                '\n\nWarnings:\n' + validation.warnings.join('\n') : '';
            
            vscode.window.showErrorMessage(
                'Configuration Issues Found',
                { modal: true, detail: issues + warnings },
                'Open Settings'
            ).then(action => {
                if (action === 'Open Settings') {
                    this.openSettings();
                }
            });
        }
    }

    /**
     * Open extension settings
     */
    public openSettings(): void {
        vscode.commands.executeCommand('workbench.action.openSettings', ConfigurationManager.EXTENSION_ID);
    }

    /**
     * Check if a path exists and is accessible
     */
    public isValidPath(filePath: string): boolean {
        try {
            return fs.existsSync(filePath);
        } catch (error) {
            return false;
        }
    }

    /**
     * Get configuration diagnostics for troubleshooting
     */
    public getConfigurationDiagnostics(): string[] {
        const config = this.getConfiguration();
        const diagnostics: string[] = [];

        diagnostics.push('--- Configuration ---');
        diagnostics.push(`Python path: ${config.get<string>('pythonPath', 'default')}`);
        diagnostics.push(`Show complexity CodeLens: ${config.get<boolean>('showComplexityCodeLens', true)}`);
        diagnostics.push(`Enable caching: ${config.get<boolean>('enableCaching', true)}`);
        diagnostics.push(`Timeout: ${config.get<number>('timeout', 300000)}ms`);

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