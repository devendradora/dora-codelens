# Design Document

## Overview

This design enhances the DoraCodeBirdView extension's data structure to provide richer code analysis information with complexity metrics and improved hierarchical organization. The solution involves updating the Python analyzer to generate enhanced code graph data and modifying the TypeScript webview to process this new structure based on the reference implementation in `analyzer/dora.html`. The design maintains backward compatibility while adding new complexity and relationship tracking capabilities.

## Architecture

### Data Flow Architecture

```
Python Analyzer
       │
       ▼ (Enhanced Structure)
┌─────────────────────────────────────┐
│ Enhanced Analysis Response          │
│ ├── success, errors, warnings       │
│ ├── tech_stack (unchanged)          │
│ └── code_graph_json (NEW)           │
│     ├── Hierarchical Structure      │
│     ├── Complexity Metrics          │
│     └── Call Relationships          │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ TypeScript Webview Processor       │
│ ├── Data Validation                │
│ ├── Structure Transformation       │
│ └── Graph Rendering                 │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Enhanced Code Graph Visualization  │
│ ├── Complexity Color Coding        │
│ ├── Interactive Node Expansion     │
│ └── Relationship Edge Rendering    │
└─────────────────────────────────────┘
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Python Analyzer                         │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐ │
│ │ AST Parser      │  │ Complexity      │  │ Call Graph    │ │
│ │ (Enhanced)      │  │ Calculator      │  │ Analyzer      │ │
│ └─────────────────┘  └─────────────────┘  └───────────────┘ │
│           │                    │                    │       │
│           ▼                    ▼                    ▼       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │            Enhanced Data Structure Builder             │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                 TypeScript Webview                         │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐ │
│ │ Data Validator  │  │ Graph Builder   │  │ Visualization │ │
│ │ & Transformer   │  │ (Cytoscape)     │  │ Controller    │ │
│ └─────────────────┘  └─────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Enhanced Python Analyzer Output Structure

**Purpose**: Provides the new data structure with complexity metrics and hierarchical organization

**New Data Structure**:
```python
{
    "success": bool,
    "errors": List[str],
    "warnings": List[str],
    "tech_stack": {
        # Existing tech_stack structure unchanged
        "metadata": {...},
        "python_version": str,
        "package_manager": str,
        "libraries": [...],
        "frameworks": [...]
    },
    "code_graph_json": [
        {
            "name": str,           # Folder/File/Class/Function name
            "type": str,           # "folder", "file", "class", "function"
            "children": [...],     # Nested structure
            "calls": [
                {
                    "target": [str, str, str, str],  # [folder, file, class, function]
                    "label": str                      # "uses", "fetches", "calls", etc.
                }
            ],
            "complexity": {        # Only for functions
                "cyclomatic": int,
                "cognitive": int,
                "level": str       # "low", "medium", "high"
            }
        }
    ]
}
```

### 2. Complexity Calculator Component

**Purpose**: Calculates cyclomatic and cognitive complexity for functions and methods

**Key Features**:
- AST-based complexity analysis
- Configurable complexity thresholds
- Support for both cyclomatic and cognitive complexity
- Complexity level categorization

**Interface**:
```python
class ComplexityCalculator:
    def calculate_cyclomatic_complexity(self, node: ast.FunctionDef) -> int
    def calculate_cognitive_complexity(self, node: ast.FunctionDef) -> int
    def get_complexity_level(self, cyclomatic: int) -> str
    def analyze_function(self, node: ast.FunctionDef) -> ComplexityMetrics
```

### 3. Enhanced Call Graph Analyzer

**Purpose**: Tracks function calls and relationships with detailed path information

**Key Features**:
- Full path tracking for call targets
- Relationship label generation
- Cross-module call detection
- Bidirectional relationship mapping

**Interface**:
```python
class EnhancedCallGraphAnalyzer:
    def extract_calls(self, node: ast.FunctionDef, context: AnalysisContext) -> List[CallInfo]
    def resolve_call_target(self, call: ast.Call, context: AnalysisContext) -> Optional[List[str]]
    def generate_relationship_label(self, call_type: str, context: dict) -> str
```

### 4. TypeScript Data Processor

**Purpose**: Processes the new data structure and transforms it for visualization

**Key Features**:
- Backward compatibility with existing data formats
- Hierarchical data flattening for graph rendering
- Complexity-based styling
- Call relationship edge creation

**Interface**:
```typescript
interface EnhancedDataProcessor {
    validateDataStructure(data: any): boolean;
    transformToGraphElements(codeGraphJson: CodeGraphNode[]): GraphElements;
    createComplexityStyles(complexity: ComplexityInfo): NodeStyle;
    buildCallRelationshipEdges(nodes: CodeGraphNode[]): EdgeElement[];
}
```

### 5. Enhanced Graph Visualization

**Purpose**: Renders the enhanced graph with complexity indicators and interactive features

**Key Features**:
- Complexity-based color coding
- Expandable folder nodes (similar to dora.html reference)
- Interactive call relationship visualization
- Tooltip information with complexity details

**Styling Strategy**:
```typescript
const complexityStyles = {
    low: { backgroundColor: '#28a745', borderColor: '#1e7e34' },
    medium: { backgroundColor: '#ffc107', borderColor: '#e0a800' },
    high: { backgroundColor: '#dc3545', borderColor: '#c82333' }
};
```

## Data Models

### Enhanced Code Graph Node

```typescript
interface CodeGraphNode {
    name: string;
    type: 'folder' | 'file' | 'class' | 'function';
    children: CodeGraphNode[];
    calls: CallRelationship[];
    complexity?: ComplexityInfo;
    path?: string;
    line_number?: number;
}

