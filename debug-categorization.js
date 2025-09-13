// Debug categorization to see what's happening
const { TechnologyCategorizer } = require('./out/services/technology-categorizer');

// Mock ErrorHandler
class MockErrorHandler {
  logError(message, error, source) {
    console.log(`[DEBUG ${source}] ${message}`, error ? error.message : '');
  }
}

async function debugCategorization() {
  console.log('🔍 Debugging Categorization Issues...\n');
  
  const errorHandler = new MockErrorHandler();
  const categorizer = new TechnologyCategorizer(errorHandler);
  
  // Test with real project structure similar to landbanking project
  const analysisData = {
    tech_stack: {
      libraries: ['django', 'psycopg2', 'requests'],
      frameworks: [{ name: 'django', version: '4.0' }],
      config_files: [
        'docker-compose.yml',
        'Dockerfile', 
        'requirements.txt',
        'manage.py',
        'settings.py',
        'package.json'
      ],
      build_tools: ['pip'],
      dev_tools: ['black', 'flake8']
    },
    code_graph_json: [
      {
        name: 'platform',
        files: [
          {
            name: 'backend',
            files: [
              { name: 'manage.py' },
              { name: 'settings.py' },
              { name: 'requirements.txt' },
              {
                name: 'staff_portal',
                files: [
                  {
                    name: 'templates',
                    files: [
                      { name: 'index.html' },
                      { name: 'dashboard.html' },
                      { name: 'base.html' }
                    ]
                  },
                  {
                    name: 'static',
                    files: [
                      { name: 'style.css' },
                      { name: 'app.js' }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      { name: 'docker-compose.yml' },
      { name: 'Dockerfile' }
    ]
  };
  
  console.log('📋 Input Analysis Data:');
  console.log('- Config files:', analysisData.tech_stack.config_files);
  console.log('- Libraries:', analysisData.tech_stack.libraries);
  console.log('- Has code_graph_json:', !!analysisData.code_graph_json);
  console.log();
  
  // Test categorization
  console.log('🧪 Testing categorization with empty technologies array...');
  const categories1 = categorizer.categorizeTechnologies([], analysisData);
  
  console.log('Categories found:', categories1.size);
  for (const [name, category] of categories1) {
    console.log(`- ${category.icon} ${name}: ${category.count} technologies`);
    category.technologies.forEach(tech => {
      console.log(`  • ${tech.name} (${(tech.confidence * 100).toFixed(0)}%)`);
    });
  }
  
  console.log('\n🧪 Testing categorization with some technologies...');
  const technologies = ['react', 'nginx', 'jest'];
  const categories2 = categorizer.categorizeTechnologies(technologies, analysisData);
  
  console.log('Categories found:', categories2.size);
  for (const [name, category] of categories2) {
    console.log(`- ${category.icon} ${name}: ${category.count} technologies`);
    category.technologies.forEach(tech => {
      console.log(`  • ${tech.name} (${(tech.confidence * 100).toFixed(0)}%)`);
    });
  }
  
  // Test individual classification
  console.log('\n🔍 Testing individual classifications:');
  const testTechs = ['docker-compose', 'html', 'css', 'javascript', 'nginx', 'react'];
  testTechs.forEach(tech => {
    const result = categorizer.classifyTechnology(tech);
    console.log(`${tech} → ${result.category} (${(result.confidence * 100).toFixed(0)}% ${result.method})`);
  });
  
  console.log('\n✅ Debug completed');
}

debugCategorization().catch(console.error);