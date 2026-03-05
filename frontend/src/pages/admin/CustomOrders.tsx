import { useState, useEffect } from 'react';
import { useGetAllCustomOrdersQuery, useGetCustomOrderQuery } from '../../store/api/adminApi';
import { useUpdateCustomOrderMutation } from '../../store/api/customOrderApi';
import { useAppDispatch } from '../../store/types';
import { showNotification } from '../../store/slices/uiSlice';
import { AdminCard } from '../../components/ui/AdminCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { H1, Body } from '../../components/ui/Typography';
import { Search, Filter, Eye, Loader2, FileText, Package, X, User, Phone, Mail, Calendar, DollarSign, Tag, Save, ArrowLeft, ArrowRight } from 'lucide-react';
import { CustomOrderStatus } from '@shared/types';

export const AdminCustomOrders = () => {
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomOrderStatus | ''>('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<CustomOrderStatus | ''>('');

  const [updateCustomOrder, { isLoading: isUpdating }] = useUpdateCustomOrderMutation();

  const { data, isLoading, refetch } = useGetAllCustomOrdersQuery({
    page,
    limit,
    status: statusFilter || undefined,
    search: searchTerm || undefined,
  });

  const getStatusColor = (status: CustomOrderStatus) => {
    switch (status) {
      case CustomOrderStatus.PENDING:
        return 'bg-amber-500/20 text-amber-500';
      case CustomOrderStatus.ORDERED:
        return 'bg-blue-500/20 text-blue-500';
      case CustomOrderStatus.RECEIVED:
        return 'bg-purple-500/20 text-purple-500';
      case CustomOrderStatus.COMPLETED:
        return 'bg-green-500/20 text-green-500';
      case CustomOrderStatus.CANCELLED:
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Backend handles search, so no need for client-side filtering
  const filteredCustomOrders = data?.customOrders || [];

  const { data: orderDetailData, isLoading: isLoadingDetail } = useGetCustomOrderQuery(
    selectedOrder?._id || '',
    { skip: !selectedOrder }
  );

  // Set newStatus when order is selected
  const handleOrderSelect = (order: any) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
  };

  // Update newStatus when orderDetailData loads
  useEffect(() => {
    if (orderDetailData?.customOrder?.status) {
      setNewStatus(orderDetailData.customOrder.status);
    } else if (selectedOrder?.status && !newStatus) {
      setNewStatus(selectedOrder.status);
    }
  }, [orderDetailData, selectedOrder]);

  // Get current status for display
  const currentStatus = orderDetailData?.customOrder?.status || selectedOrder?.status || '';

  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus || newStatus === (orderDetailData?.customOrder?.status || selectedOrder.status)) {
      return;
    }

    try {
      await updateCustomOrder({
        id: selectedOrder._id,
        status: newStatus as CustomOrderStatus,
      }).unwrap();

      dispatch(showNotification({ message: 'Custom order status updated successfully!', type: 'success' }));
      await refetch();
      // Update the selected order with new status
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    } catch (error: any) {
      dispatch(showNotification({ 
        message: error.data?.message || 'Failed to update custom order status', 
        type: 'error' 
      }));
      if (process.env.NODE_ENV === 'development') {
        console.error('Error updating custom order status:', error);
      }
    }
  };

  return (
    <div>
      <div className="mb-6">
        <H1 className="text-3xl font-bold text-gray-50 mb-2">Custom Order Management</H1>
        <Body className="text-gray-400">View and manage custom order requests</Body>
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
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1); // Reset to first page on search
                }}
                placeholder="Search custom orders..."
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CustomOrderStatus | '')}
              className="w-full px-4 py-3 bg-slate-900 border border-gray-700 rounded-lg text-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
            >
              <option value="">All Statuses</option>
              <option value={CustomOrderStatus.PENDING}>Pending</option>
              <option value={CustomOrderStatus.ORDERED}>Ordered</option>
              <option value={CustomOrderStatus.RECEIVED}>Received</option>
              <option value={CustomOrderStatus.COMPLETED}>Completed</option>
              <option value={CustomOrderStatus.CANCELLED}>Cancelled</option>
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
                  <th className="text-left py-3 px-4 font-semibold text-gray-400">Product Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-400">Description</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-400">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-400">Date</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <Body className="text-gray-400">No custom orders found</Body>
                    </td>
                  </tr>
                ) : (
                  filteredCustomOrders.map((order: any) => (
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
                        <Body className="font-medium text-gray-50">
                          {order.productName || 'N/A'}
                        </Body>
                      </td>
                      <td className="py-3 px-4">
                        <Body className="text-sm text-gray-300 line-clamp-2">
                          {order.description || 'N/A'}
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
                          onClick={() => handleOrderSelect(order)}
                          className="gap-1.5"
                        >
                          <Eye className="h-4 w-4" />
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
                {(data.pagination as any).total} custom orders
              </Body>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="small"
                  dark
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  dark
                  onClick={() => setPage(page + 1)}
                  disabled={page >= (data.pagination as any).totalPages}
                  className="gap-1.5"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </AdminCard>
      )}

      {/* Custom Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <Card variant="lg" className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-800">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-teal-500" />
                <H1 className="text-2xl font-bold text-gray-50">Custom Order Details</H1>
              </div>
              <Button
                variant="ghost"
                size="small"
                dark
                onClick={() => setSelectedOrder(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {isLoadingDetail ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Status Update */}
                <div>
                  <Body className="text-sm text-gray-400 mb-2">Status</Body>
                  <div className="flex items-center gap-3">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as CustomOrderStatus)}
                      className="flex-1 px-4 py-2 bg-slate-900 border border-gray-700 rounded-lg text-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                    >
                      <option value={CustomOrderStatus.PENDING}>Pending</option>
                      <option value={CustomOrderStatus.ORDERED}>Ordered</option>
                      <option value={CustomOrderStatus.RECEIVED}>Received</option>
                      <option value={CustomOrderStatus.COMPLETED}>Completed</option>
                      <option value={CustomOrderStatus.CANCELLED}>Cancelled</option>
                    </select>
                    <Button
                      variant="primary"
                      size="small"
                      dark
                      onClick={handleStatusUpdate}
                      disabled={newStatus === (orderDetailData?.customOrder?.status || selectedOrder.status) || isUpdating}
                    >
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Update Status
                    </Button>
                  </div>
                  {newStatus !== (orderDetailData?.customOrder?.status || selectedOrder.status) && (
                    <Body className="text-xs text-amber-400 mt-2">
                      Status will change from {orderDetailData?.customOrder?.status || selectedOrder.status} to {newStatus}
                    </Body>
                  )}
                </div>

                {/* Customer Information */}
                <div>
                  <Body className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Information
                  </Body>
                  <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Body className="text-gray-50 font-medium">
                        {(orderDetailData?.customOrder?.user || selectedOrder.user)?.name || 'N/A'}
                      </Body>
                    </div>
                    {(orderDetailData?.customOrder?.user || selectedOrder.user)?.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <Body className="text-gray-300 text-sm">
                          {(orderDetailData?.customOrder?.user || selectedOrder.user)?.email}
                        </Body>
                      </div>
                    )}
                    {(orderDetailData?.customOrder?.user || selectedOrder.user)?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <Body className="text-gray-300 text-sm">
                          {(orderDetailData?.customOrder?.user || selectedOrder.user)?.phone}
                        </Body>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Details */}
                <div>
                  <Body className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Order Details
                  </Body>
                  <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                    <div>
                      <Body className="text-xs text-gray-400 mb-1">Product Name</Body>
                      <Body className="text-gray-50 font-medium">
                        {(orderDetailData?.customOrder || selectedOrder)?.productName || 'N/A'}
                      </Body>
                    </div>
                    <div>
                      <Body className="text-xs text-gray-400 mb-1">Description</Body>
                      <Body className="text-gray-50">
                        {(orderDetailData?.customOrder || selectedOrder)?.description || 'N/A'}
                      </Body>
                    </div>
                    {(orderDetailData?.customOrder || selectedOrder)?.category && (
                      <div>
                        <Body className="text-xs text-gray-400 mb-1">Category</Body>
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-gray-400" />
                          <Body className="text-gray-50">
                            {(orderDetailData?.customOrder || selectedOrder)?.category}
                          </Body>
                        </div>
                      </div>
                    )}
                    {(orderDetailData?.customOrder || selectedOrder)?.estimatedPrice && (
                      <div>
                        <Body className="text-xs text-gray-400 mb-1">Estimated Price</Body>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <Body className="text-gray-50 font-medium">
                            MWK {((orderDetailData?.customOrder || selectedOrder)?.estimatedPrice || 0).toLocaleString()}
                          </Body>
                        </div>
                      </div>
                    )}
                    {(orderDetailData?.customOrder || selectedOrder)?.supplier && (
                      <div>
                        <Body className="text-xs text-gray-400 mb-1">Supplier</Body>
                        <Body className="text-gray-50">
                          {(orderDetailData?.customOrder || selectedOrder)?.supplier}
                        </Body>
                      </div>
                    )}
                    {(orderDetailData?.customOrder || selectedOrder)?.notes && (
                      <div>
                        <Body className="text-xs text-gray-400 mb-1">Notes</Body>
                        <Body className="text-gray-50">
                          {(orderDetailData?.customOrder || selectedOrder)?.notes}
                        </Body>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dates */}
                <div>
                  <Body className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Dates
                  </Body>
                  <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                    <div>
                      <Body className="text-xs text-gray-400 mb-1">Created</Body>
                      <Body className="text-gray-50">
                        {new Date((orderDetailData?.customOrder || selectedOrder)?.createdAt).toLocaleString()}
                      </Body>
                    </div>
                    {(orderDetailData?.customOrder || selectedOrder)?.updatedAt && (
                      <div>
                        <Body className="text-xs text-gray-400 mb-1">Last Updated</Body>
                        <Body className="text-gray-50">
                          {new Date((orderDetailData?.customOrder || selectedOrder)?.updatedAt).toLocaleString()}
                        </Body>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button variant="secondary" dark onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
