// Test script to verify inline code lens provider with real analysis data
const analysisData = {
  "timestamp": "2025-09-15T15:05:48.124Z",
  "filePath": "/Users/devendradora/projects/kiro/dora-codelens/examples/django-ecommerce/apps/products/views.py",
  "analysis": {
    "file_path": "/Users/devendradora/projects/kiro/dora-codelens/examples/django-ecommerce/apps/products/views.py",
    "file_name": "views.py",
    "complexity_metrics": {
      "overall_complexity": {
        "cyclomatic": 1,
        "cognitive": 1,
        "level": "low"
      },
      "function_complexities": [
        {
          "name": "featured_products",
          "line_number": 71,
          "complexity": {
            "cyclomatic": 1,
            "cognitive": 1,
            "level": "low"
          },
          "parameters": [
            {
              "name": "request",
              "type_hint": null,
              "default_value": null,
              "is_vararg": false,
              "is_kwarg": false
            }
          ],
          "return_type": null,
          "docstring": "Get featured products (top 10 by stock quantity)",
          "is_method": false,
          "is_async": false
        },
        {
          "name": "products_by_category",
          "line_number": 80,
          "complexity": {
            "cyclomatic": 2,
            "cognitive": 2,
            "level": "low"
          },
          "parameters": [
            {
              "name": "request",
              "type_hint": null,
              "default_value": null,
              "is_vararg": false,
              "is_kwarg": false
            },
            {
              "name": "category_id",
              "type_hint": null,
              "default_value": null,
              "is_vararg": false,
              "is_kwarg": false
            }
          ],
          "return_type": null,
          "docstring": "Get products by category including subcategories",
          "is_method": false,
          "is_async": false
        }
      ],
      "class_complexities": [
        {
          "name": "ProductListCreateView",
          "line_number": 29,
          "base_classes": ["generics.ListCreateAPIView"],
          "docstring": null,
          "methods": [
            {
              "name": "get_serializer_class",
              "complexity": {
                "cyclomatic": 2,
                "cognitive": 2,
                "level": "low"
              }
            }
          ]
        },
        {
          "name": "DiscountListCreateView",
          "line_number": 50,
          "base_classes": ["generics.ListCreateAPIView"],
          "docstring": null,
          "methods": [
            {
              "name": "get_queryset",
              "complexity": {
                "cyclomatic": 1,
                "cognitive": 1,
                "level": "low"
              }
            }
          ]
        }
      ]
    }
  }
};

console.log("Analysis Data Structure Test:");
console.log("Functions found:", analysisData.analysis.complexity_metrics.function_complexities.length);
console.log("Classes found:", analysisData.analysis.complexity_metrics.class_complexities.length);

// Test function processing
analysisData.analysis.complexity_metrics.function_complexities.forEach(func => {
  console.log(`Function: ${func.name} (line ${func.line_number}) - Complexity: ${func.complexity.cyclomatic} (${func.complexity.level})`);
});

// Test class processing  
analysisData.analysis.complexity_metrics.class_complexities.forEach(cls => {
  console.log(`Class: ${cls.name} (line ${cls.line_number}) - Methods: ${cls.methods.length}`);
  cls.methods.forEach(method => {
    console.log(`  Method: ${method.name} - Complexity: ${method.complexity.cyclomatic} (${method.complexity.level})`);
  });
});