import { baseApi } from './baseApi';

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
  status: 'available' | 'out-of-stock';
  badge?: 'new' | 'sale' | 'featured';
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
  stockStatus?: 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
  sortBy?: 'price' | 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

interface CreateProductRequest {
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  supplier?: string;
  status?: 'available' | 'out-of-stock';
  images?: File[];
}

interface UpdateProductRequest extends Partial<CreateProductRequest> {
  images?: File[];
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
        if (params.stockStatus) searchParams.append('stockStatus', params.stockStatus);
        if (params.sortBy) searchParams.append('sortBy', params.sortBy);
        if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);

        return {
          url: `/products?${searchParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['Product'],
    }),
    getProduct: builder.query<{ product: Product }, string>({
      query: (id) => `/products/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Product', id }],
    }),
    createProduct: builder.mutation<{ product: Product }, CreateProductRequest>({
      query: (body) => {
        const formData = new FormData();
        Object.keys(body).forEach((key) => {
          if (key === 'images' && body.images) {
            body.images.forEach((file) => {
              formData.append('images', file);
            });
          } else if (body[key as keyof CreateProductRequest] !== undefined) {
            formData.append(key, String(body[key as keyof CreateProductRequest]));
          }
        });

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
          Object.keys(data).forEach((key) => {
            if (key === 'images' && data.images) {
              data.images.forEach((file) => {
                formData.append('images', file);
              });
            } else if (data[key as keyof UpdateProductRequest] !== undefined) {
              formData.append(key, String(data[key as keyof UpdateProductRequest]));
            }
          });

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
  }),
});

export const {
  useGetProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetCategoriesQuery,
} = productApi;
