import * as vscode from 'vscode';
import * as path from 'path';
import { ErrorHandler } from '../core/error-handler';

/**
 * Interface for Python installation info
 */
export interface PythonInstallation {
    path: string;
    version: string;
    isValid: boolean;
    source: 'which' | 'manual' | 'vscode' | 'conda' | 'pyenv';
}

/**
 * Python Setup Service
 * Handles Python path detection, validation, and configuration
 */
export class PythonSetupService {
    private static instance: PythonSetupService;
    private errorHandler: ErrorHandler;

    private constructor(errorHandler: ErrorHandler) {
        this.errorHandler = errorHandler;
    }

    public static getInstance(errorHandler?: ErrorHandler): PythonSetupService {
        if (!PythonSetupService.instance) {
            if (!errorHandler) {
                throw new Error('ErrorHandler required for first initialization');
            }
            PythonSetupService.instance = new PythonSetupService(errorHandler);
        }
        return PythonSetupService.instance;
    }

    /**
     * Auto-detect Python installations on the system
     */
    public async detectPythonInstallations(): Promise<PythonInstallation[]> {
        const installations: PythonInstallation[] = [];

        try {
            // Try common Python commands
            const pythonCommands = ['python3', 'python', 'py'];
            
            for (const command of pythonCommands) {
                try {
                    const installation = await this.checkPythonCommand(command);
                    if (installation && installation.isValid) {
                        installations.push(installation);
                    }
                } catch (error) {
                    // Continue checking other commands
                    this.errorHandler.logError(
                        `Failed to check Python command: ${command}`,
                        error,
                        'PythonSetupService'
                    );
                }
            }

            // Check VS Code Python extension settings
            const vscodeInstallation = await this.getVSCodePythonPath();
            if (vscodeInstallation && vscodeInstallation.isValid) {
                installations.push(vscodeInstallation);
            }

            // Check common installation paths
            const commonPaths = await this.checkCommonPythonPaths();
            installations.push(...commonPaths.filter(p => p.isValid));

            // Remove duplicates based on path
            const uniqueInstallations = installations.filter((installation, index, self) => 
                index === self.findIndex(i => i.path === installation.path)
            );

            this.errorHandler.logError(
                `Detected ${uniqueInstallations.length} Python installations`,
                { installations: uniqueInstallations.map(i => ({ path: i.path, version: i.version, source: i.source })) },
                'PythonSetupService'
            );

            return uniqueInstallations;

        } catch (error) {
            this.errorHandler.logError(
                'Error detecting Python installations',
                error,
                'PythonSetupService'
            );
            return [];
        }
    }

    /**
     * Check a specific Python command
     */
    private async checkPythonCommand(command: string): Promise<PythonInstallation | null> {
        try {
            // Get the path using 'which' command
            const whichResult = await this.executeCommand(`which ${command}`);
            if (!whichResult.success || !whichResult.output.trim()) {
                return null;
            }

            const pythonPath = whichResult.output.trim();
            
            // Get version
            const versionResult = await this.executeCommand(`"${pythonPath}" --version`);
            if (!versionResult.success) {
                return null;
            }

            const version = versionResult.output.trim();
            
            // Validate it's Python 3
            const isValid = version.toLowerCase().includes('python 3');

            return {
                path: pythonPath,
                version,
                isValid,
                source: 'which'
            };

        } catch (error) {
            this.errorHandler.logError(
                `Error checking Python command: ${command}`,
                error,
                'PythonSetupService'
            );
            return null;
        }
    }

    /**
     * Get Python path from VS Code Python extension
     */
    private async getVSCodePythonPath(): Promise<PythonInstallation | null> {
        try {
            const pythonConfig = vscode.workspace.getConfiguration('python');
            const pythonPath = pythonConfig.get<string>('pythonPath') || pythonConfig.get<string>('defaultInterpreterPath');
            
            if (!pythonPath) {
                return null;
            }

            const versionResult = await this.executeCommand(`"${pythonPath}" --version`);
            if (!versionResult.success) {
                return null;
            }

            const version = versionResult.output.trim();
            const isValid = version.toLowerCase().includes('python 3');

            return {
                path: pythonPath,
                version,
                isValid,
                source: 'vscode'
            };

        } catch (error) {
            this.errorHandler.logError(
                'Error getting VS Code Python path',
                error,
                'PythonSetupService'
            );
            return null;
        }
    }

