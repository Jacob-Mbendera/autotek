import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Calendar,
  Car,
  CheckCircle,
  Clock,
  Hash,
  Loader2,
  Package,
  Search,
  Tag,
  TrendingUp,
} from 'lucide-react';
import { CustomOrderStatus } from '@shared/types';
import { useGetCustomOrdersQuery, type CustomOrder } from '../store/api/customOrderApi';
import { Breadcrumb } from '../components/Breadcrumb';
import {
  JournalCard,
  JournalButton,
  JournalLinkButton,
  JournalInput,
  PageHeading,
  CardHeading,
  JournalBody,
  StatusPill,
  type StatusPillTone,
} from '../components/journal';
import { cn } from '../utils/cn';

const ACTIVE_PART_REQUEST_STATUSES: CustomOrderStatus[] = [
  CustomOrderStatus.PENDING,
  CustomOrderStatus.ORDERED,
  CustomOrderStatus.RECEIVED,
];

const STATUS_TONE: Record<CustomOrderStatus, StatusPillTone> = {
  [CustomOrderStatus.PENDING]: 'pending',
  [CustomOrderStatus.ORDERED]: 'active',
  [CustomOrderStatus.RECEIVED]: 'active',
  [CustomOrderStatus.COMPLETED]: 'completed',
  [CustomOrderStatus.CANCELLED]: 'cancelled',
};

const formatDateTime = (dateString: string) => format(new Date(dateString), 'MMM dd, yyyy h:mm a');

const formatLabel = (value?: string) =>
  value
    ? value
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : '';

const vehicleSummary = (request: CustomOrder) => {
  const vehicle = request.vehicleDetails;
  if (!vehicle?.make && !vehicle?.model && !vehicle?.year) return null;
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.engine].filter(Boolean).join(' ');
};

