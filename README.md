# CodeMindMap

Visual analysis and navigation for Python projects with interactive graphs and complexity indicators.

## Features

- **Module Graph Visualization**: Interactive graph showing project modules with complexity color-coding
- **Call Hierarchy Analysis**: Right-click any function to see its complete call hierarchy
- **Framework Support**: Specialized support for Django, Flask, and FastAPI patterns
- **Complexity Analysis**: CodeLens annotations showing function complexity scores
- **Sidebar Integration**: Dedicated panel for project dependencies and modules

## Requirements

- VS Code 1.74.0 or higher
- Python 3.7 or higher
- Python project with .py files

## Extension Settings

This extension contributes the following settings:

- `codemindmap.pythonPath`: Path to Python executable
- `codemindmap.showComplexityCodeLens`: Show complexity scores as CodeLens annotations
- `codemindmap.complexityThresholds`: Complexity thresholds for color coding
- `codemindmap.enableCaching`: Enable caching of analysis results

## Development

### Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Press `F5` to open a new Extension Development Host window

### Building

- Run `npm run compile` to compile TypeScript
- Run `npm run watch` for continuous compilation
- Run `npm run lint` to check code quality

### Testing

- Run `npm test` to execute tests
- Open the debug viewlet and run "Extension Tests" to debug tests

## Release Notes

### 0.1.0

Initial release with basic project structure and VS Code integration.