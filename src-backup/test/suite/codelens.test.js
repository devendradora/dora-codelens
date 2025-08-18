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
const codelens_provider_1 = require("../../codelens-provider");
suite('ComplexityCodeLensProvider Test Suite', () => {
    let provider;
    let outputChannel;
    setup(() => {
        outputChannel = vscode.window.createOutputChannel('Test');
        provider = new codelens_provider_1.ComplexityCodeLensProvider(outputChannel);
    });
    teardown(() => {
        outputChannel.dispose();
    });
    test('should create provider instance', () => {
        assert.ok(provider);
        assert.ok(provider instanceof codelens_provider_1.ComplexityCodeLensProvider);
    });
    test('should return empty array for non-Python files', async () => {
        // Create a mock document for a non-Python file
        const mockDocument = {
            languageId: 'javascript',
            uri: vscode.Uri.file('/test/file.js'),
            lineCount: 10,
            lineAt: (line) => ({ text: 'console.log("test");' })
        };
        const codeLenses = await provider.provideCodeLenses(mockDocument, new vscode.CancellationTokenSource().token);
        assert.ok(codeLenses);
        assert.strictEqual(codeLenses.length, 0);
    });
    test('should return empty array when CodeLens is disabled', async () => {
        // Mock configuration to disable CodeLens
        const originalGet = vscode.workspace.getConfiguration;
        vscode.workspace.getConfiguration = (section) => ({
            get: (key, defaultValue) => {
                if (key === 'showComplexityCodeLens') {
                    return false;
                }
                return defaultValue;
            }
        });
        const mockDocument = {
            languageId: 'python',
            uri: vscode.Uri.file('/test/file.py'),
            lineCount: 10,
            lineAt: (line) => ({ text: 'def test_function():' })
        };
        const codeLenses = await provider.provideCodeLenses(mockDocument, new vscode.CancellationTokenSource().token);
        assert.ok(codeLenses);
        assert.strictEqual(codeLenses.length, 0);
        // Restore original configuration
        vscode.workspace.getConfiguration = originalGet;
    });
    test('should return empty array when no analysis data', async () => {
        const mockDocument = {
            languageId: 'python',
            uri: vscode.Uri.file('/test/file.py'),
            lineCount: 10,
            lineAt: (line) => ({ text: 'def test_function():' })
        };
        const codeLenses = await provider.provideCodeLenses(mockDocument, new vscode.CancellationTokenSource().token);
        assert.ok(codeLenses);
        assert.strictEqual(codeLenses.length, 0);
    });
    test('should provide CodeLens for functions in analysis data', async () => {
        // Mock workspace folder
        const mockWorkspaceFolder = {
            uri: vscode.Uri.file('/test'),
            name: 'test',
            index: 0
        };
        const originalGetWorkspaceFolder = vscode.workspace.getWorkspaceFolder;
        vscode.workspace.getWorkspaceFolder = () => mockWorkspaceFolder;
        // Mock configuration
        const originalGetConfiguration = vscode.workspace.getConfiguration;
        vscode.workspace.getConfiguration = (section) => ({
            get: (key, defaultValue) => {
                if (key === 'showComplexityCodeLens') {
                    return true;
                }
                if (key === 'complexityThresholds') {
                    return { low: 5, medium: 10, high: 20 };
                }
                return defaultValue;
            }
        });
        // Create mock analysis data
        const mockAnalysisData = {
            functions: {
                nodes: [
                    {
                        id: 'test_function',
                        name: 'test_function',
                        module: 'file',
                        complexity: 3,
                        line_number: 1,
                        parameters: []
                    }
                ],
                total_functions: 1
            }
        };
        provider.updateAnalysisData(mockAnalysisData);
        // Create mock document
        const mockDocument = {
            languageId: 'python',
            uri: vscode.Uri.file('/test/file.py'),
            lineCount: 10,
            lineAt: (line) => {
                if (line === 0) {
                    return { text: 'def test_function():' };
                }
                return { text: '    pass' };
            }
        };
        const codeLenses = await provider.provideCodeLenses(mockDocument, new vscode.CancellationTokenSource().token);
        assert.ok(codeLenses);
        assert.strictEqual(codeLenses.length, 1);
        assert.ok(codeLenses[0].command);
        assert.strictEqual(codeLenses[0].command.command, 'doracodebird.showFunctionComplexityDetails');
        assert.ok(codeLenses[0].command.title.includes('Complexity: 3'));
        // Restore original functions
        vscode.workspace.getWorkspaceFolder = originalGetWorkspaceFolder;
        vscode.workspace.getConfiguration = originalGetConfiguration;
    });
    test('should handle multiple functions in same file', async () => {
        // Mock workspace folder
        const mockWorkspaceFolder = {
            uri: vscode.Uri.file('/test'),
            name: 'test',
            index: 0
        };
        const originalGetWorkspaceFolder = vscode.workspace.getWorkspaceFolder;
        vscode.workspace.getWorkspaceFolder = () => mockWorkspaceFolder;
        // Mock configuration
        const originalGetConfiguration = vscode.workspace.getConfiguration;
        vscode.workspace.getConfiguration = (section) => ({
            get: (key, defaultValue) => {
                if (key === 'showComplexityCodeLens') {
                    return true;
                }
                if (key === 'complexityThresholds') {
                    return { low: 5, medium: 10, high: 20 };
                }
                return defaultValue;
            }
        });
        // Create mock analysis data with multiple functions
        const mockAnalysisData = {
            functions: {
                nodes: [
                    {
                        id: 'function1',
                        name: 'function1',
                        module: 'file',
                        complexity: 2,
                        line_number: 1,
                        parameters: []
                    },
                    {
                        id: 'function2',
                        name: 'function2',
                        module: 'file',
                        complexity: 8,
                        line_number: 4,
                        parameters: []
                    }
                ],
                total_functions: 2
            }
        };
        provider.updateAnalysisData(mockAnalysisData);
        // Create mock document with multiple functions
        const mockDocument = {
            languageId: 'python',
            uri: vscode.Uri.file('/test/file.py'),
            lineCount: 10,
            lineAt: (line) => {
                switch (line) {
                    case 0: return { text: 'def function1():' };
                    case 1: return { text: '    pass' };
                    case 2: return { text: '' };
                    case 3: return { text: 'def function2():' };
                    default: return { text: '    pass' };
                }
            }
        };
        const codeLenses = await provider.provideCodeLenses(mockDocument, new vscode.CancellationTokenSource().token);
        assert.ok(codeLenses);
        assert.strictEqual(codeLenses.length, 2);
        // Check first function (low complexity)
        assert.ok(codeLenses[0].command);
        assert.ok(codeLenses[0].command.title.includes('🟢'));
        assert.ok(codeLenses[0].command.title.includes('Complexity: 2'));
        assert.ok(codeLenses[0].command.title.includes('(low)'));
        // Check second function (medium complexity)
        assert.ok(codeLenses[1].command);
        assert.ok(codeLenses[1].command.title.includes('🟡'));
        assert.ok(codeLenses[1].command.title.includes('Complexity: 8'));
        assert.ok(codeLenses[1].command.title.includes('(medium)'));
        // Restore original functions
        vscode.workspace.getWorkspaceFolder = originalGetWorkspaceFolder;
        vscode.workspace.getConfiguration = originalGetConfiguration;
    });
    test('should handle high complexity functions', async () => {
        // Mock workspace folder
        const mockWorkspaceFolder = {
            uri: vscode.Uri.file('/test'),
            name: 'test',
            index: 0
        };
        const originalGetWorkspaceFolder = vscode.workspace.getWorkspaceFolder;
        vscode.workspace.getWorkspaceFolder = () => mockWorkspaceFolder;
        // Mock configuration
        const originalGetConfiguration = vscode.workspace.getConfiguration;
        vscode.workspace.getConfiguration = (section) => ({
            get: (key, defaultValue) => {
                if (key === 'showComplexityCodeLens') {
                    return true;
                }
                if (key === 'complexityThresholds') {
                    return { low: 5, medium: 10, high: 20 };
                }
                return defaultValue;
            }
        });
        // Create mock analysis data with high complexity function
        const mockAnalysisData = {
            functions: {
                nodes: [
                    {
                        id: 'complex_function',
                        name: 'complex_function',
                        module: 'file',
                        complexity: 15,
                        line_number: 1,
                        parameters: [
                            {
                                name: 'param1',
                                type_hint: 'str',
                                default_value: undefined,
                                is_vararg: false,
                                is_kwarg: false
                            }
                        ]
                    }
                ],
                total_functions: 1
            }
        };
        provider.updateAnalysisData(mockAnalysisData);
        // Create mock document
        const mockDocument = {
            languageId: 'python',
            uri: vscode.Uri.file('/test/file.py'),
            lineCount: 10,
            lineAt: (line) => {
                if (line === 0) {
                    return { text: 'def complex_function(param1: str):' };
                }
                return { text: '    pass' };
            }
        };
        const codeLenses = await provider.provideCodeLenses(mockDocument, new vscode.CancellationTokenSource().token);
        assert.ok(codeLenses);
        assert.strictEqual(codeLenses.length, 1);
        assert.ok(codeLenses[0].command);
        assert.ok(codeLenses[0].command.title.includes('🔴'));
        assert.ok(codeLenses[0].command.title.includes('Complexity: 15'));
        assert.ok(codeLenses[0].command.title.includes('(high)'));
        // Restore original functions
        vscode.workspace.getWorkspaceFolder = originalGetWorkspaceFolder;
        vscode.workspace.getConfiguration = originalGetConfiguration;
    });
    test('should handle async functions', async () => {
        // Mock workspace folder
        const mockWorkspaceFolder = {
            uri: vscode.Uri.file('/test'),
            name: 'test',
            index: 0
        };
        const originalGetWorkspaceFolder = vscode.workspace.getWorkspaceFolder;
        vscode.workspace.getWorkspaceFolder = () => mockWorkspaceFolder;
        // Mock configuration
        const originalGetConfiguration = vscode.workspace.getConfiguration;
        vscode.workspace.getConfiguration = (section) => ({
            get: (key, defaultValue) => {
                if (key === 'showComplexityCodeLens') {
                    return true;
                }
                if (key === 'complexityThresholds') {
                    return { low: 5, medium: 10, high: 20 };
                }
                return defaultValue;
            }
        });
        // Create mock analysis data
        const mockAnalysisData = {
            functions: {
                nodes: [
                    {
                        id: 'async_function',
                        name: 'async_function',
                        module: 'file',
                        complexity: 4,
                        line_number: 1,
                        parameters: []
                    }
                ],
                total_functions: 1
            }
        };
        provider.updateAnalysisData(mockAnalysisData);
        // Create mock document with async function
        const mockDocument = {
            languageId: 'python',
            uri: vscode.Uri.file('/test/file.py'),
            lineCount: 10,
            lineAt: (line) => {
                if (line === 0) {
                    return { text: 'async def async_function():' };
                }
                return { text: '    pass' };
            }
        };
        const codeLenses = await provider.provideCodeLenses(mockDocument, new vscode.CancellationTokenSource().token);
        assert.ok(codeLenses);
        assert.strictEqual(codeLenses.length, 1);
        assert.ok(codeLenses[0].command);
        assert.ok(codeLenses[0].command.title.includes('Complexity: 4'));
        // Restore original functions
        vscode.workspace.getWorkspaceFolder = originalGetWorkspaceFolder;
        vscode.workspace.getConfiguration = originalGetConfiguration;
    });
    test('should update analysis data and fire change event', () => {
        let eventFired = false;
        const disposable = provider.onDidChangeCodeLenses(() => {
            eventFired = true;
        });
        const mockAnalysisData = {
            functions: {
                nodes: [],
                total_functions: 0
            }
        };
        provider.updateAnalysisData(mockAnalysisData);
        assert.strictEqual(eventFired, true);
        disposable.dispose();
    });
    test('should handle null analysis data', () => {
        let eventFired = false;
        const disposable = provider.onDidChangeCodeLenses(() => {
            eventFired = true;
        });
        provider.updateAnalysisData(null);
        assert.strictEqual(eventFired, true);
        disposable.dispose();
    });
});
//# sourceMappingURL=codelens.test.js.map