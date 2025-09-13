import { TechnologyMetadata } from '../types/tech-stack-types';
import { ErrorHandler } from '../core/error-handler';

/**
 * Classification Rules Database
 */
interface ClassificationRules {
  languages: Map<string, TechnologyMetadata>;
  packageManagers: Map<string, TechnologyMetadata>;
  frameworks: Map<string, TechnologyMetadata>;
  libraries: Map<string, TechnologyMetadata>;
  tools: Map<string, TechnologyMetadata>;
  databases: Map<string, TechnologyMetadata>;
}

/**
 * Smart Technology Classifier
 * Intelligently classifies technologies by main category and subcategory type
 */
export class SmartTechnologyClassifier {
  private classificationRules: ClassificationRules;
  private classificationCache: Map<string, TechnologyMetadata>;
  private errorHandler: ErrorHandler;

  constructor(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;
    this.classificationCache = new Map();
    this.classificationRules = this.initializeClassificationRules();
  }

  /**
   * Classify a technology by name
   */
  public classifyTechnology(name: string): TechnologyMetadata {
    try {
      if (!name || typeof name !== 'string') {
        return this.getDefaultClassification();
      }

      const normalizedName = name.toLowerCase().trim();
      if (normalizedName.length === 0) {
        return this.getDefaultClassification();
      }

      // Check cache first
      if (this.classificationCache.has(normalizedName)) {
        return this.classificationCache.get(normalizedName)!;
      }

      let metadata = this.performClassification(normalizedName);
      
      // Cache the result
      this.classificationCache.set(normalizedName, metadata);
      
      return metadata;
    } catch (error) {
      this.errorHandler.logError(
        'Error classifying technology',
        error,
        'SmartTechnologyClassifier'
      );
      return this.getDefaultClassification();
    }
  }

  /**
   * Get main category for a technology
   */
  public getMainCategory(name: string): string {
    return this.classifyTechnology(name).mainCategory;
  }

  /**
   * Get subcategory for a technology
   */
  public getSubcategory(name: string): string {
    return this.classifyTechnology(name).subcategory;
  }

  /**
   * Get technology icon
   */
  public getTechnologyIcon(name: string): string {
    return this.classifyTechnology(name).icon;
  }

  /**
   * Perform the actual classification
   */
  private performClassification(normalizedName: string): TechnologyMetadata {
    // Try exact matches first
    for (const [category, rules] of Object.entries(this.classificationRules)) {
      if (rules.has(normalizedName)) {
        return rules.get(normalizedName)!;
      }
    }

    // Try partial matches for common patterns
    const partialMatch = this.findPartialMatch(normalizedName);
    if (partialMatch) {
      return partialMatch;
    }

    // Try keyword-based classification
    const keywordMatch = this.classifyByKeywords(normalizedName);
    if (keywordMatch) {
      return keywordMatch;
    }

    // Default classification
    return this.getDefaultClassification();
  }

