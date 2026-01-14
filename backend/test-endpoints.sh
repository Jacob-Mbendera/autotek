#!/bin/bash

# AutoTek API Endpoint Testing Script
# Make sure MongoDB is running and backend server is started (npm run dev)
# Usage: ./test-endpoints.sh

BASE_URL="http://localhost:5000/api"

echo "=========================================="
echo "AutoTek API Endpoint Testing"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables to store IDs and tokens
CUSTOMER_TOKEN=""
ADMIN_TOKEN=""
PRODUCT_ID=""
ORDER_ID=""
CUSTOM_ORDER_ID=""
TOWING_SERVICE_ID=""
CAR_SERVICE_ID=""

# Helper function to extract JSON value
extract_json() {
  echo "$1" | grep -o "\"$2\":\"[^\"]*" | cut -d'"' -f4
}

# Helper function to extract JSON value (for IDs)
extract_json_id() {
  echo "$1" | grep -o "\"$2\":\"[^\"}]*" | cut -d'"' -f4 | head -1
}

# Test Health Check
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}1. Testing Health Check${NC}"
echo -e "${BLUE}========================================${NC}"
echo "GET $BASE_URL/health"
HEALTH_RESPONSE=$(curl -X GET "$BASE_URL/health" -w "\nHTTP_STATUS:%{http_code}" -s)
HTTP_STATUS=$(echo "$HEALTH_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$HEALTH_RESPONSE" | sed '/HTTP_STATUS:/d')
echo "$BODY"
if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "${GREEN}✓ Health check passed${NC}"
else
  echo -e "${RED}✗ Health check failed${NC}"
fi
echo ""
echo "----------------------------------------"
echo ""

# ============================================
# AUTHENTICATION TESTS
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}2. AUTHENTICATION TESTS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test User Registration
echo -e "${YELLOW}2.1. Testing User Registration${NC}"
echo "POST $BASE_URL/auth/register"
REGISTER_RESPONSE=$(curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@test.com",
    "password": "Test123456",
    "name": "Test Customer",
    "phone": "+265991234567",
    "address": "123 Test Street, Lilongwe"
  }' -w "\nHTTP_STATUS:%{http_code}" -s)

HTTP_STATUS=$(echo "$REGISTER_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$REGISTER_RESPONSE" | sed '/HTTP_STATUS:/d')
echo "$BODY"
CUSTOMER_TOKEN=$(extract_json "$BODY" "token")

if [ "$HTTP_STATUS" = "201" ] && [ ! -z "$CUSTOMER_TOKEN" ]; then
  echo -e "${GREEN}✓ Registration successful${NC}"
  echo "Token: ${CUSTOMER_TOKEN:0:50}..."
else
  echo -e "${RED}✗ Registration failed or token not received${NC}"
  # Try login instead if user already exists
  echo "Attempting login instead..."
  LOGIN_RESPONSE=$(curl -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "customer@test.com",
      "password": "Test123456"
    }' -w "\nHTTP_STATUS:%{http_code}" -s)
  HTTP_STATUS=$(echo "$LOGIN_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$LOGIN_RESPONSE" | sed '/HTTP_STATUS:/d')
  CUSTOMER_TOKEN=$(extract_json "$BODY" "token")
  if [ ! -z "$CUSTOMER_TOKEN" ]; then
    echo -e "${GREEN}✓ Login successful${NC}"
  fi
fi
echo ""
echo "----------------------------------------"
echo ""

# Test User Login
echo -e "${YELLOW}2.2. Testing User Login${NC}"
echo "POST $BASE_URL/auth/login"
LOGIN_RESPONSE=$(curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@test.com",
    "password": "Test123456"
  }' -w "\nHTTP_STATUS:%{http_code}" -s)

HTTP_STATUS=$(echo "$LOGIN_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$LOGIN_RESPONSE" | sed '/HTTP_STATUS:/d')
echo "$BODY"
CUSTOMER_TOKEN=$(extract_json "$BODY" "token")

if [ "$HTTP_STATUS" = "200" ] && [ ! -z "$CUSTOMER_TOKEN" ]; then
  echo -e "${GREEN}✓ Login successful${NC}"
else
  echo -e "${RED}✗ Login failed${NC}"
fi
echo ""
echo "----------------------------------------"
echo ""

# Test Get Current User
echo -e "${YELLOW}2.3. Testing Get Current User (Protected)${NC}"
echo "GET $BASE_URL/auth/me"
if [ -z "$CUSTOMER_TOKEN" ]; then
  echo -e "${RED}✗ No token available, skipping${NC}"
