import { baseApi } from './baseApi';
import { patchProductInCaches } from './productCacheUtils';
import type { RootState } from '../index';
import type {
  ProductCompatibilityEntry,
  ProductFitmentStatus,
} from '@shared/types';

export interface ProductImage {
  url: string;
  blurDataUrl?: string;
}

/** Legacy APIs may still return a plain URL string per slot until re-saved. */
export type ProductImageField = ProductImage | string;

export interface Product {
  _id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  images: ProductImageField[];
  supplier?: string;
  brand?: string;
  oemPartNumber?: string;
  alternatePartNumbers: string[];
  isUniversal: boolean;
  compatibility: ProductCompatibilityEntry[];
  fitmentStatus: ProductFitmentStatus;
  status: 'available' | 'out-of-stock';
  badge?: 'new' | 'sale' | 'featured';
  averageRating?: number;
  reviewCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface ProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ProductsQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: 'available' | 'out-of-stock';
  badge?: 'new' | 'sale' | 'featured';
  stockStatus?: 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
  sortBy?: 'price' | 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  missingImages?: boolean;
  make?: string;
  model?: string;
  year?: number;
  engine?: string;
  includeUniversal?: boolean;
}

interface CreateProductRequest {
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  supplier?: string;
  brand?: string;
  oemPartNumber?: string;
  alternatePartNumbers?: string[];
  isUniversal?: boolean;
  compatibility?: ProductCompatibilityEntry[];
  fitmentStatus?: ProductFitmentStatus;
  status?: 'available' | 'out-of-stock';
  badge?: 'new' | 'sale' | 'featured';
  images?: File[];
}

interface UpdateProductRequest extends Partial<CreateProductRequest> {
  images?: File[];
  /** The product's updatedAt as last seen by this client — lets the server reject a save based on a stale snapshot. */
  expectedUpdatedAt?: string;
}

const appendProductFormData = (
  formData: FormData,
  body: CreateProductRequest | UpdateProductRequest
) => {
  Object.keys(body).forEach((key) => {
    const value = body[key as keyof CreateProductRequest];
    if (value === undefined) return;

    if (key === 'images' && Array.isArray(value)) {
      (value as File[]).forEach((file) => formData.append('images', file));
      return;
    }

    if (key === 'compatibility' || key === 'alternatePartNumbers') {
      formData.append(key, JSON.stringify(value));
      return;
    }

    formData.append(key, String(value));
  });
};

export interface MediaAsset {
  _id: string;
  url: string;
  blurDataUrl?: string;
  originalName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MediaAssetsListResponse {
  assets: MediaAsset[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MediaLibraryUploadRow {
  originalName: string;
  ok: boolean;
  error?: string;
  asset?: MediaAsset;
}

export interface MediaLibraryUploadResponse {
  results: MediaLibraryUploadRow[];
  summary: { total: number; ok: number; failed: number };
}

export interface ProductSuggestionParams {
  make?: string;
  model?: string;
  year?: number;
  engine?: string;
  productName?: string;
  partNumber?: string;
  category?: string;
  limit?: number;
}

export interface ProductSuggestion {
  product: Product;
  confidence: 'exact' | 'strong' | 'possible';
  reasons: string[];
  score: number;
}

export interface ProductSuggestionsResponse {
  suggestions: ProductSuggestion[];
}

export const productApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query<ProductsResponse, ProductsQueryParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.category) searchParams.append('category', params.category);
        if (params.search) searchParams.append('search', params.search);
        if (params.minPrice) searchParams.append('minPrice', params.minPrice.toString());
        if (params.maxPrice) searchParams.append('maxPrice', params.maxPrice.toString());
        if (params.status) searchParams.append('status', params.status);
        if (params.badge) searchParams.append('badge', params.badge);
        if (params.stockStatus) searchParams.append('stockStatus', params.stockStatus);
        if (params.sortBy) searchParams.append('sortBy', params.sortBy);
        if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);
        if (params.missingImages) searchParams.append('missingImages', 'true');
        if (params.make) searchParams.append('make', params.make);
        if (params.model) searchParams.append('model', params.model);
        if (params.year !== undefined) searchParams.append('year', params.year.toString());
        if (params.engine) searchParams.append('engine', params.engine);
        if (params.includeUniversal !== undefined) {
          searchParams.append('includeUniversal', String(params.includeUniversal));
        }

