import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { ErrorHandler } from '../core/error-handler';

/**
 * Python execution options
 */
export interface PythonExecutionOptions {
  timeout?: number;
  cwd?: string;
  env?: Record<string, string>;
  args?: string[];
}

/**
 * Python execution result
 */
export interface PythonExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
}

/**
 * Python service for managing Python process execution
 */
export class PythonService {
  private static instance: PythonService;
  private errorHandler: ErrorHandler;
  private activeProcesses: Map<string, ChildProcess> = new Map();

  private constructor(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;
  }

  public static getInstance(errorHandler?: ErrorHandler): PythonService {
    if (!PythonService.instance) {
      if (!errorHandler) {
        throw new Error('ErrorHandler required for first initialization');
      }
      PythonService.instance = new PythonService(errorHandler);
    }
    return PythonService.instance;
  }

  /**
   * Execute Python script with proper process management
   */
  public async executePythonScript(
    scriptPath: string,
    options: PythonExecutionOptions = {}
  ): Promise<PythonExecutionResult> {
    const startTime = Date.now();
    const processId = `python_${Date.now()}_${Math.random()}`;
    
    return new Promise((resolve) => {
      // Validate script exists
      if (!fs.existsSync(scriptPath)) {
        const error = `Python script not found: ${scriptPath}`;
        this.errorHandler.logError(error, null, 'executePythonScript');
        resolve({
          success: false,
          stdout: '',
          stderr: error,
          exitCode: -1,
          executionTime: Date.now() - startTime
        });
        return;
      }

      // Build command arguments
      const args = [scriptPath, ...(options.args || [])];
      const timeout = options.timeout || 60000; // Default 1 minute

      this.errorHandler.logError('Executing Python script', { scriptPath, args }, 'executePythonScript');

      // Get configured Python path
      const pythonPath = vscode.workspace.getConfiguration('doracodebirdview').get<string>('pythonPath', 'python3');

      // Spawn Python process
      const pythonProcess = spawn(pythonPath, args, {
        cwd: options.cwd || path.dirname(scriptPath),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...options.env }
      });

      // Track active process
      this.activeProcesses.set(processId, pythonProcess);

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        this.errorHandler.logError('Python process timed out', { processId, timeout }, 'executePythonScript');
        pythonProcess.kill('SIGTERM');
      }, timeout);

      let stdout = '';
      let stderr = '';

      // Collect stdout
      pythonProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      // Collect stderr
      pythonProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle process completion
      pythonProcess.on('close', (code) => {
        clearTimeout(timeoutHandle);
        this.activeProcesses.delete(processId);
        
        const executionTime = Date.now() - startTime;
        const success = code === 0;

        this.errorHandler.logError(
          `Python process completed`,
          { processId, exitCode: code, executionTime, success },
          'executePythonScript'
        );

        resolve({
          success,
          stdout,
          stderr,
          exitCode: code || -1,
          executionTime
        });
      });

