import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useGetOrderQuery, useCancelOrderMutation } from '../../store/api/orderApi';
import type { ShippingAddress } from '../../store/api/orderApi';
import { useGetReturnsQuery } from '../../store/api/returnApi';
import { useAppSelector } from '../../store/types';
import { useGetAdminOrderQuery, useUpdateOrderStatusMutation } from '../../store/api/adminApi';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { H1, Body } from '../../components/ui/Typography';
import { Breadcrumb } from '../../components/Breadcrumb';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { Input } from '../../components/ui/Input';
import { OptimizedImage } from '../../components/ui/OptimizedImage';
import { useAppDispatch } from '../../store/types';
import { showNotification } from '../../store/slices/uiSlice';
import { getErrorInfo } from '../../utils/errorHandler';
import { getProductImageBlur, getProductImageUrl } from '../../utils/productImage';
import { useCompleteOrderPayment } from '../../hooks/useCompleteOrderPayment';

// Helper function to format shipping address
const formatShippingAddress = (address: ShippingAddress | string): string => {
  if (typeof address === 'string') {
    return address;
  }

  if (address.customAddress) {
    return address.town ? `${address.town} - ${address.customAddress}` : address.customAddress;
  }

  if (address.town && address.landmark) {
    return `${address.town}, ${address.landmark}`;
  }

  return 'Address not specified';
};
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  Loader2,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Truck,
  RotateCcw,
  MessageCircle,
  Percent,
  TrendingUp,
  History,
  Copy,
  ExternalLink,
  RefreshCw,
  Store,
} from 'lucide-react';
import { OrderStatus, PaymentStatus } from '@shared/types';
import {
  assertCustomerCanCancelOrder,
  assertValidOrderStatusTransition,
  canCustomerCancelOrder,
  getAllowedNextOrderStatuses,
  getCustomerCancelBlockMessage,
  getOrderStatusLabel,
} from '@shared/utils/orderStatusTransitions';

// Helper function to get status badge colors
const getStatusBadgeColor = (status: OrderStatus) => {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-700';
    case 'processing':
      return 'bg-blue-100 text-blue-700';
    case 'dispatched':
      return 'bg-indigo-100 text-indigo-700';
    case 'ready_for_collection':
      return 'bg-purple-100 text-purple-700';
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'cancelled':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const getAdminStatusOptionLabel = (status: OrderStatus): string => {
  switch (status) {
    case OrderStatus.DISPATCHED:
      return 'Dispatched (on the way to pickup)';
    case OrderStatus.READY_FOR_COLLECTION:
      return 'Ready for collection';
    case OrderStatus.COMPLETED:
      return 'Collected / case closed';
    default:
      return getOrderStatusLabel(status);
  }
};

const getStatusLabel = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.DISPATCHED:
      return 'Dispatched';
    case OrderStatus.READY_FOR_COLLECTION:
      return 'Ready for collection';
    case OrderStatus.COMPLETED:
      return 'Collected';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

const ORDER_STATUS_RANK: Record<OrderStatus, number> = {
  [OrderStatus.PENDING]: 0,
  [OrderStatus.PROCESSING]: 1,
  [OrderStatus.DISPATCHED]: 2,
  [OrderStatus.READY_FOR_COLLECTION]: 3,
  [OrderStatus.COMPLETED]: 4,
  [OrderStatus.CANCELLED]: -1,
};

const isAtOrPastStatus = (current: OrderStatus, step: OrderStatus) => {
  if (current === OrderStatus.CANCELLED) {
    return step === OrderStatus.PENDING;
  }
  return ORDER_STATUS_RANK[current] >= ORDER_STATUS_RANK[step];
};

const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PROCESSING,
  OrderStatus.DISPATCHED,
  OrderStatus.READY_FOR_COLLECTION,
];

