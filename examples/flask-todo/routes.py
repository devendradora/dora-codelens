"""
Main routes for the Flask todo application.
"""
from flask import Blueprint, render_template, redirect, url_for
from flask_login import login_required, current_user

main_bp = Blueprint('main', __name__)


@main_bp.route('/')
def index():
    """Home page route."""
    if current_user.is_authenticated:
        return redirect(url_for('todos.list_todos'))
    return render_template('index.html')


@main_bp.route('/dashboard')
@login_required
def dashboard():
    """User dashboard route."""
    user_stats = {
        'todo_lists_count': current_user.get_todo_lists_count(),
        'total_tasks_count': current_user.get_total_tasks_count(),
        'recent_lists': current_user.todo_lists[:5]  # Get 5 most recent lists
    }
    return render_template('dashboard.html', stats=user_stats)


@main_bp.route('/about')
def about():
    """About page route."""
    return render_template('about.html')


@main_bp.route('/help')
def help():
    """Help page route."""
    return render_template('help.html')