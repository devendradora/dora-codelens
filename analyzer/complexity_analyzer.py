#!/usr/bin/env python3
"""
Complexity Analyzer module for CodeMindMap analyzer.

This module provides complexity analysis capabilities using the radon library
for cyclomatic complexity calculation and implements color-coding logic.
"""

import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import replace

try:
    from radon.complexity import cc_visit
    from radon.metrics import mi_visit, h_visit
    from radon.raw import analyze
    RADON_AVAILABLE = True
except ImportError:
    RADON_AVAILABLE = False
    logging.warning("Radon library not available. Using basic complexity calculation.")

from analyzer import (
    ModuleInfo, FunctionInfo, ComplexityScore, ComplexityLevel
)

logger = logging.getLogger(__name__)


class ComplexityThresholds:
    """Complexity thresholds for color-coding."""
    
    # Cyclomatic complexity thresholds
    LOW_COMPLEXITY = 5
    MEDIUM_COMPLEXITY = 10
    
    # Maintainability index thresholds (0-100 scale)
    HIGH_MAINTAINABILITY = 70
    MEDIUM_MAINTAINABILITY = 50
    
    @classmethod
    def get_complexity_level(cls, cyclomatic: int) -> ComplexityLevel:
        """Get complexity level based on cyclomatic complexity.
        
        Args:
            cyclomatic: Cyclomatic complexity value
            
        Returns:
            ComplexityLevel enum value
        """
        if cyclomatic <= cls.LOW_COMPLEXITY:
            return ComplexityLevel.LOW
        elif cyclomatic <= cls.MEDIUM_COMPLEXITY:
            return ComplexityLevel.MEDIUM
        else:
            return ComplexityLevel.HIGH
    
    @classmethod
    def get_color_code(cls, complexity_level: ComplexityLevel) -> str:
        """Get color code for complexity level.
        
        Args:
            complexity_level: ComplexityLevel enum value
            
        Returns:
            Color code string (green/orange/red)
        """
        color_map = {
            ComplexityLevel.LOW: "green",
            ComplexityLevel.MEDIUM: "orange", 
            ComplexityLevel.HIGH: "red"
        }
        return color_map.get(complexity_level, "gray")


