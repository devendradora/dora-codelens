import * as vscode from 'vscode';

/**
 * Interface for JSON validation results
 */
export interface JsonValidationResult {
    isValid: boolean;
    errors: JsonError[];
    formattedContent?: string;
    warnings?: JsonWarning[];
}

/**
 * Interface for JSON errors
 */
export interface JsonError {
    message: string;
    line?: number;
    column?: number;
    type: 'syntax' | 'structure' | 'validation';
    severity: 'error' | 'warning';
    suggestion?: string;
}

/**
 * Interface for JSON warnings
 */
export interface JsonWarning {
    message: string;
    line?: number;
    column?: number;
    type: 'formatting' | 'best-practice' | 'performance';
    suggestion?: string;
}

/**
 * Interface for tree view data structures
 */
export interface TreeViewData {
    nodes: TreeNode[];
    expandedPaths: string[];
    searchableContent: string;
    metadata: TreeMetadata;
}

/**
 * Interface for tree nodes
 */
export interface TreeNode {
    id: string;
    label: string;
    value: any;
    type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
    path: string;
    children?: TreeNode[];
    isExpanded: boolean;
    depth: number;
    parentId?: string;
    hasChildren: boolean;
    icon?: string;
    tooltip?: string;
}

/**
 * Interface for tree metadata
 */
export interface TreeMetadata {
    totalNodes: number;
    maxDepth: number;
    objectCount: number;
    arrayCount: number;
    primitiveCount: number;
    nullCount: number;
    estimatedSize: number;
}

/**
 * JSON formatting options
 */
export interface JsonFormattingOptions {
    indent: number | string;
    sortKeys: boolean;
    removeComments: boolean;
    removeTrailingCommas: boolean;
    insertFinalNewline: boolean;
    maxLineLength?: number;
    preserveArrayFormatting?: boolean;
}

/**
 * JsonFormatter class for JSON beautification and validation
 */
