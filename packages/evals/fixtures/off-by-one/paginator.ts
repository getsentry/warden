export interface PaginatedResult<T> {
  items: T[];
  page: number;
  totalItems: number;
  pageSize: number;
}

/**
 * Fetch all pages of results from a paginated API endpoint.
 * Collects items from every page and returns them as a flat array.
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<PaginatedResult<T>>
): Promise<T[]> {
  const firstPage = await fetchPage(1);
  const allItems: T[] = [...firstPage.items];

  // Bug: Math.floor loses the last page when totalItems is not evenly
  // divisible by pageSize. E.g., 25 items / 10 per page = 2.5, floored
  // to 2, so page 3 (items 21-25) is never fetched.
  const totalPages = Math.floor(firstPage.totalItems / firstPage.pageSize);

  for (let page = 2; page <= totalPages; page++) {
    const result = await fetchPage(page);
    allItems.push(...result.items);
  }

  return allItems;
}

/**
 * Get a specific page range of results.
 */
export function getPageRange(totalItems: number, pageSize: number, currentPage: number): { start: number; end: number } {
  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, totalItems);
  return { start, end };
}
