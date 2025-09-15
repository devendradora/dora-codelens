# Change Log

All notable changes to the "DoraCodeLens" extension will be documented in this file.

## [0.1.3]

### Fixed
- **Command Registration**: Resolved duplicate command registration error during extension activation
  - Centralized all command registration in CommandManager to prevent conflicts
  - Enhanced error handling for command registration failures

### Added
- **Inline Code Lens Enhancement**: Complete rewrite of inline code lens functionality
  - New simplified CodeLensInlineProvider with improved performance
  - Automatic activation after current file analysis completion
  - Enhanced complexity indicators with 🟢🟡🔴 color coding
  - Support for both functions and class methods
  - Improved data structure handling for analysis results

- **Background Analysis Manager**: Intelligent automatic file analysis
  - Smart caching system with content hash validation
  - Automatic cache invalidation on file changes
  - Background analysis with progress tracking
  - Integration with sidebar for analysis status updates

- **Enhanced Error Handling**: Comprehensive error recovery system
  - AnalysisErrorHandler with multiple recovery strategies
  - Automatic retry mechanisms for failed operations
  - Python service restart recovery for timeout issues
  - Memory cleanup and cache management recovery
  - Configuration reset recovery for corrupted settings

- **Sidebar Improvements**: Streamlined sidebar experience
  - Removed code lens toggle buttons from sidebar (now in context menu only)
  - Enhanced recent analysis tracking (increased to 15 entries)
  - Improved project metrics display
  - Better analysis status indicators

### Changed
- Updated sidebar and activity bar icon to use new DoraCodeLens branding (`resources/dora-code-lens-kiro.png`)
- Enhanced visual consistency across VS Code interface with updated icon
- Simplified code lens activation workflow - auto-enables after current file analysis
- Improved command organization in context menus
- Enhanced analysis data flow between Python analyzer and TypeScript extension

## [0.1.0] - Initial Release

### Added
- Project structure for VS Code extension
- Package.json with extension configuration
- TypeScript compilation setup
- ESLint configuration for code quality
- VS Code debugging and task configuration
- Basic extension activation and command registration