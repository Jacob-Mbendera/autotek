import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useGetAllReturnsQuery,
  useApproveReturnMutation,
  useRejectReturnMutation,
  useProcessRefundMutation,
} from '../../store/api/returnApi';
import { useAppDispatch } from '../../store/types';
import { showNotification } from '../../store/slices/uiSlice';
import { getErrorInfo } from '../../utils/errorHandler';
import { AdminCard } from '../../components/ui/AdminCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { H1, H2, Body } from '../../components/ui/Typography';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import {
  Package,
  Loader2,
  Search,
  Filter,
  X,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  TrendingUp,
  Banknote,
  Download,
  Calendar,
  User,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { ReturnStatus } from '@shared/types';
import { format } from 'date-fns';
import { useAdminListQueryOptions } from '../../hooks/useAdminListQueryOptions';

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

const formatReturnReason = (reason: string): string => {
  const labels: Record<string, string> = {
    defective: 'Defective/Damaged',
    'wrong-item': 'Wrong Item',
    'not-as-described': 'Not as Described',
    'changed-mind': 'Changed Mind',
    other: 'Other',
  };
  return labels[reason] || reason;
};

export const AdminReturns = () => {
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | undefined>(undefined);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedReturn, setSelectedReturn] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'refund' | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState<string>('');

  const adminListQueryOptions = useAdminListQueryOptions();

  const { data, isLoading, refetch } = useGetAllReturnsQuery(
    {
      status: statusFilter,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page,
      limit,
    },
    adminListQueryOptions
  );

  const [approveReturn, { isLoading: isApproving }] = useApproveReturnMutation();
  const [rejectReturn, { isLoading: isRejecting }] = useRejectReturnMutation();
  const [processRefund, { isLoading: isProcessingRefund }] = useProcessRefundMutation();

  const returns = data?.returns || [];
  const pagination = data?.pagination;

  // Calculate statistics
  const totalReturns = returns.length;
  const pendingReturns = returns.filter((r) => r.status === 'pending').length;
  const approvedReturns = returns.filter((r) => r.status === 'approved').length;
  const completedReturns = returns.filter((r) => r.status === 'completed').length;
  const totalRefundAmount = returns
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + (r.refundAmount || 0), 0);

  // Filter by search
  const filteredReturns = returns.filter((returnDoc) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const returnId = returnDoc._id.toLowerCase();
    const orderId = typeof returnDoc.order === 'object'
      ? returnDoc.order._id.toLowerCase()
      : returnDoc.order.toLowerCase();
    const userEmail = returnDoc.user
      ? typeof returnDoc.user === 'object'
        ? returnDoc.user.email?.toLowerCase() || ''
        : ''
      : returnDoc.guestInfo?.email?.toLowerCase() || '';

    return returnId.includes(query) || orderId.includes(query) || userEmail.includes(query);
  });

  const handleApprove = async () => {
    if (!selectedReturn) return;

    try {
      await approveReturn(selectedReturn).unwrap();
      dispatch(showNotification({
        message: 'Return approved successfully',
        type: 'success',
      }));
      setSelectedReturn(null);
      setActionType(null);
      refetch();
    } catch (error: any) {
      const errorInfo = getErrorInfo(error, 'Failed to approve return');
      dispatch(showNotification({
        message: errorInfo.message,
        type: 'error',
      }));
    }
  };

  const handleReject = async () => {
    if (!selectedReturn || !rejectNotes.trim()) {
      dispatch(showNotification({
        message: 'Please provide a reason for rejection',
        type: 'error',
      }));
      return;
    }

    try {
      await rejectReturn({
        id: selectedReturn,
        data: { adminNotes: rejectNotes },
      }).unwrap();
      dispatch(showNotification({
        message: 'Return rejected successfully',
        type: 'success',
      }));
      setSelectedReturn(null);
      setActionType(null);
      setRejectNotes('');
      refetch();
    } catch (error: any) {
      const errorInfo = getErrorInfo(error, 'Failed to reject return');
      dispatch(showNotification({
        message: errorInfo.message,
        type: 'error',
      }));
    }
  };

  const handleProcessRefund = async () => {
    if (!selectedReturn) return;

    try {
      await processRefund({
        id: selectedReturn,
        data: refundAmount ? { refundAmount: parseFloat(refundAmount) } : undefined,
      }).unwrap();
      dispatch(showNotification({
        message: 'Refund processing initiated',
        type: 'success',
      }));
      setSelectedReturn(null);
      setActionType(null);
      setRefundAmount('');
      refetch();
    } catch (error: any) {
      const errorInfo = getErrorInfo(error, 'Failed to process refund');
      dispatch(showNotification({
        message: errorInfo.message,
        type: 'error',
      }));
    }
  };

  const openActionModal = (returnId: string, type: 'approve' | 'reject' | 'refund') => {
    setSelectedReturn(returnId);
    setActionType(type);
    setRejectNotes('');
    setRefundAmount('');
  };

  const closeModal = () => {
    setSelectedReturn(null);
    setActionType(null);
    setRejectNotes('');
    setRefundAmount('');
  };

  const selectedReturnDoc = selectedReturn
    ? returns.find((r) => r._id === selectedReturn)
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <H1 className="text-gray-50">Returns Management</H1>
        <Body className="text-gray-400 mt-2">Manage and process return requests</Body>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AdminCard>
          <div className="flex items-center justify-between">
            <div>
              <Body className="text-sm text-gray-400">Total Returns</Body>
              <H2 className="text-2xl font-bold text-gray-50 mt-1">{totalReturns}</H2>
            </div>
            <Package className="h-8 w-8 text-teal-500" />
          </div>
        </AdminCard>
        <AdminCard>
          <div className="flex items-center justify-between">
            <div>
              <Body className="text-sm text-gray-400">Pending</Body>
              <H2 className="text-2xl font-bold text-amber-400 mt-1">{pendingReturns}</H2>
            </div>
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
        </AdminCard>
        <AdminCard>
          <div className="flex items-center justify-between">
            <div>
              <Body className="text-sm text-gray-400">Approved</Body>
              <H2 className="text-2xl font-bold text-blue-400 mt-1">{approvedReturns}</H2>
            </div>
            <CheckCircle className="h-8 w-8 text-blue-500" />
          </div>
        </AdminCard>
        <AdminCard>
          <div className="flex items-center justify-between">
            <div>
              <Body className="text-sm text-gray-400">Total Refunded</Body>
              <H2 className="text-2xl font-bold text-green-400 mt-1">
                MWK {totalRefundAmount.toLocaleString()}
              </H2>
            </div>
            <Banknote className="h-8 w-8 text-green-500" />
          </div>
        </AdminCard>
      </div>

      {/* Filters */}
      <AdminCard className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by return ID, order ID, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                dark
                className="pl-10 bg-slate-800 border-gray-700 text-gray-50 placeholder-gray-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter || ''}
              onChange={(e) => setStatusFilter(e.target.value as ReturnStatus || undefined)}
              className="px-3 py-2 bg-slate-800 border border-gray-700 rounded-lg text-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              dark
              className="w-40"
            />
            <span className="text-gray-400">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              dark
              className="w-40"
            />
            {(startDate || endDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setStartDate(''); setEndDate(''); }}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </AdminCard>

      {/* Returns Table */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : filteredReturns.length === 0 ? (
        <AdminCard className="p-12 text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <H2 className="text-gray-100">No Returns Found</H2>
          <Body className="text-gray-400 mt-2">No returns match your filters.</Body>
        </AdminCard>
      ) : (
        <div className="space-y-4">
          {filteredReturns.map((returnDoc) => {
            const orderId = typeof returnDoc.order === 'object' ? returnDoc.order._id : returnDoc.order;
            const userEmail = returnDoc.user
              ? typeof returnDoc.user === 'object'
                ? returnDoc.user.email
                : ''
              : returnDoc.guestInfo?.email || 'Guest';

            return (
              <AdminCard key={returnDoc._id} className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <H2 className="text-lg font-bold text-gray-100">
                        Return #{returnDoc._id.slice(-8).toUpperCase()}
                      </H2>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(returnDoc.status)}`}>
                        {returnDoc.status.charAt(0).toUpperCase() + returnDoc.status.slice(1)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-300">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>{userEmail}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span>Order #{orderId.slice(-8).toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span>{returnDoc.items.length} item(s)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-gray-400" />
                        <span>MWK {returnDoc.refundAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Reason:</span>
                        <span>{formatReturnReason(returnDoc.returnReason)}</span>
                      </div>
                      {(returnDoc.images?.length ?? 0) > 0 && (
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4 text-gray-400" />
                          <span>{returnDoc.images.length} image(s)</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      {format(new Date(returnDoc.createdAt), 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/admin/returns/${returnDoc._id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </Link>
                    {returnDoc.status === 'pending' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openActionModal(returnDoc._id, 'approve')}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openActionModal(returnDoc._id, 'reject')}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
                    {returnDoc.status === 'approved' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openActionModal(returnDoc._id, 'refund')}
                      >
                        <Banknote className="h-4 w-4 mr-2" />
                        Process Refund
                      </Button>
                    )}
                  </div>
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </Button>
          <Body className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.pages}
          </Body>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.pages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Approve Modal */}
      <ConfirmationModal
        isOpen={actionType === 'approve' && !!selectedReturn}
        onClose={closeModal}
        onConfirm={handleApprove}
        title="Approve Return Request"
        message={`Are you sure you want to approve return #${selectedReturn?.slice(-8).toUpperCase()}?`}
        confirmText="Approve"
        cancelText="Cancel"
        isLoading={isApproving}
      />

      {/* Reject Modal */}
      <ConfirmationModal
        isOpen={actionType === 'reject' && !!selectedReturn}
        onClose={closeModal}
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

      {/* Process Refund Modal */}
      <ConfirmationModal
        isOpen={actionType === 'refund' && !!selectedReturn}
        onClose={closeModal}
        onConfirm={handleProcessRefund}
        title="Process Refund"
        message={
          <div className="space-y-4">
            <Body>
              Process refund for return #{selectedReturn?.slice(-8).toUpperCase()}?
            </Body>
            {selectedReturnDoc && (
              <div>
                <Body className="text-sm text-gray-600 mb-2">
                  Calculated Refund Amount: MWK {selectedReturnDoc.refundAmount.toLocaleString()}
                </Body>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Refund Amount (Optional - leave empty to use calculated amount)
                </label>
                <Input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder={selectedReturnDoc.refundAmount.toLocaleString()}
                  min="0"
                  step="0.01"
                />
              </div>
            )}
          </div>
        }
        confirmText="Process Refund"
        cancelText="Cancel"
        isLoading={isProcessingRefund}
      />
    </div>
  );
};
