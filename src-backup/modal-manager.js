"use strict";
/**
 * Modal Manager for handling full-screen modal dialogs
 * Provides enhanced modal functionality with proper event handling and cleanup
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModalManager = void 0;
class ModalManager {
    constructor() {
        this.modalContainer = null;
        this.state = {
            activeModal: null,
            modalStack: [],
            modalConfigs: new Map(),
            zoomLevel: 100,
            searchQuery: '',
            searchResults: []
        };
        this.eventListeners = new Map();
        // Bind escape key handler
        this.escapeKeyHandler = this.handleEscapeKey.bind(this);
        // Initialize modal container
        this.initializeModalContainer();
    }
    /**
     * Initialize the modal container in the DOM
     */
    initializeModalContainer() {
        // Create modal container if it doesn't exist
        this.modalContainer = document.getElementById('modal-container');
        if (!this.modalContainer) {
            this.modalContainer = document.createElement('div');
            this.modalContainer.id = 'modal-container';
            this.modalContainer.className = 'modal-container';
            document.body.appendChild(this.modalContainer);
        }
    }
    /**
     * Show a modal with the given configuration
     */
    showModal(config, controls) {
        try {
            // Store modal configuration
            this.state.modalConfigs.set(config.id, config);
            // Add to modal stack
            if (this.state.activeModal) {
                this.state.modalStack.push(this.state.activeModal);
            }
            this.state.activeModal = config.id;
            // Create modal element
            const modalElement = this.createModalElement(config, controls);
            // Clear container and add new modal
            if (this.modalContainer) {
                this.modalContainer.innerHTML = '';
                this.modalContainer.appendChild(modalElement);
                this.modalContainer.classList.add('active');
            }
            // Set up event listeners
            this.setupModalEventListeners(config.id);
            // Add global escape key listener
            document.addEventListener('keydown', this.escapeKeyHandler);
            // Call onShow callback
            if (config.onShow) {
                config.onShow();
            }
            // Focus management for accessibility
            this.manageFocus(modalElement);
        }
        catch (error) {
            console.error('Error showing modal:', error);
            throw new Error(`Failed to show modal ${config.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Close the currently active modal
     */
    closeModal(modalId) {
        try {
            const targetModalId = modalId || this.state.activeModal;
            if (!targetModalId) {
                return;
            }
            const config = this.state.modalConfigs.get(targetModalId);
            // Call onClose callback
            if (config?.onClose) {
                config.onClose();
            }
            // Clean up event listeners
            this.cleanupModalEventListeners(targetModalId);
            // Remove from modal stack and set new active modal
            if (this.state.modalStack.length > 0) {
                this.state.activeModal = this.state.modalStack.pop() || null;
            }
            else {
                this.state.activeModal = null;
            }
            // Hide modal container if no active modal
            if (!this.state.activeModal && this.modalContainer) {
                this.modalContainer.classList.remove('active');
                this.modalContainer.innerHTML = '';
            }
            // Remove global escape key listener if no active modals
            if (!this.state.activeModal) {
                document.removeEventListener('keydown', this.escapeKeyHandler);
            }
            // Remove modal configuration
            this.state.modalConfigs.delete(targetModalId);
            // Reset modal state
            this.resetModalState();
        }
        catch (error) {
            console.error('Error closing modal:', error);
        }
    }
    /**
     * Close all modals
     */
    closeAllModals() {
        try {
            // Close all modals in reverse order
            const allModalIds = Array.from(this.state.modalConfigs.keys());
            allModalIds.reverse().forEach(modalId => {
                this.closeModal(modalId);
            });
            // Reset state
            this.state.activeModal = null;
            this.state.modalStack = [];
            this.state.modalConfigs.clear();
            // Clean up container
            if (this.modalContainer) {
                this.modalContainer.classList.remove('active');
                this.modalContainer.innerHTML = '';
            }
            // Remove global listeners
            document.removeEventListener('keydown', this.escapeKeyHandler);
        }
        catch (error) {
            console.error('Error closing all modals:', error);
        }
    }
    /**
     * Create modal DOM element
     */
    createModalElement(config, controls) {
        const modal = document.createElement('div');
        modal.className = `modal ${config.fullScreen ? 'modal-fullscreen' : ''}`;
        modal.setAttribute('data-modal-id', config.id);
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', `modal-title-${config.id}`);
        // Create modal backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop && config.closable) {
                this.closeModal(config.id);
            }
        });
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        // Create modal header
        const header = this.createModalHeader(config, controls);
        modalContent.appendChild(header);
        // Create modal body
        const body = document.createElement('div');
        body.className = 'modal-body';
        body.id = `modal-body-${config.id}`;
        if (typeof config.content === 'string') {
            body.innerHTML = config.content;
        }
        else {
            body.appendChild(config.content);
        }
        modalContent.appendChild(body);
        backdrop.appendChild(modalContent);
        modal.appendChild(backdrop);
        return modal;
    }
    /**
     * Create modal header with controls
     */
    createModalHeader(config, controls) {
        const header = document.createElement('div');
        header.className = 'modal-header';
        // Title section
        const titleSection = document.createElement('div');
        titleSection.className = 'modal-title-section';
        const title = document.createElement('h2');
        title.id = `modal-title-${config.id}`;
        title.className = 'modal-title';
        title.textContent = config.title;
        titleSection.appendChild(title);
        header.appendChild(titleSection);
        // Controls section
        if (controls) {
            const controlsSection = this.createModalControls(config.id, controls);
            header.appendChild(controlsSection);
        }
        // Close button section
        if (config.closable) {
            const closeSection = document.createElement('div');
            closeSection.className = 'modal-close-section';
            const closeButton = document.createElement('button');
            closeButton.className = 'modal-close-btn';
            closeButton.setAttribute('aria-label', 'Close modal');
            closeButton.innerHTML = '&times;';
            closeButton.addEventListener('click', () => this.closeModal(config.id));
            closeSection.appendChild(closeButton);
            header.appendChild(closeSection);
        }
        return header;
    }
    /**
     * Create modal controls (search, zoom, reset, custom)
     */
    createModalControls(modalId, controls) {
        const controlsSection = document.createElement('div');
        controlsSection.className = 'modal-controls';
        // Search control
        if (controls.search) {
            const searchGroup = document.createElement('div');
            searchGroup.className = 'modal-control-group';
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.className = 'modal-search-input';
            searchInput.placeholder = 'Search content...';
            searchInput.addEventListener('input', (e) => {
                const target = e.target;
                this.handleSearch(modalId, target.value);
            });
            searchGroup.appendChild(searchInput);
            controlsSection.appendChild(searchGroup);
        }
        // Zoom controls
        if (controls.zoom) {
            const zoomGroup = document.createElement('div');
            zoomGroup.className = 'modal-control-group zoom-controls';
            const zoomOutBtn = document.createElement('button');
            zoomOutBtn.className = 'modal-control-btn';
            zoomOutBtn.innerHTML = '🔍−';
            zoomOutBtn.title = 'Zoom Out';
            zoomOutBtn.addEventListener('click', () => this.handleZoom(modalId, -10));
            const zoomLevel = document.createElement('span');
            zoomLevel.className = 'zoom-level';
            zoomLevel.textContent = `${this.state.zoomLevel}%`;
            const zoomInBtn = document.createElement('button');
            zoomInBtn.className = 'modal-control-btn';
            zoomInBtn.innerHTML = '🔍+';
            zoomInBtn.title = 'Zoom In';
            zoomInBtn.addEventListener('click', () => this.handleZoom(modalId, 10));
            zoomGroup.appendChild(zoomOutBtn);
            zoomGroup.appendChild(zoomLevel);
            zoomGroup.appendChild(zoomInBtn);
            controlsSection.appendChild(zoomGroup);
        }
        // Reset control
        if (controls.reset) {
            const resetGroup = document.createElement('div');
            resetGroup.className = 'modal-control-group';
            const resetBtn = document.createElement('button');
            resetBtn.className = 'modal-control-btn modal-reset-btn';
            resetBtn.innerHTML = '🔄';
            resetBtn.title = 'Reset View';
            resetBtn.addEventListener('click', () => this.handleReset(modalId));
            resetGroup.appendChild(resetBtn);
            controlsSection.appendChild(resetGroup);
        }
        // Custom controls
        if (controls.customControls) {
            controls.customControls.forEach(control => {
                const customGroup = document.createElement('div');
                customGroup.className = 'modal-control-group';
                const customBtn = document.createElement('button');
                customBtn.className = 'modal-control-btn';
                customBtn.innerHTML = control.icon;
                customBtn.title = control.label;
                customBtn.addEventListener('click', control.action);
                customGroup.appendChild(customBtn);
                controlsSection.appendChild(customGroup);
            });
        }
        return controlsSection;
    }
    /**
     * Set up event listeners for a modal
     */
    setupModalEventListeners(modalId) {
        const listeners = [];
        // Store listeners for cleanup
        this.eventListeners.set(modalId, listeners);
    }
    /**
     * Clean up event listeners for a modal
     */
    cleanupModalEventListeners(modalId) {
        const listeners = this.eventListeners.get(modalId);
        if (listeners) {
            // Event listeners are automatically removed when DOM elements are removed
            this.eventListeners.delete(modalId);
        }
    }
    /**
     * Handle escape key press
     */
    handleEscapeKey(event) {
        if (event.key === 'Escape' && this.state.activeModal) {
            const config = this.state.modalConfigs.get(this.state.activeModal);
            if (config?.closable) {
                this.closeModal(this.state.activeModal);
            }
        }
    }
    /**
     * Handle search functionality
     */
    handleSearch(modalId, query) {
        this.state.searchQuery = query;
        const modalBody = document.getElementById(`modal-body-${modalId}`);
        if (!modalBody)
            return;
        // Clear previous highlights
        this.clearSearchHighlights(modalBody);
        if (!query.trim()) {
            this.state.searchResults = [];
            return;
        }
        // Find and highlight matches
        const results = this.findTextMatches(modalBody, query);
        this.state.searchResults = results;
        this.highlightSearchResults(modalBody, results);
    }
    /**
     * Handle zoom functionality
     */
    handleZoom(modalId, delta) {
        this.state.zoomLevel = Math.max(50, Math.min(200, this.state.zoomLevel + delta));
        const modalBody = document.getElementById(`modal-body-${modalId}`);
        if (modalBody) {
            modalBody.style.transform = `scale(${this.state.zoomLevel / 100})`;
            modalBody.style.transformOrigin = 'top left';
        }
        // Update zoom level display
        const zoomLevelElement = document.querySelector('.zoom-level');
        if (zoomLevelElement) {
            zoomLevelElement.textContent = `${this.state.zoomLevel}%`;
        }
    }
    /**
     * Handle reset functionality
     */
    handleReset(modalId) {
        // Reset zoom
        this.state.zoomLevel = 100;
        const modalBody = document.getElementById(`modal-body-${modalId}`);
        if (modalBody) {
            modalBody.style.transform = '';
            modalBody.style.transformOrigin = '';
        }
        // Clear search
        this.state.searchQuery = '';
        this.state.searchResults = [];
        const searchInput = document.querySelector('.modal-search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        // Clear highlights
        if (modalBody) {
            this.clearSearchHighlights(modalBody);
        }
        // Update zoom level display
        const zoomLevelElement = document.querySelector('.zoom-level');
        if (zoomLevelElement) {
            zoomLevelElement.textContent = '100%';
        }
    }
    /**
     * Find text matches in the modal content
     */
    findTextMatches(element, query) {
        const results = [];
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
        let node;
        let index = 0;
        while (node = walker.nextNode()) {
            const text = node.textContent || '';
            const regex = new RegExp(query, 'gi');
            let match;
            while ((match = regex.exec(text)) !== null) {
                results.push({
                    elementId: `search-result-${index++}`,
                    text: match[0],
                    position: { line: 0, column: match.index },
                    highlighted: false
                });
            }
        }
        return results;
    }
    /**
     * Highlight search results in the content
     */
    highlightSearchResults(element, results) {
        if (results.length === 0)
            return;
        const query = this.state.searchQuery;
        const regex = new RegExp(`(${query})`, 'gi');
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent || '';
            if (regex.test(text)) {
                const parent = node.parentNode;
                const highlightedHTML = text.replace(regex, '<mark class="search-highlight">$1</mark>');
                parent.innerHTML = highlightedHTML;
            }
        }
    }
    /**
     * Clear search highlights
     */
    clearSearchHighlights(element) {
        const highlights = element.querySelectorAll('.search-highlight');
        highlights.forEach(highlight => {
            const parent = highlight.parentNode;
            if (parent) {
                parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
                parent.normalize();
            }
        });
    }
    /**
     * Manage focus for accessibility
     */
    manageFocus(modalElement) {
        // Focus the first focusable element in the modal
        const focusableElements = modalElement.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }
    /**
     * Reset modal state
     */
    resetModalState() {
        this.state.zoomLevel = 100;
        this.state.searchQuery = '';
        this.state.searchResults = [];
    }
    /**
     * Get current modal state
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Check if a modal is currently active
     */
    isModalActive(modalId) {
        if (modalId) {
            return this.state.activeModal === modalId;
        }
        return this.state.activeModal !== null;
    }
    /**
     * Destroy the modal manager and clean up all resources
     */
    destroy() {
        this.closeAllModals();
        if (this.modalContainer && this.modalContainer.parentNode) {
            this.modalContainer.parentNode.removeChild(this.modalContainer);
        }
        this.eventListeners.clear();
        this.state.modalConfigs.clear();
    }
}
exports.ModalManager = ModalManager;
//# sourceMappingURL=modal-manager.js.map