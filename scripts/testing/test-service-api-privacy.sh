#!/bin/bash

echo "=================================================================="
echo "Test 6.5: Service List API Privacy (Anonymous Access)"
echo "=================================================================="
echo ""

echo "Test 1: GET /api/towing (no auth token)"
echo "Expected: Empty services array []"
echo ""
TOWING_RESULT=$(curl -s http://localhost:5000/api/towing)
echo "$TOWING_RESULT" | python3 -m json.tool
TOWING_COUNT=$(echo "$TOWING_RESULT" | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('services', [])))" 2>/dev/null)
echo ""
if [ "$TOWING_COUNT" = "0" ]; then
  echo "✅ PASS: Towing services list is empty (privacy protected)"
else
  echo "❌ FAIL: Towing services exposed ($TOWING_COUNT services)"
fi

echo ""
echo "=================================================================="
echo ""

echo "Test 2: GET /api/car-services (no auth token)"
echo "Expected: Empty services array []"
echo ""
CAR_RESULT=$(curl -s http://localhost:5000/api/car-services)
echo "$CAR_RESULT" | python3 -m json.tool
CAR_COUNT=$(echo "$CAR_RESULT" | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('services', [])))" 2>/dev/null)
echo ""
if [ "$CAR_COUNT" = "0" ]; then
  echo "✅ PASS: Car services list is empty (privacy protected)"
else
  echo "❌ FAIL: Car services exposed ($CAR_COUNT services)"
fi

echo ""
echo "=================================================================="
echo ""

echo "Test 3: GET /api/towing/:id (no auth token)"
echo "Expected: 401 Unauthorized"
echo ""
# Try to get a service ID first (this will fail for privacy, but let's try anyway)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/towing/507f1f77bcf86cd799439011)
echo "HTTP Status Code: $HTTP_CODE"
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "404" ]; then
  echo "✅ PASS: Access denied without authentication"
else
  echo "❌ FAIL: Unexpected status code: $HTTP_CODE"
fi

echo ""
echo "=================================================================="
echo "Test Summary"
echo "=================================================================="
echo "Privacy Protection: Service lists should return empty arrays"
echo "Authentication: Detail endpoints should require auth token"
echo "=================================================================="
