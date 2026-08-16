# AutoTek — Client-Facing UI Redesign Brief

**Purpose of this document:** hand to Claude (design) as-is to produce a redesign of AutoTek's client-facing UI. Written to be complete enough that nothing needs to be re-derived from the codebase later — every screen, component, flow step, and image asset in scope is named explicitly, so the approved design can be handed back for a "swap the UI, keep the logic" implementation with no missing pieces.

---

## 1. What this is

AutoTek is an auto parts + car/towing services e-commerce platform for Malawi. Customers browse and buy spare parts, request custom parts we don't stock, and book mobile car services (mechanic comes to them) or emergency towing — all through a web app.

This is a **visual/UX redesign only**. No backend logic, data model, validation rule, or business rule changes. The rebuilt UI will be implemented in React + TypeScript + Tailwind CSS against the existing app, reusing existing state/data-fetching wiring — only presentation changes. Because of that, the deliverable needs to be specific enough to translate into real components (real layout, real spacing, realistic motion), not just a mood board or static comp.

## 2. The problem with the current UI

The current client-facing pages work correctly but look like a generic AI-generated SaaS template: parallax blob backgrounds, floating gradient particles, glow effects behind every image and icon, scale+rotate-on-hover on every single card, gradient overlays stacked on gradient overlays, decorative animated dots on connector lines. It reads as "template that could be reskinned into any vertical," not as a considered brand for a real auto parts and car-service business operating in Malawi.

**Direction wanted:** away from blob backgrounds, particle effects, glow-everything, and scale+rotate hover gimmicks — toward a more restrained, premium, editorial feel. Confident use of whitespace, strong typographic hierarchy, real photography doing the work instead of decorative gradients, motion that's purposeful (a clean fade/slide on scroll-into-view is fine) rather than decorative animation for its own sake. No specific competitor or brand reference to imitate — explore 2–3 distinct directions if useful before committing to one.

## 3. Scope — what's in, what's out

