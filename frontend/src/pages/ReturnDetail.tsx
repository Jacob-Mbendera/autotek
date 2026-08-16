import { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  useGetReturnQuery,
  useCancelReturnMutation,
} from '../store/api/returnApi';
import { baseApi } from '../store/api/baseApi';
import { useAppSelector, useAppDispatch } from '../store/types';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { getProductImageUrl, resolveProductDisplayImage } from '../utils/productImage';
import { ProductPlaceholderImage } from '../components/ProductPlaceholderImage';
import { Breadcrumb } from '../components/Breadcrumb';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { JournalCard, JournalButton, JournalLinkButton, PageHeading, CardHeading, JournalBody } from '../components/journal';
import { cn } from '../utils/cn';
import {
  ArrowLeft,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
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
      return 'bg-journal-warn-bg text-journal-warn-text';
    case 'rejected':
      return 'bg-journal-danger-bg text-journal-danger-text';
    case 'cancelled':
      return 'bg-journal-sand text-journal-body';
    default:
      return 'bg-journal-teal-tint text-journal-teal';
  }
};

const getRefundStatusBadgeColor = (status: RefundStatus) => {
  switch (status) {
    case 'pending':
      return 'bg-journal-warn-bg text-journal-warn-text';
    case 'failed':
      return 'bg-journal-danger-bg text-journal-danger-text';
    default:
      return 'bg-journal-teal-tint text-journal-teal';
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

export const ReturnDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const email = searchParams.get('email');
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const returnsHref = '/returns';

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

  const getTimelineSteps = () => {
    if (!returnDoc) return [];

    const steps = [];

    steps.push({
      status: 'pending',
      label: 'Return Requested',
      description: 'Your return request has been submitted',
      icon: Clock,
      completed: true,
      date: returnDoc.createdAt,
    });

    if (returnDoc.status === 'approved' || returnDoc.status === 'rejected' || returnDoc.status === 'completed') {
      steps.push({
        status: returnDoc.status,
        label: returnDoc.status === 'approved' ? 'Return Approved' : 'Return Rejected',
        description: returnDoc.status === 'approved'
          ? 'Your return has been approved. Please ship the items back.'
          : 'Your return request was rejected.',
        icon: returnDoc.status === 'approved' ? CheckCircle : XCircle,
        completed: true,
        date: returnDoc.updatedAt,
      });
    }

    if (returnDoc.status === 'cancelled') {
      steps.push({
        status: 'cancelled',
        label: 'Return Cancelled',
        description: 'This return request was cancelled',
        icon: XCircle,
        completed: true,
        date: returnDoc.updatedAt,
      });
    }

    if (returnDoc.status === 'completed') {
      steps.push({
        status: 'completed',
        label: 'Refund Processed',
        description: 'Your refund has been processed',
        icon: CheckCircle,
        completed: true,
        date: returnDoc.updatedAt,
      });
    }

    return steps;
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-journal-teal" />
          <JournalBody className="!text-journal-muted">Loading return details...</JournalBody>
        </div>
      </div>
    );
  }

  if (error || !returnDoc) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <JournalCard className="p-10 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-journal-danger-bg flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="h-6 w-6 text-journal-danger-text" />
          </div>
          <CardHeading className="!text-[20px]">Return not found</CardHeading>
          <JournalBody className="mt-2 !text-journal-muted">
            This return doesn't exist or you don't have access to view it.
          </JournalBody>
          <JournalLinkButton to={returnsHref} className="inline-flex mt-6 mx-auto">
            Back to returns
          </JournalLinkButton>
        </JournalCard>
      </div>
    );
  }

  const timelineSteps = getTimelineSteps();
  const StatusIcon = getStatusIcon(returnDoc.status);
  const orderId = typeof returnDoc.order === 'object' ? returnDoc.order._id : returnDoc.order;
  const orderLink = isAuthenticated
    ? `/orders/${orderId}`
    : `/orders/${orderId}?email=${encodeURIComponent(email || '')}`;

  const returnShortId = returnDoc._id.slice(-8).toUpperCase();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Returns', href: '/returns' },
          { label: `Return #${returnShortId}` },
        ]}
      />

      <div className="mt-4 mb-6">
        <Link
          to={returnsHref}
          className="inline-flex items-center text-[12px] font-sans font-semibold tracking-[0.08em] uppercase text-journal-teal hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Back to returns
        </Link>
      </div>

      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <PageHeading className="!text-[26px] sm:!text-[32px]">
                Return #{returnShortId}
              </PageHeading>
              <span className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-sans font-medium', getStatusBadgeColor(returnDoc.status))}>
                <StatusIcon className="h-3.5 w-3.5" />
                {returnDoc.status.charAt(0).toUpperCase() + returnDoc.status.slice(1)}
              </span>
            </div>
            <p className="mt-2 text-[13px] font-sans text-journal-muted flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Requested on {format(new Date(returnDoc.createdAt), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Timeline */}
          <JournalCard className="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="h-4 w-4 text-journal-teal" />
              <CardHeading className="!text-[19px]">Return status</CardHeading>
            </div>
            <div className="relative">
              {timelineSteps.map((step, index) => {
                const Icon = step.icon;
                const isLast = index === timelineSteps.length - 1;

                return (
                  <div key={step.status} className="flex gap-4 sm:gap-5">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border bg-journal-teal-tint border-journal-teal-tint-border text-journal-teal">
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      {!isLast && (
                        <div className="w-px flex-1 min-h-[2rem] mt-1 bg-journal-teal-tint-border" />
                      )}
                    </div>
                    <div className="flex-1 pb-6 last:pb-0">
                      <p className="font-sans font-medium text-[14px] text-journal-ink">{step.label}</p>
                      <p className="text-[13px] font-sans text-journal-muted mt-0.5">{step.description}</p>
                      {step.date && (
                        <p className="text-[11px] font-sans text-journal-faint mt-2">
                          {format(new Date(step.date), 'MMM d, yyyy · HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </JournalCard>

          {/* Return Items */}
          <JournalCard className="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-5">
              <Package className="h-4 w-4 text-journal-teal" />
              <CardHeading className="!text-[19px]">Items being returned</CardHeading>
            </div>
            <ul className="divide-y divide-journal-hairline">
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
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-journal border border-journal-hairline flex-shrink-0"
                      />
                    ) : (
                      <img
                        src={getProductImageUrl(item.product?.images?.[0])}
                        alt={productName}
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-journal border border-journal-hairline flex-shrink-0"
                      />
                    );
                  })()}
                  <div className="min-w-0 flex-1">
                    <p className="font-sans font-medium text-[14px] text-journal-ink">{item.product?.name || 'Product'}</p>
                    <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-sans text-journal-muted">
                      <span className="inline-flex items-center gap-1">
                        <span className="text-journal-faint">Qty:</span>
                        {item.quantity}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="text-journal-faint">Reason:</span>
                        {formatReturnReasonLabel(item.reason)}
                      </span>
                    </dl>
                  </div>
                </li>
              ))}
            </ul>
          </JournalCard>

          {/* Images */}
          {returnDoc.images && returnDoc.images.length > 0 && (
            <JournalCard className="p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-5">
                <ImageIcon className="h-4 w-4 text-journal-teal" />
                <CardHeading className="!text-[19px]">Uploaded photos</CardHeading>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {returnDoc.images.map((image, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-journal overflow-hidden border border-journal-hairline bg-journal-sand"
                  >
                    <img
                      src={image}
                      alt={`Return photo ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                ))}
              </div>
            </JournalCard>
          )}

          {/* Admin Notes */}
          {returnDoc.adminNotes && (
            <JournalCard className="p-6 sm:p-8 bg-journal-warn-bg border-journal-warn-bg">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-journal-warn-text" />
                <CardHeading className="!text-[17px] !text-journal-warn-text">Admin notes</CardHeading>
              </div>
              <p className="text-[13px] font-sans text-journal-warn-text leading-relaxed">{returnDoc.adminNotes}</p>
            </JournalCard>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Return Information */}
          <JournalCard className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <FileText className="h-4 w-4 text-journal-teal" />
              <CardHeading className="!text-[17px]">Return information</CardHeading>
            </div>
            <dl className="space-y-4">
              <div>
                <dt className="text-[11px] font-sans font-semibold uppercase tracking-[0.08em] text-journal-faint">Return reason</dt>
                <dd className="mt-1 text-[13px] font-sans font-medium text-journal-ink">
                  {formatReturnReasonLabel(returnDoc.returnReason)}
                </dd>
              </div>
              {returnDoc.comments && (
                <div>
                  <dt className="text-[11px] font-sans font-semibold uppercase tracking-[0.08em] text-journal-faint">Comments</dt>
                  <dd className="mt-1 text-[13px] font-sans text-journal-body whitespace-pre-wrap">{returnDoc.comments}</dd>
                </div>
              )}
              <div>
                <dt className="text-[11px] font-sans font-semibold uppercase tracking-[0.08em] text-journal-faint">Refund method</dt>
                <dd className="mt-1 text-[13px] font-sans font-medium text-journal-ink">
                  {returnDoc.refundMethod === 'original-payment' ? 'Original Payment Method' : 'Store Credit'}
                </dd>
              </div>
              <div className="pt-2 border-t border-journal-hairline">
                <Link
                  to={orderLink}
                  className="inline-flex items-center gap-1.5 text-[13px] font-sans font-medium text-journal-teal hover:underline"
                >
                  View original order
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </dl>
          </JournalCard>

          {/* Refund Information */}
          <JournalCard className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Banknote className="h-4 w-4 text-journal-teal" />
              <CardHeading className="!text-[17px]">Refund information</CardHeading>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-[12px] font-sans text-journal-muted">Refund amount</p>
                <p className="font-journal text-[26px] text-journal-teal mt-0.5">
                  MWK {returnDoc.refundAmount.toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-1 flex-wrap">
                <span className="text-[12px] font-sans text-journal-muted">Refund status</span>
                <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-sans font-medium', getRefundStatusBadgeColor(returnDoc.refundStatus))}>
                  {returnDoc.refundStatus === 'pending' && <Clock className="h-3.5 w-3.5" />}
                  {returnDoc.refundStatus === 'processing' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {returnDoc.refundStatus === 'completed' && <CheckCircle className="h-3.5 w-3.5" />}
                  {returnDoc.refundStatus === 'failed' && <XCircle className="h-3.5 w-3.5" />}
                  {returnDoc.refundStatus.charAt(0).toUpperCase() + returnDoc.refundStatus.slice(1)}
                </span>
              </div>
              {returnDoc.status === 'cancelled' && (
                <p className="text-[11px] font-sans text-journal-faint">No refund will be issued for a cancelled return.</p>
              )}
              {returnDoc.status !== 'cancelled' && returnDoc.refundStatus === 'pending' && (
                <p className="text-[11px] font-sans text-journal-faint">Refund will be processed after the return is approved.</p>
              )}
              {returnDoc.refundStatus === 'completed' && (
                <p className="text-[11px] font-sans text-journal-faint">Refund has been sent to the original payment method.</p>
              )}
            </div>

            {returnDoc.shippingLabel && returnDoc.status === 'approved' && (
              <div className="mt-6 pt-5 border-t border-journal-hairline">
                <p className="text-[12px] font-sans text-journal-muted mb-2">Shipping label</p>
                <div className="bg-journal-sand rounded-journal px-4 py-3 border border-journal-hairline mb-2">
                  <p className="font-mono text-[12px] font-medium text-journal-ink break-all">
                    {returnDoc.shippingLabel}
                  </p>
                </div>
              </div>
            )}
          </JournalCard>

          {/* Actions */}
          {returnDoc.status === 'pending' && (
            <JournalCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <RotateCcw className="h-4 w-4 text-journal-teal" />
                <CardHeading className="!text-[17px]">Actions</CardHeading>
              </div>
              <JournalButton
                variant="secondary"
                className="w-full"
                onClick={() => setShowCancelModal(true)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Cancel return
              </JournalButton>
            </JournalCard>
          )}
          {returnDoc.status === 'cancelled' && orderId && (
            <JournalCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <RotateCcw className="h-4 w-4 text-journal-teal" />
                <CardHeading className="!text-[17px]">Actions</CardHeading>
              </div>
              <div className="flex flex-col gap-3">
                <JournalLinkButton to={`/returns/new?orderId=${orderId}`} className="w-full">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Request a new return
                </JournalLinkButton>
                <JournalLinkButton to={orderLink} variant="secondary" className="w-full">
                  View original order
                  <ChevronRight className="h-3.5 w-3.5" />
                </JournalLinkButton>
              </div>
            </JournalCard>
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
