# DoraCodeBirdView Developer Documentation

This document provides detailed information about the DoraCodeBirdView extension architecture, development setup, and contribution guidelines.

## Architecture Overview

DoraCodeBirdView follows a hybrid architecture combining Python-based static analysis with TypeScript-based VS Code integration, enhanced with Git analytics, database schema analysis, and advanced visualization capabilities. The extension has been completely rebranded from DevCodeMonk to DoraCodeBirdView with significant architectural improvements and new features.

### High-Level Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   VS Code       │    │   Enhanced       │    │   Tabbed        │
│   Extension     │◄──►│   Python         │    │   Webview       │
│   (TypeScript)  │    │   Analyzer       │    │   System        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ • Extension API │    │ • AST Parsing    │    │ • Tech Stack    │
│ • Context Menu  │    │ • Complexity     │    │ • Graph View    │
│ • Sidebar       │    │ • Framework Det. │    │ • JSON View     │
│ • JSON Utils    │    │ • Call Graph     │    │ • Git Analytics │
│ • Current File  │    │ • Git Analytics  │    │ • DB Schema     │
└─────────────────┘    │ • DB Schema      │    └─────────────────┘
                       │ • Module Cards   │
                       └──────────────────┘
```

## Project Structure

```
doracodebird-extension/
├── src/                          # TypeScript source code
│   ├── extension.ts              # Main DoraCodeBirdExtension class
│   ├── analyzer-runner.ts        # Python analyzer execution with enhanced options
│   ├── sidebar-provider.ts       # Enhanced sidebar with DoraCodeBirdView branding
│   ├── webview-provider.ts       # Legacy graph visualization (maintained for compatibility)
│   ├── tabbed-webview-provider.ts # Advanced tabbed interface with sub-tabs
│   ├── json-utilities.ts         # Comprehensive JSON processing toolkit
│   ├── codelens-provider.ts      # Complexity annotations with enhanced styling
│   └── test/                     # Comprehensive TypeScript test suite
│       ├── suite/                # Test suites for all components
│       ├── run-comprehensive-tests.ts # Test runner
│       └── runTest.ts            # VS Code test integration
├── analyzer/                     # Enhanced Python analysis engine
│   ├── analyzer.py               # Main ProjectAnalyzer with DoraCodeBirdView features
│   ├── ast_parser.py             # Enhanced AST parsing with metadata extraction
│   ├── complexity_analyzer.py    # Advanced complexity calculation with color coding
│   ├── framework_detector.py     # Multi-framework pattern detection
│   ├── call_graph.py             # Enhanced call hierarchy analysis
│   ├── cache_manager.py          # Intelligent caching system
│   ├── git_analyzer.py           # Comprehensive Git repository analysis
│   ├── git_analytics_visualizer.py # Git visualization data generation
│   ├── module_commit_analyzer.py # Module-wise Git statistics
│   ├── database_schema_analyzer.py # Database schema analysis with SQL parsing
│   ├── module_card_generator.py  # Styled module card generation
│   ├── folder_structure_analyzer.py # Project structure analysis
│   ├── current_file_analyzer.py  # Optimized single file analysis
│   ├── performance_optimizer.py  # Performance enhancements and memory management
│   ├── dependency_parser.py      # Enhanced dependency analysis
│   ├── json_schema.py            # JSON schema definitions
│   ├── json_output_demo.py       # JSON output examples
│   ├── pyproject.toml            # Python project configuration
│   ├── poetry.lock               # Dependency lock file
│   └── test_*.py                 # Comprehensive Python test suite
├── resources/                    # Static resources and assets
│   ├── webview.css               # Enhanced webview styling with module cards
│   ├── database-schema-graph.js  # Cytoscape.js database schema visualization
│   ├── git-analytics-charts.js   # Chart.js Git analytics visualization
│   ├── dark/                     # Dark theme icons
│   │   └── graph.svg             # Dark theme graph icon
│   └── light/                    # Light theme icons
│       └── graph.svg             # Light theme graph icon
├── examples/                     # Sample projects for testing
│   ├── django-todo/              # Django example with models and migrations
│   │   ├── manage.py             # Django management script
│   │   ├── requirements.txt      # Python dependencies
│   │   ├── todo_project/         # Django project settings
│   │   └── todos/                # Django app with models
│   ├── flask-todo/               # Flask example with blueprints
│   │   ├── app.py                # Flask application
│   │   ├── blueprints/           # Flask blueprints
│   │   ├── models.py             # SQLAlchemy models
│   │   └── requirements.txt      # Python dependencies
│   └── fastapi-todo/             # FastAPI example with modern patterns
│       ├── main.py               # FastAPI application
│       ├── models.py             # Pydantic models
│       ├── database.py           # Database configuration
│       └── requirements.txt      # Python dependencies
├── docs/                         # Comprehensive documentation
│   ├── USER_GUIDE.md             # Complete user guide with all features
│   ├── DEVELOPER.md              # This comprehensive developer guide
│   ├── EXAMPLES.md               # Usage examples and tutorials
│   ├── TROUBLESHOOTING.md        # Troubleshooting guide
│   └── QUICK_REFERENCE.md        # Quick reference for all features
├── demo/                         # Demo files and examples
│   ├── context_menu_demo.py      # Context menu demonstration
│   └── json-utilities-demo.json  # JSON utilities example
├── .kiro/specs/                  # Feature specifications and planning
│   └── devcodemonk-extension/    # Extension specification
│       ├── requirements.md       # Feature requirements
│       ├── design.md             # Architecture design
│       └── tasks.md              # Implementation tasks
├── .vscode/                      # VS Code workspace configuration
├── .vscode-test/                 # VS Code test configuration
├── node_modules/                 # Node.js dependencies
├── out/                          # Compiled TypeScript output
├── package.json                  # Extension manifest with DoraCodeBirdView metadata
├── package-lock.json             # Node.js dependency lock file
├── tsconfig.json                 # TypeScript configuration
├── .eslintrc.json                # ESLint configuration
├── .gitignore                    # Git ignore rules
├── CHANGELOG.md                  # Version history and changes
└── README.md                     # Project overview and installation guide
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
git clone https://github.com/your-username/doracodebird-extension.git
cd doracodebird-extension
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
2. Install dependencies:
   ```bash
   npm install
   cd analyzer && pip install -r requirements.txt
   ```
