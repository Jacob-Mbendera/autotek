/**
 * Manual PayChangu refund workflow (no refund API available for AutoTek merchant).
 * See PAYCHANGU_REFUND_UPDATE.md — queue pending refunds; admin completes after dashboard refund.
 */
import Payment, { IPayment } from '../models/Payment';
import Order from '../models/Order';
import Return from '../models/Return';
import User from '../models/User';
import TowingService from '../models/TowingService';
import CarService from '../models/CarService';
import { PaymentStatus } from '../types/shared';
import { emailService } from '../services/emailService';
import { log } from './logger';

export const CUSTOMER_REFUND_PENDING_MESSAGE =
  'Refund will be processed within 3-5 business days';

export interface QueueManualRefundParams {
  transactionId?: string;
  paymentId?: string;
  amount?: number;
  reason?: string;
  referenceId?: string;
}

export interface ManualRefundResult {
  success: boolean;
  pending: boolean;
  payment?: IPayment;
  amount?: number;
  transactionId?: string;
  chargeId?: string;
  message: string;
  error?: string;
}

async function findPayment(params: QueueManualRefundParams): Promise<IPayment | null> {
  if (params.paymentId) {
    return Payment.findById(params.paymentId);
  }
  if (params.transactionId) {
    return Payment.findOne({ transactionId: params.transactionId });
  }
  return null;
}

/**
 * Mark a completed payment as refund_pending for admin manual PayChangu processing.
 * Does not call PayChangu (no refund API).
 */
