import { TechnologyEntry, DeduplicationResult } from '../types/tech-stack-types';
import { ErrorHandler } from '../core/error-handler';

/**
 * Technology Deduplicator
 * Removes duplicate technologies within categories and merges information
 */
export class TechnologyDeduplicator {
  private errorHandler: ErrorHandler;

  constructor(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;
  }

  /**
   * Remove duplicates within a category and merge information
   */
  public deduplicateWithinCategory(technologies: TechnologyEntry[]): DeduplicationResult {
    try {
      if (!technologies || technologies.length === 0) {
        return { uniqueTechnologies: [], duplicatesRemoved: 0 };
      }

      const normalizedMap = new Map<string, TechnologyEntry[]>();
      
      // Group by normalized name
      for (const tech of technologies) {
        const normalizedName = this.normalizeNames(tech.name);
        if (!normalizedMap.has(normalizedName)) {
          normalizedMap.set(normalizedName, []);
        }
        normalizedMap.get(normalizedName)!.push(tech);
      }
      
      // Merge duplicates
      const uniqueTechnologies: TechnologyEntry[] = [];
      let duplicatesRemoved = 0;
      
      for (const [normalizedName, entries] of normalizedMap) {
        if (entries.length > 1) {
          duplicatesRemoved += entries.length - 1;
          uniqueTechnologies.push(this.mergeTechnologyEntries(entries));
        } else {
          uniqueTechnologies.push(entries[0]);
        }
      }
      
      return { uniqueTechnologies, duplicatesRemoved };
    } catch (error) {
      this.errorHandler.logError(
        'Error deduplicating technologies',
        error,
        'TechnologyDeduplicator'
      );
      return { uniqueTechnologies: technologies, duplicatesRemoved: 0 };
    }
  }

  /**
   * Merge multiple technology entries into one, preserving best information
   */
  public mergeTechnologyEntries(entries: TechnologyEntry[]): TechnologyEntry {
    try {
      if (entries.length === 0) {
        throw new Error('Cannot merge empty entries array');
      }
      
      if (entries.length === 1) {
        return entries[0];
      }

      // Find the entry with the most complete information
      return entries.reduce((best, current) => {
        return this.preserveBestInformation([best, current]);
      });
    } catch (error) {
      this.errorHandler.logError(
        'Error merging technology entries',
        error,
        'TechnologyDeduplicator'
      );
      return entries[0] || { name: 'Unknown', source: 'error' };
    }
  }

  /**
   * Preserve the best information from multiple entries
   */
  public preserveBestInformation(entries: TechnologyEntry[]): TechnologyEntry {
    try {
      if (entries.length === 0) {
        throw new Error('Cannot preserve information from empty entries');
      }
      
      if (entries.length === 1) {
        return entries[0];
      }

      // Priority: version info > metadata > longer name > first entry
      let best = entries[0];
      
      for (let i = 1; i < entries.length; i++) {
        const current = entries[i];
        
        // Prefer entry with version information
        if (current.version && !best.version) {
          best = current;
          continue;
        }
        
        // Prefer entry with metadata
        if (current.metadata && !best.metadata) {
          best = current;
          continue;
        }
        
        // Prefer entry with longer, more descriptive name
        if (current.name.length > best.name.length) {
          best = current;
          continue;
        }
        
        // Prefer entry with more reliable source
        if (this.getSourcePriority(current.source) > this.getSourcePriority(best.source)) {
          best = current;
        }
      }
      
      return best;
    } catch (error) {
      this.errorHandler.logError(
        'Error preserving best information',
        error,
        'TechnologyDeduplicator'
      );
      return entries[0] || { name: 'Unknown', source: 'error' };
    }
  }

  /**
   * Normalize technology names for comparison
   */
  public normalizeNames(name: string): string {
    try {
      if (!name || typeof name !== 'string') {
        return '';
      }

      return name.toLowerCase()
        .trim()
        .replace(/[-_\s]/g, '') // Remove separators
        .replace(/\.js$/, '') // Remove .js extension
        .replace(/\.py$/, '') // Remove .py extension
        .replace(/\.json$/, '') // Remove .json extension
        .replace(/\.yml$/, '') // Remove .yml extension
        .replace(/\.yaml$/, '') // Remove .yaml extension
        .replace(/\.toml$/, '') // Remove .toml extension
        .replace(/\.txt$/, '') // Remove .txt extension
        .replace(/^@/, '') // Remove npm scope prefix
        .replace(/\d+$/, ''); // Remove trailing version numbers
    } catch (error) {
      this.errorHandler.logError(
        'Error normalizing technology name',
        error,
        'TechnologyDeduplicator'
      );
      return name || '';
    }
  }

  /**
   * Get source priority for determining best entry
   */
  private getSourcePriority(source: string): number {
    const priorities: { [key: string]: number } = {
      'package.json': 10,
      'requirements.txt': 9,
      'pyproject.toml': 9,
      'Pipfile': 8,
      'poetry.lock': 8,
      'package-lock.json': 7,
      'yarn.lock': 7,
      'composer.json': 6,
      'Gemfile': 6,
      'analysis': 5,
      'detection': 4,
      'inference': 3,
      'default': 1
    };
    
    return priorities[source] || 2;
  }
}