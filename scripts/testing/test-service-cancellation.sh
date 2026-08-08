#!/bin/bash

echo "=== TESTING SERVICE CANCELLATION ==="
echo ""

# 1. Login
echo "1. Logging in..."
LOGIN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "customer@test.com", "password": "Test123456"}')

TOKEN=$(echo $LOGIN | jq -r '.token')
echo "✅ Logged in"
echo ""

# 2. Get user's first towing service
echo "2. Getting user's towing services..."
SERVICES=$(curl -s -X GET http://localhost:5000/api/towing \
  -H "Authorization: Bearer $TOKEN")

SERVICE_ID=$(echo $SERVICES | jq -r '.services[0]._id')
SERVICE_STATUS=$(echo $SERVICES | jq -r '.services[0].status')

echo "Service ID: $SERVICE_ID"
echo "Current Status: $SERVICE_STATUS"
echo ""

# 3. Test cancellation
echo "3. Attempting to cancel service..."
CANCEL_RESPONSE=$(curl -s -X PUT "http://localhost:5000/api/towing/$SERVICE_ID/cancel" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN")

echo $CANCEL_RESPONSE | jq '.'
echo ""

# 4. Verify service was cancelled
echo "4. Verifying cancellation..."
VERIFY=$(curl -s -X GET "http://localhost:5000/api/towing/$SERVICE_ID" \
  -H "Authorization: Bearer $TOKEN")

NEW_STATUS=$(echo $VERIFY | jq -r '.service.status')
echo "New Status: $NEW_STATUS"
echo ""

if [ "$NEW_STATUS" = "cancelled" ]; then
  echo "✅ SERVICE CANCELLATION TEST PASSED"
else
  echo "❌ SERVICE CANCELLATION TEST FAILED"
fi

echo ""
echo "=== TEST COMPLETE ==="
