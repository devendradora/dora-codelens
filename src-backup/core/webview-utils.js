"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResourceUris = exports.generateNonce = exports.convertGitAnalyticsData = exports.convertCurrentFileAnalysisData = exports.convertAnalysisDataForWebview = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Convert analysis result to webview format
 */
function convertAnalysisDataForWebview(result) {
    const webviewData = {};
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
exports.convertAnalysisDataForWebview = convertAnalysisDataForWebview;
/**
 * Convert current file analysis data to webview format
 */
function convertCurrentFileAnalysisData(analysisData) {
    const webviewData = {};
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
exports.convertCurrentFileAnalysisData = convertCurrentFileAnalysisData;
/**
 * Convert Git analytics data to webview format
 */
function convertGitAnalyticsData(analysisData, analysisType) {
    const webviewData = {};
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
exports.convertGitAnalyticsData = convertGitAnalyticsData;
/**
 * Generate a nonce for security
 */
function generateNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
exports.generateNonce = generateNonce;
function getResourceUris(context, webview) {
    return {
        cytoscape: webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, "node_modules", "cytoscape", "dist", "cytoscape.min.js")),
        cytoscapeDagre: webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, "node_modules", "cytoscape-dagre", "cytoscape-dagre.js")),
        dagre: webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, "node_modules", "dagre", "dist", "dagre.min.js")),
        style: webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, "resources", "webview.css"))
    };
}
exports.getResourceUris = getResourceUris;
//# sourceMappingURL=webview-utils.js.map