/**
 * Enhanced Graph Controls for Dedicated Analysis Views
 * Provides interactive controls for zoom, pan, reset, node expansion/collapse, and hover tooltips
 */

class EnhancedGraphControls {
    constructor() {
        this.cy = null;
        this.tooltip = null;
        this.searchResults = [];
        this.currentState = {
            zoomLevel: 1.0,
            searchQuery: '',
            selectedNodes: [],
            expandedModules: new Set()
        };
        
        this.initializeTooltip();
        this.setupEventListeners();
    }

    /**
     * Initialize the enhanced graph with Cytoscape
     */
    initializeEnhancedGraph(elements, style, layout, state) {
        try {
            // Destroy existing instance if it exists
            if (this.cy) {
                this.cy.destroy();
            }

            // Create new Cytoscape instance
            this.cy = cytoscape({
                container: document.getElementById('enhanced-graph'),
                elements: elements,
                style: style,
                layout: layout,
                
                // Interaction settings
                zoomingEnabled: true,
                panningEnabled: true,
                selectionType: 'single',
                
                // Performance settings
                hideEdgesOnViewport: elements.length > 500,
                textureOnViewport: elements.length > 1000,
                motionBlur: true,
                
                // Viewport settings
                minZoom: 0.1,
                maxZoom: 5.0,
                wheelSensitivity: 0.2
            });

            // Apply initial state
            this.applyState(state);
            
            // Setup graph event handlers
            this.setupGraphEventHandlers();
            
            // Setup control event handlers
            this.setupControlEventHandlers();
            
            // Initial fit
            this.cy.fit();
            
            console.log('Enhanced graph initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize enhanced graph:', error);
            this.showError('Failed to initialize graph visualization');
        }
    }

    /**
     * Setup graph event handlers
     */
    setupGraphEventHandlers() {
        if (!this.cy) return;

        // Node events
        this.cy.on('tap', 'node', (event) => {
            const node = event.target;
            this.handleNodeClick(node);
        });

        this.cy.on('mouseover', 'node', (event) => {
            const node = event.target;
            this.handleNodeHover(node, event);
        });

        this.cy.on('mouseout', 'node', () => {
            this.hideTooltip();
        });

        // Edge events
        this.cy.on('tap', 'edge', (event) => {
            const edge = event.target;
            this.handleEdgeClick(edge);
        });

        this.cy.on('mouseover', 'edge', (event) => {
            const edge = event.target;
            this.handleEdgeHover(edge, event);
        });

        this.cy.on('mouseout', 'edge', () => {
            this.hideTooltip();
        });

        // Background events
        this.cy.on('tap', (event) => {
            if (event.target === this.cy) {
                this.handleBackgroundClick();
            }
        });

        // Zoom and pan events
        this.cy.on('zoom', () => {
            this.currentState.zoomLevel = this.cy.zoom();
            this.updateZoomDisplay();
        });

        this.cy.on('pan', () => {
            // Handle pan events if needed
        });

        // Selection events
        this.cy.on('select', 'node', (event) => {
            const node = event.target;
            this.currentState.selectedNodes.push(node.id());
        });

        this.cy.on('unselect', 'node', (event) => {
            const node = event.target;
            const index = this.currentState.selectedNodes.indexOf(node.id());
            if (index > -1) {
                this.currentState.selectedNodes.splice(index, 1);
            }
        });
    }

