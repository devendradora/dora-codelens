# Implementation Plan

- [x] 1. Update Python analyzer to generate enhanced code graph data structure

  - Modify analyzer.py to generate the new code_graph_json format with hierarchical structure (folders, files, classes, functions)
  - Add complexity calculation (cyclomatic, cognitive, level) for all functions and methods
  - Implement call relationship tracking with full target paths [folder, file, class, function] and descriptive labels
  - Update the AnalysisResult class to include the new code_graph_json field alongside existing tech_stack structure
  - Ensure backward compatibility by maintaining all existing response fields (success, errors, warnings, tech_stack)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.5_

- [x] 2. Update TypeScript webview to process and render the new data structure
  - Modify full-code-analysis-webview.ts to parse and process the code_graph_json format
  - Implement graph element creation from hierarchical data similar to dora.html reference implementation
  - Add expandable folder node functionality with click-to-expand behavior
  - Create complexity-based visual styling (color coding for low/medium/high complexity levels)
  - Implement call relationship edge rendering with proper labels and connections
  - Add backward compatibility to handle both old and new data formats gracefully
  - Update the generateHTML method to use the new data structure while maintaining existing tech_stack tab functionality
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.2, 4.3, 4.4_
