// Shared types between frontend and backend

export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
  MECHANIC = 'mechanic',
}

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
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

export enum ServiceStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  AIRTEL_MONEY = 'airtel-money',
  BANK_TRANSFER = 'bank-transfer',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
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
