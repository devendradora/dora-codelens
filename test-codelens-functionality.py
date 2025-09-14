#!/usr/bin/env python3
"""
Test file for CodeLens functionality
"""

def simple_function():
    """A simple function with low complexity."""
    return "Hello, World!"

def medium_complexity_function(x, y, z):
    """A function with medium complexity."""
    if x > 0:
        if y > 0:
            if z > 0:
                return x + y + z
            else:
                return x + y
        else:
            return x
    else:
        return 0

def high_complexity_function(data):
    """A function with high complexity."""
    result = []
    for item in data:
        if isinstance(item, dict):
            for key, value in item.items():
                if isinstance(value, list):
                    for sub_item in value:
                        if isinstance(sub_item, str):
                            if len(sub_item) > 5:
                                result.append(sub_item.upper())
                            else:
                                result.append(sub_item.lower())
                        elif isinstance(sub_item, int):
                            if sub_item > 10:
                                result.append(sub_item * 2)
                            else:
                                result.append(sub_item)
                elif isinstance(value, str):
                    result.append(value)
        elif isinstance(item, list):
            result.extend(item)
        else:
            result.append(item)
    return result

class TestClass:
    """A test class with methods."""
    
    def __init__(self, name):
        self.name = name
    
    def get_name(self):
        """Simple getter method."""
        return self.name
    
    def complex_method(self, data, options=None):
        """A method with some complexity."""
        if options is None:
            options = {}
        
        processed = []
        for item in data:
            if options.get('uppercase', False):
                if isinstance(item, str):
                    processed.append(item.upper())
                else:
                    processed.append(str(item).upper())
            else:
                processed.append(item)
        
        return processed

if __name__ == "__main__":
    # Test the functions
    print(simple_function())
    print(medium_complexity_function(1, 2, 3))
    
    test_data = [
        {"items": ["hello", "world", 123]},
        ["test", "data"],
        "simple string"
    ]
    print(high_complexity_function(test_data))
    
    # Test the class
    test_obj = TestClass("Test")
    print(test_obj.get_name())
    print(test_obj.complex_method(["hello", "world"], {"uppercase": True}))