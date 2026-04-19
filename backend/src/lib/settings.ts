import { prisma } from './prisma';

// Simple in-memory cache — invalidates every 30 seconds
let cache: Record<string, any> = {};
let cacheAt = 0;
const TTL = 30_000;

export async function getSetting<T = any>(key: string, defaultValue: T): Promise<T> {
  const now = Date.now();
  if (now - cacheAt > TTL) {
    const rows = await prisma.systemSetting.findMany({ select: { key: true, value: true } });
    cache = Object.fromEntries(rows.map(r => [r.key, r.value]));
    cacheAt = now;
  }
  return (key in cache ? cache[key] : defaultValue) as T;
}

export function invalidateSettingsCache() {
  cacheAt = 0;
}
