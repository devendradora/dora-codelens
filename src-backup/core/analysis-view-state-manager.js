"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisViewStateManager = void 0;
/**
 * Manages independent state for each analysis view with persistence
 */
class AnalysisViewStateManager {
    constructor(context) {
        this.context = context;
        this.states = new Map();
        this.storageKey = 'doracodebird.analysisViewStates';
        this.loadStates();
    }
    /**
     * Get state for a specific view
     */
    getViewState(viewType) {
        let state = this.states.get(viewType);
        if (!state) {
            state = this.createDefaultState();
            this.states.set(viewType, state);
        }
        return { ...state }; // Return a copy to prevent direct mutation
    }
    /**
     * Update state for a specific view
     */
    updateViewState(viewType, stateUpdate) {
        const currentState = this.getViewState(viewType);
        const newState = { ...currentState, ...stateUpdate };
        this.states.set(viewType, newState);
        this.saveStates();
    }
    /**
     * Reset state for a specific view
     */
    resetViewState(viewType) {
        this.states.set(viewType, this.createDefaultState());
        this.saveStates();
    }
    /**
     * Reset all view states
     */
    resetAllStates() {
        this.states.clear();
        this.saveStates();
    }
    /**
     * Get all view states
     */
    getAllStates() {
        return new Map(this.states);
    }
    /**
     * Set active view (deactivates others)
     */
    setActiveView(viewType) {
        // Deactivate all views
        for (const [type, state] of this.states.entries()) {
            if (state.isActive && type !== viewType) {
                this.updateViewState(type, { isActive: false });
            }
        }
        // Activate the specified view
        this.updateViewState(viewType, { isActive: true });
    }
    /**
     * Update zoom level for a view
     */
    updateZoomLevel(viewType, zoomLevel) {
        this.updateViewState(viewType, { zoomLevel });
    }
    /**
     * Update search query for a view
     */
    updateSearchQuery(viewType, searchQuery) {
        this.updateViewState(viewType, { searchQuery });
    }
    /**
     * Update filter settings for a view
     */
    updateFilterSettings(viewType, filterSettings) {
        const currentState = this.getViewState(viewType);
        const newFilterSettings = { ...currentState.filterSettings, ...filterSettings };
        this.updateViewState(viewType, { filterSettings: newFilterSettings });
    }
    /**
     * Update layout settings for a view
     */
    updateLayoutSettings(viewType, layoutSettings) {
        const currentState = this.getViewState(viewType);
        const newLayoutSettings = { ...currentState.layoutSettings, ...layoutSettings };
        this.updateViewState(viewType, { layoutSettings: newLayoutSettings });
    }
    /**
     * Update selected nodes for a view
     */
    updateSelectedNodes(viewType, selectedNodes) {
        this.updateViewState(viewType, { selectedNodes: [...selectedNodes] });
    }
    /**
     * Add node to selection
     */
    addSelectedNode(viewType, nodeId) {
        const currentState = this.getViewState(viewType);
        if (!currentState.selectedNodes.includes(nodeId)) {
            const newSelectedNodes = [...currentState.selectedNodes, nodeId];
            this.updateViewState(viewType, { selectedNodes: newSelectedNodes });
        }
    }
    /**
     * Remove node from selection
     */
    removeSelectedNode(viewType, nodeId) {
        const currentState = this.getViewState(viewType);
        const newSelectedNodes = currentState.selectedNodes.filter(id => id !== nodeId);
        this.updateViewState(viewType, { selectedNodes: newSelectedNodes });
    }
    /**
     * Clear selection for a view
     */
    clearSelection(viewType) {
        this.updateViewState(viewType, { selectedNodes: [] });
    }
    /**
     * Toggle node selection
     */
    toggleNodeSelection(viewType, nodeId) {
        const currentState = this.getViewState(viewType);
        if (currentState.selectedNodes.includes(nodeId)) {
            this.removeSelectedNode(viewType, nodeId);
        }
        else {
            this.addSelectedNode(viewType, nodeId);
        }
    }
    /**
     * Check if view has any filters applied
     */
    hasFiltersApplied(viewType) {
        const state = this.getViewState(viewType);
        return (state.filterSettings.complexityFilter !== 'all' ||
            state.filterSettings.dependencyFilter !== 'all' ||
            !state.filterSettings.showModules ||
            !state.filterSettings.showFiles ||
            state.searchQuery.length > 0);
    }
    /**
     * Clear all filters for a view
     */
    clearFilters(viewType) {
        this.updateViewState(viewType, {
            searchQuery: '',
            filterSettings: {
                showModules: true,
                showFiles: true,
                complexityFilter: 'all',
                dependencyFilter: 'all'
            }
        });
    }
    /**
     * Get view-specific controller state
     */
    getControllerState(viewType) {
        const state = this.getViewState(viewType);
        return state.controllerState || {};
    }
    /**
     * Update view-specific controller state
     */
    updateControllerState(viewType, controllerState) {
        this.updateViewState(viewType, { ...this.getViewState(viewType), controllerState });
    }
    /**
     * Create default state
     */
    createDefaultState() {
        return {
            isActive: false,
            zoomLevel: 1.0,
            searchQuery: '',
            filterSettings: {
                showModules: true,
                showFiles: true,
                complexityFilter: 'all',
                dependencyFilter: 'all'
            },
            layoutSettings: {
                algorithm: 'dagre',
                spacing: 50,
                direction: 'TB',
                grouping: 'module'
            },
            selectedNodes: []
        };
    }
    /**
     * Load states from extension storage
     */
    loadStates() {
        try {
            const storedStates = this.context.globalState.get(this.storageKey);
            if (storedStates) {
                // Convert stored data back to Map
                for (const [viewType, state] of Object.entries(storedStates)) {
                    this.states.set(viewType, state);
                }
            }
        }
        catch (error) {
            console.error('Failed to load analysis view states:', error);
        }
    }
    /**
     * Save states to extension storage
     */
    saveStates() {
        try {
            // Convert Map to plain object for storage
            const statesToStore = {};
            for (const [viewType, state] of this.states.entries()) {
                statesToStore[viewType] = state;
            }
            this.context.globalState.update(this.storageKey, statesToStore);
        }
        catch (error) {
            console.error('Failed to save analysis view states:', error);
        }
    }
    /**
     * Export states for backup
     */
    exportStates() {
        const statesToExport = {};
        for (const [viewType, state] of this.states.entries()) {
            statesToExport[viewType] = state;
        }
        return JSON.stringify(statesToExport, null, 2);
    }
    /**
     * Import states from backup
     */
    importStates(statesJson) {
        try {
            const importedStates = JSON.parse(statesJson);
            this.states.clear();
            for (const [viewType, state] of Object.entries(importedStates)) {
                // Validate state structure
                if (this.isValidState(state)) {
                    this.states.set(viewType, state);
                }
            }
            this.saveStates();
            return true;
        }
        catch (error) {
            console.error('Failed to import analysis view states:', error);
            return false;
        }
    }
    /**
     * Validate state structure
     */
    isValidState(state) {
        return (state &&
            typeof state.isActive === 'boolean' &&
            typeof state.zoomLevel === 'number' &&
            typeof state.searchQuery === 'string' &&
            state.filterSettings &&
            state.layoutSettings &&
            Array.isArray(state.selectedNodes));
    }
    /**
     * Dispose resources
     */
    dispose() {
        this.saveStates();
        this.states.clear();
    }
}
exports.AnalysisViewStateManager = AnalysisViewStateManager;
//# sourceMappingURL=analysis-view-state-manager.js.map