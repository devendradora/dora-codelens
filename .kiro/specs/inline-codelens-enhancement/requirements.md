# Requirements Document

## Introduction

This feature enhances the DoraCodeLens extension to provide inline code complexity information directly in the editor when files are opened, similar to GitLens functionality. Instead of opening analysis webviews, the extension should analyze files in the background and display complexity metrics as CodeLens annotations above functions and classes.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to see code complexity information inline when I open Python files, so that I can quickly assess code quality without opening separate analysis views.

#### Acceptance Criteria

1. WHEN a Python file is opened THEN the system SHALL analyze the file in the background without showing webviews
2. WHEN analysis is complete THEN the system SHALL display CodeLens annotations above functions and classes showing complexity metrics
3. WHEN CodeLens is enabled THEN complexity information SHALL be visible inline in the editor
4. WHEN CodeLens is disabled THEN no inline annotations SHALL be displayed

### Requirement 2

**User Story:** As a developer, I want automatic background analysis when opening files, so that I don't need to manually trigger analysis for each file.

#### Acceptance Criteria

1. WHEN a Python file is opened THEN the system SHALL automatically trigger current file analysis in the background
2. WHEN background analysis is running THEN the system SHALL NOT open webview panels
3. WHEN analysis completes THEN the system SHALL update CodeLens data without user intervention
4. WHEN analysis fails THEN the system SHALL show placeholder CodeLens with error indicators

### Requirement 3

**User Story:** As a developer, I want GitLens-style inline complexity display, so that I can see metrics in a familiar and non-intrusive format.

#### Acceptance Criteria

1. WHEN displaying complexity THEN the system SHALL show compact metrics like "🔴 15 complexity • 3 references • 25 lines"
2. WHEN complexity is low THEN the system SHALL use green indicators (✅)
3. WHEN complexity is medium THEN the system SHALL use yellow indicators (⚠️)
4. WHEN complexity is high THEN the system SHALL use red indicators (🔴)
5. WHEN clicking CodeLens THEN the system SHALL show detailed function information in a tooltip or quick panel

### Requirement 4

**User Story:** As a developer, I want the system to prevent opening analysis webviews automatically, so that my workflow is not interrupted by unwanted panels.

#### Acceptance Criteria

1. WHEN a file is opened THEN the system SHALL NOT automatically open full analysis webviews
2. WHEN background analysis completes THEN the system SHALL NOT show analysis result panels
3. WHEN CodeLens is clicked THEN the system MAY show contextual information but SHALL NOT open full analysis views
4. WHEN user explicitly requests analysis THEN the system SHALL open webviews only on explicit command

### Requirement 5

**User Story:** As a developer, I want efficient background analysis, so that file opening performance is not significantly impacted.

#### Acceptance Criteria

1. WHEN analyzing files THEN the system SHALL use cached results when available
2. WHEN file content hasn't changed THEN the system SHALL reuse previous analysis results
3. WHEN analysis takes longer than 5 seconds THEN the system SHALL show progress indicators in CodeLens
4. WHEN multiple files are opened quickly THEN the system SHALL queue analysis requests efficiently