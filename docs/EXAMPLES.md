# DoraCodeBirdView Examples and Screenshots

This document provides detailed examples and visual guides for using DoraCodeBirdView features.

## Visual Guide

> **Note**: Screenshots should be added to illustrate each feature. Below are descriptions of what each screenshot should show.

### 1. Context Menu Structure

**Screenshot Location**: `docs/images/context-menu.png`
**Description**: Right-click context menu showing the organized DoraCodeBirdView submenu structure with all options expanded.

**What to show**:
- Right-click on a Python file
- DoraCodeBirdView submenu expanded
- All sub-options visible (Full Code Analysis, Git Commits, etc.)
- Clean, organized menu structure

### 2. Full Code Analysis - Tech Stack View

**Screenshot Location**: `docs/images/tech-stack-view.png`
**Description**: Tech Stack tab showing detected frameworks, libraries, and tools.

**What to show**:
- Tabbed interface with Tech Stack tab active
- Categorized list of detected technologies
- Framework icons and descriptions
- Library versions where available

### 3. Enhanced Graph View with Module Cards

**Screenshot Location**: `docs/images/graph-view-modules.png`
**Description**: Interactive graph showing modules as styled rectangular cards with folder organization.

**What to show**:
- Module cards with different complexity colors (green, orange, red)
- Folder-based grouping of modules
- Connection lines between related modules
- Hover effects and styling details

### 4. Git Analytics - Author Statistics

**Screenshot Location**: `docs/images/git-author-stats.png`
**Description**: Git analytics dashboard showing comprehensive author contribution data.

**What to show**:
- Author contribution table with commits, lines added/removed
- Contribution percentage charts
- Timeline of author activity
- Module-wise contribution breakdown

### 5. Git Analytics - Commit Timeline

**Screenshot Location**: `docs/images/git-timeline.png`
**Description**: Visual timeline of commit activity over time.

**What to show**:
- Line chart showing commit activity over months
- Peak activity periods highlighted
- Multiple author contributions on the same timeline
- Interactive chart controls

### 6. Database Schema - Graph View

**Screenshot Location**: `docs/images/db-schema-graph.png`
**Description**: Database schema visualization with tables and relationships.

**What to show**:
- Table nodes with column information
- Foreign key relationships with directional arrows
- Primary key and constraint indicators
- Interactive hover details

### 7. Database Schema - Raw SQL View

**Screenshot Location**: `docs/images/db-raw-sql.png`
**Description**: Organized view of extracted SQL statements with syntax highlighting.

**What to show**:
- SQL statements categorized by type
- Syntax highlighting for better readability
- File references for each SQL statement
- Search and filter capabilities

### 8. JSON Utilities - Tree View

**Screenshot Location**: `docs/images/json-tree-view.png`
**Description**: Expandable JSON tree structure with search functionality.

**What to show**:
- Hierarchical JSON tree with expand/collapse controls
- Data type indicators for each value
- Search box with highlighting
- Path display for selected elements

## Detailed Usage Examples

### Example 1: Analyzing a Django Project

**Scenario**: You have a Django e-commerce project and want to understand its structure and complexity.

**Steps**:
1. Open your Django project in VS Code
2. Right-click on `models.py`
3. Select **DoraCodeBirdView** → **Full Code Analysis** → **Graph View**

**Expected Results**:
- Module cards showing Django apps (products, orders, users, etc.)
- Color-coded complexity (models might be green, views orange/red)
- Clear dependencies between apps
- Database schema analysis showing model relationships

**Sample Output**:
```
📊 Django E-commerce Analysis

Modules Detected:
├── 🟢 products/ (Low complexity)
│   ├── models.py (3 classes, complexity: 2.1)
│   ├── views.py (5 functions, complexity: 4.2)
│   └── admin.py (2 classes, complexity: 1.8)
├── 🟡 orders/ (Medium complexity)
│   ├── models.py (4 classes, complexity: 5.3)
│   ├── views.py (8 functions, complexity: 6.7)
│   └── serializers.py (3 classes, complexity: 3.9)
└── 🔴 analytics/ (High complexity)
    ├── reports.py (12 functions, complexity: 9.2)
    └── dashboard.py (6 classes, complexity: 8.5)

Database Schema:
├── Product (5 columns, 2 relationships)
├── Order (8 columns, 3 relationships)
├── OrderItem (4 columns, 2 relationships)
└── User (6 columns, 1 relationship)
```

### Example 2: Git Analytics for Team Management

**Scenario**: You're a team lead wanting to understand contribution patterns in your project.

**Steps**:
1. Open your team's Python project
2. Right-click on any Python file
3. Select **DoraCodeBirdView** → **Git Commits** → **Author Statistics**

