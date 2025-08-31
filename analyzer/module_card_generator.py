#!/usr/bin/env python3
"""
Module Card Generator for DoraCodeLens analyzer.

This module provides functionality to generate styled module representations
with complexity-based color coding and folder-based grouping.
"""

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import List, Dict, Optional, Any
from enum import Enum

from analyzer import ModuleInfo, ComplexityLevel

logger = logging.getLogger(__name__)


@dataclass
class Position:
    """Represents position coordinates for module card placement."""
    x: float
    y: float


@dataclass
class CardStyling:
    """Styling information for module cards."""
    background_color: str
    border_color: str
    border_width: int
    border_radius: int
    shadow_style: str
    text_color: str
    font_size: str
    padding: str
    min_width: int
    min_height: int
    
    @classmethod
    def from_complexity(cls, complexity_level: ComplexityLevel) -> 'CardStyling':
        """Create styling based on complexity level.
        
        Args:
            complexity_level: ComplexityLevel enum value
            
        Returns:
            CardStyling object with appropriate colors
        """
        if complexity_level == ComplexityLevel.LOW:
            return cls(
                background_color="linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
                border_color="#27ae60",
                border_width=2,
                border_radius=8,
                shadow_style="0 4px 6px rgba(0, 0, 0, 0.1)",
                text_color="#2c3e50",
                font_size="14px",
                padding="16px",
                min_width=200,
                min_height=120
            )
        elif complexity_level == ComplexityLevel.MEDIUM:
            return cls(
                background_color="linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
                border_color="#f39c12",
                border_width=2,
                border_radius=8,
                shadow_style="0 4px 6px rgba(0, 0, 0, 0.1)",
                text_color="#2c3e50",
                font_size="14px",
                padding="16px",
                min_width=200,
                min_height=120
            )
        else:  # HIGH complexity
            return cls(
                background_color="linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)",
                border_color="#e74c3c",
                border_width=2,
                border_radius=8,
                shadow_style="0 4px 6px rgba(0, 0, 0, 0.1)",
                text_color="#2c3e50",
                font_size="14px",
                padding="16px",
                min_width=200,
                min_height=120
            )


@dataclass
class ModuleMetadata:
    """Additional metadata for module cards."""
    file_count: int
    total_lines: int
    function_count: int
    class_count: int
    import_count: int
    last_modified: Optional[str] = None


@dataclass
class ModuleDependency:
    """Represents a dependency relationship between modules."""
    target_module: str
    dependency_type: str  # 'import', 'from_import', 'internal'
    weight: int = 1


