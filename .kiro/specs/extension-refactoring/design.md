# Design Document

## Overview

This design addresses the refactoring of the large extension.ts file (2963 lines) into smaller, maintainable modules. The current monolithic `DoraCodeBirdExtension` class handles too many responsibilities including command management, analysis orchestration, UI management, configuration handling, and more. The refactoring will split these concerns into focused, testable modules while maintaining all existing functionality.

## Architecture

### Current State Analysis

The current extension.ts file contains:
- 1 large `DoraCodeBirdExtension` class with 50+ methods
- Command registration and handling logic
- Analysis orchestration and result processing
- UI management (webviews, modals, sidebar)
- Configuration validation and management
- File system watching and workspace management
- Error handling and user feedback
- Git analytics functionality
- JSON utilities integration

### Proposed Architecture

The refactored architecture will follow the Single Responsibility Principle and create the following modules:

```
src/
├── extension.ts (main entry point, ~100 lines)
├── core/
│   ├── extension-manager.ts (main orchestrator)
│   ├── command-manager.ts (command registration/handling)
│   ├── analysis-manager.ts (analysis orchestration)
│   ├── ui-manager.ts (webview/modal management)
│   └── configuration-manager.ts (settings/validation)
├── services/
│   ├── workspace-service.ts (workspace/file watching)
│   ├── git-service.ts (git analytics functionality)
│   └── validation-service.ts (validation utilities)
└── types/
    └── extension-types.ts (shared interfaces)
```

## Components and Interfaces

### 1. Main Extension Entry Point

```typescript
// src/extension.ts
export function activate(context: vscode.ExtensionContext) {
    const extensionManager = new ExtensionManager(context);
    return extensionManager.initialize();
}

export function deactivate() {
    ExtensionManager.getInstance()?.dispose();
}
```

### 2. Extension Manager (Core Orchestrator)

```typescript
// src/core/extension-manager.ts
export class ExtensionManager {
    private static instance: ExtensionManager | undefined;
    private commandManager: CommandManager;
    private analysisManager: AnalysisManager;
    private uiManager: UIManager;
    private configurationManager: ConfigurationManager;
    private workspaceService: WorkspaceService;

    constructor(private context: vscode.ExtensionContext) {
        ExtensionManager.instance = this;
        this.initializeServices();
    }

    public async initialize(): Promise<void> {
        // Initialize all managers and services
    }

    public dispose(): void {
        // Clean up all resources
    }

    public static getInstance(): ExtensionManager | undefined {
        return ExtensionManager.instance;
    }
}
```

### 3. Command Manager

```typescript
// src/core/command-manager.ts
export interface CommandDefinition {
    name: string;
    handler: (...args: any[]) => any;
    description: string;
    category: CommandCategory;
}

export enum CommandCategory {
    Analysis = 'analysis',
    UI = 'ui',
    Git = 'git',
    JSON = 'json',
    Configuration = 'configuration'
}

export class CommandManager {
    private commands: Map<string, CommandDefinition> = new Map();
    private registeredCommands: vscode.Disposable[] = [];

    constructor(
        private context: vscode.ExtensionContext,
        private analysisManager: AnalysisManager,
        private uiManager: UIManager,
        private gitService: GitService
    ) {}

    public registerAllCommands(): void {
        this.defineCommands();
        this.registerCommands();
    }

    private defineCommands(): void {
        // Define all command handlers organized by category
    }

    private registerCommands(): void {
        // Register commands with VS Code
    }
}
```

### 4. Analysis Manager

