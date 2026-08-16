# AutoTek Client UI Redesign — Status (2026-08-16)

**Purpose:** tracks implementation progress of "The Garage Journal" redesign against the scope agreed in the [Decision Log](CLIENT_UI_REDESIGN_GAP_ANALYSIS_2026-08-14.md#8-decision-log). Read that doc first for the *why* behind each decision — this doc is the *what's actually built* status check against it.

---

## 1. Overall status: Phase 1 and Phase 2 complete

Both phases from Decision 1's sequencing plan have shipped to `dev`.

**Phase 1** — Home, Services, Header, Footer, and the booking flow (Book Service, My Services, Service Payment).

**Phase 2** — the full commerce + account surface: Login, Sign Up, Products, Product Detail, Cart, Wishlist, Checkout, Payment Success (merged with "Order Confirmed" per Decision 1), Orders, Returns, Profile, Compare Products, Request Part, My Part Requests. Plus new Terms/Privacy pages and a real `Footer` component.

All customer-facing pages now use the shared journal component library (`frontend/src/components/journal/`: `Heading`, `Text`, `Button`, `Card`, `StatusPill`, `Field`) — kept deliberately separate from `components/ui/*` (shared with Admin) so none of this visually leaks into the Admin section, which stays untouched by design.

---

## 2. Decision Log — verified against code

Every decision in the [Decision Log](CLIENT_UI_REDESIGN_GAP_ANALYSIS_2026-08-14.md#8-decision-log) was checked directly against the current code on `dev` (not assumed from memory). Result: **10 of 11 items pass exactly as decided; 1 item shipped a functionally-equivalent variant worth a one-line note.**

| # | Decision | Status | Note |
|---|---|---|---|
| 1 | Scope creep — adopt full scope, phased rollout | PASS | Phase 1 + Phase 2 both shipped as planned |
| 1 | 8a re-add inventory (Products, Cart, Checkout, Product Detail, Wishlist, Login, Sign Up) | PASS | Quick View, comparison tray, mobile filter drawer, vehicle fitment filter, pagination, save-for-later, coupon field, remove-confirmation modal, multi-step checkout wizard, guest-checkout + create-account, `DeliveryLocationSelector`, Technical Specifications, Vehicle Fitment, Customer Reviews — all present, none silently dropped |
| 1 | Order Confirmed → merge into `PaymentSuccess.tsx` | PASS | Polling/verifying/error/timeout states preserved; new layout only replaces the success state |
| 2 | Checkout delivery fee | **IMPLEMENTED** (2026-08-16, see §6) | Superseded — Decision 2 explicitly deferred this to "the end of the whole redesign project," which this update is. Delivery fee is now a real per-town admin-configurable feature, not `MWK 0` |
| 3 | Product Detail trust badges — keep 3, drop "12-month warranty" | PASS | `ProductDetail.tsx` shows Genuine/OEM-spec, Nationwide delivery 2–4 days, Fitment help — no blanket warranty claim |
| 4 | Quote-request modal — visual-only reskin, keep real fields | PASS | `MyServices.tsx` modal still submits `{ mobilePhone, whatsAppPhone, quoteRequestNotes }`; "same as mobile" checkbox and Malawi validation intact |
| 5 | Wire dead towing buttons | PASS | "Emergency towing" and "Request towing" both route to `/book-service?service=towing` |
| 6 | Restore Partner `mailto:` link | PASS | Real `mailto:support@autotek.mw?subject=Partner%20application` link in `Services.tsx` |
| 7 | Wishlist icon hidden for guests | PASS | `Header.tsx` keeps the icon gated to authenticated users, matching the still-protected `/wishlist` route |
| 8 | "Track an order" nav item → real destination | PASS | `Header.tsx:70-72` routes to `/my-services` (signed in) or `/login?returnUrl=/my-services` (guest), with a code comment recording why |
| 8 | Order Confirmed "Track order" button → real destination | **PARTIAL** | `PaymentSuccess.tsx` drops the "Track order" button entirely rather than repointing it — success-state CTAs are "View order details" and "Continue shopping" instead. Not a regression (the live app never had this button on this page either) and arguably a cleaner outcome, but it's a literal deviation from the written decision. No action needed unless you want the label restored for consistency with the Header nav item. |
| 9 | Home testimonials — single pull-quote | PASS | Confirmed intentional, matches the new design language |
| 10 | Footer links wired to real routes | PASS | Every link in `Footer.tsx` is a real `react-router` `Link to=` (or `mailto:`/`tel:`) — no placeholder `#` |

**Net result:** no unaddressed gaps from the original analysis. The one partial (Decision 8, second half) is a shipped-better-than-spec deviation, not a missed requirement — flagged here for visibility, not as an open task.

---

## 3. Work done beyond the original gap analysis

Two items surfaced during Phase 2 implementation that the gap analysis didn't anticipate, since they only became visible once the actual restyle work started:

- **Admin/Customer component split for shared pages.** `OrderDetail.tsx` and `ReturnDetail.tsx` were each shared between a customer route (`/orders/:id`, `/returns/:id`) and an admin route (`/admin/orders/:id`, `/admin/returns/:id`) via an `isAdmin` prop. Restyling in place would have leaked the new design into Admin, which is explicitly out of scope. Resolved by splitting each into a customer-only component (restyled) and a separate `AdminOrderDetail.tsx` / `AdminReturnDetail.tsx` (kept on the old styling, mounted only at the admin route) — same isolation pattern already used for `Header`/`DeliveryLocationSelector`.
- **Missing `/compare` route.** The Products page's "Compare" button already linked to `/compare`, but no `<Route>` for `CompareProducts` existed in `App.tsx` — the button was silently non-functional in production before this fix. Added the route; this is a genuine pre-existing bug fix, not a styling change.

## 4. Pre-existing issue found and fixed (2026-08-16)

- **Auth redirect race on hard navigation to protected routes.** On a hard page load, `state.auth.isAuthenticated` starts `false` until the app-root `useAuthBootstrap` query resolves. `ProtectedRoute.tsx` read that flag synchronously at render time and immediately issued `<Navigate to="/login">` before the check could complete — a real history push a genuinely logged-in user couldn't recover from. `RequestPart.tsx` and `BookService.tsx` additionally had their own redundant `if (!user) navigate('/login')` in a `useEffect`, doubling up on the same broken logic. Confirmed via `git show HEAD` that all three were byte-identical to the pre-redesign version — not a regression from this work, but a real bug affecting every protected route, not just Request a Part.
  - **Fix:** added an `isInitialized` flag to `authSlice`, set once the bootstrap query settles; `ProtectedRoute` now waits on it before deciding whether to redirect. Removed the redundant per-page redirects in `RequestPart.tsx`/`BookService.tsx`, keeping only their admin-role checks (which `ProtectedRoute` doesn't cover).
  - **Verified live:** logged-in hard nav to `/request-part`, `/book-service`, `/wishlist`, `/orders` all stay put and render (previously bounced to login); genuine guest hard nav still redirects correctly; non-admin hard nav to `/admin/dashboard` still redirects correctly. `tsc --noEmit` clean, no console errors.

## 5. Decision 2 — dynamic delivery fee (implemented 2026-08-16)

See §6 for the full writeup. This closes the last open item from the original gap analysis — **Phase 1, Phase 2, and Decision 2 are all now complete.**

## 6. Dynamic per-town delivery fee

Per Decision 2's own terms — deferred "to the very end of the whole redesign project," to be built "as a real feature... not a hardcoded number," with "admins get the ability to set and update the delivery fee" — this was implemented once Phase 1/2 landed and verified.

**Design:**
- Fee model: **per-town**, not a single flat fee or an order-total threshold. Every real delivery address is always tied to a `DeliveryLocation.town` (confirmed: "Other/Custom" is a landmark value *within* a selected town, not a townless option), so keying the fee off the existing town document covers every real address with no new model.
- Admin surface: edited inline on the existing **Admin → Delivery Locations** page (`/admin/delivery-locations`), not the separate placeholder Admin → Settings page — one place to manage a town's landmarks and its fee together, rather than splitting one entity's editing across two screens.
- `deliveryFee` lives as its own top-level field on `Order` (not folded into the item-subtotal math), since refund calculations (`returnController.ts`) only ever read `items`/`discount` — keeping the fee separate meant that logic needed no changes.
- Backend recomputes the fee authoritatively from `shippingAddress.town` server-side on order creation — the client never sends a fee value, only displays what it looked up for preview.
- Closed a second, smaller pre-existing gap discovered during this work: the `free-shipping` coupon type existed in the schema and admin UI but did nothing (code comment: "shipping is already 0"). It now actually waives the delivery fee, and the coupon code is correctly attached to the resulting order (a related bug: it previously was only attached when `discount > 0`, so a free-shipping coupon with no dollar discount never got recorded as applied).
- Found and fixed a subtle miscalculation risk while touching `returnController.ts`'s proportional-discount refund math: it derived the pre-discount item subtotal as `totalAmount + discount`, which used to be correct but silently breaks once `totalAmount` also includes `deliveryFee` — an order with both a discount and a delivery fee would have computed a wrong refund proportion. Fixed to derive the subtotal as `totalAmount - deliveryFee + discount` instead.
- Found and fixed a data-migration gap: existing `DeliveryLocation` documents predated the new field, so Mongoose's schema default (`0`) never applied to them retroactively — reading `deliveryFee` on any pre-existing town returned `undefined`. Ran a one-time backfill (`$set` on 33 existing towns) before shipping.

**Verified live (backend via curl, frontend via browser, per claude.md rules):**
- Admin sets a real fee on a town (`PUT /api/delivery-locations/:id`) — persists, rejects negative values with 400.
- Real order creation to that town — `order.totalAmount` correctly includes the fee; a town with `deliveryFee: 0` or an unmatched custom address totals correctly with no fee, no error.
- Real order with a `free-shipping` coupon applied — `deliveryFee` correctly waived to 0, coupon code correctly attached to the order.
- Full browser Checkout flow (guest, real cart, real town selection) — Shipping line goes from "Select a delivery location" placeholder to the real `MWK` amount the instant a town is picked, Total updates live, a real order was placed end-to-end and the resulting order page (`OrderDetail.tsx` and `AdminOrderDetail.tsx`) both show a correct Subtotal / Delivery fee / Total breakdown.
- Admin → Delivery Locations: added a new town with a fee, edited an existing town's fee — both persisted after reload.
- All 4 breakpoints (360/768/1024/1440) clean on Checkout, no console errors throughout.
- All test data (seeded admin user, test orders, test coupon, test town, and the two towns' fees used for testing) cleaned up afterward.
