import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/types';
import { useGetPaymentByOrderQuery } from '../store/api/paymentApi';
import { useGetOrderQuery } from '../store/api/orderApi';
import { clearCart, removeCoupon } from '../store/slices/cartSlice';
import { showNotification } from '../store/slices/uiSlice';
import { PaymentStatus } from '@shared/types';
import { getPendingPaychanguOrder, clearPendingPaychanguOrder } from '../utils/pendingPaychanguOrder';
import { baseApi } from '../store/api/baseApi';

const VERIFY_POLL_MS = 5000;
const VERIFY_MAX_ATTEMPTS = 36;

export type ReconcilePendingPaychanguResult = {
  /** True while we have a pending PayChangu order id and are still checking the gateway / API (hide stale cart lines). */
  isConfirmingRecentCheckout: boolean;
};

/**
 * If the user paid on PayChangu but never reached /payment/success (e.g. closed tab during redirect),
 * reconcile by (1) reading completed payment/order from the API when webhooks already ran, or
 * (2) polling the public verify-txref endpoint so the server confirms with PayChangu (needed when
 * webhooks cannot reach localhost, etc.).
 */
export function useReconcilePendingPaychanguOrder(): ReconcilePendingPaychanguResult {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const reconciledRef = useRef(false);
  const gaveUpPollingRef = useRef(false);
  const prevPendingIdRef = useRef<string>('');

  const { orderId: pendingOrderId, guestEmail: pendingGuestEmail } = getPendingPaychanguOrder();
  const reconcileAuth = isAuthenticated && Boolean(pendingOrderId);
  const reconcileGuest = !isAuthenticated && Boolean(pendingOrderId) && Boolean(pendingGuestEmail);

  const [isConfirmingRecentCheckout, setIsConfirmingRecentCheckout] = useState(
    () => Boolean(getPendingPaychanguOrder().orderId)
  );

  const { data: pendingPaymentData } = useGetPaymentByOrderQuery(pendingOrderId, {
    skip: !reconcileAuth,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const { data: pendingGuestOrderData } = useGetOrderQuery(
    { id: pendingOrderId, email: pendingGuestEmail },
    { skip: !reconcileGuest, refetchOnFocus: true, refetchOnReconnect: true }
  );

  const alreadyCompleteInApi =
    pendingPaymentData?.payment?.status === PaymentStatus.COMPLETED ||
    pendingGuestOrderData?.order?.paymentStatus === PaymentStatus.COMPLETED;

  const runReconcileSuccess = useCallback(() => {
    if (reconciledRef.current) {
      return;
    }
    reconciledRef.current = true;
    gaveUpPollingRef.current = false;
    setIsConfirmingRecentCheckout(false);
    dispatch(clearCart());
    dispatch(removeCoupon());
    clearPendingPaychanguOrder();
    dispatch(
      showNotification({
        message: 'Payment confirmed. Your cart was updated.',
        type: 'success',
      })
    );
  }, [dispatch]);

  useEffect(() => {
    if (prevPendingIdRef.current !== pendingOrderId) {
      prevPendingIdRef.current = pendingOrderId;
      gaveUpPollingRef.current = false;
    }

    if (!pendingOrderId) {
      setIsConfirmingRecentCheckout(false);
      return;
    }

    if (gaveUpPollingRef.current) {
      setIsConfirmingRecentCheckout(false);
      return;
    }

    setIsConfirmingRecentCheckout(true);
  }, [pendingOrderId]);

  useEffect(() => {
    if (!pendingOrderId || !alreadyCompleteInApi) {
      return;
    }
    runReconcileSuccess();
  }, [pendingOrderId, alreadyCompleteInApi, runReconcileSuccess]);

  useEffect(() => {
    if (!pendingOrderId || reconciledRef.current) {
      return;
    }
    if (alreadyCompleteInApi) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let intervalId = 0;
    let inFlight = false;
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    const stopPolling = () => {
      if (intervalId) {
        window.clearInterval(intervalId);
        intervalId = 0;
      }
    };

    const tick = async () => {
      if (cancelled || reconciledRef.current || inFlight) {
        return;
      }
      attempts += 1;
      if (attempts > VERIFY_MAX_ATTEMPTS) {
        gaveUpPollingRef.current = true;
        setIsConfirmingRecentCheckout(false);
        stopPolling();
        return;
      }
      inFlight = true;
      try {
        const res = await fetch(
          `${apiBase}/payments/verify-txref?orderId=${encodeURIComponent(pendingOrderId)}`
        );
        const data = (await res.json()) as {
          verified?: boolean;
          payment?: { status?: string };
        };
        if (cancelled || reconciledRef.current) {
          return;
        }
        if (data?.verified === true || data?.payment?.status === PaymentStatus.COMPLETED) {
          dispatch(baseApi.util.invalidateTags(['Order', 'Payment', 'Admin']));
          runReconcileSuccess();
          stopPolling();
          return;
        }
        if (attempts >= VERIFY_MAX_ATTEMPTS) {
          gaveUpPollingRef.current = true;
          setIsConfirmingRecentCheckout(false);
          stopPolling();
        }
      } catch {
        if (cancelled || reconciledRef.current) {
          return;
        }
        if (attempts >= VERIFY_MAX_ATTEMPTS) {
          gaveUpPollingRef.current = true;
          setIsConfirmingRecentCheckout(false);
          stopPolling();
        }
      } finally {
        inFlight = false;
      }
    };

    void tick();
    intervalId = window.setInterval(() => void tick(), VERIFY_POLL_MS);
    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [pendingOrderId, alreadyCompleteInApi, dispatch, runReconcileSuccess]);

  useEffect(() => {
    if (!pendingOrderId) {
      reconciledRef.current = false;
    }
  }, [pendingOrderId]);

  return { isConfirmingRecentCheckout };
}
