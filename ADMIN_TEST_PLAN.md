# Admin Side Testing Plan

## Overview
This document outlines the comprehensive testing plan for all admin functionality in the AutoTek application.

## Prerequisites

### 1. Create Admin User
If admin user doesn't exist, run:
```bash
cd backend
node create-admin-user.js
```

**Admin Credentials:**
- Email: `admin@autotek.com`
- Password: `Admin123456`

### 2. Start Servers
```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```

## Admin Features to Test

### 1. Admin Dashboard (`/admin/dashboard`)
**Backend Endpoint:** `GET /api/admin/stats`

**Test Cases:**
- [ ] Access dashboard as admin user
- [ ] Verify all KPI cards display correctly:
  - Total Orders
  - Pending Orders
  - Total Products
  - Out of Stock Products
  - Total Users
  - Towing Services
  - Car Services
  - Total Revenue
  - Pending Payments
- [ ] Verify charts render correctly:
  - Revenue Trends Chart
  - Order Status Distribution Chart
- [ ] Verify pending actions list displays correctly
- [ ] Test responsive design on mobile/tablet

**Expected Behavior:**
- Dashboard loads with real data from backend
- All statistics are accurate
- Charts are interactive and display correctly
- No console errors

---

### 2. Admin Products (`/admin/products`)
**Backend Endpoints:**
- `GET /api/products` (with admin filters)
- `POST /api/products` (create product)
- `PUT /api/products/:id` (update product)
- `DELETE /api/products/:id` (delete product)

**Test Cases:**
- [ ] View all products list
- [ ] Search products by name
- [ ] Filter products by category
- [ ] Filter products by status
- [ ] Pagination works correctly
- [ ] Create new product:
  - [ ] Fill all required fields
  - [ ] Upload product images
  - [ ] Set price, stock, category
  - [ ] Verify product appears in list
- [ ] Edit existing product:
  - [ ] Update product details
  - [ ] Update images
  - [ ] Update stock/price
  - [ ] Verify changes saved
- [ ] Delete product:
  - [ ] Confirm deletion
  - [ ] Verify product removed from list
- [ ] Test form validation:
  - [ ] Required fields
  - [ ] Price must be positive
  - [ ] Stock must be non-negative
  - [ ] Image upload validation

**Expected Behavior:**
- Products list loads correctly
- CRUD operations work as expected
- Form validation prevents invalid data
- Images upload and display correctly
- Success/error messages display appropriately

---

### 3. Admin Orders (`/admin/orders`)
**Backend Endpoint:** `GET /api/admin/orders`

**Test Cases:**
- [ ] View all orders list
- [ ] Filter orders by status (pending, processing, completed, cancelled)
- [ ] Filter orders by date range
- [ ] Search orders
- [ ] Pagination works correctly
- [ ] View order details:
  - [ ] Customer information
  - [ ] Order items
  - [ ] Payment information
  - [ ] Shipping address
- [ ] Update order status:
  - [ ] Change from pending to processing
  - [ ] Change from processing to completed
  - [ ] Cancel order
- [ ] Test responsive design

**Expected Behavior:**
- Orders list displays all orders
- Filters work correctly
- Order details are accurate
- Status updates reflect immediately
- No data loss on status change

---

### 4. Admin Services (`/admin/services`)
**Backend Endpoint:** `GET /api/admin/services`

**Test Cases:**
- [ ] View all services (towing + car services)
- [ ] Filter by service type (towing, car-service)
- [ ] Filter by status (pending, assigned, in-progress, completed, cancelled)
- [ ] Search services
- [ ] Pagination works correctly
- [ ] View service details:
  - [ ] Customer information
  - [ ] Service type and details
  - [ ] Location information
  - [ ] Status and timeline
- [ ] Update service status:
  - [ ] Assign service
  - [ ] Mark as in-progress
  - [ ] Complete service
  - [ ] Cancel service
- [ ] Test responsive design

**Expected Behavior:**
- Services list displays correctly
- Filters work as expected
- Service details are accurate
- Status updates work correctly
- Both towing and car services appear

---

### 5. Admin Custom Orders (`/admin/custom-orders`)
**Backend Endpoint:** `GET /api/admin/custom-orders`

**Test Cases:**
- [ ] View all custom orders
- [ ] Filter by status (pending, processing, completed, cancelled)
- [ ] Filter by date range
- [ ] Search custom orders
- [ ] Pagination works correctly
- [ ] View custom order details:
  - [ ] Customer information
  - [ ] Part details and specifications
  - [ ] Status and timeline
