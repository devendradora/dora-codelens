import { ProcessedTechnology, TechnologyCategory, ClassificationResult } from '../types/tech-stack-types';
import { ErrorHandler } from '../core/error-handler';

/**
 * Technology categorization mappings
 */
const technologyCategories = {
  backend: {
    exact: [
      // Python language and core
      'python', 'python3', 'py',
      // Major Python web frameworks (only these 3)
      'django', 'flask', 'fastapi',
      // Other Python frameworks (moved to libraries subcategory)
      'tornado', 'pyramid', 'bottle', 'cherrypy', 'web2py', 'falcon', 
      'sanic', 'quart', 'starlette',
      // Python ORMs and database libraries
      'sqlalchemy', 'django-orm', 'peewee', 'tortoise-orm',
      'psycopg2', 'psycopg2-binary', 'pymongo', 'mysql-connector-python',
      // Python package managers
      'pip', 'pipenv', 'poetry', 'conda', 'requirements.txt', 'pyproject.toml',
      // Python task queues and caching
      'celery', 'rq', 'dramatiq', 'huey',
      // Python authentication and security
      'pyjwt', 'passlib', 'bcrypt', 'cryptography', 'authlib',
      // Python server and WSGI/ASGI
      'gunicorn', 'uwsgi', 'waitress', 'hypercorn', 'uvicorn',
      // Python testing frameworks (moved from others)
      'pytest', 'unittest', 'nose', 'tox', 'coverage', 'mock',
      // Python HTTP clients (moved from others)
      'requests', 'httpx', 'aiohttp', 'urllib3',
      // Python data science and ML (moved from others)
      'numpy', 'pandas', 'matplotlib', 'seaborn', 'plotly',
      'scikit-learn', 'tensorflow', 'pytorch', 'keras',
      // Python image and media processing (moved from others)
      'pillow', 'opencv', 'imageio', 'ffmpeg',
      // Python code quality and formatting (moved from others)
      'black', 'flake8', 'mypy', 'isort', 'bandit', 'pylint',
      // Python documentation (moved from others)
      'sphinx', 'mkdocs',
      // Other backend frameworks (moved to libraries subcategory)
      'express', 'koa', 'hapi', 'nestjs', 'fastify',
      // Java frameworks (moved to libraries subcategory)
      'spring', 'springboot', 'hibernate', 'struts',
      // Other backend languages/frameworks (moved to libraries subcategory)
      'rails', 'laravel', 'symfony', 'codeigniter', 'asp.net'
    ],
    keywords: [
      'api', 'server', 'auth', 'jwt', 'crypto',
      'queue', 'wsgi', 'asgi', 'middleware', 'backend',
      'rest', 'graphql', 'session', 'cookie', 'framework',
      'python', 'django', 'flask', 'fastapi', 'test', 'testing',
      'mock', 'fixture', 'http', 'client', 'data', 'analysis',
      'plot', 'chart', 'graph', 'visualization', 'image', 'vision',
      'ml', 'ai', 'model', 'machine-learning', 'lint', 'linting',
      'type', 'typing', 'security', 'util', 'utility', 'helper',
      'tool', 'library', 'package', 'doc', 'documentation',
      'py', 'numpy', 'pandas', 'scipy', 'sklearn', 'tensorflow',
      'pytorch', 'keras', 'pillow', 'opencv', 'requests', 'httpx',
      'sqlalchemy', 'psycopg', 'pymongo', 'celery', 'pytest',
      'black', 'flake8', 'mypy', 'sphinx', 'pydantic'
    ]
  },
  databases: {
    exact: [
      // SQL Databases
      'postgresql', 'postgres', 'mysql', 'sqlite', 'sqlite3', 'mariadb',
      'oracle', 'mssql', 'sqlserver', 'db2', 'cockroachdb',
      // NoSQL Databases
      'mongodb', 'redis', 'memcached', 'elasticsearch', 'cassandra',
      'dynamodb', 'couchdb', 'neo4j', 'influxdb', 'clickhouse',
      // Database drivers and connectors
      'psycopg2', 'pymongo', 'mysql-connector-python', 'cx-oracle',
      'pyodbc', 'sqlalchemy', 'mongoose', 'sequelize', 'prisma',
      // In-memory databases
      'h2', 'hsqldb', 'derby',
      // Time-series databases
      'timescaledb', 'prometheus', 'grafana'
    ],
    keywords: [
      'database', 'db', 'sql', 'nosql', 'cache', 'store', 'storage',
      'connector', 'driver', 'orm', 'odm', 'query', 'schema',
      'migration', 'seed', 'backup', 'replica', 'cluster'
    ]
  },
  frontend: {
    exact: [
      // Core web technologies
      'html', 'html5', 'css', 'css3', 'javascript', 'js', 'typescript', 'ts',
      // JavaScript frameworks and libraries
      'react', 'vue', 'angular', 'svelte', 'jquery', 'backbone',
      'ember', 'knockout', 'polymer', 'lit', 'alpine',
      // CSS frameworks
      'bootstrap', 'tailwindcss', 'bulma', 'foundation', 'materialize',
      'semantic-ui', 'chakra-ui', 'ant-design', 'material-ui',
      // Build tools and bundlers
      'webpack', 'vite', 'rollup', 'parcel', 'esbuild', 'snowpack',
      // CSS preprocessors and tools
      'sass', 'scss', 'less', 'stylus', 'postcss',
      // TypeScript and transpilers
      'typescript', 'babel', 'swc',
      // Linting and formatting
      'eslint', 'prettier', 'stylelint',
      // Template engines
      'jinja2', 'handlebars', 'mustache', 'ejs', 'pug',
      // Frontend testing frameworks (moved from others)
      'jest', 'mocha', 'jasmine', 'karma', 'cypress', 'selenium',
      // Frontend HTTP clients
      'axios', 'fetch'
    ],
    keywords: [
      'ui', 'component', 'css', 'style', 'theme', 'design',
      'build', 'bundle', 'compile', 'transpile', 'lint',
      'frontend', 'client', 'browser', 'dom', 'responsive',
      'mobile', 'web', 'html', 'scss', 'jsx', 'tsx', 'template'
    ]
  },
  devops: {
    exact: [
      // Containerization
      'docker', 'docker-compose', 'dockerfile', 'podman', 'containerd',
      // Docker Compose files
      'docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml',
      // Orchestration
      'kubernetes', 'k8s', 'helm', 'istio', 'linkerd',
      // Infrastructure as Code
      'terraform', 'ansible', 'puppet', 'chef', 'saltstack',
      // CI/CD
      'jenkins', 'github-actions', 'gitlab-ci', 'circleci', 'travis-ci',
      'azure-devops', 'bamboo', 'teamcity',
      // Cloud providers
      'aws', 'azure', 'gcp', 'boto3', 'azure-sdk', 'google-cloud',
      // Monitoring and logging
      'prometheus', 'grafana', 'elk', 'elasticsearch', 'logstash', 'kibana',
      'datadog', 'newrelic', 'splunk', 'fluentd',
      // Web servers and proxies
      'nginx', 'apache', 'traefik', 'haproxy', 'envoy',
      // Service discovery and configuration
      'consul', 'vault', 'etcd', 'zookeeper'
    ],
    keywords: [
      'deploy', 'deployment', 'container', 'orchestration', 'cloud', 'infra',
      'infrastructure', 'monitor', 'monitoring', 'log', 'logging', 'metric',
      'alert', 'ci', 'cd', 'pipeline', 'proxy', 'load-balancer',
      'service-mesh', 'devops', 'ops', 'sre', 'platform', 'docker', 'compose'
    ]
  },
  others: {
    exact: [
      // File formats
      'json', 'yaml', 'xml', 'csv', 'txt', 'md', 'pdf',
      // Media files
      'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp',
      'mp3', 'wav', 'mp4', 'avi', 'mov',
      // Documentation tools (non-Python)
      'gitbook'
    ],
    keywords: [
      'format', 'config', 'configuration', 'media', 'file'
    ]
  }
};

