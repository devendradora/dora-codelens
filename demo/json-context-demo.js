// JavaScript file with JSON content for testing context detection

const config = {
  "name": "demo",
  "settings": {
    "enabled": true,
    "options": ["option1", "option2"]
  }
};

const jsonString = '{"embedded": "json", "in": "string"}';

// This should be detected as JSON context when cursor is on the JSON parts
const complexObject = {
  "api": {
    "endpoints": [
      {"path": "/users", "method": "GET"},
      {"path": "/users/:id", "method": "POST"}
    ]
  }
};