import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface ServiceRequest {
  id: string;
  type: 'towing' | 'car-service';
  status: string;
  createdAt: string;
}

interface ServiceState {
  activeRequests: ServiceRequest[];
}

const initialState: ServiceState = {
  activeRequests: [],
};

const serviceSlice = createSlice({
  name: 'service',
  initialState,
  reducers: {
    setActiveRequests: (state, action: PayloadAction<ServiceRequest[]>) => {
      state.activeRequests = action.payload;
    },
    addActiveRequest: (state, action: PayloadAction<ServiceRequest>) => {
      state.activeRequests.push(action.payload);
    },
    updateActiveRequest: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<ServiceRequest> }>
    ) => {
      const index = state.activeRequests.findIndex((req) => req.id === action.payload.id);
      if (index !== -1) {
        state.activeRequests[index] = {
          ...state.activeRequests[index],
          ...action.payload.updates,
        };
      }
    },
    removeActiveRequest: (state, action: PayloadAction<string>) => {
      state.activeRequests = state.activeRequests.filter((req) => req.id !== action.payload);
    },
  },
});

export const {
  setActiveRequests,
  addActiveRequest,
  updateActiveRequest,
  removeActiveRequest,
} = serviceSlice.actions;
export default serviceSlice.reducer;
