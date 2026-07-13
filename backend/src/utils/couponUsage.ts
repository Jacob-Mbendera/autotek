/**
 * BR-05 — Record coupon usage only after successful payment (not at order create).
 */
import Coupon from '../models/Coupon';
import type { IOrder } from '../models/Order';
import { log } from './logger';

export async function recordCouponUsageForPaidOrder(order: Pick<IOrder, '_id' | 'couponCode'>): Promise<void> {
  const code = order.couponCode?.trim();
  if (!code) {
    return;
  }

  const result = await Coupon.updateOne(
    { code: code.toUpperCase() },
    { $inc: { usageCount: 1 } }
  );

  if (result.matchedCount === 0) {
    log.warn('recordCouponUsageForPaidOrder: coupon not found', {
      orderId: String(order._id),
      couponCode: code,
    });
  }
}
