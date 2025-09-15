// Test real scenario to debug why categories aren't showing
const { TechnologyCategorizer } = require('./out/services/technology-categorizer');
const { CategoryRenderer } = require('./out/services/category-renderer');

// Mock ErrorHandler that shows all logs
class MockErrorHandler {
  logError(message, error, source) {
    console.log(`[${source}] ${message}`, error ? error.message : '');
  }
}

async function testRealScenario() {
  console.log('🔍 Testing Real VS Code Extension Scenario...\n');
  
  const errorHandler = new MockErrorHandler();
  const categorizer = new TechnologyCategorizer(errorHandler);
  const renderer = new CategoryRenderer(errorHandler);
  
  // Simulate what might be coming from the actual Python analyzer
  // This might be missing the file structure data
  const realAnalysisData = {
    tech_stack: {
      libraries: ['django', 'psycopg2', 'requests', 'celery'],
      frameworks: ['django'],
      // This might be missing or empty in real data
      config_files: [],
      build_tools: ['pip'],
      dev_tools: ['black']
    },
    // This might be missing or empty in real data
    code_graph_json: []
  };
  
  console.log('📋 Simulating Real Analysis Data (possibly incomplete):');
  console.log('- Libraries:', realAnalysisData.tech_stack.libraries);
  console.log('- Config files:', realAnalysisData.tech_stack.config_files);
  console.log('- Code graph JSON:', realAnalysisData.code_graph_json.length, 'items');
  console.log();
  
  // Test 1: What happens with incomplete data?
  console.log('🧪 Test 1: Categorization with incomplete data');
  const categories1 = categorizer.categorizeTechnologies([], realAnalysisData);
  console.log('Result: Categories found:', categories1.size);
  for (const [name, category] of categories1) {
    console.log(`- ${category.icon} ${name}: ${category.count} technologies`);
  }
  console.log();
  
  // Test 2: What if we have some technologies but no file structure?
  console.log('🧪 Test 2: With technologies but no file structure');
  const someTechs = ['django', 'html', 'docker'];
  const categories2 = categorizer.categorizeTechnologies(someTechs, realAnalysisData);
  console.log('Result: Categories found:', categories2.size);
  for (const [name, category] of categories2) {
    console.log(`- ${category.icon} ${name}: ${category.count} technologies`);
  }
  console.log();
  
  // Test 3: What if we add the missing file structure data?
  console.log('🧪 Test 3: Adding missing file structure data');
  const completeAnalysisData = {
    ...realAnalysisData,
    tech_stack: {
      ...realAnalysisData.tech_stack,
      config_files: [
        'docker-compose.yml',
        'Dockerfile',
        'requirements.txt',
        'manage.py'
      ]
    },
    code_graph_json: [
      {
        name: 'templates',
        files: [
          { name: 'index.html' },
          { name: 'base.html' }
        ]
      },
      { name: 'docker-compose.yml' }
    ]
  };
  
  const categories3 = categorizer.categorizeTechnologies([], completeAnalysisData);
  console.log('Result: Categories found:', categories3.size);
  for (const [name, category] of categories3) {
    console.log(`- ${category.icon} ${name}: ${category.count} technologies`);
    category.technologies.forEach(tech => {
      console.log(`  • ${tech.name} (${(tech.confidence * 100).toFixed(0)}%)`);
    });
  }
  console.log();
  
  // Test 4: Render the complete result
  console.log('🎨 Test 4: Rendering HTML');
  const html = renderer.renderCategorizedTechStack(categories3);
  console.log('HTML length:', html.length);
  console.log('Contains frontend section:', html.includes('Frontend'));
  console.log('Contains devops section:', html.includes('DevOps'));
  console.log('Contains HTML technology:', html.includes('HTML'));
  console.log('Contains Docker technology:', html.includes('Docker'));
  
  console.log('\n✅ Real scenario test completed');
}

testRealScenario().catch(console.error);