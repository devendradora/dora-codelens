import * as vscode from 'vscode';
import { ErrorHandler } from '../core/error-handler';
import { JsonContextDetector } from '../utils/json-context-detector';
import { JsonError, JsonWarning, JsonValidationResult } from '../types/json-types';
import { JsonValidator } from './json-validator';

export interface JsonFormattingOptions {
    indent: number;
    sortKeys: boolean;
    removeComments: boolean;
    removeTrailingCommas: boolean;
    insertFinalNewline: boolean;
    maxLineLength: number;
    preserveArrayFormatting: boolean;
}

export class JsonUtilitiesService {
    private static instance: JsonUtilitiesService;
    private errorHandler: ErrorHandler;
    private outputChannel: vscode.OutputChannel;
    private defaultOptions: JsonFormattingOptions;

    private constructor(errorHandler: ErrorHandler) {
        this.errorHandler = errorHandler;
        this.outputChannel = vscode.window.createOutputChannel('DoraCodeBird JSON Utilities');
        this.defaultOptions = {
            indent: 2,
            sortKeys: false,
            removeComments: false,
            removeTrailingCommas: false,
            insertFinalNewline: true,
            maxLineLength: 120,
            preserveArrayFormatting: true
        };
    }

    public static getInstance(errorHandler?: ErrorHandler): JsonUtilitiesService {
        if (!JsonUtilitiesService.instance) {
            if (!errorHandler) {
                throw new Error('ErrorHandler required for first initialization');
            }
            JsonUtilitiesService.instance = new JsonUtilitiesService(errorHandler);
        }
        return JsonUtilitiesService.instance;
    }

    public isJsonContext(document?: vscode.TextDocument, position?: vscode.Position): boolean {
        return JsonContextDetector.isJsonContext(document, position);
    }

    /**
     * Format JSON content
     */
    public async formatJson(content: string, options?: Partial<JsonFormattingOptions>): Promise<string> {
        try {
            // First check if it looks like a Python dict
            if (this.isPythonDictLike(content)) {
                // If it looks like Python, try to convert it first
                const fixedJson = await this.fixPythonDictToJson(content);
                const parsedJson = JSON.parse(fixedJson);
                return JSON.stringify(parsedJson, null, this.defaultOptions.indent);
            }
            // Try to parse as regular JSON
            const parsedJson = JSON.parse(content);
            return JSON.stringify(parsedJson, null, this.defaultOptions.indent);
        } catch (error) {
            // If regular JSON parse fails, try to fix Python dict syntax as fallback
            const fixedJson = await this.fixPythonDictToJson(content);
            const parsedJson = JSON.parse(fixedJson);
            return JSON.stringify(parsedJson, null, this.defaultOptions.indent);
        }
    }

