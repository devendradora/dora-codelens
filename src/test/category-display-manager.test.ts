import * as assert from 'assert';
import { CategoryDisplayManager, CategorizedTechStackData } from '../services/category-display-manager';
import { ErrorHandler } from '../core/error-handler';

/**
 * Mock ErrorHandler for testing
 */
class MockErrorHandler {
  logError(message: string, error?: any, source?: string): void {
    // Silent for tests - could log to console if needed for debugging
  }
}

suite('CategoryDisplayManager Tests', () => {
  let categoryDisplayManager: CategoryDisplayManager;
  let mockErrorHandler: MockErrorHandler;

  setup(() => {
    mockErrorHandler = new MockErrorHandler();
    categoryDisplayManager = new CategoryDisplayManager(mockErrorHandler as any);
  });

  suite('renderCategorizedData', () => {
    test('should render categorized data correctly', () => {
      const mockData: CategorizedTechStackData = {
        categorized_tech_stack: {
          categories: {
            backend: {
              metadata: {
                name: 'backend',
                display_name: 'Backend',
                icon: '🔧',
                description: 'Backend technologies',
                color: '#4CAF50'
              },
              subcategories: {
                languages: {
                  name: 'languages',
                  display_name: 'Programming Languages',
                  icon: '💻',
                  technologies: [
                    {
                      name: 'Python',
                      version: '3.9.7',
                      source: 'detected',
                      confidence: 1.0,
                      metadata: { icon: '🐍' }
                    }
                  ],
                  visible: true,
                  order: 1
                }
              },
              total_count: 1,
              visible: true,
              layout_hints: { 
                full_width: true,
                subcategory_layout: 'grid'
              }
            }
          },
          total_technologies: 1,
          processing_metadata: {
            processing_time_ms: 150,
            rules_applied: 45
          },
          layout_config: { 
            full_width_categories: true,
            show_empty_categories: false,
            responsive_design: true,
            category_order: ['backend', 'frontend', 'databases', 'devops', 'others']
          }
        }
      };

      const html = categoryDisplayManager.renderCategorizedData(mockData);
      
      assert.ok(html.includes('tech-stack-categories'), 'Should contain tech-stack-categories');
      assert.ok(html.includes('tech-category-section'), 'Should contain tech-category-section');
      assert.ok(html.includes('Backend'), 'Should contain Backend');
      assert.ok(html.includes('Python'), 'Should contain Python');
      assert.ok(html.includes('🐍'), 'Should contain Python icon');
      assert.ok(html.includes('🔧'), 'Should contain Backend icon');
      assert.ok(html.includes('Programming Languages'), 'Should contain Programming Languages');
      assert.ok(html.includes('processing-info success'), 'Should contain processing info');
    });

    test('should handle empty categories correctly', () => {
      const mockData: CategorizedTechStackData = {
        categorized_tech_stack: {
          categories: {
            frontend: {
              metadata: {
                name: 'frontend',
                display_name: 'Frontend',
                icon: '🎨',
                description: 'Frontend technologies',
                color: '#2196F3'
              },
              subcategories: {},
              total_count: 0,
              visible: true,
              layout_hints: {
                full_width: true,
                subcategory_layout: 'grid',
                empty_state_message: 'No frontend technologies detected'
              }
            }
          },
          total_technologies: 0,
          processing_metadata: {},
          layout_config: { 
            full_width_categories: true,
            show_empty_categories: true,
            responsive_design: true,
            category_order: ['frontend']
          }
        }
      };

      const html = categoryDisplayManager.renderCategorizedData(mockData);
      
      assert.ok(html.includes('tech-empty-state'), 'Should contain empty state');
      assert.ok(html.includes('No frontend technologies detected'), 'Should contain empty message');
      assert.ok(html.includes('Frontend'), 'Should contain Frontend');
      assert.ok(html.includes('🎨'), 'Should contain Frontend icon');
    });

    test('should display confidence indicators correctly', () => {
      const mockData: CategorizedTechStackData = {
        categorized_tech_stack: {
          categories: {
            backend: {
              metadata: {
                name: 'backend',
                display_name: 'Backend',
                icon: '🔧',
                description: 'Backend technologies',
                color: '#4CAF50'
              },
              subcategories: {
                frameworks: {
                  name: 'frameworks',
                  display_name: 'Frameworks',
                  icon: '🏗️',
                  technologies: [
                    {
                      name: 'Django',
                      version: '4.2.0',
                      source: 'requirements.txt',
                      confidence: 0.95,
                      metadata: { icon: '🎸' }
                    },
                    {
                      name: 'Flask',
                      source: 'detected',
                      confidence: 0.75,
                      metadata: { icon: '🌶️' }
                    },
                    {
                      name: 'Unknown Framework',
                      source: 'guessed',
                      confidence: 0.3,
                      metadata: { icon: '❓' }
                    }
                  ],
                  visible: true
                }
              },
              total_count: 3,
              visible: true,
              layout_hints: { 
                full_width: true,
                subcategory_layout: 'grid'
              }
            }
          },
          total_technologies: 3,
          processing_metadata: {},
          layout_config: { 
            full_width_categories: true,
            show_empty_categories: false,
            responsive_design: true,
            category_order: ['backend']
          }
        }
      };

      const html = categoryDisplayManager.renderCategorizedData(mockData);
      
      assert.ok(html.includes('🟢'), 'Should contain high confidence indicator');
      assert.ok(html.includes('🟡'), 'Should contain medium confidence indicator');
      assert.ok(html.includes('🔴'), 'Should contain low confidence indicator');
      assert.ok(html.includes('Django'), 'Should contain Django');
      assert.ok(html.includes('Flask'), 'Should contain Flask');
      assert.ok(html.includes('Unknown Framework'), 'Should contain Unknown Framework');
    });

    test('should handle fallback mode correctly', () => {
      const mockData: CategorizedTechStackData = {
        categorized_tech_stack: {
          categories: {
            others: {
              metadata: {
                name: 'others',
                display_name: 'Others',
                icon: '📦',
                description: 'Other technologies',
                color: '#9C27B0'
              },
              subcategories: {},
              total_count: 0,
              visible: true,
              layout_hints: {
                full_width: true,
                subcategory_layout: 'grid',
                empty_state_message: 'Categorization unavailable'
              }
            }
          },
          total_technologies: 0,
          processing_metadata: {
            error: 'Categorization failed',
            fallback_mode: true
          },
          layout_config: { 
            full_width_categories: true,
            show_empty_categories: true,
            responsive_design: true,
            category_order: ['others']
          }
        }
      };

      const html = categoryDisplayManager.renderCategorizedData(mockData);
      
      assert.ok(html.includes('processing-info warning'), 'Should contain warning info');
      assert.ok(html.includes('Categorization failed'), 'Should contain error message');
      assert.ok(html.includes('⚠️'), 'Should contain warning icon');
    });

    test('should handle invalid data structure', () => {
      const invalidData = {} as CategorizedTechStackData;

      const html = categoryDisplayManager.renderCategorizedData(invalidData);
      
      assert.ok(html.includes('tech-stack-error'), 'Should contain error state');
      assert.ok(html.includes('Failed to display tech stack categories'), 'Should contain error message');
    });
  });



  suite('HTML escaping', () => {
    test('should escape HTML in technology names', () => {
      const mockData: CategorizedTechStackData = {
        categorized_tech_stack: {
          categories: {
            backend: {
              metadata: {
                name: 'backend',
                display_name: 'Backend',
                icon: '🔧',
                description: 'Backend technologies',
                color: '#4CAF50'
              },
              subcategories: {
                languages: {
                  name: 'languages',
                  display_name: 'Programming Languages',
                  icon: '💻',
                  technologies: [
                    {
                      name: '<script>alert("xss")</script>',
                      version: '<img src=x onerror=alert(1)>',
                      source: 'malicious',
                      confidence: 1.0
                    }
                  ],
                  visible: true
                }
              },
              total_count: 1,
              visible: true,
              layout_hints: { 
                full_width: true,
                subcategory_layout: 'grid'
              }
            }
          },
          total_technologies: 1,
          processing_metadata: {},
          layout_config: { 
            full_width_categories: true,
            show_empty_categories: false,
            responsive_design: true,
            category_order: ['backend']
          }
        }
      };

      const html = categoryDisplayManager.renderCategorizedData(mockData);
      
      assert.ok(!html.includes('<script>'), 'Should not contain unescaped script tag');
      assert.ok(!html.includes('<img'), 'Should not contain unescaped img tag');
      assert.ok(html.includes('&lt;script&gt;'), 'Should contain escaped script tag');
      assert.ok(html.includes('&lt;img'), 'Should contain escaped img tag');
    });
  });

  suite('subcategory ordering', () => {
    test('should order subcategories correctly', () => {
      const mockData: CategorizedTechStackData = {
        categorized_tech_stack: {
          categories: {
            backend: {
              metadata: {
                name: 'backend',
                display_name: 'Backend',
                icon: '🔧',
                description: 'Backend technologies',
                color: '#4CAF50'
              },
              subcategories: {
                frameworks: {
                  name: 'frameworks',
                  display_name: 'Frameworks',
                  icon: '🏗️',
                  technologies: [{ name: 'Django', source: 'test', confidence: 1.0 }],
                  visible: true,
                  order: 2
                },
                languages: {
                  name: 'languages',
                  display_name: 'Languages',
                  icon: '💻',
                  technologies: [{ name: 'Python', source: 'test', confidence: 1.0 }],
                  visible: true,
                  order: 1
                }
              },
              total_count: 2,
              visible: true,
              layout_hints: { 
                full_width: true,
                subcategory_layout: 'grid'
              }
            }
          },
          total_technologies: 2,
          processing_metadata: {},
          layout_config: { 
            full_width_categories: true,
            show_empty_categories: false,
            responsive_design: true,
            category_order: ['backend']
          }
        }
      };

      const html = categoryDisplayManager.renderCategorizedData(mockData);
      
      // Languages (order: 1) should appear before Frameworks (order: 2)
      const languagesIndex = html.indexOf('Languages');
      const frameworksIndex = html.indexOf('Frameworks');
      assert.ok(languagesIndex < frameworksIndex, 'Languages should appear before Frameworks');
    });
  });
});