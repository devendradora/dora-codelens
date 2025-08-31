import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { ErrorHandler } from "../core/error-handler";

/**
 * HTML view options
 */
export interface HTMLViewOptions {
  title?: string;
  enableScripts?: boolean;
  enableForms?: boolean;
  retainContextWhenHidden?: boolean;
  localResourceRoots?: vscode.Uri[];
}

/**
 * HTML view service for rendering HTML files in webviews
 */
export class HTMLViewService {
  private static instance: HTMLViewService;
  private errorHandler: ErrorHandler;
  private activeViews: Map<string, vscode.WebviewPanel> = new Map();

  private constructor(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;
  }

  public static getInstance(errorHandler?: ErrorHandler): HTMLViewService {
    if (!HTMLViewService.instance) {
      if (!errorHandler) {
        throw new Error("ErrorHandler required for first initialization");
      }
      HTMLViewService.instance = new HTMLViewService(errorHandler);
    }
    return HTMLViewService.instance;
  }

  /**
   * Render HTML file in a webview
   */
  public async renderHTMLFile(
    htmlFilePath: string,
    options: HTMLViewOptions = {}
  ): Promise<vscode.WebviewPanel> {
    try {
      // Validate HTML file exists
      if (!fs.existsSync(htmlFilePath)) {
        throw new Error(`HTML file not found: ${htmlFilePath}`);
      }

      // Read HTML content
      const htmlContent = fs.readFileSync(htmlFilePath, "utf8");

      // Create webview panel
      const panel = this.createWebviewPanel(htmlFilePath, options);

      // Process and set HTML content
      const processedHTML = await this.processHTMLContent(
        htmlContent,
        htmlFilePath,
        panel.webview
      );
      panel.webview.html = processedHTML;

      // Store active view
      const viewId = this.generateViewId(htmlFilePath);
      this.activeViews.set(viewId, panel);

      // Handle panel disposal
      panel.onDidDispose(() => {
        this.activeViews.delete(viewId);
        this.errorHandler.logError(
          "HTML view disposed",
          { htmlFilePath },
          "renderHTMLFile"
        );
      });

      this.errorHandler.logError(
        "HTML file rendered successfully",
        { htmlFilePath },
        "renderHTMLFile"
      );
      return panel;
    } catch (error) {
      this.errorHandler.logError(
        "Failed to render HTML file",
        error,
        "renderHTMLFile"
      );
      throw error;
    }
  }

  /**
   * Render HTML content directly
   */
  public async renderHTMLContent(
    htmlContent: string,
    title: string = "HTML View",
    options: HTMLViewOptions = {}
  ): Promise<vscode.WebviewPanel> {
    try {
      // Create webview panel
      const panel = this.createWebviewPanel(title, options);

      // Process and set HTML content
      const processedHTML = await this.processHTMLContent(
        htmlContent,
        "",
        panel.webview
      );
      panel.webview.html = processedHTML;

      // Store active view
      const viewId = this.generateViewId(title);
      this.activeViews.set(viewId, panel);

      // Handle panel disposal
      panel.onDidDispose(() => {
        this.activeViews.delete(viewId);
        this.errorHandler.logError(
          "HTML content view disposed",
          { title },
          "renderHTMLContent"
        );
      });

      this.errorHandler.logError(
        "HTML content rendered successfully",
        { title },
        "renderHTMLContent"
      );
      return panel;
    } catch (error) {
      this.errorHandler.logError(
        "Failed to render HTML content",
        error,
        "renderHTMLContent"
      );
      throw error;
    }
  }

  /**
   * Update existing HTML view
   */
  public async updateHTMLView(
    viewId: string,
    htmlContent: string
  ): Promise<boolean> {
    try {
      const panel = this.activeViews.get(viewId);
      if (!panel) {
        this.errorHandler.logError(
          "HTML view not found for update",
          { viewId },
          "updateHTMLView"
        );
        return false;
      }

      const processedHTML = await this.processHTMLContent(
        htmlContent,
        "",
        panel.webview
      );
      panel.webview.html = processedHTML;

      this.errorHandler.logError(
        "HTML view updated successfully",
        { viewId },
        "updateHTMLView"
      );
      return true;
    } catch (error) {
      this.errorHandler.logError(
        "Failed to update HTML view",
        error,
        "updateHTMLView"
      );
      return false;
    }
  }

