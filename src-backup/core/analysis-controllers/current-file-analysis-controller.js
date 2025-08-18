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
exports.CurrentFileAnalysisController = void 0;
const vscode = __importStar(require("vscode"));
const data_transformation_utils_1 = require("../data-transformation-utils");
/**
 * Controller for Current File Analysis view with focused dependency tracking
 */
class CurrentFileAnalysisController {
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
        this.currentFileContext = {};
        this.setupFileWatcher();
    }
    /**
     * Transform analysis data to enhanced graph format focused on current file
     */
    async transformData(data) {
        try {
            this.outputChannel.appendLine('Transforming current file analysis data...');
            // Get current active file
            this.activeEditor = vscode.window.activeTextEditor;
            const currentFilePath = this.activeEditor?.document.fileName;
            // Transform base data
            let enhancedData = data_transformation_utils_1.DataTransformationUtils.transformLegacyAnalysisData(data);
            // Apply current file specific enhancements
            enhancedData = this.enhanceForCurrentFileAnalysis(enhancedData, data, currentFilePath);
            // Update metadata
            enhancedData.metadata.analysisType = 'currentFile';
            enhancedData.metadata.timestamp = new Date();
            this.outputChannel.appendLine(`Current file analysis transformation complete: ${enhancedData.metadata.totalNodes} nodes, ${enhancedData.metadata.totalEdges} edges`);
            return enhancedData;
        }
        catch (error) {
            this.outputChannel.appendLine(`Failed to transform current file analysis data: ${error}`);
            throw error;
        }
    }
    /**
     * Handle user interactions with the current file analysis view
     */
    async handleInteraction(interaction, state) {
        try {
            switch (interaction.type) {
                case 'node-click':
                    await this.handleNodeClick(interaction, state);
                    break;
                case 'dependency-trace':
                    await this.handleDependencyTrace(interaction, state);
                    break;
                case 'file-change':
                    await this.handleFileChange(interaction, state);
                    break;
                case 'focus-change':
                    await this.handleFocusChange(interaction, state);
                    break;
                default:
                    this.outputChannel.appendLine(`Unknown interaction type: ${interaction.type}`);
            }
        }
        catch (error) {
            this.outputChannel.appendLine(`Failed to handle interaction: ${error}`);
            throw error;
        }
    }
    /**
     * Get current file context
     */
    getCurrentFileContext() {
        return this.currentFileContext;
    }
    /**
     * Set current file context (for state restoration)
     */
    setCurrentFileContext(context) {
        this.currentFileContext = context || {};
    }
    /**
     * Setup file watcher for automatic updates
     */
    setupFileWatcher() {
        // Watch for active editor changes
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                this.handleActiveEditorChange(editor);
            }
        });
        // Watch for text document changes
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document === this.activeEditor?.document) {
                this.handleDocumentChange(event);
            }
        });
    }
    /**
     * Enhance data specifically for current file analysis
     */
    enhanceForCurrentFileAnalysis(enhancedData, originalData, currentFilePath) {
        if (!currentFilePath) {
            return enhancedData;
        }
        // Find the current file node
        const currentFileNode = this.findCurrentFileNode(enhancedData, currentFilePath);
        if (currentFileNode) {
            // Highlight the current file
            currentFileNode.isHighlighted = true;
            // Update current file context
            this.currentFileContext = {
                filePath: currentFilePath,
                nodeId: currentFileNode.id,
                dependencies: this.findFileDependencies(enhancedData, currentFileNode.id),
                reverseDependencies: this.findFileReverseDependencies(enhancedData, currentFileNode.id),
                relatedFiles: this.findRelatedFiles(enhancedData, currentFileNode)
            };
        }
        // Filter and focus on relevant nodes
        enhancedData = this.applyCurrentFileFocus(enhancedData, currentFileNode);
        // Add contextual information
        this.addContextualInformation(enhancedData, originalData, currentFilePath);
        return enhancedData;
    }
    /**
     * Find the current file node in the enhanced data
     */
    findCurrentFileNode(enhancedData, filePath) {
        for (const [nodeId, fileNode] of enhancedData.files.files.entries()) {
            if (fileNode.path === filePath || fileNode.path.endsWith(filePath)) {
                return fileNode;
            }
        }
        return null;
    }
    /**
     * Find direct dependencies of a file
     */
    findFileDependencies(enhancedData, fileId) {
        return enhancedData.dependencies.edges
            .filter(edge => edge.source === fileId)
            .map(edge => edge.target);
    }
    /**
     * Find reverse dependencies of a file (files that depend on this file)
     */
    findFileReverseDependencies(enhancedData, fileId) {
        return enhancedData.dependencies.edges
            .filter(edge => edge.target === fileId)
            .map(edge => edge.source);
    }
    /**
     * Find related files based on module, complexity, or language
     */
    findRelatedFiles(enhancedData, currentFile) {
        const relatedFiles = [];
        for (const [nodeId, fileNode] of enhancedData.files.files.entries()) {
            if (nodeId === currentFile.id)
                continue;
            // Same module
            if (fileNode.module === currentFile.module) {
                relatedFiles.push(nodeId);
            }
            // Same language
            else if (fileNode.language === currentFile.language) {
                relatedFiles.push(nodeId);
            }
            // Similar complexity
            else if (fileNode.complexity.level === currentFile.complexity.level) {
                relatedFiles.push(nodeId);
            }
        }
        return relatedFiles.slice(0, 10); // Limit to 10 related files
    }
    /**
     * Apply focus to show only relevant nodes for current file analysis
     */
    applyCurrentFileFocus(enhancedData, currentFile) {
        if (!currentFile) {
            return enhancedData;
        }
        const relevantNodeIds = new Set();
        // Add current file
        relevantNodeIds.add(currentFile.id);
        // Add direct dependencies and reverse dependencies
        const dependencies = this.findFileDependencies(enhancedData, currentFile.id);
        const reverseDependencies = this.findFileReverseDependencies(enhancedData, currentFile.id);
        dependencies.forEach(id => relevantNodeIds.add(id));
        reverseDependencies.forEach(id => relevantNodeIds.add(id));
        // Add related files
        const relatedFiles = this.findRelatedFiles(enhancedData, currentFile);
        relatedFiles.forEach(id => relevantNodeIds.add(id));
        // Filter files to only include relevant ones
        const filteredFiles = new Map();
        for (const [nodeId, fileNode] of enhancedData.files.files.entries()) {
            if (relevantNodeIds.has(nodeId)) {
                filteredFiles.set(nodeId, fileNode);
            }
        }
        enhancedData.files.files = filteredFiles;
        // Filter dependencies to only include relevant ones
        enhancedData.dependencies.edges = enhancedData.dependencies.edges.filter(edge => relevantNodeIds.has(edge.source) && relevantNodeIds.has(edge.target));
        // Update statistics
        enhancedData.metadata.totalNodes = filteredFiles.size;
        enhancedData.metadata.totalEdges = enhancedData.dependencies.edges.length;
        return enhancedData;
    }
    /**
     * Add contextual information specific to current file
     */
    addContextualInformation(enhancedData, originalData, filePath) {
        // Add file-specific metrics to metadata
        enhancedData.metadata.currentFile = {
            path: filePath,
            analysisTime: new Date(),
            focusRadius: this.currentFileContext.dependencies?.length || 0,
            impactScore: this.calculateImpactScore(enhancedData, filePath)
        };
    }
    /**
     * Calculate impact score for the current file
     */
    calculateImpactScore(enhancedData, filePath) {
        const currentFileNode = this.findCurrentFileNode(enhancedData, filePath);
        if (!currentFileNode)
            return 0;
        const dependencies = this.findFileDependencies(enhancedData, currentFileNode.id);
        const reverseDependencies = this.findFileReverseDependencies(enhancedData, currentFileNode.id);
        // Impact score based on complexity and dependency count
        const complexityScore = currentFileNode.complexity.cyclomaticComplexity || 0;
        const dependencyScore = dependencies.length + reverseDependencies.length;
        return Math.min(100, complexityScore + dependencyScore * 2);
    }
    /**
     * Handle node click interactions
     */
    async handleNodeClick(interaction, state) {
        const nodeData = interaction.data;
        if (nodeData.type === 'file' && nodeData.path) {
            // Open the clicked file
            try {
                const uri = vscode.Uri.file(nodeData.path);
                await vscode.window.showTextDocument(uri);
            }
            catch (error) {
                this.outputChannel.appendLine(`Failed to open file: ${nodeData.path}`);
            }
        }
    }
    /**
     * Handle dependency tracing
     */
    async handleDependencyTrace(interaction, state) {
        const { sourceId, targetId } = interaction.data;
        this.outputChannel.appendLine(`Tracing dependency: ${sourceId} -> ${targetId}`);
        // Could implement dependency path finding here
    }
    /**
     * Handle file change events
     */
    async handleFileChange(interaction, state) {
        const filePath = interaction.data.filePath;
        this.outputChannel.appendLine(`File changed: ${filePath}`);
        // Trigger re-analysis if needed
        if (filePath === this.currentFileContext.filePath) {
            // File content changed, might need to update analysis
        }
    }
    /**
     * Handle focus change events
     */
    async handleFocusChange(interaction, state) {
        const newFocusFile = interaction.data.filePath;
        this.outputChannel.appendLine(`Focus changed to: ${newFocusFile}`);
        // Update current file context
        this.currentFileContext.filePath = newFocusFile;
    }
    /**
     * Handle active editor change
     */
    handleActiveEditorChange(editor) {
        this.activeEditor = editor;
        const filePath = editor.document.fileName;
        // Update current file context
        this.currentFileContext.filePath = filePath;
        this.outputChannel.appendLine(`Active editor changed to: ${filePath}`);
    }
    /**
     * Handle document change
     */
    handleDocumentChange(event) {
        // Document content changed
        this.outputChannel.appendLine(`Document changed: ${event.document.fileName}`);
        // Could trigger incremental analysis here
    }
    /**
     * Dispose resources
     */
    dispose() {
        this.currentFileContext = {};
        this.activeEditor = undefined;
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
            this.fileWatcher = undefined;
        }
    }
}
exports.CurrentFileAnalysisController = CurrentFileAnalysisController;
//# sourceMappingURL=current-file-analysis-controller.js.map