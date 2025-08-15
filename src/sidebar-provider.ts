import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Interface for analysis data structures
 */
export interface TechStack {
    libraries: Library[];
    pythonVersion: string;
    frameworks: string[];
    packageManager: 'pip' | 'poetry' | 'pipenv';
}

export interface Library {
    name: string;
    version?: string;
    type: 'dependency' | 'dev-dependency';
}

export interface ModuleInfo {
    name: string;
    path: string;
    functions: FunctionInfo[];
    classes: ClassInfo[];
    imports: ImportInfo[];
    complexity: ComplexityScore;
    size_lines: number;
    docstring?: string;
}

export interface FunctionInfo {
    name: string;
    module: string;
    line_number: number;
    complexity: ComplexityScore;
    parameters: Parameter[];
    return_type?: string;
    docstring?: string;
    is_method: boolean;
    is_async: boolean;
}

export interface ClassInfo {
    name: string;
    module: string;
    line_number: number;
    methods: FunctionInfo[];
    base_classes: string[];
    docstring?: string;
}

export interface ImportInfo {
    module: string;
    names: string[];
    alias?: string;
    is_from_import: boolean;
    line_number: number;
}

export interface ComplexityScore {
    cyclomatic: number;
    cognitive: number;
    level: 'low' | 'medium' | 'high';
}

export interface Parameter {
    name: string;
    type_hint?: string;
    default_value?: string;
    is_vararg: boolean;
    is_kwarg: boolean;
}

export interface FrameworkPatterns {
    django?: any;
    flask?: any;
    fastapi?: any;
}

export interface AnalysisData {
    tech_stack: TechStack;
    modules: ModuleInfo[];
    framework_patterns: FrameworkPatterns;
}

/**
 * Tree item types for the sidebar
 */
export enum TreeItemType {
    ROOT = 'root',
    TECH_STACK = 'tech_stack',
    MODULES = 'modules',
    FRAMEWORKS = 'frameworks',
    LIBRARY = 'library',
    MODULE = 'module',
    FUNCTION = 'function',
    CLASS = 'class',
    METHOD = 'method',
    FRAMEWORK = 'framework'
}

/**
 * Custom tree item for the CodeMindMap sidebar
 */
