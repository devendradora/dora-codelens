import * as assert from 'assert';
import { FullCodeAnalysisWebview } from '../webviews/full-code-analysis-webview';
import { ErrorHandler } from '../core/error-handler';

suite('Tech Stack Analysis Tests', () => {
  let webview: FullCodeAnalysisWebview;
  let errorHandler: ErrorHandler;

  setup(() => {
    errorHandler = ErrorHandler.getInstance();
    webview = new FullCodeAnalysisWebview(errorHandler, '/test/path');
  });

  test('calculateTechStackStats should count nodes correctly', () => {
    const mockAnalysisData = {
      code_graph_json: [
        {
          type: 'folder',
          name: 'src',
          children: [
            { type: 'file', name: 'main.py', children: [] },
            { type: 'file', name: 'utils.py', children: [] },
            {
              type: 'file',
              name: 'models.py',
              children: [
                { type: 'class', name: 'User', children: [] },
                { type: 'function', name: 'get_user', children: [] }
              ]
            }
          ]
        },
        {
          type: 'folder',
          name: 'tests',
          children: [
            { type: 'file', name: 'test_main.py', children: [] }
          ]
        }
      ],
      tech_stack: {
        languages: { Python: 4 }
      }
    };

    // Access private method for testing
    const stats = (webview as any).calculateTechStackStats(mockAnalysisData);

    assert.strictEqual(stats.totalFiles, 4);
    assert.strictEqual(stats.totalFolders, 2);
    assert.strictEqual(stats.totalClasses, 1);
    assert.strictEqual(stats.totalFunctions, 1);
    assert.strictEqual(stats.totalLanguages, 1);
  });

  test('detectPackageManager should prioritize correctly', () => {
    const mockAnalysisDataWithPoetry = {
      code_graph_json: [
        { type: 'file', name: 'poetry.lock', children: [] },
        { type: 'file', name: 'requirements.txt', children: [] }
      ],
      tech_stack: {}
    };

    const packageManager = (webview as any).detectPackageManager(mockAnalysisDataWithPoetry);
    assert.strictEqual(packageManager, 'Poetry');
  });

  test('filterMajorFrameworks should exclude non-framework libraries', () => {
    const mockFrameworks = {
      django: '4.2.0',
      flask: '2.3.0',
      celery: '5.2.0',  // Should be excluded
      numpy: '1.24.0',  // Should be excluded
      fastapi: '0.95.0'
    };

    const filtered = (webview as any).filterMajorFrameworks(mockFrameworks);
    
    assert.strictEqual(filtered.length, 3);
    assert.ok(filtered.some(([name]: [string, any]) => name === 'django'));
    assert.ok(filtered.some(([name]: [string, any]) => name === 'flask'));
    assert.ok(filtered.some(([name]: [string, any]) => name === 'fastapi'));
    assert.ok(!filtered.some(([name]: [string, any]) => name === 'celery'));
    assert.ok(!filtered.some(([name]: [string, any]) => name === 'numpy'));
  });

  test('processAndSortLibraries should handle multiple formats', () => {
    // Test object format
    const objectFormat = {
      'requests': '2.28.0',
      'django': '4.2.0',
      'aiohttp': '3.8.0'
    };

    const processedObject = (webview as any).processAndSortLibraries(objectFormat);
    assert.strictEqual(processedObject.length, 3);
    assert.strictEqual(processedObject[0].name, 'aiohttp'); // Should be sorted alphabetically
    assert.strictEqual(processedObject[0].version, '3.8.0');

    // Test array format
    const arrayFormat = [
      { name: 'requests', version: '2.28.0' },
      { name: 'django', version: '4.2.0' },
      'fastapi'  // String format
    ];

    const processedArray = (webview as any).processAndSortLibraries(arrayFormat);
    assert.strictEqual(processedArray.length, 3);
    assert.strictEqual(processedArray[0].name, 'django'); // Should be sorted alphabetically
    assert.strictEqual(processedArray[2].name, 'requests');
  });

  test('findFileInProject should locate files correctly', () => {
    const mockProjectStructure = [
      {
        type: 'folder',
        name: 'src',
        children: [
          { type: 'file', name: 'main.py', children: [] }
        ]
      },
      { type: 'file', name: 'poetry.lock', children: [] }
    ];

    const foundPoetry = (webview as any).findFileInProject(mockProjectStructure, 'poetry.lock');
    const foundMain = (webview as any).findFileInProject(mockProjectStructure, 'main.py');
    const notFound = (webview as any).findFileInProject(mockProjectStructure, 'nonexistent.txt');

    assert.strictEqual(foundPoetry, true);
    assert.strictEqual(foundMain, true);
    assert.strictEqual(notFound, false);
  });

  test('should handle empty or invalid data gracefully', () => {
    // Test with null data
    const statsNull = (webview as any).calculateTechStackStats({ tech_stack: null });
    assert.strictEqual(statsNull.totalFiles, 0);
    assert.strictEqual(statsNull.packageManager, 'Unknown');

    // Test with empty arrays
    const statsEmpty = (webview as any).calculateTechStackStats({ 
      code_graph_json: [],
      tech_stack: { languages: {} }
    });
    assert.strictEqual(statsEmpty.totalFiles, 0);
    assert.strictEqual(statsEmpty.totalLanguages, 0);

    // Test library processing with invalid data
    const processedInvalid = (webview as any).processAndSortLibraries(null);
    assert.strictEqual(processedInvalid.length, 0);
  });
});