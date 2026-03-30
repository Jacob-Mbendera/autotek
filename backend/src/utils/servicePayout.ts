import Payment from '../models/Payment';
import TowingService from '../models/TowingService';
import CarService from '../models/CarService';
import ServiceProvider from '../models/ServiceProvider';
import ServicePayout from '../models/ServicePayout';
import { PaymentStatus, ServicePayoutStatus } from '../types/shared';
import type { IPayment } from '../models/Payment';

/**
 * Creates a pending payout row when a service payment completes (idempotent per payment).
 */
export async function createServicePayoutIfNeeded(payment: IPayment): Promise<void> {
  if (payment.status !== PaymentStatus.COMPLETED) {
    return;
  }

  const existing = await ServicePayout.findOne({ payment: payment._id });
  if (existing) {
    return;
  }

  if (payment.type === 'towing' && payment.towingService) {
    const ts = await TowingService.findById(payment.towingService).populate('assignedDriver');
    if (!ts?.assignedDriver) {
      return;
    }
    const pid = (ts.assignedDriver as { _id?: unknown })._id ?? ts.assignedDriver;
    const provider = await ServiceProvider.findById(pid).lean();
    if (!provider) {
      return;
    }
    await ServicePayout.create({
      payment: payment._id,
      garage: provider.garage,
      provider: provider._id,
      serviceKind: 'towing',
      service: ts._id,
      amountMwk: payment.amount,
      status: ServicePayoutStatus.PENDING,
    });
    return;
  }

  if (payment.type === 'car-service' && payment.carService) {
    const cs = await CarService.findById(payment.carService).populate('assignedMechanic');
    if (!cs?.assignedMechanic) {
      return;
    }
    const pid = (cs.assignedMechanic as { _id?: unknown })._id ?? cs.assignedMechanic;
    const provider = await ServiceProvider.findById(pid).lean();
    if (!provider) {
      return;
    }
    await ServicePayout.create({
      payment: payment._id,
      garage: provider.garage,
      provider: provider._id,
      serviceKind: 'car-service',
      service: cs._id,
      amountMwk: payment.amount,
      status: ServicePayoutStatus.PENDING,
    });
  }
}

export async function createPayoutAfterPaymentSave(paymentId: string): Promise<void> {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    return;
  }
  await createServicePayoutIfNeeded(payment);
}
