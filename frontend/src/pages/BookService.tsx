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
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { H1, H2, Body } from '../components/ui/Typography';
import { Breadcrumb } from '../components/Breadcrumb';
import {
  Truck,
  Wrench,
  MapPin,
  Calendar,
  Clock,
  Car,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  Crosshair,
} from 'lucide-react';
import { UserRole } from '@shared/types';
import type { ServiceType } from '@shared/types';

/** Combine date (YYYY-MM-DD) and optional time (HH:MM) into one ISO datetime for the API. */
function buildPreferredDateISO(dateStr: string, timeStr: string): string | undefined {
  const d = dateStr.trim();
  if (!d) return undefined;
  const t = timeStr.trim();
  const timePart = t.length >= 5 ? (t.length === 5 ? `${t}:00` : t) : '12:00:00';
  const parsed = new Date(`${d}T${timePart}`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

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
  const [carServiceType, setCarServiceType] = useState<ServiceType | ''>('');
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
      if (!carServiceType) {
        newErrors.carServiceType = 'Service type is required';
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
          serviceType: carServiceType as ServiceType,
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
    { value: 'oil-change', label: 'Oil Change' },
    { value: 'brake-pads', label: 'Brake Pads Replacement' },
    { value: 'spark-plugs', label: 'Spark Plugs Replacement' },
    { value: 'air-filter', label: 'Air Filter Replacement' },
    { value: 'battery', label: 'Battery Replacement' },
    { value: 'tire-rotation', label: 'Tire Rotation' },
  ];

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Services', href: '/services' },
    { label: serviceType === 'towing' ? 'Book Towing Service' : 'Book Car Service' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb items={breadcrumbItems} />

      <div className="mt-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="small" onClick={() => navigate('/services')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Services
          </Button>
        </div>

        <H1 className="text-3xl font-bold text-gray-900 mb-2">
          {serviceType === 'towing' ? 'Book Towing Service' : 'Book Car Service'}
        </H1>
        <Body className="text-gray-600 mb-8">
          {serviceType === 'towing'
            ? 'Fill in the details below to request a towing service. We\'ll contact you to confirm.'
            : 'Fill in the details below to book a car service. Our mechanic will come to your location.'}
        </Body>

        <Card variant="lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Vehicle Information */}
            <div>
              <H2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Car className="h-5 w-5 text-teal-600" />
                Vehicle Information
              </H2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Vehicle Type"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    placeholder="e.g., Sedan, SUV, Truck"
                    required
                    error={errors.vehicleType}
                  />
                </div>
                <div>
                  <Input
                    label="Vehicle Model (Optional)"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="e.g., Toyota Corolla 2015"
                  />
                </div>
              </div>
            </div>

            {/* Service Type (for car services) */}
            {serviceType === 'car-service' && (
              <div>
                <H2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-teal-600" />
                  Service Type
                </H2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={carServiceType}
                    onChange={(e) => setCarServiceType(e.target.value as ServiceType)}
                    required
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all ${
                      errors.carServiceType ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select a service type</option>
                    {serviceTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.carServiceType && (
                    <p className="mt-1 text-sm text-red-600">{errors.carServiceType}</p>
                  )}
                </div>
              </div>
            )}

            {/* Location Information — same town / landmark pattern as checkout shipping */}
            <div>
              <H2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-teal-600" />
                Location Information
              </H2>
              <p className="text-sm text-gray-600 mb-4">
                Select your town and nearest landmark (or Other/Custom with directions), same as when you order
                parts for delivery. Optionally use your phone&apos;s map pin so &quot;Open in Maps&quot; is more
                accurate.
              </p>
              <div className="space-y-8">
                {serviceType === 'towing' ? (
                  <>
                    <div>
                      <H2 className="text-base font-semibold text-gray-800 mb-3">Pickup (where the vehicle is)</H2>
                      <DeliveryLocationSelector
                        variant="service_pickup"
                        value={pickupShipping}
                        onChange={setPickupShipping}
                        required
                        error={errors.pickupLocation}
                      />
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled={locating}
                          onClick={() => requestMapPin('pickup')}
                        >
                          {gpsBusy === 'pickup' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Crosshair className="h-4 w-4" />
                          )}
                          Use my location (map pin)
                        </Button>
                        {pickupPin && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPickupPin(null);
                              setPickupPinAddress('');
                            }}
                          >
                            Clear pickup pin
                          </Button>
                        )}
                      </div>
                      {pickupPin && (
                        <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                          <p className="text-sm font-medium text-teal-900">Pickup map pin saved</p>
                          <p className="text-xs text-teal-800 mt-1">
                            Lat/Lng: {pickupPin.lat.toFixed(6)}, {pickupPin.lng.toFixed(6)}
                          </p>
                          {pickupPinAddress && (
                            <p className="text-xs text-teal-800 mt-1">Near: {pickupPinAddress}</p>
                          )}
                          {pickupPinTownMismatch && (
                              <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2">
                                Alert: Town and pin do not match. We will save your selected town and landmark for pickup.
                              </p>
                            )}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        If town is empty and we can detect it from pin address, it will be auto-filled.
                      </p>
                      <div className="mt-4">
                        <Input
                          label="Pickup description (optional)"
                          value={pickupDescription}
                          onChange={(e) => setPickupDescription(e.target.value)}
                          placeholder="e.g., near the blue gate, opposite the church"
                        />
                      </div>
                    </div>
                    <div>
                      <H2 className="text-base font-semibold text-gray-800 mb-3">Destination (drop-off)</H2>
                      <DeliveryLocationSelector
                        variant="service_destination"
                        value={destinationShipping}
                        onChange={setDestinationShipping}
                        required
                        error={errors.destination}
                      />
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled={locating}
                          onClick={() => requestMapPin('destination')}
                        >
                          {gpsBusy === 'destination' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Crosshair className="h-4 w-4" />
                          )}
                          Use my location (map pin)
                        </Button>
                        {destinationPin && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDestinationPin(null);
                              setDestinationPinAddress('');
                            }}
                          >
                            Clear destination pin
                          </Button>
                        )}
                      </div>
                      {destinationPin && (
                        <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                          <p className="text-sm font-medium text-teal-900">Destination map pin saved</p>
                          <p className="text-xs text-teal-800 mt-1">
                            Lat/Lng: {destinationPin.lat.toFixed(6)}, {destinationPin.lng.toFixed(6)}
                          </p>
                          {destinationPinAddress && (
                            <p className="text-xs text-teal-800 mt-1">Near: {destinationPinAddress}</p>
                          )}
                          {destinationPinTownMismatch && (
                              <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2">
                                Alert: Town and pin do not match. We will save your selected town and landmark for destination.
                              </p>
                            )}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        If town is empty and we can detect it from pin address, it will be auto-filled.
                      </p>
                      <div className="mt-4">
                        <Input
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
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={locating}
                        onClick={() => requestMapPin('car')}
                      >
                        {gpsBusy === 'car' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Crosshair className="h-4 w-4" />
                        )}
                        Use my location (map pin)
                      </Button>
                      {carServicePin && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCarServicePin(null);
                            setCarServicePinAddress('');
                          }}
                        >
                          Clear pin
                        </Button>
                      )}
                    </div>
                    {carServicePin && (
                      <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                        <p className="text-sm font-medium text-teal-900">Service map pin saved</p>
                        <p className="text-xs text-teal-800 mt-1">
                          Lat/Lng: {carServicePin.lat.toFixed(6)}, {carServicePin.lng.toFixed(6)}
                        </p>
                        {carServicePinAddress && (
                          <p className="text-xs text-teal-800 mt-1">Near: {carServicePinAddress}</p>
                        )}
                        {carPinTownMismatch && (
                            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2">
                              Alert: Town and pin do not match. We will save your selected town and landmark for service location.
                            </p>
                          )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      If town is empty and we can detect it from pin address, it will be auto-filled.
                    </p>
                    <div className="mt-4">
                      <Input
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

            {/* Preferred Date/Time (for car services) */}
            {serviceType === 'car-service' && (
              <div>
                <H2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-teal-600" />
                  Preferred Schedule
                </H2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Preferred Date (Optional)"
                      type="date"
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Input
                      label="Preferred Time (Optional)"
                      type="time"
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Additional Notes */}
            <div>
              <H2 className="text-xl font-semibold text-gray-900 mb-4">Additional Information</H2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information about your vehicle or service request..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all resize-none"
                />
              </div>
            </div>

            {/* Error Display */}
            {Object.keys(errors).length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <Body className="font-semibold text-red-900 mb-1">Please fix the following errors:</Body>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    {Object.values(errors).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                variant="primary"
                size="default"
                className="flex-1 gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Submit Service Request
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/services')}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>

        {/* Info Card */}
        <Card variant="md" className="mt-6 bg-teal-50 border-teal-200">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
              {serviceType === 'towing' ? (
                <Truck className="h-5 w-5 text-teal-600" />
              ) : (
                <Wrench className="h-5 w-5 text-teal-600" />
              )}
            </div>
            <div>
              <Body className="font-semibold text-gray-900 mb-1">What happens next?</Body>
              <Body className="text-sm text-gray-700">
                {serviceType === 'towing'
                  ? 'After you submit your request, our team will contact you to confirm details and provide a quote. We aim to respond within 30 minutes.'
                  : 'After you submit your request, our certified mechanic will contact you to confirm the appointment and provide an estimated cost. We\'ll come to your location at the scheduled time.'}
              </Body>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
