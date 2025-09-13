import {
  CategoryStructure,
  EnhancedCategoryData,
  SubcategoryData,
  ProcessedTechnology,
} from "../types/tech-stack-types";
import { ErrorHandler } from "../core/error-handler";

/**
 * Category Layout Renderer
 * Renders full-width category sections with subcategories
 */
export class CategoryLayoutRenderer {
  private errorHandler: ErrorHandler;

  constructor(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;
  }

  /**
   * Render enhanced categorized tech stack with full-width layout
   */
  public renderEnhancedCategorizedTechStack(
    categoryStructure: CategoryStructure
  ): string {
    try {
      if (categoryStructure.categories.size === 0) {
        return this.renderEmptyState();
      }

      let html = '<div class="enhanced-tech-categories-container">';

      // Add summary header
      html += this.renderSummaryHeader(categoryStructure);

      // Render categories in specific order: Backend, Frontend, Databases, DevOps, Others
      const categoryOrder = [
        "backend",
        "frontend",
        "databases",
        "devops",
        "others",
      ];

      for (const categoryName of categoryOrder) {
        const category = categoryStructure.categories.get(categoryName);
        if (category) {
          html += this.renderFullWidthCategory(category);
        }
      }

      html += "</div>";
      html += this.generateFullWidthCategoryStyles();

      return html;
    } catch (error) {
      this.errorHandler.logError(
        "Error rendering enhanced categorized tech stack",
        error,
        "CategoryLayoutRenderer"
      );
      return this.renderErrorState();
    }
  }

  /**
   * Render full-width category section
   */
  public renderFullWidthCategory(category: EnhancedCategoryData): string {
    try {
      let html = '<div class="tech-category-section">';

      // Category header
      html += this.renderCategoryHeader(category);

      // Category content
      html += '<div class="tech-category-content">';

      if (category.totalCount > 0) {
        // Render subcategories
        html += this.renderSubcategorySections(category);
      } else {
        // Empty state
        html += '<div class="tech-empty-state">';
        html += "<p>No technologies detected in this category</p>";
        html += "</div>";
      }

      html += "</div>";
      html += "</div>";

      return html;
    } catch (error) {
      this.errorHandler.logError(
        "Error rendering full-width category",
        error,
        "CategoryLayoutRenderer"
      );
      return `<div class="tech-category-error">Error rendering ${category.name} category</div>`;
    }
  }

  /**
   * Render subcategory sections within a category
   */
  public renderSubcategorySections(category: EnhancedCategoryData): string {
    try {
      let html = "";

      // Render visible subcategories in order
      for (const [subcategoryName, subcategory] of category.subcategories) {
        if (subcategory.visible && subcategory.technologies.length > 0) {
          html += this.renderSubcategorySection(subcategory);
        }
      }

      return html;
    } catch (error) {
      this.errorHandler.logError(
        "Error rendering subcategory sections",
        error,
        "CategoryLayoutRenderer"
      );
      return '<div class="subcategory-error">Error rendering subcategories</div>';
    }
  }

  /**
   * Render a single subcategory section
   */
  public renderSubcategorySection(subcategory: SubcategoryData): string {
    try {
      let html = '<div class="tech-subcategory">';

      // Subcategory header
      html += '<div class="tech-subcategory-header">';
      html += `<span class="subcategory-icon">${subcategory.icon}</span>`;
      html += `<span class="subcategory-title">${subcategory.displayName}</span>`;
      html += `<span class="subcategory-count">${subcategory.technologies.length}</span>`;
      html += "</div>";

      // Technology list
      html += this.renderTechnologyList(subcategory.technologies);

      html += "</div>";

      return html;
    } catch (error) {
      this.errorHandler.logError(
        "Error rendering subcategory section",
        error,
        "CategoryLayoutRenderer"
      );
      return `<div class="subcategory-error">Error rendering ${subcategory.name} subcategory</div>`;
    }
  }

  /**
   * Render technology list with responsive grid
   */
  public renderTechnologyList(technologies: ProcessedTechnology[]): string {
    try {
      let html = '<div class="tech-list">';

      technologies.forEach((tech) => {
        html += this.renderTechnologyItem(tech);
      });

      html += "</div>";
      return html;
    } catch (error) {
      this.errorHandler.logError(
        "Error rendering technology list",
        error,
        "CategoryLayoutRenderer"
      );
      return '<div class="tech-list-error">Error rendering technologies</div>';
    }
  }

  /**
   * Render a single technology item
   */
  private renderTechnologyItem(tech: ProcessedTechnology): string {
    const versionDisplay = tech.version
      ? `<span class="tech-version">v${tech.version}</span>`
      : "";

    return `
      <div class="tech-item">
        <div class="tech-info">
          <span class="tech-name">${this.escapeHtml(tech.name)}</span>
          ${versionDisplay}
        </div>
      </div>
    `;
  }

  /**
   * Render category header with icon, title, and count
   */
  private renderCategoryHeader(category: EnhancedCategoryData): string {
    return `
      <div class="tech-category-header">
        <div class="category-icon">${category.icon}</div>
        <h2 class="tech-category-title">${category.displayName}</h2>
        <div class="tech-category-count">${category.totalCount}</div>
      </div>
    `;
  }

  /**
   * Render summary header with overall statistics
   */
  private renderSummaryHeader(categoryStructure: CategoryStructure): string {
    const visibleCategories = Array.from(
      categoryStructure.categories.values()
    ).filter((cat) => cat.totalCount > 0).length;

    return `
      <div class="tech-summary-header">
        <div class="summary-stats">
          <div class="stat-item">
            <span class="stat-value">${
              categoryStructure.totalTechnologies
            }</span>
            <span class="stat-label">Technologies</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${visibleCategories}</span>
            <span class="stat-label">Categories</span>
          </div>
          ${
            categoryStructure.duplicatesRemoved > 0
              ? `
          <div class="stat-item">
            <span class="stat-value">${categoryStructure.duplicatesRemoved}</span>
            <span class="stat-label">Duplicates Removed</span>
          </div>
          `
              : ""
          }
        </div>
      </div>
    `;
  }



