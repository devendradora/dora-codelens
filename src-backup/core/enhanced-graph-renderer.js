"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedGraphRenderer = void 0;
const dedicated_analysis_types_1 = require("../types/dedicated-analysis-types");
/**
 * Enhanced graph renderer that renders modules as rectangles, files as complexity-colored circles,
 * and dependencies as arrows
 */
class EnhancedGraphRenderer {
    constructor() {
        this.cytoscapeInstance = null;
    }
    /**
     * Render enhanced graph with modules as rectangles and files as circles
     */
    async renderGraph(data, state) {
        try {
            const cytoscapeElements = this.transformToCytoscapeElements(data, state);
            const cytoscapeStyle = this.generateCytoscapeStyle();
            const layoutConfig = this.generateLayoutConfig(state.layoutSettings);
            return this.generateGraphHTML(cytoscapeElements, cytoscapeStyle, layoutConfig, state);
        }
        catch (error) {
            throw new Error(`Failed to render enhanced graph: ${error}`);
        }
    }
    /**
     * Transform enhanced graph data to Cytoscape elements
     */
    transformToCytoscapeElements(data, state) {
        const elements = [];
        // Add module nodes (rectangles)
        if (state.filterSettings.showModules) {
            data.modules.flatList.forEach(module => {
                if (this.shouldShowModule(module, state)) {
                    elements.push(this.createModuleElement(module));
                }
            });
        }
        // Add file nodes (circles)
        if (state.filterSettings.showFiles) {
            data.files.files.forEach(file => {
                if (this.shouldShowFile(file, state)) {
                    elements.push(this.createFileElement(file));
                }
            });
        }
        // Add dependency edges (arrows)
        data.dependencies.edges.forEach(edge => {
            if (this.shouldShowDependency(edge, state)) {
                elements.push(this.createDependencyElement(edge));
            }
        });
        return elements;
    }
    /**
     * Create module element (rectangle)
     */
    createModuleElement(module) {
        return {
            group: 'nodes',
            data: {
                id: module.id,
                label: module.name,
                type: 'module',
                path: module.path,
                fileCount: module.files.length,
                subModuleCount: module.subModules.length,
                complexity: module.complexity,
                isExpanded: module.isExpanded,
                level: module.level
            },
            position: module.position,
            classes: ['module-node', `level-${module.level}`, module.isExpanded ? 'expanded' : 'collapsed']
        };
    }
    /**
     * Create file element (circle)
     */
    createFileElement(file) {
        const complexityColor = this.getComplexityColor(file.complexity.level);
        return {
            group: 'nodes',
            data: {
                id: file.id,
                label: file.name,
                type: 'file',
                path: file.path,
                module: file.module,
                language: file.language,
                complexity: file.complexity,
                complexityColor: complexityColor,
                isHighlighted: file.isHighlighted,
                metadata: file.metadata
            },
            position: file.position,
            classes: [
                'file-node',
                `complexity-${file.complexity.level}`,
                `language-${file.language}`,
                file.isHighlighted ? 'highlighted' : ''
            ].filter(Boolean)
        };
    }
    /**
     * Create dependency element (arrow)
     */
    createDependencyElement(edge) {
        return {
            group: 'edges',
            data: {
                id: edge.id,
                source: edge.source,
                target: edge.target,
                type: edge.type,
                weight: edge.weight,
                metadata: edge.metadata
            },
            classes: [`dependency-${edge.type}`, `weight-${this.getWeightClass(edge.weight)}`]
        };
    }
    /**
     * Generate Cytoscape style configuration
     */
    generateCytoscapeStyle() {
        return [
            // Module styles (rectangles)
            {
                selector: '.module-node',
                style: {
                    'shape': 'rectangle',
                    'width': 'data(fileCount * 20 + 80)',
                    'height': 'data(subModuleCount * 15 + 60)',
                    'background-color': 'var(--vscode-editor-inactiveSelectionBackground)',
                    'border-width': 2,
                    'border-color': 'var(--vscode-panel-border)',
                    'border-style': 'solid',
                    'label': 'data(label)',
                    'text-valign': 'top',
                    'text-halign': 'center',
                    'font-size': '12px',
                    'font-weight': 'bold',
                    'color': 'var(--vscode-editor-foreground)',
                    'text-margin-y': -5,
                    'opacity': 0.9,
                    'z-index': 1
                }
            },
            {
                selector: '.module-node.expanded',
                style: {
                    'border-color': 'var(--vscode-focusBorder)',
                    'border-width': 3,
                    'box-shadow': '0 0 10px rgba(0, 122, 255, 0.3)'
                }
            },
            {
                selector: '.module-node:hover',
                style: {
                    'border-color': 'var(--vscode-focusBorder)',
                    'opacity': 1
                }
            },
            // File styles (circles)
            {
                selector: '.file-node',
                style: {
                    'shape': 'ellipse',
                    'width': 'data(complexity.linesOfCode / 10 + 20)',
                    'height': 'data(complexity.linesOfCode / 10 + 20)',
                    'background-color': 'data(complexityColor)',
                    'border-width': 2,
                    'border-color': 'rgba(255, 255, 255, 0.2)',
                    'border-style': 'solid',
                    'label': 'data(label)',
                    'text-valign': 'bottom',
                    'text-halign': 'center',
                    'font-size': '10px',
                    'color': 'var(--vscode-editor-foreground)',
                    'text-margin-y': 5,
                    'z-index': 2,
                    'transition-property': 'all',
                    'transition-duration': '0.2s'
                }
            },
            {
                selector: '.file-node.complexity-low',
                style: {
                    'background-color': dedicated_analysis_types_1.defaultComplexityColors.low.color
                }
            },
            {
                selector: '.file-node.complexity-medium',
                style: {
                    'background-color': dedicated_analysis_types_1.defaultComplexityColors.medium.color
                }
            },
            {
                selector: '.file-node.complexity-high',
                style: {
                    'background-color': dedicated_analysis_types_1.defaultComplexityColors.high.color
                }
            },
            {
                selector: '.file-node.highlighted',
                style: {
                    'border-color': 'var(--vscode-focusBorder)',
                    'border-width': 4,
                    'box-shadow': '0 0 15px rgba(0, 122, 255, 0.5)'
                }
            },
            {
                selector: '.file-node:hover',
                style: {
                    'transform': 'scale(1.1)',
                    'border-color': 'var(--vscode-focusBorder)',
                    'z-index': 10
                }
            },
            // Dependency styles (arrows)
            {
                selector: 'edge',
                style: {
                    'width': 'data(weight)',
                    'line-color': 'var(--vscode-panel-border)',
                    'target-arrow-color': 'var(--vscode-panel-border)',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                    'opacity': 0.7,
                    'z-index': 0,
                    'transition-property': 'all',
                    'transition-duration': '0.2s'
                }
            },
            {
                selector: '.dependency-import',
                style: {
                    'line-color': '#4CAF50',
                    'target-arrow-color': '#4CAF50',
                    'line-style': 'solid'
                }
            },
            {
                selector: '.dependency-call',
                style: {
                    'line-color': '#2196F3',
                    'target-arrow-color': '#2196F3',
                    'line-style': 'dashed'
                }
            },
            {
                selector: '.dependency-inheritance',
                style: {
                    'line-color': '#FF9800',
                    'target-arrow-color': '#FF9800',
                    'line-style': 'dotted',
                    'target-arrow-shape': 'diamond'
                }
            },
            {
                selector: 'edge:hover',
                style: {
                    'opacity': 1,
                    'width': 'data(weight * 1.5)',
                    'z-index': 5
                }
            },
            // Selected states
            {
                selector: ':selected',
                style: {
                    'border-color': 'var(--vscode-focusBorder)',
                    'border-width': 4,
                    'opacity': 1
                }
            }
        ];
    }
    /**
     * Generate layout configuration
     */
    generateLayoutConfig(layoutSettings) {
        const baseConfig = {
            name: layoutSettings.algorithm,
            animate: true,
            animationDuration: 500,
            fit: true,
            padding: 30
        };
        switch (layoutSettings.algorithm) {
            case 'dagre':
                return {
                    ...baseConfig,
                    rankDir: layoutSettings.direction,
                    nodeSep: layoutSettings.spacing,
                    rankSep: layoutSettings.spacing * 1.5,
                    edgeSep: layoutSettings.spacing / 2
                };
            case 'cose':
                return {
                    ...baseConfig,
                    nodeRepulsion: layoutSettings.spacing * 1000,
                    idealEdgeLength: layoutSettings.spacing,
                    edgeElasticity: 100
                };
            case 'grid':
                return {
                    ...baseConfig,
                    rows: Math.ceil(Math.sqrt(100)),
                    cols: Math.ceil(Math.sqrt(100))
                };
            case 'circle':
                return {
                    ...baseConfig,
                    radius: layoutSettings.spacing * 5
                };
            default:
                return baseConfig;
        }
    }
    /**
     * Generate complete HTML for the graph
     */
    generateGraphHTML(elements, style, layout, state) {
        return `
            <div class="enhanced-graph-container">
                ${this.generateGraphToolbar(state)}
                <div id="enhanced-graph" class="graph-viewport"></div>
                ${this.generateComplexityLegend()}
                ${this.generateGraphTooltip()}
            </div>
            
            <script>
                (function() {
                    const elements = ${JSON.stringify(elements)};
                    const style = ${JSON.stringify(style)};
                    const layout = ${JSON.stringify(layout)};
                    const state = ${JSON.stringify(state)};
                    
                    // Initialize enhanced graph
                    initializeEnhancedGraph(elements, style, layout, state);
                })();
            </script>
        `;
    }
    /**
     * Generate graph toolbar with controls
     */
    generateGraphToolbar(state) {
        return `
            <div class="graph-toolbar">
                <div class="toolbar-section">
                    <input type="text" 
                           id="graph-search" 
                           placeholder="Search nodes..." 
                           value="${state.searchQuery}"
                           class="search-input">
                    <button id="search-clear" class="toolbar-btn" title="Clear Search">✕</button>
                </div>
                
                <div class="toolbar-section">
                    <button id="zoom-in" class="toolbar-btn" title="Zoom In">🔍+</button>
                    <button id="zoom-out" class="toolbar-btn" title="Zoom Out">🔍-</button>
                    <button id="fit-graph" class="toolbar-btn" title="Fit to View">📐</button>
                    <button id="reset-graph" class="toolbar-btn" title="Reset View">🔄</button>
                </div>
                
                <div class="toolbar-section">
                    <select id="complexity-filter" class="filter-select">
                        <option value="all" ${state.filterSettings.complexityFilter === 'all' ? 'selected' : ''}>All Complexity</option>
                        <option value="low" ${state.filterSettings.complexityFilter === 'low' ? 'selected' : ''}>Low Complexity</option>
                        <option value="medium" ${state.filterSettings.complexityFilter === 'medium' ? 'selected' : ''}>Medium Complexity</option>
                        <option value="high" ${state.filterSettings.complexityFilter === 'high' ? 'selected' : ''}>High Complexity</option>
                    </select>
                    
                    <select id="dependency-filter" class="filter-select">
                        <option value="all" ${state.filterSettings.dependencyFilter === 'all' ? 'selected' : ''}>All Dependencies</option>
                        <option value="imports" ${state.filterSettings.dependencyFilter === 'imports' ? 'selected' : ''}>Imports Only</option>
                        <option value="calls" ${state.filterSettings.dependencyFilter === 'calls' ? 'selected' : ''}>Calls Only</option>
                    </select>
                </div>
                
                <div class="toolbar-section">
                    <select id="layout-algorithm" class="layout-select">
                        <option value="dagre" ${state.layoutSettings.algorithm === 'dagre' ? 'selected' : ''}>Hierarchical</option>
                        <option value="cose" ${state.layoutSettings.algorithm === 'cose' ? 'selected' : ''}>Force-Directed</option>
                        <option value="grid" ${state.layoutSettings.algorithm === 'grid' ? 'selected' : ''}>Grid</option>
                        <option value="circle" ${state.layoutSettings.algorithm === 'circle' ? 'selected' : ''}>Circle</option>
                    </select>
                </div>
            </div>
        `;
    }
    /**
     * Generate complexity legend
     */
    generateComplexityLegend() {
        return `
            <div class="complexity-legend">
                <h4>Complexity Legend</h4>
                <div class="legend-items">
                    <div class="legend-item">
                        <span class="legend-color" style="background-color: ${dedicated_analysis_types_1.defaultComplexityColors.low.color}"></span>
                        <span class="legend-label">Low (${dedicated_analysis_types_1.defaultComplexityColors.low.range[0]}-${dedicated_analysis_types_1.defaultComplexityColors.low.range[1]})</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background-color: ${dedicated_analysis_types_1.defaultComplexityColors.medium.color}"></span>
                        <span class="legend-label">Medium (${dedicated_analysis_types_1.defaultComplexityColors.medium.range[0]}-${dedicated_analysis_types_1.defaultComplexityColors.medium.range[1]})</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background-color: ${dedicated_analysis_types_1.defaultComplexityColors.high.color}"></span>
                        <span class="legend-label">High (${dedicated_analysis_types_1.defaultComplexityColors.high.range[0]}+)</span>
                    </div>
                </div>
                <div class="legend-shapes">
                    <div class="legend-item">
                        <span class="legend-shape module-shape"></span>
                        <span class="legend-label">Modules</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-shape file-shape"></span>
                        <span class="legend-label">Files</span>
                    </div>
                </div>
            </div>
        `;
    }
    /**
     * Generate tooltip container
     */
    generateGraphTooltip() {
        return `
            <div id="graph-tooltip" class="graph-tooltip" style="display: none;">
                <div class="tooltip-content"></div>
            </div>
        `;
    }
    /**
     * Get complexity color based on level
     */
    getComplexityColor(level) {
        return dedicated_analysis_types_1.defaultComplexityColors[level]?.color || dedicated_analysis_types_1.defaultComplexityColors.unknown.color;
    }
    /**
     * Get weight class for dependency styling
     */
    getWeightClass(weight) {
        if (weight <= 1) {
            return 'light';
        }
        if (weight <= 3) {
            return 'medium';
        }
        return 'heavy';
    }
    /**
     * Check if module should be shown based on filters
     */
    shouldShowModule(module, state) {
        if (!state.filterSettings.showModules) {
            return false;
        }
        // Apply search filter
        if (state.searchQuery && !module.name.toLowerCase().includes(state.searchQuery.toLowerCase())) {
            return false;
        }
        return true;
    }
    /**
     * Check if file should be shown based on filters
     */
    shouldShowFile(file, state) {
        if (!state.filterSettings.showFiles) {
            return false;
        }
        // Apply complexity filter
        if (state.filterSettings.complexityFilter !== 'all' &&
            file.complexity.level !== state.filterSettings.complexityFilter) {
            return false;
        }
        // Apply search filter
        if (state.searchQuery && !file.name.toLowerCase().includes(state.searchQuery.toLowerCase())) {
            return false;
        }
        return true;
    }
    /**
     * Check if dependency should be shown based on filters
     */
    shouldShowDependency(edge, state) {
        // Apply dependency type filter
        if (state.filterSettings.dependencyFilter !== 'all') {
            if (state.filterSettings.dependencyFilter === 'imports' && edge.type !== 'import') {
                return false;
            }
            if (state.filterSettings.dependencyFilter === 'calls' && edge.type !== 'call') {
                return false;
            }
        }
        return true;
    }
    /**
     * Dispose resources
     */
    dispose() {
        if (this.cytoscapeInstance) {
            this.cytoscapeInstance.destroy();
            this.cytoscapeInstance = null;
        }
    }
}
exports.EnhancedGraphRenderer = EnhancedGraphRenderer;
//# sourceMappingURL=enhanced-graph-renderer.js.map