    /**
     * Setup control event handlers
     */
    setupControlEventHandlers() {
        // Search controls
        const searchInput = document.getElementById('graph-search');
        if (searchInput) {
            searchInput.addEventListener('input', (event) => {
                this.handleSearch(event.target.value);
            });
        }

        const searchClear = document.getElementById('search-clear');
        if (searchClear) {
            searchClear.addEventListener('click', () => {
                this.clearSearch();
            });
        }

        // Zoom controls
        const zoomIn = document.getElementById('zoom-in');
        if (zoomIn) {
            zoomIn.addEventListener('click', () => {
                this.zoomIn();
            });
        }

        const zoomOut = document.getElementById('zoom-out');
        if (zoomOut) {
            zoomOut.addEventListener('click', () => {
                this.zoomOut();
            });
        }

        const fitGraph = document.getElementById('fit-graph');
        if (fitGraph) {
            fitGraph.addEventListener('click', () => {
                this.fit();
            });
        }

        const resetGraph = document.getElementById('reset-graph');
        if (resetGraph) {
            resetGraph.addEventListener('click', () => {
                this.reset();
            });
        }

        // Filter controls
        const complexityFilter = document.getElementById('complexity-filter');
        if (complexityFilter) {
            complexityFilter.addEventListener('change', (event) => {
                this.filterByComplexity(event.target.value);
            });
        }

        const dependencyFilter = document.getElementById('dependency-filter');
        if (dependencyFilter) {
            dependencyFilter.addEventListener('change', (event) => {
                this.filterByDependency(event.target.value);
            });
        }

        // Layout controls
        const layoutAlgorithm = document.getElementById('layout-algorithm');
        if (layoutAlgorithm) {
            layoutAlgorithm.addEventListener('change', (event) => {
                this.changeLayout(event.target.value);
            });
        }
    }

    /**
     * Handle node click events
     */
    handleNodeClick(node) {
        const nodeData = node.data();
        
        if (nodeData.type === 'module') {
            this.toggleModuleExpansion(node);
        } else if (nodeData.type === 'file') {
            this.selectFile(node);
        }

        // Send interaction to extension
        this.sendInteraction('node-click', node.id(), nodeData);
    }

    /**
     * Handle node hover events
     */
    handleNodeHover(node, event) {
        const nodeData = node.data();
        const tooltipContent = this.generateNodeTooltip(nodeData);
        this.showTooltip(tooltipContent, event.renderedPosition || event.position);
    }

    /**
     * Handle edge click events
     */
    handleEdgeClick(edge) {
        const edgeData = edge.data();
        
        // Highlight the dependency path
        this.highlightDependencyPath(edge);
        
        // Send interaction to extension
        this.sendInteraction('edge-click', edge.id(), edgeData);
    }

    /**
     * Handle edge hover events
     */
    handleEdgeHover(edge, event) {
        const edgeData = edge.data();
        const tooltipContent = this.generateEdgeTooltip(edgeData);
        this.showTooltip(tooltipContent, event.renderedPosition || event.position);
    }

    /**
     * Handle background click events
     */
    handleBackgroundClick() {
        // Clear selections
        this.cy.elements().unselect();
        this.currentState.selectedNodes = [];
        
        // Send interaction to extension
        this.sendInteraction('background-click');
    }

    /**
     * Toggle module expansion/collapse
     */
    toggleModuleExpansion(moduleNode) {
        const moduleId = moduleNode.id();
        const isExpanded = this.currentState.expandedModules.has(moduleId);
        
        if (isExpanded) {
            this.collapseModule(moduleNode);
            this.currentState.expandedModules.delete(moduleId);
        } else {
            this.expandModule(moduleNode);
            this.currentState.expandedModules.add(moduleId);
        }
    }

    /**
     * Expand module to show its contents
     */
    expandModule(moduleNode) {
        moduleNode.addClass('expanded');
        
        // Show child nodes (files within the module)
        const moduleData = moduleNode.data();
        const childNodes = this.cy.nodes().filter(node => {
            const nodeData = node.data();
            return nodeData.type === 'file' && nodeData.module === moduleData.path;
        });
        
        childNodes.style('display', 'element');
        
        // Animate expansion
        moduleNode.animate({
            style: {
                'border-width': 4,
                'border-color': 'var(--vscode-focusBorder)'
            }
        }, {
            duration: 300
        });
    }

    /**
     * Collapse module to hide its contents
     */
    collapseModule(moduleNode) {
        moduleNode.removeClass('expanded');
        
        // Hide child nodes
        const moduleData = moduleNode.data();
        const childNodes = this.cy.nodes().filter(node => {
            const nodeData = node.data();
            return nodeData.type === 'file' && nodeData.module === moduleData.path;
        });
        
        childNodes.style('display', 'none');
        
        // Animate collapse
        moduleNode.animate({
            style: {
                'border-width': 2,
                'border-color': 'var(--vscode-panel-border)'
            }
        }, {
            duration: 300
        });
    }

