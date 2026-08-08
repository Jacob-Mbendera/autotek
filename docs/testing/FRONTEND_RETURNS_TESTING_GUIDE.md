# Frontend Returns & Refunds - Complete End-to-End Testing Guide

**Date**: March 17, 2026
**Frontend URL**: http://localhost:5173
**Backend URL**: http://localhost:5000

---

## 🎯 Testing Objective

Test the complete returns and refunds user journey from customer perspective and admin perspective in the browser.

---

## 📋 Pre-Test Checklist

✅ **Servers Running**:
- Backend: http://localhost:5000 ✅
- Frontend: http://localhost:5173 ✅

✅ **Test Data Available**:
- From backend folder run: `node seed-test-data.js` (requires test user/admin already in DB; script creates products and 3 completed orders).
- Customer: `testuser@autotek.com` / `Test123456`
- Admin: `admintest@autotek.com` / `Admin123456`
- 3 Completed Orders with products. Order IDs (from seed output or below):
  - Order 1: `69b926d4accc1a955157c0a9` (MWK 100,000)
  - Order 2: `69b926d4accc1a955157c0ab` (MWK 180,000)
  - Order 3: `69b926d4accc1a955157c0ae` (MWK 150,000)

---

## 🧪 Complete User Journey Test

### Phase 1: Customer - Login & View Orders

**Test ID**: E2E-001
**User**: Customer
**Objective**: Login and view completed orders

#### Steps:

1. **Navigate to Frontend**
   ```
   URL: http://localhost:5173
   ```
   - ✅ Homepage loads
   - ✅ Navigation visible

2. **Login as Customer**
   - Click "Login" or "Sign In" in navigation
   ```
   Email: testuser@autotek.com
   Password: Test123456
   ```
   - Click "Login" button
   - ✅ Login successful
   - ✅ Redirected to homepage or dashboard
   - ✅ User name visible in header

3. **Navigate to Orders Page**
   - Click "Orders" or "My Orders" in navigation/menu
   ```
   URL: http://localhost:5173/orders
   ```
   - ✅ Orders page loads
   - ✅ See 3 completed orders listed
   - ✅ Order IDs visible
   - ✅ Amounts shown (MWK 100K, 180K, 150K)
   - ✅ Status shows "Completed"

**Expected Results**:
- ✅ All 3 seeded orders visible
- ✅ Order details accurate (amounts, dates, status)
- ✅ Navigation works smoothly

**Screenshot Checklist**:
- [ ] Orders listing page showing 3 orders
- [ ] Order details (ID, amount, status)

---

### Phase 2: Customer - Request Return

**Test ID**: E2E-002
**User**: Customer
**Objective**: Create a return request for a completed order

#### Steps:

1. **Navigate to Order Detail**
   - From orders list, click on **Order 3** (MWK 150,000)
   ```
   Order ID: 69b926d4accc1a955157c0ae
   URL: http://localhost:5173/orders/69b926d4accc1a955157c0ae
   ```
   - ✅ Order detail page loads
   - ✅ Products in order visible
   - ✅ Order status: "Completed"
   - ✅ "Request Return" button visible

2. **Click Request Return**
   - Click "Request Return" or "Return Items" button
   ```
   App navigates to: http://localhost:5173/returns/new?orderId=69b926d4accc1a955157c0ae
   ```
   - ✅ Return request form loads
   - ✅ Order details shown
   - ✅ Products available for return

3. **Fill Return Request Form**

   **Select Products**:
   - ✅ Check/select first product (Test Engine Oil)
   - ✅ Quantity: 1
   - ✅ Item-specific reason field (if available)

   **Return Reason** (select one):
   - ✅ Select: "Defective" or "Product defective"

   **Comments/Description**:
   ```
   Product arrived with visible damage. The item has cracks and cannot be used safely.
   ```

   **Upload Images** (optional):
   - ✅ Upload product photo button visible
   - Skip for now or test image upload if time permits

   **Refund Method**:
   - ✅ Select: "Original Payment Method"
   - OR select: "Store Credit" (test one option)