/**
 * Category styling configuration
 */
const categoryStyling = {
  backend: {
    icon: '🔧',
    color: '#4CAF50',
    description: 'Server-side frameworks and APIs'
  },
  frontend: {
    icon: '🎨',
    color: '#2196F3',
    description: 'Client-side frameworks and UI tools'
  },
  databases: {
    icon: '🗄️',
    color: '#607D8B',
    description: 'Database systems and storage solutions'
  },
  devops: {
    icon: '⚙️',
    color: '#FF9800',
    description: 'Deployment and infrastructure tools'
  },
  others: {
    icon: '📦',
    color: '#9C27B0',
    description: 'Development utilities and libraries'
  }
};

/**
 * Technology Categorizer
 * Classifies technologies into backend, frontend, devops, and others categories
 */
export class TechnologyCategorizer {
  private categoryMappings: Map<string, string>;
  private keywordMappings: Map<string, string[]>;
  private errorHandler: ErrorHandler;
  private classificationCache: Map<string, ClassificationResult>;

  constructor(errorHandler: ErrorHandler) {
    this.errorHandler = errorHandler;
    this.categoryMappings = new Map();
    this.keywordMappings = new Map();
    this.classificationCache = new Map();
    this.initializeMappings();
  }

  /**
   * Initialize category mappings from configuration
   */
  private initializeMappings(): void {
    try {
      // Initialize exact match mappings
      for (const [category, config] of Object.entries(technologyCategories)) {
        config.exact.forEach(tech => {
          this.categoryMappings.set(tech.toLowerCase(), category);
        });
        this.keywordMappings.set(category, config.keywords);
      }
    } catch (error) {
      this.errorHandler.logError(
        'Failed to initialize technology categorization mappings',
        error,
        'TechnologyCategorizer'
      );
    }
  }

