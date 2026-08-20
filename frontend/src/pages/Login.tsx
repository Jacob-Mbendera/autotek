import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLoginMutation } from '../store/api/authApi';
import { useMergeCartMutation } from '../store/api/cartApi';
import { useAppDispatch, useAppSelector } from '../store/types';
import { setUser } from '../store/slices/authSlice';
import { clearCart } from '../store/slices/cartSlice';
import { showNotification } from '../store/slices/uiSlice';
import { broadcastClientSync } from '../utils/crossTabSync';
import { getErrorInfo } from '../utils/errorHandler';
import { PageHeading, MonoLabel, JournalBody, JournalButton, JournalInput } from '../components/journal';
import { ArrowLeft } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { getSafeRedirectPath } from '../utils/safeRedirectPath';

export const Login = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const [login, { isLoading }] = useLoginMutation();
  const [mergeCart] = useMergeCartMutation();
  const guestCart = useAppSelector((state) => state.cart);

  const returnUrl = searchParams.get('returnUrl');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const result = await login(formData).unwrap();
      dispatch(setUser({ user: result.user }));

      if (guestCart.items.length > 0) {
        try {
          await mergeCart({
            items: guestCart.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              price: i.price,
            })),
          }).unwrap();
          dispatch(clearCart());
          broadcastClientSync('cart');
        } catch {
          dispatch(showNotification({ message: 'Could not sync your cart, but you are logged in.', type: 'warning' }));
        }
      }

      broadcastClientSync('auth');
      dispatch(showNotification({ message: 'Login successful', type: 'success' }));
      const redirectTo = getSafeRedirectPath(returnUrl, '/');
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      const errorInfo = getErrorInfo(err);
      setError(errorInfo.message);
      // Also show notification for network/server errors
      if (errorInfo.type === 'network' || errorInfo.type === 'server') {
        dispatch(showNotification({ message: errorInfo.message, type: 'error' }));
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-journal-bone px-4 py-14">
      <div className="w-full max-w-[440px]">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[13px] text-journal-muted hover:text-journal-teal transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>

        <div className="flex justify-center mb-6">
          <BrandLogo variant="auth" to="/" imgClassName="h-10 w-auto max-w-[240px]" />
        </div>

        <MonoLabel className="block text-center mb-3">Welcome back</MonoLabel>
        <PageHeading className="!text-[40px] text-center mb-6">Log in</PageHeading>

        {returnUrl && (
          <div className="mb-4 border border-journal-teal-tint-border bg-journal-teal-tint rounded-journal px-4 py-3">
            <p className="text-[13px] text-journal-teal">Please login to continue checkout</p>
          </div>
        )}

        {error && (
          <div className="mb-4 border border-journal-error-border bg-journal-error-bg rounded-journal px-4 py-3">
            <p className="text-[13px] text-journal-danger-text">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <JournalInput
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            placeholder="you@example.com"
          />

          <JournalInput
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            placeholder="••••••••"
          />

          <JournalButton type="submit" variant="primary" className="w-full mt-1.5" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Log in'}
          </JournalButton>
        </form>

        <div className="mt-6 text-center space-y-3">
          <div>
            <Link
              to="/forgot-password"
              className="text-[13px] font-semibold text-journal-teal hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
          <JournalBody className="!text-journal-muted">
            Don't have an account?{' '}
            <Link
              to={returnUrl ? `/register?returnUrl=${returnUrl}` : '/register'}
              className="font-semibold text-journal-teal hover:underline"
            >
              Register here
            </Link>
          </JournalBody>
        </div>
      </div>
    </div>
  );
};