    /**
     * Select and highlight a file
     */
    selectFile(fileNode) {
        // Clear previous selections
        this.cy.elements().unselect();
        
        // Select the file
        fileNode.select();
        
        // Highlight related dependencies
        this.highlightFileDependencies(fileNode);
    }

    /**
     * Highlight dependencies for a file
     */
    highlightFileDependencies(fileNode) {
        const fileId = fileNode.id();
        
        // Find connected edges
        const connectedEdges = fileNode.connectedEdges();
        
        // Highlight the file and its dependencies
        fileNode.addClass('highlighted');
        connectedEdges.addClass('highlighted');
        
        // Highlight connected nodes
        connectedEdges.connectedNodes().addClass('dependency-highlighted');
    }

    /**
     * Highlight dependency path
     */
    highlightDependencyPath(edge) {
        // Clear previous highlights
        this.cy.elements().removeClass('path-highlighted');
        
        // Highlight the edge and connected nodes
        edge.addClass('path-highlighted');
        edge.connectedNodes().addClass('path-highlighted');
    }

    /**
     * Search functionality
     */
    handleSearch(query) {
        this.currentState.searchQuery = query;
        
        if (!query.trim()) {
            this.clearSearchHighlights();
            return;
        }
        
        // Clear previous search results
        this.clearSearchHighlights();
        
        // Find matching nodes
        const matchingNodes = this.cy.nodes().filter(node => {
            const nodeData = node.data();
            const searchText = (nodeData.label || nodeData.name || '').toLowerCase();
            return searchText.includes(query.toLowerCase());
        });
        
        // Highlight matching nodes
        matchingNodes.addClass('search-result');
        this.searchResults = matchingNodes.map(node => node.id());
        
        // Focus on search results if any found
        if (matchingNodes.length > 0) {
            this.cy.fit(matchingNodes, 50);
        }
    }

    /**
     * Clear search
     */
    clearSearch() {
        const searchInput = document.getElementById('graph-search');
        if (searchInput) {
            searchInput.value = '';
        }
        
        this.currentState.searchQuery = '';
        this.clearSearchHighlights();
    }

    /**
     * Clear search highlights
     */
    clearSearchHighlights() {
        this.cy.elements().removeClass('search-result');
        this.searchResults = [];
    }

    /**
     * Zoom controls
     */
    zoomIn() {
        if (this.cy) {
            this.cy.zoom(this.cy.zoom() * 1.2);
            this.cy.center();
        }
    }

    zoomOut() {
        if (this.cy) {
            this.cy.zoom(this.cy.zoom() * 0.8);
            this.cy.center();
        }
    }

    fit() {
        if (this.cy) {
            this.cy.fit();
        }
    }

    reset() {
        if (this.cy) {
            // Reset zoom and pan
            this.cy.fit();
            this.cy.center();
            
            // Clear selections and highlights
            this.cy.elements().unselect();
            this.cy.elements().removeClass('highlighted dependency-highlighted path-highlighted search-result');
            
            // Reset state
            this.currentState.selectedNodes = [];
            this.currentState.expandedModules.clear();
            
            // Clear search
            this.clearSearch();
        }
    }

    /**
     * Filter by complexity level
     */
    filterByComplexity(level) {
        if (!this.cy) return;
        
        if (level === 'all') {
            this.cy.nodes('[type="file"]').style('display', 'element');
        } else {
            // Hide all file nodes first
            this.cy.nodes('[type="file"]').style('display', 'none');
            
            // Show only nodes with matching complexity
            this.cy.nodes(`[type="file"].complexity-${level}`).style('display', 'element');
        }
    }

    /**
     * Filter by dependency type
     */
    filterByDependency(type) {
        if (!this.cy) return;
        
        if (type === 'all') {
            this.cy.edges().style('display', 'element');
        } else {
            // Hide all edges first
            this.cy.edges().style('display', 'none');
            
            // Show only edges with matching type
            this.cy.edges(`.dependency-${type}`).style('display', 'element');
        }
    }

