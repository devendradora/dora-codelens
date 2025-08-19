# Design Document

## Overview

This design addresses the debug panel tab switching issue in the full code analysis webview. The core problem is that the JavaScript tab switching logic is not properly updating the debug information and tab content visibility when users click different tabs. The debug panel consistently shows tech stack information regardless of the active tab, indicating that the `switchTab()` function is not correctly managing tab state and content updates.

## Architecture

### Current Tab Switching Flow (Problematic)

```
User Clicks Tab Button
       │
       ▼
Tab Button Event Handler
       │
       ▼
switchTab(tabId) Function
       │
       ▼ (Issue: Debug info not updated)
Update Tab Button Styles
       │
       ▼ (Issue: Content visibility not managed properly)
Update Tab Content Visibility
       │
       ▼ (Issue: Tab-specific loading not triggered)
loadTabContent(tabId)
```

### Proposed Tab Switching Flow (Fixed)

```
User Clicks Tab Button
       │
       ▼
Tab Button Event Handler
       │
       ▼
switchTab(tabId) Function
       │
       ├─► Update Tab State Object
       ├─► Update Debug Information
       ├─► Update Tab Button Styles
       ├─► Update Tab Content Visibility
       ├─► Load Tab-Specific Content
       └─► Persist Tab State
```

### Root Cause Analysis

Based on the code analysis, the issue stems from:

1. **Debug Information Static**: The debug panels are generated server-side with static content and not updated by JavaScript
2. **Tab Content Pre-rendered**: All tab content is pre-rendered in HTML, but visibility switching may not be working correctly
3. **State Management Issues**: The `switchTab()` function may not be properly updating all necessary DOM elements
4. **Content Isolation Problems**: Tab content may be sharing the same container or not being properly isolated

## Components and Interfaces

### 1. Enhanced Tab State Manager

**Purpose**: Centralized management of tab state and debug information

**Key Features**:
- Track current active tab
- Manage tab-specific data and state
- Update debug information dynamically
- Handle tab state persistence

**Interface**:
```typescript
interface TabStateManager {
  activeTab: string;
  tabData: { [tabId: string]: any };
  debugInfo: { [tabId: string]: DebugInfo };
  
  switchToTab(tabId: string): void;
  updateDebugInfo(tabId: string, info: DebugInfo): void;
  persistState(): void;
  restoreState(): void;
}

interface DebugInfo {
  available: boolean;
  count: number;
  contentLength: number;
  contentPreview: string;
  tabType: string;
  timestamp: number;
}
```

### 2. Dynamic Debug Panel Updater

**Purpose**: Update debug information in real-time when tabs are switched

**Key Features**:
- Replace static debug content with dynamic updates
- Show tab-specific debug information
- Update debug metrics based on active tab
- Provide real-time debugging information

**Methods**:
```typescript
interface DebugPanelUpdater {
  updateDebugPanel(tabId: string, debugInfo: DebugInfo): void;
  generateDebugHTML(tabId: string, debugInfo: DebugInfo): string;
  clearDebugPanel(): void;
  showDebugError(tabId: string, error: string): void;
}
```

### 3. Enhanced Tab Content Manager

**Purpose**: Properly manage tab content visibility and loading

**Key Features**:
- Ensure only one tab content is visible at a time
- Handle tab-specific content loading
- Manage content isolation
- Handle empty states and errors

**Methods**:
```typescript
interface TabContentManager {
  showTabContent(tabId: string): void;
  hideAllTabContent(): void;
  loadTabSpecificContent(tabId: string): void;
  validateTabContent(tabId: string): boolean;
}
```

### 4. Improved Tab Button Manager

**Purpose**: Manage tab button states and interactions

**Key Features**:
- Update active tab button styling
- Handle keyboard navigation
- Manage tab button accessibility
- Provide visual feedback

**Methods**:
```typescript
interface TabButtonManager {
  activateTabButton(tabId: string): void;
  deactivateAllTabButtons(): void;
  updateTabButtonBadges(): void;
  handleTabButtonClick(tabId: string): void;
}
```

## Data Models

### Tab State Data Structure

```typescript
interface TabState {
  activeTab: string;
  tabData: {
    'tech-stack': {
      available: boolean;
      count: number;
      content: string;
      loaded: boolean;
      lastUpdated: number;
    };
    'code-graph': {
      available: boolean;
      count: number;
      content: string;
      loaded: boolean;
      graphInitialized: boolean;
      lastUpdated: number;
    };
    'code-graph-json': {
      available: boolean;
      count: number;
      content: string;
      loaded: boolean;
      lastUpdated: number;
    };
  };
  loading: { [tabId: string]: boolean };
  errors: { [tabId: string]: string };
}
```

### Debug Information Structure

```typescript
interface TabDebugInfo {
  tabType: string;
  available: boolean;
  count: number;
  contentLength: number;
  contentPreview: string;
  elementsFound: {
    container: boolean;
    content: boolean;
    debugPanel: boolean;
  };
  timestamp: number;
  additionalInfo: { [key: string]: any };
}
```

## Error Handling

### Tab Switching Error Recovery

1. **Detection**: Monitor tab switching operations for failures
2. **Logging**: Log detailed error information with tab state
3. **Recovery**: Attempt to restore previous working tab state
4. **Fallback**: Default to Tech Stack tab if recovery fails
5. **User Feedback**: Show clear error messages in affected tabs

### Debug Panel Error Handling

```typescript
interface DebugErrorHandler {
  handleTabSwitchError(tabId: string, error: Error): void;
  handleContentLoadError(tabId: string, error: Error): void;
  handleStateRestoreError(error: Error): void;
  showDebugError(tabId: string, message: string): void;
}
```

