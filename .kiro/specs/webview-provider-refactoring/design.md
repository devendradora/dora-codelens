# Design Document

## Overview

This design outlines the refactoring of the webview provider architecture to consolidate functionality from `src/webview-provider.ts` into `src/tabbed-webview-provider.ts`, while ensuring the "DoraCodeBird: Show Tech Stack Graph" command displays tech stack information in a comprehensive tabbed interface.

## Architecture

### Current State
- `src/webview-provider.ts`: Large monolithic class (2348+ lines) handling various visualization types
- `src/tabbed-webview-provider.ts`: Focused tabbed interface for analysis data
- Commands route through UI Manager to WebviewProvider for tech stack display

### Target State
- Remove `src/webview-provider.ts` entirely
- Extract core webview functionality into modular utility functions
- Enhance `src/tabbed-webview-provider.ts` with extracted functionality
- Route tech stack commands to tabbed interface instead of standalone webview

## Components and Interfaces

### Core Webview Utilities Module
Create a new module `src/core/webview-utils.ts` containing extracted functionality:

```typescript
// Data transformation utilities
export interface WebviewAnalysisData {
  modules?: ModuleGraphData;
  functions?: CallGraphData;
  techStack?: TechStackData;
  frameworkPatterns?: FrameworkPatternsData;
  gitAnalytics?: GitAnalyticsData;
}

export function convertAnalysisDataForWebview(result: AnalysisResult): WebviewAnalysisData;
export function convertCurrentFileAnalysisData(analysisData: any): WebviewAnalysisData;
export function convertGitAnalyticsData(analysisData: any, analysisType: string): WebviewAnalysisData;

// HTML generation utilities
export function generateWebviewHtml(options: WebviewHtmlOptions): string;
export function generateNonce(): string;
export function getResourceUris(context: vscode.ExtensionContext, webview: vscode.Webview): ResourceUris;

// Message handling utilities
export interface WebviewMessage {
  command: string;
  data?: any;
}

export function createMessageHandler(handlers: MessageHandlerMap): (message: WebviewMessage) => void;
```

### Enhanced Tabbed Webview Provider
Extend the existing `TabbedWebviewProvider` with:

1. **Tech Stack Display Method**
   ```typescript
   public showTechStackGraph(analysisData: any): void {
     this.analysisData = analysisData;
     this.currentTab = 'techstack';
     this.createOrShowWebview();
     this.postUpdateData();
   }
   ```

2. **Enhanced Tab Management**
   - Support for additional analysis views
   - Improved data transformation for tech stack display
   - Better error handling and loading states

3. **Integrated Webview Utilities**
   - Use extracted HTML generation functions
   - Leverage shared data transformation utilities
   - Implement consistent message handling patterns

### UI Manager Integration
Update `src/core/ui-manager.ts`:

```typescript
public async showTechStackGraph(analysisData: any): Promise<void> {
  this.log('Showing tech stack graph in tabbed view');
  
  try {
    // Use tabbed webview provider instead of standalone webview
    this.tabbedWebviewProvider.showTechStackGraph(analysisData);
    this.log('Tech stack graph displayed successfully in tabbed view');
  } catch (error) {
    this.logError('Failed to show tech stack graph', error);
    vscode.window.showErrorMessage('Failed to show tech stack graph. Check output for details.');
  }
}
```

## Data Models

### Tech Stack Data Structure
```typescript
export interface TechStackData {
  libraries: Library[];
  pythonVersion: string;
  frameworks: Framework[];
  packageManager: "pip" | "poetry" | "pipenv" | "conda";
}

export interface Library {
  name: string;
  version?: string;
  category?: string;
  description?: string;
}

export interface Framework {
  name: string;
  version?: string;
  type: "web" | "testing" | "data" | "ml" | "other";
}
```

### Tabbed View Data Structure
```typescript
export interface TabbedAnalysisData {
  techStack?: TechStackData;
  modules?: ModuleGraphData;
  functions?: CallGraphData;
  currentFile?: CurrentFileData;
  gitAnalytics?: GitAnalyticsData;
}
```

## Error Handling

### Graceful Degradation
1. **Missing Tech Stack Data**: Display informative message with suggestions to run full analysis
2. **Webview Creation Failures**: Provide fallback text-based display
3. **Data Transformation Errors**: Log detailed errors and show user-friendly messages
4. **Resource Loading Issues**: Implement retry mechanisms and fallback content

### Error Recovery
1. **Webview Disposal**: Properly clean up resources and reset state
2. **Message Handling Failures**: Queue messages and retry when webview becomes available
3. **Data Update Failures**: Maintain previous state and notify user of issues

## Testing Strategy

### Unit Tests
1. **Webview Utilities**: Test data transformation functions independently
2. **Message Handling**: Verify correct routing and processing of webview messages
3. **HTML Generation**: Validate generated HTML structure and security policies
4. **Error Scenarios**: Test graceful handling of various failure conditions

### Integration Tests
1. **Command Flow**: Test complete flow from command execution to webview display
2. **Tab Switching**: Verify smooth transitions between different analysis views
3. **Data Updates**: Test real-time updates when analysis data changes
4. **Resource Management**: Verify proper cleanup and resource management

### End-to-End Tests
1. **Tech Stack Command**: Test complete "Show Tech Stack Graph" command execution
2. **Multi-Tab Workflow**: Test switching between tabs with different data types
3. **Error Recovery**: Test recovery from various error conditions
4. **Performance**: Verify acceptable performance with large datasets

## Migration Strategy

### Phase 1: Extract Core Utilities
1. Create `src/core/webview-utils.ts` with extracted functions
2. Update imports in existing code to use extracted utilities
3. Verify all existing functionality continues to work

### Phase 2: Enhance Tabbed Provider
1. Add tech stack display capability to `TabbedWebviewProvider`
2. Implement enhanced HTML generation for tech stack view
3. Add comprehensive error handling and loading states

### Phase 3: Update Command Routing
1. Modify UI Manager to route tech stack commands to tabbed provider
2. Update command handlers to use new routing
3. Test command execution and verify expected behavior

### Phase 4: Remove Legacy Code
1. Remove `src/webview-provider.ts` file
2. Update all references to use new architecture
3. Clean up unused imports and dependencies
4. Update tests to reflect new architecture

## Security Considerations

### Content Security Policy
- Maintain strict CSP for webview content
- Ensure nonce-based script execution
- Validate all user-provided data before display

### Data Sanitization
- Sanitize all analysis data before rendering
- Prevent XSS through proper HTML escaping
- Validate message data from webview

### Resource Access
- Limit webview resource access to necessary directories
- Use proper URI schemes for resource loading
- Implement proper error handling for resource failures