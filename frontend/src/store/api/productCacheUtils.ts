import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { productApi, type Product } from './productApi';

type AppDispatch = ThunkDispatch<RootState, unknown, UnknownAction>;

/** Sync assign-media / set-primary responses into list and detail caches immediately. */
export function patchProductInCaches(
  dispatch: AppDispatch,
  getState: () => RootState,
  product: Product
): void {
  const state = getState();
  const detailEntry = productApi.endpoints.getProduct.select(product._id)(state);
  if (detailEntry?.data) {
    dispatch(
      productApi.util.updateQueryData('getProduct', product._id, (draft) => {
        draft.product = product;
      })
    );
  }

  const listArgsList = productApi.util.selectCachedArgsForQuery(state, 'getProducts');
  for (const args of listArgsList) {
    const listEntry = productApi.endpoints.getProducts.select(args)(state);
    const products = listEntry?.data?.products;
    if (!products?.some((p) => p._id === product._id)) continue;

    dispatch(
      productApi.util.updateQueryData('getProducts', args, (draft) => {
        const idx = draft.products.findIndex((p) => p._id === product._id);
        if (idx >= 0) {
          draft.products[idx] = product;
        }
      })
    );
  }
}
