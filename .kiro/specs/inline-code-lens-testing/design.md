# Inline Code Lens Testing Design

## Testing Strategy

### 1. Unit Testing Approach
Test individual components of the code lens system in isolation:
- CodeLensProvider data parsing logic
- Complexity score to color mapping
- Analysis result integration

### 2. Integration Testing Approach  
Test the complete workflow from analysis to display:
- Current file analysis → code lens activation → indicator display
- Command manager integration
- Analysis manager data flow

### 3. Manual Testing Approach
Interactive testing in VS Code Extension Development Host:
- Real Python files with varying complexity
- User workflow simulation
- Visual verification of indicators

## Test Implementation Plan

### Phase 1: Setup Test Environment
1. Create test Python files with known complexity scores
2. Set up Extension Development Host for manual testing
3. Prepare analysis output samples for validation

### Phase 2: Component Testing
1. Test CodeLensProvider with mock analysis data
2. Validate complexity score calculations
3. Test color mapping logic

### Phase 3: Integration Testing
1. Test complete analysis → code lens workflow
2. Verify auto-enable functionality
3. Test exclusion of full project analysis

### Phase 4: User Experience Testing
1. Test with real Python projects
2. Verify performance with large files
3. Test edge cases (no functions, parsing errors)

## Test Data Requirements

### Sample Python Files
- **Simple file**: 2-3 functions with low complexity (≤ 5)
- **Medium file**: Functions with medium complexity (6-10)
- **Complex file**: Functions with high complexity (> 10)
- **Mixed file**: Combination of all complexity levels
- **Edge cases**: Empty file, no functions, syntax errors

### Expected Analysis Output Structure
```json
{
  "analysis_results": {
    "functions": [
      {
        "name": "function_name",
        "complexity": 3,
        "line_number": 10
      }
    ]
  }
}
```

## Testing Tools & Environment

### Development Environment
- VS Code Extension Development Host (F5)
- Python analyzer in `analyzer/` directory
- Test files in `test-files/` directory

### Validation Methods
- Console logging for data flow verification
- VS Code Developer Tools for debugging
- Manual visual inspection of code lens indicators

## Success Metrics

### Functional Metrics
- ✅ Indicators appear for all functions with complexity data
- ✅ Colors correctly map to complexity levels
- ✅ Auto-enable works after current file analysis
- ✅ Full project analysis does not trigger indicators

### Performance Metrics
- Code lens activation time < 500ms after analysis
- No noticeable editor lag when scrolling
- Memory usage remains stable

### User Experience Metrics
- Indicators are visually clear and non-intrusive
- Complexity information is immediately understandable
- No false positives or missing indicators