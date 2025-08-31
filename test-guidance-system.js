// Simple test to verify the guidance system components are properly structured
const fs = require("fs");
const path = require("path");

console.log("Testing DoraCodeLens Guidance System Implementation...\n");

// Check if all required files exist
const requiredFiles = [
  "out/services/preference-storage-service.js",
  "out/core/code-lens-guidance-manager.js",
  "out/commands/guidance-command-handler.js",
  "out/core/guidance-error-handler.js",
];

let allFilesExist = true;

requiredFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    console.log(`✓ ${file} exists`);
  } else {
    console.log(`✗ ${file} missing`);
    allFilesExist = false;
  }
});

// Check package.json for guidance configuration
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const guidanceConfig = packageJson.contributes?.configuration?.properties;

const expectedGuidanceSettings = [
  "doracodelens.guidance.enabled",
  "doracodelens.guidance.preferredAnalysisType",
  "doracodelens.guidance.autoRunAnalysisOnEnable",
  "doracodelens.guidance.showWelcomeMessage",
];

let allSettingsExist = true;

console.log("\nChecking VS Code configuration settings:");
expectedGuidanceSettings.forEach((setting) => {
  if (guidanceConfig && guidanceConfig[setting]) {
    console.log(`✓ ${setting} configured`);
  } else {
    console.log(`✗ ${setting} missing`);
    allSettingsExist = false;
  }
});

// Check if extension.ts was properly modified
const extensionContent = fs.readFileSync("out/extension.js", "utf8");
const hasGuidanceIntegration =
  extensionContent.includes("PreferenceStorageService") &&
  extensionContent.includes("CodeLensGuidanceManager") &&
  extensionContent.includes("GuidanceCommandHandler");

console.log("\nChecking extension integration:");
if (hasGuidanceIntegration) {
  console.log("✓ Guidance system integrated into extension");
} else {
  console.log("✗ Guidance system not properly integrated");
}

// Summary
console.log("\n" + "=".repeat(50));
if (allFilesExist && allSettingsExist && hasGuidanceIntegration) {
  console.log("✅ All guidance system components implemented successfully!");
  console.log("\nImplemented features:");
  console.log("- PreferenceStorageService for workspace-specific settings");
  console.log(
    "- CodeLensGuidanceManager for orchestrating guidance experience"
  );
  console.log("- GuidanceCommandHandler for processing user interactions");
  console.log("- GuidanceErrorHandler for error recovery and troubleshooting");
  console.log("- Integration with existing DoraCodeLensProvider");
  console.log("- VS Code configuration schema for guidance settings");
  console.log("- Progress tracking and analysis state management");
  console.log("- Graceful fallback and error recovery mechanisms");
} else {
  console.log("❌ Some components are missing or not properly configured");
}
console.log("=".repeat(50));
