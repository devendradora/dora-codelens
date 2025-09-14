# Design Document

## Overview

The Django e-commerce example will be a comprehensive demonstration project showcasing a complete e-commerce system built with Django and Django REST Framework. The project will feature a complex database schema with 10 interconnected tables, full REST API coverage, and a modern landing page. This example will serve as an excellent test case for DoraCodeLens's ability to analyze complex Django projects with multiple apps, intricate model relationships, and mixed technology stacks.

## Architecture

### Project Structure
```
examples/django-ecommerce/
├── manage.py
├── requirements.txt
├── README.md
├── ecommerce_project/
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── apps/
│   ├── __init__.py
│   ├── users/
│   ├── products/
│   ├── orders/
│   └── payments/
├── static/
│   ├── css/
│   ├── js/
│   └── images/
└── templates/
    └── landing/
```

### Django Apps Organization
- **users**: User management, authentication, and profiles
- **products**: Product catalog, categories, and inventory management
- **orders**: Order processing, order items, and return management
- **payments**: Payment processing and transaction handling

## Components and Interfaces

### Database Models

#### Users App Models
- **User**: Custom user model extending AbstractUser with additional fields (gender, otp)
- Fields: id, name, email, gender, password, otp, created_at, updated_at

#### Products App Models
- **ProductCategory**: Hierarchical product categorization
- Fields: id, name, parent_category_id, created_at, updated_at

- **Product**: Product catalog with inventory management
- Fields: id, name, description, sku, barcode, mrp, selling_price, stock_quantity, product_category_id, created_at, updated_at

- **Discount**: Flexible discount system with multiple types
- Fields: id, name, type, value, min_order_amount, max_discount_amount, start_date, end_date, created_at, updated_at

- **DiscountProduct**: Many-to-many relationship between discounts and products
- Fields: id, discount_id, product_id

#### Orders App Models
- **Order**: Order management with status tracking
- Fields: id, user_id, total_amount, discount_amount, status, created_at, updated_at

- **OrderItem**: Individual items within an order
- Fields: id, order_id, product_id, quantity, mrp, selling_price, discount, final_price, created_at, updated_at

- **ReturnOrder**: Return request management
- Fields: id, order_id, return_reason, status, created_at, updated_at

- **ReturnOrderItem**: Individual items in a return request
- Fields: id, return_order_id, order_item_id, quantity, final_price, updated_at

#### Payments App Models
- **Payment**: Payment transaction records
- Fields: id, order_id, discount, total_amount, payment_method, created_at, updated_at

### REST API Endpoints

#### Users API (`/api/users/`)
- `POST /register/` - User registration
- `POST /login/` - User authentication
- `GET /profile/` - Get user profile
- `PUT /profile/` - Update user profile

#### Products API (`/api/products/`)
- `GET /categories/` - List product categories
- `POST /categories/` - Create category
- `GET /products/` - List products with filtering
- `POST /products/` - Create product
- `GET /products/{id}/` - Get product details
- `PUT /products/{id}/` - Update product
- `GET /discounts/` - List active discounts

#### Orders API (`/api/orders/`)
- `POST /orders/` - Create new order
- `GET /orders/` - List user orders
- `GET /orders/{id}/` - Get order details
- `PUT /orders/{id}/status/` - Update order status
- `POST /orders/{id}/return/` - Create return request

#### Payments API (`/api/payments/`)
- `POST /payments/` - Process payment
- `GET /payments/{order_id}/` - Get payment details

### Frontend Landing Page

#### HTML Structure
- Header with navigation and branding
- Hero section with featured products
- Product categories showcase
- Featured products grid
- Footer with company information

#### CSS Design
- Modern responsive design using CSS Grid and Flexbox
- Mobile-first approach with breakpoints
- Custom color scheme and typography
- Smooth animations and transitions
- Product card hover effects

#### JavaScript Functionality
- Dynamic product loading from API
- Category filtering
- Shopping cart preview
- Search functionality
- Responsive navigation menu

## Data Models

### Model Relationships
```
User (1) -----> (N) Order
Order (1) -----> (N) OrderItem
Order (1) -----> (1) Payment
Order (1) -----> (0..1) ReturnOrder
ReturnOrder (1) -----> (N) ReturnOrderItem
OrderItem (1) <----- (N) ReturnOrderItem
Product (1) -----> (N) OrderItem
ProductCategory (1) -----> (N) Product
ProductCategory (1) -----> (N) ProductCategory (self-referential)
Discount (N) <-----> (N) Product (through DiscountProduct)
```

### Field Types and Constraints
- Primary keys: Auto-incrementing integers
- Foreign keys: Proper CASCADE/PROTECT relationships
- Enums: Gender, order status, discount types, payment methods, return status
- Decimals: Monetary values with 2 decimal places
- Timestamps: Auto-managed created_at/updated_at fields
- Unique constraints: Email, SKU, barcode
- Validation: Email format, positive prices, stock quantities

## Error Handling

### API Error Responses
- Standardized error format with error codes
- Validation error details for form submissions
- Authentication and authorization error messages
- Database constraint violation handling

### Frontend Error Handling
- User-friendly error messages
- Network error recovery
- Form validation feedback
- Loading states and error boundaries

## Testing Strategy

### Model Testing
- Model field validation tests
- Relationship integrity tests
- Custom model method tests
- Database constraint tests

### API Testing
- Endpoint functionality tests
- Authentication and permission tests
- Data serialization tests
- Error response tests

### Frontend Testing
- JavaScript functionality tests
- API integration tests
- Responsive design tests
- Cross-browser compatibility tests

### Integration Testing
- End-to-end user workflows
- Database transaction tests
- API-frontend integration tests
- DoraCodeLens analysis verification tests