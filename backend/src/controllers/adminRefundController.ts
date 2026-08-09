import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Payment from '../models/Payment';
import { PaymentStatus } from '../types/shared';
import { completeManualRefund, completeReturnRefund } from '../utils/paymentRefunds';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const getAdminRefunds = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const statusParam = typeof req.query.status === 'string' ? req.query.status : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const filter: Record<string, unknown> = {
      status: { $in: [PaymentStatus.REFUND_PENDING, PaymentStatus.REFUNDED] },
    };

    if (statusParam === PaymentStatus.REFUND_PENDING || statusParam === 'pending') {
      filter.status = PaymentStatus.REFUND_PENDING;
    } else if (statusParam === PaymentStatus.REFUNDED || statusParam === 'completed') {
      filter.status = PaymentStatus.REFUNDED;
    }

    if (search) {
      const safe = escapeRegex(search);
      filter.$or = [
        { transactionId: { $regex: safe, $options: 'i' } },
        { chargeId: { $regex: safe, $options: 'i' } },
        { refundReason: { $regex: safe, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .sort({ refundRequestedAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('order', 'totalAmount status paymentStatus createdAt')
        .populate('towingService', 'status paymentStatus price pickupLocation destination')
        .populate('carService', 'status paymentStatus price serviceTypes address')
        .lean(),
      Payment.countDocuments(filter),
    ]);

    const pendingCount = await Payment.countDocuments({ status: PaymentStatus.REFUND_PENDING });

    res.json({
      refunds: payments,
      pendingCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load refunds';
    res.status(500).json({ message });
  }
};

export const completeAdminRefund = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
      res.status(400).json({ message: 'Payment ID is required' });
      return;
    }
    const notes = typeof req.body?.notes === 'string' ? req.body.notes : undefined;

    const result = await completeManualRefund(id, notes);

    if (!result.success) {
      res.status(400).json({
        message: result.message,
        error: result.error,
      });
      return;
    }

    res.json({
      payment: result.payment,
      message: result.message,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to complete refund';
    res.status(500).json({ message });
  }
};

export const completeAdminReturnRefund = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
      res.status(400).json({ message: 'Return ID is required' });
      return;
    }
    const notes = typeof req.body?.notes === 'string' ? req.body.notes : undefined;

    const result = await completeReturnRefund(id, notes);

    if (!result.success) {
      res.status(400).json({
        message: result.message,
        error: result.error,
      });
      return;
    }

    res.json({
      return: result.return,
      message: result.message,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to complete return refund';
    res.status(500).json({ message });
  }
};
