#!/usr/bin/env python3
"""
Folder Structure Analyzer for DoraCodeLens analyzer.

This module provides functionality to detect and analyze project folder organization,
identifying app/module/package folder types and creating hierarchical structures.
"""

import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import List, Dict, Optional, Set, Any
from enum import Enum

logger = logging.getLogger(__name__)


class FolderType(Enum):
    """Types of folders in a Python project."""
    APP = "app"              # Django app or main application folder
    MODULE = "module"        # Python module/package
    PACKAGE = "package"      # Python package with __init__.py
    UTILITY = "utility"      # Utility/helper folder
    TEST = "test"           # Test folder
    CONFIG = "config"       # Configuration folder
    STATIC = "static"       # Static files folder
    TEMPLATE = "template"   # Template folder
    MIGRATION = "migration" # Database migration folder
    UNKNOWN = "unknown"     # Unknown folder type


@dataclass
class FolderNode:
    """Represents a folder node in the project hierarchy."""
    path: str
    name: str
    type: FolderType
    children: List['FolderNode']
    module_count: int
    complexity: float
    python_files: List[str]
    has_init: bool
    parent: Optional['FolderNode'] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert folder node to dictionary for JSON serialization.
        
        Returns:
            Dictionary representation of the folder node
        """
        return {
            "path": self.path,
            "name": self.name,
            "type": self.type.value,
            "children": [child.to_dict() for child in self.children],
            "moduleCount": self.module_count,
            "complexity": self.complexity,
            "pythonFiles": self.python_files,
            "hasInit": self.has_init,
            "depth": self._calculate_depth()
        }
    
    def _calculate_depth(self) -> int:
        """Calculate the depth of this node in the hierarchy.
        
        Returns:
            Depth level (0 for root)
        """
        depth = 0
        current = self.parent
        while current is not None:
            depth += 1
            current = current.parent
        return depth


@dataclass
class ModuleGrouping:
    """Represents a grouping of modules based on folder structure."""
    folder_path: str
    folder_type: FolderType
    modules: List[str]
    display_name: str
    complexity_summary: Dict[str, Any]


@dataclass
class FolderStructure:
    """Complete folder structure analysis result."""
    root_path: str
    folders: List[FolderNode]
    module_groupings: List[ModuleGrouping]
    total_folders: int
    total_python_files: int
    folder_type_distribution: Dict[str, int]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert folder structure to dictionary for JSON serialization.
        
        Returns:
            Dictionary representation of the folder structure
        """
        return {
            "rootPath": self.root_path,
            "folders": [folder.to_dict() for folder in self.folders],
            "moduleGroupings": [
                {
                    "folderPath": group.folder_path,
                    "folderType": group.folder_type.value,
                    "modules": group.modules,
                    "displayName": group.display_name,
                    "complexitySummary": group.complexity_summary
                }
                for group in self.module_groupings
            ],
            "totalFolders": self.total_folders,
            "totalPythonFiles": self.total_python_files,
            "folderTypeDistribution": self.folder_type_distribution
        }


