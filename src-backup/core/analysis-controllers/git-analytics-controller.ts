import * as vscode from 'vscode';
import { AnalysisController, EnhancedGraphData, AnalysisViewState } from '../../types/dedicated-analysis-types';
import { DataTransformationUtils } from '../data-transformation-utils';

/**
 * Controller for Git Analytics view with commit history and contributor analysis
 */
export class GitAnalyticsController implements AnalysisController {
    private analyticsFilters: any = {
        timeRange: 'all',
        contributors: 'all',
        fileTypes: 'all',
        branches: 'all'
    };
    private gitData: any = {};

    constructor(private outputChannel: vscode.OutputChannel) {}

    /**
     * Transform git analytics data to enhanced graph format
     */
    public async transformData(data: any): Promise<EnhancedGraphData> {
        try {
            this.outputChannel.appendLine('Transforming git analytics data...');
            
            // Store original git data
            this.gitData = data;
            
            // Create enhanced graph data structure
            let enhancedData = this.createGitAnalyticsGraphData(data);
            
            // Apply git-specific enhancements
            enhancedData = this.enhanceForGitAnalytics(enhancedData, data);
            
            // Update metadata
            enhancedData.metadata.analysisType = 'gitAnalytics';
            enhancedData.metadata.timestamp = new Date();
            
            this.outputChannel.appendLine(`Git analytics transformation complete: ${enhancedData.metadata.totalNodes} nodes, ${enhancedData.metadata.totalEdges} edges`);
            
            return enhancedData;
        } catch (error) {
            this.outputChannel.appendLine(`Failed to transform git analytics data: ${error}`);
            throw error;
        }
    }

    /**
     * Handle user interactions with the git analytics view
     */
    public async handleInteraction(interaction: any, state: AnalysisViewState): Promise<void> {
        try {
            switch (interaction.type) {
                case 'contributor-click':
                    await this.handleContributorClick(interaction, state);
                    break;
                case 'file-hotspot-click':
                    await this.handleFileHotspotClick(interaction, state);
                    break;
                case 'time-filter':
                    await this.handleTimeFilter(interaction, state);
                    break;
                case 'commit-timeline':
                    await this.handleCommitTimeline(interaction, state);
                    break;
                case 'branch-analysis':
                    await this.handleBranchAnalysis(interaction, state);
                    break;
                default:
                    this.outputChannel.appendLine(`Unknown interaction type: ${interaction.type}`);
            }
        } catch (error) {
            this.outputChannel.appendLine(`Failed to handle interaction: ${error}`);
            throw error;
        }
    }

    /**
     * Get current analytics filters
     */
    public getAnalyticsFilters(): any {
        return this.analyticsFilters;
    }

    /**
     * Set analytics filters (for state restoration)
     */
    public setAnalyticsFilters(filters: any): void {
        this.analyticsFilters = filters || {
            timeRange: 'all',
            contributors: 'all',
            fileTypes: 'all',
            branches: 'all'
        };
    }

    /**
     * Create enhanced graph data from git analytics
     */
    private createGitAnalyticsGraphData(data: any): EnhancedGraphData {
        const enhancedData: EnhancedGraphData = {
            modules: {
                root: this.createRootModule(),
                flatList: [],
                hierarchy: {},
                statistics: {
                    totalModules: 0,
                    maxDepth: 0,
                    averageFilesPerModule: 0,
                    complexityDistribution: { low: 0, medium: 0, high: 0 }
                }
            },
            files: {
                files: new Map(),
                byModule: new Map(),
                byComplexity: new Map(),
                statistics: {
                    totalFiles: 0,
                    averageComplexity: 0,
                    languageDistribution: {},
                    complexityDistribution: { low: 0, medium: 0, high: 0 }
                }
            },
            dependencies: {
                edges: [],
                adjacencyList: new Map(),
                reverseAdjacencyList: new Map(),
                statistics: {
                    totalDependencies: 0,
                    circularDependencies: 0,
                    averageDependenciesPerFile: 0,
                    maxDependencyDepth: 0
                }
            },
            metadata: {
                analysisType: 'gitAnalytics',
                timestamp: new Date(),
                projectPath: '',
                totalNodes: 0,
                totalEdges: 0,
                complexityDistribution: { low: 0, medium: 0, high: 0 },
                performanceMetrics: {
                    analysisTime: 0,
                    renderTime: 0,
                    memoryUsage: 0,
                    nodeCount: 0,
                    edgeCount: 0
                }
            }
        };

        // Create contributor nodes
        if (data.contributors || data.authorContributions) {
            this.createContributorNodes(enhancedData, data.contributors || data.authorContributions);
        }

        // Create file hotspot nodes
        if (data.fileChanges || data.fileHotspots) {
            this.createFileHotspotNodes(enhancedData, data.fileChanges || data.fileHotspots);
        }

        // Create commit timeline nodes
        if (data.commits || data.commitHistory) {
            this.createCommitTimelineNodes(enhancedData, data.commits || data.commitHistory);
        }

        // Create collaboration edges
        this.createCollaborationEdges(enhancedData, data);

        return enhancedData;
    }

