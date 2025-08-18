# Design Document

## Overview

This design addresses the missing analysis service integration in the DoraCodeBirdView extension. The main issues are: missing `runCurrentFileAnalysis` method in the AnalysisManager, non-functional Git Analytics and DB Schema tabs, and incomplete service wiring. The solution focuses on implementing missing methods, properly integrating existing services, and ensuring robust error handling across all analysis features.

## Architecture

### Current State Analysis

Based on the error logs and code structure, the current issues are:

1. **Missing Method**: `this.analysisManager.runCurrentFileAnalysis is not a function`
2. **Service Integration**: Git and DB schema services exist but aren't properly integrated
3. **Tab Functionality**: Some tabs load but don't display content properly
4. **Error Handling**: Insufficient error handling when services fail

### Proposed Solution Architecture

The solution involves:

1. **Complete AnalysisManager Implementation**: Add missing methods and ensure all analysis types are supported
2. **Service Integration Layer**: Create a unified interface for all analysis services
3. **Enhanced Tab Content Management**: Improve how tabs load and display different analysis types
4. **Robust Error Handling**: Add comprehensive error handling and fallback mechanisms

## Components and Interfaces

### 1. Enhanced AnalysisManager

```typescript
interface AnalysisManager {
    // Existing methods
    runProjectAnalysis(): Promise<AnalysisResult>;
    
    // Missing methods to implement
    runCurrentFileAnalysis(filePath: string): Promise<CurrentFileAnalysisResult>;
    runGitAnalysis(): Promise<GitAnalysisResult>;
    runDatabaseSchemaAnalysis(): Promise<DatabaseSchemaResult>;
    
    // Service management
    getAnalysisServices(): AnalysisServiceRegistry;
    isServiceAvailable(serviceName: string): boolean;
}

interface CurrentFileAnalysisResult {
    success: boolean;
    filePath: string;
    language: string;
    functions: FunctionInfo[];
    classes: ClassInfo[];
    imports: ImportInfo[];
    complexity: ComplexityMetrics;
    errors?: string[];
}

interface GitAnalysisResult {
    success: boolean;
    repository: RepositoryInfo;
    commits: CommitInfo[];
    contributors: ContributorInfo[];
    fileChanges: FileChangeInfo[];
    analytics: GitAnalytics;
    errors?: string[];
}

interface DatabaseSchemaResult {
    success: boolean;
    schemas: SchemaInfo[];
    tables: TableInfo[];
    relationships: RelationshipInfo[];
    diagram: SchemaDiagram;
    errors?: string[];
}
```

### 2. Analysis Service Registry

```typescript
interface AnalysisServiceRegistry {
    registerService(name: string, service: AnalysisService): void;
    getService(name: string): AnalysisService | null;
    isServiceRegistered(name: string): boolean;
    getAllServices(): Map<string, AnalysisService>;
}

interface AnalysisService {
    name: string;
    isAvailable(): Promise<boolean>;
    analyze(context: AnalysisContext): Promise<AnalysisResult>;
    getRequiredDependencies(): string[];
    validateConfiguration(): ValidationResult;
}

interface AnalysisContext {
    workspacePath: string;
    filePath?: string;
    analysisType: AnalysisType;
    options: AnalysisOptions;
}

type AnalysisType = 'project' | 'currentFile' | 'git' | 'database' | 'custom';
```

### 3. Enhanced Tab Content Management

```typescript
interface TabContentManager {
    loadTabContent(tabId: string, analysisData: any): Promise<TabContent>;
    refreshTabContent(tabId: string): Promise<void>;
    isTabContentAvailable(tabId: string): boolean;
    getTabContentStatus(tabId: string): TabContentStatus;
}

interface TabContent {
    tabId: string;
    html: string;
    scripts: string[];
    styles: string[];
    data: any;
    status: TabContentStatus;
}

interface TabContentStatus {
    loaded: boolean;
    loading: boolean;
    error: string | null;
    lastUpdated: Date;
    dataAvailable: boolean;
}
```

### 4. Service Integration Layer

```typescript
interface ServiceIntegrationLayer {
    initializeServices(): Promise<ServiceInitializationResult>;
    validateServiceDependencies(): ValidationResult;
    getServiceHealth(): ServiceHealthReport;
    handleServiceFailure(serviceName: string, error: Error): void;
}

interface ServiceInitializationResult {
    success: boolean;
    initializedServices: string[];
    failedServices: ServiceFailure[];
    warnings: string[];
}

interface ServiceFailure {
    serviceName: string;
    error: Error;
    canRetry: boolean;
    fallbackAvailable: boolean;
}

interface ServiceHealthReport {
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
    services: ServiceHealth[];
    recommendations: string[];
}

interface ServiceHealth {
    name: string;
    status: 'active' | 'inactive' | 'error';
    lastCheck: Date;
    responseTime?: number;
    errorCount: number;
}
```

## Data Models

### 1. Current File Analysis Models