  /**
   * Categorize a list of technologies into categories
   */
  public categorizeTechnologies(technologies: any[], analysisData?: any): Map<string, TechnologyCategory> {
    try {
      const categories = this.initializeCategories();
      
      // Always try to detect from analysis data first
      if (analysisData) {
        this.detectTechnologiesFromAnalysisData(analysisData, categories);
      }
      
      if (!technologies || !Array.isArray(technologies)) {
        // Remove empty categories and mark visible ones
        for (const [key, category] of categories) {
          if (category.count === 0) {
            categories.delete(key);
          } else {
            category.visible = true;
          }
        }
        return categories;
      }

      // Process technologies in batches for better performance
      const batchSize = 50;
      for (let i = 0; i < technologies.length; i += batchSize) {
        const batch = technologies.slice(i, i + batchSize);
        this.processTechnologyBatch(batch, categories);
      }

      // Remove empty categories and mark visible ones
      for (const [key, category] of categories) {
        if (category.count === 0) {
          this.errorHandler.logError(
            `Removing empty category: ${key}`,
            null,
            'TechnologyCategorizer'
          );
          categories.delete(key);
        } else {
          category.visible = true;
          this.errorHandler.logError(
            `Keeping category: ${key} with ${category.count} technologies`,
            null,
            'TechnologyCategorizer'
          );
        }
      }

      return categories;
    } catch (error) {
      this.errorHandler.logError(
        'Error categorizing technologies',
        error,
        'TechnologyCategorizer'
      );
      return this.initializeCategories();
    }
  }

  /**
   * Initialize empty categories
   */
  private initializeCategories(): Map<string, TechnologyCategory> {
    const categories = new Map<string, TechnologyCategory>();
    
    for (const [categoryName, styling] of Object.entries(categoryStyling)) {
      categories.set(categoryName, {
        name: categoryName,
        displayName: this.getCategoryDisplayName(categoryName),
        icon: styling.icon,
        description: styling.description,
        technologies: [],
        count: 0,
        visible: false
      });
    }
    
    return categories;
  }

  /**
   * Process a batch of technologies
   */
  private processTechnologyBatch(
    batch: any[], 
    categories: Map<string, TechnologyCategory>
  ): void {
    batch.forEach(tech => {
      const processedTech = this.processTechnology(tech);
      if (processedTech) {
        const category = categories.get(processedTech.category);
        if (category) {
          category.technologies.push(processedTech);
          category.count++;
        }
      }
    });
  }

  /**
   * Process a single technology entry
   */
  private processTechnology(tech: any): ProcessedTechnology | null {
    try {
      let name: string;
      let version: string | undefined;

      // Handle different technology data formats
      if (typeof tech === 'string') {
        name = tech;
      } else if (typeof tech === 'object' && tech.name) {
        name = tech.name;
        version = tech.version;
      } else if (typeof tech === 'object') {
        // Handle key-value pairs
        const entries = Object.entries(tech);
        if (entries.length > 0) {
          const [techName, techVersion] = entries[0];
          name = techName;
          version = typeof techVersion === 'string' ? techVersion : undefined;
        } else {
          return null;
        }
      } else {
        return null;
      }

      if (!name || typeof name !== 'string') {
        return null;
      }

      const classification = this.classifyTechnology(name);
      
      return {
        name: name.trim(),
        version,
        category: classification.category as any,
        subcategory: 'miscellaneous' as any, // Default subcategory for legacy compatibility
        confidence: classification.confidence
      };
    } catch (error) {
      this.errorHandler.logError(
        'Error processing technology',
        error,
        'TechnologyCategorizer'
      );
      return null;
    }
  }

  /**
   * Classify a single technology
   */
  public classifyTechnology(techName: string): ClassificationResult {
    try {
      if (!techName || typeof techName !== 'string') {
        return { category: 'others', confidence: 0.5, method: 'default' };
      }

      const normalized = techName.toLowerCase().trim();
      if (normalized.length === 0) {
        return { category: 'others', confidence: 0.5, method: 'default' };
      }

      // Check cache first
      if (this.classificationCache.has(normalized)) {
        return this.classificationCache.get(normalized)!;
      }

      let result: ClassificationResult;

      // 1. Exact match lookup
      const exactMatch = this.categoryMappings.get(normalized);
      if (exactMatch) {
        result = { category: exactMatch, confidence: 1.0, method: 'exact' };
      } else {
        // 2. Keyword-based classification
        const keywordMatch = this.performKeywordAnalysis(normalized);
        if (keywordMatch.confidence > 0.3) {
          result = keywordMatch;
        } else {
          // 3. Check if it's a Python library that should go to backend
          if (this.isPythonLibrary(normalized)) {
            result = { category: 'backend', confidence: 0.7, method: 'python-library' };
          } else {
            // 4. Default to others
            result = { category: 'others', confidence: 0.5, method: 'default' };
          }
        }
      }

      // Cache the result
      this.classificationCache.set(normalized, result);
      return result;
    } catch (error) {
      this.errorHandler.logError(
        'Error classifying technology',
        error,
        'TechnologyCategorizer'
      );
      return { category: 'others', confidence: 0.5, method: 'default' };
    }
  }

