# Design Document

## Overview

The Code Lens Activation Guidance feature enhances the user experience by providing clear, contextual guidance when users enable code lens functionality but haven't run the necessary analysis. Instead of showing empty or confusing code lens items, the system will proactively guide users through the activation process with helpful prompts, progress indicators, and smart preference management.

This feature integrates with the existing DoraCodeLensProvider and AnalysisManager to create a seamless onboarding experience that reduces confusion and increases feature adoption.

## Architecture

### Core Components

#### 1. Code Lens Guidance Manager
- **Purpose**: Orchestrates the guidance experience and manages user preferences
- **Location**: `src/core/code-lens-guidance-manager.ts`
- **Responsibilities**:
  - Detect when guidance is needed (no analysis data available)
  - Manage workspace-specific analysis preferences
  - Coordinate with existing AnalysisManager for running analysis
  - Track guidance state and user interactions

#### 2. Enhanced Code Lens Provider Integration
- **Purpose**: Extend existing DoraCodeLensProvider to show guidance prompts
- **Location**: Modify `src/services/code-lens-provider.ts`
- **Responsibilities**:
  - Replace "Analysis pending..." with actionable guidance prompts
  - Show progress indicators during analysis
  - Display preference-based suggestions
  - Handle guidance command execution

#### 3. Guidance Command Handlers
- **Purpose**: Handle user interactions with guidance prompts
- **Location**: `src/commands/code-lens-guidance-handler.ts`
- **Responsibilities**:
  - Execute analysis commands based on user selection
  - Update user preferences
  - Show progress notifications
  - Handle error scenarios with helpful messaging

#### 4. Preference Storage Service
- **Purpose**: Manage workspace-specific analysis preferences
- **Location**: `src/services/preference-storage-service.ts`
- **Responsibilities**:
  - Store/retrieve workspace analysis preferences
  - Provide default preference logic
  - Handle preference migration and cleanup

### Integration Points

#### With Existing AnalysisManager
- Use existing `analyzeCurrentFile()` and `analyzeFullProject()` methods
- Listen to analysis completion events
- Integrate with existing error handling and recovery mechanisms

#### With DoraCodeLensProvider
- Extend `provideCodeLenses()` to show guidance when no analysis data exists
- Replace placeholder "Analysis pending..." with contextual guidance
- Maintain existing code lens functionality when analysis data is available

#### With VS Code Configuration
- Store preferences in workspace configuration under `doracodelens.guidance`
- Respect existing analysis and code lens settings
- Integrate with VS Code's settings UI

## Components and Interfaces

### Code Lens Guidance Manager

```typescript
interface GuidancePreferences {
  preferredAnalysisType: 'current-file' | 'full-project' | 'ask-each-time';
  showWelcomeMessage: boolean;
  autoRunAnalysisOnEnable: boolean;
  lastAnalysisChoice: 'current-file' | 'full-project' | null;
  guidanceEnabled: boolean;
}

interface GuidanceState {
  isFirstTimeUser: boolean;
  hasAnalysisData: boolean;
  isAnalysisRunning: boolean;
  analysisProgress: number;
  lastError: string | null;
}

class CodeLensGuidanceManager {
  // Detect if guidance is needed for current document
  public needsGuidance(document: vscode.TextDocument): boolean;
  
  // Get guidance prompts for current state
  public getGuidancePrompts(document: vscode.TextDocument): GuidancePrompt[];
  
  // Handle user selection of analysis type
  public handleAnalysisChoice(choice: 'current-file' | 'full-project'): Promise<void>;
  
  // Update user preferences
  public updatePreferences(preferences: Partial<GuidancePreferences>): Promise<void>;
  
  // Get current preferences for workspace
  public getPreferences(): GuidancePreferences;
}
```

### Guidance Prompt Interface

```typescript
interface GuidancePrompt {
  id: string;
  type: 'welcome' | 'analysis-required' | 'progress' | 'error' | 'preference';
  title: string;
  description: string;
  icon: string;
  command: string;
  arguments?: any[];
  tooltip: string;
  priority: number;
}
```

### Enhanced Code Lens Provider Methods

```typescript
// Extended DoraCodeLensProvider methods
class DoraCodeLensProvider {
  // New method to generate guidance code lenses
  private generateGuidanceCodeLenses(document: vscode.TextDocument): vscode.CodeLens[];
  
  // Enhanced method to check for analysis data
  private hasAnalysisDataForDocument(document: vscode.TextDocument): boolean;
  
  // New method to show progress during analysis
  private createProgressCodeLens(progress: number): vscode.CodeLens;
  
  // Enhanced error handling with guidance
  private createErrorGuidanceCodeLens(error: string): vscode.CodeLens;
}
```

