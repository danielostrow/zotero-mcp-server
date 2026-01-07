/**
 * Zotero API Client Service
 * Wrapper around zotero-api-client with caching and rate limiting
 */

import api from 'zotero-api-client';
import type { ZoteroConfig } from '../types/config.js';
import type {
  ZoteroItem,
  ZoteroCollection,
  ZoteroSearchParams,
  ZoteroItemTemplate,
  ZoteroFullText,
} from '../types/zotero.js';
import type { CacheManager } from './cache-manager.js';

export class ZoteroClient {
  private config: ZoteroConfig;
  private cache: CacheManager;
  private backoffUntil: number | null = null;

  constructor(config: ZoteroConfig, cache: CacheManager) {
    this.config = config;
    this.cache = cache;
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

  /**
   * Execute API request with retry logic
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    retries: number = this.config.maxRetries
  ): Promise<T> {
    await this.handleRateLimit();

    try {
      return await fn();
    } catch (error: any) {
      // Handle rate limiting (429)
      if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
        const backoffSeconds = 5 * Math.pow(2, this.config.maxRetries - retries);
        this.backoffUntil = Date.now() + backoffSeconds * 1000;

        if (retries > 0) {
          console.error(`[Rate limit] Retry ${this.config.maxRetries - retries + 1}/${this.config.maxRetries}`);
          return this.executeWithRetry(fn, retries - 1);
        }
      }

      // Handle network errors and 5xx errors
      if (
        retries > 0 &&
        (error.message?.includes('ECONNREFUSED') ||
          error.message?.includes('ETIMEDOUT') ||
          error.message?.includes('5'))
      ) {
        const delay = 1000 * (this.config.maxRetries - retries + 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.executeWithRetry(fn, retries - 1);
      }

      throw error;
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

    const items = await this.executeWithRetry(async () => {
      const response = await api(this.config.apiKey)
        .library(type, id)
        .items()
        .get(params as any);

      return response.getData() as ZoteroItem[];
    });

    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, items, this.config.cacheTTL);
    }

    return items;
  }

  /**
   * Get a single item by key
   */
  async getItem(itemKey: string): Promise<ZoteroItem> {
    const cacheKey = `item:${itemKey}`;
    if (this.config.cacheEnabled) {
      const cached = this.cache.get<ZoteroItem>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const { type, id } = this.getLibraryId();

    const item = await this.executeWithRetry(async () => {
      const response = await api(this.config.apiKey)
        .library(type, id)
        .items(itemKey)
        .get();

      return response.getData() as ZoteroItem;
    });

    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, item, this.config.cacheTTL);
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

    const template = await this.executeWithRetry(async () => {
      const response = await api(this.config.apiKey).itemTemplate(itemType).get();
      return response as ZoteroItemTemplate;
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

    const created = await this.executeWithRetry(async () => {
      const response = await api(this.config.apiKey)
        .library(type, id)
        .items()
        .post([itemData]);

      const results = response.getData();
      return results.successful[0] as ZoteroItem;
    });

    // Invalidate search caches
    if (this.config.cacheEnabled) {
      this.cache.invalidateByPrefix('search:');
      this.cache.invalidateByPrefix('collections:');
    }

    return created;
  }

  /**
   * Update an existing item
   */
  async updateItem(itemKey: string, itemData: any, _version: number): Promise<ZoteroItem> {
    const { type, id } = this.getLibraryId();

    const updated = await this.executeWithRetry(async () => {
      const response = await api(this.config.apiKey)
        .library(type, id)
        .items(itemKey)
        .patch(itemData);

      return response.getData() as ZoteroItem;
    });

    // Invalidate caches
    if (this.config.cacheEnabled) {
      this.cache.delete(`item:${itemKey}`);
      this.cache.invalidateByPrefix('search:');
    }

    return updated;
  }

  /**
   * Delete items (supports batch up to 50)
   */
  async deleteItems(itemKeys: string[]): Promise<void> {
    if (itemKeys.length > 50) {
      throw new Error('Cannot delete more than 50 items at once');
    }

    const { type, id } = this.getLibraryId();

    await this.executeWithRetry(async () => {
      await api(this.config.apiKey)
        .library(type, id)
        .items()
        .delete(itemKeys);
    });

    // Invalidate caches
    if (this.config.cacheEnabled) {
      itemKeys.forEach((key) => this.cache.delete(`item:${key}`));
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

    const collections = await this.executeWithRetry(async () => {
      const response = await api(this.config.apiKey)
        .library(type, id)
        .collections()
        .get();

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

    const collection = await this.executeWithRetry(async () => {
      const response = await api(this.config.apiKey)
        .library(type, id)
        .collections(collectionKey)
        .get();

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

    const created = await this.executeWithRetry(async () => {
      const response = await api(this.config.apiKey)
        .library(type, id)
        .collections()
        .post([collectionData]);

      const results = response.getData();
      return results.successful[0] as ZoteroCollection;
    });

    if (this.config.cacheEnabled) {
      this.cache.invalidateByPrefix('collections:');
    }

    return created;
  }

  /**
   * Delete a collection
   */
  async deleteCollection(collectionKey: string): Promise<void> {
    const { type, id } = this.getLibraryId();

    await this.executeWithRetry(async () => {
      await api(this.config.apiKey)
        .library(type, id)
        .collections(collectionKey)
        .delete();
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

    const tags = await this.executeWithRetry(async () => {
      const response = await api(this.config.apiKey)
        .library(type, id)
        .tags()
        .get();

      return response.getData() as Array<{ tag: string; type: number }>;
    });

    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, tags, 900);
    }

    return tags;
  }

  /**
   * Get full-text content for an item's PDF attachment
   */
  async getFullText(itemKey: string): Promise<ZoteroFullText | null> {
    const cacheKey = `fulltext:${itemKey}`;
    if (this.config.cacheEnabled) {
      const cached = this.cache.get<ZoteroFullText>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const { type, id } = this.getLibraryId();

    try {
      const fullText = await this.executeWithRetry(async () => {
        const response = await api(this.config.apiKey)
          .library(type, id)
          .items(itemKey)
          .fulltext()
          .get();

        return response.getData() as ZoteroFullText;
      });

      if (this.config.cacheEnabled && fullText) {
        // Cache full-text permanently (invalidate on version change)
        this.cache.set(cacheKey, fullText, 86400 * 30); // 30 days
      }

      return fullText;
    } catch (error) {
      // Full-text not available for this item
      return null;
    }
  }

  /**
   * Generate formatted citation for items
   */
  async generateCitation(
    itemKeys: string[],
    style: string = 'apa',
    format: 'text' | 'html' = 'text'
  ): Promise<string> {
    const cacheKey = `citation:${itemKeys.join(',')}:${style}:${format}`;
    if (this.config.cacheEnabled) {
      const cached = this.cache.get<string>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const { type, id } = this.getLibraryId();

    const citation = await this.executeWithRetry(async () => {
      const response = await api(this.config.apiKey)
        .library(type, id)
        .items()
        .get({
          itemKey: itemKeys.join(','),
          format: 'bib',
          style,
          linkwrap: format === 'html' ? 1 : 0,
        } as any);

      return response.getData() as string;
    });

    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, citation, 3600); // 1 hour
    }

    return citation;
  }
}