  /**
   * Check if a technology is a Python library that should be categorized as backend
   */
  private isPythonLibrary(techName: string): boolean {
    // Common Python library patterns
    const pythonLibraryPatterns = [
      // Common Python library suffixes/patterns
      /^py[a-z]/,  // starts with 'py'
      /[a-z]py$/,  // ends with 'py'
      
      // Common Python library names (partial matches)
      /numpy/, /pandas/, /matplotlib/, /seaborn/, /plotly/,
      /scipy/, /sklearn/, /scikit/, /tensorflow/, /pytorch/, /keras/,
      /pillow/, /opencv/, /imageio/, /requests/, /httpx/, /aiohttp/,
      /sqlalchemy/, /psycopg/, /pymongo/, /redis/, /celery/,
      /pytest/, /unittest/, /mock/, /coverage/, /tox/,
      /black/, /flake8/, /mypy/, /isort/, /bandit/, /pylint/,
      /sphinx/, /mkdocs/, /jinja/, /click/, /typer/,
      /pydantic/, /marshmallow/, /alembic/, /boto3/,
      /beautifulsoup/, /scrapy/, /lxml/, /yaml/, /toml/
    ];
    
    return pythonLibraryPatterns.some(pattern => pattern.test(techName));
  }

  /**
   * Perform keyword-based analysis
   */
  private performKeywordAnalysis(techName: string): ClassificationResult {
    const scores = new Map<string, number>();
    
    for (const [category, keywords] of this.keywordMappings) {
      let score = 0;
      let matches = 0;
      
      for (const keyword of keywords) {
        if (techName.includes(keyword)) {
          score += 1;
          matches++;
        }
      }
      
      // Calculate confidence based on matches and keyword relevance
      const confidence = matches > 0 ? (score / keywords.length) * (matches / keywords.length) : 0;
      scores.set(category, confidence);
    }
    
    // Find the best match
    const bestMatch = Array.from(scores.entries())
      .sort(([,a], [,b]) => b - a)[0];
    
    return {
      category: bestMatch[0],
      confidence: bestMatch[1],
      method: 'keyword'
    };
  }

  /**
   * Comprehensive technology detection from analysis data
   */
  private detectTechnologiesFromAnalysisData(
    analysisData: any, 
    categories: Map<string, TechnologyCategory>
  ): void {
    try {
      this.errorHandler.logError(
        'Starting comprehensive technology detection from analysis data',
        null,
        'TechnologyCategorizer'
      );
      
      // Detect from file extensions and names
      this.detectFromFileStructure(analysisData, categories);
      
      // Detect databases from environment and config
      this.detectDatabasesFromEnvironment(analysisData, categories);
      
      // Detect Python-specific technologies
      this.detectPythonTechnologies(analysisData, categories);
      
      // Detect Docker and containerization
      this.detectContainerizationTechnologies(analysisData, categories);
      
      // Detect frontend technologies from templates
      this.detectFrontendFromTemplates(analysisData, categories);
      
      this.errorHandler.logError(
        'Completed comprehensive technology detection',
        null,
        'TechnologyCategorizer'
      );
      
    } catch (error) {
      this.errorHandler.logError(
        'Error detecting technologies from analysis data',
        error,
        'TechnologyCategorizer'
      );
    }
  }

  /**
   * Detect technologies from file structure and extensions
   */
  private detectFromFileStructure(
    analysisData: any, 
    categories: Map<string, TechnologyCategory>
  ): void {
    try {
      this.errorHandler.logError(
        'Detecting from file structure...',
        null,
        'TechnologyCategorizer'
      );
      
      // Check code_graph_json for file structure
      if (analysisData?.code_graph_json && Array.isArray(analysisData.code_graph_json)) {
        this.errorHandler.logError(
          `Analyzing ${analysisData.code_graph_json.length} items in code_graph_json`,
          null,
          'TechnologyCategorizer'
        );
        this.analyzeFileStructure(analysisData.code_graph_json, categories);
      } else {
        this.errorHandler.logError(
          'No code_graph_json found in analysis data',
          null,
          'TechnologyCategorizer'
        );
      }
      
      // Check config_files for specific files (if available)
      if (analysisData?.tech_stack?.config_files && Array.isArray(analysisData.tech_stack.config_files)) {
        this.errorHandler.logError(
          `Found ${analysisData.tech_stack.config_files.length} config files`,
          null,
          'TechnologyCategorizer'
        );
        analysisData.tech_stack.config_files.forEach((file: string) => {
          this.categorizeFileByName(file, categories);
        });
      } else {
        this.errorHandler.logError(
          'No config_files found in tech_stack',
          null,
          'TechnologyCategorizer'
        );
      }
    } catch (error) {
      this.errorHandler.logError(
        'Error detecting from file structure',
        error,
        'TechnologyCategorizer'
      );
    }
  }

  /**
   * Analyze file structure recursively
   */
  private analyzeFileStructure(fileStructure: any[], categories: Map<string, TechnologyCategory>): void {
    const analyzeRecursively = (items: any[], depth: number = 0) => {
      if (depth > 10) {return;} // Prevent infinite recursion
      
      items.forEach(item => {
        if (item.name) {
          this.categorizeFileByName(item.name, categories);
        }
        
        // Check for nested files
        if (item.files && Array.isArray(item.files)) {
          analyzeRecursively(item.files, depth + 1);
        }
        
        // Check for nested functions/classes that might indicate file types
        if (item.functions && Array.isArray(item.functions)) {
          // If there are functions, this is likely a Python file
          this.addTechnologyToCategory('Python', 'backend', categories, 0.8);
        }
        
        // Check for nested classes
        if (item.classes && Array.isArray(item.classes)) {
          // If there are classes, this is likely a Python file
          this.addTechnologyToCategory('Python', 'backend', categories, 0.8);
        }
      });
    };
    
    analyzeRecursively(fileStructure);
  }