4. **Submit Return Request**
   - Review all entered information
   - Click "Submit Return Request" button
   - ✅ Loading indicator shown (if any)
   - ✅ Success message displayed
   - ✅ Redirected to returns page or return detail page

**Expected Results**:
- ✅ Return request created successfully
- ✅ Return ID shown
- ✅ Status: "Pending"
- ✅ All details saved correctly
- ✅ Success notification displayed

**Screenshot Checklist**:
- [ ] Order detail page with "Request Return" button
- [ ] Return request form (filled)
- [ ] Success message after submission
- [ ] Return details page showing pending status

**Test Data to Verify**:
- Return Reason: Defective
- Comments: Contains damage description
- Refund Method: Original Payment Method
- Status: Pending
- Return ID: (note this down)

---

### Phase 3: Customer - View Returns List

**Test ID**: E2E-003
**User**: Customer
**Objective**: View all return requests

#### Steps:

1. **Navigate to Returns Page**
   ```
   URL: http://localhost:5173/returns
   ```
   - ✅ Returns listing page loads
   - ✅ Recently created return visible

2. **Verify Return Information**
   - ✅ Return ID visible
   - ✅ Order ID/number shown
   - ✅ Products listed
   - ✅ Status: "Pending"
   - ✅ Refund amount shown (or calculated)
   - ✅ Date created visible

3. **Click on Return for Details**
   - Click on the return to view details
   ```
   URL: http://localhost:5173/returns/{returnId}
   ```
   - ✅ Return detail page loads
   - ✅ Full return information shown:
     - Order details
     - Products being returned
     - Return reason
     - Comments
     - Status: Pending
     - Shipping label / download (shown after return is approved)

**Expected Results**:
- ✅ Return listing shows the created return
- ✅ All information accurate
- ✅ Status badge/indicator for "Pending"

**Screenshot Checklist**:
- [ ] Returns listing page
- [ ] Return detail page with full information

---

### Phase 4: Admin - Login & View Returns

**Test ID**: E2E-004
**User**: Admin
**Objective**: Admin views pending returns

#### Steps:

1. **Logout Customer**
   - Click logout button in navigation
   - ✅ Logged out successfully
   - ✅ Redirected to homepage or login

2. **Login as Admin**
   - Navigate to login page
   ```
   Email: admintest@autotek.com
   Password: Admin123456
   ```
   - Click "Login"
   - ✅ Login successful
   - ✅ Admin indicator in navigation (if any)

3. **Navigate to Admin Returns Management**
   ```
   URL: http://localhost:5173/admin/returns
   OR: Navigate via admin menu/dashboard
   ```
   - ✅ Admin returns page loads
   - ✅ All returns visible (from all customers)

4. **View Pending Returns**
   - ✅ See the newly created return
   - ✅ Customer information shown (testuser@autotek.com)
   - ✅ Order details visible (order ID, item count, refund amount)
   - ✅ Return reason shown in list (e.g. Defective)
   - ✅ Status: "Pending"
   - ✅ Image count shown in list if customer uploaded images
   - ✅ Action buttons available:
     - "Approve" button
     - "Reject" button
     - "View" (opens return detail for full reason, comments, and images)

5. **Filter/Search (if available)**
   - Try filtering by status: "Pending"
   - ✅ Filter works correctly

**Expected Results**:
- ✅ Admin can see all returns
- ✅ Customer details visible
- ✅ Pending return appears in list
- ✅ Action buttons available

**Screenshot Checklist**:
- [ ] Admin returns listing page
- [ ] Pending return with action buttons
- [ ] Customer information visible

---

### Phase 5: Admin - Approve Return

**Test ID**: E2E-005
**User**: Admin
**Objective**: Approve the pending return request

#### Steps:

1. **Click Approve Button**
   - From admin returns list or return detail page
   - Click "Approve" or "Approve Return" button
   - ✅ Confirmation dialog shown (if any)

2. **Confirm Approval**
   - If confirmation required, click "Confirm" or "Yes"
   - ✅ Loading indicator shown
   - ✅ Success message displayed
   - ✅ Status updates to "Approved"

3. **Verify Approval Results**
   - ✅ Return status badge changes to "Approved"
   - ✅ Shipping label generated and displayed
     - Format: `RETURN-XXXXXXXX`
     - Example: `RETURN-67A817CF`
   - ✅ New action buttons available:
     - "Process Refund" button
     - "Print Label" (if available)
   - ✅ Approval timestamp shown

4. **Check Email Notification** (if configured)
   - Customer should receive approval email
   - Check backend console logs for email simulation:
   ```
   Look for: "=== EMAIL ===" with subject containing "Return Approved"
   ```

**Expected Results**:
- ✅ Return approved successfully
- ✅ Status: Approved
- ✅ Shipping label generated
- ✅ Refund still pending (correct)
- ✅ Email notification sent (check logs)

**Screenshot Checklist**:
- [ ] Approved return with shipping label
- [ ] "Process Refund" button visible
- [ ] Status changed to "Approved"

**Data to Note**:
- Shipping Label: `RETURN-________`
- Status: Approved
- Refund Status: Pending

---

### Phase 6: Admin - Process Refund

**Test ID**: E2E-006
**User**: Admin
**Objective**: Process the refund for approved return

#### Steps:

1. **Click Process Refund Button**
   - From the approved return detail page
   - Click "Process Refund" button
   - ✅ Refund form/dialog shown (if any)

2. **Confirm Refund Amount**
   - ✅ Calculated refund amount displayed
   - ✅ Option to adjust amount (if available)
   - Accept default amount or enter custom amount

3. **Submit Refund**
   - Click "Process Refund" or "Confirm Refund"
   - ✅ Loading indicator shown
   - ✅ Success message: "Refund processing initiated"
   - ✅ Refund status changes to "Processing"

4. **Wait for Async Completion**
   - Wait ~3 seconds for async refund to complete
   - ✅ Page updates automatically OR refresh page
   - ✅ Refund status: "Completed"
   - ✅ Return status: "Completed"

5. **Verify Final State**
   - ✅ Return Status: Completed
   - ✅ Refund Status: Completed
   - ✅ Refund amount shown
   - ✅ Completion timestamp visible
   - ✅ No more action buttons (process complete)

**Expected Results**:
- ✅ Refund initiated successfully
- ✅ Async workflow completes (2-second delay)
- ✅ Both statuses update to "Completed"
- ✅ Email notification sent (check logs)

**Screenshot Checklist**:
- [ ] Refund processing state
- [ ] Completed return with refund complete
- [ ] Final state showing both statuses as "Completed"

**Data to Verify**:
- Refund Status: Completed
- Return Status: Completed
- Refund Amount: MWK _____ (should match calculation)

---

### Phase 7: Customer - View Completed Return

**Test ID**: E2E-007
**User**: Customer
**Objective**: Customer sees the completed return

#### Steps:

1. **Logout Admin**
   - Click logout button
   - ✅ Logged out successfully

2. **Login as Customer Again**
   ```
   Email: testuser@autotek.com
   Password: Test123456
   ```
   - ✅ Login successful

3. **Navigate to Returns Page**
   ```
   URL: http://localhost:5173/returns
   ```
   - ✅ Returns list loads

4. **View Completed Return**
   - ✅ Return status: "Completed"
   - ✅ Refund status: "Completed"
   - Click on return for details

5. **Verify Return Details**
   - ✅ Shipping label visible
   - ✅ Refund amount shown
   - ✅ Completion date visible
   - ✅ Status timeline/history (if available)
   - ✅ All original details preserved

