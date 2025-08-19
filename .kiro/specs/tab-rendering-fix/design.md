# Design Document

## Overview

This design addresses the critical tab rendering and data parsing issues in the full code analysis webview. The core problem is a mismatch between the expected frontend data structure and the actual backend response format. The backend returns nested objects (e.g., `modules.nodes`, `functions.nodes`) while the frontend expects flat arrays. This design will update the data parsing logic, fix counting methods, and ensure proper error handling across all tabs.

## Architecture

### Current vs Expected Data Structure

**Backend Response Structure (Actual)**:
```typescript
interface BackendResponse {
  success: boolean;
  metadata: {
    analysis_time: number;
    total_files: number;
    total_lines: number;
    schema_version: string;
    warnings: string[];
  };
  tech_stack: {
    libraries: Array<{name: string, version: string, usage_count: number}>;
    frameworks: string[];
    languages: {[key: string]: number};
    python_version: string;
  };
  modules: {
    nodes: Array<ModuleNode>;
    edges: Array<ModuleEdge>;
    total_modules: number;
    complexity_summary: ComplexitySummary;
  };
  functions: {
    nodes: Array<FunctionNode>;
    edges: Array<CallEdge>;
    total_functions: number;
  };
  framework_patterns: {
    django?: DjangoPatterns;
    flask?: FlaskPatterns;
    fastapi?: FastAPIPatterns;
  };
  errors: string[];
  warnings: string[];
}
```

**Current Frontend Expectations (Incorrect)**:
```typescript
interface CurrentExpectations {
  modules: Array<ModuleNode>;  // Should be modules.nodes
  functions: Array<FunctionNode>;  // Should be functions.nodes
  tech_stack: {
    languages: {[key: string]: number};  // Correct
    frameworks: string[];  // Should be frameworks array
  };
}
```

### Data Flow Architecture

```
Backend Response
       │
       ▼
┌─────────────────────┐
│ Data Structure      │ ──► Validates response structure
│ Validator           │     against expected schema
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│ Data Normalizer     │ ──► Transforms nested structures
│                     │     to expected format
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│ Tab Content         │ ──► Generates tab content using
│ Generator           │     normalized data
└─────────────────────┘
```

## Components and Interfaces

### 1. Data Structure Validator

**Purpose**: Validate and log the actual backend response structure for debugging

**Key Features**:
- Schema validation against expected structure
- Detailed logging of data structure mismatches
- Graceful handling of missing or malformed data
- Clear error messages for debugging

**Interface**:
```typescript
interface DataValidator {
  validateResponse(data: any): ValidationResult;
  logStructureMismatch(expected: string, actual: any): void;
  getValidationErrors(): string[];
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedData: any;
}
```

### 2. Data Normalizer

**Purpose**: Transform the backend response to match frontend expectations

**Key Features**:
- Convert nested structures to expected format
- Handle missing data gracefully
- Maintain backward compatibility
- Preserve all available data

**Methods**:
```typescript
interface DataNormalizer {
  normalizeModulesData(data: any): ModuleData;
  normalizeFunctionsData(data: any): FunctionData;
  normalizeTechStackData(data: any): TechStackData;
  normalizeFrameworkPatternsData(data: any): FrameworkPatternData;
}
```

### 3. Updated Counting Methods

**Purpose**: Provide accurate counts based on the actual data structure

**Key Features**:
- Use `total_modules` when available, fallback to counting nodes
- Handle both nested and flat data structures
- Consistent counting logic across all tabs
- Proper error handling for missing data

**Methods**:
```typescript
interface CountingMethods {
  getModuleCount(data: any): number;
  getFunctionCount(data: any): number;
  getTechStackCount(data: any): number;
  getFrameworkPatternCount(data: any): number;
}
```

### 4. Enhanced Tab Content Generators

**Purpose**: Generate tab content using the correct data structure

**Key Features**:
- Access data from correct nested paths
- Handle missing data with appropriate empty states
- Provide detailed error information
- Support both old and new data formats for compatibility

## Data Models

### Normalized Data Interfaces

