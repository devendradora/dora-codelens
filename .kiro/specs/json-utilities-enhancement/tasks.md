# Implementation Plan

- [x] 1. Enhance JSON utilities with minify functionality and context-aware command enablement
  - Remove json view method from JsonUtilitiesService and add minifyJson method with error handling
  - Create JsonContextDetector utility to detect JSON files and JSON content at cursor position
  - Update command handlers to include minify support and context checking before execution
  - Implement dynamic VS Code context keys and event listeners for cursor/file changes
  - Update CommandManager and package.json to register minify command and configure context menus with when clauses for all file types
  - Clean up json view references and ensure proper disposal of new event listeners
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4_
