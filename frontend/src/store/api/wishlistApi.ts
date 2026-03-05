import { baseApi } from './baseApi';
import type { Product } from './productApi';

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
      // Optimistic update: immediately update cache before API responds
      async onQueryStarted({ productId }, { dispatch, queryFulfilled, getState }) {
        // Get the product details from the product cache if available
        const state = getState() as any;
        const productCache = state.api.queries;
        let productToAdd: Product | undefined;

        // Try to find the product in the cache
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

        // Optimistically update the wishlist cache
        const patchResult = dispatch(
          wishlistApi.util.updateQueryData('getWishlist', undefined, (draft) => {
            if (draft.wishlist && productToAdd) {
              // Add product if not already in wishlist
              const exists = draft.wishlist.products.some((p) => p._id === productId);
              if (!exists) {
                draft.wishlist.products.push(productToAdd);
              }
            }
          })
        );

        try {
          const { data } = await queryFulfilled;
          // Update with actual server data
          dispatch(
            wishlistApi.util.updateQueryData('getWishlist', undefined, (draft) => {
              draft.wishlist = data.wishlist;
            })
          );
        } catch {
          // Revert optimistic update on error
          patchResult.undo();
        }
      },
    }),
    removeFromWishlist: builder.mutation<{ wishlist: Wishlist; message: string }, string>({
      query: (productId) => ({
        url: `/wishlist/${productId}`,
        method: 'DELETE',
      }),
      // Optimistic update: immediately remove from cache before API responds
      async onQueryStarted(productId, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          wishlistApi.util.updateQueryData('getWishlist', undefined, (draft) => {
            if (draft.wishlist) {
              // Remove product from wishlist
              draft.wishlist.products = draft.wishlist.products.filter(
                (p) => p._id !== productId
              );
            }
          })
        );

        try {
          const { data } = await queryFulfilled;
          // Update with actual server data
          dispatch(
            wishlistApi.util.updateQueryData('getWishlist', undefined, (draft) => {
              draft.wishlist = data.wishlist;
            })
          );
        } catch {
          // Revert optimistic update on error
          patchResult.undo();
        }
      },
    }),
    clearWishlist: builder.mutation<{ wishlist: Wishlist; message: string }, void>({
      query: () => ({
        url: '/wishlist',
        method: 'DELETE',
      }),
      // Optimistic update: immediately clear cache before API responds
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          wishlistApi.util.updateQueryData('getWishlist', undefined, (draft) => {
            if (draft.wishlist) {
              draft.wishlist.products = [];
            }
          })
        );

        try {
          const { data } = await queryFulfilled;
          // Update with actual server data
          dispatch(
            wishlistApi.util.updateQueryData('getWishlist', undefined, (draft) => {
              draft.wishlist = data.wishlist;
            })
          );
        } catch {
          // Revert optimistic update on error
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
