# AutoTek Redesign — Coverage &amp; Gap Analysis ("The Garage Journal" prototype)

**Purpose:** compare the delivered design prototype (`designs/AutoTek Prototype.dc.html` + `designs/__footer.dc.html`, per `designs/README.md`) against the brief (`docs/planning/CLIENT_UI_REDESIGN_PROMPT_2026-08-13.md`) and the current live app. Documents (1) coverage of the requested scope, (2) scope the design added beyond what was asked, (3) functional/behavioral gaps versus the live app that go beyond "visual redesign." No implementation decisions made here — this is the input for that discussion.

**Reminder of the constraint that governs every item below:** *No backend logic, data model, validation rule, or business rule changes. This is a visual/UX redesign unless a change is necessary — and if so, it needs approval first.* Every finding below is flagged against that bar.

---

## 1. Scope coverage — requested screens

All explicitly requested screens are present and, on a first pass, appear complete:

| Requested (brief) | In prototype? | Notes |
|---|---|---|
| Home | Yes | Full section rebuild — see §4 |
| Services (browse) | Yes | Full section rebuild — see §4 |
| Book Service form | Yes | All 5 form sections present, same field set as the live form |
| My Services | Yes | Stat tiles, filters, booking cards, quote modal, cancel modal all present |
| Service Payment | Yes | Quote-ready + confirming states present |
| Header (site-wide chrome) | Yes | Redesigned, role-gated as requested |
| Footer (site-wide chrome) | Yes | Redesigned, expanded from the current minimal footer as invited in the brief |

**Verdict: the requested scope is fully covered.** No missing screen from the original ask.

---

## 2. Scope the design added beyond the brief

The brief scoped Home + Services + the booking flow (Book Service, My Services, Service Payment) as in-scope, and explicitly listed Products, Cart, Checkout, Orders, Returns, Wishlist, Compare Products, Profile, and auth pages as **out of scope** — "don't need new designs... just be aware these pages inherit the shared header/footer/typography/color system."

The delivered prototype instead redesigned the full commerce + account surface:

| Added screen | In brief's scope? | Notes |
|---|---|---|
| Products (catalogue) | No — explicitly out of scope | Full grid rebuild, category filter, "request a custom part" band |
| Product detail | No — explicitly out of scope | Full 2-col rebuild |
| Cart | No — explicitly out of scope | Full rebuild incl. empty state |
| Checkout | No — explicitly out of scope | Full rebuild incl. delivery form, PayChangu trust copy, summary |
| Order confirmed | No — explicitly out of scope | New screen; no direct predecessor was itemized in the brief |
| Wishlist | No — explicitly out of scope | Full rebuild incl. empty state |
| Login | No — explicitly out of scope | Full rebuild |
| Sign up | No — explicitly out of scope | Full rebuild |

**Not covered even though added:** Orders (list/detail), Returns, Compare Products, Profile — so the "extra" work is also incomplete relative to the full commerce surface, not just extra relative to the brief.

**This is the headline finding to bring back to the design pass:** roughly 8 of 13 delivered screens (62%) fall outside the agreed scope, while 3 pages that do exist in the live app (Orders, Returns, Profile) and one (Compare Products) got no design at all despite the commerce surface being touched everywhere else. If the intent is genuinely to redesign the full client-facing app rather than just Home/Services, that's a reasonable thing to decide — but it's a scope decision for you to make deliberately, not something to inherit by default because the design happened to include it.

---

## 3. Design-system coverage — is it internally complete?

Yes. The README documents a full, coherent token system (color, type, spacing, border/radius, motion) and a component inventory (utility bar, masthead, banner, stat ledger, editorial index row, product card, cart line, order summary panel, booking card, status pills, service chip, modals, footer) sufficient to implement every delivered screen consistently. No missing component definitions found for what was actually built.

---

## 4. Home &amp; Services — how the new design maps to current sections

