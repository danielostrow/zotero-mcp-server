/**
 * MCP Tools Implementation
 * All Zotero MCP tools in one consolidated file
 */

import type { ZoteroClient } from '../services/zotero-client.js';
import {
  SearchItemsSchema,
  GetItemSchema,
  CreateItemSchema,
  UpdateItemSchema,
  DeleteItemsSchema,
  GenerateCitationSchema,
  ManageCollectionsSchema,
  ManageTagsSchema,
} from '../utils/validators.js';
import { formatErrorForMCP } from '../utils/error-handler.js';

function getItemData(item: any): any {
  return item?.data ?? item ?? {};
}

function getCollectionData(collection: any): any {
  return collection?.data ?? collection ?? {};
}

function normalizeTags(tags: any[]): Array<{ tag: string; type?: number }> {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => {
      if (!tag) return null;
      if (typeof tag === 'string') return { tag, type: 1 };
      if (typeof tag === 'object' && typeof tag.tag === 'string') {
        return { tag: tag.tag, type: tag.type ?? 1 };
      }
      return null;
    })
    .filter(Boolean) as Array<{ tag: string; type?: number }>;
}

/**
 * Search and retrieve items from Zotero library
 */
export async function searchItems(params: any, zoteroClient: ZoteroClient): Promise<any> {
  try {
    const validated = SearchItemsSchema.parse(params);

    const searchParams: any = {
      limit: validated.limit,
      sort: validated.sort,
      direction: validated.direction,
      format: validated.format,
    };

    if (validated.query) searchParams.q = validated.query;
    if (validated.qmode) searchParams.qmode = validated.qmode;
    if (validated.itemType) searchParams.itemType = validated.itemType;
    if (validated.tag) searchParams.tag = validated.tag;
    if (validated.collection) searchParams.collection = validated.collection;
    if (validated.start) searchParams.start = validated.start;

    const isJson = !validated.format || validated.format === 'json';
    if (!isJson) {
      const text = validated.collection
        ? await zoteroClient.searchItemsInCollectionRaw(validated.collection, searchParams)
        : await zoteroClient.searchItemsRaw(searchParams);
      return {
        content: [
          {
            type: 'text',
            text,
          },
        ],
      };
    }

    const items = validated.collection
      ? await zoteroClient.searchItemsInCollection(validated.collection, searchParams)
      : await zoteroClient.searchItems(searchParams);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              count: items.length,
              items: items.map((item) => ({
                key: item.key ?? item.data?.key,
                version: item.version ?? item.data?.version,
                itemType: getItemData(item).itemType,
                title: getItemData(item).title,
                creators: getItemData(item).creators,
                date: getItemData(item).date,
                DOI: getItemData(item).DOI,
                url: getItemData(item).url,
                tags: getItemData(item).tags,
                collections: getItemData(item).collections,
                abstractNote: getItemData(item).abstractNote,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: formatErrorForMCP(error) }],
      isError: true,
    };
  }
}

/**
 * Get a single item by key or DOI
 */
export async function getItem(params: any, zoteroClient: ZoteroClient): Promise<any> {
  try {
    const validated = GetItemSchema.parse(params);

    let item;
    if (validated.itemKey) {
      item = await zoteroClient.getItemWithFormat(validated.itemKey, {
        format: validated.format,
        include: validated.include,
      });
    } else if (validated.doi) {
      // Search by DOI
      const items = (await zoteroClient.searchItems({
        q: validated.doi,
        qmode: 'everything',
        limit: 10,
      })) as any[];
      const matched = items.find((i) => i.data?.DOI === validated.doi);
      if (!matched) {
        throw new Error(`No item found with DOI: ${validated.doi}`);
      }
      const key = matched.key ?? matched.data?.key;
      if (!key) {
        throw new Error(`No item key found for DOI: ${validated.doi}`);
      }
      item = await zoteroClient.getItemWithFormat(key, {
        format: validated.format,
        include: validated.include,
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: typeof item === 'string' ? item : JSON.stringify(item, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: formatErrorForMCP(error) }],
      isError: true,
    };
  }
}

/**
 * Generate formatted citations
 */
export async function generateCitation(params: any, zoteroClient: ZoteroClient): Promise<any> {
  try {
    const validated = GenerateCitationSchema.parse(params);

    const citation = await zoteroClient.generateCitation(
      validated.itemKeys,
      validated.style,
      validated.format,
      validated.locale
    );

    return {
      content: [
        {
          type: 'text',
          text: citation,
        },
      ],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: formatErrorForMCP(error) }],
      isError: true,
    };
  }
}

/**
 * Create a new item
 */
export async function createItem(params: any, zoteroClient: ZoteroClient): Promise<any> {
  try {
    const validated = CreateItemSchema.parse(params);

    // Get item template first
    const template = await zoteroClient.getItemTemplate(validated.itemType);

    // Merge template with provided data
    const itemData = {
      ...template,
      ...validated,
    };

    const created = await zoteroClient.createItem(itemData);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              item: created,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: formatErrorForMCP(error) }],
      isError: true,
    };
  }
}

/**
 * Update an existing item
 */
