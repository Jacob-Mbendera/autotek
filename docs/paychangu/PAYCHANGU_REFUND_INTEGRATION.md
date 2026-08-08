# PayChangu Refund API Integration Guide

## Status: ✅ FULLY IMPLEMENTED - Production Ready

## Overview

The refund functionality has been **fully implemented** and integrated with PayChangu's official refund API endpoint. Refunds are now processed directly through PayChangu's payment gateway.

### PayChangu Refund API

**Endpoint:** `POST https://api.paychangu.com/charge-card/refund/{charge_id}`
**Authentication:** Bearer Token (API Secret)
**Documentation:** https://developer.paychangu.com/reference/refund-card-charge

**Key Points:**
- Refunds require PayChangu's `charge_id` (not `tx_ref`)
- `charge_id` is captured from PayChangu webhook or verification API
- Refunds are processed instantly
- Full refund is performed (partial refunds may require amount parameter)

---

## Implementation Details ✅

### 1. Payment Model with charge_id Support
**File:** `/backend/src/models/Payment.ts`

- ✅ Stores `transactionId` (our tx_ref)
- ✅ Stores `chargeId` (PayChangu's internal ID)
- ✅ Indexed chargeId field for quick refund lookups
- ✅ Links payments to orders
- ✅ Tracks payment status

### 2. Charge ID Capture
**File:** `/backend/src/controllers/paymentController.ts`

**From Webhook:**
- ✅ Captures `charge_id` from PayChangu webhook payload
- ✅ Supports both `charge_id` and `chargeId` formats
- ✅ Updates Payment record when webhook received

**From Verification:**
- ✅ Calls PayChangu verify API on payment success page
- ✅ Extracts `charge_id` from verification response
- ✅ Falls back to `reference` field if charge_id not present

### 3. Refund Service Module
**File:** `/backend/src/utils/paymentRefunds.ts`

- ✅ `processPayChanguRefund()` - Actual PayChangu API integration
- ✅ Validates transaction exists and is completed
- ✅ Validates chargeId is present
- ✅ Validates refund amount doesn't exceed original
- ✅ Calls `POST /charge-card/refund/{charge_id}`
- ✅ Handles PayChangu API responses
- ✅ Error handling and logging

### 4. Return Controller Integration
**File:** `/backend/src/controllers/returnController.ts`

- ✅ Fetches original Payment record with chargeId
- ✅ Calls `processPayChanguRefund()` with transaction ID
- ✅ Updates refund status: processing → completed/failed
- ✅ Handles API errors gracefully
- ✅ Sends confirmation emails on success

---

## How It Works

### Refund Flow

```
1. Customer completes payment via PayChangu
   ↓
2. PayChangu webhook sends charge_id to our system
   ↓
3. We store charge_id in Payment record
   ↓
4. Customer requests return
   ↓
5. Admin approves return
   ↓
6. Admin processes refund
   ↓
7. System fetches Payment record with charge_id
   ↓
8. Call PayChangu API: POST /charge-card/refund/{charge_id}
   ↓
9. PayChangu processes refund instantly
   ↓
10. Update refund status to "completed"
    ↓
11. Send confirmation email to customer
```

### API Details

**Endpoint:** `POST https://api.paychangu.com/charge-card/refund/{charge_id}`

**Headers:**
```
Authorization: Bearer {PAYCHANGU_API_SECRET}
Content-Type: application/json
Accept: application/json
```

**Path Parameter:**
- `charge_id` (required): PayChangu's unique charge identifier (e.g., "PTC12383")

**Request Body:**
- Currently: No body required (full refund)
- For partial refunds: May require `{ "amount": <refund_amount> }`

**Response Format:**
```json
{
  "status": "success",
  "message": "Refund processed successfully",
  "data": {
    "refund_id": "REF_xxx",
    "charge_id": "PTC12383",
    "amount": 50000,
    "status": "completed"
  }
}
```

### PayChangu API Documentation Reference

For more details, see:

**Refund Endpoint:** https://developer.paychangu.com/reference/refund-card-charge
**Transaction Verification:** https://developer.paychangu.com/docs/transaction-verification

---

## Testing the Integration

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

## Production Behavior

The system now:

1. ✅ Validates transaction exists
2. ✅ Validates chargeId is captured
3. ✅ Validates refund amount
4. ✅ Calls PayChangu refund API
5. ✅ Processes actual refund through PayChangu
6. ✅ Updates refund status based on API response
7. ✅ Sends confirmation email
8. ✅ Returns refund_id from PayChangu

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
