# Requirements Document

## Introduction

The DoraCodeBirdView extension needs to update its Python analyzer to send data in a new enhanced structure that includes complexity metrics and better hierarchical organization, and update the TypeScript webview processing to handle this new structure based on the reference implementation in `analyzer/dora.html`. This enhancement will provide richer analysis data with complexity information for functions and classes, enabling better visualization and insights in the code graph.

## Requirements

### Requirement 1

**User Story:** As a developer using the extension, I want the Python analyzer to send enhanced code graph data with complexity metrics, so that I can see detailed complexity information for functions and classes in the visualization.

#### Acceptance Criteria

1. WHEN the Python analyzer processes a codebase THEN the system SHALL include complexity metrics (cyclomatic, cognitive, level) for each function
2. WHEN analyzing classes THEN the system SHALL include complexity information for all methods within the class
3. WHEN generating the response THEN the system SHALL structure data hierarchically with folders, files, classes, and functions
4. WHEN complexity is calculated THEN the system SHALL categorize it as "low", "medium", or "high" based on cyclomatic complexity thresholds
5. WHEN call relationships exist THEN the system SHALL include target paths and relationship labels in the calls array

### Requirement 2

**User Story:** As a developer using the extension, I want the code graph data to include detailed call relationship information, so that I can understand how different parts of my code interact with each other.

#### Acceptance Criteria

1. WHEN functions make calls to other functions THEN the system SHALL record the target path as an array of [folder, file, class, function]
2. WHEN call relationships exist THEN the system SHALL include descriptive labels like "uses", "fetches", "calls"
3. WHEN processing call graphs THEN the system SHALL maintain bidirectional relationship tracking
4. WHEN calls span multiple modules THEN the system SHALL preserve the full path hierarchy
5. WHEN no calls exist THEN the system SHALL include an empty calls array

### Requirement 3

**User Story:** As a developer using the extension, I want the TypeScript webview to process the new data structure correctly, so that the enhanced complexity and relationship information is displayed properly in the visualization.

#### Acceptance Criteria

1. WHEN the webview receives the new data structure THEN the system SHALL parse the hierarchical code_graph_json format
2. WHEN displaying nodes THEN the system SHALL show complexity levels with appropriate visual indicators
3. WHEN rendering call relationships THEN the system SHALL create edges between nodes with proper labels
4. WHEN processing the graph THEN the system SHALL handle the expandable folder structure similar to the dora.html reference
5. WHEN complexity data is available THEN the system SHALL use color coding or visual cues to indicate complexity levels

### Requirement 4

**User Story:** As a developer using the extension, I want the new data structure to maintain backward compatibility, so that existing functionality continues to work while new features are added.

#### Acceptance Criteria

1. WHEN the analyzer generates output THEN the system SHALL maintain the existing success, errors, warnings, and tech_stack structure
2. WHEN the webview processes data THEN the system SHALL handle both old and new data formats gracefully
3. WHEN new fields are missing THEN the system SHALL provide sensible defaults and continue processing
4. WHEN legacy data is encountered THEN the system SHALL display available information without errors
5. WHEN migrating to the new structure THEN the system SHALL preserve all existing metadata and analysis information