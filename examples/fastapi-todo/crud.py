"""
CRUD operations for the FastAPI todo application.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from models import User, TodoList, Task, TaskComment
from schemas import UserCreate, TodoListCreate, TodoListUpdate, TaskCreate, TaskUpdate
from auth import get_password_hash


# User CRUD operations
def get_user(db: Session, user_id: int) -> Optional[User]:
    """Get user by ID."""
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """Get user by username."""
    return db.query(User).filter(User.username == username).first()


def create_user(db: Session, user: UserCreate) -> User:
    """Create a new user."""
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# TodoList CRUD operations
def get_todo_list(db: Session, list_id: int, user_id: int) -> Optional[TodoList]:
    """Get todo list by ID for a specific user."""
    return db.query(TodoList).filter(
        TodoList.id == list_id,
        TodoList.user_id == user_id
    ).first()


def get_user_todo_lists(db: Session, user_id: int) -> List[TodoList]:
    """Get all todo lists for a user."""
    return db.query(TodoList).filter(TodoList.user_id == user_id).all()


def create_todo_list(db: Session, todo_list: TodoListCreate, user_id: int) -> TodoList:
    """Create a new todo list."""
    db_todo_list = TodoList(
        name=todo_list.name,
        description=todo_list.description,
        user_id=user_id
    )
    db.add(db_todo_list)
    db.commit()
    db.refresh(db_todo_list)
    return db_todo_list


def update_todo_list(
    db: Session, 
    list_id: int, 
    todo_list_update: TodoListUpdate, 
    user_id: int
) -> Optional[TodoList]:
    """Update a todo list."""
    db_todo_list = get_todo_list(db, list_id, user_id)
    if not db_todo_list:
        return None
    
    update_data = todo_list_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_todo_list, field, value)
    
    db.commit()
    db.refresh(db_todo_list)
    return db_todo_list


def delete_todo_list(db: Session, list_id: int, user_id: int) -> bool:
    """Delete a todo list."""
    db_todo_list = get_todo_list(db, list_id, user_id)
    if not db_todo_list:
        return False
    
    db.delete(db_todo_list)
    db.commit()
    return True


# Task CRUD operations
def get_task(db: Session, task_id: int, user_id: int) -> Optional[Task]:
    """Get task by ID for a specific user."""
    return db.query(Task).join(TodoList).filter(
        Task.id == task_id,
        TodoList.user_id == user_id
    ).first()


def get_todo_list_tasks(db: Session, list_id: int) -> List[Task]:
    """Get all tasks for a todo list."""
    return db.query(Task).filter(Task.todo_list_id == list_id).all()


def create_task(db: Session, task: TaskCreate, list_id: int) -> Task:
    """Create a new task."""
    db_task = Task(
        title=task.title,
        description=task.description,
        priority=task.priority,
        due_date=task.due_date,
        todo_list_id=list_id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def update_task(
    db: Session, 
    task_id: int, 
    task_update: TaskUpdate, 
    user_id: int
) -> Optional[Task]:
    """Update a task."""
    db_task = get_task(db, task_id, user_id)
    if not db_task:
        return None
    
    update_data = task_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_task, field, value)
    
    db.commit()
    db.refresh(db_task)
    return db_task


def delete_task(db: Session, task_id: int, user_id: int) -> bool:
    """Delete a task."""
    db_task = get_task(db, task_id, user_id)
    if not db_task:
        return False
    
    db.delete(db_task)
    db.commit()
    return True


def toggle_task_completion(db: Session, task_id: int, user_id: int) -> Optional[Task]:
    """Toggle task completion status."""
    db_task = get_task(db, task_id, user_id)
    if not db_task:
        return None
    
    db_task.toggle_completion()
    db.commit()
    db.refresh(db_task)
    return db_task


# Task Comment CRUD operations
def create_task_comment(
    db: Session, 
    content: str, 
    task_id: int, 
    user_id: int
) -> TaskComment:
    """Create a new task comment."""
    db_comment = TaskComment(
        content=content,
        task_id=task_id,
        user_id=user_id
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment


def get_task_comments(db: Session, task_id: int) -> List[TaskComment]:
    """Get all comments for a task."""
    return db.query(TaskComment).filter(TaskComment.task_id == task_id).all()