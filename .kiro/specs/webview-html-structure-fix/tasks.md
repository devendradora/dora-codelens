# Implementation Plan

- [x] 1. Clean up and rebuild webview HTML structure

  - Remove all duplicate JavaScript sections from the webview file
  - Create clean HTML template with proper section structure
  - Add required DOM elements: `enhanced-graph` div and `graph-loading` indicator
  - Ensure proper CSS classes and styling for graph container
  - _Requirements: 1.1, 1.2, 3.1, 3.2_

- [x] 2. Implement single JavaScript initialization

  - Replace all existing JavaScript with single clean implementation
  - Add proper DOM ready event handling
  - Implement Cytoscape library loading check with timeout
  - Create graph initialization function using exact dora.html code
  - _Requirements: 1.3, 2.1, 2.2, 3.3_

- [x] 3. Add proper loading and error states

  - Implement loading indicator that shows during initialization
  - Add error handling for library loading failures
  - Create fallback display for when graph cannot be initialized
  - Add retry functionality for failed graph initialization
  - _Requirements: 1.4, 2.3, 2.4_

- [x] 4. Integrate working graph code from dora.html
  - Copy exact Cytoscape configuration from working dora.html
  - Implement folder expansion/collapse functionality
  - Add proper node and edge styling
  - Ensure graph displays correctly with project data
  - _Requirements: 1.1, 1.3_
