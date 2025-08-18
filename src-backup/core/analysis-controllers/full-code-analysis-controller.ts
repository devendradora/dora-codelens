import * as vscode from 'vscode';
import { AnalysisController, EnhancedGraphData, AnalysisViewState } from '../../types/dedicated-analysis-types';
import { DataTransformationUtils } from '../data-transformation-utils';

/**
 * Controller for Full Code Analysis view with enhanced graph visualization
 */
export class FullCodeAnalysisController implements AnalysisController {
    private moduleHierarchy: any = {};
    private projectStructure: any = {};

    constructor(private outputChannel: vscode.OutputChannel) {}

    /**
     * Transform analysis data to enhanced graph format
     */
    public async transformData(data: any): Promise<EnhancedGraphData> {
        try {
            this.outputChannel.appendLine('Transforming full code analysis data...');
            
            // Use data transformation utilities
            let enhancedData = DataTransformationUtils.transformLegacyAnalysisData(data);
            
            // Apply full code analysis specific enhancements
            enhancedData = this.enhanceForFullCodeAnalysis(enhancedData, data);
            
            // Update metadata
            enhancedData.metadata.analysisType = 'fullCode';
            enhancedData.metadata.timestamp = new Date();
            
            this.outputChannel.appendLine(`Full code analysis transformation complete: ${enhancedData.metadata.totalNodes} nodes, ${enhancedData.metadata.totalEdges} edges`);
            
            return enhancedData;
        } catch (error) {
            this.outputChannel.appendLine(`Failed to transform full code analysis data: ${error}`);
            throw error;
        }
    }

    /**
     * Handle user interactions with the full code analysis view
     */
    public async handleInteraction(interaction: any, state: AnalysisViewState): Promise<void> {
        try {
            switch (interaction.type) {
                case 'node-click':
                    await this.handleNodeClick(interaction, state);
                    break;
                case 'node-hover':
                    await this.handleNodeHover(interaction, state);
                    break;
                case 'module-expand':
                    await this.handleModuleExpand(interaction, state);
                    break;
                case 'complexity-filter':
                    await this.handleComplexityFilter(interaction, state);
                    break;
                default:
                    this.outputChannel.appendLine(`Unknown interaction type: ${interaction.type}`);
            }
        } catch (error) {
            this.outputChannel.appendLine(`Failed to handle interaction: ${error}`);
            throw error;
        }
    }

    /**
     * Get current module hierarchy
     */
    public getModuleHierarchy(): any {
        return this.moduleHierarchy;
    }

    /**
     * Set module hierarchy (for state restoration)
     */
    public setModuleHierarchy(hierarchy: any): void {
        this.moduleHierarchy = hierarchy || {};
    }

    /**
     * Get project structure
     */
    public getProjectStructure(): any {
        return this.projectStructure;
    }

    /**
     * Enhance data specifically for full code analysis
     */
    private enhanceForFullCodeAnalysis(enhancedData: EnhancedGraphData, originalData: any): EnhancedGraphData {
        // Add project-wide metrics
        if (originalData.projectMetrics) {
            enhancedData.metadata.performanceMetrics = {
                ...enhancedData.metadata.performanceMetrics,
                ...originalData.projectMetrics
            };
        }

        // Enhance module hierarchy
        if (originalData.modules) {
            this.buildModuleHierarchy(enhancedData, originalData.modules);
        }

        // Add framework detection results
        if (originalData.frameworks) {
            this.addFrameworkInformation(enhancedData, originalData.frameworks);
        }

        // Add tech stack information
        if (originalData.techStack || originalData.tech_stack) {
            this.addTechStackInformation(enhancedData, originalData.techStack || originalData.tech_stack);
        }

        return enhancedData;
    }

    /**
     * Build module hierarchy from analysis data
     */
    private buildModuleHierarchy(enhancedData: EnhancedGraphData, modulesData: any): void {
        const hierarchy: any = {};
        
        for (const module of enhancedData.modules.flatList) {
            const pathParts = module.path.split('/').filter(p => p.length > 0);
            let current = hierarchy;
            
            for (const part of pathParts) {
                if (!current[part]) {
                    current[part] = {
                        children: {},
                        module: null
                    };
                }
                current = current[part].children;
            }
            
            // Set the module at the leaf
            const leafKey = pathParts[pathParts.length - 1] || 'root';
            if (hierarchy[leafKey]) {
                hierarchy[leafKey].module = module;
            }
        }
        
        this.moduleHierarchy = hierarchy;
        enhancedData.modules.hierarchy = hierarchy;
    }

