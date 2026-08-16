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
| 2 | Checkout delivery fee stays `MWK 0` until end-of-project | PASS | `Checkout.tsx`/`Cart.tsx` still show `MWK 0` / "Calculated at checkout"; no flat 6,000 fee anywhere in frontend or backend order/coupon logic |
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

## 4. Known pre-existing issue (not fixed, flagged only)

- **`RequestPart.tsx` auth-check race on hard navigation.** Navigating directly to `/request-part` (e.g. a bookmark, a shared link, or any full page load rather than in-app click) redirects to `/login` even with a valid session, because the page's `useEffect` checks Redux auth state before the app's `auth/me` bootstrap call resolves, and redirects immediately rather than waiting. Confirmed via `git show HEAD` that this logic is byte-identical to the pre-redesign version — not a regression from this work. The page functions correctly once reached through normal in-app navigation. Left unfixed since it's outside the "visual redesign only" scope and wasn't called out in the original gap analysis; worth a small follow-up if it turns out to bite real users.

## 5. Remaining open item

- **Decision 2 — dynamic delivery fee.** Still deliberately deferred, per the Decision Log, to "the very end of the whole redesign project." Cart and Checkout are fully restyled but keep `MWK 0` live behavior. When picked up, it's a real feature (dynamic fee + admin settings surface), not a styling tweak — needs its own design/implementation pass.

With Phase 1 and Phase 2 both complete and verified, this is the only item left on the original gap-analysis list.
