import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useVerifyEmailMutation, useResendVerificationEmailMutation } from '../store/api/authApi';
import { PageHeading, MonoLabel, JournalBody, JournalButton, JournalInput } from '../components/journal';
import { ArrowLeft, CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [verifyEmail, { isLoading: isVerifying, isSuccess, isError }] = useVerifyEmailMutation();
  const [resendVerificationEmail, { isLoading: isResending, isSuccess: resendSuccess }] =
    useResendVerificationEmailMutation();
  const [resendEmail, setResendEmail] = useState('');
  const hasRequested = useRef(false);

  useEffect(() => {
    if (!token || hasRequested.current) return;
    hasRequested.current = true;
    verifyEmail({ token });
  }, [token, verifyEmail]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    try {
      await resendVerificationEmail({ email: resendEmail.trim() }).unwrap();
    } catch {
      // Enumeration-safe: backend always returns a generic success message.
    }
  };

  const showVerifying = !token || isVerifying;
  const showSuccess = !showVerifying && isSuccess;
  const showError = !showVerifying && (isError || !token);

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

        {showVerifying && (
          <div className="text-center py-4">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-10 w-10 text-journal-teal animate-spin" />
            </div>
            <PageHeading className="!text-[32px] mb-2">Verifying your email</PageHeading>
            <JournalBody className="!text-journal-muted">Just a moment...</JournalBody>
          </div>
        )}

        {showSuccess && (
          <div className="text-center py-4">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-journal-teal" />
            </div>
            <PageHeading className="!text-[32px] mb-2">Email verified</PageHeading>
            <JournalBody className="!text-journal-muted mb-6">
              Your email address has been confirmed. You're all set.
            </JournalBody>
            <Link to="/">
              <JournalButton variant="primary" className="w-full">
                Continue to AutoTek
              </JournalButton>
            </Link>
          </div>
        )}

        {showError && (
          <div className="text-center py-4">
            <div className="flex justify-center mb-4">
              <XCircle className="h-10 w-10 text-journal-danger-text" />
            </div>
            <MonoLabel className="block mb-3">Verification failed</MonoLabel>
            <PageHeading className="!text-[32px] mb-4">Invalid or expired link</PageHeading>
            <JournalBody className="!text-journal-muted mb-6">
              This verification link is invalid or has expired. Enter your email below to get a new one.
            </JournalBody>

            {resendSuccess ? (
              <div className="border border-journal-error-border bg-journal-teal-tint rounded-journal px-4 py-3 mb-6">
                <p className="text-[13px] text-journal-ink">
                  If an account with that email exists and is unverified, a new link has been sent.
                </p>
              </div>
            ) : (
              <form onSubmit={handleResend} className="flex flex-col gap-3.5 mb-6 text-left">
                <JournalInput
                  label="Email"
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  disabled={isResending}
                />
                <JournalButton type="submit" variant="primary" className="w-full" disabled={isResending}>
                  {isResending ? (
                    'Sending...'
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Resend verification email
                    </>
                  )}
                </JournalButton>
              </form>
            )}

            <Link to="/login">
              <JournalButton variant="secondary" className="w-full">
                Back to login
              </JournalButton>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
