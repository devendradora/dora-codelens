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
exports.AnalyzerRunner = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
/**
 * Class responsible for executing the Python analyzer script
 */
class AnalyzerRunner {
    constructor(outputChannel, extensionPath) {
        this.outputChannel = outputChannel;
        this.extensionPath = extensionPath;
        this.currentProcess = null;
        this.cancellationToken = null;
    }
    /**
     * Run database schema analysis
     */
    async analyzeDatabaseSchema(options, progress, token) {
        const result = await this.executeAnalyzer({
            ...options,
            analysisType: "db_schema",
        }, progress, token);
        return result;
    }
    /**
     * Run tech stack analysis
     */
    async analyzeTechStack(options, progress, token) {
        const result = await this.executeAnalyzer({
            ...options,
            analysisType: "tech_stack",
        }, progress, token);
        return result;
    }
    /**
     * Execute the Python analyzer with given options
     */
    async executeAnalyzer(options, progress, token) {
        // Handle both calling patterns:
        // 1. From analyzeTechStack/analyzeDatabaseSchema with analysisType
        // 2. From runAnalysis with pythonPath, analyzerPath, args
        let pythonPath;
        let scriptPath;
        let args;
        let workingDir;
        if (options.pythonPath && options.analyzerPath && options.args) {
            // Called from runAnalysis
            pythonPath = options.pythonPath;
            scriptPath = options.analyzerPath;
            args = [scriptPath, ...options.args];
            workingDir = path.dirname(scriptPath);
        }
        else {
            // Called from analyzeTechStack/analyzeDatabaseSchema
            pythonPath = await this.getPythonPath();
            const analyzerDir = path.join(this.extensionPath, "analyzer");
            scriptPath = path.join(analyzerDir, "analyzer.py");
            args = [scriptPath, options.projectPath];
            workingDir = analyzerDir;
        }
        if (!fs.existsSync(scriptPath)) {
            throw new Error(`Analyzer script not found at ${scriptPath}`);
        }
        if (progress) {
            progress.report({
                message: `Running ${options.analysisType || "project"} analysis...`,
            });
        }
        return new Promise((resolve, reject) => {
            this.currentProcess = (0, child_process_1.spawn)(pythonPath, args, {
                cwd: workingDir,
                env: { ...process.env },
            });
            let stdout = "";
            let stderr = "";
            this.currentProcess.stdout?.on("data", (data) => {
                stdout += data.toString();
                this.outputChannel.appendLine(data.toString());
            });
            this.currentProcess.stderr?.on("data", (data) => {
                stderr += data.toString();
                this.outputChannel.appendLine(`[ERROR] ${data.toString()}`);
            });
            this.currentProcess.on("error", (error) => {
                this.outputChannel.appendLine(`Failed to start analyzer: ${error.message}`);
                reject(error);
            });
            this.currentProcess.on("close", (code) => {
                if (code !== 0) {
                    reject(new Error(`Analyzer exited with code ${code}: ${stderr}`));
                    return;
                }
                try {
                    const result = JSON.parse(stdout);
                    resolve({
                        success: true,
                        data: result,
                        executionTime: result.executionTime,
                    });
                }
                catch (error) {
                    reject(new Error(`Failed to parse analyzer output: ${error}`));
                }
            });
            if (token) {
                token.onCancellationRequested(() => {
                    if (this.currentProcess) {
                        this.currentProcess.kill();
                    }
                });
            }
        });
    }
    /**
     * Execute the Python analyzer on the specified project
     */
    async runAnalysis(options, progress, cancellationToken) {
        const startTime = Date.now();
        try {
            // Validate inputs
            await this.validateOptions(options);
            // Set up cancellation
            this.cancellationToken = new vscode.CancellationTokenSource();
            if (cancellationToken) {
                cancellationToken.onCancellationRequested(() => {
                    this.cancelAnalysis();
                });
            }
            // Update progress
            progress?.report({ message: "Preparing analysis...", increment: 10 });
            // Get Python path
            const pythonPath = await this.getPythonPath(options.pythonPath);
            // Get analyzer script path
            const analyzerPath = this.getAnalyzerScriptPath();
            // Prepare command arguments
            const args = this.buildAnalyzerArguments(options);
            this.log(`Starting Python analyzer: ${pythonPath} ${analyzerPath} ${args.join(" ")}`);
            // Update progress
            progress?.report({ message: "Running analysis...", increment: 20 });
            // Execute the analyzer
            const result = await this.executeAnalyzer({
                ...options,
                pythonPath,
                analyzerPath,
                args,
            }, progress);
            // Calculate execution time
            const executionTime = Date.now() - startTime;
            result.executionTime = executionTime;
            this.log(`Analysis completed in ${executionTime}ms`);
            return result;
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            this.logError("Analysis failed", error);
            return {
                success: false,
                errors: [
                    {
                        type: "execution_error",
                        message: error instanceof Error ? error.message : "Unknown error occurred",
                    },
                ],
                executionTime,
            };
        }
        finally {
            this.cleanup();
        }
    }
    /**
     * Execute current file analysis on the specified Python file
     */
    async runCurrentFileAnalysis(filePath, progress, cancellationToken) {
        const startTime = Date.now();
        try {
            // Validate file path
            if (!fs.existsSync(filePath)) {
                throw new Error(`File does not exist: ${filePath}`);
            }
            if (!filePath.endsWith(".py")) {
                throw new Error(`File is not a Python file: ${filePath}`);
            }
            // Set up cancellation
            this.cancellationToken = new vscode.CancellationTokenSource();
            if (cancellationToken) {
                cancellationToken.onCancellationRequested(() => {
                    this.cancelAnalysis();
                });
            }
            // Update progress
            progress?.report({
                message: "Preparing file analysis...",
                increment: 10,
            });
            // Get Python path
            const pythonPath = await this.getPythonPath();
            // Get current file analyzer script path
            const analyzerPath = this.getCurrentFileAnalyzerScriptPath();
            // Prepare command arguments
            const args = [filePath];
            this.log(`Starting current file analysis: ${pythonPath} ${analyzerPath} ${args.join(" ")}`);
            // Update progress
            progress?.report({ message: "Analyzing file...", increment: 30 });
            // Execute the analyzer
            const result = await this.executeCurrentFileAnalyzer(pythonPath, analyzerPath, args, progress);
            // Calculate execution time
            const executionTime = Date.now() - startTime;
            result.executionTime = executionTime;
            this.log(`Current file analysis completed in ${executionTime}ms`);
            return result;
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            this.logError("Current file analysis failed", error);
            return {
                success: false,
                errors: [
                    {
                        type: "execution_error",
                        message: error instanceof Error ? error.message : "Unknown error occurred",
                    },
                ],
                executionTime,
            };
        }
        finally {
            this.cleanup();
        }
    }
    /**
     * Execute Git analysis on the specified project
     */
    async runGitAnalysis(options, progress, cancellationToken) {
        const startTime = Date.now();
        try {
            // Validate project path
            if (!fs.existsSync(options.projectPath)) {
                throw new Error(`Project path does not exist: ${options.projectPath}`);
            }
            // Check if it's a Git repository
            const gitDir = path.join(options.projectPath, ".git");
            if (!fs.existsSync(gitDir)) {
                throw new Error("This workspace is not a Git repository. Git analytics require a Git repository.");
            }
            // Set up cancellation
            this.cancellationToken = new vscode.CancellationTokenSource();
            if (cancellationToken) {
                cancellationToken.onCancellationRequested(() => {
                    this.cancelAnalysis();
                });
            }
            // Update progress
            progress?.report({ message: "Preparing Git analysis...", increment: 10 });
            // Get Python path
            const pythonPath = await this.getPythonPath();
            // Get Git analyzer script path
            const analyzerPath = this.getGitAnalyzerScriptPath();
            // Prepare command arguments based on analysis type
            const args = this.buildGitAnalyzerArguments(options);
            this.log(`Starting Git analysis: ${pythonPath} ${analyzerPath} ${args.join(" ")}`);
            // Update progress
            progress?.report({ message: "Running Git analysis...", increment: 30 });
            // Execute the Git analyzer
            const result = await this.executeGitAnalyzer(pythonPath, analyzerPath, args, options, progress);
            // Calculate execution time
            const executionTime = Date.now() - startTime;
            result.executionTime = executionTime;
            this.log(`Git analysis completed in ${executionTime}ms`);
            return result;
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            this.logError("Git analysis failed", error);
            return {
                success: false,
                errors: [
                    {
                        type: "git_error",
                        message: error instanceof Error ? error.message : "Unknown error occurred",
                    },
                ],
                executionTime,
            };
        }
        finally {
            this.cleanup();
        }
    }
    /**
     * Cancel the currently running analysis
     */
    cancelAnalysis() {
        if (this.currentProcess) {
            this.log("Cancelling analysis...");
            this.currentProcess.kill("SIGTERM");
            this.currentProcess = null;
        }
        if (this.cancellationToken) {
            this.cancellationToken.cancel();
            this.cancellationToken = null;
        }
    }
    /**
     * Validate analyzer options
     */
    async validateOptions(options) {
        // Check if project path exists
        if (!fs.existsSync(options.projectPath)) {
            throw new Error(`Project path does not exist: ${options.projectPath}`);
        }
        // Check if project path is a directory
        const stats = fs.statSync(options.projectPath);
        if (!stats.isDirectory()) {
            throw new Error(`Project path is not a directory: ${options.projectPath}`);
        }
        // Check if project contains Python files
        const pythonFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(options.projectPath, "**/*.py"), "**/node_modules/**", 1);
        if (pythonFiles.length === 0) {
            throw new Error("No Python files found in the project");
        }
    }
    /**
     * Get the Python executable path
     */
    async getPythonPath(configuredPath) {
        // Use configured path if provided
        if (configuredPath) {
            if (await this.validatePythonPath(configuredPath)) {
                return configuredPath;
            }
            else {
                this.log(`Configured Python path is invalid: ${configuredPath}`);
            }
        }
        // Try to get Python path from VS Code Python extension
        try {
            const pythonExtension = vscode.extensions.getExtension("ms-python.python");
            if (pythonExtension && pythonExtension.isActive) {
                const pythonApi = pythonExtension.exports;
                if (pythonApi &&
                    pythonApi.settings &&
                    pythonApi.settings.getExecutionDetails) {
                    const executionDetails = pythonApi.settings.getExecutionDetails();
                    if (executionDetails && executionDetails.execCommand) {
                        const pythonPath = Array.isArray(executionDetails.execCommand)
                            ? executionDetails.execCommand[0]
                            : executionDetails.execCommand;
                        if (await this.validatePythonPath(pythonPath)) {
                            this.log(`Using Python path from Python extension: ${pythonPath}`);
                            return pythonPath;
                        }
                    }
                }
            }
        }
        catch (error) {
            this.log("Could not get Python path from Python extension");
        }
        // Fall back to common Python commands
        const commonPythonCommands = ["python3", "python", "py"];
        for (const command of commonPythonCommands) {
            if (await this.validatePythonPath(command)) {
                this.log(`Using Python command: ${command}`);
                return command;
            }
        }
        throw new Error("Python executable not found. Please install Python or configure the Python path in settings.");
    }
    /**
     * Validate that a Python path is executable
     */
    async validatePythonPath(pythonPath) {
        return new Promise((resolve) => {
            const process = (0, child_process_1.spawn)(pythonPath, ["--version"], { stdio: "pipe" });
            let stderr = "";
            process.stderr?.on("data", (data) => {
                stderr += data.toString();
            });
            process.on("close", (code) => {
                if (code === 0) {
                    resolve(true);
                }
                else {
                    this.log(`Python validation failed for ${pythonPath}: exit code ${code}, stderr: ${stderr}`);
                    resolve(false);
                }
            });
            process.on("error", (error) => {
                this.log(`Python validation error for ${pythonPath}: ${error.message}`);
                resolve(false);
            });
            // Timeout after 5 seconds
            setTimeout(() => {
                this.log(`Python validation timeout for ${pythonPath}`);
                process.kill();
                resolve(false);
            }, 5000);
        });
    }
    /**
     * Get the path to the analyzer script
     */
    getAnalyzerScriptPath() {
        const analyzerPath = path.join(this.extensionPath, "analyzer", "analyzer.py");
        if (!fs.existsSync(analyzerPath)) {
            throw new Error(`Analyzer script not found at: ${analyzerPath}`);
        }
        return analyzerPath;
    }
    /**
     * Get the path to the current file analyzer script
     */
    getCurrentFileAnalyzerScriptPath() {
        const analyzerPath = path.join(this.extensionPath, "analyzer", "current_file_analyzer.py");
        if (!fs.existsSync(analyzerPath)) {
            throw new Error(`Current file analyzer script not found at: ${analyzerPath}`);
        }
        return analyzerPath;
    }
    /**
     * Get the path to the Git analyzer script
     */
    getGitAnalyzerScriptPath() {
        const analyzerPath = path.join(this.extensionPath, "analyzer", "git_analytics_runner.py");
        if (!fs.existsSync(analyzerPath)) {
            throw new Error(`Git analyzer script not found at: ${analyzerPath}`);
        }
        return analyzerPath;
    }
    /**
     * Build command line arguments for the analyzer
     */
    buildAnalyzerArguments(options) {
        // The current analyzer.py only accepts a single project path argument
        return [options.projectPath];
    }
    /**
     * Build command line arguments for the Git analyzer
     */
    buildGitAnalyzerArguments(options) {
        const args = [options.projectPath];
        // Add analysis type flag
        switch (options.analysisType) {
            case "git_author_statistics":
                args.push("--author-stats");
                break;
            case "git_module_contributions":
                args.push("--module-contributions");
                break;
            case "git_commit_timeline":
                args.push("--commit-timeline");
                break;
            default:
                args.push("--full-analysis");
        }
        // Add JSON output flag
        args.push("--json");
        return args;
    }
    // Removed duplicate executeAnalyzer implementation
    /**
     * Parse and validate analyzer JSON output
     */
    parseAndValidateAnalyzerOutput(stdout) {
        // Clean up the output - remove any non-JSON content
        const cleanOutput = this.cleanAnalyzerOutput(stdout);
        // Parse JSON
        let parsedResult;
        try {
            parsedResult = JSON.parse(cleanOutput);
        }
        catch (error) {
            throw new Error(`Invalid JSON output from analyzer: ${error instanceof Error ? error.message : error}`);
        }
        // Validate the structure
        const validationResult = this.validateAnalyzerOutput(parsedResult);
        if (!validationResult.isValid) {
            this.log(`Analyzer output validation warnings: ${validationResult.warnings.join(", ")}`);
        }
        // Convert to AnalysisResult format
        return {
            success: parsedResult.success !== false,
            data: parsedResult,
            errors: parsedResult.errors || [],
            warnings: parsedResult.warnings || [],
            executionTime: 0, // Will be set by caller
        };
    }
    /**
     * Clean analyzer output to extract JSON
     */
    cleanAnalyzerOutput(output) {
        // Find the JSON content - look for the first { and last }
        const firstBrace = output.indexOf("{");
        const lastBrace = output.lastIndexOf("}");
        if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
            throw new Error("No valid JSON found in analyzer output");
        }
        return output.substring(firstBrace, lastBrace + 1);
    }
    /**
     * Validate analyzer output structure
     */
    validateAnalyzerOutput(data) {
        const warnings = [];
        let isValid = true;
        // Check for required top-level properties
        if (!data.tech_stack) {
            warnings.push("Missing tech_stack data");
        }
        if (!data.modules) {
            warnings.push("Missing modules data");
        }
        else {
            // Validate modules structure
            if (!data.modules.nodes || !Array.isArray(data.modules.nodes)) {
                warnings.push("Invalid modules.nodes structure");
            }
            if (!data.modules.edges || !Array.isArray(data.modules.edges)) {
                warnings.push("Invalid modules.edges structure");
            }
        }
        if (!data.functions) {
            warnings.push("Missing functions data");
        }
        else {
            // Validate functions structure
            if (!data.functions.nodes || !Array.isArray(data.functions.nodes)) {
                warnings.push("Invalid functions.nodes structure");
            }
            if (!data.functions.edges || !Array.isArray(data.functions.edges)) {
                warnings.push("Invalid functions.edges structure");
            }
        }
        // Validate individual module nodes
        if (data.modules && data.modules.nodes) {
            data.modules.nodes.forEach((node, index) => {
                if (!node.id && !node.name) {
                    warnings.push(`Module node ${index} missing id/name`);
                }
                if (!node.path) {
                    warnings.push(`Module node ${index} missing path`);
                }
            });
        }
        // Validate individual function nodes
        if (data.functions && data.functions.nodes) {
            data.functions.nodes.forEach((node, index) => {
                if (!node.id) {
                    warnings.push(`Function node ${index} missing id`);
                }
                if (!node.name) {
                    warnings.push(`Function node ${index} missing name`);
                }
                if (!node.module) {
                    warnings.push(`Function node ${index} missing module`);
                }
            });
        }
        return { isValid, warnings };
    }
    /**
     * Execute the current file analyzer process
     */
    async executeCurrentFileAnalyzer(pythonPath, analyzerPath, args, progress) {
        return new Promise((resolve, reject) => {
            const timeout = 60000; // 1 minute for single file analysis
            let stdout = "";
            let stderr = "";
            // Spawn the Python process
            this.currentProcess = (0, child_process_1.spawn)(pythonPath, [analyzerPath, ...args], {
                stdio: "pipe",
            });
            // Set up timeout
            const timeoutId = setTimeout(() => {
                if (this.currentProcess) {
                    this.currentProcess.kill("SIGTERM");
                    reject(new Error(`Current file analysis timed out after ${timeout}ms`));
                }
            }, timeout);
            // Handle stdout
            this.currentProcess.stdout?.on("data", (data) => {
                const output = data.toString();
                stdout += output;
                // Update progress for current file analysis
                if (output.includes("complexity")) {
                    progress?.report({
                        message: "Analyzing complexity...",
                        increment: 50,
                    });
                }
                else if (output.includes("dependencies")) {
                    progress?.report({
                        message: "Analyzing dependencies...",
                        increment: 70,
                    });
                }
                else if (output.includes("framework")) {
                    progress?.report({
                        message: "Detecting frameworks...",
                        increment: 90,
                    });
                }
            });
            // Handle stderr
            this.currentProcess.stderr?.on("data", (data) => {
                stderr += data.toString();
            });
            // Handle process completion
            this.currentProcess.on("close", (code) => {
                clearTimeout(timeoutId);
                this.currentProcess = null;
                if (code === 0 || (code === 1 && stdout.trim())) {
                    try {
                        // Parse JSON output
                        const result = this.parseCurrentFileAnalyzerOutput(stdout);
                        progress?.report({ message: "Analysis complete", increment: 100 });
                        if (code === 1) {
                            this.log(`Current file analyzer completed with warnings/errors but produced valid output`);
                        }
                        resolve(result);
                    }
                    catch (parseError) {
                        this.logError("Failed to parse current file analyzer output", parseError);
                        reject(new Error(`Failed to parse current file analyzer output: ${parseError instanceof Error ? parseError.message : parseError}`));
                    }
                }
                else {
                    const errorMessage = `Current file analyzer process exited with code ${code}`;
                    this.logError(errorMessage, new Error(stderr));
                    reject(new Error(`${errorMessage}. Error: ${stderr}`));
                }
            });
            // Handle process errors
            this.currentProcess.on("error", (error) => {
                clearTimeout(timeoutId);
                this.currentProcess = null;
                let errorMessage = `Failed to start current file analyzer process: ${error.message}`;
                if (error.message.includes("ENOENT")) {
                    errorMessage = `Python executable not found. Please check your Python installation and path configuration.`;
                }
                else if (error.message.includes("EACCES")) {
                    errorMessage = `Permission denied when trying to execute Python. Please check file permissions.`;
                }
                this.logError("Current file analyzer process spawn error", error);
                reject(new Error(errorMessage));
            });
        });
    }
    /**
     * Parse current file analyzer JSON output
     */
    parseCurrentFileAnalyzerOutput(stdout) {
        // Clean up the output - remove any non-JSON content
        const cleanOutput = this.cleanAnalyzerOutput(stdout);
        // Parse JSON
        let parsedResult;
        try {
            parsedResult = JSON.parse(cleanOutput);
        }
        catch (error) {
            throw new Error(`Invalid JSON output from current file analyzer: ${error instanceof Error ? error.message : error}`);
        }
        // Convert to AnalysisResult format
        return {
            success: parsedResult.success !== false,
            data: parsedResult,
            errors: parsedResult.errors || [],
            warnings: parsedResult.warnings || [],
            executionTime: 0, // Will be set by caller
        };
    }
    /**
     * Execute the Git analyzer process
     */
    async executeGitAnalyzer(pythonPath, analyzerPath, args, options, progress) {
        return new Promise((resolve, reject) => {
            const timeout = options.timeout || 180000; // 3 minutes default for Git analysis
            let stdout = "";
            let stderr = "";
            // Spawn the Python process
            this.currentProcess = (0, child_process_1.spawn)(pythonPath, [analyzerPath, ...args], {
                cwd: options.projectPath,
                stdio: "pipe",
            });
            // Set up timeout
            const timeoutId = setTimeout(() => {
                if (this.currentProcess) {
                    this.currentProcess.kill("SIGTERM");
                    reject(new Error(`Git analysis timed out after ${timeout}ms`));
                }
            }, timeout);
            // Handle stdout
            this.currentProcess.stdout?.on("data", (data) => {
                const output = data.toString();
                stdout += output;
                // Look for progress indicators in output
                if (output.includes("Analyzing Git repository...")) {
                    progress?.report({
                        message: "Analyzing Git repository...",
                        increment: 40,
                    });
                }
                else if (output.includes("Processing commits...")) {
                    progress?.report({ message: "Processing commits...", increment: 60 });
                }
                else if (output.includes("Calculating statistics...")) {
                    progress?.report({
                        message: "Calculating statistics...",
                        increment: 80,
                    });
                }
                else if (output.includes("Generating visualizations...")) {
                    progress?.report({
                        message: "Generating visualizations...",
                        increment: 90,
                    });
                }
            });
            // Handle stderr
            this.currentProcess.stderr?.on("data", (data) => {
                stderr += data.toString();
            });
            // Handle process completion
            this.currentProcess.on("close", (code) => {
                clearTimeout(timeoutId);
                this.currentProcess = null;
                if (code === 0 || (code === 1 && stdout.trim())) {
                    // Accept exit code 1 if there's valid JSON output
                    try {
                        const result = this.parseGitAnalyzerOutput(stdout);
                        progress?.report({
                            message: "Git analysis complete",
                            increment: 100,
                        });
                        if (code === 1) {
                            this.log(`Git analyzer completed with warnings/errors but produced valid output`);
                        }
                        resolve(result);
                    }
                    catch (parseError) {
                        this.logError("Failed to parse Git analyzer output", parseError);
                        reject(new Error(`Failed to parse Git analyzer output: ${parseError instanceof Error ? parseError.message : parseError}`));
                    }
                }
                else {
                    const errorMessage = `Git analyzer process exited with code ${code}`;
                    this.logError(errorMessage, new Error(stderr));
                    reject(new Error(`${errorMessage}. Error: ${stderr}`));
                }
            });
            // Handle process errors
            this.currentProcess.on("error", (error) => {
                clearTimeout(timeoutId);
                this.currentProcess = null;
                let errorMessage = `Failed to start Git analyzer process: ${error.message}`;
                if (error.message.includes("ENOENT")) {
                    errorMessage = `Python executable not found. Please check your Python installation and path configuration.`;
                }
                else if (error.message.includes("EACCES")) {
                    errorMessage = `Permission denied when trying to execute Python. Please check file permissions.`;
                }
                this.logError("Git analyzer process spawn error", error);
                reject(new Error(errorMessage));
            });
        });
    }
    /**
     * Parse Git analyzer JSON output
     */
    parseGitAnalyzerOutput(stdout) {
        // Clean up the output - remove any non-JSON content
        const cleanOutput = this.cleanAnalyzerOutput(stdout);
        // Parse JSON
        let parsedResult;
        try {
            parsedResult = JSON.parse(cleanOutput);
        }
        catch (error) {
            throw new Error(`Invalid JSON output from Git analyzer: ${error instanceof Error ? error.message : error}`);
        }
        // Convert to AnalysisResult format
        return {
            success: parsedResult.success !== false,
            data: parsedResult,
            errors: parsedResult.errors || [],
            warnings: parsedResult.warnings || [],
            executionTime: 0, // Will be set by caller
        };
    }
    /**
     * Clean up resources
     */
    cleanup() {
        if (this.currentProcess) {
            this.currentProcess.kill();
            this.currentProcess = null;
        }
        if (this.cancellationToken) {
            this.cancellationToken.dispose();
            this.cancellationToken = null;
        }
    }
    /**
     * Log message to output channel
     */
    log(message) {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] AnalyzerRunner: ${message}`);
    }
    /**
     * Execute database schema analysis on the specified project
     */
    async runDatabaseSchemaAnalysis(options, progress, cancellationToken) {
        const startTime = Date.now();
        try {
            // Validate inputs
            await this.validateOptions(options);
            // Set up cancellation
            this.cancellationToken = new vscode.CancellationTokenSource();
            if (cancellationToken) {
                cancellationToken.onCancellationRequested(() => {
                    this.cancelAnalysis();
                });
            }
            // Update progress
            progress?.report({
                message: "Preparing database schema analysis...",
                increment: 10,
            });
            // Get Python path
            const pythonPath = await this.getPythonPath(options.pythonPath);
            // Get database schema analyzer script path
            const analyzerPath = this.getDatabaseSchemaAnalyzerScriptPath();
            // Prepare command arguments
            const args = [options.projectPath];
            this.log(`Starting database schema analysis: ${pythonPath} ${analyzerPath} ${args.join(" ")}`);
            // Update progress
            progress?.report({
                message: "Analyzing database schema...",
                increment: 30,
            });
            // Execute the database schema analyzer
            const result = await this.executeDatabaseSchemaAnalyzer(pythonPath, analyzerPath, args, progress);
            // Calculate execution time
            const executionTime = Date.now() - startTime;
            result.executionTime = executionTime;
            this.log(`Database schema analysis completed in ${executionTime}ms`);
            return result;
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            this.logError("Database schema analysis failed", error);
            return {
                success: false,
                errors: [
                    {
                        type: "execution_error",
                        message: error instanceof Error ? error.message : "Unknown error occurred",
                    },
                ],
                executionTime,
            };
        }
        finally {
            this.cleanup();
        }
    }
    /**
     * Get the database schema analyzer script path
     */
    getDatabaseSchemaAnalyzerScriptPath() {
        return path.join(this.extensionPath, "analyzer", "run_database_schema_analysis.py");
    }
    /**
     * Execute the database schema analyzer process
     */
    async executeDatabaseSchemaAnalyzer(pythonPath, analyzerPath, args, progress) {
        return new Promise((resolve, reject) => {
            let stdout = "";
            let stderr = "";
            // Spawn the Python process
            this.currentProcess = (0, child_process_1.spawn)(pythonPath, [analyzerPath, ...args], {
                cwd: path.dirname(analyzerPath),
                stdio: "pipe",
            });
            // Handle stdout
            this.currentProcess.stdout?.on("data", (data) => {
                const output = data.toString();
                stdout += output;
                // Update progress based on output
                if (output.includes("Scanning for models")) {
                    progress?.report({
                        message: "Scanning for database models...",
                        increment: 10,
                    });
                }
                else if (output.includes("Parsing SQL files")) {
                    progress?.report({ message: "Parsing SQL files...", increment: 20 });
                }
                else if (output.includes("Generating graph data")) {
                    progress?.report({
                        message: "Generating schema graph...",
                        increment: 30,
                    });
                }
            });
            // Handle stderr
            this.currentProcess.stderr?.on("data", (data) => {
                stderr += data.toString();
            });
            // Handle process completion
            this.currentProcess.on("close", (code) => {
                this.currentProcess = null;
                if (code === 0) {
                    try {
                        // Parse the JSON output
                        const result = JSON.parse(stdout);
                        // Validate the result structure
                        if (result && typeof result === "object") {
                            resolve({
                                success: true,
                                data: result,
                                errors: result.errors || [],
                                warnings: result.warnings || [],
                            });
                        }
                        else {
                            throw new Error("Invalid result format from database schema analyzer");
                        }
                    }
                    catch (parseError) {
                        this.logError("Failed to parse database schema analyzer output", parseError);
                        reject(new Error(`Failed to parse database schema analyzer output: ${parseError instanceof Error ? parseError.message : parseError}`));
                    }
                }
                else {
                    const errorMessage = `Database schema analyzer process exited with code ${code}`;
                    this.logError(errorMessage, new Error(stderr));
                    reject(new Error(`${errorMessage}. Error: ${stderr}`));
                }
            });
            // Handle process errors
            this.currentProcess.on("error", (error) => {
                this.currentProcess = null;
                let errorMessage = "Failed to start database schema analyzer process";
                if (error.message.includes("ENOENT")) {
                    errorMessage =
                        "Python executable not found. Please install Python or configure the Python path in settings.";
                }
                this.logError("Database schema analyzer process spawn error", error);
                reject(new Error(errorMessage));
            });
            // Set timeout
            const timeout = setTimeout(() => {
                if (this.currentProcess) {
                    this.currentProcess.kill("SIGTERM");
                    reject(new Error("Database schema analysis timed out"));
                }
            }, 120000); // 2 minutes timeout
            // Clear timeout when process completes
            this.currentProcess.on("close", () => {
                clearTimeout(timeout);
            });
        });
    }
    /**
     * Log error message to output channel
     */
    logError(message, error) {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] AnalyzerRunner ERROR: ${message}`);
        if (error) {
            this.outputChannel.appendLine(`[${timestamp}] ${error.toString()}`);
            if (error.stack) {
                this.outputChannel.appendLine(`[${timestamp}] ${error.stack}`);
            }
        }
    }
}
exports.AnalyzerRunner = AnalyzerRunner;
//# sourceMappingURL=analyzer-runner.js.map