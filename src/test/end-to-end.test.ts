import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AnalysisManager } from '../core/analysis-manager';
import { DoraCodeLensProvider } from '../services/code-lens-provider';
import { CodeLensHandler } from '../commands/code-lens-handler';
import { ErrorHandler } from '../core/error-handler';

suite('End-to-End Tests', () => {
    let analysisManager: AnalysisManager;
    let codeLensProvider: DoraCodeLensProvider;
    let codeLensHandler: CodeLensHandler;
    let errorHandler: ErrorHandler;
    let outputChannel: vscode.OutputChannel;
    let testWorkspaceUri: vscode.Uri;
    let testFiles: { [key: string]: vscode.Uri } = {};

    suiteSetup(async () => {
        // Create test workspace
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder available for testing');
        }
        
        testWorkspaceUri = workspaceFolders[0].uri;
        
        // Create test files
        await createTestFiles();
    });

    setup(async () => {
        // Create output channel for error handler
        outputChannel = vscode.window.createOutputChannel('DoraCodeLens Test');

        // Initialize error handler
        errorHandler = ErrorHandler.getInstance(outputChannel);

        // Initialize components
        analysisManager = AnalysisManager.getInstance(errorHandler);
        codeLensProvider = DoraCodeLensProvider.getInstance(errorHandler);
        
        // Create mock extension context for code lens handler
        const mockContext = {
            subscriptions: [],
            globalState: {
                get: () => false,
                update: () => Promise.resolve()
            }
        } as any;
        
        codeLensHandler = new CodeLensHandler(errorHandler, mockContext);

        // Register code lens provider with analysis manager
        analysisManager.registerCodeLensProvider(codeLensProvider);
    });

    teardown(() => {
        analysisManager.dispose();
        codeLensProvider.dispose();
        codeLensHandler.dispose();
        outputChannel.dispose();
    });

    suiteTeardown(async () => {
        // Clean up test files
        await cleanupTestFiles();
    });

    async function createTestFiles(): Promise<void> {
        const testDir = path.join(testWorkspaceUri.fsPath, 'test-e2e');
        
        // Ensure test directory exists
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        // Create simple Python file
        const simpleFile = path.join(testDir, 'simple.py');
        const simpleContent = `
def simple_function(x):
    """A simple function with good practices."""
    return x * 2

def another_simple_function(a, b):
    """Another simple function."""
    return a + b
`;
        fs.writeFileSync(simpleFile, simpleContent);
        testFiles.simple = vscode.Uri.file(simpleFile);

        // Create complex Python file
        const complexFile = path.join(testDir, 'complex.py');
        const complexContent = `
def complex_function(param1, param2, param3, param4, param5, param6):
    # This function has high complexity and many issues
    result = []
    for i in range(param1):
        if param2 > 0:
            for j in range(param2):
                if param3:
                    if param4 is not None:
                        if param5:
                            if param6:
                                result.append(i * j)
                            else:
                                result.append(i + j)
                        else:
                            result.append(i - j)
                    else:
                        result.append(i)
                else:
                    result.append(j)
            else:
                result.append(0)
        else:
            result.append(-1)
    return result

class ComplexClass:
    def __init__(self, data):
        self.data = data
    
    def complex_method(self, input_data, options, flags, settings, config):
        # Method with many parameters and no docstring
        processed = []
        for item in input_data:
            if options.get('validate'):
                if flags['strict']:
                    if settings['check_type']:
                        if config.get('allow_none') and item is not None:
                            processed.append(self._process_item(item))
                        elif not config.get('allow_none'):
                            processed.append(self._process_item(item))
                    else:
                        processed.append(item)
                else:
                    processed.append(item)
            else:
                processed.append(item)
        return processed
    
    def _process_item(self, item):
        return str(item).upper()

def long_function():
    # This function is very long
    line1 = "This is line 1"
    line2 = "This is line 2"
    line3 = "This is line 3"
    line4 = "This is line 4"
    line5 = "This is line 5"
    line6 = "This is line 6"
    line7 = "This is line 7"
    line8 = "This is line 8"
    line9 = "This is line 9"
    line10 = "This is line 10"
    line11 = "This is line 11"
    line12 = "This is line 12"
    line13 = "This is line 13"
    line14 = "This is line 14"
    line15 = "This is line 15"
    line16 = "This is line 16"
    line17 = "This is line 17"
    line18 = "This is line 18"
    line19 = "This is line 19"
    line20 = "This is line 20"
    line21 = "This is line 21"
    line22 = "This is line 22"
    line23 = "This is line 23"
    line24 = "This is line 24"
    line25 = "This is line 25"
    line26 = "This is line 26"
    line27 = "This is line 27"
    line28 = "This is line 28"
    line29 = "This is line 29"
    line30 = "This is line 30"
    line31 = "This is line 31"
    line32 = "This is line 32"
    line33 = "This is line 33"
    line34 = "This is line 34"
    line35 = "This is line 35"
    line36 = "This is line 36"
    line37 = "This is line 37"
    line38 = "This is line 38"
    line39 = "This is line 39"
    line40 = "This is line 40"
    line41 = "This is line 41"
    line42 = "This is line 42"
    line43 = "This is line 43"
    line44 = "This is line 44"
    line45 = "This is line 45"
    line46 = "This is line 46"
    line47 = "This is line 47"
    line48 = "This is line 48"
    line49 = "This is line 49"
    line50 = "This is line 50"
    line51 = "This is line 51"
    line52 = "This is line 52"
    line53 = "This is line 53"
    line54 = "This is line 54"
    line55 = "This is line 55"
    return [line1, line2, line3, line4, line5, line6, line7, line8, line9, line10,
            line11, line12, line13, line14, line15, line16, line17, line18, line19, line20,
            line21, line22, line23, line24, line25, line26, line27, line28, line29, line30,
            line31, line32, line33, line34, line35, line36, line37, line38, line39, line40,
            line41, line42, line43, line44, line45, line46, line47, line48, line49, line50,
            line51, line52, line53, line54, line55]
`;
        fs.writeFileSync(complexFile, complexContent);
        testFiles.complex = vscode.Uri.file(complexFile);

        // Create file with mixed quality
        const mixedFile = path.join(testDir, 'mixed.py');
        const mixedContent = `
def good_function(data):
    """A well-documented function with reasonable complexity."""
    if not data:
        return []
    
    return [item.strip() for item in data if item.strip()]

def problematic_function(a, b, c, d, e):
    # No docstring, many parameters
    if a:
        if b:
            if c:
                if d:
                    return e
                else:
                    return d
            else:
                return c
        else:
            return b
    else:
        return a

class WellDesignedClass:
    """A well-designed class with proper documentation."""
    
    def __init__(self, name: str):
        """Initialize with a name."""
        self.name = name
    
    def get_name(self) -> str:
        """Get the name."""
        return self.name
    
    def set_name(self, name: str) -> None:
        """Set the name."""
        self.name = name

class ProblematicClass:
    def method_without_docs(self, param1, param2, param3, param4):
        for i in range(param1):
            for j in range(param2):
                if param3:
                    if param4:
                        return i * j
        return 0
`;
        fs.writeFileSync(mixedFile, mixedContent);
        testFiles.mixed = vscode.Uri.file(mixedFile);
    }

    async function cleanupTestFiles(): Promise<void> {
        const testDir = path.join(testWorkspaceUri.fsPath, 'test-e2e');
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    }

    suite('Complete Workflow Tests', () => {
        test('should complete full analysis and code lens workflow for simple file', async () => {
            // Open simple test file
            const document = await vscode.workspace.openTextDocument(testFiles.simple);
            const editor = await vscode.window.showTextDocument(document);

            // Simulate analysis data (in real scenario, this would come from Python analyzer)
            const mockAnalysisData = {
                files: [{
                    path: document.uri.fsPath,
                    functions: [
                        {
                            name: 'simple_function',
                            complexity: 1,
                            cyclomatic_complexity: 1,
                            line_count: 3,
                            parameters: [{ name: 'x', type: 'any' }],
                            has_docstring: true,
                            line_number: 2
                        },
                        {
                            name: 'another_simple_function',
                            complexity: 1,
                            cyclomatic_complexity: 1,
                            line_count: 3,
                            parameters: [
                                { name: 'a', type: 'any' },
                                { name: 'b', type: 'any' }
                            ],
                            has_docstring: true,
                            line_number: 6
                        }
                    ],
                    classes: []
                }]
            };

            // Update analysis data
            codeLensProvider.updateAnalysisData(mockAnalysisData);

            // Enable code lens
            await codeLensHandler.handleEnableCodeLens();

            // Generate code lenses
            const codeLenses = await codeLensProvider.provideCodeLenses(document);

            // Verify results
            assert.ok(Array.isArray(codeLenses));
            assert.ok(codeLenses.length > 0);

            // Should have complexity indicators for both functions
            const complexityLenses = codeLenses.filter(lens =>
                lens.command?.title.includes('Complexity')
            );
            assert.ok(complexityLenses.length >= 2);

            // Should show low complexity (green indicators)
            const lowComplexityLenses = codeLenses.filter(lens =>
                lens.command?.title.includes('$(check)') ||
                lens.command?.title.includes('low')
            );
            assert.ok(lowComplexityLenses.length > 0);

            // Should have minimal suggestions for well-written functions
            const suggestionLenses = codeLenses.filter(lens =>
                lens.command?.title.includes('$(lightbulb)') ||
                lens.command?.title.includes('$(warning)') ||
                lens.command?.title.includes('$(error)')
            );
            // Well-documented, simple functions should have few or no suggestions
            assert.ok(suggestionLenses.length <= 2);
        });

        test('should complete full analysis and code lens workflow for complex file', async () => {
            // Open complex test file
            const document = await vscode.workspace.openTextDocument(testFiles.complex);
            const editor = await vscode.window.showTextDocument(document);

            // Simulate analysis data for complex file
            const mockAnalysisData = {
                files: [{
                    path: document.uri.fsPath,
                    functions: [
                        {
                            name: 'complex_function',
                            complexity: 15,
                            cyclomatic_complexity: 15,
                            line_count: 25,
                            parameters: [
                                { name: 'param1' }, { name: 'param2' }, { name: 'param3' },
                                { name: 'param4' }, { name: 'param5' }, { name: 'param6' }
                            ],
                            has_docstring: false,
                            line_number: 2
                        },
                        {
                            name: 'long_function',
                            complexity: 3,
                            cyclomatic_complexity: 3,
                            line_count: 65,
                            parameters: [],
                            has_docstring: false,
                            line_number: 45
                        }
                    ],
                    classes: [
                        {
                            name: 'ComplexClass',
                            line_number: 25,
                            methods: [
                                {
                                    name: 'complex_method',
                                    complexity: 12,
                                    cyclomatic_complexity: 12,
                                    line_count: 20,
                                    parameters: [
                                        { name: 'self' }, { name: 'input_data' },
                                        { name: 'options' }, { name: 'flags' },
                                        { name: 'settings' }, { name: 'config' }
                                    ],
                                    has_docstring: false,
                                    line_number: 30
                                }
                            ]
                        }
                    ]
                }]
            };

            // Update analysis data
            codeLensProvider.updateAnalysisData(mockAnalysisData);

            // Enable code lens
            await codeLensHandler.handleEnableCodeLens();

            // Generate code lenses
            const codeLenses = await codeLensProvider.provideCodeLenses(document);

            // Verify results
            assert.ok(Array.isArray(codeLenses));
            assert.ok(codeLenses.length > 0);

            // Should have high complexity indicators (red)
            const highComplexityLenses = codeLenses.filter(lens =>
                lens.command?.title.includes('$(error)') ||
                lens.command?.title.includes('high')
            );
            assert.ok(highComplexityLenses.length > 0);

            // Should have many suggestions for problematic code
            const suggestionLenses = codeLenses.filter(lens =>
                lens.command?.title.includes('$(lightbulb)') ||
                lens.command?.title.includes('$(warning)') ||
                lens.command?.title.includes('$(error)')
            );
            assert.ok(suggestionLenses.length > 5);

            // Should suggest complexity reduction
            const complexitySuggestions = codeLenses.filter(lens =>
                lens.command?.title.toLowerCase().includes('complexity') ||
                lens.command?.title.toLowerCase().includes('refactor') ||
                lens.command?.title.toLowerCase().includes('break')
            );
            assert.ok(complexitySuggestions.length > 0);

            // Should suggest documentation
            const docSuggestions = codeLenses.filter(lens =>
                lens.command?.title.toLowerCase().includes('documentation') ||
                lens.command?.title.toLowerCase().includes('docstring')
            );
            assert.ok(docSuggestions.length > 0);

            // Should suggest parameter reduction
            const paramSuggestions = codeLenses.filter(lens =>
                lens.command?.title.toLowerCase().includes('parameter') ||
                lens.command?.title.toLowerCase().includes('dataclass')
            );
            assert.ok(paramSuggestions.length > 0);
        });

        test('should handle user interactions with code lens suggestions', async () => {
            // Open mixed quality file
            const document = await vscode.workspace.openTextDocument(testFiles.mixed);
            const editor = await vscode.window.showTextDocument(document);

            // Mock analysis data
            const mockAnalysisData = {
                files: [{
                    path: document.uri.fsPath,
                    functions: [
                        {
                            name: 'problematic_function',
                            complexity: 8,
                            cyclomatic_complexity: 8,
                            line_count: 15,
                            parameters: [
                                { name: 'a' }, { name: 'b' }, { name: 'c' },
                                { name: 'd' }, { name: 'e' }
                            ],
                            has_docstring: false,
                            line_number: 8
                        }
                    ],
                    classes: []
                }]
            };

            codeLensProvider.updateAnalysisData(mockAnalysisData);
            await codeLensHandler.handleEnableCodeLens();

            // Test function details command
            const func = mockAnalysisData.files[0].functions[0];
            
            // This should not throw an error
            await codeLensHandler.handleShowFunctionDetails(func, document.uri);
            
            // Test suggestion application (mock suggestion)
            const mockSuggestion = {
                id: 'test-suggestion',
                type: 'documentation' as const,
                message: 'Add documentation for better maintainability',
                severity: 'info' as const,
                priority: 3,
                actionable: true,
                quickFix: 'Add docstring'
            };

            // This should not throw an error
            await codeLensHandler.handleApplySuggestion(mockSuggestion, func, document.uri);
        });
    });

    suite('Configuration and State Management', () => {
        test('should persist code lens state across sessions', async () => {
            // Enable code lens
            await codeLensHandler.handleEnableCodeLens();
            assert.ok(codeLensHandler.isEnabled());

            // Disable code lens
            await codeLensHandler.handleDisableCodeLens();
            assert.ok(!codeLensHandler.isEnabled());

            // Re-enable
            await codeLensHandler.handleEnableCodeLens();
            assert.ok(codeLensHandler.isEnabled());
        });

        test('should handle configuration changes dynamically', async () => {
            const document = await vscode.workspace.openTextDocument(testFiles.simple);
            
            // Mock analysis data
            const mockAnalysisData = {
                files: [{
                    path: document.uri.fsPath,
                    functions: [{
                        name: 'test_function',
                        complexity: 5,
                        cyclomatic_complexity: 5,
                        line_count: 10,
                        parameters: [{ name: 'param1' }],
                        has_docstring: false,
                        line_number: 2
                    }],
                    classes: []
                }]
            };

            codeLensProvider.updateAnalysisData(mockAnalysisData);
            await codeLensHandler.handleEnableCodeLens();

            // Test with suggestions enabled
            codeLensProvider.updateConfig({ showSuggestions: true });
            const codeLensesWithSuggestions = await codeLensProvider.provideCodeLenses(document);

            // Test with suggestions disabled
            codeLensProvider.updateConfig({ showSuggestions: false });
            const codeLensesWithoutSuggestions = await codeLensProvider.provideCodeLenses(document);

            // Should have different number of code lenses
            assert.notStrictEqual(
                codeLensesWithSuggestions.length,
                codeLensesWithoutSuggestions.length
            );
        });
    });

    suite('Error Handling and Recovery', () => {
        test('should handle missing analysis data gracefully', async () => {
            const document = await vscode.workspace.openTextDocument(testFiles.simple);
            
            // Don't provide analysis data
            await codeLensHandler.handleEnableCodeLens();

            // Should not throw error
            const codeLenses = await codeLensProvider.provideCodeLenses(document);
            
            assert.ok(Array.isArray(codeLenses));
            
            // Should show placeholder or be empty
            if (codeLenses.length > 0) {
                const hasPlaceholder = codeLenses.some(lens =>
                    lens.command?.title.includes('pending') ||
                    lens.command?.title.includes('loading')
                );
                assert.ok(hasPlaceholder);
            }
        });

        test('should recover from analysis errors', async () => {
            const document = await vscode.workspace.openTextDocument(testFiles.complex);
            
            // Provide invalid analysis data
            const invalidData = { invalid: 'data' };
            codeLensProvider.updateAnalysisData(invalidData);
            
            await codeLensHandler.handleEnableCodeLens();

            // Should handle gracefully
            const codeLenses = await codeLensProvider.provideCodeLenses(document);
            assert.ok(Array.isArray(codeLenses));

            // Now provide valid data
            const validData = {
                files: [{
                    path: document.uri.fsPath,
                    functions: [{
                        name: 'test_function',
                        complexity: 3,
                        cyclomatic_complexity: 3,
                        line_count: 10,
                        parameters: [],
                        has_docstring: true,
                        line_number: 2
                    }],
                    classes: []
                }]
            };

            codeLensProvider.updateAnalysisData(validData);
            const validCodeLenses = await codeLensProvider.provideCodeLenses(document);
            
            // Should now work properly
            assert.ok(validCodeLenses.length > 0);
        });
    });

    suite('Performance in Real Scenarios', () => {
        test('should handle rapid file switching', async () => {
            const documents = await Promise.all([
                vscode.workspace.openTextDocument(testFiles.simple),
                vscode.workspace.openTextDocument(testFiles.complex),
                vscode.workspace.openTextDocument(testFiles.mixed)
            ]);

            await codeLensHandler.handleEnableCodeLens();

            // Rapidly switch between files and generate code lenses
            const startTime = Date.now();
            
            for (const document of documents) {
                await vscode.window.showTextDocument(document);
                
                // Mock analysis data for each file
                const mockData = {
                    files: [{
                        path: document.uri.fsPath,
                        functions: [{
                            name: 'test_function',
                            complexity: 3,
                            line_count: 10,
                            parameters: [],
                            has_docstring: true,
                            line_number: 2
                        }],
                        classes: []
                    }]
                };
                
                codeLensProvider.updateAnalysisData(mockData);
                await codeLensProvider.provideCodeLenses(document);
            }

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // Should complete within reasonable time
            assert.ok(totalTime < 3000, `File switching took ${totalTime}ms, expected < 3000ms`);
        });

        test('should maintain responsiveness during analysis', async () => {
            const document = await vscode.workspace.openTextDocument(testFiles.complex);
            await vscode.window.showTextDocument(document);

            // Create large analysis data
            const largeFunctions = Array.from({ length: 100 }, (_, i) => ({
                name: `function_${i}`,
                complexity: Math.floor(Math.random() * 20) + 1,
                line_count: Math.floor(Math.random() * 50) + 10,
                parameters: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, j) => ({
                    name: `param_${j}`
                })),
                has_docstring: Math.random() > 0.5,
                line_number: i * 10 + 10
            }));

            const largeData = {
                files: [{
                    path: document.uri.fsPath,
                    functions: largeFunctions,
                    classes: []
                }]
            };

            await codeLensHandler.handleEnableCodeLens();

            const startTime = Date.now();
            codeLensProvider.updateAnalysisData(largeData);
            const codeLenses = await codeLensProvider.provideCodeLenses(document);
            const endTime = Date.now();

            const processingTime = endTime - startTime;

            // Should maintain responsiveness
            assert.ok(processingTime < 5000, `Large file processing took ${processingTime}ms, expected < 5000ms`);
            assert.ok(Array.isArray(codeLenses));
        });
    });
});