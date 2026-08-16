# Handoff: AutoTek — "The Garage Journal" (Premium Prototype)

## Overview
AutoTek is an auto-parts marketplace + mobile car-services platform for **Malawi**. Currency **MWK**; payments via **PayChangu** (mobile money + card). This package documents the **premium redesign** ("The Garage Journal") as a fully interactive prototype spanning both halves of the product:

- **Commerce:** Products (catalogue), Product detail, Cart, Wishlist, Checkout, Order confirmed.
- **Services:** Home, Services, Book Service (single-page), My Services, Service Payment.
- **Account / shared:** Login, Sign up, role-gated Header (guest vs signed-in), shared Footer, Cancel & Quote modals.

## About the Design Files
`AutoTek Prototype.dc.html` is a **design reference created in HTML** — an interactive prototype showing intended look, states, and behavior. It is **not production code to ship directly**. Recreate these designs in AutoTek's target codebase (React/Vue/etc.) using its established framework and component library. If no frontend exists yet, choose the appropriate framework and implement there. `__footer.dc.html` is the shared footer; `support.js` is prototype runtime only — **do not port it**.

## Fidelity
**High-fidelity.** Colors, typography, spacing, borders, and interactions are final. Match closely. Timed states (payment "confirming" spinners) use ~1.6s fake delays — replace with real async calls.

---

## Design Tokens

### Colors
| Token | Hex | Usage |
|---|---|---|
| Bone (page) | `#f5f2ea` | Global background, modal cards |
| Ink | `#16150f` | Primary text, ALL borders/hairlines, dark bands, primary buttons |
| Ink on bone (nav) | `#3f3c33` | Nav labels |
| Body | `#4a473c` | Paragraph text |
| Muted | `#6b6759` | Secondary text |
| Faint / labels | `#8a8674` | Mono labels, meta, eyebrows on light |
| Hairline (light) | `#d8d2c4` | Secondary dividers (stat ledger) |
| Input border | `#cfc7b8` | Form fields |
| Inner divider | `#eee6da` | Card inner rows |
| Teal (accent) | `#115e59` | Links, accent eyebrows, prices, active |
| Teal bright | `#5eead4` | Accent on ink/deep-teal bands |
| Teal tint | `#e4f3ef` | Success fills, selected chip, banner bg |
| Deep teal | `#0f2e29` | Partner band, custom-part band |
| Sand | `#ece9df` | Info boxes, icon wells, "what's next" |
| Warn amber | `#b06a12` text / `#f6ecd8` bg | Pending status |
| Danger | `#9a3d2a` text / `#f6e7e2` bg | Unpaid, destructive, remove, errors |
| Error border | `#e7c3ba` / `#c0392b` | Error box / invalid input border |
| Star gold | `#b06a12` (empty `#d9d1c2`) | Ratings |
| Footer muted | `#c7c3b6` / `#8f8b7e` / `#6f6b5f` | Footer text tiers |

### Fonts
Loaded from Google Fonts:
```
Newsreader — ital,opsz,wght @ 0,6..72,300 / 400 / 500 ; 1,6..72,300 / 400
Inter      — 400 500 600 700
Space Mono — 400
```
- **Newsreader (serif)** — display & headings. Weight **300** for large hero/section heads, **400** for mid headings and italic accents (one italic word per hero for emphasis, e.g. *mechanic*, *never*). Negative tracking on big sizes (`-0.02em`). Used for all prices and big figures.
- **Inter (sans)** — all UI, body, labels, buttons. 400–700.
- **Space Mono (mono)** — ONLY the index/figure system: "No. 01 — The Marketplace", "FIG. 01 — …", eyebrow tags like `01 / SPARE PARTS`, "N results". Never body.

