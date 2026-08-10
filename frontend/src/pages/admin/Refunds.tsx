import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useGetAdminRefundsQuery,
  useCompleteAdminRefundMutation,
  type AdminRefundPayment,
} from '../../store/api/refundApi';
import {
  useGetAllReturnsQuery,
  useCompleteReturnRefundMutation,
} from '../../store/api/returnApi';
import { useAppDispatch } from '../../store/types';
import { showNotification } from '../../store/slices/uiSlice';
import { getErrorInfo } from '../../utils/errorHandler';
import { useAdminListQueryOptions } from '../../hooks/useAdminListQueryOptions';
import { AdminCard } from '../../components/ui/AdminCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { H1, Body } from '../../components/ui/Typography';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import {
  Banknote,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
  Search,
} from 'lucide-react';

type StatusFilter = 'all' | 'refund_pending' | 'refunded';

function typeLabel(type: AdminRefundPayment['type']): string {
  if (type === 'order') return 'Order';
  if (type === 'towing') return 'Towing';
  return 'Car service';
}

function relatedRef(payment: AdminRefundPayment): { label: string; href?: string } {
  if (payment.order && typeof payment.order === 'object') {
    return {
      label: `#${payment.order._id.slice(-8).toUpperCase()}`,
      href: `/admin/orders/${payment.order._id}`,
    };
  }
  if (payment.towingService && typeof payment.towingService === 'object') {
    return {
      label: `#${payment.towingService._id.slice(-8).toUpperCase()}`,
      href: '/admin/services',
    };
  }
  if (payment.carService && typeof payment.carService === 'object') {
    return {
      label: `#${payment.carService._id.slice(-8).toUpperCase()}`,
      href: '/admin/services',
    };
  }
  return { label: '—' };
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const AdminRefunds = () => {
  const dispatch = useAppDispatch();
  const adminListQueryOptions = useAdminListQueryOptions();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('refund_pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [completeTarget, setCompleteTarget] = useState<AdminRefundPayment | null>(null);
  const [completeReturnId, setCompleteReturnId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useGetAdminRefundsQuery(
    {
      page,
      limit: 20,
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: searchTerm.trim() || undefined,
    },
    adminListQueryOptions
  );
  const [completeRefund, { isLoading: isCompleting }] = useCompleteAdminRefundMutation();
  const [completeReturnRefund, { isLoading: isCompletingReturn }] = useCompleteReturnRefundMutation();

  // Order-type refunds can be backed by one or more Returns, each with its own
  // refundAmount — only the modal for an order-type target needs this, fetched
  // on demand rather than per-row for every payment in the list.
  const completeTargetOrderId =
    completeTarget?.type === 'order' && completeTarget.order && typeof completeTarget.order === 'object'
      ? completeTarget.order._id
      : undefined;
  const { data: linkedReturnsData, isFetching: isLoadingLinkedReturns } = useGetAllReturnsQuery(
    completeTargetOrderId ? { orderId: completeTargetOrderId, limit: 50 } : undefined,
    { skip: !completeTargetOrderId }
  );
  const returnsAwaitingCompletion = (linkedReturnsData?.returns ?? []).filter(
    (r) => r.refundStatus === 'processing'
  );
  const hasLinkedReturns = Boolean(completeTargetOrderId) && returnsAwaitingCompletion.length > 0;

  const refunds = data?.refunds ?? [];
  const pagination = data?.pagination;
  const pendingCount = data?.pendingCount ?? 0;

  const handleComplete = async () => {
    if (!completeTarget) return;
    try {
      const result = await completeRefund({
        id: completeTarget._id,
      }).unwrap();
      dispatch(
        showNotification({
          message: result.message || 'Refund marked as completed',
          type: 'success',
        })
      );
      setCompleteTarget(null);
      refetch();
    } catch (error) {
      const errorInfo = getErrorInfo(error, 'Failed to mark refund completed');
      dispatch(showNotification({ message: errorInfo.message, type: 'error' }));
    }
  };

  const handleCompleteReturn = async (returnId: string) => {
    try {
      const result = await completeReturnRefund({ id: returnId }).unwrap();
      dispatch(
        showNotification({
          message: result.message || 'Return refund marked as completed',
          type: 'success',
        })
      );
      setCompleteReturnId(null);
      // If that was the last open return, the order/payment may now also be
      // fully refunded server-side — refresh the payments list to reflect it.
      // Close the modal rather than letting it fall through to the
      // whole-payment confirmation dialog once no linked returns remain.
      if (returnsAwaitingCompletion.length <= 1) {
        setCompleteTarget(null);
      }
      refetch();
    } catch (error) {
      const errorInfo = getErrorInfo(error, 'Failed to mark return refund completed');
      dispatch(showNotification({ message: errorInfo.message, type: 'error' }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <H1 className="text-3xl font-bold text-gray-50 mb-2">Refunds</H1>
        <Body className="text-gray-400">
          PayChangu has no refund API. Process each refund in the PayChangu dashboard, then mark it
          completed here.
        </Body>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AdminCard className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-400" />
            <div>
              <p className="text-sm text-gray-400">Pending manual refunds</p>
              <p className="text-2xl font-semibold text-gray-50">{pendingCount}</p>
            </div>
          </div>
        </AdminCard>
        <AdminCard className="p-4">
          <div className="flex items-center gap-3">
            <Banknote className="h-8 w-8 text-teal-400" />
            <div>
              <p className="text-sm text-gray-400">Showing</p>
              <p className="text-2xl font-semibold text-gray-50">{refunds.length}</p>
            </div>
          </div>
        </AdminCard>
      </div>

      <AdminCard className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search transaction / charge ID"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['refund_pending', 'Pending'],
                ['refunded', 'Completed'],
                ['all', 'All'],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                variant={statusFilter === value ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
          </div>
        ) : refunds.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No refunds found for this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400">
                  <th className="py-3 pr-3 font-medium">Type</th>
                  <th className="py-3 pr-3 font-medium">Related</th>
                  <th className="py-3 pr-3 font-medium">Amount</th>
                  <th className="py-3 pr-3 font-medium">Transaction</th>
                  <th className="py-3 pr-3 font-medium">Reason</th>
                  <th className="py-3 pr-3 font-medium">Requested</th>
                  <th className="py-3 pr-3 font-medium">Status</th>
                  <th className="py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((payment) => {
                  const related = relatedRef(payment);
                  const isPending = payment.status === 'refund_pending';
                  return (
                    <tr key={payment._id} className="border-b border-gray-800 text-gray-200">
                      <td className="py-3 pr-3">{typeLabel(payment.type)}</td>
                      <td className="py-3 pr-3">
                        {related.href ? (
                          <Link
                            to={related.href}
                            className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300"
                          >
                            {related.label}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          related.label
                        )}
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        MWK {payment.amount.toLocaleString()}
                      </td>
                      <td className="py-3 pr-3">
                        <div className="max-w-[140px] truncate" title={payment.transactionId}>
                          {payment.transactionId || '—'}
                        </div>
                        {payment.chargeId ? (
                          <div
                            className="max-w-[140px] truncate text-xs text-gray-500"
                            title={payment.chargeId}
                          >
                            {payment.chargeId}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3 max-w-[180px]">
                        <span className="line-clamp-2" title={payment.refundReason}>
                          {payment.refundReason || '—'}
                        </span>
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        {formatDate(payment.refundRequestedAt)}
                      </td>
                      <td className="py-3 pr-3">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-300">
                            <Clock className="h-3.5 w-3.5" />
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded border border-green-500/40 bg-green-500/10 px-2 py-0.5 text-green-300">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Completed
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        {isPending ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setCompleteTarget(payment);
                            }}
                          >
                            Mark completed
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-500">
                            {formatDate(payment.refundCompletedAt)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between pt-2">
            <Body className="text-gray-400 text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </Body>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </AdminCard>

      {completeTarget && completeTargetOrderId && isLoadingLinkedReturns ? (
        <ConfirmationModal
          isOpen
          onClose={() => setCompleteTarget(null)}
          onConfirm={() => {}}
          title="Mark refund completed"
          confirmText="Mark completed"
          variant="success"
          dark
          confirmDisabled
          message="Checking this order for linked returns…"
        />
      ) : completeTarget && hasLinkedReturns ? (
        <ConfirmationModal
          isOpen
          onClose={() => setCompleteTarget(null)}
          onConfirm={() => {}}
          title="Complete return refunds"
          confirmText="Close"
          variant="success"
          dark
          confirmDisabled
          message={
            <div className="space-y-3 text-left">
              <p>
                This order has {returnsAwaitingCompletion.length} return
                {returnsAwaitingCompletion.length === 1 ? '' : 's'} with a refund queued. Complete each
                one individually below — this order's payment total (MWK{' '}
                {completeTarget.amount.toLocaleString()}) covers all of them, but each return may only be
                for part of that amount.
              </p>
              <div className="space-y-2">
                {returnsAwaitingCompletion.map((r) => (
                  <div
                    key={r._id}
                    className="flex items-center justify-between gap-3 rounded border border-gray-700 bg-gray-900/60 p-3"
                  >
                    <div>
                      <p className="font-medium text-gray-100">
                        Return #{r._id.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-sm text-gray-400">
                        MWK {r.refundAmount.toLocaleString()} — {r.returnReason}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isCompletingReturn && completeReturnId !== r._id}
                      onClick={() => {
                        setCompleteReturnId(r._id);
                        handleCompleteReturn(r._id);
                      }}
                    >
                      {isCompletingReturn && completeReturnId === r._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Mark completed'
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          }
        />
      ) : completeTarget && !completeTargetOrderId ? (
        <ConfirmationModal
          isOpen
          onClose={() => {
            setCompleteTarget(null);
          }}
          onConfirm={handleComplete}
          title="Mark refund completed"
          confirmText="Mark completed"
          variant="success"
          dark
          isLoading={isCompleting}
          message={`Confirm you already refunded MWK ${completeTarget.amount.toLocaleString()} in the PayChangu dashboard for transaction ${completeTarget.transactionId || 'N/A'}. The customer will be emailed that the refund is complete.`}
        />
      ) : null}
    </div>
  );
};
