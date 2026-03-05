import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store/types';
import { useGetTowingServicesQuery, useGetCarServicesQuery, type TowingService, type CarService } from '../store/api/serviceApi';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { H1, H2, H3, Body } from '../components/ui/Typography';
import { useScrollReveal } from '../hooks/useScrollReveal';
import {
  Wrench,
  Truck,
  Calendar,
  MapPin,
  DollarSign,
  CheckCircle,
  Clock,
  Shield,
  Star,
  Sparkles,
  ArrowRight,
  Zap,
  Settings,
  Battery,
  Droplet,
  Gauge,
  Car,
  Phone,
  Mail,
  MessageCircle,
  Search,
  Filter,
  X,
  Loader2,
  Eye,
  AlertCircle,
} from 'lucide-react';
import type { ServiceStatus } from '@shared/types';

// Service type definitions for display
const serviceTypeInfo: Record<string, { name: string; icon: any; gradient: string; bgGradient: string; description: string }> = {
  'oil-change': {
    name: 'Oil Change',
    icon: Droplet,
    gradient: 'from-blue-500 to-blue-600',
    bgGradient: 'from-blue-50 to-blue-100',
    description: 'Professional engine oil change service at your location.',
  },
  'brake-pads': {
    name: 'Brake Pads Replacement',
    icon: Settings,
    gradient: 'from-red-500 to-red-600',
    bgGradient: 'from-red-50 to-red-100',
    description: 'Replace worn brake pads for safe driving.',
  },
  'spark-plugs': {
    name: 'Spark Plugs Replacement',
    icon: Zap,
    gradient: 'from-yellow-500 to-yellow-600',
    bgGradient: 'from-yellow-50 to-yellow-100',
    description: 'Replace spark plugs for better engine performance.',
  },
  'air-filter': {
    name: 'Air Filter Replacement',
    icon: Gauge,
    gradient: 'from-green-500 to-green-600',
    bgGradient: 'from-green-50 to-green-100',
    description: 'Replace air filter for cleaner engine air intake.',
  },
  'battery': {
    name: 'Battery Replacement',
    icon: Battery,
    gradient: 'from-purple-500 to-purple-600',
    bgGradient: 'from-purple-50 to-purple-100',
    description: 'Replace car battery with professional installation.',
  },
  'tire-rotation': {
    name: 'Tire Rotation',
    icon: Car,
    gradient: 'from-indigo-500 to-indigo-600',
    bgGradient: 'from-indigo-50 to-indigo-100',
    description: 'Rotate tires for even wear and longer lifespan.',
  },
};

