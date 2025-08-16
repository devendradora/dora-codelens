"""
Database Schema Analyzer

This module provides comprehensive database schema analysis capabilities including:
- Django and SQLAlchemy model analysis
- SQL file parsing and schema extraction
- Relationship detection and mapping
- Schema graph data generation
"""

import os
import re
import ast
import json
from typing import List, Dict, Optional, Set, Tuple, Any
from dataclasses import dataclass, field
from pathlib import Path
from datetime import datetime


@dataclass
class TableColumn:
    """Represents a database table column"""
    name: str
    data_type: str
    nullable: bool = True
    default_value: Optional[str] = None
    max_length: Optional[int] = None
    is_primary_key: bool = False
    is_foreign_key: bool = False
    foreign_key_table: Optional[str] = None
    foreign_key_column: Optional[str] = None


@dataclass
class ForeignKey:
    """Represents a foreign key relationship"""
    column: str
    referenced_table: str
    referenced_column: str
    on_delete: Optional[str] = None
    on_update: Optional[str] = None


@dataclass
class DatabaseIndex:
    """Represents a database index"""
    name: str
    table: str
    columns: List[str]
    unique: bool = False
    index_type: Optional[str] = None


@dataclass
class DatabaseConstraint:
    """Represents a database constraint"""
    name: str
    table: str
    constraint_type: str  # 'PRIMARY KEY', 'UNIQUE', 'CHECK', etc.
    columns: List[str]
    definition: Optional[str] = None


@dataclass
class SQLTable:
    """Represents a database table"""
    name: str
    schema: str = "public"
    columns: List[TableColumn] = field(default_factory=list)
    primary_keys: List[str] = field(default_factory=list)
    foreign_keys: List[ForeignKey] = field(default_factory=list)
    indexes: List[str] = field(default_factory=list)
    constraints: List[str] = field(default_factory=list)
    estimated_rows: Optional[int] = None
    model_file: Optional[str] = None
    model_class: Optional[str] = None


@dataclass
class TableRelationship:
    """Represents a relationship between tables"""
    from_table: str
    to_table: str
    relationship_type: str  # 'one-to-one', 'one-to-many', 'many-to-many'
    foreign_key_column: str
    referenced_column: str
    relationship_name: Optional[str] = None


@dataclass
class SQLStatement:
    """Represents a SQL statement found in project files"""
    statement_type: str  # 'CREATE', 'ALTER', 'INSERT', 'SELECT', etc.
    content: str
    file_path: str
    line_number: int
    table_references: List[str] = field(default_factory=list)
    normalized_content: Optional[str] = None


@dataclass
class SchemaGraphNode:
    """Represents a node in the schema graph"""
    id: str
    label: str
    table_name: str
    columns: List[TableColumn]
    position: Optional[Dict[str, float]] = None
    styling: Optional[Dict[str, Any]] = None


@dataclass
class SchemaGraphEdge:
    """Represents an edge in the schema graph"""
    id: str
    source: str
    target: str
    relationship_type: str
    label: Optional[str] = None
    styling: Optional[Dict[str, Any]] = None


@dataclass
class SchemaGraphData:
    """Contains data for schema graph visualization"""
    nodes: List[SchemaGraphNode] = field(default_factory=list)
    edges: List[SchemaGraphEdge] = field(default_factory=list)
    layout: str = "cose"
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SchemaMetadata:
    """Metadata about the schema analysis"""
    analysis_timestamp: datetime
    project_path: str
    total_tables: int
    total_relationships: int
    frameworks_detected: List[str] = field(default_factory=list)
    sql_files_analyzed: int = 0
    model_files_analyzed: int = 0
    organized_sql: Optional[Dict[str, Any]] = None


@dataclass
class SchemaAnalysisResult:
    """Complete result of database schema analysis"""
    tables: List[SQLTable] = field(default_factory=list)
    relationships: List[TableRelationship] = field(default_factory=list)
    indexes: List[DatabaseIndex] = field(default_factory=list)
    constraints: List[DatabaseConstraint] = field(default_factory=list)
    raw_sql: List[SQLStatement] = field(default_factory=list)
    graph_data: SchemaGraphData = field(default_factory=SchemaGraphData)
    metadata: SchemaMetadata = field(default_factory=lambda: SchemaMetadata(
        analysis_timestamp=datetime.now(),
        project_path="",
        total_tables=0,
        total_relationships=0
    ))


