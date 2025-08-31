import * as vscode from 'vscode';
import { ErrorHandler } from '../core/error-handler';
import { SuggestionPerformanceOptimizer } from './suggestion-performance-optimizer';

/**
 * Interface for suggestion rules
 */
export interface SuggestionRule {
    id: string;
    name: string;
    type: 'complexity' | 'documentation' | 'parameters' | 'length' | 'performance' | 'patterns';
    priority: number;
    condition: (data: FunctionAnalysisData) => boolean;
    generate: (data: FunctionAnalysisData) => CodeLensSuggestion;
    enabled: boolean;
}

/**
 * Interface for function analysis data
 */
export interface FunctionAnalysisData {
    name: string;
    complexity: number;
    lineCount: number;
    parameterCount: number;
    hasDocstring: boolean;
    returnType?: string;
    parameters: Parameter[];
    decorators: string[];
    isAsync: boolean;
    isMethod: boolean;
    className?: string;
    codePatterns: CodePattern[];
    performance: PerformanceMetrics;
}

/**
 * Interface for function parameters
 */
export interface Parameter {
    name: string;
    type?: string;
    hasDefault: boolean;
    isVarArgs: boolean;
    isKwArgs: boolean;
}

/**
 * Interface for code patterns detected in functions
 */
export interface CodePattern {
    type: 'loop' | 'nested_loop' | 'recursion' | 'exception_handling' | 'database_query' | 'file_io' | 'network_call';
    count: number;
    severity: 'low' | 'medium' | 'high';
    description: string;
}

/**
 * Interface for performance metrics
 */
export interface PerformanceMetrics {
    nestedLoops: number;
    recursiveCallsDetected: boolean;
    databaseOperations: number;
    fileOperations: number;
    networkOperations: number;
    memoryIntensiveOperations: number;
}

/**
 * Interface for code lens suggestions
 */
export interface CodeLensSuggestion {
    id: string;
    type: 'complexity' | 'documentation' | 'parameters' | 'length' | 'performance' | 'patterns';
    message: string;
    severity: 'info' | 'warning' | 'error';
    priority: number;
    actionable: boolean;
    quickFix?: string;
    detailedGuidance?: string;
    modernAlternative?: string;
    codeExample?: string;
}

/**
 * Interface for suggestion engine configuration
 */
export interface SuggestionEngineConfig {
    enabled: boolean;
    maxSuggestionsPerFunction: number;
    enabledRuleTypes: {
        complexity: boolean;
        documentation: boolean;
        parameters: boolean;
        length: boolean;
        performance: boolean;
        patterns: boolean;
    };
    thresholds: {
        complexity: { low: number; medium: number; high: number };
        length: { short: number; medium: number; long: number };
        parameters: { few: number; many: number; tooMany: number };
    };
    cacheEnabled: boolean;
    throttleMs: number;
}

/**
 * Intelligent Code Lens Suggestion Engine
 * Provides comprehensive code analysis and actionable suggestions
 */
export class CodeLensSuggestionEngine {
    private static instance: CodeLensSuggestionEngine;
    private errorHandler: ErrorHandler;
    private config: SuggestionEngineConfig;
    private rules: Map<string, SuggestionRule> = new Map();
    private suggestionCache: Map<string, CodeLensSuggestion[]> = new Map();
    private throttleTimers: Map<string, NodeJS.Timeout> = new Map();

    private performanceOptimizer: SuggestionPerformanceOptimizer;

    private constructor(errorHandler: ErrorHandler) {
        this.errorHandler = errorHandler;
        this.config = this.getDefaultConfig();
        this.performanceOptimizer = SuggestionPerformanceOptimizer.getInstance(errorHandler);
        this.initializeRules();
    }

    public static getInstance(errorHandler?: ErrorHandler): CodeLensSuggestionEngine {
        if (!CodeLensSuggestionEngine.instance) {
            if (!errorHandler) {
                throw new Error('ErrorHandler required for first initialization');
            }
            CodeLensSuggestionEngine.instance = new CodeLensSuggestionEngine(errorHandler);
        }
        return CodeLensSuggestionEngine.instance;
    }

