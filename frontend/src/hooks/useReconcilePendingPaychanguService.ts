import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppDispatch } from '../store/types';
import { showNotification } from '../store/slices/uiSlice';
import { PaymentStatus } from '@shared/types';
import {
  getPendingPaychanguService,
  clearPendingPaychanguService,
  setServicePayNowUiHold,
} from '../utils/pendingPaychanguService';
import { baseApi } from '../store/api/baseApi';

const VERIFY_POLL_MS = 5000;
const VERIFY_MAX_ATTEMPTS = 36;

export type ReconcileServiceOptions = {
  /** When set, UI should only show “confirming” on this page if pending storage matches these ids. */
  towingServiceId?: string | null;
  carServiceId?: string | null;
};

export type ReconcilePendingPaychanguServiceResult = {
  isConfirmingServicePayment: boolean;
  /** True when opts reference the same service as pending storage (for ServicePayment overlay). */
  pendingMatchesThisPage: boolean;
  /** Present while a PayChangu return is being reconciled (e.g. disable Pay Now for this booking). */
  pendingTowingServiceId: string;
  pendingCarServiceId: string;
};

/**
 * Polls public verify-txref with towingServiceId or carServiceId so service payments complete
 * when the user never returns from PayChangu (e.g. closed tab during redirect).
 */
export function useReconcilePendingPaychanguService(
  opts?: ReconcileServiceOptions
): ReconcilePendingPaychanguServiceResult {
  const dispatch = useAppDispatch();
  const reconciledRef = useRef(false);
  const gaveUpPollingRef = useRef(false);
  const prevPendingSigRef = useRef<string>('');

  const pending = getPendingPaychanguService();
  const pendingSig = `${pending.towingServiceId}|${pending.carServiceId}`;
  const hasPending = Boolean(pending.towingServiceId || pending.carServiceId);

  const pendingMatchesThisPage = Boolean(
    (opts?.towingServiceId && opts.towingServiceId === pending.towingServiceId) ||
      (opts?.carServiceId && opts.carServiceId === pending.carServiceId)
  );

  const showConfirmingUi = hasPending && (opts == null ? true : pendingMatchesThisPage);

  const [isConfirmingServicePayment, setIsConfirmingServicePayment] = useState(() => {
    const p = getPendingPaychanguService();
    const h = Boolean(p.towingServiceId || p.carServiceId);
    if (!h) return false;
    if (opts == null) return true;
    if (!opts.towingServiceId && !opts.carServiceId) return false;
    return (
      (opts.towingServiceId != null && opts.towingServiceId === p.towingServiceId) ||
      (opts.carServiceId != null && opts.carServiceId === p.carServiceId)
    );
  });

  const runReconcileSuccess = useCallback(() => {
    if (reconciledRef.current) {
      return;
    }
    reconciledRef.current = true;
    gaveUpPollingRef.current = false;
    setIsConfirmingServicePayment(false);
    const snap = getPendingPaychanguService();
    const holdId = snap.towingServiceId || snap.carServiceId;
    if (holdId) {
      setServicePayNowUiHold(holdId, 8000);
    }
    clearPendingPaychanguService();
    dispatch(
      baseApi.util.invalidateTags(['TowingService', 'CarService', 'Payment', 'Order', 'Admin'])
    );
    dispatch(
      showNotification({
        message: 'Payment confirmed. Your service booking is up to date.',
        type: 'success',
      })
    );
  }, [dispatch]);

  useEffect(() => {
    if (prevPendingSigRef.current !== pendingSig) {
      prevPendingSigRef.current = pendingSig;
      gaveUpPollingRef.current = false;
      reconciledRef.current = false;
    }

    if (!hasPending) {
      setIsConfirmingServicePayment(false);
      return;
    }

    if (gaveUpPollingRef.current) {
      setIsConfirmingServicePayment(false);
      return;
    }

    setIsConfirmingServicePayment(showConfirmingUi);
  }, [hasPending, pendingSig, showConfirmingUi]);

  useEffect(() => {
    if (!hasPending || reconciledRef.current) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let intervalId = 0;
    let inFlight = false;
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    const queryParam = pending.towingServiceId
      ? `towingServiceId=${encodeURIComponent(pending.towingServiceId)}`
      : `carServiceId=${encodeURIComponent(pending.carServiceId)}`;

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
        clearPendingPaychanguService();
        dispatch(baseApi.util.invalidateTags(['TowingService', 'CarService', 'Payment']));
        setIsConfirmingServicePayment(false);
        stopPolling();
        return;
      }
      inFlight = true;
      try {
        const res = await fetch(`${apiBase}/payments/verify-txref?${queryParam}`);
        const data = (await res.json()) as {
          verified?: boolean;
          payment?: { status?: string };
        };
        if (cancelled || reconciledRef.current) {
          return;
        }
        if (data?.verified === true || data?.payment?.status === PaymentStatus.COMPLETED) {
          runReconcileSuccess();
          stopPolling();
          return;
        }
        if (attempts >= VERIFY_MAX_ATTEMPTS) {
          gaveUpPollingRef.current = true;
          clearPendingPaychanguService();
          dispatch(baseApi.util.invalidateTags(['TowingService', 'CarService', 'Payment']));
          setIsConfirmingServicePayment(false);
          stopPolling();
        }
      } catch {
        if (cancelled || reconciledRef.current) {
          return;
        }
        if (attempts >= VERIFY_MAX_ATTEMPTS) {
          gaveUpPollingRef.current = true;
          clearPendingPaychanguService();
          dispatch(baseApi.util.invalidateTags(['TowingService', 'CarService', 'Payment']));
          setIsConfirmingServicePayment(false);
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
  }, [hasPending, pending.towingServiceId, pending.carServiceId, runReconcileSuccess]);

  useEffect(() => {
    if (!hasPending) {
      reconciledRef.current = false;
    }
  }, [hasPending]);

  return {
    isConfirmingServicePayment,
    pendingMatchesThisPage,
    pendingTowingServiceId: pending.towingServiceId,
    pendingCarServiceId: pending.carServiceId,
  };
}
