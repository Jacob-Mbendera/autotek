/**
 * Centralized error message constants for consistent error handling
 */

export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: 'Unable to connect to server. Please check your internet connection.',
  NETWORK_OFFLINE: 'You are currently offline. Please check your internet connection.',
  NETWORK_TIMEOUT: 'Request timed out. Please try again.',

  // Server errors
  SERVER_ERROR_500: 'Server error. Please try again in a few moments.',
  SERVER_ERROR_503: 'Service temporarily unavailable. Please try again later.',
  SERVER_ERROR_GENERIC: 'An unexpected server error occurred. Please try again.',

  // Client errors
  UNAUTHORIZED_401: 'Your session has expired. Please log in again.',
  FORBIDDEN_403: "You don't have permission to perform this action.",
  NOT_FOUND_404: 'The requested resource was not found.',
  BAD_REQUEST_400: 'Invalid request. Please check your input and try again.',
  CONFLICT_409: 'This action conflicts with the current state. Please refresh and try again.',

  // Validation errors (generic)
  VALIDATION_ERROR: 'Please check your input and try again.',
  REQUIRED_FIELD: 'This field is required.',
  INVALID_FORMAT: 'Invalid format. Please check your input.',

  // Authentication & Authorization
  INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
  EMAIL_ALREADY_EXISTS: 'This email is already registered. Please use a different email or log in.',
  PHONE_ALREADY_EXISTS: 'This phone number is already registered.',
  PASSWORD_TOO_SHORT: 'Password must be at least 6 characters long.',
  PASSWORDS_DO_NOT_MATCH: 'Passwords do not match.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',

  // Product & Order errors
  PRODUCT_NOT_FOUND: 'Product not found.',
  PRODUCT_OUT_OF_STOCK: 'This product is out of stock.',
  INVALID_COUPON: 'Invalid coupon code. Please check and try again.',
  COUPON_EXPIRED: 'This coupon has expired.',
  COUPON_ALREADY_USED: 'This coupon has already been used.',
  ORDER_NOT_FOUND: 'Order not found.',
  ORDER_CANNOT_BE_CANCELLED: 'This order cannot be cancelled.',
  ORDER_ALREADY_CANCELLED: 'This order has already been cancelled.',

  // Return & Refund errors
  RETURN_NOT_FOUND: 'Return request not found.',
  RETURN_CANNOT_BE_CANCELLED: 'This return request cannot be cancelled.',
  RETURN_ALREADY_PROCESSED: 'This return has already been processed.',

  // Review errors
  REVIEW_NOT_FOUND: 'Review not found.',
  REVIEW_ALREADY_EXISTS: 'You have already reviewed this product.',
  REVIEW_TOO_SHORT: 'Review comment must be at least 10 characters long.',
  REVIEW_TOO_LONG: 'Review comment must not exceed 1000 characters.',

  // Wishlist errors
  WISHLIST_ITEM_NOT_FOUND: 'Item not found in wishlist.',
  WISHLIST_ALREADY_EXISTS: 'This product is already in your wishlist.',

  // Service errors
  SERVICE_NOT_FOUND: 'Service not found.',
  SERVICE_REQUEST_FAILED: 'Failed to submit service request. Please try again.',

  // Generic fallbacks
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  OPERATION_FAILED: 'Operation failed. Please try again.',
} as const;

/**
 * Get user-friendly error message based on HTTP status code
 */
export function getErrorMessageByStatus(status: number): string {
  switch (status) {
    case 400:
      return ERROR_MESSAGES.BAD_REQUEST_400;
    case 401:
      return ERROR_MESSAGES.UNAUTHORIZED_401;
    case 403:
      return ERROR_MESSAGES.FORBIDDEN_403;
    case 404:
      return ERROR_MESSAGES.NOT_FOUND_404;
    case 409:
      return ERROR_MESSAGES.CONFLICT_409;
    case 500:
      return ERROR_MESSAGES.SERVER_ERROR_500;
    case 503:
      return ERROR_MESSAGES.SERVER_ERROR_503;
    default:
      if (status >= 500) {
        return ERROR_MESSAGES.SERVER_ERROR_GENERIC;
      }
      if (status >= 400) {
        return ERROR_MESSAGES.BAD_REQUEST_400;
      }
      return ERROR_MESSAGES.UNKNOWN_ERROR;
  }
}
