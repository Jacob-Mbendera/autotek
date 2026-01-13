// Pagination utility functions

export interface PaginationParams {
  page: string | undefined;
  limit: string | undefined;
}

export interface PaginationResult {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MIN_PAGE = 1;

/**
 * Parse and validate pagination parameters
 * @param params - Pagination parameters from query string
 * @returns Validated pagination result
 */
export const parsePagination = (params: PaginationParams): PaginationResult => {
  const page = Math.max(
    MIN_PAGE,
    parseInt(params.page || String(DEFAULT_PAGE), 10) || DEFAULT_PAGE
  );
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(params.limit || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Create pagination response object
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Pagination response object
 */
export const createPaginationResponse = (
  page: number,
  limit: number,
  total: number
): PaginationResponse => {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };
};
