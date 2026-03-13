# Frontend Testing Script

## Prerequisites

1. **Start Backend Server:**
   ```bash
   cd backend
   npm run dev
   ```
   Server should be running on `http://localhost:5000`

2. **Start Frontend Server:**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend should be running on `http://localhost:5173`

3. **Open Browser:**
   - Open Chrome/Firefox
   - Open Developer Tools (F12)
   - Go to `http://localhost:5173`

---

## Test Checklist

### 🔐 Authentication & Account Recovery

#### Test 1: User Registration
- [ ] Navigate to `/register`
- [ ] Fill in registration form:
  - Name: `Test User`
  - Email: `testuser@example.com`
  - Phone: `+265991234567`
  - Password: `password123`
- [ ] Submit form
- [ ] Verify success message
- [ ] Check if redirected to home or login

**Expected Results:**
- ✅ Registration form displays correctly
- ✅ Form validation works (required fields, email format, phone format)
- ✅ Success toast notification appears: "Account created successfully"
- ✅ User is redirected to home page or login page
- ✅ User account is created in database
- ✅ No console errors

#### Test 2: User Login
- [ ] Navigate to `/login`
- [ ] Enter credentials:
  - Email: `testuser@example.com`
  - Password: `password123`
- [ ] Click "Login"
- [ ] Verify successful login
- [ ] Check if redirected to home
- [ ] Verify user menu shows in header

**Expected Results:**
- ✅ Login form displays correctly
- ✅ Form validation works (required fields, email format)
- ✅ Success toast notification appears: "Login successful"
- ✅ User is redirected to home page
- ✅ User menu appears in header with user name/email
- ✅ Authentication token is stored in localStorage
- ✅ User state is updated in Redux store
- ✅ No console errors

#### Test 3: Password Reset Flow
- [ ] Navigate to `/login`
- [ ] Click "Forgot your password?" link
- [ ] Verify redirect to `/forgot-password`
- [ ] Enter email: `testuser@example.com`
- [ ] Submit form
- [ ] Verify success message (check backend logs for email)
- [ ] **Note:** In dev mode, check backend console for reset token
- [ ] Copy reset token from backend logs
- [ ] Navigate to `/reset-password?token=<TOKEN>`
- [ ] Enter new password: `newpassword123`
- [ ] Confirm password: `newpassword123`
- [ ] Submit form
- [ ] Verify success message
- [ ] Try logging in with new password

**Expected Results:**
- ✅ "Forgot password?" link is visible on login page
- ✅ Redirects to `/forgot-password` page
- ✅ Email input form displays correctly
- ✅ Success message appears: "Password reset email sent"
- ✅ Reset token is generated and logged in backend (dev mode)
- ✅ Reset password page loads with token from URL
- ✅ Password form validation works (matching passwords, minimum length)
- ✅ Success message appears: "Password reset successfully"
- ✅ User can login with new password
- ✅ Old password no longer works
- ✅ No console errors

---

### 🛍️ Product Browsing & Wishlist

#### Test 4: Product List View
- [ ] Navigate to `/products`
- [ ] Verify products load
- [ ] Test view toggle (Grid/List/Table)
- [ ] Test search functionality
- [ ] Test category filter
- [ ] Test price range filter
- [ ] Test sorting options
- [ ] **Check wishlist button visibility:**
  - [ ] When NOT logged in: Button should not appear
  - [ ] When logged in: Heart icon appears on hover (grid view)
  - [ ] When logged in: Heart icon visible in list view

**Expected Results:**
- ✅ Products page loads with product grid/list
- ✅ Products display with images, names, prices
- ✅ View toggle switches between Grid/List/Table views
- ✅ Search filters products in real-time
- ✅ Category filter updates product list
- ✅ Price range filter works correctly
- ✅ Sorting options work (price, name, newest, etc.)
- ✅ Wishlist button hidden when not logged in
- ✅ Wishlist button visible on hover when logged in (grid view)
- ✅ Wishlist button always visible in list view when logged in
- ✅ Loading state shows while fetching products
- ✅ No console errors

