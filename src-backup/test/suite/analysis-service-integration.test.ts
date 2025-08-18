import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { AnalysisManager } from '../../core/analysis-manager';
import { AnalyzerRunner } from '../../analyzer-runner';
import { ConfigurationManager } from '../../core/configuration-manager';

suite('Analysis Service Integration Tests', () => {
    let analysisManager: AnalysisManager;
    let mockAnalyzerRunner: sinon.SinonStubbedInstance<AnalyzerRunner>;
    let mockConfigurationManager: sinon.SinonStubbedInstance<ConfigurationManager>;
    let mockOutputChannel: any;
    let mockStatusBarItem: any;

    setup(() => {
        // Create mocks
        mockAnalyzerRunner = sinon.createStubInstance(AnalyzerRunner);
        mockConfigurationManager = sinon.createStubInstance(ConfigurationManager);
        mockOutputChannel = {
            appendLine: sinon.stub(),
            show: sinon.stub(),
            hide: sinon.stub(),
            dispose: sinon.stub()
        };
        mockStatusBarItem = {
            text: '',
            show: sinon.stub(),
            hide: sinon.stub(),
            dispose: sinon.stub()
        };

        // Create analysis manager with mocks
        analysisManager = new AnalysisManager(
            mockAnalyzerRunner as any,
            mockConfigurationManager as any,
            mockOutputChannel as any,
            mockStatusBarItem as any
        );
    });

    teardown(() => {
        sinon.restore();
    });

    suite('runCurrentFileAnalysis', () => {
        test('should successfully analyze current file', async () => {
            // Arrange
            const filePath = '/test/file.py';
            const mockResult = {
                success: true,
                data: {
                    functions: [{ name: 'test_function', complexity: 5 }],
                    classes: [{ name: 'TestClass', methods: ['method1'] }],
                    imports: [{ module: 'os', items: ['path'] }],
                    complexity: {
                        cyclomaticComplexity: 5,
                        cognitiveComplexity: 3,
                        linesOfCode: 100,
                        maintainabilityIndex: 80
                    }
                },
                errors: []
            };

            mockAnalyzerRunner.runCurrentFileAnalysis.resolves(mockResult);

            // Act
            const result = await analysisManager.runCurrentFileAnalysis(filePath);

            // Assert
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.filePath, filePath);
            assert.strictEqual(result.language, 'python');
            assert.strictEqual(result.functions.length, 1);
            assert.strictEqual(result.classes.length, 1);
            assert.strictEqual(result.imports.length, 1);
            assert.ok(result.complexity);
            assert.strictEqual(mockAnalyzerRunner.runCurrentFileAnalysis.callCount, 1);
        });

        test('should handle missing file path', async () => {
            // Act
            const result = await analysisManager.runCurrentFileAnalysis('');

            // Assert
            assert.strictEqual(result.success, false);
            assert.ok(result.errors);
            assert.strictEqual(result.errors[0].type, 'invalid_input');
            assert.strictEqual(mockAnalyzerRunner.runCurrentFileAnalysis.callCount, 0);
        });

        test('should handle analysis failure', async () => {
            // Arrange
            const filePath = '/test/file.py';
            const mockResult = {
                success: false,
                errors: [{ type: 'parsing_error', message: 'Syntax error in file' }]
            };

            mockAnalyzerRunner.runCurrentFileAnalysis.resolves(mockResult);

            // Act
            const result = await analysisManager.runCurrentFileAnalysis(filePath);

            // Assert
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.filePath, filePath);
            assert.ok(result.errors);
            assert.strictEqual(result.errors[0].type, 'parsing_error');
        });

        test('should handle service unavailable', async () => {
            // Arrange
            const filePath = '/test/file.py';
            
            // Mock service availability check to return false
            sinon.stub(analysisManager, 'isServiceAvailable').returns(false);

            // Act
            const result = await analysisManager.runCurrentFileAnalysis(filePath);

            // Assert
            assert.strictEqual(result.success, false);
            assert.ok(result.errors);
            assert.strictEqual(result.errors[0].type, 'service_unavailable');
            assert.strictEqual(mockAnalyzerRunner.runCurrentFileAnalysis.callCount, 0);
        });

        test('should handle analysis already in progress', async () => {
            // Arrange
            const filePath = '/test/file.py';
            
            // Set analysis state to busy
            (analysisManager as any).state.isAnalyzing = true;

            // Act
            const result = await analysisManager.runCurrentFileAnalysis(filePath);

            // Assert
            assert.strictEqual(result.success, false);
            assert.ok(result.errors);
            assert.strictEqual(result.errors[0].type, 'busy');
            assert.strictEqual(mockAnalyzerRunner.runCurrentFileAnalysis.callCount, 0);
        });
    });

    suite('runGitAnalysis', () => {
        test('should successfully analyze git data', async () => {
            // Arrange
            const mockWorkspaceFolder = {
                uri: { fsPath: '/test/workspace' },
                name: 'test-workspace',
                index: 0
            };
            
            sinon.stub(vscode.workspace, 'workspaceFolders').value([mockWorkspaceFolder]);

            const mockResult = {
                success: true,
                data: {
                    repository: { name: 'test-repo', totalCommits: 100 },
                    commits: [{ hash: 'abc123', author: 'Test Author' }],
                    contributors: [{ name: 'Test Author', commits: 50 }],
                    analytics: { commitFrequency: [] }
                },
                errors: []
            };

            mockAnalyzerRunner.runGitAnalysis.resolves(mockResult);

            // Act
            const result = await analysisManager.runGitAnalysis();

            // Assert
            assert.strictEqual(result.success, true);
            assert.ok(result.repository);
            assert.ok(result.commits);
            assert.ok(result.contributors);
            assert.ok(result.analytics);
            assert.strictEqual(mockAnalyzerRunner.runGitAnalysis.callCount, 1);
        });

        test('should handle no workspace folder', async () => {
            // Arrange
            sinon.stub(vscode.workspace, 'workspaceFolders').value(undefined);

            // Act
            const result = await analysisManager.runGitAnalysis();

            // Assert
            assert.strictEqual(result.success, false);
            assert.ok(result.errors);
            assert.strictEqual(result.errors[0].type, 'no_workspace');
            assert.strictEqual(mockAnalyzerRunner.runGitAnalysis.callCount, 0);
        });

        test('should handle git service unavailable', async () => {
            // Arrange
            const mockWorkspaceFolder = {
                uri: { fsPath: '/test/workspace' },
                name: 'test-workspace',
                index: 0
            };
            
            sinon.stub(vscode.workspace, 'workspaceFolders').value([mockWorkspaceFolder]);
            sinon.stub(analysisManager, 'isServiceAvailable').returns(false);

            // Act
            const result = await analysisManager.runGitAnalysis();

            // Assert
            assert.strictEqual(result.success, false);
            assert.ok(result.errors);
            assert.strictEqual(result.errors[0].type, 'service_unavailable');
            assert.strictEqual(mockAnalyzerRunner.runGitAnalysis.callCount, 0);
        });

        test('should handle not a git repository error', async () => {
            // Arrange
            const mockWorkspaceFolder = {
                uri: { fsPath: '/test/workspace' },
                name: 'test-workspace',
                index: 0
            };
            
            sinon.stub(vscode.workspace, 'workspaceFolders').value([mockWorkspaceFolder]);
            
            const error = new Error('not a git repository');
            mockAnalyzerRunner.runGitAnalysis.rejects(error);

            // Act
            const result = await analysisManager.runGitAnalysis();

            // Assert
            assert.strictEqual(result.success, false);
            assert.ok(result.errors);
            assert.strictEqual(result.errors[0].type, 'not_git_repo');
            assert.ok(result.errors[0].message.includes('Git repository'));
        });
    });

    suite('runDatabaseSchemaAnalysis', () => {
        test('should return mock database schema analysis', async () => {
            // Arrange
            const mockWorkspaceFolder = {
                uri: { fsPath: '/test/workspace' },
                name: 'test-workspace',
                index: 0
            };
            
            sinon.stub(vscode.workspace, 'workspaceFolders').value([mockWorkspaceFolder]);
            mockConfigurationManager.getPythonPath.returns('python3');
            mockConfigurationManager.isCachingEnabled.returns(true);

            // Act
            const result = await analysisManager.runDatabaseSchemaAnalysis();

            // Assert
            assert.strictEqual(result.success, true);
            assert.ok(result.schemas);
            assert.ok(result.tables);
            assert.ok(result.relationships);
            assert.ok(result.diagram);
            assert.ok(result.data);
            assert.ok(result.data.message.includes('not yet fully implemented'));
        });

        test('should handle no workspace folder', async () => {
            // Arrange
            sinon.stub(vscode.workspace, 'workspaceFolders').value(undefined);

            // Act
            const result = await analysisManager.runDatabaseSchemaAnalysis();

            // Assert
            assert.strictEqual(result.success, false);
            assert.ok(result.errors);
            assert.strictEqual(result.errors[0].type, 'no_workspace');
        });

        test('should handle service unavailable', async () => {
            // Arrange
            const mockWorkspaceFolder = {
                uri: { fsPath: '/test/workspace' },
                name: 'test-workspace',
                index: 0
            };
            
            sinon.stub(vscode.workspace, 'workspaceFolders').value([mockWorkspaceFolder]);
            sinon.stub(analysisManager, 'isServiceAvailable').returns(false);

            // Act
            const result = await analysisManager.runDatabaseSchemaAnalysis();

            // Assert
            assert.strictEqual(result.success, false);
            assert.ok(result.errors);
            assert.strictEqual(result.errors[0].type, 'service_unavailable');
        });
    });

    suite('isServiceAvailable', () => {
        test('should check current file service availability', () => {
            // Mock fs.existsSync to return true
            const fsStub = sinon.stub(require('fs'), 'existsSync').returns(true);

            // Act
            const result = analysisManager.isServiceAvailable('currentFile');

            // Assert
            assert.strictEqual(result, true);
            
            fsStub.restore();
        });

        test('should check git service availability', () => {
            // Mock fs.existsSync to return false
            const fsStub = sinon.stub(require('fs'), 'existsSync').returns(false);

            // Act
            const result = analysisManager.isServiceAvailable('git');

            // Assert
            assert.strictEqual(result, false);
            
            fsStub.restore();
        });

        test('should return false for unknown service', () => {
            // Act
            const result = analysisManager.isServiceAvailable('unknown');

            // Assert
            assert.strictEqual(result, false);
        });
    });

    suite('Error Handling', () => {
        test('should handle analyzer runner exceptions', async () => {
            // Arrange
            const filePath = '/test/file.py';
            const error = new Error('Analyzer runner failed');
            
            mockAnalyzerRunner.runCurrentFileAnalysis.rejects(error);

            // Act
            const result = await analysisManager.runCurrentFileAnalysis(filePath);

            // Assert
            assert.strictEqual(result.success, false);
            assert.ok(result.errors);
            assert.strictEqual(result.errors[0].type, 'execution_error');
            assert.strictEqual(result.errors[0].message, 'Analyzer runner failed');
        });

        test('should handle cancellation properly', async () => {
            // Arrange
            const filePath = '/test/file.py';
            const cancellationError = new Error('cancelled');
            
            mockAnalyzerRunner.runCurrentFileAnalysis.rejects(cancellationError);

            // Act
            const result = await analysisManager.runCurrentFileAnalysis(filePath);

            // Assert
            assert.strictEqual(result.success, false);
            assert.ok(result.errors);
            assert.strictEqual(result.errors[0].message, 'cancelled');
        });
    });

    suite('State Management', () => {
        test('should set analyzing state during analysis', async () => {
            // Arrange
            const filePath = '/test/file.py';
            let stateWhenAnalyzing = false;
            
            mockAnalyzerRunner.runCurrentFileAnalysis.callsFake(async () => {
                stateWhenAnalyzing = analysisManager.isAnalyzing();
                return { success: true, data: {}, errors: [] };
            });

            // Act
            await analysisManager.runCurrentFileAnalysis(filePath);

            // Assert
            assert.strictEqual(stateWhenAnalyzing, true);
            assert.strictEqual(analysisManager.isAnalyzing(), false);
        });

        test('should update status bar during analysis', async () => {
            // Arrange
            const filePath = '/test/file.py';
            
            mockAnalyzerRunner.runCurrentFileAnalysis.resolves({
                success: true,
                data: {},
                errors: []
            });

            // Act
            await analysisManager.runCurrentFileAnalysis(filePath);

            // Assert
            assert.ok(mockStatusBarItem.text);
            // Status bar should be reset after analysis
            assert.strictEqual(mockStatusBarItem.text, '$(graph) DoraCodeBirdView');
        });
    });
});