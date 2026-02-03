#!/usr/bin/env node

/**
 * Zotero MCP Server
 * Main entry point - initializes and starts the MCP server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from './config/default.js';
import { CacheManager } from './services/cache-manager.js';
import { ZoteroClient } from './services/zotero-client.js';
import {
  searchItems,
  getItem,
  generateCitation,
  createItem,
  updateItem,
  deleteItems,
  manageCollections,
  manageTags,
} from './tools/index.js';
import {
  getCollectionsResource,
  getTagsResource,
  getCitationStylesResource,
} from './resources/index.js';

/**
 * Main server initialization
 */
async function main() {
  console.error('[Zotero MCP] Starting server...');

  // Initialize services
  const cache = new CacheManager();
  const zoteroClient = new ZoteroClient(config, cache);

  console.error('[Zotero MCP] Services initialized');

  // Create MCP server
  const server = new Server(
    {
      name: 'zotero-manager',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  /**
   * List available tools
   */
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'search_items',
          description:
            'Search and retrieve items from your Zotero library with filtering by query, tags, collections, and item type',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Text search query across all fields',
              },
              qmode: {
                type: 'string',
                enum: ['titleCreatorYear', 'everything'],
                description: 'Search mode',
              },
              itemType: {
                type: 'string',
                description: 'Filter by item type (book, journalArticle, etc.)',
              },
              tag: {
                anyOf: [
                  { type: 'string' },
                  {
                    type: 'array',
                    items: { type: 'string' },
                  },
                ],
                description: 'Filter by tags (single tag or list)',
              },
              collection: {
                type: 'string',
                description: 'Filter by collection key',
              },
              limit: {
                type: 'number',
                description: 'Number of results (max 100)',
                default: 25,
              },
              start: {
                type: 'number',
                description: 'Result offset (for pagination)',
              },
              sort: {
                type: 'string',
                enum: ['dateAdded', 'dateModified', 'title', 'creator'],
                description: 'Sort field',
              },
              direction: {
                type: 'string',
                enum: ['asc', 'desc'],
                description: 'Sort direction',
                default: 'desc',
              },
              format: {
                type: 'string',
                enum: ['json', 'bibtex', 'csljson'],
                description: 'Response format (non-json returns raw text)',
                default: 'json',
              },
            },
          },
        },
        {
          name: 'get_item',
          description: 'Get a single item by key or DOI',
          inputSchema: {
            type: 'object',
            properties: {
              itemKey: {
                type: 'string',
                description: 'Zotero item key',
              },
              doi: {
                type: 'string',
                description: 'DOI to look up',
              },
              format: {
                type: 'string',
                enum: ['json', 'bibtex', 'csljson', 'ris'],
                description: 'Response format',
                default: 'json',
              },
              include: {
                type: 'array',
                items: { type: 'string' },
                description: 'Additional fields to include (e.g., bib, data, csljson)',
              },
            },
          },
        },
        {
          name: 'generate_citation',
          description: 'Generate formatted citations in various styles (APA, Chicago, MLA, IEEE, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              itemKeys: {
                type: 'array',
                items: { type: 'string' },
                description: 'Item keys to cite',
              },
              style: {
                type: 'string',
                description: 'Citation style (apa, chicago, mla, ieee, nature, etc.)',
              },
              format: {
                type: 'string',
                enum: ['text', 'html'],
                description: 'Output format',
                default: 'text',
              },
              locale: {
                type: 'string',
                description: 'Locale for citation formatting (e.g., en-US)',
                default: 'en-US',
              },
            },
            required: ['itemKeys', 'style'],
          },
        },
        {
          name: 'create_item',
          description: 'Create a new item in your Zotero library',
          inputSchema: {
            type: 'object',
            properties: {
              itemType: {
                type: 'string',
                description: 'Item type (book, journalArticle, thesis, etc.)',
              },
              title: {
                type: 'string',
                description: 'Item title',
              },
              creators: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    creatorType: { type: 'string' },
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
                description: 'Authors/editors',
              },
              date: { type: 'string' },
              DOI: { type: 'string' },
              url: { type: 'string' },
              tags: {
                type: 'array',
                items: { type: 'string' },
              },
              collections: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['itemType', 'title'],
          },
        },
        {
          name: 'update_item',
          description: 'Update an existing item',
          inputSchema: {
            type: 'object',
            properties: {
              itemKey: {
                type: 'string',
                description: 'Item key to update',
              },
              version: {
                type: 'number',
                description: 'Current item version (for conflict detection)',
              },
              data: {
                type: 'object',
                description: 'Fields to update',
              },
            },
            required: ['itemKey', 'version', 'data'],
          },
        },
        {
          name: 'delete_items',
          description: 'Delete items from library (supports batch up to 50)',
          inputSchema: {
            type: 'object',
            properties: {
              itemKeys: {
                type: 'array',
                items: { type: 'string' },
                description: 'Item keys to delete (max 50)',
              },
              version: {
                type: 'number',
                description: 'Optional library version for conflict detection',
              },
            },
            required: ['itemKeys'],
          },
        },
        {
          name: 'manage_collections',
          description: 'Manage collections (create, update, list, get, delete)',
          inputSchema: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['create', 'update', 'delete', 'list', 'get'],
              },
              collectionKey: { type: 'string' },
              name: { type: 'string' },
              parentCollection: { type: 'string' },
              version: { type: 'number' },
            },
            required: ['action'],
          },
        },
        {
          name: 'manage_tags',
          description: 'Manage tags (list, add to item, remove from item, delete)',
          inputSchema: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['list', 'add_to_item', 'remove_from_item', 'delete'],
              },
              itemKey: { type: 'string' },
              tag: { type: 'string' },
              tags: {
                type: 'array',
                items: { type: 'string' },
              },
              type: {
                type: 'number',
                enum: [0, 1],
                description: 'Tag type (0=automatic, 1=manual)',
              },
            },
            required: ['action'],
          },
        },
      ],
    };
  });

  /**
   * Handle tool calls
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: params } = request.params;

    console.error(`[Tool Call] ${name}`);

    switch (name) {
      case 'search_items':
        return await searchItems(params, zoteroClient);
      case 'get_item':
        return await getItem(params, zoteroClient);
      case 'generate_citation':
        return await generateCitation(params, zoteroClient);
      case 'create_item':
        return await createItem(params, zoteroClient);
      case 'update_item':
        return await updateItem(params, zoteroClient);
      case 'delete_items':
        return await deleteItems(params, zoteroClient);
      case 'manage_collections':
        return await manageCollections(params, zoteroClient);
      case 'manage_tags':
        return await manageTags(params, zoteroClient);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  /**
   * List available resources
   */
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'zotero://collections',
          name: 'Zotero Collections',
          description: 'List all collections in your library with hierarchy',
          mimeType: 'application/json',
        },
        {
          uri: 'zotero://tags',
          name: 'Zotero Tags',
          description: 'List all tags in your library',
          mimeType: 'application/json',
        },
        {
          uri: 'zotero://citation-styles',
          name: 'Citation Styles',
          description: 'Available citation styles (APA, Chicago, MLA, etc.)',
          mimeType: 'application/json',
        },
      ],
    };
  });

  /**
   * Handle resource reads
   */
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    console.error(`[Resource Read] ${uri}`);

    if (uri.startsWith('zotero://collections')) {
      return await getCollectionsResource(zoteroClient, uri);
    } else if (uri.startsWith('zotero://tags')) {
      return await getTagsResource(zoteroClient, uri);
    } else if (uri === 'zotero://citation-styles') {
      return await getCitationStylesResource(uri);
    } else {
      throw new Error(`Unknown resource URI: ${uri}`);
    }
  });

  /**
   * Connect stdio transport
   */
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[Zotero MCP] Server running on stdio');
  console.error(`[Zotero MCP] Connected to ${config.userId ? `user ${config.userId}` : `group ${config.groupId}`}`);
}

// Start the server
main().catch((error) => {
  console.error('[Fatal Error]', error);
  process.exit(1);
});
