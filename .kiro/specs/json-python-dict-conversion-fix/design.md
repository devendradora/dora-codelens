# Design Document

## Overview

This design addresses critical issues in the JSON utilities service's Python dictionary to JSON conversion functionality. The current implementation has flaws in quote handling, error reporting, and edge case management that cause conversion failures. The solution involves rewriting the conversion logic with a more robust parser approach and enhanced error handling.

## Architecture

### Current Issues Analysis

1. **Quote Conversion Problems**: The current `fixQuotes` method has issues with nested quotes and escape sequences
2. **Incomplete Error Handling**: Generic error messages don't help users identify specific syntax issues
3. **Limited Validation**: The conversion process doesn't validate intermediate steps
4. **Edge Case Failures**: Complex nested structures and special characters cause failures

### Proposed Solution Architecture

```
JsonUtilitiesService
├── Enhanced Python Dict Converter
│   ├── PythonDictTokenizer (new)
│   ├── PythonDictParser (new)
│   └── JsonConverter (enhanced)
├── Improved Error Handler
│   ├── ConversionError (new interface)
│   ├── ValidationReporter (enhanced)
│   └── SuggestionEngine (new)
└── Robust Validation Pipeline
    ├── PreConversionValidator (new)
    ├── PostConversionValidator (enhanced)
    └── IntegrityChecker (new)
```

## Components and Interfaces

### 1. Enhanced Conversion Interfaces

```typescript
interface PythonDictConversionResult {
    success: boolean;
    convertedJson?: string;
    errors: ConversionError[];
    warnings: ConversionWarning[];
    originalContent: string;
    conversionSteps: ConversionStep[];
}

interface ConversionError {
    type: 'syntax' | 'structure' | 'unsupported' | 'validation';
    message: string;
    line?: number;
    column?: number;
    position?: number;
    suggestion: string;
    severity: 'error' | 'warning';
    fixable: boolean;
}

interface ConversionStep {
    step: string;
    description: string;
    before: string;
    after: string;
    success: boolean;
}
```

### 2. PythonDictTokenizer

A new tokenizer that properly handles Python syntax:

```typescript
class PythonDictTokenizer {
    tokenize(content: string): Token[]
    private handleQuotes(content: string, position: number): QuoteToken
    private handleKeywords(content: string, position: number): KeywordToken
    private handleWhitespace(content: string, position: number): WhitespaceToken
    private handlePunctuation(content: string, position: number): PunctuationToken
}
```

**Key Features:**
- Proper string boundary detection
- Escape sequence handling
- Python keyword recognition (True, False, None)
- Comment detection and removal
- Trailing comma identification

### 3. PythonDictParser

A parser that converts tokens to JSON structure:

```typescript
class PythonDictParser {
    parse(tokens: Token[]): ParseResult
    private convertValue(token: Token): JsonValue
    private convertObject(tokens: Token[]): JsonObject
    private convertArray(tokens: Token[]): JsonArray
    private validateStructure(parsed: any): ValidationResult
}
```

**Key Features:**
- Recursive parsing of nested structures
- Type conversion (Python → JSON)
- Structure validation
- Error position tracking

### 4. Enhanced Error Handling

```typescript
class ConversionErrorHandler {
    analyzeError(error: Error, content: string, position?: number): ConversionError
    generateSuggestions(error: ConversionError, content: string): string[]
    formatErrorMessage(error: ConversionError): string
    createRecoveryPlan(errors: ConversionError[]): RecoveryStep[]
}
```

## Data Models

### Token Types

```typescript
enum TokenType {
    STRING = 'string',
    NUMBER = 'number',
    BOOLEAN = 'boolean',
    NULL = 'null',
    OBJECT_START = 'object_start',
    OBJECT_END = 'object_end',
    ARRAY_START = 'array_start',
    ARRAY_END = 'array_end',
    COMMA = 'comma',
    COLON = 'colon',
    WHITESPACE = 'whitespace',
    COMMENT = 'comment'
}

interface Token {
    type: TokenType;
    value: string;
    position: number;
    line: number;
    column: number;
    raw: string;
}
```

### Conversion Pipeline

```typescript
interface ConversionPipeline {
    steps: ConversionStep[];
    execute(content: string): PythonDictConversionResult;
}

class ConversionStep {
    name: string;
    description: string;
    execute(content: string): StepResult;
    validate(result: StepResult): boolean;
}
```

## Error Handling

### Error Categories

1. **Syntax Errors**
   - Unmatched quotes
   - Missing commas
   - Invalid escape sequences
   - Malformed structures

2. **Structure Errors**
   - Deeply nested objects
   - Circular references
   - Invalid key types
   - Mixed data types

3. **Conversion Errors**
   - Unsupported Python syntax
   - Complex expressions
   - Function calls
   - Variable references

4. **Validation Errors**
   - Invalid JSON after conversion
   - Data type mismatches
   - Encoding issues

### Error Recovery Strategies

```typescript
class ErrorRecoveryManager {
    attemptAutoFix(error: ConversionError, content: string): string | null
    suggestManualFix(error: ConversionError): string[]
    createPartialResult(content: string, errors: ConversionError[]): Partial<PythonDictConversionResult>
}
```

## Testing Strategy

### Unit Tests

1. **Tokenizer Tests**
   - Quote handling edge cases
   - Escape sequence processing
   - Keyword recognition
   - Comment removal

2. **Parser Tests**
   - Nested structure parsing
   - Type conversion accuracy
   - Error position tracking
   - Malformed input handling

3. **Integration Tests**
   - End-to-end conversion scenarios
   - Error handling workflows
   - Performance with large objects
   - Real-world Python dict examples

### Test Data Sets

```typescript
const testCases = {
    simpleDict: `{'name': 'test', 'value': True}`,
    nestedDict: `{'user': {'name': 'John', 'active': True, 'data': None}}`,
    arrayDict: `{'items': ['a', 'b', 'c'], 'count': 3}`,
    complexDict: `{'config': {'debug': True, 'features': ['auth', 'logging']}}`,
    edgeCases: [
        `{'key': "value with 'quotes'"}`,
        `{'trailing': 'comma',}`,
        `{'escaped': 'string with \\"quotes\\"'}`,
        `{'none_value': None, 'bool_values': [True, False]}`
    ]
};
```

### Performance Testing

- Conversion speed benchmarks
- Memory usage analysis
- Large object handling
- Concurrent conversion testing

## Implementation Approach

### Phase 1: Core Tokenizer
- Implement robust string parsing
- Handle escape sequences correctly
- Recognize Python keywords
- Process comments and whitespace

### Phase 2: Parser Implementation
- Build recursive descent parser
- Implement type conversion
- Add structure validation
- Create error tracking

### Phase 3: Error Handling Enhancement
- Develop error categorization
- Implement suggestion engine
- Create recovery strategies
- Add detailed reporting

### Phase 4: Integration and Testing
- Replace existing conversion logic
- Maintain backward compatibility
- Add comprehensive test suite
- Performance optimization

## Backward Compatibility

The enhanced conversion system will:
- Maintain existing public API methods
- Preserve current error handling patterns
- Support all existing use cases
- Provide migration path for edge cases

## Performance Considerations

- **Tokenization**: O(n) time complexity for input parsing
- **Parsing**: O(n) time complexity for structure building
- **Memory**: Efficient token reuse and garbage collection
- **Caching**: Cache tokenization results for repeated operations