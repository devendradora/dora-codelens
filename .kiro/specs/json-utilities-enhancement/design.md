# Design Document

## Overview

This design enhances the existing JSON utilities by removing tree view functionality, adding minify capability, and implementing context-aware command enabling/disabling. The solution focuses on improving user experience by showing relevant commands only when applicable.

## Architecture

### Context Detection System
- **File Type Detection**: Check active editor file extension
- **Content Analysis**: Parse cursor position and surrounding text for JSON patterns
- **Command State Management**: Dynamically enable/disable commands based on context

### Command Structure
```
JSON Utilities
├── Format JSON (context-aware)
├── Validate JSON (context-aware)  
└── Minify JSON (new, context-aware)
```

## Components and Interfaces

### Enhanced JSON Utilities Service
```typescript
interface JsonUtilitiesService {
  formatJson(text: string): Promise<string>;
  validateJson(text: string): Promise<ValidationResult>;
  minifyJson(text: string): Promise<string>; // New method
  isJsonContext(document: TextDocument, position: Position): boolean; // New method
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
  line?: number;
  column?: number;
}
```

### Context Detection Interface
```typescript
interface JsonContextDetector {
  isJsonFile(document: TextDocument): boolean;
  hasJsonAtCursor(document: TextDocument, position: Position): boolean;
  getJsonTextAtCursor(document: TextDocument, position: Position): string | null;
}
```

### Command Registration Enhancement
```typescript
interface ContextAwareCommand {
  command: string;
  title: string;
  enablement: string; // VS Code when clause
}
```

## Data Models

### Context State
```typescript
interface JsonContext {
  isJsonFile: boolean;
  hasJsonAtCursor: boolean;
  selectedText: string;
  cursorPosition: Position;
}
```

### Command Configuration
```typescript
interface CommandConfig {
  id: string;
  title: string;
  category: string;
  enablementCondition: string;
  contextMenuGroup: string;
}
```

## Error Handling

### JSON Processing Errors
- **Invalid JSON**: Show user-friendly error messages with line/column information
- **Empty Selection**: Handle cases where no text is selected or at cursor
- **File Access**: Handle read-only files and permission issues

### Context Detection Errors
- **Cursor Position**: Handle edge cases at file boundaries
- **Large Files**: Implement efficient parsing for large JSON files
- **Mixed Content**: Handle files with both JSON and non-JSON content

## Testing Strategy

### Unit Tests
- JSON minification with various input formats
- Context detection accuracy across different file types
- Command enablement logic validation
- Error handling for malformed JSON

### Integration Tests
- Context menu command availability
- Command execution in different editor contexts
- File type detection accuracy
- Cursor position-based enabling/disabling

### Edge Case Testing
- Empty files
- Very large JSON files
- Nested JSON structures
- JSON within strings in other file types
- Multiple cursors/selections

## Implementation Details

### Context Detection Algorithm
1. Check file extension for `.json`
2. If not JSON file, analyze text around cursor position
3. Use regex patterns to detect JSON-like structures
4. Validate detected text as proper JSON
5. Return context state for command enablement

### Minify Implementation
- Remove all unnecessary whitespace
- Preserve string content integrity
- Maintain JSON structure validity
- Handle special characters and escape sequences

### Command Enablement
- Use VS Code's `when` clauses for context menu items
- Implement custom context keys for JSON detection
- Update context keys on cursor movement and file changes
- Provide tooltips for disabled commands

### Removed Components
- Tree view webview provider
- Tree view HTML templates
- Tree view related commands and handlers
- Associated CSS and JavaScript files