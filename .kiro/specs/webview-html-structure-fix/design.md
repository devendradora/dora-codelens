# Design Document

## Overview

The webview HTML structure needs to be completely rebuilt from scratch to provide a clean, single implementation that properly supports the interactive code graph. The current implementation has corrupted/duplicate code sections and missing HTML elements.

## Architecture

### Single Clean Implementation
- Remove all duplicate JavaScript sections
- Create a single, well-structured HTML template
- Implement proper DOM element structure for graph container
- Use direct integration with working dora.html code

### HTML Structure
```html
<!DOCTYPE html>
<html>
<head>
  <!-- Meta tags, CSP, styles -->
</head>
<body>
  <div class="analysis-container">
    <!-- Navigation -->
    <div class="navigation-bar">...</div>
    
    <!-- Content sections -->
    <div class="scrollable-content">
      <!-- Tech Stack Section -->
      <section id="tech-stack-section">...</section>
      
      <!-- Code Graph Section -->
      <section id="code-graph-section">
        <div class="section-header">
          <h2>🕸️ Code Graph Visualization</h2>
        </div>
        <div class="section-content">
          <div id="graph-loading" style="text-align: center; padding: 40px;">
            <div>🔄 Initializing interactive code graph...</div>
          </div>
          <div id="enhanced-graph" style="width: 100%; height: 600px; display: none;"></div>
        </div>
      </section>
      
      <!-- Code Graph JSON Section -->
      <section id="code-graph-json-section">...</section>
    </div>
  </div>
  
  <!-- Scripts -->
  <script src="cytoscape.min.js"></script>
  <script>
    // Single, clean JavaScript implementation
  </script>
</body>
</html>
```

## Components and Interfaces

### HTML Elements
- `#enhanced-graph`: Main container for Cytoscape graph (600px height, full width)
- `#graph-loading`: Loading indicator with spinner and text
- Navigation sections for different analysis views

### JavaScript Functions
- `initializeGraph()`: Main initialization function
- `createCytoscapeInstance()`: Create graph with dora.html configuration
- `showLoadingState()`: Show/hide loading indicator
- `showErrorState()`: Display error message with retry option

## Data Models

### Graph Data Structure
```typescript
interface GraphData {
  state: {
    projectData: ProjectFolder[]
  }
}

interface ProjectFolder {
  name: string
  children: ProjectNode[]
}

interface ProjectNode {
  name: string
  type: 'file' | 'class' | 'function'
  children?: ProjectNode[]
  complexity?: { level: 'low' | 'medium' | 'high' }
  calls?: { target: string[] }[]
}
```

## Error Handling

### Loading States
1. **Initial Loading**: Show spinner with "Initializing interactive code graph..."
2. **Library Loading**: Wait for Cytoscape to load with timeout
3. **Success**: Hide loading, show graph
4. **Error**: Show error message with retry button

### Fallback Strategy
- If Cytoscape fails to load: Show simple tree view
- If no data available: Show empty state message
- If graph creation fails: Show error with debug info

## Testing Strategy

### Manual Testing
- Verify HTML structure is correct
- Confirm all DOM elements exist
- Test graph initialization with sample data
- Verify loading states work properly
- Test error handling scenarios