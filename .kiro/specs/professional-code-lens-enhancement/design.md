# Design Document

## Overview

This design enhances the existing DoraCodeLens code lens functionality to provide a professional, developer-friendly inline analysis experience. The enhancement transforms the current basic toggle functionality into a comprehensive code quality assistant that displays complexity metrics, provides actionable suggestions, and uses clear, context-aware command naming.

The design leverages the existing complexity analysis infrastructure while adding new suggestion logic, improved visual presentation, and enhanced user interaction patterns.

## Architecture

### Core Components

#### 1. Enhanced Code Lens Provider (`DoraCodeLensProvider`)
- **Current State**: Basic complexity display with toggle functionality
- **Enhancement**: Multi-layered information display with suggestions and color-coded indicators
- **Key Changes**:
  - Complexity display with color coding (green/yellow/red)
  - Suggestion generation based on code analysis
  - Professional formatting and messaging
  - Performance optimization for large files

#### 2. Dynamic Command Manager (`CodeLensCommandManager`)
- **Purpose**: Manages context-aware command registration and state-dependent labeling
- **Responsibilities**:
  - Dynamic command title updates based on current state
  - Command registration/deregistration
  - State persistence and restoration
  - Tooltip management

#### 3. Suggestion Engine (`CodeLensSuggestionEngine`)
- **Purpose**: Analyzes code patterns and generates actionable suggestions
- **Input**: Function metadata, complexity scores, AST analysis data
- **Output**: Prioritized list of suggestions with severity levels
- **Rules Engine**: Configurable rules for different suggestion types

#### 4. Visual Formatter (`CodeLensFormatter`)
- **Purpose**: Handles professional presentation of code lens information
- **Responsibilities**:
  - Color-coded complexity indicators
  - Consistent text formatting
  - Icon integration
  - Multi-line suggestion display

### Data Flow

```
Python Analysis → Complexity Data → Suggestion Engine → Visual Formatter → Code Lens Display
                                                    ↓
Command Manager ← User Interaction ← VS Code API ← Enhanced Provider
```

## Components and Interfaces

### 1. Enhanced Code Lens Data Structure

```typescript
interface EnhancedCodeLensData {
    range: vscode.Range;
    functionName: string;
    complexity: {
        cyclomatic: number;
        level: 'low' | 'medium' | 'high';
        color: 'green' | 'yellow' | 'red';
    };
    suggestions: CodeLensSuggestion[];
    metadata: {
        lineCount: number;
        parameterCount: number;
        hasDocstring: boolean;
        references: number;
    };
}

interface CodeLensSuggestion {
    type: 'complexity' | 'documentation' | 'parameters' | 'length' | 'performance';
    message: string;
    severity: 'info' | 'warning' | 'error';
    actionable: boolean;
    quickFix?: string;
}
```

### 2. Command Interface

```typescript
interface CodeLensCommand {
    id: string;
    title: string;
    tooltip: string;
    enabled: boolean;
    contextual: boolean; // Changes based on state
}

interface CommandState {
    codeLensEnabled: boolean;
    lastUpdate: number;
    activeDocument?: string;
}
```

### 3. Suggestion Rules Engine

```typescript
interface SuggestionRule {
    id: string;
    name: string;
    condition: (data: EnhancedCodeLensData) => boolean;
    generate: (data: EnhancedCodeLensData) => CodeLensSuggestion;
    priority: number;
}
```

## Data Models

### 1. Code Lens Configuration

```typescript
interface CodeLensConfig {
    enabled: boolean;
    showComplexity: boolean;
    showSuggestions: boolean;
    maxSuggestionsPerFunction: number;
    complexityThresholds: {
        low: number;    // 1-5
        medium: number; // 6-10
        high: number;   // 11+
    };
    suggestionTypes: {
        complexity: boolean;
        documentation: boolean;
        parameters: boolean;
        length: boolean;
        performance: boolean;
    };
}
```

### 2. Analysis Integration

```typescript
interface AnalysisIntegration {
    complexity: ComplexityAnalysis;
    ast: ASTAnalysis;
    patterns: CodePatternAnalysis;
}

interface ComplexityAnalysis {
    cyclomatic: number;
    cognitive: number;
    level: ComplexityLevel;
    maintainabilityIndex?: number;
}
```

## Error Handling

### 1. Graceful Degradation
- **No Analysis Data**: Display basic "Analysis Pending" indicator
- **Partial Data**: Show available metrics, hide unavailable ones
- **Analysis Errors**: Fall back to basic complexity calculation
- **Performance Issues**: Implement throttling and caching

### 2. Error Recovery
- **Provider Failures**: Automatic re-registration with exponential backoff
- **Command Errors**: User-friendly error messages with recovery suggestions
- **State Corruption**: Automatic state reset with user notification

### 3. Logging Strategy
- **Debug Level**: Detailed analysis data and suggestion generation
- **Info Level**: State changes and user interactions
- **Warning Level**: Performance issues and fallback scenarios
- **Error Level**: Critical failures requiring user attention

## Testing Strategy

### 1. Unit Tests

#### Code Lens Provider Tests
```typescript
describe('DoraCodeLensProvider', () => {
    test('should generate complexity indicators for functions');
    test('should handle missing analysis data gracefully');
    test('should apply correct color coding based on complexity');
    test('should generate appropriate suggestions');
});
```

#### Suggestion Engine Tests
```typescript
describe('CodeLensSuggestionEngine', () => {
    test('should suggest documentation for undocumented functions');
    test('should suggest refactoring for high complexity functions');
    test('should prioritize suggestions correctly');
    test('should handle edge cases in code analysis');
});
```

#### Command Manager Tests
```typescript
describe('CodeLensCommandManager', () => {
    test('should update command titles based on state');
    test('should persist state correctly');
    test('should handle command registration failures');
});
```

### 2. Integration Tests

#### End-to-End Workflow
- Test complete analysis → code lens display → user interaction flow
- Verify state persistence across VS Code sessions
- Test performance with large codebases
- Validate suggestion accuracy across different code patterns

#### VS Code Integration
- Test code lens display in various editor themes
- Verify command palette integration
- Test keyboard shortcuts and accessibility
- Validate webview integration for detailed analysis

### 3. Performance Tests

#### Scalability Testing
- Test with files containing 100+ functions
- Measure memory usage with large analysis datasets
- Verify responsiveness during active editing
- Test concurrent analysis and display operations

#### Optimization Validation
- Verify caching effectiveness
- Test throttling mechanisms
- Measure suggestion generation performance
- Validate lazy loading of detailed analysis

## Implementation Phases

### Phase 1: Command Enhancement
1. Implement dynamic command titles (Enable/Disable Code Lens)
2. Add context-aware tooltips
3. Update command registration logic
4. Test state-dependent behavior

### Phase 2: Visual Enhancement
1. Implement color-coded complexity display
2. Add professional formatting
3. Integrate icons and visual indicators
4. Test across different VS Code themes

### Phase 3: Suggestion Engine
1. Implement core suggestion rules
2. Add suggestion prioritization
3. Create actionable suggestion display
4. Test suggestion accuracy and relevance

### Phase 4: Integration & Polish
1. Integrate with existing analysis pipeline
2. Add performance optimizations
3. Implement comprehensive error handling
4. Conduct end-to-end testing

### Phase 5: Advanced Features
1. Add quick fix actions for suggestions
2. Implement suggestion customization
3. Add detailed analysis integration
4. Performance monitoring and optimization