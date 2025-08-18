/**
 * Core extension types for the refactored DoraCodeBirdView extension
 */

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