  /**
   * Categorize file by name and extension
   */
  private categorizeFileByName(fileName: string, categories: Map<string, TechnologyCategory>): void {
    const lowerFileName = fileName.toLowerCase();
    
    // Docker files
    if (lowerFileName.includes('docker-compose') || lowerFileName === 'dockerfile') {
      this.addTechnologyToCategory('Docker', 'devops', categories, 0.9);
      if (lowerFileName.includes('compose')) {
        this.addTechnologyToCategory('Docker Compose', 'devops', categories, 0.9);
      }
    }
    
    // HTML files
    if (lowerFileName.endsWith('.html') || lowerFileName.endsWith('.htm')) {
      this.addTechnologyToCategory('HTML', 'frontend', categories, 0.8);
    }
    
    // Python files
    if (lowerFileName.endsWith('.py')) {
      this.addTechnologyToCategory('Python', 'backend', categories, 0.9);
    }
    
    // CSS files
    if (lowerFileName.endsWith('.css') || lowerFileName.endsWith('.scss') || lowerFileName.endsWith('.sass')) {
      this.addTechnologyToCategory('CSS', 'frontend', categories, 0.8);
    }
    
    // JavaScript files
    if (lowerFileName.endsWith('.js') || lowerFileName.endsWith('.jsx') || lowerFileName.endsWith('.ts') || lowerFileName.endsWith('.tsx')) {
      this.addTechnologyToCategory('JavaScript', 'frontend', categories, 0.8);
    }
    
    // Configuration files
    if (lowerFileName === 'requirements.txt' || lowerFileName === 'pyproject.toml') {
      this.addTechnologyToCategory('pip', 'backend', categories, 0.8);
    }
    
    if (lowerFileName === 'package.json') {
      this.addTechnologyToCategory('npm', 'frontend', categories, 0.8);
    }
  }

  /**
   * Add technology to specific category
   */
  private addTechnologyToCategory(
    techName: string, 
    categoryName: string, 
    categories: Map<string, TechnologyCategory>, 
    confidence: number
  ): void {
    const category = categories.get(categoryName);
    if (category) {
      // Check if already exists to avoid duplicates
      const exists = category.technologies.some(tech => 
        tech.name.toLowerCase() === techName.toLowerCase()
      );
      
      if (!exists) {
        category.technologies.push({
          name: techName,
          category: categoryName as any,
          subcategory: 'miscellaneous' as any, // Default subcategory for legacy compatibility
          confidence: confidence
        });
        category.count++;
      }
    }
  }

  /**
   * Detect Python-specific technologies
   */
  private detectPythonTechnologies(
    analysisData: any, 
    categories: Map<string, TechnologyCategory>
  ): void {
    try {
      this.errorHandler.logError(
        'Detecting Python technologies...',
        null,
        'TechnologyCategorizer'
      );
      
      // Check if Python files exist or Python is mentioned
      const hasPythonFiles = this.hasFileExtension(analysisData, '.py');
      const hasRequirementsTxt = this.hasConfigFile(analysisData, 'requirements.txt');
      const hasPyprojectToml = this.hasConfigFile(analysisData, 'pyproject.toml');
      
      // Also check if we have Python libraries or frameworks
      const hasPythonLibraries = this.hasPythonLibraries(analysisData);
      const hasDjangoFramework = this.hasDjangoFramework(analysisData);
      
      if (hasPythonFiles || hasRequirementsTxt || hasPyprojectToml || hasPythonLibraries || hasDjangoFramework) {
        this.addTechnologyToCategory('Python', 'backend', categories, 0.9);
        
        // Add package manager (default to pip for Python projects)
        this.addTechnologyToCategory('pip', 'backend', categories, 0.8);
        
        if (hasRequirementsTxt) {
          this.addTechnologyToCategory('pip', 'backend', categories, 0.9);
        }
        if (hasPyprojectToml) {
          this.addTechnologyToCategory('Poetry', 'backend', categories, 0.8);
        }
      }
      
      // Detect Django from common patterns or libraries
      if (this.hasDjangoPattern(analysisData) || hasDjangoFramework) {
        this.addTechnologyToCategory('Django', 'backend', categories, 0.9);
      }
      
    } catch (error) {
      this.errorHandler.logError(
        'Error detecting Python technologies',
        error,
        'TechnologyCategorizer'
      );
    }
  }

  /**
   * Detect containerization technologies
   */
  private detectContainerizationTechnologies(
    analysisData: any, 
    categories: Map<string, TechnologyCategory>
  ): void {
    try {
      this.errorHandler.logError(
        'Detecting containerization technologies...',
        null,
        'TechnologyCategorizer'
      );
      
      // Check for Docker files in config_files
      const hasDockerfile = this.hasConfigFile(analysisData, 'dockerfile');
      const hasDockerCompose = this.hasConfigFile(analysisData, 'docker-compose.yml') ||
                               this.hasConfigFile(analysisData, 'docker-compose.yaml');
      
      // Also check in code_graph_json structure
      const hasDockerInStructure = this.hasDockerFilesInStructure(analysisData);
      
      if (hasDockerfile || hasDockerInStructure.dockerfile) {
        this.addTechnologyToCategory('Docker', 'devops', categories, 0.9);
      }
      
      if (hasDockerCompose || hasDockerInStructure.compose) {
        this.addTechnologyToCategory('Docker', 'devops', categories, 0.9);
        this.addTechnologyToCategory('Docker Compose', 'devops', categories, 0.9);
      }
      
    } catch (error) {
      this.errorHandler.logError(
        'Error detecting containerization technologies',
        error,
        'TechnologyCategorizer'
      );
    }
  }