    /**
     * Create root module for git analytics
     */
    private createRootModule(): any {
        return {
            id: 'git_root',
            name: 'Git Repository',
            path: '/',
            files: [],
            subModules: [],
            position: { x: 0, y: 0 },
            size: { width: 100, height: 60 },
            complexity: {
                totalFiles: 0,
                averageComplexity: 0,
                maxComplexity: 0,
                totalLinesOfCode: 0,
                level: 'low'
            },
            isExpanded: false,
            level: 0
        };
    }

    /**
     * Create contributor nodes
     */
    private createContributorNodes(enhancedData: EnhancedGraphData, contributors: any[]): void {
        for (const contributor of contributors) {
            const contributorId = `contributor_${contributor.name || contributor.author}`;
            const commits = contributor.commits || contributor.commitCount || 0;
            const linesChanged = (contributor.linesAdded || 0) + (contributor.linesRemoved || 0);
            
            const contributorNode = {
                id: contributorId,
                name: contributor.name || contributor.author,
                path: `contributors/${contributor.name || contributor.author}`,
                module: 'contributors',
                complexity: {
                    cyclomaticComplexity: Math.min(commits / 10, 10), // Normalize commits to complexity scale
                    cognitiveComplexity: Math.min(linesChanged / 1000, 10),
                    linesOfCode: linesChanged,
                    maintainabilityIndex: 100 - Math.min(commits / 5, 20),
                    level: this.getContributorComplexityLevel(commits),
                    color: this.getContributorColor(commits),
                    score: commits
                },
                position: { x: 0, y: 0 },
                size: Math.max(20, Math.min(commits / 2, 50)),
                language: 'contributor',
                isHighlighted: false,
                metadata: {
                    lastModified: new Date(contributor.lastCommit || Date.now()),
                    author: contributor.name || contributor.author,
                    functions: 0,
                    classes: 0,
                    imports: 0,
                    gitData: contributor
                }
            };
            
            enhancedData.files.files.set(contributorId, contributorNode);
        }
    }

    /**
     * Create file hotspot nodes
     */
    private createFileHotspotNodes(enhancedData: EnhancedGraphData, fileChanges: any[]): void {
        for (const fileChange of fileChanges) {
            const fileId = `hotspot_${fileChange.file || fileChange.path}`;
            const changes = fileChange.changes || fileChange.commits || 1;
            
            const hotspotNode = {
                id: fileId,
                name: this.getFileName(fileChange.file || fileChange.path),
                path: fileChange.file || fileChange.path,
                module: 'hotspots',
                complexity: {
                    cyclomaticComplexity: Math.min(changes, 10),
                    cognitiveComplexity: Math.min(changes, 10),
                    linesOfCode: fileChange.linesChanged || changes * 10,
                    maintainabilityIndex: 100 - Math.min(changes * 2, 50),
                    level: this.getHotspotComplexityLevel(changes),
                    color: this.getHotspotColor(changes),
                    score: changes
                },
                position: { x: 0, y: 0 },
                size: Math.max(15, Math.min(changes * 3, 40)),
                language: this.detectLanguageFromPath(fileChange.file || fileChange.path),
                isHighlighted: false,
                metadata: {
                    lastModified: new Date(fileChange.lastModified || Date.now()),
                    author: fileChange.lastAuthor || 'Unknown',
                    functions: 0,
                    classes: 0,
                    imports: 0,
                    gitData: fileChange
                }
            };
            
            enhancedData.files.files.set(fileId, hotspotNode);
        }
    }

