import Redis from 'ioredis';
import { supabase } from './supabaseClient';

const REDIS_URL = process.env.REDIS_URL || 'redis://default:AVV3AAIncDJmNmQ2YmU2NzU0MjY0NmZjYmJiMjBhZGZiNDU4Yzk4ZXAyMjE4Nzk@able-weasel-21879.upstash.io:6379';

// Redis options with TLS support for Upstash
const redisOptions: any = {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  tls: {
    rejectUnauthorized: false
  }
};

// Main Redis client
export const redis = new Redis(REDIS_URL, redisOptions);

// Pub/Sub clients (separate connections required for Socket.io adapter)
export const redisPub = new Redis(REDIS_URL, redisOptions);
export const redisSub = new Redis(REDIS_URL, redisOptions);

let isRedisAvailable = true;

redis.on('connect', () => {
  console.log('✅ Redis connected');
  isRedisAvailable = true;
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
  isRedisAvailable = false;
});

redis.on('close', () => {
  console.warn('⚠️ Redis connection closed');
  isRedisAvailable = false;
});

// Redis Service with PostgreSQL fallback
export class RedisService {
  // ==================== USER ONLINE STATUS ====================
  
  static async setUserOnline(userId: string, ttl: number = 30) {
    try {
      if (!isRedisAvailable) throw new Error('Redis unavailable');
      
      await redis.setex(`user:${userId}:online`, ttl, 'true');
      await redis.set(`user:${userId}:last_seen`, Date.now().toString());
    } catch (error) {
      console.error('Redis setUserOnline failed, using DB fallback');
      await supabase
        .from('users')
        .update({ 
          is_online: true, 
          last_seen_at: new Date().toISOString() 
        })
        .eq('id', userId);
    }
  }

  static async setUserOffline(userId: string) {
    try {
      if (!isRedisAvailable) throw new Error('Redis unavailable');
      
      await redis.del(`user:${userId}:online`);
      await redis.set(`user:${userId}:last_seen`, Date.now().toString());
    } catch (error) {
      console.error('Redis setUserOffline failed, using DB fallback');
      await supabase
        .from('users')
        .update({ 
          is_online: false, 
          last_seen_at: new Date().toISOString() 
        })
        .eq('id', userId);
    }
  }

  static async isUserOnline(userId: string): Promise<boolean> {
    try {
      if (!isRedisAvailable) throw new Error('Redis unavailable');
      
      const online = await redis.get(`user:${userId}:online`);
      return online === 'true';
    } catch (error) {
      // Fallback to database
      const { data } = await supabase
        .from('users')
        .select('is_online')
        .eq('id', userId)
        .single();
      
      return data?.is_online || false;
    }
  }

  static async getLastSeen(userId: string): Promise<number | null> {
    try {
      if (!isRedisAvailable) throw new Error('Redis unavailable');
      
      const lastSeen = await redis.get(`user:${userId}:last_seen`);
      return lastSeen ? parseInt(lastSeen) : null;
    } catch (error) {
      const { data } = await supabase
        .from('users')
        .select('last_seen_at')
        .eq('id', userId)
        .single();
      
      return data?.last_seen_at ? new Date(data.last_seen_at).getTime() : null;
    }
  }

  // ==================== TYPING INDICATORS ====================
  
  static async setTyping(conversationId: string, userId: string) {
    try {
      if (!isRedisAvailable) return;
      await redis.setex(`typing:${conversationId}:${userId}`, 5, 'typing');
    } catch (error) {
      console.error('Redis setTyping failed');
    }
  }

  static async stopTyping(conversationId: string, userId: string) {
    try {
      if (!isRedisAvailable) return;
      await redis.del(`typing:${conversationId}:${userId}`);
    } catch (error) {
      console.error('Redis stopTyping failed');
    }
  }

  static async getTypingUsers(conversationId: string): Promise<string[]> {
    try {
      if (!isRedisAvailable) return [];
      
      const keys = await redis.keys(`typing:${conversationId}:*`);
      return keys.map(key => key.split(':')[2]);
    } catch (error) {
      return [];
    }
  }

