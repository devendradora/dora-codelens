import * as vscode from 'vscode';

/**
 * Configuration for a single tab
 */
export interface TabConfig {
    id: string;
    title: string;
    icon?: string;
    content: string | HTMLElement;
    enabled: boolean;
    lazy?: boolean; // Load content only when tab is activated
}

/**
 * Configuration for the entire tab system
 */
export interface TabSystemConfig {
    containerId: string;
    tabs: TabConfig[];
    defaultTab?: string;
    onTabChange?: (tabId: string) => void;
}

/**
 * State information for a single tab
 */
export interface TabState {
    scrollPosition: number;
    searchQuery: string;
    zoomLevel: number;
    customData: any;
}

/**
 * Overall state of the tab system
 */
export interface TabSystemState {
    activeTab: string;
    tabHistory: string[];
    tabStates: Map<string, TabState>;
    loadedTabs: Set<string>;
}

/**
 * Message interface for tab-related communications
 */
export interface TabMessage {
    command: 'tab';
    action: 'switch' | 'update' | 'enable' | 'disable' | 'load' | 'unload';
    tabId: string;
    content?: any;
    state?: TabState;
}

/**
 * TabManager class handles tab switching logic, state preservation, and lazy loading
 */
export class TabManager {
    private config: TabSystemConfig;
    private state: TabSystemState;
    private container: HTMLElement | null = null;
    private outputChannel: vscode.OutputChannel;
    private debugMode: boolean = false;

    constructor(config: TabSystemConfig, outputChannel: vscode.OutputChannel, debugMode: boolean = false) {
        this.config = config;
        this.outputChannel = outputChannel;
        this.debugMode = debugMode;
        
        // Initialize state
        this.state = {
            activeTab: config.defaultTab || config.tabs[0]?.id || '',
            tabHistory: [],
            tabStates: new Map(),
            loadedTabs: new Set()
        };

        // Initialize tab states for all tabs
        this.initializeTabStates();
        
        this.log('TabManager initialized with config', config);
    }

    /**
     * Initialize default state for all tabs
     */
    private initializeTabStates(): void {
        this.config.tabs.forEach(tab => {
            if (!this.state.tabStates.has(tab.id)) {
                this.state.tabStates.set(tab.id, {
                    scrollPosition: 0,
                    searchQuery: '',
                    zoomLevel: 1.0,
                    customData: {}
                });
            }
        });
    }

