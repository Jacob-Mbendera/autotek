#!/bin/bash

# PayChangu Webhook Test Script
# Tests the PayChangu webhook endpoint locally

echo "========================================="
echo "PayChangu Webhook Test Script"
echo "========================================="
echo ""

# Backend URL
BACKEND_URL="http://localhost:5000"
WEBHOOK_URL="${BACKEND_URL}/api/payments/webhook/paychangu"

echo "Testing PayChangu webhook endpoint..."
echo "URL: ${WEBHOOK_URL}"
echo ""

# Test 1: Successful Payment Webhook
echo "Test 1: Successful Payment Webhook"
echo "-----------------------------------"
curl -X POST "${WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_test_123",
    "status": "completed",
    "transactionId": "txn_test_456",
    "reference": "ORDER_test_789",
    "amount": 50000
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'

echo ""
echo ""

# Test 2: Failed Payment Webhook
echo "Test 2: Failed Payment Webhook"
echo "-------------------------------"
curl -X POST "${WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_test_999",
    "status": "failed",
    "transactionId": "txn_test_888",
    "reference": "ORDER_test_777",
    "amount": 50000
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'

echo ""
echo ""

# Test 3: Cancelled Payment Webhook
echo "Test 3: Cancelled Payment Webhook"
echo "----------------------------------"
curl -X POST "${WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_test_555",
    "status": "cancelled",
    "transactionId": "txn_test_666",
    "reference": "ORDER_test_444",
    "amount": 50000
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'

echo ""
echo ""
echo "========================================="
echo "Tests completed!"
echo "========================================="
echo ""
echo "Note: These tests will return 404 if no matching payment exists."
echo "To properly test webhooks:"
echo "1. Create a real order with PayChangu payment method"
echo "2. Get the payment transactionId from the database"
echo "3. Update the test script with the real transactionId"
echo "4. Run the test again"
echo ""
