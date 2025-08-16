# DoraCodeBirdView User Guide

Welcome to DoraCodeBirdView, an advanced VS Code extension that provides comprehensive code analysis and visualization capabilities for Python projects. This guide will walk you through all the powerful features available in DoraCodeBirdView.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Context Menu Overview](#context-menu-overview)
3. [Full Code Analysis](#full-code-analysis)
4. [Git Analytics Features](#git-analytics-features)
5. [Database Schema Analysis](#database-schema-analysis)
6. [JSON Utilities](#json-utilities)
7. [Current File Analysis](#current-file-analysis)
8. [Export and Integration](#export-and-integration)
9. [Tips and Best Practices](#tips-and-best-practices)
10. [Troubleshooting](#troubleshooting)

## Getting Started

### Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "DoraCodeBirdView"
4. Click Install
5. Reload VS Code when prompted

### Prerequisites

- Python 3.8 or higher
- Git (for Git analytics features)
- A Python project with .py files

### First Analysis

1. Open a Python project in VS Code
2. Right-click on any Python file
3. Select **DoraCodeBirdView** → **Full Code Analysis** → **Tech Stack**
4. Wait for the analysis to complete
5. Explore your project's insights!

## Context Menu Overview

DoraCodeBirdView provides a comprehensive context menu when you right-click on Python files. Here's what each option does:

```
DoraCodeBirdView ►
├── Full Code Analysis ►
│   ├── Tech Stack          # View detected libraries and frameworks
│   ├── Graph View          # Interactive module dependency graph
│   └── JSON View           # Raw analysis data in JSON format
├── Current File Analysis ► # Analyze just the current file
│   ├── Tech Stack
│   ├── Graph View
│   └── JSON View
├── Call Hierarchy ►        # Function call relationships
│   ├── Graph View
│   └── JSON View
├── Git Commits ►           # Git repository analytics
│   ├── Author Statistics   # Contributor analysis
│   ├── Module Contributions # Module-wise Git stats
│   └── Commit Timeline     # Commit history visualization
├── DB Schema ►             # Database schema analysis
│   ├── Graph View          # Visual schema representation
│   └── Raw SQL             # Extracted SQL statements
└── JSON Utils ►            # JSON processing tools
    ├── JSON Format         # Format JSON in current editor
    └── JSON Tree View      # Expandable JSON tree
```

## Full Code Analysis

The Full Code Analysis feature provides comprehensive insights into your entire Python project through three main views.

### Tech Stack View

The Tech Stack view shows you all the technologies detected in your project:

**What you'll see:**
- **Frameworks**: Django, Flask, FastAPI, etc.
- **Libraries**: NumPy, Pandas, Requests, etc.
- **Development Tools**: pytest, black, mypy, etc.
- **Database Technologies**: SQLAlchemy, Django ORM, etc.

**How to use:**
1. Right-click on any Python file
2. Select **DoraCodeBirdView** → **Full Code Analysis** → **Tech Stack**
3. Browse the categorized list of detected technologies
4. Click on any technology to see where it's used in your project

### Graph View

The Graph View provides an interactive visualization of your project's module structure with enhanced styling.

**Key Features:**
- **Module Cards**: Modules are displayed as styled rectangular cards instead of simple nodes
- **Folder Organization**: Modules are grouped by their folder structure
- **Complexity Color Coding**: 
  - 🟢 Green: Low complexity (easy to maintain)
  - 🟡 Orange: Medium complexity (moderate maintenance)
  - 🔴 Red: High complexity (needs attention)
- **Interactive Navigation**: Click on modules to navigate to their files
- **Dependency Visualization**: Clear lines show relationships between modules

**How to use:**
1. Right-click on any Python file
2. Select **DoraCodeBirdView** → **Full Code Analysis** → **Graph View**
3. Use mouse wheel to zoom in/out
4. Drag to pan around the graph
5. Click on module cards to navigate to the code
6. Hover over cards to see additional information

**Example Graph Layout:**
```
┌─────────────────┐    ┌─────────────────┐
│   models/       │    │   views/        │
│  ┌───────────┐  │    │  ┌───────────┐  │
│  │   User    │──┼────┼──│ UserView  │  │
│  │  (Green)  │  │    │  │ (Orange)  │  │
│  └───────────┘  │    │  └───────────┘  │
└─────────────────┘    └─────────────────┘
```

### JSON View

The JSON View displays the complete analysis data in a formatted, readable JSON structure.

**What you'll find:**
- Complete project metadata
- Detailed module information
- Complexity metrics
- Framework detection results
- Dependency relationships

**How to use:**
1. Right-click on any Python file
2. Select **DoraCodeBirdView** → **Full Code Analysis** → **JSON View**
3. Browse the structured data
4. Use Ctrl+F to search for specific information
5. Copy sections for external analysis or reporting

## Git Analytics Features

DoraCodeBirdView provides powerful Git repository analysis to understand development patterns and team contributions.

### Author Statistics

Get comprehensive insights into contributor activity across your project.

**What you'll see:**
- **Contributor List**: All authors who have committed to the repository
- **Commit Counts**: Total commits per author
- **Lines of Code**: Lines added and removed by each contributor
- **Activity Timeline**: When each author was most active
- **Contribution Percentage**: Relative contribution of each team member

**How to use:**
1. Right-click on any Python file in a Git repository
2. Select **DoraCodeBirdView** → **Git Commits** → **Author Statistics**
3. Review the contributor dashboard
4. Use filters to focus on specific time periods or authors

**Example Output:**
```
📊 Author Statistics
┌─────────────────┬─────────┬─────────┬─────────┬──────────────┐
│ Author          │ Commits │ Added   │ Removed │ Contribution │
├─────────────────┼─────────┼─────────┼─────────┼──────────────┤
│ Alice Johnson   │ 127     │ 15,432  │ 3,221   │ 45.2%        │
│ Bob Smith       │ 89      │ 11,234  │ 2,876   │ 31.7%        │
│ Carol Davis     │ 65      │ 6,543   │ 1,432   │ 23.1%        │
└─────────────────┴─────────┴─────────┴─────────┴──────────────┘
```

### Module Contributions

Understand which team members work on which parts of your codebase.

**What you'll see:**
- **Module Breakdown**: Commits per module/folder
- **Author Distribution**: Who works on each module
- **Hotspot Analysis**: Most frequently changed modules
- **Ownership Patterns**: Primary maintainers of each module

**How to use:**
1. Right-click on any Python file
2. Select **DoraCodeBirdView** → **Git Commits** → **Module Contributions**
3. Explore module-wise statistics
4. Identify code ownership patterns
5. Find modules that need more attention

**Example Visualization:**
```
📁 Module Contributions

models/ (234 commits)
├── Alice Johnson: 45% (105 commits)
├── Bob Smith: 35% (82 commits)
└── Carol Davis: 20% (47 commits)

views/ (189 commits)
├── Bob Smith: 55% (104 commits)
├── Alice Johnson: 30% (57 commits)
└── Carol Davis: 15% (28 commits)
```

### Commit Timeline

Visualize your project's development history over time.

**What you'll see:**
- **Timeline Charts**: Commit activity over months/weeks
- **Activity Patterns**: Peak development periods
- **Release Cycles**: Development intensity around releases
- **Team Velocity**: How development speed changes over time

**How to use:**
1. Right-click on any Python file
2. Select **DoraCodeBirdView** → **Git Commits** → **Commit Timeline**
3. Analyze development patterns
4. Identify busy periods and quiet phases
5. Plan future development cycles

## Database Schema Analysis

DoraCodeBirdView can analyze your database schema from Django models, SQLAlchemy models, and raw SQL files.

### Graph View

Visualize your database structure as an interactive graph.

**What you'll see:**
- **Table Nodes**: Each database table as a styled node
- **Relationship Lines**: Foreign key relationships with directional arrows
- **Column Information**: Table columns displayed within each node
- **Constraint Indicators**: Primary keys, foreign keys, and unique constraints
- **Interactive Details**: Hover for additional table information

**How to use:**
1. Right-click on any Python file in a project with database models
2. Select **DoraCodeBirdView** → **DB Schema** → **Graph View**
3. Explore your database structure visually
4. Follow relationship lines to understand data flow
5. Click on tables to see detailed column information

**Example Schema Graph:**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Users       │    │     Orders      │    │   OrderItems    │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ 🔑 id (PK)      │    │ 🔑 id (PK)      │    │ 🔑 id (PK)      │
│ 📧 email        │◄───┤ 🔗 user_id (FK) │    │ 🔗 order_id (FK)│◄──┐
│ 👤 username     │    │ 💰 total        │    │ 🔗 product_id   │   │
│ 📅 created_at   │    │ 📅 created_at   │    │ 🔢 quantity     │   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┐            │
                       │    Products     │            │
                       ├─────────────────┤            │
                       │ 🔑 id (PK)      │◄───────────┘
                       │ 📝 name         │
                       │ 💰 price        │
                       │ 📦 stock        │
                       └─────────────────┘
```

### Raw SQL View

Browse all SQL statements extracted from your project.

**What you'll see:**
- **SQL Categories**: Organized by statement type (CREATE, ALTER, INSERT, etc.)
- **Syntax Highlighting**: Color-coded SQL for better readability
- **File References**: Which files contain each SQL statement
- **Table References**: Which tables are affected by each statement
- **Migration History**: SQL from Django/Alembic migrations

**How to use:**
1. Right-click on any Python file
2. Select **DoraCodeBirdView** → **DB Schema** → **Raw SQL**
3. Browse SQL statements by category
4. Click on statements to navigate to their source files
5. Use the search function to find specific SQL patterns

**Example SQL Categories:**
```
📋 Raw SQL Statements

CREATE TABLE (12 statements)
├── CREATE TABLE users (...) - models.py:15
├── CREATE TABLE orders (...) - models.py:28
└── CREATE TABLE products (...) - models.py:41

ALTER TABLE (8 statements)
├── ALTER TABLE users ADD COLUMN (...) - migration_001.py:12
└── ALTER TABLE orders ADD CONSTRAINT (...) - migration_002.py:8

SELECT (45 statements)
├── SELECT * FROM users WHERE (...) - views.py:23
├── SELECT COUNT(*) FROM orders (...) - reports.py:15
└── SELECT p.name, SUM(oi.quantity) (...) - analytics.py:67
```

## JSON Utilities

DoraCodeBirdView includes powerful JSON processing tools for working with JSON data in your projects.

### JSON Format

Beautify and format JSON content in your current editor.

**Features:**
- **Auto-formatting**: Proper indentation and spacing
- **Syntax Validation**: Identifies and highlights JSON errors
- **Error Reporting**: Clear messages for syntax issues
- **Preservation**: Maintains data integrity while improving readability

**How to use:**
1. Open a file containing JSON data
2. Right-click in the editor
3. Select **DoraCodeBirdView** → **JSON Utils** → **JSON Format**
4. Your JSON will be automatically formatted

**Before formatting:**
```json
{"name":"John","age":30,"city":"New York","hobbies":["reading","swimming"],"address":{"street":"123 Main St","zip":"10001"}}
```

**After formatting:**
```json
{
  "name": "John",
  "age": 30,
  "city": "New York",
  "hobbies": [
    "reading",
    "swimming"
  ],
  "address": {
    "street": "123 Main St",
    "zip": "10001"
  }
}
```

### JSON Tree View

Explore JSON data in an expandable tree structure.

**Features:**
- **Expandable Nodes**: Click to expand/collapse objects and arrays
- **Search Functionality**: Find specific keys or values quickly
- **Path Display**: Shows the JSON path to any selected element
- **Value Types**: Clear indication of data types (string, number, boolean, etc.)
- **Large File Support**: Efficient rendering for large JSON files

**How to use:**
1. Select JSON content in your editor (or place cursor in JSON file)
2. Right-click and select **DoraCodeBirdView** → **JSON Utils** → **JSON Tree View**
3. Explore the tree structure in the new panel
4. Use the search box to find specific elements
5. Click on values to see their full content

**Example Tree View:**
```
📄 JSON Tree View

🔽 root (object)
  ├── 📝 name: "John" (string)
  ├── 🔢 age: 30 (number)
  ├── 📝 city: "New York" (string)
  ├── 🔽 hobbies (array[2])
  │   ├── [0] "reading" (string)
  │   └── [1] "swimming" (string)
  └── 🔽 address (object)
      ├── 📝 street: "123 Main St" (string)
      └── 📝 zip: "10001" (string)
```

## Current File Analysis

Analyze just the file you're currently working on for quick insights.

**What you'll get:**
- **File-specific Complexity**: Complexity metrics for the current file only
- **Function Analysis**: Complexity score for each function in the file
- **Import Dependencies**: What this file depends on
- **Framework Patterns**: Framework-specific patterns in this file
- **Quick Insights**: Fast analysis without processing the entire project

**How to use:**
1. Open any Python file
2. Right-click in the editor
3. Select **DoraCodeBirdView** → **Current File Analysis** → choose your view
4. Get instant insights about the current file

**Example Output:**
```
📄 Current File Analysis: user_views.py

📊 Complexity Metrics:
├── Overall File Complexity: 7.2 (Medium)
├── Function Count: 8
└── Average Function Complexity: 3.1

🔧 Functions:
├── create_user(): 2.1 (Low) ✅
├── update_user(): 4.3 (Medium) ⚠️
├── delete_user(): 1.8 (Low) ✅
└── get_user_stats(): 8.7 (High) ❌

📦 Dependencies:
├── django.contrib.auth.models
├── django.http
└── .models (local)
```

## Export and Integration

DoraCodeBirdView provides comprehensive export capabilities for sharing insights and integrating with other tools.

### Export Formats

**JSON Export**
- Complete analysis data in structured JSON format
- Suitable for programmatic processing
- Includes all metadata and analysis results

**CSV Export**
- Tabular data for spreadsheet analysis
- Module complexity scores
- Git statistics and author contributions
- Function-level metrics

**HTML Reports**
- Formatted reports with charts and graphs
- Suitable for sharing with stakeholders
- Includes visual representations of data

**Image Export**
- PNG/SVG export of graph visualizations
- High-resolution images for presentations
- Database schema diagrams

### How to Export

1. Complete any analysis (Full Code Analysis, Git Analytics, etc.)
2. Look for the **Export** button in the analysis results
3. Choose your preferred format
4. Select the destination folder
5. Open the exported file in your preferred application

### Integration APIs

DoraCodeBirdView provides stable data structures for integration with external tools:

```json
{
  "analysis_metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "2.0.0",
    "project_path": "/path/to/project"
  },
  "modules": [...],
  "git_analytics": [...],
  "database_schema": [...]
}
```

## Tips and Best Practices

### Getting the Best Results

1. **Project Structure**: Organize your Python project with clear module boundaries
2. **Git History**: Maintain a clean Git history for better analytics
3. **Documentation**: Use docstrings and comments for better analysis
4. **Dependencies**: Keep requirements.txt or pyproject.toml up to date

### Performance Tips

1. **Large Projects**: Use Current File Analysis for quick insights on large codebases
2. **Git Repositories**: Git analytics work best with repositories that have regular commits
3. **Caching**: DoraCodeBirdView caches results - subsequent analyses will be faster
4. **Selective Analysis**: Use specific analysis types rather than always running full analysis

### Workflow Integration

1. **Code Reviews**: Use complexity metrics to identify areas needing review
2. **Refactoring**: Focus on high-complexity modules shown in red
3. **Team Planning**: Use Git analytics to understand team contributions
4. **Architecture Decisions**: Use dependency graphs to understand module relationships

## Troubleshooting

### Common Issues

**"No analysis data available"**
- Ensure you're in a Python project with .py files
- Check that Python is installed and accessible
- Try running analysis on a single file first

**Git analytics not working**
- Ensure the project is a Git repository (`git init` if needed)
- Check that Git is installed and in your PATH
- Verify you have commit history in the repository

**Database schema not detected**
- Ensure you have Django models, SQLAlchemy models, or SQL files
- Check that model files are in standard locations (models.py, models/, etc.)
- Verify your database models follow standard patterns

**Performance issues**
- Try Current File Analysis instead of Full Code Analysis
- Close other resource-intensive VS Code extensions
- Ensure you have sufficient RAM for large projects

**JSON utilities not working**
- Ensure the content is valid JSON
- Try formatting smaller JSON sections first
- Check that the file has a .json extension or contains JSON content

### Getting Help

1. **Check the Output Panel**: View detailed error messages in VS Code's Output panel
2. **Enable Debug Mode**: Add debug logging in extension settings
3. **Sample Projects**: Test with the included example projects
4. **GitHub Issues**: Report bugs and request features on our GitHub repository

### System Requirements

- **VS Code**: Version 1.74.0 or higher
- **Python**: Version 3.8 or higher
- **Git**: Any recent version (for Git analytics)
- **Memory**: At least 4GB RAM recommended for large projects
- **Storage**: 100MB free space for caching

---

## What's Next?

Now that you're familiar with DoraCodeBirdView's features, try:

1. **Analyze Your Current Project**: Start with a Full Code Analysis to get an overview
2. **Explore Git History**: Use Git Analytics to understand your team's contributions
3. **Optimize Complex Code**: Focus on red (high complexity) modules for refactoring
4. **Document Your Architecture**: Export graphs and share with your team
5. **Integrate with Your Workflow**: Use DoraCodeBirdView regularly during development

Happy coding with DoraCodeBirdView! 🚀