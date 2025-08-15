import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';

/**
 * Interface for analysis result data
 */
export interface AnalysisResult {
    success: boolean;
    data?: any;
    errors?: AnalysisError[];
    warnings?: AnalysisWarning[];
    executionTime?: number;
}

export interface AnalysisError {
    type: string;
    message: string;
    file?: string;
    line?: number;
}

export interface AnalysisWarning {
    type: string;
    message: string;
    module?: string;
    importedBy?: string[];
}

/**
 * Options for running the analyzer
 */
export interface AnalyzerOptions {
    projectPath: string;
    pythonPath?: string;
    timeout?: number;
    enableCaching?: boolean;
    outputPath?: string;
}

/**
 * Class responsible for executing the Python analyzer script
 */
export class AnalyzerRunner {
    private outputChannel: vscode.OutputChannel;
    private currentProcess: ChildProcess | null = null;
    private cancellationToken: vscode.CancellationTokenSource | null = null;
    private extensionPath: string;

    constructor(outputChannel: vscode.OutputChannel, extensionPath: string) {
        this.outputChannel = outputChannel;
        this.extensionPath = extensionPath;
    }

    /**
     * Execute the Python analyzer on the specified project
     */
    public async runAnalysis(
        options: AnalyzerOptions,
        progress?: vscode.Progress<{ message?: string; increment?: number }>,
        cancellationToken?: vscode.CancellationToken
    ): Promise<AnalysisResult> {
        const startTime = Date.now();
        
        try {
            // Validate inputs
            await this.validateOptions(options);
            
            // Set up cancellation
            this.cancellationToken = new vscode.CancellationTokenSource();
            if (cancellationToken) {
                cancellationToken.onCancellationRequested(() => {
                    this.cancelAnalysis();
                });
            }

            // Update progress
            progress?.report({ message: 'Preparing analysis...', increment: 10 });

            // Get Python path
            const pythonPath = await this.getPythonPath(options.pythonPath);
            
            // Get analyzer script path
            const analyzerPath = this.getAnalyzerScriptPath();
            
            // Prepare command arguments
            const args = this.buildAnalyzerArguments(options);
            
            this.log(`Starting Python analyzer: ${pythonPath} ${analyzerPath} ${args.join(' ')}`);
            
            // Update progress
            progress?.report({ message: 'Running analysis...', increment: 20 });

            // Execute the analyzer
            const result = await this.executeAnalyzer(pythonPath, analyzerPath, args, options, progress);
            
            // Calculate execution time
            const executionTime = Date.now() - startTime;
            result.executionTime = executionTime;
            
            this.log(`Analysis completed in ${executionTime}ms`);
            
            return result;
            
        } catch (error) {
            const executionTime = Date.now() - startTime;
            this.logError('Analysis failed', error);
            
            return {
                success: false,
                errors: [{
                    type: 'execution_error',
                    message: error instanceof Error ? error.message : 'Unknown error occurred'
                }],
                executionTime
            };
        } finally {
            this.cleanup();
        }
    }

    /**
     * Cancel the currently running analysis
     */
    public cancelAnalysis(): void {
        if (this.currentProcess) {
            this.log('Cancelling analysis...');
            this.currentProcess.kill('SIGTERM');
            this.currentProcess = null;
        }
        
        if (this.cancellationToken) {
            this.cancellationToken.cancel();
            this.cancellationToken = null;
        }
    }

    /**
     * Validate analyzer options
     */
    private async validateOptions(options: AnalyzerOptions): Promise<void> {
        // Check if project path exists
        if (!fs.existsSync(options.projectPath)) {
            throw new Error(`Project path does not exist: ${options.projectPath}`);
        }

        // Check if project path is a directory
        const stats = fs.statSync(options.projectPath);
        if (!stats.isDirectory()) {
            throw new Error(`Project path is not a directory: ${options.projectPath}`);
        }

        // Check if project contains Python files
        const pythonFiles = await vscode.workspace.findFiles(
            new vscode.RelativePattern(options.projectPath, '**/*.py'),
            '**/node_modules/**',
            1
        );
        
        if (pythonFiles.length === 0) {
            throw new Error('No Python files found in the project');
        }
    }

