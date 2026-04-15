# AutoTek Image Upload System - Complete Guide

## Overview

AutoTek uses Cloudinary for cloud-based image storage and the OptimizedImage component for automatic WebP conversion and responsive image delivery.

---

## System Architecture

### Backend (Cloudinary Storage)
- **Storage Location**: `autotek/products` folder in Cloudinary
- **Upload Handler**: `backend/src/controllers/productController.ts`
- **Image Utilities**: `backend/src/config/cloudinary.ts`
- **Data Model**: URLs stored in Product model `images` array

### Frontend (Optimized Display)
- **OptimizedImage Component**: `frontend/src/components/ui/OptimizedImage.tsx`
- **Upload UI**: Admin Products page (`frontend/src/pages/admin/Products.tsx`)
- **Display Components**: ProductCard, ProductDetail, Cart, etc.

---

## How to Upload Product Images

### Step 1: Access Admin Panel
1. Login as admin user
2. Navigate to `/admin/products`
3. Click "Add Product" button

### Step 2: Fill Product Details
1. Enter product name, description, category
2. Set price and stock quantity
3. Select status (Available/Out of Stock)

### Step 3: Upload Images
1. Scroll to "Images (Optional)" section
2. Click "Choose images" button
3. Select one or multiple image files (JPG, PNG, WebP)
4. You'll see "X file(s) selected" confirmation

### Step 4: Create Product
1. Click "Create Product" button
2. Images are automatically uploaded to Cloudinary
3. Cloudinary URLs are saved in database
4. Product appears in listing with images

### Editing Existing Images
1. Click Edit button on any product
2. Current images are displayed as thumbnails
3. Select new images to ADD to existing ones
4. Click "Update Product" to save

---

## Technical Implementation

### Upload Flow

```
User selects images
    ↓
Admin UI updates formData.images (File[])
    ↓
Form submits to RTK Query mutation
    ↓
API converts to FormData
    ↓
Backend receives multipart/form-data
    ↓
Files saved temporarily to /uploads
    ↓
Cloudinary upload (autotek/products folder)
    ↓
Cloudinary returns secure_url
    ↓
URLs stored in Product.images array
    ↓
Temporary files deleted
```

### Display Flow

```
Product loaded from API
    ↓
ProductCard/ProductDetail renders
    ↓
OptimizedImage component receives URL
    ↓
Component checks if external (Unsplash) or Cloudinary
    ↓
For Cloudinary: Generates WebP variants
    ↓
Renders <picture> with responsive srcSet
    ↓
Browser selects optimal image size
    ↓
Lazy loading (unless priority=true)
```

---

## Code Examples

### 1. Uploading Images (Admin UI)

```tsx
// User selects files
const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files) {
    setFormData({ ...formData, images: Array.from(e.target.files) });
  }
};

// Form submission
const productData = {
  name: formData.name,
  // ... other fields
  images: formData.images.length > 0 ? formData.images : undefined,
};

await createProduct(productData).unwrap();
```

### 2. API Layer (Automatic FormData Conversion)

```typescript
// frontend/src/store/api/productApi.ts
createProduct: builder.mutation({
  query: (body) => {
    const formData = new FormData();

    Object.keys(body).forEach((key) => {
      if (key === 'images' && body.images) {
        // Append each image file
        body.images.forEach((file) => {
          formData.append('images', file);
        });
      } else {
        formData.append(key, String(body[key]));
      }
    });

    return {
      url: '/products',
      method: 'POST',
      body: formData, // Sent as multipart/form-data
    };
  },
})
```

### 3. Backend Processing

```typescript
// backend/src/controllers/productController.ts
export const createProduct = async (req: MulterRequest, res: Response) => {
  const uploadedImages: string[] = [];

  if (req.files) {
    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    const filePaths = files.map((file) => path.join(process.cwd(), 'uploads', file.filename));

    // Upload to Cloudinary
    const uploadResults = await uploadMultipleImages(filePaths, 'autotek/products');
    uploadedImages.push(...uploadResults.map((result) => result.secure_url));

    // Clean up temporary files
    filePaths.forEach((filePath) => cleanupFile(filePath));
  }

  const product = new Product({
    // ... other fields
    images: uploadedImages, // Store Cloudinary URLs
  });

  await product.save();
  res.status(201).json(product);
};
```

### 4. Displaying Images (Frontend)

