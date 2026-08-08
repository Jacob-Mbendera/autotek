# PayChangu Testing Guide

This guide provides step-by-step instructions for testing the PayChangu payment integration.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development Testing](#local-development-testing)
3. [Webhook Testing](#webhook-testing)
4. [End-to-End Testing](#end-to-end-testing)
5. [Common Test Scenarios](#common-test-scenarios)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### 1. Environment Setup

**Backend** (`/backend/.env`):
```bash
# PayChangu Sandbox Credentials
PAYCHANGU_API_KEY=your_sandbox_api_key
PAYCHANGU_API_SECRET=your_sandbox_api_secret
PAYCHANGU_BASE_URL=https://api-sandbox.paychangu.com
PAYCHANGU_WEBHOOK_SECRET=your_webhook_secret
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`/frontend/.env`):
```bash
VITE_API_URL=http://localhost:5000/api
VITE_BASE_URL=http://localhost:5173
```

### 2. Required Tools

- **Node.js** (v16+)
- **MongoDB** (running)
- **curl** (for API testing)
- **jq** (optional, for JSON formatting)
- **ngrok** (for webhook testing)

### 3. Start Services

```bash
# Terminal 1: Start MongoDB (if not running)
mongod

# Terminal 2: Start Backend
cd backend
npm run dev

# Terminal 3: Start Frontend
cd frontend
npm run dev
```

---

## Local Development Testing

### Test 1: API Credentials Check

Verify PayChangu credentials are configured:

```bash
# Check backend environment
cd backend
grep PAYCHANGU .env
```

Expected output:
```
PAYCHANGU_API_KEY=pk_sandbox_xxx
PAYCHANGU_API_SECRET=sk_sandbox_xxx
PAYCHANGU_BASE_URL=https://api-sandbox.paychangu.com
PAYCHANGU_WEBHOOK_SECRET=whsec_xxx
```

### Test 2: Payment Initiation (Without Real Order)

Create a test order first:

```bash
# 1. Register a test user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "phone": "+265991234567"
  }'

# Save the token from response

# 2. Create a test order
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "items": [
      {
        "productId": "PRODUCT_ID_HERE",
        "quantity": 1,
        "price": 50000
      }
    ],
    "shippingAddress": "123 Test Street, Lilongwe",
    "paymentMethod": "paychangu"
  }'

# Save the orderId from response

# 3. Initiate PayChangu payment
curl -X POST http://localhost:5000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "orderId": "ORDER_ID_HERE",
    "paymentMethod": "paychangu",
    "phoneNumber": "+265991234567",
    "returnUrl": "http://localhost:5173/payment/success?orderId=ORDER_ID_HERE",
    "cancelUrl": "http://localhost:5173/payment/cancel?orderId=ORDER_ID_HERE"
  }'
```

Expected response:
```json
{
  "payment": {
    "_id": "payment_id",
    "order": "order_id",
    "amount": 50000,
    "method": "paychangu",
    "status": "pending",
    "transactionId": "PAYCHANGU_xxx"
  },
  "redirectUrl": "https://checkout-sandbox.paychangu.com/session/xxx"
}
```

### Test 3: Browser-Based Payment Flow

1. **Go to Frontend**: http://localhost:5173
2. **Login/Register** with test account
3. **Add Products to Cart**
4. **Go to Checkout**: http://localhost:5173/checkout
5. **Fill Shipping Address**
6. **Select PayChangu** as payment method
7. **Click "Place Order"**
8. **Verify Redirect** to PayChangu checkout page
9. **Use Test Card**:
   ```
   Card Number: 4242 4242 4242 4242
   Expiry: 12/25
   CVV: 123
   ```
10. **Complete Payment**
11. **Verify Redirect** back to success page

---

## Webhook Testing

### Option 1: Using ngrok (Recommended)

ngrok exposes your local server to the internet so PayChangu can send webhooks.

#### Step 1: Install ngrok
```bash
npm install -g ngrok
# OR
brew install ngrok  # macOS
```

#### Step 2: Start ngrok
```bash
ngrok http 5000
```

Output:
```
Forwarding: https://abc123.ngrok.io -> http://localhost:5000
```

#### Step 3: Configure PayChangu Webhook

1. Go to PayChangu Dashboard → Settings → Webhooks
2. Add webhook URL: `https://abc123.ngrok.io/api/payments/webhook/paychangu`
3. Select events:
   - `payment.completed`
   - `payment.failed`
   - `payment.cancelled`
4. Save

#### Step 4: Test Webhook Delivery

1. Make a payment using test card (see Test 3 above)
2. Complete payment on PayChangu
3. Check ngrok console for webhook POST request
4. Check backend logs for webhook processing

### Option 2: Manual Webhook Testing

Use the provided test script:

```bash
cd backend
./test-paychangu-webhook.sh
```

Or manually:
```bash
# Test successful payment webhook
curl -X POST http://localhost:5000/api/payments/webhook/paychangu \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_test_123",
    "status": "completed",
    "transactionId": "txn_test_456",
    "reference": "ORDER_xxx",
    "amount": 50000
  }'
```

**Note**: This will return 404 unless you use a real payment transactionId from your database.

### Option 3: PayChangu Dashboard Test

1. Go to PayChangu Dashboard
2. Navigate to Developers → Webhooks
3. Click "Send Test Webhook"
4. Select event type
5. Click "Send"
6. Verify webhook received in backend logs

---

## End-to-End Testing

### Complete Payment Flow Test

```bash
# 1. Start all services
cd backend && npm run dev &
cd frontend && npm run dev &

# 2. (Optional) Start ngrok for webhook testing
ngrok http 5000

# 3. Open browser
open http://localhost:5173

# 4. Create test user
# - Click "Register"
# - Fill form:
#   - Name: Test User
#   - Email: test@example.com
#   - Password: password123
#   - Phone: +265991234567
# - Click "Register"

# 5. Add products to cart
# - Browse products
# - Click "Add to Cart" on 2-3 products
# - Verify cart icon updates

# 6. Go to checkout
# - Click cart icon or go to /checkout
# - Fill shipping address
# - Select "PayChangu" payment method
# - Click "Place Order"

# 7. Complete payment on PayChangu
# - You'll be redirected to PayChangu checkout
# - Use test card: 4242 4242 4242 4242
# - Expiry: 12/25, CVV: 123
# - Click "Pay"

# 8. Verify success
# - You should be redirected to /payment/success
# - Order status should be "Paid"
# - Cart should be empty
# - Check backend logs for webhook

# 9. Verify order in admin
# - Login as admin
# - Go to /admin/orders
# - Find your order
# - Verify payment status is "completed"
```

---

## Common Test Scenarios

### Scenario 1: Successful Payment

**Steps**:
1. Complete payment with test card `4242 4242 4242 4242`
2. Wait for redirect
3. Verify payment status is "completed"

**Expected Results**:
- ✅ Redirected to `/payment/success`
- ✅ Payment status: `COMPLETED`
- ✅ Order payment status: `COMPLETED`
- ✅ Cart cleared
- ✅ Webhook received

### Scenario 2: Failed Payment

**Steps**:
1. Use failed test card `4000 0000 0000 0002`
2. Complete payment
3. Wait for redirect

**Expected Results**:
- ✅ Redirected to `/payment/cancel`
- ✅ Payment status: `FAILED`
- ✅ Order status: `PENDING`
- ✅ Cart NOT cleared
- ✅ Can retry payment

### Scenario 3: Cancelled Payment

**Steps**:
1. Start payment flow
2. On PayChangu page, click "Cancel" or "Go Back"
3. Wait for redirect

**Expected Results**:
- ✅ Redirected to `/payment/cancel`
- ✅ Payment status: `PENDING` or `FAILED`
- ✅ Order status: `PENDING`
- ✅ Cart NOT cleared
- ✅ Can retry payment

### Scenario 4: Guest Checkout with PayChangu

**Steps**:
1. Logout (if logged in)
2. Add products to cart
3. Go to checkout
4. Fill guest information:
   - Name: Guest User
   - Email: guest@example.com
   - Phone: +265991234567
5. Fill shipping address
6. Select "PayChangu"
7. Complete payment

**Expected Results**:
- ✅ Order created with guest info
- ✅ Payment processed
- ✅ Redirected to success page
- ✅ Can track order with email

### Scenario 5: Webhook Delay

**Steps**:
1. Complete payment
2. PayChangu redirects before webhook arrives
3. Success page polls for payment status

**Expected Results**:
- ✅ Success page shows "Verifying Payment..."
- ✅ Polls payment status every 3 seconds
- ✅ Updates to "Paid" when webhook arrives
- ✅ Max 5 verification attempts
- ✅ Shows error if webhook never arrives

### Scenario 6: Multiple Payment Attempts

**Steps**:
1. Create order
2. Attempt payment, then cancel
3. Retry payment from order detail page
4. Complete second attempt

**Expected Results**:
- ✅ Can initiate new payment
- ✅ Old payment stays PENDING
- ✅ New payment created
- ✅ Second payment succeeds
- ✅ Order marked as paid

---

## Verification Checklist

After each test, verify:

### Frontend
- [ ] Correct page displayed (success/cancel)
- [ ] Order ID shown correctly
- [ ] Payment amount matches order total
- [ ] Cart cleared on success (not on cancel)
- [ ] Can navigate to order detail
- [ ] No console errors

### Backend
- [ ] Payment record created in database
- [ ] Payment status updated correctly
- [ ] Order payment status updated
- [ ] Webhook logged
- [ ] No server errors

### Database
```bash
# Check payment record
mongo autotek
db.payments.find().sort({createdAt: -1}).limit(1).pretty()

# Check order payment status
db.orders.find({_id: ObjectId("ORDER_ID")}).pretty()
```

Expected payment document:
```json
{
  "_id": "...",
  "order": "order_id",
  "type": "order",
  "amount": 50000,
  "method": "paychangu",
  "status": "completed",
  "transactionId": "txn_xxx",
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## Troubleshooting

### Issue: Redirect URL not working

**Check**:
```bash
# Verify FRONTEND_URL in backend .env
echo $FRONTEND_URL

# Verify it matches your frontend
# Should be: http://localhost:5173
```

**Fix**:
```bash
# Update backend/.env
FRONTEND_URL=http://localhost:5173

# Restart backend
```

### Issue: Webhook not received

**Checks**:
1. Is ngrok running? `ngrok http 5000`
2. Is webhook URL correct in PayChangu dashboard?
3. Check ngrok dashboard: http://localhost:4040
4. Check backend logs for webhook POST

**Fix**:
```bash
# Verify webhook endpoint is accessible
curl http://localhost:5000/api/payments/webhook/paychangu

# Should return 400 (missing data), not 404
```

### Issue: Payment status stays "PENDING"

**Possible Causes**:
- Webhook not configured
- Webhook failed
- Network issue

**Debug**:
```bash
# Check PayChangu dashboard webhook logs
# Check backend logs for errors
# Manually trigger webhook:

curl -X POST http://localhost:5000/api/payments/webhook/paychangu \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "REAL_SESSION_ID",
    "status": "completed",
    "transactionId": "REAL_TRANSACTION_ID"
  }'
