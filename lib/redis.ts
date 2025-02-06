import { Redis } from '@upstash/redis'

interface CacheItem<T> {
  value: T
  expires?: number
}

interface RateLimitItem {
  score: number
  member: string
}

class MemoryCache {
  private cache: Map<string, CacheItem<unknown>> = new Map()
  private counters: Map<string, number> = new Map()

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key)
    if (!item) return null
    if (item.expires && item.expires < Date.now()) {
      this.cache.delete(key)
      return null
    }
    return item.value as T
  }

  async set<T>(key: string, value: T, options?: { ex?: number }): Promise<void> {
    const expires = options?.ex ? Date.now() + (options.ex * 1000) : undefined
    this.cache.set(key, { value, expires })
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key)
  }

  async zadd(key: string, data: RateLimitItem): Promise<void> {
    const existing = this.cache.get(key) as CacheItem<RateLimitItem[]> | undefined
    const items = existing?.value || []
    items.push(data)
    this.cache.set(key, { value: items })
  }

  async zremrangebyscore(key: string, min: number, max: number): Promise<void> {
    const existing = this.cache.get(key) as CacheItem<RateLimitItem[]> | undefined
    if (!existing) return
    const items = existing.value.filter(item => item.score < min || item.score > max)
    this.cache.set(key, { value: items })
  }

  async zcount(key: string, min: number, max: number): Promise<number> {
    const existing = this.cache.get(key) as CacheItem<RateLimitItem[]> | undefined
    if (!existing) return 0
    return existing.value.filter(item => item.score >= min && item.score <= max).length
  }

  async incr(key: string): Promise<number> {
    const current = this.counters.get(key) || 0
    const next = current + 1
    this.counters.set(key, next)
    return next
  }

  async expire(key: string, seconds: number): Promise<void> {
    const item = this.cache.get(key)
    if (item) {
      item.expires = Date.now() + (seconds * 1000)
      this.cache.set(key, item)
    }

    const counter = this.counters.get(key)
    if (counter !== undefined) {
      setTimeout(() => {
        this.counters.delete(key)
      }, seconds * 1000)
    }
  }
}

const cacheClient: Redis | MemoryCache = new MemoryCache()

export const redisClient = {
  async get<T>(key: string): Promise<T | null> {
    try {
      console.log('Getting from cache:', key)
      const result = await cacheClient.get<string>(key)
      if (!result) return null
      try {
        return JSON.parse(result) as T
      } catch (parseError) {
        console.error('Error parsing cache value:', parseError)
        return null
      }
    } catch (error) {
      console.error('Error in get operation:', error)
      return null
    }
  },

  async set<T>(key: string, value: T, options?: { ex?: number }): Promise<void> {
    try {
      if (value === null || value === undefined) {
        console.warn('Attempting to cache a null or undefined value:', { key })
        return
      }

      let stringValue: string
      try {
        stringValue = JSON.stringify(value)
      } catch (stringifyError) {
        console.error('Error converting value to JSON:', stringifyError)
        return
      }

      console.log('Saving to cache:', { key, hasValue: !!value, ttl: options?.ex })
      await cacheClient.set(key, stringValue, options)
    } catch (error) {
      console.error('Error in set operation:', error)
    }
  },

  async del(key: string): Promise<void> {
    try {
      await cacheClient.del(key)
    } catch (error) {
      console.error('Error in del operation:', error)
    }
  },

  async zadd(key: string, data: RateLimitItem): Promise<void> {
    try {
      await cacheClient.zadd(key, data)
    } catch (error) {
      console.error('Error in zadd operation:', error)
    }
  },

  async zremrangebyscore(key: string, min: number, max: number): Promise<void> {
    try {
      await cacheClient.zremrangebyscore(key, min, max)
    } catch (error) {
      console.error('Error in zremrangebyscore operation:', error)
    }
  },

  async zcount(key: string, min: number, max: number): Promise<number> {
    try {
      return await cacheClient.zcount(key, min, max)
    } catch (error) {
      console.error('Error in zcount operation:', error)
      return 0
    }
  },

  async incr(key: string): Promise<number> {
    try {
      return await cacheClient.incr(key)
    } catch (error) {
      console.error('Error in incr operation:', error)
      return 0
    }
  },

  async expire(key: string, seconds: number): Promise<void> {
    try {
      await cacheClient.expire(key, seconds)
    } catch (error) {
      console.error('Error in expire operation:', error)
    }
  }
}

const RATE_LIMIT = 50
const WINDOW_SIZE = 60

export async function checkRateLimit(key: string): Promise<boolean> {
  try {
    const now = Math.floor(Date.now() / 1000)
    const windowStart = now - WINDOW_SIZE

    await redisClient.zremrangebyscore(key, 0, windowStart)
    await redisClient.zadd(key, { score: now, member: now.toString() })

    const requestCount = await redisClient.zcount(key, windowStart, now)
    
    return requestCount <= RATE_LIMIT
  } catch (error) {
    console.error('Error in rate limiting:', error)
    return true
  }
} 