"""
Serializers for the Django todo application REST API.
"""
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import TodoList, Task, TaskComment


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']


class TaskCommentSerializer(serializers.ModelSerializer):
    """Serializer for TaskComment model."""
    author = UserSerializer(read_only=True)

    class Meta:
        model = TaskComment
        fields = ['id', 'content', 'author', 'created_at']
        read_only_fields = ['id', 'created_at']


class TaskSerializer(serializers.ModelSerializer):
    """Serializer for Task model."""
    comments = TaskCommentSerializer(many=True, read_only=True)
    comments_count = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'completed', 'priority',
            'due_date', 'todo_list', 'created_at', 'updated_at',
            'comments', 'comments_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_comments_count(self, obj):
        """Return the number of comments for this task."""
        return obj.comments.count()

    def validate_title(self, value):
        """Validate task title."""
        if len(value.strip()) < 3:
            raise serializers.ValidationError(
                "Task title must be at least 3 characters long."
            )
        return value.strip()


class TodoListSerializer(serializers.ModelSerializer):
    """Serializer for TodoList model."""
    owner = UserSerializer(read_only=True)
    tasks = TaskSerializer(many=True, read_only=True)
    tasks_count = serializers.SerializerMethodField()
    completed_tasks_count = serializers.SerializerMethodField()
    completion_rate = serializers.SerializerMethodField()

    class Meta:
        model = TodoList
        fields = [
            'id', 'name', 'description', 'owner', 'created_at', 'updated_at',
            'tasks', 'tasks_count', 'completed_tasks_count', 'completion_rate'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_tasks_count(self, obj):
        """Return the total number of tasks."""
        return obj.get_total_tasks_count()

    def get_completed_tasks_count(self, obj):
        """Return the number of completed tasks."""
        return obj.get_completed_tasks_count()

    def get_completion_rate(self, obj):
        """Return the completion rate as a percentage."""
        total = obj.get_total_tasks_count()
        if total == 0:
            return 0
        return round((obj.get_completed_tasks_count() / total) * 100, 2)

    def validate_name(self, value):
        """Validate todo list name."""
        if len(value.strip()) < 2:
            raise serializers.ValidationError(
                "Todo list name must be at least 2 characters long."
            )
        return value.strip()