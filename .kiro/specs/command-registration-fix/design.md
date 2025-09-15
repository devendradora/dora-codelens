# Design Document

## Overview

The DoraCodeLens extension is experiencing a duplicate command registration error during activation. The issue stems from the `'doracodelens.codeLensStateChanged'` command being registered in two different locations:

1. **CommandManager** (line 252-256 in `src/core/command-manager.ts`)
2. **SidebarContentProvider** (line 561 in `src/services/sidebar-content-provider.ts`)

Both components register the same command during initialization, causing VS Code to throw an error when the second registration attempt occurs. This prevents the extension from activating successfully.

## Architecture

### Current Problem Architecture

```
Extension Activation
├── CommandManager.registerAllCommands()
│   └── Registers 'doracodelens.codeLensStateChanged' ✓
└── SidebarContentProvider.getInstance()
    └── registerStateListeners()
        └── Registers 'doracodelens.codeLensStateChanged' ✗ (DUPLICATE)
```

### Proposed Solution Architecture

```
Extension Activation
├── CommandManager.registerAllCommands()
│   └── Registers 'doracodelens.codeLensStateChanged' ✓
└── SidebarContentProvider.getInstance()
    └── registerStateListeners()
        └── Subscribes to existing command ✓
```

## Components and Interfaces

### 1. Command Registration Manager

**Purpose**: Centralize command registration and provide a registry to prevent duplicates.

**Interface**:
```typescript
interface ICommandRegistrationManager {
  isCommandRegistered(commandId: string): boolean;
  registerCommand(commandId: string, handler: (...args: any[]) => any): vscode.Disposable;
  getRegisteredCommands(): string[];
}
```

### 2. Enhanced CommandManager

**Changes**:
- Maintain a registry of registered commands
- Provide method to check if command exists before registration
- Expose command handlers for other components to use

**New Methods**:
```typescript
public isCommandRegistered(commandId: string): boolean
public getCommandHandler(commandId: string): ((...args: any[]) => any) | undefined
```

### 3. Updated SidebarContentProvider

**Changes**:
- Remove direct command registration
- Use existing command or subscribe to command events
- Implement proper disposal pattern for command subscriptions

**Modified Methods**:
```typescript
private registerStateListeners(): void // Updated to not register commands
public dispose(): void // Enhanced to clean up subscriptions
```

## Data Models

### Command Registry Model

```typescript
interface CommandRegistration {
  commandId: string;
  handler: (...args: any[]) => any;
  disposable: vscode.Disposable;
  registeredBy: string; // Component name for debugging
  registrationTime: number;
}

interface CommandRegistry {
  [commandId: string]: CommandRegistration;
}
```

### State Change Event Model

```typescript
interface CodeLensStateChangeEvent {
  enabled: boolean;
  timestamp: number;
  source: 'user' | 'system' | 'initialization';
}
```

## Error Handling

### 1. Registration Conflict Detection

- **Pre-registration Check**: Before registering any command, check if it already exists
- **Graceful Fallback**: If command exists, subscribe to it instead of registering
- **Detailed Logging**: Log which component attempted duplicate registration

### 2. Command Disposal Safety

- **Disposal Tracking**: Track all command disposables for proper cleanup
- **Safe Disposal**: Ensure commands are disposed only once
- **Error Recovery**: Handle disposal errors gracefully without affecting extension shutdown

### 3. Initialization Order Independence

- **Lazy Registration**: Allow components to register commands in any order
- **Dependency Resolution**: Resolve command dependencies automatically
- **Retry Mechanism**: Retry command operations if dependencies aren't ready

## Testing Strategy

### 1. Unit Tests

**CommandManager Tests**:
- Test command registration without duplicates
- Test command registry functionality
- Test proper disposal of commands

**SidebarContentProvider Tests**:
- Test initialization without command registration
- Test state change event handling
- Test proper disposal

### 2. Integration Tests

**Extension Activation Tests**:
- Test full extension activation without command conflicts
- Test multiple activation/deactivation cycles
- Test command functionality after activation

**Command Lifecycle Tests**:
- Test command registration order independence
- Test proper cleanup during extension disposal
- Test error recovery scenarios

### 3. Error Scenario Tests

**Duplicate Registration Tests**:
- Test behavior when duplicate registration is attempted
- Test graceful fallback mechanisms
- Test error logging and reporting

**Disposal Error Tests**:
- Test extension behavior when command disposal fails
- Test partial disposal scenarios
- Test recovery from disposal errors

## Implementation Approach

### Phase 1: Command Registry Infrastructure
1. Create command registration manager
2. Update CommandManager to use registry
3. Add command existence checking

### Phase 2: SidebarContentProvider Refactoring
1. Remove direct command registration from SidebarContentProvider
2. Implement event subscription pattern
3. Update disposal logic

### Phase 3: Error Handling Enhancement
1. Add comprehensive error handling for command operations
2. Implement detailed logging for debugging
3. Add graceful fallback mechanisms

### Phase 4: Testing and Validation
1. Create comprehensive test suite
2. Test all error scenarios
3. Validate extension activation reliability