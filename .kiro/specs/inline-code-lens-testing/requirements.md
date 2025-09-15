# Inline Code Lens Testing Requirements

## Overview
Test the inline code lens functionality that displays complexity indicators directly in the code editor for Python functions and methods.

## User Stories

### US1: Complexity Indicators Display
**As a developer**, I want to see complexity indicators inline in my Python code so that I can quickly identify complex functions without opening separate analysis views.

**Acceptance Criteria:**
- Complexity indicators appear as colored circles (🟢🟡🔴) above function definitions
- Green circle for low complexity (≤ 5)
- Yellow circle for medium complexity (6-10) 
- Red circle for high complexity (> 10)
- Indicators only show for current file analysis, never for full project analysis
- Indicators auto-enable when current file analysis completes

### US2: Automatic Activation
**As a developer**, I want code lens to automatically activate after running current file analysis so that I don't need to manually toggle it on.

**Acceptance Criteria:**
- Code lens automatically enables when current file analysis finishes
- No manual toggle buttons in sidebar (removed in previous implementation)
- Code lens provider uses actual JSON analysis structure from Python analyzer

### US3: Correct Data Integration
**As a developer**, I want the complexity indicators to use the actual analysis data structure so that the displayed complexity scores are accurate.

**Acceptance Criteria:**
- Code lens provider reads from correct JSON structure: `analysis_results.functions[].complexity`
- Handles both function-level and method-level complexity data
- Gracefully handles missing or invalid complexity data

## Test Scenarios

### TS1: Basic Functionality Test
1. Open a Python file with multiple functions of varying complexity
2. Run "Analyze Current File" command
3. Verify complexity indicators appear above function definitions
4. Verify colors match complexity scores (green/yellow/red)

### TS2: Data Structure Validation
1. Run current file analysis and capture JSON output
2. Verify code lens provider correctly parses the analysis structure
3. Confirm complexity values match between analysis output and displayed indicators

### TS3: Auto-Enable Behavior
1. Ensure code lens is initially disabled
2. Run current file analysis
3. Verify code lens automatically enables after analysis completes
4. Verify indicators appear without manual intervention

### TS4: Full Project Analysis Exclusion
1. Run "Analyze Full Project" command
2. Verify NO inline indicators appear in any files
3. Confirm only current file analysis triggers inline indicators

## Technical Requirements

### TR1: Code Lens Provider Implementation
- Uses VS Code CodeLensProvider API
- Implements provideCodeLenses() method
- Returns CodeLens objects with appropriate ranges and commands

### TR2: Analysis Data Integration
- Reads from AnalysisManager's stored analysis results
- Handles JSON structure: `functions[].name`, `functions[].complexity`
- Provides fallback for missing complexity data

### TR3: Command Integration
- Integrates with existing command system
- Triggered by current file analysis completion
- Does not interfere with other analysis commands

## Success Criteria
- Complexity indicators display correctly for all Python functions
- Colors accurately reflect complexity levels
- Auto-enable functionality works reliably
- No performance impact on editor responsiveness
- Full project analysis does not trigger inline indicators