import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForgotPasswordMutation } from '../store/api/authApi';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { H1, Body } from '../components/ui/Typography';
import { Mail, ArrowLeft, CheckCircle, Loader2, Lock } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [forgotPassword, { isLoading, isSuccess }] = useForgotPasswordMutation();
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    try {
      await forgotPassword({ email: email.trim() }).unwrap();
    } catch (err: any) {
      // Even on error, we show success message to prevent email enumeration
      setError('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-teal-50/30 px-4 py-12">
      <div className="w-full max-w-md">
        <Card variant="lg" className="shadow-2xl border-2 border-gray-200">
          <div className="flex justify-center mb-6">
            <BrandLogo variant="auth" to="/" imgClassName="h-9 w-auto max-w-[220px]" />
          </div>
          {!isSuccess ? (
            <>
              <div className="text-center mb-8">
                <div className="h-16 w-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="h-8 w-8 text-teal-600" />
                </div>
                <H1 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password?</H1>
                <Body className="text-gray-600">
                  Enter your email address and we'll send you a link to reset your password.
                </Body>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <Body className="text-sm text-red-600">{error}</Body>
                  </div>
                )}

                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  icon={Mail}
                  disabled={isLoading}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="large"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-5 w-5 mr-2" />
                      Send Reset Link
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
            </>
          ) : (
            <div className="text-center py-8">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <H1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</H1>
              <Body className="text-gray-600 mb-6">
                If an account with <strong>{email}</strong> exists, we've sent you a password reset link.
                Please check your email and click the link to reset your password.
              </Body>
              <Body className="text-sm text-gray-500 mb-6">
                The link will expire in 1 hour. If you don't see the email, check your spam folder.
              </Body>
              <div className="space-y-3">
                <Link to="/login">
                  <Button variant="primary" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setEmail('');
                    window.location.reload();
                  }}
                >
                  Send Another Email
                </Button>
              </div>
            </div>
          )}
        </Card>

        <div className="mt-6 text-center">
          <Body className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-teal-600 hover:text-teal-700 font-medium">
              Sign up
            </Link>
          </Body>
        </div>
      </div>
    </div>
  );
};
