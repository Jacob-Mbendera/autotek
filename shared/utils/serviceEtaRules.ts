/**
 * BR-09 — Estimated arrival requires an assigned provider.
 */
export const ETA_REQUIRES_PROVIDER_MESSAGE =
  'Assign a provider before setting an estimated arrival time.';

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
