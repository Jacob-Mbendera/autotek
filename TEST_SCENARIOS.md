# AutoTek Test Scenarios

This document contains detailed test scenarios for all critical user flows in AutoTek.

## Customer Flows

### Scenario 1: Public Product Browsing (Unauthenticated)

**Objective**: Verify unauthenticated users can browse products and add to cart

**Steps**:
1. Navigate to `/products` without logging in
2. Verify products are displayed
3. Use search to find a specific product
4. Apply filters (category, price range)
5. Click on a product to view details
6. Add product to cart
7. Verify cart badge updates in header
8. Navigate to `/cart`
9. Verify items persist after page reload
10. Close browser and reopen - verify cart still persists (localStorage)

**Expected Results**:
- Products page loads without requiring authentication
- Search and filters work correctly
- Product details page accessible
- Cart updates correctly
- Cart persists in localStorage

**Test Data**:
- Product: "Engine Oil 5W-30"
- Category: "Engine Parts"
- Price: 52000 MWK

---

### Scenario 2: Authentication Flow with Return URL

**Objective**: Verify login/register redirects back to checkout

**Steps**:
1. Browse products as unauthenticated user
2. Add items to cart
3. Navigate to `/checkout`
4. Verify redirect to `/login?returnUrl=/checkout`
5. Enter credentials and login
6. Verify redirect back to `/checkout`
7. Verify cart items are still present
8. Logout
9. Repeat steps 1-3
10. Click "Register" link
11. Complete registration form
12. Verify redirect back to `/checkout` after registration

**Expected Results**:
- Checkout requires authentication
- Return URL is preserved
- User redirected back to checkout after login/register
- Cart persists through authentication flow

**Test Data**:
- Email: `testuser@example.com`
- Password: `Test123456`
- Phone: `+265991234567`

---

### Scenario 3: Complete Checkout Flow

**Objective**: Verify end-to-end checkout process

**Steps**:
1. Login as customer
2. Add multiple products to cart
3. Navigate to `/cart`
4. Verify cart totals are correct
5. Click "Proceed to Checkout"
6. Enter shipping address
7. Select payment method (Airtel Money)
8. Click "Place Order"
9. Verify order creation
10. Verify payment initiation
11. Verify redirect to order confirmation
12. Verify cart is cleared
13. Navigate to `/orders`
14. Verify new order appears in order history

**Expected Results**:
- Cart totals calculated correctly
- Order created successfully
- Payment initiated
- Cart cleared after order
- Order visible in order history

**Test Data**:
- Shipping Address: "123 Test Street, Lilongwe, Malawi"
- Payment Method: Airtel Money
- Phone: `+265991234567`

---

### Scenario 4: Order Tracking

**Objective**: Verify order tracking and status updates

**Steps**:
1. Login as customer
2. Navigate to `/orders`
3. Verify order list displays
4. Use search to find specific order
5. Apply date range filter
6. Toggle between grid and table view
7. Click on an order to view details
8. Verify order details page displays:
   - Order items
   - Shipping address
   - Payment status
   - Order status
   - Tracking timeline
9. Verify timeline shows correct status progression

**Expected Results**:
- Order list displays correctly
- Search and filters work
- View toggle works
- Order details complete
- Timeline accurate

---

## Payment Flows

### Scenario 5: Airtel Money Payment

**Objective**: Verify Airtel Money payment flow

**Steps**:
1. Complete checkout with Airtel Money selected
2. Verify payment initiation
3. Verify payment instructions displayed (if applicable)
4. Verify payment status updates
5. Navigate to order details
6. Verify payment status reflected

**Expected Results**:
- Payment initiated successfully
- Payment instructions clear
- Status updates correctly

**Note**: Requires Airtel Money API credentials for full testing

---

### Scenario 6: Bank Transfer Payment

**Objective**: Verify bank transfer payment flow

**Steps**:
1. Complete checkout with Bank Transfer selected
2. Verify payment instructions displayed
3. Verify bank account details shown
4. Verify order created with pending payment
5. Navigate to order details
6. Verify payment status is "pending"

