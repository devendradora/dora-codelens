# Design Document

## Overview

This design addresses three critical missing features in the DoraCodeBirdView extension: fixing the database schema graph visualization, integrating existing JSON utilities into the context menu, and adding code lens management controls after full code analysis. The solution involves fixing the database schema webview's graph initialization, creating command handlers for JSON utilities, and implementing a code lens provider with toggle functionality.

## Architecture

The implementation follows the existing extension architecture with dedicated command handlers, webview providers, and service integration. The solution leverages the existing infrastructure while adding new components for the missing functionality.

### Component Overview

```
Extension Core
├── Command Manager (Enhanced)
│   ├── JSON Utility Commands
│   └── Code Lens Toggle Commands
├── Database Schema Webview (Fixed)
│   ├── Graph Initialization Fix
│   └── Cytoscape.js Integration
├── JSON Utilities Service (New)
│   ├── Format JSON Handler
│   ├── Validate JSON Handler
│   └── Tree View Handler
└── Code Lens Provider (New)
    ├── Complexity Metrics Lens
    ├── Function Reference Lens
    └── Toggle Management
```

## Components and Interfaces

### 1. Database Schema Graph Fix

**Problem Analysis:**
- The database schema webview exists but the graph is not rendering
- The `initializeSchemaGraph()` function is called but the graph container may not be properly initialized
- Missing or incorrect data transformation for Cytoscape.js

**Solution:**
- Fix the graph initialization timing in the webview
- Ensure proper data structure transformation for Cytoscape.js
- Add error handling and fallback states for empty data
- Verify CSS and JavaScript resource loading

**Interface Changes:**
```typescript
interface DatabaseSchemaWebview {
  // Enhanced graph initialization
  private initializeSchemaGraph(): void;
  private validateSchemaData(data: any): boolean;
  private transformDataForCytoscape(data: any): CytoscapeElements;
}
```

### 2. JSON Utilities Context Menu Integration

**Problem Analysis:**
- JSON utility code exists in `src-backup/json-utilities.ts` but is not integrated
- Context menu entries are defined in `package.json` but commands are not implemented
- Missing command handlers for JSON operations

**Solution:**
- Create a new `JsonUtilitiesService` based on existing backup code
- Implement command handlers for JSON formatting, validation, and tree view
- Register commands in the command manager
- Add proper error handling and user feedback

**New Components:**
```typescript
// New service for JSON operations
class JsonUtilitiesService {
  public async formatJsonCommand(): Promise<void>;
  public async validateJsonCommand(): Promise<void>;
  public async showJsonTreeView(): Promise<void>;
}

// Command handlers
class JsonCommandHandlers {
  public async handleFormatJson(): Promise<void>;
  public async handleJsonTreeView(): Promise<void>;
}
```

### 3. Code Lens Provider and Toggle

**Problem Analysis:**
- No code lens functionality exists in the current codebase
- Need to create code lens provider from scratch
- Requires integration with analysis results and user preferences

**Solution:**
- Create a new `CodeLensProvider` that shows complexity metrics and function references
- Add toggle functionality in the full code analysis webview
- Implement state management for code lens preferences
- Integrate with existing analysis data

**New Components:**
```typescript
// Code lens provider
class DoraCodeLensProvider implements vscode.CodeLensProvider {
  public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[];
  public resolveCodeLens(codeLens: vscode.CodeLens): vscode.CodeLens;
}

// Code lens manager
class CodeLensManager {
  public enableCodeLens(): void;
  public disableCodeLens(): void;
  public isEnabled(): boolean;
  public updateFromAnalysisData(data: any): void;
}
```

## Data Models

### Database Schema Graph Data
```typescript
interface SchemaGraphData {
  nodes: SchemaNode[];
  edges: SchemaEdge[];
}

interface SchemaNode {
  id: string;
  label: string;
  type: 'table' | 'view';
  data: {
    columns: Column[];
    primaryKeys: string[];
    foreignKeys: ForeignKey[];
  };
}

interface SchemaEdge {
  id: string;
  source: string;
  target: string;
  type: 'foreign_key' | 'reference';
  label?: string;
}
```

### JSON Utilities Data
```typescript
interface JsonValidationResult {
  isValid: boolean;
  errors: JsonError[];
  warnings?: JsonWarning[];
  formattedContent?: string;
}

interface JsonTreeViewData {
  nodes: TreeNode[];
  expandedPaths: string[];
  metadata: TreeMetadata;
}
```

### Code Lens Data
```typescript
interface CodeLensData {
  range: vscode.Range;
  command: vscode.Command;
  type: 'complexity' | 'references' | 'navigation';
  metadata: {
    functionName: string;
    complexity?: number;
    referenceCount?: number;
  };
}
```

## Error Handling

### Database Schema Graph
- Validate schema data structure before graph initialization
- Show empty state with retry button when no data is available
- Handle Cytoscape.js initialization failures gracefully
- Log detailed error information for debugging

### JSON Utilities
- Validate JSON syntax before processing
- Provide detailed error messages with line/column information
- Handle large JSON files with performance warnings
- Graceful fallback for malformed JSON

### Code Lens Provider
- Handle missing analysis data gracefully
- Validate document language before providing code lenses
- Cache analysis results to avoid repeated processing
- Handle provider registration/unregistration safely

## Testing Strategy

### Unit Tests
- Database schema data transformation functions
- JSON validation and formatting logic
- Code lens provider functionality
- Command handler error scenarios

### Integration Tests
- Database schema webview graph rendering
- JSON utilities context menu integration
- Code lens toggle functionality
- Full workflow from analysis to code lens display

### Manual Testing
- Test database schema analysis with various project types
- Verify JSON utilities work with different JSON file sizes
- Test code lens toggle persistence across sessions
- Validate context menu appears in appropriate contexts

## Implementation Plan

### Phase 1: Database Schema Graph Fix
1. Analyze current graph initialization issues
2. Fix data transformation for Cytoscape.js
3. Improve error handling and empty states
4. Test with various database schema structures

### Phase 2: JSON Utilities Integration
1. Create JsonUtilitiesService from existing backup code
2. Implement command handlers for JSON operations
3. Register commands in CommandManager
4. Test context menu integration

### Phase 3: Code Lens Implementation
1. Create CodeLensProvider class
2. Implement CodeLensManager for toggle functionality
3. Add toggle controls to full code analysis webview
4. Integrate with existing analysis data

### Phase 4: Integration and Testing
1. Ensure all components work together
2. Add comprehensive error handling
3. Implement user preference persistence
4. Conduct thorough testing across different scenarios