# Inline Code Lens Implementation Tasks

## Task 1: Re-implement Inline Code Lens Feature from Scratch
**Priority**: High  
**Estimated Time**: 60 minutes

### Implementation Steps:
1. Create new CodeLensInlineProvider class implementing VS Code CodeLensProvider interface
2. Implement provideCodeLenses() method to parse Python functions and extract complexity data
3. Create complexity-to-color mapping logic (🟢 ≤5, 🟡 6-10, 🔴 >10)
4. Integrate with AnalysisManager to access current file analysis results
5. Update CommandManager to auto-enable code lens only for current file analysis
6. Ensure full project analysis does NOT trigger inline indicators
7. Register code lens provider in extension.ts with proper document selectors
8. Test implementation with sample Python files and verify functionality

### Code Components to Create/Modify:
- `src/services/code-lens-inline-provider.ts` - New CodeLens provider implementation
- `src/core/command-manager.ts` - Update to handle auto-enable for current file only
- `src/core/analysis-manager.ts` - Ensure proper data structure for code lens integration
- `src/extension.ts` - Register new code lens provider
- `package.json` - Update contributes.commands if needed

### Acceptance Criteria:
- New CodeLensInlineProvider class correctly implements VS Code API
- Complexity indicators display above Python function definitions with correct colors
- Auto-enable functionality works only after current file analysis (not full project)
- Code lens provider correctly parses analysis JSON structure from AnalysisManager
- Extension compiles without TypeScript errors
- Indicators appear automatically without manual toggle
- Performance is acceptable with large Python files
- Clean separation from existing code lens functionality

### Requirements Coverage:
- _Requirements: US1 (Complexity Indicators Display), US2 (Automatic Activation), US3 (Correct Data Integration)_
- _Requirements: TR1 (Code Lens Provider Implementation), TR2 (Analysis Data Integration), TR3 (Command Integration)_