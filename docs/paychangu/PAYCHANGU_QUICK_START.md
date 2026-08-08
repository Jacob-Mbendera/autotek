# PayChangu Quick Start Guide

Get PayChangu payment integration up and running in 5 minutes.

## 🚀 Quick Setup (Development)

### 1. Get PayChangu Credentials

1. Sign up at [PayChangu](https://paychangu.com)
2. Go to **Settings → API Keys**
3. Copy your sandbox credentials:
   - API Key (Public)
   - API Secret (Private)
   - Webhook Secret

### 2. Configure Backend

Edit `/backend/.env`:

```bash
# PayChangu Payment Gateway (Malawi)
PAYCHANGU_API_KEY=pk_sandbox_your_key_here
PAYCHANGU_API_SECRET=sk_sandbox_your_secret_here
PAYCHANGU_BASE_URL=https://api-sandbox.paychangu.com
PAYCHANGU_WEBHOOK_SECRET=whsec_your_webhook_secret_here
FRONTEND_URL=http://localhost:5173
```

### 3. Configure Frontend

Create `/frontend/.env`:

```bash
VITE_API_URL=http://localhost:5000/api
VITE_BASE_URL=http://localhost:5173
```

### 4. Start Services

```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

### 5. Test Payment Flow

1. **Open**: http://localhost:5173
2. **Register** a test account
3. **Add products** to cart
4. **Go to checkout**
5. **Select "PayChangu"** as payment method
6. **Complete order**
7. **Use test card**:
   ```
   Card: 4242 4242 4242 4242
   Expiry: 12/25
   CVV: 123
   ```
8. **Verify** redirect to success page

## ✅ Verification

After completing a test payment:

### Check Frontend
- [ ] Redirected to `/payment/success`
- [ ] Order details displayed
- [ ] Cart is empty
- [ ] No console errors

### Check Backend Logs
```bash
# Should see:
✅ Payment initiated: PAYCHANGU_xxx
✅ Checkout URL: https://checkout-sandbox.paychangu.com/...
✅ PayChangu webhook received
✅ Payment status updated: completed
```

### Check Database
```bash
mongo autotek
db.payments.find().sort({createdAt: -1}).limit(1).pretty()

# Should show:
{
  "method": "paychangu",
  "status": "completed",
  "transactionId": "txn_xxx"
}
```

## 🔧 Webhook Setup (Optional for Local Testing)

To receive webhooks locally:

### Using ngrok

```bash
# Install
npm install -g ngrok

# Expose backend
ngrok http 5000

# Copy HTTPS URL (e.g., https://abc123.ngrok.io)
```

### Configure PayChangu Dashboard

1. Go to **Settings → Webhooks**
2. Add webhook URL: `https://abc123.ngrok.io/api/payments/webhook/paychangu`
3. Select events: `payment.completed`, `payment.failed`, `payment.cancelled`
4. Save

### Test Webhook

1. Make a payment (see step 5 above)
2. Check ngrok dashboard: http://localhost:4040
3. Verify webhook POST request received
4. Check backend logs for webhook processing

## 📊 Payment Methods Supported

| Method | Description | Test Mode |
|--------|-------------|-----------|
| **Cards** | Visa, Mastercard | Use test cards |
| **Mobile Money** | Airtel Money, TNM Mpamba | Simulated prompts |
| **Bank Transfer** | Direct bank transfer | Manual verification |

## 🧪 Test Cards

| Card Number | Result |
|-------------|--------|
| 4242 4242 4242 4242 | ✅ Success |
| 4000 0000 0000 0002 | ❌ Declined |
| 4000 0000 0000 9995 | ❌ Insufficient funds |

**Expiry**: Any future date (e.g., 12/25)
**CVV**: Any 3 digits (e.g., 123)

## 🔴 Common Issues

### "PayChangu credentials not configured"

**Fix**: Check `.env` file has all `PAYCHANGU_*` variables set.

```bash
cd backend
grep PAYCHANGU .env
```

### Payment stays "PENDING"

**Cause**: Webhook not received.

**Fix**:
1. Check PayChangu dashboard webhook logs
2. Ensure ngrok is running (if testing locally)
3. Verify webhook URL is correct

### Redirect URL not working

**Fix**: Update `FRONTEND_URL` in backend `.env`:

```bash
FRONTEND_URL=http://localhost:5173
```

## 📚 Full Documentation

For detailed guides, see:
- **Setup Guide**: `PAYCHANGU_SETUP.md`
- **Testing Guide**: `PAYCHANGU_TESTING.md`

## 🆘 Support

- **PayChangu**: support@paychangu.com
- **Documentation**: https://docs.paychangu.com
- **Dashboard**: https://dashboard.paychangu.com

---

**Ready to go live?** See `PAYCHANGU_SETUP.md` for production deployment instructions.
