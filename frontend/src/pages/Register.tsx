import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useRegisterMutation } from '../store/api/authApi';
import { useAppDispatch } from '../store/types';
import { setUser } from '../store/slices/authSlice';
import { showNotification } from '../store/slices/uiSlice';
import { broadcastClientSync } from '../utils/crossTabSync';
import { getErrorInfo } from '../utils/errorHandler';
import { PageHeading, MonoLabel, JournalBody, JournalButton, JournalInput } from '../components/journal';
import { ArrowLeft } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { getSafeRedirectPath } from '../utils/safeRedirectPath';

export const Register = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const [register, { isLoading }] = useRegisterMutation();

  const returnUrl = searchParams.get('returnUrl');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      // Format phone number: if it doesn't start with +265 or 0, prepend +265
      let formattedPhone = formData.phone.trim();
      if (!formattedPhone.startsWith('+265') && !formattedPhone.startsWith('0')) {
        // Remove any spaces and prepend +265
        formattedPhone = `+265${formattedPhone.replace(/\s+/g, '')}`;
      } else {
        // Remove any spaces from existing format
        formattedPhone = formattedPhone.replace(/\s+/g, '');
      }

      const result = await register({
        name: formData.name,
        email: formData.email,
        phone: formattedPhone,
        password: formData.password,
        address: formData.address || undefined,
      }).unwrap();

      dispatch(setUser({ user: result.user }));
      broadcastClientSync('auth');
      dispatch(showNotification({ message: 'Account created successfully', type: 'success' }));
      const redirectTo = getSafeRedirectPath(returnUrl, '/');
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      const errorInfo = getErrorInfo(err);
      setError(errorInfo.message);

      // Set field-specific errors if available
      if (errorInfo.fieldErrors) {
        setFieldErrors(errorInfo.fieldErrors);
      } else {
        setFieldErrors({});
      }

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

        <MonoLabel className="block text-center mb-3">Join AutoTek</MonoLabel>
        <PageHeading className="!text-[40px] text-center mb-6">Create account</PageHeading>

        {returnUrl && (
          <div className="mb-4 border border-journal-teal-tint-border bg-journal-teal-tint rounded-journal px-4 py-3">
            <p className="text-[13px] text-journal-teal">Create an account to continue checkout</p>
          </div>
        )}

        {error && (
          <div className="mb-4 border border-journal-error-border bg-journal-error-bg rounded-journal px-4 py-3">
            <p className="text-[13px] text-journal-danger-text">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <JournalInput
            label="Full name"
            type="text"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' });
            }}
            error={fieldErrors.name}
            required
            placeholder="Enter your full name"
          />

          <JournalInput
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
            }}
            error={fieldErrors.email}
            required
            placeholder="you@example.com"
          />

          <JournalInput
            label="Phone number"
            type="tel"
            value={formData.phone}
            onChange={(e) => {
              setFormData({ ...formData, phone: e.target.value });
              if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: '' });
            }}
            error={fieldErrors.phone}
            required
            placeholder="+265991234567 or 0991234567"
          />

          <JournalInput
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value });
              if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
            }}
            error={fieldErrors.password}
            required
            placeholder="••••••••"
          />

          <JournalInput
            label="Confirm password"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => {
              setFormData({ ...formData, confirmPassword: e.target.value });
              if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: '' });
            }}
            error={fieldErrors.confirmPassword}
            required
            placeholder="••••••••"
          />

          <JournalInput
            label="Address (optional)"
            type="text"
            value={formData.address}
            onChange={(e) => {
              setFormData({ ...formData, address: e.target.value });
              if (fieldErrors.address) setFieldErrors({ ...fieldErrors, address: '' });
            }}
            error={fieldErrors.address}
            placeholder="Enter your address"
          />

          <JournalButton type="submit" variant="primary" className="w-full mt-1.5" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create account'}
          </JournalButton>
        </form>

        <div className="mt-6 text-center">
          <JournalBody className="!text-journal-muted">
            Already have an account?{' '}
            <Link
              to={returnUrl ? `/login?returnUrl=${returnUrl}` : '/login'}
              className="font-semibold text-journal-teal hover:underline"
            >
              Login here
            </Link>
          </JournalBody>
        </div>
      </div>
    </div>
  );
};
