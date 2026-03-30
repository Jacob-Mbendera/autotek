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
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { H1, H2, Body } from '../components/ui/Typography';
import { Loader2, CreditCard, Shield, ArrowLeft } from 'lucide-react';
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
      : 'Complete your payment in MWK to confirm your service request.';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate('/my-services')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Services
        </Button>

        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img
                src="https://res.cloudinary.com/dhbe6wtod/image/upload/v1773771506/autotek/payment%20methods/tag2-C4qnl2U7_znxdld.png"
                alt="Accepted payment methods"
                className="max-w-full h-auto max-h-28 sm:max-h-32 object-contain mx-auto"
                width={320}
                height={120}
                loading="eager"
                decoding="async"
              />
            </div>
            <H1 className="text-3xl font-bold text-gray-900 mb-2">Pay for Service</H1>
            <Body className="text-gray-600">{pageSubtitle}</Body>
          </div>

          {loadingService && (
            <div className="flex justify-center py-8 mb-6">
              <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
            </div>
          )}

          {!loadingService && canPay && (
            <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg p-6 mb-6">
              <div className="text-center">
                <Body className="text-sm text-gray-600 mb-1">Total (MWK)</Body>
                <H2 className="text-4xl font-bold text-teal-700">
                  MWK {amountMwk.toLocaleString()}
                </H2>
              </div>
            </div>
          )}

          {!loadingService && !canPay && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 text-center">
              <Body className="text-gray-700">
                Online payment is only available after AutoTek sets your price in{' '}
                <span className="font-semibold">Malawi Kwacha (MWK)</span>.
              </Body>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">Secure Payment</p>
                <p className="text-sm text-blue-700">
                  Your payment is processed securely through PayChangu. We never store your card
                  details. All amounts are in MWK.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handlePayment}
              disabled={isLoading || loadingService || !canPay}
              className="w-full"
              size="large"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Proceed to Payment
                </>
              )}
            </Button>

            <div className="flex justify-center pt-1">
              <a
                href="https://paychangu.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 rounded"
              >
                <img
                  src="https://res.cloudinary.com/dhbe6wtod/image/upload/v1773771506/autotek/payment%20methods/tag1-i7EnK4XQ_qpo7qy.png"
                  alt="PayChangu — secure payments"
                  className="max-w-full h-auto max-h-14 sm:max-h-16 object-contain"
                  width={280}
                  height={64}
                  loading="lazy"
                  decoding="async"
                />
              </a>
            </div>
          </div>
        </Card>

        <div className="mt-6 text-center">
          <Body className="text-sm text-gray-500">
            By proceeding, you agree to our terms and conditions
          </Body>
        </div>
      </div>
    </div>
  );
};
