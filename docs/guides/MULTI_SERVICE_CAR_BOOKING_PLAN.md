# Multi-Service Car Booking Plan

**Status**: Planned (not implemented)  
**Last updated**: 2026-04-12  
**Decision**: One `CarService` booking document with **multiple service types** on a single visit (not multiple separate `CarService` rows per form submit).

## Problem

Customers can only select **one** car maintenance type per booking (e.g. oil change **or** tire rotation). The product should allow selecting **several** services in one request (e.g. oil change **and** tire rotation) for a single visit, one quote, and one payment row in **My Services**.

**Scope**: **Car services** only. Towing remains a separate flow (`TowingService`); do not bundle towing with maintenance in this plan unless explicitly requested later.

## Current implementation (baseline)

- **Model**: [`backend/src/models/CarService.ts`](backend/src/models/CarService.ts) — single field `serviceType` (enum `ServiceType` from shared types).
- **Create API**: [`backend/src/controllers/carServiceController.ts`](backend/src/controllers/carServiceController.ts) — expects one `serviceType` in `req.body`.
- **Booking UI**: [`frontend/src/pages/BookService.tsx`](frontend/src/pages/BookService.tsx) — single `<select>` bound to `carServiceType`; one `createCarService` call on submit.
- **Types**: [`shared/types/index.ts`](shared/types/index.ts) — `ServiceType` enum unchanged; new fields will reference the same enum values.

## Target behavior

1. User picks **one or more** `ServiceType` values on the car-service booking form (checkbox group or accessible multi-select).
2. Submit creates **one** `CarService` document with shared vehicle, location, notes, and preferred date.
3. **My Services** shows **one** card with all selected services listed (not duplicate cards).
4. Admin and notifications show **all** selected services for that job.
5. **Payment** remains one payment per `CarService` document (existing `carServiceId` / PayChangu flows stay conceptually the same).

## Data model

- Add **`serviceTypes: ServiceType[]`** (required, min length 1, max length reasonable cap e.g. 10, unique values recommended).
- **Migration**: For existing documents, set `serviceTypes: [existing.serviceType]` and then remove or deprecate `serviceType`:
  - Prefer a one-time migration script or lazy migration on read until all docs are backfilled.
  - Remove `serviceType` from schema after migration **or** keep a virtual/synced field only for backward compatibility during rollout (team choice).
- **Indexes / filters**: List endpoints that filter by `serviceType` must use array semantics (e.g. MongoDB `$in` / `serviceTypes` contains) — document each query update in implementation.

## Backend

| Area | Action |
|------|--------|
| **Model** | Add `serviceTypes` array with validation; migration strategy for legacy `serviceType`. |
| **Create** | Accept `serviceTypes` (array), validate each entry against `ServiceType`, dedupe if desired. |
| **Update** | Admin/customer update endpoints: allow updating the set of types where business rules permit. |
| **List / filter** | Query params like `serviceType` should match if **any** selected type matches (or define explicit behavior and document it). |
| **Emails / PDFs** | Any template using `carService.serviceType` must render **all** types (comma-separated or bullet list). |
| **Payment** | Confirm PayChangu / `paymentController` paths that reference `carService` only need `carServiceId` — verify no logic assumes a single string `serviceType` for amount rules (adjust if pricing becomes per-type later). |

**Files to touch (non-exhaustive)**:

- [`backend/src/models/CarService.ts`](backend/src/models/CarService.ts)
- [`backend/src/controllers/carServiceController.ts`](backend/src/controllers/carServiceController.ts)
- Car service routes if DTOs change
- Any notification helpers referencing service type

## Frontend

| Area | Action |
|------|--------|
| **API types** | [`frontend/src/store/api/serviceApi.ts`](frontend/src/store/api/serviceApi.ts) — `CarService` and `CreateCarServiceRequest` use `serviceTypes: ServiceType[]`. |
| **BookService** | Replace single select with multi-select UI; validation: at least one type; submit `serviceTypes`. |
| **My Services** | Display multiple labels (chips or list) using `serviceTypeInfo` / labels per type — [`frontend/src/pages/MyServices.tsx`](frontend/src/pages/MyServices.tsx). |
| **Admin** | [`frontend/src/pages/admin/Services.tsx`](frontend/src/pages/admin/Services.tsx) — show all types in table/detail. |
| **Search / filters** | If users filter by service type, behavior should align with backend (e.g. match any selected type). |

## Shared package

- Update [`shared/types/index.ts`](shared/types/index.ts) exports if you add a small helper type (e.g. `ServiceType[]` validation) — optional.

## Testing (when implementing)

- Create booking with **one** type — behaves like today.
- Create booking with **multiple** types — one row returned from API, all types persisted.
- **My Services** and **admin** render all types.
- Legacy records after migration show correct types.
- Payment initiation for a multi-type job still succeeds (smoke test PayChangu init if applicable).

## Explicit non-goals (this plan)

- Per–service-type line pricing on the same invoice (unless added in a follow-up).
- Merging multiple existing separate `CarService` documents into one.
- Towing + car maintenance in a single combined booking.

## Rollout suggestion

1. Backend schema + migration + create/read paths.  
2. Frontend booking form + API types.  
3. My Services + admin + notifications.  
4. Regression pass on filters and payment.

---

When you are ready to implement, start from this checklist and keep changes minimal per layer (model → API → UI).
