# PayChangu Refund API Integration Guide

## Status: ⚠️ Partially Implemented - Awaiting PayChangu API Documentation

## Overview

The refund functionality has been **structurally implemented** but requires PayChangu's actual refund API endpoint documentation to complete the integration.

---

## What's Already Implemented ✅

### 1. Refund Service Module
**File:** `/backend/src/utils/paymentRefunds.ts`

- ✅ `processPayChanguRefund()` - Processes refunds through PayChangu
- ✅ `checkRefundStatus()` - Checks refund status
- ✅ Validation logic (transaction exists, amount validation)
- ✅ Error handling
- ✅ Logging

### 2. Return Controller Integration
**File:** `/backend/src/controllers/returnController.ts`

- ✅ Fetches original payment record
- ✅ Calls `processPayChanguRefund()` with transaction ID
- ✅ Updates refund status based on API response
- ✅ Handles success/failure scenarios
- ✅ Sends confirmation emails

### 3. Payment Record Tracking
**File:** `/backend/src/models/Payment.ts`

- ✅ Stores `transactionId` from PayChangu
- ✅ Links payments to orders
- ✅ Tracks payment status

---

## What's Missing: PayChangu API Documentation ❗

To complete the integration, you need to obtain from PayChangu:

### 1. Refund API Endpoint

**Contact:** developer@paychangu.com or support@paychangu.com

**Questions to ask:**

1. **What is the refund API endpoint?**
   - Possible patterns:
     - `POST https://api.paychangu.com/refund`
     - `POST https://api.paychangu.com/transactions/{tx_ref}/refund`
     - `POST https://api.paychangu.com/payments/{payment_id}/refund`

2. **What authentication method?**
   - Bearer token with API Secret?
   - API Key in headers?
   - Other authentication?

3. **What is the request payload structure?**
   ```json
   {
     "tx_ref": "PAYCHANGU_xxx",
     "amount": 50000,
     "currency": "MWK",
     "reason": "Customer return"
   }
   ```

4. **What is the response format?**
   ```json
   {
     "status": "success",
     "data": {
       "refund_id": "REF_xxx",
       "amount": 50000,
       "status": "completed",
       "transaction_id": "PAYCHANGU_xxx"
     },
     "message": "Refund processed successfully"
   }
   ```

5. **Does it support partial refunds?**
   - Can you refund less than the original amount?

6. **Is refund processing synchronous or asynchronous?**
   - Immediate response?
   - Or webhook notification later?

7. **How to check refund status?**
   - `GET /refunds/{refund_id}` endpoint?

8. **What are the possible refund statuses?**
   - pending, processing, completed, failed?

9. **What error codes are returned?**
   - Invalid transaction ID?
   - Insufficient balance?
   - Already refunded?

10. **Are there any refund limitations?**
    - Time window (e.g., 90 days)?
    - Number of refunds per transaction?
    - Minimum/maximum amounts?

---

## How to Complete the Integration

### Step 1: Get PayChangu Documentation

Contact PayChangu support:
```
To: developer@paychangu.com, support@paychangu.com
Subject: Refund API Documentation Request

Hello PayChangu Team,

We are integrating your payment gateway for our e-commerce platform
(AutoTek - autotek.mw) and need documentation for the Refund API.

Could you please provide:
1. Refund API endpoint and HTTP method
2. Request payload structure and required fields
3. Response format and status codes
4. Authentication requirements
5. Error handling guidelines
6. Refund status tracking (if available)
7. Any limitations or restrictions

Our merchant account: [Your Account ID]

Thank you!
```

### Step 2: Update the Code

Once you receive the documentation, update `/backend/src/utils/paymentRefunds.ts`:

```typescript
// Line 68-110: Uncomment and update the actual API call

const response = await fetch(`${baseUrl}/refund`, { // Update endpoint
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiSecret}`, // Or update auth method
  },
  body: JSON.stringify({
    tx_ref: request.transactionId, // Update field names
    amount: Math.round(request.amount),
    currency: 'MWK',
    reason: request.reason || 'Customer refund request',
    // Add any additional required fields
  }),
});