  /**
   * Find partial matches for technology names
   */
  private findPartialMatch(normalizedName: string): TechnologyMetadata | null {
    // Check for common patterns
    const patterns = [
      // Major backend frameworks only
      { pattern: /^django/, metadata: { mainCategory: 'backend' as const, subcategory: 'frameworks' as const, icon: '🎸' } },
      { pattern: /^flask/, metadata: { mainCategory: 'backend' as const, subcategory: 'frameworks' as const, icon: '🌶️' } },
      { pattern: /^fastapi/, metadata: { mainCategory: 'backend' as const, subcategory: 'frameworks' as const, icon: '⚡' } },
      
      // Other backend frameworks moved to libraries
      { pattern: /^tornado/, metadata: { mainCategory: 'backend' as const, subcategory: 'libraries' as const, icon: '🌪️' } },
      { pattern: /^pyramid/, metadata: { mainCategory: 'backend' as const, subcategory: 'libraries' as const, icon: '🔺' } },
      { pattern: /^bottle/, metadata: { mainCategory: 'backend' as const, subcategory: 'libraries' as const, icon: '🍼' } },
      { pattern: /^sanic/, metadata: { mainCategory: 'backend' as const, subcategory: 'libraries' as const, icon: '💨' } },
      { pattern: /^express/, metadata: { mainCategory: 'backend' as const, subcategory: 'libraries' as const, icon: '🚂' } },
      { pattern: /^spring/, metadata: { mainCategory: 'backend' as const, subcategory: 'libraries' as const, icon: '🌱' } },
      { pattern: /^rails/, metadata: { mainCategory: 'backend' as const, subcategory: 'libraries' as const, icon: '🚄' } },
      { pattern: /^laravel/, metadata: { mainCategory: 'backend' as const, subcategory: 'libraries' as const, icon: '🔺' } },
      
      // Testing libraries moved to backend
      { pattern: /^pytest/, metadata: { mainCategory: 'backend' as const, subcategory: 'libraries' as const, icon: '🧪' } },
      { pattern: /^unittest/, metadata: { mainCategory: 'backend' as const, subcategory: 'libraries' as const, icon: '🧪' } },
      
      // Data science libraries moved to backend
      { pattern: /^numpy/, metadata: { mainCategory: 'backend' as const, subcategory: 'libraries' as const, icon: '🔢' } },
      { pattern: /^pandas/, metadata: { mainCategory: 'backend' as const, subcategory: 'libraries' as const, icon: '🐼' } },
      { pattern: /^matplotlib/, metadata: { mainCategory: 'backend' as const, subcategory: 'libraries' as const, icon: '📊' } },
      { pattern: /^scikit/, metadata: { mainCategory: 'backend' as const, subcategory: 'libraries' as const, icon: '🤖' } },
      { pattern: /^tensorflow/, metadata: { mainCategory: 'backend' as const, subcategory: 'libraries' as const, icon: '🧠' } },
      { pattern: /^pytorch/, metadata: { mainCategory: 'backend' as const, subcategory: 'libraries' as const, icon: '🔥' } },
      
      // Frontend frameworks
      { pattern: /^react/, metadata: { mainCategory: 'frontend' as const, subcategory: 'frameworks' as const, icon: '⚛️' } },
      { pattern: /^vue/, metadata: { mainCategory: 'frontend' as const, subcategory: 'frameworks' as const, icon: '💚' } },
      { pattern: /^angular/, metadata: { mainCategory: 'frontend' as const, subcategory: 'frameworks' as const, icon: '🅰️' } },
      
      // Frontend testing libraries moved to frontend
      { pattern: /^jest/, metadata: { mainCategory: 'frontend' as const, subcategory: 'libraries' as const, icon: '🃏' } },
      { pattern: /^mocha/, metadata: { mainCategory: 'frontend' as const, subcategory: 'libraries' as const, icon: '☕' } },
      { pattern: /^cypress/, metadata: { mainCategory: 'frontend' as const, subcategory: 'libraries' as const, icon: '🌲' } },
      
      // DevOps
      { pattern: /^docker/, metadata: { mainCategory: 'devops' as const, subcategory: 'containerization' as const, icon: '🐳' } },
      { pattern: /^kubernetes|^k8s/, metadata: { mainCategory: 'devops' as const, subcategory: 'orchestration' as const, icon: '☸️' } },
      
      // Databases
      { pattern: /^postgres|^postgresql/, metadata: { mainCategory: 'databases' as const, subcategory: 'sql-databases' as const, icon: '🐘' } },
      { pattern: /^mysql/, metadata: { mainCategory: 'databases' as const, subcategory: 'sql-databases' as const, icon: '🗃️' } },
      { pattern: /^mongodb|^mongo/, metadata: { mainCategory: 'databases' as const, subcategory: 'nosql-databases' as const, icon: '🍃' } },
      { pattern: /^redis/, metadata: { mainCategory: 'databases' as const, subcategory: 'in-memory' as const, icon: '🔴' } },
    ];

    for (const { pattern, metadata } of patterns) {
      if (pattern.test(normalizedName)) {
        return metadata;
      }
    }

    return null;
  }

