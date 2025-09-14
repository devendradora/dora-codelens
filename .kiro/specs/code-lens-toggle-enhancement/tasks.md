# Implementation Plan

- [x] 1. Implement Code Lens Toggle Enhancement
  - Replace single toggle command with separate "Code Lens -> On" and "Code Lens -> Off" commands in package.json
  - Update `src/core/command-manager.ts` to register enable/disable commands and remove toggle functionality
  - Enhance `src/core/code-lens-command-manager.ts` for state-aware command handling and persistence
  - Modify `src/services/code-lens-provider.ts` to check cached analysis results and trigger current file analysis when needed
  - Update `src/commands/code-lens-handler.ts` to handle separate enable/disable commands
  - Remove inline analysis commands (analyse file, analyse project, configure project) from code lens display
  - Implement automatic analysis triggering when code lens is enabled and no cached results exist
  - Add state persistence for enable/disable preference across VS Code sessions
  - Create comprehensive tests for the new functionality
  - Clean up unused toggle-related code and update documentation
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_