export async function queueManualRefund(
  params: QueueManualRefundParams
): Promise<ManualRefundResult> {
  try {
    const payment = await findPayment(params);

    if (!payment) {
      return {
        success: false,
        pending: false,
        message: 'Original payment transaction not found',
        error: 'Invalid payment reference',
      };
    }

    if (payment.status === PaymentStatus.REFUNDED) {
      return {
        success: true,
        pending: false,
        payment,
        amount: payment.amount,
        transactionId: payment.transactionId,
        chargeId: payment.chargeId,
        message: 'Payment already refunded',
      };
    }

    if (payment.status === PaymentStatus.REFUND_PENDING) {
      return {
        success: true,
        pending: true,
        payment,
        amount: payment.amount,
        transactionId: payment.transactionId,
        chargeId: payment.chargeId,
        message: CUSTOMER_REFUND_PENDING_MESSAGE,
      };
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      return {
        success: false,
        pending: false,
        message: 'Cannot refund a payment that is not completed',
        error: `Payment status is ${payment.status}`,
      };
    }

    if (params.amount != null && params.amount > payment.amount) {
      return {
        success: false,
        pending: false,
        message: 'Refund amount cannot exceed original payment amount',
        error: `Refund amount (${params.amount}) > Original amount (${payment.amount})`,
      };
    }

    payment.status = PaymentStatus.REFUND_PENDING;
    payment.refundReason = params.reason || 'Customer cancellation';
    payment.refundRequestedAt = new Date();
    await payment.save();

    if (payment.order) {
      await Order.updateOne(
        { _id: payment.order },
        { paymentStatus: PaymentStatus.REFUND_PENDING }
      );
    }
    if (payment.towingService) {
      await TowingService.updateOne(
        { _id: payment.towingService },
        { paymentStatus: PaymentStatus.REFUND_PENDING }
      );
    }
    if (payment.carService) {
      await CarService.updateOne(
        { _id: payment.carService },
        { paymentStatus: PaymentStatus.REFUND_PENDING }
      );
    }

    log.info('Manual refund queued (PayChangu dashboard required)', {
      paymentId: payment._id.toString(),
      type: payment.type,
      amount: payment.amount,
      transactionId: payment.transactionId,
      chargeId: payment.chargeId,
      reason: payment.refundReason,
      referenceId: params.referenceId,
    });

    try {
      await emailService.sendAdminPendingRefundNotification({
        paymentId: payment._id.toString(),
        type: payment.type,
        amount: payment.amount,
        transactionId: payment.transactionId,
        chargeId: payment.chargeId,
        reason: payment.refundReason,
      });
    } catch (emailError) {
      log.error('Failed to send admin pending-refund notification', emailError);
    }

    return {
      success: true,
      pending: true,
      payment,
      amount: payment.amount,
      transactionId: payment.transactionId,
      chargeId: payment.chargeId,
      message: CUSTOMER_REFUND_PENDING_MESSAGE,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to queue refund';
    log.error('queueManualRefund failed', error);
    return {
      success: false,
      pending: false,
      message,
      error: message,
    };
  }
}

/**
 * @deprecated PayChangu has no usable refund API for this merchant.
 * Kept as an alias to queueManualRefund for existing call sites.
 */
export async function processPayChanguRefund(params: {
  transactionId: string;
  amount: number;
  reason?: string;
  orderId?: string;
}): Promise<{
  success: boolean;
  refundId?: string;
  transactionId?: string;
  amount?: number;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
  error?: string;
}> {
  const result = await queueManualRefund({
    transactionId: params.transactionId,
    amount: params.amount,
    reason: params.reason,
    referenceId: params.orderId,
  });

  return {
    success: result.success,
    transactionId: result.transactionId,
    amount: result.amount,
    status: result.pending ? 'pending' : result.success ? 'completed' : 'failed',
    message: result.message,
    error: result.error,
  };
}

export async function completeManualRefund(
  paymentId: string,
  notes?: string,
  options?: { skipCustomerEmail?: boolean }
): Promise<ManualRefundResult> {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    return {
      success: false,
      pending: false,
      message: 'Payment not found',
      error: 'Invalid payment ID',
    };
  }

  if (payment.status === PaymentStatus.REFUNDED) {
    return {
      success: true,
      pending: false,
      payment,
      amount: payment.amount,
      transactionId: payment.transactionId,
      chargeId: payment.chargeId,
      message: 'Refund already marked completed',
    };
  }

  if (payment.status !== PaymentStatus.REFUND_PENDING) {
    return {
      success: false,
      pending: false,
      payment,
      message: 'Only refunds with status refund_pending can be marked completed',
      error: `Payment status is ${payment.status}`,
    };
  }

  payment.status = PaymentStatus.REFUNDED;
  payment.refundCompletedAt = new Date();
  if (notes?.trim()) {
    payment.refundReason = `${payment.refundReason || 'Refund'} | Admin: ${notes.trim()}`;
  }
  await payment.save();

  if (payment.order) {
    await Order.updateOne(
      { _id: payment.order },
      { paymentStatus: PaymentStatus.REFUNDED }
    );
    // Any Return docs on this order are completed individually via
    // completeReturnRefund (below), each using its own refundAmount — not
    // blanket-completed here, since this Payment may cover multiple returns
    // whose actual PayChangu-side refund status can differ per return.
  }
  if (payment.towingService) {
    await TowingService.updateOne(
      { _id: payment.towingService },
      { paymentStatus: PaymentStatus.REFUNDED }
    );
  }
  if (payment.carService) {
    await CarService.updateOne(
      { _id: payment.carService },
      { paymentStatus: PaymentStatus.REFUNDED }
    );
  }

  if (!options?.skipCustomerEmail) {
    // When called as an order-closeout side effect of completeReturnRefund,
    // each underlying Return already emailed the customer for its own
    // amount — sending this too would double-notify for the same money.
    try {
      let customerEmail = '';
      let customerName = 'Customer';
      let referenceLabel = payment._id.toString().slice(-8).toUpperCase();

      if (payment.order) {
        const order = await Order.findById(payment.order);
        if (order) {
          referenceLabel = order._id.toString().slice(-8).toUpperCase();
          if (order.user) {
            const user = await User.findById(order.user);
            customerEmail = user?.email || '';
            customerName = user?.name || customerName;
          } else if (order.guestInfo?.email) {
            customerEmail = order.guestInfo.email;
            customerName = order.guestInfo.name || customerName;
          }
        }
      } else if (payment.towingService || payment.carService) {
        const serviceId = payment.towingService || payment.carService;
        const service = payment.towingService
          ? await TowingService.findById(serviceId)
          : await CarService.findById(serviceId);
        if (service) {
          referenceLabel = service._id.toString().slice(-8).toUpperCase();
          const user = await User.findById(service.user);
          customerEmail = user?.email || '';
          customerName = user?.name || customerName;
        }
      }

      if (customerEmail) {
        await emailService.sendManualRefundCompletedEmail({
          email: customerEmail,
          customerName,
          referenceLabel,
          refundAmount: payment.amount,
        });
      }
    } catch (emailError) {
      log.error('Failed to send customer refund-completed email', emailError);
    }
  }

  log.info('Manual refund marked completed', {
    paymentId: payment._id.toString(),
    amount: payment.amount,
  });

  return {
    success: true,
    pending: false,
    payment,
    amount: payment.amount,
    transactionId: payment.transactionId,
    chargeId: payment.chargeId,
    message: 'Refund marked as completed',
  };
}

