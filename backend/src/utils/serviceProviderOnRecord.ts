import type { Types } from 'mongoose';

type ProviderRef = Types.ObjectId | string | { _id?: Types.ObjectId | string } | null | undefined;

function refIsSet(ref: ProviderRef): boolean {
  if (!ref) return false;
  if (typeof ref === 'string') return ref.trim().length > 0;
  if (typeof ref === 'object' && '_id' in ref && ref._id) return true;
  return true;
}

export function hasCarServiceProvider(service: { assignedMechanic?: ProviderRef }): boolean {
  return refIsSet(service.assignedMechanic);
}

export function hasTowingServiceProvider(service: { assignedDriver?: ProviderRef }): boolean {
  return refIsSet(service.assignedDriver);
}
