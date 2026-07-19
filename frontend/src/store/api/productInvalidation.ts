/** Resolve a product id from an order line item (populated or raw id). */
export function productIdFromOrderItem(item: {
  product: { _id: string } | string | null | undefined;
}): string | null {
  const { product } = item;
  if (!product) return null;
  if (typeof product === 'string') return product;
  if (typeof product === 'object' && '_id' in product && product._id) {
    return product._id;
  }
  return null;
}

/** RTK Query tags to refresh product list and specific product caches. */
export function productInvalidationTags(productIds: string[]) {
  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  return [
    { type: 'Product' as const, id: 'LIST' },
    ...uniqueIds.map((id) => ({ type: 'Product' as const, id })),
  ];
}
