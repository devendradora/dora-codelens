import {
  CategoryDisplayManager,
  CategorizedTechStackData,
} from "./category-display-manager";
import { ErrorHandler } from "../core/error-handler";

/**
 * ModernTechStackDashboard
 * Generates modern card-based dashboard UI for tech stack analysis
 */
export class ModernTechStackDashboard {
  private categoryDisplayManager: CategoryDisplayManager;
  private errorHandler: ErrorHandler;

  constructor(
    categoryDisplayManager: CategoryDisplayManager,
    errorHandler: ErrorHandler
  ) {
    this.categoryDisplayManager = categoryDisplayManager;
    this.errorHandler = errorHandler;
  }

  /**
   * Generate complete modern dashboard HTML
   */
  public generateDashboardHTML(analysisData: any): string {
    try {
      console.log("🎯 ModernTechStackDashboard: Starting dashboard generation");
      console.log("📊 Analysis data structure:", {
        hasCategorizedTechStack: !!analysisData?.categorized_tech_stack,
        categoriesCount: Object.keys(
          analysisData?.categorized_tech_stack?.categories || {}
        ).length,
        totalTechnologies:
          analysisData?.categorized_tech_stack?.total_technologies,
      });

      const result = this.renderModernDashboard(analysisData);
      console.log(
        "✅ ModernTechStackDashboard: Successfully generated dashboard HTML"
      );
      return result;
    } catch (error) {
      console.error(
        "❌ ModernTechStackDashboard: Failed to generate dashboard",
        error
      );
      this.errorHandler.logError(
        "Failed to generate modern dashboard",
        error,
        "ModernTechStackDashboard"
      );
      return this.generateFallbackHTML(analysisData);
    }
  }

  /**
   * Render the complete modern dashboard
   */
  private renderModernDashboard(analysisData: any): string {
    const categorizedData = analysisData?.categorized_tech_stack;

    if (!categorizedData || !categorizedData.categories) {
      return '<div class="no-categories">No technology categories found</div>';
    }

    // Process data to move "others" libraries to backend
    const processedData = this.processCategories(categorizedData);
    const { categories, layout_config } = processedData;

    // Filter out "others" category from display
    const categoryOrder = (
      layout_config?.category_order || Object.keys(categories)
    ).filter((name: string) => name !== "others");

    let html = '<div class="modern-tech-stack-layout">';

    // Add debug button and hidden JSON panel
    html += this.renderDebugPanel(analysisData);

    // Render each category section
    for (const categoryName of categoryOrder) {
      const category = categories[categoryName];
      if (!category) {
        continue;
      }

      // Show category if visible or if configured to show empty categories
      if (category.visible || layout_config?.show_empty_categories) {
        html += this.renderCategorySection(categoryName, category);
      }
    }

    html += "</div>";
    return html;
  }
  /**
   * Process categories - minimal processing, let Python handle framework filtering
   */
  private processCategories(categorizedData: any): any {
    const processedData = JSON.parse(JSON.stringify(categorizedData)); // Deep clone
    const { categories } = processedData;

    // Only move "others" libraries to backend if needed
    if (
      categories.others &&
      categories.others.subcategories &&
      categories.others.subcategories.libraries
    ) {
      const othersLibraries =
        categories.others.subcategories.libraries.technologies || [];

      // Ensure backend category and libraries subcategory exist
      if (!categories.backend) {
        categories.backend = {
          metadata: {
            name: "backend",
            display_name: "Backend",
            icon: "🔧",
            description: "Backend technologies",
            color: "#ff9800",
          },
          subcategories: {},
          total_count: 0,
          visible: true,
          layout_hints: {
            full_width: false,
            subcategory_layout: "grid",
          },
        };
      }

      if (!categories.backend.subcategories.libraries) {
        categories.backend.subcategories.libraries = {
          name: "libraries",
          display_name: "Libraries",
          icon: "📚",
          technologies: [],
          visible: true,
          order: 4,
        };
      }

      // Move all "others" libraries to backend libraries
      if (othersLibraries.length > 0) {
        categories.backend.subcategories.libraries.technologies =
          categories.backend.subcategories.libraries.technologies.concat(
            othersLibraries
          );

        // Update backend total count
        categories.backend.total_count =
          (categories.backend.total_count || 0) + othersLibraries.length;

        console.log(
          `📦 Moved ${othersLibraries.length} libraries from "others" to backend libraries`
        );
      }
    }

    console.log("🎨 Frontend will render data as provided by Python (no framework filtering)");
    return processedData;
  }

