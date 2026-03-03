import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import TowingService from '../models/TowingService';
import { ServiceStatus } from '../types/shared';

export const createTowingService = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { pickupLocation, destination, vehicleDetails, price } = req.body;

    if (!pickupLocation || !destination) {
      res.status(400).json({
        message: 'Pickup location and destination are required',
      });
      return;
    }

    const towingService = new TowingService({
      user: req.user!._id,
      pickupLocation,
      destination,
      vehicleDetails: vehicleDetails || {},
      price,
    });

    await towingService.save();
    res.status(201).json(towingService);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create towing service' });
  }
};

export const getTowingServices = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const query: any = {};
    const { status } = req.query;

    // If authenticated and not admin, only show user's own services
    // If not authenticated (public), show all services
    // Safely check user without accessing role if undefined
    const user = req.user;
    if (user) {
      const userRole = user.role;
      if (userRole && userRole !== 'admin') {
        query.user = user._id;
      }
    }
    // If no user (public access), show all services (no filter)

    if (status) {
      query.status = status;
    }

    const towingServices = await TowingService.find(query)
      .populate('user', 'name email phone')
      .populate('assignedDriver', 'name phone')
      .sort({ createdAt: -1 });

    res.json(towingServices);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch towing services' });
  }
};

export const getTowingService = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const query: any = { _id: req.params.id };

    // If authenticated and not admin, only allow access to own services
    // If not authenticated (public), allow access to all services
    // Use optional chaining to safely access user role
    if (req.user?.role && req.user.role !== 'admin') {
      query.user = req.user._id;
    }
    // If no user (public access), allow viewing any service

    const towingService = await TowingService.findOne(query)
      .populate('user', 'name email phone address')
      .populate('assignedDriver', 'name phone');

    if (!towingService) {
      res.status(404).json({ message: 'Towing service not found' });
      return;
    }

    res.json(towingService);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch towing service' });
  }
};

export const updateTowingService = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { status, assignedDriver, price } = req.body;

    const towingService = await TowingService.findById(req.params.id);
    if (!towingService) {
      res.status(404).json({ message: 'Towing service not found' });
      return;
    }

    // Only admin can update status and assign driver
    if (req.user!.role === 'admin') {
      if (status && !Object.values(ServiceStatus).includes(status)) {
        res.status(400).json({ message: 'Invalid status' });
        return;
      }

      if (status) towingService.status = status;
      if (assignedDriver) towingService.assignedDriver = assignedDriver;
      if (price !== undefined) towingService.price = price;
    } else {
      // Users can only update their own service if it's pending
      if (towingService.user.toString() !== req.user!._id.toString()) {
        res.status(403).json({ message: 'Access denied' });
        return;
      }

      if (status === ServiceStatus.CANCELLED && towingService.status === ServiceStatus.PENDING) {
        towingService.status = ServiceStatus.CANCELLED;
      } else {
        res.status(403).json({ message: 'You can only cancel pending services' });
        return;
      }
    }

    await towingService.save();
    res.json(towingService);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update towing service' });
  }
};