For the two primary requested pages, structure changed significantly but every functional anchor from the brief survived in some form:

**Home:** Hero (2-col, image right) → stat ledger (replaces "Trust Indicators" strip, same intent) → "Shop by system" editorial index (replaces "Featured Categories" grid) → "Three ways AutoTek keeps you moving" ink band (replaces "What We Offer" 3-card grid) → pull-quote (replaces "Testimonials" component, condensed to one quote vs. the current carousel/list — confirm this is an intentional simplification, not a dropped feature, since only one testimonial appears instead of a set). "How It Works" section from the current Home page is **not present** in the new Home — it survives only on the new Services page. Net: content parity, structural reshuffle, one section (multi-testimonial) reduced to a single quote.

**Services:** Hero → benefits strip → towing feature block → car-services catalogue grid → "Partner with AutoTek" band → footer. Matches the current page's section list closely. Two behavioral gaps found here — see §5.1 and §5.2.

---

## 5. Functional/behavioral gaps vs. the live app

These are not visual differences (expected and fine) — they're places where the prototype's *behavior*, as documented or as coded in its own state/logic block, diverges from what the live app actually does today. Flagging per the brief's rule that any non-visual change needs your explicit approval before it ships.

### 5.1 — Services page: "Emergency towing" and "Request towing" buttons have no click handler
**Where:** Services hero secondary CTA ("Emergency towing") and the towing feature block's "Request towing" button.
**Finding:** Neither element has an `onClick` in the prototype markup — every other CTA on the page (`Book car service`, `Book service →` per service card) wires to `goBook`. In the live app, both towing entry points route to the same `/book-service?service=towing` flow as car-service booking.
**Risk if shipped as-is:** these two buttons would do nothing on click. Likely an oversight in the prototype rather than an intentional change, but needs closing during implementation regardless of cause.

### 5.2 — Services page: "Partner with AutoTek" section lost its functional CTA
**Where:** current live page: a clickable `mailto:support@autotek.mw?subject=Partner%20application` link. New design: a static text chip showing the email address with no `onClick`/href.
**Finding:** the design significantly restyles this section (fine) but the one interactive element in it — the thing that actually lets a prospective partner start an application — isn't wired. Same class of issue as 5.1: needs a real `mailto:` (or better, a real form) behind it at implementation time.

### 5.3 — Checkout: delivery fee shown as a flat MWK 6,000, live app currently charges MWK 0
**Where:** Checkout summary panel (`{{ deliveryFee }}`), and Cart summary ("Delivery — Calculated at checkout").
**Finding:** the design's own state/logic block hardcodes `DELIVERY = 6000` and the README explicitly flags it: *"Delivery flat MWK 6,000 in prototype (make dynamic)."* The live app currently has **no delivery fee at all** — `Checkout.tsx` hardcodes `Shipping: MWK 0`, and there's no delivery-fee field or calculation anywhere in the backend order/coupon logic (a `'free-shipping'` coupon type even has a code comment noting "shipping is already 0").
**This is a business-rule question, not a visual one.** Implementing the new checkout screen as designed — even just wiring the visual layout to real data — would either (a) introduce a new MWK 6,000 charge that doesn't exist today, or (b) require leaving it at MWK 0 and quietly diverging from what the design shows/implies. Neither is a pure UI swap. **Needs your explicit call**, since Checkout is also outside the agreed scope in the first place (§2) — this compounds that.

