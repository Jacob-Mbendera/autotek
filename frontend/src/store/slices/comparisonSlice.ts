import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Product } from '../api/productApi';

interface ComparisonState {
  products: Product[];
  maxProducts: number;
}

const initialState: ComparisonState = {
  products: [],
  maxProducts: 4,
};

const comparisonSlice = createSlice({
  name: 'comparison',
  initialState,
  reducers: {
    addToComparison: (state, action: PayloadAction<Product>) => {
      const product = action.payload;
      
      // Check if product is already in comparison
      if (state.products.some((p) => p._id === product._id)) {
        return;
      }
      
      // Check if we've reached the max
      if (state.products.length >= state.maxProducts) {
        // Remove the first product (FIFO)
        state.products.shift();
      }
      
      state.products.push(product);
    },
    removeFromComparison: (state, action: PayloadAction<string>) => {
      state.products = state.products.filter((p) => p._id !== action.payload);
    },
    clearComparison: (state) => {
      state.products = [];
    },
    replaceComparisonState: (
      state,
      action: PayloadAction<{ products: Product[]; maxProducts?: number }>
    ) => {
      state.products = action.payload.products ?? [];
      if (action.payload.maxProducts != null) {
        state.maxProducts = action.payload.maxProducts;
      }
    },
  },
});

export const {
  addToComparison,
  removeFromComparison,
  clearComparison,
  replaceComparisonState,
} = comparisonSlice.actions;
export default comparisonSlice.reducer;
