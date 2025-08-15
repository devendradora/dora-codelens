"""
Pydantic schemas for request/response validation.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr


# User schemas
class UserBase(BaseModel):
    """Base user schema."""
    username: str
    email: Optional[EmailStr] = None


class UserCreate(UserBase):
    """User creation schema."""
    password: str


class UserLogin(BaseModel):
    """User login schema."""
    username: str
    password: str


class UserResponse(UserBase):
    """User response schema."""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Token schemas
class Token(BaseModel):
    """Token response schema."""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Token data schema."""
    username: Optional[str] = None


# Task Comment schemas
class TaskCommentBase(BaseModel):
    """Base task comment schema."""
    content: str


class TaskCommentCreate(TaskCommentBase):
    """Task comment creation schema."""
    pass


class TaskCommentResponse(TaskCommentBase):
    """Task comment response schema."""
    id: int
    task_id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Task schemas
class TaskBase(BaseModel):
    """Base task schema."""
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[datetime] = None


class TaskCreate(TaskBase):
    """Task creation schema."""
    pass


class TaskUpdate(BaseModel):
    """Task update schema."""
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None


class TaskResponse(TaskBase):
    """Task response schema."""
    id: int
    completed: bool
    todo_list_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    comments: List[TaskCommentResponse] = []

    class Config:
        from_attributes = True


# Todo List schemas
class TodoListBase(BaseModel):
    """Base todo list schema."""
    name: str
    description: Optional[str] = None


class TodoListCreate(TodoListBase):
    """Todo list creation schema."""
    pass


class TodoListUpdate(BaseModel):
    """Todo list update schema."""
    name: Optional[str] = None
    description: Optional[str] = None


class TodoListResponse(TodoListBase):
    """Todo list response schema."""
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    tasks: List[TaskResponse] = []
    tasks_count: int = 0
    completed_tasks_count: int = 0
    completion_rate: float = 0.0

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_stats(cls, todo_list):
        """Create response with calculated statistics."""
        data = cls.from_orm(todo_list)
        data.tasks_count = todo_list.tasks_count
        data.completed_tasks_count = todo_list.completed_tasks_count
        data.completion_rate = todo_list.completion_rate
        return data


# Statistics schemas
class UserStats(BaseModel):
    """User statistics schema."""
    total_todo_lists: int
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    completion_rate: float