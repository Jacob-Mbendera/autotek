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

interface CartState {
  items: CartItem[];
  savedForLater: CartItem[];
  totalAmount: number;
  totalItems: number;
}

const initialState: CartState = {
  items: [],
  savedForLater: [],
  totalAmount: 0,
  totalItems: 0,
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
    clearCart: (state) => {
      state.items = [];
      state.totalAmount = 0;
      state.totalItems = 0;
    },
    saveForLater: (state, action: PayloadAction<string>) => {
      const item = state.items.find((item) => item.productId === action.payload);
      if (item) {
        state.savedForLater.push(item);
        state.items = state.items.filter((item) => item.productId !== action.payload);
        const { totalAmount, totalItems } = calculateTotals(state.items);
        state.totalAmount = totalAmount;
        state.totalItems = totalItems;
      }
    },
    moveToCart: (state, action: PayloadAction<string>) => {
      const item = state.savedForLater.find((item) => item.productId === action.payload);
      if (item) {
        state.items.push(item);
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
      state.savedForLater = state.savedForLater.filter((item) => item.productId !== action.payload);
    },
  },
});

export const { addItem, removeItem, updateQuantity, clearCart, saveForLater, moveToCart, updateItemNote, removeFromSaved } = cartSlice.actions;
export default cartSlice.reducer;
