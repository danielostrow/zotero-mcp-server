/**
 * MCP Resources Implementation
 * All Zotero MCP resources in one consolidated file
 */

import type { ZoteroClient } from '../services/zotero-client.js';

function getCollectionData(collection: any): any {
  return collection?.data ?? collection ?? {};
}

/**
 * Collections resource
 */
export async function getCollectionsResource(zoteroClient: ZoteroClient, uri: string): Promise<any> {
  try {
    const match = uri.match(/^zotero:\/\/collections(?:\/(.+))?$/);
    if (!match) {
      throw new Error('Invalid collections URI');
    }

    const collectionKey = match[1];

    if (collectionKey) {
      // Get specific collection
      const collection = await zoteroClient.getCollection(collectionKey);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(collection, null, 2),
          },
        ],
      };
    } else {
      // Get all collections
      const collections = await zoteroClient.getCollections();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                count: collections.length,
                collections: collections.map((c) => {
                  const collectionData = getCollectionData(c);
                  const collectionAny = c as any;
                  return {
                    key: collectionAny.key ?? collectionData.key,
                    name: collectionData.name,
                    parentCollection: collectionData.parentCollection ?? false,
                    numItems: c.meta?.numItems ?? collectionAny.numItems ?? 0,
                    numCollections: c.meta?.numCollections ?? collectionAny.numCollections ?? 0,
                  };
                }),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  } catch (error: any) {
    throw new Error(`Failed to fetch collections: ${error.message}`);
  }
}

/**
 * Tags resource
 */
export async function getTagsResource(zoteroClient: ZoteroClient, uri: string): Promise<any> {
  try {
    const match = uri.match(/^zotero:\/\/tags(?:\/(.+))?$/);
    if (!match) {
      throw new Error('Invalid tags URI');
    }

    const tagName = match[1];

    const allTags = await zoteroClient.getTags();

    if (tagName) {
      // Get specific tag
      const tag = allTags.find((t) => t.tag === decodeURIComponent(tagName));
      if (!tag) {
        throw new Error(`Tag not found: ${tagName}`);
      }

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(tag, null, 2),
          },
        ],
      };
    } else {
      // Get all tags
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                count: allTags.length,
                tags: allTags.map((t) => ({
                  tag: t.tag,
                  type: t.type,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  } catch (error: any) {
    throw new Error(`Failed to fetch tags: ${error.message}`);
  }
}

/**
 * Citation styles resource
 */
export async function getCitationStylesResource(uri: string): Promise<any> {
  // Common citation styles available in Zotero
  const styles = [
    { id: 'apa', name: 'American Psychological Association 7th edition' },
    { id: 'chicago-note-bibliography', name: 'Chicago Manual of Style (notes and bibliography)' },
    { id: 'chicago-author-date', name: 'Chicago Manual of Style (author-date)' },
    { id: 'mla', name: 'Modern Language Association 9th edition' },
    { id: 'ieee', name: 'IEEE' },
    { id: 'nature', name: 'Nature' },
    { id: 'science', name: 'Science' },
    { id: 'cell', name: 'Cell' },
    { id: 'ama', name: 'American Medical Association 11th edition' },
    { id: 'asa', name: 'American Sociological Association 6th edition' },
    { id: 'harvard-cite-them-right', name: 'Cite Them Right - Harvard' },
    { id: 'vancouver', name: 'Vancouver' },
    { id: 'turabian-fullnote-bibliography', name: 'Turabian (full note)' },
    { id: 'american-chemical-society', name: 'American Chemical Society' },
    { id: 'bibtex', name: 'BibTeX generic citation style' },
  ];

  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(
          {
            count: styles.length,
            styles,
            note: 'Zotero supports 10,000+ citation styles. These are the most commonly used ones.',
          },
          null,
          2
        ),
      },
    ],
  };
}
