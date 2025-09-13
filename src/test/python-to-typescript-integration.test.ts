import * as assert from "assert";
import {
  CategoryDisplayManager,
  CategorizedTechStackData,
} from "../services/category-display-manager";
import { FullCodeAnalysisWebview } from "../webviews/full-code-analysis-webview";
import { ErrorHandler } from "../core/error-handler";

/**
 * Mock ErrorHandler for testing
 */
class MockErrorHandler {
  logError(message: string, error?: any, source?: string): void {
    // Silent for tests - could log to console if needed for debugging
  }
}

suite("Python-to-TypeScript Integration Tests", () => {
  let categoryDisplayManager: CategoryDisplayManager;
  let fullCodeAnalysisWebview: FullCodeAnalysisWebview;
  let mockErrorHandler: MockErrorHandler;

  setup(() => {
    mockErrorHandler = new MockErrorHandler();
    categoryDisplayManager = new CategoryDisplayManager(
      mockErrorHandler as any
    );
    fullCodeAnalysisWebview = new FullCodeAnalysisWebview(
      mockErrorHandler as any,
      "/mock/extension/path"
    );
  });

  suite("Complete Python-categorized data flow", () => {
    test("should handle complete Python categorization output", () => {
      const pythonCategorizedData: CategorizedTechStackData = {
        categorized_tech_stack: {
          categories: {
            backend: {
              metadata: {
                name: "backend",
                display_name: "Backend",
                icon: "🔧",
                description: "Server-side frameworks, languages, and APIs",
                color: "#4CAF50",
              },
              subcategories: {
                languages: {
                  name: "languages",
                  display_name: "Programming Languages",
                  icon: "💻",
                  technologies: [
                    {
                      name: "Python",
                      version: "3.9.7",
                      source: "detected",
                      confidence: 1.0,
                      metadata: {
                        icon: "🐍",
                        description: "Python programming language",
                        official_site: "https://python.org",
                      },
                    },
                  ],
                  visible: true,
                  order: 1,
                },
                frameworks: {
                  name: "frameworks",
                  display_name: "Web Frameworks",
                  icon: "🏗️",
                  technologies: [
                    {
                      name: "Django",
                      version: "4.2.0",
                      source: "requirements.txt",
                      confidence: 1.0,
                      metadata: {
                        icon: "🎸",
                        description: "High-level Python web framework",
                      },
                    },
                    {
                      name: "FastAPI",
                      version: "0.104.1",
                      source: "requirements.txt",
                      confidence: 0.95,
                      metadata: {
                        icon: "⚡",
                        description:
                          "Modern, fast web framework for building APIs",
                      },
                    },
                  ],
                  visible: true,
                  order: 2,
                },
                "package-managers": {
                  name: "package-managers",
                  display_name: "Package Managers",
                  icon: "📦",
                  technologies: [
                    {
                      name: "pip",
                      source: "requirements.txt",
                      confidence: 0.9,
                      metadata: {
                        icon: "🐍",
                        description: "Python package installer",
                      },
                    },
                  ],
                  visible: true,
                  order: 3,
                },
              },
              total_count: 4,
              visible: true,
              layout_hints: {
                full_width: true,
                subcategory_layout: "grid",
                responsive_breakpoints: {
                  mobile: 1,
                  tablet: 2,
                  desktop: 3,
                },
              },
            },
            frontend: {
              metadata: {
                name: "frontend",
                display_name: "Frontend",
                icon: "🎨",
                description: "Client-side frameworks, libraries, and UI tools",
                color: "#2196F3",
              },
              subcategories: {},
              total_count: 0,
              visible: true,
              layout_hints: {
                full_width: true,
                subcategory_layout: "grid",
                empty_state_message:
                  "No frontend technologies detected in this project",
              },
            },
            databases: {
              metadata: {
                name: "databases",
                display_name: "Databases",
                icon: "🗄️",
                description: "Database systems and storage solutions",
                color: "#607D8B",
              },
              subcategories: {
                "sql-databases": {
                  name: "sql-databases",
                  display_name: "SQL Databases",
                  icon: "🗃️",
                  technologies: [
                    {
                      name: "PostgreSQL",
                      version: "15.0",
                      source: "docker-compose.yml",
                      confidence: 0.95,
                      metadata: {
                        icon: "🐘",
                        description: "Advanced open source relational database",
                      },
                    },
                  ],
                  visible: true,
                  order: 1,
                },
              },
              total_count: 1,
              visible: true,
              layout_hints: {
                full_width: true,
                subcategory_layout: "grid",
              },
            },
            devops: {
              metadata: {
                name: "devops",
                display_name: "DevOps",
                icon: "⚙️",
                description:
                  "Deployment, infrastructure, and operational tools",
                color: "#FF9800",
              },
              subcategories: {
                containerization: {
                  name: "containerization",
                  display_name: "Containerization",
                  icon: "🐳",
                  technologies: [
                    {
                      name: "Docker",
                      source: "Dockerfile",
                      confidence: 1.0,
                      metadata: {
                        icon: "🐳",
                        description:
                          "Platform for developing, shipping, and running applications",
                      },
                    },
                    {
                      name: "Docker Compose",
                      source: "docker-compose.yml",
                      confidence: 1.0,
                      metadata: {
                        icon: "🐙",
                        description:
                          "Tool for defining multi-container Docker applications",
                      },
                    },
                  ],
                  visible: true,
                  order: 1,
                },
              },
              total_count: 2,
              visible: true,
              layout_hints: {
                full_width: true,
                subcategory_layout: "grid",
              },
            },
            others: {
              metadata: {
                name: "others",
                display_name: "Others",
                icon: "📦",
                description:
                  "Development utilities, testing tools, and libraries",
                color: "#9C27B0",
              },
              subcategories: {
                testing: {
                  name: "testing",
                  display_name: "Testing Tools",
                  icon: "🧪",
                  technologies: [
                    {
                      name: "pytest",
                      version: "7.4.3",
                      source: "requirements.txt",
                      confidence: 0.9,
                      metadata: {
                        icon: "🧪",
                        description: "Python testing framework",
                      },
                    },
                  ],
                  visible: true,
                  order: 1,
                },
              },
              total_count: 1,
              visible: true,
              layout_hints: {
                full_width: true,
                subcategory_layout: "grid",
              },
            },
          },
          total_technologies: 8,
          processing_metadata: {
            processing_time_ms: 245,
            rules_applied: 127,
            confidence_threshold: 0.5,
            detection_methods: [
              "file_analysis",
              "dependency_parsing",
              "code_patterns",
            ],
          },
          layout_config: {
            full_width_categories: true,
            show_empty_categories: true,
            responsive_design: true,
            category_order: [
              "backend",
              "frontend",
              "databases",
              "devops",
              "others",
            ],
          },
        },
      };

      const html = categoryDisplayManager.renderCategorizedData(
        pythonCategorizedData
      );

      // Verify overall structure
      assert.ok(
        html.includes("tech-stack-categories"),
        "Should contain tech-stack-categories"
      );
      assert.ok(
        html.includes("processing-info success"),
        "Should contain processing info"
      );
      assert.ok(
        html.includes("Categorized 127 technologies in 245ms"),
        "Should contain processing stats"
      );

      // Verify all categories are present
      assert.ok(html.includes("Backend"), "Should contain Backend");
      assert.ok(html.includes("Frontend"), "Should contain Frontend");
      assert.ok(html.includes("Databases"), "Should contain Databases");
      assert.ok(html.includes("DevOps"), "Should contain DevOps");
      assert.ok(html.includes("Others"), "Should contain Others");

      // Verify backend technologies
      assert.ok(html.includes("Python"), "Should contain Python");
      assert.ok(html.includes("3.9.7"), "Should contain Python version");
      assert.ok(html.includes("Django"), "Should contain Django");
      assert.ok(html.includes("4.2.0"), "Should contain Django version");
      assert.ok(html.includes("FastAPI"), "Should contain FastAPI");
      assert.ok(html.includes("0.104.1"), "Should contain FastAPI version");
      assert.ok(html.includes("pip"), "Should contain pip");

      // Verify database technologies
      assert.ok(html.includes("PostgreSQL"), "Should contain PostgreSQL");
      assert.ok(html.includes("15.0"), "Should contain PostgreSQL version");
      assert.ok(html.includes("🐘"), "Should contain PostgreSQL icon");

      // Verify DevOps technologies
      assert.ok(html.includes("Docker"), "Should contain Docker");
      assert.ok(
        html.includes("Docker Compose"),
        "Should contain Docker Compose"
      );
      assert.ok(html.includes("🐳"), "Should contain Docker icon");

      // Verify testing technologies
      assert.ok(html.includes("pytest"), "Should contain pytest");
      assert.ok(html.includes("7.4.3"), "Should contain pytest version");

      // Verify empty state for frontend
      assert.ok(
        html.includes("No frontend technologies detected in this project"),
        "Should contain empty frontend message"
      );

      // Verify confidence indicators
      assert.ok(
        html.includes("🟢"),
        "Should contain high confidence indicator"
      );
      assert.ok(
        html.includes("🟡"),
        "Should contain medium confidence indicator"
      );

      // Verify subcategory organization
      assert.ok(
        html.includes("Programming Languages"),
        "Should contain Programming Languages"
      );
      assert.ok(
        html.includes("Web Frameworks"),
        "Should contain Web Frameworks"
      );
      assert.ok(
        html.includes("Package Managers"),
        "Should contain Package Managers"
      );
      assert.ok(html.includes("SQL Databases"), "Should contain SQL Databases");
      assert.ok(
        html.includes("Containerization"),
        "Should contain Containerization"
      );
      assert.ok(html.includes("Testing Tools"), "Should contain Testing Tools");
    });

    test("should handle Python categorization with errors gracefully", () => {
      const errorData: CategorizedTechStackData = {
        categorized_tech_stack: {
          categories: {
            backend: {
              metadata: {
                name: "backend",
                display_name: "Backend",
                icon: "🔧",
                description: "Backend technologies",
                color: "#4CAF50",
              },
              subcategories: {},
              total_count: 0,
              visible: true,
              layout_hints: {
                full_width: true,
                subcategory_layout: "grid",
                empty_state_message: "Categorization unavailable",
              },
            },
          },
          total_technologies: 0,
          processing_metadata: {
            error: "Classification rules engine failed to load",
            fallback_mode: true,
            processing_time_ms: 50,
          },
          layout_config: {
            full_width_categories: true,
            show_empty_categories: true,
            responsive_design: true,
            category_order: ["backend"],
          },
        },
      };

      const html = categoryDisplayManager.renderCategorizedData(errorData);

      assert.ok(
        html.includes("processing-info warning"),
        "Should contain warning info"
      );
      assert.ok(
        html.includes("Classification rules engine failed to load"),
        "Should contain error message"
      );
      assert.ok(html.includes("⚠️"), "Should contain warning icon");
      assert.ok(
        html.includes("Categorization unavailable"),
        "Should contain unavailable message"
      );
    });

    test("should handle malformed Python data with validation", () => {
      const malformedData = {
        categorized_tech_stack: {
          // Missing categories
          total_technologies: 0,
          processing_metadata: {},
          layout_config: {},
        },
      } as CategorizedTechStackData;

      const html = categoryDisplayManager.renderCategorizedData(malformedData);

      assert.ok(
        html.includes("tech-stack-error"),
        "Should contain error state"
      );
      assert.ok(
        html.includes("Failed to display tech stack categories"),
        "Should contain error message"
      );
    });

    test("should handle large datasets efficiently", () => {
      // Create a large dataset with many technologies
      const largeTechnologies = Array.from({ length: 100 }, (_, i) => ({
        name: `Technology-${i}`,
        version: `${i}.0.0`,
        source: "generated",
        confidence: Math.random(),
        metadata: { icon: "📦" },
      }));

      const largeData: CategorizedTechStackData = {
        categorized_tech_stack: {
          categories: {
            backend: {
              metadata: {
                name: "backend",
                display_name: "Backend",
                icon: "🔧",
                description: "Backend technologies",
                color: "#4CAF50",
              },
              subcategories: {
                libraries: {
                  name: "libraries",
                  display_name: "Libraries",
                  icon: "📚",
                  technologies: largeTechnologies,
                  visible: true,
                },
              },
              total_count: 100,
              visible: true,
              layout_hints: {
                full_width: true,
                subcategory_layout: "grid",
              },
            },
          },
          total_technologies: 100,
          processing_metadata: {
            processing_time_ms: 1500,
            rules_applied: 200,
          },
          layout_config: {
            full_width_categories: true,
            show_empty_categories: false,
            responsive_design: true,
            category_order: ["backend"],
          },
        },
      };

      const startTime = Date.now();
      const html = categoryDisplayManager.renderCategorizedData(largeData);
      const renderTime = Date.now() - startTime;

      // Rendering should be fast even with large datasets
      assert.ok(renderTime < 1000, "Rendering should be fast (< 1 second)");
      assert.ok(
        html.includes("tech-stack-categories"),
        "Should contain categories container"
      );
      assert.ok(
        html.includes("Technology-0"),
        "Should contain first technology"
      );
      assert.ok(
        html.includes("Technology-99"),
        "Should contain last technology"
      );
      assert.strictEqual(
        html.split("tech-item").length - 1,
        100,
        "Should have 100 tech items"
      );
    });
  });

  suite("Responsive design validation", () => {
    test("should include responsive layout hints in rendered output", () => {
      const responsiveData: CategorizedTechStackData = {
        categorized_tech_stack: {
          categories: {
            backend: {
              metadata: {
                name: "backend",
                display_name: "Backend",
                icon: "🔧",
                description: "Backend technologies",
                color: "#4CAF50",
              },
              subcategories: {
                frameworks: {
                  name: "frameworks",
                  display_name: "Frameworks",
                  icon: "🏗️",
                  technologies: [
                    {
                      name: "Django",
                      source: "test",
                      confidence: 1.0,
                    },
                  ],
                  visible: true,
                },
              },
              total_count: 1,
              visible: true,
              layout_hints: {
                full_width: true,
                subcategory_layout: "cards",
                responsive_breakpoints: {
                  mobile: 1,
                  tablet: 2,
                  desktop: 4,
                },
              },
            },
          },
          total_technologies: 1,
          processing_metadata: {},
          layout_config: {
            full_width_categories: true,
            show_empty_categories: false,
            responsive_design: true,
            category_order: ["backend"],
          },
        },
      };

      const html = categoryDisplayManager.renderCategorizedData(responsiveData);

      assert.ok(
        html.includes("tech-list cards"),
        "Should contain cards layout"
      );
      assert.ok(
        html.includes("tech-category-section"),
        "Should contain category section"
      );
      assert.ok(
        html.includes('data-category="backend"'),
        "Should contain category data attribute"
      );
    });
  });
});
