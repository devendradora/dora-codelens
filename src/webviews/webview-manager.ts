import * as vscode from 'vscode';
import { ErrorHandler } from '../core/error-handler';
import { FullCodeAnalysisWebview } from './full-code-analysis-webview';
import { CurrentFileAnalysisWebview } from './current-file-analysis-webview';
import { GitAnalyticsWebview } from './git-analytics-webview';
import { DatabaseSchemaWebview } from './database-schema-webview';

/**
 * Webview Manager
 * Manages all dedicated webview providers and coordinates their lifecycle
 */
export class WebviewManager {
  private errorHandler: ErrorHandler;
  private extensionPath: string;
  
  // Webview providers
  private fullCodeAnalysisWebview: FullCodeAnalysisWebview;
  private currentFileAnalysisWebview: CurrentFileAnalysisWebview;
  private gitAnalyticsWebview: GitAnalyticsWebview;
  private databaseSchemaWebview: DatabaseSchemaWebview;

  constructor(errorHandler: ErrorHandler, extensionPath: string) {
    this.errorHandler = errorHandler;
    this.extensionPath = extensionPath;
    
    // Initialize webview providers
    this.fullCodeAnalysisWebview = new FullCodeAnalysisWebview(errorHandler, extensionPath);
    this.currentFileAnalysisWebview = new CurrentFileAnalysisWebview(errorHandler, extensionPath);
    this.gitAnalyticsWebview = new GitAnalyticsWebview(errorHandler, extensionPath);
    this.databaseSchemaWebview = new DatabaseSchemaWebview(errorHandler, extensionPath);
  }

  /**
   * Show full code analysis webview
   */
  public showFullCodeAnalysis(analysisData: any): void {
    try {
      this.fullCodeAnalysisWebview.show(analysisData);
      this.errorHandler.logError('Full code analysis webview shown via manager', null, 'WebviewManager');
    } catch (error) {
      this.errorHandler.logError('Failed to show full code analysis webview', error, 'WebviewManager');
      vscode.window.showErrorMessage('Failed to display full code analysis results');
    }
  }

  /**
   * Show current file analysis webview
   */
  public showCurrentFileAnalysis(analysisData: any, filePath?: string): void {
    try {
      this.currentFileAnalysisWebview.show(analysisData, filePath);
      this.errorHandler.logError('Current file analysis webview shown via manager', { filePath }, 'WebviewManager');
    } catch (error) {
      this.errorHandler.logError('Failed to show current file analysis webview', error, 'WebviewManager');
      vscode.window.showErrorMessage('Failed to display current file analysis results');
    }
  }

  /**
   * Show Git analytics webview
   */
  public showGitAnalytics(analyticsData: any): void {
    try {
      this.gitAnalyticsWebview.show(analyticsData);
      this.errorHandler.logError('Git analytics webview shown via manager', null, 'WebviewManager');
    } catch (error) {
      this.errorHandler.logError('Failed to show Git analytics webview', error, 'WebviewManager');
      vscode.window.showErrorMessage('Failed to display Git analytics results');
    }
  }

  /**
   * Show database schema webview
   */
  public showDatabaseSchema(schemaData: any): void {
    try {
      this.databaseSchemaWebview.show(schemaData);
      this.errorHandler.logError('Database schema webview shown via manager', null, 'WebviewManager');
    } catch (error) {
      this.errorHandler.logError('Failed to show database schema webview', error, 'WebviewManager');
      vscode.window.showErrorMessage('Failed to display database schema visualization');
    }
  }

  /**
   * Get webview visibility status
   */
  public getWebviewStatus(): {
    fullCodeAnalysis: boolean;
    currentFileAnalysis: boolean;
    gitAnalytics: boolean;
    databaseSchema: boolean;
  } {
    return {
      fullCodeAnalysis: this.fullCodeAnalysisWebview.isVisible(),
      currentFileAnalysis: this.currentFileAnalysisWebview.isVisible(),
      gitAnalytics: this.gitAnalyticsWebview.isVisible(),
      databaseSchema: this.databaseSchemaWebview.isVisible()
    };
  }

