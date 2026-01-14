import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import CustomOrder from '../models/CustomOrder';
import { CustomOrderStatus } from '../types/shared';

export const createCustomOrder = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { productName, description, category, estimatedPrice } = req.body;

    if (!productName || !description || !category) {
      res.status(400).json({
        message: 'Product name, description, and category are required',
      });
      return;
    }

    const customOrder = new CustomOrder({
      user: req.user!._id,
      productName,
      description,
      category,
      estimatedPrice,
    });

    await customOrder.save();
    res.status(201).json(customOrder);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create custom order' });
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

    if (status && !Object.values(CustomOrderStatus).includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    if (status) customOrder.status = status;
    if (estimatedPrice !== undefined) customOrder.estimatedPrice = estimatedPrice;
    if (supplier) customOrder.supplier = supplier;
    if (notes) customOrder.notes = notes;

    await customOrder.save();
    res.json(customOrder);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update custom order' });
  }
};
