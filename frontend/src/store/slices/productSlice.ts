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

type ViewMode = 'grid' | 'list';

interface ProductState {
  filters: ProductFilters;
  pagination: PaginationState;
  selectedProductId: string | null;
  viewMode: ViewMode;
}

const getInitialViewMode = (): ViewMode => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('productViewMode');
    return (saved === 'grid' || saved === 'list') ? saved : 'grid';
  }
  return 'grid';
};

const getInitialLimit = (): number => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('productsPerPage');
    const parsed = saved ? parseInt(saved, 10) : 12;
    return [12, 24, 48, 96].includes(parsed) ? parsed : 12;
  }
  return 12;
};

const initialState: ProductState = {
  filters: {},
  pagination: {
    page: 1,
    limit: getInitialLimit(),
  },
  selectedProductId: null,
  viewMode: getInitialViewMode(),
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
      if (action.payload.limit && typeof window !== 'undefined') {
        localStorage.setItem('productsPerPage', action.payload.limit.toString());
      }
    },
    setSelectedProduct: (state, action: PayloadAction<string | null>) => {
      state.selectedProductId = action.payload;
    },
    setViewMode: (state, action: PayloadAction<ViewMode>) => {
      state.viewMode = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem('productViewMode', action.payload);
      }
    },
  },
});

export const { setFilters, clearFilters, setPagination, setSelectedProduct, setViewMode } =
  productSlice.actions;
export default productSlice.reducer;
