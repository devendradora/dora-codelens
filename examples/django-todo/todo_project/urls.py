"""
URL configuration for todo_project project.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('todos.urls')),
    path('', include('todos.urls')),
]