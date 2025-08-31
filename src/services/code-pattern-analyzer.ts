import * as vscode from 'vscode';
import { ErrorHandler } from '../core/error-handler';
import { CodePattern, PerformanceMetrics, FunctionAnalysisData, Parameter } from './code-lens-suggestion-engine';

/**
 * Interface for pattern detection result
 */
export interface PatternDetectionResult {
    patterns: CodePattern[];
    performance: PerformanceMetrics;
    hasDocstring: boolean;
    parameters: Parameter[];
    decorators: string[];
    isAsync: boolean;
}

/**
 * Code Pattern Analyzer
 * Analyzes code patterns, performance indicators, and modern Python alternatives
 */
export class CodePatternAnalyzer {
    private static instance: CodePatternAnalyzer;
    private errorHandler: ErrorHandler;

    private constructor(errorHandler: ErrorHandler) {
        this.errorHandler = errorHandler;
    }

    public static getInstance(errorHandler?: ErrorHandler): CodePatternAnalyzer {
        if (!CodePatternAnalyzer.instance) {
            if (!errorHandler) {
                throw new Error('ErrorHandler required for first initialization');
            }
            CodePatternAnalyzer.instance = new CodePatternAnalyzer(errorHandler);
        }
        return CodePatternAnalyzer.instance;
    }

    /**
     * Analyze function code for patterns and performance indicators
     */
    public analyzeFunction(
        functionName: string,
        document: vscode.TextDocument,
        startLine: number,
        endLine: number
    ): PatternDetectionResult {
        try {
            const functionText = this.extractFunctionText(document, startLine, endLine);
            const lines = functionText.split('\n');

            const patterns = this.detectPatterns(lines);
            const performance = this.analyzePerformance(lines);
            const hasDocstring = this.detectDocstring(lines);
            const parameters = this.extractParameters(lines[0]); // Function definition line
            const decorators = this.extractDecorators(lines);
            const isAsync = this.isAsyncFunction(lines[0]);

            this.errorHandler.logError(
                `Pattern analysis completed for ${functionName}`,
                { 
                    patternCount: patterns.length,
                    hasDocstring,
                    parameterCount: parameters.length,
                    isAsync
                },
                'CodePatternAnalyzer'
            );

            return {
                patterns,
                performance,
                hasDocstring,
                parameters,
                decorators,
                isAsync
            };

        } catch (error) {
            this.errorHandler.logError(
                `Error analyzing function ${functionName}`,
                error,
                'CodePatternAnalyzer'
            );

            // Return default values on error
            return {
                patterns: [],
                performance: {
                    nestedLoops: 0,
                    recursiveCallsDetected: false,
                    databaseOperations: 0,
                    fileOperations: 0,
                    networkOperations: 0,
                    memoryIntensiveOperations: 0
                },
                hasDocstring: false,
                parameters: [],
                decorators: [],
                isAsync: false
            };
        }
    }

    /**
     * Extract function text from document
     */
    private extractFunctionText(document: vscode.TextDocument, startLine: number, endLine: number): string {
        const lines: string[] = [];
        
        for (let i = startLine; i <= Math.min(endLine, document.lineCount - 1); i++) {
            lines.push(document.lineAt(i).text);
        }
        
        return lines.join('\n');
    }

    /**
     * Detect various code patterns
     */
    private detectPatterns(lines: string[]): CodePattern[] {
        const patterns: CodePattern[] = [];

        // Loop patterns
        const loopPattern = this.detectLoopPatterns(lines);
        if (loopPattern) patterns.push(loopPattern);

        // Nested loop patterns
        const nestedLoopPattern = this.detectNestedLoops(lines);
        if (nestedLoopPattern) patterns.push(nestedLoopPattern);

        // Recursion patterns
        const recursionPattern = this.detectRecursion(lines);
        if (recursionPattern) patterns.push(recursionPattern);

        // Exception handling patterns
        const exceptionPattern = this.detectExceptionHandling(lines);
        if (exceptionPattern) patterns.push(exceptionPattern);

        // Database query patterns
        const dbPattern = this.detectDatabaseQueries(lines);
        if (dbPattern) patterns.push(dbPattern);

        // File I/O patterns
        const filePattern = this.detectFileOperations(lines);
        if (filePattern) patterns.push(filePattern);

        // Network call patterns
        const networkPattern = this.detectNetworkCalls(lines);
        if (networkPattern) patterns.push(networkPattern);

        return patterns;
    }