export class JsonFormatter {
    private outputChannel: vscode.OutputChannel;
    private defaultOptions: JsonFormattingOptions;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
        this.defaultOptions = {
            indent: 2,
            sortKeys: false,
            removeComments: true,
            removeTrailingCommas: true,
            insertFinalNewline: true,
            maxLineLength: 120,
            preserveArrayFormatting: false
        };
    }

    /**
     * Format JSON content with beautification
     */
    public async formatJson(content: string, options?: Partial<JsonFormattingOptions>): Promise<string> {
        try {
            const formatOptions = { ...this.defaultOptions, ...options };
            
            // First, validate the JSON
            const validation = this.validateJson(content);
            if (!validation.isValid) {
                throw new Error(`Invalid JSON: ${validation.errors.map(e => e.message).join(', ')}`);
            }

            // Parse and format
            let cleanContent = content;
            
            // Remove comments if requested
            if (formatOptions.removeComments) {
                cleanContent = this.removeJsonComments(cleanContent);
            }

            // Remove trailing commas if requested
            if (formatOptions.removeTrailingCommas) {
                cleanContent = this.removeTrailingCommas(cleanContent);
            }

            // Parse the JSON
            const parsed = JSON.parse(cleanContent);

            // Sort keys if requested
            const processedData = formatOptions.sortKeys ? this.sortObjectKeys(parsed) : parsed;

            // Format with specified indentation
            let formatted = JSON.stringify(processedData, null, formatOptions.indent);

            // Apply line length constraints if specified
            if (formatOptions.maxLineLength && !formatOptions.preserveArrayFormatting) {
                formatted = this.applyLineLength(formatted, formatOptions.maxLineLength);
            }

            // Add final newline if requested
            if (formatOptions.insertFinalNewline && !formatted.endsWith('\n')) {
                formatted += '\n';
            }

            this.outputChannel.appendLine(`JSON formatted successfully (${content.length} -> ${formatted.length} characters)`);
            return formatted;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.outputChannel.appendLine(`JSON formatting failed: ${errorMessage}`);
            throw new Error(`Failed to format JSON: ${errorMessage}`);
        }
    }

    /**
     * Validate JSON content and provide detailed error reporting
     */
    public validateJson(content: string): JsonValidationResult {
        const errors: JsonError[] = [];
        const warnings: JsonWarning[] = [];
        let isValid = true;
        let formattedContent: string | undefined;

        try {
            // Basic syntax validation
            if (!content.trim()) {
                errors.push({
                    message: 'Empty JSON content',
                    type: 'validation',
                    severity: 'error',
                    suggestion: 'Provide valid JSON content'
                });
                isValid = false;
            } else {
                // Try to parse the JSON
                const parsed = JSON.parse(content);
                
                // If parsing succeeds, create formatted version
                formattedContent = JSON.stringify(parsed, null, 2);

                // Check for common issues and warnings
                this.checkJsonWarnings(content, parsed, warnings);
            }

        } catch (error) {
            isValid = false;
            
            if (error instanceof SyntaxError) {
                const syntaxError = this.parseSyntaxError(error.message, content);
                errors.push(syntaxError);
            } else {
                errors.push({
                    message: error instanceof Error ? error.message : 'Unknown parsing error',
                    type: 'validation',
                    severity: 'error',
                    suggestion: 'Check JSON syntax and structure'
                });
            }
        }

        return {
            isValid,
            errors,
            warnings,
            formattedContent
        };
    }

    /**
     * Parse syntax error and extract line/column information
     */
    private parseSyntaxError(errorMessage: string, content: string): JsonError {
        // Try to extract position information from error message
        const positionMatch = errorMessage.match(/at position (\d+)/);
        let line: number | undefined;
        let column: number | undefined;
        let suggestion = 'Check JSON syntax';

        if (positionMatch) {
            const position = parseInt(positionMatch[1]);
            const lineInfo = this.getLineColumnFromPosition(content, position);
            line = lineInfo.line;
            column = lineInfo.column;
        }

        // Provide specific suggestions based on error type
        if (errorMessage.includes('Unexpected token')) {
            suggestion = 'Check for missing quotes, commas, or brackets';
        } else if (errorMessage.includes('Unexpected end')) {
            suggestion = 'Check for missing closing brackets or braces';
        } else if (errorMessage.includes('Unexpected string')) {
            suggestion = 'Check for missing commas between properties';
        }

        return {
            message: errorMessage,
            line,
            column,
            type: 'syntax',
            severity: 'error',
            suggestion
        };
    }

    /**
     * Get line and column from character position
     */
    private getLineColumnFromPosition(content: string, position: number): { line: number; column: number } {
        const lines = content.substring(0, position).split('\n');
        return {
            line: lines.length,
            column: lines[lines.length - 1].length + 1
        };
    }

    /**
     * Check for JSON warnings and best practices
     */
    private checkJsonWarnings(content: string, parsed: any, warnings: JsonWarning[]): void {
        // Check for trailing commas
        if (content.includes(',}') || content.includes(',]')) {
            warnings.push({
                message: 'Trailing commas detected',
                type: 'formatting',
                suggestion: 'Remove trailing commas for better compatibility'
            });
        }

        // Check for comments (not standard JSON)
        if (content.includes('//') || content.includes('/*')) {
            warnings.push({
                message: 'Comments detected in JSON',
                type: 'best-practice',
                suggestion: 'Standard JSON does not support comments'
            });
        }

        // Check for very large objects
        const jsonString = JSON.stringify(parsed);
        if (jsonString.length > 1000000) { // 1MB
            warnings.push({
                message: 'Large JSON object detected',
                type: 'performance',
                suggestion: 'Consider breaking down large JSON objects for better performance'
            });
        }

        // Check for deeply nested structures
        const maxDepth = this.getMaxDepth(parsed);
        if (maxDepth > 10) {
            warnings.push({
                message: `Deeply nested structure detected (depth: ${maxDepth})`,
                type: 'best-practice',
                suggestion: 'Consider flattening deeply nested structures'
            });
        }
    }

    /**
     * Get maximum depth of nested object/array structure
     */
    private getMaxDepth(obj: any, currentDepth: number = 0): number {
        if (obj === null || typeof obj !== 'object') {
            return currentDepth;
        }

        let maxDepth = currentDepth;
        
        if (Array.isArray(obj)) {
            for (const item of obj) {
                maxDepth = Math.max(maxDepth, this.getMaxDepth(item, currentDepth + 1));
            }
        } else {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    maxDepth = Math.max(maxDepth, this.getMaxDepth(obj[key], currentDepth + 1));
                }
            }
        }

        return maxDepth;
    }

    /**
     * Remove JSON comments (non-standard but commonly used)
     */
    private removeJsonComments(content: string): string {
        // Remove single-line comments
        let result = content.replace(/\/\/.*$/gm, '');
        
        // Remove multi-line comments
        result = result.replace(/\/\*[\s\S]*?\*\//g, '');
        
        return result;
    }

    /**
     * Remove trailing commas
     */
    private removeTrailingCommas(content: string): string {
        // Remove trailing commas before closing braces and brackets
        return content
            .replace(/,(\s*[}\]])/g, '$1')
            .replace(/,(\s*$)/gm, '');
    }

    /**
     * Sort object keys recursively
     */
    private sortObjectKeys(obj: any): any {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.sortObjectKeys(item));
        }

        const sortedObj: any = {};
        const keys = Object.keys(obj).sort();
        
        for (const key of keys) {
            sortedObj[key] = this.sortObjectKeys(obj[key]);
        }

        return sortedObj;
    }

    /**
     * Apply line length constraints (basic implementation)
     */
    private applyLineLength(content: string, maxLength: number): string {
        // This is a simplified implementation
        // In a production environment, you might want a more sophisticated approach
        const lines = content.split('\n');
        const result: string[] = [];

        for (const line of lines) {
            if (line.length <= maxLength) {
                result.push(line);
            } else {
                // For now, just keep long lines as-is
                // A more sophisticated implementation would break them intelligently
                result.push(line);
            }
        }

        return result.join('\n');
    }

    /**
     * Get formatting statistics
     */
    public getFormattingStats(originalContent: string, formattedContent: string): {
        originalSize: number;
        formattedSize: number;
        compressionRatio: number;
        lineCount: number;
        charactersSaved: number;
    } {
        const originalSize = originalContent.length;
        const formattedSize = formattedContent.length;
        const lineCount = formattedContent.split('\n').length;
        const charactersSaved = originalSize - formattedSize;
        const compressionRatio = originalSize > 0 ? formattedSize / originalSize : 1;

        return {
            originalSize,
            formattedSize,
            compressionRatio,
            lineCount,
            charactersSaved
        };
    }
}
/**

 * JsonTreeViewProvider for expandable tree representations
 */
