export interface OrderQuantitySource {
  items: Array<{ quantity: number }>;
}

export function getOrderTotalQuantity(order: OrderQuantitySource): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function formatOrderItemCount(order: OrderQuantitySource): string {
  const qty = getOrderTotalQuantity(order);
  return `${qty} ${qty === 1 ? 'item' : 'items'}`;
}