else
  ME_RESPONSE=$(curl -X GET "$BASE_URL/auth/me" \
    -H "Authorization: Bearer $CUSTOMER_TOKEN" \
    -w "\nHTTP_STATUS:%{http_code}" -s)
  HTTP_STATUS=$(echo "$ME_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$ME_RESPONSE" | sed '/HTTP_STATUS:/d')
  echo "$BODY"
  if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Get current user successful${NC}"
  else
    echo -e "${RED}✗ Get current user failed${NC}"
  fi
fi
echo ""
echo "----------------------------------------"
echo ""

# Test Admin Login (for admin endpoint tests)
echo -e "${YELLOW}2.4. Testing Admin Login${NC}"
echo "POST $BASE_URL/auth/login (Admin)"
ADMIN_LOGIN_RESPONSE=$(curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@autotek.com",
    "password": "Admin123456"
  }' -w "\nHTTP_STATUS:%{http_code}" -s 2>/dev/null)

HTTP_STATUS=$(echo "$ADMIN_LOGIN_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$ADMIN_LOGIN_RESPONSE" | sed '/HTTP_STATUS:/d')
ADMIN_TOKEN=$(extract_json "$BODY" "token")

if [ "$HTTP_STATUS" = "200" ] && [ ! -z "$ADMIN_TOKEN" ]; then
  echo -e "${GREEN}✓ Admin login successful${NC}"
  echo "Admin Token: ${ADMIN_TOKEN:0:50}..."
else
  echo -e "${YELLOW}⚠ Admin login failed or admin user not found${NC}"
  echo "Note: Run 'node create-admin-user.js' to create an admin user"
fi
echo ""
echo "----------------------------------------"
echo ""

# ============================================
# PRODUCT TESTS
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}3. PRODUCT TESTS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test Get Products
echo -e "${YELLOW}3.1. Testing Get Products${NC}"
echo "GET $BASE_URL/products"
PRODUCTS_RESPONSE=$(curl -X GET "$BASE_URL/products" \
  -w "\nHTTP_STATUS:%{http_code}" -s)
HTTP_STATUS=$(echo "$PRODUCTS_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$PRODUCTS_RESPONSE" | sed '/HTTP_STATUS:/d')
echo "$BODY" | head -20
if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "${GREEN}✓ Get products successful${NC}"
  # Extract first product ID if available
  PRODUCT_ID=$(extract_json_id "$BODY" "_id")
else
  echo -e "${RED}✗ Get products failed${NC}"
fi
echo ""
echo "----------------------------------------"
echo ""

# Test Get Product Categories
echo -e "${YELLOW}3.2. Testing Get Product Categories${NC}"
echo "GET $BASE_URL/products/categories"
CATEGORIES_RESPONSE=$(curl -X GET "$BASE_URL/products/categories" \
  -w "\nHTTP_STATUS:%{http_code}" -s)
HTTP_STATUS=$(echo "$CATEGORIES_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$CATEGORIES_RESPONSE" | sed '/HTTP_STATUS:/d')
echo "$BODY"
if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "${GREEN}✓ Get categories successful${NC}"
else
  echo -e "${RED}✗ Get categories failed${NC}"
fi
echo ""
echo "----------------------------------------"
echo ""

