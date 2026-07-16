/**
 * BR-11 — Shared order cancel side effects (customer cancel + admin status→cancelled).
 * Restores stock (BR-03) and queues manual PayChangu refund when paid (BR-06).
 */
import mongoose from 'mongoose';
import Order, { IOrder } from '../models/Order';
import Payment from '../models/Payment';
import { OrderStatus, PaymentStatus } from '../types/shared';
import {
  processPayChanguRefund,
  CUSTOMER_REFUND_PENDING_MESSAGE,
} from './paymentRefunds';
import { restoreStockForOrder } from './orderStock';
import { log } from './logger';

export interface ApplyOrderCancellationParams {
  order: IOrder;
  reason: string;
  /** Stored on the order for admin audit; defaults to reason when omitted. */
  cancelReason?: string;
}

export interface ApplyOrderCancellationResult {
  order: IOrder;
  stockRestored: boolean;
  refundPending: boolean;
  refundProcessed: false;
  refundMessage?: string;
  message: string;
}

async function queueRefundForCancelledOrder(
  order: IOrder,
  reason: string
): Promise<{ success: boolean; message: string; amount?: number } | null> {
  try {
    let payment = await Payment.findOne({
      order: order._id,
      status: PaymentStatus.COMPLETED,
    });

    // Legacy payments may lack status while order.paymentStatus is completed
    if (!payment && order.paymentStatus === PaymentStatus.COMPLETED) {
      payment = await Payment.findOne({ order: order._id }).sort({ createdAt: -1 });
      if (
        payment &&
        payment.status &&
        payment.status !== PaymentStatus.COMPLETED &&
        payment.status !== PaymentStatus.REFUND_PENDING
      ) {
        payment = null;
      }
    }

    if (!payment?.transactionId) {
      return null;
    }

    // Normalize missing status so queueManualRefund accepts the payment
    if (!payment.status) {
      payment.status = PaymentStatus.COMPLETED;
      await payment.save();
    }

    log.info('Order cancelled - queueing manual refund', {
      orderId: order._id,
      transactionId: payment.transactionId,
      amount: payment.amount,
      reason,
    });

    const refundResult = await processPayChanguRefund({
      transactionId: payment.transactionId,
      amount: payment.amount,
      reason,
      orderId: order._id.toString(),
    });

    log.payment.refund(order._id.toString(), payment.amount, refundResult.success, {
      pending: true,
      message: refundResult.message,
    });

    return {
      success: refundResult.success,
      message: refundResult.message,
      amount: refundResult.amount,
    };
  } catch (refundError: unknown) {
    log.error('Error queueing refund on order cancel', refundError);
    return { success: false, message: 'Failed to queue refund' };
  }
}

/**
 * Mark order cancelled, restore stock, and queue refund if paid.
 * Caller must have already authorized the cancel and validated transition rules.
 */
export async function applyOrderCancellation(
  params: ApplyOrderCancellationParams
): Promise<ApplyOrderCancellationResult> {
  const { order, reason, cancelReason } = params;

  if (order.status === OrderStatus.CANCELLED) {
    const refreshed = (await Order.findById(order._id)) ?? order;
    return {
      order: refreshed,
      stockRestored: false,
      refundPending: refreshed.paymentStatus === PaymentStatus.REFUND_PENDING,
      refundProcessed: false,
      message: 'Order is already cancelled.',
    };
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  let stockRestored = false;
  try {
    order.status = OrderStatus.CANCELLED;
    const storedReason = (cancelReason || reason || '').trim().slice(0, 500);
    if (storedReason) {
      order.cancelReason = storedReason;
    }
    await order.save({ session });
    stockRestored = await restoreStockForOrder(order, session);
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  const refundResult = await queueRefundForCancelledOrder(order, reason);

  const refundPending = Boolean(refundResult?.success);
  const message = refundPending
    ? `Order cancelled successfully. ${CUSTOMER_REFUND_PENDING_MESSAGE}`
    : 'Order cancelled successfully.';

  const refreshedOrder = (await Order.findById(order._id)) ?? order;

  return {
    order: refreshedOrder,
    stockRestored,
    refundPending,
    refundProcessed: false,
    refundMessage: refundResult?.message,
    message,
  };
}