    /**
     * Convert Python dict to JSON
     */
    private async fixPythonDictToJson(content: string): Promise<string> {
        try {
            // First pass: Convert Python special values
            let result = content.trim();
            result = result
                .replace(/\bTrue\b/g, 'true')
                .replace(/\bFalse\b/g, 'false')
                .replace(/\bNone\b/g, 'null');

            // Second pass: Handle quotes and structural elements
            let output = '';
            let inString = false;
            let currentQuote = '';
            let escaped = false;

            for (let i = 0; i < result.length; i++) {
                const char = result[i];
                
                if (escaped) {
                    output += char;
                    escaped = false;
                    continue;
                }

                if (char === '\\') {
                    output += char;
                    escaped = true;
                    continue;
                }

                if (char === "'" || char === '"') {
                    if (!inString) {
                        inString = true;
                        currentQuote = char;
                        output += '"'; // Always use double quotes
                    } else if (char === currentQuote) {
                        inString = false;
                        output += '"';
                    } else {
                        output += char;
                    }
                    continue;
                }

                if (!inString) {
                    // Handle colons outside strings
                    if (char === ':') {
                        output += char + ' ';
                        continue;
                    }
                    // Handle commas
                    if (char === ',') {
                        const nextNonSpace = result.slice(i + 1).match(/\s*([^\s])/);
                        if (nextNonSpace && (nextNonSpace[1] === '}' || nextNonSpace[1] === ']')) {
                            continue; // Skip trailing comma
                        }
                        output += char + ' ';
                        continue;
                    }
                }

                output += char;
            }

            // Third pass: Clean up whitespace and validate
            output = output
                .replace(/\s+/g, ' ')
                .replace(/{\s+/g, '{')
                .replace(/\s+}/g, '}')
                .replace(/\[\s+/g, '[')
                .replace(/\s+\]/g, ']')
                .trim();

            // Validate the result
            JSON.parse(output);
            return output;
            
        } catch (error) {
            // Add context to the error message
            if (error instanceof Error) {
                if (error.message.includes('position')) {
                    const match = error.message.match(/position (\d+)/);
                    if (match) {
                        const pos = parseInt(match[1]);
                        const lines = content.split('\n');
                        let currentPos = 0;
                        for (let i = 0; i < lines.length; i++) {
                            if (currentPos + lines[i].length >= pos) {
                                throw new Error(
                                    `Failed to convert Python dictionary: ${error.message} (line ${i + 1} column ${pos - currentPos + 1})`
                                );
                            }
                            currentPos += lines[i].length + 1;
                        }
                    }
                }
                throw new Error(`Failed to convert Python dictionary: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Initial cleanup of Python dict syntax
     */
    private cleanupPythonDict(content: string): string {
        // Normalize line endings and remove empty lines
        let result = content
            .replace(/\r\n/g, '\n')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n');

        // Remove comments
        result = result
            .replace(/#[^\n]*/g, '')              // Single-line comments
            .replace(/'''[\s\S]*?'''/g, '')       // Triple-single-quoted strings
            .replace(/"""[\s\S]*?"""/g, '');      // Triple-double-quoted strings

        // Remove all trailing commas
        result = result
            .replace(/,(\s*[}\]])/g, '$1')        // Single-line trailing commas
            .replace(/,(\s*[\r\n]+\s*[}\]])/g, '$1') // Multi-line trailing commas
            .replace(/,\s*,/g, ',');              // Double commas

        // Convert Python special values and fix syntax
        result = result
            .replace(/\bTrue\b/g, 'true')
            .replace(/\bFalse\b/g, 'false')
            .replace(/\bNone\b/g, 'null')
            .replace(/'/g, '"')                    // Convert all single quotes to double quotes
            .replace(/,(\s*[}\]])/g, '$1')        // Remove trailing commas before closing brackets
            .replace(/,\s*,/g, ',')               // Fix double commas
            .replace(/([{\[,])\s*[}\]]/g, '$1')   // Remove empty elements
            .replace(/}\s*,\s*}/g, '}}')          // Fix nested object trailing commas
            .replace(/\]\s*,\s*\]/g, ']]')        // Fix nested array trailing commas
            .replace(/([}\]])\s*,\s*$/g, '$1');   // Remove trailing commas at the end
            
        return result;
    }

    /**
     * Process Python dict content into valid JSON
     */
    private processPythonDict(content: string): string {
        let result = '';
        let inString = false;
        let stringChar = '';
        let escaped = false;
        let bracketStack: string[] = [];
        let lastChar = '';
        let skipNext = false;
        
        for (let i = 0; i < content.length; i++) {
            if (skipNext) {
                skipNext = false;
                continue;
            }

            const char = content[i];
            const nextChar = i < content.length - 1 ? content[i + 1] : '';
            
            if (escaped) {
                result += inString ? this.handleEscapedChar(char, stringChar) : char;
                escaped = false;
                continue;
            }

            if (char === '\\') {
                escaped = true;
                result += char;
                continue;
            }

            if (char === "'" || char === '"') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                    result += '"';  // Always use double quotes for JSON
                } else if (char === stringChar) {
                    inString = false;
                    result += '"';  // Close with double quotes
                } else {
                    result += char; // Keep quotes in string content as is
                }
                continue;
            }

            if (!inString) {
                // Skip whitespace between values and commas
                if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
                    if (lastChar === ',' || lastChar === '{' || lastChar === '[') {
                        continue;
                    }
                }

                // Handle commas and brackets
                if (char === ',') {
                    // Skip consecutive commas
                    if (lastChar === ',') {
                        continue;
                    }
                    // Skip trailing commas before closing brackets
                    if (nextChar && (nextChar === '}' || nextChar === ']')) {
                        continue;
                    }
                }

                // Track brackets for better structure validation
                if (char === '{' || char === '[') {
                    bracketStack.push(char);
                } else if (char === '}' || char === ']') {
                    if (bracketStack.length === 0) {
                        throw new Error('Unmatched closing bracket');
                    }
                    const lastBracket = bracketStack.pop();
                    if ((char === '}' && lastBracket !== '{') || 
                        (char === ']' && lastBracket !== '[')) {
                        throw new Error('Mismatched brackets');
                    }
                }
            }
            
            result += char;
            if (char !== ' ' && char !== '\t' && char !== '\n' && char !== '\r') {
                lastChar = char;
            }
        }

        if (inString) {
            throw new Error('Unterminated string');
        }

        if (bracketStack.length > 0) {
            throw new Error('Unclosed brackets');
        }

        return result;
    }

    /**
     * Handle escaped characters in string conversion
     */
    private handleEscapedChar(char: string, stringChar: string): string {
        if (char === stringChar) {
            return char;
        }
        if (char === 'n') {return '\\n';}
        if (char === 't') {return '\\t';}
        if (char === 'r') {return '\\r';}
        return char;
    }

    /**
     * Check if content looks like a Python dictionary
     */
    private isPythonDictLike(content: string): boolean {
        const trimmed = content.trim();
        return trimmed.startsWith('{') && 
               (trimmed.includes("'") || 
                trimmed.includes('True') || 
                trimmed.includes('False') || 
                trimmed.includes('None'));
    }

    /**
     * Format JSON content in the active editor
     */
    public async formatJsonInEditor(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        try {
            const document = editor.document;
            const selection = editor.selection;
            
            // Get content to format (selection or entire document)
            const content = selection.isEmpty ? 
                document.getText() : 
                document.getText(selection);

            if (!content.trim()) {
                vscode.window.showWarningMessage('No content to format');
                return;
            }

            // Format the JSON
            const formatted = await this.formatJson(content);

            // Replace content in editor
            const range = selection.isEmpty ? 
                new vscode.Range(0, 0, document.lineCount, 0) : 
                selection;

            await editor.edit(editBuilder => {
                editBuilder.replace(range, formatted);
            });

            vscode.window.showInformationMessage('JSON formatted successfully');
            this.outputChannel.appendLine(`JSON formatted successfully (${content.length} -> ${formatted.length} characters)`);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.errorHandler.logError('JSON formatting failed', error, 'formatJsonInEditor');
            vscode.window.showErrorMessage(`Failed to format JSON: ${errorMessage}`);
        }
    }

    /**
     * Minify JSON content in the active editor
     */
    public async minifyJsonInEditor(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        try {
            const document = editor.document;
            const selection = editor.selection;
            
            // Get content to minify (selection or entire document)
            const content = selection.isEmpty ? 
                document.getText() : 
                document.getText(selection);

            if (!content.trim()) {
                vscode.window.showWarningMessage('No content to minify');
                return;
            }

            // Minify the JSON
            const minified = await this.minifyJson(content);

            // Replace content in editor
            const range = selection.isEmpty ? 
                new vscode.Range(0, 0, document.lineCount, 0) : 
                selection;

            await editor.edit(editBuilder => {
                editBuilder.replace(range, minified);
            });

            vscode.window.showInformationMessage('JSON minified successfully');
            this.outputChannel.appendLine(`JSON minified successfully (${content.length} -> ${minified.length} characters)`);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.errorHandler.logError('JSON minification failed', error, 'minifyJsonInEditor');
            vscode.window.showErrorMessage(`Failed to minify JSON: ${errorMessage}`);
        }
    }

    /**
     * Minify JSON content
     */
    public async minifyJson(content: string): Promise<string> {
        try {
            // First check if it looks like a Python dict
            if (this.isPythonDictLike(content)) {
                content = await this.fixPythonDictToJson(content);
            }

            // Parse and minify
            const parsed = JSON.parse(content);
            const minified = JSON.stringify(parsed);
            
            return minified;
        } catch (error) {
            throw new Error(`Failed to minify JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Show JSON tree view in a new webview panel
     */
    public async showJsonTreeView(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        try {
            const document = editor.document;
            const selection = editor.selection;
            
            // Get content to display (selection or entire document)
            const content = selection.isEmpty ? 
                document.getText() : 
                document.getText(selection);

            if (!content.trim()) {
                vscode.window.showWarningMessage('No content to display');
                return;
            }

            // Process content if needed
            let workingContent = content;
            if (this.isPythonDictLike(content)) {
                workingContent = await this.fixPythonDictToJson(content);
            }

            // Parse JSON
            const jsonObject = JSON.parse(workingContent);
            
            // Create webview panel
            const panel = vscode.window.createWebviewPanel(
                'jsonTreeView',
                'JSON Tree View',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            // Generate HTML content (simplified for now)
            panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <title>JSON Tree View</title>
    <style>
        body { font-family: monospace; padding: 20px; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 4px; }
    </style>
</head>
<body>
    <h2>JSON Tree View</h2>
    <pre>${JSON.stringify(jsonObject, null, 2)}</pre>
</body>
</html>`;

            this.outputChannel.appendLine('JSON tree view opened successfully');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.errorHandler.logError('JSON tree view failed', error, 'showJsonTreeView');
            vscode.window.showErrorMessage(`Failed to show JSON tree view: ${errorMessage}`);
        }
    }

    /**
     * Fix JSON-like content by converting Python dict syntax to valid JSON
     */
    public async fixJsonInEditor(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        try {
            const document = editor.document;
            const selection = editor.selection;
            
            // Get content to fix (selection or entire document)
            const content = selection.isEmpty ? 
                document.getText() : 
                document.getText(selection);

            if (!content.trim()) {
                vscode.window.showWarningMessage('No content to fix');
                return;
            }

            // Process and fix the content
            const fixed = await this.fixPythonDictToJson(content);

            // Replace content in editor
            const range = selection.isEmpty ? 
                new vscode.Range(0, 0, document.lineCount, 0) : 
                selection;

            await editor.edit(editBuilder => {
                editBuilder.replace(range, fixed);
            });

            vscode.window.showInformationMessage('JSON fixed successfully');
            this.outputChannel.appendLine(`JSON fixed successfully (${content.length} -> ${fixed.length} characters)`);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.errorHandler.logError('JSON fix failed', error, 'fixJsonInEditor');
            vscode.window.showErrorMessage(`Failed to fix JSON: ${errorMessage}`);
        }
    }

    /**
     * Cleanup and dispose of resources
     */
    public dispose(): void {
        this.outputChannel.dispose();
    }
}
