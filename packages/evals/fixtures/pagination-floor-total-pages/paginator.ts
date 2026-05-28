interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
}

type FetchPage<T> = (page: number) => Promise<Page<T>>;

/**
 * Fetches every item from a one-indexed paginated API.
 */
export async function fetchAllItems<T>(fetchPage: FetchPage<T>): Promise<T[]> {
  const firstPage = await fetchPage(1);
  const totalPages = Math.floor(firstPage.totalItems / firstPage.pageSize);
  const items = [...firstPage.items];

  for (let page = 2; page <= totalPages; page++) {
    const nextPage = await fetchPage(page);
    items.push(...nextPage.items);
  }

  return items;
}
