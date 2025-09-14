# Implementation Plan

- [x] 1. Implement CodeLens toggle with proper context menu ordering and fix automatic webview opening
  - Update package.json to add separate "Code Lens (On)" and "Code Lens (Off)" commands with conditional visibility
  - Set context menu order: Full Code Analysis (group @1), Current File Analysis (group @2), Code Lens toggle (group @3)
  - Create context key "doracodelens.codeLensEnabled" to track CodeLens state for menu visibility
  - Implement command handlers for enableCodeLens and disableCodeLens that update both CodeLens provider state and context key
  - Fix file opening behavior to prevent automatic current file analysis webview from opening
  - Modify document event handlers to analyze files in background when opened without showing webviews
  - Update CodeLens provider to display inline complexity information from Python analyzer JSON output
  - Implement GitLens-style inline display format: "🔴 15 complexity • 3 references • 25 lines" above functions/classes
  - Add background analysis integration that populates CodeLens data without UI interruption
  - Add state persistence to remember CodeLens preference across VS Code sessions
  - Test menu ordering, toggle functionality, and inline complexity display in Python files
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_