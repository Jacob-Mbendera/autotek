import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import CarService from '../models/CarService';
import User from '../models/User';
import { ServiceStatus, ServiceType, UserRole } from '../types/shared';
import { emailService } from '../services/emailService';
import { geocodeAddressWithFallback } from '../utils/geocoding';
import { validateQuoteContactPhones } from '../utils/phoneValidation';

export const createCarService = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role === UserRole.ADMIN) {
      res.status(403).json({ message: 'Admin accounts cannot create customer car service requests' });
      return;
    }

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
    let addressDescription: string | undefined;
    let vehicleDetails: any = {};

    if (req.body.location) {
      // New format from frontend: location is an object with address
      address = req.body.location.address || req.body.location;
      addressDescription = req.body.addressDescription;

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
      addressDescription = req.body.addressDescription;
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
      addressDescription,
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

    // Geocode address for coordinates
    const coords = await geocodeAddressWithFallback(carService.address);

    const prefCreated = carService.preferredDate ? new Date(carService.preferredDate) : null;

    // Transform response to match frontend interface
    const transformed = {
      ...carService.toObject(),
      location: {
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: carService.address,
        description: carService.addressDescription,
      },
      vehicleType: carService.vehicleDetails?.make || '',
      vehicleModel: carService.vehicleDetails?.model,
      estimatedCost: carService.price,
      preferredDate: prefCreated ? prefCreated.toISOString() : undefined,
      preferredTime: prefCreated
        ? prefCreated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : undefined,
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
    if (!req.user) {
      res.json({ services: [] });
      return;
    }

    const query: any = {};
    const { status, serviceType } = req.query;

    if (req.user.role !== UserRole.ADMIN) {
      query.user = req.user._id;
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
      .sort({ createdAt: -1 })
      .lean();

    // Transform to match frontend interface with geocoded coordinates
    const transformedServices = await Promise.all(
      carServices.map(async (service: any) => {
        const coords = await geocodeAddressWithFallback(service.address);

        const pref = service.preferredDate ? new Date(service.preferredDate) : null;
        return {
          ...service,
          location: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            address: service.address,
            description: service.addressDescription,
          },
          vehicleType: service.vehicleDetails?.make || '',
          vehicleModel: service.vehicleDetails?.model,
          estimatedCost: service.price,
          preferredDate: pref ? pref.toISOString() : undefined,
          preferredTime: pref
            ? pref.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : undefined,
        };
      })
    );

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
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const query: any = { _id: req.params.id };

    if (req.user.role !== UserRole.ADMIN) {
      query.user = req.user._id;
    }

    const carService = await CarService.findOne(query)
      .populate('user', 'name email phone address')
      .populate('assignedMechanic', 'name phone')
      .lean();

    if (!carService) {
      res.status(404).json({ message: 'Car service not found' });
      return;
    }

    // Geocode address for coordinates
    const coords = await geocodeAddressWithFallback((carService as any).address);

    const prefSingle = (carService as any).preferredDate
      ? new Date((carService as any).preferredDate)
      : null;

    // Transform to match frontend interface
    const transformed = {
      ...carService,
      location: {
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: (carService as any).address,
        description: (carService as any).addressDescription,
      },
      vehicleType: (carService as any).vehicleDetails?.make || '',
      vehicleModel: (carService as any).vehicleDetails?.model,
      estimatedCost: (carService as any).price,
      preferredDate: prefSingle ? prefSingle.toISOString() : undefined,
      preferredTime: prefSingle
        ? prefSingle.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : undefined,
    };

    res.json({ service: transformed });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch car service' });
  }
};

