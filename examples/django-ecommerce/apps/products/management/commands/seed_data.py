from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.products.models import ProductCategory, Product, Discount
from decimal import Decimal

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed the database with sample data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database with sample data...')
        
        # Create sample categories
        electronics = ProductCategory.objects.create(
            name='Electronics',
            description='Electronic devices and gadgets'
        )
        
        smartphones = ProductCategory.objects.create(
            name='Smartphones',
            description='Mobile phones and accessories',
            parent=electronics
        )
        
        laptops = ProductCategory.objects.create(
            name='Laptops',
            description='Portable computers',
            parent=electronics
        )
        
        clothing = ProductCategory.objects.create(
            name='Clothing',
            description='Fashion and apparel'
        )
        
        # Create sample products
        products_data = [
            {
                'name': 'iPhone 15 Pro',
                'description': 'Latest iPhone with advanced features',
                'price': Decimal('999.99'),
                'stock_quantity': 50,
                'category': smartphones
            },
            {
                'name': 'Samsung Galaxy S24',
                'description': 'Premium Android smartphone',
                'price': Decimal('899.99'),
                'stock_quantity': 30,
                'category': smartphones
            },
            {
                'name': 'MacBook Pro M3',
                'description': 'Professional laptop with M3 chip',
                'price': Decimal('1999.99'),
                'stock_quantity': 20,
                'category': laptops
            },
            {
                'name': 'Dell XPS 13',
                'description': 'Ultrabook with premium design',
                'price': Decimal('1299.99'),
                'stock_quantity': 25,
                'category': laptops
            },
            {
                'name': 'Classic T-Shirt',
                'description': 'Comfortable cotton t-shirt',
                'price': Decimal('29.99'),
                'stock_quantity': 100,
                'category': clothing
            }
        ]
        
        for product_data in products_data:
            Product.objects.create(**product_data)
        
        # Create sample discounts
        Discount.objects.create(
            name='Summer Sale',
            description='20% off on electronics',
            discount_type='percentage',
            value=Decimal('20.00'),
            is_active=True
        )
        
        Discount.objects.create(
            name='New Customer',
            description='$50 off for new customers',
            discount_type='fixed',
            value=Decimal('50.00'),
            is_active=True
        )
        
        self.stdout.write(
            self.style.SUCCESS('Successfully seeded database with sample data')
        )