class ModelRelationshipExtractor:
    """Extracts relationships from Django and SQLAlchemy models"""
    
    def __init__(self):
        self.django_field_types = {
            'CharField': 'VARCHAR',
            'TextField': 'TEXT',
            'IntegerField': 'INTEGER',
            'BigIntegerField': 'BIGINT',
            'SmallIntegerField': 'SMALLINT',
            'PositiveIntegerField': 'INTEGER',
            'FloatField': 'FLOAT',
            'DecimalField': 'DECIMAL',
            'BooleanField': 'BOOLEAN',
            'DateField': 'DATE',
            'DateTimeField': 'TIMESTAMP',
            'TimeField': 'TIME',
            'EmailField': 'VARCHAR',
            'URLField': 'VARCHAR',
            'SlugField': 'VARCHAR',
            'UUIDField': 'UUID',
            'JSONField': 'JSON',
            'ForeignKey': 'INTEGER',
            'OneToOneField': 'INTEGER',
            'ManyToManyField': 'INTEGER'
        }
        
        self.sqlalchemy_field_types = {
            'String': 'VARCHAR',
            'Text': 'TEXT',
            'Integer': 'INTEGER',
            'BigInteger': 'BIGINT',
            'SmallInteger': 'SMALLINT',
            'Float': 'FLOAT',
            'Numeric': 'DECIMAL',
            'Boolean': 'BOOLEAN',
            'Date': 'DATE',
            'DateTime': 'TIMESTAMP',
            'Time': 'TIME',
            'JSON': 'JSON',
            'ForeignKey': 'INTEGER',
            'relationship': 'RELATIONSHIP'
        }
    
    def extract_django_models(self, file_path: str) -> List[SQLTable]:
        """Extract Django models from a Python file"""
        tables = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    # Check if it's a Django model
                    if self._is_django_model(node):
                        table = self._parse_django_model(node, file_path)
                        if table:
                            tables.append(table)
        
        except Exception as e:
            print(f"Error parsing Django models in {file_path}: {e}")
        
        return tables
    
    def extract_sqlalchemy_models(self, file_path: str) -> List[SQLTable]:
        """Extract SQLAlchemy models from a Python file"""
        tables = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    # Check if it's a SQLAlchemy model
                    if self._is_sqlalchemy_model(node):
                        table = self._parse_sqlalchemy_model(node, file_path)
                        if table:
                            tables.append(table)
        
        except Exception as e:
            print(f"Error parsing SQLAlchemy models in {file_path}: {e}")
        
        return tables
    
    def _is_django_model(self, node: ast.ClassDef) -> bool:
        """Check if a class is a Django model"""
        for base in node.bases:
            if isinstance(base, ast.Attribute):
                if (isinstance(base.value, ast.Name) and 
                    base.value.id == 'models' and 
                    base.attr == 'Model'):
                    return True
            elif isinstance(base, ast.Name) and base.id == 'Model':
                return True
        return False
    
    def _is_sqlalchemy_model(self, node: ast.ClassDef) -> bool:
        """Check if a class is a SQLAlchemy model"""
        # Look for __tablename__ attribute or Base inheritance
        for item in node.body:
            if isinstance(item, ast.Assign):
                for target in item.targets:
                    if isinstance(target, ast.Name) and target.id == '__tablename__':
                        return True
        
        # Check for Base inheritance
        for base in node.bases:
            if isinstance(base, ast.Name) and base.id in ['Base', 'DeclarativeBase']:
                return True
        
        return False
    
    def _parse_django_model(self, node: ast.ClassDef, file_path: str) -> Optional[SQLTable]:
        """Parse a Django model class into a SQLTable"""
        table_name = self._camel_to_snake(node.name)
        columns = []
        foreign_keys = []
        
        for item in node.body:
            if isinstance(item, ast.Assign):
                for target in item.targets:
                    if isinstance(target, ast.Name):
                        field_name = target.id
                        if isinstance(item.value, ast.Call):
                            column = self._parse_django_field(field_name, item.value)
                            if column:
                                columns.append(column)
                                if column.is_foreign_key:
                                    fk = ForeignKey(
                                        column=field_name,
                                        referenced_table=column.foreign_key_table or "",
                                        referenced_column=column.foreign_key_column or "id"
                                    )
                                    foreign_keys.append(fk)
        
        # Add default id field if not present
        if not any(col.is_primary_key for col in columns):
            id_column = TableColumn(
                name="id",
                data_type="INTEGER",
                nullable=False,
                is_primary_key=True
            )
            columns.insert(0, id_column)
        
        return SQLTable(
            name=table_name,
            columns=columns,
            foreign_keys=foreign_keys,
            primary_keys=[col.name for col in columns if col.is_primary_key],
            model_file=file_path,
            model_class=node.name
        )
    
    def _parse_sqlalchemy_model(self, node: ast.ClassDef, file_path: str) -> Optional[SQLTable]:
        """Parse a SQLAlchemy model class into a SQLTable"""
        table_name = None
        columns = []
        foreign_keys = []
        
        # Find table name
        for item in node.body:
            if isinstance(item, ast.Assign):
                for target in item.targets:
                    if isinstance(target, ast.Name) and target.id == '__tablename__':
                        if isinstance(item.value, ast.Constant):
                            table_name = item.value.value
                        break
        
        if not table_name:
            table_name = self._camel_to_snake(node.name)
        
        # Parse columns
        for item in node.body:
            if isinstance(item, ast.Assign):
                for target in item.targets:
                    if isinstance(target, ast.Name):
                        field_name = target.id
                        if field_name.startswith('_'):
                            continue
                        if isinstance(item.value, ast.Call):
                            column = self._parse_sqlalchemy_field(field_name, item.value)
                            if column:
                                columns.append(column)
                                if column.is_foreign_key:
                                    fk = ForeignKey(
                                        column=field_name,
                                        referenced_table=column.foreign_key_table or "",
                                        referenced_column=column.foreign_key_column or "id"
                                    )
                                    foreign_keys.append(fk)
        
        return SQLTable(
            name=table_name,
            columns=columns,
            foreign_keys=foreign_keys,
            primary_keys=[col.name for col in columns if col.is_primary_key],
            model_file=file_path,
            model_class=node.name
        )
    
    def _parse_django_field(self, field_name: str, call_node: ast.Call) -> Optional[TableColumn]:
        """Parse a Django field definition"""
        if not isinstance(call_node.func, ast.Attribute):
            return None
        
        field_type = call_node.func.attr
        data_type = self.django_field_types.get(field_type, 'VARCHAR')
        
        column = TableColumn(
            name=field_name,
            data_type=data_type,
            nullable=True
        )
        
        # Parse field arguments
        for keyword in call_node.keywords:
            if keyword.arg == 'null':
                if isinstance(keyword.value, ast.Constant):
                    column.nullable = keyword.value.value
            elif keyword.arg == 'max_length':
                if isinstance(keyword.value, ast.Constant):
                    column.max_length = keyword.value.value
            elif keyword.arg == 'primary_key':
                if isinstance(keyword.value, ast.Constant):
                    column.is_primary_key = keyword.value.value
            elif keyword.arg == 'default':
                if isinstance(keyword.value, ast.Constant):
                    column.default_value = str(keyword.value.value)
        
        # Handle foreign key fields
        if field_type in ['ForeignKey', 'OneToOneField']:
            column.is_foreign_key = True
            if call_node.args:
                if isinstance(call_node.args[0], ast.Constant):
                    column.foreign_key_table = call_node.args[0].value
                elif isinstance(call_node.args[0], ast.Attribute):
                    column.foreign_key_table = call_node.args[0].attr
                elif isinstance(call_node.args[0], ast.Name):
                    # Handle case like ForeignKey(User, ...)
                    column.foreign_key_table = self._camel_to_snake(call_node.args[0].id)
            column.foreign_key_column = "id"  # Default referenced column
        
        return column
    
    def _parse_sqlalchemy_field(self, field_name: str, call_node: ast.Call) -> Optional[TableColumn]:
        """Parse a SQLAlchemy field definition"""
        if not isinstance(call_node.func, ast.Name):
            return None
        
        field_type = call_node.func.id
        if field_type != 'Column':
            return None
        
        if not call_node.args:
            return None
        
        # First argument is usually the type
        type_arg = call_node.args[0]
        data_type = 'VARCHAR'
        
        if isinstance(type_arg, ast.Call) and isinstance(type_arg.func, ast.Name):
            type_name = type_arg.func.id
            data_type = self.sqlalchemy_field_types.get(type_name, 'VARCHAR')
        elif isinstance(type_arg, ast.Name):
            data_type = self.sqlalchemy_field_types.get(type_arg.id, 'VARCHAR')
        
        column = TableColumn(
            name=field_name,
            data_type=data_type,
            nullable=True
        )
        
        # Parse additional arguments and keywords
        for arg in call_node.args[1:]:
            if isinstance(arg, ast.Call) and isinstance(arg.func, ast.Name):
                if arg.func.id == 'ForeignKey':
                    column.is_foreign_key = True
                    if arg.args and isinstance(arg.args[0], ast.Constant):
                        ref = arg.args[0].value
                        if '.' in ref:
                            table, col = ref.split('.', 1)
                            column.foreign_key_table = table
                            column.foreign_key_column = col
        
        for keyword in call_node.keywords:
            if keyword.arg == 'nullable':
                if isinstance(keyword.value, ast.Constant):
                    column.nullable = keyword.value.value
            elif keyword.arg == 'primary_key':
                if isinstance(keyword.value, ast.Constant):
                    column.is_primary_key = keyword.value.value
            elif keyword.arg == 'default':
                if isinstance(keyword.value, ast.Constant):
                    column.default_value = str(keyword.value.value)
        
        return column
    
    def _camel_to_snake(self, name: str) -> str:
        """Convert CamelCase to snake_case"""
        s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
        return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()


