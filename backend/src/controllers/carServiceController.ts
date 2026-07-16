import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import CarService from '../models/CarService';
import User from '../models/User';
import { ProviderType, ServiceStatus, ServiceType, UserRole, PaymentStatus } from '../types/shared';
import { assertProviderAssignable } from '../utils/serviceProviderAssignment';
import { assertValidServiceStatusTransition } from '../utils/serviceStatusTransitions';
import { assertEstimatedArrivalRequiresProvider } from '../utils/serviceEtaRules';
import {
  PROVIDER_REQUIRED_WHILE_IN_PROGRESS_MESSAGE,
  resolveAutoStatusForProviderChange,
} from '../utils/serviceAssignmentStatusSync';
import { hasCarServiceProvider } from '../utils/serviceProviderOnRecord';
import { populateAssignedMechanic } from '../utils/populateServiceProvider';
import { emailService } from '../services/emailService';
import { resolveCoordsForAddress } from '../utils/geocoding';
import { validateQuoteContactPhones } from '../utils/phoneValidation';
import { processPaidServiceCancelRefund } from '../utils/serviceCancelRefund';

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  [ServiceType.OIL_CHANGE]: 'Oil Change',
  [ServiceType.BRAKE_PADS]: 'Brake Pads Replacement',
  [ServiceType.SPARK_PLUGS]: 'Spark Plugs Replacement',
  [ServiceType.AIR_FILTER]: 'Air Filter Replacement',
  [ServiceType.BATTERY]: 'Battery Replacement',
  [ServiceType.TIRE_ROTATION]: 'Tire Rotation',
  [ServiceType.OTHER]: 'Other Service',
};

const normalizeServiceTypes = (input: unknown): ServiceType[] => {
  const list = Array.isArray(input) ? input : input ? [input] : [];
  const validSet = new Set(Object.values(ServiceType));
  const normalized = list
    .map((value) => String(value))
    .filter((value): value is ServiceType => validSet.has(value as ServiceType));
  return Array.from(new Set(normalized));
};

const getServiceTypeLabel = (serviceType: ServiceType): string =>
  SERVICE_TYPE_LABELS[serviceType] || serviceType;

type ServicePricingEntry = { serviceType: ServiceType; price?: number };

const buildDefaultServicePricing = (serviceTypes: ServiceType[]): ServicePricingEntry[] =>
  serviceTypes.map((serviceType) => ({ serviceType }));

const normalizeServicePricing = (input: unknown): ServicePricingEntry[] | null => {
  if (!Array.isArray(input)) return null;
  const validSet = new Set(Object.values(ServiceType));
  const out: ServicePricingEntry[] = [];
  for (const entry of input) {
    if (!entry || typeof entry !== 'object') return null;
    const rawType = String((entry as { serviceType?: unknown }).serviceType || '');
    if (!validSet.has(rawType as ServiceType)) return null;
    const rawPrice = (entry as { price?: unknown }).price;
    if (rawPrice !== undefined && rawPrice !== null) {
      const num = Number(rawPrice);
      if (!Number.isFinite(num) || num < 0) return null;
      out.push({ serviceType: rawType as ServiceType, price: Math.round(num) });
    } else {
      out.push({ serviceType: rawType as ServiceType });
    }
  }
  return out;
};

const normalizeStoredServicePricing = (
  serviceTypes: ServiceType[],
  servicePricing?: Array<{ serviceType?: ServiceType; price?: number }>
): ServicePricingEntry[] => {
  const byType = new Map<ServiceType, number | undefined>();
  for (const entry of servicePricing || []) {
    if (!entry?.serviceType) continue;
    byType.set(entry.serviceType, entry.price);
  }
  return serviceTypes.map((serviceType) => ({
    serviceType,
    price: byType.get(serviceType),
  }));
};

const getStoredServiceTypes = (
  service: { serviceTypes?: ServiceType[]; serviceType?: ServiceType }
): ServiceType[] =>
  service.serviceTypes?.length
    ? service.serviceTypes
    : [service.serviceType].filter((type): type is ServiceType => Boolean(type));

