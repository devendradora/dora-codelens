# Requirements Document

## Introduction

This feature focuses on improving the Tech Stack Analysis section in the DoraCodeLens VS Code extension. The current implementation has several issues including incorrect statistics display, poor organization of frameworks vs libraries, and suboptimal layout for dependencies. This enhancement will provide accurate project statistics, better categorization, and an improved user interface for browsing technical components.

## Requirements

### Requirement 1: Fix Statistics Display Issues

**User Story:** As a developer analyzing my project, I want to see accurate statistics about my codebase, so that I can understand the scale and composition of my project.

#### Acceptance Criteria

1. WHEN the tech stack analysis loads THEN the system SHALL display the correct total number of files (not 0)
2. WHEN calculating project statistics THEN the system SHALL count files from the code_graph_json data structure
3. WHEN displaying statistics THEN the system SHALL show total folders count
4. WHEN displaying statistics THEN the system SHALL show total classes count  
5. WHEN displaying statistics THEN the system SHALL show total functions count
6. WHEN displaying statistics THEN the system SHALL show correct languages count (not 0)
7. WHEN displaying statistics THEN the system SHALL detect and show the package manager being used

### Requirement 2: Enhance Statistics Panel

**User Story:** As a developer, I want to see comprehensive project metrics in the statistics panel, so that I can quickly assess my project's structure and complexity.

#### Acceptance Criteria

1. WHEN viewing the statistics panel THEN the system SHALL display six key metrics: Total Files, Total Folders, Total Classes, Total Functions, Languages, and Package Manager
2. WHEN detecting package manager THEN the system SHALL prioritize in order: Poetry, Pipenv, pip, Yarn, npm, Unknown
3. WHEN calculating statistics THEN the system SHALL recursively traverse the code_graph_json structure
4. WHEN a statistic cannot be calculated THEN the system SHALL display 0 or "Unknown" as appropriate

### Requirement 3: Improve Framework Categorization

**User Story:** As a Python developer, I want to see only relevant web frameworks in the frameworks section, so that I can focus on the architectural components that matter for my application.

#### Acceptance Criteria

1. WHEN displaying frameworks THEN the system SHALL rename "Frameworks & Platforms" to "Frameworks"
2. WHEN filtering frameworks THEN the system SHALL only show major Python web frameworks
3. WHEN determining major frameworks THEN the system SHALL include: Django, Flask, FastAPI, Tornado, Pyramid, Bottle, CherryPy, Web2py, Falcon, Sanic, Quart, Starlette
4. WHEN filtering frameworks THEN the system SHALL exclude libraries like Celery, NumPy, Pandas, Requests, SQLAlchemy
5. WHEN no major frameworks are detected THEN the system SHALL hide the frameworks section

### Requirement 4: Redesign Libraries Layout

**User Story:** As a developer browsing project dependencies, I want libraries displayed in an organized grid layout, so that I can easily scan and find specific libraries.

#### Acceptance Criteria

1. WHEN displaying libraries THEN the system SHALL use a grid layout with 4 items per row
2. WHEN displaying libraries THEN the system SHALL sort them alphabetically by name
3. WHEN the screen width is reduced THEN the system SHALL responsively adjust to 3, 2, or 1 columns
4. WHEN hovering over library items THEN the system SHALL provide visual feedback with hover effects
5. WHEN displaying library information THEN the system SHALL show both name and version when available

### Requirement 5: Responsive Design Implementation

**User Story:** As a developer using different screen sizes, I want the tech stack analysis to be readable on all devices, so that I can review my project structure regardless of my setup.

#### Acceptance Criteria

1. WHEN viewing on desktop (>800px) THEN the system SHALL display libraries in 4 columns
2. WHEN viewing on tablet (≤800px) THEN the system SHALL display libraries in 3 columns
3. WHEN viewing on mobile (≤600px) THEN the system SHALL display libraries in 2 columns
4. WHEN viewing on small mobile (≤400px) THEN the system SHALL display libraries in 1 column
5. WHEN resizing the window THEN the system SHALL smoothly transition between layouts

### Requirement 6: Data Processing Robustness

**User Story:** As a system processing various project types, I want to handle different data formats gracefully, so that the analysis works regardless of how dependency information is structured.

#### Acceptance Criteria

1. WHEN processing library data THEN the system SHALL handle object format (key-value pairs)
2. WHEN processing library data THEN the system SHALL handle array of strings format
3. WHEN processing library data THEN the system SHALL handle array of objects format
4. WHEN encountering unexpected data formats THEN the system SHALL provide fallback handling
5. WHEN library data is missing or corrupted THEN the system SHALL display appropriate error messages