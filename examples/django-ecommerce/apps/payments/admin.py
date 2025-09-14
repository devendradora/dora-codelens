from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'order', 'user', 'amount', 'payment_method', 
        'status', 'transaction_id', 'created_at'
    ]
    list_filter = ['status', 'payment_method', 'created_at']
    search_fields = ['transaction_id', 'order__id', 'user__email']
    readonly_fields = ['created_at', 'updated_at', 'processed_at']
    
    fieldsets = (
        ('Payment Information', {
            'fields': ('order', 'user', 'amount', 'payment_method')
        }),
        ('Status & Processing', {
            'fields': ('status', 'transaction_id', 'processed_at')
        }),
        ('Gateway Response', {
            'fields': ('payment_gateway_response',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_delete_permission(self, request, obj=None):
        # Prevent deletion of completed payments
        if obj and obj.status == 'completed':
            return False
        return super().has_delete_permission(request, obj)