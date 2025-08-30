# Design Document

## Overview

This design standardizes the layout and styling of database schema analysis, git analytics, and current file analysis webviews to match the modern tabbed navigation system used in the full code analysis webview. The solution involves refactoring the HTML structure and CSS styling of three webview providers to create a consistent user experience across all analysis views.

## Architecture

### Component Structure

The standardized layout will follow this hierarchy:
```
analysis-container
├── navigation-bar
│   └── nav-links (tab buttons)
└── scrollable-content
    └── content-section (for each tab)
        ├── section-header
        └── section-content
```

### Webview Providers

Three webview providers will be modified:
- `DatabaseSchemaWebview` - Database schema analysis
- `GitAnalyticsWebview` - Git repository analytics  
- `CurrentFileAnalysisWebview` - Current file analysis

Each provider will implement the standardized layout pattern while maintaining their specific functionality.

## Components and Interfaces

### Navigation Component

**Structure:**
```html
<div class="navigation-bar">
  <div class="nav-links">
    <button class="nav-link active" data-tab="section-id">
      <span class="nav-icon">🔍</span>
      <span class="nav-label">Section Name</span>
    </button>
    <!-- Additional tabs -->
  </div>
</div>
```

**Styling:**
- Consistent with full code analysis navigation
- Active state highlighting
- Hover effects
- Icon + label layout

### Content Sections

**Structure:**
```html
<div class="scrollable-content">
  <section id="section-id" class="content-section active">
    <div class="section-header">
      <h2>Section Title</h2>
    </div>
    <div class="section-content">
      <!-- Section-specific content -->
    </div>
  </section>
</div>
```

**Behavior:**
- Only one section visible at a time
- Smooth transitions between sections
- Proper scroll handling

### Tab Configuration

#### Database Schema Analysis
1. **Schema Overview** (`schema-overview-section`)
   - Database metadata and statistics
   - Connection information
   - Table/relationship counts

2. **Schema Graph** (`schema-graph-section`)
   - Interactive schema visualization
   - Graph controls and toolbar
   - Legend and navigation

3. **Table Details** (`table-details-section`)
   - Table list and detailed information
   - Column specifications
   - Relationship details

#### Git Analytics
1. **Repository Overview** (`repository-overview-section`)
   - Repository statistics
   - Basic metrics and summary
   - Project information

2. **Contributors** (`contributors-section`)
   - Author contribution data
   - Contributor metrics and rankings
   - Individual contributor details

3. **Timeline Charts** (`timeline-charts-section`)
   - Commit timeline visualizations
   - Activity charts and graphs
   - Interactive chart controls

#### Current File Analysis
1. **File Overview** (`file-overview-section`)
   - File information and path
   - Basic metrics and statistics
   - File type and language detection

2. **Complexity Analysis** (`complexity-analysis-section`)
   - Complexity metrics and scores
   - Function complexity breakdown
   - Maintainability indicators

3. **Dependencies** (`dependencies-section`)
   - Import/export analysis
   - Framework pattern detection
   - Dependency visualization

## Data Models

### Tab Configuration Model
```typescript
interface TabConfig {
  id: string;
  label: string;
  icon: string;
  active?: boolean;
}

interface AnalysisViewConfig {
  title: string;
  tabs: TabConfig[];
}
```

### Content Section Model
```typescript
interface ContentSection {
  id: string;
  title: string;
  content: string;
  active?: boolean;
}
```

## Error Handling

### Tab Navigation Errors
- Graceful fallback to first tab if invalid tab requested
- Error logging for debugging
- User notification for critical failures

### Content Loading Errors
- Loading states for each section
- Error states with retry options
- Fallback content for missing data

### JavaScript Errors
- Try-catch blocks around tab switching logic
- Console error logging
- Graceful degradation of functionality

## Testing Strategy

### Unit Testing
- Tab switching functionality
- Content section visibility logic
- CSS class management
- Event handler registration

### Integration Testing
- Full webview rendering with tabbed layout
- Data loading and display in correct sections
- Cross-browser compatibility
- Theme consistency testing

### Visual Testing
- Screenshot comparison with full code analysis
- Responsive layout testing
- Theme switching validation
- Icon and typography consistency

### User Acceptance Testing
- Navigation flow testing
- Content organization validation
- Performance impact assessment
- Accessibility compliance verification

## Implementation Approach

### Phase 1: CSS Standardization
1. Extract common styles from full code analysis
2. Create shared CSS classes for navigation and content
3. Update webview CSS imports

### Phase 2: HTML Structure Updates
1. Refactor each webview's HTML generation
2. Implement tabbed navigation structure
3. Reorganize content into sections

### Phase 3: JavaScript Functionality
1. Add tab switching logic to each webview
2. Implement section visibility management
3. Ensure proper event handling

### Phase 4: Content Migration
1. Move existing content into appropriate sections
2. Maintain all current functionality
3. Test data flow and rendering

### Phase 5: Polish and Testing
1. Fine-tune styling and animations
2. Comprehensive testing across all views
3. Performance optimization
4. Documentation updates