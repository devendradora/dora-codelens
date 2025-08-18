"use strict";
/**
 * Test configuration and utilities for CodeMindMap extension tests
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestAssertions = exports.TestUtils = exports.TEST_CONFIG = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * Test configuration constants
 */
exports.TEST_CONFIG = {
    // Timeouts
    DEFAULT_TIMEOUT: 10000,
    LONG_TIMEOUT: 30000,
    PERFORMANCE_TIMEOUT: 60000,
    // Test data limits
    MAX_TEST_FILES: 100,
    MAX_FILE_SIZE_KB: 1024,
    // Performance thresholds
    MAX_ACTIVATION_TIME: 5000,
    MAX_COMMAND_EXECUTION_TIME: 3000,
    MAX_FILE_DISCOVERY_TIME: 5000,
    // Test workspace settings
    TEMP_WORKSPACE_PREFIX: 'codemindmap-test-',
    // Mock data sizes
    SMALL_PROJECT_FILES: 5,
    MEDIUM_PROJECT_FILES: 20,
    LARGE_PROJECT_FILES: 50
};
/**
 * Test utilities for creating mock data and managing test environments
 */
class TestUtils {
    /**
     * Create a temporary workspace directory
     */
    static createTempWorkspace() {
        const tempDir = path.join(__dirname, `${exports.TEST_CONFIG.TEMP_WORKSPACE_PREFIX}${Date.now()}`);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        return tempDir;
    }
    /**
     * Clean up a temporary workspace directory
     */
    static cleanupTempWorkspace(workspaceDir) {
        if (fs.existsSync(workspaceDir) && workspaceDir.includes(exports.TEST_CONFIG.TEMP_WORKSPACE_PREFIX)) {
            fs.rmSync(workspaceDir, { recursive: true, force: true });
        }
    }
    /**
     * Create a simple Python file with specified content
     */
    static createPythonFile(filePath, content) {
        fs.writeFileSync(filePath, content);
    }
    /**
     * Create a mock Python project structure
     */
    static createMockPythonProject(workspaceDir, fileCount = exports.TEST_CONFIG.SMALL_PROJECT_FILES) {
        // Create main module
        const mainContent = `
"""Main module for test project."""

import utils
from models import User

def main():
    """Main function."""
    user = User("Test User")
    result = utils.process_user(user)
    return result

if __name__ == "__main__":
    main()
`;
        this.createPythonFile(path.join(workspaceDir, 'main.py'), mainContent);
        // Create utils module
        const utilsContent = `
"""Utility functions."""

def process_user(user):
    """Process a user object."""
    if not user or not user.name:
        return None
    
    processed_name = user.name.strip().title()
    return {
        'name': processed_name,
        'length': len(processed_name),
        'valid': len(processed_name) > 0
    }

def helper_function(data):
    """Helper function with some complexity."""
    result = []
    for item in data:
        if isinstance(item, str):
            result.append(item.upper())
        elif isinstance(item, int):
            if item % 2 == 0:
                result.append(item * 2)
            else:
                result.append(item * 3)
        else:
            result.append(str(item))
    return result
`;
        this.createPythonFile(path.join(workspaceDir, 'utils.py'), utilsContent);
        // Create models module
        const modelsContent = `
"""Data models."""

class User:
    """User model."""
    
    def __init__(self, name, email=None):
        self.name = name
        self.email = email
        self.created_at = None
    
    def __str__(self):
        return f"User(name='{self.name}', email='{self.email}')"
    
    def validate(self):
        """Validate user data."""
        if not self.name or len(self.name.strip()) == 0:
            return False
        
        if self.email:
            if '@' not in self.email or '.' not in self.email:
                return False
        
        return True

class UserManager:
    """Manages user operations."""
    
    def __init__(self):
        self.users = []
    
    def add_user(self, user):
        """Add a user."""
        if user.validate():
            self.users.append(user)
            return True
        return False
    
    def get_user_by_name(self, name):
        """Get user by name."""
        for user in self.users:
            if user.name == name:
                return user
        return None
`;
        this.createPythonFile(path.join(workspaceDir, 'models.py'), modelsContent);
        // Create additional files if requested
        for (let i = 3; i < fileCount; i++) {
            const additionalContent = `
"""Additional module ${i}."""

def function_${i}(param):
    """Function ${i}."""
    return param * ${i}

class Class${i}:
    """Class ${i}."""
    
    def method_${i}(self, value):
        """Method ${i}."""
        return value + ${i}
`;
            this.createPythonFile(path.join(workspaceDir, `module_${i}.py`), additionalContent);
        }
        // Create requirements.txt
        const requirementsContent = `
pytest==7.0.0
requests==2.28.0
`;
        fs.writeFileSync(path.join(workspaceDir, 'requirements.txt'), requirementsContent.trim());
    }
    /**
     * Create a mock Django project structure
     */
    static createMockDjangoProject(workspaceDir) {
        // Create Django-style URLs
        const urlsContent = `
from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('users/', views.user_list, name='user_list'),
    path('users/<int:user_id>/', views.user_detail, name='user_detail'),
]
`;
        this.createPythonFile(path.join(workspaceDir, 'urls.py'), urlsContent);
        // Create Django-style views
        const viewsContent = `
from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse, JsonResponse
from .models import User

def index(request):
    """Home page view."""
    return render(request, 'index.html', {'title': 'Home'})

def user_list(request):
    """List all users."""
    users = User.objects.all()
    return render(request, 'users/list.html', {'users': users})

def user_detail(request, user_id):
    """Show user details."""
    user = get_object_or_404(User, id=user_id)
    return render(request, 'users/detail.html', {'user': user})

def api_users(request):
    """API endpoint for users."""
    users = User.objects.all()
    data = [{'id': u.id, 'name': u.name} for u in users]
    return JsonResponse({'users': data})
`;
        this.createPythonFile(path.join(workspaceDir, 'views.py'), viewsContent);
        // Create Django-style models
        const modelsContent = `
from django.db import models

class User(models.Model):
    """User model."""
    name = models.CharField(max_length=100)
    email = models.EmailField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
    def get_absolute_url(self):
        return f'/users/{self.id}/'

class Profile(models.Model):
    """User profile model."""
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True)
    
    def __str__(self):
        return f"{self.user.name}'s Profile"
`;
        this.createPythonFile(path.join(workspaceDir, 'models.py'), modelsContent);
        // Create requirements.txt with Django
        const requirementsContent = `django==4.2.0\npsycopg2-binary==2.9.0`;
        fs.writeFileSync(path.join(workspaceDir, 'requirements.txt'), requirementsContent);
    }
    /**
     * Wait for a specified amount of time
     */
    static async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Measure execution time of a function
     */
    static async measureTime(fn) {
        const startTime = Date.now();
        const result = await fn();
        const time = Date.now() - startTime;
        return { result, time };
    }
    /**
     * Check if extension is available and active
     */
    static async ensureExtensionActive() {
        const extension = vscode.extensions.getExtension('codemindmap.codemindmap');
        if (!extension) {
            throw new Error('CodeMindMap extension not found');
        }
        if (!extension.isActive) {
            await extension.activate();
        }
        return extension;
    }
    /**
     * Execute a command safely (catching errors)
     */
    static async safeExecuteCommand(command, ...args) {
        try {
            await vscode.commands.executeCommand(command, ...args);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
        }
    }
    /**
     * Create a mock analysis data structure for testing
     */
    static createMockAnalysisData() {
        return {
            modules: {
                nodes: [
                    {
                        id: 'main.py',
                        name: 'main.py',
                        path: '/test/main.py',
                        complexity: 5,
                        size: 100,
                        functions: ['main']
                    },
                    {
                        id: 'utils.py',
                        name: 'utils.py',
                        path: '/test/utils.py',
                        complexity: 3,
                        size: 50,
                        functions: ['process_user', 'helper_function']
                    }
                ],
                edges: [
                    {
                        source: 'main.py',
                        target: 'utils.py',
                        type: 'import',
                        weight: 1
                    }
                ]
            },
            functions: {
                nodes: [
                    {
                        id: 'main.main',
                        name: 'main',
                        module: 'main',
                        complexity: 3,
                        lineNumber: 8,
                        parameters: []
                    },
                    {
                        id: 'utils.process_user',
                        name: 'process_user',
                        module: 'utils',
                        complexity: 4,
                        lineNumber: 5,
                        parameters: [
                            {
                                name: 'user',
                                type_hint: undefined,
                                default_value: undefined,
                                is_vararg: false,
                                is_kwarg: false
                            }
                        ]
                    }
                ],
                edges: [
                    {
                        caller: 'main.main',
                        callee: 'utils.process_user',
                        callCount: 1,
                        lineNumbers: [10]
                    }
                ]
            },
            techStack: {
                libraries: [
                    { name: 'pytest', version: '7.0.0', category: 'testing' },
                    { name: 'requests', version: '2.28.0', category: 'http' }
                ],
                pythonVersion: '3.9.0',
                frameworks: [],
                packageManager: 'pip'
            }
        };
    }
}
exports.TestUtils = TestUtils;
/**
 * Test assertions and validation utilities
 */
