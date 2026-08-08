import { useState, useEffect, useMemo } from 'react';
import {
  useGetAllCustomOrdersQuery,
  useGetCustomOrderQuery,
  type AdminCustomOrder,
} from '../../store/api/adminApi';
import { useUpdateCustomOrderMutation, type CustomOrderCustomer } from '../../store/api/customOrderApi';
import { useGetProductSuggestionsQuery } from '../../store/api/productApi';
import { useAppDispatch } from '../../store/types';
import { showNotification } from '../../store/slices/uiSlice';
import { getErrorInfo } from '../../utils/errorHandler';
import { AdminCard } from '../../components/ui/AdminCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { H1, Body } from '../../components/ui/Typography';
import { CatalogSuggestionsPanel } from '../../components/CatalogSuggestionsPanel';
import {
  Search,
  Filter,
  Eye,
  Loader2,
  FileText,
  Package,
  X,
  User,
  Phone,
  Mail,
  Calendar,
  Tag,
  Save,
  ArrowLeft,
  ArrowRight,
  Car,
  Hash,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';
import { CustomOrderStatus } from '@shared/types';
import {
  getAllowedNextCustomOrderStatuses,
  getCustomOrderStatusLabel,
} from '@shared/utils/customOrderStatusTransitions';
import { useAdminListQueryOptions } from '../../hooks/useAdminListQueryOptions';

const formatLabel = (value?: string) =>
  value
    ? value
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : '';

const getCustomer = (order?: AdminCustomOrder | null): CustomOrderCustomer => {
  if (!order?.user || typeof order.user === 'string') return {};
  return order.user;
};

const vehicleSummary = (order: AdminCustomOrder) => {
  const vehicle = order.vehicleDetails;
  if (!vehicle?.make && !vehicle?.model && !vehicle?.year) return null;
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ');
};

export const AdminCustomOrders = () => {
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomOrderStatus | ''>('');
  const [selectedOrder, setSelectedOrder] = useState<AdminCustomOrder | null>(null);
  const [newStatus, setNewStatus] = useState<CustomOrderStatus | ''>('');
  const [editEstimatedPrice, setEditEstimatedPrice] = useState('');
  const [editSupplier, setEditSupplier] = useState('');
  const [dismissCatalogSuggestions, setDismissCatalogSuggestions] = useState(false);

  const [updateCustomOrder, { isLoading: isUpdating }] = useUpdateCustomOrderMutation();

  const adminListQueryOptions = useAdminListQueryOptions();

  const { data, isLoading, refetch } = useGetAllCustomOrdersQuery(
    {
      page,
      limit,
      status: statusFilter || undefined,
      search: searchTerm || undefined,
    },
    adminListQueryOptions
  );

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

  // Set form fields when order is selected
  const handleOrderSelect = (order: AdminCustomOrder) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setEditEstimatedPrice(
      order.estimatedPrice != null && order.estimatedPrice > 0
        ? String(order.estimatedPrice)
        : ''
    );
    setEditSupplier(order.supplier || '');
  };

  // Sync form when orderDetailData loads
  useEffect(() => {
    const detail = orderDetailData?.customOrder;
    if (detail) {
      setNewStatus(detail.status);
      setEditEstimatedPrice(
        detail.estimatedPrice != null && detail.estimatedPrice > 0
          ? String(detail.estimatedPrice)
          : ''
      );
      setEditSupplier(detail.supplier || '');
      setDismissCatalogSuggestions(false);
    } else if (selectedOrder?.status && !newStatus) {
      setNewStatus(selectedOrder.status);
    }
  }, [orderDetailData, selectedOrder]);

  const detailOrder = orderDetailData?.customOrder || selectedOrder;
  const currentStatus = (detailOrder?.status || CustomOrderStatus.PENDING) as CustomOrderStatus;

  const catalogSuggestionArgs = useMemo(() => {
    const vehicle = detailOrder?.vehicleDetails;
    const part = detailOrder?.partDetails;
    return {
      make: vehicle?.make,
      model: vehicle?.model,
      year: vehicle?.year,
      engine: vehicle?.engine,
      productName: detailOrder?.productName,
      partNumber: part?.partNumber,
      category: detailOrder?.category,
      limit: 5,
    };
  }, [detailOrder]);

  const canSuggestCatalog =
    Boolean(catalogSuggestionArgs.make && catalogSuggestionArgs.model) &&
    Boolean(
      (catalogSuggestionArgs.productName && catalogSuggestionArgs.productName.length >= 3) ||
        (catalogSuggestionArgs.partNumber && catalogSuggestionArgs.partNumber.length >= 3)
    );

  const { data: catalogSuggestionData, isFetching: isFetchingCatalogSuggestions } =
    useGetProductSuggestionsQuery(catalogSuggestionArgs, {
      skip: !detailOrder || !canSuggestCatalog || dismissCatalogSuggestions,
    });

  const quoteFields = useMemo(() => {
    const parsed = editEstimatedPrice.trim() === '' ? undefined : Number(editEstimatedPrice);
    return {
      estimatedPrice: Number.isFinite(parsed as number) ? (parsed as number) : undefined,
      supplier: editSupplier.trim() || undefined,
    };
  }, [editEstimatedPrice, editSupplier]);

  const allowedNextStatuses = useMemo(
    () => getAllowedNextCustomOrderStatuses(currentStatus, quoteFields),
    [currentStatus, quoteFields]
  );

  const statusSelectOptions = useMemo(() => {
    const options = new Set<CustomOrderStatus>([currentStatus, ...allowedNextStatuses]);
    return Array.from(options);
  }, [currentStatus, allowedNextStatuses]);

  const quoteBlocksAdvance =
    currentStatus !== CustomOrderStatus.COMPLETED &&
    currentStatus !== CustomOrderStatus.CANCELLED &&
    !allowedNextStatuses.some((s) => s !== CustomOrderStatus.CANCELLED);

  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus) {
      return;
    }

    const statusUnchanged = newStatus === currentStatus;
    const priceNum =
      editEstimatedPrice.trim() === '' ? undefined : Number(editEstimatedPrice);
    const currentPrice = detailOrder?.estimatedPrice;
    const priceChanged =
      priceNum !== undefined &&
      Number.isFinite(priceNum) &&
      priceNum !== currentPrice;
    const clearPrice =
      editEstimatedPrice.trim() === '' &&
      currentPrice != null &&
      currentPrice > 0;
    const supplierChanged =
      editSupplier.trim() !== (detailOrder?.supplier || '').trim();

    if (statusUnchanged && !priceChanged && !clearPrice && !supplierChanged) {
      return;
    }

    if (priceNum !== undefined && (!Number.isFinite(priceNum) || priceNum < 0)) {
      dispatch(showNotification({
        message: 'Estimated price must be a valid non-negative number',
        type: 'error',
      }));
      return;
    }

    try {
      const body: {
        id: string;
        status?: CustomOrderStatus;
        estimatedPrice?: number;
        supplier?: string;
      } = { id: selectedOrder._id };

      if (!statusUnchanged) {
        body.status = newStatus as CustomOrderStatus;
      }
      if (priceChanged || clearPrice) {
        body.estimatedPrice = clearPrice ? 0 : priceNum;
      }
      if (supplierChanged) {
        body.supplier = editSupplier.trim();
      }

      const updated = await updateCustomOrder(body).unwrap();

      dispatch(showNotification({ message: 'Custom order updated successfully!', type: 'success' }));
      await refetch();
      setSelectedOrder({
        ...selectedOrder,
        ...updated,
        status: updated.status ?? newStatus,
        estimatedPrice: updated.estimatedPrice,
        supplier: updated.supplier,
      });
      setNewStatus(updated.status ?? newStatus);
    } catch (error: unknown) {
      const errorInfo = getErrorInfo(error, 'Failed to update custom order');
      dispatch(showNotification({
        message: errorInfo.message,
        type: 'error',
      }));
      if (import.meta.env.DEV) {
        console.error('Error updating custom order:', error);
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
                  filteredCustomOrders.map((order) => {
                    const customer = getCustomer(order);
                    const fitment = vehicleSummary(order);
                    return (
                    <tr key={order._id} className="border-b border-gray-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-4">
                        <Body className="font-mono text-sm text-gray-50">
                          {order._id.slice(0, 8)}...
                        </Body>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <Body className="font-medium text-gray-50">
                            {customer.name || 'N/A'}
                          </Body>
                          <Body className="text-sm text-gray-400">{customer.email || ''}</Body>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Body className="font-medium text-gray-50">
                          {order.productName || 'N/A'}
                        </Body>
                        {fitment && (
                          <Body className="text-xs text-teal-300 mt-1">{fitment}</Body>
                        )}
                        {order.partDetails?.partNumber && (
                          <Body className="text-xs text-gray-400 mt-1">
                            PN: {order.partDetails.partNumber}
                          </Body>
                        )}
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {data?.pagination && (data.pagination.totalPages || data.pagination.pages || 0) > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-700">
              <Body className="text-gray-400">
                Showing {((page - 1) * limit) + 1} to{' '}
                {Math.min(page * limit, data.pagination.total)} of{' '}
                {data.pagination.total} custom orders
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
                  disabled={page >= (data.pagination.totalPages || data.pagination.pages || 1)}
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
                {/* Quote fields + status */}
                <div className="space-y-4">
                  <div>
                    <Body className="text-sm text-gray-400 mb-2">Estimated price (MWK)</Body>
                    <Input
                      dark
                      type="number"
                      min={0}
                      step={1}
                      value={editEstimatedPrice}
                      onChange={(e) => setEditEstimatedPrice(e.target.value)}
                      placeholder="Enter quote amount"
                      disabled={
                        currentStatus === CustomOrderStatus.COMPLETED ||
                        currentStatus === CustomOrderStatus.CANCELLED
                      }
                    />
                  </div>
                  <div>
                    <Body className="text-sm text-gray-400 mb-2">Supplier</Body>
                    <Input
                      dark
                      value={editSupplier}
                      onChange={(e) => setEditSupplier(e.target.value)}
                      placeholder="Supplier name"
                      disabled={
                        currentStatus === CustomOrderStatus.COMPLETED ||
                        currentStatus === CustomOrderStatus.CANCELLED
                      }
                    />
                  </div>
                  <div>
                    <Body className="text-sm text-gray-400 mb-2">Status</Body>
                    <div className="flex items-center gap-3">
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as CustomOrderStatus)}
                        disabled={statusSelectOptions.length <= 1}
                        className="flex-1 px-4 py-2 bg-slate-900 border border-gray-700 rounded-lg text-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all disabled:opacity-60"
                      >
                        {statusSelectOptions.map((status) => (
                          <option key={status} value={status}>
                            {getCustomOrderStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="primary"
                        size="small"
                        dark
                        onClick={handleStatusUpdate}
                        disabled={isUpdating || statusSelectOptions.length === 0}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save
                      </Button>
                    </div>
                    {statusSelectOptions.length <= 1 &&
                      (currentStatus === CustomOrderStatus.COMPLETED ||
                        currentStatus === CustomOrderStatus.CANCELLED) && (
                      <Body className="text-xs text-gray-500 mt-2">
                        No further status changes are available for this request.
                      </Body>
                    )}
                    {quoteBlocksAdvance && (
                      <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-700/50 bg-amber-950/40 px-3 py-2">
                        <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <Body className="text-xs text-amber-200">
                          Enter an estimated price and supplier to advance to{' '}
                          {getCustomOrderStatusLabel(
                            currentStatus === CustomOrderStatus.PENDING
                              ? CustomOrderStatus.ORDERED
                              : currentStatus === CustomOrderStatus.ORDERED
                                ? CustomOrderStatus.RECEIVED
                                : CustomOrderStatus.COMPLETED
                          )}
                          . You can still cancel.
                        </Body>
                      </div>
                    )}
                    {newStatus !== currentStatus && (
                      <Body className="text-xs text-amber-400 mt-2">
                        Status will change from {getCustomOrderStatusLabel(currentStatus)} to{' '}
                        {getCustomOrderStatusLabel(newStatus as CustomOrderStatus)}
                      </Body>
                    )}
                  </div>
                </div>

                {/* Customer Information */}
                {(() => {
                  const customer = getCustomer(detailOrder);
                  const vehicle = detailOrder.vehicleDetails;
                  const part = detailOrder.partDetails;
                  const images = detailOrder.images || [];

                  return (
                    <>
                <div>
                  <Body className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Information
                  </Body>
                  <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Body className="text-gray-50 font-medium">
                        {customer.name || 'N/A'}
                      </Body>
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <Body className="text-gray-300 text-sm">
                          {customer.email}
                        </Body>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <Body className="text-gray-300 text-sm">
                          {customer.phone}
                        </Body>
                      </div>
                    )}
                  </div>
                </div>

                {(vehicle?.make || vehicle?.model || vehicle?.year || vehicle?.engine) && (
                  <div>
                    <Body className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Vehicle Fitment
                    </Body>
                    <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                      <div>
                        <Body className="text-xs text-gray-400 mb-1">Vehicle</Body>
                        <Body className="text-gray-50 font-medium">
                          {[vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(' ') || 'N/A'}
                        </Body>
                      </div>
                      {vehicle?.engine && (
                        <div>
                          <Body className="text-xs text-gray-400 mb-1">Engine</Body>
                          <Body className="text-gray-50">{vehicle.engine}</Body>
                        </div>
                      )}
                      {(vehicle?.trim || vehicle?.transmission || vehicle?.drivetrain || vehicle?.bodyStyle) && (
                        <div>
                          <Body className="text-xs text-gray-400 mb-1">Additional details</Body>
                          <Body className="text-gray-50">
                            {[
                              vehicle?.trim,
                              formatLabel(vehicle?.transmission),
                              formatLabel(vehicle?.drivetrain),
                              formatLabel(vehicle?.bodyStyle),
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </Body>
                        </div>
                      )}
                      {vehicle?.vinOrChassis && (
                        <div>
                          <Body className="text-xs text-gray-400 mb-1">VIN / Chassis</Body>
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-gray-400" />
                            <Body className="text-gray-50 font-mono">{vehicle.vinOrChassis}</Body>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {canSuggestCatalog && (
                  <CatalogSuggestionsPanel
                    dark
                    title="Possible catalog matches"
                    subtitle="Assistive only — confirm before telling the customer a catalog part fits. Dismiss if not useful."
                    suggestions={catalogSuggestionData?.suggestions || []}
                    isLoading={isFetchingCatalogSuggestions}
                    dismissed={dismissCatalogSuggestions}
                    onDismiss={() => setDismissCatalogSuggestions(true)}
                  />
                )}

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
                        {detailOrder.productName || 'N/A'}
                      </Body>
                    </div>
                    <div>
                      <Body className="text-xs text-gray-400 mb-1">Description</Body>
                      <Body className="text-gray-50">
                        {detailOrder.description || 'N/A'}
                      </Body>
                    </div>
                    {detailOrder.category && (
                      <div>
                        <Body className="text-xs text-gray-400 mb-1">Category</Body>
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-gray-400" />
                          <Body className="text-gray-50">
                            {detailOrder.category}
                          </Body>
                        </div>
                      </div>
                    )}
                    {(part?.position || part?.quantity || part?.preference || part?.partNumber) && (
                      <div>
                        <Body className="text-xs text-gray-400 mb-1">Part fitment</Body>
                        <Body className="text-gray-50">
                          {[
                            part?.position ? formatLabel(part.position) : null,
                            part?.quantity ? `Qty ${part.quantity}` : null,
                            part?.preference ? formatLabel(part.preference) : null,
                            part?.partNumber ? `PN ${part.partNumber}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Body>
                      </div>
                    )}
                    {detailOrder.notes && (
                      <div>
                        <Body className="text-xs text-gray-400 mb-1">Notes</Body>
                        <Body className="text-gray-50">
                          {detailOrder.notes}
                        </Body>
                      </div>
                    )}
                  </div>
                </div>

                {images.length > 0 && (
                  <div>
                    <Body className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Photos
                    </Body>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {images.map((image, index) => (
                        <a
                          key={`${detailOrder._id}-img-${index}`}
                          href={image}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block overflow-hidden rounded-lg border border-gray-600 bg-slate-900"
                        >
                          <img
                            src={image}
                            alt={`${detailOrder.productName} photo ${index + 1}`}
                            className="w-full h-40 object-contain p-2"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                    </>
                  );
                })()}

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
