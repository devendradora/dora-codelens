# Design Document

## Overview

This design addresses critical issues with the DoraCodeBirdView extension's context menu visibility and sidebar icon display. The solution focuses on fixing activation conditions, menu registration, and ensuring proper VS Code integration for consistent user experience.

## Architecture

### Current State Analysis

Based on the package.json and extension.ts analysis, the current issues are:

1. **Context Menu Limitation**: The context menu is restricted to Python files only (`"when": "editorLangId == python"`)
2. **Activation Events**: Extension may not be activating in all necessary scenarios
3. **Command Registration**: All commands appear to be registered, but timing or conditions may be causing issues
4. **Sidebar Configuration**: The viewsContainer and views are properly configured but may have activation issues

### Root Cause Analysis

1. **Context Menu Issue**: The `"when": "editorLangId == python"` condition is too restrictive
2. **Sidebar Icon Issue**: Likely related to extension activation timing or workspace detection
3. **Command Availability**: Commands may not be available when the extension hasn't fully activated

### Proposed Architecture Changes

1. **Flexible Context Menu**: Modify context menu conditions to show relevant options for all file types
2. **Enhanced Activation**: Improve activation event handling and workspace detection
3. **Robust Command Registration**: Add error handling and validation for command registration
4. **Diagnostic Logging**: Add comprehensive logging for troubleshooting

## Components and Interfaces

### 1. Enhanced Context Menu Configuration

```typescript
interface ContextMenuConfig {
    pythonFileOptions: string[];
    generalFileOptions: string[];
    workspaceOptions: string[];
    fallbackOptions: string[];
}

interface MenuCondition {
    command: string;
    when: string;
    group: string;
    priority: number;
}
```

### 2. Extension Activation Manager

```typescript
interface ActivationManager {
    checkActivationConditions(): Promise<ActivationResult>;
    validateWorkspace(): WorkspaceValidation;
    ensureCommandsRegistered(): Promise<CommandRegistrationResult>;
    diagnosticCheck(): DiagnosticResult;
}

interface ActivationResult {
    shouldActivate: boolean;
    reasons: string[];
    pythonDetected: boolean;
    workspaceValid: boolean;
}

interface WorkspaceValidation {
    hasPythonFiles: boolean;
    hasDependencyFiles: boolean;
    hasValidWorkspace: boolean;
    workspaceFolders: number;
}
```

### 3. Command Registration System

```typescript
interface CommandRegistrationSystem {
    registerAllCommands(): Promise<RegistrationResult>;
    validateCommandRegistration(): ValidationResult;
    handleRegistrationErrors(errors: RegistrationError[]): void;
}

interface RegistrationResult {
    successful: string[];
    failed: RegistrationError[];
    totalCommands: number;
}

interface RegistrationError {
    command: string;
    error: Error;
    category: 'activation' | 'dependency' | 'configuration';
}
```

## Data Models

### 1. Menu Configuration Model

```typescript
interface MenuConfiguration {
    contextMenus: {
        python: MenuItemConfig[];
        general: MenuItemConfig[];
        workspace: MenuItemConfig[];
    };
    submenus: {
        [key: string]: SubmenuConfig;
    };
    conditions: {
        [key: string]: string;
    };
}

interface MenuItemConfig {
    command: string;
    when: string;
    group: string;
    order: number;
    icon?: string;
    title?: string;
}

interface SubmenuConfig {
    id: string;
    label: string;
    icon: string;
    items: MenuItemConfig[];
}
```

### 2. Extension State Model

```typescript
interface ExtensionState {
    isActivated: boolean;
    activationTime: number;
    commandsRegistered: boolean;
    sidebarVisible: boolean;
    contextMenuAvailable: boolean;
    lastError?: Error;
    diagnostics: DiagnosticInfo;
}

interface DiagnosticInfo {
    activationEvents: string[];
    workspaceInfo: WorkspaceInfo;
    commandStatus: CommandStatus[];
    viewStatus: ViewStatus[];
}
```

## Error Handling

### 1. Activation Error Recovery

```typescript
class ActivationErrorHandler {
    handleActivationFailure(error: Error): Promise<void>;
    retryActivation(maxRetries: number): Promise<boolean>;
    fallbackActivation(): Promise<void>;
    reportActivationIssue(error: Error): void;
}
```

### 2. Command Registration Error Handling