  /**
   * Create webview panel with proper configuration
   */
  private createWebviewPanel(
    identifier: string,
    options: HTMLViewOptions
  ): vscode.WebviewPanel {
    const title = options.title || path.basename(identifier);
    const viewType = "doracodelens.htmlView";

    // Determine local resource roots
    const localResourceRoots = options.localResourceRoots || [];

    // Add extension resources
    const extensionPath = vscode.extensions.getExtension(
      "doracodelens.doracodelens"
    )?.extensionPath;
    if (extensionPath) {
      localResourceRoots.push(
        vscode.Uri.file(path.join(extensionPath, "resources"))
      );
    }

    // Add workspace roots
    if (vscode.workspace.workspaceFolders) {
      localResourceRoots.push(
        ...vscode.workspace.workspaceFolders.map((folder) => folder.uri)
      );
    }

    const panel = vscode.window.createWebviewPanel(
      viewType,
      title,
      vscode.ViewColumn.One,
      {
        enableScripts: options.enableScripts !== false,
        enableForms: options.enableForms === true,
        retainContextWhenHidden: options.retainContextWhenHidden === true,
        localResourceRoots,
      }
    );

    return panel;
  }

  /**
   * Process HTML content for webview compatibility
   */
  private async processHTMLContent(
    htmlContent: string,
    htmlFilePath: string,
    webview: vscode.Webview
  ): Promise<string> {
    try {
      let processedHTML = htmlContent;

      // Convert relative paths to webview URIs
      if (htmlFilePath) {
        const htmlDir = path.dirname(htmlFilePath);
        processedHTML = this.convertRelativePaths(
          processedHTML,
          htmlDir,
          webview
        );
      }

      // Add CSP if not present
      if (!processedHTML.includes("Content-Security-Policy")) {
        processedHTML = this.addContentSecurityPolicy(processedHTML);
      }

      // Add extension resources if needed
      processedHTML = this.addExtensionResources(processedHTML, webview);

      return processedHTML;
    } catch (error) {
      this.errorHandler.logError(
        "Failed to process HTML content",
        error,
        "processHTMLContent"
      );
      return htmlContent; // Return original content as fallback
    }
  }

  /**
   * Convert relative paths to webview URIs
   */
  private convertRelativePaths(
    htmlContent: string,
    baseDir: string,
    webview: vscode.Webview
  ): string {
    // Convert src attributes
    htmlContent = htmlContent.replace(/src=["']([^"']+)["']/g, (match, src) => {
      if (
        src.startsWith("http") ||
        src.startsWith("data:") ||
        src.startsWith("vscode-webview:")
      ) {
        return match;
      }
      const fullPath = path.resolve(baseDir, src);
      const uri = webview.asWebviewUri(vscode.Uri.file(fullPath));
      return `src="${uri}"`;
    });

    // Convert href attributes
    htmlContent = htmlContent.replace(
      /href=["']([^"']+)["']/g,
      (match, href) => {
        if (
          href.startsWith("http") ||
          href.startsWith("#") ||
          href.startsWith("vscode-webview:")
        ) {
          return match;
        }
        const fullPath = path.resolve(baseDir, href);
        const uri = webview.asWebviewUri(vscode.Uri.file(fullPath));
        return `href="${uri}"`;
      }
    );

    return htmlContent;
  }

  /**
   * Add Content Security Policy
   */
  private addContentSecurityPolicy(htmlContent: string): string {
    const csp = `
      <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        img-src vscode-webview: https: data:;
        script-src vscode-webview: 'unsafe-inline' 'unsafe-eval';
        style-src vscode-webview: 'unsafe-inline';
        font-src vscode-webview: https:;
        connect-src vscode-webview: https:;
      ">
    `;

    // Insert CSP in head section
    if (htmlContent.includes("<head>")) {
      return htmlContent.replace("<head>", `<head>${csp}`);
    } else if (htmlContent.includes("<html>")) {
      return htmlContent.replace("<html>", `<html><head>${csp}</head>`);
    } else {
      return `<head>${csp}</head>${htmlContent}`;
    }
  }

  /**
   * Add extension resources to HTML
   */
  private addExtensionResources(
    htmlContent: string,
    webview: vscode.Webview
  ): string {
    const extensionPath = vscode.extensions.getExtension(
      "doracodelens.doracodelens"
    )?.extensionPath;
    if (!extensionPath) {
      return htmlContent;
    }

    // Add common CSS if not already present
    const cssPath = path.join(extensionPath, "resources", "webview.css");
    if (fs.existsSync(cssPath) && !htmlContent.includes("webview.css")) {
      const cssUri = webview.asWebviewUri(vscode.Uri.file(cssPath));
      const cssLink = `<link rel="stylesheet" href="${cssUri}">`;

      if (htmlContent.includes("</head>")) {
        htmlContent = htmlContent.replace("</head>", `${cssLink}</head>`);
      } else {
        htmlContent = `<head>${cssLink}</head>${htmlContent}`;
      }
    }

    return htmlContent;
  }

