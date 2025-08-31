import * as vscode from 'vscode';
import { ErrorHandler } from './error-handler';
import { PreferenceStorageService, GuidancePreferences } from '../services/preference-storage-service';
import { AnalysisManager } from './analysis-manager';
import { GuidanceErrorHandler } from './guidance-error-handler';

/**
 * Interface for guidance prompts
 */
export interface GuidancePrompt {
    id: string;
    type: 'welcome' | 'analysis-required' | 'progress' | 'error' | 'preference';
    title: string;
    description: string;
    icon: string;
    command: string;
    arguments?: any[];
    tooltip: string;
    priority: number;
}

/**
 * Interface for guidance state
 */
export interface GuidanceState {
    isFirstTimeUser: boolean;
    hasAnalysisData: boolean;
    isAnalysisRunning: boolean;
    analysisProgress: number;
    lastError: string | null;
}

/**
 * Interface for analysis state information
 */
export interface AnalysisStateInfo {
    documentPath: string;
    hasData: boolean;
    lastAnalyzed: number | null;
    isStale: boolean;
    analysisType: 'current-file' | 'full-project' | null;
    error: string | null;
    lastError: string | null;
    isAnalysisRunning: boolean;
    analysisProgress: number;
}

/**
 * Code Lens Guidance Manager
 * Orchestrates the guidance experience and manages user preferences
 */
export class CodeLensGuidanceManager {
    private static instance: CodeLensGuidanceManager;
    private errorHandler: ErrorHandler;
    private preferenceService: PreferenceStorageService;
    private analysisManager: AnalysisManager;
    private context: vscode.ExtensionContext;
    private guidanceErrorHandler: GuidanceErrorHandler;
    private analysisStateCache: Map<string, AnalysisStateInfo> = new Map();
    private progressListeners: Map<string, (progress: number) => void> = new Map();
    private disposables: vscode.Disposable[] = [];

    private constructor(
        errorHandler: ErrorHandler, 
        context: vscode.ExtensionContext,
        preferenceService: PreferenceStorageService,
        analysisManager: AnalysisManager
    ) {
        this.errorHandler = errorHandler;
        this.context = context;
        this.preferenceService = preferenceService;
        this.analysisManager = analysisManager;
        this.guidanceErrorHandler = GuidanceErrorHandler.getInstance(errorHandler);
        
        this.setupEventListeners();
    }

    public static getInstance(
        errorHandler?: ErrorHandler,
        context?: vscode.ExtensionContext,
        preferenceService?: PreferenceStorageService,
        analysisManager?: AnalysisManager
    ): CodeLensGuidanceManager {
        if (!CodeLensGuidanceManager.instance) {
            if (!errorHandler || !context || !preferenceService || !analysisManager) {
                throw new Error('All parameters required for first initialization');
            }
            CodeLensGuidanceManager.instance = new CodeLensGuidanceManager(
                errorHandler, context, preferenceService, analysisManager
            );
        }
        return CodeLensGuidanceManager.instance;
    }

