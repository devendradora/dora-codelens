"use strict";
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
exports.SidebarProvider = exports.DoraCodeBirdTreeItem = exports.TreeItemType = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
/**
 * Tree item types for the sidebar
 */
var TreeItemType;
(function (TreeItemType) {
    TreeItemType["ROOT"] = "root";
    TreeItemType["TECH_STACK"] = "tech_stack";
    TreeItemType["MODULES"] = "modules";
    TreeItemType["FRAMEWORKS"] = "frameworks";
    TreeItemType["LIBRARY"] = "library";
    TreeItemType["MODULE"] = "module";
    TreeItemType["FUNCTION"] = "function";
    TreeItemType["CLASS"] = "class";
    TreeItemType["METHOD"] = "method";
    TreeItemType["FRAMEWORK"] = "framework";
})(TreeItemType = exports.TreeItemType || (exports.TreeItemType = {}));
/**
 * Custom tree item for the DoraCodeBirdView sidebar
 */
class DoraCodeBirdTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, itemType, data, parent) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.itemType = itemType;
        this.data = data;
        this.parent = parent;
        this.contextValue = itemType;
        this.tooltip = this.getTooltip();
        this.iconPath = this.getIcon();
        this.command = this.getCommand();
    }
    /**
     * Get tooltip text for the tree item
     */
    getTooltip() {
        switch (this.itemType) {
            case TreeItemType.LIBRARY:
                const lib = this.data;
                return `${lib.name}${lib.version ? ` (${lib.version})` : ''} - ${lib.type}`;
            case TreeItemType.MODULE:
                const module = this.data;
                return `${module.name} - ${module.size_lines} lines, complexity: ${module.complexity.level}`;
            case TreeItemType.FUNCTION:
                const func = this.data;
                return `${func.name} - Line ${func.line_number}, complexity: ${func.complexity.cyclomatic}`;
            case TreeItemType.CLASS:
                const cls = this.data;
                return `${cls.name} - Line ${cls.line_number}, ${cls.methods.length} methods`;
            case TreeItemType.METHOD:
                const method = this.data;
                return `${method.name} - Line ${method.line_number}, complexity: ${method.complexity.cyclomatic}`;
            default:
                return this.label;
        }
    }
    /**
     * Get icon for the tree item
     */
    getIcon() {
        switch (this.itemType) {
            case TreeItemType.TECH_STACK:
                return new vscode.ThemeIcon('package');
            case TreeItemType.MODULES:
                return new vscode.ThemeIcon('file-directory');
            case TreeItemType.FRAMEWORKS:
                return new vscode.ThemeIcon('tools');
            case TreeItemType.LIBRARY:
                const lib = this.data;
                return new vscode.ThemeIcon(lib.type === 'dev-dependency' ? 'debug' : 'extensions');
            case TreeItemType.MODULE:
                const module = this.data;
                return new vscode.ThemeIcon('file-code', this.getComplexityColor(module.complexity.level));
            case TreeItemType.FUNCTION:
                const func = this.data;
                const funcIcon = func.is_async ? 'symbol-event' : 'symbol-function';
                return new vscode.ThemeIcon(funcIcon, this.getComplexityColor(func.complexity.level));
            case TreeItemType.CLASS:
                return new vscode.ThemeIcon('symbol-class');
            case TreeItemType.METHOD:
                const method = this.data;
                const methodIcon = method.is_async ? 'symbol-event' : 'symbol-method';
                return new vscode.ThemeIcon(methodIcon, this.getComplexityColor(method.complexity.level));
            case TreeItemType.FRAMEWORK:
                return new vscode.ThemeIcon('gear');
            default:
                return new vscode.ThemeIcon('circle-outline');
        }
    }
    /**
     * Get color for complexity level
     */
    getComplexityColor(level) {
        switch (level) {
            case 'low':
                return new vscode.ThemeColor('charts.green');
            case 'medium':
                return new vscode.ThemeColor('charts.orange');
            case 'high':
                return new vscode.ThemeColor('charts.red');
            default:
                return undefined;
        }
    }
    /**
     * Get command to execute when item is clicked
     */
    getCommand() {
        switch (this.itemType) {
            case TreeItemType.MODULE:
            case TreeItemType.FUNCTION:
            case TreeItemType.CLASS:
            case TreeItemType.METHOD:
                return {
                    command: 'doracodebird.navigateToItem',
                    title: 'Navigate to Item',
                    arguments: [this]
                };
            default:
                return undefined;
        }
    }
}
exports.DoraCodeBirdTreeItem = DoraCodeBirdTreeItem;
/**
 * Tree data provider for the DoraCodeBirdView sidebar
 */
