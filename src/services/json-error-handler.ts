import { JsonError, JsonWarning } from '../types/json-types';

export class JsonErrorHandler {
    /**
     * Get context around an error position
     */
    public static getErrorContext(content: string, position: number): string {
        const start = Math.max(0, position - 20);
        const end = Math.min(content.length, position + 20);
        return content.substring(start, end);
    }

    /**
     * Generate context-aware suggestions based on error context and message
     */
    public static getSuggestionForContext(context: string, errorMessage: string): string {
        const trimmedContext = context.trim();

        // Check for common patterns
        if (trimmedContext.endsWith('{') || trimmedContext.endsWith('[')) {
            return 'Empty object or array - add content or remove brackets';
        }
        
        if (trimmedContext.includes('":') && !trimmedContext.includes('","')) {
            return 'Missing comma between properties';
        }

        if (trimmedContext.includes('"') && !trimmedContext.endsWith('"')) {
            return 'Unclosed string - add closing quote';
        }

        // Specific error patterns
        if (errorMessage.includes('Expected') && errorMessage.includes('after')) {
            return 'Check the syntax near this location - missing punctuation';
        }

        if (errorMessage.includes('Unexpected token')) {
            return 'Invalid character or punctuation found - check syntax';
        }

        return 'Check JSON syntax at this location';
    }

    /**
     * Format error message for display
     */
    public static formatErrorMessage(error: JsonError | JsonWarning): string {
        const location = 'line' in error ? ` at line ${error.line}, column ${error.column}` : '';
        const severity = 'severity' in error ? 'Error' : 'Warning';
        return `${severity}: ${error.message}${location}\nSuggestion: ${error.suggestion}`;
    }

    /**
     * Check for potential JSON5/JSON with Comments features
     */
    public static detectExtendedJsonFeatures(content: string): JsonWarning[] {
        const warnings: JsonWarning[] = [];

        if (content.includes('//') || content.includes('/*')) {
            warnings.push({
                message: 'Comments detected in JSON',
                type: 'best-practice',
                suggestion: 'Standard JSON does not support comments. Consider using a JSON5 parser if needed.'
            });
        }

        if (/,[\s\n]*[}\]]/.test(content)) {
            warnings.push({
                message: 'Trailing commas detected',
                type: 'best-practice',
                suggestion: 'Standard JSON does not support trailing commas. Consider using a JSON5 parser if needed.'
            });
        }

        if (/'[^']*'/.test(content)) {
            warnings.push({
                message: 'Single quotes detected',
                type: 'best-practice',
                suggestion: 'Standard JSON requires double quotes. Consider using a JSON5 parser if needed.'
            });
        }

        return warnings;
    }

    /**
     * Handle specific error cases with detailed suggestions
     */
    public static getDetailedErrorInfo(error: Error): JsonError {
        const message = error.message;
        let type: JsonError['type'] = 'validation';
        let suggestion = 'Check JSON syntax';

        if (message.includes('Unexpected token')) {
            type = 'syntax';
            suggestion = 'Invalid character found - check for incorrect quotes, commas, or brackets';
        } else if (message.includes('Unexpected end')) {
            type = 'syntax';
            suggestion = 'JSON structure is incomplete - check for missing closing brackets or braces';
        } else if (message.includes('Unexpected string')) {
            type = 'syntax';
            suggestion = 'Unexpected string found - check for missing commas between properties';
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
}
