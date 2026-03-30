import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetTowingServicesQuery,
  useGetCarServicesQuery,
  useCancelTowingServiceMutation,
  useCancelCarServiceMutation,
  useRequestTowingQuoteMutation,
  useRequestCarServiceQuoteMutation,
  type TowingService,
  type CarService,
  type ServiceAssignee,
} from '../store/api/serviceApi';
import { useAppDispatch } from '../store/types';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { validateMalawiPhoneField } from '../utils/phoneValidation';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { H1, H2, Body } from '../components/ui/Typography';
import { Breadcrumb } from '../components/Breadcrumb';
import {
  Truck,
  Wrench,
  Loader2,
  Search,
  Calendar,
  MapPin,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  CreditCard,
  X,
  Package,
  TrendingUp,
  Car,
  User,
  ExternalLink,
  Hash,
  MessageCircle,
} from 'lucide-react';
import type { ServiceStatus } from '@shared/types';
import { format } from 'date-fns';

// Service type info for car services
const serviceTypeInfo: Record<string, { name: string; icon: any }> = {
  'oil-change': { name: 'Oil Change', icon: Wrench },
  'brake-pads': { name: 'Brake Pads', icon: Wrench },
  'spark-plugs': { name: 'Spark Plugs', icon: Wrench },
  'air-filter': { name: 'Air Filter', icon: Wrench },
  'battery': { name: 'Battery', icon: Wrench },
  'tire-rotation': { name: 'Tire Rotation', icon: Wrench },
  'other': { name: 'Other Service', icon: Wrench },
};