```typescript
class CommandRegistrationErrorHandler {
    handleRegistrationFailure(command: string, error: Error): void;
    retryCommandRegistration(command: string): Promise<boolean>;
    provideRegistrationDiagnostics(): DiagnosticReport;
}
```

### 3. Menu Display Error Handling

```typescript
class MenuErrorHandler {
    handleMenuNotVisible(): DiagnosticSteps;
    validateMenuConfiguration(): ValidationResult;
    suggestMenuFixes(): FixSuggestion[];
}
```

## Testing Strategy

### 1. Activation Testing

```typescript
describe('Extension Activation', () => {
    test('should activate with Python files present', () => {});
    test('should activate with dependency files present', () => {});
    test('should handle activation without Python files', () => {});
    test('should retry activation on failure', () => {});
});
```

### 2. Context Menu Testing

```typescript
describe('Context Menu', () => {
    test('should show menu on Python files', () => {});
    test('should show limited menu on non-Python files', () => {});
    test('should show workspace options when available', () => {});
    test('should handle menu registration failures', () => {});
});
```

### 3. Sidebar Testing

```typescript
describe('Sidebar Integration', () => {
    test('should display sidebar icon after activation', () => {});
    test('should handle workspace changes', () => {});
    test('should show appropriate content based on workspace', () => {});
});
```

## Implementation Approach

### Phase 1: Context Menu Fixes
1. Update package.json menu conditions to be more flexible
2. Add conditional logic for different file types
3. Implement graceful degradation for non-Python contexts

### Phase 2: Activation Enhancement
1. Improve activation event handling
2. Add activation validation and retry logic
3. Implement comprehensive activation diagnostics

### Phase 3: Command Registration Robustness
1. Add error handling for command registration
2. Implement command validation and retry mechanisms
3. Add diagnostic reporting for registration issues

### Phase 4: Sidebar Integration
1. Ensure proper sidebar icon display
2. Add workspace change handling
3. Implement fallback content for edge cases

## Technical Considerations

### 1. VS Code API Constraints
- Menu conditions must be valid VS Code when-clause expressions
- Activation events have specific timing requirements
- Command registration must happen during activation

### 2. Backward Compatibility
- Maintain existing functionality for users with working setups
- Ensure new conditions don't break existing workflows
- Preserve command palette access

### 3. Performance Considerations
- Minimize activation time impact
- Avoid unnecessary workspace scanning
- Cache activation results where appropriate

### 4. User Experience
- Provide clear feedback when features are unavailable
- Offer helpful error messages and troubleshooting guidance
- Maintain consistent behavior across different workspace types

## Menu Configuration Changes

### Current Configuration Issues
```json
{
  "editor/context": [
    {
      "submenu": "doracodebird.contextMenu",
      "when": "editorLangId == python",  // Too restrictive
      "group": "navigation@1"
    }
  ]
}
```

### Proposed Configuration
```json
{
  "editor/context": [
    {
      "submenu": "doracodebird.contextMenu",
      "when": "resourceExtname =~ /\\.(py|json|sql|md)$/ || editorLangId == python",
      "group": "navigation@1"
    }
  ],
  "explorer/context": [
    {
      "submenu": "doracodebird.contextMenu",
      "when": "explorerResourceIsFolder || resourceExtname =~ /\\.(py|json|sql)$/",
      "group": "navigation@1"
    }
  ]
}
```

## Activation Event Enhancements

### Current Activation Events
```json
{
  "activationEvents": [
    "onLanguage:python",
    "workspaceContains:**/*.py",
    "workspaceContains:requirements.txt",
    "workspaceContains:pyproject.toml",
    "workspaceContains:Pipfile"
  ]
}
```

### Enhanced Activation Events
```json
{
  "activationEvents": [
    "onLanguage:python",
    "onLanguage:json",
    "workspaceContains:**/*.py",
    "workspaceContains:requirements.txt",
    "workspaceContains:pyproject.toml",
    "workspaceContains:Pipfile",
    "onCommand:doracodebird.analyzeProject",
    "onView:doracodebirdSidebar"
  ]
}
```

## Diagnostic and Troubleshooting Features

### 1. Activation Diagnostics
- Log all activation events and their results
- Provide workspace analysis information
- Report command registration status

### 2. Menu Diagnostics
- Validate menu configuration on startup
- Check when-clause conditions
- Report menu visibility status

### 3. User-Facing Diagnostics
- Add "DoraCodeBirdView: Diagnose Issues" command
- Provide troubleshooting guide in output channel
- Offer quick fixes for common problems