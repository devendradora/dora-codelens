import * as path from 'path';

const mocha = require('mocha');

export function run(): Promise<void> {
    // Create the mocha test
    const mochaInstance = new mocha({
        ui: 'tdd',
        color: true
    });

    const testsRoot = path.resolve(__dirname, '..');

    return new Promise((c, e) => {
        try {
            // For now, just add the extension test file directly
            mochaInstance.addFile(path.resolve(testsRoot, 'suite/extension.test.js'));

            // Run the mocha test
            mochaInstance.run((failures: number) => {
                if (failures > 0) {
                    e(new Error(`${failures} tests failed.`));
                } else {
                    c();
                }
            });
        } catch (err) {
            console.error(err);
            e(err);
        }
    });
}