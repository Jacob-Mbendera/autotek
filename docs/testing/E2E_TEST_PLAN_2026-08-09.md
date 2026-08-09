# End-to-end test plan — orders, services, refunds (2026-08-09)

## Scope and method

Full customer-to-admin lifecycle test via the Claude Chrome extension, driving the real running dev app (frontend `localhost:5173`, backend `localhost:5000`), using the real PayChangu **sandbox** integration (confirmed via `PAYCHANGU_API_SECRET` prefix `sec-test-...` — no real money moves). Direct MongoDB access is used only for setup/verification/cleanup of test data, not to fake business outcomes that should come from the UI.

Per the agreed scope for this pass: **happy path first**, covering the full lifecycle end-to-end for both orders and services, guest and logged-in checkout. Edge cases (partial/sequential refunds, payout clawback, concurrent edits, mechanic status flow, failed payments, etc. — most of which were already individually verified via curl during this session's fix work) are an explicit follow-up pass, not part of this run.

## Part A — Orders (product purchase lifecycle)

1. **Browse as guest** — home page, product listing, filters/search, product detail page.
2. **Add to cart** — single item, then a second item; verify cart badge/count and totals.
3. **Guest checkout** — fill shipping address, select PayChangu, pay with sandbox test card (`4242 4242 4242 4242`, any future expiry, any 3-digit CVV per `docs/paychangu/PAYCHANGU_TESTING.md`). Confirm redirect back to the app, order confirmation, guest order lookup via emailed/shown order link.
4. **Logged-in checkout** — register or log in as a fresh test customer, add items to cart, checkout with PayChangu sandbox card, confirm order appears under "My Orders."
5. **Admin order processing** — log in as admin, locate both orders (guest + logged-in) in Admin → Orders, walk the status forward (processing → shipped → delivered, whatever the real `OrderStatus` forward flow is), confirm customer-visible status updates accordingly.
6. **Return + refund (standard, non-partial)** — as the logged-in customer, request a return on the delivered order for one item, confirm as admin, queue the manual refund, mark it completed; confirm order/payment status ends at `refunded` and the customer sees it reflected.

## Part B — Services (towing / car service lifecycle)

1. **Book a service as a logged-in customer** — pick towing or car service (whichever has a cleaner sandbox path), fill required fields, submit.
2. **Pay for the service** via PayChangu sandbox (BR-07: pay-before-work is allowed while status is `assigned`).
3. **Admin assigns a provider** — Admin → Services, assign a vetted mechanic/driver from Providers.
4. **Progress the service** — either via admin moving status forward, or via the mechanic dashboard (`/mechanic/jobs`) built earlier this session, advancing `assigned → in-progress → completed`.
5. **Customer confirms completion** — check the customer-facing status view reflects `completed`; rate the provider if that flow is reachable.
6. **Service payout** — confirm a `ServicePayout` row was created for the assigned provider once paid, and mark it paid via Admin → Providers → Payouts.

## Verification approach

- Browser-driven for every user-facing step (screenshots at key checkpoints).
- Direct MongoDB reads used only to confirm backend state matches what the UI shows (never to substitute for a UI action).
- All test accounts/orders/services created for this pass are cleaned up afterward, consistent with every other verification round this session.
- Results, screenshots, and any bugs found will be written up in a matching `E2E_TEST_RESULTS_2026-08-09.md` after execution.

## Explicitly out of scope for this pass (follow-up)

- Partial and sequential refunds across multiple returns on one order.
- Payment failure / declined card path (`4000 0000 0000 0002`).
- Payout clawback on cancel-after-payment.
- Concurrent-edit conflict handling (custom orders, refunds).
- Mechanic-role edge cases (unlinked mechanic, wrong-provider job access).
- Guest-to-account order linking edge cases.
</content>