  /**
   * Classify by keywords in the technology name
   */
  private classifyByKeywords(normalizedName: string): TechnologyMetadata | null {
    const keywordRules = [
      // Backend keywords - frameworks only for major ones
      { keywords: ['django', 'flask', 'fastapi'], category: 'backend' as const, subcategory: 'frameworks' as const, icon: '🔧' },
      { keywords: ['api', 'server', 'backend', 'web', 'framework'], category: 'backend' as const, subcategory: 'libraries' as const, icon: '🔧' },
      { keywords: ['python', 'py'], category: 'backend' as const, subcategory: 'languages' as const, icon: '🐍' },
      
      // Backend testing and libraries
      { keywords: ['test', 'testing', 'spec', 'mock', 'pytest', 'unittest'], category: 'backend' as const, subcategory: 'libraries' as const, icon: '🧪' },
      { keywords: ['numpy', 'pandas', 'matplotlib', 'scikit', 'tensorflow', 'pytorch', 'ml', 'ai', 'data'], category: 'backend' as const, subcategory: 'libraries' as const, icon: '🔢' },
      { keywords: ['black', 'flake8', 'mypy', 'isort', 'pylint', 'lint'], category: 'backend' as const, subcategory: 'libraries' as const, icon: '🔍' },
      
      // Frontend keywords
      { keywords: ['ui', 'frontend', 'client', 'component'], category: 'frontend' as const, subcategory: 'libraries' as const, icon: '🎨' },
      { keywords: ['css', 'style', 'sass', 'scss'], category: 'frontend' as const, subcategory: 'tools' as const, icon: '🎨' },
      { keywords: ['js', 'javascript', 'typescript', 'ts'], category: 'frontend' as const, subcategory: 'languages' as const, icon: '📜' },
      { keywords: ['jest', 'mocha', 'cypress', 'selenium'], category: 'frontend' as const, subcategory: 'libraries' as const, icon: '🧪' },
      
      // DevOps keywords
      { keywords: ['deploy', 'ci', 'cd', 'pipeline', 'build'], category: 'devops' as const, subcategory: 'ci-cd' as const, icon: '🔧' },
      { keywords: ['monitor', 'log', 'metric'], category: 'devops' as const, subcategory: 'monitoring' as const, icon: '📊' },
      { keywords: ['container', 'docker'], category: 'devops' as const, subcategory: 'containerization' as const, icon: '🐳' },
      
      // Database keywords
      { keywords: ['db', 'database', 'sql'], category: 'databases' as const, subcategory: 'sql-databases' as const, icon: '🗃️' },
      { keywords: ['nosql', 'document'], category: 'databases' as const, subcategory: 'nosql-databases' as const, icon: '📄' },
      { keywords: ['cache', 'memory'], category: 'databases' as const, subcategory: 'in-memory' as const, icon: '💾' },
    ];

    for (const rule of keywordRules) {
      if (rule.keywords.some(keyword => normalizedName.includes(keyword))) {
        return {
          mainCategory: rule.category,
          subcategory: rule.subcategory,
          icon: rule.icon
        };
      }
    }

    return null;
  }

  /**
   * Get default classification for unknown technologies
   */
  private getDefaultClassification(): TechnologyMetadata {
    return {
      mainCategory: 'others',
      subcategory: 'miscellaneous',
      icon: '📦'
    };
  }

