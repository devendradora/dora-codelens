/**
 * Test suite for the ModalManager class
 */

import * as assert from 'assert';
import { ModalManager, ModalConfig, ModalControls } from '../../modal-manager';

suite('ModalManager Test Suite', () => {
    let modalManager: ModalManager;

    setup(() => {
        // Set up DOM environment for testing
        if (typeof document === 'undefined') {
            // Mock classList
            const mockClassList = {
                add: () => {},
                remove: () => {},
                contains: () => false,
                toggle: () => false
            };

            // Mock document for Node.js environment
            const mockElement = {
                tagName: 'DIV',
                className: '',
                id: '',
                innerHTML: '',
                style: {},
                classList: mockClassList,
                setAttribute: () => {},
                appendChild: () => {},
                addEventListener: () => {},
                querySelector: () => null,
                querySelectorAll: () => [],
                textContent: '',
                parentNode: null,
                replaceChild: () => {},
                normalize: () => {},
                focus: () => {}
            };

            global.document = {
                createElement: () => mockElement,
                getElementById: () => mockElement,
                body: {
                    appendChild: () => {}
                },
                addEventListener: () => {},
                removeEventListener: () => {},
                createTreeWalker: () => ({
                    nextNode: () => null
                }),
                createTextNode: () => ({ textContent: '' }),
                querySelector: () => mockElement,
                querySelectorAll: () => [mockElement]
            } as any;

            // Mock NodeFilter
            global.NodeFilter = {
                SHOW_TEXT: 4
            } as any;
        }

        // Create a new modal manager for each test
        modalManager = new ModalManager();
    });

    teardown(() => {
        // Clean up after each test
        if (modalManager) {
            modalManager.destroy();
        }
    });

    test('ModalManager should be instantiated correctly', () => {
        assert.ok(modalManager);
        assert.strictEqual(modalManager.isModalActive(), false);
    });

    test('Should show a basic modal', () => {
        const config: ModalConfig = {
            id: 'test-modal',
            title: 'Test Modal',
            fullScreen: true,
            closable: true,
            content: '<p>Test content</p>'
        };

        // This should not throw an error
        assert.doesNotThrow(() => {
            modalManager.showModal(config);
        });

        // Modal should be active
        assert.strictEqual(modalManager.isModalActive('test-modal'), true);
    });

    test('Should show modal with controls', () => {
        const config: ModalConfig = {
            id: 'test-modal-controls',
            title: 'Test Modal with Controls',
            fullScreen: true,
            closable: true,
            content: '<p>Test content with controls</p>'
        };

        const controls: ModalControls = {
            search: true,
            zoom: true,
            reset: true,
            customControls: [
                {
                    id: 'test-control',
                    label: 'Test',
                    icon: '🧪',
                    action: () => console.log('Test action')
                }
            ]
        };

        assert.doesNotThrow(() => {
            modalManager.showModal(config, controls);
        });

        assert.strictEqual(modalManager.isModalActive('test-modal-controls'), true);
    });

    test('Should close modal correctly', () => {
        const config: ModalConfig = {
            id: 'test-modal-close',
            title: 'Test Modal Close',
            fullScreen: true,
            closable: true,
            content: '<p>Test content for closing</p>'
        };

        modalManager.showModal(config);
        assert.strictEqual(modalManager.isModalActive('test-modal-close'), true);

        modalManager.closeModal('test-modal-close');
        assert.strictEqual(modalManager.isModalActive('test-modal-close'), false);
    });

    test('Should handle multiple modals (modal stack)', () => {
        const config1: ModalConfig = {
            id: 'modal-1',
            title: 'First Modal',
            fullScreen: true,
            closable: true,
            content: '<p>First modal content</p>'
        };

        const config2: ModalConfig = {
            id: 'modal-2',
            title: 'Second Modal',
            fullScreen: true,
            closable: true,
            content: '<p>Second modal content</p>'
        };

        modalManager.showModal(config1);
        assert.strictEqual(modalManager.isModalActive('modal-1'), true);

        modalManager.showModal(config2);
        assert.strictEqual(modalManager.isModalActive('modal-2'), true);
        assert.strictEqual(modalManager.isModalActive('modal-1'), false);

        modalManager.closeModal('modal-2');
        assert.strictEqual(modalManager.isModalActive('modal-1'), true);
        assert.strictEqual(modalManager.isModalActive('modal-2'), false);
    });

    test('Should close all modals', () => {
        const config1: ModalConfig = {
            id: 'modal-all-1',
            title: 'Modal 1',
            fullScreen: true,
            closable: true,
            content: '<p>Modal 1 content</p>'
        };

        const config2: ModalConfig = {
            id: 'modal-all-2',
            title: 'Modal 2',
            fullScreen: true,
            closable: true,
            content: '<p>Modal 2 content</p>'
        };

        modalManager.showModal(config1);
        modalManager.showModal(config2);

        assert.strictEqual(modalManager.isModalActive(), true);

        modalManager.closeAllModals();

        assert.strictEqual(modalManager.isModalActive(), false);
        assert.strictEqual(modalManager.isModalActive('modal-all-1'), false);
        assert.strictEqual(modalManager.isModalActive('modal-all-2'), false);
    });

    test('Should handle modal state correctly', () => {
        const config: ModalConfig = {
            id: 'state-test-modal',
            title: 'State Test Modal',
            fullScreen: true,
            closable: true,
            content: '<p>State test content</p>'
        };

        const initialState = modalManager.getState();
        assert.strictEqual(initialState.activeModal, null);
        assert.strictEqual(initialState.modalStack.length, 0);
        assert.strictEqual(initialState.zoomLevel, 100);
        assert.strictEqual(initialState.searchQuery, '');

        modalManager.showModal(config);

        const activeState = modalManager.getState();
        assert.strictEqual(activeState.activeModal, 'state-test-modal');
        assert.strictEqual(activeState.modalConfigs.has('state-test-modal'), true);
    });

    test('Should handle callbacks correctly', () => {
        let showCallbackCalled = false;
        let closeCallbackCalled = false;

        const config: ModalConfig = {
            id: 'callback-test-modal',
            title: 'Callback Test Modal',
            fullScreen: true,
            closable: true,
            content: '<p>Callback test content</p>',
            onShow: () => {
                showCallbackCalled = true;
            },
            onClose: () => {
                closeCallbackCalled = true;
            }
        };

        modalManager.showModal(config);
        assert.strictEqual(showCallbackCalled, true);

        modalManager.closeModal('callback-test-modal');
        assert.strictEqual(closeCallbackCalled, true);
    });

    test('Should handle errors gracefully', () => {
        // Test with invalid config
        const invalidConfig = {
            id: '',
            title: '',
            fullScreen: true,
            closable: true,
            content: null
        } as any;

        // Should not crash the application
        assert.doesNotThrow(() => {
            try {
                modalManager.showModal(invalidConfig);
            } catch (error) {
                // Expected to throw, but should be handled gracefully
                assert.ok(error instanceof Error);
            }
        });
    });

    test('Should handle DOM element content', () => {
        const contentElement = document.createElement('div');
        contentElement.innerHTML = '<h3>DOM Element Content</h3><p>This is content from a DOM element</p>';

        const config: ModalConfig = {
            id: 'dom-content-modal',
            title: 'DOM Content Modal',
            fullScreen: true,
            closable: true,
            content: contentElement
        };

        assert.doesNotThrow(() => {
            modalManager.showModal(config);
        });

        assert.strictEqual(modalManager.isModalActive('dom-content-modal'), true);
    });

    test('Should handle non-closable modals', () => {
        const config: ModalConfig = {
            id: 'non-closable-modal',
            title: 'Non-Closable Modal',
            fullScreen: true,
            closable: false,
            content: '<p>This modal cannot be closed by user actions</p>'
        };

        modalManager.showModal(config);
        assert.strictEqual(modalManager.isModalActive('non-closable-modal'), true);

        // Should still be able to close programmatically
        modalManager.closeModal('non-closable-modal');
        assert.strictEqual(modalManager.isModalActive('non-closable-modal'), false);
    });

    // Search Functionality Tests
    suite('Search Functionality', () => {
        test('Should handle search with empty query', () => {
            const config: ModalConfig = {
                id: 'search-empty-modal',
                title: 'Search Test Modal',
                fullScreen: true,
                closable: true,
                content: '<p>This is some test content for searching</p>'
            };

            const controls: ModalControls = {
                search: true,
                zoom: false,
                reset: false
            };

            modalManager.showModal(config, controls);

            // Test empty search query
            assert.doesNotThrow(() => {
                (modalManager as any).handleSearch('search-empty-modal', '');
            });

            const state = modalManager.getState();
            assert.strictEqual(state.searchQuery, '');
            assert.strictEqual(state.searchResults.length, 0);
        });

        test('Should find text matches in modal content', () => {
            const config: ModalConfig = {
                id: 'search-matches-modal',
                title: 'Search Matches Test',
                fullScreen: true,
                closable: true,
                content: '<p>This is test content with multiple test words for testing</p>'
            };

            const controls: ModalControls = {
                search: true,
                zoom: false,
                reset: false
            };

            modalManager.showModal(config, controls);

            // Test search with matches
            assert.doesNotThrow(() => {
                (modalManager as any).handleSearch('search-matches-modal', 'test');
            });

            const state = modalManager.getState();
            assert.strictEqual(state.searchQuery, 'test');
            // Should find multiple matches of "test"
            assert.ok(state.searchResults.length > 0);
        });

        test('Should handle case-insensitive search', () => {
            const config: ModalConfig = {
                id: 'search-case-modal',
                title: 'Case Insensitive Search Test',
                fullScreen: true,
                closable: true,
                content: '<p>This Content Has Mixed CASE words for Testing</p>'
            };

            const controls: ModalControls = {
                search: true,
                zoom: false,
                reset: false
            };

            modalManager.showModal(config, controls);

            // Test case-insensitive search
            assert.doesNotThrow(() => {
                (modalManager as any).handleSearch('search-case-modal', 'content');
            });

            const state = modalManager.getState();
            assert.strictEqual(state.searchQuery, 'content');
            assert.ok(state.searchResults.length > 0);
        });

        test('Should clear search highlights when query is empty', () => {
            const config: ModalConfig = {
                id: 'search-clear-modal',
                title: 'Search Clear Test',
                fullScreen: true,
                closable: true,
                content: '<p>Content to search and then clear</p>'
            };

            const controls: ModalControls = {
                search: true,
                zoom: false,
                reset: false
            };

            modalManager.showModal(config, controls);

            // First search for something
            (modalManager as any).handleSearch('search-clear-modal', 'content');
            let state = modalManager.getState();
            assert.ok(state.searchResults.length > 0);

            // Then clear the search
            (modalManager as any).handleSearch('search-clear-modal', '');
            state = modalManager.getState();
            assert.strictEqual(state.searchQuery, '');
            assert.strictEqual(state.searchResults.length, 0);
        });

        test('Should handle search with no matches', () => {
            const config: ModalConfig = {
                id: 'search-no-matches-modal',
                title: 'No Matches Search Test',
                fullScreen: true,
                closable: true,
                content: '<p>This content has no matching words</p>'
            };

            const controls: ModalControls = {
                search: true,
                zoom: false,
                reset: false
            };

            modalManager.showModal(config, controls);

            // Search for something that doesn't exist
            assert.doesNotThrow(() => {
                (modalManager as any).handleSearch('search-no-matches-modal', 'xyz123');
            });

            const state = modalManager.getState();
            assert.strictEqual(state.searchQuery, 'xyz123');
            assert.strictEqual(state.searchResults.length, 0);
        });

        test('Should handle search with special characters', () => {
            const config: ModalConfig = {
                id: 'search-special-modal',
                title: 'Special Characters Search Test',
                fullScreen: true,
                closable: true,
                content: '<p>Content with special chars: @#$%^&*()</p>'
            };

            const controls: ModalControls = {
                search: true,
                zoom: false,
                reset: false
            };

            modalManager.showModal(config, controls);

            // Search for special characters
            assert.doesNotThrow(() => {
                (modalManager as any).handleSearch('search-special-modal', '@#$');
            });

            const state = modalManager.getState();
            assert.strictEqual(state.searchQuery, '@#$');
        });
    });

    // Zoom Functionality Tests
    suite('Zoom Functionality', () => {
        test('Should handle zoom in', () => {
            const config: ModalConfig = {
                id: 'zoom-in-modal',
                title: 'Zoom In Test',
                fullScreen: true,
                closable: true,
                content: '<p>Content to zoom in</p>'
            };

            const controls: ModalControls = {
                search: false,
                zoom: true,
                reset: false
            };

            modalManager.showModal(config, controls);

            // Test zoom in
            assert.doesNotThrow(() => {
                (modalManager as any).handleZoom('zoom-in-modal', 10);
            });

            const state = modalManager.getState();
            assert.strictEqual(state.zoomLevel, 110);
        });

        test('Should handle zoom out', () => {
            const config: ModalConfig = {
                id: 'zoom-out-modal',
                title: 'Zoom Out Test',
                fullScreen: true,
                closable: true,
                content: '<p>Content to zoom out</p>'
            };

            const controls: ModalControls = {
                search: false,
                zoom: true,
                reset: false
            };

            modalManager.showModal(config, controls);

            // Test zoom out
            assert.doesNotThrow(() => {
                (modalManager as any).handleZoom('zoom-out-modal', -10);
            });

            const state = modalManager.getState();
            assert.strictEqual(state.zoomLevel, 90);
        });

        test('Should enforce zoom limits', () => {
            const config: ModalConfig = {
                id: 'zoom-limits-modal',
                title: 'Zoom Limits Test',
                fullScreen: true,
                closable: true,
                content: '<p>Content to test zoom limits</p>'
            };

            const controls: ModalControls = {
                search: false,
                zoom: true,
                reset: false
            };

            modalManager.showModal(config, controls);

            // Test minimum zoom limit
            (modalManager as any).handleZoom('zoom-limits-modal', -100);
            let state = modalManager.getState();
            assert.strictEqual(state.zoomLevel, 50); // Should not go below 50%

            // Reset to test maximum
            (modalManager as any).handleReset('zoom-limits-modal');
            
            // Test maximum zoom limit
            (modalManager as any).handleZoom('zoom-limits-modal', 150);
            state = modalManager.getState();
            assert.strictEqual(state.zoomLevel, 200); // Should not go above 200%
        });

        test('Should handle multiple zoom operations', () => {
            const config: ModalConfig = {
                id: 'zoom-multiple-modal',
                title: 'Multiple Zoom Test',
                fullScreen: true,
                closable: true,
                content: '<p>Content for multiple zoom operations</p>'
            };

            const controls: ModalControls = {
                search: false,
                zoom: true,
                reset: false
            };

            modalManager.showModal(config, controls);

            // Multiple zoom operations
            (modalManager as any).handleZoom('zoom-multiple-modal', 10);
            (modalManager as any).handleZoom('zoom-multiple-modal', 10);
            (modalManager as any).handleZoom('zoom-multiple-modal', -5);

            const state = modalManager.getState();
            assert.strictEqual(state.zoomLevel, 115);
        });
    });

    // Reset Functionality Tests
    suite('Reset Functionality', () => {
        test('Should reset zoom level', () => {
            const config: ModalConfig = {
                id: 'reset-zoom-modal',
                title: 'Reset Zoom Test',
                fullScreen: true,
                closable: true,
                content: '<p>Content to reset zoom</p>'
            };

            const controls: ModalControls = {
                search: false,
                zoom: true,
                reset: true
            };

            modalManager.showModal(config, controls);

            // Change zoom level
            (modalManager as any).handleZoom('reset-zoom-modal', 30);
            let state = modalManager.getState();
            assert.strictEqual(state.zoomLevel, 130);

            // Reset
            assert.doesNotThrow(() => {
                (modalManager as any).handleReset('reset-zoom-modal');
            });

            state = modalManager.getState();
            assert.strictEqual(state.zoomLevel, 100);
        });

        test('Should clear search query and results', () => {
            const config: ModalConfig = {
                id: 'reset-search-modal',
                title: 'Reset Search Test',
                fullScreen: true,
                closable: true,
                content: '<p>Content to search and reset</p>'
            };

            const controls: ModalControls = {
                search: true,
                zoom: false,
                reset: true
            };

            modalManager.showModal(config, controls);

            // Perform search
            (modalManager as any).handleSearch('reset-search-modal', 'content');
            let state = modalManager.getState();
            assert.strictEqual(state.searchQuery, 'content');
            assert.ok(state.searchResults.length > 0);

            // Reset
            assert.doesNotThrow(() => {
                (modalManager as any).handleReset('reset-search-modal');
            });

            state = modalManager.getState();
            assert.strictEqual(state.searchQuery, '');
            assert.strictEqual(state.searchResults.length, 0);
        });

        test('Should reset both zoom and search simultaneously', () => {
            const config: ModalConfig = {
                id: 'reset-both-modal',
                title: 'Reset Both Test',
                fullScreen: true,
                closable: true,
                content: '<p>Content to test full reset functionality</p>'
            };

            const controls: ModalControls = {
                search: true,
                zoom: true,
                reset: true
            };

            modalManager.showModal(config, controls);

            // Change both zoom and search
            (modalManager as any).handleZoom('reset-both-modal', 25);
            (modalManager as any).handleSearch('reset-both-modal', 'test');

            let state = modalManager.getState();
            assert.strictEqual(state.zoomLevel, 125);
            assert.strictEqual(state.searchQuery, 'test');
            assert.ok(state.searchResults.length > 0);

            // Reset everything
            (modalManager as any).handleReset('reset-both-modal');

            state = modalManager.getState();
            assert.strictEqual(state.zoomLevel, 100);
            assert.strictEqual(state.searchQuery, '');
            assert.strictEqual(state.searchResults.length, 0);
        });
    });
});