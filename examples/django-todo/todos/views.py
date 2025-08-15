"""
Views for the Django todo application.
"""
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, authenticate
from django.contrib.auth.forms import UserCreationForm
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import TodoList, Task, TaskComment
from .serializers import TodoListSerializer, TaskSerializer, TaskCommentSerializer
from .forms import TodoListForm, TaskForm


def home(request):
    """Home page view."""
    if request.user.is_authenticated:
        return redirect('todo_list')
    return render(request, 'todos/home.html')


def register(request):
    """User registration view."""
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            username = form.cleaned_data.get('username')
            messages.success(request, f'Account created for {username}!')
            login(request, user)
            return redirect('todo_list')
    else:
        form = UserCreationForm()
    return render(request, 'registration/register.html', {'form': form})


@login_required
def todo_list_view(request):
    """Display all todo lists for the current user."""
    todo_lists = TodoList.objects.filter(owner=request.user)
    return render(request, 'todos/todo_list.html', {'todo_lists': todo_lists})


@login_required
def todo_detail_view(request, list_id):
    """Display tasks in a specific todo list."""
    todo_list = get_object_or_404(TodoList, id=list_id, owner=request.user)
    tasks = todo_list.tasks.all()
    return render(request, 'todos/todo_detail.html', {
        'todo_list': todo_list,
        'tasks': tasks
    })


@login_required
def create_todo_list(request):
    """Create a new todo list."""
    if request.method == 'POST':
        form = TodoListForm(request.POST)
        if form.is_valid():
            todo_list = form.save(commit=False)
            todo_list.owner = request.user
            todo_list.save()
            messages.success(request, 'Todo list created successfully!')
            return redirect('todo_detail', list_id=todo_list.id)
    else:
        form = TodoListForm()
    return render(request, 'todos/create_todo_list.html', {'form': form})


@login_required
def create_task(request, list_id):
    """Create a new task in a todo list."""
    todo_list = get_object_or_404(TodoList, id=list_id, owner=request.user)
    if request.method == 'POST':
        form = TaskForm(request.POST)
        if form.is_valid():
            task = form.save(commit=False)
            task.todo_list = todo_list
            task.save()
            messages.success(request, 'Task created successfully!')
            return redirect('todo_detail', list_id=todo_list.id)
    else:
        form = TaskForm()
    return render(request, 'todos/create_task.html', {
        'form': form,
        'todo_list': todo_list
    })

@lo
gin_required
@require_http_methods(["POST"])
def toggle_task(request, task_id):
    """Toggle task completion status via AJAX."""
    task = get_object_or_404(Task, id=task_id, todo_list__owner=request.user)
    task.completed = not task.completed
    task.save()
    return JsonResponse({
        'success': True,
        'completed': task.completed,
        'task_id': task.id
    })


@login_required
def delete_task(request, task_id):
    """Delete a task."""
    task = get_object_or_404(Task, id=task_id, todo_list__owner=request.user)
    list_id = task.todo_list.id
    task.delete()
    messages.success(request, 'Task deleted successfully!')
    return redirect('todo_detail', list_id=list_id)


# REST API ViewSets
class TodoListViewSet(viewsets.ModelViewSet):
    """API viewset for TodoList model."""
    serializer_class = TodoListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TodoList.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['get'])
    def tasks(self, request, pk=None):
        """Get all tasks for a specific todo list."""
        todo_list = self.get_object()
        tasks = todo_list.tasks.all()
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get statistics for a todo list."""
        todo_list = self.get_object()
        return Response({
            'total_tasks': todo_list.get_total_tasks_count(),
            'completed_tasks': todo_list.get_completed_tasks_count(),
            'completion_rate': (
                todo_list.get_completed_tasks_count() / todo_list.get_total_tasks_count() * 100
                if todo_list.get_total_tasks_count() > 0 else 0
            )
        })


class TaskViewSet(viewsets.ModelViewSet):
    """API viewset for Task model."""
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(todo_list__owner=self.request.user)

    @action(detail=True, methods=['post'])
    def toggle_complete(self, request, pk=None):
        """Toggle task completion status."""
        task = self.get_object()
        task.completed = not task.completed
        task.save()
        return Response({'completed': task.completed})

    @action(detail=False, methods=['get'])
    def completed(self, request):
        """Get all completed tasks."""
        completed_tasks = self.get_queryset().filter(completed=True)
        serializer = self.get_serializer(completed_tasks, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get all pending tasks."""
        pending_tasks = self.get_queryset().filter(completed=False)
        serializer = self.get_serializer(pending_tasks, many=True)
        return Response(serializer.data)