    /**
     * Create commit timeline nodes
     */
    private createCommitTimelineNodes(enhancedData: EnhancedGraphData, commits: any[]): void {
        // Group commits by time periods (e.g., weeks or months)
        const timeGroups = this.groupCommitsByTime(commits);
        
        for (const [timeKey, timeCommits] of Object.entries(timeGroups)) {
            const timeId = `timeline_${timeKey}`;
            const commitCount = (timeCommits as any[]).length;
            
            const timelineNode = {
                id: timeId,
                name: `${timeKey} (${commitCount} commits)`,
                path: `timeline/${timeKey}`,
                module: 'timeline',
                complexity: {
                    cyclomaticComplexity: Math.min(commitCount / 5, 10),
                    cognitiveComplexity: Math.min(commitCount / 5, 10),
                    linesOfCode: commitCount * 20,
                    maintainabilityIndex: 100,
                    level: this.getTimelineComplexityLevel(commitCount),
                    color: this.getTimelineColor(commitCount),
                    score: commitCount
                },
                position: { x: 0, y: 0 },
                size: Math.max(20, Math.min(commitCount * 2, 45)),
                language: 'timeline',
                isHighlighted: false,
                metadata: {
                    lastModified: new Date(),
                    author: 'Timeline',
                    functions: 0,
                    classes: 0,
                    imports: 0,
                    gitData: { commits: timeCommits, period: timeKey }
                }
            };
            
            enhancedData.files.files.set(timeId, timelineNode);
        }
    }

    /**
     * Create collaboration edges between contributors and files
     */
    private createCollaborationEdges(enhancedData: EnhancedGraphData, data: any): void {
        // Create edges between contributors and files they modified
        if (data.fileChanges && data.contributors) {
            for (const fileChange of data.fileChanges) {
                const fileId = `hotspot_${fileChange.file || fileChange.path}`;
                
                // Find contributors who modified this file
                const fileContributors = data.contributors.filter((c: any) => 
                    fileChange.authors?.includes(c.name) || fileChange.authors?.includes(c.author)
                );
                
                for (const contributor of fileContributors) {
                    const contributorId = `contributor_${contributor.name || contributor.author}`;
                    const edgeId = `collab_${contributorId}_${fileId}`;
                    
                    const collaborationEdge = {
                        id: edgeId,
                        source: contributorId,
                        target: fileId,
                        type: 'composition' as const, // Use valid type
                        weight: contributor.commits || 1,
                        style: {
                            color: '#9C27B0',
                            width: Math.max(1, Math.min((contributor.commits || 1) / 5, 5)),
                            style: 'solid' as const,
                            arrow: 'triangle' as const,
                            opacity: 0.6
                        },
                        metadata: {
                            strength: contributor.commits || 1,
                            frequency: 1,
                            isCircular: false,
                            path: [contributorId, fileId]
                        }
                    };
                    
                    enhancedData.dependencies.edges.push(collaborationEdge);
                }
            }
        }
    }

    /**
     * Enhance data specifically for git analytics
     */
    private enhanceForGitAnalytics(enhancedData: EnhancedGraphData, originalData: any): EnhancedGraphData {
        // Add git-specific metadata
        (enhancedData.metadata as any).gitAnalytics = {
            repositoryInfo: originalData.repositoryInfo || {},
            analysisTimeRange: this.analyticsFilters.timeRange,
            totalCommits: originalData.commits?.length || 0,
            totalContributors: originalData.contributors?.length || 0,
            activeBranches: originalData.branches?.length || 0
        };

        // Calculate statistics
        this.calculateGitStatistics(enhancedData, originalData);

        return enhancedData;
    }

    /**
     * Calculate git-specific statistics
     */
    private calculateGitStatistics(enhancedData: EnhancedGraphData, data: any): void {
        // Update file statistics
        const files = Array.from(enhancedData.files.files.values());
        enhancedData.files.statistics.totalFiles = files.length;
        
        // Update metadata totals
        enhancedData.metadata.totalNodes = files.length;
        enhancedData.metadata.totalEdges = enhancedData.dependencies.edges.length;
    }

    /**
     * Group commits by time periods
     */
    private groupCommitsByTime(commits: any[]): { [key: string]: any[] } {
        const groups: { [key: string]: any[] } = {};
        
        for (const commit of commits) {
            const date = new Date(commit.date || commit.timestamp);
            const weekKey = this.getWeekKey(date);
            
            if (!groups[weekKey]) {
                groups[weekKey] = [];
            }
            groups[weekKey].push(commit);
        }
        
        return groups;
    }

