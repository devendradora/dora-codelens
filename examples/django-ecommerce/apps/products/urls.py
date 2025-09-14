from django.urls import path
from . import views

urlpatterns = [
    # Categories
    path('categories/', views.ProductCategoryListCreateView.as_view(), name='category-list-create'),
    path('categories/<int:pk>/', views.ProductCategoryDetailView.as_view(), name='category-detail'),
    path('categories/<int:category_id>/products/', views.products_by_category, name='products-by-category'),
    
    # Products
    path('', views.ProductListCreateView.as_view(), name='product-list-create'),
    path('<int:pk>/', views.ProductDetailView.as_view(), name='product-detail'),
    path('featured/', views.featured_products, name='featured-products'),
    
    # Discounts
    path('discounts/', views.DiscountListCreateView.as_view(), name='discount-list-create'),
    path('discounts/<int:pk>/', views.DiscountDetailView.as_view(), name='discount-detail'),
]