# Test Create Product (Admin only)
echo -e "${YELLOW}3.3. Testing Create Product (Admin only)${NC}"
echo "POST $BASE_URL/products"
if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${YELLOW}⚠ No admin token available, trying with customer token${NC}"
  if [ -z "$CUSTOMER_TOKEN" ]; then
    echo -e "${RED}✗ No token available, skipping${NC}"
  else
    CREATE_PRODUCT_RESPONSE=$(curl -X POST "$BASE_URL/products" \
      -H "Authorization: Bearer $CUSTOMER_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Test Engine Oil",
        "description": "High quality engine oil for all vehicles",
        "category": "Engine Parts",
        "price": 50000,
        "stock": 10,
        "images": []
      }' -w "\nHTTP_STATUS:%{http_code}" -s)
    HTTP_STATUS=$(echo "$CREATE_PRODUCT_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
    BODY=$(echo "$CREATE_PRODUCT_RESPONSE" | sed '/HTTP_STATUS:/d')
    echo "$BODY"
    if [ "$HTTP_STATUS" = "403" ]; then
      echo -e "${YELLOW}⚠ Create product requires admin role (expected)${NC}"
    else
      echo -e "${RED}✗ Create product failed${NC}"
    fi
  fi
else
  CREATE_PRODUCT_RESPONSE=$(curl -X POST "$BASE_URL/products" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Test Engine Oil",
      "description": "High quality engine oil for all vehicles",
      "category": "Engine Parts",
      "price": 50000,
      "stock": 10,
      "images": []
    }' -w "\nHTTP_STATUS:%{http_code}" -s)
  HTTP_STATUS=$(echo "$CREATE_PRODUCT_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$CREATE_PRODUCT_RESPONSE" | sed '/HTTP_STATUS:/d')
  echo "$BODY"
  if [ "$HTTP_STATUS" = "201" ]; then
    echo -e "${GREEN}✓ Create product successful${NC}"
    PRODUCT_ID=$(extract_json_id "$BODY" "_id")
  else
    echo -e "${RED}✗ Create product failed${NC}"
  fi
fi
echo ""
echo "----------------------------------------"
echo ""

# ============================================
# ORDER TESTS
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}4. ORDER TESTS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test Get User Orders
echo -e "${YELLOW}4.1. Testing Get User Orders${NC}"
echo "GET $BASE_URL/orders"
if [ -z "$CUSTOMER_TOKEN" ]; then
  echo -e "${RED}✗ No token available, skipping${NC}"
else
  ORDERS_RESPONSE=$(curl -X GET "$BASE_URL/orders" \
    -H "Authorization: Bearer $CUSTOMER_TOKEN" \
    -w "\nHTTP_STATUS:%{http_code}" -s)
  HTTP_STATUS=$(echo "$ORDERS_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$ORDERS_RESPONSE" | sed '/HTTP_STATUS:/d')
  echo "$BODY" | head -20
  if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Get orders successful${NC}"
  else
    echo -e "${RED}✗ Get orders failed${NC}"
  fi
fi
echo ""
echo "----------------------------------------"
echo ""

# Test Create Order (requires products in database)
echo -e "${YELLOW}4.2. Testing Create Order${NC}"
echo "POST $BASE_URL/orders"
if [ -z "$CUSTOMER_TOKEN" ]; then
  echo -e "${RED}✗ No token available, skipping${NC}"
elif [ -z "$PRODUCT_ID" ]; then
  echo -e "${YELLOW}⚠ No product ID available, skipping order creation${NC}"
  echo "Note: Create a product first (as admin) to test order creation"
else
  CREATE_ORDER_RESPONSE=$(curl -X POST "$BASE_URL/orders" \
    -H "Authorization: Bearer $CUSTOMER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"items\": [
        {
          \"productId\": \"$PRODUCT_ID\",
          \"quantity\": 2
        }
      ],
      \"shippingAddress\": \"123 Test Street, Lilongwe\",
      \"paymentMethod\": \"airtel-money\"
    }" -w "\nHTTP_STATUS:%{http_code}" -s)
  HTTP_STATUS=$(echo "$CREATE_ORDER_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$CREATE_ORDER_RESPONSE" | sed '/HTTP_STATUS:/d')
  echo "$BODY"
  if [ "$HTTP_STATUS" = "201" ]; then
    echo -e "${GREEN}✓ Create order successful${NC}"
    # Extract order ID - need to get the top-level _id, not nested ones
    ORDER_ID=$(echo "$BODY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('_id', ''))" 2>/dev/null)
    if [ -z "$ORDER_ID" ]; then
      # Fallback to grep method
      ORDER_ID=$(echo "$BODY" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
    fi
  else
    echo -e "${RED}✗ Create order failed${NC}"
  fi
fi
echo ""
echo "----------------------------------------"
echo ""

# ============================================
# CUSTOM ORDER TESTS
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}5. CUSTOM ORDER TESTS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test Create Custom Order
echo -e "${YELLOW}5.1. Testing Create Custom Order${NC}"
echo "POST $BASE_URL/custom-orders"
if [ -z "$CUSTOMER_TOKEN" ]; then
  echo -e "${RED}✗ No token available, skipping${NC}"
