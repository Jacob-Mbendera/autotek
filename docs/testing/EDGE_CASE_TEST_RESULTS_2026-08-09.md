# Edge-case test results — orders, services, refunds (2026-08-09)

Follow-up pass to `E2E_TEST_PLAN_2026-08-09.md` / `E2E_TEST_RESULTS_2026-08-09.md`, executing the plan in `EDGE_CASE_TEST_PLAN_2026-08-09.md`. All six deferred edge cases exercised against the real running dev app; browser-driven where the flow is customer/admin-facing, curl-driven where the fastest reliable way to provoke the condition (declined payment, concurrent write, cross-provider access) was a direct API call. Two real bugs found — both fixed and re-verified live in the same session; four areas confirmed working as designed.

## Result summary

| # | Area | Result |
|---|------|--------|
| 1 | Partial/sequential refunds | **Bug found and fixed** — core refund logic correct, UI fallthrough fixed |
| 2 | Payment failure / declined card | **Bug found and fixed** — frontend no longer gets stuck permanently |
| 3 | Payout clawback on cancel-after-payment | **Pass** |
| 4 | Concurrent-edit conflict (custom orders) | **Pass** |
| 5 | Mechanic-role edge cases | **Pass** |
| 6 | Guest-to-account order linking | **Pass** (confirms a known gap, not a bug) |

## 1. Partial and sequential refunds across multiple returns on one order

Corrected a wrong assumption from the plan doc first: a single order supports only **one open** (pending/approved) return at a time — `returnController.ts` explicitly blocks a second return request while one is still open. "Partial and sequential refunds" means: one `Return` document can hold multiple items, and separately, an order can accumulate multiple **sequential** `Return` documents over time (one fully resolved before the next opens), each completed independently.

Tested the real sequential case: order with 2 items (MWK 180,000 + MWK 209,098, total MWK 389,098) → return #1 for item A only → admin approve, queue, complete (MWK 180,000) → Order/Payment correctly stayed `refund_pending`, not `refunded` → return #2 requested for item B → admin approve, queue, complete (MWK 209,098) → Order/Payment **then** correctly flipped to `refunded`, matching the sum of both completed returns. Verified against MongoDB after each step, not just the UI.

**Bug found and fixed**: completing an individual return via the "Complete return refunds" sub-modal correctly finished that return, but the parent `completeTarget` state didn't clear — after the last open return completed, the component fell through to a *different* confirmation dialog offering to mark the **entire order payment** as refunded, using the full order amount rather than anything return-specific. Clicking through it would have double-processed the refund (blocked in practice by the backend's own idempotency check, which returned "Refund already marked completed" when this was hit accidentally during testing — so it was UI confusion risk, not a hard money bug, but still worth fixing since idempotency being the last line of defense wasn't the intended safeguard).
- Fixed in `frontend/src/pages/admin/Refunds.tsx`: `handleCompleteReturn` now closes the modal (`setCompleteTarget(null)`) once `returnsAwaitingCompletion.length <= 1` (i.e. the return just completed was the last one open), instead of leaving `completeTarget` set and letting the render fall through. The final `else` branch (the whole-payment confirmation dialog) is now also gated on `!completeTargetOrderId`, so it can only ever render for a non-order-type target (towing/car-service payments) — never for an order-type payment that has or had linked returns.
- **Re-verified live** with a fresh 2-item order (MWK 180,000 + MWK 20,000): completed the first of two sequential returns (order correctly stayed `refund_pending`), then completed the second/last return — the modal now closes cleanly with no misleading dialog, and the order/payment correctly flipped to fully `refunded`. Confirmed via MongoDB after each step.

## 2. Payment failure / declined card path

Checkout → PayChangu sandbox declined card `4000 0000 0000 0002` → PayChangu's own page correctly shows "Payment Failed." Order/Payment remained `pending`/`pending` in MongoDB (no false success), and no stock was decremented — correct on the backend.

**Bug found and fixed**: the PayChangu failure page has no "return to merchant" link, so a real customer whose card is declined is simply stuck on PayChangu with a "Try Again" button and never redirects back to AutoTek at all. If the customer *does* navigate back manually (e.g. via browser history) to `/payment/success?...`, the page was previously titled "Payment Successful!" and showed "Verifying Payment... this may take a few moments" — and then **never resolved**. Root cause:
- `backend/src/controllers/paymentController.ts` `verifyPaymentByTxRef` correctly returns `verified: false` for a declined payment — it does not falsely mark it completed.
- `frontend/src/pages/PaymentSuccess.tsx` polls this endpoint up to `maxVerificationAttempts = 5` times (~10 seconds), but once the cap was hit, the polling `useEffect` just returned — no failure UI, no navigation, nothing. The sibling effect that handles `PaymentStatus.FAILED` by navigating to `/payment/cancel` never fires because the backend has no code path that ever sets a payment to `FAILED` from this polling flow — `FAILED` is only set by the PayChangu **webhook** (`payChanguWebhook`, not reachable at all from localhost, and not guaranteed to fire for every gateway-level decline even in production).
- Net effect (before fix): a customer who lands back on this page after a decline saw a misleading "Payment Successful!" header with a spinner that ran forever, no error message, no retry button, no way out except navigating away manually.

**Fix**: added a `verificationTimedOut` state, set once `payment.status === PENDING && verificationAttempts >= maxVerificationAttempts`. When set, `PaymentSuccess.tsx` now renders an explicit "We couldn't confirm your payment" screen instead of the success layout — explains the money will be auto-refunded if it was taken, shows the order/transaction reference, and offers "View Order" / "Continue Shopping" actions.

