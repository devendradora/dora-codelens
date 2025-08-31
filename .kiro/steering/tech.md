# Technology Stack & Build System

## Primary Technologies

### Frontend (VS Code Extension)

- **TypeScript**: Main language for extension development
- **VS Code Extension API**: Core platform integration
- **Node.js**: Runtime environment
- **Cytoscape.js**: Interactive graph visualization library

### Backend (Python Analyzer)

- **Python 3.8+**: Analysis engine runtime
- **Poetry**: Python dependency management and packaging
- **AST (Abstract Syntax Tree)**: Code parsing and analysis
- **Radon**: Cyclomatic complexity analysis

## Build System & Commands

### TypeScript Extension

```bash
# Compile TypeScript to JavaScript
npm run compile
# or
tsc -p .

# Install dependencies
npm install

# Package extension (if needed)
vsce package
```

### Python Analyzer

```bash
# Navigate to analyzer directory
cd analyzer

# Install dependencies with Poetry
poetry install

# Run tests
poetry run pytest
# or
python -m pytest

# Run analyzer directly
python analyzer.py [options]
```

## Key Dependencies

### TypeScript Dependencies

- `@types/vscode`: VS Code API type definitions
- `typescript`: TypeScript compiler

### Python Dependencies

- `radon ^6.0.1`: Complexity analysis
- `pytest ^7.0.0`: Testing framework (dev)

## Configuration Files

- `tsconfig.json`: TypeScript compiler configuration
- `analyzer/pyproject.toml`: Python project and dependency configuration
- `package.json`: Extension manifest and npm configuration
- `.eslintrc.json`: Code linting rules

## Development Workflow

1. **Extension Development**: Use F5 in VS Code to launch Extension Development Host
2. **Python Changes**: Restart extension after modifying Python analyzer
3. **Testing**: Run both TypeScript and Python test suites
4. **Debugging**: Use VS Code debugger for TypeScript, Python logging for analyzer

## Architecture Pattern

- **Hybrid Architecture**: TypeScript extension + Python analyzer backend
- **Command Pattern**: Commands trigger Python analysis via subprocess
- **Webview Pattern**: Results displayed in VS Code webviews
- **Singleton Pattern**: Core managers use singleton instances for state management