### Content Validation Strategy

```typescript
interface ContentValidator {
  validateTabContent(tabId: string): ValidationResult;
  validateDebugInfo(tabId: string): ValidationResult;
  validateTabState(): ValidationResult;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}
```

## Implementation Approach

### Phase 1: Debug Panel Dynamic Updates

**Objective**: Replace static debug panels with dynamic JavaScript updates

**Key Changes**:
- Remove server-side debug panel generation
- Add JavaScript functions to update debug information
- Create debug info templates for each tab type
- Implement real-time debug updates on tab switch

**Implementation**:
```javascript
function updateDebugPanel(tabId, debugInfo) {
  const debugPanel = document.querySelector(`#${tabId}-tab .debug-info`);
  if (debugPanel) {
    debugPanel.innerHTML = generateDebugHTML(tabId, debugInfo);
  }
}

function generateDebugHTML(tabId, debugInfo) {
  return `
    <strong>DEBUG: ${debugInfo.tabType} Tab</strong><br>
    Available: ${debugInfo.available}<br>
    Count: ${debugInfo.count}<br>
    Content Length: ${debugInfo.contentLength}<br>
    Content Preview: ${debugInfo.contentPreview}...
  `;
}
```

### Phase 2: Enhanced Tab Switching Logic

**Objective**: Fix the `switchTab()` function to properly manage all tab-related updates

**Key Changes**:
- Refactor `switchTab()` function for better error handling
- Add proper tab content visibility management
- Implement tab state validation
- Add comprehensive logging for debugging

**Implementation**:
```javascript
function switchTab(tabId) {
  try {
    console.log(`=== SWITCHING TO TAB: ${tabId} ===`);
    
    // Validate tab ID
    if (!isValidTabId(tabId)) {
      throw new Error(`Invalid tab ID: ${tabId}`);
    }
    
    // Update tab state
    updateTabState(tabId);
    
    // Update debug information
    updateDebugPanel(tabId, getTabDebugInfo(tabId));
    
    // Update tab buttons
    updateTabButtons(tabId);
    
    // Update tab content visibility
    updateTabContentVisibility(tabId);
    
    // Load tab-specific content
    loadTabContent(tabId);
    
    // Persist state
    persistTabState(tabId);
    
    console.log(`✓ Successfully switched to tab: ${tabId}`);
    
  } catch (error) {
    console.error(`Failed to switch to tab ${tabId}:`, error);
    handleTabSwitchError(tabId, error);
  }
}
```

### Phase 3: Content Isolation and Validation

**Objective**: Ensure each tab displays unique content without duplication

**Key Changes**:
- Add content validation for each tab
- Implement content isolation checks
- Add unique identifiers for debugging
- Validate tab content integrity

**Implementation**:
```javascript
function validateTabContent(tabId) {
  const tabContent = document.getElementById(`${tabId}-tab`);
  if (!tabContent) {
    return { isValid: false, error: 'Tab content element not found' };
  }
  
  const debugPanel = tabContent.querySelector('.debug-info');
  const contentWrapper = tabContent.querySelector('.tab-content-wrapper');
  
  return {
    isValid: !!(debugPanel && contentWrapper),
    hasDebugPanel: !!debugPanel,
    hasContentWrapper: !!contentWrapper,
    contentLength: tabContent.innerHTML.length,
    tabType: tabContent.getAttribute('data-tab-type')
  };
}
```

### Phase 4: State Management and Persistence

**Objective**: Implement robust tab state management and persistence

**Key Changes**:
- Centralize tab state management
- Implement proper state persistence
- Add state validation and recovery
- Handle state restoration on webview refresh

## Testing Strategy

### Unit Testing

1. **Tab Switching Logic**: Test `switchTab()` function with various tab IDs
2. **Debug Panel Updates**: Test debug information updates for each tab
3. **Content Validation**: Test tab content validation logic
4. **State Management**: Test state persistence and restoration

### Integration Testing

1. **End-to-End Tab Switching**: Test complete tab switching workflow
2. **Debug Panel Accuracy**: Verify debug information matches active tab
3. **Content Isolation**: Verify each tab shows unique content
4. **Error Recovery**: Test error handling and recovery mechanisms

### Browser Testing

1. **DOM Manipulation**: Test DOM updates work correctly
2. **Event Handling**: Test tab button click events
3. **State Persistence**: Test vscode.setState/getState functionality
4. **Performance**: Test tab switching performance with large datasets

## Success Metrics

1. **Debug Accuracy**: Debug panel shows correct information for active tab (100% accuracy)
2. **Tab Switching**: All tabs switch correctly without errors (100% success rate)
3. **Content Isolation**: Each tab displays unique content (no duplication)
4. **State Persistence**: Tab state persists across webview refreshes
5. **Error Recovery**: Graceful handling of tab switching errors

## Technical Considerations

### Performance Optimization

- **Lazy Loading**: Only load tab content when accessed
- **Caching**: Cache tab content to avoid regeneration
- **DOM Efficiency**: Minimize DOM manipulations during tab switching

### Browser Compatibility

- **VS Code Webview**: Ensure compatibility with VS Code's webview environment
- **JavaScript Features**: Use supported JavaScript features only
- **CSS Transitions**: Smooth tab switching animations

### Debugging and Monitoring

- **Comprehensive Logging**: Detailed logging for all tab operations
- **Error Reporting**: Clear error messages for debugging
- **State Inspection**: Tools for inspecting tab state and content