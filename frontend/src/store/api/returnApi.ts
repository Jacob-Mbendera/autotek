import { baseApi } from './baseApi';
import type { ReturnStatus, ReturnReason, RefundMethod, RefundStatus } from '../../../../shared/types';

export interface ReturnItem {
  product: {
    _id: string;
    name: string;
    images: string[];
  } | null;
  quantity: number;
  reason: string;
}

export interface Return {
  _id: string;
  order: string | {
    _id: string;
    items: any[];
    totalAmount: number;
    status: string;
  };
  user?: string | {
    _id: string;
    name: string;
    email: string;
  };
  guestInfo?: {
    email: string;
    name: string;
    phone: string;
  };
  items: ReturnItem[];
  returnReason: ReturnReason;
  comments?: string;
  images: string[];
  status: ReturnStatus;
  refundAmount: number;
  refundMethod: RefundMethod;
  refundStatus: RefundStatus;
  shippingLabel?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateReturnRequest {
  orderId: string;
  items: Array<{
    productId: string;
    quantity: number;
    reason: string;
  }>;
  returnReason: ReturnReason;
  comments?: string;
  refundMethod?: RefundMethod;
  guestInfo?: {
    email: string;
    name: string;
    phone: string;
  };
  images?: File[];
}

interface ReturnsResponse {
  returns: Return[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface ReturnsQueryParams {
  email?: string;
  status?: ReturnStatus;
  orderId?: string;
  page?: number;
  limit?: number;
}

function returnInvalidationTags(returnId?: string) {
  return [
    { type: 'Return' as const, id: 'LIST' },
    'Return' as const,
    ...(returnId ? [{ type: 'Return' as const, id: returnId }] : []),
  ];
}

interface RejectReturnRequest {
  adminNotes: string;
}

interface ProcessRefundRequest {
  refundAmount?: number;
}

export const returnApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    createReturn: builder.mutation<{ return: Return; message: string }, CreateReturnRequest>({
      query: (data) => {
        const formData = new FormData();
        formData.append('orderId', data.orderId);
        formData.append('returnReason', data.returnReason);
        formData.append('items', JSON.stringify(data.items));
        if (data.comments) formData.append('comments', data.comments);
        if (data.refundMethod) formData.append('refundMethod', data.refundMethod);
        if (data.guestInfo) {
          formData.append('guestInfo', JSON.stringify(data.guestInfo));
        }
        if (data.images && data.images.length > 0) {
          data.images.forEach((file) => {
            formData.append('images', file);
          });
        }

        return {
          url: '/returns',
          method: 'POST',
          body: formData,
          // Don't set Content-Type - browser will set it with boundary for FormData
          headers: {},
        };
      },
      invalidatesTags: (result) => returnInvalidationTags(result?.return?._id),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const created = data.return;
          if (!created?._id) return;

          dispatch(
            baseApi.util.invalidateTags(returnInvalidationTags(created._id))
          );
          dispatch(
            returnApi.util.upsertQueryData(
              'getReturn',
              { id: created._id },
              { return: created }
            )
          );
        } catch {
          /* ignore */
        }
      },
    }),
    getReturns: builder.query<ReturnsResponse, ReturnsQueryParams | void>({
      query: (params) => {
        if (!params) {
          return '/returns';
        }
        const searchParams = new URLSearchParams();
        if (params.email) searchParams.append('email', params.email);
        if (params.status) searchParams.append('status', params.status);
        if (params.orderId) searchParams.append('orderId', params.orderId);
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());

        return {
          url: `/returns?${searchParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.returns.map((r) => ({ type: 'Return' as const, id: r._id })),
              { type: 'Return' as const, id: 'LIST' },
              'Return',
            ]
          : [{ type: 'Return' as const, id: 'LIST' }, 'Return'],
    }),
    getReturn: builder.query<{ return: Return }, { id: string; email?: string }>({
      query: ({ id, email }) => {
        const params = email ? `?email=${encodeURIComponent(email)}` : '';
        return `/returns/${id}${params}`;
      },
      providesTags: (_result, _error, { id }) => [
        { type: 'Return', id },
        { type: 'Return', id: 'LIST' },
      ],
    }),
    cancelReturn: builder.mutation<{ return: Return; message: string }, { id: string; email?: string }>({
      query: ({ id, email }) => {
        const params = email ? `?email=${encodeURIComponent(email)}` : '';
        return {
          url: `/returns/${id}/cancel${params}`,
          method: 'PUT',
        };
      },
      invalidatesTags: (_result, _error, { id }) => returnInvalidationTags(id),
      async onQueryStarted({ id, email }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(baseApi.util.invalidateTags(returnInvalidationTags(id)));

          const cancelled = data.return;
          if (cancelled) {
            dispatch(
              returnApi.util.updateQueryData(
                'getReturn',
                { id, email },
                (draft) => {
                  draft.return = cancelled;
                }
              )
            );
            dispatch(
              returnApi.util.updateQueryData(
                'getReturn',
                { id },
                (draft) => {
                  draft.return = cancelled;
                }
              )
            );
          } else {
            dispatch(
              returnApi.util.updateQueryData(
                'getReturn',
                { id, email },
                (draft) => {
                  draft.return.status = 'cancelled';
                }
              )
            );
          }
        } catch {
          /* ignore */
        }
      },
    }),
    // Admin endpoints
    getAllReturns: builder.query<ReturnsResponse, { status?: ReturnStatus; startDate?: string; endDate?: string; orderId?: string; page?: number; limit?: number } | void>({
      query: (params) => {
        if (!params) {
          return '/admin/returns';
        }
        const searchParams = new URLSearchParams();
        if (params.status) searchParams.append('status', params.status);
        if (params.startDate) searchParams.append('startDate', params.startDate);
        if (params.endDate) searchParams.append('endDate', params.endDate);
        if (params.orderId) searchParams.append('orderId', params.orderId);
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());

        return {
          url: `/admin/returns?${searchParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.returns.map((r) => ({ type: 'Return' as const, id: r._id })),
              { type: 'Return' as const, id: 'LIST' },
              'Return',
            ]
          : [{ type: 'Return' as const, id: 'LIST' }, 'Return'],
    }),
    approveReturn: builder.mutation<{ return: Return; message: string }, string>({
      query: (id) => ({
        url: `/admin/returns/${id}/approve`,
        method: 'PUT',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Return', id },
        { type: 'Return', id: 'LIST' },
        'Return',
      ],
    }),
    rejectReturn: builder.mutation<{ return: Return; message: string }, { id: string; data: RejectReturnRequest }>({
      query: ({ id, data }) => ({
        url: `/admin/returns/${id}/reject`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Return', id },
        { type: 'Return', id: 'LIST' },
        'Return',
      ],
    }),
    processRefund: builder.mutation<{ return: Return; message: string }, { id: string; data?: ProcessRefundRequest }>({
      query: ({ id, data }) => ({
        url: `/admin/returns/${id}/refund`,
        method: 'POST',
        body: data || {},
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Return', id },
        { type: 'Return', id: 'LIST' },
        'Return',
      ],
    }),
    completeReturnRefund: builder.mutation<{ return: Return; message: string }, { id: string; notes?: string }>({
      query: ({ id, notes }) => ({
        url: `/admin/returns/${id}/complete-refund`,
        method: 'PATCH',
        body: notes ? { notes } : {},
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Return', id },
        { type: 'Return', id: 'LIST' },
        'Return',
        'AdminRefunds',
        'Order',
        'Admin',
        'Payment',
      ],
    }),
  }),
});

export const {
  useCreateReturnMutation,
  useGetReturnsQuery,
  useGetReturnQuery,
  useCancelReturnMutation,
  useGetAllReturnsQuery,
  useApproveReturnMutation,
  useRejectReturnMutation,
  useProcessRefundMutation,
  useCompleteReturnRefundMutation,
} = returnApi;
