import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product';
import { uploadImage, deleteImage, extractPublicId } from '../config/cloudinary';
import { cleanupFile } from '../middleware/upload';
import { generateBlurDataUrl } from '../utils/imageBlurPlaceholder';
import { getImageUrl, moveImageToPrimary, normalizeProductImage } from '../utils/productImages';
import path from 'path';
import type {
  ProductCompatibilityEntry,
  ProductFitmentStatus,
} from '../../../shared/types';
import { buildVehicleFitmentMongoFilter, rankCatalogProductSuggestions } from '../../../shared/utils/productFitmentMatch';
import type { CatalogSuggestionCandidate } from '../../../shared/utils/productFitmentMatch';
import { escapeRegex } from '../../../shared/utils/regex';

// Extend Request type to include files
interface MulterRequest extends Request {
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

const FITMENT_STATUSES: ProductFitmentStatus[] = ['none', 'partial', 'verified'];
const MAX_COMPATIBILITY_ENTRIES = 50;
const MAX_ALTERNATE_PART_NUMBERS = 50;

const getUploadedFiles = (req: MulterRequest): Express.Multer.File[] => {
  if (!req.files) return [];
  return Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
};

const cleanupUploadedFiles = (req: MulterRequest): void => {
  getUploadedFiles(req).forEach((file) =>
    cleanupFile(path.join(process.cwd(), 'uploads', file.filename))
  );
};

const parseArrayField = (value: unknown, fieldName: string): unknown[] => {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be an array`);
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch {
    if (fieldName === 'alternatePartNumbers') {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
    throw new Error(`${fieldName} must be a valid JSON array`);
  }
};

const parseBooleanField = (value: unknown, fieldName: string): boolean => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${fieldName} must be true or false`);
};

const optionalTrimmedString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed || undefined;
};

const parseOptionalYear = (value: unknown, fieldName: string): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    throw new Error(`${fieldName} must be a whole year between 1900 and 2100`);
  }
  return year;
};

const parseCompatibility = (value: unknown): ProductCompatibilityEntry[] =>
  parseArrayField(value, 'compatibility').map((raw, index, entries) => {
    if (entries.length > MAX_COMPATIBILITY_ENTRIES) {
      throw new Error(`A product can have at most ${MAX_COMPATIBILITY_ENTRIES} compatibility entries`);
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error(`Compatibility entry ${index + 1} must be an object`);
    }

    const entry = raw as Record<string, unknown>;
    const make = optionalTrimmedString(entry.make);
    const model = optionalTrimmedString(entry.model);
    if (!make || !model) {
      throw new Error(`Compatibility entry ${index + 1} requires both make and model`);
    }
    if (make.length > 100 || model.length > 100) {
      throw new Error(`Compatibility entry ${index + 1} make and model must be 100 characters or fewer`);
    }

    const yearFrom = parseOptionalYear(entry.yearFrom, `Compatibility entry ${index + 1} yearFrom`);
    const yearTo = parseOptionalYear(entry.yearTo, `Compatibility entry ${index + 1} yearTo`);
    if (yearFrom && yearTo && yearFrom > yearTo) {
      throw new Error(`Compatibility entry ${index + 1} yearFrom cannot be after yearTo`);
    }

    const engine = optionalTrimmedString(entry.engine);
    const notes = optionalTrimmedString(entry.notes);
    if (engine && engine.length > 100) {
      throw new Error(`Compatibility entry ${index + 1} engine must be 100 characters or fewer`);
    }
    if (notes && notes.length > 500) {
      throw new Error(`Compatibility entry ${index + 1} notes must be 500 characters or fewer`);
    }

    return {
      make,
      model,
      yearFrom,
      yearTo,
      engine,
      notes,
    };
  });