**Expected Results**:
- Payment instructions displayed
- Bank details correct
- Order created successfully
- Payment status accurate

---

### Scenario 7: PayChangu Payment (If Available)

**Objective**: Verify PayChangu Standard Checkout flow

**Steps**:
1. Complete checkout with PayChangu selected
2. Verify redirect to PayChangu checkout page
3. Complete payment on PayChangu
4. Verify redirect back to `/payment/success`
5. Verify payment verification process
6. Verify order status updated
7. Test cancel flow (if applicable)
8. Verify redirect to `/payment/cancel` on cancel

**Expected Results**:
- Redirect to PayChangu works
- Return URL handling works
- Payment verification successful
- Cancel flow works

**Note**: Requires PayChangu API credentials

---

## Service Request Flows

### Scenario 8: Towing Service Request

**Objective**: Verify towing service booking flow

**Steps**:
1. Login as customer
2. Navigate to `/services`
3. Click "Request Towing Service"
4. Fill in form:
   - Pickup location
   - Destination
   - Vehicle details
   - Price
5. Submit request
6. Verify service request created
7. Navigate to service details
8. Verify service status is "pending"
9. Verify service tracking information

**Expected Results**:
- Service request form accessible
- Form validation works
- Service created successfully
- Service details display correctly
- Status tracking works

**Test Data**:
- Pickup: "Lilongwe City Centre"
- Destination: "Blantyre"
- Vehicle: Toyota Corolla 2015
- Price: 50000 MWK

---

### Scenario 9: Car Service Request

**Objective**: Verify car service booking flow

**Steps**:
1. Login as customer
2. Navigate to `/services`
3. Click "Request Car Service"
4. Fill in form:
   - Service type (oil-change, brake-pads, etc.)
   - Vehicle details
   - Address
   - Preferred date
   - Notes
5. Submit request
6. Verify service request created
7. Navigate to service details
8. Verify all information displayed correctly

**Expected Results**:
- Service type selection works
- Form validation works
- Service created successfully
- All details displayed correctly

**Test Data**:
- Service Type: "oil-change"
- Address: "123 Test Street, Lilongwe"
- Preferred Date: Tomorrow
- Notes: "Please call before arrival"

---

## Admin Flows

### Scenario 10: Admin Dashboard

**Objective**: Verify admin dashboard displays correctly

**Steps**:
1. Login as admin
2. Navigate to `/admin/dashboard`
3. Verify KPI cards display:
   - Total Revenue
   - Total Orders
   - Total Users
   - Pending Requests
4. Verify revenue chart displays
5. Verify order status distribution chart
6. Verify recent orders widget
7. Verify low stock alerts widget
8. Verify service requests widget
9. Verify all data is real (not mock)

**Expected Results**:
- All widgets load correctly
- Charts render properly
- Data is accurate
- No console errors

---

### Scenario 11: Admin Product Management

**Objective**: Verify admin can manage products

**Steps**:
1. Login as admin
2. Navigate to `/admin/products`
3. Verify product list displays
4. Click "Create Product"
5. Fill in product form:
   - Name, description, category
   - Price, stock
   - Upload image
6. Submit form
7. Verify product created
8. Edit product
9. Verify changes saved
10. Delete product
11. Verify product removed

**Expected Results**:
- Product list displays
- Create form works
- Image upload works
- Edit functionality works
- Delete works correctly

---

### Scenario 12: Admin Order Management

**Objective**: Verify admin can manage orders

**Steps**:
1. Login as admin
2. Navigate to `/admin/orders`
3. Verify all orders display
4. Apply filters (status, date)
5. Click on an order
6. Verify order details
7. Update order status
8. Verify status updated
9. Verify user sees updated status

**Expected Results**:
- Order list displays
- Filters work
- Order details complete
- Status update works
- Changes reflected for users

---

## Edge Cases & Error Handling

### Scenario 13: Empty States

**Objective**: Verify empty states display correctly

