---
inclusion: always
---

# Technology Stack & Development Guidelines

## Core Technologies

### TypeScript Extension (Frontend)

- **TypeScript 4.x+**: Primary development language - use strict typing
- **VS Code Extension API**: Platform integration - follow VS Code extension patterns
- **Node.js**: Runtime - use async/await patterns, avoid blocking operations
- **Cytoscape.js**: Graph visualization - for interactive network diagrams

### Python Analyzer (Backend)

- **Python 3.8+**: Analysis engine - use type hints and dataclasses
- **Poetry**: Dependency management - always use `poetry install` for setup
- **AST parsing**: Code analysis - prefer ast module over regex parsing
- **Radon**: Complexity metrics - integrate for cyclomatic complexity

## Development Commands

### TypeScript Extension

```bash
# Development workflow
npm install                 # Install dependencies
npm run compile            # Compile TypeScript
npm run watch              # Watch mode for development
npm test                   # Run TypeScript tests
```

### Python Analyzer

```bash
cd analyzer
poetry install             # Install dependencies
poetry run pytest         # Run all tests
poetry run python analyzer.py  # Direct execution
```

## Critical Dependencies

### TypeScript Stack

- `@types/vscode`: VS Code API types - required for extension development
- `typescript`: Compiler - maintain version compatibility with VS Code
- `eslint`: Code quality - follow configured rules strictly

### Python Stack

- `radon ^6.0.1`: Complexity analysis - core functionality
- `pytest ^7.0.0`: Testing framework - use for all test files
- `typing`: Type annotations - use for better code clarity

## Architecture Constraints

### Hybrid System Rules

- **TypeScript handles UI/UX**: All VS Code integration, webviews, commands
- **Python handles analysis**: All code parsing, complexity calculation, git analysis
- **Communication via subprocess**: Use JSON for data exchange between layers
- **Error isolation**: Python errors must not crash TypeScript extension

### Design Patterns (Mandatory)

- **Singleton managers**: Use for `AnalysisManager`, `CommandManager`, `ErrorHandler`
- **Command pattern**: All user actions trigger registered VS Code commands
- **Provider pattern**: Webviews use provider classes for lifecycle management
- **Service layer**: Business logic separated from UI in `src/services/`

## File Modification Guidelines

### When modifying TypeScript files:

- Always compile with `npm run compile` before testing
- Use strict TypeScript settings - no `any` types
- Follow existing error handling patterns via `ErrorHandler`
- Register new commands in `CommandManager`

### When modifying Python files:

- Run tests with `poetry run pytest` after changes
- Use type hints for all function parameters and returns
- Follow snake_case naming consistently
- Add docstrings for public methods

### Cross-language changes:

- Update both TypeScript and Python when changing data contracts
- Test subprocess communication thoroughly
- Ensure JSON serialization compatibility

## Testing Requirements

### TypeScript Tests

- Use VS Code test framework for extension tests
- Mock Python subprocess calls in unit tests
- Test command registration and webview lifecycle

### Python Tests

- Use pytest for all analysis logic tests
- Test with real code samples from `examples/` directory
- Verify JSON output format compatibility

## Performance Guidelines

- **Caching**: Implement for expensive analysis operations
- **Async operations**: Use for all file I/O and subprocess calls
- **Memory management**: Clean up webview resources properly
- **Background processing**: Don't block VS Code UI thread
