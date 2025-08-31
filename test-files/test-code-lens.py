#!/usr/bin/env python3
"""
Test file for code lens functionality.
Contains various Python constructs to test code lens features.
"""

def simple_function(x):
    """A simple function with good practices."""
    return x * 2

def complex_function(param1, param2, param3, param4, param5, param6):
    """A function with high complexity for testing."""
    result = []
    for i in range(param1):
        if param2 > 0:
            for j in range(param2):
                if param3:
                    if param4 is not None:
                        if param5:
                            if param6:
                                result.append(i * j)
                            else:
                                result.append(i + j)
                        else:
                            result.append(i - j)
                    else:
                        result.append(i)
                else:
                    result.append(j)
        else:
            result.append(-1)
    return result

def function_without_docstring(a, b, c, d, e):
    # This function has no docstring and many parameters
    if a:
        if b:
            if c:
                if d:
                    return e
                else:
                    return d
            else:
                return c
        else:
            return b
    else:
        return a

class TestClass:
    """A test class for code lens functionality."""
    
    def __init__(self, name):
        """Initialize the test class."""
        self.name = name
    
    def simple_method(self):
        """A simple method."""
        return self.name
    
    def complex_method(self, data, options, flags, settings, config):
        """A method with many parameters and complexity."""
        processed = []
        for item in data:
            if options.get('validate'):
                if flags['strict']:
                    if settings['check_type']:
                        if config.get('allow_none') and item is not None:
                            processed.append(self._process_item(item))
                        elif not config.get('allow_none'):
                            processed.append(self._process_item(item))
                    else:
                        processed.append(item)
                else:
                    processed.append(item)
            else:
                processed.append(item)
        return processed
    
    def _process_item(self, item):
        """Private method to process an item."""
        return str(item).upper()

def very_long_function():
    """A function that is very long to test length suggestions."""
    line1 = "This is line 1"
    line2 = "This is line 2"
    line3 = "This is line 3"
    line4 = "This is line 4"
    line5 = "This is line 5"
    line6 = "This is line 6"
    line7 = "This is line 7"
    line8 = "This is line 8"
    line9 = "This is line 9"
    line10 = "This is line 10"
    line11 = "This is line 11"
    line12 = "This is line 12"
    line13 = "This is line 13"
    line14 = "This is line 14"
    line15 = "This is line 15"
    line16 = "This is line 16"
    line17 = "This is line 17"
    line18 = "This is line 18"
    line19 = "This is line 19"
    line20 = "This is line 20"
    line21 = "This is line 21"
    line22 = "This is line 22"
    line23 = "This is line 23"
    line24 = "This is line 24"
    line25 = "This is line 25"
    line26 = "This is line 26"
    line27 = "This is line 27"
    line28 = "This is line 28"
    line29 = "This is line 29"
    line30 = "This is line 30"
    line31 = "This is line 31"
    line32 = "This is line 32"
    line33 = "This is line 33"
    line34 = "This is line 34"
    line35 = "This is line 35"
    line36 = "This is line 36"
    line37 = "This is line 37"
    line38 = "This is line 38"
    line39 = "This is line 39"
    line40 = "This is line 40"
    line41 = "This is line 41"
    line42 = "This is line 42"
    line43 = "This is line 43"
    line44 = "This is line 44"
    line45 = "This is line 45"
    line46 = "This is line 46"
    line47 = "This is line 47"
    line48 = "This is line 48"
    line49 = "This is line 49"
    line50 = "This is line 50"
    line51 = "This is line 51"
    line52 = "This is line 52"
    line53 = "This is line 53"
    line54 = "This is line 54"
    line55 = "This is line 55"
    return [line1, line2, line3, line4, line5, line6, line7, line8, line9, line10,
            line11, line12, line13, line14, line15, line16, line17, line18, line19, line20,
            line21, line22, line23, line24, line25, line26, line27, line28, line29, line30,
            line31, line32, line33, line34, line35, line36, line37, line38, line39, line40,
            line41, line42, line43, line44, line45, line46, line47, line48, line49, line50,
            line51, line52, line53, line54, line55]

async def async_function_with_issues(param1, param2, param3, param4):
    """An async function with potential issues."""
    results = []
    for i in range(param1):
        # Synchronous operation in async function (potential issue)
        import time
        time.sleep(0.1)
        
        if param2:
            for j in range(param3):
                if param4:
                    results.append(i * j)
    return results

def function_with_performance_issues():
    """Function with nested loops and performance concerns."""
    data = []
    for i in range(100):
        for j in range(100):
            for k in range(10):
                data.append(i * j * k)
    return data

if __name__ == "__main__":
    # Test the functions
    print(simple_function(5))
    print(complex_function(3, 2, True, 1, True, False))
    
    test_obj = TestClass("test")
    print(test_obj.simple_method())