```typescript
interface FunctionInfo {
    name: string;
    startLine: number;
    endLine: number;
    parameters: ParameterInfo[];
    returnType?: string;
    complexity: number;
    docstring?: string;
}

interface ClassInfo {
    name: string;
    startLine: number;
    endLine: number;
    methods: FunctionInfo[];
    properties: PropertyInfo[];
    inheritance: string[];
    docstring?: string;
}

interface ImportInfo {
    module: string;
    alias?: string;
    items: string[];
    isRelative: boolean;
    line: number;
}

interface ComplexityMetrics {
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    linesOfCode: number;
    maintainabilityIndex: number;
}
```

### 2. Git Analysis Models

```typescript
interface RepositoryInfo {
    name: string;
    path: string;
    branch: string;
    remoteUrl?: string;
    lastCommit: CommitInfo;
    totalCommits: number;
}

interface CommitInfo {
    hash: string;
    author: string;
    date: Date;
    message: string;
    filesChanged: number;
    insertions: number;
    deletions: number;
}

interface ContributorInfo {
    name: string;
    email: string;
    commits: number;
    linesAdded: number;
    linesRemoved: number;
    firstCommit: Date;
    lastCommit: Date;
}

interface GitAnalytics {
    commitFrequency: CommitFrequencyData[];
    fileHotspots: FileHotspot[];
    authorActivity: AuthorActivity[];
    codeChurn: CodeChurnData[];
}
```

### 3. Database Schema Models

```typescript
interface SchemaInfo {
    name: string;
    tables: string[];
    views: string[];
    procedures: string[];
    functions: string[];
}

interface TableInfo {
    name: string;
    schema: string;
    columns: ColumnInfo[];
    primaryKey: string[];
    foreignKeys: ForeignKeyInfo[];
    indexes: IndexInfo[];
}

interface RelationshipInfo {
    fromTable: string;
    toTable: string;
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
    foreignKey: string;
    referencedKey: string;
}

interface SchemaDiagram {
    nodes: SchemaNode[];
    edges: SchemaEdge[];
    layout: DiagramLayout;
}
```

## Error Handling

### 1. Service-Level Error Handling

```typescript
class AnalysisServiceError extends Error {
    constructor(
        public serviceName: string,
        public operation: string,
        message: string,
        public cause?: Error
    ) {
        super(`${serviceName}.${operation}: ${message}`);
        this.name = 'AnalysisServiceError';
    }
}

class ServiceUnavailableError extends AnalysisServiceError {
    constructor(serviceName: string, reason: string) {
        super(serviceName, 'availability', `Service unavailable: ${reason}`);
        this.name = 'ServiceUnavailableError';
    }
}

class AnalysisTimeoutError extends AnalysisServiceError {
    constructor(serviceName: string, operation: string, timeout: number) {
        super(serviceName, operation, `Operation timed out after ${timeout}ms`);
        this.name = 'AnalysisTimeoutError';
    }
}
```

### 2. Graceful Degradation Strategy

```typescript
interface GracefulDegradationStrategy {
    handleMissingService(serviceName: string): FallbackAction;
    handleServiceFailure(serviceName: string, error: Error): RecoveryAction;
    getMinimalFunctionality(): MinimalFeatureSet;
}

type FallbackAction = 
    | { type: 'disable'; message: string }
    | { type: 'fallback'; service: string }
    | { type: 'cached'; data: any }
    | { type: 'minimal'; features: string[] };

type RecoveryAction =
    | { type: 'retry'; delay: number; maxAttempts: number }
    | { type: 'fallback'; strategy: FallbackAction }
    | { type: 'disable'; temporary: boolean };

interface MinimalFeatureSet {
    coreAnalysis: boolean;
    basicVisualization: boolean;
    fileExploration: boolean;
    errorReporting: boolean;
}
```

### 3. Error Recovery Mechanisms

```typescript
class ErrorRecoveryManager {
    private retryStrategies: Map<string, RetryStrategy> = new Map();
    private fallbackServices: Map<string, string> = new Map();
    
    async executeWithRecovery<T>(
        operation: () => Promise<T>,
        context: RecoveryContext
    ): Promise<T> {
        let lastError: Error;
        let attempts = 0;
        const maxAttempts = context.maxRetries || 3;
        
        while (attempts < maxAttempts) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                attempts++;
                
                if (attempts < maxAttempts) {
                    const delay = this.calculateRetryDelay(attempts, context);
                    await this.sleep(delay);
                    continue;
                }
                
                // Try fallback if available
                const fallback = this.fallbackServices.get(context.serviceName);
                if (fallback) {
                    return await this.executeFallback(fallback, context);
                }
                
                throw lastError;
            }
        }
        
        throw lastError!;
    }
    
    private calculateRetryDelay(attempt: number, context: RecoveryContext): number {
        const baseDelay = context.baseRetryDelay || 1000;
        return baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
    }
}
```

## Testing Strategy

### 1. Service Integration Tests

