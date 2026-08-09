import { ServiceStatus } from '../types/index';

/**
 * BR-10 — Keep assignment and status in sync when admin saves a provider
 * without an explicit status change in the same request.
 *
 * - pending + provider set → assigned
 * - assigned + provider cleared → pending
 * - in-progress / completed / cancelled: no auto status change from this helper
 */
export function resolveAutoStatusForProviderChange(params: {
  previousStatus: ServiceStatus;
  hasProvider: boolean;
  /** When admin also sent `status` in the same request, skip auto sync. */
  explicitStatusProvided: boolean;
}): ServiceStatus | null {
  if (params.explicitStatusProvided) {
    return null;
  }

  if (params.hasProvider && params.previousStatus === ServiceStatus.PENDING) {
    return ServiceStatus.ASSIGNED;
  }

  if (!params.hasProvider && params.previousStatus === ServiceStatus.ASSIGNED) {
    return ServiceStatus.PENDING;
  }

  return null;
}

export const PROVIDER_REQUIRED_WHILE_IN_PROGRESS_MESSAGE =
  'Cannot remove the assigned provider while the service is in progress. Move it back to Assigned first, or cancel the service.';

export const PROVIDER_REQUIRED_WHILE_COMPLETED_MESSAGE =
  'Cannot remove the assigned provider from a completed service. The provider record is needed for ratings and payout history.';
