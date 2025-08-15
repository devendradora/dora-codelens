"""
Forms for the Django todo application.
"""
from django import forms
from .models import TodoList, Task, TaskComment


class TodoListForm(forms.ModelForm):
    """Form for creating and editing todo lists."""
    
    class Meta:
        model = TodoList
        fields = ['name', 'description']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter todo list name'
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'Optional description'
            })
        }

    def clean_name(self):
        """Validate todo list name."""
        name = self.cleaned_data.get('name')
        if name and len(name.strip()) < 2:
            raise forms.ValidationError(
                "Todo list name must be at least 2 characters long."
            )
        return name.strip() if name else name


class TaskForm(forms.ModelForm):
    """Form for creating and editing tasks."""
    
    class Meta:
        model = Task
        fields = ['title', 'description', 'priority', 'due_date']
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter task title'
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'Optional task description'
            }),
            'priority': forms.Select(attrs={
                'class': 'form-control'
            }),
            'due_date': forms.DateTimeInput(attrs={
                'class': 'form-control',
                'type': 'datetime-local'
            })
        }

    def clean_title(self):
        """Validate task title."""
        title = self.cleaned_data.get('title')
        if title and len(title.strip()) < 3:
            raise forms.ValidationError(
                "Task title must be at least 3 characters long."
            )
        return title.strip() if title else title


class TaskCommentForm(forms.ModelForm):
    """Form for adding comments to tasks."""
    
    class Meta:
        model = TaskComment
        fields = ['content']
        widgets = {
            'content': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 2,
                'placeholder': 'Add a comment...'
            })
        }

    def clean_content(self):
        """Validate comment content."""
        content = self.cleaned_data.get('content')
        if content and len(content.strip()) < 1:
            raise forms.ValidationError(
                "Comment cannot be empty."
            )
        return content.strip() if content else content