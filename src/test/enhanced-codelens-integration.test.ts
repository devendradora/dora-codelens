import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { DoraCodeLensProvider } from '../services/code-lens-provider';
import { BackgroundAnalysisManager } from '../services/background-analysis-manager';
import { SidebarContentProvider } from '../services/sidebar-content-provider';
import { ErrorHandler } from '../core/error-handler';
import { AnalysisStateManager } from '../core/analysis-state-manager';
import { PythonService } from '../services/python-service';

suite('Enhanced CodeLens Integration Tests', () => {
  let codeLensProvider: DoraCodeLensProvider;
  let backgroundAnalysisManager: BackgroundAnalysisManager;
  let sidebarContentProvider: SidebarContentProvider;
  let errorHandler: ErrorHandler;
  let stateManager: AnalysisStateManager;
  let pythonServiceStub: sinon.SinonStubbedInstance<PythonService>;
  let mockDocument: vscode.TextDocument;
  let mockOutputChannel: any;

  setup(() => {
    // Create mock output channel
    mockOutputChannel = {
      appendLine: sinon.stub(),
      show: sinon.stub(),
      dispose: sinon.stub()
    };

    // Initialize core components
    errorHandler = ErrorHandler.getInstance(mockOutputChannel);
    stateManager = AnalysisStateManager.getInstance(errorHandler);

    // Create mock document
    mockDocument = {
      uri: { fsPath: '/test/complex_file.py' },
      languageId: 'python',
      getText: () => `
def simple_function():
    return 42

def complex_function(a, b, c):
    if a > 0:
        if b > 0:
            if c > 0:
                return a + b + c
            else:
                return a + b
        else:
            return a
    else:
        return 0

class TestClass:
    def method1(self):
        return "simple"
    
    def complex_method(self, x, y):
        if x > y:
            for i in range(x):
                if i % 2 == 0:
                    y += i
                else:
                    y -= i
        return y
`,
      lineCount: 25
    } as any;

    // Stub Python service
    pythonServiceStub = sinon.createStubInstance(PythonService);
    ((pythonServiceStub.executePythonScriptForJSON as any) as any) = sinon.stub();
    (pythonServiceStub.getAnalyzerScriptPath as any) = sinon.stub().returns('/mock/analyzer.py');
    sinon.stub(PythonService, 'getInstance').returns(pythonServiceStub as any);

    // Initialize components
    backgroundAnalysisManager = BackgroundAnalysisManager.getInstance(errorHandler);
    codeLensProvider = DoraCodeLensProvider.getInstance(errorHandler);
    sidebarContentProvider = SidebarContentProvider.getInstance(
      errorHandler,
      stateManager,
      backgroundAnalysisManager
    );
  });

  teardown(() => {
    sinon.restore();
    backgroundAnalysisManager.dispose();
    sidebarContentProvider.clear();
  });

  test('should provide complete enhanced code lens workflow', async () => {
    // Arrange
    const mockAnalysisData = {
      functions: [
        {
          name: 'simple_function',
          line_number: 2,
          complexity: 1,
          cyclomatic_complexity: 1,
          call_count: 0,
          lines: 2,
          parameters: [],
          has_docstring: false
        },
        {
          name: 'complex_function',
          line_number: 5,
          complexity: 8,
          cyclomatic_complexity: 8,
          call_count: 2,
          lines: 12,
          parameters: ['a', 'b', 'c'],
          has_docstring: false
        }
      ],
      classes: [
        {
          name: 'TestClass',
          line_number: 18,
          total_complexity: 7,
          lines: 12,
          methods: [
            {
              name: 'method1',
              line_number: 19,
              complexity: 1,
              cyclomatic_complexity: 1,
              call_count: 0,
              lines: 2,
              parameters: ['self'],
              has_docstring: false
            },
            {
              name: 'complex_method',
              line_number: 22,
              complexity: 6,
              cyclomatic_complexity: 6,
              call_count: 1,
              lines: 8,
              parameters: ['self', 'x', 'y'],
              has_docstring: false
            }
          ]
        }
      ]
    };

    (pythonServiceStub.executePythonScriptForJSON as any).resolves(mockAnalysisData);

    // Act - Enable code lens
    codeLensProvider.enable();

    // Act - Provide code lenses (this should trigger background analysis)
    const codeLenses = await codeLensProvider.provideCodeLenses(mockDocument);

    // Assert - Code lenses should be provided
    assert.ok(codeLenses.length > 0, 'Should provide code lenses');

    // Find specific code lenses
    const simpleFunctionLens = codeLenses.find(lens => 
      lens.command?.tooltip?.includes('simple_function')
    );
    const complexFunctionLens = codeLenses.find(lens => 
      lens.command?.tooltip?.includes('complex_function')
    );
    const classLens = codeLenses.find(lens => 
      lens.command?.tooltip?.includes('TestClass')
    );

    // Assert - Complexity indicators should be color-coded
    assert.ok(simpleFunctionLens, 'Should have code lens for simple function');
    assert.ok(complexFunctionLens, 'Should have code lens for complex function');
    assert.ok(classLens, 'Should have code lens for class');

    // Check complexity color coding
    const simpleFunctionTitle = simpleFunctionLens?.command?.title || '';
    const complexFunctionTitle = complexFunctionLens?.command?.title || '';

    assert.ok(simpleFunctionTitle.includes('🟢'), 'Simple function should have green indicator (low complexity)');
    assert.ok(complexFunctionTitle.includes('🟡'), 'Complex function should have yellow indicator (medium complexity)');

    // Assert - GitLens-style compact display
    assert.ok(simpleFunctionTitle.includes('complexity'), 'Should show complexity in title');
    assert.ok(simpleFunctionTitle.includes('references'), 'Should show references in title');
    assert.ok(simpleFunctionTitle.includes('lines'), 'Should show lines in title');
  });

  test('should handle background analysis caching', async () => {
    // Arrange
    const mockAnalysisData = {
      functions: [
        {
          name: 'test_function',
          line_number: 1,
          complexity: 3,
          cyclomatic_complexity: 3,
          call_count: 1,
          lines: 5,
          parameters: [],
          has_docstring: false
        }
      ],
      classes: []
    };

    (pythonServiceStub.executePythonScriptForJSON as any).resolves(mockAnalysisData);
    codeLensProvider.enable();

    // Act - First call should trigger analysis
    const codeLenses1 = await codeLensProvider.provideCodeLenses(mockDocument);
    
    // Act - Second call should use cache
    const codeLenses2 = await codeLensProvider.provideCodeLenses(mockDocument);

    // Assert
    assert.strictEqual((pythonServiceStub.executePythonScriptForJSON as any).callCount, 1, 'Should only call Python service once');
    assert.strictEqual(codeLenses1.length, codeLenses2.length, 'Should return same number of code lenses');
  });

  test('should show placeholder indicators when no analysis data', async () => {
    // Arrange
    codeLensProvider.enable();
    // Don't set up Python service mock - this will cause analysis to fail

    // Act
    const codeLenses = await codeLensProvider.provideCodeLenses(mockDocument);

    // Assert
    assert.ok(codeLenses.length > 0, 'Should provide placeholder code lenses');
    
    const placeholderLens = codeLenses.find(lens => 
      lens.command?.title?.includes('Analyzing')
    );
    
    assert.ok(placeholderLens, 'Should have placeholder analyzing indicators');
    assert.ok(placeholderLens.command?.title?.includes('🔄'), 'Should show analyzing spinner');
  });

  test('should integrate with sidebar content provider', async () => {
    // Arrange
    const mockAnalysisData = {
      functions: [
        { name: 'func1', complexity: 2 },
        { name: 'func2', complexity: 8 },
        { name: 'func3', complexity: 15 }
      ],
      classes: []
    };

    (pythonServiceStub.executePythonScriptForJSON as any).resolves(mockAnalysisData);

    // Act - Simulate analysis completion
    const analysisResult = await backgroundAnalysisManager.analyzeFileInBackground(mockDocument);
    
    // Update sidebar with project metrics
    sidebarContentProvider.updateProjectMetrics({
      totalFiles: 1,
      totalFunctions: 3,
      averageComplexity: 8.3,
      lastAnalyzed: Date.now(),
      highComplexityFunctions: 1
    });

    // Add recent analysis entry
    sidebarContentProvider.addRecentAnalysis({
      timestamp: Date.now(),
      type: 'current-file',
      status: 'success',
      duration: 1500,
      filePath: mockDocument.uri.fsPath
    });

    // Act - Get sidebar content
    const rootItems = await sidebarContentProvider.getChildren();
    const projectOverviewSection = rootItems.find(item => item.contextValue === 'projectOverview');
    const recentAnalysisSection = rootItems.find(item => item.contextValue === 'recentAnalysis');

    // Assert
    assert.ok(projectOverviewSection, 'Should have project overview section');
    assert.ok(recentAnalysisSection, 'Should have recent analysis section');

    // Check project overview items
    const projectItems = await sidebarContentProvider.getChildren(projectOverviewSection);
    const functionsItem = projectItems.find(item => item.label === 'Functions');
    const complexityItem = projectItems.find(item => item.label === 'Avg Complexity');
    const highComplexityItem = projectItems.find(item => item.label === 'High Complexity');

    assert.ok(functionsItem, 'Should show functions count');
    assert.ok(complexityItem, 'Should show average complexity');
    assert.ok(highComplexityItem, 'Should show high complexity functions');
    assert.strictEqual(functionsItem.description, '3');
    assert.strictEqual(complexityItem.description, '8.3');
    assert.strictEqual(highComplexityItem.description, '1');

    // Check recent analysis items
    const recentItems = await sidebarContentProvider.getChildren(recentAnalysisSection);
    assert.strictEqual(recentItems.length, 1);
    assert.strictEqual(recentItems[0].label, 'Current File');
    assert.ok(recentItems[0].description?.includes('1500ms'));
  });

  test('should handle analysis errors gracefully', async () => {
    // Arrange
    (pythonServiceStub.executePythonScriptForJSON as any).rejects(new Error('Python analysis failed'));
    codeLensProvider.enable();

    // Act
    const codeLenses = await codeLensProvider.provideCodeLenses(mockDocument);

    // Assert - Should fall back to placeholder indicators
    assert.ok(codeLenses.length > 0, 'Should provide fallback code lenses');
    
    const placeholderLens = codeLenses.find(lens => 
      lens.command?.title?.includes('Analyzing')
    );
    
    assert.ok(placeholderLens, 'Should show analyzing placeholders on error');
  });

  test('should update sidebar when analysis status changes', async () => {
    // Arrange
    sidebarContentProvider.updateAnalysisStatus({
      isRunning: true,
      currentOperation: 'Analyzing complex functions...',
      progress: 75,
      startTime: Date.now() - 45000 // 45 seconds ago
    });

    // Act
    const rootItems = await sidebarContentProvider.getChildren();
    const analysisStatusSection = rootItems.find(item => item.contextValue === 'analysisStatus');

    // Assert
    assert.ok(analysisStatusSection, 'Should show analysis status section when running');
    assert.ok(analysisStatusSection.iconPath, 'Should have loading icon');

    const statusItems = await sidebarContentProvider.getChildren(analysisStatusSection);
    const operationItem = statusItems.find(item => 
      item.label === 'Analyzing complex functions...'
    );
    const progressItem = statusItems.find(item => item.label === 'Progress');

    assert.ok(operationItem, 'Should show current operation');
    assert.ok(progressItem, 'Should show progress');
    assert.strictEqual(progressItem.description, '75%');
  });

  test('should provide different complexity thresholds', async () => {
    // Arrange
    const mockAnalysisData = {
      functions: [
        { name: 'low_complexity', line_number: 1, complexity: 3, call_count: 0, lines: 5 },
        { name: 'medium_complexity', line_number: 10, complexity: 8, call_count: 1, lines: 15 },
        { name: 'high_complexity', line_number: 20, complexity: 15, call_count: 2, lines: 25 }
      ],
      classes: []
    };

    (pythonServiceStub.executePythonScriptForJSON as any).resolves(mockAnalysisData);
    codeLensProvider.enable();

    // Act
    const codeLenses = await codeLensProvider.provideCodeLenses(mockDocument);

    // Assert - Find code lenses for each complexity level
    const lowComplexityLens = codeLenses.find(lens => 
      lens.command?.tooltip?.includes('low_complexity')
    );
    const mediumComplexityLens = codeLenses.find(lens => 
      lens.command?.tooltip?.includes('medium_complexity')
    );
    const highComplexityLens = codeLenses.find(lens => 
      lens.command?.tooltip?.includes('high_complexity')
    );

    // Check complexity indicators
    const lowTitle = lowComplexityLens?.command?.title || '';
    const mediumTitle = mediumComplexityLens?.command?.title || '';
    const highTitle = highComplexityLens?.command?.title || '';

    assert.ok(lowTitle.includes('🟢'), 'Low complexity should have green indicator');
    assert.ok(mediumTitle.includes('🟡'), 'Medium complexity should have yellow indicator');
    assert.ok(highTitle.includes('🔴'), 'High complexity should have red indicator');

    // Check complexity values are displayed
    assert.ok(lowTitle.includes('3 complexity'), 'Should show complexity value');
    assert.ok(mediumTitle.includes('8 complexity'), 'Should show complexity value');
    assert.ok(highTitle.includes('15 complexity'), 'Should show complexity value');
  });

  test('should not show analyze full project code lens at file top', async () => {
    // Arrange
    codeLensProvider.enable();
    // Don't provide analysis data to trigger basic guidance prompts

    // Act
    const codeLenses = await codeLensProvider.provideCodeLenses(mockDocument);

    // Assert - Should not contain "analyze full project" code lens
    const analyzeFullProjectLens = codeLenses.find(lens => 
      lens.command?.title?.includes('Analyze Full Project') ||
      lens.command?.command === 'doracodelens.analyzeFullCode'
    );

    assert.strictEqual(analyzeFullProjectLens, undefined, 'Should not show "analyze full project" code lens at file top');

    // Should still have other guidance prompts
    const analyzeCurrentFileLens = codeLenses.find(lens => 
      lens.command?.title?.includes('Analyze Current File')
    );
    const setupPythonLens = codeLenses.find(lens => 
      lens.command?.title?.includes('Setup Python Path')
    );

    assert.ok(analyzeCurrentFileLens, 'Should still show analyze current file option');
    assert.ok(setupPythonLens, 'Should still show setup python path option');
  });

  test('should handle class methods correctly', async () => {
    // Arrange
    const mockAnalysisData = {
      functions: [],
      classes: [
        {
          name: 'ComplexClass',
          line_number: 1,
          total_complexity: 20,
          lines: 30,
          methods: [
            {
              name: 'simple_method',
              line_number: 3,
              complexity: 2,
              cyclomatic_complexity: 2,
              call_count: 1,
              lines: 5,
              parameters: ['self'],
              has_docstring: true
            },
            {
              name: 'complex_method',
              line_number: 10,
              complexity: 12,
              cyclomatic_complexity: 12,
              call_count: 3,
              lines: 18,
              parameters: ['self', 'param1', 'param2'],
              has_docstring: false
            }
          ]
        }
      ]
    };

    (pythonServiceStub.executePythonScriptForJSON as any).resolves(mockAnalysisData);
    codeLensProvider.enable();

    // Act
    const codeLenses = await codeLensProvider.provideCodeLenses(mockDocument);

    // Assert
    const classLens = codeLenses.find(lens => 
      lens.command?.tooltip?.includes('ComplexClass')
    );
    const simpleMethodLens = codeLenses.find(lens => 
      lens.command?.tooltip?.includes('simple_method')
    );
    const complexMethodLens = codeLenses.find(lens => 
      lens.command?.tooltip?.includes('complex_method')
    );

    assert.ok(classLens, 'Should have code lens for class');
    assert.ok(simpleMethodLens, 'Should have code lens for simple method');
    assert.ok(complexMethodLens, 'Should have code lens for complex method');

    // Check class display shows method count
    const classTitle = classLens?.command?.title || '';
    assert.ok(classTitle.includes('2 methods'), 'Class should show method count');
    assert.ok(classTitle.includes('20 complexity'), 'Class should show total complexity');

    // Check method complexity indicators
    const simpleMethodTitle = simpleMethodLens?.command?.title || '';
    const complexMethodTitle = complexMethodLens?.command?.title || '';

    assert.ok(simpleMethodTitle.includes('🟢'), 'Simple method should have green indicator');
    assert.ok(complexMethodTitle.includes('🔴'), 'Complex method should have red indicator');
  });
});