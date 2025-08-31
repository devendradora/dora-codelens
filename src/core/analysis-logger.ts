import * as vscode from 'vscode';
import { ErrorHandler } from './error-handler';

/**
 * Log levels for analysis operations
 */
export enum AnalysisLogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

/**
 * Interface for analysis log entry
 */
export interface AnalysisLogEntry {
    timestamp: number;
    level: AnalysisLogLevel;
    component: string;
    operation: string;
    message: string;
    data?: any;
    duration?: number;
    filePath?: string;
    functionName?: string;
    className?: string;
}

/**
 * Interface for performance metrics
 */
export interface PerformanceMetrics {
    operationName: string;
    startTime: number;
    endTime: number;
    duration: number;
    memoryBefore: number;
    memoryAfter: number;
    memoryDelta: number;
    success: boolean;
    errorMessage?: string;
}

/**
 * Comprehensive logging system for analysis pipeline
 */
export class AnalysisLogger {
    private static instance: AnalysisLogger;
    private errorHandler: ErrorHandler;
    private logEntries: AnalysisLogEntry[] = [];
    private performanceMetrics: PerformanceMetrics[] = [];
    private maxLogEntries = 1000;
    private maxPerformanceEntries = 500;
    private currentLogLevel: AnalysisLogLevel = AnalysisLogLevel.INFO;

    private constructor(errorHandler: ErrorHandler) {
        this.errorHandler = errorHandler;
        this.setupConfiguration();
    }

    public static getInstance(errorHandler?: ErrorHandler): AnalysisLogger {
        if (!AnalysisLogger.instance) {
            if (!errorHandler) {
                throw new Error('ErrorHandler required for first initialization');
            }
            AnalysisLogger.instance = new AnalysisLogger(errorHandler);
        }
        return AnalysisLogger.instance;
    }

