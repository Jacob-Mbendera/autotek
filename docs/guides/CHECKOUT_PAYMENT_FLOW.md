# Checkout and Payment Flow

This document explains how AutoTek checkout and payment work end to end, for both product orders and service bookings.

## 1) Product Checkout Sequence

```text
Customer
  -> Frontend (Checkout page)
    - Enters shipping details
    - Selects PayChangu
    - Clicks Place Order

Frontend
  -> Backend POST /api/orders
    - Sends items, shippingAddress, paymentMethod, guest/account info, coupon

Backend (Order Controller)
  - Validates products, stock, delivery location, coupon
  - Decrements stock
  - Creates Order (paymentStatus = pending)
  <- Returns orderId (+ optional token/user if guest created account)

Frontend
  -> Backend POST /api/payments/initiate
    - Sends orderId, paymentMethod, phone, returnUrl, cancelUrl

Backend (Payment Controller)
  - Creates/reuses pending Payment record
  - Calls PayChangu /payment with tx_ref + callback/return URLs
  <- Returns redirectUrl

Frontend
  -> Redirects browser to PayChangu Checkout URL

Customer
  -> Completes or cancels payment on PayChangu
```

## 2) Payment Confirmation Sequence

```text
PayChangu
  -> Backend POST /api/payments/webhook/paychangu
    - Sends status update (success/failed/cancelled)

Backend (Webhook Handler)
  - Verifies webhook signature
  - Finds matching Payment
  - If success:
      Payment.status = completed
      Order.paymentStatus = completed
  - If failed/cancelled:
      Payment.status = failed
```

## 3) Browser Return Verification (Fallback + UX)

```text
PayChangu
  -> Redirects user to Frontend /payment/success?orderId=...&tx_ref=...

Frontend (PaymentSuccess page)
  -> Backend GET /api/payments/verify-txref?orderId=...&tx_ref=...
    - Confirms with DB and (if needed) PayChangu verify endpoint

Backend (verify-txref)
  - If already completed: returns verified=true
  - If pending: checks PayChangu /verify-payment/{tx_ref}
  - On success: marks payment/order completed

Frontend
  - On verified success:
      clears cart
      invalidates/refetches order + payment data
      shows success details
  - If not yet verified:
      polls/retries briefly
```

## 4) Cancel and Retry Sequence

```text
PayChangu
  -> Redirects to /payment/cancel?orderId=...

Frontend (PaymentCancel page)
  - Shows order still pending
  - User clicks Retry Payment -> useCompleteOrderPayment hook
  - Or opens /orders/:id and clicks Complete Payment

Frontend (Order detail)
  - Complete Payment shown when paymentStatus is pending/failed and order not cancelled
  - Uses same useCompleteOrderPayment hook as PaymentCancel

Frontend
  -> Backend POST /api/payments/initiate (same orderId)
    - Does NOT use /checkout?orderId= (checkout always creates a new order)

Backend
  - Reuses pending payment record
  - Generates fresh tx_ref/session
  <- Returns new redirectUrl

Frontend
  -> Redirects browser to PayChangu Checkout URL
```

## 5) Service Payment Variant (Towing and Car Service)

Same payment engine, different entity:

- `orderId` is replaced by `towingServiceId` or `carServiceId`
- Successful payment updates service `paymentStatus` to `completed`
- Service payout creation is triggered after successful service payment

## Key Implementation Notes

- Order is created first, then payment is initiated
- Webhook plus return-page verification gives resilience if callbacks are delayed
- Pending payment reconciliation helps recover from tab close/interrupted redirect
- Guest and authenticated checkout are both supported

### Pending checkout reconciliation (Cart / background)

- `localStorage` stores pending order id + timestamp when redirecting to PayChangu (30-minute TTL).
- `sessionStorage` stores `autotek_paychanguRedirectAt` when leaving for PayChangu; cleared on success/cancel.
- `/payment/cancel` clears pending storage so abandoned checkouts do not block future cart visits.
- `/cart` uses **passive** reconcile (`mode: 'cart'`): non-blocking banner, checkout always enabled, **Dismiss** + **View pending order** links.
- If user opens `/cart` without a recent PayChangu redirect, one verify with still-pending payment clears pending immediately (abandoned checkout).
- Cart polling caps at 3 attempts / ~45s; consecutive gateway-pending responses give up quickly.
- `/checkout` uses **active** reconcile for the “paid but tab closed” edge case.
- Stale pending (no timestamp or older than 30 minutes) is cleared automatically on load.
- Reconcile polling stops on rate limit (429), payment failed, or max attempts; pending is then cleared.
- `paymentLimiter` applies only to `POST /api/payments/initiate`; read-only verify endpoints use the general API limiter.
- **Payment confirmed email** is sent once when order `paymentStatus` moves to `completed` (webhook or verify-txref), separate from the place-order confirmation email.
- Retry unpaid orders from **Order detail** (`/orders/:id` → Complete Payment) or **Payment cancel** (`/payment/cancel` → Retry Payment). Both call `POST /api/payments/initiate` with the existing `orderId` via `useCompleteOrderPayment`. `/checkout?orderId=` is not used for retry.