#### Test 5: Product Detail Page
- [ ] Click on any product
- [ ] Verify product details load
- [ ] Check product images
- [ ] Verify price and description
- [ ] **Test wishlist toggle:**
  - [ ] Click heart icon (if logged in)
  - [ ] Verify toast notification
  - [ ] Check if product added to wishlist
  - [ ] Click again to remove
  - [ ] Verify removal notification
- [ ] **Test reviews section:**
  - [ ] Scroll to reviews section
  - [ ] Verify review statistics display
  - [ ] Check review list loads
  - [ ] If logged in, verify "Write a Review" form
  - [ ] Submit a review:
    - Select rating (1-5 stars)
    - Write comment
    - Submit
  - [ ] Verify review appears in list
  - [ ] Test "Helpful" button on reviews

**Expected Results:**
- ✅ Product detail page loads with all product information
- ✅ Product images display correctly (main image + thumbnails if available)
- ✅ Price, description, and specifications display
- ✅ "Add to Cart" button is visible and functional
- ✅ Wishlist heart icon toggles correctly
- ✅ Toast notification: "Added to wishlist" / "Removed from wishlist"
- ✅ Review statistics show: average rating, total reviews, rating distribution
- ✅ Review list displays with user names, ratings, comments, dates
- ✅ "Write a Review" form appears when logged in
- ✅ Review submission shows success message
- ✅ New review appears in list immediately
- ✅ "Helpful" button increments count and updates UI
- ✅ Verified purchase badge shows for verified purchases
- ✅ No console errors

#### Test 6: Wishlist Page
- [ ] Navigate to `/wishlist` (must be logged in)
- [ ] Verify wishlist page loads
- [ ] Check hero section with statistics
- [ ] Verify wishlist items display
- [ ] Test removing item from wishlist
- [ ] Test "Add to Cart" from wishlist
- [ ] Verify empty state when wishlist is empty

**Expected Results:**
- ✅ Wishlist page loads with hero section
- ✅ Statistics cards display: Total Value, Saved Items, In Stock, Average Price
- ✅ Wishlist items display in grid/list format
- ✅ Each item shows: image, name, price, stock status
- ✅ "Remove" button removes item from wishlist
- ✅ Toast notification: "Removed from wishlist"
- ✅ "Add to Cart" button adds item to cart
- ✅ Toast notification: "Added to cart"
- ✅ Empty state displays when wishlist is empty: "Your wishlist is empty"
- ✅ Redirects to login if not authenticated
- ✅ No console errors

---

### 🛒 Shopping Cart & Checkout

#### Test 7: Add to Cart
- [ ] Navigate to `/products`
- [ ] Click on a product
- [ ] Click "Add to Cart"
- [ ] Verify toast notification
- [ ] Check cart icon in header shows item count
- [ ] Navigate to `/cart`
- [ ] Verify item appears in cart

**Expected Results:**
- ✅ "Add to Cart" button is clickable
- ✅ Success toast notification appears: "Added to cart"
- ✅ Cart icon in header updates with item count badge
- ✅ Item count is accurate
- ✅ Cart page shows the added item
- ✅ Item details are correct (name, price, quantity)
- ✅ Cart total updates correctly
- ✅ No console errors

#### Test 8: Cart Page
- [ ] Navigate to `/cart`
- [ ] Verify cart page loads with hero section
- [ ] Check statistics cards display:
  - Cart Total
  - Items in Cart
  - Average Item Price
- [ ] Test quantity controls:
  - [ ] Increase quantity
  - [ ] Decrease quantity
  - [ ] Verify total updates
- [ ] Test "Remove" button
- [ ] Test "Save for Later" (if implemented)
- [ ] Test "Add Note" to item
- [ ] **Test Promo Code:**
  - [ ] Enter invalid code: `INVALID123`
  - [ ] Click "Apply"
  - [ ] Verify error message
  - [ ] Enter valid code: `NOW10` (or create one via admin)
  - [ ] Click "Apply"
  - [ ] Verify discount applied
  - [ ] Check total updates with discount
  - [ ] Test "Remove" coupon button

