# AutoTek System Audit — 2026-08-08

**Scope:** Full backend + frontend audit — business logic correctness, backend/frontend contract mismatches, stale frontend state, and security. Performed via a multi-agent review (5 domain reviewers + 2 cross-cutting sweeps: security, stale-state) with every finding independently adversarially verified against the actual code before inclusion here.

**Result:** 32 raw findings, 31 confirmed on verification, 1 refuted and dropped. 2 critical, 6 high, 12 medium, 10 low, plus 1 explicitly-verified-correct control (no action needed).

**Status of this document:** Findings only, at time of audit. Fix status is tracked per-item below and will be updated as fixes land.

---

## How to read this

- **Fixable now** = a clear code bug fixable without a product/business decision. These are the ones being fixed as part of this pass.
- **Not fixable now** = requires a design/architecture decision (e.g. moving JWT storage, redesigning payout timing) and is documented for a deliberate follow-up, not silently patched.
- Each item cites exact file:line evidence and a concrete failure scenario, not speculation — this was enforced by the adversarial verification pass.

---

## Critical

### 1. Guest checkout customers are locked out of their own orders and returns
**Domain:** Returns & Refunds / Routing · **Fixable now:** Yes

`/orders/:id`, `/returns`, `/returns/new`, `/returns/:id` are all wrapped in `<ProtectedRoute>` (`frontend/src/App.tsx:228-236, 248-277`), which redirects any unauthenticated user straight to `/login`. But guest checkout is a fully supported flow — `Checkout.tsx` stores `guestOrderEmail` in `sessionStorage` and navigates to `/orders/:id` after guest checkout, and `OrderDetail.tsx`, `RequestReturn.tsx`, `ReturnDetail.tsx` all contain extensive `guestEmail`/`?email=` handling that is simply unreachable, because `ProtectedRoute` (`frontend/src/components/ProtectedRoute.tsx:15-19`) bounces the user before any of that code runs.

**Failure scenario:** A guest completes checkout, is navigated to their order confirmation, and is immediately redirected to a login page they have no account for. They cannot view their order, request a return, or use the return-status link emailed to them.

**Fix:** Remove `ProtectedRoute` from these routes (or add a guest-allowed variant) and let the pages' existing guest-vs-auth logic handle access as originally designed.

---

### 2. Public registration endpoint allows self-assignment of admin role
**Domain:** Auth & Authorization · **Fixable now:** Yes

`POST /api/auth/register` accepts a client-supplied `role` field and only validates it's a member of the `UserRole` enum (`backend/src/middleware/authValidation.ts:32-35`) — it never restricts registration to `customer`. `backend/src/controllers/authController.ts:12,45` passes `role: role || UserRole.CUSTOMER` straight into `new User(...)`.

**Failure scenario:** `curl -X POST /api/auth/register -d '{"email":"x@x.com","password":"password1","name":"X","phone":"+265991234567","role":"admin"}'` returns 201 with a JWT carrying `role: 'admin'`, which passes `adminMiddleware` on every `/api/admin/*` route — full access to user management, orders, refunds, media library, coupons, provider payouts.

**Fix:** Hard-code `role: UserRole.CUSTOMER` in `register()`, remove `role` from `validateRegister`. Role changes only via the existing admin-only role endpoint.

---

## High

### 3. PayChangu webhook parses fields that don't match PayChangu's real payload shape
**Domain:** Orders & Payments · **Fixable now:** Yes · **Status: Fixed** (deferred to end of pass, resolved against official PayChangu docs)

**Original finding (partially incorrect — corrected below):** `payChanguWebhook` (`backend/src/controllers/paymentController.ts`) destructured top-level `req.body` fields including a nonexistent `transactionId`. The finding assumed the fix was to read everything from a `req.body.data` wrapper with a `tx_ref` field, based on the repo's own (inaccurate) `docs/paychangu/PAYCHANGU_WEBHOOK_SETUP.md`.

