/**
 * Webview Components Index
 * Exports all webview providers and the webview manager
 */

export { FullCodeAnalysisWebview } from "./full-code-analysis-webview";
export { CurrentFileAnalysisWebview } from "./current-file-analysis-webview";
export { GitAnalyticsWebview } from "./git-analytics-webview";
export { DatabaseSchemaWebview } from "./database-schema-webview";
export { WebviewManager } from "./webview-manager";

// Type definitions for webview data
export interface AnalysisData {
  success: boolean;
  metadata?: {
    analysis_time?: number;
    total_files?: number;
    analyzed_files?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface FullCodeAnalysisData extends AnalysisData {
  code_graph_json?: any[];
  tech_stack?: {
    languages?: { [key: string]: number };
    frameworks?: any[];
    dependencies?: { [key: string]: string };
  };
  dependencies?: any[];
  complexity_metrics?: any;
}

export interface CurrentFileAnalysisData extends AnalysisData {
  complexity_metrics?: {
    overall_complexity?: {
      level: string;
      score: number;
    };
    lines_of_code?: number;
    cyclomatic_complexity?: number;
    maintainability_index?: number;
    function_complexities?: any[];
    halstead_metrics?: any;
    cognitive_complexity?: number;
  };
  dependencies?: any[];
  framework_patterns?: any[];
}

export interface GitAnalyticsData extends AnalysisData {
  repository_info?: {
    repository_name?: string;
    total_commits?: number;
    contributors?: number;
    first_commit_date?: string;
    last_commit_date?: string;
    total_files?: number;
  };
  authorContributions?: any[];
  commitTimeline?: any[];
  moduleStatistics?: any[];
}

export interface DatabaseSchemaData extends AnalysisData {
  tables?: any[];
  relationships?: any[];
  metadata?: {
    total_tables?: number;
    total_relationships?: number;
    total_columns?: number;
    total_indexes?: number;
  };
}

export interface WebviewContext {
  filePath?: string;
  workspacePath?: string;
  analysisOptions?: any;
  [key: string]: any;
}

// Webview types
export type WebviewType =
  | "fullCode"
  | "currentFile"
  | "gitAnalytics"
  | "databaseSchema";

// Webview status interface
export interface WebviewStatus {
  fullCodeAnalysis: boolean;
  currentFileAnalysis: boolean;
  gitAnalytics: boolean;
  databaseSchema: boolean;
}
