# Implementation Plan

- [x] 1. Extract tech stack functionality from webview-provider.ts to tabbed provider

  - Extract tech stack rendering code, data transformation, and HTML generation from src/webview-provider.ts
  - Add showTechStackGraph method to TabbedWebviewProvider class using extracted tech stack code
  - Enhance tabbed provider HTML template with comprehensive tech stack visualization from webview-provider.ts
  - Update UIManager.showTechStackGraph to route to TabbedWebviewProvider instead of WebviewProvider
  - Update command flow to ensure "DoraCodeBird: Show Tech Stack Graph" opens tabbed view with tech stack tab active
  - Test tech stack command displays comprehensive information with proper formatting and version numbers
  - _Requirements: 1.1, 1.2, 1.3, 2.2, 2.3, 3.1, 4.1, 4.3, 4.4_

- [x] 2. Extract code graph functionality and remove legacy webview provider

  - Extract code graph (module graph) rendering code and visualization logic from src/webview-provider.ts
  - Enhance TabbedWebviewProvider with code graph functionality using extracted code
  - Add comprehensive code graph visualization to the tabbed interface
  - Remove all imports and references to WebviewProvider class from UIManager and other files and Update extension initialization to not create WebviewProvider instance
  - selected tab border color should be highlighted with some good color matching theme
  - Test all existing webview functionality continues to work through TabbedWebviewProvider
  - _Requirements: 2.1, 3.1, 3.2, 3.3, 4.2_
