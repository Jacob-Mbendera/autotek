import { PaymentStatus, ServiceStatus } from '../types/index';

const FORWARD_FLOW: ServiceStatus[] = [
  ServiceStatus.PENDING,
  ServiceStatus.ASSIGNED,
  ServiceStatus.IN_PROGRESS,
  ServiceStatus.COMPLETED,
];

const STATUSES_REQUIRING_PROVIDER = new Set<ServiceStatus>([
  ServiceStatus.ASSIGNED,
  ServiceStatus.IN_PROGRESS,
  ServiceStatus.COMPLETED,
]);

/** BR-07 Option A — pay before work starts (assigned may be unpaid). */
const STATUSES_REQUIRING_PAYMENT = new Set<ServiceStatus>([
  ServiceStatus.IN_PROGRESS,
  ServiceStatus.COMPLETED,
]);

const STATUS_LABELS: Record<ServiceStatus, string> = {
  [ServiceStatus.PENDING]: 'Pending',
  [ServiceStatus.ASSIGNED]: 'Assigned',
  [ServiceStatus.IN_PROGRESS]: 'In Progress',
  [ServiceStatus.COMPLETED]: 'Completed',
  [ServiceStatus.CANCELLED]: 'Cancelled',
};

export type ServiceStatusTransitionResult =
  | { ok: true }
  | { ok: false; message: string };

function forwardIndex(status: ServiceStatus): number {
  return FORWARD_FLOW.indexOf(status);
}

function requiresProvider(status: ServiceStatus): boolean {
  return STATUSES_REQUIRING_PROVIDER.has(status);
}

function requiresPayment(status: ServiceStatus): boolean {
  return STATUSES_REQUIRING_PAYMENT.has(status);
}

function isPaymentCompleted(paymentStatus: string): boolean {
  return paymentStatus === PaymentStatus.COMPLETED;
}

export function getServiceStatusLabel(status: ServiceStatus): string {
  return STATUS_LABELS[status] ?? status;
}

/** Next statuses admin may select (forward one step or cancel). */
export function getAllowedNextServiceStatuses(
  currentStatus: ServiceStatus,
  hasProvider: boolean,
  paymentStatus: string = PaymentStatus.PENDING
): ServiceStatus[] {
  if (currentStatus === ServiceStatus.CANCELLED || currentStatus === ServiceStatus.COMPLETED) {
    return [];
  }

  const allowed: ServiceStatus[] = [ServiceStatus.CANCELLED];
  const idx = forwardIndex(currentStatus);

  if (idx >= 0 && idx < FORWARD_FLOW.length - 1) {
    const next = FORWARD_FLOW[idx + 1];
    const providerOk = !requiresProvider(next) || hasProvider;
    const paymentOk = !requiresPayment(next) || isPaymentCompleted(paymentStatus);
    if (providerOk && paymentOk) {
      allowed.push(next);
    }
  }

  return allowed;
}

export function assertValidServiceStatusTransition(
  currentStatus: ServiceStatus,
  newStatus: ServiceStatus,
  hasProvider: boolean,
  paymentStatus: string = PaymentStatus.PENDING
): ServiceStatusTransitionResult {
  if (currentStatus === newStatus) {
    return { ok: false, message: 'Service already has this status.' };
  }

  if (currentStatus === ServiceStatus.CANCELLED) {
    return { ok: false, message: 'Cancelled services cannot be updated.' };
  }

  if (currentStatus === ServiceStatus.COMPLETED) {
    return { ok: false, message: 'Completed services cannot be changed.' };
  }

  const allowed = getAllowedNextServiceStatuses(currentStatus, hasProvider, paymentStatus);

  if (!allowed.includes(newStatus)) {
    if (requiresPayment(newStatus) && !isPaymentCompleted(paymentStatus)) {
      return {
        ok: false,
        message:
          'Payment must be completed before moving to In Progress or Completed. Customer can pay while the service is Assigned.',
      };
    }

    if (requiresProvider(newStatus) && !hasProvider) {
      return {
        ok: false,
        message:
          'A driver or mechanic must be assigned before moving to Assigned or any later status.',
      };
    }

    const idx = forwardIndex(currentStatus);
    const nextStep = idx >= 0 && idx < FORWARD_FLOW.length - 1 ? FORWARD_FLOW[idx + 1] : null;

    if (newStatus !== ServiceStatus.CANCELLED && nextStep && newStatus !== nextStep) {
      return {
        ok: false,
        message: `Services must advance one step at a time. Next step: ${getServiceStatusLabel(nextStep)}.`,
      };
    }

    return { ok: false, message: 'This status change is not allowed.' };
  }

  return { ok: true };
}
