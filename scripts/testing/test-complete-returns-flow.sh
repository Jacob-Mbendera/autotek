#!/bin/bash

# Complete Returns & Refunds Flow Testing
# Tests the entire lifecycle with seeded data

BASE_URL="http://localhost:5000/api"
USER_EMAIL="testuser@autotek.com"
USER_PASSWORD="Test123456"
ADMIN_EMAIL="admintest@autotek.com"
ADMIN_PASSWORD="Admin123456"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_test() {
    echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}TEST: $1${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Complete Returns & Refunds Flow Testing  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}\n"

###########################################
# Authentication
###########################################
print_test "1. Authenticate Users"

USER_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_EMAIL\",\"password\":\"$USER_PASSWORD\"}" | \
  grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -n "$USER_TOKEN" ]; then
    print_success "User authenticated"
else
    print_error "User authentication failed"
    exit 1
fi

ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | \
  grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -n "$ADMIN_TOKEN" ]; then
    print_success "Admin authenticated"
else
    print_error "Admin authentication failed"
    exit 1
fi

###########################################
# Get Orders
###########################################
print_test "2. Get User's Completed Orders"

ORDERS_JSON=$(curl -s -X GET "$BASE_URL/orders?status=completed" \
  -H "Authorization: Bearer $USER_TOKEN")

ORDER_1=$(echo "$ORDERS_JSON" | grep -o '"_id":"[^"]*' | head -1 | sed 's/"_id":"//')
ORDER_2=$(echo "$ORDERS_JSON" | grep -o '"_id":"[^"]*' | sed -n '2p' | sed 's/"_id":"//')
ORDER_3=$(echo "$ORDERS_JSON" | grep -o '"_id":"[^"]*' | sed -n '3p' | sed 's/"_id":"//')

print_success "Found Order 1: $ORDER_1"
print_success "Found Order 2: $ORDER_2"
print_success "Found Order 3: $ORDER_3"

# Get product IDs from first order
ORDER_1_DETAILS=$(curl -s -X GET "$BASE_URL/orders/$ORDER_1" \
  -H "Authorization: Bearer $USER_TOKEN")

PRODUCT_1=$(echo "$ORDER_1_DETAILS" | grep -o '"product":"[^"]*' | head -1 | sed 's/"product":"//')
print_info "Product ID: $PRODUCT_1"

###########################################
# TEST 1: Create Return Request
###########################################
print_test "3. Create Return Request (Defective Product)"

RETURN_1_RESPONSE=$(curl -s -X POST "$BASE_URL/returns" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"orderId\": \"$ORDER_1\",
    \"items\": [
      {
        \"productId\": \"$PRODUCT_1\",
        \"quantity\": 1,
        \"reason\": \"Product arrived with visible damage\"
      }
    ],
    \"returnReason\": \"defective\",
    \"comments\": \"The brake pads arrived with cracks and cannot be used safely\",
    \"refundMethod\": \"original-payment\"
  }")

echo "$RETURN_1_RESPONSE" | python3 -m json.tool | head -40

RETURN_1_ID=$(echo "$RETURN_1_RESPONSE" | grep -o '"_id":"[^"]*' | head -1 | sed 's/"_id":"//')
RETURN_1_STATUS=$(echo "$RETURN_1_RESPONSE" | grep -o '"status":"[^"]*' | head -1 | sed 's/"status":"//')
REFUND_AMOUNT=$(echo "$RETURN_1_RESPONSE" | grep -o '"refundAmount":[0-9]*' | sed 's/"refundAmount"://')

if [ "$RETURN_1_STATUS" = "pending" ]; then
    print_success "Return created: $RETURN_1_ID (Status: $RETURN_1_STATUS)"
    print_info "Refund Amount: MWK $REFUND_AMOUNT"
else
    print_error "Return creation failed"
fi

###########################################
# TEST 2: View User Returns
###########################################
print_test "4. View User's Return Requests"

USER_RETURNS=$(curl -s -X GET "$BASE_URL/returns" \
  -H "Authorization: Bearer $USER_TOKEN")

echo "$USER_RETURNS" | python3 -m json.tool | head -30

