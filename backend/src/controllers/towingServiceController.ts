import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import TowingService from '../models/TowingService';
import User from '../models/User';
import { ServiceStatus } from '../types/shared';
import { emailService } from '../services/emailService';

export const createTowingService = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Support both old format (pickupLocation, destination) and new format (location, destination objects)
    let pickupLocation: string;
    let destination: string;
    let vehicleDetails: any = {};

    if (req.body.location && req.body.destination) {
      // New format from frontend: location and destination are objects with address
      pickupLocation = req.body.location.address || req.body.location;
      destination = req.body.destination.address || req.body.destination;
      
      // Build vehicleDetails from vehicleType and vehicleModel
      if (req.body.vehicleType) {
        vehicleDetails.make = req.body.vehicleType;
      }
      if (req.body.vehicleModel) {
        vehicleDetails.model = req.body.vehicleModel;
      }
    } else if (req.body.pickupLocation && req.body.destination) {
      // Old format: direct strings
      pickupLocation = req.body.pickupLocation;
      destination = req.body.destination;
      vehicleDetails = req.body.vehicleDetails || {};
    } else {
      res.status(400).json({
        message: 'Pickup location and destination are required',
      });
      return;
    }

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
      vehicleDetails,
      price: req.body.price,
    });

    await towingService.save();
    
    // Send service confirmation email
    try {
      const user = await User.findById(req.user!._id);
      if (user) {
        await emailService.sendServiceConfirmation(towingService, user);
      }
    } catch (emailError) {
      console.error('Failed to send service confirmation email:', emailError);
      // Don't fail the service creation if email fails
    }
    
    // Transform response to match frontend interface
    const transformed = {
      ...towingService.toObject(),
      location: {
        latitude: 0,
        longitude: 0,
        address: towingService.pickupLocation,
      },
      destination: {
        latitude: 0,
        longitude: 0,
        address: towingService.destination,
      },
      vehicleType: towingService.vehicleDetails?.make || '',
      vehicleModel: towingService.vehicleDetails?.model,
      estimatedCost: towingService.price,
    };
    
    res.status(201).json({ service: transformed });
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
      .sort({ createdAt: -1 })
      .lean();

    // Transform to match frontend interface
    const transformedServices = towingServices.map((service: any) => ({
      ...service,
      location: {
        latitude: 0, // TODO: Get from geocoding
        longitude: 0, // TODO: Get from geocoding
        address: service.pickupLocation,
      },
      destination: service.destination ? {
        latitude: 0, // TODO: Get from geocoding
        longitude: 0, // TODO: Get from geocoding
        address: service.destination,
      } : undefined,
      vehicleType: service.vehicleDetails?.make || '',
      vehicleModel: service.vehicleDetails?.model,
      estimatedCost: service.price,
    }));

    res.json({ services: transformedServices });
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
      .populate('assignedDriver', 'name phone')
      .lean();

    if (!towingService) {
      res.status(404).json({ message: 'Towing service not found' });
      return;
    }

    // Transform to match frontend interface
    const transformed = {
      ...towingService,
      location: {
        latitude: 0, // TODO: Get from geocoding
        longitude: 0, // TODO: Get from geocoding
        address: (towingService as any).pickupLocation,
      },
      destination: (towingService as any).destination ? {
        latitude: 0, // TODO: Get from geocoding
        longitude: 0, // TODO: Get from geocoding
        address: (towingService as any).destination,
      } : undefined,
      vehicleType: (towingService as any).vehicleDetails?.make || '',
      vehicleModel: (towingService as any).vehicleDetails?.model,
      estimatedCost: (towingService as any).price,
    };

    res.json({ service: transformed });
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
