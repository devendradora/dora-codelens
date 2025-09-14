import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { ErrorHandler } from '../core/error-handler';
import { DuplicateCallGuard } from '../core/duplicate-call-guard';
import { AnalysisStateManager } from '../core/analysis-state-manager';
import { WebviewManager } from '../webviews/webview-manager';
import { GitAnalyticsDataValidator } from '../services/git-analytics-data-validator';
import { GitAnalyticsData, ValidationResult } from '../types/git-analytics-types';

/**
 * Analysis options for git analytics
 */
export interface GitAnalyticsOptions {
  dateRange?: {
    start: string;
    end: string;
  };
  includeAuthorStats?: boolean;
  includeCommitTimeline?: boolean;
  maxCommits?: number;
}

/**
 * Git analytics handler with Python integration
 */
export class GitAnalyticsHandler {
  private static readonly COMMAND_ID = 'doracodelens.analyzeGitAnalytics';
  private static readonly PYTHON_TIMEOUT = 60000; // 1 minute
  private static readonly PYTHON_SCRIPT = 'git_analytics_runner.py';

  private errorHandler: ErrorHandler;
  private duplicateCallGuard: DuplicateCallGuard;
  private stateManager: AnalysisStateManager;
  private webviewManager: WebviewManager;
  private currentProcess: ChildProcess | null = null;
  private dataValidator: GitAnalyticsDataValidator;

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
    this.dataValidator = new GitAnalyticsDataValidator({
      enableLegacySupport: true,
      strictValidation: false,
      provideFallbacks: true
    });
  }

  /**
   * Execute git analytics with duplicate call prevention
   */
  public async execute(options: GitAnalyticsOptions = {}): Promise<any> {
    return this.duplicateCallGuard.executeWithProtection(
      GitAnalyticsHandler.COMMAND_ID,
      async () => {
        this.errorHandler.logError('Starting git analytics', options, GitAnalyticsHandler.COMMAND_ID);
        
        // Update state
        this.stateManager.setAnalyzing(true, { type: 'gitAnalytics', options });
        this.stateManager.addActiveCommand(GitAnalyticsHandler.COMMAND_ID);
        
        try {
          // Get workspace path and validate git repository
          const workspacePath = this.getWorkspacePath();
          if (!workspacePath) {
            throw new Error('No workspace folder found');
          }

          const isGitRepo = await this.validateGitRepository(workspacePath);
          if (!isGitRepo) {
            throw new Error('Current workspace is not a Git repository');
          }

          // Show progress to user
          return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing Git Repository',
            cancellable: true
          }, async (progress, token) => {
            progress.report({ increment: 0, message: 'Initializing git analysis...' });

            // Handle cancellation
            token.onCancellationRequested(() => {
              this.cancelCurrentProcess();
            });

            // Execute Python analysis
            const rawResult = await this.executePythonAnalysis(workspacePath, options, progress);
            
            // Validate and map the result using comprehensive validator
            const validationResult = this.dataValidator.validateAndMap(rawResult);
            
            // Log validation results
            if (validationResult.warnings.length > 0) {
              this.errorHandler.logError('Git analysis validation warnings', validationResult.warnings, GitAnalyticsHandler.COMMAND_ID);
            }
            
            if (!validationResult.isValid) {
              this.errorHandler.logError('Git analysis validation failed', validationResult.errors, GitAnalyticsHandler.COMMAND_ID);
              throw new Error(`Git analysis validation failed: ${validationResult.errors.join(', ')}`);
            }

            // Update state with validated result
            this.stateManager.setLastResult(validationResult.data);
            
            this.errorHandler.logError('Git analytics completed successfully', null, GitAnalyticsHandler.COMMAND_ID);
            
            // Show results in dedicated webview
            try {
              this.webviewManager.showGitAnalytics(validationResult.data);
            } catch (webviewError) {
              this.errorHandler.logError('Failed to show webview, analysis completed but display failed', webviewError, GitAnalyticsHandler.COMMAND_ID);
              vscode.window.showWarningMessage('Analysis completed but failed to display results. Check the output for details.');
            }
            
            // Show success message with validated data
            const totalCommits = validationResult.data.repository_info.total_commits;
            const contributors = validationResult.data.repository_info.contributors;
            const warningCount = validationResult.warnings.length;
            
            let message = `Git analysis completed! Found ${totalCommits} commits from ${contributors} contributors.`;
            if (warningCount > 0) {
              message += ` (${warningCount} warnings - check output for details)`;
            }
            
            vscode.window.showInformationMessage(message);

            return validationResult.data;
          });

        } catch (error) {
          this.stateManager.incrementErrorCount();
          this.errorHandler.logError('Git analytics failed', error, GitAnalyticsHandler.COMMAND_ID);
          
          // Show user-friendly error
          this.errorHandler.showUserError(
            'Git analytics failed. Check the output for details.',
            ['Open Output', 'Retry']
          );
          
          throw error;
        } finally {
          // Always clean up state
          this.stateManager.setAnalyzing(false);
          this.stateManager.removeActiveCommand(GitAnalyticsHandler.COMMAND_ID);
          this.currentProcess = null;
        }
      },
      [options]
    );
  }

  /**
   * Execute Python git analysis
   */
  private async executePythonAnalysis(
    workspacePath: string,
    options: GitAnalyticsOptions,
    progress: vscode.Progress<{ increment?: number; message?: string }>
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const analyzerPath = this.getAnalyzerPath();
      
      // Build Python command arguments
      const args = [analyzerPath, workspacePath];
      
      // Add options as arguments
      if (options.dateRange) {
        args.push('--start-date', options.dateRange.start);
        args.push('--end-date', options.dateRange.end);
      }
      if (options.includeAuthorStats === false) {
        args.push('--no-author-stats');
      }
      if (options.includeCommitTimeline === false) {
        args.push('--no-timeline');
      }
      if (options.maxCommits) {
        args.push('--max-commits', options.maxCommits.toString());
      }

      this.errorHandler.logError('Executing Python git analysis', { args }, GitAnalyticsHandler.COMMAND_ID);

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
        this.errorHandler.logError('Python git process timed out', null, GitAnalyticsHandler.COMMAND_ID);
        pythonProcess.kill('SIGTERM');
        reject(new Error(`Git analysis timed out after ${GitAnalyticsHandler.PYTHON_TIMEOUT / 1000} seconds`));
      }, GitAnalyticsHandler.PYTHON_TIMEOUT);

      let stdout = '';
      let stderr = '';

      // Collect stdout
      pythonProcess.stdout?.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        
        // Update progress based on Python output
        this.updateProgressFromGitOutput(chunk, progress);
      });

      // Collect stderr
      pythonProcess.stderr?.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        this.errorHandler.logError('Python git stderr', chunk, GitAnalyticsHandler.COMMAND_ID);
      });

      // Handle process completion
      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        this.currentProcess = null;

        if (code === 0) {
          try {
            // Parse JSON result
            const result = JSON.parse(stdout);
            this.errorHandler.logError('Python git analysis completed', { resultSize: stdout.length }, GitAnalyticsHandler.COMMAND_ID);
            resolve(result);
          } catch (parseError) {
            this.errorHandler.logError('Failed to parse git analysis output', parseError, GitAnalyticsHandler.COMMAND_ID);
            reject(new Error(`Failed to parse git analysis result: ${parseError}`));
          }
        } else {
          const errorMessage = `Python git analysis failed with code ${code}`;
          this.errorHandler.logError(errorMessage, { stderr }, GitAnalyticsHandler.COMMAND_ID);
          reject(new Error(`${errorMessage}: ${stderr}`));
        }
      });

      // Handle process errors
      pythonProcess.on('error', (error) => {
        clearTimeout(timeout);
        this.currentProcess = null;
        this.errorHandler.logError('Python git process error', error, GitAnalyticsHandler.COMMAND_ID);
        reject(new Error(`Failed to start Python git analysis: ${error.message}`));
      });
    });
  }

  /**
   * Update progress based on Python git output
   */
  private updateProgressFromGitOutput(
    output: string,
    progress: vscode.Progress<{ increment?: number; message?: string }>
  ): void {
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('Parsing git log')) {
        progress.report({ increment: 20, message: 'Parsing git log...' });
      } else if (line.includes('Analyzing commits')) {
        progress.report({ increment: 30, message: 'Analyzing commits...' });
      } else if (line.includes('Calculating author contributions')) {
        progress.report({ increment: 25, message: 'Calculating author contributions...' });
      } else if (line.includes('Generating timeline')) {
        progress.report({ increment: 25, message: 'Generating commit timeline...' });
      } else if (line.includes('Git analysis completed')) {
        progress.report({ increment: 100, message: 'Analysis completed!' });
      }
    }
  }

  /**
   * Validate that the workspace is a git repository
   */
  private async validateGitRepository(workspacePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      const gitProcess = spawn('git', ['rev-parse', '--git-dir'], {
        cwd: workspacePath,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      gitProcess.on('close', (code) => {
        resolve(code === 0);
      });

      gitProcess.on('error', () => {
        resolve(false);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        gitProcess.kill('SIGTERM');
        resolve(false);
      }, 5000);
    });
  }

  /**
   * Cancel current Python process
   */
  private cancelCurrentProcess(): void {
    if (this.currentProcess) {
      this.errorHandler.logError('Cancelling Python git analysis process', null, GitAnalyticsHandler.COMMAND_ID);
      
      this.currentProcess.kill('SIGTERM');
      this.currentProcess = null;
      
      // Update state
      this.stateManager.setAnalyzing(false);
      this.stateManager.removeActiveCommand(GitAnalyticsHandler.COMMAND_ID);
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
    const extensionPath = vscode.extensions.getExtension('DevendraDora.doracodelens')?.extensionPath;
    if (!extensionPath) {
      throw new Error('Extension path not found');
    }
    return path.join(extensionPath, 'analyzer', GitAnalyticsHandler.PYTHON_SCRIPT);
  }

  /**
   * Check if analysis is currently running
   */
  public isRunning(): boolean {
    return this.currentProcess !== null;
  }

  /**
   * Get git statistics for a specific date range
   */
  public async getGitStatistics(dateRange?: { start: string; end: string }): Promise<any> {
    const options: GitAnalyticsOptions = {
      dateRange,
      includeAuthorStats: true,
      includeCommitTimeline: true
    };

    return this.execute(options);
  }
}