    /**
     * Setup configuration from VS Code settings
     */
    private setupConfiguration(): void {
        const config = vscode.workspace.getConfiguration('doracodelens.logging');
        
        const logLevelString = config.get('level', 'info');
        this.currentLogLevel = this.parseLogLevel(logLevelString);
        
        this.maxLogEntries = config.get('maxEntries', 1000);
        this.maxPerformanceEntries = config.get('maxPerformanceEntries', 500);

        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('doracodelens.logging')) {
                this.setupConfiguration();
            }
        });
    }

    /**
     * Parse log level from string
     */
    private parseLogLevel(level: string): AnalysisLogLevel {
        switch (level.toLowerCase()) {
            case 'debug': return AnalysisLogLevel.DEBUG;
            case 'info': return AnalysisLogLevel.INFO;
            case 'warn': case 'warning': return AnalysisLogLevel.WARN;
            case 'error': return AnalysisLogLevel.ERROR;
            default: return AnalysisLogLevel.INFO;
        }
    }

    /**
     * Log a debug message
     */
    public debug(component: string, operation: string, message: string, data?: any, context?: {
        filePath?: string;
        functionName?: string;
        className?: string;
    }): void {
        this.log(AnalysisLogLevel.DEBUG, component, operation, message, data, context);
    }

    /**
     * Log an info message
     */
    public info(component: string, operation: string, message: string, data?: any, context?: {
        filePath?: string;
        functionName?: string;
        className?: string;
    }): void {
        this.log(AnalysisLogLevel.INFO, component, operation, message, data, context);
    }

    /**
     * Log a warning message
     */
    public warn(component: string, operation: string, message: string, data?: any, context?: {
        filePath?: string;
        functionName?: string;
        className?: string;
    }): void {
        this.log(AnalysisLogLevel.WARN, component, operation, message, data, context);
    }

    /**
     * Log an error message
     */
    public error(component: string, operation: string, message: string, data?: any, context?: {
        filePath?: string;
        functionName?: string;
        className?: string;
    }): void {
        this.log(AnalysisLogLevel.ERROR, component, operation, message, data, context);
    }

    /**
     * Log a message with specified level
     */
    private log(level: AnalysisLogLevel, component: string, operation: string, message: string, data?: any, context?: {
        filePath?: string;
        functionName?: string;
        className?: string;
    }): void {
        if (level < this.currentLogLevel) {
            return;
        }

        const entry: AnalysisLogEntry = {
            timestamp: Date.now(),
            level,
            component,
            operation,
            message,
            data,
            filePath: context?.filePath,
            functionName: context?.functionName,
            className: context?.className
        };

        this.addLogEntry(entry);

        // Also log to error handler for persistence
        const levelString = AnalysisLogLevel[level];
        const contextString = context ? ` [${context.filePath || ''}${context.className ? '::' + context.className : ''}${context.functionName ? '::' + context.functionName : ''}]` : '';
        const fullMessage = `[${levelString}] ${component}::${operation}${contextString}: ${message}`;
        
        this.errorHandler.logError(fullMessage, data, component);
    }

    /**
     * Add log entry and manage size
     */
    private addLogEntry(entry: AnalysisLogEntry): void {
        this.logEntries.push(entry);

        // Trim log entries if exceeding limit
        if (this.logEntries.length > this.maxLogEntries) {
            this.logEntries.splice(0, this.logEntries.length - this.maxLogEntries);
        }
    }

    /**
     * Start performance measurement
     */
    public startPerformanceMeasurement(operationName: string): string {
        const measurementId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const startMetrics: Partial<PerformanceMetrics> = {
            operationName,
            startTime: Date.now(),
            memoryBefore: process.memoryUsage().heapUsed
        };

        // Store in a temporary map for completion
        if (!this.performanceMeasurements) {
            this.performanceMeasurements = new Map();
        }
        this.performanceMeasurements.set(measurementId, startMetrics);

        this.debug('AnalysisLogger', 'startPerformanceMeasurement', `Started measuring ${operationName}`, {
            measurementId,
            memoryBefore: startMetrics.memoryBefore
        });

        return measurementId;
    }

    private performanceMeasurements: Map<string, Partial<PerformanceMetrics>> = new Map();

    /**
     * End performance measurement
     */
    public endPerformanceMeasurement(measurementId: string, success: boolean = true, errorMessage?: string): PerformanceMetrics | null {
        const startMetrics = this.performanceMeasurements.get(measurementId);
        if (!startMetrics) {
            this.warn('AnalysisLogger', 'endPerformanceMeasurement', `No start metrics found for measurement ${measurementId}`);
            return null;
        }

        const endTime = Date.now();
        const memoryAfter = process.memoryUsage().heapUsed;

        const completeMetrics: PerformanceMetrics = {
            operationName: startMetrics.operationName!,
            startTime: startMetrics.startTime!,
            endTime,
            duration: endTime - startMetrics.startTime!,
            memoryBefore: startMetrics.memoryBefore!,
            memoryAfter,
            memoryDelta: memoryAfter - startMetrics.memoryBefore!,
            success,
            errorMessage
        };

        this.addPerformanceMetrics(completeMetrics);
        this.performanceMeasurements.delete(measurementId);

        this.debug('AnalysisLogger', 'endPerformanceMeasurement', `Completed measuring ${completeMetrics.operationName}`, {
            duration: completeMetrics.duration,
            memoryDelta: completeMetrics.memoryDelta,
            success
        });

        return completeMetrics;
    }

    /**
     * Add performance metrics and manage size
     */
    private addPerformanceMetrics(metrics: PerformanceMetrics): void {
        this.performanceMetrics.push(metrics);

        // Trim performance metrics if exceeding limit
        if (this.performanceMetrics.length > this.maxPerformanceEntries) {
            this.performanceMetrics.splice(0, this.performanceMetrics.length - this.maxPerformanceEntries);
        }
    }

    /**
     * Measure performance of an async operation
     */
    public async measureAsync<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
        const measurementId = this.startPerformanceMeasurement(operationName);
        
        try {
            const result = await operation();
            this.endPerformanceMeasurement(measurementId, true);
            return result;
        } catch (error) {
            this.endPerformanceMeasurement(measurementId, false, error instanceof Error ? error.message : String(error));
            throw error;
        }
    }

    /**
     * Measure performance of a synchronous operation
     */
    public measureSync<T>(operationName: string, operation: () => T): T {
        const measurementId = this.startPerformanceMeasurement(operationName);
        
        try {
            const result = operation();
            this.endPerformanceMeasurement(measurementId, true);
            return result;
        } catch (error) {
            this.endPerformanceMeasurement(measurementId, false, error instanceof Error ? error.message : String(error));
            throw error;
        }
    }

    /**
     * Get log entries with optional filtering
     */
    public getLogEntries(filter?: {
        level?: AnalysisLogLevel;
        component?: string;
        operation?: string;
        since?: number;
        filePath?: string;
    }): AnalysisLogEntry[] {
        let entries = [...this.logEntries];

        if (filter) {
            if (filter.level !== undefined) {
                entries = entries.filter(entry => entry.level >= filter.level!);
            }
            if (filter.component) {
                entries = entries.filter(entry => entry.component === filter.component);
            }
            if (filter.operation) {
                entries = entries.filter(entry => entry.operation === filter.operation);
            }
            if (filter.since) {
                entries = entries.filter(entry => entry.timestamp >= filter.since!);
            }
            if (filter.filePath) {
                entries = entries.filter(entry => entry.filePath === filter.filePath);
            }
        }

        return entries.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Get performance metrics with optional filtering
     */
    public getPerformanceMetrics(filter?: {
        operationName?: string;
        since?: number;
        onlySuccessful?: boolean;
    }): PerformanceMetrics[] {
        let metrics = [...this.performanceMetrics];

        if (filter) {
            if (filter.operationName) {
                metrics = metrics.filter(metric => metric.operationName === filter.operationName);
            }
            if (filter.since) {
                metrics = metrics.filter(metric => metric.startTime >= filter.since!);
            }
            if (filter.onlySuccessful) {
                metrics = metrics.filter(metric => metric.success);
            }
        }

        return metrics.sort((a, b) => b.startTime - a.startTime);
    }

    /**
     * Get performance summary
     */
    public getPerformanceSummary(): {
        totalOperations: number;
        successfulOperations: number;
        failedOperations: number;
        averageDuration: number;
        averageMemoryDelta: number;
        operationStats: { [operationName: string]: {
            count: number;
            averageDuration: number;
            successRate: number;
        }};
    } {
        const metrics = this.performanceMetrics;
        const totalOperations = metrics.length;
        const successfulOperations = metrics.filter(m => m.success).length;
        const failedOperations = totalOperations - successfulOperations;

        const averageDuration = totalOperations > 0 
            ? metrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations 
            : 0;

        const averageMemoryDelta = totalOperations > 0
            ? metrics.reduce((sum, m) => sum + m.memoryDelta, 0) / totalOperations
            : 0;

        // Calculate per-operation statistics
        const operationStats: { [operationName: string]: {
            count: number;
            averageDuration: number;
            successRate: number;
        }} = {};

        const operationGroups = metrics.reduce((groups, metric) => {
            if (!groups[metric.operationName]) {
                groups[metric.operationName] = [];
            }
            groups[metric.operationName].push(metric);
            return groups;
        }, {} as { [operationName: string]: PerformanceMetrics[] });

        for (const [operationName, operationMetrics] of Object.entries(operationGroups)) {
            const count = operationMetrics.length;
            const successful = operationMetrics.filter(m => m.success).length;
            const avgDuration = operationMetrics.reduce((sum, m) => sum + m.duration, 0) / count;

            operationStats[operationName] = {
                count,
                averageDuration: avgDuration,
                successRate: successful / count
            };
        }

        return {
            totalOperations,
            successfulOperations,
            failedOperations,
            averageDuration,
            averageMemoryDelta,
            operationStats
        };
    }

    /**
     * Export logs to file
     */
    public async exportLogs(filePath: string, options?: {
        includePerformanceMetrics?: boolean;
        format?: 'json' | 'csv' | 'text';
        filter?: {
            level?: AnalysisLogLevel;
            component?: string;
            since?: number;
        };
    }): Promise<void> {
        const format = options?.format || 'json';
        const includePerformance = options?.includePerformanceMetrics || false;
        
        const logEntries = this.getLogEntries(options?.filter);
        const performanceMetrics = includePerformance ? this.getPerformanceMetrics() : [];

        let content: string;

        switch (format) {
            case 'json':
                content = JSON.stringify({
                    exportTimestamp: Date.now(),
                    logEntries,
                    performanceMetrics: includePerformance ? performanceMetrics : undefined
                }, null, 2);
                break;

            case 'csv':
                const csvHeaders = 'Timestamp,Level,Component,Operation,Message,FilePath,FunctionName,ClassName\n';
                const csvRows = logEntries.map(entry => 
                    `${new Date(entry.timestamp).toISOString()},${AnalysisLogLevel[entry.level]},${entry.component},${entry.operation},"${entry.message.replace(/"/g, '""')}",${entry.filePath || ''},${entry.functionName || ''},${entry.className || ''}`
                ).join('\n');
                content = csvHeaders + csvRows;
                break;

            case 'text':
                content = logEntries.map(entry => {
                    const timestamp = new Date(entry.timestamp).toISOString();
                    const level = AnalysisLogLevel[entry.level];
                    const context = entry.filePath || entry.functionName || entry.className 
                        ? ` [${entry.filePath || ''}${entry.className ? '::' + entry.className : ''}${entry.functionName ? '::' + entry.functionName : ''}]`
                        : '';
                    return `${timestamp} [${level}] ${entry.component}::${entry.operation}${context}: ${entry.message}`;
                }).join('\n');
                break;

            default:
                throw new Error(`Unsupported export format: ${format}`);
        }

        const fs = await import('fs');
        fs.writeFileSync(filePath, content, 'utf8');

        this.info('AnalysisLogger', 'exportLogs', `Exported ${logEntries.length} log entries to ${filePath}`, {
            format,
            includePerformance,
            performanceMetricsCount: performanceMetrics.length
        });
    }

    /**
     * Clear all logs
     */
    public clearLogs(): void {
        const logCount = this.logEntries.length;
        const metricsCount = this.performanceMetrics.length;
        
        this.logEntries = [];
        this.performanceMetrics = [];
        this.performanceMeasurements.clear();

        this.info('AnalysisLogger', 'clearLogs', `Cleared ${logCount} log entries and ${metricsCount} performance metrics`);
    }

    /**
     * Get current log level
     */
    public getLogLevel(): AnalysisLogLevel {
        return this.currentLogLevel;
    }

    /**
     * Set log level
     */
    public setLogLevel(level: AnalysisLogLevel): void {
        this.currentLogLevel = level;
        this.info('AnalysisLogger', 'setLogLevel', `Log level changed to ${AnalysisLogLevel[level]}`);
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        this.clearLogs();
        this.info('AnalysisLogger', 'dispose', 'Analysis logger disposed');
    }
}