import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import CarService from '../models/CarService';
import User from '../models/User';
import { ServiceStatus, ServiceType } from '../types/shared';
import { emailService } from '../services/emailService';

export const createCarService = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { serviceType } = req.body;

    if (!serviceType) {
      res.status(400).json({
        message: 'Service type is required',
      });
      return;
    }

    if (!Object.values(ServiceType).includes(serviceType)) {
      res.status(400).json({ message: 'Invalid service type' });
      return;
    }

    // Support both old format (address) and new format (location object)
    let address: string;
    let vehicleDetails: any = {};

    if (req.body.location) {
      // New format from frontend: location is an object with address
      address = req.body.location.address || req.body.location;
      
      // Build vehicleDetails from vehicleType and vehicleModel
      if (req.body.vehicleType) {
        vehicleDetails.make = req.body.vehicleType;
      }
      if (req.body.vehicleModel) {
        vehicleDetails.model = req.body.vehicleModel;
      }
    } else if (req.body.address) {
      // Old format: direct address string
      address = req.body.address;
      vehicleDetails = req.body.vehicleDetails || {};
    } else {
      res.status(400).json({
        message: 'Address or location is required',
      });
      return;
    }

    if (!address) {
      res.status(400).json({
        message: 'Address is required',
      });
      return;
    }

    // Handle preferredDate - can be string or Date
    let preferredDateValue: Date | undefined;
    if (req.body.preferredDate) {
      preferredDateValue = new Date(req.body.preferredDate);
    }

    const carService = new CarService({
      user: req.user!._id,
      serviceType,
      vehicleDetails,
      address,
      preferredDate: preferredDateValue,
      notes: req.body.notes,
      price: req.body.price,
    });

    await carService.save();
    
    // Send service confirmation email
    try {
      const user = await User.findById(req.user!._id);
      if (user) {
        await emailService.sendServiceConfirmation(carService, user);
      }
    } catch (emailError) {
      console.error('Failed to send service confirmation email:', emailError);
      // Don't fail the service creation if email fails
    }
    
    // Transform response to match frontend interface
    const transformed = {
      ...carService.toObject(),
      location: {
        latitude: 0,
        longitude: 0,
        address: carService.address,
      },
      vehicleType: carService.vehicleDetails?.make || '',
      vehicleModel: carService.vehicleDetails?.model,
      estimatedCost: carService.price,
      preferredTime: carService.preferredDate ? new Date(carService.preferredDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined,
    };
    
    res.status(201).json({ service: transformed });
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

    // If authenticated and not admin, only show user's own services
    // If not authenticated (public), show all services
    // Use optional chaining to safely access user role
    if (req.user?.role && req.user.role !== 'admin') {
      query.user = req.user._id;
    }
    // If no user (public access), show all services (no filter)

    if (status) {
      query.status = status;
    }

    if (serviceType) {
      query.serviceType = serviceType;
    }

    const carServices = await CarService.find(query)
      .populate('user', 'name email phone address')
      .populate('assignedMechanic', 'name phone')
      .sort({ createdAt: -1 })
      .lean();

    // Transform to match frontend interface
    const transformedServices = carServices.map((service: any) => ({
      ...service,
      location: {
        latitude: 0, // TODO: Get from geocoding
        longitude: 0, // TODO: Get from geocoding
        address: service.address,
      },
      vehicleType: service.vehicleDetails?.make || '',
      vehicleModel: service.vehicleDetails?.model,
      estimatedCost: service.price,
      preferredTime: service.preferredDate ? new Date(service.preferredDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined,
    }));

    res.json({ services: transformedServices });
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

    // If authenticated and not admin, only allow access to own services
    // If not authenticated (public), allow access to all services
    // Use optional chaining to safely access user role
    if (req.user?.role && req.user.role !== 'admin') {
      query.user = req.user._id;
    }
    // If no user (public access), allow viewing any service

    const carService = await CarService.findOne(query)
      .populate('user', 'name email phone address')
      .populate('assignedMechanic', 'name phone')
      .lean();

    if (!carService) {
      res.status(404).json({ message: 'Car service not found' });
      return;
    }

    // Transform to match frontend interface
    const transformed = {
      ...carService,
      location: {
        latitude: 0, // TODO: Get from geocoding
        longitude: 0, // TODO: Get from geocoding
        address: (carService as any).address,
      },
      vehicleType: (carService as any).vehicleDetails?.make || '',
      vehicleModel: (carService as any).vehicleDetails?.model,
      estimatedCost: (carService as any).price,
      preferredTime: (carService as any).preferredDate ? new Date((carService as any).preferredDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined,
    };

    res.json({ service: transformed });
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
