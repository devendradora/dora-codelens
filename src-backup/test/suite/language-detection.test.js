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
const language_detection_1 = require("../../language-detection");
suite('LanguageDetection Test Suite', () => {
    let languageDetection;
    let outputChannel;
    setup(() => {
        outputChannel = vscode.window.createOutputChannel('Test');
        languageDetection = new language_detection_1.LanguageDetection(outputChannel);
    });
    teardown(() => {
        outputChannel.dispose();
    });
    test('should create LanguageDetection instance', () => {
        assert.ok(languageDetection);
    });
    test('should return false for isCurrentFilePython when no editor is active', () => {
        const result = languageDetection.isCurrentFilePython();
        assert.strictEqual(result, false);
    });
    test('should return unknown for getCurrentFileType when no editor is active', () => {
        const result = languageDetection.getCurrentFileType();
        assert.strictEqual(result, 'unknown');
    });
    test('should return appropriate message for Python-specific features', () => {
        const fullCodeMessage = languageDetection.getPythonRequiredMessage('full code analysis');
        assert.ok(fullCodeMessage.includes('Currently supports only Python projects'));
        const currentFileMessage = languageDetection.getPythonRequiredMessage('current file analysis');
        assert.ok(currentFileMessage.includes('Currently supports only Python files'));
        const callHierarchyMessage = languageDetection.getPythonRequiredMessage('call hierarchy');
        assert.ok(callHierarchyMessage.includes('Call hierarchy is only available for Python files'));
        const dbSchemaMessage = languageDetection.getPythonRequiredMessage('database schema');
        assert.ok(dbSchemaMessage.includes('Database schema analysis requires Python models'));
    });
    test('should handle feature availability checks', async () => {
        // Test Git Analytics (should always be available)
        const gitAnalyticsResult = await languageDetection.isFeatureAvailable('git analytics');
        assert.strictEqual(gitAnalyticsResult.available, true);
        assert.strictEqual(gitAnalyticsResult.reason, undefined);
        // Test JSON Format (should always be available)
        const jsonFormatResult = await languageDetection.isFeatureAvailable('json format');
        assert.strictEqual(jsonFormatResult.available, true);
        assert.strictEqual(jsonFormatResult.reason, undefined);
        // Test JSON Tree View (should always be available)
        const jsonTreeResult = await languageDetection.isFeatureAvailable('json tree view');
        assert.strictEqual(jsonTreeResult.available, true);
        assert.strictEqual(jsonTreeResult.reason, undefined);
        // Test Current File Analysis (should be false when no Python file is active)
        const currentFileResult = await languageDetection.isFeatureAvailable('current file analysis');
        assert.strictEqual(currentFileResult.available, false);
        assert.ok(currentFileResult.reason);
        assert.ok(currentFileResult.reason.includes('Currently supports only Python files'));
        // Test Call Hierarchy (should be false when no Python file is active)
        const callHierarchyResult = await languageDetection.isFeatureAvailable('call hierarchy');
        assert.strictEqual(callHierarchyResult.available, false);
        assert.ok(callHierarchyResult.reason);
        assert.ok(callHierarchyResult.reason.includes('Call hierarchy is only available for Python files'));
    });
    test('should handle unknown features', async () => {
        const unknownResult = await languageDetection.isFeatureAvailable('unknown feature');
        assert.strictEqual(unknownResult.available, false);
        assert.strictEqual(unknownResult.reason, 'Unknown feature');
    });
    test('should log current context without errors', () => {
        // This should not throw any errors
        assert.doesNotThrow(() => {
            languageDetection.logCurrentContext();
        });
    });
});
//# sourceMappingURL=language-detection.test.js.map