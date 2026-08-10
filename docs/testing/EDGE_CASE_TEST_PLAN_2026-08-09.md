# Edge-case test plan — orders, services, refunds (2026-08-09)

Follow-up pass to `E2E_TEST_PLAN_2026-08-09.md` / `E2E_TEST_RESULTS_2026-08-09.md`, covering the six items explicitly deferred from the happy-path run. Same method: real running dev app (`localhost:5173` / `localhost:5000`), real PayChangu **sandbox**, browser-driven for user-facing steps, curl/MongoDB for setup, verification, and provoking conditions a UI can't easily reach (e.g. simulated concurrent writes). Test data cleaned up after.

## 1. Partial and sequential refunds across multiple returns on one order

Order with 2+ line items → two separate return requests (one per item) → admin approves both → queue + complete refunds **one at a time**. Expect: `Payment`/`Order` status stays non-refunded after the first completion (per-return completion modal, `9e3a30c` "Complete return refunds individually instead of per-order"), and only flips to `refunded` once the summed completed-return amounts cover the full payment.

## 2. Payment failure / declined card path

Checkout with PayChangu sandbox declined card `4000 0000 0000 0002` (per `docs/paychangu/PAYCHANGU_TESTING.md`). Expect: order/payment end in a failed (not completed/pending-forever) state, no stock decrement, customer sees a clear failure message and can retry with a working card.

## 3. Payout clawback on cancel-after-payment

Per `backend/src/utils/servicePayout.ts`: a `ServicePayout` is created the moment a service **payment** completes (if a provider is already assigned) — not when status reaches `Completed`. Cancellation is only allowed while status is `Assigned` (blocked for `in-progress`/`completed`), so the window to test is: book service → admin assigns provider + price → customer pays (payout created, `PENDING`) → customer cancels while still `Assigned` → expect `processPaidServiceCancelRefund` to queue a refund and `voidServicePayoutIfPending` to flip the payout to `VOIDED` (not `PAID`, not left `PENDING`).

## 4. Concurrent-edit conflict handling (custom orders)

`customOrderController.ts` uses an `expectedUpdatedAt` optimistic lock (commit `0e8a18f`), not a version counter. Reproduce via two sequential curl `PATCH` requests carrying the *same* stale `expectedUpdatedAt`: first succeeds and moves `updatedAt`, second must 409 with "This custom order was changed by someone else. Refresh and try again." rather than silently overwriting. No real second browser session needed — the check is on the timestamp, not on session identity.

## 5. Mechanic-role edge cases

Two sub-cases against `backend/src/controllers/mechanicController.ts` (built this session, commit `86afa45`):
- A `User` with `role: mechanic` but **no** linked `serviceProvider` (e.g. set via Admin → Users role dropdown rather than the invite flow) hits `GET /api/mechanic/services` — expect a graceful 404/empty response, not a 500.
- A real invited mechanic (linked to Provider A) attempts to view or `PATCH` a job assigned to Provider B — expect 403, not leaking or allowing the update.

## 6. Guest-to-account order linking edge cases

Confirmed via code read (`orderController.ts` `getOrder`): there is **no** auto-linking of a guest order to a `User` account on registration or login — an authenticated request to `/orders/:id` is matched strictly on `user: req.user._id`, ignoring any `?email=` query param even if it matches the guest order's email. Verify this live: guest checkout with email X → register/login as a user with email X → confirm the guest order does **not** appear under "My Orders" and is not reachable at `/orders/:id` while logged in (only via the original guest `?email=` link, logged out). This documents a real product gap rather than a bug to fix — the point of this test is to confirm the behavior is consistent and doesn't error, not to leak one guest's order to a different account, and to record it for the backlog rather than let it surface as a support surprise.

## Out of scope (still)

Nothing further deferred — this pass covers the full remaining list from the original plan. Any *new* gaps found here (e.g. the guest-linking gap in #6) go to the backlog, not fixed inline, unless trivial and clearly in-bounds.
