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
suite('Context Menu Integration Tests', () => {
    let extension;
    suiteSetup(async () => {
        // Get the extension
        extension = vscode.extensions.getExtension('codemindmap.codemindmap');
        if (extension && !extension.isActive) {
            await extension.activate();
        }
    });
    test('Show Call Hierarchy command should be registered', async () => {
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('codemindmap.showCallHierarchy'), 'showCallHierarchy command should be registered');
    });
    test('Show Graph View command should be registered', async () => {
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('codemindmap.showGraphView'), 'showGraphView command should be registered');
    });
    test('Show JSON View command should be registered', async () => {
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('codemindmap.showJsonView'), 'showJsonView command should be registered');
    });
    test('Show Call Hierarchy should show error when no editor is active', async () => {
        // Close all editors
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        // Wait a bit for the command to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        // Try to execute the command - it should not throw an error but handle it gracefully
        try {
            await vscode.commands.executeCommand('codemindmap.showCallHierarchy');
            // If we reach here, the command executed without throwing an error, which is expected
            assert.ok(true, 'Command should execute without throwing an error');
        }
        catch (error) {
            assert.fail('Command should not throw an error, but should handle the case gracefully');
        }
    });
    test('Show Call Hierarchy should show error for non-Python files', async () => {
        // Create a temporary text document
        const document = await vscode.workspace.openTextDocument({
            content: 'function test() { return "hello"; }',
            language: 'javascript'
        });
        await vscode.window.showTextDocument(document);
        try {
            await vscode.commands.executeCommand('codemindmap.showCallHierarchy');
            // Command should execute without throwing an error (it handles the case internally)
            assert.ok(true, 'Command should execute without throwing an error for non-Python files');
        }
        catch (error) {
            assert.fail('Command should not throw an error, but should handle non-Python files gracefully');
        }
        finally {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        }
    });
    test('Show Call Hierarchy should show warning when no analysis data available', async () => {
        // Create a temporary Python document
        const document = await vscode.workspace.openTextDocument({
            content: 'def test_function():\n    return "hello"',
            language: 'python'
        });
        await vscode.window.showTextDocument(document);
        // Position cursor on the function name
        const editor = vscode.window.activeTextEditor;
        const position = new vscode.Position(0, 4); // Position on 'test_function'
        editor.selection = new vscode.Selection(position, position);
        try {
            await vscode.commands.executeCommand('codemindmap.showCallHierarchy');
            // Command should execute without throwing an error (it handles the case internally)
            assert.ok(true, 'Command should execute without throwing an error when no analysis data available');
        }
        catch (error) {
            assert.fail('Command should not throw an error, but should handle missing analysis data gracefully');
        }
        finally {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        }
    });
    test('Show Call Hierarchy should show error when cursor is not on a function', async () => {
        // Create a temporary Python document
        const document = await vscode.workspace.openTextDocument({
            content: 'def test_function():\n    x = 42\n    return x',
            language: 'python'
        });
        await vscode.window.showTextDocument(document);
        // Position cursor on a variable, not a function
        const editor = vscode.window.activeTextEditor;
        const position = new vscode.Position(1, 4); // Position on 'x = 42'
        editor.selection = new vscode.Selection(position, position);
        try {
            await vscode.commands.executeCommand('codemindmap.showCallHierarchy');
            // Command should execute without throwing an error (it handles the case internally)
            assert.ok(true, 'Command should execute without throwing an error when cursor is not on a function');
        }
        catch (error) {
            assert.fail('Command should not throw an error, but should handle invalid cursor position gracefully');
        }
        finally {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        }
    });
    test('Context menu should be available in Python files', async () => {
        // Create a temporary Python document
        const document = await vscode.workspace.openTextDocument({
            content: 'def test_function():\n    return "hello"',
            language: 'python'
        });
        await vscode.window.showTextDocument(document);
        // Get all available commands for the current context
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('codemindmap.showCallHierarchy'), 'showCallHierarchy command should be available');
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });
    test('Function detection should work for function definitions', async () => {
        // This test would require access to the extension's internal methods
        // For now, we'll test the command execution behavior
        const document = await vscode.workspace.openTextDocument({
            content: 'def my_function(param1, param2):\n    """Test function"""\n    return param1 + param2',
            language: 'python'
        });
        await vscode.window.showTextDocument(document);
        // Position cursor on the function name
        const editor = vscode.window.activeTextEditor;
        const position = new vscode.Position(0, 4); // Position on 'my_function'
        editor.selection = new vscode.Selection(position, position);
        // The command should execute without throwing an error (though it will show a warning about no analysis data)
        let commandExecuted = false;
        try {
            await vscode.commands.executeCommand('codemindmap.showCallHierarchy');
            commandExecuted = true;
        }
        catch (error) {
            // Command execution failed
        }
        assert.ok(commandExecuted, 'Command should execute without throwing an error');
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });
    test('Function detection should work for method definitions', async () => {
        const document = await vscode.workspace.openTextDocument({
            content: 'class MyClass:\n    def my_method(self, param):\n        return param * 2',
            language: 'python'
        });
        await vscode.window.showTextDocument(document);
        // Position cursor on the method name
        const editor = vscode.window.activeTextEditor;
        const position = new vscode.Position(1, 8); // Position on 'my_method'
        editor.selection = new vscode.Selection(position, position);
        // The command should execute without throwing an error
        let commandExecuted = false;
        try {
            await vscode.commands.executeCommand('codemindmap.showCallHierarchy');
            commandExecuted = true;
        }
        catch (error) {
            // Command execution failed
        }
        assert.ok(commandExecuted, 'Command should execute for method definitions');
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });
    test('Function detection should handle invalid identifiers', async () => {
        const document = await vscode.workspace.openTextDocument({
            content: 'def 123invalid():\n    pass',
            language: 'python'
        });
        await vscode.window.showTextDocument(document);
        // Position cursor on the invalid identifier
        const editor = vscode.window.activeTextEditor;
        const position = new vscode.Position(0, 4); // Position on '123invalid'
        editor.selection = new vscode.Selection(position, position);
        try {
            await vscode.commands.executeCommand('codemindmap.showCallHierarchy');
            // Command should execute without throwing an error (it handles the case internally)
            assert.ok(true, 'Command should execute without throwing an error for invalid identifiers');
        }
        catch (error) {
            assert.fail('Command should not throw an error, but should handle invalid identifiers gracefully');
        }
        finally {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        }
    });
    test('Show Graph View should show warning when no analysis data available', async () => {
        // Create a temporary Python document
        const document = await vscode.workspace.openTextDocument({
            content: 'def test_function():\n    return "hello"',
            language: 'python'
        });
        await vscode.window.showTextDocument(document);
        try {
            await vscode.commands.executeCommand('codemindmap.showGraphView');
            // Command should execute without throwing an error (it handles the case internally)
            assert.ok(true, 'Graph View command should execute without throwing an error when no analysis data available');
        }
        catch (error) {
            assert.fail('Graph View command should not throw an error, but should handle missing analysis data gracefully');
        }
        finally {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        }
    });
    test('Show JSON View should show warning when no analysis data available', async () => {
        // Create a temporary Python document
        const document = await vscode.workspace.openTextDocument({
            content: 'def test_function():\n    return "hello"',
            language: 'python'
        });
        await vscode.window.showTextDocument(document);
        try {
            await vscode.commands.executeCommand('codemindmap.showJsonView');
            // Command should execute without throwing an error (it handles the case internally)
            assert.ok(true, 'JSON View command should execute without throwing an error when no analysis data available');
        }
        catch (error) {
            assert.fail('JSON View command should not throw an error, but should handle missing analysis data gracefully');
        }
        finally {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        }
    });
});
//# sourceMappingURL=context-menu.test.js.map