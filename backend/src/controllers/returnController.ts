import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Return, { IReturn } from '../models/Return';
import Order from '../models/Order';
import { OrderStatus } from '../types/shared';
// Using string literals instead of enum values to avoid runtime issues
const ReturnStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

const ReturnReason = {
  DEFECTIVE: 'defective',
  WRONG_ITEM: 'wrong-item',
  NOT_AS_DESCRIBED: 'not-as-described',
  CHANGED_MIND: 'changed-mind',
  OTHER: 'other',
} as const;

const RefundMethod = {
  ORIGINAL_PAYMENT: 'original-payment',
  STORE_CREDIT: 'store-credit',
} as const;

const RefundStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;
import { uploadMultipleImages } from '../config/cloudinary';
import { cleanupFile } from '../middleware/upload';
import path from 'path';
import { emailService } from '../services/emailService';
import { processPayChanguRefund } from '../utils/paymentRefunds';
import Payment from '../models/Payment';

const RETURN_WINDOW_DAYS = 30;

// Helper function to check if order is within return window
const isWithinReturnWindow = (order: any): boolean => {
  if (order.status !== OrderStatus.COMPLETED) {
    return false;
  }
  
  const completionDate = order.updatedAt || order.createdAt;
  const daysSinceCompletion = (Date.now() - new Date(completionDate).getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceCompletion <= RETURN_WINDOW_DAYS;
};

// Get product id string from an order item (handles populated and non-populated product)
const getOrderItemProductId = (item: any): string => {
  const p = item?.product;
  return p && (p._id != null ? p._id : p).toString();
};

// Helper function to calculate refund amount
const calculateRefundAmount = (order: any, returnItems: any[]): number => {
  let refundAmount = 0;

  for (const returnItem of returnItems) {
    const returnProductId = returnItem.product?.toString() ?? '';
    const orderItem = order.items.find(
      (item: any) => getOrderItemProductId(item) === returnProductId
    );

    if (orderItem) {
      const itemPrice = orderItem.price;
      const itemQuantity = returnItem.quantity;
      refundAmount += itemPrice * itemQuantity;
    }
  }

  // Apply proportional discount if order had discount (guard against division by zero)
  if (order.discount && order.discount > 0) {
    const orderTotal = order.totalAmount + order.discount;
    if (orderTotal > 0) {
      const returnProportion = refundAmount / orderTotal;
      refundAmount = refundAmount - (order.discount * returnProportion);
    }
  }

  return Math.max(0, Math.round(refundAmount * 100) / 100);
};

export const createReturn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let { orderId, items, returnReason, comments, refundMethod, guestInfo } = req.body;
    
    // Parse JSON strings from FormData
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (e) {
        res.status(400).json({ message: 'Invalid items format' });
        return;
      }
    }
    
    if (typeof guestInfo === 'string') {
      try {
        guestInfo = JSON.parse(guestInfo);
      } catch (e) {
        // guestInfo is optional, so ignore parse errors
      }
    }

    if (!orderId || !items || items.length === 0) {
      res.status(400).json({ message: 'Order ID and items are required' });
      return;
    }

    const validReturnReasons = ['defective', 'wrong-item', 'not-as-described', 'changed-mind', 'other'];
    if (!returnReason || !validReturnReasons.includes(returnReason)) {
      res.status(400).json({ message: 'Valid return reason is required' });
      return;
    }

    // Validate guest info if no user
    if (!req.user && !guestInfo) {
      res.status(400).json({ message: 'User authentication or guest information is required' });
      return;
    }

    if (!req.user && guestInfo) {
      if (!guestInfo.email || !guestInfo.name || !guestInfo.phone) {
        res.status(400).json({ message: 'Guest email, name, and phone are required' });
        return;
      }
    }

    // Find order
    let order;
    if (req.user) {
      order = await Order.findOne({
        _id: orderId,
        user: req.user._id,
      }).populate('items.product');
    } else if (guestInfo) {
      order = await Order.findOne({
        _id: orderId,
        'guestInfo.email': guestInfo.email.toLowerCase().trim(),
      }).populate('items.product');
    }

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Check if order is eligible for return
    if (!isWithinReturnWindow(order)) {
      res.status(400).json({
        message: `Return window has expired. Returns must be requested within ${RETURN_WINDOW_DAYS} days of order completion.`,
      });
      return;
    }

    // Check if there's already a pending or approved return for this order
    const existingReturn = await Return.findOne({
      order: orderId,
      status: { $in: ['pending', 'approved'] },
    });

    if (existingReturn) {
      res.status(400).json({ message: 'A return request already exists for this order' });
      return;
    }

    // Validate return items
    const returnItems = [];
    for (const item of items) {
      const orderItem = order.items.find(
        (oi: any) => oi.product._id.toString() === item.productId
      );

      if (!orderItem) {
        res.status(400).json({ message: `Product ${item.productId} not found in order` });
        return;
      }

      if (item.quantity > orderItem.quantity) {
        res.status(400).json({
          message: `Return quantity (${item.quantity}) exceeds ordered quantity (${orderItem.quantity}) for product ${item.productId}`,
        });
        return;
      }

      if (item.quantity < 1) {
        res.status(400).json({ message: 'Return quantity must be at least 1' });
        return;
      }

      returnItems.push({
        product: item.productId,
        quantity: item.quantity,
        reason: item.reason || 'No reason provided',
      });
    }

    // Handle image uploads
    let uploadedImages: string[] = [];
    if (req.files) {
      const files = Array.isArray(req.files)
        ? req.files
        : (typeof req.files === 'object' ? Object.values(req.files).flat() : []);
      const filePaths = files.map((file: Express.Multer.File) =>
        path.join(process.cwd(), 'uploads', file.filename)
      );

      try {
        const uploadResults = await uploadMultipleImages(filePaths, 'autotek/returns');
        uploadedImages = uploadResults.map((result) => result.secure_url);

        // Clean up local files after upload
        filePaths.forEach((filePath) => cleanupFile(filePath));
      } catch (uploadError: any) {
        // Clean up local files on error
        filePaths.forEach((filePath) => cleanupFile(filePath));
        res.status(500).json({ message: `Image upload failed: ${uploadError.message}` });
        return;
      }
    }

    // Calculate refund amount
    const refundAmount = calculateRefundAmount(order, returnItems);

    // Create return
    const returnData: any = {
      order: orderId,
      items: returnItems,
      returnReason,
      comments: comments || '',
      images: uploadedImages,
      refundAmount,
      refundMethod: refundMethod || 'original-payment',
      refundStatus: 'pending',
      status: 'pending',
    };

    if (req.user) {
      returnData.user = req.user._id;
    } else if (guestInfo) {
      returnData.guestInfo = {
        email: guestInfo.email.toLowerCase().trim(),
        name: guestInfo.name.trim(),
        phone: guestInfo.phone.trim(),
      };
    }

    const newReturn = new Return(returnData);
    await newReturn.save();

    // Populate order and product details for response
    await newReturn.populate([
      { path: 'order', populate: { path: 'items.product' } },
      { path: 'items.product' },
    ]);

    // Send confirmation email
    const email = req.user?.email || guestInfo?.email;
    if (email) {
      await emailService.sendReturnRequestConfirmation(newReturn, req.user, guestInfo?.email);
    }

    res.status(201).json({
      return: newReturn,
      message: 'Return request created successfully',
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create return request' });
  }
};

