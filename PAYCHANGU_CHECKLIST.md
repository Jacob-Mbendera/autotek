# PayChangu Integration Checklist

Use this checklist to verify that PayChangu payment integration is properly configured and working.

## ✅ Configuration Checklist

### Backend Configuration

- [ ] **Environment Variables Set** (`backend/.env`):
  ```bash
  PAYCHANGU_API_KEY=pk_sandbox_xxx  # or pk_live_xxx for production
  PAYCHANGU_API_SECRET=sk_sandbox_xxx  # or sk_live_xxx for production
  PAYCHANGU_BASE_URL=https://api-sandbox.paychangu.com  # or https://api.paychangu.com for production
  PAYCHANGU_WEBHOOK_SECRET=whsec_xxx
  FRONTEND_URL=http://localhost:5173  # or your production URL
  ```

- [ ] **Backend Dependencies Installed**:
  ```bash
  cd backend
  npm install
  ```

- [ ] **Backend Server Starts Successfully**:
  ```bash
  npm run dev
  # Should see: Server running on port 5000
  ```

### Frontend Configuration

- [ ] **Environment Variables Set** (`frontend/.env`):
  ```bash
  VITE_API_URL=http://localhost:5000/api
  VITE_BASE_URL=http://localhost:5173
  ```

- [ ] **Frontend Dependencies Installed**:
  ```bash
  cd frontend
  npm install
  ```

- [ ] **Frontend Server Starts Successfully**:
  ```bash
  npm run dev
  # Should see: Local: http://localhost:5173/
  ```

---

## ✅ Code Verification Checklist

### Backend Code

- [x] **Payment Gateway Utility** (`backend/src/utils/paymentGateways.ts`):
  - [x] `initiatePayChanguPayment()` function implemented
  - [x] API credentials validated
  - [x] Checkout session creation
  - [x] Error handling

- [x] **Payment Controller** (`backend/src/controllers/paymentController.ts`):
  - [x] `initiatePaymentRequest()` handles PayChangu
  - [x] `payChanguWebhook()` endpoint implemented
  - [x] Return/Cancel URL construction
  - [x] Payment status updates

- [x] **Payment Routes** (`backend/src/routes/paymentRoutes.ts`):
  - [x] `POST /api/payments/initiate` endpoint
  - [x] `POST /api/payments/webhook/paychangu` endpoint
  - [x] `GET /api/payments/order/:orderId` endpoint

- [x] **Payment Model** (`backend/src/models/Payment.ts`):
  - [x] Supports `paychangu` payment method
  - [x] Stores transaction IDs
  - [x] Tracks payment status

- [x] **Shared Types** (`backend/src/types/shared/index.ts`):
  - [x] `PaymentMethod.PAYCHANGU` enum value

### Frontend Code

- [x] **Checkout Page** (`frontend/src/pages/Checkout.tsx`):
  - [x] PayChangu payment method option
  - [x] Redirects to PayChangu checkout URL
  - [x] Handles return/cancel URLs
  - [x] Cart cleared on success

- [x] **Payment Success Page** (`frontend/src/pages/PaymentSuccess.tsx`):
  - [x] Displays order details
  - [x] Shows payment status
  - [x] Polls for payment completion
  - [x] Clears cart on verification

- [x] **Payment Cancel Page** (`frontend/src/pages/PaymentCancel.tsx`):
  - [x] Shows cancellation message
  - [x] Provides retry option
  - [x] Cart NOT cleared

- [x] **Payment API** (`frontend/src/store/api/paymentApi.ts`):
  - [x] `initiatePayment` mutation
  - [x] `getPaymentByOrder` query
  - [x] Handles `redirectUrl` response

---

## ✅ Testing Checklist

### Development Testing

- [ ] **Test Payment Initiation**:
  ```bash
  # 1. Start backend
  cd backend && npm run dev

  # 2. Start frontend
  cd frontend && npm run dev

  # 3. Open browser: http://localhost:5173
  # 4. Register/Login
  # 5. Add products to cart
  # 6. Go to checkout
  # 7. Select PayChangu
  # 8. Click "Place Order"
  # 9. Verify redirect to PayChangu checkout
  ```

- [ ] **Test Successful Payment**:
  ```
  Card: 4242 4242 4242 4242
  Expiry: 12/25
  CVV: 123

  ✓ Payment completes
  ✓ Redirected to /payment/success
  ✓ Order shows "Paid" status
  ✓ Cart is empty
  ```