    /**
     * Get default configuration
     */
    private getDefaultConfig(): SuggestionEngineConfig {
        const config = vscode.workspace.getConfiguration('doracodelens.suggestions');
        
        return {
            enabled: config.get('enabled', true),
            maxSuggestionsPerFunction: config.get('maxSuggestionsPerFunction', 3),
            enabledRuleTypes: {
                complexity: config.get('enabledRuleTypes.complexity', true),
                documentation: config.get('enabledRuleTypes.documentation', true),
                parameters: config.get('enabledRuleTypes.parameters', true),
                length: config.get('enabledRuleTypes.length', true),
                performance: config.get('enabledRuleTypes.performance', true),
                patterns: config.get('enabledRuleTypes.patterns', true)
            },
            thresholds: {
                complexity: {
                    low: config.get('thresholds.complexity.low', 5),
                    medium: config.get('thresholds.complexity.medium', 10),
                    high: config.get('thresholds.complexity.high', 15)
                },
                length: {
                    short: config.get('thresholds.length.short', 20),
                    medium: config.get('thresholds.length.medium', 50),
                    long: config.get('thresholds.length.long', 100)
                },
                parameters: {
                    few: config.get('thresholds.parameters.few', 3),
                    many: config.get('thresholds.parameters.many', 5),
                    tooMany: config.get('thresholds.parameters.tooMany', 7)
                }
            },
            cacheEnabled: config.get('cacheEnabled', true),
            throttleMs: config.get('throttleMs', 500)
        };
    }