    /**
     * Get the Python executable path
     */
    private async getPythonPath(configuredPath?: string): Promise<string> {
        // Use configured path if provided
        if (configuredPath) {
            if (await this.validatePythonPath(configuredPath)) {
                return configuredPath;
            } else {
                this.log(`Configured Python path is invalid: ${configuredPath}`);
            }
        }

        // Try to get Python path from VS Code Python extension
        try {
            const pythonExtension = vscode.extensions.getExtension('ms-python.python');
            if (pythonExtension && pythonExtension.isActive) {
                const pythonApi = pythonExtension.exports;
                if (pythonApi && pythonApi.settings && pythonApi.settings.getExecutionDetails) {
                    const executionDetails = pythonApi.settings.getExecutionDetails();
                    if (executionDetails && executionDetails.execCommand) {
                        const pythonPath = Array.isArray(executionDetails.execCommand) 
                            ? executionDetails.execCommand[0] 
                            : executionDetails.execCommand;
                        
                        if (await this.validatePythonPath(pythonPath)) {
                            this.log(`Using Python path from Python extension: ${pythonPath}`);
                            return pythonPath;
                        }
                    }
                }
            }
        } catch (error) {
            this.log('Could not get Python path from Python extension');
        }

        // Fall back to common Python commands
        const commonPythonCommands = ['python3', 'python', 'py'];
        
        for (const command of commonPythonCommands) {
            if (await this.validatePythonPath(command)) {
                this.log(`Using Python command: ${command}`);
                return command;
            }
        }

        throw new Error('Python executable not found. Please install Python or configure the Python path in settings.');
    }

    /**
     * Validate that a Python path is executable
     */
    private async validatePythonPath(pythonPath: string): Promise<boolean> {
        return new Promise((resolve) => {
            const process = spawn(pythonPath, ['--version'], { stdio: 'pipe' });
            let stderr = '';
            
            process.stderr?.on('data', (data) => {
                stderr += data.toString();
            });
            
            process.on('close', (code) => {
                if (code === 0) {
                    resolve(true);
                } else {
                    this.log(`Python validation failed for ${pythonPath}: exit code ${code}, stderr: ${stderr}`);
                    resolve(false);
                }
            });
            
            process.on('error', (error) => {
                this.log(`Python validation error for ${pythonPath}: ${error.message}`);
                resolve(false);
            });
            
            // Timeout after 5 seconds
            setTimeout(() => {
                this.log(`Python validation timeout for ${pythonPath}`);
                process.kill();
                resolve(false);
            }, 5000);
        });
    }

    /**
     * Get the path to the analyzer script
     */
    private getAnalyzerScriptPath(): string {
        const analyzerPath = path.join(this.extensionPath, 'analyzer', 'analyzer.py');
        
        if (!fs.existsSync(analyzerPath)) {
            throw new Error(`Analyzer script not found at: ${analyzerPath}`);
        }
        
        return analyzerPath;
    }

    /**
     * Build command line arguments for the analyzer
     */
    private buildAnalyzerArguments(options: AnalyzerOptions): string[] {
        // The current analyzer.py only accepts a single project path argument
        return [options.projectPath];
    }

