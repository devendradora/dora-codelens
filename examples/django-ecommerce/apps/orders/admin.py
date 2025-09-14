from django.contrib import admin
from .models import Order, OrderItem, ReturnOrder, ReturnOrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('final_price',)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'status', 'total_amount', 'discount_amount', 'final_amount', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('user__email', 'user__name')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'final_amount')
    inlines = [OrderItemInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('order', 'product', 'quantity', 'selling_price', 'discount', 'final_price')
    list_filter = ('order__status', 'created_at')
    search_fields = ('product__name', 'order__user__email')


class ReturnOrderItemInline(admin.TabularInline):
    model = ReturnOrderItem
    extra = 0


@admin.register(ReturnOrder)
class ReturnOrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('order__user__email', 'return_reason')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')
    inlines = [ReturnOrderItemInline]


@admin.register(ReturnOrderItem)
class ReturnOrderItemAdmin(admin.ModelAdmin):
    list_display = ('return_order', 'order_item', 'quantity', 'final_price')
    search_fields = ('return_order__order__user__email', 'order_item__product__name')