/**
 * PDF Text Extraction Service
 * Extracts text content from PDF files using pdf-parse
 */

import pdfParse from 'pdf-parse';
import type { ZoteroClient } from './zotero-client.js';

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
   * 2. If not available, would download and parse PDF (not implemented yet)
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

    // Phase 2: PDF not indexed in Zotero
    // For now, return an error message
    // In a full implementation, we would:
    // 1. Download the PDF file using Zotero API
    // 2. Parse it with pdf-parse
    // 3. Extract the requested pages
    // 4. Clean up temporary files
    throw new Error(
      'PDF full-text not available. ' +
        'The item may not have an attached PDF, or the PDF has not been indexed by Zotero yet. ' +
        'To index PDFs, open Zotero desktop and let it index your attachments.'
    );
  }

  /**
   * Parse PDF buffer with pdf-parse
   * This method can be used if we implement PDF download functionality
   */
  async parsePdfBuffer(
    buffer: Buffer,
    pages?: { start?: number; end?: number }
  ): Promise<ExtractedPdfText> {
    const options: any = {};

    if (pages) {
      // pdf-parse supports page ranges
      options.max = pages.end || undefined;
      // Note: pdf-parse doesn't have a built-in way to skip pages from start
      // We would need to handle this after extraction
    }

    const data = await pdfParse(buffer, options);

    let content = data.text;

    // Handle start page if specified
    if (pages && pages.start && pages.start > 1) {
      // This is approximate - split by form feeds or estimate
      const lines = content.split('\n');
      const estimatedLinesPerPage = Math.ceil(lines.length / data.numpages);
      const startLine = (pages.start - 1) * estimatedLinesPerPage;
      content = lines.slice(startLine).join('\n');
    }

    return {
      content,
      numPages: data.numpages,
      info: data.info,
    };
  }
}
