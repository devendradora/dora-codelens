// Test complex conversion cases including nested quotes and edge cases

// Test cases with various edge cases
const testCases = [
  {
    name: "Simple single quotes",
    input: `{'name': 'test', 'value': 42}`,
    expected: { name: "test", value: 42 },
  },
  {
    name: "Python booleans and None",
    input: `{'enabled': True, 'disabled': False, 'data': None}`,
    expected: { enabled: true, disabled: false, data: null },
  },
  {
    name: "Nested quotes",
    input: `{'message': 'He said "Hello" to me'}`,
    expected: { message: 'He said "Hello" to me' },
  },
  {
    name: "Trailing commas",
    input: `{'items': [1, 2, 3,], 'name': 'test',}`,
    expected: { items: [1, 2, 3], name: "test" },
  },
  {
    name: "Mixed quotes and escapes",
    input: `{'path': 'C:\\\\temp', 'quote': 'It\\'s working'}`,
    expected: { path: "C:\\\\temp", quote: "It's working" },
  },
  {
    name: "Complex nested structure",
    input: `{
            'user': {
                'name': 'John "Johnny" Doe',
                'active': True,
                'settings': {
                    'theme': 'dark',
                    'notifications': False,
                    'data': None
                }
            },
            'features': ['auth', 'logging', 'cache'],
            'config': {
                'timeout': 30,
                'retries': 3,
            }
        }`,
    expected: {
      user: {
        name: 'John "Johnny" Doe',
        active: true,
        settings: {
          theme: "dark",
          notifications: false,
          data: null,
        },
      },
      features: ["auth", "logging", "cache"],
      config: {
        timeout: 30,
        retries: 3,
      },
    },
  },
];

// Enhanced conversion function that handles nested quotes better
function robustConvertPythonDictToJson(content) {
  let result = "";
  let i = 0;

  while (i < content.length) {
    const char = content[i];

    if (char === "'" || char === '"') {
      // Process quoted string
      const stringResult = processQuotedString(content, i);
      result += stringResult.converted;
      i = stringResult.endIndex + 1;
    } else {
      result += char;
      i++;
    }
  }

  // Replace Python keywords
  result = result.replace(/\bTrue\b/g, "true");
  result = result.replace(/\bFalse\b/g, "false");
  result = result.replace(/\bNone\b/g, "null");

  // Remove trailing commas
  result = result.replace(/,(\s*[}\]])/g, "$1");
  result = result.replace(/,(\s*[\r\n]+\s*[}\]])/g, "$1");

  return result;
}

function processQuotedString(content, startIndex) {
  const quote = content[startIndex];
  let result = '"'; // Always use double quotes in JSON
  let i = startIndex + 1;
  let escaped = false;

  while (i < content.length) {
    const char = content[i];

    if (escaped) {
      // Handle escaped characters
      if (char === quote) {
        result += char;
      } else if (char === '"' && quote === "'") {
        result += '\\"';
      } else if (char === "\\") {
        result += "\\\\";
      } else {
        result += "\\" + char;
      }
      escaped = false;
    } else {
      if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        result += '"';
        return { converted: result, endIndex: i };
      } else if (char === '"' && quote === "'") {
        result += '\\"';
      } else {
        result += char;
      }
    }
    i++;
  }

  result += '"';
  return { converted: result, endIndex: content.length - 1 };
}

console.log("Testing complex Python dict to JSON conversion...\n");

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log("Input:", testCase.input.replace(/\n\s*/g, " "));

  try {
    const converted = robustConvertPythonDictToJson(testCase.input);
    const parsed = JSON.parse(converted);

    // Deep comparison
    const isEqual =
      JSON.stringify(parsed) === JSON.stringify(testCase.expected);

    if (isEqual) {
      console.log("✅ PASSED");
      passedTests++;
    } else {
      console.log("❌ FAILED");
      console.log("Expected:", JSON.stringify(testCase.expected, null, 2));
      console.log("Got:", JSON.stringify(parsed, null, 2));
    }
  } catch (error) {
    console.log("❌ FAILED with error:", error.message);
  }

  console.log("");
});

console.log(`Results: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log("🎉 All tests passed!");
} else {
  console.log("⚠️  Some tests failed. Check the implementation.");
}
