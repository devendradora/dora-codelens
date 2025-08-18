import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { TabbedWebviewProvider } from '../../tabbed-webview-provider';

suite('TabbedWebviewProvider Error Handling Tests', () => {
    let tabbedWebviewProvider: TabbedWebviewProvider;
    let mockContext: any;
    let mockOutputChannel: any;

    setup(() => {
        // Create mocks
        mockContext = {
            extensionUri: vscode.Uri.file('/test/extension'),
            subscriptions: [],
            extensionMode: vscode.ExtensionMode.Test
        };
        mockOutputChannel = {
            appendLine: sinon.stub(),
            show: sinon.stub(),
            hide: sinon.stub(),
            dispose: sinon.stub()
        };

        // Create tabbed webview provider
        tabbedWebviewProvider = new TabbedWebviewProvider(
            mockContext as any,
            mockOutputChannel as any
        );
    });

    teardown(() => {
        sinon.restore();
    });

    suite('Fallback Content Creation', () => {
        test('should create fallback content for techstack tab', () => {
            // Act
            const fallbackContent = (tabbedWebviewProvider as any).createFallbackContent('techstack');

            // Assert
            assert.strictEqual(fallbackContent.success, false);
            assert.strictEqual(fallbackContent.fallback, true);
            assert.ok(Array.isArray(fallbackContent.libraries));
            assert.ok(Array.isArray(fallbackContent.frameworks));
            assert.ok(Array.isArray(fallbackContent.dependencies));
            assert.strictEqual(fallbackContent.pythonVersion, 'Unknown');
            assert.strictEqual(fallbackContent.packageManager, 'pip');
        });

        test('should create fallback content for codegraph tab', () => {
            // Act
            const fallbackContent = (tabbedWebviewProvider as any).createFallbackContent('codegraph');

            // Assert
            assert.strictEqual(fallbackContent.success, false);
            assert.strictEqual(fallbackContent.fallback, true);
            assert.ok(fallbackContent.modules);
            assert.ok(Array.isArray(fallbackContent.modules.nodes));
            assert.ok(Array.isArray(fallbackContent.modules.edges));
            assert.ok(fallbackContent.functions);
            assert.ok(Array.isArray(fallbackContent.functions.nodes));
            assert.ok(Array.isArray(fallbackContent.functions.edges));
        });

        test('should create fallback content for gitanalytics tab', () => {
            // Act
            const fallbackContent = (tabbedWebviewProvider as any).createFallbackContent('gitanalytics');

            // Assert
            assert.strictEqual(fallbackContent.success, false);
            assert.strictEqual(fallbackContent.fallback, true);
            assert.ok(fallbackContent.repositoryInfo);
            assert.strictEqual(fallbackContent.repositoryInfo.name, 'Unknown');
            assert.strictEqual(fallbackContent.repositoryInfo.totalCommits, 0);
            assert.ok(Array.isArray(fallbackContent.authorContributions));
            assert.ok(Array.isArray(fallbackContent.commitTimeline));
        });

        test('should create fallback content for gitanalytics contributors subtab', () => {
            // Act
            const fallbackContent = (tabbedWebviewProvider as any).createFallbackContent('gitanalytics', 'contributors');

            // Assert
            assert.strictEqual(fallbackContent.success, false);
            assert.strictEqual(fallbackContent.fallback, true);
            assert.ok(Array.isArray(fallbackContent.contributors));
        });

        test('should create fallback content for dbschema tab', () => {
            // Act
            const fallbackContent = (tabbedWebviewProvider as any).createFallbackContent('dbschema');

            // Assert
            assert.strictEqual(fallbackContent.success, false);
            assert.strictEqual(fallbackContent.fallback, true);
            assert.ok(Array.isArray(fallbackContent.tables));
            assert.ok(Array.isArray(fallbackContent.relationships));
            assert.ok(fallbackContent.graphData);
            assert.ok(Array.isArray(fallbackContent.graphData.nodes));
            assert.ok(fallbackContent.metadata);
            assert.strictEqual(fallbackContent.metadata.totalTables, 0);
        });

        test('should create fallback content for unknown tab', () => {
            // Act
            const fallbackContent = (tabbedWebviewProvider as any).createFallbackContent('unknown');

            // Assert
            assert.strictEqual(fallbackContent.success, false);
            assert.strictEqual(fallbackContent.fallback, true);
            assert.strictEqual(fallbackContent.message, 'Analysis data not available');
        });
    });

    suite('Analysis Data Availability Check', () => {
        test('should return false when no analysis data', () => {
            // Act
            const isAvailable = (tabbedWebviewProvider as any).isAnalysisDataAvailable('techstack');

            // Assert
            assert.strictEqual(isAvailable, false);
        });

        test('should return true when techstack data is available', () => {
            // Arrange
            (tabbedWebviewProvider as any).analysisData = {
                techStack: {
                    libraries: [{ name: 'requests', version: '2.25.1' }],
                    frameworks: []
                }
            };

            // Act
            const isAvailable = (tabbedWebviewProvider as any).isAnalysisDataAvailable('techstack');

            // Assert
            assert.strictEqual(isAvailable, true);
        });

        test('should return true when codegraph data is available', () => {
            // Arrange
            (tabbedWebviewProvider as any).analysisData = {
                modules: {
                    nodes: [{ id: 'module1', name: 'test_module' }]
                }
            };

            // Act
            const isAvailable = (tabbedWebviewProvider as any).isAnalysisDataAvailable('codegraph');

            // Assert
            assert.strictEqual(isAvailable, true);
        });

        test('should return true when git analytics data is available', () => {
            // Arrange
            (tabbedWebviewProvider as any).analysisData = {
                gitAnalytics: {
                    authorContributions: [{ name: 'John Doe', commits: 10 }]
                }
            };

            // Act
            const isAvailable = (tabbedWebviewProvider as any).isAnalysisDataAvailable('gitanalytics');

            // Assert
            assert.strictEqual(isAvailable, true);
        });

        test('should return false for unknown tab', () => {
            // Act
            const isAvailable = (tabbedWebviewProvider as any).isAnalysisDataAvailable('unknown');

            // Assert
            assert.strictEqual(isAvailable, false);
        });
    });

    suite('Tab Content Retrieval', () => {
        test('should return actual data when available', () => {
            // Arrange
            const mockTechStack = {
                libraries: [{ name: 'requests', version: '2.25.1' }],
                frameworks: []
            };
            
            (tabbedWebviewProvider as any).analysisData = {
                techStack: mockTechStack
            };

            // Act
            const content = (tabbedWebviewProvider as any).getTabContent('techstack');

            // Assert
            assert.deepStrictEqual(content, mockTechStack);
        });

        test('should return fallback content when data unavailable', () => {
            // Act
            const content = (tabbedWebviewProvider as any).getTabContent('techstack');

            // Assert
            assert.strictEqual(content.success, false);
            assert.strictEqual(content.fallback, true);
            assert.ok(Array.isArray(content.libraries));
        });

        test('should return null for unknown tab with no fallback', () => {
            // Act
            const content = (tabbedWebviewProvider as any).getTabContent('unknown');

            // Assert
            assert.strictEqual(content.success, false);
            assert.strictEqual(content.fallback, true);
        });
    });

    suite('Loading and Error States', () => {
        test('should show loading state for tab', () => {
            // Arrange
            const mockPanel = {
                visible: true,
                webview: {
                    postMessage: sinon.stub()
                }
            };
            
            (tabbedWebviewProvider as any).panel = mockPanel;

            // Act
            tabbedWebviewProvider.showTabLoadingState('techstack', 'Loading tech stack...');

            // Assert
            assert.strictEqual(mockPanel.webview.postMessage.callCount, 1);
            const message = mockPanel.webview.postMessage.getCall(0).args[0];
            assert.strictEqual(message.command, 'showTabLoading');
            assert.strictEqual(message.tabId, 'techstack');
            assert.strictEqual(message.data.message, 'Loading tech stack...');
        });

        test('should show error state for tab', () => {
            // Arrange
            const mockPanel = {
                visible: true,
                webview: {
                    postMessage: sinon.stub()
                }
            };
            
            (tabbedWebviewProvider as any).panel = mockPanel;

            // Act
            tabbedWebviewProvider.showTabErrorState('gitanalytics', 'Git analysis failed', true);

            // Assert
            assert.strictEqual(mockPanel.webview.postMessage.callCount, 1);
            const message = mockPanel.webview.postMessage.getCall(0).args[0];
            assert.strictEqual(message.command, 'showTabError');
            assert.strictEqual(message.tabId, 'gitanalytics');
            assert.strictEqual(message.data.error, 'Git analysis failed');
            assert.strictEqual(message.data.canRetry, true);
            assert.ok(message.data.fallbackContent);
        });

        test('should not send messages when panel is not visible', () => {
            // Arrange
            const mockPanel = {
                visible: false,
                webview: {
                    postMessage: sinon.stub()
                }
            };
            
            (tabbedWebviewProvider as any).panel = mockPanel;

            // Act
            tabbedWebviewProvider.showTabLoadingState('techstack');

            // Assert
            assert.strictEqual(mockPanel.webview.postMessage.callCount, 0);
        });
    });

    suite('Message Handling', () => {
        test('should handle retry tab load message', () => {
            // Arrange
            const handleTabRetrySpy = sinon.spy(tabbedWebviewProvider as any, 'handleTabRetry');
            
            // Act
            (tabbedWebviewProvider as any).handleWebviewMessage({
                command: 'retryTabLoad',
                tabId: 'gitanalytics',
                subTabId: 'contributors'
            });

            // Assert
            assert.strictEqual(handleTabRetrySpy.callCount, 1);
            assert.strictEqual(handleTabRetrySpy.getCall(0).args[0], 'gitanalytics');
            assert.strictEqual(handleTabRetrySpy.getCall(0).args[1], 'contributors');
        });

        test('should handle request tab content message', () => {
            // Arrange
            const sendTabContentSpy = sinon.spy(tabbedWebviewProvider as any, 'sendTabContent');
            
            // Act
            (tabbedWebviewProvider as any).handleWebviewMessage({
                command: 'requestTabContent',
                tabId: 'dbschema',
                subTabId: 'sql'
            });

            // Assert
            assert.strictEqual(sendTabContentSpy.callCount, 1);
            assert.strictEqual(sendTabContentSpy.getCall(0).args[0], 'dbschema');
            assert.strictEqual(sendTabContentSpy.getCall(0).args[1], 'sql');
        });

        test('should handle unknown message gracefully', () => {
            // Act & Assert - should not throw
            (tabbedWebviewProvider as any).handleWebviewMessage({
                command: 'unknownCommand',
                data: { test: 'data' }
            });

            // Verify it was logged
            assert.ok(mockOutputChannel.appendLine.called);
        });
    });

    suite('Tab Retry Handling', () => {
        test('should trigger appropriate command for git analytics retry', () => {
            // Arrange
            const executeCommandStub = sinon.stub(vscode.commands, 'executeCommand');
            const showTabLoadingStateSpy = sinon.spy(tabbedWebviewProvider, 'showTabLoadingState');

            // Act
            (tabbedWebviewProvider as any).handleTabRetry('gitanalytics');

            // Assert
            assert.strictEqual(showTabLoadingStateSpy.callCount, 1);
            assert.strictEqual(executeCommandStub.callCount, 1);
            assert.strictEqual(executeCommandStub.getCall(0).args[0], 'doracodebird.gitAuthorStatistics');

            executeCommandStub.restore();
        });

        test('should trigger appropriate command for database schema retry', () => {
            // Arrange
            const executeCommandStub = sinon.stub(vscode.commands, 'executeCommand');

            // Act
            (tabbedWebviewProvider as any).handleTabRetry('dbschema');

            // Assert
            assert.strictEqual(executeCommandStub.callCount, 1);
            assert.strictEqual(executeCommandStub.getCall(0).args[0], 'doracodebird.dbSchemaGraphView');

            executeCommandStub.restore();
        });

        test('should send fallback content for unknown tab retry', () => {
            // Arrange
            const sendTabContentSpy = sinon.spy(tabbedWebviewProvider as any, 'sendTabContent');

            // Act
            (tabbedWebviewProvider as any).handleTabRetry('unknown');

            // Assert
            assert.strictEqual(sendTabContentSpy.callCount, 1);
            assert.strictEqual(sendTabContentSpy.getCall(0).args[0], 'unknown');
        });
    });

    suite('Tab Content Sending', () => {
        test('should send tab content with correct message format', () => {
            // Arrange
            const mockPanel = {
                webview: {
                    postMessage: sinon.stub()
                }
            };
            
            (tabbedWebviewProvider as any).panel = mockPanel;
            (tabbedWebviewProvider as any).analysisData = {
                techStack: { libraries: [], frameworks: [] }
            };

            // Act
            (tabbedWebviewProvider as any).sendTabContent('techstack', 'main');

            // Assert
            assert.strictEqual(mockPanel.webview.postMessage.callCount, 1);
            const message = mockPanel.webview.postMessage.getCall(0).args[0];
            assert.strictEqual(message.command, 'updateTabContent');
            assert.strictEqual(message.tabId, 'techstack');
            assert.strictEqual(message.subTabId, 'main');
            assert.ok(message.data);
        });
    });
});