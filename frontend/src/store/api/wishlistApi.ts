import { baseApi } from './baseApi';
import type { Product } from './productApi';
import { broadcastClientSync } from '../../utils/crossTabSync';

export interface Wishlist {
  _id: string;
  user: string;
  products: Product[];
  createdAt: string;
  updatedAt: string;
}

export const wishlistApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWishlist: builder.query<{ wishlist: Wishlist }, void>({
      query: () => '/wishlist',
      providesTags: ['Wishlist'],
    }),
    addToWishlist: builder.mutation<{ wishlist: Wishlist; message: string }, { productId: string }>({
      query: (body) => ({
        url: '/wishlist',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Wishlist'],
      async onQueryStarted({ productId }, { dispatch, queryFulfilled, getState }) {
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
          wishlistApi.util.updateQueryData('getWishlist', undefined, (draft) => {
            if (draft.wishlist && productToAdd) {
              const exists = draft.wishlist.products.some((p) => p._id === productId);
              if (!exists) {
                draft.wishlist.products.push(productToAdd);
              }
            }
          })
        );

        try {
          const { data } = await queryFulfilled;
          dispatch(
            wishlistApi.util.updateQueryData('getWishlist', undefined, (draft) => {
              draft.wishlist = data.wishlist;
            })
          );
          broadcastClientSync('wishlist');
        } catch {
          patchResult.undo();
        }
      },
    }),
    removeFromWishlist: builder.mutation<{ wishlist: Wishlist; message: string }, string>({
      query: (productId) => ({
        url: `/wishlist/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Wishlist'],
      async onQueryStarted(productId, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          wishlistApi.util.updateQueryData('getWishlist', undefined, (draft) => {
            if (draft.wishlist) {
              draft.wishlist.products = draft.wishlist.products.filter(
                (p) => p._id !== productId
              );
            }
          })
        );

        try {
          const { data } = await queryFulfilled;
          dispatch(
            wishlistApi.util.updateQueryData('getWishlist', undefined, (draft) => {
              draft.wishlist = data.wishlist;
            })
          );
          broadcastClientSync('wishlist');
        } catch {
          patchResult.undo();
        }
      },
    }),
    clearWishlist: builder.mutation<{ wishlist: Wishlist; message: string }, void>({
      query: () => ({
        url: '/wishlist',
        method: 'DELETE',
      }),
      invalidatesTags: ['Wishlist'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          wishlistApi.util.updateQueryData('getWishlist', undefined, (draft) => {
            if (draft.wishlist) {
              draft.wishlist.products = [];
            }
          })
        );

        try {
          const { data } = await queryFulfilled;
          dispatch(
            wishlistApi.util.updateQueryData('getWishlist', undefined, (draft) => {
              draft.wishlist = data.wishlist;
            })
          );
          broadcastClientSync('wishlist');
        } catch {
          patchResult.undo();
        }
      },
    }),
  }),
});

export const {
  useGetWishlistQuery,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
  useClearWishlistMutation,
} = wishlistApi;
