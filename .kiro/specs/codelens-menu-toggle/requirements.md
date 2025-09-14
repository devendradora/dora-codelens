# Requirements Document

## Introduction

This feature implements CodeLens toggle functionality in the right-click context menu with proper menu ordering, and fixes the issue where opening files automatically opens analysis webviews. Instead, files should be analyzed in the background and show complexity information inline as CodeLens annotations.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to toggle CodeLens on/off from the right-click context menu, so that I can easily enable or disable inline complexity information.

#### Acceptance Criteria

1. WHEN CodeLens is disabled THEN the context menu SHALL show "Code Lens (On)" option
2. WHEN CodeLens is enabled THEN the context menu SHALL show "Code Lens (Off)" option
3. WHEN clicking "Code Lens (On)" THEN the system SHALL enable CodeLens and update the menu text
4. WHEN clicking "Code Lens (Off)" THEN the system SHALL disable CodeLens and update the menu text

### Requirement 2

**User Story:** As a developer, I want the context menu options in a specific order, so that I can find analysis commands in a logical sequence.

#### Acceptance Criteria

1. WHEN right-clicking in a Python file THEN the context menu SHALL show options in this order:
   - Full Code Analysis
   - Current File Analysis
   - Code Lens (On) or Code Lens (Off)
2. WHEN the menu is displayed THEN all three options SHALL be visible and properly labeled
3. WHEN options are clicked THEN they SHALL execute their respective commands correctly

### Requirement 3

**User Story:** As a developer, I want files to be analyzed in the background when opened, so that I can see inline complexity information without webviews opening automatically.

#### Acceptance Criteria

1. WHEN opening a Python file THEN the system SHALL NOT automatically open current file analysis webview
2. WHEN opening a Python file THEN the system SHALL analyze the file in the background
3. WHEN background analysis completes THEN the system SHALL display complexity information as inline CodeLens annotations
4. WHEN CodeLens is enabled THEN complexity SHALL be shown above functions and classes as "🔴 15 complexity • 3 references • 25 lines"
