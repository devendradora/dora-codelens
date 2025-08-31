# Implementation Plan

- [x] 1. Implement complete code lens activation guidance system
  - Create CodeLensGuidanceManager class with preference detection and workspace-specific storage using VS Code configuration
  - Create PreferenceStorageService for managing workspace guidance settings and user analysis preferences
  - Modify DoraCodeLensProvider to show contextual guidance prompts when no analysis data exists, replacing "Analysis pending..." with actionable options
  - Implement guidance prompt generation for different scenarios (first-time users, no data, preference-based suggestions)
  - Create GuidanceCommandHandler class to process user selections and trigger appropriate analysis commands
  - Add command registration for "Analyze Current File" and "Analyze Full Project" guidance actions with preference updates
  - Implement progress indicators in code lens during analysis execution with real-time updates
  - Create error guidance prompts with retry options and helpful troubleshooting information
  - Add smart preference suggestions based on project structure (single file vs multi-file projects)
  - Implement workspace-specific preference isolation and preference change interface through code lens actions
  - Integrate with existing AnalysisManager to trigger analysis and handle completion events
  - Add graceful fallback and error recovery when guidance system encounters issues
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_