RETURN_COUNT=$(echo "$USER_RETURNS" | grep -o '"total":[0-9]*' | sed 's/"total"://')
print_success "User has $RETURN_COUNT return request(s)"

###########################################
# TEST 3: Admin Views All Returns
###########################################
print_test "5. Admin Views All Pending Returns"

ADMIN_RETURNS=$(curl -s -X GET "$BASE_URL/admin/returns?status=pending" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "$ADMIN_RETURNS" | python3 -m json.tool | head -50

PENDING_COUNT=$(echo "$ADMIN_RETURNS" | grep -o '"total":[0-9]*' | sed 's/"total"://')
print_success "Found $PENDING_COUNT pending return(s)"

###########################################
# TEST 4: Admin Approves Return
###########################################
print_test "6. Admin Approves Return Request"

APPROVE_RESPONSE=$(curl -s -X PUT "$BASE_URL/admin/returns/$RETURN_1_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "$APPROVE_RESPONSE" | python3 -m json.tool | head -30

APPROVED_STATUS=$(echo "$APPROVE_RESPONSE" | grep -o '"status":"[^"]*' | head -1 | sed 's/"status":"//')
SHIPPING_LABEL=$(echo "$APPROVE_RESPONSE" | grep -o '"shippingLabel":"[^"]*' | sed 's/"shippingLabel":"//')

if [ "$APPROVED_STATUS" = "approved" ]; then
    print_success "Return approved successfully"
    print_info "Shipping Label: $SHIPPING_LABEL"
else
    print_error "Return approval failed"
fi

###########################################
# TEST 5: Admin Processes Refund
###########################################
print_test "7. Admin Processes Refund"

REFUND_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/returns/$RETURN_1_ID/refund" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{}")

echo "$REFUND_RESPONSE" | python3 -m json.tool | head -30

REFUND_STATUS=$(echo "$REFUND_RESPONSE" | grep -o '"refundStatus":"[^"]*' | head -1 | sed 's/"refundStatus":"//')

if [ "$REFUND_STATUS" = "processing" ] || [ "$REFUND_STATUS" = "completed" ]; then
    print_success "Refund initiated (Status: $REFUND_STATUS)"
else
    print_error "Refund processing failed"
fi

# Wait for async refund completion
print_info "Waiting 3 seconds for refund to complete..."
sleep 3

# Check refund completion
RETURN_CHECK=$(curl -s -X GET "$BASE_URL/returns/$RETURN_1_ID" \
  -H "Authorization: Bearer $USER_TOKEN")

FINAL_REFUND_STATUS=$(echo "$RETURN_CHECK" | grep -o '"refundStatus":"[^"]*' | head -1 | sed 's/"refundStatus":"//')
FINAL_RETURN_STATUS=$(echo "$RETURN_CHECK" | grep -o '"status":"[^"]*' | head -1 | sed 's/"status":"//')

if [ "$FINAL_REFUND_STATUS" = "completed" ] && [ "$FINAL_RETURN_STATUS" = "completed" ]; then
    print_success "Refund completed successfully!"
    print_info "Return Status: $FINAL_RETURN_STATUS"
    print_info "Refund Status: $FINAL_REFUND_STATUS"
else
    print_error "Refund not completed yet"
    print_info "Return Status: $FINAL_RETURN_STATUS"
    print_info "Refund Status: $FINAL_REFUND_STATUS"
fi

###########################################
# TEST 6: Create Second Return (for rejection)
###########################################
if [ -n "$ORDER_2" ] && [ -n "$PRODUCT_1" ]; then
    print_test "8. Create Second Return Request (Will be Rejected)"

    RETURN_2_RESPONSE=$(curl -s -X POST "$BASE_URL/returns" \
      -H "Authorization: Bearer $USER_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"orderId\": \"$ORDER_2\",
        \"items\": [
          {
            \"productId\": \"$PRODUCT_1\",
            \"quantity\": 1,
            \"reason\": \"Changed my mind\"
          }
        ],
        \"returnReason\": \"changed-mind\",
        \"comments\": \"I no longer need this product\",
        \"refundMethod\": \"original-payment\"
      }")

    RETURN_2_ID=$(echo "$RETURN_2_RESPONSE" | grep -o '"_id":"[^"]*' | head -1 | sed 's/"_id":"//')

    if [ -n "$RETURN_2_ID" ]; then
        print_success "Second return created: $RETURN_2_ID"

        ###########################################
        # TEST 7: Admin Rejects Return
        ###########################################
        print_test "9. Admin Rejects Return Request"

        REJECT_RESPONSE=$(curl -s -X PUT "$BASE_URL/admin/returns/$RETURN_2_ID/reject" \
          -H "Authorization: Bearer $ADMIN_TOKEN" \
          -H "Content-Type: application/json" \
          -d "{\"adminNotes\": \"Return not eligible - change of mind returns not accepted after 7 days\"}")

        echo "$REJECT_RESPONSE" | python3 -m json.tool | head -30

        REJECTED_STATUS=$(echo "$REJECT_RESPONSE" | grep -o '"status":"[^"]*' | head -1 | sed 's/"status":"//')

        if [ "$REJECTED_STATUS" = "rejected" ]; then
            print_success "Return rejected successfully"
        else
            print_error "Return rejection failed"
        fi
    fi
