import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useSendContactMessageMutation } from '../store/api/contactApi';
import { getErrorInfo } from '../utils/errorHandler';
import { PageHeading, MonoLabel, JournalBody, JournalButton, JournalInput, JournalTextarea } from '../components/journal';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';

const SUPPORT_PHONE = '+265 887 111 444';
const SUPPORT_PHONE_HREF = 'tel:+265887111444';

export const Contact = () => {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason') || undefined;

  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [error, setError] = useState('');
  const [sendContactMessage, { isLoading, isSuccess }] = useSendContactMessageMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await sendContactMessage({ ...formData, reason }).unwrap();
    } catch (err: any) {
      const errorInfo = getErrorInfo(err);
      setError(errorInfo.message);
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

        <MonoLabel className="block text-center mb-3">Get in touch</MonoLabel>
        <PageHeading className="!text-[40px] text-center mb-6">Contact us</PageHeading>

        {reason === 'account-deactivated' && (
          <div className="mb-4 border border-journal-teal-tint-border bg-journal-teal-tint rounded-journal px-4 py-3">
            <p className="text-[13px] text-journal-teal">
              If your account was deactivated and you'd like to know why or request reactivation, let us know below.
            </p>
          </div>
        )}

        {reason === 'delete-account' && (
          <div className="mb-4 border border-journal-teal-tint-border bg-journal-teal-tint rounded-journal px-4 py-3">
            <p className="text-[13px] text-journal-teal">
              Want your account permanently deleted? Let us know below and our team will verify and process your request.
            </p>
          </div>
        )}

        {!isSuccess ? (
          <>
            {error && (
              <div className="mb-4 border border-journal-error-border bg-journal-error-bg rounded-journal px-4 py-3">
                <p className="text-[13px] text-journal-danger-text">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <JournalInput
                label="Name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Your name"
                disabled={isLoading}
              />

              <JournalInput
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="you@example.com"
                disabled={isLoading}
              />

              <JournalTextarea
                label="Message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
                minLength={10}
                rows={5}
                placeholder="How can we help?"
                disabled={isLoading}
              />

              <JournalButton type="submit" variant="primary" className="w-full mt-1.5" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send message'}
              </JournalButton>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-journal-teal" />
            </div>
            <JournalBody className="!text-journal-ink mb-2">Message sent</JournalBody>
            <JournalBody className="!text-journal-muted">
              We've received your message and will get back to you soon.
            </JournalBody>
          </div>
        )}

        <div className="mt-6 text-center">
          <JournalBody className="!text-journal-muted">
            Prefer to call? <a href={SUPPORT_PHONE_HREF} className="font-semibold text-journal-teal hover:underline">{SUPPORT_PHONE}</a>
          </JournalBody>
        </div>
      </div>
    </div>
  );
};
