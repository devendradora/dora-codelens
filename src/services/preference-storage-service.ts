import * as vscode from 'vscode';
import { ErrorHandler } from '../core/error-handler';

/**
 * Interface for guidance preferences
 */
export interface GuidancePreferences {
    preferredAnalysisType: 'current-file' | 'full-project' | 'ask-each-time';
    showWelcomeMessage: boolean;
    autoRunAnalysisOnEnable: boolean;
    lastAnalysisChoice: 'current-file' | 'full-project' | null;
    guidanceEnabled: boolean;
}

/**
 * Interface for workspace guidance configuration
 */
export interface WorkspaceGuidanceConfig {
    version: string;
    preferences: GuidancePreferences;
    analytics: {
        guidanceShownCount: number;
        analysisTriggeredFromGuidance: number;
        preferenceChanges: number;
        lastUsed: number;
    };
}

/**
 * Service for managing workspace-specific guidance preferences
 */
export class PreferenceStorageService {
    private static instance: PreferenceStorageService;
    private errorHandler: ErrorHandler;
    private context: vscode.ExtensionContext;
    private readonly CONFIG_VERSION = '1.0.0';

    private constructor(errorHandler: ErrorHandler, context: vscode.ExtensionContext) {
        this.errorHandler = errorHandler;
        this.context = context;
    }

    public static getInstance(errorHandler?: ErrorHandler, context?: vscode.ExtensionContext): PreferenceStorageService {
        if (!PreferenceStorageService.instance) {
            if (!errorHandler || !context) {
                throw new Error('ErrorHandler and ExtensionContext required for first initialization');
            }
            PreferenceStorageService.instance = new PreferenceStorageService(errorHandler, context);
        }
        return PreferenceStorageService.instance;
    }

    /**
     * Get default preferences
     */
    private getDefaultPreferences(): GuidancePreferences {
        const config = vscode.workspace.getConfiguration('doracodelens.guidance');
        
        return {
            preferredAnalysisType: config.get('preferredAnalysisType', 'ask-each-time'),
            showWelcomeMessage: config.get('showWelcomeMessage', true),
            autoRunAnalysisOnEnable: config.get('autoRunAnalysisOnEnable', false),
            lastAnalysisChoice: null,
            guidanceEnabled: config.get('enabled', true)
        };
    }

    /**
     * Get workspace-specific preferences
     */
    public getPreferences(): GuidancePreferences {
        try {
            const workspaceConfig = this.getWorkspaceConfig();
            return workspaceConfig.preferences;
        } catch (error) {
            this.errorHandler.logError(
                'Failed to get preferences, using defaults',
                error,
                'PreferenceStorageService'
            );
            return this.getDefaultPreferences();
        }
    }

    /**
     * Update workspace-specific preferences
     */
    public async updatePreferences(preferences: Partial<GuidancePreferences>): Promise<void> {
        try {
            const currentConfig = this.getWorkspaceConfig();
            const updatedPreferences = { ...currentConfig.preferences, ...preferences };
            
            const updatedConfig: WorkspaceGuidanceConfig = {
                ...currentConfig,
                preferences: updatedPreferences,
                analytics: {
                    ...currentConfig.analytics,
                    preferenceChanges: currentConfig.analytics.preferenceChanges + 1,
                    lastUsed: Date.now()
                }
            };

            await this.saveWorkspaceConfig(updatedConfig);
            
            this.errorHandler.logError(
                'Preferences updated successfully',
                { updatedPreferences },
                'PreferenceStorageService'
            );
        } catch (error) {
            this.errorHandler.logError(
                'Failed to update preferences',
                error,
                'PreferenceStorageService'
            );
            throw error;
        }
    }

    /**
     * Record guidance shown event
     */
    public async recordGuidanceShown(): Promise<void> {
        try {
            const currentConfig = this.getWorkspaceConfig();
            const updatedConfig: WorkspaceGuidanceConfig = {
                ...currentConfig,
                analytics: {
                    ...currentConfig.analytics,
                    guidanceShownCount: currentConfig.analytics.guidanceShownCount + 1,
                    lastUsed: Date.now()
                }
            };

            await this.saveWorkspaceConfig(updatedConfig);
        } catch (error) {
            this.errorHandler.logError(
                'Failed to record guidance shown event',
                error,
                'PreferenceStorageService'
            );
            // Don't throw - this is analytics only
        }
    }