const parseFitmentFields = (
  body: Record<string, unknown>,
  existing?: {
    isUniversal: boolean;
    compatibility: ProductCompatibilityEntry[];
    fitmentStatus: ProductFitmentStatus;
  }
): Record<string, unknown> => {
  const updates: Record<string, unknown> = {};
  const isUniversal =
    body.isUniversal !== undefined
      ? parseBooleanField(body.isUniversal, 'isUniversal')
      : existing?.isUniversal ?? false;
  const compatibility =
    body.compatibility !== undefined
      ? parseCompatibility(body.compatibility)
      : existing?.compatibility ?? [];
  const rawFitmentStatus =
    body.fitmentStatus !== undefined ? String(body.fitmentStatus) : existing?.fitmentStatus ?? 'none';

  if (!FITMENT_STATUSES.includes(rawFitmentStatus as ProductFitmentStatus)) {
    throw new Error('fitmentStatus must be none, partial, or verified');
  }
  const fitmentStatus = rawFitmentStatus as ProductFitmentStatus;

  if (!isUniversal && compatibility.length === 0 && fitmentStatus !== 'none') {
    throw new Error('A vehicle-specific product needs compatibility entries before fitment can be marked');
  }
  if (!isUniversal && compatibility.length > 0 && fitmentStatus === 'none') {
    throw new Error('Products with compatibility entries must use partial or verified fitment status');
  }

  if (body.isUniversal !== undefined || !existing) updates.isUniversal = isUniversal;
  if (body.compatibility !== undefined || !existing || isUniversal) {
    updates.compatibility = isUniversal ? [] : compatibility;
  }
  if (body.fitmentStatus !== undefined || !existing) updates.fitmentStatus = fitmentStatus;

  if (body.brand !== undefined) updates.brand = optionalTrimmedString(body.brand);
  if (body.oemPartNumber !== undefined) {
    updates.oemPartNumber = optionalTrimmedString(body.oemPartNumber);
  }
  if (body.alternatePartNumbers !== undefined) {
    const alternatePartNumbers = [
      ...new Set(
        parseArrayField(body.alternatePartNumbers, 'alternatePartNumbers')
          .map(optionalTrimmedString)
          .filter((item): item is string => Boolean(item))
      ),
    ];
    if (alternatePartNumbers.length > MAX_ALTERNATE_PART_NUMBERS) {
      throw new Error(`A product can have at most ${MAX_ALTERNATE_PART_NUMBERS} alternate part numbers`);
    }
    if (alternatePartNumbers.some((partNumber) => partNumber.length > 100)) {
      throw new Error('Alternate part numbers must be 100 characters or fewer');
    }
    updates.alternatePartNumbers = alternatePartNumbers;
  }

  return updates;
};

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
      missingImages,
      make,
      model,
      year,
      engine,
      includeUniversal,
    } = req.query;

    const query: any = {};
    const andConditions: Record<string, unknown>[] = [];

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
      const safeSearch = escapeRegex(String(search));
      andConditions.push({
        $or: [
          { name: { $regex: safeSearch, $options: 'i' } },
          { description: { $regex: safeSearch, $options: 'i' } },
          { brand: { $regex: safeSearch, $options: 'i' } },
          { oemPartNumber: { $regex: safeSearch, $options: 'i' } },
          { alternatePartNumbers: { $regex: safeSearch, $options: 'i' } },
        ],
      });
    }

    // Stock status filter
    if (stockStatus && stockStatus !== 'all') {
      if (stockStatus === 'out-of-stock') {
        andConditions.push({
          $or: [{ status: 'out-of-stock' }, { stock: 0 }],
        });
      } else if (stockStatus === 'low-stock') {
        query.stock = { $gt: 0, $lte: 10 };
        query.status = 'available';
      } else if (stockStatus === 'in-stock') {
        query.stock = { $gt: 10 };
        query.status = 'available';
      }
    }

    const vehicleYear =
      typeof year === 'string' && year.trim() !== '' ? Number(year) : undefined;
    const vehicleFilter = buildVehicleFitmentMongoFilter({
      make: typeof make === 'string' ? make : '',
      model: typeof model === 'string' ? model : '',
      year: Number.isInteger(vehicleYear) ? vehicleYear : undefined,
      engine: typeof engine === 'string' ? engine : undefined,
      includeUniversal:
        includeUniversal === undefined
          ? true
          : String(includeUniversal) !== 'false',
    });
    if (vehicleFilter) {
      andConditions.push(vehicleFilter);
    }

    if (andConditions.length === 1) {
      Object.assign(query, andConditions[0]);
    } else if (andConditions.length > 1) {
      query.$and = andConditions;
    }

    if (missingImages === 'true') {
      query.$expr = {
        $eq: [
          {
            $size: {
              $filter: {
                input: { $ifNull: ['$images', []] },
                as: 'img',
                cond: {
                  $cond: {
                    if: { $eq: [{ $type: '$$img' }, 'string'] },
                    then: { $gt: [{ $strLenCP: '$$img' }, 0] },
                    else: {
                      $gt: [
                        { $strLenCP: { $ifNull: ['$$img.url', ''] } },
                        0,
                      ],
                    },
                  },
                },
              },
            },
          },
          0,
        ],
      };
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
    let fitmentFields: Record<string, unknown>;

    try {
      fitmentFields = parseFitmentFields(req.body as Record<string, unknown>);
    } catch (error: unknown) {
      cleanupUploadedFiles(req);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Invalid product fitment data',
      });
      return;
    }

    // Handle image uploads if files are present
    if (req.files) {
      const files = getUploadedFiles(req);
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
      status: req.body.status,
      images: allImages,
      ...fitmentFields,
    });

    await product.save();
    res.status(201).json({ product });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create product' });
  }
};

