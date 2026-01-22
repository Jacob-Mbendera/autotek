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
} from 'lucide-react';
import { OrderStatus, PaymentStatus } from '../../../../shared/types';

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

  // Order timeline steps
  const getOrderTimeline = () => {
    const steps = [
      {
        status: OrderStatus.PENDING,
        label: 'Order Placed',
        description: 'Your order has been received',
        icon: Package,
        completed: true,
      },
      {
        status: OrderStatus.PROCESSING,
        label: 'Processing',
        description: 'Your order is being prepared',
        icon: Loader2,
        completed: order.status === OrderStatus.PROCESSING || order.status === OrderStatus.COMPLETED,
        active: order.status === OrderStatus.PROCESSING,
      },
      {
        status: OrderStatus.COMPLETED,
        label: 'Completed',
        description: 'Your order has been delivered',
        icon: CheckCircle,
        completed: order.status === OrderStatus.COMPLETED,
      },
    ];

    if (order.status === OrderStatus.CANCELLED) {
      steps.push({
        status: OrderStatus.CANCELLED,
        label: 'Cancelled',
        description: 'This order was cancelled',
        icon: XCircle,
        completed: true,
      });
    }

    return steps;
  };

  const timelineSteps = getOrderTimeline();

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <H1 className="text-3xl font-bold text-gray-900 mb-2">
            Order #{order._id.slice(-8).toUpperCase()}
          </H1>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <Body className="text-sm">Placed on {formatDate(order.createdAt)}</Body>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <span
            className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusBadgeColor(
              order.status
            )}`}
          >
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
          <span
            className={`px-4 py-2 rounded-full text-sm font-medium ${getPaymentStatusBadgeColor(
              order.paymentStatus
            )}`}
          >
            Payment: {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Items - Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Timeline */}
          <Card variant="md">
            <H1 className="text-xl font-bold text-gray-900 mb-6">Order Status</H1>
            <div className="space-y-4">
              {timelineSteps.map((step, index) => {
                const Icon = step.icon;
                const isLast = index === timelineSteps.length - 1;
                const isActive = step.active;
                const isCompleted = step.completed && !isActive;

                return (
                  <div key={step.status} className="flex gap-4">
                    {/* Timeline Line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                          isCompleted
                            ? 'bg-green-100 border-green-500 text-green-600'
                            : isActive
                            ? 'bg-blue-100 border-blue-500 text-blue-600 animate-pulse'
                            : 'bg-gray-100 border-gray-300 text-gray-400'
                        }`}
                      >
                        {isActive ? (
                          <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                          <Icon className="h-6 w-6" />
                        )}
                      </div>
                      {!isLast && (
                        <div
                          className={`w-0.5 h-16 mt-2 ${
                            isCompleted ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        />
                      )}
                    </div>

                    {/* Timeline Content */}
                    <div className="flex-1 pb-8 last:pb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <H1
                          className={`text-lg font-semibold ${
                            isCompleted || isActive ? 'text-gray-900' : 'text-gray-500'
                          }`}
                        >
                          {step.label}
                        </H1>
                        {isCompleted && !isActive && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                      <Body
                        className={`text-sm ${
                          isCompleted || isActive ? 'text-gray-600' : 'text-gray-400'
                        }`}
                      >
                        {step.description}
                      </Body>
                      {isActive && (
                        <Body className="text-xs text-blue-600 mt-1">
                          In progress...
                        </Body>
                      )}
                    </div>
                  </div>
                );
              })}
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

          {/* Actions */}
          <Card variant="md">
            <Button
              variant="secondary"
              className="w-full flex items-center justify-center"
              disabled
            >
              <FileText className="h-4 w-4 mr-2" />
              Download Invoice
            </Button>
            <Body className="text-xs text-gray-500 text-center mt-2">
              Invoice generation coming soon
            </Body>
          </Card>
        </div>
      </div>
    </div>
  );
};
