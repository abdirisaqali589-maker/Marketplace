import Redis from 'ioredis';
import { config } from './config';
import { logger } from './logger';

const memoryStore = new Map<string, { value: string; expiresAt: number }>();
let redis: Redis | null = null;

function getRedis() {
  if (!config.redisUrl) return null;
  if (!redis) {
    redis = new Redis(config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    redis.on('error', (error) => logger.warn('Redis OTP store unavailable, using memory fallback', { error: error.message }));
  }
  return redis;
}

export async function setOtp(key: string, value: string, ttlSeconds: number) {
  const client = getRedis();
  if (client) {
    try {
      if (client.status === 'wait') await client.connect();
      await client.set(key, value, 'EX', ttlSeconds);
      return;
    } catch {
      // Fall back to memory store below.
    }
  }
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function getOtp(key: string) {
  const client = getRedis();
  if (client) {
    try {
      if (client.status === 'wait') await client.connect();
      return await client.get(key);
    } catch {
      // Fall back to memory store below.
    }
  }
  const stored = memoryStore.get(key);
  if (!stored) return null;
  if (stored.expiresAt < Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return stored.value;
}

export async function deleteOtp(key: string) {
  const client = getRedis();
  if (client) {
    try {
      if (client.status === 'wait') await client.connect();
      await client.del(key);
    } catch {
      // Fall back to memory store below.
    }
  }
  memoryStore.delete(key);
}