  // ==================== UNREAD COUNTS ====================
  
  static async incrementUnread(userId: string, conversationId: string) {
    try {
      if (!isRedisAvailable) return;
      await redis.incr(`unread:${userId}:${conversationId}`);
    } catch (error) {
      console.error('Redis incrementUnread failed');
    }
  }

  static async getUnreadCount(userId: string, conversationId: string): Promise<number> {
    try {
      if (!isRedisAvailable) return 0;
      
      const count = await redis.get(`unread:${userId}:${conversationId}`);
      return count ? parseInt(count) : 0;
    } catch (error) {
      return 0;
    }
  }

  static async clearUnread(userId: string, conversationId: string) {
    try {
      if (!isRedisAvailable) return;
      await redis.del(`unread:${userId}:${conversationId}`);
    } catch (error) {
      console.error('Redis clearUnread failed');
    }
  }

  // ==================== SOCKET MANAGEMENT ====================
  
  static async addUserSocket(userId: string, socketId: string) {
    try {
      if (!isRedisAvailable) return;
      
      await redis.sadd(`user:${userId}:sockets`, socketId);
      await redis.set(`socket:${socketId}`, userId);
    } catch (error) {
      console.error('Redis addUserSocket failed');
    }
  }

  static async removeUserSocket(userId: string, socketId: string) {
    try {
      if (!isRedisAvailable) return;
      
      await redis.srem(`user:${userId}:sockets`, socketId);
      await redis.del(`socket:${socketId}`);
    } catch (error) {
      console.error('Redis removeUserSocket failed');
    }
  }

  static async getUserSockets(userId: string): Promise<string[]> {
    try {
      if (!isRedisAvailable) return [];
      return await redis.smembers(`user:${userId}:sockets`);
    } catch (error) {
      return [];
    }
  }

  static async getUserBySocket(socketId: string): Promise<string | null> {
    try {
      if (!isRedisAvailable) return null;
      return await redis.get(`socket:${socketId}`);
    } catch (error) {
      return null;
    }
  }

  // ==================== RATE LIMITING ====================
  
  static async checkRateLimit(
    userId: string, 
    action: string, 
    limit: number, 
    windowSeconds: number
  ): Promise<boolean> {
    try {
      if (!isRedisAvailable) return true; // Allow if Redis down
      
      const key = `ratelimit:${userId}:${action}`;
      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }
      
      return current <= limit;
    } catch (error) {
      return true; // Allow on error
    }
  }

  // ==================== CACHE ====================
  
  static async cacheSet(key: string, value: any, ttl?: number) {
    try {
      if (!isRedisAvailable) return;
      
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redis.setex(key, ttl, serialized);
      } else {
        await redis.set(key, serialized);
      }
    } catch (error) {
      console.error('Redis cacheSet failed');
    }
  }

  static async cacheGet<T>(key: string): Promise<T | null> {
    try {
      if (!isRedisAvailable) return null;
      
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      return null;
    }
  }

  static async cacheDel(key: string) {
    try {
      if (!isRedisAvailable) return;
      await redis.del(key);
    } catch (error) {
      console.error('Redis cacheDel failed');
    }
  }

  // ==================== MESSAGE QUEUE ====================
  
  static async queueMessage(conversationId: string, message: any) {
    try {
      if (!isRedisAvailable) return;
      
      await redis.lpush(
        `queue:messages:${conversationId}`, 
        JSON.stringify(message)
      );
      await redis.expire(`queue:messages:${conversationId}`, 300); // 5 min TTL
    } catch (error) {
      console.error('Redis queueMessage failed');
    }
  }

  static async getQueuedMessages(conversationId: string): Promise<any[]> {
    try {
      if (!isRedisAvailable) return [];
      
      const messages = await redis.lrange(`queue:messages:${conversationId}`, 0, -1);
      return messages.map(msg => JSON.parse(msg));
    } catch (error) {
      return [];
    }
  }
}
