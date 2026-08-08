# Quick Start - Frontend Testing

## 🎯 Your Testing Guide is Ready!

**Guide Location**: `FRONTEND_DELIVERY_TEST_GUIDE.md`

---

## 📋 What You're Testing

The new **Malawi Delivery Location System** with:
- All 28 districts organized by region
- 177+ landmarks across all districts
- Custom address option ("Other/Custom")
- Admin UI for managing locations
- Structured address format for orders

---

## 🚀 Quick Start Instructions

### Step 1: Verify Servers Running
✅ Backend: http://localhost:5000 (already running)
✅ Frontend: Your frontend URL (you started it)

### Step 2: Open Testing Guide
Open the file: `FRONTEND_DELIVERY_TEST_GUIDE.md`

### Step 3: Follow Tests Sequentially

**PART 1 - User Flow (Tests 1.1-1.9)**
Start here as a regular customer:
1. Browse products and add to cart
2. Go to checkout
3. **Test the delivery location selector** (main feature!)
4. Select districts and landmarks
5. Try "Other/Custom" option
6. Complete an order
7. View order details

**PART 2 - Admin Flow (Tests 2.1-2.11)**
Then switch to admin:
1. Login as admin (testadmin@autotek.com / Admin@123)
2. Go to /admin/delivery-locations
3. Test all CRUD operations:
   - Search districts
   - Edit district/landmark names
   - Add new landmarks
   - Add new districts
   - Delete items (soft delete)

**PART 3 - Backward Compatibility (Test 3.1)**
Verify legacy orders still work

**PART 4 - Edge Cases (Tests 4.1-4.5)**
Test error handling and edge cases

---

## 🎯 Key Features to Test

### 1️⃣ District Selection (Most Important!)
**Location**: Checkout page → Delivery Address section

**What to check**:
- [ ] Dropdown shows all 29 districts
- [ ] Districts are organized/searchable
- [ ] Selecting a district enables landmark dropdown

### 2️⃣ Landmark Selection (Critical!)
**What to check**:
- [ ] Landmarks specific to selected district appear
- [ ] Can select any landmark
- [ ] Address preview shows: "District, Landmark"

### 3️⃣ Custom Address ("Other/Custom")
**What to check**:
- [ ] Selecting "Other/Custom" shows textarea
- [ ] Can type custom delivery location
- [ ] Custom address saves correctly

### 4️⃣ Order Creation
**What to check**:
- [ ] Order completes successfully
- [ ] Structured address saved in database
- [ ] Order details display formatted address

### 5️⃣ Admin Management
**Location**: /admin/delivery-locations

**What to check**:
- [ ] Can view all 29 districts
- [ ] Can search/filter
- [ ] Can add/edit/delete districts
- [ ] Can add/edit/delete landmarks
- [ ] Validation prevents duplicates

---

## 📝 How to Use the Guide

Each test includes:

```
### Test X.X: Test Name

Steps:
1. Do this
2. Then this
3. Finally this

Expected Results:
✅ This should happen
✅ That should appear
✅ This should work

Notes:
Something works? ______
Another thing works? ______
```

**Mark each test**:
- ✅ = Passed
- ❌ = Failed
- ⚠️ = Partial/Issues

---

## 🐛 If You Find Issues

Document in the "Issues Found" section at the end:

**Critical Issues** (Blockers):
- App crashes
- Cannot complete core flows
- Data loss

**Major Issues**:
- Features don't work
- Wrong data displayed
- Poor UX

**Minor Issues**:
- Small UI glitches
- Typos
- Styling issues

---

## ✅ Success Criteria

**Minimum to Pass**:
- [ ] Can select district in checkout
- [ ] Can select landmark
- [ ] Can enter custom address
- [ ] Order creates successfully
- [ ] Order details show correct address
- [ ] Admin can view all districts
- [ ] Admin can add/edit/delete locations
- [ ] No critical errors

**Ideal Results**:
- [ ] All 26 tests pass
- [ ] No console errors
- [ ] Smooth user experience
- [ ] Fast loading times
- [ ] Clear error messages

---

## 📊 Test Summary Location

At the end of the guide, fill out:

```
User Flow Tests: _____ / 9 passed
Admin Flow Tests: _____ / 11 passed
Backward Compatibility: _____ / 1 passed
Edge Cases: _____ / 5 passed

Grand Total: _____ / 26 passed (____%)
```

---

## 🎓 Testing Tips

1. **Test in order** - Tests build on each other
2. **Take notes** - Write down what you see
3. **Check console** - Open DevTools (F12)
4. **Try to break it** - Click fast, enter weird data
5. **Think like a user** - Is it intuitive?

---

## 🚨 Common Issues to Watch For

- [ ] `[object Object]` instead of address
- [ ] Dropdown doesn't populate
- [ ] Landmarks don't change when district changes
- [ ] Custom textarea doesn't appear
- [ ] Validation doesn't work
- [ ] Admin UI breaks
- [ ] Console errors

---

## 📞 Quick Reference

**Admin Credentials**:
- Email: testadmin@autotek.com
- Password: Admin@123

**Test Districts to Try**:
- Lilongwe (12 landmarks) - Capital, most landmarks
- Blantyre (12 landmarks) - Commercial hub
- Mzuzu (10 landmarks) - Northern city
- Zomba (8 landmarks) - Former capital
- Mangochi (7 landmarks) - Lake district

**URLs to Test**:
- Products: /products
- Cart: /cart
- Checkout: /checkout (main testing area!)
- Orders: /orders
- Order Detail: /orders/:id
- Admin Locations: /admin/delivery-locations

---

## ⏱️ Estimated Time

- **Quick Test** (core features only): 15-20 minutes
- **Full Test** (all 26 tests): 45-60 minutes
- **Thorough Test** (with notes & edge cases): 90+ minutes

---

## 🎉 Ready to Start?

1. Open `FRONTEND_DELIVERY_TEST_GUIDE.md`
2. Start with **Test 1.1: View Products and Add to Cart**
3. Follow the guide step by step
4. Mark results as you go
5. Report back any issues!

**Good luck with testing!** 🚀

---

**Need Help?**
- Backend API docs: `BACKEND_DELIVERY_API_TEST_RESULTS.md`
- Implementation docs: `DELIVERY_LOCATION_TEST_RESULTS.md`
- Current status: `current-work.md`
