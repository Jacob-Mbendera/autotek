import { ERROR_MESSAGES, getErrorMessageByStatus } from './errorMessages';

/**
 * Error types for categorization
 */
export type ErrorType = 'network' | 'server' | 'client' | 'validation' | 'timeout' | 'unknown';

/**
 * Structured error information
 */
export interface ErrorInfo {
  type: ErrorType;
  message: string;
  statusCode?: number;
  fieldErrors?: Record<string, string>;
  originalError?: any;
}

/**
 * Check if error is a network error
 */
function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  // RTK Query network errors
  if (error.status === 'FETCH_ERROR' || error.status === 'PARSING_ERROR') {
    return true;
  }
  
  // Fetch API network errors
  if (error.message) {
    const message = error.message.toLowerCase();
    return (
      message.includes('failed to fetch') ||
      message.includes('network error') ||
      message.includes('networkrequestfailed') ||
      message.includes('network error when attempting to fetch')
    );
  }
  
  // Check for connection-related errors
  if (error.name === 'TypeError' && error.message?.includes('fetch')) {
    return true;
  }
  
  return false;
}

/**
 * Check if error is a timeout error
 */
function isTimeoutError(error: any): boolean {
  if (!error) return false;
  
  if (error.message) {
    const message = error.message.toLowerCase();
    return message.includes('timeout') || message.includes('timed out');
  }
  
  return false;
}

/**
 * Extract status code from RTK Query error
 */
function extractStatusCode(error: any): number | undefined {
  if (error?.status && typeof error.status === 'number') {
    return error.status;
  }
  
  if (error?.data?.statusCode) {
    return error.data.statusCode;
  }
  
  if (error?.originalStatus) {
    return error.originalStatus;
  }
  
  return undefined;
}

/**
 * Extract field-specific validation errors
 */
function extractFieldErrors(error: any): Record<string, string> | undefined {
  // Handle express-validator format: { errors: [{ msg: '...', param: 'field' }] }
  if (error?.data?.errors && Array.isArray(error.data.errors)) {
    const fieldErrors: Record<string, string> = {};
    error.data.errors.forEach((err: any) => {
      const field = err.param || err.field || err.path;
      const message = err.msg || err.message || 'Validation error';
      if (field) {
        fieldErrors[field] = message;
      }
    });
    if (Object.keys(fieldErrors).length > 0) {
      return fieldErrors;
    }
  }
  
  // Handle mongoose validation errors
  if (error?.data?.errors && typeof error.data.errors === 'object') {
    const fieldErrors: Record<string, string> = {};
    Object.keys(error.data.errors).forEach((field) => {
      const err = error.data.errors[field];
      if (err?.message) {
        fieldErrors[field] = err.message;
      }
    });
    if (Object.keys(fieldErrors).length > 0) {
      return fieldErrors;
    }
  }
  
  return undefined;
}

/**
 * Extract error message from various error formats
 */
function extractErrorMessage(error: any, statusCode?: number): string {
  // Priority 1: Specific error message from backend
  if (error?.data?.message && typeof error.data.message === 'string') {
    return error.data.message;
  }
  
  // Priority 2: Error message from error object
  if (error?.message && typeof error.message === 'string') {
    // Skip generic fetch errors, we'll handle those separately
    if (!error.message.toLowerCase().includes('failed to fetch')) {
      return error.message;
    }
  }
  
  // Priority 3: Error from error.data
  if (error?.data?.error && typeof error.data.error === 'string') {
    return error.data.error;
  }
  
  // Priority 4: Status code-based message
  if (statusCode) {
    return getErrorMessageByStatus(statusCode);
  }
  
  // Priority 5: Default fallback
  return ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Determine error type based on error structure and status code
 */
function determineErrorType(error: any, statusCode?: number): ErrorType {
  if (isTimeoutError(error)) {
    return 'timeout';
  }
  
  if (isNetworkError(error)) {
    return 'network';
  }
  
  if (statusCode) {
    if (statusCode >= 500) {
      return 'server';
    }
    if (statusCode === 400 || statusCode === 422) {
      return 'validation';
    }
    if (statusCode >= 400) {
      return 'client';
    }
  }
  
  // Check for validation errors in data
  if (error?.data?.errors) {
    return 'validation';
  }
  
  return 'unknown';
}

/**
 * Get specific error message based on error type and context
 */
function getSpecificErrorMessage(
  error: any,
  type: ErrorType,
  statusCode?: number,
  defaultMessage?: string
): string {
  // Prefer API/body message whenever the server sent one (validation, business rules)
  if (error?.data?.message && typeof error.data.message === 'string') {
    return error.data.message;
  }

  // Network errors
  if (type === 'network') {
    // Check if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return ERROR_MESSAGES.NETWORK_OFFLINE;
    }
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  
  // Timeout errors
  if (type === 'timeout') {
    return ERROR_MESSAGES.NETWORK_TIMEOUT;
  }
  
  // Server errors
  if (type === 'server') {
    if (statusCode === 503) {
      return ERROR_MESSAGES.SERVER_ERROR_503;
    }
    if (statusCode === 500) {
      return ERROR_MESSAGES.SERVER_ERROR_500;
    }
    return ERROR_MESSAGES.SERVER_ERROR_GENERIC;
  }
  
  // Client errors with specific messages (only if no specific message from backend)
  if (type === 'client' && statusCode) {
    if (statusCode === 401) {
      return ERROR_MESSAGES.UNAUTHORIZED_401;
    }
    if (statusCode === 403) {
      return ERROR_MESSAGES.FORBIDDEN_403;
    }
    if (statusCode === 404) {
      return ERROR_MESSAGES.NOT_FOUND_404;
    }
    if (statusCode === 409) {
      return ERROR_MESSAGES.CONFLICT_409;
    }
  }
  
  // Extract message from error (fallback)
  const extractedMessage = extractErrorMessage(error, statusCode);
  if (extractedMessage !== ERROR_MESSAGES.UNKNOWN_ERROR) {
    return extractedMessage;
  }

  if (defaultMessage) {
    return defaultMessage;
  }

  return ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Main function to extract comprehensive error information
 * 
 * @param error - The error object from catch block (RTK Query error or other)
 * @param defaultMessage - Optional default message to use if error doesn't provide one
 * @returns ErrorInfo object with type, message, statusCode, and fieldErrors
 */
export function getErrorInfo(error: any, defaultMessage?: string): ErrorInfo {
  if (!error) {
    return {
      type: 'unknown',
      message: defaultMessage || ERROR_MESSAGES.UNKNOWN_ERROR,
    };
  }
  
  // Extract status code
  const statusCode = extractStatusCode(error);
  
  // Determine error type
  const type = determineErrorType(error, statusCode);
  
  // Extract field errors (for validation errors)
  const fieldErrors = extractFieldErrors(error);
  
  // Get specific error message
  const message = getSpecificErrorMessage(error, type, statusCode, defaultMessage);
  
  return {
    type,
    message,
    statusCode,
    fieldErrors,
    originalError: error,
  };
}

/**
 * Helper to get just the error message (simplified version)
 */
export function getErrorMessage(error: any, defaultMessage?: string): string {
  return getErrorInfo(error, defaultMessage).message;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: any): boolean {
  const errorInfo = getErrorInfo(error);
  return errorInfo.type === 'validation' || !!errorInfo.fieldErrors;
}

/**
 * Check if error is a network error
 */
export function isNetworkErrorType(error: any): boolean {
  const errorInfo = getErrorInfo(error);
  return errorInfo.type === 'network' || errorInfo.type === 'timeout';
}
