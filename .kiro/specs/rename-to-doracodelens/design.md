# Design Document

## Overview

The renaming of DoraCodeBirdView to DoraCodeLens requires a systematic approach to update all references throughout the codebase while maintaining functionality. This design outlines the specific files and patterns that need to be updated to ensure a complete and consistent rename.

## Architecture

The extension consists of several key components that contain references to the extension name:

1. **Extension Manifest** (`package.json`) - Core extension metadata
2. **TypeScript Source Code** - Extension logic and UI text
3. **Python Analyzer** - Backend analysis engine
4. **Documentation Files** - User-facing documentation
5. **Configuration Files** - Build and development configuration
6. **Resource Files** - Static assets and styling

## Components and Interfaces

### Extension Manifest Updates

**File:** `package.json`
- Update `name` field from "doracodebirdview" to "doracodelens"
- Update `displayName` field from "DoraCodeBirdView" to "DoraCodeLens"
- Update `description` field to reference new name
- Update command identifiers to use new naming convention
- Update any URLs or references in the manifest

### TypeScript Source Code Updates

**Files:** All `.ts` files in `src/` directory
- Update string literals containing "DoraCodeBirdView" to "DoraCodeLens"
- Update command identifiers and constants
- Update any user-facing messages or UI text
- Update class names and identifiers if they reference the old name
- Update import/export statements if needed

### Python Analyzer Updates

**Files:** All `.py` files in `analyzer/` directory
- Update any string references to the extension name
- Update configuration or metadata references
- Update logging messages that mention the extension name
- Update any file headers or documentation strings

### Documentation Updates

**Files:** `README.md`, `CHANGELOG.md`, files in `docs/` directory
- Replace all instances of "DoraCodeBirdView" with "DoraCodeLens"
- Update any screenshots or images that show the old name
- Update installation instructions and references
- Update feature descriptions and examples

### Configuration Files

**Files:** `tsconfig.json`, `.eslintrc.json`, etc.
- Update any project name references
- Update output directory names if they reference the old name
- Update any build script references

## Data Models

### Naming Convention Mapping

```
Old Name: DoraCodeBirdView
New Name: DoraCodeLens

Variations:
- doracodebirdview → doracodelens (lowercase, no spaces)
- dora-code-bird-view → dora-code-lens (kebab-case)
- DORACODEBIRDVIEW → DORACODELENS (uppercase)
- DoraCodeBirdView → DoraCodeLens (PascalCase)
```

### Command Identifier Updates

Current command pattern: `doracodebirdview.*`
New command pattern: `doracodelens.*`

Examples:
- `doracodebirdview.analyzeCurrentFile` → `doracodelens.analyzeCurrentFile`
- `doracodebirdview.fullCodeAnalysis` → `doracodelens.fullCodeAnalysis`

## Error Handling

### Backward Compatibility Considerations

- The rename will break existing user configurations that reference old command IDs
- Users will need to reinstall or update the extension
- Any saved workspace settings referencing the old extension name will need manual updates

### Validation Strategy

1. **File Pattern Search**: Use grep/search tools to find all instances of the old name
2. **Functional Testing**: Verify all commands and features work after rename
3. **Extension Loading**: Ensure the extension loads properly with new identifiers
4. **Command Registration**: Verify all commands are registered with new IDs

## Testing Strategy

### Pre-Rename Validation

1. Document all current command IDs and functionality
2. Create a checklist of all user-facing features
3. Note any external integrations or dependencies

### Post-Rename Validation

1. **Extension Loading Test**: Verify extension activates without errors
2. **Command Functionality Test**: Test each command works with new identifiers
3. **UI Text Verification**: Check all user-facing text shows new name
4. **Webview Content Test**: Ensure webviews display correct branding
5. **Documentation Review**: Verify all docs reference new name consistently

### Automated Testing

- Run existing test suites to ensure no functionality is broken
- Add tests to verify new command identifiers are registered
- Test extension packaging and installation process

## Implementation Approach

### Phase 1: Core Configuration
1. Update `package.json` with new extension metadata
2. Update main extension entry point references

### Phase 2: Source Code Updates
1. Update TypeScript source files systematically
2. Update Python analyzer references
3. Update command identifiers and constants

### Phase 3: Documentation and Assets
1. Update all documentation files
2. Update any static assets or resources
3. Update configuration files

### Phase 4: Validation and Testing
1. Comprehensive testing of all functionality
2. Verification of extension packaging
3. Final review of all text and references