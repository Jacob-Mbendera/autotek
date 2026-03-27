import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/types';
import { useCreateTowingServiceMutation, useCreateCarServiceMutation } from '../store/api/serviceApi';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
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
} from 'lucide-react';
import { UserRole } from '@shared/types';
import type { ServiceType } from '@shared/types';

export const BookService = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const { user } = useAppSelector((state) => state.auth);

  const serviceType = (searchParams.get('service') as 'towing' | 'car-service') || 'car-service';
  const serviceId = searchParams.get('id'); // For booking existing service (if needed)

  const [createTowingService, { isLoading: isCreatingTowing }] = useCreateTowingServiceMutation();
  const [createCarService, { isLoading: isCreatingCar }] = useCreateCarServiceMutation();

  // Common fields
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [location, setLocation] = useState(user?.address || '');
  const [notes, setNotes] = useState('');

  // Towing-specific fields
  const [destination, setDestination] = useState('');
  const [pickupDescription, setPickupDescription] = useState('');
  const [destinationDescription, setDestinationDescription] = useState('');

  // Car service-specific fields
  const [carServiceType, setCarServiceType] = useState<ServiceType | ''>('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [addressDescription, setAddressDescription] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const isLoading = isCreatingTowing || isCreatingCar;

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

    if (!location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (serviceType === 'towing') {
      if (!destination.trim()) {
        newErrors.destination = 'Destination is required';
      }
    } else {
      if (!carServiceType) {
        newErrors.carServiceType = 'Service type is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      if (serviceType === 'towing') {
        // Transform data to match backend API format
        // Backend expects: pickupLocation (string), destination (string), vehicleDetails (object)
        // Frontend API interface expects: vehicleType, vehicleModel, location (object), destination (object)
        // We'll use the frontend interface format and let the API handle transformation if needed
        const towingData = {
          vehicleType,
          vehicleModel: vehicleModel || undefined,
          location: {
            latitude: 0, // TODO: Get from geocoding
            longitude: 0, // TODO: Get from geocoding
            address: location,
          },
          pickupDescription: pickupDescription || undefined,
          destination: {
            latitude: 0, // TODO: Get from geocoding
            longitude: 0, // TODO: Get from geocoding
            address: destination,
          },
          destinationDescription: destinationDescription || undefined,
          notes: notes || undefined,
        };

        await createTowingService(towingData).unwrap();
        dispatch(showNotification({ message: 'Towing service request submitted successfully!', type: 'success' }));
      } else {
        const carServiceData = {
          serviceType: carServiceType as ServiceType,
          vehicleType,
          vehicleModel: vehicleModel || undefined,
          location: {
            latitude: 0, // TODO: Get from geocoding
            longitude: 0, // TODO: Get from geocoding
            address: location,
          },
          addressDescription: addressDescription || undefined,
          preferredDate: preferredDate || undefined,
          preferredTime: preferredTime || undefined,
          notes: notes || undefined,
        };

        await createCarService(carServiceData).unwrap();
        dispatch(showNotification({ message: 'Car service request submitted successfully!', type: 'success' }));
      }

      // Redirect to services page or orders
      navigate('/services');
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

            {/* Location Information */}
            <div>
              <H2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-teal-600" />
                Location Information
              </H2>
              <div className="space-y-4">
                <div>
                  <Input
                    label={serviceType === 'towing' ? 'Pickup Location' : 'Service Location'}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter full address"
                    required
                    error={errors.location}
                  />
                  <div className="mt-2">
                    <Input
                      label={serviceType === 'towing' ? 'Pickup Description (Optional)' : 'Location Description (Optional)'}
                      value={serviceType === 'towing' ? pickupDescription : addressDescription}
                      onChange={(e) => serviceType === 'towing' ? setPickupDescription(e.target.value) : setAddressDescription(e.target.value)}
                      placeholder="e.g., near the blue gate, opposite the church"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Help us find you: Describe nearby landmarks or features
                    </p>
                  </div>
                </div>
                {serviceType === 'towing' && (
                  <>
                    <div>
                      <Input
                        label="Destination"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="Enter destination address"
                        required
                        error={errors.destination}
                      />
                      <div className="mt-2">
                        <Input
                          label="Destination Description (Optional)"
                          value={destinationDescription}
                          onChange={(e) => setDestinationDescription(e.target.value)}
                          placeholder="e.g., next to the market, behind the gas station"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Help the driver find your destination
                        </p>
                      </div>
                    </div>
                  </>
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