**Expected Results**:
- ✅ Customer can see completed return
- ✅ All information accurate
- ✅ Refund processed confirmation
- ✅ Timeline shows full journey

**Screenshot Checklist**:
- [ ] Customer view of completed return
- [ ] Refund completed confirmation

---

## 🎨 UI/UX Testing Checklist

While going through the journey, verify:

### Visual Design
- [ ] Consistent color scheme
- [ ] Status badges clearly visible (Pending, Approved, Completed)
- [ ] Buttons properly styled
- [ ] Forms well-organized
- [ ] Mobile responsive (test if possible)

### User Experience
- [ ] Loading states shown during API calls
- [ ] Success/error notifications appear
- [ ] Breadcrumbs/navigation clear
- [ ] Return to previous pages easy
- [ ] Form validation works (required fields)

### Data Display
- [ ] Dates formatted correctly
- [ ] Currency formatted (MWK)
- [ ] Product images load (if available)
- [ ] Empty states handled (no returns yet)

### Accessibility
- [ ] Button labels clear
- [ ] Form labels descriptive
- [ ] Error messages helpful
- [ ] Tab navigation works

---

## 🐛 Bug Reporting Template

If you encounter any issues, note them using this template:

```
Bug ID: BUG-###
Page: [Page Name/URL]
User Type: [Customer/Admin]
Severity: [Critical/High/Medium/Low]

Steps to Reproduce:
1.
2.
3.

Expected Result:
[What should happen]

Actual Result:
[What actually happens]

Screenshot: [Yes/No]
Console Errors: [Copy paste if any]
```

---

## 📊 Test Results Summary Template

After completing all tests, fill this out:

```
Test Date: March 17, 2026
Tester: [Your Name]
Duration: [Time taken]

Phase 1 - Customer Login & Orders: [ ] PASS [ ] FAIL
Phase 2 - Request Return: [ ] PASS [ ] FAIL
Phase 3 - View Returns List: [ ] PASS [ ] FAIL
Phase 4 - Admin View Returns: [ ] PASS [ ] FAIL
Phase 5 - Admin Approve Return: [ ] PASS [ ] FAIL
Phase 6 - Admin Process Refund: [ ] PASS [ ] FAIL
Phase 7 - Customer View Completed: [ ] PASS [ ] FAIL

Overall Status: [ ] ALL PASS [ ] ISSUES FOUND

Issues Found: [Number]
Critical: [Number]
High: [Number]
Medium: [Number]
Low: [Number]

Notes:
[Any additional observations]
```

---

## 🚀 Quick Test Checklist

For rapid testing, verify these key points:

- [ ] Customer can request return ✓
- [ ] Return appears in customer's list ✓
- [ ] Admin can see the return ✓
- [ ] Admin can approve return ✓
- [ ] Shipping label generated ✓
- [ ] Admin can process refund ✓
- [ ] Refund completes (async) ✓
- [ ] Customer sees completed status ✓
- [ ] All data persists correctly ✓
- [ ] No console errors ✓

---

## 📞 Need Help?

**Backend Logs**: Check terminal running `npm run dev` in backend folder
**Frontend Logs**: Check browser console (F12)
**API Requests**: Use browser Network tab (F12 → Network)

**Test Credentials**:
- Customer: testuser@autotek.com / Test123456
- Admin: admintest@autotek.com / Admin123456

**Backend API Base**: http://localhost:5000/api
**Frontend Base**: http://localhost:5173

---

## ✅ Success Criteria

The test is successful if:

1. ✅ Customer can create return without errors
2. ✅ Return appears in both customer and admin views
3. ✅ Admin can approve and process refund
4. ✅ All status transitions work correctly
5. ✅ Data persists and displays accurately
6. ✅ UI is clear and user-friendly
7. ✅ No critical bugs or errors

---

**Good luck with testing!** 🚀

Take screenshots at each phase and report any issues you find.
