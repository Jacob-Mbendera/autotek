"use strict";
// Shared types between frontend and backend
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceType = exports.PaymentStatus = exports.PaymentMethod = exports.ServiceStatus = exports.CustomOrderStatus = exports.OrderStatus = exports.UserRole = void 0;
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
//# sourceMappingURL=index.js.map