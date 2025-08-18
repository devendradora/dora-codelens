# DoraCodeBirdView Extension Test Suite

This directory contains comprehensive tests for the DoraCodeBirdView VS Code extension, covering unit tests, integration tests, end-to-end workflows, and performance testing.

## Test Structure

```
src/test/
├── suite/                          # Test suites
│   ├── analyzer-runner.test.ts     # AnalyzerRunner component tests
│   ├── codelens.test.ts            # CodeLens provider tests
│   ├── context-menu.test.ts        # Context menu integration tests
│   ├── e2e-workflow.test.ts        # End-to-end workflow tests
│   ├── extension.test.ts           # Main extension integration tests
│   ├── performance.test.ts         # Performance and stress tests
│   ├── sidebar.test.ts             # Sidebar provider tests
│   ├── webview-provider.test.ts    # Webview provider tests
│   ├── index.ts                    # Test runner configuration
│   └── test-config.ts              # Test utilities and configuration
├── run-comprehensive-tests.ts      # Comprehensive test runner
├── runTest.ts                      # Standard VS Code test runner
└── README.md                       # This file
```

## Test Categories

### 1. Unit Tests
- **AnalyzerRunner**: Tests for Python analyzer execution and process management
- **CodeLens Provider**: Tests for complexity annotations and CodeLens functionality
- **Sidebar Provider**: Tests for tree view data provider and navigation
- **Webview Provider**: Tests for graph visualization and webview management

### 2. Integration Tests
- **Extension**: Tests for extension activation, command registration, and configuration
- **Context Menu**: Tests for right-click context menu integration

### 3. End-to-End Tests
- **Workflow Tests**: Complete user workflows from project analysis to visualization
- **Framework Support**: Tests for Django, Flask, and FastAPI project structures
- **Error Handling**: Tests for graceful error handling in various scenarios

### 4. Performance Tests
- **Activation Time**: Extension activation performance
- **Large Projects**: Handling of projects with many files
- **Memory Usage**: Memory efficiency with large datasets
- **Concurrent Operations**: Stress testing with multiple simultaneous operations

## Running Tests

### Prerequisites
- Node.js 16.x or higher
- VS Code 1.74.0 or higher
- TypeScript compiler

### Quick Start
```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run comprehensive test suite with detailed reporting
npm run test:comprehensive
```

### Specific Test Categories
```bash
# Run only unit tests
npm run test:unit

# Run only performance tests
npm run test:performance

# Run only end-to-end tests
npm run test:e2e

# Run tests in watch mode (for development)
npm run test:watch
```

### Test Configuration

Tests can be configured using environment variables:

```bash
# Run specific test pattern
TEST_PATTERN='**/performance.test.js' npm test

# Set test timeout (in milliseconds)
TEST_TIMEOUT=60000 npm test

# Enable verbose logging
TEST_VERBOSE=true npm test
```

## Test Utilities

The `test-config.ts` file provides utilities for:

- **TestUtils**: Helper functions for creating mock data and managing test environments
- **TestAssertions**: Custom assertion functions for performance and structure validation
- **TEST_CONFIG**: Configuration constants for timeouts, limits, and thresholds

### Creating Mock Data

```typescript
import { TestUtils } from './test-config';

// Create a temporary workspace
const workspace = TestUtils.createTempWorkspace();

// Create a mock Python project
TestUtils.createMockPythonProject(workspace, 10); // 10 files

// Create a mock Django project
TestUtils.createMockDjangoProject(workspace);

// Clean up
TestUtils.cleanupTempWorkspace(workspace);
```

### Performance Testing

```typescript
import { TestUtils, TestAssertions } from './test-config';

// Measure execution time
const { result, time } = await TestUtils.measureTime(async () => {
    return await someAsyncOperation();
});

// Assert performance requirements
TestAssertions.assertPerformance(time, 5000, 'Operation');
```

## Test Reports

The comprehensive test runner generates detailed reports:

### JSON Report
- Location: `test-report.json`
- Contains: Detailed results, timing, environment info
- Format: Machine-readable JSON

### HTML Report
- Location: `test-report.html`
- Contains: Visual dashboard with charts and detailed results
- Format: Human-readable HTML with styling

### Console Output
- Real-time progress updates
- Summary statistics
- Detailed error information

## Writing New Tests

### Test File Structure
```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import { TestUtils, TestAssertions } from './test-config';

suite('My Test Suite', () => {
    let tempWorkspace: string;

    setup(async () => {
        tempWorkspace = TestUtils.createTempWorkspace();
        // Setup test environment
    });

    teardown(async () => {
        TestUtils.cleanupTempWorkspace(tempWorkspace);
        // Clean up test environment
    });

    test('should do something', async () => {
        // Test implementation
        assert.ok(true);
    });
});
```

### Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up resources in teardown methods
3. **Timeouts**: Use appropriate timeouts for different types of tests
4. **Error Handling**: Test both success and failure scenarios
5. **Performance**: Include performance assertions for critical operations
6. **Mocking**: Use mock data to avoid dependencies on external systems

### Test Categories Guidelines

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions and VS Code API integration
- **E2E Tests**: Test complete user workflows
- **Performance Tests**: Test performance characteristics and limits

## Continuous Integration

The test suite is designed to run in CI environments:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: |
    npm install
    npm run test:comprehensive
    
- name: Upload Test Reports
  uses: actions/upload-artifact@v2
  with:
    name: test-reports
    path: |
      test-report.json
      test-report.html
```

## Debugging Tests

### VS Code Debugging
1. Open VS Code in the extension development workspace
2. Set breakpoints in test files
3. Run "Extension Tests" debug configuration
4. Tests will run with debugger attached

### Console Debugging
```bash
# Run with verbose output
TEST_VERBOSE=true npm test

# Run specific test file
TEST_PATTERN='**/my-test.test.js' npm test

# Run with longer timeout for debugging
TEST_TIMEOUT=300000 npm test
```

## Troubleshooting

### Common Issues

1. **Extension Not Found**: Ensure the extension is properly built (`npm run compile`)
2. **Timeout Errors**: Increase timeout for slow operations or CI environments
3. **File System Errors**: Ensure proper cleanup in teardown methods
4. **VS Code API Errors**: Some APIs may not be available in test environment

### Test Environment Limitations

- Some VS Code APIs may not work in test environment
- File system operations are limited to test directories
- Network operations should be mocked
- UI interactions are limited

## Contributing

When adding new tests:

1. Follow the existing test structure and naming conventions
2. Add appropriate documentation and comments
3. Include both positive and negative test cases
4. Add performance tests for new features
5. Update this README if adding new test categories

## Resources

- [VS Code Extension Testing Guide](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Mocha Testing Framework](https://mochajs.org/)
- [VS Code Extension API](https://code.visualstudio.com/api/references/vscode-api)