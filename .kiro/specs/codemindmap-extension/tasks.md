# Implementation Plan

- [x] 1. Set up VS Code extension project structure

  - Create package.json with extension configuration, commands, and activation events
  - Set up TypeScript configuration and build system
  - Create basic directory structure (src/, out/, resources/)
  - Configure VS Code extension development environment
  - _Requirements: 5.1, 5.5_

- [x] 2. Create Python analyzer foundation

  - [x] 2.1 Implement core analyzer classes and interfaces

    - Create ProjectAnalyzer main class with analyze_project method
    - Implement AnalysisResult, TechStack, and core data model classes
    - Set up proper error handling and logging infrastructure
    - _Requirements: 1.1, 7.1_

  - [x] 2.2 Implement AST parsing and module discovery

    - Create ASTParser class to traverse Python files and extract functions/classes
    - Implement module discovery logic to find all Python files in project
    - Build module dependency resolution using import statements
    - Write unit tests for AST parsing functionality
    - _Requirements: 1.1, 2.1_

  - [x] 2.3 Implement complexity analysis integration
    - Integrate radon library for cyclomatic complexity calculation
    - Create ComplexityAnalyzer class to score modules and functions
    - Implement complexity color-coding logic (green/orange/red thresholds)
    - Write unit tests for complexity analysis
    - _Requirements: 2.2, 5.3_

- [x] 3. Implement tech stack and framework detection

  - [x] 3.1 Create dependency file parsers

    - Implement parsers for requirements.txt, pyproject.toml, and Pipfile
    - Extract library names and versions from dependency files
    - Create TechStack data structure with detected libraries
    - Write unit tests for dependency parsing
    - _Requirements: 1.1, 1.2_

  - [x] 3.2 Implement framework-specific pattern detection
    - Create FrameworkDetector class with Django, Flask, and FastAPI detection
    - Implement Django URL pattern extraction from urls.py files
    - Implement Flask route detection via @app.route and Blueprint decorators
    - Implement FastAPI route detection via @app.get/post decorators
    - Write unit tests for each framework detection method
    - _Requirements: 1.3, 1.4, 1.5, 4.1, 4.2, 4.3_

- [x] 4. Build call graph analysis

  - [x] 4.1 Implement function call extraction

    - Create call graph builder that analyzes function calls within AST
    - Track caller-callee relationships across modules
    - Handle method calls, function calls, and imported function calls
    - Create CallGraph and FunctionNode data structures
    - _Requirements: 3.2, 3.3_

  - [x] 4.2 Implement call hierarchy data structure
    - Build bidirectional call graph with caller and callee information
    - Implement graph traversal methods for hierarchy exploration
    - Add support for filtering and searching within call graphs
    - Write unit tests for call graph construction
    - _Requirements: 3.2, 3.4, 3.5_

- [x] 5. Create JSON output system

  - Implement JSON serialization for all analysis data structures
  - Create structured output format matching design specifications
  - Add error and warning information to JSON output
  - Implement data validation and schema verification
  - Write integration tests with sample Python projects
  - _Requirements: 7.1, 7.2, 7.4_

- [x] 6. Implement VS Code extension core

  - [x] 6.1 Create extension activation and command registration

    - Implement extension.ts with activate() function
    - Register all extension commands and context menu items
    - Set up proper extension lifecycle management
    - Configure extension activation events for Python projects
    - _Requirements: 5.1, 5.4_

  - [x] 6.2 Implement Python analyzer execution
    - Create AnalyzerRunner class to execute Python script from extension
    - Handle Python process spawning and communication
    - Implement progress reporting and cancellation support
    - Add error handling for Python execution failures
    - _Requirements: 5.4, 5.5, 6.6_

- [x] 7. Create sidebar panel integration

  - [x] 7.1 Implement TreeDataProvider for sidebar

    - Create SidebarProvider class implementing VS Code TreeDataProvider
    - Display project modules, dependencies, and framework information
    - Implement tree item click handlers for navigation
    - Add refresh and filter capabilities to sidebar
    - _Requirements: 5.1, 5.2_

  - [x] 7.2 Add sidebar interaction features
    - Implement module selection and highlighting in editor
    - Add context menu actions for sidebar items
    - Create dependency navigation between modules
    - Write integration tests for sidebar functionality
    - _Requirements: 5.1, 2.5_

- [x] 8. Implement CodeLens provider

  - Create CodeLensProvider class for complexity annotations
  - Display complexity scores above function definitions
  - Implement click handlers for CodeLens items to show details
  - Add configuration options for CodeLens display preferences
  - Write unit tests for CodeLens functionality
  - _Requirements: 5.3_