export const cancelCarService = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const carService = await CarService.findById(req.params.id).populate('payment');

    if (!carService) {
      res.status(404).json({ message: 'Car service not found' });
      return;
    }

    // Verify ownership (unless admin)
    if (req.user!.role !== 'admin' && carService.user.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Not authorized to cancel this service' });
      return;
    }

    // Check if service can be cancelled
    if (carService.status === ServiceStatus.CANCELLED) {
      res.status(400).json({ message: 'Service is already cancelled' });
      return;
    }

    if (carService.status === ServiceStatus.COMPLETED) {
      res.status(400).json({ message: 'Cannot cancel a completed service' });
      return;
    }

    if (carService.status === ServiceStatus.IN_PROGRESS) {
      res.status(400).json({
        message: 'Cannot cancel service in progress. Please contact support.',
        canCancel: false
      });
      return;
    }

    // Update service status
    carService.status = ServiceStatus.CANCELLED;
    await carService.save();

    // TODO: Handle refund if payment was completed
    // This will be implemented when we add payment integration for services
    let refundInfo = null;
    if (carService.paymentStatus === 'completed') {
      // Future: Process refund via PayChangu API
      refundInfo = {
        message: 'Refund will be processed within 3-5 business days',
        refundAmount: carService.price,
        status: 'pending'
      };
    }

    res.json({
      message: 'Service cancelled successfully',
      service: carService,
      refund: refundInfo
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to cancel car service' });
  }
};

export const requestCarServiceQuote = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role === UserRole.ADMIN) {
      res.status(403).json({ message: 'Admin accounts cannot use this customer action' });
      return;
    }

    const { mobilePhone, whatsAppPhone, quoteRequestNotes } = req.body;
    const validated = validateQuoteContactPhones(mobilePhone, whatsAppPhone);
    if (!validated.ok) {
      res.status(400).json({ message: validated.message });
      return;
    }

    let notes: string | undefined;
    if (quoteRequestNotes != null && quoteRequestNotes !== '') {
      if (typeof quoteRequestNotes !== 'string') {
        res.status(400).json({ message: 'Invalid notes' });
        return;
      }
      const t = quoteRequestNotes.trim().slice(0, 500);
      notes = t || undefined;
    }

    const carService = await CarService.findOne({
      _id: req.params.id,
      user: req.user!._id,
    });
    if (!carService) {
      res.status(404).json({ message: 'Car service not found' });
      return;
    }
    if (
      carService.status === ServiceStatus.CANCELLED ||
      carService.status === ServiceStatus.COMPLETED
    ) {
      res.status(400).json({ message: 'Cannot request a quote for this service' });
      return;
    }
    const price = carService.price;
    if (price != null && price > 0) {
      res.status(400).json({ message: 'A price is already set for this request' });
      return;
    }

    carService.quoteMobilePhone = validated.mobilePhone;
    carService.quoteWhatsAppPhone = validated.whatsAppPhone;
    carService.quoteRequestNotes = notes;
    carService.quoteRequestSubmittedAt = new Date();
    await carService.save();

    const user = await User.findById(req.user!._id).lean();
    const customerName = user?.name || 'Customer';
    const customerEmail = user?.email || '';

    const vehicleStr =
      [carService.vehicleDetails?.make, carService.vehicleDetails?.model]
        .filter(Boolean)
        .join(' ') || 'Not specified';

    await emailService.sendAdminServiceQuoteRequest({
      kind: 'car-service',
      serviceId: carService._id.toString(),
      customerName,
      customerEmail,
      mobilePhone: validated.mobilePhone,
      whatsAppPhone: validated.whatsAppPhone,
      quoteRequestNotes: notes,
      summaryEntries: [
        { label: 'Service type', value: String(carService.serviceType) },
        { label: 'Address', value: carService.address },
        { label: 'Vehicle', value: vehicleStr },
      ],
    });

    res.json({
      message:
        'Your quote request was sent. We will contact you on the numbers you provided to confirm your details before setting the price in MWK.',
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to submit quote request' });
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
      // Users should use /cancel endpoint instead
      res.status(403).json({ message: 'Use /cancel endpoint to cancel services' });
      return;
    }

    await carService.save();
    res.json(carService);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update car service' });
  }
};
