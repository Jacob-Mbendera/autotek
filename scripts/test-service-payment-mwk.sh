#!/usr/bin/env bash
# Tests POST /api/payments/initiate for service payments (MWK / zero-price behavior).
# Run with backend on port 5000. Requires jq.
set -euo pipefail

BASE="${API_URL:-http://localhost:5000/api}"
EMAIL="${TEST_EMAIL:-testuser@autotek.com}"
PASSWORD="${TEST_PASSWORD:-Test123456}"

echo "=== 1) Login ==="
LOGIN=$(curl -s -S -X POST "${BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")
TOKEN=$(echo "$LOGIN" | jq -r '.token // empty')
if [ -z "$TOKEN" ]; then
  echo "Login failed:"
  echo "$LOGIN" | jq .
  exit 1
fi
echo "OK"

echo ""
echo "=== 2) Find a towing or car service with no price (estimatedCost null/0) ==="
TOW=$(curl -s -S "${BASE}/towing" -H "Authorization: Bearer ${TOKEN}")
CAR=$(curl -s -S "${BASE}/car-services" -H "Authorization: Bearer ${TOKEN}")

ZERO_TOW=$(echo "$TOW" | jq -r '[.services[] | select(.estimatedCost == null or .estimatedCost == 0)] | .[0]._id // empty')
ZERO_CAR=$(echo "$CAR" | jq -r '[.services[] | select(.estimatedCost == null or .estimatedCost == 0)] | .[0]._id // empty')

if [ -n "$ZERO_TOW" ] && [ "$ZERO_TOW" != "null" ]; then
  echo "Using zero-price towing id: $ZERO_TOW"
  echo "=== 3) POST payments/initiate (expect HTTP 400 + MWK message) ==="
  RESP=$(curl -s -S -w "\n%{http_code}" -X POST "${BASE}/payments/initiate" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"paymentMethod\":\"paychangu\",\"towingServiceId\":\"${ZERO_TOW}\"}")
elif [ -n "$ZERO_CAR" ] && [ "$ZERO_CAR" != "null" ]; then
  echo "Using zero-price car service id: $ZERO_CAR"
  echo "=== 3) POST payments/initiate (expect HTTP 400 + MWK message) ==="
  RESP=$(curl -s -S -w "\n%{http_code}" -X POST "${BASE}/payments/initiate" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"paymentMethod\":\"paychangu\",\"carServiceId\":\"${ZERO_CAR}\"}")
else
  echo "No existing zero-price service; creating minimal towing (no price) for this test."
  CREATE=$(curl -s -S -X POST "${BASE}/towing" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"pickupLocation\":\"MWK test pickup $(date +%s)\",\"destination\":\"MWK test destination\"}")
  NEW_ID=$(echo "$CREATE" | jq -r '.service._id // empty')
  if [ -z "$NEW_ID" ] || [ "$NEW_ID" = "null" ]; then
    echo "Failed to create towing:"
    echo "$CREATE" | jq .
    exit 1
  fi
  echo "Using new towing id: $NEW_ID"
  echo "=== 3) POST payments/initiate (expect HTTP 400 + MWK message) ==="
  RESP=$(curl -s -S -w "\n%{http_code}" -X POST "${BASE}/payments/initiate" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"paymentMethod\":\"paychangu\",\"towingServiceId\":\"${NEW_ID}\"}")
fi

HTTP=$(echo "$RESP" | tail -n1)
BODY=$(echo "$RESP" | sed '$d')
echo "HTTP status: $HTTP"
echo "$BODY" | jq .

if [ "$HTTP" != "400" ]; then
  echo ""
  echo "FAIL: Expected HTTP 400 for zero-amount service payment; got $HTTP"
  exit 1
fi
MSG=$(echo "$BODY" | jq -r '.message // empty')
if [[ "$MSG" != *"MWK"* ]]; then
  echo "FAIL: Expected MWK in error message; got: $MSG"
  exit 1
fi
echo ""
echo "PASS: 400 with MWK / quote message for service payment without price."
