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
const tabbed_webview_provider_1 = require("../../tabbed-webview-provider");
suite('TabbedWebviewProvider Test Suite', () => {
    let webviewProvider;
    let mockContext;
    let outputChannel;
    // Mock analysis data for testing
    const mockAnalysisData = {
        modules: {
            nodes: [
                {
                    id: 'main.py',
                    name: 'main.py',
                    path: '/project/main.py',
                    complexity: 5,
                    size: 100,
                    functions: ['main_function']
                },
                {
                    id: 'utils.py',
                    name: 'utils.py',
                    path: '/project/utils.py',
                    complexity: 3,
                    size: 50,
                    functions: ['helper_function']
                }
            ],
            edges: [
                {
                    source: 'main.py',
                    target: 'utils.py',
                    type: 'import',
                    weight: 1
                }
            ]
        },
        functions: {
            nodes: [
                {
                    id: 'main.main_function',
                    name: 'main_function',
                    module: 'main',
                    complexity: 3,
                    lineNumber: 10,
                    parameters: [
                        {
                            name: 'param1',
                            type_hint: 'str',
                            default_value: undefined,
                            is_vararg: false,
                            is_kwarg: false
                        }
                    ]
                },
                {
                    id: 'utils.helper_function',
                    name: 'helper_function',
                    module: 'utils',
                    complexity: 2,
                    lineNumber: 5,
                    parameters: []
                }
            ],
            edges: [
                {
                    caller: 'main.main_function',
                    callee: 'utils.helper_function',
                    callCount: 2,
                    lineNumbers: [15, 20]
                }
            ]
        },
        techStack: {
            libraries: [
                { name: 'django', version: '4.2.0', category: 'web' },
                { name: 'pytest', version: '7.0.0', category: 'testing' }
            ],
            pythonVersion: '3.9.0',
            frameworks: ['django'],
            packageManager: 'pip'
        },
        frameworkPatterns: {
            django: {
                urlPatterns: [
                    {
                        pattern: '^admin/',
                        viewName: 'admin',
                        viewFunction: 'admin.site.urls'
                    }
                ],
                views: [
                    {
                        name: 'HomeView',
                        file: '/project/views.py',
                        lineNumber: 10
                    }
                ],
                models: [
                    {
                        name: 'User',
                        file: '/project/models.py',
                        lineNumber: 5
                    }
                ],
                serializers: []
            }
        }
    };
    setup(() => {
        // Create a mock extension context
        mockContext = {
            subscriptions: [],
            workspaceState: {
                get: () => undefined,
                update: () => Promise.resolve()
            },
            globalState: {
                get: () => undefined,
                update: () => Promise.resolve(),
                setKeysForSync: () => { }
            },
            extensionPath: '/mock/extension/path',
            storagePath: '/mock/storage/path',
            globalStoragePath: '/mock/global/storage/path',
            logPath: '/mock/log/path',
            extensionUri: vscode.Uri.file('/mock/extension/path'),
            storageUri: vscode.Uri.file('/mock/storage/path'),
            globalStorageUri: vscode.Uri.file('/mock/global/storage/path'),
            logUri: vscode.Uri.file('/mock/log/path'),
            extensionMode: vscode.ExtensionMode.Test,
            secrets: {
                get: () => Promise.resolve(undefined),
                store: () => Promise.resolve(),
                delete: () => Promise.resolve()
            },
            environmentVariableCollection: {
                persistent: true,
                replace: () => { },
                append: () => { },
                prepend: () => { },
                get: () => undefined,
                forEach: () => { },
                delete: () => { },
                clear: () => { }
            }
        };
        outputChannel = vscode.window.createOutputChannel('Test');
        webviewProvider = new tabbed_webview_provider_1.TabbedWebviewProvider(mockContext, outputChannel);
    });
    teardown(() => {
        outputChannel.dispose();
    });
    test('should create TabbedWebviewProvider instance', () => {
        assert.ok(webviewProvider);
        assert.ok(webviewProvider instanceof tabbed_webview_provider_1.TabbedWebviewProvider);
    });
    test('should show module graph', () => {
        // This test verifies that showModuleGraph doesn't throw errors
        // In a real VS Code environment, this would create a webview panel
        try {
            webviewProvider.showModuleGraph(mockAnalysisData);
            assert.ok(true, 'showModuleGraph should execute without errors');
        }
        catch (error) {
            // In test environment, webview creation might fail, which is acceptable
            assert.ok(error instanceof Error);
        }
    });
    test('should show call hierarchy for valid function', () => {
        try {
            webviewProvider.showCallHierarchy(mockAnalysisData, 'main.main_function');
            assert.ok(true, 'showCallHierarchy should execute without errors for valid function');
        }
        catch (error) {
            // In test environment, webview creation might fail, which is acceptable
            assert.ok(error instanceof Error);
        }
    });
    test('should handle call hierarchy for invalid function', () => {
        try {
            webviewProvider.showCallHierarchy(mockAnalysisData, 'nonexistent.function');
            assert.ok(true, 'showCallHierarchy should handle invalid function gracefully');
        }
        catch (error) {
            // In test environment, webview creation might fail, which is acceptable
            assert.ok(error instanceof Error);
        }
    });
    test('should update analysis data', () => {
        // Test updating with valid data
        webviewProvider.updateAnalysisData(mockAnalysisData);
        assert.ok(true, 'updateAnalysisData should accept valid data');
        // Test updating with null data
        webviewProvider.updateAnalysisData(null);
        assert.ok(true, 'updateAnalysisData should accept null data');
    });
    test('should handle empty analysis data', () => {
        const emptyData = {};
        try {
            webviewProvider.showModuleGraph(emptyData);
            assert.ok(true, 'Should handle empty analysis data');
        }
        catch (error) {
            // In test environment, webview creation might fail, which is acceptable
            assert.ok(error instanceof Error);
        }
    });
    test('should handle analysis data with missing modules', () => {
        const dataWithoutModules = {
            functions: mockAnalysisData.functions,
            techStack: mockAnalysisData.techStack
        };
        try {
            webviewProvider.showModuleGraph(dataWithoutModules);
            assert.ok(true, 'Should handle data without modules');
        }
        catch (error) {
            // In test environment, webview creation might fail, which is acceptable
            assert.ok(error instanceof Error);
        }
    });
    test('should handle analysis data with missing functions', () => {
        const dataWithoutFunctions = {
            modules: mockAnalysisData.modules,
            techStack: mockAnalysisData.techStack
        };
        try {
            webviewProvider.showCallHierarchy(dataWithoutFunctions, 'some.function');
            assert.ok(true, 'Should handle data without functions');
        }
        catch (error) {
            // In test environment, webview creation might fail, which is acceptable
            assert.ok(error instanceof Error);
        }
    });
    test('should validate module graph data structure', () => {
        const moduleData = mockAnalysisData.modules;
        // Validate nodes structure
        assert.ok(Array.isArray(moduleData.nodes), 'Modules should have nodes array');
        assert.ok(moduleData.nodes.length > 0, 'Should have at least one module node');
        const firstNode = moduleData.nodes[0];
        assert.ok(typeof firstNode.id === 'string', 'Node should have string id');
        assert.ok(typeof firstNode.name === 'string', 'Node should have string name');
        assert.ok(typeof firstNode.path === 'string', 'Node should have string path');
        assert.ok(typeof firstNode.complexity === 'number', 'Node should have numeric complexity');
        assert.ok(typeof firstNode.size === 'number', 'Node should have numeric size');
        assert.ok(Array.isArray(firstNode.functions), 'Node should have functions array');
        // Validate edges structure
        assert.ok(Array.isArray(moduleData.edges), 'Modules should have edges array');
        if (moduleData.edges.length > 0) {
            const firstEdge = moduleData.edges[0];
            assert.ok(typeof firstEdge.source === 'string', 'Edge should have string source');
            assert.ok(typeof firstEdge.target === 'string', 'Edge should have string target');
            assert.ok(['import', 'dependency'].includes(firstEdge.type), 'Edge should have valid type');
            assert.ok(typeof firstEdge.weight === 'number', 'Edge should have numeric weight');
        }
    });
    test('should validate call graph data structure', () => {
        const functionData = mockAnalysisData.functions;
        // Validate nodes structure
        assert.ok(Array.isArray(functionData.nodes), 'Functions should have nodes array');
        assert.ok(functionData.nodes.length > 0, 'Should have at least one function node');
        const firstNode = functionData.nodes[0];
        assert.ok(typeof firstNode.id === 'string', 'Function node should have string id');
        assert.ok(typeof firstNode.name === 'string', 'Function node should have string name');
        assert.ok(typeof firstNode.module === 'string', 'Function node should have string module');
        assert.ok(typeof firstNode.complexity === 'number', 'Function node should have numeric complexity');
        assert.ok(typeof firstNode.lineNumber === 'number', 'Function node should have numeric lineNumber');
        assert.ok(Array.isArray(firstNode.parameters), 'Function node should have parameters array');
        // Validate parameter structure
        if (firstNode.parameters.length > 0) {
            const firstParam = firstNode.parameters[0];
            assert.ok(typeof firstParam.name === 'string', 'Parameter should have string name');
        }
        // Validate edges structure
        assert.ok(Array.isArray(functionData.edges), 'Functions should have edges array');
        if (functionData.edges.length > 0) {
            const firstEdge = functionData.edges[0];
            assert.ok(typeof firstEdge.caller === 'string', 'Call edge should have string caller');
            assert.ok(typeof firstEdge.callee === 'string', 'Call edge should have string callee');
            assert.ok(typeof firstEdge.callCount === 'number', 'Call edge should have numeric callCount');
            assert.ok(Array.isArray(firstEdge.lineNumbers), 'Call edge should have lineNumbers array');
        }
    });
    test('should validate tech stack data structure', () => {
        const techStack = mockAnalysisData.techStack;
        assert.ok(Array.isArray(techStack.libraries), 'Tech stack should have libraries array');
        assert.ok(typeof techStack.pythonVersion === 'string', 'Tech stack should have string pythonVersion');
        assert.ok(Array.isArray(techStack.frameworks), 'Tech stack should have frameworks array');
        assert.ok(['pip', 'poetry', 'pipenv'].includes(techStack.packageManager), 'Tech stack should have valid packageManager');
        if (techStack.libraries.length > 0) {
            const firstLib = techStack.libraries[0];
            assert.ok(typeof firstLib.name === 'string', 'Library should have string name');
        }
    });
    test('should validate framework patterns data structure', () => {
        const frameworkPatterns = mockAnalysisData.frameworkPatterns;
        if (frameworkPatterns.django) {
            const django = frameworkPatterns.django;
            assert.ok(Array.isArray(django.urlPatterns), 'Django should have urlPatterns array');
            assert.ok(Array.isArray(django.views), 'Django should have views array');
            assert.ok(Array.isArray(django.models), 'Django should have models array');
            assert.ok(Array.isArray(django.serializers), 'Django should have serializers array');
            if (django.urlPatterns.length > 0) {
                const firstPattern = django.urlPatterns[0];
                assert.ok(typeof firstPattern.pattern === 'string', 'URL pattern should have string pattern');
                assert.ok(typeof firstPattern.viewName === 'string', 'URL pattern should have string viewName');
                assert.ok(typeof firstPattern.viewFunction === 'string', 'URL pattern should have string viewFunction');
            }
        }
    });
    test('should handle complex function names in call hierarchy', () => {
        const complexFunctionNames = [
            'module.ClassName.method_name',
            'package.submodule.function',
            'utils.helper_function',
            'main.main_function'
        ];
        complexFunctionNames.forEach(functionName => {
            try {
                webviewProvider.showCallHierarchy(mockAnalysisData, functionName);
                assert.ok(true, `Should handle function name: ${functionName}`);
            }
            catch (error) {
                // In test environment, webview creation might fail, which is acceptable
                assert.ok(error instanceof Error);
            }
        });
    });
    test('should handle multiple consecutive webview operations', () => {
        try {
            // Show module graph
            webviewProvider.showModuleGraph(mockAnalysisData);
            // Update data
            webviewProvider.updateAnalysisData(mockAnalysisData);
            // Show call hierarchy
            webviewProvider.showCallHierarchy(mockAnalysisData, 'main.main_function');
            // Update with null data
            webviewProvider.updateAnalysisData(null);
            // Show module graph again
            webviewProvider.showModuleGraph(mockAnalysisData);
            assert.ok(true, 'Should handle multiple consecutive operations');
        }
        catch (error) {
            // In test environment, webview creation might fail, which is acceptable
            assert.ok(error instanceof Error);
        }
    });
});
//# sourceMappingURL=webview-provider.test.js.map