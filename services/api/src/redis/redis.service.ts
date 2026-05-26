import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private enabled = false;

  constructor() {
    if (process.env.REDIS_DISABLED === 'true') {
      this.logger.warn('Redis disabled (REDIS_DISABLED=true) — OK for local dev without Docker');
      return;
    }

    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.client = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });
      this.client.connect().catch(() => {
        this.logger.warn('Redis not available — continuing without cache');
        this.client = null;
      });
      this.enabled = true;
    } catch {
      this.logger.warn('Redis init failed — continuing without cache');
    }
  }

  private get redis(): Redis | null {
    return this.client?.status === 'ready' ? this.client : null;
  }

  getClient(): Redis | null {
    return this.redis;
  }

  async get(key: string): Promise<string | null> {
    if (!this.redis) return null;
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.redis) return;
    if (ttlSeconds) await this.redis.setex(key, ttlSeconds, value);
    else await this.redis.set(key, value);
  }

  async del(key: string): Promise<void> {
    if (!this.redis) return;
    await this.redis.del(key);
  }

  async onModuleDestroy() {
    if (this.client) await this.client.quit();
  }
}