```typescript
describe('AnalysisManager Integration', () => {
    let analysisManager: AnalysisManager;
    let mockServices: Map<string, AnalysisService>;
    
    beforeEach(() => {
        mockServices = new Map();
        analysisManager = new AnalysisManager(mockServices);
    });
    
    test('runCurrentFileAnalysis should analyze current file', async () => {
        const mockCurrentFileService = createMockCurrentFileService();
        mockServices.set('currentFile', mockCurrentFileService);
        
        const result = await analysisManager.runCurrentFileAnalysis('/test/file.py');
        
        expect(result.success).toBe(true);
        expect(result.filePath).toBe('/test/file.py');
        expect(result.functions).toBeDefined();
        expect(mockCurrentFileService.analyze).toHaveBeenCalled();
    });
    
    test('runGitAnalysis should handle git service unavailable', async () => {
        const mockGitService = createMockGitService({ available: false });
        mockServices.set('git', mockGitService);
        
        const result = await analysisManager.runGitAnalysis();
        
        expect(result.success).toBe(false);
        expect(result.errors).toContain('Git service unavailable');
    });
});
```

### 2. Error Handling Tests

```typescript
describe('Error Handling', () => {
    test('should handle missing service gracefully', async () => {
        const analysisManager = new AnalysisManager(new Map());
        
        const result = await analysisManager.runCurrentFileAnalysis('/test/file.py');
        
        expect(result.success).toBe(false);
        expect(result.errors).toContain('Current file analysis service not available');
    });
    
    test('should retry failed operations', async () => {
        const mockService = createMockServiceWithFailures(2); // Fail first 2 attempts
        const recoveryManager = new ErrorRecoveryManager();
        
        const result = await recoveryManager.executeWithRecovery(
            () => mockService.analyze({}),
            { serviceName: 'test', maxRetries: 3 }
        );
        
        expect(result.success).toBe(true);
        expect(mockService.analyze).toHaveBeenCalledTimes(3);
    });
});
```

### 3. Tab Content Tests

```typescript
describe('Tab Content Management', () => {
    test('should load git analytics tab content', async () => {
        const tabContentManager = new TabContentManager();
        const mockGitData = createMockGitAnalysisData();
        
        const content = await tabContentManager.loadTabContent('gitanalytics', mockGitData);
        
        expect(content.tabId).toBe('gitanalytics');
        expect(content.html).toContain('git-analytics-chart');
        expect(content.status.loaded).toBe(true);
    });
    
    test('should handle missing data gracefully', async () => {
        const tabContentManager = new TabContentManager();
        
        const content = await tabContentManager.loadTabContent('dbschema', null);
        
        expect(content.status.loaded).toBe(true);
        expect(content.html).toContain('No database schema detected');
    });
});
```

## Implementation Approach

### Phase 1: Core Service Implementation

1. **Implement Missing AnalysisManager Methods**
   - Add `runCurrentFileAnalysis` method
   - Add `runGitAnalysis` method  
   - Add `runDatabaseSchemaAnalysis` method
   - Ensure proper error handling for each method

2. **Create Service Registry**
   - Implement service registration system
   - Add service availability checking
   - Create service dependency validation

3. **Integrate Existing Services**
   - Wire up git service to analysis manager
   - Connect database schema analyzer
   - Ensure current file analyzer is properly integrated

### Phase 2: Enhanced Error Handling

1. **Add Comprehensive Error Handling**
   - Implement service-specific error types
   - Add retry mechanisms with exponential backoff
   - Create fallback strategies for failed services

2. **Implement Graceful Degradation**
   - Define minimal functionality when services fail
   - Add user-friendly error messages
   - Provide recovery options in the UI

### Phase 3: Tab Content Enhancement

1. **Improve Tab Content Loading**
   - Enhance git analytics tab rendering
   - Fix database schema tab functionality
   - Add loading states and error handling for all tabs

2. **Add Content Validation**
   - Validate data before rendering tabs
   - Add empty state handling
   - Implement content refresh mechanisms

## Technical Considerations

### 1. Service Dependencies

Some analysis services have external dependencies:
- Git analysis requires git to be available
- Database schema analysis requires database connection or schema files
- Current file analysis requires language-specific parsers

**Solutions:**
- Check dependencies during service initialization
- Provide clear error messages when dependencies are missing
- Offer alternative analysis methods when possible

### 2. Performance Considerations

Analysis operations can be time-consuming:
- File analysis for large files
- Git analysis for repositories with many commits
- Database schema analysis for complex schemas

**Solutions:**
- Implement timeout mechanisms
- Add progress indicators for long-running operations
- Use caching for repeated analyses
- Implement incremental analysis where possible

### 3. Cross-Platform Compatibility

The extension needs to work across different platforms:
- Different Python installations
- Various git configurations
- Different database systems

**Solutions:**
- Use platform-agnostic path handling
- Detect available tools dynamically
- Provide configuration options for tool paths
- Add platform-specific fallbacks