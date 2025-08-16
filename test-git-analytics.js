#!/usr/bin/env node

/**
 * Test script for Git Analytics functionality
 * This script tests all three Git analytics commands to ensure they work properly
 */

const { spawn } = require('child_process');
const path = require('path');

function runCommand(command, args) {
    return new Promise((resolve, reject) => {
        console.log(`\n🔄 Running: ${command} ${args.join(' ')}`);
        
        const process = spawn(command, args, {
            stdio: 'pipe',
            cwd: __dirname
        });

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr, code });
            } else {
                reject({ stdout, stderr, code });
            }
        });

        process.on('error', (error) => {
            reject({ error: error.message });
        });
    });
}

async function testGitAnalytics() {
    console.log('🚀 Testing DoraCodeBirdView Git Analytics Commands\n');

    const tests = [
        {
            name: 'Git Author Statistics',
            command: 'python3',
            args: ['analyzer/git_analytics_runner.py', '.', '--author-stats', '--json']
        },
        {
            name: 'Git Module Contributions',
            command: 'python3',
            args: ['analyzer/git_analytics_runner.py', '.', '--module-contributions', '--json']
        },
        {
            name: 'Git Commit Timeline',
            command: 'python3',
            args: ['analyzer/git_analytics_runner.py', '.', '--commit-timeline', '--json']
        }
    ];

    let passedTests = 0;
    let totalTests = tests.length;

    for (const test of tests) {
        try {
            console.log(`\n📊 Testing: ${test.name}`);
            const result = await runCommand(test.command, test.args);
            
            // Parse JSON output to verify it's valid
            const jsonOutput = JSON.parse(result.stdout);
            
            if (jsonOutput.success && jsonOutput.data) {
                console.log(`✅ ${test.name}: PASSED`);
                console.log(`   - Success: ${jsonOutput.success}`);
                console.log(`   - Analysis Type: ${jsonOutput.data.analysis_type}`);
                
                if (jsonOutput.data.repository_info) {
                    console.log(`   - Repository: ${jsonOutput.data.repository_info.name}`);
                    console.log(`   - Total Commits: ${jsonOutput.data.repository_info.total_commits}`);
                    console.log(`   - Contributors: ${jsonOutput.data.repository_info.contributors}`);
                }
                
                if (jsonOutput.data.author_contributions) {
                    console.log(`   - Authors Found: ${jsonOutput.data.author_contributions.length}`);
                }
                
                if (jsonOutput.data.module_statistics) {
                    const moduleCount = Object.keys(jsonOutput.data.module_statistics).length;
                    console.log(`   - Modules Analyzed: ${moduleCount}`);
                }
                
                if (jsonOutput.data.commit_timeline) {
                    const timelineEntries = jsonOutput.data.commit_timeline.timeline_entries || jsonOutput.data.commit_timeline;
                    const entryCount = Array.isArray(timelineEntries) ? timelineEntries.length : 0;
                    console.log(`   - Timeline Entries: ${entryCount}`);
                }
                
                passedTests++;
            } else {
                console.log(`❌ ${test.name}: FAILED - Invalid response structure`);
                console.log(`   - Success: ${jsonOutput.success}`);
                if (jsonOutput.errors && jsonOutput.errors.length > 0) {
                    console.log(`   - Errors: ${jsonOutput.errors.map(e => e.message || e).join(', ')}`);
                }
            }
        } catch (error) {
            console.log(`❌ ${test.name}: FAILED`);
            if (error.stdout) {
                console.log(`   - Exit Code: ${error.code}`);
                console.log(`   - Error: ${error.stderr}`);
                
                // Try to parse partial JSON output
                try {
                    const jsonOutput = JSON.parse(error.stdout);
                    if (jsonOutput.errors) {
                        console.log(`   - Analysis Errors: ${jsonOutput.errors.map(e => e.message || e).join(', ')}`);
                    }
                } catch (parseError) {
                    console.log(`   - Raw Output: ${error.stdout.substring(0, 200)}...`);
                }
            } else {
                console.log(`   - Error: ${error.error || error.message || error}`);
            }
        }
    }

    console.log(`\n📈 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All Git Analytics tests passed! The commands are working correctly.');
        return true;
    } else {
        console.log('⚠️  Some Git Analytics tests failed. Please check the errors above.');
        return false;
    }
}

// Run the tests
testGitAnalytics()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('💥 Test runner failed:', error);
        process.exit(1);
    });