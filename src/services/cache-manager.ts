/**
 * Cache Manager Service
 * Provides TTL-based caching with automatic expiration
 */

import type { CacheEntry } from '../types/config.js';

export class CacheManager {
  private cache: Map<string, CacheEntry>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Get a value from cache
   * Returns null if key doesn't exist or has expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set a value in cache with TTL in seconds
   */
  set(key: string, value: any, ttlSeconds: number): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, {
      value,
      expiresAt,
    });
  }

  /**
   * Delete a specific cache key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Invalidate all cache keys matching a prefix
   */
  invalidateByPrefix(prefix: string): number {
    let count = 0;
    for (const [key] of this.cache) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Clean up expired entries
   * Useful to run periodically to free memory
   */
  cleanup(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.cache) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }
}
