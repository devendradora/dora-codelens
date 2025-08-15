"""
Todo models for the Django todo application.
"""
from django.db import models
from django.contrib.auth.models import User


class TodoList(models.Model):
    """A todo list belonging to a user."""
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='todo_lists')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.owner.username})"

    def get_completed_tasks_count(self):
        """Return the number of completed tasks in this list."""
        return self.tasks.filter(completed=True).count()

    def get_total_tasks_count(self):
        """Return the total number of tasks in this list."""
        return self.tasks.count()


class Task(models.Model):
    """A task within a todo list."""
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    completed = models.BooleanField(default=False)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    due_date = models.DateTimeField(null=True, blank=True)
    todo_list = models.ForeignKey(TodoList, on_delete=models.CASCADE, related_name='tasks')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        status = "✓" if self.completed else "○"
        return f"{status} {self.title}"

    def mark_completed(self):
        """Mark this task as completed."""
        self.completed = True
        self.save()

    def mark_incomplete(self):
        """Mark this task as incomplete."""
        self.completed = False
        self.save()


class TaskComment(models.Model):
    """Comments on tasks."""
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author.username} on {self.task.title}"