import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product';
import { uploadImage, deleteImage, extractPublicId } from '../config/cloudinary';
import { cleanupFile } from '../middleware/upload';
import { generateBlurDataUrl } from '../utils/imageBlurPlaceholder';
import { getImageUrl, moveImageToPrimary, normalizeProductImage } from '../utils/productImages';
import path from 'path';

// Extend Request type to include files
interface MulterRequest extends Request {
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      category,
      status,
      minPrice,
      maxPrice,
      search,
      stockStatus,
      page = '1',
      limit = '20',
      sortBy,
      sortOrder,
    } = req.query;

    const query: any = {};

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Stock status filter
    if (stockStatus && stockStatus !== 'all') {
      if (stockStatus === 'out-of-stock') {
        query.$or = [
          { status: 'out-of-stock' },
          { stock: 0 },
        ];
      } else if (stockStatus === 'low-stock') {
        query.stock = { $gt: 0, $lte: 10 };
        query.status = 'available';
      } else if (stockStatus === 'in-stock') {
        query.stock = { $gt: 10 };
        query.status = 'available';
      }
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    let sortObject: any = { createdAt: -1 }; // Default sort
    if (sortBy) {
      const validSortFields = ['price', 'name', 'createdAt'];
      if (validSortFields.includes(sortBy as string)) {
        const order = sortOrder === 'asc' ? 1 : sortOrder === 'desc' ? -1 : -1;
        sortObject = { [sortBy as string]: order };
      }
    }

    const products = await Product.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort(sortObject);

    const total = await Product.countDocuments(query);

    res.json({
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        pages: Math.ceil(total / limitNum), // Keep for backward compatibility
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch products' });
  }
};

export const getProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    res.json({ product });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch product' });
  }
};

export const createProduct = async (req: MulterRequest, res: Response): Promise<void> => {
  try {
    const { name, description, category, price, stock, supplier } = req.body;
    const uploadedEntries: { url: string; blurDataUrl: string }[] = [];

    // Handle image uploads if files are present
    if (req.files) {
      const files = Array.isArray(req.files) 
        ? req.files 
        : (typeof req.files === 'object' ? Object.values(req.files).flat() : []);
      const filePaths = files.map((file: Express.Multer.File) => path.join(process.cwd(), 'uploads', file.filename));

      try {
        const entries = await Promise.all(
          filePaths.map(async (filePath) => {
            const blurDataUrl = await generateBlurDataUrl(filePath);
            const result = await uploadImage(filePath, 'autotek/products');
            return { url: result.secure_url, blurDataUrl };
          })
        );
        uploadedEntries.push(...entries);

        // Clean up local files after upload
        filePaths.forEach((filePath) => cleanupFile(filePath));
      } catch (uploadError: any) {
        // Clean up local files on error
        filePaths.forEach((filePath) => cleanupFile(filePath));
        res.status(500).json({ message: `Image upload failed: ${uploadError.message}` });
        return;
      }
    }

    // If images are provided as URLs in request body, use those (no blur for URL-only entries)
    const imageUrlsRaw = req.body.images
      ? Array.isArray(req.body.images)
        ? req.body.images
        : [req.body.images]
      : [];
    const urlEntries = imageUrlsRaw.map((u: unknown) => normalizeProductImage(u));
    const allImages = [...uploadedEntries, ...urlEntries];

    const product = new Product({
      name,
      description,
      category,
      price: Number(price),
      stock: Number(stock) || 0,
      supplier,
      images: allImages,
    });

    await product.save();
    res.status(201).json(product);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create product' });
  }
};

