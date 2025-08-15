"""
Database models for the Flask todo application.
"""
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import check_password_hash, generate_password_hash
from app import db


class User(UserMixin, db.Model):
    """User model for authentication."""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    password_hash = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    todo_lists = db.relationship('TodoList', backref='owner', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<User {self.username}>'
    
    def set_password(self, password):
        """Set password hash."""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check password against hash."""
        return check_password_hash(self.password_hash, password)
    
    def get_todo_lists_count(self):
        """Get the number of todo lists for this user."""
        return len(self.todo_lists)
    
    def get_total_tasks_count(self):
        """Get the total number of tasks across all lists."""
        return sum(todo_list.get_tasks_count() for todo_list in self.todo_lists)


class TodoList(db.Model):
    """Todo list model."""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tasks = db.relationship('Task', backref='todo_list', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<TodoList {self.name}>'
    
    def get_tasks_count(self):
        """Get the total number of tasks in this list."""
        return len(self.tasks)
    
    def get_completed_tasks_count(self):
        """Get the number of completed tasks in this list."""
        return len([task for task in self.tasks if task.completed])
    
    def get_completion_rate(self):
        """Get the completion rate as a percentage."""
        total = self.get_tasks_count()
        if total == 0:
            return 0
        return round((self.get_completed_tasks_count() / total) * 100, 2)


class Task(db.Model):
    """Task model."""
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    completed = db.Column(db.Boolean, default=False, nullable=False)
    priority = db.Column(db.String(10), default='medium', nullable=False)
    due_date = db.Column(db.DateTime, nullable=True)
    todo_list_id = db.Column(db.Integer, db.ForeignKey('todo_list.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    comments = db.relationship('TaskComment', backref='task', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        status = "✓" if self.completed else "○"
        return f'<Task {status} {self.title}>'
    
    def toggle_completion(self):
        """Toggle task completion status."""
        self.completed = not self.completed
        self.updated_at = datetime.utcnow()
    
    def mark_completed(self):
        """Mark task as completed."""
        self.completed = True
        self.updated_at = datetime.utcnow()
    
    def mark_incomplete(self):
        """Mark task as incomplete."""
        self.completed = False
        self.updated_at = datetime.utcnow()


class TaskComment(db.Model):
    """Task comment model."""
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    task_id = db.Column(db.Integer, db.ForeignKey('task.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    author = db.relationship('User', backref='comments')
    
    def __repr__(self):
        return f'<TaskComment by {self.author.username}>'