  /**
   * Generate unique view ID
   */
  private generateViewId(identifier: string): string {
    return `html_view_${Date.now()}_${identifier.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}`;
  }

  /**
   * Get active view by ID
   */
  public getActiveView(viewId: string): vscode.WebviewPanel | undefined {
    return this.activeViews.get(viewId);
  }

  /**
   * Get all active views
   */
  public getActiveViews(): Map<string, vscode.WebviewPanel> {
    return new Map(this.activeViews);
  }

  /**
   * Close view by ID
   */
  public closeView(viewId: string): boolean {
    const panel = this.activeViews.get(viewId);
    if (panel) {
      panel.dispose();
      return true;
    }
    return false;
  }

  /**
   * Close all active views
   */
  public closeAllViews(): void {
    for (const [viewId, panel] of this.activeViews) {
      try {
        panel.dispose();
      } catch (error) {
        this.errorHandler.logError(
          "Error closing HTML view",
          error,
          "closeAllViews"
        );
      }
    }
    this.activeViews.clear();
  }

  /**
   * Render analysis result as HTML
   */
  public async renderAnalysisResult(
    analysisResult: any,
    analysisType: string,
    options: HTMLViewOptions = {}
  ): Promise<vscode.WebviewPanel> {
    try {
      // Validate analysis result
      if (!analysisResult) {
        throw new Error("No analysis result provided");
      }

      // Generate HTML content from analysis result
      const htmlContent = this.generateAnalysisHTML(
        analysisResult,
        analysisType
      );

      const title = options.title || `${analysisType} Analysis Results`;
      const panel = await this.renderHTMLContent(htmlContent, title, {
        ...options,
        enableScripts: true, // Enable scripts for interactive visualizations
      });

      this.errorHandler.logError(
        "Analysis result rendered successfully",
        { analysisType, title },
        "renderAnalysisResult"
      );
      return panel;
    } catch (error) {
      this.errorHandler.logError(
        "Failed to render analysis result",
        error,
        "renderAnalysisResult"
      );

      // Show user-friendly error message
      vscode.window
        .showErrorMessage(
          `Failed to display ${analysisType} analysis results. Check the output for details.`,
          "Open Output"
        )
        .then((selection) => {
          if (selection === "Open Output") {
            vscode.commands.executeCommand(
              "workbench.action.output.toggleOutput"
            );
          }
        });

      throw error;
    }
  }

  /**
   * Generate HTML content from analysis result
   */
  private generateAnalysisHTML(
    analysisResult: any,
    analysisType: string
  ): string {
    const title = `${analysisType} Analysis Results`;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
          }
          .header {
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .section {
            margin-bottom: 30px;
            padding: 20px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 8px;
          }
          .json-viewer {
            background-color: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            overflow-x: auto;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            white-space: pre-wrap;
          }
          h1, h2, h3 {
            color: var(--vscode-titleBar-activeForeground);
          }
          .metadata {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
          }
          .metadata-item {
            padding: 10px;
            background-color: var(--vscode-button-secondaryBackground);
            border-radius: 4px;
          }
          .metadata-label {
            font-weight: bold;
            color: var(--vscode-button-secondaryForeground);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${title}</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
          
          ${this.generateMetadataSection(analysisResult)}
          
          <div class="section">
            <h2>Analysis Results</h2>
            <div class="json-viewer">${JSON.stringify(
              analysisResult,
              null,
              2
            )}</div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate metadata section for analysis result
   */
  private generateMetadataSection(analysisResult: any): string {
    const metadata = analysisResult.metadata || {};

    return `
      <div class="section">
        <h2>Analysis Metadata</h2>
        <div class="metadata">
          <div class="metadata-item">
            <div class="metadata-label">Success</div>
            <div>${analysisResult.success ? "Yes" : "No"}</div>
          </div>
          <div class="metadata-item">
            <div class="metadata-label">Analysis Time</div>
            <div>${
              metadata.analysis_time
                ? `${metadata.analysis_time.toFixed(2)}s`
                : "N/A"
            }</div>
          </div>
          <div class="metadata-item">
            <div class="metadata-label">Total Files</div>
            <div>${metadata.total_files || "N/A"}</div>
          </div>
          <div class="metadata-item">
            <div class="metadata-label">Analyzed Files</div>
            <div>${metadata.analyzed_files || "N/A"}</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Dispose of the service
   */
  public dispose(): void {
    this.closeAllViews();
  }
}
