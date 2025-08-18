// Demo JavaScript file to test language detection functionality

function exampleFunction() {
    /**
     * This is an example JavaScript function to test the language detection
     * and Python-specific feature validation in DoraCodeBirdView.
     * 
     * When this file is active, Python-specific features should show
     * appropriate messages indicating they're not available.
     */
    console.log("This is a JavaScript file - only universal features should be available");
    return true;
}

class ExampleClass {
    /**
     * Example class for testing
     */
    
    methodExample() {
        /**
         * Example method
         */
        return "JavaScript method";
    }
}

// Test the functionality
if (typeof window === 'undefined') {
    // Node.js environment
    exampleFunction();
    const obj = new ExampleClass();
    obj.methodExample();
}