#!/bin/bash

set -e

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWM1NDIxN2Y4YjExZmIzMDU0ZmU3NjAiLCJlbWFpbCI6InRlc3R1c2VyQHRlc3QuY29tIiwicm9sZSI6ImN1c3RvbWVyIiwiaWF0IjoxNzc0NTM1MTk1LCJleHAiOjE3NzQ3MDc5OTV9.jaNRVJ9-apGa712WU87M41H-EMvCFyKRvvJhre7fwHA"

echo "======================================================================"
echo "TEST 1: Guest User Payment Initiation (NO AUTH TOKEN)"
echo "======================================================================"
echo ""
echo "Step 1: Creating a guest order..."
GUEST_ORDER=$(curl -s -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"product": "69a8964bec43908bd77e7d49", "quantity": 1, "price": 261265}],
    "shippingAddress": {"town": "Lilongwe", "landmark": "Lilongwe City Centre"},
    "paymentMethod": "paychangu",
    "totalAmount": 261265,
    "guestInfo": {
      "name": "Guest Test User",
      "email": "guesttest@test.com",
      "phone": "0888123456"
    }
  }')

echo "$GUEST_ORDER" | python3 -m json.tool
GUEST_ORDER_ID=$(echo "$GUEST_ORDER" | python3 -c "import sys, json; print(json.load(sys.stdin)['order']['_id'])" 2>/dev/null || echo "")

if [ -z "$GUEST_ORDER_ID" ]; then
  echo "❌ Failed to create guest order"
  exit 1
fi

echo ""
echo "✅ Guest Order Created: $GUEST_ORDER_ID"
echo ""
echo "Step 2: Initiating payment for guest order (NO AUTH TOKEN)..."
echo ""

GUEST_PAYMENT=$(curl -s -X POST http://localhost:5000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d "{
    \"orderId\": \"$GUEST_ORDER_ID\",
    \"paymentMethod\": \"paychangu\",
    \"phoneNumber\": \"0888123456\",
    \"returnUrl\": \"http://localhost:5173/payment/success\",
    \"cancelUrl\": \"http://localhost:5173/payment/cancel\"
  }")

echo "$GUEST_PAYMENT" | python3 -m json.tool

if echo "$GUEST_PAYMENT" | grep -q "checkoutUrl"; then
  echo ""
  echo "✅ GUEST PAYMENT INITIATION SUCCESSFUL"
else
  echo ""
  echo "❌ GUEST PAYMENT INITIATION FAILED"
fi

echo ""
echo ""
echo "======================================================================"
echo "TEST 2: Authenticated User Payment Initiation (WITH AUTH TOKEN)"
echo "======================================================================"
echo ""
echo "Step 1: Creating authenticated order..."

AUTH_ORDER=$(curl -s -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "items": [{"product": "69a8964bec43908bd77e7d49", "quantity": 1, "price": 261265}],
    "shippingAddress": {"town": "Blantyre", "landmark": "Chichiri Shopping Mall"},
    "paymentMethod": "paychangu",
    "totalAmount": 261265
  }')

echo "$AUTH_ORDER" | python3 -m json.tool
AUTH_ORDER_ID=$(echo "$AUTH_ORDER" | python3 -c "import sys, json; print(json.load(sys.stdin)['order']['_id'])" 2>/dev/null || echo "")

if [ -z "$AUTH_ORDER_ID" ]; then
  echo "❌ Failed to create authenticated order"
  exit 1
fi

echo ""
echo "✅ Authenticated Order Created: $AUTH_ORDER_ID"
echo ""
echo "Step 2: Initiating payment for authenticated order (WITH AUTH TOKEN)..."
echo ""

AUTH_PAYMENT=$(curl -s -X POST http://localhost:5000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"orderId\": \"$AUTH_ORDER_ID\",
    \"paymentMethod\": \"paychangu\",
    \"phoneNumber\": \"0999123456\",
    \"returnUrl\": \"http://localhost:5173/payment/success\",
    \"cancelUrl\": \"http://localhost:5173/payment/cancel\"
  }")

echo "$AUTH_PAYMENT" | python3 -m json.tool

if echo "$AUTH_PAYMENT" | grep -q "checkoutUrl"; then
  echo ""
  echo "✅ AUTHENTICATED PAYMENT INITIATION SUCCESSFUL"
else
  echo ""
  echo "❌ AUTHENTICATED PAYMENT INITIATION FAILED"
fi

echo ""
echo "======================================================================"
echo "SUMMARY"
echo "======================================================================"
echo "Guest Order ID: $GUEST_ORDER_ID"
echo "Authenticated Order ID: $AUTH_ORDER_ID"
echo "======================================================================"