**Expected Results:**
- ✅ Cart page loads with hero section and breadcrumbs
- ✅ Statistics cards display correct values
- ✅ All cart items display with images, names, prices
- ✅ Quantity controls (+/-) work correctly
- ✅ Cart total updates in real-time when quantity changes
- ✅ "Remove" button removes item and updates total
- ✅ "Save for Later" moves item to saved items (if implemented)
- ✅ Item notes can be added and saved
- ✅ Invalid promo code shows error: "Invalid or expired coupon code"
- ✅ Valid promo code shows success: "Coupon applied successfully"
- ✅ Discount amount displays clearly
- ✅ Final total shows: Subtotal - Discount = Total
- ✅ "Remove" coupon button removes discount and restores original total
- ✅ "Proceed to Checkout" button is visible and functional
- ✅ Empty cart shows empty state message
- ✅ No console errors

#### Test 9: Guest Checkout Flow
- [ ] **Logout first** (if logged in)
- [ ] Add items to cart
- [ ] Navigate to `/cart`
- [ ] Click "Proceed to Checkout"
- [ ] Verify redirect to `/checkout`
- [ ] **Verify checkout progress indicator:**
  - [ ] Step 1: Shipping (active)
  - [ ] Step 2: Payment (inactive)
  - [ ] Step 3: Review (inactive)
- [ ] Fill in guest information:
  - Name: `Guest User`
  - Email: `guest@test.com`
  - Phone: `+265991234567`
- [ ] Fill shipping address
- [ ] Select payment method
- [ ] **Test optional "Create Account" checkbox:**
  - [ ] Check the box
  - [ ] Verify password fields appear
  - [ ] Uncheck the box
  - [ ] Verify password fields hide
- [ ] **Apply coupon (if available):**
  - [ ] Enter coupon code
  - [ ] Verify discount applied
- [ ] Review order summary
- [ ] Click "Place Order"
- [ ] Verify order created successfully
- [ ] **Note the order ID** (for guest order lookup test)

**Expected Results:**
- ✅ Checkout page loads without requiring authentication
- ✅ Checkout progress indicator shows 3 steps (Shipping, Payment, Review)
- ✅ Step 1 (Shipping) is highlighted as active
- ✅ Guest information form displays: Name, Email, Phone
- ✅ Form validation works (required fields, email format, phone format)
- ✅ Shipping address form displays correctly
- ✅ Payment method options display: Airtel Money, Bank Transfer, PayChangu
- ✅ "Create Account" checkbox toggles password fields
- ✅ Coupon code input and apply button work
- ✅ Order summary shows: Items, Subtotal, Discount, Shipping, Total
- ✅ "Place Order" button is enabled when form is valid
- ✅ Success message appears: "Order placed successfully"
- ✅ Order confirmation page shows order ID
- ✅ Order is created in database with guest info
- ✅ Redirects to order detail page or confirmation page
- ✅ No console errors

#### Test 10: Authenticated Checkout Flow
- [ ] **Login first**
- [ ] Add items to cart
- [ ] Navigate to `/checkout`
- [ ] Verify user info pre-filled
- [ ] Verify checkout progress indicator shows all steps
- [ ] Apply coupon code
- [ ] Complete checkout
- [ ] Verify order created

**Expected Results:**
- ✅ User information is pre-filled from profile
- ✅ Checkout progress indicator shows all steps
- ✅ Can edit pre-filled information if needed
- ✅ Coupon code can be applied
- ✅ Order summary displays correctly
- ✅ "Place Order" button works
- ✅ Success message appears
- ✅ Order is created and associated with user account
- ✅ Redirects to order detail page
- ✅ Order appears in user's orders list
- ✅ No console errors

---

### 📦 Orders & Order Management

#### Test 11: Orders Page (Authenticated)
- [ ] Navigate to `/orders` (must be logged in)
- [ ] Verify orders page loads
- [ ] Check hero section with statistics:
  - Total Spent
  - Completed Orders
  - Pending Orders
  - Average Order Value
- [ ] Test filters:
  - [ ] Status filter (All, Pending, Processing, etc.)
  - [ ] Date range filter