  private hasDockerFilesInStructure(analysisData: any): { dockerfile: boolean; compose: boolean } {
    if (!analysisData?.code_graph_json) {
      return { dockerfile: false, compose: false };
    }
    
    const searchRecursively = (items: any[]): { dockerfile: boolean; compose: boolean } => {
      let result = { dockerfile: false, compose: false };
      
      for (const item of items) {
        if (item.name) {
          const name = item.name.toLowerCase();
          if (name === 'dockerfile') {
            result.dockerfile = true;
          }
          if (name.includes('docker-compose')) {
            result.compose = true;
          }
        }
        
        if (item.files && Array.isArray(item.files)) {
          const nestedResult = searchRecursively(item.files);
          result.dockerfile = result.dockerfile || nestedResult.dockerfile;
          result.compose = result.compose || nestedResult.compose;
        }
      }
      
      return result;
    };
    
    return searchRecursively(analysisData.code_graph_json);
  }

  /**
   * Detect frontend technologies from templates
   */
  private detectFrontendFromTemplates(
    analysisData: any, 
    categories: Map<string, TechnologyCategory>
  ): void {
    try {
      // Check for HTML files in templates directory
      if (this.hasTemplateFiles(analysisData)) {
        this.addTechnologyToCategory('HTML', 'frontend', categories, 0.8);
        
        // If it's in a Django-like structure, likely using Django templates
        if (this.hasDjangoPattern(analysisData)) {
          this.addTechnologyToCategory('Django Templates', 'frontend', categories, 0.7);
        }
      }
    } catch (error) {
      this.errorHandler.logError(
        'Error detecting frontend from templates',
        error,
        'TechnologyCategorizer'
      );
    }
  }

  /**
   * Helper methods for detection
   */
  private hasFileExtension(analysisData: any, extension: string): boolean {
    if (analysisData?.code_graph_json) {
      return this.searchForExtensionInStructure(analysisData.code_graph_json, extension);
    }
    return false;
  }