- [ ] Update custom order status:
  - [ ] Process custom order
  - [ ] Complete custom order
  - [ ] Cancel custom order
- [ ] Test responsive design

**Expected Behavior:**
- Custom orders list displays correctly
- Filters work as expected
- Order details are complete
- Status updates reflect immediately

---

### 6. Admin Users (`/admin/users`)
**Backend Endpoints:**
- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `PATCH /api/admin/users/:id/role`

**Test Cases:**
- [ ] View all users list
- [ ] Filter users by role (customer, admin, mechanic)
- [ ] Search users by name or email
- [ ] Pagination works correctly
- [ ] View user details:
  - [ ] User information
  - [ ] Role
  - [ ] Registration date
  - [ ] Contact information
- [ ] Update user role:
  - [ ] Change customer to admin
  - [ ] Change admin to customer
  - [ ] Change to mechanic
  - [ ] Verify role change reflects immediately
- [ ] Test form validation
- [ ] Test responsive design

**Expected Behavior:**
- Users list displays correctly
- Filters work as expected
- User details are accurate
- Role updates work correctly
- Cannot change own role (if implemented)

---

## API Testing (Backend)

### Test Admin Authentication
```bash
# Login as admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@autotek.com","password":"Admin123456"}'

# Save token
export ADMIN_TOKEN="<token_from_response>"
```

### Test Admin Stats Endpoint
```bash
curl -X GET http://localhost:5000/api/admin/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Test Admin Orders Endpoint
```bash
# Get all orders
curl -X GET "http://localhost:5000/api/admin/orders?page=1&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Filter by status
curl -X GET "http://localhost:5000/api/admin/orders?status=pending" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Test Admin Services Endpoint
```bash
# Get all services
curl -X GET "http://localhost:5000/api/admin/services?page=1&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Filter by type
curl -X GET "http://localhost:5000/api/admin/services?type=towing" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Test Admin Users Endpoint
```bash
# Get all users
curl -X GET "http://localhost:5000/api/admin/users?page=1&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Get specific user
curl -X GET "http://localhost:5000/api/admin/users/<user_id>" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Update user role
curl -X PATCH "http://localhost:5000/api/admin/users/<user_id>/role" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'
```

---

## Frontend Testing Checklist

### Navigation & Access Control
- [ ] Admin sidebar navigation works correctly
- [ ] All admin routes are protected (require admin role)
- [ ] Non-admin users cannot access admin routes
- [ ] Logout works correctly
- [ ] Active route is highlighted in sidebar

### UI/UX Testing
- [ ] All pages load without errors
- [ ] Loading states display correctly
- [ ] Error messages are user-friendly
- [ ] Success messages display after actions
- [ ] Forms validate input correctly
- [ ] Modals open/close correctly
- [ ] Responsive design works on mobile/tablet

### Data Display
- [ ] Tables display data correctly
- [ ] Pagination works
- [ ] Filters apply correctly
- [ ] Search functionality works
- [ ] Sorting works (if implemented)
- [ ] Empty states display when no data

---

## Common Issues to Check

1. **Authentication Issues:**
   - Token expiration
   - Invalid token handling
   - Role-based access control

2. **Data Issues:**
   - Missing data handling
   - Incorrect data display
   - Data not refreshing after updates

3. **Performance Issues:**
   - Slow page loads
   - Large dataset handling
   - Image loading issues

4. **UI Issues:**
   - Layout breaks on different screen sizes
   - Overlapping elements
   - Missing icons/images
   - Form validation errors

---

## Test Results Template

```
Date: [Date]
Tester: [Name]
Environment: [Development/Staging/Production]

### Dashboard
- Status: [Pass/Fail]
- Issues: [List any issues]

### Products
- Status: [Pass/Fail]
- Issues: [List any issues]

### Orders
- Status: [Pass/Fail]
- Issues: [List any issues]

### Services
- Status: [Pass/Fail]
- Issues: [List any issues]

### Custom Orders
- Status: [Pass/Fail]
- Issues: [List any issues]

### Users
- Status: [Pass/Fail]
- Issues: [List any issues]

### Overall
- Status: [Pass/Fail]
- Critical Issues: [List critical issues]
- Recommendations: [Any recommendations]
```

---

## Next Steps After Testing

1. Document all bugs found
2. Prioritize fixes (Critical, High, Medium, Low)
3. Create bug tickets/issues
4. Fix critical issues first
5. Re-test after fixes
6. Update test plan based on findings
