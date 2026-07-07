import { OrderStatus, PaymentStatus } from '../types/index';

const FORWARD_FLOW: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PROCESSING,
  OrderStatus.DISPATCHED,
  OrderStatus.READY_FOR_COLLECTION,
  OrderStatus.COMPLETED,
];

const STATUSES_REQUIRING_PAYMENT = new Set<OrderStatus>([
  OrderStatus.PROCESSING,
  OrderStatus.DISPATCHED,
  OrderStatus.READY_FOR_COLLECTION,
  OrderStatus.COMPLETED,
]);

const STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'Pending',
  [OrderStatus.PROCESSING]: 'Processing',
  [OrderStatus.DISPATCHED]: 'Dispatched',
  [OrderStatus.READY_FOR_COLLECTION]: 'Ready for collection',
  [OrderStatus.COMPLETED]: 'Collected',
  [OrderStatus.CANCELLED]: 'Cancelled',
};

export type OrderStatusTransitionResult =
  | { ok: true }
  | { ok: false; message: string };

function forwardIndex(status: OrderStatus): number {
  return FORWARD_FLOW.indexOf(status);
}

function requiresPayment(status: OrderStatus): boolean {
  return STATUSES_REQUIRING_PAYMENT.has(status);
}

export function getOrderStatusLabel(status: OrderStatus): string {
  return STATUS_LABELS[status] ?? status;
}

function isPaymentCompleted(paymentStatus: string): boolean {
  return paymentStatus === PaymentStatus.COMPLETED;
}

/** Next statuses admin may select (forward one step or cancel). */
export function getAllowedNextOrderStatuses(
  currentStatus: OrderStatus,
  paymentStatus: string
): OrderStatus[] {
  if (currentStatus === OrderStatus.CANCELLED || currentStatus === OrderStatus.COMPLETED) {
    return [];
  }

  const allowed: OrderStatus[] = [OrderStatus.CANCELLED];
  const idx = forwardIndex(currentStatus);

  if (idx >= 0 && idx < FORWARD_FLOW.length - 1) {
    const next = FORWARD_FLOW[idx + 1];
    if (!requiresPayment(next) || isPaymentCompleted(paymentStatus)) {
      allowed.push(next);
    }
  }

  return allowed;
}

export function assertValidOrderStatusTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
  paymentStatus: string
): OrderStatusTransitionResult {
  if (currentStatus === newStatus) {
    return { ok: false, message: 'Order already has this status.' };
  }

  if (currentStatus === OrderStatus.CANCELLED) {
    return { ok: false, message: 'Cancelled orders cannot be updated.' };
  }

  if (currentStatus === OrderStatus.COMPLETED) {
    return { ok: false, message: 'Collected orders cannot be changed.' };
  }

  const allowed = getAllowedNextOrderStatuses(currentStatus, paymentStatus);

  if (!allowed.includes(newStatus)) {
    if (requiresPayment(newStatus) && !isPaymentCompleted(paymentStatus)) {
      return {
        ok: false,
        message:
          'Payment must be completed before moving to Processing or any later pickup status.',
      };
    }

    const idx = forwardIndex(currentStatus);
    const nextStep = idx >= 0 && idx < FORWARD_FLOW.length - 1 ? FORWARD_FLOW[idx + 1] : null;

    if (newStatus !== OrderStatus.CANCELLED && nextStep && newStatus !== nextStep) {
      return {
        ok: false,
        message: `Orders must advance one step at a time. Next step: ${getOrderStatusLabel(nextStep)}.`,
      };
    }

    return { ok: false, message: 'This status change is not allowed.' };
  }

  return { ok: true };
}