**Expected Results**:
- Comprehensive author contribution data
- Module-wise contribution breakdown
- Timeline showing development patterns
- Identification of code ownership

**Sample Analysis**:
```
👥 Team Contribution Analysis (Last 6 Months)

Top Contributors:
1. Sarah Chen - 156 commits (35.2%)
   ├── Primary modules: authentication/, api/
   ├── Lines added: 18,432 | Lines removed: 4,221
   └── Most active: March 2024

2. Mike Rodriguez - 134 commits (30.3%)
   ├── Primary modules: frontend/, utils/
   ├── Lines added: 15,678 | Lines removed: 3,892
   └── Most active: February 2024

3. Lisa Park - 98 commits (22.1%)
   ├── Primary modules: database/, models/
   ├── Lines added: 12,334 | Lines removed: 2,567
   └── Most active: January 2024

Module Ownership:
├── authentication/ - Sarah Chen (78%), Mike Rodriguez (22%)
├── api/ - Sarah Chen (65%), Lisa Park (35%)
├── frontend/ - Mike Rodriguez (89%), Sarah Chen (11%)
├── database/ - Lisa Park (92%), Sarah Chen (8%)
└── utils/ - Mike Rodriguez (45%), Sarah Chen (35%), Lisa Park (20%)

Development Patterns:
├── Peak activity: February-March 2024
├── Average commits/week: 23
├── Most changed files: api/views.py, frontend/components.py
└── Hotspots: authentication/ (high change frequency)
```

### Example 3: Database Schema Analysis

**Scenario**: You're working on a Flask application with SQLAlchemy models and want to visualize your database structure.

**Steps**:
1. Open your Flask project with SQLAlchemy models
2. Right-click on `models.py`
3. Select **DoraCodeBirdView** → **DB Schema** → **Graph View**

**Expected Results**:
- Visual representation of your database tables
- Relationship lines showing foreign keys
- Detailed column information
- Raw SQL extraction from migrations

**Sample Schema Visualization**:
```
🗄️ Database Schema Analysis

Tables Detected: 8
Relationships: 12
Indexes: 15
Constraints: 23

Table Structure:
┌─────────────────┐    ┌─────────────────┐
│     users       │    │     posts       │
├─────────────────┤    ├─────────────────┤
│ 🔑 id (PK)      │◄───┤ 🔗 user_id (FK) │
│ 📧 email (UQ)   │    │ 📝 title        │
│ 👤 username     │    │ 📄 content      │
│ 🔒 password     │    │ 📅 created_at   │
│ 📅 created_at   │    │ 📅 updated_at   │
└─────────────────┘    └─────────────────┘
         │                       │
         │              ┌─────────────────┐
         │              │    comments     │
         │              ├─────────────────┤
         └──────────────┤ 🔗 user_id (FK) │
                        │ 🔗 post_id (FK) │
                        │ 📄 content      │
                        │ 📅 created_at   │
                        └─────────────────┘

Raw SQL Extracted:
├── CREATE TABLE statements: 8
├── ALTER TABLE statements: 12
├── CREATE INDEX statements: 15
└── Migration files analyzed: 23
```

### Example 4: JSON Utilities Workflow

**Scenario**: You're working with API responses and configuration files that contain complex JSON data.

**Steps**:
1. Open a file with messy JSON data
2. Right-click in the editor
3. Select **DoraCodeBirdView** → **JSON Utils** → **JSON Format**
4. Then select **JSON Tree View** to explore the structure

**Before Formatting**:
```json
{"api_config":{"endpoints":{"users":"/api/v1/users","posts":"/api/v1/posts"},"auth":{"type":"bearer","timeout":3600}},"database":{"host":"localhost","port":5432,"name":"myapp"}}
```

**After Formatting**:
```json
{
  "api_config": {
    "endpoints": {
      "users": "/api/v1/users",
      "posts": "/api/v1/posts"
    },
    "auth": {
      "type": "bearer",
      "timeout": 3600
    }
  },
  "database": {
    "host": "localhost",
    "port": 5432,
    "name": "myapp"
  }
}
```

**Tree View Exploration**:
```
🌳 JSON Tree Structure

🔽 root (object)
  ├── 🔽 api_config (object)
  │   ├── 🔽 endpoints (object)
  │   │   ├── 📝 users: "/api/v1/users"
  │   │   └── 📝 posts: "/api/v1/posts"
  │   └── 🔽 auth (object)
  │       ├── 📝 type: "bearer"
  │       └── 🔢 timeout: 3600
  └── 🔽 database (object)
      ├── 📝 host: "localhost"
      ├── 🔢 port: 5432
      └── 📝 name: "myapp"

🔍 Search Results for "api":
├── api_config (root level)
├── api_config.endpoints.users (contains "api")
└── api_config.endpoints.posts (contains "api")
```

