import Redis from 'ioredis';

export class RedisClient {
  private static instance: Redis | null = null;

  static getInstance(): Redis {
    if (!RedisClient.instance) {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const redisPassword = process.env.REDIS_PASSWORD;

      RedisClient.instance = new Redis(redisUrl, {
        password: redisPassword,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      RedisClient.instance.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      RedisClient.instance.on('connect', () => {
        console.log('Redis Client Connected');
      });
    }

    return RedisClient.instance;
  }

  static async disconnect(): Promise<void> {
    if (RedisClient.instance) {
      await RedisClient.instance.quit();
      RedisClient.instance = null;
    }
  }
}

export const redis = RedisClient.getInstance();

export class CacheManager {
  private redis: Redis;
  private defaultTTL: number;

  constructor(redis: Redis, defaultTTL = 3600) {
    this.redis = redis;
    this.defaultTTL = defaultTTL;
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttl || this.defaultTTL) {
      await this.redis.setex(key, ttl || this.defaultTTL, serializedValue);
    } else {
      await this.redis.set(key, serializedValue);
    }
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    return await this.redis.ttl(key);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.redis.expire(key, seconds);
    return result === 1;
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const values = await this.redis.mget(...keys);
    return values.map((value) => {
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    });
  }

  async mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    Object.entries(keyValuePairs).forEach(([key, value]) => {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttl || this.defaultTTL) {
        pipeline.setex(key, ttl || this.defaultTTL, serializedValue);
      } else {
        pipeline.set(key, serializedValue);
      }
    });
    
    await pipeline.exec();
  }
}

export const cacheManager = new CacheManager(redis);