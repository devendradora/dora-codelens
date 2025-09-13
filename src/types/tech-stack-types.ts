/**
 * Technology categorization types for tech stack analysis
 */

export interface ProcessedTechnology {
  name: string;
  version?: string;
  category: 'backend' | 'frontend' | 'databases' | 'devops' | 'others';
  subcategory: 'languages' | 'package-managers' | 'frameworks' | 'libraries' | 'tools' | 'sql-databases' | 'nosql-databases' | 'in-memory' | 'containerization' | 'orchestration' | 'ci-cd' | 'monitoring' | 'testing' | 'documentation' | 'miscellaneous';
  confidence: number;
  source?: string;
  metadata?: any;
}

export interface TechnologyEntry {
  name: string;
  version?: string;
  source: string;
  metadata?: any;
}

export interface DeduplicationResult {
  uniqueTechnologies: TechnologyEntry[];
  duplicatesRemoved: number;
}

export interface TechnologyMetadata {
  mainCategory: 'backend' | 'frontend' | 'databases' | 'devops' | 'others';
  subcategory: 'languages' | 'package-managers' | 'frameworks' | 'libraries' | 'tools' | 'sql-databases' | 'nosql-databases' | 'in-memory' | 'containerization' | 'orchestration' | 'ci-cd' | 'monitoring' | 'testing' | 'documentation' | 'miscellaneous';
  icon: string;
  description?: string;
}

export interface SubcategoryData {
  name: string;
  displayName: string;
  icon: string;
  technologies: ProcessedTechnology[];
  visible: boolean;
}

export interface EnhancedCategoryData {
  name: string;
  displayName: string;
  icon: string;
  subcategories: Map<string, SubcategoryData>;
  totalCount: number;
  visible: boolean;
}

export interface CategoryStructure {
  categories: Map<string, EnhancedCategoryData>;
  totalTechnologies: number;
  duplicatesRemoved: number;
}

export interface TechnologyCategory {
  name: string;
  displayName: string;
  icon: string;
  description: string;
  technologies: ProcessedTechnology[];
  count: number;
  visible: boolean;
}

export interface CategoryData {
  backend: TechnologyCategory;
  frontend: TechnologyCategory;
  databases: TechnologyCategory;
  devops: TechnologyCategory;
  others: TechnologyCategory;
}

export interface ClassificationResult {
  category: string;
  confidence: number;
  method: 'exact' | 'keyword' | 'default' | 'python-library';
}

export interface CategoryRenderOptions {
  showEmptyCategories: boolean;
  gridColumns: number;
  responsive: boolean;
}

// Modern Tech Stack Dashboard interfaces
export interface ProjectMetadata {
  name: string;
  version: string;
  status: 'Active' | 'Maintenance' | 'Development' | 'Unknown';
  maintainer: string;
  description?: string;
  repository?: string;
}

export interface ProjectOverviewData {
  metadata: ProjectMetadata;
  stats: {
    totalTechnologies: number;
    categoriesCount: number;
    lastUpdated?: string;
  };
}