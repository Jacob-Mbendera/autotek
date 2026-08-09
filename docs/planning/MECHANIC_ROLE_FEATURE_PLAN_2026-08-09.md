# Build a real mechanic role: login + assigned-jobs dashboard

## Context

Audit finding #27 (`docs/planning/SYSTEM_AUDIT_2026-08-08.md`): `UserRole.MECHANIC` and `mechanicMiddleware` exist in the codebase, but nothing uses them — no route is gated by `mechanicMiddleware`, no page checks for a mechanic role, and admins can still promote any `User` to `role: 'mechanic'` via the live Admin → Users UI, where it currently does nothing.

The system's real "mechanic" concept today is `ServiceProvider` (`providerType: 'mechanic' | 'driver'`) — garage-affiliated staff with no login, no email, no password, created/managed entirely by admins and referenced by `CarService.assignedMechanic` / `TowingService.assignedDriver`. The user chose to wire the dead `mechanic` User role into a real feature rather than deleting it: garage staff get an actual account, linked to their `ServiceProvider` record, and a dashboard scoped to their own assigned jobs where they can move a job through its status (assigned → in-progress → completed).

## Design

### Account model: link `User` to `ServiceProvider`, invite-based activation

- Add `serviceProvider?: Types.ObjectId` (ref `ServiceProvider`) to `User` (`backend/src/models/User.ts`). Only meaningful when `role === 'mechanic'`.
- `ServiceProvider` currently has no email/password — it stays that way. The `User` document is the login; the `ServiceProvider` document stays the operational record (garage, vetting, ratings). One `ServiceProvider` gets at most one linked `User`.
- New admin flow: **"Invite mechanic"** on the existing Admin → Providers page, for an already-created, vetted `ServiceProvider` row. Admin supplies an email. Backend creates a `User` with `role: mechanic`, `serviceProvider: <id>`, a random unusable placeholder password, and reuses the **existing password-reset token mechanism** (`user.resetToken`/`resetTokenExpiry`, `crypto.randomBytes(32)`, 1hr — same fields/pattern as `forgotPassword` in `backend/src/controllers/authController.ts:281-323`) to send a "set your password" email via a new `sendMechanicInviteEmail` (mirrors `sendPasswordResetEmail`). The mechanic follows the link to `/reset-password?token=...` (already-existing page/flow) to set a password and can then log in normally through the existing `/login` page — no new auth screens needed.
- This reuses `generateToken`/`setAuthCookie`/`authMiddleware`/`tokenVersion` revocation exactly as-is; a mechanic's session works identically to a customer's, just with a different `role`.

### Backend authorization

- Wire up the existing `mechanicMiddleware` (`backend/src/middleware/auth.ts:56-66`, currently unused) onto new mechanic-scoped routes.
- New controller `backend/src/controllers/mechanicController.ts`:
  - `getMyAssignedServices` — looks up the caller's `ServiceProvider` via `req.user.serviceProvider` (404 if a mechanic-role user has no linked provider yet), then queries `CarService`/`TowingService` with `assignedMechanic`/`assignedDriver` matching that provider id (mirrors the query shape in `getCarServices`, `backend/src/controllers/carServiceController.ts:233-262`, but scoped by provider instead of by `user`). Returns both service types merged, or split by type via a query param — match whatever the frontend needs (see below).
  - `updateMyServiceStatus` — lets a mechanic move **their own assigned job** forward one step (`assigned → in-progress`, `in-progress → completed`) or nowhere else. Reuses `assertValidServiceStatusTransition` (`shared/utils/serviceStatusTransitions.ts`) exactly as the admin path does, but: (a) loads the service and 403s if `assignedMechanic`/`assignedDriver` doesn't match the caller's provider id, (b) only accepts the two forward transitions above — no cancel, no reassignment, no price/ETA edits, (c) same payment-gate rule already enforced by `assertValidServiceStatusTransition` (`in-progress`/`completed` require `paymentStatus === completed`) applies unchanged, surfacing the same error message a mechanic would need to see ("payment not yet completed").
- New routes file `backend/src/routes/mechanicRoutes.ts`, mounted at `/api/mechanic`, every route wrapped in `authMiddleware, mechanicMiddleware`:
  - `GET /services` → `getMyAssignedServices`
  - `PATCH /services/:type/:id/status` → `updateMyServiceStatus` (`:type` is `car-service`|`towing`, matching the existing dual-model split elsewhere in the codebase)
- Admin-side additions to `backend/src/controllers/providerAdminController.ts` / `adminRoutes.ts`: `POST /admin/service-providers/:id/invite` → creates/links the `User`, sends the invite email. Reuses the phone/email validation patterns already added in `adminValidation.ts` this session.