export const getUserReturns = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, status, page = 1, limit = 10 } = req.query;

    let query: any = {};

    if (req.user) {
      query.user = req.user._id;
    } else if (email) {
      query['guestInfo.email'] = email.toString().toLowerCase().trim();
    } else {
      res.status(401).json({ message: 'Authentication required or email query parameter needed' });
      return;
    }

    const validReturnStatuses = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];
    if (status && validReturnStatuses.includes(status as string)) {
      query.status = status;
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const returns = await Return.find(query)
      .populate('order')
      .populate('items.product')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Return.countDocuments(query);

    res.json({
      returns,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch returns' });
  }
};

export const getReturn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { email } = req.query;

    let returnDoc;

    // Admin can view any return by id
    if (req.user && req.user.role === 'admin') {
      returnDoc = await Return.findOne({ _id: id })
        .populate('order')
        .populate('items.product');
    } else if (req.user) {
      returnDoc = await Return.findOne({
        _id: id,
        user: req.user._id,
      })
        .populate('order')
        .populate('items.product');
    } else if (email) {
      returnDoc = await Return.findOne({
        _id: id,
        'guestInfo.email': email.toString().toLowerCase().trim(),
      })
        .populate('order')
        .populate('items.product');
    } else {
      res.status(401).json({ message: 'Authentication required or email query parameter needed' });
      return;
    }

    if (!returnDoc) {
      res.status(404).json({ message: 'Return not found' });
      return;
    }

    res.json({ return: returnDoc });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch return' });
  }
};

export const cancelReturn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { email } = req.query;

    let returnDoc;

    if (req.user) {
      returnDoc = await Return.findOne({
        _id: id,
        user: req.user._id,
      });
    } else if (email) {
      returnDoc = await Return.findOne({
        _id: id,
        'guestInfo.email': email.toString().toLowerCase().trim(),
      });
    } else {
      res.status(401).json({ message: 'Authentication required or email query parameter needed' });
      return;
    }

    if (!returnDoc) {
      res.status(404).json({ message: 'Return not found' });
      return;
    }

    if (returnDoc.status !== 'pending') {
      res.status(400).json({ message: 'Only pending returns can be cancelled' });
      return;
    }

    returnDoc.status = 'cancelled' as any;
    await returnDoc.save();

    res.json({ return: returnDoc, message: 'Return cancelled successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to cancel return' });
  }
};

