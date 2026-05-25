export interface PaginationParams {
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parsePagination(rawPage: any, rawPageSize: any): PaginationParams {
  const page = typeof rawPage === 'string'
    ? parseInt(rawPage, 10)
    : NaN;
  const pageSize = typeof rawPageSize === 'string'
    ? parseInt(rawPageSize, 10)
    : NaN;

  return {
    page: Number.isNaN(page) || page < 1 ? DEFAULT_PAGE : page,
    pageSize: Number.isNaN(pageSize) || pageSize < 1
      ? DEFAULT_PAGE_SIZE
      : Math.min(pageSize, MAX_PAGE_SIZE),
  };
}
