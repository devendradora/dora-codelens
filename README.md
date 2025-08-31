# DoraCodeLens VS Code Extension

An advanced VS Code extension that provides comprehensive code analysis and visualization capabilities for Python projects. DoraCodeLens creates interactive graph visualizations of project structure, dependencies, and code complexity while supporting framework-specific patterns for Django, Flask, and FastAPI. Enhanced with Git analytics, database schema analysis, and JSON utilities for complete project insights.

![DoraCodeLens Demo](https://via.placeholder.com/800x400/1e1e1e/ffffff?text=DoraCodeLens+Demo)

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

### 🎨 **Enhanced Visualizations**
- **Module Cards**: Styled rectangular cards with folder-based organization
- **Git Analytics**: Author contributions, commit timelines, and module statistics
- **Database Schema**: Interactive schema graphs with table relationships
- **Tabbed Interface**: Organized views for Tech Stack, Graph, JSON, Git, and Database analysis

### 🛠️ **Developer Tools**
- **JSON Utilities**: Format, validate, and explore JSON data with tree view
- **Current File Analysis**: Quick insights for the file you're working on
- **Export Capabilities**: Share results in JSON, CSV, HTML, and image formats
- **Git Integration**: Comprehensive repository analysis and team insights

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
3. Search for "DoraCodeLens"
4. Click Install

### From Source
1. Clone the repository:
```bash
git clone https://github.com/your-username/doracodelens-extension.git
cd doracodelens-extension
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
code --install-extension doracodelens-*.vsix
```

## Usage

### Quick Start
1. Open a Python project in VS Code
2. Right-click on any Python file
3. Select **DoraCodeLens** → **Full Code Analysis** → **Tech Stack**
4. Explore your project's insights in the tabbed interface!

### Enhanced Context Menu
DoraCodeLens provides a comprehensive right-click context menu with organized options:

- **Full Code Analysis**: Complete project analysis with Tech Stack, Graph View, and JSON View
- **Current File Analysis**: Quick analysis of just the current file
- **Git Analytics**: Author statistics, module contributions, and commit timeline
- **Database Schema**: Visual schema graphs and raw SQL extraction
- **JSON Utilities**: JSON formatting and tree view capabilities

### Interactive Features
- **Module Cards**: Enhanced graph visualization with styled rectangular cards
- **Complexity Color Coding**: Green (low), Orange (medium), Red (high complexity)
- **Git Analytics Dashboard**: Comprehensive contributor and commit analysis
- **Database Schema Graphs**: Visual representation of table relationships
- **JSON Tree View**: Expandable JSON structure exploration

## Documentation

📚 **[Complete User Guide](docs/USER_GUIDE.md)** - Comprehensive guide to all features
📋 **[Quick Reference](docs/QUICK_REFERENCE.md)** - Handy cheat sheet for daily use
🎯 **[Examples & Screenshots](docs/EXAMPLES.md)** - Detailed usage examples
🔧 **[Developer Guide](docs/DEVELOPER.md)** - Architecture and development setup

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
Access settings via File → Preferences → Settings → Extensions → DoraCodeLens

- `doracodelens.enableCodeLens`: Enable/disable CodeLens complexity annotations
- `doracodelens.complexityThresholds`: Customize complexity color thresholds
- `doracodelens.cacheEnabled`: Enable/disable analysis result caching
- `doracodelens.maxProjectSize`: Maximum project size for analysis

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
- Check the [GitHub Issues](https://github.com/your-username/doracodelens-extension/issues)
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

DoraCodeLens uses a hybrid architecture:

- **Python Analyzer**: Static analysis engine using AST parsing
- **TypeScript Extension**: VS Code integration and UI
- **Webview Visualization**: Interactive graphs using Cytoscape.js
- **Git Analytics Engine**: Comprehensive Git repository analysis
- **Database Schema Analyzer**: Database schema analysis and visualization

For detailed architecture information, see [docs/DEVELOPER.md](docs/DEVELOPER.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Cytoscape.js](https://cytoscape.org/) for graph visualization
- [Radon](https://radon.readthedocs.io/) for complexity analysis
- [VS Code Extension API](https://code.visualstudio.com/api) for integration capabilities

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.