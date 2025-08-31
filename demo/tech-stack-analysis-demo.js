/**
 * Demo script to test the tech stack analysis improvements
 * This simulates the data structures and tests the logic
 */

// Mock data structure similar to what the extension receives
const mockAnalysisData = {
  code_graph_json: [
    {
      type: 'folder',
      name: 'src',
      children: [
        {
          type: 'file',
          name: 'main.py',
          children: [
            { type: 'class', name: 'Application', children: [] },
            { type: 'function', name: 'main', children: [] }
          ]
        },
        {
          type: 'file',
          name: 'models.py',
          children: [
            { type: 'class', name: 'User', children: [] },
            { type: 'class', name: 'Post', children: [] },
            { type: 'function', name: 'get_user', children: [] },
            { type: 'function', name: 'create_post', children: [] }
          ]
        },
        {
          type: 'file',
          name: 'utils.py',
          children: [
            { type: 'function', name: 'helper_func', children: [] }
          ]
        }
      ]
    },
    {
      type: 'folder',
      name: 'tests',
      children: [
        {
          type: 'file',
          name: 'test_main.py',
          children: [
            { type: 'function', name: 'test_application', children: [] }
          ]
        }
      ]
    },
    { type: 'file', name: 'poetry.lock', children: [] },
    { type: 'file', name: 'requirements.txt', children: [] },
    { type: 'file', name: 'package.json', children: [] },
    { type: 'file', name: 'Dockerfile', children: [] },
    { type: 'file', name: 'docker-compose.yml', children: [] }
  ],
  tech_stack: {
    languages: {
      Python: 4,
      JavaScript: 1
    },
    frameworks: {
      django: '4.2.0',
      flask: '2.3.0',
      celery: '5.2.0',  // Should be filtered out
      numpy: '1.24.0',  // Should be filtered out
      fastapi: '0.95.0'
    },
    libraries: {
      'requests': '2.28.0',
      'django-rest-framework': '3.14.0',
      'psycopg2': '2.9.0',
      'aiohttp': '3.8.0'
    },
    package_managers: ['Poetry', 'npm']
  }
};

// Simulate the helper methods from the webview class
class TechStackAnalysisDemo {
  
  calculateTechStackStats(analysisData) {
    const stats = {
      totalFiles: 0,
      totalFolders: 0,
      totalClasses: 0,
      totalFunctions: 0,
      totalLanguages: 0,
      packageManager: 'Unknown'
    };

    if (analysisData.code_graph_json && Array.isArray(analysisData.code_graph_json)) {
      this.countNodesRecursively(analysisData.code_graph_json, stats);
    }

    stats.totalLanguages = analysisData.tech_stack?.languages
      ? Object.keys(analysisData.tech_stack.languages).length
      : 0;

    return stats;
  }

  countNodesRecursively(nodes, stats) {
    if (!Array.isArray(nodes)) return;

    nodes.forEach(node => {
      if (!node || typeof node !== 'object') return;

      switch (node.type) {
        case 'file': stats.totalFiles++; break;
        case 'folder': stats.totalFolders++; break;
        case 'class': stats.totalClasses++; break;
        case 'function': stats.totalFunctions++; break;
      }

      if (node.children && Array.isArray(node.children)) {
        this.countNodesRecursively(node.children, stats);
      }
    });
  }

  detectPackageManager(analysisData) {
    const packageManagerPriority = [
      { file: 'poetry.lock', manager: 'Poetry' },
      { file: 'Pipfile', manager: 'Pipenv' },
      { file: 'requirements.txt', manager: 'pip' },
      { file: 'yarn.lock', manager: 'Yarn' },
      { file: 'package.json', manager: 'npm' }
    ];

    if (analysisData.tech_stack?.package_managers && Array.isArray(analysisData.tech_stack.package_managers)) {
      if (analysisData.tech_stack.package_managers.length > 0) {
        return analysisData.tech_stack.package_managers[0];
      }
    }

    if (analysisData.code_graph_json) {
      for (const pm of packageManagerPriority) {
        if (this.findFileInProject(analysisData.code_graph_json, pm.file)) {
          return pm.manager;
        }
      }
    }

    return 'Unknown';
  }

  findFileInProject(nodes, fileName) {
    if (!Array.isArray(nodes)) return false;

    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;

      if (node.type === 'file' && node.name === fileName) {
        return true;
      }

      if (node.children && Array.isArray(node.children)) {
        if (this.findFileInProject(node.children, fileName)) {
          return true;
        }
      }
    }

