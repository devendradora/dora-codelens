import * as vscode from 'vscode';
import { ErrorHandler } from '../core/error-handler';

/**
 * Interface for code lens data
 */
export interface CodeLensData {
    range: vscode.Range;
    command: vscode.Command;
    type: 'complexity' | 'references' | 'navigation';
    metadata: {
        functionName: string;
        complexity?: number;
        referenceCount?: number;
        filePath?: string;
    };
}

/**
 * Code Lens Provider for DoraCodeLens
 * Provides inline code metrics and navigation aids
 */
export class DoraCodeLensProvider implements vscode.CodeLensProvider {
    private static instance: DoraCodeLensProvider;
    private errorHandler: ErrorHandler;
    private analysisData: any = null;
    private isEnabled: boolean = false;
    private onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event;

    private constructor(errorHandler: ErrorHandler) {
        this.errorHandler = errorHandler;
    }

    public static getInstance(errorHandler?: ErrorHandler): DoraCodeLensProvider {
        if (!DoraCodeLensProvider.instance) {
            if (!errorHandler) {
                throw new Error('ErrorHandler required for first initialization');
            }
            DoraCodeLensProvider.instance = new DoraCodeLensProvider(errorHandler);
        }
        return DoraCodeLensProvider.instance;
    }

    /**
     * Provide code lenses for a document
     */
    public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        this.errorHandler.logError(
            `Code lens requested for ${document.uri.fsPath}`,
            { enabled: this.isEnabled, hasData: !!this.analysisData },
            'DoraCodeLensProvider'
        );

        if (!this.isEnabled) {
            this.errorHandler.logError('Code lens disabled', null, 'DoraCodeLensProvider');
            return [];
        }

        if (!this.analysisData) {
            this.errorHandler.logError('No analysis data available for code lens', null, 'DoraCodeLensProvider');
            return [];
        }

