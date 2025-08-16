"""
Tests for Database Schema Analyzer

Tests the database schema analysis functionality including:
- Django model extraction
- SQLAlchemy model extraction  
- SQL file parsing
- Relationship detection
- Schema graph generation
"""

import pytest
import tempfile
import os
from pathlib import Path
from database_schema_analyzer import (
    DatabaseSchemaAnalyzer,
    ModelRelationshipExtractor,
    SQLSchemaParser,
    SQLTable,
    TableColumn,
    TableRelationship,
    SQLStatement,
    SchemaAnalysisResult
)


class TestModelRelationshipExtractor:
    """Test the ModelRelationshipExtractor class"""
    
    def setup_method(self):
        self.extractor = ModelRelationshipExtractor()
    
    def test_extract_django_models_basic(self):
        """Test basic Django model extraction"""
        django_model_content = '''
from django.db import models

class User(models.Model):
    username = models.CharField(max_length=100)
    email = models.EmailField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

class Post(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    published = models.BooleanField(default=False)
'''
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(django_model_content)
            f.flush()
            
            tables = self.extractor.extract_django_models(f.name)
            
            assert len(tables) == 2
            
            # Check User table
            user_table = next((t for t in tables if t.name == 'user'), None)
            assert user_table is not None
            assert len(user_table.columns) == 5  # id + 4 fields
            assert any(col.name == 'username' and col.data_type == 'VARCHAR' for col in user_table.columns)
            assert any(col.name == 'email' and col.data_type == 'VARCHAR' for col in user_table.columns)
            assert any(col.is_primary_key for col in user_table.columns)
            
            # Check Post table
            post_table = next((t for t in tables if t.name == 'post'), None)
            assert post_table is not None
            assert len(post_table.foreign_keys) == 1
            assert post_table.foreign_keys[0].referenced_table == 'User'
            
            os.unlink(f.name)
    
    def test_extract_sqlalchemy_models_basic(self):
        """Test basic SQLAlchemy model extraction"""
        sqlalchemy_model_content = '''
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(100), nullable=False)
    email = Column(String(255))
    is_active = Column(Boolean, default=True)

class Post(Base):
    __tablename__ = 'posts'
    
    id = Column(Integer, primary_key=True)
    title = Column(String(200))
    content = Column(String)
    user_id = Column(Integer, ForeignKey('users.id'))
    user = relationship("User")
'''
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(sqlalchemy_model_content)
            f.flush()
            
            tables = self.extractor.extract_sqlalchemy_models(f.name)
            
            assert len(tables) == 2
            
            # Check users table
            user_table = next((t for t in tables if t.name == 'users'), None)
            assert user_table is not None
            assert len(user_table.columns) == 4
            assert any(col.name == 'username' and col.data_type == 'VARCHAR' for col in user_table.columns)
            assert any(col.is_primary_key for col in user_table.columns)
            
            # Check posts table
            post_table = next((t for t in tables if t.name == 'posts'), None)
            assert post_table is not None
            assert len(post_table.foreign_keys) == 1
            assert post_table.foreign_keys[0].referenced_table == 'users'
            
            os.unlink(f.name)
    
    def test_camel_to_snake_conversion(self):
        """Test CamelCase to snake_case conversion"""
        assert self.extractor._camel_to_snake('UserProfile') == 'user_profile'
        assert self.extractor._camel_to_snake('BlogPost') == 'blog_post'
        assert self.extractor._camel_to_snake('User') == 'user'
        assert self.extractor._camel_to_snake('XMLHttpRequest') == 'xmlhttp_request'
    
    def test_django_field_type_mapping(self):
        """Test Django field type to SQL type mapping"""
        assert self.extractor.django_field_types['CharField'] == 'VARCHAR'
        assert self.extractor.django_field_types['IntegerField'] == 'INTEGER'
        assert self.extractor.django_field_types['BooleanField'] == 'BOOLEAN'
        assert self.extractor.django_field_types['DateTimeField'] == 'TIMESTAMP'
        assert self.extractor.django_field_types['ForeignKey'] == 'INTEGER'


