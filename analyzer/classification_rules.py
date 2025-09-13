"""
Streamlined classification rules for technology categorization.
Focused on core frameworks, languages, databases, and DevOps tools.
Libraries are auto-detected from requirements.txt, pyproject.toml, etc.
and automatically categorized as SubcategoryType.LIBRARIES.
"""

from tech_stack_types import MainCategory, SubcategoryType

# Main classification rules database
CLASSIFICATION_RULES = {
    "exact_matches": {
        # Backend Languages - Python only
        "python": {
            "main_category": MainCategory.BACKEND,
            "subcategory": SubcategoryType.LANGUAGES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🐍",
                "description": "Python programming language",
                "official_site": "https://python.org"
            }
        },
        
        # Backend Frameworks - Essential Python web frameworks
        "django": {
            "main_category": MainCategory.BACKEND,
            "subcategory": SubcategoryType.FRAMEWORKS,
            "confidence": 1.0,
            "metadata": {
                "icon": "🎸",
                "description": "High-level Python web framework",
                "official_site": "https://djangoproject.com",
                "framework_type": "primary"
            }
        },
        "flask": {
            "main_category": MainCategory.BACKEND,
            "subcategory": SubcategoryType.FRAMEWORKS,
            "confidence": 1.0,
            "metadata": {
                "icon": "🌶️",
                "description": "Lightweight Python web framework",
                "official_site": "https://flask.palletsprojects.com",
                "framework_type": "primary"
            }
        },
        "fastapi": {
            "main_category": MainCategory.BACKEND,
            "subcategory": SubcategoryType.FRAMEWORKS,
            "confidence": 1.0,
            "metadata": {
                "icon": "⚡",
                "description": "Modern, fast Python web framework",
                "official_site": "https://fastapi.tiangolo.com",
                "framework_type": "primary"
            }
        },
        
        # Backend Supporting Libraries and Tools
        "django-rest-framework": {
            "main_category": MainCategory.BACKEND,
            "subcategory": SubcategoryType.LIBRARIES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🎸",
                "description": "Django REST framework for building APIs",
                "official_site": "https://django-rest-framework.org",
                "framework_type": "api-tools"
            }
        },
        "django-cors-headers": {
            "main_category": MainCategory.BACKEND,
            "subcategory": SubcategoryType.LIBRARIES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🎸",
                "description": "Django app for handling CORS headers",
                "official_site": "https://github.com/adamchainz/django-cors-headers",
                "framework_type": "middleware"
            }
        },
        "flask-restful": {
            "main_category": MainCategory.BACKEND,
            "subcategory": SubcategoryType.LIBRARIES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🌶️",
                "description": "Flask extension for building REST APIs",
                "official_site": "https://flask-restful.readthedocs.io",
                "framework_type": "api-tools"
            }
        },
        "flask-sqlalchemy": {
            "main_category": MainCategory.BACKEND,
            "subcategory": SubcategoryType.LIBRARIES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🌶️",
                "description": "Flask extension for SQLAlchemy integration",
                "official_site": "https://flask-sqlalchemy.palletsprojects.com",
                "framework_type": "orm-database"
            }
        },
        "pydantic": {
            "main_category": MainCategory.BACKEND,
            "subcategory": SubcategoryType.LIBRARIES,
            "confidence": 1.0,
            "metadata": {
                "icon": "⚡",
                "description": "Data validation library used with FastAPI",
                "official_site": "https://pydantic-docs.helpmanual.io",
                "framework_type": "api-tools"
            }
        },
        "celery": {
            "main_category": MainCategory.BACKEND,
            "subcategory": SubcategoryType.LIBRARIES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🌿",
                "description": "Distributed task queue",
                "official_site": "https://celeryproject.org",
                "framework_type": "task-queues"
            }
        },
        "gunicorn": {
            "main_category": MainCategory.BACKEND,
            "subcategory": SubcategoryType.LIBRARIES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🦄",
                "description": "Python WSGI HTTP Server",
                "official_site": "https://gunicorn.org",
                "framework_type": "servers"
            }
        },
        "uwsgi": {
            "main_category": MainCategory.BACKEND,
            "subcategory": SubcategoryType.LIBRARIES,
            "confidence": 1.0,
            "metadata": {
                "icon": "⚙️",
                "description": "Python application server",
                "official_site": "https://uwsgi-docs.readthedocs.io",
                "framework_type": "servers"
            }
        },
        "uvicorn": {
            "main_category": MainCategory.BACKEND,
            "subcategory": SubcategoryType.LIBRARIES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🦄",
                "description": "Lightning-fast ASGI server",
                "official_site": "https://uvicorn.org",
                "framework_type": "servers"
            }
        },
        "sqlalchemy": {
            "main_category": MainCategory.BACKEND,
            "subcategory": SubcategoryType.LIBRARIES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🗃️",
                "description": "Python SQL toolkit and ORM",
                "official_site": "https://sqlalchemy.org",
                "framework_type": "orm-database"
            }
        },
        "pytest": {
            "main_category": MainCategory.BACKEND,
            "subcategory": SubcategoryType.LIBRARIES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🧪",
                "description": "Python testing framework",
                "official_site": "https://pytest.org",
                "framework_type": "testing"
            }
        },
        "black": {
            "main_category": MainCategory.BACKEND,
            "subcategory": SubcategoryType.LIBRARIES,
            "confidence": 1.0,
            "metadata": {
                "icon": "⚫",
                "description": "Python code formatter",
                "official_site": "https://black.readthedocs.io",
                "framework_type": "linting"
            }
        },
        "flake8": {
            "main_category": MainCategory.BACKEND,
            "subcategory": SubcategoryType.LIBRARIES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🔍",
                "description": "Python linting tool",
                "official_site": "https://flake8.pycqa.org",
                "framework_type": "linting"
            }
        },
        "mypy": {
            "main_category": MainCategory.BACKEND,
            "subcategory": SubcategoryType.LIBRARIES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🔍",
                "description": "Static type checker for Python",
                "official_site": "https://mypy.readthedocs.io",
                "framework_type": "linting"
            }
        },
        
        # Note: Libraries are auto-detected from requirements.txt, pyproject.toml, etc.
        # and automatically categorized as SubcategoryType.LIBRARIES
        
        # Frontend Languages & Core
        "javascript": {
            "main_category": MainCategory.FRONTEND,
            "subcategory": SubcategoryType.LANGUAGES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🟨",
                "description": "JavaScript programming language",
                "official_site": "https://developer.mozilla.org/en-US/docs/Web/JavaScript"
            }
        },
        "typescript": {
            "main_category": MainCategory.FRONTEND,
            "subcategory": SubcategoryType.LANGUAGES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🔷",
                "description": "TypeScript programming language",
                "official_site": "https://typescriptlang.org"
            }
        },
        "html": {
            "main_category": MainCategory.FRONTEND,
            "subcategory": SubcategoryType.LANGUAGES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🌐",
                "description": "HyperText Markup Language",
                "official_site": "https://developer.mozilla.org/en-US/docs/Web/HTML"
            }
        },
        "css": {
            "main_category": MainCategory.FRONTEND,
            "subcategory": SubcategoryType.LANGUAGES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🎨",
                "description": "Cascading Style Sheets",
                "official_site": "https://developer.mozilla.org/en-US/docs/Web/CSS"
            }
        },
        
        # Frontend Frameworks
        "react": {
            "main_category": MainCategory.FRONTEND,
            "subcategory": SubcategoryType.FRAMEWORKS,
            "confidence": 1.0,
            "metadata": {
                "icon": "⚛️",
                "description": "JavaScript library for building user interfaces",
                "official_site": "https://reactjs.org",
                "framework_type": "primary"
            }
        },
        "vue": {
            "main_category": MainCategory.FRONTEND,
            "subcategory": SubcategoryType.FRAMEWORKS,
            "confidence": 1.0,
            "metadata": {
                "icon": "💚",
                "description": "Progressive JavaScript framework",
                "official_site": "https://vuejs.org",
                "framework_type": "primary"
            }
        },
        "angular": {
            "main_category": MainCategory.FRONTEND,
            "subcategory": SubcategoryType.FRAMEWORKS,
            "confidence": 1.0,
            "metadata": {
                "icon": "🅰️",
                "description": "Platform for building mobile and desktop web applications",
                "official_site": "https://angular.io",
                "framework_type": "primary"
            }
        },
        "svelte": {
            "main_category": MainCategory.FRONTEND,
            "subcategory": SubcategoryType.FRAMEWORKS,
            "confidence": 1.0,
            "metadata": {
                "icon": "🧡",
                "description": "Cybernetically enhanced web apps",
                "official_site": "https://svelte.dev",
                "framework_type": "primary"
            }
        },
        "next.js": {
            "main_category": MainCategory.FRONTEND,
            "subcategory": SubcategoryType.FRAMEWORKS,
            "confidence": 1.0,
            "metadata": {
                "icon": "▲",
                "description": "React framework for production",
                "official_site": "https://nextjs.org",
                "framework_type": "primary"
            }
        },
        "nuxt": {
            "main_category": MainCategory.FRONTEND,
            "subcategory": SubcategoryType.FRAMEWORKS,
            "confidence": 1.0,
            "metadata": {
                "icon": "💚",
                "description": "Vue.js framework",
                "official_site": "https://nuxtjs.org",
                "framework_type": "primary"
            }
        },
        
        # Frontend Supporting Libraries and Tools
        "webpack": {
            "main_category": MainCategory.FRONTEND,
            "subcategory": SubcategoryType.LIBRARIES,
            "confidence": 1.0,
            "metadata": {
                "icon": "📦",
                "description": "Module bundler for JavaScript applications",
                "official_site": "https://webpack.js.org",
                "framework_type": "build-tools"
            }
        },
        "babel": {
            "main_category": MainCategory.FRONTEND,
            "subcategory": SubcategoryType.LIBRARIES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🗼",
                "description": "JavaScript compiler",
                "official_site": "https://babeljs.io",
                "framework_type": "build-tools"
            }
        },
        "eslint": {
            "main_category": MainCategory.FRONTEND,
            "subcategory": SubcategoryType.LIBRARIES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🔍",
                "description": "JavaScript linting utility",
                "official_site": "https://eslint.org",
                "framework_type": "linting"
            }
        },
        "prettier": {
            "main_category": MainCategory.FRONTEND,
            "subcategory": SubcategoryType.LIBRARIES,
            "confidence": 1.0,
            "metadata": {
                "icon": "💅",
                "description": "Code formatter",
                "official_site": "https://prettier.io",
                "framework_type": "linting"
            }
        },
        "jest": {
            "main_category": MainCategory.FRONTEND,
            "subcategory": SubcategoryType.LIBRARIES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🃏",
                "description": "JavaScript testing framework",
                "official_site": "https://jestjs.io",
                "framework_type": "testing"
            }
        },
        "cypress": {
            "main_category": MainCategory.FRONTEND,
            "subcategory": SubcategoryType.LIBRARIES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🌲",
                "description": "End-to-end testing framework",
                "official_site": "https://cypress.io",
                "framework_type": "testing"
            }
        },
        "vite": {
            "main_category": MainCategory.FRONTEND,
            "subcategory": SubcategoryType.LIBRARIES,
            "confidence": 1.0,
            "metadata": {
                "icon": "⚡",
                "description": "Next generation frontend tooling",
                "official_site": "https://vitejs.dev",
                "framework_type": "build-tools"
            }
        },
        
        # SQL Databases
        "postgresql": {
            "main_category": MainCategory.DATABASES,
            "subcategory": SubcategoryType.SQL_DATABASES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🐘",
                "description": "Advanced open source relational database",
                "official_site": "https://postgresql.org"
            }
        },
        "mysql": {
            "main_category": MainCategory.DATABASES,
            "subcategory": SubcategoryType.SQL_DATABASES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🐬",
                "description": "Open-source relational database management system",
                "official_site": "https://mysql.com"
            }
        },
        "sqlite": {
            "main_category": MainCategory.DATABASES,
            "subcategory": SubcategoryType.SQL_DATABASES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🗃️",
                "description": "Self-contained, serverless SQL database engine",
                "official_site": "https://sqlite.org"
            }
        },
        "mariadb": {
            "main_category": MainCategory.DATABASES,
            "subcategory": SubcategoryType.SQL_DATABASES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🌊",
                "description": "Open source relational database",
                "official_site": "https://mariadb.org"
            }
        },
        
        # NoSQL Databases
        "mongodb": {
            "main_category": MainCategory.DATABASES,
            "subcategory": SubcategoryType.NOSQL_DATABASES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🍃",
                "description": "Document-oriented NoSQL database",
                "official_site": "https://mongodb.com"
            }
        },
        "redis": {
            "main_category": MainCategory.DATABASES,
            "subcategory": SubcategoryType.IN_MEMORY,
            "confidence": 1.0,
            "metadata": {
                "icon": "🔴",
                "description": "In-memory data structure store",
                "official_site": "https://redis.io"
            }
        },
        "elasticsearch": {
            "main_category": MainCategory.DATABASES,
            "subcategory": SubcategoryType.NOSQL_DATABASES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🔍",
                "description": "Distributed search and analytics engine",
                "official_site": "https://elastic.co"
            }
        },
        "cassandra": {
            "main_category": MainCategory.DATABASES,
            "subcategory": SubcategoryType.NOSQL_DATABASES,
            "confidence": 1.0,
            "metadata": {
                "icon": "🏛️",
                "description": "Distributed NoSQL database",
                "official_site": "https://cassandra.apache.org"
            }
        },
        
        # DevOps - Containerization
        "docker": {
            "main_category": MainCategory.DEVOPS,
            "subcategory": SubcategoryType.CONTAINERIZATION,
            "confidence": 1.0,
            "metadata": {
                "icon": "🐳",
                "description": "Platform for developing, shipping, and running applications",
                "official_site": "https://docker.com"
            }
        },
        "podman": {
            "main_category": MainCategory.DEVOPS,
            "subcategory": SubcategoryType.CONTAINERIZATION,
            "confidence": 1.0,
            "metadata": {
                "icon": "🦭",
                "description": "Daemonless container engine",
                "official_site": "https://podman.io"
            }
        },
        
        # DevOps - Orchestration
        "kubernetes": {
            "main_category": MainCategory.DEVOPS,
            "subcategory": SubcategoryType.ORCHESTRATION,
            "confidence": 1.0,
            "metadata": {
                "icon": "☸️",
                "description": "Container orchestration platform",
                "official_site": "https://kubernetes.io"
            }
        },
        "docker-compose": {
            "main_category": MainCategory.DEVOPS,
            "subcategory": SubcategoryType.ORCHESTRATION,
            "confidence": 1.0,
            "metadata": {
                "icon": "🐙",
                "description": "Tool for defining multi-container Docker applications",
                "official_site": "https://docs.docker.com/compose/"
            }
        },
        
        # DevOps - CI/CD
        "jenkins": {
            "main_category": MainCategory.DEVOPS,
            "subcategory": SubcategoryType.CI_CD,
            "confidence": 1.0,
            "metadata": {
                "icon": "👨‍🔧",
                "description": "Open source automation server",
                "official_site": "https://jenkins.io"
            }
        },
        "github-actions": {
            "main_category": MainCategory.DEVOPS,
            "subcategory": SubcategoryType.CI_CD,
            "confidence": 1.0,
            "metadata": {
                "icon": "🐙",
                "description": "GitHub's CI/CD platform",
                "official_site": "https://github.com/features/actions"
            }
        },
        "gitlab-ci": {
            "main_category": MainCategory.DEVOPS,
            "subcategory": SubcategoryType.CI_CD,
            "confidence": 1.0,
            "metadata": {
                "icon": "🦊",
                "description": "GitLab's CI/CD platform",
                "official_site": "https://docs.gitlab.com/ee/ci/"
            }
        },
        
        # Package Managers
        "npm": {
            "main_category": MainCategory.FRONTEND,
            "subcategory": SubcategoryType.PACKAGE_MANAGERS,
            "confidence": 1.0,
            "metadata": {
                "icon": "📦",
                "description": "Node.js package manager",
                "official_site": "https://npmjs.com"
            }
        },
        "yarn": {
            "main_category": MainCategory.FRONTEND,
            "subcategory": SubcategoryType.PACKAGE_MANAGERS,
            "confidence": 1.0,
            "metadata": {
                "icon": "🧶",
                "description": "Fast, reliable, and secure dependency management",
                "official_site": "https://yarnpkg.com"
            }
        },
        "pip": {
            "main_category": MainCategory.BACKEND,
            "subcategory": SubcategoryType.PACKAGE_MANAGERS,
            "confidence": 1.0,
            "metadata": {
                "icon": "📦",
                "description": "Python package installer",
                "official_site": "https://pip.pypa.io",
                "display_name": "pip"
            }
        },
        "poetry": {
            "main_category": MainCategory.BACKEND,
            "subcategory": SubcategoryType.PACKAGE_MANAGERS,
            "confidence": 1.0,
            "metadata": {
                "icon": "📝",
                "description": "Python dependency management and packaging",
                "official_site": "https://python-poetry.org"
            }
        },
        "conda": {
            "main_category": MainCategory.BACKEND,
            "subcategory": SubcategoryType.PACKAGE_MANAGERS,
            "confidence": 1.0,
            "metadata": {
                "icon": "🐍",
                "description": "Package, dependency and environment management",
                "official_site": "https://conda.io"
            }
        },
        


    },
    
    "keyword_patterns": [
        {
            "keywords": ["framework", "web-framework", "api-framework"],
            "main_category": MainCategory.BACKEND,
            "subcategory": SubcategoryType.FRAMEWORKS,
            "confidence": 0.7
        },
        {
            "keywords": ["database", "db", "sql", "nosql"],
            "main_category": MainCategory.DATABASES,
            "subcategory": SubcategoryType.SQL_DATABASES,
            "confidence": 0.6
        },
        {
            "keywords": ["deploy", "deployment", "ci", "cd", "pipeline"],
            "main_category": MainCategory.DEVOPS,
            "subcategory": SubcategoryType.CI_CD,
            "confidence": 0.7
        },
        {
            "keywords": ["monitor", "monitoring", "log", "logging", "metrics"],
            "main_category": MainCategory.DEVOPS,
            "subcategory": SubcategoryType.MONITORING,
            "confidence": 0.7
        },
        {
            "keywords": ["container", "containerization", "orchestration"],
            "main_category": MainCategory.DEVOPS,
            "subcategory": SubcategoryType.CONTAINERIZATION,
            "confidence": 0.8
        }
    ],
    
    "category_metadata": {
        MainCategory.BACKEND: {
            "display_name": "Backend",
            "icon": "🔧",
            "description": "Server-side frameworks, languages, and APIs",
            "color": "#4CAF50"
        },
        MainCategory.FRONTEND: {
            "display_name": "Frontend",
            "icon": "🎨",
            "description": "Client-side frameworks, libraries, and UI tools",
            "color": "#2196F3"
        },
        MainCategory.DATABASES: {
            "display_name": "Databases",
            "icon": "🗄️",
            "description": "Database systems and storage solutions",
            "color": "#607D8B"
        },
        MainCategory.DEVOPS: {
            "display_name": "DevOps",
            "icon": "⚙️",
            "description": "Deployment, infrastructure, and operational tools",
            "color": "#FF9800"
        },
        MainCategory.OTHERS: {
            "display_name": "Others",
            "icon": "📦",
            "description": "Development utilities, testing tools, and libraries",
            "color": "#9C27B0"
        }
    },
    
    "subcategory_metadata": {
        SubcategoryType.LANGUAGES: {
            "display_name": "Programming Languages",
            "icon": "💻",
            "order": 1
        },
        SubcategoryType.PACKAGE_MANAGERS: {
            "display_name": "Package Managers",
            "icon": "📦",
            "order": 2
        },
        SubcategoryType.FRAMEWORKS: {
            "display_name": "Frameworks",
            "icon": "🏗️",
            "order": 3
        },
        SubcategoryType.LIBRARIES: {
            "display_name": "Libraries & Tools",
            "icon": "🔧",
            "order": 4
        },
        SubcategoryType.TOOLS: {
            "display_name": "Development Tools",
            "icon": "🛠️",
            "order": 5
        },
        SubcategoryType.SQL_DATABASES: {
            "display_name": "SQL Databases",
            "icon": "🗃️",
            "order": 1
        },
        SubcategoryType.NOSQL_DATABASES: {
            "display_name": "NoSQL Databases",
            "icon": "📊",
            "order": 2
        },
        SubcategoryType.IN_MEMORY: {
            "display_name": "In-Memory Stores",
            "icon": "⚡",
            "order": 3
        },
        SubcategoryType.CONTAINERIZATION: {
            "display_name": "Containerization",
            "icon": "📦",
            "order": 1
        },
        SubcategoryType.ORCHESTRATION: {
            "display_name": "Orchestration",
            "icon": "🎼",
            "order": 2
        },
        SubcategoryType.CI_CD: {
            "display_name": "CI/CD",
            "icon": "🔄",
            "order": 3
        },
        SubcategoryType.MONITORING: {
            "display_name": "Monitoring",
            "icon": "📊",
            "order": 4
        },
        SubcategoryType.TESTING: {
            "display_name": "Testing",
            "icon": "🧪",
            "order": 1
        },
        SubcategoryType.DOCUMENTATION: {
            "display_name": "Documentation",
            "icon": "📚",
            "order": 2
        },
        SubcategoryType.MISCELLANEOUS: {
            "display_name": "Miscellaneous",
            "icon": "🔧",
            "order": 3
        }
    }
}