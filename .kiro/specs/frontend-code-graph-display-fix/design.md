# Design Document

## Overview

The Python analyzer successfully returns structured JSON data with code analysis results, but the frontend code graph and JSON display tabs are not properly showing this data. The issue lies in the frontend data processing and rendering pipeline, where the analysis data is not being correctly transformed into the expected format for the graph visualization components.

## Architecture

The current data flow is:
1. Python analyzer returns JSON with hierarchical structure (folders → files → classes → functions)
2. Full Code Analysis Handler receives and validates the JSON
3. Full Code Analysis Webview processes the data and generates HTML
4. Webview displays tabs with Tech Stack, Code Graph, and Code Graph JSON

The problem occurs in step 3 where the webview's `prepareGraphData()` method and tab content generation are not correctly handling the analyzer's JSON structure.

## Components and Interfaces

### Data Transformation Layer
- **Current Issue**: The `prepareGraphData()` method in `FullCodeAnalysisWebview` expects a different data structure than what the analyzer provides
- **Solution**: Update the data transformation to correctly map the analyzer's hierarchical JSON to Cytoscape graph elements

### Tab Content Generation
- **Current Issue**: The `generateTabContents()` method is not properly extracting and formatting the code graph data
- **Solution**: Fix the content generation to properly handle the analyzer's JSON structure

### Graph Visualization
- **Current Issue**: The Cytoscape graph initialization expects specific node and edge formats that don't match the analyzer output
- **Solution**: Transform the hierarchical data into proper Cytoscape elements with correct IDs, types, and relationships

## Data Models

### Analyzer Output Structure (Current)
```json
{
  "modules": [
    {
      "name": "folder_name",
      "type": "folder", 
      "children": [
        {
          "name": "file.py",
          "type": "file",
          "children": [
            {
              "name": "ClassName",
              "type": "class",
              "children": [
                {
                  "name": "method_name",
                  "type": "function",
                  "calls": [
                    {
                      "target": ["", "module", "", "function"],
                      "label": "uses"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### Required Cytoscape Format
```json
{
  "elements": [
    {
      "data": {
        "id": "unique_id",
        "name": "display_name", 
        "type": "folder|file|class|function"
      }
    }
  ],
  "edges": [
    {
      "data": {
        "id": "edge_id",
        "source": "source_id",
        "target": "target_id", 
        "type": "contains|calls"
      }
    }
  ]
}
```

## Error Handling

### Data Validation
- Add validation for analyzer JSON structure before processing
- Provide fallback empty states when data is missing or malformed
- Log detailed error information for debugging

### Graph Rendering
- Handle cases where graph elements are empty or invalid
- Provide user-friendly error messages when visualization fails
- Implement retry mechanisms for failed graph initialization

## Testing Strategy

### Unit Testing
- Test data transformation functions with sample analyzer output
- Verify graph element generation produces valid Cytoscape format
- Test error handling with malformed input data

### Integration Testing  
- Test full pipeline from analyzer output to graph display
- Verify tab switching and content loading works correctly
- Test with various project structures and sizes

### Manual Testing
- Test with the events project that currently fails
- Verify both Code Graph and Code Graph JSON tabs display correctly
- Test graph interactions (zoom, pan, node selection)

## Implementation Plan

### Phase 1: Data Transformation Fix
1. Update `prepareGraphData()` method to correctly process analyzer JSON
2. Implement proper hierarchical ID generation for graph elements
3. Fix relationship mapping from analyzer calls to graph edges

### Phase 2: Tab Content Generation Fix
1. Update `generateTabContents()` to properly extract graph data
2. Fix Code Graph JSON tab to display formatted analyzer output
3. Remove any legacy code that conflicts with current implementation

### Phase 3: Graph Visualization Fix
1. Ensure Cytoscape initialization receives properly formatted data
2. Fix graph controls and interaction handlers
3. Implement proper error states and loading indicators

### Phase 4: Legacy Code Cleanup
1. Remove any unused or conflicting code in webview components
2. Consolidate data processing logic into single, clear pipeline
3. Update error handling to be consistent across components