**In scope (redesign these):**
- Home page (`/`)
- Services page (`/services`) — the marketing/browse page that leads into booking
- The booking flow screens reached from Services (`/book-service`, `/my-services`, `/service-payment`) — see full breakdown in Section 5. These may get a lighter visual pass than Home/Services (they're functional/form-heavy), but they must be included in the design so the swap has no unstyled or mismatched screens.
- Shared chrome that wraps every client page: header/nav and footer (Section 6)

**Out of scope (do not redesign):**
- Admin dashboard and all `/admin/*` pages
- Mechanic dashboard (`/mechanic/*`)
- Backend logic, API contracts, data shown, business rules, form validation behavior

**Explicitly NOT in this pass, but exists elsewhere in the app** (don't need new designs, just be aware these pages inherit the shared header/footer/typography/color system you define, so keep those primitives coherent enough to hold up across pages you haven't personally redesigned): Products listing/detail, Cart, Checkout, Orders, Returns, Wishlist, Compare Products, Profile, auth pages (Login/Register/etc.).

## 4. Home page — current structure

Current sections, in order (feel free to restructure, merge, cut, or reorder anything that doesn't earn its place — this is a starting inventory, not a fixed spec):

1. **Hero** — badge ("Malawi's #1 Auto Parts Marketplace"), large headline ("Your Trusted Auto Parts Partner"), subheadline, two CTAs ("Browse Products" → `/products`, "Book a Service" → `/services`), two trust micro-badges ("100% Authentic Parts", "Fast Delivery"), a large feature image on the right (desktop only), scroll-down indicator.
2. **Trust indicators strip** (shared component, also likely reused elsewhere — see Section 6).
3. **Featured categories** (shared component — product category tiles/cards).
4. **How it works** (shared component — step-by-step explainer, likely similar in spirit to the Services page's own "How It Works," may be worth consolidating into one pattern).
5. **"What We Offer" — 3-card grid**: Spare Parts, Car Services, Easy Shopping. Each card: photo, icon badge, title, short description.
6. **Testimonials** (shared component).

## 5. Services page + full booking flow — current structure

The Services page is a marketing/browse page. It does **not** contain the actual booking form, price display, or payment — those are three separate downstream screens. All must be included in the redesign.

### 5a. Services page (`/services`) — browse/marketing

1. **Hero** — badge ("Professional Mobile Auto Services"), headline ("Auto Services Delivered to You"), subheadline, two CTAs ("Book Car Service", "Emergency Towing" — both open the booking flow, see 5b), three trust micro-badges, a decorative "24/7 Towing" preview card (desktop only).
2. **Benefits strip** — 4 cards: 24/7 Availability, Certified Mechanics, Quality Guaranteed, At Your Location.
3. **Sign-in nudge line** — one sentence pointing authenticated users to "My Services" to track bookings, or prompting guests to sign in.
4. **Towing Services section** — feature card: description, pricing note ("Contact for quote in MWK based on distance"), 5-item feature checklist, CTA button, feature image with an overlaid "Call for Emergency" phone number.
5. **Car Services section** — grid of 6 service-type cards, each with an icon, name, one-line description, and a "Book Service" button that pre-selects that service type. Current service types: Oil Change, Brake Pads Replacement, Spark Plugs Replacement, Air Filter Replacement, Battery Replacement, Tire Rotation.
6. **How It Works** — 4 numbered steps with connecting line (desktop): Book Service → Schedule Appointment → We Come to You → Service Complete.
7. **"Partner with AutoTek" section** — a card aimed at prospective mechanics/garages/towing partners: what to include in an application, an email CTA (`support@autotek.mw`). This is a distinct audience (B2B partner recruitment) from the rest of the page (B2C customers) — keep it visually distinct enough that a customer doesn't confuse it with a service offering.
8. **Bottom CTA band** — full-width colored section, headline, two repeated CTAs (Book Car Service / Emergency Towing).

### 5b. Book Service form (`/book-service?service=car-service|towing`) — the actual booking

Reached by clicking any "Book Service" / "Emergency Towing" CTA on the Services page. Single-page form (not a multi-step wizard currently, but open to redesigning as a multi-step flow if that's a real improvement — flag it as a proposed change rather than assuming).

Fields/sections, in order:
1. **Vehicle Information** — Vehicle Type (required), Vehicle Model (optional). Currently free-text, not a structured picker.
2. **Service Type** (car-service only) — checkbox grid of the 6 service types listed above; at least one required.
3. **Location** — for towing: two location pickers (pickup + destination), each with a town/area selector, optional landmark note, and a "use my GPS location" button. For car-service: one location picker (customer's address), same pattern.
4. **Preferred Schedule** (car-service only) — optional date + time.
5. **Additional Notes** — optional free text.
6. Inline validation error summary.
7. Submit / Cancel actions.
8. "What happens next?" info panel explaining the quote process.

No price and no payment step here — this only submits a request.

### 5c. My Services (`/my-services`) — track bookings

Reached from the header nav, from the Services page sign-in nudge, and after submitting a booking. Single page, no separate detail view — everything renders in an expanded card per booking.

1. **Header** — breadcrumb, optional payment-reconciliation banner, page title, 4 stat tiles: Total Services, Pending, Completed, Total Spent (MWK).
2. **Filter bar** — search, service-type filter (All/Towing/Car), status filter (All/pending/assigned/in-progress/completed/cancelled).
3. **Booking list** — one card per booking (towing + car service combined, newest first). Each card shows: type icon, title, status badge (color-coded), payment badge (Paid/Unpaid/Failed), vehicle info, location(s) with map links, timestamps, price (or "price not set yet"), assigned mechanic/driver info once assigned, a 1–5 star rating control once completed, notes.
4. **Per-card actions**: "Pay Now" (→ 5d), "Contact for quote"/"Update quote request" (opens a modal: phone, WhatsApp, notes), "Cancel" (opens a confirm-with-refund-disclaimer modal).
5. **Empty state** — "No Services Found" + CTA back to `/book-service`.

### 5d. Service Payment (`/service-payment`) — pay once a price is set

Reached only from a "Pay Now" button in My Services, once staff has set a price on the request (pricing happens out-of-band, not instantly).

1. Back link to My Services.
2. Payment-methods banner image.
3. Title + dynamic subtitle (loading / waiting-for-price / ready-to-pay states).
4. Amount card (MWK total).
5. "Price not set yet" messaging if not ready to pay.
6. Secure-payment reassurance block.
7. "Proceed to Payment" button → redirects to PayChangu's hosted checkout.
8. Payment-provider badge/trust image, terms note.
9. A "confirming your payment…" loading state for when the customer is bounced back from PayChangu.

## 6. Shared chrome — applies to every client page, must be redesigned once and hold up everywhere

### Header (site-wide, always visible)
- Logo (links to `/`)
- Nav links: Products, Orders, Returns, Services, My Services (same for guest and logged-in — not currently role-gated, worth a design opinion on whether that's right)
- Wishlist icon + count badge — **logged-in customers only**
- Cart icon + count badge — always visible, guest and logged-in
- Logged-in: profile link (shows name), logout button. Role-conditional extra links exist for Admin/Mechanic but those roles are out of scope here — just don't design something that breaks if those links are present.
- Guest: Login button + Sign Up button (replaces the account menu)
- Mobile: hamburger menu, same links stacked vertically

### Footer (site-wide)
- Currently minimal: centered logo, copyright line. Fair game to expand (contact info, quick links, social, etc.) if that improves the experience — currently underbuilt relative to a real e-commerce footer.

### Shared/reused components appearing on Home and/or Services and elsewhere
- Trust Indicators strip
- Featured Categories
- How It Works (appears in similar form on both Home and Services — consider whether these should become one consistent pattern used in both places)
- Testimonials
- Location/address picker (used identically across the booking flow and checkout — one visual treatment should cover all uses)

## 7. Brand constraints to design within

- **Color**: Teal is the established brand color, full scale already defined (`primary-50` `#f0fdfa` through `primary-900` `#134e4a`, with `primary-500` `#14b8a6` as the base). Refine how it's used (dominant vs. accent, what it's paired with) freely — don't propose an unrelated palette swap without a strong stated reason.
- **Typography**: Inter is the current typeface. Fine to keep as the workhorse font, or propose pairing it with a distinct display face for headlines if it meaningfully raises the premium feel — state the reasoning either way.
- **Implementation reality**: Will be rebuilt in Tailwind CSS reusing existing primitives (Button, Card, Typography components, form Input). Favor decisions realistic in Tailwind — real spacing scale, restrained/purposeful motion (scroll-reveal fades are fine; floating blobs/particles/glow auras are not) — over effects that only work as a static comp and can't actually ship.
- **Market context**: Malawian customers, mobile-heavy usage. Prioritize clarity and credibility over trendiness — for many customers, buying auto parts online may be a newer behavior, so the design needs to read as trustworthy and easy to understand, not just stylish.
- **Functional anchors to keep** (redesign their presentation, don't design them away): primary CTAs to browse products and book a service; authenticity/trust signals; a clear price/quote moment in the services flow; the partner-recruitment section on Services (keep it, just make sure it stays visually distinct from the customer-facing service offerings around it).

## 8. Brand assets

I will provide the following separately — logos, photography, etc. Current state, for context on what exists today (may be replaced/supplemented):

- **Logo**: 4 existing variants — a horizontal primary-color mark, a horizontal on-dark mark, a monochrome teal mark, and an icon-only mark (currently unused in the header/footer but exists). If new logo assets are provided, please indicate which of these 4 roles each new asset should fill (header/light background, footer/light background, dark-background contexts, icon-only/favicon-style use).
- **Marketing photography currently in use** (all will need real, on-brand replacements or confirmation they're being kept): Home hero background, Home hero feature image, Services hero background, Services towing-section feature image, three "what we offer" images (spare parts / car services / easy shopping), plus category thumbnail images (engine, brakes, filters, electrical, default/generic).
- **Payment-trust imagery**: the Service Payment screen currently displays a payment-methods banner and a payment-provider (PayChangu) badge image — if there's a brand-approved way to present "how you can pay" and payment trust signals, provide that asset too.

I'll attach the actual image/logo files when I send this brief. In the meantime, here are the live links to every image currently in use on the in-scope pages, for reference on subject matter / current photography style (these are not final assets — treat as "what's there today," to be replaced or kept as the design calls for):

**Home page:**
- Hero background — https://res.cloudinary.com/dhbe6wtod/image/upload/w_1920,q_auto,f_auto/autotek/banner-images/HeroMain_aaa9ux
- Hero feature image (desktop right panel) — https://res.cloudinary.com/dhbe6wtod/image/upload/w_1200,q_auto,f_auto/autotek/banner-images/car-service_gvvxmz
- "What We Offer" — Spare Parts — https://res.cloudinary.com/dhbe6wtod/image/upload/w_800,q_auto,f_auto/autotek/marketing/Home/what%20we%20offer/high-angle-view-machine-part_76080-113905_yoxjff
- "What We Offer" — Car Services — https://res.cloudinary.com/dhbe6wtod/image/upload/w_800,q_auto,f_auto/autotek/marketing/Home/what%20we%20offer/service_fun0xh
- "What We Offer" — Easy Shopping — https://res.cloudinary.com/dhbe6wtod/image/upload/w_800,q_auto,f_auto/autotek/marketing/Home/what%20we%20offer/delivery_krq2au
- Featured Categories — Engine — https://res.cloudinary.com/dhbe6wtod/image/upload/w_800,q_auto,f_auto/autotek/marketing/Home/engine_2_nyyvgj
- Featured Categories — Brakes — https://res.cloudinary.com/dhbe6wtod/image/upload/w_800,q_auto,f_auto/autotek/marketing/Home/brakes_jaebco
- Featured Categories — Filters — https://res.cloudinary.com/dhbe6wtod/image/upload/w_800,q_auto,f_auto/autotek/marketing/Home/filter_kvavb6
- Featured Categories — Electrical — https://res.cloudinary.com/dhbe6wtod/image/upload/w_800,q_auto,f_auto/autotek/marketing/Home/electrical_ivejdb

**Services page:**
- Hero background + bottom CTA background — https://res.cloudinary.com/dhbe6wtod/image/upload/w_1920,q_auto,f_auto/autotek/marketing/Home/what%20we%20offer/service_2_ulniay
- Towing section feature image — https://res.cloudinary.com/dhbe6wtod/image/upload/w_800,q_auto,f_auto/autotek/marketing/Home/what%20we%20offer/tow_kxyp4a

**Service Payment page:**
- Payment-methods banner — https://res.cloudinary.com/dhbe6wtod/image/upload/v1773771506/autotek/payment%20methods/tag2-C4qnl2U7_znxdld.png
- Payment-provider badge — https://res.cloudinary.com/dhbe6wtod/image/upload/v1773771506/autotek/payment%20methods/tag1-i7EnK4XQ_qpo7qy.png

## 9. Deliverable

- Home and Services pages (the marketing/browse experience), desktop and mobile, in enough fidelity to react to real layout, hierarchy, and component choices.
- The three downstream booking-flow screens (Book Service form, My Services list, Service Payment) at least at a "here's the visual system applied to a form-heavy screen" level of fidelity — they don't need the same creative exploration as Home/Services, but they can't be left unstyled or the swap will have gaps.
- Redesigned header and footer (since every page — including ones not explicitly redesigned here — depends on them).
- If proposing multiple directions, show all of them side-by-side for Home + Services before going deep on downstream screens, so direction gets picked once rather than three ways.
