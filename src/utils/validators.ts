/**
 * Zod validation schemas for tool parameters
 */

import { z } from 'zod';

export const SearchItemsSchema = z.object({
  query: z.string().optional(),
  qmode: z.enum(['titleCreatorYear', 'everything']).optional(),
  itemType: z.string().optional(),
  tag: z.union([z.string(), z.array(z.string())]).optional(),
  collection: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(25),
  start: z.number().min(0).optional(),
  sort: z.enum(['dateAdded', 'dateModified', 'title', 'creator']).optional(),
  direction: z.enum(['asc', 'desc']).optional().default('desc'),
  format: z.enum(['json', 'bibtex', 'csljson']).optional().default('json'),
});

export const GetItemSchema = z
  .object({
    itemKey: z.string().optional(),
    doi: z.string().optional(),
    format: z.enum(['json', 'bibtex', 'csljson', 'ris']).optional().default('json'),
    include: z.array(z.string()).optional(),
  })
  .refine((data) => data.itemKey || data.doi, {
    message: 'Either itemKey or doi must be provided',
  });

export const CreateItemSchema = z.object({
  itemType: z.string().min(1),
  title: z.string().min(1),
  creators: z
    .array(
      z.object({
        creatorType: z.string(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        name: z.string().optional(),
      })
    )
    .optional(),
  abstractNote: z.string().optional(),
  publicationTitle: z.string().optional(),
  date: z.string().optional(),
  DOI: z.string().optional(),
  url: z.string().url().optional(),
  tags: z
    .array(
      z.union([
        z.string(),
        z.object({
          tag: z.string().min(1),
          type: z.union([z.literal(0), z.literal(1)]).optional(),
        }),
      ])
    )
    .optional(),
  collections: z.array(z.string()).optional(),
});

export const UpdateItemSchema = z.object({
  itemKey: z.string().min(1),
  version: z.number().min(0),
  data: z.record(z.any()),
});

export const DeleteItemsSchema = z.object({
  itemKeys: z.array(z.string()).min(1).max(50),
  version: z.number().optional(),
});

export const GenerateCitationSchema = z.object({
  itemKeys: z.array(z.string()).min(1),
  style: z.string().min(1),
  format: z.enum(['text', 'html']).optional().default('text'),
  locale: z.string().optional().default('en-US'),
});

export const ManageCollectionsSchema = z
  .object({
    action: z.enum(['create', 'update', 'delete', 'list', 'get']),
    collectionKey: z.string().optional(),
    name: z.string().optional(),
    parentCollection: z.string().optional(),
    version: z.number().optional(),
  })
  .refine(
    (data) => {
      if (data.action === 'create') return !!data.name;
      if (data.action === 'update') return !!data.collectionKey && !!data.name;
      if (data.action === 'delete' || data.action === 'get') return !!data.collectionKey;
      return true; // list doesn't need params
    },
    {
      message: 'Invalid parameters for the specified action',
    }
  );

export const ManageTagsSchema = z
  .object({
    action: z.enum(['list', 'add_to_item', 'remove_from_item', 'delete']),
    itemKey: z.string().optional(),
    tag: z.string().optional(),
    tags: z.array(z.string()).optional(),
    type: z.union([z.literal(0), z.literal(1)]).optional(),
  })
  .refine(
    (data) => {
      if (data.action === 'add_to_item' || data.action === 'remove_from_item') {
        return !!data.itemKey && (!!data.tag || !!data.tags);
      }
      if (data.action === 'delete') return !!data.tag;
      return true; // list doesn't need params
    },
    {
      message: 'Invalid parameters for the specified action',
    }
  );