```typescript
// src/core/analysis-manager.ts
export interface AnalysisState {
    isAnalyzing: boolean;
    lastResult: AnalysisResult | null;
    currentOptions: AnalyzerOptions | null;
}

export class AnalysisManager {
    private state: AnalysisState = {
        isAnalyzing: false,
        lastResult: null,
        currentOptions: null
    };

    constructor(
        private analyzerRunner: AnalyzerRunner,
        private uiManager: UIManager,
        private configurationManager: ConfigurationManager
    ) {}

    public async runProjectAnalysis(): Promise<AnalysisResult> {
        // Main analysis orchestration
    }

    public async showCallHierarchy(uri?: vscode.Uri, position?: vscode.Position): Promise<void> {
        // Call hierarchy analysis
    }

    public cancelAnalysis(): void {
        // Cancel running analysis
    }

    private handleAnalysisErrors(result: AnalysisResult): void {
        // Error handling and user feedback
    }
}
```

### 5. UI Manager

```typescript
// src/core/ui-manager.ts
export interface WebviewConfig {
    viewType: string;
    title: string;
    showOptions: vscode.WebviewPanelShowOptions;
    options: vscode.WebviewPanelOptions & vscode.WebviewOptions;
}

export class UIManager {
    private activeWebviews: Map<string, vscode.WebviewPanel> = new Map();
    private statusBarItem: vscode.StatusBarItem;

    constructor(private context: vscode.ExtensionContext) {
        this.initializeStatusBar();
    }

    public showModuleGraph(data: AnalysisResult): void {
        // Show module graph visualization
    }

    public showAnalysisDashboard(data: AnalysisResult): void {
        // Show tabbed analysis dashboard
    }

    public showJsonView(data: any): void {
        // Show JSON view
    }

    public updateStatusBar(text: string, tooltip?: string): void {
        // Update status bar
    }

    private createWebview(config: WebviewConfig): vscode.WebviewPanel {
        // Create and configure webview
    }
}
```

### 6. Configuration Manager

```typescript
// src/core/configuration-manager.ts
export interface ConfigurationValidation {
    isValid: boolean;
    issues: string[];
    warnings: string[];
}

export class ConfigurationManager {
    private config: vscode.WorkspaceConfiguration;

    constructor() {
        this.config = vscode.workspace.getConfiguration('doracodebird');
    }

    public validateConfiguration(): ConfigurationValidation {
        // Validate all configuration settings
    }

    public getPythonPath(): string | undefined {
        return this.config.get<string>('pythonPath');
    }

    public isCachingEnabled(): boolean {
        return this.config.get<boolean>('enableCaching', true);
    }

    public getAnalyzerOptions(): AnalyzerOptions {
        // Build analyzer options from configuration
    }
}
```

### 7. Workspace Service

```typescript
// src/services/workspace-service.ts
export class WorkspaceService {
    private fileWatchers: vscode.FileSystemWatcher[] = [];

    constructor(private configurationManager: ConfigurationManager) {}

    public async checkPythonProject(): Promise<boolean> {
        // Check if workspace contains Python files
    }

    public setupFileWatchers(): void {
        // Set up file system watchers
    }

    public dispose(): void {
        // Clean up watchers
    }

    private onPythonFileChanged(): void {
        // Handle Python file changes
    }

    private onDependencyFileChanged(): void {
        // Handle dependency file changes
    }
}
```

### 8. Git Service

```typescript
// src/services/git-service.ts
export class GitService {
    constructor(
        private outputChannel: vscode.OutputChannel,
        private uiManager: UIManager
    ) {}

    public async showGitAnalytics(): Promise<void> {
        // Show git analytics dashboard
    }

    public async initializeGitRepository(): Promise<void> {
        // Initialize git repository
    }

    private async checkGitInstallation(): Promise<boolean> {
        // Check if git is installed
    }

    private handleGitAnalysisError(result: any, analysisType: string): void {
        // Handle git analysis errors
    }
}
```

## Data Models

### 1. Extension State

```typescript
// src/types/extension-types.ts
export interface ExtensionState {
    isInitialized: boolean;
    analysisState: AnalysisState;
    uiState: UIState;
    workspaceState: WorkspaceState;
}

export interface UIState {
    activeWebviews: string[];
    statusBarVisible: boolean;
    lastViewType: string | null;
}

export interface WorkspaceState {
    hasPythonFiles: boolean;
    workspaceFolders: string[];
    lastAnalysisTime: number | null;
}
```