    /**
     * Execute the analyzer process
     */
    private async executeAnalyzer(
        pythonPath: string,
        analyzerPath: string,
        args: string[],
        options: AnalyzerOptions,
        progress?: vscode.Progress<{ message?: string; increment?: number }>
    ): Promise<AnalysisResult> {
        return new Promise((resolve, reject) => {
            const timeout = options.timeout || 300000; // 5 minutes default
            let stdout = '';
            let stderr = '';
            
            // Spawn the Python process
            this.currentProcess = spawn(pythonPath, [analyzerPath, ...args], {
                cwd: options.projectPath,
                stdio: 'pipe'
            });

            // Set up timeout
            const timeoutId = setTimeout(() => {
                if (this.currentProcess) {
                    this.currentProcess.kill('SIGTERM');
                    reject(new Error(`Analysis timed out after ${timeout}ms`));
                }
            }, timeout);

            // Handle stdout
            this.currentProcess.stdout?.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                
                // Look for progress indicators in output
                if (output.includes('Analyzing modules...')) {
                    progress?.report({ message: 'Analyzing modules...', increment: 30 });
                } else if (output.includes('Building call graph...')) {
                    progress?.report({ message: 'Building call graph...', increment: 50 });
                } else if (output.includes('Detecting frameworks...')) {
                    progress?.report({ message: 'Detecting frameworks...', increment: 70 });
                }
            });

            // Handle stderr
            this.currentProcess.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            // Handle process completion
            this.currentProcess.on('close', (code) => {
                clearTimeout(timeoutId);
                this.currentProcess = null;
                
                if (code === 0) {
                    try {
                        // Validate and parse JSON output
                        const result = this.parseAndValidateAnalyzerOutput(stdout);
                        progress?.report({ message: 'Analysis complete', increment: 100 });
                        resolve(result);
                    } catch (parseError) {
                        this.logError('Failed to parse analyzer output', parseError);
                        reject(new Error(`Failed to parse analyzer output: ${parseError instanceof Error ? parseError.message : parseError}`));
                    }
                } else {
                    const errorMessage = `Analyzer process exited with code ${code}`;
                    this.logError(errorMessage, new Error(stderr));
                    reject(new Error(`${errorMessage}. Error: ${stderr}`));
                }
            });

            // Handle process errors
            this.currentProcess.on('error', (error) => {
                clearTimeout(timeoutId);
                this.currentProcess = null;
                
                // Provide more specific error messages
                let errorMessage = `Failed to start analyzer process: ${error.message}`;
                
                if (error.message.includes('ENOENT')) {
                    errorMessage = `Python executable not found. Please check your Python installation and path configuration.`;
                } else if (error.message.includes('EACCES')) {
                    errorMessage = `Permission denied when trying to execute Python. Please check file permissions.`;
                } else if (error.message.includes('spawn')) {
                    errorMessage = `Failed to spawn Python process. This might be due to system resource limitations or Python installation issues.`;
                }
                
                this.logError('Process spawn error', error);
                reject(new Error(errorMessage));
            });
        });
    }

    /**
     * Parse and validate analyzer JSON output
     */
    private parseAndValidateAnalyzerOutput(stdout: string): AnalysisResult {
        // Clean up the output - remove any non-JSON content
        const cleanOutput = this.cleanAnalyzerOutput(stdout);
        
        // Parse JSON
        let parsedResult: any;
        try {
            parsedResult = JSON.parse(cleanOutput);
        } catch (error) {
            throw new Error(`Invalid JSON output from analyzer: ${error instanceof Error ? error.message : error}`);
        }

        // Validate the structure
        const validationResult = this.validateAnalyzerOutput(parsedResult);
        if (!validationResult.isValid) {
            this.log(`Analyzer output validation warnings: ${validationResult.warnings.join(', ')}`);
        }

        // Convert to AnalysisResult format
        return {
            success: parsedResult.success !== false, // Default to true if not specified
            data: parsedResult,
            errors: parsedResult.errors || [],
            warnings: parsedResult.warnings || [],
            executionTime: 0 // Will be set by caller
        };
    }

    /**
     * Clean analyzer output to extract JSON
     */
    private cleanAnalyzerOutput(output: string): string {
        // Find the JSON content - look for the first { and last }
        const firstBrace = output.indexOf('{');
        const lastBrace = output.lastIndexOf('}');
        
        if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
            throw new Error('No valid JSON found in analyzer output');
        }
        
        return output.substring(firstBrace, lastBrace + 1);
    }

    /**
     * Validate analyzer output structure
     */
    private validateAnalyzerOutput(data: any): { isValid: boolean; warnings: string[] } {
        const warnings: string[] = [];
        let isValid = true;

        // Check for required top-level properties
        if (!data.tech_stack) {
            warnings.push('Missing tech_stack data');
        }

        if (!data.modules) {
            warnings.push('Missing modules data');
        } else {
            // Validate modules structure
            if (!data.modules.nodes || !Array.isArray(data.modules.nodes)) {
                warnings.push('Invalid modules.nodes structure');
            }
            if (!data.modules.edges || !Array.isArray(data.modules.edges)) {
                warnings.push('Invalid modules.edges structure');
            }
        }

        if (!data.functions) {
            warnings.push('Missing functions data');
        } else {
            // Validate functions structure
            if (!data.functions.nodes || !Array.isArray(data.functions.nodes)) {
                warnings.push('Invalid functions.nodes structure');
            }
            if (!data.functions.edges || !Array.isArray(data.functions.edges)) {
                warnings.push('Invalid functions.edges structure');
            }
        }

        // Validate individual module nodes
        if (data.modules && data.modules.nodes) {
            data.modules.nodes.forEach((node: any, index: number) => {
                if (!node.id && !node.name) {
                    warnings.push(`Module node ${index} missing id/name`);
                }
                if (!node.path) {
                    warnings.push(`Module node ${index} missing path`);
                }
            });
        }

        // Validate individual function nodes
        if (data.functions && data.functions.nodes) {
            data.functions.nodes.forEach((node: any, index: number) => {
                if (!node.id) {
                    warnings.push(`Function node ${index} missing id`);
                }
                if (!node.name) {
                    warnings.push(`Function node ${index} missing name`);
                }
                if (!node.module) {
                    warnings.push(`Function node ${index} missing module`);
                }
            });
        }

        return { isValid, warnings };
    }

    /**
     * Clean up resources
     */
    private cleanup(): void {
        if (this.currentProcess) {
            this.currentProcess.kill();
            this.currentProcess = null;
        }
        
        if (this.cancellationToken) {
            this.cancellationToken.dispose();
            this.cancellationToken = null;
        }
    }

    /**
     * Log message to output channel
     */
    private log(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] AnalyzerRunner: ${message}`);
    }

    /**
     * Log error message to output channel
     */
    private logError(message: string, error: any): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] AnalyzerRunner ERROR: ${message}`);
        if (error) {
            this.outputChannel.appendLine(`[${timestamp}] ${error.toString()}`);
            if (error.stack) {
                this.outputChannel.appendLine(`[${timestamp}] ${error.stack}`);
            }
        }
    }
}