// Helper function to get status badge colors
const getStatusBadgeColor = (status: ServiceStatus) => {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'assigned':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'in-progress':
      return 'bg-indigo-100 text-indigo-700 border-indigo-300';
    case 'completed':
      return 'bg-green-100 text-green-700 border-green-300';
    case 'cancelled':
      return 'bg-red-100 text-red-700 border-red-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

// Helper function to get payment status badge color
const getPaymentStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'pending':
      return 'bg-amber-100 text-amber-700';
    case 'failed':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

// Format date
const formatDate = (dateString: string) => {
  return format(new Date(dateString), 'MMM dd, yyyy');
};

const formatDateTime = (dateString: string) => {
  return format(new Date(dateString), 'MMM dd, yyyy h:mm a');
};

const shortRef = (id: string) => id.slice(-6).toUpperCase();

function mapsHref(lat: number, lng: number, address: string): string {
  const hasCoords =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !(lat === 0 && lng === 0);
  if (hasCoords) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function assigneeFromApi(
  a: ServiceAssignee | string | undefined
): { name: string; phone?: string } | null {
  if (!a || typeof a === 'string') return null;
  if (a.name) return { name: a.name, phone: a.phone };
  return null;
}

function statusGuidance(status: ServiceStatus): string | null {
  switch (status) {
    case 'pending':
      return 'We will assign a provider shortly.';
    case 'assigned':
      return 'A provider has been assigned. They may contact you before arrival.';
    case 'in-progress':
      return 'Service is in progress.';
    case 'completed':
      return 'This service is complete. Thank you for using AutoTek.';
    default:
      return null;
  }
}

export const MyServices = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | 'all'>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<'all' | 'towing' | 'car'>('all');
  const [showCancelModal, setShowCancelModal] = useState<{
    show: boolean;
    type: 'towing' | 'car';
    id: string;
  } | null>(null);

  const [quoteModal, setQuoteModal] = useState<{
    type: 'towing' | 'car';
    service: TowingService | CarService;
  } | null>(null);
  const [quoteMobile, setQuoteMobile] = useState('');
  const [quoteWhatsapp, setQuoteWhatsapp] = useState('');
  const [sameWhatsappAsMobile, setSameWhatsappAsMobile] = useState(false);
  const [quoteNotes, setQuoteNotes] = useState('');
  const [quoteFieldErrors, setQuoteFieldErrors] = useState<{
    mobile?: string;
    whatsApp?: string;
  }>({});

  // Fetch services
  const { data: towingData, isLoading: isLoadingTowing } = useGetTowingServicesQuery();
  const { data: carData, isLoading: isLoadingCar } = useGetCarServicesQuery();

  // Cancel mutations
  const [cancelTowing, { isLoading: isCancellingTowing }] = useCancelTowingServiceMutation();
  const [cancelCar, { isLoading: isCancellingCar }] = useCancelCarServiceMutation();
  const [requestTowingQuote, { isLoading: isSubmittingTowingQuote }] =
    useRequestTowingQuoteMutation();
  const [requestCarQuote, { isLoading: isSubmittingCarQuote }] =
    useRequestCarServiceQuoteMutation();

  useEffect(() => {
    if (!quoteModal) return;
    if (sameWhatsappAsMobile) {
      setQuoteWhatsapp(quoteMobile);
    }
  }, [quoteModal, sameWhatsappAsMobile, quoteMobile]);

  const towingServices = towingData?.services || [];
  const carServices = carData?.services || [];

  // Combine and filter services
  const allServices = useMemo(() => {
    const combined: Array<{ type: 'towing' | 'car'; service: TowingService | CarService }> = [
      ...towingServices.map((s) => ({ type: 'towing' as const, service: s })),
      ...carServices.map((s) => ({ type: 'car' as const, service: s })),
    ];

    let filtered = combined;

    // Filter by service type
    if (serviceTypeFilter !== 'all') {
      filtered = filtered.filter((item) => item.type === serviceTypeFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((item) => item.service.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((item) => {
        const service = item.service;
        const query = searchQuery.toLowerCase();

        if (item.type === 'towing') {
          const towingService = service as TowingService;
          return (
            towingService.location.address.toLowerCase().includes(query) ||
            towingService.destination?.address.toLowerCase().includes(query) ||
            towingService.vehicleType.toLowerCase().includes(query) ||
            (towingService.vehicleModel?.toLowerCase().includes(query) ?? false)
          );
        } else {
          const carService = service as CarService;
          return (
            carService.location.address.toLowerCase().includes(query) ||
            carService.vehicleType.toLowerCase().includes(query) ||
            (carService.vehicleModel?.toLowerCase().includes(query) ?? false) ||
            serviceTypeInfo[carService.serviceType]?.name.toLowerCase().includes(query)
          );
        }
      });
    }

    // Sort by date (most recent first)
    filtered.sort((a, b) => {
      return new Date(b.service.createdAt).getTime() - new Date(a.service.createdAt).getTime();
    });

    return filtered;
  }, [towingServices, carServices, serviceTypeFilter, statusFilter, searchQuery]);

  // Calculate statistics
  const totalServices = allServices.length;
  const pendingServices = allServices.filter((s) => s.service.status === 'pending').length;
  const completedServices = allServices.filter((s) => s.service.status === 'completed').length;
  const totalSpent = allServices
    .filter((s) => s.service.paymentStatus === 'completed')
    .reduce((sum, item) => sum + (item.service.estimatedCost || 0), 0);

  const isLoading = isLoadingTowing || isLoadingCar;

  const handleCancelService = async () => {
    if (!showCancelModal) return;

    try {
      if (showCancelModal.type === 'towing') {
        await cancelTowing(showCancelModal.id).unwrap();
      } else {
        await cancelCar(showCancelModal.id).unwrap();
      }
      setShowCancelModal(null);
    } catch (error) {
      console.error('Failed to cancel service:', error);
    }
  };

  const handlePayForService = (service: TowingService | CarService, type: 'towing' | 'car') => {
    if (!service.estimatedCost || service.estimatedCost <= 0) return;
    const params = new URLSearchParams({ [`${type}ServiceId`]: service._id });
    navigate(`/service-payment?${params.toString()}`);
  };

  const canPayOnline = (service: TowingService | CarService): boolean => {
    return (
      service.paymentStatus === 'pending' &&
      service.status !== 'cancelled' &&
      service.estimatedCost != null &&
      service.estimatedCost > 0
    );
  };

  const canRequestQuote = (service: TowingService | CarService): boolean => {
    return (
      service.paymentStatus === 'pending' &&
      service.status !== 'cancelled' &&
      service.status !== 'completed' &&
      (service.estimatedCost == null || service.estimatedCost <= 0)
    );
  };

  const openQuoteModal = (service: TowingService | CarService, type: 'towing' | 'car') => {
    setQuoteModal({ type, service });
    const m = service.quoteMobilePhone || '';
    const w = service.quoteWhatsAppPhone || '';
    setQuoteMobile(m);
    if (m && w) {
      const same = m === w;
      setSameWhatsappAsMobile(same);
      setQuoteWhatsapp(same ? m : w);
    } else {
      setSameWhatsappAsMobile(true);
      setQuoteWhatsapp(m);
    }
    setQuoteNotes(service.quoteRequestNotes || '');
    setQuoteFieldErrors({});
  };

  const handleSubmitQuoteRequest = async () => {
    if (!quoteModal) return;
    const mobilePhone = quoteMobile.trim();
    const whatsAppPhone = sameWhatsappAsMobile ? mobilePhone : quoteWhatsapp.trim();

    const mobileCheck = validateMalawiPhoneField(mobilePhone, 'Mobile number (for calls)');
    const whatsCheck = validateMalawiPhoneField(whatsAppPhone, 'WhatsApp number');
    if (!mobileCheck.ok || !whatsCheck.ok) {
      setQuoteFieldErrors({
        mobile: mobileCheck.ok ? undefined : mobileCheck.message,
        whatsApp: whatsCheck.ok ? undefined : whatsCheck.message,
      });
      return;
    }
    setQuoteFieldErrors({});

    try {
      const body = {
        mobilePhone,
        whatsAppPhone,
        quoteRequestNotes: quoteNotes.trim() || undefined,
      };
      const res =
        quoteModal.type === 'towing'
          ? await requestTowingQuote({ id: quoteModal.service._id, body }).unwrap()
          : await requestCarQuote({ id: quoteModal.service._id, body }).unwrap();
      dispatch(showNotification({ message: res.message, type: 'success' }));
      setQuoteModal(null);
    } catch (err) {
      const { message } = getErrorInfo(err, 'Could not send quote request');
      dispatch(showNotification({ message, type: 'error' }));
    }
  };

  const canCancelService = (service: TowingService | CarService): boolean => {
    return service.status === 'pending' || service.status === 'assigned';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'My Services' },
          ]}
        />

        {/* Header */}
        <div className="mb-8 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <H1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent mb-2">
                My Services
              </H1>
              <Body className="text-gray-600">
                View and manage your service requests
              </Body>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 border-2 border-teal-100 bg-gradient-to-br from-teal-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Services</p>
                  <p className="text-2xl font-bold text-teal-700 mt-1">{totalServices}</p>
                </div>
                <Package className="w-10 h-10 text-teal-500 opacity-20" />
              </div>
            </Card>

            <Card className="p-4 border-2 border-amber-100 bg-gradient-to-br from-amber-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-amber-700 mt-1">{pendingServices}</p>
                </div>
                <Clock className="w-10 h-10 text-amber-500 opacity-20" />
              </div>
            </Card>

            <Card className="p-4 border-2 border-green-100 bg-gradient-to-br from-green-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Completed</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">{completedServices}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-500 opacity-20" />
              </div>
            </Card>

            <Card className="p-4 border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Spent</p>
                  <p className="text-2xl font-bold text-blue-700 mt-1">
                    MWK {totalSpent.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="w-10 h-10 text-blue-500 opacity-20" />
              </div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Service Type Filter */}
              <select
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value as 'all' | 'towing' | 'car')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="all">All Services</option>
                <option value="towing">Towing Only</option>
                <option value="car">Car Services Only</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ServiceStatus | 'all')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </Card>
        </div>

        {/* Services List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
          </div>
        ) : allServices.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <H2 className="text-xl font-semibold text-gray-700 mb-2">No Services Found</H2>
            <Body className="text-gray-500 mb-6">
              {searchQuery || statusFilter !== 'all' || serviceTypeFilter !== 'all'
                ? 'Try adjusting your filters'
                : "You haven't requested any services yet"}
            </Body>
            <Button onClick={() => navigate('/book-service')}>Book a Service</Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {allServices.map(({ type, service }) => {
              const isTowing = type === 'towing';
              const towingService = isTowing ? (service as TowingService) : null;
              const carService = !isTowing ? (service as CarService) : null;
              const assignedDriver = isTowing ? assigneeFromApi(towingService?.assignedDriver) : null;
              const assignedMechanic = !isTowing ? assigneeFromApi(carService?.assignedMechanic) : null;
              const pickupSource =
                towingService?.pickupLocationMethod === 'pin'
                  ? 'Map pin (town matched)'
                  : 'Selected town and landmark';
              const destinationSource =
                towingService?.destinationLocationMethod === 'pin'
                  ? 'Map pin (town matched)'
                  : 'Selected town and landmark';
              const serviceSource =
                carService?.serviceLocationMethod === 'pin'
                  ? 'Map pin (town matched)'
                  : 'Selected town and landmark';

              return (
                <Card key={service._id} className="p-4 sm:p-6 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 w-full items-start gap-3 sm:gap-4 sm:flex-1">
                      {/* Icon */}
                      <div
                        className={`p-3 rounded-lg ${
                          isTowing
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-teal-100 text-teal-600'
                        }`}
                      >
                        {isTowing ? (
                          <Truck className="w-6 h-6" />
                        ) : (
                          <Wrench className="w-6 h-6" />
                        )}
                      </div>

                      {/* Service Details */}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 gap-y-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {isTowing
                              ? 'Towing Service'
                              : serviceTypeInfo[carService?.serviceType || 'other']?.name}
                          </h3>
                          <span
                            className="inline-flex items-center gap-1 text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200"
                            title="Use this reference when contacting support"
                          >
                            <Hash className="w-3 h-3" />
                            {shortRef(service._id)}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(
                              service.status
                            )}`}
                          >
                            {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadgeColor(
                              service.paymentStatus
                            )}`}
                          >
                            {service.paymentStatus === 'completed'
                              ? 'Paid'
                              : service.paymentStatus === 'pending'
                              ? 'Unpaid'
                              : 'Payment Failed'}
                          </span>
                        </div>

                        {service.paymentStatus === 'pending' &&
                          service.status !== 'cancelled' &&
                          service.status !== 'completed' &&
                          service.estimatedCost != null &&
                          service.estimatedCost > 0 && (
                            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 mb-2">
                              Complete payment in MWK to confirm your booking.
                            </p>
                          )}

                        {service.paymentStatus === 'pending' &&
                          service.status !== 'cancelled' &&
                          service.status !== 'completed' &&
                          (!service.estimatedCost || service.estimatedCost <= 0) && (
                            <div className="space-y-2 mb-2">
                              <p className="text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                                <span className="font-semibold">Price not set yet.</span>{' '}
                                Use <span className="font-medium">Contact for quote</span> so we can review your
                                request and send you an amount in Malawi Kwacha (MWK).
                              </p>
                              <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                                Final pricing may change if vehicle, location, or other details are not accurate.
                                We will call or message you to confirm before setting your quote.
                              </p>
                              {service.quoteRequestSubmittedAt && (
                                <p className="text-xs text-gray-600">
                                  Quote request last sent:{' '}
                                  {formatDateTime(service.quoteRequestSubmittedAt)}. You can send again to update
                                  your numbers.
                                </p>
                              )}
                            </div>
                          )}

                        {statusGuidance(service.status) && service.status !== 'cancelled' && (
                          <p className="text-sm text-teal-900 bg-teal-50 border border-teal-100 rounded-md px-3 py-2 mb-2">
                            {statusGuidance(service.status)}
                          </p>
                        )}

                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-start gap-2">
                            <Car className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                              <span className="font-medium text-gray-800">Vehicle: </span>
                              {service.vehicleType || 'Not specified'}
                              {service.vehicleModel ? ` · ${service.vehicleModel}` : ''}
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium">
                                {isTowing
                                  ? `${towingService?.location.address} → ${towingService?.destination?.address || 'Not specified'}`
                                  : carService?.location.address}
                              </div>
                              {isTowing && towingService?.location.description && (
                                <div className="text-sm text-gray-600 italic mt-1">
                                  Pickup: {towingService.location.description}
                                </div>
                              )}
                              {isTowing && towingService?.destination?.description && (
                                <div className="text-sm text-gray-600 italic mt-1">
                                  Destination: {towingService.destination.description}
                                </div>
                              )}
                              {!isTowing && carService?.location.description && (
                                <div className="text-sm text-gray-600 italic mt-1">
                                  Location: {carService.location.description}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                                <a
                                  href={mapsHref(
                                    service.location.latitude,
                                    service.location.longitude,
                                    service.location.address
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium text-xs"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  {isTowing ? 'Open pickup in Maps' : 'Open location in Maps'}
                                </a>
                                {isTowing &&
                                  towingService?.destination?.address &&
                                  towingService.destination.latitude !== undefined &&
                                  towingService.destination.longitude !== undefined && (
                                    <a
                                      href={mapsHref(
                                        towingService.destination.latitude,
                                        towingService.destination.longitude,
                                        towingService.destination.address
                                      )}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium text-xs"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      Open destination in Maps
                                    </a>
                                  )}
                              </div>
                              <div className="mt-2 text-xs text-gray-500">
                                {isTowing ? (
                                  <>
                                    <div>Pickup source: {pickupSource}</div>
                                    <div>Destination source: {destinationSource}</div>
                                    {towingService?.pickupLocationMethod === 'pin' && (
                                      <div>
                                        Pickup pin: {towingService.location.latitude.toFixed(6)},{' '}
                                        {towingService.location.longitude.toFixed(6)}
                                      </div>
                                    )}
                                    {towingService?.destinationLocationMethod === 'pin' &&
                                      towingService.destination && (
                                        <div>
                                          Destination pin: {towingService.destination.latitude.toFixed(6)},{' '}
                                          {towingService.destination.longitude.toFixed(6)}
                                        </div>
                                      )}
                                  </>
                                ) : (
                                  <>
                                    <div>Location source: {serviceSource}</div>
                                    {carService?.serviceLocationMethod === 'pin' && (
                                      <div>
                                        Service pin: {carService.location.latitude.toFixed(6)},{' '}
                                        {carService.location.longitude.toFixed(6)}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                            <span>Requested: {formatDateTime(service.createdAt)}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                            <span>Last updated: {formatDateTime(service.updatedAt)}</span>
                          </div>

                          {!isTowing && carService?.preferredDate && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                              <span>
                                Preferred: {formatDate(carService.preferredDate)}
                                {carService.preferredTime ? ` at ${carService.preferredTime}` : ''}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 flex-wrap">
                            {service.estimatedCost != null && service.estimatedCost > 0 ? (
                              <>
                                <span
                                  className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded px-1.5 py-0.5 shrink-0"
                                  aria-hidden
                                >
                                  MWK
                                </span>
                                <span className="font-medium text-gray-900">
                                  {service.estimatedCost.toLocaleString()}
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-600 font-medium">Price not set yet</span>
                            )}
                          </div>

                          {assignedDriver && (
                            <div className="flex items-start gap-2">
                              <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                              <div>
                                <span className="font-medium text-gray-800">Assigned driver: </span>
                                {assignedDriver.name}
                                {assignedDriver.phone && (
                                  <span className="text-gray-600"> · {assignedDriver.phone}</span>
                                )}
                              </div>
                            </div>
                          )}

                          {assignedMechanic && (
                            <div className="flex items-start gap-2">
                              <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                              <div>
                                <span className="font-medium text-gray-800">Assigned mechanic: </span>
                                {assignedMechanic.name}
                                {assignedMechanic.phone && (
                                  <span className="text-gray-600"> · {assignedMechanic.phone}</span>
                                )}
                              </div>
                            </div>
                          )}

                          {service.notes && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700">{service.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions: full-width stack on mobile so title/body keep the row width */}
                    <div className="flex w-full shrink-0 flex-col gap-2 border-t border-gray-100 pt-4 sm:w-auto sm:border-t-0 sm:pt-0 sm:pl-2">
                      {canPayOnline(service) && (
                        <Button
                          size="sm"
                          variant="primary"
                          className="w-full justify-center sm:w-auto"
                          onClick={() => handlePayForService(service, type)}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay Now (MWK)
                        </Button>
                      )}

                      {canRequestQuote(service) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full justify-center sm:w-auto"
                          onClick={() => openQuoteModal(service, type)}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Contact for quote
                        </Button>
                      )}

                      {canCancelService(service) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full justify-center sm:w-auto"
                          onClick={() =>
                            setShowCancelModal({
                              show: true,
                              type,
                              id: service._id,
                            })
                          }
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Quote request modal */}
        {quoteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Contact for quote</h3>
                <button
                  type="button"
                  onClick={() => setQuoteModal(null)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                  disabled={isSubmittingTowingQuote || isSubmittingCarQuote}
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-3">
                Add the numbers we should use to reach you. Our team will confirm your service details before
                setting your price in Malawi Kwacha (MWK).
              </p>

              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900">
                  If pickup location, vehicle, or other information is not accurate, the quoted amount may change
                  after we verify with you.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="quote-mobile" className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile number (for calls)
                  </label>
                  <Input
                    id="quote-mobile"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+265991234567 or 0991234567"
                    value={quoteMobile}
                    error={quoteFieldErrors.mobile}
                    onChange={(e) => {
                      setQuoteMobile(e.target.value);
                      setQuoteFieldErrors((prev) => ({ ...prev, mobile: undefined }));
                    }}
                    disabled={isSubmittingTowingQuote || isSubmittingCarQuote}
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    checked={sameWhatsappAsMobile}
                    onChange={(e) => {
                      setSameWhatsappAsMobile(e.target.checked);
                      setQuoteFieldErrors((prev) => ({ ...prev, whatsApp: undefined }));
                    }}
                    disabled={isSubmittingTowingQuote || isSubmittingCarQuote}
                  />
                  WhatsApp number is the same as mobile
                </label>

                {!sameWhatsappAsMobile && (
                  <div>
                    <label htmlFor="quote-wa" className="block text-sm font-medium text-gray-700 mb-1">
                      WhatsApp number
                    </label>
                    <Input
                      id="quote-wa"
                      type="tel"
                      autoComplete="tel"
                      placeholder="+265991234567 or 0991234567"
                      value={quoteWhatsapp}
                      error={quoteFieldErrors.whatsApp}
                      onChange={(e) => {
                        setQuoteWhatsapp(e.target.value);
                        setQuoteFieldErrors((prev) => ({ ...prev, whatsApp: undefined }));
                      }}
                      disabled={isSubmittingTowingQuote || isSubmittingCarQuote}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="quote-notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Note for our team (optional)
                  </label>
                  <textarea
                    id="quote-notes"
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-sm"
                    placeholder="Best time to call, landmarks, etc."
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    disabled={isSubmittingTowingQuote || isSubmittingCarQuote}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setQuoteModal(null)}
                  disabled={isSubmittingTowingQuote || isSubmittingCarQuote}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleSubmitQuoteRequest}
                  disabled={isSubmittingTowingQuote || isSubmittingCarQuote}
                >
                  {isSubmittingTowingQuote || isSubmittingCarQuote ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send quote request'
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Cancel Service</h3>
                <button
                  onClick={() => setShowCancelModal(null)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Are you sure?</p>
                    <p className="text-sm text-amber-700 mt-1">
                      This action cannot be undone. If you've already paid, a refund will be
                      processed within 3-5 business days.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCancelModal(null)}
                  className="flex-1"
                  disabled={isCancellingTowing || isCancellingCar}
                >
                  Keep Service
                </Button>
                <Button
                  variant="danger"
                  onClick={handleCancelService}
                  className="flex-1"
                  disabled={isCancellingTowing || isCancellingCar}
                >
                  {isCancellingTowing || isCancellingCar ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Yes, Cancel Service'
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
