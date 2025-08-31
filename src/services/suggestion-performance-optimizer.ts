import * as vscode from 'vscode';
import { ErrorHandler } from '../core/error-handler';
import { CodeLensSuggestion } from './code-lens-suggestion-engine';

/**
 * Interface for performance optimization configuration
 */
export interface PerformanceConfig {
    enableCaching: boolean;
    cacheMaxSize: number;
    cacheTTLMs: number;
    enableThrottling: boolean;
    throttleDelayMs: number;
    maxFileSizeKB: number;
    maxFunctionsPerFile: number;
    enableLazyLoading: boolean;
    batchSize: number;
}

/**
 * Interface for cached suggestion data
 */
export interface CachedSuggestionData {
    suggestions: CodeLensSuggestion[];
    timestamp: number;
    fileHash: string;
    functionSignature: string;
}

/**
 * Interface for performance metrics
 */
export interface PerformanceMetrics {
    cacheHits: number;
    cacheMisses: number;
    throttledRequests: number;
    averageProcessingTime: number;
    totalRequests: number;
    largeFileSkips: number;
}

/**
 * Suggestion Performance Optimizer
 * Handles caching, throttling, and performance optimization for large files
 */
export class SuggestionPerformanceOptimizer {
    private static instance: SuggestionPerformanceOptimizer;
    private errorHandler: ErrorHandler;
    private config: PerformanceConfig;
    private suggestionCache: Map<string, CachedSuggestionData> = new Map();
    private throttleTimers: Map<string, NodeJS.Timeout> = new Map();
    private processingQueue: Map<string, Promise<CodeLensSuggestion[]>> = new Map();
    private metrics: PerformanceMetrics;

    private constructor(errorHandler: ErrorHandler) {
        this.errorHandler = errorHandler;
        this.config = this.getDefaultConfig();
        this.metrics = this.initializeMetrics();
        this.startCacheCleanup();
    }

    public static getInstance(errorHandler?: ErrorHandler): SuggestionPerformanceOptimizer {
        if (!SuggestionPerformanceOptimizer.instance) {
            if (!errorHandler) {
                throw new Error('ErrorHandler required for first initialization');
            }
            SuggestionPerformanceOptimizer.instance = new SuggestionPerformanceOptimizer(errorHandler);
        }
        return SuggestionPerformanceOptimizer.instance;
    }

    /**
     * Get default performance configuration
     */
    private getDefaultConfig(): PerformanceConfig {
        const config = vscode.workspace.getConfiguration('doracodelens.performance');
        
        return {
            enableCaching: config.get('enableCaching', true),
            cacheMaxSize: config.get('cacheMaxSize', 1000),
            cacheTTLMs: config.get('cacheTTLMs', 300000), // 5 minutes
            enableThrottling: config.get('enableThrottling', true),
            throttleDelayMs: config.get('throttleDelayMs', 200),
            maxFileSizeKB: config.get('maxFileSizeKB', 500),
            maxFunctionsPerFile: config.get('maxFunctionsPerFile', 100),
            enableLazyLoading: config.get('enableLazyLoading', true),
            batchSize: config.get('batchSize', 10)
        };
    }

    /**
     * Initialize performance metrics
     */
    private initializeMetrics(): PerformanceMetrics {
        return {
            cacheHits: 0,
            cacheMisses: 0,
            throttledRequests: 0,
            averageProcessingTime: 0,
            totalRequests: 0,
            largeFileSkips: 0
        };
    }

    /**
     * Check if file should be processed based on size and complexity
     */
    public shouldProcessFile(document: vscode.TextDocument, functionCount: number): boolean {
        const fileSizeKB = document.getText().length / 1024;
        
        if (fileSizeKB > this.config.maxFileSizeKB) {
            this.metrics.largeFileSkips++;
            this.errorHandler.logError(
                `Skipping large file: ${document.uri.fsPath} (${fileSizeKB.toFixed(1)}KB)`,
                { maxSize: this.config.maxFileSizeKB },
                'SuggestionPerformanceOptimizer'
            );
            return false;
        }

        if (functionCount > this.config.maxFunctionsPerFile) {
            this.metrics.largeFileSkips++;
            this.errorHandler.logError(
                `Skipping file with many functions: ${document.uri.fsPath} (${functionCount} functions)`,
                { maxFunctions: this.config.maxFunctionsPerFile },
                'SuggestionPerformanceOptimizer'
            );
            return false;
        }

        return true;
    }