class TestSQLStatementOrganizer:
    """Test the SQLStatementOrganizer class"""
    
    def setup_method(self):
        self.organizer = SQLStatementOrganizer()
    
    def test_organize_sql_statements(self):
        """Test SQL statement organization by category"""
        statements = [
            SQLStatement('CREATE', 'CREATE TABLE users (id INTEGER)', '/test.sql', 1, ['users']),
            SQLStatement('INSERT', 'INSERT INTO users VALUES (1)', '/test.sql', 2, ['users']),
            SQLStatement('SELECT', 'SELECT * FROM users', '/test.sql', 3, ['users']),
            SQLStatement('ALTER', 'ALTER TABLE users ADD COLUMN email VARCHAR(255)', '/test.sql', 4, ['users']),
            SQLStatement('UPDATE', 'UPDATE users SET email = "test@example.com"', '/test.sql', 5, ['users'])
        ]
        
        organized = self.organizer.organize_sql_statements(statements)
        
        assert len(organized['DDL']['CREATE']) == 1
        assert len(organized['DDL']['ALTER']) == 1
        assert len(organized['DML']['INSERT']) == 1
        assert len(organized['DML']['UPDATE']) == 1
        assert len(organized['DQL']['SELECT']) == 1
    
    def test_prepare_syntax_highlighting_data(self):
        """Test syntax highlighting data preparation"""
        statement = SQLStatement(
            'SELECT', 
            'SELECT id, username FROM users WHERE active = TRUE',
            '/test.sql', 
            1, 
            ['users']
        )
        
        highlighting_data = self.organizer.prepare_syntax_highlighting_data(statement)
        
        assert 'original' in highlighting_data
        assert 'tokens' in highlighting_data
        assert 'keywords' in highlighting_data
        assert len(highlighting_data['tokens']) > 0
        
        # Check that keywords are identified
        keyword_values = [token['value'].upper() for token in highlighting_data['keywords']]
        assert 'SELECT' in keyword_values
        assert 'FROM' in keyword_values
        assert 'WHERE' in keyword_values
    
    def test_tokenize_sql(self):
        """Test SQL tokenization"""
        sql = "SELECT id, 'test string' FROM users -- comment"
        tokens = self.organizer._tokenize_sql(sql)
        
        token_types = [token['type'] for token in tokens]
        token_values = [token['value'] for token in tokens]
        
        assert 'keyword' in token_types
        assert 'string' in token_types
        assert 'comment' in token_types
        assert 'SELECT' in token_values
        assert "'test string'" in token_values
        assert '-- comment' in token_values
    
    def test_generate_sql_summary(self):
        """Test SQL summary generation"""
        statements = [
            SQLStatement('CREATE', 'CREATE TABLE users (id INTEGER)', '/test1.sql', 1, ['users']),
            SQLStatement('CREATE', 'CREATE TABLE posts (id INTEGER)', '/test1.sql', 2, ['posts']),
            SQLStatement('INSERT', 'INSERT INTO users VALUES (1)', '/test2.sql', 1, ['users']),
            SQLStatement('SELECT', 'SELECT * FROM users JOIN posts', '/test2.sql', 2, ['users', 'posts'])
        ]
        
        summary = self.organizer.generate_sql_summary(statements)
        
        assert summary['total_statements'] == 4
        assert summary['files_analyzed'] == 2
        assert summary['tables_referenced'] == 2  # users, posts
        assert 'DDL' in summary['by_category']
        assert 'DML' in summary['by_category']
        assert 'DQL' in summary['by_category']
        assert summary['by_type']['CREATE'] == 2
        assert summary['by_type']['INSERT'] == 1
        assert summary['by_type']['SELECT'] == 1
        assert isinstance(summary['complexity_score'], float)
    
    def test_get_statement_category(self):
        """Test statement category detection"""
        assert self.organizer._get_statement_category('CREATE') == 'DDL'
        assert self.organizer._get_statement_category('INSERT') == 'DML'
        assert self.organizer._get_statement_category('SELECT') == 'DQL'
        assert self.organizer._get_statement_category('GRANT') == 'DCL'
        assert self.organizer._get_statement_category('COMMIT') == 'TCL'
        assert self.organizer._get_statement_category('UNKNOWN') == 'UNKNOWN'


