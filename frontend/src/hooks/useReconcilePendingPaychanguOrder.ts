import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/types';
import { useGetPaymentByOrderQuery } from '../store/api/paymentApi';
import { useGetOrderQuery } from '../store/api/orderApi';
import { clearCart, removeCoupon } from '../store/slices/cartSlice';
import { showNotification } from '../store/slices/uiSlice';
import { PaymentStatus } from '@shared/types';
import {
  getPendingPaychanguOrder,
  clearPendingPaychanguOrder,
  isPendingPaychanguOrderFresh,
  hasPendingReconcileGaveUp,
  markPendingReconcileGaveUp,
  isRecentPaychanguRedirect,
} from '../utils/pendingPaychanguOrder';
import { baseApi } from '../store/api/baseApi';

const VERIFY_POLL_MS = 5000;
const ACTIVE_MAX_ATTEMPTS = 12;
const CART_MAX_ATTEMPTS = 3;
const CART_MAX_POLL_MS = 45_000;
const ACTIVE_CONSECUTIVE_PENDING_GIVE_UP = 5;
const CART_CONSECUTIVE_PENDING_GIVE_UP = 2;

export type ReconcileMode = 'cart' | 'active';

export type ReconcilePendingPaychanguOptions = {
  /** cart: passive fast give-up on /cart; active: longer reconcile on checkout/success (default). */
  mode?: ReconcileMode;
};

export type ReconcilePendingPaychanguResult = {
  /** True while a fresh pending PayChangu order is being reconciled. */
  isConfirmingRecentCheckout: boolean;
  /** True while verify polling is in progress (for banner UI). */
  isCheckingPayment: boolean;
  /** True when checkout should be disabled (active mode only). */
  shouldBlockCheckout: boolean;
  pendingOrderId: string;
  dismissPendingCheckout: () => void;
};

function shouldReconcilePending(): boolean {
  const { orderId } = getPendingPaychanguOrder();
  if (!orderId) return false;
  if (hasPendingReconcileGaveUp()) return false;
  if (!isPendingPaychanguOrderFresh()) {
    clearPendingPaychanguOrder();
    return false;
  }
  return true;
}

function stopReconcileAndClearPending(setChecking: (v: boolean) => void, gaveUp = true): void {
  if (gaveUp) {
    markPendingReconcileGaveUp();
  }
  clearPendingPaychanguOrder();
  setChecking(false);
}

function isStillPendingPayment(data: {
  verified?: boolean;
  payment?: { status?: string };
}): boolean {
  return (
    data?.verified !== true &&
    data?.payment?.status !== PaymentStatus.COMPLETED &&
    data?.payment?.status !== PaymentStatus.FAILED
  );
}

/**
 * If the user paid on PayChangu but never reached /payment/success (e.g. closed tab during redirect),
 * reconcile by (1) reading completed payment/order from the API when webhooks already ran, or
 * (2) polling the public verify-txref endpoint so the server confirms with PayChangu (needed when
 * webhooks cannot reach localhost, etc.).
 */
