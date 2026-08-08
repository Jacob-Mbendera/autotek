# Frontend Returns Test Run – Results

**Test Date**: _______________  
**Tester**: _______________  
**Duration**: _______________

Use this sheet while following [FRONTEND_RETURNS_TESTING_GUIDE.md](./FRONTEND_RETURNS_TESTING_GUIDE.md).

---

## Pre-flight

- [ ] Backend: `cd backend && npm run dev` → http://localhost:5000
- [ ] Frontend: `cd frontend && npm run dev` → http://localhost:5173
- [ ] Test data: `cd backend && node seed-test-data.js` (creates 3 completed orders; note Order IDs from output if different from guide)
- [ ] Credentials: Customer `testuser@autotek.com` / `Test123456` | Admin `admintest@autotek.com` / `Admin123456`

**Order IDs to use** (from seed output or guide):  
Order 1: _______________  
Order 2: _______________  
Order 3 (use for return): _______________

---

## Phase results

| Phase | Description | PASS | FAIL | Notes |
|-------|-------------|------|------|------|
| 1 | Customer login & view orders | [ ] | [ ] | |
| 2 | Request return (form + submit) | [ ] | [ ] | |
| 3 | Customer view returns list | [ ] | [ ] | |
| 4 | Admin view returns | [ ] | [ ] | |
| 5 | Admin approve return | [ ] | [ ] | |
| 6 | Admin process refund | [ ] | [ ] | |
| 7 | Customer view completed return | [ ] | [ ] | |

**Overall**: [ ] ALL PASS  [ ] ISSUES FOUND

---

## Quick URL reference

| Step | URL |
|------|-----|
| Home | http://localhost:5173 |
| Login | http://localhost:5173/login |
| Orders | http://localhost:5173/orders |
| Order detail | http://localhost:5173/orders/{orderId} |
| Request return form | http://localhost:5173/returns/new?orderId={orderId} |
| My returns | http://localhost:5173/returns |
| Return detail | http://localhost:5173/returns/{returnId} |
| Admin returns | http://localhost:5173/admin/returns |

---

## Issues found

| ID | Phase | Severity | Summary |
|----|-------|----------|---------|
| 1 | | Critical / High / Medium / Low | |
| 2 | | | |

---

## Notes

(Any extra observations, console errors, or screenshots references.)