3. Compile TypeScript: `npm run compile`
4. Press `F5` to launch the Extension Development Host
5. Open a Python project in the new VS Code window
6. Test DoraCodeBirdView functionality through context menu or command palette

#### Making Changes

**TypeScript Development**
1. Modify files in `src/` directory
2. Run `npm run compile` to compile TypeScript
3. Reload Extension Development Host (`Ctrl+R` or `Cmd+R`) to see changes
4. Use VS Code debugger to set breakpoints in TypeScript code

**Python Development**
1. Modify files in `analyzer/` directory
2. No compilation needed - changes are immediate
3. Test with `python analyzer.py /path/to/test/project`
4. Use Python debugger or print statements for debugging

**Webview Development**
1. Modify `resources/webview.css` for styling changes
2. Update HTML templates in `src/tabbed-webview-provider.ts`
3. Modify JavaScript in `resources/database-schema-graph.js` or `resources/git-analytics-charts.js`
4. Reload webview panel to see changes

**Documentation Updates**
1. Update relevant `.md` files in `docs/` directory
2. Ensure examples in `examples/` directory work with changes
3. Update `CHANGELOG.md` with new features or fixes

#### Comprehensive Testing

**TypeScript Tests**
```bash
# Run all TypeScript tests
npm test

# Run specific test suite
npm run test -- --grep "TabbedWebviewProvider"

# Run tests with coverage
npm run test:coverage
```

**Python Tests**
```bash
# Navigate to analyzer directory
cd analyzer

# Run all Python tests
python -m pytest

# Run specific test file
python -m pytest test_git_analyzer.py -v

# Run with coverage report
python -m pytest --cov=. --cov-report=html

# Run integration tests
python -m pytest test_*_integration.py

# Run performance tests
python -m pytest test_performance_optimizer.py
```

**End-to-End Testing**
```bash
# Run comprehensive test suite
npm run test:e2e

# Test with sample projects
cd examples/django-todo && python manage.py check
cd examples/flask-todo && python -c "import app"
cd examples/fastapi-todo && python -c "import main"
```

**Manual Testing Checklist**
- [ ] Context menu appears with DoraCodeBirdView submenu
- [ ] Full analysis generates tabbed interface
- [ ] Module cards display with proper styling and colors
- [ ] Git analytics show author contributions and timeline
- [ ] Database schema analysis works with Django/SQLAlchemy
- [ ] JSON utilities format and validate JSON correctly
- [ ] Current file analysis provides quick insights
- [ ] All tabs switch properly without errors
- [ ] Export functionality works for all data types

