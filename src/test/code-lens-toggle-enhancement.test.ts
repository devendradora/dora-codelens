import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { CodeLensHandler } from '../commands/code-lens-handler';
import { CodeLensManager } from '../services/code-lens-provider';
import { CodeLensCommandManager } from '../core/code-lens-command-manager';
import { ErrorHandler } from '../core/error-handler';

/**
 * Test suite for Code Lens Toggle Enhancement
 * Tests the new separate enable/disable commands and automatic analysis triggering
 */
suite('Code Lens Toggle Enhancement Tests', () => {
    let errorHandler: ErrorHandler;
    let mockContext: vscode.ExtensionContext;
    let codeLensHandler: CodeLensHandler;
    let codeLensManager: CodeLensManager;
    let commandManager: CodeLensCommandManager;

    setup(() => {
        // Create mock output channel
        const mockOutputChannel = {
            appendLine: sinon.stub(),
            show: sinon.stub(),
            dispose: sinon.stub()
        } as any;

        // Initialize error handler
        errorHandler = ErrorHandler.getInstance(mockOutputChannel);

        // Create mock extension context
        mockContext = {
            subscriptions: [],
            globalState: {
                get: sinon.stub(),
                update: sinon.stub()
            },
            extensionPath: '/mock/path'
        } as any;

        // Initialize managers
        codeLensManager = CodeLensManager.getInstance(errorHandler, mockContext);
        commandManager = CodeLensCommandManager.getInstance(errorHandler, mockContext);
        codeLensHandler = new CodeLensHandler(errorHandler, mockContext);
    });

    teardown(() => {
        sinon.restore();
    });

    suite('Command Registration', () => {
        test('should register enable and disable commands instead of toggle', async () => {
            const registerCommandStub = sinon.stub(vscode.commands, 'registerCommand');
            
            commandManager.registerDynamicCommands();
            
            // Verify toggle command is not registered
            assert.strictEqual(
                registerCommandStub.calledWith('doracodelens.toggleCodeLens'),
                false,
                'Toggle command should not be registered'
            );
            
            // Note: Enable/disable commands are registered in main command manager
            // This test verifies the command manager doesn't register toggle
        });

        test('should update command titles based on state', () => {
            // Test initial state (disabled)
            assert.strictEqual(commandManager.isCodeLensEnabled(), false);
            
            // Enable code lens
            commandManager.enableCodeLens();
            assert.strictEqual(commandManager.isCodeLensEnabled(), true);
            
            // Disable code lens
            commandManager.disableCodeLens();
            assert.strictEqual(commandManager.isCodeLensEnabled(), false);
        });
    });

    suite('Enable Code Lens Command', () => {
        test('should enable code lens and show correct message', async () => {
            const showInformationMessageStub = sinon.stub(vscode.window, 'showInformationMessage');
            
            await codeLensHandler.handleEnableCodeLens();
            
            assert.strictEqual(codeLensManager.isEnabled(), true);
            assert.strictEqual(
                showInformationMessageStub.calledWith('Code Lens -> On'),
                true,
                'Should show "Code Lens -> On" message'
            );
        });

        test('should trigger analysis when no cached results exist', async () => {
            // Mock active editor with Python file
            const mockDocument = {
                languageId: 'python',
                uri: { fsPath: '/test/file.py' }
            } as vscode.TextDocument;

            const mockEditor = {
                document: mockDocument
            } as vscode.TextEditor;

            sinon.stub(vscode.window, 'activeTextEditor').value(mockEditor);
            
            // Mock no cached results
            sinon.stub(codeLensManager, 'hasCachedResults').returns(false);
            
            // Spy on analysis triggering
            const triggerAnalysisSpy = sinon.spy(codeLensHandler as any, 'triggerCurrentFileAnalysis');
            
            await codeLensHandler.handleEnableCodeLens();
            
            assert.strictEqual(
                triggerAnalysisSpy.calledOnce,
                true,
                'Should trigger current file analysis when no cached results exist'
            );
        });

        test('should not trigger analysis when cached results exist', async () => {
            // Mock active editor with Python file
            const mockDocument = {
                languageId: 'python',
                uri: { fsPath: '/test/file.py' }
            } as vscode.TextDocument;

            const mockEditor = {
                document: mockDocument
            } as vscode.TextEditor;

            sinon.stub(vscode.window, 'activeTextEditor').value(mockEditor);
            
            // Mock cached results exist
            sinon.stub(codeLensManager, 'hasCachedResults').returns(true);
            
            // Spy on analysis triggering
            const triggerAnalysisSpy = sinon.spy(codeLensHandler as any, 'triggerCurrentFileAnalysis');
            
            await codeLensHandler.handleEnableCodeLens();
            
            assert.strictEqual(
                triggerAnalysisSpy.called,
                false,
                'Should not trigger analysis when cached results exist'
            );
        });
    });

    suite('Disable Code Lens Command', () => {
        test('should disable code lens and show correct message', async () => {
            const showInformationMessageStub = sinon.stub(vscode.window, 'showInformationMessage');
            
            // First enable, then disable
            await codeLensHandler.handleEnableCodeLens();
            await codeLensHandler.handleDisableCodeLens();
            
            assert.strictEqual(codeLensManager.isEnabled(), false);
            assert.strictEqual(
                showInformationMessageStub.calledWith('Code Lens -> Off'),
                true,
                'Should show "Code Lens -> Off" message'
            );
        });
    });

    suite('State Persistence', () => {
        test('should persist enable state across sessions', () => {
            const updateStub = mockContext.globalState.update as sinon.SinonStub;
            
            codeLensManager.enableCodeLens();
            
            assert.strictEqual(
                updateStub.calledWith('doracodelens.codeLensEnabled', true),
                true,
                'Should persist enabled state'
            );
        });

        test('should persist disable state across sessions', () => {
            const updateStub = mockContext.globalState.update as sinon.SinonStub;
            
            codeLensManager.disableCodeLens();
            
            assert.strictEqual(
                updateStub.calledWith('doracodelens.codeLensEnabled', false),
                true,
                'Should persist disabled state'
            );
        });

        test('should restore state on startup', () => {
            const getStub = mockContext.globalState.get as sinon.SinonStub;
            getStub.withArgs('doracodelens.codeLensEnabled', false).returns(true);
            
            codeLensManager.restoreState();
            
            assert.strictEqual(codeLensManager.isEnabled(), true);
        });
    });

    suite('Context Updates', () => {
        test('should update VS Code context when enabling', async () => {
            const executeCommandStub = sinon.stub(vscode.commands, 'executeCommand');
            
            await codeLensHandler.handleEnableCodeLens();
            
            assert.strictEqual(
                executeCommandStub.calledWith('setContext', 'doracodelens.codeLensEnabled', true),
                true,
                'Should set context to true when enabling'
            );
        });

        test('should update VS Code context when disabling', async () => {
            const executeCommandStub = sinon.stub(vscode.commands, 'executeCommand');
            
            await codeLensHandler.handleDisableCodeLens();
            
            assert.strictEqual(
                executeCommandStub.calledWith('setContext', 'doracodelens.codeLensEnabled', false),
                true,
                'Should set context to false when disabling'
            );
        });
    });

    suite('Cache Management', () => {
        test('should correctly identify when cached results exist', () => {
            const filePath = '/test/file.py';
            const mockAnalysisData = {
                files: [
                    { path: filePath, functions: [{ name: 'test_func', complexity: 5 }] }
                ]
            };
            
            codeLensManager.updateFromAnalysisData(mockAnalysisData);
            
            assert.strictEqual(
                codeLensManager.hasCachedResults(filePath),
                true,
                'Should identify cached results exist'
            );
        });

        test('should correctly identify when no cached results exist', () => {
            const filePath = '/test/file.py';
            
            // No analysis data
            assert.strictEqual(
                codeLensManager.hasCachedResults(filePath),
                false,
                'Should identify no cached results exist'
            );
        });
    });

    suite('Inline Analysis Commands Removal', () => {
        test('should not show analyse file commands in code lens', async () => {
            const mockDocument = {
                languageId: 'python',
                uri: { fsPath: '/test/file.py' },
                getText: () => 'def test_func():\n    pass'
            } as vscode.TextDocument;

            const provider = codeLensManager.getProvider();
            provider.enable();
            
            const codeLenses = await provider.provideCodeLenses(mockDocument) as vscode.CodeLens[];
            
            // Check that no code lens contains analysis commands
            const hasAnalysisCommands = codeLenses.some(lens => {
                const title = lens.command?.title?.toLowerCase() || '';
                return title.includes('analyse file') || 
                       title.includes('analyse project') || 
                       title.includes('configure project');
            });
            
            assert.strictEqual(
                hasAnalysisCommands,
                false,
                'Should not show inline analysis commands'
            );
        });
    });

    suite('Error Handling', () => {
        test('should handle enable command errors gracefully', async () => {
            const showErrorMessageStub = sinon.stub(vscode.window, 'showErrorMessage');
            
            // Force an error by making enableCodeLens throw
            sinon.stub(codeLensManager, 'enableCodeLens').throws(new Error('Test error'));
            
            await codeLensHandler.handleEnableCodeLens();
            
            assert.strictEqual(
                showErrorMessageStub.called,
                true,
                'Should show error message when enable fails'
            );
        });

        test('should handle disable command errors gracefully', async () => {
            const showErrorMessageStub = sinon.stub(vscode.window, 'showErrorMessage');
            
            // Force an error by making disableCodeLens throw
            sinon.stub(codeLensManager, 'disableCodeLens').throws(new Error('Test error'));
            
            await codeLensHandler.handleDisableCodeLens();
            
            assert.strictEqual(
                showErrorMessageStub.called,
                true,
                'Should show error message when disable fails'
            );
        });
    });

    suite('Integration Tests', () => {
        test('should work with Python files only', async () => {
            // Test with non-Python file
            const mockNonPythonDocument = {
                languageId: 'javascript',
                uri: { fsPath: '/test/file.js' }
            } as vscode.TextDocument;

            const mockEditor = {
                document: mockNonPythonDocument
            } as vscode.TextEditor;

            sinon.stub(vscode.window, 'activeTextEditor').value(mockEditor);
            
            const triggerAnalysisSpy = sinon.spy(codeLensHandler as any, 'triggerCurrentFileAnalysis');
            
            await codeLensHandler.handleEnableCodeLens();
            
            assert.strictEqual(
                triggerAnalysisSpy.called,
                false,
                'Should not trigger analysis for non-Python files'
            );
        });

        test('should handle no active editor gracefully', async () => {
            sinon.stub(vscode.window, 'activeTextEditor').value(undefined);
            
            const triggerAnalysisSpy = sinon.spy(codeLensHandler as any, 'triggerCurrentFileAnalysis');
            
            await codeLensHandler.handleEnableCodeLens();
            
            assert.strictEqual(
                triggerAnalysisSpy.called,
                false,
                'Should not trigger analysis when no active editor'
            );
        });
    });
});