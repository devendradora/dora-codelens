"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
const sinon = __importStar(require("sinon"));
const analysis_manager_1 = require("../../core/analysis-manager");
const analyzer_runner_1 = require("../../analyzer-runner");
const configuration_manager_1 = require("../../core/configuration-manager");
suite('Analysis Service Integration Tests', () => {
    let analysisManager;
    let mockAnalyzerRunner;
    let mockConfigurationManager;
    let mockOutputChannel;
    let mockStatusBarItem;
    setup(() => {
        // Create mocks
        mockAnalyzerRunner = sinon.createStubInstance(analyzer_runner_1.AnalyzerRunner);
        mockConfigurationManager = sinon.createStubInstance(configuration_manager_1.ConfigurationManager);
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
        analysisManager = new analysis_manager_1.AnalysisManager(mockAnalyzerRunner, mockConfigurationManager, mockOutputChannel, mockStatusBarItem);
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
            analysisManager.state.isAnalyzing = true;
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
//# sourceMappingURL=analysis-service-integration.test.js.map