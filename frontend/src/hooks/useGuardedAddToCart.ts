import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/types';
import { addItem, type CartItem } from '../store/slices/cartSlice';
import { useGetOrderQuery, useGetOrdersQuery } from '../store/api/orderApi';
import { showNotification } from '../store/slices/uiSlice';
import { OrderStatus, PaymentStatus } from '@shared/types';
import {
  clearPendingPaychanguOrder,
  clearPaychanguRedirectAt,
  getPendingPaychanguOrder,
  isPendingPaychanguOrderFresh,
} from '../utils/pendingPaychanguOrder';

const PENDING_ORDER_MESSAGE =
  'You have a pending unpaid order. Complete or cancel it before adding more items to your cart.';

function isUnpaidPendingOrder(order: {
  status: string;
  paymentStatus: string;
}): boolean {
  return (
    order.status === OrderStatus.PENDING &&
    (order.paymentStatus === PaymentStatus.PENDING ||
      order.paymentStatus === PaymentStatus.FAILED)
  );
}

export function useGuardedAddToCart() {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { orderId: localPendingId, guestEmail: localPendingEmail } = getPendingPaychanguOrder();
  const hasFreshLocalPending = Boolean(localPendingId) && isPendingPaychanguOrderFresh();

  const { data: ordersData } = useGetOrdersQuery(
    { status: 'pending', limit: 10 },
    { skip: !isAuthenticated }
  );

  const { data: localPendingOrderData, isError: localPendingOrderError } = useGetOrderQuery(
    {
      id: localPendingId,
      email: !isAuthenticated && localPendingEmail ? localPendingEmail : undefined,
    },
    {
      skip: !hasFreshLocalPending || (!isAuthenticated && !localPendingEmail),
      refetchOnMountOrArgChange: true,
    }
  );

  // Stale local PayChangu marker: order was cancelled / paid / missing — clear it.
  useEffect(() => {
    if (!hasFreshLocalPending || !localPendingId) return;

    if (localPendingOrderError) {
      clearPendingPaychanguOrder();
      clearPaychanguRedirectAt();
      return;
    }

    const order = localPendingOrderData?.order;
    if (!order) return;

    if (!isUnpaidPendingOrder(order)) {
      clearPendingPaychanguOrder();
      clearPaychanguRedirectAt();
    }
  }, [hasFreshLocalPending, localPendingId, localPendingOrderData, localPendingOrderError]);

  const hasPendingUnpaidFromApi =
    ordersData?.orders?.some((order) => isUnpaidPendingOrder(order)) ?? false;

  const localOrderStillBlocks =
    hasFreshLocalPending &&
    Boolean(localPendingOrderData?.order) &&
    isUnpaidPendingOrder(localPendingOrderData!.order);

  const hasPendingUnpaidOrder = localOrderStillBlocks || hasPendingUnpaidFromApi;

  const guardedAddToCart = useCallback(
    (item: CartItem, options?: { skipNotification?: boolean }) => {
      if (hasPendingUnpaidOrder) {
        dispatch(
          showNotification({
            message: PENDING_ORDER_MESSAGE,
            type: 'warning',
          })
        );
        return false;
      }

      dispatch(addItem(item));

      if (!options?.skipNotification) {
        dispatch(showNotification({ message: 'Product added to cart!', type: 'success' }));
      }

      return true;
    },
    [dispatch, hasPendingUnpaidOrder]
  );

  return { guardedAddToCart, hasPendingUnpaidOrder };
}
