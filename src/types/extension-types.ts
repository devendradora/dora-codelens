/**
 * Core extension types for the refactored DoraCodeLens extension
 */

/**
 * Enhanced code graph node interface
 */
export interface CodeGraphNode {
  name: string;
  type: 'folder' | 'file' | 'class' | 'function';
  children: CodeGraphNode[];
  calls: CallRelationship[];
  complexity?: ComplexityInfo;
  path?: string;
  line_number?: number;
  isExpanded?: boolean;
}

/**
 * Call relationship interface
 */
export interface CallRelationship {
  target: [string, string, string, string]; // [folder, file, class, function]
  label: string; // "uses", "fetches", "calls", etc.
}

/**
 * Complexity information interface
 */
export interface ComplexityInfo {
  cyclomatic: number;
  cognitive: number;
  level: 'low' | 'medium' | 'high';
}

/**
 * Enhanced analysis result interface
 */
export interface EnhancedAnalysisResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  tech_stack: any; // Existing tech stack structure
  code_graph_json?: CodeGraphNode[]; // Enhanced hierarchical structure
}

/**
 * Analysis result interface
 */
export interface AnalysisResult {
  type: 'fullCode' | 'currentFile' | 'gitAnalytics' | 'databaseSchema';
  timestamp: number;
  status: 'completed' | 'failed' | 'partial';
  data?: any;
  error?: string;
}

/**
 * Analysis options interface
 */
export interface AnalysisOptions {
  type: 'fullCode' | 'currentFile' | 'gitAnalytics' | 'databaseSchema';
  includeTests?: boolean;
  maxDepth?: number;
  excludePatterns?: string[];
  [key: string]: any;
}

/**
 * Command execution result
 */
export interface CommandExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  duration: number;
}

/**
 * Extension state interface
 */
export interface ExtensionState {
  isInitialized: boolean;
  version: string;
  lastActivation: number;
  errorCount: number;
}