    /**
     * Change layout algorithm
     */
    changeLayout(algorithm) {
        if (!this.cy) return;
        
        let layoutOptions = {
            name: algorithm,
            animate: true,
            animationDuration: 1000,
            fit: true,
            padding: 30
        };
        
        // Algorithm-specific options
        switch (algorithm) {
            case 'dagre':
                layoutOptions = {
                    ...layoutOptions,
                    rankDir: 'TB',
                    nodeSep: 50,
                    rankSep: 75
                };
                break;
            case 'cose':
                layoutOptions = {
                    ...layoutOptions,
                    nodeRepulsion: 400000,
                    idealEdgeLength: 100,
                    edgeElasticity: 100
                };
                break;
            case 'grid':
                layoutOptions = {
                    ...layoutOptions,
                    rows: Math.ceil(Math.sqrt(this.cy.nodes().length)),
                    cols: Math.ceil(Math.sqrt(this.cy.nodes().length))
                };
                break;
            case 'circle':
                layoutOptions = {
                    ...layoutOptions,
                    radius: 200
                };
                break;
        }
        
        const layout = this.cy.layout(layoutOptions);
        layout.run();
    }

    /**
     * Tooltip functionality
     */
    initializeTooltip() {
        this.tooltip = document.getElementById('graph-tooltip');
        if (!this.tooltip) {
            this.tooltip = document.createElement('div');
            this.tooltip.id = 'graph-tooltip';
            this.tooltip.className = 'graph-tooltip';
            this.tooltip.style.display = 'none';
            document.body.appendChild(this.tooltip);
        }
    }

