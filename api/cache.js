// Simple in-memory cache for Vercel serverless functions
// Note: cache resets on cold starts, but still protects against burst traffic

const cache = new Map();

/**
 * Get a cached value
 * @param {string} key
 * @returns {any | null}
 */
export function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * Set a cached value
 * @param {string} key
 * @param {any} value
 * @param {number} ttlSeconds - time to live in seconds
 */
export function cacheSet(key, value, ttlSeconds = 3600) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Delete a cached value
 * @param {string} key
 */
export function cacheDel(key) {
  cache.delete(key);
}
