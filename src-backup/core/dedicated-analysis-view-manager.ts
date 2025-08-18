import * as vscode from 'vscode';
import { EnhancedGraphRenderer } from './enhanced-graph-renderer';
import { FullCodeAnalysisController } from './analysis-controllers/full-code-analysis-controller';
import { CurrentFileAnalysisController } from './analysis-controllers/current-file-analysis-controller';
import { GitAnalyticsController } from './analysis-controllers/git-analytics-controller';
import { AnalysisViewStateManager } from './analysis-view-state-manager';
import { EnhancedGraphData, AnalysisViewState, DedicatedAnalysisView } from '../types/dedicated-analysis-types';

/**
 * Manages dedicated analysis views with enhanced graph visualization
 */
export class DedicatedAnalysisViewManager {
    private views: Map<string, DedicatedAnalysisView> = new Map();
    private activeView: string | null = null;
    private graphRenderer: EnhancedGraphRenderer;
    private stateManager: AnalysisViewStateManager;

    constructor(
        private context: vscode.ExtensionContext,
        private outputChannel: vscode.OutputChannel
    ) {
        this.graphRenderer = new EnhancedGraphRenderer();
        this.stateManager = new AnalysisViewStateManager(context);
        this.initializeViews();
    }

    /**
     * Initialize all dedicated analysis views
     */
    private initializeViews(): void {
        // Full Code Analysis View
        this.views.set('fullCode', {
            viewType: 'fullCode',
            title: 'Full Code Analysis',
            icon: '🔗',
            renderer: this.graphRenderer,
            controller: new FullCodeAnalysisController(this.outputChannel),
            state: this.stateManager.getViewState('fullCode')
        });

        // Current File Analysis View
        this.views.set('currentFile', {
            viewType: 'currentFile',
            title: 'Current File Analysis',
            icon: '📄',
            renderer: this.graphRenderer,
            controller: new CurrentFileAnalysisController(this.outputChannel),
            state: this.stateManager.getViewState('currentFile')
        });

        // Git Analytics View
        this.views.set('gitAnalytics', {
            viewType: 'gitAnalytics',
            title: 'Git Analytics',
            icon: '📊',
            renderer: this.graphRenderer,
            controller: new GitAnalyticsController(this.outputChannel),
            state: this.stateManager.getViewState('gitAnalytics')
        });
    }

    /**
     * Update view states from state manager
     */
    private updateViewStatesFromManager(): void {
        for (const [viewType, view] of this.views.entries()) {
            view.state = this.stateManager.getViewState(viewType);
        }
    }

    /**
     * Get all available views
     */
    public getViews(): DedicatedAnalysisView[] {
        return Array.from(this.views.values());
    }

    /**
     * Get specific view by type
     */
    public getView(viewType: string): DedicatedAnalysisView | undefined {
        return this.views.get(viewType);
    }

    /**
     * Set active view
     */
    public setActiveView(viewType: string): void {
        // Use state manager to handle activation
        this.stateManager.setActiveView(viewType);
        this.activeView = viewType;
        
        // Update view states
        this.updateViewStatesFromManager();
    }

    /**
     * Get active view
     */
    public getActiveView(): DedicatedAnalysisView | null {
        return this.activeView ? this.views.get(this.activeView) || null : null;
    }

    /**
     * Update view data
     */
    public async updateViewData(viewType: string, data: any): Promise<void> {
        const view = this.views.get(viewType);
        if (!view) {
            throw new Error(`View ${viewType} not found`);
        }

        try {
            // Transform data using the controller
            const enhancedData = await view.controller.transformData(data);
            
            // Store the enhanced data in the view
            (view as any).data = enhancedData;
            
            this.outputChannel.appendLine(`Updated data for view: ${viewType}`);
        } catch (error) {
            this.outputChannel.appendLine(`Failed to update view data for ${viewType}: ${error}`);
            throw error;
        }
    }

    /**
     * Render view with enhanced graph
     */
    public async renderView(viewType: string): Promise<string> {
        const view = this.views.get(viewType);
        if (!view) {
            throw new Error(`View ${viewType} not found`);
        }

        try {
            const data = (view as any).data as EnhancedGraphData;
            if (!data) {
                return this.renderEmptyView(view);
            }

            // Use the enhanced graph renderer
            return await view.renderer.renderGraph(data, view.state);
        } catch (error) {
            this.outputChannel.appendLine(`Failed to render view ${viewType}: ${error}`);
            return this.renderErrorView(view, error as Error);
        }
    }

    /**
     * Update view state
     */
    public updateViewState(viewType: string, stateUpdate: Partial<AnalysisViewState>): void {
        this.stateManager.updateViewState(viewType, stateUpdate);
        this.updateViewStatesFromManager();
    }

    /**
     * Handle view interaction
     */
    public async handleViewInteraction(viewType: string, interaction: any): Promise<void> {
        const view = this.views.get(viewType);
        if (!view) {
            return;
        }

        try {
            await view.controller.handleInteraction(interaction, view.state);
        } catch (error) {
            this.outputChannel.appendLine(`Failed to handle interaction for ${viewType}: ${error}`);
        }
    }

    /**
     * Render empty view
     */
    private renderEmptyView(view: DedicatedAnalysisView): string {
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
    private renderErrorView(view: DedicatedAnalysisView, error: Error): string {
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
    public getStateManager(): AnalysisViewStateManager {
        return this.stateManager;
    }

    /**
     * Save controller-specific state
     */
    public saveControllerState(viewType: string): void {
        const view = this.views.get(viewType);
        if (!view) {
            return;
        }

        let controllerState: any = {};
        
        // Save controller-specific state based on view type
        switch (viewType) {
            case 'fullCode':
                const fullCodeController = view.controller as FullCodeAnalysisController;
                controllerState = fullCodeController.getModuleHierarchy();
                break;
            case 'currentFile':
                const currentFileController = view.controller as CurrentFileAnalysisController;
                controllerState = currentFileController.getCurrentFileContext();
                break;
            case 'gitAnalytics':
                const gitController = view.controller as GitAnalyticsController;
                controllerState = gitController.getAnalyticsFilters();
                break;
        }
        
        this.stateManager.updateControllerState(viewType, controllerState);
    }

    /**
     * Restore controller-specific state
     */
    public restoreControllerState(viewType: string): void {
        const view = this.views.get(viewType);
        if (!view) {
            return;
        }

        const controllerState = this.stateManager.getControllerState(viewType);
        
        // Restore controller-specific state based on view type
        switch (viewType) {
            case 'fullCode':
                const fullCodeController = view.controller as FullCodeAnalysisController;
                fullCodeController.setModuleHierarchy(controllerState);
                break;
            case 'currentFile':
                const currentFileController = view.controller as CurrentFileAnalysisController;
                currentFileController.setCurrentFileContext(controllerState);
                break;
            case 'gitAnalytics':
                const gitController = view.controller as GitAnalyticsController;
                gitController.setAnalyticsFilters(controllerState);
                break;
        }
    }

    /**
     * Save all controller states
     */
    public saveAllControllerStates(): void {
        for (const viewType of this.views.keys()) {
            this.saveControllerState(viewType);
        }
    }

    /**
     * Restore all controller states
     */
    public restoreAllControllerStates(): void {
        for (const viewType of this.views.keys()) {
            this.restoreControllerState(viewType);
        }
    }

    /**
     * Dispose resources
     */
    public dispose(): void {
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