```

### Issue: "PayChangu credentials not configured"

**Fix**:
```bash
# Check backend/.env has all PayChangu variables
cat backend/.env | grep PAYCHANGU

# Add missing variables
PAYCHANGU_API_KEY=xxx
PAYCHANGU_API_SECRET=xxx

# Restart backend
```

### Issue: Cart not cleared after payment

**Check**:
1. Payment status in database
2. Browser console errors
3. Redux state

**Fix**:
```javascript
// Open browser console
localStorage.getItem('persist:root')

// If cart not cleared, manually clear:
localStorage.removeItem('persist:root')
// Refresh page
```

---

## Test Data

### Test Credit Cards (Sandbox)

| Card Number | Result | Description |
|-------------|--------|-------------|
| 4242 4242 4242 4242 | Success | Visa - Successful payment |
| 5555 5555 5555 4444 | Success | Mastercard - Successful payment |
| 4000 0000 0000 0002 | Declined | Card declined |
| 4000 0000 0000 9995 | Declined | Insufficient funds |

Use any future expiry date and any 3-digit CVV.

### Test Mobile Money Numbers (Sandbox)

PayChangu sandbox will simulate mobile money prompts. Use any valid Malawi number:
- Airtel: +265991234567
- TNM: +265881234567

---

## Monitoring

### Backend Logs

```bash
# Watch backend logs
cd backend
npm run dev

# Look for:
# - "Payment initiated: PAYCHANGU_xxx"
# - "PayChangu webhook received: {...}"
# - "Payment status updated: completed"
```

### Database Monitoring

```bash
# Watch payments collection
mongo autotek
db.payments.find().sort({createdAt: -1}).limit(5).pretty()

# Watch orders collection
db.orders.find().sort({createdAt: -1}).limit(5).pretty()
```

### Network Monitoring

```bash
# ngrok dashboard (if using ngrok)
open http://localhost:4040

# Shows all HTTP requests including webhooks
```

---

## Next Steps

After successful testing:

1. **Update to Live Credentials**:
   ```bash
   PAYCHANGU_API_KEY=pk_live_xxx
   PAYCHANGU_API_SECRET=sk_live_xxx
   PAYCHANGU_BASE_URL=https://api.paychangu.com
   ```

2. **Update Webhook URL** in PayChangu dashboard:
   ```
   https://your-domain.com/api/payments/webhook/paychangu
   ```

3. **Test with Real Payment** (small amount like MWK 100)

4. **Monitor Production**:
   - Payment success rate
   - Webhook delivery
   - Failed payments
   - Refunds

---

**Last Updated**: 2026-03-15
**Version**: 1.0.0