- [ ] Test search functionality
- [ ] Test sorting options
- [ ] Test view toggle (Grid/Table)
- [ ] Test pagination (if multiple pages)
- [ ] Test export to CSV (if implemented)
- [ ] Click on an order to view details

**Expected Results:**
- ✅ Orders page loads with hero section
- ✅ Statistics cards display correct values
- ✅ All user orders are displayed
- ✅ Each order shows: Order ID, Date, Status, Total Amount
- ✅ Status filter updates order list correctly
- ✅ Date range filter works
- ✅ Search finds orders by ID or product name
- ✅ Sorting works: Date (newest/oldest), Amount (high/low), Status
- ✅ View toggle switches between Grid and Table views
- ✅ Pagination works if more than one page
- ✅ Export to CSV downloads file (if implemented)
- ✅ Clicking order navigates to order detail page
- ✅ Empty state shows if no orders: "No orders found"
- ✅ Loading state shows while fetching
- ✅ No console errors

#### Test 12: Order Detail Page
- [ ] Navigate to `/orders/:id` (use an order ID)
- [ ] Verify order details load
- [ ] Check order information:
  - Order ID
  - Status
  - Date
  - Items
  - Total amount
  - Shipping address
  - Payment method
- [ ] **Test Order Cancellation:**
  - [ ] If order status is "pending" or "processing"
  - [ ] Click "Cancel Order" button
  - [ ] Verify confirmation modal appears
  - [ ] Confirm cancellation
  - [ ] Verify order status changes to "cancelled"
  - [ ] Verify success message

**Expected Results:**
- ✅ Order detail page loads with all order information
- ✅ Order ID, status, and date are displayed
- ✅ All order items show: Product image, name, quantity, price
- ✅ Order totals display: Subtotal, Discount, Shipping, Total
- ✅ Shipping address displays correctly
- ✅ Payment method and status display
- ✅ "Cancel Order" button visible for pending/processing orders
- ✅ Confirmation modal appears with warning message
- ✅ Cancellation updates order status to "cancelled"
- ✅ Success toast: "Order cancelled successfully"
- ✅ "Cancel Order" button disappears after cancellation
- ✅ "Request Return" button visible for completed orders
- ✅ Loading state shows while fetching
- ✅ No console errors

#### Test 13: Guest Order Lookup
- [ ] **Logout first**
- [ ] Navigate to `/orders/:id?email=guest@test.com`
  - Use the order ID from Test 9 (guest checkout)
- [ ] Verify order details load
- [ ] Verify guest information displays
- [ ] Test cancellation from guest order view

**Expected Results:**
- ✅ Order detail page loads with email parameter
- ✅ Guest information displays: Name, Email, Phone
- ✅ All order details are visible (same as authenticated view)
- ✅ "Cancel Order" button works for guest orders
- ✅ Cancellation requires email confirmation
- ✅ Success message appears after cancellation
- ✅ Error message if email doesn't match order
- ✅ No console errors

---

### 👤 Profile Page

#### Test 14: Profile Page
- [ ] Navigate to `/profile` (must be logged in)
- [ ] Verify profile page loads
- [ ] Check hero section with:
  - User avatar
  - User name
  - Quick action buttons
- [ ] Verify statistics cards:
  - Total Spent
  - Total Orders
  - Services
  - Member For
- [ ] **Test Personal Information Edit:**
  - [ ] Click "Edit" button
  - [ ] Update name, phone, address
  - [ ] Save changes
  - [ ] Verify success message
  - [ ] Verify changes reflected
- [ ] **Test Password Change:**
  - [ ] Scroll to password section
  - [ ] Enter current password
  - [ ] Enter new password
  - [ ] Confirm new password
  - [ ] Submit
  - [ ] Verify success message
- [ ] Check activity timeline section

**Expected Results:**
- ✅ Profile page loads with hero section
- ✅ User avatar, name, and email display
- ✅ Statistics cards show correct values
- ✅ "Edit" button toggles edit mode
- ✅ Form fields become editable
- ✅ Form validation works
- ✅ Success toast: "Profile updated successfully"
- ✅ Changes are reflected immediately
- ✅ Password change form validates matching passwords
- ✅ Success toast: "Password changed successfully"
- ✅ Activity timeline shows recent orders and services
- ✅ Member duration calculates correctly
- ✅ No console errors