    /**
     * Initialize the tab system in the DOM
     */
    public initialize(containerId: string): void {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with id '${containerId}' not found`);
        }

        this.renderTabSystem();
        this.setupEventListeners();
        
        // Load default tab if specified
        if (this.state.activeTab) {
            this.switchToTab(this.state.activeTab);
        }

        this.log('TabManager initialized in DOM');
    }

    /**
     * Render the complete tab system HTML structure
     */
    private renderTabSystem(): void {
        if (!this.container) return;

        const tabSystemHtml = `
            <div class="tab-system">
                <div class="tab-header" role="tablist">
                    ${this.renderTabButtons()}
                </div>
                <div class="tab-content">
                    ${this.renderTabPanels()}
                </div>
            </div>
        `;

        this.container.innerHTML = tabSystemHtml;
        this.log('Tab system HTML rendered');
    }

    /**
     * Render tab buttons in the header
     */
    private renderTabButtons(): string {
        return this.config.tabs.map(tab => {
            const isActive = tab.id === this.state.activeTab;
            const isEnabled = tab.enabled;
            
            return `
                <button 
                    class="tab-button ${isActive ? 'active' : ''} ${!isEnabled ? 'disabled' : ''}"
                    data-tab-id="${tab.id}"
                    role="tab"
                    aria-selected="${isActive}"
                    aria-controls="tab-panel-${tab.id}"
                    ${!isEnabled ? 'disabled' : ''}
                    tabindex="${isActive ? '0' : '-1'}"
                >
                    ${tab.icon ? `<span class="tab-icon">${tab.icon}</span>` : ''}
                    <span class="tab-title">${tab.title}</span>
                </button>
            `;
        }).join('');
    }

    /**
     * Render tab panels for content
     */
    private renderTabPanels(): string {
        return this.config.tabs.map(tab => {
            const isActive = tab.id === this.state.activeTab;
            const content = tab.lazy && !this.state.loadedTabs.has(tab.id) 
                ? '<div class="loading"><div class="spinner"></div><p>Loading...</p></div>'
                : this.getTabContent(tab);
            
            return `
                <div 
                    class="tab-panel ${isActive ? 'active' : ''}"
                    id="tab-panel-${tab.id}"
                    role="tabpanel"
                    aria-labelledby="tab-button-${tab.id}"
                    data-tab-id="${tab.id}"
                >
                    ${content}
                </div>
            `;
        }).join('');
    }

    /**
     * Get content for a specific tab
     */
    private getTabContent(tab: TabConfig): string {
        if (typeof tab.content === 'string') {
            return tab.content;
        } else if (tab.content instanceof HTMLElement) {
            return tab.content.outerHTML;
        }
        return '<p>No content available</p>';
    }

    /**
     * Set up event listeners for tab interactions
     */
    private setupEventListeners(): void {
        if (!this.container) return;

        // Tab button click handlers
        const tabButtons = this.container.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabId = (e.currentTarget as HTMLElement).getAttribute('data-tab-id');
                if (tabId && !button.hasAttribute('disabled')) {
                    this.switchToTab(tabId);
                }
            });
        });

        // Keyboard navigation
        this.container.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e);
        });

        this.log('Event listeners set up for tab system');
    }

    /**
     * Handle keyboard navigation for tabs
     */
    private handleKeyboardNavigation(e: KeyboardEvent): void {
        const target = e.target as HTMLElement;
        if (!target.classList.contains('tab-button')) return;

        const tabButtons = Array.from(this.container!.querySelectorAll('.tab-button:not([disabled])'));
        const currentIndex = tabButtons.indexOf(target);

        let newIndex = currentIndex;

        switch (e.key) {
            case 'ArrowLeft':
                newIndex = currentIndex > 0 ? currentIndex - 1 : tabButtons.length - 1;
                e.preventDefault();
                break;
            case 'ArrowRight':
                newIndex = currentIndex < tabButtons.length - 1 ? currentIndex + 1 : 0;
                e.preventDefault();
                break;
            case 'Home':
                newIndex = 0;
                e.preventDefault();
                break;
            case 'End':
                newIndex = tabButtons.length - 1;
                e.preventDefault();
                break;
            case 'Enter':
            case ' ':
                const tabId = target.getAttribute('data-tab-id');
                if (tabId) {
                    this.switchToTab(tabId);
                }
                e.preventDefault();
                break;
        }

        if (newIndex !== currentIndex) {
            const newButton = tabButtons[newIndex] as HTMLElement;
            newButton.focus();
        }
    }

    /**
     * Switch to a specific tab
     */
    public switchToTab(tabId: string): void {
        const tab = this.config.tabs.find(t => t.id === tabId);
        if (!tab || !tab.enabled) {
            this.log(`Cannot switch to tab '${tabId}' - tab not found or disabled`);
            return;
        }

        // Save current tab state before switching
        this.saveCurrentTabState();

        // Update active tab
        const previousTab = this.state.activeTab;
        this.state.activeTab = tabId;

        // Update tab history
        if (previousTab && previousTab !== tabId) {
            this.state.tabHistory = this.state.tabHistory.filter(id => id !== tabId);
            this.state.tabHistory.unshift(previousTab);
            // Keep history limited to last 10 tabs
            if (this.state.tabHistory.length > 10) {
                this.state.tabHistory = this.state.tabHistory.slice(0, 10);
            }
        }

        // Handle lazy loading
        if (tab.lazy && !this.state.loadedTabs.has(tabId)) {
            this.loadTabContent(tabId);
        }

        // Update UI
        this.updateTabUI();

        // Restore tab state
        this.restoreTabState(tabId);

        // Trigger callback
        if (this.config.onTabChange) {
            this.config.onTabChange(tabId);
        }

        this.log(`Switched to tab: ${tabId}`);
    }

    /**
     * Load content for a lazy-loaded tab
     */
    private async loadTabContent(tabId: string): Promise<void> {
        const tab = this.config.tabs.find(t => t.id === tabId);
        if (!tab) return;

        try {
            // Mark as loading
            const panel = this.container?.querySelector(`#tab-panel-${tabId}`);
            if (panel) {
                panel.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading...</p></div>';
            }

            // Simulate async content loading (replace with actual loading logic)
            await new Promise(resolve => setTimeout(resolve, 500));

            // Update content
            if (panel) {
                panel.innerHTML = this.getTabContent(tab);
            }

            // Mark as loaded
            this.state.loadedTabs.add(tabId);
            
            this.log(`Loaded content for tab: ${tabId}`);
        } catch (error) {
            this.logError(`Failed to load content for tab: ${tabId}`, error);
            
            // Show error state
            const panel = this.container?.querySelector(`#tab-panel-${tabId}`);
            if (panel) {
                panel.innerHTML = `
                    <div class="error">
                        <p>Failed to load content for this tab.</p>
                        <button onclick="window.tabManager.retryLoadTab('${tabId}')">Retry</button>
                    </div>
                `;
            }
        }
    }

    /**
     * Retry loading a tab's content
     */
    public retryLoadTab(tabId: string): void {
        this.state.loadedTabs.delete(tabId);
        this.loadTabContent(tabId);
    }

    /**
     * Update the tab UI to reflect current state
     */
    private updateTabUI(): void {
        if (!this.container) return;

        // Update tab buttons
        const tabButtons = this.container.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            const tabId = button.getAttribute('data-tab-id');
            const isActive = tabId === this.state.activeTab;
            
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-selected', isActive.toString());
            button.setAttribute('tabindex', isActive ? '0' : '-1');
        });

        // Update tab panels
        const tabPanels = this.container.querySelectorAll('.tab-panel');
        tabPanels.forEach(panel => {
            const tabId = panel.getAttribute('data-tab-id');
            const isActive = tabId === this.state.activeTab;
            
            panel.classList.toggle('active', isActive);
        });
    }

    /**
     * Save the current tab's state
     */
    private saveCurrentTabState(): void {
        if (!this.state.activeTab || !this.container) return;

        const activePanel = this.container.querySelector(`#tab-panel-${this.state.activeTab}`);
        if (!activePanel) return;

        const currentState = this.state.tabStates.get(this.state.activeTab);
        if (currentState) {
            // Save scroll position
            currentState.scrollPosition = activePanel.scrollTop;
            
            // Save search query if there's a search input
            const searchInput = activePanel.querySelector('.search-input') as HTMLInputElement;
            if (searchInput) {
                currentState.searchQuery = searchInput.value;
            }

            // Save zoom level if there's zoom controls
            const zoomDisplay = activePanel.querySelector('.zoom-display');
            if (zoomDisplay) {
                const zoomText = zoomDisplay.textContent || '100%';
                const zoomValue = parseInt(zoomText.replace('%', '')) / 100;
                currentState.zoomLevel = zoomValue;
            }

            this.state.tabStates.set(this.state.activeTab, currentState);
        }
    }

    /**
     * Restore a tab's saved state
     */
    private restoreTabState(tabId: string): void {
        if (!this.container) return;

        const tabState = this.state.tabStates.get(tabId);
        if (!tabState) return;

        const panel = this.container.querySelector(`#tab-panel-${tabId}`);
        if (!panel) return;

        // Restore scroll position
        setTimeout(() => {
            panel.scrollTop = tabState.scrollPosition;
        }, 100);

        // Restore search query
        const searchInput = panel.querySelector('.search-input') as HTMLInputElement;
        if (searchInput && tabState.searchQuery) {
            searchInput.value = tabState.searchQuery;
            // Trigger search if there's a search handler
            const searchEvent = new Event('input', { bubbles: true });
            searchInput.dispatchEvent(searchEvent);
        }

        // Restore zoom level
        if (tabState.zoomLevel !== 1.0) {
            const content = panel.querySelector('.tab-content-inner');
            if (content) {
                (content as HTMLElement).style.transform = `scale(${tabState.zoomLevel})`;
            }
            
            const zoomDisplay = panel.querySelector('.zoom-display');
            if (zoomDisplay) {
                zoomDisplay.textContent = `${Math.round(tabState.zoomLevel * 100)}%`;
            }
        }
    }

    /**
     * Update content for a specific tab
     */
    public updateTabContent(tabId: string, content: string | HTMLElement): void {
        const tab = this.config.tabs.find(t => t.id === tabId);
        if (!tab) {
            this.log(`Cannot update content for tab '${tabId}' - tab not found`);
            return;
        }

        // Update tab config
        tab.content = content;

        // Update DOM if tab is currently visible
        if (this.container) {
            const panel = this.container.querySelector(`#tab-panel-${tabId}`);
            if (panel) {
                panel.innerHTML = this.getTabContent(tab);
            }
        }

        // Mark as loaded if it was lazy
        if (tab.lazy) {
            this.state.loadedTabs.add(tabId);
        }

        this.log(`Updated content for tab: ${tabId}`);
    }

    /**
     * Enable or disable a tab
     */
    public setTabEnabled(tabId: string, enabled: boolean): void {
        const tab = this.config.tabs.find(t => t.id === tabId);
        if (!tab) {
            this.log(`Cannot set enabled state for tab '${tabId}' - tab not found`);
            return;
        }

        tab.enabled = enabled;

        // Update UI
        if (this.container) {
            const button = this.container.querySelector(`[data-tab-id="${tabId}"]`);
            if (button) {
                button.classList.toggle('disabled', !enabled);
                if (enabled) {
                    button.removeAttribute('disabled');
                } else {
                    button.setAttribute('disabled', 'true');
                }
            }
        }

        // Switch to another tab if current tab is being disabled
        if (!enabled && this.state.activeTab === tabId) {
            const enabledTabs = this.config.tabs.filter(t => t.enabled);
            if (enabledTabs.length > 0) {
                this.switchToTab(enabledTabs[0].id);
            }
        }

        this.log(`Set tab '${tabId}' enabled: ${enabled}`);
    }

    /**
     * Add a new tab to the system
     */
    public addTab(tab: TabConfig): void {
        this.config.tabs.push(tab);
        
        // Initialize state for new tab
        this.state.tabStates.set(tab.id, {
            scrollPosition: 0,
            searchQuery: '',
            zoomLevel: 1.0,
            customData: {}
        });

        // Re-render if already initialized
        if (this.container) {
            this.renderTabSystem();
            this.setupEventListeners();
        }

        this.log(`Added new tab: ${tab.id}`);
    }

    /**
     * Remove a tab from the system
     */
    public removeTab(tabId: string): void {
        const tabIndex = this.config.tabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) {
            this.log(`Cannot remove tab '${tabId}' - tab not found`);
            return;
        }

        // Remove from config
        this.config.tabs.splice(tabIndex, 1);

        // Clean up state
        this.state.tabStates.delete(tabId);
        this.state.loadedTabs.delete(tabId);
        this.state.tabHistory = this.state.tabHistory.filter(id => id !== tabId);

        // Switch to another tab if current tab is being removed
        if (this.state.activeTab === tabId) {
            const remainingTabs = this.config.tabs.filter(t => t.enabled);
            if (remainingTabs.length > 0) {
                this.switchToTab(remainingTabs[0].id);
            }
        }

        // Re-render if already initialized
        if (this.container) {
            this.renderTabSystem();
            this.setupEventListeners();
        }

        this.log(`Removed tab: ${tabId}`);
    }

    /**
     * Get the current active tab ID
     */
    public getActiveTab(): string {
        return this.state.activeTab;
    }

    /**
     * Get the tab history
     */
    public getTabHistory(): string[] {
        return [...this.state.tabHistory];
    }

    /**
     * Get state for a specific tab
     */
    public getTabState(tabId: string): TabState | undefined {
        return this.state.tabStates.get(tabId);
    }

    /**
     * Set custom data for a tab's state
     */
    public setTabCustomData(tabId: string, data: any): void {
        const tabState = this.state.tabStates.get(tabId);
        if (tabState) {
            tabState.customData = data;
            this.state.tabStates.set(tabId, tabState);
        }
    }

    /**
     * Get all tab configurations
     */
    public getTabConfigs(): TabConfig[] {
        return [...this.config.tabs];
    }

    /**
     * Destroy the tab manager and clean up resources
     */
    public destroy(): void {
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        // Clear all state
        this.state.tabStates.clear();
        this.state.loadedTabs.clear();
        this.state.tabHistory = [];

        this.log('TabManager destroyed');
    }

    /**
     * Log debug information
     */
    private log(message: string, data?: any): void {
        if (this.debugMode) {
            const logMessage = data ? `${message}: ${JSON.stringify(data)}` : message;
            this.outputChannel.appendLine(`[TabManager] ${logMessage}`);
        }
    }

    /**
     * Log error information
     */
    private logError(message: string, error: any): void {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.outputChannel.appendLine(`[TabManager ERROR] ${message}: ${errorMessage}`);
        if (this.debugMode && error instanceof Error && error.stack) {
            this.outputChannel.appendLine(`[TabManager ERROR] Stack: ${error.stack}`);
        }
    }
}

// Export for global access in webview context
declare global {
    interface Window {
        tabManager: TabManager;
    }
}