    /**
     * Setup event listeners for analysis state changes
     */
    private setupEventListeners(): void {
        // Listen for document changes to update analysis state
        const documentChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
            const filePath = event.document.uri.fsPath;
            if (event.document.languageId === 'python') {
                this.markAnalysisAsStale(filePath);
            }
        });

        // Listen for active editor changes
        const editorChangeListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor && editor.document.languageId === 'python') {
                this.updateAnalysisStateForDocument(editor.document);
            }
        });

        this.disposables.push(documentChangeListener, editorChangeListener);
    }

    /**
     * Detect if guidance is needed for current document
     */
    public needsGuidance(document: vscode.TextDocument): boolean {
        try {
            if (document.languageId !== 'python') {
                return false;
            }

            const preferences = this.preferenceService.getPreferences();
            if (!preferences.guidanceEnabled) {
                return false;
            }

            const analysisState = this.getAnalysisStateForDocument(document);
            
            // Show guidance if:
            // 1. No analysis data exists
            // 2. Analysis is running (show progress)
            // 3. There's an error (show error guidance)
            // 4. First-time user (show welcome)
            return !analysisState.hasData || 
                   analysisState.isAnalysisRunning || 
                   analysisState.lastError !== null ||
                   this.preferenceService.isFirstTimeUser();

        } catch (error) {
            this.errorHandler.logError(
                'Error checking if guidance is needed',
                error,
                'CodeLensGuidanceManager'
            );
            return false;
        }
    }

    /**
     * Get guidance prompts for current state
     */
    public getGuidancePrompts(document: vscode.TextDocument): GuidancePrompt[] {
        try {
            const prompts: GuidancePrompt[] = [];
            const analysisState = this.getAnalysisStateForDocument(document);
            const preferences = this.preferenceService.getPreferences();
            const isFirstTime = this.preferenceService.isFirstTimeUser();

            // Welcome message for first-time users
            if (isFirstTime && preferences.showWelcomeMessage) {
                prompts.push(this.createWelcomePrompt());
            }

            // Error guidance
            if (analysisState.lastError) {
                prompts.push(this.createErrorPrompt(analysisState.lastError));
            }

            // Progress indicator
            if (analysisState.isAnalysisRunning) {
                prompts.push(this.createProgressPrompt(analysisState.analysisProgress));
            }

            // Analysis required prompts
            if (!analysisState.hasData && !analysisState.isAnalysisRunning) {
                if (preferences.preferredAnalysisType === 'ask-each-time' || isFirstTime) {
                    prompts.push(...this.createAnalysisChoicePrompts());
                } else {
                    prompts.push(this.createPreferredAnalysisPrompt(preferences.preferredAnalysisType));
                }
            }

            // Stale data prompt
            if (analysisState.hasData && analysisState.isStale && !analysisState.isAnalysisRunning) {
                prompts.push(this.createRefreshPrompt());
            }

            // Sort by priority
            prompts.sort((a, b) => a.priority - b.priority);

            // Record guidance shown
            if (prompts.length > 0) {
                this.preferenceService.recordGuidanceShown();
            }

            return prompts;

        } catch (error) {
            this.errorHandler.logError(
                'Error generating guidance prompts',
                error,
                'CodeLensGuidanceManager'
            );
            return [];
        }
    }

    /**
     * Handle user selection of analysis type
     */
    public async handleAnalysisChoice(choice: 'current-file' | 'full-project'): Promise<void> {
        try {
            this.errorHandler.logError(
                'Handling analysis choice',
                { choice },
                'CodeLensGuidanceManager'
            );

            // Update last choice in preferences
            await this.preferenceService.updatePreferences({
                lastAnalysisChoice: choice
            });

            // Record analytics
            await this.preferenceService.recordAnalysisTriggered();

            // Start analysis based on choice
            if (choice === 'current-file') {
                await this.analysisManager.analyzeCurrentFile();
            } else {
                await this.analysisManager.analyzeFullProject();
            }

            this.errorHandler.logError(
                'Analysis choice handled successfully',
                { choice },
                'CodeLensGuidanceManager'
            );

        } catch (error) {
            this.errorHandler.logError(
                'Error handling analysis choice',
                error,
                'CodeLensGuidanceManager'
            );
            throw error;
        }
    }

    /**
     * Update user preferences
     */
    public async updatePreferences(preferences: Partial<GuidancePreferences>): Promise<void> {
        try {
            await this.preferenceService.updatePreferences(preferences);
            
            this.errorHandler.logError(
                'Preferences updated successfully',
                preferences,
                'CodeLensGuidanceManager'
            );

        } catch (error) {
            this.errorHandler.logError(
                'Error updating preferences',
                error,
                'CodeLensGuidanceManager'
            );
            throw error;
        }
    }

    /**
     * Get current preferences for workspace
     */
    public getPreferences(): GuidancePreferences {
        return this.preferenceService.getPreferences();
    }

    /**
     * Get analysis state for document
     */
    private getAnalysisStateForDocument(document: vscode.TextDocument): AnalysisStateInfo {
        const filePath = document.uri.fsPath;
        let state = this.analysisStateCache.get(filePath);

        if (!state) {
            state = {
                documentPath: filePath,
                hasData: false,
                lastAnalyzed: null,
                isStale: false,
                analysisType: null,
                error: null,
                lastError: null,
                isAnalysisRunning: false,
                analysisProgress: 0
            };

            // Check if we have cached analysis results
            const cachedResults = this.analysisManager.getCachedResults(filePath);
            if (cachedResults) {
                state.hasData = true;
                state.lastAnalyzed = cachedResults.timestamp;
                state.isStale = this.isAnalysisStale(cachedResults.timestamp);
            }

            this.analysisStateCache.set(filePath, state);
        }

        return state;
    }

    /**
     * Update analysis state for document
     */
    private updateAnalysisStateForDocument(document: vscode.TextDocument): void {
        const filePath = document.uri.fsPath;
        const cachedResults = this.analysisManager.getCachedResults(filePath);
        
        const state: AnalysisStateInfo = {
            documentPath: filePath,
            hasData: !!cachedResults,
            lastAnalyzed: cachedResults?.timestamp || null,
            isStale: cachedResults ? this.isAnalysisStale(cachedResults.timestamp) : false,
            analysisType: null, // Could be enhanced to track analysis type
            error: null,
            lastError: null,
            isAnalysisRunning: false,
            analysisProgress: 0
        };

        this.analysisStateCache.set(filePath, state);
    }

    /**
     * Mark analysis as stale for a file
     */
    private markAnalysisAsStale(filePath: string): void {
        const state = this.analysisStateCache.get(filePath);
        if (state) {
            state.isStale = true;
            this.analysisStateCache.set(filePath, state);
        }
    }

    /**
     * Check if analysis is stale
     */
    private isAnalysisStale(timestamp: number): boolean {
        const age = Date.now() - timestamp;
        return age > 300000; // 5 minutes
    }

    /**
     * Create welcome prompt for first-time users
     */
    private createWelcomePrompt(): GuidancePrompt {
        return {
            id: 'welcome',
            type: 'welcome',
            title: '$(star) Welcome to DoraCodeLens!',
            description: 'Run analysis to see complexity metrics and suggestions',
            icon: '$(star)',
            command: 'doracodelens.guidance.showWelcome',
            tooltip: 'Welcome to DoraCodeLens - Click to learn more',
            priority: 1
        };
    }

    /**
     * Create error prompt
     */
    private createErrorPrompt(error: string): GuidancePrompt {
        return {
            id: 'error',
            type: 'error',
            title: '$(error) Analysis Error',
            description: 'Click to retry analysis',
            icon: '$(error)',
            command: 'doracodelens.guidance.retryAnalysis',
            arguments: [error],
            tooltip: `Analysis failed: ${error}. Click to retry.`,
            priority: 2
        };
    }

    /**
     * Create progress prompt
     */
    private createProgressPrompt(progress: number): GuidancePrompt {
        const progressText = progress > 0 ? ` (${Math.round(progress)}%)` : '';
        return {
            id: 'progress',
            type: 'progress',
            title: `$(loading~spin) Analysis Running${progressText}`,
            description: 'Please wait...',
            icon: '$(loading~spin)',
            command: 'doracodelens.guidance.showProgress',
            tooltip: 'Analysis is currently running',
            priority: 3
        };
    }

    /**
     * Create analysis choice prompts
     */
    private createAnalysisChoicePrompts(): GuidancePrompt[] {
        return [
            {
                id: 'analyze-current-file',
                type: 'analysis-required',
                title: '$(file-code) Analyze Current File',
                description: 'Quick analysis for this file only',
                icon: '$(file-code)',
                command: 'doracodelens.guidance.analyzeCurrentFile',
                tooltip: 'Run analysis for the current file to see complexity metrics',
                priority: 4
            },
            {
                id: 'analyze-full-project',
                type: 'analysis-required',
                title: '$(project) Analyze Full Project',
                description: 'Comprehensive analysis for entire project',
                icon: '$(project)',
                command: 'doracodelens.guidance.analyzeFullProject',
                tooltip: 'Run analysis for the entire project to get comprehensive insights',
                priority: 5
            }
        ];
    }

    /**
     * Create preferred analysis prompt
     */
    private createPreferredAnalysisPrompt(analysisType: 'current-file' | 'full-project'): GuidancePrompt {
        const isCurrentFile = analysisType === 'current-file';
        return {
            id: 'preferred-analysis',
            type: 'analysis-required',
            title: isCurrentFile ? '$(file-code) Analyze Current File' : '$(project) Analyze Full Project',
            description: isCurrentFile ? 'Run your preferred analysis type' : 'Run your preferred analysis type',
            icon: isCurrentFile ? '$(file-code)' : '$(project)',
            command: isCurrentFile ? 'doracodelens.guidance.analyzeCurrentFile' : 'doracodelens.guidance.analyzeFullProject',
            tooltip: `Run ${analysisType} analysis (your preferred choice)`,
            priority: 4
        };
    }

    /**
     * Create refresh prompt for stale data
     */
    private createRefreshPrompt(): GuidancePrompt {
        return {
            id: 'refresh',
            type: 'analysis-required',
            title: '$(refresh) Refresh Analysis',
            description: 'Analysis data is outdated',
            icon: '$(refresh)',
            command: 'doracodelens.guidance.refreshAnalysis',
            tooltip: 'Analysis data is outdated. Click to refresh.',
            priority: 6
        };
    }

    /**
     * Set analysis progress for a document
     */
    public setAnalysisProgress(documentPath: string, progress: number): void {
        const state = this.analysisStateCache.get(documentPath);
        if (state) {
            state.analysisProgress = progress;
            state.isAnalysisRunning = progress < 100;
            this.analysisStateCache.set(documentPath, state);

            // Notify progress listeners
            const listener = this.progressListeners.get(documentPath);
            if (listener) {
                listener(progress);
            }
        }
    }

    /**
     * Set analysis error for a document
     */
    public setAnalysisError(documentPath: string, error: string): void {
        const state = this.analysisStateCache.get(documentPath);
        if (state) {
            state.error = error;
            state.isAnalysisRunning = false;
            this.analysisStateCache.set(documentPath, state);
        }
    }

    /**
     * Clear analysis error for a document
     */
    public clearAnalysisError(documentPath: string): void {
        const state = this.analysisStateCache.get(documentPath);
        if (state) {
            state.error = null;
            this.analysisStateCache.set(documentPath, state);
        }
    }

    /**
     * Mark analysis as completed for a document
     */
    public markAnalysisCompleted(documentPath: string): void {
        const state = this.analysisStateCache.get(documentPath);
        if (state) {
            state.hasData = true;
            state.lastAnalyzed = Date.now();
            state.isStale = false;
            state.isAnalysisRunning = false;
            state.error = null;
            this.analysisStateCache.set(documentPath, state);
        }
    }

    /**
     * Get smart preference suggestion based on project structure
     */
    public async getSmartPreferenceSuggestion(): Promise<'current-file' | 'full-project'> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return 'current-file';
            }

            // Count Python files in workspace (limit search to avoid performance issues)
            const pythonFiles = await vscode.workspace.findFiles('**/*.py', '**/node_modules/**', 20);
            
            // Check for common Python project indicators
            const projectIndicators = await Promise.all([
                vscode.workspace.findFiles('requirements.txt', null, 1),
                vscode.workspace.findFiles('pyproject.toml', null, 1),
                vscode.workspace.findFiles('setup.py', null, 1),
                vscode.workspace.findFiles('Pipfile', null, 1),
                vscode.workspace.findFiles('manage.py', null, 1), // Django
                vscode.workspace.findFiles('**/models.py', null, 1), // Django/Flask
                vscode.workspace.findFiles('**/views.py', null, 1), // Django/Flask
            ]);

            const hasProjectIndicators = projectIndicators.some(files => files.length > 0);
            
            // Suggest full project if:
            // - More than 5 Python files, OR
            // - Has project indicators (requirements.txt, etc.), OR
            // - Has common web framework files
            if (pythonFiles.length > 5 || hasProjectIndicators) {
                this.errorHandler.logError(
                    'Smart suggestion: full-project',
                    { 
                        pythonFileCount: pythonFiles.length, 
                        hasProjectIndicators,
                        indicators: projectIndicators.map((files, index) => ({ 
                            type: ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile', 'manage.py', 'models.py', 'views.py'][index],
                            found: files.length > 0 
                        }))
                    },
                    'CodeLensGuidanceManager'
                );
                return 'full-project';
            } else {
                this.errorHandler.logError(
                    'Smart suggestion: current-file',
                    { pythonFileCount: pythonFiles.length, hasProjectIndicators },
                    'CodeLensGuidanceManager'
                );
                return 'current-file';
            }

        } catch (error) {
            this.errorHandler.logError(
                'Error getting smart preference suggestion',
                error,
                'CodeLensGuidanceManager'
            );
            return 'current-file';
        }
    }

    /**
     * Clear cache for a document
     */
    public clearCacheForDocument(documentPath: string): void {
        this.analysisStateCache.delete(documentPath);
        this.progressListeners.delete(documentPath);
    }

    /**
     * Clear all cache
     */
    public clearAllCache(): void {
        this.analysisStateCache.clear();
        this.progressListeners.clear();
    }

    /**
     * Suggest optimal preferences for first-time users
     */
    public async suggestOptimalPreferences(): Promise<void> {
        try {
            if (!this.preferenceService.isFirstTimeUser()) {
                return;
            }

            const smartSuggestion = await this.getSmartPreferenceSuggestion();
            
            const message = `Welcome to DoraCodeLens! Based on your project structure, we recommend setting your preferred analysis type to "${smartSuggestion === 'full-project' ? 'Full Project' : 'Current File'}". Would you like to apply this setting?`;
            
            const action = await vscode.window.showInformationMessage(
                message,
                'Apply Recommendation',
                'Ask Each Time',
                'Don\'t Ask Again'
            );

            if (action === 'Apply Recommendation') {
                await this.updatePreferences({
                    preferredAnalysisType: smartSuggestion,
                    showWelcomeMessage: true
                });
                vscode.window.showInformationMessage(`Preference set to: ${smartSuggestion === 'full-project' ? 'Full Project' : 'Current File'}`);
            } else if (action === 'Ask Each Time') {
                await this.updatePreferences({
                    preferredAnalysisType: 'ask-each-time',
                    showWelcomeMessage: true
                });
            } else if (action === 'Don\'t Ask Again') {
                await this.updatePreferences({
                    preferredAnalysisType: 'ask-each-time',
                    showWelcomeMessage: false
                });
            }

            this.errorHandler.logError(
                'Optimal preferences suggested to first-time user',
                { smartSuggestion, userChoice: action },
                'CodeLensGuidanceManager'
            );

        } catch (error) {
            this.errorHandler.logError(
                'Error suggesting optimal preferences',
                error,
                'CodeLensGuidanceManager'
            );
        }
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        this.disposables.forEach(disposable => disposable.dispose());
        this.disposables = [];
        this.clearAllCache();
        
        this.errorHandler.logError(
            'CodeLensGuidanceManager disposed',
            null,
            'CodeLensGuidanceManager'
        );
    }
}