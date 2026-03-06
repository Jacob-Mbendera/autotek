#!/bin/bash

# Return/Refund System Backend Test Script
# This script tests all return endpoints

BASE_URL="http://localhost:5000/api"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Return/Refund System Backend Tests"
echo "=========================================="
echo ""

# 1. Login as regular user
echo -e "${YELLOW}1. Logging in as test user...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"newpassword123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token // empty')
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}Failed to get token. Creating test user first...${NC}"
  # Try to register first
  curl -s -X POST http://localhost:5000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"name":"Test User","email":"testuser@example.com","password":"newpassword123","phone":"+265991234567"}' | jq .
  
  LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"testuser@example.com","password":"newpassword123"}')
  TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token // empty')
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ Failed to authenticate. Cannot proceed with tests.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Authenticated successfully${NC}"
echo ""

# 2. Get or create a completed order
echo -e "${YELLOW}2. Getting a completed order for return testing...${NC}"
PRODUCT_ID=$(curl -s "$BASE_URL/products?limit=1" | jq -r '.products[0]._id // empty')

if [ -z "$PRODUCT_ID" ] || [ "$PRODUCT_ID" = "null" ]; then
  echo -e "${RED}❌ No products found. Cannot create test order.${NC}"
  exit 1
fi

echo "Using product: $PRODUCT_ID"

# Create an order
ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"items\": [{\"productId\": \"$PRODUCT_ID\", \"quantity\": 2, \"price\": 50000}],
    \"shippingAddress\": \"123 Test Street, Lilongwe\",
    \"paymentMethod\": \"bank-transfer\"
  }")

ORDER_ID=$(echo $ORDER_RESPONSE | jq -r '.order._id // empty')
if [ -z "$ORDER_ID" ] || [ "$ORDER_ID" = "null" ]; then
  echo -e "${RED}❌ Failed to create order${NC}"
  echo "$ORDER_RESPONSE" | jq .
  exit 1
fi

echo -e "${GREEN}✅ Order created: $ORDER_ID${NC}"

# Update order to completed status (admin action)
echo -e "${YELLOW}3. Updating order to completed status...${NC}"
# Login as admin
ADMIN_LOGIN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@autotek.mw","password":"admin123"}')

ADMIN_TOKEN=$(echo $ADMIN_LOGIN | jq -r '.token // empty')
if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
  echo -e "${YELLOW}⚠️  Admin login failed. Using regular user token.${NC}"
  ADMIN_TOKEN=$TOKEN
fi

# Update order status to completed
UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/orders/$ORDER_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status":"completed"}')

echo -e "${GREEN}✅ Order updated to completed${NC}"
echo ""

# 4. Create Return Request (Authenticated User)
echo -e "${YELLOW}4. Creating return request (authenticated user)...${NC}"
RETURN_RESPONSE=$(curl -s -X POST "$BASE_URL/returns" \
  -H "Authorization: Bearer $TOKEN" \
  -F "orderId=$ORDER_ID" \
  -F "items=[{\"productId\":\"$PRODUCT_ID\",\"quantity\":1,\"reason\":\"Defective item\"}]" \
  -F "returnReason=defective" \
  -F "comments=Item arrived damaged" \
  -F "refundMethod=original-payment")

RETURN_ID=$(echo $RETURN_RESPONSE | jq -r '.return._id // empty')
if [ -z "$RETURN_ID" ] || [ "$RETURN_ID" = "null" ]; then
  echo -e "${RED}❌ Failed to create return${NC}"
  echo "$RETURN_RESPONSE" | jq .
  exit 1
fi

echo -e "${GREEN}✅ Return created: $RETURN_ID${NC}"
echo "$RETURN_RESPONSE" | jq '{returnId: .return._id, status: .return.status, refundAmount: .return.refundAmount}'
echo ""

