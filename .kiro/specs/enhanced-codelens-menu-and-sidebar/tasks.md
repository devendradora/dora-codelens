# Implementation Plan

- [x] 1. Implement enhanced code lens menu and sidebar functionality

  - Update package.json to add "Code Lens Inline >" submenu with "Enable" and "Disable" options, and change sidebar icon to "resources/dora-code-lens-kiro.png"
  - Create BackgroundAnalysisManager service with file analysis caching and automatic analysis on document open
  - Enhance DoraCodeLensProvider to remove "analyze full project" code lens from file tops and implement color-coded complexity indicators (🟢 Low ≤5, 🟡 Medium 6-10, 🔴 High >10) with GitLens-style compact display format
  - Implement automatic file analysis on Python document open with cache-first approach and progress indicators
  - Update CommandManager to register hierarchical menu commands with dynamic visibility based on code lens state
  - Create SidebarContentProvider with "Quick Actions", "Recent Analysis", "Project Overview", and "Analysis Status" sections
  - Add comprehensive error handling with meaningful messages, graceful fallbacks, and Python path configuration guidance
  - Update extension.ts to integrate all components and add proper cleanup and disposal
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2. Fix context menu to show dynamic text instead of submenu

  - Remove "Code Lens Inline >" submenu from package.json ✅
  - Update context menu to show "Enable Code Lens Inline" when disabled and "Disable Code Lens Inline" when enabled ✅
  - Ensure context key "doracodelens.codeLensEnabled" is properly set and updated ✅
  - Test that menu text changes immediately when code lens state changes ✅
  - Simplified context menu structure with direct menu items instead of hierarchical submenu ✅
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 3. Fix sidebar quick actions text to include "Inline"

  - Update sidebar content provider to show "Enable Code Lens Inline" and "Disable Code Lens Inline"
  - Ensure sidebar refreshes when code lens state changes
  - Test that sidebar quick actions reflect current code lens state
  - _Requirements: 4.2, 4.3, 4.9_

- [ ] 4. Fix code lens complexity display issues
  - Ensure code lens provider is properly registered and connected to analysis data
  - Fix background analysis integration to provide data to code lens provider
  - Ensure code lens shows actual complexity numbers when analysis completes
  - Add proper error handling when analysis fails
  - Test that enabling code lens immediately shows complexity information
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
