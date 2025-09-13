# Implementation Plan

- [x] 1. Implement Python-driven categorization system

  - Create `TechStackCategorizer` class in `analyzer/tech_stack_categorizer.py` with complete technology classification and JSON output generation
  - Create `CategoryRulesEngine` class in `analyzer/category_rules_engine.py` with comprehensive classification rules for exact matches, keyword patterns, and regex patterns
  - Add `classification_rules.py` configuration file with 100+ technology classification rules including main categories, subcategories, icons, and metadata for all 5 categories (Backend, Frontend, Databases, DevOps, Others)
  - Create data classes for `TechnologyEntry`, `CategoryData`, `SubcategoryData`, and `CategorizedTechStack` in `analyzer/tech_stack_types.py`
  - Integrate categorization engine with existing `analyzer/analyzer.py` to output complete categorized JSON structure
  - Add comprehensive error handling, fallback categorization, and performance optimizations for large datasets
  - Write unit tests and integration tests for categorization accuracy and JSON output validation
  - _Requirements: 1.1-1.5, 3.1-3.5, 4.1-4.7, 6.1-6.5, 8.1-8.5_

- [x] 2. Create TypeScript rendering system for Python categorized data

  - Create `CategoryDisplayManager` class in `src/services/category-display-manager.ts` for pure rendering without any categorization logic
  - Remove all categorization logic from existing TypeScript services (`TechnologyCategorizer`, `EnhancedCategoryManager`, `CategoryRenderer`)
  - Implement full-width category layout system with comprehensive CSS in `resources/tech-stack-categories.css` for responsive design
  - Update `FullCodeAnalysisWebview` to use Python-provided categorized JSON data and new rendering system
  - Add JSON data validation, error handling for malformed data, and fallback rendering when Python categorization fails
  - Implement confidence score display, empty state handling, and technology item cards with hover effects
  - Write unit tests for rendering logic and comprehensive end-to-end tests for the complete Python-to-TypeScript flow
  - _Requirements: 2.1-2.5, 5.1-5.5, 7.1-7.5_

- [x] 3 Implement framework vs library classification system
  - Create `FrameworkClassifier` class in `analyzer/framework_classifier.py` with primary framework detection logic
  - Define PRIMARY_FRAMEWORKS lists for backend (Django, Flask, FastAPI) and frontend (React, Vue, Angular, Next.js) frameworks
  - Define SUPPORTING_TOOLS categories for servers, task queues, build tools, testing, and linting tools
  - Implement `classify_framework_or_library()` method with pattern matching and fallback logic
  - Update `classification_rules.py` to include framework_type metadata (primary, supporting, server, etc.)
  - Integrate framework classifier with main categorization system to ensure proper subcategory placement
  - Add unit tests for framework vs library classification accuracy with edge cases
  - _Requirements: 8.1-8.7_
