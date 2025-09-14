# Requirements Document

## Introduction

This feature enhances the existing code lens functionality by replacing the current "Toggle Code Lens" command with a more intuitive "Code Lens -> On/Off" toggle system. When enabled, the code lens will display complexity indicators above functions, methods, and classes using cached analysis results or triggering current file analysis when needed. Additionally, this feature removes the inline analysis commands that currently appear within files to provide a cleaner code viewing experience.

## Requirements

### Requirement 1

**User Story:** As a Python developer, I want to toggle code lens on/off with clear state indication, so that I can easily control when complexity information is displayed above my code elements.

#### Acceptance Criteria

1. WHEN the user accesses code lens commands THEN the system SHALL provide "Code Lens -> On" and "Code Lens -> Off" options instead of a single toggle command
2. WHEN code lens is enabled THEN the system SHALL display the current state as "On" in the command palette
3. WHEN code lens is disabled THEN the system SHALL display the current state as "Off" in the command palette
4. WHEN the user switches between on/off states THEN the system SHALL immediately apply the change to all open Python files

### Requirement 2

**User Story:** As a developer reviewing code, I want to see complexity indicators above functions, methods, and classes when code lens is enabled, so that I can quickly assess code complexity without running separate analysis commands.

#### Acceptance Criteria

1. WHEN code lens is enabled AND a Python file is opened THEN the system SHALL display complexity indicators above each function, method, and class
2. WHEN cached analysis results exist for the current file THEN the system SHALL use those results to display complexity indicators
3. WHEN cached analysis results do not exist for the current file THEN the system SHALL automatically run current file analysis to generate complexity data
4. WHEN complexity analysis completes THEN the system SHALL update the code lens indicators with the calculated complexity values
5. WHEN a file is modified THEN the system SHALL invalidate cached results and re-analyze the file when code lens refreshes

### Requirement 3

**User Story:** As a developer focused on code readability, I want the inline analysis commands removed from my code files, so that I have a cleaner viewing experience without distracting command options appearing in my code.

#### Acceptance Criteria

1. WHEN viewing any Python file THEN the system SHALL NOT display "analyse file" commands inline within the code
2. WHEN viewing any Python file THEN the system SHALL NOT display "analyse project" commands inline within the code  
3. WHEN viewing any Python file THEN the system SHALL NOT display "configure project" commands inline within the code
4. WHEN code lens is enabled THEN the system SHALL ONLY display complexity indicators and not analysis command options

### Requirement 4

**User Story:** As a developer working with multiple files, I want the code lens state to persist across VS Code sessions, so that my preference is maintained without needing to reconfigure it each time.

#### Acceptance Criteria

1. WHEN the user sets code lens to "On" THEN the system SHALL remember this preference across VS Code restarts
2. WHEN the user sets code lens to "Off" THEN the system SHALL remember this preference across VS Code restarts
3. WHEN VS Code starts THEN the system SHALL restore the last saved code lens state
4. WHEN the extension activates THEN the system SHALL apply the saved code lens preference to all open Python files