    /**
     * Check common Python installation paths
     */
    private async checkCommonPythonPaths(): Promise<PythonInstallation[]> {
        const installations: PythonInstallation[] = [];
        
        // Common paths based on OS
        const commonPaths = process.platform === 'win32' ? [
            'C:\\Python39\\python.exe',
            'C:\\Python38\\python.exe',
            'C:\\Python37\\python.exe',
            'C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Python\\Python39\\python.exe',
            'C:\\Users\\%USERNAME%\\AppData\\Local\\Programs\\Python\\Python38\\python.exe'
        ] : [
            '/usr/bin/python3',
            '/usr/local/bin/python3',
            '/opt/homebrew/bin/python3',
            '/usr/bin/python',
            '/usr/local/bin/python',
            '/opt/local/bin/python3'
        ];

        for (const pythonPath of commonPaths) {
            try {
                const versionResult = await this.executeCommand(`"${pythonPath}" --version`);
                if (versionResult.success) {
                    const version = versionResult.output.trim();
                    const isValid = version.toLowerCase().includes('python 3');
                    
                    installations.push({
                        path: pythonPath,
                        version,
                        isValid,
                        source: 'manual'
                    });
                }
            } catch (error) {
                // Path doesn't exist or isn't executable, continue
            }
        }

        return installations;
    }

    /**
     * Execute a shell command
     */
    private async executeCommand(command: string): Promise<{ success: boolean; output: string; error?: string }> {
        return new Promise((resolve) => {
            const { exec } = require('child_process');
            
            exec(command, { timeout: 5000 }, (error: any, stdout: string, stderr: string) => {
                if (error) {
                    resolve({
                        success: false,
                        output: '',
                        error: error.message
                    });
                } else {
                    resolve({
                        success: true,
                        output: stdout || stderr
                    });
                }
            });
        });
    }

