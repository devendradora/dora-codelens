---
inclusion: always
---

# DoraCodeLens Product & Development Guidelines

DoraCodeLens is a VS Code extension for Python project analysis and visualization, providing static code analysis, interactive graph visualizations, and development insights through specialized webviews.

## Core Architecture Principles

- **Hybrid TypeScript/Python**: Extension UI in TypeScript, analysis engine in Python
- **Command-Driven**: All features accessible via VS Code command palette
- **Webview-Based UI**: Analysis results displayed in tabbed webviews with interactive visualizations
- **Singleton Managers**: Core functionality organized through singleton manager classes
- **Error Resilience**: Graceful degradation when analysis fails, never crash the extension

## Key Features & Components

### Analysis Types

- **Full Code Analysis**: Complete project structure and complexity analysis
- **Current File Analysis**: Single file focused analysis with inline suggestions
- **Git Analytics**: Repository insights, contributor analysis, commit timelines
- **Database Schema**: Visual database relationship mapping
- **JSON Utilities**: Formatting, validation, tree exploration

### Framework Detection

- Django, Flask, FastAPI automatic detection and specialized analysis
- Framework-specific patterns and best practices recognition

## Development Conventions

### Code Style

- **TypeScript**: PascalCase classes, camelCase functions/variables, kebab-case files
- **Python**: snake_case everything except PascalCase classes
- **Commands**: Prefix all commands with `doracodelens.`
- **Error Handling**: Always use centralized ErrorHandler, never throw unhandled exceptions

### Architecture Patterns

- **Manager Pattern**: Core functionality in singleton managers (AnalysisManager, CommandManager)
- **Provider Pattern**: Webview providers for different analysis types
- **Service Layer**: Business logic in services/, UI logic in webviews/
- **Command Handlers**: Separate handlers in commands/ for each command type

### File Organization Rules

- Commands go in `src/commands/` with descriptive handler names
- Webviews go in `src/webviews/` with corresponding provider classes
- Core infrastructure in `src/core/` (managers, error handling, state)
- Business logic services in `src/services/`
- Python analyzer completely separate in `analyzer/` directory

### Performance Guidelines

- Use caching for expensive analysis operations
- Implement duplicate call guards for user-triggered commands
- Background analysis should not block UI interactions
- Webview updates should be debounced for large datasets

### User Experience Principles

- All analysis should provide progress feedback
- Failed analysis should show helpful error messages
- Commands should be discoverable through command palette
- Webviews should handle loading and error states gracefully
