const TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  posts: any[];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export function getCachedFeed(userId: string): any[] | null {
  const entry = cache.get(userId);
  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(userId);
    return null;
  }
  return entry.posts;
}

export function setCachedFeed(userId: string, posts: any[]): void {
  cache.set(userId, { posts, expiresAt: Date.now() + TTL_MS });
}

export function invalidateFeedCache(userId: string): void {
  cache.delete(userId);
}

export function invalidateAllFeedCache(): void {
  cache.clear();
}
