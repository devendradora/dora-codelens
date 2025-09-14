/**
 * Git Analytics Data Validator and Mapper
 * Provides comprehensive validation, mapping, and fallback handling for git analytics data
 */

import { 
  GitAnalyticsData, 
  RepositoryInfo, 
  AuthorContribution, 
  CommitTimelineEntry, 
  ModuleStatistic,
  ValidationResult,
  DataMappingOptions
} from '../types/git-analytics-types';

export class GitAnalyticsDataValidator {
  private options: DataMappingOptions;

  constructor(options: Partial<DataMappingOptions> = {}) {
    this.options = {
      enableLegacySupport: true,
      strictValidation: false,
      provideFallbacks: true,
      ...options
    };
  }

  /**
   * Validate and map complete git analytics data
   */
  public validateAndMap(rawData: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic structure validation
      if (!rawData || typeof rawData !== 'object') {
        errors.push('Invalid data structure: expected object');
        return this.createFailedResult(errors, warnings);
      }

      // Map and validate repository info
      const repositoryInfo = this.validateRepositoryInfo(rawData);
      if (!repositoryInfo.isValid) {
        errors.push(...repositoryInfo.errors);
        warnings.push(...repositoryInfo.warnings);
      }

      // Map and validate author contributions
      const authorContributions = this.validateAuthorContributions(rawData);
      if (!authorContributions.isValid) {
        errors.push(...authorContributions.errors);
        warnings.push(...authorContributions.warnings);
      }

      // Map and validate commit timeline
      const commitTimeline = this.validateCommitTimeline(rawData);
      if (!commitTimeline.isValid) {
        errors.push(...commitTimeline.errors);
        warnings.push(...commitTimeline.warnings);
      }

      // Map and validate module statistics (optional)
      const moduleStatistics = this.validateModuleStatistics(rawData);
      if (!moduleStatistics.isValid) {
        warnings.push(...moduleStatistics.errors); // Module stats are optional, so errors become warnings
        warnings.push(...moduleStatistics.warnings);
      }

      // Create validated data structure
      const validatedData: GitAnalyticsData = {
        success: this.extractBoolean(rawData, ['success'], true),
        repository_info: repositoryInfo.data,
        author_contributions: authorContributions.data,
        commit_timeline: commitTimeline.data,
        module_statistics: moduleStatistics.data,
        total_commits: this.calculateTotalCommits(rawData, repositoryInfo.data, authorContributions.data),
        current_user_name: this.extractString(rawData, ['current_user_name'], undefined),
        current_user_email: this.extractString(rawData, ['current_user_email'], undefined),
        errors: this.extractStringArray(rawData, ['errors'], []),
        metadata: this.extractObject(rawData, ['metadata'], {})
      };

      // Add legacy field support if enabled
      if (this.options.enableLegacySupport) {
        this.addLegacyFields(validatedData);
      }

      const isValid = errors.length === 0 || !this.options.strictValidation;

      return {
        isValid,
        errors,
        warnings,
        data: validatedData
      };

    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
      return this.createFailedResult(errors, warnings);
    }
  }

  /**
   * Validate repository information
   */
  private validateRepositoryInfo(rawData: any): { isValid: boolean; errors: string[]; warnings: string[]; data: RepositoryInfo } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const repoData = this.extractObject(rawData, ['repository_info', 'repositoryInfo'], {});

      const repositoryInfo: RepositoryInfo = {
        name: this.extractString(repoData, ['name', 'repository_name'], 'Unknown Repository'),
        branch: this.extractString(repoData, ['branch'], 'main'),
        total_commits: this.extractNumber(repoData, ['total_commits', 'totalCommits'], 0),
        contributors: this.extractNumber(repoData, ['contributors'], 0),
        date_range: {
          start: this.extractDateString(repoData, ['date_range.start', 'first_commit_date'], new Date().toISOString()),
          end: this.extractDateString(repoData, ['date_range.end', 'last_commit_date'], new Date().toISOString())
        },
        total_files: this.extractNumber(repoData, ['total_files'], undefined),
        repository_size: this.extractNumber(repoData, ['repository_size'], undefined),
        active_branches: this.extractNumber(repoData, ['active_branches'], undefined),
        first_commit_date: this.extractDateString(repoData, ['date_range.start', 'first_commit_date'], undefined),
        last_commit_date: this.extractDateString(repoData, ['date_range.end', 'last_commit_date'], undefined),
        repository_name: this.extractString(repoData, ['name', 'repository_name'], undefined)
      };

      // Validation checks
      if (repositoryInfo.total_commits < 0) {
        warnings.push('Total commits count is negative, setting to 0');
        repositoryInfo.total_commits = 0;
      }

      if (repositoryInfo.contributors < 0) {
        warnings.push('Contributors count is negative, setting to 0');
        repositoryInfo.contributors = 0;
      }

      // Validate date range
      if (repositoryInfo.date_range.start && repositoryInfo.date_range.end) {
        const startDate = new Date(repositoryInfo.date_range.start);
        const endDate = new Date(repositoryInfo.date_range.end);
        
        if (startDate > endDate) {
          warnings.push('Start date is after end date, swapping dates');
          repositoryInfo.date_range = {
            start: endDate.toISOString(),
            end: startDate.toISOString()
          };
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        data: repositoryInfo
      };

    } catch (error) {
      errors.push(`Repository info validation failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        isValid: false,
        errors,
        warnings,
        data: this.getDefaultRepositoryInfo()
      };
    }
  }

  /**
   * Validate author contributions
   */
  private validateAuthorContributions(rawData: any): { isValid: boolean; errors: string[]; warnings: string[]; data: AuthorContribution[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const contributionsData = this.extractArray(rawData, ['author_contributions', 'authorContributions'], []);
      const validatedContributions: AuthorContribution[] = [];

      for (let i = 0; i < contributionsData.length; i++) {
        const contrib = contributionsData[i];
        
        if (!contrib || typeof contrib !== 'object') {
          warnings.push(`Skipping invalid author contribution at index ${i}`);
          continue;
        }

        const authorContribution: AuthorContribution = {
          author_name: this.extractString(contrib, ['author_name', 'authorName'], `Unknown Author ${i + 1}`),
          author_email: this.extractString(contrib, ['author_email', 'authorEmail'], ''),
          total_commits: this.extractNumber(contrib, ['total_commits', 'totalCommits'], 0),
          lines_added: this.extractNumber(contrib, ['lines_added', 'linesAdded'], 0),
          lines_removed: this.extractNumber(contrib, ['lines_removed', 'linesRemoved'], 0),
          files_changed: this.extractNumber(contrib, ['files_changed', 'filesChanged'], 0),
          modules_touched: this.extractStringArray(contrib, ['modules_touched'], []),
          first_commit: this.extractDateString(contrib, ['first_commit', 'firstCommitDate'], new Date().toISOString()),
          last_commit: this.extractDateString(contrib, ['last_commit', 'lastCommitDate'], new Date().toISOString()),
          contribution_percentage: this.extractNumber(contrib, ['contribution_percentage'], 0),
          commit_frequency: this.extractNumber(contrib, ['commit_frequency'], undefined),
          average_commit_size: this.extractNumber(contrib, ['average_commit_size'], undefined)
        };

        // Validation checks
        if (authorContribution.total_commits < 0) {
          warnings.push(`Negative commit count for ${authorContribution.author_name}, setting to 0`);
          authorContribution.total_commits = 0;
        }

        if (authorContribution.lines_added < 0) {
          warnings.push(`Negative lines added for ${authorContribution.author_name}, setting to 0`);
          authorContribution.lines_added = 0;
        }

        if (authorContribution.lines_removed < 0) {
          warnings.push(`Negative lines removed for ${authorContribution.author_name}, setting to 0`);
          authorContribution.lines_removed = 0;
        }

        if (authorContribution.contribution_percentage < 0 || authorContribution.contribution_percentage > 100) {
          warnings.push(`Invalid contribution percentage for ${authorContribution.author_name}, recalculating`);
          authorContribution.contribution_percentage = 0; // Will be recalculated later
        }

        validatedContributions.push(authorContribution);
      }

      // Sort by total commits (descending)
      validatedContributions.sort((a, b) => b.total_commits - a.total_commits);

      // Recalculate contribution percentages
      this.recalculateContributionPercentages(validatedContributions);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        data: validatedContributions
      };

    } catch (error) {
      errors.push(`Author contributions validation failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        isValid: false,
        errors,
        warnings,
        data: []
      };
    }
  }

  /**
   * Validate commit timeline
   */
  private validateCommitTimeline(rawData: any): { isValid: boolean; errors: string[]; warnings: string[]; data: CommitTimelineEntry[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const timelineData = this.extractArray(rawData, ['commit_timeline', 'commitTimeline'], []);
      const validatedTimeline: CommitTimelineEntry[] = [];

      for (let i = 0; i < timelineData.length; i++) {
        const entry = timelineData[i];
        
        if (!entry || typeof entry !== 'object') {
          warnings.push(`Skipping invalid timeline entry at index ${i}`);
          continue;
        }

        const timelineEntry: CommitTimelineEntry = {
          date: this.extractDateString(entry, ['date'], new Date().toISOString()),
          commit_count: this.extractNumber(entry, ['commit_count', 'commits'], 0),
          lines_added: this.extractNumber(entry, ['lines_added'], 0),
          lines_removed: this.extractNumber(entry, ['lines_removed'], 0),
          authors: this.extractStringArray(entry, ['authors'], []),
          net_changes: this.extractNumber(entry, ['net_changes'], undefined),
          files_changed: this.extractNumber(entry, ['files_changed'], undefined)
        };

        // Validation checks
        if (timelineEntry.commit_count < 0) {
          warnings.push(`Negative commit count in timeline entry for ${timelineEntry.date}, setting to 0`);
          timelineEntry.commit_count = 0;
        }

        if (timelineEntry.lines_added < 0) {
          warnings.push(`Negative lines added in timeline entry for ${timelineEntry.date}, setting to 0`);
          timelineEntry.lines_added = 0;
        }

        if (timelineEntry.lines_removed < 0) {
          warnings.push(`Negative lines removed in timeline entry for ${timelineEntry.date}, setting to 0`);
          timelineEntry.lines_removed = 0;
        }

        // Calculate net changes if not provided
        if (timelineEntry.net_changes === undefined) {
          timelineEntry.net_changes = timelineEntry.lines_added - timelineEntry.lines_removed;
        }

        validatedTimeline.push(timelineEntry);
      }

      // Sort by date
      validatedTimeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        data: validatedTimeline
      };

    } catch (error) {
      errors.push(`Commit timeline validation failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        isValid: false,
        errors,
        warnings,
        data: []
      };
    }
  }

  /**
   * Validate module statistics (optional)
   */
  private validateModuleStatistics(rawData: any): { isValid: boolean; errors: string[]; warnings: string[]; data: ModuleStatistic[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const moduleData = this.extractArray(rawData, ['module_statistics', 'moduleStatistics'], []);
      const validatedModules: ModuleStatistic[] = [];

      for (let i = 0; i < moduleData.length; i++) {
        const module = moduleData[i];
        
        if (!module || typeof module !== 'object') {
          warnings.push(`Skipping invalid module statistic at index ${i}`);
          continue;
        }

        const moduleStatistic: ModuleStatistic = {
          module_path: this.extractString(module, ['module_path', 'modulePath'], `module_${i}`),
          total_commits: this.extractNumber(module, ['total_commits', 'totalCommits'], 0),
          unique_authors: this.extractNumber(module, ['unique_authors', 'uniqueAuthors'], 0),
          total_changes: this.extractNumber(module, ['total_changes', 'totalChanges'], undefined),
          last_modified: this.extractDateString(module, ['last_modified', 'lastModified'], undefined)
        };

        // Validation checks
        if (moduleStatistic.total_commits < 0) {
          warnings.push(`Negative commit count for module ${moduleStatistic.module_path}, setting to 0`);
          moduleStatistic.total_commits = 0;
        }

        if (moduleStatistic.unique_authors < 0) {
          warnings.push(`Negative author count for module ${moduleStatistic.module_path}, setting to 0`);
          moduleStatistic.unique_authors = 0;
        }

        validatedModules.push(moduleStatistic);
      }

      // Sort by total commits (descending)
      validatedModules.sort((a, b) => b.total_commits - a.total_commits);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        data: validatedModules
      };

    } catch (error) {
      errors.push(`Module statistics validation failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        isValid: false,
        errors,
        warnings,
        data: []
      };
    }
  }

  /**
   * Extract string value with fallback
   */
  private extractString(obj: any, paths: string[], fallback?: string): string {
    for (const path of paths) {
      const value = this.getNestedValue(obj, path);
      if (typeof value === 'string' && value.trim() !== '') {
        return value.trim();
      }
    }
    return fallback || '';
  }

  /**
   * Extract number value with fallback
   */
  private extractNumber(obj: any, paths: string[], fallback: number): number;
  private extractNumber(obj: any, paths: string[], fallback?: number): number | undefined;
  private extractNumber(obj: any, paths: string[], fallback?: number): number | undefined {
    for (const path of paths) {
      const value = this.getNestedValue(obj, path);
      if (typeof value === 'number' && !isNaN(value)) {
        return value;
      }
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    }
    return fallback;
  }

  /**
   * Extract boolean value with fallback
   */
  private extractBoolean(obj: any, paths: string[], fallback: boolean): boolean {
    for (const path of paths) {
      const value = this.getNestedValue(obj, path);
      if (typeof value === 'boolean') {
        return value;
      }
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
      }
    }
    return fallback;
  }

  /**
   * Extract array value with fallback
   */
  private extractArray(obj: any, paths: string[], fallback: any[]): any[] {
    for (const path of paths) {
      const value = this.getNestedValue(obj, path);
      if (Array.isArray(value)) {
        return value;
      }
    }
    return fallback;
  }

  /**
   * Extract string array value with fallback
   */
  private extractStringArray(obj: any, paths: string[], fallback: string[]): string[] {
    const array = this.extractArray(obj, paths, fallback);
    return array.filter(item => typeof item === 'string').map(item => String(item));
  }

  /**
   * Extract object value with fallback
   */
  private extractObject(obj: any, paths: string[], fallback: any): any {
    for (const path of paths) {
      const value = this.getNestedValue(obj, path);
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value;
      }
    }
    return fallback;
  }

  /**
   * Extract date string with validation
   */
  private extractDateString(obj: any, paths: string[], fallback?: string): string {
    for (const path of paths) {
      const value = this.getNestedValue(obj, path);
      if (typeof value === 'string' && this.isValidDateString(value)) {
        return value;
      }
    }
    return fallback || new Date().toISOString();
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Validate date string format
   */
  private isValidDateString(dateStr: string): boolean {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }

  /**
   * Calculate total commits from various sources
   */
  private calculateTotalCommits(rawData: any, repoInfo: RepositoryInfo, authorContributions: AuthorContribution[]): number {
    // Try to get from raw data first
    const rawTotal = this.extractNumber(rawData, ['total_commits', 'totalCommits'], undefined);
    if (rawTotal !== undefined && rawTotal >= 0) {
      return rawTotal;
    }

    // Try to get from repository info
    if (repoInfo.total_commits > 0) {
      return repoInfo.total_commits;
    }

    // Calculate from author contributions
    const contributionTotal = authorContributions.reduce((sum, contrib) => sum + contrib.total_commits, 0);
    if (contributionTotal > 0) {
      return contributionTotal;
    }

    return 0;
  }

  /**
   * Recalculate contribution percentages
   */
  private recalculateContributionPercentages(contributions: AuthorContribution[]): void {
    const totalCommits = contributions.reduce((sum, contrib) => sum + contrib.total_commits, 0);
    
    if (totalCommits > 0) {
      contributions.forEach(contrib => {
        contrib.contribution_percentage = (contrib.total_commits / totalCommits) * 100;
      });
    }
  }

  /**
   * Add legacy field support for backward compatibility
   */
  private addLegacyFields(data: GitAnalyticsData): void {
    // Add legacy repository info fields
    data.repositoryInfo = data.repository_info;

    // Add legacy author contribution fields
    data.authorContributions = data.author_contributions.map(contrib => ({
      ...contrib,
      authorName: contrib.author_name,
      authorEmail: contrib.author_email,
      totalCommits: contrib.total_commits,
      linesAdded: contrib.lines_added,
      linesRemoved: contrib.lines_removed,
      filesChanged: contrib.files_changed,
      firstCommitDate: contrib.first_commit,
      lastCommitDate: contrib.last_commit
    }));

    // Add legacy timeline fields
    data.commitTimeline = data.commit_timeline.map(entry => ({
      ...entry,
      commits: entry.commit_count
    }));

    // Add legacy module statistics fields
    if (data.module_statistics) {
      data.moduleStatistics = data.module_statistics.map(module => ({
        ...module,
        modulePath: module.module_path,
        totalCommits: module.total_commits,
        uniqueAuthors: module.unique_authors,
        totalChanges: module.total_changes,
        lastModified: module.last_modified
      }));
    }
  }

  /**
   * Create failed validation result
   */
  private createFailedResult(errors: string[], warnings: string[]): ValidationResult {
    return {
      isValid: false,
      errors,
      warnings,
      data: {
        success: false,
        repository_info: this.getDefaultRepositoryInfo(),
        author_contributions: [],
        commit_timeline: [],
        module_statistics: [],
        total_commits: 0,
        errors: errors,
        metadata: {}
      }
    };
  }

  /**
   * Get default repository info for fallback
   */
  private getDefaultRepositoryInfo(): RepositoryInfo {
    const now = new Date().toISOString();
    return {
      name: 'Unknown Repository',
      branch: 'main',
      total_commits: 0,
      contributors: 0,
      date_range: {
        start: now,
        end: now
      },
      total_files: 0,
      repository_size: 0,
      active_branches: 1,
      first_commit_date: now,
      last_commit_date: now,
      repository_name: 'Unknown Repository'
    };
  }
}