class SQLStatementOrganizer:
    """Organizes and categorizes SQL statements for display and analysis"""
    
    def __init__(self):
        self.statement_categories = {
            'DDL': ['CREATE', 'ALTER', 'DROP', 'TRUNCATE'],
            'DML': ['INSERT', 'UPDATE', 'DELETE', 'MERGE'],
            'DQL': ['SELECT', 'WITH'],
            'DCL': ['GRANT', 'REVOKE'],
            'TCL': ['COMMIT', 'ROLLBACK', 'SAVEPOINT']
        }
        
        self.syntax_keywords = {
            'keywords': [
                'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER',
                'GROUP BY', 'ORDER BY', 'HAVING', 'UNION', 'INTERSECT', 'EXCEPT',
                'CREATE', 'ALTER', 'DROP', 'INSERT', 'UPDATE', 'DELETE', 'TABLE',
                'INDEX', 'VIEW', 'TRIGGER', 'PROCEDURE', 'FUNCTION', 'DATABASE',
                'SCHEMA', 'PRIMARY KEY', 'FOREIGN KEY', 'REFERENCES', 'CONSTRAINT',
                'NOT NULL', 'UNIQUE', 'DEFAULT', 'CHECK', 'AUTO_INCREMENT'
            ],
            'data_types': [
                'INTEGER', 'INT', 'BIGINT', 'SMALLINT', 'TINYINT',
                'VARCHAR', 'CHAR', 'TEXT', 'LONGTEXT', 'MEDIUMTEXT',
                'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'REAL',
                'DATE', 'TIME', 'DATETIME', 'TIMESTAMP', 'YEAR',
                'BOOLEAN', 'BOOL', 'BIT', 'BINARY', 'VARBINARY',
                'BLOB', 'LONGBLOB', 'MEDIUMBLOB', 'TINYBLOB',
                'JSON', 'UUID', 'ENUM', 'SET'
            ],
            'functions': [
                'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CONCAT', 'SUBSTRING',
                'LENGTH', 'UPPER', 'LOWER', 'TRIM', 'NOW', 'CURRENT_TIMESTAMP',
                'DATE_FORMAT', 'COALESCE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
            ]
        }
    
    def organize_sql_statements(self, statements: List[SQLStatement]) -> Dict[str, List[SQLStatement]]:
        """Organize SQL statements by category and type"""
        organized = {
            'DDL': {'CREATE': [], 'ALTER': [], 'DROP': [], 'TRUNCATE': []},
            'DML': {'INSERT': [], 'UPDATE': [], 'DELETE': [], 'MERGE': []},
            'DQL': {'SELECT': [], 'WITH': []},
            'DCL': {'GRANT': [], 'REVOKE': []},
            'TCL': {'COMMIT': [], 'ROLLBACK': [], 'SAVEPOINT': []},
            'UNKNOWN': []
        }
        
        for statement in statements:
            category = self._get_statement_category(statement.statement_type)
            if category == 'UNKNOWN':
                organized['UNKNOWN'].append(statement)
            else:
                if statement.statement_type in organized[category]:
                    organized[category][statement.statement_type].append(statement)
                else:
                    organized['UNKNOWN'].append(statement)
        
        return organized
    
    def prepare_syntax_highlighting_data(self, statement: SQLStatement) -> Dict[str, Any]:
        """Prepare data for SQL syntax highlighting"""
        content = statement.content
        highlighting_data = {
            'original': content,
            'tokens': [],
            'keywords': [],
            'data_types': [],
            'functions': [],
            'strings': [],
            'comments': [],
            'numbers': []
        }
        
        # Tokenize the SQL content
        tokens = self._tokenize_sql(content)
        
        for token in tokens:
            token_upper = token['value'].upper()
            
            if token['type'] == 'keyword':
                if token_upper in self.syntax_keywords['keywords']:
                    highlighting_data['keywords'].append(token)
                elif token_upper in self.syntax_keywords['data_types']:
                    highlighting_data['data_types'].append(token)
                elif token_upper in self.syntax_keywords['functions']:
                    highlighting_data['functions'].append(token)
            elif token['type'] == 'string':
                highlighting_data['strings'].append(token)
            elif token['type'] == 'comment':
                highlighting_data['comments'].append(token)
            elif token['type'] == 'number':
                highlighting_data['numbers'].append(token)
            
            highlighting_data['tokens'].append(token)
        
        return highlighting_data
    
    def _get_statement_category(self, statement_type: str) -> str:
        """Get the category of a SQL statement"""
        for category, types in self.statement_categories.items():
            if statement_type in types:
                return category
        return 'UNKNOWN'
    
    def _tokenize_sql(self, sql: str) -> List[Dict[str, Any]]:
        """Simple SQL tokenizer for syntax highlighting"""
        tokens = []
        i = 0
        line = 1
        column = 1
        
        while i < len(sql):
            char = sql[i]
            
            # Skip whitespace
            if char.isspace():
                if char == '\n':
                    line += 1
                    column = 1
                else:
                    column += 1
                i += 1
                continue
            
            # Comments
            if char == '-' and i + 1 < len(sql) and sql[i + 1] == '-':
                start = i
                while i < len(sql) and sql[i] != '\n':
                    i += 1
                tokens.append({
                    'type': 'comment',
                    'value': sql[start:i],
                    'start': start,
                    'end': i,
                    'line': line,
                    'column': column
                })
                column += i - start
                continue
            
            # Multi-line comments
            if char == '/' and i + 1 < len(sql) and sql[i + 1] == '*':
                start = i
                i += 2
                while i + 1 < len(sql) and not (sql[i] == '*' and sql[i + 1] == '/'):
                    if sql[i] == '\n':
                        line += 1
                        column = 1
                    else:
                        column += 1
                    i += 1
                i += 2  # Skip */
                tokens.append({
                    'type': 'comment',
                    'value': sql[start:i],
                    'start': start,
                    'end': i,
                    'line': line,
                    'column': column
                })
                continue
            
            # String literals
            if char in ['"', "'"]:
                quote_char = char
                start = i
                i += 1
                while i < len(sql) and sql[i] != quote_char:
                    if sql[i] == '\\' and i + 1 < len(sql):
                        i += 2  # Skip escaped character
                    else:
                        i += 1
                i += 1  # Skip closing quote
                tokens.append({
                    'type': 'string',
                    'value': sql[start:i],
                    'start': start,
                    'end': i,
                    'line': line,
                    'column': column
                })
                column += i - start
                continue
            
            # Numbers
            if char.isdigit():
                start = i
                while i < len(sql) and (sql[i].isdigit() or sql[i] == '.'):
                    i += 1
                tokens.append({
                    'type': 'number',
                    'value': sql[start:i],
                    'start': start,
                    'end': i,
                    'line': line,
                    'column': column
                })
                column += i - start
                continue
            
            # Identifiers and keywords
            if char.isalpha() or char == '_':
                start = i
                while i < len(sql) and (sql[i].isalnum() or sql[i] == '_'):
                    i += 1
                value = sql[start:i]
                tokens.append({
                    'type': 'keyword' if value.upper() in self._get_all_keywords() else 'identifier',
                    'value': value,
                    'start': start,
                    'end': i,
                    'line': line,
                    'column': column
                })
                column += i - start
                continue
            
            # Operators and punctuation
            if char in '()[]{},.;=<>!+-*/|&^%':
                tokens.append({
                    'type': 'operator',
                    'value': char,
                    'start': i,
                    'end': i + 1,
                    'line': line,
                    'column': column
                })
                i += 1
                column += 1
                continue
            
            # Unknown character
            i += 1
            column += 1
        
        return tokens
    
    def _get_all_keywords(self) -> Set[str]:
        """Get all SQL keywords for tokenization"""
        all_keywords = set()
        for keyword_list in self.syntax_keywords.values():
            all_keywords.update(keyword_list)
        return all_keywords
    
    def generate_sql_summary(self, statements: List[SQLStatement]) -> Dict[str, Any]:
        """Generate a summary of SQL statements"""
        organized = self.organize_sql_statements(statements)
        
        summary = {
            'total_statements': len(statements),
            'by_category': {},
            'by_type': {},
            'files_analyzed': len(set(stmt.file_path for stmt in statements)),
            'tables_referenced': len(set(table for stmt in statements for table in stmt.table_references)),
            'complexity_score': self._calculate_sql_complexity(statements)
        }
        
        # Count by category
        for category, types in organized.items():
            if category == 'UNKNOWN':
                summary['by_category'][category] = len(types)
            else:
                category_count = sum(len(stmts) for stmts in types.values())
                if category_count > 0:
                    summary['by_category'][category] = category_count
        
        # Count by type
        for statement in statements:
            stmt_type = statement.statement_type
            summary['by_type'][stmt_type] = summary['by_type'].get(stmt_type, 0) + 1
        
        return summary
    
    def _calculate_sql_complexity(self, statements: List[SQLStatement]) -> float:
        """Calculate a complexity score for the SQL statements"""
        if not statements:
            return 0.0
        
        complexity_weights = {
            'SELECT': 1.0,
            'INSERT': 0.5,
            'UPDATE': 0.7,
            'DELETE': 0.6,
            'CREATE': 1.2,
            'ALTER': 1.5,
            'DROP': 0.8
        }
        
        total_complexity = 0.0
        for statement in statements:
            base_weight = complexity_weights.get(statement.statement_type, 1.0)
            
            # Adjust for statement length (longer = more complex)
            length_factor = min(len(statement.content) / 100, 2.0)
            
            # Adjust for number of table references
            table_factor = len(statement.table_references) * 0.2
            
            statement_complexity = base_weight * (1 + length_factor + table_factor)
            total_complexity += statement_complexity
        
        return round(total_complexity / len(statements), 2)


