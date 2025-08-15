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
        this.analysisData = data;
        this._onDidChangeCodeLenses.fire();
        this.log(`CodeLens data updated with ${data?.functions?.nodes?.length || 0} functions`);
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
        // Find the function definition line
        const lineNumber = this.findFunctionLine(document, func);
        if (lineNumber === -1) {
            this.log(`Could not find function ${func.name} at expected line ${func.line_number}`);
            return null;
        }

        const line = document.lineAt(lineNumber);
        const range = new vscode.Range(lineNumber, 0, lineNumber, line.text.length);

        // Get complexity level and color
        const complexityLevel = this.getComplexityLevel(func.complexity);
        const complexityColor = this.getComplexityColor(complexityLevel);
        
        // Create the CodeLens title
        const title = this.createCodeLensTitle(func, complexityLevel);

        // Create command for CodeLens click
        const command: vscode.Command = {
            title: title,
            command: 'codemindmap.showFunctionComplexityDetails',
            arguments: [func, document.uri, new vscode.Position(lineNumber, 0)]
        };

        return new vscode.CodeLens(range, command);
    }

    /**
     * Find the actual line number of a function in the document
     */
    private findFunctionLine(document: vscode.TextDocument, func: FunctionComplexityData): number {
        // Start searching from the expected line number (1-based to 0-based)
        const expectedLine = Math.max(0, func.line_number - 1);
        const searchRange = 10; // Search within 10 lines of expected position

        // Search around the expected line
        const startLine = Math.max(0, expectedLine - searchRange);
        const endLine = Math.min(document.lineCount - 1, expectedLine + searchRange);

        for (let i = startLine; i <= endLine; i++) {
            const lineText = document.lineAt(i).text.trim();
            
            // Look for function definition patterns
            if (this.isFunctionDefinitionLine(lineText, func.name)) {
                return i;
            }
        }

        // If not found in range, try the exact expected line
        if (expectedLine < document.lineCount) {
            const lineText = document.lineAt(expectedLine).text.trim();
            if (lineText.includes('def ') || lineText.includes('async def ')) {
                return expectedLine;
            }
        }

        return -1;
    }

    /**
     * Check if a line contains a function definition for the given function name
     */
    private isFunctionDefinitionLine(lineText: string, functionName: string): boolean {
        // Remove leading whitespace and comments
        const cleanLine = lineText.replace(/^\s*/, '').replace(/#.*$/, '').trim();
        
        // Check for function definition patterns
        const patterns = [
            new RegExp(`^def\\s+${this.escapeRegex(functionName)}\\s*\\(`),
            new RegExp(`^async\\s+def\\s+${this.escapeRegex(functionName)}\\s*\\(`)
        ];

        return patterns.some(pattern => pattern.test(cleanLine));
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