import * as vscode from 'vscode';

/**
 * Utility class for detecting JSON context in files and at cursor positions
 */
export class JsonContextDetector {
    /**
     * Check if the current document is a JSON file
     */
    public static isJsonFile(document: vscode.TextDocument): boolean {
        return document.languageId === 'json' || 
               document.fileName.toLowerCase().endsWith('.json');
    }

    /**
     * Check if there's valid JSON content at the cursor position
     */
    public static hasJsonAtCursor(document: vscode.TextDocument, position: vscode.Position): boolean {
        const jsonText = this.getJsonTextAtCursor(document, position);
        return jsonText !== null && this.isValidJson(jsonText);
    }

    /**
     * Get JSON text at cursor position (selected text or surrounding JSON)
     */
    public static getJsonTextAtCursor(document: vscode.TextDocument, position: vscode.Position): string | null {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document !== document) {
            return null;
        }

        // If there's a selection, use that
        if (!editor.selection.isEmpty) {
            const selectedText = document.getText(editor.selection);
            if (selectedText.trim()) {
                return selectedText;
            }
        }

        // Try to find JSON content around cursor
        return this.findJsonAroundPosition(document, position);
    }

    /**
     * Find JSON content around the given position
     */
    private static findJsonAroundPosition(document: vscode.TextDocument, position: vscode.Position): string | null {
        const line = document.lineAt(position.line);
        const lineText = line.text;
        const cursorChar = position.character;

        // Look for JSON patterns around cursor
        const patterns = [
            this.findJsonObject(document, position),
            this.findJsonArray(document, position),
            this.findJsonString(lineText, cursorChar)
        ];

        // Return the first valid JSON found
        for (const pattern of patterns) {
            if (pattern && this.isValidJson(pattern)) {
                return pattern;
            }
        }

        return null;
    }

    /**
     * Find JSON object starting from cursor position
     */
    private static findJsonObject(document: vscode.TextDocument, position: vscode.Position): string | null {
        const text = document.getText();
        const offset = document.offsetAt(position);
        
        // Look backwards for opening brace
        let start = offset;
        let braceCount = 0;
        let foundStart = false;

        for (let i = offset; i >= 0; i--) {
            const char = text[i];
            if (char === '}') {
                braceCount++;
            } else if (char === '{') {
                braceCount--;
                if (braceCount < 0) {
                    start = i;
                    foundStart = true;
                    break;
                }
            }
        }

        if (!foundStart) {
            return null;
        }

        // Look forwards for closing brace
        braceCount = 0;
        let end = offset;
        let foundEnd = false;

        for (let i = start; i < text.length; i++) {
            const char = text[i];
            if (char === '{') {
                braceCount++;
            } else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                    end = i + 1;
                    foundEnd = true;
                    break;
                }
            }
        }

        if (!foundEnd) {
            return null;
        }

        return text.substring(start, end);
    }

    /**
     * Find JSON array starting from cursor position
     */
    private static findJsonArray(document: vscode.TextDocument, position: vscode.Position): string | null {
        const text = document.getText();
        const offset = document.offsetAt(position);
        
        // Look backwards for opening bracket
        let start = offset;
        let bracketCount = 0;
        let foundStart = false;

        for (let i = offset; i >= 0; i--) {
            const char = text[i];
            if (char === ']') {
                bracketCount++;
            } else if (char === '[') {
                bracketCount--;
                if (bracketCount < 0) {
                    start = i;
                    foundStart = true;
                    break;
                }
            }
        }

        if (!foundStart) {
            return null;
        }

        // Look forwards for closing bracket
        bracketCount = 0;
        let end = offset;
        let foundEnd = false;

        for (let i = start; i < text.length; i++) {
            const char = text[i];
            if (char === '[') {
                bracketCount++;
            } else if (char === ']') {
                bracketCount--;
                if (bracketCount === 0) {
                    end = i + 1;
                    foundEnd = true;
                    break;
                }
            }
        }

        if (!foundEnd) {
            return null;
        }

        return text.substring(start, end);
    }

    /**
     * Find JSON string at cursor position
     */
    private static findJsonString(lineText: string, cursorChar: number): string | null {
        // Look for quoted strings that might be JSON
        const beforeCursor = lineText.substring(0, cursorChar);
        const afterCursor = lineText.substring(cursorChar);
        
        // Find the start of a quoted string
        let startQuote = -1;
        for (let i = beforeCursor.length - 1; i >= 0; i--) {
            if (beforeCursor[i] === '"' && (i === 0 || beforeCursor[i - 1] !== '\\')) {
                startQuote = i;
                break;
            }
        }

        if (startQuote === -1) {
            return null;
        }

        // Find the end of the quoted string
        let endQuote = -1;
        for (let i = 0; i < afterCursor.length; i++) {
            if (afterCursor[i] === '"' && (i === 0 || afterCursor[i - 1] !== '\\')) {
                endQuote = cursorChar + i;
                break;
            }
        }

        if (endQuote === -1) {
            return null;
        }

        const quotedContent = lineText.substring(startQuote + 1, endQuote);
        
        // Check if the quoted content looks like JSON
        if (quotedContent.trim().startsWith('{') || quotedContent.trim().startsWith('[')) {
            return quotedContent;
        }

        return null;
    }

    /**
     * Check if a string is valid JSON
     */
    private static isValidJson(text: string): boolean {
        if (!text || !text.trim()) {
            return false;
        }

        try {
            JSON.parse(text);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if the current context supports JSON operations
     */
    public static isJsonContext(document?: vscode.TextDocument, position?: vscode.Position): boolean {
        if (!document) {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return false;
            }
            document = editor.document;
            position = editor.selection.active;
        }

        // Check if it's a JSON file
        if (this.isJsonFile(document)) {
            return true;
        }

        // Check if there's JSON at cursor position
        if (position && this.hasJsonAtCursor(document, position)) {
            return true;
        }

        // Check if there's Python dict-like content that can be converted to JSON
        if (this.hasPythonDictContent(document, position)) {
            return true;
        }

        return false;
    }

    /**
     * Check if there's Python dict-like content that can be converted to JSON
     */
    private static hasPythonDictContent(document: vscode.TextDocument, position?: vscode.Position): boolean {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document !== document) {
            return false;
        }

        // Get content to check (selection or entire document)
        const content = editor.selection.isEmpty ? 
            document.getText() : 
            document.getText(editor.selection);

        return this.isPythonDictLike(content);
    }

    /**
     * Check if content looks like Python dictionary syntax
     */
    private static isPythonDictLike(content: string): boolean {
        const trimmed = content.trim();
        
        // Check for Python-specific patterns
        const pythonPatterns = [
            /\bTrue\b/,           // Python True
            /\bFalse\b/,          // Python False
            /\bNone\b/,           // Python None
            /'[^']*'/,            // Single-quoted strings
            /,\s*[}\]]/,          // Trailing commas
        ];
        
        // Must look like a dict/object structure
        const hasObjectStructure = (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
                                   (trimmed.startsWith('[') && trimmed.endsWith(']'));
        
        if (!hasObjectStructure) {
            return false;
        }
        
        // Check if any Python patterns are present
        return pythonPatterns.some(pattern => pattern.test(trimmed));
    }
}