export declare enum UserRole {
    CUSTOMER = "customer",
    ADMIN = "admin",
    MECHANIC = "mechanic"
}
export declare enum OrderStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    DISPATCHED = "dispatched",
    READY_FOR_COLLECTION = "ready_for_collection",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}
export declare enum CustomOrderStatus {
    PENDING = "pending",
    ORDERED = "ordered",
    RECEIVED = "received",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}
export declare enum ServiceStatus {
    PENDING = "pending",
    ASSIGNED = "assigned",
    IN_PROGRESS = "in-progress",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}
export declare enum PaymentMethod {
    AIRTEL_MONEY = "airtel-money",
    BANK_TRANSFER = "bank-transfer",
    PAYCHANGU = "paychangu"
}
export declare enum PaymentStatus {
    PENDING = "pending",
    COMPLETED = "completed",
    FAILED = "failed",
    REFUND_PENDING = "refund_pending",
    REFUNDED = "refunded"
}
export declare enum ServiceType {
    OIL_CHANGE = "oil-change",
    BRAKE_PADS = "brake-pads",
    SPARK_PLUGS = "spark-plugs",
    AIR_FILTER = "air-filter",
    BATTERY = "battery",
    TIRE_ROTATION = "tire-rotation",
    OTHER = "other"
}
export declare enum ReturnStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}
export declare enum ReturnReason {
    DEFECTIVE = "defective",
    WRONG_ITEM = "wrong-item",
    NOT_AS_DESCRIBED = "not-as-described",
    CHANGED_MIND = "changed-mind",
    OTHER = "other"
}
export declare enum RefundMethod {
    ORIGINAL_PAYMENT = "original-payment",
    STORE_CREDIT = "store-credit"
}
export declare enum RefundStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed"
}
export declare enum GarageVerificationStatus {
    PENDING = "pending",
    VERIFIED = "verified",
    SUSPENDED = "suspended"
}
export declare enum ProviderType {
    DRIVER = "driver",
    MECHANIC = "mechanic"
}
export declare enum ProviderVettingStatus {
    PENDING_REVIEW = "pending_review",
    VETTED = "vetted",
    SUSPENDED = "suspended"
}
export declare enum ServicePayoutStatus {
    PENDING = "pending",
    PAID = "paid"
}
//# sourceMappingURL=index.d.ts.map