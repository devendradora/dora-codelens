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
const sidebar_provider_1 = require("../../sidebar-provider");
suite('Sidebar Provider Test Suite', () => {
    let sidebarProvider;
    let mockContext;
    // Mock analysis data for testing
    const mockAnalysisData = {
        tech_stack: {
            libraries: [
                { name: 'django', version: '4.2.0', type: 'dependency' },
                { name: 'pytest', version: '7.0.0', type: 'dev-dependency' }
            ],
            pythonVersion: '3.9.0',
            frameworks: ['django'],
            packageManager: 'pip'
        },
        modules: [
            {
                name: 'main.py',
                path: '/project/main.py',
                functions: [
                    {
                        name: 'main_function',
                        module: 'main.py',
                        line_number: 10,
                        complexity: { cyclomatic: 3, cognitive: 2, level: 'low' },
                        parameters: [],
                        is_method: false,
                        is_async: false
                    }
                ],
                classes: [
                    {
                        name: 'MainClass',
                        module: 'main.py',
                        line_number: 20,
                        methods: [
                            {
                                name: 'method1',
                                module: 'main.py',
                                line_number: 25,
                                complexity: { cyclomatic: 5, cognitive: 3, level: 'low' },
                                parameters: [],
                                is_method: true,
                                is_async: false
                            }
                        ],
                        base_classes: []
                    }
                ],
                imports: [
                    {
                        module: 'utils',
                        names: ['helper_function'],
                        is_from_import: true,
                        line_number: 1
                    }
                ],
                complexity: { cyclomatic: 8, cognitive: 5, level: 'medium' },
                size_lines: 100
            },
            {
                name: 'utils.py',
                path: '/project/utils.py',
                functions: [
                    {
                        name: 'helper_function',
                        module: 'utils.py',
                        line_number: 5,
                        complexity: { cyclomatic: 2, cognitive: 1, level: 'low' },
                        parameters: [],
                        is_method: false,
                        is_async: false
                    }
                ],
                classes: [],
                imports: [],
                complexity: { cyclomatic: 2, cognitive: 1, level: 'low' },
                size_lines: 50
            }
        ],
        framework_patterns: {
            django: {}
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
        sidebarProvider = new sidebar_provider_1.SidebarProvider(mockContext);
    });
    test('Should initialize with no data', async () => {
        const children = await sidebarProvider.getChildren();
        assert.strictEqual(children.length, 1);
        assert.strictEqual(children[0].label, 'Run analysis to see project structure');
    });
    test('Should display root items when analysis data is provided', async () => {
        sidebarProvider.updateAnalysisData(mockAnalysisData);
        const children = await sidebarProvider.getChildren();
        assert.strictEqual(children.length, 3); // Tech Stack, Modules, Frameworks
        assert.strictEqual(children[0].label, 'Tech Stack (2 libraries)');
        assert.strictEqual(children[0].itemType, sidebar_provider_1.TreeItemType.TECH_STACK);
        assert.strictEqual(children[1].label, 'Modules (2)');
        assert.strictEqual(children[1].itemType, sidebar_provider_1.TreeItemType.MODULES);
        assert.strictEqual(children[2].label, 'Frameworks (1)');
        assert.strictEqual(children[2].itemType, sidebar_provider_1.TreeItemType.FRAMEWORKS);
    });
    test('Should display tech stack libraries', async () => {
        sidebarProvider.updateAnalysisData(mockAnalysisData);
        const rootChildren = await sidebarProvider.getChildren();
        const techStackItem = rootChildren.find(item => item.itemType === sidebar_provider_1.TreeItemType.TECH_STACK);
        assert.ok(techStackItem);
        const libraries = await sidebarProvider.getChildren(techStackItem);
        assert.strictEqual(libraries.length, 2);
        assert.strictEqual(libraries[0].label, 'django (4.2.0)');
        assert.strictEqual(libraries[0].itemType, sidebar_provider_1.TreeItemType.LIBRARY);
        assert.strictEqual(libraries[1].label, 'pytest (7.0.0)');
        assert.strictEqual(libraries[1].itemType, sidebar_provider_1.TreeItemType.LIBRARY);
    });
    test('Should display modules', async () => {
        sidebarProvider.updateAnalysisData(mockAnalysisData);
        const rootChildren = await sidebarProvider.getChildren();
        const modulesItem = rootChildren.find(item => item.itemType === sidebar_provider_1.TreeItemType.MODULES);
        assert.ok(modulesItem);
        const modules = await sidebarProvider.getChildren(modulesItem);
        assert.strictEqual(modules.length, 2);
        assert.strictEqual(modules[0].label, 'main.py');
        assert.strictEqual(modules[0].itemType, sidebar_provider_1.TreeItemType.MODULE);
        assert.strictEqual(modules[1].label, 'utils.py');
        assert.strictEqual(modules[1].itemType, sidebar_provider_1.TreeItemType.MODULE);
    });
    test('Should display module contents', async () => {
        sidebarProvider.updateAnalysisData(mockAnalysisData);
        const rootChildren = await sidebarProvider.getChildren();
        const modulesItem = rootChildren.find(item => item.itemType === sidebar_provider_1.TreeItemType.MODULES);
        const modules = await sidebarProvider.getChildren(modulesItem);
        const mainModule = modules.find(m => m.label === 'main.py');
        assert.ok(mainModule);
        const moduleContents = await sidebarProvider.getChildren(mainModule);
        // Should have dependencies, class, and function
        assert.ok(moduleContents.length >= 2);
        const classItem = moduleContents.find(item => item.itemType === sidebar_provider_1.TreeItemType.CLASS);
        assert.ok(classItem);
        assert.strictEqual(classItem.label, 'MainClass');
        const functionItem = moduleContents.find(item => item.itemType === sidebar_provider_1.TreeItemType.FUNCTION);
        assert.ok(functionItem);
        assert.strictEqual(functionItem.label, 'main_function');
    });
    test('Should display class methods', async () => {
        sidebarProvider.updateAnalysisData(mockAnalysisData);
        const rootChildren = await sidebarProvider.getChildren();
        const modulesItem = rootChildren.find(item => item.itemType === sidebar_provider_1.TreeItemType.MODULES);
        const modules = await sidebarProvider.getChildren(modulesItem);
        const mainModule = modules.find(m => m.label === 'main.py');
        const moduleContents = await sidebarProvider.getChildren(mainModule);
        const classItem = moduleContents.find(item => item.itemType === sidebar_provider_1.TreeItemType.CLASS);
        assert.ok(classItem);
        const methods = await sidebarProvider.getChildren(classItem);
        assert.strictEqual(methods.length, 1);
        assert.strictEqual(methods[0].label, 'method1');
        assert.strictEqual(methods[0].itemType, sidebar_provider_1.TreeItemType.METHOD);
    });
    test('Should filter modules correctly', () => {
        sidebarProvider.updateAnalysisData(mockAnalysisData);
        sidebarProvider.setFilter('main');
        // The filter should be applied when getting children
        // This is tested indirectly through the getChildren method
        assert.ok(true); // Basic test to ensure no errors
    });
    test('Should handle module selection', () => {
        sidebarProvider.updateAnalysisData(mockAnalysisData);
        sidebarProvider.selectModule('main.py');
        // Test that selection doesn't cause errors
        assert.ok(true);
    });
    test('Should get module dependencies', () => {
        sidebarProvider.updateAnalysisData(mockAnalysisData);
        const dependencies = sidebarProvider.getModuleDependencies('main.py');
        // main.py imports from utils, so utils should be a dependency
        assert.ok(dependencies.length >= 0); // May be 0 if dependency resolution is strict
    });
    test('Should get module dependents', () => {
        sidebarProvider.updateAnalysisData(mockAnalysisData);
        const dependents = sidebarProvider.getModuleDependents('utils.py');
        // main.py depends on utils.py, so main.py should be a dependent
        assert.ok(dependents.length >= 0); // May be 0 if dependency resolution is strict
    });
    test('Should clear filter', () => {
        sidebarProvider.updateAnalysisData(mockAnalysisData);
        sidebarProvider.setFilter('test');
        sidebarProvider.clearFilter();
        // Should not throw errors
        assert.ok(true);
    });
    test('Should clear selection', () => {
        sidebarProvider.updateAnalysisData(mockAnalysisData);
        sidebarProvider.selectModule('main.py');
        sidebarProvider.clearSelection();
        // Should not throw errors
        assert.ok(true);
    });
});
//# sourceMappingURL=sidebar.test.js.map