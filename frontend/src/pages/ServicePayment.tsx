import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useInitiatePaymentMutation } from '../store/api/paymentApi';
import {
  useGetTowingServiceQuery,
  useGetCarServiceQuery,
} from '../store/api/serviceApi';
import { baseApi } from '../store/api/baseApi';
import { useAppSelector, useAppDispatch } from '../store/types';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { getResolvedFrontendBaseUrl } from '../utils/frontendBaseUrl';
import { setPendingPaychanguService } from '../utils/pendingPaychanguService';
import { useReconcilePendingPaychanguService } from '../hooks/useReconcilePendingPaychanguService';
import { PageHeading, JournalBody, JournalButton, JournalCard } from '../components/journal';
import { Loader2, CreditCard, Shield } from 'lucide-react';
import { PaymentMethod, UserRole } from '@shared/types';

export const ServicePayment = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [searchParams] = useSearchParams();
  const [initiatePayment, { isLoading }] = useInitiatePaymentMutation();

  const towingServiceId = searchParams.get('towingServiceId');
  const carServiceId = searchParams.get('carServiceId');

  const towingQuery = useGetTowingServiceQuery(towingServiceId!, {
    skip: !towingServiceId,
  });
  const carQuery = useGetCarServiceQuery(carServiceId!, {
    skip: !carServiceId,
  });

  const service = towingServiceId
    ? towingQuery.data?.service
    : carQuery.data?.service;

  const amountMwk = service?.estimatedCost ?? 0;
  const canPay = amountMwk > 0;

  const loadingService = towingServiceId
    ? towingQuery.isLoading || towingQuery.isFetching
    : carQuery.isLoading || carQuery.isFetching;

  const loadError = towingServiceId ? towingQuery.isError : carQuery.isError;

  const { isConfirmingServicePayment, pendingMatchesThisPage } =
    useReconcilePendingPaychanguService({
      towingServiceId: towingServiceId ?? undefined,
      carServiceId: carServiceId ?? undefined,
    });

  useEffect(() => {
    if (!towingServiceId && !carServiceId) {
      navigate('/my-services');
      return;
    }

    if (user?.role === UserRole.ADMIN) {
      dispatch(
        showNotification({
          message: 'Admin accounts cannot make customer service payments',
          type: 'error',
        })
      );
      navigate('/admin/dashboard', { replace: true });
    }
  }, [towingServiceId, carServiceId, navigate, user, dispatch]);

  useEffect(() => {
    if (loadError) {
      dispatch(
        showNotification({
          message: 'Could not load this service. It may have been removed.',
          type: 'error',
        })
      );
      navigate('/my-services', { replace: true });
    }
  }, [loadError, dispatch, navigate]);

  const handlePayment = async () => {
    if (!canPay) return;
    try {
      const baseUrl = getResolvedFrontendBaseUrl();
      const paymentData: {
        paymentMethod: PaymentMethod;
        returnUrl: string;
        cancelUrl: string;
        towingServiceId?: string;
        carServiceId?: string;
      } = {
        paymentMethod: PaymentMethod.PAYCHANGU,
        returnUrl: `${baseUrl}/payment/success`,
        cancelUrl: `${baseUrl}/payment/cancel`,
      };

      if (towingServiceId) {
        paymentData.towingServiceId = towingServiceId;
      } else if (carServiceId) {
        paymentData.carServiceId = carServiceId;
      }

      const result = await initiatePayment(paymentData).unwrap();

      if (result.redirectUrl) {
        if (towingServiceId) {
          setPendingPaychanguService({ towingServiceId });
        } else if (carServiceId) {
          setPendingPaychanguService({ carServiceId });
        }
        window.location.href = result.redirectUrl;
      } else {
        dispatch(
          showNotification({
            message: 'No payment redirect was returned. Please try again or contact support.',
            type: 'error',
          })
        );
      }
    } catch (error: unknown) {
      const errorInfo = getErrorInfo(error, 'Payment could not be started. Please try again.');
      const lower = errorInfo.message.toLowerCase();
      if (lower.includes('already initiated')) {
        const refetchResult = towingServiceId
          ? await towingQuery.refetch()
          : await carQuery.refetch();
        const svc = refetchResult.data?.service;
        if (svc?.paymentStatus === 'completed') {
          dispatch(baseApi.util.invalidateTags(['TowingService', 'CarService', 'Admin']));
          dispatch(
            showNotification({
              message: 'This booking is already paid. Returning to My Services.',
              type: 'success',
            })
          );
          navigate('/my-services', { replace: true });
          return;
        }
      }
      dispatch(showNotification({ message: errorInfo.message, type: 'error' }));
    }
  };

  const pageSubtitle = loadingService
    ? 'Loading your service…'
    : !canPay
      ? 'Your quote in Malawi Kwacha (MWK) is not ready yet. Please check My Services later or contact support.'
      : 'Your quote is ready. Pay securely to confirm and have a provider assigned.';

  if (isConfirmingServicePayment && pendingMatchesThisPage) {
    return (
      <div className="max-w-[640px] mx-auto px-4 sm:px-10 py-14 sm:py-16">
        <button
          type="button"
          onClick={() => navigate('/my-services')}
          className="text-[12px] font-sans font-semibold tracking-[0.1em] uppercase text-journal-teal hover:underline mb-6 inline-block"
        >
          &larr; Back to My Services
        </button>
        <div className="text-center py-20">
          <div className="w-11 h-11 border-[3px] border-journal-hairline border-t-journal-teal rounded-full mx-auto mb-6 animate-spin" />
          <h1 className="font-journal font-normal text-[28px] text-journal-ink mb-2">
            Confirming your payment
          </h1>
          <JournalBody>
            Checking your booking with PayChangu. This usually takes a few seconds.
          </JournalBody>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[640px] mx-auto px-4 sm:px-10 py-11 sm:py-14">
      <button
        type="button"
        onClick={() => navigate('/my-services')}
        className="text-[12px] font-sans font-semibold tracking-[0.1em] uppercase text-journal-teal hover:underline mb-5 inline-block"
      >
        &larr; Back to My Services
      </button>

      {loadingService ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-9 h-9 animate-spin text-journal-teal" />
        </div>
      ) : (
        <div>
          <div className="border border-journal-ink mb-6">
            <img
              src="https://res.cloudinary.com/dhbe6wtod/image/upload/v1773771506/autotek/payment%20methods/tag2-C4qnl2U7_znxdld.png"
              alt="Accepted payment methods"
              className="w-full block"
              width={320}
              height={120}
              loading="eager"
              decoding="async"
            />
          </div>

          <PageHeading className="!text-[36px] mb-1.5">Complete your payment</PageHeading>
          <JournalBody className="mb-6">{pageSubtitle}</JournalBody>

          {canPay ? (
            <JournalCard className="!p-6 mb-5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-sans font-semibold tracking-[0.12em] uppercase text-journal-ink">
                  Amount due
                </span>
                <span className="font-journal text-[36px] text-journal-teal tabular-nums">
                  MWK {amountMwk.toLocaleString()}
                </span>
              </div>
            </JournalCard>
          ) : (
            <div className="bg-journal-sand rounded-journal p-6 mb-5 text-center">
              <JournalBody>
                Online payment is only available after AutoTek sets your price in{' '}
                <span className="font-semibold text-journal-ink">Malawi Kwacha (MWK)</span>.
              </JournalBody>
            </div>
          )}

          <div className="flex gap-3 items-start bg-journal-sand rounded-journal px-[18px] py-4 mb-6">
            <span className="w-[30px] h-[30px] rounded-full bg-journal-teal text-white flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4" aria-hidden />
            </span>
            <p className="text-[13px] leading-[1.6] text-journal-body">
              Payments are processed securely by <strong className="text-journal-ink">PayChangu</strong>.
              AutoTek never sees or stores your card or mobile-money PIN.
            </p>
          </div>

          <JournalButton
            variant="primary"
            size="large"
            onClick={handlePayment}
            disabled={isLoading || loadingService || !canPay}
            className="w-full !py-4"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Proceed to payment
              </>
            )}
          </JournalButton>

          <div className="flex items-center justify-center gap-3.5 mt-5">
            <a
              href="https://paychangu.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal focus-visible:ring-offset-2 rounded-sm"
            >
              <img
                src="https://res.cloudinary.com/dhbe6wtod/image/upload/v1773771506/autotek/payment%20methods/tag1-i7EnK4XQ_qpo7qy.png"
                alt="PayChangu — secure payments"
                className="h-8 w-auto object-contain"
                width={280}
                height={64}
                loading="lazy"
                decoding="async"
              />
            </a>
            <span className="text-[12px] text-journal-faint">
              By continuing you agree to our terms of service.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
