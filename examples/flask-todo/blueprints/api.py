"""
API blueprint for the Flask todo application.
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from models import TodoList, Task, TaskComment
from app import db

api_bp = Blueprint('api', __name__)


@api_bp.route('/todolists', methods=['GET'])
@login_required
def get_todo_lists():
    """Get all todo lists for the current user."""
    todo_lists = TodoList.query.filter_by(user_id=current_user.id).all()
    return jsonify([{
        'id': tl.id,
        'name': tl.name,
        'description': tl.description,
        'tasks_count': tl.get_tasks_count(),
        'completed_tasks_count': tl.get_completed_tasks_count(),
        'completion_rate': tl.get_completion_rate(),
        'created_at': tl.created_at.isoformat(),
        'updated_at': tl.updated_at.isoformat()
    } for tl in todo_lists])


@api_bp.route('/todolists', methods=['POST'])
@login_required
def create_todo_list_api():
    """Create a new todo list via API."""
    data = request.get_json()
    
    if not data or 'name' not in data:
        return jsonify({'error': 'Name is required'}), 400
    
    todo_list = TodoList(
        name=data['name'],
        description=data.get('description', ''),
        user_id=current_user.id
    )
    
    db.session.add(todo_list)
    db.session.commit()
    
    return jsonify({
        'id': todo_list.id,
        'name': todo_list.name,
        'description': todo_list.description,
        'created_at': todo_list.created_at.isoformat()
    }), 201


@api_bp.route('/todolists/<int:list_id>', methods=['GET'])
@login_required
def get_todo_list(list_id):
    """Get a specific todo list with its tasks."""
    todo_list = TodoList.query.filter_by(id=list_id, user_id=current_user.id).first()
    
    if not todo_list:
        return jsonify({'error': 'Todo list not found'}), 404
    
    tasks = [{
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'completed': task.completed,
        'priority': task.priority,
        'due_date': task.due_date.isoformat() if task.due_date else None,
        'created_at': task.created_at.isoformat(),
        'updated_at': task.updated_at.isoformat()
    } for task in todo_list.tasks]
    
    return jsonify({
        'id': todo_list.id,
        'name': todo_list.name,
        'description': todo_list.description,
        'tasks': tasks,
        'tasks_count': todo_list.get_tasks_count(),
        'completed_tasks_count': todo_list.get_completed_tasks_count(),
        'completion_rate': todo_list.get_completion_rate(),
        'created_at': todo_list.created_at.isoformat(),
        'updated_at': todo_list.updated_at.isoformat()
    })


@api_bp.route('/tasks', methods=['GET'])
@login_required
def get_tasks():
    """Get all tasks for the current user."""
    tasks = Task.query.join(TodoList).filter(TodoList.user_id == current_user.id).all()
    
    return jsonify([{
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'completed': task.completed,
        'priority': task.priority,
        'due_date': task.due_date.isoformat() if task.due_date else None,
        'todo_list_id': task.todo_list_id,
        'todo_list_name': task.todo_list.name,
        'created_at': task.created_at.isoformat(),
        'updated_at': task.updated_at.isoformat()
    } for task in tasks])


@api_bp.route('/tasks', methods=['POST'])
@login_required
def create_task_api():
    """Create a new task via API."""
    data = request.get_json()
    
    if not data or 'title' not in data or 'todo_list_id' not in data:
        return jsonify({'error': 'Title and todo_list_id are required'}), 400
    
    # Verify the todo list belongs to the current user
    todo_list = TodoList.query.filter_by(
        id=data['todo_list_id'],
        user_id=current_user.id
    ).first()
    
    if not todo_list:
        return jsonify({'error': 'Todo list not found'}), 404
    
    task = Task(
        title=data['title'],
        description=data.get('description', ''),
        priority=data.get('priority', 'medium'),
        todo_list_id=data['todo_list_id']
    )
    
    db.session.add(task)
    db.session.commit()
    
    return jsonify({
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'completed': task.completed,
        'priority': task.priority,
        'todo_list_id': task.todo_list_id,
        'created_at': task.created_at.isoformat()
    }), 201


@api_bp.route('/tasks/<int:task_id>/toggle', methods=['POST'])
@login_required
def toggle_task_api(task_id):
    """Toggle task completion status via API."""
    task = Task.query.join(TodoList).filter(
        Task.id == task_id,
        TodoList.user_id == current_user.id
    ).first()
    
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    
    task.toggle_completion()
    db.session.commit()
    
    return jsonify({
        'id': task.id,
        'completed': task.completed,
        'updated_at': task.updated_at.isoformat()
    })


@api_bp.route('/stats', methods=['GET'])
@login_required
def get_user_stats():
    """Get user statistics."""
    todo_lists_count = current_user.get_todo_lists_count()
    total_tasks_count = current_user.get_total_tasks_count()
    
    completed_tasks = Task.query.join(TodoList).filter(
        TodoList.user_id == current_user.id,
        Task.completed == True
    ).count()
    
    return jsonify({
        'todo_lists_count': todo_lists_count,
        'total_tasks_count': total_tasks_count,
        'completed_tasks_count': completed_tasks,
        'pending_tasks_count': total_tasks_count - completed_tasks,
        'completion_rate': round((completed_tasks / total_tasks_count * 100), 2) if total_tasks_count > 0 else 0
    })