# Requirements Document

## Introduction

This feature improves the user experience for DoraCodeLens by providing clear guidance to users on how to activate code lens functionality. Currently, users may not understand that they need to run a full code analysis or current file analysis before code lens can display complexity metrics and suggestions. This enhancement will proactively guide users through the activation process, making the feature more discoverable and reducing confusion about why code lens appears empty or inactive.

## Requirements

### Requirement 1

**User Story:** As a new DoraCodeLens user, I want clear guidance on how to activate code lens functionality, so that I can start seeing complexity metrics and suggestions without confusion.

#### Acceptance Criteria

1. WHEN a user enables code lens for the first time THEN the system SHALL display a notification explaining that analysis is required
2. WHEN code lens is enabled but no analysis data is available THEN the system SHALL show "Run Analysis First" indicators above functions
3. WHEN the user clicks on "Run Analysis First" indicator THEN the system SHALL present options to run full code analysis or current file analysis
4. WHEN the user has never run analysis THEN the system SHALL show a welcome message with clear next steps
5. WHEN analysis is running THEN the system SHALL show progress indicators in place of code lens items

### Requirement 2

**User Story:** As a developer working on a new file, I want to be prompted to analyze the current file when I enable code lens, so that I can immediately see complexity metrics for the code I'm working on.

#### Acceptance Criteria

1. WHEN code lens is enabled on a file that hasn't been analyzed THEN the system SHALL show "Analyze Current File" action above the first function
2. WHEN the user clicks "Analyze Current File" THEN the system SHALL execute current file analysis and update code lens immediately
3. WHEN current file analysis completes THEN the system SHALL replace analysis prompts with actual complexity metrics and suggestions
4. WHEN analysis fails THEN the system SHALL show error message with retry option in code lens
5. WHEN the file is modified after analysis THEN the system SHALL show "Re-analyze" option for updated functions

### Requirement 3

**User Story:** As a developer working on a large project, I want to be offered full project analysis when enabling code lens, so that I can get comprehensive insights across my entire codebase.

#### Acceptance Criteria

1. WHEN code lens is enabled in a multi-file project THEN the system SHALL offer both "Analyze Current File" and "Analyze Full Project" options
2. WHEN the user chooses full project analysis THEN the system SHALL show progress across all files and update code lens as analysis completes
3. WHEN full analysis is running THEN the system SHALL show "Analysis in Progress" indicators that update with completion percentage
4. WHEN full analysis completes THEN the system SHALL notify user and refresh all open files with code lens data
5. WHEN analysis data exists but is stale THEN the system SHALL offer "Refresh Analysis" option

### Requirement 4

**User Story:** As a developer who frequently switches between projects, I want code lens to remember my analysis preferences, so that I don't have to repeatedly choose between current file and full project analysis.

#### Acceptance Criteria

1. WHEN the user selects an analysis option THEN the system SHALL remember this preference for the current workspace
2. WHEN code lens is enabled in a workspace with saved preferences THEN the system SHALL automatically suggest the preferred analysis type
3. WHEN the user wants to change preferences THEN the system SHALL provide easy access to preference settings through code lens actions
4. WHEN switching between workspaces THEN the system SHALL apply workspace-specific analysis preferences
5. WHEN no preference is set THEN the system SHALL default to current file analysis for single files and offer both options for projects

### Requirement 5

**User Story:** As a team member working with DoraCodeLens, I want consistent and helpful messaging about analysis requirements, so that all team members can effectively use the code lens features.

#### Acceptance Criteria

1. WHEN displaying analysis prompts THEN the system SHALL use clear, non-technical language that explains the benefit of running analysis
2. WHEN analysis is required THEN the system SHALL explain what data will be collected and how it improves the development experience
3. WHEN errors occur during analysis THEN the system SHALL provide helpful troubleshooting guidance through code lens messages
4. WHEN code lens is disabled THEN the system SHALL cleanly remove all analysis prompts and guidance messages
5. WHEN multiple files are open THEN the system SHALL coordinate messaging to avoid overwhelming the user with duplicate prompts