### 5.4 — Product detail: new factual claims not backed by current data
**Where:** Product detail page's checklist ("✓ Genuine / OEM-spec part · ✓ Nationwide delivery in 2–4 days · ✓ Fitment help from our mechanics · ✓ 12-month warranty").
**Finding:** checked against the live app:
- "12-month warranty" — partially real today, but only as a hardcoded *category-level* string for Brake Parts specifically ("12-month or 20,000km local warranty"); other categories show different or generic warranty copy. There is no per-product warranty field in the database. Applying "12-month warranty" as a blanket claim across all products would be a new, broader claim than what's actually shown today.
- "Nationwide delivery in 2-4 days" — no match anywhere in current copy or data. Entirely new.
- "Fitment help from our mechanics" — no equivalent claim exists; current fallback copy is a more hedged "Fitment guidance available when listed."
**Risk:** these read as real customer-facing promises (delivery timeframe, warranty length) rather than decorative copy. Shipping them as static UI copy would be making new business commitments through a "visual" swap. Also moot in the near term since Product Detail is out of the agreed scope (§2) — but worth flagging now since it's the clearest example in the whole prototype of a UI change that is actually a business-rule change in disguise.

### 5.5 — Home hero stats: unverified/placeholder factual claims
**Where:** Home hero stat ledger — "2,400+ Parts in catalogue," "16 Districts served."
**Finding:** these are specific, falsifiable numbers. Worth confirming against real current counts before shipping (the design file's own state block doesn't source them dynamically — they're static markup, same category of issue as 5.4 but lower stakes since it's Home, which is in-scope). Not a blocker, just needs a real number swapped in rather than shipped as-is.

### 5.6 — Wishlist: header always shows the icon in the new masthead spec
**Where:** README's masthead component description: *"Right cluster is role-gated: always Wishlist (n) + Cart (n)"* — i.e., the design's own spec says Wishlist is shown to guests too, contradicting the live app.
**Finding:** live app hides the Wishlist icon entirely for guests (`Header.tsx`), and `/wishlist` itself is a fully protected route (no `guestAllowed`) — unauthenticated visitors are redirected to login. If the new header is implemented per the README's literal spec ("always Wishlist"), guests would see a Wishlist icon that then bounces them to login on click — a behavior change (arguably a UX improvement, arguably scope creep) that should be a deliberate decision, not an accident of following the design doc literally without cross-checking current auth gating.

### 5.7 — Quote-request modal: contact direction is ambiguous in the new design
**Where:** "Contact-for-Quote" modal in the new design shows AutoTek's static call/WhatsApp number as clickable-looking rows, plus a notes textarea — but has no field for the *customer's own* phone/WhatsApp number.
**Finding:** the live app's quote-request flow (`MyServices.tsx`) works in the opposite direction: the customer submits **their own** mobile + WhatsApp number (with Malawi phone validation and a "same as mobile" checkbox) so staff can call them back; the submission posts `{ mobilePhone, whatsAppPhone, quoteRequestNotes }` to the backend. The new design's modal, as drawn, doesn't collect this — it presents AutoTek's own contact info instead.
**This is functionally significant, not decorative.** If implemented literally, the modal would stop capturing the data the backend endpoint actually requires (`mobilePhone`/`whatsAppPhone`), breaking the existing quote-request flow rather than just re-skinning it. This needs to be resolved as part of implementation — likely by keeping the two phone-number input fields but restyling them to match the new visual system, rather than replacing them with static contact-number display.

### 5.8 — "Track order" appears as a persistent top-of-page nav item with no backing capability
**Where:** the new global utility bar ("Track an order," left of Support) present site-wide, on every page.
**Finding:** no generic order-tracking/lookup capability exists anywhere in the live app today — no "enter your order number" form, no guest order search. The only way a guest reaches an order is a direct link to `/orders/:id` (e.g., from a confirmation email), which works via `guestAllowed` + email-match, not via any discoverable "track order" entry point. The current Home page even has a "Track Order" card that's purely decorative with no click target.
**Risk:** the new design promotes this to persistent, always-visible top-of-page real estate, implying a capability (generic order tracking/lookup) that doesn't exist. Either this needs a real lookup screen built (a genuine new feature, out of "visual redesign" territory and needing approval), or the nav item should link to something that already exists (e.g., "My Services"/"My Orders" for logged-in users, sign-in prompt for guests) rather than implying standalone tracking.

