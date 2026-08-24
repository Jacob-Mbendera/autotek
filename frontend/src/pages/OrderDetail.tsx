import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useGetOrderQuery, useCancelOrderMutation } from '../store/api/orderApi';
import type { ShippingAddress } from '../store/api/orderApi';
import { useGetReturnsQuery } from '../store/api/returnApi';
import { useAppSelector, useAppDispatch } from '../store/types';
import { Breadcrumb } from '../components/Breadcrumb';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { getPrimaryProductImage, getProductImageBlur, getProductImageUrl } from '../utils/productImage';
import { useCompleteOrderPayment } from '../hooks/useCompleteOrderPayment';
import { useCart } from '../hooks/useCart';
import { JournalCard, JournalButton, PageHeading, CardHeading, JournalBody } from '../components/journal';
import { cn } from '../utils/cn';
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
  TrendingUp,
  History,
  Copy,
  RefreshCw,
  Store,
} from 'lucide-react';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@shared/types';
import {
  assertCustomerCanCancelOrder,
  canCustomerCancelOrder,
  getCustomerCancelBlockMessage,
  getOrderStatusLabel,
} from '@shared/utils/orderStatusTransitions';

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

// Helper function to get status badge colors
const getStatusBadgeColor = (status: OrderStatus) => {
  switch (status) {
    case 'pending':
      return 'bg-journal-warn-bg text-journal-warn-text';
    case 'cancelled':
      return 'bg-journal-danger-bg text-journal-danger-text';
    default:
      return 'bg-journal-teal-tint text-journal-teal';
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
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [showCancelModal, setShowCancelModal] = useState(false);

  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { addItem: addCartItem } = useCart();

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
      skip: !id,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true,
      pollingInterval: 45000,
    }
  );

  const orderQueryArg = {
    id: id || '',
    email: guestEmail && !isAuthenticated ? guestEmail : undefined,
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

  const orderQuery = useGetOrderQuery(orderQueryArg, {
    skip: !id,
    ...customerOrderQueryOpts,
  });

  useEffect(() => {
    const status = orderQuery.data?.order?.status;
    const needPoll = status != null && ACTIVE_ORDER_STATUSES.includes(status);
    const next = needPoll ? 30000 : 0;
    if (customerPollTargetRef.current !== next) {
      customerPollTargetRef.current = next;
      setCustomerOrderPollMs(next);
    }
  }, [orderQuery.data?.order?.status]);

  const data = orderQuery.data;
  const isLoading = orderQuery.isLoading;
  const error = orderQuery.error;

  // Order cancellation mutation
  const [cancelOrder, { isLoading: isCancelling }] = useCancelOrderMutation();
  const { completePayment, isCompletingPayment } = useCompleteOrderPayment();

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-journal-teal animate-spin mx-auto mb-4" />
          <JournalBody className="!text-journal-muted">Loading order details...</JournalBody>
        </div>
      </div>
    );
  }

  if (error || !data?.order) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <JournalCard className="text-center py-10">
          <JournalBody className="!text-journal-danger-text mb-4">Order not found.</JournalBody>
          <JournalButton variant="secondary" onClick={() => navigate('/orders')} className="mx-auto">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to orders
          </JournalButton>
        </JournalCard>
      </div>
    );
  }

  const order = data.order;

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Orders', href: '/orders' },
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
        active: false,
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

  const handleReorder = async () => {
    const availableItems = order.items.filter((item) => item.product !== null);

    if (availableItems.length === 0) {
      dispatch(showNotification({
        message: 'These items are no longer available to reorder.',
        type: 'error',
      }));
      return;
    }

    for (const item of availableItems) {
      // Safe: filtered to non-null products above.
      const product = item.product as NonNullable<typeof item.product>;
      await addCartItem({
        productId: product._id,
        productName: product.name,
        price: item.price,
        quantity: item.quantity,
        image: getProductImageUrl(getPrimaryProductImage(product.images)),
      });
    }

    if (availableItems.length < order.items.length) {
      dispatch(showNotification({
        message: 'Some items in this order are no longer available and were skipped.',
        type: 'warning',
      }));
    } else {
      dispatch(showNotification({
        message: 'Items added to your cart.',
        type: 'success',
      }));
    }

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
      orderQuery.refetch();
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

  const isBankTransfer = order.paymentMethod === PaymentMethod.BANK_TRANSFER;

  const needsPayment =
    !isBankTransfer &&
    order.status !== OrderStatus.CANCELLED &&
    (order.paymentStatus === PaymentStatus.PENDING ||
      order.paymentStatus === PaymentStatus.FAILED);

  const awaitingBankTransferVerification =
    isBankTransfer &&
    order.status !== OrderStatus.CANCELLED &&
    order.paymentStatus === PaymentStatus.PENDING;

  const bankTransferRejected =
    isBankTransfer &&
    order.status !== OrderStatus.CANCELLED &&
    order.paymentStatus === PaymentStatus.FAILED;

  const customerCanCancel = canCustomerCancelOrder(order.status);
  const customerCancelBlockedMessage = !canCustomerCancelOrder(order.status)
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
      <button
        onClick={() => navigate('/orders')}
        className="inline-flex items-center gap-1.5 text-[12px] font-sans font-semibold tracking-[0.08em] uppercase text-journal-teal hover:underline mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to orders
      </button>

      {/* Order Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 sm:mb-8 gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <PageHeading className="!text-[26px] sm:!text-[32px]">
              Order #{order._id.slice(-8).toUpperCase()}
            </PageHeading>
            <button
              onClick={handleCopyOrderId}
              className="p-1.5 text-journal-faint hover:text-journal-body transition-colors"
              title="Copy Order ID"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-4 text-journal-muted flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-[13px] font-sans">Placed on {formatDate(order.createdAt)}</span>
            </div>
            {order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.CANCELLED && (
              <div className="flex items-center gap-2 text-journal-teal">
                <Truck className="h-3.5 w-3.5" />
                <span className="text-[13px] font-sans font-medium">Est. ready for pickup: {getEstimatedPickup()}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('px-3 py-1.5 rounded-full text-[12px] font-sans font-medium', getStatusBadgeColor(order.status))}>
            {getStatusLabel(order.status)}
          </span>
          <span className={cn('px-3 py-1.5 rounded-full text-[12px] font-sans font-medium', getPaymentStatusBadgeColor(order.paymentStatus))}>
            Payment: {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
          </span>
        </div>
      </div>

      {needsPayment && (
        <JournalCard className="mb-6 bg-journal-warn-bg border-journal-warn-bg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-sans font-medium text-[14px] text-journal-warn-text mb-1">Payment required</p>
              <p className="text-[13px] font-sans text-journal-warn-text">
                This order is waiting for payment. Complete checkout with PayChangu to confirm your
                order.
              </p>
            </div>
            <JournalButton
              variant="primary"
              className="shrink-0"
              onClick={handleCompletePayment}
              disabled={isCompletingPayment}
            >
              {isCompletingPayment ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Redirecting...
                </>
              ) : (
                <>
                  <CreditCard className="h-3.5 w-3.5" />
                  Complete payment
                </>
              )}
            </JournalButton>
          </div>
        </JournalCard>
      )}

      {awaitingBankTransferVerification && (
        <JournalCard className="mb-6 bg-journal-warn-bg border-journal-warn-bg">
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-journal-warn-text mt-0.5 shrink-0" aria-hidden />
            <div>
              <p className="font-sans font-medium text-[14px] text-journal-warn-text mb-1">
                Verifying your payment
              </p>
              <p className="text-[13px] font-sans text-journal-warn-text">
                We've received your proof of payment and our team is manually verifying the bank
                transfer. Your order will be processed once this is confirmed.
              </p>
            </div>
          </div>
        </JournalCard>
      )}

      {bankTransferRejected && (
        <JournalCard className="mb-6 bg-journal-warn-bg border-journal-warn-bg">
          <div className="flex items-start gap-3">
            <XCircle className="h-4 w-4 text-journal-warn-text mt-0.5 shrink-0" aria-hidden />
            <div>
              <p className="font-sans font-medium text-[14px] text-journal-warn-text mb-1">
                Payment not verified
              </p>
              <p className="text-[13px] font-sans text-journal-warn-text">
                {order.paymentRejectionReason
                  ? `We couldn't verify your bank transfer: ${order.paymentRejectionReason}`
                  : "We couldn't verify your bank transfer."}{' '}
                Please contact support if you believe this is a mistake.
              </p>
            </div>
          </div>
        </JournalCard>
      )}

      {/* Progress Bar */}
      {order.status !== OrderStatus.CANCELLED && (
        <JournalCard className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-sans font-medium text-journal-body">Order progress</span>
            <span className="text-[13px] font-sans font-bold text-journal-teal">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-journal-hairline rounded-full h-2">
            <div
              className="bg-journal-teal h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </JournalCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Items - Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Timeline */}
          <JournalCard>
            <CardHeading className="!text-[19px] mb-6">Order status</CardHeading>
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
                        className={cn(
                          'flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border transition-colors',
                          isCompleted
                            ? 'bg-journal-teal-tint border-journal-teal-tint-border text-journal-teal'
                            : isActive
                            ? 'bg-journal-sand border-journal-ink text-journal-ink'
                            : 'bg-journal-sand border-journal-hairline text-journal-faint'
                        )}
                      >
                        {isActive ? (
                          <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                        ) : (
                          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </div>
                      {!isLast && (
                        <div
                          className={cn(
                            'w-px h-12 sm:h-16 mt-2 transition-colors',
                            isCompleted ? 'bg-journal-teal' : 'bg-journal-hairline'
                          )}
                        />
                      )}
                    </div>

                    {/* Timeline Content */}
                    <div className="flex-1 pb-6 sm:pb-8 last:pb-0">
                      <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                        <div className="flex items-center gap-2 flex-1">
                          <h3 className={cn(
                            'font-sans font-semibold text-[14px] sm:text-[15px]',
                            isCompleted || isActive ? 'text-journal-ink' : 'text-journal-faint'
                          )}>
                            {step.label}
                          </h3>
                          {isCompleted && !isActive && (
                            <CheckCircle className="h-4 w-4 text-journal-teal flex-shrink-0" />
                          )}
                        </div>
                        {step.estimatedDate && (
                          <span className="text-[11px] font-sans text-journal-teal font-medium whitespace-nowrap">
                            Est: {step.estimatedDate}
                          </span>
                        )}
                      </div>
                      <p className={cn(
                        'text-[13px] font-sans',
                        isCompleted || isActive ? 'text-journal-muted' : 'text-journal-faint'
                      )}>
                        {step.description}
                      </p>
                      {step.date && (
                        <p className="text-[11px] font-sans text-journal-faint mt-1 flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {formatDate(step.date)}
                        </p>
                      )}
                      {isActive && (
                        <p className="text-[11px] font-sans text-journal-ink mt-1 flex items-center gap-1.5">
                          <TrendingUp className="h-3 w-3" />
                          In progress...
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </JournalCard>

          {/* Activity Log */}
          <JournalCard>
            <div className="flex items-center gap-2 mb-4">
              <History className="h-4 w-4 text-journal-teal" />
              <CardHeading className="!text-[19px]">Activity log</CardHeading>
            </div>
            <div className="space-y-3">
              {activityLog.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 pb-3 border-b border-journal-hairline last:border-0 last:pb-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-journal-teal mt-1.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-[13px] font-sans font-medium text-journal-ink">{activity.action}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-sans text-journal-faint">{activity.user}</span>
                      <span className="text-journal-hairline">&#183;</span>
                      <span className="text-[11px] font-sans text-journal-faint">{formatDate(activity.date)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </JournalCard>

          {/* Order Items */}
          <JournalCard>
            <CardHeading className="!text-[19px] mb-6">Order items</CardHeading>
            <div className="space-y-4">
              {order.items.map((item, index) => {
                const product = item.product;
                const isProductDeleted = !product || !product.name;

                return (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 pb-4 border-b border-journal-hairline last:border-0 last:pb-0"
                  >
                    {product?.images && product.images.length > 0 ? (
                      <OptimizedImage
                        src={getProductImageUrl(product.images[0])}
                        blurDataUrl={getProductImageBlur(product.images[0])}
                        alt={product.name || 'Product'}
                        width={80}
                        height={80}
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-journal flex-shrink-0"
                        priority={false}
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-journal-sand rounded-journal flex items-center justify-center flex-shrink-0">
                        <Package className="h-6 w-6 text-journal-faint" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 w-full">
                      <p className="font-sans font-semibold text-[14px] text-journal-ink mb-1">
                        {isProductDeleted ? (
                          <span className="text-journal-faint italic">Product no longer available</span>
                        ) : (
                          product.name
                        )}
                      </p>
                      {isProductDeleted && (
                        <p className="text-[11px] font-sans text-journal-warn-text mb-1">
                          This product has been removed from the catalog
                        </p>
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-1">
                        <p className="text-[13px] font-sans text-journal-muted">
                          Quantity: {item.quantity} × MWK {item.price.toLocaleString()}
                        </p>
                        <p className="font-sans font-semibold text-[13px] text-journal-ink">
                          MWK {(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </JournalCard>
        </div>

        {/* Order Summary - Right Column (1/3 width) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Shipping Address */}
          <JournalCard>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-4 w-4 text-journal-teal" />
              <CardHeading className="!text-[17px]">Shipping address</CardHeading>
            </div>
            <JournalBody className="whitespace-pre-line">
              {formatShippingAddress(order.shippingAddress)}
            </JournalBody>
          </JournalCard>

          {/* Payment Information */}
          <JournalCard>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-4 w-4 text-journal-teal" />
              <CardHeading className="!text-[17px]">Payment information</CardHeading>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[13px] font-sans">
                <span className="text-journal-muted">Payment method:</span>
                <span className="font-medium text-journal-ink">
                  {formatPaymentMethod(order.paymentMethod)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[13px] font-sans">
                <span className="text-journal-muted">Payment status:</span>
                <span className={cn('px-2 py-1 rounded text-[11px] font-medium', getPaymentStatusBadgeColor(order.paymentStatus))}>
                  {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                </span>
              </div>
              {order.status === OrderStatus.CANCELLED && order.cancelReason ? (
                <div className="pt-2 border-t border-journal-hairline">
                  <p className="text-journal-muted text-[12px] font-sans mb-1">Cancellation reason:</p>
                  <p className="text-journal-ink text-[13px] font-sans">{order.cancelReason}</p>
                </div>
              ) : null}
            </div>
          </JournalCard>

          {/* Order Summary */}
          <JournalCard>
            <CardHeading className="!text-[17px] mb-4">Order summary</CardHeading>
            <div className="space-y-3">
              <div className="flex justify-between text-[13px] font-sans">
                <span className="text-journal-muted">Subtotal:</span>
                <span className="text-journal-ink">
                  MWK {(order.totalAmount - (order.deliveryFee ?? 0) + (order.discount ?? 0)).toLocaleString()}
                </span>
              </div>
              {(order.discount ?? 0) > 0 && (
                <div className="flex justify-between text-[13px] font-sans">
                  <span className="text-journal-muted">Discount:</span>
                  <span className="text-journal-teal">-MWK {order.discount!.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-[13px] font-sans">
                <span className="text-journal-muted">Delivery fee:</span>
                <span className="text-journal-ink">MWK {(order.deliveryFee ?? 0).toLocaleString()}</span>
              </div>
              <div className="border-t border-journal-hairline pt-3">
                <div className="flex justify-between items-baseline">
                  <span className="font-sans font-semibold text-[15px] text-journal-ink">Total:</span>
                  <span className="font-journal text-[22px] text-journal-ink">
                    MWK {order.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </JournalCard>

          {/* Quick Actions */}
          <JournalCard>
            <CardHeading className="!text-[17px] mb-4">Quick actions</CardHeading>
            <div className="space-y-2">
              {needsPayment && (
                <JournalButton
                  variant="primary"
                  className="w-full"
                  onClick={handleCompletePayment}
                  disabled={isCompletingPayment}
                >
                  {isCompletingPayment ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      Redirecting...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-3.5 w-3.5" />
                      Complete payment
                    </>
                  )}
                </JournalButton>
              )}
              {customerCanCancel && (
                <JournalButton
                  variant="secondary"
                  className="w-full"
                  onClick={handleCancelOrder}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel order
                    </>
                  )}
                </JournalButton>
              )}
              {customerCancelBlockedMessage && (
                <p className="text-[12px] font-sans text-journal-warn-text bg-journal-warn-bg rounded-journal px-3 py-2">
                  {customerCancelBlockedMessage}
                </p>
              )}
              {order.status === OrderStatus.COMPLETED && isEligibleForReturn() && !hasActiveReturn && (
                <JournalButton
                  variant="primary"
                  className="w-full"
                  onClick={handleRequestReturn}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Request return
                </JournalButton>
              )}
              {hasActiveReturn && activeReturn && (
                <Link to={`/returns/${activeReturn._id}`} className="block">
                  <JournalButton variant="secondary" className="w-full">
                    <RefreshCw className="h-3.5 w-3.5" />
                    View return request
                  </JournalButton>
                </Link>
              )}
              <JournalButton
                variant="primary"
                className="w-full"
                onClick={handleReorder}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reorder items
              </JournalButton>
              <JournalButton
                variant="secondary"
                className="w-full"
                onClick={() => {
                  window.location.href = 'mailto:support@autotek.mw?subject=Order ' + order._id.slice(-8).toUpperCase();
                }}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Contact support
              </JournalButton>
              <button
                disabled
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-journal-hairline text-journal-faint font-sans font-medium text-[11px] tracking-[0.1em] uppercase cursor-not-allowed"
              >
                <FileText className="h-3.5 w-3.5" />
                Download invoice
              </button>
              <p className="text-[11px] font-sans text-journal-faint text-center mt-2">
                Invoice generation coming soon
              </p>
            </div>
          </JournalCard>
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
    </div>
  );
};