```tsx
import { OptimizedImage } from './components/ui/OptimizedImage';

// In ProductCard
<OptimizedImage
  src={product.images[0]}
  alt={product.name}
  width={400}
  height={400}
  className="w-full h-56 object-cover"
  priority={false}  // Lazy load
/>

// In ProductDetail (main image)
<OptimizedImage
  src={currentImage}
  alt={product.name}
  width={800}
  height={500}
  className="w-full h-[500px] object-cover"
  priority={true}  // Eager load (above fold)
/>
```

---

## OptimizedImage Component Features

### Automatic WebP Conversion
- Detects local vs external images
- Generates WebP srcSet for local images
- Fallback to original format if WebP unsupported

### Responsive Images
```html
<picture>
  <source type="image/webp" srcSet="
    /images/product-400w.webp 400w,
    /images/product-800w.webp 800w,
    /images/product-1200w.webp 1200w
  " sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px" />
  <img src="/images/product.jpg" alt="Product" />
</picture>
```

### Loading States
- Animated spinner while loading
- Smooth fade-in transition
- Error fallback with placeholder SVG

### External Image Handling
```typescript
// Detects Unsplash, Cloudinary external URLs
if (src.startsWith('http://') || src.startsWith('https://')) {
  return { isExternal: true, original: src };
}
```

---

## Environment Variables Required

```bash
# .env file
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## File Structure

```
autotek/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── cloudinary.ts          # Cloudinary config & utilities
│   │   ├── controllers/
│   │   │   └── productController.ts   # Upload handling
│   │   ├── middleware/
│   │   │   └── upload.ts              # Multer config
│   │   └── models/
│   │       └── Product.ts             # images: string[] array
│   └── uploads/                       # Temporary storage (gitignored)
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   └── OptimizedImage.tsx # Display component
│   │   │   └── ProductCard.tsx        # Uses OptimizedImage
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   │   └── Products.tsx       # Upload UI
│   │   │   └── ProductDetail.tsx      # Uses OptimizedImage
│   │   └── store/
│   │       └── api/
│   │           └── productApi.ts      # FormData conversion
│   └── public/
│       └── images/                    # Local images (if any)
│
└── scripts/
    └── optimize-images.js             # Optional: Pre-optimize local images
```

---

## Testing Checklist

### Upload Testing
- [ ] Upload single image (JPG)
- [ ] Upload multiple images (PNG, JPG, WebP)
- [ ] Verify Cloudinary storage (check dashboard)
- [ ] Check database for secure_url values
- [ ] Edit product and add more images
- [ ] Delete product and verify Cloudinary cleanup

### Display Testing
- [ ] Product card shows first image
- [ ] Product detail shows all images
- [ ] Image gallery navigation works
- [ ] Images load with spinner
- [ ] Error fallback works for broken URLs
- [ ] Lazy loading works (check Network tab)
- [ ] WebP format served (check Network tab)

### Performance Testing
- [ ] Lighthouse score > 90
- [ ] Images use WebP format
- [ ] Correct image sizes loaded (400w on mobile, etc.)
- [ ] No layout shift during image load
- [ ] Lazy loading reduces initial bundle

---

## Troubleshooting

### Images not uploading
1. Check Cloudinary credentials in `.env`
2. Verify `uploads/` directory exists
3. Check file size limits (default: 10MB)
4. Check network tab for 413 errors

### Images not displaying
1. Check browser console for errors
2. Verify Cloudinary URLs in database
3. Check CORS settings in Cloudinary
4. Verify CSP headers allow Cloudinary domain

### Slow image loading
1. Use OptimizedImage component
2. Set appropriate priority prop
3. Check Cloudinary transformation settings
4. Verify CDN caching is enabled

---

## Future Enhancements

### Planned Features
1. **Image Optimization Script**: Batch convert local images to WebP
2. **Drag-and-Drop Upload**: Enhanced UX for admin panel
3. **Image Cropping**: Allow admins to crop/resize before upload
4. **Bulk Upload**: Upload multiple products' images at once
5. **Image Compression**: Automatic quality optimization
6. **Alt Text Management**: SEO-friendly alt attributes

### Performance Optimizations
1. Implement image CDN caching headers
2. Add blur-up placeholder (LQIP)
3. Implement progressive image loading
4. Add image sprite sheets for small icons

---

## Additional Resources

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [WebP Format Guide](https://developers.google.com/speed/webp)
- [Responsive Images](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images)
- [React Image Optimization](https://web.dev/optimize-images/)

---

**Last Updated**: April 16, 2026
**Maintained By**: Development Team
