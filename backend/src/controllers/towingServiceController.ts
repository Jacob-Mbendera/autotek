import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import TowingService from '../models/TowingService';
import User from '../models/User';
import { ServiceStatus, UserRole } from '../types/shared';
import { emailService } from '../services/emailService';
import { geocodeAddressWithFallback } from '../utils/geocoding';

export const createTowingService = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role === UserRole.ADMIN) {
      res.status(403).json({ message: 'Admin accounts cannot create customer towing requests' });
      return;
    }

    // Support both old format (pickupLocation, destination) and new format (location, destination objects)
    let pickupLocation: string;
    let destination: string;
    let pickupLocationDescription: string | undefined;
    let destinationDescription: string | undefined;
    let vehicleDetails: any = {};

    if (req.body.location && req.body.destination) {
      // New format from frontend: location and destination are objects with address
      pickupLocation = req.body.location.address || req.body.location;
      destination = req.body.destination.address || req.body.destination;
      pickupLocationDescription = req.body.pickupDescription;
      destinationDescription = req.body.destinationDescription;

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
      pickupLocationDescription = req.body.pickupLocationDescription;
      destinationDescription = req.body.destinationDescription;
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
      pickupLocationDescription,
      destination,
      destinationDescription,
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

    // Geocode addresses for coordinates
    const pickupCoords = await geocodeAddressWithFallback(towingService.pickupLocation);
    const destCoords = await geocodeAddressWithFallback(towingService.destination);

    // Transform response to match frontend interface
    const transformed = {
      ...towingService.toObject(),
      location: {
        latitude: pickupCoords.latitude,
        longitude: pickupCoords.longitude,
        address: towingService.pickupLocation,
        description: towingService.pickupLocationDescription,
      },
      destination: {
        latitude: destCoords.latitude,
        longitude: destCoords.longitude,
        address: towingService.destination,
        description: towingService.destinationDescription,
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

    // Transform to match frontend interface with geocoded coordinates
    const transformedServices = await Promise.all(
      towingServices.map(async (service: any) => {
        const pickupCoords = await geocodeAddressWithFallback(service.pickupLocation);
        const destCoords = service.destination
          ? await geocodeAddressWithFallback(service.destination)
          : null;

        return {
          ...service,
          location: {
            latitude: pickupCoords.latitude,
            longitude: pickupCoords.longitude,
            address: service.pickupLocation,
            description: service.pickupLocationDescription,
          },
          destination: destCoords
            ? {
                latitude: destCoords.latitude,
                longitude: destCoords.longitude,
                address: service.destination,
                description: service.destinationDescription,
              }
            : undefined,
          vehicleType: service.vehicleDetails?.make || '',
          vehicleModel: service.vehicleDetails?.model,
          estimatedCost: service.price,
        };
      })
    );

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

    // Geocode addresses for coordinates
    const pickupCoords = await geocodeAddressWithFallback((towingService as any).pickupLocation);
    const destCoords = (towingService as any).destination
      ? await geocodeAddressWithFallback((towingService as any).destination)
      : null;

    // Transform to match frontend interface
    const transformed = {
      ...towingService,
      location: {
        latitude: pickupCoords.latitude,
        longitude: pickupCoords.longitude,
        address: (towingService as any).pickupLocation,
        description: (towingService as any).pickupLocationDescription,
      },
      destination: destCoords
        ? {
            latitude: destCoords.latitude,
            longitude: destCoords.longitude,
            address: (towingService as any).destination,
            description: (towingService as any).destinationDescription,
          }
        : undefined,
      vehicleType: (towingService as any).vehicleDetails?.make || '',
      vehicleModel: (towingService as any).vehicleDetails?.model,
      estimatedCost: (towingService as any).price,
    };

    res.json({ service: transformed });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch towing service' });
  }
};

export const cancelTowingService = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const towingService = await TowingService.findById(req.params.id).populate('payment');

    if (!towingService) {
      res.status(404).json({ message: 'Towing service not found' });
      return;
    }

    // Verify ownership (unless admin)
    if (req.user!.role !== 'admin' && towingService.user.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Not authorized to cancel this service' });
      return;
    }

    // Check if service can be cancelled
    if (towingService.status === ServiceStatus.CANCELLED) {
      res.status(400).json({ message: 'Service is already cancelled' });
      return;
    }

    if (towingService.status === ServiceStatus.COMPLETED) {
      res.status(400).json({ message: 'Cannot cancel a completed service' });
      return;
    }

    if (towingService.status === ServiceStatus.IN_PROGRESS) {
      res.status(400).json({
        message: 'Cannot cancel service in progress. Please contact support.',
        canCancel: false
      });
      return;
    }

    // Update service status
    towingService.status = ServiceStatus.CANCELLED;
    await towingService.save();

    // TODO: Handle refund if payment was completed
    // This will be implemented when we add payment integration for services
    let refundInfo = null;
    if (towingService.paymentStatus === 'completed') {
      // Future: Process refund via PayChangu API
      refundInfo = {
        message: 'Refund will be processed within 3-5 business days',
        refundAmount: towingService.price,
        status: 'pending'
      };
    }

    res.json({
      message: 'Service cancelled successfully',
      service: towingService,
      refund: refundInfo
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to cancel towing service' });
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
      // Users should use /cancel endpoint instead
      res.status(403).json({ message: 'Use /cancel endpoint to cancel services' });
      return;
    }

    await towingService.save();
    res.json(towingService);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update towing service' });
  }
};
