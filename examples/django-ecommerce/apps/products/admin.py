from django.contrib import admin
from .models import ProductCategory, Product, Discount, DiscountProduct


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent_category', 'created_at')
    list_filter = ('parent_category', 'created_at')
    search_fields = ('name',)
    ordering = ('name',)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'sku', 'product_category', 'selling_price', 'stock_quantity', 'is_in_stock')
    list_filter = ('product_category', 'created_at')
    search_fields = ('name', 'sku', 'barcode')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Discount)
class DiscountAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'value', 'start_date', 'end_date')
    list_filter = ('type', 'start_date', 'end_date')
    search_fields = ('name',)
    ordering = ('-created_at',)


@admin.register(DiscountProduct)
class DiscountProductAdmin(admin.ModelAdmin):
    list_display = ('discount', 'product')
    list_filter = ('discount',)
    search_fields = ('discount__name', 'product__name')