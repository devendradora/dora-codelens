import { 
  CategoryStructure, 
  EnhancedCategoryData, 
  SubcategoryData, 
  ProcessedTechnology, 
  TechnologyEntry 
} from '../types/tech-stack-types';
import { ErrorHandler } from '../core/error-handler';
import { TechnologyDeduplicator } from './technology-deduplicator';
import { SmartTechnologyClassifier } from './smart-technology-classifier';

/**
 * Subcategory Configuration
 */
const SUBCATEGORY_CONFIG = {
  backend: {
    order: ['languages', 'package-managers', 'frameworks', 'libraries'],
    displayNames: {
      'languages': 'Programming Languages',
      'package-managers': 'Package Managers',
      'frameworks': 'Web Frameworks',
      'libraries': 'Libraries & Tools'
    }
  },
  frontend: {
    order: ['languages', 'package-managers', 'frameworks', 'libraries'],
    displayNames: {
      'languages': 'Programming Languages',
      'package-managers': 'Package Managers', 
      'frameworks': 'Frontend Frameworks',
      'libraries': 'UI Libraries & Tools'
    }
  },
  databases: {
    order: ['sql-databases', 'nosql-databases', 'in-memory', 'tools'],
    displayNames: {
      'sql-databases': 'SQL Databases',
      'nosql-databases': 'NoSQL Databases',
      'in-memory': 'In-Memory Databases',
      'tools': 'Database Tools'
    }
  },
  devops: {
    order: ['containerization', 'orchestration', 'ci-cd', 'monitoring'],
    displayNames: {
      'containerization': 'Containerization',
      'orchestration': 'Orchestration',
      'ci-cd': 'CI/CD Tools',
      'monitoring': 'Monitoring & Logging'
    }
  },
  others: {
    order: ['testing', 'documentation', 'miscellaneous'],
    displayNames: {
      'testing': 'Testing Tools',
      'documentation': 'Documentation',
      'miscellaneous': 'Other Technologies'
    }
  }
};

/**
 * Enhanced Category Manager
 * Ensures all 5 categories are always visible and organizes technologies by subcategories
 */
export class EnhancedCategoryManager {
  private errorHandler: ErrorHandler;
  private deduplicator: TechnologyDeduplicator;
  private classifier: SmartTechnologyClassifier;

  constructor(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;
    this.deduplicator = new TechnologyDeduplicator(errorHandler);
    this.classifier = new SmartTechnologyClassifier(errorHandler);
  }

  /**
   * Generate enhanced category structure with all categories always visible
   */
  public generateCategoryStructure(technologies: any[], analysisData: any): CategoryStructure {
    try {
      // Main processing logic
      return this.processCategories(technologies, analysisData);
    } catch (error) {
      this.errorHandler.logError(
        'Category structure generation failed',
        error,
        'EnhancedCategoryManager'
      );
      
      // Fallback to basic categorization
      return this.generateFallbackStructure(technologies);
    }
  }

  /**
   * Ensure all categories are always visible
   */
  public ensureAllCategoriesVisible(): Map<string, EnhancedCategoryData> {
    const categories = new Map<string, EnhancedCategoryData>();
    
    const categoryDefinitions = [
      { name: 'backend', displayName: 'Backend', icon: '🔧' },
      { name: 'frontend', displayName: 'Frontend', icon: '🎨' },
      { name: 'databases', displayName: 'Databases', icon: '🗄️' },
      { name: 'devops', displayName: 'DevOps', icon: '⚙️' },
      { name: 'others', displayName: 'Others', icon: '📦' }
    ];

    for (const categoryDef of categoryDefinitions) {
      categories.set(categoryDef.name, {
        name: categoryDef.name,
        displayName: categoryDef.displayName,
        icon: categoryDef.icon,
        subcategories: this.initializeSubcategories(categoryDef.name),
        totalCount: 0,
        visible: true // Always visible
      });
    }

    return categories;
  }

