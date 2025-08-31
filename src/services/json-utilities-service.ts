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
        this.outputChannel = vscode.window.createOutputChannel('DoraCodeLens JSON Utilities');
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
     * Show professional JSON tree view in a new webview panel
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
            let validationResult: JsonValidationResult;
            
            try {
                if (this.isPythonDictLike(content)) {
                    workingContent = await this.fixPythonDictToJson(content);
                }
                
                // Validate JSON
                validationResult = JsonValidator.validateJson(workingContent);
                
                if (!validationResult.isValid) {
                    throw new Error(validationResult.errors[0]?.message || 'Invalid JSON');
                }
            } catch (validationError) {
                // Show error view with detailed feedback
                const panel = this.createJsonTreePanel();
                panel.webview.html = this.generateErrorViewHtml(content, validationError);
                return;
            }

            // Parse JSON
            const jsonObject = JSON.parse(workingContent);
            
            // Create webview panel
            const panel = this.createJsonTreePanel();

            // Set up message handling for interactive features
            panel.webview.onDidReceiveMessage(
                message => {
                    switch (message.command) {
                        case 'toggleNode':
                            this.handleNodeToggle(panel, message.nodeId, message.isExpanded);
                            break;
                        case 'searchTree':
                            this.handleTreeSearch(panel, message.query, message.options);
                            break;
                        case 'expandAll':
                            this.handleExpandAll(panel);
                            break;
                        case 'collapseAll':
                            this.handleCollapseAll(panel);
                            break;
                        case 'copyPath':
                            this.handleCopyPath(message.path);
                            break;
                        case 'copyValue':
                            this.handleCopyValue(message.value);
                            break;
                        case 'toggleView':
                            this.handleToggleView(panel, workingContent);
                            break;
                        case 'exportJson':
                            this.handleExportJson(workingContent);
                            break;
                        case 'ready':
                            // Send initial data when webview is ready
                            panel.webview.postMessage({
                                command: 'setData',
                                data: jsonObject,
                                rawJson: workingContent
                            });
                            break;
                    }
                },
                undefined
            );

            // Generate and set HTML content
            panel.webview.html = this.generateProfessionalTreeViewHtml();

            this.outputChannel.appendLine('Professional JSON tree view opened successfully');

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
     * Create JSON tree panel with proper configuration
     */
    private createJsonTreePanel(): vscode.WebviewPanel {
        return vscode.window.createWebviewPanel(
            'professionalJsonTreeView',
            'Professional JSON Tree Viewer',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(vscode.extensions.getExtension('doracodelens.doracodelens')?.extensionUri || vscode.Uri.file(''), 'resources')
                ]
            }
        );
    }

    /**
     * Generate professional tree view HTML
     */
    private generateProfessionalTreeViewHtml(): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Professional JSON Tree Viewer</title>
    <style>
        ${this.getJsonTreeViewerStyles()}
    </style>
</head>
<body>
    <div class="json-tree-viewer">
        <div class="json-toolbar">
            <div class="toolbar-left">
                <button class="toolbar-btn" id="expandAllBtn" title="Expand All" disabled>
                    <span class="icon">⊞</span>
                    <span>Expand All</span>
                </button>
                <button class="toolbar-btn" id="collapseAllBtn" title="Collapse All" disabled>
                    <span class="icon">⊟</span>
                    <span>Collapse All</span>
                </button>
                <button class="toolbar-btn" id="toggleViewBtn" title="Toggle Raw JSON" disabled>
                    <span class="icon">⚏</span>
                    <span>Raw JSON</span>
                </button>
                <button class="toolbar-btn" id="copyJsonBtn" title="Copy JSON" disabled>
                    <span class="icon">📋</span>
                    <span>Copy</span>
                </button>
            </div>
            <div class="toolbar-right">
                <div class="search-container">
                    <input type="text" id="searchInput" class="search-input" placeholder="Search keys and values..." disabled />
                    <div class="search-options">
                        <label class="search-option">
                            <input type="checkbox" id="caseSensitive" />
                            <span>Case sensitive</span>
                        </label>
                        <label class="search-option">
                            <input type="checkbox" id="searchKeys" checked />
                            <span>Keys</span>
                        </label>
                        <label class="search-option">
                            <input type="checkbox" id="searchValues" checked />
                            <span>Values</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="json-content">
            <div class="loading-indicator" id="loadingIndicator">
                <div class="spinner"></div>
                <span>Loading JSON data...</span>
            </div>
            
            <div class="tree-view hidden" id="treeView">
                <div class="line-numbers" id="lineNumbers"></div>
                <div class="json-tree" id="jsonTree"></div>
            </div>
            
            <div class="raw-view hidden" id="rawView">
                <pre class="raw-json" id="rawJson"></pre>
            </div>
            
            <div class="error-view hidden" id="errorView">
                <div class="error-content">
                    <h3>JSON Validation Error</h3>
                    <div class="error-message" id="errorMessage"></div>
                    <div class="error-suggestion" id="errorSuggestion"></div>
                </div>
            </div>
        </div>
        
        <div class="status-bar">
            <div class="status-left">
                <span class="status-item">
                    <span class="status-label">Objects:</span>
                    <span class="status-value" id="objectCount">-</span>
                </span>
                <span class="status-item">
                    <span class="status-label">Arrays:</span>
                    <span class="status-value" id="arrayCount">-</span>
                </span>
                <span class="status-item">
                    <span class="status-label">Total nodes:</span>
                    <span class="status-value" id="totalNodes">-</span>
                </span>
                <span class="status-item">
                    <span class="status-label">Max depth:</span>
                    <span class="status-value" id="maxDepth">-</span>
                </span>
            </div>
            <div class="status-right">
                <span class="status-item">
                    <span class="status-label">Size:</span>
                    <span class="status-value" id="jsonSize">-</span>
                </span>
            </div>
        </div>
    </div>

    <script>
        ${this.getJsonTreeViewerScript()}
    </script>