    /**
     * Add framework information to enhanced data
     */
    private addFrameworkInformation(enhancedData: EnhancedGraphData, frameworks: any[]): void {
        // Create framework nodes
        for (const framework of frameworks) {
            const frameworkId = `framework_${framework.name}`;
            const frameworkNode = {
                id: frameworkId,
                name: framework.name,
                path: `frameworks/${framework.name}`,
                module: 'frameworks',
                complexity: {
                    cyclomaticComplexity: 1,
                    cognitiveComplexity: 1,
                    linesOfCode: framework.fileCount || 1,
                    maintainabilityIndex: 100,
                    level: 'low' as const,
                    color: '#9C27B0',
                    score: 1
                },
                position: { x: 0, y: 0 },
                size: 30,
                language: 'framework',
                isHighlighted: false,
                metadata: {
                    lastModified: new Date(),
                    author: 'Framework',
                    functions: 0,
                    classes: 0,
                    imports: 0,
                    framework: framework
                }
            };
            
            enhancedData.files.files.set(frameworkId, frameworkNode);
        }
    }

    /**
     * Add tech stack information to enhanced data
     */
    private addTechStackInformation(enhancedData: EnhancedGraphData, techStack: any): void {
        // Add tech stack as metadata
        (enhancedData.metadata as any).techStack = techStack;

        // Create nodes for major tech stack components
        if (techStack.frameworks) {
            for (const framework of techStack.frameworks) {
                this.addTechStackNode(enhancedData, framework, 'framework');
            }
        }

        if (techStack.libraries) {
            for (const library of techStack.libraries.slice(0, 10)) { // Limit to top 10
                this.addTechStackNode(enhancedData, library, 'library');
            }
        }
    }

    /**
     * Add a tech stack node to the enhanced data
     */
    private addTechStackNode(enhancedData: EnhancedGraphData, item: any, type: string): void {
        const itemName = item.name || item;
        const nodeId = `techstack_${type}_${itemName}`;
        
        const node = {
            id: nodeId,
            name: itemName,
            path: `techstack/${type}/${itemName}`,
            module: 'techstack',
            complexity: {
                cyclomaticComplexity: 1,
                cognitiveComplexity: 1,
                linesOfCode: 1,
                maintainabilityIndex: 100,
                level: 'low' as const,
                color: type === 'framework' ? '#FF5722' : '#3F51B5',
                score: 1
            },
            position: { x: 0, y: 0 },
            size: 25,
            language: type,
            isHighlighted: false,
            metadata: {
                lastModified: new Date(),
                author: 'System',
                functions: 0,
                classes: 0,
                imports: 0,
                techStackItem: item
            }
        };
        
        enhancedData.files.files.set(nodeId, node);
    }

    /**
     * Handle node click interactions
     */
    private async handleNodeClick(interaction: any, state: AnalysisViewState): Promise<void> {
        const nodeData = interaction.data;
        
        if (nodeData.type === 'module') {
            // Toggle module expansion
            await this.handleModuleExpand(interaction, state);
        } else if (nodeData.type === 'file') {
            // Show file details or open file
            await this.showFileDetails(nodeData);
        }
    }

    /**
     * Handle node hover interactions
     */
    private async handleNodeHover(interaction: any, state: AnalysisViewState): Promise<void> {
        // Log hover for analytics
        this.outputChannel.appendLine(`Node hovered: ${interaction.target}`);
    }

    /**
     * Handle module expansion/collapse
     */
    private async handleModuleExpand(interaction: any, state: AnalysisViewState): Promise<void> {
        const moduleId = interaction.target;
        
        // Update module hierarchy
        if (this.moduleHierarchy[moduleId]) {
            this.moduleHierarchy[moduleId].expanded = !this.moduleHierarchy[moduleId].expanded;
        }
        
        this.outputChannel.appendLine(`Module ${moduleId} ${this.moduleHierarchy[moduleId]?.expanded ? 'expanded' : 'collapsed'}`);
    }

    /**
     * Handle complexity filtering
     */
    private async handleComplexityFilter(interaction: any, state: AnalysisViewState): Promise<void> {
        const filterLevel = interaction.data.level;
        this.outputChannel.appendLine(`Complexity filter applied: ${filterLevel}`);
    }

    /**
     * Show file details
     */
    private async showFileDetails(nodeData: any): Promise<void> {
        if (nodeData.path && nodeData.path !== 'techstack' && nodeData.path !== 'frameworks') {
            // Try to open the file in editor
            try {
                const uri = vscode.Uri.file(nodeData.path);
                await vscode.window.showTextDocument(uri);
            } catch (error) {
                this.outputChannel.appendLine(`Failed to open file: ${nodeData.path}`);
            }
        }
    }

    /**
     * Dispose resources
     */
    public dispose(): void {
        this.moduleHierarchy = {};
        this.projectStructure = {};
    }
}