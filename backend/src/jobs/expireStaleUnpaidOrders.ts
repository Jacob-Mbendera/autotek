/**
 * BR-13 — Auto-cancel stale unpaid orders and release stock (BR-03 Option B).
 * Complements manual customer cancel: abandoned PayChangu checkouts stop holding inventory.
 */
import mongoose from 'mongoose';
import Order, { IOrder } from '../models/Order';
import User from '../models/User';
import { OrderStatus, PaymentStatus } from '../types/shared';
import { emailService } from '../services/emailService';
import { restoreStockForOrderItems } from '../utils/orderStock';
import { log } from '../utils/logger';

const DEFAULT_MAX_AGE_HOURS = 48;
const DEFAULT_BATCH_LIMIT = 50;

export function getStaleUnpaidOrderMaxAgeHours(): number {
  const parsed = Number(process.env.STALE_UNPAID_ORDER_HOURS);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_MAX_AGE_HOURS;
  }
  return Math.floor(parsed);
}

export function isStaleOrderCleanupEnabled(): boolean {
  return process.env.STALE_ORDER_CLEANUP_ENABLED !== 'false';
}

export interface ExpireStaleUnpaidOrdersResult {
  scanned: number;
  cancelled: number;
  skipped: number;
  errors: number;
}

async function notifyOrderExpired(order: IOrder): Promise<void> {
  try {
    let user;
    if (order.user) {
      user = await User.findById(order.user);
    }
    const guestEmail = order.guestInfo?.email;
    if (!user?.email && !guestEmail) return;

    await emailService.sendOrderStatusUpdate(
      order,
      user ?? undefined,
      guestEmail
    );
  } catch (emailError) {
    log.error('Failed to send stale order cancellation email', {
      orderId: order._id.toString(),
      error: emailError,
    });
  }
}

/**
 * Cancel unpaid pending orders older than the configured age and restore stock.
 */
export async function expireStaleUnpaidOrders(options?: {
  maxAgeHours?: number;
  limit?: number;
}): Promise<ExpireStaleUnpaidOrdersResult> {
  const maxAgeHours = options?.maxAgeHours ?? getStaleUnpaidOrderMaxAgeHours();
  const limit = options?.limit ?? DEFAULT_BATCH_LIMIT;
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

  const candidates = await Order.find({
    status: OrderStatus.PENDING,
    paymentStatus: { $in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
    createdAt: { $lt: cutoff },
  })
    .sort({ createdAt: 1 })
    .limit(limit);

  const result: ExpireStaleUnpaidOrdersResult = {
    scanned: candidates.length,
    cancelled: 0,
    skipped: 0,
    errors: 0,
  };

  if (candidates.length === 0) {
    return result;
  }

  log.info('Stale unpaid order cleanup started', {
    maxAgeHours,
    cutoff: cutoff.toISOString(),
    candidateCount: candidates.length,
  });

  for (const candidate of candidates) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await Order.findOneAndUpdate(
        {
          _id: candidate._id,
          status: OrderStatus.PENDING,
          paymentStatus: { $in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
        },
        { status: OrderStatus.CANCELLED },
        { new: true, session }
      );

      if (!order) {
        await session.abortTransaction();
        result.skipped += 1;
        continue;
      }

      await restoreStockForOrderItems(order.items, session);
      await session.commitTransaction();
      result.cancelled += 1;

      log.info('Stale unpaid order auto-cancelled', {
        orderId: order._id.toString(),
        createdAt: order.createdAt,
      });

      await notifyOrderExpired(order);
    } catch (error) {
      await session.abortTransaction();
      result.errors += 1;
      log.error('Failed to auto-cancel stale unpaid order', {
        orderId: candidate._id.toString(),
        error,
      });
    } finally {
      session.endSession();
    }
  }

  log.info('Stale unpaid order cleanup finished', result);
  return result;
}
