import { Response } from 'express';
import path from 'path';
import { AuthRequest } from '../middleware/auth';
import CustomOrder from '../models/CustomOrder';
import { CustomOrderStatus } from '../types/shared';
import { uploadImage, deleteImage } from '../config/cloudinary';
import { cleanupFile } from '../middleware/upload';
import { assertValidCustomOrderStatusTransition } from '../utils/customOrderStatusTransitions';

const optionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getUploadedFiles = (req: AuthRequest): Express.Multer.File[] => {
  if (!req.files) return [];
  if (Array.isArray(req.files)) return req.files;
  return Object.values(req.files).flat();
};

export const createCustomOrder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const files = getUploadedFiles(req);
  const filePaths = files.map((file) => path.join(process.cwd(), 'uploads', file.filename));
  const uploadedPublicIds: string[] = [];

  try {
    const productName = String(req.body.productName || '').trim();
    const description = String(req.body.description || '').trim();
    const category = String(req.body.category || '').trim();
    const make = String(req.body.make || '').trim();
    const model = String(req.body.model || '').trim();
    const engine = String(req.body.engine || '').trim();
    const position = String(req.body.position || '').trim();
    const year = Number(req.body.year);
    const quantity = Number(req.body.quantity);
    const estimatedPriceRaw = req.body.estimatedPrice;
    const estimatedPrice =
      estimatedPriceRaw === undefined || estimatedPriceRaw === '' || estimatedPriceRaw === null
        ? undefined
        : Number(estimatedPriceRaw);

    const imageUrls: string[] = [];
    for (const filePath of filePaths) {
      const result = await uploadImage(filePath, 'autotek/custom-orders');
      uploadedPublicIds.push(result.public_id);
      imageUrls.push(result.secure_url);
    }

    const customOrder = new CustomOrder({
      user: req.user!._id,
      productName,
      description,
      category,
      estimatedPrice: Number.isFinite(estimatedPrice) ? estimatedPrice : undefined,
      vehicleDetails: {
        make,
        model,
        year,
        engine,
        trim: optionalString(req.body.trim),
        transmission: optionalString(req.body.transmission),
        drivetrain: optionalString(req.body.drivetrain),
        bodyStyle: optionalString(req.body.bodyStyle),
        vinOrChassis: optionalString(req.body.vinOrChassis)?.toUpperCase(),
      },
      partDetails: {
        position,
        partNumber: optionalString(req.body.partNumber)?.toUpperCase(),
        quantity,
        preference: optionalString(req.body.preference) || 'no-preference',
      },
      images: imageUrls,
    });

    await customOrder.save();
    res.status(201).json(customOrder);
  } catch (error: any) {
    if (uploadedPublicIds.length > 0) {
      await Promise.allSettled(uploadedPublicIds.map((publicId) => deleteImage(publicId)));
    }
    res.status(500).json({ message: error.message || 'Failed to create custom order' });
  } finally {
    filePaths.forEach((filePath) => cleanupFile(filePath));
  }
};

export const getCustomOrders = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const query: any = { user: req.user!._id };
    const { status } = req.query;

    if (status) {
      query.status = status;
    }

    const customOrders = await CustomOrder.find(query).sort({ createdAt: -1 });
    res.json(customOrders);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch custom orders' });
  }
};

export const getCustomOrder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const customOrder = await CustomOrder.findOne({
      _id: req.params.id,
      user: req.user!._id,
    });

    if (!customOrder) {
      res.status(404).json({ message: 'Custom order not found' });
      return;
    }

    res.json(customOrder);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch custom order' });
  }
};

export const updateCustomOrder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { status, estimatedPrice, supplier, notes } = req.body;

    const customOrder = await CustomOrder.findById(req.params.id);
    if (!customOrder) {
      res.status(404).json({ message: 'Custom order not found' });
      return;
    }

    // Only admin can update
    if (req.user!.role !== 'admin') {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    if (status !== undefined && status !== null && status !== '') {
      if (!Object.values(CustomOrderStatus).includes(status)) {
        res.status(400).json({ message: 'Invalid status' });
        return;
      }
    }

    const mergedPrice =
      estimatedPrice !== undefined
        ? Number(estimatedPrice)
        : customOrder.estimatedPrice;
    const mergedSupplier =
      supplier !== undefined
        ? optionalString(supplier) ?? ''
        : customOrder.supplier ?? '';
    const mergedNotes =
      notes !== undefined ? optionalString(notes) : customOrder.notes;

    if (status && status !== customOrder.status) {
      const transition = assertValidCustomOrderStatusTransition(
        customOrder.status as CustomOrderStatus,
        status as CustomOrderStatus,
        {
          estimatedPrice: Number.isFinite(mergedPrice as number)
            ? (mergedPrice as number)
            : undefined,
          supplier: mergedSupplier,
        }
      );
      if (!transition.ok) {
        res.status(400).json({ message: transition.message });
        return;
      }
      customOrder.status = status;
    }

    if (estimatedPrice !== undefined) {
      const priceNum = Number(estimatedPrice);
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        res.status(400).json({ message: 'Estimated price must be a non-negative number' });
        return;
      }
      customOrder.estimatedPrice = priceNum;
    }
    if (supplier !== undefined) {
      customOrder.supplier = optionalString(supplier);
    }
    if (notes !== undefined) {
      customOrder.notes = mergedNotes;
    }

    await customOrder.save();
    res.json(customOrder);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update custom order' });
  }
};
