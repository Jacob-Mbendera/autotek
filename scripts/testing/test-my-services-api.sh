#!/usr/bin/env bash
# Verifies authenticated service list payloads for My Services (towing + car-services).
# Prerequisites: backend on port 5000, jq, customer user from SERVICES_TESTING_GUIDE.md
set -euo pipefail

BASE="${API_URL:-http://localhost:5000/api}"
EMAIL="${TEST_EMAIL:-testuser@autotek.com}"
PASSWORD="${TEST_PASSWORD:-Test123456}"

echo "=== Login ($EMAIL) ==="
LOGIN=$(curl -s -S -X POST "${BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

TOKEN=$(echo "$LOGIN" | jq -r '.token // empty')
if [ -z "$TOKEN" ]; then
  echo "Login failed. Response:"
  echo "$LOGIN" | jq .
  exit 1
fi
echo "OK (token received)"
echo ""

echo "=== GET ${BASE}/towing (Bearer) — expect user-scoped list ==="
TOW=$(curl -s -S "${BASE}/towing" -H "Authorization: Bearer ${TOKEN}")
echo "$TOW" | jq 'if (.services | length) > 0 then {
  count: (.services | length),
  sample: .services[0] | {
    vehicleType,
    vehicleModel,
    assignedDriver,
    location,
    destination,
    status,
    paymentStatus,
    updatedAt,
    estimatedCost,
    price
  }
} else { count: 0, note: "no towing rows for this user" } end'
echo ""

echo "=== GET ${BASE}/car-services (Bearer) ==="
CAR=$(curl -s -S "${BASE}/car-services" -H "Authorization: Bearer ${TOKEN}")
echo "$CAR" | jq 'if (.services | length) > 0 then {
  count: (.services | length),
  sample: .services[0] | {
    vehicleType,
    vehicleModel,
    assignedMechanic,
    location,
    preferredDate,
    preferredTime,
    status,
    paymentStatus,
    updatedAt,
    estimatedCost
  }
} else { count: 0, note: "no car service rows for this user" } end'
echo ""

echo "=== GET ${BASE}/towing (no auth) — expect empty services array ==="
curl -s -S "${BASE}/towing" | jq '{ count: (.services | length) }'
echo ""

echo "=== Done ==="
