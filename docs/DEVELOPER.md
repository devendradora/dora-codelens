# Developer Documentation

This document provides detailed information about the CodeMindMap extension architecture, development setup, and contribution guidelines.

## Architecture Overview

CodeMindMap follows a hybrid architecture combining Python-based static analysis with TypeScript-based VS Code integration.

### High-Level Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   VS Code       │    │   Python         │    │   Webview       │
│   Extension     │◄──►│   Analyzer       │    │   Visualization │
│   (TypeScript)  │    │   (Python)       │    │   (HTML/JS)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ • Extension API │    │ • AST Parsing    │    │ • Cytoscape.js  │
│ • Command Reg.  │    │ • Complexity     │    │ • Interactive   │
│ • Sidebar       │    │ • Framework Det. │    │ • Graph Render  │
│ • CodeLens      │    │ • Call Graph     │    │ • User Events   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Project Structure

```
codemindmap-extension/
├── src/                          # TypeScript source code
│   ├── extension.ts              # Main extension entry point
│   ├── analyzer-runner.ts        # Python analyzer execution
│   ├── sidebar-provider.ts       # Sidebar tree view
│   ├── webview-provider.ts       # Graph visualization
│   ├── codelens-provider.ts      # Complexity annotations
│   └── test/                     # TypeScript tests
├── analyzer/                     # Python analysis engine
│   ├── analyzer.py               # Main analyzer class
│   ├── ast_parser.py             # AST parsing utilities
│   ├── complexity_analyzer.py    # Complexity calculation
│   ├── framework_detector.py     # Framework pattern detection
│   ├── call_graph.py             # Call hierarchy analysis
│   ├── cache_manager.py          # Caching system
│   └── test_*.py                 # Python tests
├── resources/                    # Static resources
│   ├── webview.css               # Webview styling
│   └── icons/                    # Extension icons
├── examples/                     # Sample projects
│   ├── django-todo/              # Django example
│   ├── flask-todo/               # Flask example
│   └── fastapi-todo/             # FastAPI example
├── docs/                         # Documentation
└── package.json                  # Extension manifest
```

## Development Setup

### Prerequisites
- Node.js 16.0+
- Python 3.8+
- VS Code 1.74.0+
- Git

### Initial Setup
1. **Clone the repository**:
```bash
git clone https://github.com/your-username/codemindmap-extension.git
cd codemindmap-extension
```

2. **Install Node.js dependencies**:
```bash
npm install
```

3. **Install Python dependencies**:
```bash
cd analyzer
pip install -r requirements.txt
cd ..
```

4. **Build the extension**:
```bash
npm run compile
```

### Development Workflow

#### Running in Development Mode
1. Open the project in VS Code
2. Press `F5` to launch the Extension Development Host
3. Open a Python project in the new VS Code window
4. Test extension functionality

#### Making Changes
1. **TypeScript changes**: Modify files in `src/`, then run `npm run compile`
2. **Python changes**: Modify files in `analyzer/`, no compilation needed
3. **Webview changes**: Modify `resources/webview.css` or webview HTML in TypeScript files
4. Reload the Extension Development Host (`Ctrl+R`) to see changes

#### Testing
```bash
# Run TypeScript tests
npm test

# Run Python tests
cd analyzer
python -m pytest

# Run specific test file
python -m pytest test_analyzer.py -v

# Run with coverage
python -m pytest --cov=. --cov-report=html
```

## Core Components

### 1. Python Analyzer (`analyzer/`)

The Python analyzer is the core engine that performs static analysis of Python projects.

#### Key Classes

**ProjectAnalyzer** (`analyzer.py`)
- Main orchestrator class
- Coordinates all analysis components
- Generates final JSON output

```python
class ProjectAnalyzer:
    def analyze_project(self, project_path: str) -> AnalysisResult:
        """Main analysis entry point."""
        # 1. Discover Python files
        # 2. Parse AST for each file
        # 3. Build dependency graph
        # 4. Analyze complexity
        # 5. Detect framework patterns
        # 6. Generate call graph
        # 7. Return structured results
```

**ASTParser** (`ast_parser.py`)
- Parses Python files using the `ast` module
- Extracts functions, classes, and imports
- Handles syntax errors gracefully

**ComplexityAnalyzer** (`complexity_analyzer.py`)
- Uses the `radon` library for complexity calculation
- Provides color-coding thresholds
- Calculates module-level complexity scores

**FrameworkDetector** (`framework_detector.py`)
- Detects Django, Flask, and FastAPI patterns
- Extracts URL patterns and route definitions
- Identifies framework-specific relationships

**CallGraph** (`call_graph.py`)
- Builds function call relationships
- Tracks caller-callee connections
- Supports cross-module call analysis

#### Data Flow
```
Python Files → AST Parser → Function/Class Extraction
                    ↓
Dependency Parser → Import Resolution → Module Graph
                    ↓
Complexity Analyzer → Radon Integration → Complexity Scores
                    ↓
Framework Detector → Pattern Matching → Framework Data
                    ↓
Call Graph Builder → Call Analysis → Call Hierarchy
                    ↓
JSON Serializer → Structured Output → Extension
```

### 2. VS Code Extension (`src/`)

The TypeScript extension provides VS Code integration and user interface.

