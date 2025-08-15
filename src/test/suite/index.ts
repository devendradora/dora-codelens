import * as path from 'path';
import * as glob from 'glob';

const mocha = require('mocha');

export function run(): Promise<void> {
    // Create the mocha test
    const mochaInstance = new mocha({
        ui: 'tdd',
        color: true,
        timeout: 30000, // Increased timeout for comprehensive tests including performance tests
        slow: 5000, // Mark tests as slow if they take more than 5 seconds
        reporter: 'spec' // Use spec reporter for better output
    });

    const testsRoot = path.resolve(__dirname, '..');

    return new Promise((c, e) => {
        try {
            // Add all test files in the suite directory
            const testFiles = glob.sync('**/**.test.js', { cwd: path.resolve(testsRoot, 'suite') });
            
            // Sort test files to ensure consistent execution order
            testFiles.sort();
            
            console.log(`Found ${testFiles.length} test files:`);
            testFiles.forEach(file => {
                console.log(`  - ${file}`);
                mochaInstance.addFile(path.resolve(testsRoot, 'suite', file));
            });

            // Run the mocha test
            mochaInstance.run((failures: number) => {
                if (failures > 0) {
                    console.error(`${failures} test(s) failed.`);
                    e(new Error(`${failures} tests failed.`));
                } else {
                    console.log('All tests passed!');
                    c();
                }
            });
        } catch (err) {
            console.error('Error setting up tests:', err);
            e(err);
        }
    });
}