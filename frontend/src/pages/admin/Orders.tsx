import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetAllOrdersQuery } from '../../store/api/adminApi';
import { AdminCard } from '../../components/ui/AdminCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { H1, Body } from '../../components/ui/Typography';
import { Search, Filter, Eye, Loader2, Package } from 'lucide-react';
import { OrderStatus } from '@shared/types';

export const AdminOrders = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');

  const { data, isLoading } = useGetAllOrdersQuery({
    page,
    limit,
    status: statusFilter || undefined,
  });

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return 'bg-amber-500/20 text-amber-500';
      case OrderStatus.PROCESSING:
        return 'bg-blue-500/20 text-blue-500';
      case OrderStatus.COMPLETED:
        return 'bg-green-500/20 text-green-500';
      case OrderStatus.CANCELLED:
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const filteredOrders = data?.orders
    ? (data.orders as any[]).filter((order) => {
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          return (
            order._id?.toLowerCase().includes(searchLower) ||
            order.user?.name?.toLowerCase().includes(searchLower) ||
            order.user?.email?.toLowerCase().includes(searchLower)
          );
        }
        return true;
      })
    : [];

  return (
    <div>
      <div className="mb-6">
        <H1 className="text-3xl font-bold text-gray-50 mb-2">Order Management</H1>
        <Body className="text-gray-400">View and manage all orders</Body>
      </div>

      {/* Filters */}
      <AdminCard variant="default" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                dark
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by order ID, customer name or email"
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
              className="w-full px-4 py-3 bg-slate-900 border border-gray-700 rounded-lg text-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
            >
              <option value="">All Statuses</option>
              <option value={OrderStatus.PENDING}>Pending</option>
              <option value={OrderStatus.PROCESSING}>Processing</option>
              <option value={OrderStatus.COMPLETED}>Completed</option>
              <option value={OrderStatus.CANCELLED}>Cancelled</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              variant="secondary"
              dark
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
              }}
              className="w-full"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </div>
      </AdminCard>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
        </div>
      ) : (
        <AdminCard variant="table">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-400">Order ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-400">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-400">Items</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-400">Total</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-400">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-400">Date</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <Package className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <Body className="text-gray-400">No orders found</Body>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order: any) => (
                    <tr key={order._id} className="border-b border-gray-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-4">
                        <Body className="font-mono text-sm text-gray-50">
                          {order._id.slice(0, 8)}...
                        </Body>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <Body className="font-medium text-gray-50">
                            {order.user?.name || 'N/A'}
                          </Body>
                          <Body className="text-sm text-gray-400">{order.user?.email || ''}</Body>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Body className="text-gray-300">{order.items?.length || 0} items</Body>
                      </td>
                      <td className="py-3 px-4">
                        <Body className="font-medium text-gray-50">
                          MWK {order.totalAmount?.toLocaleString() || '0'}
                        </Body>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Body className="text-sm text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </Body>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="small"
                          dark
                          onClick={() => navigate(`/orders/${order._id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data?.pagination && (data.pagination as any).totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-700">
              <Body className="text-gray-400">
                Showing {((page - 1) * limit) + 1} to{' '}
                {Math.min(page * limit, (data.pagination as any).total)} of{' '}
                {(data.pagination as any).total} orders
              </Body>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="small"
                  dark
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  dark
                  onClick={() => setPage(page + 1)}
                  disabled={page >= (data.pagination as any).totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </AdminCard>
      )}
    </div>
  );
};
