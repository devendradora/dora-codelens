import * as assert from 'assert';
import { TechnologyCategorizer } from '../services/technology-categorizer';
import { CategoryRenderer } from '../services/category-renderer';

/**
 * Mock ErrorHandler for testing
 */
class MockErrorHandler {
  logError(message: string, error?: any, source?: string): void {
    // Silent for tests
  }
}

suite('Tech Stack Categorization Integration Tests', () => {
  let categorizer: TechnologyCategorizer;
  let renderer: CategoryRenderer;
  let mockErrorHandler: MockErrorHandler;

  setup(() => {
    mockErrorHandler = new MockErrorHandler();
    categorizer = new TechnologyCategorizer(mockErrorHandler as any);
    renderer = new CategoryRenderer(mockErrorHandler as any);
  });

  test('should categorize and render complete tech stack', () => {
    // Sample technology data similar to what would come from analysis
    const technologies = [
      'django',
      'react',
      'postgresql',
      'docker',
      'pytest',
      { name: 'flask', version: '2.0' },
      { name: 'vue', version: '3.0' },
      { name: 'redis', version: '6.0' },
      { name: 'kubernetes', version: '1.21' },
      { name: 'numpy', version: '1.21' }
    ];

    // Categorize technologies
    const categories = categorizer.categorizeTechnologies(technologies);

    // Verify categories were created
    assert.ok(categories.has('backend'), 'Should have backend category');
    assert.ok(categories.has('frontend'), 'Should have frontend category');
    assert.ok(categories.has('databases'), 'Should have databases category');
    assert.ok(categories.has('devops'), 'Should have devops category');
    assert.ok(categories.has('others'), 'Should have others category');

    // Verify specific categorizations
    const backendCategory = categories.get('backend')!;
    assert.ok(backendCategory.technologies.some(t => t.name === 'django'), 'Backend should contain django');
    assert.ok(backendCategory.technologies.some(t => t.name === 'flask'), 'Backend should contain flask');

    const frontendCategory = categories.get('frontend')!;
    assert.ok(frontendCategory.technologies.some(t => t.name === 'react'), 'Frontend should contain react');
    assert.ok(frontendCategory.technologies.some(t => t.name === 'vue'), 'Frontend should contain vue');

    const databasesCategory = categories.get('databases')!;
    assert.ok(databasesCategory.technologies.some(t => t.name === 'postgresql'), 'Databases should contain postgresql');
    assert.ok(databasesCategory.technologies.some(t => t.name === 'redis'), 'Databases should contain redis');

    const devopsCategory = categories.get('devops')!;
    assert.ok(devopsCategory.technologies.some(t => t.name === 'docker'), 'DevOps should contain docker');
    assert.ok(devopsCategory.technologies.some(t => t.name === 'kubernetes'), 'DevOps should contain kubernetes');

    const othersCategory = categories.get('others')!;
    assert.ok(othersCategory.technologies.some(t => t.name === 'pytest'), 'Others should contain pytest');
    assert.ok(othersCategory.technologies.some(t => t.name === 'numpy'), 'Others should contain numpy');

    // Render the categorized tech stack
    const html = renderer.renderCategorizedTechStack(categories);

    // Verify HTML output contains expected elements
    assert.ok(html.includes('tech-categories-container'), 'Should include container class');
    assert.ok(html.includes('🔧'), 'Should include backend icon');
    assert.ok(html.includes('🎨'), 'Should include frontend icon');
    assert.ok(html.includes('🗄️'), 'Should include databases icon');
    assert.ok(html.includes('⚙️'), 'Should include devops icon');
    assert.ok(html.includes('📦'), 'Should include others icon');
    
    // Verify technology names appear in HTML
    assert.ok(html.includes('django'), 'Should include django in HTML');
    assert.ok(html.includes('react'), 'Should include react in HTML');
    assert.ok(html.includes('postgresql'), 'Should include postgresql in HTML');
    assert.ok(html.includes('docker'), 'Should include docker in HTML');
    assert.ok(html.includes('pytest'), 'Should include pytest in HTML');

    // Verify versions are preserved
    assert.ok(html.includes('2.0'), 'Should include flask version');
    assert.ok(html.includes('3.0'), 'Should include vue version');
  });

  test('should handle real-world analysis data structure', () => {
    // Simulate real analysis data structure
    const analysisData = {
      tech_stack: {
        libraries: [
          'django',
          'psycopg2',
          'celery',
          'requests',
          'pytest'
        ],
        frameworks: [
          { name: 'django', version: '4.0' },
          { name: 'django-rest-framework', version: '3.14' }
        ],
        build_tools: ['pip', 'setuptools'],
        dev_tools: ['black', 'flake8'],
        databases: ['postgresql'],
        testing_frameworks: ['pytest', 'coverage']
      }
    };

    // Collect technologies like the webview would
    const allTechnologies: any[] = [];
    
    if (analysisData.tech_stack.libraries) {
      allTechnologies.push(...analysisData.tech_stack.libraries);
    }
    if (analysisData.tech_stack.frameworks) {
      allTechnologies.push(...analysisData.tech_stack.frameworks);
    }
    if (analysisData.tech_stack.build_tools) {
      analysisData.tech_stack.build_tools.forEach(tool => {
        allTechnologies.push({ name: tool });
      });
    }

    // Categorize with analysis data for environment detection
    const categories = categorizer.categorizeTechnologies(allTechnologies, analysisData);

    // Verify categorization worked
    assert.ok(categories.size > 0, 'Should have categories');
    
    // Check that Django is in backend
    const backendCategory = categories.get('backend');
    assert.ok(backendCategory, 'Should have backend category');
    assert.ok(backendCategory.technologies.some(t => t.name === 'django'), 'Should categorize Django as backend');

    // Check that databases are detected
    const databasesCategory = categories.get('databases');
    assert.ok(databasesCategory, 'Should have databases category');
    assert.ok(databasesCategory.technologies.some(t => t.name === 'psycopg2' || t.name === 'postgresql'), 'Should detect database technologies');
  });

  test('should optimize performance for large technology lists', () => {
    // Create a large list of technologies
    const largeTechList = [];
    for (let i = 0; i < 500; i++) {
      largeTechList.push(`library-${i}`);
    }
    // Add some known technologies
    largeTechList.push('django', 'react', 'postgresql', 'docker', 'pytest');

    const startTime = Date.now();
    const categories = categorizer.categorizeTechnologies(largeTechList);
    const endTime = Date.now();

    // Should process quickly (under 500ms for 500+ items)
    assert.ok(endTime - startTime < 500, 'Should process large lists efficiently');
    
    // Should still categorize known technologies correctly
    assert.ok(categories.has('backend'), 'Should have backend category');
    assert.ok(categories.has('frontend'), 'Should have frontend category');
    assert.ok(categories.has('databases'), 'Should have databases category');
    assert.ok(categories.has('devops'), 'Should have devops category');
    assert.ok(categories.has('others'), 'Should have others category');
  });

  teardown(() => {
    categorizer.clearCache();
  });
});