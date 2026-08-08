# Product Vehicle Fitment Implementation Plan

**Status**: Phases 1–3 implemented; catalog backfill ongoing  
**Last updated**: 2026-07-19  
**Priority**: High — customer experience and order accuracy  
**Principle**: Prefer more admin/data work over selling a part that does not fit. Wrong fitment is worse than no fitment.

## Why this exists

AutoTek sells spare parts in Malawi. The first question every buyer has is: **“Will this work on my car?”**

Before Phase 1, products (`backend/src/models/Product.ts`) had no structured vehicle compatibility. Fitment existed only on **part requests / custom orders** (`vehicleDetails`). That forced customers to guess from titles and descriptions, which led to:

- Wrong orders and returns
- Support load and refund friction
- Lost trust when a “looks right” part does not fit
- Missed chance to match part requests to in-stock catalog items

**Goal**: Customers find (or are guided to) the **exact** part for their vehicle — make, model, year, and engine where it matters — with honest confidence signals when fitment is incomplete or unverified.

## Product principles

1. **Accuracy over speed of cataloguing.** Do not claim a fit unless data supports it.
2. **Honesty in the UI.** Distinguish *verified fit*, *possible fit*, *universal*, and *fitment unknown*.
3. **Reuse existing vehicle vocabulary.** Makes/models must align with `frontend/src/constants/vehicleOptions.ts` (and shared equivalents if moved) so products, part requests, and filters speak the same language.
4. **One part → many vehicles.** Compatibility is an **array**, never a single make/model string.
5. **Design the data model for all phases now.** Ship UX in phases; avoid schema rewrites later.
6. **Empty fitment is allowed; lying is not.** Products without fitment remain sellable but must not show “fits your vehicle” claims.

---

## Baseline before Phase 1

| Area | State |
|------|--------|
| **Product model** | Name, description, category, price, stock, images, supplier, status, badge, ratings — **no fitment** |
| **Vehicle constants** | Malawi + SA make → model map in `frontend/src/constants/vehicleOptions.ts` |
| **Part requests** | Structured `vehicleDetails` (make, model, year, engine, VIN, etc.) on custom orders |
| **Browse / filter** | Category, search, price — **no shop-by-vehicle** |
| **Matching** | Part requests are manual admin workflow — **no auto-suggest from catalog** |

---

## Target data model (all phases)

Design this shape in Phase 1 even if not every field is required in the admin UI on day one.

### Product fields

```ts
isUniversal: boolean; // true = not vehicle-specific (oils, tools, some bulbs, etc.)

compatibility: ProductCompatibilityEntry[];

fitmentStatus: 'none' | 'partial' | 'verified';
// none     = no entries and not universal (fitment unknown)
// partial  = has entries but not verified by admin/process
// verified = admin marked fitment as checked against known applications
```

### Compatibility entry

```ts
interface ProductCompatibilityEntry {
  make: string;           // e.g. Toyota — align with VEHICLE_MAKES
  model: string;          // e.g. Vitz — align with VEHICLE_MODELS_BY_MAKE
  yearFrom?: number;      // inclusive production start
  yearTo?: number;        // inclusive production end
  engine?: string;        // e.g. 1.5, 1KD-FTV — free text + later normalize
  notes?: string;         // e.g. "ABS models only", "manual transmission"
}
```

### Supporting identifiers (strongly recommended for exact match)

Add on `Product` (optional but high value for Malawi import market):

| Field | Purpose |
|-------|---------|
| `oemPartNumber` | OEM / genuine part number customers and workshops search for |
| `alternatePartNumbers` | Aftermarket / interchange numbers |
| `brand` | Manufacturer brand (Castrol, Denso, etc.) — separate from supplier |

### Explicit non-claims

- Do **not** show “Compatible with your vehicle” unless the customer’s vehicle matches an entry (or product is universal).
- If `fitmentStatus === 'none'`, show neutral copy: e.g. “Fitment not listed — check with us or use Request a part.”
- Prefer linking to `/request-part` when unsure rather than encouraging a risky purchase.

### Indexes (when querying)

- `compatibility.make` + `compatibility.model`
- Text indexes for `oemPartNumber`, `alternatePartNumbers`, `name`
- Compound filters for shop-by-vehicle + category + status

### Migration

- Existing products: `isUniversal: false`, `compatibility: []`, `fitmentStatus: 'none'`
- No breaking API change if new fields are optional with defaults
- Admin can backfill gradually; prioritize high-volume / frequently returned categories first

---

## Phased delivery

### Phase 1 — Capture & display fitment (foundation) — Completed 2026-07-19

**Outcome**: Every product *can* store accurate multi-vehicle fitment; customers *see* it on the product page; admins *can* enter it without a full rewrite later.

#### Backend

