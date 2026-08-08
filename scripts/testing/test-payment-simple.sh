#!/bin/bash

# Simple backend payment test using existing orders

echo "======================================================================"
echo "BACKEND PAYMENT INITIATION TEST"
echo "======================================================================"
echo ""

# Test 1: Guest Order Payment (create new guest order first with simple curl)
echo "TEST 1: Creating Guest Order..."
GUEST_RESPONSE=$(curl -s -X POST "http://localhost:5000/api/orders" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"product":"69a8964bec43908bd77e7d49","quantity":1,"price":261265}],"shippingAddress":{"town":"Lilongwe","landmark":"Lilongwe City Centre"},"paymentMethod":"paychangu","totalAmount":261265,"guestInfo":{"name":"Test Guest","email":"testguest@test.com","phone":"0888999111"}}')

echo "Guest order response:"
echo "$GUEST_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$GUEST_RESPONSE"
echo ""

GUEST_ORDER_ID=$(echo "$GUEST_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('order', {}).get('_id', ''))" 2>/dev/null)

if [ ! -z "$GUEST_ORDER_ID" ]; then
  echo "✅ Guest Order Created: $GUEST_ORDER_ID"
  echo ""
  echo "Testing payment initiation for GUEST order (NO AUTH TOKEN)..."
  curl -s -X POST "http://localhost:5000/api/payments/initiate" \
    -H "Content-Type: application/json" \
    -d "{\"orderId\":\"$GUEST_ORDER_ID\",\"paymentMethod\":\"paychangu\",\"phoneNumber\":\"0888999111\",\"returnUrl\":\"http://localhost:5173/success\",\"cancelUrl\":\"http://localhost:5173/cancel\"}" \
    | python3 -m json.tool 2>/dev/null

  echo ""
  if curl -s -X POST "http://localhost:5000/api/payments/initiate" \
    -H "Content-Type: application/json" \
    -d "{\"orderId\":\"$GUEST_ORDER_ID\",\"paymentMethod\":\"paychangu\",\"phoneNumber\":\"0888999111\",\"returnUrl\":\"http://localhost:5173/success\",\"cancelUrl\":\"http://localhost:5173/cancel\"}" \
    | grep -q "checkoutUrl"; then
    echo "✅ GUEST PAYMENT INITIATION: SUCCESS"
  else
    echo "❌ GUEST PAYMENT INITIATION: FAILED"
  fi
else
  echo "❌ Failed to create guest order"
fi

echo ""
echo "======================================================================"
echo ""

# Test 2: Authenticated User Payment
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWM1NDIxN2Y4YjExZmIzMDU0ZmU3NjAiLCJlbWFpbCI6InRlc3R1c2VyQHRlc3QuY29tIiwicm9sZSI6ImN1c3RvbWVyIiwiaWF0IjoxNzc0NTM1MTk1LCJleHAiOjE3NzQ3MDc5OTV9.jaNRVJ9-apGa712WU87M41H-EMvCFyKRvvJhre7fwHA"

echo "TEST 2: Creating Authenticated Order..."
AUTH_RESPONSE=$(curl -s -X POST "http://localhost:5000/api/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"items":[{"product":"69a8964bec43908bd77e7d49","quantity":1,"price":261265}],"shippingAddress":{"town":"Blantyre","landmark":"Chichiri Shopping Mall"},"paymentMethod":"paychangu","totalAmount":261265}')

echo "Authenticated order response:"
echo "$AUTH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$AUTH_RESPONSE"
echo ""

AUTH_ORDER_ID=$(echo "$AUTH_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('order', {}).get('_id', ''))" 2>/dev/null)

if [ ! -z "$AUTH_ORDER_ID" ]; then
  echo "✅ Authenticated Order Created: $AUTH_ORDER_ID"
  echo ""
  echo "Testing payment initiation for AUTHENTICATED order (WITH AUTH TOKEN)..."
  curl -s -X POST "http://localhost:5000/api/payments/initiate" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"orderId\":\"$AUTH_ORDER_ID\",\"paymentMethod\":\"paychangu\",\"phoneNumber\":\"0999123456\",\"returnUrl\":\"http://localhost:5173/success\",\"cancelUrl\":\"http://localhost:5173/cancel\"}" \
    | python3 -m json.tool 2>/dev/null

  echo ""
  if curl -s -X POST "http://localhost:5000/api/payments/initiate" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"orderId\":\"$AUTH_ORDER_ID\",\"paymentMethod\":\"paychangu\",\"phoneNumber\":\"0999123456\",\"returnUrl\":\"http://localhost:5173/success\",\"cancelUrl\":\"http://localhost:5173/cancel\"}" \
    | grep -q "checkoutUrl"; then
    echo "✅ AUTHENTICATED PAYMENT INITIATION: SUCCESS"
  else
    echo "❌ AUTHENTICATED PAYMENT INITIATION: FAILED"
  fi
else
  echo "❌ Failed to create authenticated order"
fi

echo ""
echo "======================================================================"
echo "TEST SUMMARY"
echo "======================================================================"
echo "Guest Order: $GUEST_ORDER_ID"
echo "Authenticated Order: $AUTH_ORDER_ID"
echo "======================================================================"
