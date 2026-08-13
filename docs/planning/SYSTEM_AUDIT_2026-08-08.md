# AutoTek System Audit — 2026-08-08

**Scope:** Full backend + frontend audit — business logic correctness, backend/frontend contract mismatches, stale frontend state, and security. Performed via a multi-agent review (5 domain reviewers + 2 cross-cutting sweeps: security, stale-state) with every finding independently adversarially verified against the actual code before inclusion here.

**Result:** 32 raw findings, 31 confirmed on verification, 1 refuted and dropped. 2 critical, 6 high, 12 medium, 10 low, plus 1 explicitly-verified-correct control (no action needed).

**Status of this document:** Findings only, at time of audit. Fix status is tracked per-item below and will be updated as fixes land.

**Deployment readiness (2026-08-13):** All 32 findings independently re-verified against current source rather than trusting prior status markers in this doc (which had a history of drift — see #9/#12 and #20 below). Result: **GO.** 31 of 32 are genuinely fixed; the one discrepancy found (#20's scope was narrower than documented) was closed the same day — see the "#20 follow-up" entry in "Follow-up fixes" below. No other gaps found. #26 remains the one verified-correct, no-action-needed control.

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
**Domain:** Car Services & Towing Bookings · **Fixable now:** No — design decision · **Status: Fixed** (2026-08-09, see "Payout clawback + per-return refund completion" below)

`createServicePayoutIfNeeded` (`backend/src/utils/servicePayout.ts:12-64`) only checks `payment.status === COMPLETED`, never the service's own status. Because BR-07 intentionally allows pay-before-work (payment while status is still `assigned`), a `PENDING` payout row is created immediately on payment. If the customer then cancels before work starts (allowed — cancel is blocked only at `IN_PROGRESS`), a refund is queued against the `Payment`, but nothing voids the `ServicePayout` row. An admin who later bulk-processes pending payouts could pay the mechanic for a cancelled, refunded service.

**Why not auto-fixed:** Gating payout creation on `service.status === COMPLETED` (the obvious fix) changes when providers get paid — a business/product decision, not a pure bug fix. Documented here for a deliberate follow-up.

---

### 6. Admin "Mark refund completed" bulk-completes ALL of an order's returns using the full order amount
**Domain:** Returns & Refunds · **Fixable now:** No — design decision · **Status: Fixed** (2026-08-09, see "Payout clawback + per-return refund completion" below; residual UI bug in the same modal fixed 2026-08-10, see "Refunds modal fallthrough + stuck payment verification" below)

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
**Domain:** Frontend State · **Fixable now:** Yes · **Status: Fixed** (2026-08-11, see "Product edit concurrency guard + ReDoS fix" below — scope narrowed on reinvestigation, see that section)

`admin/Products.tsx` snapshots the clicked product row into `useState` (`editingProduct`, `formData`) when the edit modal opens (`Products.tsx:134-152`), but the underlying list query polls every 30s. There is no effect that re-syncs the open modal's form state from the refreshed cache.

**Failure scenario:** Admin opens the edit modal for a product (stock: 5) and edits the description for over 30 seconds. Meanwhile the last units sell, and the background poll refreshes the cache to stock: 0 — invisibly, since the modal doesn't re-read it. Admin saves, and the stale `stock: 5` silently overwrites the real, just-fetched value.

**Fix:** Re-sync form state from the freshest matching cache row while the modal is open (guarded to not clobber fields the admin has actively edited), or fetch a fresh single-product record on modal open instead of relying on the list-row snapshot.

---

## Medium

| # | Finding | Domain | Fixable now |
|---|---------|--------|--------------|
| 10 | `useVerifyPaymentMutation` calls a non-existent route `POST /payments/verify` — every retry-verification call 404s silently | Orders & Payments | Yes |
| 11 | `completeAdminRefund` only invalidates the `AdminRefunds` cache tag, leaving Order/Admin/Payment views showing stale `paymentStatus` after a refund completes | Orders & Payments | Yes |
| 12 | Admin custom-order search builds `new RegExp(search, 'i')` from unescaped user input — ReDoS risk (sibling suggestions endpoint already escapes correctly) | Custom Orders / Fitment | **Fixed** (2026-08-11) — see "Product edit concurrency guard + ReDoS fix" below |
| 13 | Service ETA (`estimatedArrivalAt`) accepts any parseable date including past dates — no plausibility check, silently shown to customers as live tracking | Car Services | Yes |
| 14 | **Returns Quick Actions stale UI** — already documented as a known issue; root cause confirmed: no polling fallback on the returns query, and order-status polling is explicitly disabled once status is `completed` (the exact state needed for return actions to show) | Returns & Refunds | Yes |
| 15 | No unique constraint/atomic guard on return creation — check-then-act race lets a double-click create two `Return` docs for the same order | Returns & Refunds | Yes |
| 16 | `processRefund` has the same check-then-act race — no atomic guard against double-processing a refund | Returns & Refunds | Yes |
| 17 | JWT persisted to `localStorage` via redux-persist — any XSS on this payments-handling app can exfiltrate the token for full account (incl. admin) takeover | Auth | **Fixed** — migrated to an `httpOnly`/`SameSite=Lax` cookie (`autotek_token`); no token is stored in Redux/localStorage anymore, session is re-derived via `GET /auth/me` on app load |
| 18 | No token revocation/versioning — password reset/change doesn't invalidate previously issued JWTs (valid up to 48h after) | Auth | **Fixed** — added `User.tokenVersion`, embedded in the JWT and checked on every request; bumped on logout, password change, and password reset, so any other outstanding token for that user is invalidated immediately, not just the current browser's cookie |
| 19 | `GET /api/products?search=` builds unescaped `$regex` — ReDoS, unauthenticated (sibling suggestions endpoint already escapes correctly) | Security | Yes |
| 20 | Admin mutation routes (garages, service providers, payouts, refunds, media, custom order/order status updates) have no Joi validation, unlike list endpoints and the order-create endpoint | Security | **No** — broad schema-authoring effort, admin-only blast radius · **Fixed** (2026-08-09) — see "Follow-up fixes" below |
| 21 | CORS fully open (`cors()` with no origin option) — already a known, documented open item in the security doc, not new drift | Security | Yes |
| 22 | Customer service cancellation doesn't invalidate the `Admin` cache tag — admin service list doesn't reactively refresh when a customer cancels, unlike every other service mutation | Frontend State | Yes |

---

## Low

| # | Finding | Domain | Fixable now |
|---|---------|--------|--------------|
| 23 | `getVehicleFitmentMatchStrength` doesn't defensively check `fitmentStatus !== 'none'` — relies entirely on write-time validation holding everywhere (no defense-in-depth) | Product Fitment | Yes |
| 24 | Bidirectional engine substring match (`.includes()`) can produce false "strong fitment" matches on short/generic engine codes (e.g. `"i"` matches `"vti"`, `"gdi"`, `"i-VTEC"`) | Product Fitment | Yes |
| 25 | No optimistic concurrency control on custom order updates — two concurrent admin edits can silently overwrite each other with no conflict surfaced | Custom Orders (BR-08) | **No** — needs transaction/optimistic-lock design · **Fixed** (2026-08-09) — see "Follow-up fixes" below |
| 26 | **Payment-before-in-progress rule (BR-07) is correctly enforced server-side** — verified positive control, no action needed | Car Services | N/A |
| 27 | `mechanicMiddleware` is defined but never applied to any route — mechanic role has no distinct authorization surface | Auth | **No** — needs product clarification on mechanic role scope · **Fixed** (2026-08-09) — see "Mechanic role feature" below |
| 28 | PayChangu webhook signature check uses non-constant-time `!==` comparison, and signature verification is silently skipped when `NODE_ENV` isn't exactly `'production'` and no webhook secret is set | Security | Yes |
| 29 | Password reset endpoints (`forgot-password`, `verify-reset-token`, `reset-password`) have no Joi validation, unlike register/login | Security | Yes |
| 30 | Four Redux slices (`wishlistSlice`, `orderSlice`, `serviceSlice`, `adminSlice`) duplicate RTK-Query-cached server data and are never dispatched to or read anywhere — dead code one "quick fix" away from reintroducing a stale-vs-cache split | Frontend State | Yes |
| 31 | `autotek.selectedVehicle` localStorage filter has no cross-tab `storage` listener, unlike cart/auth/comparison which sync live across tabs | Frontend State | Yes (optional — flagged for awareness, low impact) |

---

## Fix plan for this pass

Per the agreed scope: fix every **fixable now** item as a clear bug; leave every **not fixable now** item documented above for a deliberate follow-up decision rather than silently patched.

**Fixed:** #1, #2, #3 (deferred to end, resolved against live PayChangu docs), #4, #7, #8, #10, #11, #13, #14, #15, #16, #19, #21, #22, #23, #24, #28, #29, #30, #31.

**Left for follow-up (originally documented, not touched at the time — all since resolved, see below):** #9, #12, #20, #25, #27.

**Fixed in a later pass (2026-08-09):** #17 and #18 — see "httpOnly cookie + token revocation migration" below. #5 and #6 — see "Payout clawback + per-return refund completion" below. #20 and #25 — see "Follow-up fixes" below. #27 — see "Mechanic role feature" below.

**Fixed in a later pass (2026-08-11):** #9 and #12 — see "Product edit concurrency guard + ReDoS fix" below. Re-verified in a second curl + live-browser pass the same day, including a real conflict reproduction in the Chrome admin UI — see the "second pass" verification entry in that section.

**Corrected in a later pass (2026-08-13):** a deployment-readiness re-check found #20 was only ever partially fixed — the 2026-08-09 pass validated garage/service-provider mutation routes but missed five other admin mutation routes (`mark-paid`, `refunds/:id/complete`, `media-assets/:id` delete, `orders/:id/status`, `custom-orders/:id`) despite the doc marking #20 as fully closed. Closed the remaining gap the same day — see "#20 follow-up" in the "Follow-up fixes" section below. All other findings (#1–#19, #21–#31) were independently re-verified against current source in the same pass and confirmed genuinely fixed with no further discrepancies found.

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

---

## httpOnly cookie + token revocation migration (2026-08-09) — fixes #17 and #18

Both were left as "not fixable now" in the original pass because they needed a design decision, not a quick patch. The user chose the full fix for both: migrate the JWT off `localStorage` into an `httpOnly` cookie (closes #17 completely, not just shrinks the exposure window), and add per-user token versioning for real revocation (closes #18 with no new infrastructure).

**Backend:**
- Added `cookie-parser`. `User` gained `tokenVersion` (default `0`).
- `generateToken`'s payload now includes `tokenVersion`; new `setAuthCookie`/`clearAuthCookie` helpers (`backend/src/utils/jwt.ts`) set/clear an `autotek_token` cookie: `httpOnly`, `secure` in production, `sameSite: 'lax'` (not `'strict'` — PayChangu's post-checkout redirect is a top-level cross-site navigation that `strict` would drop the cookie on), 48h `maxAge`.
- `authMiddleware`/`optionalAuthMiddleware` (`backend/src/middleware/auth.ts`) read the token from the cookie instead of the `Authorization` header, and reject any token whose `tokenVersion` doesn't match the user's current value (`"Session expired, please log in again"`).
- `register`, `login`, and the guest-checkout-links-to-account branch in `createOrder` all call `setAuthCookie`. The JSON body still includes `token` for now (harmless, and `Checkout.tsx` uses its presence as a signal) but nothing reads it as the actual credential anymore.
- New `POST /auth/logout` (`optionalAuthMiddleware`, always 200 — idempotent) clears the cookie and bumps `tokenVersion`, so logout invalidates every outstanding token for that user, not just the current browser's cookie.
- `changePassword` and `resetPassword` both bump `tokenVersion`; `changePassword` also re-issues a fresh cookie so the session that just changed its own password isn't immediately logged out too.
- `authLimiter` (5 req/15min) was moved from wrapping the entire `/api/auth` router down to only the actual credential-guessing-sensitive routes (`register`, `login`, `forgot-password`, `verify-reset-token`, `reset-password`). It was catching `GET /me` too, which is now called on every page load via the bootstrap hook below — that combination was locking every user out of session checks for 15 minutes almost immediately. Found live during verification (274 requests to `/me` in 6 seconds, all `429`), not by inspection.

**Frontend:**
- `baseApi.ts`: `fetchBaseQuery` gets `credentials: 'include'`; the manual `Authorization: Bearer` header attachment is gone.
- `authSlice` no longer holds `token`; `'auth'` was removed from the redux-persist whitelist entirely.
- New `useAuthBootstrap`/`<AuthBootstrap />` (mounted at app root) calls `getMe` once on load and populates `user` from whatever the cookie resolves to — the httpOnly-cookie equivalent of rehydrating from localStorage.
- `Login.tsx`, `Register.tsx`, `Checkout.tsx`'s auto-login branch, and both logout handlers (`Header.tsx`, `AdminHeader.tsx`) all call `broadcastClientSync('auth')` so other open tabs pick up the change (see below).
- `useCrossTabSync.ts` no longer reads `token`/`user` out of persisted `localStorage` (nothing sensitive is there to read). Login/logout instead broadcast an `'auth'` scope; other tabs invalidate the `User` RTK Query tag, causing their own `getMe` to refetch and reflect the shared cookie's actual state.
- `PaymentSuccess.tsx`'s two raw `fetch()` calls (added for #7 in the prior pass) dropped their manual `Authorization` header for `credentials: 'include'`.
- Logout is now `async`: it awaits the server call before dispatching the client-side `logout()` action. Firing both concurrently was a real bug caught during verification — `logout()` triggers `resetApiState()`, which aborts every in-flight RTK Query request, including the logout mutation itself if it hadn't resolved yet, surfacing as an uncaught `AbortError`.

**Bugs found and fixed during this pass (not present in the original design, caught only by testing live):**
1. `authLimiter` router-wide placement would have made the app effectively unusable within minutes of real traffic (see above) — found by watching backend logs during verification, not anticipated in the plan.
2. `Login.tsx`/`Register.tsx`/`Checkout.tsx` never broadcast the `'auth'` cross-tab signal — cross-tab login sync silently didn't work until this was added. Found by testing two tabs side by side.
3. Logout's `dispatch(logout())` racing its own `logoutRequest()` mutation via `resetApiState()`'s abort — found via console `AbortError` during the first logout click.

**Verification:**
- Live curl: `Set-Cookie` on login has correct `HttpOnly`/`SameSite=Lax`/`Max-Age` attributes; `/auth/me` works via cookie jar with zero `Authorization` header and 401s with none; logout clears the cookie; a token captured before logout is rejected after it (`tokenVersion` mismatch) even though it was never individually blacklisted; the same mechanism was verified for the password-change path via a direct DB simulation (issue a token at `tokenVersion: 0`, bump to `1` exactly as `changePassword` does, confirm the old token is rejected).
- Browser: confirmed `document.cookie` is empty and `persist:root` has no `auth` key after login (httpOnly cookie genuinely invisible to page JS); session survives a hard full-page reload with no token anywhere client-side; logout redirects and clears the cookie; two tabs open side by side — logging in on one instantly updates the other (header shows the logged-in state with no reload), and logging out on one instantly logs out the other — with no manual refresh in either direction.

---

## Payout clawback + per-return refund completion (2026-08-09) — fixes #5 and #6

Both were left as "not fixable now" in the original pass because they needed a data-model/product decision, not a one-line patch. The user chose: for #5, add a `VOIDED` payout status with clawback on cancel+refund (not a payout-timing change); for #6, track refund completion per-`Return` instead of per-`Payment`.

**#5 — ServicePayout clawback:**
- `ServicePayoutStatus` gained a `VOIDED` value (`backend/src/types/shared/index.ts`, mirrored in `shared/types/index.ts`); `ServicePayout` gained `voidedAt`/`voidReason`.
- New `voidServicePayoutIfPending(serviceKind, serviceId, reason)` (`backend/src/utils/servicePayout.ts`) atomically flips a `PENDING` payout to `VOIDED`; no-ops if the payout was never created or already paid — an already-paid payout is never retroactively touched.
- Wired into `processPaidServiceCancelRefund` (`backend/src/utils/serviceCancelRefund.ts`), the single place both `cancelTowingService` and `cancelCarService` already route through for a paid-service cancel — called only after the manual refund is successfully queued.
- `markPayoutPaid` (`backend/src/controllers/providerAdminController.ts`) now rejects `VOIDED` payouts explicitly (400) and uses an atomic `findOneAndUpdate` with a `PENDING` precondition instead of an unconditional update, closing a check-then-act race against a second concurrent "mark paid" click (409 if lost). No frontend change was needed — `Providers.tsx` already only renders the "Mark paid" action `if (p.status === 'pending')`, so a voided row shows the status with no action.

**#6 — Per-Return refund completion:**
- `Return` gained `refundCompletedAt` (`backend/src/models/Return.ts`). `refundAmount`/`refundStatus` already existed and were already set correctly per-return by `processRefund` — the gap was purely in *completion*, not in tracking the amount.
- New `completeReturnRefund(returnId, notes)` (`backend/src/utils/paymentRefunds.ts`) atomically claims one `Return` (`refundStatus: 'processing'` precondition), marks it `completed` with its own `refundAmount`, emails the customer using that amount (not `payment.amount`), then checks whether the *sum* of all completed returns on the order now covers the full `Payment.amount` — only then does it call `completeManualRefund` (now accepting a `skipCustomerEmail` option to avoid a duplicate customer email) to close out the shared `Payment`/`Order`. Partial coverage leaves the `Payment` at `refund_pending`, correctly reflecting that money is still owed.
- `completeManualRefund`'s blanket `Return.updateMany(...)` completion block was removed — order-level returns now only complete via the new per-return path.
- New endpoint `PATCH /api/admin/returns/:id/complete-refund` (`adminRefundController.ts` + `returnRoutes.ts`), and `getAllReturns` gained an `orderId` filter so the admin UI can fetch just the returns linked to one order.
- Admin Refunds page (`frontend/src/pages/admin/Refunds.tsx`): completing a refund for an order-type payment now fetches its linked `processing` returns; if any exist, shows a per-return list (each with its own amount and its own "Mark completed" action) instead of the old single blanket confirm dialog. Orders with no linked returns (direct order-level refunds) keep the original single-button flow, which is correct there since there's nothing to split.

**Bug found and fixed during this pass (infrastructure, not in the original plan):**
Stale compiled `.js`/`.d.ts` files for `backend/src/types/shared/index.ts` and `shared/types/index.ts` were committed to git alongside their `.ts` sources (last built weeks earlier). Under `ts-node`, Node's `require()` resolution prefers a sibling `.js` over the `.ts` source, so edits to these two files were silently invisible at runtime — caught when live curl testing showed `ServicePayoutStatus` missing the newly-added `VOIDED` key at runtime despite the source clearly having it. Confirmed the frontend was unaffected (`frontend/vite.config.ts` explicitly aliases `@shared/types` straight to the `.ts` source). Fixed by deleting the 16 stale compiled artifacts (`git rm`) across both directories, removing a stale leftover `backend/dist/`, and adding `.gitignore` rules so compiled output can never again be committed alongside these TS-source-only directories.

**Verification:**
- Live curl: cancelling a paid towing service with an assigned provider voids its `ServicePayout` (`status: "voided"`, `voidedAt`/`voidReason` set); `markPayoutPaid` on that voided row returns 400 with the new message, and on an already-paid row returns 409; the pending→paid happy path still works. Two sequential returns on one order (30,000 then 20,000 MWK, full payment 50,000): completing the first independently leaves the Payment/Order at `refund_pending` and doesn't touch the second; completing the second flips Payment/Order to `refunded` only once the sum covers the full amount; exactly two customer emails were sent (not three); re-completing an already-completed return is a clean no-op.
- Browser: Admin → Providers → Payouts tab shows a voided payout row with "Voided" status and no action button. Admin → Refunds, clicking "Mark completed" on an order with one linked `processing` return shows the new "Complete return refunds" list (return's own amount, its own action) instead of the old single-payment dialog; completing it succeeds and the Payment correctly stays `refund_pending` when the return's amount doesn't cover the full payment.
- All test data (users, orders, payments, returns, service payouts) created for this verification was removed from the database afterward.

---

## Follow-up fixes (2026-08-09) — #20 and #25

**#20 — Admin mutation route validation.** The codebase's actual validation pattern is `express-validator` (see `middleware/authValidation.ts`, `middleware/adminValidation.ts`), not Joi as the original finding assumed — the fix followed the established pattern rather than introducing a second one. Added `validateCreateGarage`/`validateUpdateGarage` and `validateCreateServiceProvider`/`validateUpdateServiceProvider` to `adminValidation.ts` (Malawi phone format, email format, enum checks on `verificationStatus`/`providerType`/`vettingStatus`, Mongo ID format on `garage`, length caps on free-text fields), wired into `adminRoutes.ts`. While auditing the surrounding code for this fix, two independent bugs were also found and fixed:
- `updateServiceProvider` allowed silently reassigning a `ServiceProvider` to a nonexistent `garage` id — `createServiceProvider` already checked this, `update` didn't. Added the same existence check.
- `processRefund` (`returnController.ts`) computed `Number(refundAmount) < 0` as its only guard — a non-numeric `refundAmount` becomes `NaN`, and `NaN < 0` is `false`, so it silently passed through and got persisted as `NaN`. Fixed with `Number.isFinite`.
- `rejectReturn`'s `adminNotes` guard called `.trim()` without checking the value was a string first (would 500 on non-string input) and had no length cap, unlike other notes fields in the codebase. Both fixed.

**#20 follow-up (2026-08-13) — five more admin mutation routes had no validation.** A deployment-readiness re-check found this pass only ever covered garages and service-providers; `PATCH /admin/service-payouts/:id/mark-paid`, `PATCH /admin/refunds/:id/complete`, `DELETE /admin/media-assets/:id`, `PUT /orders/:id/status`, and `PUT /custom-orders/:id` had zero validation middleware despite the doc marking #20 as fully fixed. All admin-only (behind `adminMiddleware`), so blast radius was limited to a compromised/malicious admin account rather than public exposure, but the gap was real. Added `validateMarkPayoutPaid`, `validateCompleteAdminRefund`, `validateDeleteMediaAsset`, `validateUpdateOrderStatus`, and `validateUpdateCustomOrder` to `adminValidation.ts` (Mongo ID format on all `:id` params; `notes`/`supplier` length caps; `status` enum checks against `OrderStatus`/`CustomOrderStatus`; conditional `cancelReason` length check only when `status === cancelled`; `estimatedPrice` non-negative float; `expectedUpdatedAt` ISO8601 format), wired into `adminRoutes.ts`, `orderRoutes.ts`, and `customOrderRoutes.ts`. `POST /admin/media-assets` was checked too — it only reads `req.files` via multer, no body fields, so there was nothing to add a validator for beyond the existing "no files uploaded" check already in the controller.

**#25 — Optimistic concurrency on custom order updates.** `updateCustomOrder` (`customOrderController.ts`) used to `findById` → mutate in memory → `.save()`, a check-then-act race where two concurrent admin edits could silently overwrite each other. The write is now an atomic `findOneAndUpdate` guarded on the `updatedAt` timestamp the client last saw (`expectedUpdatedAt` in the request body, matched against the document's real `updatedAt`) — a concurrent write in between now returns `409` ("This custom order was changed by someone else. Refresh and try again.") instead of clobbering the other admin's change. All existing validation (status transitions, quote-gate checks) is unchanged, only the final write is now atomic. Frontend (`customOrderApi.ts`, `pages/admin/CustomOrders.tsx`) sends `expectedUpdatedAt` on every save and refetches on a `409` so the admin sees the real current state. A real bug was caught mid-implementation: swapping `.save()` for a plain update object would have silently broken "clear supplier/notes to empty," since Mongoose's document-assignment `undefined` (which unsets a path on `.save()`) is stripped before reaching MongoDB in a plain update — fixed by using `$unset` for those fields specifically.

**Verification:**
- Live curl: `updateGarage`/`updateServiceProvider`/`createGarage`/`createServiceProvider` reject invalid email, invalid Malawi phone format, invalid enum values, and oversized notes with clean 400s; happy paths still succeed. `updateServiceProvider` rejects reassignment to a nonexistent garage (400). `processRefund` rejects a non-numeric `refundAmount` (400, was previously silently accepted as `NaN`). `rejectReturn` rejects non-string and oversized `adminNotes` (400, was previously a 500 or unbounded). Two concurrent `updateCustomOrder` calls with the same stale `expectedUpdatedAt`: first succeeds, second gets 409; retrying with the fresh `updatedAt` succeeds; requests with no `expectedUpdatedAt` at all still work (backwards compatible); clearing `supplier` to empty actually removes the field (`$unset` confirmed via a following fetch); status-transition/quote-gate business rules unchanged through the new atomic path.
- Browser: Admin → Providers, submitting an invalid phone number in "Add garage" is rejected with no crash and no false-success toast (confirmed via network tab, 400 response), valid submission succeeds normally. Admin → Custom Orders: opened a custom order's edit modal, simulated a concurrent edit via curl while the modal stayed open, saved from the modal — got the "changed by someone else" toast, the modal auto-refetched and discarded the stale unsaved edit, and a follow-up save with the refreshed data succeeded cleanly.
- All test data (garages, service providers, users, custom orders) created for this verification was removed from the database afterward.

**Verification (2026-08-13, #20 follow-up):**
- `tsc --noEmit` clean on the backend after wiring all five new validators.
- Live curl against all five newly-guarded routes: a malformed `:id` (non-Mongo-ID) on `mark-paid`, `refunds/:id/complete`, `media-assets/:id` (delete), `orders/:id/status`, and `custom-orders/:id` each rejected with a clean `400` and the correct field-specific message; an oversized `notes` string (1001 chars) on `refunds/:id/complete` rejected with `400`; an invalid `status` enum value and a too-short `cancelReason` (with `status: cancelled`) on `orders/:id/status` both rejected with `400`; a negative `estimatedPrice` and a non-ISO8601 `expectedUpdatedAt` on `custom-orders/:id` both rejected with `400`. Confirmed validation doesn't block legitimate requests: the same five routes called with well-formed (but non-matching) Mongo IDs correctly reached controller-level business logic — `404 "not found"`/`"Payout not found"`/`"Media asset not found"`/`"Custom order not found"` or a controller-level `400` with a distinct message (`"Order already has this status."`) — not the validator's generic `"Validation failed"`.
- Test admin account created for this check was removed from the database afterward.

---

## Mechanic role feature (2026-08-09) — fixes #27

Unlike #17/#18/#5/#6/#20/#25, this was scoped as a feature build rather than a bug fix — the user chose to wire the dead `UserRole.MECHANIC` role into real functionality rather than remove it. Plan written to `docs/planning/MECHANIC_ROLE_FEATURE_PLAN_2026-08-09.md` before implementation.

**Account model:** `User` gained an optional `serviceProvider` ref to `ServiceProvider` — the `User` document is the login, the pre-existing `ServiceProvider` document (garage-affiliated staff, no login of its own) stays the operational record. Admins invite an already-vetted `ServiceProvider` via a new `POST /admin/service-providers/:id/invite` (`providerAdminController.ts`), which creates a linked `User` with `role: mechanic`, a random unusable placeholder password, and reuses the exact `resetToken`/`resetTokenExpiry` mechanism the password-reset flow already uses to email a "set your password" link (`emailService.sendMechanicInviteEmail`, a new method built on the same live-sending `sendEmail` the rest of the app uses — confirmed via backend logs that the invite email genuinely sends through the configured Gmail SMTP, not a stub). The mechanic sets a password via the existing `/reset-password` page and logs in through the existing `/login` page — no new auth infrastructure.

**Authorization:** The previously-unused `mechanicMiddleware` (`middleware/auth.ts`) is now wired onto a new `/api/mechanic` route group (`routes/mechanicRoutes.ts`, `controllers/mechanicController.ts`):
- `GET /mechanic/services` — returns only jobs where `assignedMechanic`/`assignedDriver` matches the caller's linked `ServiceProvider` id.
- `PATCH /mechanic/services/:type/:id/status` — lets a mechanic advance **their own assigned job** forward one step only (`assigned → in-progress → completed`), reusing the exact same `assertValidServiceStatusTransition` the admin path uses (including the existing payment-gate rule), with an explicit ownership check (403 if the job isn't assigned to them). No cancel, no reassignment, no price/ETA edits — those stay admin-only.

**Frontend:** new `store/api/mechanicApi.ts` (reuses the existing `CarService`/`TowingService` RTK Query tags so the admin Services page and a mechanic's own dashboard both invalidate correctly from either write path — no separate tag bridge needed). `ProtectedRoute` gained a general `allowedRoles` prop (`adminOnly` kept as-is for existing call sites). New `/mechanic/jobs` page (`pages/mechanic/MyJobs.tsx`) lists a mechanic's assigned jobs with a single "Advance to [next status]" action per job — no dropdown of arbitrary statuses. `Header.tsx` shows a "My Jobs" link for `role === mechanic`. Admin → Providers page gained an "Invite as mechanic" action on vetted mechanic rows.

**Verification:**
- Live curl: full flow — admin invites a vetted `ServiceProvider` (confirmed `User` created with `role: mechanic` + `serviceProvider` link + `resetToken`, confirmed "Email sent successfully" in backend logs against the real configured SMTP), mechanic sets a password via the real reset-token flow and logs in, `GET /mechanic/services` returns only jobs assigned to that provider (confirmed a job assigned to a *different* provider is excluded), advancing a paid `assigned` job to `in-progress` then `completed` succeeds, a third advance attempt on the now-completed job is rejected (400), advancing an *unpaid* job is rejected with the same payment-gate message the admin path uses, an invalid `:type` param is rejected (400), attempting to advance a job assigned to a different provider is rejected (403), a plain `customer`-role user is rejected by `mechanicMiddleware` (403), and a `mechanic`-role `User` with no linked `ServiceProvider` (the pre-existing Admin → Users role-dropdown path, still open) gets a clean empty list / 403 rather than a crash. Double-inviting an already-linked provider is rejected (400); inviting with an email that collides after Gmail's dot/plus-alias normalization correctly reports "already exists" (not a bug — `express-validator`'s `normalizeEmail()` folds Gmail aliases, same as the rest of the codebase's email handling).
- Browser (full pass, after restarting both dev servers cleared a stale Chrome connection state): Admin → Providers → Mechanics tab shows an "Invite as mechanic" action on vetted rows; submitting the invite modal succeeds and the `User`/email-send were confirmed server-side. Followed the real invite link (`/reset-password?token=...`) to set a password, logged out of the admin session, logged back in as the mechanic — the header correctly shows a "My Jobs" link only for the mechanic role. `/mechanic/jobs` correctly lists only that provider's assigned job (customer, address, timestamp, status badge, single "Advance to [next status]" button). Clicking it advanced `assigned → in-progress` live, with the button label updating to "Advance to Completed." Logged back in as admin and confirmed Admin → Services immediately showed the same job's status as `in-progress` with no manual refresh — proving the mechanic write path and the admin read path share cache invalidation correctly with no separate tag bridge needed.
- All test data (users, garages, service providers, car services) created for this verification was removed from the database afterward.

---

## Refunds modal fallthrough + stuck payment verification (2026-08-10)

Found during an end-to-end edge-case pass covering partial refunds, payment failures, payout clawback, concurrent edits, mechanic-role access, and guest order linking (`docs/testing/EDGE_CASE_TEST_PLAN_2026-08-09.md` / `EDGE_CASE_TEST_RESULTS_2026-08-09.md`). Two bugs found, both fixed and re-verified live in the same pass.

**Refunds modal fallthrough (residual bug from #6's per-return completion work):** Completing the *last* linked return on an order via the "Complete return refunds" sub-modal (`frontend/src/pages/admin/Refunds.tsx`) correctly finished that return, but the parent `completeTarget` state was never cleared. Once `returnsAwaitingCompletion` emptied out after the mutation, `hasLinkedReturns` became `false` while `completeTarget` stayed set, so the render fell through to a third, unrelated branch: a generic "Confirm you already refunded MWK [full order amount]" dialog. Clicking through it would have re-invoked the whole-payment completion path a second time on an order that was already fully accounted for via its returns — blocked in practice by the backend's own idempotency check (returned "Refund already marked completed" when this was hit accidentally during testing), so it was a confusing-UI/redundant-action risk rather than a hard money bug, but idempotency being the only thing standing between the admin and a wrong confirmation wasn't the intended safeguard.
- Fix: `handleCompleteReturn` now calls `setCompleteTarget(null)` once `returnsAwaitingCompletion.length <= 1` (i.e. the return just completed was the last one open), closing the modal instead of leaving it to fall through. The generic whole-payment confirmation branch is now also gated on `!completeTargetOrderId`, so it can only ever render for a non-order-type payment (towing/car-service, which never have linked returns) — never for an order-type payment that has or had any.

**Stuck payment verification (new finding):** A declined or otherwise unconfirmed payment left the customer on an infinite "Verifying Payment" spinner under a false "Payment Successful!" header. `PaymentSuccess.tsx` polls `verifyPaymentByTxRef` up to `maxVerificationAttempts = 5` times (~10 seconds); once that cap was hit with the payment still `PENDING`, the polling effect simply stopped — no failure UI, no navigation. The sibling branch that handles `PaymentStatus.FAILED` by navigating to `/payment/cancel` never fired, because nothing in this polling flow ever sets a payment to `FAILED` — that only happens via the PayChangu webhook, which isn't reachable from localhost during development and isn't guaranteed to fire for every gateway-level decline even in production. Compounding this, PayChangu's own hosted failure page has no "return to merchant" link, so a real customer whose card is declined would be stuck there with only a "Try Again" button; if they navigated back to `/payment/success` manually (browser history), they'd hit the frozen spinner.
- Fix: added a `verificationTimedOut` state, set once `payment.status === PENDING && verificationAttempts >= maxVerificationAttempts`. When set, the page renders an explicit "We couldn't confirm your payment" screen instead of the success layout — explains that money will be auto-refunded if any was taken, shows the order/transaction reference, and offers "View Order" / "Continue Shopping" actions.

**Verification:**
- Live browser, real PayChangu sandbox: created a fresh 2-item order (MWK 180,000 + MWK 20,000), completed two sequential returns on it — after completing the first, Payment/Order correctly stayed `refund_pending`; after completing the second (the last one open), the modal closed cleanly with no fallthrough dialog and Payment/Order correctly flipped to `refunded`. Confirmed via MongoDB after each step.
- Live browser, real PayChangu sandbox: repeated a declined-card checkout (`4000 0000 0000 0002`, fresh order, MWK 180,000), navigated to `/payment/success` as the customer would after a manual back-navigation, watched the "Verifying Payment" spinner run through its attempts and correctly transition to the new "We couldn't confirm your payment" screen after ~10 seconds. Immediately re-ran a full successful checkout afterward (same order shape, successful test card) to confirm the fix didn't regress the legitimate success path — payment correctly showed "Paid" with no interference from the new failure-state logic.
- All test data (users, orders, payments, returns) created for this verification was removed from the database afterward.

---

## Product edit concurrency guard + ReDoS fix (2026-08-11) — fixes #9 and #12

Found while re-verifying deployment readiness against live source rather than trusting this document's per-finding status markers — several items marked as open here (#1, #2, #4, #7, #8) turned out to already be fixed in earlier commits with the status column simply never updated; #9 and #12 were the only two genuinely still-open items from a full re-check of the Critical/High/Medium/Low tables.

**#9 — reinvestigated scope.** The original finding assumed the hazard was a background poll silently overwriting the open edit modal's form state. On reinvestigation, `useAdminListQueryOptions(undefined, showModal)` already pauses the products list query's polling, refetch-on-focus, and refetch-on-reconnect while the modal is open — so a background poll cannot clobber an open modal's snapshot. The real, current risk is narrower: the modal's snapshot is only ever as fresh as when it was opened, and there is no way to detect that a *different* admin (or the same admin in another tab) saved a change to the same product in the interim — a save from the stale modal would still silently overwrite that other change. Scoped the fix accordingly (user selected the minimal option over a full atomic-rewrite or a deferred fix, given `updateProduct`'s added complexity from multipart file uploads and Cloudinary deletes versus the simpler JSON-only custom-order case #25 already solved).

- `backend/src/controllers/productController.ts` (`updateProduct`): reused the `expectedUpdatedAt` optimistic-lock pattern from #25. Added a guard immediately after the `Product.findById`/404 check — if the client sent `expectedUpdatedAt` and it doesn't match the product's real `updatedAt`, the request is rejected with `409` ("This product was changed by someone else. Refresh and try again.") before any upload/delete side effects run (`cleanupUploadedFiles` is called on this path so no temp files are orphaned). The existing final write, `Product.findByIdAndUpdate(..., { new: true, runValidators: true })`, was already atomic — no change needed there.
- `frontend/src/store/api/productApi.ts`: `UpdateProductRequest` gained an optional `expectedUpdatedAt`; the existing generic form-data serialization already forwards it with no other change.
- `frontend/src/pages/admin/Products.tsx`: the edit-submit path now sends `expectedUpdatedAt: editingProduct.updatedAt`; a `409` response triggers a refetch of the product list so the admin sees the real current state instead of silently losing their edit with no explanation.

**#12 — ReDoS in provider admin search.** `providerAdminController.ts` built `new RegExp(search, 'i')` directly from unescaped user input in both `listGarages` and `listServiceProviders` (the sibling `/products` and custom-order search endpoints already escaped correctly per #19). Fixed by routing both call sites through the existing shared `escapeRegex` utility (`shared/utils/regex.ts`), the same fix already applied elsewhere in the codebase for #19.

**Verification (2026-08-11, first pass):**
- Live curl: logged in as a test admin, fetched a real product ("Bosch Brake Pads") and captured its `updatedAt` as the "modal just opened" snapshot. Simulated a concurrent edit from elsewhere (`stock: 999`, which moved `updatedAt` forward) — succeeded normally. Replayed a save using the original, now-stale `expectedUpdatedAt`: rejected with `409` and the expected message; confirmed via a follow-up fetch that `stock` remained `999` (the concurrent edit's value), not silently overwritten by the stale save.
- Test admin account and scratch credentials created for this verification were removed afterward. The real product's `stock` was left at `999` from the concurrent-edit simulation (the pre-test value wasn't captured before the simulation ran) — flagged for a manual correction via the admin UI rather than guessed at.

**Verification (2026-08-11, second pass — curl + live browser via Claude Chrome extension):**
- Live curl, #12: classic catastrophic-backtracking patterns (`(a+)+$`, long repeated-char strings) sent as `search` to both `listGarages` and `listServiceProviders` returned in under 1 second with 0 matches (confirming the input is treated as a literal string, not compiled as regex) — no ReDoS hang on either endpoint. A normal literal search (`Bosch Park Plugs`) still matched correctly, confirming no regression to legitimate search.
- Live curl, #9: used a different, untouched product ("Fuel Filter 48") to avoid disturbing the still-altered "Bosch Brake Pads" row from the first pass. Snapshotted its full state (`stock: 81, price: 261265, status: available, updatedAt`), simulated a concurrent edit (`stock → 70`), then confirmed all three cases: a save with the original stale `expectedUpdatedAt` was rejected (`409`, same message as before) with the concurrent edit's value intact; a save with the correct fresh `expectedUpdatedAt` succeeded normally; a save with no `expectedUpdatedAt` at all also succeeded (confirming backwards compatibility for any caller that doesn't send it). Product restored to its exact original snapshot afterward.
- Live browser (Claude Chrome extension), #9: logged into `/admin/products` as a test admin, opened the real "Edit Product" modal for "Bosch Park Plugs" (stock 98), leaving it open. While it stayed open, fired a curl request simulating a different admin changing the stock to 60. Back in the browser, edited the description field in the now-stale modal and clicked "Update Product" — the UI surfaced the exact toast "This product was changed by someone else. Refresh and try again.", and the product list (auto-refetched by the frontend's 409 handler) confirmed the concurrent edit's `stock: 60` was preserved, with the stale description edit never persisted. Product restored to its original stock (98) afterward.
- Test admin account and all scratch credentials/snapshots created for this pass were removed afterward; both test products (Fuel Filter 48, Bosch Park Plugs) were left in their original pre-test state.