---

### 🎫 Coupon System

#### Test 15: Coupon Application in Cart
- [ ] Add items to cart (total > 5000 MWK)
- [ ] Navigate to `/cart`
- [ ] Scroll to promo code section
- [ ] Enter invalid coupon: `INVALID`
- [ ] Click "Apply"
- [ ] Verify error message
- [ ] Enter valid coupon: `NOW10` (or create via admin)
- [ ] Click "Apply"
- [ ] Verify:
  - Success message
  - Discount displayed
  - Total updated
  - Coupon code shown
- [ ] Click "Remove" coupon
- [ ] Verify coupon removed and total restored

**Expected Results:**
- ✅ Promo code input field is visible
- ✅ Invalid coupon shows error: "Invalid or expired coupon code"
- ✅ Valid coupon shows success: "Coupon applied successfully"
- ✅ Discount amount displays clearly
- ✅ Cart total updates: Subtotal - Discount = Total
- ✅ Applied coupon code is displayed
- ✅ "Remove" button removes coupon
- ✅ Total restores to original amount
- ✅ Coupon persists in cart state
- ✅ No console errors

#### Test 16: Coupon in Checkout
- [ ] Proceed to checkout with items
- [ ] Scroll to order summary
- [ ] Enter coupon code
- [ ] Apply coupon
- [ ] Verify discount applied in order summary
- [ ] Complete checkout
- [ ] Verify order includes coupon code and discount

**Expected Results:**
- ✅ Coupon code input available in checkout
- ✅ Coupon validation works
- ✅ Discount appears in order summary
- ✅ Final total includes discount
- ✅ Order is created with coupon code
- ✅ Order detail shows applied coupon and discount amount
- ✅ No console errors

---

### 🎨 UI/UX Testing

#### Test 17: Responsive Design
- [ ] Test on desktop (1920x1080)
- [ ] Test on tablet (768px width)
- [ ] Test on mobile (375px width)
- [ ] Verify:
  - Navigation works on all sizes
  - Forms are usable
  - Buttons are clickable
  - Text is readable
  - Images scale properly

**Expected Results:**
- ✅ Desktop: Full layout with sidebar/navigation visible
- ✅ Tablet: Layout adapts, navigation may collapse to menu
- ✅ Mobile: Single column layout, hamburger menu
- ✅ All navigation links work on all screen sizes
- ✅ Forms are fully usable (no cut-off fields)
- ✅ Buttons are appropriately sized and clickable
- ✅ Text is readable without zooming
- ✅ Images scale proportionally
- ✅ No horizontal scrolling
- ✅ Touch targets are at least 44x44px on mobile
- ✅ No console errors

#### Test 18: Loading States
- [ ] Check loading spinners appear during API calls
- [ ] Verify skeleton loaders on product lists
- [ ] Check button loading states during form submission

**Expected Results:**
- ✅ Loading spinners appear during API calls
- ✅ Skeleton loaders show on product lists while loading
- ✅ Buttons show loading state (spinner + disabled) during submission
- ✅ Loading states prevent duplicate submissions
- ✅ Loading indicators are clearly visible
- ✅ No console errors

#### Test 19: Error Handling
- [ ] Test with network disconnected
- [ ] Verify error messages display
- [ ] Test invalid form inputs
- [ ] Verify validation messages

**Expected Results:**
- ✅ Network errors show user-friendly message: "Network error. Please check your connection."
- ✅ API errors display appropriate messages
- ✅ Form validation shows inline error messages
- ✅ Required fields show error when empty
- ✅ Email format validation works
- ✅ Phone format validation works
- ✅ Password strength validation works (if implemented)
- ✅ Error messages are clear and actionable
- ✅ No console errors (handled gracefully)

#### Test 20: Toast Notifications
- [ ] Perform various actions:
  - Add to cart
  - Add to wishlist
  - Apply coupon
  - Update profile
  - Cancel order
