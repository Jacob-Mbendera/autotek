import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/types';
import { useCreateTowingServiceMutation, useCreateCarServiceMutation } from '../store/api/serviceApi';
import { useReverseGeocodeMutation } from '../store/api/geocodingApi';
import { useGetDeliveryLocationsQuery } from '../store/api/deliveryLocationApi';
import type { ShippingAddress } from '../store/api/orderApi';
import { DeliveryLocationSelector } from '../components/DeliveryLocationSelector';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { formatServiceAddressLine, validateStructuredServiceLocation } from '../utils/serviceAddress';
import {
  PageHeading,
  JournalBody,
  MonoLabel,
  JournalButton,
  JournalCard,
  JournalInput,
  JournalTextarea,
} from '../components/journal';
import { cn } from '../utils/cn';
import { Loader2, CheckCircle, AlertCircle, Crosshair } from 'lucide-react';
import { UserRole } from '@shared/types';
import { ServiceType } from '@shared/types';

/** Combine date (YYYY-MM-DD) and optional time (HH:MM) into one ISO datetime for the API. */
function buildPreferredDateISO(dateStr: string, timeStr: string): string | undefined {
  const d = dateStr.trim();
  if (!d) return undefined;
  const t = timeStr.trim();
  const timePart = t.length >= 5 ? (t.length === 5 ? `${t}:00` : t) : '12:00:00';
  const parsed = new Date(`${d}T${timePart}`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

const sectionTitleClasses = 'font-journal text-[22px] text-journal-ink mb-4 pb-2.5 border-b border-journal-ink';

export const BookService = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const { user } = useAppSelector((state) => state.auth);

  const serviceType = (searchParams.get('service') as 'towing' | 'car-service') || 'car-service';
  const serviceId = searchParams.get('id'); // For booking existing service (if needed)

  const [createTowingService, { isLoading: isCreatingTowing }] = useCreateTowingServiceMutation();
  const [createCarService, { isLoading: isCreatingCar }] = useCreateCarServiceMutation();
  const [reverseGeocode, { isLoading: isReverseGeocoding }] = useReverseGeocodeMutation();
  const { data: deliveryData } = useGetDeliveryLocationsQuery();

  // Common fields
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [notes, setNotes] = useState('');

  const [pickupShipping, setPickupShipping] = useState<ShippingAddress | null>(null);
  const [destinationShipping, setDestinationShipping] = useState<ShippingAddress | null>(null);
  const [carServiceShipping, setCarServiceShipping] = useState<ShippingAddress | null>(null);

  const [pickupPin, setPickupPin] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationPin, setDestinationPin] = useState<{ lat: number; lng: number } | null>(null);
  const [carServicePin, setCarServicePin] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupPinAddress, setPickupPinAddress] = useState<string>('');
  const [destinationPinAddress, setDestinationPinAddress] = useState<string>('');
  const [carServicePinAddress, setCarServicePinAddress] = useState<string>('');

  const [gpsBusy, setGpsBusy] = useState<'pickup' | 'destination' | 'car' | null>(null);

  // Towing-specific fields
  const [pickupDescription, setPickupDescription] = useState('');
  const [destinationDescription, setDestinationDescription] = useState('');

  // Car service-specific fields
  const [carServiceTypes, setCarServiceTypes] = useState<ServiceType[]>([]);
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [addressDescription, setAddressDescription] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const isLoading = isCreatingTowing || isCreatingCar;
  const locating = gpsBusy !== null || isReverseGeocoding;

  const normalizeLocationText = (v: string): string =>
    v.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const townMatchesPin = (town: string | undefined, pinAddress: string): boolean => {
    const t = normalizeLocationText(town || '');
    const a = normalizeLocationText(pinAddress || '');
    if (!t || !a) return true;
    return a.includes(t) || t.includes(a);
  };
  const inferTownFromPinAddress = (pinAddress: string): string | null => {
    const towns = deliveryData?.deliveryLocations?.map((loc) => loc.town) || [];
    const addr = normalizeLocationText(pinAddress);
    for (const town of towns) {
      const t = normalizeLocationText(town);
      if (t && (addr.includes(t) || t.includes(addr))) return town;
    }
    return null;
  };
  const pickupPinTownMismatch =
    !!pickupPin &&
    !!pickupShipping?.town &&
    !!pickupPinAddress &&
    !townMatchesPin(pickupShipping.town, pickupPinAddress);
  const destinationPinTownMismatch =
    !!destinationPin &&
    !!destinationShipping?.town &&
    !!destinationPinAddress &&
    !townMatchesPin(destinationShipping.town, destinationPinAddress);
  const carPinTownMismatch =
    !!carServicePin &&
    !!carServiceShipping?.town &&
    !!carServicePinAddress &&
    !townMatchesPin(carServiceShipping.town, carServicePinAddress);

  useEffect(() => {
    // If user is not authenticated, redirect to login
    if (!user) {
      navigate(`/login?returnUrl=/book-service?service=${serviceType}${serviceId ? `&id=${serviceId}` : ''}`);
      return;
    }

    if (user.role === UserRole.ADMIN) {
      dispatch(showNotification({
        message: 'Admin accounts cannot create customer service requests',
        type: 'error',
      }));
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, navigate, serviceType, serviceId, dispatch]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!vehicleType.trim()) {
      newErrors.vehicleType = 'Vehicle type is required';
    }

    if (serviceType === 'towing') {
      const pickupErr = pickupPin
        ? null
        : validateStructuredServiceLocation(pickupShipping, 'pickup');
      if (pickupErr) newErrors.pickupLocation = pickupErr;
      const destErr = destinationPin
        ? null
        : validateStructuredServiceLocation(destinationShipping, 'destination');
      if (destErr) newErrors.destination = destErr;
    } else {
      const locErr = carServicePin
        ? null
        : validateStructuredServiceLocation(carServiceShipping, 'service location');
      if (locErr) newErrors.location = locErr;
      if (carServiceTypes.length === 0) {
        newErrors.carServiceTypes = 'Select at least one service type';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const requestMapPin = (which: 'pickup' | 'destination' | 'car') => {
    if (!navigator.geolocation) {
      dispatch(
        showNotification({
          message: 'Your browser does not support location. Use town and landmark only.',
          type: 'error',
        })
      );
      return;
    }
    setGpsBusy(which);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        if (which === 'pickup') setPickupPin({ lat: latitude, lng: longitude });
        if (which === 'destination') setDestinationPin({ lat: latitude, lng: longitude });
        if (which === 'car') setCarServicePin({ lat: latitude, lng: longitude });

        try {
          const r = await reverseGeocode({ latitude, longitude }).unwrap();
          if (which === 'pickup') setPickupPinAddress(r.formattedAddress);
          if (which === 'destination') setDestinationPinAddress(r.formattedAddress);
          if (which === 'car') setCarServicePinAddress(r.formattedAddress);

          const inferredTown = inferTownFromPinAddress(r.formattedAddress);
          if (inferredTown) {
            if (which === 'pickup' && !pickupShipping?.town) {
              setPickupShipping({
                town: inferredTown,
                landmark: 'Other/Custom',
                customAddress: r.formattedAddress,
              });
              dispatch(
                showNotification({
                  message: `Pickup town auto-selected from pin: ${inferredTown}.`,
                  type: 'success',
                })
              );
            }
            if (which === 'destination' && !destinationShipping?.town) {
              setDestinationShipping({
                town: inferredTown,
                landmark: 'Other/Custom',
                customAddress: r.formattedAddress,
              });
              dispatch(
                showNotification({
                  message: `Destination town auto-selected from pin: ${inferredTown}.`,
                  type: 'success',
                })
              );
            }
            if (which === 'car' && !carServiceShipping?.town) {
              setCarServiceShipping({
                town: inferredTown,
                landmark: 'Other/Custom',
                customAddress: r.formattedAddress,
              });
              dispatch(
                showNotification({
                  message: `Service town auto-selected from pin: ${inferredTown}.`,
                  type: 'success',
                })
              );
            }
          }

          const selectedTown =
            which === 'pickup'
              ? pickupShipping?.town
              : which === 'destination'
                ? destinationShipping?.town
                : carServiceShipping?.town;
          if (selectedTown && !townMatchesPin(selectedTown, r.formattedAddress)) {
            dispatch(
              showNotification({
                message: `Town mismatch: selected "${selectedTown}" but map pin looks like a different area. Please confirm town or update pin.`,
                type: 'error',
              })
            );
          }

          const short = r.formattedAddress.length > 120
            ? `${r.formattedAddress.slice(0, 120)}…`
            : r.formattedAddress;
          dispatch(
            showNotification({
              message: `Map pin saved. Near: ${short}`,
              type: 'success',
            })
          );
        } catch {
          dispatch(
            showNotification({
              message: 'Map pin saved. Complete town and landmark below.',
              type: 'success',
            })
          );
        } finally {
          setGpsBusy(null);
        }
      },
      () => {
        setGpsBusy(null);
        dispatch(
          showNotification({
            message: 'Could not read your location. Allow location access or use town and landmark only.',
            type: 'error',
          })
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      if (serviceType === 'towing') {
        const pickupLine = formatServiceAddressLine(pickupShipping) || pickupPinAddress || 'Pinned pickup location';
        const destinationLine =
          formatServiceAddressLine(destinationShipping) ||
          destinationPinAddress ||
          'Pinned destination location';
        const usePickupPin = !!pickupPin && !pickupPinTownMismatch;
        const useDestinationPin = !!destinationPin && !destinationPinTownMismatch;
        if (pickupPinTownMismatch || destinationPinTownMismatch) {
          const parts: string[] = [];
          if (pickupPinTownMismatch) parts.push('pickup');
          if (destinationPinTownMismatch) parts.push('destination');
          dispatch(
            showNotification({
              message: `Town and map pin mismatch for ${parts.join(
                ' and '
              )}. We will use your selected town and landmark as the saved location.`,
              type: 'error',
            })
          );
        }
        const towingData = {
          vehicleType,
          vehicleModel: vehicleModel || undefined,
          location: {
            latitude: usePickupPin ? pickupPin!.lat : 0,
            longitude: usePickupPin ? pickupPin!.lng : 0,
            address: pickupLine,
          },
          pickupDescription: pickupDescription || undefined,
          destination: {
            latitude: useDestinationPin ? destinationPin!.lat : 0,
            longitude: useDestinationPin ? destinationPin!.lng : 0,
            address: destinationLine,
          },
          destinationDescription: destinationDescription || undefined,
          notes: notes || undefined,
        };

        await createTowingService(towingData).unwrap();
        dispatch(showNotification({ message: 'Towing service request submitted successfully!', type: 'success' }));
      } else {
        const serviceLine =
          formatServiceAddressLine(carServiceShipping) || carServicePinAddress || 'Pinned service location';
        const useCarPin = !!carServicePin && !carPinTownMismatch;
        if (carPinTownMismatch) {
          dispatch(
            showNotification({
              message:
                'Town and map pin mismatch for service location. We will use your selected town and landmark as the saved location.',
              type: 'error',
            })
          );
        }
        const carServiceData = {
          serviceTypes: carServiceTypes,
          vehicleType,
          vehicleModel: vehicleModel || undefined,
          location: {
            latitude: useCarPin ? carServicePin!.lat : 0,
            longitude: useCarPin ? carServicePin!.lng : 0,
            address: serviceLine,
          },
          addressDescription: addressDescription || undefined,
          preferredDate: buildPreferredDateISO(preferredDate, preferredTime),
          notes: notes || undefined,
        };

        await createCarService(carServiceData).unwrap();
        dispatch(showNotification({ message: 'Car service request submitted successfully!', type: 'success' }));
      }

      navigate('/my-services');
    } catch (error: any) {
      const errorInfo = getErrorInfo(error, 'Failed to submit service request. Please try again.');
      dispatch(showNotification({
        message: errorInfo.message,
        type: 'error',
      }));
    }
  };

  const serviceTypeOptions: { value: ServiceType; label: string }[] = [
    { value: ServiceType.OIL_CHANGE, label: 'Oil Change' },
    { value: ServiceType.BRAKE_PADS, label: 'Brake Pads Replacement' },
    { value: ServiceType.SPARK_PLUGS, label: 'Spark Plugs Replacement' },
    { value: ServiceType.AIR_FILTER, label: 'Air Filter Replacement' },
    { value: ServiceType.BATTERY, label: 'Battery Replacement' },
    { value: ServiceType.TIRE_ROTATION, label: 'Tire Rotation' },
  ];
  const toggleCarServiceType = (value: ServiceType) => {
    setCarServiceTypes((prev) =>
      prev.includes(value) ? prev.filter((entry) => entry !== value) : [...prev, value]
    );
  };

  return (
    <div className="max-w-[860px] mx-auto px-4 sm:px-10 py-11 sm:py-14">
      <MonoLabel className="mb-3.5 block">
        {serviceType === 'towing' ? 'No. 03 — Book towing service' : 'No. 03 — Book a car service'}
      </MonoLabel>
      <PageHeading className="!text-[36px] sm:!text-[46px] mb-2">
        {serviceType === 'towing' ? 'A driver, sent to you.' : 'A mechanic, sent to you.'}
      </PageHeading>
      <JournalBody className="mb-6">
        One page — tell us the vehicle, what it needs, and where. No payment now; we send a quote to
        My Services.
      </JournalBody>

      {Object.keys(errors).length > 0 && (
        <div className="border border-journal-error-border bg-journal-error-bg rounded-journal px-4 py-3 mb-6 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-journal-danger-text flex-shrink-0 mt-0.5" />
          <p className="text-[13px] text-journal-danger-text">
            <strong>Please fix the fields marked below</strong> — {Object.values(errors).join(', ')}.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {/* Vehicle Information */}
        <div>
          <div className={sectionTitleClasses}>01 &middot; Vehicle information</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <JournalInput
              label="Vehicle type *"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              placeholder="e.g. Toyota Hilux"
              required
              error={errors.vehicleType}
            />
            <JournalInput
              label="Vehicle model (optional)"
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              placeholder="e.g. 2016 2.4 D-4D"
            />
          </div>
        </div>

        {/* Service Type (for car services) */}
        {serviceType === 'car-service' && (
          <div>
            <div className={sectionTitleClasses}>
              02 &middot; Service type{' '}
              <span className="font-sans text-xs normal-case text-journal-muted">(select one or more)</span>
            </div>
            <div
              className={cn(
                'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5',
                errors.carServiceTypes && 'outline outline-1 outline-journal-error-border-strong rounded-journal p-1'
              )}
            >
              {serviceTypeOptions.map((option) => {
                const selected = carServiceTypes.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className={cn(
                      'flex items-center gap-2.5 border rounded-journal px-3.5 py-3 cursor-pointer transition-colors text-[13px] font-sans',
                      selected
                        ? 'border-journal-teal bg-journal-teal-tint border-[1.5px] text-journal-ink'
                        : 'border-journal-input-border bg-white hover:border-journal-ink text-journal-body'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleCarServiceType(option.value)}
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        'h-4 w-4 rounded-sm border flex items-center justify-center flex-shrink-0',
                        selected ? 'bg-journal-teal border-journal-teal' : 'border-journal-input-border bg-white'
                      )}
                      aria-hidden
                    >
                      {selected && <CheckCircle className="h-3 w-3 text-white" strokeWidth={3} />}
                    </span>
                    {option.label}
                  </label>
                );
              })}
            </div>
            {errors.carServiceTypes && (
              <p className="mt-1.5 text-xs text-journal-danger-text">{errors.carServiceTypes}</p>
            )}
          </div>
        )}

        {/* Location Information */}
        <div>
          <div className={sectionTitleClasses}>
            {serviceType === 'towing' ? '03 · Location' : '03 · Location'}
          </div>
          <p className="text-[13px] text-journal-muted mb-4">
            Select your town and nearest landmark (or Other/Custom with directions), same as when you
            order parts for delivery. Optionally use your phone's map pin so "Open in Maps" is more
            accurate.
          </p>
          <div className="flex flex-col gap-8">
            {serviceType === 'towing' ? (
              <>
                <div>
                  <h3 className="font-journal text-[17px] text-journal-ink mb-3">Pickup (where the vehicle is)</h3>
                  <DeliveryLocationSelector
                    variant="service_pickup"
                    value={pickupShipping}
                    onChange={setPickupShipping}
                    required
                    error={errors.pickupLocation}
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={locating}
                      onClick={() => requestMapPin('pickup')}
                      className="inline-flex items-center gap-2 border border-journal-ink px-3.5 py-2 text-[11px] font-sans font-medium tracking-[0.1em] uppercase disabled:opacity-50 hover:bg-journal-sand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal"
                    >
                      {gpsBusy === 'pickup' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Crosshair className="h-3.5 w-3.5" />
                      )}
                      Use my location (map pin)
                    </button>
                    {pickupPin && (
                      <button
                        type="button"
                        onClick={() => {
                          setPickupPin(null);
                          setPickupPinAddress('');
                        }}
                        className="text-[11px] font-sans font-medium tracking-[0.1em] uppercase text-journal-muted hover:text-journal-teal transition-colors"
                      >
                        Clear pickup pin
                      </button>
                    )}
                  </div>
                  {pickupPin && (
                    <div className="mt-3 p-3 bg-journal-teal-tint border border-journal-teal-tint-border rounded-journal">
                      <p className="text-[13px] font-semibold text-journal-teal">Pickup map pin saved</p>
                      <p className="text-xs text-journal-teal mt-1">
                        Lat/Lng: {pickupPin.lat.toFixed(6)}, {pickupPin.lng.toFixed(6)}
                      </p>
                      {pickupPinAddress && (
                        <p className="text-xs text-journal-teal mt-1">Near: {pickupPinAddress}</p>
                      )}
                      {pickupPinTownMismatch && (
                        <p className="text-xs text-journal-warn-text bg-journal-warn-bg border border-journal-warn-text/20 rounded px-2 py-1 mt-2">
                          Alert: Town and pin do not match. We will save your selected town and landmark for pickup.
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-journal-faint mt-2">
                    If town is empty and we can detect it from pin address, it will be auto-filled.
                  </p>
                  <div className="mt-4">
                    <JournalInput
                      label="Pickup description (optional)"
                      value={pickupDescription}
                      onChange={(e) => setPickupDescription(e.target.value)}
                      placeholder="e.g., near the blue gate, opposite the church"
                    />
                  </div>
                </div>
                <div>
                  <h3 className="font-journal text-[17px] text-journal-ink mb-3">Destination (drop-off)</h3>
                  <DeliveryLocationSelector
                    variant="service_destination"
                    value={destinationShipping}
                    onChange={setDestinationShipping}
                    required
                    error={errors.destination}
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={locating}
                      onClick={() => requestMapPin('destination')}
                      className="inline-flex items-center gap-2 border border-journal-ink px-3.5 py-2 text-[11px] font-sans font-medium tracking-[0.1em] uppercase disabled:opacity-50 hover:bg-journal-sand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal"
                    >
                      {gpsBusy === 'destination' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Crosshair className="h-3.5 w-3.5" />
                      )}
                      Use my location (map pin)
                    </button>
                    {destinationPin && (
                      <button
                        type="button"
                        onClick={() => {
                          setDestinationPin(null);
                          setDestinationPinAddress('');
                        }}
                        className="text-[11px] font-sans font-medium tracking-[0.1em] uppercase text-journal-muted hover:text-journal-teal transition-colors"
                      >
                        Clear destination pin
                      </button>
                    )}
                  </div>
                  {destinationPin && (
                    <div className="mt-3 p-3 bg-journal-teal-tint border border-journal-teal-tint-border rounded-journal">
                      <p className="text-[13px] font-semibold text-journal-teal">Destination map pin saved</p>
                      <p className="text-xs text-journal-teal mt-1">
                        Lat/Lng: {destinationPin.lat.toFixed(6)}, {destinationPin.lng.toFixed(6)}
                      </p>
                      {destinationPinAddress && (
                        <p className="text-xs text-journal-teal mt-1">Near: {destinationPinAddress}</p>
                      )}
                      {destinationPinTownMismatch && (
                        <p className="text-xs text-journal-warn-text bg-journal-warn-bg border border-journal-warn-text/20 rounded px-2 py-1 mt-2">
                          Alert: Town and pin do not match. We will save your selected town and landmark for destination.
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-journal-faint mt-2">
                    If town is empty and we can detect it from pin address, it will be auto-filled.
                  </p>
                  <div className="mt-4">
                    <JournalInput
                      label="Destination description (optional)"
                      value={destinationDescription}
                      onChange={(e) => setDestinationDescription(e.target.value)}
                      placeholder="e.g., next to the market, behind the gas station"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <DeliveryLocationSelector
                  variant="service_car"
                  value={carServiceShipping}
                  onChange={setCarServiceShipping}
                  required
                  error={errors.location}
                />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={locating}
                    onClick={() => requestMapPin('car')}
                    className="inline-flex items-center gap-2 border border-journal-ink px-3.5 py-2 text-[11px] font-sans font-medium tracking-[0.1em] uppercase disabled:opacity-50 hover:bg-journal-sand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal"
                  >
                    {gpsBusy === 'car' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Crosshair className="h-3.5 w-3.5" />
                    )}
                    Use my location (map pin)
                  </button>
                  {carServicePin && (
                    <button
                      type="button"
                      onClick={() => {
                        setCarServicePin(null);
                        setCarServicePinAddress('');
                      }}
                      className="text-[11px] font-sans font-medium tracking-[0.1em] uppercase text-journal-muted hover:text-journal-teal transition-colors"
                    >
                      Clear pin
                    </button>
                  )}
                </div>
                {carServicePin && (
                  <div className="mt-3 p-3 bg-journal-teal-tint border border-journal-teal-tint-border rounded-journal">
                    <p className="text-[13px] font-semibold text-journal-teal">Service map pin saved</p>
                    <p className="text-xs text-journal-teal mt-1">
                      Lat/Lng: {carServicePin.lat.toFixed(6)}, {carServicePin.lng.toFixed(6)}
                    </p>
                    {carServicePinAddress && (
                      <p className="text-xs text-journal-teal mt-1">Near: {carServicePinAddress}</p>
                    )}
                    {carPinTownMismatch && (
                      <p className="text-xs text-journal-warn-text bg-journal-warn-bg border border-journal-warn-text/20 rounded px-2 py-1 mt-2">
                        Alert: Town and pin do not match. We will save your selected town and landmark for service location.
                      </p>
                    )}
                  </div>
                )}
                <p className="text-xs text-journal-faint mt-2">
                  If town is empty and we can detect it from pin address, it will be auto-filled.
                </p>
                <div className="mt-4">
                  <JournalInput
                    label="Location description (optional)"
                    value={addressDescription}
                    onChange={(e) => setAddressDescription(e.target.value)}
                    placeholder="e.g., car park behind the building"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preferred Date/Time + Notes (grouped like the design's 04/05 split) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {serviceType === 'car-service' && (
            <div>
              <div className={sectionTitleClasses}>04 &middot; Preferred schedule</div>
              <div className="flex gap-2.5">
                <JournalInput
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  aria-label="Preferred date"
                />
                <JournalInput
                  type="time"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  aria-label="Preferred time"
                />
              </div>
            </div>
          )}
          <div>
            <div className={sectionTitleClasses}>05 &middot; Notes</div>
            <JournalTextarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the mechanic should know…"
              rows={4}
            />
          </div>
        </div>

        {/* What's next */}
        <div className="bg-journal-sand rounded-journal px-5 py-4 flex flex-col sm:flex-row gap-2 sm:gap-5">
          <div className="text-[11px] font-sans font-bold tracking-[0.12em] uppercase text-journal-teal whitespace-nowrap sm:pt-0.5">
            What's next
          </div>
          <p className="text-[13px] leading-[1.6] text-journal-body">
            We review your request, send a quote in MWK to{' '}
            <strong className="text-journal-ink">My Services</strong>, and assign a{' '}
            {serviceType === 'towing' ? 'driver' : 'mechanic'} once you pay.{' '}
            <strong className="text-journal-ink">No payment is taken now.</strong>
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-5">
          <button
            type="button"
            onClick={() => navigate('/services')}
            disabled={isLoading}
            className="text-[13px] font-sans tracking-[0.1em] uppercase text-journal-muted hover:text-journal-ink transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <JournalButton type="submit" variant="primary" size="large" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit request'
            )}
          </JournalButton>
        </div>
      </form>
    </div>
  );
};
