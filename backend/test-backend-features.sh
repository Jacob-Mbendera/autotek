#!/bin/bash

# Focused Backend Feature Testing Script
# Tests: Product CRUD, Order Creation (no payment), Custom Orders, Service Requests
# Usage: ./test-backend-features.sh

BASE_URL="http://localhost:5000/api"

echo "=========================================="
echo "Backend Feature Testing - AutoTek"
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
PRODUCT_ID_2=""
ORDER_ID=""
CUSTOM_ORDER_ID=""
TOWING_SERVICE_ID=""
CAR_SERVICE_ID=""

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to extract JSON value
extract_json() {
  echo "$1" | grep -o "\"$2\":\"[^\"]*" | cut -d'"' -f4
}

# Helper function to extract JSON ID
extract_json_id() {
  echo "$1" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('$2', ''))" 2>/dev/null || echo "$1" | grep -o "\"$2\":\"[^\"]*" | head -1 | cut -d'"' -f4
}

# Test result tracker
test_result() {
  if [ "$1" = "pass" ]; then
    echo -e "${GREEN}✓ $2${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ $2${NC}"
    ((TESTS_FAILED++))
  fi
}

# ============================================
# SETUP: Authentication
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}SETUP: Authentication${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Customer Login/Register
echo "Registering/Logging in as customer..."
REGISTER_RESPONSE=$(curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testcustomer@autotek.com",
    "password": "Test123456",
    "name": "Test Customer",
    "phone": "+265991234567",
    "address": "123 Test Street, Lilongwe"
  }' -w "\nHTTP_STATUS:%{http_code}" -s 2>/dev/null)

HTTP_STATUS=$(echo "$REGISTER_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$REGISTER_RESPONSE" | sed '/HTTP_STATUS:/d')
CUSTOMER_TOKEN=$(extract_json "$BODY" "token")

if [ -z "$CUSTOMER_TOKEN" ]; then
  # Try login if user exists
  LOGIN_RESPONSE=$(curl -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "testcustomer@autotek.com",
      "password": "Test123456"
    }' -w "\nHTTP_STATUS:%{http_code}" -s 2>/dev/null)
  HTTP_STATUS=$(echo "$LOGIN_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$LOGIN_RESPONSE" | sed '/HTTP_STATUS:/d')
  CUSTOMER_TOKEN=$(extract_json "$BODY" "token")
fi

if [ ! -z "$CUSTOMER_TOKEN" ]; then
  test_result "pass" "Customer authentication successful"
else
  test_result "fail" "Customer authentication failed"
  echo -e "${RED}Cannot proceed without customer token. Exiting.${NC}"
  exit 1
fi

# Admin Login
echo "Logging in as admin..."
ADMIN_LOGIN_RESPONSE=$(curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@autotek.com",
    "password": "Admin123456"
  }' -w "\nHTTP_STATUS:%{http_code}" -s 2>/dev/null)

HTTP_STATUS=$(echo "$ADMIN_LOGIN_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$ADMIN_LOGIN_RESPONSE" | sed '/HTTP_STATUS:/d')
ADMIN_TOKEN=$(extract_json "$BODY" "token")

if [ ! -z "$ADMIN_TOKEN" ]; then
  test_result "pass" "Admin authentication successful"
else
  echo -e "${YELLOW}⚠ Admin login failed. Some tests will be skipped.${NC}"
  echo "Note: Run 'node create-admin-user.js' to create an admin user"
fi

echo ""
echo "----------------------------------------"
echo ""

# ============================================
# TEST 1: PRODUCT CRUD OPERATIONS
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}TEST 1: PRODUCT CRUD OPERATIONS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1.1 Create Product (Admin)
echo "1.1. Creating product (Admin only)..."
if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${YELLOW}⚠ Skipping: Admin token required${NC}"
else
  CREATE_PRODUCT_RESPONSE=$(curl -X POST "$BASE_URL/products" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Engine Oil 5W-30",
      "description": "High quality synthetic engine oil for all vehicles",
      "category": "Engine Parts",
      "price": 50000,
      "stock": 20,
      "images": []
    }' -w "\nHTTP_STATUS:%{http_code}" -s 2>/dev/null)

  HTTP_STATUS=$(echo "$CREATE_PRODUCT_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$CREATE_PRODUCT_RESPONSE" | sed '/HTTP_STATUS:/d')
  
  if [ "$HTTP_STATUS" = "201" ]; then
    PRODUCT_ID=$(extract_json_id "$BODY" "_id")
    test_result "pass" "Create product successful (ID: ${PRODUCT_ID:0:8}...)"
  else
    test_result "fail" "Create product failed (Status: $HTTP_STATUS)"
    echo "Response: $BODY"
  fi
