import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import CarService from '../models/CarService';
import TowingService from '../models/TowingService';
import User from '../models/User';
import { ServiceStatus } from '../types/shared';
import { assertValidServiceStatusTransition } from '../utils/serviceStatusTransitions';
import { populateAssignedDriver, populateAssignedMechanic } from '../utils/populateServiceProvider';
import { emailService } from '../services/emailService';

/** The only forward steps a mechanic may trigger themselves (mirrors assertValidServiceStatusTransition's flow). */
const MECHANIC_ALLOWED_TRANSITIONS: Partial<Record<ServiceStatus, ServiceStatus>> = {
  [ServiceStatus.ASSIGNED]: ServiceStatus.IN_PROGRESS,
  [ServiceStatus.IN_PROGRESS]: ServiceStatus.COMPLETED,
};

export const getMyAssignedServices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const providerId = req.user!.serviceProvider;
    if (!providerId) {
      res.json({ carServices: [], towingServices: [] });
      return;
    }

    const [carServices, towingServices] = await Promise.all([
      CarService.find({ assignedMechanic: providerId })
        .populate('user', 'name email phone')
        .populate(populateAssignedMechanic)
        .sort({ createdAt: -1 })
        .lean(),
      TowingService.find({ assignedDriver: providerId })
        .populate('user', 'name email phone')
        .populate(populateAssignedDriver)
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    res.json({ carServices, towingServices });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to load assigned services' });
  }
};

async function advanceServiceStatus(
  service: { status: ServiceStatus; paymentStatus: string; user: unknown; _id: unknown; save: () => Promise<unknown> }
): Promise<{ ok: true; previousStatus: ServiceStatus; nextStatus: ServiceStatus } | { ok: false; status: number; message: string }> {
  const previousStatus = service.status;
  const nextStatus = MECHANIC_ALLOWED_TRANSITIONS[previousStatus];
  if (!nextStatus) {
    return { ok: false, status: 400, message: 'This job cannot be advanced from its current status' };
  }

  const transition = assertValidServiceStatusTransition(previousStatus, nextStatus, true, service.paymentStatus);
  if (!transition.ok) {
    return { ok: false, status: 400, message: transition.message };
  }

  service.status = nextStatus;
  await service.save();
  return { ok: true, previousStatus, nextStatus };
}

export const updateMyServiceStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const providerId = req.user!.serviceProvider;
    if (!providerId) {
      res.status(403).json({ message: 'No provider account linked to this login' });
      return;
    }

    const { type, id } = req.params;
    if (type !== 'car-service' && type !== 'towing') {
      res.status(400).json({ message: 'Invalid service type' });
      return;
    }

    if (type === 'car-service') {
      const service = await CarService.findById(id);
      if (!service) {
        res.status(404).json({ message: 'Service not found' });
        return;
      }
      if (!service.assignedMechanic || service.assignedMechanic.toString() !== providerId.toString()) {
        res.status(403).json({ message: 'This job is not assigned to you' });
        return;
      }

      const result = await advanceServiceStatus(service);
      if (!result.ok) {
        res.status(result.status).json({ message: result.message });
        return;
      }

      const updated = await CarService.findById(service._id).populate(populateAssignedMechanic).lean();
      await notifyCustomerOfStatusChange('car-service', service.user, updated, result.previousStatus);
      res.json(updated);
      return;
    }

    const service = await TowingService.findById(id);
    if (!service) {
      res.status(404).json({ message: 'Service not found' });
      return;
    }
    if (!service.assignedDriver || service.assignedDriver.toString() !== providerId.toString()) {
      res.status(403).json({ message: 'This job is not assigned to you' });
      return;
    }

    const result = await advanceServiceStatus(service);
    if (!result.ok) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    const updated = await TowingService.findById(service._id).populate(populateAssignedDriver).lean();
    await notifyCustomerOfStatusChange('towing', service.user, updated, result.previousStatus);
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Failed to update service status' });
  }
};

async function notifyCustomerOfStatusChange(
  kind: 'car-service' | 'towing',
  userId: unknown,
  updated: unknown,
  previousStatus: ServiceStatus
): Promise<void> {
  try {
    const user = await User.findById(userId as string);
    if (user && updated) {
      await emailService.sendServiceStatusUpdate({
        kind,
        service: updated as Record<string, unknown>,
        user,
        previousStatus,
      });
    }
  } catch (emailError) {
    // Don't fail the update if email fails
  }
}
