# Services Testing Guide - AutoTek Platform

**Date Created:** March 27, 2026
**Testing Scope:** Towing Services & Car Services - Complete End-to-End Flow
**Prerequisites:** Backend running on port 5000, Frontend running on port 5173

---

## Table of Contents
1. [Test Setup](#test-setup)
2. [Part 1: Public Service Browsing](#part-1-public-service-browsing)
3. [Part 2: Service Booking Flow](#part-2-service-booking-flow)
4. [Part 3: My Services Management](#part-3-my-services-management)
5. [Part 4: Service Payment](#part-4-service-payment)
6. [Part 5: Service Cancellation](#part-5-service-cancellation)
7. [Part 6: Edge Cases & Error Handling](#part-6-edge-cases--error-handling)
8. [Part 7: Admin Guardrails](#part-7-admin-guardrails-3-tests)
9. [Part 8: Admin Service Pricing & Quote Requests](#part-8-admin-service-pricing--quote-requests)
10. [Test Results Summary](#test-results-summary)

---

## Test Setup

### Before You Begin

1. **Backend Status:** ✅ Running on http://localhost:5000
2. **Frontend Status:** ⏳ Start with `cd frontend && npm run dev`
3. **Database:** MongoDB should be seeded with test data
4. **Test Accounts:**
   - Customer: `testuser@autotek.com` / `Test123456`
   - Admin: `admintest@autotek.com` / `Admin123456` (matches `backend/seed-test-data.js`)

### Test User Preparation

1. Open browser and navigate to http://localhost:5173
2. Have two browser windows/tabs ready:
   - Tab 1: Customer view (logged in as testuser)
   - Tab 2: Admin view (logged in as admintest@autotek.com) - for later tests

---

## Part 1: Public Service Browsing (3 Tests)

### Test 1.1: View Services Page (Public Access)

**Purpose:** Verify services page is publicly accessible without login

**Steps:**
1. Open browser in incognito/private mode (or logout if logged in)
2. Navigate to http://localhost:5173/services
3. Observe the page loads without redirect to login

**Expected Results:**
- ✅ Page loads successfully without authentication
- ✅ `/services` is a **marketing + catalog** page only: hero, benefits, towing overview, car service type cards, How It Works, and bottom CTA
- ✅ **No** public grid of real service requests (no live list of other users bookings); those appear only after sign-in under **My Services**
- ✅ Short helper copy may appear (e.g. sign in to manage bookings / link to My Services when logged in)
- ✅ Two main service categories displayed:
  - Towing Services (with truck icon)
  - Car Services (with wrench icon)
- ✅ Service descriptions visible
- ✅ "Book Service" / "Book Towing Service" buttons present
- ✅ "How It Works" section displayed
- ✅ Clean, professional UI with gradients

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 1.2: Browse Towing Services

**Purpose:** Verify towing service information is displayed correctly

**Steps:**
1. On /services page, locate the "Towing Services" card
2. Read the service description
3. Click "Book Towing Service" button

**Expected Results:**
- ✅ Towing service card shows:
  - Truck icon
  - "24/7 Emergency Towing" title
  - Description about roadside assistance
  - Price information
- ✅ Clicking "Book Towing Service" redirects to login/register if not authenticated
- ✅ After login, should redirect back to booking page

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 1.3: Browse Car Services

**Purpose:** Verify car service information is displayed correctly

**Steps:**
1. On /services page, locate the "Car Services" card
2. Read the service description
3. Note the service types listed

**Expected Results:**
- ✅ **Car Services** section shows:
  - Wrench icon
  - Section heading **"Car Services"** (not a separate "Professional Car Services" page title)
  - Description about maintenance at your location
  - Grid of service types: Oil Change, Brake Pads, Spark Plugs, Air Filter, Battery, Tire Rotation, etc.
- ✅ Each type has its own card with "Book Service" (or equivalent) CTA
- ✅ Professional presentation (icons, gradients); pricing is typically "book for quote" style on the marketing page

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

## Part 2: Service Booking Flow (6 Tests)

### Test 2.1: Book Towing Service - Authentication Check

**Purpose:** Verify booking requires authentication

**Steps:**
1. Logout if logged in
2. Navigate to http://localhost:5173/book-service?service=towing
3. Observe redirect behavior

**Expected Results:**
- ✅ Redirects to /login page
- ✅ URL shows return parameter containing: `/book-service?service=towing`
- ✅ After login, returns to `/book-service?service=towing`

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 2.2: Book Towing Service - Form Fields

**Purpose:** Verify towing service booking form is complete

**Steps:**
1. Login as testuser@autotek.com
2. Navigate to `/book-service?service=towing`
4. Examine all form fields

**Expected Results:**
- ✅ Towing booking form shows:
  - **Vehicle Type** (text input, required) — e.g. Sedan, SUV, truck (there is **no** separate "Vehicle Make" field)
  - **Vehicle Model (Optional)** (text input) — e.g. make/model/year in one line
  - Pickup Location (input with map icon)
  - Pickup Description (optional)
  - Destination Location (input with map icon)
  - Destination Description (optional)
  - Additional Notes (textarea - optional)
- ✅ Backend stores `vehicleType` as `vehicleDetails.make` and `vehicleModel` as `vehicleDetails.model`
- ✅ Required fields enforce validation when empty
- ✅ "Submit Service Request" button at bottom

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 2.3: Book Towing Service - Submit Request

**Purpose:** Verify towing service can be successfully booked

**Steps:**
1. Fill in the towing service form:
   - Vehicle Type: `Sedan`
   - Vehicle Model: `Toyota Corolla`
   - **Pickup town/city**: `Lilongwe`
   - **Pickup landmark/area**: choose an existing landmark (or `Other/Custom` + custom directions)
   - Optional: click **Use my location (map pin)** in pickup
   - Pickup Description: `Near Shoprite, next to the blue gate`
   - **Destination town/city**: `Lilongwe`
   - **Destination landmark/area**: choose an existing landmark (or `Other/Custom` + custom directions)
   - Optional: click **Use my location (map pin)** in destination
   - Destination Description: `Opposite the main market`
   - Notes: `Car won't start, need urgent assistance`
2. Click **Submit Service Request**
3. Wait for response

**Expected Results:**
- ✅ Loading state shows while submitting
- ✅ Success notification appears
- ✅ Redirected to /my-services page
- ✅ New towing service appears in the list
- ✅ Service status shows "Pending"
- ✅ Payment status shows "Unpaid" or "Pending Payment"
- ✅ Service displays structured pickup/destination information correctly
- ✅ If a map pin was provided, **Open pickup in Maps** / **Open destination in Maps** opens close to the pinned area

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 2.4: Book Car Service - Form Fields

**Purpose:** Verify car service booking form shows correct fields

**Steps:**
1. Navigate to `/book-service?service=car-service`
3. Examine form fields

**Expected Results:**
- ✅ Car service booking form shows:
  - Service Type dropdown (Oil Change, Brake Pads, Tire Rotation, etc.)
  - **Vehicle Type** (text input, required)
  - **Vehicle Model (Optional)** (text input)
  - **Service location selector**:
    - Town / City dropdown
    - Landmark / Area dropdown
    - Custom location textarea when `Other/Custom` is selected
  - Optional **Use my location (map pin)** button
  - Location Description (optional)
  - Preferred Date (date picker - optional)
  - Preferred Time (time picker - optional)
  - Additional Notes (textarea - optional)
- ✅ Service type dropdown has multiple options
- ✅ Date picker allows future dates only

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 2.5: Book Car Service - Submit Request

**Purpose:** Verify car service can be successfully booked

**Steps:**
1. Fill in the car service form:
   - Service Type: `Oil Change`
   - Vehicle Type: `Sedan`
   - Vehicle Model: `Honda Civic`
   - **Service town/city**: `Blantyre`
   - **Service landmark/area**: choose an existing landmark (or `Other/Custom` + custom directions)
   - Optional: click **Use my location (map pin)**
   - Location Description: `Limbe area, near the industrial site`
   - Preferred Date: Select tomorrow's date
   - Notes: `Please use synthetic oil`
2. Click **Submit Service Request**
3. Wait for response

**Expected Results:**
- ✅ Loading state shows while submitting
- ✅ Success notification appears
- ✅ Redirected to /my-services page
- ✅ New car service appears in the list
- ✅ Service type "Oil Change" displayed
- ✅ Service status shows "Pending"
- ✅ Payment status shows "Unpaid"
- ✅ Preferred date displayed correctly
- ✅ If a map pin was provided, **Open location in Maps** opens near the pinned area

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 2.6: Booking Validation

**Purpose:** Verify form validation works correctly

**Steps:**
1. Navigate to `/book-service?service=towing`
3. Try to submit form without filling required fields
4. Fill only some fields and try submitting
5. Check error messages

**Expected Results:**
- ✅ Cannot submit empty form
- ✅ Error messages appear for required fields:
  - "Vehicle type is required"
  - Structured location errors such as:
    - "Select a town for pickup / destination / service location"
    - "Select a landmark or area for pickup / destination / service location"
    - "Describe your location ..." when `Other/Custom` is selected but empty
- ✅ Optional fields (notes, descriptions) don't show errors
- ✅ Form highlights invalid fields in red
- ✅ Submit button remains enabled but blocked by validation until required fields are filled

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

## Part 3: My Services Management (7 Tests)

### Test 3.1: View My Services Page

**Purpose:** Verify My Services page displays all user services

**Steps:**
1. Login as testuser@autotek.com
2. Navigate to /my-services (or click "My Services" in header)
3. Observe the page content

**Expected Results:**
- ✅ Page loads successfully
- ✅ Statistics dashboard shows:
  - Total Services (should be 2 if you completed tests 2.3 & 2.5)
  - Pending Services (should be 2)
  - Completed Services (should be 0)
  - Total Spent (should be MWK 0)
- ✅ Service cards display with:
  - Service type icon (truck for towing, wrench for car service)
  - Service type label
  - **Reference** (short id, e.g. hash + last 6 chars) for support
  - Status badge
  - Payment status badge
  - When **Unpaid** and service not completed/cancelled: **payment reminder** (complete payment to confirm)
  - **Status guidance** line for pending / assigned / in-progress / completed (not for cancelled)
  - **Vehicle** line: type and optional model
  - Location details and **Open in Maps** link(s) (pickup; towing also destination when available)
  - **Requested** date-time and **Last updated** date-time
  - For **car services** with a preferred schedule: **Preferred** date and time (when provided at booking)
  - **Price**: **MWK** badge and amount only when a price is set; otherwise label **Price not set yet** (no MWK badge until quoted)
  - When unpaid and no price: **Price not set yet** banner, amber note that final pricing may change if details are inaccurate, optional **Quote request last sent** timestamp after submitting
  - When assigned by admin: **Assigned driver** (towing) or **Assigned mechanic** (car) with optional phone
  - Notes when present
  - Action buttons: **Pay Now (MWK)** only when priced; **Contact for quote** when price not set; **Cancel** when allowed

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 3.2: Service Filtering - By Type

**Purpose:** Verify service type filtering works

**Steps:**
1. On /my-services page, locate the filter dropdown "All Services"
2. Click and change to "Towing Only"
3. Observe results
4. Change to "Car Services Only"
5. Observe results
6. Change back to "All Services"

**Expected Results:**
- ✅ "Towing Only" shows only towing services
- ✅ "Car Services Only" shows only car services
- ✅ "All Services" shows both types
- ✅ Filter updates immediately without page reload
- ✅ Statistics dashboard updates based on filter

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 3.3: Service Filtering - By Status

**Purpose:** Verify status filtering works

**Steps:**
1. On /my-services page, locate status filter dropdown
2. Try filtering by different statuses:
   - Pending
   - Assigned
   - In Progress
   - Completed
   - Cancelled

**Expected Results:**
- ✅ Each status filter shows only services with that status
- ✅ Currently should see services in "Pending" filter
- ✅ Other status filters show "No services found" (if no services in those states)
- ✅ Filter updates immediately
- ✅ Clear message when no services match filter

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 3.4: Service Search

**Purpose:** Verify search functionality works

**Steps:**
1. On /my-services page, locate the search input
2. Type "Toyota" in search box
3. Observe filtering
4. Clear search
5. Type "Lilongwe" in search box
6. Observe filtering

**Expected Results:**
- ✅ Searching "Toyota" shows services where **vehicle type**, **vehicle model**, or other searchable text matches (towing or car)
- ✅ Searching "Lilongwe" shows services with Lilongwe in location
- ✅ Search works on:
  - Vehicle type and model (and related text on the card)
  - Service type
  - Location names
- ✅ Search is case-insensitive
- ✅ Search updates as you type (filters immediately)
- ✅ Clearing search shows all services again

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 3.5: Service Details Display

**Purpose:** Verify service cards show all relevant information

**Steps:**
1. On /my-services page, examine a service card closely
2. Check all information fields

**Expected Results:**
For **Towing Service** card:
- ✅ Title "Towing Service" with truck icon
- ✅ Reference chip (hash + 6 characters)
- ✅ Status badge (Pending, Assigned, etc.)
- ✅ Payment status badge (Unpaid/Paid)
- ✅ Payment reminder when Unpaid and not completed/cancelled
- ✅ Status guidance text when applicable (e.g. pending: assign provider soon)
- ✅ **Vehicle:** type and optional model
- ✅ Pickup and destination summary; optional **Open pickup in Maps** / **Open destination in Maps** (external links)
- ✅ **Requested** and **Last updated** with date and time
- ✅ **MWK** badge and numeric price only when `estimatedCost` is set; otherwise **Price not set yet** (no MWK badge)
- ✅ **Assigned driver** name (and phone if API provides it) when populated
- ✅ Action buttons visible when rules allow (Pay Now, Cancel)

For **Car Service** card:
- ✅ Service name from type (e.g. Oil Change) with wrench icon
- ✅ Same reference, badges, payment reminder, and status guidance pattern as towing where applicable
- ✅ **Vehicle** line; **Service Location**; **Open location in Maps**
- ✅ **Requested** / **Last updated** date-time
- ✅ **Preferred** date and time when provided at booking
- ✅ **Price not set yet** or **MWK** + amount when quoted
- ✅ **Assigned mechanic** when populated
- ✅ Action buttons

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 3.6: My Services card data (API + assignee fields)

**Purpose:** Confirm the backend returns the fields the My Services cards rely on (vehicle, location coordinates, assignees, timestamps). Run this **before** or **after** UI checks.

**Steps (curl — backend on port 5000):**
1. From the project root, run:
   ```bash
   chmod +x scripts/test-my-services-api.sh
   ./scripts/test-my-services-api.sh
   ```
2. Optional: override credentials or API base:
   ```bash
   API_URL=http://localhost:5000/api TEST_EMAIL=testuser@autotek.com TEST_PASSWORD=Test123456 ./scripts/test-my-services-api.sh
   ```

**Expected Results:**
- ✅ Login succeeds and a Bearer token is printed as OK
- ✅ Authenticated **GET /api/towing** returns `services` array (your user only); each item includes `vehicleType`, `vehicleModel`, `location` (with lat/lng/address), `destination` when applicable, `status`, `paymentStatus`, `updatedAt`, `estimatedCost` (or `price` in raw docs — UI uses `estimatedCost` after transform)
- ✅ When admin has assigned someone, `assignedDriver` is an object with `name` (and optionally `phone`), not only an id string
- ✅ Authenticated **GET /api/car-services** includes `vehicleType`, `vehicleModel`, `location`, `preferredDate` / `preferredTime` when set, `assignedMechanic` when populated, `updatedAt`, `estimatedCost`
- ✅ Unauthenticated **GET /api/towing** returns `services: []` (privacy)
- ✅ Optional: authenticated list responses may include `quoteMobilePhone`, `quoteWhatsAppPhone`, `quoteRequestSubmittedAt`, `quoteRequestNotes` after a quote request (Test 3.7)

**Frontend quick check (same session as Part 3):**
1. Open **My Services** after booking (Tests 2.3 / 2.5) or with seeded data.
2. Confirm cards show **Ref**, vehicle line, maps links open Google Maps in a new tab, **Price not set yet** / **Contact for quote** when no price, payment reminder when unpaid and priced, and **Last updated** changes after admin sets price (Part 8).

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 3.7: Contact for quote (customer)

**Purpose:** Verify the quote-request flow: modal, Malawi phone validation, and admin notification payload (email when `ADMIN_NOTIFICATION_EMAIL` or `SUPPORT_EMAIL` is set).

**Steps:**
1. On **My Services**, open a service with **no** quoted amount (`Price not set yet`).
2. Click **Contact for quote**.
3. Confirm the modal explains MWK quoting after confirmation and shows the **pricing accuracy** warning.
4. Leave **Mobile** empty or enter an invalid number (e.g. `12`); submit or tab away — expect **field-level** error text under the input (Malawi format: `+265` + 9 digits or `0` + 9 digits).
5. Enter a valid **Mobile**; check **WhatsApp number is the same as mobile** or enter a **separate valid** WhatsApp number.
6. Optionally add a short **Note for our team**; click **Send quote request**.
7. Expect a **success** notification with the server message (not a generic fallback).
8. Confirm the card shows **Quote request last sent** with a timestamp; you may submit again to update numbers.

**Backend (optional curl, before or after UI):**
```bash
TOKEN="<customer JWT>"
BASE="http://localhost:5000/api"
SID="<towing or car service id, no price yet>"
curl -s -w "\nHTTP:%{http_code}\n" -X POST "$BASE/towing/$SID/quote-request" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"mobilePhone":"0991234567","whatsAppPhone":"0991234567","quoteRequestNotes":"Test"}'
```
Use `/car-services/$SID/quote-request` for car services. Expect **HTTP 200** and a JSON `message`. Invalid phones expect **HTTP 400** with a specific `message`.

**Expected Results:**
- ✅ Modal validates phones with **clear, field-specific** copy before calling the API
- ✅ API errors (e.g. invalid phone) show the **backend `message`** in the toast when the request fails
- ✅ **200** response after valid submit; list/detail includes quote fields after refresh
- ✅ With email env configured, admin receives a quote-request email; otherwise dev logs show the request

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

## Part 4: Service Payment (5 Tests)

Run **Test 4.0 (curl)** before browser tests when validating backend changes. All amounts are **Malawi Kwacha (MWK)**; there is no dollar amount in the URL.

### Test 4.0: Backend – initiate payment with no quote (MWK) — curl

**Purpose:** Confirm `POST /api/payments/initiate` rejects service payments when `price` is unset (0), with the MWK / quote message.

**Steps:**
1. Ensure backend is running (e.g. `http://localhost:5000`).
2. Log in as a customer and obtain a Bearer token (same credentials as other API tests).
3. Create a towing request **without** a `price` (or use an existing service whose `estimatedCost` is null/0):
   ```bash
   TOKEN="<paste JWT>"
   BASE="http://localhost:5000/api"
   CREATE=$(curl -s -X POST "$BASE/towing" -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"pickupLocation":"Test Pickup","destination":"Test Destination"}')
   SID=$(echo "$CREATE" | jq -r '.service._id')
   curl -s -w "\nHTTP %{http_code}\n" -X POST "$BASE/payments/initiate" \
     -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     -d "{\"paymentMethod\":\"paychangu\",\"towingServiceId\":\"$SID\"}"
   ```
   (Repeat with `carServiceId` if you need the same check for car services.)

**Expected Results:**
- ✅ HTTP **400**
- ✅ JSON `message` includes that online payment in **Malawi Kwacha (MWK)** is available **after the quote is confirmed** (or equivalent product copy).

**Optional:** From the repo root, `./scripts/test-service-payment-mwk.sh` automates login + creates a zero-price towing if needed, then asserts **400** + MWK message on initiate.

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 4.1: Pay Now Button Visibility

**Purpose:** Verify Pay Now (MWK) shows only when online payment is allowed

**Steps:**
1. On /my-services page, check which services show **Pay Now (MWK)** (or equivalent label)
2. Note the payment status and whether a quoted **MWK** amount is shown

**Expected Results:**
- ✅ **Pay Now** visible only when payment is pending **and** an **MWK** amount is set (`estimatedCost` / quote > 0)
- ✅ **Contact for quote** button shown when there is no amount yet (separate from Pay Now); user sees copy that MWK payment is available after a price is set (Test 3.7 + Part 8)
- ✅ Button has distinctive color (blue/primary)
- ✅ Button shows for eligible pending and assigned services (when priced)
- ✅ Button hidden for cancelled services
- ✅ Button hidden for paid services

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 4.2: Navigate to Service Payment

**Purpose:** Verify payment flow navigation

**Steps:**
1. On /my-services page, click **Pay Now** on a service that has an MWK amount
2. Observe redirect

**Expected Results:**
- ✅ Redirects to `/service-payment` page
- ✅ URL includes **`towingServiceId` or `carServiceId`** only (amount comes from the loaded service, **not** the query string)
- ✅ Example: `/service-payment?towingServiceId=xxx` (no `amount=`)

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 4.3: Service Payment Page

**Purpose:** Verify service payment page displays correctly

**Steps:**
1. On `/service-payment` with a priced service id, examine the content
2. Optionally open the same page with a service id that has **no** quote yet (e.g. deep-link for regression)

**Expected Results:**
- ✅ Page title: "Pay for Service" (or current equivalent)
- ✅ When priced: total shown in **MWK**; **Proceed to Payment** enabled
- ✅ When not priced: clear state (e.g. gray panel) that quote is required; **Proceed** disabled — user cannot start PayChangu without an amount
- ✅ PayChangu logo/branding visible when flow is available
- ✅ Security assurance message when paying:
  - "Secure Payment"
  - "Your payment is processed securely through PayChangu..."
- ✅ "Back to My Services" link
- ✅ Payment method indicator (card, mobile money, bank)

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 4.4: Complete Service Payment

**Purpose:** Verify payment can be completed successfully

**Steps:**
1. On /service-payment page, click "Proceed to Payment"
2. Wait for redirect to PayChangu
3. On PayChangu test page:
   - Enter test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVV: Any 3 digits
   - OTP: `1234`
4. Complete payment
5. Wait for redirect back to AutoTek

**Expected Results:**
- ✅ Redirects to PayChangu checkout page
- ✅ Payment form loads correctly
- ✅ Test card accepted
- ✅ After payment, redirects to `/payment/success?tx_ref=xxx`
- ✅ Success page shows "Payment Successful" message
- ✅ Service payment status updates to "Paid"
- ✅ Can view updated service in /my-services
- ✅ Email confirmation sent (check console logs if in dev)

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

## Part 5: Service Cancellation (4 Tests)

### Test 5.1: Cancel Button Visibility

**Purpose:** Verify Cancel button shows only for cancellable services

**Steps:**
1. On /my-services page, check which services show "Cancel" button
2. Note the status of each service

**Expected Results:**
- ✅ "Cancel" button visible for services with status:
  - Pending
  - Assigned
- ✅ "Cancel" button HIDDEN for services with status:
  - In Progress
  - Completed
  - Cancelled
- ✅ Button has warning color (red/danger)
- ✅ Button shows for both paid and unpaid services (if status allows)

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 5.2: Cancel Service - Modal Confirmation

**Purpose:** Verify cancellation requires confirmation

**Steps:**
1. On /my-services page, click "Cancel" button on a pending service
2. Observe modal/dialog

**Expected Results:**
- ✅ Confirmation modal appears
- ✅ Modal shows:
  - Title: "Cancel Service?"
  - Warning message about cancellation being permanent
  - Refund policy notice (if paid): "Refunds are processed within 3-5 business days"
  - Service details summary
- ✅ Two buttons:
  - "Keep Service" (cancel action)
  - "Yes, Cancel Service" (confirm cancellation)
- ✅ Modal can be closed by clicking outside or "Keep Service"

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 5.3: Cancel Unpaid Service

**Purpose:** Verify unpaid service can be cancelled

**Steps:**
1. On /my-services page, find an UNPAID pending service
2. Click "Cancel" button
3. In confirmation modal, click "Yes, Cancel Service"
4. Wait for response

**Expected Results:**
- ✅ Loading state shows during cancellation
- ✅ Success notification appears
- ✅ Modal closes automatically
- ✅ Service card updates immediately:
  - Status changes to "Cancelled"
  - Status badge turns red/gray
  - "Pay Now" button disappears
  - "Cancel" button disappears
- ✅ Service remains visible in list
- ✅ Statistics update (Pending count decreases)

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 5.4: Cancel Paid Service with Refund

**Purpose:** Verify paid service cancellation triggers refund

**Steps:**
1. First, complete payment for a service (Test 4.4)
2. On /my-services page, find the PAID pending service
3. Click "Cancel" button
4. In confirmation modal:
   - Verify refund notice is shown
   - Click "Yes, Cancel Service"
5. Wait for response

**Expected Results:**
- ✅ Modal shows refund policy message
- ✅ Loading state shows during cancellation
- ✅ Success notification appears with refund information
- ✅ Service status changes to "Cancelled"
- ✅ Refund initiated (check console logs for refund API call)
- ✅ Notification mentions: "Refund will be processed within 3-5 business days"
- ✅ Service card shows cancelled status
- ✅ Statistics update (Total Spent may not change immediately)

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

## Part 6: Edge Cases & Error Handling (5 Tests)

### Test 6.1: Empty Services State

**Purpose:** Verify proper handling when user has no services

**Steps:**
1. Login with a new user account (or use admin account that has no services)
2. Navigate to /my-services
3. Observe the page

**Expected Results:**
- ✅ Empty state message displayed
- ✅ Friendly illustration or icon
- ✅ Message: "No services found" or similar
- ✅ Call-to-action: "Book a service" button/link
- ✅ Link redirects to /services or /book-service
- ✅ Statistics show all zeros

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 6.2: Service Booking Error Handling

**Purpose:** Verify error handling during service booking

**Steps:**
1. Stop the backend server temporarily: Kill process
2. Try to book a service
3. Restart backend server
4. Try booking again

**Expected Results:**
When backend is down:
- ✅ Error message appears
- ✅ User-friendly message: "Unable to connect to server" or similar
- ✅ Form stays filled (data not lost)
- ✅ Can retry submission

When backend is back up:
- ✅ Submission works successfully
- ✅ No need to re-enter data

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 6.3: Payment Cancellation

**Purpose:** Verify handling when user cancels payment

**Steps:**
1. Click "Pay Now" on a service
2. On /service-payment page, click "Proceed to Payment"
3. On PayChangu page, click "Cancel" or go back
4. Observe behavior

**Expected Results:**
- ✅ Redirected back to AutoTek
- ✅ Lands on `/payment/cancel` page
- ✅ Message explains payment was cancelled
- ✅ Service remains unpaid
- ✅ Can retry payment later
- ✅ "Try Again" or "Back to My Services" button available

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 6.4: Cannot Cancel In-Progress Service

**Purpose:** Verify in-progress services cannot be cancelled

**Steps:**
1. Using browser dev tools or database, manually change a service status to "in-progress"
2. Refresh /my-services page
3. Check if "Cancel" button is visible
4. If visible (shouldn't be), try clicking it

**Expected Results:**
- ✅ "Cancel" button NOT visible for in-progress services
- ✅ If attempting cancellation via API:
  - Error message: "Cannot cancel service that is already in progress"
  - Service status remains unchanged
- ✅ Message suggests contacting support instead

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 6.5: Service List API Privacy (Anonymous)

**Purpose:** Verify towing and car-service **list/detail** endpoints do not expose customer data without authentication (aligned with catalog-only public site).

**Steps:**
1. Ensure backend is running on `http://localhost:5000`
2. Without any `Authorization` header, run:
   - `curl -s http://localhost:5000/api/towing`
   - `curl -s http://localhost:5000/api/car-services`
3. Optionally, with a valid service id from the database (or create one while logged in), run:
   - `curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/towing/REPLACE_WITH_ID`
   - `curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/car-services/REPLACE_WITH_ID`

**Expected Results:**
- ✅ `GET /api/towing` with no token returns JSON with `services` array **empty** (`[]`), not all users requests
- ✅ `GET /api/car-services` with no token returns JSON with `services` array **empty** (`[]`)
- ✅ `GET /api/towing/:id` and `GET /api/car-services/:id` with no token return **401** and a message such as `Authentication required`
- ✅ With a **customer** Bearer token, list endpoints return **only that customer's** services; with an **admin** token, behavior matches admin tooling (admin UI uses separate admin endpoints where applicable)

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

## Part 7: Admin Guardrails (3 Tests)

### Test 7.1: Admin Blocked From Booking Page

**Purpose:** Verify admin users cannot access customer service booking flow

**Steps:**
1. Login as `admintest@autotek.com` / `Admin123456`
2. Navigate to `/book-service?service=towing`

**Expected Results:**
- ✅ Error toast appears indicating admin accounts cannot create customer service requests
- ✅ User is redirected to `/admin/dashboard`

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 7.2: Admin Blocked From Service Payment Page

**Purpose:** Verify admin users cannot pay for customer services

**Steps:**
1. Login as `admintest@autotek.com` / `Admin123456`
2. Navigate to `/service-payment?towingServiceId=test-id` (amount is not passed in the URL)

**Expected Results:**
- ✅ Error toast appears indicating admin accounts cannot make customer service payments
- ✅ User is redirected to `/admin/dashboard`

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 7.3: Admin API Guardrails (Backend)

**Purpose:** Verify backend rejects admin transactional requests even if UI is bypassed

**Steps:**
1. Use admin token with API client/curl
2. Attempt:
   - `POST /api/towing`
   - `POST /api/car-services`
   - `POST /api/payments/initiate`

**Expected Results:**
- ✅ All calls return `403 Forbidden`
- ✅ Error messages indicate admin accounts cannot perform customer transactions

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

## Part 8: Admin Service Pricing & Quote Requests (3 Tests)

Use **Admin**: `admintest@autotek.com` / `Admin123456`. Customer quote requests notify the inbox set in **`ADMIN_NOTIFICATION_EMAIL`** or **`SUPPORT_EMAIL`** (see backend env).

### Test 8.1: View quote request in admin modal

**Purpose:** After a customer sends **Contact for quote** (Test 3.7), admin can see contact details on the service.

**Steps:**
1. Login as admin; open **Admin → Services** (`/admin/services`).
2. Locate a service that has a quote request (or complete Test 3.7 first as the customer).
3. Click **View** on that row.

**Expected Results:**
- ✅ Section **Quote request (call to confirm before pricing)** shows **Submitted** time, **Mobile**, **WhatsApp**, and **Customer note** when provided
- ✅ **Service details** and **Payment information** still visible below

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 8.2: Set customer price (MWK) in admin

**Purpose:** Admin can save the quoted amount so the customer sees **MWK** and **Pay Now** on My Services.

**Steps:**
1. With the same service detail modal open (service not **cancelled**), find **Customer price (MWK)**.
2. Read the helper text (confirm by phone/WhatsApp before quoting).
3. Enter a whole number (e.g. `85000`) in **Amount (MWK)**; click **Save price**.
4. Confirm success notification mentions MWK and paying from My Services.
5. In the modal, **Current saved price** and **Payment information → Quoted price (MWK)** show the amount.
6. As the **customer**, open **My Services** and confirm **MWK** + amount and **Pay Now (MWK)** appear for that service.

**Expected Results:**
- ✅ **Save price** persists; no decimals required (integer MWK)
- ✅ Cancelled services: pricing block not shown / cannot set price (per UI)
- ✅ Customer UI updates after refresh (RTK cache invalidation)

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Test 8.3: Backend – admin PUT price (curl)

**Purpose:** Confirm admin can set `price` via API (same as the UI).

**Steps:**
1. Obtain **admin** JWT and a **towing** or **car** service `_id` (customer-owned, no price or updating price).
2. Towing example:
   ```bash
   ATOKEN="<admin JWT>"
   BASE="http://localhost:5000/api"
   SID="<service id>"
   curl -s -X PUT "$BASE/towing/$SID" \
     -H "Authorization: Bearer $ATOKEN" \
     -H "Content-Type: application/json" \
     -d '{"price":45000}'
   ```
3. Repeat with `/car-services/$SID` for a car service if needed.

**Expected Results:**
- ✅ **200** and response body includes `price: 45000` (or updated document)
- ✅ Non-admin token receives **403** on `PUT` (customers cannot set price via this route)

**Test Result:** [ ] Pass [ ] Fail
**Notes:**

---

### Roadmap Note: Live towing tracking (Post-deployment expansion)

**Current scope (now):**
- ✅ Structured location capture (town + landmark/custom description) for service booking
- ✅ Optional map pin capture (`Use my location`) to improve map precision

**Deferred scope (later):**
- ⏳ Real-time towing tracking (live truck movement on map) is planned **after deployment**.
- This needs dedicated driver location updates + realtime infrastructure, so it is intentionally out of MVP scope.

---

## Test Results Summary

### Overall Statistics

**Testing Date:** _________________
**Tester Name:** _________________
**Total Tests:** 36
**Tests Passed:** _____ / 36
**Tests Failed:** _____ / 36
**Pass Rate:** _____ %

### Results by Category

| Category | Total Tests | Passed | Failed | Pass Rate |
|----------|-------------|--------|--------|-----------|
| Part 1: Public Browsing | 3 | ___ | ___ | ___ % |
| Part 2: Service Booking | 6 | ___ | ___ | ___ % |
| Part 3: My Services | 7 | ___ | ___ | ___ % |
| Part 4: Service Payment | 5 | ___ | ___ | ___ % |
| Part 5: Cancellation | 4 | ___ | ___ | ___ % |
| Part 6: Edge Cases | 5 | ___ | ___ | ___ % |
| Part 7: Admin Guardrails | 3 | ___ | ___ | ___ % |
| Part 8: Admin Pricing & Quotes | 3 | ___ | ___ | ___ % |

### Critical Issues Found

List any critical bugs or issues that block core functionality:

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Minor Issues Found

List non-blocking issues or improvements:

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Recommendations

_______________________________________________
_______________________________________________
_______________________________________________

---

## Appendix: Service Status Lifecycle

```
NEW SERVICE
    ↓
PENDING (awaiting assignment)
    ↓
ASSIGNED (mechanic/driver assigned)
    ↓
IN_PROGRESS (work started)
    ↓
COMPLETED (work finished)

CANCELLATION:
- Can cancel: PENDING, ASSIGNED
- Cannot cancel: IN_PROGRESS, COMPLETED, CANCELLED
- Refund: Processed for paid services
```

## Appendix: Payment Status Flow

```
NEW SERVICE
    ↓
PENDING PAYMENT
    ↓
USER CLICKS "PAY NOW"
    ↓
REDIRECTS TO PAYCHANGU
    ↓
[PAYMENT COMPLETED] → PAID
    OR
[PAYMENT CANCELLED] → PENDING (can retry)
    OR
[PAYMENT FAILED] → FAILED (can retry)
```

---

**End of Testing Guide**
