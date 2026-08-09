/**
 * BR-09 — Estimated arrival requires an assigned provider.
 */
export const ETA_REQUIRES_PROVIDER_MESSAGE =
  'Assign a provider before setting an estimated arrival time.';

export const ETA_INVALID_DATE_MESSAGE = 'Invalid estimatedArrivalAt';

export const ETA_IN_PAST_MESSAGE = 'Estimated arrival cannot be in the past.';

export const ETA_TOO_FAR_IN_FUTURE_MESSAGE =
  'Estimated arrival is too far in the future — check the date.';

/** Grace window so a save right at the ETA moment (or clock skew) isn't rejected. */
const ETA_PAST_GRACE_MS = 5 * 60 * 1000;

/** Implausible far-future guard — catches year typos (e.g. 2025 instead of 2026 becomes ok, but 2035 is not). */
const ETA_MAX_FUTURE_MS = 90 * 24 * 60 * 60 * 1000;

export type ServiceEtaRuleResult = { ok: true } | { ok: false; message: string };

/** True when the client is setting a concrete ETA (not clearing / omitting). */
export function isSettingEstimatedArrival(estimatedArrivalAt: unknown): boolean {
  return estimatedArrivalAt !== undefined && estimatedArrivalAt !== null && estimatedArrivalAt !== '';
}

/**
 * Block setting estimatedArrivalAt when no driver/mechanic is assigned.
 * Clearing ETA (null / '') is always allowed.
 */
export function assertEstimatedArrivalRequiresProvider(
  hasProvider: boolean,
  estimatedArrivalAt: unknown
): ServiceEtaRuleResult {
  if (!isSettingEstimatedArrival(estimatedArrivalAt)) {
    return { ok: true };
  }
  if (!hasProvider) {
    return { ok: false, message: ETA_REQUIRES_PROVIDER_MESSAGE };
  }
  return { ok: true };
}

/**
 * Parse and sanity-check an incoming ETA value: valid date, not in the past
 * (small grace window for clock skew), not implausibly far in the future.
 */
export function parseAndValidateEstimatedArrival(
  estimatedArrivalAt: unknown,
  now: Date = new Date()
): { ok: true; date: Date } | { ok: false; message: string } {
  const d = new Date(estimatedArrivalAt as any);
  if (Number.isNaN(d.getTime())) {
    return { ok: false, message: ETA_INVALID_DATE_MESSAGE };
  }
  if (d.getTime() < now.getTime() - ETA_PAST_GRACE_MS) {
    return { ok: false, message: ETA_IN_PAST_MESSAGE };
  }
  if (d.getTime() > now.getTime() + ETA_MAX_FUTURE_MS) {
    return { ok: false, message: ETA_TOO_FAR_IN_FUTURE_MESSAGE };
  }
  return { ok: true, date: d };
}