  /**
   * Organize technologies by type within categories
   */
  public organizeTechnologiesByType(
    technologies: ProcessedTechnology[], 
    categories: Map<string, EnhancedCategoryData>
  ): void {
    try {
      for (const tech of technologies) {
        const category = categories.get(tech.category);
        if (category) {
          const subcategory = category.subcategories.get(tech.subcategory);
          if (subcategory) {
            subcategory.technologies.push(tech);
            subcategory.visible = true;
            category.totalCount++;
          } else {
            // Fallback to miscellaneous if subcategory not found
            const miscSubcategory = category.subcategories.get('miscellaneous');
            if (miscSubcategory) {
              miscSubcategory.technologies.push(tech);
              miscSubcategory.visible = true;
              category.totalCount++;
            }
          }
        }
      }
    } catch (error) {
      this.errorHandler.logError(
        'Error organizing technologies by type',
        error,
        'EnhancedCategoryManager'
      );
    }
  }

  /**
   * Process categories with deduplication and classification
   */
  private processCategories(technologies: any[], analysisData: any): CategoryStructure {
    // Initialize all categories as visible
    const categories = this.ensureAllCategoriesVisible();
    
    // Convert input technologies to TechnologyEntry format
    const technologyEntries = this.convertToTechnologyEntries(technologies, analysisData);
    
    // Deduplicate technologies
    const deduplicationResult = this.deduplicator.deduplicateWithinCategory(technologyEntries);
    
    // Classify and process technologies
    const processedTechnologies = this.classifyTechnologies(deduplicationResult.uniqueTechnologies);
    
    // Organize into subcategories
    this.organizeTechnologiesByType(processedTechnologies, categories);
    
    return {
      categories,
      totalTechnologies: processedTechnologies.length,
      duplicatesRemoved: deduplicationResult.duplicatesRemoved
    };
  }

  /**
   * Convert various technology formats to TechnologyEntry
   */
  private convertToTechnologyEntries(technologies: any[], analysisData: any): TechnologyEntry[] {
    const entries: TechnologyEntry[] = [];
    
    try {
      // Process direct technology list
      if (technologies && Array.isArray(technologies)) {
        for (const tech of technologies) {
          const entry = this.convertSingleTechnology(tech, 'direct');
          if (entry) {
            entries.push(entry);
          }
        }
      }
      
      // Extract from analysis data
      if (analysisData) {
        entries.push(...this.extractFromAnalysisData(analysisData));
      }
      
    } catch (error) {
      this.errorHandler.logError(
        'Error converting technologies to entries',
        error,
        'EnhancedCategoryManager'
      );
    }
    
    return entries;
  }

  /**
   * Convert a single technology to TechnologyEntry
   */
  private convertSingleTechnology(tech: any, source: string): TechnologyEntry | null {
    try {
      if (typeof tech === 'string') {
        return { name: tech, source };
      } else if (typeof tech === 'object' && tech.name) {
        return {
          name: tech.name,
          version: tech.version,
          source,
          metadata: tech
        };
      } else if (typeof tech === 'object') {
        // Handle key-value pairs
        const entries = Object.entries(tech);
        if (entries.length > 0) {
          const [techName, techVersion] = entries[0];
          return {
            name: techName,
            version: typeof techVersion === 'string' ? techVersion : undefined,
            source,
            metadata: tech
          };
        }
      }
    } catch (error) {
      this.errorHandler.logError(
        'Error converting single technology',
        error,
        'EnhancedCategoryManager'
      );
    }
    
    return null;
  }

  /**
   * Extract technologies from analysis data
   */
  private extractFromAnalysisData(analysisData: any): TechnologyEntry[] {
    const entries: TechnologyEntry[] = [];
    
    try {
      const techStack = analysisData?.tech_stack;
      if (!techStack) {
        return entries;
      }

      // Extract from various tech_stack sections
      const sections = [
        { key: 'libraries', source: 'libraries' },
        { key: 'frameworks', source: 'frameworks' },
        { key: 'languages', source: 'languages' },
        { key: 'build_tools', source: 'build_tools' },
        { key: 'dev_tools', source: 'dev_tools' },
        { key: 'config_files', source: 'config_files' }
      ];

      for (const section of sections) {
        if (techStack[section.key]) {
          if (Array.isArray(techStack[section.key])) {
            for (const item of techStack[section.key]) {
              const entry = this.convertSingleTechnology(item, section.source);
              if (entry) {
                entries.push(entry);
              }
            }
          } else if (typeof techStack[section.key] === 'object') {
            // Handle object format (name: version)
            for (const [name, version] of Object.entries(techStack[section.key])) {
              entries.push({
                name,
                version: typeof version === 'string' ? version : undefined,
                source: section.source
              });
            }
          }
        }
      }

      // Handle package manager
      if (techStack.package_manager) {
        entries.push({
          name: techStack.package_manager,
          source: 'package_manager'
        });
      }

      // Handle package managers array (legacy)
      if (techStack.package_managers && Array.isArray(techStack.package_managers)) {
        for (const pm of techStack.package_managers) {
          entries.push({
            name: pm,
            source: 'package_managers'
          });
        }
      }

    } catch (error) {
      this.errorHandler.logError(
        'Error extracting from analysis data',
        error,
        'EnhancedCategoryManager'
      );
    }
    
    return entries;
  }