- [ ] Verify toast notifications appear
- [ ] Check notifications auto-dismiss
- [ ] Verify success/error styling

**Expected Results:**
- ✅ Toast notifications appear for all actions
- ✅ Success toasts: Green background, checkmark icon
- ✅ Error toasts: Red background, X icon
- ✅ Info toasts: Blue background (if applicable)
- ✅ Toasts auto-dismiss after 3-5 seconds
- ✅ Toasts can be manually dismissed (X button)
- ✅ Multiple toasts stack correctly
- ✅ Toast messages are clear and concise
- ✅ No console errors

---

### 🔍 Browser Console Checks

Open Developer Tools (F12) and verify:

#### Console Tab
- [ ] No red errors
- [ ] No React warnings
- [ ] No API call failures
- [ ] No missing dependency warnings

#### Network Tab
- [ ] All API calls return 200 status
- [ ] No failed requests
- [ ] Response times are reasonable (< 1s)
- [ ] No CORS errors

#### Application Tab (Local Storage)
- [ ] Token stored correctly (if logged in)
- [ ] Cart data persists
- [ ] User data stored correctly

---

## Test Data Setup

### Create Test Coupon (via Admin or Backend)

```bash
# Login as admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'

# Create coupon (use token from above)
curl -X POST http://localhost:5000/api/coupons/admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "code": "SAVE10",
    "type": "percentage",
    "value": 10,
    "validFrom": "2024-01-01T00:00:00Z",
    "validTo": "2025-12-31T23:59:59Z",
    "minOrderValue": 5000,
    "active": true
  }'
```

### Test User Credentials
- **Email:** `testuser@example.com`
- **Password:** `newpassword123` (or `password123` if not reset)

### Admin Credentials
- **Email:** `admin@test.com`
- **Password:** `admin123`

---

## Critical Paths to Test

### Path 1: Guest Purchase Flow
1. Browse products (not logged in)
2. Add product to cart
3. Go to cart
4. Apply coupon
5. Proceed to checkout
6. Fill guest information
7. Place order
8. Note order ID
9. Look up order by email

### Path 2: Authenticated Purchase Flow
1. Register/Login
2. Browse products
3. Add to wishlist
4. Add to cart from wishlist
5. Go to cart
6. Apply coupon
7. Proceed to checkout
8. Complete order
9. View order in orders page
10. Cancel order (if pending)

### Path 3: Product Review Flow
1. Login
2. Purchase a product (or have existing order)
3. Go to product detail page
4. Write a review
5. Submit review
6. Verify review appears
7. Mark another review as helpful

---

## Issues to Report

When you find an issue, document:

1. **Page/Component:** Which page has the issue
2. **Steps to Reproduce:** Exact steps to trigger it
3. **Expected Behavior:** What should happen
4. **Actual Behavior:** What actually happened
5. **Console Errors:** Any errors in browser console
6. **Network Errors:** Any failed API calls
7. **Screenshots:** If applicable
8. **Browser/OS:** Browser version and OS

---

## Quick Test Commands

```bash
# Check if backend is running
curl http://localhost:5000/api/health

# Check if frontend is running
curl http://localhost:5173

# Test coupon validation
curl -X POST http://localhost:5000/api/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{"code":"SAVE10","orderTotal":10000}'
```

---

## Testing Priority

### High Priority (Must Test)
- ✅ Guest checkout flow
- ✅ Coupon application
- ✅ Order cancellation
- ✅ Product reviews
- ✅ Wishlist functionality
- ✅ Password reset

### Medium Priority (Should Test)
- ✅ Profile page features
- ✅ Orders page filters
- ✅ Cart functionality
- ✅ Checkout progress indicator

### Low Priority (Nice to Test)
- ✅ Responsive design
- ✅ Loading states
- ✅ Error handling
- ✅ Toast notifications

---

## Success Criteria

All tests pass if:
- ✅ No console errors
- ✅ All API calls succeed
- ✅ All forms submit successfully
- ✅ All navigation works
- ✅ All features function as expected
- ✅ UI is responsive and usable
- ✅ Error messages are clear
- ✅ Success messages appear

---

**Happy Testing! 🚀**