### 5.9 — "Order confirmed" screen references a "Track order" action with no destination
**Where:** Order Confirmed screen's secondary button, "Track order," has no `onClick` in the prototype (unlike "Continue shopping," which does).
**Finding:** same root cause as 5.8 — there's nothing to link it to yet. Not a new issue, just the same gap surfacing a second time.

---

## 6. Non-blocking notes (flagging, not gap-worthy)

- **Testimonials reduced from a set to a single pull-quote** (Home) — likely an intentional editorial choice in the new design language, but confirm it's not meant to still rotate/pull from multiple real reviews.
- **Footer links are decorative text, not real anchors** (`Parts`, `Categories`, `Returns`, `Terms · Privacy · Returns`, etc., in `__footer.dc.html`) — expected for a design comp; trivial to wire to real routes at implementation, not a gap worth escalating.
- **"12" months / brand-asset placeholders**: per the brief, real photography/logo assets were promised separately — the prototype still uses the *current* Cloudinary marketing images (confirmed against the URLs handed to the design pass) as placeholders. Expected; not a gap, just a reminder real assets still need to be dropped in before/at implementation.
- **Icons are emoji placeholders** (🔧 🚛 📞 💬 🔒, unicode hearts/stars/arrows) — README already flags these as placeholders to be replaced with the codebase's real icon set (`lucide-react`, per the current app). Not a gap, just a confirmed to-do.

---

## 7. Summary for discussion

**Clean coverage:** every screen explicitly requested in the brief was delivered, and the design system is internally complete and implementable.

**Two things need your decision before implementation starts:**

1. **Scope creep (§2):** ~8 additional screens beyond the brief were designed, while 4 real live-app pages (Orders, Returns, Profile, Compare Products) were left untouched despite the commerce surface otherwise being fully redone. Decide: adopt the extra screens too (re-scoping this project bigger), hold them for a later phase, or implement only the originally-requested screens now and shelve the rest.
2. **Functional gaps that are business-rule questions wearing a UI costume (§5.3, §5.4, §5.7 especially):** the delivery-fee display, the product warranty/delivery/fitment claims, and the quote-modal contact-direction change are the three places where "just swap the UI" isn't actually possible without a real decision — each one either introduces a new customer-facing promise or would silently break existing backend contract/data flow if implemented literally. These need explicit sign-off, per your own stated constraint, before any of them gets built.

Everything else (§5.1, §5.2, §5.6, §5.8, §5.9) is a smaller "wire up the click handler / decide what this links to" fix that doesn't require a business decision, just needs to not be forgotten during implementation.

---

## 8. Decision Log

Decisions made jointly, working through the open items one at a time. Each entry: the decision, the reasoning, and what it means for implementation.

### Decision 1 — Scope creep (§2)

**Decision:** Adopt the full scope. The extra screens weren't an accident to roll back — the redesign for Products/Cart/Checkout/Wishlist/Login/Sign Up was wanted so those pages match the new visual system too. The rule going forward is:

- **Anything the new design removed that exists in the live app today must be re-added**, restyled to the new design system/components, with identical functionality to what's live now. Nothing gets dropped just because the mockup didn't happen to draw it.
- **Anything the new design added that has no live equivalent gets held back**, not built now. Revisit at the end of the redesign work as a deliberate "is this worth adding" pass, not folded in by default.
- **Orders, Returns, Profile, and Compare Products** (no mockups exist for these at all) get built by extending the new design system/components to their current layout and functionality — same rule as everything else, just with no mockup to restyle from.

**Why:** confirmed directly — the intent was always "redesign the whole client-facing app to match the new system," not "only touch the screens named in the original brief." The brief's scope boundary was a starting document, not a hard limit.

