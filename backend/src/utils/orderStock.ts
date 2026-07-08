/**
 * BR-03 — Stock policy (Option B, documented MVP choice):
 * - Deduct stock when an order is created (holds inventory for checkout).
 * - Restore stock when a cancel is allowed (pending/processing per BR-04).
 * - Payment success does not change stock (already deducted at create).
 *
 * Option A (reserve field + deduct on payment) can replace this later if needed.
 */
import mongoose, { Types } from 'mongoose';
import Product, { IProduct } from '../models/Product';
import type { IOrderItem } from '../models/Order';
import { log } from './logger';

export class InsufficientStockError extends Error {
  constructor(
    public productName: string,
    public available: number
  ) {
    super(`Insufficient stock for ${productName}. Available: ${available}`);
    this.name = 'InsufficientStockError';
  }
}

export async function loadProductForStockCheck(
  productId: string
): Promise<IProduct | null> {
  return Product.findById(productId);
}

export function assertSufficientStock(product: IProduct, quantity: number): void {
  if (product.stock < quantity) {
    throw new InsufficientStockError(product.name, product.stock);
  }
}

/** Reduce sellable stock when an order is placed. */
export async function deductStockForOrderItem(
  product: IProduct,
  quantity: number,
  session?: mongoose.ClientSession
): Promise<void> {
  assertSufficientStock(product, quantity);
  product.stock -= quantity;
  if (product.stock === 0) {
    product.status = 'out-of-stock';
  }
  await product.save({ session });
}

/** Return stock to inventory when an allowed cancel occurs. */
export async function restoreStockForOrderItems(
  items: IOrderItem[],
  session?: mongoose.ClientSession
): Promise<void> {
  for (const item of items) {
    const productId =
      item.product instanceof Types.ObjectId
        ? item.product
        : new Types.ObjectId(String(item.product));

    const product = await Product.findById(productId).session(session ?? null);
    if (!product) {
      log.warn('restoreStockForOrderItems: product not found', {
        productId: productId.toString(),
      });
      continue;
    }

    product.stock += item.quantity;
    if (product.stock > 0 && product.status === 'out-of-stock') {
      product.status = 'available';
    }
    await product.save({ session });
  }
}
