# CodeMindMap VS Code Extension

A powerful VS Code extension that provides visual analysis and navigation capabilities for Python projects. CodeMindMap creates interactive graph visualizations of project structure, dependencies, and code complexity while supporting framework-specific patterns for Django, Flask, and FastAPI.

![CodeMindMap Demo](https://via.placeholder.com/800x400/1e1e1e/ffffff?text=CodeMindMap+Demo)

## Features

### 🔍 **Project Analysis**
- **Tech Stack Detection**: Automatically identifies libraries and frameworks from requirements.txt, pyproject.toml, or Pipfile
- **Framework Support**: Specialized analysis for Django, Flask, and FastAPI projects
- **Dependency Mapping**: Visualizes module dependencies and import relationships

### 📊 **Visual Representations**
- **Module Graph**: Interactive visualization of project modules with complexity color-coding
- **Call Hierarchy**: Right-click any function to see its complete call graph
- **Complexity Analysis**: Visual indicators for code complexity using color coding (green/orange/red)

### 🚀 **VS Code Integration**
- **Sidebar Panel**: Browse project structure, dependencies, and modules
- **CodeLens**: Inline complexity scores above function definitions
- **Context Menu**: Right-click functions to show call hierarchy
- **Webview Graphs**: Interactive Cytoscape.js visualizations

### ⚡ **Performance**
- **Caching**: Intelligent caching system for fast re-analysis
- **Incremental Updates**: Only re-analyzes changed files
- **Large Project Support**: Optimized for real-world codebases

## Installation

### Prerequisites
- VS Code 1.74.0 or higher
- Python 3.8 or higher
- Node.js 16.0 or higher (for development)

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "CodeMindMap"
4. Click Install

### From Source
1. Clone the repository:
```bash
git clone https://github.com/your-username/codemindmap-extension.git
cd codemindmap-extension
```

2. Install dependencies:
```bash
npm install
cd analyzer
pip install -r requirements.txt
```

3. Build and install:
```bash
npm run compile
code --install-extension codemindmap-*.vsix
```

## Usage

### Basic Analysis
1. Open a Python project in VS Code
2. Open the Command Palette (Ctrl+Shift+P)
3. Run "CodeMindMap: Analyze Project"
4. View results in the sidebar and webview panels

### Call Hierarchy
1. Right-click on any function in your Python code
2. Select "Show Call Hierarchy"
3. Explore the interactive call graph in the webview

### Module Graph
1. After analysis, click "Show Module Graph" in the sidebar
2. Interact with the graph: zoom, pan, and click nodes
3. Color coding indicates complexity: Green (low), Orange (medium), Red (high)

### CodeLens Integration
- Complexity scores appear above function definitions
- Click on CodeLens items for detailed information
- Configure display preferences in VS Code settings

## Supported Frameworks

### Django
- URL pattern detection from urls.py files
- Model relationship mapping
- View function analysis
- Admin interface integration

### Flask
- Route detection via @app.route decorators
- Blueprint pattern recognition
- Template rendering analysis
- SQLAlchemy model relationships

### FastAPI
- Route detection via @app.get/post decorators
- Dependency injection pattern analysis
- Pydantic model relationships
- Automatic API documentation integration

## Configuration

### Extension Settings
Access settings via File → Preferences → Settings → Extensions → CodeMindMap

- `codemindmap.enableCodeLens`: Enable/disable CodeLens complexity annotations
- `codemindmap.complexityThresholds`: Customize complexity color thresholds
- `codemindmap.cacheEnabled`: Enable/disable analysis result caching
- `codemindmap.maxProjectSize`: Maximum project size for analysis

### Python Dependencies
The extension automatically manages Python dependencies, but you can manually install them:

```bash
cd analyzer
pip install -r requirements.txt
```

## Example Projects

The `examples/` directory contains sample projects demonstrating the extension's capabilities:

- **django-todo**: Django todo app with models, views, and URL patterns
- **flask-todo**: Flask todo app using Blueprints and SQLAlchemy
- **fastapi-todo**: FastAPI todo app with dependency injection

Each example includes setup instructions and demonstrates different framework patterns.

## Troubleshooting

### Common Issues

**Extension not activating**
- Ensure you have a Python project open
- Check that Python is installed and accessible
- Verify the workspace contains Python files

**Analysis fails**
- Check Python interpreter path in VS Code settings
- Ensure required Python packages are installed
- Review the Output panel for error messages

**Performance issues**
- Enable caching in extension settings
- Consider analyzing specific directories for large projects
- Adjust project size limits in settings

**Webview not loading**
- Disable other extensions that might conflict
- Check browser console in webview (Developer Tools)
- Restart VS Code and try again

### Getting Help
- Check the [GitHub Issues](https://github.com/your-username/codemindmap-extension/issues)
- Review the [Developer Documentation](docs/DEVELOPER.md)
- Submit bug reports with project details and error logs

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup
1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Install Python dependencies: `cd analyzer && pip install -r requirements.txt`
4. Open in VS Code and press F5 to launch Extension Development Host
5. Make changes and test in the development environment

### Running Tests
```bash
# TypeScript tests
npm test

# Python tests
cd analyzer
python -m pytest
```

## Architecture

CodeMindMap uses a hybrid architecture:

- **Python Analyzer**: Static analysis engine using AST parsing
- **TypeScript Extension**: VS Code integration and UI
- **Webview Visualization**: Interactive graphs using Cytoscape.js

For detailed architecture information, see [docs/DEVELOPER.md](docs/DEVELOPER.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Cytoscape.js](https://cytoscape.org/) for graph visualization
- [Radon](https://radon.readthedocs.io/) for complexity analysis
- [VS Code Extension API](https://code.visualstudio.com/api) for integration capabilities

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.