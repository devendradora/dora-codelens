# Requirements Document

## Introduction

This feature will restructure the DoraCodeLens tech stack categorization system to be entirely Python-driven. Currently, categorization logic is split between Python analysis and TypeScript rendering with hardcoded categories. The new approach will centralize all categorization logic, rules, and category definitions in the Python analyzer, outputting complete JSON structures that the TypeScript code simply renders without any categorization logic.

## Requirements

### Requirement 1: Centralize All Categorization Logic in Python

**User Story:** As a system architect, I want all tech stack categorization logic to reside in Python, so that there's a single source of truth for how technologies are classified and organized.

#### Acceptance Criteria

1. WHEN the Python analyzer processes technologies THEN it SHALL output complete category structures with all subcategories in JSON format
2. WHEN categorizing technologies THEN the Python code SHALL determine main categories (Backend, Frontend, Databases, DevOps, Others)
3. WHEN categorizing technologies THEN the Python code SHALL determine subcategories (Languages, Frameworks, Package Managers, Libraries, Tools)
4. WHEN generating output THEN the Python analyzer SHALL include category metadata (icons, display names, descriptions)
5. WHEN processing is complete THEN the TypeScript code SHALL receive fully structured categorization data requiring no additional logic

### Requirement 2: Remove Categorization Logic from TypeScript

**User Story:** As a frontend developer, I want the TypeScript code to focus purely on rendering, so that categorization changes don't require frontend code modifications.

#### Acceptance Criteria

1. WHEN receiving categorization data THEN the TypeScript code SHALL only perform rendering operations
2. WHEN displaying categories THEN the TypeScript code SHALL use category data directly from Python JSON output
3. WHEN showing subcategories THEN the TypeScript code SHALL iterate through Python-provided subcategory structures
4. WHEN applying icons or styling THEN the TypeScript code SHALL use metadata provided by Python
5. WHEN categorization rules change THEN the TypeScript code SHALL require no modifications

### Requirement 3: Comprehensive JSON Category Structure Output

**User Story:** As a Python analyzer, I want to output complete category structures in JSON format, so that the frontend has all necessary data for rendering without additional processing.

#### Acceptance Criteria

1. WHEN outputting category data THEN the Python analyzer SHALL include category name, display name, icon, and description
2. WHEN outputting subcategory data THEN the Python analyzer SHALL include subcategory name, display name, icon, and technology list
3. WHEN outputting technology data THEN the Python analyzer SHALL include name, version, source, confidence score, and metadata
4. WHEN generating JSON THEN the Python analyzer SHALL include empty categories with appropriate empty state messages
5. WHEN structuring output THEN the Python analyzer SHALL provide hierarchical data matching the desired UI layout

### Requirement 4: Enhanced Technology Classification Rules

**User Story:** As a Python analyzer processing diverse technologies, I want comprehensive classification rules, so that I can accurately categorize both common and uncommon technologies.

#### Acceptance Criteria

1. WHEN encountering Python technologies THEN the system SHALL classify them as Backend > Languages/Frameworks/Libraries appropriately
2. WHEN encountering JavaScript/TypeScript technologies THEN the system SHALL classify them as Frontend > Languages/Frameworks/Libraries appropriately
3. WHEN encountering database technologies THEN the system SHALL classify them as Databases > SQL/NoSQL/In-Memory/Tools appropriately
4. WHEN encountering DevOps technologies THEN the system SHALL classify them as DevOps > Containerization/Orchestration/CI-CD/Monitoring appropriately
5. WHEN encountering unknown technologies THEN the system SHALL classify them as Others > Miscellaneous with appropriate confidence scores
6. WHEN classification is uncertain THEN the system SHALL provide confidence scores to indicate classification reliability

### Requirement 5: Maintain Backward Compatibility

**User Story:** As a system user, I want the new categorization system to work seamlessly with existing functionality, so that I don't experience any disruption in my workflow.

#### Acceptance Criteria

1. WHEN the new system is deployed THEN existing webviews SHALL continue to display tech stack information correctly
2. WHEN processing existing projects THEN the output format SHALL remain compatible with current rendering expectations
3. WHEN migrating to the new system THEN all existing categories and technologies SHALL be preserved
4. WHEN the system encounters legacy data THEN it SHALL handle it gracefully without errors
5. WHEN users access tech stack analysis THEN they SHALL see improved categorization without workflow changes

### Requirement 6: Performance and Reliability

**User Story:** As a system processing large codebases, I want the Python-driven categorization to be fast and reliable, so that users get quick and accurate results.

#### Acceptance Criteria

1. WHEN processing large numbers of technologies THEN the Python analyzer SHALL complete categorization within 3 seconds
2. WHEN encountering malformed or unexpected data THEN the system SHALL handle errors gracefully and continue processing
3. WHEN classification rules are extensive THEN the system SHALL use efficient lookup mechanisms to maintain performance
4. WHEN outputting JSON THEN the system SHALL generate well-formed, valid JSON structures
5. WHEN the system encounters errors THEN it SHALL provide meaningful error messages and fallback categorization

### Requirement 7: Full-Width Category Layout in Frontend

**User Story:** As a user viewing my tech stack analysis, I want each main category to occupy the full width of the display, so that I can easily scan and understand the complete technology landscape.

#### Acceptance Criteria

1. WHEN displaying categories THEN each main category SHALL occupy the full width of the container
2. WHEN rendering category sections THEN the Python JSON SHALL provide layout hints for full-width display
3. WHEN showing subcategories THEN they SHALL be organized within the full-width category container
4. WHEN displaying on different screen sizes THEN the full-width layout SHALL remain responsive and readable
5. WHEN categories are empty THEN they SHALL still occupy full width with appropriate empty state styling

### Requirement 8: Framework vs Library Classification

**User Story:** As a developer analyzing my tech stack, I want frameworks and libraries to be clearly separated, so that I can distinguish between core architectural choices and supporting libraries.

#### Acceptance Criteria

1. WHEN processing backend technologies THEN the Python analyzer SHALL classify main frameworks (Django, Flask, FastAPI) in the Frameworks subcategory
2. WHEN processing backend technologies THEN the Python analyzer SHALL classify supporting libraries (Celery, Gunicorn, Django REST Framework) in the Libraries subcategory
3. WHEN processing frontend technologies THEN the Python analyzer SHALL classify main frameworks (React, Vue, Angular, Next.js) in the Frameworks subcategory
4. WHEN processing frontend technologies THEN the Python analyzer SHALL classify build tools and utilities (Webpack, Babel, ESLint) in the Libraries subcategory
5. WHEN encountering framework-like libraries THEN the system SHALL use predefined rules to determine if they belong in Frameworks or Libraries
6. WHEN outputting JSON THEN the system SHALL ensure Frameworks subcategory contains only primary architectural frameworks
7. WHEN outputting JSON THEN the system SHALL ensure Libraries subcategory contains supporting tools, utilities, and secondary frameworks

### Requirement 9: Extensible Classification System

**User Story:** As a developer maintaining the categorization system, I want easily extensible classification rules, so that I can add new technologies and categories without major code changes.

#### Acceptance Criteria

1. WHEN adding new technologies THEN the system SHALL support adding them through configuration or data files
2. WHEN creating new categories THEN the system SHALL support category addition through structured configuration
3. WHEN modifying classification rules THEN the system SHALL support rule updates without code restructuring
4. WHEN extending subcategories THEN the system SHALL support subcategory addition within existing main categories
5. WHEN updating technology metadata THEN the system SHALL support metadata updates through external configuration