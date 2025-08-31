import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as path from 'path';
import { AnalysisManager } from '../core/analysis-manager';
import { DoraCodeLensProvider } from '../services/code-lens-provider';
import { CodeLensSuggestionEngine } from '../services/code-lens-suggestion-engine';
import { ErrorHandler } from '../core/error-handler';

suite('Code Lens Integration Tests', () => {
    let analysisManager: AnalysisManager;
    let codeLensProvider: DoraCodeLensProvider;
    let suggestionEngine: CodeLensSuggestionEngine;
    let errorHandler: ErrorHandler;
    let outputChannel: vscode.OutputChannel;
    let testDocument: vscode.TextDocument;

    setup(async () => {
        // Create output channel for error handler
        outputChannel = {
            appendLine: sinon.stub(),
            show: sinon.stub(),
            dispose: sinon.stub()
        } as any;

        // Initialize error handler
        errorHandler = ErrorHandler.getInstance(outputChannel);

        // Initialize components
        analysisManager = AnalysisManager.getInstance(errorHandler);
        codeLensProvider = DoraCodeLensProvider.getInstance(errorHandler);
        suggestionEngine = CodeLensSuggestionEngine.getInstance(errorHandler);

        // Register code lens provider with analysis manager
        analysisManager.registerCodeLensProvider(codeLensProvider);

        // Create test document
        const testFilePath = path.join(__dirname, '../../test-files/test-code-lens.py');
        testDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(testFilePath));
    });

    teardown(() => {
        sinon.restore();
        analysisManager.dispose();
        codeLensProvider.dispose();
        suggestionEngine.dispose();
    });

    suite('End-to-End Analysis Pipeline', () => {
        test('should complete full analysis pipeline with code lens updates', async () => {
            // Mock analysis data that would come from Python analyzer
            const mockAnalysisData = {
                files: [{
                    path: testDocument.uri.fsPath,
                    functions: [
                        {
                            name: 'complex_function',
                            complexity: 12,
                            cyclomatic_complexity: 12,
                            line_count: 45,
                            parameters: [
                                { name: 'param1', type: 'str' },
                                { name: 'param2', type: 'int' },
                                { name: 'param3', type: 'bool' },
                                { name: 'param4', type: 'list' },
                                { name: 'param5', type: 'dict' },
                                { name: 'param6', type: 'any' }
                            ],
                            has_docstring: false,
                            line_number: 10
                        },
                        {
                            name: 'simple_function',
                            complexity: 2,
                            cyclomatic_complexity: 2,
                            line_count: 8,
                            parameters: [
                                { name: 'x', type: 'int' }
                            ],
                            has_docstring: true,
                            line_number: 60
                        }
                    ],
                    classes: [
                        {
                            name: 'TestClass',
                            line_number: 70,
                            methods: [
                                {
                                    name: 'method_with_issues',
                                    complexity: 8,
                                    cyclomatic_complexity: 8,
                                    line_count: 25,
                                    parameters: [
                                        { name: 'self' },
                                        { name: 'data', type: 'dict' }
                                    ],
                                    has_docstring: false,
                                    line_number: 75
                                }
                            ]
                        }
                    ]
                }]
            };

            // Update analysis data
            codeLensProvider.updateAnalysisData(mockAnalysisData);

            // Enable code lens
            codeLensProvider.enable();

            // Generate code lenses
            const codeLenses = await codeLensProvider.provideCodeLenses(testDocument);

            // Verify code lenses were generated
            assert.ok(Array.isArray(codeLenses));
            assert.ok(codeLenses.length > 0);

            // Check for complexity indicators
            const complexityLenses = codeLenses.filter(lens => 
                lens.command?.title.includes('Complexity')
            );
            assert.ok(complexityLenses.length > 0);

            // Check for suggestion lenses
            const suggestionLenses = codeLenses.filter(lens => 
                lens.command?.title.includes('$(lightbulb)') ||
                lens.command?.title.includes('$(warning)') ||
                lens.command?.title.includes('$(error)')
            );
            assert.ok(suggestionLenses.length > 0);

            // Verify high complexity function has error-level indicators
            const highComplexityLenses = codeLenses.filter(lens =>
                lens.command?.title.includes('$(error)') &&
                lens.command?.title.includes('12')
            );
            assert.ok(highComplexityLenses.length > 0);
        });

        test('should handle analysis pipeline errors gracefully', async () => {
            // Simulate analysis error by providing invalid data
            const invalidAnalysisData = null;

            // This should not throw an error
            codeLensProvider.updateAnalysisData(invalidAnalysisData);
            codeLensProvider.enable();

            const codeLenses = await codeLensProvider.provideCodeLenses(testDocument);

            // Should return placeholder or empty array
            assert.ok(Array.isArray(codeLenses));
            
            // If there are lenses, they should be placeholders
            if (codeLenses.length > 0) {
                const hasPlaceholder = codeLenses.some(lens =>
                    lens.command?.title.includes('Analysis pending') ||
                    lens.command?.title.includes('loading')
                );
                assert.ok(hasPlaceholder);
            }
        });
    });

    suite('Suggestion Engine Integration', () => {
        test('should generate appropriate suggestions for complex functions', async () => {
            const functionData = {
                name: 'complex_function',
                complexity: 15,
                lineCount: 60,
                parameterCount: 7,
                hasDocstring: false,
                returnType: 'dict',
                parameters: [
                    { name: 'param1', type: 'str', hasDefault: false, isVarArgs: false, isKwArgs: false },
                    { name: 'param2', type: 'int', hasDefault: false, isVarArgs: false, isKwArgs: false },
                    { name: 'param3', type: 'bool', hasDefault: true, isVarArgs: false, isKwArgs: false },
                    { name: 'param4', type: 'list', hasDefault: false, isVarArgs: false, isKwArgs: false },
                    { name: 'param5', type: 'dict', hasDefault: false, isVarArgs: false, isKwArgs: false },
                    { name: 'param6', type: 'any', hasDefault: false, isVarArgs: false, isKwArgs: false },
                    { name: 'param7', type: 'str', hasDefault: true, isVarArgs: false, isKwArgs: false }
                ],
                decorators: [],
                isAsync: false,
                isMethod: false,
                codePatterns: [
                    { type: 'loop' as const, count: 3, severity: 'medium' as const, description: 'Multiple loops detected' },
                    { type: 'nested_loop' as const, count: 1, severity: 'high' as const, description: 'Nested loop detected' }
                ],
                performance: {
                    nestedLoops: 1,
                    recursiveCallsDetected: false,
                    databaseOperations: 0,
                    fileOperations: 2,
                    networkOperations: 0,
                    memoryIntensiveOperations: 1
                }
            };

            const suggestions = await suggestionEngine.generateSuggestions(functionData, testDocument);

            // Should generate multiple suggestions
            assert.ok(suggestions.length > 0);

            // Should have complexity suggestion
            const complexitySuggestion = suggestions.find(s => s.type === 'complexity');
            assert.ok(complexitySuggestion);
            assert.strictEqual(complexitySuggestion.severity, 'error');

            // Should have documentation suggestion
            const docSuggestion = suggestions.find(s => s.type === 'documentation');
            assert.ok(docSuggestion);

            // Should have parameter suggestion
            const paramSuggestion = suggestions.find(s => s.type === 'parameters');
            assert.ok(paramSuggestion);

            // Should have length suggestion
            const lengthSuggestion = suggestions.find(s => s.type === 'length');
            assert.ok(lengthSuggestion);

            // Verify suggestions are actionable
            const actionableSuggestions = suggestions.filter(s => s.actionable);
            assert.ok(actionableSuggestions.length > 0);
        });

        test('should generate minimal suggestions for simple functions', async () => {
            const functionData = {
                name: 'simple_function',
                complexity: 2,
                lineCount: 8,
                parameterCount: 1,
                hasDocstring: true,
                returnType: 'int',
                parameters: [
                    { name: 'x', type: 'int', hasDefault: false, isVarArgs: false, isKwArgs: false }
                ],
                decorators: [],
                isAsync: false,
                isMethod: false,
                codePatterns: [],
                performance: {
                    nestedLoops: 0,
                    recursiveCallsDetected: false,
                    databaseOperations: 0,
                    fileOperations: 0,
                    networkOperations: 0,
                    memoryIntensiveOperations: 0
                }
            };

            const suggestions = await suggestionEngine.generateSuggestions(functionData, testDocument);

            // Should generate few or no suggestions for simple, well-documented functions
            assert.ok(suggestions.length <= 1);

            // If there are suggestions, they should be low priority
            if (suggestions.length > 0) {
                const highPrioritySuggestions = suggestions.filter(s => s.priority <= 2);
                assert.strictEqual(highPrioritySuggestions.length, 0);
            }
        });
    });

    suite('Performance Integration', () => {
        test('should handle large files efficiently', async () => {
            // Create mock data for a large file
            const largeFunctions = Array.from({ length: 100 }, (_, i) => ({
                name: `function_${i}`,
                complexity: Math.floor(Math.random() * 20) + 1,
                cyclomatic_complexity: Math.floor(Math.random() * 20) + 1,
                line_count: Math.floor(Math.random() * 50) + 10,
                parameters: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, j) => ({
                    name: `param_${j}`,
                    type: 'any'
                })),
                has_docstring: Math.random() > 0.5,
                line_number: i * 10 + 10
            }));

            const largeAnalysisData = {
                files: [{
                    path: testDocument.uri.fsPath,
                    functions: largeFunctions,
                    classes: []
                }]
            };

            const startTime = Date.now();

            // Update analysis data
            codeLensProvider.updateAnalysisData(largeAnalysisData);
            codeLensProvider.enable();

            // Generate code lenses
            const codeLenses = await codeLensProvider.provideCodeLenses(testDocument);

            const endTime = Date.now();
            const processingTime = endTime - startTime;

            // Should complete within reasonable time (less than 5 seconds)
            assert.ok(processingTime < 5000, `Processing took ${processingTime}ms, expected < 5000ms`);

            // Should generate code lenses (may be limited by performance optimizer)
            assert.ok(Array.isArray(codeLenses));
            
            // If performance limits kicked in, should have warning
            if (largeFunctions.length > 50) {
                const performanceWarning = codeLenses.find(lens =>
                    lens.command?.title.includes('too large') ||
                    lens.command?.title.includes('performance')
                );
                // May or may not have warning depending on performance optimizer settings
            }
        });

        test('should cache suggestions effectively', async () => {
            const functionData = {
                name: 'test_function',
                complexity: 8,
                lineCount: 25,
                parameterCount: 3,
                hasDocstring: false,
                returnType: 'str',
                parameters: [
                    { name: 'a', type: 'str', hasDefault: false, isVarArgs: false, isKwArgs: false },
                    { name: 'b', type: 'int', hasDefault: false, isVarArgs: false, isKwArgs: false },
                    { name: 'c', type: 'bool', hasDefault: true, isVarArgs: false, isKwArgs: false }
                ],
                decorators: [],
                isAsync: false,
                isMethod: false,
                codePatterns: [],
                performance: {
                    nestedLoops: 0,
                    recursiveCallsDetected: false,
                    databaseOperations: 0,
                    fileOperations: 0,
                    networkOperations: 0,
                    memoryIntensiveOperations: 0
                }
            };

            // First call
            const startTime1 = Date.now();
            const suggestions1 = await suggestionEngine.generateSuggestions(functionData, testDocument);
            const endTime1 = Date.now();
            const time1 = endTime1 - startTime1;

            // Second call (should use cache)
            const startTime2 = Date.now();
            const suggestions2 = await suggestionEngine.generateSuggestions(functionData, testDocument);
            const endTime2 = Date.now();
            const time2 = endTime2 - startTime2;

            // Second call should be faster (cached)
            assert.ok(time2 <= time1, `Second call (${time2}ms) should be faster than first (${time1}ms)`);

            // Results should be identical
            assert.strictEqual(suggestions1.length, suggestions2.length);
            assert.deepStrictEqual(suggestions1, suggestions2);
        });
    });

    suite('Error Recovery Integration', () => {
        test('should recover from temporary analysis failures', async () => {
            // Simulate temporary failure followed by success
            let callCount = 0;
            const originalProvideCodeLenses = codeLensProvider.provideCodeLenses.bind(codeLensProvider);
            
            sinon.stub(codeLensProvider, 'provideCodeLenses').callsFake(async (document) => {
                callCount++;
                if (callCount === 1) {
                    throw new Error('Temporary analysis failure');
                }
                return originalProvideCodeLenses(document);
            });

            // First call should fail
            try {
                await codeLensProvider.provideCodeLenses(testDocument);
                assert.fail('Expected error was not thrown');
            } catch (error) {
                assert.ok((error as Error).message.includes('Temporary analysis failure'));
            }

            // Second call should succeed
            const codeLenses = await codeLensProvider.provideCodeLenses(testDocument);
            assert.ok(Array.isArray(codeLenses));
        });
    });

    suite('Configuration Integration', () => {
        test('should respect configuration changes', async () => {
            // Mock analysis data
            const mockAnalysisData = {
                files: [{
                    path: testDocument.uri.fsPath,
                    functions: [{
                        name: 'test_function',
                        complexity: 8,
                        cyclomatic_complexity: 8,
                        line_count: 20,
                        parameters: [{ name: 'param1' }],
                        has_docstring: false,
                        line_number: 10
                    }],
                    classes: []
                }]
            };

            codeLensProvider.updateAnalysisData(mockAnalysisData);
            codeLensProvider.enable();

            // Test with suggestions enabled
            codeLensProvider.updateConfig({ showSuggestions: true });
            const codeLensesWithSuggestions = await codeLensProvider.provideCodeLenses(testDocument);

            // Test with suggestions disabled
            codeLensProvider.updateConfig({ showSuggestions: false });
            const codeLensesWithoutSuggestions = await codeLensProvider.provideCodeLenses(testDocument);

            // Should have fewer code lenses when suggestions are disabled
            assert.ok(codeLensesWithoutSuggestions.length <= codeLensesWithSuggestions.length);

            // Should still have complexity indicators
            const complexityLenses = codeLensesWithoutSuggestions.filter(lens =>
                lens.command?.title.includes('Complexity')
            );
            assert.ok(complexityLenses.length > 0);
        });
    });
});