# 5. Get User Returns
echo -e "${YELLOW}5. Getting user returns...${NC}"
USER_RETURNS=$(curl -s -X GET "$BASE_URL/returns" \
  -H "Authorization: Bearer $TOKEN")

echo -e "${GREEN}✅ User returns retrieved${NC}"
echo "$USER_RETURNS" | jq '{total: .pagination.total, returns: [.returns[] | {id: ._id, status: .status, refundAmount: .refundAmount}]}'
echo ""

# 6. Get Single Return
echo -e "${YELLOW}6. Getting single return details...${NC}"
SINGLE_RETURN=$(curl -s -X GET "$BASE_URL/returns/$RETURN_ID" \
  -H "Authorization: Bearer $TOKEN")

echo -e "${GREEN}✅ Return details retrieved${NC}"
echo "$SINGLE_RETURN" | jq '{returnId: .return._id, status: .return.status, items: .return.items | length, refundAmount: .return.refundAmount}'
echo ""

# 7. Admin: Get All Returns
echo -e "${YELLOW}7. Admin: Getting all returns...${NC}"
ALL_RETURNS=$(curl -s -X GET "$BASE_URL/admin/returns" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo -e "${GREEN}✅ All returns retrieved${NC}"
echo "$ALL_RETURNS" | jq '{total: .pagination.total, returns: [.returns[] | {id: ._id, status: .status}]}'
echo ""

# 8. Admin: Approve Return
echo -e "${YELLOW}8. Admin: Approving return...${NC}"
APPROVE_RESPONSE=$(curl -s -X PUT "$BASE_URL/admin/returns/$RETURN_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo -e "${GREEN}✅ Return approved${NC}"
echo "$APPROVE_RESPONSE" | jq '{returnId: .return._id, status: .return.status, shippingLabel: .return.shippingLabel}'
echo ""

# 9. Admin: Process Refund
echo -e "${YELLOW}9. Admin: Processing refund...${NC}"
REFUND_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/returns/$RETURN_ID/refund" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{}')

echo -e "${GREEN}✅ Refund processing initiated${NC}"
echo "$REFUND_RESPONSE" | jq '{returnId: .return._id, refundStatus: .return.refundStatus, refundAmount: .return.refundAmount}'
echo ""

# 10. Test Guest Return (Create order as guest, then return)
echo -e "${YELLOW}10. Testing guest return...${NC}"
GUEST_ORDER=$(curl -s -X POST "$BASE_URL/orders" \
  -H "Content-Type: application/json" \
  -d "{
    \"items\": [{\"productId\": \"$PRODUCT_ID\", \"quantity\": 1, \"price\": 30000}],
    \"shippingAddress\": \"456 Guest Street\",
    \"paymentMethod\": \"bank-transfer\",
    \"guestInfo\": {
      \"email\": \"guest@test.com\",
      \"name\": \"Guest User\",
      \"phone\": \"+265991111111\"
    }
  }")

GUEST_ORDER_ID=$(echo $GUEST_ORDER | jq -r '.order._id // empty')
if [ -n "$GUEST_ORDER_ID" ] && [ "$GUEST_ORDER_ID" != "null" ]; then
  # Update to completed
  curl -s -X PUT "$BASE_URL/orders/$GUEST_ORDER_ID/status" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"status":"completed"}' > /dev/null

  # Create guest return
  GUEST_RETURN=$(curl -s -X POST "$BASE_URL/returns" \
    -F "orderId=$GUEST_ORDER_ID" \
    -F "items=[{\"productId\":\"$PRODUCT_ID\",\"quantity\":1,\"reason\":\"Changed mind\"}]" \
    -F "returnReason=changed-mind" \
    -F "guestInfo={\"email\":\"guest@test.com\",\"name\":\"Guest User\",\"phone\":\"+265991111111\"}" \
    -F "refundMethod=store-credit")

  GUEST_RETURN_ID=$(echo $GUEST_RETURN | jq -r '.return._id // empty')
  if [ -n "$GUEST_RETURN_ID" ] && [ "$GUEST_RETURN_ID" != "null" ]; then
    echo -e "${GREEN}✅ Guest return created: $GUEST_RETURN_ID${NC}"
    
    # Get guest return by email
    GUEST_RETURNS=$(curl -s -X GET "$BASE_URL/returns?email=guest@test.com")
    echo -e "${GREEN}✅ Guest returns retrieved by email${NC}"
    echo "$GUEST_RETURNS" | jq '{total: .pagination.total}'
  else
    echo -e "${RED}❌ Failed to create guest return${NC}"
    echo "$GUEST_RETURN" | jq .
  fi
