# DoraCodeBirdView Tab Structure

This document outlines the tab structure for different analysis types in the DoraCodeBirdView extension.

## Analysis Types and Their Tabs

### 1. Full Code Analysis & Current File Analysis
**Shows 3 tabs only:**
- 🔧 **Tech Stack** - Technology stack analysis and framework detection
- 🔗 **Code Graph** - Interactive code dependency visualization  
- { } **Code Graph JSON** - Raw JSON data view of the code analysis

**Initial Tab:** Tech Stack

### 2. Database Schema Analysis
**Shows 2 tabs:**
- 🗄️ **ER Diagram** - Entity-Relationship diagram visualization
- 📝 **Raw SQL** - Raw SQL schema definition

**Initial Tab:** ER Diagram

### 3. Git Analytics
**Shows 4 tabs:**
- 📊 **Overview** - General git analytics overview
- 👥 **Contributors** - Author statistics and contributions
- 📈 **Commit Timeline** - Commit history and timeline analysis
- 🔥 **File Hotspots** - Files with most changes and activity

**Initial Tab:** Overview (or specific tab based on analysis type)

## Tab Selection Logic

The `TabbedWebviewProvider` automatically determines which tabs to show based on:

1. **Current Tab Context** - If switching between analysis types
2. **Analysis Data Type** - Based on the structure of provided data
3. **Method Called** - Different methods set appropriate initial tabs

## Implementation Details

### Key Methods:
- `getTabsForCurrentAnalysis()` - Determines which tabs to show
- `determineAnalysisType()` - Identifies the current analysis type
- `getCodeAnalysisTabs()` - Returns the 3 code analysis tabs
- `getDatabaseSchemaTabs()` - Returns the 2 database schema tabs  
- `getGitAnalyticsTabs()` - Returns the 4 git analytics tabs

### Analysis Type Detection:
- **Database Schema**: Detected by `dbschema`, `dbschemasql` tabs or `dbSchema`/`tables` in data
- **Git Analytics**: Detected by git-related tabs or `gitAnalytics`/`contributors` in data
- **Code Analysis**: Default for Full Code and Current File analysis

This structure ensures users see only relevant tabs for their current analysis context, providing a cleaner and more focused user experience.