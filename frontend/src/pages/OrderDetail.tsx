import { useParams, useNavigate, Link } from 'react-router-dom';
import { useGetOrderQuery } from '../store/api/orderApi';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { H1, Body } from '../components/ui/Typography';
import { Breadcrumb } from '../components/Breadcrumb';
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
} from 'lucide-react';
import { OrderStatus, PaymentStatus } from '@shared/types';

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

export const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useGetOrderQuery(id!);

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
          <Button variant="secondary" onClick={() => navigate('/orders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
        </Card>
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
        return 25;
      case OrderStatus.PROCESSING:
        return 60;
      case OrderStatus.COMPLETED:
        return 100;
      case OrderStatus.CANCELLED:
        return 0;
      default:
        return 0;
    }
  };

  // Calculate estimated delivery date
  const getEstimatedDelivery = () => {
    if (order.status === OrderStatus.COMPLETED) {
      return 'Delivered';
    }
    const days = order.status === OrderStatus.PROCESSING ? 2 : 5;
    const date = new Date(order.createdAt);
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Order timeline steps with enhanced information
  const getOrderTimeline = () => {
    const steps = [
      {
        status: OrderStatus.PENDING,
        label: 'Order Placed',
        description: 'Your order has been received and confirmed',
        icon: Package,
        completed: true,
        date: order.createdAt,
        estimatedDate: null,
      },
      {
        status: OrderStatus.PROCESSING,
        label: 'Processing',
        description: 'Your order is being prepared for shipment',
        icon: Loader2,
        completed: order.status === OrderStatus.PROCESSING || order.status === OrderStatus.COMPLETED,
        active: order.status === OrderStatus.PROCESSING,
        date: order.status !== OrderStatus.PENDING ? order.updatedAt : null,
        estimatedDate: order.status === OrderStatus.PROCESSING ? getEstimatedDelivery() : null,
      },
      {
        status: OrderStatus.COMPLETED,
        label: 'Completed',
        description: 'Your order has been delivered',
        icon: CheckCircle,
        completed: order.status === OrderStatus.COMPLETED,
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
    // Cancel order logic would go here
    if (window.confirm('Are you sure you want to cancel this order?')) {
      // Cancel order API call
    }
  };

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(order._id);
    // Show toast notification
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumbs */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Back Button */}
      <Button
        variant="ghost"
        size="small"
        onClick={() => navigate('/orders')}
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
                <Body className="text-sm font-medium">Est. delivery: {getEstimatedDelivery()}</Body>
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
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
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
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 pb-4 border-b border-gray-200 last:border-0 last:pb-0"
                >
                  {item.product.images && item.product.images.length > 0 ? (
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Body className="font-semibold text-gray-900 mb-1">
                      {item.product.name}
                    </Body>
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
              ))}
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
            <Body className="text-gray-700 whitespace-pre-line">{order.shippingAddress}</Body>
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
            </div>
          </Card>

          {/* Order Summary */}
          <Card variant="md">
            <H1 className="text-lg font-bold text-gray-900 mb-4">Order Summary</H1>
            <div className="space-y-3">
              <div className="flex justify-between">
                <Body className="text-gray-600">Subtotal:</Body>
                <Body className="text-gray-900">MWK {order.totalAmount.toLocaleString()}</Body>
              </div>
              <div className="flex justify-between">
                <Body className="text-gray-600">Shipping:</Body>
                <Body className="text-gray-900">MWK 0</Body>
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

          {/* Quick Actions */}
          <Card variant="md">
            <H1 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</H1>
            <div className="space-y-2">
              {order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.COMPLETED && (
                <Button
                  variant="secondary"
                  className="w-full flex items-center justify-center"
                  onClick={handleCancelOrder}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Order
                </Button>
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
    </div>
  );
};
