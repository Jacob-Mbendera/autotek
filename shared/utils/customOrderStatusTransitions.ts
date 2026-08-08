import { CustomOrderStatus } from '../types/index';

const FORWARD_FLOW: CustomOrderStatus[] = [
  CustomOrderStatus.PENDING,
  CustomOrderStatus.ORDERED,
  CustomOrderStatus.RECEIVED,
  CustomOrderStatus.COMPLETED,
];

/** Statuses that require a priced quote and supplier before advancing. */
const STATUSES_REQUIRING_QUOTE = new Set<CustomOrderStatus>([
  CustomOrderStatus.ORDERED,
  CustomOrderStatus.RECEIVED,
  CustomOrderStatus.COMPLETED,
]);

const STATUS_LABELS: Record<CustomOrderStatus, string> = {
  [CustomOrderStatus.PENDING]: 'Pending',
  [CustomOrderStatus.ORDERED]: 'Ordered',
  [CustomOrderStatus.RECEIVED]: 'Received',
  [CustomOrderStatus.COMPLETED]: 'Completed',
  [CustomOrderStatus.CANCELLED]: 'Cancelled',
};

export type CustomOrderQuoteFields = {
  estimatedPrice?: number | null;
  supplier?: string | null;
};

export type CustomOrderStatusTransitionResult =
  | { ok: true }
  | { ok: false; message: string };

function forwardIndex(status: CustomOrderStatus): number {
  return FORWARD_FLOW.indexOf(status);
}

function requiresQuote(status: CustomOrderStatus): boolean {
  return STATUSES_REQUIRING_QUOTE.has(status);
}

function hasValidPrice(estimatedPrice?: number | null): boolean {
  return typeof estimatedPrice === 'number' && Number.isFinite(estimatedPrice) && estimatedPrice > 0;
}

function hasValidSupplier(supplier?: string | null): boolean {
  return typeof supplier === 'string' && supplier.trim().length > 0;
}

export function getCustomOrderStatusLabel(status: CustomOrderStatus): string {
  return STATUS_LABELS[status] ?? status;
}

function getQuoteGateMessage(
  targetStatus: CustomOrderStatus,
  fields: CustomOrderQuoteFields
): string | null {
  if (!requiresQuote(targetStatus)) return null;

  const label = getCustomOrderStatusLabel(targetStatus);
  if (!hasValidPrice(fields.estimatedPrice)) {
    return `Set an estimated price (MWK) before marking this request as ${label.toLowerCase()}.`;
  }
  if (!hasValidSupplier(fields.supplier)) {
    return `Set a supplier before marking this request as ${label.toLowerCase()}.`;
  }
  return null;
}

/** Next statuses admin may select (forward one step or cancel), given merged quote fields. */
export function getAllowedNextCustomOrderStatuses(
  currentStatus: CustomOrderStatus,
  fields: CustomOrderQuoteFields
): CustomOrderStatus[] {
  if (
    currentStatus === CustomOrderStatus.CANCELLED ||
    currentStatus === CustomOrderStatus.COMPLETED
  ) {
    return [];
  }

  const allowed: CustomOrderStatus[] = [CustomOrderStatus.CANCELLED];
  const idx = forwardIndex(currentStatus);

  if (idx >= 0 && idx < FORWARD_FLOW.length - 1) {
    const next = FORWARD_FLOW[idx + 1];
    if (!getQuoteGateMessage(next, fields)) {
      allowed.push(next);
    }
  }

  return allowed;
}

export function assertValidCustomOrderStatusTransition(
  currentStatus: CustomOrderStatus,
  newStatus: CustomOrderStatus,
  fields: CustomOrderQuoteFields
): CustomOrderStatusTransitionResult {
  if (currentStatus === newStatus) {
    return { ok: false, message: 'Custom order already has this status.' };
  }

  if (currentStatus === CustomOrderStatus.CANCELLED) {
    return { ok: false, message: 'Cancelled custom orders cannot be updated.' };
  }

  if (currentStatus === CustomOrderStatus.COMPLETED) {
    return { ok: false, message: 'Completed custom orders cannot be changed.' };
  }

  const quoteMessage = getQuoteGateMessage(newStatus, fields);
  if (quoteMessage) {
    return { ok: false, message: quoteMessage };
  }

  const allowed = getAllowedNextCustomOrderStatuses(currentStatus, fields);

  if (!allowed.includes(newStatus)) {
    const idx = forwardIndex(currentStatus);
    const nextStep = idx >= 0 && idx < FORWARD_FLOW.length - 1 ? FORWARD_FLOW[idx + 1] : null;

    if (newStatus !== CustomOrderStatus.CANCELLED && nextStep && newStatus !== nextStep) {
      return {
        ok: false,
        message: `Custom orders must advance one step at a time. Next step: ${getCustomOrderStatusLabel(nextStep)}.`,
      };
    }

    return { ok: false, message: 'This status change is not allowed.' };
  }

  return { ok: true };
}
