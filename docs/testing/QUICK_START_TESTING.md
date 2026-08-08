# 🚀 Quick Start - Frontend Returns Testing

**Start Here!** Follow these steps to begin testing.

---

## ✅ Pre-Flight Check

Both servers are running:
- ✅ **Backend**: http://localhost:5000 (Running)
- ✅ **Frontend**: http://localhost:5173 (Running)
- ✅ **Test Data**: Seeded (3 orders ready)

---

## 🎯 Quick Test Path (15 minutes)

### 1️⃣ Customer Login (2 min)
```
URL: http://localhost:5173
Click: Login

Email: testuser@autotek.com
Password: Test123456

Click: Login button
```

**Verify**: You're logged in, name shows in header

---

### 2️⃣ View Orders (1 min)
```
Click: "Orders" in navigation

Verify you see:
- 3 completed orders
- MWK 100,000
- MWK 180,000
- MWK 150,000
```

---

### 3️⃣ Request Return (3 min)
```
Click: Order with MWK 150,000
Click: "Request Return" button

Fill form:
- Select: First product (Test Engine Oil)
- Quantity: 1
- Reason: "Defective"
- Comments: "Product arrived damaged"
- Refund Method: "Original Payment Method"

Click: Submit

Verify: Success message appears
```

**Note the Return ID** that appears!

---

### 4️⃣ View Returns List (1 min)
```
Navigate to: http://localhost:5173/returns

Verify:
- Your return is listed
- Status: Pending
- Order ID visible
```

---

### 5️⃣ Admin Login (2 min)
```
Click: Logout

Login again:
Email: admintest@autotek.com
Password: Admin123456
```

---

### 6️⃣ Admin View Returns (2 min)
```
Navigate to: http://localhost:5173/admin/returns

Verify:
- You see the pending return
- Customer email shown
- "Approve" button available
```

---

### 7️⃣ Approve Return (2 min)
```
Click: "Approve" button

Verify:
- Status changes to "Approved"
- Shipping label appears (RETURN-XXXXXXXX)
- "Process Refund" button now visible
```

---

### 8️⃣ Process Refund (2 min)
```
Click: "Process Refund" button

Wait 3 seconds...

Verify:
- Status changes to "Completed"
- Refund status: "Completed"
```

---

### 9️⃣ Customer Sees Completion (1 min)
```
Logout admin
Login as customer again

Go to: http://localhost:5173/returns

Verify:
- Return status: "Completed"
- Refund: "Completed"
```

---

## 🎉 Success!

If all 9 steps work, the complete returns & refunds system is functioning! ✅

---

## 📸 Screenshots Needed

Take screenshots at these points:
1. Orders list (3 orders)
2. Return request form (filled)
3. Returns list (pending)
4. Admin view (pending return)
5. Approved return (with shipping label)
6. Completed return (refund done)

---

## 🐛 Found an Issue?

Note:
- Which step?
- What happened?
- Error message?
- Screenshot?

Report to development team.

---

## 📚 Full Testing Guide

For detailed testing instructions, see:
**FRONTEND_RETURNS_TESTING_GUIDE.md**

---

**Ready? Start with Step 1!** 🚀

Open browser to: **http://localhost:5173**
