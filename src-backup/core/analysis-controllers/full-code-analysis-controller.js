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
exports.FullCodeAnalysisController = void 0;
const vscode = __importStar(require("vscode"));
const data_transformation_utils_1 = require("../data-transformation-utils");
/**
 * Controller for Full Code Analysis view with enhanced graph visualization
 */
class FullCodeAnalysisController {
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
        this.moduleHierarchy = {};
        this.projectStructure = {};
    }
    /**
     * Transform analysis data to enhanced graph format
     */
    async transformData(data) {
        try {
            this.outputChannel.appendLine('Transforming full code analysis data...');
            // Use data transformation utilities
            let enhancedData = data_transformation_utils_1.DataTransformationUtils.transformLegacyAnalysisData(data);
            // Apply full code analysis specific enhancements
            enhancedData = this.enhanceForFullCodeAnalysis(enhancedData, data);
            // Update metadata
            enhancedData.metadata.analysisType = 'fullCode';
            enhancedData.metadata.timestamp = new Date();
            this.outputChannel.appendLine(`Full code analysis transformation complete: ${enhancedData.metadata.totalNodes} nodes, ${enhancedData.metadata.totalEdges} edges`);
            return enhancedData;
        }
        catch (error) {
            this.outputChannel.appendLine(`Failed to transform full code analysis data: ${error}`);
            throw error;
        }
    }
    /**
     * Handle user interactions with the full code analysis view
     */
    async handleInteraction(interaction, state) {
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
        }
        catch (error) {
            this.outputChannel.appendLine(`Failed to handle interaction: ${error}`);
            throw error;
        }
    }
    /**
     * Get current module hierarchy
     */
    getModuleHierarchy() {
        return this.moduleHierarchy;
    }
    /**
     * Set module hierarchy (for state restoration)
     */
    setModuleHierarchy(hierarchy) {
        this.moduleHierarchy = hierarchy || {};
    }
    /**
     * Get project structure
     */
    getProjectStructure() {
        return this.projectStructure;
    }
    /**
     * Enhance data specifically for full code analysis
     */
    enhanceForFullCodeAnalysis(enhancedData, originalData) {
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
    buildModuleHierarchy(enhancedData, modulesData) {
        const hierarchy = {};
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
    addFrameworkInformation(enhancedData, frameworks) {
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
                    level: 'low',
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
    addTechStackInformation(enhancedData, techStack) {
        // Add tech stack as metadata
        enhancedData.metadata.techStack = techStack;
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
    addTechStackNode(enhancedData, item, type) {
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
                level: 'low',
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
    async handleNodeClick(interaction, state) {
        const nodeData = interaction.data;
        if (nodeData.type === 'module') {
            // Toggle module expansion
            await this.handleModuleExpand(interaction, state);
        }
        else if (nodeData.type === 'file') {
            // Show file details or open file
            await this.showFileDetails(nodeData);
        }
    }
    /**
     * Handle node hover interactions
     */
    async handleNodeHover(interaction, state) {
        // Log hover for analytics
        this.outputChannel.appendLine(`Node hovered: ${interaction.target}`);
    }
    /**
     * Handle module expansion/collapse
     */
    async handleModuleExpand(interaction, state) {
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
    async handleComplexityFilter(interaction, state) {
        const filterLevel = interaction.data.level;
        this.outputChannel.appendLine(`Complexity filter applied: ${filterLevel}`);
    }
    /**
     * Show file details
     */
    async showFileDetails(nodeData) {
        if (nodeData.path && nodeData.path !== 'techstack' && nodeData.path !== 'frameworks') {
            // Try to open the file in editor
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
     * Dispose resources
     */
    dispose() {
        this.moduleHierarchy = {};
        this.projectStructure = {};
    }
}
exports.FullCodeAnalysisController = FullCodeAnalysisController;
//# sourceMappingURL=full-code-analysis-controller.js.map