    /**
     * Get cached suggestions if available and valid
     */
    public getCachedSuggestions(
        functionName: string,
        document: vscode.TextDocument,
        functionSignature: string
    ): CodeLensSuggestion[] | null {
        if (!this.config.enableCaching) {
            return null;
        }

        const cacheKey = this.generateCacheKey(functionName, document.uri.fsPath, functionSignature);
        const cached = this.suggestionCache.get(cacheKey);

        if (!cached) {
            this.metrics.cacheMisses++;
            return null;
        }

        // Check if cache is still valid
        const now = Date.now();
        if (now - cached.timestamp > this.config.cacheTTLMs) {
            this.suggestionCache.delete(cacheKey);
            this.metrics.cacheMisses++;
            return null;
        }

        // Check if file content has changed
        const currentFileHash = this.generateFileHash(document);
        if (cached.fileHash !== currentFileHash) {
            this.suggestionCache.delete(cacheKey);
            this.metrics.cacheMisses++;
            return null;
        }

        this.metrics.cacheHits++;
        this.errorHandler.logError(
            `Cache hit for function: ${functionName}`,
            { cacheKey },
            'SuggestionPerformanceOptimizer'
        );

        return cached.suggestions;
    }

    /**
     * Cache suggestions for future use
     */
    public cacheSuggestions(
        functionName: string,
        document: vscode.TextDocument,
        functionSignature: string,
        suggestions: CodeLensSuggestion[]
    ): void {
        if (!this.config.enableCaching) {
            return;
        }

        // Check cache size limit
        if (this.suggestionCache.size >= this.config.cacheMaxSize) {
            this.evictOldestCacheEntries();
        }

        const cacheKey = this.generateCacheKey(functionName, document.uri.fsPath, functionSignature);
        const fileHash = this.generateFileHash(document);

        const cacheData: CachedSuggestionData = {
            suggestions,
            timestamp: Date.now(),
            fileHash,
            functionSignature
        };

        this.suggestionCache.set(cacheKey, cacheData);

        this.errorHandler.logError(
            `Cached suggestions for function: ${functionName}`,
            { cacheKey, suggestionCount: suggestions.length },
            'SuggestionPerformanceOptimizer'
        );
    }

    /**
     * Throttle suggestion generation to prevent overwhelming the system
     */
    public async throttleSuggestionGeneration<T>(
        key: string,
        generator: () => Promise<T>
    ): Promise<T> {
        if (!this.config.enableThrottling) {
            return generator();
        }

        // Check if there's already a request in progress
        if (this.processingQueue.has(key)) {
            this.metrics.throttledRequests++;
            return this.processingQueue.get(key) as Promise<T>;
        }

        // Check if we need to throttle
        if (this.throttleTimers.has(key)) {
            this.metrics.throttledRequests++;
            return new Promise((resolve) => {
                setTimeout(async () => {
                    const result = await generator();
                    resolve(result);
                }, this.config.throttleDelayMs);
            });
        }

        // Execute immediately and set throttle timer
        const startTime = Date.now();
        const promise = generator();
        this.processingQueue.set(key, promise as Promise<CodeLensSuggestion[]>);

        // Set throttle timer
        const timer = setTimeout(() => {
            this.throttleTimers.delete(key);
        }, this.config.throttleDelayMs);
        this.throttleTimers.set(key, timer);

        try {
            const result = await promise;
            
            // Update metrics
            this.metrics.totalRequests++;
            const processingTime = Date.now() - startTime;
            this.metrics.averageProcessingTime = 
                (this.metrics.averageProcessingTime * (this.metrics.totalRequests - 1) + processingTime) / 
                this.metrics.totalRequests;

            return result;
        } finally {
            this.processingQueue.delete(key);
        }
    }

