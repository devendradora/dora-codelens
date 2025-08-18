/**
 * Demo file to test the enhanced modal system
 * This file demonstrates how to use the ModalManager class
 */

import { ModalManager, ModalConfig, ModalControls } from './modal-manager';

export class ModalDemo {
    private modalManager: ModalManager;

    constructor() {
        this.modalManager = new ModalManager();
    }

    /**
     * Demo: Show a basic full-screen modal
     */
    public showBasicModal(): void {
        const config: ModalConfig = {
            id: 'basic-modal',
            title: 'Basic Full-Screen Modal',
            fullScreen: true,
            closable: true,
            content: this.createBasicModalContent(),
            onShow: () => console.log('Basic modal shown'),
            onClose: () => console.log('Basic modal closed')
        };

        const controls: ModalControls = {
            search: true,
            zoom: true,
            reset: true
        };

        this.modalManager.showModal(config, controls);
    }

    /**
     * Demo: Show a modal with custom controls
     */
    public showCustomControlsModal(): void {
        const config: ModalConfig = {
            id: 'custom-controls-modal',
            title: 'Modal with Custom Controls',
            fullScreen: true,
            closable: true,
            content: this.createCustomControlsModalContent(),
            onShow: () => console.log('Custom controls modal shown'),
            onClose: () => console.log('Custom controls modal closed')
        };

        const controls: ModalControls = {
            search: true,
            zoom: true,
            reset: true,
            customControls: [
                {
                    id: 'export',
                    label: 'Export',
                    icon: '📤',
                    action: () => this.handleExport()
                },
                {
                    id: 'print',
                    label: 'Print',
                    icon: '🖨️',
                    action: () => this.handlePrint()
                },
                {
                    id: 'share',
                    label: 'Share',
                    icon: '🔗',
                    action: () => this.handleShare()
                }
            ]
        };

        this.modalManager.showModal(config, controls);
    }

    /**
     * Demo: Show a modal for code analysis (simulating current file analysis)
     */
    public showCodeAnalysisModal(): void {
        const config: ModalConfig = {
            id: 'code-analysis-modal',
            title: 'Current File Analysis',
            fullScreen: true,
            closable: true,
            content: this.createCodeAnalysisModalContent(),
            onShow: () => console.log('Code analysis modal shown'),
            onClose: () => console.log('Code analysis modal closed')
        };

        const controls: ModalControls = {
            search: true,
            zoom: true,
            reset: true,
            customControls: [
                {
                    id: 'refresh',
                    label: 'Refresh Analysis',
                    icon: '🔄',
                    action: () => this.handleRefreshAnalysis()
                },
                {
                    id: 'settings',
                    label: 'Analysis Settings',
                    icon: '⚙️',
                    action: () => this.handleAnalysisSettings()
                }
            ]
        };

        this.modalManager.showModal(config, controls);
    }

    /**
     * Demo: Show a modal with database schema content
     */
    public showDatabaseSchemaModal(): void {
        const config: ModalConfig = {
            id: 'db-schema-modal',
            title: 'Database Schema Analysis',
            fullScreen: true,
            closable: true,
            content: this.createDatabaseSchemaModalContent(),
            onShow: () => console.log('Database schema modal shown'),
            onClose: () => console.log('Database schema modal closed')
        };

        const controls: ModalControls = {
            search: true,
            zoom: true,
            reset: true,
            customControls: [
                {
                    id: 'export-sql',
                    label: 'Export SQL',
                    icon: '💾',
                    action: () => this.handleExportSQL()
                },
                {
                    id: 'generate-docs',
                    label: 'Generate Docs',
                    icon: '📄',
                    action: () => this.handleGenerateDocs()
                }
            ]
        };

        this.modalManager.showModal(config, controls);
    }

    /**
     * Create basic modal content
     */
    private createBasicModalContent(): HTMLElement {
        const container = document.createElement('div');
        container.innerHTML = `
            <div style="padding: 20px;">
                <h3>Welcome to the Enhanced Modal System</h3>
                <p>This is a full-screen modal with enhanced functionality:</p>
                <ul>
                    <li><strong>Search:</strong> Use the search input to find content within the modal</li>
                    <li><strong>Zoom:</strong> Use the zoom controls to scale the content</li>
                    <li><strong>Reset:</strong> Use the reset button to restore original view</li>
                    <li><strong>Close:</strong> Click the X button, press Escape, or click outside to close</li>
                </ul>
                
                <h4>Sample Content for Testing</h4>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                
                <div style="background: var(--vscode-editor-inactiveSelectionBackground); padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h5>Code Example</h5>
                    <pre><code>function example() {
    console.log("This is searchable content");
    return "Hello World";
}</code></pre>
                </div>
                
                <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
                
                <h4>More Sample Content</h4>
                <p>This content can be searched and zoomed. Try typing "example" or "Lorem" in the search box above.</p>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0;">
                    <div style="padding: 10px; background: var(--vscode-button-secondaryBackground); border-radius: 5px;">
                        <h6>Feature 1</h6>
                        <p>Full-screen display with proper viewport coverage</p>
                    </div>
                    <div style="padding: 10px; background: var(--vscode-button-secondaryBackground); border-radius: 5px;">
                        <h6>Feature 2</h6>
                        <p>Multiple close mechanisms for better UX</p>
                    </div>
                    <div style="padding: 10px; background: var(--vscode-button-secondaryBackground); border-radius: 5px;">
                        <h6>Feature 3</h6>
                        <p>Search and zoom functionality</p>
                    </div>
                </div>
            </div>
        `;
        return container;
    }

