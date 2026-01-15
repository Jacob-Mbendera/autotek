import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

interface CurrentOrder {
  items: OrderItem[];
  shippingAddress: string;
  paymentMethod?: string;
  totalAmount: number;
}

interface OrderState {
  currentOrder: CurrentOrder | null;
}

const initialState: OrderState = {
  currentOrder: null,
};

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    setCurrentOrder: (state, action: PayloadAction<CurrentOrder | null>) => {
      state.currentOrder = action.payload;
    },
    updateCurrentOrder: (state, action: PayloadAction<Partial<CurrentOrder>>) => {
      if (state.currentOrder) {
        state.currentOrder = { ...state.currentOrder, ...action.payload };
      }
    },
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
  },
});

export const { setCurrentOrder, updateCurrentOrder, clearCurrentOrder } = orderSlice.actions;
export default orderSlice.reducer;
