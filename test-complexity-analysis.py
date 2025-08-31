#!/usr/bin/env python3
"""
Simple test file to verify complexity analysis in enhanced code lens.
"""

def low_complexity():
    """Simple function - should show green complexity indicator."""
    return "Hello, World!"

def medium_complexity(items, threshold):
    """Medium complexity function - should show yellow complexity indicator."""
    result = []
    for item in items:
        if item > threshold:
            result.append(item * 2)
        else:
            result.append(item)
    return result

def high_complexity(data, config):
    """High complexity function - should show red complexity indicator and suggestions."""
    results = []
    
    for item in data:
        if config.get('validate'):
            if config.get('strict'):
                if not isinstance(item, (int, float)):
                    raise ValueError("Invalid type")
            else:
                if not isinstance(item, (int, float)):
                    continue
        
        if config.get('transform'):
            if config.get('transform_type') == 'square':
                item = item ** 2
            elif config.get('transform_type') == 'sqrt':
                item = item ** 0.5
            elif config.get('transform_type') == 'log':
                if item > 0:
                    import math
                    item = math.log(item)
                else:
                    item = 0
        
        if config.get('filter'):
            if config.get('min_value') and item < config['min_value']:
                continue
            if config.get('max_value') and item > config['max_value']:
                continue
        
        results.append(item)
    
    return results

def no_docstring_function(a, b, c, d, e):
    # This function should trigger documentation and parameter suggestions
    return a + b + c + d + e