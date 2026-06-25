import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import MediaAsset from '../models/MediaAsset';
import Product from '../models/Product';
import { uploadImage, deleteImage, extractPublicId } from '../config/cloudinary';
import { generateBlurDataUrl } from '../utils/imageBlurPlaceholder';
import { cleanupFile } from '../middleware/upload';

const LIBRARY_CLOUDINARY_FOLDER = 'autotek/media-library';

const productsUsingImageFilter = (url: string) => ({
  $or: [{ images: url }, { 'images.url': url }],
});

const clampInt = (value: unknown, fallback: number, min: number, max: number): number => {
  const n = typeof value === 'string' ? parseInt(value, 10) : typeof value === 'number' ? value : fallback;
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

/**
 * GET /api/admin/media-assets?q=&page=&limit=
 */
export const listMediaAssets = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const page = clampInt(req.query.page, 1, 1, 10_000);
    const limit = clampInt(req.query.limit, 20, 1, 100);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (q.length > 0) {
      filter.$or = [
        { originalName: { $regex: q, $options: 'i' } },
        { url: { $regex: q, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      MediaAsset.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      MediaAsset.countDocuments(filter),
    ]);

    res.json({
      assets: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list media assets';
    res.status(500).json({ message });
  }
};

/**
 * POST /api/admin/media-assets (multipart field `files`, admin)
 */
export const uploadMediaLibrary = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawFiles = req.files;
    const files = Array.isArray(rawFiles) ? rawFiles : [];
    if (files.length === 0) {
      res.status(400).json({ message: 'No files uploaded. Use multipart field "files".' });
      return;
    }

    type Row = {
      originalName: string;
      ok: boolean;
      error?: string;
      asset?: { _id: string; url: string; blurDataUrl?: string; originalName?: string };
    };

    const results: Row[] = [];

    for (const file of files) {
      const onDisk = 'path' in file && typeof (file as { path?: string }).path === 'string';
      const filePath = onDisk
        ? (file as { path: string }).path
        : path.join(process.cwd(), 'uploads', file.filename);
      const originalName = file.originalname;

      try {
        const blurDataUrl = await generateBlurDataUrl(filePath);
        const uploadResult = await uploadImage(filePath, LIBRARY_CLOUDINARY_FOLDER);
        cleanupFile(filePath);

        const url = uploadResult.secure_url;

        const existing = await MediaAsset.findOne({ url }).lean();
        if (existing) {
          results.push({
            originalName,
            ok: true,
            asset: {
              _id: String(existing._id),
              url: existing.url,
              blurDataUrl: existing.blurDataUrl,
              originalName: existing.originalName,
            },
          });
          continue;
        }

        const doc = await MediaAsset.create({
          url,
          blurDataUrl,
          originalName,
        });

        results.push({
          originalName,
          ok: true,
          asset: {
            _id: String(doc._id),
            url: doc.url,
            blurDataUrl: doc.blurDataUrl,
            originalName: doc.originalName,
          },
        });
      } catch (err: unknown) {
        cleanupFile(filePath);
        const message = err instanceof Error ? err.message : 'Upload failed';
        results.push({ originalName, ok: false, error: message });
      }
    }

    const okCount = results.filter((r) => r.ok).length;
    res.json({
      results,
      summary: { total: results.length, ok: okCount, failed: results.length - okCount },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Media library upload failed';
    res.status(500).json({ message });
  }
};

/**
 * DELETE /api/admin/media-assets/:id
 * Removes library record and Cloudinary file when not referenced by any product.
 */
export const deleteMediaAsset = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!rawId || !mongoose.Types.ObjectId.isValid(rawId)) {
      res.status(400).json({ message: 'Invalid media asset id' });
      return;
    }

    const asset = await MediaAsset.findById(rawId);
    if (!asset) {
      res.status(404).json({ message: 'Media asset not found' });
      return;
    }

    const url = asset.url;
    const productCount = await Product.countDocuments(productsUsingImageFilter(url));

    if (productCount > 0) {
      const products = await Product.find(productsUsingImageFilter(url))
        .select('name')
        .limit(10)
        .lean();

      res.status(409).json({
        message: `Cannot delete: image is used on ${productCount} product${productCount === 1 ? '' : 's'}. Remove it from those products first.`,
        productCount,
        products: products.map((p) => ({ _id: String(p._id), name: p.name })),
      });
      return;
    }

    const publicId = extractPublicId(url);
    if (publicId) {
      try {
        await deleteImage(publicId);
      } catch (cloudErr: unknown) {
        console.error('Cloudinary delete failed for media library asset:', cloudErr);
      }
    }

    await asset.deleteOne();

    res.json({ message: 'Media asset deleted successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete media asset';
    res.status(500).json({ message });
  }
};