### Typographic scale
| Role | Font / weight | Size / line-height | Notes |
|---|---|---|---|
| Hero H1 | Newsreader 300 | 72px / 0.98, `-0.02em` | Home |
| Page H1 | Newsreader 300 | 46–54px | Products/Cart/etc. |
| Section H2 | Newsreader 300 | 34–44px | |
| Card/serif H3 | Newsreader 400 | 22–26px | |
| Pull-quote | Newsreader 300 | 38px / 1.28 | |
| Product name | Newsreader 400 | 19px | |
| Price (large) | Newsreader 400 | 28–36px, tabular | teal |
| Eyebrow (accent) | Inter 600 | 12px, `0.16em`, UPPER | teal |
| Mono label | Space Mono 400 | 11–12px, `0.10em`, UPPER | `#8a8674` |
| Body | Inter 400 | 14–16px / 1.6–1.65 | |
| Button label | Inter 500 | 11–13px, `0.12em`, UPPER | |
| Field label | Inter 600 | 11px, `0.10em`, UPPER | `#6b6759` |
| Utility bar | Inter 500 | 11px, `0.13em`, UPPER | |

All numerals (stats, prices, quantities, counts) use `font-variant-numeric: tabular-nums`.

### Spacing, borders, radius, motion
- Page gutters: **40px**. Section vertical rhythm: 40–70px. Max content width **1280px** (narrower per page: Book 860, My Services 1080, Cart/Checkout 1000, Payment/Login 640/440).
- **Borders are the signature:** 1px solid **ink** `#16150f` on cards, grids, buttons, and section rules — not shadows. Grids drawn as shared hairlines (border-left+top on container, border-right+bottom on cells).
- Radius: **2px** on buttons/inputs/cards (nearly square); **999px** only on status pills and small circular badges. No large rounded cards.
- Buttons: **fused hairline groups** — two actions share one 1px ink box, divided by a 1px border (no gap, no radius between). Primary = ink fill / bone text; secondary = transparent / ink text.
- Motion: page enter `fadeup .45s`; modal scrim `overlayin .25s` + card `cardin .3s cubic-bezier(.2,.7,.2,1)`; spinner `spin .8s linear`. Keep subtle — no glow/gradient-wash.

---

## Components
- **Utility bar** — ink strip, uppercase mono-tracked; left: "Malawi · MWK", availability; right: track order, support phone.
- **Masthead** — 3-col grid: left nav (Products/Services/Book/Parts Finder), centered serif wordmark "Auto*Tek*" (italic teal "Tek"), right cluster. Right cluster is **role-gated**: always Wishlist (n) + Cart (n); guest → Log in + Sign up (boxed); signed-in → My Services + "Hi, {name} · Log out".
- **Banner** — teal-tint success strip under masthead, global; shows on add-to-cart, submit, payment, cancel, login.
- **Stat ledger** — 4-col hairline row, big Newsreader figure + mono-upper caption.
- **Editorial index row** — `60px | title | desc | →` grid, ink top-rule, serif title, teal arrow; used for category navigation.
- **Product card** — ink-bordered; image (click → detail) with absolute wishlist heart badge (♡/♥, danger when saved); category label, serif name, tabular price, ink "Add to cart" button.
- **Cart line** — thumb, name/meta, qty stepper (− n +) in hairline box, line total (tabular), Remove (danger).
- **Order summary panel** — subtotal / delivery / total (serif teal), primary CTA.
- **Booking card** (My Services) — header (icon well + title + id, status pills), 3-col detail grid, state-dependent footer: Pending → Pay now / Update quote / Cancel; Completed → star rating + View receipt.
- **Status pills** — 999px, 11px upper: Pending (amber), Completed/Paid (teal), Unpaid (danger), Cancelled (sand).
- **Service chip** — selectable; selected = 1.5px teal border + teal-tint fill + filled check box.
- **Modals** — ink scrim `rgba(22,21,15,0.55)`; bone card; Cancel (danger badge + refund disclaimer band) and Contact-for-Quote (call/WhatsApp rows + note).
- **Footer** (`__footer.dc.html`) — ink band, 4-col (brand blurb / Shop / Services / Contact), hairline divider, © + legal row.