fi
echo ""

# 1.2 Create Second Product
echo "1.2. Creating second product..."
if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${YELLOW}⚠ Skipping: Admin token required${NC}"
else
  CREATE_PRODUCT_2_RESPONSE=$(curl -X POST "$BASE_URL/products" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Brake Pads - Front",
      "description": "Premium ceramic brake pads for front wheels",
      "category": "Brake Parts",
      "price": 75000,
      "stock": 15,
      "images": []
    }' -w "\nHTTP_STATUS:%{http_code}" -s 2>/dev/null)

  HTTP_STATUS=$(echo "$CREATE_PRODUCT_2_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$CREATE_PRODUCT_2_RESPONSE" | sed '/HTTP_STATUS:/d')
  
  if [ "$HTTP_STATUS" = "201" ]; then
    PRODUCT_ID_2=$(extract_json_id "$BODY" "_id")
    test_result "pass" "Create second product successful (ID: ${PRODUCT_ID_2:0:8}...)"
  else
    test_result "fail" "Create second product failed (Status: $HTTP_STATUS)"
  fi
fi
echo ""

# 1.3 Read Products (List)
echo "1.3. Reading products list..."
GET_PRODUCTS_RESPONSE=$(curl -X GET "$BASE_URL/products" \
  -w "\nHTTP_STATUS:%{http_code}" -s 2>/dev/null)

HTTP_STATUS=$(echo "$GET_PRODUCTS_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$GET_PRODUCTS_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" = "200" ]; then
  PRODUCT_COUNT=$(echo "$BODY" | python3 -c 'import sys, json; data=json.load(sys.stdin); print(len(data) if isinstance(data, list) else len(data.get("products", [])))' 2>/dev/null || echo "0")
  test_result "pass" "Get products successful (Found: $PRODUCT_COUNT products)"
else
  test_result "fail" "Get products failed (Status: $HTTP_STATUS)"
fi
echo ""

# 1.4 Read Single Product
if [ ! -z "$PRODUCT_ID" ]; then
  echo "1.4. Reading single product..."
  GET_PRODUCT_RESPONSE=$(curl -X GET "$BASE_URL/products/$PRODUCT_ID" \
    -w "\nHTTP_STATUS:%{http_code}" -s 2>/dev/null)

  HTTP_STATUS=$(echo "$GET_PRODUCT_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$GET_PRODUCT_RESPONSE" | sed '/HTTP_STATUS:/d')

  if [ "$HTTP_STATUS" = "200" ]; then
    test_result "pass" "Get single product successful"
  else
    test_result "fail" "Get single product failed (Status: $HTTP_STATUS)"
  fi
  echo ""
fi

# 1.5 Update Product (Admin)
if [ ! -z "$PRODUCT_ID" ] && [ ! -z "$ADMIN_TOKEN" ]; then
  echo "1.5. Updating product..."
  UPDATE_PRODUCT_RESPONSE=$(curl -X PUT "$BASE_URL/products/$PRODUCT_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Engine Oil 5W-30 (Updated)",
      "price": 52000,
      "stock": 18
    }' -w "\nHTTP_STATUS:%{http_code}" -s 2>/dev/null)

  HTTP_STATUS=$(echo "$UPDATE_PRODUCT_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$UPDATE_PRODUCT_RESPONSE" | sed '/HTTP_STATUS:/d')

  if [ "$HTTP_STATUS" = "200" ]; then
    test_result "pass" "Update product successful"
  else
    test_result "fail" "Update product failed (Status: $HTTP_STATUS)"
  fi
  echo ""
