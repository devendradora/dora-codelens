import * as vscode from 'vscode';
import * as path from 'path';
import { ErrorHandler } from '../core/error-handler';
import { AnalysisStateManager } from '../core/analysis-state-manager';
import { BackgroundAnalysisManager } from './background-analysis-manager';

/**
 * Interface for quick action items
 */
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  command: string;
  tooltip: string;
  contextValue?: string;
}

/**
 * Interface for recent analysis entry
 */
export interface RecentAnalysisEntry {
  timestamp: number;
  type: 'full' | 'current-file' | 'git' | 'database';
  status: 'success' | 'error';
  duration: number;
  filePath?: string;
}

/**
 * Interface for project metrics
 */
export interface ProjectMetrics {
  totalFiles: number;
  totalFunctions: number;
  averageComplexity: number;
  lastAnalyzed: number;
  highComplexityFunctions: number;
}

/**
 * Interface for analysis status
 */
export interface AnalysisStatus {
  isRunning: boolean;
  currentOperation: string;
  progress: number;
  startTime?: number;
}

/**
 * Sidebar tree item for the enhanced sidebar
 */
export class SidebarTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue?: string,
    public readonly command?: vscode.Command,
    public readonly tooltip?: string,
    public readonly iconPath?: string | vscode.ThemeIcon,
    public readonly description?: string
  ) {
    super(label, collapsibleState);
    this.contextValue = contextValue;
    this.command = command;
    this.tooltip = tooltip;
    this.iconPath = iconPath;
    this.description = description;
  }
}

/**
 * Enhanced Sidebar Content Provider with project information and quick actions
 */
export class SidebarContentProvider implements vscode.TreeDataProvider<SidebarTreeItem> {
  private static instance: SidebarContentProvider;
  private errorHandler: ErrorHandler;
  private stateManager: AnalysisStateManager;
  private backgroundAnalysisManager: BackgroundAnalysisManager;
  // Removed codeLensProvider reference - no longer needed in sidebar
  private _onDidChangeTreeData: vscode.EventEmitter<SidebarTreeItem | undefined | null | void> = new vscode.EventEmitter<SidebarTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<SidebarTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  // Data storage
  private recentAnalysis: RecentAnalysisEntry[] = [];
  private projectMetrics: ProjectMetrics | null = null;
  private analysisStatus: AnalysisStatus = {
    isRunning: false,
    currentOperation: '',
    progress: 0
  };


  private constructor(
    errorHandler: ErrorHandler,
    stateManager: AnalysisStateManager,
    backgroundAnalysisManager: BackgroundAnalysisManager
  ) {
    this.errorHandler = errorHandler;
    this.stateManager = stateManager;
    this.backgroundAnalysisManager = backgroundAnalysisManager;
    
    // Listen to state changes for real-time updates
    this.registerStateListeners();
  }

  public static getInstance(
    errorHandler?: ErrorHandler,
    stateManager?: AnalysisStateManager,
    backgroundAnalysisManager?: BackgroundAnalysisManager
  ): SidebarContentProvider {
    if (!SidebarContentProvider.instance) {
      if (!errorHandler || !stateManager || !backgroundAnalysisManager) {
        throw new Error('All parameters required for first initialization');
      }
      SidebarContentProvider.instance = new SidebarContentProvider(
        errorHandler,
        stateManager,
        backgroundAnalysisManager
      );
    }
    return SidebarContentProvider.instance;
  }

