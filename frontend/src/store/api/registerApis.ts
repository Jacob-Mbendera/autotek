/**
 * Side-effect imports: register every injectEndpoints module before the Redux store
 * is created so RTK Query always has endpoint definitions for mutations.
 */
import './authApi';
import './productApi';
import './orderApi';
import './returnApi';
import './paymentApi';
import './adminApi';
import './serviceApi';
import './wishlistApi';
import './cartApi';
import './reviewApi';
import './customOrderApi';
import './couponApi';
import './deliveryLocationApi';
import './refundApi';
import './geocodingApi';
