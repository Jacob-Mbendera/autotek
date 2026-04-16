# AutoTek Image System - Testing Documentation

## Testing Session: April 16, 2026

### System Overview

**Components Implemented**:
- Backend: Cloudinary upload endpoints
- Frontend: OptimizedImage component
- Admin UI: Drag-drop upload interface
- 7 components displaying optimized images

**Git Commits**:
1. Phase 3 UI polish & accessibility (38d197c)
2. OptimizedImage integration (293469b)
3. IMAGE_UPLOAD_GUIDE.md (7b2da2c)
4. Cart component updates (4d5cd80)
5. OrderDetail & CompareProducts (977f3cc)
6. Drag-drop upload UI (d2cc13d)
7. Final documentation (2b8d7e0)

---

## Test Plan

### 1. Backend API Testing (cURL)

#### Test 1.1: Create Product with Image Upload
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -F "name=Test Brake Pads" \
  -F "description=High quality brake pads" \
  -F "category=Brake Parts" \
  -F "price=25000" \
  -F "stock=50" \
  -F "supplier=Bosch" \
  -F "images=@/path/to/brake-pad.jpg"
```

**Expected Result**:
- Status: 201 Created
- Response includes product with Cloudinary URLs in images array
- Images stored in autotek/products folder

#### Test 1.2: Update Product with New Images
```bash
curl -X PUT http://localhost:5000/api/products/<PRODUCT_ID> \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -F "name=Updated Brake Pads" \
  -F "price=27000" \
  -F "images=@/path/to/brake-pad-2.jpg"
```

**Expected Result**:
- Status: 200 OK
- New images added to existing array
- Old images preserved

#### Test 1.3: Get Products (Public)
```bash
curl http://localhost:5000/api/products
```

**Expected Result**:
- Status: 200 OK
- Products include images array with Cloudinary URLs

#### Test 1.4: Delete Product
```bash
curl -X DELETE http://localhost:5000/api/products/<PRODUCT_ID> \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Expected Result**:
- Status: 200 OK
- Product deleted from database
- Images deleted from Cloudinary

---

### 2. Frontend Component Testing

#### Test 2.1: ProductCard Component
**Location**: `/products`

**Test Steps**:
1. Navigate to products page
2. Verify images load with spinner
3. Check WebP format in Network tab
4. Verify lazy loading (images load on scroll)
5. Test image error fallback

**Expected Behavior**:
- Images show loading spinner initially
- Fade in smoothly when loaded
- WebP format served to supported browsers
- Fallback to JPG/PNG if needed
- Placeholder SVG if image fails

#### Test 2.2: ProductDetail Component
**Location**: `/products/:id`

**Test Steps**:
1. Click on any product
2. Verify main image loads with priority
3. Check thumbnail gallery
4. Click different thumbnails
5. Check responsive image sizes

**Expected Behavior**:
- Main image loads immediately (priority=true)
- Gallery thumbnails load on demand
- Correct srcSet for viewport size
- Smooth transitions between images

#### Test 2.3: Cart Component
**Location**: `/cart`

**Test Steps**:
1. Add products to cart
2. View cart page
3. Verify cart item images
4. Save item for later
5. Check saved items images

**Expected Behavior**:
- Cart item images: 150x150
- Saved items: 80x80
- No imageErrors state needed
- OptimizedImage handles all errors

#### Test 2.4: OrderDetail Component
**Location**: `/orders/:id`

**Test Steps**:
1. Create an order
2. View order details
3. Verify product images in order items

**Expected Behavior**:
- Order item images: 80x80
- Images load even if product deleted
- Fallback to placeholder if needed

#### Test 2.5: CompareProducts Component
**Location**: `/compare`

**Test Steps**:
1. Add 2-3 products to comparison
2. Navigate to compare page
3. Verify product images

**Expected Behavior**:
- Comparison images: 128x128
- All products show images
- Consistent loading states

---

### 3. Admin Upload UI Testing

#### Test 3.1: Drag-and-Drop Upload
**Location**: `/admin/products`

**Test Steps**:
1. Login as admin
2. Click "Add Product"
3. Drag image file over drop zone
4. Verify visual feedback
5. Drop file
6. Check file preview

**Expected Behavior**:
- Drop zone highlights on drag (teal border)
- Scale effect on hover
- File preview thumbnails appear
- File count displayed

#### Test 3.2: Click to Upload
**Test Steps**:
1. Click "Add Product"
2. Click drop zone
3. Select multiple images
4. Verify previews

**Expected Behavior**:
- File picker opens
- Multiple selection works
- Previews show all selected files
- Filename visible on hover

#### Test 3.3: File Type Filtering
**Test Steps**:
1. Try to upload PDF file
2. Try to upload video file
3. Only select image files

**Expected Behavior**:
- Non-image files filtered out
- Only images accepted
- Clear error messaging

#### Test 3.4: Create Product with Images
**Test Steps**:
1. Fill all product fields
2. Upload 2-3 images
3. Submit form
4. Verify Cloudinary upload