  /**
   * Render debug panel with JSON viewer
   */
  private renderDebugPanel(analysisData: any): string {
    const jsonData = JSON.stringify(analysisData, null, 2);
    const escapedJson = this.escapeHtml(jsonData);

    return `
      <div class="debug-panel" style="margin-bottom: 20px; border: 1px solid var(--vscode-panel-border); border-radius: 8px; background: var(--vscode-editor-background);">
        <button class="debug-toggle-btn" onclick="toggleDebugPanel()" style="background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; width: 100%;">
          🐛 Debug: Show Tech Stack JSON
        </button>
        <div class="debug-content" id="debug-content" style="display: none; padding: 16px; border-top: 1px solid var(--vscode-panel-border);">
          <div class="debug-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="margin: 0; font-size: 14px; color: var(--vscode-foreground);">Tech Stack Analysis Data (Debug Mode)</h3>
            <button class="debug-close-btn" onclick="toggleDebugPanel()" style="background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">✕ Close</button>
          </div>
          <div class="debug-json-container" style="max-height: 400px; overflow-y: auto; background: var(--vscode-textCodeBlock-background); border-radius: 4px; padding: 12px;">
            <pre class="debug-json" style="margin: 0; font-size: 11px; line-height: 1.4; color: var(--vscode-foreground);"><code>${escapedJson}</code></pre>
          </div>
        </div>
      </div>
      <script>
        function toggleDebugPanel() {
          const debugContent = document.getElementById('debug-content');
          const toggleBtn = document.querySelector('.debug-toggle-btn');
          
          if (debugContent.style.display === 'none') {
            debugContent.style.display = 'block';
            toggleBtn.textContent = '🐛 Debug: Hide Tech Stack JSON';
            debugContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            debugContent.style.display = 'none';
            toggleBtn.textContent = '🐛 Debug: Show Tech Stack JSON';
          }
        }
      </script>
    `;
  }

  /**
   * Render a category section with header and subcategory cards
   */
  private renderCategorySection(categoryName: string, category: any): string {
    const { metadata, subcategories, total_count } = category;

    if (total_count === 0) {
      return ""; // Skip empty categories
    }

    const categoryColor = this.getCategoryColor(categoryName);

    let html = `
      <div class="category-section" data-category="${categoryName}">
        <h2 class="category-header" style="color: ${categoryColor};">${metadata.display_name}</h2>
    `;

    // Filter and sort subcategories
    const visibleSubcategories = Object.entries(subcategories)
      .filter(
        ([, subcategory]: [string, any]) =>
          subcategory.visible && subcategory.technologies.length > 0
      )
      .sort(
        ([, a]: [string, any], [, b]: [string, any]) =>
          (a.order || 999) - (b.order || 999)
      );

    // Separate core subcategories (languages, package-managers, frameworks) from libraries
    const coreSubcategoryNames = ['languages', 'package-managers', 'frameworks'];
    const coreSubcategories = visibleSubcategories.filter(([name]) => 
      coreSubcategoryNames.includes(name)
    );
    const librariesSubcategories = visibleSubcategories.filter(([name]) => 
      name === 'libraries'
    );
    const otherSubcategories = visibleSubcategories.filter(([name]) => 
      !coreSubcategoryNames.includes(name) && name !== 'libraries'
    );

    // Render core subcategories in a horizontal row
    if (coreSubcategories.length > 0) {
      html += '<div class="core-subcategories-row" style="display: flex; gap: 16px; margin-bottom: 16px;">';
      for (const [subcategoryName, subcategory] of coreSubcategories) {
        html += this.renderSubcategoryCard(subcategoryName, subcategory, categoryName, true);
      }
      html += '</div>';
    }

    // Render libraries subcategory with full width in separate row
    for (const [subcategoryName, subcategory] of librariesSubcategories) {
      html += this.renderSubcategoryCard(subcategoryName, subcategory, categoryName, false, true);
    }

    // Render other subcategories normally
    for (const [subcategoryName, subcategory] of otherSubcategories) {
      html += this.renderSubcategoryCard(subcategoryName, subcategory, categoryName);
    }

    html += "</div>";
    return html;
  }

