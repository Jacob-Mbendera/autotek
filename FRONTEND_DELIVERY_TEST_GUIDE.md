# Frontend Delivery Location Testing Guide

**Date**: March 26, 2026
**Feature**: Malawi Delivery Location System (28 Districts)
**Testing Method**: Manual UI Testing

---

## Prerequisites

✅ Backend server running on http://localhost:5000
✅ Frontend server running (typically http://localhost:5173)
✅ Database seeded with 29 Malawi locations
✅ Test admin user created: testadmin@autotek.com / Admin@123

---

## Testing Overview

This guide covers:
1. **User Flow Testing** - Customer placing order with delivery location
2. **Admin Flow Testing** - Managing delivery locations
3. **Backward Compatibility** - Viewing legacy orders
4. **Edge Cases** - Custom addresses, validation, errors

---

# PART 1: USER FLOW TESTING

## Test 1.1: View Products and Add to Cart

### Steps:
1. Open browser to frontend URL (e.g., http://localhost:5173)
2. Navigate to Products page
3. Browse available products
4. Click on any product to view details
5. Click "Add to Cart" button

### Expected Results:
- ✅ Products page loads successfully
- ✅ Product details page shows complete information
- ✅ "Add to Cart" button works
- ✅ Cart counter updates (shows number of items)
- ✅ Success notification appears

### Notes:
```
Product added successfully? ______
Cart counter updated? ______
```

---

## Test 1.2: Navigate to Checkout

### Steps:
1. Click on cart icon in header
2. Review cart items
3. Click "Proceed to Checkout" button

### Expected Results:
- ✅ Cart page shows all added items
- ✅ Correct quantities displayed
- ✅ Subtotal calculated correctly
- ✅ Checkout button visible and clickable

### Notes:
```
Cart items correct? ______
Prices correct? ______
Checkout button works? ______
```

---

## Test 1.3: Delivery Location Selector - District Selection

### Steps:
1. On checkout page, locate "Delivery Address" section
2. Find the **District/Town** dropdown
3. Click on the District dropdown

### Expected Results:
- ✅ Dropdown shows all 29 districts
- ✅ Districts organized alphabetically or by region
- ✅ "Select a district/town..." placeholder visible
- ✅ Dropdown is searchable (type to filter)

### Districts to Verify (Sample Check):
```
Northern Region:
□ Chitipa
□ Karonga
□ Mzuzu
□ Nkhata Bay
□ Rumphi

Central Region:
□ Lilongwe
□ Dedza
□ Kasungu
□ Salima
□ Mchinji

Southern Region:
□ Blantyre
□ Zomba
□ Mangochi
□ Mulanje
□ Thyolo
```

### Test Different Districts:
**Test A: Select "Lilongwe"**
1. Click on "Lilongwe" from dropdown
2. Observe landmark dropdown activation

**Expected**:
- ✅ Lilongwe selected and displayed
- ✅ Landmark dropdown becomes enabled
- ✅ No errors in console

### Notes:
```
District dropdown working? ______
All districts visible? ______
Selection updates correctly? ______
```

---

## Test 1.4: Landmark Selection for Lilongwe

### Steps:
1. After selecting "Lilongwe", click on **Landmark** dropdown
2. Review available landmarks

### Expected Landmarks for Lilongwe:
```
□ Shoprite Mall
□ Capital Hill Area
□ Area 47 Shopping Centre
□ Area 18
□ Kanengo Industrial Area
□ Lilongwe City Centre
□ Crossroads Hotel
□ Bingu National Stadium
□ Kamuzu Central Hospital
□ Lilongwe Bus Depot
□ Old Town
□ Other/Custom
```

### Test Actions:
**Test A: Select "Shoprite Mall"**
1. Click on "Shoprite Mall"
2. Observe address preview

**Expected**:
- ✅ "Shoprite Mall" selected
- ✅ Address preview shows: "Lilongwe, Shoprite Mall"
- ✅ No custom address textarea visible
- ✅ Form validates successfully

**Test B: Select "Other/Custom"**
1. Change landmark selection to "Other/Custom"
2. Observe custom address textarea appearance

**Expected**:
- ✅ Custom address textarea appears
- ✅ Placeholder text: "Please describe your delivery location..."
- ✅ Can type in textarea
- ✅ Address preview updates with custom text

### Notes:
```
Landmark dropdown activated? ______
Correct landmarks shown? ______
"Shoprite Mall" selection works? ______
"Other/Custom" shows textarea? ______
```

---

## Test 1.5: Custom Address Entry

### Steps:
1. Ensure "Other/Custom" is selected as landmark
2. Type custom address in textarea:
   ```
   Near the blue gate, opposite Total Filling Station, Area 25
   ```
3. Observe address preview

### Expected Results:
- ✅ Textarea accepts input
- ✅ Address preview shows custom text
- ✅ Character limit reasonable (if any)
- ✅ No validation errors

### Test Validation:
**Test A: Empty Custom Address**
1. Select "Other/Custom"
2. Leave textarea empty
3. Try to proceed

**Expected**:
- ✅ Validation error appears
- ✅ Error message: "Please provide a delivery address"
- ✅ Cannot proceed with empty custom address

### Notes:
```
Custom textarea appears? ______
Can type custom address? ______
Preview updates correctly? ______
Validation works for empty? ______
```

---

## Test 1.6: Change Districts (Test Cascading)

### Steps:
1. Currently have "Lilongwe" selected with a landmark
2. Change district to "Blantyre"
3. Observe landmark dropdown update

### Expected Results:
- ✅ Landmark selection clears
- ✅ Landmark dropdown shows Blantyre's landmarks
- ✅ Custom address (if any) clears
- ✅ Address preview updates

### Expected Landmarks for Blantyre:
```
□ Chichiri Shopping Mall
□ Mandala House
□ Victoria Avenue
□ Chipembere Highway
□ Blantyre City Centre
□ Limbe Market
□ Soche Market
□ Game Stores
□ Queen Elizabeth Central Hospital
□ Blantyre Sports Club
□ Limbe Bus Depot
□ Other/Custom
```

### Test Actions:
1. Select "Chichiri Shopping Mall"
2. Verify address preview: "Blantyre, Chichiri Shopping Mall"

### Notes:
```
District change clears landmark? ______
New landmarks load correctly? ______
Cascading working properly? ______
```

---

## Test 1.7: Complete Checkout with Structured Address

### Steps:
1. Ensure district and landmark are selected (e.g., "Blantyre, Chichiri Shopping Mall")
2. Select payment method (e.g., "Mobile Money")
3. Fill in any required guest information (if not logged in):
   - Name: Test User
   - Email: test@example.com
   - Phone: +265999123456
4. Click "Place Order" button

### Expected Results:
- ✅ No validation errors
- ✅ Order creation successful
- ✅ Redirected to payment page or order confirmation
- ✅ Success notification appears
- ✅ Order ID provided

### Important - Note the Order ID:
```
Order ID: ________________
```

### Notes:
```
Order placed successfully? ______
Validation passed? ______
Payment flow initiated? ______
```

---

## Test 1.8: View Order Details with Structured Address

### Steps:
1. Navigate to "My Orders" or "Orders" page
2. Find the order you just created (use Order ID from Test 1.7)
3. Click on the order to view details

### Expected Results:
- ✅ Order details page loads
- ✅ Order status displayed
- ✅ Items list correct
- ✅ **Shipping Address displays correctly**: "Blantyre, Chichiri Shopping Mall"
- ✅ Not showing raw object like `[object Object]`
- ✅ Formatted human-readable address

### Address Format Check:
**For structured address (Town + Landmark)**:
- Display should be: "Blantyre, Chichiri Shopping Mall"

**For custom address**:
- Display should be: Full custom text entered

### Notes:
```
Order found in list? ______
Order details correct? ______
Address formatted properly? ______
No [object Object] error? ______
```

---

## Test 1.9: Test Different District/Landmark Combinations

### Repeat Tests with Multiple Districts:

**Test Set A: Northern Region - Mzuzu**
1. Go back to products and add another item
2. Proceed to checkout
3. Select District: "Mzuzu"
4. Select Landmark: "Shoprite Mzuzu"
5. Place order
6. Verify order details

**Expected**:
- ✅ Mzuzu landmarks load correctly
- ✅ Order created with "Mzuzu, Shoprite Mzuzu"

**Test Set B: Southern Region - Zomba**
1. Add new item to cart
2. Checkout
3. Select District: "Zomba"
4. Select Landmark: "Chancellor College"
5. Place order
6. Verify order details

**Expected**:
- ✅ Zomba landmarks load correctly
- ✅ Order created with "Zomba, Chancellor College"

**Test Set C: Custom Address - Mangochi**
1. Add item to cart
2. Checkout
3. Select District: "Mangochi"
4. Select Landmark: "Other/Custom"
5. Enter custom: "Near the lake shore, behind Mango Drift Lodge"
6. Place order
7. Verify order details

**Expected**:
- ✅ Custom address saved correctly
- ✅ Order details show full custom text
- ✅ No truncation or formatting issues

### Notes:
```
Multiple districts tested? ______
All combinations work? ______
Custom addresses save correctly? ______
```

---

# PART 2: ADMIN FLOW TESTING

## Test 2.1: Admin Login

### Steps:
1. Logout if currently logged in
2. Navigate to Login page
3. Login with admin credentials:
   - Email: testadmin@autotek.com
   - Password: Admin@123
4. Verify admin dashboard access

### Expected Results:
- ✅ Login successful
- ✅ Redirected to admin dashboard
- ✅ Admin navigation visible
- ✅ "Delivery Locations" menu item visible in sidebar

### Notes:
```
Admin login works? ______
Admin dashboard loads? ______
Delivery Locations menu visible? ______
```

---

## Test 2.2: Navigate to Delivery Locations Management

### Steps:
1. In admin sidebar, find "Delivery Locations" menu item
2. Click on "Delivery Locations"

### Expected Results:
- ✅ Page loads: /admin/delivery-locations
- ✅ Page title: "Delivery Locations"
- ✅ Subtitle: "Manage towns and landmarks for Malawi delivery addresses"
- ✅ Search bar visible
- ✅ "Add Town" button visible
- ✅ List of all 29 districts displayed

### Notes:
```
Page loads correctly? ______
All UI elements present? ______
Districts list visible? ______
```

---

## Test 2.3: Search Functionality

### Steps:
1. In search bar, type: "Lilongwe"
2. Observe filtered results
3. Clear search
4. Type: "Bla"
5. Observe results (should show Blantyre, Balaka)

### Expected Results:
- ✅ Search filters districts in real-time
- ✅ Typing "Lilongwe" shows only Lilongwe
- ✅ Typing "Bla" shows Blantyre and Balaka
- ✅ Search is case-insensitive
- ✅ Clear search shows all districts again

### Notes:
```
Search filters correctly? ______
Case-insensitive? ______
Real-time filtering? ______
```

---

## Test 2.4: View District Details

### Steps:
1. Clear any search filters
2. Find "Lilongwe" in the list
3. Observe district card details

### Expected Information:
- ✅ District name: "Lilongwe"
- ✅ MapPin icon displayed
- ✅ Landmark count: "12 landmarks" (or current count)
- ✅ Edit button (pencil icon)
- ✅ Delete button (trash icon)
- ✅ List of all landmarks displayed below
- ✅ Each landmark has edit/delete buttons

### Verify Landmarks Display:
```
□ Shoprite Mall - Active (green checkmark)
□ Capital Hill Area - Active
□ Area 47 Shopping Centre - Active
□ ... (all others)
□ Other/Custom - Active
```

### Notes:
```
District card displays correctly? ______
Landmark count accurate? ______
All landmarks visible? ______
Icons working? ______
```

---

## Test 2.5: Edit District Name

### Steps:
1. Find "Lilongwe" district
2. Click Edit button (pencil icon) next to district name
3. Input field appears with current name
4. Change name to: "Lilongwe City"
5. Click Save button (checkmark icon)
6. Observe update

### Expected Results:
- ✅ Edit mode activates
- ✅ Input field shows "Lilongwe"
- ✅ Can edit the text
- ✅ Save button appears
- ✅ Cancel button (X) appears
- ✅ After save: Success notification
- ✅ District name updates to "Lilongwe City"

### Test Cancel:
1. Click Edit again
2. Change name to something else
3. Click Cancel (X button)

**Expected**:
- ✅ Changes discarded
- ✅ Name remains "Lilongwe City"

### Revert Name:
1. Edit again and change back to "Lilongwe"
2. Save

### Notes:
```
Edit mode works? ______
Save updates correctly? ______
Cancel discards changes? ______
Notification appears? ______
```

---

## Test 2.6: Edit Landmark Name

### Steps:
1. In "Lilongwe" district, find landmark "Old Town"
2. Click Edit button (pencil icon) next to "Old Town"
3. Change name to: "Old Town Area"
4. Click Save
5. Verify update

### Expected Results:
- ✅ Landmark edit mode activates
- ✅ Input shows current name
- ✅ Can edit text
- ✅ Save button works
- ✅ Success notification
- ✅ Landmark name updates to "Old Town Area"

### Revert:
1. Edit back to "Old Town"
2. Save

### Notes:
```
Landmark edit works? ______
Save updates correctly? ______
Notification appears? ______
```

---

## Test 2.7: Add New Landmark

### Steps:
1. Scroll to bottom of "Lilongwe" landmarks
2. Find "Add Landmark" button
3. Click "Add Landmark"
4. Input field appears
5. Type: "Test Landmark Area"
6. Click Save

### Expected Results:
- ✅ Add mode activated
- ✅ Input field with placeholder visible
- ✅ Can type new landmark name
- ✅ Save button works
- ✅ Success notification: "Landmark added successfully"
- ✅ New landmark appears in list
- ✅ New landmark has green checkmark (active)
- ✅ Landmark count increases by 1

### Notes:
```
Add landmark button works? ______
Input field appears? ______
Landmark saved successfully? ______
Count updated? ______
```

---

## Test 2.8: Delete Landmark (Soft Delete)

### Steps:
1. Find the "Test Landmark Area" you just created
2. Click Delete button (trash icon)
3. Confirmation dialog appears
4. Confirm deletion

### Expected Results:
- ✅ Confirmation dialog: "Are you sure you want to delete 'Test Landmark Area'?"
- ✅ Can click OK or Cancel
- ✅ Click OK
- ✅ Success notification: "Landmark deleted successfully"
- ✅ Landmark disappears from list (soft deleted, active=false)
- ✅ Landmark count decreases by 1

### Verification:
1. Go to checkout as regular user
2. Select "Lilongwe" district
3. Verify "Test Landmark Area" does NOT appear in landmark list

**Expected**:
- ✅ Deleted landmark not visible to users
- ✅ Only active landmarks shown

### Notes:
```
Delete confirmation appears? ______
Landmark deleted? ______
Hidden from user checkout? ______
Soft delete working? ______
```

---

## Test 2.9: Add New District

### Steps:
1. Click "Add Town" button at top of page
2. Modal/dialog appears
3. Fill in form:
   - Town Name: "Test District"
   - Landmark 1: "Test Boma"
   - Landmark 2: "Test Market"
   - Landmark 3: "Other/Custom"
4. Click "Add Another Landmark" button (if needed)
5. Add one more: "Test Hospital"
6. Click "Create Town" button

### Expected Results:
- ✅ Modal opens with form
- ✅ Town name input field
- ✅ Initial landmark input fields (at least 1)
- ✅ "Add Another Landmark" button works
- ✅ Can add multiple landmarks
- ✅ Can remove landmark (if more than 1)
- ✅ "Create Town" button submits form
- ✅ Success notification: "Town created successfully"
- ✅ Modal closes
- ✅ New district "Test District" appears in list
- ✅ New district has 4 landmarks

### Validation Tests:
**Test A: Empty town name**
1. Click "Add Town"
2. Leave town name empty
3. Add landmarks
4. Click "Create Town"

**Expected**:
- ✅ Error message: "Town name is required"
- ✅ Form does not submit

**Test B: No landmarks**
1. Click "Add Town"
2. Enter town name
3. Leave all landmark fields empty
4. Click "Create Town"

**Expected**:
- ✅ Error message: "At least one landmark is required"
- ✅ Form does not submit

### Notes:
```
Add Town modal works? ______
Can add multiple landmarks? ______
Validation working? ______
District created successfully? ______
```

---

## Test 2.10: Delete District (Soft Delete)

### Steps:
1. Find "Test District" in the list
2. Click Delete button (trash icon) next to district name
3. Confirmation dialog appears
4. Read the message
5. Confirm deletion

### Expected Results:
- ✅ Confirmation dialog: "Are you sure you want to delete 'Test District'? This will soft delete the town."
- ✅ Click OK
- ✅ Success notification: "Town deleted successfully"
- ✅ "Test District" disappears from admin list
- ✅ District count decreases

### Verification:
1. Go to checkout as regular user
2. Open district dropdown
3. Verify "Test District" does NOT appear

**Expected**:
- ✅ Deleted district not visible to users
- ✅ Only active districts shown

### Database Verification (Soft Delete):
The district is still in the database with `active: false`, just hidden from public view.

### Notes:
```
Delete confirmation appears? ______
District deleted? ______
Hidden from user checkout? ______
Soft delete confirmed? ______
```

---

## Test 2.11: Duplicate District Prevention

### Steps:
1. Click "Add Town"
2. Enter town name: "Lilongwe" (already exists)
3. Add some landmarks
4. Click "Create Town"

### Expected Results:
- ✅ Error notification: "Town name already exists"
- ✅ Form does not submit
- ✅ Can correct the name or cancel

### Notes:
```
Duplicate validation works? ______
Error message clear? ______
Form doesn't submit? ______
```

---

# PART 3: BACKWARD COMPATIBILITY TESTING

## Test 3.1: Create Order with Legacy String Address (if possible)

### Context:
Orders created before the new system should still display correctly.

### Steps:
1. If you have old orders in database, view them
2. Check that orders with string addresses display correctly

### Expected Results:
- ✅ Legacy orders with `shippingAddress: "123 Main Street"` display correctly
- ✅ No `[object Object]` errors
- ✅ Address shown as plain text
- ✅ No errors in console

### Notes:
```
Legacy orders display? ______
No formatting errors? ______
```

---

# PART 4: EDGE CASES & ERROR HANDLING

## Test 4.1: Network Error Handling (Checkout)

### Steps:
1. Open browser DevTools
2. Go to Network tab
3. Enable "Offline" mode
4. Try to load checkout page with delivery locations

### Expected Results:
- ✅ Error message displayed: "Failed to load delivery locations"
- ✅ User-friendly error icon
- ✅ Retry option or instruction
- ✅ No page crash

### Notes:
```
Error handled gracefully? ______
User-friendly message? ______
```

---

## Test 4.2: No Districts Available (Edge Case)

### Steps:
This would require all districts to be deleted (shouldn't happen in practice)

### Expected Results:
- ✅ Empty state message
- ✅ No broken UI

### Notes:
```
Empty state handled? ______
```

---

## Test 4.3: Long Custom Address

### Steps:
1. Go to checkout
2. Select district and "Other/Custom"
3. Enter very long custom address (500+ characters)
4. Try to submit

### Expected Results:
- ✅ Either accepts long address or shows character limit
- ✅ No UI breaking
- ✅ Address saves correctly if within limits

### Notes:
```
Long address handled? ______
Character limit (if any)? ______
```

---

## Test 4.4: Special Characters in Custom Address

### Steps:
1. Go to checkout
2. Select "Other/Custom"
3. Enter address with special characters:
   ```
   Near the shop, behind #5, area "A" & opposite the church (St. Mary's)
   ```
4. Submit order
5. View order details

### Expected Results:
- ✅ Special characters accepted
- ✅ Address saved correctly
- ✅ Displays correctly in order details
- ✅ No encoding issues

### Notes:
```
Special chars accepted? ______
Display correctly? ______
```

---

## Test 4.5: Rapid District Switching

### Steps:
1. Go to checkout
2. Quickly switch between multiple districts:
   - Select Lilongwe
   - Immediately select Blantyre
   - Immediately select Mzuzu
   - Immediately select Zomba
3. Observe landmark dropdown behavior

### Expected Results:
- ✅ Landmarks update correctly for each district
- ✅ No race conditions
- ✅ No stale landmark data
- ✅ UI remains responsive
- ✅ No errors in console

### Notes:
```
Rapid switching works? ______
Landmarks update correctly? ______
No race conditions? ______
```

---

# FINAL VERIFICATION CHECKLIST

## User Experience (Frontend)
- [ ] All 29 districts load in checkout
- [ ] Landmark dropdown updates when district changes
- [ ] "Other/Custom" option shows custom textarea
- [ ] Address preview displays correctly
- [ ] Validation works (empty fields rejected)
- [ ] Orders created successfully with structured addresses
- [ ] Order details page formats addresses correctly
- [ ] No `[object Object]` errors anywhere
- [ ] UI is responsive and user-friendly

## Admin Experience
- [ ] Admin can view all 29 districts
- [ ] Admin can search/filter districts
- [ ] Admin can create new district with landmarks
- [ ] Admin can edit district name
- [ ] Admin can add landmark to existing district
- [ ] Admin can edit landmark name
- [ ] Admin can delete landmark (soft delete)
- [ ] Admin can delete district (soft delete)
- [ ] Deleted items hidden from public checkout
- [ ] Validation prevents duplicates
- [ ] All notifications working

## Technical
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] API calls work correctly
- [ ] Loading states display properly
- [ ] Error states handled gracefully
- [ ] Backward compatibility maintained
- [ ] Soft delete functionality verified

---

# TEST RESULTS SUMMARY

## Overall Status
**Date Tested**: _________________
**Tester**: _________________

### User Flow Tests (1.1 - 1.9)
- Total Tests: 9
- Passed: _____ / 9
- Failed: _____ / 9

### Admin Flow Tests (2.1 - 2.11)
- Total Tests: 11
- Passed: _____ / 11
- Failed: _____ / 11

### Backward Compatibility (3.1)
- Total Tests: 1
- Passed: _____ / 1
- Failed: _____ / 1

### Edge Cases (4.1 - 4.5)
- Total Tests: 5
- Passed: _____ / 5
- Failed: _____ / 5

### Grand Total
- **Total Tests**: 26
- **Passed**: _____ / 26
- **Failed**: _____ / 26
- **Success Rate**: _____%

---

## Issues Found

### Critical Issues (Blockers)
1. _____________________________________________________
2. _____________________________________________________
3. _____________________________________________________

### Major Issues
1. _____________________________________________________
2. _____________________________________________________
3. _____________________________________________________

### Minor Issues
1. _____________________________________________________
2. _____________________________________________________
3. _____________________________________________________

### UI/UX Improvements Suggested
1. _____________________________________________________
2. _____________________________________________________
3. _____________________________________________________

---

## Additional Notes

```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## Sign-Off

**Tested By**: ___________________
**Date**: ___________________
**Status**: [ ] Approved [ ] Needs Fixes [ ] Rejected

**Reviewer**: ___________________
**Date**: ___________________
**Status**: [ ] Approved [ ] Needs Fixes [ ] Rejected

---

**End of Testing Guide**
