import { useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  useGetReturnQuery,
  useCancelReturnMutation,
  useApproveReturnMutation,
  useRejectReturnMutation,
  useProcessRefundMutation,
} from '../../store/api/returnApi';
import { baseApi } from '../../store/api/baseApi';
import { useAppSelector, useAppDispatch } from '../../store/types';
import { showNotification } from '../../store/slices/uiSlice';
import { getErrorInfo } from '../../utils/errorHandler';
import { getProductImageUrl, resolveProductDisplayImage } from '../../utils/productImage';
import { ProductPlaceholderImage } from '../../components/ProductPlaceholderImage';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { H1, H2, Body } from '../../components/ui/Typography';
import { Breadcrumb } from '../../components/Breadcrumb';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
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
  Banknote,
  FileText,
  RotateCcw,
  ChevronRight,
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

const formatReturnReasonLabel = (reason: string): string => {
  const labels: Record<string, string> = {
    defective: 'Defective / Damaged',
    'wrong-item': 'Wrong Item Received',
    'not-as-described': 'Not as Described',
    'changed-mind': 'Changed Mind',
    other: 'Other',
  };
  return labels[reason] || reason.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

export const AdminReturnDetail = () => {
  const isAdmin = true;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const returnsHref = isAdmin ? '/admin/returns' : '/returns';

  const { data, isLoading, error } = useGetReturnQuery(
    id ? { id, email: email || undefined } : { id: '', email: undefined },
    { skip: !id }
  );

  const [cancelReturn, { isLoading: isCancelling }] = useCancelReturnMutation();
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [approveReturn, { isLoading: isApproving }] = useApproveReturnMutation();
  const [rejectReturn, { isLoading: isRejecting }] = useRejectReturnMutation();
  const [processRefund, { isLoading: isProcessingRefund }] = useProcessRefundMutation();

  const [adminActionType, setAdminActionType] = useState<'approve' | 'reject' | 'refund' | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState('');

  const returnDoc = data?.return;

  const handleCancel = async () => {
    if (!id) return;

    try {
      await cancelReturn({
        id,
        email: email || undefined,
      }).unwrap();

      dispatch(
        baseApi.util.invalidateTags([
          'Return',
          { type: 'Return', id: 'LIST' },
          { type: 'Return', id },
        ])
      );

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

  const handleApprove = async () => {
    if (!id) return;
    try {
      await approveReturn(id).unwrap();
      dispatch(showNotification({ message: 'Return approved successfully', type: 'success' }));
      setAdminActionType(null);
    } catch (error: any) {
      dispatch(showNotification({
        message: getErrorInfo(error, 'Failed to approve return').message,
        type: 'error',
      }));
    }
  };

  const handleReject = async () => {
    if (!id || !rejectNotes.trim()) {
      dispatch(showNotification({ message: 'Please provide a reason for rejection', type: 'error' }));
      return;
    }
    try {
      await rejectReturn({ id, data: { adminNotes: rejectNotes } }).unwrap();
      dispatch(showNotification({ message: 'Return rejected successfully', type: 'success' }));
      setAdminActionType(null);
      setRejectNotes('');
    } catch (error: any) {
      dispatch(showNotification({
        message: getErrorInfo(error, 'Failed to reject return').message,
        type: 'error',
      }));
    }
  };

  const handleProcessRefund = async () => {
    if (!id) return;
    try {
      await processRefund({
        id,
        data: refundAmount ? { refundAmount: parseFloat(refundAmount) } : undefined,
      }).unwrap();
      dispatch(showNotification({ message: 'Refund processing initiated', type: 'success' }));
      setAdminActionType(null);
      setRefundAmount('');
    } catch (error: any) {
      dispatch(showNotification({
        message: getErrorInfo(error, 'Failed to process refund').message,
        type: 'error',
      }));
    }
  };

  const closeAdminModal = () => {
    setAdminActionType(null);
    setRejectNotes('');
    setRefundAmount('');
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

    // Cancelled
    if (returnDoc.status === 'cancelled') {
      steps.push({
        status: 'cancelled',
        label: 'Return Cancelled',
        description: 'This return request was cancelled',
        icon: XCircle,
        completed: true,
        active: false,
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col items-center justify-center min-h-[360px] gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
          <Body className="text-gray-500">Loading return details...</Body>
        </div>
      </div>
    );
  }

  if (error || !returnDoc) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="p-10 text-center max-w-md mx-auto">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="h-7 w-7 text-red-600" />
          </div>
          <H2 className="text-xl font-semibold text-gray-900">Return Not Found</H2>
          <Body className="mt-2 text-gray-600 text-sm">
            This return doesn't exist or you don't have access to view it.
          </Body>
          <Link to={returnsHref} className="inline-block mt-6">
            <Button variant="primary">Back to Returns</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const timelineSteps = getTimelineSteps();
  const StatusIcon = getStatusIcon(returnDoc.status);
  const orderId = typeof returnDoc.order === 'object' ? returnDoc.order._id : returnDoc.order;
  const orderLink = isAdmin
    ? `/admin/orders/${orderId}`
    : isAuthenticated
    ? `/orders/${orderId}`
    : `/orders/${orderId}?email=${encodeURIComponent(email || '')}`;

  const returnShortId = returnDoc._id.slice(-8).toUpperCase();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <Breadcrumb
        items={isAdmin
          ? [
              { label: 'Admin', href: '/admin/dashboard' },
              { label: 'Returns', href: '/admin/returns' },
              { label: `Return #${returnShortId}`, href: '#' },
            ]
          : [
              { label: 'Home', href: '/' },
              { label: 'Returns', href: '/returns' },
              { label: `Return #${returnShortId}`, href: '#' },
            ]}
      />

      <div className="mt-4 mb-6">
        <Link
          to={returnsHref}
          className="inline-flex items-center text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Returns
        </Link>
      </div>

      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <H1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Return #{returnShortId}
              </H1>
              <span
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusBadgeColor(returnDoc.status)}`}
              >
                <StatusIcon className="h-4 w-4" />
                {returnDoc.status.charAt(0).toUpperCase() + returnDoc.status.slice(1)}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-500 flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Requested on {format(new Date(returnDoc.createdAt), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Timeline */}
          <Card className="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-teal-600" />
              </div>
              <H2 className="text-lg font-semibold text-gray-900">Return Status</H2>
            </div>
            <div className="relative">
              {timelineSteps.map((step, index) => {
                const Icon = step.icon;
                const isLast = index === timelineSteps.length - 1;

                return (
                  <div key={step.status} className="flex gap-5">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                          step.completed
                            ? 'bg-teal-600 border-teal-600 text-white'
                            : step.active
                            ? 'bg-teal-50 border-teal-500 text-teal-600'
                            : 'bg-gray-100 border-gray-200 text-gray-400'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      {!isLast && (
                        <div
                          className={`w-0.5 flex-1 min-h-[2rem] mt-1 ${
                            step.completed ? 'bg-teal-200' : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-6 last:pb-0">
                      <p className="font-medium text-gray-900">{step.label}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{step.description}</p>
                      {step.date && (
                        <p className="text-xs text-gray-500 mt-2">
                          {format(new Date(step.date), 'MMM d, yyyy · HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Return Items */}
          <Card className="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-gray-600" />
              </div>
              <H2 className="text-lg font-semibold text-gray-900">Items Being Returned</H2>
            </div>
            <ul className="divide-y divide-gray-100">
              {returnDoc.items.map((item, index) => (
                <li key={index} className="py-4 first:pt-0 flex gap-4">
                  {(() => {
                    const productName = item.product?.name || 'Product';
                    const { isPlaceholder, placeholderCategory } = resolveProductDisplayImage(
                      item.product?.images,
                      item.product?.category,
                      100
                    );
                    return isPlaceholder ? (
                      <ProductPlaceholderImage
                        productName={productName}
                        category={placeholderCategory ?? item.product?.category}
                        size="sm"
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border border-gray-100 flex-shrink-0"
                      />
                    ) : (
                      <img
                        src={getProductImageUrl(item.product?.images?.[0])}
                        alt={productName}
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-gray-100 flex-shrink-0"
                      />
                    );
                  })()}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{item.product?.name || 'Product'}</p>
                    <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <span className="text-gray-400">Qty:</span>
                        {item.quantity}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="text-gray-400">Reason:</span>
                        {formatReturnReasonLabel(item.reason)}
                      </span>
                    </dl>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Images */}
          {returnDoc.images && returnDoc.images.length > 0 && (
            <Card className="p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                  <ImageIcon className="h-5 w-5 text-gray-600" />
                </div>
                <H2 className="text-lg font-semibold text-gray-900">Uploaded Photos</H2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {returnDoc.images.map((image, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-lg overflow-hidden border border-gray-100 bg-gray-50"
                  >
                    <img
                      src={image}
                      alt={`Return photo ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Admin Notes */}
          {returnDoc.adminNotes && (
            <Card className="p-6 sm:p-8 bg-amber-50/80 border-amber-200">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <H2 className="text-lg font-semibold text-amber-900">Admin Notes</H2>
              </div>
              <p className="text-sm text-amber-800 leading-relaxed">{returnDoc.adminNotes}</p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Return Information */}
          <Card className="p-6 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-gray-600" />
              </div>
              <H2 className="text-lg font-semibold text-gray-900">Return Information</H2>
            </div>
            <dl className="space-y-4">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">Return Reason</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {formatReturnReasonLabel(returnDoc.returnReason)}
                </dd>
              </div>
              {returnDoc.comments && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">Comments</dt>
                  <dd className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{returnDoc.comments}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">Refund Method</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {returnDoc.refundMethod === 'original-payment' ? 'Original Payment Method' : 'Store Credit'}
                </dd>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <Link
                  to={orderLink}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                >
                  View Original Order
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </dl>
          </Card>

          {/* Refund Information */}
          <Card className="p-6 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
                <Banknote className="h-5 w-5 text-teal-600" />
              </div>
              <H2 className="text-lg font-semibold text-gray-900">Refund Information</H2>
            </div>

            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Banknote className="h-5 w-5 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <Body className="text-sm text-gray-500">Refund Amount</Body>
                  <Body className="text-2xl font-bold text-teal-600 mt-0.5">
                    MWK {returnDoc.refundAmount.toLocaleString()}
                  </Body>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Body className="text-sm text-gray-500">Refund Status</Body>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${getRefundStatusBadgeColor(returnDoc.refundStatus)}`}>
                  {returnDoc.refundStatus === 'pending' && <Clock className="h-4 w-4" />}
                  {returnDoc.refundStatus === 'processing' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {returnDoc.refundStatus === 'completed' && <CheckCircle className="h-4 w-4" />}
                  {returnDoc.refundStatus === 'failed' && <XCircle className="h-4 w-4" />}
                  {returnDoc.refundStatus.charAt(0).toUpperCase() + returnDoc.refundStatus.slice(1)}
                </span>
              </div>
              {returnDoc.status === 'cancelled' && (
                <Body className="text-xs text-gray-500">No refund will be issued for a cancelled return.</Body>
              )}
              {returnDoc.status !== 'cancelled' && returnDoc.refundStatus === 'pending' && (
                <Body className="text-xs text-gray-500">Refund will be processed after the return is approved.</Body>
              )}
              {returnDoc.refundStatus === 'completed' && (
                <Body className="text-xs text-gray-500">Refund has been sent to the original payment method.</Body>
              )}
            </div>

            {(isAdmin && returnDoc.status === 'approved' && returnDoc.refundStatus !== 'completed') ||
            (returnDoc.shippingLabel && returnDoc.status === 'approved') ? (
              <div className="mt-6 pt-5 border-t border-gray-200 space-y-4">
                {isAdmin && returnDoc.status === 'approved' && returnDoc.refundStatus !== 'completed' && (
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => setAdminActionType('refund')}
                  >
                    <Banknote className="h-4 w-4 mr-2" />
                    Process Refund
                  </Button>
                )}
                {returnDoc.shippingLabel && returnDoc.status === 'approved' && (
                  <div>
                    <Body className="text-sm text-gray-500 mb-2">Shipping Label</Body>
                    <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200 mb-2">
                      <Body className="font-mono text-sm font-medium text-gray-800 break-all">
                        {returnDoc.shippingLabel}
                      </Body>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download Label
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </Card>

          {/* Actions */}
          {isAdmin && returnDoc.status === 'pending' && (
            <Card className="p-6 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-amber-600" />
                </div>
                <H2 className="text-lg font-semibold text-gray-900">Actions</H2>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => setAdminActionType('approve')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Return
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
                  onClick={() => setAdminActionType('reject')}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Return
                </Button>
              </div>
            </Card>
          )}
          {!isAdmin && returnDoc.status === 'pending' && (
            <Card className="p-6 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                  <RotateCcw className="h-5 w-5 text-gray-600" />
                </div>
                <H2 className="text-lg font-semibold text-gray-900">Actions</H2>
              </div>
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
          {!isAdmin && returnDoc.status === 'cancelled' && orderId && (
            <Card className="p-6 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
                  <RotateCcw className="h-5 w-5 text-teal-600" />
                </div>
                <H2 className="text-lg font-semibold text-gray-900">Actions</H2>
              </div>
              <div className="flex flex-col gap-3">
                <Link to={`/returns/new?orderId=${orderId}`} className="block">
                  <Button variant="primary" className="w-full">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Request a new return
                  </Button>
                </Link>
                <Link to={orderLink} className="block">
                  <Button variant="secondary" className="w-full">
                    View Original Order
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
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

      {/* Admin: Approve Modal */}
      {isAdmin && (
        <>
          <ConfirmationModal
            isOpen={adminActionType === 'approve'}
            onClose={closeAdminModal}
            onConfirm={handleApprove}
            title="Approve Return Request"
            message={id ? `Are you sure you want to approve return #${id.slice(-8).toUpperCase()}?` : ''}
            confirmText="Approve"
            cancelText="Cancel"
            isLoading={isApproving}
          />
          <ConfirmationModal
            isOpen={adminActionType === 'reject'}
            onClose={closeAdminModal}
            onConfirm={handleReject}
            title="Reject Return Request"
            message={
              <div className="space-y-4">
                <Body>Are you sure you want to reject this return request?</Body>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Rejection (Required)
                  </label>
                  <textarea
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Please provide a reason for rejecting this return..."
                  />
                </div>
              </div>
            }
            confirmText="Reject"
            cancelText="Cancel"
            isLoading={isRejecting}
            confirmDisabled={!rejectNotes.trim()}
          />
          <ConfirmationModal
            isOpen={adminActionType === 'refund'}
            onClose={closeAdminModal}
            onConfirm={handleProcessRefund}
            title="Process Refund"
            message={
              <div className="space-y-4">
                <Body>
                  Process refund for return #{id?.slice(-8).toUpperCase()}?
                </Body>
                {returnDoc && (
                  <div>
                    <Body className="text-sm text-gray-600 mb-2">
                      Calculated Refund Amount: MWK {returnDoc.refundAmount.toLocaleString()}
                    </Body>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Refund Amount (Optional - leave empty to use calculated amount)
                    </label>
                    <Input
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder={returnDoc.refundAmount.toLocaleString()}
                      min={0}
                      step={0.01}
                    />
                  </div>
                )}
              </div>
            }
            confirmText="Process Refund"
            cancelText="Cancel"
            isLoading={isProcessingRefund}
          />
        </>
      )}
    </div>
  );
};
