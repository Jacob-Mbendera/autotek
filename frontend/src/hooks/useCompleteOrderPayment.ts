import { useCallback } from 'react';
import { useInitiatePaymentMutation } from '../store/api/paymentApi';
import { useAppDispatch, useAppSelector } from '../store/types';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { getResolvedFrontendBaseUrl } from '../utils/frontendBaseUrl';
import { setPendingPaychanguOrder, setPaychanguRedirectAt } from '../utils/pendingPaychanguOrder';
import { PaymentMethod } from '@shared/types';

export interface CompleteOrderPaymentOptions {
  orderId: string;
  /** Guest checkout email for return URLs and pending storage. */
  guestEmail?: string;
  /** Overrides auth user / guest order phone when initiating PayChangu. */
  phoneNumber?: string;
}

export function useCompleteOrderPayment() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [initiatePayment, { isLoading: isCompletingPayment }] = useInitiatePaymentMutation();

  const completePayment = useCallback(
    async ({ orderId, guestEmail, phoneNumber }: CompleteOrderPaymentOptions) => {
      const phone = phoneNumber?.trim() || user?.phone?.trim();
      if (!phone) {
        dispatch(
          showNotification({
            message: 'A phone number is required to complete payment. Update your profile or contact support.',
            type: 'error',
          })
        );
        return false;
      }

      const isGuestRetry = Boolean(guestEmail?.trim()) && !isAuthenticated;
      const emailForUrl = guestEmail?.trim() || user?.email || '';
      const frontendBaseUrl = getResolvedFrontendBaseUrl();
      const guestQuery = isGuestRetry && emailForUrl ? `&email=${encodeURIComponent(emailForUrl)}` : '';
      const returnUrl = `${frontendBaseUrl}/payment/success?orderId=${orderId}${guestQuery}`;
      const cancelUrl = `${frontendBaseUrl}/payment/cancel?orderId=${orderId}${guestQuery}`;

      try {
        const result = await initiatePayment({
          orderId,
          paymentMethod: PaymentMethod.PAYCHANGU,
          phoneNumber: phone,
          returnUrl,
          cancelUrl,
        }).unwrap();

        if (result.redirectUrl) {
          setPendingPaychanguOrder(orderId, isGuestRetry ? emailForUrl : undefined);
          setPaychanguRedirectAt();
          window.location.href = result.redirectUrl;
          return true;
        }

        dispatch(
          showNotification({
            message: 'No payment redirect was returned. Please try again or contact support.',
            type: 'error',
          })
        );
        return false;
      } catch (error: unknown) {
        const errorInfo = getErrorInfo(error, 'Payment could not be started. Please try again.');
        dispatch(showNotification({ message: errorInfo.message, type: 'error' }));
        return false;
      }
    },
    [dispatch, initiatePayment, isAuthenticated, user?.email, user?.phone]
  );

  return { completePayment, isCompletingPayment };
}