class FolderStructureAnalyzer:
    """Analyzer for project folder structure and organization."""
    
    def __init__(self, project_path: Path):
        """Initialize the folder structure analyzer.
        
        Args:
            project_path: Path to the project root
        """
        self.project_path = Path(project_path).resolve()
        self.folder_patterns = self._initialize_folder_patterns()
        
    def _initialize_folder_patterns(self) -> Dict[FolderType, List[str]]:
        """Initialize patterns for identifying folder types.
        
        Returns:
            Dictionary mapping folder types to name patterns
        """
        return {
            FolderType.APP: [
                'app', 'apps', 'application', 'main', 'src', 'source'
            ],
            FolderType.MODULE: [
                'module', 'modules', 'lib', 'libs', 'library', 'libraries'
            ],
            FolderType.PACKAGE: [
                # Will be determined by presence of __init__.py
            ],
            FolderType.UTILITY: [
                'util', 'utils', 'utilities', 'helper', 'helpers', 'common', 'shared'
            ],
            FolderType.TEST: [
                'test', 'tests', 'testing', 'spec', 'specs'
            ],
            FolderType.CONFIG: [
                'config', 'configuration', 'settings', 'conf'
            ],
            FolderType.STATIC: [
                'static', 'assets', 'public', 'media'
            ],
            FolderType.TEMPLATE: [
                'template', 'templates', 'view', 'views'
            ],
            FolderType.MIGRATION: [
                'migration', 'migrations', 'migrate'
            ]
        }
    
    def analyze_folder_structure(self, modules: List[Any]) -> FolderStructure:
        """Analyze the folder structure of the project.
        
        Args:
            modules: List of ModuleInfo objects (for complexity calculation)
            
        Returns:
            FolderStructure object with complete analysis
        """
        logger.info(f"Analyzing folder structure for project: {self.project_path}")
        
        # Build folder hierarchy
        root_folders = self._build_folder_hierarchy()
        
        # Analyze folder types
        self._analyze_folder_types(root_folders)
        
        # Calculate folder statistics
        self._calculate_folder_statistics(root_folders, modules)
        
        # Create module groupings
        module_groupings = self._create_module_groupings(root_folders, modules)
        
        # Calculate overall statistics
        total_folders = self._count_total_folders(root_folders)
        total_python_files = self._count_total_python_files(root_folders)
        folder_type_distribution = self._calculate_folder_type_distribution(root_folders)
        
        structure = FolderStructure(
            root_path=str(self.project_path),
            folders=root_folders,
            module_groupings=module_groupings,
            total_folders=total_folders,
            total_python_files=total_python_files,
            folder_type_distribution=folder_type_distribution
        )
        
        logger.info(f"Analyzed {total_folders} folders with {total_python_files} Python files")
        return structure
    
    def _build_folder_hierarchy(self) -> List[FolderNode]:
        """Build the folder hierarchy starting from project root.
        
        Returns:
            List of root-level FolderNode objects
        """
        root_folders = []
        
        try:
            # Get immediate subdirectories
            for item in self.project_path.iterdir():
                if item.is_dir() and not self._should_skip_folder(item):
                    folder_node = self._create_folder_node(item)
                    if folder_node:
                        root_folders.append(folder_node)
            
            logger.debug(f"Built hierarchy with {len(root_folders)} root folders")
            
        except Exception as e:
            logger.error(f"Failed to build folder hierarchy: {e}")
        
        return root_folders
    
    def _should_skip_folder(self, folder_path: Path) -> bool:
        """Determine if a folder should be skipped during analysis.
        
        Args:
            folder_path: Path to the folder
            
        Returns:
            True if the folder should be skipped
        """
        skip_patterns = {
            '.git', '.svn', '.hg',  # Version control
            '__pycache__', '.pytest_cache',  # Python cache
            'node_modules', '.npm',  # Node.js
            '.vscode', '.idea',  # IDE files
            'venv', 'env', '.env',  # Virtual environments
            'build', 'dist', '.egg-info',  # Build artifacts
            '.tox', '.coverage'  # Testing artifacts
        }
        
        folder_name = folder_path.name.lower()
        return (folder_name.startswith('.') and folder_name not in {'.github', '.gitlab'}) or \
               folder_name in skip_patterns
    
    def _create_folder_node(self, folder_path: Path, parent: Optional[FolderNode] = None) -> Optional[FolderNode]:
        """Create a folder node with its children.
        
        Args:
            folder_path: Path to the folder
            parent: Parent folder node (optional)
            
        Returns:
            FolderNode object or None if creation fails
        """
        try:
            # Find Python files in this folder
            python_files = []
            has_init = False
            
            for item in folder_path.iterdir():
                if item.is_file() and item.suffix == '.py':
                    python_files.append(item.name)
                    if item.name == '__init__.py':
                        has_init = True
            
            # Create folder node
            relative_path = folder_path.relative_to(self.project_path)
            folder_node = FolderNode(
                path=str(relative_path),
                name=folder_path.name,
                type=FolderType.UNKNOWN,  # Will be determined later
                children=[],
                module_count=len(python_files),
                complexity=0.0,  # Will be calculated later
                python_files=python_files,
                has_init=has_init,
                parent=parent
            )
            
            # Recursively create child nodes
            for item in folder_path.iterdir():
                if item.is_dir() and not self._should_skip_folder(item):
                    child_node = self._create_folder_node(item, folder_node)
                    if child_node:
                        folder_node.children.append(child_node)
            
            return folder_node
            
        except Exception as e:
            logger.error(f"Failed to create folder node for {folder_path}: {e}")
            return None
    
    def _analyze_folder_types(self, folders: List[FolderNode]) -> None:
        """Analyze and assign types to folders.
        
        Args:
            folders: List of folder nodes to analyze
        """
        for folder in folders:
            folder.type = self._determine_folder_type(folder)
            
            # Recursively analyze children
            if folder.children:
                self._analyze_folder_types(folder.children)
    
    def _determine_folder_type(self, folder: FolderNode) -> FolderType:
        """Determine the type of a folder based on its characteristics.
        
        Args:
            folder: FolderNode to analyze
            
        Returns:
            FolderType enum value
        """
        folder_name = folder.name.lower()
        
        # Check for package (has __init__.py)
        if folder.has_init:
            return FolderType.PACKAGE
        
        # Check against patterns
        for folder_type, patterns in self.folder_patterns.items():
            if folder_name in patterns:
                return folder_type
        
        # Special logic for Django apps
        if self._is_django_app_folder(folder):
            return FolderType.APP
        
        # Check for module-like characteristics
        if folder.module_count > 0:
            return FolderType.MODULE
        
        return FolderType.UNKNOWN
    
    def _is_django_app_folder(self, folder: FolderNode) -> bool:
        """Check if a folder appears to be a Django app.
        
        Args:
            folder: FolderNode to check
            
        Returns:
            True if it appears to be a Django app
        """
        django_files = {'models.py', 'views.py', 'urls.py', 'admin.py', 'apps.py'}
        folder_files = set(folder.python_files)
        
        # If it has at least 2 Django-specific files, consider it a Django app
        return len(django_files.intersection(folder_files)) >= 2
    
    def _calculate_folder_statistics(self, folders: List[FolderNode], modules: List[Any]) -> None:
        """Calculate statistics for folders including complexity.
        
        Args:
            folders: List of folder nodes
            modules: List of ModuleInfo objects
        """
        # Create module path to complexity mapping
        module_complexity_map = {}
        if modules:
            for module in modules:
                try:
                    module_path = Path(module.path)
                    relative_path = module_path.relative_to(self.project_path)
                    folder_path = str(relative_path.parent)
                    
                    if folder_path not in module_complexity_map:
                        module_complexity_map[folder_path] = []
                    
                    module_complexity_map[folder_path].append(module.complexity.cyclomatic)
                except Exception as e:
                    logger.debug(f"Failed to map module complexity for {module.path}: {e}")
        
        # Calculate complexity for each folder
        for folder in folders:
            folder.complexity = self._calculate_folder_complexity(folder, module_complexity_map)
            
            # Recursively calculate for children
            if folder.children:
                self._calculate_folder_statistics(folder.children, modules)
    
    def _calculate_folder_complexity(self, folder: FolderNode, 
                                   complexity_map: Dict[str, List[int]]) -> float:
        """Calculate average complexity for a folder.
        
        Args:
            folder: FolderNode to calculate complexity for
            complexity_map: Mapping of folder paths to complexity values
            
        Returns:
            Average complexity score
        """
        complexities = complexity_map.get(folder.path, [])
        
        if complexities:
            return sum(complexities) / len(complexities)
        
        return 0.0
    
    def _create_module_groupings(self, folders: List[FolderNode], modules: List[Any]) -> List[ModuleGrouping]:
        """Create module groupings based on folder structure.
        
        Args:
            folders: List of folder nodes
            modules: List of ModuleInfo objects
            
        Returns:
            List of ModuleGrouping objects
        """
        groupings = []
        
        # Create module path to name mapping
        module_path_map = {}
        if modules:
            for module in modules:
                try:
                    module_path = Path(module.path)
                    relative_path = module_path.relative_to(self.project_path)
                    folder_path = str(relative_path.parent)
                    
                    if folder_path not in module_path_map:
                        module_path_map[folder_path] = []
                    
                    module_path_map[folder_path].append(module.name)
                except Exception as e:
                    logger.debug(f"Failed to map module path for {module.path}: {e}")
        
        # Create groupings for all folders
        self._create_groupings_recursive(folders, module_path_map, groupings)
        
        return groupings
    
    def _create_groupings_recursive(self, folders: List[FolderNode], 
                                  module_path_map: Dict[str, List[str]], 
                                  groupings: List[ModuleGrouping]) -> None:
        """Recursively create module groupings.
        
        Args:
            folders: List of folder nodes
            module_path_map: Mapping of folder paths to module names
            groupings: List to append groupings to
        """
        for folder in folders:
            modules_in_folder = module_path_map.get(folder.path, [])
            
            if modules_in_folder:
                # Create complexity summary
                complexity_summary = {
                    "averageComplexity": folder.complexity,
                    "moduleCount": len(modules_in_folder),
                    "totalFiles": folder.module_count
                }
                
                # Create display name
                display_name = self._generate_folder_display_name(folder.name, folder.type)
                
                grouping = ModuleGrouping(
                    folder_path=folder.path,
                    folder_type=folder.type,
                    modules=modules_in_folder,
                    display_name=display_name,
                    complexity_summary=complexity_summary
                )
                
                groupings.append(grouping)
            
            # Process children
            if folder.children:
                self._create_groupings_recursive(folder.children, module_path_map, groupings)
    
    def _generate_folder_display_name(self, folder_name: str, folder_type: FolderType) -> str:
        """Generate a display name for a folder.
        
        Args:
            folder_name: Original folder name
            folder_type: Type of the folder
            
        Returns:
            Formatted display name
        """
        # Format the folder name
        display_name = folder_name.replace('_', ' ').replace('-', ' ').title()
        
        # Add type suffix for clarity
        type_suffixes = {
            FolderType.APP: " (App)",
            FolderType.PACKAGE: " (Package)",
            FolderType.TEST: " (Tests)",
            FolderType.CONFIG: " (Config)",
            FolderType.UTILITY: " (Utils)"
        }
        
        suffix = type_suffixes.get(folder_type, "")
        return display_name + suffix
    
    def _count_total_folders(self, folders: List[FolderNode]) -> int:
        """Count total number of folders recursively.
        
        Args:
            folders: List of folder nodes
            
        Returns:
            Total folder count
        """
        count = len(folders)
        for folder in folders:
            count += self._count_total_folders(folder.children)
        return count
    
    def _count_total_python_files(self, folders: List[FolderNode]) -> int:
        """Count total number of Python files recursively.
        
        Args:
            folders: List of folder nodes
            
        Returns:
            Total Python file count
        """
        count = 0
        for folder in folders:
            count += folder.module_count
            count += self._count_total_python_files(folder.children)
        return count
    
    def _calculate_folder_type_distribution(self, folders: List[FolderNode]) -> Dict[str, int]:
        """Calculate distribution of folder types.
        
        Args:
            folders: List of folder nodes
            
        Returns:
            Dictionary mapping folder types to counts
        """
        distribution = {}
        
        def count_types(folder_list: List[FolderNode]) -> None:
            for folder in folder_list:
                folder_type = folder.type.value
                distribution[folder_type] = distribution.get(folder_type, 0) + 1
                count_types(folder.children)
        
        count_types(folders)
        return distribution
    
    def get_folder_by_path(self, folders: List[FolderNode], target_path: str) -> Optional[FolderNode]:
        """Find a folder node by its path.
        
        Args:
            folders: List of folder nodes to search
            target_path: Path to find
            
        Returns:
            FolderNode if found, None otherwise
        """
        for folder in folders:
            if folder.path == target_path:
                return folder
            
            # Search in children
            result = self.get_folder_by_path(folder.children, target_path)
            if result:
                return result
        
        return None