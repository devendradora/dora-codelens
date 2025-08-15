"""
Admin configuration for the todos app.
"""
from django.contrib import admin
from .models import TodoList, Task, TaskComment


@admin.register(TodoList)
class TodoListAdmin(admin.ModelAdmin):
    """Admin interface for TodoList model."""
    list_display = ['name', 'owner', 'get_tasks_count', 'created_at']
    list_filter = ['created_at', 'owner']
    search_fields = ['name', 'description', 'owner__username']
    readonly_fields = ['created_at', 'updated_at']
    
    def get_tasks_count(self, obj):
        """Display task count in admin list."""
        return obj.get_total_tasks_count()
    get_tasks_count.short_description = 'Tasks Count'


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    """Admin interface for Task model."""
    list_display = ['title', 'todo_list', 'priority', 'completed', 'due_date', 'created_at']
    list_filter = ['completed', 'priority', 'created_at', 'todo_list']
    search_fields = ['title', 'description', 'todo_list__name']
    readonly_fields = ['created_at', 'updated_at']
    list_editable = ['completed', 'priority']
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('todo_list', 'todo_list__owner')


@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    """Admin interface for TaskComment model."""
    list_display = ['task', 'author', 'content_preview', 'created_at']
    list_filter = ['created_at', 'author']
    search_fields = ['content', 'task__title', 'author__username']
    readonly_fields = ['created_at']
    
    def content_preview(self, obj):
        """Display truncated content in admin list."""
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content Preview'
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('task', 'author')