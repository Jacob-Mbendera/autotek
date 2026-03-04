import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useGetOrdersQuery } from '../store/api/orderApi';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { H1, Body } from '../components/ui/Typography';
import { 
  Package, Loader2, Filter, ChevronRight, Search, Calendar, 
  Download, Grid3x3, List, X, ArrowUpDown, CheckSquare, Square
} from 'lucide-react';
import type { OrderStatus } from '@shared/types';

// Helper function to get status badge colors
const getStatusBadgeColor = (status: OrderStatus) => {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-700';
    case 'processing':
      return 'bg-blue-100 text-blue-700';
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'cancelled':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
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
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

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

  const { data, isLoading, error } = useGetOrdersQuery(
    statusFilter ? { status: statusFilter } : undefined
  );

  const allOrders = data?.orders || [];

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
    // Export logic would go here
    const csvContent = [
      ['Order ID', 'Date', 'Status', 'Items', 'Total', 'Payment Status'].join(','),
      ...filteredAndSortedOrders.map((order) =>
        [
          order._id.slice(-8).toUpperCase(),
          formatDate(order.createdAt),
          order.status,
          order.items.length,
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <H1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Orders</H1>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="small"
            onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
            className="flex items-center gap-2"
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
            {viewMode === 'grid' ? 'Table' : 'Grid'}
          </Button>
          {filteredAndSortedOrders.length > 0 && (
            <Button
              variant="secondary"
              size="small"
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by order ID or product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 pr-4"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filters and Quick Actions */}
      <div className="mb-6 space-y-4">
        {/* Quick Date Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Quick filters:</span>
          <Button
            variant="ghost"
            size="small"
            onClick={() => handleQuickFilter(0)}
            className={startDate && endDate && new Date(endDate).toDateString() === new Date().toDateString() ? 'bg-teal-50 text-teal-700' : ''}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={() => handleQuickFilter(7)}
            className={startDate && new Date(endDate).getTime() - new Date(startDate).getTime() === 7 * 24 * 60 * 60 * 1000 ? 'bg-teal-50 text-teal-700' : ''}
          >
            This Week
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={() => handleQuickFilter(30)}
            className={startDate && new Date(endDate).getTime() - new Date(startDate).getTime() === 30 * 24 * 60 * 60 * 1000 ? 'bg-teal-50 text-teal-700' : ''}
          >
            This Month
          </Button>
          {(startDate || endDate) && (
            <Button
              variant="ghost"
              size="small"
              onClick={clearDateFilter}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Date
            </Button>
          )}
        </div>

        {/* Date Range Filter */}
        {showDateFilter && (
          <div className="flex items-center gap-2 flex-wrap p-3 bg-gray-50 rounded-lg">
            <Calendar className="h-4 w-4 text-gray-600" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start date"
              className="text-sm"
            />
            <span className="text-gray-600">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End date"
              className="text-sm"
            />
            <Button
              variant="ghost"
              size="small"
              onClick={() => setShowDateFilter(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Status Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-5 w-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Status:</span>
          {(['pending', 'processing', 'completed', 'cancelled'] as OrderStatus[]).map((status) => (
            <Button
              key={status}
              variant={selectedStatuses.has(status) ? 'primary' : 'ghost'}
              size="small"
              onClick={() => handleStatusToggle(status)}
              className="capitalize"
            >
              {selectedStatuses.has(status) && <CheckSquare className="h-3 w-3 mr-1" />}
              {status}
            </Button>
          ))}
          {selectedStatuses.size > 0 && (
          <Button
              variant="ghost"
            size="small"
              onClick={() => {
                setSelectedStatuses(new Set());
                setStatusFilter(undefined);
              }}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-2 flex-wrap">
          <ArrowUpDown className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Highest Amount</option>
            <option value="amount-asc">Lowest Amount</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 text-teal-600 animate-spin mx-auto mb-4" />
          <Body className="text-gray-600">Loading orders...</Body>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card variant="md" className="text-center">
          <Body className="text-red-600">
            Error loading orders. Please try again later.
          </Body>
        </Card>
      )}

      {/* Bulk Actions */}
      {selectedOrders.size > 0 && (
        <Card variant="md" className="mb-4 bg-teal-50 border-teal-200">
          <div className="flex items-center justify-between">
            <Body className="text-sm font-medium text-gray-900">
              {selectedOrders.size} order{selectedOrders.size !== 1 ? 's' : ''} selected
            </Body>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="small"
                onClick={() => setSelectedOrders(new Set())}
              >
                Clear Selection
              </Button>
              <Button
                variant="primary"
                size="small"
                onClick={handleExport}
                disabled
              >
                Export Selected
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredAndSortedOrders.length === 0 && (
        <Card variant="md" className="text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <H1 className="text-2xl font-bold text-gray-900 mb-2">No orders found</H1>
          <Body className="text-gray-600 mb-6">
            {searchQuery || selectedStatuses.size > 0 || startDate || endDate
              ? 'No orders match your filters. Try adjusting your search criteria.'
              : "You haven't placed any orders yet."}
          </Body>
          {(searchQuery || selectedStatuses.size > 0 || startDate || endDate) && (
            <Button
              variant="secondary"
              onClick={() => {
                setSearchQuery('');
                setSelectedStatuses(new Set());
                clearDateFilter();
              }}
              className="mb-4"
            >
              Clear All Filters
            </Button>
          )}
          <Link to="/products">
            <Button variant="primary">Browse Products</Button>
          </Link>
        </Card>
      )}

      {/* Orders List - Grid View */}
      {!isLoading && !error && filteredAndSortedOrders.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredAndSortedOrders.map((order) => (
            <div key={order._id} className="relative">
              {selectedOrders.size > 0 && (
                <button
                  onClick={() => handleSelectOrder(order._id)}
                  className="absolute top-3 left-3 z-10 p-1 bg-white rounded border-2 border-gray-300 hover:border-teal-500 transition-colors"
                >
                  {selectedOrders.has(order._id) ? (
                    <CheckSquare className="h-5 w-5 text-teal-600" />
                  ) : (
                    <Square className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              )}
              <Link to={`/orders/${order._id}`}>
              <Card
                variant="md"
                  className={`hover:shadow-lg transition-all cursor-pointer h-full ${
                    selectedOrders.has(order._id) ? 'ring-2 ring-teal-500' : ''
                  }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Body className="text-xs text-gray-500 mb-1">Order ID</Body>
                    <Body className="text-sm font-semibold text-gray-900">
                      #{order._id.slice(-8).toUpperCase()}
                    </Body>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                      order.status
                    )}`}
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Date:</span>
                    <span className="text-gray-900 font-medium">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Items:</span>
                    <span className="text-gray-900 font-medium">
                      {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total:</span>
                    <span className="text-lg font-bold text-teal-600">
                      MWK {order.totalAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Payment:</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getPaymentStatusBadgeColor(
                        order.paymentStatus
                      )}`}
                    >
                      {order.paymentStatus.charAt(0).toUpperCase() +
                        order.paymentStatus.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-4 border-t border-gray-200">
                  <span className="text-sm text-teal-600 font-medium flex items-center gap-1">
                    View Details
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </Card>
            </Link>
            </div>
          ))}
        </div>
      )}

      {/* Orders List - Table View */}
      {!isLoading && !error && filteredAndSortedOrders.length > 0 && viewMode === 'table' && (
        <Card variant="md" className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                {selectedOrders.size > 0 && (
                  <th className="text-left py-3 px-4">
                    <button onClick={handleSelectAll} className="p-1">
                      {selectedOrders.size === filteredAndSortedOrders.length ? (
                        <CheckSquare className="h-5 w-5 text-teal-600" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </th>
                )}
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Order ID</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Date</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Items</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Total</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Payment</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedOrders.map((order) => (
                <tr
                  key={order._id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedOrders.has(order._id) ? 'bg-teal-50' : ''
                  }`}
                >
                  {selectedOrders.size > 0 && (
                    <td className="py-3 px-4">
                      <button onClick={() => handleSelectOrder(order._id)} className="p-1">
                        {selectedOrders.has(order._id) ? (
                          <CheckSquare className="h-5 w-5 text-teal-600" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </td>
                  )}
                  <td className="py-3 px-4">
                    <Body className="text-sm font-semibold text-gray-900">
                      #{order._id.slice(-8).toUpperCase()}
                    </Body>
                  </td>
                  <td className="py-3 px-4">
                    <Body className="text-sm text-gray-600">{formatDate(order.createdAt)}</Body>
                  </td>
                  <td className="py-3 px-4">
                    <Body className="text-sm text-gray-600">
                      {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                    </Body>
                  </td>
                  <td className="py-3 px-4">
                    <Body className="text-sm font-bold text-teal-600">
                      MWK {order.totalAmount.toLocaleString()}
                    </Body>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                        order.status
                      )}`}
                    >
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${getPaymentStatusBadgeColor(
                        order.paymentStatus
                      )}`}
                    >
                      {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link to={`/orders/${order._id}`}>
                      <Button variant="ghost" size="small" className="text-teal-600">
                        View
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Results Count */}
      {!isLoading && !error && filteredAndSortedOrders.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredAndSortedOrders.length} of {allOrders.length} order{allOrders.length !== 1 ? 's' : ''}
          {(searchQuery || selectedStatuses.size > 0 || startDate || endDate) && ' (filtered)'}
        </div>
      )}

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button
            variant="secondary"
            size="small"
            disabled={data.pagination.page === 1}
          >
            Previous
          </Button>
          <Body className="text-gray-600">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </Body>
          <Button
            variant="secondary"
            size="small"
            disabled={data.pagination.page >= data.pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
