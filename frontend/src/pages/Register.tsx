import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useRegisterMutation } from '../store/api/authApi';
import { useAppDispatch } from '../store/types';
import { setUser } from '../store/slices/authSlice';
import { showNotification } from '../store/slices/uiSlice';
import { broadcastClientSync } from '../utils/crossTabSync';
import { getErrorInfo } from '../utils/errorHandler';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { H1, Body } from '../components/ui/Typography';
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card variant="md" className="w-full max-w-md">
        {/* Back to Home Link */}
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-teal-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
        </div>

        <div className="flex justify-center mb-6">
          <BrandLogo variant="auth" to="/" imgClassName="h-10 w-auto max-w-[240px]" />
        </div>

        <H1 className="text-2xl text-center mb-6">Create Account</H1>

        {returnUrl && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-600">Create an account to continue checkout</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
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

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
            }}
            error={fieldErrors.email}
            required
            placeholder="Enter your email"
          />

          <Input
            label="Phone Number"
            phoneNumber
            value={formData.phone}
            onChange={(e) => {
              setFormData({ ...formData, phone: e.target.value });
              if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: '' });
            }}
            error={fieldErrors.phone}
            required
            placeholder="XXXXXXXXX"
          />

          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value });
              if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
            }}
            error={fieldErrors.password}
            required
            placeholder="Enter your password"
          />

          <Input
            label="Confirm Password"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => {
              setFormData({ ...formData, confirmPassword: e.target.value });
              if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: '' });
            }}
            error={fieldErrors.confirmPassword}
            required
            placeholder="Confirm your password"
          />

          <Input
            label="Address (Optional)"
            type="text"
            value={formData.address}
            onChange={(e) => {
              setFormData({ ...formData, address: e.target.value });
              if (fieldErrors.address) setFieldErrors({ ...fieldErrors, address: '' });
            }}
            error={fieldErrors.address}
            placeholder="Enter your address"
          />

          <Button
            type="submit"
            variant="primary"
            size="default"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Register'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Body className="text-gray-600">
            Already have an account?{' '}
            <Link 
              to={returnUrl ? `/login?returnUrl=${returnUrl}` : '/login'} 
              className="text-teal-600 hover:text-teal-700 font-medium"
            >
              Login here
            </Link>
          </Body>
        </div>
      </Card>
    </div>
  );
};