## Core Components

### 1. Enhanced Python Analyzer (`analyzer/`)

The Python analyzer is the core engine that performs static analysis of Python projects with significant enhancements for DoraCodeBirdView.

#### Key Classes

**ProjectAnalyzer** (`analyzer.py`)
- Main orchestrator class that coordinates all analysis components
- Integrates with new Git analytics and database schema analysis
- Generates comprehensive JSON output with enhanced data structures

```python
class ProjectAnalyzer:
    def analyze_project(self, project_path: str) -> EnhancedAnalysisResult:
        """Enhanced analysis entry point with DoraCodeBirdView features."""
        # 1. Discover Python files and project structure
        # 2. Parse AST for each file with enhanced metadata
        # 3. Build dependency graph with module cards
        # 4. Analyze complexity with color-coded styling
        # 5. Detect framework patterns (Django, Flask, FastAPI)
        # 6. Generate call graph with enhanced visualization
        # 7. Analyze folder structure for module grouping
        # 8. Generate styled module cards with positioning
        # 9. Integrate Git analytics if repository detected
        # 10. Analyze database schema if models found
        # 11. Return comprehensive structured results
```

**GitAnalyzer** (`git_analyzer.py`)
- Comprehensive Git repository analysis engine
- Extracts author contributions with detailed statistics
- Generates commit timeline and module-wise analytics
- Provides data for interactive Git analytics visualizations

```python
class GitAnalyzer:
    def __init__(self, repo_path: Path):
        """Initialize Git analyzer with repository validation."""
        
    def analyze_repository(self, date_range: Optional[DateRange] = None) -> GitAnalysisResult:
        """Analyze Git repository for comprehensive statistics."""
        # 1. Validate Git repository and get basic info
        # 2. Parse Git log with numstat for detailed commit data
        # 3. Extract author contributions with lines added/removed
        # 4. Analyze module-wise commit patterns
        # 5. Generate commit timeline for visualization
        # 6. Calculate contribution percentages
        # 7. Create structured data for charts and graphs
        
    def get_author_contributions(self, module_path: Optional[str] = None) -> List[AuthorContribution]:
        """Get author contributions, optionally filtered by module."""
        
    def get_commit_statistics(self, date_range: Optional[DateRange] = None) -> Dict[str, Any]:
        """Get comprehensive commit statistics for the repository."""
```

**DatabaseSchemaAnalyzer** (`database_schema_analyzer.py`)
- Analyzes database schemas from Django and SQLAlchemy models
- Extracts table relationships, constraints, and indexes
- Parses raw SQL files and migration scripts
- Generates interactive schema graph data

```python
class DatabaseSchemaAnalyzer:
    def analyze_database_schema(self, project_path: str) -> SchemaAnalysisResult:
        """Comprehensive database schema analysis."""
        # 1. Detect Django models and SQLAlchemy models
        # 2. Extract table definitions with column details
        # 3. Map foreign key relationships and constraints
        # 4. Parse SQL files for raw statements
        # 5. Organize SQL by type (DDL, DML, DQL, etc.)
        # 6. Generate graph data for schema visualization
        # 7. Create syntax highlighting data for SQL display
        # 8. Return structured schema documentation
        
    def extract_model_relationships(self, models_path: str) -> List[ModelRelationship]:
        """Extract relationships from Django/SQLAlchemy models."""
        
    def parse_sql_files(self, project_path: str) -> Tuple[List[SQLTable], List[SQLStatement]]:
        """Parse all SQL files in the project."""
        
    def generate_schema_graph_data(self, tables: List[SQLTable]) -> SchemaGraphData:
        """Generate data for interactive schema graph visualization."""
```

**ModuleCardGenerator** (`module_card_generator.py`)
- Creates styled module representations for enhanced visualization
- Applies complexity-based color coding (green/orange/red)
- Groups modules by folder structure for better organization
- Generates positioning data for graph layout

