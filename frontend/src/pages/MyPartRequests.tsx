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
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { H1, H2, Body } from '../components/ui/Typography';

const ACTIVE_PART_REQUEST_STATUSES: CustomOrderStatus[] = [
  CustomOrderStatus.PENDING,
  CustomOrderStatus.ORDERED,
  CustomOrderStatus.RECEIVED,
];

const getStatusBadgeColor = (status: CustomOrderStatus) => {
  switch (status) {
    case CustomOrderStatus.PENDING:
      return 'bg-amber-100 text-amber-700 border-amber-300';
    case CustomOrderStatus.ORDERED:
      return 'bg-blue-100 text-blue-700 border-blue-300';
    case CustomOrderStatus.RECEIVED:
      return 'bg-indigo-100 text-indigo-700 border-indigo-300';
    case CustomOrderStatus.COMPLETED:
      return 'bg-green-100 text-green-700 border-green-300';
    case CustomOrderStatus.CANCELLED:
      return 'bg-red-100 text-red-700 border-red-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'My Part Requests' },
          ]}
        />

        <div className="mb-8 mt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <H1 className="text-4xl font-bold text-gray-900 mb-2">My Part Requests</H1>
              <Body className="text-gray-600">Track the parts you have asked us to source for you.</Body>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/products">
                <Button variant="secondary">Browse Products</Button>
              </Link>
              <Button onClick={() => navigate('/request-part')}>Request a Part</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
            <Card className="p-4 border-2 border-teal-100 bg-teal-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Requests</p>
                  <p className="text-2xl font-bold text-teal-700 mt-1">{totalRequests}</p>
                </div>
                <Package className="w-10 h-10 text-teal-500 opacity-20" />
              </div>
            </Card>

            <Card className="p-4 border-2 border-amber-100 bg-amber-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-amber-700 mt-1">{pendingRequests}</p>
                </div>
                <Clock className="w-10 h-10 text-amber-500 opacity-20" />
              </div>
            </Card>

            <Card className="p-4 border-2 border-green-100 bg-green-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Completed</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">{completedRequests}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-500 opacity-20" />
              </div>
            </Card>

            <Card className="p-4 border-2 border-blue-100 bg-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Quoted</p>
                  <p className="text-2xl font-bold text-blue-700 mt-1">{quotedRequests}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-blue-500 opacity-20" />
              </div>
            </Card>
          </div>

          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
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
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value={CustomOrderStatus.PENDING}>Pending</option>
                <option value={CustomOrderStatus.ORDERED}>Ordered</option>
                <option value={CustomOrderStatus.RECEIVED}>Received</option>
                <option value={CustomOrderStatus.COMPLETED}>Completed</option>
                <option value={CustomOrderStatus.CANCELLED}>Cancelled</option>
              </select>
            </div>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <H2 className="text-xl font-semibold text-gray-700 mb-2">No Part Requests Found</H2>
            <Body className="text-gray-500 mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters.'
                : "You haven't requested any parts yet."}
            </Body>
            <Button onClick={() => navigate('/request-part')}>Request a Part</Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => {
              const vehicle = request.vehicleDetails;
              const part = request.partDetails;
              const summary = vehicleSummary(request);
              const images = request.images || [];

              return (
                <Card key={request._id} className="p-4 sm:p-6">
                  <div className="flex min-w-0 w-full items-start gap-4">
                    <div className="p-3 rounded-lg bg-teal-100 text-teal-600">
                      <Package className="w-6 h-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">{request.productName}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(
                            request.status
                          )}`}
                        >
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>

                      <div className="space-y-3 text-sm text-gray-600">
                        {summary && (
                          <div className="flex items-start gap-2">
                            <Car className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                              <span className="font-medium text-gray-800">Vehicle: </span>
                              {summary}
                            </div>
                          </div>
                        )}

                        <div className="flex items-start gap-2">
                          <Tag className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-medium text-gray-800">Category: </span>
                            {request.category}
                            {part?.position ? ` · ${formatLabel(part.position)}` : ''}
                            {part?.quantity ? ` · Qty ${part.quantity}` : ''}
                            {part?.preference ? ` · ${formatLabel(part.preference)}` : ''}
                          </div>
                        </div>

                        {part?.partNumber && (
                          <div className="flex items-start gap-2">
                            <Hash className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                              <span className="font-medium text-gray-800">Part number: </span>
                              {part.partNumber}
                            </div>
                          </div>
                        )}

                        {vehicle?.vinOrChassis && (
                          <div className="flex items-start gap-2">
                            <Hash className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                              <span className="font-medium text-gray-800">VIN / chassis: </span>
                              {vehicle.vinOrChassis}
                            </div>
                          </div>
                        )}

                        <div className="flex items-start gap-2">
                          <Search className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-medium text-gray-800">Description: </span>
                            {request.description}
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <TrendingUp className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-medium text-gray-800">Estimated price: </span>
                            {request.estimatedPrice && request.estimatedPrice > 0
                              ? `MWK ${request.estimatedPrice.toLocaleString()}`
                              : 'Not quoted yet'}
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-medium text-gray-800">Requested: </span>
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
                                className="block overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
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
                          <div className="text-sm text-gray-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                            <span className="font-medium text-blue-900">Supplier: </span>
                            {request.supplier}
                          </div>
                        )}

                        {request.notes && (
                          <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                            <span className="font-medium text-gray-900">Admin note: </span>
                            {request.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
