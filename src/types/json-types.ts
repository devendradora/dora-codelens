/**
 * Represents a JSON validation or syntax error
 */
export interface JsonError {
    message: string;
    type: 'syntax' | 'validation' | 'parsing';
    severity: 'error';
    suggestion: string;
    line?: number;
    column?: number;
}

/**
 * Represents a JSON warning or best practice violation
 */
export interface JsonWarning {
    message: string;
    type: 'formatting' | 'best-practice' | 'performance';
    suggestion: string;
}

/**
 * Result of JSON validation operation
 */
export interface JsonValidationResult {
    isValid: boolean;
    errors: JsonError[];
    warnings: JsonWarning[];
    formattedContent?: string;
}
