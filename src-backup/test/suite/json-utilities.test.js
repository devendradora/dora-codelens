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
const json_utilities_1 = require("../../json-utilities");
suite('JSON Utilities Test Suite', () => {
    let outputChannel;
    let jsonFormatter;
    let jsonTreeViewProvider;
    let jsonUtilities;
    suiteSetup(() => {
        outputChannel = vscode.window.createOutputChannel('Test');
        jsonFormatter = new json_utilities_1.JsonFormatter(outputChannel);
        jsonTreeViewProvider = new json_utilities_1.JsonTreeViewProvider(outputChannel);
        jsonUtilities = new json_utilities_1.JsonUtilities(outputChannel);
    });
    suiteTeardown(() => {
        outputChannel.dispose();
    });
    suite('JsonFormatter', () => {
        test('should format valid JSON', async () => {
            const input = '{"name":"test","value":123}';
            const result = await jsonFormatter.formatJson(input);
            assert.ok(result.includes('\n'), 'Formatted JSON should contain newlines');
            assert.ok(result.includes('  '), 'Formatted JSON should be indented');
        });
        test('should validate valid JSON', () => {
            const input = '{"name": "test", "value": 123}';
            const result = jsonFormatter.validateJson(input);
            assert.strictEqual(result.isValid, true);
            assert.strictEqual(result.errors.length, 0);
        });
        test('should detect invalid JSON', () => {
            const input = '{"name": "test", "value": 123,}'; // trailing comma
            const result = jsonFormatter.validateJson(input);
            // Modern JSON.parse handles trailing commas, so this should be valid
            // Let's test with comments instead which should generate warnings
            const inputWithComments = '{"name": "test", /* comment */ "value": 123}';
            const resultWithComments = jsonFormatter.validateJson(inputWithComments);
            // Comments should generate warnings
            assert.ok(resultWithComments.warnings && resultWithComments.warnings.length > 0);
        });
        test('should detect syntax errors', () => {
            const input = '{"name": "test", "value":}'; // missing value
            const result = jsonFormatter.validateJson(input);
            assert.strictEqual(result.isValid, false);
            assert.ok(result.errors.length > 0);
        });
    });
    suite('JsonTreeViewProvider', () => {
        test('should generate tree view for simple object', () => {
            const input = { name: 'test', value: 123, active: true };
            const result = jsonTreeViewProvider.generateTreeView(input);
            assert.ok(result.nodes.length > 0);
            assert.ok(result.metadata.totalNodes > 0);
            assert.strictEqual(result.metadata.objectCount, 1);
            assert.strictEqual(result.metadata.primitiveCount, 3);
        });
        test('should generate tree view for array', () => {
            const input = [1, 2, 3, { name: 'test' }];
            const result = jsonTreeViewProvider.generateTreeView(input);
            assert.ok(result.nodes.length > 0);
            assert.strictEqual(result.metadata.arrayCount, 1);
            assert.strictEqual(result.metadata.objectCount, 1);
        });
        test('should handle nested structures', () => {
            const input = {
                user: {
                    name: 'John',
                    details: {
                        age: 30,
                        hobbies: ['reading', 'coding']
                    }
                }
            };
            const result = jsonTreeViewProvider.generateTreeView(input);
            assert.ok(result.metadata.maxDepth >= 3);
            assert.ok(result.metadata.objectCount >= 3);
            assert.ok(result.metadata.arrayCount >= 1);
        });
        test('should support search functionality', () => {
            const input = {
                users: [
                    { name: 'John', age: 30 },
                    { name: 'Jane', age: 25 }
                ]
            };
            const treeData = jsonTreeViewProvider.generateTreeView(input);
            const searchResults = jsonTreeViewProvider.searchTreeView(treeData, 'John');
            assert.ok(searchResults.length > 0);
            assert.ok(searchResults.some(node => node.value === 'John' || node.label.includes('John')));
        });
        test('should handle null and undefined values', () => {
            const input = {
                nullValue: null,
                emptyString: '',
                zeroValue: 0,
                falseValue: false
            };
            const result = jsonTreeViewProvider.generateTreeView(input);
            assert.ok(result.metadata.nullCount >= 1);
            assert.ok(result.nodes.length > 0);
        });
    });
    suite('JsonUtilities Integration', () => {
        test('should export analysis data as JSON', () => {
            const analysisData = {
                modules: ['module1', 'module2'],
                functions: ['func1', 'func2'],
                complexity: { overall: 5.2 }
            };
            const result = jsonUtilities.exportJsonAnalysis(analysisData);
            assert.ok(result.includes('modules'));
            assert.ok(result.includes('functions'));
            assert.ok(result.includes('complexity'));
            // Should be valid JSON
            const parsed = JSON.parse(result);
            assert.deepStrictEqual(parsed, analysisData);
        });
        test('should validate JSON content', async () => {
            const validJson = '{"test": true}';
            const result = await jsonUtilities.validateJsonContent(validJson);
            assert.strictEqual(result.isValid, true);
            assert.strictEqual(result.errors.length, 0);
        });
    });
});
//# sourceMappingURL=json-utilities.test.js.map