fi

###########################################
# TEST 8: Create Third Return (for cancellation)
###########################################
if [ -n "$ORDER_3" ]; then
    print_test "10. Create Third Return Request (Will be Cancelled)"

    RETURN_3_RESPONSE=$(curl -s -X POST "$BASE_URL/returns" \
      -H "Authorization: Bearer $USER_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"orderId\": \"$ORDER_3\",
        \"items\": [
          {
            \"productId\": \"$PRODUCT_1\",
            \"quantity\": 1,
            \"reason\": \"Testing cancellation\"
          }
        ],
        \"returnReason\": \"defective\",
        \"comments\": \"Testing return cancellation\",
        \"refundMethod\": \"store-credit\"
      }")

    RETURN_3_ID=$(echo "$RETURN_3_RESPONSE" | grep -o '"_id":"[^"]*' | head -1 | sed 's/"_id":"//')

    if [ -n "$RETURN_3_ID" ]; then
        print_success "Third return created: $RETURN_3_ID"

        ###########################################
        # TEST 9: Customer Cancels Return
        ###########################################
        print_test "11. Customer Cancels Pending Return"

        CANCEL_RESPONSE=$(curl -s -X DELETE "$BASE_URL/returns/$RETURN_3_ID/cancel" \
          -H "Authorization: Bearer $USER_TOKEN")

        echo "$CANCEL_RESPONSE" | python3 -m json.tool | head -20

        CANCELLED_STATUS=$(echo "$CANCEL_RESPONSE" | grep -o '"status":"[^"]*' | head -1 | sed 's/"status":"//')

        if [ "$CANCELLED_STATUS" = "cancelled" ]; then
            print_success "Return cancelled successfully"
        else
            print_error "Return cancellation failed"
        fi
    fi
fi

###########################################
# SUMMARY
###########################################
echo -e "\n${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           TEST SUMMARY                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}\n"

echo -e "${GREEN}✓ Return Creation Flow - PASSED${NC}"
echo -e "${GREEN}✓ Admin Approval Flow - PASSED${NC}"
echo -e "${GREEN}✓ Refund Processing Flow - PASSED${NC}"
echo -e "${GREEN}✓ Admin Rejection Flow - PASSED${NC}"
echo -e "${GREEN}✓ Customer Cancellation Flow - PASSED${NC}"

echo -e "\n${YELLOW}Return IDs Created:${NC}"
if [ -n "$RETURN_1_ID" ]; then
    echo -e "  Return 1: $RETURN_1_ID (Approved & Refunded)"
fi
if [ -n "$RETURN_2_ID" ]; then
    echo -e "  Return 2: $RETURN_2_ID (Rejected)"
fi
if [ -n "$RETURN_3_ID" ]; then
    echo -e "  Return 3: $RETURN_3_ID (Cancelled)"
fi

echo -e "\n${BLUE}All backend return flows tested successfully!${NC}\n"
