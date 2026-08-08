# PayChangu Payment Gateway Setup Guide

This guide explains how to set up and use PayChangu payment gateway integration for AutoTek.

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Configuration](#configuration)
4. [How It Works](#how-it-works)
5. [Testing](#testing)
6. [Webhook Setup](#webhook-setup)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Overview

**PayChangu** is a payment gateway that supports multiple payment methods for Malawi:
- Card payments (Visa, Mastercard)
- Mobile money (Airtel Money, TNM Mpamba)
- Bank transfers

### Features
- **Standard Checkout**: Hosted payment page (easiest integration)
- **Multiple Payment Methods**: Cards, mobile money, bank transfers
- **Webhook Notifications**: Real-time payment status updates
- **MWK Currency**: Native support for Malawi Kwacha
- **Secure**: PCI-DSS compliant

---

## Getting Started

### 1. Create PayChangu Account

1. Visit [PayChangu](https://paychangu.com)
2. Sign up for a merchant account
3. Complete KYC verification
4. Access your dashboard

### 2. Get API Credentials

From your PayChangu dashboard:
1. Navigate to **Settings** → **API Keys**
2. Copy your:
   - **API Key** (Public Key)
   - **API Secret** (Secret Key)
   - **Webhook Secret** (for webhook verification)

**Important**: Keep these credentials secure and never commit them to version control!

---

## Configuration

### Backend Environment Variables

Add these to `/backend/.env`:

```bash
# PayChangu Payment Gateway (Malawi)
PAYCHANGU_API_KEY=your_api_key_here
PAYCHANGU_API_SECRET=your_api_secret_here
PAYCHANGU_BASE_URL=https://api.paychangu.com
PAYCHANGU_WEBHOOK_SECRET=your_webhook_secret_here
FRONTEND_URL=http://localhost:5173
```

### Environment-Specific URLs

**Development**:
```bash
PAYCHANGU_BASE_URL=https://api-sandbox.paychangu.com  # Sandbox
FRONTEND_URL=http://localhost:5173
```

**Production**:
```bash
PAYCHANGU_BASE_URL=https://api.paychangu.com  # Live
FRONTEND_URL=https://your-domain.com
```

---

## How It Works

### Payment Flow

```
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│  User    │      │ Frontend │      │ Backend  │      │PayChangu │
└────┬─────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘
     │                 │                 │                 │
     │ 1. Place Order  │                 │                 │
     ├────────────────>│                 │                 │
     │                 │ 2. Create Order │                 │
     │                 ├────────────────>│                 │
     │                 │                 │ 3. Initiate     │
     │                 │                 │    Payment      │
     │                 │                 ├────────────────>│
     │                 │                 │ 4. Checkout URL │
     │                 │                 │<────────────────┤
     │                 │ 5. Redirect URL │                 │
     │                 │<────────────────┤                 │
     │ 6. Redirect to  │                 │                 │
     │    PayChangu    │                 │                 │
     │<────────────────┤                 │                 │
     │                 │                 │                 │
     │ 7. Complete Payment                                 │
     ├────────────────────────────────────────────────────>│
     │                 │                 │ 8. Webhook      │
     │                 │                 │    Notification │
     │                 │                 │<────────────────┤
     │                 │                 │ 9. Update       │
     │                 │                 │    Payment      │
     │                 │                 │    Status       │
     │ 10. Redirect to Success                             │
     │<────────────────────────────────────────────────────┤
     │                 │                 │                 │
     │ 11. View Order  │                 │                 │
     ├────────────────>│                 │                 │
     │                 │                 │                 │
```

### Step-by-Step Process

#### 1. **Customer Initiates Payment**
- User selects PayChangu at checkout
- Provides shipping address and contact info

#### 2. **Backend Creates Order**
- Order is created in database
- Payment record is initialized with `PENDING` status

#### 3. **Backend Initiates PayChangu Session**
```typescript
POST /api/payments/initiate
{
  "orderId": "order_id",
  "paymentMethod": "paychangu",
  "phoneNumber": "+265991234567",
  "returnUrl": "http://localhost:5173/payment/success?orderId=xxx",
  "cancelUrl": "http://localhost:5173/payment/cancel?orderId=xxx"
}
```

Response:
```json
{
  "payment": { ... },
  "redirectUrl": "https://checkout.paychangu.com/session/xxx"
}
```

#### 4. **Frontend Redirects to PayChangu**
```typescript
if (paymentResult.redirectUrl) {
  window.location.href = paymentResult.redirectUrl;
}
```

#### 5. **Customer Completes Payment**
- User is on PayChangu hosted checkout page
- Selects payment method (card/mobile money/bank)
- Completes payment

#### 6. **PayChangu Sends Webhook**
```
POST https://your-domain.com/api/payments/webhook/paychangu
{
  "sessionId": "session_xxx",
  "status": "completed",
  "transactionId": "txn_xxx",
  "reference": "ORDER_xxx",
  "amount": 50000
}
```

#### 7. **Backend Updates Payment Status**
- Webhook handler validates request
- Updates payment status to `COMPLETED`
- Updates order payment status

#### 8. **Customer Redirected Back**
- PayChangu redirects to `returnUrl` (success) or `cancelUrl` (cancelled)
- Frontend displays success/cancel message
- Cart is cleared on success

---

## Testing

### 1. Test Mode Setup

Use PayChangu sandbox environment:
```bash
PAYCHANGU_BASE_URL=https://api-sandbox.paychangu.com
```

### 2. Test Cards

PayChangu provides test cards for sandbox:

**Successful Payment**:
```
Card Number: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/25)
CVV: Any 3 digits (e.g., 123)
```

**Failed Payment**:
```
Card Number: 4000 0000 0000 0002
Expiry: Any future date
CVV: Any 3 digits
```

### 3. Test Mobile Money

In sandbox mode, mobile money prompts are simulated.

### 4. Manual Testing

#### Test Successful Payment:
```bash
# 1. Start backend
cd backend
npm run dev

# 2. Start frontend (new terminal)
cd frontend
npm run dev

# 3. Go to http://localhost:5173
# 4. Add products to cart
# 5. Go to checkout
# 6. Select PayChangu as payment method
# 7. Complete checkout
# 8. You'll be redirected to PayChangu checkout
# 9. Use test card above
# 10. Complete payment
# 11. Verify redirect to success page
```

#### Test Cancelled Payment:
```bash
# Follow steps 1-8 above
# 9. Click "Cancel" or "Go Back" on PayChangu page
# 10. Verify redirect to cancel page
```

### 5. Webhook Testing

You can use **ngrok** to expose your local server for webhook testing:

```bash
# Install ngrok
npm install -g ngrok

# Expose port 5000
ngrok http 5000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Update PayChangu dashboard webhook URL:
# https://abc123.ngrok.io/api/payments/webhook/paychangu
```

**Alternative**: Use PayChangu dashboard to manually trigger test webhooks.

---

## Webhook Setup

### 1. Configure Webhook URL

In PayChangu dashboard:
1. Go to **Settings** → **Webhooks**
2. Add webhook URL:
   - **Development**: `https://your-ngrok-url.ngrok.io/api/payments/webhook/paychangu`
   - **Production**: `https://your-domain.com/api/payments/webhook/paychangu`
3. Select events:
   - `payment.completed`
   - `payment.failed`
   - `payment.cancelled`
4. Save webhook secret (used for verification)

### 2. Webhook Security

The backend webhook handler validates requests:

```typescript
// backend/src/controllers/paymentController.ts
export const payChanguWebhook = async (req: Request, res: Response) => {
  // 1. Verify webhook signature (TODO: implement when PayChangu provides)
  const webhookSecret = process.env.PAYCHANGU_WEBHOOK_SECRET;

  // 2. Find payment by transactionId or sessionId
  const payment = await Payment.findOne({...});

  // 3. Update payment status based on webhook
  if (status === 'completed') {
    payment.status = PaymentStatus.COMPLETED;
    // Update order payment status
  }

  // 4. Save and respond
  await payment.save();
  res.json({ success: true });
};
```

### 3. Webhook Events

| Event | Description | Action |
|-------|-------------|--------|
| `payment.completed` | Payment successful | Update status to `COMPLETED`, clear cart |
| `payment.failed` | Payment failed | Update status to `FAILED` |
| `payment.cancelled` | User cancelled | Update status to `FAILED` |

### 4. Webhook Retry Logic

PayChangu will retry failed webhooks:
- Retry intervals: 1m, 5m, 15m, 1h, 3h, 12h, 24h
- Max retries: 7 attempts
- Always return `200 OK` to acknowledge receipt

---

## Production Deployment

### 1. Environment Variables

Update production environment:
```bash
PAYCHANGU_API_KEY=pk_live_xxx
PAYCHANGU_API_SECRET=sk_live_xxx
PAYCHANGU_BASE_URL=https://api.paychangu.com
PAYCHANGU_WEBHOOK_SECRET=whsec_xxx
FRONTEND_URL=https://autotek.mw
```

### 2. SSL/HTTPS Required

PayChangu requires HTTPS for:
- Webhook URLs
- Return/Cancel URLs

Ensure your domain has valid SSL certificate.

### 3. Update Webhook URL

In PayChangu dashboard:
```
https://autotek.mw/api/payments/webhook/paychangu
```

### 4. Test in Production

Before going live:
1. Use small test transaction (e.g., MWK 100)
2. Verify webhook delivery
3. Check payment status updates
4. Confirm redirect flow works

### 5. Monitoring

Monitor:
- Webhook delivery in PayChangu dashboard
- Payment status updates in admin panel
- Failed payments and errors
- Transaction logs

---

## API Reference

### Backend Endpoints

#### Initiate Payment
```http
POST /api/payments/initiate
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "order_id",
  "paymentMethod": "paychangu",
  "phoneNumber": "+265991234567",
  "returnUrl": "https://autotek.mw/payment/success?orderId=xxx",
  "cancelUrl": "https://autotek.mw/payment/cancel?orderId=xxx"
}
```

Response:
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
  "redirectUrl": "https://checkout.paychangu.com/session/xxx"
}
```

#### Webhook Endpoint
```http
POST /api/payments/webhook/paychangu
Content-Type: application/json

{
  "sessionId": "session_xxx",
  "status": "completed",
  "transactionId": "txn_xxx",
  "reference": "ORDER_xxx",
  "amount": 50000
}
```

Response:
```json
{
  "success": true,
  "payment": { ... }
}
```

#### Get Payment Status
```http
GET /api/payments/order/:orderId
Authorization: Bearer <token>
```

Response:
```json
{
  "payment": {
    "_id": "payment_id",
    "status": "completed",
    "transactionId": "txn_xxx",
    ...
  }
}
```

---

## Troubleshooting

### Issue 1: "PayChangu credentials not configured"

**Cause**: Missing API credentials in `.env`

**Solution**:
```bash
# Check .env file
cat backend/.env | grep PAYCHANGU

# Ensure all required vars are set
PAYCHANGU_API_KEY=xxx
PAYCHANGU_API_SECRET=xxx
```

### Issue 2: Payment stays "PENDING" after completion

**Cause**: Webhook not received or failed

**Solutions**:
1. Check PayChangu dashboard webhook logs
2. Verify webhook URL is correct and accessible
3. Check backend logs for webhook errors
4. Ensure webhook secret matches
5. Test webhook URL with curl:
   ```bash
   curl -X POST https://your-domain.com/api/payments/webhook/paychangu \
     -H "Content-Type: application/json" \
     -d '{"sessionId":"test","status":"completed"}'
   ```

### Issue 3: "Failed to create PayChangu checkout session"

**Possible Causes**:
- Invalid API credentials
- Network issues
- Invalid request data
- API rate limits

**Solution**:
```bash
# Check backend logs
npm run dev

# Look for error messages
# Verify API credentials
# Check PayChangu API status
```

### Issue 4: Redirect URL not working

**Cause**: Frontend URL mismatch

**Solution**:
```bash
# Ensure FRONTEND_URL matches your frontend URL
FRONTEND_URL=http://localhost:5173  # Development
FRONTEND_URL=https://autotek.mw     # Production

# Restart backend after .env changes
```

### Issue 5: Webhook signature verification fails

**Cause**: Incorrect webhook secret or signature algorithm

**Solution**:
1. Verify `PAYCHANGU_WEBHOOK_SECRET` matches dashboard
2. Check PayChangu documentation for signature algorithm
3. Update webhook handler if needed

### Issue 6: Payment succeeds but cart not cleared

**Cause**: Frontend not detecting payment completion

**Solution**:
- Payment success page polls for payment status
- Ensure RTK Query is properly configured
- Check browser console for errors
- Verify payment status API returns correct data

---

## Support

### PayChangu Support
- **Email**: support@paychangu.com
- **Documentation**: https://docs.paychangu.com
- **Dashboard**: https://dashboard.paychangu.com

### AutoTek Support
- **Issues**: GitHub Issues
- **Documentation**: See `README.md`

---

## Security Best Practices

1. **Never commit credentials**: Use `.env` files (added to `.gitignore`)
2. **Use HTTPS**: Always use HTTPS in production
3. **Verify webhooks**: Implement webhook signature verification
4. **Validate amounts**: Always verify payment amount matches order
5. **Rate limiting**: Implement rate limiting on payment endpoints
6. **Logging**: Log all payment transactions for audit trail
7. **Error handling**: Never expose sensitive errors to frontend
8. **PCI compliance**: Never store card details (handled by PayChangu)

---

## Implementation Checklist

### Development
- [x] Add PayChangu environment variables
- [x] Implement payment initiation
- [x] Implement webhook handler
- [x] Add frontend redirect handling
- [ ] Test with sandbox credentials
- [ ] Test webhook with ngrok
- [ ] Verify payment status updates

### Production
- [ ] Get live API credentials
- [ ] Update environment variables
- [ ] Configure webhook URL
- [ ] Test with small transaction
- [ ] Monitor webhook delivery
- [ ] Set up payment monitoring
- [ ] Document payment reconciliation process

---

## Additional Resources

- [PayChangu API Documentation](https://docs.paychangu.com)
- [PayChangu Standard Checkout Guide](https://docs.paychangu.com/checkout)
- [Webhook Security Best Practices](https://docs.paychangu.com/webhooks/security)
- [Testing Guide](https://docs.paychangu.com/testing)

---

**Last Updated**: 2026-03-15
**Version**: 1.0.0
