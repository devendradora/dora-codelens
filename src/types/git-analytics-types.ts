/**
 * Git Analytics Type Definitions
 * Comprehensive type definitions for git analytics data with validation support
 */

export interface RepositoryInfo {
  name: string;
  branch: string;
  total_commits: number;
  contributors: number;
  date_range: {
    start: string;
    end: string;
  };
  total_files?: number;
  repository_size?: number;
  active_branches?: number;
  first_commit_date?: string;
  last_commit_date?: string;
  repository_name?: string;
}

export interface AuthorContribution {
  author_name: string;
  author_email: string;
  total_commits: number;
  lines_added: number;
  lines_removed: number;
  files_changed?: number;
  modules_touched: string[];
  first_commit: string;
  last_commit: string;
  contribution_percentage: number;
  commit_frequency?: number;
  average_commit_size?: number;
  // Legacy field names for backward compatibility
  authorName?: string;
  authorEmail?: string;
  totalCommits?: number;
  linesAdded?: number;
  linesRemoved?: number;
  filesChanged?: number;
  firstCommitDate?: string;
  lastCommitDate?: string;
}

export interface CommitTimelineEntry {
  date: string;
  commit_count: number;
  lines_added: number;
  lines_removed: number;
  authors: string[];
  net_changes?: number;
  files_changed?: number;
  // Legacy field names
  commits?: number;
}

export interface ModuleStatistic {
  module_path: string;
  total_commits: number;
  unique_authors: number;
  total_changes?: number;
  last_modified?: string;
  // Legacy field names
  modulePath?: string;
  totalCommits?: number;
  uniqueAuthors?: number;
  totalChanges?: number;
  lastModified?: string;
}

export interface CommitInfo {
  hash: string;
  author_name: string;
  author_email: string;
  date: string;
  message: string;
  files_changed: string[];
  lines_added: number;
  lines_removed: number;
}

export interface GitAnalyticsData {
  success: boolean;
  repository_info: RepositoryInfo;
  author_contributions: AuthorContribution[];
  commit_timeline: CommitTimelineEntry[];
  module_statistics?: ModuleStatistic[];
  total_commits: number;
  current_user_name?: string;
  current_user_email?: string;
  errors: string[];
  metadata?: Record<string, any>;
  // Legacy field names for backward compatibility
  repositoryInfo?: RepositoryInfo;
  authorContributions?: AuthorContribution[];
  commitTimeline?: CommitTimelineEntry[];
  moduleStatistics?: ModuleStatistic[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data: GitAnalyticsData;
}

export interface DataMappingOptions {
  enableLegacySupport: boolean;
  strictValidation: boolean;
  provideFallbacks: boolean;
}