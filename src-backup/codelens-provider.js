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
exports.ComplexityCodeLensProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
/**
 * CodeLens provider that displays complexity scores above function definitions
 */
class ComplexityCodeLensProvider {
    constructor(outputChannel) {
        this._onDidChangeCodeLenses = new vscode.EventEmitter();
        this.onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;
        this.analysisData = null;
        this.outputChannel = outputChannel;
    }
    /**
     * Update the analysis data and refresh CodeLens
     */
    updateAnalysisData(data) {
        this.analysisData = this.normalizeAnalysisData(data);
        this._onDidChangeCodeLenses.fire();
        this.log(`CodeLens data updated with ${this.analysisData?.functions?.nodes?.length || 0} functions`);
    }
    /**
     * Normalize analysis data to handle different formats
     */
    normalizeAnalysisData(data) {
        if (!data) {
            return null;
        }
        // Handle both old and new data formats
        let functions = [];
        if (data.functions) {
            if (Array.isArray(data.functions)) {
                // Old format: functions is an array
                functions = data.functions;
            }
            else if (Array.isArray(data.functions.nodes)) {
                // New format: functions.nodes is an array
                functions = data.functions.nodes.map((func) => ({
                    id: func.id,
                    name: func.name,
                    module: func.module,
                    complexity: func.complexity || 0,
                    line_number: func.line_number || func.lineNumber || 0,
                    parameters: func.parameters || []
                }));
            }
        }
        return {
            functions: {
                nodes: functions,
                total_functions: functions.length
            }
        };
    }
    /**
     * Provide CodeLens for the given document
     */
    provideCodeLenses(document, token) {
        // Only provide CodeLens for Python files
        if (document.languageId !== 'python') {
            return [];
        }
        // Check if CodeLens is enabled in configuration
        const config = vscode.workspace.getConfiguration('doracodebird');
        if (!config.get('showComplexityCodeLens', true)) {
            return [];
        }
        // Check if we have analysis data
        if (!this.analysisData || !this.analysisData.functions) {
            return [];
        }
        const codeLenses = [];
        const documentPath = document.uri.fsPath;
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (!workspaceFolder) {
            return [];
        }
        // Get relative path for module matching
        const relativePath = path.relative(workspaceFolder.uri.fsPath, documentPath);
        const moduleName = this.pathToModuleName(relativePath);
        // Find functions in this module
        const functionsInModule = this.analysisData.functions.nodes.filter(func => this.isModuleMatch(func.module, moduleName, relativePath));
        if (functionsInModule.length === 0) {
            return [];
        }
        this.log(`Found ${functionsInModule.length} functions in module ${moduleName}`);
        // Create CodeLens for each function
        for (const func of functionsInModule) {
            try {
                const codeLens = this.createCodeLensForFunction(document, func);
                if (codeLens) {
                    codeLenses.push(codeLens);
                }
            }
            catch (error) {
                this.logError(`Failed to create CodeLens for function ${func.name}`, error);
            }
        }
        return codeLenses;
    }
    /**
     * Resolve CodeLens command
     */
    resolveCodeLens(codeLens, token) {
        // CodeLens is already resolved in provideCodeLenses
        return codeLens;
    }
    /**
     * Create a CodeLens for a specific function
     */
    createCodeLensForFunction(document, func) {
        try {
            // Find the function definition line
            const lineNumber = this.findFunctionLine(document, func);
            if (lineNumber === -1) {
                this.log(`Could not find function ${func.name} at expected line ${func.line_number} in ${document.fileName}`);
                return null;
            }
            // Validate line number is within document bounds
            if (lineNumber >= document.lineCount) {
                this.logError(`Line number ${lineNumber} is out of bounds for document with ${document.lineCount} lines`, new Error('Line out of bounds'));
                return null;
            }
            const line = document.lineAt(lineNumber);
            const range = new vscode.Range(lineNumber, 0, lineNumber, line.text.length);
            // Get complexity level and color
            const complexityLevel = this.getComplexityLevel(func.complexity);
            // Create the CodeLens title
            const title = this.createCodeLensTitle(func, complexityLevel);
            // Create command for CodeLens click
            const command = {
                title: title,
                command: 'doracodebird.showFunctionComplexityDetails',
                arguments: [func, document.uri, new vscode.Position(lineNumber, 0)]
            };
            return new vscode.CodeLens(range, command);
        }
        catch (error) {
            this.logError(`Failed to create CodeLens for function ${func.name}`, error);
            return null;
        }
    }
    /**
     * Find the actual line number of a function in the document
     */
    findFunctionLine(document, func) {
        // Start searching from the expected line number (1-based to 0-based)
        const expectedLine = Math.max(0, func.line_number - 1);
        const searchRange = 15; // Increased search range for better matching
        // First, try exact line match
        if (expectedLine < document.lineCount) {
            const lineText = document.lineAt(expectedLine).text.trim();
            if (this.isFunctionDefinitionLine(lineText, func.name)) {
                return expectedLine;
            }
        }
        // Search around the expected line with priority to lines above
        const searchLines = [];
        for (let offset = 1; offset <= searchRange; offset++) {
            // Check line above first (functions might have moved up due to comments/docstrings)
            if (expectedLine - offset >= 0) {
                searchLines.push(expectedLine - offset);
            }
            // Then check line below
            if (expectedLine + offset < document.lineCount) {
                searchLines.push(expectedLine + offset);
            }
        }
        for (const lineNum of searchLines) {
            const lineText = document.lineAt(lineNum).text.trim();
            if (this.isFunctionDefinitionLine(lineText, func.name)) {
                this.log(`Function ${func.name} found at line ${lineNum + 1} (expected ${func.line_number})`);
                return lineNum;
            }
        }
        // Last resort: search the entire document for the function
        this.log(`Function ${func.name} not found near expected line ${func.line_number}, searching entire document`);
        return this.searchEntireDocumentForFunction(document, func.name);
    }
    /**
     * Search the entire document for a function definition
     */
    searchEntireDocumentForFunction(document, functionName) {
        for (let i = 0; i < document.lineCount; i++) {
            const lineText = document.lineAt(i).text.trim();
            if (this.isFunctionDefinitionLine(lineText, functionName)) {
                this.log(`Function ${functionName} found at line ${i + 1} via full document search`);
                return i;
            }
        }
        this.log(`Function ${functionName} not found in document`);
        return -1;
    }
    /**
     * Check if a line contains a function definition for the given function name
     */
    isFunctionDefinitionLine(lineText, functionName) {
        // Remove leading whitespace and comments
        const cleanLine = lineText.replace(/^\s*/, '').replace(/#.*$/, '').trim();
        // Skip empty lines and non-function lines
        if (!cleanLine || (!cleanLine.includes('def ') && !cleanLine.includes('async def '))) {
            return false;
        }
        // Handle special method names like __init__, __str__, etc.
        const escapedFunctionName = this.escapeRegex(functionName);
        // Check for function definition patterns
        const patterns = [
            // Regular function: def function_name(
            new RegExp(`^def\\s+${escapedFunctionName}\\s*\\(`),
            // Async function: async def function_name(
            new RegExp(`^async\\s+def\\s+${escapedFunctionName}\\s*\\(`),
            // Method with decorators (check if function name appears after def)
            new RegExp(`def\\s+${escapedFunctionName}\\s*\\(`)
        ];
        const matches = patterns.some(pattern => pattern.test(cleanLine));
        if (matches) {
            // Additional validation: make sure it's not a false positive
            // Check that the function name is not part of a larger identifier
            const defMatch = cleanLine.match(/def\s+(\w+)\s*\(/);
            if (defMatch && defMatch[1] === functionName) {
                return true;
            }
            const asyncDefMatch = cleanLine.match(/async\s+def\s+(\w+)\s*\(/);
            if (asyncDefMatch && asyncDefMatch[1] === functionName) {
                return true;
            }
        }
        return false;
    }
    /**
     * Escape special regex characters
     */
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    /**
     * Convert file path to module name
     */
    pathToModuleName(filePath) {
        // Convert file path to Python module name
        return filePath
            .replace(/\\/g, '/') // Normalize path separators
            .replace(/\.py$/, '') // Remove .py extension
            .replace(/\/__init__$/, '') // Remove __init__ for packages
            .replace(/\//g, '.'); // Convert path separators to dots
    }
    /**
     * Check if a function's module matches the current file
     */
    isModuleMatch(functionModule, currentModule, filePath) {
        // Direct match
        if (functionModule === currentModule) {
            return true;
        }
        // Check if function module ends with current module (for nested modules)
        if (functionModule.endsWith('.' + currentModule)) {
            return true;
        }
        // Check if current module ends with function module (for __init__ files)
        if (currentModule.endsWith('.' + functionModule)) {
            return true;
        }
        // Check file name match (without extension)
        const fileName = path.basename(filePath, '.py');
        if (functionModule.endsWith('.' + fileName) || functionModule === fileName) {
            return true;
        }
        // Handle blueprints and nested modules more flexibly
        const moduleSegments = functionModule.split('.');
        const currentSegments = currentModule.split('.');
        // Check if the last segment matches (for files in subdirectories)
        if (moduleSegments.length > 0 && currentSegments.length > 0) {
            const lastModuleSegment = moduleSegments[moduleSegments.length - 1];
            const lastCurrentSegment = currentSegments[currentSegments.length - 1];
            if (lastModuleSegment === lastCurrentSegment) {
                return true;
            }
        }
        // Check if the file name matches any segment of the function module
        if (moduleSegments.includes(fileName)) {
            return true;
        }
        // Handle relative path matching
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const relativePath = path.relative(workspaceRoot, filePath);
            const relativeModule = this.pathToModuleName(relativePath);
            if (functionModule === relativeModule) {
                return true;
            }
        }
        return false;
    }
    /**
     * Get complexity level based on thresholds
     */
    getComplexityLevel(complexity) {
        const config = vscode.workspace.getConfiguration('doracodebird');
        const thresholds = config.get('complexityThresholds', {
            low: 5,
            medium: 10,
            high: 20
        });
        if (complexity <= thresholds.low) {
            return 'low';
        }
        else if (complexity <= thresholds.medium) {
            return 'medium';
        }
        else {
            return 'high';
        }
    }
    /**
     * Get color for complexity level
     */
    getComplexityColor(level) {
        switch (level) {
            case 'low': return '🟢';
            case 'medium': return '🟡';
            case 'high': return '🔴';
        }
    }
    /**
     * Create the CodeLens title text
     */
    createCodeLensTitle(func, level) {
        const color = this.getComplexityColor(level);
        return `${color} Complexity: ${func.complexity} (${level})`;
    }
    /**
     * Log message to output channel
     */
    log(message) {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] CodeLensProvider: ${message}`);
    }
    /**
     * Log error message to output channel
     */
    logError(message, error) {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] CodeLensProvider ERROR: ${message}`);
        if (error) {
            this.outputChannel.appendLine(`[${timestamp}] ${error.toString()}`);
            if (error.stack) {
                this.outputChannel.appendLine(`[${timestamp}] ${error.stack}`);
            }
        }
    }
}
exports.ComplexityCodeLensProvider = ComplexityCodeLensProvider;
//# sourceMappingURL=codelens-provider.js.map