#### Key Classes

**Extension** (`extension.ts`)
- Main extension activation and command registration
- Coordinates all extension components
- Manages extension lifecycle

**AnalyzerRunner** (`analyzer-runner.ts`)
- Executes Python analyzer as subprocess
- Handles process communication and error handling
- Manages analysis progress and cancellation

**SidebarProvider** (`sidebar-provider.ts`)
- Implements VS Code TreeDataProvider
- Displays project structure in sidebar
- Handles user interactions and navigation

**WebviewProvider** (`webview-provider.ts`)
- Manages graph visualization webview
- Handles communication between extension and webview
- Renders interactive Cytoscape.js graphs

**CodeLensProvider** (`codelens-provider.ts`)
- Provides inline complexity annotations
- Integrates with VS Code CodeLens API
- Shows complexity scores above functions

#### Extension Activation Flow
```
VS Code Startup → Extension Activation → Command Registration
                         ↓
Python Project Detection → Analyzer Execution → Results Processing
                         ↓
Sidebar Population → WebView Creation → CodeLens Registration
                         ↓
User Interaction → Event Handling → UI Updates
```

### 3. Webview Visualization

The webview component provides interactive graph visualization using web technologies.

#### Technologies Used
- **Cytoscape.js**: Graph visualization library
- **HTML5 Canvas**: High-performance rendering
- **CSS3**: Styling and animations
- **TypeScript**: Type-safe interaction logic

#### Graph Types
1. **Module Graph**: Shows module dependencies with complexity color-coding
2. **Call Hierarchy**: Displays function call relationships as a tree

#### Interaction Features
- Zoom and pan
- Node selection and highlighting
- Search and filtering
- Click-to-navigate functionality

## Data Models

### Analysis Result Structure
```typescript
interface AnalysisResult {
    techStack: TechStack;
    modules: ModuleGraph;
    functions: CallGraph;
    frameworks: FrameworkPatterns;
    metadata: AnalysisMetadata;
}
```

### Module Graph
```typescript
interface ModuleGraph {
    nodes: ModuleNode[];
    edges: ModuleEdge[];
}

interface ModuleNode {
    id: string;
    name: string;
    path: string;
    complexity: ComplexityScore;
    functions: string[];
}
```

### Call Graph
```typescript
interface CallGraph {
    nodes: FunctionNode[];
    edges: CallEdge[];
}

interface FunctionNode {
    id: string;
    name: string;
    module: string;
    complexity: number;
    lineNumber: number;
}
```

## Testing Strategy

### Unit Tests
- **Python**: pytest with mock objects
- **TypeScript**: Mocha with VS Code Extension Test Runner

### Integration Tests
- End-to-end workflows with sample projects
- Cross-platform compatibility testing
- Performance benchmarking

### Test Coverage
- Maintain >80% code coverage
- Focus on critical paths and error handling
- Include edge cases and error scenarios

## Performance Considerations

### Caching Strategy
- File-based caching of analysis results
- Cache invalidation based on file modification times
- Incremental analysis for changed files only

### Memory Management
- Stream processing for large files
- Garbage collection for AST objects
- Limit concurrent file processing

### Optimization Techniques
- Parallel processing for module analysis
- Lazy loading for webview components
- Efficient data serialization

## Contributing Guidelines

### Code Style
- **TypeScript**: Follow VS Code extension conventions
- **Python**: Follow PEP 8 with Black formatting
- **Documentation**: Use JSDoc for TypeScript, docstrings for Python

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Ensure all tests pass
5. Submit pull request with description

### Issue Reporting
- Use GitHub issue templates
- Include reproduction steps
- Provide system information
- Attach relevant logs

## Debugging

### Extension Debugging
1. Open project in VS Code
2. Set breakpoints in TypeScript code
3. Press F5 to launch Extension Development Host
4. Debug in the new VS Code window

### Python Analyzer Debugging
1. Add print statements or use Python debugger
2. Run analyzer directly: `python analyzer.py /path/to/project`
3. Check output in VS Code Output panel

### Webview Debugging
1. Right-click in webview and select "Inspect Element"
2. Use browser developer tools
3. Check console for JavaScript errors

## Release Process

### Version Management
- Follow semantic versioning (semver)
- Update version in package.json
- Update CHANGELOG.md

### Building Release
```bash
# Build extension
npm run compile

# Package extension
vsce package

# Publish to marketplace
vsce publish
```

### Testing Release
- Test on multiple platforms
- Verify with different Python versions
- Test with various project sizes

## Future Enhancements

### Planned Features
- Support for additional Python frameworks
- Integration with other static analysis tools
- Enhanced visualization options
- Performance profiling integration

### Architecture Improvements
- Plugin system for custom analyzers
- WebAssembly for performance-critical components
- Real-time analysis with file watchers

## Resources

### Documentation
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Cytoscape.js Documentation](https://cytoscape.org/)
- [Python AST Module](https://docs.python.org/3/library/ast.html)

### Tools
- [VS Code Extension Generator](https://github.com/Microsoft/vscode-generator-code)
- [Extension Test Runner](https://github.com/microsoft/vscode-test)
- [VSCE Publishing Tool](https://github.com/microsoft/vscode-vsce)