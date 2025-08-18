import * as vscode from 'vscode';
import { AnalysisViewState } from '../types/dedicated-analysis-types';

/**
 * Manages independent state for each analysis view with persistence
 */
export class AnalysisViewStateManager {
    private states: Map<string, AnalysisViewState> = new Map();
    private readonly storageKey = 'doracodebird.analysisViewStates';

    constructor(private context: vscode.ExtensionContext) {
        this.loadStates();
    }

    /**
     * Get state for a specific view
     */
    public getViewState(viewType: string): AnalysisViewState {
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
    public updateViewState(viewType: string, stateUpdate: Partial<AnalysisViewState>): void {
        const currentState = this.getViewState(viewType);
        const newState = { ...currentState, ...stateUpdate };
        this.states.set(viewType, newState);
        this.saveStates();
    }

    /**
     * Reset state for a specific view
     */
    public resetViewState(viewType: string): void {
        this.states.set(viewType, this.createDefaultState());
        this.saveStates();
    }

    /**
     * Reset all view states
     */
    public resetAllStates(): void {
        this.states.clear();
        this.saveStates();
    }

    /**
     * Get all view states
     */
    public getAllStates(): Map<string, AnalysisViewState> {
        return new Map(this.states);
    }

    /**
     * Set active view (deactivates others)
     */
    public setActiveView(viewType: string): void {
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
    public updateZoomLevel(viewType: string, zoomLevel: number): void {
        this.updateViewState(viewType, { zoomLevel });
    }

    /**
     * Update search query for a view
     */
    public updateSearchQuery(viewType: string, searchQuery: string): void {
        this.updateViewState(viewType, { searchQuery });
    }

    /**
     * Update filter settings for a view
     */
    public updateFilterSettings(viewType: string, filterSettings: Partial<AnalysisViewState['filterSettings']>): void {
        const currentState = this.getViewState(viewType);
        const newFilterSettings = { ...currentState.filterSettings, ...filterSettings };
        this.updateViewState(viewType, { filterSettings: newFilterSettings });
    }

    /**
     * Update layout settings for a view
     */
    public updateLayoutSettings(viewType: string, layoutSettings: Partial<AnalysisViewState['layoutSettings']>): void {
        const currentState = this.getViewState(viewType);
        const newLayoutSettings = { ...currentState.layoutSettings, ...layoutSettings };
        this.updateViewState(viewType, { layoutSettings: newLayoutSettings });
    }

    /**
     * Update selected nodes for a view
     */
    public updateSelectedNodes(viewType: string, selectedNodes: string[]): void {
        this.updateViewState(viewType, { selectedNodes: [...selectedNodes] });
    }

    /**
     * Add node to selection
     */
    public addSelectedNode(viewType: string, nodeId: string): void {
        const currentState = this.getViewState(viewType);
        if (!currentState.selectedNodes.includes(nodeId)) {
            const newSelectedNodes = [...currentState.selectedNodes, nodeId];
            this.updateViewState(viewType, { selectedNodes: newSelectedNodes });
        }
    }

    /**
     * Remove node from selection
     */
    public removeSelectedNode(viewType: string, nodeId: string): void {
        const currentState = this.getViewState(viewType);
        const newSelectedNodes = currentState.selectedNodes.filter(id => id !== nodeId);
        this.updateViewState(viewType, { selectedNodes: newSelectedNodes });
    }

    /**
     * Clear selection for a view
     */
    public clearSelection(viewType: string): void {
        this.updateViewState(viewType, { selectedNodes: [] });
    }

    /**
     * Toggle node selection
     */
    public toggleNodeSelection(viewType: string, nodeId: string): void {
        const currentState = this.getViewState(viewType);
        if (currentState.selectedNodes.includes(nodeId)) {
            this.removeSelectedNode(viewType, nodeId);
        } else {
            this.addSelectedNode(viewType, nodeId);
        }
    }

    /**
     * Check if view has any filters applied
     */
    public hasFiltersApplied(viewType: string): boolean {
        const state = this.getViewState(viewType);
        return (
            state.filterSettings.complexityFilter !== 'all' ||
            state.filterSettings.dependencyFilter !== 'all' ||
            !state.filterSettings.showModules ||
            !state.filterSettings.showFiles ||
            state.searchQuery.length > 0
        );
    }

    /**
     * Clear all filters for a view
     */
    public clearFilters(viewType: string): void {
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
    public getControllerState(viewType: string): any {
        const state = this.getViewState(viewType);
        return (state as any).controllerState || {};
    }

    /**
     * Update view-specific controller state
     */
    public updateControllerState(viewType: string, controllerState: any): void {
        this.updateViewState(viewType, { ...this.getViewState(viewType), controllerState } as any);
    }

    /**
     * Create default state
     */
    private createDefaultState(): AnalysisViewState {
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
    private loadStates(): void {
        try {
            const storedStates = this.context.globalState.get<any>(this.storageKey);
            if (storedStates) {
                // Convert stored data back to Map
                for (const [viewType, state] of Object.entries(storedStates)) {
                    this.states.set(viewType, state as AnalysisViewState);
                }
            }
        } catch (error) {
            console.error('Failed to load analysis view states:', error);
        }
    }

    /**
     * Save states to extension storage
     */
    private saveStates(): void {
        try {
            // Convert Map to plain object for storage
            const statesToStore: any = {};
            for (const [viewType, state] of this.states.entries()) {
                statesToStore[viewType] = state;
            }
            this.context.globalState.update(this.storageKey, statesToStore);
        } catch (error) {
            console.error('Failed to save analysis view states:', error);
        }
    }

    /**
     * Export states for backup
     */
    public exportStates(): string {
        const statesToExport: any = {};
        for (const [viewType, state] of this.states.entries()) {
            statesToExport[viewType] = state;
        }
        return JSON.stringify(statesToExport, null, 2);
    }

    /**
     * Import states from backup
     */
    public importStates(statesJson: string): boolean {
        try {
            const importedStates = JSON.parse(statesJson);
            this.states.clear();
            
            for (const [viewType, state] of Object.entries(importedStates)) {
                // Validate state structure
                if (this.isValidState(state)) {
                    this.states.set(viewType, state as AnalysisViewState);
                }
            }
            
            this.saveStates();
            return true;
        } catch (error) {
            console.error('Failed to import analysis view states:', error);
            return false;
        }
    }

    /**
     * Validate state structure
     */
    private isValidState(state: any): boolean {
        return (
            state &&
            typeof state.isActive === 'boolean' &&
            typeof state.zoomLevel === 'number' &&
            typeof state.searchQuery === 'string' &&
            state.filterSettings &&
            state.layoutSettings &&
            Array.isArray(state.selectedNodes)
        );
    }

    /**
     * Dispose resources
     */
    public dispose(): void {
        this.saveStates();
        this.states.clear();
    }
}