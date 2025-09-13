import { ErrorHandler } from '../core/error-handler';
import { ModernTechStackDashboard } from './modern-tech-stack-dashboard';

/**
 * Interfaces for Python-provided categorized data
 */
export interface CategorizedTechStackData {
  categorized_tech_stack: {
    categories: Record<string, CategoryData>;
    total_technologies: number;
    processing_metadata: ProcessingMetadata;
    layout_config: LayoutConfig;
  };
}

export interface CategoryData {
  metadata: CategoryMetadata;
  subcategories: Record<string, SubcategoryData>;
  total_count: number;
  visible: boolean;
  layout_hints: LayoutHints;
}

export interface CategoryMetadata {
  name: string;
  display_name: string;
  icon: string;
  description: string;
  color: string;
}

export interface SubcategoryData {
  name: string;
  display_name: string;
  icon: string;
  technologies: TechnologyEntry[];
  visible: boolean;
  order?: number;
}

export interface TechnologyEntry {
  name: string;
  version?: string;
  source: string;
  confidence: number;
  metadata?: {
    icon?: string;
    description?: string;
    official_site?: string;
    [key: string]: any;
  };
}

export interface LayoutHints {
  full_width: boolean;
  subcategory_layout: 'grid' | 'list' | 'cards';
  responsive_breakpoints?: Record<string, number>;
  empty_state_message?: string;
}

export interface ProcessingMetadata {
  processing_time_ms?: number;
  rules_applied?: number;
  confidence_threshold?: number;
  detection_methods?: string[];
  error?: string;
  fallback_mode?: boolean;
}

export interface LayoutConfig {
  full_width_categories: boolean;
  show_empty_categories: boolean;
  responsive_design: boolean;
  category_order: string[];
}

/**
 * CategoryDisplayManager
 * Pure rendering system for Python-provided categorized data
 * Contains NO categorization logic - only rendering
 */
export class CategoryDisplayManager {
  private errorHandler: ErrorHandler;
  private modernDashboard: ModernTechStackDashboard;

  constructor(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;
    this.modernDashboard = new ModernTechStackDashboard(this, errorHandler);
  }

  /**
   * Main rendering method for Python-categorized data
   */
  public renderCategorizedData(data: CategorizedTechStackData): string {
    try {
      this.validateData(data);
      return this.generateCategoryHTML(data);
    } catch (error) {
      this.errorHandler.logError(
        'Failed to render categorized data',
        error,
        'CategoryDisplayManager'
      );
      return this.generateErrorHTML('Failed to display tech stack categories');
    }
  }

  /**
   * Validate the structure of Python-provided data
   */
  private validateData(data: CategorizedTechStackData): void {
    if (!data?.categorized_tech_stack) {
      throw new Error('Invalid categorized tech stack data structure');
    }

    const techStack = data.categorized_tech_stack;

    if (!techStack.categories) {
      throw new Error('Missing categories in tech stack data');
    }

    if (typeof techStack.categories !== 'object') {
      throw new Error('Categories must be an object');
    }

    // Validate layout_config
    if (!techStack.layout_config) {
      throw new Error('Missing layout_config in tech stack data');
    }

    if (!Array.isArray(techStack.layout_config.category_order)) {
      throw new Error('layout_config.category_order must be an array');
    }

    // Validate each category structure
    for (const [categoryName, category] of Object.entries(techStack.categories)) {
      this.validateCategory(categoryName, category);
    }

    // Check if we're in fallback mode
    if (techStack.processing_metadata?.fallback_mode) {
      this.errorHandler.logError(
        'Rendering in fallback mode due to Python categorization failure',
        null,
        'CategoryDisplayManager'
      );
    }

    // Validate total_technologies is a number
    if (typeof techStack.total_technologies !== 'number') {
      this.errorHandler.logError(
        'total_technologies should be a number, got: ' + typeof techStack.total_technologies,
        null,
        'CategoryDisplayManager'
      );
    }
  }

