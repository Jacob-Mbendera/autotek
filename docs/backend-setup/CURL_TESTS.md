# API Endpoint Testing with cURL

This document contains cURL commands to test all API endpoints.

**Prerequisites:**
- MongoDB must be running
- Backend server must be started: `cd backend && npm run dev`
- Server runs on: `http://localhost:5000`

## Base URL
```
http://localhost:5000/api
```

---

## 1. Health Check

```bash
curl -X GET http://localhost:5000/api/health
```

---

## 2. Authentication Endpoints

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456",
    "name": "Test User",
    "phone": "+265991234567",
    "address": "123 Test Street, Lilongwe"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456"
  }'
```

**Save the token from the response for authenticated requests:**
```bash
TOKEN="your-jwt-token-here"
```

### Get Current User (Protected)
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## 3. Product Endpoints

### Get All Products
```bash
curl -X GET "http://localhost:5000/api/products?page=1&limit=20"
```

### Get Products with Filters
```bash
curl -X GET "http://localhost:5000/api/products?category=Engine%20Parts&status=available&minPrice=1000&maxPrice=100000"
```

### Get Product Categories
```bash
curl -X GET http://localhost:5000/api/products/categories
```

### Get Single Product
```bash
curl -X GET http://localhost:5000/api/products/PRODUCT_ID
```

### Create Product (Admin only)
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Engine Oil Filter",
    "description": "High quality engine oil filter",
    "category": "Engine Parts",
    "price": 15000,
    "stock": 50,
    "images": [],
    "supplier": "Supplier Name"
  }'
```

### Update Product (Admin only)
```bash
curl -X PUT http://localhost:5000/api/products/PRODUCT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 16000,
    "stock": 45
  }'
```

### Delete Product (Admin only)
```bash
curl -X DELETE http://localhost:5000/api/products/PRODUCT_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## 4. Order Endpoints

### Create Order
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "PRODUCT_ID_1",
        "quantity": 2
      },
      {
        "productId": "PRODUCT_ID_2",
        "quantity": 1
      }
    ],
    "shippingAddress": "123 Test Street, Lilongwe, Malawi",
    "paymentMethod": "airtel-money"
  }'
```

### Get User Orders
```bash
curl -X GET "http://localhost:5000/api/orders?status=pending" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Single Order
```bash
curl -X GET http://localhost:5000/api/orders/ORDER_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Update Order Status (Admin only)
```bash
curl -X PUT http://localhost:5000/api/orders/ORDER_ID/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "processing"
  }'
```

---

## 5. Custom Order Endpoints

### Create Custom Order Request
```bash
curl -X POST http://localhost:5000/api/custom-orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "Custom Brake Pads",
    "description": "Looking for specific brake pads for Toyota Corolla 2015",
    "category": "Brake Parts",
    "estimatedPrice": 25000
  }'
```

### Get User Custom Orders
```bash
curl -X GET "http://localhost:5000/api/custom-orders?status=pending" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Single Custom Order
```bash
curl -X GET http://localhost:5000/api/custom-orders/CUSTOM_ORDER_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Update Custom Order (Admin only)
```bash
curl -X PUT http://localhost:5000/api/custom-orders/CUSTOM_ORDER_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ordered",
    "estimatedPrice": 25000,
    "supplier": "Supplier Name",
    "notes": "Ordered from supplier"
  }'
```

---

## 6. Towing Service Endpoints

### Request Towing Service
```bash
curl -X POST http://localhost:5000/api/towing \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pickupLocation": "Lilongwe City Centre",
    "destination": "Blantyre",
    "vehicleDetails": {
      "make": "Toyota",
      "model": "Corolla",
      "year": 2015,
      "licensePlate": "LL 1234",
      "color": "White"
    },
    "price": 50000
  }'
```

### Get User Towing Services
```bash
curl -X GET "http://localhost:5000/api/towing?status=pending" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Single Towing Service
```bash
curl -X GET http://localhost:5000/api/towing/TOWING_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Update Towing Service
```bash
curl -X PUT http://localhost:5000/api/towing/TOWING_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "assigned",
    "assignedDriver": "DRIVER_USER_ID",
    "price": 50000
  }'
```

---

## 7. Car Service Endpoints

### Request Car Service
```bash
curl -X POST http://localhost:5000/api/car-services \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceType": "oil-change",
    "vehicleDetails": {
      "make": "Toyota",
      "model": "Corolla",
      "year": 2015,
      "licensePlate": "LL 1234"
    },
    "address": "123 Test Street, Lilongwe",
    "preferredDate": "2024-01-20T10:00:00Z",
    "notes": "Please call before arrival",
    "price": 15000
  }'
```

### Get User Car Services
```bash
curl -X GET "http://localhost:5000/api/car-services?status=pending&serviceType=oil-change" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Single Car Service
```bash
curl -X GET http://localhost:5000/api/car-services/CAR_SERVICE_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Update Car Service
```bash
curl -X PUT http://localhost:5000/api/car-services/CAR_SERVICE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "assigned",
    "assignedMechanic": "MECHANIC_USER_ID",
    "price": 15000
  }'
```

---

## 8. Payment Endpoints

### Initiate Payment
```bash
curl -X POST http://localhost:5000/api/payments/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER_ID",
    "method": "airtel-money",
    "phoneNumber": "+265991234567"
  }'
```

### Get Payment Status
```bash
curl -X GET http://localhost:5000/api/payments/PAYMENT_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Payment Callback (Webhook)
```bash
curl -X POST http://localhost:5000/api/payments/callback \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "TRANSACTION_ID",
    "status": "completed",
    "reference": "REFERENCE"
  }'
```

### Verify Payment (Admin only)
```bash
curl -X POST http://localhost:5000/api/payments/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "PAYMENT_ID",
    "verified": true
  }'
```

---

## 9. Admin Endpoints

**Note:** All admin endpoints require admin role. Update a user's role to 'admin' in MongoDB first.

### Get Dashboard Stats
```bash
curl -X GET http://localhost:5000/api/admin/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Get All Orders
```bash
curl -X GET "http://localhost:5000/api/admin/orders?page=1&limit=20&status=pending" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Get All Custom Orders
```bash
curl -X GET "http://localhost:5000/api/admin/custom-orders?page=1&limit=20&status=pending" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Get All Services
```bash
curl -X GET "http://localhost:5000/api/admin/services?type=towing&status=pending&page=1&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Testing Tips

1. **Save your token** after login:
   ```bash
   TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test123456"}' \
     -s | grep -o '"token":"[^"]*' | cut -d'"' -f4)
   echo $TOKEN
   ```

2. **Use the test script** for automated testing:
   ```bash
   cd backend
   ./test-endpoints.sh
   ```

3. **Check response status codes:**
   - `200` - Success
   - `201` - Created
   - `400` - Bad Request (validation error)
   - `401` - Unauthorized (missing/invalid token)
   - `403` - Forbidden (insufficient permissions)
   - `404` - Not Found
   - `500` - Server Error

4. **Common issues:**
   - Make sure MongoDB is running
   - Check that backend server is started
   - Verify JWT token is valid and not expired
   - For admin endpoints, ensure user role is 'admin'