const data = await response.json();

// Update response parsing based on actual PayChangu format
if (data.status === 'success') {
  return {
    success: true,
    refundId: data.data?.refund_id, // Update path
    transactionId: request.transactionId,
    amount: request.amount,
    status: data.data?.status || 'completed', // Update path
    message: data.message || 'Refund processed successfully',
  };
}
```

### Step 3: Remove Simulation Mode

In `/backend/src/utils/paymentRefunds.ts`, **remove** lines 113-121:

```typescript
// DELETE THIS after real API integration:
console.warn('⚠️  PayChangu refund API not yet integrated - simulating success');
return {
  success: true,
  refundId: `REFUND_${Date.now()}`,
  transactionId: request.transactionId,
  amount: request.amount,
  status: 'completed',
  message: 'Refund processed successfully (simulated - integrate PayChangu API)',
};
```

### Step 4: Test the Integration

1. **Test successful refund:**
   - Create a test order with PayChangu payment
   - Process return and refund
   - Verify refund appears in PayChangu dashboard

2. **Test failure scenarios:**
   - Invalid transaction ID
   - Already refunded transaction
   - Amount exceeds original payment
   - Network errors

3. **Test partial refunds:**
   - Refund amount less than original payment

4. **Check refund status:**
   - If PayChangu provides status endpoint

### Step 5: Update Environment Variables (if needed)

If PayChangu provides additional credentials for refunds:

```bash
# .env
PAYCHANGU_API_SECRET=your_secret_key_here
PAYCHANGU_REFUND_API_KEY=your_refund_key_here  # If separate
```

---

## Current Behavior (Simulation Mode)

Until PayChangu API is integrated, the system:

1. ✅ Validates transaction exists
2. ✅ Validates refund amount
3. ✅ Returns simulated success response
4. ✅ Updates refund status to "completed"
5. ✅ Sends confirmation email
6. ⚠️ **Does NOT actually process refund through PayChangu**

**Console Warning:**
```
⚠️  PayChangu refund API not yet integrated - simulating success
```

---

## Testing Checklist

Once integrated, test these scenarios:

### ✅ Success Cases
- [ ] Full refund processes successfully
- [ ] Partial refund processes successfully
- [ ] Refund ID is returned and stored
- [ ] Customer receives refund confirmation email
- [ ] Refund appears in PayChangu dashboard

### ❌ Error Cases
- [ ] Invalid transaction ID returns error
- [ ] Already refunded transaction returns error
- [ ] Refund amount > original amount returns error
- [ ] Network timeout handled gracefully
- [ ] PayChangu API errors handled and logged

### 🔄 Status Tracking
- [ ] Async refunds update status via webhook
- [ ] Refund status can be queried
- [ ] Failed refunds are properly recorded

---

## Alternative: Manual Refund Process

If PayChangu doesn't support automated refunds, you can:

1. **Manual Dashboard Refunds:**
   - Admin processes refund in PayChangu dashboard
   - Updates refund status in AutoTek manually

2. **Update the code to prompt admin:**
   ```typescript
   return {
     success: true,
     refundId: 'MANUAL_REQUIRED',
     status: 'pending',
     message: 'Please process refund manually in PayChangu dashboard',
   };
   ```

3. **Add admin action:**
   - "Mark Refund as Processed" button
   - Requires PayChangu refund ID input
   - Updates status to completed

---

## Support Resources

- **PayChangu Documentation:** https://developer.paychangu.com
- **PayChangu Support:** developer@paychangu.com, support@paychangu.com
- **Python SDK (reference):** https://github.com/PaychanguOnions/paychangu_py

---

## Questions?

If you encounter issues or need clarification, check:
1. PayChangu developer documentation
2. Your PayChangu merchant dashboard
3. Contact PayChangu support team

**Last Updated:** March 17, 2026
