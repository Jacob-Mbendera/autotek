# AutoTek Testing Guide

## Overview

This guide outlines the testing strategy and approach for AutoTek MVP. Since we're focusing on MVP launch, we're using **manual testing** as the primary testing method. Automated testing will be added post-launch.

## Testing Strategy

### Current Approach: Manual Testing
- **Rationale**: Faster MVP development, focus on functionality over test coverage
- **Scope**: All critical user flows, features, and edge cases
- **Tools**: Browser DevTools, Postman/curl for API testing, manual browser testing

### Future Approach: Automated Testing
- **Unit Tests**: Jest + React Testing Library (for critical components)
- **Integration Tests**: End-to-end flows with Playwright/Cypress
- **API Tests**: Automated API testing suite

## Testing Checklist

### Pre-Testing Setup
- [ ] Backend server running (`npm run dev` in `backend/`)
- [ ] Frontend server running (`npm run dev` in `frontend/`)
- [ ] MongoDB connection verified
- [ ] Test user accounts created (customer, admin)
- [ ] Test data seeded (products, orders, services)

### Browser/Device Testing Matrix

#### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (if available)
- [ ] Edge (if available)

#### Mobile Devices
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS, if available)
- [ ] Responsive design (320px - 768px)

#### Screen Sizes
- [ ] Mobile (320px - 768px)
- [ ] Tablet (768px - 1024px)
- [ ] Desktop (1024px+)

## Test Scenarios by Feature

### Authentication
- [ ] User registration with valid data
- [ ] User registration with invalid data (validation)
- [ ] User login with valid credentials
- [ ] User login with invalid credentials
- [ ] Protected route access (redirects to login)
- [ ] Return URL handling (redirect after login)
- [ ] Token expiration handling
- [ ] Logout functionality

### Product Browsing (Public)
- [ ] Browse products page (unauthenticated)
- [ ] View product details (unauthenticated)
- [ ] Product search functionality
- [ ] Product filtering (category, price, status)
- [ ] Product pagination
- [ ] Add product to cart (unauthenticated)
- [ ] Cart persistence across page reloads

### Shopping Cart
- [ ] Add items to cart
- [ ] Remove items from cart
- [ ] Update item quantities
- [ ] Cart total calculation
- [ ] Save for later functionality
- [ ] Move from saved to cart
- [ ] Stock warnings
- [ ] Empty cart state
- [ ] Cart persistence (localStorage)

### Checkout Flow
- [ ] Navigate to checkout (requires auth)
- [ ] Shipping address input
- [ ] Payment method selection
- [ ] Order creation
- [ ] Payment initiation (all methods)
- [ ] Order confirmation
- [ ] Cart clearing after order

### Orders
- [ ] View order history
- [ ] View order details
- [ ] Order status display
- [ ] Order tracking timeline
- [ ] Order filters (status, date range)
- [ ] Order search
- [ ] Grid/table view toggle

### Payments
- [ ] Airtel Money payment initiation
- [ ] Bank Transfer payment instructions
- [ ] PayChangu redirect flow
- [ ] Payment success handling
- [ ] Payment cancel handling
- [ ] Payment status updates
- [ ] Payment verification

### Services
- [ ] Browse services (public)
- [ ] Create towing service request
- [ ] Create car service request
- [ ] View service requests
- [ ] Service status tracking
- [ ] Service details view

### Custom Orders
- [ ] Create custom order request
- [ ] View custom orders
- [ ] Custom order details
- [ ] Custom order status

### Admin Dashboard
- [ ] Admin login
- [ ] Dashboard stats display
- [ ] Revenue charts rendering
- [ ] Order status distribution chart
- [ ] Recent orders widget
- [ ] Low stock alerts
- [ ] Service requests widget

### Admin Product Management
- [ ] View all products
- [ ] Create new product
- [ ] Update product
- [ ] Delete product
- [ ] Image upload
- [ ] Product categories

### Admin Order Management
- [ ] View all orders
- [ ] Filter orders
- [ ] Update order status
- [ ] View order details
- [ ] Order pagination

### Admin Service Management
- [ ] View all services
- [ ] Filter services
- [ ] Update service status
- [ ] Assign drivers/mechanics
- [ ] Service details

## Bug Reporting Template

When documenting bugs, use this template:

```markdown
### Bug #[ID]: [Short Description]

**Priority**: [Critical/High/Medium/Low]
**Status**: [Open/In Progress/Fixed/Verified]
**Found By**: [Tester Name]
**Date**: [YYYY-MM-DD]

**Description**:
[Detailed description of the bug]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**Browser/Device**:
- Browser: [Chrome/Firefox/Safari/Edge]
- Version: [Version number]
- Device: [Desktop/Mobile/Tablet]
- Screen Size: [Width x Height]

**Screenshots**:
[If applicable, add screenshots]

**Console Errors**:
[Any console errors or warnings]

**Additional Notes**:
[Any other relevant information]
```

## Priority Levels

### Critical
- App crashes or becomes unusable
- Payment failures
- Data loss
- Security vulnerabilities
- Authentication failures

### High
- Major feature broken
- Significant UI/UX issues
- Performance problems affecting usability
- Data corruption

### Medium
- Minor feature problems
- UI/UX improvements needed
- Non-critical validation issues
- Minor performance issues

### Low
- Cosmetic issues
- Minor improvements
- Nice-to-have features
- Documentation updates

## Testing Best Practices

1. **Test with Real Data**: Use realistic test data that matches production scenarios
2. **Test Edge Cases**: Empty states, error states, boundary conditions
3. **Test Across Browsers**: Ensure compatibility across major browsers
4. **Test Responsive Design**: Verify mobile, tablet, and desktop views
5. **Test Performance**: Check page load times and API response times
6. **Document Everything**: Record all findings, bugs, and observations
7. **Test User Flows**: Test complete user journeys, not just individual features
8. **Verify Fixes**: Re-test after bug fixes to ensure they're resolved

## Test Environment

### Local Development
- **Backend**: `http://localhost:5000`
- **Frontend**: `http://localhost:5173` (Vite default)
- **Database**: MongoDB (local or Atlas)

### Test Accounts
- **Customer**: `customer@test.com` / `Test123456`
- **Admin**: `admin@autotek.com` / `Admin123456`

## Testing Tools

### Browser DevTools
- Console for errors and warnings
- Network tab for API calls
- Application tab for localStorage/sessionStorage
- Responsive design mode for mobile testing

### API Testing
- `curl` commands (see `backend/CURL_TESTS.md`)
- `backend/test-endpoints.sh` script
- Postman (optional)

### Performance Testing
- Chrome DevTools Lighthouse
- Network throttling for slow connections
- Performance profiling

## Reporting

After testing, create a comprehensive test report (`TEST_REPORT.md`) including:
- Test coverage summary
- Bugs found and fixed
- Remaining issues
- Recommendations
- Launch readiness assessment

## Next Steps

1. Review this guide
2. Set up test environment
3. Execute test scenarios from `TEST_SCENARIOS.md`
4. Document bugs in `BUGS.md`
5. Fix critical and high-priority bugs
6. Create final test report

---

**Last Updated**: March 3, 2025