class TestAssertions {
    /**
     * Assert that a value is within an expected range
     */
    static assertInRange(value, min, max, message) {
        if (value < min || value > max) {
            throw new Error(message || `Expected ${value} to be between ${min} and ${max}`);
        }
    }
    /**
     * Assert that execution time is within acceptable limits
     */
    static assertPerformance(executionTime, maxTime, operation) {
        if (executionTime > maxTime) {
            throw new Error(`${operation} took too long: ${executionTime}ms (max: ${maxTime}ms)`);
        }
    }
    /**
     * Assert that an array has expected structure
     */
    static assertArrayStructure(array, expectedLength, validator, message) {
        if (array.length !== expectedLength) {
            throw new Error(message || `Expected array length ${expectedLength}, got ${array.length}`);
        }
        for (let i = 0; i < array.length; i++) {
            if (!validator(array[i])) {
                throw new Error(message || `Array item at index ${i} failed validation`);
            }
        }
    }
    /**
     * Assert that an object has required properties
     */
    static assertObjectStructure(obj, requiredProps, message) {
        for (const prop of requiredProps) {
            if (!(prop in obj)) {
                throw new Error(message || `Object missing required property: ${prop}`);
            }
        }
    }
}
exports.TestAssertions = TestAssertions;
//# sourceMappingURL=test-config.js.map