class SidebarProvider {
    constructor(context) {
        this.context = context;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.analysisData = null;
        this.filterText = '';
        this.selectedModule = null;
    }
    /**
     * Update the analysis data and refresh the tree
     */
    updateAnalysisData(data) {
        // Validate and normalize the data structure
        if (data) {
            this.analysisData = this.normalizeAnalysisData(data);
        }
        else {
            this.analysisData = null;
        }
        this.refresh();
    }
    /**
     * Normalize analysis data to handle different formats
     */
    normalizeAnalysisData(data) {
        // Handle the case where modules is an array vs object with nodes
        let modules = [];
        if (Array.isArray(data.modules)) {
            modules = data.modules;
        }
        else if (data.modules && Array.isArray(data.modules.nodes)) {
            // Convert from the new format to the expected format
            modules = data.modules.nodes.map((node) => ({
                name: node.name || node.id,
                path: node.path,
                functions: [],
                classes: [],
                imports: [],
                complexity: this.normalizeComplexity(node.complexity),
                size_lines: node.size || 0,
                docstring: node.docstring
            }));
        }
        // Populate functions and classes from the functions data if available
        if (data.functions && Array.isArray(data.functions.nodes)) {
            const functionsByModule = new Map();
            data.functions.nodes.forEach((func) => {
                const functionInfo = {
                    name: func.name,
                    module: func.module,
                    line_number: func.line_number || func.lineNumber || 0,
                    complexity: this.normalizeComplexity(func.complexity),
                    parameters: func.parameters || [],
                    return_type: func.return_type,
                    docstring: func.docstring,
                    is_method: func.is_method || false,
                    is_async: func.is_async || false
                };
                if (!functionsByModule.has(func.module)) {
                    functionsByModule.set(func.module, []);
                }
                functionsByModule.get(func.module).push(functionInfo);
            });
            // Add functions to their respective modules
            modules.forEach(module => {
                const moduleFunctions = functionsByModule.get(module.name) || [];
                module.functions = moduleFunctions.filter(f => !f.is_method);
                // Group methods by class (simplified approach)
                const methodsByClass = new Map();
                moduleFunctions.filter(f => f.is_method).forEach(method => {
                    // Extract class name from function ID if available
                    const classMatch = method.name.match(/^(.+)\.(.+)$/);
                    const className = classMatch ? classMatch[1] : 'UnknownClass';
                    if (!methodsByClass.has(className)) {
                        methodsByClass.set(className, []);
                    }
                    methodsByClass.get(className).push(method);
                });
                // Create class info objects
                module.classes = Array.from(methodsByClass.entries()).map(([className, methods]) => ({
                    name: className,
                    module: module.name,
                    line_number: methods[0]?.line_number || 0,
                    methods: methods,
                    base_classes: [],
                    docstring: undefined
                }));
            });
        }
        return {
            tech_stack: data.tech_stack || { libraries: [], pythonVersion: 'Unknown', frameworks: [], packageManager: 'pip' },
            modules: modules,
            framework_patterns: data.framework_patterns || {}
        };
    }
    /**
     * Normalize complexity data to handle different formats
     */
    normalizeComplexity(complexity) {
        if (typeof complexity === 'number') {
            return {
                cyclomatic: complexity,
                cognitive: 0,
                level: complexity <= 5 ? 'low' : complexity <= 10 ? 'medium' : 'high'
            };
        }
        if (complexity && typeof complexity === 'object') {
            return {
                cyclomatic: complexity.cyclomatic || complexity.value || 0,
                cognitive: complexity.cognitive || 0,
                level: complexity.level || (complexity.cyclomatic <= 5 ? 'low' : complexity.cyclomatic <= 10 ? 'medium' : 'high')
            };
        }
        return {
            cyclomatic: 0,
            cognitive: 0,
            level: 'low'
        };
    }
    /**
     * Set filter text for tree items
     */
    setFilter(filterText) {
        this.filterText = filterText.toLowerCase();
        this.refresh();
    }
    /**
     * Clear the filter
     */
    clearFilter() {
        this.filterText = '';
        this.refresh();
    }
    /**
     * Select a module and highlight its dependencies
     */
    selectModule(moduleName) {
        this.selectedModule = moduleName;
        this.refresh();
    }
    /**
     * Clear module selection
     */
    clearSelection() {
        this.selectedModule = null;
        this.refresh();
    }
    /**
     * Get dependencies for a module
     */
    getModuleDependencies(moduleName) {
        if (!this.analysisData) {
            return [];
        }
        const module = this.analysisData.modules.find(m => m.name === moduleName);
        if (!module) {
            return [];
        }
        return module.imports.map(imp => imp.module).filter(dep => 
        // Only include dependencies that are also modules in our project
        this.analysisData.modules.some(m => m.name.includes(dep) || dep.includes(m.name)));
    }
    /**
     * Get modules that depend on the given module
     */
    getModuleDependents(moduleName) {
        if (!this.analysisData) {
            return [];
        }
        const dependents = [];
        this.analysisData.modules.forEach(module => {
            const hasDependency = module.imports.some(imp => imp.module === moduleName ||
                imp.module.includes(moduleName) ||
                moduleName.includes(imp.module));
            if (hasDependency && module.name !== moduleName) {
                dependents.push(module.name);
            }
        });
        return dependents;
    }
    /**
     * Refresh the tree view
     */
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    /**
     * Get tree item representation
     */
    getTreeItem(element) {
        return element;
    }
    /**
     * Get children of a tree item
     */
    getChildren(element) {
        if (!this.analysisData) {
            return Promise.resolve([
                new DoraCodeBirdTreeItem('Run analysis to see project structure', vscode.TreeItemCollapsibleState.None, TreeItemType.ROOT)
            ]);
        }
        if (!element) {
            // Root level items
            return Promise.resolve(this.getRootItems());
        }
        // Child items based on parent type
        switch (element.itemType) {
            case TreeItemType.TECH_STACK:
                return Promise.resolve(this.getTechStackChildren());
            case TreeItemType.MODULES:
                return Promise.resolve(this.getModuleChildren());
            case TreeItemType.FRAMEWORKS:
                return Promise.resolve(this.getFrameworkChildren());
            case TreeItemType.MODULE:
                return Promise.resolve(this.getModuleItemChildren(element.data));
            case TreeItemType.CLASS:
                return Promise.resolve(this.getClassChildren(element.data));
            case TreeItemType.ROOT:
                // Handle dependency/dependent containers
                if (element.data && (element.data.type === 'dependencies' || element.data.type === 'dependents')) {
                    return Promise.resolve(this.getDependencyChildren(element.data));
                }
                return Promise.resolve([]);
            default:
                return Promise.resolve([]);
        }
    }
    /**
     * Get root level tree items
     */
    getRootItems() {
        const items = [];
        // Tech Stack section
        items.push(new DoraCodeBirdTreeItem(`Tech Stack (${this.analysisData.tech_stack.libraries.length} libraries)`, vscode.TreeItemCollapsibleState.Collapsed, TreeItemType.TECH_STACK));
        // Modules section
        const moduleCount = this.getFilteredModules().length;
        items.push(new DoraCodeBirdTreeItem(`Modules (${moduleCount})`, vscode.TreeItemCollapsibleState.Expanded, TreeItemType.MODULES));
        // Frameworks section (if any frameworks detected)
        const frameworks = this.getDetectedFrameworks();
        if (frameworks.length > 0) {
            items.push(new DoraCodeBirdTreeItem(`Frameworks (${frameworks.length})`, vscode.TreeItemCollapsibleState.Collapsed, TreeItemType.FRAMEWORKS));
        }
        return items;
    }
    /**
     * Get tech stack children
     */
    getTechStackChildren() {
        const libraries = this.analysisData.tech_stack.libraries;
        return libraries.map(lib => new DoraCodeBirdTreeItem(`${lib.name}${lib.version ? ` (${lib.version})` : ''}`, vscode.TreeItemCollapsibleState.None, TreeItemType.LIBRARY, lib));
    }
    /**
     * Get module children with filtering
     */
    getModuleChildren() {
        const modules = this.getFilteredModules();
        return modules.map(module => {
            const item = new DoraCodeBirdTreeItem(path.basename(module.name), vscode.TreeItemCollapsibleState.Collapsed, TreeItemType.MODULE, module);
            // Highlight selected module and its dependencies/dependents
            if (this.selectedModule) {
                const dependencies = this.getModuleDependencies(this.selectedModule);
                const dependents = this.getModuleDependents(this.selectedModule);
                if (module.name === this.selectedModule) {
                    item.iconPath = new vscode.ThemeIcon('file-code', new vscode.ThemeColor('charts.blue'));
                    item.description = '(selected)';
                }
                else if (dependencies.includes(module.name)) {
                    item.iconPath = new vscode.ThemeIcon('file-code', new vscode.ThemeColor('charts.green'));
                    item.description = '(dependency)';
                }
                else if (dependents.includes(module.name)) {
                    item.iconPath = new vscode.ThemeIcon('file-code', new vscode.ThemeColor('charts.orange'));
                    item.description = '(dependent)';
                }
            }
            return item;
        });
    }
    /**
     * Get framework children
     */
    getFrameworkChildren() {
        const frameworks = this.getDetectedFrameworks();
        return frameworks.map(framework => new DoraCodeBirdTreeItem(framework, vscode.TreeItemCollapsibleState.None, TreeItemType.FRAMEWORK, framework));
    }
    /**
     * Get children for a specific module
     */
    getModuleItemChildren(module) {
        const items = [];
        // Add dependencies section if module has imports
        if (module.imports.length > 0) {
            const dependencies = this.getModuleDependencies(module.name);
            if (dependencies.length > 0) {
                items.push(new DoraCodeBirdTreeItem(`Dependencies (${dependencies.length})`, vscode.TreeItemCollapsibleState.Collapsed, TreeItemType.ROOT, // Using ROOT as a generic container type
                { type: 'dependencies', module: module.name, items: dependencies }));
            }
        }
        // Add dependents section
        const dependents = this.getModuleDependents(module.name);
        if (dependents.length > 0) {
            items.push(new DoraCodeBirdTreeItem(`Used by (${dependents.length})`, vscode.TreeItemCollapsibleState.Collapsed, TreeItemType.ROOT, // Using ROOT as a generic container type
            { type: 'dependents', module: module.name, items: dependents }));
        }
        // Add classes
        module.classes.forEach(cls => {
            items.push(new DoraCodeBirdTreeItem(cls.name, cls.methods.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None, TreeItemType.CLASS, cls));
        });
        // Add standalone functions (not methods)
        module.functions.filter(func => !func.is_method).forEach(func => {
            items.push(new DoraCodeBirdTreeItem(func.name, vscode.TreeItemCollapsibleState.None, TreeItemType.FUNCTION, func));
        });
        return items;
    }
    /**
     * Get children for a class (its methods)
     */
    getClassChildren(cls) {
        return cls.methods.map(method => new DoraCodeBirdTreeItem(method.name, vscode.TreeItemCollapsibleState.None, TreeItemType.METHOD, method));
    }
    /**
     * Get filtered modules based on current filter text
     */
    getFilteredModules() {
        if (!this.filterText) {
            return this.analysisData.modules;
        }
        return this.analysisData.modules.filter(module => module.name.toLowerCase().includes(this.filterText) ||
            module.functions.some(func => func.name.toLowerCase().includes(this.filterText)) ||
            module.classes.some(cls => cls.name.toLowerCase().includes(this.filterText)));
    }
    /**
     * Get children for dependency/dependent containers
     */
    getDependencyChildren(containerData) {
        const items = [];
        containerData.items.forEach((moduleName) => {
            const module = this.analysisData.modules.find(m => m.name === moduleName || m.name.includes(moduleName) || moduleName.includes(m.name));
            if (module) {
                items.push(new DoraCodeBirdTreeItem(path.basename(module.name), vscode.TreeItemCollapsibleState.None, TreeItemType.MODULE, module));
            }
            else {
                // External dependency
                items.push(new DoraCodeBirdTreeItem(moduleName, vscode.TreeItemCollapsibleState.None, TreeItemType.LIBRARY, { name: moduleName, type: 'external' }));
            }
        });
        return items;
    }
    /**
     * Get detected frameworks
     */
    getDetectedFrameworks() {
        const frameworks = [];
        const patterns = this.analysisData.framework_patterns;
        if (patterns.django) {
            frameworks.push('Django');
        }
        if (patterns.flask) {
            frameworks.push('Flask');
        }
        if (patterns.fastapi) {
            frameworks.push('FastAPI');
        }
        return frameworks;
    }
}
exports.SidebarProvider = SidebarProvider;
//# sourceMappingURL=sidebar-provider.js.map