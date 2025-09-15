# Design Document

## Overview

This design enhances the DoraCodeLens extension with improved context menu structure, inline code lens functionality, sidebar icon updates, and sidebar content improvements. The solution focuses on creating a hierarchical menu system, implementing proper inline analysis display with color-coded complexity indicators, updating the sidebar branding, and populating the sidebar with useful project information.

## Architecture

### Context Menu Enhancement
- **Hierarchical Menu Structure**: Replace flat "Code Lens (On/Off)" commands with a "Code Lens Inline >" submenu containing "Enable" and "Disable" options
- **Dynamic Menu State**: Show only relevant options based on current code lens state
- **Menu Integration**: Maintain existing menu structure while adding the new submenu

### Inline Code Lens System
- **Background Analysis**: Implement automatic file analysis on document open without triggering webviews
- **Cache-First Approach**: Use cached analysis results when available, perform new analysis when cache is missing
- **Color-Coded Indicators**: Display complexity metrics with visual indicators (🟢 Low, 🟡 Medium, 🔴 High)
- **GitLens-Style Display**: Compact inline format showing "🔴 15 complexity • 3 references • 25 lines"

### Sidebar Enhancement
- **Icon Update**: Replace current sidebar icon with "resources/dora-code-lens-kiro.png"
- **Content Population**: Add useful project information and quick actions
- **Responsive Layout**: Ensure proper display across different VS Code themes

## Components and Interfaces

### 1. Enhanced Context Menu System

```typescript
interface ContextMenuConfig {
  submenuId: string;
  submenuLabel: string;
  enableCommand: string;
  disableCommand: string;
  contextConditions: string[];
}

interface MenuState {
  isCodeLensEnabled: boolean;
  isInPythonFile: boolean;
  availableActions: string[];
}
```

**Implementation Details:**
- Modify `package.json` to add submenu configuration
- Update command registration to use hierarchical structure
- Implement dynamic menu visibility based on code lens state

### 2. Background Analysis Manager

```typescript
interface BackgroundAnalysisManager {
  analyzeFileInBackground(document: vscode.TextDocument): Promise<AnalysisResult>;
  getCachedAnalysis(filePath: string): AnalysisResult | null;
  setCachedAnalysis(filePath: string, result: AnalysisResult): void;
  invalidateCache(filePath: string): void;
}

interface AnalysisResult {
  filePath: string;
  timestamp: number;
  functions: FunctionAnalysis[];
  classes: ClassAnalysis[];
  complexity: ComplexityMetrics;
  status: 'success' | 'error' | 'pending';
}
```

**Implementation Details:**
- Create background analysis service that runs without opening webviews
- Implement file content hashing for cache invalidation
- Add progress indicators during analysis
- Handle analysis errors gracefully

### 3. Enhanced Code Lens Provider

```typescript
interface EnhancedCodeLensData {
  range: vscode.Range;
  functionName: string;
  complexity: ComplexityInfo;
  references: number;
  lineCount: number;
  displayFormat: 'compact' | 'detailed';
}

interface ComplexityInfo {
  value: number;
  level: 'low' | 'medium' | 'high';
  icon: '🟢' | '🟡' | '🔴';
  threshold: ComplexityThresholds;
}
```

**Implementation Details:**
- Enhance existing `DoraCodeLensProvider` to support background analysis
- Remove "analyze full project" code lens from file tops
- Implement GitLens-style compact display format
- Add color-coded complexity indicators

### 4. Sidebar Content Manager

```typescript
interface SidebarContentProvider {
  getQuickActions(): QuickAction[];
  getRecentAnalysis(): AnalysisHistory[];
  getProjectOverview(): ProjectMetrics;
  getAnalysisStatus(): AnalysisStatus;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  command: string;
  tooltip: string;
}
```

**Implementation Details:**
- Create sidebar tree data provider
- Implement sections for quick actions, recent analysis, project overview
- Add refresh and settings actions
- Handle empty states with helpful getting started information

## Data Models

### Analysis Cache Model
```typescript
interface AnalysisCache {
  [filePath: string]: {
    result: AnalysisResult;
    contentHash: string;
    timestamp: number;
    expiresAt: number;
  };
}
```

### Sidebar Data Model
```typescript
interface SidebarData {
  quickActions: QuickAction[];
  recentAnalysis: {
    timestamp: number;
    type: 'full' | 'current-file' | 'git' | 'database';
    status: 'success' | 'error';
    duration: number;
  }[];
  projectMetrics: {
    totalFiles: number;
    totalFunctions: number;
    averageComplexity: number;
    lastAnalyzed: number;
  };
  analysisStatus: {
    isRunning: boolean;
    currentOperation: string;
    progress: number;
  };
}
```

### Menu Configuration Model
```typescript
interface MenuConfiguration {
  contextMenus: {
    [menuId: string]: {
      label: string;
      items: MenuItem[];
      conditions: string[];
    };
  };
  commands: {
    [commandId: string]: {
      title: string;
      category: string;
      when: string;
    };
  };
}
```

## Error Handling

### Background Analysis Errors
- **Analysis Timeout**: Show placeholder code lens with retry option
- **Python Path Issues**: Display configuration guidance in code lens
- **File Parse Errors**: Show error indicator with diagnostic information
- **Cache Corruption**: Automatically invalidate and retry analysis

### Menu System Errors
- **Command Registration Failures**: Fallback to basic menu structure
- **State Synchronization Issues**: Reset to default state with user notification
- **Context Detection Errors**: Default to showing all available options

### Sidebar Errors
- **Data Loading Failures**: Show error state with refresh option
- **Icon Loading Issues**: Fallback to default VS Code icons
- **Content Rendering Errors**: Display minimal sidebar with error message

## Testing Strategy

### Unit Tests
- **Background Analysis Manager**: Test caching, analysis execution, error handling
- **Enhanced Code Lens Provider**: Test code lens generation, complexity calculation, display formatting
- **Sidebar Content Provider**: Test data retrieval, formatting, error states
- **Menu System**: Test command registration, state management, visibility conditions

### Integration Tests
- **End-to-End Analysis Flow**: Test complete flow from file open to code lens display
- **Menu Interaction**: Test submenu navigation and command execution
- **Sidebar Integration**: Test sidebar population and interaction with analysis system
- **Cache Behavior**: Test cache hit/miss scenarios and invalidation

### Performance Tests
- **Large File Handling**: Test code lens performance with large Python files
- **Cache Efficiency**: Measure cache hit rates and memory usage
- **Background Analysis Impact**: Monitor VS Code responsiveness during analysis
- **Sidebar Rendering**: Test sidebar performance with large project data

## Implementation Plan

### Phase 1: Context Menu Enhancement
1. Update `package.json` with submenu configuration
2. Modify command registration in `CommandManager`
3. Update menu visibility conditions
4. Test menu functionality

### Phase 2: Background Analysis System
1. Create `BackgroundAnalysisManager` service
2. Implement analysis caching with file content hashing
3. Add progress indicators and error handling
4. Integrate with existing analysis pipeline

### Phase 3: Enhanced Code Lens Provider
1. Modify `DoraCodeLensProvider` to use background analysis
2. Remove "analyze full project" code lens from file tops
3. Implement color-coded complexity indicators
4. Add GitLens-style compact display format

### Phase 4: Sidebar Enhancement
1. Update sidebar icon in `package.json`
2. Create `SidebarContentProvider` with tree data provider
3. Implement quick actions, recent analysis, and project overview sections
4. Add refresh and settings functionality

### Phase 5: Integration and Testing
1. Integrate all components
2. Implement comprehensive error handling
3. Add unit and integration tests
4. Performance optimization and validation