    /**
     * Create custom controls modal content
     */
    private createCustomControlsModalContent(): HTMLElement {
        const container = document.createElement('div');
        container.innerHTML = `
            <div style="padding: 20px;">
                <h3>Modal with Custom Controls</h3>
                <p>This modal demonstrates custom control buttons in addition to the standard search, zoom, and reset controls.</p>
                
                <div style="background: var(--vscode-editor-inactiveSelectionBackground); padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h4>Available Custom Actions</h4>
                    <ul>
                        <li><strong>Export (📤):</strong> Export the current content</li>
                        <li><strong>Print (🖨️):</strong> Print the modal content</li>
                        <li><strong>Share (🔗):</strong> Share the content with others</li>
                    </ul>
                </div>
                
                <p>Try clicking the custom control buttons in the header to see them in action.</p>
                
                <h4>Sample Data for Export/Print</h4>
                <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                    <thead>
                        <tr style="background: var(--vscode-titleBar-activeBackground);">
                            <th style="padding: 8px; border: 1px solid var(--vscode-widget-border);">Name</th>
                            <th style="padding: 8px; border: 1px solid var(--vscode-widget-border);">Value</th>
                            <th style="padding: 8px; border: 1px solid var(--vscode-widget-border);">Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">Configuration</td>
                            <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">Production</td>
                            <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">String</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">Max Connections</td>
                            <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">100</td>
                            <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">Number</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">Debug Mode</td>
                            <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">false</td>
                            <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">Boolean</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        return container;
    }

    /**
     * Create code analysis modal content
     */
    private createCodeAnalysisModalContent(): HTMLElement {
        const container = document.createElement('div');
        container.innerHTML = `
            <div style="padding: 20px;">
                <h3>Current File Analysis Results</h3>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin: 20px 0;">
                    <div style="padding: 15px; background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 5px;">
                        <h4 style="margin-top: 0; color: var(--vscode-charts-green);">Complexity: Low</h4>
                        <p>Cyclomatic Complexity: 3</p>
                        <p>Maintainability Index: 85</p>
                    </div>
                    <div style="padding: 15px; background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 5px;">
                        <h4 style="margin-top: 0; color: var(--vscode-charts-blue);">Functions: 12</h4>
                        <p>Public Methods: 8</p>
                        <p>Private Methods: 4</p>
                    </div>
                    <div style="padding: 15px; background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 5px;">
                        <h4 style="margin-top: 0; color: var(--vscode-charts-orange);">Dependencies: 5</h4>
                        <p>External: 3</p>
                        <p>Internal: 2</p>
                    </div>
                </div>
                
                <h4>Function List</h4>
                <div style="background: var(--vscode-editor-background); border: 1px solid var(--vscode-widget-border); border-radius: 5px; padding: 15px;">
                    <ul style="list-style: none; padding: 0;">
                        <li style="padding: 8px; border-bottom: 1px solid var(--vscode-widget-border);">
                            <strong>constructor()</strong> - Line 15 - Complexity: 1
                        </li>
                        <li style="padding: 8px; border-bottom: 1px solid var(--vscode-widget-border);">
                            <strong>showModal(config, controls)</strong> - Line 45 - Complexity: 4
                        </li>
                        <li style="padding: 8px; border-bottom: 1px solid var(--vscode-widget-border);">
                            <strong>closeModal(modalId)</strong> - Line 78 - Complexity: 3
                        </li>
                        <li style="padding: 8px; border-bottom: 1px solid var(--vscode-widget-border);">
                            <strong>handleSearch(modalId, query)</strong> - Line 156 - Complexity: 5
                        </li>
                        <li style="padding: 8px;">
                            <strong>handleZoom(modalId, delta)</strong> - Line 189 - Complexity: 2
                        </li>
                    </ul>
                </div>
                
                <h4>Import Dependencies</h4>
                <pre style="background: var(--vscode-textCodeBlock-background); padding: 15px; border-radius: 5px; overflow-x: auto;"><code>import * as vscode from 'vscode';
import { ModalConfig, ModalControls } from './types';
import { EventManager } from './event-manager';
import { SearchHighlighter } from './search-highlighter';
import { ZoomController } from './zoom-controller';</code></pre>
            </div>
        `;
        return container;
    }

    /**
     * Create database schema modal content
     */
    private createDatabaseSchemaModalContent(): HTMLElement {
        const container = document.createElement('div');
        container.innerHTML = `
            <div style="padding: 20px;">
                <h3>Database Schema Analysis</h3>
                
                <div style="background: var(--vscode-editor-inactiveSelectionBackground); padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h4>Schema Summary</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                        <div style="text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: var(--vscode-charts-blue);">8</div>
                            <div style="font-size: 12px; color: var(--vscode-descriptionForeground);">Tables</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: var(--vscode-charts-green);">12</div>
                            <div style="font-size: 12px; color: var(--vscode-descriptionForeground);">Relationships</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: var(--vscode-charts-orange);">45</div>
                            <div style="font-size: 12px; color: var(--vscode-descriptionForeground);">Columns</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 24px; font-weight: bold; color: var(--vscode-charts-red);">6</div>
                            <div style="font-size: 12px; color: var(--vscode-descriptionForeground);">Indexes</div>
                        </div>
                    </div>
                </div>
                
                <h4>Table Definitions</h4>
                <div style="background: var(--vscode-editor-background); border: 1px solid var(--vscode-widget-border); border-radius: 5px; padding: 15px; margin: 15px 0;">
                    <h5>users</h5>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <thead>
                            <tr style="background: var(--vscode-titleBar-activeBackground);">
                                <th style="padding: 8px; border: 1px solid var(--vscode-widget-border); text-align: left;">Column</th>
                                <th style="padding: 8px; border: 1px solid var(--vscode-widget-border); text-align: left;">Type</th>
                                <th style="padding: 8px; border: 1px solid var(--vscode-widget-border); text-align: left;">Constraints</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);"><strong>id</strong></td>
                                <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">INTEGER</td>
                                <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">PRIMARY KEY, AUTO_INCREMENT</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">username</td>
                                <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">VARCHAR(50)</td>
                                <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">NOT NULL, UNIQUE</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">email</td>
                                <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">VARCHAR(100)</td>
                                <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">NOT NULL, UNIQUE</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">created_at</td>
                                <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">TIMESTAMP</td>
                                <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">DEFAULT CURRENT_TIMESTAMP</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <h5>posts</h5>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: var(--vscode-titleBar-activeBackground);">
                                <th style="padding: 8px; border: 1px solid var(--vscode-widget-border); text-align: left;">Column</th>
                                <th style="padding: 8px; border: 1px solid var(--vscode-widget-border); text-align: left;">Type</th>
                                <th style="padding: 8px; border: 1px solid var(--vscode-widget-border); text-align: left;">Constraints</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);"><strong>id</strong></td>
                                <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">INTEGER</td>
                                <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">PRIMARY KEY, AUTO_INCREMENT</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">user_id</td>
                                <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">INTEGER</td>
                                <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">FOREIGN KEY REFERENCES users(id)</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">title</td>
                                <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">VARCHAR(200)</td>
                                <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">NOT NULL</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">content</td>
                                <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">TEXT</td>
                                <td style="padding: 8px; border: 1px solid var(--vscode-widget-border);">NULL</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <h4>SQL Create Statements</h4>
                <pre style="background: var(--vscode-textCodeBlock-background); padding: 15px; border-radius: 5px; overflow-x: auto;"><code>CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at);</code></pre>
            </div>
        `;
        return container;
    }

    /**
     * Handle export action
     */
    private handleExport(): void {
        console.log('Export action triggered');
        // In a real implementation, this would export the modal content
        console.log('Export functionality would be implemented here');
    }

    /**
     * Handle print action
     */
    private handlePrint(): void {
        console.log('Print action triggered');
        // In a real implementation, this would print the modal content
        console.log('Print functionality would be implemented here');
    }

    /**
     * Handle share action
     */
    private handleShare(): void {
        console.log('Share action triggered');
        // In a real implementation, this would share the modal content
        console.log('Share functionality would be implemented here');
    }

    /**
     * Handle refresh analysis action
     */
    private handleRefreshAnalysis(): void {
        console.log('Refresh analysis action triggered');
        console.log('Analysis refresh would be implemented here');
    }

    /**
     * Handle analysis settings action
     */
    private handleAnalysisSettings(): void {
        console.log('Analysis settings action triggered');
        console.log('Analysis settings would be implemented here');
    }

    /**
     * Handle export SQL action
     */
    private handleExportSQL(): void {
        console.log('Export SQL action triggered');
        console.log('SQL export functionality would be implemented here');
    }

    /**
     * Handle generate docs action
     */
    private handleGenerateDocs(): void {
        console.log('Generate docs action triggered');
        console.log('Documentation generation would be implemented here');
    }

    /**
     * Get the modal manager instance
     */
    public getModalManager(): ModalManager {
        return this.modalManager;
    }

    /**
     * Clean up resources
     */
    public destroy(): void {
        this.modalManager.destroy();
    }
}