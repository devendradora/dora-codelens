"""
App configuration for the todos app.
"""
from django.apps import AppConfig


class TodosConfig(AppConfig):
    """Configuration for the todos app."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'todos'
    verbose_name = 'Todo Lists'