interface CallRelationship {
    target: [string, string, string, string]; // [folder, file, class, function]
    label: string; // "uses", "fetches", "calls", etc.
}

interface ComplexityInfo {
    cyclomatic: number;
    cognitive: number;
    level: 'low' | 'medium' | 'high';
}
```

### Graph Element Transformation

```typescript
interface GraphElements {
    nodes: Array<{
        data: {
            id: string;
            name: string;
            type: string;
            complexity?: ComplexityInfo;
            parent?: string;
        };
        position?: { x: number; y: number };
        classes?: string[];
    }>;
    edges: Array<{
        data: {
            id: string;
            source: string;
            target: string;
            label?: string;
            type: 'contains' | 'calls';
        };
    }>;
}
```

## Error Handling

### Data Validation Strategy

1. **Schema Validation**: Validate the new code_graph_json structure
2. **Fallback Handling**: Use existing data structure if new format is unavailable
3. **Partial Data Support**: Handle missing complexity or call information gracefully
4. **Type Safety**: Ensure TypeScript interfaces match Python output structure

### Complexity Calculation Error Handling

```python
def safe_complexity_calculation(node: ast.FunctionDef) -> ComplexityInfo:
    try:
        cyclomatic = calculate_cyclomatic_complexity(node)
        cognitive = calculate_cognitive_complexity(node)
        level = get_complexity_level(cyclomatic)
        return ComplexityInfo(cyclomatic, cognitive, level)
    except Exception as e:
        logger.warning(f"Complexity calculation failed: {e}")
        return ComplexityInfo(1, 1, "low")  # Safe default
```

### Graph Rendering Error Handling

```typescript
function safeGraphRendering(data: any): void {
    try {
        if (isEnhancedDataStructure(data)) {
            renderEnhancedGraph(data.code_graph_json);
        } else {
            renderLegacyGraph(data.modules || []);
        }
    } catch (error) {
        console.error('Graph rendering failed:', error);
        showGraphError('Unable to render code graph');
    }
}
```

## Testing Strategy

### Python Analyzer Testing

1. **Complexity Calculation**: Test with functions of varying complexity levels
2. **Call Graph Analysis**: Verify call relationship detection across modules
3. **Data Structure Generation**: Ensure output matches expected schema
4. **Edge Cases**: Handle empty files, syntax errors, and missing imports

### TypeScript Processing Testing

1. **Data Validation**: Test with various input formats and edge cases
2. **Graph Transformation**: Verify correct node and edge creation
3. **Backward Compatibility**: Ensure legacy data still works
4. **Visual Rendering**: Test complexity styling and interactive features

### Integration Testing

1. **End-to-End Flow**: Test complete pipeline from Python analysis to graph rendering
2. **Performance**: Measure processing time with large codebases
3. **Error Scenarios**: Test behavior with malformed or incomplete data
4. **Cross-Platform**: Verify functionality across different operating systems

## Implementation Approach

### Phase 1: Python Analyzer Enhancement
- Extend complexity calculation capabilities
- Implement enhanced call graph analysis
- Update data structure generation to include new fields
- Add comprehensive error handling and logging

### Phase 2: TypeScript Data Processing
- Create data validation and transformation utilities
- Implement backward compatibility layer
- Build enhanced graph element creation logic
- Add complexity-based styling system

### Phase 3: Visualization Enhancement
- Update graph rendering to handle new data structure
- Implement complexity-based visual indicators
- Add interactive features similar to dora.html reference
- Create enhanced tooltips and information displays

### Phase 4: Testing and Optimization
- Comprehensive testing of both Python and TypeScript components
- Performance optimization for large codebases
- Error handling refinement
- Documentation and code cleanup

## Technical Considerations

### Performance Optimization

- **Lazy Loading**: Load complexity calculations only when needed
- **Caching**: Cache expensive AST parsing and analysis results
- **Streaming**: Process large codebases in chunks
- **Memory Management**: Efficient data structure usage

### Backward Compatibility

- **Graceful Degradation**: Fall back to existing visualization if new data unavailable
- **Version Detection**: Detect data structure version and handle appropriately
- **Migration Path**: Provide smooth transition from old to new format
- **Legacy Support**: Maintain support for existing analysis workflows

### Extensibility

- **Plugin Architecture**: Allow custom complexity calculators
- **Configurable Thresholds**: Make complexity levels configurable
- **Custom Relationship Types**: Support additional call relationship types
- **Visualization Themes**: Support different visual styling approaches