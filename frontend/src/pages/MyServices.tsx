import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetTowingServicesQuery,
  useGetCarServicesQuery,
  useCancelTowingServiceMutation,
  useCancelCarServiceMutation,
  type TowingService,
  type CarService,
} from '../store/api/serviceApi';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { H1, H2, Body } from '../components/ui/Typography';
import { Breadcrumb } from '../components/Breadcrumb';
import {
  Truck,
  Wrench,
  Loader2,
  Filter,
  Search,
  Calendar,
  MapPin,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  CreditCard,
  X,
  Package,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import type { ServiceStatus, ServiceType } from '@shared/types';
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

export const MyServices = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | 'all'>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<'all' | 'towing' | 'car'>('all');
  const [showCancelModal, setShowCancelModal] = useState<{
    show: boolean;
    type: 'towing' | 'car';
    id: string;
  } | null>(null);

  // Fetch services
  const { data: towingData, isLoading: isLoadingTowing } = useGetTowingServicesQuery();
  const { data: carData, isLoading: isLoadingCar } = useGetCarServicesQuery();

  // Cancel mutations
  const [cancelTowing, { isLoading: isCancellingTowing }] = useCancelTowingServiceMutation();
  const [cancelCar, { isLoading: isCancellingCar }] = useCancelCarServiceMutation();

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
            towingService.vehicleType.toLowerCase().includes(query)
          );
        } else {
          const carService = service as CarService;
          return (
            carService.location.address.toLowerCase().includes(query) ||
            carService.vehicleType.toLowerCase().includes(query) ||
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
    // Navigate to payment page with service ID and amount
    const params = new URLSearchParams({
      [`${type}ServiceId`]: service._id,
      amount: (service.estimatedCost || 0).toString(),
    });
    navigate(`/service-payment?${params.toString()}`);
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

              return (
                <Card key={service._id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
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
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {isTowing
                              ? 'Towing Service'
                              : serviceTypeInfo[carService?.serviceType || 'other']?.name}
                          </h3>
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

                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div className="flex-1">
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
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>Requested: {formatDate(service.createdAt)}</span>
                          </div>

                          {!isTowing && carService?.preferredDate && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span>
                                Preferred: {formatDate(carService.preferredDate)}
                                {carService.preferredTime ? ` at ${carService.preferredTime}` : ''}
                              </span>
                            </div>
                          )}

                          {service.estimatedCost && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900">
                                MWK {service.estimatedCost.toLocaleString()}
                              </span>
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

                    {/* Actions */}
                    <div className="flex flex-col gap-2 ml-4">
                      {service.paymentStatus === 'pending' && service.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handlePayForService(service, type)}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay Now
                        </Button>
                      )}

                      {canCancelService(service) && (
                        <Button
                          size="sm"
                          variant="outline"
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
