import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useGetReturnsQuery } from '../store/api/returnApi';
import { useAppSelector } from '../store/types';
import { Breadcrumb } from '../components/Breadcrumb';
import { JournalCard, JournalButton, JournalInput, PageHeading, CardHeading, JournalBody } from '../components/journal';
import { cn } from '../utils/cn';
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
  Banknote,
  FileText,
} from 'lucide-react';
import { ReturnStatus } from '@shared/types';
import { format } from 'date-fns';

const getStatusBadgeColor = (status: ReturnStatus) => {
  switch (status) {
    case 'pending':
      return 'bg-journal-warn-bg text-journal-warn-text';
    case 'rejected':
      return 'bg-journal-danger-bg text-journal-danger-text';
    case 'cancelled':
      return 'bg-journal-sand text-journal-body';
    default:
      return 'bg-journal-teal-tint text-journal-teal';
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
          <Loader2 className="h-8 w-8 animate-spin text-journal-teal" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <JournalCard className="p-8 text-center">
          <AlertCircle className="h-10 w-10 text-journal-danger-text mx-auto mb-4" />
          <CardHeading className="!text-[20px]">Error loading returns</CardHeading>
          <JournalBody className="mt-2 !text-journal-muted">Failed to load your returns. Please try again later.</JournalBody>
        </JournalCard>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Returns' },
        ]}
      />

      <div className="mt-6">
        <PageHeading className="!text-[28px] sm:!text-[32px]">My returns</PageHeading>
        <JournalBody className="!text-journal-muted mt-2">Track and manage your return requests</JournalBody>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <JournalCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-sans text-journal-muted">Total returns</p>
              <p className="font-journal text-[22px] text-journal-ink mt-1">{totalReturns}</p>
            </div>
            <Package className="h-6 w-6 text-journal-teal" />
          </div>
        </JournalCard>
        <JournalCard className="p-4 bg-journal-warn-bg border-journal-warn-bg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-sans text-journal-warn-text">Pending</p>
              <p className="font-journal text-[22px] text-journal-warn-text mt-1">{pendingReturns}</p>
            </div>
            <Clock className="h-6 w-6 text-journal-warn-text" />
          </div>
        </JournalCard>
        <JournalCard className="p-4 bg-journal-teal-tint border-journal-teal-tint-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-sans text-journal-teal">Approved</p>
              <p className="font-journal text-[22px] text-journal-teal mt-1">{approvedReturns}</p>
            </div>
            <CheckCircle className="h-6 w-6 text-journal-teal" />
          </div>
        </JournalCard>
        <JournalCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-sans text-journal-muted">Total refunded</p>
              <p className="font-journal text-[22px] text-journal-ink mt-1">
                MWK {totalRefundAmount.toLocaleString()}
              </p>
            </div>
            <Banknote className="h-6 w-6 text-journal-teal" />
          </div>
        </JournalCard>
      </div>

      {/* Filters */}
      <JournalCard className="p-4 mt-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-journal-faint" />
              <JournalInput
                type="text"
                placeholder="Search by return ID or order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-journal-faint flex-shrink-0" />
            <select
              value={statusFilter || ''}
              onChange={(e) => setStatusFilter(e.target.value as ReturnStatus || undefined)}
              className="px-3 py-2.5 text-[13px] font-sans border border-journal-input-border rounded-journal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {statusFilter && (
              <button
                onClick={() => setStatusFilter(undefined)}
                className="p-2 text-journal-danger-text hover:bg-journal-danger-bg rounded-journal transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </JournalCard>

      {/* Returns List */}
      {filteredReturns.length === 0 ? (
        <JournalCard className="p-12 text-center mt-6">
          <Package className="h-12 w-12 text-journal-faint mx-auto mb-4" />
          <CardHeading className="!text-[22px]">No returns found</CardHeading>
          <JournalBody className="!text-journal-muted mt-2">
            {searchQuery || statusFilter
              ? 'No returns match your filters. Try adjusting your search.'
              : "You haven't requested any returns yet."}
          </JournalBody>
        </JournalCard>
      ) : (
        <div className="mt-6 space-y-4">
          {filteredReturns.map((returnDoc) => {
            const StatusIcon = getStatusIcon(returnDoc.status);
            const orderId = typeof returnDoc.order === 'object' ? returnDoc.order._id : returnDoc.order;
            const returnLink = isAuthenticated
              ? `/returns/${returnDoc._id}`
              : `/returns/${returnDoc._id}?email=${encodeURIComponent(user?.email || '')}`;

            return (
              <JournalCard key={returnDoc._id} className="p-6 hover:border-journal-ink transition-colors">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <CardHeading className="!text-[17px]">
                        Return #{returnDoc._id.slice(-8).toUpperCase()}
                      </CardHeading>
                      <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-sans font-medium', getStatusBadgeColor(returnDoc.status))}>
                        <StatusIcon className="h-3 w-3" />
                        {returnDoc.status.charAt(0).toUpperCase() + returnDoc.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-[13px] font-sans text-journal-muted">
                      <div className="flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5" />
                        <span>{returnDoc.items.length} item(s)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Banknote className="h-3.5 w-3.5" />
                        <span>MWK {returnDoc.refundAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        <span>Order #{orderId.slice(-8).toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{format(new Date(returnDoc.createdAt), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={returnLink}>
                      <JournalButton variant="secondary">
                        <Eye className="h-3.5 w-3.5" />
                        View details
                      </JournalButton>
                    </Link>
                    {returnDoc.status === 'pending' && (
                      <Link to={returnLink}>
                        <JournalButton variant="secondary">
                          <RotateCcw className="h-3.5 w-3.5" />
                          Cancel
                        </JournalButton>
                      </Link>
                    )}
                  </div>
                </div>
              </JournalCard>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <JournalButton
            variant="secondary"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </JournalButton>
          <p className="text-[13px] font-sans text-journal-muted">
            Page {pagination.page} of {pagination.pages}
          </p>
          <JournalButton
            variant="secondary"
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.pages}
          >
            Next
          </JournalButton>
        </div>
      )}
    </div>
  );
};
