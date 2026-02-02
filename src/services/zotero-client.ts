/**
 * Zotero API Client Service
 * Wrapper around zotero-api-client with caching and rate limiting
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const api = require('zotero-api-client').default;
import type { ZoteroConfig } from '../types/config.js';
import type {
  ZoteroItem,
  ZoteroCollection,
  ZoteroSearchParams,
  ZoteroItemTemplate,
} from '../types/zotero.js';
import type { CacheManager } from './cache-manager.js';

export class ZoteroClient {
  private config: ZoteroConfig;
  private cache: CacheManager;
  private backoffUntil: number | null = null;
  private apiAuthorityPart: string;
  private client: any;

  constructor(config: ZoteroConfig, cache: CacheManager) {
    this.config = config;
    this.cache = cache;
    this.apiAuthorityPart = new URL(this.config.baseUrl).host;
    this.client = api(this.config.apiKey, { apiAuthorityPart: this.apiAuthorityPart });
  }

  /**
   * Check and handle rate limiting with exponential backoff
   */
  private async handleRateLimit(): Promise<void> {
    if (this.backoffUntil && Date.now() < this.backoffUntil) {
      const waitMs = this.backoffUntil - Date.now();
      console.error(`[Rate limit] Waiting ${Math.ceil(waitMs / 1000)}s before retry`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      this.backoffUntil = null;
    }
  }

  private createAbortSignal(): { signal?: AbortSignal; cleanup: () => void } {
    const timeoutMs = this.config.timeout;
    if (!timeoutMs || timeoutMs <= 0) {
      return { signal: undefined, cleanup: () => {} };
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return {
      signal: controller.signal,
      cleanup: () => clearTimeout(timeoutId),
    };
  }

  private getErrorStatus(error: any): number | undefined {
    const statusFromResponse = error?.response?.status;
    if (typeof statusFromResponse === 'number') return statusFromResponse;
    const statusFromMessage = error?.message?.match(/(\d{3})/)?.[1];
    if (statusFromMessage) return parseInt(statusFromMessage, 10);
    return undefined;
  }

  private getRetryAfterSeconds(error: any): number | null {
    const headers = error?.response?.headers;
    if (!headers || typeof headers.get !== 'function') return null;
    const backoff = headers.get('Backoff') || headers.get('backoff');
    const retryAfter = headers.get('Retry-After') || headers.get('retry-after');
    const value = backoff ?? retryAfter;
    if (!value) return null;
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private async extractTextResponse(response: any): Promise<string> {
    if (response && typeof response === 'object' && 'response' in response) {
      const fetchResponse = (response as any).response;
      if (fetchResponse && typeof fetchResponse.text === 'function') {
        return await fetchResponse.text();
      }
    }
    if (response && typeof response === 'object' && 'ok' in response && typeof (response as any).text === 'function') {
      return await (response as any).text();
    }
    if (response && typeof (response as any).getData === 'function') {
      const data = (response as any).getData();
      if (data && typeof data === 'object' && typeof data.text === 'function') {
        return await data.text();
      }
      if (typeof data === 'string') {
        return data;
      }
    }
    if (typeof response === 'string') return response;
    throw new Error('Unexpected response format');
  }

  /**
   * Execute API request with retry logic
   */
  private async executeWithRetry<T>(
    fn: (signal?: AbortSignal) => Promise<T>,
    retries: number = this.config.maxRetries
  ): Promise<T> {
    await this.handleRateLimit();
    const { signal, cleanup } = this.createAbortSignal();

    try {
      return await fn(signal);
    } catch (error: any) {
      const status = this.getErrorStatus(error);
      const retryAfterSeconds = this.getRetryAfterSeconds(error);
      if (retryAfterSeconds) {
        this.backoffUntil = Date.now() + retryAfterSeconds * 1000;
      }

      // Handle rate limiting (429)
      if (status === 429 || status === 503) {
        if (!retryAfterSeconds) {
          const backoffSeconds = 5 * Math.pow(2, this.config.maxRetries - retries);
          this.backoffUntil = Date.now() + backoffSeconds * 1000;
        }

        if (retries > 0) {
          console.error(`[Rate limit] Retry ${this.config.maxRetries - retries + 1}/${this.config.maxRetries}`);
          return this.executeWithRetry(fn, retries - 1);
        }
      }

      // Handle network errors and 5xx errors
      if (
        retries > 0 &&
        (error.name === 'AbortError' ||
          status === 408 ||
          (status != null && status >= 500) ||
          error.message?.includes('ECONNREFUSED') ||
          error.message?.includes('ETIMEDOUT') ||
          error.message?.includes('fetch failed'))
      ) {
        const delay = 1000 * (this.config.maxRetries - retries + 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.executeWithRetry(fn, retries - 1);
      }

      throw error;
    } finally {
      cleanup();
    }
  }

  /**
   * Get library identifier (user or group)
   */
  private getLibraryId(): { type: 'user' | 'group'; id: string } {
    if (this.config.userId) {
      return { type: 'user', id: this.config.userId };
    }
    if (this.config.groupId) {
      return { type: 'group', id: this.config.groupId };
    }
    throw new Error('No userId or groupId configured');
  }

  /**
   * Search and retrieve items
   */
  async searchItems(params: ZoteroSearchParams): Promise<ZoteroItem[]> {
    const cacheKey = `search:${JSON.stringify(params)}`;
    if (this.config.cacheEnabled) {
      const cached = this.cache.get<ZoteroItem[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const { type, id } = this.getLibraryId();

    const items = await this.executeWithRetry(async (signal) => {
      const response = await this.client.library(type, id).items().get({ ...(params as any), signal });

      return response.getData() as ZoteroItem[];
    });

    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, items, this.config.cacheTTL);
    }

    return items;
  }

  /**
   * Search items within a collection (uses collection endpoint)
   */
  async searchItemsInCollection(
    collectionKey: string,
    params: ZoteroSearchParams
  ): Promise<ZoteroItem[]> {
    const cacheKey = `search:collection:${collectionKey}:${JSON.stringify(params)}`;
    if (this.config.cacheEnabled) {
      const cached = this.cache.get<ZoteroItem[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const { type, id } = this.getLibraryId();

    const items = await this.executeWithRetry(async (signal) => {
      const response = await this.client
        .library(type, id)
        .collections(collectionKey)
        .items()
        .get({ ...(params as any), signal });

      return response.getData() as ZoteroItem[];
    });

    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, items, this.config.cacheTTL);
    }

    return items;
  }

  /**
   * Search and retrieve items in non-JSON formats
   */
  async searchItemsRaw(params: ZoteroSearchParams): Promise<string> {
    const { type, id } = this.getLibraryId();
    const response = await this.executeWithRetry(async (signal) => {
      return await this.client.library(type, id).items().get({ ...(params as any), signal });
    });
    return this.extractTextResponse(response);
  }

  /**
   * Search items in a collection in non-JSON formats
   */
  async searchItemsInCollectionRaw(collectionKey: string, params: ZoteroSearchParams): Promise<string> {
    const { type, id } = this.getLibraryId();
    const response = await this.executeWithRetry(async (signal) => {
      return await this.client
        .library(type, id)
        .collections(collectionKey)
        .items()
        .get({ ...(params as any), signal });
    });
    return this.extractTextResponse(response);
  }

  /**
   * Get a single item by key
   */
  async getItem(itemKey: string): Promise<ZoteroItem> {
    const item = await this.getItemWithFormat(itemKey, { format: 'json' });
    return item as ZoteroItem;
  }

  /**
   * Get a single item by key with format/include options
   */
  async getItemWithFormat(
    itemKey: string,
    options?: { format?: 'json' | 'bibtex' | 'csljson' | 'ris'; include?: string[] }
  ): Promise<ZoteroItem | string> {
    const includeKey = options?.include ? options.include.join(',') : '';
    const formatKey = options?.format || 'json';
    const cacheKey = options?.format || options?.include ? `item:${itemKey}:${formatKey}:${includeKey}` : `item:${itemKey}`;
    if (this.config.cacheEnabled) {
      const cached = this.cache.get<ZoteroItem>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const { type, id } = this.getLibraryId();

    const item = await this.executeWithRetry(async (signal) => {
      const response = await this.client
        .library(type, id)
        .items(itemKey)
        .get({
          format: options?.format,
          include: options?.include ? options.include.join(',') : undefined,
          signal,
        } as any);

      if (options?.format && options.format !== 'json') {
        return await this.extractTextResponse(response);
      }

      return response.getData() as ZoteroItem;
    });

    if (this.config.cacheEnabled) {
      if (typeof item !== 'string') {
        this.cache.set(cacheKey, item, this.config.cacheTTL);
      }
    }

    return item;
  }

  /**
   * Get item template for creating new items
   */
  async getItemTemplate(itemType: string): Promise<ZoteroItemTemplate> {
    const cacheKey = `template:${itemType}`;
    if (this.config.cacheEnabled) {
      const cached = this.cache.get<ZoteroItemTemplate>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const template = await this.executeWithRetry(async (signal) => {
      const response = await this.client.template(itemType).get({ signal });
      return response.getData() as ZoteroItemTemplate;
    });

    if (this.config.cacheEnabled) {
      // Cache templates for 1 hour (they rarely change)
      this.cache.set(cacheKey, template, 3600);
    }

    return template;
  }

  /**
   * Create a new item
   */
  async createItem(itemData: any): Promise<ZoteroItem> {
    const { type, id } = this.getLibraryId();

    const created = await this.executeWithRetry(async (signal) => {
      const response = await this.client
        .library(type, id)
        .items()
        .post([itemData], { signal });

      const results = response.getData();
      // zotero-api-client returns an array for multi-write operations
      return (Array.isArray(results) ? results[0] : results) as ZoteroItem;
    });

    // Invalidate search caches
    if (this.config.cacheEnabled) {
      this.cache.invalidateByPrefix('search:');
      this.cache.invalidateByPrefix('collections:');
      if (itemData?.tags) {
        this.cache.invalidateByPrefix('tags:');
      }
    }

    return created;
  }

  /**
   * Update an existing item
   */
  async updateItem(itemKey: string, itemData: any, version: number): Promise<ZoteroItem> {
    const { type, id } = this.getLibraryId();

    const updated = await this.executeWithRetry(async (signal) => {
      let request = this.client.library(type, id).items(itemKey);

      if (version !== undefined) {
        request = request.version(version);
      }

      const response = await request.patch(itemData, { signal });

      return response.getData() as ZoteroItem;
    });

    // Invalidate caches
    if (this.config.cacheEnabled) {
      this.cache.invalidateByPrefix(`item:${itemKey}`);
      this.cache.invalidateByPrefix('search:');
      if (itemData?.tags) {
        this.cache.invalidateByPrefix('tags:');
      }
    }

    return updated;
  }

  /**
   * Delete items (supports batch up to 50)
   */
  async deleteItems(itemKeys: string[], version?: number): Promise<void> {
    if (itemKeys.length > 50) {
      throw new Error('Cannot delete more than 50 items at once');
    }

    const { type, id } = this.getLibraryId();

    await this.executeWithRetry(async (signal) => {
      let request = this.client.library(type, id).items();
      if (version !== undefined) {
        request = request.version(version);
      }
      await request.delete(itemKeys, { signal });
    });

    // Invalidate caches
    if (this.config.cacheEnabled) {
      itemKeys.forEach((key) => this.cache.invalidateByPrefix(`item:${key}`));
      this.cache.invalidateByPrefix('search:');
      this.cache.invalidateByPrefix('collections:');
    }
  }

  /**
   * Get all collections
   */
  async getCollections(): Promise<ZoteroCollection[]> {
    const cacheKey = 'collections:all';
    if (this.config.cacheEnabled) {
      const cached = this.cache.get<ZoteroCollection[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const { type, id } = this.getLibraryId();

    const collections = await this.executeWithRetry(async (signal) => {
      const response = await this.client.library(type, id).collections().get({ signal });

      return response.getData() as ZoteroCollection[];
    });

    if (this.config.cacheEnabled) {
      // Cache for 15 minutes
      this.cache.set(cacheKey, collections, 900);
    }

    return collections;
  }

  /**
   * Get a single collection
   */
  async getCollection(collectionKey: string): Promise<ZoteroCollection> {
    const cacheKey = `collection:${collectionKey}`;
    if (this.config.cacheEnabled) {
      const cached = this.cache.get<ZoteroCollection>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const { type, id } = this.getLibraryId();

    const collection = await this.executeWithRetry(async (signal) => {
      const response = await this.client
        .library(type, id)
        .collections(collectionKey)
        .get({ signal });

      return response.getData() as ZoteroCollection;
    });

    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, collection, 900);
    }

    return collection;
  }

  /**
   * Create a new collection
   */
  async createCollection(name: string, parentCollection?: string): Promise<ZoteroCollection> {
    const { type, id } = this.getLibraryId();

    const collectionData: any = { name };
    if (parentCollection) {
      collectionData.parentCollection = parentCollection;
    }

    const created = await this.executeWithRetry(async (signal) => {
      const response = await this.client
        .library(type, id)
        .collections()
        .post([collectionData], { signal });

      const results = response.getData();
      // zotero-api-client returns an array for multi-write operations
      return (Array.isArray(results) ? results[0] : results) as ZoteroCollection;
    });

    if (this.config.cacheEnabled) {
      this.cache.invalidateByPrefix('collections:');
    }

    return created;
  }

  /**
   * Update an existing collection
   */
  async updateCollection(
    collectionKey: string,
    collectionData: { name?: string; parentCollection?: string },
    version?: number
  ): Promise<ZoteroCollection> {
    const { type, id } = this.getLibraryId();

    const updated = await this.executeWithRetry(async (signal) => {
      let request = this.client.library(type, id).collections(collectionKey);

      if (version !== undefined) {
        request = request.version(version);
      }

      const response = await request.patch(collectionData, { signal });

      return response.getData() as ZoteroCollection;
    });

    if (this.config.cacheEnabled) {
      this.cache.delete(`collection:${collectionKey}`);
      this.cache.invalidateByPrefix('collections:');
    }

    return updated;
  }

  /**
   * Delete a collection
   */
  async deleteCollection(collectionKey: string, version?: number): Promise<void> {
    const { type, id } = this.getLibraryId();

    await this.executeWithRetry(async (signal) => {
      let request = this.client.library(type, id).collections(collectionKey);

      if (version !== undefined) {
        request = request.version(version);
      }

      await request.delete(undefined, { signal });
    });

    if (this.config.cacheEnabled) {
      this.cache.delete(`collection:${collectionKey}`);
      this.cache.invalidateByPrefix('collections:');
    }
  }

  /**
   * Get all tags
   */
  async getTags(): Promise<Array<{ tag: string; type: number }>> {
    const cacheKey = 'tags:all';
    if (this.config.cacheEnabled) {
      const cached = this.cache.get<Array<{ tag: string; type: number }>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const { type, id } = this.getLibraryId();

    const tags = await this.executeWithRetry(async (signal) => {
      const response = await this.client.library(type, id).tags().get({ signal });

      return response.getData() as Array<{ tag: string; type: number }>;
    });

    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, tags, 900);
    }

    return tags;
  }

  /**
   * Generate formatted citation for items
   */
  async generateCitation(
    itemKeys: string[],
    style: string = 'apa',
    format: 'text' | 'html' = 'text',
    locale?: string
  ): Promise<string> {
    const cacheKey = `citation:${itemKeys.join(',')}:${style}:${format}:${locale || 'default'}`;
    if (this.config.cacheEnabled) {
      const cached = this.cache.get<string>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const { type, id } = this.getLibraryId();

    const citation = await this.executeWithRetry(async (signal) => {
      const response = await this.client.library(type, id).items().get({
        itemKey: itemKeys.join(','),
        format: 'bib',
        style,
        linkwrap: format === 'html' ? 1 : 0,
        locale,
        signal,
      } as any);
      return await this.extractTextResponse(response);
    });

    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, citation, 3600); // 1 hour
    }

    return citation;
  }
}
