#!/usr/bin/env python3
"""
Sample Python file for testing complexity analysis.
"""

def simple_function():
    """A simple function with low complexity."""
    return "Hello, World!"

def medium_complexity_function(x, y):
    """A function with medium complexity."""
    if x > 0:
        if y > 0:
            return x + y
        else:
            return x - y
    else:
        if y > 0:
            return y - x
        else:
            return 0

def high_complexity_function(data):
    """A function with high complexity."""
    result = []
    
    for item in data:
        if isinstance(item, dict):
            if 'type' in item:
                if item['type'] == 'number':
                    if 'value' in item:
                        if item['value'] > 0:
                            result.append(item['value'] * 2)
                        elif item['value'] < 0:
                            result.append(abs(item['value']))
                        else:
                            result.append(1)
                    else:
                        result.append(0)
                elif item['type'] == 'string':
                    if 'value' in item:
                        if len(item['value']) > 10:
                            result.append(item['value'][:10])
                        else:
                            result.append(item['value'])
                    else:
                        result.append("")
                else:
                    result.append(None)
            else:
                result.append(None)
        elif isinstance(item, (int, float)):
            if item > 100:
                result.append(item / 2)
            elif item > 50:
                result.append(item * 1.5)
            else:
                result.append(item)
        else:
            result.append(str(item))
    
    return result

class SampleClass:
    """A sample class for testing."""
    
    def __init__(self, name):
        self.name = name
    
    def get_name(self):
        """Simple getter method."""
        return self.name
    
    def complex_method(self, data, threshold=10):
        """A method with some complexity."""
        processed = []
        
        for item in data:
            try:
                if isinstance(item, str):
                    if len(item) > threshold:
                        processed.append(item.upper())
                    else:
                        processed.append(item.lower())
                elif isinstance(item, (int, float)):
                    if item > threshold:
                        processed.append(item * 2)
                    else:
                        processed.append(item + 1)
                else:
                    processed.append(str(item))
            except Exception as e:
                processed.append(f"Error: {e}")
        
        return processed