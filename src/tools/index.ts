/**
 * MCP Tools Implementation
 * All Zotero MCP tools in one consolidated file
 */

import type { ZoteroClient } from '../services/zotero-client.js';
import type { PDFExtractor } from '../services/pdf-extractor.js';
import {
  SearchItemsSchema,
  GetItemSchema,
  CreateItemSchema,
  UpdateItemSchema,
  DeleteItemsSchema,
  GenerateCitationSchema,
  ExtractPdfTextSchema,
  ManageCollectionsSchema,
  ManageTagsSchema,
} from '../utils/validators.js';
import { formatErrorForMCP } from '../utils/error-handler.js';

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
    };

    if (validated.query) searchParams.q = validated.query;
    if (validated.qmode) searchParams.qmode = validated.qmode;
    if (validated.itemType) searchParams.itemType = validated.itemType;
    if (validated.tag) searchParams.tag = validated.tag;
    if (validated.collection) searchParams.collection = validated.collection;
    if (validated.start) searchParams.start = validated.start;

    const items = await zoteroClient.searchItems(searchParams);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              count: items.length,
              items: items.map((item) => ({
                key: item.key,
                version: item.version,
                itemType: item.data?.itemType,
                title: item.data?.title,
                creators: item.data?.creators,
                date: item.data?.date,
                DOI: item.data?.DOI,
                url: item.data?.url,
                tags: item.data?.tags,
                collections: item.data?.collections,
                abstractNote: item.data?.abstractNote,
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
      item = await zoteroClient.getItem(validated.itemKey);
    } else if (validated.doi) {
      // Search by DOI
      const items = await zoteroClient.searchItems({ q: validated.doi });
      item = items.find((i) => i.data.DOI === validated.doi);
      if (!item) {
        throw new Error(`No item found with DOI: ${validated.doi}`);
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(item, null, 2),
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
      validated.format
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
 * Extract PDF full-text content
 */
export async function extractPdfText(params: any, pdfExtractor: PDFExtractor): Promise<any> {
  try {
    const validated = ExtractPdfTextSchema.parse(params);

    const result = await pdfExtractor.extractText(validated.itemKey, validated.pages);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              content: result.content,
              numPages: result.numPages,
              info: result.info,
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

    await zoteroClient.deleteItems(validated.itemKeys);

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
      case 'delete':
        await zoteroClient.deleteCollection(validated.collectionKey!, validated.version);
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
        const currentTags = item.data.tags || [];

        let newTags;
        if (validated.action === 'add_to_item') {
          const tagsToAdd = validated.tags || [validated.tag!];
          newTags = [...currentTags, ...tagsToAdd.map((tag) => ({ tag, type: validated.type || 1 }))];
        } else {
          const tagsToRemove = validated.tags || [validated.tag!];
          newTags = currentTags.filter((t) => !tagsToRemove.includes(t.tag));
        }

        // Update the item
        const updated = await zoteroClient.updateItem(
          validated.itemKey!,
          { tags: newTags },
          item.version
        );
        result = { success: true, item: updated };
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
