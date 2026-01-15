import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface ProductFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: 'available' | 'out-of-stock';
}

interface PaginationState {
  page: number;
  limit: number;
  total?: number;
  totalPages?: number;
}

interface ProductState {
  filters: ProductFilters;
  pagination: PaginationState;
  selectedProductId: string | null;
}

const initialState: ProductState = {
  filters: {},
  pagination: {
    page: 1,
    limit: 12,
  },
  selectedProductId: null,
};

const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<ProductFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    clearFilters: (state) => {
      state.filters = {};
      state.pagination.page = 1;
    },
    setPagination: (state, action: PayloadAction<Partial<PaginationState>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    setSelectedProduct: (state, action: PayloadAction<string | null>) => {
      state.selectedProductId = action.payload;
    },
  },
});

export const { setFilters, clearFilters, setPagination, setSelectedProduct } =
  productSlice.actions;
export default productSlice.reducer;
