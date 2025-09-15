import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { CommandManager } from '../../core/command-manager';
import { SidebarContentProvider } from '../../services/sidebar-content-provider';
import { ErrorHandler } from '../../core/error-handler';
import { DuplicateCallGuard } from '../../core/duplicate-call-guard';
import { AnalysisStateManager } from '../../core/analysis-state-manager';
import { WebviewManager } from '../../webviews/webview-manager';
import { BackgroundAnalysisManager } from '../../services/background-analysis-manager';

/**
 * Test suite for Command Registration Fix
 * Tests that the duplicate command registration issue is resolved
 */
suite('Command Registration Fix Tests', () => {
    let errorHandler: ErrorHandler;
    let duplicateCallGuard: DuplicateCallGuard;
    let stateManager: AnalysisStateManager;
    let webviewManager: WebviewManager;
    let commandManager: CommandManager;
    let sidebarContentProvider: SidebarContentProvider;
    let backgroundAnalysisManager: BackgroundAnalysisManager;
    let mockContext: vscode.ExtensionContext;
    let registerCommandStub: sinon.SinonStub;

    setup(() => {
        // Create mock output channel
        const mockOutputChannel = {
            appendLine: sinon.stub(),
            show: sinon.stub(),
            dispose: sinon.stub()
        } as any;

        // Initialize core components
        errorHandler = ErrorHandler.getInstance(mockOutputChannel);
        duplicateCallGuard = DuplicateCallGuard.getInstance(errorHandler);
        stateManager = AnalysisStateManager.getInstance(errorHandler);
        webviewManager = new WebviewManager(errorHandler, '/mock/extension/path');
        backgroundAnalysisManager = BackgroundAnalysisManager.getInstance(errorHandler);

        // Create mock extension context
        mockContext = {
            subscriptions: [],
            extensionPath: '/mock/extension/path',
            globalState: {
                get: sinon.stub(),
                update: sinon.stub()
            },
            workspaceState: {
                get: sinon.stub(),
                update: sinon.stub()
            }
        } as any;

        // Initialize command manager
        commandManager = CommandManager.getInstance(
            mockContext,
            errorHandler,
            duplicateCallGuard,
            stateManager,
            webviewManager
        );

        // Initialize sidebar content provider
        sidebarContentProvider = SidebarContentProvider.getInstance(
            errorHandler,
            stateManager,
            backgroundAnalysisManager,
            '/mock/extension/path'
        );

        // Connect command manager with sidebar content provider
        commandManager.setSidebarContentProvider(sidebarContentProvider);

        // Stub vscode.commands.registerCommand to track registrations
        registerCommandStub = sinon.stub(vscode.commands, 'registerCommand');
        registerCommandStub.returns({ dispose: sinon.stub() });
    });

    teardown(() => {
        sinon.restore();
        duplicateCallGuard.clearAllActiveCommands();
        stateManager.resetState();
        sidebarContentProvider.clear();
    });

    test('should register codeLensStateChanged command only once', () => {
        // Act - Register all commands
        commandManager.registerAllCommands();

        // Assert - Check that codeLensStateChanged command is registered exactly once
        const codeLensStateChangedCalls = registerCommandStub.getCalls().filter(
            call => call.args[0] === 'doracodelens.codeLensStateChanged'
        );

        assert.strictEqual(
            codeLensStateChangedCalls.length,
            1,
            'codeLensStateChanged command should be registered exactly once'
        );
    });

    test('should not register codeLensStateChanged command in SidebarContentProvider', () => {
        // Act - Initialize sidebar content provider (which calls registerStateListeners internally)
        // This happens during getInstance() call in setup

        // Assert - Check that SidebarContentProvider did not register the command
        const codeLensStateChangedCalls = registerCommandStub.getCalls().filter(
            call => call.args[0] === 'doracodelens.codeLensStateChanged'
        );

        // At this point, no commands should be registered yet since we haven't called registerAllCommands
        assert.strictEqual(
            codeLensStateChangedCalls.length,
            0,
            'SidebarContentProvider should not register codeLensStateChanged command'
        );
    });

    // Removed test for sidebar code lens state change notification
    // Code lens toggle buttons are no longer in sidebar

    test('should handle code lens state change gracefully when sidebar is not set', () => {
        // Arrange - Create a new command manager without sidebar
        const isolatedCommandManager = CommandManager.getInstance(
            mockContext,
            errorHandler,
            duplicateCallGuard,
            stateManager,
            webviewManager
        );
        // Don't set sidebar content provider

        // Act & Assert - Should not throw error
        assert.doesNotThrow(() => {
            isolatedCommandManager.handleCodeLensStateChanged(false);
        }, 'Should handle missing sidebar gracefully');
    });

    test('should register all expected commands without duplicates', () => {
        // Act - Register all commands
        commandManager.registerAllCommands();

        // Get all registered command names
        const registeredCommands = registerCommandStub.getCalls().map(call => call.args[0]);

        // Assert - Check for expected commands
        const expectedCommands = [
            'doracodelens.analyzeFullCode',
            'doracodelens.refreshFullCodeAnalysis',
            'doracodelens.analyzeCurrentFile',
            'doracodelens.analyzeGitAnalytics',
            'doracodelens.analyzeDatabaseSchema',
            'doracodelens.renderHTMLFile',
            'doracodelens.openSettings',
            'doracodelens.setupPythonPath',
            'doracodelens.detectPythonPath',
            'doracodelens.debugState',
            'doracodelens.resetState',
            'doracodelens.jsonFormat',
            'doracodelens.jsonTreeView',
            'doracodelens.jsonFix',
            'doracodelens.jsonMinify',
            'doracodelens.enableCodeLens',
            'doracodelens.disableCodeLens',
            'doracodelens.showFunctionDetails',
            'doracodelens.showClassDetails',
            'doracodelens.showMethodDetails',
            'doracodelens.applySuggestion',
            'doracodelens.showSuggestionDetails',
            'doracodelens.codeLensStateChanged',
            'doracodelens.updateCodeLensData',
            'doracodelens.showMessage',
            'doracodelens.refreshSidebar',
            'doracodelens.clearCache'
        ];

        // Check that all expected commands are registered
        for (const expectedCommand of expectedCommands) {
            assert.strictEqual(
                registeredCommands.includes(expectedCommand),
                true,
                `Command ${expectedCommand} should be registered`
            );
        }

        // Check for duplicates
        const commandCounts = registeredCommands.reduce((counts, command) => {
            counts[command] = (counts[command] || 0) + 1;
            return counts;
        }, {} as Record<string, number>);

        const duplicates = Object.entries(commandCounts).filter(([, count]) => (count as number) > 1);
        
        assert.strictEqual(
            duplicates.length,
            0,
            `No commands should be registered more than once. Duplicates found: ${JSON.stringify(duplicates)}`
        );
    });
});