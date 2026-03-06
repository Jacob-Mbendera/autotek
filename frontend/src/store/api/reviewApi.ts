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
      providesTags: (result, _error, { productId }) => {
        // Provide tags for each individual review as well as the product reviews list
        const tags: Array<{ type: 'Review'; id: string }> = [{ type: 'Review', id: `product-${productId}` }];
        if (result?.reviews) {
          result.reviews.forEach(review => {
            tags.push({ type: 'Review', id: review._id });
          });
        }
        return tags;
      },
    }),
    getUserReview: builder.query<{ review: Review | null }, string>({
      query: (productId) => `/reviews/product/${productId}/user`,
      providesTags: (result, error, productId) => [{ type: 'Review', id: `user-${productId}` }],
      // Force refetch when user changes by not keeping unused data
      keepUnusedDataFor: 0,
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
    updateReview: builder.mutation<{ review: Review; message: string }, { reviewId: string; productId: string; data: UpdateReviewRequest }>({
      query: ({ reviewId, data }) => ({
        url: `/reviews/${reviewId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { reviewId, productId }) => [
        { type: 'Review', id: reviewId },
        { type: 'Review', id: `user-${productId}` },
        { type: 'Review', id: `product-${productId}` },
      ],
    }),
    deleteReview: builder.mutation<{ message: string }, { reviewId: string; productId: string }>({
      query: ({ reviewId }) => ({
        url: `/reviews/${reviewId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { reviewId, productId }) => [
        { type: 'Review', id: reviewId },
        { type: 'Review', id: `user-${productId}` },
        { type: 'Review', id: `product-${productId}` },
      ],
    }),
    markHelpful: builder.mutation<{ review: Review; message: string }, { reviewId: string; productId: string }>({
      query: ({ reviewId }) => ({
        url: `/reviews/${reviewId}/helpful`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { reviewId, productId }) => [
        { type: 'Review', id: reviewId },
        { type: 'Review', id: `product-${productId}` },
      ],
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
