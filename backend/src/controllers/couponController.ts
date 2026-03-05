import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Coupon from '../models/Coupon';
import Order from '../models/Order';

interface ValidateCouponRequest {
  code: string;
  orderTotal: number;
  productIds?: string[];
  category?: string;
}

export const validateCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code, orderTotal, productIds, category } = req.body as ValidateCouponRequest;

    if (!code) {
      res.status(400).json({ message: 'Coupon code is required' });
      return;
    }

    if (!orderTotal || orderTotal <= 0) {
      res.status(400).json({ message: 'Valid order total is required' });
      return;
    }

    const coupon = await Coupon.findOne({
      code: code.toUpperCase().trim(),
      active: true,
    });

    if (!coupon) {
      res.status(404).json({ message: 'Invalid or expired coupon code' });
      return;
    }

    // Check validity dates
    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validTo) {
      res.status(400).json({ message: 'Coupon code has expired' });
      return;
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      res.status(400).json({ message: 'Coupon code has reached its usage limit' });
      return;
    }

    // Check minimum order value
    if (coupon.minOrderValue && orderTotal < coupon.minOrderValue) {
      res.status(400).json({
        message: `Minimum order value of MWK ${coupon.minOrderValue.toLocaleString()} required`,
      });
      return;
    }

    // Check user limit (if authenticated)
    if (req.user && coupon.userLimit) {
      const userOrderCount = await Order.countDocuments({
        user: req.user._id,
        'couponCode': coupon.code,
      });

      if (userOrderCount >= coupon.userLimit) {
        res.status(400).json({ message: 'You have reached the usage limit for this coupon' });
        return;
      }
    }

    // Check category restrictions
    if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
      if (!category || !coupon.applicableCategories.includes(category)) {
        res.status(400).json({
          message: 'This coupon is not applicable to items in your cart',
        });
        return;
      }
    }

    // Check excluded products
    if (coupon.excludedProducts && coupon.excludedProducts.length > 0 && productIds) {
      const hasExcludedProduct = productIds.some((id) =>
        coupon.excludedProducts!.some((excludedId) => excludedId.toString() === id)
      );
      if (hasExcludedProduct) {
        res.status(400).json({
          message: 'This coupon cannot be applied to some items in your cart',
        });
        return;
      }
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (orderTotal * coupon.value) / 100;
      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    } else if (coupon.type === 'fixed') {
      discount = Math.min(coupon.value, orderTotal);
    } else if (coupon.type === 'free-shipping') {
      // Free shipping - discount is typically shipping cost (0 for now, but can be calculated)
      discount = 0; // Shipping is free in this system, but this allows for future shipping costs
    }

    const finalTotal = Math.max(0, orderTotal - discount);

    res.json({
      valid: true,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
      },
      discount,
      finalTotal,
      message: 'Coupon applied successfully',
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to validate coupon' });
  }
};

// Admin endpoints
export const getAllCoupons = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, active } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = {};
    if (active !== undefined) {
      query.active = active === 'true';
    }

    const coupons = await Coupon.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Coupon.countDocuments(query);

    res.json({
      coupons,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch coupons' });
  }
};

export const getCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      res.status(404).json({ message: 'Coupon not found' });
      return;
    }

    res.json({ coupon });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch coupon' });
  }
};

export const createCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const couponData = req.body;

    // Validate dates
    if (couponData.validTo && new Date(couponData.validTo) <= new Date(couponData.validFrom || Date.now())) {
      res.status(400).json({ message: 'Valid to date must be after valid from date' });
      return;
    }

    // Validate percentage values
    if (couponData.type === 'percentage' && (couponData.value < 0 || couponData.value > 100)) {
      res.status(400).json({ message: 'Percentage value must be between 0 and 100' });
      return;
    }

    const coupon = new Coupon(couponData);
    await coupon.save();

    res.status(201).json({ coupon });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Coupon code already exists' });
      return;
    }
    res.status(500).json({ message: error.message || 'Failed to create coupon' });
  }
};

export const updateCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      res.status(404).json({ message: 'Coupon not found' });
      return;
    }

    const updateData = req.body;

    // Validate dates if provided
    if (updateData.validTo && updateData.validFrom) {
      if (new Date(updateData.validTo) <= new Date(updateData.validFrom)) {
        res.status(400).json({ message: 'Valid to date must be after valid from date' });
        return;
      }
    }

    Object.assign(coupon, updateData);
    await coupon.save();

    res.json({ coupon });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Coupon code already exists' });
      return;
    }
    res.status(500).json({ message: error.message || 'Failed to update coupon' });
  }
};

export const deleteCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      res.status(404).json({ message: 'Coupon not found' });
      return;
    }

    await coupon.deleteOne();

    res.json({ message: 'Coupon deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to delete coupon' });
  }
};