  /**
   * Generate full-width CSS styles
   */
  public generateFullWidthCategoryStyles(): string {
    return `
      <style>
        /* Enhanced Tech Categories Container */
        .enhanced-tech-categories-container {
          width: 100%;
          max-width: none;
          margin: 0;
          padding: 0;
        }

        /* Summary Header */
        .tech-summary-header {
          background: var(--vscode-editor-background);
          border: 1px solid var(--vscode-panel-border);
          border-radius: 8px;
          padding: 16px 24px;
          margin-bottom: 24px;
        }

        .summary-stats {
          display: flex;
          gap: 32px;
          align-items: center;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--vscode-foreground);
        }

        .stat-label {
          font-size: 12px;
          color: var(--vscode-descriptionForeground);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Full-Width Category Section */
        .tech-category-section {
          width: 100%;
          margin-bottom: 2rem;
          border: 1px solid var(--vscode-panel-border);
          border-radius: 8px;
          overflow: hidden;
          background: var(--vscode-editor-background);
        }

        /* Category Header */
        .tech-category-header {
          background: var(--vscode-editor-background);
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--vscode-panel-border);
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .category-icon {
          font-size: 1.5rem;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .tech-category-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--vscode-foreground);
          margin: 0;
          flex: 1;
        }

        .tech-category-count {
          background: var(--vscode-badge-background);
          color: var(--vscode-badge-foreground);
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 500;
          min-width: 24px;
          text-align: center;
        }

        /* Category Content */
        .tech-category-content {
          padding: 1.5rem;
        }

        /* Subcategory Sections */
        .tech-subcategory {
          margin-bottom: 1.5rem;
        }

        .tech-subcategory:last-child {
          margin-bottom: 0;
        }

        .tech-subcategory-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1rem;
          font-weight: 500;
          color: var(--vscode-foreground);
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .subcategory-icon {
          font-size: 1rem;
        }

        .subcategory-title {
          flex: 1;
        }

        .subcategory-count {
          background: var(--vscode-badge-background);
          color: var(--vscode-badge-foreground);
          padding: 0.125rem 0.375rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        /* Technology Lists */
        .tech-list {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.75rem;
        }

        .tech-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: var(--vscode-input-background);
          border: 1px solid var(--vscode-input-border);
          border-radius: 6px;
          transition: all 0.2s ease;
          position: relative;
        }

        .tech-item:hover {
          background: var(--vscode-list-hoverBackground);
          border-color: var(--vscode-focusBorder);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }



        .tech-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }

        .tech-name {
          font-weight: 500;
          color: var(--vscode-foreground);
          font-size: 14px;
        }

        .tech-version {
          font-size: 11px;
          color: var(--vscode-descriptionForeground);
          font-family: var(--vscode-editor-font-family);
          opacity: 0.8;
        }

        /* Empty State */
        .tech-empty-state {
          text-align: center;
          padding: 2rem;
          color: var(--vscode-descriptionForeground);
          font-style: italic;
        }

        /* Error States */
        .tech-category-error,
        .subcategory-error,
        .tech-list-error {
          background: var(--vscode-inputValidation-errorBackground);
          color: var(--vscode-inputValidation-errorForeground);
          border: 1px solid var(--vscode-inputValidation-errorBorder);
          border-radius: 4px;
          padding: 12px;
          margin: 8px 0;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .tech-category-content {
            padding: 1rem;
          }
          
          .tech-category-header {
            padding: 0.75rem 1rem;
          }
          
          .tech-list {
            grid-template-columns: repeat(4, 1fr);
            gap: 0.5rem;
          }
          
          .tech-item {
            padding: 0.375rem 0.5rem;
          }
          
          .summary-stats {
            gap: 16px;
          }
          
          .stat-value {
            font-size: 20px;
          }
        }

        @media (max-width: 480px) {
          .tech-list {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .tech-category-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
          
          .summary-stats {
            flex-wrap: wrap;
            justify-content: center;
          }
        }

        /* Empty and Error States */
        .tech-stack-empty-state,
        .tech-stack-error-state {
          text-align: center;
          padding: 40px 20px;
          color: var(--vscode-descriptionForeground);
        }

        .tech-stack-empty-state .empty-icon,
        .tech-stack-error-state .error-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.6;
        }

        .tech-stack-empty-state h3,
        .tech-stack-error-state h3 {
          margin: 0 0 8px 0;
          color: var(--vscode-foreground);
        }

        .tech-stack-empty-state p,
        .tech-stack-error-state p {
          margin: 0;
          font-size: 14px;
        }
      </style>
    `;
  }

  /**
   * Render empty state when no categories have technologies
   */
  private renderEmptyState(): string {
    return `
      <div class="tech-stack-empty-state">
        <div class="empty-icon">🛠️</div>
        <h3>No Technologies Detected</h3>
        <p>No technology stack information could be categorized.</p>
      </div>
    `;
  }

  /**
   * Render error state when rendering fails
   */
  private renderErrorState(): string {
    return `
      <div class="tech-stack-error-state">
        <div class="error-icon">⚠️</div>
        <h3>Error Loading Categories</h3>
        <p>An error occurred while rendering the categorized tech stack.</p>
      </div>
    `;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    if (typeof document !== "undefined") {
      // Browser environment
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    } else {
      // Node.js environment - simple escape
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }
  }
}