### Example 5: Current File Analysis for Quick Insights

**Scenario**: You're reviewing a specific Python file and want quick complexity insights without analyzing the entire project.

**Steps**:
1. Open the Python file you want to analyze
2. Right-click in the editor
3. Select **DoraCodeBirdView** → **Current File Analysis** → **Graph View**

**Sample File**: `user_service.py`

**Analysis Results**:
```
📄 Current File Analysis: user_service.py

📊 File Metrics:
├── Total Lines: 245
├── Functions: 12
├── Classes: 2
├── Overall Complexity: 6.8 (Medium)
└── Maintainability Index: 72 (Good)

🔧 Function Analysis:
├── 🟢 get_user(user_id): Complexity 1.2 (Simple)
├── 🟢 create_user(data): Complexity 2.8 (Simple)
├── 🟡 update_user(user_id, data): Complexity 4.5 (Moderate)
├── 🟡 validate_user_data(data): Complexity 5.2 (Moderate)
├── 🔴 process_user_permissions(user, roles): Complexity 8.7 (Complex)
└── 🔴 generate_user_report(user_id, filters): Complexity 9.3 (Complex)

📦 Dependencies:
├── External: django.contrib.auth, requests, pandas
├── Internal: .models.User, .utils.validators
└── Framework: Django ORM patterns detected

🎯 Recommendations:
├── Consider refactoring: process_user_permissions() (high complexity)
├── Consider refactoring: generate_user_report() (high complexity)
└── Good practices: Most functions have low complexity ✅
```

## Integration Examples

### Example 6: Exporting for Team Reports

**Scenario**: You want to create a monthly development report for stakeholders.

**Steps**:
1. Run Full Code Analysis on your project
2. Run Git Analytics for the past month
3. Export results in HTML format
4. Share the comprehensive report

**Generated Report Structure**:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Monthly Development Report - MyProject</title>
</head>
<body>
    <h1>Project Health Dashboard</h1>
    
    <section id="overview">
        <h2>Project Overview</h2>
        <ul>
            <li>Total Modules: 23</li>
            <li>Average Complexity: 4.2 (Moderate)</li>
            <li>High Complexity Modules: 3</li>
            <li>Framework: Django 4.2</li>
        </ul>
    </section>
    
    <section id="git-analytics">
        <h2>Development Activity</h2>
        <ul>
            <li>Total Commits: 89</li>
            <li>Active Contributors: 4</li>
            <li>Lines Added: 12,456</li>
            <li>Most Active Module: api/</li>
        </ul>
    </section>
    
    <section id="recommendations">
        <h2>Recommendations</h2>
        <ul>
            <li>Refactor: analytics/reports.py (complexity: 9.2)</li>
            <li>Review: High activity in api/ module</li>
            <li>Consider: Adding tests to utils/ module</li>
        </ul>
    </section>
</body>
</html>
```

### Example 7: CI/CD Integration

**Scenario**: You want to integrate DoraCodeBirdView analysis into your continuous integration pipeline.

**JSON Export for Automation**:
```json
{
  "analysis_metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "2.0.0",
    "project_path": "/workspace/myproject",
    "analysis_duration_ms": 2340
  },
  "quality_metrics": {
    "average_complexity": 4.2,
    "high_complexity_modules": 3,
    "total_modules": 23,
    "maintainability_score": 78
  },
  "git_metrics": {
    "commits_last_week": 23,
    "active_contributors": 4,
    "hotspot_modules": ["api/", "analytics/"],
    "code_churn": 0.15
  },
  "recommendations": [
    {
      "type": "complexity",
      "severity": "high",
      "module": "analytics/reports.py",
      "message": "Consider refactoring - complexity score 9.2"
    }
  ]
}
```

## Best Practices from Examples

### 1. Regular Analysis Workflow
- Run Full Code Analysis weekly
- Use Current File Analysis during development
- Check Git Analytics monthly for team insights
- Export reports for stakeholder communication

### 2. Complexity Management
- Focus on red (high complexity) modules first
- Use module cards to identify architectural issues
- Track complexity trends over time
- Set complexity thresholds for your team

### 3. Team Collaboration
- Share Git analytics to understand contribution patterns
- Use database schema graphs for architecture discussions
- Export visualizations for documentation
- Identify code ownership and knowledge gaps

### 4. Development Efficiency
- Use JSON utilities for API development
- Leverage database schema analysis for data modeling
- Apply current file analysis for code reviews
- Integrate exports with project documentation

---

These examples demonstrate the full power of DoraCodeBirdView across different project types and use cases. Each feature is designed to provide actionable insights that improve code quality, team collaboration, and project understanding.