    /**
     * Detect loop patterns
     */
    private detectLoopPatterns(lines: string[]): CodePattern | null {
        let loopCount = 0;
        const loopKeywords = ['for ', 'while '];

        lines.forEach(line => {
            const trimmed = line.trim();
            if (loopKeywords.some(keyword => trimmed.startsWith(keyword))) {
                loopCount++;
            }
        });

        if (loopCount === 0) return null;

        return {
            type: 'loop',
            count: loopCount,
            severity: loopCount > 3 ? 'high' : loopCount > 1 ? 'medium' : 'low',
            description: `${loopCount} loop(s) detected`
        };
    }

    /**
     * Detect nested loop patterns
     */
    private detectNestedLoops(lines: string[]): CodePattern | null {
        let nestedLoops = 0;
        let currentIndent = 0;
        let loopIndents: number[] = [];

        lines.forEach(line => {
            const indent = line.length - line.trimStart().length;
            const trimmed = line.trim();

            if (trimmed.startsWith('for ') || trimmed.startsWith('while ')) {
                // Check if this is nested within another loop
                if (loopIndents.some(loopIndent => indent > loopIndent)) {
                    nestedLoops++;
                }
                loopIndents.push(indent);
            }

            // Remove loop indents that are no longer active
            loopIndents = loopIndents.filter(loopIndent => indent >= loopIndent);
        });

        if (nestedLoops === 0) return null;

        return {
            type: 'nested_loop',
            count: nestedLoops,
            severity: nestedLoops > 2 ? 'high' : nestedLoops > 1 ? 'medium' : 'low',
            description: `${nestedLoops} nested loop(s) detected`
        };
    }

