import ServiceProvider from '../models/ServiceProvider';
import TowingService from '../models/TowingService';
import CarService from '../models/CarService';
import { ProviderType, ProviderVettingStatus, ServiceStatus } from '../types/shared';
import type { Types } from 'mongoose';

const NON_WORKLOAD_STATUSES: ServiceStatus[] = [
  ServiceStatus.COMPLETED,
  ServiceStatus.CANCELLED,
];

export async function countActiveAssignmentsForProvider(
  providerId: Types.ObjectId | string,
  providerType: ProviderType
): Promise<number> {
  const id = typeof providerId === 'string' ? providerId : providerId.toString();
  if (providerType === ProviderType.DRIVER) {
    return TowingService.countDocuments({
      assignedDriver: id,
      status: { $nin: NON_WORKLOAD_STATUSES },
    });
  }
  return CarService.countDocuments({
    assignedMechanic: id,
    status: { $nin: NON_WORKLOAD_STATUSES },
  });
}

export async function assertProviderAssignable(
  providerId: string,
  expectedType: ProviderType
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!providerId || !providerId.match(/^[a-fA-F0-9]{24}$/)) {
    return { ok: false, message: 'Invalid provider id' };
  }
  const p = await ServiceProvider.findById(providerId).lean();
  if (!p) {
    return { ok: false, message: 'Provider not found' };
  }
  if (p.providerType !== expectedType) {
    return {
      ok: false,
      message:
        expectedType === ProviderType.DRIVER
          ? 'Only a vetted driver can be assigned to towing'
          : 'Only a vetted mechanic can be assigned to car services',
    };
  }
  if (p.vettingStatus !== ProviderVettingStatus.VETTED) {
    return { ok: false, message: 'Provider must be vetted before assignment' };
  }
  if (!p.active) {
    return { ok: false, message: 'Provider is not active for assignment' };
  }
  return { ok: true };
}