fi

# 1.6 Delete Product (Admin) - Skip for now to keep products for order testing
# We'll delete at the end if needed

echo "----------------------------------------"
echo ""

# ============================================
# TEST 2: ORDER CREATION (WITHOUT PAYMENT)
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}TEST 2: ORDER CREATION (NO PAYMENT)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 2.1 Create Order with Single Item
if [ -z "$PRODUCT_ID" ]; then
  echo -e "${YELLOW}⚠ Skipping: No product ID available${NC}"
else
  echo "2.1. Creating order with single item..."
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
      \"shippingAddress\": \"123 Test Street, Lilongwe, Malawi\",
      \"paymentMethod\": \"airtel-money\"
    }" -w "\nHTTP_STATUS:%{http_code}" -s 2>/dev/null)

  HTTP_STATUS=$(echo "$CREATE_ORDER_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$CREATE_ORDER_RESPONSE" | sed '/HTTP_STATUS:/d')

  if [ "$HTTP_STATUS" = "201" ]; then
    ORDER_ID=$(extract_json_id "$BODY" "_id")
    TOTAL_AMOUNT=$(echo "$BODY" | python3 -c 'import sys, json; data=json.load(sys.stdin); print(data.get("totalAmount", 0))' 2>/dev/null || echo "0")
    test_result "pass" "Create order successful (ID: ${ORDER_ID:0:8}..., Total: MWK $TOTAL_AMOUNT)"
  else
    test_result "fail" "Create order failed (Status: $HTTP_STATUS)"
    echo "Response: $BODY"
  fi
  echo ""
fi

# 2.2 Create Order with Multiple Items
if [ -z "$PRODUCT_ID" ] || [ -z "$PRODUCT_ID_2" ]; then
  echo -e "${YELLOW}⚠ Skipping: Need at least 2 products for multi-item order${NC}"
else
  echo "2.2. Creating order with multiple items..."
  CREATE_ORDER_2_RESPONSE=$(curl -X POST "$BASE_URL/orders" \
    -H "Authorization: Bearer $CUSTOMER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"items\": [
        {
          \"productId\": \"$PRODUCT_ID\",
          \"quantity\": 1
        },
        {
          \"productId\": \"$PRODUCT_ID_2\",
          \"quantity\": 1
        }
      ],
      \"shippingAddress\": \"456 Another Street, Blantyre, Malawi\",
      \"paymentMethod\": \"bank-transfer\"
    }" -w "\nHTTP_STATUS:%{http_code}" -s 2>/dev/null)

  HTTP_STATUS=$(echo "$CREATE_ORDER_2_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$CREATE_ORDER_2_RESPONSE" | sed '/HTTP_STATUS:/d')

  if [ "$HTTP_STATUS" = "201" ]; then
    ORDER_ID_2=$(extract_json_id "$BODY" "_id")
    TOTAL_AMOUNT=$(echo "$BODY" | python3 -c 'import sys, json; data=json.load(sys.stdin); print(data.get("totalAmount", 0))' 2>/dev/null || echo "0")
    test_result "pass" "Create multi-item order successful (ID: ${ORDER_ID_2:0:8}..., Total: MWK $TOTAL_AMOUNT)"
  else
    test_result "fail" "Create multi-item order failed (Status: $HTTP_STATUS)"
    echo "Response: $BODY"
  fi
  echo ""
fi

# 2.3 Get User Orders
echo "2.3. Getting user orders..."
GET_ORDERS_RESPONSE=$(curl -X GET "$BASE_URL/orders" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -w "\nHTTP_STATUS:%{http_code}" -s 2>/dev/null)