    showTooltip(content, position) {
        if (!this.tooltip) return;
        
        const tooltipContent = this.tooltip.querySelector('.tooltip-content');
        if (tooltipContent) {
            tooltipContent.innerHTML = content;
        } else {
            this.tooltip.innerHTML = `<div class="tooltip-content">${content}</div>`;
        }
        
        // Position tooltip
        this.tooltip.style.left = (position.x + 10) + 'px';
        this.tooltip.style.top = (position.y - 10) + 'px';
        this.tooltip.style.display = 'block';
    }

    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.style.display = 'none';
        }
    }

    /**
     * Generate tooltip content for nodes
     */
    generateNodeTooltip(nodeData) {
        if (nodeData.type === 'module') {
            return `
                <div class="tooltip-header">Module: ${nodeData.label}</div>
                <div class="tooltip-body">
                    <div><strong>Path:</strong> ${nodeData.path}</div>
                    <div><strong>Files:</strong> ${nodeData.fileCount || 0}</div>
                    <div><strong>Submodules:</strong> ${nodeData.subModuleCount || 0}</div>
                    <div><strong>Complexity:</strong> ${nodeData.complexity?.level || 'Unknown'}</div>
                </div>
            `;
        } else if (nodeData.type === 'file') {
            return `
                <div class="tooltip-header">File: ${nodeData.label}</div>
                <div class="tooltip-body">
                    <div><strong>Path:</strong> ${nodeData.path}</div>
                    <div><strong>Language:</strong> ${nodeData.language}</div>
                    <div><strong>Lines of Code:</strong> ${nodeData.complexity?.linesOfCode || 0}</div>
                    <div><strong>Cyclomatic Complexity:</strong> ${nodeData.complexity?.cyclomaticComplexity || 0}</div>
                    <div><strong>Maintainability:</strong> ${nodeData.complexity?.maintainabilityIndex || 0}</div>
                </div>
            `;
        } else if (nodeData.language === 'contributor') {
            return `
                <div class="tooltip-header">Contributor: ${nodeData.label}</div>
                <div class="tooltip-body">
                    <div><strong>Commits:</strong> ${nodeData.metadata?.functions || 0}</div>
                    <div><strong>Lines Added:</strong> ${nodeData.complexity?.linesOfCode || 0}</div>
                    <div><strong>Activity Score:</strong> ${nodeData.complexity?.score || 0}</div>
                </div>
            `;
        }
        return `<div class="tooltip-header">${nodeData.label || 'Unknown'}</div>`;
    }

    /**
     * Generate tooltip content for edges
     */
    generateEdgeTooltip(edgeData) {
        return `
            <div class="tooltip-header">Dependency: ${edgeData.type || 'Unknown'}</div>
            <div class="tooltip-body">
                <div><strong>From:</strong> ${edgeData.source}</div>
                <div><strong>To:</strong> ${edgeData.target}</div>
                <div><strong>Weight:</strong> ${edgeData.weight || 1}</div>
                <div><strong>Strength:</strong> ${edgeData.metadata?.strength || 'Unknown'}</div>
            </div>
        `;
    }

    /**
     * Apply state to the graph
     */
    applyState(state) {
        if (!state || !this.cy) return;
        
        // Apply zoom level
        if (state.zoomLevel) {
            this.cy.zoom(state.zoomLevel);
        }
        
        // Apply search query
        if (state.searchQuery) {
            this.handleSearch(state.searchQuery);
        }
        
        // Apply selected nodes
        if (state.selectedNodes && state.selectedNodes.length > 0) {
            state.selectedNodes.forEach(nodeId => {
                const node = this.cy.getElementById(nodeId);
                if (node.length > 0) {
                    node.select();
                }
            });
        }
    }

    /**
     * Update zoom display
     */
    updateZoomDisplay() {
        // Update zoom level display if there's a zoom indicator
        const zoomIndicator = document.getElementById('zoom-level');
        if (zoomIndicator) {
            zoomIndicator.textContent = `${Math.round(this.currentState.zoomLevel * 100)}%`;
        }
    }

    /**
     * Send interaction to VS Code extension
     */
    sendInteraction(type, target = null, data = null) {
        if (typeof vscode !== 'undefined') {
            vscode.postMessage({
                command: 'graphInteraction',
                interaction: {
                    type,
                    target,
                    data,
                    position: this.cy ? { x: this.cy.pan().x, y: this.cy.pan().y } : null
                }
            });
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const container = document.getElementById('enhanced-graph');
        if (container) {
            container.innerHTML = `
                <div class="graph-error">
                    <div class="error-icon">⚠️</div>
                    <div class="error-message">${message}</div>
                    <button onclick="location.reload()" class="retry-btn">Retry</button>
                </div>
            `;
        }
    }

    /**
     * Setup event listeners for the controls
     */
    setupEventListeners() {
        // Listen for messages from VS Code
        if (typeof window !== 'undefined') {
            window.addEventListener('message', (event) => {
                const message = event.data;
                
                switch (message.command) {
                    case 'updateGraph':
                        if (message.elements && message.style && message.layout) {
                            this.initializeEnhancedGraph(
                                message.elements,
                                message.style,
                                message.layout,
                                message.state
                            );
                        }
                        break;
                    case 'updateState':
                        this.applyState(message.state);
                        break;
                    case 'highlightNodes':
                        this.highlightNodes(message.nodeIds);
                        break;
                    case 'clearHighlights':
                        this.clearAllHighlights();
                        break;
                }
            });
        }
    }

    /**
     * Highlight specific nodes
     */
    highlightNodes(nodeIds) {
        if (!this.cy || !nodeIds) return;
        
        // Clear previous highlights
        this.clearAllHighlights();
        
        // Highlight specified nodes
        nodeIds.forEach(nodeId => {
            const node = this.cy.getElementById(nodeId);
            if (node.length > 0) {
                node.addClass('highlighted');
            }
        });
    }

    /**
     * Clear all highlights
     */
    clearAllHighlights() {
        if (this.cy) {
            this.cy.elements().removeClass('highlighted dependency-highlighted path-highlighted search-result');
        }
    }
}

// Global instance
let enhancedGraphControls = null;

/**
 * Initialize enhanced graph (called from HTML)
 */
function initializeEnhancedGraph(elements, style, layout, state) {
    if (!enhancedGraphControls) {
        enhancedGraphControls = new EnhancedGraphControls();
    }
    
    enhancedGraphControls.initializeEnhancedGraph(elements, style, layout, state);
}

/**
 * Request analysis (called from HTML buttons)
 */
function requestAnalysis(viewType) {
    if (typeof vscode !== 'undefined') {
        vscode.postMessage({
            command: 'requestAnalysis',
            viewType: viewType
        });
    }
}

/**
 * Retry analysis (called from HTML buttons)
 */
function retryAnalysis(viewType) {
    if (typeof vscode !== 'undefined') {
        vscode.postMessage({
            command: 'retryAnalysis',
            viewType: viewType
        });
    }
}

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnhancedGraphControls, initializeEnhancedGraph };
}