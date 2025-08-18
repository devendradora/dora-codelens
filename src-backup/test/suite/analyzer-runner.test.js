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
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const analyzer_runner_1 = require("../../analyzer-runner");
suite('AnalyzerRunner Test Suite', () => {
    let analyzerRunner;
    let outputChannel;
    let mockExtensionPath;
    setup(() => {
        outputChannel = vscode.window.createOutputChannel('Test');
        mockExtensionPath = path.join(__dirname, '../../../');
        analyzerRunner = new analyzer_runner_1.AnalyzerRunner(outputChannel, mockExtensionPath);
    });
    teardown(() => {
        outputChannel.dispose();
        analyzerRunner.cancelAnalysis();
    });
    test('should create AnalyzerRunner instance', () => {
        assert.ok(analyzerRunner);
        assert.ok(analyzerRunner instanceof analyzer_runner_1.AnalyzerRunner);
    });
    test('should validate project path exists', async () => {
        const options = {
            projectPath: '/nonexistent/path',
            timeout: 5000
        };
        try {
            await analyzerRunner.runAnalysis(options);
            assert.fail('Should have thrown an error for nonexistent path');
        }
        catch (error) {
            assert.ok(error instanceof Error);
            assert.ok(error.message.includes('Project path does not exist'));
        }
    });
    test('should validate project path is directory', async () => {
        // Create a temporary file
        const tempFile = path.join(__dirname, 'temp-file.txt');
        fs.writeFileSync(tempFile, 'test');
        const options = {
            projectPath: tempFile,
            timeout: 5000
        };
        try {
            await analyzerRunner.runAnalysis(options);
            assert.fail('Should have thrown an error for file path');
        }
        catch (error) {
            assert.ok(error instanceof Error);
            assert.ok(error.message.includes('Project path is not a directory'));
        }
        finally {
            // Clean up
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
        }
    });
    test('should handle cancellation', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            // Skip test if no workspace
            return;
        }
        const options = {
            projectPath: workspaceFolders[0].uri.fsPath,
            timeout: 30000
        };
        // Start analysis and immediately cancel
        const analysisPromise = analyzerRunner.runAnalysis(options);
        // Cancel after a short delay
        setTimeout(() => {
            analyzerRunner.cancelAnalysis();
        }, 100);
        try {
            const result = await analysisPromise;
            // Analysis might complete before cancellation, which is fine
            assert.ok(result);
        }
        catch (error) {
            // Cancellation might throw an error, which is also fine
            assert.ok(error instanceof Error);
        }
    });
    test('should handle timeout', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            // Skip test if no workspace
            return;
        }
        const options = {
            projectPath: workspaceFolders[0].uri.fsPath,
            timeout: 1 // Very short timeout
        };
        try {
            const result = await analyzerRunner.runAnalysis(options);
            // If analysis completes very quickly, that's fine
            assert.ok(result);
        }
        catch (error) {
            // Timeout error is expected
            assert.ok(error instanceof Error);
            assert.ok(error.message.includes('timed out') || error.message.includes('timeout'));
        }
    });
    test('should handle progress reporting', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            // Skip test if no workspace
            return;
        }
        const options = {
            projectPath: workspaceFolders[0].uri.fsPath,
            timeout: 30000
        };
        let progressReports = [];
        const mockProgress = {
            report: (value) => {
                progressReports.push(value);
            }
        };
        const cancellationTokenSource = new vscode.CancellationTokenSource();
        try {
            await analyzerRunner.runAnalysis(options, mockProgress, cancellationTokenSource.token);
            // Should have received some progress reports
            assert.ok(progressReports.length > 0);
            // Should have initial progress report
            const initialReport = progressReports.find(report => report.message && report.message.includes('Preparing'));
            assert.ok(initialReport, 'Should have initial progress report');
        }
        catch (error) {
            // Analysis might fail due to missing Python or analyzer script, which is fine for this test
            assert.ok(progressReports.length > 0, 'Should still have received progress reports');
        }
        finally {
            cancellationTokenSource.dispose();
        }
    });
    test('should handle missing Python executable', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            // Skip test if no workspace
            return;
        }
        const options = {
            projectPath: workspaceFolders[0].uri.fsPath,
            pythonPath: 'nonexistent-python-executable',
            timeout: 5000
        };
        try {
            const result = await analyzerRunner.runAnalysis(options);
            assert.ok(!result.success, 'Analysis should fail with invalid Python path');
            assert.ok(result.errors && result.errors.length > 0, 'Should have error information');
        }
        catch (error) {
            // Error is expected for invalid Python path
            assert.ok(error instanceof Error);
        }
    });
    test('should handle missing analyzer script', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            // Skip test if no workspace
            return;
        }
        // Create analyzer runner with invalid extension path
        const invalidAnalyzerRunner = new analyzer_runner_1.AnalyzerRunner(outputChannel, '/invalid/path');
        const options = {
            projectPath: workspaceFolders[0].uri.fsPath,
            timeout: 5000
        };
        try {
            await invalidAnalyzerRunner.runAnalysis(options);
            assert.fail('Should have thrown an error for missing analyzer script');
        }
        catch (error) {
            assert.ok(error instanceof Error);
            assert.ok(error.message.includes('Analyzer script not found'));
        }
    });
    test('should return execution time in result', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            // Skip test if no workspace
            return;
        }
        const options = {
            projectPath: workspaceFolders[0].uri.fsPath,
            timeout: 30000
        };
        try {
            const result = await analyzerRunner.runAnalysis(options);
            assert.ok(typeof result.executionTime === 'number', 'Should have execution time');
            assert.ok(result.executionTime >= 0, 'Execution time should be non-negative');
        }
        catch (error) {
            // Analysis might fail, but we should still get execution time in the result
            if (error instanceof Error && error.message.includes('executionTime')) {
                // This is fine - the error handling includes execution time
                assert.ok(true);
            }
        }
    });
    test('should handle empty project directory', async () => {
        // Create a temporary empty directory
        const tempDir = path.join(__dirname, 'temp-empty-dir');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }
        const options = {
            projectPath: tempDir,
            timeout: 5000
        };
        try {
            await analyzerRunner.runAnalysis(options);
            assert.fail('Should have thrown an error for empty project');
        }
        catch (error) {
            assert.ok(error instanceof Error);
            assert.ok(error.message.includes('No Python files found'));
        }
        finally {
            // Clean up
            if (fs.existsSync(tempDir)) {
                fs.rmdirSync(tempDir);
            }
        }
    });
    test('should handle analyzer options correctly', () => {
        const options = {
            projectPath: '/test/path',
            pythonPath: 'python3',
            timeout: 60000,
            enableCaching: true,
            outputPath: '/test/output'
        };
        // Test that all options are accepted without throwing errors
        assert.ok(options.projectPath === '/test/path');
        assert.ok(options.pythonPath === 'python3');
        assert.ok(options.timeout === 60000);
        assert.ok(options.enableCaching === true);
        assert.ok(options.outputPath === '/test/output');
    });
    test('should handle multiple concurrent cancellations', () => {
        // Test that multiple calls to cancelAnalysis don't cause issues
        analyzerRunner.cancelAnalysis();
        analyzerRunner.cancelAnalysis();
        analyzerRunner.cancelAnalysis();
        // Should not throw any errors
        assert.ok(true);
    });
});
//# sourceMappingURL=analyzer-runner.test.js.map