    /**
     * Validate a Python installation
     */
    public async validatePythonPath(pythonPath: string): Promise<{ isValid: boolean; version?: string; error?: string }> {
        try {
            const versionResult = await this.executeCommand(`"${pythonPath}" --version`);
            
            if (!versionResult.success) {
                return {
                    isValid: false,
                    error: versionResult.error || 'Failed to get Python version'
                };
            }

            const version = versionResult.output.trim();
            const isValid = version.toLowerCase().includes('python 3');

            if (!isValid) {
                return {
                    isValid: false,
                    version,
                    error: 'Python 3 is required, but found: ' + version
                };
            }

            // Test if required modules are available
            const moduleTest = await this.executeCommand(`"${pythonPath}" -c "import ast, json; print('OK')"`);
            if (!moduleTest.success) {
                return {
                    isValid: false,
                    version,
                    error: 'Required Python modules (ast, json) are not available'
                };
            }

            return {
                isValid: true,
                version
            };

        } catch (error) {
            return {
                isValid: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Set Python path in DoraCodeLens configuration
     */
    public async setPythonPath(pythonPath: string, scope: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace, showNotification: boolean = true): Promise<boolean> {
        try {
            // Validate the path first
            const validation = await this.validatePythonPath(pythonPath);
            if (!validation.isValid) {
                vscode.window.showErrorMessage(`Invalid Python path: ${validation.error}`);
                return false;
            }

            // Set the configuration
            const config = vscode.workspace.getConfiguration('doracodelens');
            await config.update('pythonPath', pythonPath, scope);

            this.errorHandler.logError(
                'Python path updated successfully',
                { pythonPath, version: validation.version, scope },
                'PythonSetupService'
            );

            // Only show notification if requested (for manual setup, not auto-detection)
            if (showNotification) {
                vscode.window.showInformationMessage(
                    `Python path set to: ${pythonPath}\nVersion: ${validation.version}`
                );
            }

            return true;

        } catch (error) {
            this.errorHandler.logError(
                'Error setting Python path',
                error,
                'PythonSetupService'
            );
            vscode.window.showErrorMessage('Failed to set Python path. Check the output for details.');
            return false;
        }
    }

    /**
     * Show Python setup wizard
     */
    public async showSetupWizard(): Promise<void> {
        try {
            const installations = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Detecting Python installations...',
                cancellable: false
            }, async () => {
                return await this.detectPythonInstallations();
            });

            if (installations.length === 0) {
                const action = await vscode.window.showWarningMessage(
                    'No Python 3 installations found. Please install Python 3 and try again.',
                    'Download Python',
                    'Manual Setup',
                    'Open Settings'
                );

                if (action === 'Download Python') {
                    vscode.env.openExternal(vscode.Uri.parse('https://www.python.org/downloads/'));
                } else if (action === 'Manual Setup') {
                    await this.showManualSetup();
                } else if (action === 'Open Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'doracodelens.pythonPath');
                }
                return;
            }

            // Show quick pick with detected installations
            const items = installations.map(installation => ({
                label: `${installation.path}`,
                description: `${installation.version} (${installation.source})`,
                detail: installation.isValid ? '✅ Valid Python 3 installation' : '❌ Invalid or Python 2',
                installation
            }));

            // Add manual option
            items.push({
                label: '$(edit) Manual Setup',
                description: 'Enter Python path manually',
                detail: 'Specify a custom Python path',
                installation: null as any
            });

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a Python installation for DoraCodeLens',
                ignoreFocusOut: true
            });

            if (!selected) {
                return;
            }

            if (selected.installation) {
                // Set the selected Python path
                const success = await this.setPythonPath(selected.installation.path);
                if (success) {
                    // Ask if user wants to test the setup
                    const testAction = await vscode.window.showInformationMessage(
                        'Python path configured successfully! Would you like to test it now?',
                        'Test Now',
                        'Later'
                    );

                    if (testAction === 'Test Now') {
                        vscode.commands.executeCommand('doracodelens.analyzeCurrentFile');
                    }
                }
            } else {
                // Manual setup
                await this.showManualSetup();
            }

        } catch (error) {
            this.errorHandler.logError(
                'Error in Python setup wizard',
                error,
                'PythonSetupService'
            );
            vscode.window.showErrorMessage('Failed to run Python setup wizard. Check the output for details.');
        }
    }

    /**
     * Show manual Python path setup
     */
    private async showManualSetup(): Promise<void> {
        const pythonPath = await vscode.window.showInputBox({
            prompt: 'Enter the full path to your Python 3 executable',
            placeHolder: process.platform === 'win32' ? 'C:\\Python39\\python.exe' : '/usr/bin/python3',
            validateInput: async (value) => {
                if (!value) {
                    return 'Please enter a Python path';
                }
                
                // Quick validation
                if (!value.includes('python')) {
                    return 'Path should contain "python"';
                }
                
                return null;
            }
        });

        if (pythonPath) {
            await this.setPythonPath(pythonPath);
        }
    }

    /**
     * Get current Python configuration
     */
    public getCurrentPythonPath(): string {
        const config = vscode.workspace.getConfiguration('doracodelens');
        return config.get<string>('pythonPath', 'python3');
    }

    /**
     * Test current Python configuration
     */
    public async testCurrentConfiguration(): Promise<void> {
        const currentPath = this.getCurrentPythonPath();
        
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Testing Python configuration...',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Validating Python path...' });
            
            const validation = await this.validatePythonPath(currentPath);
            
            progress.report({ increment: 50, message: 'Checking modules...' });
            
            if (validation.isValid) {
                progress.report({ increment: 100, message: 'Configuration valid!' });
                
                vscode.window.showInformationMessage(
                    `✅ Python configuration is valid!\nPath: ${currentPath}\nVersion: ${validation.version}`
                );
            } else {
                vscode.window.showErrorMessage(
                    `❌ Python configuration is invalid!\nPath: ${currentPath}\nError: ${validation.error}`
                );
                
                const action = await vscode.window.showErrorMessage(
                    'Would you like to reconfigure Python?',
                    'Setup Python',
                    'Open Settings'
                );
                
                if (action === 'Setup Python') {
                    await this.showSetupWizard();
                } else if (action === 'Open Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'doracodelens.pythonPath');
                }
            }
        });
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        this.errorHandler.logError(
            'PythonSetupService disposed',
            null,
            'PythonSetupService'
        );
    }
}