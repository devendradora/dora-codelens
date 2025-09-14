# Design Document

## Overview

This feature implements CodeLens toggle functionality in the VS Code context menu with dynamic text, proper menu ordering, and fixes the automatic webview opening issue. When files are opened, they should be analyzed in the background and display complexity information inline as CodeLens annotations instead of opening webview panels.

## Architecture

### Core Components

1. **Menu Command Registration**: Register separate enable/disable commands in package.json
2. **State-Aware Menu Items**: Dynamic menu text based on CodeLens enabled state
3. **Command Handler**: Toggle functionality that updates both state and menu text
4. **Menu Ordering**: Proper sequence of context menu items
5. **Background Analysis**: Analyze files without opening webviews
6. **Inline CodeLens Display**: Show complexity metrics above functions/classes

## Components and Interfaces

### Menu Configuration Structure

```json
{
  "menus": {
    "editor/context": [
      {
        "command": "doracodelens.analyzeFullCode",
        "when": "resourceExtname == .py",
        "group": "doracodelens@1"
      },
      {
        "command": "doracodelens.analyzeCurrentFile", 
        "when": "resourceExtname == .py",
        "group": "doracodelens@2"
      },
      {
        "command": "doracodelens.enableCodeLens",
        "when": "resourceExtname == .py && !doracodelens.codeLensEnabled",
        "group": "doracodelens@3"
      },
      {
        "command": "doracodelens.disableCodeLens",
        "when": "resourceExtname == .py && doracodelens.codeLensEnabled", 
        "group": "doracodelens@3"
      }
    ]
  }
}
```

### Command Definitions

```json
{
  "commands": [
    {
      "command": "doracodelens.enableCodeLens",
      "title": "Code Lens (On)"
    },
    {
      "command": "doracodelens.disableCodeLens", 
      "title": "Code Lens (Off)"
    }
  ]
}
```

## Data Models

### CodeLens State Management

```typescript
interface CodeLensState {
  enabled: boolean;
  contextKey: string; // "doracodelens.codeLensEnabled"
}
```

### Background Analysis Integration

```typescript
interface BackgroundAnalysisConfig {
  preventWebviewOpen: boolean;
  enableInlineDisplay: boolean;
  analyzeOnFileOpen: boolean;
}
```

### Inline Complexity Display

```typescript
interface InlineComplexityData {
  functionName: string;
  complexity: number;
  references: number;
  lineCount: number;
  displayText: string; // "🔴 15 complexity • 3 references • 25 lines"
}
```

## Error Handling

- Handle state persistence across VS Code sessions
- Graceful fallback if state cannot be determined
- Error logging for command registration failures

## Testing Strategy

### Manual Testing
1. Right-click in Python file → Verify menu order and text
2. Click "Code Lens (On)" → Verify CodeLens enables and menu changes to "Code Lens (Off)"
3. Click "Code Lens (Off)" → Verify CodeLens disables and menu changes to "Code Lens (On)"
4. Restart VS Code → Verify state persists