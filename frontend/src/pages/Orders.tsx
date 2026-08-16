import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useGetOrdersQuery } from '../store/api/orderApi';
import { Breadcrumb } from '../components/Breadcrumb';
import { JournalCard, JournalButton, JournalLinkButton, JournalInput, PageHeading, CardHeading, JournalBody } from '../components/journal';
import { cn } from '../utils/cn';
import {
  Package, Loader2, Filter, ChevronRight, Search, Calendar,
  Download, Grid3x3, List, X, ArrowUpDown, CheckSquare, Square,
  TrendingUp, Banknote, CheckCircle, Clock, ShoppingBag,
  BarChart3, CreditCard
} from 'lucide-react';
import type { OrderStatus } from '@shared/types';
import { formatOrderItemCount, getOrderTotalQuantity } from '../utils/orderItems';
import { format } from 'date-fns';

// Helper function to get status badge colors
const getStatusBadgeColor = (status: OrderStatus) => {
  switch (status) {
    case 'pending':
      return 'bg-journal-warn-bg text-journal-warn-text';
    case 'processing':
      return 'bg-journal-teal-tint text-journal-teal';
    case 'dispatched':
      return 'bg-journal-teal-tint text-journal-teal';
    case 'ready_for_collection':
      return 'bg-journal-teal-tint text-journal-teal';
    case 'completed':
      return 'bg-journal-teal-tint text-journal-teal';
    case 'cancelled':
      return 'bg-journal-danger-bg text-journal-danger-text';
    default:
      return 'bg-journal-sand text-journal-body';
  }
};

const getStatusLabel = (status: OrderStatus) => {
  switch (status) {
    case 'dispatched':
      return 'Dispatched';
    case 'ready_for_collection':
      return 'Ready for collection';
    case 'completed':
      return 'Collected';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

// Helper function to get payment status badge color
const getPaymentStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-journal-teal-tint text-journal-teal';
    case 'pending':
      return 'bg-journal-warn-bg text-journal-warn-text';
    case 'failed':
      return 'bg-journal-danger-bg text-journal-danger-text';
    default:
      return 'bg-journal-sand text-journal-body';
  }
};

// Format date
const formatDate = (dateString: string) => {
  return format(new Date(dateString), 'MMM dd, yyyy');
};

const orderNeedsPayment = (order: { status: OrderStatus; paymentStatus: string }) =>
  order.status !== 'cancelled' &&
  (order.paymentStatus === 'pending' || order.paymentStatus === 'failed');

const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'processing',
  'dispatched',
  'ready_for_collection',
];

type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'status';
type ViewMode = 'grid' | 'table';