**Steps**:
1. Clear cart - verify empty cart message
2. Create new account - verify empty orders message
3. Search for non-existent product - verify "no results" message
4. Navigate to services with no requests - verify empty state

**Expected Results**:
- All empty states have helpful messages
- Empty states are visually clear
- Actions available from empty states

---

### Scenario 14: Error Handling

**Objective**: Verify error handling works correctly

**Steps**:
1. Stop backend server
2. Try to load products - verify error message
3. Try to create order - verify error handling
4. Enter invalid login credentials - verify error message
5. Submit form with missing required fields - verify validation
6. Try to access admin route as customer - verify 403 handling

**Expected Results**:
- Error messages are user-friendly
- No app crashes
- Errors handled gracefully
- User can recover from errors

---

### Scenario 15: Form Validation

**Objective**: Verify all form validations work

**Steps**:
1. Registration form:
   - Invalid email format
   - Weak password
   - Invalid phone number
   - Missing required fields
2. Checkout form:
   - Empty shipping address
   - No payment method selected
3. Service request forms:
   - Missing required fields
   - Invalid dates

**Expected Results**:
- All validations trigger correctly
- Error messages clear
- Forms don't submit with invalid data

---

### Scenario 16: Responsive Design

**Objective**: Verify responsive design works

**Steps**:
1. Test on mobile viewport (375px)
2. Test on tablet viewport (768px)
3. Test on desktop viewport (1920px)
4. Verify:
   - Navigation menu
   - Product cards
   - Cart display
   - Forms
   - Admin dashboard
   - Charts

**Expected Results**:
- All features work on all screen sizes
- No horizontal scrolling
- Touch targets appropriate size
- Text readable
- Layouts adapt correctly

---

## Performance Testing

### Scenario 17: Performance

**Objective**: Verify acceptable performance

**Steps**:
1. Measure page load times
2. Test with many products (100+)
3. Test with large cart (20+ items)
4. Test API response times
5. Test image loading
6. Test with slow network (throttle to 3G)

**Expected Results**:
- Page loads < 3 seconds
- API responses < 1 second
- Images load progressively
- App usable on slow connections

---

## Security Testing

### Scenario 18: Security

**Objective**: Verify security measures

**Steps**:
1. Try to access admin routes as customer
2. Try to access other user's orders
3. Try to modify order status as customer
4. Test XSS prevention (try script injection in forms)
5. Verify tokens stored securely
6. Test CSRF protection

**Expected Results**:
- Unauthorized access blocked
- User data isolated
- XSS prevented
- Tokens secure
- CSRF protection active

---

## Test Execution Log

Use this section to track test execution:

| Scenario | Status | Date | Tester | Notes |
|----------|--------|------|--------|-------|
| 1. Public Browsing | ⏳ Pending | - | - | - |
| 2. Authentication | ⏳ Pending | - | - | - |
| 3. Checkout Flow | ⏳ Pending | - | - | - |
| 4. Order Tracking | ⏳ Pending | - | - | - |
| 5. Airtel Money | ⏳ Pending | - | - | - |
| 6. Bank Transfer | ⏳ Pending | - | - | - |
| 7. PayChangu | ⏳ Pending | - | - | - |
| 8. Towing Service | ⏳ Pending | - | - | - |
| 9. Car Service | ⏳ Pending | - | - | - |
| 10. Admin Dashboard | ⏳ Pending | - | - | - |
| 11. Product Management | ⏳ Pending | - | - | - |
| 12. Order Management | ⏳ Pending | - | - | - |
| 13. Empty States | ⏳ Pending | - | - | - |
| 14. Error Handling | ⏳ Pending | - | - | - |
| 15. Form Validation | ⏳ Pending | - | - | - |
| 16. Responsive Design | ⏳ Pending | - | - | - |
| 17. Performance | ⏳ Pending | - | - | - |
| 18. Security | ⏳ Pending | - | - | - |

**Status Legend**:
- ✅ Passed
- ❌ Failed
- ⚠️ Partial
- ⏳ Pending
- 🔄 In Progress

---

**Last Updated**: March 3, 2025
