// Currency utilities for Malawi (MWK - Malawi Kwacha)

export const CURRENCY_CODE = 'MWK';
export const CURRENCY_SYMBOL = 'MK';

/**
 * Format amount as Malawi Kwacha
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-MW', {
    style: 'currency',
    currency: 'MWK',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format amount with custom format
 * @param amount - Amount to format
 * @returns Formatted string (e.g., "1,234.56 MWK")
 */
export const formatAmount = (amount: number): string => {
  return `${amount.toLocaleString('en-MW', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${CURRENCY_CODE}`;
};