```typescript
interface NormalizedAnalysisData {
  // Metadata (unchanged)
  metadata: {
    analysis_time: number;
    total_files: number;
    total_lines: number;
    schema_version: string;
    warnings: string[];
  };
  
  // Tech Stack (normalized)
  tech_stack: {
    languages: {[key: string]: number};
    frameworks: string[];
    libraries: Array<{name: string, version: string, usage_count: number}>;
    python_version: string;
  };
  
  // Modules (normalized from nested structure)
  modules: {
    items: Array<ModuleNode>;  // From modules.nodes
    relationships: Array<ModuleEdge>;  // From modules.edges
    total_count: number;  // From modules.total_modules
    complexity_summary: ComplexitySummary;
  };
  
  // Functions (normalized from nested structure)
  functions: {
    items: Array<FunctionNode>;  // From functions.nodes
    calls: Array<CallEdge>;  // From functions.edges
    total_count: number;  // From functions.total_functions
  };
  
  // Framework Patterns (normalized)
  framework_patterns: {
    detected: Array<{
      framework: string;
      patterns: any;
      confidence: number;
    }>;
    total_count: number;
  };
  
  // Error handling
  errors: string[];
  warnings: string[];
  success: boolean;
}
```

### Module and Function Node Interfaces

```typescript
interface ModuleNode {
  id: string;
  name: string;
  path: string;
  complexity: {
    level: string;
    score: number;
  };
  files: string[];
  line_count: number;
}

interface FunctionNode {
  id: string;
  name: string;
  module: string;
  complexity: number;
  line_number: number;
  parameters: Array<{
    name: string;
    type_hint?: string;
    default_value?: string;
  }>;
}
```

## Error Handling

### Data Structure Mismatch Handling

1. **Detection**: Identify when expected data paths don't exist
2. **Logging**: Log detailed information about structure mismatches
3. **Fallback**: Attempt alternative data paths for backward compatibility
4. **User Feedback**: Show clear error messages in affected tabs

### Missing Data Handling Strategy

```typescript
interface DataAccessStrategy {
  // Primary path (new structure)
  primary: string;
  // Fallback path (old structure)
  fallback?: string;
  // Default value if both fail
  default: any;
  // Error message for debugging
  errorMessage: string;
}

const DATA_ACCESS_STRATEGIES = {
  modules: {
    primary: 'modules.nodes',
    fallback: 'modules',
    default: [],
    errorMessage: 'Module data not found in expected locations'
  },
  functions: {
    primary: 'functions.nodes',
    fallback: 'functions',
    default: [],
    errorMessage: 'Function data not found in expected locations'
  }
};
```

### Error Recovery Mechanisms

1. **Graceful Degradation**: Show available data even if some sections fail
2. **Retry Logic**: Allow users to retry failed data parsing
3. **Debug Information**: Provide raw data access in Metadata tab
4. **User Guidance**: Clear instructions on what went wrong and how to fix it

## Testing Strategy

### Data Structure Testing

1. **Schema Validation**: Test with various backend response formats
2. **Edge Cases**: Test with missing, null, or malformed data
3. **Backward Compatibility**: Test with old data formats
4. **Error Scenarios**: Test error handling and recovery

### Integration Testing

1. **End-to-End**: Test full analysis workflow with corrected data parsing
2. **Tab Rendering**: Verify all tabs display content correctly
3. **Counting Accuracy**: Verify module and function counts are correct
4. **Error Handling**: Test behavior with various error conditions

## Implementation Approach

### Phase 1: Data Structure Analysis and Validation
- Add comprehensive logging of backend response structure
- Implement data structure validator
- Create debugging tools for structure analysis

### Phase 2: Data Normalization Layer
- Implement data normalizer to transform nested structures
- Update counting methods to use correct data paths
- Add fallback mechanisms for backward compatibility

### Phase 3: Tab Content Updates
- Update all tab content generators to use normalized data
- Fix availability checking logic
- Improve error handling and empty states

### Phase 4: Testing and Validation
- Test with real backend responses
- Verify all tabs render correctly
- Validate counting accuracy
- Test error scenarios

## Technical Considerations

### Performance Optimization

- **Lazy Normalization**: Only normalize data when tabs are accessed
- **Caching**: Cache normalized data to avoid repeated processing
- **Memory Management**: Efficient handling of large datasets

### Backward Compatibility

- **Dual Support**: Support both old and new data formats
- **Migration Path**: Gradual transition to new structure
- **Version Detection**: Detect data format version and handle appropriately

### Debugging and Monitoring

- **Detailed Logging**: Comprehensive logging of data structure issues
- **Error Reporting**: Clear error messages for developers
- **Debug Tools**: Built-in tools for analyzing data structure problems

## Success Metrics

1. **Tab Rendering**: All tabs display content correctly (100% success rate)
2. **Count Accuracy**: Module and function counts match actual data
3. **Error Reduction**: Significant reduction in tab rendering errors
4. **User Experience**: Improved reliability and consistency of analysis display
5. **Debug Capability**: Clear error messages and debugging information available