        return {
          url: `/products?${searchParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.products.map((p) => ({ type: 'Product' as const, id: p._id })),
              { type: 'Product' as const, id: 'LIST' },
            ]
          : [{ type: 'Product' as const, id: 'LIST' }],
    }),
    getProductSuggestions: builder.query<ProductSuggestionsResponse, ProductSuggestionParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.make) searchParams.append('make', params.make);
        if (params.model) searchParams.append('model', params.model);
        if (params.year !== undefined) searchParams.append('year', String(params.year));
        if (params.engine) searchParams.append('engine', params.engine);
        if (params.productName) searchParams.append('productName', params.productName);
        if (params.partNumber) searchParams.append('partNumber', params.partNumber);
        if (params.category) searchParams.append('category', params.category);
        if (params.limit) searchParams.append('limit', String(params.limit));
        return {
          url: `/products/suggestions?${searchParams.toString()}`,
          method: 'GET',
        };
      },
    }),
    getProduct: builder.query<{ product: Product }, string>({
      query: (id) => `/products/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Product', id }],
    }),
    createProduct: builder.mutation<{ product: Product }, CreateProductRequest>({
      query: (body) => {
        const formData = new FormData();
        appendProductFormData(formData, body);

        return {
          url: '/products',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Product'],
    }),
    updateProduct: builder.mutation<{ product: Product }, { id: string; data: UpdateProductRequest }>(
      {
        query: ({ id, data }) => {
          const formData = new FormData();
          appendProductFormData(formData, data);

          return {
            url: `/products/${id}`,
            method: 'PUT',
            body: formData,
          };
        },
        invalidatesTags: (_result, _error, { id }) => [{ type: 'Product', id }, 'Product'],
      }
    ),
    deleteProduct: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Product'],
    }),
    getCategories: builder.query<{ categories: Array<{ name: string; count: number }> }, void>({
      query: () => '/products/categories',
      providesTags: ['Product'],
    }),
    getMediaAssets: builder.query<
      MediaAssetsListResponse,
      { page?: number; limit?: number; q?: string }
    >({
      query: ({ page = 1, limit = 12, q = '' }) => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(limit));
        if (q.trim()) params.set('q', q.trim());
        return {
          url: `/admin/media-assets?${params.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['MediaAsset'],
    }),
    uploadMediaLibrary: builder.mutation<MediaLibraryUploadResponse, { files: File[] }>({
      query: ({ files }) => {
        const formData = new FormData();
        files.forEach((f) => formData.append('files', f));
        return {
          url: '/admin/media-assets',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['MediaAsset'],
    }),
    deleteMediaAsset: builder.mutation<
      { message: string },
      string
    >({
      query: (id) => ({
        url: `/admin/media-assets/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['MediaAsset'],
    }),
    assignMediaToProduct: builder.mutation<
      { product: Product },
      { productId: string; assets: ProductImage[] }
    >({
      query: ({ productId, assets }) => ({
        url: `/products/${productId}/assign-media`,
        method: 'POST',
        body: { assets },
      }),
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'Product', id: productId },
        { type: 'Product', id: 'LIST' },
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
        try {
          const { data } = await queryFulfilled;
          patchProductInCaches(dispatch, getState as () => RootState, data.product);
        } catch {
          // mutation failed; invalidation skipped
        }
      },
    }),
    setPrimaryProductImage: builder.mutation<
      { product: Product },
      { productId: string; url: string }
    >({
      query: ({ productId, url }) => ({
        url: `/products/${productId}/primary-image`,
        method: 'PATCH',
        body: { url },
      }),
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'Product', id: productId },
        { type: 'Product', id: 'LIST' },
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
        try {
          const { data } = await queryFulfilled;
          patchProductInCaches(dispatch, getState as () => RootState, data.product);
        } catch {
          // mutation failed; invalidation skipped
        }
      },
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductSuggestionsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetCategoriesQuery,
  useGetMediaAssetsQuery,
  useUploadMediaLibraryMutation,
  useDeleteMediaAssetMutation,
  useAssignMediaToProductMutation,
  useSetPrimaryProductImageMutation,
} = productApi;