export class JsonTreeViewProvider {
    private outputChannel: vscode.OutputChannel;
    private searchIndex: Map<string, TreeNode[]> = new Map();

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
    }

    /**
     * Generate tree view data from JSON object
     */
    public generateTreeView(jsonObject: any, rootLabel: string = 'root'): TreeViewData {
        try {
            this.searchIndex.clear();
            
            const rootNode = this.createTreeNode(
                'root',
                rootLabel,
                jsonObject,
                '',
                0
            );

            const nodes = rootNode.children || [rootNode];
            const metadata = this.calculateMetadata(jsonObject);
            const searchableContent = this.generateSearchableContent(nodes);

            const treeViewData: TreeViewData = {
                nodes,
                expandedPaths: ['root'], // Root is expanded by default
                searchableContent,
                metadata
            };

            this.outputChannel.appendLine(`Tree view generated: ${metadata.totalNodes} nodes, max depth ${metadata.maxDepth}`);
            return treeViewData;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.outputChannel.appendLine(`Tree view generation failed: ${errorMessage}`);
            throw new Error(`Failed to generate tree view: ${errorMessage}`);
        }
    }

    /**
     * Create a tree node from JSON data
     */
    private createTreeNode(
        id: string,
        label: string,
        value: any,
        path: string,
        depth: number,
        parentId?: string
    ): TreeNode {
        const type = this.getValueType(value);
        const hasChildren = type === 'object' || type === 'array';
        
        const node: TreeNode = {
            id,
            label,
            value,
            type,
            path,
            depth,
            parentId,
            hasChildren,
            isExpanded: depth < 2, // Auto-expand first 2 levels
            icon: this.getIconForType(type),
            tooltip: this.generateTooltip(label, value, type)
        };

        // Generate children for objects and arrays
        if (hasChildren && value !== null) {
            node.children = this.generateChildren(value, id, path, depth + 1);
        }

        // Add to search index
        this.addToSearchIndex(node);

        return node;
    }

    /**
     * Generate children nodes for objects and arrays
     */
    private generateChildren(value: any, parentId: string, parentPath: string, depth: number): TreeNode[] {
        const children: TreeNode[] = [];

        if (Array.isArray(value)) {
            value.forEach((item, index) => {
                const childId = `${parentId}_${index}`;
                const childPath = `${parentPath}[${index}]`;
                const childLabel = `[${index}]`;
                
                children.push(this.createTreeNode(
                    childId,
                    childLabel,
                    item,
                    childPath,
                    depth,
                    parentId
                ));
            });
        } else if (typeof value === 'object' && value !== null) {
            Object.keys(value).forEach(key => {
                const childId = `${parentId}_${key}`;
                const childPath = parentPath ? `${parentPath}.${key}` : key;
                
                children.push(this.createTreeNode(
                    childId,
                    key,
                    value[key],
                    childPath,
                    depth,
                    parentId
                ));
            });
        }

        return children;
    }

    /**
     * Get the type of a value
     */
    private getValueType(value: any): TreeNode['type'] {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        if (typeof value === 'object') return 'object';
        if (typeof value === 'string') return 'string';
        if (typeof value === 'number') return 'number';
        if (typeof value === 'boolean') return 'boolean';
        return 'string'; // fallback
    }

    /**
     * Get icon for value type
     */
    private getIconForType(type: TreeNode['type']): string {
        const iconMap: Record<TreeNode['type'], string> = {
            'object': '$(symbol-object)',
            'array': '$(symbol-array)',
            'string': '$(symbol-string)',
            'number': '$(symbol-number)',
            'boolean': '$(symbol-boolean)',
            'null': '$(symbol-null)'
        };
        return iconMap[type] || '$(symbol-misc)';
    }

    /**
     * Generate tooltip for tree node
     */
    private generateTooltip(label: string, value: any, type: TreeNode['type']): string {
        let tooltip = `${label} (${type})`;
        
        switch (type) {
            case 'string':
                tooltip += `\nValue: "${value}"`;
                tooltip += `\nLength: ${value.length}`;
                break;
            case 'number':
                tooltip += `\nValue: ${value}`;
                break;
            case 'boolean':
                tooltip += `\nValue: ${value}`;
                break;
            case 'array':
                tooltip += `\nLength: ${value.length}`;
                break;
            case 'object':
                if (value !== null) {
                    const keys = Object.keys(value);
                    tooltip += `\nProperties: ${keys.length}`;
                    if (keys.length > 0 && keys.length <= 5) {
                        tooltip += `\nKeys: ${keys.join(', ')}`;
                    }
                }
                break;
            case 'null':
                tooltip += '\nValue: null';
                break;
        }

        return tooltip;
    }

    /**
     * Add node to search index
     */
    private addToSearchIndex(node: TreeNode): void {
        const searchTerms = [
            node.label.toLowerCase(),
            node.path.toLowerCase(),
            node.type,
            String(node.value).toLowerCase()
        ];

        searchTerms.forEach(term => {
            if (!this.searchIndex.has(term)) {
                this.searchIndex.set(term, []);
            }
            this.searchIndex.get(term)!.push(node);
        });
    }

    /**
     * Search within JSON tree view
     */
    public searchTreeView(treeData: TreeViewData, searchTerm: string): TreeNode[] {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return [];

        const results: TreeNode[] = [];
        const addedIds = new Set<string>();

        // Search in the search index
        for (const [indexTerm, nodes] of this.searchIndex.entries()) {
            if (indexTerm.includes(term)) {
                nodes.forEach(node => {
                    if (!addedIds.has(node.id)) {
                        results.push(node);
                        addedIds.add(node.id);
                    }
                });
            }
        }

        // Also search in searchable content for partial matches
        if (treeData.searchableContent.toLowerCase().includes(term)) {
            this.searchInNodes(treeData.nodes, term, results, addedIds);
        }

        this.outputChannel.appendLine(`Search for "${searchTerm}" found ${results.length} results`);
        return results;
    }

    /**
     * Recursively search in nodes
     */
    private searchInNodes(nodes: TreeNode[], term: string, results: TreeNode[], addedIds: Set<string>): void {
        nodes.forEach(node => {
            const nodeText = `${node.label} ${node.path} ${node.value}`.toLowerCase();
            if (nodeText.includes(term) && !addedIds.has(node.id)) {
                results.push(node);
                addedIds.add(node.id);
            }

            if (node.children) {
                this.searchInNodes(node.children, term, results, addedIds);
            }
        });
    }

    /**
     * Generate searchable content from nodes
     */
    private generateSearchableContent(nodes: TreeNode[]): string {
        const content: string[] = [];
        
        const processNode = (node: TreeNode) => {
            content.push(`${node.label}:${node.value}:${node.path}:${node.type}`);
            if (node.children) {
                node.children.forEach(processNode);
            }
        };

        nodes.forEach(processNode);
        return content.join('\n');
    }

    /**
     * Calculate metadata for tree view
     */
    private calculateMetadata(jsonObject: any): TreeMetadata {
        let totalNodes = 0;
        let maxDepth = 0;
        let objectCount = 0;
        let arrayCount = 0;
        let primitiveCount = 0;
        let nullCount = 0;

        const traverse = (obj: any, depth: number = 0) => {
            totalNodes++;
            maxDepth = Math.max(maxDepth, depth);

            if (obj === null) {
                nullCount++;
            } else if (Array.isArray(obj)) {
                arrayCount++;
                obj.forEach(item => traverse(item, depth + 1));
            } else if (typeof obj === 'object') {
                objectCount++;
                Object.values(obj).forEach(value => traverse(value, depth + 1));
            } else {
                primitiveCount++;
            }
        };

        traverse(jsonObject);

        const estimatedSize = JSON.stringify(jsonObject).length;

        return {
            totalNodes,
            maxDepth,
            objectCount,
            arrayCount,
            primitiveCount,
            nullCount,
            estimatedSize
        };
    }

    /**
     * Expand/collapse node in tree view
     */
    public toggleNodeExpansion(treeData: TreeViewData, nodeId: string): TreeViewData {
        const node = this.findNodeById(treeData.nodes, nodeId);
        if (node) {
            node.isExpanded = !node.isExpanded;
            
            // Update expanded paths
            if (node.isExpanded) {
                if (!treeData.expandedPaths.includes(node.path)) {
                    treeData.expandedPaths.push(node.path);
                }
            } else {
                const index = treeData.expandedPaths.indexOf(node.path);
                if (index > -1) {
                    treeData.expandedPaths.splice(index, 1);
                }
            }
        }

        return treeData;
    }

    /**
     * Find node by ID
     */
    private findNodeById(nodes: TreeNode[], nodeId: string): TreeNode | null {
        for (const node of nodes) {
            if (node.id === nodeId) {
                return node;
            }
            if (node.children) {
                const found = this.findNodeById(node.children, nodeId);
                if (found) return found;
            }
        }
        return null;
    }

    /**
     * Get node path as breadcrumb
     */
    public getNodeBreadcrumb(treeData: TreeViewData, nodeId: string): string[] {
        const node = this.findNodeById(treeData.nodes, nodeId);
        if (!node) return [];

        const breadcrumb: string[] = [];
        let currentNode: TreeNode | null = node;

        while (currentNode) {
            breadcrumb.unshift(currentNode.label);
            currentNode = currentNode.parentId ? 
                this.findNodeById(treeData.nodes, currentNode.parentId) : null;
        }

        return breadcrumb;
    }

    /**
     * Export tree view data to different formats
     */
    public exportTreeView(treeData: TreeViewData, format: 'json' | 'csv' | 'txt'): string {
        switch (format) {
            case 'json':
                return JSON.stringify(treeData, null, 2);
            
            case 'csv':
                return this.exportToCsv(treeData.nodes);
            
            case 'txt':
                return this.exportToText(treeData.nodes);
            
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Export to CSV format
     */
    private exportToCsv(nodes: TreeNode[]): string {
        const headers = ['Path', 'Label', 'Type', 'Value', 'Depth'];
        const rows: string[] = [headers.join(',')];

        const processNode = (node: TreeNode) => {
            const value = typeof node.value === 'string' ? 
                `"${node.value.replace(/"/g, '""')}"` : 
                String(node.value);
            
            rows.push([
                node.path,
                node.label,
                node.type,
                value,
                String(node.depth)
            ].join(','));

            if (node.children) {
                node.children.forEach(processNode);
            }
        };

        nodes.forEach(processNode);
        return rows.join('\n');
    }

    /**
     * Export to text format
     */
    private exportToText(nodes: TreeNode[]): string {
        const lines: string[] = [];

        const processNode = (node: TreeNode) => {
            const indent = '  '.repeat(node.depth);
            const icon = node.icon ? node.icon.replace(/\$\(([^)]+)\)/, '$1') : 'misc';
            lines.push(`${indent}${icon} ${node.label}: ${node.value} (${node.type})`);

            if (node.children && node.isExpanded) {
                node.children.forEach(processNode);
            }
        };

        nodes.forEach(processNode);
        return lines.join('\n');
    }
}/**

 * Main JsonUtilities class that orchestrates JSON formatting and tree view functionality
 */
