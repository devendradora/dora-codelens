# Django E-commerce Backend

A comprehensive Django REST API backend for an e-commerce platform with user authentication, product management, order processing, and payment handling.

## Features

- **User Management**: Custom user model with JWT authentication
- **Product Catalog**: Hierarchical categories, products with variants, and discount system
- **Order Management**: Complete order lifecycle with stock management
- **Payment Processing**: Payment gateway integration with refund support
- **Admin Interface**: Django admin for backend management
- **API Documentation**: RESTful API with comprehensive endpoints
- **Docker Support**: Containerized deployment with Docker Compose

## Tech Stack

- **Backend**: Django 4.2, Django REST Framework
- **Database**: PostgreSQL (SQLite for development)
- **Authentication**: JWT tokens with SimpleJWT
- **Caching**: Redis
- **Task Queue**: Celery with Redis broker
- **Web Server**: Nginx (production)
- **Containerization**: Docker & Docker Compose

## Project Structure

```
django-ecommerce/
├── apps/
│   ├── users/          # User management and authentication
│   ├── products/       # Product catalog and categories
│   ├── orders/         # Order processing and management
│   └── payments/       # Payment processing and refunds
├── ecommerce_project/  # Django project settings
├── static/             # Static files
├── media/              # User uploaded files
├── requirements.txt    # Python dependencies
├── Dockerfile          # Docker configuration
├── docker-compose.yml  # Development environment
└── docker-compose.prod.yml  # Production environment
```

## Quick Start

### Using Docker (Recommended)

1. **Clone and navigate to the project**:
   ```bash
   cd examples/django-ecommerce
   ```

2. **Copy environment variables**:
   ```bash
   cp .env.example .env
   ```

3. **Start the development environment**:
   ```bash
   docker-compose up --build
   ```

4. **Run migrations and create superuser**:
   ```bash
   docker-compose exec web python manage.py migrate
   docker-compose exec web python manage.py createsuperuser
   ```

5. **Access the application**:
   - API: http://localhost:8000/api/
   - Admin: http://localhost:8000/admin/

### Manual Setup

1. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run migrations**:
   ```bash
   python manage.py migrate
   ```

5. **Create superuser**:
   ```bash
   python manage.py createsuperuser
   ```

6. **Start development server**:
   ```bash
   python manage.py runserver
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/refresh/` - Refresh JWT token
- `GET /api/auth/profile/` - Get user profile
- `PUT /api/auth/profile/` - Update user profile

### Products
- `GET /api/products/categories/` - List product categories
- `GET /api/products/` - List products with filtering
- `GET /api/products/{id}/` - Get product details
- `GET /api/products/{id}/discounts/` - Get product discounts

### Orders
- `GET /api/orders/` - List user orders
- `POST /api/orders/` - Create new order
- `GET /api/orders/{id}/` - Get order details
- `PUT /api/orders/{id}/` - Update order
- `POST /api/orders/{id}/cancel/` - Cancel order
- `POST /api/orders/{id}/return/` - Create return request

### Payments
- `GET /api/payments/` - List user payments
- `POST /api/payments/process/{order_id}/` - Process payment
- `POST /api/payments/{id}/refund/` - Refund payment
- `GET /api/payments/{id}/status/` - Get payment status

## Database Schema

### Core Models

- **User**: Custom user model with profile information
- **ProductCategory**: Hierarchical product categories
- **Product**: Product information with stock management
- **Discount**: Flexible discount system
- **Order**: Order management with status tracking
- **OrderItem**: Individual items within orders
- **Payment**: Payment processing and tracking
- **ReturnOrder**: Return and refund management

## Environment Variables

Key environment variables (see `.env.example`):

```env
SECRET_KEY=your-secret-key
DEBUG=True
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
REDIS_URL=redis://localhost:6379/0
```

## Production Deployment

### Using Docker Compose

1. **Set up production environment**:
   ```bash
   cp .env.example .env.prod
   # Configure production settings in .env.prod
   ```

2. **Deploy with production compose**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Run production migrations**:
   ```bash
   docker-compose -f docker-compose.prod.yml exec web python manage.py migrate
   docker-compose -f docker-compose.prod.yml exec web python manage.py collectstatic --noinput
   ```

### Security Considerations

- Change `SECRET_KEY` in production
- Set `DEBUG=False` in production
- Configure proper `ALLOWED_HOSTS`
- Use HTTPS with SSL certificates
- Set up proper database credentials
- Configure rate limiting and security headers

## Testing

Run the test suite:

```bash
# Using Docker
docker-compose exec web python manage.py test

# Manual setup
python manage.py test
```

## API Usage Examples

### Register a new user
```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword",
    "name": "John Doe"
  }'
```

### Create an order
```bash
curl -X POST http://localhost:8000/api/orders/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "items": [
      {"product": 1, "quantity": 2},
      {"product": 2, "quantity": 1}
    ],
    "shipping_address": "123 Main St, City, Country"
  }'
```

### Process payment
```bash
curl -X POST http://localhost:8000/api/payments/process/1/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "payment_method": "credit_card",
    "card_number": "4111111111111111",
    "card_expiry": "12/25",
    "card_cvv": "123"
  }'
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.