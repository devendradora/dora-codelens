"""
Demo script to test context menu integration for CodeMindMap extension.

This file contains various Python constructs to test the "Show Call Hierarchy" 
context menu functionality.
"""

def simple_function():
    """A simple function to test basic function detection."""
    return "Hello, World!"

def function_with_params(param1, param2="default"):
    """Function with parameters to test parameter detection."""
    return param1 + param2

def calling_function():
    """Function that calls other functions to test call hierarchy."""
    result1 = simple_function()
    result2 = function_with_params("Hello", " World")
    return result1 + result2

class DemoClass:
    """Demo class to test method detection."""
    
    def __init__(self, name):
        self.name = name
    
    def instance_method(self):
        """Instance method to test method detection."""
        return f"Instance method called on {self.name}"
    
    @classmethod
    def class_method(cls):
        """Class method to test class method detection."""
        return "Class method called"
    
    @staticmethod
    def static_method():
        """Static method to test static method detection."""
        return "Static method called"
    
    def method_calling_others(self):
        """Method that calls other methods to test call hierarchy."""
        result1 = self.instance_method()
        result2 = self.class_method()
        result3 = self.static_method()
        return f"{result1}, {result2}, {result3}"

def complex_function():
    """Function with higher complexity to test complexity detection."""
    demo = DemoClass("Test")
    
    if demo.name:
        for i in range(10):
            if i % 2 == 0:
                result = demo.instance_method()
            else:
                result = demo.static_method()
            
            if result:
                print(result)
    
    return demo.method_calling_others()

# Test function calls
if __name__ == "__main__":
    # Right-click on any of these function names to test context menu
    simple_function()
    calling_function()
    complex_function()
    
    # Test with class instantiation and method calls
    demo = DemoClass("Demo")
    demo.instance_method()
    demo.method_calling_others()