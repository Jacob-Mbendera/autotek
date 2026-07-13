import { baseApi } from './baseApi';

export interface Coupon {
  _id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free-shipping';
  value: number;
  minOrderValue?: number;
  maxDiscount?: number;
  validFrom: string;
  validTo: string;
  usageLimit?: number;
  usageCount: number;
  userLimit?: number;
  applicableCategories?: string[];
  excludedProducts?: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ValidateCouponRequest {
  code: string;
  orderTotal: number;
  productIds?: string[];
  category?: string;
}

export interface ValidateCouponResponse {
  valid: boolean;
  coupon: {
    code: string;
    type: string;
    value: number;
  };
  discount: number;
  finalTotal: number;
  message: string;
}

export interface CouponsResponse {
  coupons: Coupon[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const couponApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    validateCoupon: builder.mutation<ValidateCouponResponse, ValidateCouponRequest>({
      query: (body) => ({
        url: '/coupons/validate',
        method: 'POST',
        body,
      }),
    }),
    getAllCoupons: builder.query<CouponsResponse, { page?: number; limit?: number; active?: boolean }>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.active !== undefined) searchParams.append('active', params.active.toString());

        return {
          url: `/coupons/admin?${searchParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['Coupon'],
    }),
    getCoupon: builder.query<{ coupon: Coupon }, string>({
      query: (id) => `/coupons/admin/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Coupon', id }],
    }),
    createCoupon: builder.mutation<{ coupon: Coupon }, Partial<Coupon>>({
      query: (body) => ({
        url: '/coupons/admin',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Coupon'],
    }),
    updateCoupon: builder.mutation<{ coupon: Coupon }, { id: string; data: Partial<Coupon> }>({
      query: ({ id, data }) => ({
        url: `/coupons/admin/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Coupon', id }, 'Coupon'],
    }),
    deleteCoupon: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/coupons/admin/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Coupon'],
    }),
  }),
});

export const {
  useValidateCouponMutation,
  useGetAllCouponsQuery,
  useGetCouponQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useDeleteCouponMutation,
} = couponApi;