export class JsonUtilities {
    private formatter: JsonFormatter;
    private treeViewProvider: JsonTreeViewProvider;
    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
        this.formatter = new JsonFormatter(outputChannel);
        this.treeViewProvider = new JsonTreeViewProvider(outputChannel);
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

            // Validate JSON first
            const validation = this.formatter.validateJson(content);
            if (!validation.isValid) {
                const errorMessages = validation.errors.map(e => e.message).join('\n');
                vscode.window.showErrorMessage(
                    `Invalid JSON:\n${errorMessages}`,
                    'Show Details'
                ).then(action => {
                    if (action === 'Show Details') {
                        this.showValidationErrors(validation.errors);
                    }
                });
                return;
            }

            // Show warnings if any
            if (validation.warnings && validation.warnings.length > 0) {
                const warningMessages = validation.warnings.map(w => w.message).join('\n');
                vscode.window.showWarningMessage(
                    `JSON formatting warnings:\n${warningMessages}`,
                    'Continue Anyway',
                    'Cancel'
                ).then(action => {
                    if (action !== 'Continue Anyway') {
                        return;
                    }
                });
            }

            // Get formatting options from VS Code settings
            const config = vscode.workspace.getConfiguration('doracodebird');
            const formatOptions: Partial<JsonFormattingOptions> = {
                indent: config.get<number>('jsonFormatting.indent', 2),
                sortKeys: config.get<boolean>('jsonFormatting.sortKeys', false),
                removeComments: config.get<boolean>('jsonFormatting.removeComments', true),
                removeTrailingCommas: config.get<boolean>('jsonFormatting.removeTrailingCommas', true),
                insertFinalNewline: config.get<boolean>('jsonFormatting.insertFinalNewline', true)
            };