### Frontend

- New RTK Query slice `frontend/src/store/api/mechanicApi.ts`: `getMyServices`, `updateMyServiceStatus`, tagged `MechanicService` (separate from the existing `Admin`/`Service` tags so a mechanic's own cache doesn't cross-invalidate admin views).
- `ProtectedRoute` (`frontend/src/components/ProtectedRoute.tsx`) gets a new prop, e.g. `allowedRoles?: UserRole[]`, generalizing today's boolean `adminOnly` check without breaking existing admin routes (keep `adminOnly` as sugar for `allowedRoles={[ADMIN]}` to avoid touching every existing call site).
- New page `frontend/src/pages/mechanic/MyJobs.tsx`: lists the mechanic's assigned car services + towing jobs (reuse `AdminCard`/table patterns from `frontend/src/pages/admin/Services.tsx`, stripped to read-only info + a single "Advance to [next status]" button per row — no dropdown of arbitrary statuses, no reassignment, no pricing — mirroring the forward-only backend contract).
- New minimal `frontend/src/components/MechanicHeader.tsx` (or a conditional branch in the existing `Header.tsx`, matching how the customer/admin split already works) shown when `user.role === UserRole.MECHANIC`, linking to `/mechanic/jobs`.
- Admin → Providers page (`frontend/src/pages/admin/Providers.tsx`): add an "Invite as mechanic" action next to each vetted `ServiceProvider` row, calling the new invite endpoint, showing sent/already-invited state.
- Admin → Users page (`frontend/src/pages/admin/Users.tsx`): the existing "Mechanic" option in the role dropdown (`UserRole.MECHANIC`, line ~196) now has real meaning; no change required there, but note in passing that manually setting a random `User` to `mechanic` via this dropdown produces a mechanic account with NO linked `ServiceProvider` — `getMyAssignedServices` must 404/empty-state gracefully for that case rather than crash, since this path stays open.

## Files touched

**Backend:** `models/User.ts`, `middleware/auth.ts` (no logic change, just start using `mechanicMiddleware`), new `controllers/mechanicController.ts`, new `routes/mechanicRoutes.ts`, `server.ts` (mount route), `controllers/providerAdminController.ts` (+invite endpoint), `routes/adminRoutes.ts` (+invite route), `middleware/adminValidation.ts` (+invite validation), `utils/emailService.ts` (+`sendMechanicInviteEmail`), `controllers/authController.ts` (no change — reused as-is).

**Frontend:** new `store/api/mechanicApi.ts`, `components/ProtectedRoute.tsx`, new `pages/mechanic/MyJobs.tsx`, new `components/MechanicHeader.tsx` or `Header.tsx` edit, `App.tsx` (+route), `pages/admin/Providers.tsx` (+invite action), `store/api/providerAdminApi.ts` or equivalent (+invite mutation).

**Shared types:** no enum changes needed — `UserRole.MECHANIC`, `ServiceStatus`, `ProviderType` all already exist.

## Verification

1. `tsc --noEmit` clean on both sides throughout.
2. Live curl:
   - Admin creates a vetted `ServiceProvider`, invites it as a mechanic (using a real inbox I can check), confirm `User` created with `role: mechanic` + `serviceProvider` link + `resetToken` set, confirm the invite email actually arrives (SMTP is live/configured in this environment via Gmail — no mocking needed).
   - Mechanic sets password via the existing reset-password endpoint using the token from the real email, logs in via `/auth/login`, gets a cookie.
   - `GET /api/mechanic/services` returns only jobs where `assignedMechanic`/`assignedDriver` equals their provider id — confirm a job assigned to a *different* provider is excluded.
   - `PATCH /api/mechanic/services/car-service/:id/status` from `assigned` → `in-progress` succeeds when paid; fails cleanly on an unpaid job; fails 403 on a job not assigned to them; fails 400 attempting to skip a step or cancel.
   - Confirm a plain `customer`-role user and an admin-created-but-unlinked `mechanic`-role user both get sane responses (401/403/empty), not a crash.
3. Browser pass: invite flow from Admin → Providers through email-link password set through mechanic login through `/mechanic/jobs` showing only that provider's assigned jobs, advancing one job's status with a single click, confirming the admin Services page reflects the change live (existing `Admin` tag invalidation) without needing a new tag bridge — confirm whether `MechanicService`-tag mutations need to also invalidate `Admin`/`Service` tags so the admin view doesn't go stale, since these are now two write paths into the same underlying documents.
4. Update `docs/planning/SYSTEM_AUDIT_2026-08-08.md` marking #27 as fixed, in the same format as #17/#18/#5/#6, describing this as a feature build rather than a bug fix.