**What this means concretely, given the removed-feature inventory (§8a below):** this is a much bigger implementation than "swap some colors and fonts." On Products, Product Detail, Cart, Wishlist, Checkout, and Login/Sign Up, the delivered mockups are lean editorial comps that show page *shape*, not full functional parity — nearly every advanced feature currently live (filters, sort, pagination, Quick View, comparison, coupon codes, save-for-later, multi-step checkout, reviews, technical specs, forgot-password, etc.) is absent from the mockup and must be rebuilt in the new visual language, not dropped. Genuinely new additions in the mockups are minimal — essentially just the product-detail trust-badge line already flagged in §5.4, which stays gated behind that decision.

**Sequencing:** phased rollout, not one big-bang release.
- **Phase 1** — Home, Services, and the booking flow (Book Service, My Services, Service Payment) — the pages the original brief actually designed for, smallest re-add burden, ships first.
- **Phase 2** — Products, Product Detail, Cart, Wishlist, Checkout, Login, Sign Up (large re-add effort per §8a) plus Orders, Returns, Profile, and Compare Products (no mockup, same design system applied) — all landing together as the second wave, once Phase 1 has validated the new system in production.

**Order Confirmed specifically:** no live page matches this mockup today — the closest equivalent, `PaymentSuccess.tsx`, is a payment-verification page with polling, loading, and timeout/error states that the static mockup doesn't show. Decision: don't build "Order Confirmed" as a separate new screen. Merge the new design's clean visual layout into `PaymentSuccess.tsx` as its **success state** — the polling/verifying/error/timeout behavior stays exactly as it is today, just restyled; the new mockup's layout only replaces what renders once payment is actually confirmed. Lands in Phase 2 alongside Checkout.

### 8a. Removed-feature inventory (input to Decision 1)

Full screen-by-screen removed/added inventory backing the "re-add what was removed" rule above. Additions were negligible (near-zero net-new beyond the already-flagged §5.4 trust badges), so only removals are itemized — these are the concrete rebuild targets for Phase 2.

**Products listing** (live: `Products.tsx`, `ProductCard.tsx`, `FilterDrawer.tsx`, `SearchAutocomplete.tsx`, `VehicleFitmentFilter.tsx`, `QuickViewModal.tsx`, `ProductComparison.tsx`) — re-add: breadcrumb; hero banner; "My Part Requests" link (design only kept "Request a Part"); search bar with autocomplete; quick-filter chip row; full sidebar filters (vehicle fitment, category, stock status, price range with slider, quick price presets, apply button); active-filter chip bar with clear-all; result count copy; sort dropdown; results-per-page selector; grid/list view toggle + list layout; loading skeletons; vehicle-aware empty state; pagination; mobile filter drawer; Quick View modal; product comparison tray; per-card stock badge, fitment badge, promo badge, star rating + review count, description, brand, "X in stock" text, out-of-stock disabled state, placeholder-image indicator.

**Product detail** (live: `ProductDetail.tsx`, `ReviewForm.tsx`, `ReviewList.tsx`, `ProductFitment.tsx`) — re-add: full breadcrumb; multi-image gallery with thumbnails; placeholder-image indicator; stock badge; "Buy Now" button (separate from Add to Cart); Technical Specifications table (brand, SKU, material, OEM part number, alternates); category-specific "Why Choose This Part?" benefits list; Vehicle Fitment section; Customer Reviews (submission form + list); out-of-stock disabled states.

**Cart** (live: `Cart.tsx`) — re-add: breadcrumb; PayChangu reconciliation banner; hero banner with continue-shopping; stats row (cart total, item count, avg price); per-item stock badge + low-stock warning; per-item note field; "Save for later" action + its own section; coupon/discount code field + applied state; estimated delivery date; discount line in summary; guest sign-in notice; secure-checkout trust badge; remove-confirmation modal.

**Wishlist** (live: `Wishlist.tsx`) — re-add: breadcrumb; hero card with bulk "Add All to Cart"/"Clear All"; stats row (total value, saved count, in-stock count, avg price); hover quick-action icons; out-of-stock notice banner; clear-wishlist confirmation modal; full `ProductCard` feature parity (stock/fitment/promo badges, rating, description, brand, stock text) since wishlist reuses that component live.

