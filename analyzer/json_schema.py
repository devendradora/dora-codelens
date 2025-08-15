#!/usr/bin/env python3
"""
JSON Schema Validation Module

This module provides JSON schema validation for the CodeMindMap analysis output.
"""

import json
import logging
from typing import Dict, Any, List, Optional, Union
from pathlib import Path

logger = logging.getLogger(__name__)


class ValidationError(Exception):
    """Exception raised when JSON validation fails."""
    pass


class JSONSchemaValidator:
    """Validates analysis JSON output against schema."""
    
    def __init__(self):
        """Initialize the validator with the schema."""
        self.schema = self._get_analysis_schema()
    
    def validate(self, data: Union[str, Dict[str, Any]]) -> bool:
        """Validate JSON data against the schema.
        
        Args:
            data: JSON string or dictionary to validate
            
        Returns:
            True if valid, raises ValidationError if invalid
            
        Raises:
            ValidationError: If validation fails
        """
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except json.JSONDecodeError as e:
                raise ValidationError(f"Invalid JSON format: {e}")
        
        try:
            self._validate_recursive(data, self.schema, "root")
            logger.info("JSON validation successful")
            return True
        except ValidationError:
            raise
        except Exception as e:
            raise ValidationError(f"Validation error: {e}")
    
    def _validate_recursive(self, data: Any, schema: Dict[str, Any], path: str):
        """Recursively validate data against schema."""
        # Check required fields
        if "required" in schema:
            if not isinstance(data, dict):
                raise ValidationError(f"Expected object at {path}, got {type(data).__name__}")
            
            for field in schema["required"]:
                if field not in data:
                    raise ValidationError(f"Missing required field '{field}' at {path}")
        
        # Check type
        if "type" in schema:
            expected_type = schema["type"]
            if not self._check_type(data, expected_type):
                raise ValidationError(f"Expected {expected_type} at {path}, got {type(data).__name__}")
        
        # Validate properties
        if "properties" in schema and isinstance(data, dict):
            for key, value in data.items():
                if key in schema["properties"]:
                    self._validate_recursive(value, schema["properties"][key], f"{path}.{key}")
        
        # Validate array items
        if "items" in schema and isinstance(data, list):
            for i, item in enumerate(data):
                self._validate_recursive(item, schema["items"], f"{path}[{i}]")
    
    def _check_type(self, data: Any, expected_type: Union[str, List[str]]) -> bool:
        """Check if data matches expected type."""
        type_mapping = {
            "string": str,
            "number": (int, float),
            "integer": int,
            "boolean": bool,
            "array": list,
            "object": dict,
            "null": type(None)
        }
        
        # Handle union types like ["string", "null"]
        if isinstance(expected_type, list):
            return any(self._check_type(data, t) for t in expected_type)
        
        if expected_type in type_mapping:
            return isinstance(data, type_mapping[expected_type])
        
        return False
    
    def _get_analysis_schema(self) -> Dict[str, Any]:
        """Get the JSON schema for analysis results."""
        return {
            "type": "object",
            "required": ["success", "metadata", "errors", "warnings", "tech_stack", "modules", "functions", "framework_patterns", "schema_version"],
            "properties": {
                "success": {"type": "boolean"},
                "schema_version": {"type": "string"},
                "metadata": {
                    "type": "object",
                    "required": ["project_path", "analysis_time", "total_files", "analyzed_files", "timestamp"],
                    "properties": {
                        "project_path": {"type": "string"},
                        "analysis_time": {"type": "number"},
                        "total_files": {"type": "integer"},
                        "analyzed_files": {"type": "integer"},
                        "timestamp": {"type": "string"}
                    }
                },
                "errors": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["type", "message"],
                        "properties": {
                            "type": {"type": "string"},
                            "message": {"type": "string"},
                            "file": {"type": "string"},
                            "line": {"type": "integer"}
                        }
                    }
                },
                "warnings": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["type", "message"],
                        "properties": {
                            "type": {"type": "string"},
                            "message": {"type": "string"},
                            "file": {"type": "string"}
                        }
                    }
                },
                "tech_stack": {
                    "type": "object",
                    "required": ["libraries", "frameworks", "package_manager"],
                    "properties": {
                        "libraries": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "required": ["name", "source", "extras"],
                                "properties": {
                                    "name": {"type": "string"},
                                    "version": {"type": ["string", "null"]},
                                    "source": {"type": "string"},
                                    "extras": {"type": "array", "items": {"type": "string"}}
                                }
                            }
                        },
                        "frameworks": {"type": "array", "items": {"type": "string"}},
                        "python_version": {"type": ["string", "null"]},
                        "package_manager": {"type": "string"}
                    }
                },
                "modules": {
                    "type": "object",
                    "required": ["nodes", "edges", "total_modules", "complexity_summary"],
                    "properties": {
                        "nodes": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "required": ["id", "name", "path", "complexity", "size", "functions"],
                                "properties": {
                                    "id": {"type": "string"},
                                    "name": {"type": "string"},
                                    "path": {"type": "string"},
                                    "complexity": {
                                        "type": "object",
                                        "required": ["cyclomatic", "cognitive", "level"],
                                        "properties": {
                                            "cyclomatic": {"type": "integer"},
                                            "cognitive": {"type": "integer"},
                                            "level": {"type": "string", "enum": ["low", "medium", "high"]}
                                        }
                                    },
                                    "size": {"type": "integer"},
                                    "functions": {"type": "array", "items": {"type": "string"}}
                                }
                            }
                        },
                        "edges": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "required": ["source", "target", "type", "weight"],
                                "properties": {
                                    "source": {"type": "string"},
                                    "target": {"type": "string"},
                                    "type": {"type": "string"},
                                    "weight": {"type": "integer"}
                                }
                            }
                        },
                        "total_modules": {"type": "integer"},
                        "complexity_summary": {
                            "type": "object",
                            "required": ["low", "medium", "high", "average"],
                            "properties": {
                                "low": {"type": "integer"},
                                "medium": {"type": "integer"},
                                "high": {"type": "integer"},
                                "average": {"type": "number"}
                            }
                        }
                    }
                },
                "functions": {
                    "type": "object",
                    "required": ["nodes", "edges", "total_functions"],
                    "properties": {
                        "nodes": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "required": ["id", "name", "module", "complexity", "line_number", "parameters"],
                                "properties": {
                                    "id": {"type": "string"},
                                    "name": {"type": "string"},
                                    "module": {"type": "string"},
                                    "complexity": {"type": "integer"},
                                    "line_number": {"type": "integer"},
                                    "parameters": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "required": ["name", "is_vararg", "is_kwarg"],
                                            "properties": {
                                                "name": {"type": "string"},
                                                "type_hint": {"type": ["string", "null"]},
                                                "default_value": {"type": ["string", "null"]},
                                                "is_vararg": {"type": "boolean"},
                                                "is_kwarg": {"type": "boolean"}
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "edges": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "required": ["caller", "callee", "call_count", "line_numbers"],
                                "properties": {
                                    "caller": {"type": "string"},
                                    "callee": {"type": "string"},
                                    "call_count": {"type": "integer"},
                                    "line_numbers": {"type": "array", "items": {"type": "integer"}}
                                }
                            }
                        },
                        "total_functions": {"type": "integer"}
                    }
                },
                "framework_patterns": {
                    "type": "object",
                    "properties": {
                        "django": {
                            "type": "object",
                            "required": ["url_patterns", "views", "models", "serializers"],
                            "properties": {
                                "url_patterns": {"type": "array", "items": self._get_django_url_pattern_schema()},
                                "views": {"type": "array", "items": self._get_django_view_schema()},
                                "models": {"type": "array", "items": self._get_django_model_schema()},
                                "serializers": {"type": "array", "items": self._get_django_serializer_schema()}
                            }
                        },
                        "flask": {
                            "type": "object",
                            "required": ["routes", "blueprints"],
                            "properties": {
                                "routes": {"type": "array", "items": self._get_flask_route_schema()},
                                "blueprints": {"type": "array", "items": self._get_flask_blueprint_schema()}
                            }
                        },
                        "fastapi": {
                            "type": "object",
                            "required": ["routes", "dependencies"],
                            "properties": {
                                "routes": {"type": "array", "items": self._get_fastapi_route_schema()},
                                "dependencies": {"type": "array", "items": self._get_fastapi_dependency_schema()}
                            }
                        }
                    }
                }
            }
        }
    
    def _get_django_url_pattern_schema(self) -> Dict[str, Any]:
        """Get schema for Django URL patterns."""
        return {
            "type": "object",
            "required": ["pattern", "view_name", "view_function", "line_number"],
            "properties": {
                "pattern": {"type": "string"},
                "view_name": {"type": "string"},
                "view_function": {"type": "string"},
                "namespace": {"type": ["string", "null"]},
                "line_number": {"type": "integer"}
            }
        }
    
    def _get_django_view_schema(self) -> Dict[str, Any]:
        """Get schema for Django views."""
        return {
            "type": "object",
            "required": ["name", "function", "file_path", "line_number", "is_class_based"],
            "properties": {
                "name": {"type": "string"},
                "function": {"type": "string"},
                "file_path": {"type": "string"},
                "line_number": {"type": "integer"},
                "is_class_based": {"type": "boolean"}
            }
        }
    
    def _get_django_model_schema(self) -> Dict[str, Any]:
        """Get schema for Django models."""
        return {
            "type": "object",
            "required": ["name", "file_path", "line_number", "fields"],
            "properties": {
                "name": {"type": "string"},
                "file_path": {"type": "string"},
                "line_number": {"type": "integer"},
                "fields": {"type": "array", "items": {"type": "string"}}
            }
        }
    
    def _get_django_serializer_schema(self) -> Dict[str, Any]:
        """Get schema for Django serializers."""
        return {
            "type": "object",
            "required": ["name", "file_path", "line_number"],
            "properties": {
                "name": {"type": "string"},
                "file_path": {"type": "string"},
                "line_number": {"type": "integer"},
                "model": {"type": ["string", "null"]}
            }
        }
    
    def _get_flask_route_schema(self) -> Dict[str, Any]:
        """Get schema for Flask routes."""
        return {
            "type": "object",
            "required": ["pattern", "methods", "function", "file_path", "line_number"],
            "properties": {
                "pattern": {"type": "string"},
                "methods": {"type": "array", "items": {"type": "string"}},
                "function": {"type": "string"},
                "file_path": {"type": "string"},
                "line_number": {"type": "integer"},
                "blueprint": {"type": ["string", "null"]}
            }
        }
    
    def _get_flask_blueprint_schema(self) -> Dict[str, Any]:
        """Get schema for Flask blueprints."""
        return {
            "type": "object",
            "required": ["name", "file_path", "line_number"],
            "properties": {
                "name": {"type": "string"},
                "file_path": {"type": "string"},
                "line_number": {"type": "integer"},
                "url_prefix": {"type": ["string", "null"]}
            }
        }
    
    def _get_fastapi_route_schema(self) -> Dict[str, Any]:
        """Get schema for FastAPI routes."""
        return {
            "type": "object",
            "required": ["pattern", "method", "function", "file_path", "line_number", "dependencies"],
            "properties": {
                "pattern": {"type": "string"},
                "method": {"type": "string"},
                "function": {"type": "string"},
                "file_path": {"type": "string"},
                "line_number": {"type": "integer"},
                "dependencies": {"type": "array", "items": {"type": "string"}}
            }
        }
    
    def _get_fastapi_dependency_schema(self) -> Dict[str, Any]:
        """Get schema for FastAPI dependencies."""
        return {
            "type": "object",
            "required": ["name", "function", "file_path", "line_number"],
            "properties": {
                "name": {"type": "string"},
                "function": {"type": "string"},
                "file_path": {"type": "string"},
                "line_number": {"type": "integer"}
            }
        }


def validate_analysis_json(json_data: Union[str, Dict[str, Any]]) -> bool:
    """Convenience function to validate analysis JSON.
    
    Args:
        json_data: JSON string or dictionary to validate
        
    Returns:
        True if valid
        
    Raises:
        ValidationError: If validation fails
    """
    validator = JSONSchemaValidator()
    return validator.validate(json_data)