HTTP_STATUS=$(echo "$GET_ORDERS_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$GET_ORDERS_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" = "200" ]; then
  ORDER_COUNT=$(echo "$BODY" | python3 -c 'import sys, json; data=json.load(sys.stdin); print(len(data) if isinstance(data, list) else 0)' 2>/dev/null || echo "0")
  test_result "pass" "Get user orders successful (Found: $ORDER_COUNT orders)"
else
  test_result "fail" "Get user orders failed (Status: $HTTP_STATUS)"
fi
echo ""

# 2.4 Get Single Order
if [ ! -z "$ORDER_ID" ]; then
  echo "2.4. Getting single order..."
  GET_ORDER_RESPONSE=$(curl -X GET "$BASE_URL/orders/$ORDER_ID" \
    -H "Authorization: Bearer $CUSTOMER_TOKEN" \
    -w "\nHTTP_STATUS:%{http_code}" -s 2>/dev/null)

  HTTP_STATUS=$(echo "$GET_ORDER_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$GET_ORDER_RESPONSE" | sed '/HTTP_STATUS:/d')

  if [ "$HTTP_STATUS" = "200" ]; then
    test_result "pass" "Get single order successful"
  else
    test_result "fail" "Get single order failed (Status: $HTTP_STATUS)"
  fi
  echo ""
fi

echo "----------------------------------------"
echo ""

# ============================================
# TEST 3: CUSTOM ORDER REQUESTS
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}TEST 3: CUSTOM ORDER REQUESTS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 3.1 Create Custom Order
echo "3.1. Creating custom order request..."
CREATE_CUSTOM_ORDER_RESPONSE=$(curl -X POST "$BASE_URL/custom-orders" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "Custom Brake Pads for Toyota Corolla 2015",
    "description": "Looking for front brake pads specifically for Toyota Corolla 2015 model. Need ceramic type.",
    "category": "Brake Parts",
    "estimatedPrice": 80000
  }' -w "\nHTTP_STATUS:%{http_code}" -s 2>/dev/null)

HTTP_STATUS=$(echo "$CREATE_CUSTOM_ORDER_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$CREATE_CUSTOM_ORDER_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" = "201" ]; then
  CUSTOM_ORDER_ID=$(extract_json_id "$BODY" "_id")
  test_result "pass" "Create custom order successful (ID: ${CUSTOM_ORDER_ID:0:8}...)"
else
  test_result "fail" "Create custom order failed (Status: $HTTP_STATUS)"
  echo "Response: $BODY"
fi
echo ""

# 3.2 Create Another Custom Order
echo "3.2. Creating second custom order request..."
CREATE_CUSTOM_ORDER_2_RESPONSE=$(curl -X POST "$BASE_URL/custom-orders" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "Spark Plugs - NGK Iridium",
    "description": "Need 4 NGK Iridium spark plugs for Honda Civic 2018",
    "category": "Engine Parts",
    "estimatedPrice": 45000
  }' -w "\nHTTP_STATUS:%{http_code}" -s 2>/dev/null)

HTTP_STATUS=$(echo "$CREATE_CUSTOM_ORDER_2_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$CREATE_CUSTOM_ORDER_2_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" = "201" ]; then
  test_result "pass" "Create second custom order successful"
else
  test_result "fail" "Create second custom order failed (Status: $HTTP_STATUS)"
fi
echo ""

# 3.3 Get Custom Orders
echo "3.3. Getting custom orders..."
GET_CUSTOM_ORDERS_RESPONSE=$(curl -X GET "$BASE_URL/custom-orders" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -w "\nHTTP_STATUS:%{http_code}" -s 2>/dev/null)

