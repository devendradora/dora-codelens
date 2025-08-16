#!/usr/bin/env python3
"""
Test file for current file analysis functionality.
"""

import os
import sys
from pathlib import Path
from typing import List, Dict, Optional

class TestClass:
    """A test class for complexity analysis."""
    
    def __init__(self, name: str):
        self.name = name
        self.items: List[str] = []
    
    def add_item(self, item: str) -> None:
        """Add an item to the list."""
        if item and len(item) > 0:
            self.items.append(item)
    
    def complex_method(self, data: Dict[str, any]) -> Optional[str]:
        """A method with higher complexity."""
        result = None
        
        if data:
            for key, value in data.items():
                if isinstance(value, str):
                    if len(value) > 10:
                        result = value.upper()
                        break
                elif isinstance(value, int):
                    if value > 100:
                        result = str(value * 2)
                        break
                elif isinstance(value, list):
                    if len(value) > 5:
                        result = str(len(value))
                        break
        
        return result

def simple_function(x: int, y: int) -> int:
    """A simple function."""
    return x + y

def complex_function(items: List[Dict[str, any]]) -> List[str]:
    """A function with higher complexity."""
    results = []
    
    for item in items:
        if not item:
            continue
            
        if 'name' in item:
            name = item['name']
            if isinstance(name, str) and len(name) > 0:
                if name.startswith('test_'):
                    results.append(f"Test: {name}")
                elif name.startswith('prod_'):
                    results.append(f"Production: {name}")
                else:
                    results.append(f"Other: {name}")
        elif 'id' in item:
            item_id = item['id']
            if isinstance(item_id, int):
                if item_id > 1000:
                    results.append(f"High ID: {item_id}")
                elif item_id > 100:
                    results.append(f"Medium ID: {item_id}")
                else:
                    results.append(f"Low ID: {item_id}")
    
    return results

if __name__ == "__main__":
    test_obj = TestClass("test")
    test_obj.add_item("item1")
    
    test_data = {
        "name": "test_example",
        "value": 150,
        "items": [1, 2, 3, 4, 5, 6]
    }
    
    result = test_obj.complex_method(test_data)
    print(f"Result: {result}")
    
    items = [
        {"name": "test_item1"},
        {"name": "prod_item2"},
        {"id": 1500},
        {"id": 50}
    ]
    
    complex_results = complex_function(items)
    print(f"Complex results: {complex_results}")