**Checkout** (live: `Checkout.tsx`) — re-add: multi-step wizard (Shipping → Payment → Review) with progress indicator and back/continue; payment-reconciliation blocking banner; full guest-checkout block (name/email/phone, distinct from account flow) plus inline "create an account" checkbox with password/confirm fields; "already have an account, sign in" prompt; structured `DeliveryLocationSelector` (town/landmark/custom address) in place of a plain dropdown; rich PayChangu payment panel with sub-method breakdown (cards, mobile money, bank transfer) and SSL notice; Review step with editable shipping/payment summaries; coupon display + remove in Review; order line items shown with product image (live currently shows truncated product ID instead of name in the summary — note this as a live-app quirk to preserve or fix at implementation time, not a design-mockup gap).

**Login** (live: `Login.tsx`) — re-add: "Back to Home" link; brand logo; return-URL-aware contextual banner; inline error banner; "Forgot your password?" link; return-URL-aware "Register here" link.

**Sign Up** (live: `Register.tsx`) — re-add: "Back to Home" link; brand logo; return-URL-aware contextual banner; inline error banner; Confirm Password field + match validation; password length validation; optional Address field; per-field inline error messages.

**Order Confirmed / PaymentSuccess** — see Decision 1 above: merge, don't rebuild separately. Preserve verifying/loading state, order-details panel (ID, amount, method, status, transaction ID, reference), "View Order Details" action, lookup-failure error state, and the separate service-payment confirmation branch (towing/car-service) — none of these appear in the static mockup and all must survive into the restyled page.

### Decision 2 — Checkout delivery fee (§5.3)

**Decision:** Deferred to the very end of the whole redesign project — not Phase 1, not Phase 2, but after every other screen (including the rest of Checkout) is done. Until then, Cart and Checkout keep their current live behavior (`MWK 0`, "Calculated at checkout") restyled to the new visual system with no fee logic change.

When this is finally built, it's implemented as a real feature, not a hardcoded number:
- Delivery fee becomes **dynamic**, not the design's flat `MWK 6,000` placeholder.
- **Admins get the ability to set and update the delivery fee** — this is new admin functionality (a real business-logic + admin-UI addition), not a visual change, and will need its own design/implementation pass when it's tackled (data model for the fee, an admin settings surface to manage it, wiring into order totals).

**Why:** confirmed directly — delivery pricing is a real, non-trivial business decision (how it's calculated, who can change it, whether it varies by location) that deserves dedicated attention rather than being rushed through as part of a UI reskin. Isolating it to the end also means it doesn't block or get tangled into Phase 1/Phase 2 delivery.

### Decision 3 — Product detail claims (§5.4)

**Decision:** Keep three of the four trust-badge claims, drop one:
- Keep: **"Genuine / OEM-spec part"**, **"Nationwide delivery in 2–4 days"**, **"Fitment help from our mechanics."**
- Remove: **"12-month warranty."**

**Why:** the audit found "12-month warranty" was the one claim with an existing but *narrower* real basis in the live app (a category-specific string shown only for Brake Parts, not other categories) — applying it as a blanket claim across every product would overstate what's actually guaranteed. The other three claims were net-new copy with no live equivalent, but were accepted as intentional new marketing copy for the redesign rather than something requiring backend/data support — they read as general service commitments, not per-product data claims. Lands wherever Product Detail lands (Phase 2, per Decision 1).

### Decision 4 — Quote-request modal (§5.7)

**Decision:** Visual-only reskin. Keep the live modal's actual functionality exactly as it is today — mobile phone field, WhatsApp phone field, "same as mobile" checkbox, notes textarea, Malawi phone validation, and the existing submit behavior (`{ mobilePhone, whatsAppPhone, quoteRequestNotes }` to the backend) — restyled to match the new design system's look (typography, spacing, borders, buttons).

The new design's static "Call us" / "WhatsApp us" info-row content (AutoTek's own contact number, shown as if clickable) does **not** get built — it was never part of the real functionality, so it's dropped rather than bolted on alongside the real fields.

