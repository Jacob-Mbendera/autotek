import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface AdminStats {
  totalUsers?: number;
  totalOrders?: number;
  totalProducts?: number;
  totalRevenue?: number;
  pendingOrders?: number;
  completedOrders?: number;
}

interface AdminFilters {
  orders?: {
    status?: string;
    dateRange?: { start: string; end: string };
  };
  services?: {
    status?: string;
    type?: string;
  };
}

interface AdminState {
  stats: AdminStats | null;
  filters: AdminFilters;
}

const initialState: AdminState = {
  stats: null,
  filters: {},
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setStats: (state, action: PayloadAction<AdminStats>) => {
      state.stats = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<AdminFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
  },
});

export const { setStats, setFilters, clearFilters } = adminSlice.actions;
export default adminSlice.reducer;