  /**
   * Render a subcategory card
   */
  private renderSubcategoryCard(
    subcategoryName: string,
    subcategory: any,
    categoryName?: string,
    isCoreSubcategory: boolean = false,
    isFullWidth: boolean = false
  ): string {
    const categoryColor = categoryName ? this.getCategoryColor(categoryName) : '#9e9e9e';
    
    // Determine card styling based on layout type
    let cardStyle = `border-left: 3px solid ${categoryColor};`;
    
    if (isCoreSubcategory) {
      // Core subcategories (languages, package-managers, frameworks) get flex: 1 for equal width
      cardStyle += ' flex: 1; min-width: 0;';
    } else if (isFullWidth) {
      // Libraries subcategory gets full width
      cardStyle += ' width: 100%;';
    }
    
    return `
      <div class="subcategory-card" data-subcategory="${subcategoryName}" style="${cardStyle}">
        <div class="subcategory-header">
          <span class="subcategory-icon">${subcategory.icon}</span>
          <span class="subcategory-title">${subcategory.display_name}</span>
        </div>
        <div class="subcategory-content">
          ${this.renderTechnologies(subcategory.technologies)}
        </div>
      </div>
    `;
  }

  /**
   * Get color for category header
   */
  private getCategoryColor(categoryName: string): string {
    const colorMap: Record<string, string> = {
      backend: "#ff9800", // Orange
      frontend: "#4caf50", // Green
      databases: "#2196f3", // Blue
      devops: "#e91e63", // Pink
      others: "#9e9e9e", // Gray
    };

    return colorMap[categoryName] || "#9e9e9e";
  }

  /**
   * Render technologies within a subcategory
   */
  private renderTechnologies(technologies: any[]): string {
    if (!technologies || technologies.length === 0) {
      return '<div class="no-data">No data</div>';
    }

    return technologies
      .map((tech) => {
        const hasVersion = tech.version && tech.version.trim() !== "";
        
        // For technologies with versions, show name and version in same div with version background
        if (hasVersion) {
          return `
            <div class="tech-badge-with-version" style="background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); padding: 6px 12px; border-radius: 6px; margin-bottom: 8px; display: inline-block; font-weight: 500;">
              ${this.escapeHtml(tech.name)} ${this.escapeHtml(tech.version)}
            </div>
          `;
        } else {
          return `<div class="tech-badge" style="background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); padding: 6px 12px; border-radius: 6px; margin-bottom: 8px; display: inline-block; font-weight: 500;">${this.escapeHtml(tech.name)}</div>`;
        }
      })
      .join("");
  }

  /**
   * Generate fallback HTML when dashboard generation fails
   */
  private generateFallbackHTML(analysisData: any): string {
    try {
      // Try to use the existing category display manager as fallback
      const categorizedTechStackData: CategorizedTechStackData = {
        categorized_tech_stack: analysisData?.categorized_tech_stack || {
          categories: {},
          total_technologies: 0,
          processing_metadata: { fallback_mode: true },
          layout_config: {
            full_width_categories: false,
            show_empty_categories: true,
            responsive_design: true,
            category_order: [],
          },
        },
      };

      return this.categoryDisplayManager.renderCategorizedData(
        categorizedTechStackData
      );
    } catch (error) {
      this.errorHandler.logError(
        "Fallback HTML generation failed",
        error,
        "ModernTechStackDashboard"
      );
      return `
        <div class="tech-stack-dashboard error">
          <div class="error-message">
            <h3>Unable to display tech stack dashboard</h3>
            <p>Please check the console for more information.</p>
          </div>
        </div>
      `;
    }
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
