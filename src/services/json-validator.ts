import * as vscode from 'vscode';
import { JsonError, JsonValidationResult, JsonWarning } from '../types/json-types';

/**
 * Enhanced error handling and validation for JSON operations
 */
export class JsonValidator {
    /**
     * Validate JSON content with support for modern features
     */
    public static validateJson(content: string, preserveFormatting: boolean = false): JsonValidationResult {
        const errors: JsonError[] = [];
        const warnings: JsonWarning[] = [];
        let isValid = true;
        let formattedContent: string | undefined;

        // Basic validation
        if (!content.trim()) {
            errors.push(this.createError('Empty JSON content'));
            isValid = false;
            return { isValid, errors, warnings };
        }

        try {
            // Parse and format
            const parsed = JSON.parse(content);
            formattedContent = preserveFormatting ? content : JSON.stringify(parsed, null, 2);
            isValid = true;

            // Check for potential issues
            if (content.length > 1000000) {
                warnings.push({
                    message: 'Large JSON object detected',
                    type: 'performance',
                    suggestion: 'Consider breaking down large JSON objects for better performance'
                });
            }

        } catch (error) {
            isValid = false;
            if (error instanceof SyntaxError) {
                errors.push(this.parseSyntaxError(error, content));
            } else {
                errors.push(this.createError(error instanceof Error ? error.message : 'Unknown error'));
            }
        }

        // Check for modern JSON features
        const modernFeatures = this.checkModernFeatures(content);
        warnings.push(...modernFeatures);

        return { isValid, errors, warnings, formattedContent };
    }

    /**
     * Parse a syntax error into a detailed JsonError
     */
    private static parseSyntaxError(error: SyntaxError, content: string): JsonError {
        const message = error.message;
        let type: 'syntax' | 'validation' | 'parsing' = 'syntax';
        let suggestion = 'Check JSON syntax';

        // Extract position from error message
        const posMatch = message.match(/at position (\d+)/);
        if (posMatch) {
            const pos = parseInt(posMatch[1]);
            const context = this.getErrorContext(content, pos);
            suggestion = this.getSuggestionForContext(context, message);
        }

        // Update type and suggestion based on error message
        if (message.includes('Unexpected token')) {
            suggestion = 'Check for missing quotes, commas, or brackets';
        } else if (message.includes('Unexpected end')) {
            suggestion = 'Check for missing closing brackets or braces';
        } else if (message.includes('Unexpected string')) {
            suggestion = 'Check for missing commas between properties';
        } else if (message.includes('JSON.parse')) {
            type = 'parsing';
            suggestion = 'Invalid JSON structure - validate using a JSON linter';
        }

        return {
            message,
            type,
            severity: 'error',
            suggestion
        };
    }

    /**
     * Create a basic error object
     */
    private static createError(message: string): JsonError {
        return {
            message,
            type: 'validation',
            severity: 'error',
            suggestion: 'Check JSON syntax and structure'
        };
    }

    /**
     * Check for modern JSON features that might need special handling
     */
    private static checkModernFeatures(content: string): JsonWarning[] {
        const warnings: JsonWarning[] = [];

        // Check for comments
        if (content.includes('//') || content.includes('/*')) {
            warnings.push({
                message: 'Comments detected in JSON',
                type: 'best-practice',
                suggestion: 'Comments are not part of the JSON standard but may be supported by some parsers'
            });
        }

        // Check for trailing commas
        if (/,[\s\n]*[}\]]/.test(content)) {
            warnings.push({
                message: 'Trailing commas detected',
                type: 'best-practice',
                suggestion: 'Trailing commas are not part of the JSON standard but may be supported by some parsers'
            });
        }

        return warnings;
    }

    /**
     * Get context around an error position
     */
    private static getErrorContext(content: string, position: number): string {
        const start = Math.max(0, position - 20);
        const end = Math.min(content.length, position + 20);
        return content.substring(start, end);
    }

    /**
     * Generate suggestion based on error context
     */
    private static getSuggestionForContext(context: string, errorMessage: string): string {
        if (context.includes('{') && !context.includes('}')) {
            return 'Missing closing brace }';
        }
        if (context.includes('[') && !context.includes(']')) {
            return 'Missing closing bracket ]';
        }
        if (context.includes('"') && (context.match(/"/g) || []).length % 2 !== 0) {
            return 'Unclosed string - add closing quote';
        }
        if (context.includes(':') && !context.includes(',') && !context.includes('}')) {
            return 'Missing comma between properties or missing closing brace';
        }
        
        return 'Check syntax near this location';
    }
}