else
  CREATE_CUSTOM_ORDER_RESPONSE=$(curl -X POST "$BASE_URL/custom-orders" \
    -H "Authorization: Bearer $CUSTOMER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "productName": "Custom Brake Pads",
      "description": "Looking for brake pads for Toyota Corolla 2015",
      "category": "Brake Parts",
      "estimatedPrice": 75000
    }' -w "\nHTTP_STATUS:%{http_code}" -s)
  HTTP_STATUS=$(echo "$CREATE_CUSTOM_ORDER_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$CREATE_CUSTOM_ORDER_RESPONSE" | sed '/HTTP_STATUS:/d')
  echo "$BODY"
  if [ "$HTTP_STATUS" = "201" ]; then
    echo -e "${GREEN}✓ Create custom order successful${NC}"
    CUSTOM_ORDER_ID=$(extract_json_id "$BODY" "_id")
  else
    echo -e "${RED}✗ Create custom order failed${NC}"
  fi
fi
echo ""
echo "----------------------------------------"
echo ""

# Test Get Custom Orders
echo -e "${YELLOW}5.2. Testing Get Custom Orders${NC}"
echo "GET $BASE_URL/custom-orders"
if [ -z "$CUSTOMER_TOKEN" ]; then
  echo -e "${RED}✗ No token available, skipping${NC}"
else
  CUSTOM_ORDERS_RESPONSE=$(curl -X GET "$BASE_URL/custom-orders" \
    -H "Authorization: Bearer $CUSTOMER_TOKEN" \
    -w "\nHTTP_STATUS:%{http_code}" -s)
  HTTP_STATUS=$(echo "$CUSTOM_ORDERS_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$CUSTOM_ORDERS_RESPONSE" | sed '/HTTP_STATUS:/d')
  echo "$BODY" | head -20
  if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Get custom orders successful${NC}"
  else
    echo -e "${RED}✗ Get custom orders failed${NC}"
  fi
fi
echo ""
echo "----------------------------------------"
echo ""

# ============================================
# SERVICE TESTS
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}6. SERVICE TESTS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test Create Towing Service
echo -e "${YELLOW}6.1. Testing Create Towing Service${NC}"
echo "POST $BASE_URL/towing"
if [ -z "$CUSTOMER_TOKEN" ]; then
  echo -e "${RED}✗ No token available, skipping${NC}"
else
  CREATE_TOWING_RESPONSE=$(curl -X POST "$BASE_URL/towing" \
    -H "Authorization: Bearer $CUSTOMER_TOKEN" \
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
    }' -w "\nHTTP_STATUS:%{http_code}" -s)
  HTTP_STATUS=$(echo "$CREATE_TOWING_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$CREATE_TOWING_RESPONSE" | sed '/HTTP_STATUS:/d')
  echo "$BODY"
  if [ "$HTTP_STATUS" = "201" ]; then
    echo -e "${GREEN}✓ Create towing service successful${NC}"
    TOWING_SERVICE_ID=$(extract_json_id "$BODY" "_id")
  else
    echo -e "${RED}✗ Create towing service failed${NC}"
  fi
fi
echo ""
echo "----------------------------------------"
echo ""

# Test Get Towing Services
echo -e "${YELLOW}6.2. Testing Get Towing Services${NC}"
echo "GET $BASE_URL/towing"
if [ -z "$CUSTOMER_TOKEN" ]; then
  echo -e "${RED}✗ No token available, skipping${NC}"
else
  TOWING_RESPONSE=$(curl -X GET "$BASE_URL/towing" \
    -H "Authorization: Bearer $CUSTOMER_TOKEN" \
    -w "\nHTTP_STATUS:%{http_code}" -s)
  HTTP_STATUS=$(echo "$TOWING_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$TOWING_RESPONSE" | sed '/HTTP_STATUS:/d')
  echo "$BODY" | head -20
  if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Get towing services successful${NC}"
  else
    echo -e "${RED}✗ Get towing services failed${NC}"
  fi
fi
echo ""
echo "----------------------------------------"
echo ""

# Test Create Car Service
echo -e "${YELLOW}6.3. Testing Create Car Service${NC}"
echo "POST $BASE_URL/car-services"
if [ -z "$CUSTOMER_TOKEN" ]; then
  echo -e "${RED}✗ No token available, skipping${NC}"
