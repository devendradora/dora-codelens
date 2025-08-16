#!/usr/bin/env python3
"""
Database Schema Analysis Runner

This script runs the database schema analysis and outputs the results as JSON.
It serves as an entry point for the VS Code extension to call the database schema analyzer.
"""

import sys
import json
import os
from pathlib import Path
from datetime import datetime

# Add the analyzer directory to the Python path
analyzer_dir = Path(__file__).parent
sys.path.insert(0, str(analyzer_dir))

try:
    from database_schema_analyzer import DatabaseSchemaAnalyzer
except ImportError as e:
    print(json.dumps({
        "success": False,
        "error": f"Failed to import database schema analyzer: {e}",
        "errors": [{
            "type": "import_error",
            "message": f"Failed to import database schema analyzer: {e}"
        }]
    }))
    sys.exit(1)


def main():
    """Main entry point for database schema analysis"""
    if len(sys.argv) != 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python run_database_schema_analysis.py <project_path>",
            "errors": [{
                "type": "usage_error",
                "message": "Project path argument is required"
            }]
        }))
        sys.exit(1)
    
    project_path = sys.argv[1]
    
    # Validate project path
    if not os.path.exists(project_path):
        print(json.dumps({
            "success": False,
            "error": f"Project path does not exist: {project_path}",
            "errors": [{
                "type": "path_error",
                "message": f"Project path does not exist: {project_path}"
            }]
        }))
        sys.exit(1)
    
    if not os.path.isdir(project_path):
        print(json.dumps({
            "success": False,
            "error": f"Project path is not a directory: {project_path}",
            "errors": [{
                "type": "path_error",
                "message": f"Project path is not a directory: {project_path}"
            }]
        }))
        sys.exit(1)
    
    try:
        # Initialize the database schema analyzer
        analyzer = DatabaseSchemaAnalyzer()
        
        # Run the analysis
        print("Scanning for models and SQL files...", file=sys.stderr)
        result = analyzer.analyze_database_schema(project_path)
        
        print("Parsing SQL files...", file=sys.stderr)
        print("Generating graph data...", file=sys.stderr)
        
        # Convert the result to a JSON-serializable format
        output = {
            "success": True,
            "data": {
                "tables": [
                    {
                        "name": table.name,
                        "schema": table.schema,
                        "columns": [
                            {
                                "name": col.name,
                                "data_type": col.data_type,
                                "nullable": col.nullable,
                                "default_value": col.default_value,
                                "max_length": col.max_length,
                                "is_primary_key": col.is_primary_key,
                                "is_foreign_key": col.is_foreign_key,
                                "foreign_key_table": col.foreign_key_table,
                                "foreign_key_column": col.foreign_key_column
                            }
                            for col in table.columns
                        ],
                        "primary_keys": table.primary_keys,
                        "foreign_keys": [
                            {
                                "column": fk.column,
                                "referenced_table": fk.referenced_table,
                                "referenced_column": fk.referenced_column,
                                "on_delete": fk.on_delete,
                                "on_update": fk.on_update
                            }
                            for fk in table.foreign_keys
                        ],
                        "indexes": table.indexes,
                        "constraints": table.constraints,
                        "estimated_rows": table.estimated_rows,
                        "model_file": table.model_file,
                        "model_class": table.model_class
                    }
                    for table in result.tables
                ],
                "relationships": [
                    {
                        "from_table": rel.from_table,
                        "to_table": rel.to_table,
                        "relationship_type": rel.relationship_type,
                        "foreign_key_column": rel.foreign_key_column,
                        "referenced_column": rel.referenced_column,
                        "relationship_name": rel.relationship_name
                    }
                    for rel in result.relationships
                ],
                "indexes": [
                    {
                        "name": idx.name,
                        "table": idx.table,
                        "columns": idx.columns,
                        "unique": idx.unique,
                        "index_type": idx.index_type
                    }
                    for idx in result.indexes
                ],
                "constraints": [
                    {
                        "name": const.name,
                        "table": const.table,
                        "constraint_type": const.constraint_type,
                        "columns": const.columns,
                        "definition": const.definition
                    }
                    for const in result.constraints
                ],
                "raw_sql": [
                    {
                        "statement_type": stmt.statement_type,
                        "content": stmt.content,
                        "file_path": stmt.file_path,
                        "line_number": stmt.line_number,
                        "table_references": stmt.table_references,
                        "normalized_content": stmt.normalized_content
                    }
                    for stmt in result.raw_sql
                ],
                "graph_data": {
                    "nodes": [
                        {
                            "id": node.id,
                            "label": node.label,
                            "table_name": node.table_name,
                            "columns": [
                                {
                                    "name": col.name,
                                    "data_type": col.data_type,
                                    "nullable": col.nullable,
                                    "default_value": col.default_value,
                                    "max_length": col.max_length,
                                    "is_primary_key": col.is_primary_key,
                                    "is_foreign_key": col.is_foreign_key,
                                    "foreign_key_table": col.foreign_key_table,
                                    "foreign_key_column": col.foreign_key_column
                                }
                                for col in node.columns
                            ],
                            "position": node.position,
                            "styling": node.styling
                        }
                        for node in result.graph_data.nodes
                    ],
                    "edges": [
                        {
                            "id": edge.id,
                            "source": edge.source,
                            "target": edge.target,
                            "relationship_type": edge.relationship_type,
                            "label": edge.label,
                            "styling": edge.styling
                        }
                        for edge in result.graph_data.edges
                    ],
                    "layout": result.graph_data.layout,
                    "metadata": result.graph_data.metadata
                },
                "metadata": {
                    "analysis_timestamp": result.metadata.analysis_timestamp.isoformat(),
                    "project_path": result.metadata.project_path,
                    "total_tables": result.metadata.total_tables,
                    "total_relationships": result.metadata.total_relationships,
                    "frameworks_detected": result.metadata.frameworks_detected,
                    "sql_files_analyzed": result.metadata.sql_files_analyzed,
                    "model_files_analyzed": result.metadata.model_files_analyzed,
                    "organized_sql": result.metadata.organized_sql
                }
            },
            "errors": [],
            "warnings": []
        }
        
        # Output the result as JSON
        print(json.dumps(output, indent=2))
        
    except Exception as e:
        # Handle any errors during analysis
        error_output = {
            "success": False,
            "error": str(e),
            "errors": [{
                "type": "analysis_error",
                "message": str(e)
            }],
            "data": None
        }
        
        print(json.dumps(error_output))
        sys.exit(1)


if __name__ == "__main__":
    main()