    /**
     * Initialize suggestion rules
     */
    private initializeRules(): void {
        // Complexity rules
        this.addRule({
            id: 'high-complexity',
            name: 'High Complexity Warning',
            type: 'complexity',
            priority: 1,
            enabled: true,
            condition: (data) => data.complexity > this.config.thresholds.complexity.high,
            generate: (data) => ({
                id: 'high-complexity',
                type: 'complexity',
                message: `High complexity (${data.complexity}) - consider refactoring`,
                severity: 'error',
                priority: 1,
                actionable: true,
                quickFix: 'Extract methods',
                detailedGuidance: 'Break this function into smaller, more focused functions. Each function should have a single responsibility.',
                codeExample: `# Instead of one large function:\ndef process_data(data):\n    # 50+ lines of code\n    pass\n\n# Break into smaller functions:\ndef validate_data(data): pass\ndef transform_data(data): pass\ndef save_data(data): pass`
            })
        });

        this.addRule({
            id: 'medium-complexity',
            name: 'Medium Complexity Warning',
            type: 'complexity',
            priority: 2,
            enabled: true,
            condition: (data) => data.complexity > this.config.thresholds.complexity.medium && data.complexity <= this.config.thresholds.complexity.high,
            generate: (data) => ({
                id: 'medium-complexity',
                type: 'complexity',
                message: `Moderate complexity (${data.complexity}) - monitor for growth`,
                severity: 'warning',
                priority: 2,
                actionable: true,
                quickFix: 'Review logic',
                detailedGuidance: 'Consider if this function is doing too many things. Look for opportunities to extract helper functions.'
            })
        });

        // Documentation rules
        this.addRule({
            id: 'missing-docstring',
            name: 'Missing Documentation',
            type: 'documentation',
            priority: 3,
            enabled: true,
            condition: (data) => !data.hasDocstring && (data.complexity > 3 || data.parameterCount > 2),
            generate: (data) => ({
                id: 'missing-docstring',
                type: 'documentation',
                message: 'Add docstring for better maintainability',
                severity: 'info',
                priority: 3,
                actionable: true,
                quickFix: 'Add docstring',
                detailedGuidance: 'Document the function\'s purpose, parameters, return value, and any side effects.',
                codeExample: `def ${data.name}(${data.parameters.map(p => p.name).join(', ')}):\n    """\n    Brief description of what this function does.\n    \n    Args:\n        ${data.parameters.map(p => `${p.name}: Description of ${p.name}`).join('\n        ')}\n    \n    Returns:\n        Description of return value\n    """`
            })
        });

        // Parameter rules
        this.addRule({
            id: 'too-many-parameters',
            name: 'Too Many Parameters',
            type: 'parameters',
            priority: 2,
            enabled: true,
            condition: (data) => data.parameterCount >= this.config.thresholds.parameters.tooMany,
            generate: (data) => ({
                id: 'too-many-parameters',
                type: 'parameters',
                message: `Too many parameters (${data.parameterCount}) - consider refactoring`,
                severity: 'warning',
                priority: 2,
                actionable: true,
                quickFix: 'Use dataclass or config object',
                detailedGuidance: 'Consider grouping related parameters into a configuration object or dataclass.',
                modernAlternative: 'Use dataclasses, TypedDict, or Pydantic models',
                codeExample: `from dataclasses import dataclass\n\n@dataclass\nclass ${data.name.charAt(0).toUpperCase() + data.name.slice(1)}Config:\n    ${data.parameters.slice(0, 3).map(p => `${p.name}: ${p.type || 'Any'}`).join('\n    ')}\n\ndef ${data.name}(config: ${data.name.charAt(0).toUpperCase() + data.name.slice(1)}Config):`
            })
        });

        this.addRule({
            id: 'many-parameters',
            name: 'Many Parameters',
            type: 'parameters',
            priority: 3,
            enabled: true,
            condition: (data) => data.parameterCount >= this.config.thresholds.parameters.many && data.parameterCount < this.config.thresholds.parameters.tooMany,
            generate: (data) => ({
                id: 'many-parameters',
                type: 'parameters',
                message: `Many parameters (${data.parameterCount}) - consider simplifying`,
                severity: 'info',
                priority: 3,
                actionable: true,
                quickFix: 'Review parameter necessity',
                detailedGuidance: 'Review if all parameters are necessary. Consider using default values or optional parameters.'
            })
        });

        // Length rules
        this.addRule({
            id: 'very-long-function',
            name: 'Very Long Function',
            type: 'length',
            priority: 1,
            enabled: true,
            condition: (data) => data.lineCount > this.config.thresholds.length.long,
            generate: (data) => ({
                id: 'very-long-function',
                type: 'length',
                message: `Very long function (${data.lineCount} lines) - split for readability`,
                severity: 'error',
                priority: 1,
                actionable: true,
                quickFix: 'Split function',
                detailedGuidance: 'Long functions are hard to understand and maintain. Break this into smaller, focused functions.',
                modernAlternative: 'Use composition and single responsibility principle'
            })
        });

        this.addRule({
            id: 'long-function',
            name: 'Long Function',
            type: 'length',
            priority: 2,
            enabled: true,
            condition: (data) => data.lineCount > this.config.thresholds.length.medium && data.lineCount <= this.config.thresholds.length.long,
            generate: (data) => ({
                id: 'long-function',
                type: 'length',
                message: `Long function (${data.lineCount} lines) - consider splitting`,
                severity: 'warning',
                priority: 2,
                actionable: true,
                quickFix: 'Review structure',
                detailedGuidance: 'Consider if this function can be broken into logical sub-functions.'
            })
        });

        // Performance rules
        this.addRule({
            id: 'nested-loops-performance',
            name: 'Nested Loops Performance',
            type: 'performance',
            priority: 2,
            enabled: true,
            condition: (data) => data.performance.nestedLoops > 1,
            generate: (data) => ({
                id: 'nested-loops-performance',
                type: 'performance',
                message: `Nested loops detected (${data.performance.nestedLoops}) - review performance`,
                severity: 'warning',
                priority: 2,
                actionable: true,
                quickFix: 'Optimize loops',
                detailedGuidance: 'Nested loops can impact performance. Consider using list comprehensions, vectorized operations, or algorithmic improvements.',
                modernAlternative: 'Use pandas, numpy, or itertools for better performance'
            })
        });

        this.addRule({
            id: 'database-operations',
            name: 'Multiple Database Operations',
            type: 'performance',
            priority: 2,
            enabled: true,
            condition: (data) => data.performance.databaseOperations > 2,
            generate: (data) => ({
                id: 'database-operations',
                type: 'performance',
                message: `Multiple DB operations (${data.performance.databaseOperations}) - consider batching`,
                severity: 'warning',
                priority: 2,
                actionable: true,
                quickFix: 'Batch operations',
                detailedGuidance: 'Multiple database operations in a single function can cause N+1 query problems. Consider batching or using bulk operations.',
                modernAlternative: 'Use ORM bulk operations or database transactions'
            })
        });

        // Pattern rules
        this.addRule({
            id: 'exception-handling-pattern',
            name: 'Exception Handling Pattern',
            type: 'patterns',
            priority: 3,
            enabled: true,
            condition: (data) => data.codePatterns.some(p => p.type === 'exception_handling' && p.count > 3),
            generate: (data) => ({
                id: 'exception-handling-pattern',
                type: 'patterns',
                message: 'Complex exception handling - consider simplifying',
                severity: 'info',
                priority: 3,
                actionable: true,
                quickFix: 'Refactor error handling',
                detailedGuidance: 'Complex exception handling can make code hard to follow. Consider using a consistent error handling strategy.',
                modernAlternative: 'Use context managers or decorator patterns for error handling'
            })
        });

        this.addRule({
            id: 'async-sync-mixing',
            name: 'Async/Sync Pattern',
            type: 'patterns',
            priority: 2,
            enabled: true,
            condition: (data) => data.isAsync && data.codePatterns.some(p => p.type === 'network_call' || p.type === 'database_query'),
            generate: (data) => ({
                id: 'async-sync-mixing',
                type: 'patterns',
                message: 'Async function with blocking operations - review await usage',
                severity: 'warning',
                priority: 2,
                actionable: true,
                quickFix: 'Use async/await properly',
                detailedGuidance: 'Ensure all I/O operations in async functions use await to prevent blocking.',
                modernAlternative: 'Use asyncio, aiohttp, or async database drivers'
            })
        });
    }

