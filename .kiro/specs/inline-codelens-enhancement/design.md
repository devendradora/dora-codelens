# Design Document

## Overview

The inline CodeLens enhancement transforms DoraCodeLens from a webview-based analysis tool to an inline code annotation system similar to GitLens. The system will automatically analyze Python files in the background when opened and display complexity metrics directly in the editor using VS Code's CodeLens API.

## Architecture

### Core Components

1. **Background Analysis Manager**: Handles automatic file analysis without UI interruption
2. **CodeLens Provider Enhancement**: Enhanced to show complexity metrics inline
3. **File Event Handler**: Monitors file opening events to trigger background analysis
4. **Analysis Cache Manager**: Manages cached results for performance optimization
5. **UI State Manager**: Prevents unwanted webview openings during background analysis

### Data Flow

```
File Opened → Background Analysis → Cache Check → Python Analysis → CodeLens Update → Inline Display
```

## Components and Interfaces

### 1. Background Analysis Manager

```typescript
interface BackgroundAnalysisManager {
  analyzeFileInBackground(document: vscode.TextDocument): Promise<void>;
  isAnalyzing(filePath: string): boolean;
  cancelAnalysis(filePath: string): void;
  getAnalysisProgress(filePath: string): AnalysisProgress;
}

interface AnalysisProgress {
  status: 'queued' | 'analyzing' | 'completed' | 'failed';
  startTime: number;
  estimatedCompletion?: number;
}
```

### 2. Enhanced CodeLens Provider

```typescript
interface InlineComplexityData {
  functionName: string;
  complexity: number;
  complexityLevel: 'low' | 'medium' | 'high';
  references: number;
  lineCount: number;
  range: vscode.Range;
}

interface CodeLensDisplayOptions {
  showComplexity: boolean;
  showReferences: boolean;
  showLineCount: boolean;
  compactMode: boolean;
}
```

### 3. File Event Handler

```typescript
interface FileEventHandler {
  onDidOpenTextDocument(document: vscode.TextDocument): void;
  onDidChangeTextDocument(event: vscode.TextDocumentChangeEvent): void;
  shouldAnalyzeFile(document: vscode.TextDocument): boolean;
}
```

### 4. Analysis Cache Manager

```typescript
interface AnalysisCacheManager {
  getCachedAnalysis(filePath: string, fileHash: string): AnalysisResult | null;
  setCachedAnalysis(filePath: string, fileHash: string, result: AnalysisResult): void;
  invalidateCache(filePath: string): void;
  getFileHash(document: vscode.TextDocument): string;
}
```

## Data Models

### Analysis Result Structure

```typescript
interface BackgroundAnalysisResult {
  filePath: string;
  fileHash: string;
  timestamp: number;
  functions: FunctionAnalysis[];
  classes: ClassAnalysis[];
  overallComplexity: number;
  analysisTime: number;
}

interface FunctionAnalysis {
  name: string;
  startLine: number;
  endLine: number;
  complexity: number;
  references: number;
  lineCount: number;
  parameters: number;
  hasDocstring: boolean;
}

interface ClassAnalysis {
  name: string;
  startLine: number;
  endLine: number;
  methods: FunctionAnalysis[];
  totalComplexity: number;
  lineCount: number;
}
```

### CodeLens Display Configuration

```typescript
interface CodeLensDisplayConfig {
  enabled: boolean;
  complexityThresholds: {
    low: number;    // 1-5
    medium: number; // 6-10
    high: number;   // 11+
  };
  displayFormat: {
    showIcons: boolean;
    compactMode: boolean;
    showTooltips: boolean;
  };
  colors: {
    low: string;    // Green
    medium: string; // Yellow
    high: string;   // Red
  };
}
```

## Error Handling

### Background Analysis Errors

1. **Python Process Failures**: Show error indicators in CodeLens with retry options
2. **File Parse Errors**: Display warning CodeLens with diagnostic information
3. **Timeout Handling**: Show progress indicators and allow cancellation
4. **Cache Corruption**: Automatically invalidate and re-analyze

### CodeLens Display Errors

1. **Missing Analysis Data**: Show placeholder CodeLens with "Analysis pending" message
2. **Invalid Function Ranges**: Skip invalid functions and log warnings
3. **Performance Issues**: Implement batching and throttling for large files

## Testing Strategy

### Unit Tests

1. **Background Analysis Manager Tests**
   - Test automatic analysis triggering
   - Test cache hit/miss scenarios
   - Test error handling and recovery

2. **CodeLens Provider Tests**
   - Test inline complexity display
   - Test different complexity levels and colors
   - Test click handlers and tooltips

3. **File Event Handler Tests**
   - Test file opening detection
   - Test file change detection
   - Test analysis queuing

### Integration Tests

1. **End-to-End Workflow Tests**
   - Open Python file → Background analysis → CodeLens display
   - File modification → Re-analysis → CodeLens update
   - Cache validation and invalidation

2. **Performance Tests**
   - Large file handling (1000+ lines)
   - Multiple file opening scenarios
   - Memory usage during background analysis

### User Experience Tests

1. **UI Responsiveness Tests**
   - File opening speed with background analysis
   - CodeLens rendering performance
   - Webview prevention verification

2. **Visual Tests**
   - CodeLens appearance and positioning
   - Icon and color accuracy
   - Tooltip content and formatting

## Implementation Phases

### Phase 1: Background Analysis Infrastructure
- Implement BackgroundAnalysisManager
- Create file event handlers
- Set up analysis queuing system

### Phase 2: CodeLens Enhancement
- Enhance CodeLens provider for inline display
- Implement complexity visualization
- Add click handlers for detailed information

### Phase 3: Cache and Performance
- Implement analysis caching
- Add performance optimizations
- Implement progress indicators

### Phase 4: UI State Management
- Prevent automatic webview opening
- Add configuration options
- Implement user preferences

## Configuration Options

### VS Code Settings

```json
{
  "doracodelens.inlineAnalysis.enabled": true,
  "doracodelens.inlineAnalysis.autoAnalyze": true,
  "doracodelens.inlineAnalysis.showComplexity": true,
  "doracodelens.inlineAnalysis.showReferences": true,
  "doracodelens.inlineAnalysis.showLineCount": true,
  "doracodelens.inlineAnalysis.compactMode": false,
  "doracodelens.inlineAnalysis.complexityThresholds": {
    "low": 5,
    "medium": 10,
    "high": 15
  },
  "doracodelens.webview.preventAutoOpen": true
}
```

## Performance Considerations

### Analysis Performance
- Use file content hashing to detect changes
- Implement analysis result caching with TTL
- Queue analysis requests to prevent overwhelming Python processes
- Use incremental analysis for file changes

### CodeLens Performance
- Batch CodeLens updates to reduce UI redraws
- Implement virtual scrolling for large files
- Cache CodeLens ranges and content
- Throttle updates during rapid file changes

### Memory Management
- Limit cache size with LRU eviction
- Clean up analysis results for closed files
- Monitor Python process memory usage
- Implement garbage collection for old cache entries