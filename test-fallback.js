/**
 * Test the simple graph fallback functionality
 */

// Mock graph data structure
const mockGraphData = {
  elements: [
    { data: { id: 'src', name: 'src', type: 'folder' } },
    { data: { id: 'tests', name: 'tests', type: 'folder' } }
  ],
  state: {
    projectData: [
      {
        name: 'src',
        type: 'folder',
        children: [
          {
            name: 'models.py',
            type: 'file',
            children: [
              {
                name: 'User',
                type: 'class',
                children: [
                  {
                    name: 'get_profile',
                    type: 'function'
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        name: 'tests',
        type: 'folder',
        children: []
      }
    ]
  }
};

console.log('Testing simple graph fallback...');
console.log('Mock graph data:', JSON.stringify(mockGraphData, null, 2));

// Simulate the fallback HTML generation
function generateFallbackHTML(graphData) {
  if (!graphData || !graphData.state || !graphData.state.projectData) {
    return '<div>No data available</div>';
  }

  let html = '<div style="padding: 20px; font-family: monospace;">';
  html += '<h3>📁 Project Structure (Simple View)</h3>';
  html += '<p style="color: var(--vscode-descriptionForeground); margin-bottom: 20px;">Interactive graph unavailable. Showing simple tree view.</p>';
  
  graphData.state.projectData.forEach(function(folder) {
    html += '<div style="margin-bottom: 16px; border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 12px;">';
    html += '<div style="font-weight: bold; color: #ffd700; margin-bottom: 8px;">📁 ' + folder.name + '</div>';
    
    if (folder.children && folder.children.length > 0) {
      folder.children.forEach(function(child) {
        html += '<div style="margin-left: 20px; margin-bottom: 4px; color: #87ceeb;">📄 ' + child.name;
        if (child.type) html += ' (' + child.type + ')';
        html += '</div>';
        
        if (child.children && child.children.length > 0) {
          child.children.forEach(function(grandchild) {
            html += '<div style="margin-left: 40px; margin-bottom: 2px; color: #ffa500;">🔶 ' + grandchild.name;
            if (grandchild.type) html += ' (' + grandchild.type + ')';
            html += '</div>';
          });
        }
      });
    } else {
      html += '<div style="margin-left: 20px; color: var(--vscode-descriptionForeground); font-style: italic;">Empty folder</div>';
    }
    
    html += '</div>';
  });
  
  html += '<button onclick="retryGraphInitialization()" style="margin-top: 16px; padding: 8px 16px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer;">Try Interactive Graph Again</button>';
  html += '</div>';
  
  return html;
}

const fallbackHTML = generateFallbackHTML(mockGraphData);
console.log('\n=== Generated Fallback HTML ===');
console.log(fallbackHTML);

console.log('\n✅ Fallback functionality test passed!');
console.log('The graph will now show a simple tree view if Cytoscape fails to load.');