      // Handle process errors
      pythonProcess.on('error', (error) => {
        clearTimeout(timeoutHandle);
        this.activeProcesses.delete(processId);
        
        const executionTime = Date.now() - startTime;
        this.errorHandler.logError('Python process error', error, 'executePythonScript');

        resolve({
          success: false,
          stdout,
          stderr: `Process error: ${error.message}`,
          exitCode: -1,
          executionTime
        });
      });
    });
  }

  /**
   * Execute Python script and parse JSON result
   */
  public async executePythonScriptForJSON<T = any>(
    scriptPath: string,
    options: PythonExecutionOptions = {}
  ): Promise<T | null> {
    const result = await this.executePythonScript(scriptPath, options);
    
    if (!result.success) {
      this.errorHandler.logError(
        'Python script execution failed',
        { stderr: result.stderr, exitCode: result.exitCode },
        'executePythonScriptForJSON'
      );
      return null;
    }

    try {
      const jsonResult = JSON.parse(result.stdout);
      return jsonResult as T;
    } catch (parseError) {
      this.errorHandler.logError(
        'Failed to parse Python JSON output',
        { parseError, stdout: result.stdout.substring(0, 500) },
        'executePythonScriptForJSON'
      );
      return null;
    }
  }

  /**
   * Check if Python is available
   */
  public async checkPythonAvailability(): Promise<boolean> {
    try {
      const result = await this.executePythonScript('', {
        args: ['--version'],
        timeout: 5000
      });
      return result.success;
    } catch (error) {
      this.errorHandler.logError('Python availability check failed', error, 'checkPythonAvailability');
      return false;
    }
  }

  /**
   * Get Python version
   */
  public async getPythonVersion(): Promise<string | null> {
    try {
      const result = await this.executePythonScript('', {
        args: ['--version'],
        timeout: 5000
      });
      
      if (result.success) {
        return result.stdout.trim() || result.stderr.trim();
      }
      return null;
    } catch (error) {
      this.errorHandler.logError('Failed to get Python version', error, 'getPythonVersion');
      return null;
    }
  }

  /**
   * Kill all active Python processes
   */
  public killAllActiveProcesses(): void {
    this.errorHandler.logError(
      `Killing ${this.activeProcesses.size} active Python processes`,
      null,
      'killAllActiveProcesses'
    );

    for (const [processId, process] of this.activeProcesses) {
      try {
        process.kill('SIGTERM');
        this.errorHandler.logError(`Killed Python process: ${processId}`, null, 'killAllActiveProcesses');
      } catch (error) {
        this.errorHandler.logError(`Failed to kill Python process: ${processId}`, error, 'killAllActiveProcesses');
      }
    }

    this.activeProcesses.clear();
  }

  /**
   * Get active process count
   */
  public getActiveProcessCount(): number {
    return this.activeProcesses.size;
  }

  /**
   * Get analyzer script path
   */
  public getAnalyzerScriptPath(scriptName: string): string {
    const extensionPath = vscode.extensions.getExtension('doracodebird.doracodebird-view')?.extensionPath;
    if (!extensionPath) {
      throw new Error('Extension path not found');
    }
    return path.join(extensionPath, 'analyzer', scriptName);
  }

  /**
   * Validate analyzer dependencies
   */
  public async validateAnalyzerDependencies(): Promise<{ valid: boolean; missing: string[] }> {
    const requiredScripts = [
      'analyzer.py',
      'current_file_analyzer.py',
      'git_analytics_runner.py',
      'run_database_schema_analysis.py'
    ];

    const missing: string[] = [];
    
    for (const script of requiredScripts) {
      const scriptPath = this.getAnalyzerScriptPath(script);
      if (!fs.existsSync(scriptPath)) {
        missing.push(script);
      }
    }

    const valid = missing.length === 0;
    
    if (!valid) {
      this.errorHandler.logError(
        'Missing analyzer dependencies',
        { missing },
        'validateAnalyzerDependencies'
      );
    }

    return { valid, missing };
  }

  /**
   * Execute analyzer with progress tracking
   */
  public async executeAnalyzerWithProgress(
    scriptName: string,
    args: string[],
    progress: vscode.Progress<{ increment?: number; message?: string }>,
    options: PythonExecutionOptions = {}
  ): Promise<any> {
    const scriptPath = this.getAnalyzerScriptPath(scriptName);
    const processId = `analyzer_${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      // Get configured Python path
      const pythonPath = vscode.workspace.getConfiguration('doracodebirdview').get<string>('pythonPath', 'python3');

      const pythonProcess = spawn(pythonPath, [scriptPath, ...args], {
        cwd: options.cwd || path.dirname(scriptPath),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...options.env }
      });

      this.activeProcesses.set(processId, pythonProcess);

      const timeout = setTimeout(() => {
        pythonProcess.kill('SIGTERM');
        reject(new Error(`Analyzer timed out after ${options.timeout || 60000}ms`));
      }, options.timeout || 60000);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout?.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        
        // Update progress based on output
        this.updateProgressFromOutput(chunk, progress);
      });

      pythonProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        this.activeProcesses.delete(processId);

        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (parseError) {
            reject(new Error(`Failed to parse analyzer result: ${parseError}`));
          }
        } else {
          reject(new Error(`Analyzer failed with code ${code}: ${stderr}`));
        }
      });

      pythonProcess.on('error', (error) => {
        clearTimeout(timeout);
        this.activeProcesses.delete(processId);
        reject(new Error(`Failed to start analyzer: ${error.message}`));
      });
    });
  }

  /**
   * Update progress based on Python output
   */
  private updateProgressFromOutput(
    output: string,
    progress: vscode.Progress<{ increment?: number; message?: string }>
  ): void {
    const lines = output.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes('Starting') || trimmed.includes('Initializing')) {
        progress.report({ message: trimmed });
      } else if (trimmed.includes('Processing') || trimmed.includes('Analyzing')) {
        progress.report({ increment: 5, message: trimmed });
      } else if (trimmed.includes('Completed') || trimmed.includes('Finished')) {
        progress.report({ increment: 10, message: trimmed });
      }
    }
  }

  /**
   * Dispose of the service
   */
  public dispose(): void {
    this.killAllActiveProcesses();
  }
}