```python
class ModuleCardGenerator:
    def __init__(self, project_path: Path):
        """Initialize with project path for folder analysis."""
        
    def generate_module_cards(self, modules: List[ModuleInfo], 
                            dependencies: Dict[str, List[str]]) -> List[ModuleCard]:
        """Generate styled module cards with positioning."""
        # 1. Group modules by folder structure
        # 2. Create cards with complexity-based styling
        # 3. Apply grid-based positioning within folder groups
        # 4. Generate metadata for each module
        # 5. Create dependency relationships
        
    def _apply_positioning(self, cards: List[ModuleCard]) -> List[ModuleCard]:
        """Apply intelligent positioning based on folder grouping."""
```

**FolderStructureAnalyzer** (`folder_structure_analyzer.py`)
- Analyzes project folder organization and structure
- Identifies app/module/package folder types
- Creates hierarchical folder representations
- Supports module grouping for enhanced visualization

**CurrentFileAnalyzer** (`current_file_analyzer.py`)
- Provides single-file analysis capabilities for quick insights
- Extracts file-specific complexity metrics and dependencies
- Optimized for fast analysis without full project processing
- Integrates with context menu for current file analysis

**ModuleCommitAnalyzer** (`module_commit_analyzer.py`)
- Analyzes Git commits on a per-module basis
- Tracks author contributions within specific modules
- Generates module-wise commit statistics and trends
- Supports filtering by date range and author

**GitAnalyticsVisualizer** (`git_analytics_visualizer.py`)
- Creates visualization data for Git analytics charts
- Generates Chart.js compatible data structures
- Supports multiple chart types (commits, lines added/removed, timeline)
- Provides data for interactive Git analytics dashboard

**PerformanceOptimizer** (`performance_optimizer.py`)
- Optimizes analysis performance for large repositories
- Implements caching strategies for incremental analysis
- Manages memory usage during analysis
- Provides progress tracking and cancellation support

#### Python Data Models

**Git Analytics Models** (`git_analyzer.py`)
```python
@dataclass
class AuthorContribution:
    author_name: str
    author_email: str
    total_commits: int
    lines_added: int
    lines_removed: int
    modules_touched: List[str]
    first_commit: datetime
    last_commit: datetime
    contribution_percentage: float = 0.0

@dataclass
class CommitInfo:
    hash: str
    author_name: str
    author_email: str
    date: datetime
    message: str
    files_changed: List[str]
    lines_added: int
    lines_removed: int

@dataclass
class GitAnalysisResult:
    repository_info: RepositoryInfo
    author_contributions: List[AuthorContribution]
    commit_timeline: List[CommitTimelineEntry]
    commits: List[CommitInfo]
    success: bool = True
    errors: List[str] = None
```

**Database Schema Models** (`database_schema_analyzer.py`)
```python
@dataclass
class SQLTable:
    name: str
    schema: str = "public"
    columns: List[TableColumn] = field(default_factory=list)
    primary_keys: List[str] = field(default_factory=list)
    foreign_keys: List[ForeignKey] = field(default_factory=list)
    indexes: List[str] = field(default_factory=list)
    constraints: List[str] = field(default_factory=list)
    estimated_rows: Optional[int] = None
    model_file: Optional[str] = None
    model_class: Optional[str] = None

@dataclass
class TableColumn:
    name: str
    data_type: str
    nullable: bool = True
    default_value: Optional[str] = None
    max_length: Optional[int] = None
    is_primary_key: bool = False
    is_foreign_key: bool = False
    foreign_key_table: Optional[str] = None
    foreign_key_column: Optional[str] = None

@dataclass
class SchemaAnalysisResult:
    tables: List[SQLTable] = field(default_factory=list)
    relationships: List[TableRelationship] = field(default_factory=list)
    indexes: List[DatabaseIndex] = field(default_factory=list)
    constraints: List[DatabaseConstraint] = field(default_factory=list)
    raw_sql: List[SQLStatement] = field(default_factory=list)
    graph_data: SchemaGraphData = field(default_factory=SchemaGraphData)
    metadata: SchemaMetadata = field(default_factory=lambda: SchemaMetadata(...))
```

**Module Card Models** (`module_card_generator.py`)
```python
@dataclass
class ModuleCard:
    id: str
    name: str
    display_name: str
    folder_path: str
    complexity: Dict[str, Any]
    dependencies: List[ModuleDependency]
    styling: CardStyling
    position: Optional[Position]
    metadata: ModuleMetadata

@dataclass
class CardStyling:
    background_color: str
    border_color: str
    border_width: int
    border_radius: int
    shadow_style: str
    text_color: str
    font_size: str
    padding: str
    min_width: int
    min_height: int
    
    @classmethod
    def from_complexity(cls, complexity_level: ComplexityLevel) -> 'CardStyling':
        """Create styling based on complexity level with color coding."""
```