## Screens & routes
| Screen | Route | Key content |
|---|---|---|
| Home | `/` | Hero spread + FIG credit, stat ledger, category index, "three ways" on ink, pull-quote, footer |
| Products | `/products` | Eyebrow "No. 04 — The Catalogue", category filter, 4-col product grid, custom-part band |
| Product detail | `/products/:id` | 2-col image + info (price, blurb, add/save, spec list) |
| Cart | `/cart` | Line items + summary; empty state |
| Wishlist | `/wishlist` | Saved product grid (Move to cart / Remove); empty state |
| Checkout | `/checkout` | Delivery form + PayChangu trust + summary (subtotal + delivery `MWK 6,000` + total) → confirming → confirmed |
| Order confirmed | `/order/confirmed` | Success, order #, continue / track |
| Services | `/services` | Hero, benefits row, towing feature, service catalogue grid, partner band, footer |
| Book Service | `/book-service` | Single-page: vehicle, service multi-select, location, schedule, notes, "what's next", submit |
| My Services | `/my-services` | Stat tiles, search + status filter, booking cards |
| Service Payment | `/service-payment` | Quote-ready → confirming; PayChangu trust |
| Login / Sign up | `/login` `/signup` | Auth forms; cross-links |

## Interactions & Behavior
- **Role-gating:** header account cluster + My Services visibility switch on auth. Guests can browse, cart, wishlist, and book; Login/Sign up set `auth` + `user` and route Home with a welcome banner; Log out clears.
- **Cart/Wishlist:** add from card or detail; wishlist heart toggles; qty stepper clamps ≥1; "Move to cart" removes from wishlist + adds to cart. Header counts are live (cart = sum of qty; wishlist = item count).
- **Checkout:** delivery form + summary; "Pay with PayChangu" → ~1.6s confirming spinner → Order confirmed with generated `ORD-####`, cart cleared. Delivery flat `MWK 6,000` in prototype (make dynamic).
- **Book Service:** multi-select services; submit validates (vehicle type + ≥1 service) — invalid shows error box and red input border; valid creates a Pending/Awaiting-quote booking, routes to My Services with banner.
- **My Services:** search + status filter; Pay now → Service Payment; Update quote / Cancel open modals; Cancel sets status Cancelled; completed cards have clickable star rating.
- **Service Payment:** "Proceed to payment" → ~1.6s confirming → My Services, booking marked paid + mechanic assigned, banner shown.
- **Links:** default + hover color = teal `#115e59` (never browser blue).

## State Management
- `auth` (bool) + `user` (name) → header gating.
- `cart: [{id, qty}]`, `wishlist: [id]` → derived counts, subtotal, totals.
- `selected` (product id) for detail; `cat` for catalogue filter.
- `co` checkout form (name, phone, town, address); `orderState` ready|confirming; `lastOrder`.
- `bookings: [{id, kind, label, date, status, paid, price(nullable→Awaiting quote), location, mechanic, rating}]`; `query`, `filterStatus`.
- Services form (`vehicleType`, `vehicleModel`, `services[]`, `town`, `landmark`, `date`, `time`, `notes`) + `errors`.
- `payId`, `payState`; `modal {kind, id}`; `banner`.
- Data needs: products catalogue, cart/order persistence, PayChangu init + callback reconciliation (commerce order + service payment), bookings CRUD, auth.

## Assets
Cloudinary base `res.cloudinary.com/dhbe6wtod/…`:
- Banner: `autotek/banner-images/car-service_gvvxmz`
- Categories / product imagery: `autotek/marketing/Home/{engine_2_nyyvgj, brakes_jaebco, filter_kvavb6, electrical_ivejdb}` (products reuse the category image for their system — **swap for real per-SKU photos**)
- What-we-offer / services: `.../what%20we%20offer/{high-angle-view-machine-part…_yoxjff, service_fun0xh, delivery_krq2au, service_2_ulniay, tow_kxyp4a}`
- PayChangu: `autotek/payment%20methods/{tag2…}.png` (methods banner), `{tag1…}.png` (logo)

Icons are placeholder **emoji** (🔧 🚛 📞 💬 🔒) and unicode hearts/stars/arrows — replace with the codebase's icon set.

## Files
- `AutoTek Prototype.dc.html` — full interactive prototype, all screens + state.
- `__footer.dc.html` — shared footer.
- `support.js` — prototype runtime only (do not port).
