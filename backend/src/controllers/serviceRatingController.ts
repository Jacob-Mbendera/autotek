import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import TowingService from '../models/TowingService';
import CarService from '../models/CarService';
import ServiceRating from '../models/ServiceRating';
import { ServiceStatus } from '../types/shared';
import { updateServiceProviderRatingAggregate } from '../utils/serviceProviderRating';

export const rateTowingProvider = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rating, comment } = req.body;
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5 || !Number.isInteger(r)) {
      res.status(400).json({ message: 'rating must be an integer from 1 to 5' });
      return;
    }
    const ts = await TowingService.findById(req.params.id);
    if (!ts) {
      res.status(404).json({ message: 'Service not found' });
      return;
    }
    if (ts.user.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Not allowed' });
      return;
    }
    if (ts.status !== ServiceStatus.COMPLETED) {
      res.status(400).json({ message: 'You can rate only after the service is completed' });
      return;
    }
    if (!ts.assignedDriver) {
      res.status(400).json({ message: 'No provider was assigned to this service' });
      return;
    }
    const existing = await ServiceRating.findOne({
      user: req.user!._id,
      serviceKind: 'towing',
      service: ts._id,
    });
    if (existing) {
      res.status(400).json({ message: 'You have already rated this service' });
      return;
    }
    await ServiceRating.create({
      serviceKind: 'towing',
      service: ts._id,
      user: req.user!._id,
      provider: ts.assignedDriver,
      rating: r,
      comment: typeof comment === 'string' ? comment.trim().slice(0, 2000) : undefined,
    });
    await updateServiceProviderRatingAggregate(ts.assignedDriver, r);
    res.json({ message: 'Thank you for your rating' });
  } catch (e: any) {
    if (e.code === 11000) {
      res.status(400).json({ message: 'You have already rated this service' });
      return;
    }
    res.status(500).json({ message: e.message || 'Failed to submit rating' });
  }
};

export const rateCarServiceProvider = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rating, comment } = req.body;
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5 || !Number.isInteger(r)) {
      res.status(400).json({ message: 'rating must be an integer from 1 to 5' });
      return;
    }
    const cs = await CarService.findById(req.params.id);
    if (!cs) {
      res.status(404).json({ message: 'Service not found' });
      return;
    }
    if (cs.user.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Not allowed' });
      return;
    }
    if (cs.status !== ServiceStatus.COMPLETED) {
      res.status(400).json({ message: 'You can rate only after the service is completed' });
      return;
    }
    if (!cs.assignedMechanic) {
      res.status(400).json({ message: 'No provider was assigned to this service' });
      return;
    }
    const existing = await ServiceRating.findOne({
      user: req.user!._id,
      serviceKind: 'car-service',
      service: cs._id,
    });
    if (existing) {
      res.status(400).json({ message: 'You have already rated this service' });
      return;
    }
    await ServiceRating.create({
      serviceKind: 'car-service',
      service: cs._id,
      user: req.user!._id,
      provider: cs.assignedMechanic,
      rating: r,
      comment: typeof comment === 'string' ? comment.trim().slice(0, 2000) : undefined,
    });
    await updateServiceProviderRatingAggregate(cs.assignedMechanic, r);
    res.json({ message: 'Thank you for your rating' });
  } catch (e: any) {
    if (e.code === 11000) {
      res.status(400).json({ message: 'You have already rated this service' });
      return;
    }
    res.status(500).json({ message: e.message || 'Failed to submit rating' });
  }
};
