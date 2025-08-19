import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { ErrorHandler } from '../core/error-handler';
import { DuplicateCallGuard } from '../core/duplicate-call-guard';
import { AnalysisStateManager } from '../core/analysis-state-manager';
import { WebviewManager } from '../webviews/webview-manager';

/**
 * Analysis options for full code analysis
 */
export interface FullCodeAnalysisOptions {
  useCache?: boolean;
  forceRefresh?: boolean;
  includeTests?: boolean;
  maxFileSize?: number;
}

/**
 * Python process management for full code analysis
 */
export interface PythonProcessInfo {
  process: ChildProcess;
  startTime: number;
  timeout: NodeJS.Timeout;
}

/**
 * Full code analysis handler with robust Python integration
 */
export class FullCodeAnalysisHandler {
  private static readonly COMMAND_ID = 'doracodebirdview.analyzeFullCode';
  private static readonly PYTHON_TIMEOUT = 120000; // 2 minutes
  private static readonly PYTHON_SCRIPT = 'analyzer.py';

  private errorHandler: ErrorHandler;
  private duplicateCallGuard: DuplicateCallGuard;
  private stateManager: AnalysisStateManager;
  private webviewManager: WebviewManager;
  private currentProcess: PythonProcessInfo | null = null;

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
   * Execute full code analysis with duplicate call prevention
   */
  public async execute(options: FullCodeAnalysisOptions = {}): Promise<any> {
    return this.duplicateCallGuard.executeWithProtection(
      FullCodeAnalysisHandler.COMMAND_ID,
      async () => {
        this.errorHandler.logError('Starting full code analysis', options, FullCodeAnalysisHandler.COMMAND_ID);
        
        // Update state
        this.stateManager.setAnalyzing(true, { type: 'fullCode', options });
        this.stateManager.addActiveCommand(FullCodeAnalysisHandler.COMMAND_ID);
        
        try {
          // Get workspace path
          const workspacePath = this.getWorkspacePath();
          if (!workspacePath) {
            throw new Error('No workspace folder found');
          }

          // Show progress to user
          return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing Full Codebase',
            cancellable: true
          }, async (progress, token) => {
            progress.report({ increment: 0, message: 'Initializing analysis...' });

            // Handle cancellation
            token.onCancellationRequested(() => {
              this.cancelCurrentProcess();
            });

            // Execute Python analysis
            const result = await this.executePythonAnalysis(workspacePath, options, progress);
            
            // Validate result
            const validatedResult = this.errorHandler.validateAnalysisResult(result);
            if (!validatedResult) {
              throw new Error('Analysis returned invalid result');
            }

            // Update state with result
            this.stateManager.setLastResult(validatedResult);
            
            this.errorHandler.logError('Full code analysis completed successfully', null, FullCodeAnalysisHandler.COMMAND_ID);
            
            // Show results in dedicated webview
            try {
              this.webviewManager.showFullCodeAnalysis(validatedResult);
            } catch (webviewError) {
              this.errorHandler.logError('Failed to show webview, analysis completed but display failed', webviewError, FullCodeAnalysisHandler.COMMAND_ID);
              vscode.window.showWarningMessage('Analysis completed but failed to display results. Check the output for details.');
            }
            
            // Show success message
            vscode.window.showInformationMessage(
              `Full code analysis completed! Found ${validatedResult.code_graph_json?.length || 0} modules.`
            );

            return validatedResult;
          });

        } catch (error) {
          this.stateManager.incrementErrorCount();
          this.errorHandler.logError('Full code analysis failed', error, FullCodeAnalysisHandler.COMMAND_ID);
          
          // Show user-friendly error
          this.errorHandler.showUserError(
            'Full code analysis failed. Check the output for details.',
            ['Open Output', 'Retry']
          );
          
          throw error;
        } finally {
          // Always clean up state
          this.stateManager.setAnalyzing(false);
          this.stateManager.removeActiveCommand(FullCodeAnalysisHandler.COMMAND_ID);
          this.currentProcess = null;
        }
      },
      [options]
    );
  }

  /**
   * Execute Python analysis with proper process management
   */
  private async executePythonAnalysis(
    workspacePath: string,
    options: FullCodeAnalysisOptions,
    progress: vscode.Progress<{ increment?: number; message?: string }>
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const analyzerPath = this.getAnalyzerPath();
      
      // Build Python command arguments
      const args = [analyzerPath, workspacePath];
      
      // Add options as arguments
      if (options.useCache === false) {
        args.push('--no-cache');
      }
      // Always force refresh to ensure fresh code_graph_json data
      args.push('--force-refresh');
      if (options.includeTests === false) {
        args.push('--exclude-tests');
      }
      if (options.maxFileSize) {
        args.push('--max-file-size', options.maxFileSize.toString());
      }

      this.errorHandler.logError('Executing Python analysis', { args }, FullCodeAnalysisHandler.COMMAND_ID);

      // Get configured Python path
      const pythonPath = vscode.workspace.getConfiguration('doracodebirdview').get<string>('pythonPath', 'python3');

      // Spawn Python process
      const pythonProcess = spawn(pythonPath, args, {
        cwd: path.dirname(analyzerPath),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Set up timeout
      const timeout = setTimeout(() => {
        this.errorHandler.logError('Python process timed out', null, FullCodeAnalysisHandler.COMMAND_ID);
        pythonProcess.kill('SIGTERM');
        reject(new Error(`Analysis timed out after ${FullCodeAnalysisHandler.PYTHON_TIMEOUT / 1000} seconds`));
      }, FullCodeAnalysisHandler.PYTHON_TIMEOUT);

      // Store process info for potential cancellation
      this.currentProcess = {
        process: pythonProcess,
        startTime: Date.now(),
        timeout
      };

      let stdout = '';
      let stderr = '';

      // Collect stdout
      pythonProcess.stdout?.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        
        // Update progress based on Python output
        this.updateProgressFromPythonOutput(chunk, progress);
      });

      // Collect stderr
      pythonProcess.stderr?.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        this.errorHandler.logError('Python stderr', chunk, FullCodeAnalysisHandler.COMMAND_ID);
      });

      // Handle process completion
      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        this.currentProcess = null;

        if (code === 0) {
          try {
            // Parse JSON result
            const result = JSON.parse(stdout);
            this.errorHandler.logError('Python analysis completed', { resultSize: stdout.length }, FullCodeAnalysisHandler.COMMAND_ID);
            resolve(result);
          } catch (parseError) {
            this.errorHandler.logError('Failed to parse Python output', parseError, FullCodeAnalysisHandler.COMMAND_ID);
            reject(new Error(`Failed to parse analysis result: ${parseError}`));
          }
        } else {
          const errorMessage = `Python analysis failed with code ${code}`;
          this.errorHandler.logError(errorMessage, { stderr }, FullCodeAnalysisHandler.COMMAND_ID);
          reject(new Error(`${errorMessage}: ${stderr}`));
        }
      });

      // Handle process errors
      pythonProcess.on('error', (error) => {
        clearTimeout(timeout);
        this.currentProcess = null;
        this.errorHandler.logError('Python process error', error, FullCodeAnalysisHandler.COMMAND_ID);
        reject(new Error(`Failed to start Python analysis: ${error.message}`));
      });
    });
  }

  /**
   * Update progress based on Python output
   */
  private updateProgressFromPythonOutput(
    output: string,
    progress: vscode.Progress<{ increment?: number; message?: string }>
  ): void {
    // Look for progress indicators in Python output
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('Analyzing')) {
        progress.report({ message: line.trim() });
      } else if (line.includes('Found') && line.includes('files')) {
        progress.report({ increment: 10, message: line.trim() });
      } else if (line.includes('Processing')) {
        progress.report({ increment: 5, message: line.trim() });
      } else if (line.includes('Completed')) {
        progress.report({ increment: 20, message: line.trim() });
      }
    }
  }

  /**
   * Cancel current Python process
   */
  private cancelCurrentProcess(): void {
    if (this.currentProcess) {
      this.errorHandler.logError('Cancelling Python analysis process', null, FullCodeAnalysisHandler.COMMAND_ID);
      
      clearTimeout(this.currentProcess.timeout);
      this.currentProcess.process.kill('SIGTERM');
      this.currentProcess = null;
      
      // Update state
      this.stateManager.setAnalyzing(false);
      this.stateManager.removeActiveCommand(FullCodeAnalysisHandler.COMMAND_ID);
    }
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
    const extensionPath = vscode.extensions.getExtension('doracodebird.doracodebird-view')?.extensionPath;
    if (!extensionPath) {
      throw new Error('Extension path not found');
    }
    return path.join(extensionPath, 'analyzer', FullCodeAnalysisHandler.PYTHON_SCRIPT);
  }

  /**
   * Check if analysis is currently running
   */
  public isRunning(): boolean {
    return this.currentProcess !== null;
  }

  /**
   * Get current process info for debugging
   */
  public getCurrentProcessInfo(): PythonProcessInfo | null {
    return this.currentProcess;
  }
}