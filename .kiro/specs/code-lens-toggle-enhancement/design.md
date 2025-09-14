# Design Document

## Overview

This design enhances the existing DoraCodeLens extension by replacing the current "Toggle Code Lens" functionality with separate "Code Lens -> On" and "Code Lens -> Off" commands. When enabled, the code lens will display complexity indicators above functions, methods, and classes using cached analysis results or automatically triggering current file analysis when needed. The design also removes inline analysis commands to provide a cleaner code viewing experience.

## Architecture

### Current State Analysis

The existing system has:
- `DoraCodeLensProvider` class that implements VS Code's `CodeLensProvider` interface
- `CodeLensCommandManager` for managing command states and persistence
- `CurrentFileAnalysisHandler` for running file-specific analysis
- Toggle functionality through `toggleCodeLens()` method
- State persistence through VS Code's global state
- Complex guidance system that shows inline commands

### Enhanced Architecture

The enhanced system will:
- Replace single toggle command with separate enable/disable commands
- Integrate automatic analysis triggering when code lens is enabled
- Remove inline analysis command display from code lens provider
- Maintain existing complexity calculation and display logic
- Preserve state persistence and configuration management

## Components and Interfaces

### 1. Command Structure Changes

**Current Commands:**
```typescript
"doracodelens.toggleCodeLens" // Single toggle command
```

**New Commands:**
```typescript
"doracodelens.enableCodeLens"  // Enable with "Code Lens -> On" title
"doracodelens.disableCodeLens" // Disable with "Code Lens -> Off" title
```

### 2. Code Lens Provider Enhancements

**Modified `DoraCodeLensProvider` class:**
```typescript
interface EnhancedCodeLensProvider {
  // Existing methods
  enable(): void;
  disable(): void;
  updateAnalysisData(data: any): void;
  
  // New methods
  enableWithAnalysis(): Promise<void>;
  checkCachedResults(filePath: string): any | null;
  triggerCurrentFileAnalysis(document: vscode.TextDocument): Promise<void>;
  
  // Modified behavior
  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[];
}
```

### 3. Analysis Integration

**Cache Management:**
```typescript
interface AnalysisCache {
  getCachedResult(filePath: string): any | null;
  setCachedResult(filePath: string, result: any): void;
  isCacheValid(filePath: string, lastModified: number): boolean;
  invalidateCache(filePath: string): void;
}
```

**Auto-Analysis Trigger:**
```typescript
interface AutoAnalysisTrigger {
  shouldTriggerAnalysis(document: vscode.TextDocument): boolean;
  triggerAnalysis(document: vscode.TextDocument): Promise<any>;
  handleAnalysisResult(result: any, document: vscode.TextDocument): void;
}
```

### 4. Command Manager Updates

**Enhanced `CodeLensCommandManager`:**
```typescript
interface EnhancedCommandManager {
  // State management
  enableCodeLens(): Promise<void>;
  disableCodeLens(): void;
  getState(): { enabled: boolean; lastUpdate: number };
  
  // Command registration
  registerEnableDisableCommands(): void;
  updateCommandVisibility(): void;
}
```

## Data Models

### 1. Code Lens State

```typescript
interface CodeLensState {
  enabled: boolean;
  lastUpdate: number;
  autoAnalysisEnabled: boolean;
  cachedResults: Map<string, CachedAnalysisResult>;
}

interface CachedAnalysisResult {
  filePath: string;
  result: any;
  timestamp: number;
  fileHash: string; // For change detection
}
```

### 2. Complexity Display Data

```typescript
interface ComplexityIndicator {
  range: vscode.Range;
  complexity: number;
  level: 'low' | 'medium' | 'high';
  color: 'green' | 'yellow' | 'red';
  functionName: string;
  type: 'function' | 'method' | 'class';
}
```

### 3. Configuration Schema

```typescript
interface CodeLensConfig {
  enabled: boolean;
  showComplexity: boolean;
  autoTriggerAnalysis: boolean;
  complexityThresholds: {
    low: number;
    medium: number;
    high: number;
  };
  cacheTimeout: number; // milliseconds
}
```

## Error Handling

### 1. Analysis Failure Scenarios

**Cache Miss + Analysis Failure:**
- Show basic code lens without complexity data
- Display error indicator with retry option
- Log detailed error information
- Graceful degradation to manual analysis

**Python Process Errors:**
- Timeout handling with user notification
- Process crash recovery
- Invalid result handling
- Python path configuration issues

### 2. State Recovery

**Extension Restart:**
- Restore previous enable/disable state
- Validate cached results on startup
- Re-register commands with correct titles
- Handle corrupted state gracefully

**File Change Detection:**
- Monitor file modifications
- Invalidate cache when files change
- Re-trigger analysis for modified files
- Handle unsaved file scenarios

### 3. Error User Experience

```typescript
interface ErrorHandling {
  showRetryOption(): void;
  fallbackToBasicDisplay(): void;
  logDetailedError(error: any): void;
  showUserFriendlyMessage(message: string): void;
}
```

## Testing Strategy

### 1. Unit Tests

**Command Registration Tests:**
- Verify enable/disable commands are registered correctly
- Test command title updates based on state
- Validate state persistence across sessions
- Test configuration loading and validation

**Code Lens Provider Tests:**
- Test complexity indicator generation
- Verify cache hit/miss scenarios
- Test automatic analysis triggering
- Validate error handling and fallback behavior

**Analysis Integration Tests:**
- Test current file analysis integration
- Verify cache management functionality
- Test file change detection
- Validate result processing and display

### 2. Integration Tests

**End-to-End Workflow Tests:**
- Enable code lens → trigger analysis → display results
- Cache validation and invalidation scenarios
- File modification and re-analysis flow
- Error scenarios and recovery testing

**VS Code Integration Tests:**
- Command palette integration
- Context menu functionality
- Webview interaction testing
- Extension activation and deactivation

### 3. Performance Tests

**Large File Handling:**
- Test code lens performance with large Python files
- Validate cache effectiveness
- Test analysis timeout scenarios
- Memory usage monitoring

**Concurrent Operations:**
- Multiple file analysis scenarios
- Cache contention testing
- Command execution during analysis
- State consistency validation

### 4. User Experience Tests

**First-Time User Flow:**
- Extension activation experience
- Initial code lens enable flow
- Analysis result display
- Error scenario handling

**Existing User Migration:**
- State migration from toggle to enable/disable
- Configuration preservation
- Backward compatibility testing
- User preference migration

## Implementation Phases

### Phase 1: Command Structure Update
- Replace toggle command with enable/disable commands
- Update command registration and titles
- Modify command manager state handling
- Update package.json contributions

### Phase 2: Analysis Integration
- Implement cache checking in code lens provider
- Add automatic analysis triggering
- Integrate current file analysis handler
- Handle analysis results and display

### Phase 3: Inline Command Removal
- Remove guidance system integration from code lens
- Clean up inline analysis command display
- Simplify code lens provider logic
- Update error handling for cleaner display

### Phase 4: Testing and Polish
- Comprehensive testing suite
- Performance optimization
- User experience refinement
- Documentation updates