  /**
   * Validate individual category structure
   */
  private validateCategory(categoryName: string, category: CategoryData): void {
    if (!category.metadata) {
      throw new Error(`Category ${categoryName} missing metadata`);
    }

    if (!category.metadata.display_name || !category.metadata.icon) {
      throw new Error(`Category ${categoryName} metadata incomplete`);
    }

    if (!category.subcategories || typeof category.subcategories !== 'object') {
      throw new Error(`Category ${categoryName} missing or invalid subcategories`);
    }

    if (!category.layout_hints) {
      throw new Error(`Category ${categoryName} missing layout_hints`);
    }

    if (typeof category.total_count !== 'number') {
      throw new Error(`Category ${categoryName} total_count must be a number`);
    }

    // Validate subcategories
    for (const [subcategoryName, subcategory] of Object.entries(category.subcategories)) {
      this.validateSubcategory(categoryName, subcategoryName, subcategory);
    }
  }

  /**
   * Validate individual subcategory structure
   */
  private validateSubcategory(categoryName: string, subcategoryName: string, subcategory: SubcategoryData): void {
    if (!subcategory.display_name || !subcategory.icon) {
      throw new Error(`Subcategory ${categoryName}.${subcategoryName} metadata incomplete`);
    }

    if (!Array.isArray(subcategory.technologies)) {
      throw new Error(`Subcategory ${categoryName}.${subcategoryName} technologies must be an array`);
    }

    // Validate each technology
    for (const [index, technology] of subcategory.technologies.entries()) {
      this.validateTechnology(categoryName, subcategoryName, index, technology);
    }
  }

  /**
   * Validate individual technology structure
   */
  private validateTechnology(categoryName: string, subcategoryName: string, index: number, technology: TechnologyEntry): void {
    if (!technology.name || typeof technology.name !== 'string') {
      throw new Error(`Technology at ${categoryName}.${subcategoryName}[${index}] missing or invalid name`);
    }

    if (!technology.source || typeof technology.source !== 'string') {
      throw new Error(`Technology ${technology.name} missing or invalid source`);
    }

    if (typeof technology.confidence !== 'number' || technology.confidence < 0 || technology.confidence > 1) {
      throw new Error(`Technology ${technology.name} confidence must be a number between 0 and 1`);
    }

    // Version is optional but if present should be a string - convert if needed
    if (technology.version !== undefined && typeof technology.version !== 'string') {
      // Convert non-string versions to strings for compatibility
      technology.version = String(technology.version);
    }
  }

  /**
   * Generate complete HTML for all categories
   */
  private generateCategoryHTML(data: CategorizedTechStackData): string {
    const { categories, layout_config } = data.categorized_tech_stack;
    const categoryOrder = layout_config.category_order || Object.keys(categories);

    let html = '<div class="tech-stack-categories">';


    // Render categories in specified order
    for (const categoryName of categoryOrder) {
      const category = categories[categoryName];
      if (!category) {
        continue;
      }

      // Show category if visible or if configured to show empty categories
      if (category.visible || layout_config.show_empty_categories) {
        html += this.renderSingleCategory(categoryName, category);
      }
    }

    html += '</div>';
    return html;
  }

  /**
   * Render processing information
   */
  private renderProcessingInfo(metadata: ProcessingMetadata): string {
    if (metadata.fallback_mode || metadata.error) {
      return `
        <div class="processing-info warning">
          <span class="info-icon">⚠️</span>
          <span class="info-text">
            ${metadata.error || 'Using fallback categorization'}
          </span>
        </div>
      `;
    }

    if (metadata.processing_time_ms) {
      return `
        <div class="processing-info success">
          <span class="info-icon">✅</span>
          <span class="info-text">
            Categorized ${metadata.rules_applied || 0} technologies in ${metadata.processing_time_ms}ms
          </span>
        </div>
      `;
    }

    return '';
  }

  /**
   * Render a single category section
   */
  private renderSingleCategory(categoryName: string, category: CategoryData): string {
    const { metadata, subcategories, total_count, layout_hints } = category;

    let html = `
      <div class="tech-category-section" data-category="${categoryName}">
        <div class="tech-category-header">
          <span class="tech-category-icon">${metadata.icon}</span>
          <h3 class="tech-category-title">${metadata.display_name}</h3>
          <span class="tech-category-count">${total_count}</span>
        </div>
        <div class="tech-category-content">
    `;

    if (total_count === 0) {
      const emptyMessage = layout_hints.empty_state_message || 
                          `No ${metadata.display_name.toLowerCase()} technologies detected`;
      html += `<div class="tech-empty-state">${emptyMessage}</div>`;
    } else {
      html += this.renderSubcategories(subcategories, layout_hints);
    }

    html += '</div></div>';
    return html;
  }

