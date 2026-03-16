import { useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useGetReturnQuery, useCancelReturnMutation } from '../store/api/returnApi';
import { useAppSelector, useAppDispatch } from '../store/types';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { H1, H2, Body } from '../components/ui/Typography';
import { Breadcrumb } from '../components/Breadcrumb';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import {
  ArrowLeft,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
  Image as ImageIcon,
  Calendar,
  DollarSign,
  CreditCard,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { ReturnStatus, RefundStatus } from '@shared/types';
import { format } from 'date-fns';

const getStatusBadgeColor = (status: ReturnStatus) => {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'approved':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'rejected':
      return 'bg-red-100 text-red-700 border-red-300';
    case 'completed':
      return 'bg-green-100 text-green-700 border-green-300';
    case 'cancelled':
      return 'bg-gray-100 text-gray-700 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

const getRefundStatusBadgeColor = (status: RefundStatus) => {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-700';
    case 'processing':
      return 'bg-blue-100 text-blue-700';
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'failed':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const getStatusIcon = (status: ReturnStatus) => {
  switch (status) {
    case 'pending':
      return Clock;
    case 'approved':
      return CheckCircle;
    case 'rejected':
      return XCircle;
    case 'completed':
      return CheckCircle;
    case 'cancelled':
      return XCircle;
    default:
      return AlertCircle;
  }
};

export const ReturnDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const { data, isLoading, error } = useGetReturnQuery(
    id ? { id, email: email || undefined } : { id: '', email: undefined },
    { skip: !id }
  );

  const [cancelReturn, { isLoading: isCancelling }] = useCancelReturnMutation();
  const [showCancelModal, setShowCancelModal] = useState(false);

  const returnDoc = data?.return;

  const handleCancel = async () => {
    if (!id) return;

    try {
      await cancelReturn({
        id,
        email: email || undefined,
      }).unwrap();

      dispatch(showNotification({
        message: 'Return cancelled successfully',
        type: 'success',
      }));

      setShowCancelModal(false);
    } catch (error: any) {
      const errorInfo = getErrorInfo(error, 'Failed to cancel return');
      dispatch(showNotification({
        message: errorInfo.message,
        type: 'error',
      }));
    }
  };

  const getTimelineSteps = () => {
    if (!returnDoc) return [];

    const steps = [];

    // Pending
    steps.push({
      status: 'pending',
      label: 'Return Requested',
      description: 'Your return request has been submitted',
      icon: Clock,
      completed: true,
      active: returnDoc.status === 'pending',
      date: returnDoc.createdAt,
    });

    // Approved or Rejected
    if (returnDoc.status === 'approved' || returnDoc.status === 'rejected' || returnDoc.status === 'completed') {
      steps.push({
        status: returnDoc.status,
        label: returnDoc.status === 'approved' ? 'Return Approved' : 'Return Rejected',
        description: returnDoc.status === 'approved'
          ? 'Your return has been approved. Please ship the items back.'
          : 'Your return request was rejected.',
        icon: returnDoc.status === 'approved' ? CheckCircle : XCircle,
        completed: true,
        active: returnDoc.status === 'approved' || returnDoc.status === 'rejected',
        date: returnDoc.updatedAt,
      });
    }

    // Completed
    if (returnDoc.status === 'completed') {
      steps.push({
        status: 'completed',
        label: 'Refund Processed',
        description: 'Your refund has been processed',
        icon: CheckCircle,
        completed: true,
        active: false,
        date: returnDoc.updatedAt,
      });
    }

    return steps;
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      </div>
    );
  }

  if (error || !returnDoc) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <H2>Return Not Found</H2>
          <Body className="mt-2 text-gray-600">The return you're looking for doesn't exist or you don't have access to it.</Body>
          <Link to="/returns">
            <Button className="mt-4">View Returns</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const timelineSteps = getTimelineSteps();
  const StatusIcon = getStatusIcon(returnDoc.status);
  const orderId = typeof returnDoc.order === 'object' ? returnDoc.order._id : returnDoc.order;
  const orderLink = isAuthenticated
    ? `/orders/${orderId}`
    : `/orders/${orderId}?email=${encodeURIComponent(email || '')}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Returns', href: '/returns' },
          { label: `Return #${returnDoc._id.slice(-8).toUpperCase()}`, href: '#' },
        ]}
      />

      <div className="mt-6">
        <Link to="/returns" className="inline-flex items-center text-teal-600 hover:text-teal-700 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Returns
        </Link>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <H1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Return #{returnDoc._id.slice(-8).toUpperCase()}
            </H1>
            <div className="flex items-center gap-4 mt-2 text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <Body className="text-sm">Requested on {format(new Date(returnDoc.createdAt), 'MMM dd, yyyy')}</Body>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusBadgeColor(returnDoc.status)}`}>
              <StatusIcon className="h-4 w-4 inline mr-2" />
              {returnDoc.status.charAt(0).toUpperCase() + returnDoc.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Timeline */}
          <Card className="p-6">
            <H2 className="mb-4">Return Status</H2>
            <div className="space-y-4">
              {timelineSteps.map((step, index) => {
                const Icon = step.icon;
                const isLast = index === timelineSteps.length - 1;

                return (
                  <div key={step.status} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                          step.completed
                            ? 'bg-teal-600 border-teal-600 text-white'
                            : step.active
                            ? 'bg-teal-100 border-teal-600 text-teal-600'
                            : 'bg-gray-100 border-gray-300 text-gray-400'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      {!isLast && (
                        <div
                          className={`w-0.5 h-12 ${
                            step.completed ? 'bg-teal-600' : 'bg-gray-300'
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <Body className="font-medium text-gray-900">{step.label}</Body>
                      <Body className="text-sm text-gray-600 mt-1">{step.description}</Body>
                      {step.date && (
                        <Body className="text-xs text-gray-500 mt-1">
                          {format(new Date(step.date), 'MMM dd, yyyy HH:mm')}
                        </Body>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Return Items */}
          <Card className="p-6">
            <H2 className="mb-4">Items Being Returned</H2>
            <div className="space-y-4">
              {returnDoc.items.map((item, index) => (
                <div key={index} className="flex items-start space-x-4 pb-4 border-b border-gray-200 last:border-0">
                  <img
                    src={item.product?.images?.[0] || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=100&q=80'}
                    alt={item.product?.name || 'Product'}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <Body className="font-medium">{item.product?.name || 'Product'}</Body>
                    <Body className="text-sm text-gray-600 mt-1">
                      Quantity: {item.quantity}
                    </Body>
                    <Body className="text-sm text-gray-600 mt-1">
                      Reason: {item.reason}
                    </Body>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Images */}
          {returnDoc.images && returnDoc.images.length > 0 && (
            <Card className="p-6">
              <H2 className="mb-4">Uploaded Photos</H2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {returnDoc.images.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={image}
                      alt={`Return photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Admin Notes */}
          {returnDoc.adminNotes && (
            <Card className="p-6 bg-amber-50 border-amber-200">
              <H2 className="mb-2 text-amber-900">Admin Notes</H2>
              <Body className="text-amber-800">{returnDoc.adminNotes}</Body>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Return Information */}
          <Card className="p-6">
            <H2 className="mb-4">Return Information</H2>
            <div className="space-y-4">
              <div>
                <Body className="text-sm text-gray-600">Return Reason</Body>
                <Body className="font-medium mt-1">
                  {returnDoc.returnReason.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </Body>
              </div>
              {returnDoc.comments && (
                <div>
                  <Body className="text-sm text-gray-600">Comments</Body>
                  <Body className="mt-1">{returnDoc.comments}</Body>
                </div>
              )}
              <div>
                <Body className="text-sm text-gray-600">Refund Method</Body>
                <Body className="font-medium mt-1">
                  {returnDoc.refundMethod === 'original-payment' ? 'Original Payment Method' : 'Store Credit'}
                </Body>
              </div>
              <div>
                <Link to={orderLink} className="text-teal-600 hover:text-teal-700 text-sm font-medium">
                  View Original Order →
                </Link>
              </div>
            </div>
          </Card>

          {/* Refund Information */}
          <Card className="p-6">
            <H2 className="mb-4">Refund Information</H2>
            <div className="space-y-4">
              <div>
                <Body className="text-sm text-gray-600">Refund Amount</Body>
                <Body className="text-2xl font-bold text-teal-600 mt-1">
                  MWK {returnDoc.refundAmount.toLocaleString()}
                </Body>
              </div>
              <div>
                <Body className="text-sm text-gray-600">Refund Status</Body>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-1 ${getRefundStatusBadgeColor(returnDoc.refundStatus)}`}>
                  {returnDoc.refundStatus.charAt(0).toUpperCase() + returnDoc.refundStatus.slice(1)}
                </span>
              </div>
              {returnDoc.shippingLabel && returnDoc.status === 'approved' && (
                <div>
                  <Body className="text-sm text-gray-600 mb-2">Shipping Label</Body>
                  <Button variant="outline" size="sm" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download Label
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Actions */}
          {returnDoc.status === 'pending' && (
            <Card className="p-6">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowCancelModal(true)}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Cancel Return
              </Button>
            </Card>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        title="Cancel Return Request"
        message="Are you sure you want to cancel this return request? This action cannot be undone."
        confirmText="Cancel Return"
        cancelText="Keep Return"
        isLoading={isCancelling}
      />
    </div>
  );
};
