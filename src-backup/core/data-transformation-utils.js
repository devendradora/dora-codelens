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
exports.DataTransformationUtils = void 0;
const path = __importStar(require("path"));
const dedicated_analysis_types_1 = require("../types/dedicated-analysis-types");
/**
 * Utility functions for transforming existing analysis data to enhanced graph format
 */
class DataTransformationUtils {
    /**
     * Transform legacy analysis data to enhanced graph format
     */
    static transformLegacyAnalysisData(legacyData) {
        const enhancedData = {
            modules: {
                root: DataTransformationUtils.createEmptyModuleNode('root', 'Root', '/', 0),
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
                analysisType: 'fullCode',
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
        // Transform modules if present
        if (legacyData.modules) {
            DataTransformationUtils.transformModules(legacyData.modules, enhancedData);
        }
        // Transform functions as files if present
        if (legacyData.functions) {
            DataTransformationUtils.transformFunctionsAsFiles(legacyData.functions, enhancedData);
        }
        // Transform dependencies if present
        if (legacyData.dependencies || legacyData.calls) {
            DataTransformationUtils.transformDependencies(legacyData.dependencies || legacyData.calls, enhancedData);
        }
        // Calculate statistics
        DataTransformationUtils.calculateStatistics(enhancedData);
        return enhancedData;
    }
    /**
     * Transform Cytoscape.js data to enhanced graph format
     */
    static transformCytoscapeData(cytoscapeData) {
        const enhancedData = DataTransformationUtils.createBaseEnhancedGraphData();
        if (cytoscapeData.elements) {
            const nodes = cytoscapeData.elements.filter((el) => el.group === 'nodes');
            const edges = cytoscapeData.elements.filter((el) => el.group === 'edges');
            // Transform nodes
            for (const node of nodes) {
                if (node.data.type === 'module' || node.classes?.includes('module')) {
                    DataTransformationUtils.addModuleFromCytoscape(node, enhancedData);
                }
                else {
                    DataTransformationUtils.addFileFromCytoscape(node, enhancedData);
                }
            }
            // Transform edges
            for (const edge of edges) {
                DataTransformationUtils.addDependencyFromCytoscape(edge, enhancedData);
            }
        }
        DataTransformationUtils.calculateStatistics(enhancedData);
        return enhancedData;
    }
    /**
     * Transform tech stack data to enhanced graph format
     */
    static transformTechStackData(techStackData) {
        const enhancedData = DataTransformationUtils.createBaseEnhancedGraphData();
        // Create nodes for frameworks and libraries
        if (techStackData.frameworks) {
            for (const framework of techStackData.frameworks) {
                DataTransformationUtils.addTechStackItem(framework, 'framework', enhancedData);
            }
        }
        if (techStackData.libraries) {
            for (const library of techStackData.libraries) {
                DataTransformationUtils.addTechStackItem(library, 'library', enhancedData);
            }
        }
        // Create dependencies between tech stack items
        DataTransformationUtils.createTechStackDependencies(techStackData, enhancedData);
        DataTransformationUtils.calculateStatistics(enhancedData);
        return enhancedData;
    }
    /**
     * Convert enhanced graph data back to Cytoscape format
     */
    static convertToGraphElements(enhancedData) {
        const elements = [];
        // Add module nodes
        for (const module of enhancedData.modules.flatList) {
            elements.push({
                group: 'nodes',
                data: {
                    ...module,
                    label: module.name,
                    type: 'module'
                },
                position: module.position,
                classes: ['module-node', `level-${module.level}`]
            });
        }
        // Add file nodes
        for (const file of enhancedData.files.files.values()) {
            elements.push({
                group: 'nodes',
                data: {
                    ...file,
                    label: file.name,
                    type: 'file',
                    complexityColor: file.complexity.color
                },
                position: file.position,
                classes: [
                    'file-node',
                    `complexity-${file.complexity.level}`,
                    `language-${file.language}`
                ]
            });
        }
        // Add dependency edges
        for (const edge of enhancedData.dependencies.edges) {
            elements.push({
                group: 'edges',
                data: {
                    ...edge
                },
                classes: [`dependency-${edge.type}`]
            });
        }
        return elements;
    }
    /**
     * Normalize node positions to fit within viewport
     */
    static normalizePositions(enhancedData, viewport) {
        const allNodes = [
            ...enhancedData.modules.flatList,
            ...Array.from(enhancedData.files.files.values())
        ];
        if (allNodes.length === 0) {
            return;
        }
        // Find bounds
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        for (const node of allNodes) {
            minX = Math.min(minX, node.position.x);
            maxX = Math.max(maxX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxY = Math.max(maxY, node.position.y);
        }
        // Calculate scale and offset
        const dataWidth = maxX - minX || 1;
        const dataHeight = maxY - minY || 1;
        const scaleX = (viewport.width * 0.8) / dataWidth;
        const scaleY = (viewport.height * 0.8) / dataHeight;
        const scale = Math.min(scaleX, scaleY);
        const offsetX = (viewport.width - dataWidth * scale) / 2 - minX * scale;
        const offsetY = (viewport.height - dataHeight * scale) / 2 - minY * scale;
        // Apply normalization
        for (const node of allNodes) {
            node.position.x = node.position.x * scale + offsetX;
            node.position.y = node.position.y * scale + offsetY;
        }
    }
    /**
     * Apply layout algorithm to enhanced graph data
     */
    static applyLayout(enhancedData, algorithm, options = {}) {
        const allNodes = [
            ...enhancedData.modules.flatList,
            ...Array.from(enhancedData.files.files.values())
        ];
        switch (algorithm) {
            case 'grid':
                DataTransformationUtils.applyGridLayout(allNodes, options);
                break;
            case 'circle':
                DataTransformationUtils.applyCircleLayout(allNodes, options);
                break;
            case 'random':
                DataTransformationUtils.applyRandomLayout(allNodes, options);
                break;
            default:
                // Keep existing positions for other algorithms (handled by Cytoscape)
                break;
        }
    }
    // Private helper methods
    static createBaseEnhancedGraphData() {
        return {
            modules: {
                root: DataTransformationUtils.createEmptyModuleNode('root', 'Root', '/', 0),
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
                analysisType: 'fullCode',
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
    static createEmptyModuleNode(id, name, path, level) {
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
    static transformModules(modulesData, enhancedData) {
        if (!modulesData.nodes) {
            return;
        }
        for (const moduleData of modulesData.nodes) {
            const module = {
                id: DataTransformationUtils.generateId('module', moduleData.id || moduleData.name),
                name: moduleData.name || moduleData.id,
                path: moduleData.path || moduleData.id,
                files: [],
                subModules: [],
                position: { x: moduleData.x || 0, y: moduleData.y || 0 },
                size: {
                    width: Math.max(100, (moduleData.size || 1) * 50),
                    height: Math.max(60, (moduleData.size || 1) * 30)
                },
                complexity: {
                    totalFiles: moduleData.fileCount || 0,
                    averageComplexity: moduleData.complexity || 0,
                    maxComplexity: moduleData.maxComplexity || 0,
                    totalLinesOfCode: moduleData.linesOfCode || 0,
                    level: DataTransformationUtils.calculateComplexityLevel(moduleData.complexity || 0)
                },
                isExpanded: false,
                level: DataTransformationUtils.calculateModuleLevel(moduleData.path || moduleData.id)
            };
            enhancedData.modules.flatList.push(module);
        }
    }
    static transformFunctionsAsFiles(functionsData, enhancedData) {
        if (!functionsData.nodes) {
            return;
        }
        for (const functionData of functionsData.nodes) {
            const complexity = functionData.complexity || 0;
            const file = {
                id: DataTransformationUtils.generateId('file', functionData.id || functionData.name),
                name: functionData.name || functionData.id,
                path: functionData.file || functionData.module || functionData.name,
                module: path.dirname(functionData.file || functionData.module || ''),
                complexity: {
                    cyclomaticComplexity: complexity,
                    cognitiveComplexity: functionData.cognitiveComplexity || complexity,
                    linesOfCode: functionData.lines || functionData.size || 10,
                    maintainabilityIndex: functionData.maintainability || 100 - complexity * 5,
                    level: DataTransformationUtils.calculateComplexityLevel(complexity),
                    color: DataTransformationUtils.getComplexityColor(DataTransformationUtils.calculateComplexityLevel(complexity)),
                    score: complexity
                },
                position: { x: functionData.x || 0, y: functionData.y || 0 },
                size: Math.max(20, (functionData.lines || 10) / 5),
                language: DataTransformationUtils.detectLanguage(functionData.file || ''),
                isHighlighted: false,
                metadata: {
                    lastModified: new Date(),
                    author: 'Unknown',
                    functions: 1,
                    classes: 0,
                    imports: functionData.imports || 0
                }
            };
            enhancedData.files.files.set(file.id, file);
        }
    }
    static transformDependencies(dependenciesData, enhancedData) {
        const edges = dependenciesData.edges || dependenciesData.links || [];
        for (const edgeData of edges) {
            const edge = {
                id: DataTransformationUtils.generateId('edge', `${edgeData.source}_${edgeData.target}`),
                source: DataTransformationUtils.generateId('file', edgeData.source),
                target: DataTransformationUtils.generateId('file', edgeData.target),
                type: DataTransformationUtils.determineDependencyType(edgeData),
                weight: edgeData.weight || edgeData.value || 1,
                style: {
                    color: DataTransformationUtils.getDependencyColor(DataTransformationUtils.determineDependencyType(edgeData)),
                    width: Math.max(1, (edgeData.weight || 1) * 2),
                    style: 'solid',
                    arrow: 'triangle',
                    opacity: 0.7
                },
                metadata: {
                    strength: edgeData.strength || edgeData.weight || 1,
                    frequency: edgeData.frequency || 1,
                    isCircular: false,
                    path: [edgeData.source, edgeData.target]
                }
            };
            enhancedData.dependencies.edges.push(edge);
        }
    }
    static addModuleFromCytoscape(node, enhancedData) {
        const module = {
            id: node.data.id,
            name: node.data.label || node.data.name || node.data.id,
            path: node.data.path || node.data.id,
            files: [],
            subModules: [],
            position: node.position || { x: 0, y: 0 },
            size: { width: node.data.width || 100, height: node.data.height || 60 },
            complexity: {
                totalFiles: node.data.fileCount || 0,
                averageComplexity: node.data.complexity || 0,
                maxComplexity: node.data.maxComplexity || 0,
                totalLinesOfCode: node.data.linesOfCode || 0,
                level: DataTransformationUtils.calculateComplexityLevel(node.data.complexity || 0)
            },
            isExpanded: node.data.isExpanded || false,
            level: node.data.level || 0
        };
        enhancedData.modules.flatList.push(module);
    }
    static addFileFromCytoscape(node, enhancedData) {
        const complexity = node.data.complexity || node.data.cyclomaticComplexity || 0;
        const file = {
            id: node.data.id,
            name: node.data.label || node.data.name || node.data.id,
            path: node.data.path || node.data.id,
            module: node.data.module || path.dirname(node.data.path || ''),
            complexity: {
                cyclomaticComplexity: complexity,
                cognitiveComplexity: node.data.cognitiveComplexity || complexity,
                linesOfCode: node.data.linesOfCode || 10,
                maintainabilityIndex: node.data.maintainabilityIndex || 100 - complexity * 5,
                level: DataTransformationUtils.calculateComplexityLevel(complexity),
                color: node.data.complexityColor || DataTransformationUtils.getComplexityColor(DataTransformationUtils.calculateComplexityLevel(complexity)),
                score: complexity
            },
            position: node.position || { x: 0, y: 0 },
            size: node.data.size || 20,
            language: node.data.language || DataTransformationUtils.detectLanguage(node.data.path || ''),
            isHighlighted: node.data.isHighlighted || false,
            metadata: {
                lastModified: new Date(),
                author: node.data.author || 'Unknown',
                functions: node.data.functions || 0,
                classes: node.data.classes || 0,
                imports: node.data.imports || 0
            }
        };
        enhancedData.files.files.set(file.id, file);
    }
    static addDependencyFromCytoscape(edge, enhancedData) {
        const dependency = {
            id: edge.data.id,
            source: edge.data.source,
            target: edge.data.target,
            type: edge.data.type || 'call',
            weight: edge.data.weight || 1,
            style: {
                color: edge.data.color || DataTransformationUtils.getDependencyColor(edge.data.type || 'call'),
                width: edge.data.width || 2,
                style: edge.data.style || 'solid',
                arrow: edge.data.arrow || 'triangle',
                opacity: edge.data.opacity || 0.7
            },
            metadata: {
                strength: edge.data.strength || 1,
                frequency: edge.data.frequency || 1,
                isCircular: edge.data.isCircular || false,
                path: [edge.data.source, edge.data.target]
            }
        };
        enhancedData.dependencies.edges.push(dependency);
    }
    static addTechStackItem(item, type, enhancedData) {
        const itemName = item.name || item;
        const file = {
            id: DataTransformationUtils.generateId('tech', itemName),
            name: itemName,
            path: `${type}:${itemName}`,
            module: type,
            complexity: {
                cyclomaticComplexity: 1,
                cognitiveComplexity: 1,
                linesOfCode: 1,
                maintainabilityIndex: 100,
                level: 'low',
                color: DataTransformationUtils.getTechStackColor(type),
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
                imports: 0
            }
        };
        enhancedData.files.files.set(file.id, file);
    }
    static createTechStackDependencies(techStackData, enhancedData) {
        // Create simple dependencies between frameworks and libraries
        if (techStackData.frameworks && techStackData.libraries) {
            for (const framework of techStackData.frameworks) {
                const frameworkId = DataTransformationUtils.generateId('tech', framework.name || framework);
                for (const library of techStackData.libraries.slice(0, 3)) { // Limit connections
                    const libraryId = DataTransformationUtils.generateId('tech', library.name || library);
                    const edgeId = DataTransformationUtils.generateId('edge', `${frameworkId}_${libraryId}`);
                    const edge = {
                        id: edgeId,
                        source: frameworkId,
                        target: libraryId,
                        type: 'composition',
                        weight: 1,
                        style: {
                            color: '#9C27B0',
                            width: 1,
                            style: 'dashed',
                            arrow: 'triangle',
                            opacity: 0.5
                        },
                        metadata: {
                            strength: 1,
                            frequency: 1,
                            isCircular: false,
                            path: [frameworkId, libraryId]
                        }
                    };
                    enhancedData.dependencies.edges.push(edge);
                }
            }
        }
    }
    static calculateStatistics(enhancedData) {
        // File statistics
        const files = Array.from(enhancedData.files.files.values());
        enhancedData.files.statistics.totalFiles = files.length;
        if (files.length > 0) {
            const totalComplexity = files.reduce((sum, f) => sum + f.complexity.cyclomaticComplexity, 0);
            enhancedData.files.statistics.averageComplexity = totalComplexity / files.length;
            // Language distribution
            const langDist = {};
            files.forEach(f => {
                langDist[f.language] = (langDist[f.language] || 0) + 1;
            });
            enhancedData.files.statistics.languageDistribution = langDist;
            // Complexity distribution
            const complexityDist = { low: 0, medium: 0, high: 0 };
            files.forEach(f => {
                complexityDist[f.complexity.level]++;
            });
            enhancedData.files.statistics.complexityDistribution = complexityDist;
            enhancedData.metadata.complexityDistribution = complexityDist;
        }
        // Module statistics
        enhancedData.modules.statistics.totalModules = enhancedData.modules.flatList.length;
        if (enhancedData.modules.flatList.length > 0) {
            const totalFiles = enhancedData.modules.flatList.reduce((sum, m) => sum + m.complexity.totalFiles, 0);
            enhancedData.modules.statistics.averageFilesPerModule = totalFiles / enhancedData.modules.flatList.length;
        }
        // Dependency statistics
        enhancedData.dependencies.statistics.totalDependencies = enhancedData.dependencies.edges.length;
        // Update metadata
        enhancedData.metadata.totalNodes = enhancedData.modules.flatList.length + files.length;
        enhancedData.metadata.totalEdges = enhancedData.dependencies.edges.length;
    }
    static applyGridLayout(nodes, options) {
        const cols = options.cols || Math.ceil(Math.sqrt(nodes.length));
        const spacing = options.spacing || 100;
        nodes.forEach((node, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            node.position.x = col * spacing;
            node.position.y = row * spacing;
        });
    }
    static applyCircleLayout(nodes, options) {
        const radius = options.radius || 200;
        const centerX = options.centerX || 0;
        const centerY = options.centerY || 0;
        nodes.forEach((node, index) => {
            const angle = (index * 2 * Math.PI) / nodes.length;
            node.position.x = centerX + Math.cos(angle) * radius;
            node.position.y = centerY + Math.sin(angle) * radius;
        });
    }
    static applyRandomLayout(nodes, options) {
        const width = options.width || 800;
        const height = options.height || 600;
        nodes.forEach(node => {
            node.position.x = Math.random() * width - width / 2;
            node.position.y = Math.random() * height - height / 2;
        });
    }
    // Utility helper methods
    static generateId(prefix, path) {
        return `${prefix}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }
    static calculateComplexityLevel(score) {
        if (score <= 5) {
            return 'low';
        }
        if (score <= 10) {
            return 'medium';
        }
        return 'high';
    }
    static calculateModuleLevel(modulePath) {
        return modulePath.split(path.sep).filter(p => p.length > 0).length;
    }
    static determineDependencyType(edgeData) {
        if (edgeData.type) {
            return edgeData.type;
        }
        if (edgeData.label?.includes('import')) {
            return 'import';
        }
        if (edgeData.label?.includes('call')) {
            return 'call';
        }
        if (edgeData.label?.includes('inherit')) {
            return 'inheritance';
        }
        return 'call';
    }
    static getComplexityColor(level) {
        return dedicated_analysis_types_1.defaultComplexityColors[level]?.color || dedicated_analysis_types_1.defaultComplexityColors.unknown.color;
    }
    static getDependencyColor(type) {
        switch (type) {
            case 'import': return '#4CAF50';
            case 'call': return '#2196F3';
            case 'inheritance': return '#FF9800';
            case 'composition': return '#9C27B0';
            default: return '#757575';
        }
    }
    static getTechStackColor(type) {
        switch (type) {
            case 'framework': return '#FF5722';
            case 'library': return '#3F51B5';
            default: return '#607D8B';
        }
    }
    static detectLanguage(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        switch (ext) {
            case '.py': return 'python';
            case '.js': return 'javascript';
            case '.ts': return 'typescript';
            case '.java': return 'java';
            case '.cpp':
            case '.cc':
            case '.cxx': return 'cpp';
            case '.c': return 'c';
            case '.cs': return 'csharp';
            case '.go': return 'go';
            case '.rs': return 'rust';
            default: return 'unknown';
        }
    }
}
exports.DataTransformationUtils = DataTransformationUtils;
//# sourceMappingURL=data-transformation-utils.js.map