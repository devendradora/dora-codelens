import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { BackgroundAnalysisManager, AnalysisResult } from '../services/background-analysis-manager';
import { ErrorHandler } from '../core/error-handler';
import { PythonService } from '../services/python-service';

suite('BackgroundAnalysisManager Tests', () => {
  let backgroundAnalysisManager: BackgroundAnalysisManager;
  let errorHandler: ErrorHandler;
  let pythonServiceStub: sinon.SinonStubbedInstance<PythonService>;
  let mockDocument: vscode.TextDocument;

  setup(() => {
    // Create mock output channel
    const mockOutputChannel = {
      appendLine: sinon.stub(),
      show: sinon.stub(),
      dispose: sinon.stub()
    } as any;

    // Initialize error handler
    errorHandler = ErrorHandler.getInstance(mockOutputChannel);

    // Create mock document
    mockDocument = {
      uri: { fsPath: '/test/file.py' },
      languageId: 'python',
      getText: () => 'def test_function():\n    return 42\n',
      lineCount: 2
    } as any;

    // Stub Python service - we'll mock the direct execution method instead
    pythonServiceStub = sinon.createStubInstance(PythonService);
    ((pythonServiceStub.executePythonScriptForJSON as any) as any) = sinon.stub();
    (pythonServiceStub.getAnalyzerScriptPath as any) = sinon.stub().returns('/mock/analyzer.py');
    sinon.stub(PythonService, 'getInstance').returns(pythonServiceStub as any);

    // Initialize background analysis manager
    backgroundAnalysisManager = BackgroundAnalysisManager.getInstance(errorHandler);
  });

  teardown(() => {
    sinon.restore();
    backgroundAnalysisManager.dispose();
  });

  test('should analyze file in background successfully', async () => {
    // Arrange
    const mockAnalysisData = {
      functions: [
        {
          name: 'test_function',
          line: 1,
          complexity: 1,
          cyclomatic_complexity: 1,
          references: 0,
          call_count: 0,
          line_count: 2,
          lines: 2,
          parameters: [],
          has_docstring: false
        }
      ],
      classes: [],
      complexity: { average: 1, total: 1, max: 1, min: 1 }
    };

    (pythonServiceStub.executePythonScriptForJSON as any).resolves(mockAnalysisData);

    // Act
    const result = await backgroundAnalysisManager.analyzeFileInBackground(mockDocument);

    // Assert
    assert.strictEqual(result.status, 'success');
    assert.strictEqual(result.functions.length, 1);
    assert.strictEqual(result.functions[0].name, 'test_function');
    assert.strictEqual(result.functions[0].complexity, 1);
    assert.strictEqual(result.classes.length, 0);
  });

  test('should handle analysis errors gracefully', async () => {
    // Arrange
    (pythonServiceStub.executePythonScriptForJSON as any).rejects(new Error('Analysis failed'));

    // Act
    const result = await backgroundAnalysisManager.analyzeFileInBackground(mockDocument);

    // Assert
    assert.strictEqual(result.status, 'error');
    assert.strictEqual(result.error, 'Analysis failed');
    assert.strictEqual(result.functions.length, 0);
    assert.strictEqual(result.classes.length, 0);
  });

  test('should cache analysis results', async () => {
    // Arrange
    const mockAnalysisData = {
      functions: [
        {
          name: 'test_function',
          line: 1,
          complexity: 2,
          cyclomatic_complexity: 2,
          references: 1,
          call_count: 1,
          line_count: 3,
          lines: 3,
          parameters: [],
          has_docstring: true
        }
      ],
      classes: [],
      complexity: { average: 2, total: 2, max: 2, min: 2 }
    };

    (pythonServiceStub.executePythonScriptForJSON as any).resolves(mockAnalysisData);

    // Act - First call should trigger analysis
    const result1 = await backgroundAnalysisManager.analyzeFileInBackground(mockDocument);
    
    // Act - Second call should use cache
    const result2 = await backgroundAnalysisManager.analyzeFileInBackground(mockDocument);

    // Assert
    assert.strictEqual((pythonServiceStub.executePythonScriptForJSON as any).callCount, 1, 'Should only call Python service once');
    assert.deepStrictEqual(result1, result2, 'Results should be identical');
    assert.strictEqual(result2.functions[0].complexity, 2);
  });

  test('should invalidate cache when content changes', () => {
    // Arrange
    const filePath = '/test/file.py';
    const content1 = 'def test1(): pass';
    const content2 = 'def test2(): pass';
    
    const mockResult: AnalysisResult = {
      filePath,
      timestamp: Date.now(),
      functions: [],
      classes: [],
      complexity: { average: 0, total: 0, max: 0, min: 0 },
      status: 'success'
    };

    // Act
    backgroundAnalysisManager.setCachedAnalysis(filePath, content1, mockResult);
    const cachedResult1 = backgroundAnalysisManager.getCachedAnalysis(filePath, content1);
    const cachedResult2 = backgroundAnalysisManager.getCachedAnalysis(filePath, content2);

    // Assert
    assert.ok(cachedResult1, 'Should return cached result for same content');
    assert.strictEqual(cachedResult2, null, 'Should not return cached result for different content');
  });

  test('should clear cache', () => {
    // Arrange
    const filePath = '/test/file.py';
    const content = 'def test(): pass';
    
    const mockResult: AnalysisResult = {
      filePath,
      timestamp: Date.now(),
      functions: [],
      classes: [],
      complexity: { average: 0, total: 0, max: 0, min: 0 },
      status: 'success'
    };

    backgroundAnalysisManager.setCachedAnalysis(filePath, content, mockResult);

    // Act
    backgroundAnalysisManager.clearCache();
    const cachedResult = backgroundAnalysisManager.getCachedAnalysis(filePath, content);

    // Assert
    assert.strictEqual(cachedResult, null, 'Cache should be empty after clearing');
  });

  test('should provide cache statistics', () => {
    // Arrange
    const filePath = '/test/file.py';
    const content = 'def test(): pass';
    
    const mockResult: AnalysisResult = {
      filePath,
      timestamp: Date.now(),
      functions: [],
      classes: [],
      complexity: { average: 0, total: 0, max: 0, min: 0 },
      status: 'success'
    };

    // Act
    const statsBefore = backgroundAnalysisManager.getCacheStats();
    backgroundAnalysisManager.setCachedAnalysis(filePath, content, mockResult);
    const statsAfter = backgroundAnalysisManager.getCacheStats();

    // Assert
    assert.strictEqual(statsBefore.size, 0);
    assert.strictEqual(statsAfter.size, 1);
    assert.strictEqual(statsAfter.maxSize, 100);
  });

  test('should extract functions from analysis data correctly', async () => {
    // Arrange
    const mockAnalysisData = {
      functions: [
        {
          name: 'complex_function',
          line_number: 5,
          cyclomatic_complexity: 8,
          call_count: 3,
          lines: 15,
          parameters: ['param1', 'param2'],
          has_docstring: true
        }
      ],
      classes: [],
      complexity: { average: 8, total: 8, max: 8, min: 8 }
    };

    (pythonServiceStub.executePythonScriptForJSON as any).resolves(mockAnalysisData);

    // Act
    const result = await backgroundAnalysisManager.analyzeFileInBackground(mockDocument);

    // Assert
    assert.strictEqual(result.functions.length, 1);
    const func = result.functions[0];
    assert.strictEqual(func.name, 'complex_function');
    assert.strictEqual(func.line, 5);
    assert.strictEqual(func.complexity, 8);
    assert.strictEqual(func.cyclomatic_complexity, 8);
    assert.strictEqual(func.references, 3);
    assert.strictEqual(func.call_count, 3);
    assert.strictEqual(func.line_count, 15);
    assert.strictEqual(func.lines, 15);
    assert.strictEqual(func.parameters.length, 2);
    assert.strictEqual(func.has_docstring, true);
  });

  test('should extract classes with methods correctly', async () => {
    // Arrange
    const mockAnalysisData = {
      functions: [],
      classes: [
        {
          name: 'TestClass',
          line_number: 1,
          total_complexity: 12,
          lines: 25,
          methods: [
            {
              name: 'method1',
              line_number: 3,
              cyclomatic_complexity: 5,
              call_count: 2,
              lines: 8,
              parameters: ['self', 'param'],
              has_docstring: false
            },
            {
              name: 'method2',
              line_number: 12,
              cyclomatic_complexity: 7,
              call_count: 1,
              lines: 10,
              parameters: ['self'],
              has_docstring: true
            }
          ]
        }
      ],
      complexity: { average: 6, total: 12, max: 7, min: 5 }
    };

    ((pythonServiceStub.executePythonScriptForJSON as any) as any).resolves(mockAnalysisData);

    // Act
    const result = await backgroundAnalysisManager.analyzeFileInBackground(mockDocument);

    // Assert
    assert.strictEqual(result.classes.length, 1);
    const cls = result.classes[0];
    assert.strictEqual(cls.name, 'TestClass');
    assert.strictEqual(cls.line, 1);
    assert.strictEqual(cls.complexity, 12);
    assert.strictEqual(cls.total_complexity, 12);
    assert.strictEqual(cls.lines, 25);
    assert.strictEqual(cls.methods.length, 2);
    
    const method1 = cls.methods[0];
    assert.strictEqual(method1.name, 'method1');
    assert.strictEqual(method1.complexity, 5);
    assert.strictEqual(method1.has_docstring, false);
    
    const method2 = cls.methods[1];
    assert.strictEqual(method2.name, 'method2');
    assert.strictEqual(method2.complexity, 7);
    assert.strictEqual(method2.has_docstring, true);
  });

  test('should calculate complexity metrics correctly', async () => {
    // Arrange
    const mockAnalysisData = {
      functions: [
        { name: 'func1', complexity: 3 },
        { name: 'func2', complexity: 7 }
      ],
      classes: [
        {
          name: 'Class1',
          methods: [
            { name: 'method1', cyclomatic_complexity: 2 },
            { name: 'method2', cyclomatic_complexity: 10 }
          ]
        }
      ]
    };

    (pythonServiceStub.executePythonScriptForJSON as any).resolves(mockAnalysisData);

    // Act
    const result = await backgroundAnalysisManager.analyzeFileInBackground(mockDocument);

    // Assert
    const complexity = result.complexity;
    assert.strictEqual(complexity.total, 22); // 3 + 7 + 2 + 10
    assert.strictEqual(complexity.average, 5.5); // 22 / 4
    assert.strictEqual(complexity.max, 10);
    assert.strictEqual(complexity.min, 2);
  });
});