**ModuleCardGenerator** (`module_card_generator.py`)
- Creates styled module representations for enhanced visualization
- Applies complexity-based color coding
- Generates positioning and styling data

**FolderStructureAnalyzer** (`folder_structure_analyzer.py`)
- Analyzes project folder organization
- Identifies app/module/package structures
- Groups modules by folder hierarchy

**CurrentFileAnalyzer** (`current_file_analyzer.py`)
- Provides single-file analysis capabilities
- Extracts file-specific complexity and dependencies
- Optimized for quick analysis of individual files

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

### 2. Enhanced VS Code Extension (`src/`)

The TypeScript extension provides comprehensive VS Code integration with DoraCodeBirdView branding and advanced features.

#### Key Classes

**DoraCodeBirdExtension** (`extension.ts`)
- Main extension class managing the complete lifecycle
- Coordinates all extension components with DoraCodeBirdView branding
- Handles context menu structure and command registration
- Manages analysis workflows and error handling

```typescript
export class DoraCodeBirdExtension {
    constructor(context: vscode.ExtensionContext)
    initialize(): void  // Register all commands and providers
    analyzeProject(): Promise<void>  // Main analysis workflow
    showModuleGraph(): Promise<void>  // Enhanced module visualization
    showCurrentFileAnalysis(): Promise<void>  // Single file analysis
    showGitAnalytics(): Promise<void>  // Git analytics dashboard
    formatJsonInEditor(): Promise<void>  // JSON utilities integration
}
```

**TabbedWebviewProvider** (`tabbed-webview-provider.ts`)
- Manages sophisticated multi-tab analysis interface
- Handles Tech Stack, Graph View, JSON View, Git Analytics, and DB Schema tabs
- Provides seamless tab switching with state management
- Supports sub-tabs for complex features like DB Schema

```typescript
export class TabbedWebviewProvider {
    constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel)
    
    showFullAnalysis(analysisData: TabbedAnalysisData): void
    showTab(tabId: string, analysisData?: TabbedAnalysisData): void
    switchToTab(tabId: string, subTabId?: string): void
    updateTabContent(tabId: string, content: any): void
    updateAnalysisData(analysisData: TabbedAnalysisData | null): void
    
    // Private methods for webview management
    private createOrShowWebview(): void
    private updateWebviewContent(): void
    private getWebviewHtml(): string
    private handleWebviewMessage(message: TabbedWebviewMessage): void
}
```

**JsonUtilities** (`json-utilities.ts`)
- Comprehensive JSON processing and visualization toolkit
- Integrates with VS Code editor for seamless JSON operations
- Provides advanced validation, formatting, and tree view capabilities

```typescript
export class JsonUtilities {
    constructor(outputChannel: vscode.OutputChannel)
    
    // Main public API
    formatJsonInEditor(): Promise<void>
    showJsonTreeView(): Promise<void>
    validateJsonInEditor(): Promise<void>
    exportJsonAnalysis(analysisData: any): Promise<void>
}

export class JsonFormatter {
    formatJson(content: string, options?: Partial<JsonFormattingOptions>): Promise<string>
    validateJson(content: string): JsonValidationResult
    getFormattingStats(originalContent: string, formattedContent: string): FormattingStats
}

export class JsonTreeViewProvider {
    generateTreeView(jsonObject: any, rootLabel?: string): TreeViewData
    searchTreeView(treeData: TreeViewData, searchTerm: string): TreeNode[]
    toggleNodeExpansion(treeData: TreeViewData, nodeId: string): TreeViewData
    exportTreeView(treeData: TreeViewData, format: 'json' | 'csv' | 'txt'): string
}
```

#### Enhanced Command Registration

The extension registers comprehensive commands for all DoraCodeBirdView features:

```typescript
// Main analysis commands
'doracodebird.analyzeProject'                    // Full project analysis
'doracodebird.currentFileAnalysis'               // Single file analysis
'doracodebird.showModuleGraph'                   // Enhanced module visualization
'doracodebird.showCallHierarchy'                 // Call hierarchy analysis

// Full Analysis submenu commands
'doracodebird.fullAnalysisTechStack'             // Tech stack view
'doracodebird.fullAnalysisGraphView'             // Enhanced graph view
'doracodebird.fullAnalysisJsonView'              // JSON data view

// Git Analytics submenu commands
'doracodebird.gitAuthorStatistics'               // Author contribution stats
'doracodebird.gitModuleContributions'            // Module-wise Git analytics
'doracodebird.gitCommitTimeline'                 // Commit timeline visualization

// Database Schema commands
'doracodebird.dbSchemaGraphView'                 // Interactive schema graph
'doracodebird.dbSchemaRawSQL'                    // Raw SQL statements view

// JSON Utilities commands
'doracodebird.jsonFormat'                        // JSON formatting in editor
'doracodebird.jsonTreeView'                      // JSON tree visualization

// Utility commands
'doracodebird.refreshSidebar'                    // Refresh sidebar data
'doracodebird.clearCache'                        // Clear analysis cache
'doracodebird.cancelAnalysis'                    // Cancel running analysis
'doracodebird.validateConfiguration'             // Validate extension settings
```

#### Context Menu Structure

The enhanced context menu provides organized access to all features:

```
Right-click on Python file:
├── DoraCodeBirdView ►
│   ├── Full Code Analysis ►
│   │   ├── Tech Stack
│   │   ├── Graph View
│   │   └── JSON View
│   ├── Current File Analysis
│   ├── Call Hierarchy
│   ├── Git Commits ►
│   │   ├── Author Statistics
│   │   ├── Module Contributions
│   │   └── Commit Timeline
│   ├── DB Schema ►
│   │   ├── Graph View
│   │   └── Raw SQL
│   └── JSON Utils ►
│       ├── JSON Format
│       └── JSON Tree View
```
```

**AnalyzerRunner** (`analyzer-runner.ts`)
- Executes enhanced Python analyzer as subprocess
- Handles Git analytics and database schema analysis
- Manages analysis progress and cancellation for new features

**SidebarProvider** (`sidebar-provider.ts`)
- Implements VS Code TreeDataProvider with DoraCodeBirdView branding
- Displays enhanced project structure in sidebar
- Handles user interactions and navigation to new features

**WebviewProvider** (`webview-provider.ts`)
- Legacy graph visualization webview (maintained for compatibility)
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

### 3. Enhanced Tabbed Webview System

The webview system provides comprehensive analysis visualization through multiple specialized tabs.

#### Technologies Used
- **Cytoscape.js**: Enhanced graph visualization with module cards
- **Chart.js**: Git analytics charts and timeline visualization
- **D3.js**: Database schema graph rendering
- **HTML5 Canvas**: High-performance rendering
- **CSS Grid/Flexbox**: Responsive tabbed interface layout
- **TypeScript**: Type-safe interaction logic

#### Tab Types
1. **Tech Stack Tab**: Displays detected libraries, frameworks, and dependencies
2. **Graph View Tab**: Shows enhanced module cards with styling and folder organization
3. **JSON View Tab**: Formatted analysis data with syntax highlighting
4. **Git Analytics Tab**: Author statistics, commit timelines, and contribution charts
5. **DB Schema Tab**: Database schema visualization with sub-tabs:
   - Graph View: Interactive table relationship diagrams
   - Raw SQL: Extracted SQL statements with syntax highlighting

#### Enhanced Interaction Features
- **Tabbed Navigation**: Seamless switching between analysis views
- **Module Cards**: Styled rectangular cards with complexity color-coding
- **Interactive Charts**: Git analytics with filtering and drill-down capabilities
- **Database Schema**: Interactive table relationships with hover details
- **Export Capabilities**: Export visualizations and data in multiple formats
- **Search and Filtering**: Advanced search across all analysis data
- **Responsive Design**: Adapts to different panel sizes and VS Code themes

## Data Models

### Enhanced Analysis Result Structure
```typescript
interface TabbedAnalysisData {
    techStack?: TechStackData;
    modules?: ModuleGraphData;
    functions?: CallGraphData;
    gitAnalytics?: GitAnalyticsData;
    dbSchema?: DatabaseSchemaData;
    currentFile?: CurrentFileData;
    exportMetadata?: ExportMetadata;
}
```

### Module Cards (Enhanced Visualization)
```typescript
interface ModuleCardNode {
    id: string;
    name: string;
    displayName: string;
    path: string;
    folderPath: string;
    complexity: ComplexityMetrics;
    fileCount: number;
    dependencies: string[];
    styling: CardStyling;
    position?: Position;
    metadata: ModuleMetadata;
}

