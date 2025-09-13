import { ProjectMetadata } from '../types/tech-stack-types';
import { ErrorHandler } from '../core/error-handler';

/**
 * ProjectMetadataExtractor
 * Extracts project metadata from various configuration files
 */
export class ProjectMetadataExtractor {
  private errorHandler: ErrorHandler;

  constructor(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;
  }

  /**
   * Extract project metadata from analysis data
   */
  public extractProjectMetadata(analysisData: any): ProjectMetadata {
    try {
      // Try different sources in order of preference
      const packageJsonData = this.extractFromPackageJson(analysisData);
      const pyprojectData = this.extractFromPyprojectToml(analysisData);
      const gitData = this.extractFromGitAnalysis(analysisData);

      // Merge data with package.json taking priority
      const metadata: ProjectMetadata = {
        name: packageJsonData.name || pyprojectData.name || gitData.name || 'Unknown Project',
        version: packageJsonData.version || pyprojectData.version || '1.0.0',
        status: this.determineProjectStatus(analysisData),
        maintainer: packageJsonData.maintainer || pyprojectData.maintainer || gitData.maintainer || 'Unknown',
        description: packageJsonData.description || pyprojectData.description,
        repository: packageJsonData.repository || pyprojectData.repository || gitData.repository
      };

      return metadata;
    } catch (error) {
      this.errorHandler.logError(
        'Failed to extract project metadata',
        error,
        'ProjectMetadataExtractor'
      );
      return this.getDefaultMetadata();
    }
  }

  /**
   * Extract metadata from package.json
   */
  private extractFromPackageJson(analysisData: any): Partial<ProjectMetadata> {
    const packageData = analysisData?.package_json || analysisData?.packageJson;
    if (!packageData) return {};

    return {
      name: packageData.name,
      version: packageData.version,
      description: packageData.description,
      maintainer: this.extractMaintainerFromPackageJson(packageData),
      repository: this.extractRepositoryFromPackageJson(packageData)
    };
  }

  /**
   * Extract metadata from pyproject.toml
   */
  private extractFromPyprojectToml(analysisData: any): Partial<ProjectMetadata> {
    const pyprojectData = analysisData?.pyproject_toml || analysisData?.pyprojectToml;
    if (!pyprojectData) return {};

    // Handle both Poetry and standard pyproject.toml formats
    const poetryData = pyprojectData.tool?.poetry;
    const projectData = pyprojectData.project;

    return {
      name: poetryData?.name || projectData?.name || 'Python Project',
      version: poetryData?.version || projectData?.version,
      description: poetryData?.description || projectData?.description,
      maintainer: this.extractMaintainerFromPyproject(poetryData, projectData),
      repository: this.extractRepositoryFromPyproject(poetryData, projectData)
    };
  }

  /**
   * Extract metadata from git analysis
   */
  private extractFromGitAnalysis(analysisData: any): Partial<ProjectMetadata> {
    const gitData = analysisData?.git_analysis || analysisData?.gitAnalysis;
    if (!gitData) return {};

    return {
      name: this.extractProjectNameFromGit(gitData),
      maintainer: this.extractMainContributorFromGit(gitData),
      repository: gitData.remote_url || gitData.remoteUrl
    };
  }

  /**
   * Determine project status based on various indicators
   */
  private determineProjectStatus(analysisData: any): 'Active' | 'Maintenance' | 'Development' | 'Unknown' {
    const gitData = analysisData?.git_analysis || analysisData?.gitAnalysis;
    
    if (!gitData) return 'Unknown';

    const recentCommits = gitData.recent_commits || gitData.recentCommits || 0;
    const lastCommitDate = gitData.last_commit_date || gitData.lastCommitDate;

    // Check if there are recent commits (within last 30 days)
    if (lastCommitDate) {
      const lastCommit = new Date(lastCommitDate);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (lastCommit > thirtyDaysAgo) {
        return recentCommits > 10 ? 'Active' : 'Development';
      }
    }

    // Check commit frequency
    if (recentCommits > 10) return 'Active';
    if (recentCommits > 0) return 'Maintenance';
    
    return 'Development';
  }

  /**
   * Extract maintainer from package.json
   */
  private extractMaintainerFromPackageJson(packageData: any): string {
    if (packageData.author) {
      if (typeof packageData.author === 'string') {
        return packageData.author;
      }
      if (packageData.author.name) {
        return packageData.author.name;
      }
    }

    if (packageData.maintainers && Array.isArray(packageData.maintainers) && packageData.maintainers.length > 0) {
      const maintainer = packageData.maintainers[0];
      return typeof maintainer === 'string' ? maintainer : maintainer.name || 'Unknown';
    }

    return 'Unknown';
  }

  /**
   * Extract repository from package.json
   */
  private extractRepositoryFromPackageJson(packageData: any): string | undefined {
    if (packageData.repository) {
      if (typeof packageData.repository === 'string') {
        return packageData.repository;
      }
      if (packageData.repository.url) {
        return packageData.repository.url;
      }
    }
    return packageData.homepage;
  }

  /**
   * Extract maintainer from pyproject.toml
   */
  private extractMaintainerFromPyproject(poetryData: any, projectData: any): string {
    // Try Poetry format first
    if (poetryData?.authors && Array.isArray(poetryData.authors) && poetryData.authors.length > 0) {
      const author = poetryData.authors[0];
      return typeof author === 'string' ? author : author.name || 'Unknown';
    }

    // Try standard project format
    if (projectData?.authors && Array.isArray(projectData.authors) && projectData.authors.length > 0) {
      const author = projectData.authors[0];
      return typeof author === 'string' ? author : author.name || 'Unknown';
    }

    return 'Unknown';
  }

  /**
   * Extract repository from pyproject.toml
   */
  private extractRepositoryFromPyproject(poetryData: any, projectData: any): string | undefined {
    // Try Poetry format
    if (poetryData?.repository) {
      return poetryData.repository;
    }

    // Try standard project format
    if (projectData?.urls?.repository) {
      return projectData.urls.repository;
    }

    if (projectData?.urls?.homepage) {
      return projectData.urls.homepage;
    }

    return undefined;
  }

  /**
   * Extract project name from git data
   */
  private extractProjectNameFromGit(gitData: any): string {
    const remoteUrl = gitData.remote_url || gitData.remoteUrl;
    if (remoteUrl) {
      // Extract project name from git URL
      const match = remoteUrl.match(/\/([^\/]+?)(?:\.git)?$/);
      if (match) {
        return match[1];
      }
    }
    return 'Git Project';
  }

  /**
   * Extract main contributor from git data
   */
  private extractMainContributorFromGit(gitData: any): string {
    const contributors = gitData.contributors || gitData.top_contributors;
    if (contributors && Array.isArray(contributors) && contributors.length > 0) {
      const topContributor = contributors[0];
      return topContributor.name || topContributor.author || 'Unknown';
    }
    return 'Unknown';
  }

  /**
   * Get default metadata when extraction fails
   */
  private getDefaultMetadata(): ProjectMetadata {
    return {
      name: 'Unknown Project',
      version: '1.0.0',
      status: 'Unknown',
      maintainer: 'Unknown',
      description: 'No description available'
    };
  }
}