  private searchForExtensionInStructure(structure: any[], extension: string): boolean {
    for (const item of structure) {
      if (item.name && item.name.toLowerCase().endsWith(extension)) {
        return true;
      }
      if (item.files && Array.isArray(item.files)) {
        for (const file of item.files) {
          if (file.name && file.name.toLowerCase().endsWith(extension)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private hasConfigFile(analysisData: any, fileName: string): boolean {
    if (analysisData?.tech_stack?.config_files) {
      return analysisData.tech_stack.config_files.some((file: string) => 
        file.toLowerCase().includes(fileName.toLowerCase())
      );
    }
    return false;
  }

  private hasPythonLibraries(analysisData: any): boolean {
    if (analysisData?.tech_stack?.libraries) {
      const pythonLibraries = ['django', 'flask', 'fastapi', 'requests', 'numpy', 'pandas', 'psycopg2'];
      return analysisData.tech_stack.libraries.some((lib: any) => {
        const libName = typeof lib === 'string' ? lib : lib.name;
        return pythonLibraries.some(pyLib => libName?.toLowerCase().includes(pyLib));
      });
    }
    return false;
  }

  private hasDjangoFramework(analysisData: any): boolean {
    if (analysisData?.tech_stack?.frameworks) {
      return analysisData.tech_stack.frameworks.some((fw: any) => {
        const fwName = typeof fw === 'string' ? fw : fw.name;
        return fwName?.toLowerCase().includes('django');
      });
    }
    if (analysisData?.tech_stack?.libraries) {
      return analysisData.tech_stack.libraries.some((lib: any) => {
        const libName = typeof lib === 'string' ? lib : lib.name;
        return libName?.toLowerCase().includes('django');
      });
    }
    return false;
  }

  private hasDjangoPattern(analysisData: any): boolean {
    // Check for Django-specific patterns in file structure
    if (analysisData?.code_graph_json) {
      return this.searchForDjangoPatternInStructure(analysisData.code_graph_json);
    }
    
    // Check for Django-specific patterns in config files
    const djangoIndicators = [
      'manage.py', 'settings.py', 'urls.py', 'wsgi.py', 'asgi.py'
    ];
    
    if (analysisData?.tech_stack?.config_files) {
      return djangoIndicators.some(indicator => 
        analysisData.tech_stack.config_files.some((file: string) => 
          file.toLowerCase().includes(indicator)
        )
      );
    }
    return false;
  }

  private searchForDjangoPatternInStructure(structure: any[]): boolean {
    const searchRecursively = (items: any[]): boolean => {
      for (const item of items) {
        if (item.name) {
          const name = item.name.toLowerCase();
          if (name.includes('manage.py') || name.includes('settings.py') || name.includes('urls.py')) {
            return true;
          }
        }
        if (item.files && Array.isArray(item.files)) {
          if (searchRecursively(item.files)) {
            return true;
          }
        }
      }
      return false;
    };
    
    return searchRecursively(structure);
  }

  private hasTemplateFiles(analysisData: any): boolean {
    // Check for template files or template directories
    if (analysisData?.code_graph_json) {
      return this.searchForTemplatesInStructure(analysisData.code_graph_json);
    }
    return false;
  }

  private searchForTemplatesInStructure(structure: any[]): boolean {
    for (const item of structure) {
      // Check for templates directory
      if (item.name && item.name.toLowerCase().includes('template')) {
        return true;
      }
      
      // Check for HTML files
      if (item.files && Array.isArray(item.files)) {
        for (const file of item.files) {
          if (file.name && file.name.toLowerCase().endsWith('.html')) {
            return true;
          }
        }
      }
      
      // Recursively search in subdirectories
      if (item.files && Array.isArray(item.files)) {
        if (this.searchForTemplatesInStructure(item.files)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Detect databases from environment variables and configuration files
   */
  private detectDatabasesFromEnvironment(
    analysisData: any, 
    categories: Map<string, TechnologyCategory>
  ): void {
    try {
      const detectedDatabases = new Set<string>();
      
      // Check environment variables from .env files
      this.detectDatabasesFromEnvFiles(analysisData, detectedDatabases);
      
      // Check configuration files (settings.py, config files, etc.)
      this.detectDatabasesFromConfigFiles(analysisData, detectedDatabases);
      
      // Check connection strings and URLs
      this.detectDatabasesFromConnectionStrings(analysisData, detectedDatabases);
      
      // Add detected databases to categories
      const databaseCategory = categories.get('databases');
      if (databaseCategory) {
        detectedDatabases.forEach(dbName => {
          // Check if already exists to avoid duplicates
          const exists = databaseCategory.technologies.some(tech => 
            tech.name.toLowerCase() === dbName.toLowerCase()
          );
          
          if (!exists) {
            databaseCategory.technologies.push({
              name: dbName,
              category: 'databases',
              subcategory: 'miscellaneous' as any, // Default subcategory for legacy compatibility
              confidence: 0.8 // High confidence for environment detection
            });
            databaseCategory.count++;
          }
        });
      }
    } catch (error) {
      this.errorHandler.logError(
        'Error detecting databases from environment',
        error,
        'TechnologyCategorizer'
      );
    }
  }

  /**
   * Detect databases from .env files and environment variables
   */
  private detectDatabasesFromEnvFiles(analysisData: any, detectedDatabases: Set<string>): void {
    try {
      // Check if analysis data contains environment file content
      const envPatterns = [
        // Database URL patterns
        /DATABASE_URL.*?:\/\/.*?@.*?\/([^?&\s]+)/gi,
        /DB_URL.*?:\/\/.*?@.*?\/([^?&\s]+)/gi,
        // Specific database environment variables
        /DB_HOST.*?=.*?(postgres|mysql|mongodb|redis)/gi,
        /DATABASE_HOST.*?=.*?(postgres|mysql|mongodb|redis)/gi,
        /DB_ENGINE.*?=.*?(postgres|mysql|sqlite|mongodb|redis)/gi,
        // Connection string patterns
        /mongodb:\/\/.*?\/([^?&\s]+)/gi,
        /postgresql:\/\/.*?\/([^?&\s]+)/gi,
        /mysql:\/\/.*?\/([^?&\s]+)/gi,
        /redis:\/\/.*?\/([^?&\s]*)/gi
      ];

      // Check tech_stack config_files for .env content
      if (analysisData?.tech_stack?.config_files) {
        const configFiles = analysisData.tech_stack.config_files;
        configFiles.forEach((file: string) => {
          if (file.includes('.env') || file.includes('environment')) {
            // Extract database names from common environment variable patterns
            this.extractDatabasesFromEnvPatterns(file, envPatterns, detectedDatabases);
          }
        });
      }

      // Check for common database environment variable names
      const commonDbEnvVars = [
        'postgres', 'postgresql', 'mysql', 'mongodb', 'redis', 
        'sqlite', 'mariadb', 'cassandra', 'elasticsearch'
      ];
      
      commonDbEnvVars.forEach(dbName => {
        // This is a simplified check - in a real implementation, 
        // you'd parse actual .env file contents
        if (this.hasEnvironmentReference(analysisData, dbName)) {
          detectedDatabases.add(dbName);
        }
      });
    } catch (error) {
      this.errorHandler.logError(
        'Error detecting databases from env files',
        error,
        'TechnologyCategorizer'
      );
    }
  }

  /**
   * Detect databases from configuration files
   */
  private detectDatabasesFromConfigFiles(analysisData: any, detectedDatabases: Set<string>): void {
    try {
      // Check Django settings.py patterns
      if (this.hasFramework(analysisData, 'django')) {
        this.detectDjangoDatabases(analysisData, detectedDatabases);
      }
      
      // Check package.json for database dependencies
      if (analysisData?.tech_stack?.libraries) {
        const libraries = analysisData.tech_stack.libraries;
        const dbLibraries = [
          'mongoose', 'sequelize', 'prisma', 'typeorm', 'knex',
          'pg', 'mysql2', 'sqlite3', 'redis', 'ioredis'
        ];
        
        dbLibraries.forEach(lib => {
          if (this.hasLibrary(libraries, lib)) {
            const dbName = this.mapLibraryToDatabase(lib);
            if (dbName) {
              detectedDatabases.add(dbName);
            }
          }
        });
      }
    } catch (error) {
      this.errorHandler.logError(
        'Error detecting databases from config files',
        error,
        'TechnologyCategorizer'
      );
    }
  }

  /**
   * Detect databases from connection strings
   */
  private detectDatabasesFromConnectionStrings(analysisData: any, detectedDatabases: Set<string>): void {
    try {
      const connectionPatterns = [
        { pattern: /postgresql:\/\/|postgres:\/\//gi, database: 'PostgreSQL' },
        { pattern: /mysql:\/\//gi, database: 'MySQL' },
        { pattern: /mongodb:\/\//gi, database: 'MongoDB' },
        { pattern: /redis:\/\//gi, database: 'Redis' },
        { pattern: /sqlite:\/\/|\.db$|\.sqlite$/gi, database: 'SQLite' }
      ];

      // This would ideally scan actual file contents
      // For now, we'll check if these patterns exist in the analysis data
      const dataString = JSON.stringify(analysisData).toLowerCase();
      
      connectionPatterns.forEach(({ pattern, database }) => {
        if (pattern.test(dataString)) {
          detectedDatabases.add(database);
        }
      });
    } catch (error) {
      this.errorHandler.logError(
        'Error detecting databases from connection strings',
        error,
        'TechnologyCategorizer'
      );
    }
  }

  /**
   * Helper methods for database detection
   */
  private extractDatabasesFromEnvPatterns(
    content: string, 
    patterns: RegExp[], 
    detectedDatabases: Set<string>
  ): void {
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Extract database name from match
          const dbName = this.extractDatabaseNameFromMatch(match);
          if (dbName) {
            detectedDatabases.add(dbName);
          }
        });
      }
    });
  }

  private hasEnvironmentReference(analysisData: any, dbName: string): boolean {
    // Simplified check - would need actual file content parsing
    const dataString = JSON.stringify(analysisData).toLowerCase();
    return dataString.includes(dbName.toLowerCase());
  }

  private hasFramework(analysisData: any, frameworkName: string): boolean {
    return analysisData?.tech_stack?.frameworks?.some((fw: any) => 
      (typeof fw === 'string' ? fw : fw.name)?.toLowerCase().includes(frameworkName)
    );
  }

  private hasLibrary(libraries: any, libraryName: string): boolean {
    if (Array.isArray(libraries)) {
      return libraries.some(lib => 
        (typeof lib === 'string' ? lib : lib.name)?.toLowerCase().includes(libraryName)
      );
    } else if (typeof libraries === 'object') {
      return Object.keys(libraries).some(key => 
        key.toLowerCase().includes(libraryName)
      );
    }
    return false;
  }

  private mapLibraryToDatabase(library: string): string | null {
    const mapping: { [key: string]: string } = {
      'mongoose': 'MongoDB',
      'sequelize': 'PostgreSQL/MySQL',
      'prisma': 'PostgreSQL/MySQL',
      'typeorm': 'PostgreSQL/MySQL',
      'pg': 'PostgreSQL',
      'mysql2': 'MySQL',
      'sqlite3': 'SQLite',
      'redis': 'Redis',
      'ioredis': 'Redis',
      'knex': 'PostgreSQL/MySQL'
    };
    return mapping[library.toLowerCase()] || null;
  }

  private detectDjangoDatabases(analysisData: any, detectedDatabases: Set<string>): void {
    // Django typically uses PostgreSQL, MySQL, or SQLite
    // This is a simplified detection - would need actual settings.py parsing
    detectedDatabases.add('PostgreSQL'); // Most common Django database
  }

  private extractDatabaseNameFromMatch(match: string): string | null {
    // Extract database name from connection string or environment variable
    if (match.includes('postgresql') || match.includes('postgres')) {return 'PostgreSQL';}
    if (match.includes('mysql')) {return 'MySQL';}
    if (match.includes('mongodb')) {return 'MongoDB';}
    if (match.includes('redis')) {return 'Redis';}
    if (match.includes('sqlite')) {return 'SQLite';}
    return null;
  }

  /**
   * Get display name for category
   */
  private getCategoryDisplayName(categoryName: string): string {
    const displayNames: { [key: string]: string } = {
      backend: 'Backend',
      frontend: 'Frontend',
      databases: 'Databases',
      devops: 'DevOps',
      others: 'Others'
    };
    return displayNames[categoryName] || categoryName;
  }

  /**
   * Get category styling information
   */
  public getCategoryStyling(categoryName: string): any {
    return categoryStyling[categoryName as keyof typeof categoryStyling] || categoryStyling.others;
  }

  /**
   * Clear classification cache (useful for testing)
   */
  public clearCache(): void {
    this.classificationCache.clear();
  }
}