    /**
     * Process functions in batches for better performance
     */
    public async processFunctionsInBatches<T>(
        functions: any[],
        processor: (func: any) => Promise<T>
    ): Promise<T[]> {
        if (!this.config.enableLazyLoading) {
            // Process all at once
            return Promise.all(functions.map(processor));
        }

        const results: T[] = [];
        const batchSize = this.config.batchSize;

        for (let i = 0; i < functions.length; i += batchSize) {
            const batch = functions.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(processor));
            results.push(...batchResults);

            // Small delay between batches to prevent blocking
            if (i + batchSize < functions.length) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }

        return results;
    }

    /**
     * Generate cache key for function
     */
    private generateCacheKey(functionName: string, filePath: string, functionSignature: string): string {
        return `${filePath}:${functionName}:${this.hashString(functionSignature)}`;
    }

    /**
     * Generate file hash for cache validation
     */
    private generateFileHash(document: vscode.TextDocument): string {
        const content = document.getText();
        return this.hashString(content);
    }

    /**
     * Simple string hash function
     */
    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    /**
     * Evict oldest cache entries when cache is full
     */
    private evictOldestCacheEntries(): void {
        const entries = Array.from(this.suggestionCache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

        // Remove oldest 25% of entries
        const removeCount = Math.floor(entries.length * 0.25);
        for (let i = 0; i < removeCount; i++) {
            this.suggestionCache.delete(entries[i][0]);
        }

        this.errorHandler.logError(
            `Evicted ${removeCount} old cache entries`,
            { remainingEntries: this.suggestionCache.size },
            'SuggestionPerformanceOptimizer'
        );
    }

    /**
     * Start periodic cache cleanup
     */
    private startCacheCleanup(): void {
        setInterval(() => {
            this.cleanupExpiredCache();
        }, 60000); // Clean up every minute
    }

    /**
     * Clean up expired cache entries
     */
    private cleanupExpiredCache(): void {
        const now = Date.now();
        let removedCount = 0;

        for (const [key, data] of this.suggestionCache.entries()) {
            if (now - data.timestamp > this.config.cacheTTLMs) {
                this.suggestionCache.delete(key);
                removedCount++;
            }
        }

        if (removedCount > 0) {
            this.errorHandler.logError(
                `Cleaned up ${removedCount} expired cache entries`,
                { remainingEntries: this.suggestionCache.size },
                'SuggestionPerformanceOptimizer'
            );
        }
    }

    /**
     * Clear all caches
     */
    public clearCache(): void {
        this.suggestionCache.clear();
        this.processingQueue.clear();
        
        // Clear throttle timers
        this.throttleTimers.forEach(timer => clearTimeout(timer));
        this.throttleTimers.clear();

        this.errorHandler.logError(
            'All caches cleared',
            null,
            'SuggestionPerformanceOptimizer'
        );
    }

    /**
     * Get performance metrics
     */
    public getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    /**
     * Reset performance metrics
     */
    public resetMetrics(): void {
        this.metrics = this.initializeMetrics();
        this.errorHandler.logError(
            'Performance metrics reset',
            null,
            'SuggestionPerformanceOptimizer'
        );
    }

    /**
     * Update configuration
     */
    public updateConfig(newConfig: Partial<PerformanceConfig>): void {
        this.config = { ...this.config, ...newConfig };
        
        // Clear cache if caching was disabled
        if (!this.config.enableCaching) {
            this.clearCache();
        }

        this.errorHandler.logError(
            'Performance configuration updated',
            newConfig,
            'SuggestionPerformanceOptimizer'
        );
    }

    /**
     * Get current configuration
     */
    public getConfig(): PerformanceConfig {
        return { ...this.config };
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        this.clearCache();
        
        this.errorHandler.logError(
            'Suggestion performance optimizer disposed',
            null,
            'SuggestionPerformanceOptimizer'
        );
    }
}