        try {
            const codeLenses: vscode.CodeLens[] = [];
            const documentPath = document.uri.fsPath;

            // Add a simple test code lens at the top of the file
            const testCodeLens = new vscode.CodeLens(
                new vscode.Range(0, 0, 0, 0),
                {
                    title: '🔍 DoraCodeLens Code Lens Active',
                    command: 'doracodelens.showMessage',
                    arguments: ['Code Lens is working!']
                }
            );
            codeLenses.push(testCodeLens);

            // Find analysis data for this document
            const fileAnalysis = this.findFileAnalysis(documentPath);
            if (!fileAnalysis) {
                this.errorHandler.logError(
                    `No file analysis found for ${documentPath}`,
                    null,
                    'DoraCodeLensProvider'
                );
                return codeLenses; // Return test code lens even if no analysis data
            }

            // Generate code lenses for functions
            if (fileAnalysis.functions) {
                fileAnalysis.functions.forEach((func: any) => {
                    const codeLens = this.createFunctionCodeLens(func, document);
                    if (codeLens) {
                        codeLenses.push(codeLens);
                    }
                });
            }

            // Generate code lenses for classes
            if (fileAnalysis.classes) {
                fileAnalysis.classes.forEach((cls: any) => {
                    const codeLens = this.createClassCodeLens(cls, document);
                    if (codeLens) {
                        codeLenses.push(codeLens);
                    }

                    // Add code lenses for class methods
                    if (cls.methods) {
                        cls.methods.forEach((method: any) => {
                            const methodCodeLens = this.createMethodCodeLens(method, cls, document);
                            if (methodCodeLens) {
                                codeLenses.push(methodCodeLens);
                            }
                        });
                    }
                });
            }

            this.errorHandler.logError(
                `Generated ${codeLenses.length} code lenses for ${documentPath}`,
                null,
                'DoraCodeLensProvider'
            );

            return codeLenses;

        } catch (error) {
            this.errorHandler.logError(
                'Error providing code lenses',
                error,
                'DoraCodeLensProvider'
            );
            return [];
        }
    }

    /**
     * Resolve a code lens (optional implementation)
     */
    public resolveCodeLens(codeLens: vscode.CodeLens): vscode.CodeLens | Thenable<vscode.CodeLens> {
        return codeLens;
    }

    /**
     * Update analysis data and refresh code lenses
     */
    public updateAnalysisData(analysisData: any): void {
        this.analysisData = analysisData;
        this.onDidChangeCodeLensesEmitter.fire();
        
        this.errorHandler.logError(
            'Analysis data updated for code lens provider',
            null,
            'DoraCodeLensProvider'
        );
    }

    /**
     * Enable code lens provider
     */
    public enable(): void {
        this.isEnabled = true;
        this.onDidChangeCodeLensesEmitter.fire();
        
        this.errorHandler.logError(
            'Code lens provider enabled',
            null,
            'DoraCodeLensProvider'
        );
    }

    /**
     * Disable code lens provider
     */
    public disable(): void {
        this.isEnabled = false;
        this.onDidChangeCodeLensesEmitter.fire();
        
        this.errorHandler.logError(
            'Code lens provider disabled',
            null,
            'DoraCodeLensProvider'
        );
    }

    /**
     * Check if code lens is enabled
     */
    public isCodeLensEnabled(): boolean {
        return this.isEnabled;
    }

    /**
     * Find analysis data for a specific file
     */
    private findFileAnalysis(filePath: string): any {
        if (!this.analysisData) {
            return null;
        }

        // Try to find file analysis in different possible structures
        if (this.analysisData.files) {
            // Direct files array
            return this.analysisData.files.find((file: any) => 
                file.path === filePath || file.file_path === filePath
            );
        }

        if (this.analysisData.analysis_results) {
            // Nested in analysis_results
            return this.analysisData.analysis_results.find((file: any) => 
                file.path === filePath || file.file_path === filePath
            );
        }

        // Try to find in project structure
        if (this.analysisData.project_structure) {
            return this.findInProjectStructure(this.analysisData.project_structure, filePath);
        }

        return null;
    }

    /**
     * Recursively find file analysis in project structure
     */
    private findInProjectStructure(structure: any, filePath: string): any {
        if (Array.isArray(structure)) {
            for (const item of structure) {
                const result = this.findInProjectStructure(item, filePath);
                if (result) return result;
            }
        } else if (structure && typeof structure === 'object') {
            if (structure.path === filePath || structure.file_path === filePath) {
                return structure;
            }
            
            if (structure.children) {
                return this.findInProjectStructure(structure.children, filePath);
            }
            
            if (structure.files) {
                return this.findInProjectStructure(structure.files, filePath);
            }
        }
        
        return null;
    }

    /**
     * Create code lens for a function
     */
    private createFunctionCodeLens(func: any, document: vscode.TextDocument): vscode.CodeLens | null {
        try {
            const line = this.findFunctionLine(func.name, document);
            if (line === -1) {
                return null;
            }

            const range = new vscode.Range(line, 0, line, 0);
            const complexity = func.complexity || func.cyclomatic_complexity || 0;
            const references = func.references || func.call_count || 0;

            const title = `Complexity: ${complexity} | References: ${references}`;
            
            const command: vscode.Command = {
                title,
                command: 'doracodelens.showFunctionDetails',
                arguments: [func, document.uri]
            };

            return new vscode.CodeLens(range, command);

        } catch (error) {
            this.errorHandler.logError(
                'Error creating function code lens',
                error,
                'DoraCodeLensProvider'
            );
            return null;
        }
    }

    /**
     * Create code lens for a class
     */
    private createClassCodeLens(cls: any, document: vscode.TextDocument): vscode.CodeLens | null {
        try {
            const line = this.findClassLine(cls.name, document);
            if (line === -1) {
                return null;
            }

            const range = new vscode.Range(line, 0, line, 0);
            const methodCount = cls.methods ? cls.methods.length : 0;
            const complexity = cls.complexity || cls.total_complexity || 0;

            const title = `Methods: ${methodCount} | Complexity: ${complexity}`;
            
            const command: vscode.Command = {
                title,
                command: 'doracodelens.showClassDetails',
                arguments: [cls, document.uri]
            };

            return new vscode.CodeLens(range, command);

        } catch (error) {
            this.errorHandler.logError(
                'Error creating class code lens',
                error,
                'DoraCodeLensProvider'
            );
            return null;
        }
    }

    /**
     * Create code lens for a class method
     */
    private createMethodCodeLens(method: any, cls: any, document: vscode.TextDocument): vscode.CodeLens | null {
        try {
            const line = this.findMethodLine(method.name, cls.name, document);
            if (line === -1) {
                return null;
            }

            const range = new vscode.Range(line, 0, line, 0);
            const complexity = method.complexity || method.cyclomatic_complexity || 0;
            const references = method.references || method.call_count || 0;

            const title = `Complexity: ${complexity} | References: ${references}`;
            
            const command: vscode.Command = {
                title,
                command: 'doracodelens.showMethodDetails',
                arguments: [method, cls, document.uri]
            };

            return new vscode.CodeLens(range, command);

        } catch (error) {
            this.errorHandler.logError(
                'Error creating method code lens',
                error,
                'DoraCodeLensProvider'
            );
            return null;
        }
    }

    /**
     * Find the line number of a function definition
     */
    private findFunctionLine(functionName: string, document: vscode.TextDocument): number {
        const text = document.getText();
        const lines = text.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Look for function definition patterns
            if (line.includes(`def ${functionName}(`) || 
                line.includes(`async def ${functionName}(`)) {
                return i;
            }
        }
        
        return -1;
    }

    /**
     * Find the line number of a class definition
     */
    private findClassLine(className: string, document: vscode.TextDocument): number {
        const text = document.getText();
        const lines = text.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Look for class definition pattern
            if (line.includes(`class ${className}`) && line.includes(':')) {
                return i;
            }
        }
        
        return -1;
    }

    /**
     * Find the line number of a method definition within a class
     */
    private findMethodLine(methodName: string, className: string, document: vscode.TextDocument): number {
        const text = document.getText();
        const lines = text.split('\n');
        let inClass = false;
        let classIndent = -1;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check if we're entering the target class
            if (line.includes(`class ${className}`) && line.includes(':')) {
                inClass = true;
                classIndent = line.length - line.trimStart().length;
                continue;
            }
            
            // Check if we've left the class
            if (inClass && line.trim() && 
                (line.length - line.trimStart().length) <= classIndent && 
                !line.trimStart().startsWith('#')) {
                inClass = false;
            }
            
            // Look for method definition within the class
            if (inClass && 
                (line.includes(`def ${methodName}(`) || 
                 line.includes(`async def ${methodName}(`))) {
                return i;
            }
        }
        
        return -1;
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        this.onDidChangeCodeLensesEmitter.dispose();
    }
}