    /**
     * Detect recursion patterns
     */
    private detectRecursion(lines: string[]): CodePattern | null {
        // Extract function name from first line
        const firstLine = lines[0];
        const functionNameMatch = firstLine.match(/def\s+(\w+)\s*\(/);
        if (!functionNameMatch) return null;

        const functionName = functionNameMatch[1];
        let recursiveCalls = 0;

        lines.forEach(line => {
            const trimmed = line.trim();
            // Look for calls to the same function
            if (trimmed.includes(`${functionName}(`) && !trimmed.startsWith('def ')) {
                recursiveCalls++;
            }
        });

        if (recursiveCalls === 0) return null;

        return {
            type: 'recursion',
            count: recursiveCalls,
            severity: recursiveCalls > 3 ? 'high' : recursiveCalls > 1 ? 'medium' : 'low',
            description: `${recursiveCalls} recursive call(s) detected`
        };
    }

    /**
     * Detect exception handling patterns
     */
    private detectExceptionHandling(lines: string[]): CodePattern | null {
        let exceptionBlocks = 0;
        let inTryBlock = false;

        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('try:')) {
                exceptionBlocks++;
                inTryBlock = true;
            } else if (trimmed.startsWith('except ') || trimmed.startsWith('except:')) {
                if (inTryBlock) exceptionBlocks++;
            } else if (trimmed.startsWith('finally:')) {
                if (inTryBlock) exceptionBlocks++;
                inTryBlock = false;
            }
        });

        if (exceptionBlocks === 0) return null;

        return {
            type: 'exception_handling',
            count: exceptionBlocks,
            severity: exceptionBlocks > 5 ? 'high' : exceptionBlocks > 2 ? 'medium' : 'low',
            description: `${exceptionBlocks} exception handling block(s) detected`
        };
    }

    /**
     * Detect database query patterns
     */
    private detectDatabaseQueries(lines: string[]): CodePattern | null {
        let dbOperations = 0;
        const dbKeywords = [
            '.execute(', '.query(', '.filter(', '.get(', '.create(', '.update(', '.delete(',
            'SELECT ', 'INSERT ', 'UPDATE ', 'DELETE ', 'CREATE ', 'DROP ',
            'cursor.', 'connection.', '.commit(', '.rollback(',
            'session.', '.save(', '.merge(', '.bulk_'
        ];

        lines.forEach(line => {
            const upperLine = line.toUpperCase();
            dbKeywords.forEach(keyword => {
                if (upperLine.includes(keyword.toUpperCase())) {
                    dbOperations++;
                }
            });
        });

        if (dbOperations === 0) return null;

        return {
            type: 'database_query',
            count: dbOperations,
            severity: dbOperations > 5 ? 'high' : dbOperations > 2 ? 'medium' : 'low',
            description: `${dbOperations} database operation(s) detected`
        };
    }

    /**
     * Detect file I/O operations
     */
    private detectFileOperations(lines: string[]): CodePattern | null {
        let fileOps = 0;
        const fileKeywords = [
            'open(', 'file.', '.read(', '.write(', '.close(',
            'with open', 'os.path.', 'pathlib.', 'glob.',
            'json.load', 'json.dump', 'pickle.', 'csv.'
        ];

        lines.forEach(line => {
            fileKeywords.forEach(keyword => {
                if (line.includes(keyword)) {
                    fileOps++;
                }
            });
        });

        if (fileOps === 0) return null;

        return {
            type: 'file_io',
            count: fileOps,
            severity: fileOps > 5 ? 'high' : fileOps > 2 ? 'medium' : 'low',
            description: `${fileOps} file operation(s) detected`
        };
    }

    /**
     * Detect network call patterns
     */
    private detectNetworkCalls(lines: string[]): CodePattern | null {
        let networkOps = 0;
        const networkKeywords = [
            'requests.', 'urllib.', 'http.', 'socket.',
            'aiohttp.', 'httpx.', '.get(', '.post(', '.put(', '.delete(',
            'fetch(', 'axios.', 'websocket.'
        ];

        lines.forEach(line => {
            networkKeywords.forEach(keyword => {
                if (line.includes(keyword)) {
                    networkOps++;
                }
            });
        });

        if (networkOps === 0) return null;

        return {
            type: 'network_call',
            count: networkOps,
            severity: networkOps > 3 ? 'high' : networkOps > 1 ? 'medium' : 'low',
            description: `${networkOps} network operation(s) detected`
        };
    }

    /**
     * Analyze performance metrics
     */
    private analyzePerformance(lines: string[]): PerformanceMetrics {
        const nestedLoops = this.countNestedLoops(lines);
        const recursiveCallsDetected = this.hasRecursiveCalls(lines);
        const databaseOperations = this.countDatabaseOperations(lines);
        const fileOperations = this.countFileOperations(lines);
        const networkOperations = this.countNetworkOperations(lines);
        const memoryIntensiveOperations = this.countMemoryIntensiveOperations(lines);

        return {
            nestedLoops,
            recursiveCallsDetected,
            databaseOperations,
            fileOperations,
            networkOperations,
            memoryIntensiveOperations
        };
    }

    /**
     * Count nested loops for performance analysis
     */
    private countNestedLoops(lines: string[]): number {
        let maxNesting = 0;
        let currentNesting = 0;
        let loopIndents: number[] = [];

        lines.forEach(line => {
            const indent = line.length - line.trimStart().length;
            const trimmed = line.trim();

            if (trimmed.startsWith('for ') || trimmed.startsWith('while ')) {
                loopIndents.push(indent);
                currentNesting = loopIndents.length;
                maxNesting = Math.max(maxNesting, currentNesting);
            }

            // Remove loop indents that are no longer active
            loopIndents = loopIndents.filter(loopIndent => indent >= loopIndent);
        });

        return maxNesting;
    }

    /**
     * Check for recursive calls
     */
    private hasRecursiveCalls(lines: string[]): boolean {
        const firstLine = lines[0];
        const functionNameMatch = firstLine.match(/def\s+(\w+)\s*\(/);
        if (!functionNameMatch) return false;

        const functionName = functionNameMatch[1];
        return lines.some(line => {
            const trimmed = line.trim();
            return trimmed.includes(`${functionName}(`) && !trimmed.startsWith('def ');
        });
    }

    /**
     * Count database operations
     */
    private countDatabaseOperations(lines: string[]): number {
        let count = 0;
        const dbKeywords = [
            '.execute(', '.query(', '.filter(', '.get(', '.create(', '.update(', '.delete(',
            'cursor.', 'session.', '.save(', '.merge('
        ];

        lines.forEach(line => {
            dbKeywords.forEach(keyword => {
                if (line.includes(keyword)) count++;
            });
        });

        return count;
    }

    /**
     * Count file operations
     */
    private countFileOperations(lines: string[]): number {
        let count = 0;
        const fileKeywords = ['open(', '.read(', '.write(', 'json.load', 'json.dump'];

        lines.forEach(line => {
            fileKeywords.forEach(keyword => {
                if (line.includes(keyword)) count++;
            });
        });

        return count;
    }

    /**
     * Count network operations
     */
    private countNetworkOperations(lines: string[]): number {
        let count = 0;
        const networkKeywords = ['requests.', '.get(', '.post(', 'aiohttp.', 'httpx.'];

        lines.forEach(line => {
            networkKeywords.forEach(keyword => {
                if (line.includes(keyword)) count++;
            });
        });

        return count;
    }

    /**
     * Count memory intensive operations
     */
    private countMemoryIntensiveOperations(lines: string[]): number {
        let count = 0;
        const memoryKeywords = [
            'list(', 'dict(', 'set(', '[x for x in',
            'pandas.', 'numpy.', '.copy()', 'deepcopy('
        ];

        lines.forEach(line => {
            memoryKeywords.forEach(keyword => {
                if (line.includes(keyword)) count++;
            });
        });

        return count;
    }

    /**
     * Detect docstring presence
     */
    private detectDocstring(lines: string[]): boolean {
        // Look for docstring in first few lines after function definition
        for (let i = 1; i < Math.min(lines.length, 5); i++) {
            const line = lines[i].trim();
            if (line.startsWith('"""') || line.startsWith("'''")) {
                return true;
            }
            // Skip empty lines and comments
            if (line && !line.startsWith('#')) {
                break;
            }
        }
        return false;
    }

    /**
     * Extract function parameters
     */
    private extractParameters(functionLine: string): Parameter[] {
        const parameters: Parameter[] = [];
        
        try {
            // Extract parameter list from function definition
            const paramMatch = functionLine.match(/\(([^)]*)\)/);
            if (!paramMatch || !paramMatch[1].trim()) {
                return parameters;
            }

            const paramString = paramMatch[1];
            const paramParts = paramString.split(',');

            paramParts.forEach(param => {
                const trimmed = param.trim();
                if (!trimmed || trimmed === 'self' || trimmed === 'cls') {
                    return;
                }

                const parameter: Parameter = {
                    name: '',
                    type: undefined,
                    hasDefault: false,
                    isVarArgs: false,
                    isKwArgs: false
                };

                // Check for *args and **kwargs
                if (trimmed.startsWith('**')) {
                    parameter.isKwArgs = true;
                    parameter.name = trimmed.substring(2).split(':')[0].split('=')[0].trim();
                } else if (trimmed.startsWith('*')) {
                    parameter.isVarArgs = true;
                    parameter.name = trimmed.substring(1).split(':')[0].split('=')[0].trim();
                } else {
                    // Regular parameter
                    const parts = trimmed.split('=');
                    parameter.hasDefault = parts.length > 1;
                    
                    const nameTypePart = parts[0].trim();
                    const typeParts = nameTypePart.split(':');
                    
                    parameter.name = typeParts[0].trim();
                    if (typeParts.length > 1) {
                        parameter.type = typeParts[1].trim();
                    }
                }

                if (parameter.name) {
                    parameters.push(parameter);
                }
            });

        } catch (error) {
            this.errorHandler.logError(
                'Error extracting parameters',
                error,
                'CodePatternAnalyzer'
            );
        }

        return parameters;
    }

    /**
     * Extract decorators
     */
    private extractDecorators(lines: string[]): string[] {
        const decorators: string[] = [];
        
        // Look for decorators before function definition
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('@')) {
                decorators.push(line.substring(1));
            } else if (line.startsWith('def ')) {
                break;
            }
        }

        return decorators;
    }

    /**
     * Check if function is async
     */
    private isAsyncFunction(functionLine: string): boolean {
        return functionLine.trim().startsWith('async def ');
    }

    /**
     * Create function analysis data from document
     */
    public createFunctionAnalysisData(
        functionName: string,
        document: vscode.TextDocument,
        startLine: number,
        endLine: number,
        complexity: number,
        isMethod: boolean = false,
        className?: string
    ): FunctionAnalysisData {
        const patternResult = this.analyzeFunction(functionName, document, startLine, endLine);
        const lineCount = endLine - startLine + 1;

        return {
            name: functionName,
            complexity,
            lineCount,
            parameterCount: patternResult.parameters.length,
            hasDocstring: patternResult.hasDocstring,
            parameters: patternResult.parameters,
            decorators: patternResult.decorators,
            isAsync: patternResult.isAsync,
            isMethod,
            className,
            codePatterns: patternResult.patterns,
            performance: patternResult.performance
        };
    }
}