  /**
   * Initialize comprehensive classification rules
   */
  private initializeClassificationRules(): ClassificationRules {
    return {
      languages: new Map([
        ['python', { mainCategory: 'backend', subcategory: 'languages', icon: '🐍' }],
        ['python3', { mainCategory: 'backend', subcategory: 'languages', icon: '🐍' }],
        ['javascript', { mainCategory: 'frontend', subcategory: 'languages', icon: '📜' }],
        ['js', { mainCategory: 'frontend', subcategory: 'languages', icon: '📜' }],
        ['typescript', { mainCategory: 'frontend', subcategory: 'languages', icon: '📘' }],
        ['ts', { mainCategory: 'frontend', subcategory: 'languages', icon: '📘' }],
        ['html', { mainCategory: 'frontend', subcategory: 'languages', icon: '🌐' }],
        ['html5', { mainCategory: 'frontend', subcategory: 'languages', icon: '🌐' }],
        ['css', { mainCategory: 'frontend', subcategory: 'languages', icon: '🎨' }],
        ['css3', { mainCategory: 'frontend', subcategory: 'languages', icon: '🎨' }],
        ['sql', { mainCategory: 'databases', subcategory: 'languages', icon: '🗃️' }],
        ['bash', { mainCategory: 'devops', subcategory: 'languages', icon: '💻' }],
        ['shell', { mainCategory: 'devops', subcategory: 'languages', icon: '💻' }],
      ]),

      packageManagers: new Map([
        ['pip', { mainCategory: 'backend', subcategory: 'package-managers', icon: '📦' }],
        ['poetry', { mainCategory: 'backend', subcategory: 'package-managers', icon: '🎭' }],
        ['pipenv', { mainCategory: 'backend', subcategory: 'package-managers', icon: '📦' }],
        ['conda', { mainCategory: 'backend', subcategory: 'package-managers', icon: '🐍' }],
        ['npm', { mainCategory: 'frontend', subcategory: 'package-managers', icon: '📦' }],
        ['yarn', { mainCategory: 'frontend', subcategory: 'package-managers', icon: '🧶' }],
        ['pnpm', { mainCategory: 'frontend', subcategory: 'package-managers', icon: '📦' }],
      ]),

      frameworks: new Map([
        // Backend frameworks - Only major frameworks
        ['django', { mainCategory: 'backend', subcategory: 'frameworks', icon: '🎸' }],
        ['flask', { mainCategory: 'backend', subcategory: 'frameworks', icon: '🌶️' }],
        ['fastapi', { mainCategory: 'backend', subcategory: 'frameworks', icon: '⚡' }],
        
        // Frontend frameworks
        ['react', { mainCategory: 'frontend', subcategory: 'frameworks', icon: '⚛️' }],
        ['vue', { mainCategory: 'frontend', subcategory: 'frameworks', icon: '💚' }],
        ['angular', { mainCategory: 'frontend', subcategory: 'frameworks', icon: '🅰️' }],
        ['svelte', { mainCategory: 'frontend', subcategory: 'frameworks', icon: '🔥' }],
        ['nextjs', { mainCategory: 'frontend', subcategory: 'frameworks', icon: '▲' }],
        ['nuxtjs', { mainCategory: 'frontend', subcategory: 'frameworks', icon: '💚' }],
        ['gatsby', { mainCategory: 'frontend', subcategory: 'frameworks', icon: '🚀' }],
      ]),

      libraries: new Map([
        // Backend libraries - including moved frameworks and testing tools
        ['tornado', { mainCategory: 'backend', subcategory: 'libraries', icon: '🌪️' }],
        ['pyramid', { mainCategory: 'backend', subcategory: 'libraries', icon: '🔺' }],
        ['bottle', { mainCategory: 'backend', subcategory: 'libraries', icon: '🍼' }],
        ['sanic', { mainCategory: 'backend', subcategory: 'libraries', icon: '💨' }],
        ['quart', { mainCategory: 'backend', subcategory: 'libraries', icon: '🥛' }],
        ['starlette', { mainCategory: 'backend', subcategory: 'libraries', icon: '⭐' }],
        ['express', { mainCategory: 'backend', subcategory: 'libraries', icon: '🚂' }],
        ['spring', { mainCategory: 'backend', subcategory: 'libraries', icon: '🌱' }],
        ['rails', { mainCategory: 'backend', subcategory: 'libraries', icon: '🚄' }],
        ['laravel', { mainCategory: 'backend', subcategory: 'libraries', icon: '🔺' }],
        ['sqlalchemy', { mainCategory: 'backend', subcategory: 'libraries', icon: '🗃️' }],
        ['psycopg2', { mainCategory: 'backend', subcategory: 'libraries', icon: '🐘' }],
        ['pymongo', { mainCategory: 'backend', subcategory: 'libraries', icon: '🍃' }],
        ['requests', { mainCategory: 'backend', subcategory: 'libraries', icon: '🌐' }],
        ['httpx', { mainCategory: 'backend', subcategory: 'libraries', icon: '🌐' }],
        ['celery', { mainCategory: 'backend', subcategory: 'libraries', icon: '🌿' }],
        ['gunicorn', { mainCategory: 'backend', subcategory: 'libraries', icon: '🦄' }],
        ['uvicorn', { mainCategory: 'backend', subcategory: 'libraries', icon: '🦄' }],
        // Python testing libraries moved to backend
        ['pytest', { mainCategory: 'backend', subcategory: 'libraries', icon: '🧪' }],
        ['unittest', { mainCategory: 'backend', subcategory: 'libraries', icon: '🧪' }],
        ['nose', { mainCategory: 'backend', subcategory: 'libraries', icon: '👃' }],
        ['tox', { mainCategory: 'backend', subcategory: 'libraries', icon: '🧪' }],
        ['coverage', { mainCategory: 'backend', subcategory: 'libraries', icon: '📊' }],
        ['mock', { mainCategory: 'backend', subcategory: 'libraries', icon: '🎭' }],
        // Python data science libraries moved to backend
        ['numpy', { mainCategory: 'backend', subcategory: 'libraries', icon: '🔢' }],
        ['pandas', { mainCategory: 'backend', subcategory: 'libraries', icon: '🐼' }],
        ['matplotlib', { mainCategory: 'backend', subcategory: 'libraries', icon: '📊' }],
        ['seaborn', { mainCategory: 'backend', subcategory: 'libraries', icon: '📈' }],
        ['plotly', { mainCategory: 'backend', subcategory: 'libraries', icon: '📊' }],
        ['scikit-learn', { mainCategory: 'backend', subcategory: 'libraries', icon: '🤖' }],
        ['tensorflow', { mainCategory: 'backend', subcategory: 'libraries', icon: '🧠' }],
        ['pytorch', { mainCategory: 'backend', subcategory: 'libraries', icon: '🔥' }],
        ['keras', { mainCategory: 'backend', subcategory: 'libraries', icon: '🧠' }],
        // Python code quality tools moved to backend
        ['black', { mainCategory: 'backend', subcategory: 'libraries', icon: '⚫' }],
        ['flake8', { mainCategory: 'backend', subcategory: 'libraries', icon: '🔍' }],
        ['mypy', { mainCategory: 'backend', subcategory: 'libraries', icon: '🔍' }],
        ['isort', { mainCategory: 'backend', subcategory: 'libraries', icon: '📋' }],
        ['bandit', { mainCategory: 'backend', subcategory: 'libraries', icon: '🔒' }],
        ['pylint', { mainCategory: 'backend', subcategory: 'libraries', icon: '🔍' }],
        
        // Frontend libraries
        ['jquery', { mainCategory: 'frontend', subcategory: 'libraries', icon: '💎' }],
        ['lodash', { mainCategory: 'frontend', subcategory: 'libraries', icon: '🔧' }],
        ['axios', { mainCategory: 'frontend', subcategory: 'libraries', icon: '🌐' }],
        ['bootstrap', { mainCategory: 'frontend', subcategory: 'libraries', icon: '🅱️' }],
        ['tailwindcss', { mainCategory: 'frontend', subcategory: 'libraries', icon: '💨' }],
        ['materialui', { mainCategory: 'frontend', subcategory: 'libraries', icon: '🎨' }],
        ['antd', { mainCategory: 'frontend', subcategory: 'libraries', icon: '🐜' }],
        // Frontend testing libraries moved to frontend
        ['jest', { mainCategory: 'frontend', subcategory: 'libraries', icon: '🃏' }],
        ['mocha', { mainCategory: 'frontend', subcategory: 'libraries', icon: '☕' }],
        ['cypress', { mainCategory: 'frontend', subcategory: 'libraries', icon: '🌲' }],
        ['selenium', { mainCategory: 'frontend', subcategory: 'libraries', icon: '🔍' }],
      ]),

      tools: new Map([
        // DevOps tools
        ['docker', { mainCategory: 'devops', subcategory: 'containerization', icon: '🐳' }],
        ['docker-compose', { mainCategory: 'devops', subcategory: 'containerization', icon: '🐳' }],
        ['kubernetes', { mainCategory: 'devops', subcategory: 'orchestration', icon: '☸️' }],
        ['k8s', { mainCategory: 'devops', subcategory: 'orchestration', icon: '☸️' }],
        ['helm', { mainCategory: 'devops', subcategory: 'orchestration', icon: '⛵' }],
        ['jenkins', { mainCategory: 'devops', subcategory: 'ci-cd', icon: '🔧' }],
        ['github-actions', { mainCategory: 'devops', subcategory: 'ci-cd', icon: '🐙' }],
        ['gitlab-ci', { mainCategory: 'devops', subcategory: 'ci-cd', icon: '🦊' }],
        ['circleci', { mainCategory: 'devops', subcategory: 'ci-cd', icon: '⭕' }],
        ['travis-ci', { mainCategory: 'devops', subcategory: 'ci-cd', icon: '🔨' }],
        ['prometheus', { mainCategory: 'devops', subcategory: 'monitoring', icon: '🔥' }],
        ['grafana', { mainCategory: 'devops', subcategory: 'monitoring', icon: '📊' }],
        ['nginx', { mainCategory: 'devops', subcategory: 'tools', icon: '🌐' }],
        ['apache', { mainCategory: 'devops', subcategory: 'tools', icon: '🪶' }],
        ['terraform', { mainCategory: 'devops', subcategory: 'tools', icon: '🏗️' }],
        ['ansible', { mainCategory: 'devops', subcategory: 'tools', icon: '📋' }],
        
        // Development tools
        ['git', { mainCategory: 'devops', subcategory: 'tools', icon: '📚' }],
        ['webpack', { mainCategory: 'frontend', subcategory: 'tools', icon: '📦' }],
        ['vite', { mainCategory: 'frontend', subcategory: 'tools', icon: '⚡' }],
        ['rollup', { mainCategory: 'frontend', subcategory: 'tools', icon: '📦' }],
        ['parcel', { mainCategory: 'frontend', subcategory: 'tools', icon: '📦' }],
        ['babel', { mainCategory: 'frontend', subcategory: 'tools', icon: '🗼' }],
        ['eslint', { mainCategory: 'frontend', subcategory: 'tools', icon: '🔍' }],
        ['prettier', { mainCategory: 'frontend', subcategory: 'tools', icon: '💅' }],
      ]),

      databases: new Map([
        // SQL Databases
        ['postgresql', { mainCategory: 'databases', subcategory: 'sql-databases', icon: '🐘' }],
        ['postgres', { mainCategory: 'databases', subcategory: 'sql-databases', icon: '🐘' }],
        ['mysql', { mainCategory: 'databases', subcategory: 'sql-databases', icon: '🗃️' }],
        ['sqlite', { mainCategory: 'databases', subcategory: 'sql-databases', icon: '🗃️' }],
        ['sqlite3', { mainCategory: 'databases', subcategory: 'sql-databases', icon: '🗃️' }],
        ['mariadb', { mainCategory: 'databases', subcategory: 'sql-databases', icon: '🗃️' }],
        ['oracle', { mainCategory: 'databases', subcategory: 'sql-databases', icon: '🔴' }],
        ['mssql', { mainCategory: 'databases', subcategory: 'sql-databases', icon: '🗃️' }],
        ['sqlserver', { mainCategory: 'databases', subcategory: 'sql-databases', icon: '🗃️' }],
        
        // NoSQL Databases
        ['mongodb', { mainCategory: 'databases', subcategory: 'nosql-databases', icon: '🍃' }],
        ['mongo', { mainCategory: 'databases', subcategory: 'nosql-databases', icon: '🍃' }],
        ['cassandra', { mainCategory: 'databases', subcategory: 'nosql-databases', icon: '🏛️' }],
        ['couchdb', { mainCategory: 'databases', subcategory: 'nosql-databases', icon: '🛋️' }],
        ['dynamodb', { mainCategory: 'databases', subcategory: 'nosql-databases', icon: '⚡' }],
        ['elasticsearch', { mainCategory: 'databases', subcategory: 'nosql-databases', icon: '🔍' }],
        ['neo4j', { mainCategory: 'databases', subcategory: 'nosql-databases', icon: '🕸️' }],
        
        // In-Memory Databases
        ['redis', { mainCategory: 'databases', subcategory: 'in-memory', icon: '🔴' }],
        ['memcached', { mainCategory: 'databases', subcategory: 'in-memory', icon: '💾' }],
        ['h2', { mainCategory: 'databases', subcategory: 'in-memory', icon: '💾' }],
      ]),
    };
  }
}