**Re-verified live**: repeated the same declined-card checkout (fresh order, MWK 180,000), navigated back to `/payment/success`, watched the "Verifying Payment" spinner run through its attempts and correctly transition to the new "We couldn't confirm your payment" screen after ~10 seconds. Also re-ran a full successful checkout end-to-end afterward to confirm the fix didn't regress the legitimate success path — payment correctly showed "Paid" with no interference from the new failure-state logic.

## 3. Payout clawback on cancel-after-payment

Confirmed the real trigger point via code read first: `ServicePayout` is created the moment a service **payment** completes (not when status reaches `Completed`) — as long as a provider is already assigned. Since cancellation is only allowed while status is `Assigned` (blocked once `In Progress`/`Completed`), that's the real window to test.

Booked a service → admin assigned mechanic + price → customer paid (payout created, `PENDING`, confirmed via MongoDB) → customer cancelled while still `Assigned` → verified: payout flipped to `VOIDED` with `voidReason: "Car service cancelled by customer"` and a `voidedAt` timestamp; `Payment`/service correctly moved to `refund_pending` (queueable via Admin → Refunds like any other manual refund). No leaked payout, no silent state left `PENDING`.

## 4. Concurrent-edit conflict handling (custom orders)

Read a real custom order's `updatedAt` via the admin API, then sent two sequential `PUT /api/custom-orders/:id` requests carrying that same stale `expectedUpdatedAt`. First succeeded (moved `updatedAt`). Second correctly received `409`-equivalent behavior: `{"message":"This custom order was changed by someone else. Refresh and try again."}`, and confirmed via a follow-up GET that the record retained only the first write's value — the second write never landed. Restored the order's original `estimatedPrice` afterward since this was a real pre-existing order, not test data.

## 5. Mechanic-role edge cases

- **Unlinked mechanic** (a `User` with `role: mechanic` but no `serviceProvider`, as would happen if set via the Admin → Users role dropdown rather than the invite flow): `GET /api/mechanic/services` returned `200 {"carServices":[],"towingServices":[]}` — graceful, not a 500.
- **Wrong-provider access**: created a second real `ServiceProvider` + linked mechanic `User`, then had that mechanic try to view/act on a job assigned to a different provider (Test Mechanic One). `GET /api/mechanic/services` correctly excluded the other provider's job from the list; `PATCH /api/mechanic/services/car-service/:id/status` correctly returned `403 {"message":"This job is not assigned to you"}`. No leak, no cross-provider mutation possible.

## 6. Guest-to-account order linking edge cases

Confirmed via code read and live test: there is no auto-linking mechanism, by design. `orderController.ts` `getOrder` checks `if (req.user)` first and matches strictly on `user: req.user._id`, ignoring `?email=` entirely for authenticated requests. Verified live: a logged-in customer hitting `/orders/:id?email=<the-guest-order's-actual-email>` for an unrelated guest order got `404 Order not found` — even with the exact matching email supplied, it never falls through to guest-email matching once `req.user` exists. Confirmed the guest path independently still works correctly (logged-out request with correct email successfully retrieves the order).

This is a real, consistent, documented product gap rather than a bug: a guest who later creates an account with the same email will **never** see their guest orders under "My Orders" — they can only ever reach them via the original guest link (`?email=` query param), logged out. Worth a backlog item (retroactive claiming of guest orders on registration/login by matching email) but explicitly out of scope to fix in this pass.

## Test data created (cleaned up after this pass)

- Users: `edge-refund-test@example.com` (customer), `edge-admin-test@example.com` (admin), `edge-unlinked-mechanic@example.com` (mechanic, no provider link), `edge-mechanic-two@example.com` (mechanic, linked to a new test provider)
- `ServiceProvider`: "Edge Case Mechanic Two" (Lilongwe garage, mechanic type)
- Orders: `6a78dc147645a3d9687d91d4` (2-item order used for sequential refunds), `6a78e3a77645a3d9687d9690` (declined-payment test order, MWK 20,000, never completed)
- Returns: `6a78de9c7645a3d9687d938d`, `6a78e0b67645a3d9687d9509`
- Car service: `6a78e5d07645a3d9687d975d` (payout clawback test — booked, paid, cancelled)
- Associated `Payment` and `ServicePayout` records tied to the above
- No changes were left on any pre-existing real record: the custom order used for the concurrency test (`6a5c26960df04068a7a15dac`) had its `estimatedPrice` restored to its original value after the test.

## Stock note

The declined-payment order attempts (test #2, both the original and the fix-retest pass) never completed, so they did not decrement stock. No additional stock adjustment needed beyond what was already noted in the happy-path results doc.

## Fixes applied and re-verified this session

1. **Fixed**: `Refunds.tsx` per-return completion modal falling through to a misleading whole-order confirmation dialog after the last linked return completes (see #1). Re-verified live with a fresh 2-item order.
2. **Fixed**: `PaymentSuccess.tsx` had no terminal failure state once verification polling gave up after 5 attempts — customer was stuck on an infinite "Verifying Payment" spinner under a false "Payment Successful!" header (see #2). Re-verified live with a fresh declined-card checkout, and confirmed the legitimate success path still works.

## Outstanding items for follow-up

1. **Backlog, not a bug**: no guest-order-to-account auto-linking on registration/login (see #6).
