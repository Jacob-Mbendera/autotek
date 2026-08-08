#!/bin/bash

# Frontend Admin Testing Script
# This script helps test the admin frontend functionality

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:5000"
FRONTEND_URL="http://localhost:5173"
ADMIN_EMAIL="admin@autotek.com"
ADMIN_PASSWORD="Admin123456"

echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}Frontend Admin Testing Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check if server is running
check_server() {
    local url=$1
    local name=$2
    
    if curl -s --head --request GET "$url" | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✓${NC} $name is running at $url"
        return 0
    else
        echo -e "${RED}✗${NC} $name is not running at $url"
        return 1
    fi
}

# Function to test API endpoint
test_api_endpoint() {
    local endpoint=$1
    local token=$2
    local name=$3
    
    if [ -z "$token" ]; then
        echo -e "${YELLOW}⚠${NC} No token available, skipping $name"
        return 1
    fi
    
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$BACKEND_URL$endpoint" \
        -H "Authorization: Bearer $token")
    
    http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_STATUS:/d')
    
    if [ "$http_status" = "200" ]; then
        echo -e "${GREEN}✓${NC} $name - Status: $http_status"
        return 0
    else
        echo -e "${RED}✗${NC} $name - Status: $http_status"
        echo "$body" | head -5
        return 1
    fi
}

# Step 1: Check if servers are running
echo -e "${YELLOW}Step 1: Checking Servers${NC}"
echo "----------------------------------------"
check_server "$BACKEND_URL/api/products" "Backend"
check_server "$FRONTEND_URL" "Frontend"
echo ""

# Step 2: Get admin token
echo -e "${YELLOW}Step 2: Admin Authentication${NC}"
echo "----------------------------------------"
echo "Logging in as admin..."

LOGIN_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BACKEND_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$ADMIN_EMAIL\",
        \"password\": \"$ADMIN_PASSWORD\"
    }")

