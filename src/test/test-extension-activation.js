// Test to verify extension activation and command registration
const fs = require('fs');

console.log('Testing DoraCodeLens Extension Activation...\n');

// Check if compiled files exist
const compiledFiles = [
    'out/extension.js',
    'out/commands/guidance-command-handler.js',
    'out/core/code-lens-guidance-manager.js',
    'out/services/preference-storage-service.js',
    'out/core/guidance-error-handler.js'
];

let allCompiledFilesExist = true;

console.log('Checking compiled files:');
compiledFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✓ ${file} exists`);
    } else {
        console.log(`✗ ${file} missing`);
        allCompiledFilesExist = false;
    }
});

// Check extension.js for proper imports and initialization
console.log('\nChecking extension.js for guidance system integration:');
const extensionContent = fs.readFileSync('out/extension.js', 'utf8');

const requiredIntegrations = [
    'PreferenceStorageService',
    'CodeLensGuidanceManager', 
    'GuidanceCommandHandler',
    'setGuidanceManager',
    'registerGuidanceManager'
];

let allIntegrationsPresent = true;

requiredIntegrations.forEach(integration => {
    if (extensionContent.includes(integration)) {
        console.log(`✓ ${integration} integrated`);
    } else {
        console.log(`✗ ${integration} missing`);
        allIntegrationsPresent = false;
    }
});

// Check for command registration patterns
console.log('\nChecking command registration patterns:');
const commandPatterns = [
    'doracodelens.guidance.showWelcome',
    'doracodelens.guidance.analyzeCurrentFile',
    'doracodelens.guidance.analyzeFullProject',
    'doracodelens.guidance.changePreferences'
];

let commandsRegistered = true;
const guidanceHandlerContent = fs.readFileSync('out/commands/guidance-command-handler.js', 'utf8');

commandPatterns.forEach(command => {
    if (guidanceHandlerContent.includes(command)) {
        console.log(`✓ ${command} command registered`);
    } else {
        console.log(`✗ ${command} command missing`);
        commandsRegistered = false;
    }
});

// Summary
console.log('\n' + '='.repeat(60));
if (allCompiledFilesExist && allIntegrationsPresent && commandsRegistered) {
    console.log('✅ Extension activation should work correctly!');
    console.log('\nThe guidance system is properly integrated:');
    console.log('- All compiled files are present');
    console.log('- Extension properly imports guidance components');
    console.log('- Commands are registered in guidance handler');
    console.log('- Integration points are connected');
    console.log('\nIf you\'re still seeing command registration errors,');
    console.log('try reloading the VS Code window or restarting VS Code.');
} else {
    console.log('❌ There may be issues with extension activation');
    console.log('\nMissing components:');
    if (!allCompiledFilesExist) console.log('- Some compiled files are missing');
    if (!allIntegrationsPresent) console.log('- Some integrations are not present');
    if (!commandsRegistered) console.log('- Some commands are not registered');
}
console.log('='.repeat(60));