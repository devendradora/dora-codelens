/**
 * Database Schema Graph Visualization using Cytoscape.js
 * Provides interactive database schema visualization with table relationships
 */

class DatabaseSchemaGraph {
    constructor() {
        this.cy = null;
        this.currentLayout = 'dagre';
        this.selectedTable = null;
        
        // Color scheme for different elements
        this.colors = {
            table: '#3498db',
            primaryKey: '#e74c3c',
            foreignKey: '#f39c12',
            relationship: '#2ecc71',
            selectedTable: '#9b59b6',
            highlightedTable: '#1abc9c',
            dimmedTable: '#95a5a6'
        };
        
        // Update colors based on VS Code theme
        this.updateThemeColors();
    }
    
    /**
     * Update theme colors based on VS Code theme
     */
    updateThemeColors() {
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);
        
        this.colors = {
            table: computedStyle.getPropertyValue('--vscode-charts-blue') || '#3498db',
            primaryKey: computedStyle.getPropertyValue('--vscode-charts-red') || '#e74c3c',
            foreignKey: computedStyle.getPropertyValue('--vscode-charts-orange') || '#f39c12',
            relationship: computedStyle.getPropertyValue('--vscode-charts-green') || '#2ecc71',
            selectedTable: computedStyle.getPropertyValue('--vscode-charts-purple') || '#9b59b6',
            highlightedTable: computedStyle.getPropertyValue('--vscode-focusBorder') || '#1abc9c',
            dimmedTable: computedStyle.getPropertyValue('--vscode-descriptionForeground') || '#95a5a6',
            background: computedStyle.getPropertyValue('--vscode-editor-background') || '#1e1e1e',
            foreground: computedStyle.getPropertyValue('--vscode-foreground') || '#cccccc',
            border: computedStyle.getPropertyValue('--vscode-widget-border') || '#3c3c3c'
        };
    }
    
    /**
     * Initialize the schema graph
     */
    initializeGraph(containerId, schemaData) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container element with id '${containerId}' not found`);
            }
            
            // Destroy existing instance
            if (this.cy) {
                this.cy.destroy();
                this.cy = null;
            }
            
            // Prepare graph data
            const elements = this.prepareGraphElements(schemaData);
            
            // Initialize Cytoscape
            this.cy = cytoscape({
                container: container,
                elements: elements,
                style: this.getGraphStyle(),
                layout: this.getLayoutConfig(this.currentLayout),
                minZoom: 0.1,
                maxZoom: 3,
                wheelSensitivity: 0.2,
                boxSelectionEnabled: false,
                selectionType: 'single'
            });
            
            // Set up event listeners
            this.setupEventListeners();
            
            console.log('Database schema graph initialized successfully');
            return this.cy;
            
        } catch (error) {
            console.error('Error initializing database schema graph:', error);
            throw error;
        }
    }
    
    /**
     * Prepare graph elements from schema data
     */
    prepareGraphElements(schemaData) {
        const elements = [];
        
        if (!schemaData || !schemaData.tables) {
            return elements;
        }
        
        // Add table nodes
        schemaData.tables.forEach(table => {
            elements.push({
                data: {
                    id: table.name,
                    label: table.name,
                    type: 'table',
                    table: table,
                    columnCount: table.columns ? table.columns.length : 0,
                    primaryKeys: table.primaryKeys || [],
                    foreignKeys: table.foreignKeys || [],
                    estimatedRows: table.estimatedRows || 0
                },
                classes: 'table-node'
            });
        });
        
        // Add relationship edges
        if (schemaData.relationships) {
            schemaData.relationships.forEach((relationship, index) => {
                elements.push({
                    data: {
                        id: `rel_${index}`,
                        source: relationship.fromTable,
                        target: relationship.toTable,
                        type: 'relationship',
                        relationship: relationship,
                        relationshipType: relationship.relationshipType,
                        foreignKey: relationship.foreignKeyColumn,
                        referencedColumn: relationship.referencedColumn
                    },
                    classes: `relationship-edge ${relationship.relationshipType.replace('-', '_')}`
                });
            });
        }
        
        return elements;
    }
    
    /**
     * Get Cytoscape style configuration
     */
    getGraphStyle() {
        return [
            // Table nodes
            {
                selector: '.table-node',
                style: {
                    'background-color': this.colors.table,
                    'border-color': this.colors.border,
                    'border-width': 2,
                    'border-opacity': 0.8,
                    'label': 'data(label)',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'color': this.colors.foreground,
                    'font-size': '12px',
                    'font-weight': 'bold',
                    'width': 'label',
                    'height': 'label',
                    'padding': '10px',
                    'shape': 'round-rectangle',
                    'text-wrap': 'wrap',
                    'text-max-width': '120px',
                    'overlay-opacity': 0,
                    'transition-property': 'background-color, border-color, border-width',
                    'transition-duration': '0.2s'
                }
            },
            
            // Selected table
            {
                selector: '.table-node:selected',
                style: {
                    'background-color': this.colors.selectedTable,
                    'border-color': this.colors.selectedTable,
                    'border-width': 3,
                    'z-index': 10
                }
            },
            
            // Highlighted table
            {
                selector: '.table-node.highlighted',
                style: {
                    'background-color': this.colors.highlightedTable,
                    'border-color': this.colors.highlightedTable,
                    'border-width': 3,
                    'z-index': 9
                }
            },
            
            // Dimmed table
            {
                selector: '.table-node.dimmed',
                style: {
                    'background-color': this.colors.dimmedTable,
                    'border-color': this.colors.dimmedTable,
                    'opacity': 0.4
                }
            },
            
            // Relationship edges
            {
                selector: '.relationship-edge',
                style: {
                    'width': 2,
                    'line-color': this.colors.relationship,
                    'target-arrow-color': this.colors.relationship,
                    'target-arrow-shape': 'triangle',
                    'arrow-scale': 1.2,
                    'curve-style': 'bezier',
                    'control-point-step-size': 40,
                    'overlay-opacity': 0,
                    'transition-property': 'line-color, width',
                    'transition-duration': '0.2s'
                }
            },
            
            // One-to-one relationships
            {
                selector: '.relationship-edge.one_to_one',
                style: {
                    'line-style': 'solid',
                    'source-arrow-shape': 'circle',
                    'source-arrow-color': this.colors.relationship
                }
            },
            
            // One-to-many relationships
            {
                selector: '.relationship-edge.one_to_many',
                style: {
                    'line-style': 'solid',
                    'source-arrow-shape': 'circle',
                    'source-arrow-color': this.colors.relationship,
                    'target-arrow-shape': 'triangle-cross',
                    'target-arrow-color': this.colors.relationship
                }
            },
            
            // Many-to-many relationships
            {
                selector: '.relationship-edge.many_to_many',
                style: {
                    'line-style': 'dashed',
                    'source-arrow-shape': 'triangle-cross',
                    'source-arrow-color': this.colors.relationship,
                    'target-arrow-shape': 'triangle-cross',
                    'target-arrow-color': this.colors.relationship
                }
            },
            
            // Highlighted edges
            {
                selector: '.relationship-edge.highlighted',
                style: {
                    'width': 4,
                    'line-color': this.colors.highlightedTable,
                    'target-arrow-color': this.colors.highlightedTable,
                    'source-arrow-color': this.colors.highlightedTable,
                    'z-index': 8
                }
            },
            
            // Dimmed edges
            {
                selector: '.relationship-edge.dimmed',
                style: {
                    'opacity': 0.2
                }
            }
        ];
    }
    
    /**
     * Get layout configuration
     */
    getLayoutConfig(layoutName) {
        const layouts = {
            dagre: {
                name: 'dagre',
                rankDir: 'TB',
                align: 'UL',
                nodeSep: 50,
                edgeSep: 10,
                rankSep: 100,
                marginX: 20,
                marginY: 20,
                acyclicer: 'greedy',
                ranker: 'tight-tree',
                animate: true,
                animationDuration: 500,
                animationEasing: 'ease-out'
            },
            
            circle: {
                name: 'circle',
                radius: 200,
                spacing: 50,
                animate: true,
                animationDuration: 500,
                animationEasing: 'ease-out'
            },
            
            grid: {
                name: 'grid',
                rows: undefined,
                cols: undefined,
                spacing: 100,
                animate: true,
                animationDuration: 500,
                animationEasing: 'ease-out'
            },
            
            breadthfirst: {
                name: 'breadthfirst',
                directed: true,
                spacingFactor: 1.5,
                animate: true,
                animationDuration: 500,
                animationEasing: 'ease-out'
            },
            
            cose: {
                name: 'cose',
                idealEdgeLength: 100,
                nodeOverlap: 20,
                refresh: 20,
                fit: true,
                padding: 30,
                randomize: false,
                componentSpacing: 100,
                nodeRepulsion: 400000,
                edgeElasticity: 100,
                nestingFactor: 5,
                gravity: 80,
                numIter: 1000,
                initialTemp: 200,
                coolingFactor: 0.95,
                minTemp: 1.0,
                animate: true,
                animationDuration: 500,
                animationEasing: 'ease-out'
            }
        };
        
        return layouts[layoutName] || layouts.dagre;
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        if (!this.cy) return;
        
        // Table node click
        this.cy.on('tap', '.table-node', (event) => {
            const table = event.target.data('table');
            this.selectTable(table);
            this.showTableInfo(table);
        });
        
        // Table node hover
        this.cy.on('mouseover', '.table-node', (event) => {
            const tableId = event.target.id();
            this.highlightRelatedTables(tableId);
        });
        
        this.cy.on('mouseout', '.table-node', () => {
            this.clearHighlights();
        });
        
        // Relationship edge click
        this.cy.on('tap', '.relationship-edge', (event) => {
            const relationship = event.target.data('relationship');
            this.showRelationshipInfo(relationship);
        });
        
        // Background click
        this.cy.on('tap', (event) => {
            if (event.target === this.cy) {
                this.clearSelection();
                this.hideTableInfo();
            }
        });
    }
    
    /**
     * Select a table and highlight related elements
     */
    selectTable(table) {
        this.selectedTable = table;
        
        // Clear previous selections
        this.cy.elements().removeClass('selected highlighted dimmed');
        
        // Select the table
        const tableNode = this.cy.getElementById(table.name);
        tableNode.addClass('selected');
        
        // Highlight related tables and relationships
        this.highlightRelatedTables(table.name, true);
    }
    
    /**
     * Highlight tables related to the given table
     */
    highlightRelatedTables(tableId, persistent = false) {
        if (!this.cy) return;
        
        // Clear previous highlights if not persistent
        if (!persistent) {
            this.cy.elements().removeClass('highlighted dimmed');
        }
        
        const relatedTableIds = new Set();
        const relatedEdgeIds = new Set();
        
        // Find related edges
        this.cy.edges().forEach(edge => {
            const sourceId = edge.source().id();
            const targetId = edge.target().id();
            
            if (sourceId === tableId || targetId === tableId) {
                relatedEdgeIds.add(edge.id());
                relatedTableIds.add(sourceId);
                relatedTableIds.add(targetId);
            }
        });
        
        // Highlight related elements
        relatedTableIds.forEach(id => {
            const node = this.cy.getElementById(id);
            if (id !== tableId) {
                node.addClass('highlighted');
            }
        });
        
        relatedEdgeIds.forEach(id => {
            this.cy.getElementById(id).addClass('highlighted');
        });
        
        // Dim unrelated elements if persistent
        if (persistent) {
            this.cy.nodes().forEach(node => {
                if (!relatedTableIds.has(node.id())) {
                    node.addClass('dimmed');
                }
            });
            
            this.cy.edges().forEach(edge => {
                if (!relatedEdgeIds.has(edge.id())) {
                    edge.addClass('dimmed');
                }
            });
        }
    }
    
    /**
     * Clear all highlights and selections
     */
    clearHighlights() {
        if (this.cy) {
            this.cy.elements().removeClass('highlighted');
        }
    }
    
    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedTable = null;
        if (this.cy) {
            this.cy.elements().removeClass('selected highlighted dimmed');
        }
    }
    
    /**
     * Show table information panel
     */
    showTableInfo(table) {
        const panel = document.getElementById('table-info-panel');
        const title = document.getElementById('table-info-title');
        const content = document.getElementById('table-info-content');
        
        if (!panel || !title || !content) return;
        
        // Update title
        title.textContent = table.name;
        
        // Update content
        let html = '';
        
        // Table summary
        html += '<div class="table-summary">';
        html += `<div class="summary-item"><span class="summary-label">Schema:</span><span class="summary-value">${table.schema || 'default'}</span></div>`;
        html += `<div class="summary-item"><span class="summary-label">Columns:</span><span class="summary-value">${table.columns ? table.columns.length : 0}</span></div>`;
        html += `<div class="summary-item"><span class="summary-label">Primary Keys:</span><span class="summary-value">${table.primaryKeys ? table.primaryKeys.length : 0}</span></div>`;
        html += `<div class="summary-item"><span class="summary-label">Foreign Keys:</span><span class="summary-value">${table.foreignKeys ? table.foreignKeys.length : 0}</span></div>`;
        if (table.estimatedRows !== undefined) {
            html += `<div class="summary-item"><span class="summary-label">Est. Rows:</span><span class="summary-value">${table.estimatedRows.toLocaleString()}</span></div>`;
        }
        html += '</div>';
        
        // Columns
        if (table.columns && table.columns.length > 0) {
            html += '<div class="columns-section">';
            html += '<h4>Columns</h4>';
            html += '<table class="columns-table">';
            html += '<thead><tr><th>Name</th><th>Type</th><th>Nullable</th><th>Default</th></tr></thead>';
            html += '<tbody>';
            
            table.columns.forEach(column => {
                let columnClass = 'column-name';
                if (column.isPrimaryKey) columnClass += ' primary-key';
                else if (column.isForeignKey) columnClass += ' foreign-key';
                
                html += '<tr>';
                html += `<td class="${columnClass}">${column.name}</td>`;
                html += `<td class="column-type">${column.dataType}</td>`;
                html += `<td><span class="column-nullable ${column.nullable ? 'yes' : 'no'}">${column.nullable ? 'Yes' : 'No'}</span></td>`;
                html += `<td>${column.defaultValue || '-'}</td>`;
                html += '</tr>';
            });
            
            html += '</tbody></table>';
            html += '</div>';
        }
        
        // Relationships
        const relationships = this.getTableRelationships(table.name);
        if (relationships.length > 0) {
            html += '<div class="relationships-section">';
            html += '<h4>Relationships</h4>';
            
            relationships.forEach(rel => {
                html += '<div class="relationship-item">';
                html += `<div class="relationship-type">${rel.relationshipType}</div>`;
                html += `<div class="relationship-details">${rel.fromTable} → ${rel.toTable}</div>`;
                html += `<div class="relationship-details">${rel.foreignKeyColumn} → ${rel.referencedColumn}</div>`;
                html += '</div>';
            });
            
            html += '</div>';
        }
        
        // Indexes
        if (table.indexes && table.indexes.length > 0) {
            html += '<div class="indexes-section">';
            html += '<h4>Indexes</h4>';
            
            table.indexes.forEach(indexName => {
                html += '<div class="index-item">';
                html += `<span class="index-name">${indexName}</span>`;
                html += '</div>';
            });
            
            html += '</div>';
        }
        
        content.innerHTML = html;
        
        // Show panel
        panel.style.display = 'block';
    }
    
    /**
     * Hide table information panel
     */
    hideTableInfo() {
        const panel = document.getElementById('table-info-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }
    
    /**
     * Get relationships for a specific table
     */
    getTableRelationships(tableName) {
        const relationships = [];
        
        if (this.cy) {
            this.cy.edges().forEach(edge => {
                const sourceId = edge.source().id();
                const targetId = edge.target().id();
                
                if (sourceId === tableName || targetId === tableName) {
                    relationships.push(edge.data('relationship'));
                }
            });
        }
        
        return relationships;
    }
    
    /**
     * Show relationship information
     */
    showRelationshipInfo(relationship) {
        console.log('Relationship info:', relationship);
        // Could implement a tooltip or info panel for relationships
    }
    
    /**
     * Change graph layout
     */
    changeLayout(layoutName) {
        if (!this.cy) return;
        
        this.currentLayout = layoutName;
        const layout = this.cy.layout(this.getLayoutConfig(layoutName));
        layout.run();
    }
    
    /**
     * Fit graph to container
     */
    fitToContainer() {
        if (this.cy) {
            this.cy.fit();
        }
    }
    
    /**
     * Reset graph view
     */
    resetView() {
        if (this.cy) {
            this.clearSelection();
            this.hideTableInfo();
            this.cy.fit();
            this.cy.center();
        }
    }
    
    /**
     * Export graph as image
     */
    exportAsImage(filename = 'database-schema.png') {
        if (!this.cy) return;
        
        try {
            const png64 = this.cy.png({
                output: 'base64uri',
                bg: this.colors.background,
                full: true,
                scale: 2
            });
            
            const link = document.createElement('a');
            link.download = filename;
            link.href = png64;
            link.click();
        } catch (error) {
            console.error('Error exporting schema graph:', error);
        }
    }
    
    /**
     * Search for tables
     */
    searchTables(query) {
        if (!this.cy || !query) {
            this.clearHighlights();
            return;
        }
        
        const matchingTables = this.cy.nodes().filter(node => {
            const tableName = node.data('label').toLowerCase();
            return tableName.includes(query.toLowerCase());
        });
        
        // Clear previous highlights
        this.cy.elements().removeClass('highlighted dimmed');
        
        if (matchingTables.length > 0) {
            // Highlight matching tables
            matchingTables.addClass('highlighted');
            
            // Dim non-matching tables
            this.cy.nodes().difference(matchingTables).addClass('dimmed');
            
            // Focus on first match
            if (matchingTables.length === 1) {
                this.cy.center(matchingTables[0]);
                this.cy.zoom({
                    level: 1.5,
                    renderedPosition: matchingTables[0].renderedPosition()
                });
            }
        }
        
        return matchingTables.length;
    }
    
    /**
     * Update theme when VS Code theme changes
     */
    updateTheme() {
        this.updateThemeColors();
        
        if (this.cy) {
            this.cy.style(this.getGraphStyle());
        }
    }
    
    /**
     * Destroy the graph instance
     */
    destroy() {
        if (this.cy) {
            this.cy.destroy();
            this.cy = null;
        }
        this.selectedTable = null;
    }
}

// Export for use in webview
if (typeof window !== 'undefined') {
    window.DatabaseSchemaGraph = DatabaseSchemaGraph;
}