export function useReconcilePendingPaychanguOrder(
  opts?: ReconcilePendingPaychanguOptions
): ReconcilePendingPaychanguResult {
  const mode: ReconcileMode = opts?.mode ?? 'active';
  const isCartMode = mode === 'cart';

  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const reconciledRef = useRef(false);
  const gaveUpPollingRef = useRef(false);
  const prevPendingIdRef = useRef<string>('');

  const { orderId: pendingOrderId, guestEmail: pendingGuestEmail } = getPendingPaychanguOrder();
  const reconcileAuth = isAuthenticated && Boolean(pendingOrderId);
  const reconcileGuest = !isAuthenticated && Boolean(pendingOrderId) && Boolean(pendingGuestEmail);

  const [isCheckingPayment, setIsCheckingPayment] = useState(() => shouldReconcilePending());

  const { data: pendingPaymentData } = useGetPaymentByOrderQuery(pendingOrderId, {
    skip: !reconcileAuth,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const { data: pendingGuestOrderData } = useGetOrderQuery(
    { id: pendingOrderId, email: pendingGuestEmail },
    { skip: !reconcileGuest, refetchOnFocus: true, refetchOnReconnect: true }
  );

  const paymentFailed =
    pendingPaymentData?.payment?.status === PaymentStatus.FAILED ||
    pendingGuestOrderData?.order?.paymentStatus === PaymentStatus.FAILED;

  const alreadyCompleteInApi =
    pendingPaymentData?.payment?.status === PaymentStatus.COMPLETED ||
    pendingGuestOrderData?.order?.paymentStatus === PaymentStatus.COMPLETED;

  const dismissPendingCheckout = useCallback(() => {
    gaveUpPollingRef.current = true;
    stopReconcileAndClearPending(setIsCheckingPayment);
  }, []);

  const runReconcileSuccess = useCallback(() => {
    if (reconciledRef.current) {
      return;
    }
    reconciledRef.current = true;
    gaveUpPollingRef.current = false;
    setIsCheckingPayment(false);
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
      setIsCheckingPayment(false);
      return;
    }

    if (!isPendingPaychanguOrderFresh()) {
      clearPendingPaychanguOrder();
      setIsCheckingPayment(false);
      return;
    }

    if (hasPendingReconcileGaveUp() || gaveUpPollingRef.current) {
      setIsCheckingPayment(false);
      return;
    }

    setIsCheckingPayment(true);
  }, [pendingOrderId]);

  useEffect(() => {
    if (!pendingOrderId || !paymentFailed) {
      return;
    }
    stopReconcileAndClearPending(setIsCheckingPayment);
  }, [pendingOrderId, paymentFailed]);

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
    if (!isPendingPaychanguOrderFresh() || hasPendingReconcileGaveUp()) {
      return;
    }
    if (alreadyCompleteInApi || paymentFailed) {
      return;
    }

    const maxAttempts = isCartMode ? CART_MAX_ATTEMPTS : ACTIVE_MAX_ATTEMPTS;
    const consecutivePendingLimit = isCartMode
      ? CART_CONSECUTIVE_PENDING_GIVE_UP
      : ACTIVE_CONSECUTIVE_PENDING_GIVE_UP;
    const skipExtendedPoll = isCartMode && !isRecentPaychanguRedirect();

    let cancelled = false;
    let attempts = 0;
    let consecutivePending = 0;
    let timeoutId = 0;
    let inFlight = false;
    const pollStartedAt = Date.now();
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    const stopPolling = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        timeoutId = 0;
      }
    };

    const scheduleNext = (delayMs: number) => {
      if (cancelled || reconciledRef.current) return;
      stopPolling();
      timeoutId = window.setTimeout(() => void tick(), delayMs);
    };

    const giveUp = () => {
      gaveUpPollingRef.current = true;
      stopReconcileAndClearPending(setIsCheckingPayment);
      stopPolling();
    };

    const tick = async () => {
      if (cancelled || reconciledRef.current || inFlight) {
        return;
      }
      if (!isPendingPaychanguOrderFresh()) {
        clearPendingPaychanguOrder();
        setIsCheckingPayment(false);
        stopPolling();
        return;
      }

      if (isCartMode && Date.now() - pollStartedAt > CART_MAX_POLL_MS) {
        giveUp();
        return;
      }

      attempts += 1;
      if (attempts > maxAttempts) {
        giveUp();
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
          message?: string;
        };

        if (cancelled || reconciledRef.current) {
          return;
        }

        if (res.status === 429 || res.status === 401 || res.status === 403) {
          giveUp();
          return;
        }

        if (res.status === 404) {
          giveUp();
          return;
        }

        if (data?.verified === true || data?.payment?.status === PaymentStatus.COMPLETED) {
          dispatch(baseApi.util.invalidateTags(['Order', 'Payment', 'Admin']));
          runReconcileSuccess();
          stopPolling();
          return;
        }

        if (data?.payment?.status === PaymentStatus.FAILED) {
          stopReconcileAndClearPending(setIsCheckingPayment);
          stopPolling();
          return;
        }

        if (isStillPendingPayment(data)) {
          consecutivePending += 1;

          if (skipExtendedPoll || consecutivePending >= consecutivePendingLimit) {
            giveUp();
            return;
          }
        } else {
          consecutivePending = 0;
        }

        if (attempts >= maxAttempts) {
          giveUp();
          return;
        }

        if (isCartMode && Date.now() - pollStartedAt > CART_MAX_POLL_MS) {
          giveUp();
          return;
        }

        scheduleNext(isCartMode ? VERIFY_POLL_MS : VERIFY_POLL_MS * Math.pow(2, Math.min(attempts - 1, 3)));
      } catch {
        if (cancelled || reconciledRef.current) {
          return;
        }
        if (attempts >= maxAttempts) {
          giveUp();
          return;
        }
        scheduleNext(isCartMode ? VERIFY_POLL_MS : VERIFY_POLL_MS * Math.pow(2, Math.min(attempts - 1, 3)));
      } finally {
        inFlight = false;
      }
    };

    void tick();
    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [
    pendingOrderId,
    alreadyCompleteInApi,
    paymentFailed,
    dispatch,
    runReconcileSuccess,
    isCartMode,
  ]);

  useEffect(() => {
    if (!pendingOrderId) {
      reconciledRef.current = false;
    }
  }, [pendingOrderId]);

  const isConfirmingRecentCheckout = isCheckingPayment;
  const shouldBlockCheckout = !isCartMode && isCheckingPayment;

  return {
    isConfirmingRecentCheckout,
    isCheckingPayment,
    shouldBlockCheckout,
    pendingOrderId,
    dismissPendingCheckout,
  };
}
