# Design Document

## Overview

The Interactive Enhanced Code Graph is currently failing to load due to issues in the data processing pipeline between the analyzer output and the frontend visualization. The reference implementation in `analyzer/dora.html` demonstrates a working solution using Cytoscape.js with proper data handling, interactive features, and responsive design. This design will integrate the proven reference approach into the existing frontend architecture while maintaining compatibility with the current analyzer output format.

## Architecture

### Current Problem Analysis
1. **Data Processing Issue**: The frontend `prepareGraphData()` method may not be correctly transforming the analyzer's `code_graph_json` format
2. **Graph Initialization Failure**: The Cytoscape graph initialization is failing, causing the "Loading module graph..." state to persist
3. **Missing Interactive Features**: The current implementation lacks the expand/collapse and interactive features shown in the reference

### Proposed Solution Architecture
1. **Data Transformation Layer**: Adapt the reference data processing logic to handle the analyzer's `code_graph_json` format
2. **Graph Rendering Engine**: Integrate the proven Cytoscape implementation from the reference
3. **Interactive Controls**: Implement the expand/collapse and navigation features from the reference
4. **Error Handling**: Add robust error handling to prevent loading failures

## Components and Interfaces

### Data Transformation Component
**Purpose**: Convert analyzer `code_graph_json` to the format expected by the reference implementation

**Current Analyzer Format**:
```typescript
interface CodeGraphNode {
  name: string;
  type: "folder" | "file" | "class" | "function";
  children: CodeGraphNode[];
  calls: CallRelationship[];
  complexity?: ComplexityScore;
  path?: string;
  line_number?: number;
}
```

**Reference Expected Format**:
```typescript
interface ReferenceNode {
  name: string;
  type: "folder" | "file" | "class" | "function";
  children: ReferenceNode[];
  calls?: { target: string[] }[];
  complexity?: { level: "low" | "medium" | "high" };
}
```

**Transformation Logic**:
- Map `CodeGraphNode[]` to `ReferenceNode[]`
- Convert complexity scores to level strings
- Transform call relationships to target arrays
- Preserve hierarchical structure

### Graph Rendering Component
**Purpose**: Render the interactive Cytoscape graph using the reference implementation

**Key Features from Reference**:
- **Node Styling**: Different shapes and colors for folders (rectangles), files (rectangles), classes (hexagons), functions (ellipses)
- **Complexity Color Coding**: Green (low), orange (medium), red (high)
- **Edge Types**: Contains edges (gray) and calls edges (red with arrows)
- **Layout**: Preset positioning with dynamic layout on expand

**Integration Approach**:
- Extract the Cytoscape configuration from `dora.html`
- Adapt the styling to match VS Code theme variables
- Implement the same node positioning and layout logic

### Interactive Controls Component
**Purpose**: Handle user interactions like expand/collapse, search, and navigation

**Features from Reference**:
- **Folder Expansion**: Click folders to expand/collapse children
- **Dynamic Layout**: Automatic layout recalculation on expand
- **Node Positioning**: Smart positioning based on hierarchy level
- **State Management**: Track expanded folders and node visibility

### Error Handling Component
**Purpose**: Provide robust error handling and fallback states

**Error Scenarios**:
- No data available from analyzer
- Data transformation failures
- Cytoscape initialization failures
- Layout calculation errors

**Fallback Strategies**:
- Show empty state with helpful message
- Log detailed error information for debugging
- Provide retry mechanisms where appropriate

## Data Models

### Analyzer Input Format
```typescript
interface AnalysisData {
  code_graph_json: CodeGraphNode[];
  // ... other fields
}

interface CodeGraphNode {
  name: string;
  type: "folder" | "file" | "class" | "function";
  children: CodeGraphNode[];
  calls: CallRelationship[];
  complexity?: {
    cyclomatic: number;
    cognitive: number;
    level: "low" | "medium" | "high";
  };
  path?: string;
  line_number?: number;
}
```

### Cytoscape Graph Format
```typescript
interface CytoscapeData {
  elements: CytoscapeElement[];
  style: CytoscapeStylesheet[];
  layout: CytoscapeLayout;
}

interface CytoscapeElement {
  data: {
    id: string;
    name: string;
    type: string;
    source?: string;  // for edges
    target?: string;  // for edges
  };
  position?: { x: number; y: number };
}
```

## Error Handling

### Data Validation
- Validate `code_graph_json` exists and is an array
- Check node structure integrity before processing
- Handle missing or malformed complexity data gracefully

### Graph Initialization
- Catch Cytoscape initialization errors
- Provide fallback empty state if graph fails to load
- Log detailed error information for debugging

### Runtime Errors
- Handle layout calculation failures
- Manage memory issues with large graphs
- Provide user feedback for recoverable errors

## Testing Strategy

### Unit Testing
- Test data transformation functions with sample analyzer output
- Verify Cytoscape element generation produces valid format
- Test error handling with malformed input data

### Integration Testing
- Test full pipeline from analyzer output to graph display
- Verify graph interactions work correctly
- Test with various project structures and sizes

### Manual Testing
- Test with real project data that currently fails
- Verify expand/collapse functionality works
- Test graph performance with large codebases

## Implementation Plan

### Phase 1: Data Transformation Integration
1. Extract and adapt the data processing logic from `dora.html`
2. Create transformation functions to convert analyzer format to reference format
3. Update the `prepareGraphData()` method to use the new transformation logic
4. Add comprehensive error handling and logging

### Phase 2: Graph Rendering Integration
1. Extract the Cytoscape configuration from `dora.html`
2. Adapt the styling to use VS Code theme variables
3. Implement the node and edge creation logic from the reference
4. Update the graph initialization code in the webview

### Phase 3: Interactive Features Integration
1. Implement the expand/collapse functionality from the reference
2. Add the dynamic layout recalculation on node expansion
3. Implement proper state management for expanded folders
4. Add search and filtering capabilities if needed

### Phase 4: Error Handling and Polish
1. Add comprehensive error handling throughout the pipeline
2. Implement fallback states for various error conditions
3. Add loading indicators and user feedback
4. Optimize performance for large graphs

## Technical Considerations

### Performance
- Use efficient data structures for large graphs
- Implement lazy loading for deeply nested structures
- Consider virtualization for very large node counts

### Compatibility
- Ensure compatibility with existing VS Code theme system
- Maintain backward compatibility with current analyzer output
- Support different screen sizes and resolutions

### Maintainability
- Keep the reference implementation logic separate and well-documented
- Use clear interfaces between components
- Provide comprehensive error messages and logging