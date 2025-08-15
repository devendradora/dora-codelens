# FastAPI Todo Example

A sample FastAPI todo application with dependency injection for testing the CodeMindMap extension.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Initialize the database:
```bash
python -c "from database import init_db; init_db()"
```

3. Run the development server:
```bash
uvicorn main:app --reload
```

4. Access the API documentation:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Features

- FastAPI with automatic API documentation
- SQLAlchemy ORM with SQLite database
- Pydantic models for request/response validation
- Dependency injection patterns
- JWT authentication
- CRUD operations for users, todo lists, and tasks

## Testing CodeMindMap

This project demonstrates:
- FastAPI route detection via @app.get/post decorators
- Dependency injection with Depends()
- Pydantic model relationships
- SQLAlchemy ORM patterns
- Authentication and authorization patterns