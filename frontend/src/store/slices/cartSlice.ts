import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  image?: string;
  note?: string;
  stock?: number;
  stockStatus?: 'in-stock' | 'low-stock' | 'out-of-stock';
}

interface AppliedCoupon {
  code: string;
  discount: number;
  type: string;
  value: number;
}

export interface CartState {
  items: CartItem[];
  savedForLater: CartItem[];
  totalAmount: number;
  totalItems: number;
  appliedCoupon?: AppliedCoupon;
  discount: number;
}

const initialState: CartState = {
  items: [],
  savedForLater: [],
  totalAmount: 0,
  totalItems: 0,
  discount: 0,
};

const calculateTotals = (items: CartItem[]) => {
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  return { totalAmount, totalItems };
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Ensure savedForLater exists (for migration from old cart state)
    _ensureSavedForLater: (state) => {
      if (!state.savedForLater) {
        state.savedForLater = [];
      }
    },
    addItem: (state, action: PayloadAction<CartItem>) => {
      const existingItem = state.items.find(
        (item) => item.productId === action.payload.productId
      );

      if (existingItem) {
        existingItem.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }

      const { totalAmount, totalItems } = calculateTotals(state.items);
      state.totalAmount = totalAmount;
      state.totalItems = totalItems;
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.productId !== action.payload);
      const { totalAmount, totalItems } = calculateTotals(state.items);
      state.totalAmount = totalAmount;
      state.totalItems = totalItems;
    },
    updateQuantity: (state, action: PayloadAction<{ productId: string; quantity: number }>) => {
      const item = state.items.find((item) => item.productId === action.payload.productId);
      if (item) {
        if (action.payload.quantity <= 0) {
          state.items = state.items.filter((item) => item.productId !== action.payload.productId);
        } else {
          item.quantity = action.payload.quantity;
        }
        const { totalAmount, totalItems } = calculateTotals(state.items);
        state.totalAmount = totalAmount;
        state.totalItems = totalItems;
      }
    },
    saveForLater: (state, action: PayloadAction<string>) => {
      // Ensure savedForLater exists (for migration from old cart state)
      if (!state.savedForLater) {
        state.savedForLater = [];
      }
      const item = state.items.find((item) => item.productId === action.payload);
      if (item) {
        state.savedForLater.push(item);
        state.items = state.items.filter((item) => item.productId !== action.payload);
        const { totalAmount, totalItems } = calculateTotals(state.items);
        state.totalAmount = totalAmount;
        state.totalItems = totalItems;
      }
    },
    // Like saveForLater, but takes the full item rather than looking it up in
    // state.items — needed when the item actually lives in the server cart
    // (logged-in users), since "saved for later" itself stays client-only.
    addToSavedForLater: (state, action: PayloadAction<CartItem>) => {
      if (!state.savedForLater) {
        state.savedForLater = [];
      }
      const alreadySaved = state.savedForLater.some(
        (item) => item.productId === action.payload.productId
      );
      if (!alreadySaved) {
        state.savedForLater.push(action.payload);
      }
    },
    moveToCart: (state, action: PayloadAction<string>) => {
      // Ensure savedForLater exists (for migration from old cart state)
      if (!state.savedForLater) {
        state.savedForLater = [];
      }
      const item = state.savedForLater.find((item) => item.productId === action.payload);
      if (item) {
        const existingInCart = state.items.find((cartItem) => cartItem.productId === item.productId);
        if (existingInCart) {
          existingInCart.quantity += item.quantity;
        } else {
          state.items.push(item);
        }
        state.savedForLater = state.savedForLater.filter((item) => item.productId !== action.payload);
        const { totalAmount, totalItems } = calculateTotals(state.items);
        state.totalAmount = totalAmount;
        state.totalItems = totalItems;
      }
    },
    updateItemNote: (state, action: PayloadAction<{ productId: string; note: string }>) => {
      const item = state.items.find((item) => item.productId === action.payload.productId);
      if (item) {
        item.note = action.payload.note;
      }
    },
    removeFromSaved: (state, action: PayloadAction<string>) => {
      // Ensure savedForLater exists (for migration from old cart state)
      if (!state.savedForLater) {
        state.savedForLater = [];
      }
      state.savedForLater = state.savedForLater.filter((item) => item.productId !== action.payload);
    },
    applyCoupon: (state, action: PayloadAction<AppliedCoupon>) => {
      state.appliedCoupon = action.payload;
      state.discount = action.payload.discount;
    },
    removeCoupon: (state) => {
      state.appliedCoupon = undefined;
      state.discount = 0;
    },
    clearCart: (state) => {
      state.items = [];
      state.savedForLater = state.savedForLater || [];
      state.totalAmount = 0;
      state.totalItems = 0;
      state.appliedCoupon = undefined;
      state.discount = 0;
    },
    replaceCartState: (state, action: PayloadAction<CartState>) => {
      state.items = action.payload.items ?? [];
      state.savedForLater = action.payload.savedForLater ?? [];
      state.totalAmount = action.payload.totalAmount ?? 0;
      state.totalItems = action.payload.totalItems ?? 0;
      state.appliedCoupon = action.payload.appliedCoupon;
      state.discount = action.payload.discount ?? 0;
    },
  },
});

export const {
  addItem,
  removeItem,
  updateQuantity,
  clearCart,
  saveForLater,
  addToSavedForLater,
  moveToCart,
  updateItemNote,
  removeFromSaved,
  applyCoupon,
  removeCoupon,
  replaceCartState,
} = cartSlice.actions;
export default cartSlice.reducer;
