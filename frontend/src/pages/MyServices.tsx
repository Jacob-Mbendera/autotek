import { useState, useMemo, useEffect, useRef, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetTowingServicesQuery,
  useGetCarServicesQuery,
  useCancelTowingServiceMutation,
  useCancelCarServiceMutation,
  useRequestTowingQuoteMutation,
  useRequestCarServiceQuoteMutation,
  useRateTowingProviderMutation,
  useRateCarServiceProviderMutation,
  type TowingService,
  type CarService,
  type ServiceAssignee,
} from '../store/api/serviceApi';
import { useAppDispatch } from '../store/types';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { validateMalawiPhoneField } from '../utils/phoneValidation';
import { useReconcilePendingPaychanguService } from '../hooks/useReconcilePendingPaychanguService';
import {
  subscribeServicePaychanguLocks,
  getServicePaychanguLockSnapshot,
  getServerServicePaychanguLockSnapshot,
  normalizeServiceId,
} from '../utils/pendingPaychanguService';
import {
  PageHeading,
  MonoLabel,
  JournalBody,
  JournalCard,
  JournalButton,
  JournalInput,
  StatusPill,
  SERVICE_STATUS_TONE,
  type StatusPillTone,
} from '../components/journal';
import { cn } from '../utils/cn';
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
const getCarServiceTypeLabels = (service: CarService): string[] => {
  const types =
    service.serviceTypes && service.serviceTypes.length > 0
      ? service.serviceTypes
      : service.serviceType
        ? [service.serviceType]
        : [];
  return types.map((type) => serviceTypeInfo[type]?.name || type);
};

const paymentStatusTone = (status: string): StatusPillTone =>
  status === 'completed' ? 'completed' : status === 'pending' ? 'unpaid' : 'unpaid';
const paymentStatusLabel = (status: string): string =>
  status === 'completed' ? 'Paid' : status === 'pending' ? 'Unpaid' : 'Payment Failed';

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
): { name: string; phone?: string; garageName?: string } | null {
  if (!a || typeof a === 'string') return null;
  if (a.name) {
    const garageName =
      typeof a.garage === 'object' && a.garage && 'name' in a.garage
        ? String((a.garage as { name?: string }).name || '')
        : undefined;
    return { name: a.name, phone: a.phone, garageName: garageName || undefined };
  }
  return null;
}

function statusGuidance(
  service: TowingService | CarService,
  isTowing: boolean
): string | null {
  const assigned = isTowing
    ? assigneeFromApi((service as TowingService).assignedDriver)
    : assigneeFromApi((service as CarService).assignedMechanic);

  switch (service.status) {
    case 'pending':
      return "We're finding a provider for you.";
    case 'assigned':
      if (service.estimatedArrivalAt) {
        const name = assigned?.name || 'Your provider';
        return `${name} is on the way. Estimated arrival: ${formatDateTime(service.estimatedArrivalAt)}.`;
      }
      if (assigned) {
        const garage = assigned.garageName ? ` (${assigned.garageName})` : '';
        return `Provider assigned: ${assigned.name}${garage}. We'll confirm when they're on the way.`;
      }
      return "Provider assigned. We'll confirm when they're on the way.";
    case 'in-progress':
      return 'Your provider has started the job.';
    case 'completed':
      return 'Your service is complete.';
    default:
      return null;
  }
}

const statTileClasses = 'border-r border-journal-ink last:border-r-0 px-5 sm:px-8 py-5';