@dataclass
class ModuleCard:
    """Represents a styled module card with all necessary information."""
    id: str
    name: str
    display_name: str
    folder_path: str
    complexity: Dict[str, Any]  # Complexity metrics
    dependencies: List[ModuleDependency]
    styling: CardStyling
    position: Optional[Position]
    metadata: ModuleMetadata
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert module card to dictionary for JSON serialization.
        
        Returns:
            Dictionary representation of the module card
        """
        return {
            "id": self.id,
            "name": self.name,
            "displayName": self.display_name,
            "folderPath": self.folder_path,
            "complexity": self.complexity,
            "dependencies": [
                {
                    "targetModule": dep.target_module,
                    "dependencyType": dep.dependency_type,
                    "weight": dep.weight
                }
                for dep in self.dependencies
            ],
            "styling": {
                "backgroundColor": self.styling.background_color,
                "borderColor": self.styling.border_color,
                "borderWidth": self.styling.border_width,
                "borderRadius": self.styling.border_radius,
                "shadowStyle": self.styling.shadow_style,
                "textColor": self.styling.text_color,
                "fontSize": self.styling.font_size,
                "padding": self.styling.padding,
                "minWidth": self.styling.min_width,
                "minHeight": self.styling.min_height
            },
            "position": {
                "x": self.position.x if self.position else 0,
                "y": self.position.y if self.position else 0
            } if self.position else None,
            "metadata": {
                "fileCount": self.metadata.file_count,
                "totalLines": self.metadata.total_lines,
                "functionCount": self.metadata.function_count,
                "classCount": self.metadata.class_count,
                "importCount": self.metadata.import_count,
                "lastModified": self.metadata.last_modified
            }
        }


class ModuleCardGenerator:
    """Generator for styled module card representations."""
    
    def __init__(self, project_path: Path):
        """Initialize the module card generator.
        
        Args:
            project_path: Path to the project root
        """
        self.project_path = Path(project_path)
        self.module_groups: Dict[str, List[str]] = {}
        
    def generate_module_cards(self, modules: List[ModuleInfo], 
                            dependencies: Dict[str, List[str]]) -> List[ModuleCard]:
        """Generate styled module cards from module information.
        
        Args:
            modules: List of ModuleInfo objects
            dependencies: Dictionary mapping module names to their dependencies
            
        Returns:
            List of ModuleCard objects with styling and positioning
        """
        logger.info(f"Generating module cards for {len(modules)} modules")
        
        # Group modules by folder structure
        self._group_modules_by_folder(modules)
        
        # Generate cards
        cards = []
        for module in modules:
            try:
                card = self._create_module_card(module, dependencies.get(module.name, []))
                cards.append(card)
                logger.debug(f"Generated card for module: {module.name}")
            except Exception as e:
                logger.error(f"Failed to generate card for module {module.name}: {e}")
        
        # Apply positioning based on folder groups
        positioned_cards = self._apply_positioning(cards)
        
        logger.info(f"Successfully generated {len(positioned_cards)} module cards")
        return positioned_cards
    
    def _group_modules_by_folder(self, modules: List[ModuleInfo]) -> None:
        """Group modules by their folder structure.
        
        Args:
            modules: List of ModuleInfo objects
        """
        self.module_groups.clear()
        
        for module in modules:
            folder_path = self._get_folder_path(module.path)
            
            if folder_path not in self.module_groups:
                self.module_groups[folder_path] = []
            
            self.module_groups[folder_path].append(module.name)
        
        logger.debug(f"Grouped modules into {len(self.module_groups)} folders")
    
    def _get_folder_path(self, module_path: str) -> str:
        """Extract folder path from module path.
        
        Args:
            module_path: Full path to the module file
            
        Returns:
            Folder path relative to project root
        """
        try:
            path = Path(module_path)
            relative_path = path.relative_to(self.project_path)
            folder_path = str(relative_path.parent)
            
            # Normalize folder path
            if folder_path == ".":
                return "root"
            
            return folder_path.replace("\\", "/")  # Normalize path separators
            
        except Exception as e:
            logger.warning(f"Failed to extract folder path from {module_path}: {e}")
            return "unknown"
    
    def _create_module_card(self, module: ModuleInfo, dependencies: List[str]) -> ModuleCard:
        """Create a module card from module information.
        
        Args:
            module: ModuleInfo object
            dependencies: List of dependency module names
            
        Returns:
            ModuleCard object with styling and metadata
        """
        # Generate display name (remove file extension, capitalize)
        display_name = self._generate_display_name(module.name)
        
        # Get folder path
        folder_path = self._get_folder_path(module.path)
        
        # Create complexity information
        complexity_info = {
            "cyclomatic": module.complexity.cyclomatic,
            "cognitive": getattr(module.complexity, 'cognitive', 0),
            "level": module.complexity.level.value,
            "colorCode": self._get_complexity_color_code(module.complexity.level)
        }
        
        # Create styling based on complexity
        styling = CardStyling.from_complexity(module.complexity.level)
        
        # Create dependencies
        module_dependencies = []
        for dep_name in dependencies:
            dependency = ModuleDependency(
                target_module=dep_name,
                dependency_type="import",  # Default type, could be enhanced
                weight=1
            )
            module_dependencies.append(dependency)
        
        # Create metadata
        metadata = ModuleMetadata(
            file_count=1,  # Single file per module in this implementation
            total_lines=module.size_lines,
            function_count=len(module.functions),
            class_count=len(module.classes),
            import_count=len(module.imports)
        )
        
        # Create module card
        card = ModuleCard(
            id=f"module_{module.name}",
            name=module.name,
            display_name=display_name,
            folder_path=folder_path,
            complexity=complexity_info,
            dependencies=module_dependencies,
            styling=styling,
            position=None,  # Will be set during positioning
            metadata=metadata
        )
        
        return card
    
    def _generate_display_name(self, module_name: str) -> str:
        """Generate a user-friendly display name for the module.
        
        Args:
            module_name: Original module name
            
        Returns:
            Formatted display name
        """
        # Remove common prefixes/suffixes and format nicely
        display_name = module_name
        
        # Remove file extension if present
        if display_name.endswith('.py'):
            display_name = display_name[:-3]
        
        # Replace underscores with spaces and capitalize
        display_name = display_name.replace('_', ' ').title()
        
        # Handle special cases
        if display_name.lower() == 'init':
            display_name = 'Package Init'
        elif display_name.lower() == 'main':
            display_name = 'Main Module'
        
        return display_name
    
    def _get_complexity_color_code(self, complexity_level: ComplexityLevel) -> str:
        """Get color code for complexity level.
        
        Args:
            complexity_level: ComplexityLevel enum value
            
        Returns:
            Color code string
        """
        color_map = {
            ComplexityLevel.LOW: "green",
            ComplexityLevel.MEDIUM: "orange",
            ComplexityLevel.HIGH: "red"
        }
        return color_map.get(complexity_level, "gray")
    
    def _apply_positioning(self, cards: List[ModuleCard]) -> List[ModuleCard]:
        """Apply positioning to module cards based on folder grouping.
        
        Args:
            cards: List of ModuleCard objects without positioning
            
        Returns:
            List of ModuleCard objects with positioning applied
        """
        positioned_cards = []
        
        # Group cards by folder
        folder_groups = {}
        for card in cards:
            folder = card.folder_path
            if folder not in folder_groups:
                folder_groups[folder] = []
            folder_groups[folder].append(card)
        
        # Apply grid-based positioning
        current_y = 0
        folder_spacing = 200  # Vertical spacing between folder groups
        card_spacing_x = 250  # Horizontal spacing between cards
        card_spacing_y = 150  # Vertical spacing between cards in same folder
        
        for folder, folder_cards in folder_groups.items():
            logger.debug(f"Positioning {len(folder_cards)} cards for folder: {folder}")
            
            # Calculate grid dimensions for this folder
            cards_per_row = min(4, len(folder_cards))  # Max 4 cards per row
            rows = (len(folder_cards) + cards_per_row - 1) // cards_per_row
            
            for i, card in enumerate(folder_cards):
                row = i // cards_per_row
                col = i % cards_per_row
                
                # Calculate position
                x = col * card_spacing_x
                y = current_y + (row * card_spacing_y)
                
                # Create positioned card
                positioned_card = ModuleCard(
                    id=card.id,
                    name=card.name,
                    display_name=card.display_name,
                    folder_path=card.folder_path,
                    complexity=card.complexity,
                    dependencies=card.dependencies,
                    styling=card.styling,
                    position=Position(x=x, y=y),
                    metadata=card.metadata
                )
                
                positioned_cards.append(positioned_card)
            
            # Move to next folder group
            current_y += (rows * card_spacing_y) + folder_spacing
        
        logger.debug(f"Applied positioning to {len(positioned_cards)} cards")
        return positioned_cards
    
    def get_folder_groups(self) -> Dict[str, List[str]]:
        """Get the current folder groupings.
        
        Returns:
            Dictionary mapping folder paths to module names
        """
        return self.module_groups.copy()
    
    def generate_folder_summary(self) -> Dict[str, Dict[str, Any]]:
        """Generate summary information for each folder group.
        
        Returns:
            Dictionary with folder summaries
        """
        summary = {}
        
        for folder_path, module_names in self.module_groups.items():
            summary[folder_path] = {
                "moduleCount": len(module_names),
                "modules": module_names,
                "displayName": self._generate_folder_display_name(folder_path)
            }
        
        return summary
    
    def _generate_folder_display_name(self, folder_path: str) -> str:
        """Generate a display name for a folder.
        
        Args:
            folder_path: Folder path
            
        Returns:
            Formatted display name
        """
        if folder_path == "root":
            return "Root Directory"
        
        # Get the last part of the path and format it
        folder_name = Path(folder_path).name
        return folder_name.replace('_', ' ').title()