**Expected Behavior**:
- Form submits successfully
- Images upload to Cloudinary
- Product created with image URLs
- Redirect to products list

#### Test 3.5: Edit Product Images
**Test Steps**:
1. Click edit on existing product
2. View current images
3. Add new images
4. Update product

**Expected Behavior**:
- Current images displayed
- New images preview separately
- Both sets saved on update
- Old images preserved

---

### 4. Performance Testing

#### Test 4.1: Network Analysis
**Tools**: Chrome DevTools Network tab

**Metrics to Check**:
- Image format (WebP preferred)
- Image sizes (400w, 800w, 1200w)
- Lazy loading behavior
- Cache headers

**Expected Results**:
- WebP images served
- Appropriate size for viewport
- Images below fold lazy-loaded
- Cloudinary CDN headers present

#### Test 4.2: Lighthouse Audit
**Test Steps**:
1. Run Lighthouse on `/products`
2. Run Lighthouse on `/products/:id`
3. Check Performance score

**Target Scores**:
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 90
- SEO: > 90

#### Test 4.3: Bundle Size
**Test Steps**:
1. Check build output
2. Analyze chunk sizes
3. Verify code splitting

**Expected Results**:
- Main bundle < 400KB
- Lazy-loaded routes split
- OptimizedImage in main chunk

---

### 5. Accessibility Testing

#### Test 5.1: Keyboard Navigation
**Test Steps**:
1. Tab through products page
2. Test skip-to-main link
3. Navigate to product detail
4. Test image gallery with keyboard

**Expected Behavior**:
- All elements focusable
- Focus indicators visible (teal ring)
- Skip link works
- Images have alt text

#### Test 5.2: Screen Reader Testing
**Tool**: NVDA or VoiceOver

**Test Steps**:
1. Navigate products with screen reader
2. Listen to image alt descriptions
3. Test loading state announcements

**Expected Behavior**:
- Alt text read correctly
- Loading states announced
- Error states communicated

#### Test 5.3: Reduced Motion
**Test Steps**:
1. Enable "Reduce motion" in OS
2. Reload page
3. Verify animations disabled

**Expected Behavior**:
- Parallax effects disabled
- Transitions reduced to 0.01ms
- No motion sickness triggers

---

### 6. Error Handling Testing

#### Test 6.1: Image Load Failure
**Test Steps**:
1. Break image URL in database
2. View product
3. Verify fallback

**Expected Behavior**:
- Placeholder SVG shown
- No console errors
- Graceful degradation

#### Test 6.2: Upload Failure
**Test Steps**:
1. Disconnect from internet
2. Try to upload image
3. Check error message

**Expected Behavior**:
- Clear error notification
- Form not submitted
- Files retained for retry

#### Test 6.3: Large File Upload
**Test Steps**:
1. Try to upload 15MB image
2. Verify size limit

**Expected Behavior**:
- Server rejects file
- Clear error message
- File size guidance shown

---

### 7. Cross-Browser Testing

**Browsers to Test**:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**Test Cases**:
- WebP support and fallback
- Drag-and-drop functionality
- Image loading states
- Responsive images

**Expected Results**:
- WebP in supporting browsers
- Fallback to JPG/PNG in others
- Consistent behavior across browsers

---

### 8. Mobile Testing

**Devices to Test**:
- iPhone (iOS Safari)
- Android (Chrome)
- Tablet (iPad)

**Test Cases**:
- Touch-based image upload
- Responsive image sizes
- Lazy loading on mobile
- Performance on 3G

**Expected Results**:
- Appropriate image sizes served
- Fast loading on mobile
- Touch interactions work
- Good performance on slow networks

---

## Test Results Log

### Backend API Tests
- [ ] Create product with images
- [ ] Update product images
- [ ] Get products (public)
- [ ] Delete product

### Frontend Component Tests
- [ ] ProductCard optimized images
- [ ] ProductDetail main image + gallery
- [ ] Cart item images
- [ ] OrderDetail images
- [ ] CompareProducts images

### Admin UI Tests
- [ ] Drag-and-drop upload
- [ ] Click to upload
- [ ] File type filtering
- [ ] Create product with images
- [ ] Edit product images

### Performance Tests
- [ ] Network analysis (WebP, sizes)
- [ ] Lighthouse audit (> 90)
- [ ] Bundle size analysis

### Accessibility Tests
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Reduced motion support

### Error Handling Tests
- [ ] Image load failure
- [ ] Upload failure
- [ ] Large file rejection

### Cross-Browser Tests
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Mobile Tests
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Responsive images

---

## Known Issues

*To be filled during testing*

---

## Future Improvements

1. Image cropping before upload
2. Blur-up placeholders (LQIP)
3. Batch upload interface
4. Image compression settings
5. Replace Unsplash placeholders

---

**Testing Date**: April 16, 2026
**Tested By**: Development Team
**Status**: Ready for testing
