# Frontend Admin Testing Guide

## Quick Start

### 1. Run the Testing Script
```bash
./test-frontend-admin.sh
```

This script will:
- ✅ Check if servers are running
- ✅ Test admin authentication
- ✅ Verify all backend API endpoints
- ✅ Provide testing URLs and checklist

### 2. Manual Browser Testing

#### Step 1: Login
1. Open: http://localhost:5173/login
2. Login with:
   - Email: `admin@autotek.com`
   - Password: `Admin123456`

#### Step 2: Test Each Admin Page

**Dashboard** (`/admin/dashboard`)
- [ ] All KPI cards show correct numbers
- [ ] Charts render (Revenue Trends, Order Status)
- [ ] Pending actions list displays
- [ ] No console errors

**Products** (`/admin/products`)
- [ ] Product list loads
- [ ] Search works
- [ ] Filters work (category, status)
- [ ] Pagination works
- [ ] Create new product
- [ ] Edit existing product
- [ ] Delete product
- [ ] Form validation works

**Orders** (`/admin/orders`)
- [ ] Orders list loads
- [ ] Status filter works
- [ ] Date range filter works
- [ ] Order details view works
- [ ] Status update works

**Services** (`/admin/services`)
- [ ] Services list loads
- [ ] Both towing and car services show
- [ ] Type filter works
- [ ] Status filter works
- [ ] Service details view works
- [ ] Status update works

**Custom Orders** (`/admin/custom-orders`)
- [ ] Custom orders list loads
- [ ] Status filter works
- [ ] Order details view works
- [ ] Status update works

**Users** (`/admin/users`)
- [ ] Users list loads
- [ ] Role filter works
- [ ] Search works
- [ ] User details view works
- [ ] Role update works

## Browser Console Checks

Open Developer Tools (F12) and check:

### Console Tab
- [ ] No red errors
- [ ] No warnings about missing data
- [ ] No React errors
- [ ] No API call failures

### Network Tab
- [ ] All API calls return 200 status
- [ ] No failed requests
- [ ] Response times are reasonable
- [ ] No CORS errors

### Application Tab
- [ ] Token is stored correctly
- [ ] User data is stored correctly
- [ ] No storage errors

## Common Issues to Check

### Authentication
- [ ] Login works
- [ ] Token persists after page refresh
- [ ] Logout works
- [ ] Non-admin users cannot access admin routes

### Data Display
- [ ] All lists load correctly
- [ ] Pagination works
- [ ] Filters apply correctly
- [ ] Search works
- [ ] Empty states display when no data

### Forms
- [ ] Form validation works
- [ ] Required fields are marked
- [ ] Error messages are clear
- [ ] Success messages display
- [ ] Form resets after submission

### UI/UX
- [ ] Responsive design works
- [ ] Loading states show
- [ ] Error states display
- [ ] No layout breaks
- [ ] Icons/images load
- [ ] Navigation works smoothly

## Testing URLs

```
Login:           http://localhost:5173/login
Dashboard:       http://localhost:5173/admin/dashboard
Products:        http://localhost:5173/admin/products
Orders:          http://localhost:5173/admin/orders
Services:        http://localhost:5173/admin/services
Custom Orders:   http://localhost:5173/admin/custom-orders
Users:           http://localhost:5173/admin/users
```

## Test Data

Current system has:
- 34 orders (all pending)
- 31 products
- 3 users (1 admin, 1 customer, 1 mechanic)
- 22 towing services
- 13 car services

## Reporting Issues

When you find an issue, document:
1. **Page/Component**: Which page has the issue
2. **Steps to Reproduce**: What you did to trigger it
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happened
5. **Console Errors**: Any errors in browser console
6. **Screenshots**: If applicable

## Quick API Test Commands

```bash
# Get admin token
ADMIN_TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@autotek.com","password":"Admin123456"}' \
  | jq -r '.token')

# Test stats
curl -X GET http://localhost:5000/api/admin/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Test users
curl -X GET "http://localhost:5000/api/admin/users?page=1&limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

## Next Steps

1. Run the testing script: `./test-frontend-admin.sh`
2. Open each admin page in browser
3. Test all functionality systematically
4. Document any issues found
5. Fix critical issues first
6. Re-test after fixes
