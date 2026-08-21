import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForgotPasswordMutation } from '../store/api/authApi';
import { PageHeading, MonoLabel, JournalBody, JournalButton, JournalInput } from '../components/journal';
import { ArrowLeft, CheckCircle, Lock } from 'lucide-react';
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
    } catch {
      // Even on error, we show success message to prevent email enumeration
      setError('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-journal-bone px-4 py-14">
      <div className="w-full max-w-[440px]">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-[13px] text-journal-muted hover:text-journal-teal transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Login</span>
        </Link>

        <div className="flex justify-center mb-6">
          <BrandLogo variant="auth" to="/" imgClassName="h-10 w-auto max-w-[240px]" />
        </div>

        {!isSuccess ? (
          <>
            <div className="flex justify-center mb-4">
              <div className="h-14 w-14 bg-journal-teal-tint rounded-full flex items-center justify-center">
                <Lock className="h-6 w-6 text-journal-teal" />
              </div>
            </div>
            <MonoLabel className="block text-center mb-3">Reset your password</MonoLabel>
            <PageHeading className="!text-[40px] text-center mb-4">Forgot password?</PageHeading>
            <JournalBody className="!text-journal-muted text-center mb-6">
              Enter your email address and we'll send you a link to reset your password.
            </JournalBody>

            {error && (
              <div className="mb-4 border border-journal-error-border bg-journal-error-bg rounded-journal px-4 py-3">
                <p className="text-[13px] text-journal-danger-text">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <JournalInput
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                disabled={isLoading}
              />

              <JournalButton type="submit" variant="primary" className="w-full mt-1.5" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send reset link'}
              </JournalButton>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-journal-teal" />
            </div>
            <PageHeading className="!text-[32px] mb-2">Check your email</PageHeading>
            <JournalBody className="!text-journal-muted mb-4">
              If an account with <span className="font-semibold text-journal-ink">{email}</span> exists, we've sent you a password reset link.
            </JournalBody>
            <JournalBody className="!text-journal-muted text-[13px] mb-6">
              The link will expire in 1 hour. If you don't see the email, check your spam folder.
            </JournalBody>
            <div className="flex flex-col gap-3">
              <Link to="/login">
                <JournalButton variant="primary" className="w-full">
                  Back to login
                </JournalButton>
              </Link>
              <JournalButton
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setEmail('');
                  window.location.reload();
                }}
              >
                Send another email
              </JournalButton>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <JournalBody className="!text-journal-muted">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-journal-teal hover:underline">
              Sign up
            </Link>
          </JournalBody>
        </div>
      </div>
    </div>
  );
};