class TestSQLSchemaParser:
    """Test the SQLSchemaParser class"""
    
    def setup_method(self):
        self.parser = SQLSchemaParser()
    
    def test_parse_create_table_statement(self):
        """Test parsing CREATE TABLE statements"""
        sql_content = '''
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP
);

CREATE TABLE posts (
    id INTEGER PRIMARY KEY,
    title VARCHAR(200),
    content TEXT,
    user_id INTEGER,
    published BOOLEAN DEFAULT FALSE
);
'''
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
            f.write(sql_content)
            f.flush()
            
            tables, statements = self.parser._parse_sql_file(f.name)
            
            assert len(tables) == 2
            assert len(statements) == 2
            
            # Check users table
            users_table = next((t for t in tables if t.name == 'users'), None)
            assert users_table is not None
            assert len(users_table.columns) == 5
            assert any(col.name == 'username' and col.data_type == 'VARCHAR' for col in users_table.columns)
            assert any(col.is_primary_key for col in users_table.columns)
            
            # Check statements
            create_statements = [s for s in statements if s.statement_type == 'CREATE']
            assert len(create_statements) == 2
            assert all('users' in s.table_references or 'posts' in s.table_references for s in create_statements)
            
            os.unlink(f.name)
    
    def test_split_sql_statements(self):
        """Test splitting SQL content into statements"""
        sql_content = '''
-- This is a comment
CREATE TABLE test (id INTEGER);
INSERT INTO test VALUES (1);
SELECT * FROM test;
'''
        statements = self.parser._split_sql_statements(sql_content)
        
        assert len(statements) == 3
        assert 'CREATE TABLE test' in statements[0]
        assert 'INSERT INTO test' in statements[1]
        assert 'SELECT * FROM test' in statements[2]
    
    def test_get_statement_type(self):
        """Test SQL statement type detection"""
        assert self.parser._get_statement_type('CREATE TABLE test') == 'CREATE'
        assert self.parser._get_statement_type('INSERT INTO test VALUES') == 'INSERT'
        assert self.parser._get_statement_type('SELECT * FROM test') == 'SELECT'
        assert self.parser._get_statement_type('UPDATE test SET') == 'UPDATE'
        assert self.parser._get_statement_type('DELETE FROM test') == 'DELETE'
    
    def test_extract_table_references(self):
        """Test extracting table names from SQL statements"""
        statements = [
            'SELECT * FROM users',
            'INSERT INTO posts VALUES (1, "test")',
            'UPDATE users SET name = "test"',
            'CREATE TABLE comments (id INTEGER)',
            'JOIN posts ON users.id = posts.user_id'
        ]
        
        expected_tables = [
            ['USERS'],
            ['POSTS'],
            ['USERS'],
            ['COMMENTS'],
            ['POSTS']
        ]
        
        for stmt, expected in zip(statements, expected_tables):
            tables = self.parser._extract_table_references(stmt)
            assert tables == expected
    
    def test_extract_raw_sql_organized(self):
        """Test organized raw SQL extraction"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create SQL files with various statement types
            sql_content = '''
-- DDL Statements
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username VARCHAR(100) NOT NULL
);

ALTER TABLE users ADD COLUMN email VARCHAR(255);

-- DML Statements  
INSERT INTO users (username, email) VALUES ('john', 'john@example.com');
UPDATE users SET email = 'john.doe@example.com' WHERE username = 'john';

-- DQL Statements
SELECT * FROM users WHERE email IS NOT NULL;
SELECT COUNT(*) FROM users;
'''
            
            sql_path = os.path.join(temp_dir, 'schema.sql')
            with open(sql_path, 'w') as f:
                f.write(sql_content)
            
            organized_data = self.parser.extract_raw_sql_organized(temp_dir)
            
            assert 'organized_statements' in organized_data
            assert 'summary' in organized_data
            assert 'total_files' in organized_data
            assert 'extraction_metadata' in organized_data
            
            # Check organized statements
            organized = organized_data['organized_statements']
            assert 'DDL' in organized
            assert 'DML' in organized
            assert 'DQL' in organized
            
            # Check DDL statements
            assert 'CREATE' in organized['DDL']
            assert 'ALTER' in organized['DDL']
            assert len(organized['DDL']['CREATE']) == 1
            assert len(organized['DDL']['ALTER']) == 1
            
            # Check that statements have highlighting data
            create_stmt_data = organized['DDL']['CREATE'][0]
            assert 'statement' in create_stmt_data
            assert 'highlighting' in create_stmt_data
            assert 'tokens' in create_stmt_data['highlighting']
            
            # Check summary
            summary = organized_data['summary']
            assert summary['total_statements'] > 0
            assert 'DDL' in summary['by_category']
            assert 'DML' in summary['by_category']
            assert 'DQL' in summary['by_category']


class TestSchemaGraphGenerator:
    """Test the SchemaGraphGenerator class"""
    
    def setup_method(self):
        self.generator = SchemaGraphGenerator()
    
    def test_generate_schema_graph_data(self):
        """Test schema graph data generation"""
        # Create test tables
        user_table = SQLTable(name='users')
        user_table.columns = [
            TableColumn(name='id', data_type='INTEGER', is_primary_key=True),
            TableColumn(name='username', data_type='VARCHAR', max_length=100),
            TableColumn(name='email', data_type='VARCHAR', max_length=255)
        ]
        user_table.primary_keys = ['id']
        
        post_table = SQLTable(name='posts')
        post_table.columns = [
            TableColumn(name='id', data_type='INTEGER', is_primary_key=True),
            TableColumn(name='title', data_type='VARCHAR', max_length=200),
            TableColumn(name='user_id', data_type='INTEGER', is_foreign_key=True, 
                       foreign_key_table='users', foreign_key_column='id')
        ]
        post_table.primary_keys = ['id']
        post_table.foreign_keys = [
            type('ForeignKey', (), {
                'column': 'user_id',
                'referenced_table': 'users',
                'referenced_column': 'id'
            })()
        ]
        
        tables = [user_table, post_table]
        
        # Create test relationship
        relationship = TableRelationship(
            from_table='posts',
            to_table='users',
            relationship_type='many-to-one',
            foreign_key_column='user_id',
            referenced_column='id'
        )
        relationships = [relationship]
        
        # Generate graph data
        graph_data = self.generator.generate_schema_graph_data(tables, relationships)
        
        assert len(graph_data.nodes) == 2
        assert len(graph_data.edges) == 1
        assert graph_data.layout == 'cose'
        
        # Check node properties
        user_node = next((n for n in graph_data.nodes if n.table_name == 'users'), None)
        assert user_node is not None
        assert user_node.id == 'table_users'
        assert len(user_node.columns) == 3
        assert user_node.styling is not None
        
        # Check edge properties
        edge = graph_data.edges[0]
        assert edge.source == 'table_posts'
        assert edge.target == 'table_users'
        assert edge.relationship_type == 'many-to-one'
    
    def test_detect_table_relationships(self):
        """Test automatic relationship detection"""
        # Create test tables with foreign keys
        user_table = SQLTable(name='users')
        user_table.columns = [
            TableColumn(name='id', data_type='INTEGER', is_primary_key=True)
        ]
        
        post_table = SQLTable(name='posts')
        post_table.columns = [
            TableColumn(name='id', data_type='INTEGER', is_primary_key=True),
            TableColumn(name='user_id', data_type='INTEGER', is_foreign_key=True)
        ]
        post_table.foreign_keys = [
            type('ForeignKey', (), {
                'column': 'user_id',
                'referenced_table': 'users',
                'referenced_column': 'id'
            })()
        ]
        
        tables = [user_table, post_table]
        relationships = self.generator.detect_table_relationships(tables)
        
        assert len(relationships) == 1
        assert relationships[0].from_table == 'posts'
        assert relationships[0].to_table == 'users'
        assert relationships[0].relationship_type == 'many-to-one'
    
    def test_is_junction_table(self):
        """Test junction table detection"""
        # Create a typical junction table
        junction_table = SQLTable(name='user_roles')
        junction_table.columns = [
            TableColumn(name='user_id', data_type='INTEGER', is_foreign_key=True),
            TableColumn(name='role_id', data_type='INTEGER', is_foreign_key=True),
            TableColumn(name='created_at', data_type='TIMESTAMP')
        ]
        junction_table.foreign_keys = [
            type('ForeignKey', (), {'column': 'user_id', 'referenced_table': 'users', 'referenced_column': 'id'})(),
            type('ForeignKey', (), {'column': 'role_id', 'referenced_table': 'roles', 'referenced_column': 'id'})()
        ]
        
        assert self.generator._is_junction_table(junction_table) is True
        
        # Create a regular table
        regular_table = SQLTable(name='users')
        regular_table.columns = [
            TableColumn(name='id', data_type='INTEGER', is_primary_key=True),
            TableColumn(name='username', data_type='VARCHAR'),
            TableColumn(name='email', data_type='VARCHAR')
        ]
        
        assert self.generator._is_junction_table(regular_table) is False
    
    def test_format_table_label(self):
        """Test table label formatting"""
        table = SQLTable(name='users')
        table.columns = [
            TableColumn(name='id', data_type='INTEGER', is_primary_key=True),
            TableColumn(name='username', data_type='VARCHAR', max_length=100),
            TableColumn(name='email', data_type='VARCHAR', is_foreign_key=False)
        ]
        
        label = self.generator._format_table_label(table)
        
        assert '📋 users' in label
        assert '🔑 id: INTEGER' in label
        assert '📄 username: VARCHAR(100)' in label
        assert '📄 email: VARCHAR' in label
    
    def test_determine_relationship_type(self):
        """Test relationship type determination"""
        # Test one-to-one relationship (FK is also PK)
        profile_table = SQLTable(name='profiles')
        profile_table.columns = [
            TableColumn(name='user_id', data_type='INTEGER', is_primary_key=True, is_foreign_key=True)
        ]
        profile_table.foreign_keys = [
            type('ForeignKey', (), {'column': 'user_id', 'referenced_table': 'users', 'referenced_column': 'id'})()
        ]
        
        user_table = SQLTable(name='users')
        fk = profile_table.foreign_keys[0]
        
        relationship_type = self.generator._determine_relationship_type(profile_table, fk, user_table)
        assert relationship_type == 'one-to-one'


class TestDatabaseSchemaAnalyzer:
    """Test the main DatabaseSchemaAnalyzer class"""
    
    def setup_method(self):
        self.analyzer = DatabaseSchemaAnalyzer()
    
    def test_analyze_database_schema_django_project(self):
        """Test analyzing a Django project structure"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create Django models.py
            models_content = '''
from django.db import models

class User(models.Model):
    username = models.CharField(max_length=100)
    email = models.EmailField()

class Post(models.Model):
    title = models.CharField(max_length=200)
    author = models.ForeignKey(User, on_delete=models.CASCADE)
'''
            
            models_path = os.path.join(temp_dir, 'models.py')
            with open(models_path, 'w') as f:
                f.write(models_content)
            
            # Create SQL migration
            sql_content = '''
CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);
'''
            
            sql_path = os.path.join(temp_dir, 'migration.sql')
            with open(sql_path, 'w') as f:
                f.write(sql_content)
            
            result = self.analyzer.analyze_database_schema(temp_dir)
            
            assert isinstance(result, SchemaAnalysisResult)
            assert len(result.tables) >= 2  # At least User and Post from Django
            assert len(result.relationships) >= 1  # At least Post -> User relationship
            assert 'Django' in result.metadata.frameworks_detected
            assert result.metadata.total_tables >= 2
            assert result.metadata.model_files_analyzed >= 1
    
    def test_analyze_database_schema_sqlalchemy_project(self):
        """Test analyzing a SQLAlchemy project structure"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create SQLAlchemy models
            models_content = '''
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String(100))

class Post(Base):
    __tablename__ = 'posts'
    id = Column(Integer, primary_key=True)
    title = Column(String(200))
    user_id = Column(Integer, ForeignKey('users.id'))
'''
            
            models_path = os.path.join(temp_dir, 'database.py')
            with open(models_path, 'w') as f:
                f.write(models_content)
            
            result = self.analyzer.analyze_database_schema(temp_dir)
            
            assert isinstance(result, SchemaAnalysisResult)
            assert len(result.tables) >= 2
            assert len(result.relationships) >= 1
            assert 'SQLAlchemy' in result.metadata.frameworks_detected
            assert result.metadata.total_tables >= 2
    
    def test_might_contain_models(self):
        """Test detection of files that might contain models"""
        # Test common model file names
        assert self.analyzer._might_contain_models('/path/to/models.py')
        assert self.analyzer._might_contain_models('/path/to/schema.py')
        assert self.analyzer._might_contain_models('/path/to/database.py')
        
        # Test content-based detection
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write('from django.db import models\nclass User(models.Model): pass')
            f.flush()
            
            assert self.analyzer._might_contain_models(f.name)
            os.unlink(f.name)
    
    def test_extract_relationships(self):
        """Test relationship extraction from tables"""
        # Create test tables
        user_table = SQLTable(name='users')
        user_table.columns = [
            TableColumn(name='id', data_type='INTEGER', is_primary_key=True)
        ]
        
        post_table = SQLTable(name='posts')
        post_table.columns = [
            TableColumn(name='id', data_type='INTEGER', is_primary_key=True),
            TableColumn(name='user_id', data_type='INTEGER', is_foreign_key=True)
        ]
        post_table.foreign_keys = [
            type('ForeignKey', (), {
                'column': 'user_id',
                'referenced_table': 'users',
                'referenced_column': 'id'
            })()
        ]
        
        tables = [user_table, post_table]
        relationships = self.analyzer._extract_relationships(tables)
        
        assert len(relationships) == 1
        assert relationships[0].from_table == 'posts'
        assert relationships[0].to_table == 'users'
        assert relationships[0].foreign_key_column == 'user_id'
        assert relationships[0].relationship_type == 'many-to-one'


class TestDataModels:
    """Test the data model classes"""
    
    def test_table_column_creation(self):
        """Test TableColumn data class"""
        column = TableColumn(
            name='username',
            data_type='VARCHAR',
            nullable=False,
            max_length=100,
            is_primary_key=False
        )
        
        assert column.name == 'username'
        assert column.data_type == 'VARCHAR'
        assert column.nullable is False
        assert column.max_length == 100
        assert column.is_primary_key is False
        assert column.is_foreign_key is False
    
    def test_sql_table_creation(self):
        """Test SQLTable data class"""
        columns = [
            TableColumn(name='id', data_type='INTEGER', is_primary_key=True),
            TableColumn(name='name', data_type='VARCHAR')
        ]
        
        table = SQLTable(
            name='users',
            columns=columns,
            primary_keys=['id']
        )
        
        assert table.name == 'users'
        assert len(table.columns) == 2
        assert table.primary_keys == ['id']
        assert table.schema == 'public'  # default value
    
    def test_table_relationship_creation(self):
        """Test TableRelationship data class"""
        relationship = TableRelationship(
            from_table='posts',
            to_table='users',
            relationship_type='many-to-one',
            foreign_key_column='user_id',
            referenced_column='id'
        )
        
        assert relationship.from_table == 'posts'
        assert relationship.to_table == 'users'
        assert relationship.relationship_type == 'many-to-one'
        assert relationship.foreign_key_column == 'user_id'
        assert relationship.referenced_column == 'id'
    
    def test_sql_statement_creation(self):
        """Test SQLStatement data class"""
        statement = SQLStatement(
            statement_type='CREATE',
            content='CREATE TABLE users (id INTEGER)',
            file_path='/path/to/file.sql',
            line_number=1,
            table_references=['users']
        )
        
        assert statement.statement_type == 'CREATE'
        assert statement.content == 'CREATE TABLE users (id INTEGER)'
        assert statement.file_path == '/path/to/file.sql'
        assert statement.line_number == 1
        assert statement.table_references == ['users']
    
    def test_schema_analysis_result_creation(self):
        """Test SchemaAnalysisResult data class"""
        result = SchemaAnalysisResult()
        
        assert isinstance(result.tables, list)
        assert isinstance(result.relationships, list)
        assert isinstance(result.raw_sql, list)
        assert result.metadata.total_tables == 0
        assert result.metadata.total_relationships == 0


if __name__ == '__main__':
    pytest.main([__file__])