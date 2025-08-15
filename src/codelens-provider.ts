import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Interface for function complexity data from analysis
 */
export interface FunctionComplexityData {
    id: string;
    name: string;
    module: string;
    complexity: number;
    line_number: number;
    parameters: Array<{
        name: string;
        type_hint?: string;
        default_value?: string;
        is_vararg: boolean;
        is_kwarg: boolean;
    }>;
}

/**
 * Interface for analysis data containing function information
 */
export interface AnalysisData {
    functions?: {
        nodes: FunctionComplexityData[];
        total_functions: number;
    };
}

/**
 * CodeLens provider that displays complexity scores above function definitions
 */
export class ComplexityCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    private analysisData: AnalysisData | null = null;
    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
    }

    /**
     * Update the analysis data and refresh CodeLens
     */
    public updateAnalysisData(data: AnalysisData | null): void {
        this.analysisData = this.normalizeAnalysisData(data);
        this._onDidChangeCodeLenses.fire();
        this.log(`CodeLens data updated with ${this.analysisData?.functions?.nodes?.length || 0} functions`);
    }

    /**
     * Normalize analysis data to handle different formats
     */
    private normalizeAnalysisData(data: any): AnalysisData | null {
        if (!data) {
            return null;
        }

        // Handle both old and new data formats
        let functions: FunctionComplexityData[] = [];
        
        if (data.functions) {
            if (Array.isArray(data.functions)) {
                // Old format: functions is an array
                functions = data.functions;
            } else if (Array.isArray(data.functions.nodes)) {
                // New format: functions.nodes is an array
                functions = data.functions.nodes.map((func: any) => ({
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
    public provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CodeLens[]> {
        // Only provide CodeLens for Python files
        if (document.languageId !== 'python') {
            return [];
        }

        // Check if CodeLens is enabled in configuration
        const config = vscode.workspace.getConfiguration('codemindmap');
        if (!config.get<boolean>('showComplexityCodeLens', true)) {
            return [];
        }

        // Check if we have analysis data
        if (!this.analysisData || !this.analysisData.functions) {
            return [];
        }

        const codeLenses: vscode.CodeLens[] = [];
        const documentPath = document.uri.fsPath;
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        
        if (!workspaceFolder) {
            return [];
        }

        // Get relative path for module matching
        const relativePath = path.relative(workspaceFolder.uri.fsPath, documentPath);
        const moduleName = this.pathToModuleName(relativePath);

        // Find functions in this module
        const functionsInModule = this.analysisData.functions.nodes.filter(func => 
            this.isModuleMatch(func.module, moduleName, relativePath)
        );

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
            } catch (error) {
                this.logError(`Failed to create CodeLens for function ${func.name}`, error);
            }
        }

        return codeLenses;
    }

    /**
     * Resolve CodeLens command
     */
    public resolveCodeLens(
        codeLens: vscode.CodeLens,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CodeLens> {
        // CodeLens is already resolved in provideCodeLenses
        return codeLens;
    }

    /**
     * Create a CodeLens for a specific function
     */
    private createCodeLensForFunction(
        document: vscode.TextDocument,
        func: FunctionComplexityData
    ): vscode.CodeLens | null {
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
            const command: vscode.Command = {
                title: title,
                command: 'codemindmap.showFunctionComplexityDetails',
                arguments: [func, document.uri, new vscode.Position(lineNumber, 0)]
            };

            return new vscode.CodeLens(range, command);
        } catch (error) {
            this.logError(`Failed to create CodeLens for function ${func.name}`, error);
            return null;
        }
    }

    /**
     * Find the actual line number of a function in the document
     */
    private findFunctionLine(document: vscode.TextDocument, func: FunctionComplexityData): number {
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
        const searchLines: number[] = [];
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
    private searchEntireDocumentForFunction(document: vscode.TextDocument, functionName: string): number {
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
    private isFunctionDefinitionLine(lineText: string, functionName: string): boolean {
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
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Convert file path to module name
     */
    private pathToModuleName(filePath: string): string {
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
    private isModuleMatch(functionModule: string, currentModule: string, filePath: string): boolean {
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
    private getComplexityLevel(complexity: number): 'low' | 'medium' | 'high' {
        const config = vscode.workspace.getConfiguration('codemindmap');
        const thresholds = config.get<{low: number, medium: number, high: number}>('complexityThresholds', {
            low: 5,
            medium: 10,
            high: 20
        });

        if (complexity <= thresholds.low) {
            return 'low';
        } else if (complexity <= thresholds.medium) {
            return 'medium';
        } else {
            return 'high';
        }
    }

    /**
     * Get color for complexity level
     */
    private getComplexityColor(level: 'low' | 'medium' | 'high'): string {
        switch (level) {
            case 'low': return '🟢';
            case 'medium': return '🟡';
            case 'high': return '🔴';
        }
    }

    /**
     * Create the CodeLens title text
     */
    private createCodeLensTitle(func: FunctionComplexityData, level: 'low' | 'medium' | 'high'): string {
        const color = this.getComplexityColor(level);
        return `${color} Complexity: ${func.complexity} (${level})`;
    }

    /**
     * Log message to output channel
     */
    private log(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] CodeLensProvider: ${message}`);
    }

    /**
     * Log error message to output channel
     */
    private logError(message: string, error: any): void {
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