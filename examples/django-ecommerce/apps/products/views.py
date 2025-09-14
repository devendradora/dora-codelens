from rest_framework import generics, filters, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import ProductCategory, Product, Discount, DiscountProduct
from .serializers import (
    ProductCategorySerializer, 
    ProductSerializer, 
    ProductListSerializer,
    DiscountSerializer,
    DiscountProductSerializer
)


class ProductCategoryListCreateView(generics.ListCreateAPIView):
    queryset = ProductCategory.objects.filter(parent_category=None)
    serializer_class = ProductCategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class ProductCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class ProductListCreateView(generics.ListCreateAPIView):
    queryset = Product.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchBackend, filters.OrderingFilter]
    filterset_fields = ['product_category', 'stock_quantity']
    search_fields = ['name', 'description', 'sku']
    ordering_fields = ['created_at', 'selling_price', 'name']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ProductListSerializer
        return ProductSerializer


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class DiscountListCreateView(generics.ListCreateAPIView):
    serializer_class = DiscountSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Only return active discounts
        now = timezone.now()
        return Discount.objects.filter(
            start_date__lte=now,
            end_date__gte=now
        )


class DiscountDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Discount.objects.all()
    serializer_class = DiscountSerializer
    permission_classes = [IsAuthenticated]


@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])
def featured_products(request):
    """Get featured products (top 10 by stock quantity)"""
    products = Product.objects.filter(stock_quantity__gt=0).order_by('-stock_quantity')[:10]
    serializer = ProductListSerializer(products, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])
def products_by_category(request, category_id):
    """Get products by category including subcategories"""
    try:
        category = ProductCategory.objects.get(id=category_id)
        # Get all subcategories
        subcategories = category.subcategories.all()
        category_ids = [category.id] + list(subcategories.values_list('id', flat=True))
        
        products = Product.objects.filter(product_category_id__in=category_ids)
        serializer = ProductListSerializer(products, many=True)
        return Response(serializer.data)
    except ProductCategory.DoesNotExist:
        return Response({'error': 'Category not found'}, status=status.HTTP_404_NOT_FOUND)