- [ ] **Test Failed Payment**:
  ```
  Card: 4000 0000 0000 0002

  ✓ Payment fails
  ✓ Redirected to /payment/cancel
  ✓ Order shows "Pending" status
  ✓ Cart NOT empty
  ✓ Can retry payment
  ```

- [ ] **Test Cancelled Payment**:
  ```
  ✓ Click "Cancel" on PayChangu page
  ✓ Redirected to /payment/cancel
  ✓ Order shows "Pending" status
  ✓ Cart NOT empty
  ✓ Can retry payment
  ```

### Webhook Testing

- [ ] **Setup ngrok** (for local webhook testing):
  ```bash
  # Install ngrok
  npm install -g ngrok

  # Start ngrok
  ngrok http 5000

  # Copy HTTPS URL: https://abc123.ngrok.io
  ```

- [ ] **Configure PayChangu Webhook**:
  - [ ] Go to PayChangu Dashboard → Settings → Webhooks
  - [ ] Add webhook URL: `https://abc123.ngrok.io/api/payments/webhook/paychangu`
  - [ ] Select events: payment.completed, payment.failed, payment.cancelled
  - [ ] Save webhook secret

- [ ] **Test Webhook Delivery**:
  ```bash
  # 1. Make a test payment
  # 2. Complete payment on PayChangu
  # 3. Check ngrok console: http://localhost:4040
  # 4. Verify POST request to /api/payments/webhook/paychangu
  # 5. Check backend logs for webhook processing
  ```

- [ ] **Verify Webhook Processing**:
  ```bash
  # Check backend logs
  ✓ "PayChangu webhook received"
  ✓ "Payment status updated: completed"

  # Check database
  mongo autotek
  db.payments.find().sort({createdAt: -1}).limit(1).pretty()

  ✓ payment.status === "completed"
  ✓ payment.transactionId set
  ```

### Guest Checkout Testing

- [ ] **Test Guest PayChangu Payment**:
  ```
  1. Logout (if logged in)
  2. Add products to cart
  3. Go to checkout
  4. Fill guest info:
     - Name: Test Guest
     - Email: guest@test.com
     - Phone: +265991234567
  5. Fill shipping address
  6. Select PayChangu
  7. Complete payment

  ✓ Order created with guest info
  ✓ Payment completes
  ✓ Redirected to success page
  ✓ Can view order with email
  ```

---

## ✅ Integration Verification

### API Endpoints

- [ ] **Test Payment Initiation Endpoint**:
  ```bash
  curl -X POST http://localhost:5000/api/payments/initiate \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -d '{
      "orderId": "ORDER_ID",
      "paymentMethod": "paychangu",
      "phoneNumber": "+265991234567"
    }'

  # Expected response:
  {
    "payment": {...},
    "redirectUrl": "https://checkout-sandbox.paychangu.com/session/xxx"
  }
  ```

- [ ] **Test Webhook Endpoint**:
  ```bash
  ./backend/test-paychangu-webhook.sh

  # Or manually:
  curl -X POST http://localhost:5000/api/payments/webhook/paychangu \
    -H "Content-Type: application/json" \
    -d '{
      "sessionId": "session_test",
      "status": "completed",
      "transactionId": "txn_test",
      "reference": "ORDER_xxx",
      "amount": 50000
    }'
  ```

- [ ] **Test Get Payment by Order**:
  ```bash
  curl http://localhost:5000/api/payments/order/ORDER_ID \
    -H "Authorization: Bearer YOUR_TOKEN"

  # Expected response:
  {
    "payment": {
      "status": "completed",
      "method": "paychangu",
      ...
    }
  }
  ```

### Database Verification

- [ ] **Payment Record Created**:
  ```javascript
  db.payments.findOne({method: "paychangu"})

  // Should have:
  {
    type: "order",
    order: ObjectId("..."),
    amount: 50000,
    method: "paychangu",
    status: "completed",  // after webhook
    transactionId: "PAYCHANGU_xxx"
  }
  ```

- [ ] **Order Payment Status Updated**:
  ```javascript
  db.orders.findOne({_id: ObjectId("ORDER_ID")})

  // Should have:
  {
    paymentMethod: "paychangu",
    paymentStatus: "completed",  // after webhook
    ...
  }
  ```

---

## ✅ Error Handling Verification

- [ ] **Missing Credentials Error**:
  ```bash
  # Remove PAYCHANGU_API_KEY from .env
  # Try to initiate payment

  ✓ Returns error: "PayChangu credentials not configured"
  ```

