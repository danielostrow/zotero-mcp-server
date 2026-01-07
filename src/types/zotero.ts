/**
 * Zotero API Type Definitions
 * Based on Zotero Web API v3 specifications
 */

export interface ZoteroCreator {
  creatorType: string;
  firstName?: string;
  lastName?: string;
  name?: string; // For organizations or single-field names
}

export interface ZoteroTag {
  tag: string;
  type?: 0 | 1; // 0 = automatic, 1 = manual
}

export interface ZoteroLibrary {
  type: 'user' | 'group';
  id: number;
  name?: string;
  links?: {
    alternate?: {
      href: string;
      type: string;
    };
  };
}

export interface ZoteroItemData {
  itemType: string;
  title?: string;
  creators?: ZoteroCreator[];
  abstractNote?: string;
  publicationTitle?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  date?: string;
  series?: string;
  seriesTitle?: string;
  seriesText?: string;
  journalAbbreviation?: string;
  language?: string;
  DOI?: string;
  ISBN?: string;
  ISSN?: string;
  url?: string;
  accessDate?: string;
  archive?: string;
  archiveLocation?: string;
  libraryCatalog?: string;
  callNumber?: string;
  rights?: string;
  extra?: string;
  tags?: ZoteroTag[];
  collections?: string[];
  relations?: Record<string, string | string[]>;
  dateAdded?: string;
  dateModified?: string;
  [key: string]: any; // Allow additional item-specific fields
}

export interface ZoteroItemMeta {
  creatorSummary?: string;
  parsedDate?: string;
  numChildren?: number;
}

export interface ZoteroLinks {
  self?: {
    href: string;
    type: string;
  };
  alternate?: {
    href: string;
    type: string;
  };
  up?: {
    href: string;
    type: string;
  };
  enclosure?: {
    href: string;
    type: string;
    length?: number;
  };
}

export interface ZoteroItem {
  key: string;
  version: number;
  library: ZoteroLibrary;
  data: ZoteroItemData;
  meta?: ZoteroItemMeta;
  links?: ZoteroLinks;
}

export interface ZoteroCollectionData {
  name: string;
  parentCollection: string | false;
  relations?: Record<string, any>;
}

export interface ZoteroCollectionMeta {
  numCollections?: number;
  numItems?: number;
}

export interface ZoteroCollection {
  key: string;
  version: number;
  library: ZoteroLibrary;
  data: ZoteroCollectionData;
  meta?: ZoteroCollectionMeta;
  links?: ZoteroLinks;
}

export interface ZoteroAttachment {
  key: string;
  itemType: 'attachment';
  linkMode: 'imported_file' | 'imported_url' | 'linked_file' | 'linked_url';
  title: string;
  contentType?: string;
  charset?: string;
  filename?: string;
  md5?: string;
  mtime?: number;
  url?: string;
  path?: string;
}

export interface ZoteroFullText {
  content: string;
  indexedPages?: number;
  totalPages?: number;
  indexedChars?: number;
  totalChars?: number;
}

export interface ZoteroSearchParams {
  q?: string; // Quick search
  qmode?: 'titleCreatorYear' | 'everything';
  itemType?: string;
  tag?: string | string[];
  collection?: string;
  limit?: number; // Max 100
  start?: number; // Pagination offset
  sort?: string; // Field to sort by
  direction?: 'asc' | 'desc';
  format?: string; // json, atom, bib, ris, etc.
  include?: string; // data, bib, citation, etc.
  style?: string; // Citation style
  locale?: string;
}

export interface ZoteroAPIError extends Error {
  statusCode: number;
  response?: {
    headers?: Record<string, string>;
    body?: any;
  };
  retryAfter?: number;
  backoff?: number;
}

export interface ZoteroItemTemplate {
  itemType: string;
  [key: string]: any;
}

export interface ZoteroCitation {
  citation: string;
  itemKey: string;
}

export interface ZoteroAPIResponse<T> {
  data: T;
  headers?: Record<string, string>;
  totalResults?: number;
  lastModifiedVersion?: number;
}

// Tool parameter types
export interface SearchItemsParams {
  query?: string;
  qmode?: 'titleCreatorYear' | 'everything';
  itemType?: string;
  tag?: string[];
  collection?: string;
  limit?: number;
  start?: number;
  sort?: 'dateAdded' | 'dateModified' | 'title' | 'creator';
  direction?: 'asc' | 'desc';
  format?: 'json' | 'bibtex' | 'csljson';
}

export interface GetItemParams {
  itemKey?: string;
  doi?: string;
  format?: 'json' | 'bibtex' | 'csljson' | 'ris';
  include?: string[];
}

export interface CreateItemParams {
  itemType: string;
  title: string;
  creators?: ZoteroCreator[];
  abstractNote?: string;
  publicationTitle?: string;
  date?: string;
  DOI?: string;
  url?: string;
  tags?: string[];
  collections?: string[];
  [key: string]: any;
}

export interface UpdateItemParams {
  itemKey: string;
  version: number;
  data: Partial<ZoteroItemData>;
}

export interface DeleteItemsParams {
  itemKeys: string[];
  version?: number;
}

export interface GenerateCitationParams {
  itemKeys: string[];
  style: string;
  format?: 'text' | 'html';
  locale?: string;
}

export interface ExtractPdfTextParams {
  itemKey: string;
  pages?: {
    start?: number;
    end?: number;
  };
}

export interface ManageCollectionsParams {
  action: 'create' | 'update' | 'delete' | 'list' | 'get';
  collectionKey?: string;
  name?: string;
  parentCollection?: string;
  version?: number;
}

export interface ManageTagsParams {
  action: 'list' | 'add_to_item' | 'remove_from_item' | 'delete';
  itemKey?: string;
  tag?: string;
  tags?: string[];
  type?: 0 | 1;
}
