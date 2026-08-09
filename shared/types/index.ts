// Shared types between frontend and backend

export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
  MECHANIC = 'mechanic',
}

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  DISPATCHED = 'dispatched',
  READY_FOR_COLLECTION = 'ready_for_collection',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum CustomOrderStatus {
  PENDING = 'pending',
  ORDERED = 'ordered',
  RECEIVED = 'received',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export type ProductFitmentStatus = 'none' | 'partial' | 'verified';

export interface ProductCompatibilityEntry {
  make: string;
  model: string;
  yearFrom?: number;
  yearTo?: number;
  engine?: string;
  notes?: string;
}

export enum ServiceStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  PAYCHANGU = 'paychangu',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUND_PENDING = 'refund_pending',
  REFUNDED = 'refunded',
}

export enum ServiceType {
  OIL_CHANGE = 'oil-change',
  BRAKE_PADS = 'brake-pads',
  SPARK_PLUGS = 'spark-plugs',
  AIR_FILTER = 'air-filter',
  BATTERY = 'battery',
  TIRE_ROTATION = 'tire-rotation',
  OTHER = 'other',
}

export enum ReturnStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ReturnReason {
  DEFECTIVE = 'defective',
  WRONG_ITEM = 'wrong-item',
  NOT_AS_DESCRIBED = 'not-as-described',
  CHANGED_MIND = 'changed-mind',
  OTHER = 'other',
}

export enum RefundMethod {
  ORIGINAL_PAYMENT = 'original-payment',
  STORE_CREDIT = 'store-credit',
}

export enum RefundStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/** Garage verification for partner workshops */
export enum GarageVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  SUSPENDED = 'suspended',
}

/** Service provider role for assignment */
export enum ProviderType {
  DRIVER = 'driver',
  MECHANIC = 'mechanic',
}

/** Vetting before a provider can be assigned */
export enum ProviderVettingStatus {
  PENDING_REVIEW = 'pending_review',
  VETTED = 'vetted',
  SUSPENDED = 'suspended',
}

export enum ServicePayoutStatus {
  PENDING = 'pending',
  PAID = 'paid',
  VOIDED = 'voided',
}
