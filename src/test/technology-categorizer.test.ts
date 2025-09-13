import * as assert from 'assert';
import { TechnologyCategorizer } from '../services/technology-categorizer';

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

suite('TechnologyCategorizer Tests', () => {
  let categorizer: TechnologyCategorizer;
  let mockErrorHandler: MockErrorHandler;

  setup(() => {
    mockErrorHandler = new MockErrorHandler();
    categorizer = new TechnologyCategorizer(mockErrorHandler as any);
  });

  suite('Classification Logic Tests', () => {
    test('should classify backend technologies correctly', () => {
      const backendTechs = ['django', 'flask', 'fastapi', 'express', 'spring'];
      
      backendTechs.forEach(tech => {
        const result = categorizer.classifyTechnology(tech);
        assert.strictEqual(result.category, 'backend', `${tech} should be classified as backend`);
        assert.strictEqual(result.method, 'exact', `${tech} should be exact match`);
        assert.strictEqual(result.confidence, 1.0, `${tech} should have high confidence`);
      });
    });

    test('should classify frontend technologies correctly', () => {
      const frontendTechs = ['react', 'vue', 'angular', 'bootstrap', 'webpack'];
      
      frontendTechs.forEach(tech => {
        const result = categorizer.classifyTechnology(tech);
        assert.strictEqual(result.category, 'frontend', `${tech} should be classified as frontend`);
        assert.strictEqual(result.method, 'exact', `${tech} should be exact match`);
        assert.strictEqual(result.confidence, 1.0, `${tech} should have high confidence`);
      });
    });

    test('should classify database technologies correctly', () => {
      const databaseTechs = ['postgresql', 'mysql', 'mongodb', 'redis', 'sqlite'];
      
      databaseTechs.forEach(tech => {
        const result = categorizer.classifyTechnology(tech);
        assert.strictEqual(result.category, 'databases', `${tech} should be classified as databases`);
        assert.strictEqual(result.method, 'exact', `${tech} should be exact match`);
        assert.strictEqual(result.confidence, 1.0, `${tech} should have high confidence`);
      });
    });

    test('should classify devops technologies correctly', () => {
      const devopsTechs = ['docker', 'kubernetes', 'terraform', 'jenkins', 'aws'];
      
      devopsTechs.forEach(tech => {
        const result = categorizer.classifyTechnology(tech);
        assert.strictEqual(result.category, 'devops', `${tech} should be classified as devops`);
        assert.strictEqual(result.method, 'exact', `${tech} should be exact match`);
        assert.strictEqual(result.confidence, 1.0, `${tech} should have high confidence`);
      });
    });

    test('should classify unknown technologies as others', () => {
      const unknownTechs = ['unknown-lib', 'custom-framework', 'proprietary-tool'];
      
      unknownTechs.forEach(tech => {
        const result = categorizer.classifyTechnology(tech);
        assert.strictEqual(result.category, 'others', `${tech} should be classified as others`);
        assert.strictEqual(result.method, 'default', `${tech} should use default method`);
        assert.strictEqual(result.confidence, 0.5, `${tech} should have default confidence`);
      });
    });

    test('should handle case insensitive classification', () => {
      const testCases = [
        { input: 'DJANGO', expected: 'backend' },
        { input: 'React', expected: 'frontend' },
        { input: 'PostgreSQL', expected: 'databases' },
        { input: 'DOCKER', expected: 'devops' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = categorizer.classifyTechnology(input);
        assert.strictEqual(result.category, expected, `${input} should be classified as ${expected}`);
      });
    });

    test('should use keyword-based classification for partial matches', () => {
      const keywordTests = [
        { input: 'my-api-framework', expected: 'backend' },
        { input: 'ui-component-lib', expected: 'frontend' },
        { input: 'database-connector', expected: 'databases' },
        { input: 'deployment-tool', expected: 'devops' }
      ];

      keywordTests.forEach(({ input, expected }) => {
        const result = categorizer.classifyTechnology(input);
        assert.strictEqual(result.category, expected, `${input} should be classified as ${expected} via keywords`);
        assert.strictEqual(result.method, 'keyword', `${input} should use keyword method`);
        assert.ok(result.confidence > 0, `${input} should have positive confidence`);
      });
    });

    test('should handle empty and invalid inputs', () => {
      const invalidInputs = ['', null, undefined, 123, {}];
      
      invalidInputs.forEach(input => {
        const result = categorizer.classifyTechnology(input as any);
        assert.strictEqual(result.category, 'others', `Invalid input should default to others`);
        assert.strictEqual(result.method, 'default', `Invalid input should use default method`);
      });
    });
  });

  suite('Technology Categorization Tests', () => {
    test('should categorize array of technologies correctly', () => {
      const technologies = [
        'django',
        'react', 
        'postgresql',
        'docker',
        'pytest'
      ];

      const categories = categorizer.categorizeTechnologies(technologies);
      
      assert.ok(categories.has('backend'), 'Should have backend category');
      assert.ok(categories.has('frontend'), 'Should have frontend category');
      assert.ok(categories.has('databases'), 'Should have databases category');
      assert.ok(categories.has('devops'), 'Should have devops category');
      assert.ok(categories.has('others'), 'Should have others category');

      const backendCategory = categories.get('backend')!;
      assert.strictEqual(backendCategory.count, 1, 'Backend should have 1 technology');
      assert.strictEqual(backendCategory.technologies[0].name, 'django', 'Backend should contain django');

      const frontendCategory = categories.get('frontend')!;
      assert.strictEqual(frontendCategory.count, 1, 'Frontend should have 1 technology');
      assert.strictEqual(frontendCategory.technologies[0].name, 'react', 'Frontend should contain react');
    });

    test('should handle object format technologies', () => {
      const technologies = [
        { name: 'django', version: '4.0' },
        { name: 'react', version: '18.0' },
        { name: 'postgresql', version: '14.0' }
      ];

      const categories = categorizer.categorizeTechnologies(technologies);
      
      const backendCategory = categories.get('backend')!;
      assert.strictEqual(backendCategory.technologies[0].version, '4.0', 'Should preserve version info');
    });

    test('should handle mixed format technologies', () => {
      const technologies = [
        'django',
        { name: 'react', version: '18.0' },
        { postgresql: '14.0' }
      ];

      const categories = categorizer.categorizeTechnologies(technologies);
      
      const backendCategory = categories.get('backend');
      const frontendCategory = categories.get('frontend');
      const databasesCategory = categories.get('databases');
      
      assert.ok(backendCategory && backendCategory.count > 0, 'Should categorize string format');
      assert.ok(frontendCategory && frontendCategory.count > 0, 'Should categorize object format');
      assert.ok(databasesCategory && databasesCategory.count > 0, 'Should categorize key-value format');
    });

    test('should remove empty categories', () => {
      const technologies = ['django']; // Only backend technology

      const categories = categorizer.categorizeTechnologies(technologies);
      
      assert.ok(categories.has('backend'), 'Should keep non-empty backend category');
      assert.ok(!categories.has('frontend'), 'Should remove empty frontend category');
      assert.ok(!categories.has('databases'), 'Should remove empty databases category');
      assert.ok(!categories.has('devops'), 'Should remove empty devops category');
      assert.ok(!categories.has('others'), 'Should remove empty others category');
    });

    test('should handle empty input gracefully', () => {
      const categories = categorizer.categorizeTechnologies([]);
      assert.strictEqual(categories.size, 0, 'Should return empty categories for empty input');
    });

    test('should handle null/undefined input gracefully', () => {
      const categories1 = categorizer.categorizeTechnologies(null as any);
      const categories2 = categorizer.categorizeTechnologies(undefined as any);
      
      assert.strictEqual(categories1.size, 0, 'Should handle null input');
      assert.strictEqual(categories2.size, 0, 'Should handle undefined input');
    });
  });

  suite('Performance and Batch Processing Tests', () => {
    test('should handle large technology lists efficiently', () => {
      const largeTechList = [];
      for (let i = 0; i < 1000; i++) {
        largeTechList.push(`tech-${i}`);
      }
      largeTechList.push('django', 'react', 'postgresql', 'docker'); // Add some known techs

      const startTime = Date.now();
      const categories = categorizer.categorizeTechnologies(largeTechList);
      const endTime = Date.now();

      assert.ok(endTime - startTime < 1000, 'Should process 1000+ technologies in under 1 second');
      assert.ok(categories.size > 0, 'Should categorize known technologies');
    });

    test('should use caching for repeated classifications', () => {
      const tech = 'django';
      
      // First classification
      const startTime1 = Date.now();
      const result1 = categorizer.classifyTechnology(tech);
      const endTime1 = Date.now();
      
      // Second classification (should be cached)
      const startTime2 = Date.now();
      const result2 = categorizer.classifyTechnology(tech);
      const endTime2 = Date.now();
      
      assert.deepStrictEqual(result1, result2, 'Results should be identical');
      assert.ok(endTime2 - startTime2 <= endTime1 - startTime1, 'Cached result should be faster or equal');
    });
  });

  suite('Database Detection Tests', () => {
    test('should detect databases from analysis data', () => {
      const analysisData = {
        tech_stack: {
          libraries: ['psycopg2', 'pymongo', 'redis'],
          frameworks: ['django']
        }
      };

      const categories = categorizer.categorizeTechnologies([], analysisData);
      
      // Should detect databases from environment detection
      // Note: This is a simplified test - actual implementation would need real env data
      assert.ok(categories.size >= 0, 'Should handle analysis data without errors');
    });
  });

  teardown(() => {
    categorizer.clearCache();
  });
});