export const MyPartRequests = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomOrderStatus | 'all'>('all');
  const [partRequestsPollMs, setPartRequestsPollMs] = useState(0);
  const pollTargetRef = useRef(0);

  const partRequestsQueryOpts = useMemo(
    () => ({
      refetchOnFocus: true,
      refetchOnReconnect: true,
      refetchOnMountOrArgChange: true,
      pollingInterval: partRequestsPollMs,
    }),
    [partRequestsPollMs]
  );

  const { data, isLoading } = useGetCustomOrdersQuery(undefined, partRequestsQueryOpts);

  const partRequests = data?.customOrders ?? [];

  // Poll while any request is still in progress so admin status updates appear without a full refresh.
  useEffect(() => {
    const needPoll = partRequests.some((request) =>
      ACTIVE_PART_REQUEST_STATUSES.includes(request.status)
    );
    const next = needPoll ? 30000 : 0;
    if (pollTargetRef.current !== next) {
      pollTargetRef.current = next;
      setPartRequestsPollMs(next);
    }
  }, [partRequests]);

  const filteredRequests = useMemo(() => {
    let filtered = [...partRequests];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((request) => request.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((request) => {
        const vehicle = request.vehicleDetails;
        const part = request.partDetails;
        return (
          request.productName.toLowerCase().includes(query) ||
          request.category.toLowerCase().includes(query) ||
          request.description.toLowerCase().includes(query) ||
          (vehicle?.make || '').toLowerCase().includes(query) ||
          (vehicle?.model || '').toLowerCase().includes(query) ||
          (vehicle?.vinOrChassis || '').toLowerCase().includes(query) ||
          (part?.partNumber || '').toLowerCase().includes(query)
        );
      });
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return filtered;
  }, [partRequests, searchQuery, statusFilter]);

  const totalRequests = partRequests.length;
  const pendingRequests = partRequests.filter((request) => request.status === CustomOrderStatus.PENDING).length;
  const completedRequests = partRequests.filter((request) => request.status === CustomOrderStatus.COMPLETED).length;
  const quotedRequests = partRequests.filter((request) => (request.estimatedPrice ?? 0) > 0).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'My Part Requests' },
        ]}
      />

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <PageHeading className="!text-[28px] sm:!text-[32px] mb-2">My part requests</PageHeading>
          <JournalBody className="!text-journal-muted">
            Track the parts you have asked us to source for you.
          </JournalBody>
        </div>
        <div className="flex flex-wrap gap-3">
          <JournalLinkButton to="/products" variant="secondary">
            Browse products
          </JournalLinkButton>
          <JournalButton onClick={() => navigate('/request-part')}>Request a part</JournalButton>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <JournalCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-sans text-journal-muted">Total requests</p>
              <p className="font-journal text-[22px] text-journal-ink mt-1">{totalRequests}</p>
            </div>
            <Package className="h-6 w-6 text-journal-teal" />
          </div>
        </JournalCard>
        <JournalCard className="p-4 bg-journal-warn-bg border-journal-warn-bg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-sans text-journal-warn-text">Pending</p>
              <p className="font-journal text-[22px] text-journal-warn-text mt-1">{pendingRequests}</p>
            </div>
            <Clock className="h-6 w-6 text-journal-warn-text" />
          </div>
        </JournalCard>
        <JournalCard className="p-4 bg-journal-teal-tint border-journal-teal-tint-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-sans text-journal-teal">Completed</p>
              <p className="font-journal text-[22px] text-journal-teal mt-1">{completedRequests}</p>
            </div>
            <CheckCircle className="h-6 w-6 text-journal-teal" />
          </div>
        </JournalCard>
        <JournalCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-sans text-journal-muted">Quoted</p>
              <p className="font-journal text-[22px] text-journal-ink mt-1">{quotedRequests}</p>
            </div>
            <TrendingUp className="h-6 w-6 text-journal-teal" />
          </div>
        </JournalCard>
      </div>

      <JournalCard className="p-4 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-journal-faint" />
            <JournalInput
              type="text"
              placeholder="Search by part, vehicle, VIN, or part number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CustomOrderStatus | 'all')}
            className="px-3.5 py-3 text-sm font-sans border border-journal-input-border rounded-journal bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal"
          >
            <option value="all">All statuses</option>
            <option value={CustomOrderStatus.PENDING}>Pending</option>
            <option value={CustomOrderStatus.ORDERED}>Ordered</option>
            <option value={CustomOrderStatus.RECEIVED}>Received</option>
            <option value={CustomOrderStatus.COMPLETED}>Completed</option>
            <option value={CustomOrderStatus.CANCELLED}>Cancelled</option>
          </select>
        </div>
      </JournalCard>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-journal-teal" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <JournalCard className="p-12 text-center mt-6">
          <Package className="h-12 w-12 text-journal-faint mx-auto mb-4" />
          <CardHeading className="!text-[22px]">No part requests found</CardHeading>
          <JournalBody className="!text-journal-muted mt-2 mb-6">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters.'
              : "You haven't requested any parts yet."}
          </JournalBody>
          <JournalButton onClick={() => navigate('/request-part')} className="mx-auto">
            Request a part
          </JournalButton>
        </JournalCard>
      ) : (
        <div className="mt-6 space-y-4">
          {filteredRequests.map((request) => {
            const vehicle = request.vehicleDetails;
            const part = request.partDetails;
            const summary = vehicleSummary(request);
            const images = request.images || [];

            return (
              <JournalCard key={request._id} className="p-4 sm:p-6">
                <div className="flex min-w-0 w-full items-start gap-4">
                  <div className="p-3 rounded-journal bg-journal-teal-tint text-journal-teal">
                    <Package className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <CardHeading className="!text-[17px]">{request.productName}</CardHeading>
                      <StatusPill tone={STATUS_TONE[request.status]}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </StatusPill>
                    </div>

                    <div className="space-y-3 text-[13px] font-sans text-journal-body">
                      {summary && (
                        <div className="flex items-start gap-2">
                          <Car className="h-4 w-4 text-journal-faint mt-0.5 shrink-0" />
                          <div>
                            <span className="font-semibold text-journal-ink">Vehicle: </span>
                            {summary}
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-2">
                        <Tag className="h-4 w-4 text-journal-faint mt-0.5 shrink-0" />
                        <div>
                          <span className="font-semibold text-journal-ink">Category: </span>
                          {request.category}
                          {part?.position ? ` · ${formatLabel(part.position)}` : ''}
                          {part?.quantity ? ` · Qty ${part.quantity}` : ''}
                          {part?.preference ? ` · ${formatLabel(part.preference)}` : ''}
                        </div>
                      </div>

                      {part?.partNumber && (
                        <div className="flex items-start gap-2">
                          <Hash className="h-4 w-4 text-journal-faint mt-0.5 shrink-0" />
                          <div>
                            <span className="font-semibold text-journal-ink">Part number: </span>
                            {part.partNumber}
                          </div>
                        </div>
                      )}

                      {vehicle?.vinOrChassis && (
                        <div className="flex items-start gap-2">
                          <Hash className="h-4 w-4 text-journal-faint mt-0.5 shrink-0" />
                          <div>
                            <span className="font-semibold text-journal-ink">VIN / chassis: </span>
                            {vehicle.vinOrChassis}
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-2">
                        <Search className="h-4 w-4 text-journal-faint mt-0.5 shrink-0" />
                        <div>
                          <span className="font-semibold text-journal-ink">Description: </span>
                          {request.description}
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-journal-faint mt-0.5 shrink-0" />
                        <div>
                          <span className="font-semibold text-journal-ink">Estimated price: </span>
                          {request.estimatedPrice && request.estimatedPrice > 0
                            ? `MWK ${request.estimatedPrice.toLocaleString()}`
                            : 'Not quoted yet'}
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-journal-faint mt-0.5 shrink-0" />
                        <div>
                          <span className="font-semibold text-journal-ink">Requested: </span>
                          {formatDateTime(request.createdAt)}
                        </div>
                      </div>

                      {images.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                          {images.map((image, index) => (
                            <a
                              key={`${request._id}-${index}`}
                              href={image}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block overflow-hidden rounded-journal border border-journal-hairline bg-journal-sand"
                            >
                              <img
                                src={image}
                                alt={`${request.productName} photo ${index + 1}`}
                                className="w-full h-40 sm:h-44 object-contain p-2"
                              />
                            </a>
                          ))}
                        </div>
                      )}

                      {request.supplier && (
                        <div
                          className={cn(
                            'text-[13px] font-sans text-journal-body rounded-journal px-3 py-2',
                            'bg-journal-teal-tint border border-journal-teal-tint-border'
                          )}
                        >
                          <span className="font-semibold text-journal-teal">Supplier: </span>
                          {request.supplier}
                        </div>
                      )}

                      {request.notes && (
                        <div className="text-[13px] font-sans text-journal-body bg-journal-sand border border-journal-hairline rounded-journal px-3 py-2">
                          <span className="font-semibold text-journal-ink">Admin note: </span>
                          {request.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </JournalCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