**Why:** the live modal's direction (customer submits their number, staff calls back) is the actual working feature backed by a real backend contract; the design's static-number framing was a visual misread of that flow during the design pass, not an intentional functional change. Adopting only the visuals resolves the ambiguity cleanly — same rule as Decision 1's "removed/added" split, applied here explicitly since this was called out as its own item. Lands wherever My Services lands (Phase 1, per Decision 1 — My Services is part of the booking flow).

### Decision 5 — Services page: dead towing buttons (§5.1)

**Decision:** Wire both to the existing booking flow, matching current live behavior exactly — "Emergency towing" (hero) and "Request towing" (towing feature block) both route to `/book-service?service=towing`, same as every other "Book Service" CTA on the page does for `car-service`.

**Why:** confirmed as a straightforward oversight in the mockup, not an intentional change — no new decision needed, just close the gap. Lands in Phase 1 (Services page).

### Decision 6 — "Partner with AutoTek" mailto link (§5.2)

**Decision:** Restore the clickable link. Keep the new design's visual treatment of the email chip, but make it a real `mailto:support@autotek.mw?subject=Partner%20application` link, matching current live behavior.

**Why:** same as Decision 5 — an oversight, not an intentional removal. Lands in Phase 1 (Services page).

### Decision 7 — Header: Wishlist icon for guests (§5.6)

**Decision:** Keep current live behavior — Wishlist icon only shown once logged in. The new design's masthead spec ("always Wishlist + Cart") does not get implemented literally; restyle the existing guest/logged-in conditional split rather than showing Wishlist to guests.

**Why:** `/wishlist` is a fully protected route today (no `guestAllowed`) — showing the icon to guests would mean it bounces to login on click, a small but real behavior change from what exists now. Chose to preserve current behavior rather than adopt the design spec's implied change. Lands in Phase 1 (header is site-wide chrome).

### Decision 8 — "Track an order" nav item + Order Confirmed button (§5.8, §5.9)

**Decision:** No new tracking feature. Point "Track an order" (persistent utility bar, every page) and the Order Confirmed screen's "Track order" button at what already exists: logged-in users go to My Services/My Orders; guests go to login (or, on Order Confirmed specifically, the direct order-confirmation link/page they already have from that flow).

**Why:** no generic order-lookup/tracking capability exists anywhere in the live app today — building one would be new scope requiring its own design and approval, not a UI reskin. Reusing existing pages closes the "implies a capability that doesn't exist" risk without inventing new functionality. Ships with the rest of the redesign (header lands Phase 1; Order Confirmed lands Phase 2 per Decision 1's PaymentSuccess merge).

### Decision 9 — Home: testimonials (§6)

**Decision:** Adopt the new design as-is — single static pull-quote, not the current live multi-testimonial set/rotation.

**Why:** confirmed as an intentional editorial choice for the new design language, not an accidental content loss. Lands in Phase 1 (Home page).

### Decision 10 — Footer links (§6)

**Decision:** Wire every footer link to its real destination at implementation (Parts → Products, Categories → Products with filter, Returns → Returns, Terms/Privacy → their respective pages where they exist, etc.).

**Why:** baseline expectation for a functioning footer, not something requiring a special call — flagged in the original analysis only because the mockup itself ships them as decorative text. Lands in Phase 1 (footer is site-wide chrome).

### Closed without a decision needed

- **Cloudinary image placeholders** (§6): real photography assets get dropped in during implementation, as already planned in the original brief. No decision required.
- **Emoji icon placeholders** (§6): swapped for the codebase's real `lucide-react` icon set during implementation, as the design's own README already specifies. No decision required.
