#!/usr/bin/env python3
"""
Test file for enhanced code lens functionality.
This file contains various Python functions with different complexity levels
to test the professional code lens enhancement features.
"""

def simple_function(x, y):
    """A simple function with low complexity."""
    return x + y

def medium_complexity_function(data, threshold, options):
    """Function with medium complexity."""
    result = []
    for item in data:
        if item > threshold:
            if options.get('include_metadata'):
                result.append({
                    'value': item,
                    'metadata': options.get('metadata', {})
                })
            else:
                result.append(item)
        elif options.get('include_low_values'):
            result.append(item * 0.5)
    return result

def high_complexity_function(input_data, config_dict, validation_rules, output_format, error_handling_mode):
    # This function has no docstring and many parameters
    processed_data = []
    errors = []
    
    for i, item in enumerate(input_data):
        try:
            if validation_rules:
                for rule_name, rule_func in validation_rules.items():
                    if not rule_func(item):
                        if error_handling_mode == 'strict':
                            raise ValueError(f"Validation failed for rule {rule_name}")
                        elif error_handling_mode == 'collect':
                            errors.append(f"Item {i} failed rule {rule_name}")
                            continue
                        elif error_handling_mode == 'skip':
                            continue
            
            if config_dict.get('transform_enabled'):
                if config_dict.get('transform_type') == 'normalize':
                    if isinstance(item, (int, float)):
                        item = (item - config_dict.get('min_val', 0)) / (config_dict.get('max_val', 1) - config_dict.get('min_val', 0))
                    elif isinstance(item, str):
                        item = item.lower().strip()
                elif config_dict.get('transform_type') == 'scale':
                    if isinstance(item, (int, float)):
                        item = item * config_dict.get('scale_factor', 1.0)
            
            if output_format == 'dict':
                processed_item = {
                    'original': input_data[i],
                    'processed': item,
                    'index': i,
                    'metadata': config_dict.get('metadata', {})
                }
            elif output_format == 'tuple':
                processed_item = (input_data[i], item, i)
            else:
                processed_item = item
            
            processed_data.append(processed_item)
            
        except Exception as e:
            if error_handling_mode == 'strict':
                raise
            elif error_handling_mode == 'collect':
                errors.append(f"Error processing item {i}: {str(e)}")
            # For 'skip' mode, we just continue
    
    if errors and config_dict.get('return_errors'):
        return processed_data, errors
    else:
        return processed_data

class ExampleClass:
    """Example class to test class-level code lens."""
    
    def __init__(self, name):
        self.name = name
    
    def simple_method(self):
        return f"Hello, {self.name}!"
    
    def complex_method(self, data, options, filters, transformers, validators):
        # Another method with no docstring and many parameters
        results = []
        
        for item in data:
            # Apply filters
            if filters:
                skip_item = False
                for filter_func in filters:
                    if not filter_func(item):
                        skip_item = True
                        break
                if skip_item:
                    continue
            
            # Apply validators
            if validators:
                for validator in validators:
                    if not validator.validate(item):
                        if options.get('strict_validation'):
                            raise ValueError(f"Validation failed for item: {item}")
                        else:
                            continue
            
            # Apply transformers
            transformed_item = item
            if transformers:
                for transformer in transformers:
                    try:
                        transformed_item = transformer.transform(transformed_item)
                    except Exception as e:
                        if options.get('ignore_transform_errors'):
                            continue
                        else:
                            raise
            
            # Format output
            if options.get('include_original'):
                result_item = {
                    'original': item,
                    'transformed': transformed_item,
                    'metadata': options.get('metadata', {})
                }
            else:
                result_item = transformed_item
            
            results.append(result_item)
        
        return results

def function_without_docstring():
    return "This function has no docstring"

def very_long_function():
    """
    This is a very long function that should trigger the length suggestion.
    It has many lines of code that could be split into smaller functions.
    """
    # Line 1
    result = []
    # Line 2
    for i in range(100):
        # Line 3
        if i % 2 == 0:
            # Line 4
            if i % 4 == 0:
                # Line 5
                result.append(i * 2)
            else:
                # Line 6
                result.append(i)
        else:
            # Line 7
            if i % 3 == 0:
                # Line 8
                result.append(i * 3)
            else:
                # Line 9
                result.append(i + 1)
    
    # Line 10
    processed_result = []
    # Line 11
    for item in result:
        # Line 12
        if item > 50:
            # Line 13
            processed_result.append(item * 0.8)
        elif item > 25:
            # Line 14
            processed_result.append(item * 0.9)
        else:
            # Line 15
            processed_result.append(item)
    
    # Line 16
    final_result = []
    # Line 17
    for i, item in enumerate(processed_result):
        # Line 18
        if i % 5 == 0:
            # Line 19
            final_result.append({
                'value': item,
                'index': i,
                'special': True
            })
        else:
            # Line 20
            final_result.append({
                'value': item,
                'index': i,
                'special': False
            })
    
    # Line 21
    return final_result

if __name__ == "__main__":
    # Test the functions
    print(simple_function(1, 2))
    print(medium_complexity_function([1, 2, 3, 4, 5], 3, {'include_metadata': True}))
    
    example = ExampleClass("World")
    print(example.simple_method())