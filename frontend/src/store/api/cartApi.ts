import { baseApi } from './baseApi';
import type { Product } from './productApi';
import { broadcastClientSync } from '../../utils/crossTabSync';

export interface ServerCartItem {
  product: Product;
  quantity: number;
  priceAtAdd: number;
  note?: string;
}

export interface ServerCart {
  _id: string;
  user: string;
  items: ServerCartItem[];
  createdAt: string;
  updatedAt: string;
}

export const cartApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCart: builder.query<{ cart: ServerCart }, void>({
      query: () => '/cart',
      providesTags: ['Cart'],
    }),
    addToCart: builder.mutation<
      { cart: ServerCart; message: string },
      { productId: string; quantity?: number }
    >({
      query: (body) => ({
        url: '/cart',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Cart'],
      async onQueryStarted({ productId, quantity }, { dispatch, queryFulfilled, getState }) {
        const state = getState() as any;
        const productCache = state.api.queries;
        let productToAdd: Product | undefined;

        for (const key in productCache) {
          if (key.startsWith('getProducts') || key.startsWith('getProduct')) {
            const cached = productCache[key];
            if (cached?.data?.products) {
              productToAdd = cached.data.products.find((p: Product) => p._id === productId);
            } else if (cached?.data?.product?._id === productId) {
              productToAdd = cached.data.product;
            }
            if (productToAdd) break;
          }
        }

        const patchResult = dispatch(
          cartApi.util.updateQueryData('getCart', undefined, (draft) => {
            if (draft.cart && productToAdd) {
              const existing = draft.cart.items.find((i) => i.product._id === productId);
              if (existing) {
                existing.quantity += quantity ?? 1;
              } else {
                draft.cart.items.push({
                  product: productToAdd,
                  quantity: quantity ?? 1,
                  priceAtAdd: productToAdd.price,
                });
              }
            }
          })
        );

        try {
          const { data } = await queryFulfilled;
          dispatch(
            cartApi.util.updateQueryData('getCart', undefined, (draft) => {
              draft.cart = data.cart;
            })
          );
          broadcastClientSync('cart');
        } catch {
          patchResult.undo();
        }
      },
    }),
    updateCartItem: builder.mutation<
      { cart: ServerCart; message: string },
      { productId: string; quantity: number }
    >({
      query: ({ productId, quantity }) => ({
        url: `/cart/${productId}`,
        method: 'PATCH',
        body: { quantity },
      }),
      invalidatesTags: ['Cart'],
      async onQueryStarted({ productId, quantity }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          cartApi.util.updateQueryData('getCart', undefined, (draft) => {
            if (!draft.cart) return;
            if (quantity <= 0) {
              draft.cart.items = draft.cart.items.filter((i) => i.product._id !== productId);
            } else {
              const item = draft.cart.items.find((i) => i.product._id === productId);
              if (item) item.quantity = quantity;
            }
          })
        );

        try {
          const { data } = await queryFulfilled;
          dispatch(
            cartApi.util.updateQueryData('getCart', undefined, (draft) => {
              draft.cart = data.cart;
            })
          );
          broadcastClientSync('cart');
        } catch {
          patchResult.undo();
        }
      },
    }),
    removeFromCart: builder.mutation<{ cart: ServerCart; message: string }, string>({
      query: (productId) => ({
        url: `/cart/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
      async onQueryStarted(productId, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          cartApi.util.updateQueryData('getCart', undefined, (draft) => {
            if (draft.cart) {
              draft.cart.items = draft.cart.items.filter((i) => i.product._id !== productId);
            }
          })
        );

        try {
          const { data } = await queryFulfilled;
          dispatch(
            cartApi.util.updateQueryData('getCart', undefined, (draft) => {
              draft.cart = data.cart;
            })
          );
          broadcastClientSync('cart');
        } catch {
          patchResult.undo();
        }
      },
    }),
    clearCart: builder.mutation<{ cart: ServerCart; message: string }, void>({
      query: () => ({
        url: '/cart',
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          cartApi.util.updateQueryData('getCart', undefined, (draft) => {
            if (draft.cart) {
              draft.cart.items = [];
            }
          })
        );

        try {
          const { data } = await queryFulfilled;
          dispatch(
            cartApi.util.updateQueryData('getCart', undefined, (draft) => {
              draft.cart = data.cart;
            })
          );
          broadcastClientSync('cart');
        } catch {
          patchResult.undo();
        }
      },
    }),
    mergeCart: builder.mutation<
      { cart: ServerCart; message: string },
      { items: Array<{ productId: string; quantity: number; price: number }> }
    >({
      query: (body) => ({
        url: '/cart/merge',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Cart'],
    }),
  }),
});

export const {
  useGetCartQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveFromCartMutation,
  useClearCartMutation,
  useMergeCartMutation,
} = cartApi;