export const updateProduct = async (req: MulterRequest, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      cleanupUploadedFiles(req);
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    const uploadedEntries: { url: string; blurDataUrl: string }[] = [];
    const imagesToDelete: string[] = [];
    let fitmentFields: Record<string, unknown>;

    try {
      fitmentFields = parseFitmentFields(req.body as Record<string, unknown>, {
        isUniversal: product.isUniversal,
        compatibility: product.compatibility,
        fitmentStatus: product.fitmentStatus,
      });
    } catch (error: unknown) {
      cleanupUploadedFiles(req);
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Invalid product fitment data',
      });
      return;
    }

    // Handle new image uploads if files are present
    if (req.files) {
      const files = getUploadedFiles(req);
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

    // Whitelist updatable fields — do not spread raw multipart body.
    const updateData: Record<string, unknown> = { ...fitmentFields };
    if (req.body.name !== undefined) updateData.name = String(req.body.name).trim();
    if (req.body.description !== undefined) {
      updateData.description = String(req.body.description).trim();
    }
    if (req.body.category !== undefined) updateData.category = String(req.body.category).trim();
    if (req.body.price !== undefined) updateData.price = Number(req.body.price);
    if (req.body.stock !== undefined) updateData.stock = Number(req.body.stock);
    if (req.body.supplier !== undefined) {
      updateData.supplier = optionalTrimmedString(req.body.supplier);
    }
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.badge !== undefined) updateData.badge = req.body.badge;
    if (
      uploadedEntries.length > 0 ||
      imagesToDelete.length > 0 ||
      (req.body.images !== undefined && req.body.images !== null)
    ) {
      updateData.images = updatedImages;
    }

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json({ product: updatedProduct });
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

/**
 * GET /api/products/suggestions
 * Assistive catalog matches for part requests (vehicle + part name/number).
 */
export const getProductSuggestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const make = typeof req.query.make === 'string' ? req.query.make.trim() : '';
    const model = typeof req.query.model === 'string' ? req.query.model.trim() : '';
    const engine = typeof req.query.engine === 'string' ? req.query.engine.trim() : '';
    const productName =
      typeof req.query.productName === 'string' ? req.query.productName.trim() : '';
    const partNumber =
      typeof req.query.partNumber === 'string' ? req.query.partNumber.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const yearRaw = typeof req.query.year === 'string' ? Number(req.query.year) : undefined;
    const year = Number.isInteger(yearRaw) ? yearRaw : undefined;
    const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : 5;
    const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 1), 10) : 5;

    if (!make && !model && !partNumber && !productName) {
      res.status(400).json({
        message: 'Provide a vehicle (make/model) and/or part number or part name to suggest products',
      });
      return;
    }

    const orBranches: Record<string, unknown>[] = [];
    const vehicleFilter = buildVehicleFitmentMongoFilter({
      make,
      model,
      year,
      engine: engine || undefined,
      includeUniversal: true,
    });
    if (vehicleFilter) orBranches.push(vehicleFilter);

    if (partNumber) {
      const partRegex = new RegExp(partNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      orBranches.push(
        { oemPartNumber: partRegex },
        { alternatePartNumbers: partRegex }
      );
    }

    if (productName) {
      const nameRegex = new RegExp(productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      orBranches.push({ name: nameRegex });
    }

    if (orBranches.length === 0) {
      res.json({ suggestions: [] });
      return;
    }

    const candidates = await Product.find({ $or: orBranches })
      .sort({ stock: -1, createdAt: -1 })
      .limit(80)
      .lean();

    const mapped: CatalogSuggestionCandidate[] = candidates.map((product) => ({
      _id: String(product._id),
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
      status: product.status,
      brand: product.brand,
      oemPartNumber: product.oemPartNumber,
      alternatePartNumbers: product.alternatePartNumbers || [],
      isUniversal: product.isUniversal,
      fitmentStatus: product.fitmentStatus,
      compatibility: product.compatibility || [],
      images: product.images || [],
    }));

    const suggestions = rankCatalogProductSuggestions(
      mapped,
      {
        make: make || undefined,
        model: model || undefined,
        year,
        engine: engine || undefined,
        partNumber: partNumber || undefined,
        productName: productName || undefined,
        category: category || undefined,
      },
      limit
    );

    res.json({ suggestions });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch product suggestions';
    res.status(500).json({ message });
  }
};
