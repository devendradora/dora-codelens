"""
Main FastAPI application for the todo app.
"""
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from database import get_db, init_db
from models import User, TodoList, Task
from schemas import (
    UserCreate, UserResponse, UserLogin,
    TodoListCreate, TodoListResponse, TodoListUpdate,
    TaskCreate, TaskResponse, TaskUpdate,
    Token
)
from auth import (
    authenticate_user, create_access_token, get_current_user,
    get_password_hash, verify_password
)
from crud import (
    create_user, get_user_by_username, get_user_todo_lists,
    create_todo_list, get_todo_list, update_todo_list, delete_todo_list,
    create_task, get_task, update_task, delete_task, get_todo_list_tasks
)

# Initialize database
init_db()

app = FastAPI(
    title="FastAPI Todo API",
    description="A todo application with FastAPI and dependency injection",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "FastAPI Todo Application"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "fastapi-todo"}


# Authentication endpoints
@app.post("/register", response_model=UserResponse)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    db_user = get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Username already registered"
        )
    
    return create_user(db=db, user=user)


@app.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login and get access token."""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return current_user


# Todo List endpoints
@app.get("/todolists", response_model=List[TodoListResponse])
async def get_todo_lists(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all todo lists for the current user."""
    return get_user_todo_lists(db=db, user_id=current_user.id)


@app.post("/todolists", response_model=TodoListResponse)
async def create_new_todo_list(
    todo_list: TodoListCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new todo list."""
    return create_todo_list(db=db, todo_list=todo_list, user_id=current_user.id)
@
app.get("/todolists/{list_id}", response_model=TodoListResponse)
async def get_todo_list_by_id(
    list_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific todo list."""
    todo_list = get_todo_list(db=db, list_id=list_id, user_id=current_user.id)
    if not todo_list:
        raise HTTPException(status_code=404, detail="Todo list not found")
    return todo_list


@app.put("/todolists/{list_id}", response_model=TodoListResponse)
async def update_todo_list_by_id(
    list_id: int,
    todo_list_update: TodoListUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a todo list."""
    todo_list = update_todo_list(
        db=db, list_id=list_id, todo_list_update=todo_list_update, user_id=current_user.id
    )
    if not todo_list:
        raise HTTPException(status_code=404, detail="Todo list not found")
    return todo_list


@app.delete("/todolists/{list_id}")
async def delete_todo_list_by_id(
    list_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a todo list."""
    success = delete_todo_list(db=db, list_id=list_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Todo list not found")
    return {"message": "Todo list deleted successfully"}


# Task endpoints
@app.get("/todolists/{list_id}/tasks", response_model=List[TaskResponse])
async def get_tasks_for_list(
    list_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all tasks for a specific todo list."""
    # Verify the todo list belongs to the current user
    todo_list = get_todo_list(db=db, list_id=list_id, user_id=current_user.id)
    if not todo_list:
        raise HTTPException(status_code=404, detail="Todo list not found")
    
    return get_todo_list_tasks(db=db, list_id=list_id)


@app.post("/todolists/{list_id}/tasks", response_model=TaskResponse)
async def create_new_task(
    list_id: int,
    task: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new task in a todo list."""
    # Verify the todo list belongs to the current user
    todo_list = get_todo_list(db=db, list_id=list_id, user_id=current_user.id)
    if not todo_list:
        raise HTTPException(status_code=404, detail="Todo list not found")
    
    return create_task(db=db, task=task, list_id=list_id)


@app.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task_by_id(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific task."""
    task = get_task(db=db, task_id=task_id, user_id=current_user.id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task_by_id(
    task_id: int,
    task_update: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a task."""
    task = update_task(db=db, task_id=task_id, task_update=task_update, user_id=current_user.id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.delete("/tasks/{task_id}")
async def delete_task_by_id(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a task."""
    success = delete_task(db=db, task_id=task_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}


@app.post("/tasks/{task_id}/toggle", response_model=TaskResponse)
async def toggle_task_completion(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle task completion status."""
    task = get_task(db=db, task_id=task_id, user_id=current_user.id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.completed = not task.completed
    db.commit()
    db.refresh(task)
    return task


# Statistics endpoints
@app.get("/stats")
async def get_user_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user statistics."""
    todo_lists = get_user_todo_lists(db=db, user_id=current_user.id)
    total_lists = len(todo_lists)
    total_tasks = sum(len(tl.tasks) for tl in todo_lists)
    completed_tasks = sum(len([t for t in tl.tasks if t.completed]) for tl in todo_lists)
    
    return {
        "total_todo_lists": total_lists,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": total_tasks - completed_tasks,
        "completion_rate": round((completed_tasks / total_tasks * 100), 2) if total_tasks > 0 else 0
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)