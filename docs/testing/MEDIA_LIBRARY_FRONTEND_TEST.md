# Media library — frontend test guide (step by step)

Use this when testing the **admin shared media library** and **assigning images to a product** in the shop admin UI.

## Prerequisites

1. **Backend** running: `http://localhost:5000` (e.g. `cd backend && npm run dev`).
2. **Frontend** running: `http://localhost:5173` (e.g. `cd frontend && npm run dev`).
3. **Browser DevTools** open: **Network** and **Console** (F12).
4. You need an **admin** account. Log in with that user.

---

## Part A — Open the right screen

1. In the browser, go to: `http://localhost:5173/admin/products`  
   (or use the **Admin** entry in the header, then open **Products** if your nav uses that path).

2. Confirm the **Product Management** page loads and the product table (or empty state) appears with no red errors in the **Console**.

---

## Part B — Add images to the shared library (no product id required)

1. Click **Add Product** (or open **Edit** on an existing product — the media library block is inside the same modal).  
2. Scroll to the **Media library** section (heading **Media library** and short help text).  
3. Click **Upload to library**.  
4. Pick one or more image files (JPEG, PNG, WebP, or GIF; within your upload size limit).  
5. **Expected:**  
   - A toast about the upload result (e.g. how many succeeded / failed).  
   - After a short moment, **thumbnails** appear in the grid below (or after you search/refresh the page in the library list).  
6. In **Search library**, type part of a filename (or a fragment of a URL) and wait a moment (search is debounced).  
7. **Expected:** the grid updates to match; use **Prev** / **Next** if you have more than one page of results.

**Network checks (optional):**  
- `POST /api/admin/media-assets` with multipart `files` — **200** and JSON with `summary` and `results`.

---

## Part C — Assign library images to a product (editing only)

**Important:** **Assign** only works when you are **editing an existing product** (the product must already be saved and have a real `_id`). For new products, the UI shows a note: save the product first.

1. **Close** the modal if it is open (Cancel or X).  
2. In the product table, click **Edit** (pencil) on a product you want to test.  
3. Scroll to **Media library** again.  
4. **Click** thumbnails in the grid to **select** them. Selected items show a **teal border** and a small check indicator.  
5. Click **Assign selected (N)** where **N** is the number of selected images.  
6. **Expected:**  
   - Success toast: e.g. “Selected images assigned to this product.”  
   - The **Current images** area above (in the same modal) should show the new images after assignment (or after the list refreshes from the server).  
7. Click **Update Product** if you also changed other fields; if you only assigned images, the assign call already persisted images — you can still click **Update Product** or close and reopen **Edit** to confirm.

**Network checks (optional):**  
- `POST /api/products/<productId>/assign-media` with JSON body `{ "assets": [ { "url", "blurDataUrl?" }, ... ] }` — **200** and a `product` object in the response.

---

## Part D — Negative and edge cases (quick)

| Step | What to do | What you should see |
|------|------------|----------------------|
| 1 | Open **Add Product** (new product) and look at **Assign** | **Assign** should be **disabled** until a product is saved; helper text about saving first may appear. |
| 2 | **Edit** a product, select an image, assign, then try to assign the **same** image again in a second batch | May error or no-op (duplicates are rejected on the server). |
| 3 | Upload a non-image file to **Upload to library** (if the file picker allows it) | Rejection / error path (e.g. **400** from the API) and a clear message or toast. |

---

## Part E — What “pass” looks like

- [ ] You can **upload** to the library and see **thumbnails** in the grid.  
- [ ] **Search** and **pagination** change what you see without console errors.  
- [ ] On **Edit product**, you can **select** one or more thumbnails and **Assign** them.  
- [ ] The product’s **current images** reflect the assignment.  
- [ ] No uncaught errors in the **Console**; failed API calls show a sensible **toast** or message.

---

## If something fails

Write down:

1. The **URL** in the address bar.  
2. The **failing request** in the Network tab (name, status, response body snippet).  
3. One line from the **Console** (if any).

That is enough to debug the next change.

---

## API reference (for cross-checking)

- List library: `GET /api/admin/media-assets?q=&page=&limit=` (admin JWT).  
- Upload to library: `POST /api/admin/media-assets` — field name **`files`** (multipart).  
- Assign: `POST /api/products/:id/assign-media` — JSON `{ "assets": [ { "url", "blurDataUrl?" } ] }` (admin JWT).

Longer **curl** examples: see **Admin media library API** in [IMAGE_SYSTEM_TESTING.md](../images/IMAGE_SYSTEM_TESTING.md).