    /**
     * Record analysis triggered from guidance
     */
    public async recordAnalysisTriggered(): Promise<void> {
        try {
            const currentConfig = this.getWorkspaceConfig();
            const updatedConfig: WorkspaceGuidanceConfig = {
                ...currentConfig,
                analytics: {
                    ...currentConfig.analytics,
                    analysisTriggeredFromGuidance: currentConfig.analytics.analysisTriggeredFromGuidance + 1,
                    lastUsed: Date.now()
                }
            };

            await this.saveWorkspaceConfig(updatedConfig);
        } catch (error) {
            this.errorHandler.logError(
                'Failed to record analysis triggered event',
                error,
                'PreferenceStorageService'
            );
            // Don't throw - this is analytics only
        }
    }

    /**
     * Get workspace configuration
     */
    private getWorkspaceConfig(): WorkspaceGuidanceConfig {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const configKey = workspaceFolder ? 
            `doracodelens.workspace.guidance.${workspaceFolder.uri.fsPath}` : 
            'doracodelens.workspace.guidance.default';

        const storedConfig = this.context.workspaceState.get<WorkspaceGuidanceConfig>(configKey);
        
        if (storedConfig && storedConfig.version === this.CONFIG_VERSION) {
            return storedConfig;
        }

        // Return default configuration
        return {
            version: this.CONFIG_VERSION,
            preferences: this.getDefaultPreferences(),
            analytics: {
                guidanceShownCount: 0,
                analysisTriggeredFromGuidance: 0,
                preferenceChanges: 0,
                lastUsed: Date.now()
            }
        };
    }

    /**
     * Save workspace configuration
     */
    private async saveWorkspaceConfig(config: WorkspaceGuidanceConfig): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const configKey = workspaceFolder ? 
            `doracodelens.workspace.guidance.${workspaceFolder.uri.fsPath}` : 
            'doracodelens.workspace.guidance.default';

        await this.context.workspaceState.update(configKey, config);
    }

    /**
     * Check if user is first-time user
     */
    public isFirstTimeUser(): boolean {
        try {
            const config = this.getWorkspaceConfig();
            return config.analytics.guidanceShownCount === 0;
        } catch (error) {
            this.errorHandler.logError(
                'Failed to check first-time user status',
                error,
                'PreferenceStorageService'
            );
            return true; // Assume first-time user on error
        }
    }

    /**
     * Get smart preference suggestion based on project structure
     */
    public getSmartPreferenceSuggestion(): 'current-file' | 'full-project' {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return 'current-file';
            }

            // Simple heuristic: if workspace has multiple Python files, suggest full project
            // This is a basic implementation - could be enhanced with more sophisticated detection
            return 'current-file'; // Default fallback - this method should be async for proper implementation

        } catch (error) {
            this.errorHandler.logError(
                'Failed to get smart preference suggestion',
                error,
                'PreferenceStorageService'
            );
            return 'current-file';
        }
    }

    /**
     * Get analytics data
     */
    public getAnalytics(): WorkspaceGuidanceConfig['analytics'] {
        try {
            const config = this.getWorkspaceConfig();
            return config.analytics;
        } catch (error) {
            this.errorHandler.logError(
                'Failed to get analytics data',
                error,
                'PreferenceStorageService'
            );
            return {
                guidanceShownCount: 0,
                analysisTriggeredFromGuidance: 0,
                preferenceChanges: 0,
                lastUsed: 0
            };
        }
    }

    /**
     * Reset preferences to defaults
     */
    public async resetPreferences(): Promise<void> {
        try {
            const defaultConfig: WorkspaceGuidanceConfig = {
                version: this.CONFIG_VERSION,
                preferences: this.getDefaultPreferences(),
                analytics: {
                    guidanceShownCount: 0,
                    analysisTriggeredFromGuidance: 0,
                    preferenceChanges: 0,
                    lastUsed: Date.now()
                }
            };

            await this.saveWorkspaceConfig(defaultConfig);
            
            this.errorHandler.logError(
                'Preferences reset to defaults',
                null,
                'PreferenceStorageService'
            );
        } catch (error) {
            this.errorHandler.logError(
                'Failed to reset preferences',
                error,
                'PreferenceStorageService'
            );
            throw error;
        }
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        // No resources to dispose currently
        this.errorHandler.logError(
            'PreferenceStorageService disposed',
            null,
            'PreferenceStorageService'
        );
    }
}