export const Orders = () => {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>(undefined);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<OrderStatus>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showDateFilter, setShowDateFilter] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [ordersPollMs, setOrdersPollMs] = useState(0);
  const pollTargetRef = useRef(0);

  const ordersQueryOpts = useMemo(
    () => ({
      refetchOnFocus: true,
      refetchOnReconnect: true,
      pollingInterval: ordersPollMs,
    }),
    [ordersPollMs]
  );

  const { data, isLoading, error } = useGetOrdersQuery(
    statusFilter ? { status: statusFilter } : undefined,
    ordersQueryOpts
  );

  const allOrders = data?.orders || [];

  useEffect(() => {
    const needPoll = allOrders.some((order) => ACTIVE_ORDER_STATUSES.includes(order.status));
    const next = needPoll ? 30000 : 0;
    if (pollTargetRef.current !== next) {
      pollTargetRef.current = next;
      setOrdersPollMs(next);
    }
  }, [allOrders]);

  // Calculate statistics
  const totalSpent = allOrders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0);
  const completedOrders = allOrders.filter((o: any) => o.status === 'completed').length;
  const pendingOrders = allOrders.filter((o: any) => o.status === 'pending').length;
  const processingOrders = allOrders.filter((o: any) => o.status === 'processing').length;
  const totalItems = allOrders.reduce((sum: number, order: any) => sum + (order.items?.length || 0), 0);
  const averageOrderValue = allOrders.length > 0 ? totalSpent / allOrders.length : 0;

  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = [...allOrders];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((order) => {
        const orderId = order._id.toLowerCase();
        const productNames = order.items
          .map((item: any) => item.product?.name?.toLowerCase() || '')
          .join(' ');
        return orderId.includes(query) || productNames.includes(query);
      });
    }

    // Multiple status filter
    if (selectedStatuses.size > 0) {
      filtered = filtered.filter((order) => selectedStatuses.has(order.status));
    }

    // Date range filter
    if (startDate || endDate) {
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.createdAt);
        if (startDate && orderDate < new Date(startDate)) return false;
        if (endDate && orderDate > new Date(endDate)) return false;
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'date-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'amount-desc':
          return b.totalAmount - a.totalAmount;
        case 'amount-asc':
          return a.totalAmount - b.totalAmount;
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return filtered;
  }, [allOrders, searchQuery, selectedStatuses, startDate, endDate, sortBy]);

  const handleStatusToggle = (status: OrderStatus) => {
    const newSet = new Set(selectedStatuses);
    if (newSet.has(status)) {
      newSet.delete(status);
    } else {
      newSet.add(status);
    }
    setSelectedStatuses(newSet);
    if (newSet.size === 1) {
      setStatusFilter(Array.from(newSet)[0]);
    } else {
      setStatusFilter(undefined);
    }
  };

  const handleQuickFilter = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setShowDateFilter(true);
  };

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  const handleSelectAll = () => {
    if (selectedOrders.size === filteredAndSortedOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredAndSortedOrders.map((o) => o._id)));
    }
  };

  const handleSelectOrder = (orderId: string) => {
    const newSet = new Set(selectedOrders);
    if (newSet.has(orderId)) {
      newSet.delete(orderId);
    } else {
      newSet.add(orderId);
    }
    setSelectedOrders(newSet);
  };

  const handleExport = () => {
    const csvContent = [
      ['Order ID', 'Date', 'Status', 'Items', 'Total', 'Payment Status'].join(','),
      ...filteredAndSortedOrders.map((order) =>
        [
          order._id.slice(-8).toUpperCase(),
          formatDate(order.createdAt),
          order.status,
          getOrderTotalQuantity(order),
          order.totalAmount,
          order.paymentStatus,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Orders' },
  ];

  return (
    <div className="min-h-screen bg-journal-bone">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={breadcrumbItems} />

        {/* Hero Section */}
        <div className="mt-8 mb-8 bg-journal-ink text-journal-bone p-6 sm:p-8 rounded-journal">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                <Package className="h-8 w-8 text-journal-bone" />
              </div>
              <div>
                <PageHeading className="!text-[28px] sm:!text-[32px] !text-journal-bone mb-1.5">My orders</PageHeading>
                <p className="text-[14px] font-sans text-journal-bone/80">
                  {allOrders.length} order{allOrders.length !== 1 ? 's' : ''} &#183; {totalItems} item{totalItems !== 1 ? 's' : ''} total
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <JournalButton
                variant="secondary"
                onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                className="!border-journal-bone/40 !text-journal-bone hover:!bg-journal-bone hover:!text-journal-ink"
              >
                {viewMode === 'grid' ? <List className="h-3.5 w-3.5" /> : <Grid3x3 className="h-3.5 w-3.5" />}
                {viewMode === 'grid' ? 'Table view' : 'Grid view'}
              </JournalButton>
              {filteredAndSortedOrders.length > 0 && (
                <JournalButton
                  variant="secondary"
                  onClick={handleExport}
                  className="!border-journal-bone/40 !text-journal-bone hover:!bg-journal-bone hover:!text-journal-ink"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </JournalButton>
              )}
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Spent */}
          <JournalCard className="bg-journal-teal-tint border-journal-teal-tint-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-sans text-journal-muted mb-1">Total spent</p>
                <p className="font-journal text-[22px] text-journal-ink">MWK {totalSpent.toLocaleString()}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <TrendingUp className="h-3.5 w-3.5 text-journal-teal" />
                  <span className="text-[12px] font-sans font-medium text-journal-teal">{allOrders.length} orders</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                <Banknote className="h-6 w-6 text-journal-teal" />
              </div>
            </div>
          </JournalCard>

          {/* Completed Orders */}
          <JournalCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-sans text-journal-muted mb-1">Completed</p>
                <p className="font-journal text-[22px] text-journal-ink">{completedOrders}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <CheckCircle className="h-3.5 w-3.5 text-journal-teal" />
                  <span className="text-[12px] font-sans font-medium text-journal-teal">
                    {allOrders.length > 0 ? Math.round((completedOrders / allOrders.length) * 100) : 0}% success rate
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 bg-journal-sand rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-journal-body" />
              </div>
            </div>
          </JournalCard>

          {/* Pending Orders */}
          <JournalCard className="bg-journal-warn-bg border-journal-warn-bg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-sans text-journal-muted mb-1">Pending</p>
                <p className="font-journal text-[22px] text-journal-ink">{pendingOrders + processingOrders}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <Clock className="h-3.5 w-3.5 text-journal-warn-text" />
                  <span className="text-[12px] font-sans font-medium text-journal-warn-text">In progress</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="h-6 w-6 text-journal-warn-text" />
              </div>
            </div>
          </JournalCard>

          {/* Average Order Value */}
          <JournalCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-sans text-journal-muted mb-1">Avg. order value</p>
                <p className="font-journal text-[22px] text-journal-ink">MWK {Math.round(averageOrderValue).toLocaleString()}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <BarChart3 className="h-3.5 w-3.5 text-journal-body" />
                  <span className="text-[12px] font-sans font-medium text-journal-body">Per order</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-journal-sand rounded-full flex items-center justify-center flex-shrink-0">
                <BarChart3 className="h-6 w-6 text-journal-body" />
              </div>
            </div>
          </JournalCard>
        </div>

        {/* Search and Filters */}
        <JournalCard className="mb-6">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-journal-faint" />
              <JournalInput
                type="text"
                placeholder="Search by order ID or product name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-journal-faint hover:text-journal-body"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-4">
            {/* Quick Date Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Calendar className="h-3.5 w-3.5 text-journal-body" />
              <span className="text-[12px] font-sans font-medium text-journal-body">Quick filters:</span>
              <button
                onClick={() => handleQuickFilter(0)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-[12px] font-sans font-medium transition-colors border',
                  startDate && endDate && new Date(endDate).toDateString() === new Date().toDateString()
                    ? 'bg-journal-teal-tint text-journal-teal border-journal-teal-tint-border'
                    : 'text-journal-body border-journal-hairline hover:border-journal-ink'
                )}
              >
                Today
              </button>
              <button
                onClick={() => handleQuickFilter(7)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-[12px] font-sans font-medium transition-colors border',
                  startDate && new Date(endDate).getTime() - new Date(startDate).getTime() === 7 * 24 * 60 * 60 * 1000
                    ? 'bg-journal-teal-tint text-journal-teal border-journal-teal-tint-border'
                    : 'text-journal-body border-journal-hairline hover:border-journal-ink'
                )}
              >
                This week
              </button>
              <button
                onClick={() => handleQuickFilter(30)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-[12px] font-sans font-medium transition-colors border',
                  startDate && new Date(endDate).getTime() - new Date(startDate).getTime() === 30 * 24 * 60 * 60 * 1000
                    ? 'bg-journal-teal-tint text-journal-teal border-journal-teal-tint-border'
                    : 'text-journal-body border-journal-hairline hover:border-journal-ink'
                )}
              >
                This month
              </button>
              {(startDate || endDate) && (
                <button
                  onClick={clearDateFilter}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-sans font-medium text-journal-danger-text hover:underline"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear date
                </button>
              )}
            </div>

            {/* Date Range Filter */}
            {showDateFilter && (
              <div className="flex items-center gap-2 flex-wrap p-3 bg-journal-sand rounded-journal">
                <Calendar className="h-3.5 w-3.5 text-journal-body" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1.5 text-[13px] font-sans border border-journal-input-border rounded-journal bg-white"
                />
                <span className="text-journal-muted text-[13px]">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1.5 text-[13px] font-sans border border-journal-input-border rounded-journal bg-white"
                />
                <button
                  onClick={() => setShowDateFilter(false)}
                  className="p-1.5 hover:bg-white rounded-journal transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-journal-body" />
                </button>
              </div>
            )}

            {/* Status Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-journal-body" />
              <span className="text-[12px] font-sans font-medium text-journal-body">Status:</span>
              {(['pending', 'processing', 'dispatched', 'ready_for_collection', 'completed', 'cancelled'] as OrderStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusToggle(status)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-sans font-medium capitalize transition-colors border',
                    selectedStatuses.has(status)
                      ? 'bg-journal-ink text-journal-bone border-journal-ink'
                      : 'text-journal-body border-journal-hairline hover:border-journal-ink'
                  )}
                >
                  {selectedStatuses.has(status) && <CheckSquare className="h-3 w-3" />}
                  {getStatusLabel(status)}
                </button>
              ))}
              {selectedStatuses.size > 0 && (
                <button
                  onClick={() => {
                    setSelectedStatuses(new Set());
                    setStatusFilter(undefined);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-sans font-medium text-journal-danger-text hover:underline"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              )}
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-2 flex-wrap">
              <ArrowUpDown className="h-3.5 w-3.5 text-journal-body" />
              <span className="text-[12px] font-sans font-medium text-journal-body">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-1.5 text-[13px] font-sans border border-journal-input-border rounded-journal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal"
              >
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="amount-desc">Highest amount</option>
                <option value="amount-asc">Lowest amount</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>
        </JournalCard>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <Loader2 className="h-10 w-10 text-journal-teal animate-spin mx-auto mb-4" />
            <JournalBody className="!text-journal-muted">Loading orders...</JournalBody>
          </div>
        )}

        {/* Error State */}
        {error && (
          <JournalCard className="text-center">
            <JournalBody className="!text-journal-danger-text">
              Error loading orders. Please try again later.
            </JournalBody>
          </JournalCard>
        )}

        {/* Bulk Actions */}
        {selectedOrders.size > 0 && (
          <JournalCard className="mb-4 bg-journal-teal-tint border-journal-teal-tint-border">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-[13px] font-sans font-medium text-journal-ink">
                {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''} selected
              </p>
              <div className="flex items-center gap-2">
                <JournalButton
                  variant="secondary"
                  onClick={() => setSelectedOrders(new Set())}
                >
                  Clear selection
                </JournalButton>
                <JournalButton
                  variant="primary"
                  onClick={handleExport}
                >
                  <Download className="h-3.5 w-3.5" />
                  Export selected
                </JournalButton>
              </div>
            </div>
          </JournalCard>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredAndSortedOrders.length === 0 && (
          <JournalCard className="text-center py-16">
            <div className="h-20 w-20 bg-journal-sand rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="h-10 w-10 text-journal-faint" />
            </div>
            <CardHeading className="!text-[24px] mb-2">No orders found</CardHeading>
            <JournalBody className="!text-journal-muted mb-6 max-w-md mx-auto">
              {searchQuery || selectedStatuses.size > 0 || startDate || endDate
                ? 'No orders match your filters. Try adjusting your search criteria.'
                : "You haven't placed any orders yet. Start shopping to see your orders here!"}
            </JournalBody>
            {(searchQuery || selectedStatuses.size > 0 || startDate || endDate) && (
              <JournalButton
                variant="secondary"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStatuses(new Set());
                  clearDateFilter();
                }}
                className="mb-4 mx-auto"
              >
                Clear all filters
              </JournalButton>
            )}
            <JournalLinkButton to="/products" className="mx-auto">
              <ShoppingBag className="h-3.5 w-3.5" />
              Browse products
            </JournalLinkButton>
          </JournalCard>
        )}

        {/* Orders List - Grid View */}
        {!isLoading && !error && filteredAndSortedOrders.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedOrders.map((order) => (
              <div key={order._id} className="relative">
                {selectedOrders.size > 0 && (
                  <button
                    onClick={() => handleSelectOrder(order._id)}
                    className="absolute top-3 left-3 z-10 p-1 bg-white rounded-full border border-journal-hairline hover:border-journal-ink transition-colors"
                  >
                    {selectedOrders.has(order._id) ? (
                      <CheckSquare className="h-4 w-4 text-journal-teal" />
                    ) : (
                      <Square className="h-4 w-4 text-journal-faint" />
                    )}
                  </button>
                )}
                <Link to={`/orders/${order._id}`}>
                  <JournalCard
                    className={cn(
                      'hover:border-journal-ink transition-colors cursor-pointer h-full',
                      selectedOrders.has(order._id) ? 'border-journal-teal' : ''
                    )}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-[11px] font-sans text-journal-faint mb-1">Order ID</p>
                        <p className="text-[13px] font-sans font-bold text-journal-ink">
                          #{order._id.slice(-8).toUpperCase()}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'px-3 py-1.5 rounded-full text-[11px] font-sans font-bold',
                          getStatusBadgeColor(order.status)
                        )}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between text-[13px] font-sans">
                        <div className="flex items-center gap-2 text-journal-muted">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Date</span>
                        </div>
                        <span className="text-journal-ink font-medium">
                          {formatDate(order.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[13px] font-sans">
                        <div className="flex items-center gap-2 text-journal-muted">
                          <Package className="h-3.5 w-3.5" />
                          <span>Items</span>
                        </div>
                        <span className="text-journal-ink font-medium">
                          {formatOrderItemCount(order)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-journal-muted text-[13px] font-sans">
                          <Banknote className="h-3.5 w-3.5" />
                          <span>Total</span>
                        </div>
                        <span className="font-journal text-[20px] text-journal-ink">
                          MWK {order.totalAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[13px] font-sans pt-2 border-t border-journal-hairline">
                        <span className="text-journal-muted">Payment:</span>
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-full text-[11px] font-sans font-medium',
                            getPaymentStatusBadgeColor(order.paymentStatus)
                          )}
                        >
                          {order.paymentStatus.charAt(0).toUpperCase() +
                            order.paymentStatus.slice(1)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-4 border-t border-journal-hairline">
                      <span
                        className={cn(
                          'text-[13px] font-sans font-semibold flex items-center gap-1',
                          orderNeedsPayment(order) ? 'text-journal-warn-text' : 'text-journal-teal'
                        )}
                      >
                        {orderNeedsPayment(order) ? (
                          <>
                            <CreditCard className="h-3.5 w-3.5" />
                            Complete payment
                          </>
                        ) : (
                          'View details'
                        )}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </JournalCard>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Orders List - Table View */}
        {!isLoading && !error && filteredAndSortedOrders.length > 0 && viewMode === 'table' && (
          <JournalCard padding="none" className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-journal-hairline bg-journal-sand">
                  {selectedOrders.size > 0 && (
                    <th className="text-left py-3 px-4">
                      <button onClick={handleSelectAll} className="p-1 hover:bg-white rounded-journal transition-colors">
                        {selectedOrders.size === filteredAndSortedOrders.length ? (
                          <CheckSquare className="h-4 w-4 text-journal-teal" />
                        ) : (
                          <Square className="h-4 w-4 text-journal-faint" />
                        )}
                      </button>
                    </th>
                  )}
                  <th className="text-left py-3 px-4 text-[11px] font-sans font-bold text-journal-body uppercase tracking-[0.06em]">Order ID</th>
                  <th className="text-left py-3 px-4 text-[11px] font-sans font-bold text-journal-body uppercase tracking-[0.06em]">Date</th>
                  <th className="text-left py-3 px-4 text-[11px] font-sans font-bold text-journal-body uppercase tracking-[0.06em]">Items</th>
                  <th className="text-left py-3 px-4 text-[11px] font-sans font-bold text-journal-body uppercase tracking-[0.06em]">Total</th>
                  <th className="text-left py-3 px-4 text-[11px] font-sans font-bold text-journal-body uppercase tracking-[0.06em]">Status</th>
                  <th className="text-left py-3 px-4 text-[11px] font-sans font-bold text-journal-body uppercase tracking-[0.06em]">Payment</th>
                  <th className="text-right py-3 px-4 text-[11px] font-sans font-bold text-journal-body uppercase tracking-[0.06em]">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedOrders.map((order) => (
                  <tr
                    key={order._id}
                    className={cn(
                      'border-b border-journal-divider hover:bg-journal-teal-tint/40 transition-colors',
                      selectedOrders.has(order._id) ? 'bg-journal-teal-tint' : ''
                    )}
                  >
                    {selectedOrders.size > 0 && (
                      <td className="py-3 px-4">
                        <button onClick={() => handleSelectOrder(order._id)} className="p-1 hover:bg-white rounded-journal transition-colors">
                          {selectedOrders.has(order._id) ? (
                            <CheckSquare className="h-4 w-4 text-journal-teal" />
                          ) : (
                            <Square className="h-4 w-4 text-journal-faint" />
                          )}
                        </button>
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <p className="text-[13px] font-sans font-bold text-journal-ink">
                        #{order._id.slice(-8).toUpperCase()}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-[13px] font-sans text-journal-muted">{formatDate(order.createdAt)}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-[13px] font-sans text-journal-muted">
                        {formatOrderItemCount(order)}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-[13px] font-sans font-bold text-journal-teal">
                        MWK {order.totalAmount.toLocaleString()}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          'inline-block px-3 py-1.5 rounded-full text-[11px] font-sans font-bold',
                          getStatusBadgeColor(order.status)
                        )}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          'inline-block px-2.5 py-1 rounded-full text-[11px] font-sans font-medium',
                          getPaymentStatusBadgeColor(order.paymentStatus)
                        )}
                      >
                        {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/orders/${order._id}`}
                        className={cn(
                          'inline-flex items-center gap-1 text-[12px] font-sans font-semibold',
                          orderNeedsPayment(order) ? 'text-journal-warn-text' : 'text-journal-teal hover:underline'
                        )}
                      >
                        {orderNeedsPayment(order) ? (
                          <>
                            <CreditCard className="h-3.5 w-3.5" />
                            Complete payment
                          </>
                        ) : (
                          <>
                            View
                            <ChevronRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </JournalCard>
        )}

        {/* Results Count */}
        {!isLoading && !error && filteredAndSortedOrders.length > 0 && (
          <div className="mt-6 text-[13px] font-sans text-journal-muted flex items-center justify-between">
            <p>
              Showing {filteredAndSortedOrders.length} of {allOrders.length} order{allOrders.length !== 1 ? 's' : ''}
              {(searchQuery || selectedStatuses.size > 0 || startDate || endDate) && ' (filtered)'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <JournalButton
              variant="secondary"
              disabled={data.pagination.page === 1}
            >
              Previous
            </JournalButton>
            <p className="text-[13px] font-sans text-journal-muted">
              Page {data.pagination.page} of {data.pagination.totalPages}
            </p>
            <JournalButton
              variant="secondary"
              disabled={data.pagination.page >= data.pagination.totalPages}
            >
              Next
            </JournalButton>
          </div>
        )}
      </div>
    </div>
  );
};
