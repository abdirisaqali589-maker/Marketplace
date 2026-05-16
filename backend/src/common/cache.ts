import Redis from 'ioredis';
import { config } from './config';
import { logger } from './logger';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) {
          logger.warn('Redis connection failed after 5 retries, caching disabled');
          return null; // stop retrying
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redis.on('error', (err) => {
      logger.warn('Redis connection error (caching degraded):', { error: err.message });
    });

    redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });
  }
  return redis;
}

const DEFAULT_TTL = 300; // 5 minutes

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const r = getRedis();
    if (!r) return null;
    const data = await r.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (err) {
    logger.warn('Cache get failed', { key, error: (err as Error).message });
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttl = DEFAULT_TTL): Promise<void> {
  try {
    const r = getRedis();
    if (!r) return;
    await r.setex(key, ttl, JSON.stringify(value));
  } catch (err) {
    logger.warn('Cache set failed', { key, error: (err as Error).message });
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const r = getRedis();
    if (!r) return;
    await r.del(key);
  } catch (err) {
    logger.warn('Cache delete failed', { key, error: (err as Error).message });
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    const r = getRedis();
    if (!r) return;
    const keys = await r.keys(pattern);
    if (keys.length > 0) {
      await r.del(...keys);
    }
  } catch (err) {
    logger.warn('Cache delete pattern failed', { pattern, error: (err as Error).message });
  }
}

export async function cacheIncr(key: string): Promise<number> {
  try {
    const r = getRedis();
    if (!r) return 0;
    return await r.incr(key);
  } catch (err) {
    logger.warn('Cache incr failed', { key, error: (err as Error).message });
    return 0;
  }
}

// Cache-aside helper: fetch from cache or callback, then cache
export async function cacheAside<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl = DEFAULT_TTL,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const data = await fetchFn();
  await cacheSet(key, data, ttl);
  return data;
}