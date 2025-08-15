#!/usr/bin/env python3
"""
Unit tests for ComplexityAnalyzer module.
"""

import pytest
import tempfile
import os
from pathlib import Path
from unittest.mock import patch, MagicMock

from complexity_analyzer import (
    ComplexityAnalyzer, ComplexityThresholds, RADON_AVAILABLE
)
from analyzer import (
    ModuleInfo, FunctionInfo, ComplexityScore, ComplexityLevel, Parameter
)


class TestComplexityThresholds:
    """Test cases for ComplexityThresholds class."""
    
    def test_get_complexity_level_low(self):
        """Test low complexity level detection."""
        assert ComplexityThresholds.get_complexity_level(1) == ComplexityLevel.LOW
        assert ComplexityThresholds.get_complexity_level(5) == ComplexityLevel.LOW
    
    def test_get_complexity_level_medium(self):
        """Test medium complexity level detection."""
        assert ComplexityThresholds.get_complexity_level(6) == ComplexityLevel.MEDIUM
        assert ComplexityThresholds.get_complexity_level(10) == ComplexityLevel.MEDIUM
    
    def test_get_complexity_level_high(self):
        """Test high complexity level detection."""
        assert ComplexityThresholds.get_complexity_level(11) == ComplexityLevel.HIGH
        assert ComplexityThresholds.get_complexity_level(20) == ComplexityLevel.HIGH
    
    def test_get_color_code(self):
        """Test color code mapping."""
        assert ComplexityThresholds.get_color_code(ComplexityLevel.LOW) == "green"
        assert ComplexityThresholds.get_color_code(ComplexityLevel.MEDIUM) == "orange"
        assert ComplexityThresholds.get_color_code(ComplexityLevel.HIGH) == "red"


class TestComplexityAnalyzer:
    """Test cases for ComplexityAnalyzer class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.analyzer = ComplexityAnalyzer()
        
        # Create sample function info
        self.sample_function = FunctionInfo(
            name="test_function",
            module="test_module",
            line_number=10,
            complexity=ComplexityScore(cyclomatic=3),
            parameters=[
                Parameter(name="self"),
                Parameter(name="arg1", type_hint="str"),
                Parameter(name="arg2", type_hint="int", default_value="0")
            ],
            is_method=True
        )
        
        # Create sample module info
        self.sample_module = ModuleInfo(
            name="test_module",
            path="/path/to/test_module.py",
            functions=[self.sample_function],
            classes=[],
            imports=[],
            complexity=ComplexityScore(cyclomatic=3),
            size_lines=50
        )
    
    def test_init_with_radon_available(self):
        """Test analyzer initialization when radon is available."""
        analyzer = ComplexityAnalyzer()
        assert analyzer.radon_available == RADON_AVAILABLE
    
    def test_enhance_module_basic_fallback(self):
        """Test basic module enhancement when radon is not available."""
        with patch.object(self.analyzer, 'radon_available', False):
            enhanced = self.analyzer._enhance_module_basic(self.sample_module)
            
            assert enhanced.name == self.sample_module.name
            assert len(enhanced.functions) == 1
            assert enhanced.functions[0].complexity.level == ComplexityLevel.LOW
            assert enhanced.complexity.cyclomatic == 3
            assert enhanced.complexity.level == ComplexityLevel.LOW   
 
    def test_enhance_function_complexity_basic(self):
        """Test basic function complexity enhancement."""
        with patch.object(self.analyzer, 'radon_available', False):
            enhanced_module = self.analyzer._enhance_module_basic(self.sample_module)
            enhanced_func = enhanced_module.functions[0]
            
            assert enhanced_func.name == "test_function"
            assert enhanced_func.complexity.cyclomatic == 3
            assert enhanced_func.complexity.level == ComplexityLevel.LOW
    
    @pytest.mark.skipif(not RADON_AVAILABLE, reason="Radon not available")
    def test_enhance_module_with_radon(self):
        """Test module enhancement with radon library."""
        # Create a temporary Python file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write("""
def simple_function():
    return 1

def complex_function(x):
    if x > 0:
        if x > 10:
            return x * 2
        else:
            return x + 1
    else:
        return 0
