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
exports.BaseAnalysisController = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Base analysis controller with common functionality
 */
class BaseAnalysisController {
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
    }
    /**
     * Handle graph interactions
     */
    async handleInteraction(interaction, state) {
        try {
            switch (interaction.type) {
                case 'node-click':
                    await this.handleNodeClick(interaction.target, interaction.data, state);
                    break;
                case 'node-hover':
                    await this.handleNodeHover(interaction.target, interaction.data, state);
                    break;
                case 'edge-click':
                    await this.handleEdgeClick(interaction.target, interaction.data, state);
                    break;
                case 'edge-hover':
                    await this.handleEdgeHover(interaction.target, interaction.data, state);
                    break;
                case 'background-click':
                    await this.handleBackgroundClick(state);
                    break;
                case 'zoom':
                    await this.handleZoom(interaction.data, state);
                    break;
                case 'pan':
                    await this.handlePan(interaction.data, state);
                    break;
                default:
                    this.outputChannel.appendLine(`Unknown interaction type: ${interaction.type}`);
            }
        }
        catch (error) {
            this.outputChannel.appendLine(`Error handling interaction: ${error}`);
        }
    }
    /**
     * Handle node click events
     */
    async handleNodeClick(nodeId, nodeData, state) {
        if (nodeData?.type === 'module') {
            await this.toggleModuleExpansion(nodeId, state);
        }
        else if (nodeData?.type === 'file') {
            await this.openFile(nodeData.path);
        }
    }
    /**
     * Handle node hover events
     */
    async handleNodeHover(nodeId, nodeData, state) {
        // Show tooltip with node information
        const tooltipContent = this.generateNodeTooltip(nodeData);
        // This would be handled by the webview JavaScript
    }
    /**
     * Handle edge click events
     */
    async handleEdgeClick(edgeId, edgeData, state) {
        // Highlight the dependency path
        this.outputChannel.appendLine(`Dependency clicked: ${edgeData?.type} from ${edgeData?.source} to ${edgeData?.target}`);
    }
    /**
     * Handle edge hover events
     */
    async handleEdgeHover(edgeId, edgeData, state) {
        // Show tooltip with edge information
        const tooltipContent = this.generateEdgeTooltip(edgeData);
        // This would be handled by the webview JavaScript
    }
    /**
     * Handle background click events
     */
    async handleBackgroundClick(state) {
        // Clear selections
        state.selectedNodes = [];
    }
    /**
     * Handle zoom events
     */
    async handleZoom(zoomData, state) {
        state.zoomLevel = zoomData.level || state.zoomLevel;
    }
    /**
     * Handle pan events
     */
    async handlePan(panData, state) {
        // Pan handling is typically managed by the graph library
    }
    /**
     * Toggle module expansion/collapse
     */
    async toggleModuleExpansion(moduleId, state) {
        // This would update the module's expanded state and trigger a re-render
        this.outputChannel.appendLine(`Toggling module expansion: ${moduleId}`);
    }
    /**
     * Open file in editor
     */
    async openFile(filePath) {
        try {
            const uri = vscode.Uri.file(filePath);
            await vscode.window.showTextDocument(uri);
        }
        catch (error) {
            this.outputChannel.appendLine(`Failed to open file: ${filePath} - ${error}`);
        }
    }
    /**
     * Generate tooltip content for nodes
     */
    generateNodeTooltip(nodeData) {
        if (nodeData?.type === 'module') {
            return `
                <div class="tooltip-header">Module: ${nodeData.label}</div>
                <div class="tooltip-body">
                    <div>Path: ${nodeData.path}</div>
                    <div>Files: ${nodeData.fileCount}</div>
                    <div>Submodules: ${nodeData.subModuleCount}</div>
                    <div>Complexity: ${nodeData.complexity?.level || 'Unknown'}</div>
                </div>
            `;
        }
        else if (nodeData?.type === 'file') {
            return `
                <div class="tooltip-header">File: ${nodeData.label}</div>
                <div class="tooltip-body">
                    <div>Path: ${nodeData.path}</div>
                    <div>Language: ${nodeData.language}</div>
                    <div>Lines of Code: ${nodeData.complexity?.linesOfCode || 0}</div>
                    <div>Cyclomatic Complexity: ${nodeData.complexity?.cyclomaticComplexity || 0}</div>
                    <div>Maintainability Index: ${nodeData.complexity?.maintainabilityIndex || 0}</div>
                </div>
            `;
        }
        return '';
    }
    /**
     * Generate tooltip content for edges
     */
    generateEdgeTooltip(edgeData) {
        return `
            <div class="tooltip-header">Dependency: ${edgeData?.type || 'Unknown'}</div>
            <div class="tooltip-body">
                <div>From: ${edgeData?.source}</div>
                <div>To: ${edgeData?.target}</div>
                <div>Weight: ${edgeData?.weight || 1}</div>
                <div>Strength: ${edgeData?.metadata?.strength || 'Unknown'}</div>
            </div>
        `;
    }
    /**
     * Create base enhanced graph data structure
     */
    createBaseEnhancedGraphData(analysisType) {
        return {
            modules: {
                root: this.createEmptyModuleNode('root', 'Root', '/', 0),
                flatList: [],
                hierarchy: {},
                statistics: {
                    totalModules: 0,
                    maxDepth: 0,
                    averageFilesPerModule: 0,
                    complexityDistribution: { low: 0, medium: 0, high: 0 }
                }
            },
            files: {
                files: new Map(),
                byModule: new Map(),
                byComplexity: new Map(),
                statistics: {
                    totalFiles: 0,
                    averageComplexity: 0,
                    languageDistribution: {},
                    complexityDistribution: { low: 0, medium: 0, high: 0 }
                }
            },
            dependencies: {
                edges: [],
                adjacencyList: new Map(),
                reverseAdjacencyList: new Map(),
                statistics: {
                    totalDependencies: 0,
                    circularDependencies: 0,
                    averageDependenciesPerFile: 0,
                    maxDependencyDepth: 0
                }
            },
            metadata: {
                analysisType,
                timestamp: new Date(),
                projectPath: '',
                totalNodes: 0,
                totalEdges: 0,
                complexityDistribution: { low: 0, medium: 0, high: 0 },
                performanceMetrics: {
                    analysisTime: 0,
                    renderTime: 0,
                    memoryUsage: 0,
                    nodeCount: 0,
                    edgeCount: 0
                }
            }
        };
    }
    /**
     * Create empty module node
     */
    createEmptyModuleNode(id, name, path, level) {
        return {
            id,
            name,
            path,
            files: [],
            subModules: [],
            position: { x: 0, y: 0 },
            size: { width: 100, height: 60 },
            complexity: {
                totalFiles: 0,
                averageComplexity: 0,
                maxComplexity: 0,
                totalLinesOfCode: 0,
                level: 'low'
            },
            isExpanded: false,
            level
        };
    }
    /**
     * Calculate complexity level based on score
     */
    calculateComplexityLevel(score) {
        if (score <= 5)
            return 'low';
        if (score <= 10)
            return 'medium';
        return 'high';
    }
    /**
     * Generate unique ID for graph elements
     */
    generateId(prefix, path) {
        return `${prefix}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }
    /**
     * Dispose resources
     */
    dispose() {
        // Base implementation - override in subclasses if needed
    }
}
exports.BaseAnalysisController = BaseAnalysisController;
//# sourceMappingURL=base-analysis-controller.js.map