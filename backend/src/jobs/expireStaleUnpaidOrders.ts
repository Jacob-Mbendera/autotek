/**
 * BR-13 — Auto-cancel stale unpaid orders and release stock (BR-03 Option B).
 * Complements manual customer cancel: abandoned PayChangu checkouts stop holding inventory.
 */
import mongoose from 'mongoose';
import Order, { IOrder } from '../models/Order';
import User from '../models/User';
import { OrderStatus, PaymentStatus } from '../types/shared';
import { emailService } from '../services/emailService';
import { restoreStockForOrder } from '../utils/orderStock';
import { log } from '../utils/logger';

const DEFAULT_MAX_AGE_HOURS = 48;
const DEFAULT_BATCH_LIMIT = 50;
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/**
 * Prefer STALE_UNPAID_ORDER_MINUTES when set (useful for short soak tests).
 * Otherwise use STALE_UNPAID_ORDER_HOURS (default 48).
 */
export function getStaleUnpaidOrderMaxAgeMs(): number {
  const minutes = Number(process.env.STALE_UNPAID_ORDER_MINUTES);
  if (Number.isFinite(minutes) && minutes >= 1) {
    return Math.floor(minutes) * MS_PER_MINUTE;
  }

  const hours = Number(process.env.STALE_UNPAID_ORDER_HOURS);
  if (!Number.isFinite(hours) || hours < 1) {
    return DEFAULT_MAX_AGE_HOURS * MS_PER_HOUR;
  }
  return Math.floor(hours) * MS_PER_HOUR;
}

/** @deprecated Prefer getStaleUnpaidOrderMaxAgeMs — kept for callers that log hours. */
export function getStaleUnpaidOrderMaxAgeHours(): number {
  return getStaleUnpaidOrderMaxAgeMs() / MS_PER_HOUR;
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
  maxAgeMs?: number;
  /** @deprecated Use maxAgeMs */
  maxAgeHours?: number;
  limit?: number;
}): Promise<ExpireStaleUnpaidOrdersResult> {
  const maxAgeMs =
    options?.maxAgeMs ??
    (options?.maxAgeHours != null
      ? options.maxAgeHours * MS_PER_HOUR
      : getStaleUnpaidOrderMaxAgeMs());
  const limit = options?.limit ?? DEFAULT_BATCH_LIMIT;
  const cutoff = new Date(Date.now() - maxAgeMs);

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
    maxAgeMs,
    maxAgeMinutes: Math.round(maxAgeMs / MS_PER_MINUTE),
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

      await restoreStockForOrder(order, session);
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