- [ ] **Invalid Order Error**:
  ```bash
  # Try to initiate payment with invalid orderId

  ✓ Returns 404: "Order not found"
  ```

- [ ] **Payment Already Initiated Error**:
  ```bash
  # Try to initiate payment twice for same order

  ✓ Returns 400: "Payment already initiated"
  ```

- [ ] **Webhook with Invalid Payment**:
  ```bash
  # Send webhook with non-existent transactionId

  ✓ Returns 404: "Payment not found"
  ✓ Logs warning
  ```

---

## ✅ Security Verification

- [ ] **Environment Variables Not Committed**:
  ```bash
  git status

  # Should show .env files in .gitignore
  # .env files should NOT appear in git status
  ```

- [ ] **Webhook Endpoint is Public**:
  ```bash
  # Webhook endpoint should NOT require authentication
  curl -X POST http://localhost:5000/api/payments/webhook/paychangu

  # Should return 400 (missing data), not 401 (unauthorized)
  ```

- [ ] **API Secrets Not Exposed**:
  ```bash
  # Check frontend code doesn't expose secrets
  grep -r "PAYCHANGU_API_SECRET" frontend/

  # Should return no results
  ```

---

## ✅ Production Readiness

### Pre-Production

- [ ] **Update to Live Credentials**:
  ```bash
  PAYCHANGU_API_KEY=pk_live_xxx
  PAYCHANGU_API_SECRET=sk_live_xxx
  PAYCHANGU_BASE_URL=https://api.paychangu.com
  ```

- [ ] **Update Frontend URL**:
  ```bash
  FRONTEND_URL=https://your-domain.com
  VITE_BASE_URL=https://your-domain.com
  ```

- [ ] **Configure Production Webhook**:
  - [ ] Add webhook URL in PayChangu dashboard: `https://your-domain.com/api/payments/webhook/paychangu`
  - [ ] SSL certificate valid
  - [ ] Webhook secret updated

- [ ] **Test Small Transaction**:
  ```
  ✓ Create order for MWK 100
  ✓ Complete real payment
  ✓ Verify webhook received
  ✓ Verify payment status updated
  ✓ Verify funds received in PayChangu account
  ```

### Monitoring Setup

- [ ] **Payment Monitoring**:
  - [ ] Dashboard shows PayChangu payments
  - [ ] Can filter by payment method
  - [ ] Can see transaction IDs
  - [ ] Can track failed payments

- [ ] **Webhook Monitoring**:
  - [ ] Check PayChangu dashboard webhook logs
  - [ ] Set up alerts for failed webhooks
  - [ ] Log all webhook events

- [ ] **Error Tracking**:
  - [ ] Backend logs payment errors
  - [ ] Frontend logs payment failures
  - [ ] User-friendly error messages

---

## ✅ Documentation

- [x] **Setup Documentation** - `PAYCHANGU_SETUP.md`
- [x] **Testing Documentation** - `PAYCHANGU_TESTING.md`
- [x] **Quick Start Guide** - `PAYCHANGU_QUICK_START.md`
- [x] **README Updated** - Payment methods section
- [x] **Environment Template** - `.env.example` files

---

## 📊 Final Verification

Run through this complete flow:

1. **User Journey**:
   - [ ] Register new account
   - [ ] Browse products
   - [ ] Add items to cart
   - [ ] Go to checkout
   - [ ] Select PayChangu
   - [ ] Complete payment
   - [ ] Verify success page
   - [ ] Check order in profile
   - [ ] Verify payment status

2. **Admin Journey**:
   - [ ] Login as admin
   - [ ] View orders
   - [ ] Find PayChangu order
   - [ ] Verify payment status
   - [ ] See transaction ID

3. **Technical Verification**:
   - [ ] Payment record in database
   - [ ] Order status updated
   - [ ] Webhook logged
   - [ ] No errors in logs

---

## ✅ Sign-Off

- [ ] All configuration verified
- [ ] All tests passing
- [ ] Error handling tested
- [ ] Documentation complete
- [ ] Ready for production

**Verified By**: _________________
**Date**: _________________
**Version**: 1.0.0

---

## 🆘 Support Resources

- **PayChangu Dashboard**: https://dashboard.paychangu.com
- **PayChangu Docs**: https://docs.paychangu.com
- **PayChangu Support**: support@paychangu.com
- **Setup Guide**: `PAYCHANGU_SETUP.md`
- **Testing Guide**: `PAYCHANGU_TESTING.md`

---

**Last Updated**: 2026-03-15
