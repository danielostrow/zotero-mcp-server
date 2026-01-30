/**
 * PDF Text Extraction Service
 * Extracts text content from PDF files using pdf-parse
 */

import type { ZoteroClient } from './zotero-client.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export interface ExtractedPdfText {
  content: string;
  numPages: number;
  info?: any;
}

export class PDFExtractor {
  private zoteroClient: ZoteroClient;

  constructor(zoteroClient: ZoteroClient) {
    this.zoteroClient = zoteroClient;
  }

  /**
   * Extract text from a PDF attachment
   * Two-phase approach:
   * 1. Try Zotero's indexed full-text (fastest)
   * 2. If not available, check if it's a local file and parse it
   */
  async extractText(
    itemKey: string,
    pages?: { start?: number; end?: number }
  ): Promise<ExtractedPdfText> {
    // Phase 1: Try Zotero's indexed full-text
    const fullText = await this.zoteroClient.getFullText(itemKey);

    if (fullText && fullText.content) {
      let content = fullText.content;

      // If page range specified, try to extract that portion
      // Note: Zotero's full-text doesn't preserve page breaks perfectly
      // This is a best-effort approach
      if (pages) {
        const lines = content.split('\n');
        const linesPerPage = Math.ceil(lines.length / (fullText.totalPages || 1));

        const startLine = pages.start ? (pages.start - 1) * linesPerPage : 0;
        const endLine = pages.end ? pages.end * linesPerPage : lines.length;

        content = lines.slice(startLine, endLine).join('\n');
      }

      return {
        content,
        numPages: fullText.totalPages || 1,
        info: {
          indexedChars: fullText.indexedChars,
          totalChars: fullText.totalChars,
          indexedPages: fullText.indexedPages,
          source: 'zotero-indexed',
        },
      };
    }

    // Phase 2: Try to read local file
    try {
      const item = await this.zoteroClient.getItem(itemKey) as any;
      
      // Check if it's a PDF attachment with a local path
      // Note: zotero-api-client returns flattened object, properties are at root
      if (
        item.itemType === 'attachment' &&
        item.contentType === 'application/pdf' &&
        item.path
      ) {
        // Resolve path (Zotero sometimes stores it with 'attachments:' prefix)
        let filePath = item.path;
        if (filePath.startsWith('attachments:')) {
          // This would need the base directory which we might not have
          // But for linked files (linkMode: 'linked_file'), path is usually absolute
        }
        
        // If it looks like an absolute path, try to read it
        if (path.isAbsolute(filePath)) {
          const buffer = await fs.readFile(filePath);
          const result = await this.parsePdfBuffer(buffer, pages);
          return {
            ...result,
            info: {
              ...result.info,
              source: 'local-file',
              path: filePath
            }
          };
        }
      }
    } catch (err) {
      console.error('Failed to read local PDF file:', err);
      // Fall through to error
    }

    // Phase 3: Failed
    throw new Error(
      'PDF full-text not available. ' +
        'The item may not have an attached PDF, or the PDF has not been indexed by Zotero yet, ' +
        'and the local file could not be accessed.'
    );
  }

  /**
   * Parse PDF buffer with pdf-parse
   * This method can be used if we implement PDF download functionality
   */
  async parsePdfBuffer(
    buffer: Buffer,
    _pages?: { start?: number; end?: number }
  ): Promise<ExtractedPdfText> {
    const pdfLib = require('pdf-parse');
    
    // Check if we have the class available (ESM/TS interop issue workaround)
    const PDFParse = pdfLib.PDFParse || pdfLib.default || pdfLib;

    if (typeof PDFParse !== 'function') {
        throw new Error('pdf-parse library does not export a constructor/function');
    }

    try {
      // It seems we need to instantiate it as a class in this environment
      const parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      
      let content = data.text;
      
      return {
        content,
        numPages: data.numpages,
        info: {
          ...data.info,
          source: 'local-file-parsed'
        },
      };
    } catch (e) {
       console.error("PDF parsing error:", e);
       throw e;
    }
  }
}