    /**
     * Add a suggestion rule
     */
    public addRule(rule: SuggestionRule): void {
        this.rules.set(rule.id, rule);
        this.errorHandler.logError(
            `Suggestion rule added: ${rule.id}`,
            { name: rule.name, type: rule.type },
            'CodeLensSuggestionEngine'
        );
    }

    /**
     * Remove a suggestion rule
     */
    public removeRule(ruleId: string): void {
        this.rules.delete(ruleId);
        this.errorHandler.logError(
            `Suggestion rule removed: ${ruleId}`,
            null,
            'CodeLensSuggestionEngine'
        );
    }

    /**
     * Generate suggestions for function analysis data with performance optimization
     */
    public async generateSuggestions(data: FunctionAnalysisData, document?: vscode.TextDocument): Promise<CodeLensSuggestion[]> {
        try {
            const functionSignature = this.generateFunctionSignature(data);
            
            // Check performance optimizer cache first
            if (document && this.performanceOptimizer.getConfig().enableCaching) {
                const cachedSuggestions = this.performanceOptimizer.getCachedSuggestions(
                    data.name,
                    document,
                    functionSignature
                );
                
                if (cachedSuggestions) {
                    return cachedSuggestions;
                }
            }

            // Use performance optimizer for throttling
            const throttleKey = `${data.name}_${data.complexity}_${data.lineCount}`;
            const suggestions = await this.performanceOptimizer.throttleSuggestionGeneration(
                throttleKey,
                () => Promise.resolve(this.evaluateRules(data))
            );

            // Cache results using performance optimizer
            if (document && this.performanceOptimizer.getConfig().enableCaching) {
                this.performanceOptimizer.cacheSuggestions(
                    data.name,
                    document,
                    functionSignature,
                    suggestions
                );
            }

            return suggestions;

        } catch (error) {
            this.errorHandler.logError(
                'Error generating suggestions',
                error,
                'CodeLensSuggestionEngine'
            );
            return [];
        }
    }