  /**
   * Classify technologies using smart classifier
   */
  private classifyTechnologies(entries: TechnologyEntry[]): ProcessedTechnology[] {
    const processed: ProcessedTechnology[] = [];
    
    try {
      for (const entry of entries) {
        const metadata = this.classifier.classifyTechnology(entry.name);
        
        processed.push({
          name: entry.name,
          version: entry.version,
          category: metadata.mainCategory,
          subcategory: metadata.subcategory,
          confidence: 0.8, // Default confidence for classified technologies
          source: entry.source,
          metadata: entry.metadata
        });
      }
    } catch (error) {
      this.errorHandler.logError(
        'Error classifying technologies',
        error,
        'EnhancedCategoryManager'
      );
    }
    
    return processed;
  }

  /**
   * Initialize subcategories for a category
   */
  private initializeSubcategories(categoryName: string): Map<string, SubcategoryData> {
    const subcategories = new Map<string, SubcategoryData>();
    
    const config = SUBCATEGORY_CONFIG[categoryName as keyof typeof SUBCATEGORY_CONFIG];
    if (config) {
      for (const subcategoryName of config.order) {
        subcategories.set(subcategoryName, {
          name: subcategoryName,
          displayName: config.displayNames[subcategoryName as keyof typeof config.displayNames] || subcategoryName,
          icon: this.getSubcategoryIcon(subcategoryName),
          technologies: [],
          visible: false
        });
      }
    }
    
    // Always add miscellaneous as fallback
    if (!subcategories.has('miscellaneous')) {
      subcategories.set('miscellaneous', {
        name: 'miscellaneous',
        displayName: 'Other',
        icon: '📦',
        technologies: [],
        visible: false
      });
    }
    
    return subcategories;
  }

  /**
   * Get icon for subcategory
   */
  private getSubcategoryIcon(subcategoryName: string): string {
    const icons: { [key: string]: string } = {
      'languages': '💬',
      'package-managers': '📦',
      'frameworks': '🏗️',
      'libraries': '📚',
      'tools': '🔧',
      'sql-databases': '🗃️',
      'nosql-databases': '📄',
      'in-memory': '💾',
      'containerization': '🐳',
      'orchestration': '☸️',
      'ci-cd': '🔄',
      'monitoring': '📊',
      'testing': '🧪',
      'documentation': '📝',
      'miscellaneous': '📦'
    };
    
    return icons[subcategoryName] || '📦';
  }

  /**
   * Generate fallback structure when main processing fails
   */
  private generateFallbackStructure(technologies: any[]): CategoryStructure {
    try {
      const categories = this.ensureAllCategoriesVisible();
      
      // Add basic technologies if available
      if (technologies && Array.isArray(technologies)) {
        for (const tech of technologies.slice(0, 10)) { // Limit to prevent errors
          const entry = this.convertSingleTechnology(tech, 'fallback');
          if (entry) {
            const metadata = this.classifier.classifyTechnology(entry.name);
            const category = categories.get(metadata.mainCategory);
            if (category) {
              const subcategory = category.subcategories.get(metadata.subcategory) || 
                                 category.subcategories.get('miscellaneous');
              if (subcategory) {
                subcategory.technologies.push({
                  name: entry.name,
                  version: entry.version,
                  category: metadata.mainCategory,
                  subcategory: metadata.subcategory,
                  confidence: 0.5
                });
                subcategory.visible = true;
                category.totalCount++;
              }
            }
          }
        }
      }
      
      return {
        categories,
        totalTechnologies: 0,
        duplicatesRemoved: 0
      };
    } catch (error) {
      this.errorHandler.logError(
        'Error generating fallback structure',
        error,
        'EnhancedCategoryManager'
      );
      
      // Return minimal structure
      return {
        categories: this.ensureAllCategoriesVisible(),
        totalTechnologies: 0,
        duplicatesRemoved: 0
      };
    }
  }
}