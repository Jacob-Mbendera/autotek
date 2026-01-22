import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetOrdersQuery } from '../store/api/orderApi';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { H1, Body } from '../components/ui/Typography';
import { Package, Loader2, Filter, ChevronRight } from 'lucide-react';
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

export const Orders = () => {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>(undefined);

  const { data, isLoading, error } = useGetOrdersQuery(
    statusFilter ? { status: statusFilter } : undefined
  );

  const orders = data?.orders || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <H1 className="text-3xl font-bold text-gray-900">My Orders</H1>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-5 w-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Filter by status:</span>
          <Button
            variant={statusFilter === undefined ? 'primary' : 'ghost'}
            size="small"
            onClick={() => setStatusFilter(undefined)}
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'pending' ? 'primary' : 'ghost'}
            size="small"
            onClick={() => setStatusFilter('pending')}
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === 'processing' ? 'primary' : 'ghost'}
            size="small"
            onClick={() => setStatusFilter('processing')}
          >
            Processing
          </Button>
          <Button
            variant={statusFilter === 'completed' ? 'primary' : 'ghost'}
            size="small"
            onClick={() => setStatusFilter('completed')}
          >
            Completed
          </Button>
          <Button
            variant={statusFilter === 'cancelled' ? 'primary' : 'ghost'}
            size="small"
            onClick={() => setStatusFilter('cancelled')}
          >
            Cancelled
          </Button>
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

      {/* Empty State */}
      {!isLoading && !error && orders.length === 0 && (
        <Card variant="md" className="text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <H1 className="text-2xl font-bold text-gray-900 mb-2">No orders found</H1>
          <Body className="text-gray-600 mb-6">
            {statusFilter
              ? `You don't have any ${statusFilter} orders.`
              : "You haven't placed any orders yet."}
          </Body>
          <Link to="/products">
            <Button variant="primary">Browse Products</Button>
          </Link>
        </Card>
      )}

      {/* Orders List */}
      {!isLoading && !error && orders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => (
            <Link key={order._id} to={`/orders/${order._id}`}>
              <Card
                variant="md"
                className="hover:shadow-lg transition-shadow cursor-pointer h-full"
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
          ))}
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
