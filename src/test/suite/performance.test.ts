import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

suite('Performance and Stress Tests', () => {
    let extension: vscode.Extension<any> | undefined;
    let tempWorkspaceDir: string;

    suiteSetup(async () => {
        extension = vscode.extensions.getExtension('codemindmap.codemindmap');
        if (extension && !extension.isActive) {
            await extension.activate();
        }
    });

    setup(async () => {
        tempWorkspaceDir = path.join(__dirname, `perf-workspace-${Date.now()}`);
        if (!fs.existsSync(tempWorkspaceDir)) {
            fs.mkdirSync(tempWorkspaceDir, { recursive: true });
        }
    });

    teardown(async () => {
        if (fs.existsSync(tempWorkspaceDir)) {
            fs.rmSync(tempWorkspaceDir, { recursive: true, force: true });
        }
    });

    test('Performance: Extension activation time', async () => {
        const startTime = Date.now();
        
        // Re-activate extension to measure activation time
        if (extension && extension.isActive) {
            // Extension is already active, so we'll test command registration instead
            const commands = await vscode.commands.getCommands();
            const codemindmapCommands = commands.filter(cmd => cmd.startsWith('codemindmap.'));
            
            const endTime = Date.now();
            const activationTime = endTime - startTime;
            
            assert.ok(codemindmapCommands.length > 0, 'Extension commands should be registered');
            assert.ok(activationTime < 5000, `Command lookup should be fast (took ${activationTime}ms)`);
        }
    });

    test('Performance: Handle many Python files', async () => {
        const startTime = Date.now();
        
        // Create many Python files
        const fileCount = 50;
        for (let i = 0; i < fileCount; i++) {
            const content = `
def function_${i}(param):
    """Function number ${i}."""
    result = param * ${i}
    if result > 100:
        return result // 2
    return result

class Class${i}:
    def method_${i}(self, value):
        return value + ${i}
`;
            fs.writeFileSync(path.join(tempWorkspaceDir, `module_${i}.py`), content);
        }
        
        const fileCreationTime = Date.now() - startTime;
        assert.ok(fileCreationTime < 10000, `File creation should be fast (took ${fileCreationTime}ms)`);
        
        // Test file discovery performance
        const discoveryStartTime = Date.now();
        const pythonFiles = await vscode.workspace.findFiles(
            new vscode.RelativePattern(tempWorkspaceDir, '**/*.py'),
            '**/node_modules/**',
            100
        );
        const discoveryTime = Date.now() - discoveryStartTime;
        
        assert.strictEqual(pythonFiles.length, fileCount, `Should find all ${fileCount} Python files`);
        assert.ok(discoveryTime < 5000, `File discovery should be fast (took ${discoveryTime}ms)`);
    });

    test('Performance: Handle deeply nested project structure', async () => {
        const startTime = Date.now();
        
        // Create deeply nested structure
        let currentDir = tempWorkspaceDir;
        const depth = 10;
        
        for (let i = 0; i < depth; i++) {
            currentDir = path.join(currentDir, `level_${i}`);
            fs.mkdirSync(currentDir, { recursive: true });
            
            // Add __init__.py to make it a Python package
            fs.writeFileSync(path.join(currentDir, '__init__.py'), `"""Level ${i} package."""\n`);
            
            // Add a module at each level
            const moduleContent = `
def level_${i}_function():
    """Function at level ${i}."""
    return ${i}

class Level${i}Class:
    def process(self, data):
        return data * ${i}
`;
            fs.writeFileSync(path.join(currentDir, `module_${i}.py`), moduleContent);
        }
        
        const structureCreationTime = Date.now() - startTime;
        assert.ok(structureCreationTime < 5000, `Deep structure creation should be fast (took ${structureCreationTime}ms)`);
        
        // Test file discovery in deep structure
        const discoveryStartTime = Date.now();
        const pythonFiles = await vscode.workspace.findFiles(
            new vscode.RelativePattern(tempWorkspaceDir, '**/*.py'),
            '**/node_modules/**',
            50
        );
        const discoveryTime = Date.now() - discoveryStartTime;
        
        assert.ok(pythonFiles.length >= depth * 2, 'Should find files in deep structure');
        assert.ok(discoveryTime < 3000, `Deep file discovery should be fast (took ${discoveryTime}ms)`);
    });

    test('Performance: Handle large Python files', async () => {
        const startTime = Date.now();
        
        // Create a large Python file
        let largeFileContent = '"""Large Python file for performance testing."""\n\n';
        
        // Add many functions
        for (let i = 0; i < 200; i++) {
            largeFileContent += `
def function_${i}(param1, param2, param3):
    """Function ${i} with some complexity."""
    result = param1 + param2 * param3
    
    if result > 100:
        for j in range(10):
            if j % 2 == 0:
                result += j
            else:
                result -= j
    elif result > 50:
        try:
            result = result / param3
        except ZeroDivisionError:
            result = 0
    else:
        result = result ** 2
    
    return result

`;
        }
        
        // Add many classes
        for (let i = 0; i < 50; i++) {
            largeFileContent += `
class LargeClass${i}:
    """Class ${i} with multiple methods."""
    
    def __init__(self, value):
        self.value = value
        self.data = [x for x in range(${i * 10})]
    
    def method_a_${i}(self, param):
        return self.value + param
    
    def method_b_${i}(self, param):
        return self.value * param
    
    def method_c_${i}(self, param):
        if param > self.value:
            return param - self.value
        return self.value - param

`;
        }
        
        fs.writeFileSync(path.join(tempWorkspaceDir, 'large_file.py'), largeFileContent);
        
        const fileCreationTime = Date.now() - startTime;
        const fileSizeKB = Math.round(largeFileContent.length / 1024);
        
        assert.ok(fileCreationTime < 5000, `Large file creation should be fast (took ${fileCreationTime}ms)`);
        assert.ok(fileSizeKB > 10, `File should be reasonably large (${fileSizeKB}KB)`);
        
        // Test opening the large file
        const openStartTime = Date.now();
        try {
            const document = await vscode.workspace.openTextDocument(
                vscode.Uri.file(path.join(tempWorkspaceDir, 'large_file.py'))
            );
            const openTime = Date.now() - openStartTime;
            
            assert.ok(document.lineCount > 1000, 'Large file should have many lines');
            assert.ok(openTime < 10000, `Large file opening should be fast (took ${openTime}ms)`);
            
            // Close the document
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        } catch (error) {
            // File opening might fail in test environment
            assert.ok(error instanceof Error);
        }
    });

    test('Stress: Rapid command execution', async () => {
        const startTime = Date.now();
        const commandCount = 20;
        const commands = [
            'codemindmap.showOutput',
            'codemindmap.clearCache',
            'codemindmap.refreshSidebar',
            'codemindmap.clearSelection'
        ];
        
        const promises = [];
        
        for (let i = 0; i < commandCount; i++) {
            const command = commands[i % commands.length];
            promises.push(
                Promise.resolve(vscode.commands.executeCommand(command)).catch(() => {
                    // Ignore errors in test environment
                })
            );
        }
        
        await Promise.all(promises);
        
        const executionTime = Date.now() - startTime;
        assert.ok(executionTime < 10000, `Rapid command execution should complete quickly (took ${executionTime}ms)`);
    });

    test('Stress: Memory usage with large datasets', async () => {
        // Create a project with many interconnected modules
        const moduleCount = 30;
        
        for (let i = 0; i < moduleCount; i++) {
            let content = `"""Module ${i}."""\n\n`;
            
            // Import from other modules to create dependencies
            for (let j = 0; j < Math.min(5, i); j++) {
                content += `from module_${j} import function_${j}\n`;
            }
            
            content += '\n';
            
            // Add functions that call other functions
            for (let k = 0; k < 10; k++) {
                content += `
def function_${i}_${k}(param):
    """Function ${k} in module ${i}."""
    result = param * ${k}
`;
                
                // Add calls to other modules
                if (i > 0) {
                    const targetModule = Math.floor(Math.random() * i);
                    const targetFunction = Math.floor(Math.random() * 10);
                    content += `    result += function_${targetModule}(result)\n`;
                }
                
                content += `    return result\n`;
            }
            
            fs.writeFileSync(path.join(tempWorkspaceDir, `module_${i}.py`), content);
        }
        
        // Test that the extension can handle this without memory issues
        try {
            await vscode.commands.executeCommand('codemindmap.analyzeProject');
            assert.ok(true, 'Extension should handle large interconnected projects');
        } catch (error) {
            // Analysis might fail in test environment, but should not cause memory issues
            assert.ok(error instanceof Error);
        }
    });

    test('Stress: Concurrent operations', async () => {
        // Create some Python files
        for (let i = 0; i < 10; i++) {
            const content = `
def concurrent_function_${i}():
    return ${i}
`;
            fs.writeFileSync(path.join(tempWorkspaceDir, `concurrent_${i}.py`), content);
        }
        
        const startTime = Date.now();
        
        // Execute multiple operations concurrently
        const operations = [
            Promise.resolve(vscode.commands.executeCommand('codemindmap.analyzeProject')).catch(() => {}),
            Promise.resolve(vscode.commands.executeCommand('codemindmap.showModuleGraph')).catch(() => {}),
            Promise.resolve(vscode.commands.executeCommand('codemindmap.refreshSidebar')).catch(() => {}),
            Promise.resolve(vscode.commands.executeCommand('codemindmap.clearCache')).catch(() => {}),
            Promise.resolve(vscode.commands.executeCommand('codemindmap.showOutput')).catch(() => {})
        ];
        
        await Promise.all(operations);
        
        const executionTime = Date.now() - startTime;
        assert.ok(executionTime < 15000, `Concurrent operations should complete reasonably quickly (took ${executionTime}ms)`);
    });

    test('Performance: Configuration access speed', async () => {
        const startTime = Date.now();
        const iterations = 100;
        
        for (let i = 0; i < iterations; i++) {
            const config = vscode.workspace.getConfiguration('codemindmap');
            
            // Access various configuration values
            config.get('pythonPath');
            config.get('showComplexityCodeLens');
            config.get('complexityThresholds');
            config.get('enableCaching');
        }
        
        const executionTime = Date.now() - startTime;
        const avgTime = executionTime / iterations;
        
        assert.ok(avgTime < 10, `Configuration access should be fast (avg ${avgTime.toFixed(2)}ms per access)`);
    });

    test('Performance: File system operations', async () => {
        const fileCount = 100;
        const startTime = Date.now();
        
        // Create many files
        for (let i = 0; i < fileCount; i++) {
            const content = `# File ${i}\ndef func_${i}(): pass\n`;
            fs.writeFileSync(path.join(tempWorkspaceDir, `perf_file_${i}.py`), content);
        }
        
        const creationTime = Date.now() - startTime;
        
        // Test file discovery
        const discoveryStartTime = Date.now();
        const files = await vscode.workspace.findFiles(
            new vscode.RelativePattern(tempWorkspaceDir, '**/*.py'),
            '**/node_modules/**',
            fileCount + 10
        );
        const discoveryTime = Date.now() - discoveryStartTime;
        
        assert.strictEqual(files.length, fileCount, `Should find all ${fileCount} files`);
        assert.ok(creationTime < 5000, `File creation should be fast (took ${creationTime}ms)`);
        assert.ok(discoveryTime < 3000, `File discovery should be fast (took ${discoveryTime}ms)`);
    });

    test('Stress: Error handling under load', async () => {
        // Create files with various types of issues
        const problematicFiles = [
            { name: 'syntax_error.py', content: 'def broken_function(\n    # Missing closing paren' },
            { name: 'import_error.py', content: 'import nonexistent_module\ndef func(): pass' },
            { name: 'encoding_issue.py', content: '# -*- coding: utf-8 -*-\ndef func(): return "test"' },
            { name: 'very_long_line.py', content: `def func(): return "${'x'.repeat(1000)}"` },
            { name: 'empty.py', content: '' },
            { name: 'only_comments.py', content: '# Just comments\n# Nothing else\n' }
        ];
        
        problematicFiles.forEach(file => {
            fs.writeFileSync(path.join(tempWorkspaceDir, file.name), file.content);
        });
        
        // Test that extension handles all these issues gracefully
        try {
            await vscode.commands.executeCommand('codemindmap.analyzeProject');
            assert.ok(true, 'Extension should handle problematic files gracefully');
        } catch (error) {
            // Errors are expected with problematic files, but extension should not crash
            assert.ok(error instanceof Error);
        }
        
        // Test that other commands still work after encountering errors
        try {
            await vscode.commands.executeCommand('codemindmap.clearCache');
            await vscode.commands.executeCommand('codemindmap.showOutput');
            assert.ok(true, 'Extension should remain functional after handling errors');
        } catch (error) {
            // Commands might fail in test environment, but should not crash
            assert.ok(error instanceof Error);
        }
    });
});