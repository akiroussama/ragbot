import pdfParse from 'pdf-parse';
import { Parser, ParseOptions, ParseResult } from '../types';

export class PDFParser implements Parser {
  supportedMimeTypes = ['application/pdf'];
  supportedExtensions = ['.pdf'];

  async parse(buffer: Buffer, options?: ParseOptions): Promise<ParseResult> {
    try {
      const data = await pdfParse(buffer, {
        max: options?.maxPages || 0, // 0 means no limit
      });

      const wordCount = data.text.split(/\s+/).filter(word => word.length > 0).length;

      const pages = data.text.split('\n\n').map((pageText, index) => ({
        pageNumber: index + 1,
        content: pageText.trim(),
      }));

      return {
        content: data.text,
        metadata: {
          title: data.info?.Title,
          author: data.info?.Author,
          subject: data.info?.Subject,
          keywords: data.info?.Keywords,
          createdDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
          modifiedDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
          pageCount: data.numpages,
          wordCount,
          fileSize: buffer.length,
          mimeType: 'application/pdf',
          producer: data.info?.Producer,
          creator: data.info?.Creator,
        },
        pages: options?.extractMetadata ? pages : undefined,
      };
    } catch (error) {
      return {
        content: '',
        metadata: {
          mimeType: 'application/pdf',
          fileSize: buffer.length,
        },
        error: `Failed to parse PDF: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}