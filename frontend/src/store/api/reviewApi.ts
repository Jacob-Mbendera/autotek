import { baseApi } from './baseApi';

export interface Review {
  _id: string;
  product: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  helpful: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

interface ProductReviewsResponse {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: ReviewStats;
}

interface CreateReviewRequest {
  rating: number;
  comment: string;
}

interface UpdateReviewRequest {
  rating?: number;
  comment?: string;
}

interface GetProductReviewsQueryParams {
  page?: number;
  limit?: number;
  sort?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';
}

export const reviewApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProductReviews: builder.query<ProductReviewsResponse, { productId: string; params?: GetProductReviewsQueryParams }>({
      query: ({ productId, params }) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.sort) queryParams.append('sort', params.sort);
        const queryString = queryParams.toString();
        return `/reviews/product/${productId}${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: (result, error, { productId }) => [{ type: 'Review', id: `product-${productId}` }],
    }),
    getUserReview: builder.query<{ review: Review }, string>({
      query: (productId) => `/reviews/product/${productId}/user`,
      providesTags: (result, error, productId) => [{ type: 'Review', id: `user-${productId}` }],
    }),
    createReview: builder.mutation<{ review: Review; message: string }, { productId: string; data: CreateReviewRequest }>({
      query: ({ productId, data }) => ({
        url: `/reviews/product/${productId}`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { productId }) => [
        { type: 'Review', id: `product-${productId}` },
        { type: 'Review', id: `user-${productId}` },
      ],
    }),
    updateReview: builder.mutation<{ review: Review; message: string }, { reviewId: string; data: UpdateReviewRequest }>({
      query: ({ reviewId, data }) => ({
        url: `/reviews/${reviewId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { reviewId }) => [{ type: 'Review', id: reviewId }],
    }),
    deleteReview: builder.mutation<{ message: string }, string>({
      query: (reviewId) => ({
        url: `/reviews/${reviewId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, reviewId) => [{ type: 'Review', id: reviewId }],
    }),
    markHelpful: builder.mutation<{ review: Review; message: string }, string>({
      query: (reviewId) => ({
        url: `/reviews/${reviewId}/helpful`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, reviewId) => [{ type: 'Review', id: reviewId }],
    }),
  }),
});

export const {
  useGetProductReviewsQuery,
  useGetUserReviewQuery,
  useCreateReviewMutation,
  useUpdateReviewMutation,
  useDeleteReviewMutation,
  useMarkHelpfulMutation,
} = reviewApi;
