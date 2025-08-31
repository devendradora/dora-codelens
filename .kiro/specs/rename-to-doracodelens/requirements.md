# Requirements Document

## Introduction

This feature involves renaming the VS Code extension from "DoraCodeBirdView" to "DoraCodeLens" throughout the entire codebase. This includes updating all configuration files, documentation, code references, and any user-facing text to reflect the new extension name while maintaining all existing functionality.

## Requirements

### Requirement 1

**User Story:** As a developer, I want the extension to be consistently named "DoraCodeLens" across all files and configurations, so that the branding is unified and there are no references to the old name.

#### Acceptance Criteria

1. WHEN the extension is installed THEN the VS Code extension marketplace SHALL display "DoraCodeLens" as the extension name
2. WHEN viewing the extension in VS Code THEN all UI elements SHALL show "DoraCodeLens" instead of "DoraCodeBirdView"
3. WHEN examining configuration files THEN all references to "DoraCodeBirdView" SHALL be updated to "DoraCodeLens"
4. WHEN reading documentation THEN all mentions of "DoraCodeBirdView" SHALL be replaced with "DoraCodeLens"

### Requirement 2

**User Story:** As a developer, I want all internal code references and identifiers to use the new name consistently, so that the codebase is maintainable and clear.

#### Acceptance Criteria

1. WHEN examining TypeScript source files THEN all string literals containing "DoraCodeBirdView" SHALL be updated to "DoraCodeLens"
2. WHEN reviewing Python analyzer files THEN all references to the old name SHALL be updated to the new name
3. WHEN checking command identifiers THEN all command IDs SHALL reflect the new extension name
4. WHEN looking at file paths and directory names THEN any references to the old name SHALL be updated appropriately

### Requirement 3

**User Story:** As a user, I want the extension to maintain all existing functionality after the rename, so that my workflow is not disrupted.

#### Acceptance Criteria

1. WHEN the extension is activated THEN all existing commands SHALL continue to work as before
2. WHEN running analysis operations THEN all features SHALL function identically to the previous version
3. WHEN viewing webviews and UI elements THEN all functionality SHALL remain intact
4. WHEN using keyboard shortcuts and context menus THEN all interactions SHALL work as expected

### Requirement 4

**User Story:** As a developer, I want the package.json and extension manifest to reflect the new name, so that the extension is properly identified in the VS Code ecosystem.

#### Acceptance Criteria

1. WHEN examining package.json THEN the "name" field SHALL be "doracodelens"
2. WHEN viewing the extension manifest THEN the "displayName" SHALL be "DoraCodeLens"
3. WHEN checking the publisher information THEN the extension identifier SHALL use the new name format
4. WHEN reviewing extension metadata THEN all descriptions SHALL reference "DoraCodeLens"