    /**
     * Generate function signature for caching
     */
    private generateFunctionSignature(data: FunctionAnalysisData): string {
        const params = data.parameters.map(p => `${p.name}:${p.type || 'Any'}`).join(',');
        return `${data.name}(${params}):${data.returnType || 'Any'}`;
    }

    /**
     * Evaluate all rules against function data
     */
    private evaluateRules(data: FunctionAnalysisData): CodeLensSuggestion[] {
        const suggestions: CodeLensSuggestion[] = [];

        this.rules.forEach((rule) => {
            if (!rule.enabled || !this.config.enabledRuleTypes[rule.type]) {
                return;
            }

            try {
                if (rule.condition(data)) {
                    const suggestion = rule.generate(data);
                    suggestions.push(suggestion);
                }
            } catch (error) {
                this.errorHandler.logError(
                    `Error evaluating rule ${rule.id}`,
                    error,
                    'CodeLensSuggestionEngine'
                );
            }
        });

        // Sort by priority and limit results
        const sortedSuggestions = suggestions
            .sort((a, b) => a.priority - b.priority)
            .slice(0, this.config.maxSuggestionsPerFunction);

        this.errorHandler.logError(
            `Generated ${sortedSuggestions.length} suggestions for ${data.name}`,
            { suggestions: sortedSuggestions.map(s => s.message) },
            'CodeLensSuggestionEngine'
        );

        return sortedSuggestions;
    }

    /**
     * Generate cache key for function data
     */
    private generateCacheKey(data: FunctionAnalysisData): string {
        return `${data.name}_${data.complexity}_${data.lineCount}_${data.parameterCount}_${data.hasDocstring}`;
    }

    /**
     * Clear suggestion cache
     */
    public clearCache(): void {
        this.suggestionCache.clear();
        this.performanceOptimizer.clearCache();
        this.errorHandler.logError(
            'Suggestion cache cleared',
            null,
            'CodeLensSuggestionEngine'
        );
    }

    /**
     * Get performance optimizer instance
     */
    public getPerformanceOptimizer(): SuggestionPerformanceOptimizer {
        return this.performanceOptimizer;
    }

    /**
     * Update configuration
     */
    public updateConfig(newConfig: Partial<SuggestionEngineConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.clearCache(); // Clear cache when config changes
        
        this.errorHandler.logError(
            'Suggestion engine configuration updated',
            newConfig,
            'CodeLensSuggestionEngine'
        );
    }

    /**
     * Get current configuration
     */
    public getConfig(): SuggestionEngineConfig {
        return { ...this.config };
    }

    /**
     * Get all available rules
     */
    public getRules(): SuggestionRule[] {
        return Array.from(this.rules.values());
    }

    /**
     * Enable/disable a specific rule
     */
    public toggleRule(ruleId: string, enabled: boolean): void {
        const rule = this.rules.get(ruleId);
        if (rule) {
            rule.enabled = enabled;
            this.clearCache(); // Clear cache when rules change
            
            this.errorHandler.logError(
                `Rule ${ruleId} ${enabled ? 'enabled' : 'disabled'}`,
                null,
                'CodeLensSuggestionEngine'
            );
        }
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        // Clear all timers
        this.throttleTimers.forEach((timer) => {
            clearTimeout(timer);
        });
        this.throttleTimers.clear();
        
        // Clear cache
        this.suggestionCache.clear();
        
        // Dispose performance optimizer
        this.performanceOptimizer.dispose();
        
        this.errorHandler.logError(
            'Code lens suggestion engine disposed',
            null,
            'CodeLensSuggestionEngine'
        );
    }
}