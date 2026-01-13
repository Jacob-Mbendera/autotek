import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import CarService from '../models/CarService';
import { ServiceStatus, ServiceType } from '../../shared/types';

export const createCarService = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      serviceType,
      vehicleDetails,
      address,
      preferredDate,
      notes,
      price,
    } = req.body;

    if (!serviceType || !address) {
      res.status(400).json({
        message: 'Service type and address are required',
      });
      return;
    }

    if (!Object.values(ServiceType).includes(serviceType)) {
      res.status(400).json({ message: 'Invalid service type' });
      return;
    }

    const carService = new CarService({
      user: req.user!._id,
      serviceType,
      vehicleDetails: vehicleDetails || {},
      address,
      preferredDate: preferredDate ? new Date(preferredDate) : undefined,
      notes,
      price,
    });

    await carService.save();
    res.status(201).json(carService);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create car service' });
  }
};

export const getCarServices = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const query: any = {};
    const { status, serviceType } = req.query;

    // If not admin, only show user's own services
    if (req.user!.role !== 'admin') {
      query.user = req.user!._id;
    }

    if (status) {
      query.status = status;
    }

    if (serviceType) {
      query.serviceType = serviceType;
    }

    const carServices = await CarService.find(query)
      .populate('user', 'name email phone address')
      .populate('assignedMechanic', 'name phone')
      .sort({ createdAt: -1 });

    res.json(carServices);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch car services' });
  }
};

export const getCarService = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const query: any = { _id: req.params.id };

    // If not admin, only allow access to own services
    if (req.user!.role !== 'admin') {
      query.user = req.user!._id;
    }

    const carService = await CarService.findOne(query)
      .populate('user', 'name email phone address')
      .populate('assignedMechanic', 'name phone');

    if (!carService) {
      res.status(404).json({ message: 'Car service not found' });
      return;
    }

    res.json(carService);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch car service' });
  }
};

export const updateCarService = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { status, assignedMechanic, price, notes } = req.body;

    const carService = await CarService.findById(req.params.id);
    if (!carService) {
      res.status(404).json({ message: 'Car service not found' });
      return;
    }

    // Only admin can update status and assign mechanic
    if (req.user!.role === 'admin') {
      if (status && !Object.values(ServiceStatus).includes(status)) {
        res.status(400).json({ message: 'Invalid status' });
        return;
      }

      if (status) carService.status = status;
      if (assignedMechanic) carService.assignedMechanic = assignedMechanic;
      if (price !== undefined) carService.price = price;
      if (notes !== undefined) carService.notes = notes;
    } else {
      // Users can only update their own service if it's pending
      if (carService.user.toString() !== req.user!._id.toString()) {
        res.status(403).json({ message: 'Access denied' });
        return;
      }

      if (status === ServiceStatus.CANCELLED && carService.status === ServiceStatus.PENDING) {
        carService.status = ServiceStatus.CANCELLED;
      } else {
        res.status(403).json({ message: 'You can only cancel pending services' });
        return;
      }
    }

    await carService.save();
    res.json(carService);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update car service' });
  }
};