// Admin endpoints
export const getAllReturns = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, startDate, endDate, page = 1, limit = 20 } = req.query;

    let query: any = {};

    const validReturnStatuses = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];
    if (status && validReturnStatuses.includes(status as string)) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate as string);
      }
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const returns = await Return.find(query)
      .populate('order')
      .populate('user', 'name email')
      .populate('items.product')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Return.countDocuments(query);

    res.json({
      returns,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch returns' });
  }
};

export const approveReturn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const returnDoc = await Return.findById(id)
      .populate('order')
      .populate('user')
      .populate('items.product');

    if (!returnDoc) {
      res.status(404).json({ message: 'Return not found' });
      return;
    }

    if (returnDoc.status !== 'pending') {
      res.status(400).json({ message: 'Only pending returns can be approved' });
      return;
    }

    returnDoc.status = 'approved' as any;
    // Generate shipping label (placeholder - in production, integrate with shipping API)
    returnDoc.shippingLabel = `RETURN-${returnDoc._id.toString().slice(-8).toUpperCase()}`;
    await returnDoc.save();

    // Send approval email
    const email = returnDoc.user
      ? (returnDoc.user as any).email
      : returnDoc.guestInfo?.email;
    if (email) {
      await emailService.sendReturnApprovalEmail(returnDoc, returnDoc.user as any, returnDoc.guestInfo?.email);
    }

    res.json({ return: returnDoc, message: 'Return approved successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to approve return' });
  }
};

export const rejectReturn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    if (!adminNotes || adminNotes.trim().length === 0) {
      res.status(400).json({ message: 'Admin notes are required when rejecting a return' });
      return;
    }

    const returnDoc = await Return.findById(id)
      .populate('order')
      .populate('user')
      .populate('items.product');

    if (!returnDoc) {
      res.status(404).json({ message: 'Return not found' });
      return;
    }

    if (returnDoc.status !== 'pending') {
      res.status(400).json({ message: 'Only pending returns can be rejected' });
      return;
    }

    returnDoc.status = 'rejected' as any;
    returnDoc.adminNotes = adminNotes.trim();
    await returnDoc.save();

    // Send rejection email
    const email = returnDoc.user
      ? (returnDoc.user as any).email
      : returnDoc.guestInfo?.email;
    if (email) {
      await emailService.sendReturnRejectionEmail(returnDoc, returnDoc.user as any, returnDoc.guestInfo?.email);
    }

    res.json({ return: returnDoc, message: 'Return rejected successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to reject return' });
  }
};

export const processRefund = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { refundAmount } = req.body;

    const returnDoc = await Return.findById(id)
      .populate('order')
      .populate('user')
      .populate('items.product');

    if (!returnDoc) {
      res.status(404).json({ message: 'Return not found' });
      return;
    }

    if (returnDoc.status !== 'approved') {
      res.status(400).json({ message: 'Only approved returns can be refunded' });
      return;
    }

    if (returnDoc.refundStatus === 'completed') {
      res.status(400).json({ message: 'Refund has already been processed' });
      return;
    }

    // Use provided refund amount or calculated amount
    const finalRefundAmount = refundAmount !== undefined ? Number(refundAmount) : returnDoc.refundAmount;

    if (finalRefundAmount < 0) {
      res.status(400).json({ message: 'Refund amount must be positive' });
      return;
    }

    // Get the original payment record
    const orderId = (returnDoc.order as any)._id || returnDoc.order;
    const payment = await Payment.findOne({ order: orderId, type: 'order' }).sort({ createdAt: -1 });

    if (!payment || !payment.transactionId) {
      res.status(400).json({
        message: 'Original payment transaction not found. Cannot process refund.'
      });
      return;
    }

    // Update refund amount and set to processing
    returnDoc.refundAmount = finalRefundAmount;
    returnDoc.refundStatus = 'processing' as any;
    await returnDoc.save();

    // Process refund through PayChangu
    const refundResult = await processPayChanguRefund({
      transactionId: payment.transactionId,
      amount: finalRefundAmount,
      reason: returnDoc.returnReason,
      orderId: orderId.toString(),
    });

    if (!refundResult.success) {
      // Refund failed
      returnDoc.refundStatus = 'failed' as any;
      await returnDoc.save();

      res.status(400).json({
        return: returnDoc,
        message: refundResult.message || 'Refund processing failed',
        error: refundResult.error,
      });
      return;
    }

    // Refund successful
    returnDoc.refundStatus = 'completed' as any;
    returnDoc.status = 'completed' as any;
    await returnDoc.save();

    // Send refund confirmation email
    const email = returnDoc.user
      ? (returnDoc.user as any).email
      : returnDoc.guestInfo?.email;
    if (email) {
      await emailService.sendRefundProcessedEmail(returnDoc, returnDoc.user as any, returnDoc.guestInfo?.email);
    }

    res.json({
      return: returnDoc,
      refund: {
        refundId: refundResult.refundId,
        amount: finalRefundAmount,
        status: refundResult.status,
      },
      message: 'Refund processed successfully',
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to process refund' });
  }
};