export const Services = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<'towing' | 'car-service' | ''>('');
  const [selectedService, setSelectedService] = useState<TowingService | CarService | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);

  const heroRef = useScrollReveal(0.2);
  const towingRef = useScrollReveal(0.2);
  const servicesRef = useScrollReveal(0.2);
  const howItWorksRef = useScrollReveal(0.2);

  // Fetch services from API
  const { data: towingData, isLoading: isLoadingTowing, error: towingError } = useGetTowingServicesQuery({
    status: statusFilter || undefined,
  });

  const { data: carServiceData, isLoading: isLoadingCar, error: carError } = useGetCarServicesQuery({
    status: statusFilter || undefined,
  });

  useEffect(() => {
    document.body.classList.add('page-transition');
    return () => {
      document.body.classList.remove('page-transition');
    };
  }, []);

  const handleBookService = (serviceType: 'towing' | 'car-service', serviceId?: string) => {
    if (!isAuthenticated) {
      navigate(`/login?returnUrl=/book-service?service=${serviceType}${serviceId ? `&id=${serviceId}` : ''}`);
    } else {
      navigate(`/book-service?service=${serviceType}${serviceId ? `&id=${serviceId}` : ''}`);
    }
  };

  const handleViewService = (service: TowingService | CarService) => {
    setSelectedService(service);
    setShowServiceModal(true);
  };

  // Combine and filter services
  const allServices = useMemo(() => {
    const towingServices = (towingData?.services || []).map((s) => ({ ...s, type: 'towing' as const }));
    const carServices = (carServiceData?.services || []).map((s) => ({ ...s, type: 'car-service' as const }));
    return [...towingServices, ...carServices];
  }, [towingData, carServiceData]);

  const filteredServices = useMemo(() => {
    let filtered = allServices;

    // Filter by type
    if (typeFilter) {
      filtered = filtered.filter((s) => s.type === typeFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((s) => {
        if (s.type === 'towing') {
          const ts = s as TowingService;
          return (
            ts.vehicleType?.toLowerCase().includes(term) ||
            ts.vehicleModel?.toLowerCase().includes(term) ||
            ts.location?.address?.toLowerCase().includes(term) ||
            ts.destination?.address?.toLowerCase().includes(term)
          );
        } else {
          const cs = s as CarService;
          return (
            cs.serviceType?.toLowerCase().includes(term) ||
            cs.vehicleType?.toLowerCase().includes(term) ||
            cs.vehicleModel?.toLowerCase().includes(term) ||
            cs.location?.address?.toLowerCase().includes(term)
          );
        }
      });
    }

    return filtered;
  }, [allServices, typeFilter, searchTerm]);

  const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'accepted':
        return 'bg-blue-100 text-blue-700';
      case 'in-progress':
        return 'bg-purple-100 text-purple-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPrice = (price?: number) => {
    if (!price) return 'Contact for quote';
    return `MWK ${price.toLocaleString()}`;
  };

  const benefits = [
    { icon: Clock, title: '24/7 Availability', description: 'Emergency services available round the clock' },
    { icon: Shield, title: 'Certified Mechanics', description: 'All our mechanics are certified and experienced' },
    { icon: Star, title: 'Quality Guaranteed', description: 'We use only quality parts and materials' },
    { icon: MapPin, title: 'At Your Location', description: 'We come to you, no need to visit a garage' },
  ];

  const serviceSteps = [
    {
      number: 1,
      icon: Phone,
      title: 'Book Service',
      description: 'Choose your service and provide your vehicle and location details',
    },
    {
      number: 2,
      icon: Calendar,
      title: 'Schedule Appointment',
      description: 'Select your preferred date and time for the service',
    },
    {
      number: 3,
      icon: Truck,
      title: 'We Come to You',
      description: 'Our certified mechanic arrives at your location at the scheduled time',
    },
    {
      number: 4,
      icon: CheckCircle,
      title: 'Service Complete',
      description: 'Your vehicle is serviced professionally, and you pay securely',
    },
  ];

  const isLoading = isLoadingTowing || isLoadingCar;
  const hasError = towingError || carError;

  return (
    <div className="w-full page-transition">
      {/* Hero Section */}
      <section
        ref={heroRef.elementRef}
        className={`relative bg-gradient-to-br from-teal-50 via-white to-teal-50 overflow-hidden mb-16 animate-fade-in min-h-[85vh] flex items-center ${
          heroRef.isRevealed ? 'animate-slide-in-up' : ''
        }`}
      >
        <div className="absolute inset-0 geometric-pattern opacity-20"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920&q=80')] bg-cover bg-center opacity-15"></div>

        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob animation-delay-4000 transform -translate-x-1/2 -translate-y-1/2"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left animate-slide-in-left space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-700 rounded-full text-sm font-medium mb-4 animate-scale-in">
                <Sparkles className="h-4 w-4" />
                <span>Professional Mobile Auto Services</span>
              </div>

              <H1 className="mb-6 text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
                Auto Services{' '}
                <span className="bg-gradient-to-r from-teal-600 to-teal-400 bg-clip-text text-transparent">
                  Delivered to You
                </span>
              </H1>

              <Body className="text-xl text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Professional automotive services performed at your location. Our certified mechanics bring
                expertise, quality parts, and convenience right to your doorstep.
              </Body>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  variant="primary"
                  size="large"
                  onClick={() => handleBookService('car-service')}
                  className="group animate-scale-in"
                >
                  <Wrench className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-500" />
                  Book Car Service
                  <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  variant="secondary"
                  size="large"
                  onClick={() => handleBookService('towing')}
                  className="group animate-scale-in"
                  style={{ animationDelay: '100ms' }}
                >
                  <Truck className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                  Emergency Towing
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-6 mt-8 justify-center lg:justify-start">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-5 w-5 text-teal-600" />
                  <span className="font-medium">Certified Mechanics</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-5 w-5 text-teal-600" />
                  <span className="font-medium">24/7 Available</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-5 w-5 text-teal-600" />
                  <span className="font-medium">Quality Guaranteed</span>
                </div>
              </div>
            </div>

            <div className="relative hidden lg:block animate-slide-in-right">
              <div className="relative z-10">
                <div className="relative bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl p-8 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                  <div className="bg-white rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-16 w-16 bg-teal-100 rounded-xl flex items-center justify-center">
                        <Truck className="h-8 w-8 text-teal-600" />
                      </div>
                      <div>
                        <H3 className="text-xl font-bold text-gray-900">24/7 Towing</H3>
                        <Body className="text-gray-600 text-sm">Available Now</Body>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle className="h-4 w-4 text-teal-600" />
                        <span>Fast response time</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle className="h-4 w-4 text-teal-600" />
                        <span>Professional drivers</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle className="h-4 w-4 text-teal-600" />
                        <span>Safe vehicle transport</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-teal-200 rounded-full opacity-50 animate-float"></div>
              <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-teal-300 rounded-full opacity-40 animate-float animation-delay-2000"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card
                  key={index}
                  variant="sm"
                  className="text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-2 border-transparent hover:border-teal-200 group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex flex-col items-center p-6">
                    <div className="h-16 w-16 bg-gradient-to-br from-teal-100 to-teal-200 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                      <Icon className="h-8 w-8 text-teal-600" />
                    </div>
                    <H3 className="text-lg font-bold mb-2 group-hover:text-teal-600 transition-colors">
                      {benefit.title}
                    </H3>
                    <Body className="text-gray-600 text-sm">{benefit.description}</Body>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Services List Section - NEW */}
      <section className="py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <H2 className="text-4xl font-bold text-gray-900 mb-4">Available Services</H2>
            <Body className="text-lg text-gray-600 max-w-2xl mx-auto">
              Browse and book from our available towing and car services
            </Body>
          </div>

          {/* Search and Filters */}
          <Card variant="md" className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by vehicle, location..."
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as 'towing' | 'car-service' | '')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                >
                  <option value="">All Types</option>
                  <option value="towing">Towing</option>
                  <option value="car-service">Car Service</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ServiceStatus | '')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            {(searchTerm || typeFilter || statusFilter) && (
              <div className="mt-4 flex items-center justify-end">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => {
                    setSearchTerm('');
                    setTypeFilter('');
                    setStatusFilter('');
                  }}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Clear Filters
                </Button>
              </div>
            )}
          </Card>

          {/* Services List */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
            </div>
          ) : hasError ? (
            <Card variant="md" className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <Body className="text-red-600">Failed to load services. Please try again later.</Body>
            </Card>
          ) : filteredServices.length === 0 ? (
            <Card variant="md" className="text-center py-12">
              <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <Body className="text-gray-600 text-lg font-semibold mb-2">No services found</Body>
              <Body className="text-gray-500 mb-4">
                {searchTerm || typeFilter || statusFilter
                  ? 'Try adjusting your search or filters'
                  : 'No services available at the moment'}
              </Body>
              {!searchTerm && !typeFilter && !statusFilter && (
                <Button onClick={() => handleBookService('car-service')}>
                  <Wrench className="h-5 w-5 mr-2" />
                  Book a Service
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((service) => {
                const isTowing = service.type === 'towing';
                const serviceInfo = isTowing
                  ? null
                  : serviceTypeInfo[(service as CarService).serviceType || ''] || {
                      name: (service as CarService).serviceType || 'Car Service',
                      icon: Wrench,
                      gradient: 'from-gray-500 to-gray-600',
                      bgGradient: 'from-gray-50 to-gray-100',
                      description: 'Professional car service',
                    };
                const Icon = isTowing ? Truck : serviceInfo?.icon || Wrench;

                return (
                  <Card
                    key={service._id}
                    variant="md"
                    className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 border-2 border-transparent hover:border-teal-200 overflow-hidden relative"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${serviceInfo?.bgGradient || 'from-teal-50 to-teal-100'} opacity-50`}></div>
                    <div className="relative p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`h-16 w-16 bg-gradient-to-br ${serviceInfo?.gradient || 'from-teal-500 to-teal-600'} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                          <Icon className="h-8 w-8 text-white" />
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                          {service.status}
                        </span>
                      </div>

                      <H3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-teal-600 transition-colors">
                        {isTowing ? 'Towing Service' : serviceInfo?.name || 'Car Service'}
                      </H3>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Car className="h-4 w-4 text-gray-400" />
                          <span>{isTowing ? (service as TowingService).vehicleType : (service as CarService).vehicleType}</span>
                          {(service as TowingService).vehicleModel && (
                            <span className="text-gray-400">• {(service as TowingService).vehicleModel}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="line-clamp-1">{service.location?.address || 'Location not specified'}</span>
                        </div>
                        {isTowing && (service as TowingService).destination && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            <span className="line-clamp-1">{(service as TowingService).destination?.address}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span>{formatPrice(service.estimatedCost)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(service.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => handleViewService(service)}
                          className="flex-1 gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </Button>
                        {service.status === 'pending' && (
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => handleBookService(service.type, service._id)}
                            className="gap-2"
                          >
                            <Calendar className="h-4 w-4" />
                            Book
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Towing Service Section */}
      <section
        ref={towingRef.elementRef}
        className={`py-16 bg-gradient-to-b from-white to-gray-50 ${
          towingRef.isRevealed ? 'animate-fade-in' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="h-12 w-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <H2 className="text-4xl font-bold text-gray-900">Towing Services</H2>
            </div>
            <Body className="text-lg text-gray-600 max-w-2xl mx-auto">
              Fast and reliable towing service available 24/7. We'll safely transport your vehicle to your
              preferred destination.
            </Body>
          </div>

          <Card variant="lg" className="overflow-hidden border-2 border-teal-100 shadow-xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <H3 className="text-2xl font-bold text-gray-900">24/7 Emergency Towing</H3>
                </div>
                <Body className="text-gray-600 mb-6 text-lg leading-relaxed">
                  Fast and reliable towing service available 24/7. We'll safely transport your vehicle to
                  your preferred destination with professional drivers and proper equipment.
                </Body>
                <div className="flex items-center gap-3 mb-6 p-4 bg-teal-50 rounded-lg border border-teal-100">
                  <DollarSign className="h-6 w-6 text-teal-600" />
                  <div>
                    <Body className="font-semibold text-gray-900">Pricing</Body>
                    <Body className="text-gray-600 text-sm">Contact for quote based on distance</Body>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {['Available 24/7', 'Professional drivers', 'Safe vehicle transport', 'Fast response time', 'All vehicle types'].map((feature, index) => (
                    <li key={index} className="flex items-center gap-3 text-gray-700">
                      <CheckCircle className="h-5 w-5 text-teal-600 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="primary"
                  size="large"
                  onClick={() => handleBookService('towing')}
                  className="w-full lg:w-auto group"
                >
                  <Truck className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                  Book Towing Service
                  <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
              <div className="relative bg-gradient-to-br from-teal-100 to-teal-200 rounded-2xl overflow-hidden flex items-center justify-center p-8 min-h-[400px]">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80')] bg-cover bg-center opacity-40"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-teal-100/60 to-teal-200/60"></div>
                <Truck className="h-48 w-48 text-teal-600 opacity-90 relative z-10" />
                <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-4 border border-teal-200">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Phone className="h-4 w-4 text-teal-600" />
                    <span className="font-semibold">Call for Emergency: +265 XXX XXX XXX</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Car Services Section */}
      <section
        ref={servicesRef.elementRef}
        className={`py-16 bg-white ${
          servicesRef.isRevealed ? 'animate-fade-in' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="h-12 w-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Wrench className="h-6 w-6 text-white" />
              </div>
              <H2 className="text-4xl font-bold text-gray-900">Car Services</H2>
            </div>
            <Body className="text-lg text-gray-600 max-w-2xl mx-auto">
              Professional car maintenance services performed at your location. Our certified mechanics
              bring the expertise to you.
            </Body>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(serviceTypeInfo).map(([type, info]) => {
              const Icon = info.icon;
              return (
                <Card
                  key={type}
                  variant="md"
                  className={`group hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 border-2 border-transparent hover:border-teal-200 overflow-hidden relative bg-gradient-to-br ${info.bgGradient}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
                  <div className="relative p-6">
                    <div className="mb-4">
                      <div className={`h-16 w-16 bg-gradient-to-br ${info.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <H3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-teal-600 transition-colors">
                      {info.name}
                    </H3>
                    <Body className="text-gray-700 mb-6 text-sm leading-relaxed">
                      {info.description}
                    </Body>
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => handleBookService('car-service', type)}
                      className="w-full group/btn"
                    >
                      <Calendar className="h-4 w-4 mr-2 group-hover/btn:rotate-12 transition-transform" />
                      Book Service
                      <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        ref={howItWorksRef.elementRef}
        className={`py-20 bg-gradient-to-b from-teal-50/50 via-white to-white relative overflow-hidden ${
          howItWorksRef.isRevealed ? 'animate-fade-in' : ''
        }`}
      >
        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-teal-200 to-transparent hidden lg:block"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <H2 className="text-4xl font-bold mb-4">How It Works</H2>
            <Body className="text-gray-600 max-w-2xl mx-auto text-lg">
              Get professional auto services in 4 simple steps
            </Body>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-200 via-teal-300 to-teal-200">
              <div className="absolute top-1/2 left-1/4 w-3 h-3 bg-teal-500 rounded-full transform -translate-y-1/2 -translate-x-1/2 animate-pulse"></div>
              <div className="absolute top-1/2 left-2/4 w-3 h-3 bg-teal-500 rounded-full transform -translate-y-1/2 -translate-x-1/2 animate-pulse animation-delay-2000"></div>
              <div className="absolute top-1/2 left-3/4 w-3 h-3 bg-teal-500 rounded-full transform -translate-y-1/2 -translate-x-1/2 animate-pulse animation-delay-4000"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
              {serviceSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <Card
                    key={step.number}
                    variant="md"
                    className="relative text-center group hover:shadow-2xl transition-all duration-500 border-2 border-transparent hover:border-teal-200 bg-white hover:-translate-y-3"
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    {index < serviceSteps.length - 1 && (
                      <div className="absolute top-20 -right-4 w-8 h-0.5 bg-teal-200 hidden md:block lg:hidden">
                        <div className="absolute right-0 top-1/2 w-2 h-2 bg-teal-500 rounded-full transform -translate-y-1/2 translate-x-1/2"></div>
                      </div>
                    )}

                    <div className="flex flex-col items-center p-6">
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-20">
                        <div className="relative">
                          <div className="h-12 w-12 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg group-hover:scale-110 group-hover:shadow-teal-500/50 transition-all duration-300">
                            {step.number}
                          </div>
                          <div className="absolute inset-0 bg-teal-400 rounded-full opacity-0 group-hover:opacity-30 blur-md transition-opacity duration-300"></div>
                        </div>
                      </div>

                      <div className="relative mb-6 mt-6">
                        <div className="h-20 w-20 bg-gradient-to-br from-teal-100 to-teal-200 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg group-hover:shadow-teal-200/50">
                          <Icon className="h-10 w-10 text-teal-600 group-hover:text-teal-700 transition-colors" />
                        </div>
                        <div className="absolute -inset-2 bg-teal-200 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500"></div>
                      </div>

                      <H3 className="mb-3 text-lg font-bold group-hover:text-teal-600 transition-colors duration-300">
                        {step.title}
                      </H3>
                      <Body className="text-gray-600 text-sm leading-relaxed">{step.description}</Body>

                      <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <CheckCircle className="h-6 w-6 text-teal-500 mx-auto animate-scale-in" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-teal-600 to-teal-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920&q=80')] bg-cover bg-center opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-teal-600/80 to-teal-700/80"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <H2 className="text-4xl font-bold mb-4">Ready to Get Started?</H2>
          <Body className="text-xl text-teal-100 mb-8 max-w-2xl mx-auto">
            Book your service today and experience professional auto care delivered to your location
          </Body>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="secondary"
              size="large"
              onClick={() => handleBookService('car-service')}
              className="bg-white text-teal-600 hover:bg-teal-50 group"
            >
              <Wrench className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-500" />
              Book Car Service
            </Button>
            <Button
              variant="outline"
              size="large"
              onClick={() => handleBookService('towing')}
              className="border-2 border-white text-white hover:bg-white/10 group"
            >
              <Truck className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
              Emergency Towing
            </Button>
          </div>
        </div>
      </section>

      {/* Service Details Modal */}
      {showServiceModal && selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card variant="lg" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <H2 className="text-2xl font-bold text-gray-900">
                {selectedService.type === 'towing' ? 'Towing Service Details' : 'Car Service Details'}
              </H2>
              <Button variant="ghost" size="small" onClick={() => setShowServiceModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedService.status)}`}>
                  {selectedService.status}
                </span>
              </div>

              <div>
                <span className="text-sm font-medium text-gray-700">Vehicle Type</span>
                <Body className="text-gray-900 mt-1">
                  {selectedService.type === 'towing'
                    ? (selectedService as TowingService).vehicleType
                    : (selectedService as CarService).vehicleType}
                </Body>
              </div>

              {selectedService.vehicleModel && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Vehicle Model</span>
                  <Body className="text-gray-900 mt-1">{selectedService.vehicleModel}</Body>
                </div>
              )}

              {selectedService.type === 'car-service' && (selectedService as CarService).serviceType && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Service Type</span>
                  <Body className="text-gray-900 mt-1">
                    {serviceTypeInfo[(selectedService as CarService).serviceType || '']?.name || (selectedService as CarService).serviceType}
                  </Body>
                </div>
              )}

              <div>
                <span className="text-sm font-medium text-gray-700">Location</span>
                <Body className="text-gray-900 mt-1">{selectedService.location?.address || 'Not specified'}</Body>
              </div>

              {selectedService.type === 'towing' && (selectedService as TowingService).destination && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Destination</span>
                  <Body className="text-gray-900 mt-1">{(selectedService as TowingService).destination?.address}</Body>
                </div>
              )}

              {selectedService.type === 'car-service' && (selectedService as CarService).preferredDate && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Preferred Date</span>
                  <Body className="text-gray-900 mt-1">{(selectedService as CarService).preferredDate}</Body>
                </div>
              )}

              {selectedService.type === 'car-service' && (selectedService as CarService).preferredTime && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Preferred Time</span>
                  <Body className="text-gray-900 mt-1">{(selectedService as CarService).preferredTime}</Body>
                </div>
              )}

              <div>
                <span className="text-sm font-medium text-gray-700">Estimated Cost</span>
                <Body className="text-gray-900 mt-1">{formatPrice(selectedService.estimatedCost)}</Body>
              </div>

              {selectedService.notes && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Notes</span>
                  <Body className="text-gray-900 mt-1">{selectedService.notes}</Body>
                </div>
              )}

              <div>
                <span className="text-sm font-medium text-gray-700">Created</span>
                <Body className="text-gray-900 mt-1">{formatDate(selectedService.createdAt)}</Body>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="primary"
                  onClick={() => {
                    setShowServiceModal(false);
                    handleBookService(selectedService.type, selectedService._id);
                  }}
                  className="flex-1"
                  disabled={selectedService.status !== 'pending'}
                >
                  {selectedService.status === 'pending' ? 'Book This Service' : 'Service Unavailable'}
                </Button>
                <Button variant="secondary" onClick={() => setShowServiceModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
