# Working State Snapshot — 2026-08-08

Snapshot of the repo before starting new work. Branch `dev`, all changes below are **uncommitted** in the working tree (verified clean `tsc --noEmit` on both `backend` and `frontend` at time of writing).

---

## 1. Product Vehicle Fitment — Phases 1–3 (complete, uncommitted)

Full spec: [`PRODUCT_FITMENT_IMPLEMENTATION_PLAN.md`](../product-fitment/PRODUCT_FITMENT_IMPLEMENTATION_PLAN.md) · sample data: [`PRODUCT_FITMENT_TEST_DATA.md`](../product-fitment/PRODUCT_FITMENT_TEST_DATA.md)

**Status:** All three phases marked completed 2026-07-19 in the plan doc. Verified with live curls per-phase (documented in the plan). No known bugs.

- **Phase 1 — Capture & display fitment**: `Product` schema gains `isUniversal`, `compatibility[]` (make/model/yearFrom/yearTo/engine/notes), `fitmentStatus` (`none`/`partial`/`verified`), `oemPartNumber`, `alternatePartNumbers`, `brand`. Admin create/edit captures it; customer Product Detail shows it via `frontend/src/components/ProductFitment.tsx`. Legacy products default safely (`isUniversal: false`, `compatibility: []`, `fitmentStatus: 'none'`).
- **Phase 2 — Shop by vehicle**: Product list API accepts `make`, `model`, `year`, `engine`, `includeUniversal`. Products page has a vehicle selector (`frontend/src/components/VehicleFitmentFilter.tsx`, matching logic in `frontend/src/utils/vehicleFitmentFilter.ts` and shared `shared/utils/productFitmentMatch.ts`), persisted to URL + `localStorage` key `autotek.selectedVehicle`. Card badges show strong/weak/universal match.
- **Phase 3 — Match part requests to catalog**: `GET /api/products/suggestions` ranks catalog matches (exact OEM/alt number > vehicle+name > vehicle only). Surfaced as "We may already have this" on Request a Part (`frontend/src/pages/RequestPart.tsx`) and as a dismissible suggestions panel on Admin Custom Orders detail (`frontend/src/components/CatalogSuggestionsPanel.tsx`).

**Next (data work, not code):** Backfill fitment/OEM data on priority SKUs (top sellers → high-return categories → long tail) so suggestions are useful in production. No further phases planned; explicit non-goals include TecDoc-style licensing, VIN decode, and forcing fitment on every SKU.

**Files (backend):** `backend/src/models/Product.ts`, `backend/src/controllers/productController.ts`, `backend/src/routes/productRoutes.ts`, `shared/utils/productFitmentMatch.ts`, `shared/types/index.ts` / `index.d.ts`

**Files (frontend):** `frontend/src/components/ProductFitment.tsx`, `VehicleFitmentFilter.tsx`, `CatalogSuggestionsPanel.tsx`, `frontend/src/utils/vehicleFitmentFilter.ts`, `frontend/src/pages/Products.tsx`, `ProductDetail.tsx`, `RequestPart.tsx`, `frontend/src/store/api/productApi.ts`, `productSlice.ts`, `frontend/src/components/ProductCard.tsx`, `ProductCardList.tsx`, `QuickViewModal.tsx`

---

## 2. BR-08 — Custom order status transitions (complete, uncommitted)

Tracked in: [`BUSINESS_RULES_TODO.md`](../business-rules/BUSINESS_RULES_TODO.md) (status flipped `pending` → `done`, dated 2026-07-19)

**Problem it fixes:** `updateCustomOrder` previously accepted any enum status value at any time, with no ordering or data-completeness checks.

**What shipped:**
- New shared util `shared/utils/customOrderStatusTransitions.ts` (re-exported for backend via `backend/src/utils/customOrderStatusTransitions.ts`, imported directly by frontend via `@shared/utils/customOrderStatusTransitions` in `frontend/src/pages/admin/CustomOrders.tsx`).
- Forward-only flow: `pending → ordered → received → completed`, cancel allowed from any non-terminal state, no skipping steps.
- `ordered` / `received` / `completed` are gated behind a valid quote: `estimatedPrice` must be a finite number > 0, `supplier` must be a non-empty string. Gate message names the missing field.
- `cancelled` and `completed` are terminal — no further changes accepted.
- `backend/src/controllers/customOrderController.ts` (`updateCustomOrder`) now merges incoming fields with the existing document before validating the transition, validates `estimatedPrice` is non-negative on direct field updates too, and returns HTTP 400 with the util's message on any disallowed transition.
- Admin UI (`frontend/src/pages/admin/CustomOrders.tsx`) uses `getAllowedNextCustomOrderStatuses` / `getCustomOrderStatusLabel` to only offer valid next statuses in the status control.

**Next:** BR-14 (status audit trail) is the only other item left open in `BUSINESS_RULES_TODO.md`; otherwise P0–P3 business rules are complete per that doc's own summary.

**Files:** `backend/src/controllers/customOrderController.ts`, `backend/src/utils/customOrderStatusTransitions.ts`, `shared/utils/customOrderStatusTransitions.ts`, `frontend/src/pages/admin/CustomOrders.tsx`, `BUSINESS_RULES_TODO.md`

---

## 3. Known open issue (deferred, not part of this session's diff)

### Returns Quick Actions go stale on Order Detail without a hard refresh

Documented in `current-work.md` under "Previous Update (July 19, 2026) — Known issue: Returns Quick Actions stale UI".

After creating or cancelling a return, Order Detail's `Request Return` / `View Return Request` quick actions often don't update until a hard browser refresh. Same pattern may affect related returns list UIs.

**Already tried, not sufficient:**
- RTK `invalidatesTags` + safe middleware fallback invalidate
- `refetchOnMountOrArgChange` on Order Detail / Returns
- Explicit `invalidateTags` after create/cancel
- Backend `orderId` filter on `GET /returns` + Order Detail query by `orderId`
- Mutation `onQueryStarted` upsert/update for return detail cache

**Next step when picked up:** Trace the Network tab on remount for `GET /returns?orderId=…` (check status/cached body), confirm whether the cache key or middleware is still skipping invalidation, or replace list-derived Quick Actions with a dedicated per-order returns endpoint / local UI state after mutation.

---

## Verification performed this session

- `cd backend && npx tsc --noEmit` → clean, no errors
- `cd frontend && npx tsc --noEmit` → clean, no errors
- Confirmed all new/changed files in items 1–2 have no leftover `TODO`/`FIXME`/`console.log`
- Confirmed shared util is consumed consistently: backend controller, backend re-export shim, and frontend admin page all import from the same source of truth

## Not yet done

- Nothing has been committed. `git status` still shows all files above as modified/untracked on `dev`.
