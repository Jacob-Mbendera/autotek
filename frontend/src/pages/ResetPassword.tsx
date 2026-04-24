import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useVerifyResetTokenMutation, useResetPasswordMutation } from '../store/api/authApi';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { useAppDispatch } from '../store/types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { H1, Body } from '../components/ui/Typography';
import { Lock, CheckCircle, XCircle, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';

export const ResetPassword = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  const [verifyToken, { isLoading: isVerifyingToken }] = useVerifyResetTokenMutation();
  const [resetPassword, { isLoading: isResetting }] = useResetPasswordMutation();

  // Verify token on mount
  useEffect(() => {
    const verifyResetToken = async () => {
      if (!token) {
        setIsTokenValid(false);
        setIsVerifying(false);
        return;
      }

      try {
        await verifyToken({ token }).unwrap();
        setIsTokenValid(true);
      } catch (error: any) {
        setIsTokenValid(false);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyResetToken();
  }, [token, verifyToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      dispatch(showNotification({ message: 'Invalid reset token', type: 'error' }));
      return;
    }

    if (!newPassword || !confirmPassword) {
      dispatch(showNotification({ message: 'Please fill in all fields', type: 'error' }));
      return;
    }

    if (newPassword.length < 6) {
      dispatch(showNotification({ message: 'Password must be at least 6 characters long', type: 'error' }));
      return;
    }

    if (newPassword !== confirmPassword) {
      dispatch(showNotification({ message: 'Passwords do not match', type: 'error' }));
      return;
    }

    try {
      await resetPassword({ token, newPassword }).unwrap();
      dispatch(showNotification({ message: 'Password reset successfully!', type: 'success' }));
      navigate('/login');
    } catch (error: any) {
      const errorInfo = getErrorInfo(error, 'Failed to reset password. The link may have expired.');
      dispatch(showNotification({
        message: errorInfo.message,
        type: 'error',
      }));
    }
  };

  if (isVerifying || isVerifyingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-teal-50/30 px-4 py-12">
        <Card variant="lg" className="shadow-2xl border-2 border-gray-200 text-center py-12">
          <div className="flex justify-center mb-6">
            <BrandLogo variant="auth" to="/" imgClassName="h-9 w-auto max-w-[220px]" />
          </div>
          <Loader2 className="h-12 w-12 text-teal-600 animate-spin mx-auto mb-4" />
          <Body className="text-gray-600">Verifying reset token...</Body>
        </Card>
      </div>
    );
  }

  if (!isTokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-teal-50/30 px-4 py-12">
        <Card variant="lg" className="shadow-2xl border-2 border-gray-200">
          <div className="flex justify-center mb-6">
            <BrandLogo variant="auth" to="/" imgClassName="h-9 w-auto max-w-[220px]" />
          </div>
          <div className="text-center py-8">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <H1 className="text-2xl font-bold text-gray-900 mb-2">Invalid or Expired Link</H1>
            <Body className="text-gray-600 mb-6">
              This password reset link is invalid or has expired. Password reset links expire after 1 hour.
            </Body>
            <div className="space-y-3">
              <Link to="/forgot-password">
                <Button variant="primary" className="w-full">
                  Request New Reset Link
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-teal-50/30 px-4 py-12">
      <div className="w-full max-w-md">
        <Card variant="lg" className="shadow-2xl border-2 border-gray-200">
          <div className="flex justify-center mb-6">
            <BrandLogo variant="auth" to="/" imgClassName="h-9 w-auto max-w-[220px]" />
          </div>
          <div className="text-center mb-8">
            <div className="h-16 w-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-teal-600" />
            </div>
            <H1 className="text-2xl font-bold text-gray-900 mb-2">Reset Your Password</H1>
            <Body className="text-gray-600">
              Enter your new password below. Make sure it's at least 6 characters long.
            </Body>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  icon={Lock}
                  disabled={isResetting}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  icon={Lock}
                  disabled={isResetting}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <Body className="text-sm text-red-600">Passwords do not match</Body>
              </div>
            )}

            {newPassword && newPassword.length < 6 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Body className="text-sm text-amber-600">Password must be at least 6 characters long</Body>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="large"
              className="w-full"
              disabled={isResetting || newPassword !== confirmPassword || newPassword.length < 6}
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Reset Password
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Login
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
