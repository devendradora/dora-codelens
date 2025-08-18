"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DedicatedAnalysisViewManager = void 0;
const enhanced_graph_renderer_1 = require("./enhanced-graph-renderer");
const full_code_analysis_controller_1 = require("./analysis-controllers/full-code-analysis-controller");
const current_file_analysis_controller_1 = require("./analysis-controllers/current-file-analysis-controller");
const git_analytics_controller_1 = require("./analysis-controllers/git-analytics-controller");
const analysis_view_state_manager_1 = require("./analysis-view-state-manager");
/**
 * Manages dedicated analysis views with enhanced graph visualization
 */
class DedicatedAnalysisViewManager {
    constructor(context, outputChannel) {
        this.context = context;
        this.outputChannel = outputChannel;
        this.views = new Map();
        this.activeView = null;
        this.graphRenderer = new enhanced_graph_renderer_1.EnhancedGraphRenderer();
        this.stateManager = new analysis_view_state_manager_1.AnalysisViewStateManager(context);
        this.initializeViews();
    }
    /**
     * Initialize all dedicated analysis views
     */
    initializeViews() {
        // Full Code Analysis View
        this.views.set('fullCode', {
            viewType: 'fullCode',
            title: 'Full Code Analysis',
            icon: '🔗',
            renderer: this.graphRenderer,
            controller: new full_code_analysis_controller_1.FullCodeAnalysisController(this.outputChannel),
            state: this.stateManager.getViewState('fullCode')
        });
        // Current File Analysis View
        this.views.set('currentFile', {
            viewType: 'currentFile',
            title: 'Current File Analysis',
            icon: '📄',
            renderer: this.graphRenderer,
            controller: new current_file_analysis_controller_1.CurrentFileAnalysisController(this.outputChannel),
            state: this.stateManager.getViewState('currentFile')
        });
        // Git Analytics View
        this.views.set('gitAnalytics', {
            viewType: 'gitAnalytics',
            title: 'Git Analytics',
            icon: '📊',
            renderer: this.graphRenderer,
            controller: new git_analytics_controller_1.GitAnalyticsController(this.outputChannel),
            state: this.stateManager.getViewState('gitAnalytics')
        });
    }
    /**
     * Update view states from state manager
     */
    updateViewStatesFromManager() {
        for (const [viewType, view] of this.views.entries()) {
            view.state = this.stateManager.getViewState(viewType);
        }
    }
    /**
     * Get all available views
     */
    getViews() {
        return Array.from(this.views.values());
    }
    /**
     * Get specific view by type
     */
    getView(viewType) {
        return this.views.get(viewType);
    }
    /**
     * Set active view
     */
    setActiveView(viewType) {
        // Use state manager to handle activation
        this.stateManager.setActiveView(viewType);
        this.activeView = viewType;
        // Update view states
        this.updateViewStatesFromManager();
    }
    /**
     * Get active view
     */
    getActiveView() {
        return this.activeView ? this.views.get(this.activeView) || null : null;
    }
    /**
     * Update view data
     */
    async updateViewData(viewType, data) {
        const view = this.views.get(viewType);
        if (!view) {
            throw new Error(`View ${viewType} not found`);
        }
        try {
            // Transform data using the controller
            const enhancedData = await view.controller.transformData(data);
            // Store the enhanced data in the view
            view.data = enhancedData;
            this.outputChannel.appendLine(`Updated data for view: ${viewType}`);
        }
        catch (error) {
            this.outputChannel.appendLine(`Failed to update view data for ${viewType}: ${error}`);
            throw error;
        }
    }
    /**
     * Render view with enhanced graph
     */
    async renderView(viewType) {
        const view = this.views.get(viewType);
        if (!view) {
            throw new Error(`View ${viewType} not found`);
        }
        try {
            const data = view.data;
            if (!data) {
                return this.renderEmptyView(view);
            }
            // Use the enhanced graph renderer
            return await view.renderer.renderGraph(data, view.state);
        }
        catch (error) {
            this.outputChannel.appendLine(`Failed to render view ${viewType}: ${error}`);
            return this.renderErrorView(view, error);
        }
    }
    /**
     * Update view state
     */
    updateViewState(viewType, stateUpdate) {
        this.stateManager.updateViewState(viewType, stateUpdate);
        this.updateViewStatesFromManager();
    }
    /**
     * Handle view interaction
     */
    async handleViewInteraction(viewType, interaction) {
        const view = this.views.get(viewType);
        if (!view) {
            return;
        }
        try {
            await view.controller.handleInteraction(interaction, view.state);
        }
        catch (error) {
            this.outputChannel.appendLine(`Failed to handle interaction for ${viewType}: ${error}`);
        }
    }
    /**
     * Render empty view
     */
    renderEmptyView(view) {
        return `
            <div class="empty-view">
                <div class="empty-icon">${view.icon}</div>
                <h3>${view.title}</h3>
                <p>No data available for this analysis view.</p>
                <button class="refresh-btn" onclick="requestAnalysis('${view.viewType}')">
                    Run Analysis
                </button>
            </div>
        `;
    }
    /**
     * Render error view
     */
    renderErrorView(view, error) {
        return `
            <div class="error-view">
                <div class="error-icon">⚠️</div>
                <h3>Error in ${view.title}</h3>
                <p>${error.message}</p>
                <button class="retry-btn" onclick="retryAnalysis('${view.viewType}')">
                    Retry
                </button>
            </div>
        `;
    }
    /**
     * Get state manager
     */
    getStateManager() {
        return this.stateManager;
    }
    /**
     * Save controller-specific state
     */
    saveControllerState(viewType) {
        const view = this.views.get(viewType);
        if (!view) {
            return;
        }
        let controllerState = {};
        // Save controller-specific state based on view type
        switch (viewType) {
            case 'fullCode':
                const fullCodeController = view.controller;
                controllerState = fullCodeController.getModuleHierarchy();
                break;
            case 'currentFile':
                const currentFileController = view.controller;
                controllerState = currentFileController.getCurrentFileContext();
                break;
            case 'gitAnalytics':
                const gitController = view.controller;
                controllerState = gitController.getAnalyticsFilters();
                break;
        }
        this.stateManager.updateControllerState(viewType, controllerState);
    }
    /**
     * Restore controller-specific state
     */
    restoreControllerState(viewType) {
        const view = this.views.get(viewType);
        if (!view) {
            return;
        }
        const controllerState = this.stateManager.getControllerState(viewType);
        // Restore controller-specific state based on view type
        switch (viewType) {
            case 'fullCode':
                const fullCodeController = view.controller;
                fullCodeController.setModuleHierarchy(controllerState);
                break;
            case 'currentFile':
                const currentFileController = view.controller;
                currentFileController.setCurrentFileContext(controllerState);
                break;
            case 'gitAnalytics':
                const gitController = view.controller;
                gitController.setAnalyticsFilters(controllerState);
                break;
        }
    }
    /**
     * Save all controller states
     */
    saveAllControllerStates() {
        for (const viewType of this.views.keys()) {
            this.saveControllerState(viewType);
        }
    }
    /**
     * Restore all controller states
     */
    restoreAllControllerStates() {
        for (const viewType of this.views.keys()) {
            this.restoreControllerState(viewType);
        }
    }
    /**
     * Dispose resources
     */
    dispose() {
        // Save all states before disposing
        this.saveAllControllerStates();
        this.views.forEach(view => {
            if (view.controller.dispose) {
                view.controller.dispose();
            }
        });
        this.views.clear();
        this.graphRenderer.dispose();
        this.stateManager.dispose();
    }
}
exports.DedicatedAnalysisViewManager = DedicatedAnalysisViewManager;
//# sourceMappingURL=dedicated-analysis-view-manager.js.map