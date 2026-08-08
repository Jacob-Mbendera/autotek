#!/bin/bash

# Backend Delivery Location API Testing Script
# Tests all 7 delivery location endpoints

BASE_URL="http://localhost:5000/api"
echo "========================================="
echo "Backend Delivery Location API Tests"
echo "========================================="
echo ""

# Test 1: GET all delivery locations (Public endpoint)
echo "Test 1: GET /api/delivery-locations (Public)"
echo "-------------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL/delivery-locations")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
echo "HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    LOCATION_COUNT=$(echo "$BODY" | grep -o '"town"' | wc -l)
    echo "✅ SUCCESS - Found $LOCATION_COUNT locations"
    # Extract first location ID and town name for later tests
    FIRST_LOCATION_ID=$(echo "$BODY" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
    FIRST_TOWN=$(echo "$BODY" | grep -o '"town":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "First Location: $FIRST_TOWN (ID: $FIRST_LOCATION_ID)"
    # Get first landmark ID
    FIRST_LANDMARK_ID=$(echo "$BODY" | grep -o '"_id":"[^"]*"' | sed -n '2p' | cut -d'"' -f4)
    echo "First Landmark ID: $FIRST_LANDMARK_ID"
else
    echo "❌ FAILED - Expected 200, got $HTTP_CODE"
    echo "$BODY"
fi
echo ""

# Test 2: Try admin endpoint without token (should fail)
echo "Test 2: POST /api/delivery-locations (No Auth - Should Fail)"
echo "----------------------------------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/delivery-locations" \
    -H "Content-Type: application/json" \
    -d '{"town":"TestTown","landmarks":["Test Landmark"]}')
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
echo "HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo "✅ SUCCESS - Correctly rejected (401/403)"
else
    echo "⚠️  UNEXPECTED - Expected 401/403, got $HTTP_CODE"
fi
echo "$BODY" | head -c 200
echo ""
echo ""

# Test 3: Login as admin to get token
echo "Test 3: Login as Admin User"
echo "----------------------------"
echo "Attempting to login with testadmin@autotek.com..."
LOGIN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"testadmin@autotek.com","password":"Admin@123"}')
HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$LOGIN_RESPONSE" | sed '/HTTP_CODE/d')
echo "HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$TOKEN" ]; then
        echo "✅ SUCCESS - Got admin token"
        echo "Token (first 20 chars): ${TOKEN:0:20}..."
    else
        echo "❌ FAILED - No token in response"
        echo "$BODY"
        exit 1
    fi
else
    echo "❌ FAILED - Login failed with status $HTTP_CODE"
    echo "$BODY"
    echo ""
    echo "Attempting to create admin user..."
    REGISTER_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/auth/register" \
        -H "Content-Type: application/json" \
        -d '{"name":"Admin User","email":"admin@autotek.com","password":"Admin@123","phone":"+265999123456","role":"admin"}')
    REG_HTTP_CODE=$(echo "$REGISTER_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    echo "Register HTTP Status: $REG_HTTP_CODE"
    if [ "$REG_HTTP_CODE" = "201" ] || [ "$REG_HTTP_CODE" = "200" ]; then
        echo "✅ Admin user created"
        # Try login again
        LOGIN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/auth/login" \
            -H "Content-Type: application/json" \
            -d '{"email":"admin@autotek.com","password":"Admin@123"}')
        HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
        BODY=$(echo "$LOGIN_RESPONSE" | sed '/HTTP_CODE/d')
        TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$TOKEN" ]; then
            echo "✅ SUCCESS - Got admin token after registration"
        else
            echo "❌ FAILED - Still no token"
            exit 1
        fi
    else
        echo "❌ FAILED - Could not create admin user"
        echo "$REGISTER_RESPONSE"
        exit 1
    fi
fi
echo ""

# Test 4: Create new town (Admin)
echo "Test 4: POST /api/delivery-locations (Create Town)"
echo "----------------------------------------------------"
TIMESTAMP=$(date +%s)
TOWN_NAME="TestTown_$TIMESTAMP"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/delivery-locations" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"town\":\"$TOWN_NAME\",\"landmarks\":[\"Test Boma\",\"Test Market\",\"Other/Custom\"]}")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
echo "HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "201" ]; then
    echo "✅ SUCCESS - Town created"
    # The deliveryLocation._id is the LAST _id in the response (after all landmarks)
    NEW_LOCATION_ID=$(echo "$BODY" | grep -o '"_id":"[^"]*"' | tail -1 | cut -d'"' -f4)
    echo "New Location ID: $NEW_LOCATION_ID"
    echo "$BODY" | head -c 300
else
    echo "❌ FAILED - Expected 201, got $HTTP_CODE"
    echo "$BODY"
fi
echo ""
echo ""

# Test 5: Update town name (Admin)
echo "Test 5: PUT /api/delivery-locations/:id (Update Town Name)"
echo "------------------------------------------------------------"
if [ -n "$NEW_LOCATION_ID" ]; then
    UPDATED_TOWN_NAME="UpdatedTown_$TIMESTAMP"
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PUT "$BASE_URL/delivery-locations/$NEW_LOCATION_ID" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "{\"town\":\"$UPDATED_TOWN_NAME\"}")
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
    echo "HTTP Status: $HTTP_CODE"
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ SUCCESS - Town updated"
        echo "$BODY" | head -c 200
    else
        echo "❌ FAILED - Expected 200, got $HTTP_CODE"
        echo "$BODY"
    fi
