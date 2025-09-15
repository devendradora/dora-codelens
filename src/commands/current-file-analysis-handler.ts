import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { ErrorHandler } from '../core/error-handler';
import { DuplicateCallGuard } from '../core/duplicate-call-guard';
import { AnalysisStateManager } from '../core/analysis-state-manager';
import { WebviewManager } from '../webviews/webview-manager';

/**
 * Analysis options for current file analysis
 */
export interface CurrentFileAnalysisOptions {
  includeComplexity?: boolean;
  includeDependencies?: boolean;
  includeFrameworkPatterns?: boolean;
}

/**
 * Current file analysis handler with Python integration
 */
export class CurrentFileAnalysisHandler {
  private static readonly COMMAND_ID = 'doracodelens.analyzeCurrentFile';
  private static readonly PYTHON_TIMEOUT = 30000; // 30 seconds
  private static readonly PYTHON_SCRIPT = 'current_file_analyzer.py';

  private errorHandler: ErrorHandler;
  private duplicateCallGuard: DuplicateCallGuard;
  private stateManager: AnalysisStateManager;
  private webviewManager: WebviewManager;
  private currentProcess: ChildProcess | null = null;

  constructor(
    errorHandler: ErrorHandler,
    duplicateCallGuard: DuplicateCallGuard,
    stateManager: AnalysisStateManager,
    webviewManager: WebviewManager
  ) {
    this.errorHandler = errorHandler;
    this.duplicateCallGuard = duplicateCallGuard;
    this.stateManager = stateManager;
    this.webviewManager = webviewManager;
  }

  /**
   * Execute current file analysis in background without showing webview
   */
  public async executeInBackground(filePath?: string, options: CurrentFileAnalysisOptions = {}): Promise<any> {
    const targetFile = filePath || this.getCurrentFile();
    if (!targetFile) {
      throw new Error('No active file found or file is not a Python file');
    }

    this.errorHandler.logError('Starting background current file analysis', { filePath: targetFile, options }, CurrentFileAnalysisHandler.COMMAND_ID);
    
    try {
      // Execute Python analysis without progress UI
      const result = await this.executePythonAnalysisBackground(targetFile, options);
      
      // Validate result
      const validatedResult = this.errorHandler.validateAnalysisResult(result);
      if (!validatedResult) {
        throw new Error('Analysis returned invalid result');
      }

      // Update state with result (but don't show webview)
      this.stateManager.setLastResult(validatedResult);
      
      this.errorHandler.logError('Background current file analysis completed successfully', null, CurrentFileAnalysisHandler.COMMAND_ID);
      
      return validatedResult;
    } catch (error) {
      this.errorHandler.logError('Background current file analysis failed', error, CurrentFileAnalysisHandler.COMMAND_ID);
      throw error;
    }
  }

