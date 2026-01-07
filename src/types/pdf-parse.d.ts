/**
 * Type declarations for pdf-parse
 */

declare module 'pdf-parse' {
  interface PdfData {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
  }

  function pdfParse(dataBuffer: Buffer, options?: any): Promise<PdfData>;
  export default pdfParse;
}