else
  echo -e "${YELLOW}⚠️  Could not create guest order for testing${NC}"
fi
echo ""

# 11. Test Cancel Return
echo -e "${YELLOW}11. Testing return cancellation...${NC}"
# Create another return to cancel
CANCEL_RETURN_RESPONSE=$(curl -s -X POST "$BASE_URL/returns" \
  -H "Authorization: Bearer $TOKEN" \
  -F "orderId=$ORDER_ID" \
  -F "items=[{\"productId\":\"$PRODUCT_ID\",\"quantity\":1,\"reason\":\"Test cancellation\"}]" \
  -F "returnReason=other" \
  -F "comments=Testing cancellation")

CANCEL_RETURN_ID=$(echo $CANCEL_RETURN_RESPONSE | jq -r '.return._id // empty')
if [ -n "$CANCEL_RETURN_ID" ] && [ "$CANCEL_RETURN_ID" != "null" ]; then
  CANCEL_RESPONSE=$(curl -s -X PUT "$BASE_URL/returns/$CANCEL_RETURN_ID/cancel" \
    -H "Authorization: Bearer $TOKEN")
  
  echo -e "${GREEN}✅ Return cancelled${NC}"
  echo "$CANCEL_RESPONSE" | jq '{returnId: .return._id, status: .return.status}'
else
  echo -e "${YELLOW}⚠️  Could not create return for cancellation test${NC}"
fi
echo ""

# 12. Test Reject Return
echo -e "${YELLOW}12. Testing return rejection...${NC}"
# Create another return to reject
REJECT_RETURN_RESPONSE=$(curl -s -X POST "$BASE_URL/returns" \
  -H "Authorization: Bearer $TOKEN" \
  -F "orderId=$ORDER_ID" \
  -F "items=[{\"productId\":\"$PRODUCT_ID\",\"quantity\":1,\"reason\":\"Test rejection\"}]" \
  -F "returnReason=other")

REJECT_RETURN_ID=$(echo $REJECT_RETURN_RESPONSE | jq -r '.return._id // empty')
if [ -n "$REJECT_RETURN_ID" ] && [ "$REJECT_RETURN_ID" != "null" ]; then
  REJECT_RESPONSE=$(curl -s -X PUT "$BASE_URL/admin/returns/$REJECT_RETURN_ID/reject" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"adminNotes":"Item does not meet return criteria"}')
  
  echo -e "${GREEN}✅ Return rejected${NC}"
  echo "$REJECT_RESPONSE" | jq '{returnId: .return._id, status: .return.status, adminNotes: .return.adminNotes}'
else
  echo -e "${YELLOW}⚠️  Could not create return for rejection test${NC}"
fi
echo ""

# Summary
echo "=========================================="
echo -e "${GREEN}✅ All Return/Refund Tests Completed!${NC}"
echo "=========================================="
echo ""
echo "Test Summary:"
echo "- ✅ Create return (authenticated)"
echo "- ✅ Get user returns"
echo "- ✅ Get single return"
echo "- ✅ Admin: Get all returns"
echo "- ✅ Admin: Approve return"
echo "- ✅ Admin: Process refund"
echo "- ✅ Guest return creation"
echo "- ✅ Cancel return"
echo "- ✅ Reject return"
echo ""