else
  CREATE_CAR_SERVICE_RESPONSE=$(curl -X POST "$BASE_URL/car-services" \
    -H "Authorization: Bearer $CUSTOMER_TOKEN" \
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
      "preferredDate": "2024-12-25T10:00:00Z",
      "price": 25000,
      "notes": "Please bring synthetic oil"
    }' -w "\nHTTP_STATUS:%{http_code}" -s)
  HTTP_STATUS=$(echo "$CREATE_CAR_SERVICE_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$CREATE_CAR_SERVICE_RESPONSE" | sed '/HTTP_STATUS:/d')
  echo "$BODY"
  if [ "$HTTP_STATUS" = "201" ]; then
    echo -e "${GREEN}✓ Create car service successful${NC}"
    CAR_SERVICE_ID=$(extract_json_id "$BODY" "_id")
  else
    echo -e "${RED}✗ Create car service failed${NC}"
  fi
fi
echo ""
echo "----------------------------------------"
echo ""

# Test Get Car Services
echo -e "${YELLOW}6.4. Testing Get Car Services${NC}"
echo "GET $BASE_URL/car-services"
if [ -z "$CUSTOMER_TOKEN" ]; then
  echo -e "${RED}✗ No token available, skipping${NC}"
else
  CAR_SERVICES_RESPONSE=$(curl -X GET "$BASE_URL/car-services" \
    -H "Authorization: Bearer $CUSTOMER_TOKEN" \
    -w "\nHTTP_STATUS:%{http_code}" -s)
  HTTP_STATUS=$(echo "$CAR_SERVICES_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$CAR_SERVICES_RESPONSE" | sed '/HTTP_STATUS:/d')
  echo "$BODY" | head -20
  if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Get car services successful${NC}"
  else
    echo -e "${RED}✗ Get car services failed${NC}"
  fi
fi
echo ""
echo "----------------------------------------"
echo ""

# ============================================
# PAYMENT TESTS
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}7. PAYMENT TESTS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test Initiate Payment (requires order or service)
echo -e "${YELLOW}7.1. Testing Initiate Payment${NC}"
echo "POST $BASE_URL/payments/initiate"
if [ -z "$CUSTOMER_TOKEN" ]; then
  echo -e "${RED}✗ No token available, skipping${NC}"
elif [ -z "$ORDER_ID" ] && [ -z "$TOWING_SERVICE_ID" ] && [ -z "$CAR_SERVICE_ID" ]; then
  echo -e "${YELLOW}⚠ No order or service ID available, skipping payment test${NC}"
  echo "Note: Create an order or service first to test payment"
else
  # Try with order if available
  if [ ! -z "$ORDER_ID" ]; then
    PAYMENT_RESPONSE=$(curl -X POST "$BASE_URL/payments/initiate" \
      -H "Authorization: Bearer $CUSTOMER_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"orderId\": \"$ORDER_ID\",
        \"method\": \"airtel-money\",
        \"phoneNumber\": \"+265991234567\"
      }" -w "\nHTTP_STATUS:%{http_code}" -s)
  elif [ ! -z "$TOWING_SERVICE_ID" ]; then
    PAYMENT_RESPONSE=$(curl -X POST "$BASE_URL/payments/initiate" \
      -H "Authorization: Bearer $CUSTOMER_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"towingServiceId\": \"$TOWING_SERVICE_ID\",
        \"method\": \"airtel-money\",
        \"phoneNumber\": \"+265991234567\"
      }" -w "\nHTTP_STATUS:%{http_code}" -s)
  else
    PAYMENT_RESPONSE=$(curl -X POST "$BASE_URL/payments/initiate" \
      -H "Authorization: Bearer $CUSTOMER_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"carServiceId\": \"$CAR_SERVICE_ID\",
        \"method\": \"airtel-money\",
        \"phoneNumber\": \"+265991234567\"
      }" -w "\nHTTP_STATUS:%{http_code}" -s)
  fi
  
  HTTP_STATUS=$(echo "$PAYMENT_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$PAYMENT_RESPONSE" | sed '/HTTP_STATUS:/d')
  echo "$BODY"
  if [ "$HTTP_STATUS" = "201" ]; then
    echo -e "${GREEN}✓ Initiate payment successful${NC}"
  elif echo "$BODY" | grep -qE "(credentials not configured|Failed to authenticate with Airtel Money)"; then
    echo -e "${YELLOW}⚠ Payment requires Airtel Money API credentials (expected)${NC}"
    echo "Note: Set AIRTEL_CLIENT_ID and AIRTEL_CLIENT_SECRET in .env to test payments"
  else
    echo -e "${RED}✗ Initiate payment failed${NC}"
  fi
fi
echo ""
echo "----------------------------------------"
echo ""