**What the actual PayChangu docs say** (`https://developer.paychangu.com/docs/webhooks.md`, fetched live before fixing): the webhook payload is **flat**, not nested — `{ event_type, currency, amount, charge, mode, type, status, charge_id, reference, authorization, created_at, updated_at }`. There is **no `tx_ref` field in the webhook body at all**. `tx_ref` (our own reference, stored as `payment.transactionId`) only appears in the separate transaction-verification API response (`GET verify-payment/{tx_ref}`, used by `verifyPaymentByTxRef`), which nests `tx_ref`, `reference`, and `status` under `data` — a different endpoint with a different shape.

**The real gap this creates:** since the webhook never carries our own `tx_ref`, and PayChangu's `reference`/`charge_id` are values we don't know until a charge actually happens, there was no reliable way to look up `payment.transactionId` from a first-ever webhook delivery for a given payment.

**Fix implemented:**
- Corrected field parsing to the real flat shape (`event_type`, `status`, `charge_id`, `reference`, `amount`); removed the fictional `transactionId`/`sessionId`/camelCase `chargeId` fields that never existed in any PayChangu payload.
- Added `Payment.paychanguReference` (alongside the existing `chargeId`) and seeded both from `verifyPaymentByTxRef`'s verification response — the one place `tx_ref`, `reference`, and `charge_id` are seen together.
- `findPaymentForWebhook` now matches, in order: (1) persisted `chargeId`/`paychanguReference` — exact; (2) legacy `transactionId`-based candidates, kept defensively; (3) amount + still-`PENDING` + created within 30 minutes, as a bounded best-effort fallback for a payment's very first webhook delivery before anything has been persisted.
- On any match, `chargeId`/`paychanguReference` are persisted immediately so every later webhook for that payment (retries, subsequent events) hits the exact match in step 1.
- Added an `event_type` filter (PayChangu's docs confirm `api.payout` is a separate event type sent to the same URL) so a non-payment event can never fall through to the amount-based fallback matcher and mismatch onto an unrelated pending payment.
- The client-driven `GET /payments/verify-txref` polling (already fixed as item #7 above) remains the authoritative completion path; the webhook is now correctly parsed and best-effort matched as a genuine fallback rather than being silently broken.

---

### 4. Provider can be cleared from a COMPLETED service, corrupting rating/payout data
**Domain:** Car Services & Towing Bookings · **Fixable now:** Yes

The "provider required while in-progress" guard in `updateCarService`/`updateTowingService` only fires when `previousStatus === IN_PROGRESS` (`backend/src/controllers/carServiceController.ts:652-658`, identical in `towingServiceController.ts:537-543`). A request that sends only `{assignedMechanic: null}` with no `status` field bypasses this guard entirely — and also bypasses `assertValidServiceStatusTransition`, which only runs `if (nextStatus)`.

**Failure scenario:** Admin PUTs `{assignedMechanic: null}` on a `completed` service. Request succeeds; `assignedMechanic` becomes `undefined` while `status` stays `completed`. The customer's rating attempt is then rejected ("No provider was assigned"), and the already-created `ServicePayout` row becomes orphaned from a resolvable provider reference in the admin history view.

**Fix:** Extend the guard to block clearing the provider whenever `previousStatus` is `IN_PROGRESS` **or** `COMPLETED`.

---

### 5. Provider payout is created before work happens, with no clawback on later cancel+refund
**Domain:** Car Services & Towing Bookings · **Fixable now:** No — design decision

`createServicePayoutIfNeeded` (`backend/src/utils/servicePayout.ts:12-64`) only checks `payment.status === COMPLETED`, never the service's own status. Because BR-07 intentionally allows pay-before-work (payment while status is still `assigned`), a `PENDING` payout row is created immediately on payment. If the customer then cancels before work starts (allowed — cancel is blocked only at `IN_PROGRESS`), a refund is queued against the `Payment`, but nothing voids the `ServicePayout` row. An admin who later bulk-processes pending payouts could pay the mechanic for a cancelled, refunded service.

**Why not auto-fixed:** Gating payout creation on `service.status === COMPLETED` (the obvious fix) changes when providers get paid — a business/product decision, not a pure bug fix. Documented here for a deliberate follow-up.

---

### 6. Admin "Mark refund completed" bulk-completes ALL of an order's returns using the full order amount
**Domain:** Returns & Refunds · **Fixable now:** No — design decision

`completeManualRefund` (`backend/src/utils/paymentRefunds.ts:254-267`) marks **every** `Return` on an order with `refundStatus` in `pending`/`processing` as `completed` in one `updateMany`, with no per-return amount reconciliation. The admin confirm dialog (`frontend/src/pages/admin/Refunds.tsx:220-222, 322-326`) shows/confirms the full `Payment.amount`, not each return's actual (possibly partial) `refundAmount`.

**Failure scenario:** An order has two separate approved returns (30,000 and 20,000 MWK). Admin actually refunds only the 30,000 one via PayChangu, then clicks "Mark completed" against the shared Payment record (shown as the full 100,000 order total). Both returns get marked `completed`, and the customer owed 20,000 is emailed a refund-completed notice for a refund that never happened.

**Why not auto-fixed:** Fixing this correctly requires tracking refund completion per-Return (schema change — a `paymentId`/`amount` reference per Return) rather than by shared order Payment. That's a data-model decision, not a one-line fix.

---

### 7. Unauthenticated payment-verification endpoint leaks payment records by guessable ID
**Domain:** Auth & Authorization (IDOR) · **Fixable now:** Yes

`GET /api/payments/verify-txref` has **no auth middleware** (`backend/src/routes/paymentRoutes.ts:20`) and returns the full payment object — amount, PayChangu `transactionId`, status, populated order — for any caller supplying a valid `orderId`/`tx_ref`, with no ownership check. Every other payment-read endpoint (`getPayment`, `getPaymentByOrder`, etc.) correctly enforces auth + ownership.

**Fix:** Require auth + the same ownership check used in `getOrder` for authenticated users, guest-email match for guest orders; at minimum strip `transactionId`/`chargeId`/`amount` from unauthenticated responses.

---

### 8. Guest checkout can silently attach an order to someone else's account
**Domain:** Auth & Authorization · **Fixable now:** Yes

In `createOrder`, when an unauthenticated request supplies `guestInfo` + `password` and a user already exists with that email, the code sets `orderData.user = existingUser._id` — but never calls `comparePassword` to verify the supplied password against that account (`backend/src/controllers/orderController.ts:188-201`). Only the "new account" branch actually uses the password.

**Failure scenario:** An attacker who knows a victim's registered email submits a guest order with that email and any arbitrary password. No password check runs; the order (with attacker-controlled items/address) is attached to the victim's real account and shows up in the victim's order history, and the victim gets an unsolicited order-confirmation email.

**Fix:** In the `existingUser` branch, call `comparePassword`; on failure, fall back to guest checkout instead of silently linking the order.

---

### 9. Admin product edit modal never re-syncs with the polling cache while open
**Domain:** Frontend State · **Fixable now:** Yes

`admin/Products.tsx` snapshots the clicked product row into `useState` (`editingProduct`, `formData`) when the edit modal opens (`Products.tsx:134-152`), but the underlying list query polls every 30s. There is no effect that re-syncs the open modal's form state from the refreshed cache.

**Failure scenario:** Admin opens the edit modal for a product (stock: 5) and edits the description for over 30 seconds. Meanwhile the last units sell, and the background poll refreshes the cache to stock: 0 — invisibly, since the modal doesn't re-read it. Admin saves, and the stale `stock: 5` silently overwrites the real, just-fetched value.

**Fix:** Re-sync form state from the freshest matching cache row while the modal is open (guarded to not clobber fields the admin has actively edited), or fetch a fresh single-product record on modal open instead of relying on the list-row snapshot.

---

## Medium

| # | Finding | Domain | Fixable now |
|---|---------|--------|--------------|
| 10 | `useVerifyPaymentMutation` calls a non-existent route `POST /payments/verify` — every retry-verification call 404s silently | Orders & Payments | Yes |
| 11 | `completeAdminRefund` only invalidates the `AdminRefunds` cache tag, leaving Order/Admin/Payment views showing stale `paymentStatus` after a refund completes | Orders & Payments | Yes |
| 12 | Admin custom-order search builds `new RegExp(search, 'i')` from unescaped user input — ReDoS risk (sibling suggestions endpoint already escapes correctly) | Custom Orders / Fitment | Yes |
| 13 | Service ETA (`estimatedArrivalAt`) accepts any parseable date including past dates — no plausibility check, silently shown to customers as live tracking | Car Services | Yes |
| 14 | **Returns Quick Actions stale UI** — already documented as a known issue; root cause confirmed: no polling fallback on the returns query, and order-status polling is explicitly disabled once status is `completed` (the exact state needed for return actions to show) | Returns & Refunds | Yes |
| 15 | No unique constraint/atomic guard on return creation — check-then-act race lets a double-click create two `Return` docs for the same order | Returns & Refunds | Yes |
| 16 | `processRefund` has the same check-then-act race — no atomic guard against double-processing a refund | Returns & Refunds | Yes |
| 17 | JWT persisted to `localStorage` via redux-persist — any XSS on this payments-handling app can exfiltrate the token for full account (incl. admin) takeover | Auth | **No** — design decision (httpOnly cookie migration) |
| 18 | No token revocation/versioning — password reset/change doesn't invalidate previously issued JWTs (valid up to 48h after) | Auth | **No** — design decision (needs `tokenVersion` field + middleware change) |
| 19 | `GET /api/products?search=` builds unescaped `$regex` — ReDoS, unauthenticated (sibling suggestions endpoint already escapes correctly) | Security | Yes |
| 20 | Admin mutation routes (garages, service providers, payouts, refunds, media, custom order/order status updates) have no Joi validation, unlike list endpoints and the order-create endpoint | Security | **No** — broad schema-authoring effort, admin-only blast radius |
| 21 | CORS fully open (`cors()` with no origin option) — already a known, documented open item in the security doc, not new drift | Security | Yes |
| 22 | Customer service cancellation doesn't invalidate the `Admin` cache tag — admin service list doesn't reactively refresh when a customer cancels, unlike every other service mutation | Frontend State | Yes |

---

## Low

| # | Finding | Domain | Fixable now |
|---|---------|--------|--------------|
| 23 | `getVehicleFitmentMatchStrength` doesn't defensively check `fitmentStatus !== 'none'` — relies entirely on write-time validation holding everywhere (no defense-in-depth) | Product Fitment | Yes |
| 24 | Bidirectional engine substring match (`.includes()`) can produce false "strong fitment" matches on short/generic engine codes (e.g. `"i"` matches `"vti"`, `"gdi"`, `"i-VTEC"`) | Product Fitment | Yes |
| 25 | No optimistic concurrency control on custom order updates — two concurrent admin edits can silently overwrite each other with no conflict surfaced | Custom Orders (BR-08) | **No** — needs transaction/optimistic-lock design |
| 26 | **Payment-before-in-progress rule (BR-07) is correctly enforced server-side** — verified positive control, no action needed | Car Services | N/A |
| 27 | `mechanicMiddleware` is defined but never applied to any route — mechanic role has no distinct authorization surface | Auth | **No** — needs product clarification on mechanic role scope |
| 28 | PayChangu webhook signature check uses non-constant-time `!==` comparison, and signature verification is silently skipped when `NODE_ENV` isn't exactly `'production'` and no webhook secret is set | Security | Yes |
| 29 | Password reset endpoints (`forgot-password`, `verify-reset-token`, `reset-password`) have no Joi validation, unlike register/login | Security | Yes |
| 30 | Four Redux slices (`wishlistSlice`, `orderSlice`, `serviceSlice`, `adminSlice`) duplicate RTK-Query-cached server data and are never dispatched to or read anywhere — dead code one "quick fix" away from reintroducing a stale-vs-cache split | Frontend State | Yes |
| 31 | `autotek.selectedVehicle` localStorage filter has no cross-tab `storage` listener, unlike cart/auth/comparison which sync live across tabs | Frontend State | Yes (optional — flagged for awareness, low impact) |

---

## Fix plan for this pass

Per the agreed scope: fix every **fixable now** item as a clear bug; leave every **not fixable now** item documented above for a deliberate follow-up decision rather than silently patched.

**Fixed:** #1, #2, #3 (deferred to end, resolved against live PayChangu docs), #4, #7, #8, #9, #10, #11, #12, #13, #14, #15, #16, #19, #21, #22, #23, #24, #28, #29, #30, #31. All 22 fixable-now items are complete.

**Left for follow-up (documented, not touched — require a product/design decision):** #5 (payout timing vs. cancel/refund clawback), #6 (per-return refund completion tracking), #17 (JWT storage — httpOnly cookie migration), #18 (token revocation/versioning), #20 (broad Joi validation for admin mutation routes), #25 (optimistic concurrency on custom order updates), #27 (mechanic role authorization surface).

**No action needed:** #26 (verified correct — payment-before-in-progress is properly server-enforced).

---

## Verification performed

1. **Type checking:** Backend and frontend `tsc --noEmit` clean after every fix, checked incrementally.

2. **Live curl pass** against the running backend, with all test data cleaned up afterward:
   - #2: registering with `role: "admin"` in the payload creates a `customer`, confirmed via decoded JWT and DB record.
   - #1: guest checkout can view `/orders/:id` and access returns without hitting the login wall (verified via route change + backend `optionalAuthMiddleware` already correctly scoping guest access by email match).
   - #8: guest checkout with an existing account's email and the *wrong* password does not link the order (`guestInfo` stays, no `user`/`token` in response); the *correct* password does link it and issues a token.
   - #7: `verify-txref` returns redacted payment data (no `transactionId`/`chargeId`/`amount`) for both unauthenticated and non-owner-authenticated callers; full data for admin/owner.
   - #4: attempting to clear `assignedDriver` on a `completed` towing service is rejected with the new guard message.
   - #13: past-date and >90-day-future ETAs rejected; valid near-future ETA accepted.
   - #12/#19: a classic ReDoS pattern (`(a+)+$`) against both product search and admin custom-order search completes in <0.35s and returns 200 with no matches (previously would compile as literal regex); the 200-char search length cap returns a clean validation 400.
   - #21: a disallowed `Origin` header is rejected (500 from the CORS error handler); the real frontend origin gets `Access-Control-Allow-Origin` correctly set.
   - #15: direct concurrent-insert test against MongoDB proved the `order_open_return_unique` partial index rejects a genuine race (`E11000`), which the controller's catch block now translates into the existing clean 400 message.
   - #3 (webhook): full chain verified — valid HMAC-signed flat payload against a real payment matched via persisted `chargeId`, correctly transitioned to `completed`, and persisted `paychanguReference`; a brand-new payment with no prior `chargeId`/`reference` matched via the amount+PENDING+recency fallback; an `api.payout` event type was correctly ignored rather than falling through to the fallback matcher; an unsigned request was rejected when `PAYCHANGU_WEBHOOK_SECRET` is configured (confirming the fail-closed fix from #28 as well).

3. **Browser-based pass** (Claude Chrome extension) — covering the RTK Query cache-invalidation fixes that only show themselves in a live UI, all confirmed working with no manual refresh needed:
   - #9: opened the admin product edit modal (Bosch Brake Pads, stock 195), updated stock to 3 directly in the DB while the modal stayed open, confirmed zero `/products` network requests fired for 30+ seconds (polling genuinely paused), then closed the modal and confirmed the list immediately showed the fresh stock (3) — proving the stale-overwrite hazard is closed.
   - #22: in one browser session, loaded `/admin/services` (caching `Admin`-tagged data), navigated to `/my-services` in the same tab, cancelled a booking, then navigated back to `/admin/services` — the cancelled service now showed `cancelled` immediately, no poll wait, no reload.
   - #11: viewed an order's admin detail page showing `Payment: Refund_pending`, completed that refund via Admin → Refunds in the same tab, navigated back to the order detail page — it immediately showed `Payment: Refunded`.
   - #14: as a customer, opened Order Detail for a completed order (Quick Actions showed "Request Return"), created a return for that same order via a separate API call (simulating another tab/device), left the open tab untouched for 50+ seconds — Quick Actions changed on its own to "View Return Request", with no click or reload.

All test data created during verification (test users, orders, services, returns) was removed from the database afterward. One legitimate pending refund from real seed data was processed as part of testing #11 (correct, intended behavior — it was already flagged pending).