</body>
</html>`;
    } 
   /**
     * Get professional JSON tree viewer styles
     */
    private getJsonTreeViewerStyles(): string {
        return `
            :root {
                --json-bg: var(--vscode-editor-background, #1e1e1e);
                --json-fg: var(--vscode-editor-foreground, #d4d4d4);
                --json-border: var(--vscode-panel-border, #3c3c3c);
                --json-hover: var(--vscode-list-hoverBackground, #2a2d2e);
                --json-active: var(--vscode-list-activeSelectionBackground, #094771);
                --json-toolbar: var(--vscode-titleBar-activeBackground, #2d2d30);
                --json-button: var(--vscode-button-background, #0e639c);
                --json-button-hover: var(--vscode-button-hoverBackground, #1177bb);
                --json-input: var(--vscode-input-background, #3c3c3c);
                --json-string: #ce9178;
                --json-number: #b5cea8;
                --json-boolean: #569cd6;
                --json-null: #808080;
                --json-key: #9cdcfe;
                --json-bracket: #ffd700;
                --json-expand: #cccccc;
                --json-line-number: #858585;
                --json-highlight: #ffff0040;
                --json-error: #f48771;
                --json-success: #4ec9b0;
            }

            * {
                box-sizing: border-box;
            }

            body {
                margin: 0;
                padding: 0;
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                font-size: 13px;
                line-height: 1.4;
                background-color: var(--json-bg);
                color: var(--json-fg);
                overflow: hidden;
            }

            .json-tree-viewer {
                display: flex;
                flex-direction: column;
                height: 100vh;
                width: 100vw;
            }

            /* Toolbar Styles */
            .json-toolbar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                background-color: var(--json-toolbar);
                border-bottom: 1px solid var(--json-border);
                flex-shrink: 0;
                gap: 12px;
            }

            .toolbar-left, .toolbar-right {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .toolbar-btn {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 6px 10px;
                background-color: var(--json-button);
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
                transition: background-color 0.2s;
            }

            .toolbar-btn:hover:not(:disabled) {
                background-color: var(--json-button-hover);
            }

            .toolbar-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .toolbar-btn .icon {
                font-size: 14px;
            }

            /* Search Container */
            .search-container {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .search-input {
                padding: 6px 8px;
                background-color: var(--json-input);
                color: var(--json-fg);
                border: 1px solid var(--json-border);
                border-radius: 3px;
                font-size: 12px;
                width: 200px;
            }

            .search-input:focus {
                outline: none;
                border-color: var(--json-button);
            }

            .search-options {
                display: flex;
                gap: 12px;
                font-size: 11px;
            }

            .search-option {
                display: flex;
                align-items: center;
                gap: 4px;
                cursor: pointer;
            }

            .search-option input[type="checkbox"] {
                margin: 0;
            }

            /* Content Area */
            .json-content {
                flex: 1;
                position: relative;
                overflow: hidden;
            }

            .loading-indicator {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                gap: 16px;
                color: var(--json-fg);
            }

            .spinner {
                width: 32px;
                height: 32px;
                border: 3px solid var(--json-border);
                border-top: 3px solid var(--json-button);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .tree-view, .raw-view, .error-view {
                height: 100%;
                overflow: auto;
            }

            .hidden {
                display: none !important;
            }

            /* Tree View Styles */
            .tree-view {
                display: flex;
                background-color: var(--json-bg);
            }

            .line-numbers {
                background-color: var(--json-bg);
                color: var(--json-line-number);
                padding: 8px 4px;
                text-align: right;
                font-size: 12px;
                line-height: 20px;
                border-right: 1px solid var(--json-border);
                user-select: none;
                min-width: 40px;
                flex-shrink: 0;
            }

            .json-tree {
                flex: 1;
                padding: 8px;
                overflow-x: auto;
            }

            /* Tree Node Styles */
            .tree-node {
                position: relative;
                margin: 0;
                padding: 0;
            }

            .node-content {
                display: flex;
                align-items: center;
                padding: 2px 0;
                line-height: 20px;
                cursor: pointer;
                border-radius: 2px;
                transition: background-color 0.15s;
            }

            .node-content:hover {
                background-color: var(--json-hover);
            }

            .node-content.selected {
                background-color: var(--json-active);
            }

            .expand-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 16px;
                height: 16px;
                margin-right: 4px;
                color: var(--json-expand);
                cursor: pointer;
                user-select: none;
                transition: transform 0.2s;
            }

            .expand-icon.collapsed {
                transform: rotate(-90deg);
            }

            .expand-icon:hover {
                background-color: var(--json-hover);
                border-radius: 2px;
            }

            .node-key {
                color: var(--json-key);
                margin-right: 4px;
            }

            .node-colon {
                color: var(--json-fg);
                margin-right: 4px;
            }

            .node-value {
                flex: 1;
            }

            .node-value.string {
                color: var(--json-string);
            }

            .node-value.number {
                color: var(--json-number);
            }

            .node-value.boolean {
                color: var(--json-boolean);
            }

            .node-value.null {
                color: var(--json-null);
            }

            .node-bracket {
                color: var(--json-bracket);
                font-weight: bold;
            }

            .node-info {
                color: var(--json-line-number);
                font-style: italic;
                margin-left: 8px;
            }

            .node-children {
                margin-left: 20px;
                border-left: 1px solid var(--json-border);
                padding-left: 8px;
            }

            .node-path {
                position: absolute;
                background-color: var(--json-toolbar);
                color: var(--json-fg);
                padding: 4px 8px;
                border: 1px solid var(--json-border);
                border-radius: 3px;
                font-size: 11px;
                z-index: 1000;
                max-width: 300px;
                word-break: break-all;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            }

            /* Raw View Styles */
            .raw-view {
                padding: 16px;
                background-color: var(--json-bg);
            }

            .raw-json {
                margin: 0;
                padding: 0;
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                font-size: 13px;
                line-height: 1.4;
                color: var(--json-fg);
                white-space: pre-wrap;
                word-break: break-word;
            }

            /* Error View Styles */
            .error-view {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 32px;
            }

            .error-content {
                max-width: 600px;
                text-align: center;
            }

            .error-content h3 {
                color: var(--json-error);
                margin-bottom: 16px;
            }

            .error-message {
                background-color: var(--json-input);
                padding: 12px;
                border-radius: 4px;
                margin-bottom: 12px;
                font-family: monospace;
                color: var(--json-error);
            }

            .error-suggestion {
                color: var(--json-line-number);
                font-style: italic;
            }

            /* Status Bar */
            .status-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 4px 12px;
                background-color: var(--json-toolbar);
                border-top: 1px solid var(--json-border);
                font-size: 11px;
                flex-shrink: 0;
            }

            .status-left, .status-right {
                display: flex;
                gap: 16px;
            }

            .status-item {
                display: flex;
                gap: 4px;
            }

            .status-label {
                color: var(--json-line-number);
            }

            .status-value {
                color: var(--json-fg);
                font-weight: bold;
            }

            /* Highlight for search results */
            .highlight {
                background-color: var(--json-highlight);
                border-radius: 2px;
                padding: 1px 2px;
            }

            /* Scrollbar Styles */
            ::-webkit-scrollbar {
                width: 12px;
                height: 12px;
            }

            ::-webkit-scrollbar-track {
                background-color: var(--json-bg);
            }

            ::-webkit-scrollbar-thumb {
                background-color: var(--json-border);
                border-radius: 6px;
            }

            ::-webkit-scrollbar-thumb:hover {
                background-color: var(--json-line-number);
            }

            /* Accessibility */
            .tree-node:focus-within .node-content {
                outline: 2px solid var(--json-button);
                outline-offset: -2px;
            }

            /* Animation for expand/collapse */
            .node-children {
                transition: all 0.2s ease-out;
                overflow: hidden;
            }

            .node-children.collapsed {
                max-height: 0;
                opacity: 0;
                margin: 0;
                padding: 0;
            }

            .node-children.expanded {
                max-height: none;
                opacity: 1;
            }

            .node-actions {
                opacity: 0;
                transition: opacity 0.2s;
                margin-left: 8px;
            }
            .node-content:hover .node-actions {
                opacity: 1;
            }
            .copy-path-btn, .copy-value-btn {
                background: none;
                border: none;
                cursor: pointer;
                padding: 2px 4px;
                margin: 0 2px;
                border-radius: 2px;
                font-size: 10px;
            }
            .copy-path-btn:hover, .copy-value-btn:hover {
                background-color: var(--json-hover);
            }
        `;
    }

    /**
     * Get JavaScript for JSON tree viewer
     */
    private getJsonTreeViewerScript(): string {
        return `
            const vscode = acquireVsCodeApi();
            
            // Global state
            let jsonData = null;
            let rawJsonContent = '';
            let currentView = 'tree';
            let searchResults = [];
            let currentSearchIndex = 0;
            let expandedNodes = new Set();
            let virtualScrollOffset = 0;
            let visibleNodes = [];
            let nodeHeight = 20;
            let containerHeight = 0;

            // Initialize when DOM is ready
            document.addEventListener('DOMContentLoaded', function() {
                initializeViewer();
                // Request data from VS Code
                vscode.postMessage({ command: 'ready' });
            });

            function initializeViewer() {
                setupEventListeners();
                setupKeyboardNavigation();
                setupVirtualScrolling();
                showLoadingState();
            }

            function setupEventListeners() {
                // Toolbar buttons
                document.getElementById('expandAllBtn').addEventListener('click', expandAll);
                document.getElementById('collapseAllBtn').addEventListener('click', collapseAll);
                document.getElementById('toggleViewBtn').addEventListener('click', toggleView);
                document.getElementById('copyJsonBtn').addEventListener('click', copyJson);

                // Search functionality
                const searchInput = document.getElementById('searchInput');
                searchInput.addEventListener('input', debounce(handleSearch, 300));
                searchInput.addEventListener('keydown', handleSearchKeydown);

                // Search options
                document.getElementById('caseSensitive').addEventListener('change', handleSearch);
                document.getElementById('searchKeys').addEventListener('change', handleSearch);
                document.getElementById('searchValues').addEventListener('change', handleSearch);

                // Tree interactions
                document.addEventListener('click', handleTreeClick);
                document.addEventListener('contextmenu', handleContextMenu);
            }

            function setupKeyboardNavigation() {
                document.addEventListener('keydown', function(e) {
                    if (e.target.tagName === 'INPUT') return;

                    switch (e.key) {
                        case 'ArrowLeft':
                            collapseSelectedNode();
                            e.preventDefault();
                            break;
                        case 'ArrowRight':
                            expandSelectedNode();
                            e.preventDefault();
                            break;
                        case 'ArrowUp':
                            navigateUp();
                            e.preventDefault();
                            break;
                        case 'ArrowDown':
                            navigateDown();
                            e.preventDefault();
                            break;
                        case 'Enter':
                            toggleSelectedNode();
                            e.preventDefault();
                            break;
                        case 'f':
                            if (e.ctrlKey || e.metaKey) {
                                document.getElementById('searchInput').focus();
                                e.preventDefault();
                            }
                            break;
                        case 'Escape':
                            clearSearch();
                            e.preventDefault();
                            break;
                    }
                });
            }

            function setupVirtualScrolling() {
                const treeContainer = document.getElementById('jsonTree');
                if (treeContainer) {
                    treeContainer.addEventListener('scroll', handleScroll);
                    
                    // Observe container size changes
                    const resizeObserver = new ResizeObserver(entries => {
                        for (let entry of entries) {
                            containerHeight = entry.contentRect.height;
                            updateVirtualScrolling();
                        }
                    });
                    resizeObserver.observe(treeContainer);
                }
            }

            function showLoadingState() {
                document.getElementById('loadingIndicator').classList.remove('hidden');
                document.getElementById('treeView').classList.add('hidden');
                document.getElementById('rawView').classList.add('hidden');
                document.getElementById('errorView').classList.add('hidden');
            }

            function hideLoadingState() {
                document.getElementById('loadingIndicator').classList.add('hidden');
                enableControls();
            }

            function enableControls() {
                const controls = ['expandAllBtn', 'collapseAllBtn', 'toggleViewBtn', 'copyJsonBtn', 'searchInput'];
                controls.forEach(id => {
                    const element = document.getElementById(id);
                    if (element) element.disabled = false;
                });
            }

            function setJsonData(data, rawJson) {
                jsonData = data;
                rawJsonContent = rawJson;
                
                hideLoadingState();
                
                // Initialize expanded state for root level
                expandedNodes.clear();
                expandedNodes.add('root');
                
                // Render the tree
                renderJsonTree();
                updateMetadata();
                
                // Show tree view
                document.getElementById('treeView').classList.remove('hidden');
                document.getElementById('rawJson').textContent = rawJson;
            }

            function renderJsonTree() {
                const treeContainer = document.getElementById('jsonTree');
                const lineNumbers = document.getElementById('lineNumbers');
                
                if (!jsonData) return;

                // Generate flat list of visible nodes for virtual scrolling
                visibleNodes = generateVisibleNodes(jsonData, 'root', '', 0);
                
                // Render visible portion
                updateVirtualScrolling();
                updateLineNumbers();
            }

            function generateVisibleNodes(value, nodeId, path, depth) {
                const nodes = [];
                const type = getValueType(value);
                const isExpandable = type === 'object' || type === 'array';
                const isExpanded = expandedNodes.has(nodeId);
                
                // Add current node
                nodes.push({
                    id: nodeId,
                    path: path,
                    depth: depth,
                    type: type,
                    value: value,
                    isExpandable: isExpandable,
                    isExpanded: isExpanded,
                    key: nodeId === 'root' ? null : path.split('.').pop() || path
                });

                // Add children if expanded
                if (isExpandable && isExpanded && value !== null) {
                    if (type === 'array') {
                        value.forEach((item, index) => {
                            const childId = \`\${nodeId}[\${index}]\`;
                            const childPath = path ? \`\${path}[\${index}]\` : \`[\${index}]\`;
                            nodes.push(...generateVisibleNodes(item, childId, childPath, depth + 1));
                        });
                    } else {
                        Object.entries(value).forEach(([key, val]) => {
                            const childId = \`\${nodeId}.\${key}\`;
                            const childPath = path ? \`\${path}.\${key}\` : key;
                            nodes.push(...generateVisibleNodes(val, childId, childPath, depth + 1));
                        });
                    }
                }

                return nodes;
            }

            function updateVirtualScrolling() {
                const treeContainer = document.getElementById('jsonTree');
                if (!treeContainer || !visibleNodes.length) return;

                const scrollTop = treeContainer.scrollTop;
                const containerHeight = treeContainer.clientHeight;
                
                const startIndex = Math.floor(scrollTop / nodeHeight);
                const endIndex = Math.min(startIndex + Math.ceil(containerHeight / nodeHeight) + 5, visibleNodes.length);
                
                const visibleSlice = visibleNodes.slice(startIndex, endIndex);
                
                // Create HTML for visible nodes
                let html = '';
                visibleSlice.forEach((node, index) => {
                    const actualIndex = startIndex + index;
                    html += generateNodeHtml(node, actualIndex);
                });
                
                // Set container height and content
                treeContainer.style.height = \`\${visibleNodes.length * nodeHeight}px\`;
                treeContainer.innerHTML = \`
                    <div style="height: \${startIndex * nodeHeight}px;"></div>
                    \${html}
                    <div style="height: \${(visibleNodes.length - endIndex) * nodeHeight}px;"></div>
                \`;
            }

            function generateNodeHtml(node, index) {
                const indent = node.depth * 20;
                const hasChildren = node.isExpandable && node.value !== null && 
                    (Array.isArray(node.value) ? node.value.length > 0 : Object.keys(node.value).length > 0);
                
                let html = \`<div class="tree-node" data-node-id="\${node.id}" data-index="\${index}" style="padding-left: \${indent}px;">\`;
                html += \`<div class="node-content" tabindex="0">\`;
                
                // Expand/collapse icon
                if (hasChildren) {
                    const iconClass = node.isExpanded ? '' : 'collapsed';
                    html += \`<span class="expand-icon \${iconClass}" data-node-id="\${node.id}">▼</span>\`;
                } else {
                    html += \`<span class="expand-icon" style="visibility: hidden;">▼</span>\`;
                }
                
                // Node content based on type
                if (node.key !== null) {
                    html += \`<span class="node-key">"\${escapeHtml(node.key)}"</span>\`;
                    html += \`<span class="node-colon">:</span>\`;
                }
                
                if (node.type === 'object') {
                    html += \`<span class="node-bracket">{</span>\`;
                    if (!node.isExpanded && hasChildren) {
                        const count = Object.keys(node.value).length;
                        html += \`<span class="node-info">\${count} \${count === 1 ? 'property' : 'properties'}</span>\`;
                    }
                    if (!node.isExpanded) {
                        html += \`<span class="node-bracket">}</span>\`;
                    }
                } else if (node.type === 'array') {
                    html += \`<span class="node-bracket">[</span>\`;
                    if (!node.isExpanded && hasChildren) {
                        const count = node.value.length;
                        html += \`<span class="node-info">\${count} \${count === 1 ? 'item' : 'items'}</span>\`;
                    }
                    if (!node.isExpanded) {
                        html += \`<span class="node-bracket">]</span>\`;
                    }
                } else {
                    html += \`<span class="node-value \${node.type}">\${formatValue(node.value, node.type)}</span>\`;
                }
                
                // Path tooltip and copy buttons
                html += \`<span class="node-actions">\`;
                html += \`<button class="copy-path-btn" data-path="\${node.path}" title="Copy path">📋</button>\`;
                if (node.type !== 'object' && node.type !== 'array') {
                    html += \`<button class="copy-value-btn" data-value="\${escapeHtml(JSON.stringify(node.value))}" title="Copy value">📄</button>\`;
                }
                html += \`</span>\`;
                
                html += \`</div>\`;
                html += \`</div>\`;
                
                return html;
            }

            function formatValue(value, type) {
                switch (type) {
                    case 'string':
                        return \`"\${escapeHtml(value)}"\`;
                    case 'number':
                        return String(value);
                    case 'boolean':
                        return String(value);
                    case 'null':
                        return 'null';
                    default:
                        return escapeHtml(JSON.stringify(value));
                }
            }

            function getValueType(value) {
                if (value === null) return 'null';
                if (Array.isArray(value)) return 'array';
                return typeof value;
            }

            function handleTreeClick(e) {
                const expandIcon = e.target.closest('.expand-icon');
                const copyPathBtn = e.target.closest('.copy-path-btn');
                const copyValueBtn = e.target.closest('.copy-value-btn');
                
                if (expandIcon) {
                    const nodeId = expandIcon.dataset.nodeId;
                    toggleNodeExpansion(nodeId);
                } else if (copyPathBtn) {
                    const path = copyPathBtn.dataset.path;
                    copyToClipboard(path, 'Path copied to clipboard');
                    vscode.postMessage({ command: 'copyPath', path: path });
                } else if (copyValueBtn) {
                    const value = copyValueBtn.dataset.value;
                    copyToClipboard(value, 'Value copied to clipboard');
                    vscode.postMessage({ command: 'copyValue', value: value });
                }
            }

            function toggleNodeExpansion(nodeId) {
                if (expandedNodes.has(nodeId)) {
                    expandedNodes.delete(nodeId);
                } else {
                    expandedNodes.add(nodeId);
                }
                
                renderJsonTree();
                
                vscode.postMessage({
                    command: 'toggleNode',
                    nodeId: nodeId,
                    isExpanded: expandedNodes.has(nodeId)
                });
            }

            function expandAll() {
                expandedNodes.clear();
                addAllExpandableNodes(jsonData, 'root');
                renderJsonTree();
                vscode.postMessage({ command: 'expandAll' });
            }

            function collapseAll() {
                expandedNodes.clear();
                expandedNodes.add('root'); // Keep root expanded
                renderJsonTree();
                vscode.postMessage({ command: 'collapseAll' });
            }

            function addAllExpandableNodes(value, nodeId) {
                const type = getValueType(value);
                if (type === 'object' || type === 'array') {
                    expandedNodes.add(nodeId);
                    
                    if (type === 'array') {
                        value.forEach((item, index) => {
                            addAllExpandableNodes(item, \`\${nodeId}[\${index}]\`);
                        });
                    } else {
                        Object.entries(value).forEach(([key, val]) => {
                            addAllExpandableNodes(val, \`\${nodeId}.\${key}\`);
                        });
                    }
                }
            }

            function toggleView() {
                const treeView = document.getElementById('treeView');
                const rawView = document.getElementById('rawView');
                const toggleBtn = document.getElementById('toggleViewBtn');
                
                if (currentView === 'tree') {
                    treeView.classList.add('hidden');
                    rawView.classList.remove('hidden');
                    toggleBtn.innerHTML = '<span class="icon">🌳</span><span>Tree View</span>';
                    currentView = 'raw';
                } else {
                    treeView.classList.remove('hidden');
                    rawView.classList.add('hidden');
                    toggleBtn.innerHTML = '<span class="icon">⚏</span><span>Raw JSON</span>';
                    currentView = 'tree';
                }
                
                vscode.postMessage({ command: 'toggleView' });
            }

            function copyJson() {
                copyToClipboard(rawJsonContent, 'JSON copied to clipboard');
                vscode.postMessage({ command: 'exportJson' });
            }

            function handleSearch() {
                const query = document.getElementById('searchInput').value.trim();
                const caseSensitive = document.getElementById('caseSensitive').checked;
                const searchKeys = document.getElementById('searchKeys').checked;
                const searchValues = document.getElementById('searchValues').checked;

                clearSearchHighlights();

                if (!query) {
                    searchResults = [];
                    return;
                }

                const options = { caseSensitive, searchKeys, searchValues };
                searchResults = performSearch(query, options);
                highlightSearchResults();
                
                if (searchResults.length > 0) {
                    currentSearchIndex = 0;
                    scrollToSearchResult(0);
                }

                vscode.postMessage({
                    command: 'searchTree',
                    query: query,
                    options: options
                });
            }

            function performSearch(query, options) {
                const results = [];
                const searchTerm = options.caseSensitive ? query : query.toLowerCase();
                
                searchInValue(jsonData, 'root', '', searchTerm, options, results);
                return results;
            }

            function searchInValue(value, nodeId, path, searchTerm, options, results) {
                const type = getValueType(value);
                
                // Check if current node matches
                let matches = false;
                
                if (options.searchValues) {
                    const valueStr = options.caseSensitive ? JSON.stringify(value) : JSON.stringify(value).toLowerCase();
                    if (valueStr.includes(searchTerm)) {
                        matches = true;
                    }
                }
                
                if (options.searchKeys && path) {
                    const key = path.split('.').pop() || path;
                    const keyStr = options.caseSensitive ? key : key.toLowerCase();
                    if (keyStr.includes(searchTerm)) {
                        matches = true;
                    }
                }
                
                if (matches) {
                    results.push({ nodeId, path, type, value });
                    // Ensure this node is visible by expanding parents
                    expandPathToNode(nodeId);
                }
                
                // Recursively search children
                if (type === 'object') {
                    Object.entries(value).forEach(([key, val]) => {
                        const childId = \`\${nodeId}.\${key}\`;
                        const childPath = path ? \`\${path}.\${key}\` : key;
                        searchInValue(val, childId, childPath, searchTerm, options, results);
                    });
                } else if (type === 'array') {
                    value.forEach((item, index) => {
                        const childId = \`\${nodeId}[\${index}]\`;
                        const childPath = path ? \`\${path}[\${index}]\` : \`[\${index}]\`;
                        searchInValue(item, childId, childPath, searchTerm, options, results);
                    });
                }
            }

            function expandPathToNode(nodeId) {
                const parts = nodeId.split(/[.\\[\\]]+/).filter(Boolean);
                let currentPath = 'root';
                expandedNodes.add(currentPath);
                
                for (let i = 1; i < parts.length; i++) {
                    if (parts[i].match(/^\\d+$/)) {
                        currentPath += \`[\${parts[i]}]\`;
                    } else {
                        currentPath += \`.\${parts[i]}\`;
                    }
                    expandedNodes.add(currentPath);
                }
            }

            function highlightSearchResults() {
                // Re-render tree to show expanded nodes
                renderJsonTree();
                
                // Add highlighting (simplified for virtual scrolling)
                setTimeout(() => {
                    const query = document.getElementById('searchInput').value;
                    const elements = document.querySelectorAll('.node-key, .node-value');
                    elements.forEach(element => {
                        highlightTextInElement(element, query);
                    });
                }, 100);
            }

            function highlightTextInElement(element, searchTerm) {
                if (!searchTerm) return;
                
                const caseSensitive = document.getElementById('caseSensitive').checked;
                const text = element.textContent;
                const regex = new RegExp(\`(\${escapeRegExp(searchTerm)})\`, caseSensitive ? 'g' : 'gi');
                
                if (regex.test(text)) {
                    const highlightedText = text.replace(regex, '<span class="highlight">$1</span>');
                    element.innerHTML = highlightedText;
                }
            }

            function clearSearchHighlights() {
                const highlights = document.querySelectorAll('.highlight');
                highlights.forEach(highlight => {
                    const parent = highlight.parentNode;
                    parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
                    parent.normalize();
                });
            }

            function scrollToSearchResult(index) {
                if (index >= 0 && index < searchResults.length) {
                    const result = searchResults[index];
                    // Find the node in the DOM and scroll to it
                    const nodeElement = document.querySelector(\`[data-node-id="\${result.nodeId}"]\`);
                    if (nodeElement) {
                        nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        nodeElement.classList.add('selected');
                        
                        // Remove selection after a delay
                        setTimeout(() => {
                            nodeElement.classList.remove('selected');
                        }, 2000);
                    }
                }
            }

            function handleSearchKeydown(e) {
                if (e.key === 'Enter') {
                    if (searchResults.length > 0) {
                        if (e.shiftKey) {
                            currentSearchIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
                        } else {
                            currentSearchIndex = (currentSearchIndex + 1) % searchResults.length;
                        }
                        scrollToSearchResult(currentSearchIndex);
                    }
                    e.preventDefault();
                } else if (e.key === 'Escape') {
                    clearSearch();
                }
            }

            function clearSearch() {
                document.getElementById('searchInput').value = '';
                clearSearchHighlights();
                searchResults = [];
                currentSearchIndex = 0;
            }

            function updateLineNumbers() {
                const lineNumbers = document.getElementById('lineNumbers');
                let html = '';
                for (let i = 1; i <= visibleNodes.length; i++) {
                    html += \`<div>\${i}</div>\`;
                }
                lineNumbers.innerHTML = html;
            }

            function updateMetadata() {
                if (!jsonData) return;
                
                const metadata = calculateMetadata(jsonData);
                
                document.getElementById('objectCount').textContent = metadata.objectCount;
                document.getElementById('arrayCount').textContent = metadata.arrayCount;
                document.getElementById('totalNodes').textContent = metadata.totalNodes;
                document.getElementById('maxDepth').textContent = metadata.maxDepth;
                document.getElementById('jsonSize').textContent = formatBytes(rawJsonContent.length);
            }

            function calculateMetadata(value, depth = 0) {
                let objectCount = 0;
                let arrayCount = 0;
                let totalNodes = 1;
                let maxDepth = depth;
                
                const type = getValueType(value);
                
                if (type === 'object') {
                    objectCount = 1;
                    Object.values(value).forEach(val => {
                        const childMeta = calculateMetadata(val, depth + 1);
                        objectCount += childMeta.objectCount;
                        arrayCount += childMeta.arrayCount;
                        totalNodes += childMeta.totalNodes;
                        maxDepth = Math.max(maxDepth, childMeta.maxDepth);
                    });
                } else if (type === 'array') {
                    arrayCount = 1;
                    value.forEach(val => {
                        const childMeta = calculateMetadata(val, depth + 1);
                        objectCount += childMeta.objectCount;
                        arrayCount += childMeta.arrayCount;
                        totalNodes += childMeta.totalNodes;
                        maxDepth = Math.max(maxDepth, childMeta.maxDepth);
                    });
                }
                
                return { objectCount, arrayCount, totalNodes, maxDepth };
            }

            function formatBytes(bytes) {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            }

            function copyToClipboard(text, message) {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(text).then(() => {
                        showToast(message);
                    }).catch(() => {
                        fallbackCopyToClipboard(text, message);
                    });
                } else {
                    fallbackCopyToClipboard(text, message);
                }
            }

            function fallbackCopyToClipboard(text, message) {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                try {
                    document.execCommand('copy');
                    showToast(message);
                } catch (err) {
                    showToast('Failed to copy to clipboard');
                }
                
                document.body.removeChild(textArea);
            }

            function showToast(message) {
                const toast = document.createElement('div');
                toast.textContent = message;
                toast.style.cssText = \`
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: var(--vscode-notifications-background, #2d2d30);
                    color: var(--vscode-notifications-foreground, #cccccc);
                    padding: 12px 16px;
                    border-radius: 4px;
                    border: 1px solid var(--vscode-notifications-border, #454545);
                    z-index: 10000;
                    font-size: 13px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    animation: slideIn 0.3s ease-out;
                \`;
                
                document.body.appendChild(toast);
                
                setTimeout(() => {
                    toast.style.animation = 'slideOut 0.3s ease-in';
                    setTimeout(() => {
                        if (toast.parentNode) {
                            toast.parentNode.removeChild(toast);
                        }
                    }, 300);
                }, 3000);
            }

            function handleScroll() {
                updateVirtualScrolling();
            }

            function handleContextMenu(e) {
                e.preventDefault();
                // Could implement context menu here
            }

            function escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }


            function escapeRegExp(string) {
                return string;
            }
            function debounce(func, wait) {
                let timeout;
                return function executedFunction(...args) {
                    const later = () => {
                        clearTimeout(timeout);
                        func(...args);
                    };
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                };
            }

            // Navigation functions for keyboard support
            function navigateUp() {
                // Implementation for keyboard navigation
            }

            function navigateDown() {
                // Implementation for keyboard navigation  
            }

            function collapseSelectedNode() {
                // Implementation for keyboard navigation
            }

            function expandSelectedNode() {
                // Implementation for keyboard navigation
            }

            function toggleSelectedNode() {
                // Implementation for keyboard navigation
            }

            // Handle messages from VS Code
            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case 'setData':
                        setJsonData(message.data, message.rawJson);
                        break;
                    case 'error':
                        showError(message.error);
                        break;
                }
            });

            function showError(error) {
                hideLoadingState();
                document.getElementById('errorView').classList.remove('hidden');
                document.getElementById('errorMessage').textContent = error.message || 'Unknown error';
                document.getElementById('errorSuggestion').textContent = error.suggestion || 'Please check your JSON syntax';
            }

            // Add CSS animations
            const style = document.createElement('style');
            style.textContent = \`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            \`;
            document.head.appendChild(style);
        `;
    }

    /**
     * Handle node toggle action
     */
    private handleNodeToggle(panel: vscode.WebviewPanel, nodeId: string, isExpanded: boolean): void {
        this.outputChannel.appendLine(`JSON tree: Toggle node ${nodeId} - ${isExpanded ? 'expanded' : 'collapsed'}`);
    }

    /**
     * Handle tree search
     */
    private handleTreeSearch(panel: vscode.WebviewPanel, query: string, options: any): void {
        // Search is handled client-side for better performance
        // This method can be used for logging or additional server-side processing
        this.outputChannel.appendLine(`JSON tree search: "${query}" with options: ${JSON.stringify(options)}`);
    }

    /**
     * Handle expand all action
     */
    private handleExpandAll(panel: vscode.WebviewPanel): void {
        this.outputChannel.appendLine('JSON tree: Expand all nodes');
    }

    /**
     * Handle collapse all action
     */
    private handleCollapseAll(panel: vscode.WebviewPanel): void {
        this.outputChannel.appendLine('JSON tree: Collapse all nodes');
    }

    /**
     * Handle copy path action
     */
    private handleCopyPath(path: string): void {
        vscode.env.clipboard.writeText(path);
        vscode.window.showInformationMessage(`Path copied: ${path}`);
    }

    /**
     * Handle copy value action
     */
    private handleCopyValue(value: string): void {
        vscode.env.clipboard.writeText(value);
        vscode.window.showInformationMessage('Value copied to clipboard');
    }

    /**
     * Handle toggle view action
     */
    private handleToggleView(panel: vscode.WebviewPanel, rawJson: string): void {
        // View toggle is handled client-side
        this.outputChannel.appendLine('JSON tree: Toggle view mode');
    }

    /**
     * Handle export JSON action
     */
    private handleExportJson(jsonContent: string): void {
        vscode.env.clipboard.writeText(jsonContent);
        vscode.window.showInformationMessage('JSON copied to clipboard');
    }

    /**
     * Generate error view HTML for invalid JSON
     */
    private generateErrorViewHtml(content: string, error: any): string {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorDetails = this.parseJsonError(errorMessage);
        
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JSON Validation Error</title>
    <style>
        ${this.getErrorViewStyles()}
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-header">
            <h2>❌ JSON Validation Error</h2>
            <p>The content could not be parsed as valid JSON.</p>
        </div>
        
        <div class="error-details">
            <h3>Error Details</h3>
            <div class="error-message">${this.escapeHtml(errorMessage)}</div>
            ${errorDetails.line ? `<div class="error-location">Line: ${errorDetails.line}, Column: ${errorDetails.column}</div>` : ''}
        </div>
        
        <div class="error-suggestions">
            <h3>Common Issues & Solutions</h3>
            <ul>
                <li><strong>Trailing commas:</strong> Remove commas after the last item in objects or arrays</li>
                <li><strong>Single quotes:</strong> Use double quotes for strings</li>
                <li><strong>Unquoted keys:</strong> Wrap object keys in double quotes</li>
                <li><strong>Python syntax:</strong> Convert True/False/None to true/false/null</li>
                <li><strong>Comments:</strong> Remove // or /* */ comments</li>
            </ul>
        </div>
        
        <div class="error-actions">
            <button onclick="tryFixJson()" class="action-btn primary">Try Auto-Fix</button>
            <button onclick="showRawContent()" class="action-btn secondary">Show Raw Content</button>
        </div>
        
        <div class="raw-content hidden" id="rawContent">
            <h3>Raw Content</h3>
            <pre class="raw-text">${this.escapeHtml(content)}</pre>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function tryFixJson() {
            vscode.postMessage({
                command: 'fixJson',
                content: ${JSON.stringify(content)}
            });
        }
        
        function showRawContent() {
            const rawContent = document.getElementById('rawContent');
            rawContent.classList.toggle('hidden');
        }
    </script>
</body>
</html>`;
    }

    /**
     * Get error view styles
     */
    private getErrorViewStyles(): string {
        return `
            body {
                margin: 0;
                padding: 20px;
                font-family: var(--vscode-font-family);
                background-color: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
                line-height: 1.6;
            }

            .error-container {
                max-width: 800px;
                margin: 0 auto;
            }

            .error-header {
                text-align: center;
                margin-bottom: 30px;
                padding: 20px;
                background-color: var(--vscode-inputValidation-errorBackground);
                border: 1px solid var(--vscode-inputValidation-errorBorder);
                border-radius: 8px;
            }

            .error-header h2 {
                margin: 0 0 10px 0;
                color: var(--vscode-errorForeground);
            }

            .error-details, .error-suggestions {
                margin-bottom: 20px;
                padding: 16px;
                background-color: var(--vscode-editor-inactiveSelectionBackground);
                border-radius: 6px;
                border: 1px solid var(--vscode-panel-border);
            }

            .error-details h3, .error-suggestions h3 {
                margin-top: 0;
                color: var(--vscode-foreground);
            }

            .error-message {
                font-family: monospace;
                background-color: var(--vscode-textCodeBlock-background);
                padding: 8px;
                border-radius: 4px;
                color: var(--vscode-errorForeground);
                margin-bottom: 8px;
            }

            .error-location {
                font-size: 14px;
                color: var(--vscode-descriptionForeground);
            }

            .error-suggestions ul {
                margin: 0;
                padding-left: 20px;
            }

            .error-suggestions li {
                margin-bottom: 8px;
            }

            .error-actions {
                text-align: center;
                margin: 20px 0;
            }

            .action-btn {
                padding: 10px 20px;
                margin: 0 8px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.2s ease;
            }

            .action-btn.primary {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
            }

            .action-btn.primary:hover {
                background-color: var(--vscode-button-hoverBackground);
            }

            .action-btn.secondary {
                background-color: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
                border: 1px solid var(--vscode-button-border);
            }

            .action-btn.secondary:hover {
                background-color: var(--vscode-button-secondaryHoverBackground);
            }

            .raw-content {
                margin-top: 20px;
                padding: 16px;
                background-color: var(--vscode-editor-inactiveSelectionBackground);
                border-radius: 6px;
                border: 1px solid var(--vscode-panel-border);
            }

            .raw-content.hidden {
                display: none;
            }

            .raw-text {
                background-color: var(--vscode-textCodeBlock-background);
                padding: 12px;
                border-radius: 4px;
                font-family: var(--vscode-editor-fontFamily, monospace);
                font-size: var(--vscode-editor-fontSize, 14px);
                line-height: 1.4;
                overflow-x: auto;
                white-space: pre-wrap;
                word-wrap: break-word;
            }
        `;
    }

    /**
     * Parse JSON error to extract line and column information
     */
    private parseJsonError(errorMessage: string): { line?: number; column?: number } {
        const lineMatch = errorMessage.match(/line (\d+)/i);
        const columnMatch = errorMessage.match(/column (\d+)/i);
        const positionMatch = errorMessage.match(/position (\d+)/i);
        
        return {
            line: lineMatch ? parseInt(lineMatch[1]) : undefined,
            column: columnMatch ? parseInt(columnMatch[1]) : (positionMatch ? parseInt(positionMatch[1]) : undefined)
        };
    }

    /**
     * Escape HTML characters
     */
    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Format bytes to human readable string
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) {return '0 Bytes';}
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Cleanup and dispose of resources
     */
    public dispose(): void {
        this.outputChannel.dispose();
    }
}