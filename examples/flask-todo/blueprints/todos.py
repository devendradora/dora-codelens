"""
Todos blueprint for the Flask todo application.
"""
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from models import TodoList, Task, TaskComment
from app import db
from forms import TodoListForm, TaskForm, TaskCommentForm

todos_bp = Blueprint('todos', __name__)


@todos_bp.route('/')
@login_required
def list_todos():
    """List all todo lists for the current user."""
    todo_lists = TodoList.query.filter_by(user_id=current_user.id).order_by(TodoList.created_at.desc()).all()
    return render_template('todos/list.html', todo_lists=todo_lists)


@todos_bp.route('/create', methods=['GET', 'POST'])
@login_required
def create_todo_list():
    """Create a new todo list."""
    form = TodoListForm()
    if form.validate_on_submit():
        todo_list = TodoList(
            name=form.name.data,
            description=form.description.data,
            user_id=current_user.id
        )
        db.session.add(todo_list)
        db.session.commit()
        flash(f'Todo list "{todo_list.name}" created successfully!', 'success')
        return redirect(url_for('todos.view_todo_list', list_id=todo_list.id))
    
    return render_template('todos/create_list.html', form=form)


@todos_bp.route('/<int:list_id>')
@login_required
def view_todo_list(list_id):
    """View a specific todo list and its tasks."""
    todo_list = TodoList.query.filter_by(id=list_id, user_id=current_user.id).first_or_404()
    tasks = Task.query.filter_by(todo_list_id=list_id).order_by(Task.created_at.desc()).all()
    return render_template('todos/view.html', todo_list=todo_list, tasks=tasks)


@todos_bp.route('/<int:list_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_todo_list(list_id):
    """Edit a todo list."""
    todo_list = TodoList.query.filter_by(id=list_id, user_id=current_user.id).first_or_404()
    form = TodoListForm(obj=todo_list)
    
    if form.validate_on_submit():
        todo_list.name = form.name.data
        todo_list.description = form.description.data
        db.session.commit()
        flash(f'Todo list "{todo_list.name}" updated successfully!', 'success')
        return redirect(url_for('todos.view_todo_list', list_id=todo_list.id))
    
    return render_template('todos/edit_list.html', form=form, todo_list=todo_list)


@todos_bp.route('/<int:list_id>/delete', methods=['POST'])
@login_required
def delete_todo_list(list_id):
    """Delete a todo list."""
    todo_list = TodoList.query.filter_by(id=list_id, user_id=current_user.id).first_or_404()
    list_name = todo_list.name
    db.session.delete(todo_list)
    db.session.commit()
    flash(f'Todo list "{list_name}" deleted successfully!', 'success')
    return redirect(url_for('todos.list_todos'))


@todos_bp.route('/<int:list_id>/tasks/create', methods=['GET', 'POST'])
@login_required
def create_task(list_id):
    """Create a new task in a todo list."""
    todo_list = TodoList.query.filter_by(id=list_id, user_id=current_user.id).first_or_404()
    form = TaskForm()
    
    if form.validate_on_submit():
        task = Task(
            title=form.title.data,
            description=form.description.data,
            priority=form.priority.data,
            due_date=form.due_date.data,
            todo_list_id=list_id
        )
        db.session.add(task)
        db.session.commit()
        flash(f'Task "{task.title}" created successfully!', 'success')
        return redirect(url_for('todos.view_todo_list', list_id=list_id))
    
    return render_template('todos/create_task.html', form=form, todo_list=todo_list)
@todos_b
p.route('/tasks/<int:task_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_task(task_id):
    """Edit a task."""
    task = Task.query.join(TodoList).filter(
        Task.id == task_id,
        TodoList.user_id == current_user.id
    ).first_or_404()
    
    form = TaskForm(obj=task)
    if form.validate_on_submit():
        task.title = form.title.data
        task.description = form.description.data
        task.priority = form.priority.data
        task.due_date = form.due_date.data
        db.session.commit()
        flash(f'Task "{task.title}" updated successfully!', 'success')
        return redirect(url_for('todos.view_todo_list', list_id=task.todo_list_id))
    
    return render_template('todos/edit_task.html', form=form, task=task)


@todos_bp.route('/tasks/<int:task_id>/toggle', methods=['POST'])
@login_required
def toggle_task(task_id):
    """Toggle task completion status."""
    task = Task.query.join(TodoList).filter(
        Task.id == task_id,
        TodoList.user_id == current_user.id
    ).first_or_404()
    
    task.toggle_completion()
    db.session.commit()
    
    if request.is_json:
        return jsonify({
            'success': True,
            'completed': task.completed,
            'task_id': task.id
        })
    
    status = 'completed' if task.completed else 'reopened'
    flash(f'Task "{task.title}" {status}!', 'success')
    return redirect(url_for('todos.view_todo_list', list_id=task.todo_list_id))


@todos_bp.route('/tasks/<int:task_id>/delete', methods=['POST'])
@login_required
def delete_task(task_id):
    """Delete a task."""
    task = Task.query.join(TodoList).filter(
        Task.id == task_id,
        TodoList.user_id == current_user.id
    ).first_or_404()
    
    task_title = task.title
    list_id = task.todo_list_id
    db.session.delete(task)
    db.session.commit()
    flash(f'Task "{task_title}" deleted successfully!', 'success')
    return redirect(url_for('todos.view_todo_list', list_id=list_id))


@todos_bp.route('/tasks/<int:task_id>/comments', methods=['GET', 'POST'])
@login_required
def task_comments(task_id):
    """View and add comments to a task."""
    task = Task.query.join(TodoList).filter(
        Task.id == task_id,
        TodoList.user_id == current_user.id
    ).first_or_404()
    
    form = TaskCommentForm()
    if form.validate_on_submit():
        comment = TaskComment(
            content=form.content.data,
            task_id=task_id,
            user_id=current_user.id
        )
        db.session.add(comment)
        db.session.commit()
        flash('Comment added successfully!', 'success')
        return redirect(url_for('todos.task_comments', task_id=task_id))
    
    comments = TaskComment.query.filter_by(task_id=task_id).order_by(TaskComment.created_at.asc()).all()
    return render_template('todos/task_comments.html', task=task, comments=comments, form=form)