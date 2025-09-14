from rest_framework import serializers
from .models import Payment
from apps.orders.serializers import OrderSerializer


class PaymentSerializer(serializers.ModelSerializer):
    order = OrderSerializer(read_only=True)
    order_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'order', 'order_id', 'user', 'amount', 'payment_method',
            'status', 'transaction_id', 'payment_gateway_response',
            'created_at', 'updated_at', 'processed_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'processed_at']

    def validate_order_id(self, value):
        from apps.orders.models import Order
        try:
            order = Order.objects.get(id=value)
            if hasattr(order, 'payment'):
                raise serializers.ValidationError("Payment already exists for this order.")
            return value
        except Order.DoesNotExist:
            raise serializers.ValidationError("Order does not exist.")

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class PaymentProcessSerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(choices=Payment.PAYMENT_METHOD_CHOICES)
    card_number = serializers.CharField(max_length=16, required=False)
    card_expiry = serializers.CharField(max_length=5, required=False)
    card_cvv = serializers.CharField(max_length=4, required=False)
    
    def validate(self, data):
        if data['payment_method'] in ['credit_card', 'debit_card']:
            required_fields = ['card_number', 'card_expiry', 'card_cvv']
            for field in required_fields:
                if not data.get(field):
                    raise serializers.ValidationError(f"{field} is required for card payments.")
        return data


class PaymentRefundSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=255, required=False)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    
    def validate_amount(self, value):
        payment = self.context['payment']
        if value and value > payment.amount:
            raise serializers.ValidationError("Refund amount cannot exceed payment amount.")
        return value