  /**
   * Close all webviews
   */
  public closeAllWebviews(): void {
    try {
      this.fullCodeAnalysisWebview.dispose();
      this.currentFileAnalysisWebview.dispose();
      this.gitAnalyticsWebview.dispose();
      this.databaseSchemaWebview.dispose();
      
      this.errorHandler.logError('All webviews closed', null, 'WebviewManager');
    } catch (error) {
      this.errorHandler.logError('Error closing webviews', error, 'WebviewManager');
    }
  }

  /**
   * Close specific webview by type
   */
  public closeWebview(type: 'fullCode' | 'currentFile' | 'gitAnalytics' | 'databaseSchema'): void {
    try {
      switch (type) {
        case 'fullCode':
          this.fullCodeAnalysisWebview.dispose();
          break;
        case 'currentFile':
          this.currentFileAnalysisWebview.dispose();
          break;
        case 'gitAnalytics':
          this.gitAnalyticsWebview.dispose();
          break;
        case 'databaseSchema':
          this.databaseSchemaWebview.dispose();
          break;
        default:
          this.errorHandler.logError('Unknown webview type for closing', { type }, 'WebviewManager');
      }
      
      this.errorHandler.logError('Webview closed', { type }, 'WebviewManager');
    } catch (error) {
      this.errorHandler.logError('Error closing webview', error, 'WebviewManager');
    }
  }

  /**
   * Handle analysis result and show appropriate webview
   */
  public handleAnalysisResult(analysisType: string, result: any, context?: any): void {
    try {
      switch (analysisType) {
        case 'fullCode':
        case 'fullCodeAnalysis':
          this.showFullCodeAnalysis(result);
          break;
          
        case 'currentFile':
        case 'currentFileAnalysis':
          this.showCurrentFileAnalysis(result, context?.filePath);
          break;
          
        case 'gitAnalytics':
        case 'git':
          this.showGitAnalytics(result);
          break;
          
        case 'databaseSchema':
        case 'database':
        case 'schema':
          this.showDatabaseSchema(result);
          break;
          
        default:
          this.errorHandler.logError('Unknown analysis type', { analysisType }, 'WebviewManager');
          vscode.window.showWarningMessage(`Unknown analysis type: ${analysisType}`);
      }
    } catch (error) {
      this.errorHandler.logError('Failed to handle analysis result', error, 'WebviewManager');
      vscode.window.showErrorMessage('Failed to display analysis results');
    }
  }

  /**
   * Register webview commands
   */
  public registerCommands(context: vscode.ExtensionContext): void {
    try {
      // Command to show full code analysis
      const showFullCodeCommand = vscode.commands.registerCommand(
        'doracodebirdview.showFullCodeAnalysis',
        (analysisData: any) => {
          this.showFullCodeAnalysis(analysisData);
        }
      );

      // Command to show current file analysis
      const showCurrentFileCommand = vscode.commands.registerCommand(
        'doracodebirdview.showCurrentFileAnalysis',
        (analysisData: any, filePath?: string) => {
          this.showCurrentFileAnalysis(analysisData, filePath);
        }
      );

      // Command to show Git analytics
      const showGitAnalyticsCommand = vscode.commands.registerCommand(
        'doracodebirdview.showGitAnalytics',
        (analyticsData: any) => {
          this.showGitAnalytics(analyticsData);
        }
      );

      // Command to show database schema
      const showDatabaseSchemaCommand = vscode.commands.registerCommand(
        'doracodebirdview.showDatabaseSchema',
        (schemaData: any) => {
          this.showDatabaseSchema(schemaData);
        }
      );

      // Command to close all webviews
      const closeAllWebviewsCommand = vscode.commands.registerCommand(
        'doracodebirdview.closeAllWebviews',
        () => {
          this.closeAllWebviews();
        }
      );

      // Command to get webview status
      const getWebviewStatusCommand = vscode.commands.registerCommand(
        'doracodebirdview.getWebviewStatus',
        () => {
          return this.getWebviewStatus();
        }
      );

      // Register all commands
      context.subscriptions.push(
        showFullCodeCommand,
        showCurrentFileCommand,
        showGitAnalyticsCommand,
        showDatabaseSchemaCommand,
        closeAllWebviewsCommand,
        getWebviewStatusCommand
      );

      this.errorHandler.logError('Webview commands registered', null, 'WebviewManager');
    } catch (error) {
      this.errorHandler.logError('Failed to register webview commands', error, 'WebviewManager');
    }
  }

