import { detect } from 'chardet';
import iconv from 'iconv-lite';
import { Parser, ParseOptions, ParseResult } from '../types';

export class TextParser implements Parser {
  supportedMimeTypes = [
    'text/plain',
    'text/html',
    'text/xml',
    'text/csv',
    'text/markdown',
    'application/json',
    'application/xml',
  ];
  supportedExtensions = ['.txt', '.text', '.md', '.markdown', '.log', '.json', '.xml', '.html', '.htm'];

  async parse(buffer: Buffer, options?: ParseOptions): Promise<ParseResult> {
    try {
      // Detect encoding
      let encoding = options?.encoding;
      if (!encoding) {
        const detected = detect(buffer);
        encoding = detected || 'utf-8';
      }

      // Convert to UTF-8
      const content = iconv.decode(buffer, encoding);

      const lines = content.split('\n');
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

      return {
        content,
        metadata: {
          encoding,
          lineCount: lines.length,
          wordCount,
          fileSize: buffer.length,
          mimeType: 'text/plain',
        },
      };
    } catch (error) {
      return {
        content: '',
        metadata: {
          mimeType: 'text/plain',
          fileSize: buffer.length,
        },
        error: `Failed to parse text file: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}