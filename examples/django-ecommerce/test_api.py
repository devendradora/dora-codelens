#!/usr/bin/env python3
"""
Simple API test script for Django E-commerce backend
Run this script to test the main API endpoints
"""

import requests
import json

BASE_URL = 'http://localhost:8000/api'

def test_user_registration():
    """Test user registration"""
    print("Testing user registration...")
    
    data = {
        'email': 'test@example.com',
        'password': 'testpassword123',
        'name': 'Test User'
    }
    
    response = requests.post(f'{BASE_URL}/auth/register/', json=data)
    print(f"Registration Status: {response.status_code}")
    
    if response.status_code == 201:
        print("✅ User registration successful")
        return response.json()
    else:
        print(f"❌ Registration failed: {response.text}")
        return None

def test_user_login():
    """Test user login"""
    print("\nTesting user login...")
    
    data = {
        'email': 'test@example.com',
        'password': 'testpassword123'
    }
    
    response = requests.post(f'{BASE_URL}/auth/login/', json=data)
    print(f"Login Status: {response.status_code}")
    
    if response.status_code == 200:
        print("✅ User login successful")
        return response.json()
    else:
        print(f"❌ Login failed: {response.text}")
        return None

def test_products_list(token=None):
    """Test products listing"""
    print("\nTesting products list...")
    
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    response = requests.get(f'{BASE_URL}/products/', headers=headers)
    print(f"Products List Status: {response.status_code}")
    
    if response.status_code == 200:
        products = response.json()
        print(f"✅ Found {len(products.get('results', []))} products")
        return products
    else:
        print(f"❌ Products list failed: {response.text}")
        return None

def test_create_order(token, product_id=1):
    """Test order creation"""
    print(f"\nTesting order creation...")
    
    headers = {'Authorization': f'Bearer {token}'}
    data = {
        'items': [
            {'product': product_id, 'quantity': 2}
        ],
        'shipping_address': '123 Test Street, Test City, Test Country'
    }
    
    response = requests.post(f'{BASE_URL}/orders/', json=data, headers=headers)
    print(f"Order Creation Status: {response.status_code}")
    
    if response.status_code == 201:
        order = response.json()
        print(f"✅ Order created successfully with ID: {order['id']}")
        return order
    else:
        print(f"❌ Order creation failed: {response.text}")
        return None

def main():
    """Run all API tests"""
    print("🚀 Starting Django E-commerce API Tests\n")
    
    # Test registration
    registration_result = test_user_registration()
    
    # Test login
    login_result = test_user_login()
    
    if not login_result:
        print("❌ Cannot proceed without login token")
        return
    
    token = login_result.get('access')
    
    # Test products
    products = test_products_list(token)
    
    # Test order creation (if products exist)
    if products and products.get('results'):
        first_product = products['results'][0]
        test_create_order(token, first_product['id'])
    
    print("\n🎉 API tests completed!")

if __name__ == '__main__':
    main()