HTTP_STATUS=$(echo "$GET_CUSTOM_ORDERS_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$GET_CUSTOM_ORDERS_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" = "200" ]; then
  CUSTOM_ORDER_COUNT=$(echo "$BODY" | python3 -c 'import sys, json; data=json.load(sys.stdin); print(len(data) if isinstance(data, list) else 0)' 2>/dev/null || echo "0")
  test_result "pass" "Get custom orders successful (Found: $CUSTOM_ORDER_COUNT custom orders)"
else
  test_result "fail" "Get custom orders failed (Status: $HTTP_STATUS)"
fi
echo ""

# 3.4 Get Single Custom Order
if [ ! -z "$CUSTOM_ORDER_ID" ]; then
  echo "3.4. Getting single custom order..."
  GET_CUSTOM_ORDER_RESPONSE=$(curl -X GET "$BASE_URL/custom-orders/$CUSTOM_ORDER_ID" \
    -H "Authorization: Bearer $CUSTOMER_TOKEN" \
    -w "\nHTTP_STATUS:%{http_code}" -s 2>/dev/null)

  HTTP_STATUS=$(echo "$GET_CUSTOM_ORDER_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$GET_CUSTOM_ORDER_RESPONSE" | sed '/HTTP_STATUS:/d')

  if [ "$HTTP_STATUS" = "200" ]; then
    test_result "pass" "Get single custom order successful"
  else
    test_result "fail" "Get single custom order failed (Status: $HTTP_STATUS)"
  fi
  echo ""
fi

echo "----------------------------------------"
echo ""

# ============================================
# TEST 4: SERVICE REQUESTS
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}TEST 4: SERVICE REQUESTS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 4.1 Create Towing Service
echo "4.1. Creating towing service request..."
CREATE_TOWING_RESPONSE=$(curl -X POST "$BASE_URL/towing" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pickupLocation": "Lilongwe City Centre, Near Shoprite",
    "destination": "Blantyre, Limbe Area",
    "vehicleDetails": {
      "make": "Toyota",
      "model": "Corolla",
      "year": 2015,
      "licensePlate": "LL 1234 AB",
      "color": "White"
    },
    "price": 50000
  }' -w "\nHTTP_STATUS:%{http_code}" -s 2>/dev/null)

HTTP_STATUS=$(echo "$CREATE_TOWING_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$CREATE_TOWING_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" = "201" ]; then
  TOWING_SERVICE_ID=$(extract_json_id "$BODY" "_id")
  test_result "pass" "Create towing service successful (ID: ${TOWING_SERVICE_ID:0:8}...)"
else
  test_result "fail" "Create towing service failed (Status: $HTTP_STATUS)"
  echo "Response: $BODY"
fi
echo ""

# 4.2 Get Towing Services
echo "4.2. Getting towing services..."
GET_TOWING_RESPONSE=$(curl -X GET "$BASE_URL/towing" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -w "\nHTTP_STATUS:%{http_code}" -s 2>/dev/null)