    /**
     * Get week key for grouping commits
     */
    private getWeekKey(date: Date): string {
        const year = date.getFullYear();
        const week = this.getWeekNumber(date);
        return `${year}-W${week.toString().padStart(2, '0')}`;
    }

    /**
     * Get week number of the year
     */
    private getWeekNumber(date: Date): number {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }

    /**
     * Get file name from path
     */
    private getFileName(path: string): string {
        return path.split('/').pop() || path;
    }

    /**
     * Detect language from file path
     */
    private detectLanguageFromPath(path: string): string {
        const ext = path.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'py': return 'python';
            case 'js': return 'javascript';
            case 'ts': return 'typescript';
            case 'java': return 'java';
            case 'cpp': case 'cc': case 'cxx': return 'cpp';
            case 'c': return 'c';
            case 'cs': return 'csharp';
            case 'go': return 'go';
            case 'rs': return 'rust';
            default: return 'unknown';
        }
    }

    /**
     * Get contributor complexity level based on commit count
     */
    private getContributorComplexityLevel(commits: number): 'low' | 'medium' | 'high' {
        if (commits <= 10) return 'low';
        if (commits <= 50) return 'medium';
        return 'high';
    }

    /**
     * Get contributor color based on commit count
     */
    private getContributorColor(commits: number): string {
        if (commits <= 10) return '#4CAF50';
        if (commits <= 50) return '#FF9800';
        return '#F44336';
    }

    /**
     * Get hotspot complexity level based on change count
     */
    private getHotspotComplexityLevel(changes: number): 'low' | 'medium' | 'high' {
        if (changes <= 5) return 'low';
        if (changes <= 15) return 'medium';
        return 'high';
    }

    /**
     * Get hotspot color based on change count
     */
    private getHotspotColor(changes: number): string {
        if (changes <= 5) return '#2196F3';
        if (changes <= 15) return '#FF9800';
        return '#F44336';
    }

    /**
     * Get timeline complexity level based on commit count
     */
    private getTimelineComplexityLevel(commits: number): 'low' | 'medium' | 'high' {
        if (commits <= 5) return 'low';
        if (commits <= 20) return 'medium';
        return 'high';
    }

    /**
     * Get timeline color based on commit count
     */
    private getTimelineColor(commits: number): string {
        if (commits <= 5) return '#9C27B0';
        if (commits <= 20) return '#3F51B5';
        return '#E91E63';
    }

    /**
     * Handle contributor click interactions
     */
    private async handleContributorClick(interaction: any, state: AnalysisViewState): Promise<void> {
        const contributorData = interaction.data;
        this.outputChannel.appendLine(`Contributor clicked: ${contributorData.name}`);
        
        // Could show contributor details or filter by contributor
    }

    /**
     * Handle file hotspot click interactions
     */
    private async handleFileHotspotClick(interaction: any, state: AnalysisViewState): Promise<void> {
        const fileData = interaction.data;
        this.outputChannel.appendLine(`File hotspot clicked: ${fileData.path}`);
        
        // Try to open the file
        if (fileData.path && !fileData.path.startsWith('hotspot_')) {
            try {
                const uri = vscode.Uri.file(fileData.path);
                await vscode.window.showTextDocument(uri);
            } catch (error) {
                this.outputChannel.appendLine(`Failed to open file: ${fileData.path}`);
            }
        }
    }

    /**
     * Handle time filter interactions
     */
    private async handleTimeFilter(interaction: any, state: AnalysisViewState): Promise<void> {
        const timeRange = interaction.data.timeRange;
        this.analyticsFilters.timeRange = timeRange;
        this.outputChannel.appendLine(`Time filter applied: ${timeRange}`);
    }

    /**
     * Handle commit timeline interactions
     */
    private async handleCommitTimeline(interaction: any, state: AnalysisViewState): Promise<void> {
        const timelineData = interaction.data;
        this.outputChannel.appendLine(`Timeline period clicked: ${timelineData.period}`);
    }

    /**
     * Handle branch analysis interactions
     */
    private async handleBranchAnalysis(interaction: any, state: AnalysisViewState): Promise<void> {
        const branchData = interaction.data;
        this.outputChannel.appendLine(`Branch analysis requested: ${branchData.branch}`);
    }

    /**
     * Dispose resources
     */
    public dispose(): void {
        this.analyticsFilters = {
            timeRange: 'all',
            contributors: 'all',
            fileTypes: 'all',
            branches: 'all'
        };
        this.gitData = {};
    }
}