  /**
   * Get tree item representation
   */
  getTreeItem(element: SidebarTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children for tree view
   */
  getChildren(element?: SidebarTreeItem): Thenable<SidebarTreeItem[]> {
    if (!element) {
      // Root level - return main sections
      return Promise.resolve(this.getRootSections());
    }

    // Handle section children
    switch (element.contextValue) {
      case 'quickActions':
        return Promise.resolve(this.getQuickActionItems());

      case 'recentAnalysis':
        return Promise.resolve(this.getRecentAnalysisItems());
      case 'projectOverview':
        return Promise.resolve(this.getProjectOverviewItems());
      case 'analysisStatus':
        return Promise.resolve(this.getAnalysisStatusItems());
      default:
        return Promise.resolve([]);
    }
  }

  /**
   * Get root sections
   */
  private getRootSections(): SidebarTreeItem[] {
    const sections: SidebarTreeItem[] = [];

    // Quick Actions section
    sections.push(new SidebarTreeItem(
      'Quick Actions',
      vscode.TreeItemCollapsibleState.Expanded,
      'quickActions',
      undefined,
      'Commonly used commands and actions',
      new vscode.ThemeIcon('zap')
    ));



    // Recent Analysis section
    sections.push(new SidebarTreeItem(
      'Recent Analysis',
      vscode.TreeItemCollapsibleState.Collapsed,
      'recentAnalysis',
      undefined,
      'History of recent analysis operations',
      new vscode.ThemeIcon('history')
    ));

    // Project Overview section
    if (this.projectMetrics) {
      sections.push(new SidebarTreeItem(
        'Project Overview',
        vscode.TreeItemCollapsibleState.Collapsed,
        'projectOverview',
        undefined,
        'Key project metrics and statistics',
        new vscode.ThemeIcon('graph')
      ));
    }

    // Analysis Status section
    if (this.analysisStatus.isRunning) {
      sections.push(new SidebarTreeItem(
        'Analysis Status',
        vscode.TreeItemCollapsibleState.Expanded,
        'analysisStatus',
        undefined,
        'Current analysis operation progress',
        new vscode.ThemeIcon('loading~spin')
      ));
    }

    return sections;
  }

  /**
   * Get quick action items
   */
  private getQuickActionItems(): SidebarTreeItem[] {
    const actions: SidebarTreeItem[] = [];

    // Check if we have a Python file open
    const activeEditor = vscode.window.activeTextEditor;
    const isPythonFile = activeEditor?.document.languageId === 'python';

    if (isPythonFile) {
      // Current file analysis
      actions.push(new SidebarTreeItem(
        'Analyze Current File',
        vscode.TreeItemCollapsibleState.None,
        'quickAction',
        {
          command: 'doracodelens.analyzeCurrentFile',
          title: 'Analyze Current File'
        },
        'Analyze the currently open Python file',
        new vscode.ThemeIcon('file-code')
      ));

      // Removed code lens toggle buttons - complexity indicators are always available when analyzing current file
    }

    // Full project analysis
    actions.push(new SidebarTreeItem(
      'Full Project Analysis',
      vscode.TreeItemCollapsibleState.None,
      'quickAction',
      {
        command: 'doracodelens.analyzeFullCode',
        title: 'Full Project Analysis'
      },
      'Analyze the entire Python project',
      new vscode.ThemeIcon('graph')
    ));

    // Git analytics
    actions.push(new SidebarTreeItem(
      'Git Analytics',
      vscode.TreeItemCollapsibleState.None,
      'quickAction',
      {
        command: 'doracodelens.analyzeGitAnalytics',
        title: 'Git Analytics'
      },
      'Analyze Git repository statistics',
      new vscode.ThemeIcon('git-compare')
    ));

    // Database schema analysis
    actions.push(new SidebarTreeItem(
      'Database Schema',
      vscode.TreeItemCollapsibleState.None,
      'quickAction',
      {
        command: 'doracodelens.analyzeDatabaseSchema',
        title: 'Database Schema'
      },
      'Analyze database schema and relationships',
      new vscode.ThemeIcon('database')
    ));

    // Settings
    actions.push(new SidebarTreeItem(
      'Settings',
      vscode.TreeItemCollapsibleState.None,
      'quickAction',
      {
        command: 'doracodelens.openSettings',
        title: 'Settings'
      },
      'Open DoraCodeLens settings',
      new vscode.ThemeIcon('settings-gear')
    ));

    return actions;
  }

  /**
   * Get recent analysis items
   */
  private getRecentAnalysisItems(): SidebarTreeItem[] {
    const items: SidebarTreeItem[] = [];

    if (this.recentAnalysis.length === 0) {
      items.push(new SidebarTreeItem(
        'No recent analysis',
        vscode.TreeItemCollapsibleState.None,
        'emptyState',
        undefined,
        'Run an analysis to see history here',
        new vscode.ThemeIcon('info'),
        'Run an analysis first'
      ));
      return items;
    }

    // Add clear recent analysis option at the top
    items.push(new SidebarTreeItem(
      'Clear Recent Analysis',
      vscode.TreeItemCollapsibleState.None,
      'quickAction',
      {
        command: 'doracodelens.clearRecentAnalysis',
        title: 'Clear Recent Analysis'
      },
      'Clear all recent analysis history',
      new vscode.ThemeIcon('clear-all')
    ));

    // Show last 5 analyses
    const recentItems = this.recentAnalysis.slice(0, 5);
    
    for (const analysis of recentItems) {
      const timeAgo = this.getTimeAgo(analysis.timestamp);
      const statusIcon = analysis.status === 'success' ? 'check' : 'error';
      const typeLabel = this.getAnalysisTypeLabel(analysis.type);
      
      let description = `${timeAgo} • ${analysis.duration}ms`;
      if (analysis.filePath) {
        description += ` • ${path.basename(analysis.filePath)}`;
      }

      items.push(new SidebarTreeItem(
        typeLabel,
        vscode.TreeItemCollapsibleState.None,
        'recentAnalysisItem',
        undefined,
        `${typeLabel} completed ${timeAgo} (${analysis.duration}ms)`,
        new vscode.ThemeIcon(statusIcon),
        description
      ));
    }

    return items;
  }

  /**
   * Get project overview items
   */
  private getProjectOverviewItems(): SidebarTreeItem[] {
    const items: SidebarTreeItem[] = [];

    if (!this.projectMetrics) {
      items.push(new SidebarTreeItem(
        'No project data',
        vscode.TreeItemCollapsibleState.None,
        'emptyState',
        undefined,
        'Run a full project analysis to see metrics',
        new vscode.ThemeIcon('info'),
        'Run analysis first'
      ));
      return items;
    }

    const metrics = this.projectMetrics;

    // Total files
    items.push(new SidebarTreeItem(
      'Python Files',
      vscode.TreeItemCollapsibleState.None,
      'metric',
      undefined,
      `Total Python files in the project`,
      new vscode.ThemeIcon('file-code'),
      metrics.totalFiles.toString()
    ));

    // Total functions
    items.push(new SidebarTreeItem(
      'Functions',
      vscode.TreeItemCollapsibleState.None,
      'metric',
      undefined,
      `Total functions and methods`,
      new vscode.ThemeIcon('symbol-function'),
      metrics.totalFunctions.toString()
    ));

    // Average complexity
    items.push(new SidebarTreeItem(
      'Avg Complexity',
      vscode.TreeItemCollapsibleState.None,
      'metric',
      undefined,
      `Average cyclomatic complexity`,
      new vscode.ThemeIcon('graph'),
      metrics.averageComplexity.toFixed(1)
    ));

    // High complexity functions
    if (metrics.highComplexityFunctions > 0) {
      items.push(new SidebarTreeItem(
        'High Complexity',
        vscode.TreeItemCollapsibleState.None,
        'metric',
        undefined,
        `Functions with complexity > 10`,
        new vscode.ThemeIcon('warning'),
        metrics.highComplexityFunctions.toString()
      ));
    }

    // Last analyzed
    const lastAnalyzed = this.getTimeAgo(metrics.lastAnalyzed);
    items.push(new SidebarTreeItem(
      'Last Analyzed',
      vscode.TreeItemCollapsibleState.None,
      'metric',
      undefined,
      `Last full project analysis`,
      new vscode.ThemeIcon('clock'),
      lastAnalyzed
    ));

    return items;
  }



  /**
   * Get analysis status items
   */
  private getAnalysisStatusItems(): SidebarTreeItem[] {
    const items: SidebarTreeItem[] = [];

    if (!this.analysisStatus.isRunning) {
      return items;
    }

    // Current operation
    items.push(new SidebarTreeItem(
      this.analysisStatus.currentOperation,
      vscode.TreeItemCollapsibleState.None,
      'statusItem',
      undefined,
      `Current operation: ${this.analysisStatus.currentOperation}`,
      new vscode.ThemeIcon('loading~spin')
    ));

    // Progress
    if (this.analysisStatus.progress > 0) {
      items.push(new SidebarTreeItem(
        'Progress',
        vscode.TreeItemCollapsibleState.None,
        'statusItem',
        undefined,
        `Analysis progress: ${this.analysisStatus.progress}%`,
        new vscode.ThemeIcon('graph'),
        `${this.analysisStatus.progress}%`
      ));
    }

    // Duration
    if (this.analysisStatus.startTime) {
      const duration = Date.now() - this.analysisStatus.startTime;
      const seconds = Math.floor(duration / 1000);
      items.push(new SidebarTreeItem(
        'Duration',
        vscode.TreeItemCollapsibleState.None,
        'statusItem',
        undefined,
        `Time elapsed: ${seconds} seconds`,
        new vscode.ThemeIcon('clock'),
        `${seconds}s`
      ));
    }

    return items;
  }

  /**
   * Add recent analysis entry
   */
  public addRecentAnalysis(entry: RecentAnalysisEntry): void {
    this.recentAnalysis.unshift(entry);
    
    // Keep only last 10 entries
    if (this.recentAnalysis.length > 10) {
      this.recentAnalysis = this.recentAnalysis.slice(0, 10);
    }
    
    this.refresh();
    
    this.errorHandler.logError(
      'Recent analysis entry added',
      { type: entry.type, status: entry.status },
      'SidebarContentProvider'
    );
  }

  /**
   * Update project metrics
   */
  public updateProjectMetrics(metrics: ProjectMetrics): void {
    this.projectMetrics = metrics;
    this.refresh();
    
    this.errorHandler.logError(
      'Project metrics updated',
      metrics,
      'SidebarContentProvider'
    );
  }

  /**
   * Update analysis status
   */
  public updateAnalysisStatus(status: AnalysisStatus): void {
    this.analysisStatus = status;
    this.refresh();
  }

  /**
   * Refresh the tree view
   */
  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Register state listeners for real-time updates
   */
  private registerStateListeners(): void {
    // Listen to state manager changes
    this.stateManager.addStateChangeListener((state) => {
      // Update analysis status based on state
      this.updateAnalysisStatus({
        isRunning: state.isAnalyzing,
        currentOperation: state.isAnalyzing ? 'Analyzing...' : '',
        progress: 0,
        startTime: state.isAnalyzing ? Date.now() : undefined
      });
    });

    // Listen to code lens state changes to refresh sidebar
    // Note: Command is registered in CommandManager, we just need to refresh when it's executed
    // The command execution will be handled by CommandManager.handleCodeLensStateChanged()
  }

  /**
   * Get human-readable time ago string
   */
  private getTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return `${seconds}s ago`;
    }
  }

  /**
   * Get analysis type label
   */
  private getAnalysisTypeLabel(type: string): string {
    switch (type) {
      case 'full':
        return 'Full Project';
      case 'current-file':
        return 'Current File';
      case 'git':
        return 'Git Analytics';
      case 'database':
        return 'Database Schema';
      default:
        return 'Analysis';
    }
  }

  // Removed setCodeLensProvider - no longer needed in sidebar

  // Removed onCodeLensStateChanged - no longer needed in sidebar



  /**
   * Clear recent analysis
   */
  public clearRecentAnalysis(): void {
    this.recentAnalysis = [];
    this.refresh();
    
    this.errorHandler.logError(
      'Recent analysis cleared',
      null,
      'SidebarContentProvider'
    );
  }



  /**
   * Clear all data
   */
  public clear(): void {
    this.recentAnalysis = [];
    this.projectMetrics = null;
    // Removed currentFileComplexities - now handled by code lens provider
    this.analysisStatus = {
      isRunning: false,
      currentOperation: '',
      progress: 0
    };
    this.refresh();
  }
}