# ============================================
# ADMIN TESTS (will fail without admin token)
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}8. ADMIN TESTS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test Admin Stats
echo -e "${YELLOW}8.1. Testing Admin Stats${NC}"
echo "GET $BASE_URL/admin/stats"
if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${YELLOW}⚠ No admin token available, trying with customer token${NC}"
  if [ -z "$CUSTOMER_TOKEN" ]; then
    echo -e "${RED}✗ No token available, skipping${NC}"
  else
    ADMIN_STATS_RESPONSE=$(curl -X GET "$BASE_URL/admin/stats" \
      -H "Authorization: Bearer $CUSTOMER_TOKEN" \
      -w "\nHTTP_STATUS:%{http_code}" -s)
    HTTP_STATUS=$(echo "$ADMIN_STATS_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
    BODY=$(echo "$ADMIN_STATS_RESPONSE" | sed '/HTTP_STATUS:/d')
    echo "$BODY"
    if [ "$HTTP_STATUS" = "403" ]; then
      echo -e "${YELLOW}⚠ Admin stats requires admin role (expected)${NC}"
    else
      echo -e "${RED}✗ Admin stats failed${NC}"
    fi
  fi
else
  ADMIN_STATS_RESPONSE=$(curl -X GET "$BASE_URL/admin/stats" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -w "\nHTTP_STATUS:%{http_code}" -s)
  HTTP_STATUS=$(echo "$ADMIN_STATS_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$ADMIN_STATS_RESPONSE" | sed '/HTTP_STATUS:/d')
  echo "$BODY"
  if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Admin stats successful${NC}"
  else
    echo -e "${RED}✗ Admin stats failed${NC}"
  fi
fi
echo ""
echo "----------------------------------------"
echo ""

# Test Admin Get All Orders
echo -e "${YELLOW}8.2. Testing Admin Get All Orders${NC}"
echo "GET $BASE_URL/admin/orders"
if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${YELLOW}⚠ No admin token available, trying with customer token${NC}"
  if [ -z "$CUSTOMER_TOKEN" ]; then
    echo -e "${RED}✗ No token available, skipping${NC}"
  else
    ADMIN_ORDERS_RESPONSE=$(curl -X GET "$BASE_URL/admin/orders" \
      -H "Authorization: Bearer $CUSTOMER_TOKEN" \
      -w "\nHTTP_STATUS:%{http_code}" -s)
    HTTP_STATUS=$(echo "$ADMIN_ORDERS_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
    BODY=$(echo "$ADMIN_ORDERS_RESPONSE" | sed '/HTTP_STATUS:/d')
    echo "$BODY" | head -20
    if [ "$HTTP_STATUS" = "403" ]; then
      echo -e "${YELLOW}⚠ Admin get orders requires admin role (expected)${NC}"
    else
      echo -e "${RED}✗ Admin get orders failed${NC}"
    fi
  fi
else
  ADMIN_ORDERS_RESPONSE=$(curl -X GET "$BASE_URL/admin/orders" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -w "\nHTTP_STATUS:%{http_code}" -s)
  HTTP_STATUS=$(echo "$ADMIN_ORDERS_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$ADMIN_ORDERS_RESPONSE" | sed '/HTTP_STATUS:/d')
  echo "$BODY" | head -20
  if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Admin get orders successful${NC}"
  else
    echo -e "${RED}✗ Admin get orders failed${NC}"
  fi
fi
echo ""
echo "----------------------------------------"
echo ""

# ============================================
# SUMMARY
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Testing Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Customer Token: ${CUSTOMER_TOKEN:0:50}..."
if [ ! -z "$ADMIN_TOKEN" ]; then
  echo "Admin Token: ${ADMIN_TOKEN:0:50}..."
fi
echo "Product ID: $PRODUCT_ID"
echo "Order ID: $ORDER_ID"
echo "Custom Order ID: $CUSTOM_ORDER_ID"
echo "Towing Service ID: $TOWING_SERVICE_ID"
echo "Car Service ID: $CAR_SERVICE_ID"
echo ""
echo -e "${YELLOW}Note:${NC}"
echo "- Some endpoints require admin role. To test admin endpoints:"
echo "  1. Create an admin user in MongoDB or update a user's role to 'admin'"
echo "  2. Login as admin to get admin token"
echo "  3. Use admin token for admin endpoint tests"
echo ""
echo "- Payment endpoints require Airtel Money API credentials in .env"
echo "- Make sure MongoDB is running and backend server is started"
echo ""
echo -e "${GREEN}Testing complete!${NC}"
