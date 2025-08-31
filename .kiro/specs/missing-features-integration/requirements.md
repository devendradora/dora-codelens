# Requirements Document

## Introduction

This feature addresses several missing or broken functionalities in the DoraCodeBirdView extension that impact user experience and feature accessibility. The extension currently has incomplete implementations for database schema visualization, missing context menu integration for JSON utilities, and lacks code lens management controls after full code analysis.

## Requirements

### Requirement 1

**User Story:** As a developer analyzing database schemas, I want to see the interactive schema graph visualization, so that I can understand database relationships and structure visually.

#### Acceptance Criteria

1. WHEN a user runs database schema analysis THEN the system SHALL display an interactive graph showing tables, columns, and relationships
2. WHEN the database schema webview loads THEN the system SHALL render the Cytoscape.js graph with proper styling and layout
3. IF the schema analysis returns valid data THEN the system SHALL transform it into graph nodes and edges for visualization
4. WHEN users interact with the graph THEN the system SHALL provide zoom, pan, and node selection capabilities

### Requirement 2

**User Story:** As a developer working with JSON files, I want to access JSON utilities through the context menu, so that I can format, validate, and explore JSON data efficiently.

#### Acceptance Criteria

1. WHEN a user right-clicks on a JSON file THEN the system SHALL show JSON utility options in the context menu
2. WHEN a user right-clicks on selected JSON text THEN the system SHALL provide JSON formatting and validation options
3. WHEN a user selects "Format JSON" THEN the system SHALL format the JSON with proper indentation and structure
4. WHEN a user selects "Validate JSON" THEN the system SHALL check JSON syntax and display validation results
5. WHEN a user selects "JSON Tree View" THEN the system SHALL open an interactive tree explorer for the JSON data

### Requirement 3

**User Story:** As a developer who has completed full code analysis, I want to enable or disable code lens features, so that I can control the visibility of inline code metrics and navigation aids.

#### Acceptance Criteria

1. WHEN full code analysis completes THEN the system SHALL provide a code lens toggle control in the analysis results
2. WHEN a user clicks "Enable Code Lens" THEN the system SHALL activate code lens providers for complexity metrics and navigation
3. WHEN a user clicks "Disable Code Lens" THEN the system SHALL deactivate all code lens providers and remove inline annotations
4. WHEN code lens is enabled THEN the system SHALL show complexity metrics, function references, and quick navigation options inline with code
5. WHEN the extension restarts THEN the system SHALL remember the user's code lens preference and restore the previous state