- Extend `Product` schema with `isUniversal`, `compatibility[]`, `fitmentStatus`, and optional part-number / brand fields
- Validate:
  - If `isUniversal`, `compatibility` should be empty (or ignored)
  - If not universal, allow empty array (`fitmentStatus: 'none'`)
  - `yearFrom` / `yearTo` coherent when both set
  - Make/model allowed values (shared list) + “Other” free-text escape if needed (same pattern as part requests)
- Create/update product APIs accept the new fields
- List/detail responses include them

#### Admin

- Product create/edit form:
  - Toggle: Universal part
  - Add/remove compatibility rows (make → model dropdowns from existing constants; optional year range, engine, notes)
  - Fitment status: none / partial / verified
  - OEM + alternate part numbers
- Validation messages that discourage saving false confidence (e.g. warn if marking `verified` with empty compatibility and not universal)

#### Customer

- Product detail: **“Fits these vehicles”** section
  - List make / model / years / engine / notes
  - Or “Universal — not vehicle-specific”
  - Or “Fitment not listed yet” + CTA to Request a part / contact
- Do **not** yet require a selected vehicle on browse (that is Phase 2)

#### Success criteria

- [x] Admin form and API support multiple compatibility rows on one product
- [x] Legacy products load with safe defaults (`isUniversal: false`, empty compatibility, `none`)
- [x] Product page never claims fit without data
- [x] OEM and alternate part numbers are included in product/admin search

#### Phase 1 implementation notes

- Shared fitment types live in `shared/types/index.ts`; existing frontend vehicle options remain the admin make/model suggestion source.
- Admin make/model fields use guided datalists while permitting unlisted import variants. Backend still requires non-empty make and model.
- Compatibility payloads are JSON-encoded inside the existing multipart product API.
- Backend validates entry limits, year ranges, field lengths, universal behavior, and valid confidence transitions before image uploads.
- The existing product text index was left unchanged to avoid a conflicting text-index migration. Part-number search uses the existing case-insensitive product query and can receive a dedicated index when catalog scale requires it.
- Customer display is isolated in `frontend/src/components/ProductFitment.tsx` and presents universal, verified, partial, and unlisted states.
- Existing generic compatibility claims on Product Detail were removed; unknown fitment directs the customer to Request a part.

---

### Phase 2 — Shop by vehicle (discovery) — Completed 2026-07-19

**Outcome**: Customers filter the catalog by their car and only see parts that claim compatibility (plus universal parts, with clear labeling).

#### Customer UX

- “My vehicle” selector on Products (make → model → optional year → optional engine)
- Persist selection in local storage / profile later (profile persistence can be a follow-up)
- Filters:
  - Match compatibility entries (make + model; year in range if provided; engine if both sides present)
  - Always optionally include universal parts (toggle: “Include universal parts”)
- Product cards: badge when match is strong (“Fits your vehicle”) vs weak (“Check year/engine”)
- Empty state: no matches → prominent **Request this part** CTA with vehicle prefilled from the selector

#### Backend

- Query params e.g. `make`, `model`, `year`, `engine`, `includeUniversal`
- Efficient MongoDB query against `compatibility` array + `isUniversal`
- Do not silently treat missing fitment as a match

#### Success criteria

- [x] Filtering by Toyota Vitz returns only matching / universal (per toggle) products
- [x] Year-sensitive entries exclude out-of-range years
- [x] Products with `fitmentStatus: 'none'` do not appear as vehicle matches
- [x] Empty results push users to part request with vehicle carried over

#### Phase 2 implementation notes

- Shared matcher helpers live in `shared/utils/productFitmentMatch.ts`.
- Products sidebar uses `VehicleFitmentFilter`; selection syncs to URL + `localStorage` (`autotek.selectedVehicle`).
- Card badges: strong / weak / universal via client-side strength helper.
- Request a part accepts `?make=&model=&year=&engine=` prefill.
- Live curls verified include/exclude universal and year range exclusion.

---

### Phase 3 — Match part requests to catalog (conversion) — Completed 2026-07-19

**Outcome**: When a customer requests a part, AutoTek suggests in-stock products that may fit before (or while) the request stays a manual custom order.

#### Behavior

- On part-request create (and optionally on admin review):
  - Match `vehicleDetails` + part name/category/part number against `compatibility` + OEM/alternate numbers + text search
  - Return ranked suggestions (exact part number > make/model/year/engine > make/model only)
- Customer UI: “We may already have this” with product links and confidence labels
- Admin Custom Orders: suggested catalog matches panel to convert request → existing product sale when appropriate

#### Guardrails

- Suggestions are **assistive**, not auto-order
- Low-confidence matches require human confirmation
- Never auto-cancel a part request solely because of a suggestion

#### Success criteria