""")
            temp_path = f.name
        
        try:
            # Update module path to point to temp file
            test_module = ModuleInfo(
                name="temp_module",
                path=temp_path,
                functions=[
                    FunctionInfo(
                        name="simple_function",
                        module="temp_module",
                        line_number=2,
                        complexity=ComplexityScore(cyclomatic=1),
                        parameters=[]
                    ),
                    FunctionInfo(
                        name="complex_function",
                        module="temp_module", 
                        line_number=5,
                        complexity=ComplexityScore(cyclomatic=4),
                        parameters=[Parameter(name="x")]
                    )
                ],
                classes=[],
                imports=[],
                complexity=ComplexityScore(cyclomatic=5),
                size_lines=12
            )
            
            enhanced = self.analyzer.enhance_module_complexity(test_module)
            
            assert enhanced.name == "temp_module"
            assert len(enhanced.functions) == 2
            
            # Check that complexity levels are properly assigned
            for func in enhanced.functions:
                assert func.complexity.level in [ComplexityLevel.LOW, ComplexityLevel.MEDIUM, ComplexityLevel.HIGH]
                assert func.complexity.cyclomatic >= 1
                
        finally:
            os.unlink(temp_path)
    
    def test_estimate_cognitive_complexity(self):
        """Test cognitive complexity estimation."""
        assert self.analyzer._estimate_cognitive_complexity(5) == 6  # 5 * 1.2 = 6
        assert self.analyzer._estimate_cognitive_complexity(10) == 12  # 10 * 1.2 = 12
    
    def test_calculate_module_complexity_basic(self):
        """Test module complexity calculation without radon."""
        functions = [
            FunctionInfo(
                name="func1",
                module="test",
                line_number=1,
                complexity=ComplexityScore(cyclomatic=3),
                parameters=[]
            ),
            FunctionInfo(
                name="func2", 
                module="test",
                line_number=10,
                complexity=ComplexityScore(cyclomatic=7),
                parameters=[]
            )
        ]
        
        with patch.object(self.analyzer, 'radon_available', False):
            complexity = self.analyzer._calculate_module_complexity(functions, "")
            
            assert complexity.cyclomatic == 10  # 3 + 7
            assert complexity.cognitive == 13  # 10 * 1.3
            assert complexity.level == ComplexityLevel.MEDIUM
    
    def test_calculate_project_complexity_stats_empty(self):
        """Test project stats calculation with empty modules."""
        stats = self.analyzer.calculate_project_complexity_stats([])
        
        expected = {
            'total_modules': 0,
            'total_functions': 0,
            'average_complexity': 0.0,
            'max_complexity': 0,
            'complexity_distribution': {'low': 0, 'medium': 0, 'high': 0},
            'most_complex_functions': []
        }
        
        assert stats == expected  
  
    def test_calculate_project_complexity_stats_with_data(self):
        """Test project stats calculation with sample data."""
        # Create modules with different complexity levels
        modules = [
            ModuleInfo(
                name="module1",
                path="/path/to/module1.py",
                functions=[
                    FunctionInfo(
                        name="low_func",
                        module="module1",
                        line_number=1,
                        complexity=ComplexityScore(cyclomatic=2, level=ComplexityLevel.LOW),
                        parameters=[]
                    ),
                    FunctionInfo(
                        name="high_func",
                        module="module1", 
                        line_number=10,
                        complexity=ComplexityScore(cyclomatic=15, level=ComplexityLevel.HIGH),
                        parameters=[]
                    )
                ],
                classes=[],
                imports=[],
                complexity=ComplexityScore(cyclomatic=17),
                size_lines=50
            ),
            ModuleInfo(
                name="module2",
                path="/path/to/module2.py",
                functions=[
                    FunctionInfo(
                        name="medium_func",
                        module="module2",
                        line_number=5,
                        complexity=ComplexityScore(cyclomatic=8, level=ComplexityLevel.MEDIUM),
                        parameters=[]
                    )
                ],
                classes=[],
                imports=[],
                complexity=ComplexityScore(cyclomatic=8),
                size_lines=30
            )
        ]
        
        stats = self.analyzer.calculate_project_complexity_stats(modules)
        
        assert stats['total_modules'] == 2
        assert stats['total_functions'] == 3
        assert stats['average_complexity'] == 8.33  # (2 + 15 + 8) / 3
        assert stats['max_complexity'] == 15
        assert stats['complexity_distribution']['low'] == 1
        assert stats['complexity_distribution']['medium'] == 1
        assert stats['complexity_distribution']['high'] == 1
        assert len(stats['most_complex_functions']) == 3
        assert stats['most_complex_functions'][0]['name'] == 'high_func'
        assert stats['most_complex_functions'][0]['complexity'] == 15
    
    def test_get_complexity_color_map(self):
        """Test complexity color mapping generation."""
        modules = [self.sample_module]
        
        # Ensure complexity levels are set
        enhanced_module = self.analyzer._enhance_module_basic(self.sample_module)
        
        color_map = self.analyzer.get_complexity_color_map([enhanced_module])
        
        assert f"module:{enhanced_module.name}" in color_map
        assert f"function:{enhanced_module.name}.{enhanced_module.functions[0].name}" in color_map
        assert color_map[f"module:{enhanced_module.name}"] == "green"  # Low complexity
        assert color_map[f"function:{enhanced_module.name}.{enhanced_module.functions[0].name}"] == "green"
    
    def test_enhance_module_complexity_file_error(self):
        """Test module enhancement with file read error."""
        # Create module with non-existent file
        bad_module = ModuleInfo(
            name="bad_module",
            path="/non/existent/path.py",
            functions=[self.sample_function],
            classes=[],
            imports=[],
            complexity=ComplexityScore(cyclomatic=3),
            size_lines=50
        )
        
        # Should fall back to basic enhancement
        enhanced = self.analyzer.enhance_module_complexity(bad_module)
        
        assert enhanced.name == "bad_module"
        assert len(enhanced.functions) == 1
        assert enhanced.functions[0].complexity.level == ComplexityLevel.LOW
    
    def test_complexity_level_boundaries(self):
        """Test complexity level boundary conditions."""
        # Test exact boundary values
        assert ComplexityThresholds.get_complexity_level(5) == ComplexityLevel.LOW
        assert ComplexityThresholds.get_complexity_level(6) == ComplexityLevel.MEDIUM
        assert ComplexityThresholds.get_complexity_level(10) == ComplexityLevel.MEDIUM
        assert ComplexityThresholds.get_complexity_level(11) == ComplexityLevel.HIGH
    
    def test_cognitive_complexity_calculation(self):
        """Test cognitive complexity calculation edge cases."""
        # Test with zero cyclomatic complexity
        assert self.analyzer._estimate_cognitive_complexity(0) == 0
        
        # Test with large values
        assert self.analyzer._estimate_cognitive_complexity(100) == 120


if __name__ == "__main__":
    pytest.main([__file__])