            // Format the JSON
            const formatted = await this.formatter.formatJson(content, formatOptions);

            // Replace content in editor
            const range = selection.isEmpty ? 
                new vscode.Range(0, 0, document.lineCount, 0) : 
                selection;

            await editor.edit(editBuilder => {
                editBuilder.replace(range, formatted);
            });

            // Show success message with stats
            const stats = this.formatter.getFormattingStats(content, formatted);
            vscode.window.showInformationMessage(
                `JSON formatted successfully! ${stats.lineCount} lines, ${stats.charactersSaved > 0 ? 'saved' : 'added'} ${Math.abs(stats.charactersSaved)} characters`
            );

            this.outputChannel.appendLine(`JSON formatting completed for ${document.fileName}`);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.outputChannel.appendLine(`JSON formatting failed: ${errorMessage}`);
            vscode.window.showErrorMessage(`Failed to format JSON: ${errorMessage}`);
        }
    }

    /**
     * Show JSON tree view for the active editor or provided content
     */
    public async showJsonTreeView(content?: string): Promise<void> {
        try {
            let jsonContent = content;

            // If no content provided, get from active editor
            if (!jsonContent) {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showErrorMessage('No active editor found and no content provided');
                    return;
                }

                const selection = editor.selection;
                jsonContent = selection.isEmpty ? 
                    editor.document.getText() : 
                    editor.document.getText(selection);
            }

            if (!jsonContent.trim()) {
                vscode.window.showWarningMessage('No content to display in tree view');
                return;
            }

            // Validate JSON
            const validation = this.formatter.validateJson(jsonContent);
            if (!validation.isValid) {
                const errorMessages = validation.errors.map(e => e.message).join('\n');
                vscode.window.showErrorMessage(
                    `Invalid JSON for tree view:\n${errorMessages}`,
                    'Show Details'
                ).then(action => {
                    if (action === 'Show Details') {
                        this.showValidationErrors(validation.errors);
                    }
                });
                return;
            }

            // Parse JSON and generate tree view
            const jsonObject = JSON.parse(jsonContent);
            const treeData = this.treeViewProvider.generateTreeView(jsonObject, 'JSON Root');

            // Create and show webview
            await this.createTreeViewWebview(treeData, jsonContent);

            this.outputChannel.appendLine(`JSON tree view created with ${treeData.metadata.totalNodes} nodes`);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.outputChannel.appendLine(`JSON tree view failed: ${errorMessage}`);
            vscode.window.showErrorMessage(`Failed to create JSON tree view: ${errorMessage}`);
        }
    }

    /**
     * Validate JSON content and show results
     */
    public async validateJsonContent(content?: string): Promise<JsonValidationResult> {
        let jsonContent = content;

        if (!jsonContent) {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                throw new Error('No active editor found and no content provided');
            }

            const selection = editor.selection;
            jsonContent = selection.isEmpty ? 
                editor.document.getText() : 
                editor.document.getText(selection);
        }

        const validation = this.formatter.validateJson(jsonContent);

        // Show validation results
        if (validation.isValid) {
            vscode.window.showInformationMessage('JSON is valid!');
        } else {
            this.showValidationErrors(validation.errors);
        }

        if (validation.warnings && validation.warnings.length > 0) {
            this.showValidationWarnings(validation.warnings);
        }

        return validation;
    }

    /**
     * Export analysis data as formatted JSON
     */
    public exportJsonAnalysis(analysisData: any): string {
        try {
            return JSON.stringify(analysisData, null, 2);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.outputChannel.appendLine(`JSON export failed: ${errorMessage}`);
            throw new Error(`Failed to export JSON: ${errorMessage}`);
        }
    }

    /**
     * Show validation errors in a user-friendly way
     */
    private showValidationErrors(errors: JsonError[]): void {
        const errorDetails = errors.map(error => {
            let detail = `• ${error.message}`;
            if (error.line && error.column) {
                detail += ` (Line ${error.line}, Column ${error.column})`;
            }
            if (error.suggestion) {
                detail += `\n  Suggestion: ${error.suggestion}`;
            }
            return detail;
        }).join('\n\n');

        vscode.window.showErrorMessage(
            'JSON Validation Errors',
            { modal: true, detail: errorDetails },
            'OK'
        );
    }

    /**
     * Show validation warnings
     */
    private showValidationWarnings(warnings: JsonWarning[]): void {
        const warningDetails = warnings.map(warning => {
            let detail = `• ${warning.message}`;
            if (warning.line && warning.column) {
                detail += ` (Line ${warning.line}, Column ${warning.column})`;
            }
            if (warning.suggestion) {
                detail += `\n  Suggestion: ${warning.suggestion}`;
            }
            return detail;
        }).join('\n\n');

        vscode.window.showWarningMessage(
            'JSON Validation Warnings',
            { modal: true, detail: warningDetails },
            'OK'
        );
    }

    /**
     * Create and show tree view webview
     */
    private async createTreeViewWebview(treeData: TreeViewData, originalContent: string): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'jsonTreeView',
            'JSON Tree View',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.generateTreeViewHtml(treeData, originalContent);

        // Handle messages from webview
        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'search':
                        this.handleTreeViewSearch(panel, treeData, message.term);
                        break;
                    case 'toggle':
                        this.handleNodeToggle(panel, treeData, message.nodeId);
                        break;
                    case 'export':
                        this.handleTreeViewExport(treeData, message.format);
                        break;
                }
            },
            undefined,
            []
        );
    }

    /**
     * Handle tree view search
     */
    private handleTreeViewSearch(panel: vscode.WebviewPanel, treeData: TreeViewData, searchTerm: string): void {
        const results = this.treeViewProvider.searchTreeView(treeData, searchTerm);
        panel.webview.postMessage({
            command: 'searchResults',
            results: results.map(node => ({
                id: node.id,
                path: node.path,
                label: node.label,
                value: node.value
            }))
        });
    }

    /**
     * Handle node toggle
     */
    private handleNodeToggle(panel: vscode.WebviewPanel, treeData: TreeViewData, nodeId: string): void {
        const updatedTreeData = this.treeViewProvider.toggleNodeExpansion(treeData, nodeId);
        panel.webview.postMessage({
            command: 'updateTree',
            treeData: updatedTreeData
        });
    }

    /**
     * Handle tree view export
     */
    private handleTreeViewExport(treeData: TreeViewData, format: 'json' | 'csv' | 'txt'): void {
        try {
            const exported = this.treeViewProvider.exportTreeView(treeData, format);
            const fileName = `json-tree-view.${format}`;
            
            vscode.workspace.openTextDocument({
                content: exported,
                language: format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'plaintext'
            }).then(doc => {
                vscode.window.showTextDocument(doc);
            });

            this.outputChannel.appendLine(`Tree view exported to ${format.toUpperCase()} format`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to export tree view: ${errorMessage}`);
        }
    }

    /**
     * Generate HTML for tree view webview
     */
    private generateTreeViewHtml(treeData: TreeViewData, originalContent: string): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JSON Tree View</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .search-container {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        
        .search-input {
            padding: 5px 10px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 3px;
            min-width: 200px;
        }
        
        .export-buttons {
            display: flex;
            gap: 5px;
        }
        
        .btn {
            padding: 5px 10px;
            border: 1px solid var(--vscode-button-border);
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        }
        
        .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .metadata {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 20px;
            font-size: 12px;
        }
        
        .tree-container {
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
        }
        
        .tree-node {
            margin: 2px 0;
            cursor: pointer;
            padding: 2px 5px;
            border-radius: 3px;
        }
        
        .tree-node:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        
        .tree-node.expanded {
            background-color: var(--vscode-list-activeSelectionBackground);
        }
        
        .node-icon {
            display: inline-block;
            width: 16px;
            text-align: center;
            margin-right: 5px;
        }
        
        .node-label {
            font-weight: bold;
            color: var(--vscode-symbolIcon-objectForeground);
        }
        
        .node-value {
            color: var(--vscode-debugTokenExpression-value);
            margin-left: 10px;
        }
        
        .node-type {
            color: var(--vscode-debugTokenExpression-type);
            font-size: 11px;
            opacity: 0.8;
            margin-left: 5px;
        }
        
        .search-results {
            background-color: var(--vscode-editor-findMatchBackground);
            border: 1px solid var(--vscode-editor-findMatchBorder);
            border-radius: 3px;
            padding: 10px;
            margin-bottom: 20px;
            max-height: 200px;
            overflow-y: auto;
        }
        
        .search-result-item {
            padding: 5px;
            border-bottom: 1px solid var(--vscode-panel-border);
            cursor: pointer;
        }
        
        .search-result-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        
        .search-result-path {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>JSON Tree View</h2>
        <div class="search-container">
            <input type="text" class="search-input" placeholder="Search..." id="searchInput">
            <button class="btn" onclick="search()">Search</button>
            <button class="btn" onclick="clearSearch()">Clear</button>
        </div>
        <div class="export-buttons">
            <button class="btn" onclick="exportTree('json')">Export JSON</button>
            <button class="btn" onclick="exportTree('csv')">Export CSV</button>
            <button class="btn" onclick="exportTree('txt')">Export TXT</button>
        </div>
    </div>
    
    <div class="metadata">
        <strong>Metadata:</strong>
        Total Nodes: ${treeData.metadata.totalNodes} | 
        Max Depth: ${treeData.metadata.maxDepth} | 
        Objects: ${treeData.metadata.objectCount} | 
        Arrays: ${treeData.metadata.arrayCount} | 
        Primitives: ${treeData.metadata.primitiveCount} | 
        Size: ${(treeData.metadata.estimatedSize / 1024).toFixed(2)} KB
    </div>
    
    <div id="searchResults" class="search-results" style="display: none;"></div>
    
    <div class="tree-container" id="treeContainer">
        ${this.renderTreeNodes(treeData.nodes)}
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentTreeData = ${JSON.stringify(treeData)};
        
        function search() {
            const term = document.getElementById('searchInput').value;
            if (term.trim()) {
                vscode.postMessage({
                    command: 'search',
                    term: term
                });
            }
        }
        
        function clearSearch() {
            document.getElementById('searchInput').value = '';
            document.getElementById('searchResults').style.display = 'none';
        }
        
        function toggleNode(nodeId) {
            vscode.postMessage({
                command: 'toggle',
                nodeId: nodeId
            });
        }
        
        function exportTree(format) {
            vscode.postMessage({
                command: 'export',
                format: format
            });
        }
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'searchResults':
                    displaySearchResults(message.results);
                    break;
                case 'updateTree':
                    currentTreeData = message.treeData;
                    updateTreeDisplay();
                    break;
            }
        });
        
        function displaySearchResults(results) {
            const container = document.getElementById('searchResults');
            if (results.length === 0) {
                container.innerHTML = '<p>No results found</p>';
            } else {
                container.innerHTML = results.map(result => 
                    \`<div class="search-result-item" onclick="highlightNode('\${result.id}')">
                        <strong>\${result.label}</strong>: \${result.value}
                        <div class="search-result-path">\${result.path}</div>
                    </div>\`
                ).join('');
            }
            container.style.display = 'block';
        }
        
        function highlightNode(nodeId) {
            // Remove previous highlights
            document.querySelectorAll('.tree-node').forEach(node => {
                node.classList.remove('expanded');
            });
            
            // Highlight target node
            const targetNode = document.getElementById('node-' + nodeId);
            if (targetNode) {
                targetNode.classList.add('expanded');
                targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        
        function updateTreeDisplay() {
            document.getElementById('treeContainer').innerHTML = '${this.renderTreeNodes(treeData.nodes)}';
        }
        
        // Search on Enter key
        document.getElementById('searchInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                search();
            }
        });
    </script>
</body>
</html>`;
    }

    /**
     * Render tree nodes as HTML
     */
    private renderTreeNodes(nodes: TreeNode[], depth: number = 0): string {
        return nodes.map(node => {
            const indent = '  '.repeat(depth);
            const hasChildren = node.children && node.children.length > 0;
            const expandIcon = hasChildren ? (node.isExpanded ? '▼' : '▶') : '•';
            const childrenHtml = hasChildren && node.isExpanded ? 
                this.renderTreeNodes(node.children!, depth + 1) : '';
            
            return `
                <div class="tree-node" id="node-${node.id}" onclick="toggleNode('${node.id}')" title="${node.tooltip}">
                    ${indent}<span class="node-icon">${expandIcon}</span>
                    <span class="node-label">${node.label}</span>
                    <span class="node-value">${this.formatValueForDisplay(node.value)}</span>
                    <span class="node-type">(${node.type})</span>
                </div>
                ${childrenHtml}
            `;
        }).join('');
    }

    /**
     * Format value for display in tree view
     */
    private formatValueForDisplay(value: any): string {
        if (value === null) return 'null';
        if (typeof value === 'string') return `"${value.length > 50 ? value.substring(0, 50) + '...' : value}"`;
        if (typeof value === 'object') {
            if (Array.isArray(value)) return `[${value.length} items]`;
            return `{${Object.keys(value).length} properties}`;
        }
        return String(value);
    }
}