### 2. Command Context

```typescript
export interface CommandContext {
    uri?: vscode.Uri;
    position?: vscode.Position;
    analysisData?: AnalysisResult;
    workspaceFolder?: vscode.WorkspaceFolder;
}

export interface CommandResult {
    success: boolean;
    message?: string;
    data?: any;
    error?: Error;
}
```

## Error Handling

### 1. Centralized Error Management

```typescript
export class ErrorManager {
    public static handleAnalysisError(error: Error, context: string): void {
        // Centralized analysis error handling
    }

    public static handleUIError(error: Error, viewType: string): void {
        // Centralized UI error handling
    }

    public static handleCommandError(error: Error, commandName: string): void {
        // Centralized command error handling
    }
}
```

### 2. Error Recovery Strategies

- **Command Failures**: Graceful degradation with user feedback
- **Analysis Errors**: Partial results display with error reporting
- **UI Errors**: Fallback content and error boundaries
- **Configuration Errors**: Default values with validation warnings

## Testing Strategy

### 1. Unit Tests Structure

```typescript
// Each module will have corresponding test files
src/test/
├── core/
│   ├── extension-manager.test.ts
│   ├── command-manager.test.ts
│   ├── analysis-manager.test.ts
│   ├── ui-manager.test.ts
│   └── configuration-manager.test.ts
├── services/
│   ├── workspace-service.test.ts
│   ├── git-service.test.ts
│   └── validation-service.test.ts
└── integration/
    └── extension-integration.test.ts
```

### 2. Mock Strategy

```typescript
// Mock interfaces for testing
export interface MockAnalyzerRunner {
    runAnalysis: jest.Mock;
    cancelAnalysis: jest.Mock;
}

export interface MockUIManager {
    showModuleGraph: jest.Mock;
    showAnalysisDashboard: jest.Mock;
    updateStatusBar: jest.Mock;
}
```

## Implementation Approach

### Phase 1: Core Infrastructure
1. Create base interfaces and types
2. Implement ExtensionManager as main orchestrator
3. Create ConfigurationManager for settings handling
4. Set up error handling infrastructure

### Phase 2: Service Extraction
1. Extract CommandManager with all command definitions
2. Extract AnalysisManager for analysis orchestration
3. Extract UIManager for webview/modal handling
4. Extract WorkspaceService for file watching

### Phase 3: Specialized Services
1. Extract GitService for git analytics
2. Create ValidationService for reusable validation logic
3. Implement proper dependency injection
4. Add comprehensive error boundaries

### Phase 4: Integration and Testing
1. Update main extension.ts to use new architecture
2. Ensure all existing functionality works
3. Add unit tests for each module
4. Performance testing and optimization

## Migration Strategy

### 1. Backward Compatibility
- All existing commands and functionality preserved
- Same user interface and behavior
- Configuration settings remain unchanged
- Extension activation/deactivation unchanged

### 2. Incremental Migration
- Extract one module at a time
- Test each extraction thoroughly
- Maintain working extension throughout process
- Use feature flags for gradual rollout if needed

### 3. Validation Approach
- Compare before/after functionality
- Automated testing of all commands
- Manual testing of UI components
- Performance benchmarking

## Technical Considerations

### 1. Dependency Management
- Use dependency injection for testability
- Avoid circular dependencies
- Clear service boundaries
- Proper lifecycle management

### 2. Performance Optimization
- Lazy loading of heavy services
- Efficient memory management
- Proper disposal of resources
- Minimal startup impact

### 3. Maintainability
- Clear separation of concerns
- Consistent coding patterns
- Comprehensive documentation
- Type safety throughout

### 4. VS Code Integration
- Proper extension lifecycle handling
- Correct use of VS Code APIs
- Theme and accessibility compliance
- Extension host performance considerations