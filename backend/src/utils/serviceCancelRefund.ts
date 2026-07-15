/**
 * BR-06 — Queue manual PayChangu refund when a paid towing/car service is cancelled.
 * PayChangu has no refund API for this merchant — admin completes via dashboard.
 */
import Payment from '../models/Payment';
import { PaymentStatus } from '../types/shared';
import {
  CUSTOMER_REFUND_PENDING_MESSAGE,
  queueManualRefund,
} from './paymentRefunds';
import { log } from './logger';

export type ServiceRefundKind = 'towing' | 'car-service';

export interface ServiceCancelRefundResult {
  attempted: boolean;
  success: boolean;
  pending: boolean;
  refundAmount?: number;
  message: string;
}

export async function processPaidServiceCancelRefund(params: {
  kind: ServiceRefundKind;
  serviceId: string;
  reason?: string;
}): Promise<ServiceCancelRefundResult> {
  const { kind, serviceId, reason } = params;

  const paymentQuery =
    kind === 'towing'
      ? { towingService: serviceId, status: PaymentStatus.COMPLETED }
      : { carService: serviceId, status: PaymentStatus.COMPLETED };

  const payment = await Payment.findOne(paymentQuery);

  if (!payment) {
    return {
      attempted: false,
      success: false,
      pending: false,
      message: 'No completed payment found for this service',
    };
  }

  if (!payment.transactionId) {
    log.warn('Service cancel refund skipped: missing transactionId', {
      kind,
      serviceId,
      paymentId: payment._id.toString(),
    });
    return {
      attempted: true,
      success: false,
      pending: false,
      refundAmount: payment.amount,
      message: 'Payment found but missing transaction reference for refund',
    };
  }

  const result = await queueManualRefund({
    paymentId: payment._id.toString(),
    transactionId: payment.transactionId,
    amount: payment.amount,
    reason: reason || 'Service cancelled by customer',
    referenceId: serviceId,
  });

  return {
    attempted: true,
    success: result.success,
    pending: result.pending,
    refundAmount: result.amount ?? payment.amount,
    message: result.success
      ? CUSTOMER_REFUND_PENDING_MESSAGE
      : result.message,
  };
}