    return false;
  }

  filterMajorFrameworks(frameworks) {
    const majorPythonFrameworks = [
      'django', 'flask', 'fastapi', 'tornado', 'pyramid', 'bottle',
      'cherrypy', 'web2py', 'falcon', 'sanic', 'quart', 'starlette'
    ];

    if (!frameworks || typeof frameworks !== 'object') {
      return [];
    }

    const filteredFrameworks = [];
    
    Object.entries(frameworks).forEach(([name, version]) => {
      if (majorPythonFrameworks.includes(name.toLowerCase())) {
        filteredFrameworks.push([name, version]);
      }
    });

    return filteredFrameworks;
  }

  processAndSortLibraries(libraries) {
    if (!libraries) return [];

    let libraryList = [];

    if (Array.isArray(libraries)) {
      libraries.forEach(lib => {
        if (typeof lib === 'string') {
          libraryList.push({ name: lib, version: '' });
        } else if (typeof lib === 'object' && lib !== null) {
          const libName = lib.name || lib.library || lib.package || 'Unknown';
          const libVersion = lib.version || '';
          libraryList.push({ name: libName, version: libVersion });
        }
      });
    } else if (typeof libraries === 'object') {
      Object.entries(libraries).forEach(([library, version]) => {
        libraryList.push({ 
          name: library, 
          version: typeof version === 'string' ? version : String(version || '') 
        });
      });
    }

    libraryList.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    return libraryList;
  }

  detectDevOpsTools(analysisData) {
    const devOpsTools = {
      docker: false,
      kubernetes: false,
      other: []
    };

    // Check for Docker files
    if (analysisData.code_graph_json) {
      devOpsTools.docker = this.findFileInProject(analysisData.code_graph_json, 'Dockerfile') ||
                          this.findFileInProject(analysisData.code_graph_json, 'docker-compose.yml') ||
                          this.findFileInProject(analysisData.code_graph_json, 'docker-compose.yaml');

      // Check for Kubernetes files
      devOpsTools.kubernetes = this.findFileInProject(analysisData.code_graph_json, 'deployment.yaml') ||
                               this.findFileInProject(analysisData.code_graph_json, 'deployment.yml') ||
                               this.findFileInProject(analysisData.code_graph_json, 'k8s.yaml') ||
                               this.findFileInProject(analysisData.code_graph_json, 'k8s.yml');
    }

    // Check for other DevOps tools in tech_stack
    const devOpsCategories = ['build_tools', 'dev_tools', 'config_files'];
    const devOpsKeywords = ['jenkins', 'gitlab-ci', 'github-actions', 'circleci', 'travis', 'ansible', 'terraform', 'vagrant', 'helm'];

    devOpsCategories.forEach(category => {
      if (analysisData.tech_stack?.[category] && Array.isArray(analysisData.tech_stack[category])) {
        analysisData.tech_stack[category].forEach(tool => {
          const toolLower = tool.toLowerCase();
          if (devOpsKeywords.some(keyword => toolLower.includes(keyword))) {
            if (!devOpsTools.other.includes(tool)) {
              devOpsTools.other.push(tool);
            }
          }
        });
      }
    });

    return devOpsTools;
  }
}

// Run the demo
console.log('🚀 Tech Stack Analysis Demo');
console.log('============================');

const demo = new TechStackAnalysisDemo();

// Test statistics calculation
console.log('\n📊 Testing Statistics Calculation:');
const stats = demo.calculateTechStackStats(mockAnalysisData);
console.log('Total Files:', stats.totalFiles);
console.log('Total Folders:', stats.totalFolders);
console.log('Total Classes:', stats.totalClasses);
console.log('Total Functions:', stats.totalFunctions);
console.log('Total Languages:', stats.totalLanguages);

// Test package manager detection
console.log('\n📦 Testing Package Manager Detection:');
const packageManager = demo.detectPackageManager(mockAnalysisData);
console.log('Detected Package Manager:', packageManager);

// Test framework filtering
console.log('\n🚀 Testing Framework Filtering:');
const frameworks = demo.filterMajorFrameworks(mockAnalysisData.tech_stack.frameworks);
console.log('Major Frameworks Found:');
frameworks.forEach(([name, version]) => {
  console.log(`  - ${name}: ${version}`);
});

// Test library processing
console.log('\n📚 Testing Library Processing:');
const libraries = demo.processAndSortLibraries(mockAnalysisData.tech_stack.libraries);
console.log('Processed Libraries (sorted):');
libraries.forEach(lib => {
  console.log(`  - ${lib.name}: ${lib.version}`);
});

// Test file finding
console.log('\n🔍 Testing File Finding:');
console.log('poetry.lock found:', demo.findFileInProject(mockAnalysisData.code_graph_json, 'poetry.lock'));
console.log('requirements.txt found:', demo.findFileInProject(mockAnalysisData.code_graph_json, 'requirements.txt'));
console.log('nonexistent.txt found:', demo.findFileInProject(mockAnalysisData.code_graph_json, 'nonexistent.txt'));

// Test DevOps tools detection
console.log('\n🔧 Testing DevOps Tools Detection:');
const devOpsTools = demo.detectDevOpsTools ? demo.detectDevOpsTools(mockAnalysisData) : { docker: false, kubernetes: false, other: [] };
console.log('Docker detected:', devOpsTools.docker);
console.log('Kubernetes detected:', devOpsTools.kubernetes);
console.log('Other DevOps tools:', devOpsTools.other);

console.log('\n✅ Demo completed successfully!');
console.log('\nExpected Results:');
console.log('📊 Project Overview Layout:');
console.log('First row: Languages (2), Package Manager (Poetry), Frameworks (3)');
console.log('Second row: Folders (2), Files (7), Classes (3), Functions (5)');
console.log('Third row: DevOps tools (if detected)');
console.log('\n📚 Libraries & Dependencies:');
console.log('- Versions should be center-aligned');
console.log('- Libraries sorted alphabetically');
console.log('- Responsive grid layout (4→3→2→1 columns)');