interface ComplexityMetrics {
    overall: number;
    cyclomatic: number;
    maintainability: number;
    colorCode: 'green' | 'orange' | 'red';
    trend?: 'improving' | 'stable' | 'degrading';
}

interface CardStyling {
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    borderRadius: number;
    shadowStyle: string;
    textColor: string;
    fontSize: string;
    padding: string;
    minWidth: number;
    minHeight: number;
}

interface FolderStructure {
    rootPath: string;
    folders: FolderNode[];
    moduleGroupings: ModuleGrouping[];
}
```

### Git Analytics Data Models
```typescript
interface GitAnalyticsData {
    repositoryInfo: RepositoryInfo;
    authorContributions: AuthorContribution[];
    moduleStatistics: ModuleGitStats[];
    commitTimeline: CommitTimelineEntry[];
    contributionGraphs: ContributionGraphData[];
}

interface AuthorContribution {
    authorName: string;
    authorEmail: string;
    totalCommits: number;
    linesAdded: number;
    linesRemoved: number;
    modulesTouched: string[];
    firstCommit: string;
    lastCommit: string;
    contributionPercentage: number;
}

interface ModuleGitStats {
    modulePath: string;
    totalCommits: number;
    uniqueAuthors: number;
    linesAdded: number;
    linesRemoved: number;
    authorBreakdown: AuthorContribution[];
    commitFrequency: { [month: string]: number };
}

interface ContributionGraphData {
    type: 'commits' | 'lines_added' | 'lines_removed';
    data: {
        labels: string[];
        datasets: {
            label: string;
            data: number[];
            backgroundColor: string;
            borderColor: string;
        }[];
    };
}
```

### Database Schema Data Models
```typescript
interface DatabaseSchemaData {
    tables: SQLTable[];
    relationships: TableRelationship[];
    indexes: DatabaseIndex[];
    constraints: DatabaseConstraint[];
    rawSQL: SQLStatement[];
    graphData: SchemaGraphData;
    metadata: SchemaMetadata;
}

interface SQLTable {
    name: string;
    schema: string;
    columns: TableColumn[];
    primaryKeys: string[];
    foreignKeys: ForeignKey[];
    indexes: string[];
    constraints: string[];
    estimatedRows?: number;
}

interface TableColumn {
    name: string;
    dataType: string;
    nullable: boolean;
    defaultValue?: string;
    maxLength?: number;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
}

interface TableRelationship {
    fromTable: string;
    toTable: string;
    relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-many';
    foreignKeyColumn: string;
    referencedColumn: string;
}

interface SQLStatement {
    statementType: string;
    content: string;
    filePath: string;
    lineNumber: number;
    tableReferences: string[];
}
```

### JSON Utilities Data Models
```typescript
interface JsonValidationResult {
    isValid: boolean;
    errors: JsonError[];
    formattedContent?: string;
    warnings?: JsonWarning[];
}

interface JsonError {
    message: string;
    line?: number;
    column?: number;
    type: 'syntax' | 'structure' | 'validation';
    severity: 'error' | 'warning';
    suggestion?: string;
}

interface TreeViewData {
    nodes: TreeNode[];
    expandedPaths: string[];
    searchableContent: string;
    metadata: TreeMetadata;
}

interface TreeNode {
    id: string;
    label: string;
    value: any;
    type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
    path: string;
    children?: TreeNode[];
    isExpanded: boolean;
    depth: number;
    parentId?: string;
    hasChildren: boolean;
    icon?: string;
    tooltip?: string;
}

interface JsonFormattingOptions {
    indent: number | string;
    sortKeys: boolean;
    removeComments: boolean;
    removeTrailingCommas: boolean;
    insertFinalNewline: boolean;
    maxLineLength?: number;
    preserveArrayFormatting?: boolean;
}
```

### Legacy Data Models (Maintained for Compatibility)
```typescript
interface ModuleGraph {
    nodes: ModuleNode[];
    edges: ModuleEdge[];
}

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

## DoraCodeBirdView Feature Enhancements

