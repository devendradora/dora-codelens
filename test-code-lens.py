"""
Test file for code lens functionality
"""

def simple_function(x, y):
    """A simple function for testing code lens"""
    if x > y:
        return x
    else:
        return y

class TestClass:
    """A test class for code lens"""
    
    def __init__(self, name):
        self.name = name
    
    def get_name(self):
        """Get the name"""
        return self.name
    
    def set_name(self, name):
        """Set the name"""
        self.name = name
        
    def complex_method(self, data):
        """A more complex method for testing"""
        result = []
        for item in data:
            if isinstance(item, str):
                result.append(item.upper())
            elif isinstance(item, int):
                if item > 0:
                    result.append(item * 2)
                else:
                    result.append(0)
            else:
                result.append(str(item))
        return result

def another_function():
    """Another function to test code lens"""
    test_obj = TestClass("test")
    data = ["hello", 42, -5, 3.14]
    return test_obj.complex_method(data)

if __name__ == "__main__":
    print(simple_function(5, 3))
    print(another_function())