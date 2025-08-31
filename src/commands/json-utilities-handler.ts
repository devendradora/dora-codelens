import * as vscode from "vscode";
import { ErrorHandler } from "../core/error-handler";
import { JsonUtilitiesService } from "../services/json-utilities-service";
import { JsonContextDetector } from "../utils/json-context-detector";

/**
 * JSON Utilities Command Handler
 * Handles JSON formatting, validation, and minify commands with context awareness
 */
export class JsonUtilitiesHandler {
  private errorHandler: ErrorHandler;
  private jsonUtilitiesService: JsonUtilitiesService;

  constructor(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;
    this.jsonUtilitiesService = JsonUtilitiesService.getInstance(errorHandler);
  }

  /**
   * Handle JSON format command
   */
  public async handleFormatJson(): Promise<void> {
    try {
      this.errorHandler.logError(
        "JSON format command initiated",
        null,
        "JsonUtilitiesHandler"
      );

      // Check if context supports JSON operations
      if (!this.isJsonContextAvailable()) {
        vscode.window.showWarningMessage(
          "JSON formatting is not available in the current context."
        );
        return;
      }

      await this.jsonUtilitiesService.formatJsonInEditor();
    } catch (error) {
      this.errorHandler.logError(
        "JSON format command failed",
        error,
        "JsonUtilitiesHandler"
      );
      vscode.window.showErrorMessage(
        "Failed to format JSON. Check the output for details."
      );
    }
  }

  /**
   * Handle JSON minify command
   */
  public async handleMinifyJson(): Promise<void> {
    try {
      this.errorHandler.logError(
        "JSON minify command initiated",
        null,
        "JsonUtilitiesHandler"
      );

      // Check if context supports JSON operations
      if (!this.isJsonContextAvailable()) {
        vscode.window.showWarningMessage(
          "JSON minification is not available in the current context."
        );
        return;
      }

      await this.jsonUtilitiesService.minifyJsonInEditor();
    } catch (error) {
      this.errorHandler.logError(
        "JSON minify command failed",
        error,
        "JsonUtilitiesHandler"
      );
      vscode.window.showErrorMessage(
        "Failed to minify JSON. Check the output for details."
      );
    }
  }

  /**
   * Handle JSON tree view command
   */
  public async handleJsonTreeView(): Promise<void> {
    try {
      this.errorHandler.logError(
        "JSON tree view command initiated",
        null,
        "JsonUtilitiesHandler"
      );

      // Check if context supports JSON operations
      if (!this.isJsonContextAvailable()) {
        vscode.window.showWarningMessage(
          "JSON tree view is not available in the current context."
        );
        return;
      }

      await this.jsonUtilitiesService.showJsonTreeView();
    } catch (error) {
      this.errorHandler.logError(
        "JSON tree view command failed",
        error,
        "JsonUtilitiesHandler"
      );
      vscode.window.showErrorMessage(
        "Failed to show JSON tree view. Check the output for details."
      );
    }
  }

  /**
   * Handle JSON fix command (converts Python dict to JSON)
   */
  public async handleFixJson(): Promise<void> {
    try {
      this.errorHandler.logError(
        "JSON fix command initiated",
        null,
        "JsonUtilitiesHandler"
      );

      // Check if context supports JSON operations
      if (!this.isJsonContextAvailable()) {
        vscode.window.showWarningMessage(
          "JSON fix is not available in the current context."
        );
        return;
      }

      await this.jsonUtilitiesService.fixJsonInEditor();
    } catch (error) {
      this.errorHandler.logError(
        "JSON fix command failed",
        error,
        "JsonUtilitiesHandler"
      );
      vscode.window.showErrorMessage(
        "Failed to fix JSON. Check the output for details."
      );
    }
  }

  /**
   * Check if JSON context is available for operations
   */
  private isJsonContextAvailable(): boolean {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return false;
    }

    return JsonContextDetector.isJsonContext(
      editor.document,
      editor.selection.active
    );
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.jsonUtilitiesService.dispose();
  }
}
