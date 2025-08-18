#!/usr/bin/env node
"use strict";
/**
 * Comprehensive test runner for DoraCodeBirdView extension
 * This script runs all test suites and generates a detailed report
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComprehensiveTestRunner = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const test_electron_1 = require("@vscode/test-electron");
class ComprehensiveTestRunner {
    constructor() {
        this.results = [];
        this.startTime = 0;
    }
    async run() {
        console.log('🚀 Starting comprehensive test suite for DoraCodeBirdView extension...\n');
        this.startTime = Date.now();
        // Test suites to run
        const testSuites = [
            { name: 'Unit Tests', pattern: '**/*.test.js' },
            { name: 'Integration Tests', pattern: '**/extension.test.js' },
            { name: 'Component Tests', pattern: '**/{codelens,sidebar,context-menu,analyzer-runner,webview-provider}.test.js' },
            { name: 'End-to-End Tests', pattern: '**/e2e-workflow.test.js' },
            { name: 'Performance Tests', pattern: '**/performance.test.js' }
        ];
        // Run each test suite
        for (const suite of testSuites) {
            await this.runTestSuite(suite.name, suite.pattern);
        }
        // Generate and display report
        this.generateReport();
    }
    async runTestSuite(suiteName, pattern) {
        console.log(`📋 Running ${suiteName}...`);
        const suiteStartTime = Date.now();
        try {
            // The folder containing the Extension Manifest package.json
            const extensionDevelopmentPath = path.resolve(__dirname, '../../../');
            // The path to test runner
            const extensionTestsPath = path.resolve(__dirname, './suite/index');
            // Set environment variable to filter tests if needed
            process.env.TEST_PATTERN = pattern;
            // Run the tests
            await (0, test_electron_1.runTests)({
                extensionDevelopmentPath,
                extensionTestsPath,
                launchArgs: [
                    '--disable-extensions',
                    '--disable-workspace-trust' // Disable workspace trust for tests
                ]
            });
            const duration = Date.now() - suiteStartTime;
            this.results.push({
                suite: suiteName,
                passed: true,
                duration
            });
            console.log(`✅ ${suiteName} passed (${duration}ms)\n`);
        }
        catch (error) {
            const duration = Date.now() - suiteStartTime;
            this.results.push({
                suite: suiteName,
                passed: false,
                duration,
                error: error instanceof Error ? error.message : String(error)
            });
            console.log(`❌ ${suiteName} failed (${duration}ms)`);
            console.log(`   Error: ${error}\n`);
        }
    }
    generateReport() {
        const totalDuration = Date.now() - this.startTime;
        const passedSuites = this.results.filter(r => r.passed).length;
        const failedSuites = this.results.filter(r => !r.passed).length;
        const report = {
            timestamp: new Date().toISOString(),
            totalSuites: this.results.length,
            passedSuites,
            failedSuites,
            totalDuration,
            results: this.results,
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch
            }
        };
        // Display summary
        console.log('📊 Test Summary');
        console.log('================');
        console.log(`Total Suites: ${report.totalSuites}`);
        console.log(`Passed: ${passedSuites} ✅`);
        console.log(`Failed: ${failedSuites} ❌`);
        console.log(`Total Duration: ${totalDuration}ms`);
        console.log(`Success Rate: ${((passedSuites / report.totalSuites) * 100).toFixed(1)}%`);
        // Display detailed results
        console.log('\n📋 Detailed Results');
        console.log('===================');
        this.results.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.suite} (${result.duration}ms)`);
            if (!result.passed && result.error) {
                console.log(`   Error: ${result.error}`);
            }
        });
        // Save report to file
        const reportPath = path.join(__dirname, '../../../test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
        // Generate HTML report
        this.generateHtmlReport(report);
        // Exit with appropriate code
        if (failedSuites > 0) {
            console.log('\n❌ Some tests failed. Please check the results above.');
            process.exit(1);
        }
        else {
            console.log('\n🎉 All tests passed successfully!');
            process.exit(0);
        }
    }
    generateHtmlReport(report) {
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DoraCodeBirdView Test Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        .metric {
            text-align: center;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .metric-label {
            color: #666;
            font-size: 0.9em;
        }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .results {
            padding: 30px;
        }
        .result-item {
            display: flex;
            align-items: center;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 6px;
            background: #f8f9fa;
        }
        .result-item.passed {
            border-left: 4px solid #28a745;
        }
        .result-item.failed {
            border-left: 4px solid #dc3545;
        }
        .result-status {
            font-size: 1.2em;
            margin-right: 15px;
        }
        .result-name {
            flex: 1;
            font-weight: 500;
        }
        .result-duration {
            color: #666;
            font-size: 0.9em;
        }
        .error {
            margin-top: 10px;
            padding: 10px;
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 4px;
            color: #721c24;
            font-family: monospace;
            font-size: 0.9em;
        }
        .environment {
            padding: 30px;
            background: #f8f9fa;
            border-top: 1px solid #dee2e6;
        }
        .environment h3 {
            margin-top: 0;
        }
        .env-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        .env-item {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            background: white;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>DoraCodeBirdView Test Report</h1>
            <p>Generated on ${new Date(report.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value">${report.totalSuites}</div>
                <div class="metric-label">Total Suites</div>
            </div>
            <div class="metric">
                <div class="metric-value passed">${report.passedSuites}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value failed">${report.failedSuites}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${((report.passedSuites / report.totalSuites) * 100).toFixed(1)}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">${(report.totalDuration / 1000).toFixed(1)}s</div>
                <div class="metric-label">Total Duration</div>
            </div>
        </div>
        
        <div class="results">
            <h2>Test Results</h2>
            ${report.results.map(result => `
                <div class="result-item ${result.passed ? 'passed' : 'failed'}">
                    <div class="result-status">${result.passed ? '✅' : '❌'}</div>
                    <div class="result-name">${result.suite}</div>
                    <div class="result-duration">${result.duration}ms</div>
                </div>
                ${result.error ? `<div class="error">${result.error}</div>` : ''}
            `).join('')}
        </div>
        
        <div class="environment">
            <h3>Environment Information</h3>
            <div class="env-grid">
                <div class="env-item">
                    <span>Node Version:</span>
                    <span>${report.environment.nodeVersion}</span>
                </div>
                <div class="env-item">
                    <span>Platform:</span>
                    <span>${report.environment.platform}</span>
                </div>
                <div class="env-item">
                    <span>Architecture:</span>
                    <span>${report.environment.arch}</span>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
        `;
        const htmlPath = path.join(__dirname, '../../../test-report.html');
        fs.writeFileSync(htmlPath, htmlContent);
        console.log(`📄 HTML report saved to: ${htmlPath}`);
    }
}
exports.ComprehensiveTestRunner = ComprehensiveTestRunner;
// Run the comprehensive test suite
if (require.main === module) {
    const runner = new ComprehensiveTestRunner();
    runner.run().catch(error => {
        console.error('❌ Test runner failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=run-comprehensive-tests.js.map