export const MyServices = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  useReconcilePendingPaychanguService();

  const paychanguLockSnapshot = useSyncExternalStore(
    subscribeServicePaychanguLocks,
    getServicePaychanguLockSnapshot,
    getServerServicePaychanguLockSnapshot
  );
  let pendingTowSnap = '';
  let pendingCarSnap = '';
  let holdPayNowServiceIdSnap = '';
  try {
    const j = JSON.parse(paychanguLockSnapshot) as { t?: string; c?: string; h?: string };
    pendingTowSnap = j.t ?? '';
    pendingCarSnap = j.c ?? '';
    holdPayNowServiceIdSnap = j.h ?? '';
  } catch {
    /* ignore */
  }
  const showPaychanguReconcileBanner = Boolean(
    pendingTowSnap || pendingCarSnap || holdPayNowServiceIdSnap
  );

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

  const [servicesPollMs, setServicesPollMs] = useState(0);
  const servicesListQueryOpts = useMemo(
    () => ({
      refetchOnFocus: true,
      refetchOnReconnect: true,
      pollingInterval: servicesPollMs,
    }),
    [servicesPollMs]
  );

  const { data: towingData, isLoading: isLoadingTowing } =
    useGetTowingServicesQuery(undefined, servicesListQueryOpts);
  const { data: carData, isLoading: isLoadingCar } =
    useGetCarServicesQuery(undefined, servicesListQueryOpts);

  const pollTargetRef = useRef(0);
  useEffect(() => {
    const awaitingPrice = (s: TowingService | CarService) =>
      s.paymentStatus === 'pending' &&
      s.status !== 'cancelled' &&
      s.status !== 'completed' &&
      (s.estimatedCost == null || s.estimatedCost <= 0);

    const needPoll =
      (towingData?.services ?? []).some(awaitingPrice) ||
      (carData?.services ?? []).some(awaitingPrice);
    const next = needPoll ? 25000 : 0;
    if (pollTargetRef.current !== next) {
      pollTargetRef.current = next;
      setServicesPollMs(next);
    }
  }, [towingData, carData]);

  // Cancel mutations
  const [cancelTowing, { isLoading: isCancellingTowing }] = useCancelTowingServiceMutation();
  const [cancelCar, { isLoading: isCancellingCar }] = useCancelCarServiceMutation();
  const [requestTowingQuote, { isLoading: isSubmittingTowingQuote }] =
    useRequestTowingQuoteMutation();
  const [requestCarQuote, { isLoading: isSubmittingCarQuote }] =
    useRequestCarServiceQuoteMutation();
  const [rateTowingProvider] = useRateTowingProviderMutation();
  const [rateCarServiceProvider] = useRateCarServiceProviderMutation();

  const submitProviderRating = async (serviceId: string, kind: 'towing' | 'car', rating: number) => {
    try {
      if (kind === 'towing') {
        await rateTowingProvider({ id: serviceId, rating }).unwrap();
      } else {
        await rateCarServiceProvider({ id: serviceId, rating }).unwrap();
      }
      dispatch(showNotification({ message: 'Thanks for your feedback', type: 'success' }));
    } catch (e: unknown) {
      dispatch(
        showNotification({
          message: getErrorInfo(e, 'Could not submit rating').message,
          type: 'error',
        })
      );
    }
  };

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
          const serviceLabels = getCarServiceTypeLabels(carService);
          return (
            carService.location.address.toLowerCase().includes(query) ||
            carService.vehicleType.toLowerCase().includes(query) ||
            (carService.vehicleModel?.toLowerCase().includes(query) ?? false) ||
            serviceLabels.some((label) => label.toLowerCase().includes(query))
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
    if (shouldHoldPayNowForPaychangu(service, type)) return;
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

  /**
   * Lock Pay Now using the subscribed snapshot + post-success hold so we do not flash enabled:
   * (1) same-tab localStorage updates notify via useSyncExternalStore, (2) after verify clears pending,
   * UI hold covers RTK refetch delay, (3) while lists load, pending id still locks matching row.
   */
  const shouldHoldPayNowForPaychangu = (
    service: TowingService | CarService,
    kind: 'towing' | 'car'
  ): boolean => {
    if (!canPayOnline(service)) return false;
    const sid = normalizeServiceId(service._id);
    if (holdPayNowServiceIdSnap && normalizeServiceId(holdPayNowServiceIdSnap) === sid) {
      return true;
    }
    const tow = normalizeServiceId(pendingTowSnap);
    const car = normalizeServiceId(pendingCarSnap);
    const pendingMatches =
      (kind === 'towing' && tow !== '' && tow === sid) || (kind === 'car' && car !== '' && car === sid);
    return pendingMatches;
  };

  const canRequestQuote = (service: TowingService | CarService): boolean => {
    return (
      service.paymentStatus === 'pending' &&
      service.status !== 'cancelled' &&
      service.status !== 'completed' &&
      (service.estimatedCost == null || service.estimatedCost <= 0)
    );
  };

  const hasSubmittedQuoteRequest = (service: TowingService | CarService): boolean =>
    Boolean(service.quoteRequestSubmittedAt);

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
    <div className="min-h-screen bg-journal-bone">
      <div className="max-w-[1080px] mx-auto px-4 sm:px-10 py-10 sm:py-12">
        <div className="text-[12px] text-journal-faint mb-3">
          Home / <span className="text-journal-ink">My Services</span>
        </div>

        {showPaychanguReconcileBanner && (
          <div className="mb-6 border border-journal-teal-tint-border bg-journal-teal-tint rounded-journal px-4 py-3 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-journal-teal shrink-0 animate-spin" aria-hidden />
            <p className="text-[13px] text-journal-teal">
              Confirming your PayChangu payment and refreshing your bookings…
            </p>
          </div>
        )}

        <PageHeading className="!text-[36px] sm:!text-[46px] mb-6">My services</PageHeading>

        {/* Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-l border-journal-ink mb-7">
          <div className={statTileClasses}>
            <MonoLabel>Total</MonoLabel>
            <div className="font-journal text-[32px] tabular-nums text-journal-ink mt-1">{totalServices}</div>
          </div>
          <div className={cn(statTileClasses, 'border-b sm:border-b-0')}>
            <MonoLabel>Pending</MonoLabel>
            <div className="font-journal text-[32px] tabular-nums text-journal-warn-text mt-1">{pendingServices}</div>
          </div>
          <div className={cn(statTileClasses, 'border-b sm:border-b-0')}>
            <MonoLabel>Completed</MonoLabel>
            <div className="font-journal text-[32px] tabular-nums text-journal-teal mt-1">{completedServices}</div>
          </div>
          <div className={cn(statTileClasses, 'border-b')}>
            <MonoLabel>Total spent</MonoLabel>
            <div className="font-journal text-[32px] tabular-nums text-journal-ink mt-1">
              {totalSpent.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-journal-faint w-4 h-4" />
            <JournalInput
              type="text"
              placeholder="Search bookings…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="!pl-10"
            />
          </div>
          <select
            value={serviceTypeFilter}
            onChange={(e) => setServiceTypeFilter(e.target.value as 'all' | 'towing' | 'car')}
            className="border border-journal-input-border rounded-journal px-3.5 py-3 text-sm bg-white font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal"
          >
            <option value="all">All services</option>
            <option value="towing">Towing only</option>
            <option value="car">Car services only</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ServiceStatus | 'all')}
            className="border border-journal-input-border rounded-journal px-3.5 py-3 text-sm bg-white font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="in-progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Services List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-journal-teal" />
          </div>
        ) : allServices.length === 0 ? (
          <JournalCard className="p-12 text-center">
            <Package className="w-14 h-14 mx-auto mb-4 text-journal-hairline" />
            <h2 className="font-journal text-[22px] text-journal-ink mb-2">No Services Found</h2>
            <JournalBody className="mb-6">
              {searchQuery || statusFilter !== 'all' || serviceTypeFilter !== 'all'
                ? 'Try adjusting your filters'
                : "You haven't requested any services yet"}
            </JournalBody>
            <JournalButton variant="primary" onClick={() => navigate('/book-service')}>
              Book a Service
            </JournalButton>
          </JournalCard>
        ) : (
          <div className="flex flex-col gap-4">
            {allServices.map(({ type, service }) => {
              const isTowing = type === 'towing';
              const towingService = isTowing ? (service as TowingService) : null;
              const carService = !isTowing ? (service as CarService) : null;
              const assignedDriver = isTowing ? assigneeFromApi(towingService?.assignedDriver) : null;
              const assignedMechanic = !isTowing ? assigneeFromApi(carService?.assignedMechanic) : null;
              const carServiceLabels = carService ? getCarServiceTypeLabels(carService) : [];
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
                <JournalCard key={service._id} padding="none">
                  <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-journal-hairline">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-journal bg-journal-sand flex items-center justify-center flex-shrink-0">
                        {isTowing ? (
                          <Truck className="w-5 h-5 text-journal-ink" />
                        ) : (
                          <Wrench className="w-5 h-5 text-journal-ink" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-sans font-bold text-[16px] text-journal-ink">
                            {isTowing ? 'Towing Service' : carServiceLabels.join(', ') || 'Car Service'}
                          </span>
                        </div>
                        <div className="text-[12px] text-journal-faint flex items-center gap-1 mt-0.5">
                          <span title="Use this reference when contacting support">
                            #{shortRef(service._id)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <StatusPill tone={SERVICE_STATUS_TONE[service.status] ?? 'pending'}>
                        {service.status}
                      </StatusPill>
                      <StatusPill tone={paymentStatusTone(service.paymentStatus)}>
                        {paymentStatusLabel(service.paymentStatus)}
                      </StatusPill>
                      {canRequestQuote(service) && hasSubmittedQuoteRequest(service) && (
                        <StatusPill tone="completed">
                          <CheckCircle className="w-3 h-3 mr-1 -ml-0.5" aria-hidden />
                          Quote requested
                        </StatusPill>
                      )}
                    </div>
                  </div>

                  <div className="px-5 sm:px-6 py-4">
                    {service.paymentStatus === 'pending' &&
                      service.status !== 'cancelled' &&
                      service.status !== 'completed' &&
                      service.estimatedCost != null &&
                      service.estimatedCost > 0 && (
                        <p className="text-xs text-journal-warn-text bg-journal-warn-bg border border-journal-warn-text/20 rounded-journal px-3 py-2 mb-3">
                          Complete payment in MWK to confirm your booking.
                        </p>
                      )}

                    {service.paymentStatus === 'pending' &&
                      service.status !== 'cancelled' &&
                      service.status !== 'completed' &&
                      (!service.estimatedCost || service.estimatedCost <= 0) && (
                        <div className="space-y-2 mb-3">
                          {hasSubmittedQuoteRequest(service) ? (
                            <div className="text-sm bg-journal-teal-tint border border-journal-teal-tint-border rounded-journal px-3 py-2.5">
                              <div className="flex items-start gap-2">
                                <CheckCircle className="w-5 h-5 text-journal-teal shrink-0 mt-0.5" aria-hidden />
                                <div>
                                  <p className="font-semibold text-journal-teal">Quote request received</p>
                                  <p className="text-xs text-journal-teal/90 mt-1">
                                    We will call or WhatsApp you on the numbers you provided, then set your
                                    price in MWK. You can use <span className="font-medium">Update quote request</span>{' '}
                                    if your contact details change.
                                  </p>
                                  <p className="text-xs text-journal-teal mt-2 font-medium">
                                    Submitted: {formatDateTime(service.quoteRequestSubmittedAt!)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-journal-ink bg-journal-sand rounded-journal px-3 py-2">
                              <span className="font-semibold">Price not set yet.</span>{' '}
                              Use <span className="font-medium">Contact for quote</span> so we can review your
                              request and send you an amount in Malawi Kwacha (MWK).
                            </p>
                          )}
                          <p className="text-xs text-journal-warn-text bg-journal-warn-bg border border-journal-warn-text/20 rounded-journal px-3 py-2">
                            Final pricing may change if vehicle, location, or other details are not accurate.
                            We will call or message you to confirm before setting your quote.
                          </p>
                        </div>
                      )}

                    {statusGuidance(service, isTowing) && service.status !== 'cancelled' && (
                      <p className="text-sm text-journal-teal bg-journal-teal-tint border border-journal-teal-tint-border rounded-journal px-3 py-2 mb-3">
                        {statusGuidance(service, isTowing)}
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                      <div>
                        <MonoLabel className="mb-1 block">Vehicle</MonoLabel>
                        <div className="flex items-start gap-1.5 text-sm text-journal-body">
                          <Car className="w-4 h-4 text-journal-faint mt-0.5 shrink-0" />
                          <span>
                            {service.vehicleType || 'Not specified'}
                            {service.vehicleModel ? ` · ${service.vehicleModel}` : ''}
                          </span>
                        </div>
                      </div>
                      <div>
                        <MonoLabel className="mb-1 block">Price</MonoLabel>
                        {service.estimatedCost != null && service.estimatedCost > 0 ? (
                          <span className="text-sm font-bold text-journal-teal tabular-nums">
                            MWK {service.estimatedCost.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-sm text-journal-muted">Price not set yet</span>
                        )}
                      </div>
                      <div>
                        <MonoLabel className="mb-1 block">
                          {isTowing ? 'Pickup / Destination' : 'Location'}
                        </MonoLabel>
                        <div className="flex items-start gap-1.5 text-sm text-journal-body">
                          <MapPin className="w-4 h-4 text-journal-faint mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div>
                              {isTowing
                                ? `${towingService?.location.address} → ${towingService?.destination?.address || 'Not specified'}`
                                : carService?.location.address}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {isTowing && towingService?.location.description && (
                      <div className="text-sm text-journal-muted italic mb-1">
                        Pickup: {towingService.location.description}
                      </div>
                    )}
                    {isTowing && towingService?.destination?.description && (
                      <div className="text-sm text-journal-muted italic mb-1">
                        Destination: {towingService.destination.description}
                      </div>
                    )}
                    {!isTowing && carService?.location.description && (
                      <div className="text-sm text-journal-muted italic mb-1">
                        Location: {carService.location.description}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                      <a
                        href={mapsHref(
                          service.location.latitude,
                          service.location.longitude,
                          service.location.address
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-journal-teal hover:underline font-medium text-xs"
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
                            className="inline-flex items-center gap-1 text-journal-teal hover:underline font-medium text-xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open destination in Maps
                          </a>
                        )}
                    </div>

                    <div className="text-xs text-journal-faint mb-3">
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

                    <div className="flex flex-col gap-1.5 text-sm text-journal-muted mb-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-journal-faint shrink-0" />
                        <span>Requested: {formatDateTime(service.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-journal-faint shrink-0" />
                        <span>Last updated: {formatDateTime(service.updatedAt)}</span>
                      </div>
                      {!isTowing && carService?.preferredDate && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-journal-faint shrink-0" />
                          <span>
                            Preferred: {formatDate(carService.preferredDate)}
                            {carService.preferredTime ? ` at ${carService.preferredTime}` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {assignedDriver && (
                      <div className="flex items-start gap-1.5 text-sm text-journal-body mb-2">
                        <User className="w-4 h-4 text-journal-faint mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium text-journal-ink">Assigned driver: </span>
                          {assignedDriver.name}
                          {assignedDriver.phone && (
                            <span className="text-journal-muted"> · {assignedDriver.phone}</span>
                          )}
                          {assignedDriver.garageName && (
                            <span className="text-journal-muted text-sm block mt-0.5">
                              Garage: {assignedDriver.garageName}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {assignedMechanic && (
                      <div className="flex items-start gap-1.5 text-sm text-journal-body mb-2">
                        <User className="w-4 h-4 text-journal-faint mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium text-journal-ink">Assigned mechanic: </span>
                          {assignedMechanic.name}
                          {assignedMechanic.phone && (
                            <span className="text-journal-muted"> · {assignedMechanic.phone}</span>
                          )}
                          {assignedMechanic.garageName && (
                            <span className="text-journal-muted text-sm block mt-0.5">
                              Garage: {assignedMechanic.garageName}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {(isTowing ? towingService?.estimatedArrivalAt : carService?.estimatedArrivalAt) && (
                      <div className="flex items-start gap-1.5 text-sm text-journal-body mb-2">
                        <Clock className="w-4 h-4 text-journal-faint mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium text-journal-ink">Estimated arrival: </span>
                          {formatDateTime(
                            (isTowing ? towingService!.estimatedArrivalAt : carService!.estimatedArrivalAt)!
                          )}
                        </div>
                      </div>
                    )}

                    {service.status === 'completed' && (assignedDriver || assignedMechanic) && (
                      <div className="flex flex-wrap items-center gap-1 mt-2 mb-1">
                        <span className="text-sm text-journal-muted mr-1">Rate provider:</span>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            className="min-w-[2rem] px-2 py-1 text-sm rounded-journal border border-journal-input-border text-journal-ink hover:bg-journal-teal-tint hover:border-journal-teal transition-colors"
                            onClick={() => submitProviderRating(service._id, isTowing ? 'towing' : 'car', n)}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    )}

                    {service.notes && (
                      <div className="mt-2 p-3 bg-journal-sand rounded-journal">
                        <p className="text-sm text-journal-body">{service.notes}</p>
                      </div>
                    )}
                  </div>

                  {(canPayOnline(service) || canRequestQuote(service) || canCancelService(service)) && (
                    <div className="flex flex-col sm:flex-row gap-2.5 px-5 sm:px-6 py-4 border-t border-journal-hairline">
                      {canPayOnline(service) && (
                        <JournalButton
                          size="default"
                          variant="primary"
                          className="!px-5 !py-2.5"
                          disabled={shouldHoldPayNowForPaychangu(service, type)}
                          onClick={() => handlePayForService(service, type)}
                        >
                          {shouldHoldPayNowForPaychangu(service, type) ? (
                            <>
                              <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden />
                              Confirming payment…
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4" />
                              Pay Now (MWK)
                            </>
                          )}
                        </JournalButton>
                      )}

                      {canRequestQuote(service) && (
                        <JournalButton
                          size="default"
                          variant="secondary"
                          className="!px-5 !py-2.5"
                          onClick={() => openQuoteModal(service, type)}
                        >
                          {hasSubmittedQuoteRequest(service) ? (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Update quote request
                            </>
                          ) : (
                            <>
                              <MessageCircle className="w-4 h-4" />
                              Contact for quote
                            </>
                          )}
                        </JournalButton>
                      )}

                      {canCancelService(service) && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowCancelModal({
                              show: true,
                              type,
                              id: service._id,
                            })
                          }
                          className="inline-flex items-center justify-center gap-2 text-[12px] font-sans font-medium tracking-[0.1em] uppercase text-journal-danger-text hover:underline px-2 py-2.5"
                        >
                          <XCircle className="w-4 h-4" />
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </JournalCard>
              );
            })}
          </div>
        )}

        {/* Quote request modal */}
        {quoteModal && (
          <div className="fixed inset-0 bg-journal-ink/55 flex items-center justify-center z-50 p-4">
            <JournalCard className="max-w-[440px] w-full !p-0 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-journal-ink">
                <h3 className="font-journal text-[24px] text-journal-ink">
                  {hasSubmittedQuoteRequest(quoteModal.service) ? 'Update quote request' : 'Contact for quote'}
                </h3>
                <button
                  type="button"
                  onClick={() => setQuoteModal(null)}
                  className="p-1 hover:bg-journal-sand rounded-full transition-colors"
                  disabled={isSubmittingTowingQuote || isSubmittingCarQuote}
                >
                  <X className="w-5 h-5 text-journal-muted" />
                </button>
              </div>

              <div className="px-6 pt-4">
                <p className="text-[13px] text-journal-muted mb-3">
                  Add the numbers we should use to reach you. Our team will confirm your service details
                  before setting your price in Malawi Kwacha (MWK).
                </p>

                <div className="flex items-start gap-2 p-3 bg-journal-warn-bg border border-journal-warn-text/20 rounded-journal mb-4">
                  <AlertCircle className="w-4 h-4 text-journal-warn-text shrink-0 mt-0.5" />
                  <p className="text-[13px] text-journal-warn-text">
                    If pickup location, vehicle, or other information is not accurate, the quoted amount may
                    change after we verify with you.
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <JournalInput
                    id="quote-mobile"
                    label="Mobile number (for calls)"
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

                  <label className="flex items-center gap-2 text-[13px] text-journal-body cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded-sm border-journal-input-border text-journal-teal focus:ring-journal-teal"
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
                    <JournalInput
                      id="quote-wa"
                      label="WhatsApp number"
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
                  )}

                  <div>
                    <label htmlFor="quote-notes" className="block text-[11px] font-sans font-semibold tracking-[0.10em] uppercase text-journal-muted mb-1.5">
                      Note for our team (optional)
                    </label>
                    <textarea
                      id="quote-notes"
                      rows={3}
                      maxLength={500}
                      className="w-full border border-journal-input-border rounded-journal px-3.5 py-3 text-sm bg-white font-sans placeholder:text-journal-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal transition-colors resize-y"
                      placeholder="Best time to call, landmarks, etc."
                      value={quoteNotes}
                      onChange={(e) => setQuoteNotes(e.target.value)}
                      disabled={isSubmittingTowingQuote || isSubmittingCarQuote}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 px-6 py-5 mt-2">
                <JournalButton
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setQuoteModal(null)}
                  disabled={isSubmittingTowingQuote || isSubmittingCarQuote}
                >
                  Cancel
                </JournalButton>
                <JournalButton
                  variant="primary"
                  className="flex-1"
                  onClick={handleSubmitQuoteRequest}
                  disabled={isSubmittingTowingQuote || isSubmittingCarQuote}
                >
                  {isSubmittingTowingQuote || isSubmittingCarQuote ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {hasSubmittedQuoteRequest(quoteModal.service) ? 'Updating...' : 'Sending...'}
                    </>
                  ) : hasSubmittedQuoteRequest(quoteModal.service) ? (
                    'Update quote request'
                  ) : (
                    'Send quote request'
                  )}
                </JournalButton>
              </div>
            </JournalCard>
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-journal-ink/55 flex items-center justify-center z-50 p-4">
            <JournalCard className="max-w-[440px] w-full !p-0">
              <div className="flex items-center justify-between px-6 pt-6 pb-4">
                <h3 className="font-journal text-[24px] text-journal-ink">Cancel this service?</h3>
                <button
                  onClick={() => setShowCancelModal(null)}
                  className="p-1 hover:bg-journal-sand rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-journal-muted" />
                </button>
              </div>

              <div className="px-6 pb-5">
                <div className="flex items-start gap-3 p-4 bg-journal-warn-bg border border-journal-warn-text/20 rounded-journal">
                  <AlertCircle className="w-5 h-5 text-journal-warn-text mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[13px] font-medium text-journal-warn-text">Are you sure?</p>
                    <p className="text-[13px] text-journal-warn-text/90 mt-1">
                      This action cannot be undone. If you've already paid, a refund will be processed
                      within 3-5 business days.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 px-6 py-5">
                <JournalButton
                  variant="secondary"
                  onClick={() => setShowCancelModal(null)}
                  className="flex-1"
                  disabled={isCancellingTowing || isCancellingCar}
                >
                  Keep service
                </JournalButton>
                <button
                  type="button"
                  onClick={handleCancelService}
                  disabled={isCancellingTowing || isCancellingCar}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-journal-danger-text text-white px-6 py-3 text-xs font-sans font-semibold tracking-[0.12em] uppercase disabled:opacity-50 hover:bg-journal-danger-text/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-danger-text focus-visible:ring-offset-2"
                >
                  {isCancellingTowing || isCancellingCar ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Cancel service'
                  )}
                </button>
              </div>
            </JournalCard>
          </div>
        )}
      </div>
    </div>
  );
};