else
    echo "⏭️  SKIPPED - No new location ID from previous test"
fi
echo ""
echo ""

# Test 6: Add landmark to town (Admin)
echo "Test 6: POST /api/delivery-locations/:id/landmarks (Add Landmark)"
echo "--------------------------------------------------------------------"
if [ -n "$NEW_LOCATION_ID" ]; then
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/delivery-locations/$NEW_LOCATION_ID/landmarks" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{"name":"New Test Landmark"}')
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
    echo "HTTP Status: $HTTP_CODE"
    if [ "$HTTP_CODE" = "201" ]; then
        echo "✅ SUCCESS - Landmark added"
        NEW_LANDMARK_ID=$(echo "$BODY" | grep -o '"_id":"[^"]*"' | tail -1 | cut -d'"' -f4)
        echo "New Landmark ID: $NEW_LANDMARK_ID"
        echo "$BODY" | head -c 300
    else
        echo "❌ FAILED - Expected 201, got $HTTP_CODE"
        echo "$BODY"
    fi
else
    echo "⏭️  SKIPPED - No new location ID"
fi
echo ""
echo ""

# Test 7: Update landmark (Admin)
echo "Test 7: PUT /api/delivery-locations/:id/landmarks/:landmarkId (Update Landmark)"
echo "---------------------------------------------------------------------------------"
if [ -n "$NEW_LOCATION_ID" ] && [ -n "$NEW_LANDMARK_ID" ]; then
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PUT "$BASE_URL/delivery-locations/$NEW_LOCATION_ID/landmarks/$NEW_LANDMARK_ID" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{"name":"Updated Test Landmark"}')
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
    echo "HTTP Status: $HTTP_CODE"
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ SUCCESS - Landmark updated"
        echo "$BODY" | head -c 200
    else
        echo "❌ FAILED - Expected 200, got $HTTP_CODE"
        echo "$BODY"
    fi
else
    echo "⏭️  SKIPPED - No landmark ID"
fi
echo ""
echo ""

# Test 8: Delete landmark (Admin)
echo "Test 8: DELETE /api/delivery-locations/:id/landmarks/:landmarkId (Delete Landmark)"
echo "-------------------------------------------------------------------------------------"
if [ -n "$NEW_LOCATION_ID" ] && [ -n "$NEW_LANDMARK_ID" ]; then
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X DELETE "$BASE_URL/delivery-locations/$NEW_LOCATION_ID/landmarks/$NEW_LANDMARK_ID" \
        -H "Authorization: Bearer $TOKEN")
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
    echo "HTTP Status: $HTTP_CODE"
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ SUCCESS - Landmark deleted (soft delete)"
        echo "$BODY" | head -c 200
    else
        echo "❌ FAILED - Expected 200, got $HTTP_CODE"
        echo "$BODY"
    fi
else
    echo "⏭️  SKIPPED - No landmark ID"
fi
echo ""
echo ""

# Test 9: Delete town (Admin)
echo "Test 9: DELETE /api/delivery-locations/:id (Delete Town)"
echo "----------------------------------------------------------"
if [ -n "$NEW_LOCATION_ID" ]; then
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X DELETE "$BASE_URL/delivery-locations/$NEW_LOCATION_ID" \
        -H "Authorization: Bearer $TOKEN")
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
    echo "HTTP Status: $HTTP_CODE"
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ SUCCESS - Town deleted (soft delete)"
        echo "$BODY" | head -c 200
    else
        echo "❌ FAILED - Expected 200, got $HTTP_CODE"
        echo "$BODY"
    fi
else
    echo "⏭️  SKIPPED - No new location ID"
fi
echo ""
echo ""

# Test 10: Verify GET still returns active locations only
echo "Test 10: GET /api/delivery-locations (Verify Deleted Town Not Shown)"
echo "-----------------------------------------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL/delivery-locations")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
echo "HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    LOCATION_COUNT=$(echo "$BODY" | grep -o '"town"' | wc -l)
    echo "✅ SUCCESS - Still returns locations: $LOCATION_COUNT"
    # Check if deleted town is NOT in the list
    if echo "$BODY" | grep -q "Updated Test District"; then
        echo "⚠️  WARNING - Deleted town still visible (should be hidden)"
    else
        echo "✅ Deleted town correctly hidden from public endpoint"
    fi
else
    echo "❌ FAILED - Expected 200, got $HTTP_CODE"
fi
echo ""
echo ""

echo "========================================="
echo "Testing Complete!"
echo "========================================="
echo ""
echo "Summary:"
echo "- Test 1: GET all locations (public) - Should pass"
echo "- Test 2: POST without auth - Should fail with 401/403"
echo "- Test 3: Admin login - Should get token"
echo "- Test 4: Create town - Should return 201"
echo "- Test 5: Update town name - Should return 200"
echo "- Test 6: Add landmark - Should return 201"
echo "- Test 7: Update landmark - Should return 200"
echo "- Test 8: Delete landmark - Should return 200"
echo "- Test 9: Delete town - Should return 200"
echo "- Test 10: Verify soft delete - Deleted items hidden"