const getPaymentStatusBadgeColor = (status: PaymentStatus) => {
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
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Format payment method
const formatPaymentMethod = (method?: string) => {
  if (!method) return 'Not specified';
  return method
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const AdminOrderDetail = () => {
  const isAdminProp = true;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showStatusUpdateModal, setShowStatusUpdateModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');
  const [adminCancelReason, setAdminCancelReason] = useState('');

  // Determine if this is an admin route by checking the pathname FIRST
  // Calculate synchronously (not in useMemo) to ensure it's available immediately
  // This must be calculated before hooks to ensure correct query selection
  const isAdminRoute = location.pathname.startsWith('/admin/orders/');
  const isAdmin = Boolean(isAdminProp || isAdminRoute);
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  
  // Get email from sessionStorage for guest orders (not URL for privacy)
  // Fallback to URL param for backward compatibility with old links
  const searchParams = new URLSearchParams(location.search);
  const guestEmail = sessionStorage.getItem('guestOrderEmail') || searchParams.get('email') || undefined;
  
  // Returns for this order only (skip if admin) — avoids paginated global list staleness.
  // Polls independently of order-status polling below, which stops once the order is
  // COMPLETED — the exact status required for Quick Actions (Request/View Return) to show,
  // so without its own polling this view could never pick up a return made elsewhere.
  const { data: returnsData } = useGetReturnsQuery(
    id
      ? {
          orderId: id,
          ...(guestEmail ? { email: guestEmail } : {}),
        }
      : undefined,
    {
      skip: isAdmin || !id,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true,
      pollingInterval: 45000,
    }
  );

  // Use admin API if admin, otherwise use regular order API
  // CRITICAL: Use very strict skip conditions to prevent both queries from running
  // When isAdmin is true, userQuery MUST be skipped (skip: true)
  // When isAdmin is false, adminQuery MUST be skipped (skip: true)
  // Calculate skip values synchronously to ensure they're evaluated before hooks run
  const shouldSkipAdmin = !isAdmin || !id;
  const shouldSkipUser = isAdmin || !id;

  // Only call the appropriate query - use strict skip to prevent both from running
  const adminQueryResult = useGetAdminOrderQuery(id || '', { 
    skip: shouldSkipAdmin,
  });
  
  // CRITICAL: This query should NEVER run when isAdmin is true
  // Using strict skip condition - if isAdmin is true, skip MUST be true
  // For guest orders, pass email in the query
  // Always pass an object with id and optional email
  const orderQueryArg = {
    id: id || '',
    email: guestEmail && !isAuthenticated ? guestEmail : undefined
  };

  const [customerOrderPollMs, setCustomerOrderPollMs] = useState(0);
  const customerPollTargetRef = useRef(0);
  const customerOrderQueryOpts = useMemo(
    () => ({
      refetchOnFocus: true,
      refetchOnReconnect: true,
      pollingInterval: customerOrderPollMs,
    }),
    [customerOrderPollMs]
  );

  const userQueryResult = useGetOrderQuery(orderQueryArg, {
    skip: shouldSkipUser,
    ...customerOrderQueryOpts,
  });

  useEffect(() => {
    if (isAdmin) return;
    const status = userQueryResult.data?.order?.status;
    const needPoll = status != null && ACTIVE_ORDER_STATUSES.includes(status);
    const next = needPoll ? 30000 : 0;
    if (customerPollTargetRef.current !== next) {
      customerPollTargetRef.current = next;
      setCustomerOrderPollMs(next);
    }
  }, [isAdmin, userQueryResult.data?.order?.status]);

  useEffect(() => {
    if (!isAdmin || !selectedStatus) return;
    const o = adminQueryResult.data?.order;
    if (!o) return;
    const allowed = getAllowedNextOrderStatuses(o.status, o.paymentStatus);
    if (!allowed.includes(selectedStatus)) {
      setSelectedStatus('');
    }
  }, [isAdmin, selectedStatus, adminQueryResult.data?.order]);

  // Determine which data to use based on isAdmin
  // Only use the query result that should be active
  const activeQuery = isAdmin ? adminQueryResult : userQueryResult;
  const data = activeQuery.data;
  const isLoading = activeQuery.isLoading;
  const error = activeQuery.error;

  // Admin-only: Order status update mutation
  const [updateOrderStatus, { isLoading: isUpdatingStatus }] = useUpdateOrderStatusMutation();
  
  // Order cancellation mutation
  const [cancelOrder, { isLoading: isCancelling }] = useCancelOrderMutation();
  const { completePayment, isCompletingPayment } = useCompleteOrderPayment();

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-teal-600 animate-spin mx-auto mb-4" />
          <Body className="text-gray-600">Loading order details...</Body>
        </div>
      </div>
    );
  }

  if (error || !data?.order) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card variant="md" className="text-center">
          <Body className="text-red-600 mb-4">Order not found.</Body>
          <Button variant="secondary" onClick={() => navigate(isAdmin ? '/admin/orders' : '/orders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
        </Card>
      </div>
    );
  }

  const order = data.order;

  const allowedNextOrderStatuses = isAdmin
    ? getAllowedNextOrderStatuses(order.status, order.paymentStatus)
    : [];

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: isAdmin ? 'Admin Orders' : 'Orders', href: isAdmin ? '/admin/orders' : '/orders' },
    { label: `Order #${order._id.slice(-8).toUpperCase()}` },
  ];

  // Calculate progress percentage
  const getProgressPercentage = () => {
    switch (order.status) {
      case OrderStatus.PENDING:
        return 20;
      case OrderStatus.PROCESSING:
        return 40;
      case OrderStatus.DISPATCHED:
        return 60;
      case OrderStatus.READY_FOR_COLLECTION:
        return 80;
      case OrderStatus.COMPLETED:
        return 100;
      case OrderStatus.CANCELLED:
        return 0;
      default:
        return 0;
    }
  };

  const pickupLocationText = formatShippingAddress(order.shippingAddress);

  // Estimate when order will be ready for pickup
  const getEstimatedPickup = () => {
    if (order.status === OrderStatus.COMPLETED) {
      return 'Collected';
    }
    if (order.status === OrderStatus.READY_FOR_COLLECTION) {
      return 'Ready now';
    }
    const days =
      order.status === OrderStatus.DISPATCHED
        ? 1
        : order.status === OrderStatus.PROCESSING
          ? 2
          : 5;
    const date = new Date(order.createdAt);
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Order timeline steps with pickup milestones
  const getOrderTimeline = () => {
    const steps = [
      {
        status: OrderStatus.PENDING,
        label: 'Order Placed',
        description: 'Your order has been received and confirmed',
        icon: Package,
        completed: isAtOrPastStatus(order.status, OrderStatus.PENDING),
        active: order.status === OrderStatus.PENDING,
        date: order.createdAt,
        estimatedDate: null,
      },
      {
        status: OrderStatus.PROCESSING,
        label: 'Processing',
        description: "We're preparing your order",
        icon: Loader2,
        completed: isAtOrPastStatus(order.status, OrderStatus.PROCESSING),
        active: order.status === OrderStatus.PROCESSING,
        date: isAtOrPastStatus(order.status, OrderStatus.PROCESSING) ? order.updatedAt : null,
        estimatedDate:
          order.status === OrderStatus.PROCESSING ? getEstimatedPickup() : null,
      },
      {
        status: OrderStatus.DISPATCHED,
        label: 'On the Way',
        description: `Your order is on the way to ${pickupLocationText} for pickup`,
        icon: Truck,
        completed: isAtOrPastStatus(order.status, OrderStatus.DISPATCHED),
        active: order.status === OrderStatus.DISPATCHED,
        date: isAtOrPastStatus(order.status, OrderStatus.DISPATCHED) ? order.updatedAt : null,
        estimatedDate:
          order.status === OrderStatus.DISPATCHED ? getEstimatedPickup() : null,
      },
      {
        status: OrderStatus.READY_FOR_COLLECTION,
        label: 'Ready for Collection',
        description: `Your order is ready for collection at ${pickupLocationText}`,
        icon: Store,
        completed: isAtOrPastStatus(order.status, OrderStatus.READY_FOR_COLLECTION),
        active: order.status === OrderStatus.READY_FOR_COLLECTION,
        date: isAtOrPastStatus(order.status, OrderStatus.READY_FOR_COLLECTION)
          ? order.updatedAt
          : null,
        estimatedDate:
          order.status === OrderStatus.READY_FOR_COLLECTION ? 'Ready now' : null,
      },
      {
        status: OrderStatus.COMPLETED,
        label: 'Collected',
        description: 'Your order has been collected. Thank you!',
        icon: CheckCircle,
        completed: order.status === OrderStatus.COMPLETED,
        active: false,
        date: order.status === OrderStatus.COMPLETED ? order.updatedAt : null,
        estimatedDate: null,
      },
    ];

    if (order.status === OrderStatus.CANCELLED) {
      steps.push({
        status: OrderStatus.CANCELLED,
        label: 'Cancelled',
        description: 'This order was cancelled',
        icon: XCircle,
        completed: true,
        date: order.updatedAt,
        estimatedDate: null,
      });
    }

    return steps;
  };

  const timelineSteps = getOrderTimeline();
  const progressPercentage = getProgressPercentage();

  // Mock activity log (would come from API)
  const activityLog = [
    { date: order.createdAt, action: 'Order placed', user: 'You' },
    ...(order.status !== OrderStatus.PENDING
      ? [{ date: order.updatedAt, action: `Order ${order.status}`, user: 'System' }]
      : []),
  ];

  const handleReorder = () => {
    // Reorder logic would go here
    navigate('/cart');
  };

  const handleCancelOrder = () => {
    const cancelCheck = assertCustomerCanCancelOrder(order.status);
    if (!cancelCheck.ok) {
      dispatch(showNotification({
        message: cancelCheck.message,
        type: 'error',
      }));
      return;
    }
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    if (!id) return;
    
    try {
      await cancelOrder({
        id,
        email: guestEmail,
      }).unwrap();
      
      dispatch(showNotification({
        message: 'Order cancelled successfully',
        type: 'success',
      }));
      
      setShowCancelModal(false);
      
      // Refetch order to get updated status
      if (isAdmin) {
        adminQueryResult.refetch();
      } else {
        userQueryResult.refetch();
      }
    } catch (error: any) {
      const errorInfo = getErrorInfo(error, 'Failed to cancel order');
      dispatch(showNotification({
        message: errorInfo.message,
        type: 'error',
      }));
    }
  };

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(order._id);
    dispatch(showNotification({
      message: 'Order ID copied to clipboard',
      type: 'success',
    }));
  };

  const handleStatusUpdateClick = () => {
    if (!selectedStatus) {
      dispatch(showNotification({
        message: 'Please select a status',
        type: 'warning',
      }));
      return;
    }
    if (selectedStatus === OrderStatus.CANCELLED && adminCancelReason.trim().length < 3) {
      dispatch(showNotification({
        message: 'Please enter a cancellation reason (at least 3 characters)',
        type: 'warning',
      }));
      return;
    }
    const transition = assertValidOrderStatusTransition(
      order.status,
      selectedStatus as OrderStatus,
      order.paymentStatus
    );
    if (!transition.ok) {
      dispatch(showNotification({
        message: transition.message,
        type: 'error',
      }));
      return;
    }
    setShowStatusUpdateModal(true);
  };

  const handleStatusUpdateConfirm = async () => {
    if (!selectedStatus || !id) return;

    if (selectedStatus === OrderStatus.CANCELLED && adminCancelReason.trim().length < 3) {
      dispatch(showNotification({
        message: 'Please enter a cancellation reason (at least 3 characters)',
        type: 'warning',
      }));
      return;
    }

    try {
      const result = await updateOrderStatus({
        id,
        status: selectedStatus as OrderStatus,
        cancelReason:
          selectedStatus === OrderStatus.CANCELLED
            ? adminCancelReason.trim()
            : undefined,
      }).unwrap();
      setShowStatusUpdateModal(false);
      setSelectedStatus('');
      setAdminCancelReason('');
      const successMessage =
        selectedStatus === OrderStatus.CANCELLED && result.message
          ? result.message
          : selectedStatus === OrderStatus.CANCELLED && result.refundPending
            ? 'Order cancelled. Refund will be processed within 3-5 business days.'
            : 'Order status updated successfully!';
      dispatch(showNotification({
        message: successMessage,
        type: 'success',
      }));
      await adminQueryResult.refetch();
    } catch (error: any) {
      setShowStatusUpdateModal(false);
      const errorInfo = getErrorInfo(error, 'Failed to update order status');
      dispatch(showNotification({
        message: errorInfo.message,
        type: 'error',
      }));
    }
  };

  // Check if order is eligible for return (within 30 days of collection)
  const isEligibleForReturn = () => {
    if (!order || order.status !== OrderStatus.COMPLETED) return false;
    const completedDate = new Date(order.updatedAt);
    const daysSinceCompletion = Math.floor((Date.now() - completedDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceCompletion <= 30;
  };

  // Active return (pending/approved) blocks a new request — cancelled/rejected do not
  const activeReturn = returnsData?.returns?.find((ret) => {
    if (!id) return false;
    const returnOrderId = typeof ret.order === 'object' ? ret.order._id : ret.order;
    return (
      String(returnOrderId) === String(id) &&
      (ret.status === 'pending' || ret.status === 'approved')
    );
  });
  const hasActiveReturn = Boolean(activeReturn);

  // Navigate to return request page
  const handleRequestReturn = () => {
    if (!id) return;
    // Email retrieved from sessionStorage in return page, not URL for privacy
    navigate(`/returns/new?orderId=${id}`);
  };

  const needsPayment =
    !isAdmin &&
    order.status !== OrderStatus.CANCELLED &&
    (order.paymentStatus === PaymentStatus.PENDING ||
      order.paymentStatus === PaymentStatus.FAILED);

  const customerCanCancel = !isAdmin && canCustomerCancelOrder(order.status);
  const customerCancelBlockedMessage = !isAdmin && !canCustomerCancelOrder(order.status)
    && order.status !== OrderStatus.CANCELLED
    && order.status !== OrderStatus.COMPLETED
    ? getCustomerCancelBlockMessage(order.status)
    : null;

  const handleCompletePayment = () => {
    const emailForPayment = isAuthenticated
      ? undefined
      : guestEmail || order.guestInfo?.email;
    void completePayment({
      orderId: order._id,
      guestEmail: emailForPayment,
      phoneNumber: order.guestInfo?.phone,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumbs */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Back Button */}
      <Button
        variant="ghost"
        size="small"
        onClick={() => navigate(isAdmin ? '/admin/orders' : '/orders')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Orders
      </Button>

      {/* Order Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 sm:mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <H1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Order #{order._id.slice(-8).toUpperCase()}
          </H1>
            <button
              onClick={handleCopyOrderId}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
              title="Copy Order ID"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-4 text-gray-600 flex-wrap">
            <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <Body className="text-sm">Placed on {formatDate(order.createdAt)}</Body>
            </div>
            {order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.CANCELLED && (
              <div className="flex items-center gap-2 text-teal-600">
                <Truck className="h-4 w-4" />
                <Body className="text-sm font-medium">Est. ready for pickup: {getEstimatedPickup()}</Body>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0 flex-wrap">
          <span
            className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium ${getStatusBadgeColor(
              order.status
            )}`}
          >
            {getStatusLabel(order.status)}
          </span>
          <span
            className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium ${getPaymentStatusBadgeColor(
              order.paymentStatus
            )}`}
          >
            Payment: {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
          </span>
        </div>
      </div>

      {needsPayment && (
        <Card variant="md" className="mb-6 border-amber-200 bg-amber-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Body className="font-medium text-amber-900 mb-1">Payment required</Body>
              <Body className="text-sm text-amber-800">
                This order is waiting for payment. Complete checkout with PayChangu to confirm your
                order.
              </Body>
            </div>
            <Button
              variant="primary"
              className="shrink-0 flex items-center justify-center"
              onClick={handleCompletePayment}
              disabled={isCompletingPayment}
            >
              {isCompletingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />
                  Redirecting...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Complete Payment
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Progress Bar */}
      {order.status !== OrderStatus.CANCELLED && (
        <Card variant="md" className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-2">
            <Body className="text-sm font-medium text-gray-700">Order Progress</Body>
            <Body className="text-sm font-bold text-teal-600">{progressPercentage}%</Body>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-teal-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Items - Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Timeline */}
          <Card variant="md">
            <H1 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Order Status</H1>
            <div className="space-y-4">
              {timelineSteps.map((step, index) => {
                const Icon = step.icon;
                const isLast = index === timelineSteps.length - 1;
                const isActive = step.active;
                const isCompleted = step.completed && !isActive;

                return (
                  <div key={step.status} className="flex gap-3 sm:gap-4">
                    {/* Timeline Line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 transition-all ${
                          isCompleted
                            ? 'bg-green-100 border-green-500 text-green-600'
                            : isActive
                            ? 'bg-blue-100 border-blue-500 text-blue-600 animate-pulse'
                            : 'bg-gray-100 border-gray-300 text-gray-400'
                        }`}
                      >
                        {isActive ? (
                          <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                        ) : (
                          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                        )}
                      </div>
                      {!isLast && (
                        <div
                          className={`w-0.5 h-12 sm:h-16 mt-2 transition-colors ${
                            isCompleted ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        />
                      )}
                    </div>

                    {/* Timeline Content */}
                    <div className="flex-1 pb-6 sm:pb-8 last:pb-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-1">
                        <H1
                            className={`text-base sm:text-lg font-semibold ${
                            isCompleted || isActive ? 'text-gray-900' : 'text-gray-500'
                          }`}
                        >
                          {step.label}
                        </H1>
                        {isCompleted && !isActive && (
                            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                          )}
                        </div>
                        {step.estimatedDate && (
                          <Body className="text-xs text-teal-600 font-medium whitespace-nowrap">
                            Est: {step.estimatedDate}
                          </Body>
                        )}
                      </div>
                      <Body
                        className={`text-sm ${
                          isCompleted || isActive ? 'text-gray-600' : 'text-gray-400'
                        }`}
                      >
                        {step.description}
                      </Body>
                      {step.date && (
                        <Body className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(step.date)}
                        </Body>
                      )}
                      {isActive && (
                        <Body className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          In progress...
                        </Body>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Activity Log */}
          <Card variant="md">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-teal-600" />
              <H1 className="text-lg sm:text-xl font-bold text-gray-900">Activity Log</H1>
            </div>
            <div className="space-y-3">
              {activityLog.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0" />
                  <div className="flex-1">
                    <Body className="text-sm font-medium text-gray-900">{activity.action}</Body>
                    <div className="flex items-center gap-2 mt-1">
                      <Body className="text-xs text-gray-500">{activity.user}</Body>
                      <span className="text-gray-300">•</span>
                      <Body className="text-xs text-gray-500">{formatDate(activity.date)}</Body>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Order Items */}
          <Card variant="md">
            <H1 className="text-xl font-bold text-gray-900 mb-6">Order Items</H1>
            <div className="space-y-4">
              {order.items.map((item, index) => {
                const product = item.product;
                const isProductDeleted = !product || !product.name;

                return (
                  <div
                    key={index}
                    className="flex items-start gap-4 pb-4 border-b border-gray-200 last:border-0 last:pb-0"
                  >
                    {product?.images && product.images.length > 0 ? (
                      <OptimizedImage
                        src={getProductImageUrl(product.images[0])}
                        blurDataUrl={getProductImageBlur(product.images[0])}
                        alt={product.name || 'Product'}
                        width={80}
                        height={80}
                        className="w-20 h-20 object-cover rounded-lg"
                        priority={false}
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Body className="font-semibold text-gray-900 mb-1">
                        {isProductDeleted ? (
                          <span className="text-gray-500 italic">Product no longer available</span>
                        ) : (
                          product.name
                        )}
                      </Body>
                      {isProductDeleted && (
                        <Body className="text-xs text-amber-600 mb-1">
                          This product has been removed from the catalog
                        </Body>
                      )}
                      <div className="flex items-center justify-between">
                        <Body className="text-sm text-gray-600">
                          Quantity: {item.quantity} × MWK {item.price.toLocaleString()}
                        </Body>
                        <Body className="font-semibold text-gray-900">
                          MWK {(item.price * item.quantity).toLocaleString()}
                        </Body>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Order Summary - Right Column (1/3 width) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Shipping Address */}
          <Card variant="md">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-teal-600" />
              <H1 className="text-lg font-bold text-gray-900">Shipping Address</H1>
            </div>
            <Body className="text-gray-700 whitespace-pre-line">
              {formatShippingAddress(order.shippingAddress)}
            </Body>
          </Card>

          {/* Payment Information */}
          <Card variant="md">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5 text-teal-600" />
              <H1 className="text-lg font-bold text-gray-900">Payment Information</H1>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Body className="text-gray-600">Payment Method:</Body>
                <Body className="font-medium text-gray-900">
                  {formatPaymentMethod(order.paymentMethod)}
                </Body>
              </div>
              <div className="flex justify-between">
                <Body className="text-gray-600">Payment Status:</Body>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getPaymentStatusBadgeColor(
                    order.paymentStatus
                  )}`}
                >
                  {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                </span>
              </div>
              {order.status === OrderStatus.CANCELLED && order.cancelReason ? (
                <div className="pt-2 border-t border-gray-100">
                  <Body className="text-gray-600 mb-1">Cancellation reason:</Body>
                  <Body className="text-gray-900 text-sm">{order.cancelReason}</Body>
                </div>
              ) : null}
            </div>
          </Card>

          {/* Order Summary */}
          <Card variant="md">
            <H1 className="text-lg font-bold text-gray-900 mb-4">Order Summary</H1>
            <div className="space-y-3">
              <div className="flex justify-between">
                <Body className="text-gray-600">Subtotal:</Body>
                <Body className="text-gray-900">
                  MWK {(order.totalAmount - (order.deliveryFee ?? 0) + (order.discount ?? 0)).toLocaleString()}
                </Body>
              </div>
              {(order.discount ?? 0) > 0 && (
                <div className="flex justify-between">
                  <Body className="text-gray-600">Discount:</Body>
                  <Body className="text-teal-600">-MWK {order.discount!.toLocaleString()}</Body>
                </div>
              )}
              <div className="flex justify-between">
                <Body className="text-gray-600">Shipping:</Body>
                <Body className="text-gray-900">MWK {(order.deliveryFee ?? 0).toLocaleString()}</Body>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between">
                  <Body className="text-lg font-bold text-gray-900">Total:</Body>
                  <Body className="text-lg font-bold text-teal-600">
                    MWK {order.totalAmount.toLocaleString()}
                  </Body>
                </div>
              </div>
            </div>
          </Card>

          {/* Admin: Update Order Status */}
          {isAdmin && (
            <Card variant="md">
              <H1 className="text-lg font-bold text-gray-900 mb-4">Update Order Status</H1>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Status: <span className="font-bold text-teal-600">{order.status.toUpperCase()}</span>
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      const next = e.target.value as OrderStatus | '';
                      setSelectedStatus(next);
                      if (next !== OrderStatus.CANCELLED) {
                        setAdminCancelReason('');
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    disabled={allowedNextOrderStatuses.length === 0}
                  >
                    <option value="">Select new status...</option>
                    {allowedNextOrderStatuses.map((status) => (
                      <option key={status} value={status}>
                        {getAdminStatusOptionLabel(status)}
                      </option>
                    ))}
                  </select>
                  {selectedStatus === OrderStatus.CANCELLED && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cancellation reason (required)
                      </label>
                      <Input
                        value={adminCancelReason}
                        onChange={(e) => setAdminCancelReason(e.target.value)}
                        placeholder="e.g. Customer request — duplicate order"
                        maxLength={500}
                      />
                      <Body className="text-xs text-gray-500 mt-1">
                        Saved on the order and shown on Admin Refunds for PayChangu processing.
                      </Body>
                    </div>
                  )}
                  {order.paymentStatus !== PaymentStatus.COMPLETED && (
                    <Body className="text-xs text-amber-800 mt-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                      Payment is not complete. You can cancel this order or wait until payment clears
                      before moving to Processing or any later pickup step.
                    </Body>
                  )}
                  {allowedNextOrderStatuses.length === 0 ? (
                    <Body className="text-xs text-gray-500 mt-2">
                      No further status changes are available for this order.
                    </Body>
                  ) : (
                    <Body className="text-xs text-gray-500 mt-2">
                      Advance one step at a time: Processing → Dispatched → Ready for collection →
                      Collected. Cancel is allowed until the order is collected.
                    </Body>
                  )}
                </div>
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleStatusUpdateClick}
                  disabled={
                    !selectedStatus ||
                    isUpdatingStatus ||
                    allowedNextOrderStatuses.length === 0 ||
                    (selectedStatus === OrderStatus.CANCELLED &&
                      adminCancelReason.trim().length < 3)
                  }
                >
                  {isUpdatingStatus ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Update Status
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          <Card variant="md">
            <H1 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</H1>
            <div className="space-y-2">
              {needsPayment && (
                <Button
                  variant="primary"
                  className="w-full flex items-center justify-center"
                  onClick={handleCompletePayment}
                  disabled={isCompletingPayment}
                >
                  {isCompletingPayment ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />
                      Redirecting...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Complete Payment
                    </>
                  )}
                </Button>
              )}
              {customerCanCancel && (
                <Button
                  variant="secondary"
                  className="w-full flex items-center justify-center"
                  onClick={handleCancelOrder}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Order
                    </>
                  )}
                </Button>
              )}
              {customerCancelBlockedMessage && (
                <Body className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  {customerCancelBlockedMessage}
                </Body>
              )}
              {order.status === OrderStatus.COMPLETED && isEligibleForReturn() && !hasActiveReturn && (
                <Button
                  variant="primary"
                  className="w-full flex items-center justify-center"
                  onClick={handleRequestReturn}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Request Return
                </Button>
              )}
              {hasActiveReturn && activeReturn && !isAdmin && (
                <Link
                  to={`/returns/${activeReturn._id}`}
                  className="block"
                >
                  <Button
                    variant="secondary"
                    className="w-full flex items-center justify-center"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    View Return Request
                  </Button>
                </Link>
              )}
              <Button
                variant="primary"
                className="w-full flex items-center justify-center"
                onClick={handleReorder}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reorder Items
              </Button>
            <Button
              variant="secondary"
                className="w-full flex items-center justify-center"
                onClick={() => {
                  // Contact support logic
                  window.location.href = 'mailto:support@autotek.mw?subject=Order ' + order._id.slice(-8).toUpperCase();
                }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
              <Button
                variant="ghost"
              className="w-full flex items-center justify-center"
              disabled
            >
              <FileText className="h-4 w-4 mr-2" />
              Download Invoice
            </Button>
            <Body className="text-xs text-gray-500 text-center mt-2">
              Invoice generation coming soon
            </Body>
            </div>
          </Card>
        </div>
      </div>

      {/* Cancel Order Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelConfirm}
        title="Cancel Order"
        message="Are you sure you want to cancel this order? This action cannot be undone."
        confirmText="Cancel Order"
        cancelText="Keep Order"
        variant="warning"
        isLoading={isCancelling}
      />

      {/* Update Status Confirmation Modal */}
      <ConfirmationModal
        isOpen={showStatusUpdateModal}
        onClose={() => setShowStatusUpdateModal(false)}
        onConfirm={handleStatusUpdateConfirm}
        title={selectedStatus === OrderStatus.CANCELLED ? 'Cancel Order' : 'Update Order Status'}
        message={
          selectedStatus === OrderStatus.CANCELLED
            ? `Cancel this order for reason: "${adminCancelReason.trim()}"? If paid, a refund will be queued (3–5 business days) and stock restored.`
            : `Are you sure you want to change the order status from "${getStatusLabel(order.status)}" to "${selectedStatus ? getStatusLabel(selectedStatus as OrderStatus) : ''}"?`
        }
        confirmText={selectedStatus === OrderStatus.CANCELLED ? 'Cancel Order' : 'Update Status'}
        cancelText="Back"
        variant={selectedStatus === OrderStatus.CANCELLED ? 'warning' : 'info'}
        isLoading={isUpdatingStatus}
      />
    </div>
  );
};
