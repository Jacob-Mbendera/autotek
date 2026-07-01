"use strict";
// Shared types between frontend and backend
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServicePayoutStatus = exports.ProviderVettingStatus = exports.ProviderType = exports.GarageVerificationStatus = exports.RefundStatus = exports.RefundMethod = exports.ReturnReason = exports.ReturnStatus = exports.ServiceType = exports.PaymentStatus = exports.PaymentMethod = exports.ServiceStatus = exports.CustomOrderStatus = exports.OrderStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["CUSTOMER"] = "customer";
    UserRole["ADMIN"] = "admin";
    UserRole["MECHANIC"] = "mechanic";
})(UserRole || (exports.UserRole = UserRole = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "pending";
    OrderStatus["PROCESSING"] = "processing";
    OrderStatus["DISPATCHED"] = "dispatched";
    OrderStatus["READY_FOR_COLLECTION"] = "ready_for_collection";
    OrderStatus["COMPLETED"] = "completed";
    OrderStatus["CANCELLED"] = "cancelled";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var CustomOrderStatus;
(function (CustomOrderStatus) {
    CustomOrderStatus["PENDING"] = "pending";
    CustomOrderStatus["ORDERED"] = "ordered";
    CustomOrderStatus["RECEIVED"] = "received";
    CustomOrderStatus["COMPLETED"] = "completed";
    CustomOrderStatus["CANCELLED"] = "cancelled";
})(CustomOrderStatus || (exports.CustomOrderStatus = CustomOrderStatus = {}));
var ServiceStatus;
(function (ServiceStatus) {
    ServiceStatus["PENDING"] = "pending";
    ServiceStatus["ASSIGNED"] = "assigned";
    ServiceStatus["IN_PROGRESS"] = "in-progress";
    ServiceStatus["COMPLETED"] = "completed";
    ServiceStatus["CANCELLED"] = "cancelled";
})(ServiceStatus || (exports.ServiceStatus = ServiceStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["AIRTEL_MONEY"] = "airtel-money";
    PaymentMethod["BANK_TRANSFER"] = "bank-transfer";
    PaymentMethod["PAYCHANGU"] = "paychangu";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["COMPLETED"] = "completed";
    PaymentStatus["FAILED"] = "failed";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var ServiceType;
(function (ServiceType) {
    ServiceType["OIL_CHANGE"] = "oil-change";
    ServiceType["BRAKE_PADS"] = "brake-pads";
    ServiceType["SPARK_PLUGS"] = "spark-plugs";
    ServiceType["AIR_FILTER"] = "air-filter";
    ServiceType["BATTERY"] = "battery";
    ServiceType["TIRE_ROTATION"] = "tire-rotation";
    ServiceType["OTHER"] = "other";
})(ServiceType || (exports.ServiceType = ServiceType = {}));
var ReturnStatus;
(function (ReturnStatus) {
    ReturnStatus["PENDING"] = "pending";
    ReturnStatus["APPROVED"] = "approved";
    ReturnStatus["REJECTED"] = "rejected";
    ReturnStatus["COMPLETED"] = "completed";
    ReturnStatus["CANCELLED"] = "cancelled";
})(ReturnStatus || (exports.ReturnStatus = ReturnStatus = {}));
var ReturnReason;
(function (ReturnReason) {
    ReturnReason["DEFECTIVE"] = "defective";
    ReturnReason["WRONG_ITEM"] = "wrong-item";
    ReturnReason["NOT_AS_DESCRIBED"] = "not-as-described";
    ReturnReason["CHANGED_MIND"] = "changed-mind";
    ReturnReason["OTHER"] = "other";
})(ReturnReason || (exports.ReturnReason = ReturnReason = {}));
var RefundMethod;
(function (RefundMethod) {
    RefundMethod["ORIGINAL_PAYMENT"] = "original-payment";
    RefundMethod["STORE_CREDIT"] = "store-credit";
})(RefundMethod || (exports.RefundMethod = RefundMethod = {}));
var RefundStatus;
(function (RefundStatus) {
    RefundStatus["PENDING"] = "pending";
    RefundStatus["PROCESSING"] = "processing";
    RefundStatus["COMPLETED"] = "completed";
    RefundStatus["FAILED"] = "failed";
})(RefundStatus || (exports.RefundStatus = RefundStatus = {}));
var GarageVerificationStatus;
(function (GarageVerificationStatus) {
    GarageVerificationStatus["PENDING"] = "pending";
    GarageVerificationStatus["VERIFIED"] = "verified";
    GarageVerificationStatus["SUSPENDED"] = "suspended";
})(GarageVerificationStatus || (exports.GarageVerificationStatus = GarageVerificationStatus = {}));
var ProviderType;
(function (ProviderType) {
    ProviderType["DRIVER"] = "driver";
    ProviderType["MECHANIC"] = "mechanic";
})(ProviderType || (exports.ProviderType = ProviderType = {}));
var ProviderVettingStatus;
(function (ProviderVettingStatus) {
    ProviderVettingStatus["PENDING_REVIEW"] = "pending_review";
    ProviderVettingStatus["VETTED"] = "vetted";
    ProviderVettingStatus["SUSPENDED"] = "suspended";
})(ProviderVettingStatus || (exports.ProviderVettingStatus = ProviderVettingStatus = {}));
var ServicePayoutStatus;
(function (ServicePayoutStatus) {
    ServicePayoutStatus["PENDING"] = "pending";
    ServicePayoutStatus["PAID"] = "paid";
})(ServicePayoutStatus || (exports.ServicePayoutStatus = ServicePayoutStatus = {}));