export interface CompleteReturnRefundResult {
  success: boolean;
  message: string;
  error?: string;
  return?: unknown;
}

/**
 * Marks ONE Return's refund as completed, using that return's own refundAmount —
 * never the shared order Payment.amount, which can cover multiple returns.
 *
 * Once this return is completed, checks whether the sum of all completed
 * returns on the order now covers the full Payment.amount; if so, the shared
 * Payment/Order are also flipped to REFUNDED (reusing completeManualRefund's
 * entity-update logic below). If the sum is still short, the Payment stays
 * REFUND_PENDING — correctly reflecting that some of the order is still owed.
 */
export async function completeReturnRefund(
  returnId: string,
  notes?: string
): Promise<CompleteReturnRefundResult> {
  const existing = await Return.findById(returnId);
  if (!existing) {
    return { success: false, message: 'Return not found', error: 'Invalid return ID' };
  }

  if (existing.refundStatus === 'completed') {
    return { success: true, message: 'Refund already marked completed', return: existing };
  }

  if (existing.refundStatus !== 'processing') {
    return {
      success: false,
      message: 'Only returns with a refund queued (processing) can be marked completed',
      error: `Return refundStatus is ${existing.refundStatus}`,
    };
  }

  // Atomic guard against double-completion, same pattern used when the refund
  // was first queued (returnController.processRefund).
  const claimed = await Return.findOneAndUpdate(
    { _id: returnId, refundStatus: 'processing' },
    {
      $set: {
        refundStatus: 'completed',
        status: 'completed',
        refundCompletedAt: new Date(),
        ...(notes?.trim()
          ? { adminNotes: `${existing.adminNotes ? existing.adminNotes + ' | ' : ''}Admin: ${notes.trim()}` }
          : {}),
      },
    },
    { new: true }
  );

  if (!claimed) {
    return {
      success: false,
      message: 'This refund is already being processed or has completed',
      error: 'Concurrent update',
    };
  }

  try {
    const order = await Order.findById(claimed.order);
    if (order) {
      let customerEmail = '';
      let customerName = 'Customer';
      if (order.user) {
        const user = await User.findById(order.user);
        customerEmail = user?.email || '';
        customerName = user?.name || customerName;
      } else if (order.guestInfo?.email) {
        customerEmail = order.guestInfo.email;
        customerName = order.guestInfo.name || customerName;
      }
      if (customerEmail) {
        await emailService.sendManualRefundCompletedEmail({
          email: customerEmail,
          customerName,
          referenceLabel: order._id.toString().slice(-8).toUpperCase(),
          refundAmount: claimed.refundAmount,
        });
      }
    }
  } catch (emailError) {
    log.error('Failed to send customer refund-completed email for return', emailError);
  }

  // If every return on this order is now settled and their amounts cover the
  // full payment, close out the shared Payment/Order too.
  try {
    const payment = await Payment.findOne({ order: claimed.order, type: 'order' }).sort({
      createdAt: -1,
    });
    if (payment && payment.status === PaymentStatus.REFUND_PENDING) {
      const stillOpen = await Return.exists({
        order: claimed.order,
        refundStatus: { $in: ['pending', 'processing'] },
      });
      if (!stillOpen) {
        const completedReturns = await Return.find({
          order: claimed.order,
          refundStatus: 'completed',
        }).select('refundAmount');
        const totalRefunded = completedReturns.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
        if (totalRefunded >= payment.amount) {
          await completeManualRefund(payment._id.toString(), undefined, { skipCustomerEmail: true });
        }
      }
    }
  } catch (closeoutError) {
    log.error('Failed to check/close out order Payment after return refund completion', {
      returnId,
      error: closeoutError,
    });
  }

  log.info('Return refund marked completed', {
    returnId,
    orderId: claimed.order?.toString(),
    amount: claimed.refundAmount,
  });

  return { success: true, message: 'Refund marked as completed', return: claimed };
}

/** Unused stub kept for older callers. */
export async function checkRefundStatus(refundId: string): Promise<{
  success: boolean;
  refundId: string;
  status: 'completed';
  message: string;
}> {
  return {
    success: true,
    refundId,
    status: 'completed',
    message: 'Refunds are processed manually via the PayChangu dashboard',
  };
}