  /**
   * Update webview content if already visible
   */
  public updateWebviewContent(analysisType: string, result: any, context?: any): boolean {
    try {
      switch (analysisType) {
        case 'fullCode':
        case 'fullCodeAnalysis':
          if (this.fullCodeAnalysisWebview.isVisible()) {
            this.showFullCodeAnalysis(result);
            return true;
          }
          break;
          
        case 'currentFile':
        case 'currentFileAnalysis':
          if (this.currentFileAnalysisWebview.isVisible()) {
            this.showCurrentFileAnalysis(result, context?.filePath);
            return true;
          }
          break;
          
        case 'gitAnalytics':
        case 'git':
          if (this.gitAnalyticsWebview.isVisible()) {
            this.showGitAnalytics(result);
            return true;
          }
          break;
          
        case 'databaseSchema':
        case 'database':
        case 'schema':
          if (this.databaseSchemaWebview.isVisible()) {
            this.showDatabaseSchema(result);
            return true;
          }
          break;
      }
      
      return false;
    } catch (error) {
      this.errorHandler.logError('Failed to update webview content', error, 'WebviewManager');
      return false;
    }
  }

  /**
   * Check if any webviews are currently visible
   */
  public hasVisibleWebviews(): boolean {
    const status = this.getWebviewStatus();
    return Object.values(status).some(visible => visible);
  }

  /**
   * Get count of visible webviews
   */
  public getVisibleWebviewCount(): number {
    const status = this.getWebviewStatus();
    return Object.values(status).filter(visible => visible).length;
  }

  /**
   * Dispose of all webview providers
   */
  public dispose(): void {
    try {
      this.closeAllWebviews();
      this.errorHandler.logError('WebviewManager disposed', null, 'WebviewManager');
    } catch (error) {
      this.errorHandler.logError('Error disposing WebviewManager', error, 'WebviewManager');
    }
  }

  /**
   * Handle webview lifecycle events
   */
  public onWebviewDisposed(webviewType: string): void {
    this.errorHandler.logError('Webview disposed', { webviewType }, 'WebviewManager');
  }

  /**
   * Handle webview errors
   */
  public onWebviewError(webviewType: string, error: any): void {
    this.errorHandler.logError('Webview error', error, `WebviewManager.${webviewType}`);
    vscode.window.showErrorMessage(`Error in ${webviewType} webview: ${error.message || error}`);
  }

  /**
   * Validate analysis data before showing webview
   */
  private validateAnalysisData(analysisType: string, data: any): boolean {
    if (!data) {
      this.errorHandler.logError('No analysis data provided', { analysisType }, 'WebviewManager');
      return false;
    }

    switch (analysisType) {
      case 'fullCode':
      case 'fullCodeAnalysis':
        return data.code_graph_json || data.tech_stack || data.dependencies;
        
      case 'currentFile':
      case 'currentFileAnalysis':
        return data.complexity_metrics || data.dependencies || data.framework_patterns;
        
      case 'gitAnalytics':
      case 'git':
        return data.repository_info || data.authorContributions || data.commitTimeline;
        
      case 'databaseSchema':
      case 'database':
      case 'schema':
        return data.tables || data.relationships || data.metadata;
        
      default:
        return true;
    }
  }

  /**
   * Show analysis result with validation
   */
  public showAnalysisResult(analysisType: string, result: any, context?: any): void {
    try {
      if (!this.validateAnalysisData(analysisType, result)) {
        vscode.window.showWarningMessage(`Invalid or empty analysis data for ${analysisType}`);
        return;
      }

      this.handleAnalysisResult(analysisType, result, context);
    } catch (error) {
      this.errorHandler.logError('Failed to show analysis result', error, 'WebviewManager');
      vscode.window.showErrorMessage('Failed to display analysis results');
    }
  }
}