class SQLSchemaParser:
    """Parses SQL files and migration scripts to extract schema information"""
    
    def __init__(self):
        self.sql_keywords = {
            'CREATE', 'ALTER', 'DROP', 'INSERT', 'UPDATE', 'DELETE', 'SELECT',
            'TABLE', 'INDEX', 'VIEW', 'TRIGGER', 'PROCEDURE', 'FUNCTION'
        }
        self.organizer = SQLStatementOrganizer()
    
    def parse_sql_files(self, project_path: str) -> Tuple[List[SQLTable], List[SQLStatement]]:
        """Parse all SQL files in the project"""
        tables = []
        statements = []
        
        sql_files = self._find_sql_files(project_path)
        
        for file_path in sql_files:
            try:
                file_tables, file_statements = self._parse_sql_file(file_path)
                tables.extend(file_tables)
                statements.extend(file_statements)
            except Exception as e:
                print(f"Error parsing SQL file {file_path}: {e}")
        
        # Enhance statements with syntax highlighting data
        for statement in statements:
            statement.normalized_content = self._normalize_sql(statement.content)
        
        return tables, statements
    
    def extract_raw_sql_organized(self, project_path: str) -> Dict[str, Any]:
        """Extract and organize raw SQL statements from project files"""
        _, statements = self.parse_sql_files(project_path)
        
        # Organize statements
        organized_statements = self.organizer.organize_sql_statements(statements)
        
        # Generate summary
        summary = self.organizer.generate_sql_summary(statements)
        
        # Prepare syntax highlighting data for each statement
        highlighted_statements = {}
        for category, types in organized_statements.items():
            if category == 'UNKNOWN':
                highlighted_statements[category] = [
                    {
                        'statement': stmt,
                        'highlighting': self.organizer.prepare_syntax_highlighting_data(stmt)
                    }
                    for stmt in types
                ]
            else:
                highlighted_statements[category] = {}
                for stmt_type, stmts in types.items():
                    if stmts:  # Only include non-empty lists
                        highlighted_statements[category][stmt_type] = [
                            {
                                'statement': stmt,
                                'highlighting': self.organizer.prepare_syntax_highlighting_data(stmt)
                            }
                            for stmt in stmts
                        ]
        
        return {
            'organized_statements': highlighted_statements,
            'summary': summary,
            'total_files': len(set(stmt.file_path for stmt in statements)),
            'extraction_metadata': {
                'timestamp': datetime.now().isoformat(),
                'project_path': project_path,
                'parser_version': '1.0'
            }
        }
    
    def _find_sql_files(self, project_path: str) -> List[str]:
        """Find all SQL files in the project"""
        sql_files = []
        
        for root, dirs, files in os.walk(project_path):
            # Skip common non-relevant directories
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', '__pycache__']]
            
            for file in files:
                if file.endswith(('.sql', '.ddl', '.dml')):
                    sql_files.append(os.path.join(root, file))
        
        return sql_files
    
    def _parse_sql_file(self, file_path: str) -> Tuple[List[SQLTable], List[SQLStatement]]:
        """Parse a single SQL file"""
        tables = []
        statements = []
        
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Split content into statements
        sql_statements = self._split_sql_statements(content)
        
        for i, stmt in enumerate(sql_statements):
            stmt = stmt.strip()
            if not stmt:
                continue
            
            statement_type = self._get_statement_type(stmt)
            table_refs = self._extract_table_references(stmt)
            
            sql_statement = SQLStatement(
                statement_type=statement_type,
                content=stmt,
                file_path=file_path,
                line_number=i + 1,
                table_references=table_refs,
                normalized_content=self._normalize_sql(stmt)
            )
            statements.append(sql_statement)
            
            # Extract table definitions from CREATE TABLE statements
            if statement_type == 'CREATE' and 'TABLE' in stmt.upper():
                table = self._parse_create_table(stmt, file_path)
                if table:
                    tables.append(table)
        
        return tables, statements
    
    def _split_sql_statements(self, content: str) -> List[str]:
        """Split SQL content into individual statements"""
        # Simple split by semicolon (could be improved for complex cases)
        statements = []
        current_statement = []
        in_string = False
        string_char = None
        
        lines = content.split('\n')
        for line_num, line in enumerate(lines):
            line = line.strip()
            if not line or line.startswith('--'):
                continue
            
            i = 0
            while i < len(line):
                char = line[i]
                
                if not in_string:
                    if char in ['"', "'"]:
                        in_string = True
                        string_char = char
                    elif char == ';':
                        current_statement.append(line[:i])
                        if current_statement:
                            statements.append(' '.join(current_statement))
                            current_statement = []
                        line = line[i+1:].strip()
                        i = -1
                else:
                    if char == string_char:
                        in_string = False
                        string_char = None
                
                i += 1
            
            if line:
                current_statement.append(line)
        
        if current_statement:
            statements.append(' '.join(current_statement))
        
        return statements
    
    def _get_statement_type(self, statement: str) -> str:
        """Get the type of SQL statement"""
        statement = statement.strip().upper()
        for keyword in self.sql_keywords:
            if statement.startswith(keyword):
                return keyword
        return 'UNKNOWN'
    
    def _extract_table_references(self, statement: str) -> List[str]:
        """Extract table names referenced in the statement"""
        tables = []
        statement_upper = statement.upper()
        
        # Simple regex patterns for common table references
        patterns = [
            r'FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)',
            r'JOIN\s+([a-zA-Z_][a-zA-Z0-9_]*)',
            r'UPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*)',
            r'INSERT\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)',
            r'CREATE\s+TABLE\s+([a-zA-Z_][a-zA-Z0-9_]*)',
            r'ALTER\s+TABLE\s+([a-zA-Z_][a-zA-Z0-9_]*)',
            r'DROP\s+TABLE\s+([a-zA-Z_][a-zA-Z0-9_]*)'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, statement_upper)
            tables.extend(matches)
        
        return list(set(tables))  # Remove duplicates
    
    def _normalize_sql(self, statement: str) -> str:
        """Normalize SQL statement for better analysis"""
        # Remove extra whitespace and normalize case
        normalized = re.sub(r'\s+', ' ', statement.strip())
        return normalized
    
    def _parse_create_table(self, statement: str, file_path: str) -> Optional[SQLTable]:
        """Parse a CREATE TABLE statement"""
        try:
            # Extract table name
            match = re.search(r'CREATE\s+TABLE\s+([a-zA-Z_][a-zA-Z0-9_]*)', statement, re.IGNORECASE)
            if not match:
                return None
            
            table_name = match.group(1)
            
            # Extract column definitions (simplified parsing)
            columns = []
            column_section = re.search(r'\((.*)\)', statement, re.DOTALL)
            if column_section:
                column_text = column_section.group(1)
                column_lines = [line.strip() for line in column_text.split(',')]
                
                for line in column_lines:
                    if not line or line.upper().startswith(('PRIMARY KEY', 'FOREIGN KEY', 'CONSTRAINT')):
                        continue
                    
                    column = self._parse_column_definition(line)
                    if column:
                        columns.append(column)
            
            return SQLTable(
                name=table_name,
                columns=columns,
                primary_keys=[col.name for col in columns if col.is_primary_key]
            )
        
        except Exception as e:
            print(f"Error parsing CREATE TABLE statement: {e}")
            return None
    
    def _parse_column_definition(self, definition: str) -> Optional[TableColumn]:
        """Parse a column definition from CREATE TABLE"""
        parts = definition.strip().split()
        if len(parts) < 2:
            return None
        
        column_name = parts[0]
        data_type = parts[1]
        
        column = TableColumn(
            name=column_name,
            data_type=data_type.upper(),
            nullable=True
        )
        
        definition_upper = definition.upper()
        if 'NOT NULL' in definition_upper:
            column.nullable = False
        if 'PRIMARY KEY' in definition_upper:
            column.is_primary_key = True
        
        return column


