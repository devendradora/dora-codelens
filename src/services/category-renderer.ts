import { TechnologyCategory, CategoryRenderOptions, ProcessedTechnology } from '../types/tech-stack-types';
import { ErrorHandler } from '../core/error-handler';

/**
 * Category Renderer
 * Generates HTML for categorized technology sections
 */
export class CategoryRenderer {
  private errorHandler: ErrorHandler;

  constructor(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;
  }

  /**
   * Render categorized tech stack with responsive grid layout
   */
  public renderCategorizedTechStack(
    categories: Map<string, TechnologyCategory>,
    options: CategoryRenderOptions = {
      showEmptyCategories: false,
      gridColumns: 1,
      responsive: true
    }
  ): string {
    try {
      if (categories.size === 0) {
        return this.renderEmptyState();
      }

      let html = '<div class="tech-categories-container">';
      
      // Render categories in specific order: Backend, Frontend, Databases, DevOps, Others
      const categoryOrder = ['backend', 'frontend', 'databases', 'devops', 'others'];
      
      for (const categoryName of categoryOrder) {
        const category = categories.get(categoryName);
        if (category && (category.visible || options.showEmptyCategories)) {
          html += this.renderCategorySection(category);
        }
      }
      
      html += '</div>';
      html += this.generateCategoryStyles();
      
      return html;
    } catch (error) {
      this.errorHandler.logError(
        'Error rendering categorized tech stack',
        error,
        'CategoryRenderer'
      );
      return this.renderErrorState();
    }
  }

  /**
   * Render a single category section
   */
  public renderCategorySection(category: TechnologyCategory): string {
    try {
      let html = '<div class="tech-category-section">';
      
      // Category header
      html += this.renderCategoryHeader(category);
      
      // Category content
      if (category.technologies.length > 0) {
        html += '<div class="tech-category-content">';
        html += this.renderTechnologyGrid(category.technologies);
        html += '</div>';
      } else {
        html += '<div class="tech-category-empty">';
        html += '<p>No technologies detected in this category</p>';
        html += '</div>';
      }
      
      html += '</div>';
      return html;
    } catch (error) {
      this.errorHandler.logError(
        'Error rendering category section',
        error,
        'CategoryRenderer'
      );
      return `<div class="tech-category-error">Error rendering ${category.name} category</div>`;
    }
  }

  /**
   * Render category header with icon, title, and count
   */
  public renderCategoryHeader(category: TechnologyCategory): string {
    return `
      <div class="tech-category-header">
        <div class="tech-category-icon">${category.icon}</div>
        <h4 class="tech-category-title">${category.displayName}</h4>
        <div class="tech-category-count">${category.count}</div>
      </div>
    `;
  }

  /**
   * Render technology grid within a category
   */
  public renderTechnologyGrid(technologies: ProcessedTechnology[]): string {
    try {
      let html = '<div class="tech-items-grid">';
      
      technologies.forEach(tech => {
        html += this.renderTechnologyItem(tech);
      });
      
      html += '</div>';
      return html;
    } catch (error) {
      this.errorHandler.logError(
        'Error rendering technology grid',
        error,
        'CategoryRenderer'
      );
      return '<div class="tech-grid-error">Error rendering technologies</div>';
    }
  }

  /**
   * Render a single technology item
   */
  private renderTechnologyItem(tech: ProcessedTechnology): string {
    const confidenceClass = this.getConfidenceClass(tech.confidence);
    const versionDisplay = tech.version ? `<span class="tech-version">${tech.version}</span>` : '';
    
    return `
      <div class="tech-item ${confidenceClass}" title="Confidence: ${(tech.confidence * 100).toFixed(0)}%">
        <div class="tech-info">
          <span class="tech-name">${this.escapeHtml(tech.name)}</span>
          ${versionDisplay}
        </div>
      </div>
    `;
  }

  /**
   * Get CSS class based on classification confidence
   */
  private getConfidenceClass(confidence: number): string {
    if (confidence >= 0.9) return 'confidence-high';
    if (confidence >= 0.7) return 'confidence-medium';
    return 'confidence-low';
  }

  /**
   * Generate CSS styles for categorized layout
   */
  public generateCategoryStyles(): string {
    return `
      <style>
        .tech-categories-container {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 24px;
          margin-top: 24px;
        }

        .tech-category-section {
          background: var(--vscode-editor-background);
          border: 1px solid var(--vscode-panel-border);
          border-radius: 8px;
          padding: 20px;
          transition: box-shadow 0.2s ease;
        }

        .tech-category-section:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .tech-category-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .tech-category-icon {
          font-size: 24px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .tech-category-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--vscode-foreground);
          margin: 0;
          flex: 1;
        }

        .tech-category-count {
          background: var(--vscode-badge-background);
          color: var(--vscode-badge-foreground);
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          min-width: 24px;
          text-align: center;
        }

        .tech-category-content {
          margin-top: 16px;
        }

        .tech-category-empty {
          text-align: center;
          padding: 20px;
          color: var(--vscode-descriptionForeground);
          font-style: italic;
        }

        .tech-items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }

        .tech-item {
          background: var(--vscode-input-background);
          border: 1px solid var(--vscode-input-border);
          border-radius: 6px;
          border-color: orange;
          padding: 12px;
          transition: all 0.2s ease;
          position: relative;
        }

        .tech-item:hover {
          background: var(--vscode-list-hoverBackground);
          border-color: var(--vscode-focusBorder);
          transform: translateY(-1px);
        }

        .tech-item.confidence-high {
          border-left: 3px solid #4CAF50;
        }

        .tech-item.confidence-medium {
          border-left: 3px solid #FF9800;
        }

        .tech-item.confidence-low {
          border-left: 3px solid #9E9E9E;
        }

        .tech-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .tech-name {
          font-weight: 500;
          color: var(--vscode-foreground);
          font-size: 14px;
        }

        .tech-version {
          font-size: 12px;
          color: var(--vscode-descriptionForeground);
          font-family: var(--vscode-editor-font-family);
        }

        .tech-category-error,
        .tech-grid-error {
          background: var(--vscode-inputValidation-errorBackground);
          color: var(--vscode-inputValidation-errorForeground);
          border: 1px solid var(--vscode-inputValidation-errorBorder);
          border-radius: 4px;
          padding: 12px;
          margin: 8px 0;
        }

        /* Responsive Design */
        @media (max-width: 1023px) {
          .tech-categories-container {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }

        @media (max-width: 600px) {
          .tech-categories-container {
            gap: 16px;
          }
          
          .tech-category-section {
            padding: 16px;
          }
          
          .tech-category-header {
            gap: 8px;
            margin-bottom: 12px;
          }

          .tech-items-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 8px;
          }

          .tech-item {
            padding: 10px;
          }
        }

        /* Empty and error states */
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
   * Render empty state when no categories are available
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