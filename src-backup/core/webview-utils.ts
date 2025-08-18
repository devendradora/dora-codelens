import * as vscode from 'vscode';

/**
 * Interface for analysis data that will be displayed in the webview
 */
export interface WebviewAnalysisData {
  modules?: ModuleGraphData;
  functions?: CallGraphData;
  techStack?: TechStackData;
  frameworkPatterns?: FrameworkPatternsData;
  gitAnalytics?: GitAnalyticsData;
}

/**
 * Git analytics data structure
 */
export interface GitAnalyticsData {
  repositoryInfo: any;
  authorContributions: any[];
  moduleStatistics: any;
  commitTimeline: any;
  contributionGraphs: any[];
  analysisType: string;
}

/**
 * Module graph data structure
 */
export interface ModuleGraphData {
  nodes: ModuleNode[];
  edges: ModuleEdge[];
}

export interface ModuleNode {
  id: string;
  name: string;
  path: string;
  complexity: number;
  size: number;
  functions: string[];
}

export interface ModuleEdge {
  source: string;
  target: string;
  type: "import" | "dependency";
  weight: number;
}

/**
 * Call graph data structure
 */
export interface CallGraphData {
  nodes: FunctionNode[];
  edges: CallEdge[];
}

export interface FunctionNode {
  id: string;
  name: string;
  module: string;
  complexity: number;
  lineNumber: number;
  parameters: Parameter[];
}

export interface Parameter {
  name: string;
  type_hint?: string;
  default_value?: string;
  is_vararg?: boolean;
  is_kwarg?: boolean;
}

export interface CallEdge {
  caller: string;
  callee: string;
  callCount: number;
  lineNumbers: number[];
}

/**
 * Tech stack data structure
 */
export interface TechStackData {
  libraries: Library[];
  pythonVersion: string;
  frameworks: string[];
  packageManager: "pip" | "poetry" | "pipenv";
}

export interface Library {
  name: string;
  version?: string;
  category?: string;
}

/**
 * Framework patterns data structure
 */
export interface FrameworkPatternsData {
  django?: DjangoPatterns;
  flask?: FlaskPatterns;
  fastapi?: FastAPIPatterns;
}

export interface DjangoPatterns {
  urlPatterns: URLPattern[];
  views: ViewMapping[];
  models: ModelMapping[];
  serializers: SerializerMapping[];
}

export interface URLPattern {
  pattern: string;
  viewName: string;
  viewFunction: string;
  namespace?: string;
}

export interface ViewMapping {
  name: string;
  file: string;
  lineNumber: number;
}

export interface ModelMapping {
  name: string;
  file: string;
  lineNumber: number;
}

export interface SerializerMapping {
  name: string;
  file: string;
  lineNumber: number;
}

export interface FlaskPatterns {
  routes: FlaskRoute[];
  blueprints: Blueprint[];
}

export interface FlaskRoute {
  pattern: string;
  methods: string[];
  function: string;
  file: string;
  lineNumber: number;
}

export interface Blueprint {
  name: string;
  file: string;
  routes: FlaskRoute[];
}

export interface FastAPIPatterns {
  routes: FastAPIRoute[];
  dependencies: DependencyMapping[];
}

export interface FastAPIRoute {
  pattern: string;
  method: string;
  function: string;
  file: string;
  lineNumber: number;
}

export interface DependencyMapping {
  name: string;
  file: string;
  lineNumber: number;
}

/**
 * Webview message types for communication between extension and webview
 */
export interface WebviewMessage {
  command: string;
  data?: any;
}

/**
 * Convert analysis result to webview format
 */
export function convertAnalysisDataForWebview(result: any): WebviewAnalysisData {
  const webviewData: WebviewAnalysisData = {};

  if (result.modules) {
    webviewData.modules = result.modules;
  }

  if (result.functions) {
    webviewData.functions = result.functions;
  }

  if (result.tech_stack || result.techStack) {
    webviewData.techStack = result.tech_stack || result.techStack;
  }

  if (result.framework_patterns || result.frameworkPatterns) {
    webviewData.frameworkPatterns = result.framework_patterns || result.frameworkPatterns;
  }

  return webviewData;
}

/**
 * Convert current file analysis data to webview format
 */
export function convertCurrentFileAnalysisData(analysisData: any): WebviewAnalysisData {
  const webviewData: WebviewAnalysisData = {};

  // Handle different data formats
  if (analysisData.modules) {
    webviewData.modules = analysisData.modules;
  }

  if (analysisData.functions) {
    webviewData.functions = analysisData.functions;
  }

  // Handle nested data structures
  if (analysisData.data) {
    if (analysisData.data.modules) {
      webviewData.modules = analysisData.data.modules;
    }
    if (analysisData.data.functions) {
      webviewData.functions = analysisData.data.functions;
    }
  }

  return webviewData;
}

/**
 * Convert Git analytics data to webview format
 */
export function convertGitAnalyticsData(analysisData: any, analysisType: string): WebviewAnalysisData {
  const webviewData: WebviewAnalysisData = {};

  webviewData.gitAnalytics = {
    repositoryInfo: analysisData.repositoryInfo || {},
    authorContributions: analysisData.authorContributions || [],
    moduleStatistics: analysisData.moduleStatistics || {},
    commitTimeline: analysisData.commitTimeline || {},
    contributionGraphs: analysisData.contributionGraphs || [],
    analysisType: analysisType
  };

  return webviewData;
}

/**
 * Generate a nonce for security
 */
export function generateNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * Get resource URIs for webview
 */
export interface ResourceUris {
  cytoscape: vscode.Uri;
  cytoscapeDagre: vscode.Uri;
  dagre: vscode.Uri;
  style: vscode.Uri;
}

export function getResourceUris(context: vscode.ExtensionContext, webview: vscode.Webview): ResourceUris {
  return {
    cytoscape: webview.asWebviewUri(
      vscode.Uri.joinPath(
        context.extensionUri,
        "node_modules",
        "cytoscape",
        "dist",
        "cytoscape.min.js"
      )
    ),
    cytoscapeDagre: webview.asWebviewUri(
      vscode.Uri.joinPath(
        context.extensionUri,
        "node_modules",
        "cytoscape-dagre",
        "cytoscape-dagre.js"
      )
    ),
    dagre: webview.asWebviewUri(
      vscode.Uri.joinPath(
        context.extensionUri,
        "node_modules",
        "dagre",
        "dist",
        "dagre.min.js"
      )
    ),
    style: webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, "resources", "webview.css")
    )
  };
}