"""
URL configuration for the todos app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# API router
router = DefaultRouter()
router.register(r'todolists', views.TodoListViewSet, basename='todolist')
router.register(r'tasks', views.TaskViewSet, basename='task')

urlpatterns = [
    # Web views
    path('', views.home, name='home'),
    path('register/', views.register, name='register'),
    path('todos/', views.todo_list_view, name='todo_list'),
    path('todos/<int:list_id>/', views.todo_detail_view, name='todo_detail'),
    path('todos/create/', views.create_todo_list, name='create_todo_list'),
    path('todos/<int:list_id>/tasks/create/', views.create_task, name='create_task'),
    path('tasks/<int:task_id>/toggle/', views.toggle_task, name='toggle_task'),
    path('tasks/<int:task_id>/delete/', views.delete_task, name='delete_task'),
    
    # API endpoints
    path('api/', include(router.urls)),
]