export const updateProduct = async (req: MulterRequest, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    const uploadedEntries: { url: string; blurDataUrl: string }[] = [];
    const imagesToDelete: string[] = [];

    // Handle new image uploads if files are present
    if (req.files) {
      const files = Array.isArray(req.files) 
        ? req.files 
        : (typeof req.files === 'object' ? Object.values(req.files).flat() : []);
      const filePaths = files.map((file: Express.Multer.File) => path.join(process.cwd(), 'uploads', file.filename));

      try {
        const entries = await Promise.all(
          filePaths.map(async (filePath) => {
            const blurDataUrl = await generateBlurDataUrl(filePath);
            const result = await uploadImage(filePath, 'autotek/products');
            return { url: result.secure_url, blurDataUrl };
          })
        );
        uploadedEntries.push(...entries);

        // Clean up local files after upload
        filePaths.forEach((filePath) => cleanupFile(filePath));
      } catch (uploadError: any) {
        // Clean up local files on error
        filePaths.forEach((filePath) => cleanupFile(filePath));
        res.status(500).json({ message: `Image upload failed: ${uploadError.message}` });
        return;
      }
    }

    // Handle image deletion if imagesToDelete is provided
    if (req.body.imagesToDelete && Array.isArray(req.body.imagesToDelete)) {
      imagesToDelete.push(...req.body.imagesToDelete);
    }

    // Delete old images from Cloudinary
    for (const imageUrl of imagesToDelete) {
      const publicId = extractPublicId(imageUrl);
      if (publicId) {
        try {
          await deleteImage(publicId);
        } catch (error) {
          console.error(`Failed to delete image ${publicId}:`, error);
        }
      }
    }

    // Update images array
    let updatedImages: unknown[] = product.images.filter(
      (img) => !imagesToDelete.includes(getImageUrl(img))
    );

    // Add new uploaded images
    if (uploadedEntries.length > 0) {
      updatedImages = [...updatedImages, ...uploadedEntries];
    }

    // If images are provided in request body, replace with normalized entries
    if (req.body.images !== undefined && req.body.images !== null) {
      let bodyImages: unknown = req.body.images;
      if (typeof bodyImages === 'string') {
        try {
          bodyImages = JSON.parse(bodyImages) as unknown;
        } catch {
          bodyImages = [bodyImages];
        }
      }
      if (Array.isArray(bodyImages)) {
        updatedImages = bodyImages.map((item: unknown) => normalizeProductImage(item));
      }
    }

    // Update product
    const updateData: any = { ...req.body };
    if (uploadedEntries.length > 0 || imagesToDelete.length > 0) {
      updateData.images = updatedImages;
    }

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json(updatedProduct);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update product' });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    // Delete images from Cloudinary
    if (product.images && product.images.length > 0) {
      for (const imageEntry of product.images) {
        const publicId = extractPublicId(getImageUrl(imageEntry));
        if (publicId) {
          try {
            await deleteImage(publicId);
          } catch (error) {
            console.error(`Failed to delete image ${publicId}:`, error);
          }
        }
      }
    }

    // Delete product from database
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to delete product' });
  }
};

const MAX_IMAGES_PER_PRODUCT = 30;

/**
 * POST /api/products/:id/assign-media
 * Body: { "assets": [{ "url": "...", "blurDataUrl"?: "..." }] }
 * Appends normalized images; dedupes by URL; max 30 images per product.
 */
export const assignMediaToProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      res.status(400).json({ message: 'Invalid product id' });
      return;
    }

    const raw = (req.body as { assets?: unknown }).assets;
    if (!Array.isArray(raw) || raw.length === 0) {
      res.status(400).json({ message: 'Request body must include a non-empty "assets" array' });
      return;
    }

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    const current = (product.images || []).map((img) => normalizeProductImage(img));
    const existingUrls = new Set(current.map((e) => e.url).filter(Boolean));

    const toAdd: { url: string; blurDataUrl?: string }[] = [];
    for (const item of raw) {
      const normalized = normalizeProductImage(item);
      if (!normalized.url) continue;
      if (existingUrls.has(normalized.url)) continue;
      existingUrls.add(normalized.url);
      toAdd.push(normalized);
    }

    if (toAdd.length === 0) {
      res.status(400).json({ message: 'No new images to add (empty or all duplicates)' });
      return;
    }

    const combined = [...current, ...toAdd];
    if (combined.length > MAX_IMAGES_PER_PRODUCT) {
      res.status(400).json({
        message: `Cannot assign: product would exceed ${MAX_IMAGES_PER_PRODUCT} images (currently ${current.length}, adding ${toAdd.length})`,
      });
      return;
    }

    product.set('images', combined);
    await product.save();

    res.json({ product });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to assign media';
    res.status(500).json({ message });
  }
};

/**
 * PATCH /api/products/:id/primary-image
 * Body: { "url": "https://..." }
 * Moves the matching image to index 0 (cover / primary).
 */
export const setPrimaryProductImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      res.status(400).json({ message: 'Invalid product id' });
      return;
    }

    const url =
      typeof (req.body as { url?: unknown }).url === 'string'
        ? (req.body as { url: string }).url.trim()
        : '';
    if (!url) {
      res.status(400).json({ message: 'Request body must include a non-empty "url" string' });
      return;
    }

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    let reordered;
    try {
      reordered = moveImageToPrimary(product.images || [], url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid image URL';
      res.status(400).json({ message });
      return;
    }

    product.set('images', reordered);
    await product.save();

    res.json({ product });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to set primary image';
    res.status(500).json({ message });
  }
};

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Product.distinct('category');
    
    // Get product count for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const count = await Product.countDocuments({ category, status: 'available' });
        return { name: category, count };
      })
    );
    
    res.json({ categories: categoriesWithCounts });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch categories' });
  }
};