## Data Models

### Workspace Preferences Storage

```typescript
interface WorkspaceGuidanceConfig {
  version: string;
  preferences: GuidancePreferences;
  analytics: {
    guidanceShownCount: number;
    analysisTriggeredFromGuidance: number;
    preferenceChanges: number;
    lastUsed: number;
  };
}
```

### Analysis State Tracking

```typescript
interface AnalysisStateInfo {
  documentPath: string;
  hasData: boolean;
  lastAnalyzed: number | null;
  isStale: boolean;
  analysisType: 'current-file' | 'full-project' | null;
  error: string | null;
}
```

## Error Handling

### Guidance-Specific Error Scenarios

1. **Analysis Command Failure**
   - Show retry option in code lens
   - Provide troubleshooting guidance
   - Fallback to basic analysis if enhanced fails

2. **Preference Storage Failure**
   - Use in-memory preferences as fallback
   - Show warning about preference persistence
   - Continue with default behavior

3. **Progress Tracking Failure**
   - Show generic "Analysis running..." message
   - Maintain functionality without progress details
   - Log errors for debugging

### Error Recovery Strategies

```typescript
class GuidanceErrorHandler {
  // Handle analysis command failures with user-friendly messages
  public handleAnalysisError(error: Error, context: AnalysisContext): GuidancePrompt;
  
  // Provide troubleshooting steps for common issues
  public getTroubleshootingSteps(errorType: string): string[];
  
  // Fallback to basic functionality when guidance fails
  public createFallbackGuidance(document: vscode.TextDocument): vscode.CodeLens[];
}
```

## Testing Strategy

### Unit Tests
- **GuidanceManager**: Test preference management, state detection, and prompt generation
- **Enhanced CodeLensProvider**: Test guidance code lens generation and integration
- **PreferenceStorage**: Test workspace preference persistence and retrieval
- **Command Handlers**: Test analysis triggering and error handling

### Integration Tests
- **End-to-End Guidance Flow**: Test complete user journey from enabling code lens to seeing results
- **Preference Persistence**: Test preference storage across workspace sessions
- **Analysis Integration**: Test integration with existing analysis pipeline
- **Error Scenarios**: Test graceful handling of analysis failures

### Performance Tests
- **Guidance Overhead**: Ensure guidance detection doesn't impact code lens performance
- **Preference Access**: Test preference retrieval performance with large workspaces
- **Memory Usage**: Monitor memory impact of guidance state tracking

### User Experience Tests
- **First-Time User Flow**: Test complete onboarding experience
- **Preference Changes**: Test user preference modification workflows
- **Multi-Workspace**: Test preference isolation between workspaces
- **Error Recovery**: Test user experience during error scenarios

## Implementation Phases

### Phase 1: Core Guidance Infrastructure
1. Create CodeLensGuidanceManager with basic preference management
2. Implement PreferenceStorageService for workspace settings
3. Add guidance detection logic to existing CodeLensProvider
4. Create basic guidance command handlers

### Phase 2: Enhanced User Experience
1. Implement progress tracking during analysis
2. Add smart preference suggestions based on project structure
3. Create comprehensive error handling with helpful messages
4. Add analytics tracking for guidance effectiveness

### Phase 3: Advanced Features
1. Implement auto-analysis based on user preferences
2. Add contextual help and onboarding tooltips
3. Create preference management UI integration
4. Optimize performance for large workspaces

## Configuration Schema

### VS Code Settings Integration

```json
{
  "doracodelens.guidance": {
    "enabled": {
      "type": "boolean",
      "default": true,
      "description": "Enable code lens activation guidance"
    },
    "preferredAnalysisType": {
      "type": "string",
      "enum": ["current-file", "full-project", "ask-each-time"],
      "default": "ask-each-time",
      "description": "Default analysis type when enabling code lens"
    },
    "autoRunAnalysisOnEnable": {
      "type": "boolean",
      "default": false,
      "description": "Automatically run analysis when code lens is enabled"
    },
    "showWelcomeMessage": {
      "type": "boolean",
      "default": true,
      "description": "Show welcome message for first-time users"
    }
  }
}
```

### Workspace-Specific Storage

```json
{
  "doracodelens.workspace.guidance": {
    "version": "1.0.0",
    "preferences": {
      "preferredAnalysisType": "current-file",
      "showWelcomeMessage": false,
      "autoRunAnalysisOnEnable": true,
      "lastAnalysisChoice": "current-file",
      "guidanceEnabled": true
    },
    "analytics": {
      "guidanceShownCount": 5,
      "analysisTriggeredFromGuidance": 3,
      "preferenceChanges": 1,
      "lastUsed": 1703123456789
    }
  }
}
```