export class CodeMindMapTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly itemType: TreeItemType,
        public readonly data?: any,
        public readonly parent?: CodeMindMapTreeItem
    ) {
        super(label, collapsibleState);
        
        this.contextValue = itemType;
        this.tooltip = this.getTooltip();
        this.iconPath = this.getIcon();
        this.command = this.getCommand();
    }

    /**
     * Get tooltip text for the tree item
     */
    private getTooltip(): string {
        switch (this.itemType) {
            case TreeItemType.LIBRARY:
                const lib = this.data as Library;
                return `${lib.name}${lib.version ? ` (${lib.version})` : ''} - ${lib.type}`;
            
            case TreeItemType.MODULE:
                const module = this.data as ModuleInfo;
                return `${module.name} - ${module.size_lines} lines, complexity: ${module.complexity.level}`;
            
            case TreeItemType.FUNCTION:
                const func = this.data as FunctionInfo;
                return `${func.name} - Line ${func.line_number}, complexity: ${func.complexity.cyclomatic}`;
            
            case TreeItemType.CLASS:
                const cls = this.data as ClassInfo;
                return `${cls.name} - Line ${cls.line_number}, ${cls.methods.length} methods`;
            
            case TreeItemType.METHOD:
                const method = this.data as FunctionInfo;
                return `${method.name} - Line ${method.line_number}, complexity: ${method.complexity.cyclomatic}`;
            
            default:
                return this.label;
        }
    }

    /**
     * Get icon for the tree item
     */
    private getIcon(): vscode.ThemeIcon | undefined {
        switch (this.itemType) {
            case TreeItemType.TECH_STACK:
                return new vscode.ThemeIcon('package');
            
            case TreeItemType.MODULES:
                return new vscode.ThemeIcon('file-directory');
            
            case TreeItemType.FRAMEWORKS:
                return new vscode.ThemeIcon('tools');
            
            case TreeItemType.LIBRARY:
                const lib = this.data as Library;
                return new vscode.ThemeIcon(lib.type === 'dev-dependency' ? 'debug' : 'extensions');
            
            case TreeItemType.MODULE:
                const module = this.data as ModuleInfo;
                return new vscode.ThemeIcon('file-code', this.getComplexityColor(module.complexity.level));
            
            case TreeItemType.FUNCTION:
                const func = this.data as FunctionInfo;
                const funcIcon = func.is_async ? 'symbol-event' : 'symbol-function';
                return new vscode.ThemeIcon(funcIcon, this.getComplexityColor(func.complexity.level));
            
            case TreeItemType.CLASS:
                return new vscode.ThemeIcon('symbol-class');
            
            case TreeItemType.METHOD:
                const method = this.data as FunctionInfo;
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
    private getComplexityColor(level: string): vscode.ThemeColor | undefined {
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
    private getCommand(): vscode.Command | undefined {
        switch (this.itemType) {
            case TreeItemType.MODULE:
            case TreeItemType.FUNCTION:
            case TreeItemType.CLASS:
            case TreeItemType.METHOD:
                return {
                    command: 'codemindmap.navigateToItem',
                    title: 'Navigate to Item',
                    arguments: [this]
                };
            
            default:
                return undefined;
        }
    }
}

/**
 * Tree data provider for the CodeMindMap sidebar
 */
export class SidebarProvider implements vscode.TreeDataProvider<CodeMindMapTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<CodeMindMapTreeItem | undefined | null | void> = new vscode.EventEmitter<CodeMindMapTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<CodeMindMapTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private analysisData: AnalysisData | null = null;
    private filterText: string = '';
    private selectedModule: string | null = null;

    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Update the analysis data and refresh the tree
     */
    public updateAnalysisData(data: AnalysisData | null): void {
        // Validate and normalize the data structure
        if (data) {
            this.analysisData = this.normalizeAnalysisData(data);
        } else {
            this.analysisData = null;
        }
        this.refresh();
    }

    /**
     * Normalize analysis data to handle different formats
     */
    private normalizeAnalysisData(data: any): AnalysisData {
        // Handle the case where modules is an array vs object with nodes
        let modules: ModuleInfo[] = [];
        if (Array.isArray(data.modules)) {
            modules = data.modules;
        } else if (data.modules && Array.isArray(data.modules.nodes)) {
            // Convert from the new format to the expected format
            modules = data.modules.nodes.map((node: any) => ({
                name: node.name || node.id,
                path: node.path,
                functions: [], // Will be populated from functions data
                classes: [],
                imports: [],
                complexity: this.normalizeComplexity(node.complexity),
                size_lines: node.size || 0,
                docstring: node.docstring
            }));
        }

        // Populate functions and classes from the functions data if available
        if (data.functions && Array.isArray(data.functions.nodes)) {
            const functionsByModule = new Map<string, FunctionInfo[]>();
            
            data.functions.nodes.forEach((func: any) => {
                const functionInfo: FunctionInfo = {
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
                functionsByModule.get(func.module)!.push(functionInfo);
            });

            // Add functions to their respective modules
            modules.forEach(module => {
                const moduleFunctions = functionsByModule.get(module.name) || [];
                module.functions = moduleFunctions.filter(f => !f.is_method);
                
                // Group methods by class (simplified approach)
                const methodsByClass = new Map<string, FunctionInfo[]>();
                moduleFunctions.filter(f => f.is_method).forEach(method => {
                    // Extract class name from function ID if available
                    const classMatch = method.name.match(/^(.+)\.(.+)$/);
                    const className = classMatch ? classMatch[1] : 'UnknownClass';
                    
                    if (!methodsByClass.has(className)) {
                        methodsByClass.set(className, []);
                    }
                    methodsByClass.get(className)!.push(method);
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
    private normalizeComplexity(complexity: any): ComplexityScore {
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
    public setFilter(filterText: string): void {
        this.filterText = filterText.toLowerCase();
        this.refresh();
    }

    /**
     * Clear the filter
     */
    public clearFilter(): void {
        this.filterText = '';
        this.refresh();
    }

    /**
     * Select a module and highlight its dependencies
     */
    public selectModule(moduleName: string): void {
        this.selectedModule = moduleName;
        this.refresh();
    }

    /**
     * Clear module selection
     */
    public clearSelection(): void {
        this.selectedModule = null;
        this.refresh();
    }

    /**
     * Get dependencies for a module
     */
    public getModuleDependencies(moduleName: string): string[] {
        if (!this.analysisData) {
            return [];
        }

        const module = this.analysisData.modules.find(m => m.name === moduleName);
        if (!module) {
            return [];
        }

        return module.imports.map(imp => imp.module).filter(dep => 
            // Only include dependencies that are also modules in our project
            this.analysisData!.modules.some(m => m.name.includes(dep) || dep.includes(m.name))
        );
    }

    /**
     * Get modules that depend on the given module
     */
    public getModuleDependents(moduleName: string): string[] {
        if (!this.analysisData) {
            return [];
        }

        const dependents: string[] = [];
        
        this.analysisData.modules.forEach(module => {
            const hasDependency = module.imports.some(imp => 
                imp.module === moduleName || 
                imp.module.includes(moduleName) || 
                moduleName.includes(imp.module)
            );
            
            if (hasDependency && module.name !== moduleName) {
                dependents.push(module.name);
            }
        });

        return dependents;
    }

    /**
     * Refresh the tree view
     */
    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Get tree item representation
     */
    getTreeItem(element: CodeMindMapTreeItem): vscode.TreeItem {
        return element;
    }

    /**
     * Get children of a tree item
     */
    getChildren(element?: CodeMindMapTreeItem): Thenable<CodeMindMapTreeItem[]> {
        if (!this.analysisData) {
            return Promise.resolve([
                new CodeMindMapTreeItem(
                    'No analysis data available',
                    vscode.TreeItemCollapsibleState.None,
                    TreeItemType.ROOT
                )
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
                return Promise.resolve(this.getModuleItemChildren(element.data as ModuleInfo));
            
            case TreeItemType.CLASS:
                return Promise.resolve(this.getClassChildren(element.data as ClassInfo));
            
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
    private getRootItems(): CodeMindMapTreeItem[] {
        const items: CodeMindMapTreeItem[] = [];

        // Tech Stack section
        items.push(new CodeMindMapTreeItem(
            `Tech Stack (${this.analysisData!.tech_stack.libraries.length} libraries)`,
            vscode.TreeItemCollapsibleState.Collapsed,
            TreeItemType.TECH_STACK
        ));

        // Modules section
        const moduleCount = this.getFilteredModules().length;
        items.push(new CodeMindMapTreeItem(
            `Modules (${moduleCount})`,
            vscode.TreeItemCollapsibleState.Expanded,
            TreeItemType.MODULES
        ));

        // Frameworks section (if any frameworks detected)
        const frameworks = this.getDetectedFrameworks();
        if (frameworks.length > 0) {
            items.push(new CodeMindMapTreeItem(
                `Frameworks (${frameworks.length})`,
                vscode.TreeItemCollapsibleState.Collapsed,
                TreeItemType.FRAMEWORKS
            ));
        }

        return items;
    }

    /**
     * Get tech stack children
     */
    private getTechStackChildren(): CodeMindMapTreeItem[] {
        const libraries = this.analysisData!.tech_stack.libraries;
        
        return libraries.map(lib => new CodeMindMapTreeItem(
            `${lib.name}${lib.version ? ` (${lib.version})` : ''}`,
            vscode.TreeItemCollapsibleState.None,
            TreeItemType.LIBRARY,
            lib
        ));
    }

    /**
     * Get module children with filtering
     */
    private getModuleChildren(): CodeMindMapTreeItem[] {
        const modules = this.getFilteredModules();
        
        return modules.map(module => {
            const item = new CodeMindMapTreeItem(
                path.basename(module.name),
                vscode.TreeItemCollapsibleState.Collapsed,
                TreeItemType.MODULE,
                module
            );

            // Highlight selected module and its dependencies/dependents
            if (this.selectedModule) {
                const dependencies = this.getModuleDependencies(this.selectedModule);
                const dependents = this.getModuleDependents(this.selectedModule);
                
                if (module.name === this.selectedModule) {
                    item.iconPath = new vscode.ThemeIcon('file-code', new vscode.ThemeColor('charts.blue'));
                    item.description = '(selected)';
                } else if (dependencies.includes(module.name)) {
                    item.iconPath = new vscode.ThemeIcon('file-code', new vscode.ThemeColor('charts.green'));
                    item.description = '(dependency)';
                } else if (dependents.includes(module.name)) {
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
    private getFrameworkChildren(): CodeMindMapTreeItem[] {
        const frameworks = this.getDetectedFrameworks();
        
        return frameworks.map(framework => new CodeMindMapTreeItem(
            framework,
            vscode.TreeItemCollapsibleState.None,
            TreeItemType.FRAMEWORK,
            framework
        ));
    }

    /**
     * Get children for a specific module
     */
    private getModuleItemChildren(module: ModuleInfo): CodeMindMapTreeItem[] {
        const items: CodeMindMapTreeItem[] = [];

        // Add dependencies section if module has imports
        if (module.imports.length > 0) {
            const dependencies = this.getModuleDependencies(module.name);
            if (dependencies.length > 0) {
                items.push(new CodeMindMapTreeItem(
                    `Dependencies (${dependencies.length})`,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    TreeItemType.ROOT, // Using ROOT as a generic container type
                    { type: 'dependencies', module: module.name, items: dependencies }
                ));
            }
        }

        // Add dependents section
        const dependents = this.getModuleDependents(module.name);
        if (dependents.length > 0) {
            items.push(new CodeMindMapTreeItem(
                `Used by (${dependents.length})`,
                vscode.TreeItemCollapsibleState.Collapsed,
                TreeItemType.ROOT, // Using ROOT as a generic container type
                { type: 'dependents', module: module.name, items: dependents }
            ));
        }

        // Add classes
        module.classes.forEach(cls => {
            items.push(new CodeMindMapTreeItem(
                cls.name,
                cls.methods.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                TreeItemType.CLASS,
                cls
            ));
        });

        // Add standalone functions (not methods)
        module.functions.filter(func => !func.is_method).forEach(func => {
            items.push(new CodeMindMapTreeItem(
                func.name,
                vscode.TreeItemCollapsibleState.None,
                TreeItemType.FUNCTION,
                func
            ));
        });

        return items;
    }

    /**
     * Get children for a class (its methods)
     */
    private getClassChildren(cls: ClassInfo): CodeMindMapTreeItem[] {
        return cls.methods.map(method => new CodeMindMapTreeItem(
            method.name,
            vscode.TreeItemCollapsibleState.None,
            TreeItemType.METHOD,
            method
        ));
    }

    /**
     * Get filtered modules based on current filter text
     */
    private getFilteredModules(): ModuleInfo[] {
        if (!this.filterText) {
            return this.analysisData!.modules;
        }

        return this.analysisData!.modules.filter(module => 
            module.name.toLowerCase().includes(this.filterText) ||
            module.functions.some(func => func.name.toLowerCase().includes(this.filterText)) ||
            module.classes.some(cls => cls.name.toLowerCase().includes(this.filterText))
        );
    }

    /**
     * Get children for dependency/dependent containers
     */
    private getDependencyChildren(containerData: any): CodeMindMapTreeItem[] {
        const items: CodeMindMapTreeItem[] = [];
        
        containerData.items.forEach((moduleName: string) => {
            const module = this.analysisData!.modules.find(m => 
                m.name === moduleName || m.name.includes(moduleName) || moduleName.includes(m.name)
            );
            
            if (module) {
                items.push(new CodeMindMapTreeItem(
                    path.basename(module.name),
                    vscode.TreeItemCollapsibleState.None,
                    TreeItemType.MODULE,
                    module
                ));
            } else {
                // External dependency
                items.push(new CodeMindMapTreeItem(
                    moduleName,
                    vscode.TreeItemCollapsibleState.None,
                    TreeItemType.LIBRARY,
                    { name: moduleName, type: 'external' }
                ));
            }
        });

        return items;
    }

    /**
     * Get detected frameworks
     */
    private getDetectedFrameworks(): string[] {
        const frameworks: string[] = [];
        const patterns = this.analysisData!.framework_patterns;

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