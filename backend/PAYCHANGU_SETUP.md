# PayChangu Payment Gateway Setup Guide

This guide explains how to set up and configure PayChangu payment gateway integration for AutoTek.

## Overview

PayChangu is a payment gateway that supports multiple payment methods including:
- Credit/Debit Cards
- Mobile Money (Airtel Money, TNM Mpamba, etc.)
- Bank Transfers

The integration uses PayChangu's **Standard Checkout** (hosted page) which redirects users to PayChangu's secure payment page.

## Prerequisites

1. PayChangu merchant account
2. API credentials (API Key, API Secret)
3. Webhook secret (for payment callbacks)
4. Access to PayChangu dashboard

## Step 1: Get PayChangu Credentials

1. Log in to your PayChangu merchant dashboard
2. Navigate to **Settings** → **API Credentials**
3. Generate or retrieve:
   - **API Key**: Your public API key
   - **API Secret**: Your private API secret (keep this secure!)
   - **Webhook Secret**: Secret for verifying webhook callbacks

## Step 2: Configure Environment Variables

Add the following to your `backend/.env` file:

```env
# PayChangu Payment Gateway Configuration
PAYCHANGU_API_KEY=your_paychangu_api_key
PAYCHANGU_API_SECRET=your_paychangu_api_secret
PAYCHANGU_BASE_URL=https://api.paychangu.com
PAYCHANGU_WEBHOOK_SECRET=your_paychangu_webhook_secret

# Frontend URL (for payment redirects)
FRONTEND_URL=http://localhost:5173
```

### Environment Variables Explained

- **PAYCHANGU_API_KEY**: Your PayChangu API key (public)
- **PAYCHANGU_API_SECRET**: Your PayChangu API secret (private, keep secure)
- **PAYCHANGU_BASE_URL**: PayChangu API base URL (usually `https://api.paychangu.com`)
- **PAYCHANGU_WEBHOOK_SECRET**: Secret for verifying webhook signatures
- **FRONTEND_URL**: Your frontend application URL (used for return/cancel URLs)

## Step 3: Configure Webhook Endpoint

PayChangu needs to send payment status updates to your backend. Configure the webhook URL in your PayChangu dashboard:

1. Go to **Settings** → **Webhooks**
2. Add webhook URL: `https://your-domain.com/api/payments/webhook/paychangu`
3. Select events: `payment.completed`, `payment.failed`, `payment.cancelled`
4. Save the webhook secret and add it to your `.env` file

### Local Development