  /**
   * Execute current file analysis with duplicate call prevention
   */
  public async execute(options: CurrentFileAnalysisOptions = {}): Promise<any> {
    return this.duplicateCallGuard.executeWithProtection(
      CurrentFileAnalysisHandler.COMMAND_ID,
      async () => {
        const startTime = Date.now();
        this.errorHandler.logError('Starting current file analysis', options, CurrentFileAnalysisHandler.COMMAND_ID);
        
        // Update state
        this.stateManager.setAnalyzing(true, { type: 'currentFile', options });
        this.stateManager.addActiveCommand(CurrentFileAnalysisHandler.COMMAND_ID);
        
        try {
          // Get current file
          const currentFile = this.getCurrentFile();
          if (!currentFile) {
            throw new Error('No active file found or file is not a Python file');
          }

          // Show progress to user
          return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing Current File',
            cancellable: true
          }, async (progress, token) => {
            progress.report({ increment: 0, message: `Analyzing ${path.basename(currentFile)}...` });

            // Handle cancellation
            token.onCancellationRequested(() => {
              this.cancelCurrentProcess();
            });

            // Execute Python analysis
            const result = await this.executePythonAnalysis(currentFile, options, progress);
            
            // Validate result
            const validatedResult = this.errorHandler.validateAnalysisResult(result);
            if (!validatedResult) {
              throw new Error('Analysis returned invalid result');
            }

            // Update state with result
            this.stateManager.setLastResult(validatedResult);
            
            this.errorHandler.logError('Current file analysis completed successfully', null, CurrentFileAnalysisHandler.COMMAND_ID);
            
            // Notify sidebar of completed analysis
            const duration = Date.now() - startTime;
            try {
              const commandManager = await import('../core/command-manager');
              const manager = commandManager.CommandManager.getInstance();
              manager.notifyAnalysisCompleted('current-file', 'success', duration, currentFile, validatedResult);
            } catch (notificationError) {
              this.errorHandler.logError(
                "Failed to notify sidebar of analysis completion",
                notificationError,
                CurrentFileAnalysisHandler.COMMAND_ID
              );
            }
            
            // Show results in dedicated webview
            try {
              this.webviewManager.showCurrentFileAnalysis(validatedResult, currentFile);
            } catch (webviewError) {
              this.errorHandler.logError('Failed to show webview, analysis completed but display failed', webviewError, CurrentFileAnalysisHandler.COMMAND_ID);
              vscode.window.showWarningMessage('Analysis completed but failed to display results. Check the output for details.');
            }
            
            // Update code lens with analysis data
            try {
              vscode.commands.executeCommand(
                "doracodelens.updateCodeLensData",
                validatedResult
              );
            } catch (codeLensError) {
              this.errorHandler.logError(
                "Failed to update code lens data",
                codeLensError,
                CurrentFileAnalysisHandler.COMMAND_ID
              );
            }
            
            // Show success message
            const complexity = validatedResult.complexity_metrics?.overall_complexity?.level || 'unknown';
            const functionCount = validatedResult.complexity_metrics?.function_complexities?.length || 0;
            
            vscode.window.showInformationMessage(
              `File analysis completed! Complexity: ${complexity}, Functions: ${functionCount}`
            );

            return validatedResult;
          });

        } catch (error) {
          this.stateManager.incrementErrorCount();
          this.errorHandler.logError('Current file analysis failed', error, CurrentFileAnalysisHandler.COMMAND_ID);
          
          // Notify sidebar of failed analysis
          const duration = Date.now() - startTime;
          try {
            const commandManager = await import('../core/command-manager');
            const manager = commandManager.CommandManager.getInstance();
            manager.notifyAnalysisCompleted('current-file', 'error', duration);
          } catch (notificationError) {
            this.errorHandler.logError(
              "Failed to notify sidebar of analysis failure",
              notificationError,
              CurrentFileAnalysisHandler.COMMAND_ID
            );
          }
          
          // Show user-friendly error
          this.errorHandler.showUserError(
            'Current file analysis failed. Check the output for details.',
            ['Open Output', 'Retry']
          );
          
          throw error;
        } finally {
          // Always clean up state
          this.stateManager.setAnalyzing(false);
          this.stateManager.removeActiveCommand(CurrentFileAnalysisHandler.COMMAND_ID);
          this.currentProcess = null;
        }
      },
      [options]
    );
  }

  /**
   * Execute Python analysis for current file
   */
  private async executePythonAnalysis(
    filePath: string,
    options: CurrentFileAnalysisOptions,
    progress: vscode.Progress<{ increment?: number; message?: string }>
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const analyzerPath = this.getAnalyzerPath();
      const workspacePath = this.getWorkspacePath();
      
      // Build Python command arguments
      const args = [analyzerPath, filePath];
      
      // Add workspace path for context if available
      if (workspacePath) {
        args.push('--project-path', workspacePath);
      }
      
      // Add options as arguments
      if (options.includeComplexity === false) {
        args.push('--no-complexity');
      }
      if (options.includeDependencies === false) {
        args.push('--no-dependencies');
      }
      if (options.includeFrameworkPatterns === false) {
        args.push('--no-frameworks');
      }

      this.errorHandler.logError('Executing Python file analysis', { args }, CurrentFileAnalysisHandler.COMMAND_ID);

      // Get configured Python path
      const pythonPath = vscode.workspace.getConfiguration('doracodelens').get<string>('pythonPath', 'python3');

      // Spawn Python process
      const pythonProcess = spawn(pythonPath, args, {
        cwd: path.dirname(analyzerPath),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.currentProcess = pythonProcess;

      // Set up timeout
      const timeout = setTimeout(() => {
        this.errorHandler.logError('Python process timed out', null, CurrentFileAnalysisHandler.COMMAND_ID);
        pythonProcess.kill('SIGTERM');
        reject(new Error(`Analysis timed out after ${CurrentFileAnalysisHandler.PYTHON_TIMEOUT / 1000} seconds`));
      }, CurrentFileAnalysisHandler.PYTHON_TIMEOUT);

      let stdout = '';
      let stderr = '';

      // Collect stdout
      pythonProcess.stdout?.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        
        // Update progress
        if (chunk.includes('Parsing')) {
          progress.report({ increment: 25, message: 'Parsing file structure...' });
        } else if (chunk.includes('Analyzing complexity')) {
          progress.report({ increment: 25, message: 'Analyzing complexity...' });
        } else if (chunk.includes('Detecting dependencies')) {
          progress.report({ increment: 25, message: 'Detecting dependencies...' });
        } else if (chunk.includes('Framework patterns')) {
          progress.report({ increment: 25, message: 'Detecting framework patterns...' });
        }
      });

      // Collect stderr
      pythonProcess.stderr?.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        // Only log as error if it's not just warnings or info messages
        if (!chunk.includes('WARNING') && !chunk.includes('INFO') && !chunk.includes('DEBUG')) {
          this.errorHandler.logError('Python stderr', chunk, CurrentFileAnalysisHandler.COMMAND_ID);
        }
      });

      // Handle process completion
      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        this.currentProcess = null;

        if (code === 0) {
          try {
            // Parse JSON result
            const result = JSON.parse(stdout);
            this.errorHandler.logError('Python file analysis completed', { resultSize: stdout.length }, CurrentFileAnalysisHandler.COMMAND_ID);
            resolve(result);
          } catch (parseError) {
            this.errorHandler.logError('Failed to parse Python output', parseError, CurrentFileAnalysisHandler.COMMAND_ID);
            reject(new Error(`Failed to parse analysis result: ${parseError}`));
          }
        } else {
          const errorMessage = `Python file analysis failed with code ${code}`;
          this.errorHandler.logError(errorMessage, { stderr }, CurrentFileAnalysisHandler.COMMAND_ID);
          reject(new Error(`${errorMessage}: ${stderr}`));
        }
      });

      // Handle process errors
      pythonProcess.on('error', (error) => {
        clearTimeout(timeout);
        this.currentProcess = null;
        this.errorHandler.logError('Python process error', error, CurrentFileAnalysisHandler.COMMAND_ID);
        reject(new Error(`Failed to start Python file analysis: ${error.message}`));
      });
    });
  }

  /**
   * Execute Python analysis for current file in background (no progress UI)
   */
  private async executePythonAnalysisBackground(
    filePath: string,
    options: CurrentFileAnalysisOptions
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const analyzerPath = this.getAnalyzerPath();
      const workspacePath = this.getWorkspacePath();
      
      // Build Python command arguments
      const args = [analyzerPath, filePath];
      
      // Add workspace path for context if available
      if (workspacePath) {
        args.push('--project-path', workspacePath);
      }

      // Add options (using negative flags as per analyzer help)
      if (options.includeComplexity === false) {
        args.push('--no-complexity');
      }
      if (options.includeDependencies === false) {
        args.push('--no-dependencies');
      }
      if (options.includeFrameworkPatterns === false) {
        args.push('--no-frameworks');
      }

      // Get Python path from configuration
      const config = vscode.workspace.getConfiguration('doracodelens');
      const pythonPath = config.get<string>('pythonPath', 'python3');

      this.errorHandler.logError('Starting background Python file analysis', { 
        pythonPath, 
        analyzerPath, 
        filePath,
        args: args.slice(1) // Don't log the full analyzer path
      }, CurrentFileAnalysisHandler.COMMAND_ID);

      // Spawn Python process
      const pythonProcess = spawn(pythonPath, args, {
        cwd: path.dirname(analyzerPath),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Set up timeout (shorter for background analysis)
      const timeout = setTimeout(() => {
        this.errorHandler.logError('Background Python process timed out', null, CurrentFileAnalysisHandler.COMMAND_ID);
        pythonProcess.kill('SIGTERM');
        reject(new Error(`Background analysis timed out after ${CurrentFileAnalysisHandler.PYTHON_TIMEOUT / 1000} seconds`));
      }, CurrentFileAnalysisHandler.PYTHON_TIMEOUT);

      let stdout = '';
      let stderr = '';

      // Collect stdout (no progress reporting)
      pythonProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      // Collect stderr
      pythonProcess.stderr?.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        // Only log as error if it's not just warnings or info messages
        if (!chunk.includes('WARNING') && !chunk.includes('INFO') && !chunk.includes('DEBUG')) {
          this.errorHandler.logError('Background Python stderr', chunk, CurrentFileAnalysisHandler.COMMAND_ID);
        }
      });

      // Handle process completion
      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);

        if (code === 0) {
          try {
            // Parse JSON result
            const result = JSON.parse(stdout);
            this.errorHandler.logError('Background Python file analysis completed', { resultSize: stdout.length }, CurrentFileAnalysisHandler.COMMAND_ID);
            resolve(result);
          } catch (parseError) {
            this.errorHandler.logError('Failed to parse background Python output', parseError, CurrentFileAnalysisHandler.COMMAND_ID);
            reject(new Error(`Failed to parse background analysis result: ${parseError}`));
          }
        } else {
          const errorMessage = `Background Python file analysis failed with code ${code}`;
          this.errorHandler.logError(errorMessage, { stderr }, CurrentFileAnalysisHandler.COMMAND_ID);
          reject(new Error(`${errorMessage}: ${stderr}`));
        }
      });

      // Handle process errors
      pythonProcess.on('error', (error) => {
        clearTimeout(timeout);
        this.errorHandler.logError('Background Python process error', error, CurrentFileAnalysisHandler.COMMAND_ID);
        reject(new Error(`Failed to start background Python file analysis: ${error.message}`));
      });
    });
  }

  /**
   * Cancel current Python process
   */
  private cancelCurrentProcess(): void {
    if (this.currentProcess) {
      this.errorHandler.logError('Cancelling Python file analysis process', null, CurrentFileAnalysisHandler.COMMAND_ID);
      
      this.currentProcess.kill('SIGTERM');
      this.currentProcess = null;
      
      // Update state
      this.stateManager.setAnalyzing(false);
      this.stateManager.removeActiveCommand(CurrentFileAnalysisHandler.COMMAND_ID);
    }
  }

  /**
   * Get current active file
   */
  private getCurrentFile(): string | null {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return null;
    }

    const filePath = activeEditor.document.uri.fsPath;
    
    // Check if it's a Python file
    if (!filePath.endsWith('.py')) {
      return null;
    }

    // Check if file is saved
    if (activeEditor.document.isDirty) {
      vscode.window.showWarningMessage('Please save the file before analyzing.');
      return null;
    }

    return filePath;
  }

  /**
   * Get workspace path
   */
  private getWorkspacePath(): string | null {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return null;
    }
    return workspaceFolders[0].uri.fsPath;
  }

  /**
   * Get analyzer script path
   */
  private getAnalyzerPath(): string {
    const extensionPath = vscode.extensions.getExtension('DevendraDora.doracodelens')?.extensionPath;
    if (!extensionPath) {
      throw new Error('Extension path not found');
    }
    return path.join(extensionPath, 'analyzer', CurrentFileAnalysisHandler.PYTHON_SCRIPT);
  }

  /**
   * Check if analysis is currently running
   */
  public isRunning(): boolean {
    return this.currentProcess !== null;
  }

  /**
   * Analyze file at specific path (for programmatic use)
   */
  public async analyzeFile(filePath: string, options: CurrentFileAnalysisOptions = {}): Promise<any> {
    if (!filePath.endsWith('.py')) {
      throw new Error('File must be a Python file');
    }

    return this.duplicateCallGuard.executeWithProtection(
      `${CurrentFileAnalysisHandler.COMMAND_ID}_${filePath}`,
      async () => {
        this.stateManager.setAnalyzing(true, { type: 'currentFile', filePath, options });
        
        try {
          const result = await this.executePythonAnalysis(filePath, options, {
            report: () => {} // No-op progress for programmatic use
          } as any);
          
          const validatedResult = this.errorHandler.validateAnalysisResult(result);
          if (!validatedResult) {
            throw new Error('Analysis returned invalid result');
          }

          this.stateManager.setLastResult(validatedResult);
          return validatedResult;
        } finally {
          this.stateManager.setAnalyzing(false);
        }
      },
      [filePath, options]
    );
  }
}