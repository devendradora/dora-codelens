import * as assert from 'assert';
import { CategoryRenderer } from '../services/category-renderer';
import { TechnologyCategory, ProcessedTechnology } from '../types/tech-stack-types';

/**
 * Mock ErrorHandler for testing
 */
class MockErrorHandler {
  logError(message: string, error?: any, source?: string): void {
    // Silent for tests - could log to console if needed for debugging
    // console.log(`[TEST] ${source}: ${message}`, error);
  }

  validateAnalysisResult(result: any): any | null {
    return result;
  }
}

suite('CategoryRenderer Tests', () => {
  let renderer: CategoryRenderer;
  let mockErrorHandler: MockErrorHandler;

  setup(() => {
    mockErrorHandler = new MockErrorHandler();
    renderer = new CategoryRenderer(mockErrorHandler as any);
  });

  suite('Category Rendering Tests', () => {
    test('should render categorized tech stack with all categories', () => {
      const categories = createMockCategories();
      
      const html = renderer.renderCategorizedTechStack(categories);
      
      assert.ok(html.includes('tech-categories-container'), 'Should include container class');
      assert.ok(html.includes('🔧'), 'Should include backend icon');
      assert.ok(html.includes('🎨'), 'Should include frontend icon');
      assert.ok(html.includes('🗄️'), 'Should include databases icon');
      assert.ok(html.includes('⚙️'), 'Should include devops icon');
      assert.ok(html.includes('📦'), 'Should include others icon');
    });

    test('should render category headers correctly', () => {
      const category: TechnologyCategory = {
        name: 'backend',
        displayName: 'Backend',
        icon: '🔧',
        description: 'Server-side frameworks',
        technologies: [],
        count: 5,
        visible: true
      };

      const html = renderer.renderCategoryHeader(category);
      
      assert.ok(html.includes('tech-category-header'), 'Should include header class');
      assert.ok(html.includes('🔧'), 'Should include icon');
      assert.ok(html.includes('Backend'), 'Should include display name');
      assert.ok(html.includes('5'), 'Should include count');
    });

    test('should render technology grid correctly', () => {
      const technologies: ProcessedTechnology[] = [
        { name: 'django', version: '4.0', category: 'backend', subcategory: 'frameworks', confidence: 1.0 },
        { name: 'flask', category: 'backend', subcategory: 'frameworks', confidence: 0.9 },
        { name: 'fastapi', version: '0.68', category: 'backend', subcategory: 'frameworks', confidence: 1.0 }
      ];

      const html = renderer.renderTechnologyGrid(technologies);
      
      assert.ok(html.includes('tech-items-grid'), 'Should include grid class');
      assert.ok(html.includes('django'), 'Should include technology names');
      assert.ok(html.includes('4.0'), 'Should include versions when available');
      assert.ok(html.includes('confidence-high'), 'Should include confidence classes');
    });

    test('should handle empty categories gracefully', () => {
      const categories = new Map<string, TechnologyCategory>();
      
      const html = renderer.renderCategorizedTechStack(categories);
      
      assert.ok(html.includes('tech-stack-empty-state'), 'Should show empty state');
      assert.ok(html.includes('No Technologies Detected'), 'Should show empty message');
    });

    test('should apply confidence classes correctly', () => {
      const technologies: ProcessedTechnology[] = [
        { name: 'high-conf', category: 'backend', subcategory: 'miscellaneous', confidence: 0.95 },
        { name: 'medium-conf', category: 'backend', subcategory: 'miscellaneous', confidence: 0.75 },
        { name: 'low-conf', category: 'backend', subcategory: 'miscellaneous', confidence: 0.4 }
      ];

      const html = renderer.renderTechnologyGrid(technologies);
      
      assert.ok(html.includes('confidence-high'), 'Should apply high confidence class');
      assert.ok(html.includes('confidence-medium'), 'Should apply medium confidence class');
      assert.ok(html.includes('confidence-low'), 'Should apply low confidence class');
    });

    test('should escape HTML in technology names', () => {
      const technologies: ProcessedTechnology[] = [
        { name: '<script>alert("xss")</script>', category: 'others', subcategory: 'miscellaneous', confidence: 0.5 }
      ];

      const html = renderer.renderTechnologyGrid(technologies);
      
      assert.ok(!html.includes('<script>'), 'Should escape script tags');
      assert.ok(html.includes('&lt;script&gt;'), 'Should show escaped HTML');
    });

    test('should include responsive CSS styles', () => {
      const categories = createMockCategories();
      
      const html = renderer.renderCategorizedTechStack(categories);
      
      assert.ok(html.includes('@media'), 'Should include responsive media queries');
      assert.ok(html.includes('grid-template-columns'), 'Should include grid layout');
      assert.ok(html.includes('max-width: 1023px'), 'Should include tablet breakpoint');
      assert.ok(html.includes('max-width: 600px'), 'Should include mobile breakpoint');
    });

    test('should render categories in correct order', () => {
      const categories = createMockCategories();
      
      const html = renderer.renderCategorizedTechStack(categories);
      
      // Check that backend appears before frontend, frontend before databases, etc.
      const backendIndex = html.indexOf('Backend');
      const frontendIndex = html.indexOf('Frontend');
      const databasesIndex = html.indexOf('Databases');
      const devopsIndex = html.indexOf('DevOps');
      const othersIndex = html.indexOf('Others');
      
      assert.ok(backendIndex < frontendIndex, 'Backend should appear before Frontend');
      assert.ok(frontendIndex < databasesIndex, 'Frontend should appear before Databases');
      assert.ok(databasesIndex < devopsIndex, 'Databases should appear before DevOps');
      assert.ok(devopsIndex < othersIndex, 'DevOps should appear before Others');
    });

    test('should handle categories with no technologies', () => {
      const category: TechnologyCategory = {
        name: 'backend',
        displayName: 'Backend',
        icon: '🔧',
        description: 'Server-side frameworks',
        technologies: [],
        count: 0,
        visible: true
      };

      const html = renderer.renderCategorySection(category);
      
      assert.ok(html.includes('tech-category-empty'), 'Should show empty category message');
      assert.ok(html.includes('No technologies detected'), 'Should show appropriate message');
    });
  });

  suite('Error Handling Tests', () => {
    test('should handle rendering errors gracefully', () => {
      // Create a category with invalid data to trigger an error
      const invalidCategory = {
        name: null,
        displayName: null,
        icon: null,
        description: null,
        technologies: null,
        count: null,
        visible: true
      } as any;

      const html = renderer.renderCategorySection(invalidCategory);
      
      assert.ok(html.includes('tech-category-error'), 'Should show error state');
    });

    test('should handle grid rendering errors gracefully', () => {
      const invalidTechnologies = [null, undefined, { invalid: 'data' }] as any;
      
      const html = renderer.renderTechnologyGrid(invalidTechnologies);
      
      // Should not throw and should handle gracefully
      assert.ok(typeof html === 'string', 'Should return string even with invalid data');
    });
  });

  suite('CSS Generation Tests', () => {
    test('should generate complete CSS styles', () => {
      const css = renderer.generateCategoryStyles();
      
      assert.ok(css.includes('.tech-categories-container'), 'Should include container styles');
      assert.ok(css.includes('.tech-category-section'), 'Should include section styles');
      assert.ok(css.includes('.tech-category-header'), 'Should include header styles');
      assert.ok(css.includes('.tech-items-grid'), 'Should include grid styles');
      assert.ok(css.includes('.tech-item'), 'Should include item styles');
    });

    test('should include hover effects', () => {
      const css = renderer.generateCategoryStyles();
      
      assert.ok(css.includes(':hover'), 'Should include hover effects');
      assert.ok(css.includes('transform: translateY'), 'Should include transform effects');
    });

    test('should include confidence styling', () => {
      const css = renderer.generateCategoryStyles();
      
      assert.ok(css.includes('.confidence-high'), 'Should include high confidence styles');
      assert.ok(css.includes('.confidence-medium'), 'Should include medium confidence styles');
      assert.ok(css.includes('.confidence-low'), 'Should include low confidence styles');
    });
  });

  /**
   * Helper function to create mock categories for testing
   */
  function createMockCategories(): Map<string, TechnologyCategory> {
    const categories = new Map<string, TechnologyCategory>();

    categories.set('backend', {
      name: 'backend',
      displayName: 'Backend',
      icon: '🔧',
      description: 'Server-side frameworks',
      technologies: [
        { name: 'django', version: '4.0', category: 'backend', subcategory: 'frameworks', confidence: 1.0 },
        { name: 'flask', category: 'backend', subcategory: 'frameworks', confidence: 0.9 }
      ],
      count: 2,
      visible: true
    });

    categories.set('frontend', {
      name: 'frontend',
      displayName: 'Frontend',
      icon: '🎨',
      description: 'Client-side frameworks',
      technologies: [
        { name: 'react', version: '18.0', category: 'frontend', subcategory: 'frameworks', confidence: 1.0 }
      ],
      count: 1,
      visible: true
    });

    categories.set('databases', {
      name: 'databases',
      displayName: 'Databases',
      icon: '🗄️',
      description: 'Database systems',
      technologies: [
        { name: 'postgresql', category: 'databases', subcategory: 'sql-databases', confidence: 1.0 }
      ],
      count: 1,
      visible: true
    });

    categories.set('devops', {
      name: 'devops',
      displayName: 'DevOps',
      icon: '⚙️',
      description: 'Deployment tools',
      technologies: [
        { name: 'docker', category: 'devops', subcategory: 'containerization', confidence: 1.0 }
      ],
      count: 1,
      visible: true
    });

    categories.set('others', {
      name: 'others',
      displayName: 'Others',
      icon: '📦',
      description: 'Other utilities',
      technologies: [
        { name: 'pytest', category: 'others', subcategory: 'testing', confidence: 0.8 }
      ],
      count: 1,
      visible: true
    });

    return categories;
  }
});