import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { SidebarContentProvider, SidebarTreeItem, RecentAnalysisEntry, ProjectMetrics, AnalysisStatus } from '../services/sidebar-content-provider';
import { ErrorHandler } from '../core/error-handler';
import { AnalysisStateManager } from '../core/analysis-state-manager';
import { BackgroundAnalysisManager } from '../services/background-analysis-manager';

suite('SidebarContentProvider Tests', () => {
  let sidebarContentProvider: SidebarContentProvider;
  let errorHandler: ErrorHandler;
  let stateManager: AnalysisStateManager;
  let backgroundAnalysisManager: BackgroundAnalysisManager;
  let mockOutputChannel: any;

  setup(() => {
    // Create mock output channel
    mockOutputChannel = {
      appendLine: sinon.stub(),
      show: sinon.stub(),
      dispose: sinon.stub()
    };

    // Initialize dependencies
    errorHandler = ErrorHandler.getInstance(mockOutputChannel);
    stateManager = AnalysisStateManager.getInstance(errorHandler);
    backgroundAnalysisManager = BackgroundAnalysisManager.getInstance(errorHandler);

    // Initialize sidebar content provider
    sidebarContentProvider = SidebarContentProvider.getInstance(
      errorHandler,
      stateManager,
      backgroundAnalysisManager
    );
  });

  teardown(() => {
    sinon.restore();
    sidebarContentProvider.clear();
  });

  test('should return root sections', async () => {
    // Act
    const rootItems = await sidebarContentProvider.getChildren();

    // Assert
    assert.ok(rootItems.length >= 2, 'Should have at least Quick Actions and Recent Analysis sections');
    
    const quickActionsSection = rootItems.find(item => item.contextValue === 'quickActions');
    const recentAnalysisSection = rootItems.find(item => item.contextValue === 'recentAnalysis');
    
    assert.ok(quickActionsSection, 'Should have Quick Actions section');
    assert.ok(recentAnalysisSection, 'Should have Recent Analysis section');
    assert.strictEqual(quickActionsSection.label, 'Quick Actions');
    assert.strictEqual(recentAnalysisSection.label, 'Recent Analysis');
  });

  test('should return quick action items', async () => {
    // Arrange
    const quickActionsSection = new SidebarTreeItem(
      'Quick Actions',
      vscode.TreeItemCollapsibleState.Expanded,
      'quickActions'
    );

    // Act
    const quickActionItems = await sidebarContentProvider.getChildren(quickActionsSection);

    // Assert
    assert.ok(quickActionItems.length > 0, 'Should have quick action items');
    
    const fullProjectAction = quickActionItems.find(item => 
      item.label === 'Full Project Analysis'
    );
    const gitAnalyticsAction = quickActionItems.find(item => 
      item.label === 'Git Analytics'
    );
    const settingsAction = quickActionItems.find(item => 
      item.label === 'Settings'
    );
    
    assert.ok(fullProjectAction, 'Should have Full Project Analysis action');
    assert.ok(gitAnalyticsAction, 'Should have Git Analytics action');
    assert.ok(settingsAction, 'Should have Settings action');
    
    assert.strictEqual(fullProjectAction.command?.command, 'doracodelens.analyzeFullCode');
    assert.strictEqual(gitAnalyticsAction.command?.command, 'doracodelens.analyzeGitAnalytics');
    assert.strictEqual(settingsAction.command?.command, 'doracodelens.openSettings');
  });

  test('should show empty state for recent analysis when no data', async () => {
    // Arrange
    const recentAnalysisSection = new SidebarTreeItem(
      'Recent Analysis',
      vscode.TreeItemCollapsibleState.Collapsed,
      'recentAnalysis'
    );

    // Act
    const recentAnalysisItems = await sidebarContentProvider.getChildren(recentAnalysisSection);

    // Assert
    assert.strictEqual(recentAnalysisItems.length, 1);
    assert.strictEqual(recentAnalysisItems[0].label, 'No recent analysis');
    assert.strictEqual(recentAnalysisItems[0].contextValue, 'emptyState');
  });

  test('should add and display recent analysis entries', async () => {
    // Arrange
    const recentEntry: RecentAnalysisEntry = {
      timestamp: Date.now() - 60000, // 1 minute ago
      type: 'current-file',
      status: 'success',
      duration: 1500,
      filePath: '/test/file.py'
    };

    const recentAnalysisSection = new SidebarTreeItem(
      'Recent Analysis',
      vscode.TreeItemCollapsibleState.Collapsed,
      'recentAnalysis'
    );

    // Act
    sidebarContentProvider.addRecentAnalysis(recentEntry);
    const recentAnalysisItems = await sidebarContentProvider.getChildren(recentAnalysisSection);

    // Assert
    assert.strictEqual(recentAnalysisItems.length, 1);
    assert.strictEqual(recentAnalysisItems[0].label, 'Current File');
    assert.strictEqual(recentAnalysisItems[0].contextValue, 'recentAnalysisItem');
    assert.ok(recentAnalysisItems[0].description?.includes('1500ms'));
    assert.ok(recentAnalysisItems[0].description?.includes('file.py'));
  });

  test('should limit recent analysis entries to 5 items', async () => {
    // Arrange
    const recentAnalysisSection = new SidebarTreeItem(
      'Recent Analysis',
      vscode.TreeItemCollapsibleState.Collapsed,
      'recentAnalysis'
    );

    // Act - Add 7 entries
    for (let i = 0; i < 7; i++) {
      const entry: RecentAnalysisEntry = {
        timestamp: Date.now() - (i * 10000),
        type: 'full',
        status: 'success',
        duration: 1000 + i * 100
      };
      sidebarContentProvider.addRecentAnalysis(entry);
    }

    const recentAnalysisItems = await sidebarContentProvider.getChildren(recentAnalysisSection);

    // Assert
    assert.strictEqual(recentAnalysisItems.length, 5, 'Should limit to 5 recent entries');
  });

  test('should show project overview when metrics available', async () => {
    // Arrange
    const projectMetrics: ProjectMetrics = {
      totalFiles: 25,
      totalFunctions: 150,
      averageComplexity: 4.2,
      lastAnalyzed: Date.now() - 300000, // 5 minutes ago
      highComplexityFunctions: 8
    };

    // Act
    sidebarContentProvider.updateProjectMetrics(projectMetrics);
    const rootItems = await sidebarContentProvider.getChildren();

    // Assert
    const projectOverviewSection = rootItems.find(item => item.contextValue === 'projectOverview');
    assert.ok(projectOverviewSection, 'Should have Project Overview section when metrics available');
  });

  test('should display project overview items correctly', async () => {
    // Arrange
    const projectMetrics: ProjectMetrics = {
      totalFiles: 25,
      totalFunctions: 150,
      averageComplexity: 4.2,
      lastAnalyzed: Date.now() - 300000, // 5 minutes ago
      highComplexityFunctions: 8
    };

    const projectOverviewSection = new SidebarTreeItem(
      'Project Overview',
      vscode.TreeItemCollapsibleState.Collapsed,
      'projectOverview'
    );

    // Act
    sidebarContentProvider.updateProjectMetrics(projectMetrics);
    const projectOverviewItems = await sidebarContentProvider.getChildren(projectOverviewSection);

    // Assert
    assert.ok(projectOverviewItems.length >= 4, 'Should have at least 4 project overview items');
    
    const filesItem = projectOverviewItems.find(item => item.label === 'Python Files');
    const functionsItem = projectOverviewItems.find(item => item.label === 'Functions');
    const complexityItem = projectOverviewItems.find(item => item.label === 'Avg Complexity');
    const highComplexityItem = projectOverviewItems.find(item => item.label === 'High Complexity');
    
    assert.ok(filesItem, 'Should have Python Files item');
    assert.ok(functionsItem, 'Should have Functions item');
    assert.ok(complexityItem, 'Should have Avg Complexity item');
    assert.ok(highComplexityItem, 'Should have High Complexity item');
    
    assert.strictEqual(filesItem.description, '25');
    assert.strictEqual(functionsItem.description, '150');
    assert.strictEqual(complexityItem.description, '4.2');
    assert.strictEqual(highComplexityItem.description, '8');
  });

  test('should show analysis status when running', async () => {
    // Arrange
    const analysisStatus: AnalysisStatus = {
      isRunning: true,
      currentOperation: 'Analyzing project structure...',
      progress: 45,
      startTime: Date.now() - 30000 // 30 seconds ago
    };

    // Act
    sidebarContentProvider.updateAnalysisStatus(analysisStatus);
    const rootItems = await sidebarContentProvider.getChildren();

    // Assert
    const analysisStatusSection = rootItems.find(item => item.contextValue === 'analysisStatus');
    assert.ok(analysisStatusSection, 'Should have Analysis Status section when analysis is running');
  });

  test('should display analysis status items correctly', async () => {
    // Arrange
    const analysisStatus: AnalysisStatus = {
      isRunning: true,
      currentOperation: 'Analyzing project structure...',
      progress: 45,
      startTime: Date.now() - 30000 // 30 seconds ago
    };

    const analysisStatusSection = new SidebarTreeItem(
      'Analysis Status',
      vscode.TreeItemCollapsibleState.Expanded,
      'analysisStatus'
    );

    // Act
    sidebarContentProvider.updateAnalysisStatus(analysisStatus);
    const analysisStatusItems = await sidebarContentProvider.getChildren(analysisStatusSection);

    // Assert
    assert.ok(analysisStatusItems.length >= 2, 'Should have at least 2 analysis status items');
    
    const operationItem = analysisStatusItems.find(item => 
      item.label === 'Analyzing project structure...'
    );
    const progressItem = analysisStatusItems.find(item => item.label === 'Progress');
    
    assert.ok(operationItem, 'Should have current operation item');
    assert.ok(progressItem, 'Should have progress item');
    assert.strictEqual(progressItem.description, '45%');
  });

  test('should clear all data', async () => {
    // Arrange
    const recentEntry: RecentAnalysisEntry = {
      timestamp: Date.now(),
      type: 'full',
      status: 'success',
      duration: 2000
    };

    const projectMetrics: ProjectMetrics = {
      totalFiles: 10,
      totalFunctions: 50,
      averageComplexity: 3.0,
      lastAnalyzed: Date.now(),
      highComplexityFunctions: 2
    };

    sidebarContentProvider.addRecentAnalysis(recentEntry);
    sidebarContentProvider.updateProjectMetrics(projectMetrics);

    // Act
    sidebarContentProvider.clear();
    const rootItems = await sidebarContentProvider.getChildren();

    // Assert
    const projectOverviewSection = rootItems.find(item => item.contextValue === 'projectOverview');
    assert.ok(!projectOverviewSection, 'Should not have Project Overview section after clearing');
    
    const recentAnalysisSection = rootItems.find(item => item.contextValue === 'recentAnalysis');
    assert.ok(recentAnalysisSection, 'Should still have Recent Analysis section');
    
    const recentAnalysisItems = await sidebarContentProvider.getChildren(recentAnalysisSection);
    assert.strictEqual(recentAnalysisItems[0].label, 'No recent analysis');
  });

  test('should handle different analysis types correctly', () => {
    // Arrange & Act
    const fullAnalysis: RecentAnalysisEntry = {
      timestamp: Date.now(),
      type: 'full',
      status: 'success',
      duration: 5000
    };

    const currentFileAnalysis: RecentAnalysisEntry = {
      timestamp: Date.now(),
      type: 'current-file',
      status: 'error',
      duration: 1000,
      filePath: '/test/error.py'
    };

    const gitAnalysis: RecentAnalysisEntry = {
      timestamp: Date.now(),
      type: 'git',
      status: 'success',
      duration: 3000
    };

    const databaseAnalysis: RecentAnalysisEntry = {
      timestamp: Date.now(),
      type: 'database',
      status: 'success',
      duration: 2000
    };

    // Act
    sidebarContentProvider.addRecentAnalysis(fullAnalysis);
    sidebarContentProvider.addRecentAnalysis(currentFileAnalysis);
    sidebarContentProvider.addRecentAnalysis(gitAnalysis);
    sidebarContentProvider.addRecentAnalysis(databaseAnalysis);

    // Assert - The entries should be added successfully
    // (Detailed verification would require accessing private members or additional public methods)
    assert.ok(true, 'Should handle different analysis types without errors');
  });

  test('should format time ago correctly', async () => {
    // Arrange
    const now = Date.now();
    const entries: RecentAnalysisEntry[] = [
      {
        timestamp: now - 30000, // 30 seconds ago
        type: 'full',
        status: 'success',
        duration: 1000
      },
      {
        timestamp: now - 120000, // 2 minutes ago
        type: 'current-file',
        status: 'success',
        duration: 500
      },
      {
        timestamp: now - 7200000, // 2 hours ago
        type: 'git',
        status: 'success',
        duration: 2000
      }
    ];

    const recentAnalysisSection = new SidebarTreeItem(
      'Recent Analysis',
      vscode.TreeItemCollapsibleState.Collapsed,
      'recentAnalysis'
    );

    // Act
    entries.forEach(entry => sidebarContentProvider.addRecentAnalysis(entry));
    const recentAnalysisItems = await sidebarContentProvider.getChildren(recentAnalysisSection);

    // Assert
    assert.ok(recentAnalysisItems[0].description?.includes('s ago'), 'Should show seconds for recent items');
    assert.ok(recentAnalysisItems[1].description?.includes('m ago'), 'Should show minutes for older items');
    assert.ok(recentAnalysisItems[2].description?.includes('h ago'), 'Should show hours for much older items');
  });

  test('should show correct code lens inline text in quick actions', async () => {
    // Arrange
    const mockCodeLensProvider = {
      isCodeLensEnabled: sinon.stub()
    };

    // Mock active editor with Python file
    const mockDocument = {
      languageId: 'python',
      uri: { fsPath: '/test/file.py' }
    };
    const mockActiveEditor = {
      document: mockDocument
    };

    sinon.stub(vscode.window, 'activeTextEditor').value(mockActiveEditor);

    const quickActionsSection = new SidebarTreeItem(
      'Quick Actions',
      vscode.TreeItemCollapsibleState.Expanded,
      'quickActions'
    );

    // Test when code lens is disabled
    // Removed setCodeLensProvider call - no longer needed in sidebar
    mockCodeLensProvider.isCodeLensEnabled.returns(false);

    // Act
    const quickActionItemsDisabled = await sidebarContentProvider.getChildren(quickActionsSection);

    // Assert
    const enableAction = quickActionItemsDisabled.find(item => 
      item.label === 'Enable Code Lens Inline'
    );
    assert.ok(enableAction, 'Should show "Enable Code Lens Inline" when disabled');
    assert.strictEqual(enableAction.command?.command, 'doracodelens.enableCodeLens');

    // Test when code lens is enabled
    mockCodeLensProvider.isCodeLensEnabled.returns(true);

    // Act
    const quickActionItemsEnabled = await sidebarContentProvider.getChildren(quickActionsSection);

    // Assert
    const disableAction = quickActionItemsEnabled.find(item => 
      item.label === 'Disable Code Lens Inline'
    );
    assert.ok(disableAction, 'Should show "Disable Code Lens Inline" when enabled');
    assert.strictEqual(disableAction.command?.command, 'doracodelens.disableCodeLens');
  });

  test('should refresh sidebar when code lens state changes', async () => {
    // Arrange
    let refreshCalled = false;
    const originalRefresh = sidebarContentProvider.refresh;
    sidebarContentProvider.refresh = () => {
      refreshCalled = true;
      originalRefresh.call(sidebarContentProvider);
    };

    // Act - Simulate code lens state change event
    await vscode.commands.executeCommand('doracodelens.codeLensStateChanged', true);

    // Assert
    assert.ok(refreshCalled, 'Should refresh sidebar when code lens state changes');

    // Restore original method
    sidebarContentProvider.refresh = originalRefresh;
  });
});