For local development, use a tool like [ngrok](https://ngrok.com/) to expose your local server:

```bash
ngrok http 5000
```

Then use the ngrok URL in your PayChangu webhook configuration:
```
https://your-ngrok-url.ngrok.io/api/payments/webhook/paychangu
```

## Step 4: Payment Flow

### How It Works

1. **User initiates payment**: User selects PayChangu as payment method at checkout
2. **Backend creates checkout session**: Backend calls PayChangu API to create a checkout session
3. **User redirected to PayChangu**: User is redirected to PayChangu's hosted payment page
4. **User completes payment**: User enters payment details on PayChangu's secure page
5. **PayChangu redirects back**: User is redirected back to your site (success or cancel URL)
6. **Webhook confirmation**: PayChangu sends webhook to confirm payment status
7. **Payment verified**: Frontend verifies payment status and updates order

### Return URLs

The system automatically generates return URLs:
- **Success URL**: `${FRONTEND_URL}/payment/success?orderId={ORDER_ID}`
- **Cancel URL**: `${FRONTEND_URL}/payment/cancel?orderId={ORDER_ID}`

## Step 5: Testing

### Test Mode

PayChangu provides test credentials for development. Use test API keys in your `.env` file during development.

### Test Payment Flow

1. Create a test order
2. Select PayChangu as payment method
3. Use PayChangu test card numbers:
   - **Card Number**: `4242 4242 4242 4242`
   - **Expiry**: Any future date
   - **CVV**: Any 3 digits
4. Complete payment
5. Verify payment status in admin dashboard

### Testing Webhooks

Use PayChangu's webhook testing tool or send test webhooks to verify your endpoint:

```bash
curl -X POST https://your-domain.com/api/payments/webhook/paychangu \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test_session_123",
    "status": "completed",
    "transactionId": "test_txn_123",
    "reference": "test_ref_123",
    "amount": 10000
  }'
```

## Step 6: Production Deployment

### Before Going Live

1. ✅ Replace test credentials with production credentials
2. ✅ Update `FRONTEND_URL` to production URL
3. ✅ Configure production webhook URL in PayChangu dashboard
4. ✅ Test end-to-end payment flow
5. ✅ Verify webhook endpoint is accessible
6. ✅ Set up monitoring for payment failures

### Production Checklist

- [ ] Production API credentials configured
- [ ] Webhook URL configured in PayChangu dashboard
- [ ] Webhook secret matches in `.env` and PayChangu dashboard
- [ ] SSL certificate installed (required for webhooks)
- [ ] Frontend URL updated to production domain
- [ ] Error handling tested
- [ ] Payment verification tested
- [ ] Order status updates tested

## Troubleshooting

### Payment Not Redirecting

- Check `PAYCHANGU_API_KEY` and `PAYCHANGU_API_SECRET` are correct
- Verify `PAYCHANGU_BASE_URL` is correct
- Check browser console for errors
- Verify return URLs are accessible

### Webhook Not Receiving Updates

- Verify webhook URL is accessible from internet
- Check webhook secret matches
- Verify webhook is configured in PayChangu dashboard
- Check server logs for webhook errors
- Test webhook endpoint manually

### Payment Status Not Updating

- Check webhook is being received
- Verify payment verification logic
- Check database for payment records
- Review server logs for errors

### Common Errors

**"PayChangu API credentials not configured"**
- Ensure `PAYCHANGU_API_KEY` and `PAYCHANGU_API_SECRET` are in `.env`
- Restart server after adding credentials

**"Return URL and Cancel URL are required"**
- Ensure `FRONTEND_URL` is set in `.env`
- Check return/cancel URLs are being generated correctly

**"Payment verification failed"**
- Check payment status in PayChangu dashboard
- Verify webhook was received
- Check payment record in database

## API Reference

### Create Checkout Session

**Endpoint**: `POST /api/payments/initiate`

**Request Body**:
```json
{
  "orderId": "order_id_here",
  "paymentMethod": "paychangu",
  "phoneNumber": "+265XXXXXXXXX",
  "returnUrl": "https://your-site.com/payment/success?orderId=...",
  "cancelUrl": "https://your-site.com/payment/cancel?orderId=..."
}
```

**Response**:
```json
{
  "payment": { ... },
  "redirectUrl": "https://paychangu.com/checkout/session_id"
}
```

### Webhook Endpoint

**Endpoint**: `POST /api/payments/webhook/paychangu`

**Webhook Payload**:
```json
{
  "sessionId": "session_id",
  "status": "completed",
  "transactionId": "transaction_id",
  "reference": "reference",
  "amount": 10000
}
```

## Support

For PayChangu-specific issues:
- PayChangu Documentation: [https://docs.paychangu.com](https://docs.paychangu.com)
- PayChangu Support: support@paychangu.com

For AutoTek integration issues:
- Check server logs
- Review payment controller code
- Verify environment variables

## Security Notes

1. **Never commit `.env` file** to version control
2. **Keep API secrets secure** - rotate them regularly
3. **Use HTTPS** in production for webhook endpoints
4. **Verify webhook signatures** (implement when PayChangu provides signature verification)
5. **Validate payment amounts** before updating order status
6. **Log all payment transactions** for audit purposes

---

**Last Updated**: January 2025  
**Version**: 1.0