export const createCarService = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role === UserRole.ADMIN) {
      res.status(403).json({ message: 'Admin accounts cannot create customer car service requests' });
      return;
    }

    const serviceTypes = normalizeServiceTypes(req.body.serviceTypes ?? req.body.serviceType);

    if (serviceTypes.length === 0) {
      res.status(400).json({
        message: 'At least one valid service type is required',
      });
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
      serviceType: serviceTypes[0],
      serviceTypes,
      servicePricing: buildDefaultServicePricing(serviceTypes),
      vehicleDetails,
      address,
      addressDescription,
      preferredDate: preferredDateValue,
      notes: req.body.notes,
      price: req.body.price,
    });

    const locBody = req.body.location;
    if (
      locBody &&
      typeof locBody.latitude === 'number' &&
      typeof locBody.longitude === 'number' &&
      (locBody.latitude !== 0 || locBody.longitude !== 0)
    ) {
      carService.serviceLatitude = locBody.latitude;
      carService.serviceLongitude = locBody.longitude;
      carService.serviceLocationMethod = 'pin';
    } else {
      carService.serviceLocationMethod = 'structured';
    }

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

    const coords = await resolveCoordsForAddress(carService.address, {
      latitude: carService.serviceLatitude,
      longitude: carService.serviceLongitude,
    });

    const prefCreated = carService.preferredDate ? new Date(carService.preferredDate) : null;

    // Transform response to match frontend interface
    const transformed = {
      ...carService.toObject(),
      serviceTypes: getStoredServiceTypes(carService),
      serviceType:
        carService.serviceType ||
        (carService.serviceTypes?.length ? carService.serviceTypes[0] : undefined),
      servicePricing: normalizeStoredServicePricing(
        getStoredServiceTypes(carService),
        carService.servicePricing
      ),
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
      query.$or = [{ serviceType }, { serviceTypes: serviceType }];
    }

    const carServices = await CarService.find(query)
      .populate('user', 'name email phone address')
      .populate(populateAssignedMechanic)
      .sort({ createdAt: -1 })
      .lean();

    // Transform to match frontend interface with geocoded coordinates
    const transformedServices = await Promise.all(
      carServices.map(async (service: any) => {
        const coords = await resolveCoordsForAddress(service.address, {
          latitude: service.serviceLatitude,
          longitude: service.serviceLongitude,
        });

        const pref = service.preferredDate ? new Date(service.preferredDate) : null;
        return {
          ...service,
          serviceTypes: getStoredServiceTypes(service),
          serviceType:
            service.serviceType ||
            (service.serviceTypes?.length ? service.serviceTypes[0] : undefined),
          servicePricing: normalizeStoredServicePricing(
            getStoredServiceTypes(service),
            service.servicePricing
          ),
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
      .populate(populateAssignedMechanic)
      .lean();

    if (!carService) {
      res.status(404).json({ message: 'Car service not found' });
      return;
    }

    const cs = carService as any;
    const coords = await resolveCoordsForAddress(cs.address, {
      latitude: cs.serviceLatitude,
      longitude: cs.serviceLongitude,
    });

    const prefSingle = (carService as any).preferredDate
      ? new Date((carService as any).preferredDate)
      : null;

    // Transform to match frontend interface
    const transformed = {
      ...carService,
      serviceTypes: getStoredServiceTypes(cs),
      serviceType: cs.serviceType || (cs.serviceTypes?.length ? cs.serviceTypes[0] : undefined),
      servicePricing: normalizeStoredServicePricing(
        getStoredServiceTypes(cs),
        cs.servicePricing
      ),
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

    // Update service status (updateOne avoids full-doc validation on legacy records)
    await CarService.updateOne(
      { _id: carService._id },
      { $set: { status: ServiceStatus.CANCELLED } }
    );
    carService.status = ServiceStatus.CANCELLED;

    // BR-06: queue manual refund for completed payments (PayChangu dashboard)
    let refundInfo: {
      attempted: boolean;
      success: boolean;
      pending: boolean;
      refundAmount?: number;
      message: string;
      status: string;
    } | null = null;

    if (carService.paymentStatus === PaymentStatus.COMPLETED) {
      try {
        const refund = await processPaidServiceCancelRefund({
          kind: 'car-service',
          serviceId: carService._id.toString(),
          reason: 'Car service cancelled by customer',
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
          refundAmount: carService.price,
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
      service: carService,
      refund: refundInfo,
      refundProcessed: false,
      refundPending: Boolean(refundInfo?.pending),
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

    const carServiceTypes: ServiceType[] = carService.serviceTypes?.length
      ? carService.serviceTypes
      : [carService.serviceType].filter((type): type is ServiceType => Boolean(type));
    await emailService.sendAdminServiceQuoteRequest({
      kind: 'car-service',
      serviceId: carService._id.toString(),
      customerName,
      customerEmail,
      mobilePhone: validated.mobilePhone,
      whatsAppPhone: validated.whatsAppPhone,
      quoteRequestNotes: notes,
      summaryEntries: [
        {
          label: 'Service types',
          value: carServiceTypes.length
            ? carServiceTypes.map(getServiceTypeLabel).join(', ')
            : 'N/A',
        },
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
    const { status, assignedMechanic, price, notes, estimatedArrivalAt, servicePricing } = req.body;

    const carService = await CarService.findById(req.params.id);
    if (!carService) {
      res.status(404).json({ message: 'Car service not found' });
      return;
    }

    const previousStatus = carService.status;
    const previousEstimatedArrivalAt = carService.estimatedArrivalAt;

    // Only admin can update status and assign mechanic
    if (req.user!.role === 'admin') {
      if (status && !Object.values(ServiceStatus).includes(status)) {
        res.status(400).json({ message: 'Invalid status' });
        return;
      }

      if (assignedMechanic !== undefined) {
        if (assignedMechanic === null || assignedMechanic === '') {
          carService.set('assignedMechanic', undefined);
        } else {
          const check = await assertProviderAssignable(
            String(assignedMechanic),
            ProviderType.MECHANIC
          );
          if (!check.ok) {
            res.status(400).json({ message: check.message });
            return;
          }
          carService.assignedMechanic = assignedMechanic;
        }
      }
      if (price !== undefined) carService.price = price;
      if (servicePricing !== undefined) {
        const requestedTypes = carService.serviceTypes?.length
          ? carService.serviceTypes
          : [carService.serviceType].filter((type): type is ServiceType => Boolean(type));
        const normalizedPricing = normalizeServicePricing(servicePricing);
        if (!normalizedPricing || normalizedPricing.length === 0) {
          res.status(400).json({ message: 'Invalid servicePricing payload' });
          return;
        }
        const validTypes = new Set(requestedTypes);
        if (normalizedPricing.some((entry) => !validTypes.has(entry.serviceType))) {
          res.status(400).json({ message: 'servicePricing includes unknown service type for this request' });
          return;
        }
        const normalizedStored = normalizeStoredServicePricing(requestedTypes, normalizedPricing);
        carService.servicePricing = normalizedStored;
        const total = normalizedStored.reduce((sum, entry) => sum + (entry.price ?? 0), 0);
        carService.price = total;
      }
      if (notes !== undefined) carService.notes = notes;
      if (estimatedArrivalAt !== undefined) {
        if (estimatedArrivalAt === null || estimatedArrivalAt === '') {
          carService.set('estimatedArrivalAt', undefined);
          carService.set('etaUpdatedAt', undefined);
        } else {
          const etaCheck = assertEstimatedArrivalRequiresProvider(
            hasCarServiceProvider(carService),
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
          carService.estimatedArrivalAt = d;
          carService.etaUpdatedAt = new Date();
        }
      } else if (!hasCarServiceProvider(carService) && carService.estimatedArrivalAt) {
        // Provider cleared while ETA left untouched — drop ETA to keep state consistent (BR-09)
        carService.set('estimatedArrivalAt', undefined);
        carService.set('etaUpdatedAt', undefined);
      }

      if (
        !hasCarServiceProvider(carService) &&
        previousStatus === ServiceStatus.IN_PROGRESS
      ) {
        res.status(400).json({ message: PROVIDER_REQUIRED_WHILE_IN_PROGRESS_MESSAGE });
        return;
      }

      const explicitStatusProvided = Boolean(status);
      let nextStatus: ServiceStatus | undefined = status || undefined;

      if (!explicitStatusProvided && assignedMechanic !== undefined) {
        const autoStatus = resolveAutoStatusForProviderChange({
          previousStatus,
          hasProvider: hasCarServiceProvider(carService),
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
          !hasCarServiceProvider(carService);

        if (!isAutoDemoteToPending) {
          const transition = assertValidServiceStatusTransition(
            previousStatus,
            nextStatus,
            hasCarServiceProvider(carService),
            carService.paymentStatus
          );
          if (!transition.ok) {
            res.status(400).json({ message: transition.message });
            return;
          }
        }
        carService.status = nextStatus;
      }
    } else {
      // Users should use /cancel endpoint instead
      res.status(403).json({ message: 'Use /cancel endpoint to cancel services' });
      return;
    }

    await carService.save();
    const updated = await CarService.findById(carService._id).populate(populateAssignedMechanic).lean();

    try {
      const user = await User.findById(carService.user);
      if (user && updated) {
        await emailService.sendServiceStatusUpdate({
          kind: 'car-service',
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
    res.status(500).json({ message: error.message || 'Failed to update car service' });
  }
};
