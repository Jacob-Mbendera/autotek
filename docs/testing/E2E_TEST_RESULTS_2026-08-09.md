# End-to-end test results — orders, services, refunds (2026-08-09)

Executed against the plan in `E2E_TEST_PLAN_2026-08-09.md`. Full happy-path lifecycle for both orders (Part A) and services (Part B), driven through the real running dev app via browser automation, using the real PayChangu **sandbox** integration (`PAYCHANGU_API_SECRET` prefix `sec-test-...` — confirmed no real money moved). Edge cases (partial refunds, failed payments, payout clawback, concurrent edits, mechanic-role edge cases) remain out of scope for this pass per the original plan.

## Result summary

Every step in the plan passed. Two real bugs were found and fixed during the run (one critical, one minor); one PayChangu integration quirk was identified as external, not an AutoTek bug; one cosmetic issue was noted but left unfixed as out of scope.

## Part A — Orders

1. **Guest browsing** — home, product listing, filters, product detail: all rendered correctly (after the critical fix below).
2. **Cart** — add two items, cart badge/count and totals correct.
3. **Guest checkout** — shipping form, PayChangu sandbox card `4242 4242 4242 4242`, 3DS OTP (`1234`) all completed successfully. Order created, confirmation shown, guest order lookup via `?email=` worked (after the minor fix below).
4. **Logged-in checkout** — fresh customer account, same card flow, order appeared under "My Orders" immediately.
5. **Stock decrement** — confirmed via product listing between the two purchases (195 → 194).
6. **Admin order processing** — both orders walked through all 5 forward states (Pending → Processing → Dispatched → Ready for Collection → Collected) via real UI clicks, each producing a confirmation modal, an Activity Log entry, and the correct Order Progress percentage (20/40/60/80/100%).
7. **Standard return + refund** — customer requested a return on the delivered order, admin approved, queued a manual PayChangu refund, marked it completed via the per-return completion modal. Order and Payment both correctly flipped to `refunded`, confirmed via direct MongoDB inspection matching the UI.

## Part B — Services

1. **Book a service** — logged in as customer, booked a car service (Oil Change, Toyota Corolla 2018, Blantyre). Created as Pending/Unpaid with "Price not set yet."
2. **Admin assigns provider & sets price** — this is a real business step not originally captured in the plan: a newly booked service has no price until an admin manually assigns a vetted mechanic (moves it to `Assigned`) and enters a quoted price (MWK 15,000) after confirming with the customer by phone/WhatsApp. Both saves worked correctly and independently.
3. **Customer pays** — "Pay Now (MWK)" from My Services, PayChangu sandbox card flow (same card/OTP pattern as orders), MWK 15,000 charged successfully. Service flipped to `Assigned`/`Paid` immediately after redirect.
4. **Admin progresses status** — `Assigned → In Progress → Completed`, one step at a time via the status dropdown, each transition gated correctly on `Payment: completed` (the UI explicitly disallows advancing past Assigned while payment is pending).
5. **Service payout** — a `ServicePayout` row (MWK 15,000, Lilongwe Certified Garage, kind `car-service`, status `Pending`) was auto-created the moment the service reached `Completed` — confirmed via Admin → Providers → Payouts (MWK) tab, with no manual step needed to create it.
6. **Mark paid** — "Mark paid" action flipped the payout to `Paid` immediately.

## Bugs found and fixed

### 1. Critical: guest browsing broken sitewide (fixed, committed `d315c49`)

Every guest page load (`/products`, `/products/:id`, `/orders/:id`, etc.) got stuck on loading skeletons forever. Root cause: `useAuthBootstrap.ts` dispatched the `logout()` action on the expected 401 from `getMe` for a guest with no session cookie. `logout()` is caught by `rtkQueryCacheResetMiddleware`, which resets the entire RTK Query cache — cancelling every other query that had started fetching on the same mount (e.g. the page's own data query) before it could resolve, leaving those components stuck on their initial `isLoading` state permanently.

This was a **pre-existing regression** from this session's own httpOnly-cookie auth migration (the hook was added during earlier #17/#18 fix work), silently breaking all guest browsing from that point until this test caught it.

Fix: swapped `logout()` for the already-existing-but-unused `replaceAuthState({ user: null, isAuthenticated: false })`, which sets the same auth fields without triggering the cache-reset middleware (it only matches on the `logout` action type). Verified live across `/products`, `/products/:id`, and `/orders/:id` as both guest and logged-in.

### 2. Minor: guest "View Order Details" missing `?email=` param (fixed, uncommitted)

`frontend/src/pages/PaymentSuccess.tsx` already extracted `email` from `searchParams` but never passed it into the "View Order Details" navigation, so a guest clicking through from the payment success page landed on `/orders/:id` with no `?email=` and saw "Order not found." Fixed to conditionally append `?email=${encodeURIComponent(email)}` when present. Verified live.

**Not yet committed** — held back for the user to review/bundle.

## Non-bugs / notes

- **PayChangu redirect strips the `:5173` port from `localhost` URLs** — reproduced on both the order and service payment flows. Confirmed via backend log inspection (`PayChangu redirect URLs prepared`) that AutoTek's own outgoing `callback_url`/`return_url` construction correctly included the port; the stripping happens on PayChangu's own hosted-checkout redirect. Not an AutoTek bug — worked around during testing by re-navigating to the correct port manually. Real users on a deployed domain (no explicit port) won't hit this.
- **PayChangu Mobile Money sandbox rejects arbitrary test numbers** ("Please use one of the test numbers") — expected sandbox behavior, not a bug. Card flow was used for all payment tests instead.
- **Cosmetic, not fixed**: the order Activity Log shows the raw enum value "Order ready_for_collection" for that one status transition, inconsistent with the humanized labels ("Order processing", "Order dispatched") used for every other transition. Left as-is, out of scope for this pass.

## Test data created (cleaned up after this pass)

- Users: `e2e-loggedin-test@example.com`, `e2e-admin-test@example.com` (passwords were reset directly in MongoDB mid-session after original passwords were lost to a context-window compaction — not a security-relevant event, both are disposable test accounts)
- Guest order email: `guest-e2e-test@example.com` (no `User` doc)
- Orders: `6a78ca4c7645a3d9687d8b4c` (guest), `6a78cce57645a3d9687d8bd7` (logged-in)
- Return: `6a78d2717645a3d9687d8ddd`
- Car service: `6a78d5a37645a3d9687d8f8b`
- Associated `Payment` and `ServicePayout` records tied to the above

## Note on stock levels

Product stock decremented by the two real orders placed during this test was **not** restocked — the exact quantities across all purchased line items weren't precisely tracked, and guessing at a correction risked introducing a different discrepancy. Stock counts in the dev database are a few units lower than before this pass as a result; this only affects the dev/sandbox environment.

## Deferred to follow-up pass (per original plan)

Partial/sequential refunds across multiple returns on one order, failed/declined payment path, payout clawback on cancel-after-payment, concurrent-edit conflict handling, mechanic-role edge cases (unlinked mechanic, wrong-provider job access), guest-to-account order linking edge cases.
