import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { ErrorHandler } from '../core/error-handler';
import { DuplicateCallGuard } from '../core/duplicate-call-guard';
import { AnalysisStateManager } from '../core/analysis-state-manager';
import { WebviewManager } from '../webviews/webview-manager';

/**
 * Analysis options for database schema analysis
 */
export interface DatabaseSchemaOptions {
  includeDjangoModels?: boolean;
  includeSQLAlchemyModels?: boolean;
  includeSQLFiles?: boolean;
  includeRelationships?: boolean;
  generateGraphData?: boolean;
}

/**
 * Database schema analysis handler with Python integration
 */
export class DatabaseSchemaHandler {
  private static readonly COMMAND_ID = 'doracodelens.analyzeDatabaseSchema';
  private static readonly PYTHON_TIMEOUT = 45000; // 45 seconds
  private static readonly PYTHON_SCRIPT = 'run_database_schema_analysis.py';

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
   * Execute database schema analysis with duplicate call prevention
   */
  public async execute(options: DatabaseSchemaOptions = {}): Promise<any> {
    return this.duplicateCallGuard.executeWithProtection(
      DatabaseSchemaHandler.COMMAND_ID,
      async () => {
        this.errorHandler.logError('Starting database schema analysis', options, DatabaseSchemaHandler.COMMAND_ID);
        
        // Update state
        this.stateManager.setAnalyzing(true, { type: 'databaseSchema', options });
        this.stateManager.addActiveCommand(DatabaseSchemaHandler.COMMAND_ID);
        
        try {
          // Get workspace path
          const workspacePath = this.getWorkspacePath();
          if (!workspacePath) {
            throw new Error('No workspace folder found');
          }

          // Show progress to user
          return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing Database Schema',
            cancellable: true
          }, async (progress, token) => {
            progress.report({ increment: 0, message: 'Initializing schema analysis...' });

            // Handle cancellation
            token.onCancellationRequested(() => {
              this.cancelCurrentProcess();
            });

            // Execute Python analysis
            const result = await this.executePythonAnalysis(workspacePath, options, progress);
            
            // Validate result
            const validatedResult = this.errorHandler.validateAnalysisResult(result);
            if (!validatedResult) {
              throw new Error('Database schema analysis returned invalid result');
            }

            // Update state with result
            this.stateManager.setLastResult(validatedResult);
            
            this.errorHandler.logError('Database schema analysis completed successfully', null, DatabaseSchemaHandler.COMMAND_ID);
            
            // Show results in dedicated webview
            try {
              this.webviewManager.showDatabaseSchema(validatedResult);
            } catch (webviewError) {
              this.errorHandler.logError('Failed to show webview, analysis completed but display failed', webviewError, DatabaseSchemaHandler.COMMAND_ID);
              vscode.window.showWarningMessage('Analysis completed but failed to display results. Check the output for details.');
            }
            
            // Show success message
            const totalTables = validatedResult.metadata?.total_tables || 0;
            const totalRelationships = validatedResult.metadata?.total_relationships || 0;
            
            vscode.window.showInformationMessage(
              `Database schema analysis completed! Found ${totalTables} tables with ${totalRelationships} relationships.`
            );

            return validatedResult;
          });

        } catch (error) {
          this.stateManager.incrementErrorCount();
          this.errorHandler.logError('Database schema analysis failed', error, DatabaseSchemaHandler.COMMAND_ID);
          
          // Show user-friendly error
          this.errorHandler.showUserError(
            'Database schema analysis failed. Check the output for details.',
            ['Open Output', 'Retry']
          );
          
          throw error;
        } finally {
          // Always clean up state
          this.stateManager.setAnalyzing(false);
          this.stateManager.removeActiveCommand(DatabaseSchemaHandler.COMMAND_ID);
          this.currentProcess = null;
        }
      },
      [options]
    );
  }

  /**
   * Execute Python database schema analysis
   */
  private async executePythonAnalysis(
    workspacePath: string,
    options: DatabaseSchemaOptions,
    progress: vscode.Progress<{ increment?: number; message?: string }>
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const analyzerPath = this.getAnalyzerPath();
      
      // Build Python command arguments
      const args = [analyzerPath, workspacePath];
      
      // Add options as arguments
      if (options.includeDjangoModels === false) {
        args.push('--no-django');
      }
      if (options.includeSQLAlchemyModels === false) {
        args.push('--no-sqlalchemy');
      }
      if (options.includeSQLFiles === false) {
        args.push('--no-sql-files');
      }
      if (options.includeRelationships === false) {
        args.push('--no-relationships');
      }
      if (options.generateGraphData === false) {
        args.push('--no-graph');
      }

      this.errorHandler.logError('Executing Python database schema analysis', { args }, DatabaseSchemaHandler.COMMAND_ID);

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
        this.errorHandler.logError('Python database schema process timed out', null, DatabaseSchemaHandler.COMMAND_ID);
        pythonProcess.kill('SIGTERM');
        reject(new Error(`Database schema analysis timed out after ${DatabaseSchemaHandler.PYTHON_TIMEOUT / 1000} seconds`));
      }, DatabaseSchemaHandler.PYTHON_TIMEOUT);

      let stdout = '';
      let stderr = '';

      // Collect stdout
      pythonProcess.stdout?.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        
        // Update progress based on Python output
        this.updateProgressFromSchemaOutput(chunk, progress);
      });

      // Collect stderr
      pythonProcess.stderr?.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        this.errorHandler.logError('Python database schema stderr', chunk, DatabaseSchemaHandler.COMMAND_ID);
      });

      // Handle process completion
      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        this.currentProcess = null;

        if (code === 0) {
          try {
            // Parse JSON result
            const result = JSON.parse(stdout);
            this.errorHandler.logError('Python database schema analysis completed', { resultSize: stdout.length }, DatabaseSchemaHandler.COMMAND_ID);
            resolve(result);
          } catch (parseError) {
            this.errorHandler.logError('Failed to parse database schema output', parseError, DatabaseSchemaHandler.COMMAND_ID);
            reject(new Error(`Failed to parse database schema result: ${parseError}`));
          }
        } else {
          const errorMessage = `Python database schema analysis failed with code ${code}`;
          this.errorHandler.logError(errorMessage, { stderr }, DatabaseSchemaHandler.COMMAND_ID);
          reject(new Error(`${errorMessage}: ${stderr}`));
        }
      });

      // Handle process errors
      pythonProcess.on('error', (error) => {
        clearTimeout(timeout);
        this.currentProcess = null;
        this.errorHandler.logError('Python database schema process error', error, DatabaseSchemaHandler.COMMAND_ID);
        reject(new Error(`Failed to start Python database schema analysis: ${error.message}`));
      });
    });
  }

  /**
   * Update progress based on Python database schema output
   */
  private updateProgressFromSchemaOutput(
    output: string,
    progress: vscode.Progress<{ increment?: number; message?: string }>
  ): void {
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('Scanning for model files')) {
        progress.report({ increment: 15, message: 'Scanning for model files...' });
      } else if (line.includes('Parsing Django models')) {
        progress.report({ increment: 20, message: 'Parsing Django models...' });
      } else if (line.includes('Parsing SQLAlchemy models')) {
        progress.report({ increment: 20, message: 'Parsing SQLAlchemy models...' });
      } else if (line.includes('Analyzing SQL files')) {
        progress.report({ increment: 15, message: 'Analyzing SQL files...' });
      } else if (line.includes('Building relationships')) {
        progress.report({ increment: 15, message: 'Building relationships...' });
      } else if (line.includes('Generating graph data')) {
        progress.report({ increment: 15, message: 'Generating graph data...' });
      } else if (line.includes('Schema analysis completed')) {
        progress.report({ increment: 100, message: 'Schema analysis completed!' });
      }
    }
  }

  /**
   * Cancel current Python process
   */
  private cancelCurrentProcess(): void {
    if (this.currentProcess) {
      this.errorHandler.logError('Cancelling Python database schema analysis process', null, DatabaseSchemaHandler.COMMAND_ID);
      
      this.currentProcess.kill('SIGTERM');
      this.currentProcess = null;
      
      // Update state
      this.stateManager.setAnalyzing(false);
      this.stateManager.removeActiveCommand(DatabaseSchemaHandler.COMMAND_ID);
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
    const extensionPath = vscode.extensions.getExtension('doracodelens.doracodelens')?.extensionPath;
    if (!extensionPath) {
      throw new Error('Extension path not found');
    }
    return path.join(extensionPath, 'analyzer', DatabaseSchemaHandler.PYTHON_SCRIPT);
  }

  /**
   * Check if analysis is currently running
   */
  public isRunning(): boolean {
    return this.currentProcess !== null;
  }

  /**
   * Analyze specific model files
   */
  public async analyzeModelFiles(modelFiles: string[], options: DatabaseSchemaOptions = {}): Promise<any> {
    const workspacePath = this.getWorkspacePath();
    if (!workspacePath) {
      throw new Error('No workspace folder found');
    }

    return this.duplicateCallGuard.executeWithProtection(
      `${DatabaseSchemaHandler.COMMAND_ID}_specific_files`,
      async () => {
        this.stateManager.setAnalyzing(true, { type: 'databaseSchema', modelFiles, options });
        
        try {
          // Create a modified analysis that focuses on specific files
          const modifiedOptions = { ...options, specificFiles: modelFiles };
          const result = await this.executePythonAnalysis(workspacePath, modifiedOptions, {
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
      [modelFiles, options]
    );
  }
}