  /**
   * Render subcategories within a category
   */
  private renderSubcategories(
    subcategories: Record<string, SubcategoryData>, 
    layoutHints: LayoutHints
  ): string {
    let html = '';

    // Sort subcategories by order if available
    const sortedSubcategories = Object.entries(subcategories)
      .filter(([, subcategory]) => subcategory.visible && subcategory.technologies.length > 0)
      .sort(([, a], [, b]) => (a.order || 999) - (b.order || 999));

    // Check if we have the core subcategories that should be in the same row
    const coreSubcategoryNames = ['Programming Languages', 'Package Managers', 'Frameworks'];
    const coreSubcategories = sortedSubcategories.filter(([, subcategory]) => 
      coreSubcategoryNames.includes(subcategory.display_name)
    );
    const otherSubcategories = sortedSubcategories.filter(([, subcategory]) => 
      !coreSubcategoryNames.includes(subcategory.display_name)
    );

    // Render core subcategories in a horizontal row if we have any
    if (coreSubcategories.length > 0) {
      html += '<div class="core-subcategories-row">';
      for (const [subcategoryName, subcategory] of coreSubcategories) {
        html += `
          <div class="tech-subcategory" data-subcategory="${subcategoryName}">
            <div class="tech-subcategory-header">
              <span class="tech-subcategory-icon">${subcategory.icon}</span>
              <span class="tech-subcategory-title">${subcategory.display_name}</span>
              <span class="tech-subcategory-count">${subcategory.technologies.length}</span>
            </div>
            <div class="tech-list ${layoutHints.subcategory_layout || 'grid'}">
              ${this.renderTechnologies(subcategory.technologies)}
            </div>
          </div>
        `;
      }
      html += '</div>';
    }

    // Render other subcategories normally
    for (const [subcategoryName, subcategory] of otherSubcategories) {
      html += `
        <div class="tech-subcategory" data-subcategory="${subcategoryName}">
          <div class="tech-subcategory-header">
            <span class="tech-subcategory-icon">${subcategory.icon}</span>
            <span class="tech-subcategory-title">${subcategory.display_name}</span>
            <span class="tech-subcategory-count">${subcategory.technologies.length}</span>
          </div>
          <div class="tech-list ${layoutHints.subcategory_layout || 'grid'}">
            ${this.renderTechnologies(subcategory.technologies)}
          </div>
        </div>
      `;
    }

    return html;
  }

  /**
   * Render individual technologies
   */
  private renderTechnologies(technologies: TechnologyEntry[]): string {
    return technologies.map(tech => `
      <div class="tech-item">
        <span class="tech-icon">${tech.metadata?.icon || '📦'}</span>
        <div class="tech-info">
          <span class="tech-name">${this.escapeHtml(tech.name)}</span>
          ${tech.version ? `<span class="tech-version">${this.escapeHtml(tech.version)}</span>` : ''}
          ${tech.source ? `<span class="tech-source">${this.escapeHtml(tech.source)}</span>` : ''}
        </div>
      </div>
    `).join('');
  }

  /**
   * Generate error HTML when rendering fails
   */
  private generateErrorHTML(message: string): string {
    return `
      <div class="tech-stack-error">
        <div class="error-icon">⚠️</div>
        <div class="error-message">${message}</div>
        <div class="error-details">Please check the console for more information.</div>
      </div>
    `;
  }

  /**
   * Generate modern dashboard HTML
   * New method for modern card-based dashboard UI
   */
  public generateModernDashboardHTML(analysisData: any): string {
    try {
      return this.modernDashboard.generateDashboardHTML(analysisData);
    } catch (error) {
      this.errorHandler.logError(
        'Failed to generate modern dashboard HTML',
        error,
        'CategoryDisplayManager'
      );
      // Fallback to regular categorized display
      const categorizedData: CategorizedTechStackData = {
        categorized_tech_stack: analysisData?.categorized_tech_stack || {
          categories: {},
          total_technologies: 0,
          processing_metadata: { fallback_mode: true },
          layout_config: {
            full_width_categories: false,
            show_empty_categories: true,
            responsive_design: true,
            category_order: []
          }
        }
      };
      return this.renderCategorizedData(categorizedData);
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    if (typeof document !== 'undefined') {
      // Browser environment
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    } else {
      // Node.js environment - simple escape
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  }


}