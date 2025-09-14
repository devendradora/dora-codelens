from django.urls import path
from . import views

urlpatterns = [
    # Orders
    path('', views.OrderListCreateView.as_view(), name='order-list-create'),
    path('<int:pk>/', views.OrderDetailView.as_view(), name='order-detail'),
    path('<int:pk>/status/', views.update_order_status, name='order-status-update'),
    path('<int:pk>/return/', views.create_return_request, name='create-return-request'),
    path('summary/', views.order_summary, name='order-summary'),
    
    # Returns
    path('returns/', views.ReturnOrderListView.as_view(), name='return-list'),
    path('returns/<int:pk>/', views.ReturnOrderDetailView.as_view(), name='return-detail'),
]