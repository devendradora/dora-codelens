import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { AnalysisManager, AnalysisPipelineConfig } from '../core/analysis-manager';
import { ErrorHandler } from '../core/error-handler';
import { PythonService } from '../services/python-service';
import { DoraCodeLensProvider } from '../services/code-lens-provider';

suite('AnalysisManager Tests', () => {
    let analysisManager: AnalysisManager;
    let errorHandler: ErrorHandler;
    let pythonServiceStub: sinon.SinonStubbedInstance<PythonService>;
    let codeLensProviderStub: sinon.SinonStubbedInstance<DoraCodeLensProvider>;
    let outputChannel: vscode.OutputChannel;
    let executeCommandStub: sinon.SinonStub;

    setup(() => {
        // Create output channel for error handler
        outputChannel = {
            appendLine: sinon.stub(),
            show: sinon.stub(),
            dispose: sinon.stub()
        } as any;

        // Initialize error handler
        errorHandler = ErrorHandler.getInstance(outputChannel);

        // Create stubs
        pythonServiceStub = sinon.createStubInstance(PythonService);
        codeLensProviderStub = sinon.createStubInstance(DoraCodeLensProvider);
        
        // Mock the command execution
        executeCommandStub = sinon.stub(vscode.commands, 'executeCommand');

        // Initialize analysis manager
        analysisManager = AnalysisManager.getInstance(errorHandler);

        // Register mocked code lens provider
        analysisManager.registerCodeLensProvider(codeLensProviderStub as any);
    });

    teardown(() => {
        sinon.restore();
        analysisManager.dispose();
    });

    suite('Configuration Management', () => {
        test('should get default configuration', () => {
            const config = analysisManager.getConfig();
            
            assert.strictEqual(typeof config.enableCodeLens, 'boolean');
            assert.strictEqual(typeof config.enableComplexityAnalysis, 'boolean');
            assert.strictEqual(typeof config.enableSuggestionEngine, 'boolean');
            assert.strictEqual(typeof config.autoUpdateOnSave, 'boolean');
            assert.strictEqual(typeof config.throttleMs, 'number');
        });

        test('should update configuration', () => {
            const newConfig: Partial<AnalysisPipelineConfig> = {
                enableCodeLens: false,
                throttleMs: 2000
            };

            analysisManager.updateConfig(newConfig);
            const config = analysisManager.getConfig();

            assert.strictEqual(config.enableCodeLens, false);
            assert.strictEqual(config.throttleMs, 2000);
        });
    });

    suite('Current File Analysis', () => {
        test('should analyze current file successfully', async () => {
            // Mock active editor
            const mockDocument = {
                uri: { fsPath: '/test/file.py' },
                languageId: 'python'
            };
            const mockEditor = { document: mockDocument };
            
            sinon.stub(vscode.window, 'activeTextEditor').value(mockEditor);

            // Mock command execution response
            const mockAnalysisData = {
                functions: [
                    { name: 'test_func', complexity: 3, line_count: 10 }
                ],
                classes: [],
                complexity: { total: 3 }
            };
            executeCommandStub
                .withArgs('doracodelens.analyzeCurrentFile')
                .resolves(mockAnalysisData);

            const result = await analysisManager.analyzeCurrentFile();

            assert.ok(result);
            assert.strictEqual(result.filePath, '/test/file.py');
            assert.strictEqual(result.functions.length, 1);
            assert.strictEqual(result.functions[0].name, 'test_func');
            
            // Verify code lens provider was updated
            assert.ok(codeLensProviderStub.updateAnalysisData.calledOnce);
        });

        test('should return null for non-Python files', async () => {
            // Mock active editor with non-Python file
            const mockDocument = {
                uri: { fsPath: '/test/file.js' },
                languageId: 'javascript'
            };
            const mockEditor = { document: mockDocument };
            
            sinon.stub(vscode.window, 'activeTextEditor').value(mockEditor);

            const result = await analysisManager.analyzeCurrentFile();

            assert.strictEqual(result, null);
            assert.ok(executeCommandStub.notCalled);
        });

        test('should return null when no active editor', async () => {
            sinon.stub(vscode.window, 'activeTextEditor').value(undefined);

            const result = await analysisManager.analyzeCurrentFile();

            assert.strictEqual(result, null);
            assert.ok(executeCommandStub.notCalled);
        });

        test('should use cached results when available', async () => {
            // Mock active editor
            const mockDocument = {
                uri: { fsPath: '/test/file.py' },
                languageId: 'python'
            };
            const mockEditor = { document: mockDocument };
            
            sinon.stub(vscode.window, 'activeTextEditor').value(mockEditor);

            // Mock command execution response
            const mockAnalysisData = {
                functions: [{ name: 'test_func', complexity: 3 }],
                classes: [],
                complexity: {}
            };
            executeCommandStub
                .withArgs('doracodelens.analyzeCurrentFile')
                .resolves(mockAnalysisData);

            // First call should hit command
            const result1 = await analysisManager.analyzeCurrentFile();
            assert.ok(result1);
            assert.ok(executeCommandStub.calledOnce);

            // Second call should use cache
            const result2 = await analysisManager.analyzeCurrentFile();
            assert.ok(result2);
            assert.strictEqual(result1.timestamp, result2.timestamp);
            assert.ok(executeCommandStub.calledOnce); // Still only called once
        });
    });

    suite('Full Project Analysis', () => {
        test('should analyze full project successfully', async () => {
            // Mock command execution response
            const mockAnalysisData = {
                files: [
                    {
                        path: '/test/file1.py',
                        functions: [{ name: 'func1', complexity: 2 }],
                        classes: []
                    },
                    {
                        path: '/test/file2.py',
                        functions: [{ name: 'func2', complexity: 5 }],
                        classes: [{ name: 'TestClass', methods: [] }]
                    }
                ]
            };
            executeCommandStub
                .withArgs('doracodelens.analyzeFullCode')
                .resolves(mockAnalysisData);

            const results = await analysisManager.analyzeFullProject();

            assert.strictEqual(results.size, 2);
            assert.ok(results.has('/test/file1.py'));
            assert.ok(results.has('/test/file2.py'));
            
            const file1Results = results.get('/test/file1.py')!;
            assert.strictEqual(file1Results.functions.length, 1);
            assert.strictEqual(file1Results.functions[0].name, 'func1');
            
            const file2Results = results.get('/test/file2.py')!;
            assert.strictEqual(file2Results.functions.length, 1);
            assert.strictEqual(file2Results.classes.length, 1);
            
            // Verify code lens provider was updated
            assert.ok(codeLensProviderStub.updateAnalysisData.calledOnce);
        });

        test('should handle empty analysis data', async () => {
            executeCommandStub
                .withArgs('doracodelens.analyzeFullCode')
                .resolves(null);

            const results = await analysisManager.analyzeFullProject();

            assert.strictEqual(results.size, 0);
        });
    });

    suite('Cache Management', () => {
        test('should cache analysis results', async () => {
            const filePath = '/test/file.py';
            
            // Mock active editor
            const mockDocument = {
                uri: { fsPath: filePath },
                languageId: 'python'
            };
            const mockEditor = { document: mockDocument };
            
            sinon.stub(vscode.window, 'activeTextEditor').value(mockEditor);

            // Mock command execution response
            const mockAnalysisData = {
                functions: [{ name: 'test_func', complexity: 3 }],
                classes: [],
                complexity: {}
            };
            executeCommandStub
                .withArgs('doracodelens.analyzeCurrentFile')
                .resolves(mockAnalysisData);

            // Analyze file
            await analysisManager.analyzeCurrentFile();

            // Check cache
            const cached = analysisManager.getCachedResults(filePath);
            assert.ok(cached);
            assert.strictEqual(cached.filePath, filePath);
            assert.strictEqual(cached.functions.length, 1);
        });

        test('should clear cache', async () => {
            const filePath = '/test/file.py';
            
            // Add something to cache first
            const mockDocument = {
                uri: { fsPath: filePath },
                languageId: 'python'
            };
            const mockEditor = { document: mockDocument };
            
            sinon.stub(vscode.window, 'activeTextEditor').value(mockEditor);
            executeCommandStub
                .withArgs('doracodelens.analyzeCurrentFile')
                .resolves({
                    functions: [],
                    classes: [],
                    complexity: {}
                });

            await analysisManager.analyzeCurrentFile();
            assert.ok(analysisManager.getCachedResults(filePath));

            // Clear cache
            analysisManager.clearCache();
            assert.strictEqual(analysisManager.getCachedResults(filePath), null);
        });
    });

    suite('Error Handling', () => {
        test('should handle command execution errors gracefully', async () => {
            // Mock active editor
            const mockDocument = {
                uri: { fsPath: '/test/file.py' },
                languageId: 'python'
            };
            const mockEditor = { document: mockDocument };
            
            sinon.stub(vscode.window, 'activeTextEditor').value(mockEditor);

            // Mock command execution error
            executeCommandStub
                .withArgs('doracodelens.analyzeCurrentFile')
                .rejects(new Error('Command execution failed'));

            try {
                await analysisManager.analyzeCurrentFile();
                assert.fail('Expected error was not thrown');
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.ok(error.message.includes('Command execution failed'));
            }
        });

        test('should handle full project analysis errors gracefully', async () => {
            // Mock command execution error
            executeCommandStub
                .withArgs('doracodelens.analyzeFullCode')
                .rejects(new Error('Analysis failed'));

            const results = await analysisManager.analyzeFullProject();

            assert.strictEqual(results.size, 0);
        });
    });

    suite('Statistics', () => {
        test('should provide analysis statistics', () => {
            const stats = analysisManager.getStatistics();
            
            assert.strictEqual(typeof stats.cachedFiles, 'number');
            assert.strictEqual(typeof stats.activeTimers, 'number');
            assert.ok(stats.lastAnalysisTime === null || typeof stats.lastAnalysisTime === 'number');
        });
    });

    suite('Code Lens Integration', () => {
        test('should register code lens provider', () => {
            const newProvider = sinon.createStubInstance(DoraCodeLensProvider);
            
            analysisManager.registerCodeLensProvider(newProvider as any);
            
            // This should not throw an error
            assert.ok(true);
        });

        test('should check if code lens analysis is enabled', () => {
            const enabled = analysisManager.isCodeLensAnalysisEnabled();
            assert.strictEqual(typeof enabled, 'boolean');
        });
    });

    suite('Force Refresh', () => {
        test('should force refresh current file', async () => {
            const filePath = '/test/file.py';
            
            // Mock active editor
            const mockDocument = {
                uri: { fsPath: filePath },
                languageId: 'python'
            };
            const mockEditor = { document: mockDocument };
            
            sinon.stub(vscode.window, 'activeTextEditor').value(mockEditor);

            // Mock command execution response
            const mockAnalysisData = {
                functions: [{ name: 'test_func', complexity: 3 }],
                classes: [],
                complexity: {}
            };
            executeCommandStub
                .withArgs('doracodelens.analyzeCurrentFile')
                .resolves(mockAnalysisData);

            // First analysis
            await analysisManager.analyzeCurrentFile();
            assert.ok(executeCommandStub.calledOnce);

            // Force refresh should bypass cache
            await analysisManager.forceRefreshCurrentFile();
            assert.ok(executeCommandStub.calledTwice);
        });
    });
});