export async function updateItem(params: any, zoteroClient: ZoteroClient): Promise<any> {
  try {
    const validated = UpdateItemSchema.parse(params);

    const updated = await zoteroClient.updateItem(validated.itemKey, validated.data, validated.version);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              item: updated,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: formatErrorForMCP(error) }],
      isError: true,
    };
  }
}

/**
 * Delete items (batch support)
 */
export async function deleteItems(params: any, zoteroClient: ZoteroClient): Promise<any> {
  try {
    const validated = DeleteItemsSchema.parse(params);

    await zoteroClient.deleteItems(validated.itemKeys, validated.version);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              deleted: validated.itemKeys.length,
              keys: validated.itemKeys,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: formatErrorForMCP(error) }],
      isError: true,
    };
  }
}

/**
 * Manage collections (CRUD operations)
 */
export async function manageCollections(params: any, zoteroClient: ZoteroClient): Promise<any> {
  try {
    const validated = ManageCollectionsSchema.parse(params);

    let result: any;

    switch (validated.action) {
      case 'list':
        result = await zoteroClient.getCollections();
        break;
      case 'get':
        result = await zoteroClient.getCollection(validated.collectionKey!);
        break;
      case 'create':
        result = await zoteroClient.createCollection(validated.name!, validated.parentCollection);
        break;
      case 'update':
        if (!validated.version) {
          const collection = await zoteroClient.getCollection(validated.collectionKey!);
          const collectionData = getCollectionData(collection);
          const version = collection?.version ?? collectionData?.version;
          if (version == null) {
            throw new Error('Collection version is required to update');
          }
          result = await zoteroClient.updateCollection(
            validated.collectionKey!,
            {
              name: validated.name!,
              parentCollection: validated.parentCollection,
            },
            version
          );
        } else {
          result = await zoteroClient.updateCollection(
            validated.collectionKey!,
            {
              name: validated.name!,
              parentCollection: validated.parentCollection,
            },
            validated.version
          );
        }
        break;
      case 'delete':
        if (!validated.version) {
          const collection = await zoteroClient.getCollection(validated.collectionKey!);
          const collectionData = getCollectionData(collection);
          const version = collection?.version ?? collectionData?.version;
          if (version == null) {
            throw new Error('Collection version is required to delete');
          }
          await zoteroClient.deleteCollection(validated.collectionKey!, version);
        } else {
          await zoteroClient.deleteCollection(validated.collectionKey!, validated.version);
        }
        result = { success: true, deleted: validated.collectionKey };
        break;
      default:
        throw new Error(`Unknown action: ${validated.action}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: formatErrorForMCP(error) }],
      isError: true,
    };
  }
}

/**
 * Manage tags
 */
export async function manageTags(params: any, zoteroClient: ZoteroClient): Promise<any> {
  try {
    const validated = ManageTagsSchema.parse(params);

    let result: any;

    switch (validated.action) {
      case 'list':
        result = await zoteroClient.getTags();
        break;
      case 'add_to_item':
      case 'remove_from_item':
        // Get the item first
        const item = await zoteroClient.getItem(validated.itemKey!);
        const itemData = getItemData(item);
        const currentTags = normalizeTags(itemData.tags || []);

        let newTags;
        if (validated.action === 'add_to_item') {
          const tagsToAdd = validated.tags || [validated.tag!];
          const incoming = normalizeTags(tagsToAdd.map((tag) => ({ tag, type: validated.type || 1 })));
          const tagMap = new Map<string, { tag: string; type?: number }>();
          [...currentTags, ...incoming].forEach((t) => tagMap.set(t.tag, t));
          newTags = Array.from(tagMap.values());
        } else {
          const tagsToRemove = validated.tags || [validated.tag!];
          newTags = currentTags.filter((t) => !tagsToRemove.includes(t.tag));
        }

        // Update the item
        const updated = await zoteroClient.updateItem(
          validated.itemKey!,
          { tags: newTags },
          item.version ?? itemData.version
        );
        result = { success: true, item: updated };
        break;
      case 'delete': {
        const tagToDelete = validated.tag!;
        let start = 0;
        const limit = 100;
        let updatedItems = 0;
        let removedTags = 0;

        while (true) {
          const items = await zoteroClient.searchItems({ tag: tagToDelete, limit, start });
          if (!items.length) break;

          for (const found of items) {
            const foundData = getItemData(found);
            const current = normalizeTags(foundData.tags || []);
            const filtered = current.filter((t) => t.tag !== tagToDelete);
            if (filtered.length === current.length) continue;

            const itemKey = found.key ?? foundData.key;
            const version = found.version ?? foundData.version;
            if (!itemKey || version == null) continue;

            await zoteroClient.updateItem(itemKey, { tags: filtered }, version);
            updatedItems += 1;
            removedTags += current.length - filtered.length;
          }

          if (items.length < limit) break;
          start += items.length;
        }

        result = { success: true, tag: tagToDelete, updatedItems, removedTags };
        break;
      }
      default:
        throw new Error(`Unknown action: ${validated.action}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: formatErrorForMCP(error) }],
      isError: true,
    };
  }
}