class SchemaGraphGenerator:
    """Generates visual schema graph representations"""
    
    def __init__(self):
        self.node_colors = {
            'primary': '#3498db',
            'foreign': '#e74c3c',
            'regular': '#95a5a6'
        }
        self.edge_colors = {
            'one-to-one': '#2ecc71',
            'one-to-many': '#f39c12',
            'many-to-many': '#9b59b6'
        }
    
    def generate_schema_graph_data(self, tables: List[SQLTable], relationships: List[TableRelationship]) -> SchemaGraphData:
        """Generate graph data for schema visualization"""
        nodes = []
        edges = []
        
        # Create nodes for each table
        for i, table in enumerate(tables):
            node = self._create_table_node(table, i)
            nodes.append(node)
        
        # Create edges for relationships
        for relationship in relationships:
            edge = self._create_relationship_edge(relationship)
            if edge:
                edges.append(edge)
        
        # Calculate layout positions
        self._calculate_layout_positions(nodes, edges)
        
        return SchemaGraphData(
            nodes=nodes,
            edges=edges,
            layout="cose",
            metadata={
                'total_tables': len(tables),
                'total_relationships': len(relationships),
                'generated_at': datetime.now().isoformat()
            }
        )
    
    def _create_table_node(self, table: SQLTable, index: int) -> SchemaGraphNode:
        """Create a graph node for a database table"""
        # Determine node styling based on table characteristics
        has_foreign_keys = len(table.foreign_keys) > 0
        is_junction_table = self._is_junction_table(table)
        
        styling = {
            'backgroundColor': self._get_table_color(table),
            'borderColor': '#2c3e50',
            'borderWidth': 2,
            'shape': 'rectangle',
            'width': max(150, len(table.name) * 10 + 50),
            'height': max(100, len(table.columns) * 20 + 40),
            'fontSize': 12,
            'fontWeight': 'bold' if table.primary_keys else 'normal'
        }
        
        return SchemaGraphNode(
            id=f"table_{table.name}",
            label=self._format_table_label(table),
            table_name=table.name,
            columns=table.columns,
            styling=styling,
            position={'x': index * 200, 'y': index * 150}  # Initial positioning
        )
    
    def _create_relationship_edge(self, relationship: TableRelationship) -> Optional[SchemaGraphEdge]:
        """Create a graph edge for a table relationship"""
        edge_id = f"rel_{relationship.from_table}_{relationship.to_table}_{relationship.foreign_key_column}"
        
        styling = {
            'lineColor': self.edge_colors.get(relationship.relationship_type, '#7f8c8d'),
            'targetArrowColor': self.edge_colors.get(relationship.relationship_type, '#7f8c8d'),
            'targetArrowShape': 'triangle',
            'lineStyle': 'solid',
            'width': 2,
            'curveStyle': 'bezier'
        }
        
        # Add relationship type indicator
        label = self._format_relationship_label(relationship)
        
        return SchemaGraphEdge(
            id=edge_id,
            source=f"table_{relationship.from_table}",
            target=f"table_{relationship.to_table}",
            relationship_type=relationship.relationship_type,
            label=label,
            styling=styling
        )
    
    def _format_table_label(self, table: SQLTable) -> str:
        """Format the display label for a table node"""
        label_parts = [f"📋 {table.name}"]
        
        # Add column information
        for column in table.columns[:5]:  # Show first 5 columns
            icon = "🔑" if column.is_primary_key else "🔗" if column.is_foreign_key else "📄"
            type_info = f"{column.data_type}"
            if column.max_length:
                type_info += f"({column.max_length})"
            
            label_parts.append(f"{icon} {column.name}: {type_info}")
        
        if len(table.columns) > 5:
            label_parts.append(f"... and {len(table.columns) - 5} more columns")
        
        return "\n".join(label_parts)
    
    def _format_relationship_label(self, relationship: TableRelationship) -> str:
        """Format the display label for a relationship edge"""
        type_symbols = {
            'one-to-one': '1:1',
            'one-to-many': '1:N',
            'many-to-many': 'N:M',
            'many-to-one': 'N:1'
        }
        
        symbol = type_symbols.get(relationship.relationship_type, '?')
        return f"{symbol}\n{relationship.foreign_key_column}"
    
    def _get_table_color(self, table: SQLTable) -> str:
        """Determine the color for a table node based on its characteristics"""
        if self._is_junction_table(table):
            return '#f39c12'  # Orange for junction tables
        elif len(table.foreign_keys) > 2:
            return '#e74c3c'  # Red for tables with many foreign keys
        elif len(table.foreign_keys) > 0:
            return '#3498db'  # Blue for tables with foreign keys
        else:
            return '#2ecc71'  # Green for standalone tables
    
    def _is_junction_table(self, table: SQLTable) -> bool:
        """Check if a table is likely a junction table for many-to-many relationships"""
        # Heuristics for junction table detection
        if len(table.columns) <= 4 and len(table.foreign_keys) >= 2:
            # Most columns are foreign keys
            fk_columns = sum(1 for col in table.columns if col.is_foreign_key)
            return fk_columns >= len(table.columns) - 2
        return False
    
    def _calculate_layout_positions(self, nodes: List[SchemaGraphNode], edges: List[SchemaGraphEdge]):
        """Calculate optimal positions for nodes using a simple force-directed approach"""
        if len(nodes) <= 1:
            return
        
        # Simple circular layout for now
        import math
        center_x, center_y = 400, 300
        radius = max(200, len(nodes) * 30)
        
        for i, node in enumerate(nodes):
            angle = 2 * math.pi * i / len(nodes)
            node.position = {
                'x': center_x + radius * math.cos(angle),
                'y': center_y + radius * math.sin(angle)
            }
    
    def detect_table_relationships(self, tables: List[SQLTable]) -> List[TableRelationship]:
        """Detect and analyze relationships between tables"""
        relationships = []
        table_dict = {table.name: table for table in tables}
        
        for table in tables:
            for fk in table.foreign_keys:
                if fk.referenced_table in table_dict:
                    # Determine relationship type
                    relationship_type = self._determine_relationship_type(
                        table, fk, table_dict[fk.referenced_table]
                    )
                    
                    relationship = TableRelationship(
                        from_table=table.name,
                        to_table=fk.referenced_table,
                        relationship_type=relationship_type,
                        foreign_key_column=fk.column,
                        referenced_column=fk.referenced_column,
                        relationship_name=f"{table.name}_{fk.column}"
                    )
                    relationships.append(relationship)
        
        return relationships
    
    def _determine_relationship_type(self, from_table: SQLTable, fk: ForeignKey, to_table: SQLTable) -> str:
        """Determine the type of relationship between two tables"""
        # Check if the foreign key column is also a primary key (one-to-one)
        fk_column = next((col for col in from_table.columns if col.name == fk.column), None)
        if fk_column and fk_column.is_primary_key:
            return 'one-to-one'
        
        # Check if this is a junction table (many-to-many)
        if self._is_junction_table(from_table):
            return 'many-to-many'
        
        # Default to many-to-one
        return 'many-to-one'


