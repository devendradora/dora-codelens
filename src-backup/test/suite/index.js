"use strict";
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
exports.run = void 0;
const path = __importStar(require("path"));
const glob = __importStar(require("glob"));
const mocha = require('mocha');
function run() {
    // Create the mocha test
    const mochaInstance = new mocha({
        ui: 'tdd',
        color: true,
        timeout: 30000,
        slow: 5000,
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
            mochaInstance.run((failures) => {
                if (failures > 0) {
                    console.error(`${failures} test(s) failed.`);
                    e(new Error(`${failures} tests failed.`));
                }
                else {
                    console.log('All tests passed!');
                    c();
                }
            });
        }
        catch (err) {
            console.error('Error setting up tests:', err);
            e(err);
        }
    });
}
exports.run = run;
//# sourceMappingURL=index.js.map