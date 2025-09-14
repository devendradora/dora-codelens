// Demo script showing how the caching system works
// This would be used internally by the extension

// Example usage of the caching system
class CacheDemo {
  constructor() {
    // This would be the actual AnalysisStateManager instance
    this.stateManager = null; // AnalysisStateManager.getInstance();
  }

  // Simulate full code analysis with caching
  async performAnalysis(workspacePath, forceRefresh = false) {
    console.log(`🔍 Starting analysis for: ${workspacePath}`);
    console.log(`🔄 Force refresh: ${forceRefresh}`);

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = this.stateManager?.getCachedResult(workspacePath);
      if (cached) {
        const ageMinutes = Math.round((Date.now() - cached.timestamp) / 60000);
        console.log(`✅ Using cached result (${ageMinutes} minutes old)`);
        return {
          data: cached.data,
          fromCache: true,
          age: ageMinutes
        };
      }
    }

    // Perform fresh analysis
    console.log(`🚀 Running fresh analysis...`);
    
    // Simulate analysis time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const analysisResult = {
      timestamp: Date.now(),
      code_graph_json: [
        { name: 'module1.py', type: 'file' },
        { name: 'module2.py', type: 'file' }
      ],
      complexity_metrics: {
        total_files: 2,
        total_functions: 15,
        average_complexity: 3.2
      }
    };

    // Cache the result
    this.stateManager?.setCachedResult(analysisResult, workspacePath);
    
    console.log(`✅ Analysis completed and cached`);
    return {
      data: analysisResult,
      fromCache: false,
      age: 0
    };
  }

  // Simulate refresh button click
  async handleRefreshClick(workspacePath) {
    console.log(`🔄 Refresh button clicked`);
    return await this.performAnalysis(workspacePath, true);
  }

  // Get cache info for display
  getCacheDisplayInfo() {
    const cacheInfo = this.stateManager?.getCacheInfo();
    if (!cacheInfo?.hasCache) {
      return { hasCache: false };
    }

    const ageMinutes = Math.round(cacheInfo.age / 60000);
    let displayText;
    
    if (ageMinutes < 1) {
      displayText = 'just now';
    } else if (ageMinutes < 60) {
      displayText = `${ageMinutes} minute${ageMinutes === 1 ? '' : 's'} ago`;
    } else {
      const ageHours = Math.round(ageMinutes / 60);
      displayText = `${ageHours} hour${ageHours === 1 ? '' : 's'} ago`;
    }

    return {
      hasCache: true,
      displayText,
      timestamp: cacheInfo.timestamp
    };
  }
}

// Example usage flow:
async function demonstrateCaching() {
  const demo = new CacheDemo();
  const workspacePath = '/path/to/workspace';

  console.log('=== Demo: Full Code Analysis Caching ===\n');

  // First analysis - should be fresh
  console.log('1. First analysis:');
  let result1 = await demo.performAnalysis(workspacePath);
  console.log(`   Result: ${result1.fromCache ? 'CACHED' : 'FRESH'}\n`);

  // Second analysis immediately - should use cache
  console.log('2. Second analysis (immediate):');
  let result2 = await demo.performAnalysis(workspacePath);
  console.log(`   Result: ${result2.fromCache ? 'CACHED' : 'FRESH'} (${result2.age} min old)\n`);

  // Refresh button - should be fresh
  console.log('3. Refresh button clicked:');
  let result3 = await demo.handleRefreshClick(workspacePath);
  console.log(`   Result: ${result3.fromCache ? 'CACHED' : 'FRESH'}\n`);

  // Display cache info
  console.log('4. Cache display info:');
  const displayInfo = demo.getCacheDisplayInfo();
  if (displayInfo.hasCache) {
    console.log(`   "Last analyzed: ${displayInfo.displayText}"`);
  } else {
    console.log('   No cache available');
  }
}

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CacheDemo, demonstrateCaching };
}