HTTP_STATUS=$(echo "$LOGIN_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$LOGIN_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" = "200" ]; then
    ADMIN_TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    ADMIN_USER=$(echo "$BODY" | grep -o '"name":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✓${NC} Admin login successful"
    echo -e "   User: $ADMIN_USER"
    echo -e "   Token: ${ADMIN_TOKEN:0:50}..."
    echo "$ADMIN_TOKEN" > /tmp/admin_token.txt
else
    echo -e "${RED}✗${NC} Admin login failed"
    echo "$BODY"
    exit 1
fi
echo ""

# Step 3: Test Backend API Endpoints (that frontend uses)
echo -e "${YELLOW}Step 3: Testing Backend API Endpoints${NC}"
echo "----------------------------------------"

test_api_endpoint "/api/admin/stats" "$ADMIN_TOKEN" "Admin Stats"
test_api_endpoint "/api/admin/users?page=1&limit=5" "$ADMIN_TOKEN" "Admin Users"
test_api_endpoint "/api/admin/orders?page=1&limit=5" "$ADMIN_TOKEN" "Admin Orders"
test_api_endpoint "/api/admin/services?page=1&limit=5" "$ADMIN_TOKEN" "Admin Services"
test_api_endpoint "/api/admin/custom-orders?page=1&limit=5" "$ADMIN_TOKEN" "Admin Custom Orders"
test_api_endpoint "/api/products?page=1&limit=5" "$ADMIN_TOKEN" "Products (for admin)"
echo ""

# Step 4: Frontend URL Testing Guide
echo -e "${YELLOW}Step 4: Frontend Testing URLs${NC}"
echo "----------------------------------------"
echo "Open these URLs in your browser to test the frontend:"
echo ""
echo -e "${GREEN}1. Login Page:${NC}"
echo "   $FRONTEND_URL/login"
echo "   Credentials: $ADMIN_EMAIL / $ADMIN_PASSWORD"
echo ""
echo -e "${GREEN}2. Admin Dashboard:${NC}"
echo "   $FRONTEND_URL/admin/dashboard"
echo "   - Check KPI cards display correctly"
echo "   - Verify charts render"
echo "   - Check pending actions list"
echo ""
echo -e "${GREEN}3. Admin Products:${NC}"
echo "   $FRONTEND_URL/admin/products"
echo "   - Test product list display"
echo "   - Test search functionality"
echo "   - Test filters (category, status)"
echo "   - Test pagination"
echo "   - Test create/edit/delete product"
echo ""
echo -e "${GREEN}4. Admin Orders:${NC}"
echo "   $FRONTEND_URL/admin/orders"
echo "   - Test orders list display"
echo "   - Test status filters"
echo "   - Test date range filters"
echo "   - Test order details view"
echo "   - Test status updates"
echo ""
echo -e "${GREEN}5. Admin Services:${NC}"
echo "   $FRONTEND_URL/admin/services"
echo "   - Test services list display"
echo "   - Test type filters (towing, car-service)"
echo "   - Test status filters"
echo "   - Test service details view"
echo "   - Test status updates"
echo ""
echo -e "${GREEN}6. Admin Custom Orders:${NC}"
echo "   $FRONTEND_URL/admin/custom-orders"
echo "   - Test custom orders list display"
echo "   - Test status filters"
echo "   - Test custom order details view"
echo "   - Test status updates"
echo ""
echo -e "${GREEN}7. Admin Users:${NC}"
echo "   $FRONTEND_URL/admin/users"
echo "   - Test users list display"
echo "   - Test role filters"
echo "   - Test search functionality"
echo "   - Test user details view"
echo "   - Test role updates"
echo ""
echo ""

# Step 5: Browser Console Check
echo -e "${YELLOW}Step 5: Browser Console Testing${NC}"
echo "----------------------------------------"
echo "While testing in browser, check for:"
echo "  - Console errors (F12 → Console tab)"
echo "  - Network errors (F12 → Network tab)"
echo "  - React errors (if any)"
echo "  - API call failures"
echo ""

# Step 6: Manual Testing Checklist
echo -e "${YELLOW}Step 6: Manual Testing Checklist${NC}"
echo "----------------------------------------"
echo "Use this checklist while testing:"
echo ""
echo "Navigation:"
echo "  [ ] Admin sidebar navigation works"
echo "  [ ] Active route is highlighted"
echo "  [ ] All routes are accessible"
echo "  [ ] Logout works correctly"
echo ""
echo "Dashboard:"
echo "  [ ] All KPI cards display correct numbers"
echo "  [ ] Charts render and are interactive"
echo "  [ ] Pending actions list displays"
echo "  [ ] No console errors"
echo ""
echo "Products:"
echo "  [ ] Product list loads"
echo "  [ ] Search works"
echo "  [ ] Filters work"
echo "  [ ] Pagination works"
echo "  [ ] Create product works"
echo "  [ ] Edit product works"
echo "  [ ] Delete product works"
echo "  [ ] Form validation works"
echo ""
echo "Orders:"
echo "  [ ] Orders list loads"
echo "  [ ] Filters work"
echo "  [ ] Order details display correctly"
echo "  [ ] Status updates work"
echo ""
echo "Services:"
echo "  [ ] Services list loads"
echo "  [ ] Both towing and car services display"
echo "  [ ] Filters work"
echo "  [ ] Service details display correctly"
echo "  [ ] Status updates work"
echo ""
echo "Custom Orders:"
echo "  [ ] Custom orders list loads"
echo "  [ ] Filters work"
echo "  [ ] Order details display correctly"
echo "  [ ] Status updates work"
echo ""
echo "Users:"
echo "  [ ] Users list loads"
echo "  [ ] Role filters work"
echo "  [ ] Search works"
echo "  [ ] User details display correctly"
echo "  [ ] Role updates work"
echo ""
echo "UI/UX:"
echo "  [ ] Responsive design works (test mobile/tablet)"
echo "  [ ] Loading states display"
echo "  [ ] Error messages are clear"
echo "  [ ] Success messages display"
echo "  [ ] No layout breaks"
echo ""

# Step 7: Generate Test Report
echo -e "${YELLOW}Step 7: Test Report${NC}"
echo "----------------------------------------"
echo "After testing, document:"
echo "  - Any bugs found"
echo "  - Console errors"
echo "  - API failures"
echo "  - UI/UX issues"
echo "  - Performance issues"
echo ""
echo "Save your findings to: ADMIN_FRONTEND_TEST_REPORT.md"
echo ""

# Step 8: Quick API Test Commands
echo -e "${YELLOW}Step 8: Quick API Test Commands${NC}"
echo "----------------------------------------"
echo "You can use these commands to test APIs manually:"
echo ""
echo "# Get admin token"
echo "ADMIN_TOKEN=\$(curl -s -X POST $BACKEND_URL/api/auth/login \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}' \\"
echo "  | jq -r '.token')"
echo ""
echo "# Test stats"
echo "curl -X GET $BACKEND_URL/api/admin/stats \\"
echo "  -H \"Authorization: Bearer \$ADMIN_TOKEN\" | jq '.'"
echo ""
echo "# Test users"
echo "curl -X GET \"$BACKEND_URL/api/admin/users?page=1&limit=5\" \\"
echo "  -H \"Authorization: Bearer \$ADMIN_TOKEN\" | jq '.'"
echo ""

echo -e "${GREEN}Testing script completed!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Open the frontend URLs listed above in your browser"
echo "2. Login with admin credentials"
echo "3. Test each admin page systematically"
echo "4. Check browser console for errors"
echo "5. Document any issues found"
echo ""
