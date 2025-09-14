from django.urls import path
from . import views

app_name = 'payments'

urlpatterns = [
    path('', views.PaymentListCreateView.as_view(), name='payment-list-create'),
    path('<int:pk>/', views.PaymentDetailView.as_view(), name='payment-detail'),
    path('process/<int:order_id>/', views.process_payment, name='process-payment'),
    path('<int:payment_id>/refund/', views.refund_payment, name='refund-payment'),
    path('<int:payment_id>/status/', views.payment_status, name='payment-status'),
]