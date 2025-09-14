from rest_framework import serializers
from django.db import transaction
from apps.products.models import Product
from apps.products.serializers import ProductListSerializer
from .models import Order, OrderItem, ReturnOrder, ReturnOrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    
    class Meta:
        model = OrderItem
        fields = '__all__'
        read_only_fields = ('order', 'mrp', 'selling_price', 'final_price')


class OrderItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ('product', 'quantity', 'discount')
    
    def validate_product(self, value):
        if not value.is_in_stock:
            raise serializers.ValidationError("Product is out of stock")
        return value
    
    def validate(self, attrs):
        product = attrs['product']
        quantity = attrs['quantity']
        
        if product.stock_quantity < quantity:
            raise serializers.ValidationError(
                f"Only {product.stock_quantity} items available in stock"
            )
        return attrs


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    final_amount = serializers.ReadOnlyField()
    
    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = ('user', 'total_amount', 'discount_amount')


class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderItemCreateSerializer(many=True, write_only=True)
    
    class Meta:
        model = Order
        fields = ('items',)
    
    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Order must contain at least one item")
        return value
    
    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        user = self.context['request'].user
        
        # Calculate total amount
        total_amount = 0
        order_items = []
        
        for item_data in items_data:
            product = item_data['product']
            quantity = item_data['quantity']
            discount = item_data.get('discount', 0)
            
            # Check stock availability
            if product.stock_quantity < quantity:
                raise serializers.ValidationError(
                    f"Insufficient stock for {product.name}"
                )
            
            # Calculate item total
            item_total = (product.selling_price - discount) * quantity
            total_amount += item_total
            
            order_items.append({
                'product': product,
                'quantity': quantity,
                'mrp': product.mrp,
                'selling_price': product.selling_price,
                'discount': discount,
                'final_price': item_total
            })
        
        # Create order
        order = Order.objects.create(
            user=user,
            total_amount=total_amount,
            discount_amount=0  # Can be calculated based on applied discounts
        )
        
        # Create order items and update stock
        for item_data in order_items:
            OrderItem.objects.create(order=order, **item_data)
            # Update product stock
            product = item_data['product']
            product.stock_quantity -= item_data['quantity']
            product.save()
        
        return order


class ReturnOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='order_item.product.name', read_only=True)
    
    class Meta:
        model = ReturnOrderItem
        fields = '__all__'
        read_only_fields = ('return_order',)


class ReturnOrderSerializer(serializers.ModelSerializer):
    items = ReturnOrderItemSerializer(many=True, read_only=True)
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    
    class Meta:
        model = ReturnOrder
        fields = '__all__'
        read_only_fields = ('order',)


class ReturnOrderCreateSerializer(serializers.ModelSerializer):
    items = ReturnOrderItemSerializer(many=True, write_only=True)
    
    class Meta:
        model = ReturnOrder
        fields = ('return_reason', 'items')
    
    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        order = self.context['order']
        
        return_order = ReturnOrder.objects.create(
            order=order,
            return_reason=validated_data['return_reason']
        )
        
        for item_data in items_data:
            ReturnOrderItem.objects.create(
                return_order=return_order,
                **item_data
            )
        
        return return_order