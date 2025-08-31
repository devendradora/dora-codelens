# Project Structure & Organization

## Root Level Structure

```
├── src/                    # TypeScript extension source code
├── analyzer/               # Python analysis engine
├── examples/               # Sample projects for testing
├── docs/                   # Documentation
├── resources/              # Static assets (CSS, JS, SVG)
├── out/                    # Compiled TypeScript output
├── node_modules/           # Node.js dependencies
├── src-backup/             # Legacy code backup
└── .kiro/                  # Kiro AI assistant configuration
```

## TypeScript Extension Structure (`src/`)

### Core Architecture
- `src/extension.ts` - Main extension entry point and activation
- `src/core/` - Core infrastructure and managers
  - `analysis-manager.ts` - Coordinates analysis operations
  - `command-manager.ts` - Handles VS Code command registration
  - `error-handler.ts` - Centralized error handling
  - `duplicate-call-guard.ts` - Prevents duplicate analysis calls
  - `analysis-state-manager.ts` - Manages analysis state

### Feature Modules
- `src/commands/` - Command handlers for different analysis types
- `src/webviews/` - Webview providers for different analysis views
- `src/services/` - Service layer (Python service, HTML view service)
- `src/types/` - TypeScript type definitions

## Python Analyzer Structure (`analyzer/`)

### Core Files
- `analyzer.py` - Main analyzer entry point
- `ast_parser.py` - AST parsing and code structure analysis
- `complexity_analyzer.py` - Code complexity calculations
- `framework_detector.py` - Django/Flask/FastAPI detection
- `git_analyzer.py` - Git repository analysis
- `database_schema_analyzer.py` - Database schema analysis

### Supporting Modules
- `call_graph.py` - Function call relationship mapping
- `dependency_parser.py` - Import dependency analysis
- `cache_manager.py` - Analysis result caching
- `performance_optimizer.py` - Performance optimization utilities

## Naming Conventions

### TypeScript Files
- **PascalCase** for classes: `AnalysisManager`, `WebviewProvider`
- **kebab-case** for file names: `analysis-manager.ts`, `webview-provider.ts`
- **camelCase** for functions and variables: `analyzeCurrentFile`, `webviewManager`

### Python Files
- **snake_case** for all files, functions, and variables
- **PascalCase** for classes: `ComplexityAnalyzer`, `FrameworkDetector`
- Test files prefixed with `test_`: `test_analyzer.py`

## Configuration & Assets

### Configuration Files
- `package.json` - Extension manifest and dependencies
- `tsconfig.json` - TypeScript compiler settings
- `analyzer/pyproject.toml` - Python project configuration
- `.eslintrc.json` - Linting rules

### Resources (`resources/`)
- `webview.css` - Base webview styling
- `enhanced-graph-*.js/css` - Graph visualization assets
- `light/dark/` - Theme-specific icons and assets

## Development Patterns

### Manager Pattern
Core functionality organized into manager classes:
- `AnalysisManager` - Orchestrates analysis operations
- `WebviewManager` - Handles webview lifecycle
- `CommandManager` - Manages VS Code commands

### Provider Pattern
Webview providers for different analysis types:
- `FullCodeAnalysisWebview` - Complete project analysis
- `CurrentFileAnalysisWebview` - Single file analysis
- `GitAnalyticsWebview` - Git repository insights
- `DatabaseSchemaWebview` - Database schema visualization

### Error Handling
- Centralized error handling through `ErrorHandler` singleton
- Consistent logging patterns across TypeScript and Python
- Graceful degradation for analysis failures