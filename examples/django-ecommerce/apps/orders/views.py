from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Order, OrderItem, ReturnOrder, ReturnOrderItem
from .serializers import (
    OrderSerializer, 
    OrderCreateSerializer,
    ReturnOrderSerializer,
    ReturnOrderCreateSerializer
)


class OrderListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return OrderCreateSerializer
        return OrderSerializer


class OrderDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer
    
    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_order_status(request, pk):
    """Update order status (admin functionality)"""
    try:
        order = Order.objects.get(pk=pk)
        new_status = request.data.get('status')
        
        if new_status not in dict(Order.STATUS_CHOICES):
            return Response(
                {'error': 'Invalid status'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        order.status = new_status
        order.save()
        
        serializer = OrderSerializer(order)
        return Response(serializer.data)
    
    except Order.DoesNotExist:
        return Response(
            {'error': 'Order not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_return_request(request, pk):
    """Create a return request for an order"""
    order = get_object_or_404(Order, pk=pk, user=request.user)
    
    if order.status not in ['delivered']:
        return Response(
            {'error': 'Returns can only be requested for delivered orders'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    serializer = ReturnOrderCreateSerializer(
        data=request.data, 
        context={'order': order}
    )
    
    if serializer.is_valid():
        return_order = serializer.save()
        response_serializer = ReturnOrderSerializer(return_order)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ReturnOrderListView(generics.ListAPIView):
    serializer_class = ReturnOrderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return ReturnOrder.objects.filter(order__user=self.request.user)


class ReturnOrderDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ReturnOrderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return ReturnOrder.objects.filter(order__user=self.request.user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_summary(request):
    """Get order summary for the current user"""
    user_orders = Order.objects.filter(user=request.user)
    
    summary = {
        'total_orders': user_orders.count(),
        'pending_orders': user_orders.filter(status='pending').count(),
        'delivered_orders': user_orders.filter(status='delivered').count(),
        'cancelled_orders': user_orders.filter(status='cancelled').count(),
        'total_spent': sum(order.final_amount for order in user_orders),
        'recent_orders': OrderSerializer(
            user_orders[:5], many=True
        ).data
    }
    
    return Response(summary)