import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Wishlist } from '../api/wishlistApi';

interface WishlistState {
  wishlist: Wishlist | null;
}

const initialState: WishlistState = {
  wishlist: null,
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    setWishlist: (state, action: PayloadAction<Wishlist | null>) => {
      state.wishlist = action.payload;
    },
    clearWishlist: (state) => {
      state.wishlist = null;
    },
  },
});

export const { setWishlist, clearWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;