class ComplexityAnalyzer:
    """Analyzer for code complexity using radon library."""
    
    def __init__(self):
        """Initialize the complexity analyzer."""
        self.radon_available = RADON_AVAILABLE
        if not self.radon_available:
            logger.warning("Radon library not available. Falling back to basic complexity analysis.")
    
    def enhance_module_complexity(self, module: ModuleInfo) -> ModuleInfo:
        """Enhance module with detailed complexity analysis using radon.
        
        Args:
            module: ModuleInfo object to enhance
            
        Returns:
            Enhanced ModuleInfo with updated complexity scores
        """
        try:
            if not self.radon_available:
                return self._enhance_module_basic(module)
            
            # Read the source file
            with open(module.path, 'r', encoding='utf-8') as f:
                source_code = f.read()
            
            # Analyze complexity using radon
            complexity_results = cc_visit(source_code)
            
            # Enhance functions with radon complexity data
            enhanced_functions = []
            for func in module.functions:
                enhanced_func = self._enhance_function_complexity(func, complexity_results, source_code)
                enhanced_functions.append(enhanced_func)
            
            # Calculate module-level complexity
            module_complexity = self._calculate_module_complexity(enhanced_functions, source_code)
            
            # Create enhanced module
            enhanced_module = replace(
                module,
                functions=enhanced_functions,
                complexity=module_complexity
            )
            
            logger.debug(f"Enhanced complexity for module {module.name}: "
                        f"cyclomatic={module_complexity.cyclomatic}, "
                        f"level={module_complexity.level.value}")
            
            return enhanced_module
            
        except Exception as e:
            logger.error(f"Failed to enhance complexity for module {module.name}: {e}")
            return self._enhance_module_basic(module)
    
    def _enhance_module_basic(self, module: ModuleInfo) -> ModuleInfo:
        """Enhance module with basic complexity analysis (fallback).
        
        Args:
            module: ModuleInfo object to enhance
            
        Returns:
            Enhanced ModuleInfo with basic complexity scores
        """
        # Use existing complexity scores but ensure proper level calculation
        enhanced_functions = []
        for func in module.functions:
            level = ComplexityThresholds.get_complexity_level(func.complexity.cyclomatic)
            enhanced_complexity = replace(func.complexity, level=level)
            enhanced_func = replace(func, complexity=enhanced_complexity)
            enhanced_functions.append(enhanced_func)
        
        # Calculate module complexity as sum of function complexities
        total_complexity = sum(func.complexity.cyclomatic for func in enhanced_functions)
        module_level = ComplexityThresholds.get_complexity_level(total_complexity)
        module_complexity = ComplexityScore(cyclomatic=total_complexity, level=module_level)
        
        return replace(
            module,
            functions=enhanced_functions,
            complexity=module_complexity
        )
    
    def _enhance_function_complexity(self, func: FunctionInfo, complexity_results: List[Any], 
                                   source_code: str) -> FunctionInfo:
        """Enhance function with radon complexity data.
        
        Args:
            func: FunctionInfo object to enhance
            complexity_results: Radon complexity analysis results
            source_code: Source code of the module
            
        Returns:
            Enhanced FunctionInfo with updated complexity
        """
        try:
            # Find matching complexity result from radon
            radon_complexity = None
            for result in complexity_results:
                if (hasattr(result, 'name') and result.name == func.name and
                    hasattr(result, 'lineno') and abs(result.lineno - func.line_number) <= 2):
                    radon_complexity = result
                    break
            
            if radon_complexity:
                # Use radon's cyclomatic complexity
                cyclomatic = radon_complexity.complexity
                
                # Calculate cognitive complexity (simplified approximation)
                cognitive = self._estimate_cognitive_complexity(cyclomatic)
                
                # Determine complexity level
                level = ComplexityThresholds.get_complexity_level(cyclomatic)
                
                enhanced_complexity = ComplexityScore(
                    cyclomatic=cyclomatic,
                    cognitive=cognitive,
                    level=level
                )
                
                logger.debug(f"Enhanced function {func.name}: "
                           f"cyclomatic={cyclomatic}, cognitive={cognitive}, level={level.value}")
                
                return replace(func, complexity=enhanced_complexity)
            else:
                # Fallback to existing complexity with proper level
                level = ComplexityThresholds.get_complexity_level(func.complexity.cyclomatic)
                enhanced_complexity = replace(func.complexity, level=level)
                return replace(func, complexity=enhanced_complexity)
                
        except Exception as e:
            logger.error(f"Failed to enhance function {func.name} complexity: {e}")
            # Return original function with proper level
            level = ComplexityThresholds.get_complexity_level(func.complexity.cyclomatic)
            enhanced_complexity = replace(func.complexity, level=level)
            return replace(func, complexity=enhanced_complexity)
    
    def _estimate_cognitive_complexity(self, cyclomatic: int) -> int:
        """Estimate cognitive complexity based on cyclomatic complexity.
        
        This is a simplified approximation. True cognitive complexity
        requires more detailed AST analysis.
        
        Args:
            cyclomatic: Cyclomatic complexity value
            
        Returns:
            Estimated cognitive complexity
        """
        # Cognitive complexity is typically higher than cyclomatic
        # This is a rough approximation
        return int(cyclomatic * 1.2)
    
    def _calculate_module_complexity(self, functions: List[FunctionInfo], source_code: str) -> ComplexityScore:
        """Calculate module-level complexity.
        
        Args:
            functions: List of functions in the module
            source_code: Source code of the module
            
        Returns:
            ComplexityScore for the module
        """
        try:
            if self.radon_available:
                # Use radon to get overall module metrics
                complexity_results = cc_visit(source_code)
                total_cyclomatic = sum(result.complexity for result in complexity_results)
                
                # Calculate maintainability index if available
                try:
                    mi_results = mi_visit(source_code, multi=True)
                    maintainability = mi_results.mi if hasattr(mi_results, 'mi') else 0
                except:
                    maintainability = 0
                
                # Use maintainability index to adjust cognitive complexity
                cognitive = int(total_cyclomatic * (1.5 - (maintainability / 100)))
                cognitive = max(cognitive, total_cyclomatic)  # Ensure cognitive >= cyclomatic
                
            else:
                # Fallback calculation
                total_cyclomatic = sum(func.complexity.cyclomatic for func in functions)
                cognitive = int(total_cyclomatic * 1.3)
            
            # Determine complexity level
            level = ComplexityThresholds.get_complexity_level(total_cyclomatic)
            
            return ComplexityScore(
                cyclomatic=total_cyclomatic,
                cognitive=cognitive,
                level=level
            )
            
        except Exception as e:
            logger.error(f"Failed to calculate module complexity: {e}")
            # Fallback to sum of function complexities
            total_cyclomatic = sum(func.complexity.cyclomatic for func in functions)
            level = ComplexityThresholds.get_complexity_level(total_cyclomatic)
            return ComplexityScore(cyclomatic=total_cyclomatic, level=level)
    
    def calculate_project_complexity_stats(self, modules: List[ModuleInfo]) -> Dict[str, Any]:
        """Calculate project-wide complexity statistics.
        
        Args:
            modules: List of analyzed modules
            
        Returns:
            Dictionary with complexity statistics
        """
        if not modules:
            return {
                'total_modules': 0,
                'total_functions': 0,
                'average_complexity': 0.0,
                'max_complexity': 0,
                'complexity_distribution': {'low': 0, 'medium': 0, 'high': 0},
                'most_complex_functions': []
            }
        
        all_functions = []
        for module in modules:
            all_functions.extend(module.functions)
        
        if not all_functions:
            return {
                'total_modules': len(modules),
                'total_functions': 0,
                'average_complexity': 0.0,
                'max_complexity': 0,
                'complexity_distribution': {'low': 0, 'medium': 0, 'high': 0},
                'most_complex_functions': []
            }
        
        # Calculate statistics
        complexities = [func.complexity.cyclomatic for func in all_functions]
        total_complexity = sum(complexities)
        average_complexity = total_complexity / len(all_functions)
        max_complexity = max(complexities)
        
        # Calculate distribution
        distribution = {'low': 0, 'medium': 0, 'high': 0}
        for func in all_functions:
            level = func.complexity.level.value
            distribution[level] += 1
        
        # Find most complex functions (top 5)
        sorted_functions = sorted(all_functions, 
                                key=lambda f: f.complexity.cyclomatic, 
                                reverse=True)
        most_complex = []
        for func in sorted_functions[:5]:
            most_complex.append({
                'name': func.name,
                'module': func.module,
                'complexity': func.complexity.cyclomatic,
                'level': func.complexity.level.value,
                'color': ComplexityThresholds.get_color_code(func.complexity.level)
            })
        
        return {
            'total_modules': len(modules),
            'total_functions': len(all_functions),
            'average_complexity': round(average_complexity, 2),
            'max_complexity': max_complexity,
            'complexity_distribution': distribution,
            'most_complex_functions': most_complex
        }
    
    def get_complexity_color_map(self, modules: List[ModuleInfo]) -> Dict[str, str]:
        """Get color mapping for all modules and functions.
        
        Args:
            modules: List of analyzed modules
            
        Returns:
            Dictionary mapping module/function names to color codes
        """
        color_map = {}
        
        for module in modules:
            # Module color
            module_color = ComplexityThresholds.get_color_code(module.complexity.level)
            color_map[f"module:{module.name}"] = module_color
            
            # Function colors
            for func in module.functions:
                func_color = ComplexityThresholds.get_color_code(func.complexity.level)
                color_map[f"function:{module.name}.{func.name}"] = func_color
        
        return color_map