### Comprehensive Git Analytics Engine
- **Repository Analysis**: Deep Git log parsing with commit statistics and author tracking
- **Author Contributions**: Detailed per-author statistics including lines added/removed, modules touched, and contribution percentages
- **Module-wise Statistics**: Git activity breakdown by project modules and folders
- **Timeline Visualization**: Interactive commit timeline with Chart.js integration
- **Contribution Graphs**: Visual representation of team contributions with filtering capabilities
- **Date Range Filtering**: Analyze contributions within specific time periods
- **Offline Support**: Graceful handling of repositories without Git history

### Advanced Database Schema Analysis
- **Multi-Framework Support**: Automatic detection of Django and SQLAlchemy models
- **Schema Visualization**: Interactive Cytoscape.js graphs showing table relationships
- **Raw SQL Extraction**: Comprehensive parsing and categorization of SQL statements (DDL, DML, DQL, DCL, TCL)
- **Migration Analysis**: Analysis of database migration files and schema changes
- **Constraint Mapping**: Foreign key, primary key, and constraint relationship tracking
- **Syntax Highlighting**: SQL syntax highlighting with keyword, data type, and function recognition
- **Schema Export**: Export schema documentation in multiple formats

### Enhanced Module Visualization with Cards
- **Module Cards**: Styled rectangular cards with CSS gradients and shadows replacing simple nodes
- **Folder Organization**: Intelligent grouping of modules by project folder structure
- **Complexity Color Coding**: Green/orange/red visual indicators based on cyclomatic complexity
- **Interactive Styling**: Hover effects, smooth transitions, and responsive design
- **Grid-based Positioning**: Automatic layout with folder-based grouping
- **Metadata Display**: File count, line count, function/class counts for each module
- **Dependency Visualization**: Clear connection lines between related modules

### Comprehensive JSON Utilities Integration
- **Advanced JSON Formatting**: In-editor beautification with configurable options (indentation, key sorting, comment removal)
- **Interactive Tree View**: Expandable/collapsible JSON tree structure with search capabilities
- **Comprehensive Validation**: Detailed error reporting with line/column information and suggestions
- **Search Functionality**: Find specific keys, values, or paths within JSON data
- **Export Capabilities**: Export JSON tree view in multiple formats (JSON, CSV, TXT)
- **Performance Optimization**: Efficient handling of large JSON files with virtual scrolling

### Current File Analysis
- **Single File Focus**: Lightning-fast analysis of just the current file without full project processing
- **File-specific Metrics**: Complexity analysis, dependency tracking, and framework pattern detection
- **Function-level Analysis**: Individual function complexity scores and metadata
- **Import Analysis**: Detailed import statement parsing and dependency mapping
- **Class Analysis**: Class-level complexity and method analysis
- **Performance Optimized**: Sub-second analysis for immediate feedback

### Enhanced Context Menu Structure
- **Organized Submenus**: Clean hierarchical menu structure with DoraCodeBirdView branding
- **Full Code Analysis**: Tech Stack, Graph View, and JSON View options
- **Current File Analysis**: Quick single-file analysis options
- **Git Analytics**: Author Statistics, Module Contributions, and Commit Timeline
- **Database Schema**: Graph View and Raw SQL visualization
- **JSON Utilities**: JSON formatting and tree view tools
- **No Clutter**: Removed "No analysis data available" messages in favor of direct action options

## Future Enhancements

### Planned Features
- **Multi-language Support**: Extend beyond Python to JavaScript, TypeScript, Java
- **Real-time Analysis**: File watcher integration for live updates
- **Team Analytics**: Enhanced collaboration insights and code review metrics
- **Performance Profiling**: Integration with Python profiling tools
- **Custom Analyzers**: Plugin system for domain-specific analysis

### Architecture Improvements
- **Microservice Architecture**: Separate analysis engines for different languages
- **WebAssembly Integration**: Performance-critical components in WASM
- **Cloud Analytics**: Optional cloud-based analysis for large repositories
- **Machine Learning**: AI-powered code quality and maintainability predictions

## Resources

### Documentation
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Cytoscape.js Documentation](https://cytoscape.org/)
- [Python AST Module](https://docs.python.org/3/library/ast.html)

### Tools
- [VS Code Extension Generator](https://github.com/Microsoft/vscode-generator-code)
- [Extension Test Runner](https://github.com/microsoft/vscode-test)
- [VSCE Publishing Tool](https://github.com/microsoft/vscode-vsce)