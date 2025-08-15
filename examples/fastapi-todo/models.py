"""
SQLAlchemy models for the FastAPI todo application.
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    """User model."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=True)
    hashed_password = Column(String(120), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    todo_lists = relationship("TodoList", back_populates="owner", cascade="all, delete-orphan")
    task_comments = relationship("TaskComment", back_populates="author")

    def __repr__(self):
        return f"<User {self.username}>"


class TodoList(Base):
    """Todo list model."""
    __tablename__ = "todo_lists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="todo_lists")
    tasks = relationship("Task", back_populates="todo_list", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<TodoList {self.name}>"

    @property
    def tasks_count(self):
        """Get the total number of tasks."""
        return len(self.tasks)

    @property
    def completed_tasks_count(self):
        """Get the number of completed tasks."""
        return len([task for task in self.tasks if task.completed])

    @property
    def completion_rate(self):
        """Get the completion rate as a percentage."""
        if self.tasks_count == 0:
            return 0
        return round((self.completed_tasks_count / self.tasks_count) * 100, 2)


class Task(Base):
    """Task model."""
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    completed = Column(Boolean, default=False, nullable=False)
    priority = Column(String(10), default="medium", nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    todo_list_id = Column(Integer, ForeignKey("todo_lists.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    todo_list = relationship("TodoList", back_populates="tasks")
    comments = relationship("TaskComment", back_populates="task", cascade="all, delete-orphan")

    def __repr__(self):
        status = "✓" if self.completed else "○"
        return f"<Task {status} {self.title}>"

    def toggle_completion(self):
        """Toggle task completion status."""
        self.completed = not self.completed

    def mark_completed(self):
        """Mark task as completed."""
        self.completed = True

    def mark_incomplete(self):
        """Mark task as incomplete."""
        self.completed = False


class TaskComment(Base):
    """Task comment model."""
    __tablename__ = "task_comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    task = relationship("Task", back_populates="comments")
    author = relationship("User", back_populates="task_comments")

    def __repr__(self):
        return f"<TaskComment by {self.author.username}>"