class DatabaseSchemaAnalyzer:
    """Main database schema analyzer that orchestrates all analysis components"""
    
    def __init__(self):
        self.model_extractor = ModelRelationshipExtractor()
        self.sql_parser = SQLSchemaParser()
        self.graph_generator = SchemaGraphGenerator()
    
    def analyze_database_schema(self, project_path: str) -> SchemaAnalysisResult:
        """Perform comprehensive database schema analysis"""
        result = SchemaAnalysisResult()
        result.metadata.project_path = project_path
        result.metadata.analysis_timestamp = datetime.now()
        
        # Find and analyze model files
        model_files = self._find_model_files(project_path)
        frameworks_detected = []
        
        for file_path in model_files:
            try:
                # Try Django models first
                django_tables = self.model_extractor.extract_django_models(file_path)
                if django_tables:
                    result.tables.extend(django_tables)
                    if 'Django' not in frameworks_detected:
                        frameworks_detected.append('Django')
                    result.metadata.model_files_analyzed += 1
                    continue
                
                # Try SQLAlchemy models
                sqlalchemy_tables = self.model_extractor.extract_sqlalchemy_models(file_path)
                if sqlalchemy_tables:
                    result.tables.extend(sqlalchemy_tables)
                    if 'SQLAlchemy' not in frameworks_detected:
                        frameworks_detected.append('SQLAlchemy')
                    result.metadata.model_files_analyzed += 1
            
            except Exception as e:
                print(f"Error analyzing model file {file_path}: {e}")
        
        # Parse SQL files
        try:
            sql_tables, sql_statements = self.sql_parser.parse_sql_files(project_path)
            result.tables.extend(sql_tables)
            result.raw_sql = sql_statements
            result.metadata.sql_files_analyzed = len(set(stmt.file_path for stmt in sql_statements))
        except Exception as e:
            print(f"Error parsing SQL files: {e}")
        
        # Extract organized raw SQL data
        try:
            organized_sql_data = self.sql_parser.extract_raw_sql_organized(project_path)
            # Store organized SQL data in metadata for later use
            result.metadata.organized_sql = organized_sql_data
        except Exception as e:
            print(f"Error organizing SQL data: {e}")
        
        # Extract relationships
        result.relationships = self._extract_relationships(result.tables)
        
        # Enhanced relationship detection using graph generator
        enhanced_relationships = self.graph_generator.detect_table_relationships(result.tables)
        
        # Merge relationships (prefer enhanced detection)
        relationship_dict = {f"{r.from_table}_{r.foreign_key_column}": r for r in result.relationships}
        for enhanced_rel in enhanced_relationships:
            key = f"{enhanced_rel.from_table}_{enhanced_rel.foreign_key_column}"
            relationship_dict[key] = enhanced_rel
        
        result.relationships = list(relationship_dict.values())
        
        # Generate schema graph data
        result.graph_data = self.graph_generator.generate_schema_graph_data(
            result.tables, result.relationships
        )
        
        # Update metadata
        result.metadata.frameworks_detected = frameworks_detected
        result.metadata.total_tables = len(result.tables)
        result.metadata.total_relationships = len(result.relationships)
        
        return result
    
    def _find_model_files(self, project_path: str) -> List[str]:
        """Find Python files that might contain database models"""
        model_files = []
        
        for root, dirs, files in os.walk(project_path):
            # Skip common non-relevant directories
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', '__pycache__']]
            
            for file in files:
                if file.endswith('.py'):
                    file_path = os.path.join(root, file)
                    # Check if file might contain models
                    if self._might_contain_models(file_path):
                        model_files.append(file_path)
        
        return model_files
    
    def _might_contain_models(self, file_path: str) -> bool:
        """Check if a Python file might contain database models"""
        filename = os.path.basename(file_path).lower()
        
        # Common model file names
        if filename in ['models.py', 'model.py', 'schema.py', 'database.py']:
            return True
        
        # Check file content for model indicators
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read(1000)  # Read first 1000 chars
                content_lower = content.lower()
                
                model_indicators = [
                    'models.model', 'class.*model', 'sqlalchemy',
                    'declarative_base', '__tablename__', 'foreignkey',
                    'relationship', 'column', 'table'
                ]
                
                for indicator in model_indicators:
                    if re.search(indicator, content_lower):
                        return True
        
        except Exception:
            pass
        
        return False
    
    def _extract_relationships(self, tables: List[SQLTable]) -> List[TableRelationship]:
        """Extract relationships between tables"""
        relationships = []
        table_dict = {table.name: table for table in tables}
        
        for table in tables:
            for fk in table.foreign_keys:
                if fk.referenced_table in table_dict:
                    relationship = TableRelationship(
                        from_table=table.name,
                        to_table=fk.referenced_table,
                        relationship_type='many-to-one',  # Default assumption
                        foreign_key_column=fk.column,
                        referenced_column=fk.referenced_column
                    )
                    relationships.append(relationship)
        
        return relationships