- [x] Exact OEM number match surfaces the right SKU
- [x] Vehicle-only matches are labeled as possible, not guaranteed
- [x] Admin can clear / dismiss suggestions without blocking status workflow

#### Phase 3 implementation notes

- Ranking helpers live in `shared/utils/productFitmentMatch.ts` (`rankCatalogProductSuggestions`).
- Public endpoint: `GET /api/products/suggestions`.
- Request Part shows debounced suggestions while composing the form; Admin Custom Order detail shows a dismissible match panel.
- Live curls verified exact OEM, strong vehicle+name, and year-out-of-range empty results.

---

## Customer experience standards

| Situation | What the customer should see |
|-----------|------------------------------|
| Universal part | Clear “Works across vehicles / not vehicle-specific” |
| Verified compatibility match | “Fits your [year make model]” (and engine if used) |
| Partial / year unknown | “May fit — confirm year/engine” + request-a-part escape |
| No fitment data | “Fitment not listed” — never a green “compatible” badge |
| No catalog match | Guided path to **Request a part** with vehicle fields filled |

**Checkout / add-to-cart (recommended when Phase 2 vehicle is selected):**

- If vehicle selected and product does not match → blocking confirm dialog (“This part is not listed for your vehicle. Continue anyway?”) or soft warn + request-a-part link
- Prefer friction here over a wrong delivery

---

## Admin & data-quality workflow

1. Prefer entering **OEM / interchange numbers** whenever known — often more reliable than model lists alone.
2. Mark `verified` only after checking supplier application list, packaging, or known good sales history.
3. Backfill order: top sellers → high return categories → long-tail.
4. Treat returns with reason “wrong fit / does not fit vehicle” as a signal to fix or clear bad compatibility rows.
5. Allow “Other” make/model free text carefully; normalize popular free-text into the shared lists over time.

---

## Shared / reuse

- Move or mirror vehicle make/model constants to a **shared** module used by:
  - Product admin + API validation
  - Product browse filters
  - Part request form (already uses frontend constants)
- Keep Malawi + SA market list as the source of truth; extend deliberately, not ad hoc in product titles.

---

## Likely files to touch (when implementing)

**Backend**

- `backend/src/models/Product.ts`
- Product validation middleware / controllers
- Product list query (Phase 2 filters)
- Custom order controller / matching helper (Phase 3)

**Frontend**

- Admin product create/edit
- Product detail + Products list
- `frontend/src/constants/vehicleOptions.ts` (and shared export)
- Part request create success / suggestions UI (Phase 3)
- Admin Custom Orders suggestions panel (Phase 3)

**Shared**

- Types for `ProductCompatibilityEntry`, `fitmentStatus`
- Optional shared match helper used by API and (if needed) client display logic

---

## Testing checklist (per phase)

### Phase 1

- Create product with 0 / 1 / many compatibility rows
- Universal product rejects or clears vehicle rows per validation rules
- Legacy product JSON still works
- Product detail renders all three states (universal / listed / unknown)

### Phase 2

- Filter make+model, with and without year
- Engine match and engine-missing behavior
- Universal include/exclude toggle
- Prefill Request a part from vehicle selector

### Phase 3

- OEM exact match
- Compatibility soft match ranking
- No false “guaranteed” label on soft matches
- Admin dismiss / use suggestion paths

---

## Explicit non-goals (for now)

- Full commercial fitment database licensing (TecDoc-style) — revisit only if catalog scale demands it
- VIN decode service (optional later; VIN already collected on part requests)
- Forcing every SKU to have fitment before it can be sold
- Auto-fulfilling custom orders without human/admin confirmation

---

## Decision log

| Date | Decision |
|------|----------|
| 2026-07-19 | Proceed with phased fitment: (1) schema + display, (2) shop by vehicle, (3) match part requests to catalog |
| 2026-07-19 | Optimize for exact customer need over minimal admin effort; wrong fit claims are unacceptable |
| 2026-07-19 | Compatibility is multi-entry; include year range, engine, OEM/alternate numbers, and fitment confidence status from the start of the model |
| 2026-07-19 | Phase 1 implemented with backward-compatible defaults and guided-but-extensible make/model entry |
| 2026-07-19 | Phase 2 implemented: shop-by-vehicle API filters, Products selector, match badges, request-part prefill |
| 2026-07-19 | Phase 3 implemented: catalog suggestion endpoint + customer/admin assistive match panels |

---

## Suggested implementation order

1. Shared types + vehicle constants alignment  
2. Phase 1 schema, API, admin form, product detail  
3. Data backfill for priority SKUs  
4. Phase 2 shop-by-vehicle  
5. Phase 3 request ↔ catalog matching  

When starting implementation, update this file’s **Status** markers per phase and note any schema deviations in the Decision log.
