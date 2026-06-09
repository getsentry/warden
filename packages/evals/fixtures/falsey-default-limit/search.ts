interface SearchOptions {
  query: string;
  /** A limit of 0 asks the API to return only result metadata. */
  limit?: number;
  includeArchived?: boolean;
}

interface SearchRequest {
  q: string;
  limit: number;
  includeArchived: boolean;
}

const DEFAULT_LIMIT = 50;

export function buildSearchRequest(options: SearchOptions): SearchRequest {
  return {
    q: options.query.trim(),
    limit: options.limit || DEFAULT_LIMIT,
    includeArchived: options.includeArchived ?? false,
  };
}

export function selectPreviewResults<T>(items: T[], options: SearchOptions): T[] {
  const request = buildSearchRequest(options);
  return items.slice(0, request.limit);
}
