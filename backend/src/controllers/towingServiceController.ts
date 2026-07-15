import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import TowingService from '../models/TowingService';
import User from '../models/User';
import { ProviderType, ServiceStatus, UserRole, PaymentStatus } from '../types/shared';
import { assertProviderAssignable } from '../utils/serviceProviderAssignment';
import { assertValidServiceStatusTransition } from '../utils/serviceStatusTransitions';
import { assertEstimatedArrivalRequiresProvider } from '../utils/serviceEtaRules';
import {
  PROVIDER_REQUIRED_WHILE_IN_PROGRESS_MESSAGE,
  resolveAutoStatusForProviderChange,
} from '../utils/serviceAssignmentStatusSync';
import { hasTowingServiceProvider } from '../utils/serviceProviderOnRecord';
import { populateAssignedDriver } from '../utils/populateServiceProvider';
import { emailService } from '../services/emailService';
import { resolveCoordsForAddress } from '../utils/geocoding';
import { validateQuoteContactPhones } from '../utils/phoneValidation';
import { processPaidServiceCancelRefund } from '../utils/serviceCancelRefund';

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

    const locObj = req.body.location;
    const destObj = req.body.destination;
    if (
      locObj &&
      typeof locObj.latitude === 'number' &&
      typeof locObj.longitude === 'number' &&
      (locObj.latitude !== 0 || locObj.longitude !== 0)
    ) {
      towingService.pickupLatitude = locObj.latitude;
      towingService.pickupLongitude = locObj.longitude;
      towingService.pickupLocationMethod = 'pin';
    } else {
      towingService.pickupLocationMethod = 'structured';
    }
    if (
      destObj &&
      typeof destObj.latitude === 'number' &&
      typeof destObj.longitude === 'number' &&
      (destObj.latitude !== 0 || destObj.longitude !== 0)
    ) {
      towingService.destinationLatitude = destObj.latitude;
      towingService.destinationLongitude = destObj.longitude;
      towingService.destinationLocationMethod = 'pin';
    } else {
      towingService.destinationLocationMethod = 'structured';
    }

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

    const pickupCoords = await resolveCoordsForAddress(towingService.pickupLocation, {
      latitude: towingService.pickupLatitude,
      longitude: towingService.pickupLongitude,
    });
    const destCoords = await resolveCoordsForAddress(towingService.destination, {
      latitude: towingService.destinationLatitude,
      longitude: towingService.destinationLongitude,
    });

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
    if (!req.user) {
      res.json({ services: [] });
      return;
    }

    const query: any = {};
    const { status } = req.query;

    if (req.user.role !== UserRole.ADMIN) {
      query.user = req.user._id;
    }

    if (status) {
      query.status = status;
    }

    const towingServices = await TowingService.find(query)
      .populate('user', 'name email phone')
      .populate(populateAssignedDriver)
      .sort({ createdAt: -1 })
      .lean();

    // Transform to match frontend interface with geocoded coordinates
    const transformedServices = await Promise.all(
      towingServices.map(async (service: any) => {
        const pickupCoords = await resolveCoordsForAddress(service.pickupLocation, {
          latitude: service.pickupLatitude,
          longitude: service.pickupLongitude,
        });
        const destCoords = service.destination
          ? await resolveCoordsForAddress(service.destination, {
              latitude: service.destinationLatitude,
              longitude: service.destinationLongitude,
            })
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
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const query: any = { _id: req.params.id };

    if (req.user.role !== UserRole.ADMIN) {
      query.user = req.user._id;
    }

    const towingService = await TowingService.findOne(query)
      .populate('user', 'name email phone address')
      .populate(populateAssignedDriver)
      .lean();

    if (!towingService) {
      res.status(404).json({ message: 'Towing service not found' });
      return;
    }

    const ts = towingService as any;
    const pickupCoords = await resolveCoordsForAddress(ts.pickupLocation, {
      latitude: ts.pickupLatitude,
      longitude: ts.pickupLongitude,
    });
    const destCoords = ts.destination
      ? await resolveCoordsForAddress(ts.destination, {
          latitude: ts.destinationLatitude,
          longitude: ts.destinationLongitude,
        })
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

    // BR-06: queue manual refund for completed payments (PayChangu dashboard)
    let refundInfo: {
      attempted: boolean;
      success: boolean;
      pending: boolean;
      refundAmount?: number;
      message: string;
      status: string;
    } | null = null;

    if (towingService.paymentStatus === PaymentStatus.COMPLETED) {
      try {
        const refund = await processPaidServiceCancelRefund({
          kind: 'towing',
          serviceId: towingService._id.toString(),
          reason: 'Towing service cancelled by customer',
        });
        refundInfo = {
          attempted: refund.attempted,
          success: refund.success,
          pending: refund.pending,
          refundAmount: refund.refundAmount,
          message: refund.message,
          status: refund.pending ? 'pending' : refund.success ? 'queued' : 'failed',
        };
      } catch {
        refundInfo = {
          attempted: true,
          success: false,
          pending: false,
          refundAmount: towingService.price,
          message: 'Refund queueing error; admin can process manually',
          status: 'failed',
        };
      }
    }

    const message = refundInfo?.pending
      ? `Service cancelled successfully. ${refundInfo.message}`
      : 'Service cancelled successfully';

    res.json({
      message,
      service: towingService,
      refund: refundInfo,
      refundProcessed: false,
      refundPending: Boolean(refundInfo?.pending),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to cancel towing service' });
  }
};

export const requestTowingQuote = async (
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

    const towing = await TowingService.findOne({
      _id: req.params.id,
      user: req.user!._id,
    });
    if (!towing) {
      res.status(404).json({ message: 'Towing service not found' });
      return;
    }
    if (
      towing.status === ServiceStatus.CANCELLED ||
      towing.status === ServiceStatus.COMPLETED
    ) {
      res.status(400).json({ message: 'Cannot request a quote for this service' });
      return;
    }
    const price = towing.price;
    if (price != null && price > 0) {
      res.status(400).json({ message: 'A price is already set for this request' });
      return;
    }

    towing.quoteMobilePhone = validated.mobilePhone;
    towing.quoteWhatsAppPhone = validated.whatsAppPhone;
    towing.quoteRequestNotes = notes;
    towing.quoteRequestSubmittedAt = new Date();
    await towing.save();

    const user = await User.findById(req.user!._id).lean();
    const customerName = user?.name || 'Customer';
    const customerEmail = user?.email || '';

    const vehicleStr =
      [towing.vehicleDetails?.make, towing.vehicleDetails?.model]
        .filter(Boolean)
        .join(' ') || 'Not specified';

    await emailService.sendAdminServiceQuoteRequest({
      kind: 'towing',
      serviceId: towing._id.toString(),
      customerName,
      customerEmail,
      mobilePhone: validated.mobilePhone,
      whatsAppPhone: validated.whatsAppPhone,
      quoteRequestNotes: notes,
      summaryEntries: [
        { label: 'Pickup', value: towing.pickupLocation },
        { label: 'Destination', value: towing.destination },
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

export const updateTowingService = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { status, assignedDriver, price, estimatedArrivalAt } = req.body;

    const towingService = await TowingService.findById(req.params.id);
    if (!towingService) {
      res.status(404).json({ message: 'Towing service not found' });
      return;
    }

    const previousStatus = towingService.status;
    const previousEstimatedArrivalAt = towingService.estimatedArrivalAt;

    // Only admin can update status and assign driver
    if (req.user!.role === 'admin') {
      if (status && !Object.values(ServiceStatus).includes(status)) {
        res.status(400).json({ message: 'Invalid status' });
        return;
      }

      if (assignedDriver !== undefined) {
        if (assignedDriver === null || assignedDriver === '') {
          towingService.set('assignedDriver', undefined);
        } else {
          const check = await assertProviderAssignable(String(assignedDriver), ProviderType.DRIVER);
          if (!check.ok) {
            res.status(400).json({ message: check.message });
            return;
          }
          towingService.assignedDriver = assignedDriver;
        }
      }
      if (price !== undefined) towingService.price = price;
      if (estimatedArrivalAt !== undefined) {
        if (estimatedArrivalAt === null || estimatedArrivalAt === '') {
          towingService.set('estimatedArrivalAt', undefined);
          towingService.set('etaUpdatedAt', undefined);
        } else {
          const etaCheck = assertEstimatedArrivalRequiresProvider(
            hasTowingServiceProvider(towingService),
            estimatedArrivalAt
          );
          if (!etaCheck.ok) {
            res.status(400).json({ message: etaCheck.message });
            return;
          }
          const d = new Date(estimatedArrivalAt);
          if (Number.isNaN(d.getTime())) {
            res.status(400).json({ message: 'Invalid estimatedArrivalAt' });
            return;
          }
          towingService.estimatedArrivalAt = d;
          towingService.etaUpdatedAt = new Date();
        }
      } else if (!hasTowingServiceProvider(towingService) && towingService.estimatedArrivalAt) {
        // Provider cleared while ETA left untouched — drop ETA to keep state consistent (BR-09)
        towingService.set('estimatedArrivalAt', undefined);
        towingService.set('etaUpdatedAt', undefined);
      }

      if (
        !hasTowingServiceProvider(towingService) &&
        previousStatus === ServiceStatus.IN_PROGRESS
      ) {
        res.status(400).json({ message: PROVIDER_REQUIRED_WHILE_IN_PROGRESS_MESSAGE });
        return;
      }

      const explicitStatusProvided = Boolean(status);
      let nextStatus: ServiceStatus | undefined = status || undefined;

      if (!explicitStatusProvided && assignedDriver !== undefined) {
        const autoStatus = resolveAutoStatusForProviderChange({
          previousStatus,
          hasProvider: hasTowingServiceProvider(towingService),
          explicitStatusProvided: false,
        });
        if (autoStatus) {
          nextStatus = autoStatus;
        }
      }

      if (nextStatus) {
        const isAutoDemoteToPending =
          !explicitStatusProvided &&
          previousStatus === ServiceStatus.ASSIGNED &&
          nextStatus === ServiceStatus.PENDING &&
          !hasTowingServiceProvider(towingService);

        if (!isAutoDemoteToPending) {
          const transition = assertValidServiceStatusTransition(
            previousStatus,
            nextStatus,
            hasTowingServiceProvider(towingService)
          );
          if (!transition.ok) {
            res.status(400).json({ message: transition.message });
            return;
          }
        }
        towingService.status = nextStatus;
      }
    } else {
      // Users should use /cancel endpoint instead
      res.status(403).json({ message: 'Use /cancel endpoint to cancel services' });
      return;
    }

    await towingService.save();
    const updated = await TowingService.findById(towingService._id).populate(populateAssignedDriver).lean();

    try {
      const user = await User.findById(towingService.user);
      if (user && updated) {
        await emailService.sendServiceStatusUpdate({
          kind: 'towing',
          service: updated as unknown as Record<string, unknown>,
          user,
          previousStatus,
          previousEstimatedArrivalAt,
        });
      }
    } catch (emailError) {
      // Don't fail the update if email fails
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update towing service' });
  }
};
