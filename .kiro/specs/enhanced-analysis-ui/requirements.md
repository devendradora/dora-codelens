# Requirements Document

## Introduction

The DoraCodeBirdView extension needs a streamlined and modern UI for displaying full code analysis results. The current webview needs restructuring to focus on the most essential analysis views: Tech Stack and Code Graph. This feature will create a simplified, tabbed interface that removes unnecessary tabs (Overview, Modules, Metadata) and consolidates key information into a more focused user experience with enhanced Tech Stack details and an improved Code Graph visualization.

## Requirements

### Requirement 1

**User Story:** As a developer using the extension, I want a streamlined tabbed interface with only Tech Stack and Code Graph tabs, so that I can focus on the most important analysis information without clutter.

#### Acceptance Criteria

1. WHEN the full code analysis webview opens THEN the system SHALL display only Tech Stack and Code Graph tabs
2. WHEN switching between tabs THEN the system SHALL maintain the current state and data of both tabs
3. WHEN a tab is selected THEN the system SHALL highlight the active tab and show relevant content
4. WHEN the webview loads THEN the system SHALL default to the Tech Stack tab
5. IF the backend response is incomplete THEN the system SHALL show available data with appropriate indicators for missing information

### Requirement 2

**User Story:** As a developer using the extension, I want a comprehensive tech stack tab that includes project statistics and framework information, so that I can see all key project metrics and technologies in one place.

#### Acceptance Criteria

1. WHEN viewing the tech stack tab THEN the system SHALL display TOTAL MODULES (number of folders), TOTAL FILES, and ANALYSIS STATUS at the top
2. WHEN tech stack data is available THEN the system SHALL show the Primary Framework (Django, Flask, etc.) prominently
3. WHEN dependencies exist THEN the system SHALL list all libraries and dependencies with version information
4. WHEN displaying tech stack THEN the system SHALL show languages with file counts and percentages
5. WHEN displaying tech stack THEN the system SHALL use visual indicators like charts or progress bars for language distribution
6. IF tech stack data is missing THEN the system SHALL show an appropriate empty state message

### Requirement 3

**User Story:** As a developer using the extension, I want an interactive code graph tab that shows all modules (folders) in a visual graph layout, so that I can understand the folder structure and relationships in my codebase.

#### Acceptance Criteria

1. WHEN viewing the code graph tab THEN the system SHALL render an interactive graph showing all modules (folders) as nodes
2. WHEN graph data is available THEN the system SHALL display modules with their folder structure relationships
3. WHEN interacting with graph nodes THEN the system SHALL show module details in tooltips including file counts and complexity
4. WHEN the graph displays THEN the system SHALL use a layout similar to the provided reference image with proper node spacing and hierarchy
5. WHEN modules contain submodules THEN the system SHALL show hierarchical relationships with appropriate visual connections
6. IF graph data is incomplete THEN the system SHALL show available modules and indicate missing connections

