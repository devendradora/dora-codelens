from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
import uuid
import random

from .models import Payment
from .serializers import PaymentSerializer, PaymentProcessSerializer, PaymentRefundSerializer
from apps.orders.models import Order


class PaymentListCreateView(generics.ListCreateAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user)


class PaymentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_payment(request, order_id):
    """Process payment for an order"""
    order = get_object_or_404(Order, id=order_id, user=request.user)
    
    # Check if payment already exists
    if hasattr(order, 'payment'):
        return Response(
            {'error': 'Payment already exists for this order'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if order is in correct status
    if order.status != 'pending':
        return Response(
            {'error': 'Order must be in pending status to process payment'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    serializer = PaymentProcessSerializer(data=request.data)
    if serializer.is_valid():
        # Create payment record
        payment = Payment.objects.create(
            order=order,
            user=request.user,
            amount=order.total_amount,
            payment_method=serializer.validated_data['payment_method'],
            transaction_id=str(uuid.uuid4())
        )
        
        # Simulate payment processing
        success = simulate_payment_processing(serializer.validated_data)
        
        if success:
            payment.status = 'completed'
            payment.processed_at = timezone.now()
            payment.payment_gateway_response = {
                'status': 'success',
                'transaction_id': payment.transaction_id,
                'processed_at': payment.processed_at.isoformat()
            }
            
            # Update order status
            order.status = 'confirmed'
            order.save()
        else:
            payment.status = 'failed'
            payment.payment_gateway_response = {
                'status': 'failed',
                'error': 'Payment processing failed',
                'error_code': 'PAYMENT_DECLINED'
            }
        
        payment.save()
        
        return Response(
            PaymentSerializer(payment).data,
            status=status.HTTP_201_CREATED if success else status.HTTP_400_BAD_REQUEST
        )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def refund_payment(request, payment_id):
    """Refund a payment"""
    payment = get_object_or_404(Payment, id=payment_id, user=request.user)
    
    if not payment.can_be_refunded():
        return Response(
            {'error': 'Payment cannot be refunded'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    serializer = PaymentRefundSerializer(
        data=request.data,
        context={'payment': payment}
    )
    
    if serializer.is_valid():
        refund_amount = serializer.validated_data.get('amount', payment.amount)
        reason = serializer.validated_data.get('reason', 'Customer requested refund')
        
        # Simulate refund processing
        success = simulate_refund_processing(payment, refund_amount)
        
        if success:
            payment.status = 'refunded'
            payment.payment_gateway_response.update({
                'refund_status': 'success',
                'refund_amount': str(refund_amount),
                'refund_reason': reason,
                'refunded_at': timezone.now().isoformat()
            })
            
            # Update order status
            payment.order.status = 'cancelled'
            payment.order.save()
            
            payment.save()
            
            return Response(
                PaymentSerializer(payment).data,
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {'error': 'Refund processing failed'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_status(request, payment_id):
    """Get payment status"""
    payment = get_object_or_404(Payment, id=payment_id, user=request.user)
    return Response(PaymentSerializer(payment).data)


def simulate_payment_processing(payment_data):
    """Simulate payment gateway processing"""
    # Simulate 90% success rate
    return random.random() < 0.9


def simulate_refund_processing(payment, amount):
    """Simulate refund processing"""
    # Simulate 95% success rate for refunds
    return random.random() < 0.95