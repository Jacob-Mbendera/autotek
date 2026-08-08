# Frontend Return/Refund System Test Script

This script provides step-by-step instructions for testing the return/refund system in the browser.

## Prerequisites

1. **Backend Server Running**
   ```bash
   cd backend && npm run dev
   ```
   Server should be running on `http://localhost:5000`

2. **Frontend Server Running**
   ```bash
   cd frontend && npm run dev
   ```
   Frontend should be running on `http://localhost:3000` (or the port shown)

3. **Test Data Setup**
   - At least one product in the database
   - A completed order (you'll create one during testing)

## Test Environment Setup

### Step 1: Create Test User (if needed)
1. Navigate to `http://localhost:3000/register`
2. Register a new user:
   - Name: Test User
   - Email: testuser@example.com
   - Password: testpass123
   - Phone: +265991234567
3. Note: You can also use existing admin account (admin@autotek.mw / admin123)

### Step 2: Create a Completed Order
1. Navigate to `http://localhost:3000`
2. Add a product to cart
3. Go to Cart (`/cart`)
4. Proceed to Checkout (`/checkout`)
5. Complete the order with any payment method
6. **Important**: For testing, you'll need to manually update the order status to "completed" in the database or use admin panel

---

## Test Cases

### ✅ Test 1: Request Return (Authenticated User)

**Objective**: Test creating a return request as an authenticated user

**Steps**:
1. Login as test user: `http://localhost:3000/login`
2. Navigate to Orders: `http://localhost:3000/orders`
3. Find a completed order
4. Click on the order to view details (`/order/:id`)
5. Click **"Request Return"** button
6. You should be redirected to `/request-return/:orderId`

**Expected Behavior**:
- ✅ Return request form loads
- ✅ Order items are displayed
- ✅ Can select items to return
- ✅ Can select return reason (defective, wrong-item, not-as-described, changed-mind, other)
- ✅ Can add comments
- ✅ Can upload images (optional)
- ✅ Can select refund method (original-payment, store-credit)
- ✅ Form validation works

**Test Actions**:
1. Select at least one item to return
2. Enter quantity (should not exceed order quantity)
3. Select return reason: "Defective"
4. Add comment: "Item arrived damaged"
5. Select refund method: "Original Payment"
6. Click **"Submit Return Request"**

**Expected Result**:
- ✅ Success message displayed
- ✅ Redirected to return detail page (`/return/:id`)
- ✅ Return status shows as "Pending"
- ✅ Return details are displayed correctly

---

### ✅ Test 2: View Return Details

**Objective**: Test viewing a single return request

**Steps**:
1. Navigate to `/returns` (My Returns page)
2. Click on a return item
3. Or navigate directly to `/return/:id`

**Expected Behavior**:
- ✅ Return details page loads
- ✅ Shows return ID
- ✅ Shows order information
- ✅ Shows items being returned
- ✅ Shows return reason
- ✅ Shows comments
- ✅ Shows status (Pending/Approved/Rejected/Completed/Cancelled)
- ✅ Shows refund amount
- ✅ Shows refund method
- ✅ Shows refund status
- ✅ Shows shipping label (if approved)
- ✅ Shows admin notes (if any)
- ✅ Shows timeline/status history

**Test Actions**:
1. Verify all information is displayed correctly
2. Check that status badge is visible and styled correctly
3. Verify refund amount calculation is correct

---

### ✅ Test 3: View All Returns (User)

**Objective**: Test the user returns list page

**Steps**:
1. Navigate to `/returns`
2. Or click "Returns" in navigation menu

**Expected Behavior**:
- ✅ Returns list page loads
- ✅ Shows all user's returns
- ✅ Each return shows:
  - Return ID
  - Order number
  - Status badge
  - Refund amount
  - Date created
  - Quick actions (View Details)
- ✅ Empty state if no returns
- ✅ Loading state while fetching
- ✅ Error state if request fails

**Test Actions**:
1. Verify returns are listed correctly
2. Check status badges are styled appropriately
3. Click "View Details" on a return
4. Verify navigation works

---

### ✅ Test 4: Cancel Return

**Objective**: Test canceling a pending return

**Steps**:
1. Navigate to a return detail page (`/return/:id`)
2. Ensure return status is "Pending"
3. Click **"Cancel Return"** button
4. Confirm cancellation in modal

**Expected Behavior**:
- ✅ Cancel button is visible for pending returns
- ✅ Confirmation modal appears
- ✅ After confirmation, return status changes to "Cancelled"
- ✅ Success message displayed
- ✅ Cancel button disappears (return is now cancelled)
- ✅ Return appears in list with "Cancelled" status

**Test Actions**:
1. Create a new return request
2. Navigate to its detail page
3. Click "Cancel Return"
4. Confirm in modal
5. Verify status changed to "Cancelled"
6. Verify return no longer appears in active returns

---

### ✅ Test 5: Guest Return Request

**Objective**: Test creating a return as a guest user

**Steps**:
1. Logout (if logged in)
2. Create an order as guest (checkout without account)
3. Complete the order
4. Navigate to order detail page using order ID and email
5. Click **"Request Return"** button

**Expected Behavior**:
- ✅ Return request form loads
- ✅ Guest info fields are visible (email, name, phone)
- ✅ Can fill in guest information
- ✅ Form validation works for guest fields
- ✅ Can submit return request

**Test Actions**:
1. Fill in guest information:
   - Email: guest@test.com
   - Name: Guest User
   - Phone: +265991111111
2. Select items to return
3. Select return reason
4. Submit return request

**Expected Result**:
- ✅ Success message displayed
- ✅ Redirected to return detail page
- ✅ Return is associated with guest email
- ✅ Can view return using email lookup

---

### ✅ Test 6: View Guest Returns by Email

**Objective**: Test viewing guest returns using email lookup

**Steps**:
1. Navigate to `/returns`
2. If not logged in, should see email lookup form
3. Enter guest email: `guest@test.com`
4. Click "Lookup Returns"

**Expected Behavior**:
- ✅ Email input field visible
- ✅ Can enter email address
- ✅ Returns associated with email are displayed
- ✅ Same return list UI as authenticated users

**Test Actions**:
1. Enter guest email
2. Click lookup
3. Verify returns are displayed
4. Click on a return to view details

---

### ✅ Test 7: Admin - View All Returns

**Objective**: Test admin returns management page

**Steps**:
1. Login as admin: `admin@autotek.mw` / `admin123`
2. Navigate to `/admin/returns`
3. Or click "Admin" → "Returns" in navigation

**Expected Behavior**:
- ✅ Admin returns page loads
- ✅ Shows all returns from all users
- ✅ Filter options available:
  - Status filter (Pending, Approved, Rejected, Completed, Cancelled)
  - Date range filter
  - Search by order ID or return ID
- ✅ Sort options:
  - Date (newest first, oldest first)
  - Status
  - Refund amount
- ✅ Pagination works
- ✅ Each return shows:
  - Return ID
  - User/Guest info
  - Order number
  - Status
  - Refund amount
  - Date created
  - Actions (Approve, Reject, Process Refund)

**Test Actions**:
1. Verify all returns are listed
2. Test status filter
3. Test search functionality
4. Test sorting
5. Click on a return to view details

---

### ✅ Test 8: Admin - Approve Return

**Objective**: Test admin approving a return request

**Steps**:
1. Navigate to `/admin/returns`
2. Find a return with status "Pending"
3. Click **"Approve"** button
4. Confirm approval

**Expected Behavior**:
- ✅ Approve button visible for pending returns
- ✅ Confirmation modal appears (optional)
- ✅ After approval:
  - Return status changes to "Approved"
  - Shipping label is generated
  - Email notification sent to user
  - Return appears in approved returns
- ✅ Success message displayed

**Test Actions**:
1. Find a pending return
2. Click "Approve"
3. Verify status changed to "Approved"
4. Check shipping label is displayed
5. Verify email was sent (check console logs in backend)

---

### ✅ Test 9: Admin - Reject Return

**Objective**: Test admin rejecting a return request

**Steps**:
1. Navigate to `/admin/returns`
2. Find a return with status "Pending"
3. Click **"Reject"** button
4. Enter admin notes (optional)
5. Confirm rejection

**Expected Behavior**:
- ✅ Reject button visible for pending returns
- ✅ Rejection modal/form appears
- ✅ Can enter admin notes
- ✅ After rejection:
  - Return status changes to "Rejected"
  - Admin notes are saved
  - Email notification sent to user
  - Return appears in rejected returns
- ✅ Success message displayed

**Test Actions**:
1. Find a pending return
2. Click "Reject"
3. Enter admin notes: "Item does not meet return criteria"
4. Confirm rejection
5. Verify status changed to "Rejected"
6. Verify admin notes are displayed

---

### ✅ Test 10: Admin - Process Refund

**Objective**: Test admin processing a refund for an approved return

**Steps**:
1. Navigate to `/admin/returns`
2. Find a return with status "Approved"
3. Click **"Process Refund"** button
4. Confirm refund processing

**Expected Behavior**:
- ✅ Process Refund button visible for approved returns
- ✅ Confirmation modal appears
- ✅ After processing:
  - Refund status changes to "Processing"
  - Then to "Completed" (or "Failed" if error)
  - Return status changes to "Completed"
  - Email notification sent to user
- ✅ Success message displayed
- ✅ Refund amount is displayed

**Test Actions**:
1. Find an approved return
2. Click "Process Refund"
3. Confirm processing
4. Verify refund status changed to "Processing"
5. Wait a moment, verify status changed to "Completed"
6. Verify return status is "Completed"

---

### ✅ Test 11: Return from Order Detail Page

**Objective**: Test requesting return directly from order detail page

**Steps**:
1. Navigate to `/orders`
2. Click on a completed order
3. View order details
4. Click **"Request Return"** button

**Expected Behavior**:
- ✅ "Request Return" button visible for completed orders
- ✅ Button is disabled/hidden for:
  - Pending orders
  - Processing orders
  - Cancelled orders
  - Orders with existing returns
- ✅ Clicking button navigates to return request form
- ✅ Order information is pre-filled

**Test Actions**:
1. Navigate to a completed order
2. Verify "Request Return" button is visible
3. Click button
4. Verify redirect to return request form
5. Verify order items are pre-loaded

---

### ✅ Test 12: Return Status Badges and UI

**Objective**: Test UI elements and status indicators

**Steps**:
1. Navigate through various return pages
2. Check status badges and UI elements

**Expected Behavior**:
- ✅ Status badges are color-coded:
  - Pending: Yellow/Orange
  - Approved: Blue
  - Rejected: Red
  - Completed: Green
  - Cancelled: Gray
- ✅ Icons are appropriate for each status
- ✅ Loading states are shown during API calls
- ✅ Error messages are user-friendly
- ✅ Empty states are informative
- ✅ Responsive design works on mobile

**Test Actions**:
1. Check status badges on returns list
2. Check status badges on return detail page
3. Test on mobile view (responsive)
4. Verify loading states
5. Verify error handling

---

### ✅ Test 13: Return Form Validation

**Objective**: Test form validation on return request form

**Steps**:
1. Navigate to return request form
2. Try to submit without required fields

**Expected Behavior**:
- ✅ Required fields are marked
- ✅ Validation errors are displayed:
  - Items must be selected
  - Quantity cannot exceed order quantity
  - Return reason is required
  - Guest info required for guest returns
- ✅ Form cannot be submitted with invalid data
- ✅ Error messages are clear and helpful

**Test Actions**:
1. Try submitting empty form
2. Try selecting quantity > order quantity
3. Try submitting without return reason
4. Verify all validation errors are shown
5. Fill form correctly and verify submission works

---

### ✅ Test 14: Image Upload (Optional)

**Objective**: Test image upload functionality for return requests

**Steps**:
1. Navigate to return request form
2. Click "Upload Images" or image upload area
3. Select image files

**Expected Behavior**:
- ✅ Image upload area is visible
- ✅ Can select multiple images
- ✅ Images are previewed before upload
- ✅ Images are uploaded to Cloudinary
- ✅ Image URLs are saved with return request
- ✅ Images are displayed on return detail page

**Test Actions**:
1. Select 1-3 images
2. Verify preview works
3. Submit return request
4. Verify images are uploaded
5. Check return detail page shows images

---

## Test Checklist

Use this checklist to track your testing progress:

- [ ] Test 1: Request Return (Authenticated User)
- [ ] Test 2: View Return Details
- [ ] Test 3: View All Returns (User)
- [ ] Test 4: Cancel Return
- [ ] Test 5: Guest Return Request
- [ ] Test 6: View Guest Returns by Email
- [ ] Test 7: Admin - View All Returns
- [ ] Test 8: Admin - Approve Return
- [ ] Test 9: Admin - Reject Return
- [ ] Test 10: Admin - Process Refund
- [ ] Test 11: Return from Order Detail Page
- [ ] Test 12: Return Status Badges and UI
- [ ] Test 13: Return Form Validation
- [ ] Test 14: Image Upload (Optional)

---

## Common Issues and Solutions

### Issue: Return button not visible on order detail page
**Solution**: Ensure order status is "completed" and no existing return exists

### Issue: Cannot submit return request
**Solution**: 
- Check all required fields are filled
- Verify order is completed
- Check browser console for errors
- Verify backend is running

### Issue: Images not uploading
**Solution**:
- Check Cloudinary configuration in backend
- Verify file size is under 5MB
- Check file format is supported (jpg, png, etc.)

### Issue: Email notifications not working
**Solution**:
- Check backend console logs
- Verify email service is configured
- Check email service logs

### Issue: Return status not updating
**Solution**:
- Refresh the page
- Check backend API response
- Verify admin actions are working

---

## Browser Console Checks

While testing, check the browser console (F12) for:

1. **API Errors**: Check Network tab for failed requests
2. **JavaScript Errors**: Check Console tab for errors
3. **Redux State**: Check Redux DevTools for state updates
4. **API Responses**: Verify response data structure

---

## Notes

- All return requests require orders to be in "completed" status
- Return window is 30 days from order completion
- Only one active return (pending/approved) per order
- Refunds can only be processed for approved returns
- Guest returns require email lookup to view

---

## Test Completion

After completing all tests, document any:
- Bugs found
- UI/UX improvements needed
- Performance issues
- Missing features
- Edge cases not handled
