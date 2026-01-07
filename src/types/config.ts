/**
 * Configuration type definitions
 */

export interface ZoteroConfig {
  apiKey: string;
  userId?: string;
  groupId?: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  cacheEnabled: boolean;
  cacheTTL: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
}

export interface RateLimitState {
  requestCount: number;
  windowStart: number;
  backoffUntil: number | null;
}
