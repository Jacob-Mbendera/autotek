# Image Enhancement Milestone Plan

## Goal
Enhance the existing image system in focused milestones, starting with the highest-impact items:

1. Admin image cropping/editing before upload
2. Blur-up placeholders (LQIP) for faster perceived loading

This plan is intentionally MVP-first, then iterative hardening.

## Current Baseline (Already Done)
- Cloudinary integration is active (`autotek/products` path).
- `OptimizedImage` exists and is already used in multiple components.
- Admin drag-drop upload UI is working.
- Existing architecture notes are in `IMAGE_UPLOAD_GUIDE.md`.

## Core Rule For This Workstream
After each milestone:
- Run backend verification with `curl` for all affected endpoints.
- Only proceed to the next milestone when curl checks pass.

This is mandatory.

---

## Milestone 1: Admin Cropping and Pre-Upload Editing

### Objective
Allow admin users to crop product images before upload, with aspect ratio presets and preview.

### Scope
- Add crop modal in admin product image upload flow.
- Add aspect ratio options:
  - 1:1
  - 4:3
  - 16:9
- Preview final cropped output before upload.
- Upload the cropped image result to Cloudinary (not original uncropped source unless explicitly chosen later).

### Suggested Technical Direction (MVP)
- Use `react-easy-crop` for straightforward integration.
- Render crop UI in a modal.
- Convert cropped area to Blob/File on client.
- Submit cropped Blob/File through existing upload endpoint.

### Backend Curl Test Gate (Required before Milestone 2)
Run curl checks for image upload endpoints and validate:
- Upload request still succeeds with cropped file payload.
- Response contains expected image URL(s) and metadata currently returned.
- Product update/create endpoints correctly persist uploaded image references.
- Negative test: invalid file type/oversized file still rejects properly.

### Exit Criteria
- Admin can crop and upload successfully with all three ratios.
- Uploaded product image displays correctly in frontend product/admin views.
- Backend curl suite for image upload path passes.

---

## Milestone 2: Blur-Up Placeholders (LQIP)

### Objective
Show lightweight blur placeholders while full images load.

### Scope
- Generate placeholder data at upload time.
- Store placeholder data with image metadata in product records.
- Update `OptimizedImage` to:
  - render blur placeholder first
  - transition to final image on load

### Suggested Technical Direction (MVP)
- Use backend generation with `sharp` for tiny low-quality image (e.g. very small JPEG/WebP base64).
- Store placeholder string per image entry (e.g. `blurDataUrl`).
- Keep this backward-compatible for existing products with no placeholder.

### Data Shape (Proposed)
- Extend product image object to include optional placeholder field:
  - `blurDataUrl?: string`

### Backend Curl Test Gate (Required before any next phase)
Run curl checks and validate:
- Upload endpoint returns placeholder field for newly uploaded images.
- Product fetch endpoints include placeholder metadata.
- Existing products without placeholder are still returned and do not break schema.
- Update endpoint preserves or refreshes placeholder metadata as expected.

### Exit Criteria
- Blur placeholder displays before final image in UI using `OptimizedImage`.
- No regressions for existing product images.
- Backend curl suite for upload/read/update image metadata passes.

---

## Milestone 3 (Later): Batch Upload for Multiple Products

### Objective
Bulk import images and map to products with progress + per-item errors.

### Notes
- Defer until Milestones 1 and 2 are stable.
- Consider this a separate release because validation/mapping complexity is higher.

### Mandatory Gate
- Backend curl test coverage for batch endpoints before rollout.

---

## Milestone 4 (Later): Compression Controls

### Objective
Admin-configurable quality settings (60-100) and optimization behavior.

### Notes
- Prefer defaults first; allow optional override.
- Add guardrails to prevent extreme output quality that harms UX or cost.

### Mandatory Gate
- Backend curl tests validating quality parameter handling and safe defaults.

---

## Milestone 5 (Later): Unsplash Placeholder Replacement

### Objective
Remove hardcoded Unsplash placeholders and replace with managed defaults + admin prompts.

### Notes
- Audit all placeholder URLs and replace with centralized fallback strategy.
- Add admin visibility for products missing uploaded images.

### Mandatory Gate
- Backend curl tests for any migration/audit endpoints before completion.

---

## Testing Strategy Summary

For each milestone:
1. Implement milestone scope.
2. Run backend curl tests for impacted endpoints.
3. Run frontend smoke checks for affected flows.
4. Fix issues.
5. Only then proceed.

## Documentation and Tracking
- Keep implementation history updates in `current-work.md`.
- Keep architecture-specific image notes in `IMAGE_UPLOAD_GUIDE.md`.
- Record milestone test results in a dedicated test log file when executed.

## Ready-to-Start Next Step
Start Milestone 1 implementation (crop modal + ratio presets + cropped upload), then run backend curl gate before moving to Milestone 2.
