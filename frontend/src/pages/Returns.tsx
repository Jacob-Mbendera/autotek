import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useGetReturnsQuery } from '../store/api/returnApi';
import { useAppSelector } from '../store/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { H1, H2, Body } from '../components/ui/Typography';
import { Breadcrumb } from '../components/Breadcrumb';
import {
  Package,
  Loader2,
  Search,
  Filter,
  X,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  RotateCcw,
  Eye,
  TrendingUp,
  Banknote,
  FileText,
} from 'lucide-react';
import { ReturnStatus } from '@shared/types';
import { format } from 'date-fns';

const getStatusBadgeColor = (status: ReturnStatus) => {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'approved':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'rejected':
      return 'bg-red-100 text-red-700 border-red-300';
    case 'completed':
      return 'bg-green-100 text-green-700 border-green-300';
    case 'cancelled':
      return 'bg-gray-100 text-gray-700 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

const getStatusIcon = (status: ReturnStatus) => {
  switch (status) {
    case 'pending':
      return Clock;
    case 'approved':
      return CheckCircle;
    case 'rejected':
      return XCircle;
    case 'completed':
      return CheckCircle;
    case 'cancelled':
      return XCircle;
    default:
      return AlertCircle;
  }
};

export const Returns = () => {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, error } = useGetReturnsQuery(
    {
      email: !isAuthenticated && user?.email ? user.email : undefined,
      status: statusFilter,
      page,
      limit,
    },
    { refetchOnMountOrArgChange: true }
  );

  const returns = data?.returns || [];
  const pagination = data?.pagination;

  // Calculate statistics
  const totalReturns = returns.length;
  const pendingReturns = returns.filter((r) => r.status === 'pending').length;
  const approvedReturns = returns.filter((r) => r.status === 'approved').length;
  const completedReturns = returns.filter((r) => r.status === 'completed').length;
  const totalRefundAmount = returns
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + (r.refundAmount || 0), 0);

  // Filter by search query
  const filteredReturns = useMemo(() => {
    if (!searchQuery.trim()) return returns;

    const query = searchQuery.toLowerCase();
    return returns.filter((returnDoc) => {
      const returnId = returnDoc._id.toLowerCase();
      const orderId = typeof returnDoc.order === 'object'
        ? returnDoc.order._id.toLowerCase()
        : returnDoc.order.toLowerCase();
      return returnId.includes(query) || orderId.includes(query);
    });
  }, [returns, searchQuery]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <H2>Error Loading Returns</H2>
          <Body className="mt-2 text-gray-600">Failed to load your returns. Please try again later.</Body>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Returns', href: '#' },
        ]}
      />

      <div className="mt-6">
        <H1>My Returns</H1>
        <Body className="text-gray-600 mt-2">Track and manage your return requests</Body>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <Body className="text-sm text-gray-600">Total Returns</Body>
              <H2 className="text-2xl font-bold text-gray-900 mt-1">{totalReturns}</H2>
            </div>
            <Package className="h-8 w-8 text-teal-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <Body className="text-sm text-gray-600">Pending</Body>
              <H2 className="text-2xl font-bold text-amber-600 mt-1">{pendingReturns}</H2>
            </div>
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <Body className="text-sm text-gray-600">Approved</Body>
              <H2 className="text-2xl font-bold text-blue-600 mt-1">{approvedReturns}</H2>
            </div>
            <CheckCircle className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <Body className="text-sm text-gray-600">Total Refunded</Body>
              <H2 className="text-2xl font-bold text-green-600 mt-1">
                MWK {totalRefundAmount.toLocaleString()}
              </H2>
            </div>
            <Banknote className="h-8 w-8 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mt-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by return ID or order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter || ''}
              onChange={(e) => setStatusFilter(e.target.value as ReturnStatus || undefined)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {statusFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter(undefined)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Returns List */}
      {filteredReturns.length === 0 ? (
        <Card className="p-12 text-center mt-6">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <H2 className="text-gray-900">No Returns Found</H2>
          <Body className="text-gray-600 mt-2">
            {searchQuery || statusFilter
              ? 'No returns match your filters. Try adjusting your search.'
              : "You haven't requested any returns yet."}
          </Body>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {filteredReturns.map((returnDoc) => {
            const StatusIcon = getStatusIcon(returnDoc.status);
            const orderId = typeof returnDoc.order === 'object' ? returnDoc.order._id : returnDoc.order;
            const returnLink = isAuthenticated
              ? `/returns/${returnDoc._id}`
              : `/returns/${returnDoc._id}?email=${encodeURIComponent(user?.email || '')}`;

            return (
              <Card key={returnDoc._id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <H2 className="text-lg font-bold text-gray-900">
                        Return #{returnDoc._id.slice(-8).toUpperCase()}
                      </H2>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(returnDoc.status)}`}>
                        <StatusIcon className="h-3 w-3 inline mr-1" />
                        {returnDoc.status.charAt(0).toUpperCase() + returnDoc.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span>{returnDoc.items.length} item(s)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        <span>MWK {returnDoc.refundAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>Order #{orderId.slice(-8).toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{format(new Date(returnDoc.createdAt), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={returnLink}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                    {returnDoc.status === 'pending' && (
                      <Link to={returnLink}>
                        <Button variant="outline" size="sm">
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </Button>
          <Body className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.pages}
          </Body>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.pages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
