interface CacheEntry {
  key: string;
  value: string;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

async function saveToCache(key: string, value: string, ttlMs: number): Promise<void> {
  // Simulate async storage (e.g., Redis, database)
  await new Promise((resolve) => setTimeout(resolve, 1));
  store.set(key, {
    key,
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

async function loadFromCache(key: string): Promise<string | null> {
  await new Promise((resolve) => setTimeout(resolve, 1));
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export async function getOrFetchData(key: string, fetchFn: () => Promise<string>): Promise<string> {
  // Bug: missing await on loadFromCache. The result `cached` will be a
  // Promise, which is truthy, so the function always returns a Promise
  // object (as a string) instead of the actual cached value.
  const cached = loadFromCache(key);

  if (cached) {
    console.log('Cache hit:', key);
    return cached as unknown as string;
  }

  console.log('Cache miss:', key);
  const fresh = await fetchFn();
  await saveToCache(key, fresh, 60_000);
  return fresh;
}
