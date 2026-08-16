import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { UserRole } from '../../../../shared/types';

export interface User {
  _id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  address?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  /**
   * False until the app-root auth bootstrap (see useAuthBootstrap) has
   * resolved at least once, success or failure. Consumers that must not act
   * on a false "logged out" reading before the httpOnly-cookie check has had
   * a chance to run (e.g. ProtectedRoute) should wait on this rather than
   * on `isAuthenticated` alone.
   */
  isInitialized: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isInitialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<{ user: User }>) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.isInitialized = true;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
    },
    replaceAuthState: (
      state,
      action: PayloadAction<{ user: User | null; isAuthenticated: boolean }>
    ) => {
      state.user = action.payload.user;
      state.isAuthenticated = action.payload.isAuthenticated;
      state.isInitialized = true;
    },
  },
});

export const { setUser, updateUser, logout, replaceAuthState } = authSlice.actions;
export default authSlice.reducer;