/**
 * Code Lens Manager for handling toggle functionality and state persistence
 */
export class CodeLensManager {
    private static instance: CodeLensManager;
    private errorHandler: ErrorHandler;
    private context: vscode.ExtensionContext;
    private codeLensProvider: DoraCodeLensProvider;
    private disposable: vscode.Disposable | null = null;

    private constructor(errorHandler: ErrorHandler, context: vscode.ExtensionContext) {
        this.errorHandler = errorHandler;
        this.context = context;
        this.codeLensProvider = DoraCodeLensProvider.getInstance(errorHandler);
    }

    public static getInstance(errorHandler?: ErrorHandler, context?: vscode.ExtensionContext): CodeLensManager {
        if (!CodeLensManager.instance) {
            if (!errorHandler || !context) {
                throw new Error('ErrorHandler and ExtensionContext required for first initialization');
            }
            CodeLensManager.instance = new CodeLensManager(errorHandler, context);
        }
        return CodeLensManager.instance;
    }

    /**
     * Enable code lens functionality
     */
    public enableCodeLens(): void {
        try {
            if (!this.disposable) {
                // Register the code lens provider
                this.disposable = vscode.languages.registerCodeLensProvider(
                    { language: 'python' },
                    this.codeLensProvider
                );
                
                this.context.subscriptions.push(this.disposable);
            }

            this.codeLensProvider.enable();
            
            // Save state
            this.context.globalState.update('doracodelens.codeLensEnabled', true);
            
            vscode.window.showInformationMessage('Code Lens enabled');
            
            this.errorHandler.logError(
                'Code lens enabled successfully',
                null,
                'CodeLensManager'
            );

        } catch (error) {
            this.errorHandler.logError(
                'Failed to enable code lens',
                error,
                'CodeLensManager'
            );
            vscode.window.showErrorMessage('Failed to enable Code Lens');
        }
    }

    /**
     * Disable code lens functionality
     */
    public disableCodeLens(): void {
        try {
            this.codeLensProvider.disable();
            
            if (this.disposable) {
                this.disposable.dispose();
                this.disposable = null;
            }
            
            // Save state
            this.context.globalState.update('doracodelens.codeLensEnabled', false);
            
            vscode.window.showInformationMessage('Code Lens disabled');
            
            this.errorHandler.logError(
                'Code lens disabled successfully',
                null,
                'CodeLensManager'
            );

        } catch (error) {
            this.errorHandler.logError(
                'Failed to disable code lens',
                error,
                'CodeLensManager'
            );
            vscode.window.showErrorMessage('Failed to disable Code Lens');
        }
    }

    /**
     * Toggle code lens functionality
     */
    public toggleCodeLens(): void {
        if (this.isEnabled()) {
            this.disableCodeLens();
        } else {
            this.enableCodeLens();
        }
    }

    /**
     * Check if code lens is enabled
     */
    public isEnabled(): boolean {
        return this.codeLensProvider.isCodeLensEnabled();
    }

    /**
     * Update analysis data for code lens
     */
    public updateFromAnalysisData(analysisData: any): void {
        this.codeLensProvider.updateAnalysisData(analysisData);
    }

    /**
     * Restore code lens state from saved preferences
     */
    public restoreState(): void {
        const enabled = this.context.globalState.get('doracodelens.codeLensEnabled', false);
        if (enabled) {
            this.enableCodeLens();
        }
    }

    /**
     * Get the code lens provider instance
     */
    public getProvider(): DoraCodeLensProvider {
        return this.codeLensProvider;
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        if (this.disposable) {
            this.disposable.dispose();
            this.disposable = null;
        }
        this.codeLensProvider.dispose();
    }
}