import { useAppDispatch, useAppSelector } from '../store/types';
import {
  addItem as addGuestItem,
  removeItem as removeGuestItem,
  updateQuantity as updateGuestQuantity,
  updateItemNote as updateGuestItemNote,
  clearCart as clearGuestCart,
  type CartItem,
} from '../store/slices/cartSlice';
import {
  useGetCartQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveFromCartMutation,
  useClearCartMutation,
} from '../store/api/cartApi';
import { getPrimaryProductImage, getProductImageUrl } from '../utils/productImage';

export type UnifiedCartItem = CartItem;

export interface UseCartResult {
  items: UnifiedCartItem[];
  totalAmount: number;
  totalItems: number;
  isLoading: boolean;
  addItem: (item: UnifiedCartItem) => Promise<boolean>;
  removeItem: (productId: string) => Promise<boolean>;
  updateQuantity: (productId: string, quantity: number) => Promise<boolean>;
  updateItemNote: (productId: string, note: string) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
}

function calculateTotals(items: UnifiedCartItem[]) {
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  return { totalAmount, totalItems };
}

/**
 * Unified cart interface: server-backed (synced across devices) for logged-in
 * users, client-only (localStorage, this device only) for guests. Every
 * cart-mutating call site should go through this hook instead of dispatching
 * cartSlice actions or calling cartApi mutations directly, so both paths stay
 * consistent (optimistic updates, cross-tab broadcast, guest fallback).
 */
export function useCart(): UseCartResult {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const guestCart = useAppSelector((state) => state.cart);

  const { data: serverCartData, isLoading: isCartQueryLoading } = useGetCartQuery(undefined, {
    skip: !isAuthenticated,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const [addToCartMutation] = useAddToCartMutation();
  const [updateCartItemMutation] = useUpdateCartItemMutation();
  const [removeFromCartMutation] = useRemoveFromCartMutation();
  const [clearCartMutation] = useClearCartMutation();

  if (isAuthenticated) {
    const items: UnifiedCartItem[] = (serverCartData?.cart?.items ?? []).map((i) => ({
      productId: i.product._id,
      productName: i.product.name,
      price: i.priceAtAdd,
      quantity: i.quantity,
      image: getProductImageUrl(getPrimaryProductImage(i.product.images)),
      note: i.note,
      stock: i.product.stock,
      stockStatus:
        i.product.status === 'out-of-stock'
          ? 'out-of-stock'
          : i.product.stock && i.product.stock <= 5
            ? 'low-stock'
            : 'in-stock',
    }));
    const { totalAmount, totalItems } = calculateTotals(items);

    return {
      items,
      totalAmount,
      totalItems,
      isLoading: isCartQueryLoading,
      addItem: async (item) => {
        try {
          await addToCartMutation({ productId: item.productId, quantity: item.quantity }).unwrap();
          return true;
        } catch {
          return false;
        }
      },
      removeItem: async (productId) => {
        try {
          await removeFromCartMutation(productId).unwrap();
          return true;
        } catch {
          return false;
        }
      },
      updateQuantity: async (productId, quantity) => {
        try {
          await updateCartItemMutation({ productId, quantity }).unwrap();
          return true;
        } catch {
          return false;
        }
      },
      updateItemNote: async () => {
        // Notes are a client-only convenience today; server cart has no
        // dedicated update-note endpoint. No-op for logged-in users.
        return false;
      },
      clearCart: async () => {
        try {
          await clearCartMutation().unwrap();
          return true;
        } catch {
          return false;
        }
      },
    };
  }

  const { totalAmount, totalItems } = calculateTotals(guestCart.items);

  return {
    items: guestCart.items,
    totalAmount,
    totalItems,
    isLoading: false,
    addItem: async (item) => {
      dispatch(addGuestItem(item));
      return true;
    },
    removeItem: async (productId) => {
      dispatch(removeGuestItem(productId));
      return true;
    },
    updateQuantity: async (productId, quantity) => {
      dispatch(updateGuestQuantity({ productId, quantity }));
      return true;
    },
    updateItemNote: async (productId, note) => {
      dispatch(updateGuestItemNote({ productId, note }));
      return true;
    },
    clearCart: async () => {
      dispatch(clearGuestCart());
      return true;
    },
  };
}
