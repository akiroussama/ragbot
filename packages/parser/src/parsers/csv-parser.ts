import { parse } from 'csv-parse/sync';
import { detect } from 'chardet';
import iconv from 'iconv-lite';
import { Parser, ParseOptions, ParseResult } from '../types';

export class CSVParser implements Parser {
  supportedMimeTypes = ['text/csv', 'application/csv'];
  supportedExtensions = ['.csv'];

  async parse(buffer: Buffer, options?: ParseOptions): Promise<ParseResult> {
    try {
      // Detect encoding
      let encoding = options?.encoding;
      if (!encoding) {
        const detected = detect(buffer);
        encoding = detected || 'utf-8';
      }

      // Convert to UTF-8
      const csvString = iconv.decode(buffer, encoding);

      // Parse CSV
      const records = parse(csvString, {
        columns: true,
        skip_empty_lines: true,
        relaxed_column_count: true,
      });

      // Convert to readable format
      let content = '';
      
      if (records.length > 0) {
        const headers = Object.keys(records[0]);
        content = headers.join(' | ') + '\n';
        content += headers.map(() => '---').join(' | ') + '\n';

        for (const record of records) {
          content += headers.map(h => record[h] || '').join(' | ') + '\n';
        }
      }

      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

      return {
        content,
        metadata: {
          encoding,
          rowCount: records.length,
          columnCount: records.length > 0 ? Object.keys(records[0]).length : 0,
          columns: records.length > 0 ? Object.keys(records[0]) : [],
          wordCount,
          fileSize: buffer.length,
          mimeType: 'text/csv',
        },
      };
    } catch (error) {
      return {
        content: '',
        metadata: {
          mimeType: 'text/csv',
          fileSize: buffer.length,
        },
        error: `Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}