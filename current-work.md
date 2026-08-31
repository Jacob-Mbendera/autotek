# Current Work / Deferred Tasks

Tracking file for active work and items explicitly rescheduled for later. See projectplan.md for the master plan (not yet created as of this entry — this file stands alone for now).

## Deferred Tasks

### 1. Live cart sync when tab regains focus (refetchOnFocus)
- **Status:** Deferred, not started.
- **Context:** Confirmed via live testing (2026-08-21) that an already-open, logged-in tab does NOT pick up cart changes made in another session/device without an explicit page reload. Example: added items in Chrome, merged a guest item via Firefox login, went back to Chrome and clicked between pages — cart count stayed stale until a manual refresh.
- **This is expected/by-design** per the original cart-sync plan (documented as "reload-driven, no websocket" in the verification section) — not a bug, but a real UX gap the user wants closed.
- **Proposed fix:** Add `refetchOnFocus: true` (and possibly `refetchOnReconnect: true`) to the `getCart` RTK Query hook in `frontend/src/store/api/cartApi.ts`. Low-risk, small change — same pattern already used elsewhere in the codebase (e.g. `useGetOrderQuery` in `useReconcilePendingPaychanguOrder.ts` uses `refetchOnFocus`/`refetchOnReconnect`). Also requires `setupListeners(store.dispatch)` to already be wired in the RTK Query store config (needs verifying when this is picked up) for `refetchOnFocus`/`refetchOnReconnect` to actually fire on window focus/reconnect events.
- **Not in scope for this fix:** true real-time/instant sync (websockets or polling) — that would be a separate, larger feature if wanted later.

### 2. Admin user management: no deactivate/delete/update capability
- **Status:** Confirmed gap, not started.
- **Context:** User asked whether the backend has a way to delete, deactivate, or update users beyond changing role — confirmed it does not, in either frontend or backend.
- **Current state:** Only endpoint that exists is `PATCH /api/admin/users/:id/role` (`backend/src/controllers/adminController.ts` — `updateUserRole`, routed in `backend/src/routes/adminRoutes.ts`). Also `GET /api/admin/users` (list) and `GET /api/admin/users/:id` (single).
- **What's missing:**
  - No delete-user endpoint.
  - No deactivate/suspend endpoint.
  - No general profile-update-by-admin endpoint (e.g. editing a user's name/email/phone as an admin).
  - The `User` model (`backend/src/models/User.ts`) has **no `isActive`/`status`/`deletedAt` field at all** — this isn't just a missing route, it needs a schema change first before deactivation can be implemented.
- **Next step (when picked up):** Needs a design decision from the user on scope — hard delete vs. soft-delete/deactivate vs. both, and what happens to a deactivated/deleted user's existing orders, cart, wishlist, reviews, etc. (cascade behavior). Likely needs its own plan before implementation, given the schema change and the number of related collections referencing `User` by ID.

## Recently Completed (context, not pending)
- **Bulk product import via CSV (2026-08-31)**: Admins can now import/update many products at once via CSV upload on the Products page (`Import` button next to `Add Product`). Backend: `POST /api/products/bulk-import` (`backend/src/controllers/productController.ts` — `bulkImportProducts`), row-by-row processing (bad rows are skipped and reported, not fatal to the whole file), matches existing products by `oemPartNumber` (update) vs. creates new otherwise. Uses `csv-parse` — deliberately **not** `xlsx`/SheetJS, since the only npm-published version (0.18.5) carries two unpatched high-severity CVEs (prototype pollution, ReDoS) and the fixed versions were never published to npm. Excel users are asked to save as CSV first. Also fixed a latent bug in `backend/src/middleware/errorHandler.ts` while building this: the "Invalid file type" 400-handling branch was hardcoded to match only the image-upload filter's exact error string, so any other upload filter's rejection (including this new CSV one) fell through to a generic 500 — generalized the string match so it covers all upload filters, not just images.
- Utility bar (top nav strip) now shows Malawi flag colors (`frontend/src/components/Header.tsx`): a small inline-SVG flag icon next to "Malawi", plus a red/green stripe beneath the black bar. "MWK" was dropped from that line after the user reported it was pushing the phone number off-screen on real mobile devices — not yet re-confirmed on an actual phone after that change (browser viewport-resize tooling in this environment cannot fake a true mobile width, confirmed unfixable earlier this session).
- Server-backed cart sync for logged-in users (merged to `main`, commit `a41ba59`, plus a loading-state hotfix commit `1d6a2fc`) — guest-to-server cart merge on login/register, cross-device sync via server as source of truth (reload-driven only, see deferred item #1 above).
- Loading-state fix for `Cart.tsx` so the page shows a spinner instead of a misleading "cart is empty" flash while the server cart is still loading.

## Pending Cleanup
- Delete QA test accounts created during cart-sync verification testing (2026-08-21): `qa.cart.20260821113618@example.com`, `qa.merge.20260821113903@example.com`, `qa.chrome.20260821123027@example.com`. User asked to be reminded — reminder logged here, not yet actioned.