HTTP_STATUS=$(echo "$GET_TOWING_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$GET_TOWING_RESPONSE" | sed '/HTTP_STATUS:/d")

if [ "$HTTP_STATUS" = "200" ]; then
  TOWING_COUNT=$(echo "$BODY" | grep -o "\"_id\"" | wc -l)
  test_result "pass" "Get towing services successful (Found: ${TOWING_COUNT} services)"
else
  test_result "fail" "Get towing services failed (Status: $HTTP_STATUS)"
fi
echo ""

# 4.3 Create Car Service - Oil Change
echo "4.3. Creating car service request (Oil Change)..."
CREATE_CAR_SERVICE_RESPONSE=$(curl -X POST "$BASE_URL/car-services" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceType": "oil-change",
    "vehicleDetails": {
      "make": "Toyota",
      "model": "Corolla",
      "year": 2015,
      "licensePlate": "LL 1234 AB"
    },
    "address": "123 Test Street, Area 47, Lilongwe",
    "preferredDate": "2024-12-25T10:00:00Z",
    "price": 25000,
    "notes": "Please bring synthetic 5W-30 engine oil"
  }' -w "\nHTTP_STATUS:%{http_code}" -s 2>/dev/null)

HTTP_STATUS=$(echo "$CREATE_CAR_SERVICE_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$CREATE_CAR_SERVICE_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" = "201" ]; then
  CAR_SERVICE_ID=$(extract_json_id "$BODY" "_id")
  test_result "pass" "Create car service successful (ID: ${CAR_SERVICE_ID:0:8}...)"
else
  test_result "fail" "Create car service failed (Status: $HTTP_STATUS)"
  echo "Response: $BODY"
fi
echo ""

# 4.4 Create Car Service - Brake Pads
echo "4.4. Creating car service request (Brake Pads)..."
CREATE_CAR_SERVICE_2_RESPONSE=$(curl -X POST "$BASE_URL/car-services" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceType": "brake-pads",
    "vehicleDetails": {
      "make": "Honda",
      "model": "Civic",
      "year": 2018,
      "licensePlate": "BT 5678 CD"
    },
    "address": "456 Service Road, Blantyre",
    "preferredDate": "2024-12-26T14:00:00Z",
    "price": 60000,
    "notes": "Front brake pads replacement needed"
  }' -w "\nHTTP_STATUS:%{http_code}" -s 2>/dev/null)

HTTP_STATUS=$(echo "$CREATE_CAR_SERVICE_2_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$CREATE_CAR_SERVICE_2_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" = "201" ]; then
  test_result "pass" "Create second car service successful"
else
  test_result "fail" "Create second car service failed (Status: $HTTP_STATUS)"
fi
echo ""

# 4.5 Get Car Services
echo "4.5. Getting car services..."
GET_CAR_SERVICES_RESPONSE=$(curl -X GET "$BASE_URL/car-services" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -w "\nHTTP_STATUS:%{http_code}" -s 2>/dev/null)

HTTP_STATUS=$(echo "$GET_CAR_SERVICES_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$GET_CAR_SERVICES_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" = "200" ]; then
  CAR_SERVICE_COUNT=$(echo "$BODY" | grep -o "\"_id\"" | wc -l)
  test_result "pass" "Get car services successful (Found: ${CAR_SERVICE_COUNT} services)"
else
  test_result "fail" "Get car services failed (Status: $HTTP_STATUS)"
fi
echo ""

# 4.6 Get Single Car Service
if [ ! -z "$CAR_SERVICE_ID" ]; then
  echo "4.6. Getting single car service..."
  GET_CAR_SERVICE_RESPONSE=$(curl -X GET "$BASE_URL/car-services/$CAR_SERVICE_ID" \
    -H "Authorization: Bearer $CUSTOMER_TOKEN" \
    -w "\nHTTP_STATUS:%{http_code}" -s 2>/dev/null)

  HTTP_STATUS=$(echo "$GET_CAR_SERVICE_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$GET_CAR_SERVICE_RESPONSE" | sed '/HTTP_STATUS:/d')

  if [ "$HTTP_STATUS" = "200" ]; then
    test_result "pass" "Get single car service successful"
  else
    test_result "fail" "Get single car service failed (Status: $HTTP_STATUS)"
  fi
  echo ""
fi

echo "----------------------------------------"
echo ""

# ============================================
# SUMMARY
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}TESTING SUMMARY${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""
echo "Created Resources:"
echo "  - Product ID: ${PRODUCT_ID:0:24}..."
echo "  - Product ID 2: ${PRODUCT_ID_2:0:24}..."
echo "  - Order ID: ${ORDER_ID:0:24}..."
echo "  - Custom Order ID: ${CUSTOM_ORDER_ID:0:24}..."
echo "  - Towing Service ID: ${TOWING_SERVICE_ID:0:24}..."
echo "  - Car Service ID: ${CAR_SERVICE_ID:0:24}..."
echo ""
echo -e "${GREEN}Testing complete!${NC}"
echo ""
