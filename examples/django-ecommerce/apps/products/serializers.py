from rest_framework import serializers
from .models import ProductCategory, Product, Discount, DiscountProduct


class ProductCategorySerializer(serializers.ModelSerializer):
    subcategories = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductCategory
        fields = '__all__'
    
    def get_subcategories(self, obj):
        if obj.subcategories.exists():
            return ProductCategorySerializer(obj.subcategories.all(), many=True).data
        return []


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='product_category.name', read_only=True)
    is_in_stock = serializers.ReadOnlyField()
    
    class Meta:
        model = Product
        fields = '__all__'


class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='product_category.name', read_only=True)
    is_in_stock = serializers.ReadOnlyField()
    
    class Meta:
        model = Product
        fields = ('id', 'name', 'sku', 'mrp', 'selling_price', 'stock_quantity', 
                 'category_name', 'is_in_stock', 'created_at')


class DiscountSerializer(serializers.ModelSerializer):
    products = serializers.SerializerMethodField()
    
    class Meta:
        model = Discount
        fields = '__all__'
    
    def get_products(self, obj):
        discount_products = DiscountProduct.objects.filter(discount=obj)
        products = [dp.product for dp in discount_products]
        return ProductListSerializer(products, many=True).data


class DiscountProductSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    discount_name = serializers.CharField(source='discount.name', read_only=True)
    
    class Meta:
        model = DiscountProduct
        fields = '__all__'