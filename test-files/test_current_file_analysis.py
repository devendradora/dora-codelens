#!/usr/bin/env python3
"""
Test file for Current File Analysis
This file contains various Python constructs to test the analysis functionality.
"""

import os
import json
from typing import List, Dict, Optional, Union
from datetime import datetime


def simple_function(name: str) -> str:
    """A simple function with low complexity."""
    return f"Hello, {name}!"


def complex_function(data: List[Dict], threshold: int = 10) -> Dict[str, Union[int, List]]:
    """A more complex function with multiple control flow statements."""
    results = {
        'processed': [],
        'skipped': [],
        'errors': 0
    }
    
    for item in data:
        try:
            if not isinstance(item, dict):
                results['skipped'].append(item)
                continue
                
            if 'value' not in item:
                results['errors'] += 1
                continue
                
            value = item['value']
            if isinstance(value, (int, float)):
                if value > threshold:
                    if value > threshold * 2:
                        results['processed'].append({
                            'original': value,
                            'processed': value * 1.5,
                            'category': 'high'
                        })
                    else:
                        results['processed'].append({
                            'original': value,
                            'processed': value * 1.2,
                            'category': 'medium'
                        })
                else:
                    results['processed'].append({
                        'original': value,
                        'processed': value,
                        'category': 'low'
                    })
            elif isinstance(value, str):
                if len(value) > 5:
                    results['processed'].append({
                        'original': value,
                        'processed': value.upper(),
                        'category': 'string'
                    })
                else:
                    results['skipped'].append(item)
        except Exception as e:
            results['errors'] += 1
            
    return results


class DataProcessor:
    """A sample class for testing class complexity analysis."""
    
    def __init__(self, config: Dict[str, any]):
        """Initialize the data processor."""
        self.config = config
        self.processed_count = 0
        self.error_count = 0
        
    def process_batch(self, items: List[Dict]) -> Dict[str, any]:
        """Process a batch of items with error handling."""
        results = []
        
        for item in items:
            try:
                if self.validate_item(item):
                    processed = self.transform_item(item)
                    if processed:
                        results.append(processed)
                        self.processed_count += 1
                    else:
                        self.error_count += 1
                else:
                    self.error_count += 1
            except Exception as e:
                self.error_count += 1
                
        return {
            'results': results,
            'processed_count': self.processed_count,
            'error_count': self.error_count,
            'success_rate': self.processed_count / (self.processed_count + self.error_count) if (self.processed_count + self.error_count) > 0 else 0
        }
    
    def validate_item(self, item: Dict) -> bool:
        """Validate an item against configuration rules."""
        if not item:
            return False
            
        required_fields = self.config.get('required_fields', [])
        for field in required_fields:
            if field not in item:
                return False
                
        if 'type' in item:
            allowed_types = self.config.get('allowed_types', [])
            if allowed_types and item['type'] not in allowed_types:
                return False
                
        return True
    
    def transform_item(self, item: Dict) -> Optional[Dict]:
        """Transform an item based on its type and configuration."""
        item_type = item.get('type', 'default')
        
        if item_type == 'text':
            return {
                'id': item.get('id'),
                'content': str(item.get('content', '')).strip(),
                'length': len(str(item.get('content', ''))),
                'processed_at': datetime.now().isoformat()
            }
        elif item_type == 'number':
            value = item.get('value', 0)
            return {
                'id': item.get('id'),
                'value': float(value) if isinstance(value, (int, float)) else 0.0,
                'squared': float(value) ** 2 if isinstance(value, (int, float)) else 0.0,
                'processed_at': datetime.now().isoformat()
            }
        elif item_type == 'list':
            items = item.get('items', [])
            return {
                'id': item.get('id'),
                'count': len(items),
                'items': [str(i) for i in items],
                'processed_at': datetime.now().isoformat()
            }
        else:
            return {
                'id': item.get('id'),
                'raw': item,
                'processed_at': datetime.now().isoformat()
            }


async def async_function(data: List[str]) -> List[str]:
    """An async function for testing async analysis."""
    results = []
    for item in data:
        if isinstance(item, str):
            results.append(item.upper())
        else:
            results.append(str(item))
    return results


def main():
    """Main function to demonstrate the functionality."""
    # Test simple function
    greeting = simple_function("World")
    print(f"Simple function result: {greeting}")
    
    # Test complex function
    test_data = [
        {'value': 15},
        {'value': 25},
        {'value': 5},
        {'value': 'hello world'},
        {'value': 'hi'},
        {'invalid': 'data'},
        'not a dict'
    ]
    
    complex_result = complex_function(test_data, threshold=10)
    print(f"Complex function result: {json.dumps(complex_result, indent=2)}")
    
    # Test class
    config = {
        'required_fields': ['id', 'type'],
        'allowed_types': ['text', 'number', 'list']
    }
    
    processor = DataProcessor(config)
    
    batch_data = [
        {'id': 1, 'type': 'text', 'content': 'Hello World'},
        {'id': 2, 'type': 'number', 'value': 42},
        {'id': 3, 'type': 'list', 'items': [1, 2, 3, 4, 5]},
        {'id': 4, 'type': 'invalid'},  # Should fail validation
        {'id': 5, 'content': 'Missing type'},  # Should fail validation
    ]
    
    batch_result = processor.process_batch(batch_data)
    print(f"Batch processing result: {json.dumps(batch_result, indent=2)}")


if __name__ == "__main__":
    main()