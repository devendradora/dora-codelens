import * as vscode from 'vscode';
import { 
    AnalysisController, 
    EnhancedGraphData, 
    AnalysisViewState,
    GraphInteraction,
    ModuleNode,
    FileNode,
    DependencyEdge,
    ModuleHierarchy,
    FileCollection,
    DependencyNetwork,
    GraphMetadata
} from '../../types/dedicated-analysis-types';

/**
 * Base analysis controller with common functionality
 */
export abstract class BaseAnalysisController implements AnalysisController {
    protected outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
    }

    /**
     * Transform raw analysis data to enhanced graph format
     */
    public abstract transformData(data: any): Promise<EnhancedGraphData>;

    /**
     * Handle graph interactions
     */
    public async handleInteraction(interaction: GraphInteraction, state: AnalysisViewState): Promise<void> {
        try {
            switch (interaction.type) {
                case 'node-click':
                    await this.handleNodeClick(interaction.target!, interaction.data, state);
                    break;
                case 'node-hover':
                    await this.handleNodeHover(interaction.target!, interaction.data, state);
                    break;
                case 'edge-click':
                    await this.handleEdgeClick(interaction.target!, interaction.data, state);
                    break;
                case 'edge-hover':
                    await this.handleEdgeHover(interaction.target!, interaction.data, state);
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
        } catch (error) {
            this.outputChannel.appendLine(`Error handling interaction: ${error}`);
        }
    }

    /**
     * Handle node click events
     */
    protected async handleNodeClick(nodeId: string, nodeData: any, state: AnalysisViewState): Promise<void> {
        if (nodeData?.type === 'module') {
            await this.toggleModuleExpansion(nodeId, state);
        } else if (nodeData?.type === 'file') {
            await this.openFile(nodeData.path);
        }
    }

    /**
     * Handle node hover events
     */
    protected async handleNodeHover(nodeId: string, nodeData: any, state: AnalysisViewState): Promise<void> {
        // Show tooltip with node information
        const tooltipContent = this.generateNodeTooltip(nodeData);
        // This would be handled by the webview JavaScript
    }

    /**
     * Handle edge click events
     */
    protected async handleEdgeClick(edgeId: string, edgeData: any, state: AnalysisViewState): Promise<void> {
        // Highlight the dependency path
        this.outputChannel.appendLine(`Dependency clicked: ${edgeData?.type} from ${edgeData?.source} to ${edgeData?.target}`);
    }

    /**
     * Handle edge hover events
     */
    protected async handleEdgeHover(edgeId: string, edgeData: any, state: AnalysisViewState): Promise<void> {
        // Show tooltip with edge information
        const tooltipContent = this.generateEdgeTooltip(edgeData);
        // This would be handled by the webview JavaScript
    }

    /**
     * Handle background click events
     */
    protected async handleBackgroundClick(state: AnalysisViewState): Promise<void> {
        // Clear selections
        state.selectedNodes = [];
    }

    /**
     * Handle zoom events
     */
    protected async handleZoom(zoomData: any, state: AnalysisViewState): Promise<void> {
        state.zoomLevel = zoomData.level || state.zoomLevel;
    }

    /**
     * Handle pan events
     */
    protected async handlePan(panData: any, state: AnalysisViewState): Promise<void> {
        // Pan handling is typically managed by the graph library
    }

    /**
     * Toggle module expansion/collapse
     */
    protected async toggleModuleExpansion(moduleId: string, state: AnalysisViewState): Promise<void> {
        // This would update the module's expanded state and trigger a re-render
        this.outputChannel.appendLine(`Toggling module expansion: ${moduleId}`);
    }

    /**
     * Open file in editor
     */
    protected async openFile(filePath: string): Promise<void> {
        try {
            const uri = vscode.Uri.file(filePath);
            await vscode.window.showTextDocument(uri);
        } catch (error) {
            this.outputChannel.appendLine(`Failed to open file: ${filePath} - ${error}`);
        }
    }

    /**
     * Generate tooltip content for nodes
     */
    protected generateNodeTooltip(nodeData: any): string {
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
        } else if (nodeData?.type === 'file') {
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
    protected generateEdgeTooltip(edgeData: any): string {
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
    protected createBaseEnhancedGraphData(analysisType: 'fullCode' | 'currentFile' | 'gitAnalytics'): EnhancedGraphData {
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
    protected createEmptyModuleNode(id: string, name: string, path: string, level: number): ModuleNode {
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
    protected calculateComplexityLevel(score: number): 'low' | 'medium' | 'high' {
        if (score <= 5) return 'low';
        if (score <= 10) return 'medium';
        return 'high';
    }

    /**
     * Generate unique ID for graph elements
     */
    protected generateId(prefix: string, path: string): string {
        return `${prefix}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }

    /**
     * Dispose resources
     */
    public dispose(): void {
        // Base implementation - override in subclasses if needed
    }
}