- [x] 9. Create webview visualization system

  - [x] 9.1 Implement WebviewProvider foundation

    - Create WebviewProvider class to manage graph visualization webview
    - Set up HTML template with Cytoscape.js integration
    - Implement communication between extension and webview
    - Add webview lifecycle management and error handling
    - Create webview-provider.ts file with WebviewProvider class
    - Integrate webview provider with main extension
    - _Requirements: 5.2, 2.1_

  - [x] 9.2 Implement module graph visualization

    - Create Cytoscape.js configuration for module graph display
    - Implement node styling based on complexity scores (color coding)
    - Add edge rendering for module dependencies
    - Implement zoom, pan, and selection interactions
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 9.3 Implement call hierarchy visualization
    - Create call graph rendering using Cytoscape.js tree layout
    - Implement expandable/collapsible call hierarchy tree
    - Add function navigation on node click
    - Implement search and filtering within call hierarchy
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [x] 10. Implement context menu integration

  - Create context menu provider for "Show Call Hierarchy" option
  - Implement function detection at cursor position
  - Trigger call hierarchy webview with selected function
  - Add error handling for invalid function selections
  - Write integration tests for context menu functionality
  - _Requirements: 3.1, 3.2_

- [x] 11. Add caching and performance optimization

  - [x] 11.1 Implement analysis result caching

    - Create file-based caching system for analysis results
    - Implement cache invalidation based on file modification times
    - Add incremental analysis for changed files only
    - Write unit tests for caching functionality
    - _Requirements: 6.1, 6.3_

  - [x] 11.2 Optimize large project handling
    - Implement parallel processing for module analysis
    - Add memory management and cleanup for large datasets
    - Create progress reporting for long-running analysis
    - Add project size limits and user warnings
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [x] 12. Create comprehensive test suite

  - [x] 12.1 Write Python analyzer unit tests

    - Create test cases for all analyzer components
    - Add tests with sample Django, Flask, and FastAPI projects
    - Implement mock file system for isolated testing
    - Add performance benchmarking tests
    - _Requirements: All requirements validation_

  - [x] 12.2 Write VS Code extension tests
    - Create unit tests for all extension components
    - Implement integration tests with VS Code Extension Test Runner
    - Add end-to-end tests for complete user workflows
    - Create automated testing pipeline
    - _Requirements: All requirements validation_

- [x] 13. Fix implementation issues and improve integration

  - [x] 13.1 Fix Python analyzer integration issues
    - Fix module path resolution in extension to match analyzer output
    - Ensure proper error handling when Python analyzer fails
    - Fix data structure mapping between analyzer and extension
    - Add proper validation of analyzer JSON output
    - _Requirements: 5.4, 5.5, 7.1_

  - [x] 13.2 Improve VS Code extension robustness
    - Add better error messages for common failure scenarios
    - Implement proper cleanup when analysis is cancelled
    - Fix CodeLens provider function matching logic
    - Add configuration validation and user guidance
    - _Requirements: 5.1, 5.4, 6.6_

- [x] 14. Create example projects and documentation
  - Use Sqlite db
  - Create sample Django todo project with an option to add user and tasks for testing and demonstration
  - Create sample Flask todo project with an option to add user and tasks with Blueprint patterns
  - Create sample FastAPI todo  project with an option to add user and tasks with dependency injection
  - Write README with installation and usage instructions
  - Create developer documentation for extension architecture
  - _Requirements: 7.6_

- [x] 15. Implement dedicated sidebar icon and view container
  - [x] 15.1 Create dedicated view container for CodeMindMap
    - Add viewsContainers configuration to package.json with activitybar entry
    - Create custom CodeMindMap view container with distinctive icon
    - Configure view container to show only when Python projects are detected
    - Update views configuration to use the new container instead of explorer
    - _Requirements: 8.1, 8.2_
  
  - [x] 15.2 Update sidebar integration for new view container
    - Modify SidebarProvider to work with the new view container
    - Ensure proper tree view registration and lifecycle management
    - Update sidebar panel content and navigation features
    - Test sidebar functionality with the new dedicated icon
    - _Requirements: 8.3, 8.4, 8.5_

- [x] 16. Organize context menu under CodeMindMap submenu
  - [x] 16.1 Create CodeMindMap submenu structure
    - Add submenu contribution to package.json for CodeMindMap options
    - Move existing "Show Call Hierarchy" command under the submenu
    - Add new "Graph View" and "JSON View" commands to the submenu
    - Update menu group organization and command visibility
    - _Requirements: 3.1, 3.2, 3.7, 3.8_
  
  - [x] 16.2 Implement new context menu commands
    - Create "Graph View" command that opens module graph visualization
    - Create "JSON View" command that displays raw analysis data
    - Update command handlers to work from context menu triggers
    - Add proper error handling and user feedback for menu actions
    - _Requirements: 3.7, 3.8_

- [x] 17. Fix Cytoscape.js loading and webview issues
  - [x] 17.1 Fix Cytoscape.js library loading in webview
    - Update webview HTML template to ensure proper script loading order
    - Add error handling for Cytoscape.js loading failures
    - Implement proper Content Security Policy settings for webview
    - Add fallback mechanisms if library fails to load
    - _Requirements: 5.2, 5.7_
  
  - [x] 17.2 Improve webview error handling and debugging
    - Add comprehensive error logging for webview initialization
    - Implement user-friendly error messages for common webview issues
    - Add debugging tools and diagnostics for webview problems
    - Test webview functionality across different VS Code versions
    - _Requirements: 5.6, 5.7_
    
